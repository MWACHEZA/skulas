import { Request, Response, NextFunction } from 'express';
interface AuthRequest extends Request {
    user?: {
        id: string;
        schoolId?: string | null;
        role?: string;
    };
}
/**
 * Global Audit Middleware
 * Automatically logs all mutating API requests (POST/PUT/PATCH/DELETE)
 * for authenticated users to the AuditLog table.
 * Non-blocking - logs fire-and-forget after response.
 */
export declare const auditMiddleware: (req: AuthRequest, res: Response, next: NextFunction) => void;
export {};
