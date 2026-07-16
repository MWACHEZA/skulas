import { Router } from 'express';
import prisma from '../lib/prisma';
import { requireAuth } from '../middleware/auth';
const router = Router();
// Get all messages where the logged-in user is the recipient (Inbox)
router.get('/', requireAuth, async (req, res) => {
    try {
        const messages = await prisma.message.findMany({
            where: {
                recipientId: req.user.id,
                schoolId: req.user.schoolId
            },
            orderBy: { createdAt: 'desc' }
        });
        const senderIds = Array.from(new Set(messages.map(m => m.senderId)));
        const senders = await prisma.user.findMany({
            where: { id: { in: senderIds } },
            select: { id: true, name: true, role: true, email: true }
        });
        const senderMap = new Map(senders.map(s => [s.id, s]));
        const result = messages.map(m => ({
            ...m,
            sender: senderMap.get(m.senderId) || { name: 'Unknown User', role: 'UNKNOWN', email: '' }
        }));
        res.json(result);
    }
    catch (error) {
        console.error('Error fetching messages:', error);
        res.status(500).json({ error: 'Failed to fetch messages' });
    }
});
// Get all users in the same school as potential recipients
router.get('/users', requireAuth, async (req, res) => {
    try {
        const users = await prisma.user.findMany({
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
router.post('/', requireAuth, async (req, res) => {
    try {
        const { recipientId, subject, body } = req.body;
        if (!recipientId || !subject || !body) {
            return res.status(400).json({ error: 'Missing required fields' });
        }
        const recipient = await prisma.user.findUnique({
            where: { id: recipientId }
        });
        if (!recipient || recipient.schoolId !== req.user.schoolId) {
            return res.status(400).json({ error: 'Invalid recipient' });
        }
        const message = await prisma.message.create({
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
router.patch('/:id/read', requireAuth, async (req, res) => {
    const { id } = req.params;
    try {
        await prisma.message.updateMany({
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
router.delete('/:id', requireAuth, async (req, res) => {
    const { id } = req.params;
    try {
        await prisma.message.deleteMany({
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
export default router;
//# sourceMappingURL=messages.js.map