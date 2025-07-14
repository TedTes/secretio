import { supabase } from '../config/database';
import { 
  LoginRequest, 
  RegisterRequest, 
  AuthResponse, 
  AuthSession, 
  User,
  OAuthProvider 
} from '../types/auth';

export class AuthService {

  /**
   * Register a new user with email and password
   */
  async register(request: RegisterRequest): Promise<AuthResponse> {
    try {
      const { email, password, github_username } = request;

      // Register with Supabase Auth
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            github_username,
          }
        }
      });

      if (error) {
        console.error('Supabase registration error:', error);
        
        let errorMessage = 'Registration failed';
        if (error.message.includes('already registered')) {
          errorMessage = 'An account with this email already exists';
        } else if (error.message.includes('password')) {
          errorMessage = 'Password does not meet requirements';
        } else if (error.message.includes('email')) {
          errorMessage = 'Invalid email address';
        }

        return {
          success: false,
          error: errorMessage
        };
      }

      if (!data.user) {
        return {
          success: false,
          error: 'Registration failed - no user data returned'
        };
      }

      return {
        success: true,
        user: {
          id: data.user.id,
          email: data.user.email,
          role: 'user'
        },
        session: data.session ? {
          access_token: data.session.access_token,
          refresh_token: data.session.refresh_token,
          expires_in: data.session.expires_in,
          token_type: data.session.token_type,
          user: {
            id: data.user.id,
            email: data.user.email,
            role: 'user'
          }
        } : undefined,
        message: 'Registration successful'
      };

    } catch (error) {
      console.error('Registration service error:', error);
      return {
        success: false,
        error: 'Registration service error'
      };
    }
  }

  /**
   * Login user with email and password
   */
  async login(request: LoginRequest): Promise<AuthResponse> {
    try {
      const { email, password } = request;

      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (error) {
        console.error('Supabase login error:', error);
        
        let errorMessage = 'Invalid credentials';
        if (error.message.includes('invalid login credentials')) {
          errorMessage = 'Invalid email or password';
        } else if (error.message.includes('email not confirmed')) {
          errorMessage = 'Please verify your email before logging in';
        } else if (error.message.includes('too many requests')) {
          errorMessage = 'Too many login attempts. Please try again later';
        }

        return {
          success: false,
          error: errorMessage
        };
      }

      if (!data.user || !data.session) {
        return {
          success: false,
          error: 'Login failed - no session data returned'
        };
      }

      return {
        success: true,
        user: {
          id: data.user.id,
          email: data.user.email,
          role: data.user.user_metadata?.role || data.user.app_metadata?.role || 'user'
        },
        session: {
          access_token: data.session.access_token,
          refresh_token: data.session.refresh_token,
          expires_in: data.session.expires_in,
          token_type: data.session.token_type,
          user: {
            id: data.user.id,
            email: data.user.email,
            role: data.user.user_metadata?.role || data.user.app_metadata?.role || 'user'
          }
        },
        message: 'Login successful'
      };

    } catch (error) {
      console.error('Login service error:', error);
      return {
        success: false,
        error: 'Login service error'
      };
    }
  }

  /**
   * Logout user by invalidating session
   */
  async logout(accessToken: string): Promise<AuthResponse> {
    try {
      // Set the session with the access token
      await supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: '' // Not needed for logout
      });

      const { error } = await supabase.auth.signOut();

      if (error) {
        console.error('Supabase logout error:', error);
        // Don't fail logout even if Supabase fails
      }

      return {
        success: true,
        message: 'Logout successful'
      };

    } catch (error) {
      console.error('Logout service error:', error);
      // Return success anyway - client-side token removal is sufficient
      return {
        success: true,
        message: 'Logout completed'
      };
    }
  }

  /**
   * Refresh access token using refresh token
   */
  async refreshToken(refreshToken: string): Promise<AuthResponse> {
    try {
      const { data, error } = await supabase.auth.refreshSession({
        refresh_token: refreshToken
      });

      if (error) {
        console.error('Supabase token refresh error:', error);
        
        let errorMessage = 'Token refresh failed';
        if (error.message.includes('invalid')) {
          errorMessage = 'Invalid refresh token';
        } else if (error.message.includes('expired')) {
          errorMessage = 'Refresh token has expired';
        }

        return {
          success: false,
          error: errorMessage
        };
      }

      if (!data.session || !data.user) {
        return {
          success: false,
          error: 'Token refresh failed - no session data returned'
        };
      }

      return {
        success: true,
        user: {
          id: data.user.id,
          email: data.user.email,
          role: data.user.user_metadata?.role || data.user.app_metadata?.role || 'user'
        },
        session: {
          access_token: data.session.access_token,
          refresh_token: data.session.refresh_token,
          expires_in: data.session.expires_in,
          token_type: data.session.token_type,
          user: {
            id: data.user.id,
            email: data.user.email,
            role: data.user.user_metadata?.role || data.user.app_metadata?.role || 'user'
          }
        },
        message: 'Token refreshed successfully'
      };

    } catch (error) {
      console.error('Token refresh service error:', error);
      return {
        success: false,
        error: 'Token refresh service error'
      };
    }
  }

  /**
   * Send password reset email
   */
  async sendPasswordReset(email: string): Promise<AuthResponse> {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${process.env.FRONTEND_URL}/reset-password`
      });

      if (error) {
        console.error('Password reset error:', error);
        // Don't reveal if email exists for security
      }

      return {
        success: true,
        message: 'Password reset email sent if account exists'
      };

    } catch (error) {
      console.error('Password reset service error:', error);
      return {
        success: true,
        message: 'Password reset email sent if account exists'
      };
    }
  }

  /**
   * Change user password
   */
  async changePassword(accessToken: string, currentPassword: string, newPassword: string): Promise<AuthResponse> {
    try {
      // First, verify current password by attempting login
      const { data: currentUser } = await supabase.auth.getUser(accessToken);
      
      if (!currentUser.user?.email) {
        return {
          success: false,
          error: 'Unable to verify current user'
        };
      }

      // Verify current password
      const { error: loginError } = await supabase.auth.signInWithPassword({
        email: currentUser.user.email,
        password: currentPassword
      });

      if (loginError) {
        return {
          success: false,
          error: 'Current password is incorrect'
        };
      }

      // Set session and update password
      await supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: ''
      });

      const { error } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (error) {
        console.error('Password change error:', error);
        
        let errorMessage = 'Password change failed';
        if (error.message.includes('password')) {
          errorMessage = 'New password does not meet requirements';
        }

        return {
          success: false,
          error: errorMessage
        };
      }

      return {
        success: true,
        message: 'Password changed successfully'
      };

    } catch (error) {
      console.error('Password change service error:', error);
      return {
        success: false,
        error: 'Password change service error'
      };
    }
  }

  /**
   * Get OAuth URL for provider
   */
  async getOAuthUrl(provider: 'google' | 'github', redirectUrl?: string): Promise<{ data?: { url: string,provider:OAuthProvider  }, error?: any }> {
    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: redirectUrl || `${process.env.FRONTEND_URL}/auth/callback`
        }
      });

      return {data:{url: data.url ?? '' , provider:provider as unknown as OAuthProvider}};

    } catch (error) {
      console.error(`OAuth URL generation error for ${provider}:`, error);
      return { error };
    }
  }

  /**
   * Handle OAuth callback
   */
  async handleOAuthCallback(provider: string, code: string, state?: string): Promise<AuthResponse> {
    try {
      // Exchange code for session
      const { data, error } = await supabase.auth.exchangeCodeForSession(code);

      if (error) {
        console.error(`OAuth callback error for ${provider}:`, error);
        return {
          success: false,
          error: `${provider} authentication failed`
        };
      }

      if (!data.session || !data.user) {
        return {
          success: false,
          error: 'OAuth authentication failed - no session data'
        };
      }

      return {
        success: true,
        user: {
          id: data.user.id,
          email: data.user.email,
          role: 'user'
        },
        session: {
          access_token: data.session.access_token,
          refresh_token: data.session.refresh_token,
          expires_in: data.session.expires_in,
          token_type: data.session.token_type,
          user: {
            id: data.user.id,
            email: data.user.email,
            role: 'user'
          }
        },
        message: `${provider} login successful`
      };

    } catch (error) {
      console.error(`OAuth callback service error for ${provider}:`, error);
      return {
        success: false,
        error: 'OAuth authentication service error'
      };
    }
  }

  /**
   * Validate session token
   */
  async validateSession(accessToken: string): Promise<User | null> {
    try {
      const { data: { user }, error } = await supabase.auth.getUser(accessToken);

      if (error || !user) {
        return null;
      }

      return {
        id: user.id,
        email: user.email,
        role: user.user_metadata?.role || user.app_metadata?.role || 'user',
        aud: user.aud,
        // exp: user.exp as ''
        };

    } catch (error) {
      console.error('Session validation error:', error);
      return null;
    }
  }

  /**
   * Get user by ID
   */
  async getUserById(userId: string): Promise<User | null> {
    try {
      const { data, error } = await supabase.auth.admin.getUserById(userId);

      if (error || !data.user) {
        return null;
      }

      return {
        id: data.user.id,
        email: data.user.email,
        role: data.user.user_metadata?.role || data.user.app_metadata?.role || 'user'
      };

    } catch (error) {
      console.error('Get user by ID error:', error);
      return null;
    }
  }

  /**
   * Update user metadata
   */
  async updateUserMetadata(accessToken: string, metadata: any): Promise<AuthResponse> {
    try {
      await supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: ''
      });

      const { data, error } = await supabase.auth.updateUser({
        data: metadata
      });

      if (error) {
        console.error('Update user metadata error:', error);
        return {
          success: false,
          error: 'Failed to update user metadata'
        };
      }

      return {
        success: true,
        user: {
          id: data.user.id,
          email: data.user.email,
          role: data.user.user_metadata?.role || data.user.app_metadata?.role || 'user'
        },
        message: 'User metadata updated successfully'
      };

    } catch (error) {
      console.error('Update user metadata service error:', error);
      return {
        success: false,
        error: 'User metadata update service error'
      };
    }
  }
}