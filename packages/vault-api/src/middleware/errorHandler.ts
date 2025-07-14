import { Request, Response, NextFunction } from 'express';
import { ErrorResponse } from '../types/api';
import {AppError} from "../types/error";


export function createError(message: string, status: number = 500, code?: string, details?: any): AppError {
  const error = new Error(message) as AppError;
  error.status = status;
  error.code = code;
  error.details = details;
  return error;
}

export function errorHandler(err: AppError, req: Request, res: Response, next: NextFunction) {
  // Log the error
  console.error('Error occurred:', {
    message: err.message,
    status: err.status,
    code: err.code,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
    url: req.url,
    method: req.method,
    timestamp: new Date().toISOString()
  });

  // Default error values
  const status = err.status || 500;
  let message = err.message || 'Internal Server Error';
  
  // Handle specific error types
  if (err.message?.includes('GitHub API error')) {
    // GitHub API errors
    if (err.message.includes('404')) {
      message = 'Repository not found or access denied';
    } else if (err.message.includes('rate limit')) {
      message = 'GitHub API rate limit exceeded. Please try again later.';
    } else if (err.message.includes('401') || err.message.includes('403')) {
      message = 'GitHub authentication failed. Check your token.';
    }
  } else if (err.message?.includes('ENOTFOUND') || err.message?.includes('ECONNREFUSED')) {
    // Network errors
    message = 'Service temporarily unavailable. Please try again later.';
  }

  const errorResponse: ErrorResponse = {
    success: false,
    error: message,
    timestamp: new Date().toISOString(),
    ...(err.details && { details: err.details }),
    ...(process.env.NODE_ENV === 'development' && { 
      stack: err.stack,
      originalMessage: err.message 
    })
  };

  res.status(status).json(errorResponse);
}

export function notFoundHandler(req: Request, res: Response) {
  const errorResponse: ErrorResponse = {
    success: false,
    error: 'Not Found',
    timestamp: new Date().toISOString()
  };
  
  res.status(404).json(errorResponse);
}

// Async error wrapper
export function asyncHandler(fn: Function) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}