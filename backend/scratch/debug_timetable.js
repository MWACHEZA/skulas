
const { PrismaClient } = require('../src/generated/client');
const prisma = new PrismaClient();

async function check() {
  try {
    const student = await prisma.student.findFirst({
      where: { name: { contains: 'Upper Six', mode: 'insensitive' } }, // Try to find by name or something identifiable
      include: { class: true }
    });

    if (!student) {
      // Try to find the user first
      const user = await prisma.user.findFirst({
          where: { role: 'STUDENT' },
          orderBy: { createdAt: 'desc' },
          include: { student: { include: { class: true } } }
      });
      console.log('Latest student user:', JSON.stringify(user, null, 2));
      
      if (user && user.student) {
          const slots = await prisma.timetableSlot.findMany({
              where: { classId: user.student.classId }
          });
          console.log(`Slots for class ${user.student.classId}:`, slots.length);
          console.log('Sample slot:', slots[0]);
      }
    } else {
        console.log('Found student:', JSON.stringify(student, null, 2));
        const slots = await prisma.timetableSlot.findMany({
            where: { classId: student.classId }
        });
        console.log(`Slots for class ${student.classId}:`, slots.length);
        if (slots.length > 0) {
            console.log('Sample slot publication status:', slots[0].isPublished);
        }
    }

    const classes = await prisma.schoolClass.findMany({
        where: { name: { contains: 'Upper Six', mode: 'insensitive' } }
    });
    console.log('Classes matching Upper Six:', classes);

  } catch (err) {
    console.error(err);
  } finally {
    await prisma.$disconnect();
  }
}

check();
