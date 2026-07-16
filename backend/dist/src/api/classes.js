import { Router } from 'express';
import prisma from '../lib/prisma';
import { requireAuth, requireRole } from '../middleware/auth';
import multer from 'multer';
import * as XLSX from 'xlsx';
const router = Router();
const upload = multer({ storage: multer.memoryStorage() });
/**
 * @route   GET /api/classes
 * @desc    Get all classes for the school
 */
router.get('/', requireAuth, async (req, res) => {
    const schoolId = req.user.schoolId;
    try {
        const classes = await prisma.schoolClass.findMany({
            where: { schoolId },
            include: {
                teacher: { include: { user: { select: { name: true } } } },
                section: true,
                subjectTeachers: {
                    include: {
                        subject: { select: { id: true, name: true, code: true } },
                        teacher: { include: { user: { select: { name: true } } } }
                    }
                },
                students: { select: { id: true, name: true, studentId: true, gender: true } },
                _count: { select: { students: true } }
            },
            orderBy: { name: 'asc' }
        });
        res.json(classes);
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to fetch classes' });
    }
});
/**
 * @route   POST /api/classes
 * @desc    Create a new class
 */
router.post('/', requireAuth, requireRole('SCHOOL_ADMIN'), async (req, res) => {
    const { name, level, teacherId, capacity, sectionId } = req.body;
    const schoolId = req.user.schoolId;
    try {
        const newClass = await prisma.schoolClass.create({
            data: {
                name,
                level,
                capacity: capacity ? parseInt(capacity) : null,
                sectionId: sectionId || null,
                teacherId: teacherId || null,
                schoolId
            }
        });
        res.json(newClass);
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to create class' });
    }
});
/**
 * @route   PUT /api/classes/:id
 * @desc    Update a class
 */
router.put('/:id', requireAuth, requireRole('SCHOOL_ADMIN'), async (req, res) => {
    const { id } = req.params;
    const { name, level, teacherId, capacity, sectionId } = req.body;
    try {
        const updatedClass = await prisma.schoolClass.update({
            where: { id: id },
            data: {
                name,
                level,
                capacity: capacity ? parseInt(capacity) : null,
                sectionId: sectionId || null,
                teacherId: teacherId || null
            }
        });
        res.json(updatedClass);
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to update class' });
    }
});
/**
 * @route   POST /api/classes/bulk-upload
 * @desc    Bulk upload classes from Excel
 */
router.post('/bulk-upload', requireAuth, requireRole('SCHOOL_ADMIN'), upload.single('file'), async (req, res) => {
    if (!req.file)
        return res.status(400).json({ error: 'No file uploaded' });
    const schoolId = req.user.schoolId;
    try {
        const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
        const sheetName = workbook.SheetNames[0];
        const data = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]);
        const classesToCreate = data.map(row => ({
            name: String(row.name || row.Name || ''),
            level: String(row.level || row.Level || 'Form 1'),
            capacity: row.capacity ? parseInt(row.capacity) : null,
            schoolId
        })).filter(c => c.name);
        if (classesToCreate.length === 0)
            return res.status(400).json({ error: 'No valid classes found in sheet' });
        await prisma.schoolClass.createMany({
            data: classesToCreate,
            skipDuplicates: true
        });
        res.json({ message: `Successfully uploaded ${classesToCreate.length} classes` });
    }
    catch (error) {
        console.error('Bulk upload error:', error);
        res.status(500).json({ error: 'Failed to process Excel file' });
    }
});
/**
 * @route   GET /api/classes/sections
 * @desc    Get all sections for the school
 */
router.get('/sections', requireAuth, async (req, res) => {
    const schoolId = req.user.schoolId;
    try {
        const sections = await prisma.section.findMany({
            where: { schoolId },
            orderBy: { name: 'asc' }
        });
        res.json(sections);
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to fetch sections' });
    }
});
/**
 * @route   POST /api/classes/sections
 * @desc    Create a new section
 */
router.post('/sections', requireAuth, requireRole('SCHOOL_ADMIN'), async (req, res) => {
    const { name } = req.body;
    const schoolId = req.user.schoolId;
    try {
        const section = await prisma.section.create({
            data: { name, schoolId }
        });
        res.json(section);
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to create section' });
    }
});
/**
 * @route   DELETE /api/classes/sections/:id
 * @desc    Delete a section
 */
router.delete('/sections/:id', requireAuth, requireRole('SCHOOL_ADMIN'), async (req, res) => {
    const { id } = req.params;
    try {
        await prisma.section.delete({ where: { id: id } });
        res.json({ success: true });
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to delete section' });
    }
});
/**
 * @route   DELETE /api/classes/:id
 * @desc    Delete a class
 */
router.delete('/:id', requireAuth, requireRole('SCHOOL_ADMIN'), async (req, res) => {
    const { id } = req.params;
    try {
        await prisma.schoolClass.delete({ where: { id: id } });
        res.json({ success: true });
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to delete class' });
    }
});
/**
 * @route   POST /api/classes/:id/subject-teachers
 * @desc    Assign a teacher to a subject for this class
 */
router.post('/:id/subject-teachers', requireAuth, requireRole('SCHOOL_ADMIN'), async (req, res) => {
    const { id } = req.params;
    const { subjectId, teacherId } = req.body;
    try {
        const assignment = await prisma.classSubjectTeacher.create({
            data: {
                classId: id,
                subjectId,
                teacherId
            },
            include: {
                subject: { select: { id: true, name: true, code: true } },
                teacher: { include: { user: { select: { name: true } } } }
            }
        });
        res.json(assignment);
    }
    catch (error) {
        if (error.code === 'P2002')
            return res.status(400).json({ error: 'This teacher is already assigned to this subject for this class.' });
        res.status(500).json({ error: 'Failed to assign subject teacher' });
    }
});
/**
 * @route   DELETE /api/classes/:id/subject-teachers/:recordId
 * @desc    Remove a subject teacher assignment
 */
router.delete('/:id/subject-teachers/:recordId', requireAuth, requireRole('SCHOOL_ADMIN'), async (req, res) => {
    const { recordId } = req.params;
    try {
        await prisma.classSubjectTeacher.delete({
            where: { id: recordId }
        });
        res.json({ success: true });
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to remove assignment' });
    }
});
export default router;
//# sourceMappingURL=classes.js.map