import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function checkSchemas() {
    try {
        const schemas = await prisma.$queryRaw `SELECT nspname FROM pg_catalog.pg_namespace;`;
        console.log('Schemas:', schemas);
    }
    catch (err) {
        console.error('Failed to query schemas:', err);
    }
}
checkSchemas().finally(() => prisma.$disconnect());
//# sourceMappingURL=check-schemas.js.map