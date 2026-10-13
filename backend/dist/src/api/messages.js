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
// Get all users in the same school as potential recipients (including staff, students, parents, suppliers)
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
        // Also include registered school suppliers with associated user accounts
        try {
            const schoolSuppliers = await prisma_1.default.schoolSupplier.findMany({
                where: { schoolId: req.user.schoolId },
                include: { supplier: { include: { user: true } } }
            });
            for (const ss of schoolSuppliers) {
                if (ss.supplier?.user && ss.supplier.user.id !== req.user.id) {
                    if (!users.some(u => u.id === ss.supplier.user.id)) {
                        users.push({
                            id: ss.supplier.user.id,
                            name: `${ss.supplier.companyName} (${ss.supplier.contactName})`,
                            role: 'SUPPLIER',
                            email: ss.supplier.email || ss.supplier.user.email
                        });
                    }
                }
            }
        }
        catch (suppErr) {
            console.warn('Note: Could not query extra school suppliers for messages:', suppErr);
        }
        res.json(users);
    }
    catch (error) {
        console.error('Error fetching message recipients:', error);
        res.status(500).json({ error: 'Failed to fetch recipients' });
    }
});
// Send a new message (single or multi-recipient)
router.post('/', auth_1.requireAuth, async (req, res) => {
    try {
        const { recipientId, recipientIds, recipientEmail, subject, body } = req.body;
        if (!subject || !body) {
            return res.status(400).json({ error: 'Subject and message body are required' });
        }
        // Support multiple recipients
        if (Array.isArray(recipientIds) && recipientIds.length > 0) {
            const validUsers = await prisma_1.default.user.findMany({
                where: {
                    id: { in: recipientIds },
                    OR: [
                        { schoolId: req.user.schoolId },
                        { supplier: { schools: { some: { schoolId: req.user.schoolId } } } }
                    ]
                },
                select: { id: true }
            });
            if (validUsers.length === 0) {
                return res.status(400).json({ error: 'No valid recipients selected within your institution' });
            }
            const createdMessages = await prisma_1.default.$transaction(validUsers.map(u => prisma_1.default.message.create({
                data: {
                    senderId: req.user.id,
                    recipientId: u.id,
                    subject,
                    body,
                    schoolId: req.user.schoolId
                }
            })));
            return res.status(201).json({
                success: true,
                count: createdMessages.length,
                messages: createdMessages,
                ...(createdMessages[0] || {})
            });
        }
        let targetRecipientId = recipientId;
        if (!targetRecipientId && recipientEmail) {
            const foundUser = await prisma_1.default.user.findFirst({
                where: {
                    email: { equals: String(recipientEmail).trim(), mode: 'insensitive' },
                    schoolId: req.user.schoolId
                }
            });
            if (foundUser) {
                targetRecipientId = foundUser.id;
            }
            else {
                return res.status(404).json({ error: `No registered user found with email "${recipientEmail}" in your institution.` });
            }
        }
        if (!targetRecipientId) {
            return res.status(400).json({ error: 'Recipient is required' });
        }
        const recipient = await prisma_1.default.user.findFirst({
            where: { id: targetRecipientId }
        });
        if (!recipient || recipient.schoolId !== req.user.schoolId) {
            return res.status(400).json({ error: 'Invalid recipient in your institution' });
        }
        const message = await prisma_1.default.message.create({
            data: {
                senderId: req.user.id,
                recipientId: targetRecipientId,
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