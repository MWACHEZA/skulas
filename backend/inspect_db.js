const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const users = await prisma.user.findMany({
    where: { name: { contains: 'mwacheza', mode: 'insensitive' } },
    include: { student: true, teacher: true }
  });

  console.log('--- Users with "mwacheza" in name ---');
  console.log(JSON.stringify(users, null, 2));

  const assignments = await prisma.assignment.findMany({
    include: { class: true, subject: true }
  });

  console.log('\n--- All Assignments ---');
  console.log(JSON.stringify(assignments, null, 2));

  const classes = await prisma.schoolClass.findMany({
    include: { _count: { select: { students: true } } }
  });

  console.log('\n--- All Classes ---');
  console.log(JSON.stringify(classes, null, 2));
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
