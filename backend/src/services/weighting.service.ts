import prisma from '../lib/prisma';
import { DisciplineService } from './discipline.service';

export interface SubjectAssessmentSummary {
  subjectId: string;
  subjectName: string;
  subjectCode?: string;
  caWeight: number; // e.g. 30%
  examWeight: number; // e.g. 70%
  caMarks: Array<{
    assessmentId: string;
    title: string;
    marksObtained: number;
    totalMarks: number;
    percentage: number;
    weight: number;
    isModerated: boolean;
  }>;
  caScoreNormalized: number; // normalized to caWeight (e.g. 24 / 30)
  examMark: number | null; // e.g. 56 / 70
  examScoreNormalized: number; // normalized to examWeight
  finalMark: number; // out of 100
  grade: string;
  classPosition: number;
  totalStudentsInClass: number;
  teacherComment?: string;
}

export interface StudentReportCardData {
  student: {
    id: string;
    name: string;
    studentId: string;
    className: string;
    classLevel: string;
  };
  term: string;
  year: number;
  subjects: SubjectAssessmentSummary[];
  overallAverage: number;
  overallClassPosition: number;
  attendancePercentage: number;
  attendanceStats: {
    present: number;
    absent: number;
    late: number;
    totalDays: number;
  };
  disciplineSummary: {
    totalIncidents: number;
    meritPoints?: number;
    demeritPoints?: number;
    netPoints?: number;
    isSuspended?: boolean;
    suspensionDetails?: {
      days: number | null;
      startDate: Date | null;
      endDate: Date | null;
      reason: string;
    } | null;
    records: Array<{
      offenceType: string;
      type?: string;
      points?: number;
      severity: string;
      date: string;
      actionTaken?: string;
    }>;
  };
  financialStatus: {
    totalFee: number;
    totalPaid: number;
    balance: number;
    isDefaulter: boolean;
    isWithheld: boolean;
    withholdReason?: string;
  };
}

export class WeightingService {
  /**
   * Determine grade from score using School's GradingScale or Zimbabwe/Cambridge fallback
   */
  static getGradeFromScore(score: number, scales: Array<{ grade: string; minScore: number; maxScore: number }>): string {
    if (scales && scales.length > 0) {
      for (const scale of scales) {
        if (score >= scale.minScore && score <= scale.maxScore) {
          return scale.grade;
        }
      }
    }
    // Default Cambridge / ZIMSEC scale fallback
    if (score >= 75) return 'A';
    if (score >= 65) return 'B';
    if (score >= 50) return 'C';
    if (score >= 40) return 'D';
    return 'U';
  }

  /**
   * Calculate Zimbabwe CA (30%) + Summative Exam (70%) weighted marks for a class & subject
   */
  static async calculateSubjectClassRankings(
    subjectId: string,
    classId: string,
    term: string,
    year: number,
    schoolId: string
  ) {
    // 1. Fetch Subject configuration (caWeight, examWeight)
    const subject = await prisma.subject.findFirst({
      where: { id: subjectId, schoolId }
    });

    if (!subject) throw new Error('Subject not found');

    const caWeight = subject.caWeight !== undefined ? subject.caWeight : 30;
    const examWeight = subject.examWeight !== undefined ? subject.examWeight : 70;

    // 2. Fetch Grading Scale
    const gradingScales = await (prisma as any).gradingScale.findMany({
      where: { schoolId },
      orderBy: { maxScore: 'desc' }
    });

    // 3. Fetch Students in class
    const students = await prisma.student.findMany({
      where: { classId, schoolId },
      orderBy: { name: 'asc' }
    });

    // 4. Fetch all Assessments for this subject, class, term, year
    const assessments = await prisma.assessment.findMany({
      where: {
        schoolId,
        subjectId,
        term,
        year,
        OR: [
          { classId },
          { classId: null } // Subject-wide assessments
        ]
      },
      include: {
        studentAssessments: true,
        assessmentType: true
      }
    });

    // Separate into Continuous Assessment (CA) vs Summative Examinations
    const caAssessments = assessments.filter(a => !a.isExam && (!a.assessmentType || a.assessmentType.category !== 'EXAM'));
    const examAssessments = assessments.filter(a => a.isExam || (a.assessmentType && a.assessmentType.category === 'EXAM'));

    // 5. Compute each student's weighted CA and Exam marks
    const studentResults = students.map(student => {
      // CA Tasks calculation
      const caItems: any[] = [];
      let totalCaPossible = 0;
      let totalCaObtained = 0;

      for (const ca of caAssessments) {
        const sa = ca.studentAssessments.find(s => s.studentId === student.id);
        const mark = sa ? (sa.isModerated && sa.moderatedMarks !== null ? sa.moderatedMarks : sa.marksObtained) : null;
        if (mark !== null && mark !== undefined) {
          const pct = ca.totalMarks > 0 ? (mark / ca.totalMarks) * 100 : 0;
          caItems.push({
            assessmentId: ca.id,
            title: ca.title,
            marksObtained: mark,
            totalMarks: ca.totalMarks,
            percentage: Math.round(pct * 10) / 10,
            weight: ca.weight,
            isModerated: Boolean(sa?.isModerated)
          });
          totalCaObtained += mark;
          totalCaPossible += ca.totalMarks;
        }
      }

      // Continuous Assessment score normalized to configured caWeight (e.g. 30%)
      const caPercentage = totalCaPossible > 0 ? (totalCaObtained / totalCaPossible) * 100 : 0;
      const caNormalized = Math.round((caPercentage * (caWeight / 100)) * 10) / 10;

      // Summative Exam calculation
      let examMark: number | null = null;
      let examTotalMarks = 100;
      let examPercentage = 0;
      let isExamModerated = false;

      if (examAssessments.length > 0) {
        // Take latest or primary exam
        const primaryExam = examAssessments[0];
        examTotalMarks = primaryExam.totalMarks;
        const sa = primaryExam.studentAssessments.find(s => s.studentId === student.id);
        if (sa) {
          const finalExamScore = (sa.isModerated && sa.moderatedMarks !== null) ? sa.moderatedMarks : sa.marksObtained;
          if (finalExamScore !== null && finalExamScore !== undefined) {
            examMark = finalExamScore;
            isExamModerated = Boolean(sa.isModerated);
            examPercentage = examTotalMarks > 0 ? (examMark / examTotalMarks) * 100 : 0;
          }
        }
      }

      // Exam score normalized to configured examWeight (e.g. 70%)
      const examNormalized = examMark !== null
        ? Math.round((examPercentage * (examWeight / 100)) * 10) / 10
        : 0;

      // Zimbabwe combined final score out of 100
      const finalMark = Math.round((caNormalized + examNormalized) * 10) / 10;
      const grade = this.getGradeFromScore(finalMark, gradingScales);

      return {
        studentId: student.id,
        studentName: student.name,
        caWeight,
        examWeight,
        caItems,
        caScoreNormalized: caNormalized,
        examMark,
        examScoreNormalized: examNormalized,
        isExamModerated,
        finalMark,
        grade
      };
    });

    // 6. Standard competition ranking (1, 2, 2, 4 with tie handling)
    studentResults.sort((a, b) => b.finalMark - a.finalMark);
    let currentRank = 1;
    const rankedResults = studentResults.map((res, index) => {
      if (index > 0 && res.finalMark < studentResults[index - 1].finalMark) {
        currentRank = index + 1;
      }
      return {
        ...res,
        classPosition: currentRank,
        totalStudents: studentResults.length
      };
    });

    // 7. Sync into prisma.grade for broadsheets and historical queries
    try {
      const teacher = await prisma.teacher.findFirst({ where: { schoolId } });
      const teacherId = teacher?.id || 'SYSTEM';

      for (const res of rankedResults) {
        await prisma.grade.upsert({
          where: {
            schoolId_studentId_subjectId_term_year: {
              schoolId,
              studentId: res.studentId,
              subjectId,
              term,
              year
            }
          },
          update: {
            score: res.finalMark,
            caScore: res.caScoreNormalized,
            examScore: res.examScoreNormalized,
            grade: res.grade,
            classPosition: res.classPosition,
            assessmentEntries: res.caItems as any
          },
          create: {
            schoolId,
            studentId: res.studentId,
            subjectId,
            teacherId,
            term,
            year,
            score: res.finalMark,
            caScore: res.caScoreNormalized,
            examScore: res.examScoreNormalized,
            grade: res.grade,
            classPosition: res.classPosition,
            assessmentEntries: res.caItems as any
          }
        });
      }
    } catch (err: any) {
      console.warn('Note: Could not sync to legacy Grade table:', err.message);
    }

    return rankedResults;
  }

  /**
   * Generate comprehensive report card dataset with CA breakdown, exam mark,
   * rank, attendance %, discipline summary, and fee balance check
   */
  static async generateEnrichedReportCard(
    studentId: string,
    term: string,
    year: number,
    schoolId: string
  ): Promise<StudentReportCardData> {
    const student = await prisma.student.findFirst({
      where: { id: studentId, schoolId },
      include: {
        class: true,
        fees: true
      }
    });

    if (!student) throw new Error('Student not found');

    const classId = student.classId;
    if (!classId) throw new Error('Student is not enrolled in a class');

    // 1. Fetch school settings for fee defaulter withholding
    const school = await prisma.school.findFirst({
      where: { id: schoolId },
      select: { settings: true, gradingScales: true }
    });
    const schoolSettings = (school?.settings as any) || {};
    const withholdForDefaulters = Boolean(schoolSettings.withholdReportCardForFeeDefaulters);

    // 2. Compute fee balance
    const totalFee = Math.round(student.fees.reduce((acc, f) => acc + (f.amount || 0), 0) * 100) / 100;
    const totalPaid = Math.round(student.fees.reduce((acc, f) => acc + (f.paid || 0), 0) * 100) / 100;
    const feeBalance = Math.round((totalFee - totalPaid) * 100) / 100;
    const isDefaulter = feeBalance > 0;
    const isWithheld = withholdForDefaulters && isDefaulter;

    // 3. Fetch all subjects taken by student or class
    const subjects = await prisma.subject.findMany({
      where: { schoolId },
      orderBy: { name: 'asc' }
    });

    // 4. Calculate weighted marks for each subject
    const subjectSummaries: SubjectAssessmentSummary[] = [];

    for (const sub of subjects) {
      try {
        const rankings = await this.calculateSubjectClassRankings(sub.id, classId, term, year, schoolId);
        const studentRank = rankings.find(r => r.studentId === student.id);

        if (studentRank) {
          subjectSummaries.push({
            subjectId: sub.id,
            subjectName: sub.name,
            subjectCode: sub.code || undefined,
            caWeight: studentRank.caWeight,
            examWeight: studentRank.examWeight,
            caMarks: studentRank.caItems,
            caScoreNormalized: studentRank.caScoreNormalized,
            examMark: studentRank.examMark,
            examScoreNormalized: studentRank.examScoreNormalized,
            finalMark: studentRank.finalMark,
            grade: studentRank.grade,
            classPosition: studentRank.classPosition,
            totalStudentsInClass: studentRank.totalStudents
          });
        }
      } catch (err) {
        // Skip subjects with no data
      }
    }

    // 5. Calculate overall term average and position
    const overallTotal = subjectSummaries.reduce((acc, s) => acc + s.finalMark, 0);
    const overallAverage = subjectSummaries.length > 0
      ? Math.round((overallTotal / subjectSummaries.length) * 10) / 10
      : 0;

    // 6. Phase 5 Attendance calculation
    let presentCount = 0;
    let absentCount = 0;
    let lateCount = 0;

    // Check attendance registers
    const registers = await prisma.attendanceRecord.findMany({
      where: { studentId },
      include: { register: true }
    });

    registers.forEach(r => {
      const st = (r.status || '').toLowerCase();
      if (st === 'present') presentCount++;
      else if (st === 'absent' || st === 'truant') absentCount++;
      else if (st === 'late') lateCount++;
    });

    // Also check Attendance model if registers are empty
    if (registers.length === 0) {
      const legacyAttendance = await prisma.attendance.findMany({
        where: { studentId }
      });
      legacyAttendance.forEach(a => {
        const st = (a.status || '').toLowerCase();
        if (st === 'present') presentCount++;
        else if (st === 'absent') absentCount++;
        else if (st === 'late') lateCount++;
      });
    }

    const totalDays = presentCount + absentCount + lateCount;
    const attendancePercentage = totalDays > 0 ? Math.round(((presentCount + lateCount) / totalDays) * 100) : 100;

    // 7. Discipline Summary (approved records only for report card)
    const disciplineSummaryData = await DisciplineService.getStudentDisciplineSummary(schoolId, studentId, true);

    return {
      student: {
        id: student.id,
        name: student.name,
        studentId: student.studentId,
        className: student.class?.name || 'Class',
        classLevel: student.class?.level || 'Form'
      },
      term,
      year,
      subjects: subjectSummaries,
      overallAverage,
      overallClassPosition: 1,
      attendancePercentage,
      attendanceStats: {
        present: presentCount,
        absent: absentCount,
        late: lateCount,
        totalDays: Math.max(totalDays, 65) // Standard term school days
      },
      disciplineSummary: {
        totalIncidents: disciplineSummaryData.records.length,
        meritPoints: disciplineSummaryData.meritPoints,
        demeritPoints: disciplineSummaryData.demeritPoints,
        netPoints: disciplineSummaryData.netPoints,
        isSuspended: disciplineSummaryData.isSuspended,
        suspensionDetails: disciplineSummaryData.suspensionDetails,
        records: disciplineSummaryData.records.slice(0, 5).map(d => ({
          offenceType: d.offenceType,
          type: d.type,
          points: d.points,
          severity: d.severity,
          date: d.date.toISOString().slice(0, 10),
          actionTaken: d.actionTaken || undefined
        }))
      },
      financialStatus: {
        totalFee,
        totalPaid,
        balance: feeBalance,
        isDefaulter,
        isWithheld,
        withholdReason: isWithheld
          ? `Report card download withheld due to overdue balance of $${feeBalance.toLocaleString()}. Please settle at the Bursar's Office.`
          : undefined
      }
    };
  }
}
