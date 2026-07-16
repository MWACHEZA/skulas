import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function checkOrphans() {
  const orphans = await prisma.student.findMany({
    where: { schoolId: { equals: undefined } }
  });
  console.log(`Orphan Students: ${orphans.length}`);
  
  const all = await prisma.student.findMany();
  console.log('All Students:', all.map(s => ({ name: s.name, schoolId: s.schoolId })));
}

checkOrphans().catch(console.error).finally(() => prisma.$disconnect());
