import { Router,Request, Response } from 'express';
import { asyncHandler } from '../middleware/errorHandler';
import { AsyncScanService } from '../services/asyncScan';
import { dbService } from '../services/database';
import { ApiResponse } from '../types/api';
import { requireAuth, requireOwnership, requireAdmin } from '../middleware/auth';

const userRoutes = Router();

// GET /api/users/:userId/jobs
userRoutes.get('/:userId/jobs',
  requireAuth, requireOwnership('userId'),
  asyncHandler(async (req:Request, res: Response) => {
    const { userId } = req.params;
    const limit = parseInt(req.query.limit as string) || 50;

    const asyncScanService = new AsyncScanService();
    const jobs = await asyncScanService.getUserJobs(userId, limit);

    const response: ApiResponse = {
      success: true,
      data: {
        jobs,
        total: jobs.length
      }
    };

    res.json(response);
  })
);

// GET /api/users/:userId/stats
userRoutes.get('/:userId/stats',
  requireAuth, requireOwnership('userId'),
  asyncHandler(async (req:Request, res: Response) => {
    const { userId } = req.params;

    const stats = await dbService.getUserStats(userId);

    const response: ApiResponse = {
      success: true,
      data: stats
    };

    res.json(response);
  })
);

// POST /api/users
userRoutes.post('/',
  requireAdmin,
  asyncHandler(async (req:Request, res: Response) => {
    const { email, github_username } = req.body;

    const user = await dbService.createUser(email, github_username);

    const response: ApiResponse = {
      success: true,
      data: user
    };

    res.status(201).json(response);
  })
);

export default userRoutes;