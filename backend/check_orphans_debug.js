const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const students = await prisma.student.findMany({
    include: { user: true, school: true }
  });
  
  console.log(`Total Students: ${students.length}`);
  const orphans = students.filter(s => !s.user);
  console.log(`Orphans (no user): ${orphans.length}`);
  
  orphans.forEach(o => {
    console.log(`  - ${o.name} (${o.studentId}) in ${o.school.name} (ID: ${o.id})`);
  });
}

main().finally(() => prisma.$disconnect());
