const { PrismaClient } = require('./src/generated/client');
const p = new PrismaClient();

async function main() {
  try {
    const user = await p.user.findUnique({ where: { email: 'newteacher@gmail.com' } });
    if (user) {
      const teacher = await p.teacher.findUnique({ where: { userId: user.id } });
      if (teacher) {
        await p.teacherSubject.deleteMany({ where: { teacherId: teacher.id } });
        await p.teacher.delete({ where: { id: teacher.id } });
      }
      await p.employeeProfile.deleteMany({ where: { userId: user.id } });
      await p.user.delete({ where: { id: user.id } });
      console.log('User and associated records deleted successfully');
    } else {
      console.log('User newteacher@gmail.com not found');
    }
  } catch (error) {
    console.error('Error during cleanup:', error);
  } finally {
    await p.$disconnect();
  }
}

main();
