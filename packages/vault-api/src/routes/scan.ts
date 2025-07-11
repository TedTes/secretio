import { Router, Request, Response } from 'express';
import { ScanService } from '../services/scan';
import { validateBody, ValidatedRequest } from '../middleware/validation';
import { asyncHandler, createError } from '../middleware/errorHandler';
import { scanRepositorySchema, scanMultipleSchema } from '../validation/schemas';
import { ScanRepositoryRequest, ScanMultipleRequest, ApiResponse, ScanRepositoryResponse } from '../types/api';
import { AsyncScanService } from '../services/asyncScan';
import { v4 as uuidv4 } from 'uuid';
const scanRoutes = Router();

// POST /api/scan/repository
scanRoutes.post('/repository',
    validateBody(scanRepositorySchema), 
    asyncHandler(async (req: ValidatedRequest<ScanRepositoryRequest>, res: Response) => {


    const startTime = Date.now();
    const scanId = uuidv4();
    const { owner, repo, branch, github_token } = req.body;

    console.log(`📡 [${scanId}] Starting scan for ${owner}/${repo}${branch ? `@${branch}` : ''}`);


    const scanService = new ScanService(github_token);

    console.log(`📡 Starting scan for ${owner}/${repo}`);

    // Perform the scan
    const result = await scanService.scanRepository({
      owner,
      repo,
      branch
    });

    const duration = Date.now() - startTime;
    console.log(`✅ [${scanId}] Scan completed in ${duration}ms: ${result.stats.keysFound} keys found`);
   

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
    validateBody(scanMultipleSchema),
    asyncHandler(async (req: ValidatedRequest<ScanMultipleRequest>, res: Response) => {
      const startTime = Date.now();
      const scanId = uuidv4();
      
      const { repositories, github_token } = req.validatedBody;
  
      if (repositories.length > 10) {
        throw createError('Maximum 10 repositories allowed per request', 400, 'REPO_LIMIT_EXCEEDED');
      }
  
      console.log(`📡 [${scanId}] Starting bulk scan for ${repositories.length} repositories`);
  
      const scanService = new ScanService(github_token);
      const results = await scanService.scanMultipleRepositories(repositories);
  
      const duration = Date.now() - startTime;
      const totalKeys = results.reduce((sum, result) => sum + result.stats.keysFound, 0);
      
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
    validateBody(scanRepositorySchema),
    asyncHandler(async (req: ValidatedRequest<ScanRepositoryRequest>, res: Response) => {
      const { owner, repo, branch, github_token, user_id } = req.validatedBody;
  
      console.log(`⏳ Queueing async scan for ${owner}/${repo}${branch ? `@${branch}` : ''} (user: ${user_id || 'anonymous'})`);
  
      const asyncScanService = new AsyncScanService(github_token);
      

      const job = await asyncScanService.queueScan({
        owner,
        repo,
        branch,
        github_token
      }, user_id);
  
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
    asyncHandler(async (req:ValidatedRequest<ScanMultipleRequest>, res: Response) => {
      const scanService = new ScanService();
      
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

export default scanRoutes;