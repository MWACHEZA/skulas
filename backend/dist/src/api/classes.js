"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const prisma_1 = __importDefault(require("../lib/prisma"));
const auth_1 = require("../middleware/auth");
const multer_1 = __importDefault(require("multer"));
const xlsx_utils_1 = require("../lib/xlsx-utils");
const router = (0, express_1.Router)();
const upload = (0, multer_1.default)({ storage: multer_1.default.memoryStorage() });
/**
 * @route   GET /api/classes
 * @desc    Get all classes for the school
 */
router.get('/', auth_1.requireAuth, async (req, res) => {
    const schoolId = req.user.schoolId;
    try {
        const classes = await prisma_1.default.schoolClass.findMany({
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
router.post('/', auth_1.requireAuth, (0, auth_1.requireRole)('SCHOOL_ADMIN'), async (req, res) => {
    const { name, level, teacherId, capacity, sectionId } = req.body;
    const schoolId = req.user.schoolId;
    try {
        const newClass = await prisma_1.default.schoolClass.create({
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
router.put('/:id', auth_1.requireAuth, (0, auth_1.requireRole)('SCHOOL_ADMIN'), async (req, res) => {
    const { id } = req.params;
    const { name, level, teacherId, capacity, sectionId } = req.body;
    try {
        const updatedClass = await prisma_1.default.schoolClass.update({
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
 * @route   GET /api/classes/template
 * @desc    Download the Excel template for class imports
 */
router.get('/template', auth_1.requireAuth, (0, auth_1.requireRole)('SCHOOL_ADMIN'), async (req, res) => {
    try {
        const buffer = await (0, xlsx_utils_1.generateClassTemplateBuffer)();
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', 'attachment; filename=class_import_template.xlsx');
        res.send(buffer);
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to generate template' });
    }
});
/**
 * @route   POST /api/classes/bulk-upload
 * @desc    Bulk upload classes from Excel
 */
router.post('/bulk-upload', auth_1.requireAuth, (0, auth_1.requireRole)('SCHOOL_ADMIN'), upload.single('file'), async (req, res) => {
    if (!req.file)
        return res.status(400).json({ error: 'No file uploaded' });
    const schoolId = req.user.schoolId;
    try {
        const data = (await (0, xlsx_utils_1.parseExcelBuffer)(req.file.buffer));
        const classesToCreate = data.map((row, index) => ({
            name: String(row.name || row.Name || '').trim(),
            level: String(row.level || row.Level || 'Form 1').trim(),
            capacity: row.capacity || row.Capacity ? parseInt(row.capacity || row.Capacity) : null,
            schoolId,
            _rowIndex: index + 2
        })).filter(c => c.name);
        if (classesToCreate.length === 0)
            return res.status(400).json({ error: 'No valid classes found in sheet' });
        const results = {
            created: 0,
            errors: []
        };
        await prisma_1.default.$transaction(async (tx) => {
            for (const row of classesToCreate) {
                try {
                    const existing = await tx.schoolClass.findUnique({
                        where: {
                            schoolId_name: {
                                schoolId,
                                name: row.name
                            }
                        }
                    });
                    if (existing) {
                        results.errors.push(`Row ${row._rowIndex}: Class "${row.name}" already exists.`);
                        continue;
                    }
                    await tx.schoolClass.create({
                        data: {
                            name: row.name,
                            level: row.level,
                            capacity: row.capacity,
                            schoolId
                        }
                    });
                    results.created++;
                }
                catch (err) {
                    results.errors.push(`Row ${row._rowIndex}: ${err.message}`);
                }
            }
            if (results.errors.length > 0) {
                const err = new Error('IMPORT_VALIDATION_FAILED');
                err.details = results;
                throw err;
            }
        });
        res.json({ success: true, message: `Successfully uploaded ${results.created} classes`, details: results });
    }
    catch (error) {
        if (error.message === 'IMPORT_VALIDATION_FAILED') {
            return res.status(400).json({ error: 'Bulk upload failed due to validation errors', details: error.details });
        }
        console.error('Bulk upload error:', error);
        res.status(500).json({ error: 'Failed to process Excel file' });
    }
});
/**
 * @route   GET /api/classes/sections
 * @desc    Get all sections for the school
 */
router.get('/sections', auth_1.requireAuth, async (req, res) => {
    const schoolId = req.user.schoolId;
    try {
        const sections = await prisma_1.default.section.findMany({
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
router.post('/sections', auth_1.requireAuth, (0, auth_1.requireRole)('SCHOOL_ADMIN'), async (req, res) => {
    const { name } = req.body;
    const schoolId = req.user.schoolId;
    try {
        const section = await prisma_1.default.section.create({
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
router.delete('/sections/:id', auth_1.requireAuth, (0, auth_1.requireRole)('SCHOOL_ADMIN'), async (req, res) => {
    const { id } = req.params;
    try {
        await prisma_1.default.section.delete({ where: { id: id } });
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
router.delete('/:id', auth_1.requireAuth, (0, auth_1.requireRole)('SCHOOL_ADMIN'), async (req, res) => {
    const { id } = req.params;
    try {
        await prisma_1.default.schoolClass.delete({ where: { id: id } });
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
router.post('/:id/subject-teachers', auth_1.requireAuth, (0, auth_1.requireRole)('SCHOOL_ADMIN'), async (req, res) => {
    const { id } = req.params;
    const { subjectId, teacherId } = req.body;
    try {
        const assignment = await prisma_1.default.classSubjectTeacher.create({
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
router.delete('/:id/subject-teachers/:recordId', auth_1.requireAuth, (0, auth_1.requireRole)('SCHOOL_ADMIN'), async (req, res) => {
    const { recordId } = req.params;
    try {
        await prisma_1.default.classSubjectTeacher.delete({
            where: { id: recordId }
        });
        res.json({ success: true });
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to remove assignment' });
    }
});
exports.default = router;
//# sourceMappingURL=classes.js.map