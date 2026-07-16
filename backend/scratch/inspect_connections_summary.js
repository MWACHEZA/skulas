const { PrismaClient } = require('../src/generated/client');
const prisma = new PrismaClient();

async function main() {
  const connCount = await prisma.schoolSupplier.count();
  console.log('Total connections count:', connCount);

  const conns = await prisma.schoolSupplier.findMany({
    select: {
      id: true,
      status: true,
      schoolSpecificId: true,
      supplier: {
        select: {
          id: true,
          companyName: true,
          email: true,
          userId: true
        }
      }
    }
  });

  console.log('Connections:');
  console.dir(conns, { depth: null });
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
