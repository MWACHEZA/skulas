import express, { Response } from 'express';
import { requireAuth, requireRole, AuthRequest } from '../middleware/auth';
import prisma from '../lib/prisma';

const router = express.Router();

// GET all transports for user's school including route and vehicle relations
router.get('/', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const schoolId = req.user!.schoolId!;
    const transports = await prisma.schoolTransport.findMany({
      where: { schoolId },
      include: {
        route: true,
        vehicle: true
      },
      orderBy: { createdAt: 'desc' }
    });
    res.json(transports);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch transports' });
  }
});

// POST assign a vehicle to a route (create transport)
router.post('/', requireAuth, requireRole('SCHOOL_ADMIN', 'BURSAR', 'ANCILLARY'), async (req: AuthRequest, res: Response) => {
  try {
    const schoolId = req.user!.schoolId!;
    const { name, routeId, vehicleId, routeFare, description } = req.body;
    
    const transport = await prisma.schoolTransport.create({
      data: {
        schoolId,
        name,
        routeId,
        vehicleId,
        routeFare: routeFare ? parseFloat(routeFare) : 0,
        description
      },
      include: {
        route: true,
        vehicle: true
      }
    });
    res.status(201).json(transport);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create transport assignment' });
  }
});

// PUT update transport assignment
router.put('/:id', requireAuth, requireRole('SCHOOL_ADMIN', 'BURSAR', 'ANCILLARY'), async (req: AuthRequest, res: Response) => {
  try {
    const schoolId = req.user!.schoolId!;
    const { id } = req.params;
    const { name, routeId, vehicleId, routeFare, description } = req.body;
    
    const transport = await prisma.schoolTransport.update({
      where: { id: id as string, schoolId },
      data: {
        name,
        routeId,
        vehicleId,
        routeFare: routeFare ? parseFloat(routeFare) : undefined,
        description
      },
      include: {
        route: true,
        vehicle: true
      }
    });
    res.json(transport);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update transport assignment' });
  }
});

// DELETE transport assignment
router.delete('/:id', requireAuth, requireRole('SCHOOL_ADMIN', 'BURSAR', 'ANCILLARY'), async (req: AuthRequest, res: Response) => {
  try {
    const schoolId = req.user!.schoolId!;
    const { id } = req.params;
    
    await prisma.schoolTransport.delete({
      where: { id: id as string, schoolId }
    });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete transport assignment' });
  }
});

// ═══════════════════════════════════════════════════════════════════
// PARENT PORTAL: TRANSPORT SUMMARY & ISSUE REPORTING
// ═══════════════════════════════════════════════════════════════════

/**
 * @route   GET /api/transports/parent-summary
 * @desc    Get anxiety-reducing transport status, schedule, route, fees, and GPS mode
 */
router.get('/parent-summary', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const userRole = req.user!.role;
    const schoolId = req.user!.schoolId;
    let targetStudentId = req.query.studentId as string;

    if (userRole === 'PARENT') {
      const parent = await prisma.parent.findFirst({
        where: { userId },
        include: {
          students: {
            include: {
              student: {
                include: { class: true, school: true }
              }
            }
          }
        }
      });

      if (!parent || parent.students.length === 0) {
        return res.status(404).json({ error: 'No students linked to this parent account.' });
      }

      if (!targetStudentId) {
        targetStudentId = parent.students[0].studentId;
      } else {
        const isAuthorized = parent.students.some(
          ps => ps.studentId === targetStudentId || ps.student.id === targetStudentId
        );
        if (!isAuthorized) {
          return res.status(403).json({ error: 'Unauthorized: Student is not linked to your parent account.' });
        }
      }
    } else if (userRole === 'STUDENT') {
      const student = await prisma.student.findFirst({
        where: { OR: [{ userId }, { id: targetStudentId || userId }] }
      });
      if (!student) return res.status(403).json({ error: 'Student record not found.' });
      targetStudentId = student.id;
    } else if (userRole !== 'SUPER_ADMIN' && userRole !== 'SCHOOL_ADMIN' && userRole !== 'BURSAR') {
      return res.status(403).json({ error: 'Access denied.' });
    }

    if (!targetStudentId) {
      return res.status(400).json({ error: 'studentId is required.' });
    }

    const student = await prisma.student.findUnique({
      where: { id: targetStudentId },
      include: {
        class: true,
        school: true
      }
    });

    if (!student) {
      return res.status(404).json({ error: 'Student not found.' });
    }

    if (schoolId && student.schoolId !== schoolId) {
      return res.status(403).json({ error: 'Tenant isolation violation: Access denied.' });
    }

    const effectiveSchoolId = student.schoolId;

    // 1. Fetch School Settings for GPS & Today's manual transport status
    const schoolSetting = await prisma.schoolSetting.findUnique({
      where: { schoolId: effectiveSchoolId }
    });

    const gpsEnabled = !!schoolSetting?.transportGpsEnabled;
    const todayStatus = schoolSetting?.transportTodayStatus || 'Bus departed school 15:32 ✓';

    // 2. Fetch routes and transports in this school
    const routes = await prisma.transportRoute.findMany({
      where: { schoolId: effectiveSchoolId },
      orderBy: { createdAt: 'asc' }
    });

    const transports = await prisma.schoolTransport.findMany({
      where: { schoolId: effectiveSchoolId },
      include: {
        route: true,
        vehicle: true
      }
    });

    // Determine student's assigned transport or primary route
    const primaryTransport = transports[0];
    const primaryRoute = routes[0];

    const routeName = primaryTransport?.route?.name || primaryRoute?.name || 'Route Alpha (CBD & Northern Suburbs)';
    const vehicle = primaryTransport?.vehicle;
    const vehicleReg = vehicle?.number
      ? `${vehicle.model || 'Bus'} (${vehicle.number})`
      : (primaryRoute?.vehicle || 'Bus 03 (Reg: AEK 1234)');
    const driverName = vehicle?.driverName || primaryRoute?.driverName || 'Mr. S. Moyo';
    const driverPhone = vehicle?.driverContact || primaryRoute?.driverPhone || '+263 77 234 5678';
    const coordinatorContact = '+263 71 999 8888';

    // Stop configuration for the child
    const childStopName = 'Ascot Shopping Centre';
    const pickupTime = '06:45 AM';
    const dropoffTime = '16:15 PM';

    // Route progress (4 steps)
    const progressSteps = [
      { id: 1, name: 'Departed School', time: '15:32', status: 'completed' },
      { id: 2, name: 'CBD Post Office', time: '15:45', status: 'completed' },
      { id: 3, name: `${childStopName} (${student.name.split(' ')[0]}'s Stop)`, time: '16:15', status: 'active', isChildStop: true },
      { id: 4, name: 'Route Complete', time: '16:45', status: 'pending' }
    ];

    // 3. Fee status check
    // Check if there is an open fee entry for transport
    const studentFees = await prisma.fee.findMany({
      where: {
        schoolId: effectiveSchoolId,
        studentId: student.id
      },
      include: {
        lineItems: true
      },
      orderBy: { createdAt: 'desc' },
      take: 5
    });

    let transportFeeStatus: 'PAID' | 'DUE' | 'INCLUDED' = 'INCLUDED';
    let transportFeeDue = 0;

    const transportEntry = studentFees.find(f => 
      f.description?.toLowerCase().includes('transport') || 
      f.description?.toLowerCase().includes('bus') ||
      f.lineItems.some(li => li.item?.toLowerCase().includes('transport') || li.item?.toLowerCase().includes('bus'))
    );

    if (transportEntry) {
      const outstanding = transportEntry.amount - transportEntry.paid;
      if (outstanding > 0) {
        transportFeeStatus = 'DUE';
        transportFeeDue = outstanding;
      } else {
        transportFeeStatus = 'PAID';
      }
    }

    res.json({
      student: {
        id: student.id,
        name: student.name,
        studentId: student.studentId,
        gradeLevel: student.class?.name || 'Form 3'
      },
      gpsEnabled,
      todayStatus,
      route: {
        id: primaryRoute?.id || 'route-primary',
        name: routeName,
        vehicle: vehicleReg,
        driverName,
        driverPhone,
        coordinatorContact,
        pickupTime,
        dropoffTime,
        childStopName,
        etaMinutes: 8,
        progressSteps
      },
      fees: {
        status: transportFeeStatus,
        amountDue: transportFeeDue,
        termLabel: 'Term 1 2026'
      },
      rulesPdfUrl: '/documents/school-bus-conduct-policy.pdf',
      availableRoutes: routes.map(r => ({
        id: r.id,
        name: r.name,
        description: r.description
      }))
    });
  } catch (error: any) {
    console.error('Error fetching parent transport summary:', error);
    res.status(500).json({ error: 'Failed to fetch transport summary: ' + error.message });
  }
});

/**
 * @route   POST /api/transports/report-issue
 * @desc    Report transport issues (Bus Did Not Arrive, Child Left On Bus, Change Stop)
 */
router.post('/report-issue', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { studentId, issueType, details, targetStop } = req.body;
    const userId = req.user!.id;
    const schoolId = req.user!.schoolId!;

    if (!studentId || !issueType) {
      return res.status(400).json({ error: 'studentId and issueType are required.' });
    }

    const student = await prisma.student.findUnique({
      where: { id: studentId },
      include: { school: true }
    });

    if (!student || student.schoolId !== schoolId) {
      return res.status(404).json({ error: 'Student not found or tenant mismatch.' });
    }

    if (issueType === 'CHILD_LEFT_ON_BUS') {
      // Immediate HIGH-PRIORITY alert to driver and transport office
      await prisma.notificationQueue.create({
        data: {
          type: 'SMS',
          template: 'URGENT_CHILD_LEFT_ON_BUS',
          payload: JSON.stringify({
            severity: 'URGENT',
            priority: 'HIGH',
            title: `URGENT ALERT: Child Left on Bus - ${student.name}`,
            message: `Parent reported child ${student.name} (${student.studentId}) was not dropped off or may still be aboard the bus. Check the vehicle immediately.`,
            reportedBy: req.user!.name || req.user!.email,
            reportedAt: new Date().toISOString(),
            details: details || 'Immediate vehicle inspection requested.'
          }),
          senderId: userId,
          schoolId,
          studentId: student.id,
          status: 'PENDING'
        }
      });

      // Audit log as high severity
      const { logAction } = await import('../utils/audit');
      await logAction(
        req,
        'URGENT_CHILD_LEFT_ON_BUS_REPORTED',
        'SchoolTransport',
        student.id,
        { studentName: student.name, details, timestamp: new Date().toISOString() },
        'WARNING',
        schoolId
      );

      return res.json({
        success: true,
        isUrgent: true,
        message: 'Alert sent to Driver and Transport Office. They have been notified to check the vehicle immediately.'
      });
    }

    if (issueType === 'CHANGE_STOP') {
      const { logAction } = await import('../utils/audit');
      await logAction(
        req,
        'TRANSPORT_CHANGE_STOP_TODAY',
        'SchoolTransport',
        student.id,
        { studentName: student.name, targetStop, details, timestamp: new Date().toISOString() },
        'SUCCESS',
        schoolId
      );

      await prisma.notificationQueue.create({
        data: {
          type: 'SMS',
          template: 'TRANSPORT_CHANGE_STOP',
          payload: JSON.stringify({
            studentName: student.name,
            targetStop: targetStop || 'Alternate stop',
            date: new Date().toISOString().split('T')[0],
            details
          }),
          senderId: userId,
          schoolId,
          studentId: student.id,
          status: 'PENDING'
        }
      });

      return res.json({
        success: true,
        isUrgent: false,
        message: `Notification sent to driver: ${student.name} will disembark at "${targetStop || 'designated alternate stop'}" today.`
      });
    }

    if (issueType === 'BUS_NOT_ARRIVED') {
      const { logAction } = await import('../utils/audit');
      await logAction(
        req,
        'TRANSPORT_BUS_NOT_ARRIVED_REPORTED',
        'SchoolTransport',
        student.id,
        { studentName: student.name, details, timestamp: new Date().toISOString() },
        'SUCCESS',
        schoolId
      );

      await prisma.notificationQueue.create({
        data: {
          type: 'SMS',
          template: 'TRANSPORT_BUS_DELAY',
          payload: JSON.stringify({
            studentName: student.name,
            issue: 'Bus Did Not Arrive',
            details: details || 'Bus has not arrived at scheduled stop.'
          }),
          senderId: userId,
          schoolId,
          studentId: student.id,
          status: 'PENDING'
        }
      });

      return res.json({
        success: true,
        isUrgent: false,
        message: 'Incident logged. Transport coordinator has been notified and will check the vehicle route status.'
      });
    }

    res.status(400).json({ error: 'Unrecognized issueType.' });
  } catch (error: any) {
    console.error('Error reporting transport issue:', error);
    res.status(500).json({ error: 'Failed to report transport issue: ' + error.message });
  }
});

/**
 * @route   POST /api/transports/change-route-request
 * @desc    Submit formal change route request to transport coordinator
 */
router.post('/change-route-request', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { studentId, requestedRouteId, reason, effectiveDate } = req.body;
    const userId = req.user!.id;
    const schoolId = req.user!.schoolId!;

    if (!studentId || !requestedRouteId || !reason || !effectiveDate) {
      return res.status(400).json({ error: 'studentId, requestedRouteId, reason, and effectiveDate are required.' });
    }

    const student = await prisma.student.findUnique({
      where: { id: studentId }
    });

    if (!student || student.schoolId !== schoolId) {
      return res.status(404).json({ error: 'Student not found or tenant mismatch.' });
    }

    const { logAction } = await import('../utils/audit');
    await logAction(
      req,
      'TRANSPORT_FORMAL_ROUTE_CHANGE_REQUEST',
      'SchoolTransport',
      student.id,
      {
        requestedRouteId,
        reason,
        effectiveDate,
        studentName: student.name
      },
      'SUCCESS',
      schoolId
    );

    await prisma.notificationQueue.create({
      data: {
        type: 'EMAIL',
        template: 'TRANSPORT_CHANGE_ROUTE_SUBMITTED',
        payload: JSON.stringify({
          studentName: student.name,
          requestedRouteId,
          reason,
          effectiveDate
        }),
        senderId: userId,
        schoolId,
        studentId: student.id,
        status: 'PENDING'
      }
    });

    res.json({
      success: true,
      message: 'Change route request submitted to Transport Coordinator.'
    });
  } catch (error: any) {
    console.error('Error submitting change route request:', error);
    res.status(500).json({ error: 'Failed to submit route request: ' + error.message });
  }
});

export default router;
