import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function createSuperAdmin() {
  const email = 'superadmin@acadex.com';
  const password = 'Admin@1234'; // Standard password for testing
  const hashedPassword = await bcrypt.hash(password, 10);

  const user = await prisma.user.upsert({
    where: { email },
    update: {
      password: hashedPassword,
      role: 'SUPER_ADMIN',
    },
    create: {
      email,
      password: hashedPassword,
      name: 'Acadex Super Admin',
      role: 'SUPER_ADMIN',
    },
  });

  console.log(`✅ Super Admin created/updated: ${user.email}`);
  console.log(`Password set to: ${password}`);
}

createSuperAdmin()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
