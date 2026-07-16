const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const result = await prisma.$queryRaw
    SELECT relname as table_name, n.nspname as schema_name, c.reltuples::bigint as row_count
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relkind = 'r'
    ORDER BY c.reltuples ASC;
  ;
  
  const emptyTables = result.filter(r => r.row_count === 0n || r.row_count === 0).map(r => r.table_name);
  console.log('Total Tables:', result.length);
  console.log('Empty Tables (' + emptyTables.length + '):', emptyTables.join(', '));
}
main().catch(console.error).finally(() => prisma.$disconnect());
