import { Router, Response } from 'express';
import { validateParams } from '../middleware/validation';
import { asyncHandler, createError } from '../middleware/errorHandler';
import { AsyncScanService } from '../services/asyncScan';

import {ValidatedRequest,ApiResponse} from "../types";
import Joi from 'joi';

const jobRoutes = Router();

// Global async scan service (in production, TODO:this would be per-user)
const asyncScanService = new AsyncScanService();

// Validation schemas
const jobIdSchema = Joi.object({
  jobId: Joi.string().uuid().required().messages({
    'string.uuid': 'Job ID must be a valid UUID',
    'any.required': 'Job ID is required'
  })
});

// GET /api/jobs/status/:jobId
jobRoutes.get('/status/:jobId',
  validateParams(jobIdSchema),
  asyncHandler(async (req: ValidatedRequest, res: Response) => {
    const { jobId } = req.validatedParams;
    
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
  validateParams(jobIdSchema),
  asyncHandler(async (req: ValidatedRequest, res: Response) => {
    const { jobId } = req.validatedParams;
    
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
  asyncHandler(async (req:Request, res: Response) => {
    const queueInfo = asyncScanService.getQueueStats();
    
    const response: ApiResponse = {
      success: true,
      data: queueInfo
    };

    res.json(response);
  })
);

export default jobRoutes;