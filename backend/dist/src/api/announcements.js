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
// GET / - List for current user's audience
router.get('/', auth_1.requireAuth, async (req, res) => {
    try {
        const { role } = req.user;
        let audienceFilter = [];
        if (['TEACHER', 'ANCILLARY'].includes(role)) {
            audienceFilter = ['ALL', 'ALL_TEACHERS', 'ALL_STAFF'];
        }
        else if (role === 'PARENT') {
            audienceFilter = ['ALL', 'ALL_PARENTS'];
        }
        else {
            // SCHOOL_ADMIN / SUPER_ADMIN see all
        }
        const whereClause = {
            schoolId: req.user.schoolId,
            OR: [
                { expiryDate: null },
                { expiryDate: { gt: new Date() } }
            ]
        };
        if (audienceFilter.length > 0) {
            whereClause.audience = { in: audienceFilter };
        }
        const announcements = await prisma_1.default.announcement.findMany({
            where: whereClause,
            include: {
                reads: {
                    where: { userId: req.user.id }
                }
            },
            orderBy: [
                { isPinned: 'desc' },
                { priority: 'desc' }, // URGENT first (U > N)
                { createdAt: 'desc' }
            ]
        });
        res.json(announcements);
    }
    catch (error) {
        console.error('Error fetching announcements:', error);
        res.status(500).json({ error: 'Failed to fetch announcements' });
    }
});
// GET /urgent - Priority=URGENT, unread by user
router.get('/urgent', auth_1.requireAuth, async (req, res) => {
    try {
        const { role } = req.user;
        let audienceFilter = [];
        if (['TEACHER', 'ANCILLARY'].includes(role)) {
            audienceFilter = ['ALL', 'ALL_TEACHERS', 'ALL_STAFF'];
        }
        else if (role === 'PARENT') {
            audienceFilter = ['ALL', 'ALL_PARENTS'];
        }
        const whereClause = {
            schoolId: req.user.schoolId,
            priority: 'URGENT',
            OR: [
                { expiryDate: null },
                { expiryDate: { gt: new Date() } }
            ],
            reads: {
                none: { userId: req.user.id }
            }
        };
        if (audienceFilter.length > 0) {
            whereClause.audience = { in: audienceFilter };
        }
        const urgentAnnouncements = await prisma_1.default.announcement.findMany({
            where: whereClause,
            orderBy: { createdAt: 'desc' }
        });
        res.json(urgentAnnouncements);
    }
    catch (error) {
        console.error('Error fetching urgent announcements:', error);
        res.status(500).json({ error: 'Failed to fetch urgent announcements' });
    }
});
// POST / - Create (SCHOOL_ADMIN only)
router.post('/', auth_1.requireAuth, (0, auth_1.requireRole)('SCHOOL_ADMIN'), async (req, res) => {
    try {
        const { title, body, content, category, priority, audience, targetClassId, expiryDate, isPinned } = req.body;
        if (!title || (!body && !content)) {
            return res.status(400).json({ error: 'Title and body/content are required' });
        }
        const announcement = await prisma_1.default.announcement.create({
            data: {
                schoolId: req.user.schoolId,
                createdById: req.user.id,
                title,
                body: body || content,
                content: content || body,
                category: category || 'GENERAL',
                priority: priority || 'NORMAL',
                audience: audience || 'ALL',
                targetClassId,
                expiryDate: expiryDate ? new Date(expiryDate) : null,
                isPinned: isPinned || false
            }
        });
        await (0, audit_1.logAction)(req, 'CREATE_ANNOUNCEMENT', 'Announcement', announcement.id, { title });
        res.status(201).json(announcement);
    }
    catch (error) {
        console.error('Error creating announcement:', error);
        res.status(500).json({ error: 'Failed to create announcement' });
    }
});
// PATCH /:id - Update (SCHOOL_ADMIN only)
router.patch('/:id', auth_1.requireAuth, (0, auth_1.requireRole)('SCHOOL_ADMIN'), async (req, res) => {
    try {
        const id = req.params.id;
        const updateData = req.body;
        if (updateData.expiryDate) {
            updateData.expiryDate = new Date(updateData.expiryDate);
        }
        const announcement = await prisma_1.default.announcement.update({
            where: { id, schoolId: req.user.schoolId },
            data: updateData
        });
        res.json(announcement);
    }
    catch (error) {
        console.error('Error updating announcement:', error);
        res.status(500).json({ error: 'Failed to update announcement' });
    }
});
// DELETE /:id - Delete (SCHOOL_ADMIN only)
router.delete('/:id', auth_1.requireAuth, (0, auth_1.requireRole)('SCHOOL_ADMIN'), async (req, res) => {
    try {
        const id = req.params.id;
        await prisma_1.default.announcement.delete({
            where: { id, schoolId: req.user.schoolId }
        });
        res.json({ message: 'Announcement deleted successfully' });
    }
    catch (error) {
        console.error('Error deleting announcement:', error);
        res.status(500).json({ error: 'Failed to delete announcement' });
    }
});
// POST /:id/read - Mark as read (any auth)
router.post('/:id/read', auth_1.requireAuth, async (req, res) => {
    try {
        const id = req.params.id;
        await prisma_1.default.announcementRead.upsert({
            where: {
                announcementId_userId: {
                    announcementId: id,
                    userId: req.user.id
                }
            },
            update: { readAt: new Date() },
            create: {
                announcementId: id,
                userId: req.user.id,
                readAt: new Date()
            }
        });
        res.json({ success: true });
    }
    catch (error) {
        console.error('Error marking announcement as read:', error);
        res.status(500).json({ error: 'Failed to mark as read' });
    }
});
exports.default = router;
//# sourceMappingURL=announcements.js.map