import prisma from '../lib/prisma';

/**
 * Domain error raised by ClinicService. Carries an HTTP status code so API
 * routes can map business-rule violations to 4xx responses instead of 500s.
 */
export class ClinicError extends Error {
  statusCode: number;
  details?: Record<string, any>;

  constructor(message: string, statusCode = 400, details?: Record<string, any>) {
    super(message);
    this.name = 'ClinicError';
    this.statusCode = statusCode;
    this.details = details;
  }
}

export interface TriageInput {
  schoolId: string;
  studentId: string;
  nurseUserId: string;
  source?: string;
  presentingComplaint: string;
  acuity?: 'GREEN' | 'YELLOW' | 'RED';
  isConfidential?: boolean;
  isEmergency?: boolean;
  consentOverride?: boolean;
  temp?: number | string | null;
  bp?: string | null;
  pulse?: number | string | null;
  spo2?: number | string | null;
  weight?: number | string | null;
  height?: number | string | null;
}

export interface PrescriptionItem {
  drugName: string;
  dosage?: string;
  frequency?: string;
  duration?: string;
}

export type Disposition = 'DISCHARGE_CLASS' | 'ADMIT_SICK_BAY' | 'REFER_HOSPITAL' | 'EXCUSE_SPORTS';

export interface FinalizeConsultationInput {
  schoolId: string;
  visitId: string;
  clinicianUserId: string;
  /** Structured ICD-10 code (must exist in the Icd10Code catalogue) */
  icd10Code?: string | null;
  /** Free-text diagnoses (each stored as a ClinicDiagnosis note) */
  diagnoses?: string[];
  examNotes?: string | null;
  parentNote?: string | null;
  prescriptions?: PrescriptionItem[];
  disposition: Disposition;
  /** Optional explicit bed when admitting; otherwise first AVAILABLE bed is allocated */
  bedId?: string | null;
  dietNotes?: string | null;
  hospitalName?: string | null;
  referralReason?: string | null;
}

export interface AdmitPatientInput {
  schoolId: string;
  studentId: string;
  bedId?: string | null;
  visitId?: string | null;
  dietNotes?: string | null;
}

export interface DischargePatientInput {
  schoolId: string;
  admissionId: string;
  dischargeNotes?: string | null;
  dischargedById?: string;
}

export interface MonitoringLogInput {
  schoolId: string;
  admissionId: string;
  recordedById: string;
  temp?: number | string | null;
  bp?: string | null;
  pulse?: number | string | null;
  spo2?: number | string | null;
  notes?: string | null;
}

export interface DispenseDrugFEFOInput {
  schoolId: string;
  stockId: string;
  dispensedById: string;
  quantity: number | string;
  visitId?: string | null;
  patientId?: string | null;
  notes?: string | null;
}

const toFloat = (v: unknown): number | null => {
  if (v === undefined || v === null || v === '') return null;
  const n = parseFloat(String(v));
  return isNaN(n) ? null : n;
};

const toInt = (v: unknown): number | null => {
  if (v === undefined || v === null || v === '') return null;
  const n = parseInt(String(v), 10);
  return isNaN(n) ? null : n;
};

const OPEN_REQUISITION_STATUSES = ['PENDING_ADMIN', 'PENDING_BURSAR', 'PENDING_HOD_BOARDING'];

export class ClinicService {
  // ───────────────────────────────────────────────────────────────────────
  // Helpers
  // ───────────────────────────────────────────────────────────────────────

  /**
   * Generates a visit code in the format EP-YYYYMMDD-XXX.
   * visitCode is globally unique, so the daily sequence is computed across all
   * tenants and the caller retries on collision.
   */
  private static async nextVisitCode(offset = 0): Promise<string> {
    const now = new Date();
    const dateStr = now.toISOString().split('T')[0].replace(/-/g, '');
    const prefix = `EP-${dateStr}-`;
    const count = await prisma.clinicVisit.count({
      where: { visitCode: { startsWith: prefix } }
    });
    return `${prefix}${(count + 1 + offset).toString().padStart(3, '0')}`;
  }

  /**
   * Marks the student's attendance as excused for today.
   * Attendance.teacherId references Teacher (not User), so we resolve the class
   * teacher, falling back to the acting user's Teacher record. Non-blocking:
   * returns false if attendance cannot be recorded.
   */
  static async excuseAttendance(
    schoolId: string,
    studentId: string,
    note: string,
    actingUserId?: string
  ): Promise<boolean> {
    try {
      const student = await prisma.student.findFirst({
        where: { id: studentId, schoolId },
        include: { class: true }
      });
      if (!student) return false;

      let teacherId: string | null = student.class?.teacherId || null;
      if (!teacherId && actingUserId) {
        const t = await prisma.teacher.findFirst({ where: { userId: actingUserId, schoolId } });
        teacherId = t?.id || null;
      }
      if (!teacherId) return false;

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const existing = await prisma.attendance.findFirst({
        where: { schoolId, studentId, date: today, classId: student.classId ?? null }
      });

      if (existing) {
        await prisma.attendance.update({
          where: { id: existing.id },
          data: { status: 'excused', note }
        });
      } else {
        await prisma.attendance.create({
          data: {
            schoolId,
            studentId,
            teacherId,
            date: today,
            status: 'excused',
            note,
            classId: student.classId ?? null
          }
        });
      }
      return true;
    } catch (err) {
      console.warn('[ClinicService] Failed to excuse attendance:', (err as Error).message);
      return false;
    }
  }

  // ───────────────────────────────────────────────────────────────────────
  // Triage
  // ───────────────────────────────────────────────────────────────────────

  /**
   * Triage flow:
   * Verifies treatment consent (or emergency / explicit override), assigns
   * acuity, logs vital signs (ClinicVital) and creates the ClinicVisit routed
   * to the consultation or doctor queue.
   */
  static async recordTriage(input: TriageInput) {
    const {
      schoolId,
      studentId,
      nurseUserId,
      source = 'WALK_IN',
      presentingComplaint,
      acuity = 'GREEN',
      isConfidential = false,
      isEmergency = false,
      consentOverride = false
    } = input;

    if (!['GREEN', 'YELLOW', 'RED'].includes(acuity)) {
      throw new ClinicError(`Invalid acuity level: ${acuity}. Must be GREEN, YELLOW or RED`);
    }

    const student = await prisma.student.findFirst({
      where: { id: studentId, schoolId },
      include: { healthProfile: true }
    });
    if (!student) {
      throw new ClinicError('Student not found in this school', 404);
    }

    // Consent check for non-emergency visits
    if (!isEmergency && !student.healthProfile?.treatmentConsent && !consentOverride) {
      throw new ClinicError(
        'Treatment consent is not on file for this student. Explicit override required.',
        400,
        { requiresConsentOverride: true }
      );
    }

    const settings = await prisma.clinicSetting.findUnique({ where: { schoolId } });
    const targetStatus = settings?.hasDoctorQueue ? 'DOCTOR_QUEUE' : 'CONSULTATION';

    const temp = toFloat(input.temp);
    const pulse = toInt(input.pulse);
    const spo2 = toInt(input.spo2);
    const weight = toFloat(input.weight);
    const height = toFloat(input.height);
    const bp = input.bp || null;

    // RED acuity is always treated as an emergency
    const emergency = Boolean(isEmergency) || acuity === 'RED';

    for (let attempt = 0; attempt < 5; attempt++) {
      const visitCode = await ClinicService.nextVisitCode(attempt);
      try {
        return await prisma.clinicVisit.create({
          data: {
            schoolId,
            visitCode,
            userId: student.userId,
            source,
            acuity,
            triageLevel: acuity,
            isEmergency: emergency,
            isConfidential: Boolean(isConfidential),
            presentingComplaint,
            status: targetStatus,
            triageById: nurseUserId,
            temperature: temp,
            bloodPressure: bp,
            heartRate: pulse,
            oxygenSaturation: spo2,
            weight,
            height,
            vitalsRecord: {
              create: { schoolId, temp, bp, pulse, spo2, weight, height, recordedById: nurseUserId }
            }
          },
          include: { vitalsRecord: true }
        });
      } catch (err: any) {
        if (err?.code === 'P2002' && attempt < 4) continue; // visitCode collision → retry
        throw err;
      }
    }
    throw new ClinicError('Unable to allocate a unique visit code', 500);
  }

  // ───────────────────────────────────────────────────────────────────────
  // Consultation & Prescription
  // ───────────────────────────────────────────────────────────────────────

  /**
   * Records ICD-10 / free-text diagnoses and prescriptions, applies the
   * disposition (discharge, admit to sick bay, hospital referral, sports excuse)
   * and closes or advances the visit.
   */
  static async finalizeConsultation(input: FinalizeConsultationInput) {
    const {
      schoolId,
      visitId,
      clinicianUserId,
      icd10Code,
      diagnoses = [],
      examNotes,
      parentNote,
      prescriptions = [],
      disposition,
      bedId,
      dietNotes,
      hospitalName,
      referralReason
    } = input;

    const validDispositions: Disposition[] = ['DISCHARGE_CLASS', 'ADMIT_SICK_BAY', 'REFER_HOSPITAL', 'EXCUSE_SPORTS'];
    if (!validDispositions.includes(disposition)) {
      throw new ClinicError(`Invalid disposition: ${disposition}`);
    }

    const visit = await prisma.clinicVisit.findFirst({ where: { id: visitId, schoolId } });
    if (!visit) throw new ClinicError('Clinic visit not found', 404);
    if (visit.status === 'DISCHARGED' || visit.closedAt) {
      throw new ClinicError('Clinic visit is already closed');
    }

    if (icd10Code) {
      const code = await prisma.icd10Code.findUnique({ where: { code: icd10Code } });
      if (!code) throw new ClinicError(`Unknown ICD-10 code: ${icd10Code}`);
    }

    if (disposition === 'REFER_HOSPITAL' && !hospitalName) {
      throw new ClinicError('Hospital name is required for a hospital referral');
    }

    const student = visit.userId
      ? await prisma.student.findFirst({ where: { userId: visit.userId, schoolId } })
      : null;

    if (disposition === 'ADMIT_SICK_BAY' && !student) {
      throw new ClinicError('Only enrolled students can be admitted to the sick bay');
    }

    const validRx = (prescriptions || []).filter(rx => rx && rx.drugName && rx.drugName.trim());

    const result = await prisma.$transaction(async tx => {
      // 1. Diagnoses
      const createdDiagnoses: any[] = [];
      if (icd10Code || (examNotes && diagnoses.length === 0)) {
        createdDiagnoses.push(
          await tx.clinicDiagnosis.create({
            data: {
              schoolId,
              visitId,
              icd10Code: icd10Code || null,
              notes: examNotes || null,
              parentNote: parentNote || null
            }
          })
        );
      }
      for (const diag of diagnoses) {
        if (!diag || !diag.trim()) continue;
        createdDiagnoses.push(
          await tx.clinicDiagnosis.create({
            data: {
              schoolId,
              visitId,
              notes: examNotes ? `${diag.trim()} — ${examNotes}` : diag.trim(),
              parentNote: parentNote || null
            }
          })
        );
      }

      // 2. Prescriptions
      const createdPrescriptions: any[] = [];
      for (const rx of validRx) {
        createdPrescriptions.push(
          await tx.clinicPrescription.create({
            data: {
              schoolId,
              visitId,
              drugName: rx.drugName.trim(),
              dosage: rx.dosage || '1 dose',
              frequency: rx.frequency || 'PRN',
              duration: rx.duration || '3 days',
              prescribedById: clinicianUserId
            }
          })
        );
      }

      // 3. Disposition
      let finalStatus = 'DISCHARGED';
      let admission: any = null;
      let referral: any = null;

      if (disposition === 'ADMIT_SICK_BAY') {
        finalStatus = 'ADMITTED';
        let bed: any;
        if (bedId) {
          bed = await tx.clinicBed.findFirst({ where: { id: bedId, schoolId } });
          if (!bed) throw new ClinicError('Specified clinic bed not found', 404);
          if (bed.status !== 'AVAILABLE') {
            throw new ClinicError(`Bed ${bed.bedNumber} is not available (status: ${bed.status})`, 409);
          }
        } else {
          bed = await tx.clinicBed.findFirst({
            where: { schoolId, status: 'AVAILABLE' },
            orderBy: { bedNumber: 'asc' }
          });
          if (!bed) throw new ClinicError('Cannot admit patient: all sick bay beds are occupied', 409);
        }

        await tx.clinicBed.update({ where: { id: bed.id }, data: { status: 'OCCUPIED' } });
        admission = await tx.clinicAdmission.create({
          data: {
            schoolId,
            bedId: bed.id,
            visitId,
            studentId: student!.id,
            status: 'ADMITTED',
            dietNotes: dietNotes || null,
            admittedAt: new Date()
          },
          include: { bed: true }
        });
      } else if (disposition === 'REFER_HOSPITAL') {
        finalStatus = 'REFERRAL';
        referral = await tx.clinicReferral.create({
          data: {
            schoolId,
            userId: visit.userId,
            title: `External Hospital Referral: ${hospitalName}`,
            details: referralReason || examNotes || 'Referred for specialist care',
            to: hospitalName!,
            address: 'Local Health Facility',
            urgency: visit.acuity === 'RED' ? 'EMERGENCY' : 'URGENT',
            status: 'PENDING'
          }
        });
      }

      const updatedVisit = await tx.clinicVisit.update({
        where: { id: visitId },
        data: {
          disposition,
          status: finalStatus,
          consultedById: clinicianUserId,
          conditionDetails: examNotes || visit.conditionDetails,
          diagnosis: [icd10Code, ...diagnoses].filter(Boolean).join(', ') || visit.diagnosis,
          prescription: validRx.length
            ? validRx.map(p => `${p.drugName} ${p.dosage || ''}`.trim()).join('; ')
            : visit.prescription,
          closedAt: finalStatus === 'DISCHARGED' ? new Date() : null
        }
      });

      return { visit: updatedVisit, diagnoses: createdDiagnoses, prescriptions: createdPrescriptions, admission, referral };
    });

    // 4. Attendance (outside the transaction — must never roll back clinical records)
    let attendanceExcused = false;
    if (student && disposition !== 'REFER_HOSPITAL') {
      attendanceExcused = await ClinicService.excuseAttendance(
        schoolId,
        student.id,
        disposition === 'ADMIT_SICK_BAY' ? 'Excused - Sick Bay Admission' : 'Excused - Clinic',
        clinicianUserId
      );
    }

    return { ...result, attendanceExcused };
  }

  // ───────────────────────────────────────────────────────────────────────
  // Sick bay admission / monitoring / discharge
  // ───────────────────────────────────────────────────────────────────────

  static async admitPatient(input: AdmitPatientInput & { admittedById?: string }) {
    const { schoolId, studentId, bedId, visitId, dietNotes, admittedById } = input;

    const student = await prisma.student.findFirst({ where: { id: studentId, schoolId } });
    if (!student) throw new ClinicError('Student not found in this school', 404);

    const alreadyAdmitted = await prisma.clinicAdmission.findFirst({
      where: { schoolId, studentId, status: 'ADMITTED' }
    });
    if (alreadyAdmitted) throw new ClinicError('Student is already admitted to the sick bay', 409);

    if (visitId) {
      const v = await prisma.clinicVisit.findFirst({ where: { id: visitId, schoolId } });
      if (!v) throw new ClinicError('Clinic visit not found', 404);
    }

    const admission = await prisma.$transaction(async tx => {
      let bed: any;
      if (bedId) {
        bed = await tx.clinicBed.findFirst({ where: { id: bedId, schoolId } });
        if (!bed) throw new ClinicError('Specified clinic bed not found', 404);
        if (bed.status !== 'AVAILABLE') {
          throw new ClinicError(`Bed ${bed.bedNumber} is not available (status: ${bed.status})`, 409);
        }
      } else {
        bed = await tx.clinicBed.findFirst({
          where: { schoolId, status: 'AVAILABLE' },
          orderBy: { bedNumber: 'asc' }
        });
        if (!bed) throw new ClinicError('No available sick bay beds. All beds are occupied.', 409);
      }

      await tx.clinicBed.update({ where: { id: bed.id }, data: { status: 'OCCUPIED' } });

      if (visitId) {
        await tx.clinicVisit.update({
          where: { id: visitId },
          data: { status: 'ADMITTED', disposition: 'ADMIT_SICK_BAY', closedAt: null }
        });
      }

      return tx.clinicAdmission.create({
        data: {
          schoolId,
          bedId: bed.id,
          studentId,
          visitId: visitId || null,
          status: 'ADMITTED',
          dietNotes: dietNotes || null,
          admittedAt: new Date()
        },
        include: { bed: true }
      });
    });

    const attendanceExcused = await ClinicService.excuseAttendance(
      schoolId,
      studentId,
      'Excused - Sick Bay Admission',
      admittedById
    );

    return { ...admission, attendanceExcused };
  }

  static async recordMonitoringLog(input: MonitoringLogInput) {
    const { schoolId, admissionId, recordedById, bp, notes } = input;

    const admission = await prisma.clinicAdmission.findFirst({
      where: { id: admissionId, schoolId, status: 'ADMITTED' }
    });
    if (!admission) throw new ClinicError('Active sick bay admission not found', 404);

    const temp = toFloat(input.temp);
    const log = await prisma.clinicMonitoringLog.create({
      data: {
        schoolId,
        admissionId,
        temp,
        bp: bp || null,
        pulse: toInt(input.pulse),
        spo2: toInt(input.spo2),
        notes: notes || null,
        recordedById
      }
    });

    const settings = await prisma.clinicSetting.findUnique({ where: { schoolId } });
    const threshold = settings?.tempAlertThreshold ?? 38.0;
    const spo2 = toInt(input.spo2);
    const alert = (temp !== null && temp >= threshold) || (spo2 !== null && spo2 < 92);

    return { log, alert, tempAlertThreshold: threshold };
  }

  static async dischargePatient(input: DischargePatientInput) {
    const { schoolId, admissionId, dischargedById } = input;
    const dischargeNotes = input.dischargeNotes || 'Discharged in stable condition';

    const admission = await prisma.clinicAdmission.findFirst({
      where: { id: admissionId, schoolId }
    });
    if (!admission) throw new ClinicError('Admission record not found', 404);
    if (admission.status === 'DISCHARGED') {
      throw new ClinicError('Patient is already discharged from the sick bay', 409);
    }

    const updated = await prisma.$transaction(async tx => {
      const upd = await tx.clinicAdmission.update({
        where: { id: admission.id },
        data: { status: 'DISCHARGED', dischargedAt: new Date(), dischargeNotes }
      });
      await tx.clinicBed.update({ where: { id: admission.bedId }, data: { status: 'AVAILABLE' } });
      if (admission.visitId) {
        await tx.clinicVisit.update({
          where: { id: admission.visitId },
          data: { status: 'DISCHARGED', closedAt: new Date() }
        });
      }
      return upd;
    });

    const attendanceExcused = await ClinicService.excuseAttendance(
      schoolId,
      admission.studentId,
      'Excused - Sick Bay Discharge',
      dischargedById
    );

    return { ...updated, attendanceExcused };
  }

  // ───────────────────────────────────────────────────────────────────────
  // Pharmacy: FEFO dispensing linked to inventory (StockMovement)
  // ───────────────────────────────────────────────────────────────────────

  /**
   * Deducts stock from the earliest-expiring, non-expired PharmacyBatch records
   * first (FEFO), logs PharmacyDispense + StockMovement (module PHARMACY, OUT)
   * per batch, syncs the legacy ClinicInventoryItem counter, and raises a
   * deduplicated restock Requisition when stock falls to/below minStock.
   */
  static async dispenseMedicationFEFO(input: DispenseDrugFEFOInput) {
    const { schoolId, stockId, dispensedById, visitId, patientId, notes } = input;
    const quantity = toInt(input.quantity);

    if (!quantity || quantity <= 0) {
      throw new ClinicError('Valid positive dispense quantity required');
    }

    const now = new Date();
    const stock = await prisma.pharmacyStock.findFirst({
      where: { id: stockId, schoolId },
      include: {
        batches: {
          where: { quantity: { gt: 0 }, expiryDate: { gt: now } },
          orderBy: { expiryDate: 'asc' }
        }
      }
    });
    if (!stock) throw new ClinicError('Medication stock item not found', 404);

    if (visitId) {
      const v = await prisma.clinicVisit.findFirst({ where: { id: visitId, schoolId } });
      if (!v) throw new ClinicError('Clinic visit not found', 404);
    }

    const totalAvailable = stock.batches.reduce((sum, b) => sum + b.quantity, 0);
    if (totalAvailable < quantity) {
      throw new ClinicError(
        `Insufficient stock! Cannot allow negative balance. Requested: ${quantity}, Available (non-expired): ${totalAvailable}`
      );
    }

    const dispenseLogs: any[] = [];
    const stockMovements: any[] = [];

    await prisma.$transaction(async tx => {
      let remaining = quantity;
      const invItem = await tx.clinicInventoryItem.findFirst({ where: { schoolId, name: stock.drugName } });
      let invStock = invItem?.stock ?? 0;

      for (const batch of stock.batches) {
        if (remaining <= 0) break;
        const take = Math.min(batch.quantity, remaining);

        // Optimistic guard against concurrent dispenses draining the batch
        const res = await tx.pharmacyBatch.updateMany({
          where: { id: batch.id, quantity: { gte: take } },
          data: { quantity: { decrement: take } }
        });
        if (res.count !== 1) {
          throw new ClinicError(`Batch ${batch.batchNumber} changed during dispense; please retry`, 409);
        }

        const log = await tx.pharmacyDispense.create({
          data: {
            schoolId,
            visitId: visitId || null,
            stockId: stock.id,
            batchId: batch.id,
            quantity: take,
            dispensedById
          }
        });
        dispenseLogs.push(log);

        stockMovements.push(
          await tx.stockMovement.create({
            data: {
              schoolId,
              module: 'PHARMACY',
              itemId: stock.id,
              itemName: stock.drugName,
              batchNumber: batch.batchNumber,
              direction: 'OUT',
              quantity: take,
              reference: visitId ? `VISIT:${visitId}` : `DISPENSE:${log.id}`,
              date: new Date()
            }
          })
        );

        if (invItem) {
          const dec = Math.min(invStock, take);
          invStock -= dec;
          await tx.clinicDispensingLog.create({
            data: {
              schoolId,
              itemId: invItem.id,
              visitId: visitId || null,
              patientId: patientId || null,
              quantity: take,
              unitCost: invItem.unitCost,
              totalPrice: take * invItem.unitPrice,
              dispensedBy: dispensedById,
              notes: notes || null
            }
          });
        }

        remaining -= take;
      }

      if (invItem) {
        await tx.clinicInventoryItem.update({ where: { id: invItem.id }, data: { stock: invStock } });
      }

      if (visitId) {
        await tx.clinicVisit.update({ where: { id: visitId }, data: { treatment: notes || undefined } });
      }
    });

    const after = await prisma.pharmacyBatch.aggregate({
      where: { stockId: stock.id, schoolId, quantity: { gt: 0 }, expiryDate: { gt: now } },
      _sum: { quantity: true }
    });
    const remainingTotal = after._sum.quantity || 0;

    let autoRequisitionCreated = false;
    let requisitionId: string | null = null;
    if (remainingTotal <= stock.minStock) {
      const existing = await prisma.requisition.findFirst({
        where: {
          schoolId,
          requesterRole: 'CLINIC',
          title: { contains: stock.drugName },
          status: { in: OPEN_REQUISITION_STATUSES }
        }
      });
      if (existing) {
        requisitionId = existing.id;
      } else {
        try {
          const reqn = await prisma.requisition.create({
            data: {
              refNumber: `REQ-CLN-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
              schoolId,
              requesterId: dispensedById,
              requesterRole: 'CLINIC',
              title: `Pharmacy Restock: ${stock.drugName}`,
              description: `Automated low-stock trigger. Available: ${remainingTotal} ${stock.unit} (Min: ${stock.minStock})`,
              priority: 'Urgent',
              status: 'PENDING_ADMIN',
              estimatedAmount: 0,
              items: [
                {
                  name: stock.drugName,
                  quantity: Math.max(stock.minStock * 2 - remainingTotal, stock.minStock),
                  unit: stock.unit,
                  reason: 'Automatic pharmacy safety reorder'
                }
              ]
            }
          });
          autoRequisitionCreated = true;
          requisitionId = reqn.id;
        } catch (err) {
          console.error('[ClinicService] Failed to create auto-restock requisition:', err);
        }
      }
    }

    return {
      stockId: stock.id,
      drugName: stock.drugName,
      dispensedQty: quantity,
      remainingTotal,
      autoRequisitionCreated,
      requisitionId,
      dispenseLogs,
      stockMovements
    };
  }

  /**
   * Medication stock balances (non-expired), expiry breakdown and low-stock flags.
   */
  static async getDrugStockSummary(schoolId: string) {
    const now = new Date();
    const soon = new Date(now.getTime() + 60 * 24 * 60 * 60 * 1000);
    const stocks = await prisma.pharmacyStock.findMany({
      where: { schoolId },
      include: { batches: { where: { quantity: { gt: 0 } }, orderBy: { expiryDate: 'asc' } } },
      orderBy: { drugName: 'asc' }
    });

    return stocks.map(stock => {
      const usable = stock.batches.filter(b => b.expiryDate > now);
      const expired = stock.batches.filter(b => b.expiryDate <= now);
      const totalAvailable = usable.reduce((s, b) => s + b.quantity, 0);
      return {
        id: stock.id,
        drugName: stock.drugName,
        category: stock.category,
        unit: stock.unit,
        minStock: stock.minStock,
        totalAvailable,
        expiredQty: expired.reduce((s, b) => s + b.quantity, 0),
        expiringSoonQty: usable.filter(b => b.expiryDate <= soon).reduce((s, b) => s + b.quantity, 0),
        isLowStock: totalAvailable <= stock.minStock,
        earliestExpiry: usable[0]?.expiryDate || null,
        activeBatchesCount: usable.length,
        batches: stock.batches
      };
    });
  }
}
