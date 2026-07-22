import { PrismaClient } from '../src/generated/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const email = 'superadmin@acadex.com';
  const password = 'AcadexSuper@1234';
  const hashedPassword = await bcrypt.hash(password, 10);

  console.log(`🚀 Creating Super Admin: ${email}...`);

  const user = await prisma.user.upsert({
    where: { email },
    update: {},
    create: {
      email,
      password: hashedPassword,
      name: 'Acadex Super Admin',
      role: 'SUPER_ADMIN',
    },
  });

  console.log('✅ Super Admin created successfully!');
  console.log('------------------------------------');
  console.log('Email:', email);
  console.log('Password:', password);
  console.log('Login Path: /acadex/login');
  console.log('------------------------------------');
}

main()
  .catch((e) => {
    console.error('❌ Error creating Super Admin:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
