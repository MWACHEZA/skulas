const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('--- Starting ID Repair Migration ---');

  const students = await prisma.student.findMany({
    include: { user: true }
  });

  for (const student of students) {
    const id = student.studentId;
    // Look for patterns like STU-2626... where 26 is the year
    const match = id.match(/^([A-Z]+)-(\d{2})(\2\d+)$/);
    
    if (match) {
      const prefix = match[1];
      const year = match[2];
      const sequence = match[3]; // This includes the extra year digits
      
      const newId = `${prefix}-${sequence}`;
      
      console.log(`Repairing Student ID: ${id} -> ${newId}`);
      
      await prisma.student.update({
        where: { id: student.id },
        data: { studentId: newId }
      });

      // Also update linked User's staffId if it matches the malformed ID
      if (student.user && (student.user.staffId === id || student.user.staffId === null)) {
        console.log(`  Updating User staffId: ${id} -> ${newId}`);
        await prisma.user.update({
          where: { id: student.user.id },
          data: { staffId: newId }
        });
      }
    }
  }

  // Also check other roles in User table directly
  const users = await prisma.user.findMany({
    where: {
      staffId: { contains: '2626' } // Heuristic for malformed IDs this year
    }
  });

  for (const user of users) {
    const id = user.staffId;
    if (!id) continue;

    const match = id.match(/^([A-Z]+)-(\d{2})(\2\d+)$/);
    if (match) {
      const prefix = match[1];
      const sequence = match[3];
      const newId = `${prefix}-${sequence}`;

      console.log(`Repairing User staffId: ${id} -> ${newId} (Role: ${user.role})`);
      
      await prisma.user.update({
        where: { id: user.id },
        data: { staffId: newId }
      });
    }
  }

  console.log('--- ID Repair Complete ---');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
