import { supabase, DbScanJob, DbScanResult, DbScanStats, DbUser,createSupabaseClientWithToken } from '../config/database';
import { ScanJob, JobStatus, JobProgress } from '../types/jobs';
import { ScanResult } from '@secretio/shared';
import { SupabaseClient } from '@supabase/supabase-js';
import { createError } from '../middleware/errorHandler';
import { encryptionService } from '../utils/encryption';
import {StoreKeyRequest } from "../types";
export class DatabaseService {
  private supabaseClient: SupabaseClient;
  
  constructor(supabase:SupabaseClient) {
   this.supabaseClient = supabase;
  }
 
  // User management
  static async  createUser(email?: string, githubUsername?: string): Promise<DbUser> {
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

  static async getUser(userId: string): Promise<DbUser | null> {
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
  async getAuthenticatedUser() {
    const { data: { user }, error } = await this.supabaseClient.auth.getUser();
   
   return  user;
  }
  // Job management
  async createScanJob(job: ScanJob, userId: string): Promise<void> {
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
    const { error } = await this.supabaseClient
      .from('scan_jobs')
      .update({
        progress_current: progress.current,
        progress_total: progress.total,
        progress_file: progress.currentFile,
        updated_at: new Date().toISOString()
      })
      .eq('id', jobId);
  
    if (error) throw new Error(`Failed to update scan job progress: ${error.message}`);
  }
// Add method to store intermediate scan results during scanning
async storeIntermediateResults(jobId: string, newResults: ScanResult[]): Promise<void> {
  if (!newResults || newResults.length === 0) return;
  

  // Check if results already exist to avoid duplicates
  const { data: existingResults } = await this.supabaseClient
    .from('scan_results')
    .select('file_path, line_number')
    .eq('job_id', jobId);

  const existing = new Set(
    existingResults?.map(r => `${r.file_path}:${r.line_number}`) || []
  );

  // Filter out duplicates
  const uniqueResults = newResults.filter(result => 
    !existing.has(`${result.file_path}:${result.line_number}`)
  );

  if (uniqueResults.length === 0) return;

  const dbResults = uniqueResults.map(result => ({
    job_id: jobId,
    service: result.service,
    file_path: result.file_path,
    line_number: result.line_number,
    severity: result.severity,
    description: result.description,
    masked_value: this.maskApiKey(result.match)
  }));

  const { error } = await supabase
    .from('scan_results')
    .insert(dbResults);

  if (error) throw new Error(`Failed to store intermediate scan results: ${error.message}`);
}
async getScanJob(jobId: string, userId?: string): Promise<DbScanJob | null> {

  
  const query = this.supabaseClient
    .from('scan_jobs')
    .select('*')
    .eq('id', jobId);
    
  if (userId) {
    query.eq('user_id', userId);
  }

  const { data, error } = await query.single();

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
      file_path: result.file_path,
      line_number: result.line_number,
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
    const { data, error } = await this.supabaseClient
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
    const { data, error } = await this.supabaseClient
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

  async storeKey(userId:string, keyData:StoreKeyRequest) {
    const {keyName, service, value, environment = 'production'} = keyData;

    // Encrypt the value using AES-256
    const encryptedValue = encryptionService.encrypt(value);
    const maskedValue = encryptionService.mask(value);
    const valueHash = encryptionService.hash(value); // For duplicate detection
    return  await supabase
        .from('vault_keys')
        .insert({
          user_id: userId,
          key_name: keyName,
          service: service,
          encrypted_value: encryptedValue,
          masked_value: maskedValue,
          value_hash: valueHash,
          environment: environment,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select('id, key_name, service, environment, masked_value, created_at, updated_at')
        .single();
  }
  async getUserKeys(userId:string, environment: string = 'production') {
   return  await supabase
        .from('vault_keys')
        .select('id, key_name, service, environment, masked_value, created_at, updated_at, last_accessed')
        .eq('user_id', userId)
        .eq('environment', environment)
        .order('created_at', { ascending: false });
  }
  async getKeyValue(userId:string, keyName:string , environment:string) {
     //   Get encrypted key from database
      return await supabase
        .from('vault_keys')
        .select('encrypted_value, service, id')
        .eq('user_id', userId)
        .eq('key_name', keyName)
        .eq('environment', environment)
        .single();
  }
  async updateLastAccessedTimeStamp(data:any) {
     // Update last accessed timestamp
      await supabase
        .from('vault_keys')
        .update({ 
          last_accessed: new Date().toISOString(),
          access_count: supabase.rpc('increment_access_count', { key_id: data.id })
        })
        .eq('id', data.id);
  }
  async deleteKey(userId:string,keyName:string, environment:string) {
  return  await supabase
    .from('vault_keys')
    .delete()
    .eq('user_id', userId)
    .eq('key_name', keyName)
    .eq('environment', environment);
  }
  async rotateKey(userId:string, keyName:string, newValue:string, environment:string) {
      // Encrypt new value
      const encryptedValue = encryptionService.encrypt(newValue);
      const maskedValue = encryptionService.mask(newValue);
      const valueHash = encryptionService.hash(newValue);

          // // Update in database
      return await supabase
        .from('vault_keys')
        .update({
          encrypted_value: encryptedValue,
          masked_value: maskedValue,
          value_hash: valueHash,
          updated_at: new Date().toISOString(),
          rotation_count: supabase.rpc('increment_rotation_count', { key_name: keyName })
        })
        .eq('user_id', userId)
        .eq('key_name', keyName)
        .eq('environment', environment)
        .select('id, key_name, service, environment, masked_value, created_at, updated_at')
        .single();
  }
  async getUserGithubConnection(userId:string){
    const { data, error } = await this.supabaseClient
    .from('user_github_connections')
    .select('*')
    .eq('user_id', userId)
    .single();

  if (error && error.code !== 'PGRST116') {
    throw new Error(`Database error: ${error.message}`);
  }

  return data;
  }
  async removeUserGithubConnection(userId:string){
    const { error } = await this.supabaseClient
      .from('user_github_connections')
      .delete()
      .eq('user_id', userId);
  
    if (error) {
      throw new Error(`Database error: ${error.message}`);
    }
  }
    /**
 * Delete scan results for a job
 */
async deleteScanResults(jobId: string): Promise<void> {
  try {
    const { error } = await this.supabaseClient
      .from('scan_results')
      .delete()
      .eq('job_id', jobId);

    if (error) {
      throw new Error(`Failed to delete scan results: ${error.message}`);
    }

    console.log(`🗑️ Deleted scan results for job ${jobId}`);

  } catch (error) {
    console.error('deleteScanResults failed:', error);
    throw error;
  }
}

/**
 * Delete scan stats for a job
 */
async deleteScanStats(jobId: string): Promise<void> {
  try {
    const { error } = await this.supabaseClient
      .from('scan_stats')
      .delete()
      .eq('job_id', jobId);

    if (error) {
      throw new Error(`Failed to delete scan stats: ${error.message}`);
    }

    console.log(`🗑️ Deleted scan stats for job ${jobId}`);

  } catch (error) {
    console.error('deleteScanStats failed:', error);
    throw error;
  }
}
/** 
* Delete a scan job
*/
async deleteScanJob(jobId: string): Promise<void> {
 try {
   const { error } = await this.supabaseClient
     .from('scan_jobs')
     .delete()
     .eq('id', jobId);

   if (error) {
     throw new Error(`Failed to delete scan job: ${error.message}`);
   }

   console.log(`🗑️ Deleted scan job ${jobId}`);

 } catch (error) {
   console.error('deleteScanJob failed:', error);
   throw error;
 }
}
/**
 * Delete multiple scan jobs (bulk delete)
 */
async deleteScanJobs(userId: string, jobIds: string[]): Promise<void> {
  try {
    // Verify all jobs belong to the user
    const { data: jobs, error: selectError } = await this.supabaseClient
      .from('scan_jobs')
      .select('id, user_id, status')
      .eq('user_id', userId)
      .in('id', jobIds);

    if (selectError) {
      throw new Error(`Failed to verify jobs: ${selectError.message}`);
    }

    if (!jobs || jobs.length !== jobIds.length) {
      throw new Error('Some jobs not found or access denied');
    }

    // Check if any jobs are running
    const runningJobs = jobs.filter(job => job.status === 'running' || job.status === 'pending');
    if (runningJobs.length > 0) {
      throw new Error(`Cannot delete running jobs: ${runningJobs.map(j => j.id).join(', ')}`);
    }

    // Delete in batches to avoid timeout
    for (const jobId of jobIds) {
      await this.deleteScanResults(jobId);
      await this.deleteScanStats(jobId);
      await this.deleteScanJob(jobId);
    }

    console.log(`🗑️ Bulk deleted ${jobIds.length} scan jobs for user ${userId}`);

  } catch (error) {
    console.error('deleteScanJobs failed:', error);
    throw error;
  }
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
