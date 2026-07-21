"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("../generated/client");
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const prisma = new client_1.PrismaClient();
const UPLOADS_ROOT = path_1.default.join(process.cwd(), 'storage');
async function migrate() {
    console.log('🚀 Starting Final Assignment & Submission Migration...');
    // 1. Migrate Teacher Assignment Attachments
    // Using queryRaw to avoid Prisma schema mismatch with 'status' column
    const assignments = await prisma.$queryRaw `SELECT id, title, attachments, "teacherId" FROM "Assignment" WHERE attachments IS NOT NULL`;
    for (const assignment of assignments) {
        const teacher = await prisma.teacher.findUnique({
            where: { id: assignment.teacherId },
            include: { school: true }
        });
        if (!teacher || !teacher.school)
            continue;
        const attachments = assignment.attachments;
        if (!Array.isArray(attachments))
            continue;
        let updated = false;
        const newAttachments = [];
        for (const file of attachments) {
            if (file.url && !file.url.startsWith(teacher.school.code)) {
                const oldFilename = path_1.default.basename(file.url);
                const oldAbsPath = findFile(oldFilename, ['storage/images', 'storage/assignments', 'storage']);
                if (oldAbsPath) {
                    const newRelDir = path_1.default.join(teacher.school.code, 'staff', teacher.staffId, 'assignments');
                    const newRelPath = path_1.default.join(newRelDir, oldFilename).replace(/\\/g, '/');
                    await moveFile(oldAbsPath, newRelPath);
                    newAttachments.push({ ...file, url: newRelPath });
                    updated = true;
                }
                else {
                    newAttachments.push(file);
                }
            }
            else {
                newAttachments.push(file);
            }
        }
        if (updated) {
            const jsonStr = JSON.stringify(newAttachments);
            await prisma.$executeRaw `UPDATE "Assignment" SET attachments = ${jsonStr}::jsonb WHERE id = ${assignment.id}`;
            console.log(`✅ Updated Assignment: ${assignment.title}`);
        }
    }
    // 2. Migrate Student Submission Attachments
    const submissions = await prisma.$queryRaw `SELECT id, "assignmentId", "studentId", attachments FROM "AssignmentSubmission" WHERE attachments IS NOT NULL`;
    for (const sub of submissions) {
        const student = await prisma.student.findUnique({
            where: { id: sub.studentId },
            include: { school: true }
        });
        if (!student || !student.school)
            continue;
        const attachments = sub.attachments;
        if (!Array.isArray(attachments))
            continue;
        let updated = false;
        const newAttachments = [];
        for (const file of attachments) {
            if (file.url && !file.url.startsWith(student.school.code)) {
                const oldFilename = path_1.default.basename(file.url);
                const oldAbsPath = findFile(oldFilename, ['storage/submissions', 'storage/images', 'storage']);
                if (oldAbsPath) {
                    const newRelDir = path_1.default.join(student.school.code, 'students', student.studentId, 'submissions');
                    const newRelPath = path_1.default.join(newRelDir, oldFilename).replace(/\\/g, '/');
                    await moveFile(oldAbsPath, newRelPath);
                    newAttachments.push({ ...file, url: newRelPath });
                    updated = true;
                }
                else {
                    newAttachments.push(file);
                }
            }
            else {
                newAttachments.push(file);
            }
        }
        if (updated) {
            const jsonStr = JSON.stringify(newAttachments);
            await prisma.$executeRaw `UPDATE "AssignmentSubmission" SET attachments = ${jsonStr}::jsonb WHERE id = ${sub.id}`;
            console.log(`✅ Updated Submission: ${sub.id}`);
        }
    }
    console.log('✅ Final Migration Finished.');
}
function findFile(filename, searchPaths) {
    for (const dir of searchPaths) {
        const p = path_1.default.join(process.cwd(), dir, filename);
        if (fs_1.default.existsSync(p))
            return p;
    }
    return null;
}
async function moveFile(oldAbsPath, newRelPath) {
    const newAbsPath = path_1.default.join(UPLOADS_ROOT, newRelPath);
    const newDir = path_1.default.dirname(newAbsPath);
    if (!fs_1.default.existsSync(newDir)) {
        fs_1.default.mkdirSync(newDir, { recursive: true });
    }
    try {
        if (oldAbsPath === newAbsPath)
            return;
        fs_1.default.renameSync(oldAbsPath, newAbsPath);
        console.log(`➡️  Moved: ${path_1.default.basename(oldAbsPath)} -> ${newRelPath}`);
    }
    catch (err) {
        console.error(`❌ Failed to move ${oldAbsPath}:`, err);
    }
}
migrate().finally(() => prisma.$disconnect());
//# sourceMappingURL=finalize-migration.js.map