import rateLimit from 'express-rate-limit';

/**
 * Global API Limiter: General protection for all endpoints
 */
export const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 1000, // Increased for development
  standardHeaders: true,
  legacyHeaders: false,
  message: 'Too many requests from this IP, please try again after 15 minutes'
});

/**
 * Auth Limiter: Protects login and registration
 */
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10,
  standardHeaders: true,
  message: 'Too many authentication attempts, please try again in 15 minutes'
});

/**
 * Strict Limiter: For highly sensitive actions like password resets
 */
export const strictLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  message: 'Security policy: Too many sensitive requests. Please wait 15 minutes.'
});

/**
 * Upload Limiter: Protects against file-based DDoS/Disk exhaustion
 */
export const uploadLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 50,
  standardHeaders: true,
  message: 'Upload limit reached for this hour.'
});
