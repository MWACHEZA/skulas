import { Router } from 'express';
import prisma from '../lib/prisma';
import { requireAuth } from '../middleware/auth';
import { logAction } from '../utils/audit';
const router = Router();
// Middleware: all chaplaincy routes require authentication
router.use(requireAuth);
/**
 * Helper to check if user has chaplaincy administrative permissions
 */
const isChaplaincyAdmin = (user) => {
    return user.role === 'SCHOOL_ADMIN' ||
        user.secondaryRoles.includes('School Chaplain') ||
        user.secondaryRoles.includes('Church Prefect');
};
/**
 * @route   GET /api/chaplaincy/events
 * @desc    Fetch scheduled liturgical events
 */
router.get('/events', async (req, res) => {
    try {
        const events = await prisma.chaplaincyEvent.findMany({
            where: { schoolId: req.user.schoolId },
            orderBy: { date: 'asc' }
        });
        res.json(events);
    }
    catch (error) {
        console.error('Fetch chaplaincy events error:', error);
        res.status(500).json({ error: 'Failed to fetch chaplaincy events' });
    }
});
/**
 * @route   POST /api/chaplaincy/events
 * @desc    Schedule a new liturgical service
 */
router.post('/events', async (req, res) => {
    if (!isChaplaincyAdmin(req.user)) {
        return res.status(403).json({ error: 'Unauthorized to schedule chaplaincy events' });
    }
    const { title, type, date, theme, status } = req.body;
    if (!title || !type || !date || !theme || !status) {
        return res.status(400).json({ error: 'Missing required service fields' });
    }
    try {
        const event = await prisma.chaplaincyEvent.create({
            data: {
                title,
                type,
                date: new Date(date),
                theme,
                status,
                schoolId: req.user.schoolId
            }
        });
        await logAction(req, 'CREATE_CHAPLAINCY_EVENT', 'ChaplaincyEvent', event.id, { title });
        res.json(event);
    }
    catch (error) {
        console.error('Create chaplaincy event error:', error);
        res.status(500).json({ error: 'Failed to create chaplaincy event' });
    }
});
/**
 * @route   POST /api/chaplaincy/broadcast
 * @desc    Submit a daily reflection and broadcast to all dashboards
 */
router.post('/broadcast', async (req, res) => {
    if (!isChaplaincyAdmin(req.user)) {
        return res.status(403).json({ error: 'Unauthorized to broadcast messages' });
    }
    const { content } = req.body;
    if (!content) {
        return res.status(400).json({ error: 'Reflection content is required' });
    }
    try {
        const announcement = await prisma.announcement.create({
            data: {
                title: 'Daily Reflection',
                content,
                targetRole: 'ALL',
                visiblePortals: ['ALL'],
                schoolId: req.user.schoolId
            }
        });
        await logAction(req, 'CREATE_CHAPLAINCY_REFLECTION', 'Announcement', announcement.id, { title: 'Daily Reflection' });
        res.json(announcement);
    }
    catch (error) {
        console.error('Broadcast reflection error:', error);
        res.status(500).json({ error: 'Failed to broadcast daily reflection' });
    }
});
/**
 * @route   GET /api/chaplaincy/religion-stats
 * @desc    Group and count users by religion and role
 */
router.get('/religion-stats', async (req, res) => {
    try {
        const users = await prisma.user.findMany({
            where: { schoolId: req.user.schoolId },
            select: { role: true, religion: true }
        });
        const students = {};
        const staff = {};
        users.forEach(u => {
            const rel = u.religion || 'Unspecified';
            if (u.role === 'STUDENT') {
                students[rel] = (students[rel] || 0) + 1;
            }
            else {
                staff[rel] = (staff[rel] || 0) + 1;
            }
        });
        res.json({ students, staff });
    }
    catch (error) {
        console.error('Fetch religion stats error:', error);
        res.status(500).json({ error: 'Failed to aggregate religion statistics' });
    }
});
/**
 * @route   GET /api/chaplaincy/team
 * @desc    Fetch dynamic list of school chaplains and prefects
 */
router.get('/team', async (req, res) => {
    try {
        const team = await prisma.user.findMany({
            where: {
                schoolId: req.user.schoolId,
                secondaryRoles: {
                    hasSome: ['School Chaplain', 'Church Prefect']
                }
            },
            select: {
                id: true,
                name: true,
                role: true,
                secondaryRoles: true,
                avatar: true
            }
        });
        res.json(team);
    }
    catch (error) {
        console.error('Fetch chaplaincy team error:', error);
        res.status(500).json({ error: 'Failed to fetch chaplaincy team list' });
    }
});
export default router;
//# sourceMappingURL=chaplaincy.js.map