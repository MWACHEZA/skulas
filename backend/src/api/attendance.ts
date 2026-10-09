import { Router } from 'express';
import prisma from '../lib/prisma';
import { requireAuth, requireRole, AuthRequest } from '../middleware/auth';
import { startOfDay, endOfDay } from 'date-fns';
import fs from 'fs';
import path from 'path';
import { NotificationService } from '../services/notifications';

const router = Router();

// Get daily attendance for a class
router.get('/', requireAuth, async (req: AuthRequest, res) => {
  try {
    const { classId, date } = req.query;
    if (!classId || !date) {
      return res.status(400).json({ error: 'classId and date are required' });
    }

    const queryDate = new Date(date as string);
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 100;
    const skip = (page - 1) * limit;

    const [attendances, total] = await Promise.all([
      prisma.attendance.findMany({
        where: {
          schoolId: req.user!.schoolId!,
          student: {
            classId: classId as string
          },
          date: {
            gte: startOfDay(queryDate),
            lte: endOfDay(queryDate)
          }
        },
        include: {
          student: true
        },
        skip,
        take: limit
      }),
      prisma.attendance.count({
        where: {
          schoolId: req.user!.schoolId!,
          student: {
            classId: classId as string
          },
          date: {
            gte: startOfDay(queryDate),
            lte: endOfDay(queryDate)
          }
        }
      })
    ]);
    
    res.json({ data: attendances, total, page, limit });
  } catch (error) {
    console.error('Error fetching attendance:', error);
    res.status(500).json({ error: "We couldn't load the attendance records right now due to a network connection issue. Please refresh the page." });
  }
});

// Mark student attendance (Manual)
router.post('/', requireAuth, requireRole('TEACHER', 'SCHOOL_ADMIN', 'SUPER_ADMIN'), async (req: AuthRequest, res) => {
  try {
    const { studentId, date, status, note } = req.body;
    
    if (!studentId || !date || !status) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const queryDate = new Date(date);

    // Find existing attendance
    const existing = await prisma.attendance.findFirst({
      where: {
        schoolId: req.user!.schoolId!,
        studentId,
        date: startOfDay(queryDate),
        classId: req.body.classId || null
      }
    });

    let attendance;
    if (existing) {
      attendance = await prisma.attendance.update({
        where: { id: existing.id },
        data: {
          status,
          note,
          teacherId: req.user!.staffId || 'admin',
          scanMethod: 'Manual'
        }
      });
    } else {
      attendance = await prisma.attendance.create({
        data: {
          schoolId: req.user!.schoolId!,
          studentId,
          date: startOfDay(queryDate),
          status,
          note,
          teacherId: req.user!.staffId || 'admin',
          classId: req.body.classId || null,
          scanMethod: 'Manual'
        }
      });
    }

    res.json({ success: true, attendance });
  } catch (error) {
    console.error('Error saving attendance:', error);
    res.status(500).json({ error: "We couldn't save today's attendance because the connection to the server was lost. Please check your internet and try clicking save again." });
  }
});

// Helper to run a gate check on a student
async function runGateCheck(studentId: string, schoolId: string) {
  const student = await prisma.student.findFirst({
    where: { id: studentId },
    include: { class: true }
  });

  if (!student || student.schoolId !== schoolId) {
    return { allowed: false, reason: 'Student not found or unauthorized' };
  }

  // Calculate fee balance
  const fees = await prisma.fee.findMany({
    where: { studentId: student.id }
  });
  const totalFees = fees.reduce((sum, f) => sum + f.amount, 0);
  const totalPaid = fees.reduce((sum, f) => sum + f.paid, 0);
  const balance = totalFees - totalPaid;

  // Load school gate settings
  let settings = await prisma.schoolSetting.findFirst({
    where: { schoolId }
  });

  // Create default fallback settings if missing
  if (!settings) {
    settings = await prisma.schoolSetting.create({
      data: { schoolId }
    });
  }

  const gateMinPaid = settings.gateMinPaidAmount;
  const gateMinPercent = settings.gateMinPaidPercent;
  const gateType = settings.gateRequiredType || 'none';

  let allowed = false;
  let reason = '';

  if (gateType === 'none' || balance <= 0) {
    allowed = true;
    reason = 'Allowed: School has no gate entry fee requirements, or balance is fully settled.';
  } else if (gateType === 'amount') {
    if (totalPaid >= gateMinPaid) {
      allowed = true;
      reason = `Allowed: Total fees paid ($${totalPaid.toFixed(2)}) meets/exceeds the required gate figure ($${gateMinPaid.toFixed(2)}).`;
    } else {
      reason = `Denied: Total fees paid ($${totalPaid.toFixed(2)}) is below the required gate figure ($${gateMinPaid.toFixed(2)}).`;
    }
  } else if (gateType === 'percent') {
    const paidPercent = totalFees > 0 ? (totalPaid / totalFees) * 100 : 100;
    if (paidPercent >= gateMinPercent) {
      allowed = true;
      reason = `Allowed: Fees paid (${paidPercent.toFixed(1)}%) meets/exceeds the required gate percentage (${gateMinPercent}%).`;
    } else {
      reason = `Denied: Fees paid (${paidPercent.toFixed(1)}%) is below the required gate percentage (${gateMinPercent}%).`;
    }
  }

  // If not allowed, check for ACTIVE payment plans
  if (!allowed) {
    const activePlans = await prisma.paymentPlan.findMany({
      where: {
        studentId: student.id,
        status: { in: ['ACTIVE', 'DEFAULTED'] }
      },
      orderBy: { createdAt: 'desc' },
      include: { installments: { orderBy: { dueDate: 'asc' } } }
    });

    if (activePlans.length > 0) {
      const latestPlan = activePlans[0];

      if (latestPlan.status === 'DEFAULTED') {
        allowed = false;
        reason = `Denied: Overdue payment plan.`;
      } else {
        allowed = true;
        reason = `Allowed: Covered by active payment plan.`;
      }
    }
  }

  return {
    allowed,
    reason,
    student,
    totalFees,
    totalPaid,
    balance,
    gateMinPaid,
    gateMinPercent,
    gateType
  };
}

// Get gate check status for a student QR scan
router.get('/gate-check', requireAuth, async (req: AuthRequest, res) => {
  try {
    const { qrData } = req.query;
    if (!qrData) {
      return res.status(400).json({ error: 'qrData is required' });
    }

    const check = await runGateCheck(qrData as string, req.user!.schoolId!);
    res.json(check);
  } catch (error) {
    console.error('Error running gate check:', error);
    res.status(500).json({ error: "We couldn't verify the student's fee status right now. Please check your connection and try scanning the QR code again." });
  }
});

// Mark student attendance via QR code (with gate check enforcement)
router.post('/qr', requireAuth, requireRole('TEACHER', 'SCHOOL_ADMIN', 'SUPER_ADMIN', 'ANCILLARY'), async (req: AuthRequest, res) => {
  try {
    const { qrData, date, forceAllow } = req.body;
    
    if (!qrData) {
      return res.status(400).json({ error: 'QR data is missing' });
    }

    const schoolId = req.user!.schoolId!;
    const gateCheck = await runGateCheck(qrData, schoolId);

    if (!gateCheck.allowed && !forceAllow) {
      return res.status(403).json({ 
        error: gateCheck.reason, 
        gateDenied: true,
        gateCheck 
      });
    }

    const student = gateCheck.student;
    if (!student) {
      return res.status(404).json({ error: 'Student not found' });
    }

    const queryDate = date ? new Date(date) : new Date();

    const existing = await prisma.attendance.findFirst({
      where: {
        schoolId,
        studentId: student.id,
        date: startOfDay(queryDate),
        classId: null
      }
    });

    let attendance;
    if (existing) {
      attendance = await prisma.attendance.update({
        where: { id: existing.id },
        data: {
          status: 'present',
          teacherId: req.user!.staffId || 'admin',
          scanMethod: 'QR Code'
        }
      });
    } else {
      attendance = await prisma.attendance.create({
        data: {
          schoolId,
          studentId: student.id,
          date: startOfDay(queryDate),
          status: 'present',
          teacherId: req.user!.staffId || 'admin',
          classId: null,
          scanMethod: 'QR Code'
        }
      });
    }

    res.json({ success: true, attendance, student, gateCheck });
  } catch (error) {
    console.error('Error marking QR attendance:', error);
    res.status(500).json({ error: 'Failed to mark QR attendance' });
  }
});

// GET student clock-in/out image logs from storage
router.get('/student-clock-ins', requireAuth, async (req: AuthRequest, res) => {
  try {
    const schoolId = req.user!.schoolId!;
    const schoolCode = req.user!.schoolCode || 'global';
    
    // Check permission (TEACHER/LIBRARIAN/HOD or ADMIN roles)
    const allowedRoles = ['SUPER_ADMIN', 'SCHOOL_ADMIN', 'BURSAR', 'HR', 'TEACHER', 'LIBRARIAN'];
    if (!allowedRoles.includes(req.user!.role)) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const { date } = req.query;
    const queryDate = date ? new Date(date as string) : new Date();
    
    // YYYY-MM
    const yearMonth = `${queryDate.getFullYear()}-${String(queryDate.getMonth() + 1).padStart(2, '0')}`;
    // DD
    const day = String(queryDate.getDate()).padStart(2, '0');

    // Build directory path: storage/[schoolCode]/attendance/YYYY-MM/DD/
    const storageDir = path.join(__dirname, '../../storage', schoolCode, 'attendance', yearMonth, day);
    
    const logs: any[] = [];

    if (fs.existsSync(storageDir)) {
      const files = fs.readdirSync(storageDir);

      // Check headed departments for HOD
      const isAdmin = ['SUPER_ADMIN', 'SCHOOL_ADMIN', 'BURSAR', 'HR'].includes(req.user!.role);
      let headedDeptIds: string[] = [];
      if (!isAdmin) {
        const headedDepts = await prisma.department.findMany({
          where: { schoolId, headId: req.user!.id }
        });
        if (headedDepts.length === 0) {
          // If they are not an HOD (and not admin), they can see no students
          return res.json([]);
        }
        headedDeptIds = headedDepts.map(d => d.id);
      }

      for (const file of files) {
        const match = file.match(/^(.*)_(in|out)(?:\..+)?$/i);
        if (match) {
          const studentIdentifier = match[1];
          const direction = match[2].toLowerCase(); // 'in' or 'out'

          // Get Student Details
          const student = await prisma.student.findFirst({
            where: {
              schoolId,
              OR: [
                { id: studentIdentifier },
                { studentId: studentIdentifier }
              ]
            },
            include: {
              class: true,
              user: {
                select: {
                  id: true,
                  departmentId: true,
                  dept: {
                    select: {
                      name: true
                    }
                  }
                }
              }
            }
          });

          if (!student) continue;

          // HOD partitioning: restrict to department
          if (!isAdmin) {
            if (!student.user?.departmentId || !headedDeptIds.includes(student.user.departmentId)) {
              continue; // Skip student not in headed department
            }
          }

          const stat = fs.statSync(path.join(storageDir, file));

          logs.push({
            id: `${student.id}_${direction}`,
            student: {
              id: student.id,
              studentId: student.studentId,
              name: student.name,
              class: student.class?.name || 'Unassigned',
              department: student.user?.dept?.name || 'N/A'
            },
            direction: direction === 'in' ? 'Clock In' : 'Clock Out',
            time: stat.mtime,
            image: `/api/storage/media/${schoolCode}/attendance/${yearMonth}/${day}/${file}`
          });
        }
      }
    }

    // Sort by time descending
    logs.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());

    res.json(logs);
  } catch (error) {
    console.error('Error fetching student clock-in logs:', error);
    res.status(500).json({ error: 'Failed to fetch student clock-in logs' });
  }
});

// --- Phase 1: Attendance & Roll Call (Register, QR, Period) ---

// 1. Get Roll Call
router.get('/roll-call', requireAuth, async (req: AuthRequest, res) => {
  const { classId, date, session } = req.query;
  const schoolId = req.user?.schoolId;

  if (!schoolId || !classId || !date || !session) {
    return res.status(400).json({ error: 'Missing required parameters' });
  }

  try {
    const register = await prisma.attendanceRegister.findUnique({
      where: {
        schoolId_classId_date_session: {
          schoolId,
          classId: String(classId),
          date: new Date(String(date)),
          session: String(session),
        },
      },
      include: { records: true },
    });
    res.json(register || { records: [] });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch roll call' });
  }
});

// 2. Submit Roll Call
router.post('/roll-call', requireAuth, async (req: AuthRequest, res) => {
  const { classId, date, session, records } = req.body;
  const schoolId = req.user?.schoolId;

  if (!schoolId) return res.status(401).json({ error: 'Unauthorized' });

  try {
    const parsedDate = new Date(date);
    
    const register = await prisma.attendanceRegister.upsert({
      where: {
        schoolId_classId_date_session: {
          schoolId,
          classId,
          date: parsedDate,
          session,
        },
      },
      update: { submitted: true },
      create: {
        schoolId,
        classId,
        date: parsedDate,
        session,
        submitted: true,
      },
    });

    for (const record of records) {
      await prisma.attendanceRecord.upsert({
        where: {
          registerId_studentId: {
            registerId: register.id,
            studentId: record.studentId,
          },
        },
        update: {
          status: record.status,
          notes: record.notes,
        },
        create: {
          registerId: register.id,
          studentId: record.studentId,
          status: record.status,
          notes: record.notes,
        },
      });
    }

    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to submit roll call' });
  }
});

// 3. Generate QR Code Session
router.post('/qr/generate', requireAuth, async (req: AuthRequest, res) => {
  const { classId, periodId, expiresMinutes } = req.body;
  const teacherId = req.user?.id;

  if (!teacherId) return res.status(401).json({ error: 'Unauthorized' });

  try {
    const code = Math.random().toString(36).substring(2, 10).toUpperCase();
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + (expiresMinutes || 10));

    const session = await prisma.qrCodeSession.create({
      data: {
        teacherId,
        classId,
        periodId,
        date: new Date(),
        code,
        expiresAt,
      },
    });

    res.json({ code: session.code, expiresAt: session.expiresAt });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to generate QR code' });
  }
});

// 4. Scan QR Code
router.post('/qr/scan', requireAuth, async (req: AuthRequest, res) => {
  const { code, studentId, locationData } = req.body;

  try {
    const session = await prisma.qrCodeSession.findUnique({ where: { code } });
    if (!session) return res.status(404).json({ error: 'Invalid QR code' });
    if (new Date() > session.expiresAt) return res.status(400).json({ error: 'QR code expired' });

    if (session.periodId) {
      await prisma.periodAttendance.upsert({
        where: {
          studentId_timetablePeriodId_date: {
            studentId,
            timetablePeriodId: session.periodId,
            date: session.date,
          }
        },
        update: { status: 'Present', scannedAt: new Date() },
        create: {
          studentId,
          timetablePeriodId: session.periodId,
          date: session.date,
          status: 'Present',
          scannedAt: new Date(),
        }
      });
    }

    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to record scan' });
  }
});

// ==========================================
// PHASE 5: UNIFIED ATTENDANCE ENDPOINTS
// ==========================================

// 1. Get or initialize an attendance session (Daily / Period / Boarding)
router.get('/sessions', requireAuth, async (req: AuthRequest, res) => {
  try {
    const schoolId = req.user!.schoolId!;
    const { date, classId, period = 'Homeroom', type = 'daily' } = req.query;

    if (!date) {
      return res.status(400).json({ error: 'date is required' });
    }

    const queryDate = new Date(date as string);

    // Look for existing session
    const existingSession = await prisma.attendanceSession.findFirst({
      where: {
        schoolId,
        date: queryDate,
        classId: (classId as string) || null,
        period: period as string,
        type: type as string
      },
      include: {
        records: {
          include: {
            student: {
              select: {
                id: true,
                studentId: true,
                name: true,
                gender: true,
                status: true
              }
            }
          }
        }
      }
    });

    if (existingSession) {
      return res.json({ session: existingSession, isNew: false });
    }

    // If no session exists yet, return student roster with default 'present'
    const students = await prisma.student.findMany({
      where: {
        schoolId,
        status: 'ACTIVE',
        ...(classId ? { classId: classId as string } : {})
      },
      orderBy: { name: 'asc' },
      select: {
        id: true,
        studentId: true,
        name: true,
        gender: true,
        status: true
      }
    });

    res.json({
      session: {
        schoolId,
        date: queryDate,
        classId: classId || null,
        period,
        type,
        submitted: false,
        records: students.map(s => ({
          studentId: s.id,
          student: s,
          status: 'present',
          notes: ''
        }))
      },
      isNew: true
    });
  } catch (error) {
    console.error('Error fetching attendance session:', error);
    res.status(500).json({ error: 'Failed to load attendance session' });
  }
});

// 2. Save Attendance Session with Auto-SMS and 3-Consecutive-Absence Welfare Check
router.post('/sessions/save', requireAuth, async (req: AuthRequest, res) => {
  try {
    const schoolId = req.user!.schoolId!;
    const userId = req.user!.id;
    const { date, classId, period = 'Homeroom', type = 'daily', records } = req.body;

    if (!date || !records || !Array.isArray(records)) {
      return res.status(400).json({ error: 'date and records array are required' });
    }

    const sessionDate = new Date(date);

    // Upsert the AttendanceSession
    let session = await prisma.attendanceSession.findFirst({
      where: {
        schoolId,
        date: sessionDate,
        classId: classId || null,
        period,
        type
      }
    });

    if (session) {
      session = await prisma.attendanceSession.update({
        where: { id: session.id },
        data: {
          submitted: true,
          teacherId: userId
        }
      });
    } else {
      session = await prisma.attendanceSession.create({
        data: {
          schoolId,
          date: sessionDate,
          classId: classId || null,
          period,
          type,
          teacherId: userId,
          submitted: true
        }
      });
    }

    let smsDispatchedCount = 0;
    let disciplineCasesCreated = 0;

    for (const rec of records) {
      const studentId = rec.studentId;
      const status = (rec.status || 'present').toLowerCase();
      const notes = rec.notes || null;

      let parentNotifiedAt: Date | null = null;

      if (status === 'absent') {
        const student = await prisma.student.findUnique({
          where: { id: studentId },
          include: {
            user: true,
            parents: {
              include: {
                parent: {
                  include: {
                    user: true
                  }
                }
              }
            }
          }
        });

        if (student) {
          const parentPhone =
            student.parents?.[0]?.parent?.phone ||
            student.parents?.[0]?.parent?.user?.phone ||
            student.user?.phone;

          if (parentPhone) {
            try {
              await NotificationService.enqueue({
                type: 'SMS',
                schoolId,
                senderId: userId,
                studentId: student.id,
                recipientPhone: parentPhone,
                payload: {
                  message: `Attendance Alert: ${student.name} was marked ABSENT today (${sessionDate.toISOString().slice(0, 10)}). If this is in error, please contact administration.`
                }
              });

              await NotificationService.logCommunication({
                schoolId,
                senderId: userId,
                studentId: student.id,
                type: 'SMS',
                description: `Daily Roll Call Absence Alert for ${student.name} sent to ${parentPhone}`,
                status: 'SENT'
              });

              parentNotifiedAt = new Date();
              smsDispatchedCount++;
            } catch (err) {
              console.error('Error dispatching absence SMS:', err);
            }
          }

          // Check for 3 consecutive absences in daily sessions
          if (type === 'daily') {
            const previousAbsences = await prisma.attendanceSessionRecord.findMany({
              where: {
                studentId: student.id,
                session: {
                  schoolId,
                  type: 'daily',
                  date: { lt: sessionDate }
                }
              },
              orderBy: { session: { date: 'desc' } },
              take: 2,
              include: { session: true }
            });

            if (
              previousAbsences.length === 2 &&
              previousAbsences.every(p => p.status.toLowerCase() === 'absent')
            ) {
              const existingRecord = await prisma.disciplineRecord.findFirst({
                where: {
                  schoolId,
                  studentId: student.id,
                  offenceType: 'TRUANCY / CHRONIC ABSENCE',
                  date: {
                    gte: startOfDay(sessionDate),
                    lte: endOfDay(sessionDate)
                  }
                }
              });

              if (!existingRecord) {
                await prisma.disciplineRecord.create({
                  data: {
                    schoolId,
                    studentId: student.id,
                    reporterId: userId,
                    date: sessionDate,
                    offenceType: 'TRUANCY / CHRONIC ABSENCE',
                    description: `Automated Welfare Flag: ${student.name} has been marked absent for 3 consecutive days. Flagged for welfare check.`,
                    severity: 'MEDIUM',
                    status: 'PENDING',
                    actionTaken: 'Parent alerted via SMS; referred to Class Teacher & Welfare Head.'
                  }
                });
                disciplineCasesCreated++;
              }
            }
          }
        }
      }

      await prisma.attendanceSessionRecord.upsert({
        where: {
          sessionId_studentId: {
            sessionId: session.id,
            studentId
          }
        },
        update: {
          status,
          notes,
          markedById: userId,
          markedAt: new Date(),
          ...(parentNotifiedAt ? { parentNotifiedAt } : {})
        },
        create: {
          sessionId: session.id,
          studentId,
          status,
          notes,
          markedById: userId,
          markedAt: new Date(),
          parentNotifiedAt
        }
      });
    }

    // If type is boarding, also sync to BoardingRollCall
    if (type === 'boarding') {
      const timeSlot = period.includes('21') ? '21:00' : '18:00';
      for (const rec of records) {
        const allocation = await prisma.hostelBedAllocation.findFirst({
          where: { studentId: rec.studentId, status: 'ACTIVE' }
        });
        if (allocation?.hostelId) {
          const existingRoll = await prisma.boardingRollCall.findFirst({
            where: {
              schoolId,
              hostelId: allocation.hostelId,
              date: sessionDate,
              time: timeSlot,
              studentId: rec.studentId
            }
          });
          if (existingRoll) {
            await prisma.boardingRollCall.update({
              where: { id: existingRoll.id },
              data: {
                status: rec.status,
                notes: rec.notes,
                markedById: userId
              }
            });
          } else {
            await prisma.boardingRollCall.create({
              data: {
                schoolId,
                hostelId: allocation.hostelId,
                date: sessionDate,
                time: timeSlot,
                studentId: rec.studentId,
                status: rec.status,
                notes: rec.notes,
                markedById: userId
              }
            });
          }
        }
      }
    }

    const allRecords = await prisma.attendanceSessionRecord.findMany({
      where: { sessionId: session.id }
    });
    const total = allRecords.length;
    const present = allRecords.filter(r => r.status.toLowerCase() === 'present').length;
    const absent = allRecords.filter(r => r.status.toLowerCase() === 'absent').length;
    const late = allRecords.filter(r => r.status.toLowerCase() === 'late').length;
    const attendanceRate = total > 0 ? parseFloat(((present / total) * 100).toFixed(1)) : 100.0;

    res.json({
      success: true,
      session,
      stats: { total, present, absent, late, attendanceRate },
      smsDispatchedCount,
      disciplineCasesCreated
    });
  } catch (error) {
    console.error('Error saving attendance session:', error);
    res.status(500).json({ error: 'Failed to save attendance session' });
  }
});

// 3. Absentee Report with chronic absentee detection
router.get('/absentee-report', requireAuth, async (req: AuthRequest, res) => {
  try {
    const schoolId = req.user!.schoolId!;
    const { startDate, endDate, classId, threshold = '80' } = req.query;
    const thresholdNum = parseFloat(threshold as string) || 80.0;

    const fromDate = startDate ? new Date(startDate as string) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const toDate = endDate ? new Date(endDate as string) : new Date();

    const students = await prisma.student.findMany({
      where: {
        schoolId,
        status: 'ACTIVE',
        ...(classId ? { classId: classId as string } : {})
      },
      include: {
        class: true
      }
    });

    const report = [];
    for (const s of students) {
      const records = await prisma.attendanceSessionRecord.findMany({
        where: {
          studentId: s.id,
          session: {
            schoolId,
            type: 'daily',
            date: { gte: fromDate, lte: toDate }
          }
        }
      });

      const disciplineRecords = await prisma.disciplineRecord.findMany({
        where: {
          schoolId,
          studentId: s.id,
          offenceType: 'TRUANCY / CHRONIC ABSENCE'
        },
        orderBy: { date: 'desc' }
      });

      const totalSessions = records.length;
      const absentCount = records.filter(r => r.status.toLowerCase() === 'absent').length;
      const lateCount = records.filter(r => r.status.toLowerCase() === 'late').length;
      const presentCount = records.filter(r => r.status.toLowerCase() === 'present').length;
      const rate = totalSessions > 0 ? parseFloat(((presentCount / totalSessions) * 100).toFixed(1)) : 100.0;

      const isChronic = rate < thresholdNum || absentCount >= 3;

      report.push({
        studentId: s.studentId,
        id: s.id,
        name: s.name,
        className: s.class?.name || 'Unassigned',
        totalSessions,
        presentCount,
        absentCount,
        lateCount,
        rate,
        isChronic,
        welfareCases: disciplineRecords.length,
        lastWelfareCase: disciplineRecords[0] || null
      });
    }

    report.sort((a, b) => a.rate - b.rate);

    res.json({
      students: report,
      summary: {
        totalEvaluated: report.length,
        chronicAbsentees: report.filter(r => r.isChronic).length,
        averageRate: report.length > 0 ? parseFloat((report.reduce((sum, r) => sum + r.rate, 0) / report.length).toFixed(1)) : 100.0
      }
    });
  } catch (error) {
    console.error('Error fetching absentee report:', error);
    res.status(500).json({ error: 'Failed to generate absentee report' });
  }
});

// 4. Attendance SMS Log
router.get('/sms-log', requireAuth, async (req: AuthRequest, res) => {
  try {
    const schoolId = req.user!.schoolId!;
    const logs = await prisma.communicationLog.findMany({
      where: {
        schoolId,
        type: 'SMS',
        description: { contains: 'Absence' }
      },
      orderBy: { createdAt: 'desc' },
      take: 100
    });
    res.json(logs);
  } catch (error) {
    console.error('Error fetching SMS log:', error);
    res.status(500).json({ error: 'Failed to fetch attendance SMS logs' });
  }
});

// 5. Daily Attendance Stats Overview
router.get('/stats', requireAuth, async (req: AuthRequest, res) => {
  try {
    const schoolId = req.user!.schoolId!;
    const { date } = req.query;
    const queryDate = date ? new Date(date as string) : new Date();

    const totalStudents = await prisma.student.count({
      where: { schoolId, status: 'ACTIVE' }
    });

    const sessions = await prisma.attendanceSession.findMany({
      where: {
        schoolId,
        date: queryDate,
        type: 'daily'
      },
      include: {
        records: true,
        class: true
      }
    });

    let totalMarked = 0;
    let presentCount = 0;
    let absentCount = 0;
    let lateCount = 0;

    const classBreakdown: any[] = [];

    for (const sess of sessions) {
      const sessTotal = sess.records.length;
      const sessPresent = sess.records.filter(r => r.status.toLowerCase() === 'present').length;
      const sessAbsent = sess.records.filter(r => r.status.toLowerCase() === 'absent').length;
      const sessLate = sess.records.filter(r => r.status.toLowerCase() === 'late').length;

      totalMarked += sessTotal;
      presentCount += sessPresent;
      absentCount += sessAbsent;
      lateCount += sessLate;

      classBreakdown.push({
        classId: sess.classId,
        className: sess.class?.name || 'Class',
        total: sessTotal,
        present: sessPresent,
        absent: sessAbsent,
        rate: sessTotal > 0 ? parseFloat(((sessPresent / sessTotal) * 100).toFixed(1)) : 100.0
      });
    }

    const attendanceRate = totalMarked > 0 ? parseFloat(((presentCount / totalMarked) * 100).toFixed(1)) : 100.0;

    res.json({
      totalStudents,
      totalMarked,
      presentCount,
      absentCount,
      lateCount,
      attendanceRate,
      classBreakdown
    });
  } catch (error) {
    console.error('Error fetching attendance stats:', error);
    res.status(500).json({ error: 'Failed to load attendance stats' });
  }
});

// 6. Report Card Attendance Comments Feed
router.get('/report-card-comments', requireAuth, async (req: AuthRequest, res) => {
  try {
    const schoolId = req.user!.schoolId!;
    const { classId, threshold = '80' } = req.query;
    const minThreshold = parseFloat(threshold as string) || 80.0;

    const students = await prisma.student.findMany({
      where: {
        schoolId,
        status: 'ACTIVE',
        ...(classId ? { classId: classId as string } : {})
      },
      include: { class: true }
    });

    const recommendations = [];
    for (const s of students) {
      const records = await prisma.attendanceSessionRecord.findMany({
        where: {
          studentId: s.id,
          session: { schoolId, type: 'daily' }
        }
      });

      const total = records.length;
      const present = records.filter(r => r.status.toLowerCase() === 'present').length;
      const rate = total > 0 ? parseFloat(((present / total) * 100).toFixed(1)) : 100.0;

      let comment = '';
      if (rate < minThreshold) {
        comment = `Attendance is critically low at ${rate}% (below the ${minThreshold}% minimum requirement). Parent conference recommended.`;
      } else if (rate >= 95.0) {
        comment = `Exemplary attendance record of ${rate}%. Shows commendable punctuality and dedication.`;
      } else {
        comment = `Satisfactory attendance level of ${rate}%. Consistent attendance supports steady academic progress.`;
      }

      recommendations.push({
        studentId: s.studentId,
        id: s.id,
        name: s.name,
        className: s.class?.name || 'Unassigned',
        totalSessions: total,
        presentSessions: present,
        rate,
        comment,
        belowThreshold: rate < minThreshold
      });
    }

    res.json(recommendations);
  } catch (error) {
    console.error('Error generating report card comments:', error);
    res.status(500).json({ error: 'Failed to generate comments' });
  }
});

export default router;
