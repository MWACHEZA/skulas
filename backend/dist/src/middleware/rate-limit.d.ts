/**
 * Global API Limiter: General protection for all endpoints
 */
export declare const globalLimiter: import("express-rate-limit").RateLimitRequestHandler;
/**
 * Auth Limiter: Protects login and registration
 */
export declare const authLimiter: import("express-rate-limit").RateLimitRequestHandler;
/**
 * Strict Limiter: For highly sensitive actions like password resets
 */
export declare const strictLimiter: import("express-rate-limit").RateLimitRequestHandler;
/**
 * Upload Limiter: Protects against file-based DDoS/Disk exhaustion
 */
export declare const uploadLimiter: import("express-rate-limit").RateLimitRequestHandler;
