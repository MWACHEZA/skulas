import jwt from 'jsonwebtoken';
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
    console.error('CRITICAL ERROR: JWT_SECRET not set in environment. Authentication will fail.');
}
import { tenantStorage } from '../lib/prisma';
/**
 * Middleware: Verifies JWT and attaches decoded user to req.user
 * Wraps the request in a tenant context for automatic Prisma isolation
 */
export const requireAuth = (req, res, next) => {
    const authHeader = req.headers.authorization;
    let token = '';
    if (authHeader && authHeader.startsWith('Bearer ')) {
        token = authHeader.split(' ')[1];
    }
    else if (req.query.token) {
        token = req.query.token;
    }
    if (!token) {
        res.status(401).json({ error: 'No token provided' });
        return;
    }
    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.user = decoded;
        // Inject the schoolId into the AsyncLocalStorage store for Prisma Enforcement
        if (decoded?.schoolId) {
            tenantStorage.run({ schoolId: decoded.schoolId }, () => next());
        }
        else {
            next();
        }
    }
    catch {
        res.status(401).json({ error: 'Invalid or expired token' });
    }
};
/**
 * Middleware factory: Checks that req.user has one of the allowed roles
 */
export const requireRole = (...roles) => {
    return (req, res, next) => {
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
    return async (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ error: 'Unauthenticated' });
        }
        const requestedId = req.params[idParam];
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
//# sourceMappingURL=auth.js.map