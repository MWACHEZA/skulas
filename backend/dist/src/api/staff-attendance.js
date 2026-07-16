import { Router } from 'express';
import prisma from '../lib/prisma';
import { requireAuth } from '../middleware/auth';
import { startOfDay, endOfDay } from 'date-fns';
const router = Router();
// Get the logged in staff member's attendance
router.get('/my', requireAuth, async (req, res) => {
    try {
        const attendances = await prisma.staffAttendance.findMany({
            where: {
                schoolId: req.user.schoolId,
                staffId: req.user.id
            },
            orderBy: { date: 'desc' },
            take: 30 // last 30 days
        });
        res.json(attendances);
    }
    catch (error) {
        console.error('Error fetching staff attendance:', error);
        res.status(500).json({ error: 'Failed to fetch attendance' });
    }
});
// Check today's status
router.get('/today', requireAuth, async (req, res) => {
    try {
        const today = new Date();
        const attendance = await prisma.staffAttendance.findFirst({
            where: {
                schoolId: req.user.schoolId,
                staffId: req.user.id,
                date: {
                    gte: startOfDay(today),
                    lte: endOfDay(today)
                }
            }
        });
        res.json(attendance);
    }
    catch (error) {
        console.error('Error checking today attendance:', error);
        res.status(500).json({ error: 'Failed to check attendance' });
    }
});
// Clock In
router.post('/clock-in', requireAuth, async (req, res) => {
    try {
        const { image } = req.body;
        const today = new Date();
        // Check if already clocked in today
        const existing = await prisma.staffAttendance.findFirst({
            where: {
                schoolId: req.user.schoolId,
                staffId: req.user.id,
                date: {
                    gte: startOfDay(today),
                    lte: endOfDay(today)
                }
            }
        });
        if (existing) {
            return res.status(400).json({ error: 'Already clocked in today' });
        }
        const attendance = await prisma.staffAttendance.create({
            data: {
                schoolId: req.user.schoolId,
                staffId: req.user.id,
                date: startOfDay(today),
                timeIn: today,
                clockInImage: image,
                status: 'FULL DAY'
            }
        });
        res.json({ success: true, attendance });
    }
    catch (error) {
        console.error('Error clocking in:', error);
        res.status(500).json({ error: 'Failed to clock in' });
    }
});
// Clock Out
router.post('/clock-out', requireAuth, async (req, res) => {
    try {
        const { image } = req.body;
        const today = new Date();
        const existing = await prisma.staffAttendance.findFirst({
            where: {
                schoolId: req.user.schoolId,
                staffId: req.user.id,
                date: {
                    gte: startOfDay(today),
                    lte: endOfDay(today)
                }
            }
        });
        if (!existing) {
            return res.status(400).json({ error: 'Have not clocked in today' });
        }
        if (existing.timeOut) {
            return res.status(400).json({ error: 'Already clocked out' });
        }
        const attendance = await prisma.staffAttendance.update({
            where: { id: existing.id },
            data: {
                timeOut: today,
                clockOutImage: image
            }
        });
        res.json({ success: true, attendance });
    }
    catch (error) {
        console.error('Error clocking out:', error);
        res.status(500).json({ error: 'Failed to clock out' });
    }
});
// GET all staff clock-ins for the school filterable by date
router.get('/all', requireAuth, async (req, res) => {
    try {
        const schoolId = req.user.schoolId;
        const userRole = req.user.role;
        // Check if the user is a Head of Department
        const headedDepts = await prisma.department.findMany({
            where: {
                schoolId,
                headId: req.user.id
            },
            select: {
                id: true
            }
        });
        const headedDeptIds = headedDepts.map(d => d.id);
        const isHod = headedDeptIds.length > 0;
        const isAdmin = ['SUPER_ADMIN', 'SCHOOL_ADMIN', 'BURSAR', 'HR'].includes(userRole);
        // Check permission
        if (!isAdmin && !isHod) {
            return res.status(403).json({ error: 'Access denied: HOD or HR permissions required' });
        }
        const { date } = req.query;
        const queryDate = date ? new Date(date) : new Date();
        // Construct the where clause
        let whereClause = {
            schoolId,
            date: {
                gte: startOfDay(queryDate),
                lte: endOfDay(queryDate)
            }
        };
        // If the user is an HOD (and not an admin), restrict records to their department's staff or themselves
        if (!isAdmin && isHod) {
            whereClause.OR = [
                { staffId: req.user.id },
                {
                    staff: {
                        OR: [
                            { departmentId: { in: headedDeptIds } },
                            { teacher: { departmentId: { in: headedDeptIds } } }
                        ]
                    }
                }
            ];
        }
        const attendances = await prisma.staffAttendance.findMany({
            where: whereClause,
            include: {
                staff: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                        role: true,
                        staffId: true,
                        departmentId: true
                    }
                }
            },
            orderBy: { timeIn: 'desc' }
        });
        res.json(attendances);
    }
    catch (error) {
        console.error('Error fetching all staff attendance logs:', error);
        res.status(500).json({ error: 'Failed to fetch attendance logs' });
    }
});
export default router;
//# sourceMappingURL=staff-attendance.js.map