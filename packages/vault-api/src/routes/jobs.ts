import { Router, Response } from 'express';
import { validateParams } from '../middleware/validation';
import { asyncHandler, createError } from '../middleware/errorHandler';
import { AsyncScanService } from '../services/asyncScan';
import {GitHubService} from "../services/github";
import {ValidatedRequest,ApiResponse,AuthenticatedRequest} from "../types";
import { requireJobOwnership } from '../utils';
import { requireAuth  } from '../middleware/auth';
import Joi from 'joi';
import {DatabaseService} from "../services//database";
import {getUserId} from "../utils";
import { ScanResult } from '@secretio/shared';
const jobRoutes = Router();

// Helper function to get user-specific AsyncScanService
const getUserScanService = async (userId: string,dbServiceInstance:DatabaseService): Promise<AsyncScanService> => {
    // Get user's GitHub connection from database
    const githubService = new GitHubService();
    const githubConnection = await githubService.getUserGitHubConnection(userId,dbServiceInstance);
  
    if (!githubConnection) {
      throw createError('GitHub account not connected', 400, 'GITHUB_NOT_CONNECTED');
    }
    const userGithubService = new GitHubService(githubConnection.access_token);
    const isValid = await userGithubService.validateToken(githubConnection.access_token);
    if (!isValid) {
        // Remove invalid token from database
    await githubService.removeUserGitHubToken(userId,dbServiceInstance);
      throw createError('GitHub token expired, please reconnect', 401, 'GITHUB_TOKEN_EXPIRED');
    }
  return new AsyncScanService(dbServiceInstance, userId);
};

// Validation schemas
const jobIdSchema = Joi.object({
  jobId: Joi.string().uuid().required().messages({
    'string.uuid': 'Job ID must be a valid UUID',
    'any.required': 'Job ID is required'
  })
});

// GET /api/jobs/status/:jobId
jobRoutes.get('/status/:jobId',
  requireAuth, requireJobOwnership(),
  validateParams(jobIdSchema),
  asyncHandler(async (req: AuthenticatedRequest & ValidatedRequest, res: Response) => {
    const dbServiceInstance = (req as AuthenticatedRequest).dbServiceInstance;
    const { jobId } = req.validatedParams;
    const userId = req.user.id;
    
    // Create user-specific service instance
    const asyncScanService = await getUserScanService(userId,dbServiceInstance);
    const job = await asyncScanService.getJobStatus(jobId);
    
    if (!job) {
      throw createError('Job not found', 404, 'JOB_NOT_FOUND');
    }

    const response: ApiResponse = {
      success: true,
      data: {
        id: job.id,
        status: job.status,
        createdAt: job.createdAt,
        startedAt: job.startedAt,
        completedAt: job.completedAt,
        progress: job.progress,
        error: job.error,
        repository: `${job.request.owner}/${job.request.repo}`,
        branch: job.request.branch || 'main'
      }
    };

    res.json(response);
  })
);

// GET /api/jobs/results/:jobId
jobRoutes.get('/results/:jobId',
  requireAuth, requireJobOwnership(),
  validateParams(jobIdSchema),
  asyncHandler(async (req: AuthenticatedRequest & ValidatedRequest, res: Response) => {
    const { jobId } = req.validatedParams;
    const dbServiceInstance = (req as AuthenticatedRequest).dbServiceInstance;
    const userId = await getUserId(req);
  
    if (!userId) {
      throw createError('User ID required', 401);
    }
    // Verify job belongs to user
    const userJob = await req.dbServiceInstance.getScanJob(jobId);
    if (!userJob) {
      throw createError('Scan job not found', 404);
    }

    // Create user-specific service instance
    const asyncScanService = await getUserScanService(userId,dbServiceInstance);
    const job = await asyncScanService.getJobStatus(jobId);
    
    if (!job) {
      throw createError('Job not found', 404, 'JOB_NOT_FOUND');
    }

    // Get scan results
    const results = await req.dbServiceInstance.getScanResults(jobId);
    let stats = await req.dbServiceInstance.getScanStats(jobId);

    // If no stats in DB yet (during running scan), calculate from results
    if (!stats || job.status === 'running') {
      const calculatedStats = {
        job_id: jobId,
        files_scanned: job.progress_current || 0,
        keys_found: results.length,
        high_severity: results.filter(r => r.severity === 'high').length,
        medium_severity: results.filter(r => r.severity === 'medium').length,
        low_severity: results.filter(r => r.severity === 'low').length,
        total_files: job.progress_total || 0,
        duration_ms: job.started_at && job.status === 'running' 
          ? Date.now() - new Date(job.started_at).getTime()
          : stats?.duration_ms || 0,
        created_at: new Date().toISOString()
      };
      
      // Use calculated stats if DB stats don't exist or are outdated
      stats = calculatedStats;
    }
    const response: ApiResponse<{
      results: ScanResult[];
      stats: any;
      job_status: string;
    }> = {
      success: true,
      data: {
        results: results.map(result => ({
          id: result.id,
          service: result.service,
          file_path: result.file_path,
          line_number: result.line_number,
          severity: result.severity as 'high' | 'medium' | 'low',
          description: result.description,
          masked_value: result.masked_value,
          match: result.masked_value // For compatibility
        })),
        stats: {
          files_scanned: stats.files_scanned,
          keys_found: stats.keys_found,
          high_severity: stats.high_severity,
          medium_severity: stats.medium_severity,
          low_severity: stats.low_severity,
          total_files: stats.total_files,
          duration_ms: stats.duration_ms
        },
        job_status: job.status
      }
     };
    res.json(response);
  })
);

// GET /api/jobs/queue
jobRoutes.get('/queue',
  requireAuth, 
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const userId = req.user.id;
    const dbServiceInstance = (req as AuthenticatedRequest).dbServiceInstance;
    // Create user-specific service instance
    const asyncScanService = await getUserScanService(userId,dbServiceInstance);
    const queueInfo = asyncScanService.getQueueStats();
    
    const response: ApiResponse = {
      success: true,
      data: queueInfo
    };

    res.json(response);
  })
);

export default jobRoutes;