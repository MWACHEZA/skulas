import { PrismaClient } from '../src/generated/client';
const prisma = new PrismaClient();

async function main() {
  const students = await prisma.student.findMany({
    include: {
      class: true,
      school: true
    }
  });

  console.log('--- Students ---');
  students.forEach((s: any) => {
    console.log(`Name: ${s.name}, ID: ${s.studentId}, School: ${s.school?.name}, Class: ${s.class?.name || 'Unassigned'}`);
  });

  const classes = await prisma.schoolClass.findMany({
    include: { school: true }
  });

  console.log('\n--- Classes ---');
  classes.forEach((c: any) => {
    console.log(`Name: ${c.name}, School: ${c.school?.name}, ID: ${c.id}`);
  });

  const applications = await prisma.application.findMany({
    include: { school: true }
  });

  console.log('\n--- Applications ---');
  applications.forEach((a: any) => {
    console.log(`Name: ${a.applicantName}, Email: ${a.email}, School: ${a.school?.name}, Status: ${a.status}`);
  });
}

main().catch(console.error).finally(() => prisma.$disconnect());
