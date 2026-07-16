import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
    const users = await prisma.user.findMany({
        select: {
            id: true,
            name: true,
            role: true,
            avatar: true
        }
    });
    console.log(JSON.stringify(users, null, 2));
}
main().catch(e => console.error(e)).finally(() => prisma.$disconnect());
//# sourceMappingURL=check_avatars.js.map