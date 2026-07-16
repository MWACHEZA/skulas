import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function listDatabases() {
    const result = await prisma.$queryRaw `
    SELECT datname FROM pg_database WHERE datistemplate = false;
  `;
    console.log('--- Databases on Postgres Server ---');
    console.log(result);
}
listDatabases().catch(console.error).finally(() => prisma.$disconnect());
//# sourceMappingURL=list-dbs.js.map