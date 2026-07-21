"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const prisma_1 = __importDefault(require("../lib/prisma"));
const auth_1 = require("../middleware/auth");
const utils_1 = require("../lib/utils");
const router = (0, express_1.Router)();
/**
 * @route   GET /api/subjects
 * @desc    Get all subjects for the school
 */
router.get('/', auth_1.requireAuth, async (req, res) => {
    const schoolId = req.user.schoolId;
    try {
        const subjects = await prisma_1.default.subject.findMany({
            where: { schoolId },
            include: {
                dept: { select: { name: true } },
                _count: { select: { teachers: true } }
            },
            orderBy: { name: 'asc' }
        });
        res.json(subjects);
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to fetch subjects' });
    }
});
/**
 * @route   POST /api/subjects
 * @desc    Create a new subject
 */
router.post('/', auth_1.requireAuth, (0, auth_1.requireRole)('SCHOOL_ADMIN'), async (req, res) => {
    const { name, code, departmentId, department, credits, isIndustrial, isProject, isSubsidiary, caWeight, examWeight } = req.body;
    const schoolId = req.user.schoolId;
    try {
        const finalCode = code || (0, utils_1.generateShortCode)(name);
        const newSubject = await prisma_1.default.subject.create({
            data: {
                name,
                code: finalCode,
                department,
                departmentId,
                schoolId,
                credits: credits ? parseFloat(credits) : 0,
                isIndustrial: !!isIndustrial,
                isProject: !!isProject,
                isSubsidiary: !!isSubsidiary,
                caWeight: caWeight ? parseFloat(caWeight) : 30,
                examWeight: examWeight ? parseFloat(examWeight) : 70,
                gradingType: req.body.gradingType || "standard"
            }
        });
        res.json(newSubject);
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to create subject' });
    }
});
/**
 * @route   PUT /api/subjects/:id
 * @desc    Update a subject
 */
router.put('/:id', auth_1.requireAuth, (0, auth_1.requireRole)('SCHOOL_ADMIN'), async (req, res) => {
    const { id } = req.params;
    const { name, code, departmentId, department, credits, isIndustrial, isProject, isSubsidiary, caWeight, examWeight } = req.body;
    try {
        const updatedSubject = await prisma_1.default.subject.update({
            where: { id: id },
            data: {
                name,
                code: code || (0, utils_1.generateShortCode)(name),
                department,
                departmentId,
                credits: credits ? parseFloat(credits) : undefined,
                isIndustrial: isIndustrial !== undefined ? !!isIndustrial : undefined,
                isProject: isProject !== undefined ? !!isProject : undefined,
                isSubsidiary: isSubsidiary !== undefined ? !!isSubsidiary : undefined,
                caWeight: caWeight ? parseFloat(caWeight) : undefined,
                examWeight: examWeight ? parseFloat(examWeight) : undefined,
                gradingType: req.body.gradingType
            }
        });
        res.json(updatedSubject);
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to update subject' });
    }
});
/**
 * @route   DELETE /api/subjects/:id
 * @desc    Delete a subject
 */
router.delete('/:id', auth_1.requireAuth, (0, auth_1.requireRole)('SCHOOL_ADMIN'), async (req, res) => {
    const { id } = req.params;
    try {
        await prisma_1.default.subject.delete({ where: { id: id } });
        res.json({ success: true });
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to delete subject' });
    }
});
exports.default = router;
//# sourceMappingURL=subjects.js.map