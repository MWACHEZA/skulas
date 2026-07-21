"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
async function deepAudit() {
    console.log('--- Students Audit ---');
    const allStudents = await prisma.student.findMany({
        include: { school: true }
    });
    console.log(`Total Students in DB: ${allStudents.length}`);
    const bySchool = {};
    allStudents.forEach(s => {
        const key = s.school?.name || `Unknown (${s.schoolId})`;
        bySchool[key] = (bySchool[key] || 0) + 1;
    });
    console.log('Students by School:', JSON.stringify(bySchool, null, 2));
    console.log('\n--- Schools Audit ---');
    const allSchools = await prisma.school.findMany();
    allSchools.forEach(s => {
        console.log(`School: ${s.name} | Code: ${s.code} | ID: ${s.id}`);
    });
    // Check if there are any users with students but no school link
    const studentUsers = await prisma.user.findMany({
        where: { role: 'STUDENT' },
        include: { student: true }
    });
    console.log(`\nTotal Users with STUDENT role: ${studentUsers.length}`);
    console.log(`Users with role STUDENT but NO Student record: ${studentUsers.filter(u => !u.student).length}`);
}
deepAudit().catch(console.error).finally(() => prisma.$disconnect());
//# sourceMappingURL=deep-audit.js.map