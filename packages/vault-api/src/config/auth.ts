import { supabase } from './database';
import {User , Permission,ROLE_PERMISSIONS,UserRole} from "../types/auth";
export const AUTH_CONFIG = {
  // JWT settings
  JWT_EXPIRY: '1h',
  REFRESH_TOKEN_EXPIRY: '7d',
  
  // Session settings
  SESSION_TIMEOUT: 60 * 60 * 1000, // 1 hour in milliseconds
  
  // OAuth settings
  OAUTH_PROVIDERS: ['google', 'github'] as const,
  
  // Rate limiting
  AUTH_RATE_LIMIT: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // 5 attempts per window
    message: 'Too many authentication attempts, please try again later'
  },
  
  // Password requirements (if using email/password)
  PASSWORD_REQUIREMENTS: {
    minLength: 8,
    requireUppercase: true,
    requireLowercase: true,
    requireNumbers: true,
    requireSpecialChars: false
  }
} as const;

/**
 * Initialize Supabase auth configuration
 */
export async function initializeAuth(): Promise<void> {
  try {
    // Test Supabase connection
    const { data, error } = await supabase.auth.getSession();
    
    if (error) {
      console.warn('⚠️ Supabase auth initialization warning:', error.message);
    } else {
      console.log('✅ Supabase auth initialized successfully');
    }
  } catch (error) {
    console.error('❌ Failed to initialize Supabase auth:', error);
    throw new Error('Authentication service initialization failed');
  }
}

/**
 * Validate authentication configuration
 */
export function validateAuthConfig(): void {
  const requiredEnvVars = [
    'SUPABASE_URL',
    'SUPABASE_ANON_KEY'
  ];
  
  const missing = requiredEnvVars.filter(varName => !process.env[varName]);
  
  if (missing.length > 0) {
    throw new Error(`Missing required environment variables for auth: ${missing.join(', ')}`);
  }
  
  console.log('✅ Authentication configuration validated');
}

// Export auth-related utilities
export { supabase as authClient };

// Helper function to check if a user has permission
export function hasPermission(user: User, permission: Permission, resource?: any): boolean {
  const userRole = user.role as UserRole || 'user';
  const rolePermissions = ROLE_PERMISSIONS[userRole];
  
  // Admin has all permissions
  if (userRole === 'admin') {
    return true;
  }
  
  // Check if user has the specific permission
  const hasPermission = rolePermissions.some(p => {
    // Check resource and action match
    const resourceMatch = p.resource === '*' || p.resource === permission.resource;
    const actionMatch = p.action === '*' || p.action === permission.action;
    
    if (!resourceMatch || !actionMatch) {
      return false;
    }
    
    // Check condition if present
    if (p.condition && resource) {
      return p.condition(user, resource);
    }
    
    return true;
  });
  
  return hasPermission;
}