import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function listTables() {
    const result = await prisma.$queryRaw `
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public'
    ORDER BY table_name;
  `;
    console.log('--- Tables in Public Schema ---');
    console.log(result);
}
listTables().catch(console.error).finally(() => prisma.$disconnect());
//# sourceMappingURL=list-tables.js.map