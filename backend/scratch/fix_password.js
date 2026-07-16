const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();

async function main() {
  const email = 'supplier@yahoo.com';
  const user = await prisma.user.findUnique({ where: { email } });
  
  if (user && !user.password.startsWith('$2')) {
    console.log('User has cleartext password. Hashing now...');
    const hashedPassword = await bcrypt.hash(user.password, 10);
    await prisma.user.update({
      where: { email },
      data: { password: hashedPassword }
    });
    console.log('Password hashed successfully.');
  } else {
    console.log('User not found or already hashed.');
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
