import { ScanService } from './scan';
import { jobQueue } from './jobQueue';
import { ScanRepositoryRequest } from '../types/api';
import { ScanJob } from '../types/jobs';
import { dbService } from './database';
export class AsyncScanService {
  private scanService: ScanService;
  private userId?: string;
  constructor(githubToken?: string, userId?: string) {
    this.userId = userId;
    this.scanService = new ScanService(githubToken);
    
    // Listen for job events
    jobQueue.on('jobStarted', this.processJob.bind(this));
  }

  async queueScan(request: ScanRepositoryRequest): Promise<ScanJob> {
    // Create job in queue
    const job = await jobQueue.createJob(request, this.userId);
    
    console.log(`⏳ Queued scan job ${job.id} for ${request.owner}/${request.repo}`);
    
    return job;
  }
  async getUserJobs(userId: string, limit = 50): Promise<ScanJob[]> {
    return jobQueue.getUserJobs(userId, limit);
  }
  private async processJob(job: ScanJob): Promise<void> {
    try {
      console.log(`🚀 Processing job ${job.id}: ${job.request.owner}/${job.request.repo}`);
      
      // Create scan service with job-specific token
      const scanService = new ScanService(job.request.github_token);
      
      // Override the GitHub service to report progress
      const originalGetRepositoryTree = scanService['githubService'].getRepositoryTree.bind(scanService['githubService']);
      const originalGetFileContent = scanService['githubService'].getFileContent.bind(scanService['githubService']);
      
      // Track progress during file discovery
      scanService['githubService'].getRepositoryTree = async (...args) => {
        jobQueue.updateJobProgress(job.id, {
          current: 0,
          total: 0,
          currentFile: 'Discovering files...'
        });
        
        const result = await originalGetRepositoryTree(...args);
        
        jobQueue.updateJobProgress(job.id, {
          current: 0,
          total: result.length,
          currentFile: 'Starting scan...'
        });
        
        return result;
      };

      // Perform the actual scan
      const result = await scanService.scanRepository(job.request);
      
      // Store result and mark as completed
      jobQueue.setJobResult(job.id, result);
      jobQueue.updateJobStatus(job.id, 'completed');
      
      console.log(`✅ Job ${job.id} completed: ${result.stats.keysFound} keys found`);
      
    } catch (error) {
      console.error(`❌ Job ${job.id} failed:`, error instanceof Error? error.message:`processing job failed, ${error}`);
      jobQueue.updateJobStatus(job.id, 'failed', error instanceof Error? error.message:`processing job failed, ${error}`);
    }
  }

  getJobStatus(jobId: string): Promise<ScanJob | undefined> {
    return jobQueue.getJob(jobId);
  }

  async getJobWithResults(jobId: string): Promise<{
    job: ScanJob | undefined;
    results?: any[];
    stats?: any;
  }> {
    const job = await jobQueue.getJob(jobId);
    
    if (!job || job.status !== 'completed') {
      return { job };
    }

    try {
      const [results, stats] = await Promise.all([
        dbService.getScanResults(jobId),
        dbService.getScanStats(jobId)
      ]);

      return { job, results, stats };
    } catch (error) {
      console.error(`❌ Failed to get job results: ${error instanceof Error?error.message:error}`);
      return { job };
    }
  }

  getQueueStats() {
    return {
      stats: jobQueue.getJobStats(),
      pendingJobs: jobQueue.getPendingJobs().map(job => ({
        id: job.id,
        repository: `${job.request.owner}/${job.request.repo}`,
        createdAt: job.createdAt
      })),
      runningJobs: jobQueue.getRunningJobs().map(job => ({
        id: job.id,
        repository: `${job.request.owner}/${job.request.repo}`,
        startedAt: job.startedAt,
        progress: job.progress
      }))
    };
  }
}