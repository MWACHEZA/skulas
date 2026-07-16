const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function migrate() {
  console.log('--- Starting Student-User Linkage Migration ---');

  // Find all students without a userId
  const orphanStudents = await prisma.student.findMany({
    where: { userId: null }
  });

  console.log(`Found ${orphanStudents.length} students without linked users.`);

  for (const student of orphanStudents) {
    // Try to find a user with the same email and role STUDENT
    if (student.email) {
      const user = await prisma.user.findFirst({
        where: { 
          email: student.email,
          role: 'STUDENT'
        }
      });

      if (user) {
        console.log(`Linking student [${student.name}] to user [${user.email}]...`);
        await prisma.student.update({
          where: { id: student.id },
          data: { userId: user.id }
        });
      } else {
        console.log(`No user found for student [${student.name}] with email [${student.email}].`);
      }
    } else {
      console.log(`Student [${student.name}] has no email. Skipping.`);
    }
  }

  console.log('--- Migration Complete ---');
  await prisma.$disconnect();
}

migrate().catch(e => {
  console.error(e);
  process.exit(1);
});
