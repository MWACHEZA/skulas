const { PrismaClient } = require('./src/generated/client');
const prisma = new PrismaClient();

async function main() {
  const student = await prisma.student.findFirst({
    where: { studentId: 'STU-26000003' },
    include: { class: true, user: true }
  });

  if (!student) {
    console.log('Student STU-26000003 not found');
    return;
  }

  console.log('--- STUDENT INFO ---');
  console.log('ID:', student.id);
  console.log('Name:', student.name);
  console.log('User ID:', student.userId);
  console.log('Class ID:', student.classId);
  console.log('Class Name:', student.class?.name || 'NOT FOUND');
  console.log('User Exists (via relation):', !!student.user);

  if (student.classId) {
    const assignments = await prisma.assignment.findMany({
      where: { classId: student.classId },
      include: { subject: true }
    });
    console.log(`\n--- ASSIGNMENTS FOR CLASS ${student.classId} ---`);
    console.log(`Count: ${assignments.length}`);
    assignments.forEach(a => console.log(`- ${a.title} (Subject: ${a.subject.name}, Status: ${a.status})`));
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
