import prisma from '../lib/prisma';
import bcrypt from 'bcryptjs';
import { MigrationService } from '../services/migration.service';

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

async function runPhase8ClassMigrationTests() {
  console.log('\n================================================================');
  console.log('   PHASE 8.1: CLASS MIGRATION WIZARD INTEGRATION TEST SUITE');
  console.log('   (Promote / Repeat / Graduate / Fees Rollover / Boarding Reset)');
  console.log('================================================================\n');

  let schoolAId: string = '';
  let schoolBId: string = '';

  try {
    // -------------------------------------------------------------------------
    // 1. Setup Isolated Schools & Test Data
    // -------------------------------------------------------------------------
    console.log('Test Group 1: Setup Isolated Tenant Environments & Entities');

    // Clean up any stale data
    const oldSchools = await prisma.school.findMany({
      where: { name: { in: ['P8 Migration School A', 'P8 Migration School B'] } }
    });
    for (const old of oldSchools) {
      await prisma.school.delete({ where: { id: old.id } }).catch(() => {});
    }

    let plan = await prisma.plan.findFirst();
    if (!plan) {
      plan = await prisma.plan.create({
        data: { name: 'Standard Plan', price: 0, features: [] }
      });
    }

    const schoolA = await prisma.school.create({
      data: {
        name: 'P8 Migration School A',
        code: `P8-A-${Date.now().toString().slice(-4)}`,
        email: `schoola-${Date.now()}@migrationtest.com`,
        type: 'Secondary',
        planId: plan.id
      }
    });
    schoolAId = schoolA.id;

    const schoolB = await prisma.school.create({
      data: {
        name: 'P8 Migration School B',
        code: `P8-B-${Date.now().toString().slice(-4)}`,
        email: `schoolb-${Date.now()}@migrationtest.com`,
        type: 'Secondary',
        planId: plan.id
      }
    });
    schoolBId = schoolB.id;

    assert(Boolean(schoolAId && schoolBId), 'Successfully seeded test schools A and B');

    // Create Classes
    const classSource = await prisma.schoolClass.create({
      data: {
        name: 'Form 3 Green',
        level: 'Secondary',
        schoolId: schoolAId
      }
    });

    const classTarget = await prisma.schoolClass.create({
      data: {
        name: 'Form 4 Green',
        level: 'Secondary',
        schoolId: schoolAId
      }
    });

    const classRepeat = await prisma.schoolClass.create({
      data: {
        name: 'Form 3 Blue (Repeat Stream)',
        level: 'Secondary',
        schoolId: schoolAId
      }
    });

    assert(Boolean(classSource.id && classTarget.id && classRepeat.id), 'Successfully created source, target, and repeat stream classes');

    // Create Hostel and Room
    const hostel = await prisma.hostel.create({
      data: {
        name: 'Kilimanjaro House',
        type: 'BOYS',
        schoolId: schoolAId,
        capacity: 50
      }
    });

    const room = await prisma.room.create({
      data: {
        name: 'Room 101',
        roomNumber: '101',
        capacity: 4,
        hostelId: hostel.id
      }
    });

    assert(Boolean(hostel.id && room.id), 'Successfully created hostel Kilimanjaro House and Room 101');

    // -------------------------------------------------------------------------
    // 2. Create Students for Decisions
    // -------------------------------------------------------------------------
    console.log('\nTest Group 2: Student Registry Creation (Promote, Repeat, Graduate Candidates)');

    const passwordHash = await bcrypt.hash('Password@123', 10);

    // Student 1: Normal standing -> Promote
    const user1 = await prisma.user.create({
      data: {
        email: `student.promote-${Date.now()}@schoola.com`,
        name: 'Tendai Moyo',
        password: passwordHash,
        role: 'STUDENT',
        schoolId: schoolAId
      }
    });
    const student1 = await prisma.student.create({
      data: {
        studentId: 'STU-P8-001',
        name: 'Tendai Moyo',
        email: user1.email,
        userId: user1.id,
        classId: classSource.id,
        part: 3,
        status: 'Enrolled',
        standing: 'Normal',
        schoolId: schoolAId
      }
    });

    // Student 2: Repeat standing -> Repeat (with fee debt & boarding allocation)
    const user2 = await prisma.user.create({
      data: {
        email: `student.repeat-${Date.now()}@schoola.com`,
        name: 'Farai Ncube',
        password: passwordHash,
        role: 'STUDENT',
        schoolId: schoolAId
      }
    });
    const student2 = await prisma.student.create({
      data: {
        studentId: 'STU-P8-002',
        name: 'Farai Ncube',
        email: user2.email,
        userId: user2.id,
        classId: classSource.id,
        part: 3,
        status: 'Enrolled',
        standing: 'Repeat',
        hostelId: hostel.id,
        roomId: room.id,
        schoolId: schoolAId
      }
    });

    // Hostel Bed Allocation for Student 2
    const bedAlloc2 = await prisma.hostelBedAllocation.create({
      data: {
        schoolId: schoolAId,
        studentId: student2.id,
        hostelId: hostel.id,
        roomId: room.id,
        status: 'ACTIVE',
        term: 'Term 3',
        year: 2026,
        feeAmount: 300
      }
    });

    // Unpaid Fee for Student 2: $250 - $100 paid = $150 outstanding
    const fee2 = await prisma.fee.create({
      data: {
        studentId: student2.id,
        schoolId: schoolAId,
        term: '3',
        year: 2026,
        amount: 250,
        paid: 100,
        discount: 0,
        status: 'partial',
        description: 'Term 3 Tuition & Boarding 2026',
        dueDate: new Date(2026, 11, 1),
        isLedger: true
      }
    });

    // Student 3: Final candidate -> Graduate / Alumni
    const user3 = await prisma.user.create({
      data: {
        email: `student.grad-${Date.now()}@schoola.com`,
        name: 'Chipo Dube',
        password: passwordHash,
        role: 'STUDENT',
        secondaryRoles: ['STUDENT'],
        schoolId: schoolAId
      }
    });
    const student3 = await prisma.student.create({
      data: {
        studentId: 'STU-P8-003',
        name: 'Chipo Dube',
        email: user3.email,
        userId: user3.id,
        classId: classSource.id,
        part: 3,
        status: 'Enrolled',
        standing: 'Normal',
        schoolId: schoolAId
      }
    });

    const initialStudentCount = await prisma.student.count({ where: { schoolId: schoolAId } });
    assert(initialStudentCount === 3, `Initial student count is 3 (Tendai, Farai, Chipo)`);

    // -------------------------------------------------------------------------
    // 3. Test Migration Registry Enrichment (Standing, Boarding, Fees, Suggestions)
    // -------------------------------------------------------------------------
    console.log('\nTest Group 3: Class Registry Summary & Standing Heuristics');

    const summary = await MigrationService.getClassRegistrySummary(schoolAId, classSource.id);
    assert(summary.length === 3, 'Registry summary returns all 3 students in source class');

    const candidateRepeat = summary.find(s => s.id === student2.id);
    assert(candidateRepeat?.standing === 'Repeat', 'Farai Ncube has standing: Repeat');
    assert(candidateRepeat?.suggestedAction === 'REPEAT', 'Farai Ncube suggestedAction is automatically REPEAT');
    assert(candidateRepeat?.isBoarder === true, 'Farai Ncube identified as boarder');
    assert(candidateRepeat?.hostelName === 'Kilimanjaro House', 'Farai Ncube boarding hostel correctly resolved');
    assert(candidateRepeat?.outstandingBalance === 150, 'Farai Ncube outstanding fee balance correctly computed ($150)');

    const candidatePromote = summary.find(s => s.id === student1.id);
    assert(candidatePromote?.standing === 'Normal', 'Tendai Moyo has standing: Normal');
    assert(candidatePromote?.suggestedAction === 'PROMOTE', 'Tendai Moyo suggestedAction is PROMOTE');
    assert(candidatePromote?.outstandingBalance === 0, 'Tendai Moyo has 0 outstanding balance');

    // -------------------------------------------------------------------------
    // 4. Test Class Migration Wizard Execution (Promote, Repeat, Graduate)
    // -------------------------------------------------------------------------
    console.log('\nTest Group 4: Execute Migration Wizard Transaction');

    const migrationResult = await MigrationService.executeMigrationWizard({
      schoolId: schoolAId,
      migratedByEmail: 'admin@schoola.com',
      sourceClassId: classSource.id,
      targetAcademicYear: 2027,
      targetTerm: 1,
      decisions: [
        {
          studentId: student1.id,
          action: 'PROMOTE',
          targetClassId: classTarget.id,
          targetPart: 4,
          note: 'Promoted to Form 4 Green'
        },
        {
          studentId: student2.id,
          action: 'REPEAT',
          targetClassId: classRepeat.id,
          targetPart: 3,
          note: 'Retained in Form 3 repeat stream'
        },
        {
          studentId: student3.id,
          action: 'GRADUATE',
          note: 'Successfully completed O-Levels'
        }
      ],
      options: {
        carryForwardFees: true,
        resetBoardingAllocation: true,
        graduatedRoleAlumni: true
      }
    });

    assert(migrationResult.summary.total === 3, 'Summary total is 3');
    assert(migrationResult.summary.promoted === 1, 'Summary promoted count is 1');
    assert(migrationResult.summary.repeated === 1, 'Summary repeated count is 1');
    assert(migrationResult.summary.graduated === 1, 'Summary graduated count is 1');
    assert(migrationResult.summary.feesCarriedOver === 1, 'Summary feesCarriedOver is 1');
    assert(migrationResult.summary.totalAmountCarriedOver === 150, 'Summary totalAmountCarriedOver is 150');
    assert(migrationResult.summary.boardingResetCount === 1, 'Summary boardingResetCount is 1');

    // -------------------------------------------------------------------------
    // 5. Verify Promoted Student State
    // -------------------------------------------------------------------------
    console.log('\nTest Group 5: Verify Promoted Student In-Place State');

    const updatedStudent1 = await prisma.student.findUnique({ where: { id: student1.id } });
    assert(updatedStudent1?.classId === classTarget.id, 'Promoted student classId updated to Form 4 Green');
    assert(updatedStudent1?.part === 4, 'Promoted student part updated to 4');
    assert(updatedStudent1?.status === 'Enrolled', 'Promoted student status remains Enrolled');

    const history1 = updatedStudent1?.academicHistory as any;
    assert(Array.isArray(history1?.migrations), 'Promoted student has migrations array in academicHistory');
    const latest1 = history1.migrations[history1.migrations.length - 1];
    assert(latest1.action === 'PROMOTE', 'Latest migration record action is PROMOTE');
    assert(latest1.fromClassId === classSource.id, 'Latest migration fromClassId matches source class');
    assert(latest1.toClassId === classTarget.id, 'Latest migration toClassId matches target class');
    assert(latest1.academicYear === 2027, 'Latest migration academicYear is 2027');

    // -------------------------------------------------------------------------
    // 6. Verify Repeated Student State
    // -------------------------------------------------------------------------
    console.log('\nTest Group 6: Verify Repeated Student In-Place State');

    const updatedStudent2 = await prisma.student.findUnique({ where: { id: student2.id } });
    assert(updatedStudent2?.classId === classRepeat.id, 'Repeated student assigned to repeat stream class');
    assert(updatedStudent2?.part === 3, 'Repeated student part remains 3 (repeating year)');
    assert(updatedStudent2?.status === 'Enrolled', 'Repeated student status is Enrolled');
    assert(updatedStudent2?.standing === 'Repeat', 'Repeated student standing is Repeat');

    const history2 = updatedStudent2?.academicHistory as any;
    const latest2 = history2.migrations[history2.migrations.length - 1];
    assert(latest2.action === 'REPEAT', 'Latest migration record action is REPEAT');

    // -------------------------------------------------------------------------
    // 7. Verify Graduated Student & Alumni Role Conversion
    // -------------------------------------------------------------------------
    console.log('\nTest Group 7: Verify Graduated Student State & Alumni User Transition');

    const updatedStudent3 = await prisma.student.findUnique({ where: { id: student3.id } });
    assert(updatedStudent3?.classId === null, 'Graduated student classId is null (cleared from active class roster)');
    assert(updatedStudent3?.status === 'Graduated', 'Graduated student status is Graduated');

    const updatedUser3 = await prisma.user.findUnique({ where: { id: user3.id } });
    assert(updatedUser3?.role === 'ALUMNI', 'User account primary role transitioned to ALUMNI');
    assert(updatedUser3?.secondaryRoles.includes('ALUMNI') === true, 'User secondaryRoles includes ALUMNI');

    const history3 = updatedStudent3?.academicHistory as any;
    const latest3 = history3.migrations[history3.migrations.length - 1];
    assert(latest3.action === 'GRADUATE', 'Latest migration record action is GRADUATE');
    assert(latest3.toClassName === 'Graduated / Alumni', 'Latest migration toClassName is Graduated / Alumni');

    // -------------------------------------------------------------------------
    // 8. Verify Fee Balance Carry-Over (Ledger Opening Balance)
    // -------------------------------------------------------------------------
    console.log('\nTest Group 8: Verify Fee Carry-Forward & Ledger Integrity');

    const oldFee = await prisma.fee.findUnique({ where: { id: fee2.id } });
    assert(oldFee?.status === 'carried_forward', 'Previous year fee closed with status carried_forward');

    const newFee = await prisma.fee.findFirst({
      where: {
        studentId: student2.id,
        year: 2027,
        term: '1'
      }
    });
    assert(Boolean(newFee), 'New carried forward fee record created for 2027 Term 1');
    assert(newFee?.amount === 150, 'New carried forward fee amount equals outstanding balance ($150)');
    assert(newFee?.paid === 0, 'New fee initial paid amount is $0');
    assert(newFee?.status === 'unpaid', 'New fee status is unpaid');
    assert(newFee?.isLedger === true, 'New fee isLedger flag is true');
    assert(Boolean(newFee?.description && newFee.description.includes('Balance Carried Forward')), 'New fee description indicates carried forward balance');

    // -------------------------------------------------------------------------
    // 9. Verify Boarding Allocation Reset & Room Vacating
    // -------------------------------------------------------------------------
    console.log('\nTest Group 9: Verify Boarding Allocation Reset & Bed Vacating');

    assert(updatedStudent2?.hostelId === null, 'Repeated student hostelId reset to null');
    assert(updatedStudent2?.roomId === null, 'Repeated student roomId reset to null');

    const updatedBedAlloc = await prisma.hostelBedAllocation.findUnique({ where: { id: bedAlloc2.id } });
    assert(updatedBedAlloc?.status === 'VACATED', 'Bed allocation status updated to VACATED');
    assert(Boolean(updatedBedAlloc?.vacatedAt), 'Bed allocation vacatedAt timestamp recorded');
    assert(Boolean(updatedBedAlloc?.vacatedReason?.includes('Class Migration')), 'Bed allocation vacatedReason notes Class Migration');

    // -------------------------------------------------------------------------
    // 10. Verify Zero Duplicate Student Records
    // -------------------------------------------------------------------------
    console.log('\nTest Group 10: Zero Duplicate Student Records Verification');

    const finalStudentCount = await prisma.student.count({ where: { schoolId: schoolAId } });
    assert(finalStudentCount === initialStudentCount, `Student count remains exactly ${initialStudentCount} (No duplicate records inserted)`);

    // Verify student IDs did not change
    const st1 = await prisma.student.findUnique({ where: { id: student1.id } });
    const st2 = await prisma.student.findUnique({ where: { id: student2.id } });
    const st3 = await prisma.student.findUnique({ where: { id: student3.id } });
    assert(st1?.studentId === 'STU-P8-001' && st2?.studentId === 'STU-P8-002' && st3?.studentId === 'STU-P8-003', 'Student IDs preserved in-place');

    // -------------------------------------------------------------------------
    // 11. Multi-Tenant Isolation
    // -------------------------------------------------------------------------
    console.log('\nTest Group 11: Multi-Tenant Cross-School Protection');

    let isolatedRejection = false;
    try {
      await MigrationService.executeMigrationWizard({
        schoolId: schoolBId, // School B trying to migrate School A's class
        migratedByEmail: 'admin@schoolb.com',
        sourceClassId: classSource.id,
        targetAcademicYear: 2027,
        decisions: [
          {
            studentId: student1.id,
            action: 'PROMOTE',
            targetClassId: classTarget.id
          }
        ]
      });
    } catch (err: any) {
      isolatedRejection = true;
    }
    assert(isolatedRejection, 'Cross-school migration request successfully blocked by tenant isolation');

    // Cleanup
    await prisma.school.delete({ where: { id: schoolAId } }).catch(() => {});
    await prisma.school.delete({ where: { id: schoolBId } }).catch(() => {});

  } catch (error) {
    console.error('Test execution failed with unhandled error:', error);
    failed++;
  } finally {
    if (schoolAId) {
      await prisma.school.delete({ where: { id: schoolAId } }).catch(() => {});
    }
    if (schoolBId) {
      await prisma.school.delete({ where: { id: schoolBId } }).catch(() => {});
    }
  }

  console.log('\n================================================================');
  console.log(`PHASE 8.1 TEST RESULTS: ${passed} PASSED | ${failed} FAILED`);
  console.log('================================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runPhase8ClassMigrationTests();
