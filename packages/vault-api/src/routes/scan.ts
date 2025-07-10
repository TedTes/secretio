import { Router, Request, Response } from 'express';
import { ScanService } from '../services/scan';

const scanRoutes = Router();

// POST /api/scan/repository
scanRoutes.post('/repository', async (req: Request, res: Response) => {
  try {
    const { owner, repo, branch, github_token } = req.body;

    // Basic validation
    if (!owner || !repo) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'owner and repo are required'
      });
    }

    const scanService = new ScanService(github_token);

    console.log(`📡 Starting scan for ${owner}/${repo}`);

    // Perform the scan
    const result = await scanService.scanRepository({
      owner,
      repo,
      branch
    });

    console.log(`✅ Scan completed: ${result.stats.keysFound} keys found`);

    // Return results
    res.json({
      success: true,
      data: result
    });

  } catch (error) {
    console.error('❌ Scan failed:', error);
    
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Scan failed'
    });
  }
});

// GET /api/scan/test
scanRoutes.get('/test', async (req: Request, res: Response) => {
  try {
    const scanService = new ScanService();
    
    // Test with a small public repo
    const result = await scanService.scanRepository({
      owner: 'octocat',
      repo: 'Hello-World'
    });

    res.json({
      success: true,
      message: 'Test scan completed',
      data: result
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : String(error)
    });
  }
});

export default scanRoutes;