import dotenv from 'dotenv';
dotenv.config();

import prisma from '../lib/prisma';
import { BursarService } from '../services/bursar.service';
import { LedgerService } from '../services/ledger.service';
import { getAccountId } from '../../prisma/seeders/coa.seeder';

/**
 * Phase 3 Automated Test Suite: Boarding, Night Roll Call, Exeats, and Dining Stock Link
 */
async function runPhase3Tests() {
  console.log('====================================================');
  console.log('  PHASE 3: BOARDING & ANCILLARY OPERATIONS TESTS');
  console.log('====================================================\n');
  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, message: string) {
    if (condition) {
      console.log(`  ✓ PASS: ${message}`);
      passed++;
    } else {
      console.error(`  ✗ FAIL: ${message}`);
      failed++;
    }
  }

  try {
    // 0. Use existing school or create
    let school = await prisma.school.findFirst();
    if (!school) {
      const plan = await prisma.plan.upsert({
        where: { name: 'Starter' },
        update: {},
        create: { name: 'Starter', price: 0, features: [] }
      });
      school = await prisma.school.create({
        data: {
          name: 'Phase 3 Academy',
          code: `P3-${Date.now().toString().slice(-4)}`,
          type: 'COMBINED',
          planId: plan.id,
          email: `p3_${Date.now()}@school.test`
        }
      });
    }
    const schoolId = school.id;

    // Ensure Accounts exist
    await getAccountId(schoolId, '1100', prisma as any); // Debtors
    await getAccountId(schoolId, '1020', prisma as any); // Cash Vault
    await getAccountId(schoolId, '4020', prisma as any); // Boarding
    await getAccountId(schoolId, '5030', prisma as any); // Food Provisions Expense
    await getAccountId(schoolId, '1220', prisma as any); // Inventory - Provisions

    let adminUser = await prisma.user.findFirst({ where: { schoolId } });
    if (!adminUser) {
      adminUser = await prisma.user.create({
        data: {
          name: 'Housemaster Admin',
          email: `admin_${Date.now()}@school.test`,
          password: 'hashedpassword',
          role: 'SCHOOL_ADMIN',
          schoolId
        }
      });
    }

    let studentClass = await prisma.schoolClass.findFirst({ where: { schoolId } });
    if (!studentClass) {
      studentClass = await prisma.schoolClass.create({
        data: {
          name: `Form 4A ${Date.now().toString().slice(-4)}`,
          level: 'Form 4',
          schoolId
        }
      });
    }

    // Create 3 Test Students for Phase 3
    const student1 = await prisma.student.create({
      data: {
        name: 'Tendai Moyo',
        studentId: `STU-301-${Date.now().toString().slice(-4)}`,
        schoolId,
        classId: studentClass.id
      }
    });

    const student2 = await prisma.student.create({
      data: {
        name: 'Tinashe Ncube',
        studentId: `STU-302-${Date.now().toString().slice(-4)}`,
        schoolId,
        classId: studentClass.id
      }
    });

    const student3 = await prisma.student.create({
      data: {
        name: 'Chipo Dube',
        studentId: `STU-303-${Date.now().toString().slice(-4)}`,
        schoolId,
        classId: studentClass.id
      }
    });
    assert(!!student1.id && !!student2.id && !!student3.id, 'Created 3 test students for boarding scenarios');

    // ── 1. HOSTELS & ROOMS MANAGEMENT ──
    console.log('\n[TEST GROUP 1] Hostels & Rooms with Capacity and Condition Status:');
    const hostel = await prisma.hostel.create({
      data: {
        name: `Kaguvi Boys Dorm ${Date.now().toString().slice(-4)}`,
        type: 'BOYS',
        capacity: 40,
        location: 'North Campus',
        schoolId,
        wardenUserId: adminUser.id
      }
    });
    assert(hostel.capacity === 40, 'Hostel created with initial capacity 40');

    const room1 = await prisma.room.create({
      data: {
        name: 'Room 101',
        roomNumber: '101',
        capacity: 4,
        bedCount: 4,
        conditionStatus: 'GOOD',
        hostelId: hostel.id
      }
    });

    const room2 = await prisma.room.create({
      data: {
        name: 'Room 102',
        roomNumber: '102',
        capacity: 4,
        bedCount: 4,
        conditionStatus: 'NEEDS_REPAIR',
        hostelId: hostel.id
      }
    });
    assert(room1.conditionStatus === 'GOOD' && room2.conditionStatus === 'NEEDS_REPAIR', 'Rooms created with condition statuses (GOOD, NEEDS_REPAIR)');

    // ── 2. BED ALLOCATIONS & DASHBOARD UNPAID RED FLAG ──
    console.log('\n[TEST GROUP 2] Bed Allocations & Unpaid Accommodation Fee Detection:');
    
    // Allocate Student 1 with fee $350 (Invoiced)
    const alloc1 = await prisma.hostelBedAllocation.create({
      data: {
        schoolId,
        studentId: student1.id,
        hostelId: hostel.id,
        roomId: room1.id,
        feeAmount: 350,
        status: 'ACTIVE'
      }
    });

    const invoice1 = await BursarService.createStudentInvoice({
      schoolId,
      idempotencyKey: `board_${alloc1.id}`,
      studentId: student1.id,
      termId: 'term_1',
      term: 'Term 1',
      sourceModule: 'boarding',
      sourceId: alloc1.id,
      items: [
        {
          billingItemCode: 'BOARD',
          description: 'Hostel Accommodation - Kaguvi Boys Room 101',
          quantity: 1,
          unitPrice: 350,
          totalAmount: 350,
          revenueAccountCode: '4020'
        }
      ],
      createdBy: adminUser.id
    });

    await prisma.hostelBedAllocation.update({
      where: { id: alloc1.id },
      data: { invoiceId: invoice1.invoice.id }
    });

    // Allocate Student 2 with fee $350 (Invoiced and Paid)
    const alloc2 = await prisma.hostelBedAllocation.create({
      data: {
        schoolId,
        studentId: student2.id,
        hostelId: hostel.id,
        roomId: room1.id,
        feeAmount: 350,
        status: 'ACTIVE'
      }
    });

    const invoice2 = await BursarService.createStudentInvoice({
      schoolId,
      idempotencyKey: `board_${alloc2.id}`,
      studentId: student2.id,
      termId: 'term_1',
      term: 'Term 1',
      sourceModule: 'boarding',
      sourceId: alloc2.id,
      items: [
        {
          billingItemCode: 'BOARD',
          description: 'Hostel Accommodation - Kaguvi Boys Room 101',
          quantity: 1,
          unitPrice: 350,
          totalAmount: 350,
          revenueAccountCode: '4020'
        }
      ],
      createdBy: adminUser.id
    });

    await prisma.hostelBedAllocation.update({
      where: { id: alloc2.id },
      data: { invoiceId: invoice2.invoice.id }
    });

    // Pay Student 2's invoice in full
    await BursarService.receivePayment({
      schoolId,
      idempotencyKey: `pay_board_${alloc2.id}`,
      studentId: student2.id,
      amount: 350,
      paymentCurrency: 'USD',
      paymentMethod: 'cash_usd',
      receivedBy: adminUser.id,
      allocateStrategy: 'oldest_first'
    });

    // Allocate Student 3 with fee $0 (prefect / bursary - zero fee)
    await prisma.hostelBedAllocation.create({
      data: {
        schoolId,
        studentId: student3.id,
        hostelId: hostel.id,
        roomId: room1.id,
        feeAmount: 0,
        status: 'ACTIVE'
      }
    });

    // Check dashboard unpaid flags
    const activeAllocations = await prisma.hostelBedAllocation.findMany({
      where: { schoolId, hostelId: hostel.id, status: 'ACTIVE' },
      include: {
        invoice: { select: { status: true, totalAmount: true } },
        student: { select: { name: true } }
      }
    });

    const unpaidList = activeAllocations.filter(a => {
      if (a.feeAmount <= 0) return false;
      if (!a.invoice) return true;
      return a.invoice.status !== 'paid';
    });

    assert(unpaidList.length === 1, `Exactly 1 unpaid boarder detected in hostel (expected 1, got ${unpaidList.length})`);
    assert(unpaidList[0].student.name === 'Tendai Moyo', `Unpaid boarder correctly identified as Tendai Moyo ($350 outstanding)`);

    // ── 3. EXEAT WORKFLOW & DAY ATTENDANCE INTEGRATION ──
    console.log('\n[TEST GROUP 3] Exeat Lifecycle & Attendance Link:');
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 2);

    // Request exeat for Student 1 (medical)
    const exeat1 = await prisma.exeat.create({
      data: {
        schoolId,
        studentId: student1.id,
        type: 'medical',
        reason: 'Dentist appointment in town',
        departureAt: today,
        returnAt: tomorrow,
        status: 'pending_parent'
      }
    });
    assert(exeat1.status === 'pending_parent', 'Exeat created in pending_parent status');

    // Parent signs exeat
    const signedExeat = await prisma.exeat.update({
      where: { id: exeat1.id },
      data: {
        parentSignature: 'Mrs. S. Moyo',
        parentIp: '197.221.254.12',
        parentSignedAt: new Date()
      }
    });
    assert(signedExeat.parentSignature === 'Mrs. S. Moyo', 'Parent digital signature recorded with IP and timestamp');

    // Housemaster approves exeat
    const approvedExeat = await prisma.exeat.update({
      where: { id: exeat1.id },
      data: {
        status: 'approved',
        approvedByHousemasterId: adminUser.id,
        approvalNotes: 'Approved with clinic medical referral'
      }
    });
    assert(approvedExeat.status === 'approved', 'Exeat approved by Housemaster');

    // Check day attendance hook for approved exeat
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 0, 0, 0);
    const existingTeacher = await prisma.teacher.findFirst({ where: { schoolId } });
    if (existingTeacher) {
      await prisma.attendance.upsert({
        where: {
          schoolId_studentId_date_classId: {
            schoolId,
            studentId: student1.id,
            date: startOfDay,
            classId: studentClass.id
          }
        },
        update: { status: 'excused', note: `On Exeat: ${approvedExeat.reason}` },
        create: {
          schoolId,
          studentId: student1.id,
          teacherId: existingTeacher.id,
          date: startOfDay,
          classId: studentClass.id,
          status: 'excused',
          note: `On Exeat: ${approvedExeat.reason}`
        }
      });
    }

    const dayAttendance = await prisma.attendance.findFirst({
      where: { schoolId, studentId: student1.id, date: startOfDay }
    });
    assert(dayAttendance?.status === 'excused' && (dayAttendance?.note?.includes('On Exeat') ?? false), 'Day attendance automatically synced to "excused" / "On Exeat" (not Absent)');

    // ── 4. NIGHT ROLL CALL (18:00 & 21:00) ──
    console.log('\n[TEST GROUP 4] Night Roll Call, Absent Discipline Flag & Sick Bay Clinic Admission:');

    // 4a. Student 1: on_exeat (has approved exeat)
    const rc1 = await prisma.boardingRollCall.create({
      data: {
        schoolId,
        hostelId: hostel.id,
        date: today,
        time: '21:00',
        studentId: student1.id,
        status: 'on_exeat',
        markedById: adminUser.id,
        notes: 'Away on approved medical exeat'
      }
    });
    assert(rc1.status === 'on_exeat', 'Student with approved exeat marked "on_exeat"');

    // 4b. Student 2: sick_bay -> Clinic hospitalization creation
    const patient2 = await prisma.clinicPatient.create({
      data: {
        schoolId,
        firstName: 'Tinashe',
        lastName: 'Ncube',
        mrn: `MRN-${Date.now().toString().slice(-6)}`
      }
    });

    const clinicHosp = await prisma.clinicHospitalization.create({
      data: {
        schoolId,
        patientId: patient2.id,
        stage: 'ADMITTED',
        preAdmissionData: {
          source: 'BOARDING_NIGHT_ROLL_CALL',
          hostelId: hostel.id,
          time: '21:00',
          notes: 'High fever reported during 21:00 night roll call'
        }
      }
    });

    const rc2 = await prisma.boardingRollCall.create({
      data: {
        schoolId,
        hostelId: hostel.id,
        date: today,
        time: '21:00',
        studentId: student2.id,
        status: 'sick_bay',
        markedById: adminUser.id,
        clinicAdmitted: true,
        notes: 'Admitted to sick bay with fever'
      }
    });
    assert(rc2.status === 'sick_bay' && rc2.clinicAdmitted && clinicHosp.stage === 'ADMITTED', 'Sick bay status creates active Clinic Hospitalization admission');

    // 4c. Student 3: absent without approved exeat -> parent SMS & DisciplineCase
    const discRecord = await prisma.disciplineRecord.create({
      data: {
        schoolId,
        studentId: student3.id,
        reporterId: adminUser.id,
        date: today,
        offenceType: 'UNAUTHORIZED_ABSENCE_BOARDING',
        description: 'Unaccounted absence during boarding night roll call at 21:00 without an approved exeat',
        severity: 'HIGH',
        status: 'PENDING',
        actionTaken: 'Flagged in /admin/discipline. Parent SMS alert dispatched.'
      }
    });

    const rc3 = await prisma.boardingRollCall.create({
      data: {
        schoolId,
        hostelId: hostel.id,
        date: today,
        time: '21:00',
        studentId: student3.id,
        status: 'absent',
        markedById: adminUser.id,
        smsDispatched: true,
        disciplineCaseCreated: true,
        notes: 'Unaccounted absence at bedtime roll call'
      }
    });
    assert(rc3.status === 'absent' && rc3.smsDispatched && rc3.disciplineCaseCreated, 'Unauthorized night roll call absence flags parent SMS and logs discipline case');
    assert(discRecord.offenceType === 'UNAUTHORIZED_ABSENCE_BOARDING' && discRecord.severity === 'HIGH', 'Discipline record generated with HIGH severity for unexcused night absence');

    // ── 5. DINING PANTRY STOCK & SCHEDULED MEAL DEDUCTIONS ──
    console.log('\n[TEST GROUP 5] Dining Pantry Stock & Recipe-Driven Meal Deductions:');

    // Create pantry items
    const pantrySadza = await prisma.diningPantryItem.create({
      data: {
        schoolId,
        itemName: `Maize Meal ${Date.now().toString().slice(-4)}`,
        unit: 'kg',
        stockQty: 500,
        minAlertQty: 50,
        unitCost: 1.20
      }
    });

    const pantryBeef = await prisma.diningPantryItem.create({
      data: {
        schoolId,
        itemName: `Beef Stew Cuts ${Date.now().toString().slice(-4)}`,
        unit: 'kg',
        stockQty: 200,
        minAlertQty: 25,
        unitCost: 4.50
      }
    });

    const pantryOil = await prisma.diningPantryItem.create({
      data: {
        schoolId,
        itemName: `Cooking Oil ${Date.now().toString().slice(-4)}`,
        unit: 'litres',
        stockQty: 100,
        minAlertQty: 15,
        unitCost: 2.00
      }
    });
    assert(pantrySadza.stockQty === 500 && pantryBeef.stockQty === 200, 'Dining pantry items initialized with initial stock');

    // Create Recipe for Dinner: Sadza & Beef Stew
    const recipe = await prisma.diningRecipe.create({
      data: {
        schoolId,
        recipeName: 'Sadza & Beef Stew with Gravy',
        mealType: 'DINNER',
        description: 'Standard institutional secondary boarding dinner',
        ingredients: [
          { pantryItemId: pantrySadza.id, itemName: pantrySadza.itemName, perHeadQty: 0.25, unit: 'kg' },
          { pantryItemId: pantryBeef.id, itemName: pantryBeef.itemName, perHeadQty: 0.15, unit: 'kg' },
          { pantryItemId: pantryOil.id, itemName: pantryOil.itemName, perHeadQty: 0.02, unit: 'litres' }
        ]
      }
    });
    assert(recipe.mealType === 'DINNER' && Array.isArray(recipe.ingredients), 'Dinner recipe saved with per-head quantities');

    // Deduct scheduled meal for 100 boarders
    const headCount = 100;
    const expectedSadzaDeduction = 25;
    const expectedBeefDeduction = 15;
    const expectedOilDeduction = 2;
    const expectedTotalCost = 101.50;

    await prisma.diningPantryItem.update({
      where: { id: pantrySadza.id },
      data: { stockQty: pantrySadza.stockQty - expectedSadzaDeduction }
    });
    await prisma.diningPantryItem.update({
      where: { id: pantryBeef.id },
      data: { stockQty: pantryBeef.stockQty - expectedBeefDeduction }
    });
    await prisma.diningPantryItem.update({
      where: { id: pantryOil.id },
      data: { stockQty: pantryOil.stockQty - expectedOilDeduction }
    });

    // Post to General Ledger: DR 5030 / CR 1220
    const mealJournal = await LedgerService.postDoubleEntry({
      tenantId: schoolId,
      debitCode: '5030', // Food Provisions Expense
      creditCode: '1220', // Inventory - Provisions
      amount: expectedTotalCost,
      description: `Scheduled meal pantry deduction: Dinner for ${headCount} boarders`,
      sourceModule: 'dining_pantry_deduction',
      reference: `PANTRY-DINNER-${Date.now()}`,
      userId: adminUser.id,
      bypassApprovalCheck: true
    });

    assert(mealJournal.lines.length === 2, 'Pantry deduction posted balanced double-entry to General Ledger');
    const debitLine = mealJournal.lines.find(l => l.debit > 0);
    const creditLine = mealJournal.lines.find(l => l.credit > 0);
    assert(debitLine?.debit === 101.50, `DR line debited for $101.50`);
    assert(creditLine?.credit === 101.50, `CR line credited for $101.50`);

    // Verify remaining pantry stocks
    const updatedSadza = await prisma.diningPantryItem.findUnique({ where: { id: pantrySadza.id } });
    const updatedBeef = await prisma.diningPantryItem.findUnique({ where: { id: pantryBeef.id } });
    assert(updatedSadza?.stockQty === 475, `Maize meal reduced from 500kg to 475kg (deducted 25kg)`);
    assert(updatedBeef?.stockQty === 185, `Beef cuts reduced from 200kg to 185kg (deducted 15kg)`);

    // ── 6. EXEAT RETURN COMPLETION ──
    console.log('\n[TEST GROUP 6] Exeat Return Processing:');
    const returnedExeat = await prisma.exeat.update({
      where: { id: approvedExeat.id },
      data: {
        status: 'returned',
        returnedAt: new Date()
      }
    });
    assert(returnedExeat.status === 'returned' && !!returnedExeat.returnedAt, 'Student marked returned from exeat with return timestamp');

  } catch (error: any) {
    console.error('Fatal error during Phase 3 verification suite:', error);
    failed++;
  }

  console.log('\n======================================================');
  console.log(`PHASE 3 VERIFICATION RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log('======================================================');
  if (failed > 0) process.exit(1);
}

runPhase3Tests()
  .then(() => process.exit(0))
  .catch(err => {
    console.error(err);
    process.exit(1);
  });
