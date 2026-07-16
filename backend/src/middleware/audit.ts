import { Request, Response, NextFunction } from 'express';
import prisma from '../lib/prisma';

interface AuthRequest extends Request {
  user?: { id: string; schoolId?: string | null; role?: string };
}

/**
 * Global Audit Middleware
 * Automatically logs all mutating API requests (POST/PUT/PATCH/DELETE) 
 * for authenticated users to the AuditLog table.
 * Non-blocking - logs fire-and-forget after response.
 */
export const auditMiddleware = (req: AuthRequest, res: Response, next: NextFunction) => {
  // Only log mutating methods
  const MUTATING_METHODS = ['POST', 'PUT', 'PATCH', 'DELETE'];
  if (!MUTATING_METHODS.includes(req.method)) return next();

  // Only log authenticated requests with a schoolId
  const originalSend = res.json.bind(res);
  res.json = function (body: any) {
    // After response is sent, log the action
    setImmediate(async () => {
      try {
        const user = (req as AuthRequest).user;
        if (!user?.id || !user?.schoolId) return;

        // Skip auth routes and audit routes to avoid noise
        if (req.path.includes('/auth/login') || req.path.includes('/audit')) return;

        // Derive entity info from path
        const pathParts = req.path.replace(/^\//, '').split('/').filter(Boolean);
        const entityType = pathParts[0] ? pathParts[0].replace(/-/g, '_').toUpperCase() : 'UNKNOWN';
        const entityId = pathParts[1] || (body?.id ?? body?.data?.id ?? 'unknown');
        
        // Map HTTP method to action verb
        const actionMap: Record<string, string> = {
          'POST': 'CREATE',
          'PUT': 'UPDATE',
          'PATCH': 'UPDATE',
          'DELETE': 'DELETE',
        };
        const action = `${actionMap[req.method]}_${entityType}`;

        await prisma.auditLog.create({
          data: {
            actorId: user.id,
            schoolId: user.schoolId!,
            action,
            entityType,
            entityId: String(entityId).slice(0, 100),
            details: {
              method: req.method,
              path: req.path,
              statusCode: res.statusCode,
              summary: `${req.method} ${req.path}`,
            } as any,
            ipAddress: req.ip,
          },
        });
      } catch (err) {
        // Silently fail - audit logging should never break the API
      }
    });

    return originalSend(body);
  };

  next();
};
