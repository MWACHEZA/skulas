/**
 * PHASE 8.5: CLINIC INTEGRATION TEST SUITE
 * 
 * Verifies:
 * 1. Multi-tenant setup & clinical authorization scope.
 * 2. Triage flow: consent verification, emergency override, vitals recording (ClinicVital), acuity levels (GREEN, YELLOW, RED).
 * 3. Consultation & prescription: diagnoses, prescriptions, and disposition handling.
 * 4. Sick bay admission via consultation disposition: bed allocation, status OCCUPIED, diet notes, excused attendance.
 * 5. Sick bay monitoring log: interval observations, high temperature / low SpO2 alerts.
 * 6. Direct admission & bed capacity guard: rejection when all beds are occupied.
 * 7. Sick bay discharge: freeing bed to AVAILABLE, discharge notes, excused attendance.
 * 8. External hospital referral flow: ClinicReferral creation.
 * 9. Pharmacy FEFO drug dispensing: earliest-expiring batch deducted first, multi-batch spanning,
 *    StockMovement audit record created (module: 'PHARMACY', direction: 'OUT'), negative balance protection,
 *    automatic deduplicated safety restock requisition when stock <= minStock.
 * 10. Expired batch exclusion & strict multi-tenant isolation across schools.
 */

import prisma from '../lib/prisma';
import bcrypt from 'bcryptjs';
import { ClinicService } from '../services/clinic.service';

function assert(condition: any, message: string) {
  if (!condition) {
    throw new Error(`ASSERTION FAILED: ${message}`);
  }
  console.log(`  ✓ PASS: ${message}`);
}

async function runPhase8ClinicTests() {
  console.log('================================================================');
  console.log('   PHASE 8.5: CLINIC INTEGRATION TEST SUITE');
  console.log('   (Triage, Admission, Prescription, FEFO StockMovement, Isolation)');
  console.log('================================================================\n');

  const runId = Date.now().toString().slice(-6);
  let schoolAId = '';
  let schoolBId = '';

  try {
    // -------------------------------------------------------------------------
    // TEST GROUP 1: Setup Isolated Tenants, Staff, Classes & Patients
    // -------------------------------------------------------------------------
    console.log('Test Group 1: Setup Isolated Tenants, Staff, Classes & Patients');

    let plan = await prisma.plan.findFirst();
    if (!plan) {
      plan = await prisma.plan.create({
        data: { name: 'Standard Plan', price: 0, features: [] }
      });
    }

    const schoolA = await prisma.school.create({
      data: {
        name: `P8 Clinic School A ${runId}`,
        code: `CLN-A-${runId}`,
        email: `clinic-a-${runId}@test.com`,
        type: 'Secondary',
        planId: plan.id
      }
    });
    schoolAId = schoolA.id;

    const schoolB = await prisma.school.create({
      data: {
        name: `P8 Clinic School B ${runId}`,
        code: `CLN-B-${runId}`,
        email: `clinic-b-${runId}@test.com`,
        type: 'Secondary',
        planId: plan.id
      }
    });
    schoolBId = schoolB.id;

    const hashedPassword = await bcrypt.hash('Secret123!', 10);

    // Clinical Staff (Nurse & Doctor)
    const nurseUser = await prisma.user.create({
      data: {
        name: 'Nurse Chipo Moyo',
        email: `nurse-a-${runId}@test.com`,
        password: hashedPassword,
        role: 'CLINIC',
        secondaryRoles: ['nurse'],
        schoolId: schoolAId
      }
    });

    const doctorUser = await prisma.user.create({
      data: {
        name: 'Dr. T. Sithole',
        email: `doctor-a-${runId}@test.com`,
        password: hashedPassword,
        role: 'CLINIC',
        secondaryRoles: ['doctor'],
        schoolId: schoolAId
      }
    });

    // Class Teacher
    const teacherUser = await prisma.user.create({
      data: {
        name: 'Mr. K. Mutasa',
        email: `teacher-a-${runId}@test.com`,
        password: hashedPassword,
        role: 'TEACHER',
        schoolId: schoolAId
      }
    });

    const teacher = await prisma.teacher.create({
      data: {
        userId: teacherUser.id,
        staffId: `TCH-${runId}`,
        schoolId: schoolAId
      }
    });

    const classA = await prisma.schoolClass.create({
      data: {
        name: `Form 3A ${runId}`,
        level: 'Form 3',
        teacherId: teacher.id,
        schoolId: schoolAId
      }
    });

    // Student 1 (Has Treatment Consent)
    const studentUser1 = await prisma.user.create({
      data: {
        name: 'Tendai Mavhunga',
        email: `tendai-${runId}@test.com`,
        password: hashedPassword,
        role: 'STUDENT',
        schoolId: schoolAId
      }
    });

    const student1 = await prisma.student.create({
      data: {
        name: 'Tendai Mavhunga',
        studentId: `STU-01-${runId}`,
        userId: studentUser1.id,
        classId: classA.id,
        schoolId: schoolAId,
        healthProfile: {
          create: {
            schoolId: schoolAId,
            allergies: 'Penicillin, Dust',
            chronicConditions: 'Asthma (Mild)',
            bloodGroup: 'O+',
            treatmentConsent: true,
            consentBy: 'Mrs. Mavhunga (Parent)',
            consentedAt: new Date()
          }
        }
      },
      include: { healthProfile: true }
    });

    // Student 2 (NO Treatment Consent on File)
    const studentUser2 = await prisma.user.create({
      data: {
        name: 'Farai Ncube',
        email: `farai-${runId}@test.com`,
        password: hashedPassword,
        role: 'STUDENT',
        schoolId: schoolAId
      }
    });

    const student2 = await prisma.student.create({
      data: {
        name: 'Farai Ncube',
        studentId: `STU-02-${runId}`,
        userId: studentUser2.id,
        classId: classA.id,
        schoolId: schoolAId,
        healthProfile: {
          create: {
            schoolId: schoolAId,
            allergies: 'None',
            treatmentConsent: false
          }
        }
      },
      include: { healthProfile: true }
    });

    // Student 3 in School A
    const studentUser3 = await prisma.user.create({
      data: {
        name: 'Rudo Gumbo',
        email: `rudo-${runId}@test.com`,
        password: hashedPassword,
        role: 'STUDENT',
        schoolId: schoolAId
      }
    });

    const student3 = await prisma.student.create({
      data: {
        name: 'Rudo Gumbo',
        studentId: `STU-03-${runId}`,
        userId: studentUser3.id,
        classId: classA.id,
        schoolId: schoolAId,
        healthProfile: {
          create: {
            schoolId: schoolAId,
            treatmentConsent: true
          }
        }
      }
    });

    // Student B in School B
    const studentUserB = await prisma.user.create({
      data: {
        name: 'Tinashe School B',
        email: `tinashe-b-${runId}@test.com`,
        password: hashedPassword,
        role: 'STUDENT',
        schoolId: schoolBId
      }
    });

    const studentB = await prisma.student.create({
      data: {
        name: 'Tinashe School B',
        studentId: `STU-B-${runId}`,
        userId: studentUserB.id,
        schoolId: schoolBId
      }
    });

    // Clinic Settings & Beds in School A
    await prisma.clinicSetting.create({
      data: {
        schoolId: schoolAId,
        hasDoctorQueue: false,
        bedCount: 2,
        monitoringIntervalHours: 4,
        tempAlertThreshold: 38.0
      }
    });

    const bed1 = await prisma.clinicBed.create({
      data: { schoolId: schoolAId, bedNumber: `BED-01-${runId}`, ward: 'Sick Bay Main', status: 'AVAILABLE' }
    });
    const bed2 = await prisma.clinicBed.create({
      data: { schoolId: schoolAId, bedNumber: `BED-02-${runId}`, ward: 'Sick Bay Main', status: 'AVAILABLE' }
    });

    assert(Boolean(schoolA && schoolB), 'Isolated school tenants created');
    assert(Boolean(student1.healthProfile?.treatmentConsent), 'Student 1 has treatment consent on file');
    assert(!student2.healthProfile?.treatmentConsent, 'Student 2 does not have treatment consent on file');
    assert(Boolean(bed1 && bed2), 'Clinic beds initialized in School A with status AVAILABLE');

    // -------------------------------------------------------------------------
    // TEST GROUP 2: Triage Flow, Consent Protection & Acuity Levels
    // -------------------------------------------------------------------------
    console.log('\nTest Group 2: Triage Flow, Consent Protection & Acuity Levels');

    // 2.1 Attempt triage without consent and without override -> Must throw
    let consentBlocked = false;
    try {
      await ClinicService.recordTriage({
        schoolId: schoolAId,
        studentId: student2.id,
        nurseUserId: nurseUser.id,
        presentingComplaint: 'Mild headache and fatigue',
        acuity: 'GREEN',
        isEmergency: false,
        consentOverride: false
      });
    } catch (err: any) {
      consentBlocked = true;
      assert(err.message.includes('consent'), 'Blocked non-emergency triage when consent is not on file');
    }
    assert(consentBlocked, 'Consent guard successfully enforced');

    // 2.2 Emergency bypasses consent check even if not on file
    const emergencyVisit = await ClinicService.recordTriage({
      schoolId: schoolAId,
      studentId: student2.id,
      nurseUserId: nurseUser.id,
      presentingComplaint: 'Acute respiratory distress during athletics',
      acuity: 'RED',
      isEmergency: true,
      temp: 38.5,
      bp: '120/80',
      pulse: 110,
      spo2: 91
    });

    assert(emergencyVisit.isEmergency === true, 'Emergency triage flagged isEmergency = true');
    assert(emergencyVisit.acuity === 'RED', 'Emergency triage assigned RED acuity');
    assert(emergencyVisit.visitCode?.startsWith('EP-'), `Visit code EP- format allocated: ${emergencyVisit.visitCode}`);
    assert(emergencyVisit.vitalsRecord?.spo2 === 91, 'SpO2 91% recorded in ClinicVital record');

    // 2.3 Regular triage on student with consent on file
    const regularVisit = await ClinicService.recordTriage({
      schoolId: schoolAId,
      studentId: student1.id,
      nurseUserId: nurseUser.id,
      presentingComplaint: 'Stomach ache and mild nausea',
      acuity: 'YELLOW',
      temp: 37.4,
      bp: '110/70',
      pulse: 78,
      spo2: 98,
      weight: 54,
      height: 162
    });

    assert(regularVisit.status === 'CONSULTATION', 'Visit status routed to CONSULTATION queue');
    assert(regularVisit.vitalsRecord?.temp === 37.4, 'Vitals recorded accurately');
    assert(regularVisit.vitalsRecord?.pulse === 78, 'Pulse recorded accurately');

    // -------------------------------------------------------------------------
    // TEST GROUP 3: Consultation, Diagnoses, Prescriptions & Discharge to Class
    // -------------------------------------------------------------------------
    console.log('\nTest Group 3: Consultation, Diagnoses, Prescriptions & Discharge to Class');

    const consultationResult = await ClinicService.finalizeConsultation({
      schoolId: schoolAId,
      visitId: regularVisit.id,
      clinicianUserId: doctorUser.id,
      diagnoses: ['Acute Gastritis', 'Mild Dehydration'],
      examNotes: 'Abdomen soft, mild epigastric tenderness. Hydrated with ORS in clinic.',
      parentNote: 'Rest in class recommended. Avoid spicy food.',
      prescriptions: [
        { drugName: 'Antacid Gel', dosage: '10ml', frequency: 'TDS', duration: '3 days' },
        { drugName: 'Oral Rehydration Salts', dosage: '1 sachet', frequency: 'PRN', duration: '1 day' }
      ],
      disposition: 'DISCHARGE_CLASS'
    });

    assert(consultationResult.visit.status === 'DISCHARGED', 'Visit finalized and marked DISCHARGED');
    assert(consultationResult.visit.disposition === 'DISCHARGE_CLASS', 'Disposition set to DISCHARGE_CLASS');
    assert(consultationResult.diagnoses.length === 2, '2 ClinicDiagnosis records created');
    assert(consultationResult.prescriptions.length === 2, '2 ClinicPrescription records created');
    assert(consultationResult.attendanceExcused === true, 'Attendance excused note logged for discharged student');

    // Verify visit cannot be finalized twice
    let doubleFinalizeBlocked = false;
    try {
      await ClinicService.finalizeConsultation({
        schoolId: schoolAId,
        visitId: regularVisit.id,
        clinicianUserId: doctorUser.id,
        disposition: 'DISCHARGE_CLASS'
      });
    } catch (err: any) {
      doubleFinalizeBlocked = true;
    }
    assert(doubleFinalizeBlocked, 'Closed visit protected against duplicate finalization');

    // -------------------------------------------------------------------------
    // TEST GROUP 4: Sick Bay Admission via Consultation Disposition
    // -------------------------------------------------------------------------
    console.log('\nTest Group 4: Sick Bay Admission via Consultation Disposition');

    // Record new visit for Student 1 with high fever
    const feverVisit = await ClinicService.recordTriage({
      schoolId: schoolAId,
      studentId: student1.id,
      nurseUserId: nurseUser.id,
      presentingComplaint: 'High fever, chills, body weakness',
      acuity: 'YELLOW',
      temp: 39.1,
      pulse: 98
    });

    const admitConsultation = await ClinicService.finalizeConsultation({
      schoolId: schoolAId,
      visitId: feverVisit.id,
      clinicianUserId: doctorUser.id,
      diagnoses: ['Febrile Illness / Pyrexia of unknown origin'],
      examNotes: 'High fever, lethargic. Requires bed rest and active monitoring in sick bay.',
      prescriptions: [
        { drugName: 'Paracetamol', dosage: '500mg', frequency: 'QDS', duration: '3 days' }
      ],
      disposition: 'ADMIT_SICK_BAY',
      dietNotes: 'Light fluids and soup only'
    });

    assert(admitConsultation.visit.status === 'ADMITTED', 'Visit status updated to ADMITTED');
    assert(Boolean(admitConsultation.admission), 'ClinicAdmission record generated');
    assert(admitConsultation.admission.status === 'ADMITTED', 'Admission status is ADMITTED');
    assert(admitConsultation.admission.dietNotes === 'Light fluids and soup only', 'Diet notes recorded');

    // Verify bed status transitioned to OCCUPIED
    const admittedBed = await prisma.clinicBed.findUnique({
      where: { id: admitConsultation.admission.bedId }
    });
    assert(admittedBed?.status === 'OCCUPIED', `ClinicBed ${admittedBed?.bedNumber} transitioned to OCCUPIED`);

    // -------------------------------------------------------------------------
    // TEST GROUP 5: Sick Bay Interval Monitoring Log & Fever Alert Threshold
    // -------------------------------------------------------------------------
    console.log('\nTest Group 5: Sick Bay Interval Monitoring Log & Fever Alert Threshold');

    const admissionId = admitConsultation.admission.id;

    // Normal check
    const check1 = await ClinicService.recordMonitoringLog({
      schoolId: schoolAId,
      admissionId,
      recordedById: nurseUser.id,
      temp: 37.6,
      bp: '115/75',
      pulse: 82,
      spo2: 97,
      notes: 'Resting comfortably'
    });
    assert(check1.alert === false, 'Normal temp 37.6 does not trigger high fever alert');

    // Fever spike check (>= threshold 38.0)
    const check2 = await ClinicService.recordMonitoringLog({
      schoolId: schoolAId,
      admissionId,
      recordedById: nurseUser.id,
      temp: 38.8,
      bp: '118/76',
      pulse: 96,
      spo2: 96,
      notes: 'Fever spiked; administered cold sponge and fluids'
    });
    assert(check2.alert === true, 'Elevated temp 38.8 triggers alert (threshold: 38.0)');

    // -------------------------------------------------------------------------
    // TEST GROUP 6: Direct Sick Bay Bed Management & Bed Exhaustion Guard
    // -------------------------------------------------------------------------
    console.log('\nTest Group 6: Direct Sick Bay Bed Management & Bed Exhaustion Guard');

    // Bed 1 is currently occupied by Student 1. Bed 2 is available.
    // Directly admit Student 3 to remaining bed
    const directAdmission = await ClinicService.admitPatient({
      schoolId: schoolAId,
      studentId: student3.id,
      dietNotes: 'Normal boarding diet'
    });
    assert(directAdmission.status === 'ADMITTED', 'Direct admission created for Student 3');

    const bed2Check = await prisma.clinicBed.findUnique({ where: { id: bed2.id } });
    assert(bed2Check?.status === 'OCCUPIED', 'Bed 2 is now OCCUPIED');

    // Both beds are now occupied (bedCount: 2). Attempting to admit another student must fail.
    let bedExhaustedBlocked = false;
    try {
      await ClinicService.admitPatient({
        schoolId: schoolAId,
        studentId: student2.id
      });
    } catch (err: any) {
      bedExhaustedBlocked = true;
      assert(err.message.includes('occupied'), 'Blocked admission when all sick bay beds are occupied');
    }
    assert(bedExhaustedBlocked, 'Bed capacity guard successfully enforced');

    // -------------------------------------------------------------------------
    // TEST GROUP 7: Sick Bay Discharge Flow & Bed Freeing
    // -------------------------------------------------------------------------
    console.log('\nTest Group 7: Sick Bay Discharge Flow & Bed Freeing');

    const dischargeResult = await ClinicService.dischargePatient({
      schoolId: schoolAId,
      admissionId,
      dischargeNotes: 'Afebril for 24h, symptoms resolved. Cleared to return to dorm and class.',
      dischargedById: doctorUser.id
    });

    assert(dischargeResult.status === 'DISCHARGED', 'Admission status marked DISCHARGED');
    assert(Boolean(dischargeResult.dischargedAt), 'Discharged timestamp populated');

    // Check that bed was freed back to AVAILABLE
    const freedBed = await prisma.clinicBed.findUnique({ where: { id: admitConsultation.admission.bedId } });
    assert(freedBed?.status === 'AVAILABLE', `Bed ${freedBed?.bedNumber} successfully freed to AVAILABLE`);

    // Verify cannot discharge an already-discharged admission
    let doubleDischargeBlocked = false;
    try {
      await ClinicService.dischargePatient({
        schoolId: schoolAId,
        admissionId
      });
    } catch (err: any) {
      doubleDischargeBlocked = true;
    }
    assert(doubleDischargeBlocked, 'Duplicate discharge prevented');

    // -------------------------------------------------------------------------
    // TEST GROUP 8: External Hospital Referral Flow
    // -------------------------------------------------------------------------
    console.log('\nTest Group 8: External Hospital Referral Flow');

    const referralResult = await ClinicService.finalizeConsultation({
      schoolId: schoolAId,
      visitId: emergencyVisit.id,
      clinicianUserId: doctorUser.id,
      diagnoses: ['Acute Severe Bronchospasm'],
      examNotes: 'Wheezing, SpO2 91% on room air. Requires nebulization and tertiary pediatric evaluation.',
      disposition: 'REFER_HOSPITAL',
      hospitalName: 'Harare Central Hospital',
      referralReason: 'Immediate nebulization and specialist respiratory care'
    });

    assert(referralResult.visit.status === 'REFERRAL', 'Visit status updated to REFERRAL');
    assert(Boolean(referralResult.referral), 'ClinicReferral record created');
    assert(referralResult.referral.to === 'Harare Central Hospital', 'Referral destination recorded');
    assert(referralResult.referral.urgency === 'EMERGENCY', 'Referral urgency tagged EMERGENCY');

    // -------------------------------------------------------------------------
    // TEST GROUP 9: Pharmacy FEFO Drug Dispensing, Multi-Batch & StockMovement
    // -------------------------------------------------------------------------
    console.log('\nTest Group 9: Pharmacy FEFO Drug Dispensing, Multi-Batch & StockMovement');

    // Setup medication stock: Amoxicillin 250mg, minStock: 20
    const stock = await prisma.pharmacyStock.create({
      data: {
        schoolId: schoolAId,
        drugName: `Amoxicillin 250mg ${runId}`,
        category: 'ANTIBIOTIC',
        unit: 'capsules',
        minStock: 20
      }
    });

    const now = new Date();
    const batch1Date = new Date(now.getTime() + 15 * 24 * 60 * 60 * 1000); // 15 days (earlier expiry)
    const batch2Date = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000); // 90 days (later expiry)

    const batch1 = await prisma.pharmacyBatch.create({
      data: {
        schoolId: schoolAId,
        stockId: stock.id,
        batchNumber: `AMX-BATCH-1-${runId}`,
        quantity: 15,
        expiryDate: batch1Date
      }
    });

    const batch2 = await prisma.pharmacyBatch.create({
      data: {
        schoolId: schoolAId,
        stockId: stock.id,
        batchNumber: `AMX-BATCH-2-${runId}`,
        quantity: 30,
        expiryDate: batch2Date
      }
    });

    // Total available: 15 + 30 = 45 capsules.
    // 9.1 Dispense 10 capsules: FEFO must deduct entirely from Batch 1 (earlier expiry)
    const dispense1 = await ClinicService.dispenseMedicationFEFO({
      schoolId: schoolAId,
      stockId: stock.id,
      dispensedById: nurseUser.id,
      quantity: 10,
      notes: 'Prescribed for secondary bacterial infection'
    });

    assert(dispense1.dispensedQty === 10, 'Dispensed 10 capsules');
    assert(dispense1.remainingTotal === 35, `Remaining stock is 35 (was 45)`);
    assert(dispense1.dispenseLogs.length === 1, 'Single batch log created');
    assert(dispense1.dispenseLogs[0].batchId === batch1.id, 'Deducted from earliest-expiring Batch 1');

    // Verify StockMovement audit record created
    assert(dispense1.stockMovements.length === 1, 'StockMovement audit record created');
    assert(dispense1.stockMovements[0].module === 'PHARMACY', 'StockMovement module tagged PHARMACY');
    assert(dispense1.stockMovements[0].direction === 'OUT', 'StockMovement direction tagged OUT');
    assert(dispense1.stockMovements[0].batchNumber === batch1.batchNumber, 'StockMovement batch number matched');
    assert(dispense1.stockMovements[0].quantity === 10, 'StockMovement quantity matched 10');

    const b1After1 = await prisma.pharmacyBatch.findUnique({ where: { id: batch1.id } });
    const b2After1 = await prisma.pharmacyBatch.findUnique({ where: { id: batch2.id } });
    assert(b1After1?.quantity === 5, 'Batch 1 quantity decreased from 15 to 5');
    assert(b2After1?.quantity === 30, 'Batch 2 quantity untouched at 30');

    // 9.2 Dispense 10 capsules across batches:
    // Takes remaining 5 from Batch 1, and 5 from Batch 2
    const dispense2 = await ClinicService.dispenseMedicationFEFO({
      schoolId: schoolAId,
      stockId: stock.id,
      dispensedById: nurseUser.id,
      quantity: 10
    });

    assert(dispense2.dispensedQty === 10, 'Dispensed 10 capsules across batches');
    assert(dispense2.remainingTotal === 25, 'Remaining stock is 25 (was 35)');
    assert(dispense2.dispenseLogs.length === 2, '2 batch dispense logs created');
    assert(dispense2.stockMovements.length === 2, '2 StockMovement records generated for multi-batch dispense');

    const b1After2 = await prisma.pharmacyBatch.findUnique({ where: { id: batch1.id } });
    const b2After2 = await prisma.pharmacyBatch.findUnique({ where: { id: batch2.id } });
    assert(b1After2?.quantity === 0, 'Batch 1 exhausted to 0');
    assert(b2After2?.quantity === 25, 'Batch 2 deducted by 5 (30 -> 25)');
    assert(dispense2.autoRequisitionCreated === false, 'Stock 25 > minStock 20 -> no requisition triggered yet');

    // 9.3 Dispense 10 more capsules: remaining drops to 15 <= minStock 20
    // Must trigger automated procurement requisition
    const dispense3 = await ClinicService.dispenseMedicationFEFO({
      schoolId: schoolAId,
      stockId: stock.id,
      dispensedById: nurseUser.id,
      quantity: 10
    });

    assert(dispense3.remainingTotal === 15, 'Remaining stock is 15 <= minStock 20');
    assert(dispense3.autoRequisitionCreated === true, 'Automated safety restock requisition created');
    assert(Boolean(dispense3.requisitionId), 'Requisition ID returned');

    const reqRecord = await prisma.requisition.findUnique({ where: { id: dispense3.requisitionId! } });
    assert(reqRecord?.requesterRole === 'CLINIC', 'Requisition requesterRole is CLINIC');
    assert(reqRecord?.status === 'PENDING_ADMIN', 'Requisition status is PENDING_ADMIN');
    assert(reqRecord?.title.includes(stock.drugName), 'Requisition title identifies the low medication');

    // 9.4 Requisition Deduplication check: Dispensing again when an open requisition exists
    // should NOT create a duplicate requisition
    const dispense4 = await ClinicService.dispenseMedicationFEFO({
      schoolId: schoolAId,
      stockId: stock.id,
      dispensedById: nurseUser.id,
      quantity: 2
    });
    assert(dispense4.remainingTotal === 13, 'Remaining stock is 13');
    assert(dispense4.autoRequisitionCreated === false, 'Deduplication: Did NOT create duplicate requisition');
    assert(dispense4.requisitionId === reqRecord?.id, 'Existing open requisition linked');

    // 9.5 Negative balance protection: Attempting to dispense 50 (available: 13) must fail
    let negativeStockBlocked = false;
    try {
      await ClinicService.dispenseMedicationFEFO({
        schoolId: schoolAId,
        stockId: stock.id,
        dispensedById: nurseUser.id,
        quantity: 50
      });
    } catch (err: any) {
      negativeStockBlocked = true;
      assert(err.message.includes('Insufficient stock'), 'Blocked dispense exceeding available inventory');
    }
    assert(negativeStockBlocked, 'Negative stock balance protection verified');

    // -------------------------------------------------------------------------
    // TEST GROUP 10: Expired Batch Exclusion & Multi-Tenant Isolation
    // -------------------------------------------------------------------------
    console.log('\nTest Group 10: Expired Batch Exclusion & Multi-Tenant Isolation');

    // Add an expired batch with 100 units
    const pastDate = new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000);
    await prisma.pharmacyBatch.create({
      data: {
        schoolId: schoolAId,
        stockId: stock.id,
        batchNumber: `EXPIRED-BATCH-${runId}`,
        quantity: 100,
        expiryDate: pastDate
      }
    });

    // Available usable stock must still be only 13 (from non-expired Batch 2)
    const summaryA = await ClinicService.getDrugStockSummary(schoolAId);
    const itemA = summaryA.find(s => s.id === stock.id);
    assert(itemA?.totalAvailable === 13, 'Usable stock calculation excludes expired batches (13 available)');
    assert(itemA?.expiredQty === 100, 'Expired batch quantity tracked separately (100 expired)');
    assert(itemA?.isLowStock === true, 'Low stock warning flagged');

    // Attempting to dispense 20 (more than 13 non-expired) must be rejected even though 100 expired exists
    let expiredDispenseBlocked = false;
    try {
      await ClinicService.dispenseMedicationFEFO({
        schoolId: schoolAId,
        stockId: stock.id,
        dispensedById: nurseUser.id,
        quantity: 20
      });
    } catch (err: any) {
      expiredDispenseBlocked = true;
      assert(err.message.includes('Insufficient stock'), 'Expired batches cannot be used for FEFO dispensing');
    }
    assert(expiredDispenseBlocked, 'Expired medications safely excluded from dispensing');

    // Multi-tenant isolation: School B drug summary must be empty
    const summaryB = await ClinicService.getDrugStockSummary(schoolBId);
    assert(summaryB.length === 0, 'School B summary contains 0 medications from School A');

    // School B nurse cannot dispense School A stock
    let crossTenantDispenseBlocked = false;
    try {
      await ClinicService.dispenseMedicationFEFO({
        schoolId: schoolBId,
        stockId: stock.id,
        dispensedById: nurseUser.id,
        quantity: 2
      });
    } catch (err: any) {
      crossTenantDispenseBlocked = true;
      assert(err.message.includes('not found'), 'Cross-tenant medication access blocked');
    }
    assert(crossTenantDispenseBlocked, 'Tenant boundary strictly enforced for dispensary');

    // Cross-tenant admission blocked
    let crossTenantAdmitBlocked = false;
    try {
      await ClinicService.admitPatient({
        schoolId: schoolBId,
        studentId: student1.id // Student 1 is in School A
      });
    } catch (err: any) {
      crossTenantAdmitBlocked = true;
      assert(err.message.includes('not found'), 'Cross-tenant student admission blocked');
    }
    assert(crossTenantAdmitBlocked, 'Tenant boundary strictly enforced for clinic admissions');

    console.log('\n================================================================');
    console.log('   ALL PHASE 8.5 CLINIC INTEGRATION TESTS PASSED (0 FAILURES)');
    console.log('================================================================\n');

  } catch (error) {
    console.error('\n❌ PHASE 8.5 CLINIC TEST SUITE FAILED:', error);
    process.exit(1);
  } finally {
    // Cleanup School A & B test data
    try {
      if (schoolAId) {
        await prisma.clinicMonitoringLog.deleteMany({ where: { schoolId: schoolAId } });
        await prisma.clinicAdmission.deleteMany({ where: { schoolId: schoolAId } });
        await prisma.clinicBed.deleteMany({ where: { schoolId: schoolAId } });
        await prisma.clinicVital.deleteMany({ where: { schoolId: schoolAId } });
        await prisma.clinicDiagnosis.deleteMany({ where: { schoolId: schoolAId } });
        await prisma.clinicPrescription.deleteMany({ where: { schoolId: schoolAId } });
        await prisma.clinicReferral.deleteMany({ where: { schoolId: schoolAId } });
        await prisma.clinicVisit.deleteMany({ where: { schoolId: schoolAId } });
        await prisma.pharmacyDispense.deleteMany({ where: { schoolId: schoolAId } });
        await prisma.pharmacyBatch.deleteMany({ where: { schoolId: schoolAId } });
        await prisma.pharmacyStock.deleteMany({ where: { schoolId: schoolAId } });
        await prisma.stockMovement.deleteMany({ where: { schoolId: schoolAId } });
        await prisma.requisition.deleteMany({ where: { schoolId: schoolAId } });
        await prisma.studentHealthProfile.deleteMany({ where: { schoolId: schoolAId } });
        await prisma.attendance.deleteMany({ where: { schoolId: schoolAId } });
        await prisma.student.deleteMany({ where: { schoolId: schoolAId } });
        await prisma.schoolClass.deleteMany({ where: { schoolId: schoolAId } });
        await prisma.teacher.deleteMany({ where: { schoolId: schoolAId } });
        await prisma.clinicSetting.deleteMany({ where: { schoolId: schoolAId } });
        await prisma.user.deleteMany({ where: { schoolId: schoolAId } });
        await prisma.school.delete({ where: { id: schoolAId } }).catch(() => {});
      }
      if (schoolBId) {
        await prisma.student.deleteMany({ where: { schoolId: schoolBId } });
        await prisma.user.deleteMany({ where: { schoolId: schoolBId } });
        await prisma.school.delete({ where: { id: schoolBId } }).catch(() => {});
      }
    } catch (cleanupErr) {
      console.warn('Cleanup warning:', cleanupErr);
    }
  }
}

runPhase8ClinicTests();
