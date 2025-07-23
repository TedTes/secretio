import { ScanService } from './scan';
import { jobQueue } from './jobQueue';
import { ScanRepositoryRequest } from '../types/api';
import { ScanJob } from '../types/jobs';
import { DatabaseService } from './database';


export class AsyncScanService {
  private scanService: ScanService;
  private userId: string;
  private dbClient:DatabaseService;
  constructor(dbClient:DatabaseService, userId: string) {

    
    if (!userId) {
      throw new Error('User ID is required for AsyncScanService');
    }
    this.dbClient = dbClient;
    this.userId = userId;
    this.scanService = new ScanService(this.dbClient);
    
    // Listen for job events
    jobQueue.on('jobStarted', this.processJob.bind(this));
  }

  async queueScan(request: ScanRepositoryRequest): Promise<ScanJob> {
    // Create job in queue
    const job = await jobQueue.createJob(request, this.userId,this.dbClient);
    
    console.log(`⏳ Queued scan job ${job.id} for ${request.owner}/${request.repo}`);
    
    return job;
  }
  async getUserJobs(userId: string, limit = 50): Promise<ScanJob[]> {
    return jobQueue.getUserJobs(userId, limit,this.dbClient);
  }
  private async processJob(job: ScanJob): Promise<void> {
    try {
      console.log(`🚀 Processing job ${job.id}: ${job.request.owner}/${job.request.repo}`);
    
      // Override the GitHub service to report progress
      const originalGetRepositoryTree = this.scanService['githubService'].getRepositoryTree.bind(this.scanService['githubService']);
      const originalGetFileContent = this.scanService['githubService'].getFileContent.bind(this.scanService['githubService']);
      
      // Track progress during file discovery
      this.scanService['githubService'].getRepositoryTree = async (...args) => {
        jobQueue.updateJobProgress(job.id, {
          current: 0,
          total: 0,
          currentFile: 'Discovering files...'
        },this.dbClient);
        
        const result = await originalGetRepositoryTree(...args);
        
        jobQueue.updateJobProgress(job.id, {
          current: 0,
          total: result.length,
          currentFile: 'Starting scan...'
        },this.dbClient);
        
        return result;
      };

      // Perform the actual scan
      const result = await this.scanService.scanRepository(job.request);
      
      // Store result and mark as completed
      jobQueue.setJobResult(job.id, result,this.dbClient);
      jobQueue.updateJobStatus(job.id, this.dbClient,'completed');
      
      console.log(`✅ Job ${job.id} completed: ${result.stats.keys_found} keys found`);
      
    } catch (error) {
      console.error(`❌ Job ${job.id} failed:`, error instanceof Error? error.message:`processing job failed, ${error}`);
      jobQueue.updateJobStatus(job.id, this.dbClient,'failed', error instanceof Error? error.message:`processing job failed, ${error}`);
    }
  }

  getJobStatus(jobId: string): Promise<ScanJob | undefined> {
    return jobQueue.getJob(jobId,this.dbClient);
  }

  async getJobWithResults(jobId: string): Promise<{
    job: ScanJob | undefined;
    results?: any[];
    stats?: any;
  }> {
    const job = await jobQueue.getJob(jobId,this.dbClient);
    
    if (!job || job.status !== 'completed') {
      return { job };
    }

    try {
      const [results, stats] = await Promise.all([
        this.dbClient.getScanResults(jobId),
        this.dbClient.getScanStats(jobId)
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
      pendingJobs: jobQueue.getPendingJobs().map((job:ScanJob)  => ({
        id: job.id,
        repository: `${job.request.owner}/${job.request.repo}`,
        createdAt: job.createdAt
      })),
      runningJobs: jobQueue.getRunningJobs().map((job:ScanJob) => ({
        id: job.id,
        repository: `${job.request.owner}/${job.request.repo}`,
        startedAt: job.startedAt,
        progress: job.progress
      }))
    };
  }
}