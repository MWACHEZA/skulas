import { AuthRequest } from '../middleware/auth';
export declare const logAction: (req: AuthRequest, action: string, entityType: string, entityId?: string, details?: any) => Promise<void>;
