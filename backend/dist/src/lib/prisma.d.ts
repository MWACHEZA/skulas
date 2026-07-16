import { PrismaClient } from '../generated/client';
import { AsyncLocalStorage } from 'async_hooks';
export declare const tenantStorage: AsyncLocalStorage<{
    schoolId: string;
}>;
declare const basePrisma: PrismaClient<import("../generated/client").Prisma.PrismaClientOptions, never, import("../generated/client/runtime/library").DefaultArgs>;
declare const _default: typeof basePrisma;
export default _default;
