import { Request, Response, NextFunction } from 'express';

export interface TenantRequest extends Request {
  tenantId?: string;
  tenantCode?: string;
}

/**
 * Extracts school/tenant context from headers or URL parameters.
 * Ensures that requests are scoped to the correct school.
 */
export const tenantContext = (req: TenantRequest, res: Response, next: NextFunction) => {
  const tenantCode = req.headers['x-school-code'] as string || req.query.schoolCode as string;

  if (tenantCode) {
    req.tenantCode = tenantCode.toUpperCase();
  }

  // If user is logged in, their schoolId is naturally scoped from their JWT
  // But for public requests (news, etc.), we use the code.

  next();
};
