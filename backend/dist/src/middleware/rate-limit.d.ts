/**
 * Global API Limiter: General protection for API endpoints.
 * Skips static media/avatar fetches and health checks so image loading never exhausts API quota.
 */
export declare const globalLimiter: import("express-rate-limit").RateLimitRequestHandler;
/**
 * Mutation Limiter: Prevents rapid duplicate POST/PUT/PATCH/DELETE submissions
 */
export declare const mutationLimiter: import("express-rate-limit").RateLimitRequestHandler;
/**
 * Auth Limiter: Protects login and registration against brute-force attacks
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
