const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();

async function main() {
  console.log('--- Starting Student-User Linkage Migration ---');

  // 1. Find orphans
  const orphans = await prisma.student.findMany({
    where: { userId: null },
    include: { school: true }
  });

  console.log(`Found ${orphans.length} orphan student records.`);

  const defaultPassword = await bcrypt.hash('Password', 10);

  for (const student of orphans) {
    console.log(`Processing ${student.name} (${student.studentId}) in ${student.school.name}...`);

    try {
      // 2. Check if user already exists by email
      let user = null;
      if (student.email) {
        user = await prisma.user.findUnique({
          where: { email: student.email.trim().toLowerCase() }
        });
      }

      if (user) {
        console.log(`  Found existing user [${user.email}]. Linking...`);
      } else {
        // 3. Create missing user
        const studentEmail = student.email?.trim().toLowerCase() || `${student.studentId.toLowerCase().replace(/[^a-z0-9]/g, '')}@school.com`;
        
        console.log(`  No user found. Creating account with email [${studentEmail}]...`);
        
        user = await prisma.user.create({
          data: {
            email: studentEmail,
            password: defaultPassword,
            name: student.name,
            role: 'STUDENT',
            phone: student.phone,
            schoolId: student.schoolId,
            mustChangePassword: true
          }
        });
      }

      // 4. Link the student to the user
      await prisma.student.update({
        where: { id: student.id },
        data: { userId: user.id, email: user.email }
      });

      console.log(`  Successfully linked ${student.name} to user ID ${user.id}`);
    } catch (err) {
      console.error(`  Failed to process student ${student.studentId}:`, err.message);
    }
  }

  console.log('--- Migration Complete ---');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
