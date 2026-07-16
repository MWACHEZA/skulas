import { Router, Response } from 'express';
import path from 'path';
import prisma from '../lib/prisma';
import { requireAuth, AuthRequest } from '../middleware/auth';
import { reportUpload } from '../middleware/upload';

const router = Router();

// Get all meeting minutes for the school
router.get('/', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const list = await prisma.meetingMinutes.findMany({
      where: { schoolId: req.user!.schoolId! },
      orderBy: { date: 'desc' }
    });
    res.json(list);
  } catch (error) {
    console.error('Error fetching meeting minutes:', error);
    res.status(500).json({ error: 'Failed to fetch meeting minutes' });
  }
});

// Create/Upload a new meeting minutes record
router.post('/', requireAuth, reportUpload.single('file'), async (req: AuthRequest, res: Response) => {
  try {
    const { date, title, attendees, status } = req.body;
    const file = req.file;

    if (!date || !title) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const documentUrl = file
      ? path.join(req.uploadCategoryPath || '', file.filename).replace(/\\/g, '/')
      : null;

    const minutes = await prisma.meetingMinutes.create({
      data: {
        schoolId: req.user!.schoolId!,
        date: new Date(date),
        title,
        attendees: attendees || '',
        status: status || 'Draft',
        documentUrl
      }
    });

    res.status(201).json(minutes);
  } catch (error) {
    console.error('Error creating meeting minutes:', error);
    res.status(500).json({ error: 'Failed to create meeting minutes' });
  }
});

// Delete meeting minutes record
router.delete('/:id', requireAuth, async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  try {
    await prisma.meetingMinutes.deleteMany({
      where: {
        id: id as string,
        schoolId: req.user!.schoolId!
      }
    });
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting meeting minutes:', error);
    res.status(500).json({ error: 'Failed to delete meeting minutes' });
  }
});

export default router;
