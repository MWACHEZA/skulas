"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.uploadLimiter = exports.strictLimiter = exports.authLimiter = exports.mutationLimiter = exports.globalLimiter = void 0;
const express_rate_limit_1 = __importStar(require("express-rate-limit"));
/**
 * Helper to identify client by IP + short token fingerprint so users on shared school Wi-Fi/NAT
 * do not exhaust each other's rate limits.
 */
const getClientKey = (req) => {
    const ip = (0, express_rate_limit_1.ipKeyGenerator)(req.ip || req.socket.remoteAddress || 'unknown');
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
exports.globalLimiter = (0, express_rate_limit_1.default)({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: process.env.NODE_ENV === 'production' ? 800 : 2500,
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: getClientKey,
    validate: { keyGeneratorIpFallback: false },
    skip: (req) => {
        const p = req.path || req.originalUrl || '';
        return (req.method === 'OPTIONS' ||
            p.startsWith('/api/storage/media') ||
            p.startsWith('/api/storage/public') ||
            p === '/api/health');
    },
    message: {
        error: 'Too many requests from this client. Please wait a moment and try again.'
    }
});
/**
 * Mutation Limiter: Prevents rapid duplicate POST/PUT/PATCH/DELETE submissions
 */
exports.mutationLimiter = (0, express_rate_limit_1.default)({
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
exports.authLimiter = (0, express_rate_limit_1.default)({
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
exports.strictLimiter = (0, express_rate_limit_1.default)({
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
exports.uploadLimiter = (0, express_rate_limit_1.default)({
    windowMs: 60 * 60 * 1000,
    max: process.env.NODE_ENV === 'production' ? 80 : 300,
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: getClientKey,
    message: {
        error: 'Upload limit reached for this hour. Please try again later.'
    }
});
