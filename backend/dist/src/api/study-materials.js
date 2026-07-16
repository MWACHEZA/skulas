import { Router } from 'express';
import prisma from '../lib/prisma';
import { requireAuth, requireRole } from '../middleware/auth';
import { saveBase64Image } from '../lib/file-utils';
const router = Router();
// Get study materials (students can see their class materials, teachers see what they uploaded)
router.get('/', requireAuth, async (req, res) => {
    try {
        const where = { schoolId: req.user.schoolId };
        if (req.user.role === 'TEACHER') {
            where.teacherId = req.user.id;
        }
        else if (req.user.role === 'STUDENT') {
            const student = await prisma.student.findUnique({
                where: { userId: req.user.id }
            });
            if (student?.classId) {
                where.classId = student.classId;
            }
        }
        const materials = await prisma.studyMaterial.findMany({
            where,
            include: {
                class: { select: { name: true } },
                subject: { select: { name: true } },
                teacher: { select: { name: true } }
            },
            orderBy: { createdAt: 'desc' }
        });
        res.json(materials);
    }
    catch (error) {
        console.error('Error fetching study materials:', error);
        res.status(500).json({ error: 'Failed to fetch study materials' });
    }
});
// Upload study material
router.post('/', requireAuth, requireRole('TEACHER', 'SCHOOL_ADMIN', 'SUPER_ADMIN'), async (req, res) => {
    try {
        const { title, date, classId, classIds, subjectId, description, documentBase64, videoUrl } = req.body;
        const targetClassIds = Array.isArray(classIds) && classIds.length > 0
            ? classIds
            : (classId ? [classId] : []);
        if (!title || !date || targetClassIds.length === 0 || !subjectId) {
            return res.status(400).json({ error: 'Missing required fields' });
        }
        // Enforce that teachers can only upload study materials for subjects assigned to them
        if (req.user.role === 'TEACHER') {
            const teacher = await prisma.teacher.findUnique({
                where: { userId: req.user.id },
                include: { subjects: true }
            });
            if (!teacher) {
                return res.status(403).json({ error: 'Teacher record not found' });
            }
            const assignedIds = teacher.subjects.map(s => s.subjectId);
            if (!assignedIds.includes(subjectId)) {
                return res.status(403).json({ error: 'You can only upload study materials for subjects assigned to you.' });
            }
        }
        let documentUrl = videoUrl || null;
        if (documentBase64) {
            const savedPath = saveBase64Image(documentBase64, 'study-material', 'academic/documents', req.user.schoolId, 'teacher', req.user.id);
            if (savedPath) {
                documentUrl = `/api/storage/file/${savedPath}`;
            }
        }
        const created = [];
        for (const cId of targetClassIds) {
            const material = await prisma.studyMaterial.create({
                data: {
                    schoolId: req.user.schoolId,
                    title,
                    date: new Date(date),
                    classId: cId,
                    subjectId,
                    teacherId: req.user.id,
                    description: description || '',
                    documentUrl
                },
                include: {
                    class: { select: { name: true } },
                    subject: { select: { name: true } },
                    teacher: { select: { name: true } }
                }
            });
            created.push(material);
        }
        res.json(created[0]);
    }
    catch (error) {
        console.error('Error uploading study material:', error);
        res.status(500).json({ error: 'Failed to upload study material' });
    }
});
// Delete study material
router.delete('/:id', requireAuth, requireRole('TEACHER', 'SCHOOL_ADMIN', 'SUPER_ADMIN'), async (req, res) => {
    try {
        const { id } = req.params;
        const materialId = String(id);
        const material = await prisma.studyMaterial.findUnique({ where: { id: materialId } });
        if (!material)
            return res.status(404).json({ error: 'Not found' });
        if (req.user.role === 'TEACHER' && material.teacherId !== req.user.id) {
            return res.status(403).json({ error: 'Forbidden' });
        }
        await prisma.studyMaterial.delete({ where: { id: materialId } });
        res.json({ success: true });
    }
    catch (error) {
        console.error('Error deleting study material:', error);
        res.status(500).json({ error: 'Failed to delete study material' });
    }
});
export default router;
//# sourceMappingURL=study-materials.js.map