const { PrismaClient } = require('./src/generated/client');
const prisma = new PrismaClient();

async function main() {
  const school = await prisma.school.findFirst();
  const schoolId = school.id;
  
  // Test student balances
  const feeGroups = await prisma.feeGroup.findMany({ where: { schoolId, year: 2024 } });
  const students = await prisma.student.findMany({
    where: { schoolId },
    include: { class: true, fees: { where: { feeGroupId: { in: feeGroups.map(f=>f.id) } } } }
  });
  
  let totalBalance = 0;
  students.forEach(s => {
    s.fees.forEach(f => {
      totalBalance += Math.max(0, f.amount - f.paid);
    });
  });
  console.log('Student balances records count:', students.length);
  console.log('Total balance:', totalBalance);

  // Test fees takings
  const fees = await prisma.fee.findMany({
    where: { schoolId, paid: { gt: 0 } }
  });
  console.log('Fees takings detailed count:', fees.length);
}
main().catch(console.error).finally(() => prisma.$disconnect());
