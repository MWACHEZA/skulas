import { Router, Response } from 'express';
import prisma from '../lib/prisma';
import { requireAuth, requireRole, AuthRequest } from '../middleware/auth';
import { validate } from '../middleware/validation';
import { DisciplineService } from '../services/discipline.service';
import {
  CreateDisciplineRecordSchema,
  ApproveDemeritSchema,
  RejectDemeritSchema
} from '../schemas/discipline.schema';

const router = Router();

// All discipline routes require an authenticated user
router.use(requireAuth);

/**
 * @route   GET /api/discipline/records
 * @desc    Get discipline records with filters (studentId, classId, houseId, type, approvalStatus)
 */
router.get('/records', async (req: AuthRequest, res: Response) => {
  try {
    const schoolId = req.user?.schoolId;
    if (!schoolId) {
      return res.status(400).json({ error: 'School ID required' });
    }

    const {
      studentId,
      classId,
      houseId,
      type,
      approvalStatus,
      severity,
      limit = '50',
      page = '1'
    } = req.query;

    const take = Math.min(100, Math.max(1, parseInt(limit as string, 10) || 50));
    const skip = (Math.max(1, parseInt(page as string, 10) || 1) - 1) * take;

    const whereClause: any = { schoolId };

    if (studentId) whereClause.studentId = studentId as string;
    if (type) whereClause.type = type as string;
    if (approvalStatus) whereClause.approvalStatus = approvalStatus as string;
    if (severity) whereClause.severity = severity as string;
    if (houseId) whereClause.houseId = houseId as string;

    if (classId) {
      whereClause.student = { classId: classId as string };
    }

    // Role-based visibility: Parents and students can only see APPROVED records
    if (req.user?.role === 'STUDENT' || req.user?.role === 'PARENT') {
      whereClause.approvalStatus = 'APPROVED';
      if (req.user?.role === 'STUDENT' && req.user?.studentId) {
        whereClause.studentId = req.user.studentId;
      }
    }

    const [records, total] = await Promise.all([
      prisma.disciplineRecord.findMany({
        where: whereClause,
        include: {
          student: {
            select: {
              id: true,
              name: true,
              studentId: true,
              standing: true,
              class: { select: { id: true, name: true, level: true } }
            }
          },
          house: {
            select: { id: true, name: true, color: true }
          }
        },
        orderBy: { date: 'desc' },
        skip,
        take
      }),
      prisma.disciplineRecord.count({ where: whereClause })
    ]);

    // Fetch reporter names
    const reporterIds = [...new Set(records.map((r) => r.reporterId))];
    const reporters = await prisma.user.findMany({
      where: { id: { in: reporterIds } },
      select: { id: true, name: true, role: true }
    });
    const reporterMap = new Map(reporters.map((rep) => [rep.id, rep]));

    const enrichedRecords = records.map((rec) => ({
      ...rec,
      reporter: reporterMap.get(rec.reporterId) || {
        id: rec.reporterId,
        name: 'Staff/Prefect',
        role: rec.reporterRole
      }
    }));

    res.json({
      records: enrichedRecords,
      pagination: {
        total,
        page: parseInt(page as string, 10) || 1,
        limit: take,
        pages: Math.ceil(total / take)
      }
    });
  } catch (error: any) {
    console.error('Failed to list discipline records:', error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
});

/**
 * @route   GET /api/discipline/pending-approvals
 * @desc    List prefect demerits waiting for HOD or Admin authorization
 */
router.get(
  '/pending-approvals',
  requireRole('SCHOOL_ADMIN', 'ADMIN', 'TEACHER', 'HOD', 'HEADMASTER', 'PRINCIPAL'),
  async (req: AuthRequest, res: Response) => {
    try {
      const schoolId = req.user?.schoolId;
      if (!schoolId) {
        return res.status(400).json({ error: 'School ID required' });
      }

      const pendingRecords = await prisma.disciplineRecord.findMany({
        where: {
          schoolId,
          approvalStatus: 'PENDING_HOD_APPROVAL'
        },
        include: {
          student: {
            select: {
              id: true,
              name: true,
              studentId: true,
              standing: true,
              class: { select: { id: true, name: true } },
              house: { select: { id: true, name: true, color: true } }
            }
          }
        },
        orderBy: { date: 'asc' }
      });

      const reporterIds = [...new Set(pendingRecords.map((r) => r.reporterId))];
      const reporters = await prisma.user.findMany({
        where: { id: { in: reporterIds } },
        select: { id: true, name: true, role: true }
      });
      const reporterMap = new Map(reporters.map((rep) => [rep.id, rep]));

      res.json(
        pendingRecords.map((r) => ({
          ...r,
          reporter: reporterMap.get(r.reporterId) || {
            id: r.reporterId,
            name: 'Prefect',
            role: 'PREFECT'
          }
        }))
      );
    } catch (error: any) {
      console.error('Failed to fetch pending discipline approvals:', error);
      res.status(500).json({ error: error.message || 'Internal server error' });
    }
  }
);

/**
 * @route   POST /api/discipline/records
 * @desc    Create a merit or demerit record
 */
router.post(
  '/records',
  validate(CreateDisciplineRecordSchema),
  async (req: AuthRequest, res: Response) => {
    try {
      const schoolId = req.user?.schoolId;
      const reporterId = req.user?.id;
      const userRole = req.user?.role || 'TEACHER';

      if (!schoolId || !reporterId) {
        return res.status(400).json({ error: 'School ID and Reporter ID required' });
      }

      const {
        studentId,
        type,
        points,
        offenceType,
        description,
        severity,
        actionTaken,
        date
      } = req.body;

      const record = await DisciplineService.createRecord({
        schoolId,
        studentId,
        reporterId,
        reporterRole: userRole,
        type,
        points,
        offenceType,
        description,
        severity,
        actionTaken,
        date
      });

      res.status(201).json(record);
    } catch (error: any) {
      console.error('Failed to create discipline record:', error);
      res.status(400).json({ error: error.message || 'Failed to create discipline record' });
    }
  }
);

/**
 * @route   POST /api/discipline/:id/approve
 * @desc    Approve a prefect demerit (HOD or Admin)
 */
router.post(
  '/:id/approve',
  requireRole('SCHOOL_ADMIN', 'ADMIN', 'TEACHER', 'HOD', 'HEADMASTER', 'PRINCIPAL'),
  validate(ApproveDemeritSchema),
  async (req: AuthRequest, res: Response) => {
    try {
      const schoolId = req.user?.schoolId;
      const approverId = req.user?.id;
      const approverRole = req.user?.role || 'TEACHER';

      if (!schoolId || !approverId) {
        return res.status(400).json({ error: 'School ID and User ID required' });
      }

      const updatedRecord = await DisciplineService.approvePrefectDemerit(
        schoolId,
        req.params.id as string,
        approverId,
        approverRole
      );

      res.json({
        message: 'Discipline demerit approved successfully',
        record: updatedRecord
      });
    } catch (error: any) {
      console.error('Failed to approve prefect demerit:', error);
      res.status(400).json({ error: error.message || 'Failed to approve demerit' });
    }
  }
);

/**
 * @route   POST /api/discipline/:id/reject
 * @desc    Reject a prefect demerit with justification
 */
router.post(
  '/:id/reject',
  requireRole('SCHOOL_ADMIN', 'ADMIN', 'TEACHER', 'HOD', 'HEADMASTER', 'PRINCIPAL'),
  validate(RejectDemeritSchema),
  async (req: AuthRequest, res: Response) => {
    try {
      const schoolId = req.user?.schoolId;
      const rejecterId = req.user?.id;
      const { reason } = req.body;

      if (!schoolId || !rejecterId) {
        return res.status(400).json({ error: 'School ID and User ID required' });
      }

      const rejectedRecord = await DisciplineService.rejectPrefectDemerit(
        schoolId,
        req.params.id as string,
        rejecterId,
        reason
      );

      res.json({
        message: 'Discipline demerit rejected',
        record: rejectedRecord
      });
    } catch (error: any) {
      console.error('Failed to reject prefect demerit:', error);
      res.status(400).json({ error: error.message || 'Failed to reject demerit' });
    }
  }
);

/**
 * @route   GET /api/discipline/houses
 * @desc    House points leaderboard
 */
router.get('/houses', async (req: AuthRequest, res: Response) => {
  try {
    const schoolId = req.user?.schoolId;
    if (!schoolId) {
      return res.status(400).json({ error: 'School ID required' });
    }

    const leaderboard = await DisciplineService.getHousePointsLeaderboard(schoolId);
    res.json(leaderboard);
  } catch (error: any) {
    console.error('Failed to fetch house leaderboard:', error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
});

/**
 * @route   GET /api/discipline/student/:studentId
 * @desc    Detailed discipline summary for student (Admin / Teacher / Student)
 */
router.get('/student/:studentId', async (req: AuthRequest, res: Response) => {
  try {
    const schoolId = req.user?.schoolId;
    const studentId = req.params.studentId as string;

    if (!schoolId) {
      return res.status(400).json({ error: 'School ID required' });
    }

    const isStudent = req.user?.role === 'STUDENT';
    const summary = await DisciplineService.getStudentDisciplineSummary(
      schoolId,
      studentId,
      isStudent // hide unapproved records for students
    );

    res.json(summary);
  } catch (error: any) {
    console.error('Failed to fetch student discipline summary:', error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
});

/**
 * @route   GET /api/discipline/parent/:studentId
 * @desc    Parent portal safe view of student discipline summary (approved only)
 */
router.get('/parent/:studentId', async (req: AuthRequest, res: Response) => {
  try {
    const schoolId = req.user?.schoolId;
    const studentId = req.params.studentId as string;

    if (!schoolId) {
      return res.status(400).json({ error: 'School ID required' });
    }

    const summary = await DisciplineService.getStudentDisciplineSummary(
      schoolId,
      studentId,
      true // strictly parent portal approved only
    );

    res.json(summary);
  } catch (error: any) {
    console.error('Failed to fetch parent discipline summary:', error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
});

export default router;
