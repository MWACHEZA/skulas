import { Router, Response } from 'express';
import prisma from '../lib/prisma';
import { requireAuth, AuthRequest } from '../middleware/auth';

const router = Router();

// Get all messages where the logged-in user is the recipient (Inbox)
router.get('/', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 50;
    const skip = (page - 1) * limit;

    const [messages, total] = await Promise.all([
      prisma.message.findMany({
        where: {
          recipientId: req.user!.id,
          schoolId: req.user!.schoolId!
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit
      }),
      prisma.message.count({
        where: {
          recipientId: req.user!.id,
          schoolId: req.user!.schoolId!
        }
      })
    ]);

    const senderIds = Array.from(new Set(messages.map(m => m.senderId)));
    const senders = await prisma.user.findMany({
      where: { id: { in: senderIds } },
      select: { id: true, name: true, role: true, email: true }
    });
    
    const senderMap = new Map(senders.map(s => [s.id, s]));

    const data = messages.map(m => ({
      ...m,
      sender: senderMap.get(m.senderId) || { name: 'Unknown User', role: 'UNKNOWN', email: '' }
    }));

    res.json({ data, total, page, limit });
  } catch (error) {
    console.error('Error fetching messages:', error);
    res.status(500).json({ error: 'Failed to fetch messages' });
  }
});

// Get all users in the same school as potential recipients (including staff, students, parents, suppliers)
router.get('/users', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const users: Array<{ id: string; name: string; role: string; email: string }> = await prisma.user.findMany({
      where: {
        schoolId: req.user!.schoolId!,
        id: { not: req.user!.id }
      },
      select: { id: true, name: true, role: true, email: true },
      orderBy: { name: 'asc' }
    });

    // Also include registered school suppliers with associated user accounts
    try {
      const schoolSuppliers = await prisma.schoolSupplier.findMany({
        where: { schoolId: req.user!.schoolId! },
        include: { supplier: { include: { user: true } } }
      });

      for (const ss of schoolSuppliers) {
        if (ss.supplier?.user && ss.supplier.user.id !== req.user!.id) {
          if (!users.some(u => u.id === ss.supplier.user!.id)) {
            users.push({
              id: ss.supplier.user.id,
              name: `${ss.supplier.companyName} (${ss.supplier.contactName})`,
              role: 'SUPPLIER',
              email: ss.supplier.email || ss.supplier.user.email
            });
          }
        }
      }
    } catch (suppErr) {
      console.warn('Note: Could not query extra school suppliers for messages:', suppErr);
    }

    res.json(users);
  } catch (error) {
    console.error('Error fetching message recipients:', error);
    res.status(500).json({ error: 'Failed to fetch recipients' });
  }
});

// Send a new message (single or multi-recipient)
router.post('/', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { recipientId, recipientIds, recipientEmail, subject, body } = req.body;

    if (!subject || !body) {
      return res.status(400).json({ error: 'Subject and message body are required' });
    }

    // Support multiple recipients
    if (Array.isArray(recipientIds) && recipientIds.length > 0) {
      const validUsers = await prisma.user.findMany({
        where: {
          id: { in: recipientIds },
          OR: [
            { schoolId: req.user!.schoolId! },
            { supplier: { schools: { some: { schoolId: req.user!.schoolId! } } } }
          ]
        },
        select: { id: true }
      });

      if (validUsers.length === 0) {
        return res.status(400).json({ error: 'No valid recipients selected within your institution' });
      }

      const createdMessages = await prisma.$transaction(
        validUsers.map(u =>
          prisma.message.create({
            data: {
              senderId: req.user!.id,
              recipientId: u.id,
              subject,
              body,
              schoolId: req.user!.schoolId!
            }
          })
        )
      );

      return res.status(201).json({
        success: true,
        count: createdMessages.length,
        messages: createdMessages,
        ...(createdMessages[0] || {})
      });
    }

    let targetRecipientId = recipientId;
    if (!targetRecipientId && recipientEmail) {
      const foundUser = await prisma.user.findFirst({
        where: {
          email: { equals: String(recipientEmail).trim(), mode: 'insensitive' },
          schoolId: req.user!.schoolId!
        }
      });
      if (foundUser) {
        targetRecipientId = foundUser.id;
      } else {
        return res.status(404).json({ error: `No registered user found with email "${recipientEmail}" in your institution.` });
      }
    }

    if (!targetRecipientId) {
      return res.status(400).json({ error: 'Recipient is required' });
    }

    const recipient = await prisma.user.findFirst({
      where: { id: targetRecipientId }
    });

    if (!recipient || recipient.schoolId !== req.user!.schoolId!) {
      return res.status(400).json({ error: 'Invalid recipient in your institution' });
    }

    const message = await prisma.message.create({
      data: {
        senderId: req.user!.id,
        recipientId: targetRecipientId,
        subject,
        body,
        schoolId: req.user!.schoolId!
      }
    });

    res.status(201).json(message);
  } catch (error) {
    console.error('Error sending message:', error);
    res.status(500).json({ error: 'Failed to send message' });
  }
});

// Mark message as read
router.patch('/:id/read', requireAuth, async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  try {
    await prisma.message.updateMany({
      where: {
        id: id as string,
        recipientId: req.user!.id
      },
      data: { isRead: true }
    });
    res.json({ success: true });
  } catch (error) {
    console.error('Error marking message as read:', error);
    res.status(500).json({ error: 'Failed to update message' });
  }
});

// Delete message
router.delete('/:id', requireAuth, async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  try {
    await prisma.message.deleteMany({
      where: {
        id: id as string,
        recipientId: req.user!.id
      }
    });
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting message:', error);
    res.status(500).json({ error: 'Failed to delete message' });
  }
});

export default router;
