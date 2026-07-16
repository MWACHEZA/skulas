const { PrismaClient } = require('../generated/client');
const prisma = new PrismaClient();

async function main() {
    console.log('🔄 Starting storage path synchronization...');

    // 1. Update Schools (Branding Logo)
    const schools = await prisma.school.findMany();
    for (const school of schools) {
        if (school.branding && typeof school.branding === 'object') {
            const branding = { ...school.branding };
            if (branding.logo && !branding.logo.includes(school.code)) {
                // Legacy logo path like /images/logo.png or logo.png
                const cleanLogo = branding.logo.startsWith('/') ? branding.logo.substring(1) : branding.logo;
                if (!cleanLogo.startsWith('storage/')) {
                    branding.logo = `/storage/${school.code}/global/${cleanLogo}`;
                    await prisma.school.update({
                        where: { id: school.id },
                        data: { branding }
                    });
                    console.log(`Updated School ${school.code} logo: ${branding.logo}`);
                }
            }
        }
    }

    // 2. Update User Avatars
    const users = await prisma.user.findMany({
        where: { avatar: { not: null } },
        include: { school: true }
    });
    for (const user of users) {
        if (user.avatar && user.school && !user.avatar.includes(user.school.code)) {
            // Assume orphaned avatar in root global/images/ 
            // (since I moved root images/ to global/images/)
            if (!user.avatar.startsWith('storage/')) {
                const newAvatar = `/storage/${user.school.code}/global/images/${user.avatar}`;
                await prisma.user.update({
                    where: { id: user.id },
                    data: { avatar: newAvatar }
                });
                console.log(`Updated User ${user.name} avatar: ${newAvatar}`);
            }
        }
    }

    // 3. Update Assignment Submissions
    const submissions = await prisma.assignmentSubmission.findMany({
        where: { attachments: { not: [] } },
        include: { school: true }
    });
    for (const sub of submissions) {
        if (sub.school) {
            const newAttachments = sub.attachments.map(att => {
                if (typeof att === 'string' && !att.includes(sub.school.code) && !att.startsWith('storage/')) {
                    return `/storage/${sub.school.code}/global/submissions/${att}`;
                }
                return att;
            });
            await prisma.assignmentSubmission.update({
                where: { id: sub.id },
                data: { attachments: newAttachments }
            });
            console.log(`Updated Submission ${sub.id} attachments for ${sub.school.code}`);
        }
    }

    // 4. Update Applicant Documents
    const docs = await prisma.applicantDocument.findMany({
        include: { application: { include: { school: true } } }
    });
    for (const doc of docs) {
        const school = doc.application?.school;
        if (school && doc.url && !doc.url.includes(school.code) && !doc.url.startsWith('storage/')) {
            const newUrl = `/storage/${school.code}/global/docs/${doc.url}`;
            await prisma.applicantDocument.update({
                where: { id: doc.id },
                data: { url: newUrl }
            });
            console.log(`Updated Document ${doc.id} URL: ${newUrl}`);
        }
    }

    console.log('✅ Storage path synchronization complete.');
}

main()
    .catch(e => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
