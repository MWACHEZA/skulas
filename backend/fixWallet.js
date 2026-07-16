const { PrismaClient } = require('./src/generated/client');
const prisma = new PrismaClient();

async function main() {
  let wallet = await prisma.studentWallet.findFirst();
  if (!wallet) {
    const student = await prisma.student.findFirst();
    if (student) {
      wallet = await prisma.studentWallet.create({ data: { studentId: student.userId, balance: 100 } });
    }
  }
  if (wallet) {
    try {
      await prisma.walletTransaction.create({
        data: {
          walletId: wallet.id,
          amount: 50.0,
          type: 'Deposit'
        }
      });
      console.log('Successfully created WalletTransaction');
    } catch (e) {
      console.error('Error:', e);
    }
  } else {
    console.log('No wallet found to create transaction');
  }
}
main().finally(() => prisma['$disconnect']());
