"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const prisma_1 = __importDefault(require("../lib/prisma"));
const auth_1 = require("../middleware/auth");
const file_utils_1 = require("../lib/file-utils");
const router = (0, express_1.Router)();
// Get study materials (students can see their class materials, teachers see what they uploaded)
router.get('/', auth_1.requireAuth, async (req, res) => {
    try {
        const where = { schoolId: req.user.schoolId };
        if (req.user.role === 'TEACHER') {
            where.teacherId = req.user.id;
        }
        else if (req.user.role === 'STUDENT') {
            const student = await prisma_1.default.student.findFirst({
                where: { userId: req.user.id }
            });
            if (student?.classId) {
                where.classId = student.classId;
            }
        }
        const materials = await prisma_1.default.studyMaterial.findMany({
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
router.post('/', auth_1.requireAuth, (0, auth_1.requireRole)('TEACHER', 'SCHOOL_ADMIN', 'SUPER_ADMIN'), async (req, res) => {
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
            const teacher = await prisma_1.default.teacher.findFirst({
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
            const savedPath = (0, file_utils_1.saveBase64Image)(documentBase64, 'study-material', 'academic/documents', req.user.schoolId, 'teacher', req.user.id);
            if (savedPath) {
                documentUrl = `/api/storage/file/${savedPath}`;
            }
        }
        const created = [];
        for (const cId of targetClassIds) {
            const material = await prisma_1.default.studyMaterial.create({
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
router.delete('/:id', auth_1.requireAuth, (0, auth_1.requireRole)('TEACHER', 'SCHOOL_ADMIN', 'SUPER_ADMIN'), async (req, res) => {
    try {
        const { id } = req.params;
        const materialId = String(id);
        const material = await prisma_1.default.studyMaterial.findFirst({ where: { id: materialId } });
        if (!material)
            return res.status(404).json({ error: 'Not found' });
        if (req.user.role === 'TEACHER' && material.teacherId !== req.user.id) {
            return res.status(403).json({ error: 'Forbidden' });
        }
        await prisma_1.default.studyMaterial.delete({ where: { id: materialId } });
        res.json({ success: true });
    }
    catch (error) {
        console.error('Error deleting study material:', error);
        res.status(500).json({ error: 'Failed to delete study material' });
    }
});
exports.default = router;
//# sourceMappingURL=study-materials.js.map