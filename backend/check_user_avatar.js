const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const user = await prisma.user.findFirst({
    where: { 
      OR: [
        { email: 'santai@yahoo.com' },
        { email: 'santa1@yahoo.com' }
      ]
    }
  });
  console.log(JSON.stringify(user, null, 2));
}

main().finally(() => prisma.$disconnect());
