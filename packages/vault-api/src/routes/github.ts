import { Router,Response } from 'express';
import { asyncHandler } from '../middleware/errorHandler';
import { requireAuth } from '../middleware/auth';
import { validateBody } from '../middleware/validation';
import { githubExchangeSchema, githubDisconnectSchema } from '../validation/schemas';
import { GitHubService } from '../services/github';
import {AuthenticatedRequest, ValidatedRequest} from "../types"
const router = Router();
const githubService = new GitHubService();

// Exchange GitHub OAuth code for access token
router.post('/token/exchange', 
  requireAuth,
  validateBody(githubExchangeSchema),
  asyncHandler(async (req:AuthenticatedRequest & ValidatedRequest, res:Response) => {
    const { code, state } = req.validatedBody;
    const userId = req.user.id;

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
      });

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
    const userId = req.user.id;

    try {
      const githubConnection = await githubService.getUserGitHubConnection(userId);

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
        await githubService.removeUserGitHubToken(userId);
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

// Get user's repositories
router.get('/repositories',
  requireAuth,
  asyncHandler(async (req:AuthenticatedRequest & ValidatedRequest, res:Response) => {
    const userId = req.user.id;
    const { page = 1, per_page = 30, type = 'all', sort = 'updated' } = req.query;

    try {
      const githubConnection = await githubService.getUserGitHubConnection(userId);

      if (!githubConnection) {
        return res.status(400).json({
          success: false,
          error: 'GitHub account not connected'
        });
      }

      const repositories = await githubService.getUserRepositories(
        githubConnection.access_token,
        {
          page: parseInt(page as string),
          per_page: parseInt(per_page as string),
          type: type as string,
          sort: sort as string
        }
      );

      res.status(200).json({
        success: true,
        data: repositories
      });

    } catch (error) {
      console.error('GitHub repositories error:', error);
      
      if ((error instanceof Error?error.message.includes('token_expired'):error)) {
        await githubService.removeUserGitHubToken(userId);
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
    }
  })
);

// Get repository branches
router.get('/repositories/:owner/:repo/branches',
  requireAuth,
  asyncHandler(async (req:AuthenticatedRequest & ValidatedRequest, res:Response) => {
    const userId = req.user.id;
    const { owner, repo } = req.params;

    try {
      const githubConnection = await githubService.getUserGitHubConnection(userId);

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

// Disconnect GitHub account
router.delete('/disconnect',
  requireAuth,
  asyncHandler(async (req:AuthenticatedRequest, res:Response) => {
    const userId = req.user.id;

    try {
      await githubService.removeUserGitHubToken(userId);

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

export default router;