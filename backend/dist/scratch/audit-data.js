import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function audit() {
    const schools = await prisma.school.findMany();
    console.log('--- Schools Found ---');
    for (const s of schools) {
        const studentCount = await prisma.student.count({ where: { schoolId: s.id } });
        const teacherCount = await prisma.teacher.count({ where: { schoolId: s.id } });
        const appCount = await prisma.application.count({ where: { schoolId: s.id } });
        const userCount = await prisma.user.count({ where: { schoolId: s.id } });
        console.log(`School: ${s.name} (${s.code}) [ID: ${s.id}]`);
        console.log(`  Students: ${studentCount}`);
        console.log(`  Teachers: ${teacherCount}`);
        console.log(`  Users:    ${userCount}`);
        console.log(`  Apps:     ${appCount}`);
    }
    console.log('\n--- Global Totals ---');
    console.log('Total Students in DB:', await prisma.student.count());
    console.log('Total Teachers in DB:', await prisma.teacher.count());
    console.log('Total Apps in DB:', await prisma.application.count());
    console.log('Total Fees in DB:', await prisma.fee.count());
    console.log('Total Reports in DB:', await prisma.academicReport.count());
}
audit().catch(console.error).finally(() => prisma.$disconnect());
//# sourceMappingURL=audit-data.js.map