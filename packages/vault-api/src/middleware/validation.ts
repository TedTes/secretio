import { Request, Response, NextFunction } from 'express';
import Joi from 'joi';
import { ValidationError, ErrorResponse } from '../types/api';

export interface ValidatedRequest<T = any> extends Request {
  validatedBody: T;
  validatedQuery: any;
  validatedParams: any;
}

export function validateBody<T>(schema: Joi.ObjectSchema) {
  return (req: Request, res: Response, next: NextFunction) => {
    const { error, value } = schema.validate(req.body, {
      abortEarly: false,
      stripUnknown: true,
      convert: true
    });

    if (error) {
      const validationErrors: ValidationError[] = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message,
        value: detail.context?.value
      }));

      const errorResponse: ErrorResponse = {
        success: false,
        error: 'Validation Error',
        details: validationErrors,
        timestamp: new Date().toISOString()
      };

      return res.status(400).json(errorResponse);
    }

    (req as ValidatedRequest).validatedBody = value;
    next();
  };
}

export function validateQuery(schema: Joi.ObjectSchema) {
  return (req: Request, res: Response, next: NextFunction) => {
    const { error, value } = schema.validate(req.query, {
      abortEarly: false,
      stripUnknown: true,
      convert: true
    });

    if (error) {
      const validationErrors: ValidationError[] = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message,
        value: detail.context?.value
      }));

      const errorResponse: ErrorResponse = {
        success: false,
        error: 'Query Validation Error',
        details: validationErrors,
        timestamp: new Date().toISOString()
      };

      return res.status(400).json(errorResponse);
    }

    (req as ValidatedRequest).validatedQuery = value;
    next();
  };
}

export function validateParams(schema: Joi.ObjectSchema) {
  return (req: Request, res: Response, next: NextFunction) => {
    const { error, value } = schema.validate(req.params, {
      abortEarly: false,
      stripUnknown: true,
      convert: true
    });

    if (error) {
      const validationErrors: ValidationError[] = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message,
        value: detail.context?.value
      }));

      const errorResponse: ErrorResponse = {
        success: false,
        error: 'Parameter Validation Error',
        details: validationErrors,
        timestamp: new Date().toISOString()
      };

      return res.status(400).json(errorResponse);
    }

    (req as ValidatedRequest).validatedParams = value;
    next();
  };
}