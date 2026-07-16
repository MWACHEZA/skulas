const { PrismaClient } = require('../src/generated/client');
const prisma = new PrismaClient();

async function check() {
  console.log('--- USERS WITH ROLE = SUPPLIER ---');
  const users = await prisma.user.findMany({
    where: { role: 'SUPPLIER' },
    select: { id: true, email: true, name: true, staffId: true, schoolId: true, metadata: true }
  });
  console.log(JSON.stringify(users, null, 2));

  console.log('\n--- SUPPLIER RECORDS ---');
  const suppliers = await prisma.supplier.findMany({
    include: { schools: true }
  });
  console.log(JSON.stringify(suppliers, null, 2));

  console.log('\n--- SCHOOL SUPPLIER RECORDS (JUNCTIONS) ---');
  const junctions = await prisma.schoolSupplier.findMany({
    include: { school: { select: { code: true } }, supplier: true }
  });
  console.log(JSON.stringify(junctions, null, 2));
}

check().catch(console.error).finally(() => prisma.$disconnect());
