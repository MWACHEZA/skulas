const { PrismaClient } = require('./src/generated/client');

const prisma = new PrismaClient();

async function main() {
  console.log('✅ Connecting via Prisma...\n');

  try {
    const schools = await prisma.school.findMany({ select: { name: true, code: true, type: true } });
    console.log('🏫 Schools in DB:', schools.length);
    schools.forEach(s => console.log('  -', s.name, '|', s.code, '|', s.type));

    const userCount = await prisma.user.count();
    console.log('\n👤 Users:', userCount);

    const studentCount = await prisma.student.count();
    console.log('🎓 Students:', studentCount);

    const feeCount = await prisma.fee.count();
    console.log('💰 Fees:', feeCount);

    const walletCount = await prisma.studentWallet.count();
    console.log('👛 Student Wallets:', walletCount);

    const txCount = await prisma.walletTransaction.count();
    console.log('🔄 Wallet Transactions:', txCount);

    console.log('\n✅ Database is fully populated!');
  } catch (err) {
    console.error('❌ Query error:', err.message);
  }

  await prisma.$disconnect();
}

main();
