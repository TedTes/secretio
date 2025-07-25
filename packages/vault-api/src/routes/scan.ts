import { Router, Request, Response } from 'express';
import { ScanService } from '../services/scan';
import { validateBody} from '../middleware/validation';
import { asyncHandler, createError } from '../middleware/errorHandler';
import { scanRepositorySchema, scanMultipleSchema } from '../validation/schemas';
import { ScanRepositoryRequest, ScanMultipleRequest, ApiResponse, ScanRepositoryResponse } from '../types/api';
import { AsyncScanService } from '../services/asyncScan';
import {GitHubService} from "../services/github";
import {ValidatedRequest,AuthenticatedRequest} from "../types";
import { requireAuth,injectUserContext} from '../middleware/auth';
import {getUserId} from "../utils";

import { v4 as uuidv4 } from 'uuid';
import { DatabaseService } from '../services/database';
const scanRoutes = Router();

// Helper function to get user-specific AsyncScanService
const getUserScanService = async (userId: string,owner:string, repo: string, dbServiceInstance:DatabaseService): Promise<AsyncScanService> => {
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
  const repoInfo = await userGithubService.getRepository(owner, repo);

  if ((repoInfo.size || 0) > 50000) { // 50MB limit
    throw createError('Repository too large (${Math.round((repoInfo.size || 0) / 1024)}MB). Please try a smaller repository (under 50MB).',
      400,
      'REPO_TOO_LARGE'
    )
  }

  return new AsyncScanService(dbServiceInstance,userId);
};
// POST /api/scan/repository
scanRoutes.post('/repository',
  requireAuth,
  injectUserContext,
    validateBody(scanRepositorySchema), 
    asyncHandler(async (req: AuthenticatedRequest & ValidatedRequest<ScanRepositoryRequest>, res: Response) => {


    const startTime = Date.now();
    const scanId = uuidv4();
    const { owner, repo, branch, github_token } = req.body;

    console.log(`📡 [${scanId}] Starting scan for ${owner}/${repo}${branch ? `@${branch}` : ''}`);

  
    const scanService = new ScanService(req.dbServiceInstance);

    console.log(`📡 Starting scan for ${owner}/${repo}`);

    // Perform the scan
    const result = await scanService.scanRepository({
      owner,
      repo,
      branch
    });

    const duration = Date.now() - startTime;
    console.log(`✅ [${scanId}] Scan completed in ${duration}ms: ${result.stats.keys_found} keys found`);
   

    const response: ApiResponse<ScanRepositoryResponse> = {
        success: true,
        data: {
          ...result,
          metadata: {
            scanId,
            timestamp: new Date().toISOString(),
            duration
          }
        }
      };
      res.json(response);

}));

scanRoutes.post('/multiple',
  requireAuth, injectUserContext,
    validateBody(scanMultipleSchema),
    asyncHandler(async (req: AuthenticatedRequest & ValidatedRequest<ScanMultipleRequest>, res: Response) => {
      const startTime = Date.now();
      const scanId = uuidv4();
      
      const { repositories, github_token } = req.validatedBody;
      const userId = getUserId(req);
  
      if (repositories.length > 10) {
        throw createError('Maximum 10 repositories allowed per request', 400, 'REPO_LIMIT_EXCEEDED');
      }
  
      console.log(`📡 [${scanId}] Starting bulk scan for ${repositories.length} repositories`);
  
      const scanService = new ScanService(req.dbServiceInstance);
      const results = await scanService.scanMultipleRepositories(repositories);
  
      const duration = Date.now() - startTime;
      const totalKeys = results.reduce((sum, result) => sum + result.stats.keys_found, 0);
      
      console.log(`✅ [${scanId}] Bulk scan completed in ${duration}ms: ${totalKeys} total keys found`);
  
      const response: ApiResponse = {
        success: true,
        data: {
          scanId,
          timestamp: new Date().toISOString(),
          duration,
          results,
          summary: {
            repositoriesScanned: results.length,
            totalKeysFound: totalKeys,
            successfulScans: results.filter(r => r.success).length,
            failedScans: results.filter(r => !r.success).length
          }
        }
      };
  
      res.json(response);
    })
  );


scanRoutes.post('/async',
    requireAuth, injectUserContext,
    validateBody(scanRepositorySchema),
    asyncHandler(async (req: AuthenticatedRequest & ValidatedRequest<ScanRepositoryRequest>, res: Response) => {
    const dbServiceInstance = (req as AuthenticatedRequest).dbServiceInstance;

      const { owner, repo, branch} = req.validatedBody;
      const userId = getUserId(req);
      if(!userId) {
        throw createError('User Id must not be null');
      }
      console.log(`⏳ Queueing async scan for ${owner}/${repo}${branch ? `@${branch}` : ''} (user: ${userId || 'anonymous'})`);
   
    // Check rate limit before starting scan
    const scanService = new ScanService(req.body.github_token);
    const rateLimit = await scanService.getRateLimit();
  
  if (rateLimit.remaining < 100) {
    return res.status(429).json({
      success: false,
      error: `Rate limit too low (${rateLimit.remaining} remaining). Resets at ${new Date(rateLimit.reset * 1000).toISOString()}`,
      retryAfter: rateLimit.reset
    });
  }
      
    const asyncScanService = await getUserScanService(userId,owner, repo, dbServiceInstance);


      const job = await asyncScanService.queueScan({
        owner,
        repo,
        branch
      });
  
      const response: ApiResponse = {
        success: true,
        data: {
          jobId: job.id,
          status: job.status,
          repository: `${owner}/${repo}`,
          branch: branch || 'main',
          createdAt: job.createdAt,
          message: 'Scan queued successfully',
          statusUrl: `/api/jobs/status/${job.id}`,
          resultsUrl: `/api/jobs/results/${job.id}`
        }
      };
  
      res.status(202).json(response);
    })
  )
// GET /api/scan/test
scanRoutes.get('/test', 
    asyncHandler(async (req:AuthenticatedRequest & ValidatedRequest<ScanMultipleRequest>, res: Response) => {
      const scanService = new ScanService(req.dbServiceInstance);
      
      const result = await scanService.scanRepository({
        owner: 'octocat',
        repo: 'Hello-World'
      });
  
      const response: ApiResponse = {
        success: true,
        message: 'Test scan completed',
        data: result
      };
  
      res.json(response);
    })
  );
scanRoutes.delete('/jobs/:jobId',
    requireAuth,
    injectUserContext,
    asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
      const dbServiceInstance = req.dbServiceInstance;
      const userId = getUserId(req);
      const { jobId } = req.params;
      
      if (!userId) {
        throw createError('User ID required', 401);
      }
  
      if (!jobId) {
        throw createError('Job ID required', 400);
      }
  
      console.log(`🗑️ Delete scan request for job ${jobId} by user ${userId}`);
  
      try {
        // First, verify the job belongs to the user
        const job = await dbServiceInstance.getScanJob(jobId);
        
        if (!job) {
          throw createError('Scan job not found', 404);
        }
  
        if (job.user_id !== userId) {
          throw createError('Access denied - not your scan job', 403);
        }
  
        // Prevent deletion of running jobs
        if (job.status === 'running' || job.status === 'pending') {
          throw createError('Cannot delete running or pending scan jobs', 400);
        }
  
        // Delete all related data in correct order (due to foreign key constraints)
        
        // 1. Delete scan results first
        await dbServiceInstance.deleteScanResults(jobId);
        
        // 2. Delete scan stats
        await dbServiceInstance.deleteScanStats(jobId);
        
        // 3. Finally delete the job itself
        await dbServiceInstance.deleteScanJob(jobId);
  
        console.log(`✅ Scan job ${jobId} deleted successfully by user ${userId}`);
  
        const response: ApiResponse = {
          success: true,
          message: 'Scan job deleted successfully'
        };
  
        res.json(response);
  
      } catch (error) {
        console.error(`❌ Failed to delete scan job ${jobId}:`, error);
        throw error;
      }
    })
  );
export default scanRoutes;