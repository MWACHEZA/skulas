"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.seedAcademics = seedAcademics;
async function seedAcademics(prisma, school, teachers, students) {
    console.log(`  -> Seeding Academics for ${school.name}...`);
    const schoolType = school.type;
    // 1. Subjects
    let subjectData = [];
    if (schoolType === 'primary') {
        subjectData = [
            { name: 'Mathematics', code: 'MATH', department: 'General' },
            { name: 'English', code: 'ENG', department: 'General' },
            { name: 'Environmental Science', code: 'ENV', department: 'General' },
        ];
    }
    else if (schoolType === 'secondary') {
        subjectData = [
            { name: 'Mathematics', code: 'MATH', department: 'Sciences' },
            { name: 'Physics', code: 'PHY', department: 'Sciences' },
            { name: 'History', code: 'HIST', department: 'Humanities' },
        ];
    }
    else if (school.code === 'AX-NURSING') {
        subjectData = [
            { name: 'Human Anatomy', code: 'ANAT', department: 'Medical' },
            { name: 'Pharmacology', code: 'PHARM', department: 'Medical' },
            { name: 'Clinical Practice', code: 'CLIN', department: 'Medical' },
        ];
    }
    else if (school.code === 'AX-SEMINARY') {
        subjectData = [
            { name: 'Theology', code: 'THEO', department: 'Religion' },
            { name: 'Philosophy', code: 'PHIL', department: 'Religion' },
            { name: 'Church History', code: 'CHIS', department: 'Religion' },
        ];
    }
    else {
        subjectData = [
            { name: 'Programming', code: 'PROG', department: 'IT' },
            { name: 'Calculus', code: 'CALC', department: 'Math' },
            { name: 'Business Management', code: 'BUS', department: 'Business' },
        ];
    }
    const dbSubjects = [];
    for (const s of subjectData) {
        const subj = await prisma.subject.upsert({
            where: { id: `subj-${s.code}-${school.id}`.substring(0, 25) },
            update: {},
            create: { ...s, schoolId: school.id },
        });
        dbSubjects.push(subj);
    }
    // Assign teachers to subjects
    if (teachers.length > 0 && dbSubjects.length > 0) {
        for (let i = 0; i < teachers.length; i++) {
            const subjectIndex = i % dbSubjects.length;
            await prisma.teacherSubject.upsert({
                where: { teacherId_subjectId: { teacherId: teachers[i].id, subjectId: dbSubjects[subjectIndex].id } },
                update: {},
                create: { teacherId: teachers[i].id, subjectId: dbSubjects[subjectIndex].id },
            });
        }
    }
    // 2. Class & Section
    const section = await prisma.section.upsert({
        where: { schoolId_name: { schoolId: school.id, name: 'Morning' } },
        update: {},
        create: { name: 'Morning', schoolId: school.id }
    });
    const className = schoolType === 'tertiary' ? 'Year 1' : schoolType === 'secondary' ? 'Form 1' : 'Grade 1';
    const schoolClass = await prisma.schoolClass.upsert({
        where: { schoolId_name: { schoolId: school.id, name: `${className} A` } },
        update: {},
        create: { name: `${className} A`, level: className, teacherId: teachers[0]?.id, sectionId: section.id, schoolId: school.id },
    });
    const classB = await prisma.schoolClass.upsert({
        where: { schoolId_name: { schoolId: school.id, name: `${className} B` } },
        update: {},
        create: { name: `${className} B`, level: className, teacherId: teachers[1]?.id, sectionId: section.id, schoolId: school.id },
    });
    // Assign students to classes (15 to Class A, rest to Class B)
    for (let i = 0; i < students.length; i++) {
        await prisma.student.update({
            where: { id: students[i].id },
            data: { classId: i < 15 ? schoolClass.id : classB.id }
        });
    }
    // 3. Timetable, Syllabus, Lesson Plans, Study Material
    const classesToSeed = [schoolClass, classB];
    for (const cls of classesToSeed) {
        for (const subj of dbSubjects) {
            for (let i = 0; i < 5; i++) {
                await prisma.timetableSlot.create({
                    data: { classId: cls.id, subjectId: subj.id, dayOfWeek: (i % 5) + 1, startTime: `08:0${i % 10}`, endTime: `09:0${i % 10}`, room: `Room 10${i}`, schoolId: school.id }
                });
                const syllabus = await prisma.syllabus.create({
                    data: { topic: `Term 1 Topic ${i + 1}`, content: `Introduction to ${subj.name} topics.`, week: `Week ${i + 1}`, schoolId: school.id, classId: cls.id, subjectId: subj.id }
                });
                await prisma.lessonPlan.create({
                    data: { week: `Week ${i + 1}`, session: `Session 1`, content: 'Basics and Fundamentals', syllabusId: syllabus.id, schoolId: school.id, classId: cls.id, subjectId: subj.id, teacherId: teachers[0]?.id }
                });
                await prisma.studyMaterial.create({
                    data: { title: `${subj.name} Lecture Notes ${i + 1}`, date: new Date(), description: `Notes for week ${i + 1}`, documentUrl: 'https://example.com/notes.pdf', schoolId: school.id, classId: cls.id, subjectId: subj.id, teacherId: teachers[0]?.userId }
                });
            }
        }
    }
    // 4. Grades, Attendance, Progress Reports
    let supervisorAssignment = await prisma.supervisorAssignment.findFirst({ where: { schoolId: school.id, studentId: students[0].id, teacherId: teachers[0].id } });
    if (!supervisorAssignment) {
        supervisorAssignment = await prisma.supervisorAssignment.create({
            data: { teacherId: teachers[0].id, studentId: students[0].id, role: 'PRINCIPAL', schoolId: school.id }
        });
    }
    for (let i = 1; i < 10 && i < students.length; i++) {
        await prisma.supervisorAssignment.upsert({
            where: { schoolId_studentId_teacherId: { schoolId: school.id, studentId: students[i].id, teacherId: teachers[0].id } },
            update: {},
            create: { teacherId: teachers[0].id, studentId: students[i].id, role: 'TUTOR', schoolId: school.id }
        });
    }
    for (let i = 0; i < 10; i++) {
        await prisma.progressReport.create({
            data: { studentId: students[0].id, assignmentId: supervisorAssignment.id, reportPeriod: `Term ${i % 3 + 1} 202${i}`, content: 'Good progress.', schoolId: school.id }
        });
    }
    for (const student of students) {
        await prisma.grade.create({
            data: { studentId: student.id, subjectId: dbSubjects[0].id, teacherId: teachers[0]?.id, schoolId: school.id, term: 'Term 1', year: 2024, score: 85, maxScore: 100, grade: 'A' },
        });
        // 10 attendances per student
        for (let a = 0; a < 10; a++) {
            await prisma.attendance.create({
                data: { studentId: student.id, teacherId: teachers[0]?.id, schoolId: school.id, date: new Date(Date.now() - a * 86400000), status: 'present' },
            });
        }
    }
    // 5. Exams, Assignments, Question Papers
    for (let i = 0; i < 10; i++) {
        const exam = await prisma.cBTExam.create({
            data: { title: `Mid Term Test ${i + 1}`, date: new Date(), time: '09:00', totalMarks: 100, passingPercent: 50, schoolId: school.id, classId: schoolClass.id, subjectId: dbSubjects[0].id }
        });
        await prisma.cBTQuestion.create({
            data: { examId: exam.id, question: `What is 2+${i}?`, type: 'MULTIPLE_CHOICE', mark: 5, options: { a: '3', b: `${2 + i}`, c: '5' }, answer: 'b' }
        });
        const assignment = await prisma.assignment.create({
            data: { title: `Assignment ${i + 1}`, subjectId: dbSubjects[0].id, teacherId: teachers[0]?.id, schoolId: school.id, dueDate: new Date(), maxScore: 100, isAccepting: true, classId: schoolClass.id },
        });
        await prisma.assignmentSubmission.create({
            data: { assignmentId: assignment.id, studentId: students[0].id, grade: 90, status: 'GRADED', schoolId: school.id }
        });
        await prisma.questionPaper.create({
            data: { title: `202${i} Past Paper`, sections: [], schoolId: school.id, subjectId: dbSubjects[0].id, teacherId: teachers[0]?.id }
        });
    }
    return { schoolClass, dbSubjects };
}
//# sourceMappingURL=seedAcademics.js.map