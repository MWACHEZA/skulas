const { PrismaClient } = require('./src/generated/client');
const prisma = new PrismaClient();

async function main() {
  const count = await prisma.feeGroup.count();
  const groups = await prisma.feeGroup.findMany({select: {year: true}});
  console.log('Total:', count, 'Groups:', groups);
  
  const studentCount = await prisma.student.count();
  console.log('Total students:', studentCount);
  
  const feeCount = await prisma.fee.count();
  console.log('Total fees:', feeCount);
}
main().catch(console.error).finally(() => prisma.$disconnect());
