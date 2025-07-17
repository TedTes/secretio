import { Router, Response } from 'express';
import { validateParams } from '../middleware/validation';
import { asyncHandler, createError } from '../middleware/errorHandler';
import { AsyncScanService } from '../services/asyncScan';
import {GitHubService} from "../services/github";
import {ValidatedRequest,ApiResponse,AuthenticatedRequest} from "../types";
import { requireJobOwnership } from '../utils';
import { requireAuth  } from '../middleware/auth';
import Joi from 'joi';

const jobRoutes = Router();

// Helper function to get user-specific AsyncScanService
const getUserScanService = async (userId: string): Promise<AsyncScanService> => {
    // Get user's GitHub connection from database
    const githubService = new GitHubService();
    const githubConnection = await githubService.getUserGitHubConnection(userId);
  
    if (!githubConnection) {
      throw createError('GitHub account not connected', 400, 'GITHUB_NOT_CONNECTED');
    }
    const userGithubService = new GitHubService(githubConnection.access_token);
    const isValid = await userGithubService.validateToken(githubConnection.access_token);
    if (!isValid) {
        // Remove invalid token from database
    await githubService.removeUserGitHubToken(userId);
      throw createError('GitHub token expired, please reconnect', 401, 'GITHUB_TOKEN_EXPIRED');
    }
  return new AsyncScanService(githubConnection.access_token, userId);
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
    const { jobId } = req.validatedParams;
    const userId = req.user.id;
    
    // Create user-specific service instance
    const asyncScanService = await getUserScanService(userId);
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
    const userId = req.user.id;
    
    // Create user-specific service instance
    const asyncScanService = await getUserScanService(userId);
    const job = await asyncScanService.getJobStatus(jobId);
    
    if (!job) {
      throw createError('Job not found', 404, 'JOB_NOT_FOUND');
    }

    if (job.status === 'pending' || job.status === 'running') {
      throw createError('Job not completed yet', 202, 'JOB_NOT_COMPLETED', {
        status: job.status,
        progress: job.progress
      });
    }

    if (job.status === 'failed') {
      throw createError(`Job failed: ${job.error}`, 400, 'JOB_FAILED');
    }

    const result = await asyncScanService.getJobWithResults(jobId);
    
    if (!result) {
      throw createError('Job results not found', 404, 'RESULTS_NOT_FOUND');
    }

    const response: ApiResponse = {
      success: true,
      data: {
        jobId,
        completedAt: job.completedAt,
        ...result
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
    
    // Create user-specific service instance
    const asyncScanService = await getUserScanService(userId);
    const queueInfo = asyncScanService.getQueueStats();
    
    const response: ApiResponse = {
      success: true,
      data: queueInfo
    };

    res.json(response);
  })
);

export default jobRoutes;