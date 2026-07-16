const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function getSchool() {
  try {
    const school = await prisma.school.findFirst({ select: { code: true } });
    console.log('SCHOOL_CODE:', school?.code);
  } catch (err) {
    console.error(err);
  } finally {
    await prisma.$disconnect();
  }
}

getSchool();
