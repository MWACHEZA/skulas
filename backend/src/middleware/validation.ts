import { Request, Response, NextFunction } from 'express';
import { ZodSchema, ZodError } from 'zod';

/**
 * Middleware factory: Validates request data against a Zod schema
 * Supports validating body, query, or params
 */
export const validate = (schema: ZodSchema) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      await schema.parseAsync({
        body: req.body,
        query: req.query,
        params: req.params,
      });
      next();
    } catch (error: any) {
      // Handle ZodError — use name check in case of multiple zod instances
      const isZodError = error instanceof ZodError || error?.name === 'ZodError' || Array.isArray(error?.errors) || Array.isArray(error?.issues);
      const zodIssues = error.issues || error.errors;
      if (isZodError && zodIssues) {
        const failures = zodIssues.map((err: any) => ({
          field: err.path?.join('.') ?? '',
          message: err.message,
        }));
        console.warn(`[Validation Error] ${req.method} ${req.path}:`, JSON.stringify(failures));
        return res.status(400).json({ error: failures[0]?.message || 'Validation failed', details: failures });
      }
      // Unknown error — log and return 500
      console.error(`[Validation Middleware Error] ${req.method} ${req.path}:`, error?.message ?? error);
      return res.status(500).json({ error: 'Internal server error during validation' });
    }
  };
};
