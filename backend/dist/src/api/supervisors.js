import { Router } from 'express';
import prisma from '../lib/prisma';
import { requireAuth } from '../middleware/auth';
import { requireFeature } from '../middleware/features';
const router = Router();
/**
 * @route   GET /api/supervisors/my-students
 * @desc    Get students supervised by the current teacher
 */
router.get('/my-students', requireAuth, requireFeature('Research & Thesis Supervision'), async (req, res) => {
    if (req.user.role !== 'TEACHER')
        return res.status(403).json({ error: 'Only teachers can access supervision lists' });
    try {
        const teacher = await prisma.teacher.findUnique({
            where: { userId: req.user.id }
        });
        if (!teacher)
            return res.status(404).json({ error: 'Teacher record not found' });
        const assignments = await prisma.supervisorAssignment.findMany({
            where: {
                teacherId: teacher.id,
                schoolId: req.user.schoolId
            },
            include: {
                student: {
                    include: {
                        progressReports: {
                            orderBy: { submittedAt: 'desc' },
                            take: 1
                        }
                    }
                }
            }
        });
        res.json(assignments);
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to fetch supervised students' });
    }
});
/**
 * @route   POST /api/supervisors/assign
 * @desc    Assign a supervisor to a student (Admin only)
 */
router.post('/assign', requireAuth, requireFeature('Research & Thesis Supervision'), async (req, res) => {
    if (req.user.role !== 'SCHOOL_ADMIN')
        return res.status(403).json({ error: 'Unauthorized' });
    const { studentId, teacherId, role } = req.body;
    try {
        const assignment = await prisma.supervisorAssignment.upsert({
            where: {
                schoolId_studentId_teacherId: {
                    schoolId: req.user.schoolId,
                    studentId,
                    teacherId
                }
            },
            update: { role },
            create: {
                studentId,
                teacherId,
                role,
                schoolId: req.user.schoolId
            }
        });
        res.status(201).json(assignment);
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to assign supervisor' });
    }
});
/**
 * @route   POST /api/supervisors/reports
 * @desc    Submit a progress report (Student) or Review (Supervisor)
 */
router.post('/reports', requireAuth, requireFeature('Research & Thesis Supervision'), async (req, res) => {
    const { studentId, assignmentId, reportPeriod, content, status, supervisorNote } = req.body;
    try {
        if (req.user.role === 'STUDENT') {
            const student = await prisma.student.findUnique({ where: { userId: req.user.id } });
            if (!student || student.id !== studentId)
                return res.status(403).json({ error: 'Unauthorized student' });
            const report = await prisma.progressReport.create({
                data: {
                    studentId,
                    assignmentId,
                    reportPeriod,
                    content,
                    schoolId: req.user.schoolId,
                    status: 'SUBMITTED'
                }
            });
            return res.status(201).json(report);
        }
        if (req.user.role === 'TEACHER') {
            const reportId = req.body.reportId;
            const report = await prisma.progressReport.update({
                where: {
                    id: reportId,
                    schoolId: req.user.schoolId
                },
                data: {
                    status,
                    supervisorNote,
                    reviewedAt: new Date()
                }
            });
            return res.json(report);
        }
        res.status(403).json({ error: 'Role not supported for reports' });
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to process progress report' });
    }
});
export default router;
//# sourceMappingURL=supervisors.js.map