import { Request, Response, NextFunction } from 'express';
export interface TenantRequest extends Request {
    tenantId?: string;
    tenantCode?: string;
}
/**
 * Extracts school/tenant context from headers or URL parameters.
 * Ensures that requests are scoped to the correct school.
 */
export declare const tenantContext: (req: TenantRequest, res: Response, next: NextFunction) => void;
