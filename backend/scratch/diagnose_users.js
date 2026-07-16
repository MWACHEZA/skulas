const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function diagnose() {
  try {
    const users = await prisma.user.findMany({
      include: { school: true }
    });
    
    console.log('--- USER DATA DUMP ---');
    users.forEach(u => {
      console.log(`ID: ${u.id}`);
      console.log(`Name: ${u.name}`);
      console.log(`Email: "[${u.email}]" (Length: ${u.email?.length})`);
      console.log(`Role: ${u.role}`);
      console.log(`isLocked: ${u.isLocked}`);
      console.log(`Password Hash Preview: ${u.password?.substring(0, 10)}...`);
      console.log(`School: ${u.school?.name} (Code: ${u.school?.code})`);
      console.log('---');
    });
  } catch (err) {
    console.error('Diagnosis failed:', err);
  } finally {
    await prisma.$disconnect();
  }
}

diagnose();
