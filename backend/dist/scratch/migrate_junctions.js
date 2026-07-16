import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
    console.log('Starting data migration from metadata.linkedEntities to junction tables...');
    const users = await prisma.user.findMany({
        where: {
            role: { in: ['SUPPLIER', 'PARENT'] }
        }
    });
    console.log(`Found ${users.length} potential users to migrate.`);
    for (const user of users) {
        const metadata = user.metadata || {};
        const linkedEntities = metadata.linkedEntities || [];
        if (user.role === 'SUPPLIER') {
            // 1. Ensure Supplier record exists
            let supplier = await prisma.supplier.findUnique({
                where: { userId: user.id }
            });
            if (!supplier) {
                console.log(`Creating Supplier record for User: ${user.email}`);
                supplier = await prisma.supplier.create({
                    data: {
                        companyName: metadata.companyName || user.name,
                        contactName: metadata.contactName || user.name,
                        email: user.email,
                        phone: user.phone,
                        address: metadata.address,
                        taxClearance: metadata.taxNumber,
                        prazCert: metadata.prazReg,
                        userId: user.id,
                        status: user.isLocked ? 'suspended' : 'active'
                    }
                });
            }
            // 2. Create SchoolSupplier links
            for (const entity of linkedEntities) {
                if (!entity.schoolCode)
                    continue;
                const school = await prisma.school.findUnique({
                    where: { code: entity.schoolCode }
                });
                if (school) {
                    console.log(`Linking Supplier ${user.email} to School ${school.code} (${entity.status})`);
                    await prisma.schoolSupplier.upsert({
                        where: {
                            schoolId_supplierId: {
                                schoolId: school.id,
                                supplierId: supplier.id
                            }
                        },
                        update: {
                            status: entity.status || 'PENDING',
                            schoolSpecificId: entity.id // Use existing ID if it was school-specific
                        },
                        create: {
                            schoolId: school.id,
                            supplierId: supplier.id,
                            status: entity.status || 'PENDING',
                            schoolSpecificId: entity.id
                        }
                    });
                }
            }
        }
        else if (user.role === 'PARENT') {
            // 1. Ensure Parent record exists
            let parent = await prisma.parent.findUnique({
                where: { userId: user.id }
            });
            if (!parent) {
                console.log(`Creating Parent record for User: ${user.email}`);
                parent = await prisma.parent.create({
                    data: {
                        userId: user.id,
                        phone: user.phone,
                        address: metadata.address,
                        occupation: metadata.occupation,
                        employer: metadata.employer
                    }
                });
            }
            // 2. Create ParentStudent links
            for (const entity of linkedEntities) {
                // For parents, entity.id is usually the Student ID (standard ID or school-specific studentId)
                // Let's try to find the student by that ID in the specific school
                if (!entity.schoolCode || !entity.id)
                    continue;
                const school = await prisma.school.findUnique({
                    where: { code: entity.schoolCode }
                });
                if (school) {
                    const student = await prisma.student.findFirst({
                        where: {
                            schoolId: school.id,
                            OR: [
                                { id: entity.id },
                                { studentId: entity.id }
                            ]
                        }
                    });
                    if (student) {
                        console.log(`Linking Parent ${user.email} to Student ${student.studentId} (${entity.status})`);
                        await prisma.parentStudent.upsert({
                            where: {
                                parentId_studentId: {
                                    parentId: parent.id,
                                    studentId: student.id
                                }
                            },
                            update: {
                                status: entity.status || 'APPROVED',
                                relation: metadata.relation || 'Guardian'
                            },
                            create: {
                                parentId: parent.id,
                                studentId: student.id,
                                status: entity.status || 'APPROVED',
                                relation: metadata.relation || 'Guardian'
                            }
                        });
                    }
                }
            }
        }
    }
    console.log('Migration complete!');
}
main()
    .catch((e) => {
    console.error(e);
    process.exit(1);
})
    .finally(async () => {
    await prisma.$disconnect();
});
//# sourceMappingURL=migrate_junctions.js.map