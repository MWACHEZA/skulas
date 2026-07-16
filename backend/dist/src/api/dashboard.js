import { Router } from 'express';
import prisma from '../lib/prisma';
import { requireAuth } from '../middleware/auth';
const router = Router();
/**
 * @route   GET /api/dashboard/admin
 * @desc    Aggregated stats for the admin portal
 */
router.get('/admin', requireAuth, async (req, res) => {
    const schoolId = req.user.schoolId;
    try {
        // 1. Core aggregates - use individual try-catches if specific counts are non-critical
        const [totalStudents, totalTeachers, pendingApplications, reportsCount] = await Promise.all([
            prisma.student.count({ where: { schoolId } }).catch(() => 0),
            prisma.teacher.count({ where: { schoolId } }).catch(() => 0),
            prisma.application.count({ where: { schoolId, status: 'pending' } }).catch(() => 0),
            prisma.academicReport.count({ where: { schoolId } }).catch(() => 0),
        ]);
        // 2. Financial aggregation
        let totalRevenue = 0;
        try {
            const revAgg = await prisma.fee.aggregate({
                where: { student: { schoolId } },
                _sum: { paid: true }
            });
            totalRevenue = revAgg._sum.paid ?? 0;
        }
        catch (e) {
            console.error('[Dashboard] Revenue aggregation failed:', e);
        }
        // 3. Announcements & Recent Apps
        const announcements = await prisma.announcement.findMany({
            where: { schoolId },
            orderBy: { publishedAt: 'desc' },
            take: 5
        }).catch(() => []);
        const recentApplications = await prisma.application.findMany({
            where: { schoolId },
            orderBy: { createdAt: 'desc' },
            take: 5,
        }).catch(() => []);
        res.json({
            stats: {
                totalStudents,
                totalTeachers,
                pendingApplications,
                totalRevenue,
                reportsCount,
            },
            recentApplications,
            announcements,
        });
    }
    catch (e) {
        console.error('[Dashboard] Fatal fetch error:', e);
        res.status(500).json({ error: 'Failed to fetch admin dashboard' });
    }
});
/**
 * @route   GET /api/dashboard/teacher
 * @desc    Aggregated stats for the teacher portal
 */
router.get('/teacher', requireAuth, async (req, res) => {
    const userId = req.user.id;
    try {
        const teacher = await prisma.teacher.findUnique({
            where: { userId },
            include: {
                classes: { include: { _count: { select: { students: true } } } },
                subjectClasses: {
                    include: {
                        class: { include: { _count: { select: { students: true } } } },
                        subject: true
                    }
                },
                assignments: { where: { isAccepting: true }, include: { subject: true }, orderBy: { dueDate: 'asc' }, take: 5 },
            },
        });
        if (!teacher)
            return res.status(404).json({ error: 'Teacher record not found' });
        // Aggregate classes from both homeroom and subject roles
        const classMap = new Map();
        teacher.classes.forEach(c => classMap.set(c.id, { ...c, role: 'Class Teacher' }));
        teacher.subjectClasses.forEach(sc => {
            if (!classMap.has(sc.classId)) {
                classMap.set(sc.classId, { ...sc.class, role: `Subject Teacher (${sc.subject.name})` });
            }
        });
        const aggregatedClasses = Array.from(classMap.values());
        const totalStudents = aggregatedClasses.reduce((s, c) => s + c._count.students, 0);
        const announcements = await prisma.announcement.findMany({
            where: { schoolId: req.user.schoolId, targetRole: { in: ['ALL', 'TEACHER'] } },
            orderBy: { publishedAt: 'desc' },
            take: 5,
        });
        res.json({
            stats: {
                totalClasses: aggregatedClasses.length,
                totalStudents,
                totalSubjects: teacher.subjectClasses.length,
                activeAssignments: teacher.assignments.length,
            },
            classes: aggregatedClasses,
            subjects: teacher.subjectClasses.map(sc => sc.subject),
            upcomingAssignments: teacher.assignments,
            announcements,
        });
    }
    catch (e) {
        console.error(e);
        res.status(500).json({ error: 'Failed to fetch teacher dashboard' });
    }
});
/**
 * @route   GET /api/dashboard/bursar
 * @desc    Financial stats for bursar portal
 */
router.get('/bursar', requireAuth, async (req, res) => {
    const schoolId = req.user.schoolId;
    try {
        const [feeStats, studentCount, recentFees] = await Promise.all([
            prisma.fee.groupBy({
                by: ['status'],
                where: { student: { schoolId } },
                _count: true,
                _sum: { amount: true, paid: true },
            }),
            prisma.student.count({ where: { schoolId } }),
            prisma.fee.findMany({
                where: { student: { schoolId } },
                include: { student: { select: { name: true, studentId: true } } },
                orderBy: { createdAt: 'desc' },
                take: 10,
            }),
        ]);
        const totalBilled = feeStats.reduce((s, f) => s + (f._sum.amount ?? 0), 0);
        const totalPaid = feeStats.reduce((s, f) => s + (f._sum.paid ?? 0), 0);
        const totalOutstanding = totalBilled - totalPaid;
        res.json({
            stats: { totalBilled, totalPaid, totalOutstanding, studentCount },
            feesByStatus: feeStats,
            recentFees,
        });
    }
    catch (e) {
        console.error(e);
        res.status(500).json({ error: 'Failed to fetch bursar dashboard' });
    }
});
/**
 * @route   GET /api/dashboard/library
 * @desc    Library stats for librarian portal
 */
router.get('/library', requireAuth, async (req, res) => {
    const schoolId = req.user.schoolId;
    try {
        const [totalBooks, totalLoans, overdueLoans] = await Promise.all([
            prisma.book.count({ where: { schoolId } }),
            prisma.bookLoan.count({ where: { book: { schoolId }, status: 'borrowed' } }),
            prisma.bookLoan.count({
                where: { book: { schoolId }, status: 'borrowed', dueDate: { lt: new Date() } },
            }),
        ]);
        const recentLoans = await prisma.bookLoan.findMany({
            where: { book: { schoolId } },
            include: {
                student: { select: { name: true } },
                book: { select: { title: true, author: true } }
            },
            orderBy: { borrowedAt: 'desc' },
            take: 5
        });
        // 1. Category Data
        const categories = await prisma.libraryCategory.findMany({
            where: { schoolId },
            include: { _count: { select: { books: true } } }
        });
        const categoryData = categories.map((cat, i) => {
            const colors = ['#8b5cf6', '#ec4899', '#3b82f6', '#10b981', '#f59e0b', '#6366f1'];
            return {
                name: cat.name,
                count: cat._count.books,
                color: colors[i % colors.length]
            };
        });
        // 2. Lending Trends (Last 7 Days)
        const last7Days = Array.from({ length: 7 }).map((_, i) => {
            const d = new Date();
            d.setDate(d.getDate() - (6 - i));
            return d;
        });
        const lendingTrends = await Promise.all(last7Days.map(async (date) => {
            const startOfDay = new Date(date.setHours(0, 0, 0, 0));
            const endOfDay = new Date(date.setHours(23, 59, 59, 999));
            const count = await prisma.bookLoan.count({
                where: {
                    book: { schoolId },
                    borrowedAt: { gte: startOfDay, lte: endOfDay }
                }
            });
            return {
                name: startOfDay.toLocaleDateString('en-US', { weekday: 'short' }),
                loans: count
            };
        }));
        // 3. Trending Books
        const popularLoans = await prisma.bookLoan.groupBy({
            by: ['bookId'],
            where: { book: { schoolId } },
            _count: { bookId: true },
            orderBy: { _count: { bookId: 'desc' } },
            take: 3
        });
        const trendingBooks = await Promise.all(popularLoans.map(async (loan) => {
            const book = await prisma.book.findUnique({ where: { id: loan.bookId } });
            return {
                id: book?.id,
                title: book?.title,
                author: book?.author,
                borrows: loan._count.bookId,
                cover: book?.coverUrl || null
            };
        }));
        res.json({
            totalBooks,
            activeLoans: totalLoans,
            overdueLoans,
            recentLoans: recentLoans.map(l => ({
                ...l,
                borrowedAt: l.borrowedAt.toISOString(),
                dueDate: l.dueDate.toISOString(),
                returnedAt: l.returnedAt?.toISOString()
            })),
            categoryData,
            lendingTrends,
            trendingBooks
        });
    }
    catch (e) {
        console.error(e);
        res.status(500).json({ error: 'Failed to fetch library dashboard' });
    }
});
/**
 * @route   GET /api/dashboard/acadex
 * @desc    Global platform stats for Super Admin
 */
router.get('/acadex', requireAuth, async (req, res) => {
    if (req.user.role !== 'SUPER_ADMIN') {
        return res.status(403).json({ error: 'Access denied. Super Admin only.' });
    }
    try {
        const [schools, totalStudents, totalRevenue] = await Promise.all([
            prisma.school.findMany({
                include: {
                    plan: { select: { name: true } },
                    users: { where: { role: 'SCHOOL_ADMIN' }, select: { id: true }, take: 1 },
                    _count: { select: { users: true, students: true } }
                },
                orderBy: { createdAt: 'desc' }
            }),
            prisma.student.count(),
            prisma.fee.aggregate({ _sum: { paid: true } })
        ]);
        res.json({
            stats: {
                totalSchools: schools.length,
                totalStudents,
                totalRevenue: totalRevenue._sum.paid ?? 0,
                serverHealth: '99.9%'
            },
            schools: schools.map(s => ({
                id: s.code,
                name: s.name,
                country: 'Zimbabwe', // Default for now
                plan: s.plan.name,
                status: s.status === 'active' ? 'Active' : 'Suspended',
                renewal: 'Monthly',
                adminId: s.users[0]?.id
            }))
        });
    }
    catch (e) {
        console.error(e);
        res.status(500).json({ error: 'Failed to fetch platform dashboard' });
    }
});
/**
 * @route   GET /api/dashboard/applicant
 * @desc    Get status and timeline for the logged-in applicant
 */
router.get('/applicant', requireAuth, async (req, res) => {
    try {
        const application = await prisma.application.findFirst({
            where: { email: req.user.email }, // Linked by email
            include: {
                timeline: { orderBy: { occurredAt: 'desc' } },
                documents: true
            }
        });
        if (!application) {
            return res.status(404).json({ error: 'Application record not found for this account.' });
        }
        // Calculate progress (basic logic)
        const totalDocs = application.documents.length;
        const verifiedDocs = application.documents.filter(d => d.status === 'verified').length;
        const progress = application.status === 'accepted' ? 100 : application.status === 'pending' ? 40 : 10;
        res.json({
            status: application.status,
            applicantName: application.applicantName,
            appType: application.appType,
            progress,
            timeline: application.timeline,
            documents: {
                total: totalDocs,
                verified: verifiedDocs
            },
            documents_list: application.documents
        });
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to fetch applicant data' });
    }
});
export default router;
//# sourceMappingURL=dashboard.js.map