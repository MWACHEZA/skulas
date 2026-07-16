const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();

async function main() {
  const email = "stpatricks@gmail.com";
  const hashedPassword = await bcrypt.hash('Admin123', 10);
  
  const user = await prisma.user.update({
    where: { email },
    data: { password: hashedPassword }
  });

  console.log('Password successfully reset for:', user.email);
}

main().catch(console.error).finally(() => prisma.$disconnect());
