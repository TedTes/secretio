// packages/vault-api/src/middleware/auth.ts
import { Request, Response, NextFunction } from 'express';
import { supabase } from '../config/database';
import { createError } from './errorHandler';
import { ErrorResponse } from '../types/api';
import {AuthenticatedRequest} from "../types/auth";

/**
 * Extract JWT token from Authorization header
 */
function extractToken(authHeader?: string): string | null {
  if (!authHeader) return null;
  
  // Support both "Bearer token" and "token" formats
  const parts = authHeader.split(' ');
  if (parts.length === 2 && parts[0] === 'Bearer') {
    return parts[1];
  } else if (parts.length === 1) {
    return parts[0];
  }
  
  return null;
}

/**
 * Core JWT validation middleware
 */
export async function validateJWT(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const token = extractToken(req.headers.authorization);
    
    if (!token) {
      const errorResponse: ErrorResponse = {
        success: false,
        error: 'Authentication required',
        timestamp: new Date().toISOString()
      };
      res.status(401).json(errorResponse);
      return;
    }

    // Validate token with Supabase
    const { data: { user }, error } = await supabase.auth.getUser(token);
    
    if (error || !user) {
      let errorMessage = 'Invalid authentication token';
      let statusCode = 401;
      
      if (error?.message) {
        if (error.message.includes('expired')) {
          errorMessage = 'Authentication token has expired';
        } else if (error.message.includes('invalid')) {
          errorMessage = 'Invalid authentication token';
        } else if (error.message.includes('malformed')) {
          errorMessage = 'Malformed authentication token';
        }
      }
      
      const errorResponse: ErrorResponse = {
        success: false,
        error: errorMessage,
        timestamp: new Date().toISOString()
      };
      
      res.status(statusCode).json(errorResponse);
      return;
    }

    // Create authenticated Supabase client with user context
    const authenticatedSupabase = supabase.auth.setSession({
      access_token: token,
      refresh_token: '', // Not needed for API-only access
    });

    // Add user context to request
    (req as AuthenticatedRequest).user = {
      id: user.id,
      email: user.email,
      role: user.user_metadata?.role || user.app_metadata?.role || 'user',
      aud: user.aud,
    //   exp: user.exp
    };
    
    // Add authenticated Supabase client to request
    (req as AuthenticatedRequest).supabaseClient = supabase;

    next();
  } catch (error) {
    console.error('JWT validation error:', error);
    
    const errorResponse: ErrorResponse = {
      success: false,
      error: 'Authentication service error',
      timestamp: new Date().toISOString()
    };
    
    res.status(500).json(errorResponse);
  }
}

/**
 * Required authentication middleware - throws error if no auth
 */
export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  validateJWT(req, res, next);
}

/**
 * Optional authentication middleware - continues even if no auth
 */
export async function optionalAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
  const token = extractToken(req.headers.authorization);
  
  if (!token) {
    // No token provided, continue without authentication
    next();
    return;
  }
  
  try {
    // Try to authenticate, but don't fail if it doesn't work
    await validateJWT(req, res, () => {
      // Successfully authenticated
      next();
    });
  } catch (error) {
    // Authentication failed, but continue anyway
    console.warn('Optional authentication failed:', error);
    next();
  }
}

/**
 * Role-based authorization middleware
 */
export function requireRole(roles: string | string[]) {
  const allowedRoles = Array.isArray(roles) ? roles : [roles];
  
  return (req: Request, res: Response, next: NextFunction): void => {
    const authReq = req as AuthenticatedRequest;
    
    if (!authReq.user) {
      const errorResponse: ErrorResponse = {
        success: false,
        error: 'Authentication required',
        timestamp: new Date().toISOString()
      };
      res.status(401).json(errorResponse);
      return;
    }
    
    const userRole = authReq.user.role || 'user';
    
    if (!allowedRoles.includes(userRole)) {
      const errorResponse: ErrorResponse = {
        success: false,
        error: 'Insufficient permissions',
        timestamp: new Date().toISOString(),
        details: {
          message: allowedRoles,
          current: userRole
        }
      };
      res.status(403).json(errorResponse);
      return;
    }
    
    next();
  };
}

/**
 * Resource ownership validation middleware
 */
export function requireOwnership(resourceKey: string = 'user_id') {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const authReq = req as AuthenticatedRequest;
    
    if (!authReq.user) {
      const errorResponse: ErrorResponse = {
        success: false,
        error: 'Authentication required',
        timestamp: new Date().toISOString()
      };
      res.status(401).json(errorResponse);
      return;
    }
    
    // Get resource user ID from params, body, or query
    const resourceUserId = req.params[resourceKey] || 
                          req.body[resourceKey] || 
                          req.query[resourceKey];
    
    if (!resourceUserId) {
      const errorResponse: ErrorResponse = {
        success: false,
        error: 'Resource user ID not found',
        timestamp: new Date().toISOString()
      };
      res.status(400).json(errorResponse);
      return;
    }
    
    // Admin users can access any resource
    if (authReq.user.role === 'admin') {
      next();
      return;
    }
    
    // Check if user owns the resource
    if (authReq.user.id !== resourceUserId) {
      const errorResponse: ErrorResponse = {
        success: false,
        error: 'Access denied: insufficient permissions for this resource',
        timestamp: new Date().toISOString()
      };
      res.status(403).json(errorResponse);
      return;
    }
    
    next();
  };
}

/**
 * Admin-only middleware
 */
export const requireAdmin = requireRole('admin');

/**
 * Utility function to get authenticated user from request
 */
export function getAuthenticatedUser(req: Request): AuthenticatedRequest['user'] | null {
  const authReq = req as AuthenticatedRequest;
  return authReq.user || null;
}

/**
 * Utility function to get authenticated Supabase client from request
 */
export function getAuthenticatedSupabase(req: Request): typeof supabase {
  const authReq = req as AuthenticatedRequest;
  return authReq.supabaseClient || supabase;
}