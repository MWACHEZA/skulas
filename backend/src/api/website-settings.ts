import express, { Response } from 'express';
import { requireAuth, requireRole, AuthRequest } from '../middleware/auth';
import prisma from '../lib/prisma';
import { brandingUpload } from '../middleware/upload';

const router = express.Router();

// GET current website settings for the school
router.get('/', requireAuth, requireRole('SCHOOL_ADMIN', 'ANCILLARY'), async (req: AuthRequest, res: Response) => {
  try {
    const settings = await prisma.websiteSettings.findFirst({
      where: { schoolId: req.user!.schoolId }
    });
    
    // Return empty object if none exist, the frontend can handle defaults
    res.json(settings || {});
  } catch (error) {
    console.error('Failed to fetch website settings:', error);
    res.status(500).json({ error: 'Failed to fetch settings' });
  }
});

// PUT / POST to update website settings
router.put('/', requireAuth, requireRole('SCHOOL_ADMIN', 'ANCILLARY'), async (req: AuthRequest, res: Response) => {
  try {
    const schoolId = req.user!.schoolId;
    const updateData = req.body;
    
    const settings = await prisma.websiteSettings.upsert({
      where: { schoolId },
      update: updateData,
      create: {
        ...updateData,
        schoolId
      }
    });

    res.json(settings);
  } catch (error) {
    console.error('Failed to update website settings:', error);
    res.status(500).json({ error: 'Failed to update settings' });
  }
});

// POST /api/website-settings/upload
router.post('/upload', requireAuth, requireRole('SCHOOL_ADMIN', 'ANCILLARY'), brandingUpload.single('file'), async (req: AuthRequest, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }
    // Return the filename to be saved in the database
    res.json({ filename: req.file.filename });
  } catch (error) {
    console.error('Failed to upload file:', error);
    res.status(500).json({ error: 'Failed to upload file' });
  }
});

export default router;
