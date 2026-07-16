import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
  const user = await prisma.user.findUnique({where: {email: 'medical@yahoo.com'}, include: {school: true}});
  console.log(user);
}
main().finally(() => prisma.$disconnect());
