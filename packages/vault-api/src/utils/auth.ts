import { Request, Response, NextFunction } from 'express';
import { AuthenticatedRequest, getAuthenticatedUser } from '../middleware/auth';
import { hasPermission } from '../config/auth';
import {Permission, User,ErrorResponse} from "../types/";


/**
 * Decorator for protecting routes with authentication
 */
export function Protected(target: any, propertyName: string, descriptor: PropertyDescriptor) {
  const method = descriptor.value;
  
  descriptor.value = function (req: Request, res: Response, next: NextFunction) {
    const user = getAuthenticatedUser(req);
    
    if (!user) {
      const errorResponse: ErrorResponse = {
        success: false,
        error: 'Authentication required',
        timestamp: new Date().toISOString()
      };
      return res.status(401).json(errorResponse);
    }
    
    return method.call(this, req, res, next);
  };
}

/**
 * Decorator for admin-only routes
 */
export function AdminOnly(target: any, propertyName: string, descriptor: PropertyDescriptor) {
  const method = descriptor.value;
  
  descriptor.value = function (req: Request, res: Response, next: NextFunction) {
    const user = getAuthenticatedUser(req);
    
    if (!user) {
      const errorResponse: ErrorResponse = {
        success: false,
        error: 'Authentication required',
        timestamp: new Date().toISOString()
      };
      return res.status(401).json(errorResponse);
    }
    
    if (user.role !== 'admin') {
      const errorResponse: ErrorResponse = {
        success: false,
        error: 'Admin access required',
        timestamp: new Date().toISOString()
      };
      return res.status(403).json(errorResponse);
    }
    
    return method.call(this, req, res, next);
  };
}

/**
 * Middleware factory for permission-based access control
 */
export function requirePermission(permission: Permission, resourceGetter?: (req: Request) => any) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const user = getAuthenticatedUser(req) as User;
    
    if (!user) {
      const errorResponse: ErrorResponse = {
        success: false,
        error: 'Authentication required',
        timestamp: new Date().toISOString()
      };
      res.status(401).json(errorResponse);
      return;
    }
    
    let resource = null;
    if (resourceGetter) {
      try {
        resource = await resourceGetter(req);
      } catch (error) {
        const errorResponse: ErrorResponse = {
          success: false,
          error: 'Resource not found',
          timestamp: new Date().toISOString()
        };
        res.status(404).json(errorResponse);
        return;
      }
    }
    
    if (!hasPermission(user, permission, resource)) {
      const errorResponse: ErrorResponse = {
        success: false,
        error: 'Insufficient permissions',
        timestamp: new Date().toISOString(),
        details: {
          required: `${permission.resource}:${permission.action}`,
          user_role: user.role
        }
      };
      res.status(403).json(errorResponse);
      return;
    }
    
    next();
  };
}

/**
 * Middleware to validate job ownership
 */
export function requireJobOwnership() {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const user = getAuthenticatedUser(req);
    const { jobId } = req.params;
    
    if (!user) {
      const errorResponse: ErrorResponse = {
        success: false,
        error: 'Authentication required',
        timestamp: new Date().toISOString()
      };
      res.status(401).json(errorResponse);
      return;
    }
    
    // Admin can access any job
    if (user.role === 'admin') {
      next();
      return;
    }
    
    try {
      // Import here to avoid circular dependency
      const { dbService } = await import('../services/database');
      const job = await dbService.getScanJob(jobId);
      
      if (!job) {
        const errorResponse: ErrorResponse = {
          success: false,
          error: 'Job not found',
          timestamp: new Date().toISOString()
        };
        res.status(404).json(errorResponse);
        return;
      }
      
      if (job.user_id !== user.id) {
        const errorResponse: ErrorResponse = {
          success: false,
          error: 'Access denied: you do not own this job',
          timestamp: new Date().toISOString()
        };
        res.status(403).json(errorResponse);
        return;
      }
      
      next();
    } catch (error) {
      console.error('Error checking job ownership:', error);
      const errorResponse: ErrorResponse = {
        success: false,
        error: 'Failed to validate job ownership',
        timestamp: new Date().toISOString()
      };
      res.status(500).json(errorResponse);
    }
  };
}

/**
 * Middleware to inject user context into request body/params
 */
export function injectUserContext(req: Request, res: Response, next: NextFunction): void {
  const user = getAuthenticatedUser(req);
  
  if (user) {
    // Add user ID to request for database operations
    req.body.user_id = user.id;
    
    // Add to AuthenticatedRequest for type safety
    (req as AuthenticatedRequest).user = user;
  }
  
  next();
}

/**
 * Rate limiting for authenticated users
 */
export function authRateLimit(windowMs: number, max: number, message?: string) {
  const userLimits = new Map<string, { count: number; resetTime: number }>();
  
  return (req: Request, res: Response, next: NextFunction): void => {
    const user = getAuthenticatedUser(req);
    
    if (!user) {
      // No rate limiting for unauthenticated requests (handled elsewhere)
      next();
      return;
    }
    
    const now = Date.now();
    const userLimit = userLimits.get(user.id);
    
    if (!userLimit || now > userLimit.resetTime) {
      // Reset or initialize limit
      userLimits.set(user.id, {
        count: 1,
        resetTime: now + windowMs
      });
      next();
      return;
    }
    
    if (userLimit.count >= max) {
      const errorResponse: ErrorResponse = {
        success: false,
        error: message || 'Rate limit exceeded',
        timestamp: new Date().toISOString(),
        details: {
          limit: max,
          windowMs,
          resetTime: new Date(userLimit.resetTime).toISOString()
        }
      };
      res.status(429).json(errorResponse);
      return;
    }
    
    userLimit.count++;
    next();
  };
}

/**
 * Middleware to log user actions
 */
export function logUserAction(action: string) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const user = getAuthenticatedUser(req);
    
    if (user) {
      console.log(`👤 User ${user.id} (${user.email || 'no-email'}) performed action: ${action}`);
    }
    
    next();
  };
}

/**
 * Utility to check if user is authenticated in route handlers
 */
export function isAuthenticated(req: Request): boolean {
  return !!getAuthenticatedUser(req);
}

/**
 * Utility to check if user is admin in route handlers
 */
export function isAdmin(req: Request): boolean {
  const user = getAuthenticatedUser(req);
  return user?.role === 'admin';
}

/**
 * Utility to get user ID safely
 */
export function getUserId(req: Request): string | null {
  const user = getAuthenticatedUser(req);
  return user?.id || null;
}