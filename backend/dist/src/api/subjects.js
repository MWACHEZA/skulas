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
 * @desc    Get all subjects for the school with live active teachers and creator
 */
router.get('/', auth_1.requireAuth, async (req, res) => {
    const schoolId = req.user.schoolId;
    try {
        const subjects = await prisma_1.default.subject.findMany({
            where: { schoolId },
            include: {
                dept: { select: { id: true, name: true, code: true } },
                createdBy: { select: { id: true, name: true, email: true, role: true } },
                teachers: {
                    include: {
                        teacher: {
                            include: {
                                user: { select: { id: true, name: true, email: true } }
                            }
                        }
                    }
                },
                classTeachers: {
                    include: {
                        teacher: {
                            include: {
                                user: { select: { id: true, name: true, email: true } }
                            }
                        },
                        class: { select: { id: true, name: true } }
                    }
                }
            },
            orderBy: { name: 'asc' }
        });
        let currentTeacherId = null;
        if (req.user.role === 'TEACHER') {
            const currentTeacher = await prisma_1.default.teacher.findFirst({
                where: { userId: req.user.id, schoolId }
            });
            if (currentTeacher) {
                currentTeacherId = currentTeacher.id;
            }
        }
        const formatted = subjects.map(sub => {
            // Map and deduplicate active teachers
            const teacherMap = new Map();
            // From direct assignments (TeacherSubject)
            sub.teachers.forEach(ts => {
                if (ts.teacher && ts.teacher.user) {
                    teacherMap.set(ts.teacher.id, {
                        id: ts.teacher.id,
                        name: ts.teacher.user.name,
                        email: ts.teacher.user.email,
                        classes: []
                    });
                }
            });
            // From class assignments (ClassSubjectTeacher)
            sub.classTeachers.forEach(cst => {
                if (cst.teacher && cst.teacher.user) {
                    const existing = teacherMap.get(cst.teacher.id);
                    const className = cst.class?.name || '';
                    if (existing) {
                        if (className && !existing.classes.includes(className)) {
                            existing.classes.push(className);
                        }
                    }
                    else {
                        teacherMap.set(cst.teacher.id, {
                            id: cst.teacher.id,
                            name: cst.teacher.user.name,
                            email: cst.teacher.user.email,
                            classes: className ? [className] : []
                        });
                    }
                }
            });
            const activeTeachers = Array.from(teacherMap.values());
            const isAssignedToCaller = currentTeacherId ? teacherMap.has(currentTeacherId) : false;
            const canEdit = req.user.role === 'SCHOOL_ADMIN' || req.user.role === 'SUPER_ADMIN' || isAssignedToCaller;
            return {
                ...sub,
                creator: sub.createdBy ? {
                    id: sub.createdBy.id,
                    name: sub.createdBy.name,
                    role: sub.createdBy.role
                } : null,
                activeTeachers,
                _count: {
                    teachers: activeTeachers.length
                },
                canEdit,
                isAssignedToCaller
            };
        });
        res.json(formatted);
    }
    catch (error) {
        console.error('Failed to fetch subjects:', error);
        res.status(500).json({ error: 'Failed to fetch subjects' });
    }
});
/**
 * @route   POST /api/subjects
 * @desc    Create a new subject (Admin or Teacher)
 */
router.post('/', auth_1.requireAuth, (0, auth_1.requireRole)('SCHOOL_ADMIN', 'TEACHER', 'SUPER_ADMIN'), async (req, res) => {
    const { name, code, departmentId, department, credits, isIndustrial, isProject, isSubsidiary, caWeight, examWeight } = req.body;
    const schoolId = req.user.schoolId;
    try {
        const finalCode = code || (0, utils_1.generateShortCode)(name);
        const newSubject = await prisma_1.default.subject.create({
            data: {
                name,
                code: finalCode,
                department,
                departmentId: departmentId || null,
                schoolId,
                createdById: req.user.id,
                credits: credits ? parseFloat(credits) : 0,
                isIndustrial: !!isIndustrial,
                isProject: !!isProject,
                isSubsidiary: !!isSubsidiary,
                caWeight: caWeight ? parseFloat(caWeight) : 30,
                examWeight: examWeight ? parseFloat(examWeight) : 70,
                gradingType: req.body.gradingType || "standard"
            },
            include: {
                dept: { select: { id: true, name: true, code: true } },
                createdBy: { select: { id: true, name: true, role: true } }
            }
        });
        res.json(newSubject);
    }
    catch (error) {
        console.error('Failed to create subject:', error);
        res.status(500).json({ error: 'Failed to create subject' });
    }
});
/**
 * @route   PUT /api/subjects/:id
 * @desc    Update a subject (Admin or formally assigned Teacher only)
 */
router.put('/:id', auth_1.requireAuth, (0, auth_1.requireRole)('SCHOOL_ADMIN', 'TEACHER', 'SUPER_ADMIN'), async (req, res) => {
    const { id } = req.params;
    const schoolId = req.user.schoolId;
    const { name, code, departmentId, department, credits, isIndustrial, isProject, isSubsidiary, caWeight, examWeight } = req.body;
    try {
        const existingSubject = await prisma_1.default.subject.findFirst({
            where: { id: id, schoolId }
        });
        if (!existingSubject) {
            return res.status(404).json({ error: 'Subject not found' });
        }
        // API-Level Authorization: If caller is a TEACHER, verify formal assignment
        if (req.user.role === 'TEACHER') {
            const teacher = await prisma_1.default.teacher.findFirst({
                where: { userId: req.user.id, schoolId }
            });
            if (!teacher) {
                return res.status(403).json({ error: 'Teacher profile record not found' });
            }
            const [directAssignment, classAssignment] = await Promise.all([
                prisma_1.default.teacherSubject.findFirst({
                    where: { subjectId: id, teacherId: teacher.id }
                }),
                prisma_1.default.classSubjectTeacher.findFirst({
                    where: { subjectId: id, teacherId: teacher.id }
                })
            ]);
            if (!directAssignment && !classAssignment) {
                return res.status(403).json({
                    error: 'Permission denied: A teacher can only edit a subject if formally assigned to teach that subject by the administrator or Head of Department.'
                });
            }
        }
        const updatedSubject = await prisma_1.default.subject.update({
            where: { id: id },
            data: {
                name,
                code: code || (name ? (0, utils_1.generateShortCode)(name) : undefined),
                department,
                departmentId: departmentId || null,
                credits: credits !== undefined ? parseFloat(credits) : undefined,
                isIndustrial: isIndustrial !== undefined ? !!isIndustrial : undefined,
                isProject: isProject !== undefined ? !!isProject : undefined,
                isSubsidiary: isSubsidiary !== undefined ? !!isSubsidiary : undefined,
                caWeight: caWeight !== undefined ? parseFloat(caWeight) : undefined,
                examWeight: examWeight !== undefined ? parseFloat(examWeight) : undefined,
                gradingType: req.body.gradingType
            }
        });
        res.json(updatedSubject);
    }
    catch (error) {
        console.error('Failed to update subject:', error);
        res.status(500).json({ error: 'Failed to update subject' });
    }
});
/**
 * @route   DELETE /api/subjects/:id
 * @desc    Delete a subject (Admin only)
 */
router.delete('/:id', auth_1.requireAuth, (0, auth_1.requireRole)('SCHOOL_ADMIN', 'SUPER_ADMIN'), async (req, res) => {
    const { id } = req.params;
    const schoolId = req.user.schoolId;
    try {
        const existing = await prisma_1.default.subject.findFirst({ where: { id: id, schoolId } });
        if (!existing) {
            return res.status(404).json({ error: 'Subject not found' });
        }
        await prisma_1.default.subject.delete({ where: { id: id } });
        res.json({ success: true });
    }
    catch (error) {
        console.error('Failed to delete subject:', error);
        res.status(500).json({ error: 'Failed to delete subject' });
    }
});
exports.default = router;
//# sourceMappingURL=subjects.js.map