import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
const prisma = new PrismaClient();

async function fix() {
  const school = await prisma.school.findUnique({
    where: { code: 'AX-KHYVF4' }
  });

  if (!school) {
    console.error('School AX-KHYVF4 not found');
    return;
  }

  const hashedPassword = await bcrypt.hash('Admin@1234', 10);

  await prisma.user.update({
    where: { email: 'stpatricks@gmail.com' },
    data: { password: hashedPassword }
  });

  console.log('Successfully RESET password to Admin@1234 for stpatricks@gmail.com');
}

fix().catch(console.error).finally(() => prisma.$disconnect());
