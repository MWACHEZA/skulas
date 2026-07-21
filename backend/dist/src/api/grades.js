"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const prisma_1 = __importDefault(require("../lib/prisma"));
const auth_1 = require("../middleware/auth");
const audit_1 = require("../utils/audit");
const router = (0, express_1.Router)();
/**
 * @route   GET /api/grades/class/:classId
 * @desc    Get grades for all students in a class for a specific subject
 */
router.get('/class/:classId', auth_1.requireAuth, (0, auth_1.requireRole)('TEACHER', 'SCHOOL_ADMIN'), async (req, res) => {
    const classId = req.params.classId;
    const { subjectId, term, year } = req.query;
    try {
        const grades = await prisma_1.default.grade.findMany({
            where: {
                student: { classId },
                subjectId: subjectId,
                term: term,
                year: parseInt(year)
            },
            include: {
                student: { select: { id: true, name: true, studentId: true } }
            }
        });
        res.json(grades);
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to fetch grades' });
    }
});
/**
 * @route   GET /api/grades/subject/:classId/:subjectId
 * @desc    Get students and their grades for a specific class subject
 */
router.get('/subject/:classId/:subjectId', auth_1.requireAuth, (0, auth_1.requireRole)('TEACHER', 'SCHOOL_ADMIN'), async (req, res) => {
    const { classId, subjectId } = req.params;
    const { term, year } = req.query;
    const schoolId = req.user.schoolId;
    try {
        const students = await prisma_1.default.student.findMany({
            where: { classId: String(classId), schoolId: String(schoolId) },
            include: {
                grades: {
                    where: {
                        subjectId: String(subjectId),
                        term: String(term),
                        year: parseInt(String(year))
                    }
                }
            },
            orderBy: { name: 'asc' }
        });
        res.json(students);
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to fetch subject grades' });
    }
});
/**
 * @route   POST /api/grades/bulk
 * @desc    Bulk save/update grades for a class
 */
router.post('/bulk', auth_1.requireAuth, (0, auth_1.requireRole)('TEACHER', 'SCHOOL_ADMIN'), async (req, res) => {
    const { classId, subjectId, term, year, results } = req.body;
    const schoolId = req.user.schoolId;
    try {
        const teacher = await prisma_1.default.teacher.findFirst({
            where: { userId: req.user.id, schoolId }
        });
        if (!teacher)
            return res.status(404).json({ error: 'Teacher record not found' });
        // Validate subject to get weights
        const subject = await prisma_1.default.subject.findFirst({
            where: { id: subjectId, schoolId }
        });
        if (!subject)
            return res.status(404).json({ error: 'Subject not found' });
        // Fetch school's custom grading scale
        const gradingScale = await prisma_1.default.gradingScale.findMany({
            where: { schoolId },
            orderBy: { maxScore: 'desc' }
        });
        const operations = results.map((res) => {
            // Calculate total score based on weights
            let totalScore = 0;
            if (subject.isIndustrial) {
                const ind = res.industrialScores || {};
                const ca = ((ind.industrialSup || 0) + (ind.academicSup || 0)) / 2;
                totalScore = (ca * 0.5) + ((ind.report || 0) * 0.4) + ((ind.oral || 0) * 0.1);
            }
            else {
                const caScore = res.caScore || 0;
                const examScore = res.examScore || 0;
                const caWeight = subject.caWeight || 30;
                const examWeight = subject.examWeight || 70;
                totalScore = (caScore * (caWeight / 100)) + (examScore * (examWeight / 100));
            }
            // Determine division/grade dynamically from grading scale
            let division = 'Fail';
            if (gradingScale && gradingScale.length > 0) {
                // Find matching grade in the scale
                const match = gradingScale.find((scale) => totalScore >= scale.minScore && totalScore <= scale.maxScore);
                if (match) {
                    division = match.grade;
                }
                else {
                    // Fallback if score is outside any defined range (e.g. extremely low)
                    division = 'F';
                }
            }
            else {
                // Fallback to standard standard logic if no scale defined
                if (totalScore >= 75)
                    division = 'A';
                else if (totalScore >= 65)
                    division = 'B';
                else if (totalScore >= 50)
                    division = 'C';
                else if (totalScore >= 40)
                    division = 'D';
            }
            return prisma_1.default.grade.upsert({
                where: {
                    schoolId_studentId_subjectId_term_year: {
                        schoolId,
                        studentId: res.studentId,
                        subjectId,
                        term,
                        year: parseInt(year)
                    }
                },
                update: {
                    score: totalScore,
                    grade: division,
                    caScore: parseFloat(res.caScore) || 0,
                    examScore: parseFloat(res.examScore) || 0,
                    comment: res.comment,
                    teacherId: teacher.id
                },
                create: {
                    studentId: res.studentId,
                    subjectId,
                    term,
                    year: parseInt(year),
                    score: totalScore,
                    grade: division,
                    caScore: parseFloat(res.caScore) || 0,
                    examScore: parseFloat(res.examScore) || 0,
                    comment: res.comment,
                    teacherId: teacher.id,
                    schoolId
                }
            });
        });
        // Fetch existing grades before updating for audit logging
        const existingGrades = await prisma_1.default.grade.findMany({
            where: {
                schoolId,
                subjectId,
                term,
                year: parseInt(year),
                studentId: { in: results.map((r) => r.studentId) }
            }
        });
        const existingGradesMap = new Map(existingGrades.map(g => [g.studentId, g]));
        await prisma_1.default.$transaction(operations);
        // Audit Log Grade Changes
        for (const resItem of results) {
            const existing = existingGradesMap.get(resItem.studentId);
            const newScore = parseFloat(resItem.caScore || 0) + parseFloat(resItem.examScore || 0); // approx
            const changes = {
                subjectId,
                term,
                year,
                studentId: resItem.studentId,
                previousValues: existing ? {
                    caScore: existing.caScore,
                    examScore: existing.examScore,
                    score: existing.score,
                    grade: existing.grade
                } : null,
                newValues: {
                    caScore: parseFloat(resItem.caScore) || 0,
                    examScore: parseFloat(resItem.examScore) || 0,
                    comment: resItem.comment
                }
            };
            // Only log if something meaningfully changed or if it's new
            if (!existing || existing.caScore !== changes.newValues.caScore || existing.examScore !== changes.newValues.examScore) {
                await (0, audit_1.logAction)(req, existing ? 'UPDATE_GRADE' : 'CREATE_GRADE', 'Grade', existing ? existing.id : 'bulk-new', changes);
            }
        }
        const studentIds = results.map((r) => r.studentId);
        // Find students who have an existing snapshot for this term
        const existingReports = await prisma_1.default.academicReport.findMany({
            where: {
                schoolId,
                term,
                year: year.toString(),
                studentId: { in: studentIds }
            }
        });
        if (existingReports.length > 0) {
            const gteDate = term === 'Term 1' ? new Date(`${year}-01-01`) :
                term === 'Term 2' ? new Date(`${year}-05-01`) :
                    term === 'Term 3' ? new Date(`${year}-09-01`) :
                        new Date(`${year}-01-01`);
            const lteDate = term === 'Term 1' ? new Date(`${year}-04-30`) :
                term === 'Term 2' ? new Date(`${year}-08-31`) :
                    term === 'Term 3' ? new Date(`${year}-12-31`) :
                        new Date(`${year}-12-31`);
            const studentsData = await prisma_1.default.user.findMany({
                where: { id: { in: existingReports.map(r => r.studentId) } },
                include: {
                    student: {
                        include: {
                            class: true,
                            grades: { where: { term: term, year: parseInt(year) } },
                            attendance: { where: { date: { gte: gteDate, lte: lteDate } } }
                        }
                    }
                }
            });
            const updateOps = studentsData.map(studentData => {
                return prisma_1.default.academicReport.updateMany({
                    where: { studentId: studentData.id, term, year: year.toString(), schoolId },
                    data: { data: studentData }
                });
            });
            await prisma_1.default.$transaction(updateOps);
        }
        res.json({ success: true });
    }
    catch (error) {
        console.error('Bulk grade save error:', error);
        res.status(500).json({ error: 'Failed to save grades: ' + error.message });
    }
});
exports.default = router;
//# sourceMappingURL=grades.js.map