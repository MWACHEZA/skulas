import rateLimit from 'express-rate-limit';
import { Request } from 'express';

/**
 * Helper to identify client by IP + short token fingerprint so users on shared school Wi-Fi/NAT
 * do not exhaust each other's rate limits.
 */
const getClientKey = (req: Request): string => {
  const ip = req.ip || req.socket.remoteAddress || 'unknown';
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ') && authHeader.length > 24) {
    return `${ip}:${authHeader.slice(-16)}`;
  }
  return ip;
};

/**
 * Global API Limiter: General protection for API endpoints.
 * Skips static media/avatar fetches and health checks so image loading never exhausts API quota.
 */
export const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: process.env.NODE_ENV === 'production' ? 800 : 2500,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: getClientKey,
  validate: { keyGeneratorIpFallback: false },
  skip: (req) => {
    const p = req.path || req.originalUrl || '';
    return (
      req.method === 'OPTIONS' ||
      p.startsWith('/api/storage/media') ||
      p.startsWith('/api/storage/public') ||
      p === '/api/health'
    );
  },
  message: {
    error: 'Too many requests from this client. Please wait a moment and try again.'
  }
});

/**
 * Mutation Limiter: Prevents rapid duplicate POST/PUT/PATCH/DELETE submissions
 */
export const mutationLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute window
  max: process.env.NODE_ENV === 'production' ? 90 : 300,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: getClientKey,
  skip: (req) => ['GET', 'HEAD', 'OPTIONS'].includes(req.method.toUpperCase()),
  message: {
    error: 'Too many write actions in a short period. Please slow down and try again.'
  }
});

/**
 * Auth Limiter: Protects login and registration against brute-force attacks
 */
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: process.env.NODE_ENV === 'production' ? 60 : 500,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: 'Too many authentication attempts, please try again in 15 minutes.'
  }
});

/**
 * Strict Limiter: For highly sensitive actions like password resets
 */
export const strictLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: process.env.NODE_ENV === 'production' ? 20 : 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: 'Security policy: Too many sensitive requests. Please wait 15 minutes.'
  }
});

/**
 * Upload Limiter: Protects against file-based DDoS/Disk exhaustion
 */
export const uploadLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: process.env.NODE_ENV === 'production' ? 80 : 300,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: getClientKey,
  message: {
    error: 'Upload limit reached for this hour. Please try again later.'
  }
});
