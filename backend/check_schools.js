const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const schools = await prisma.school.findMany({
    orderBy: { createdAt: 'desc' },
    take: 5,
    include: { users: true }
  });

  console.log('Last 5 Schools registered:');
  schools.forEach(s => {
    console.log(`- ${s.name} (${s.code}): ${s.users.length} users`);
    s.users.forEach(u => console.log(`  - ${u.email} (${u.role})`));
  });
}

main().catch(console.error).finally(() => prisma.$disconnect());
