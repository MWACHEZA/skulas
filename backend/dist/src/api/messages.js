"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const prisma_1 = __importDefault(require("../lib/prisma"));
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
// Get all messages where the logged-in user is the recipient (Inbox)
router.get('/', auth_1.requireAuth, async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 50;
        const skip = (page - 1) * limit;
        const [messages, total] = await Promise.all([
            prisma_1.default.message.findMany({
                where: {
                    recipientId: req.user.id,
                    schoolId: req.user.schoolId
                },
                orderBy: { createdAt: 'desc' },
                skip,
                take: limit
            }),
            prisma_1.default.message.count({
                where: {
                    recipientId: req.user.id,
                    schoolId: req.user.schoolId
                }
            })
        ]);
        const senderIds = Array.from(new Set(messages.map(m => m.senderId)));
        const senders = await prisma_1.default.user.findMany({
            where: { id: { in: senderIds } },
            select: { id: true, name: true, role: true, email: true }
        });
        const senderMap = new Map(senders.map(s => [s.id, s]));
        const data = messages.map(m => ({
            ...m,
            sender: senderMap.get(m.senderId) || { name: 'Unknown User', role: 'UNKNOWN', email: '' }
        }));
        res.json({ data, total, page, limit });
    }
    catch (error) {
        console.error('Error fetching messages:', error);
        res.status(500).json({ error: 'Failed to fetch messages' });
    }
});
// Get all users in the same school as potential recipients
router.get('/users', auth_1.requireAuth, async (req, res) => {
    try {
        const users = await prisma_1.default.user.findMany({
            where: {
                schoolId: req.user.schoolId,
                id: { not: req.user.id }
            },
            select: { id: true, name: true, role: true, email: true },
            orderBy: { name: 'asc' }
        });
        res.json(users);
    }
    catch (error) {
        console.error('Error fetching message recipients:', error);
        res.status(500).json({ error: 'Failed to fetch recipients' });
    }
});
// Send a new message
router.post('/', auth_1.requireAuth, async (req, res) => {
    try {
        const { recipientId, subject, body } = req.body;
        if (!recipientId || !subject || !body) {
            return res.status(400).json({ error: 'Missing required fields' });
        }
        const recipient = await prisma_1.default.user.findFirst({
            where: { id: recipientId }
        });
        if (!recipient || recipient.schoolId !== req.user.schoolId) {
            return res.status(400).json({ error: 'Invalid recipient' });
        }
        const message = await prisma_1.default.message.create({
            data: {
                senderId: req.user.id,
                recipientId,
                subject,
                body,
                schoolId: req.user.schoolId
            }
        });
        res.status(201).json(message);
    }
    catch (error) {
        console.error('Error sending message:', error);
        res.status(500).json({ error: 'Failed to send message' });
    }
});
// Mark message as read
router.patch('/:id/read', auth_1.requireAuth, async (req, res) => {
    const { id } = req.params;
    try {
        await prisma_1.default.message.updateMany({
            where: {
                id: id,
                recipientId: req.user.id
            },
            data: { isRead: true }
        });
        res.json({ success: true });
    }
    catch (error) {
        console.error('Error marking message as read:', error);
        res.status(500).json({ error: 'Failed to update message' });
    }
});
// Delete message
router.delete('/:id', auth_1.requireAuth, async (req, res) => {
    const { id } = req.params;
    try {
        await prisma_1.default.message.deleteMany({
            where: {
                id: id,
                recipientId: req.user.id
            }
        });
        res.json({ success: true });
    }
    catch (error) {
        console.error('Error deleting message:', error);
        res.status(500).json({ error: 'Failed to delete message' });
    }
});
exports.default = router;
//# sourceMappingURL=messages.js.map