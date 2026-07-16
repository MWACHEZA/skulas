const { PrismaClient } = require('./src/generated/client');
const prisma = new PrismaClient();

async function repair() {
  try {
    const updated = await prisma.school.updateMany({
      where: { code: 'AX-OXFDJP' },
      data: { code: 'AX-0XFDJP' }
    });
    console.log(`Repaired ${updated.count} school records.`);
  } catch (err) {
    console.error('Repair failed:', err);
  } finally {
    await prisma.$disconnect();
  }
}

repair();
