const { PrismaClient } = require('../src/generated/client');
const prisma = new PrismaClient();

async function main() {
  const users = await prisma.user.findMany({
    where: { role: 'SUPPLIER' },
    include: { supplier: { include: { schools: true } } }
  });

  console.log('--- ALL SUPPLIER USERS ---');
  console.log(JSON.stringify(users, null, 2));

  const connections = await prisma.schoolSupplier.findMany({
    include: { supplier: { include: { user: true } }, school: true }
  });

  console.log('\n--- ALL SCHOOL SUPPLIER CONNECTIONS ---');
  console.log(JSON.stringify(connections, null, 2));
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
