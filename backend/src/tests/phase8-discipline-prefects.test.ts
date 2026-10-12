import prisma from '../lib/prisma';
import bcrypt from 'bcryptjs';
import { DisciplineService } from '../services/discipline.service';
import { WeightingService } from '../services/weighting.service';

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

async function runPhase8DisciplinePrefectsTests() {
  console.log('\n================================================================');
  console.log('   PHASE 8.2: DISCIPLINE & PREFECTS INTEGRATION TEST SUITE');
  console.log('   (Merits/Demerits, Prefect HOD Gating, House Points, Suspensions)');
  console.log('================================================================\n');

  let schoolId: string = '';

  try {
    // -------------------------------------------------------------------------
    // TEST GROUP 1: Setup Isolated Environment & Entities
    // -------------------------------------------------------------------------
    console.log('Test Group 1: Setup Isolated Tenant Environment & Entities');

    // Clean up any stale data from previous runs
    const oldSchools = await prisma.school.findMany({
      where: { name: 'P8 Discipline Academy' }
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

    const school = await prisma.school.create({
      data: {
        name: 'P8 Discipline Academy',
        code: `P8-DISC-${Date.now().toString().slice(-4)}`,
        email: `discipline-${Date.now()}@test.com`,
        type: 'Secondary',
        planId: plan.id
      }
    });
    schoolId = school.id;

    const passwordHash = await bcrypt.hash('Secret123!', 6);

    // Users: Admin, HOD, Teacher, Prefect, Parent
    const adminUser = await prisma.user.create({
      data: {
        schoolId,
        email: `admin-${Date.now()}@discipline.test`,
        name: 'Headmaster Admin',
        password: passwordHash,
        role: 'SCHOOL_ADMIN',
        secondaryRoles: ['HEADMASTER']
      }
    });

    const hodUser = await prisma.user.create({
      data: {
        schoolId,
        email: `hod-${Date.now()}@discipline.test`,
        name: 'HOD Discipline Mr. Sibanda',
        password: passwordHash,
        role: 'TEACHER',
        secondaryRoles: ['HOD', 'DISCIPLINE_MASTER']
      }
    });

    const teacherUser = await prisma.user.create({
      data: {
        schoolId,
        email: `teacher-${Date.now()}@discipline.test`,
        name: 'Science Teacher Mrs. Ncube',
        password: passwordHash,
        role: 'TEACHER',
        secondaryRoles: []
      }
    });

    const prefectUser = await prisma.user.create({
      data: {
        schoolId,
        email: `prefect-${Date.now()}@discipline.test`,
        name: 'Head Prefect Tawanda',
        password: passwordHash,
        role: 'PREFECT',
        secondaryRoles: ['head_prefect']
      }
    });

    const parentUser = await prisma.user.create({
      data: {
        schoolId,
        email: `parent-${Date.now()}@discipline.test`,
        name: 'Parent Mr. Sithole',
        password: passwordHash,
        role: 'PARENT',
        secondaryRoles: []
      }
    });

    // Houses: Cheetah House & Rhino House
    const cheetahHouse = await prisma.studentHouse.create({
      data: {
        schoolId,
        name: 'Cheetah House',
        color: '#FFD700',
        points: 50
      }
    });

    const rhinoHouse = await prisma.studentHouse.create({
      data: {
        schoolId,
        name: 'Rhino House',
        color: '#4169E1',
        points: 50
      }
    });

    // Class
    const form3Class = await prisma.schoolClass.create({
      data: {
        schoolId,
        name: 'Form 3 Science',
        level: 'Form 3'
      }
    });

    // Students
    // Student 1: Cheetah House
    const student1 = await prisma.student.create({
      data: {
        schoolId,
        studentId: 'STU-DISC-01',
        name: 'Kuda Moyo',
        classId: form3Class.id,
        houseId: cheetahHouse.id,
        standing: 'Active'
      }
    });

    // Student 2: Rhino House
    const student2 = await prisma.student.create({
      data: {
        schoolId,
        studentId: 'STU-DISC-02',
        name: 'Ruvimbo Sithole',
        classId: form3Class.id,
        houseId: rhinoHouse.id,
        standing: 'Active'
      }
    });

    // Student 3: Cheetah House (Used for cumulative demerit suspension test)
    const student3 = await prisma.student.create({
      data: {
        schoolId,
        studentId: 'STU-DISC-03',
        name: 'Tinashe Chitepo',
        classId: form3Class.id,
        houseId: cheetahHouse.id,
        standing: 'Active'
      }
    });

    // Student 4: Rhino House (Used for immediate critical severity suspension test)
    const student4 = await prisma.student.create({
      data: {
        schoolId,
        studentId: 'STU-DISC-04',
        name: 'Farai Gumbo',
        classId: form3Class.id,
        houseId: rhinoHouse.id,
        standing: 'Active'
      }
    });

    assert(Boolean(schoolId && student1 && student2 && student3 && student4), 'Seeded school, staff, prefect, houses, and 4 test students');

    // -------------------------------------------------------------------------
    // TEST GROUP 2: Teacher Merit Awards & Direct House Points Addition
    // -------------------------------------------------------------------------
    console.log('\nTest Group 2: Teacher Merit Awards & Direct House Points Flow');

    const merit1 = await DisciplineService.createRecord({
      schoolId,
      studentId: student1.id,
      reporterId: teacherUser.id,
      reporterRole: 'TEACHER',
      type: 'MERIT',
      points: 10,
      offenceType: 'Academic Excellence',
      description: 'First place in inter-house science olympiad'
    });

    assert(merit1.approvalStatus === 'APPROVED', 'Teacher merit record is automatically APPROVED');
    assert(merit1.points === 10, 'Merit record recorded 10 points');

    // Verify Cheetah House gained 10 points: 50 -> 60
    const updatedCheetah = await prisma.studentHouse.findUnique({ where: { id: cheetahHouse.id } });
    assert(updatedCheetah?.points === 60, `Cheetah House points incremented to 60 (got: ${updatedCheetah?.points})`);

    // Verify student discipline summary
    const summary1 = await DisciplineService.getStudentDisciplineSummary(schoolId, student1.id);
    assert(summary1.meritPoints === 10, 'Student 1 summary shows 10 merit points');
    assert(summary1.demeritPoints === 0, 'Student 1 summary shows 0 demerit points');
    assert(summary1.netPoints === 10, 'Student 1 summary shows net +10 conduct points');

    // -------------------------------------------------------------------------
    // TEST GROUP 3: Teacher Minor Demerit & House Points Deduction
    // -------------------------------------------------------------------------
    console.log('\nTest Group 3: Teacher Minor Demerit & Direct House Points Deduction');

    const demerit1 = await DisciplineService.createRecord({
      schoolId,
      studentId: student1.id,
      reporterId: teacherUser.id,
      reporterRole: 'TEACHER',
      type: 'DEMERIT',
      points: 3,
      offenceType: 'Homework Incomplete',
      description: 'Failed to submit chemistry lab write-up on time',
      severity: 'LOW'
    });

    assert(demerit1.approvalStatus === 'APPROVED', 'Teacher demerit is automatically APPROVED');
    assert(demerit1.suspensionTriggered === false, 'Minor teacher demerit does not trigger suspension');

    // Cheetah House should decrease from 60 to 57
    const cheetahAfterDemerit = await prisma.studentHouse.findUnique({ where: { id: cheetahHouse.id } });
    assert(cheetahAfterDemerit?.points === 57, `Cheetah House points deducted by 3: 57 (got: ${cheetahAfterDemerit?.points})`);

    const summary1AfterDemerit = await DisciplineService.getStudentDisciplineSummary(schoolId, student1.id);
    assert(summary1AfterDemerit.meritPoints === 10, 'Student 1 still has 10 merits');
    assert(summary1AfterDemerit.demeritPoints === 3, 'Student 1 now has 3 demerits');
    assert(summary1AfterDemerit.netPoints === 7, 'Student 1 net points: 10 - 3 = 7');

    // -------------------------------------------------------------------------
    // TEST GROUP 4: Prefect Demerit Gating & Parent Portal Privacy
    // -------------------------------------------------------------------------
    console.log('\nTest Group 4: Prefect Demerit Gating (HOD Approval Gate) & Parent Privacy');

    // Prefect submits a demerit for Student 2 (Rhino House)
    const prefectDemerit1 = await DisciplineService.createRecord({
      schoolId,
      studentId: student2.id,
      reporterId: prefectUser.id,
      reporterRole: 'PREFECT',
      type: 'DEMERIT',
      points: 5,
      offenceType: 'Uniform Non-Compliance',
      description: 'Wearing unapproved jersey during morning assembly',
      severity: 'LOW'
    });

    assert(prefectDemerit1.approvalStatus === 'PENDING_HOD_APPROVAL', 'Prefect demerit enters with status PENDING_HOD_APPROVAL');

    // Rhino House points MUST remain unaffected at 50
    const rhinoUnchanged = await prisma.studentHouse.findUnique({ where: { id: rhinoHouse.id } });
    assert(rhinoUnchanged?.points === 50, `Rhino House points unaffected while demerit is pending (got: ${rhinoUnchanged?.points})`);

    // Parent Portal Check: Parent query MUST NOT reveal the unapproved prefect demerit
    const parentSummary = await DisciplineService.getStudentDisciplineSummary(schoolId, student2.id, true);
    assert(parentSummary.demeritPoints === 0, 'Parent portal hides pending prefect demerits (demerits: 0)');
    assert(parentSummary.records.length === 0, 'Parent portal records list contains 0 items for unapproved reports');

    // Staff / HOD view DOES see the record
    const staffSummary = await DisciplineService.getStudentDisciplineSummary(schoolId, student2.id, false);
    assert(staffSummary.records.length === 1, 'Staff summary reveals pending record');
    assert(staffSummary.records[0].approvalStatus === 'PENDING_HOD_APPROVAL', 'Staff summary marks record as pending HOD approval');

    // -------------------------------------------------------------------------
    // TEST GROUP 5: HOD Demerit Rejection
    // -------------------------------------------------------------------------
    console.log('\nTest Group 5: HOD Demerit Rejection');

    const rejectedRecord = await DisciplineService.rejectPrefectDemerit(
      schoolId,
      prefectDemerit1.id,
      hodUser.id,
      'Student provided valid medical dispensation for warm garment'
    );

    assert(rejectedRecord.approvalStatus === 'REJECTED', 'Prefect demerit status updated to REJECTED');
    assert(rejectedRecord.rejectionReason?.includes('medical dispensation') === true, 'Rejection reason recorded in record');

    // Rhino House points must STILL be 50
    const rhinoAfterRejection = await prisma.studentHouse.findUnique({ where: { id: rhinoHouse.id } });
    assert(rhinoAfterRejection?.points === 50, `Rhino House points untouched after rejection (got: ${rhinoAfterRejection?.points})`);

    // Parent portal still sees 0 demerit points
    const parentSummaryAfterReject = await DisciplineService.getStudentDisciplineSummary(schoolId, student2.id, true);
    assert(parentSummaryAfterReject.demeritPoints === 0, 'Parent portal still reflects 0 demerits after rejection');

    // -------------------------------------------------------------------------
    // TEST GROUP 6: HOD Prefect Demerit Approval & House Points Deduction
    // -------------------------------------------------------------------------
    console.log('\nTest Group 6: HOD Demerit Approval & House Points Deduction');

    // Prefect logs a valid second demerit: 4 points
    const prefectDemerit2 = await DisciplineService.createRecord({
      schoolId,
      studentId: student2.id,
      reporterId: prefectUser.id,
      reporterRole: 'PREFECT',
      type: 'DEMERIT',
      points: 4,
      offenceType: 'Disruptive Behaviour',
      description: 'Loud chatter and music during quiet library study block',
      severity: 'MEDIUM'
    });

    assert(prefectDemerit2.approvalStatus === 'PENDING_HOD_APPROVAL', 'Second prefect demerit pending HOD authorization');

    // HOD approves the demerit
    const approvedDemerit = await DisciplineService.approvePrefectDemerit(
      schoolId,
      prefectDemerit2.id,
      hodUser.id,
      'HOD'
    );

    assert(approvedDemerit.approvalStatus === 'APPROVED', 'Prefect demerit transitioned to APPROVED');
    assert(approvedDemerit.approvedBy === hodUser.id, 'Record shows approver ID');

    // Rhino House points deducted by 4: 50 -> 46
    const rhinoAfterApproval = await prisma.studentHouse.findUnique({ where: { id: rhinoHouse.id } });
    assert(rhinoAfterApproval?.points === 46, `Rhino House points deducted to 46 (got: ${rhinoAfterApproval?.points})`);

    // Parent portal now sees the approved 4 demerit points
    const parentSummaryAfterApprove = await DisciplineService.getStudentDisciplineSummary(schoolId, student2.id, true);
    assert(parentSummaryAfterApprove.demeritPoints === 4, 'Parent portal now displays approved 4 demerit points');
    assert(parentSummaryAfterApprove.records.length === 1, 'Parent portal displays 1 approved incident record');

    // Unauthorized non-HOD/Admin approval rejection check
    try {
      await DisciplineService.approvePrefectDemerit(
        schoolId,
        prefectDemerit1.id, // already rejected
        prefectUser.id,
        'PREFECT'
      );
      assert(false, 'Should not allow prefect to approve own demerit');
    } catch (err: any) {
      assert(err.message.includes('not pending') || err.message.includes('Only HODs'), 'Unauthorized or invalid approval blocked');
    }

    // -------------------------------------------------------------------------
    // TEST GROUP 7: Cumulative Demerits Suspension Trigger (>= 15 points)
    // -------------------------------------------------------------------------
    console.log('\nTest Group 7: Cumulative Demerit Suspension Trigger (>= 15 points)');

    // Student 3 starts active with 0 demerits
    const stu3Init = await prisma.student.findUnique({ where: { id: student3.id } });
    assert(stu3Init?.standing === 'Active', 'Student 3 standing is Active initially');

    // Log first approved demerit of 8 points
    await DisciplineService.createRecord({
      schoolId,
      studentId: student3.id,
      reporterId: teacherUser.id,
      reporterRole: 'TEACHER',
      type: 'DEMERIT',
      points: 8,
      offenceType: 'Truancy',
      description: 'Skipped afternoon math lessons twice',
      severity: 'MEDIUM'
    });

    const stu3Mid = await prisma.student.findUnique({ where: { id: student3.id } });
    assert(stu3Mid?.standing === 'Active', 'Student 3 remains Active at 8 demerits (< 15 threshold)');

    // Log second demerit via prefect (8 points) -> Total will reach 16 points >= 15
    const prefDemeritStu3 = await DisciplineService.createRecord({
      schoolId,
      studentId: student3.id,
      reporterId: prefectUser.id,
      reporterRole: 'PREFECT',
      type: 'DEMERIT',
      points: 8,
      offenceType: 'Disobedience',
      description: 'Refusal to follow prefect hall directives repeatedly',
      severity: 'MEDIUM'
    });

    // When HOD approves, cumulative points hit 16, which MUST trigger suspension
    const approvedStu3Demerit = await DisciplineService.approvePrefectDemerit(
      schoolId,
      prefDemeritStu3.id,
      hodUser.id,
      'HOD'
    );

    assert(approvedStu3Demerit.suspensionTriggered === true, 'Suspension triggered when cumulative demerits hit 16 (>= 15)');
    assert(approvedStu3Demerit.suspensionDays === 5, '5-day suspension assigned for cumulative threshold breach');

    const stu3After = await prisma.student.findUnique({ where: { id: student3.id } });
    assert(stu3After?.standing === 'Suspended', 'Student 3 standing automatically set to Suspended in DB');

    const stu3Summary = await DisciplineService.getStudentDisciplineSummary(schoolId, student3.id);
    assert(stu3Summary.isSuspended === true, 'Discipline summary reports isSuspended: true');
    assert(stu3Summary.demeritPoints === 16, `Total cumulative demerits reported as 16 (got: ${stu3Summary.demeritPoints})`);

    // -------------------------------------------------------------------------
    // TEST GROUP 8: Immediate Critical Severity Suspension Trigger
    // -------------------------------------------------------------------------
    console.log('\nTest Group 8: Immediate Critical Severity Suspension Trigger');

    const critDemerit = await DisciplineService.createRecord({
      schoolId,
      studentId: student4.id,
      reporterId: teacherUser.id,
      reporterRole: 'TEACHER',
      type: 'DEMERIT',
      points: 10,
      offenceType: 'Major Vandalism',
      description: 'Deliberate destruction of digital projector in physics laboratory',
      severity: 'CRITICAL'
    });

    assert(critDemerit.suspensionTriggered === true, 'Immediate suspension triggered for CRITICAL infraction');
    assert(critDemerit.suspensionDays === 7, '7-day suspension assigned for CRITICAL infraction');

    const stu4After = await prisma.student.findUnique({ where: { id: student4.id } });
    assert(stu4After?.standing === 'Suspended', 'Student 4 standing immediately updated to Suspended');

    // -------------------------------------------------------------------------
    // TEST GROUP 9: House Points Leaderboard Ranking
    // -------------------------------------------------------------------------
    console.log('\nTest Group 9: House Points Leaderboard Ranking');

    // Current points:
    // Cheetah House: started 50 + 10 (merit) - 3 (demerit) - 8 (stu3) = 49
    // Rhino House: started 50 - 4 (approved prefect demerit) - 10 (crit demerit) = 36
    const leaderboard = await DisciplineService.getHousePointsLeaderboard(schoolId);
    assert(leaderboard.length === 2, 'Leaderboard returned 2 houses');
    assert(leaderboard[0].name === 'Cheetah House', 'Cheetah House ranked #1');
    assert(leaderboard[0].rank === 1, 'Rank #1 assigned to leader');
    assert(leaderboard[0].points > leaderboard[1].points, `Cheetah points (${leaderboard[0].points}) > Rhino points (${leaderboard[1].points})`);
    assert(leaderboard[1].name === 'Rhino House', 'Rhino House ranked #2');

    // -------------------------------------------------------------------------
    // TEST GROUP 10: Enriched Report Card Discipline Integration
    // -------------------------------------------------------------------------
    console.log('\nTest Group 10: Enriched Report Card Discipline Integration');

    // Seed dummy term & subject assessment data to run report card
    const subject = await prisma.subject.create({
      data: {
        schoolId,
        name: 'Physical Science',
        code: `SCI-${Date.now().toString().slice(-4)}`
      }
    });

    const assessment = await prisma.assessment.create({
      data: {
        schoolId,
        classId: form3Class.id,
        subjectId: subject.id,
        createdById: teacherUser.id,
        title: 'Mid Term Test',
        term: 'Term 1',
        year: 2026,
        isExam: false,
        weight: 100,
        totalMarks: 100,
        status: 'published'
      }
    });

    await prisma.studentAssessment.create({
      data: {
        schoolId,
        assessmentId: assessment.id,
        studentId: student1.id,
        marksObtained: 85,
        percentage: 85,
        grade: 'A',
        status: 'marked'
      }
    });

    // Generate Enriched Report Card for Student 1
    const reportCard = await WeightingService.generateEnrichedReportCard(
      student1.id,
      'Term 1',
      2026,
      schoolId
    );

    assert(reportCard.disciplineSummary !== undefined, 'Report card contains disciplineSummary object');
    assert(reportCard.disciplineSummary.meritPoints === 10, 'Report card displays 10 merit points');
    assert(reportCard.disciplineSummary.demeritPoints === 3, 'Report card displays 3 demerit points');
    assert(reportCard.disciplineSummary.netPoints === 7, 'Report card displays net 7 conduct points');
    assert(reportCard.disciplineSummary.isSuspended === false, 'Student 1 is NOT suspended');
    assert(reportCard.disciplineSummary.totalIncidents === 2, 'Report card records 2 approved incidents (1 merit + 1 demerit)');

    // Also verify report card for Student 3 (who is suspended)
    await prisma.studentAssessment.create({
      data: {
        schoolId,
        assessmentId: assessment.id,
        studentId: student3.id,
        marksObtained: 60,
        percentage: 60,
        grade: 'C',
        status: 'marked'
      }
    });

    const reportCardStu3 = await WeightingService.generateEnrichedReportCard(
      student3.id,
      'Term 1',
      2026,
      schoolId
    );

    assert(reportCardStu3.disciplineSummary.isSuspended === true, 'Suspended status flagged on Student 3 report card');
    assert(reportCardStu3.disciplineSummary.demeritPoints === 16, 'Student 3 report card displays 16 demerit points');

  } catch (error: any) {
    console.error('Test suite encountered an error:', error);
    failed++;
  } finally {
    // Teardown
    if (schoolId) {
      await prisma.school.delete({ where: { id: schoolId } }).catch(() => {});
    }
  }

  console.log('\n================================================================');
  console.log(`   PHASE 8.2 TEST SUMMARY: Passed: ${passed} | Failed: ${failed}`);
  console.log('================================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runPhase8DisciplinePrefectsTests().catch(err => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
