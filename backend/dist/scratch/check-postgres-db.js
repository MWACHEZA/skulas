import { PrismaClient } from '@prisma/client';
// Manually override the URL to check the default 'postgres' database
const prisma = new PrismaClient({
    datasources: {
        db: {
            url: 'postgresql://postgres:Admin@1234@localhost:5432/postgres?schema=public'
        }
    }
});
async function checkPostgresDb() {
    try {
        const tables = await prisma.$queryRaw `
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name;
    `;
        console.log('--- Tables in Postgres DB (Public Schema) ---');
        console.log(tables);
    }
    catch (e) {
        console.log('Error checking postgres db:', e.message);
    }
}
checkPostgresDb().catch(console.error).finally(() => prisma.$disconnect());
//# sourceMappingURL=check-postgres-db.js.map