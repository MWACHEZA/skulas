import { Request, Response, NextFunction } from 'express';
import { ZodSchema } from 'zod';
/**
 * Middleware factory: Validates request data against a Zod schema
 * Supports validating body, query, or params
 */
export declare const validate: (schema: ZodSchema) => (req: Request, res: Response, next: NextFunction) => Promise<Response<any, Record<string, any>> | undefined>;
