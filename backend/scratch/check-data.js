const { PrismaClient } = require('../src/generated/client');
const prisma = new PrismaClient();

async function checkUser() {
  try {
    const user = await prisma.user.findUnique({
      where: { email: 'stpatricks1@gmail.com' },
      select: { id: true, email: true, role: true, schoolId: true }
    });
    console.log(JSON.stringify(user, null, 2));
    
    const school = await prisma.school.findUnique({
      where: { id: user?.schoolId },
      select: { id: true, code: true, name: true }
    });
    console.log(JSON.stringify(school, null, 2));
  } catch (err) {
    console.error(err);
  } finally {
    await prisma.$disconnect();
  }
}

checkUser();
