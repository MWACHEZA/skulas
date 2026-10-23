import crypto from 'crypto';
import prisma from '../lib/prisma';
import { BursarService } from './bursar.service';
import { startOfDay, endOfDay, format } from 'date-fns';

const GATE_SECRET = process.env.GATE_SECRET || process.env.JWT_SECRET || 'skulas-gate-secret-key-2026';

export interface FeeComplianceResult {
  allowed: boolean;
  status: 'PAID' | 'ON_PLAN' | 'GRACE_PLAN_BREACHED' | 'PLAN_BREACHED' | 'FEES_OWING' | 'EXEMPT';
  reason: string;
  balance: number;
  totalFees: number;
  totalPaid: number;
  paymentPlanId?: string;
  isBoarder: boolean;
}

export interface GateScanResult {
  success: boolean;
  type: 'STUDENT' | 'STAFF';
  direction: 'IN' | 'OUT';
  allowed: boolean;
  status: string;
  reason: string;
  isBoarder: boolean;
  student?: {
    id: string;
    studentId: string;
    name: string;
    className: string | null;
    avatar: string | null;
    boardingStatus: string;
    balance: number;
    parentPhone?: string | null;
  };
  staff?: {
    id: string;
    staffId: string | null;
    name: string;
    role: string;
  };
  gateLogId?: string;
  autoConfirmed?: boolean;
}

export class GateService {
  /**
   * Generates an HMAC-signed opaque token for a student ID card QR.
   * Format: v1.<schoolId>.<studentRegNo>.<randomHex>.<hmacSignature>
   */
  static signToken(schoolId: string, identifier: string): string {
    const nonce = crypto.randomBytes(8).toString('hex');
    const rawPayload = `v1:${schoolId}:${identifier}:${nonce}`;
    const hmac = crypto.createHmac('sha256', GATE_SECRET).update(rawPayload).digest('hex').substring(0, 16);
    return `${rawPayload}:${hmac}`;
  }

  /**
   * Verifies the cryptographic HMAC signature of a scanned QR token.
   */
  static verifySignature(qrToken: string): { isValid: boolean; schoolId?: string; identifier?: string } {
    try {
      const parts = qrToken.split(':');
      if (parts.length !== 5 || parts[0] !== 'v1') {
        return { isValid: false };
      }
      const [v, schoolId, identifier, nonce, signature] = parts;
      const rawPayload = `${v}:${schoolId}:${identifier}:${nonce}`;
      const expectedHmac = crypto.createHmac('sha256', GATE_SECRET).update(rawPayload).digest('hex').substring(0, 16);
      if (expectedHmac !== signature) {
        return { isValid: false };
      }
      return { isValid: true, schoolId, identifier };
    } catch {
      return { isValid: false };
    }
  }

  /**
   * Issues or reissues an HMAC-signed QR token for a student.
   * Deactivates previous tokens so lost/stolen physical cards cannot be reused.
   */
  static async issueStudentQrToken(schoolId: string, studentId: string): Promise<string> {
    const student = await prisma.student.findFirst({
      where: { id: studentId, schoolId }
    });
    if (!student) {
      throw new Error(`Student ${studentId} not found in this school`);
    }

    // Deactivate existing active tokens
    await prisma.studentQrCode.updateMany({
      where: { schoolId, studentId, isActive: true },
      data: { isActive: false, deactivatedAt: new Date() }
    });

    const school = await prisma.school.findUnique({ where: { id: schoolId } });
    const { QrCryptoService } = await import('../lib/qr-crypto');
    const activeKey = await QrCryptoService.getOrCreateActiveKey(schoolId, school?.code || 'global');

    const qrToken = QrCryptoService.sign(
      {
        type: 'GATE',
        schoolCode: school?.code || 'global',
        entityId: student.studentId || student.id,
        keyId: activeKey.keyId
      },
      activeKey.privateKey,
      activeKey.algorithm
    );

    await prisma.studentQrCode.create({
      data: {
        schoolId,
        studentId,
        qrToken,
        isActive: true,
        printedAt: new Date()
      }
    });

    return qrToken;
  }

  /**
   * Issues or reissues an HMAC-signed QR token for staff attendance clock-in.
   */
  static async issueStaffQrToken(schoolId: string, staffId: string): Promise<string> {
    const staff = await prisma.user.findFirst({
      where: { id: staffId, schoolId }
    });
    if (!staff) {
      throw new Error(`Staff user ${staffId} not found in this school`);
    }

    await prisma.staffQrCode.updateMany({
      where: { schoolId, staffId, isActive: true },
      data: { isActive: false, deactivatedAt: new Date() }
    });

    const qrToken = this.signToken(schoolId, staff.staffId || staff.id);

    await prisma.staffQrCode.create({
      data: {
        schoolId,
        staffId,
        qrToken,
        isActive: true,
        printedAt: new Date()
      }
    });

    return qrToken;
  }

  /**
   * PART 2: Single server-side fee-compliance check function.
   * Reuses existing Debtors Aging / Payment Plan data.
   * Checks in strict order:
   * 1. Exempt (100% scholarship / staff-child / bursary) -> Allow ("EXEMPT")
   * 2. Term fully paid (balance <= 0) -> Allow ("PAID")
   * 3. Compliant payment plan -> Allow ("ON_PLAN")
   * 4. Breached payment plan with allowGateEntry flag & within grace window -> Allow ("GRACE_PLAN_BREACHED")
   * 5. Breached payment plan without override -> Deny ("PLAN_BREACHED")
   * 6. No payment plan and fees owing -> Deny ("FEES_OWING")
   */
  static async checkFeeCompliance(schoolId: string, studentId: string): Promise<FeeComplianceResult> {
    const student = await prisma.student.findFirst({
      where: { id: studentId, schoolId },
      include: {
        class: true,
        bursaries: {
          where: { status: 'approved' }
        }
      }
    });

    if (!student) {
      throw new Error(`Student ${studentId} not found`);
    }

    const isBoarder = (student.boardingStatus || '').toLowerCase() === 'boarder';

    // 1. Check for Active Approved Exemptions / 100% Bursaries
    const fullBursary = student.bursaries.find(b => b.percentage >= 100);
    if (fullBursary) {
      return {
        allowed: true,
        status: 'EXEMPT',
        reason: `Exempt: Approved 100% institutional bursary/scholarship (${fullBursary.type}).`,
        balance: 0,
        totalFees: 0,
        totalPaid: 0,
        isBoarder
      };
    }

    // 2. Compute live balance using BursarService
    const balanceInfo = await BursarService.getStudentBalance(schoolId, studentId);
    const { balance, totalBilled, totalPaid } = balanceInfo;

    // Load tenant gate settings
    let settings = await prisma.schoolSetting.findFirst({
      where: { schoolId }
    });
    if (!settings) {
      settings = await prisma.schoolSetting.create({
        data: { schoolId }
      });
    }

    const graceDays = settings.gateGraceDays ?? 3;
    const gateMinPaid = settings.gateMinPaidAmount || 0;
    const gateMinPercent = settings.gateMinPaidPercent || 0;
    const gateType = settings.gateRequiredType || 'none';

    // Threshold check if configured
    let meetsThreshold = true;
    if (gateType === 'amount' && totalPaid < gateMinPaid) {
      meetsThreshold = false;
    } else if (gateType === 'percent' && totalBilled > 0 && ((totalPaid / totalBilled) * 100) < gateMinPercent) {
      meetsThreshold = false;
    }

    // Fully paid or settled
    if (balance <= 0 && meetsThreshold) {
      return {
        allowed: true,
        status: 'PAID',
        reason: 'Term fees fully settled. Gate entry permitted.',
        balance: 0,
        totalFees: totalBilled,
        totalPaid,
        isBoarder
      };
    }

    // 3. Check Payment Plans
    const plans = await prisma.paymentPlan.findMany({
      where: {
        studentId,
        schoolId,
        status: { in: ['ACTIVE', 'DEFAULTED'] }
      },
      orderBy: { createdAt: 'desc' },
      include: {
        installments: {
          orderBy: { dueDate: 'asc' }
        }
      }
    });

    if (plans.length > 0) {
      const plan = plans[0];
      const now = new Date();
      const gracePeriodMs = graceDays * 24 * 60 * 60 * 1000;

      // Check installments overdue beyond grace period
      const overdueInstallments = plan.installments.filter(inst => {
        if (inst.status === 'PAID') return false;
        const cutoff = new Date(inst.dueDate.getTime() + gracePeriodMs);
        return cutoff < now;
      });

      const isBreached = plan.status === 'DEFAULTED' || overdueInstallments.length > 0;

      if (!isBreached) {
        return {
          allowed: true,
          status: 'ON_PLAN',
          reason: 'Active compliant payment plan. Next installment is current.',
          balance,
          totalFees: totalBilled,
          totalPaid,
          paymentPlanId: plan.id,
          isBoarder
        };
      } else {
        // Breached: Check humanitarian override allowGateEntry
        if (plan.allowGateEntry) {
          return {
            allowed: true,
            status: 'GRACE_PLAN_BREACHED',
            reason: `Grace permitted: Humanitarian gate override active on breached payment plan (${overdueInstallments.length} missed installment(s)). Please follow up with Bursar.`,
            balance,
            totalFees: totalBilled,
            totalPaid,
            paymentPlanId: plan.id,
            isBoarder
          };
        } else {
          return {
            allowed: false,
            status: 'PLAN_BREACHED',
            reason: `Entry Denied: Payment plan defaulted with ${overdueInstallments.length} overdue installment(s). Outstanding balance: $${balance.toFixed(2)}.`,
            balance,
            totalFees: totalBilled,
            totalPaid,
            paymentPlanId: plan.id,
            isBoarder
          };
        }
      }
    }

    // 4. No payment plan and fees owing
    return {
      allowed: false,
      status: 'FEES_OWING',
      reason: `Entry Denied: Outstanding school fees balance of $${balance.toFixed(2)} with no active payment plan.`,
      balance,
      totalFees: totalBilled,
      totalPaid,
      isBoarder
    };
  }

  /**
   * Helper to resolve a valid Teacher ID for Attendance foreign key constraint.
   */
  private static async getEffectiveTeacherId(schoolId: string, preferredUserId?: string): Promise<string> {
    if (preferredUserId) {
      const existingTeacher = await prisma.teacher.findFirst({
        where: { OR: [{ id: preferredUserId }, { userId: preferredUserId }] }
      });
      if (existingTeacher) return existingTeacher.id;

      const user = await prisma.user.findUnique({ where: { id: preferredUserId } });
      if (user) {
        const newTeacher = await prisma.teacher.create({
          data: {
            userId: user.id,
            staffId: user.staffId || `STAFF-${user.id.substring(0, 8)}`,
            schoolId,
            title: 'Staff'
          }
        });
        return newTeacher.id;
      }
    }

    const anyTeacher = await prisma.teacher.findFirst({ where: { schoolId } });
    if (anyTeacher) return anyTeacher.id;

    // Fallback: Find any user in this school and create Teacher
    const anyUser = await prisma.user.findFirst({ where: { schoolId } });
    if (anyUser) {
      const teacher = await prisma.teacher.create({
        data: {
          userId: anyUser.id,
          staffId: anyUser.staffId || `DUTY-${anyUser.id.substring(0, 8)}`,
          schoolId,
          title: 'Staff'
        }
      });
      return teacher.id;
    }

    throw new Error('No valid staff or teacher profile found to record attendance');
  }

  /**
   * Resolves a raw scanned QR string or typed reg number to a student or staff record.
   */
  static async resolveScanTarget(schoolId: string, rawInput: string) {
    const cleaned = String(rawInput || '').trim();

    // 1. Check if token was explicitly deactivated
    const deactivatedStudentQr = await prisma.studentQrCode.findFirst({
      where: { schoolId, qrToken: cleaned, isActive: false }
    });
    if (deactivatedStudentQr) {
      return { type: 'DEACTIVATED' as const };
    }

    const deactivatedStaffQr = await prisma.staffQrCode.findFirst({
      where: { schoolId, qrToken: cleaned, isActive: false }
    });
    if (deactivatedStaffQr) {
      return { type: 'DEACTIVATED' as const };
    }

    // 2. Check signed student QR token
    const studentQr = await prisma.studentQrCode.findFirst({
      where: { schoolId, qrToken: cleaned, isActive: true },
      include: {
        student: {
          include: { user: true, class: true, parents: { include: { parent: { include: { user: true } } } } }
        }
      }
    });

    if (studentQr && studentQr.student) {
      return { type: 'STUDENT' as const, student: studentQr.student, qrCodeId: studentQr.id };
    }

    // 3. Check signed staff QR token
    const staffQr = await prisma.staffQrCode.findFirst({
      where: { schoolId, qrToken: cleaned, isActive: true },
      include: { staff: true }
    });

    if (staffQr && staffQr.staff) {
      return { type: 'STAFF' as const, staff: staffQr.staff, qrCodeId: staffQr.id };
    }

    // 4. Try standard v1 signed QR code payload
    if (cleaned.startsWith('v1:')) {
      try {
        const { QrCryptoService } = await import('../lib/qr-crypto');
        const parsed = QrCryptoService.parsePayload(cleaned);
        const school = await prisma.school.findUnique({ where: { id: schoolId } });
        if (school && parsed.schoolCode.toUpperCase() === school.code.toUpperCase()) {
          const keys = await QrCryptoService.findTenantKeys(schoolId, parsed.keyId);
          let sigOk = false;
          for (const k of keys) {
            const kData = k.algorithm === 'ED25519' ? k.publicKey : k.encryptedPrivateKey;
            if (QrCryptoService.verifySignatureWithKey(parsed, kData, k.algorithm as any)) {
              sigOk = true;
              break;
            }
          }
          if (sigOk && !parsed.isExpired) {
            const student = await prisma.student.findFirst({
              where: {
                schoolId,
                OR: [{ studentId: parsed.entityId }, { id: parsed.entityId }]
              },
              include: { user: true, class: true, parents: { include: { parent: { include: { user: true } } } } }
            });
            if (student) {
              return { type: 'STUDENT' as const, student, qrCodeId: null };
            }
          }
        }
      } catch {
        // Fallback to legacy check
      }
    }

    // 4b. Legacy HMAC signature validation fallback
    const sigCheck = this.verifySignature(cleaned);
    if (sigCheck.isValid && sigCheck.schoolId === schoolId && sigCheck.identifier) {
      const student = await prisma.student.findFirst({
        where: {
          schoolId,
          OR: [{ studentId: sigCheck.identifier }, { id: sigCheck.identifier }]
        },
        include: { user: true, class: true, parents: { include: { parent: { include: { user: true } } } } }
      });
      if (student) {
        return { type: 'STUDENT' as const, student, qrCodeId: null };
      }
    }

    // 5. Fallback: Direct ID, Student Registration Number, or Name lookup
    const studentDirect = await prisma.student.findFirst({
      where: {
        schoolId,
        OR: [
          { studentId: { equals: cleaned, mode: 'insensitive' } },
          { id: cleaned },
          { name: { contains: cleaned, mode: 'insensitive' } }
        ]
      },
      include: { user: true, class: true, parents: { include: { parent: { include: { user: true } } } } }
    });

    if (studentDirect) {
      return { type: 'STUDENT' as const, student: studentDirect, qrCodeId: null };
    }

    const staffDirect = await prisma.user.findFirst({
      where: {
        schoolId,
        OR: [
          { staffId: { equals: cleaned, mode: 'insensitive' } },
          { id: cleaned },
          { name: { contains: cleaned, mode: 'insensitive' } }
        ]
      }
    });

    if (staffDirect) {
      return { type: 'STAFF' as const, staff: staffDirect, qrCodeId: null };
    }

    return null;
  }

  /**
   * Processes an incoming Gate scan event (Morning In / Afternoon Out).
   */
  static async processScan(params: {
    schoolId: string;
    guardUserId?: string;
    tokenOrId: string;
    deviceId?: string;
    forceDirection?: 'IN' | 'OUT';
  }): Promise<GateScanResult> {
    const { schoolId, guardUserId, tokenOrId, deviceId, forceDirection } = params;

    const resolved = await this.resolveScanTarget(schoolId, tokenOrId);
    if (!resolved) {
      return {
        success: false,
        type: 'STUDENT',
        direction: 'IN',
        allowed: false,
        status: 'NOT_FOUND',
        reason: 'Unrecognized QR code or student/staff record not found.',
        isBoarder: false
      };
    }

    if (resolved.type === 'DEACTIVATED') {
      return {
        success: false,
        type: 'STUDENT',
        direction: 'IN',
        allowed: false,
        status: 'DEACTIVATED',
        reason: 'Deactivated QR code. This card has been revoked or reissued.',
        isBoarder: false
      };
    }

    const todayStart = startOfDay(new Date());
    const todayEnd = endOfDay(new Date());

    // STAFF FLOW: Feed existing staff attendance mechanism
    if (resolved.type === 'STAFF') {
      const staff = resolved.staff;
      const existingToday = await prisma.gateLog.findFirst({
        where: {
          schoolId,
          staffId: staff.id,
          scannedAt: { gte: todayStart, lte: todayEnd }
        },
        orderBy: { scannedAt: 'desc' }
      });

      const direction: 'IN' | 'OUT' = forceDirection || (existingToday && existingToday.direction === 'IN' ? 'OUT' : 'IN');

      const gateLog = await prisma.gateLog.create({
        data: {
          schoolId,
          staffId: staff.id,
          scannedByGuardId: guardUserId || null,
          deviceId: deviceId || 'GATE-STATION-01',
          direction,
          entryStatus: 'allowed',
          feeStatusSnapshot: 'STAFF'
        }
      });

      // Update StaffAttendance table
      const staffAtt = await prisma.staffAttendance.findFirst({
        where: {
          schoolId,
          staffId: staff.id,
          date: todayStart
        }
      });

      if (!staffAtt) {
        await prisma.staffAttendance.create({
          data: {
            schoolId,
            staffId: staff.id,
            date: todayStart,
            timeIn: new Date(),
            status: 'PRESENT'
          }
        });
      } else if (direction === 'OUT') {
        await prisma.staffAttendance.update({
          where: { id: staffAtt.id },
          data: { timeOut: new Date() }
        });
      }

      return {
        success: true,
        type: 'STAFF',
        direction,
        allowed: true,
        status: 'STAFF_OK',
        reason: `Staff clock-${direction.toLowerCase()} recorded for ${staff.name}.`,
        isBoarder: false,
        staff: {
          id: staff.id,
          staffId: staff.staffId,
          name: staff.name,
          role: staff.role
        },
        gateLogId: gateLog.id,
        autoConfirmed: true
      };
    }

    // STUDENT FLOW
    const student = resolved.student;
    const isBoarder = (student.boardingStatus || '').toLowerCase() === 'boarder';

    // Check prior scans today to detect exit scanning
    const todayLogs = await prisma.gateLog.findMany({
      where: {
        schoolId,
        studentId: student.id,
        scannedAt: { gte: todayStart, lte: todayEnd }
      },
      orderBy: { scannedAt: 'asc' }
    });

    const hasEntryToday = todayLogs.some(l => l.direction === 'IN' && l.entryStatus === 'allowed');
    const hasExitToday = todayLogs.some(l => l.direction === 'OUT' && l.entryStatus === 'allowed');

    const direction: 'IN' | 'OUT' = forceDirection || (hasEntryToday && !hasExitToday ? 'OUT' : 'IN');

    // Fee compliance check
    const compliance = await this.checkFeeCompliance(schoolId, student.id);

    // Resolve primary parent phone
    const primaryParent = student.parents?.[0]?.parent?.user;
    const parentPhone = primaryParent?.phone || student.phone || null;

    if (!compliance.allowed) {
      // Record denied gate scan log
      const gateLog = await prisma.gateLog.create({
        data: {
          schoolId,
          studentId: student.id,
          scannedByGuardId: guardUserId || null,
          deviceId: deviceId || 'GATE-STATION-01',
          direction,
          entryStatus: 'denied',
          feeStatusSnapshot: compliance.status,
          balanceAtScan: compliance.balance,
          paymentPlanId: compliance.paymentPlanId || null,
          denialReason: compliance.reason
        }
      });

      return {
        success: true,
        type: 'STUDENT',
        direction,
        allowed: false,
        status: compliance.status,
        reason: compliance.reason,
        isBoarder,
        student: {
          id: student.id,
          studentId: student.studentId,
          name: student.name,
          className: student.class?.name || null,
          avatar: (student as any).user?.avatar || (student as any).avatar || null,
          boardingStatus: student.boardingStatus,
          balance: compliance.balance,
          parentPhone
        },
        gateLogId: gateLog.id,
        autoConfirmed: false
      };
    }

    // ALLOWED ENTRY OR EXIT
    let attendanceRecordId: string | null = null;

    // Single source of truth for attendance: Gate marks day scholars as present
    if (direction === 'IN' && !isBoarder) {
      const existingAtt = await prisma.attendance.findFirst({
        where: {
          schoolId,
          studentId: student.id,
          date: todayStart,
          classId: null
        }
      });

      if (existingAtt) {
        attendanceRecordId = existingAtt.id;
      } else {
        const effectiveTeacherId = await this.getEffectiveTeacherId(schoolId, guardUserId);
        const newAtt = await prisma.attendance.create({
          data: {
            schoolId,
            studentId: student.id,
            date: todayStart,
            status: 'present',
            teacherId: effectiveTeacherId,
            classId: null,
            scanMethod: 'Gate QR',
            note: `Arrived at Gate ${format(new Date(), 'HH:mm')}`
          }
        });
        attendanceRecordId = newAtt.id;
      }
    }

    const gateLog = await prisma.gateLog.create({
      data: {
        schoolId,
        studentId: student.id,
        scannedByGuardId: guardUserId || null,
        deviceId: deviceId || 'GATE-STATION-01',
        direction,
        entryStatus: 'allowed',
        feeStatusSnapshot: compliance.status,
        balanceAtScan: compliance.balance,
        paymentPlanId: compliance.paymentPlanId || null,
        attendanceRecordId
      }
    });

    return {
      success: true,
      type: 'STUDENT',
      direction,
      allowed: true,
      status: compliance.status,
      reason: isBoarder
        ? `${compliance.reason} (Boarder: excluded from daily gate roll call).`
        : compliance.reason,
      isBoarder,
      student: {
        id: student.id,
        studentId: student.studentId,
        name: student.name,
        className: student.class?.name || null,
        avatar: (student as any).user?.avatar || (student as any).avatar || null,
        boardingStatus: student.boardingStatus,
        balance: compliance.balance,
        parentPhone
      },
      gateLogId: gateLog.id,
      autoConfirmed: true
    };
  }

  /**
   * Headmaster / Principal PIN Override for denied entry.
   * Privileged action logged to gate_logs and audit_logs.
   */
  static async processHmOverride(params: {
    schoolId: string;
    guardUserId?: string;
    studentId: string;
    hmPin: string;
    reason: string;
    deviceId?: string;
  }) {
    const { schoolId, guardUserId, studentId, hmPin, reason, deviceId } = params;

    if (!hmPin || !reason || reason.trim().length < 5) {
      throw new Error('Valid Headmaster PIN and a mandatory audit reason (minimum 5 characters) are required.');
    }

    // Verify HM PIN against school admins or headmaster
    const hmUser = await prisma.user.findFirst({
      where: {
        schoolId,
        role: { in: ['SCHOOL_ADMIN', 'SUPER_ADMIN'] },
        OR: [
          { gatePin: hmPin },
          { password: hmPin } // Fallback for testing environments
        ]
      }
    });

    if (!hmUser) {
      throw new Error('Invalid Headmaster PIN. Authorization rejected.');
    }

    const student = await prisma.student.findFirst({
      where: { id: studentId, schoolId },
      include: { class: true }
    });
    if (!student) {
      throw new Error(`Student ${studentId} not found`);
    }

    const todayStart = startOfDay(new Date());

    // Auto-mark attendance
    let attendanceRecordId: string | null = null;
    const existingAtt = await prisma.attendance.findFirst({
      where: {
        schoolId,
        studentId,
        date: todayStart,
        classId: null
      }
    });

    if (existingAtt) {
      attendanceRecordId = existingAtt.id;
    } else {
      const effectiveTeacherId = await this.getEffectiveTeacherId(schoolId, hmUser.id);
      const newAtt = await prisma.attendance.create({
        data: {
          schoolId,
          studentId,
          date: todayStart,
          status: 'present',
          teacherId: effectiveTeacherId,
          classId: null,
          scanMethod: 'Gate Override',
          note: `HM Override by ${hmUser.name}: ${reason}`
        }
      });
      attendanceRecordId = newAtt.id;
    }

    // Log to gate_logs with override status
    const gateLog = await prisma.gateLog.create({
      data: {
        schoolId,
        studentId,
        scannedByGuardId: guardUserId || null,
        deviceId: deviceId || 'GATE-STATION-01',
        direction: 'IN',
        entryStatus: 'override',
        feeStatusSnapshot: 'HM_OVERRIDE',
        denialReason: reason,
        overrideByStaffId: hmUser.id,
        overrideReason: reason,
        attendanceRecordId
      }
    });

    // Record in central AuditLog
    await prisma.auditLog.create({
      data: {
        schoolId,
        actorId: hmUser.id,
        action: 'GATE_ENTRY_OVERRIDE',
        entityType: 'GateEntry',
        entityId: student.id,
        status: 'SUCCESS',
        details: {
          studentId: student.id,
          studentRegNo: student.studentId,
          studentName: student.name,
          className: student.class?.name || null,
          authorizedBy: hmUser.name,
          reason,
          timestamp: new Date().toISOString()
        }
      }
    });

    return {
      success: true,
      gateLog,
      authorizedBy: hmUser.name,
      studentName: student.name
    };
  }

  /**
   * Fast autocomplete search for students (by name, studentId/regNo, or class name).
   */
  static async searchStudents(schoolId: string, query: string) {
    const cleaned = query.trim();
    if (!cleaned) return [];

    const students = await prisma.student.findMany({
      where: {
        schoolId,
        status: { not: 'Inactive' },
        OR: [
          { name: { contains: cleaned, mode: 'insensitive' } },
          { studentId: { contains: cleaned, mode: 'insensitive' } },
          { class: { name: { contains: cleaned, mode: 'insensitive' } } }
        ]
      },
      include: {
        user: true,
        class: true,
        fees: {
          select: { amount: true, paid: true, status: true }
        },
        bursaries: {
          where: { status: 'approved' },
          select: { percentage: true }
        },
        paymentPlans: {
          where: { status: 'ACTIVE' },
          select: { id: true }
        }
      },
      take: 8,
      orderBy: { name: 'asc' }
    });

    return students.map(s => {
      const isExempt = s.bursaries?.some(b => b.percentage >= 100);
      const totalAmount = s.fees?.reduce((sum, f) => sum + (f.amount || 0), 0) || 0;
      const totalPaid = s.fees?.reduce((sum, f) => sum + (f.paid || 0), 0) || 0;
      const balance = Math.max(0, totalAmount - totalPaid);
      const hasPlan = (s.paymentPlans?.length || 0) > 0;

      let feeStatus = 'FEES_OWING';
      let allowed = false;
      if (isExempt) {
        feeStatus = 'EXEMPT';
        allowed = true;
      } else if (balance <= 0) {
        feeStatus = 'PAID';
        allowed = true;
      } else if (hasPlan) {
        feeStatus = 'ON_PLAN';
        allowed = true;
      }

      return {
        id: s.id,
        studentId: s.studentId,
        name: s.name,
        className: s.class?.name || 'General',
        avatar: (s as any).user?.avatar || (s as any).avatar || null,
        boardingStatus: s.boardingStatus || 'Day',
        balance,
        feeStatus,
        allowed
      };
    });
  }

  /**
   * PART 4: Compact Daily Allow List for Offline PWA Caching.
   * Generates a tenant-scoped snapshot for today.
   */
  static async getDailyAllowList(schoolId: string) {
    const students = await prisma.student.findMany({
      where: { schoolId, status: 'Enrolled' },
      include: {
        user: true,
        class: true,
        qrCodes: {
          where: { isActive: true },
          take: 1
        },
        bursaries: {
          where: { status: 'approved' }
        },
        paymentPlans: {
          where: { status: { in: ['ACTIVE', 'DEFAULTED'] } },
          include: { installments: true },
          take: 1,
          orderBy: { createdAt: 'desc' }
        }
      }
    });

    const settings = await prisma.schoolSetting.findFirst({
      where: { schoolId }
    });
    const graceDays = settings?.gateGraceDays ?? 3;

    return students.map(s => {
      const isBoarder = (s.boardingStatus || '').toLowerCase() === 'boarder';
      const activeQr = s.qrCodes[0]?.qrToken || null;

      // Calculate fee compliance for allow-list cache
      const isExempt = s.bursaries.some(b => b.percentage >= 100);
      const plan = s.paymentPlans[0] || null;

      let feeStatus: 'PAID' | 'ON_PLAN' | 'GRACE_PLAN_BREACHED' | 'PLAN_BREACHED' | 'FEES_OWING' | 'EXEMPT' = 'FEES_OWING';
      let allowed = false;

      if (isExempt) {
        feeStatus = 'EXEMPT';
        allowed = true;
      } else if (plan) {
        const gracePeriodMs = graceDays * 24 * 60 * 60 * 1000;
        const now = new Date();
        const overdue = plan.installments.filter(inst => {
          if (inst.status === 'PAID') return false;
          return new Date(inst.dueDate.getTime() + gracePeriodMs) < now;
        });

        if (plan.status !== 'DEFAULTED' && overdue.length === 0) {
          feeStatus = 'ON_PLAN';
          allowed = true;
        } else if (plan.allowGateEntry) {
          feeStatus = 'GRACE_PLAN_BREACHED';
          allowed = true;
        } else {
          feeStatus = 'PLAN_BREACHED';
          allowed = false;
        }
      }

      return {
        studentId: s.id,
        regNo: s.studentId,
        name: s.name,
        className: s.class?.name || null,
        photoUrl: (s as any).user?.avatar || (s as any).avatar || null,
        qrToken: activeQr,
        isBoarder,
        feeStatus,
        allowed
      };
    });
  }

  /**
   * Syncs offline-queued scans back to the database.
   * Handles conflict resolution: Offline denials STAND and are not silently overwritten.
   */
  static async syncOfflineLogs(params: {
    schoolId: string;
    guardUserId?: string;
    logs: Array<{
      studentId: string;
      qrToken?: string;
      scannedAt: string | Date;
      direction?: string;
      entryStatus: 'allowed' | 'denied' | 'override';
      feeStatusSnapshot?: string;
      denialReason?: string;
      deviceId?: string;
    }>;
  }) {
    const { schoolId, guardUserId, logs } = params;
    const syncedRecords = [];

    for (const log of logs) {
      const scanDate = new Date(log.scannedAt);
      const todayStart = startOfDay(scanDate);

      let attendanceRecordId: string | null = null;

      // If offline scan was allowed, ensure attendance record exists
      if (log.entryStatus === 'allowed') {
        const student = await prisma.student.findFirst({
          where: { id: log.studentId, schoolId },
          select: { boardingStatus: true }
        });

        const isBoarder = (student?.boardingStatus || '').toLowerCase() === 'boarder';
        if (!isBoarder) {
          const existingAtt = await prisma.attendance.findFirst({
            where: {
              schoolId,
              studentId: log.studentId,
              date: todayStart,
              classId: null
            }
          });

          if (existingAtt) {
            attendanceRecordId = existingAtt.id;
          } else {
            const effectiveTeacherId = await this.getEffectiveTeacherId(schoolId, guardUserId);
            const createdAtt = await prisma.attendance.create({
              data: {
                schoolId,
                studentId: log.studentId,
                date: todayStart,
                status: 'present',
                teacherId: effectiveTeacherId,
                classId: null,
                scanMethod: 'Gate Offline QR',
                note: `Offline Gate scan synced`
              }
            });
            attendanceRecordId = createdAtt.id;
          }
        }
      }

      // Offline denial stands as logged on device
      const created = await prisma.gateLog.create({
        data: {
          schoolId,
          studentId: log.studentId,
          scannedByGuardId: guardUserId || null,
          deviceId: log.deviceId || 'OFFLINE-PWA',
          scannedAt: scanDate,
          direction: log.direction || 'IN',
          entryStatus: log.entryStatus,
          feeStatusSnapshot: log.feeStatusSnapshot || (log.entryStatus === 'denied' ? 'OFFLINE_DENIAL' : 'OFFLINE_ALLOW'),
          denialReason: log.denialReason || null,
          attendanceRecordId
        }
      });
      syncedRecords.push(created);
    }

    return { success: true, count: syncedRecords.length };
  }

  /**
   * PART 5: Admin Gate Dashboard Live Metrics & Lists.
   */
  static async getGateDashboardData(schoolId: string, dateInput?: string | Date) {
    const targetDate = dateInput ? new Date(dateInput) : new Date();
    const dayStart = startOfDay(targetDate);
    const dayEnd = endOfDay(targetDate);

    // Fetch school settings for cutoff time
    const settings = await prisma.schoolSetting.findFirst({
      where: { schoolId }
    });
    const cutoffTime = settings?.gateCutoffTime || '08:00';

    // All scans today
    const logsToday = await prisma.gateLog.findMany({
      where: {
        schoolId,
        scannedAt: { gte: dayStart, lte: dayEnd }
      },
      include: {
        student: {
          include: {
            class: true,
            parents: { include: { parent: { include: { user: true } } } }
          }
        },
        staff: true,
        scannedByGuard: true
      },
      orderBy: { scannedAt: 'desc' }
    });

    // Pair IN / OUT scans per student
    const studentStatusMap = new Map<string, { inLog?: any; outLog?: any; isDenied?: boolean }>();

    for (const log of logsToday) {
      if (!log.studentId) continue;
      const current = studentStatusMap.get(log.studentId) || {};
      if (log.entryStatus === 'denied') {
        current.isDenied = true;
      } else if (log.direction === 'IN' && !current.inLog) {
        current.inLog = log;
      } else if (log.direction === 'OUT' && !current.outLog) {
        current.outLog = log;
      }
      studentStatusMap.set(log.studentId, current);
    }

    const currentlyOnCampusStudents: any[] = [];
    const checkedOutStudents: any[] = [];
    const deniedStudents: any[] = [];
    const scannedStudentIds = new Set<string>();

    for (const [studentId, info] of studentStatusMap.entries()) {
      scannedStudentIds.add(studentId);
      if (info.inLog && !info.outLog) {
        currentlyOnCampusStudents.push(info.inLog);
      } else if (info.outLog) {
        checkedOutStudents.push(info.outLog);
      }
    }

    // Denied scans
    const deniedLogs = logsToday.filter(l => l.entryStatus === 'denied' && l.student);
    for (const d of deniedLogs) {
      const parentUser = d.student?.parents?.[0]?.parent?.user;
      deniedStudents.push({
        id: d.id,
        studentId: d.student?.id,
        regNo: d.student?.studentId,
        name: d.student?.name,
        className: d.student?.class?.name || null,
        denialReason: d.denialReason,
        balance: d.balanceAtScan ?? 0,
        scannedAt: d.scannedAt,
        parentName: parentUser?.name || null,
        parentPhone: parentUser?.phone || null
      });
    }

    // Not Yet Arrived (Enrolled Day scholars who have not scanned in today)
    const dayScholarsNotArrived = await prisma.student.findMany({
      where: {
        schoolId,
        status: 'Enrolled',
        boardingStatus: 'Day',
        id: { notIn: Array.from(scannedStudentIds) }
      },
      include: {
        class: true,
        parents: { include: { parent: { include: { user: true } } } }
      },
      orderBy: { name: 'asc' }
    });

    const notYetArrived = dayScholarsNotArrived.map(s => {
      const parentUser = s.parents?.[0]?.parent?.user;
      return {
        id: s.id,
        regNo: s.studentId,
        name: s.name,
        className: s.class?.name || null,
        parentName: parentUser?.name || null,
        parentPhone: parentUser?.phone || null
      };
    });

    // Compute late arrivals based on cutoffTime (HH:mm)
    const [cutoffHours, cutoffMinutes] = cutoffTime.split(':').map(Number);
    const cutoffDate = new Date(targetDate);
    cutoffDate.setHours(cutoffHours || 8, cutoffMinutes || 0, 0, 0);

    const lateArrivals = logsToday.filter(
      l => l.direction === 'IN' && l.entryStatus === 'allowed' && new Date(l.scannedAt) > cutoffDate
    );

    return {
      kpis: {
        currentlyOnCampus: currentlyOnCampusStudents.length,
        checkedOutToday: checkedOutStudents.length,
        deniedToday: deniedStudents.length,
        notYetArrived: notYetArrived.length,
        lateArrivals: lateArrivals.length
      },
      cutoffTime,
      currentlyOnCampus: currentlyOnCampusStudents,
      checkedOut: checkedOutStudents,
      deniedToday: deniedStudents,
      notYetArrived,
      recentScans: logsToday.slice(0, 50)
    };
  }
}
