declare const router: import("express-serve-static-core").Router;
export interface TenantModules {
    boarding: boolean;
    clinic: boolean;
    tuckshop: boolean;
    uniforms: boolean;
    transport: boolean;
    farm: boolean;
    sports: boolean;
}
export declare const DEFAULT_TENANT_MODULES: TenantModules;
export declare function resolveSchoolSubscription(schoolId: string): Promise<{
    modules: any;
} | null>;
export default router;
