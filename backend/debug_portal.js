const { PrismaClient } = require('./src/generated/client');
const prisma = new PrismaClient();

async function debug() {
  const userId = 'cmo349xgx00023sf569zoxac4'; // Thando Mwacheza User ID
  
  const student = await prisma.student.findUnique({
    where: { userId },
    select: { id: true, classId: true }
  });

  console.log('--- STUDENT ---');
  console.log(student);

  if (!student) {
    console.log('No student record found for user ID');
    return;
  }

  const assignments = await prisma.assignment.findMany({
    where: { 
       classId: student.classId,
       status: { in: ['active', 'published'] }
    },
    include: { 
       subject: { select: { name: true } }
    }
  });

  console.log('--- ASSIGNMENTS FOUND ---');
  console.log(JSON.stringify(assignments, null, 2));
}

debug();
