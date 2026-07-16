import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import prisma from '../lib/prisma';

const JWT_SECRET = process.env.JWT_SECRET as string;

if (!JWT_SECRET) {
  console.error('CRITICAL ERROR: JWT_SECRET not set in environment. Authentication will fail.');
}

export interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
    name: string;
    role: string;
    schoolId?: string;
    schoolCode?: string;
    secondaryRoles: string[];
    staffId?: string;
    studentId?: string;
    sessionId?: string;
  };
  uploadCategoryPath?: string;
}

import { tenantStorage } from '../lib/prisma';

/**
 * Middleware: Verifies JWT and attaches decoded user to req.user
 * Wraps the request in a tenant context for automatic Prisma isolation
 */
export const requireAuth = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  const authHeader = req.headers.authorization;
  let token = '';

  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.split(' ')[1];
  } else if (req.query.token) {
    token = req.query.token as string;
  }

  if (!token) {
    res.status(401).json({ error: 'No token provided' });
    return;
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as AuthRequest['user'] & { iat?: number; isImpersonated?: boolean; impersonatorId?: string };
    
    const user = await prisma.user.findFirst({
      where: { id: decoded.id },
      select: { 
        isLocked: true, 
        passwordLastChanged: true,
        school: { select: { status: true } }
      }
    });

    if (!user) {
      res.status(401).json({ error: 'User no longer exists' });
      return;
    }
    if (user.isLocked) {
      res.status(401).json({ error: 'Account is locked' });
      return;
    }
    if (user.school?.status === 'suspended') {
      res.status(403).json({ error: 'Your school account has been suspended. Please contact support.' });
      return;
    }
    if (user.school?.status === 'deleted') {
      res.status(403).json({ error: 'Your school account has been deleted.' });
      return;
    }
    if (decoded.iat && user.passwordLastChanged) {
      const iatDate = new Date(decoded.iat * 1000);
      // Add a small buffer (5 seconds) to handle timestamp precision issues
      if (iatDate.getTime() < user.passwordLastChanged.getTime() - 5000) {
        res.status(401).json({ error: 'Token expired due to password change' });
        return;
      }
    }
    
    if (!decoded.isImpersonated && decoded.sessionId) {
      const session = await prisma.userSession.findFirst({
        where: { id: decoded.sessionId }
      });
      if (!session || !session.isValid) {
        res.status(401).json({ error: 'Session revoked or invalid' });
        return;
      }
      // Update last active periodically
      if (Date.now() - session.lastActiveAt.getTime() > 5 * 60 * 1000) {
         prisma.userSession.update({ where: { id: session.id }, data: { lastActiveAt: new Date() } }).catch(e => console.error(e));
      }
    }

    req.user = decoded;
    
    // Inject the schoolId into the AsyncLocalStorage store for Prisma Enforcement
    if (decoded?.schoolId) {
        tenantStorage.run({ schoolId: decoded.schoolId }, () => next());
    } else {
        next();
    }
  } catch (error) {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
};

/**
 * Middleware factory: Checks that req.user has one of the allowed roles
 */
export const requireRole = (...roles: string[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: 'Unauthenticated' });
      return;
    }
    if (!roles.includes(req.user.role)) {
      res.status(403).json({ error: `Access denied. Required role: ${roles.join(' or ')}` });
      return;
    }
    next();
  };
};

import { logSecurityViolation } from '../lib/security-logger';

/**
 * Middleware factory: Ensures the logged-in user owns the resource or is an Admin
 * Checks that req.user.id matches req.params[idParam]
 */
export const requireOwnership = (idParam = 'id') => {
  return async (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthenticated' });
    }

    const requestedId = req.params[idParam] as string;
    const userRole = req.user.role;

    // Admins and SuperAdmins can bypass ownership checks
    if (userRole === 'SCHOOL_ADMIN' || userRole === 'SUPER_ADMIN') {
      return next();
    }

    // Check if the IDs match
    if (requestedId !== req.user.id) {
       await logSecurityViolation({
         userId: req.user.id,
         targetId: requestedId,
         resource: 'USER_PROFILE',
         action: 'READ/WRITE',
         schoolId: req.user.schoolId || 'GLOBAL',
         reason: 'Attempted to access restricted record without ownership rights.'
       });
       return res.status(403).json({ error: 'Access denied: You do not own this record' });
    }

    next();
  };
};
