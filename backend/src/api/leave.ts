import { Router } from 'express';
import prisma from '../lib/prisma';
import { requireAuth, requireRole, AuthRequest } from '../middleware/auth';

const router = Router();

// Get the logged in user's leave applications
router.get('/my', requireAuth, async (req: AuthRequest, res) => {
  try {
    const leaves = await prisma.staffLeave.findMany({
      where: { 
        schoolId: req.user!.schoolId!,
        userId: req.user!.id
      },
      orderBy: { createdAt: 'desc' }
    });
    res.json(leaves);
  } catch (error) {
    console.error('Error fetching leaves:', error);
    res.status(500).json({ error: 'Failed to fetch leave applications' });
  }
});

// Get all leave applications for the school (HR/Admin)
router.get('/', requireAuth, requireRole('SCHOOL_ADMIN', 'SUPER_ADMIN'), async (req: AuthRequest, res) => {
  try {
    const leaves = await prisma.staffLeave.findMany({
      where: { schoolId: req.user!.schoolId! },
      orderBy: { createdAt: 'desc' }
    });
    
    // Manually map users since StaffLeave lacks a Prisma relation to User
    const userIds = [...new Set(leaves.map(l => l.userId))];
    const users = await prisma.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, name: true, role: true }
    });
    const userMap = new Map(users.map(u => [u.id, u]));
    
    const leavesWithUser = leaves.map(l => ({
      ...l,
      user: userMap.get(l.userId) || { id: l.userId, name: 'Unknown', role: 'UNKNOWN' }
    }));
    
    res.json(leavesWithUser);
  } catch (error) {
    console.error('Error fetching all leaves:', error);
    res.status(500).json({ error: 'Failed to fetch leave registry' });
  }
});

// Submit a new leave application
router.post('/', requireAuth, requireRole('SCHOOL_ADMIN', 'TEACHER', 'BURSAR', 'ANCILLARY'), async (req: AuthRequest, res) => {
  try {
    const { startDate, endDate, reason } = req.body;

    if (!startDate || !endDate || !reason) {
      return res.status(400).json({ error: 'Start date, end date, and reason are required' });
    }

    const leave = await prisma.staffLeave.create({
      data: {
        schoolId: req.user!.schoolId!,
        userId: req.user!.id,
        leaveType: 'annual', // default, can be expanded later
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        reason,
        status: 'Pending'
      }
    });

    res.json(leave);
  } catch (error) {
    console.error('Error submitting leave application:', error);
    res.status(500).json({ error: 'Failed to submit leave application' });
  }
});

// Update leave status
router.patch('/:id/status', requireAuth, requireRole('SCHOOL_ADMIN', 'SUPER_ADMIN'), async (req: AuthRequest, res) => {
  try {
    const id = req.params.id as string;
    const { status } = req.body;

    if (!['Approved', 'Rejected', 'Pending'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    const leave = await prisma.staffLeave.update({
      where: { id, schoolId: req.user!.schoolId! },
      data: { status }
    });

    res.json(leave);
  } catch (error) {
    console.error('Error updating leave status:', error);
    res.status(500).json({ error: 'Failed to update leave status' });
  }
});

// Delete leave
router.delete('/:id', requireAuth, requireRole('SCHOOL_ADMIN', 'SUPER_ADMIN'), async (req: AuthRequest, res) => {
  try {
    const id = req.params.id as string;

    await prisma.staffLeave.delete({
      where: { id, schoolId: req.user!.schoolId! }
    });

    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting leave:', error);
    res.status(500).json({ error: 'Failed to delete leave' });
  }
});

export default router;
