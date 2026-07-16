import { Router } from 'express';
import prisma from '../lib/prisma';
import { requireAuth, AuthRequest } from '../middleware/auth';
import { startOfDay, endOfDay } from 'date-fns';

const router = Router();

// Get the logged in staff member's attendance
router.get('/my', requireAuth, async (req: AuthRequest, res) => {
  try {
    const attendances = await prisma.staffAttendance.findMany({
      where: { 
        schoolId: req.user!.schoolId!,
        staffId: req.user!.id
      },
      orderBy: { date: 'desc' },
      take: 30 // last 30 days
    });

    const logs = attendances.map(record => {
      let hoursPresent = null;
      let schoolHoursPresent = null;
      
      if (record.timeIn) {
        if (record.timeOut) {
          const diffMs = record.timeOut.getTime() - record.timeIn.getTime();
          const diffMins = Math.max(0, Math.floor(diffMs / (1000 * 60)));
          hoursPresent = `${Math.floor(diffMins / 60)}h ${diffMins % 60}m`;
        }
        
        const schoolStart = new Date(record.date);
        schoolStart.setHours(8, 0, 0, 0);
        const schoolEnd = new Date(record.date);
        schoolEnd.setHours(16, 0, 0, 0);
        
        const effectiveIn = new Date(Math.max(record.timeIn.getTime(), schoolStart.getTime()));
        const effectiveOut = record.timeOut 
          ? new Date(Math.min(record.timeOut.getTime(), schoolEnd.getTime()))
          : new Date(Math.min(new Date().getTime(), schoolEnd.getTime()));
          
        if (effectiveIn < effectiveOut) {
          const diffMs = effectiveOut.getTime() - effectiveIn.getTime();
          const diffMins = Math.floor(diffMs / (1000 * 60));
          schoolHoursPresent = `${Math.floor(diffMins / 60)}h ${diffMins % 60}m`;
        } else {
          schoolHoursPresent = '0h 0m';
        }
      }
      return {
        ...record,
        hoursPresent,
        schoolHoursPresent
      };
    });

    res.json(logs);
  } catch (error) {
    console.error('Error fetching staff attendance:', error);
    res.status(500).json({ error: 'Failed to fetch attendance' });
  }
});

// Check today's status
router.get('/today', requireAuth, async (req: AuthRequest, res) => {
  try {
    const today = new Date();
    const attendance = await prisma.staffAttendance.findFirst({
      where: {
        schoolId: req.user!.schoolId!,
        staffId: req.user!.id,
        date: {
          gte: startOfDay(today),
          lte: endOfDay(today)
        }
      }
    });
    res.json(attendance);
  } catch (error) {
    console.error('Error checking today attendance:', error);
    res.status(500).json({ error: 'Failed to check attendance' });
  }
});

// Clock In
router.post('/clock-in', requireAuth, async (req: AuthRequest, res) => {
  try {
    const { image } = req.body;
    const today = new Date();

    // Check if already clocked in today
    const existing = await prisma.staffAttendance.findFirst({
      where: {
        schoolId: req.user!.schoolId!,
        staffId: req.user!.id,
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
        schoolId: req.user!.schoolId!,
        staffId: req.user!.id,
        date: startOfDay(today),
        timeIn: today,
        clockInImage: image,
        status: 'FULL DAY'
      }
    });

    res.json({ success: true, attendance });
  } catch (error) {
    console.error('Error clocking in:', error);
    res.status(500).json({ error: 'Failed to clock in' });
  }
});

// Clock Out
router.post('/clock-out', requireAuth, async (req: AuthRequest, res) => {
  try {
    const { image } = req.body;
    const today = new Date();

    const existing = await prisma.staffAttendance.findFirst({
      where: {
        schoolId: req.user!.schoolId!,
        staffId: req.user!.id,
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
  } catch (error) {
    console.error('Error clocking out:', error);
    res.status(500).json({ error: 'Failed to clock out' });
  }
});

// GET all staff clock-ins for the school filterable by date
router.get('/all', requireAuth, async (req: AuthRequest, res) => {
  try {
    const schoolId = req.user!.schoolId!;
    const userRole = req.user!.role;
    
    // Check if the user is a Head of Department
    const headedDepts = await prisma.department.findMany({
      where: {
        schoolId,
        headId: req.user!.id
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
    const queryDate = date ? new Date(date as string) : new Date();

    // Fetch all active staff users in the school
    const staffUsers = await prisma.user.findMany({
      where: {
        schoolId,
        role: { in: ['SUPER_ADMIN', 'SCHOOL_ADMIN', 'TEACHER', 'BURSAR', 'LIBRARIAN', 'ANCILLARY', 'CLINIC'] }
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        staffId: true,
        departmentId: true
      }
    });

    // Filter staff list if user is HOD but not Admin
    let filteredStaffUsers = staffUsers;
    if (!isAdmin && isHod) {
      filteredStaffUsers = staffUsers.filter(u => 
        u.id === req.user!.id || 
        (u.departmentId && headedDeptIds.includes(u.departmentId))
      );
    }

    // Fetch actual clock-ins for this date
    const actualAttendances = await prisma.staffAttendance.findMany({
      where: {
        schoolId,
        date: {
          gte: startOfDay(queryDate),
          lte: endOfDay(queryDate)
        }
      }
    });

    // Merge actual clock-ins with all staff list to report missing clock-ins
    const logs = filteredStaffUsers.map(user => {
      const record = actualAttendances.find(a => a.staffId === user.id);
      
      let hoursPresent = null;
      let schoolHoursPresent = null;
      
      if (record?.timeIn) {
        if (record.timeOut) {
          const diffMs = record.timeOut.getTime() - record.timeIn.getTime();
          const diffMins = Math.max(0, Math.floor(diffMs / (1000 * 60)));
          hoursPresent = `${Math.floor(diffMins / 60)}h ${diffMins % 60}m`;
        }
        
        // Calculate presence within standard school hours (08:00 - 16:00)
        const schoolStart = new Date(queryDate);
        schoolStart.setHours(8, 0, 0, 0);
        const schoolEnd = new Date(queryDate);
        schoolEnd.setHours(16, 0, 0, 0);
        
        const effectiveIn = new Date(Math.max(record.timeIn.getTime(), schoolStart.getTime()));
        const effectiveOut = record.timeOut 
          ? new Date(Math.min(record.timeOut.getTime(), schoolEnd.getTime()))
          : new Date(Math.min(new Date().getTime(), schoolEnd.getTime()));
          
        if (effectiveIn < effectiveOut) {
          const diffMs = effectiveOut.getTime() - effectiveIn.getTime();
          const diffMins = Math.floor(diffMs / (1000 * 60));
          schoolHoursPresent = `${Math.floor(diffMins / 60)}h ${diffMins % 60}m`;
        } else {
          schoolHoursPresent = '0h 0m';
        }
      }

      return {
        id: record?.id || `virtual_${user.id}`,
        date: queryDate,
        timeIn: record?.timeIn || null,
        timeOut: record?.timeOut || null,
        status: record?.status || 'NOT CLOCKED IN',
        clockInImage: record?.clockInImage || null,
        clockOutImage: record?.clockOutImage || null,
        hoursPresent,
        schoolHoursPresent,
        staff: user
      };
    });

    res.json(logs);
  } catch (error) {
    console.error('Error fetching all staff attendance logs:', error);
    res.status(500).json({ error: 'Failed to fetch attendance logs' });
  }
});

export default router;
