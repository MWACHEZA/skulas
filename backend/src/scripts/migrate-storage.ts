import { PrismaClient } from '../generated/client';
import fs from 'fs';
import path from 'path';

const prisma = new PrismaClient();
const UPLOADS_ROOT = path.join(process.cwd(), 'storage');

async function migrate() {
  console.log('🚀 Starting Storage Migration...');

  // 1. Migrate User Avatars
  const usersWithAvatars = await prisma.user.findMany({
    where: { 
        avatar: { 
            not: null,
            startsWith: 'storage' // Only old absolute-ish paths or flat structures
        } 
    },
    include: { school: true }
  });

  for (const user of usersWithAvatars) {
    if (!user.school || !user.staffId) continue;
    const oldPath = user.avatar!;
    const filename = path.basename(oldPath);
    
    // Target: storage/[CODE]/[ENTITY]/[ID]/profile/[FILE]
    const entityType = user.role.toLowerCase().includes('student') ? 'students' : 'staff';
    const newDir = path.join(user.school.code, entityType, user.staffId, 'profile');
    const newRelativePath = path.join(newDir, filename);
    
    await moveFile(oldPath, newRelativePath);
    await prisma.user.update({ where: { id: user.id }, data: { avatar: newRelativePath.replace(/\\/g, '/') } });
  }

  // 2. Migrate Applicant Documents
  const appDocs = await prisma.applicantDocument.findMany({
    where: { url: { startsWith: 'storage' } },
    include: { application: { include: { school: true } } }
  });

  for (const doc of appDocs) {
    const school = doc.application.school;
    const appNo = doc.application.applicationNumber || doc.applicationId;
    const filename = path.basename(doc.url);
    
    const newDir = path.join(school.code, 'applicants', appNo, 'docs');
    const newRelativePath = path.join(newDir, filename);
    
    await moveFile(doc.url, newRelativePath);
    await prisma.applicantDocument.update({ where: { id: doc.id }, data: { url: newRelativePath.replace(/\\/g, '/') } });
  }

  // 3. Migrate Assignment Submissions
  const submissions = await (prisma.assignmentSubmission as any).findMany({
     where: { 
        attachments: { 
            not: null
        } 
     },
     include: { 
        student: { 
            include: { school: true } 
        } 
     }
  });

  for (const sub of submissions) {
    const attachments = sub.attachments as any[];
    if (!Array.isArray(attachments)) continue;
    
    let updated = false;
    const newAttachments = [];

    for (const file of attachments) {
        if (file.url?.startsWith('storage')) {
            const filename = path.basename(file.url);
            const newDir = path.join(sub.student.school.code, 'students', sub.student.studentId, 'submissions');
            const newRelativePath = path.join(newDir, filename);
            
            await moveFile(file.url, newRelativePath);
            newAttachments.push({ ...file, url: newRelativePath.replace(/\\/g, '/') });
            updated = true;
        } else {
            newAttachments.push(file);
        }
    }

    if (updated) {
        await prisma.assignmentSubmission.update({ 
            where: { id: sub.id }, 
            data: { attachments: newAttachments } 
        });
    }
  }

  console.log('✅ Migration Finished.');
}

async function moveFile(oldRelPath: string, newRelPath: string) {
    const oldAbsPath = path.isAbsolute(oldRelPath) ? oldRelPath : path.join(process.cwd(), oldRelPath);
    const newAbsPath = path.join(UPLOADS_ROOT, newRelPath);

    if (!fs.existsSync(oldAbsPath)) {
        console.warn(`⚠️ Source file not found: ${oldAbsPath}`);
        return;
    }

    const newDir = path.dirname(newAbsPath);
    if (!fs.existsSync(newDir)) {
        fs.mkdirSync(newDir, { recursive: true });
    }

    try {
        fs.renameSync(oldAbsPath, newAbsPath);
        console.log(`➡️  Moved: ${path.basename(oldAbsPath)}`);
    } catch (err) {
        console.error(`❌ Failed to move ${oldAbsPath}:`, err);
    }
}

migrate();
