const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const student = await prisma.student.findFirst({
    where: { studentId: 'STU-26000001' },
    include: { user: true, school: true }
  });
  
  if (student) {
    console.log(JSON.stringify(student, null, 2));
  } else {
    console.log('Student STU-26000001 not found.');
  }
}

main().finally(() => prisma.$disconnect());
