const { PrismaClient } = require('./src/generated/client');
const p = new PrismaClient();

async function main() {
  try {
    const school = await p.school.findUnique({ where: { code: 'AX-KHYVF4' } });
    if (!school) {
      console.log('School AX-KHYVF4 not found');
      return;
    }
    const departments = await p.department.findMany({
      where: { schoolId: school.id }
    });
    console.log('Departments in school AX-KHYVF4:', departments);
  } catch (error) {
    console.error('Error listing departments:', error);
  } finally {
    await p.$disconnect();
  }
}

main();
