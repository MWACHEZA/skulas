import { NextFunction } from 'express';
export type ModuleAccessLevel = 'full' | 'scoped' | 'request_only' | 'none';
export interface ModuleAccessResult {
    level: ModuleAccessLevel;
    actingAs?: string;
    scopedContext?: string;
}
export declare function getModuleAccess(user: any, module: string): ModuleAccessResult;
export declare function requireModuleAccess(module: string, minLevel?: ModuleAccessLevel): (req: any, res: any, next: NextFunction) => any;
