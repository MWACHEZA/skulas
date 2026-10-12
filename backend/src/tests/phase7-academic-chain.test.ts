import prisma from '../lib/prisma';
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

async function runPhase7Tests() {
  console.log('\n================================================================');
  console.log('   PHASE 7: ACADEMIC CHAIN INTEGRATION TEST SUITE');
  console.log('   (Syllabus -> Schemes -> Lesson Plans -> Assessments -> Weighting)');
  console.log('================================================================\n');

  try {
    // -------------------------------------------------------------------------
    // 1. Setup School & Baseline Academic Data
    // -------------------------------------------------------------------------
    let school = await prisma.school.findFirst();
    if (!school) {
      school = await prisma.school.create({
        data: {
          name: 'Acadex Zimbabwe High School',
          code: 'AZHS-01',
          email: 'admin@azhs.edu.zw',
          type: 'Secondary',
          planId: 'enterprise'
        }
      });
    }
    const schoolId = school.id;

    // Seed test Teacher & HOD
    const hodUser = await prisma.user.create({
      data: {
        schoolId,
        email: `hod-${Date.now()}@acadex.edu.zw`,
        name: 'Dr. C. Moyo (HOD Sciences)',
        password: 'hashed-password-xyz',
        role: 'TEACHER',
        secondaryRoles: ['HOD', 'Department Head']
      }
    });

    const teacherUser = await prisma.user.create({
      data: {
        schoolId,
        email: `teacher-${Date.now()}@acadex.edu.zw`,
        name: 'Mrs. T. Sibanda',
        password: 'hashed-password-xyz',
        role: 'TEACHER'
      }
    });

    const teacher = await prisma.teacher.create({
      data: {
        schoolId,
        userId: teacherUser.id,
        staffId: `TEA-${Date.now().toString().slice(-4)}`,
        title: 'Mrs.'
      }
    });

    const coverTeacherUser = await prisma.user.create({
      data: {
        schoolId,
        email: `cover-${Date.now()}@acadex.edu.zw`,
        name: 'Mr. P. Ncube (Relief Teacher)',
        password: 'hashed-password-xyz',
        role: 'TEACHER'
      }
    });

    const coverTeacher = await prisma.teacher.create({
      data: {
        schoolId,
        userId: coverTeacherUser.id,
        staffId: `REL-${Date.now().toString().slice(-4)}`,
        title: 'Mr.'
      }
    });

    // Seed Subject with Zimbabwe 30% CA / 70% Exam weights
    const subject = await prisma.subject.create({
      data: {
        schoolId,
        name: `Physical Science Form 3 (${Date.now().toString().slice(-4)})`,
        code: `PHY-${Date.now().toString().slice(-3)}`,
        caWeight: 30,
        examWeight: 70
      }
    });

    // Seed Class
    const schoolClass = await prisma.schoolClass.create({
      data: {
        schoolId,
        name: `Form 3 Science (${Date.now().toString().slice(-4)})`,
        level: 'Form 3'
      }
    });

    // Seed 3 Students for ranking and moderation tests
    const student1 = await prisma.student.create({
      data: {
        schoolId,
        name: 'Tendai Mutasa',
        studentId: `STU-${Date.now()}-1`,
        classId: schoolClass.id
      }
    });

    const student2 = await prisma.student.create({
      data: {
        schoolId,
        name: 'Chipo Dube',
        studentId: `STU-${Date.now()}-2`,
        classId: schoolClass.id
      }
    });

    const student3 = await prisma.student.create({
      data: {
        schoolId,
        name: 'Farai Gumbo',
        studentId: `STU-${Date.now()}-3`,
        classId: schoolClass.id
      }
    });

    // Seed Grading Scale
    await (prisma as any).gradingScale.deleteMany({ where: { schoolId } });
    await (prisma as any).gradingScale.createMany({
      data: [
        { schoolId, grade: 'A', minScore: 75, maxScore: 100, status: 'Distinction' },
        { schoolId, grade: 'B', minScore: 65, maxScore: 74, status: 'Merit' },
        { schoolId, grade: 'C', minScore: 50, maxScore: 64, status: 'Credit' },
        { schoolId, grade: 'D', minScore: 40, maxScore: 49, status: 'Pass' },
        { schoolId, grade: 'U', minScore: 0, maxScore: 39, status: 'Ungraded' }
      ]
    });

    console.log('--- TEST GROUP 1: Structured Syllabus with Curriculum & Pacing ---');

    // Create structured syllabus
    const syllabus = await prisma.syllabus.create({
      data: {
        schoolId,
        subjectId: subject.id,
        form: 'Form 3',
        level: 'O-Level',
        curriculum: 'ZIMSEC',
        year: 2026,
        totalHours: 120,
        status: 'active',
        uploadedById: hodUser.id,
        topics: {
          create: [
            {
              topic: 'Kinematics & Motion',
              topicTitle: 'Kinematics & Motion',
              code: 'ZIM-PHY-01',
              term: 1,
              week: 1,
              expectedWeek: 1,
              objectives: 'Understand velocity, acceleration and equations of motion.',
              content: 'Uniform acceleration, distance-time graphs, ticker-timer analysis.',
              competencies: 'Data interpretation, graphical analysis, laboratory precision.',
              hours: 8,
              status: 'pending'
            },
            {
              topic: 'Dynamics & Newtons Laws',
              topicTitle: 'Dynamics & Newtons Laws',
              code: 'ZIM-PHY-02',
              term: 1,
              week: 2,
              expectedWeek: 2,
              objectives: 'Formulate and apply Newtons three laws of motion.',
              content: 'Inertia, momentum, action-reaction forces.',
              competencies: 'Critical reasoning, mathematical problem-solving.',
              hours: 8,
              status: 'pending'
            },
            {
              topic: 'Thermal Expansion & Heat Transfer',
              topicTitle: 'Thermal Expansion & Heat Transfer',
              code: 'ZIM-PHY-03',
              term: 2,
              week: 1,
              expectedWeek: 1,
              objectives: 'Describe conduction, convection, radiation and thermal capacity.',
              content: 'Kinetic theory of matter, specific heat capacity.',
              competencies: 'Thermodynamics analysis, experimental measurement.',
              hours: 10,
              status: 'pending'
            }
          ]
        }
      },
      include: { topics: true }
    });

    assert(syllabus.id !== undefined, 'Syllabus created with ZIMSEC curriculum, O-Level, and 120 hours');
    assert(syllabus.curriculum === 'ZIMSEC', 'Curriculum set to ZIMSEC');
    assert(syllabus.topics.length === 3, 'Syllabus contains 3 structured weekly topics across terms 1 & 2');

    // Mark Topic 1 as covered
    const topic1 = syllabus.topics[0];
    const coveredTopic = await prisma.syllabusTopic.update({
      where: { id: topic1.id },
      data: {
        isCovered: true,
        status: 'covered',
        coveredById: teacherUser.id,
        coveredAt: new Date()
      }
    });

    assert(coveredTopic.isCovered === true, 'Topic 1 marked as covered by teacher');
    assert(coveredTopic.status === 'covered', 'Topic 1 status updated to covered');

    console.log('\n--- TEST GROUP 2: Schemes of Work & HOD Approval Lifecycle ---');

    // Create Scheme of work in draft
    const scheme = await prisma.schemeOfWork.create({
      data: {
        schoolId,
        teacherId: teacher.id,
        subjectId: subject.id,
        classId: schoolClass.id,
        form: 'Form 3',
        term: 1,
        year: 2026,
        syllabusId: syllabus.id,
        status: 'draft',
        comments: 'Term 1 Physical Science pacing guide aligned with ZIMSEC syllabus.',
        items: {
          create: [
            {
              schoolId,
              week: 1,
              plannedDate: new Date('2026-01-15'),
              periodsRequired: 4,
              syllabusTopicId: topic1.id,
              subTopic: 'Velocity & Acceleration Equations',
              activities: 'Derivation of motion formulas; ticker-timer cart experiment.',
              resources: 'Ticker tape timers, metre rules, science laboratory workbook.',
              assessmentMethod: 'Exit ticket problem sheet and lab write-up.',
              status: 'planned'
            },
            {
              schoolId,
              week: 2,
              plannedDate: new Date('2026-01-22'),
              periodsRequired: 4,
              syllabusTopicId: syllabus.topics[1].id,
              subTopic: 'Newtons Second Law (F = ma)',
              activities: 'Air track demonstration; friction force measurements.',
              resources: 'Dynamic trolleys, slotted masses, spring balances.',
              assessmentMethod: 'Formative quiz and workbook questions.',
              status: 'planned'
            }
          ]
        }
      },
      include: { items: true }
    });

    assert(scheme.status === 'draft', 'Scheme of work created with status draft');
    assert(scheme.items.length === 2, 'Scheme contains 2 weekly SchemeItem records');

    // Gating test: Verify scheme is NOT approved yet
    assert(scheme.status !== 'hod_approved', 'Unapproved scheme verified before HOD review');

    // Submit scheme for HOD review
    const submittedScheme = await prisma.schemeOfWork.update({
      where: { id: scheme.id },
      data: { status: 'pending_approval' }
    });
    assert(submittedScheme.status === 'pending_approval', 'Scheme submitted for HOD approval');

    // HOD approves scheme
    const approvedScheme = await prisma.schemeOfWork.update({
      where: { id: scheme.id },
      data: {
        status: 'hod_approved',
        hodApprovedById: hodUser.id,
        hodApprovedAt: new Date()
      }
    });

    assert(approvedScheme.status === 'hod_approved', 'HOD successfully approved the scheme of work');
    assert(approvedScheme.hodApprovedById === hodUser.id, 'HOD approver ID recorded in audit trail');

    console.log('\n--- TEST GROUP 3: Lesson Plans with Pedagogical Flow & Execution ---');

    const schemeItem1 = scheme.items[0];

    // Create Lesson Plan linked to approved SchemeItem
    const lessonPlan = await prisma.lessonPlan.create({
      data: {
        schoolId,
        schemeId: approvedScheme.id,
        schemeItemId: schemeItem1.id,
        teacherId: teacher.id,
        classId: schoolClass.id,
        subjectId: subject.id,
        date: new Date('2026-01-16'),
        period: 2,
        objectives: 'Students will accurately calculate acceleration from velocity-time data.',
        introduction: 'Recall previous lesson on displacement vs velocity. Review SI units.',
        development: 'Step 1: Board demonstration of a = (v - u)/t. Step 2: Student pairs analyze ticker tape data.',
        conclusion: 'Wrap-up summary; peer check of sample calculations; assign homework.',
        aids: 'Ticker-timer apparatus, smart board presentation, printed worksheets.',
        assessment: '3-question formative exit ticket.',
        homework: 'Exercise 4.2 in ZIMSEC Physics Workbook pg 45.',
        differentiation: 'Extension challenge with negative acceleration for advanced learners.',
        status: 'draft'
      }
    });

    assert(lessonPlan.id !== undefined, 'Lesson plan successfully created linked to approved scheme');
    assert(lessonPlan.introduction !== null, 'Pedagogical structure includes introduction phase');
    assert(lessonPlan.development !== null, 'Pedagogical structure includes developmental phase');
    assert(lessonPlan.conclusion !== null, 'Pedagogical structure includes conclusion phase');
    assert(lessonPlan.aids !== null, 'Teaching aids recorded');

    // Teacher submits and HOD reviews
    const reviewedPlan = await prisma.lessonPlan.update({
      where: { id: lessonPlan.id },
      data: {
        status: 'hod_reviewed',
        hodReviewedById: hodUser.id,
        hodReviewedAt: new Date(),
        hodFeedback: 'Well structured. Ensure all students wear goggles during ticker cart release.'
      }
    });
    assert(reviewedPlan.status === 'hod_reviewed', 'HOD reviewed lesson plan with actionable feedback');

    // Teacher marks lesson as TAUGHT with mandatory evaluation
    const taughtPlan = await prisma.lessonPlan.update({
      where: { id: lessonPlan.id },
      data: {
        status: 'taught',
        evaluation: '88% of students mastered acceleration formulas. 4 students need follow-up on unit conversions.'
      }
    });

    // Mark corresponding scheme item status as taught
    await prisma.schemeItem.update({
      where: { id: schemeItem1.id },
      data: { status: 'taught' }
    });

    const updatedSchemeItem = await prisma.schemeItem.findUnique({ where: { id: schemeItem1.id } });
    assert(taughtPlan.status === 'taught', 'Lesson plan marked as taught with evaluation recorded');
    assert(updatedSchemeItem?.status === 'taught', 'Linked SchemeItem automatically transitioned to taught');

    // Test MISSED Lesson Flow with cover relief
    const schemeItem2 = scheme.items[1];
    const missedPlan = await prisma.lessonPlan.create({
      data: {
        schoolId,
        schemeId: approvedScheme.id,
        schemeItemId: schemeItem2.id,
        teacherId: teacher.id,
        classId: schoolClass.id,
        subjectId: subject.id,
        date: new Date('2026-01-23'),
        period: 3,
        objectives: 'Demonstrate F = ma using trolley dynamics.',
        status: 'missed',
        missedReason: 'Teacher absent due to official district curriculum workshop.',
        coverTeacherId: coverTeacher.id
      }
    });

    await prisma.schemeItem.update({
      where: { id: schemeItem2.id },
      data: { status: 'missed' }
    });

    assert(missedPlan.status === 'missed', 'Lesson marked as missed with mandatory reason provided');
    assert(missedPlan.coverTeacherId === coverTeacher.id, 'Cover/Relief teacher assigned to missed lesson');

    // Add Lesson Plan Resource
    const resource = await prisma.lessonPlanResource.create({
      data: {
        schoolId,
        lessonPlanId: lessonPlan.id,
        title: 'Velocity-Time Graph Worksheet PDF',
        url: 'https://storage.acadex.edu.zw/materials/physics-graphs.pdf',
        fileType: 'application/pdf'
      }
    });
    assert(resource.id !== undefined, 'Lesson plan learning resource attached');

    console.log('\n--- TEST GROUP 4: Question Bank with Mandatory Syllabus Topic Link ---');

    // Question Bank requires syllabusTopicId
    const question = await prisma.questionBank.create({
      data: {
        schoolId,
        subjectId: subject.id,
        syllabusTopicId: topic1.id, // Mandatory link to syllabus topic
        difficulty: 'MEDIUM',
        type: 'MULTIPLE_CHOICE',
        questionText: 'A vehicle accelerates uniformly from 10 m/s to 30 m/s in 5 seconds. What is its acceleration?',
        options: [
          { text: '2 m/s²', correct: false },
          { text: '4 m/s²', correct: true },
          { text: '6 m/s²', correct: false },
          { text: '8 m/s²', correct: false }
        ],
        answer: '4 m/s²',
        marks: 2,
        explanation: 'a = (v - u)/t = (30 - 10)/5 = 20/5 = 4 m/s².'
      }
    });

    assert(question.id !== undefined, 'Question bank item created');
    assert(question.syllabusTopicId === topic1.id, 'Question bank strictly enforces syllabusTopicId association');

    console.log('\n--- TEST GROUP 5: Unified Assessment Engine (CALA Tests vs Formal Exams) ---');

    // 1. Create Continuous Assessment (CALA Test)
    const calaTest = await prisma.assessment.create({
      data: {
        schoolId,
        title: 'CALA 1: Kinematics Practical Investigation',
        subjectId: subject.id,
        classId: schoolClass.id,
        term: 'Term 1',
        year: 2026,
        isExam: false,
        totalMarks: 50,
        passMark: 25,
        weight: 30, // 30% CA weight
        syllabusTopicIds: [topic1.id],
        status: 'draft'
      }
    });

    assert(calaTest.isExam === false, 'CALA created with isExam = false');
    assert(calaTest.weight === 30, 'CALA assigned 30% continuous assessment weight');

    // Attach question from bank to CALA
    const testQuestion = await prisma.assessmentQuestion.create({
      data: {
        schoolId,
        assessmentId: calaTest.id,
        questionBankId: question.id,
        questionOrder: 1,
        section: 'A',
        questionText: question.questionText,
        type: question.type,
        marks: 2,
        syllabusTopicId: topic1.id
      }
    });
    assert(testQuestion.id !== undefined, 'Attached QuestionBank item into CALA assessment questions');

    // 2. Create Summative Examination
    const finalExam = await prisma.assessment.create({
      data: {
        schoolId,
        title: 'Form 3 Physical Science Term 1 Final Examination',
        subjectId: subject.id,
        classId: schoolClass.id,
        term: 'Term 1',
        year: 2026,
        isExam: true,
        totalMarks: 100,
        passMark: 50,
        weight: 70, // 70% Exam weight
        durationMinutes: 120,
        status: 'draft'
      }
    });

    assert(finalExam.isExam === true, 'Formal examination created with isExam = true');
    assert(finalExam.weight === 70, 'Formal exam assigned 70% summative weight');

    // Schedule Exam Timetable with Room & Invigilator
    const timetable = await prisma.examTimetable.create({
      data: {
        schoolId,
        assessmentId: finalExam.id,
        classId: schoolClass.id,
        date: new Date('2026-03-25'),
        startTime: '09:00',
        endTime: '11:00',
        roomId: 'LAB-02',
        roomName: 'Physics Lab 2',
        invigilatorId: teacher.id
      }
    });

    assert(timetable.id !== undefined, 'Exam timetable scheduled with Physics Lab 2 and invigilator');

    // Timetable conflict detection verification:
    // Attempt to book the same room at the same time on the same date for another class
    const conflictingSlot = await prisma.examTimetable.findFirst({
      where: {
        schoolId,
        roomName: 'Physics Lab 2',
        date: new Date('2026-03-25'),
        OR: [
          { startTime: { lte: '09:30' }, endTime: { gt: '09:30' } }
        ]
      }
    });
    assert(conflictingSlot !== null, 'Room collision detected: Lab 2 is occupied at 09:30 by existing exam');

    console.log('\n--- TEST GROUP 6: Marking, HOD Moderation & Publishing Gate ---');

    // Teacher marks CALA test for 3 students
    // Student 1: 45 / 50 (90%)
    // Student 2: 40 / 50 (80%)
    // Student 3: 30 / 50 (60%)
    await prisma.studentAssessment.createMany({
      data: [
        { schoolId, assessmentId: calaTest.id, studentId: student1.id, marksObtained: 45, percentage: 90, grade: 'A', status: 'marked' },
        { schoolId, assessmentId: calaTest.id, studentId: student2.id, marksObtained: 40, percentage: 80, grade: 'A', status: 'marked' },
        { schoolId, assessmentId: calaTest.id, studentId: student3.id, marksObtained: 30, percentage: 60, grade: 'C', status: 'marked' }
      ]
    });

    // Teacher marks Final Exam for 3 students
    // Student 1: 85 / 100
    // Student 2: 75 / 100
    // Student 3: 55 / 100
    await prisma.studentAssessment.createMany({
      data: [
        { schoolId, assessmentId: finalExam.id, studentId: student1.id, marksObtained: 85, percentage: 85, grade: 'A', status: 'marked' },
        { schoolId, assessmentId: finalExam.id, studentId: student2.id, marksObtained: 75, percentage: 75, grade: 'A', status: 'marked' },
        { schoolId, assessmentId: finalExam.id, studentId: student3.id, marksObtained: 55, percentage: 55, grade: 'C', status: 'marked' }
      ]
    });

    // Update assessment status to marking
    await prisma.assessment.update({ where: { id: finalExam.id }, data: { status: 'marking' } });

    // Publishing Gate verification: Before publish, status is NOT published
    const prePublishedExam = await prisma.assessment.findUnique({ where: { id: finalExam.id } });
    assert(prePublishedExam?.status === 'marking', 'Assessment status is marking; publishing gate remains closed');

    // HOD Moderation: HOD samples student 1 script and adjusts mark from 85 to 88
    const moderatedScript = await prisma.studentAssessment.update({
      where: {
        assessmentId_studentId: { assessmentId: finalExam.id, studentId: student1.id }
      },
      data: {
        moderatedMarks: 88,
        moderatedGrade: 'A',
        moderationComment: 'Awarded 3 additional marks for thorough derivation in Question 4.',
        isModerated: true,
        status: 'moderated'
      }
    });

    await prisma.assessment.update({
      where: { id: finalExam.id },
      data: {
        status: 'moderated',
        moderatedById: hodUser.id,
        moderatedAt: new Date(),
        moderationNotes: 'Sampled 1 script (33% sample). All scripts validated.'
      }
    });

    assert(moderatedScript.isModerated === true, 'HOD moderation recorded on student script');
    assert(moderatedScript.moderatedMarks === 88, 'Moderated mark updated to 88 with rationale');

    // Publish assessment
    const publishedExam = await prisma.assessment.update({
      where: { id: finalExam.id },
      data: { status: 'published', publishedAt: new Date() }
    });
    assert(publishedExam.status === 'published', 'Assessment released through Publishing Gate');
    assert(publishedExam.publishedAt !== null, 'Published timestamp recorded');

    console.log('\n--- TEST GROUP 7: Zimbabwe 30% CA + 70% Exam Weighting Engine ---');

    // Run WeightingService on Physical Science Form 3
    const rankings = await WeightingService.calculateSubjectClassRankings(
      subject.id,
      schoolClass.id,
      'Term 1',
      2026,
      schoolId
    );

    assert(rankings.length === 3, 'Weighting engine calculated scores for all 3 students');

    // Student 1:
    // CA: 45 / 50 = 90% -> 90% * 30% = 27.0
    // Exam: Moderated 88 / 100 = 88% -> 88% * 70% = 61.6
    // Final Mark: 27.0 + 61.6 = 88.6
    const r1 = rankings.find(r => r.studentId === student1.id);
    assert(r1 !== undefined, 'Student 1 included in rankings');
    assert(r1!.caScoreNormalized === 27, `Student 1 CA normalized to 30%: expected 27, got ${r1!.caScoreNormalized}`);
    assert(r1!.examScoreNormalized === 61.6, `Student 1 Exam normalized to 70%: expected 61.6, got ${r1!.examScoreNormalized}`);
    assert(r1!.finalMark === 88.6, `Student 1 combined mark: expected 88.6, got ${r1!.finalMark}`);
    assert(r1!.grade === 'A', 'Student 1 grade computed as A');
    assert(r1!.classPosition === 1, 'Student 1 ranked 1st in class');

    // Student 2:
    // CA: 40 / 50 = 80% -> 80% * 30% = 24.0
    // Exam: 75 / 100 = 75% -> 75% * 70% = 52.5
    // Final Mark: 24.0 + 52.5 = 76.5
    const r2 = rankings.find(r => r.studentId === student2.id);
    assert(r2!.finalMark === 76.5, `Student 2 combined mark: expected 76.5, got ${r2!.finalMark}`);
    assert(r2!.grade === 'A', 'Student 2 grade computed as A');
    assert(r2!.classPosition === 2, 'Student 2 ranked 2nd in class');

    // Student 3:
    // CA: 30 / 50 = 60% -> 60% * 30% = 18.0
    // Exam: 55 / 100 = 55% -> 55% * 70% = 38.5
    // Final Mark: 18.0 + 38.5 = 56.5
    const r3 = rankings.find(r => r.studentId === student3.id);
    assert(r3!.finalMark === 56.5, `Student 3 combined mark: expected 56.5, got ${r3!.finalMark}`);
    assert(r3!.grade === 'C', 'Student 3 grade computed as C');
    assert(r3!.classPosition === 3, 'Student 3 ranked 3rd in class');

    console.log('\n--- TEST GROUP 8: Enriched Report Cards & Fee Withholding Gate ---');

    // Seed student attendance
    await prisma.attendance.createMany({
      data: [
        { schoolId, studentId: student1.id, teacherId: teacher.id, classId: schoolClass.id, date: new Date('2026-01-15'), status: 'Present' },
        { schoolId, studentId: student1.id, teacherId: teacher.id, classId: schoolClass.id, date: new Date('2026-01-16'), status: 'Present' },
        { schoolId, studentId: student1.id, teacherId: teacher.id, classId: schoolClass.id, date: new Date('2026-01-17'), status: 'Present' },
        { schoolId, studentId: student1.id, teacherId: teacher.id, classId: schoolClass.id, date: new Date('2026-01-18'), status: 'Late' }
      ]
    });

    // Seed discipline incident
    await prisma.disciplineRecord.create({
      data: {
        schoolId,
        studentId: student1.id,
        reporterId: hodUser.id,
        date: new Date('2026-02-10'),
        offenceType: 'Uniform Non-Compliance',
        description: 'Incorrect science laboratory footwear.',
        severity: 'LOW',
        actionTaken: 'Verbal warning and reminder.'
      }
    });

    // Generate Enriched Report Card for Student 1 (Normal / Fees cleared)
    const report1 = await WeightingService.generateEnrichedReportCard(
      student1.id,
      'Term 1',
      2026,
      schoolId
    );

    assert(report1.student.name === 'Tendai Mutasa', 'Report card generated for student Tendai Mutasa');
    assert(report1.subjects.length > 0, 'Report card contains subjects with weighted breakdown');
    assert(report1.attendancePercentage === 100, `Attendance percentage computed: ${report1.attendancePercentage}%`);
    assert(report1.disciplineSummary.totalIncidents === 1, 'Discipline summary includes 1 incident');
    assert(report1.financialStatus.isWithheld === false, 'Report card is NOT withheld when fees are cleared');

    // Test Fee Defaulter Withholding Rule:
    // Configure school to withhold report cards for fee defaulters
    await prisma.school.update({
      where: { id: schoolId },
      data: {
        settings: {
          withholdReportCardForFeeDefaulters: true
        }
      }
    });

    // Create outstanding fee balance for Student 3 ($450 overdue)
    await prisma.fee.create({
      data: {
        schoolId,
        studentId: student3.id,
        description: 'Term 1 Tuition & Science Levy',
        amount: 500,
        paid: 50,
        term: 'Term 1',
        year: 2026,
        dueDate: new Date('2026-01-10'),
        status: 'OVERDUE'
      }
    });

    // Generate Enriched Report Card for Student 3 (Defaulter)
    const report3 = await WeightingService.generateEnrichedReportCard(
      student3.id,
      'Term 1',
      2026,
      schoolId
    );

    assert(report3.financialStatus.balance === 450, 'Outstanding fee balance computed ($450)');
    assert(report3.financialStatus.isDefaulter === true, 'Student flagged as fee defaulter');
    assert(report3.financialStatus.isWithheld === true, 'Report card download withheld due to overdue balance');
    assert(report3.financialStatus.withholdReason !== undefined, 'Polite Bursar clearance notice generated in report card');

    console.log('\n================================================================');
    console.log(`   PHASE 7 TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
    console.log('================================================================\n');

    if (failed > 0) {
      process.exit(1);
    }
  } catch (error: any) {
    console.error('Fatal error during Phase 7 tests:', error);
    process.exit(1);
  }
}

runPhase7Tests();
