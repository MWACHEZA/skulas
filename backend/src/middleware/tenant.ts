import { Request, Response, NextFunction } from 'express';
import { AuthRequest } from './auth';
import { logSecurityViolation } from '../lib/security-logger';

export interface TenantRequest extends Request {
  tenantId?: string;
  tenantCode?: string;
  user?: any;
}

/**
 * Extract tenant subdomain from Host or hostname.
 * Handles *.eduportal.co.zw, *.skulas.co.zw, *.localhost, etc.
 */
export const extractSubdomain = (hostname?: string): string | null => {
  if (!hostname) return null;
  const host = hostname.split(':')[0].toLowerCase().trim();
  if (!host || /^(\d{1,3}\.){3}\d{1,3}$/.test(host)) return null;

  if (host.endsWith('.localhost')) {
    const sub = host.replace('.localhost', '');
    return sub && sub !== 'www' ? sub : null;
  }

  const parts = host.split('.');
  if (parts.length >= 3) {
    const reserved = new Set(['www', 'api', 'app', 'admin', 'portal', 'mail', 'staging', 'dev', 'acadex', 'cdn']);
    const candidate = parts[0].toLowerCase();
    if (!reserved.has(candidate)) {
      return candidate;
    }
  }

  return null;
};

/**
 * Extracts school/tenant context from Host subdomain, headers, or URL parameters.
 * For authenticated requests, JWT user school is authoritative.
 */
export const tenantContext = (req: TenantRequest, res: Response, next: NextFunction) => {
  const hostHeader = (req.headers['x-forwarded-host'] as string) || req.headers.host || req.hostname;
  const subdomain = extractSubdomain(hostHeader);
  const tenantCode = (req.headers['x-school-code'] as string) || (req.query.schoolCode as string) || subdomain;

  if (tenantCode) {
    req.tenantCode = tenantCode.toUpperCase();
  }

  if (req.user?.schoolId) {
    req.tenantId = req.user.schoolId;
    if (req.user.schoolCode) {
      req.tenantCode = req.user.schoolCode.toUpperCase();
    }
  }

  next();
};

/**
 * Strict Tenant Boundary Enforcement Guard.
 * Rejects any request where a non-SUPER_ADMIN client attempts to query,
 * manipulate, or access data belonging to a different schoolId/schoolCode.
 */
export const enforceTenantIsolation = (req: AuthRequest, res: Response, next: NextFunction): void => {
  if (!req.user || req.user.role === 'SUPER_ADMIN') {
    return next();
  }

  const userSchoolId = req.user.schoolId;
  const userSchoolCode = req.user.schoolCode?.toUpperCase();

  // Inspect query, body, and params for conflicting tenant identifiers
  const targetSchoolId = (req.params?.schoolId || req.query.schoolId || req.body?.schoolId) as string | undefined;
  const targetSchoolCode = (req.params?.schoolCode || req.query.schoolCode || req.body?.schoolCode || req.headers['x-school-code']) as string | undefined;

  if (targetSchoolId && userSchoolId && targetSchoolId !== userSchoolId) {
    logSecurityViolation({
      userId: req.user.id,
      targetId: targetSchoolId,
      resource: req.originalUrl,
      action: req.method,
      schoolId: userSchoolId,
      reason: `Cross-tenant violation: attempted to access schoolId '${targetSchoolId}' while bound to '${userSchoolId}'`,
      ipAddress: req.ip
    });
    res.status(403).json({ error: 'Access denied: Cross-tenant boundary violation' });
    return;
  }

  if (targetSchoolCode && userSchoolCode && targetSchoolCode.toUpperCase() !== userSchoolCode && targetSchoolCode.toUpperCase() !== 'GLOBAL') {
    logSecurityViolation({
      userId: req.user.id,
      targetId: targetSchoolCode,
      resource: req.originalUrl,
      action: req.method,
      schoolId: userSchoolId || 'unknown',
      reason: `Cross-tenant violation: attempted to access schoolCode '${targetSchoolCode}' while bound to '${userSchoolCode}'`,
      ipAddress: req.ip
    });
    res.status(403).json({ error: 'Access denied: Cross-tenant boundary violation' });
    return;
  }

  next();
};

