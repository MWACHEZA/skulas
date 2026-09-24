"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const prisma_1 = __importDefault(require("../lib/prisma"));
const auth_1 = require("../middleware/auth");
const library_reminder_job_1 = require("../jobs/library-reminder-job");
const router = (0, express_1.Router)();
/**
 * @route   GET /api/dashboard/admin
 * @desc    Aggregated stats for the admin portal
 */
router.get('/admin', auth_1.requireAuth, async (req, res) => {
    const schoolId = req.user.schoolId;
    try {
        // 1. Core aggregates - use individual try-catches if specific counts are non-critical
        const [totalStudents, totalTeachers, pendingApplications, reportsCount] = await Promise.all([
            prisma_1.default.student.count({ where: { schoolId } }).catch(() => 0),
            prisma_1.default.teacher.count({ where: { schoolId } }).catch(() => 0),
            prisma_1.default.application.count({ where: { schoolId, status: 'pending' } }).catch(() => 0),
            prisma_1.default.academicReport.count({ where: { schoolId } }).catch(() => 0),
        ]);
        // 2. Financial aggregation
        let totalRevenue = 0;
        try {
            const revAgg = await prisma_1.default.fee.aggregate({
                where: { student: { schoolId } },
                _sum: { paid: true }
            });
            totalRevenue = revAgg._sum.paid ?? 0;
        }
        catch (e) {
            console.error('[Dashboard] Revenue aggregation failed:', e);
        }
        // 3. Announcements & Recent Apps
        const rawAnnouncements = await prisma_1.default.announcement.findMany({
            where: { schoolId },
            orderBy: { publishedAt: 'desc' },
            take: 5
        }).catch(() => []);
        const announcements = rawAnnouncements.map(a => ({
            id: a.id,
            title: a.title,
            content: a.content,
            body: a.content,
            publishedAt: a.publishedAt ? a.publishedAt.toISOString() : new Date().toISOString(),
            createdAt: a.publishedAt ? a.publishedAt.toISOString() : new Date().toISOString(),
            visiblePortals: a.visiblePortals,
            isPublic: a.isPublic,
            author: { name: 'School Administration' }
        }));
        const recentApplications = await prisma_1.default.application.findMany({
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
router.get('/teacher', auth_1.requireAuth, async (req, res) => {
    const userId = req.user.id;
    try {
        const teacher = await prisma_1.default.teacher.findFirst({
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
        const announcements = await prisma_1.default.announcement.findMany({
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
router.get('/bursar', auth_1.requireAuth, async (req, res) => {
    const schoolId = req.user.schoolId;
    try {
        const [feeStats, studentCount, recentFees] = await Promise.all([
            prisma_1.default.fee.groupBy({
                by: ['status'],
                where: { student: { schoolId } },
                _count: true,
                _sum: { amount: true, paid: true },
            }),
            prisma_1.default.student.count({ where: { schoolId } }),
            prisma_1.default.fee.findMany({
                where: { student: { schoolId } },
                include: { student: { select: { name: true, studentId: true } } },
                orderBy: { createdAt: 'desc' },
                take: 10,
            }),
        ]);
        const totalFeesBilled = feeStats.reduce((s, f) => s + (f._sum.amount ?? 0), 0);
        const totalFeesCollected = feeStats.reduce((s, f) => s + (f._sum.paid ?? 0), 0);
        const outstandingFees = Math.max(0, totalFeesBilled - totalFeesCollected);
        res.json({
            // Top-level fields the frontend reads directly
            totalFeesBilled,
            totalFeesCollected,
            outstandingFees,
            studentCount,
            // Status breakdown array (unchanged shape)
            feesByStatus: feeStats,
            // Recent fee records — aliased to what the frontend expects
            recentPayments: recentFees,
        });
    }
    catch (e) {
        console.error(e);
        res.status(500).json({ error: 'Failed to fetch bursar dashboard' });
    }
});
/**
 * @route   GET /api/dashboard/library
 * @desc    Library stats for daily operational dashboard
 */
router.get('/library', auth_1.requireAuth, async (req, res) => {
    const schoolId = req.user.schoolId;
    try {
        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);
        const todayEnd = new Date();
        todayEnd.setHours(23, 59, 59, 999);
        const now = new Date();
        const [totalBooks, issuedToday, returnedToday, currentlyBorrowed, overdueRightNow, dueToday, reservationsWaitingPickup, setting] = await Promise.all([
            prisma_1.default.book.count({ where: { schoolId } }),
            prisma_1.default.bookLoan.count({
                where: { schoolId, borrowedAt: { gte: todayStart, lte: todayEnd } }
            }),
            prisma_1.default.bookLoan.count({
                where: { schoolId, returnedAt: { gte: todayStart, lte: todayEnd } }
            }),
            prisma_1.default.bookLoan.count({
                where: { schoolId, status: 'borrowed' }
            }),
            prisma_1.default.bookLoan.count({
                where: { schoolId, status: 'borrowed', dueDate: { lt: now } }
            }),
            prisma_1.default.bookLoan.count({
                where: { schoolId, status: 'borrowed', dueDate: { gte: todayStart, lte: todayEnd } }
            }),
            prisma_1.default.bookReservation.count({
                where: { schoolId, status: { in: ['Ready for Pickup', 'Approved', 'Pending'] } }
            }),
            prisma_1.default.librarySetting.findUnique({ where: { schoolId } })
        ]);
        // 1. Today-relevant table: Recent Issues (today)
        const recentIssuesRaw = await prisma_1.default.bookLoan.findMany({
            where: {
                schoolId,
                borrowedAt: { gte: todayStart, lte: todayEnd }
            },
            include: {
                book: { select: { id: true, title: true, author: true, accessionNumber: true, barcode: true, isbn: true } },
                student: {
                    select: {
                        id: true,
                        studentId: true,
                        name: true,
                        class: { select: { name: true } },
                        user: { select: { name: true, phone: true } }
                    }
                },
                user: { select: { id: true, name: true, phone: true, role: true } }
            },
            orderBy: { borrowedAt: 'desc' },
            take: 25
        });
        // Fallback: If no books issued yet today, fetch recent issues to avoid a totally blank table during off-hours
        const fallbackIssuesRaw = recentIssuesRaw.length === 0 ? await prisma_1.default.bookLoan.findMany({
            where: { schoolId },
            include: {
                book: { select: { id: true, title: true, author: true, accessionNumber: true, barcode: true, isbn: true } },
                student: {
                    select: {
                        id: true,
                        studentId: true,
                        name: true,
                        class: { select: { name: true } },
                        user: { select: { name: true, phone: true } }
                    }
                },
                user: { select: { id: true, name: true, phone: true, role: true } }
            },
            orderBy: { borrowedAt: 'desc' },
            take: 8
        }) : [];
        const formatIssueItem = (loan, isExplicitToday) => {
            const isStudent = !!loan.studentId;
            const borrowerName = isStudent
                ? (loan.student?.user?.name || loan.student?.name || 'Student')
                : (loan.user?.name || 'Staff');
            const borrowerIdentifier = isStudent ? (loan.student?.studentId || 'Student') : (loan.user?.role || 'Staff');
            const borrowerClass = isStudent ? (loan.student?.class?.name || '—') : 'Faculty/Staff';
            return {
                id: loan.id,
                bookId: loan.book?.id,
                bookTitle: loan.book?.title || 'Unknown Title',
                bookAuthor: loan.book?.author || 'Unknown Author',
                accessionNumber: loan.accessionNumber || loan.book?.accessionNumber || loan.book?.barcode || loan.book?.isbn || '—',
                borrowerName,
                borrowerIdentifier,
                borrowerClass,
                borrowerPhone: (isStudent ? loan.student?.user?.phone : loan.user?.phone) || '—',
                borrowedAt: loan.borrowedAt ? loan.borrowedAt.toISOString() : new Date().toISOString(),
                dueDate: loan.dueDate ? loan.dueDate.toISOString() : new Date().toISOString(),
                status: loan.status,
                isToday: isExplicitToday
            };
        };
        const recentIssues = recentIssuesRaw.length > 0
            ? recentIssuesRaw.map(l => formatIssueItem(l, true))
            : fallbackIssuesRaw.map(l => formatIssueItem(l, false));
        // 2. Today-relevant table: Overdue Today / Overdue Right Now
        const overdueLoansRaw = await prisma_1.default.bookLoan.findMany({
            where: {
                schoolId,
                status: 'borrowed',
                dueDate: { lt: now }
            },
            include: {
                book: { select: { id: true, title: true, author: true, accessionNumber: true, barcode: true, isbn: true } },
                student: {
                    select: {
                        id: true,
                        studentId: true,
                        name: true,
                        class: { select: { name: true } },
                        user: { select: { name: true, phone: true, email: true } }
                    }
                },
                user: { select: { id: true, name: true, phone: true, email: true, role: true } }
            },
            orderBy: { dueDate: 'asc' },
            take: 50
        });
        const overdueList = overdueLoansRaw.map(loan => {
            const { daysOverdue, fineAmount } = (0, library_reminder_job_1.computeLoanFine)(loan, setting);
            const isStudent = !!loan.studentId;
            const borrowerName = isStudent
                ? (loan.student?.user?.name || loan.student?.name || 'Student')
                : (loan.user?.name || 'Staff');
            const borrowerIdentifier = isStudent ? (loan.student?.studentId || 'Student') : (loan.user?.role || 'Staff');
            const borrowerClass = isStudent ? (loan.student?.class?.name || '—') : 'Faculty/Staff';
            const borrowerPhone = (isStudent ? loan.student?.user?.phone : loan.user?.phone) || '—';
            const borrowerEmail = (isStudent ? loan.student?.user?.email : loan.user?.email) || '—';
            return {
                id: loan.id,
                bookId: loan.book?.id,
                bookTitle: loan.book?.title || 'Unknown Title',
                bookAuthor: loan.book?.author || 'Unknown Author',
                accessionNumber: loan.accessionNumber || loan.book?.accessionNumber || loan.book?.barcode || loan.book?.isbn || '—',
                borrowerName,
                borrowerIdentifier,
                borrowerClass,
                borrowerPhone,
                borrowerEmail,
                borrowedAt: loan.borrowedAt ? loan.borrowedAt.toISOString() : new Date().toISOString(),
                dueDate: loan.dueDate ? loan.dueDate.toISOString() : new Date().toISOString(),
                daysOverdue: Math.max(1, daysOverdue),
                fineAmount: Number(fineAmount.toFixed(2)),
                status: loan.status
            };
        });
        res.json({
            // 1. Today counts
            today: {
                issued: issuedToday,
                returned: returnedToday
            },
            // 2. Right now counts
            rightNow: {
                currentlyBorrowed,
                overdueRightNow
            },
            // 3. Alerts
            alerts: {
                dueToday,
                reservationsWaitingPickup
            },
            // 4. Tables
            recentIssues,
            hasIssuesToday: recentIssuesRaw.length > 0,
            overdueToday: overdueList,
            // Backward compatibility fields
            totalBooks,
            activeLoans: currentlyBorrowed,
            overdueLoans: overdueRightNow,
            recentLoans: recentIssues
        });
    }
    catch (e) {
        console.error('Library dashboard error:', e);
        res.status(500).json({ error: 'Failed to fetch library dashboard' });
    }
});
/**
 * @route   GET /api/dashboard/acadex
 * @desc    Global platform stats for Super Admin
 */
router.get('/acadex', auth_1.requireAuth, async (req, res) => {
    if (req.user.role !== 'SUPER_ADMIN') {
        return res.status(403).json({ error: 'Access denied. Super Admin only.' });
    }
    try {
        const [schools, totalStudents, activeStudents] = await Promise.all([
            prisma_1.default.school.findMany({
                include: {
                    plan: { select: { name: true } },
                    users: { where: { role: 'SCHOOL_ADMIN' }, select: { id: true, email: true }, take: 1 },
                    _count: { select: { users: true, students: true } }
                },
                orderBy: { createdAt: 'desc' }
            }),
            prisma_1.default.student.count(),
            prisma_1.default.student.count({
                where: {
                    status: { in: ['Enrolled', 'Active', 'enrolled', 'active'] },
                    school: { status: 'active' }
                }
            })
        ]);
        // Platform subscription revenue: $2 per active student per month
        const PLATFORM_STUDENT_RATE = 2.00;
        const monthlyRevenue = activeStudents * PLATFORM_STUDENT_RATE;
        res.json({
            stats: {
                totalSchools: schools.length,
                activeSchools: schools.filter(s => s.status === 'active').length,
                totalStudents,
                activeStudents,
                totalRevenue: monthlyRevenue,
                platformRatePerStudent: PLATFORM_STUDENT_RATE,
                serverHealth: '99.9%'
            },
            schools: schools.map(s => ({
                id: s.code,
                code: s.code,
                name: s.name,
                country: s.country || 'Zimbabwe',
                plan: s.plan?.name || 'Starter',
                status: s.status === 'active' ? 'Active' : s.status === 'suspended' ? 'Suspended' : s.status,
                studentsCount: s._count.students,
                monthlyAmount: s._count.students * PLATFORM_STUDENT_RATE,
                renewal: 'Monthly',
                adminId: s.users[0]?.id,
                adminEmail: s.users[0]?.email,
                createdAt: s.createdAt
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
router.get('/applicant', auth_1.requireAuth, async (req, res) => {
    try {
        const application = await prisma_1.default.application.findFirst({
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
            interviewDate: application.interviewDate,
            interviewTime: application.interviewTime,
            interviewVenue: application.interviewVenue,
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
/**
 * @route   GET /api/dashboard/ancillary
 * @desc    Aggregated stats for the ancillary staff portal
 */
router.get('/ancillary', auth_1.requireAuth, async (req, res) => {
    const schoolId = req.user.schoolId;
    const userId = req.user.id;
    try {
        const openTicketsCount = await prisma_1.default.supportTicket.count({
            where: { schoolId, status: 'open' }
        });
        const pendingProcurementsCount = await prisma_1.default.requisition.count({
            where: { schoolId, status: 'PENDING' }
        });
        const assignedTasksCount = await prisma_1.default.shiftAssignment.count({
            where: { schoolId, userId }
        });
        const recentTickets = await prisma_1.default.supportTicket.findMany({
            where: { schoolId },
            orderBy: { createdAt: 'desc' },
            take: 5
        });
        res.json({
            stats: {
                openTicketsCount,
                pendingProcurementsCount,
                assignedTasksCount
            },
            recentTickets
        });
    }
    catch (error) {
        console.error('Fetch ancillary dashboard error:', error);
        res.status(500).json({ error: 'Failed to fetch ancillary dashboard' });
    }
});
/**
 * @route   GET /api/dashboard/parent
 * @desc    Aggregated stats for the parent portal
 */
router.get('/parent', auth_1.requireAuth, async (req, res) => {
    const studentId = req.query.studentId;
    if (!studentId)
        return res.status(400).json({ error: 'Student ID is required' });
    try {
        // Fees
        const fees = await prisma_1.default.fee.findMany({ where: { studentId } });
        const outstandingBalance = fees.reduce((acc, f) => acc + (f.amount - f.paid), 0);
        // Attendance
        const attendances = await prisma_1.default.attendance.findMany({ where: { studentId } });
        const presentCount = attendances.filter(a => a.status === 'Present').length;
        const avgAttendance = attendances.length > 0 ? Math.round((presentCount / attendances.length) * 100) : 0;
        // Wallet
        const wallet = await prisma_1.default.studentWallet.findUnique({
            where: { studentId },
            include: { transactions: true }
        });
        let walletBalance = 0;
        if (wallet && wallet.transactions) {
            walletBalance = wallet.transactions.reduce((acc, tx) => {
                if (tx.type === 'DEPOSIT' || tx.type === 'REFUND')
                    return acc + tx.amount;
                if (tx.type === 'PURCHASE')
                    return acc - tx.amount;
                return acc;
            }, 0);
        }
        res.json({
            outstandingBalance,
            avgAttendance,
            walletBalance,
            recentMerits: 0 // Mock for now
        });
    }
    catch (error) {
        console.error('Fetch parent dashboard error:', error);
        res.status(500).json({ error: 'Failed to fetch parent dashboard' });
    }
});
exports.default = router;
//# sourceMappingURL=dashboard.js.map