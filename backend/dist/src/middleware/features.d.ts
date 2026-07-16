import { Response, NextFunction } from 'express';
import { AuthRequest } from './auth';
/**
 * Middleware: Checks if the school's plan includes the required feature.
 * @param featureName The name of the feature to check for.
 */
export declare const requireFeature: (featureName: string) => (req: AuthRequest, res: Response, next: NextFunction) => Promise<void>;
