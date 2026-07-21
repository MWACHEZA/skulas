"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
async function check() {
    console.log('--- Checking School ---');
    const school = await prisma.school.findUnique({
        where: { code: 'AX-KHYVF4' }
    });
    console.log('School Found:', !!school);
    if (school) {
        console.log('School Details:', { id: school.id, name: school.name, code: school.code });
    }
    console.log('\n--- Checking User ---');
    const user = await prisma.user.findFirst({
        where: { email: 'stpatricks@gmail.com' },
        include: { school: true }
    });
    console.log('\n--- Global User List ---');
    const allUsers = await prisma.user.findMany({
        select: { email: true, role: true, schoolId: true }
    });
    console.log('Total Users Globally:', allUsers.length);
    allUsers.forEach(u => console.log(`- ${u.email} (${u.role}) [SchoolId: ${u.schoolId}]`));
}
check().catch(console.error).finally(() => prisma.$disconnect());
//# sourceMappingURL=debug-login.js.map