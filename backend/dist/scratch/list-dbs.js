"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
async function listDatabases() {
    const result = await prisma.$queryRaw `
    SELECT datname FROM pg_database WHERE datistemplate = false;
  `;
    console.log('--- Databases on Postgres Server ---');
    console.log(result);
}
listDatabases().catch(console.error).finally(() => prisma.$disconnect());
//# sourceMappingURL=list-dbs.js.map