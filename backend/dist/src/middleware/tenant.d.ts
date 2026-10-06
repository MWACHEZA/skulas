import { Request, Response, NextFunction } from 'express';
import { AuthRequest } from './auth';
export interface TenantRequest extends Request {
    tenantId?: string;
    tenantCode?: string;
    user?: any;
}
/**
 * Extract tenant subdomain from Host or hostname.
 * Handles *.eduportal.co.zw, *.skulas.co.zw, *.localhost, etc.
 */
export declare const extractSubdomain: (hostname?: string) => string | null;
/**
 * Extracts school/tenant context from Host subdomain, headers, or URL parameters.
 * For authenticated requests, JWT user school is authoritative.
 */
export declare const tenantContext: (req: TenantRequest, res: Response, next: NextFunction) => void;
/**
 * Strict Tenant Boundary Enforcement Guard.
 * Rejects any request where a non-SUPER_ADMIN client attempts to query,
 * manipulate, or access data belonging to a different schoolId/schoolCode.
 */
export declare const enforceTenantIsolation: (req: AuthRequest, res: Response, next: NextFunction) => void;
