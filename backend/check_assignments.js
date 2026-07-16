const { PrismaClient } = require('./src/generated/client');
const prisma = new PrismaClient();

async function main() {
  const student = await prisma.student.findFirst({
    where: { name: { contains: 'thando', mode: 'insensitive' } }
  });

  console.log('Student Info:', JSON.stringify(student, null, 2));

  if (student && student.classId) {
    const assignments = await prisma.assignment.findMany({
      where: { classId: student.classId },
      include: { subject: true }
    });
    console.log(`Assignments for class ${student.classId}:`, JSON.stringify(assignments, null, 2));
  } else {
    console.log('Student not found or has no classId');
  }

  const allAssignments = await prisma.assignment.findMany({
    include: { class: true }
  });
  console.log('All Assignments:', JSON.stringify(allAssignments, null, 2));
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
