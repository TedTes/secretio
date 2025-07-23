import { Router,Response } from 'express';
import { asyncHandler } from '../middleware/errorHandler';
import { requireAuth } from '../middleware/auth';
import { validateBody } from '../middleware/validation';
import { githubExchangeSchema, githubDisconnectSchema } from '../validation/schemas';
import { GitHubService } from '../services/github';
import {AuthenticatedRequest, ValidatedRequest} from "../types"
import { getRepoSizeWarning, formatRepoSize, getScanningRecommendation, filterReposBySize } from '../utils/repo-size-utils';
const router = Router();
const githubService = new GitHubService();

// Exchange GitHub OAuth code for access token
router.post('/token/exchange', 
  requireAuth,
  validateBody(githubExchangeSchema),
  asyncHandler(async (req:AuthenticatedRequest & ValidatedRequest, res:Response) => {
    const { code, state } = req.validatedBody;
    const userId = req.user.id;
    const supabase = (req as AuthenticatedRequest).supabaseClient;
    try {
      // Verify state parameter
      if (state !== 'repo-access') {
        return res.status(400).json({
          success: false,
          error: 'Invalid OAuth state parameter'
        });
      }

      // Exchange code for access token
      const tokenData = await githubService.exchangeCodeForToken(code);

      // Get GitHub user info
      const githubUser = await githubService.getGitHubUser(tokenData.access_token);
    
      // Store GitHub token and user info in database
      await githubService.storeUserGitHubToken(userId, {
        access_token: tokenData.access_token,
        token_type: tokenData.token_type,
        scope: tokenData.scope,
        github_username: githubUser.login,
        github_user_id: githubUser.id,
        github_avatar_url: githubUser.avatar_url,
        github_name: githubUser.name,
        public_repos: githubUser.public_repos,
        private_repos: githubUser.total_private_repos || 0
      },supabase);

      res.status(200).json({
        success: true,
        message: 'GitHub account connected successfully',
        user: {
          login: githubUser.login,
          name: githubUser.name,
          avatar_url: githubUser.avatar_url,
          public_repos: githubUser.public_repos
        }
      });
    } catch (error) {
      console.error('GitHub token exchange error:', error);
      
      if (error instanceof Error?error.message.includes('bad_verification_code'):error) {
        return res.status(400).json({
          success: false,
          error: 'Invalid or expired authorization code'
        });
      }

      res.status(500).json({
        success: false,
        error: 'Failed to connect GitHub account'
      });
    }
  })
);

// Get user's GitHub connection status
router.get('/connection/status',
  requireAuth,
  asyncHandler(async (req:AuthenticatedRequest & ValidatedRequest,res:Response) => {
    const dbClient = (req as AuthenticatedRequest).dbClient;
    const userId = req.user.id;

    try {
      
      const githubConnection = await githubService.getUserGitHubConnection(userId,dbClient );

      if (!githubConnection) {
        return res.status(200).json({
          success: true,
          connected: false
        });
      }

      // Verify token is still valid
      const isValid = await githubService.validateToken(githubConnection.access_token);

      if (!isValid) {
        // Token expired, remove from database
        await githubService.removeUserGitHubToken(userId,dbClient);
        return res.status(200).json({
          success: true,
          connected: false,
          message: 'GitHub token expired, please reconnect'
        });
      }

      res.status(200).json({
        success: true,
        connected: true,
        user: {
          login: githubConnection.github_username,
          name: githubConnection.github_name,
          avatar_url: githubConnection.github_avatar_url,
          public_repos: githubConnection.public_repos
        }
      });

    } catch (error) {
      console.error('GitHub status check error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to check GitHub connection status'
      });
    }
  })
);

// Get user repositories with smart filtering
router.get('/repositories',
  requireAuth, 
  asyncHandler(async (req:AuthenticatedRequest , res:Response) => {
    const userId = req.user.id;

    const dbClient  = (req as AuthenticatedRequest).dbClient ;
    const github = new GitHubService(req.headers.authorization?.replace('Bearer ', ''));
    const page = parseInt(req.query.page as string) || 1;
    const perPage = Math.min(parseInt(req.query.per_page as string) || 30, 100);
    const type = req.query.type as string || 'all';
    const sort = req.query.sort as string || 'updated';
    const maxRequests = parseInt(req.query.max_requests as string) || 1000;
    // Get rate limit info
    let rateLimitInfo = null;
    try {
      const githubConnection = await githubService.getUserGitHubConnection(userId,dbClient);

      if (!githubConnection) {
        return res.status(400).json({
          success: false,
          error: 'GitHub account not connected'
        });
      }
         // Get repositories
    const repositories = await github.getUserRepositories(githubConnection.access_token, {
      page,
      per_page: perPage,
      type,
      sort
    });
           // Add size warnings to each repo
       const reposWithWarnings = repositories.map(repo => ({
        ...repo,
        formattedSize: formatRepoSize(repo.size || 0),
        warning: getRepoSizeWarning(repo.size || 0)
      }));
      // const rateLimit = await github.getRateLimit();
      // rateLimitInfo = {
      //   remaining: rateLimit.rate.remaining,
      //   limit: rateLimit.rate.limit,
      //   resetTime: new Date(rateLimit.rate.reset * 1000)
      // };
      // Filter repositories based on size and rate limits if requested
      const shouldFilter = req.query.filter_by_size === 'true';
      const filteredRepos = shouldFilter 
      ? filterReposBySize(reposWithWarnings, maxRequests)
      : reposWithWarnings;
      // Categorize repos by scanning difficulty
      const categories = {
      recommended: filteredRepos.filter(repo => 
        repo.warning.level === 'success' || repo.warning.level === 'info'
      ).slice(0, 5),
      moderate: filteredRepos.filter(repo => repo.warning.level === 'warning'),
      difficult: filteredRepos.filter(repo => repo.warning.level === 'error')
    };
    res.status(200).json({
      success: true,
      data: repositories,
      reposWithWarnings,
      repositories: filteredRepos,
      categories,
      rateLimitInfo,
      pagination: {
        page,
        perPage,
        hasMore: repositories.length === perPage
      },
      summary: {
        total: filteredRepos.length,
        scannable: filteredRepos.filter(repo => repo.warning.canScan).length,
        recommended: categories.recommended.length
      }
    });
  } catch (error) {

    console.error('GitHub repositories error:', error);
      
      if ((error instanceof Error?error.message.includes('token_expired'):error)) {
        await githubService.removeUserGitHubToken(userId,dbClient);
        return res.status(401).json({
          success: false,
          error: 'GitHub token expired, please reconnect',
          reconnect_required: true
        });
      }

      res.status(500).json({
        success: false,
        error: 'Failed to fetch repositories'
      });
      console.warn('Could not fetch rate limit info:', error);
  }
  })
  
    
 
    

);

// Get repository branches
router.get('/repositories/:owner/:repo/branches',
  requireAuth,
  asyncHandler(async (req:AuthenticatedRequest & ValidatedRequest, res:Response) => {
    const userId = req.user.id;
    const { owner, repo } = req.params;
    const dbClient  = (req as AuthenticatedRequest).dbClient ;
    try {
      const githubConnection = await githubService.getUserGitHubConnection(userId,dbClient );

      if (!githubConnection) {
        return res.status(400).json({
          success: false,
          error: 'GitHub account not connected'
        });
      }

      const branches = await githubService.getRepositoryBranches(
        githubConnection.access_token,
        `${owner}/${repo}`
      );

      res.status(200).json({
        success: true,
        data: branches
      });

    } catch (error) {
      console.error('GitHub branches error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch repository branches'
      });
    }
  })
);

// GET /api/github/repo-info/:owner/:repo
router.get('/repository/:owner/:repo-name', requireAuth, asyncHandler(async (req:AuthenticatedRequest & ValidatedRequest, res:Response) => {
  const github = new GitHubService(req.headers.authorization);
  const repoData = await github.getRepository(req.params.owner, req.params.repo);
  
  const warning = getRepoSizeWarning(repoData.size || 0);
  const formattedSize = formatRepoSize(repoData.size || 0);
  
      // Get current rate limit status
  let rateLimitInfo = null;
  try {
    const rateLimit = await github.getRateLimit();
    rateLimitInfo = {
      remaining: rateLimit.rate.remaining,
      limit: rateLimit.rate.limit,
      resetTime: new Date(rateLimit.rate.reset * 1000),
      canScan: rateLimit.rate.remaining > warning.estimatedRequests
    };
  } catch (error) {
    console.warn('Could not fetch rate limit info:', error);
  }
      
   // Get scanning recommendation if we have rate limit info
   let scanRecommendation = null;
   if (rateLimitInfo) {
     scanRecommendation = getScanningRecommendation(rateLimitInfo.remaining, repoData.size || 0);
   }
   res.json({
    repository: {
      ...repoData,
      formattedSize
    },
    scanning: {
      warning,
      rateLimitInfo,
      recommendation: scanRecommendation,
      estimatedRequests: warning.estimatedRequests,
      canScan: warning.canScan && (scanRecommendation?.canScan !== false)
    }
  });
}));
// Disconnect GitHub account
router.delete('/disconnect',
  requireAuth,
  asyncHandler(async (req:AuthenticatedRequest, res:Response) => {
    const userId = req.user.id;
    const dbClient  = (req as AuthenticatedRequest).dbClient ;
    try {
      await githubService.removeUserGitHubToken(userId,dbClient);

      res.status(200).json({
        success: true,
        message: 'GitHub account disconnected successfully'
      });

    } catch (error) {
      console.error('GitHub disconnect error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to disconnect GitHub account'
      });
    }
  })
);

// Get current rate limit status
router.get('/rate-limit',
  requireAuth,
  asyncHandler(async (req:AuthenticatedRequest, res:Response) => {
    const github = new GitHubService(req.headers.authorization?.replace('Bearer ', ''));
    
    const rateLimit = await github.getRateLimit();
    
    res.json({
      core: {
        remaining: rateLimit.rate.remaining,
        limit: rateLimit.rate.limit,
        resetTime: new Date(rateLimit.rate.reset * 1000),
        used: rateLimit.rate.limit - rateLimit.rate.remaining
      },
      // Some users might have different limits for search
      search: rateLimit.search ? {
        remaining: rateLimit.search.remaining,
        limit: rateLimit.search.limit,
        resetTime: new Date(rateLimit.search.reset * 1000)
      } : null,
      recommendations: {
        canScanSmall: rateLimit.rate.remaining > 50,
        canScanMedium: rateLimit.rate.remaining > 200,
        canScanLarge: rateLimit.rate.remaining > 1000,
        suggestedMaxRepoSize: rateLimit.rate.remaining * 1000 // KB
      }
    });
  })
);
export default router;