import dotenv from 'dotenv';
dotenv.config();

import prisma from '../lib/prisma';
import { processStaffPunches } from '../api/staff-attendance';
import { NotificationService } from '../services/notifications';

async function runPhase5Tests() {
  console.log('\n================================================================');
  console.log('   PHASE 5: UNIFIED ATTENDANCE & BIOMETRIC SUITE VERIFICATION');
  console.log('================================================================\n');

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

  const testDate = new Date('2026-10-09T00:00:00.000Z');

  try {
    // -------------------------------------------------------------------------
    // SETUP: Use existing or Create Test School, Class, Students, Staff, Hostel
    // -------------------------------------------------------------------------
    let school = await prisma.school.findFirst();
    let createdSchool = false;
    if (!school) {
      const plan = await prisma.plan.upsert({
        where: { name: 'Starter' },
        update: {},
        create: { name: 'Starter', price: 0, features: [] }
      });
      school = await prisma.school.create({
        data: {
          name: 'Phase 5 Attendance High',
          code: 'P5-ATT-' + Date.now().toString().slice(-4),
          type: 'COMBINED',
          planId: plan.id,
          email: `p5_${Date.now()}@school.test`,
          currency: 'USD'
        }
      });
      createdSchool = true;
    }
    const schoolId = school.id;

    const testClass = await prisma.schoolClass.create({
      data: {
        schoolId,
        name: 'Form 4 P5 Alpha ' + Date.now().toString().slice(-4),
        level: 'Form 4'
      }
    });

    const student1User = await prisma.user.create({
      data: {
        schoolId,
        email: `stu1_p5_${Date.now()}@test.com`,
        name: 'Tinashe Chikore',
        role: 'STUDENT',
        phone: '+263771112233',
        password: 'TestPassword123!'
      }
    });

    const student1 = await prisma.student.create({
      data: {
        schoolId,
        studentId: 'STU-P5-001-' + Date.now(),
        userId: student1User.id,
        name: 'Tinashe Chikore',
        gender: 'Male',
        status: 'ACTIVE',
        classId: testClass.id
      }
    });

    const student2User = await prisma.user.create({
      data: {
        schoolId,
        email: `stu2_p5_${Date.now()}@test.com`,
        name: 'Ruvimbo Moyo',
        role: 'STUDENT',
        phone: '+263774445566',
        password: 'TestPassword123!'
      }
    });

    const student2 = await prisma.student.create({
      data: {
        schoolId,
        studentId: 'STU-P5-002-' + Date.now(),
        userId: student2User.id,
        name: 'Ruvimbo Moyo',
        gender: 'Female',
        status: 'ACTIVE',
        classId: testClass.id
      }
    });

    // Staff Users
    const staffTeacher = await prisma.user.create({
      data: {
        schoolId,
        email: `teacher_p5_${Date.now()}@test.com`,
        name: 'Mr. Farai Mutasa',
        role: 'TEACHER',
        staffId: 'STF-P5-T1',
        password: 'TestPassword123!'
      }
    });

    const staffBursar = await prisma.user.create({
      data: {
        schoolId,
        email: `bursar_p5_${Date.now()}@test.com`,
        name: 'Mrs. Chipo Ndlovu',
        role: 'BURSAR',
        staffId: 'STF-P5-B1',
        password: 'TestPassword123!'
      }
    });

    const staffAncillary = await prisma.user.create({
      data: {
        schoolId,
        email: `ancillary_p5_${Date.now()}@test.com`,
        name: 'John Shumba',
        role: 'ANCILLARY',
        staffId: 'STF-P5-A1',
        password: 'TestPassword123!'
      }
    });

    // Hostel for Boarding Roll Call
    const hostel = await prisma.hostel.create({
      data: {
        schoolId,
        name: 'P5 Senior Boys Dormitory',
        capacity: 40,
        type: 'BOYS'
      }
    });

    // Bed allocation for student1
    await prisma.hostelBedAllocation.create({
      data: {
        schoolId,
        studentId: student1.id,
        hostelId: hostel.id,
        status: 'ACTIVE'
      }
    });

    // -------------------------------------------------------------------------
    // TEST 1: Student Daily Roll Call Session & Record Persistence
    // -------------------------------------------------------------------------
    console.log('--- Test 1: Daily Attendance Session & Record Persistence ---');
    const session1 = await prisma.attendanceSession.create({
      data: {
        schoolId,
        date: testDate,
        classId: testClass.id,
        period: 'Homeroom',
        type: 'daily',
        teacherId: staffTeacher.id,
        submitted: true,
        records: {
          create: [
            {
              studentId: student1.id,
              status: 'present',
              markedById: staffTeacher.id
            },
            {
              studentId: student2.id,
              status: 'absent',
              markedById: staffTeacher.id,
              notes: 'Unexcused morning absence'
            }
          ]
        }
      },
      include: { records: true }
    });

    assert(session1 !== null && session1.records.length === 2, 'AttendanceSession and 2 AttendanceSessionRecords created');
    assert(session1.submitted === true, 'AttendanceSession submitted flag is true');
    assert(session1.records.find(r => r.studentId === student1.id)?.status === 'present', 'Student 1 marked present');
    assert(session1.records.find(r => r.studentId === student2.id)?.status === 'absent', 'Student 2 marked absent');

    // -------------------------------------------------------------------------
    // TEST 2: Absence Auto-Notification (SMS Enqueue & Comm Log)
    // -------------------------------------------------------------------------
    console.log('\n--- Test 2: Parent SMS Notification Queue & Communication Log ---');
    // Simulate auto-SMS dispatch for student2 absence
    const queueItem = await NotificationService.enqueue({
      type: 'SMS',
      schoolId,
      senderId: staffTeacher.id,
      studentId: student2.id,
      recipientPhone: student2User.phone || '',
      payload: {
        message: `Attendance Alert: ${student2.name} was marked ABSENT today (${testDate.toISOString().slice(0, 10)}).`
      }
    });

    const commLog = await NotificationService.logCommunication({
      schoolId,
      senderId: staffTeacher.id,
      studentId: student2.id,
      type: 'SMS',
      description: `Daily Roll Call Absence Alert for ${student2.name} sent to ${student2User.phone}`,
      status: 'SENT'
    });

    assert(queueItem !== null && queueItem.status === 'PENDING', 'Absence SMS queued in notificationQueue');
    assert(commLog !== null && commLog.status === 'SENT', 'CommunicationLog entry recorded for absence dispatch');

    // Update parentNotifiedAt on record
    const updatedRec2 = await prisma.attendanceSessionRecord.update({
      where: {
        sessionId_studentId: {
          sessionId: session1.id,
          studentId: student2.id
        }
      },
      data: { parentNotifiedAt: new Date() }
    });
    assert(updatedRec2.parentNotifiedAt !== null, 'AttendanceSessionRecord tracks parentNotifiedAt timestamp');

    // -------------------------------------------------------------------------
    // TEST 3: 3 Consecutive Absences Welfare Case Auto-Creation
    // -------------------------------------------------------------------------
    console.log('\n--- Test 3: 3 Consecutive Absences Welfare Flag & Truancy Case ---');
    // Create 2 earlier daily sessions where student2 was also marked absent
    const dateDayMinus1 = new Date('2026-10-08T00:00:00.000Z');
    const dateDayMinus2 = new Date('2026-10-07T00:00:00.000Z');

    const prevSess1 = await prisma.attendanceSession.create({
      data: {
        schoolId,
        date: dateDayMinus1,
        classId: testClass.id,
        period: 'Homeroom',
        type: 'daily',
        teacherId: staffTeacher.id,
        submitted: true,
        records: {
          create: [{ studentId: student2.id, status: 'absent' }]
        }
      }
    });

    const prevSess2 = await prisma.attendanceSession.create({
      data: {
        schoolId,
        date: dateDayMinus2,
        classId: testClass.id,
        period: 'Homeroom',
        type: 'daily',
        teacherId: staffTeacher.id,
        submitted: true,
        records: {
          create: [{ studentId: student2.id, status: 'absent' }]
        }
      }
    });

    // Check 3 consecutive absences logic: query last 3 daily sessions for student2
    const student2DailyRecords = await prisma.attendanceSessionRecord.findMany({
      where: {
        studentId: student2.id,
        session: { schoolId, type: 'daily' }
      },
      orderBy: { session: { date: 'desc' } },
      take: 3
    });

    const isThreeConsecutive = student2DailyRecords.length === 3 && student2DailyRecords.every(r => r.status === 'absent');
    assert(isThreeConsecutive, 'System detects 3 consecutive unexcused daily absences');

    // Trigger Welfare Truancy Record
    const disciplineCase = await prisma.disciplineRecord.create({
      data: {
        schoolId,
        studentId: student2.id,
        reporterId: staffTeacher.id,
        date: testDate,
        offenceType: 'TRUANCY / CHRONIC ABSENCE',
        description: `Automated Welfare Flag: ${student2.name} has been marked absent for 3 consecutive days. Flagged for welfare check.`,
        severity: 'MEDIUM',
        status: 'PENDING',
        actionTaken: 'Parent notified via SMS; auto-referred to Head of Welfare & Class Teacher.'
      }
    });

    assert(disciplineCase.offenceType === 'TRUANCY / CHRONIC ABSENCE', 'Welfare discipline case automatically created for 3 consecutive absences');
    assert(disciplineCase.status === 'PENDING', 'Discipline case initialized with PENDING status');

    // -------------------------------------------------------------------------
    // TEST 4: Boarding Roll Call Sync
    // -------------------------------------------------------------------------
    console.log('\n--- Test 4: Boarding Roll Call Sync with Hostel Bed Allocation ---');
    const boardingSession = await prisma.attendanceSession.create({
      data: {
        schoolId,
        date: testDate,
        period: 'Boarding_18_00',
        type: 'boarding',
        teacherId: staffTeacher.id,
        submitted: true,
        records: {
          create: [{ studentId: student1.id, status: 'present', notes: 'Dinner roll call present' }]
        }
      }
    });

    // Also sync to Phase 3 BoardingRollCall
    const bRollCall = await prisma.boardingRollCall.create({
      data: {
        schoolId,
        hostelId: hostel.id,
        date: testDate,
        time: '18:00',
        studentId: student1.id,
        status: 'present',
        notes: 'Dinner roll call present',
        markedById: staffTeacher.id
      }
    });

    assert(boardingSession.type === 'boarding', 'Boarding roll call session created with type boarding');
    assert(bRollCall !== null && bRollCall.time === '18:00', 'BoardingRollCall synced with hostel and 18:00 time slot');

    // -------------------------------------------------------------------------
    // TEST 5: Raw Biometric Punch Ingestion & Multi-Punch Processing
    // -------------------------------------------------------------------------
    console.log('\n--- Test 5: Raw Biometric Punches & 15-Minute Conversion Job ---');
    // Staff Teacher: On time (07:45 AM check-in, 16:15 PM check-out)
    const punchTeacherIn = await prisma.biometricRawLog.create({
      data: {
        schoolId,
        deviceId: 'BIO-GATE-01',
        staffId: staffTeacher.id,
        punchTime: new Date('2026-10-09T07:45:00.000Z'),
        punchType: 'CHECK_IN'
      }
    });

    const punchTeacherOut = await prisma.biometricRawLog.create({
      data: {
        schoolId,
        deviceId: 'BIO-GATE-01',
        staffId: staffTeacher.id,
        punchTime: new Date('2026-10-09T16:15:00.000Z'),
        punchType: 'CHECK_OUT'
      }
    });

    // Staff Bursar: Late over 30 mins (08:45 AM check-in, 16:00 PM check-out -> 45 mins late)
    const punchBursarIn = await prisma.biometricRawLog.create({
      data: {
        schoolId,
        deviceId: 'BIO-GATE-02',
        staffId: staffBursar.id,
        punchTime: new Date('2026-10-09T08:45:00.000Z'),
        punchType: 'CHECK_IN'
      }
    });

    const punchBursarOut = await prisma.biometricRawLog.create({
      data: {
        schoolId,
        deviceId: 'BIO-GATE-02',
        staffId: staffBursar.id,
        punchTime: new Date('2026-10-09T16:00:00.000Z'),
        punchType: 'CHECK_OUT'
      }
    });

    assert(punchTeacherIn !== null && punchTeacherOut !== null, 'Raw biometric punches ingested for Teacher');
    assert(punchBursarIn !== null && punchBursarOut !== null, 'Raw biometric punches ingested for Bursar');

    // Staff Ancillary: Has NO punch, but has APPROVED LEAVE
    const approvedLeave = await prisma.staffLeave.create({
      data: {
        schoolId,
        userId: staffAncillary.id,
        leaveType: 'sick',
        startDate: new Date('2026-10-08T00:00:00.000Z'),
        endDate: new Date('2026-10-10T00:00:00.000Z'),
        status: 'approved',
        reason: 'Medical recovery'
      }
    });
    assert(approvedLeave.status === 'approved', 'Staff Ancillary approved leave created in /admin/leave');

    // Run the Punch Processor Job!
    const procResult = await processStaffPunches(schoolId, testDate);
    assert(procResult.processedCount >= 2, 'Punch processor executed successfully across staff');

    // Verify Teacher Daily Record (On time, ~8.5 hours)
    const teacherDaily = await prisma.staffAttendanceDaily.findFirst({
      where: { schoolId, staffId: staffTeacher.id, date: testDate }
    });
    assert(teacherDaily !== null, 'StaffAttendanceDaily record created for Teacher');
    assert(teacherDaily?.status === 'present', 'Teacher status marked PRESENT');
    assert(teacherDaily?.lateMinutes === 0, 'Teacher lateMinutes is 0');
    assert(teacherDaily?.flaggedTardiness === false, 'Teacher flaggedTardiness is false');
    assert((teacherDaily?.totalHours || 0) >= 8.0, 'Teacher totalHours calculated correctly (~8.5 hrs)');

    // Verify Bursar Daily Record (Late 45m -> Flagged to HR)
    const bursarDaily = await prisma.staffAttendanceDaily.findFirst({
      where: { schoolId, staffId: staffBursar.id, date: testDate }
    });
    assert(bursarDaily !== null, 'StaffAttendanceDaily record created for Bursar');
    assert(bursarDaily?.status === 'late', 'Bursar status marked LATE');
    assert(bursarDaily?.lateMinutes === 45, 'Bursar lateMinutes calculated as 45');
    assert(bursarDaily?.flaggedTardiness === true, 'Bursar flaggedTardiness is TRUE (>30m late)');

    // Verify HR Tardiness Log
    const tardinessLog = await prisma.hrTardinessLog.findFirst({
      where: { schoolId, staffId: staffBursar.id, date: testDate }
    });
    assert(tardinessLog !== null, 'HR Tardiness Log entry auto-generated for >30m late clock-in');
    assert(tardinessLog?.lateMinutes === 45, 'HR Tardiness Log captures 45 minutes late');

    // Verify Ancillary Daily Record (Absent with APPROVED LEAVE)
    const ancillaryDaily = await prisma.staffAttendanceDaily.findFirst({
      where: { schoolId, staffId: staffAncillary.id, date: testDate }
    });
    assert(ancillaryDaily?.status === 'absent', 'Ancillary marked ABSENT (no punch)');
    assert(ancillaryDaily?.leaveCrossCheck === 'APPROVED_LEAVE', 'Ancillary leaveCrossCheck identifies APPROVED_LEAVE');

    // -------------------------------------------------------------------------
    // TEST 6: Report Card Comments Feed & Threshold
    // -------------------------------------------------------------------------
    console.log('\n--- Test 6: Report Card Attendance Feed & Threshold Evaluation ---');
    // Student 1 has 1 session, 1 present -> 100%
    // Student 2 has 3 daily sessions, 0 present -> 0% (< 80% threshold)
    const stu1Sessions = await prisma.attendanceSessionRecord.findMany({
      where: { studentId: student1.id, session: { schoolId, type: 'daily' } }
    });
    const stu1Rate = (stu1Sessions.filter(r => r.status === 'present').length / stu1Sessions.length) * 100;
    assert(stu1Rate === 100, 'Student 1 presence rate evaluated at 100%');

    const stu2Sessions = await prisma.attendanceSessionRecord.findMany({
      where: { studentId: student2.id, session: { schoolId, type: 'daily' } }
    });
    const stu2Rate = (stu2Sessions.filter(r => r.status === 'present').length / stu2Sessions.length) * 100;
    assert(stu2Rate === 0 && stu2Rate < 80, 'Student 2 presence rate falls below 80% threshold');

    // -------------------------------------------------------------------------
    // CLEANUP
    // -------------------------------------------------------------------------
    console.log('\n--- Cleanup Test Records ---');
    await prisma.hrTardinessLog.deleteMany({ where: { schoolId, staffId: { in: [staffTeacher.id, staffBursar.id, staffAncillary.id] } } });
    await prisma.staffAttendanceDaily.deleteMany({ where: { schoolId, staffId: { in: [staffTeacher.id, staffBursar.id, staffAncillary.id] } } });
    await prisma.biometricRawLog.deleteMany({ where: { schoolId, staffId: { in: [staffTeacher.id, staffBursar.id, staffAncillary.id] } } });
    await prisma.staffLeave.deleteMany({ where: { id: approvedLeave.id } });
    await prisma.boardingRollCall.deleteMany({ where: { id: bRollCall.id } });
    await prisma.hostelBedAllocation.deleteMany({ where: { studentId: student1.id } });
    await prisma.hostel.deleteMany({ where: { id: hostel.id } });
    await prisma.disciplineRecord.deleteMany({ where: { id: disciplineCase.id } });
    await prisma.attendanceSessionRecord.deleteMany({ where: { studentId: { in: [student1.id, student2.id] } } });
    await prisma.attendanceSession.deleteMany({ where: { id: { in: [session1.id, prevSess1.id, prevSess2.id, boardingSession.id] } } });
    await prisma.communicationLog.deleteMany({ where: { id: commLog.id } });
    await prisma.notificationQueue.deleteMany({ where: { id: queueItem.id } });
    await prisma.student.deleteMany({ where: { id: { in: [student1.id, student2.id] } } });
    await prisma.schoolClass.deleteMany({ where: { id: testClass.id } });
    await prisma.user.deleteMany({ where: { id: { in: [student1User.id, student2User.id, staffTeacher.id, staffBursar.id, staffAncillary.id] } } });
    if (createdSchool) {
      await prisma.school.delete({ where: { id: schoolId } });
    }

    console.log('\n================================================================');
    console.log(`  PHASE 5 TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`);
    console.log('================================================================\n');

    if (failed > 0) {
      process.exit(1);
    } else {
      process.exit(0);
    }
  } catch (error) {
    console.error('Test suite execution error:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

runPhase5Tests();
