"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
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