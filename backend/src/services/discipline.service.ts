import prisma from '../lib/prisma';

export interface CreateDisciplineRecordParams {
  schoolId: string;
  studentId: string;
  reporterId: string;
  reporterRole: string; // 'PREFECT' | 'TEACHER' | 'HOD' | 'SCHOOL_ADMIN' | 'ADMIN'
  type: 'MERIT' | 'DEMERIT';
  points: number; // positive number (e.g. 5)
  date?: string | Date;
  offenceType: string;
  description: string;
  severity?: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  actionTaken?: string;
}

export class DisciplineService {
  /**
   * Create a merit or demerit record.
   * Prefect demerits strictly require HOD/Admin approval before taking effect.
   */
  static async createRecord(params: CreateDisciplineRecordParams) {
    const {
      schoolId,
      studentId,
      reporterId,
      reporterRole,
      type,
      points,
      date = new Date(),
      offenceType,
      description,
      severity = 'MEDIUM',
      actionTaken
    } = params;

    // Fetch student and their house
    const student = await prisma.student.findFirst({
      where: { id: studentId, schoolId },
      include: { house: true }
    });

    if (!student) {
      throw new Error('Student not found in this school');
    }

    const houseId = student.houseId || null;
    const sanitizedPoints = Math.max(0, Math.round(points));

    // Spec Rule: Prefect demerits strictly need HOD/Admin approval
    const isPrefect = reporterRole?.toUpperCase() === 'PREFECT';
    const isDemerit = type === 'DEMERIT';

    let approvalStatus = 'APPROVED';
    if (isPrefect && isDemerit) {
      approvalStatus = 'PENDING_HOD_APPROVAL';
    }

    // Evaluate immediate suspension trigger for approved high/critical demerits
    let suspensionTriggered = false;
    let suspensionDays: number | null = null;
    let suspensionStartDate: Date | null = null;
    let suspensionEndDate: Date | null = null;

    if (approvalStatus === 'APPROVED' && isDemerit) {
      if (severity === 'CRITICAL') {
        suspensionTriggered = true;
        suspensionDays = 7;
        suspensionStartDate = new Date();
        suspensionEndDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
      } else if (severity === 'HIGH') {
        suspensionTriggered = true;
        suspensionDays = 3;
        suspensionStartDate = new Date();
        suspensionEndDate = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000);
      }
    }

    return await prisma.$transaction(async (tx) => {
      // 1. Create DisciplineRecord
      const record = await tx.disciplineRecord.create({
        data: {
          schoolId,
          studentId,
          reporterId,
          reporterRole: isPrefect ? 'PREFECT' : reporterRole.toUpperCase(),
          type,
          points: sanitizedPoints,
          date: new Date(date),
          offenceType,
          description,
          severity,
          status: 'PENDING',
          approvalStatus,
          houseId,
          actionTaken,
          suspensionTriggered,
          suspensionDays,
          suspensionStartDate,
          suspensionEndDate
        }
      });

      // 2. If approved, immediately flow to House points
      if (approvalStatus === 'APPROVED' && houseId && sanitizedPoints > 0) {
        if (type === 'MERIT') {
          await tx.studentHouse.update({
            where: { id: houseId },
            data: { points: { increment: sanitizedPoints } }
          });
        } else if (type === 'DEMERIT') {
          // Decrement house points, clamped at minimum 0
          const currentHouse = await tx.studentHouse.findUnique({ where: { id: houseId } });
          if (currentHouse) {
            const nextPoints = Math.max(0, currentHouse.points - sanitizedPoints);
            await tx.studentHouse.update({
              where: { id: houseId },
              data: { points: nextPoints }
            });
          }
        }
      }

      // 3. If suspension triggered, update student standing
      if (suspensionTriggered) {
        await tx.student.update({
          where: { id: studentId },
          data: { standing: 'Suspended' }
        });
      }

      return record;
    });
  }

  /**
   * HOD or Administrator approves a prefect-reported demerit.
   */
  static async approvePrefectDemerit(
    schoolId: string,
    recordId: string,
    approverUserId: string,
    approverRole: string
  ) {
    const record = await prisma.disciplineRecord.findFirst({
      where: { id: recordId, schoolId }
    });

    if (!record) {
      throw new Error('Discipline record not found');
    }

    if (record.approvalStatus !== 'PENDING_HOD_APPROVAL') {
      throw new Error(`Record is not pending HOD approval (status is ${record.approvalStatus})`);
    }

    // Role check: approver must be HOD, TEACHER, or SCHOOL_ADMIN
    const allowed = ['HOD', 'TEACHER', 'SCHOOL_ADMIN', 'ADMIN', 'HEADMASTER', 'PRINCIPAL'];
    if (!allowed.includes(approverRole.toUpperCase())) {
      throw new Error('Only HODs, Department Heads, or School Administrators can approve prefect demerits');
    }

    return await prisma.$transaction(async (tx) => {
      // 1. Check cumulative demerits for student to test suspension trigger
      const studentApprovedDemerits = await tx.disciplineRecord.findMany({
        where: {
          studentId: record.studentId,
          schoolId,
          type: 'DEMERIT',
          approvalStatus: 'APPROVED'
        }
      });

      const totalDemeritPoints =
        studentApprovedDemerits.reduce((acc, r) => acc + r.points, 0) + record.points;

      let suspensionTriggered = record.severity === 'CRITICAL' || record.severity === 'HIGH' || totalDemeritPoints >= 15;
      let suspensionDays = record.suspensionDays;
      let suspensionStartDate = record.suspensionStartDate;
      let suspensionEndDate = record.suspensionEndDate;

      if (suspensionTriggered && !suspensionDays) {
        suspensionDays = totalDemeritPoints >= 15 ? 5 : 3;
        suspensionStartDate = new Date();
        suspensionEndDate = new Date(Date.now() + suspensionDays * 24 * 60 * 60 * 1000);
      }

      // 2. Update record to APPROVED
      const updatedRecord = await tx.disciplineRecord.update({
        where: { id: recordId },
        data: {
          approvalStatus: 'APPROVED',
          approvedBy: approverUserId,
          approvedAt: new Date(),
          suspensionTriggered,
          suspensionDays,
          suspensionStartDate,
          suspensionEndDate
        }
      });

      // 3. Flow points to House Points
      if (record.houseId && record.points > 0) {
        const currentHouse = await tx.studentHouse.findUnique({ where: { id: record.houseId } });
        if (currentHouse) {
          const nextPoints = Math.max(0, currentHouse.points - record.points);
          await tx.studentHouse.update({
            where: { id: record.houseId },
            data: { points: nextPoints }
          });
        }
      }

      // 4. Update student standing if suspended
      if (suspensionTriggered) {
        await tx.student.update({
          where: { id: record.studentId },
          data: { standing: 'Suspended' }
        });
      }

      return updatedRecord;
    });
  }

  /**
   * HOD or Administrator rejects a prefect-reported demerit.
   */
  static async rejectPrefectDemerit(
    schoolId: string,
    recordId: string,
    rejecterUserId: string,
    reason: string
  ) {
    const record = await prisma.disciplineRecord.findFirst({
      where: { id: recordId, schoolId }
    });

    if (!record) {
      throw new Error('Discipline record not found');
    }

    if (record.approvalStatus !== 'PENDING_HOD_APPROVAL') {
      throw new Error(`Record is not pending HOD approval (status is ${record.approvalStatus})`);
    }

    return await prisma.disciplineRecord.update({
      where: { id: recordId },
      data: {
        approvalStatus: 'REJECTED',
        rejectionReason: reason || 'Rejected by HOD review',
        approvedBy: rejecterUserId,
        approvedAt: new Date(),
        status: 'RESOLVED'
      }
    });
  }

  /**
   * Get student discipline summary (used by Report Cards, Parent Portal, and Admin).
   */
  static async getStudentDisciplineSummary(
    schoolId: string,
    studentId: string,
    isParentPortal: boolean = false
  ) {
    const records = await prisma.disciplineRecord.findMany({
      where: {
        studentId,
        schoolId,
        ...(isParentPortal ? { approvalStatus: 'APPROVED' } : {})
      },
      include: {
        house: { select: { id: true, name: true, color: true } }
      },
      orderBy: { date: 'desc' }
    });

    const approvedRecords = records.filter((r) => r.approvalStatus === 'APPROVED');
    const merits = approvedRecords.filter((r) => r.type === 'MERIT');
    const demerits = approvedRecords.filter((r) => r.type === 'DEMERIT');

    const meritPoints = merits.reduce((acc, r) => acc + r.points, 0);
    const demeritPoints = demerits.reduce((acc, r) => acc + r.points, 0);
    const netPoints = meritPoints - demeritPoints;

    const activeSuspension = approvedRecords.find(
      (r) =>
        r.suspensionTriggered &&
        r.suspensionEndDate &&
        new Date(r.suspensionEndDate) > new Date()
    );

    return {
      totalRecords: records.length,
      meritsCount: merits.length,
      demeritsCount: demerits.length,
      meritPoints,
      demeritPoints,
      netPoints,
      isSuspended: Boolean(activeSuspension),
      suspensionDetails: activeSuspension
        ? {
            days: activeSuspension.suspensionDays,
            startDate: activeSuspension.suspensionStartDate,
            endDate: activeSuspension.suspensionEndDate,
            reason: activeSuspension.description
          }
        : null,
      records
    };
  }

  /**
   * Get House Points Leaderboard based on student merit/demerit contributions.
   */
  static async getHousePointsLeaderboard(schoolId: string) {
    const houses = await prisma.studentHouse.findMany({
      where: { schoolId },
      include: {
        _count: { select: { students: true } }
      },
      orderBy: { points: 'desc' }
    });

    return houses.map((h, idx) => ({
      rank: idx + 1,
      id: h.id,
      name: h.name,
      color: h.color,
      logo: h.logo,
      points: h.points,
      studentCount: h._count.students
    }));
  }
}
