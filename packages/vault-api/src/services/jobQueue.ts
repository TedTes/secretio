import { EventEmitter } from 'events';
import { v4 as uuidv4 } from 'uuid';
import { ScanJob, JobStatus, JobProgress, JobQueueStats } from '../types/jobs';
import { ScanRepositoryRequest } from '../types/api';

export class JobQueue extends EventEmitter {
  private jobs: Map<string, ScanJob> = new Map();
  private runningJobs: Set<string> = new Set();
  private maxConcurrentJobs: number = 3;

  createJob(request: ScanRepositoryRequest): ScanJob {
    const job: ScanJob = {
      id: uuidv4(),
      type: 'scan',
      status: 'pending',
      createdAt: new Date(),
      request
    };

    this.jobs.set(job.id, job);
    console.log(`📋 Created job ${job.id} for ${request.owner}/${request.repo}`);
    
    // Emit job created event
    this.emit('jobCreated', job);
    
    // Try to process immediately if slots available
    this.processNextJob();
    
    return job;
  }

  getJob(jobId: string): ScanJob | undefined {
    return this.jobs.get(jobId);
  }

  updateJobStatus(jobId: string, status: JobStatus, error?: string): void {
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
      setTimeout(() => this.processNextJob(), 100);
    }
    
    if (error) {
      job.error = error;
    }

    console.log(`📋 Job ${jobId} status: ${status}`);
    this.emit('jobStatusChanged', job);
  }

  updateJobProgress(jobId: string, progress: JobProgress): void {
    const job = this.jobs.get(jobId);
    if (!job) return;

    job.progress = progress;
    this.emit('jobProgress', job);
  }

  setJobResult(jobId: string, result: ScanJob['result']): void {
    const job = this.jobs.get(jobId);
    if (!job) return;

    job.result = result;
  }

  private processNextJob(): void {
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
    this.updateJobStatus(pendingJob.id, 'running');
    
    // Emit job started event
    this.emit('jobStarted', pendingJob);
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

// Global job queue instance
export const jobQueue = new JobQueue();

// Cleanup old jobs every hour
setInterval(() => {
  jobQueue.cleanup();
}, 60 * 60 * 1000);