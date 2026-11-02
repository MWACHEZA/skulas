"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireOwnership = exports.requireRole = exports.requireAuth = exports.invalidateAuthCache = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const prisma_1 = __importDefault(require("../lib/prisma"));
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
    console.error('CRITICAL ERROR: JWT_SECRET not set in environment. Authentication will fail.');
}
const authVerificationCache = new Map();
const AUTH_CACHE_TTL_MS = 30 * 1000;
const invalidateAuthCache = (userId) => {
    if (!userId) {
        authVerificationCache.clear();
        return;
    }
    for (const key of authVerificationCache.keys()) {
        if (key.startsWith(`${userId}:`)) {
            authVerificationCache.delete(key);
        }
    }
};
exports.invalidateAuthCache = invalidateAuthCache;
const prisma_2 = require("../lib/prisma");
/**
 * Middleware: Verifies JWT and attaches decoded user to req.user
 * Wraps the request in a tenant context for automatic Prisma isolation
 */
const requireAuth = async (req, res, next) => {
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
        const decoded = jsonwebtoken_1.default.verify(token, JWT_SECRET);
        const cacheKey = `${decoded.id}:${decoded.sessionId || 'nosess'}`;
        const now = Date.now();
        let cached = authVerificationCache.get(cacheKey);
        if (!cached || now - cached.cachedAt > AUTH_CACHE_TTL_MS) {
            const [user, session] = await Promise.all([
                prisma_1.default.user.findFirst({
                    where: { id: decoded.id },
                    select: {
                        isLocked: true,
                        passwordLastChanged: true,
                        secondaryRoles: true,
                        school: { select: { status: true } }
                    }
                }),
                !decoded.isImpersonated && decoded.sessionId
                    ? prisma_1.default.userSession.findFirst({ where: { id: decoded.sessionId } })
                    : Promise.resolve(null)
            ]);
            if (!user) {
                authVerificationCache.delete(cacheKey);
                res.status(401).json({ error: 'User no longer exists' });
                return;
            }
            const sessionValid = decoded.isImpersonated || !decoded.sessionId
                ? true
                : Boolean(session && session.isValid);
            if (session && session.isValid && now - session.lastActiveAt.getTime() > 5 * 60 * 1000) {
                prisma_1.default.userSession.update({ where: { id: session.id }, data: { lastActiveAt: new Date() } }).catch(() => { });
            }
            cached = {
                isLocked: Boolean(user.isLocked),
                passwordLastChangedMs: user.passwordLastChanged ? user.passwordLastChanged.getTime() : 0,
                schoolStatus: user.school?.status,
                secondaryRoles: user.secondaryRoles || [],
                sessionValid,
                cachedAt: now
            };
            authVerificationCache.set(cacheKey, cached);
        }
        if (cached.isLocked) {
            res.status(401).json({ error: 'Account is locked' });
            return;
        }
        if (cached.schoolStatus === 'suspended') {
            res.status(403).json({ error: 'Your school account has been suspended. Please contact support.' });
            return;
        }
        if (cached.schoolStatus === 'deleted') {
            res.status(403).json({ error: 'Your school account has been deleted.' });
            return;
        }
        if (decoded.iat && cached.passwordLastChangedMs) {
            const iatMs = decoded.iat * 1000;
            if (iatMs < cached.passwordLastChangedMs - 5000) {
                res.status(401).json({ error: 'Token expired due to password change' });
                return;
            }
        }
        if (!cached.sessionValid) {
            res.status(401).json({ error: 'Session revoked or invalid' });
            return;
        }
        const userSecRoles = (decoded.secondaryRoles && decoded.secondaryRoles.length > 0)
            ? decoded.secondaryRoles
            : (cached.secondaryRoles || []);
        req.user = {
            ...decoded,
            secondaryRoles: userSecRoles
        };
        // Inject the schoolId into the AsyncLocalStorage store for Prisma Enforcement
        if (decoded?.schoolId) {
            prisma_2.tenantStorage.run({ schoolId: decoded.schoolId }, () => next());
        }
        else {
            next();
        }
    }
    catch (error) {
        res.status(401).json({ error: 'Invalid or expired token' });
    }
};
exports.requireAuth = requireAuth;
/**
 * Middleware factory: Checks that req.user has one of the allowed roles
 */
const requireRole = (...roles) => {
    return (req, res, next) => {
        if (!req.user) {
            res.status(401).json({ error: 'Unauthenticated' });
            return;
        }
        const normalize = (s) => (s || '').toLowerCase().replace(/[\s_-]+/g, '');
        const normRoles = roles.map(normalize);
        const hasRole = normRoles.includes(normalize(req.user.role));
        const userSecRoles = Array.isArray(req.user.secondaryRoles) ? req.user.secondaryRoles : [];
        const hasSecondaryRole = userSecRoles.some(r => normRoles.includes(normalize(r)) ||
            (normalize(r) === 'studentlibrarian' && normRoles.includes('librarian')));
        if (!hasRole && !hasSecondaryRole) {
            res.status(403).json({ error: `Access denied. Required role: ${roles.join(' or ')}` });
            return;
        }
        next();
    };
};
exports.requireRole = requireRole;
const security_logger_1 = require("../lib/security-logger");
/**
 * Middleware factory: Ensures the logged-in user owns the resource or is an Admin
 * Checks that req.user.id matches req.params[idParam]
 */
const requireOwnership = (idParam = 'id') => {
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
            await (0, security_logger_1.logSecurityViolation)({
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
exports.requireOwnership = requireOwnership;
