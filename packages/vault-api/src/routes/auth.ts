import { Router, Request, Response } from 'express';
import { validateBody} from '../middleware/validation';
import { asyncHandler, createError } from '../middleware/errorHandler';
import { requireAuth,  getAuthenticatedUser } from '../middleware/auth';
import { authRateLimit, logUserAction } from '../utils/auth';
import { AuthService } from '../services/auth';

import { 
  loginSchema, 
  registerSchema, 
  refreshTokenSchema, 
  resetPasswordSchema,
  changePasswordSchema
} from '../validation/authSchemas';
import { 
  LoginRequest, 
  RegisterRequest, 
  RefreshTokenRequest,
  AuthResponse ,
  ChangePasswordRequest,
  AuthenticatedRequest,
  ValidatedRequest,
  ApiResponse
} from '../types';
import { DatabaseService } from '../services/database';


const authRoutes = Router();
const authService = new AuthService();

// Rate limiting for auth endpoints
const authRateLimit15Min = authRateLimit(15 * 60 * 1000, 5, 'Too many authentication attempts');
const strictAuthRateLimit = authRateLimit(15 * 60 * 1000, 3, 'Too many failed authentication attempts');

// POST /auth/register
authRoutes.post('/register',
  authRateLimit15Min,
  validateBody(registerSchema),
  logUserAction('register_attempt'),
  asyncHandler(async (req: ValidatedRequest<RegisterRequest>, res: Response) => {
    const { email, password, github_username } = req.validatedBody;

    console.log(`📝 Registration attempt for email: ${email}`);

    try {
      // Register user with Supabase Auth
      const authResult = await authService.register({
        email,
        password,
        github_username
      });

      if (!authResult.success || !authResult.user) {
        throw createError(authResult.error || 'Registration failed', 400, 'REGISTRATION_FAILED');
      }

      console.log(`✅ User registered successfully: (${email})`);

      const response: ApiResponse<AuthResponse> = {
        success: true,
        data: {
          success: true,
          user: {
            id: authResult.user.id,
            email: authResult.user.email,
            role: 'user'
          },
          session: authResult.session,
          message: 'Registration successful'
        }
      };

      res.status(201).json(response);
    } catch (error) {
      console.error(`❌ Registration failed for ${email}:`, error);
      
      if (error instanceof Error && error.message.includes('already registered')) {
        throw createError('An account with this email already exists', 400, 'EMAIL_ALREADY_EXISTS');
      }
      
      throw error;
    }
  })
);

// POST /auth/login
authRoutes.post('/login',
  authRateLimit15Min,
  validateBody(loginSchema),
  logUserAction('login_attempt'),
  asyncHandler(async (req: ValidatedRequest<LoginRequest>, res: Response) => {
    const { email, password } = req.validatedBody;

    console.log(`🔐 Login attempt for email: ${email}`);

    try {
      const authResult = await authService.login({ email, password });

      if (!authResult.success || !authResult.user) {
        throw createError(authResult.error || 'Invalid credentials', 401, 'INVALID_CREDENTIALS');
      }

      console.log(`✅ User logged in successfully: (${email})`);

      const response: ApiResponse<AuthResponse> = {
        success: true,
        data: {
          success: true,
          user: {
            id: authResult.user.id,
            email: authResult.user.email,
            role: authResult.user.user_metadata?.role || 'user'
          },
          session: authResult.session,
          message: 'Login successful'
        }
      };

      res.json(response);
    } catch (error) {
      console.error(`❌ Login failed for ${email}:`, error);
      throw error;
    }
  })
);

// POST /auth/logout
authRoutes.post('/logout',
  requireAuth,
  logUserAction('logout'),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const user = req.user;

    console.log(`👋 Logout for user: ${user.id}`);

    try {
      // Get token from Authorization header
      const token = req.headers.authorization?.replace('Bearer ', '');
      
      if (token) {
        await authService.logout(token);
      }

      const response: ApiResponse<AuthResponse> = {
        success: true,
        data: {
          success: true,
          message: 'Logout successful'
        }
      };

      res.json(response);
    } catch (error) {
      console.error(`❌ Logout failed for user ${user.id}:`, error);
      
      // Even if logout fails, return success (token is invalidated client-side)
      const response: ApiResponse<AuthResponse> = {
        success: true,
        data: {
          success: true,
          message: 'Logout completed'
        }
      };

      res.json(response);
    }
  })
);

// POST /auth/refresh
authRoutes.post('/refresh',
  strictAuthRateLimit,
  validateBody(refreshTokenSchema),
  logUserAction('token_refresh'),
  asyncHandler(async (req: ValidatedRequest<RefreshTokenRequest>, res: Response) => {
    const { refresh_token } = req.validatedBody;

    console.log('🔄 Token refresh attempt');

    try {
      const authResult = await authService.refreshToken(refresh_token);

      if (!authResult.success || !authResult.session) {
        throw createError('Invalid refresh token', 401, 'INVALID_REFRESH_TOKEN');
      }

      console.log(`✅ Token refreshed successfully for user: ${authResult.user?.id}`);

      const response: ApiResponse<AuthResponse> = {
        success: true,
        data: {
          success: true,
          user: authResult.user,
          session: authResult.session,
          message: 'Token refreshed successfully'
        }
      };

      res.json(response);
    } catch (error) {
      console.error('❌ Token refresh failed:', error);
      throw error;
    }
  })
);

// GET /auth/me - Get current user profile
authRoutes.get('/me',
  requireAuth,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const user = req.user;
    const dbServiceInstance = (req as AuthenticatedRequest).dbServiceInstance;
    try {
      // Get additional user data from database
      const dbUser = await dbServiceInstance.getUser(user.id);
      
      const response: ApiResponse = {
        success: true,
        data: {
          id: user.id,
          email: user.email,
          role: user.role,
          github_username: dbUser?.github_username,
          created_at: dbUser?.created_at,
          updated_at: dbUser?.updated_at
        }
      };

      res.json(response);
    } catch (error) {
      console.error(`❌ Failed to get user profile for ${user.id}:`, error);
      throw createError('Failed to get user profile', 500, 'PROFILE_FETCH_FAILED');
    }
  })
);

// POST /auth/forgot-password
authRoutes.post('/forgot-password',
  strictAuthRateLimit,
  validateBody(resetPasswordSchema),
  logUserAction('password_reset_request'),
  asyncHandler(async (req: ValidatedRequest<{ email: string }>, res: Response) => {
    const { email } = req.validatedBody;

    console.log(`🔑 Password reset request for email: ${email}`);

    try {
      await authService.sendPasswordReset(email);

      // Always return success for security (don't reveal if email exists)
      const response: ApiResponse = {
        success: true,
        data: {
          message: 'If an account with this email exists, a password reset link has been sent'
        }
      };

      res.json(response);
    } catch (error) {
      console.error(`❌ Password reset failed for ${email}:`, error);
      
      // Still return success for security
      const response: ApiResponse = {
        success: true,
        data: {
          message: 'If an account with this email exists, a password reset link has been sent'
        }
      };

      res.json(response);
    }
  })
);

// POST /auth/change-password
authRoutes.post('/change-password',
  requireAuth,
  validateBody(changePasswordSchema),
  logUserAction('password_change'),
  asyncHandler(async (req: ValidatedRequest< ChangePasswordRequest> & AuthenticatedRequest, res: Response) => {
    const { current_password, new_password } = req.validatedBody;
    const user = req.user;

    console.log(`🔐 Password change request for user: ${user.id}`);

    try {
      // Get current session token
      const token = req.headers.authorization?.replace('Bearer ', '');
      
      if (!token) {
        throw createError('Authentication token required', 401, 'TOKEN_REQUIRED');
      }

      await authService.changePassword(token, current_password, new_password);

      console.log(`✅ Password changed successfully for user: ${user.id}`);

      const response: ApiResponse = {
        success: true,
        data: {
          message: 'Password changed successfully'
        }
      };

      res.json(response);
    } catch (error) {
      console.error(`❌ Password change failed for user ${user.id}:`, error);
      
      if (error instanceof Error && error.message.includes('Invalid login credentials')) {
        throw createError('Current password is incorrect', 400, 'INVALID_CURRENT_PASSWORD');
      }
      
      throw error;
    }
  })
);

// POST /auth/oauth/google
authRoutes.post('/oauth/google',
  authRateLimit15Min,
  logUserAction('oauth_google'),
  asyncHandler(async (req: Request, res: Response) => {
    const { redirect_url } = req.body;

    try {
      const { data, error } = await authService.getOAuthUrl('google', redirect_url);

      if (error || !data?.url) {
        throw createError('Failed to generate OAuth URL', 500, 'OAUTH_URL_FAILED');
      }

      const response: ApiResponse = {
        success: true,
        data: {
          url: data.url,
          provider: 'google'
        }
      };

      res.json(response);
    } catch (error) {
      console.error('❌ Google OAuth URL generation failed:', error);
      throw error;
    }
  })
);

// POST /auth/oauth/github
authRoutes.post('/oauth/github',
  authRateLimit15Min,
  logUserAction('oauth_github'),
  asyncHandler(async (req: Request, res: Response) => {
    const { redirect_url } = req.body;

    try {
      const { data, error } = await authService.getOAuthUrl('github', redirect_url);

      if (error || !data?.url) {
        throw createError('Failed to generate OAuth URL', 500, 'OAUTH_URL_FAILED');
      }

      const response: ApiResponse = {
        success: true,
        data: {
          url: data.url,
          provider: 'github'
        }
      };

      res.json(response);
    } catch (error) {
      console.error('❌ GitHub OAuth URL generation failed:', error);
      throw error;
    }
  })
);


// GET /auth/session - Validate current session
authRoutes.get('/session',
  asyncHandler(async (req: Request, res: Response) => {
    const token = req.headers.authorization?.replace('Bearer ', '');
    
    if (!token) {
      const response: ApiResponse = {
        success: false,
        error: 'No token provided'
      };
      return res.status(401).json(response);
    }

    try {
      const user = await authService.validateSession(token);
      
      if (!user) {
        const response: ApiResponse = {
          success: false,
          error: 'Invalid session'
        };
        return res.status(401).json(response);
      }

      const response: ApiResponse = {
        success: true,
        data: {
          user,
          valid: true
        }
      };

      res.json(response);
    } catch (error) {
      console.error('❌ Session validation failed:', error);
      
      const response: ApiResponse = {
        success: false,
        error: 'Session validation failed'
      };
      
      res.status(401).json(response);
    }
  })
);

export default authRoutes;