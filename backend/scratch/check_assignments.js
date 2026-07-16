const { PrismaClient } = require('../src/generated/client');
const prisma = new PrismaClient();

async function check() {
  try {
    console.log('--- Assignments ---');
    const assignments = await prisma.$queryRaw`SELECT id, title, attachments, "teacherId" FROM "Assignment"`;
    console.log(JSON.stringify(assignments, null, 2));

    console.log('\n--- Submissions ---');
    const submissions = await prisma.$queryRaw`SELECT id, "assignmentId", "studentId", attachments FROM "AssignmentSubmission"`;
    console.log(JSON.stringify(submissions, null, 2));
  } catch (err) {
    console.error(err);
  } finally {
    await prisma.$disconnect();
  }
}

check();
