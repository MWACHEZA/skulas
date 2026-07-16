import { PrismaClient } from '../generated/client';
import fs from 'fs';
import path from 'path';

const prisma = new PrismaClient();
const UPLOADS_ROOT = path.join(process.cwd(), 'storage');

async function migrate() {
    console.log('🚀 Starting Final Assignment & Submission Migration...');

    // 1. Migrate Teacher Assignment Attachments
    // Using queryRaw to avoid Prisma schema mismatch with 'status' column
    const assignments: any[] = await prisma.$queryRaw`SELECT id, title, attachments, "teacherId" FROM "Assignment" WHERE attachments IS NOT NULL`;

    for (const assignment of assignments) {
        const teacher = await prisma.teacher.findUnique({
            where: { id: assignment.teacherId },
            include: { school: true }
        });

        if (!teacher || !teacher.school) continue;

        const attachments = assignment.attachments;
        if (!Array.isArray(attachments)) continue;

        let updated = false;
        const newAttachments = [];

        for (const file of attachments) {
            if (file.url && !file.url.startsWith(teacher.school.code)) {
                const oldFilename = path.basename(file.url);
                const oldAbsPath = findFile(oldFilename, ['storage/images', 'storage/assignments', 'storage']);
                
                if (oldAbsPath) {
                    const newRelDir = path.join(teacher.school.code, 'staff', teacher.staffId, 'assignments');
                    const newRelPath = path.join(newRelDir, oldFilename).replace(/\\/g, '/');
                    
                    await moveFile(oldAbsPath, newRelPath);
                    newAttachments.push({ ...file, url: newRelPath });
                    updated = true;
                } else {
                    newAttachments.push(file);
                }
            } else {
                newAttachments.push(file);
            }
        }

        if (updated) {
            const jsonStr = JSON.stringify(newAttachments);
            await prisma.$executeRaw`UPDATE "Assignment" SET attachments = ${jsonStr}::jsonb WHERE id = ${assignment.id}`;
            console.log(`✅ Updated Assignment: ${assignment.title}`);
        }
    }

    // 2. Migrate Student Submission Attachments
    const submissions: any[] = await prisma.$queryRaw`SELECT id, "assignmentId", "studentId", attachments FROM "AssignmentSubmission" WHERE attachments IS NOT NULL`;

    for (const sub of submissions) {
        const student = await prisma.student.findUnique({
            where: { id: sub.studentId },
            include: { school: true }
        });

        if (!student || !student.school) continue;

        const attachments = sub.attachments;
        if (!Array.isArray(attachments)) continue;

        let updated = false;
        const newAttachments = [];

        for (const file of attachments) {
            if (file.url && !file.url.startsWith(student.school.code)) {
                const oldFilename = path.basename(file.url);
                const oldAbsPath = findFile(oldFilename, ['storage/submissions', 'storage/images', 'storage']);
                
                if (oldAbsPath) {
                    const newRelDir = path.join(student.school.code, 'students', student.studentId, 'submissions');
                    const newRelPath = path.join(newRelDir, oldFilename).replace(/\\/g, '/');
                    
                    await moveFile(oldAbsPath, newRelPath);
                    newAttachments.push({ ...file, url: newRelPath });
                    updated = true;
                } else {
                    newAttachments.push(file);
                }
            } else {
                newAttachments.push(file);
            }
        }

        if (updated) {
            const jsonStr = JSON.stringify(newAttachments);
            await prisma.$executeRaw`UPDATE "AssignmentSubmission" SET attachments = ${jsonStr}::jsonb WHERE id = ${sub.id}`;
            console.log(`✅ Updated Submission: ${sub.id}`);
        }
    }

    console.log('✅ Final Migration Finished.');
}

function findFile(filename: string, searchPaths: string[]): string | null {
    for (const dir of searchPaths) {
        const p = path.join(process.cwd(), dir, filename);
        if (fs.existsSync(p)) return p;
    }
    return null;
}

async function moveFile(oldAbsPath: string, newRelPath: string) {
    const newAbsPath = path.join(UPLOADS_ROOT, newRelPath);
    const newDir = path.dirname(newAbsPath);
    
    if (!fs.existsSync(newDir)) {
        fs.mkdirSync(newDir, { recursive: true });
    }

    try {
        if (oldAbsPath === newAbsPath) return;
        fs.renameSync(oldAbsPath, newAbsPath);
        console.log(`➡️  Moved: ${path.basename(oldAbsPath)} -> ${newRelPath}`);
    } catch (err) {
        console.error(`❌ Failed to move ${oldAbsPath}:`, err);
    }
}

migrate().finally(() => prisma.$disconnect());
