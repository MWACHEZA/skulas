import prisma from '../lib/prisma';

export interface MigrationDecision {
  studentId: string;
  action: 'PROMOTE' | 'REPEAT' | 'GRADUATE';
  targetClassId?: string | null;
  targetPart?: number | string | null;
  note?: string | null;
}

export interface MigrationOptions {
  carryForwardFees?: boolean;
  resetBoardingAllocation?: boolean;
  graduatedRoleAlumni?: boolean;
}

export interface MigrationParams {
  schoolId: string;
  migratedByEmail: string;
  sourceClassId: string;
  targetAcademicYear: number;
  targetTerm?: string | number;
  decisions: MigrationDecision[];
  options?: MigrationOptions;
}

export interface EnrichedRegistryStudent {
  id: string;
  studentId: string;
  name: string;
  part: number;
  status: string;
  standing: string;
  hostelId: string | null;
  roomId: string | null;
  hostelName: string | null;
  roomNumber: string | null;
  isBoarder: boolean;
  outstandingBalance: number;
  suggestedAction: 'PROMOTE' | 'REPEAT' | 'GRADUATE';
  userRole: string;
}

export class MigrationService {
  /**
   * Fetch and enrich the student registry for a given class.
   */
  static async getClassRegistrySummary(
    schoolId: string,
    classId: string
  ): Promise<EnrichedRegistryStudent[]> {
    const [sourceClass, students] = await Promise.all([
      prisma.schoolClass.findFirst({
        where: { id: classId, schoolId }
      }),
      prisma.student.findMany({
        where: { classId, schoolId },
        select: {
          id: true,
          studentId: true,
          name: true,
          part: true,
          status: true,
          standing: true,
          hostelId: true,
          roomId: true,
          hostel: { select: { id: true, name: true } },
          room: { select: { id: true, roomNumber: true, name: true } },
          user: { select: { id: true, email: true, role: true } },
          fees: {
            where: { status: { notIn: ['paid', 'carried_forward'] } },
            select: { amount: true, paid: true, discount: true }
          }
        },
        orderBy: { name: 'asc' }
      })
    ]);

    return students.map((s) => {
      const outstandingBalance = (s.fees || []).reduce(
        (acc: number, f: any) => acc + (f.amount - (f.paid || 0) - (f.discount || 0)),
        0
      );

      let suggestedAction: 'PROMOTE' | 'REPEAT' | 'GRADUATE' = 'PROMOTE';
      if (s.standing === 'Repeat' || s.standing === 'Discontinue' || s.standing === 'Withdraw') {
        suggestedAction = 'REPEAT';
      } else if (
        sourceClass &&
        ((sourceClass.name || '').toLowerCase().includes('form 6') ||
          (sourceClass.name || '').toLowerCase().includes('upper 6') ||
          (sourceClass.name || '').toLowerCase().includes('upper six') ||
          (sourceClass.name || '').toLowerCase().includes('grade 7') ||
          (sourceClass.level || '').toLowerCase().includes('a level') ||
          (sourceClass.level || '').toLowerCase().includes('advanced'))
      ) {
        suggestedAction = 'GRADUATE';
      }

      return {
        id: s.id,
        studentId: s.studentId,
        name: s.name,
        part: s.part || 1,
        status: s.status,
        standing: s.standing || 'Normal',
        hostelId: s.hostelId,
        roomId: s.roomId,
        hostelName: s.hostel?.name || null,
        roomNumber: s.room?.roomNumber || s.room?.name || null,
        isBoarder: Boolean(s.hostelId || s.roomId),
        outstandingBalance: Math.max(0, outstandingBalance),
        suggestedAction,
        userRole: s.user?.role || 'STUDENT'
      };
    });
  }

  /**
   * Execute the Class Migration Wizard in a safe atomic transaction.
   */
  static async executeMigrationWizard(params: MigrationParams) {
    const {
      schoolId,
      migratedByEmail,
      sourceClassId,
      targetAcademicYear,
      targetTerm = 1,
      decisions,
      options
    } = params;

    const carryForwardFees = options?.carryForwardFees !== false;
    const resetBoardingAllocation = options?.resetBoardingAllocation !== false;
    const graduatedRoleAlumni = options?.graduatedRoleAlumni !== false;

    return await prisma.$transaction(async (tx) => {
      // 1. Validate source class
      const sourceClass = await tx.schoolClass.findFirst({
        where: { id: sourceClassId, schoolId }
      });
      if (!sourceClass) {
        throw new Error('Source class not found or belongs to another institution');
      }

      // 2. Fetch target classes
      const targetClassIds = Array.from(
        new Set(decisions.map((d) => d.targetClassId).filter(Boolean))
      ) as string[];

      const targetClasses =
        targetClassIds.length > 0
          ? await tx.schoolClass.findMany({
              where: { id: { in: targetClassIds }, schoolId }
            })
          : [];
      const targetClassMap = new Map(targetClasses.map((c) => [c.id, c]));

      // 3. Fetch students
      const studentIds = decisions.map((d) => d.studentId);
      const students = await tx.student.findMany({
        where: { id: { in: studentIds }, schoolId },
        include: { user: true }
      });
      const studentMap = new Map(students.map((s) => [s.id, s]));

      let promotedCount = 0;
      let repeatedCount = 0;
      let graduatedCount = 0;
      let feesCarriedOverCount = 0;
      let totalAmountCarriedOver = 0;
      let boardingResetCount = 0;
      const details: any[] = [];

      for (const dec of decisions) {
        const student = studentMap.get(dec.studentId);
        if (!student) continue;

        let history: any = student.academicHistory;
        if (!history || typeof history !== 'object') {
          history = { migrations: [] };
        } else if (Array.isArray(history)) {
          history = { previousGrades: history, migrations: [] };
        } else if (!history.migrations) {
          history.migrations = [];
        }

        let toClassId: string | null = null;
        let toClassName = 'Unassigned';
        let toPart: number = student.part || 1;
        let nextStatus = 'Enrolled';
        let nextStanding = student.standing;

        if (dec.action === 'PROMOTE') {
          if (!dec.targetClassId) {
            throw new Error(
              `Target class must be specified for promoted student ${student.name} (${student.studentId})`
            );
          }
          const tgt = targetClassMap.get(dec.targetClassId);
          if (!tgt) {
            throw new Error(`Target class ${dec.targetClassId} not found`);
          }
          toClassId = tgt.id;
          toClassName = tgt.name;
          toPart = dec.targetPart
            ? parseInt(String(dec.targetPart))
            : student.part
            ? student.part + 1
            : 2;
          nextStatus = 'Enrolled';
          promotedCount++;
        } else if (dec.action === 'REPEAT') {
          toClassId = dec.targetClassId || sourceClass.id;
          const tgt = dec.targetClassId ? targetClassMap.get(dec.targetClassId) : sourceClass;
          toClassName = tgt ? tgt.name : sourceClass.name;
          toPart = dec.targetPart ? parseInt(String(dec.targetPart)) : student.part || 1;
          nextStatus = 'Enrolled';
          nextStanding = 'Repeat';
          repeatedCount++;
        } else if (dec.action === 'GRADUATE') {
          toClassId = null;
          toClassName = 'Graduated / Alumni';
          toPart = student.part || 1;
          nextStatus = 'Graduated';
          graduatedCount++;

          // Transition User account to ALUMNI
          if (graduatedRoleAlumni && student.userId) {
            const user = await tx.user.findUnique({ where: { id: student.userId } });
            if (user) {
              const currentRoles = Array.isArray(user.secondaryRoles) ? user.secondaryRoles : [];
              const updatedRoles = Array.from(new Set([...currentRoles, 'STUDENT', 'ALUMNI']));
              await tx.user.update({
                where: { id: student.userId },
                data: {
                  role: 'ALUMNI',
                  secondaryRoles: updatedRoles
                }
              });
            }
          }
        }

        // Record in academic history
        history.migrations.push({
          date: new Date().toISOString(),
          academicYear: Number(targetAcademicYear),
          term: targetTerm,
          fromClassId: sourceClass.id,
          fromClassName: sourceClass.name,
          fromPart: student.part,
          toClassId,
          toClassName,
          toPart,
          action: dec.action,
          note: dec.note || null,
          migratedBy: migratedByEmail || 'Admin'
        });

        // 4. Financial carry-over
        if (carryForwardFees) {
          const oldFees = await tx.fee.findMany({
            where: {
              studentId: student.id,
              status: { notIn: ['paid', 'carried_forward'] }
            }
          });

          let outstanding = 0;
          for (const fee of oldFees) {
            outstanding += fee.amount - fee.paid - fee.discount;
          }

          if (outstanding > 0) {
            await tx.fee.updateMany({
              where: {
                studentId: student.id,
                status: { notIn: ['paid', 'carried_forward'] }
              },
              data: {
                status: 'carried_forward'
              }
            });

            await tx.fee.create({
              data: {
                studentId: student.id,
                schoolId,
                term: String(targetTerm),
                year: Number(targetAcademicYear),
                amount: outstanding,
                paid: 0,
                discount: 0,
                dueDate: new Date(Number(targetAcademicYear), 0, 15),
                status: 'unpaid',
                description: `Previous Academic Year Balance Carried Forward (${Number(targetAcademicYear) - 1})`,
                isLedger: true
              }
            });

            feesCarriedOverCount++;
            totalAmountCarriedOver += outstanding;
          }
        }

        // 5. Boarding allocation reset
        if (resetBoardingAllocation) {
          const hadBoarding = Boolean(student.hostelId || student.roomId);
          if (hadBoarding) {
            boardingResetCount++;
          }

          // Vacate active hostel bed allocations
          await tx.hostelBedAllocation.updateMany({
            where: {
              studentId: student.id,
              schoolId,
              status: 'ACTIVE'
            },
            data: {
              status: 'VACATED',
              vacatedAt: new Date(),
              vacatedReason: `Academic Class Migration / Annual Rollover (${targetAcademicYear})`
            }
          });
        }

        // 6. In-place update of student (NO DUPLICATE RECORDS)
        const updatedStudent = await tx.student.update({
          where: { id: student.id },
          data: {
            classId: toClassId,
            part: toPart,
            status: nextStatus,
            standing: nextStanding,
            academicHistory: history,
            ...(resetBoardingAllocation ? { hostelId: null, roomId: null } : {})
          }
        });

        details.push({
          studentId: updatedStudent.id,
          name: updatedStudent.name,
          action: dec.action,
          newClassId: toClassId,
          newClassName: toClassName,
          newPart: toPart,
          newStatus: nextStatus
        });
      }

      return {
        summary: {
          total: decisions.length,
          promoted: promotedCount,
          repeated: repeatedCount,
          graduated: graduatedCount,
          feesCarriedOver: feesCarriedOverCount,
          totalAmountCarriedOver,
          boardingResetCount
        },
        details
      };
    });
  }
}
