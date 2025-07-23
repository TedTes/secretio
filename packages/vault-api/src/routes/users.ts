import { Router,Request, Response } from 'express';
import { asyncHandler, createError } from '../middleware/errorHandler';
import { AsyncScanService } from '../services/asyncScan';
import {GitHubService} from "../services/github";
import { DatabaseService } from '../services/database';
import { ApiResponse,AuthenticatedRequest } from '../types';
import { requireAuth, requireOwnership, requireAdmin } from '../middleware/auth';
import { SupabaseClient } from '@supabase/supabase-js';

const userRoutes = Router();

// Helper function to get user-specific AsyncScanService
const getUserScanService = async (userId: string,dbClient:DatabaseService): Promise<AsyncScanService> => {
  // Get user's GitHub connection from database
  const githubService = new GitHubService();
  const githubConnection = await githubService.getUserGitHubConnection(userId,dbClient);

  if (!githubConnection) {
    throw createError('GitHub account not connected', 400, 'GITHUB_NOT_CONNECTED');
  }
  const userGithubService = new GitHubService(githubConnection.access_token);
  const isValid = await userGithubService.validateToken(githubConnection.access_token);
  if (!isValid) {
      // Remove invalid token from database
  await githubService.removeUserGitHubToken(userId,dbClient);
    throw createError('GitHub token expired, please reconnect', 401, 'GITHUB_TOKEN_EXPIRED');
  }
return new AsyncScanService(dbClient, userId);
};

// GET /api/users/:userId/jobs
userRoutes.get('/:userId/jobs',
  requireAuth, requireOwnership('userId'),
  asyncHandler(async (req:Request, res: Response) => {
    const { userId } = req.params;
    const limit = parseInt(req.query.limit as string) || 50;
    const dbClient = (req as AuthenticatedRequest).dbClient;

    const asyncScanService = await getUserScanService(userId,dbClient);
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
  asyncHandler(async (req:AuthenticatedRequest, res: Response) => {
    const { userId } = req.params;

    const stats = await req.dbClient.getUserStats(userId);

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
  asyncHandler(async (req:AuthenticatedRequest, res: Response) => {
    const { email, github_username } = req.body;

    const user = await DatabaseService.createUser(email, github_username);

    const response: ApiResponse = {
      success: true,
      data: user
    };

    res.status(201).json(response);
  })
);

export default userRoutes;