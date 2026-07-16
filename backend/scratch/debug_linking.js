const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
  const schoolCode = 'AX-C47ITS';
  const studentId = 'STU-26000001';

  const school = await prisma.school.findFirst({
    where: { code: { equals: schoolCode, mode: 'insensitive' } }
  });

  const student = await prisma.student.findFirst({
    where: { studentId: studentId },
    include: { school: true }
  });

  console.log('School Found:', school ? { id: school.id, name: school.name, code: school.code } : 'NOT FOUND');
  console.log('Student Found:', student ? { id: student.id, name: student.name, studentId: student.studentId, schoolId: student.schoolId, schoolCode: student.school?.code } : 'NOT FOUND');

  await prisma.$disconnect();
}

check();
