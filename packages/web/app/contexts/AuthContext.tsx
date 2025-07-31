'use client'

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { apiClient } from '../lib/api';
import { User, AuthSession, LoginRequest, RegisterRequest } from '../lib/types';

interface AuthContextType {
  user: User | null;
  session: AuthSession | null;
  isLoading: boolean;
  isLoggingOut:boolean;
  isAuthenticated: boolean;
  login: (credentials: LoginRequest) => Promise<void>;
  register: (userData: RegisterRequest) => Promise<void>;
  logout: () => Promise<void>;
  loginWithOAuth: (provider: 'google' | 'github') => Promise<void>;
  refreshToken: () => Promise<void>;
  error: string | null;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<AuthSession | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isAuthenticated = !!user && !!session;

  const clearError = () => setError(null);

  // Initialize auth state on mount
  useEffect(() => {
    initializeAuth();
  },[]);

  // Set up automatic token refresh
  useEffect(() => {
    if (session?.expires_in) {
      const refreshTime = (session.expires_in - 300) * 1000; // Refresh 5 minutes before expiry
      const timer = setTimeout(() => {
        refreshToken();
      }, refreshTime);

      return () => clearTimeout(timer);
    }
  }, [session]);

  const initializeAuth = async () => {
    try {
      setIsLoading(true);
      
      const token = apiClient.getToken();
      if (!token) {
        setIsLoading(false);
        return;
      }

      // Validate existing session
      const sessionData = await apiClient.validateSession();
      if (sessionData?.valid && sessionData.user) {
        setUser(sessionData.user);
        setSession({
          access_token: token,
          user: sessionData.user,
        } as AuthSession);
      } else {
        // Token is invalid, try to refresh
        try {
          await refreshToken();
        } catch {
          // Refresh failed, clear auth state
          await logout();
        }
      }
    } catch (error) {
      console.error('Auth initialization failed:', error);
      await logout();
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (credentials: LoginRequest) => {
    try {
      setIsLoading(true);
      setError(null);
      
      const response = await apiClient.login(credentials);
      
      if (response.success && response.user && response.session) {
        setUser(response.user);
        setSession(response.session);
        
        // Store refresh token if provided
        if (response.session.refresh_token) {
          localStorage.setItem('refresh_token', response.session.refresh_token);
        }
      } else {
        throw new Error(response.error || 'Login failed');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Login failed';
      setError(errorMessage);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (userData: RegisterRequest) => {
    try {
      setIsLoading(true);
      setError(null);
      
      const response = await apiClient.register(userData);
      
      if (response.success && response.user && response.session) {
        setUser(response.user);
        setSession(response.session);
        
        // Store refresh token if provided
        if (response.session.refresh_token) {
          localStorage.setItem('refresh_token', response.session.refresh_token);
        }
      } else {
        throw new Error(response.error || 'Registration failed');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Registration failed';
      setError(errorMessage);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    try {
      setIsLoading(true);
      setIsLoggingOut(true);
      // Call logout endpoint
      await apiClient.logout();
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      // Clear local state regardless of API call success
      setUser(null);
      setSession(null);
      setError(null);
      
      // Clear stored tokens
      localStorage.removeItem('refresh_token');
      localStorage.removeItem('access_token');
      localStorage.removeItem('auth_token');
      
      setIsLoading(false);

      if (typeof window !== 'undefined') {
        window.location.href = '/login';
      }
    }
  };

  const loginWithOAuth = async (provider: 'google' | 'github') => {
    try {
      setIsLoading(true);
      setError(null);
      
      const { url } = await apiClient.getOAuthUrl(provider);
      
      // Redirect to OAuth provider
      window.location.href = url;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : `${provider} login failed`;
      setError(errorMessage);
      setIsLoading(false);
      throw error;
    }
  };

  const refreshToken = async () => {
    try {
      const response = await apiClient.refreshToken();
      
      if (response.success && response.user && response.session) {
        setUser(response.user);
        setSession(response.session);
        
        // Update stored refresh token if provided
        if (response.session.refresh_token) {
          localStorage.setItem('refresh_token', response.session.refresh_token);
        }
      } else {
        throw new Error('Token refresh failed');
      }
    } catch (error) {
      console.error('Token refresh failed:', error);
      await logout();
      throw error;
    }
  };

  const value: AuthContextType = {
    user,
    session,
    isLoading,
    isLoggingOut,
    isAuthenticated,
    login,
    register,
    logout,
    loginWithOAuth,
    refreshToken,
    error,
    clearError,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

// Custom hook to use auth context
export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

// Custom hook for authenticated user data
export function useUser() {
  const { user, isAuthenticated, isLoading } = useAuth();
  return { user, isAuthenticated, isLoading };
}

// Higher-order component for protected routes
export function withAuth<P extends object>(Component: React.ComponentType<P>) {
  return function AuthenticatedComponent(props: P) {
    const { isAuthenticated, isLoading } = useAuth();
    
    if (isLoading) {
      return (
        <div className="min-h-screen bg-slate-900 flex items-center justify-center">
          <div className="text-white">Loading...</div>
        </div>
      );
    }
    
    if (!isAuthenticated) {
      return (
        <div className="min-h-screen bg-slate-900 flex items-center justify-center">
          <div className="text-white">Please log in to access this page.</div>
        </div>
      );
    }
    
    return <Component {...props} />;
  };
}