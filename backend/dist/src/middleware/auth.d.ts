import { Request, Response, NextFunction } from 'express';
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
/**
 * Middleware: Verifies JWT and attaches decoded user to req.user
 * Wraps the request in a tenant context for automatic Prisma isolation
 */
export declare const requireAuth: (req: AuthRequest, res: Response, next: NextFunction) => Promise<void>;
/**
 * Middleware factory: Checks that req.user has one of the allowed roles
 */
export declare const requireRole: (...roles: string[]) => (req: AuthRequest, res: Response, next: NextFunction) => void;
/**
 * Middleware factory: Ensures the logged-in user owns the resource or is an Admin
 * Checks that req.user.id matches req.params[idParam]
 */
export declare const requireOwnership: (idParam?: string) => (req: AuthRequest, res: Response, next: NextFunction) => Promise<void | Response<any, Record<string, any>>>;
