const { PrismaClient } = require('./src/generated/client');
const prisma = new PrismaClient();

async function migrate() {
    try {
        const fetchAssignments = await prisma.assignment.findMany({
            where: {
                fileUrl: { not: null }
            }
        });
        
        // Filter in memory for compatibility with complex JSON null types
        const assignments = fetchAssignments.filter(a => !a.attachments);
        console.log(`Found ${assignments.length} assignments to migrate.`);

        for (const a of assignments) {
            await prisma.assignment.update({
                where: { id: a.id },
                data: {
                    attachments: [{ name: 'Handout', url: a.fileUrl }]
                }
            });
            console.log(`Migrated assignment: ${a.title}`);
        }

        console.log('Migration complete.');
    } catch (error) {
        console.error('Migration failed:', error);
    } finally {
        await prisma.$disconnect();
    }
}

migrate();
