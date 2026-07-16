const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const users = await prisma.user.findMany({
    include: { school: true }
  });
  console.log('--- DATABASE USERS ---');
  users.forEach(u => {
    console.log(`[${u.email}] (Role: ${u.role}, School: ${u.school?.code})`);
  });
  console.log('----------------------');
}

main().catch(console.error).finally(() => prisma.$disconnect());
