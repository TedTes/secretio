import { EventEmitter } from 'events';
import { v4 as uuidv4 } from 'uuid';
import { ScanJob, JobStatus, JobProgress, JobQueueStats } from '../types/jobs';
import { ScanRepositoryRequest } from '../types/api';
import { DatabaseService } from './database';
export class JobQueue extends EventEmitter {
  private jobs: Map<string, ScanJob> = new Map();
  private runningJobs: Set<string> = new Set();
  private maxConcurrentJobs: number = 3;

  async createJob(request: ScanRepositoryRequest, userId: string,dbServiceInstance:DatabaseService): Promise<ScanJob> {
    const job: ScanJob = {
      id: uuidv4(),
      type: 'scan',
      status: 'pending',
      createdAt: new Date(),
      request
    };

    // Store in memory for fast access
    this.jobs.set(job.id, job);

    // Store in database for persistence
    try {
      await dbServiceInstance.createScanJob(job, userId);
      console.log(`📋 Created job ${job.id} for ${request.owner}/${request.repo} (user: ${userId || 'anonymous'})`);
    } catch (error) {
      console.error(`❌ Failed to save job to database: ${error instanceof Error ?error.message:error}`);
    }
    
    // Emit job created event
    this.emit('jobCreated', job);
    
    // Try to process immediately if slots available
    this.processNextJob(dbServiceInstance);
    
    return job;
  }

  async getJob(jobId: string,dbServiceInstance:DatabaseService): Promise<ScanJob | undefined> {
    // Try memory first
    let job = this.jobs.get(jobId);
    if (!job) {
      // Try database
      try {
        const dbJob = await dbServiceInstance.getScanJob(jobId);
        if (dbJob) {
          job = this.convertDbJobToScanJob(dbJob);
          this.jobs.set(jobId, job); // Cache in memory
        }
      } catch (error) {
        console.error(`❌ Failed to get job from database: ${error instanceof Error?error.message:error}`);
      }
    }
    
    return job;
  }

  async updateJobStatus(jobId: string,dbServiceInstance:DatabaseService, status: JobStatus, error?: string): Promise<void> {
    const job = this.jobs.get(jobId);
    if (!job) return;

    job.status = status;
    
    if (status === 'running' && !job.startedAt) {
      job.startedAt = new Date();
    }
    
    if (status === 'completed' || status === 'failed') {
      job.completedAt = new Date();
      this.runningJobs.delete(jobId);
      
      // Process next job in queue
      setTimeout(() => this.processNextJob(dbServiceInstance), 100);
    }
    
    if (error) {
      job.error = error;
    }
    // Update database
    try {
      await dbServiceInstance.updateScanJobStatus(jobId, status, error);
    } catch (dbError) {
      console.error(`❌ Failed to update job status in database: ${dbError instanceof Error?dbError.message:dbError}`);
    }

    console.log(`📋 Job ${jobId} status: ${status}`);
    this.emit('jobStatusChanged', job);
  }

  async updateJobProgress(jobId: string, progress: JobProgress,dbServiceInstance:DatabaseService): Promise<void> {
    const job = this.jobs.get(jobId);
    if (!job) return;

    job.progress = progress;
    
    // Update database
    try {
      await dbServiceInstance.updateScanJobProgress(jobId, progress);
    } catch (error) {
      console.error(`❌ Failed to update job progress in database: ${error instanceof Error?error.message:error}`);
    }

    this.emit('jobProgress', {
      jobId,
      progress,
      job
    });
    console.log(`📈 Job ${jobId} progress: ${progress.current}/${progress.total} - ${progress.currentFile}`);
  }

  async setJobResult(jobId: string, result: ScanJob['result'], dbServiceInstance:DatabaseService): Promise<void> {
    const job = this.jobs.get(jobId);
    if (!job) return;
    
    job.result = result;

    // Store results and stats in database
    if (result && result.success) {
      try {
         console.log("from job queue");
     console.log(result.results);
        // Store scan results
        await dbServiceInstance.storeScanResults(jobId, result.results);
        
        // Store scan statistics
        const duration = job.completedAt && job.startedAt 
          ? job.completedAt.getTime() - job.startedAt.getTime()
          : 0;
        
        await dbServiceInstance.storeScanStats(jobId, result.stats, duration);
        
        console.log(`💾 Stored results for job ${jobId}: ${result.results.length} findings`);
      } catch (error) {
        console.error(`❌ Failed to store job results: ${error instanceof Error?error.message:error}`);
      }
    }
  }
// Add method to get current job status with progress
  getJobWithProgress(jobId: string): ScanJob | null {
  const job = this.jobs.get(jobId);
  if (!job) return null;

  // Return job with current progress
  return {
    ...job,
    progress: job.progress || { current: 0, total: 0 }
  };
}

  async getUserJobs(userId: string, limit = 50,dbServiceInstance:DatabaseService): Promise<ScanJob[]> {
    try {
      const dbJobs = await dbServiceInstance.getUserScanJobs(userId, limit);
      return dbJobs.map(dbJob => this.convertDbJobToScanJob(dbJob));
    } catch (error) {
      console.error(`❌ Failed to get user jobs: ${error instanceof Error?error.message:error}`);
      return [];
    }
  }
  private processNextJob(dbServiceInstance:DatabaseService): void {
    // Check if we can run more jobs
    if (this.runningJobs.size >= this.maxConcurrentJobs) {
      return;
    }

    // Find next pending job
    const pendingJob = Array.from(this.jobs.values())
      .find(job => job.status === 'pending');

    if (!pendingJob) {
      return;
    }

    // Mark as running
    this.runningJobs.add(pendingJob.id);
    this.updateJobStatus(pendingJob.id, dbServiceInstance,'running');
    
    // Emit job started event
    this.emit('jobStarted', pendingJob);
  }

  private convertDbJobToScanJob(dbJob: any): ScanJob {
    const [owner, repo] = dbJob.repository.split('/');
    
    return {
      id: dbJob.id,
      type: 'scan',
      status: dbJob.status,
      createdAt: new Date(dbJob.created_at),
      startedAt: dbJob.started_at ? new Date(dbJob.started_at) : undefined,
      completedAt: dbJob.completed_at ? new Date(dbJob.completed_at) : undefined,
      error: dbJob.error_message,
      progress: dbJob.progress_total ? {
        current: dbJob.progress_current || 0,
        total: dbJob.progress_total,
        currentFile: dbJob.progress_file
      } : undefined,
      request: {
        owner,
        repo,
        branch: dbJob.branch,
        github_token: dbJob.github_token
      }
    };
  }
  getPendingJobs(): ScanJob[] {
    return Array.from(this.jobs.values())
      .filter(job => job.status === 'pending')
      .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
  }

  getRunningJobs(): ScanJob[] {
    return Array.from(this.jobs.values())
      .filter(job => job.status === 'running');
  }

  getJobStats(): JobQueueStats {
    const jobs = Array.from(this.jobs.values());
    
    return {
      pending: jobs.filter(j => j.status === 'pending').length,
      running: jobs.filter(j => j.status === 'running').length,
      completed: jobs.filter(j => j.status === 'completed').length,
      failed: jobs.filter(j => j.status === 'failed').length,
      total: jobs.length
    };
  }
  async loadActiveJobs(): Promise<void> {
    try {
      // Load running and pending jobs from database on startup
      console.log('🔄 Loading active jobs from database...');
      
      // This would require a method to get jobs by status
      // For now, we'll rely on in-memory state
      
    } catch (error) {
      console.error('❌ Failed to load active jobs:', error instanceof Error?error.message:error);
    }
  }
  // Cleanup old jobs (keep last 1000)
  cleanup(): void {
    const jobs = Array.from(this.jobs.values())
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    if (jobs.length > 1000) {
      const toDelete = jobs.slice(1000);
      toDelete.forEach(job => {
        this.jobs.delete(job.id);
      });
      console.log(`🧹 Cleaned up ${toDelete.length} old jobs`);
    }
  }

  // Get all jobs (for debugging)
  getAllJobs(): ScanJob[] {
    return Array.from(this.jobs.values())
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }
}

//Global job queue instance
export const jobQueue = new JobQueue();

// Cleanup old jobs every hour
setInterval(() => {
  jobQueue.cleanup();
}, 60 * 60 * 1000);