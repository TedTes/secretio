
import { Request } from 'express';
export interface ValidatedRequest<T = any> extends Request {
    validatedBody: T;
    validatedQuery: any;
    validatedParams: any;
  }