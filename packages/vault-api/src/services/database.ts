import { supabase, DbScanJob, DbScanResult, DbScanStats, DbUser } from '../config/database';
import { ScanJob, JobStatus, JobProgress } from '../types/jobs';
import { ScanResult } from '@secretio/shared';

export class DatabaseService {
  
  // User management
  async createUser(email?: string, githubUsername?: string): Promise<DbUser> {
    const { data, error } = await supabase
      .from('users')
      .insert({
        email,
        github_username: githubUsername
      })
      .select()
      .single();

    if (error) throw new Error(`Failed to create user: ${error.message}`);
    return data;
  }

  async getUser(userId: string): Promise<DbUser | null> {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();

    if (error && error.code !== 'PGRST116') {
      throw new Error(`Failed to get user: ${error.message}`);
    }
    return data;
  }

  // Job management
  async createScanJob(job: ScanJob, userId?: string): Promise<void> {
    const { error } = await supabase
      .from('scan_jobs')
      .insert({
        id: job.id,
        user_id: userId,
        status: job.status,
        repository: `${job.request.owner}/${job.request.repo}`,
        branch: job.request.branch || 'main',
        github_token: job.request.github_token, // TODO: Encrypt in production
        created_at: job.createdAt.toISOString(),
        started_at: job.startedAt?.toISOString(),
        completed_at: job.completedAt?.toISOString(),
        progress_current: job.progress?.current || 0,
        progress_total: job.progress?.total || 0,
        progress_file: job.progress?.currentFile
      });

    if (error) throw new Error(`Failed to create scan job: ${error.message}`);
  }

  async updateScanJobStatus(jobId: string, status: JobStatus, error?: string): Promise<void> {
    const updateData: Partial<DbScanJob> = {
      status,
      error_message: error
    };

    if (status === 'running') {
      updateData.started_at = new Date().toISOString();
    }

    if (status === 'completed' || status === 'failed') {
      updateData.completed_at = new Date().toISOString();
    }

    const { error: dbError } = await supabase
      .from('scan_jobs')
      .update(updateData)
      .eq('id', jobId);

    if (dbError) throw new Error(`Failed to update job status: ${dbError.message}`);
  }

  async updateScanJobProgress(jobId: string, progress: JobProgress): Promise<void> {
    const { error } = await supabase
      .from('scan_jobs')
      .update({
        progress_current: progress.current,
        progress_total: progress.total,
        progress_file: progress.currentFile
      })
      .eq('id', jobId);

    if (error) throw new Error(`Failed to update job progress: ${error.message}`);
  }

  async getScanJob(jobId: string): Promise<DbScanJob | null> {
    const { data, error } = await supabase
      .from('scan_jobs')
      .select('*')
      .eq('id', jobId)
      .single();

    if (error && error.code !== 'PGRST116') {
      throw new Error(`Failed to get scan job: ${error.message}`);
    }
    return data;
  }

  async getUserScanJobs(userId: string, limit = 50): Promise<DbScanJob[]> {
    const { data, error } = await supabase
      .from('scan_jobs')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw new Error(`Failed to get user scan jobs: ${error.message}`);
    return data || [];
  }

  // Results management
  async storeScanResults(jobId: string, results: ScanResult[]): Promise<void> {
    if (results.length === 0) return;

    const dbResults = results.map(result => ({
      job_id: jobId,
      service: result.service,
      file_path: result.file,
      line_number: result.line,
      severity: result.severity,
      description: result.description,
      masked_value: this.maskApiKey(result.match)
    }));

    const { error } = await supabase
      .from('scan_results')
      .insert(dbResults);

    if (error) throw new Error(`Failed to store scan results: ${error.message}`);
  }

  async getScanResults(jobId: string): Promise<DbScanResult[]> {
    const { data, error } = await supabase
      .from('scan_results')
      .select('*')
      .eq('job_id', jobId)
      .order('severity', { ascending: false }); // High severity first

    if (error) throw new Error(`Failed to get scan results: ${error.message}`);
    return data || [];
  }

  // Statistics management
  async storeScanStats(jobId: string, stats: any, duration: number): Promise<void> {
    const { error } = await supabase
      .from('scan_stats')
      .insert({
        job_id: jobId,
        files_scanned: stats.filesScanned,
        keys_found: stats.keysFound,
        high_severity: stats.highSeverity,
        medium_severity: stats.mediumSeverity,
        low_severity: stats.lowSeverity,
        total_files: stats.repository?.totalFiles || 0,
        duration_ms: duration
      });

    if (error) throw new Error(`Failed to store scan stats: ${error.message}`);
  }

  async getScanStats(jobId: string): Promise<DbScanStats | null> {
    const { data, error } = await supabase
      .from('scan_stats')
      .select('*')
      .eq('job_id', jobId)
      .single();

    if (error && error.code !== 'PGRST116') {
      throw new Error(`Failed to get scan stats: ${error.message}`);
    }
    return data;
  }

  // Analytics
  async getUserStats(userId: string): Promise<any> {
    const { data, error } = await supabase
      .from('scan_jobs')
      .select(`
        *,
        scan_stats(*)
      `)
      .eq('user_id', userId);

    if (error) throw new Error(`Failed to get user stats: ${error.message}`);

    const stats = {
      totalScans: data?.length || 0,
      completedScans: data?.filter(job => job.status === 'completed').length || 0,
      failedScans: data?.filter(job => job.status === 'failed').length || 0,
      totalKeysFound: 0,
      totalFilesScanned: 0
    };

    // Aggregate stats from all completed jobs
    data?.forEach(job => {
      if (job.scan_stats?.[0]) {
        stats.totalKeysFound += job.scan_stats[0].keys_found;
        stats.totalFilesScanned += job.scan_stats[0].files_scanned;
      }
    });

    return stats;
  }

  // Utility methods
  private maskApiKey(key: string): string {
    if (key.length <= 12) return key;
    
    const start = key.substring(0, 6);
    const end = key.substring(key.length - 4);
    const middle = '•'.repeat(Math.min(key.length - 10, 20));
    
    return `${start}${middle}${end}`;
  }

  // Health check
  async healthCheck(): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('scan_jobs')
        .select('id')
        .limit(1);
      
      return !error;
    } catch {
      return false;
    }
  }
}

// Global database service instance
export const dbService = new DatabaseService();