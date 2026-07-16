const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const email = "stpatrick's@gmail.com";
  const user = await prisma.user.findUnique({
    where: { email },
    include: { school: true }
  });

  if (user) {
    console.log('User found:', {
      email: user.email,
      role: user.role,
      schoolName: user.school?.name,
      schoolCode: user.school?.code
    });
  } else {
    console.log('User not found with email:', email);
    
    const allUsers = await prisma.user.findMany({ take: 5, include: { school: true } });
    console.log('Recent users:', allUsers.map(u => ({ email: u.email, school: u.school?.code })));
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
