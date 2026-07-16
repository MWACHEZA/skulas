import { PrismaClient } from './src/generated/client';

const client = new PrismaClient();

async function run() {
  try {
    const school = await client.school.findUnique({
      where: { code: 'AX-KHYVF4' }
    });
    console.log('School:', school);

    const user = await client.user.findFirst({
      where: { email: { equals: 'librarian@gmail.com', mode: 'insensitive' } }
    });
    console.log('User with email librarian@gmail.com:', user);
  } catch (err) {
    console.error('Error querying DB:', err);
  } finally {
    await client.$disconnect();
  }
}

run();
