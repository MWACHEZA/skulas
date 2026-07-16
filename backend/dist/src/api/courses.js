import { Router } from 'express';
import prisma from '../lib/prisma';
import { requireAuth, requireRole } from '../middleware/auth';
const router = Router();
// Get all courses (with optional filters)
router.get('/', requireAuth, async (req, res) => {
    try {
        const { category, status, classId } = req.query;
        const where = { schoolId: req.user.schoolId };
        // If teacher, only see their own courses
        if (req.user.role === 'TEACHER') {
            where.teacherId = req.user.id;
        }
        if (category && category !== 'All')
            where.category = category;
        if (status && status !== 'All')
            where.status = status;
        if (classId && classId !== 'All')
            where.classId = classId;
        const courses = await prisma.course.findMany({
            where,
            include: {
                class: { select: { name: true } },
                _count: { select: { enrollments: true } }
            },
            orderBy: { createdAt: 'desc' }
        });
        res.json(courses);
    }
    catch (error) {
        console.error('Error fetching courses:', error);
        res.status(500).json({ error: 'Failed to fetch courses' });
    }
});
// Create a new course
router.post('/', requireAuth, requireRole('TEACHER', 'SCHOOL_ADMIN', 'SUPER_ADMIN'), async (req, res) => {
    try {
        const { classId, title, courseType, level, language, category, shortDescription, fullDescription } = req.body;
        if (!classId || !title || !courseType || !level || !language || !category || !shortDescription) {
            return res.status(400).json({ error: 'Missing required fields' });
        }
        const course = await prisma.course.create({
            data: {
                schoolId: req.user.schoolId,
                teacherId: req.user.id,
                classId,
                title,
                courseType,
                level,
                language,
                category,
                shortDescription,
                fullDescription: fullDescription || ''
            }
        });
        res.json(course);
    }
    catch (error) {
        console.error('Error creating course:', error);
        res.status(500).json({ error: 'Failed to create course' });
    }
});
// Enroll a student
router.post('/enroll', requireAuth, requireRole('TEACHER', 'SCHOOL_ADMIN', 'SUPER_ADMIN'), async (req, res) => {
    try {
        const { courseId, studentId } = req.body;
        if (!courseId || !studentId) {
            return res.status(400).json({ error: 'Course and student are required' });
        }
        // Check if already enrolled
        const existing = await prisma.courseEnrollment.findUnique({
            where: {
                courseId_studentId: {
                    courseId,
                    studentId
                }
            }
        });
        if (existing) {
            return res.status(400).json({ error: 'Student is already enrolled in this course' });
        }
        const enrollment = await prisma.courseEnrollment.create({
            data: {
                courseId,
                studentId
            },
            include: {
                student: true
            }
        });
        res.json(enrollment);
    }
    catch (error) {
        console.error('Error enrolling student:', error);
        res.status(500).json({ error: 'Failed to enroll student' });
    }
});
// Get enrollments for a course
router.get('/:courseId/enrollments', requireAuth, async (req, res) => {
    try {
        const { courseId } = req.params;
        const enrollments = await prisma.courseEnrollment.findMany({
            where: { courseId: String(courseId) },
            include: {
                student: {
                    include: {
                        class: { select: { name: true } }
                    }
                }
            },
            orderBy: { enrolledAt: 'desc' }
        });
        res.json(enrollments);
    }
    catch (error) {
        console.error('Error fetching enrollments:', error);
        res.status(500).json({ error: 'Failed to fetch enrollments' });
    }
});
// Get revenue report for a teacher
router.get('/revenue/report', requireAuth, requireRole('TEACHER'), async (req, res) => {
    try {
        const courses = await prisma.course.findMany({
            where: {
                schoolId: req.user.schoolId,
                teacherId: req.user.id,
                isFree: false
            },
            include: {
                _count: { select: { enrollments: true } }
            }
        });
        let totalRevenue = 0;
        courses.forEach(c => {
            totalRevenue += c.price * c._count.enrollments;
        });
        // In a real app, we'd calculate monthly aggregates. Here we'll return a mock monthly breakdown 
        // for the chart based on the total.
        const currentMonth = new Date().getMonth();
        const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
        const monthlyData = [];
        for (let i = 0; i < 12; i++) {
            // Simulate some revenue for past months if there's a total, 
            // heavily weighting recent months.
            let rev = 0;
            if (i <= currentMonth && totalRevenue > 0) {
                rev = Math.round((totalRevenue / (currentMonth + 1)) * (0.5 + Math.random()));
            }
            monthlyData.push({
                name: months[i],
                courseRevenue: rev,
                tutorRevenue: rev * 0.8 // assuming tutor takes 80%
            });
        }
        res.json({
            lifetimeEarnings: totalRevenue,
            thisMonthEarnings: monthlyData[currentMonth]?.courseRevenue || 0,
            monthlyData
        });
    }
    catch (error) {
        console.error('Error fetching revenue report:', error);
        res.status(500).json({ error: 'Failed to fetch revenue report' });
    }
});
export default router;
//# sourceMappingURL=courses.js.map