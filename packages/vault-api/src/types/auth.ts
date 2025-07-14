import { supabase } from '../config/database';
import { Request } from 'express';
export interface User {
    id: string;
    email?: string;
    role?: string;
    aud?: string;
    exp?: number | string;
    created_at?: string;
    updated_at?: string;
    user_metadata?:any
  }
  
  export interface AuthSession {
    access_token: string;
    refresh_token?: string;
    expires_in?: number;
    token_type?: string;
    user: User;
  }
  
  export interface LoginRequest {
    email: string;
    password: string;
  }
  
  export interface RegisterRequest {
    email: string;
    password: string;
    github_username?: string;
  }
  
  export interface RefreshTokenRequest {
    refresh_token: string;
  }
  
  export interface AuthResponse {
    success: boolean;
    user?: User;
    session?: AuthSession;
    message?: string;
    error?: string;
  }
  
  export interface OAuthProvider {
    provider: 'google' | 'github';
    redirect_url?: string;
  }
  
  // Role definitions
  export type UserRole = 'user' | 'admin';

  export const ROLES = {
    USER: 'user' as UserRole,
    ADMIN: 'admin' as UserRole
  } as const;
  
  // Permission definitions
  export interface Permission {
    resource: string;
    action: string;
    condition?: (user: User, resource: any) => boolean;
  }
  
  export const PERMISSIONS = {
    // Scan permissions
    SCAN_CREATE: { resource: 'scan', action: 'create' },
    SCAN_READ: { resource: 'scan', action: 'read' },
    SCAN_READ_OWN: { 
      resource: 'scan', 
      action: 'read', 
      condition: (user: User, scan: any) => scan.user_id === user.id 
    },
    
    // Job permissions
    JOB_READ: { resource: 'job', action: 'read' },
    JOB_READ_OWN: { 
      resource: 'job', 
      action: 'read', 
      condition: (user: User, job: any) => job.user_id === user.id 
    },
    JOB_CANCEL_OWN: { 
      resource: 'job', 
      action: 'cancel', 
      condition: (user: User, job: any) => job.user_id === user.id 
    },
    
    // User permissions
    USER_READ_OWN: { 
      resource: 'user', 
      action: 'read', 
      condition: (user: User, targetUser: any) => targetUser.id === user.id 
    },
    USER_UPDATE_OWN: { 
      resource: 'user', 
      action: 'update', 
      condition: (user: User, targetUser: any) => targetUser.id === user.id 
    },
    
    // Admin permissions
    ADMIN_ALL: { resource: '*', action: '*' }
  } as const;
  
  // Role-permission mapping
  export const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
    user: [
      PERMISSIONS.SCAN_CREATE,
      PERMISSIONS.SCAN_READ_OWN,
      PERMISSIONS.JOB_READ_OWN,
      PERMISSIONS.JOB_CANCEL_OWN,
      PERMISSIONS.USER_READ_OWN,
      PERMISSIONS.USER_UPDATE_OWN
    ],
    admin: [
      PERMISSIONS.ADMIN_ALL
    ]
  };

  export interface ChangePasswordRequest {
    current_password: string;
    new_password: string;
  }

  // Extend Request interface to include user context
export interface AuthenticatedRequest extends Request {
  user: {
    id: string;
    email?: string;
    role?: string;
    aud?: string;
    exp?: string;
  };
  supabaseClient: typeof supabase;
}