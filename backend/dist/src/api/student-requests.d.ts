import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
declare const router: import("express-serve-static-core").Router;
/**
 * Middleware: Verify caller is an active student leader for this school
 */
export declare const requireStudentLeader: (req: AuthRequest, res: Response, next: Function) => Promise<void>;
export default router;
