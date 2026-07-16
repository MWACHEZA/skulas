import { PrismaClient } from '../src/generated/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // ─── Plans ────────────────────────────────────────────────────────
  const starterPlan = await prisma.plan.upsert({
    where: { name: 'Starter' },
    update: {
      price: 49,
      features: ['Student Management (up to 200)', 'Admin & Teacher Portals', 'Finance & Fee Collection', 'Attendance & Grades', 'Parent & Student Portals', '5 GB Storage']
    },
    create: { 
      name: 'Starter', 
      price: 49, 
      features: ['Student Management (up to 200)', 'Admin & Teacher Portals', 'Finance & Fee Collection', 'Attendance & Grades', 'Parent & Student Portals', '5 GB Storage'] 
    },
  });
  const proPlan = await prisma.plan.upsert({
    where: { name: 'Professional' },
    update: {
      price: 149,
      features: ['Everything in Starter', 'Student Management (up to 800)', 'Clinical & Practical Assessment', 'Agriculture & Farm Management', 'Boarding & Hostel Management', 'Library & Alumni Portals', '50 GB Storage']
    },
    create: { 
      name: 'Professional', 
      price: 149, 
      features: ['Everything in Starter', 'Student Management (up to 800)', 'Clinical & Practical Assessment', 'Agriculture & Farm Management', 'Boarding & Hostel Management', 'Library & Alumni Portals', '50 GB Storage'] 
    },
  });
  const enterprisePlan = await prisma.plan.upsert({
    where: { name: 'Enterprise' },
    update: {
      price: 999, // Placeholder for custom
      features: ['Everything in Professional', 'Postgraduate Regulation Engine', 'Research & Thesis Supervision', 'NUST-Compliant Academic Engine', 'RPG Progress Reporting', 'Multi-Campus & API Access', 'Unlimited Storage & Support']
    },
    create: { 
      name: 'Enterprise', 
      price: 999, 
      features: ['Everything in Professional', 'Postgraduate Regulation Engine', 'Research & Thesis Supervision', 'NUST-Compliant Academic Engine', 'RPG Progress Reporting', 'Multi-Campus & API Access', 'Unlimited Storage & Support'] 
    },
  });
  console.log('✅ Plans seeded');

  // ─── School ───────────────────────────────────────────────────────
  const school = await prisma.school.upsert({
    where: { code: 'AX-EMBAKWE' },
    update: {},
    create: {
      code: 'AX-EMBAKWE',
      name: 'Embakwe High School',
      type: 'secondary',
      address: 'Embakwe, Plumtree, Zimbabwe',
      country: 'Zimbabwe',
      email: 'admin@embakwehigh.edu.zw',
      phone: '+263 123 456 789',
      status: 'active',
      planId: proPlan.id,
      branding: { primaryColor: '#0056b3', accentColor: '#d1410c', logo: '/images/logo.png' },
      customContent: { motto: 'Fide et Labore', welcomeTitle: 'Welcome to Embakwe High School' },
    },
  });
  console.log('✅ School seeded:', school.code);

  // ─── Hash helper ──────────────────────────────────────────────────
  const hash = (pw: string) => bcrypt.hash(pw, 10);

  // ─── Users ────────────────────────────────────────────────────────
  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@embakwehigh.edu.zw' },
    update: {},
    create: {
      email: 'admin@embakwehigh.edu.zw',
      password: await hash('Admin@1234'),
      name: 'Mr. Principal Mthembu',
      role: 'SCHOOL_ADMIN',
      schoolId: school.id,
    },
  });

  const bursarUser = await prisma.user.upsert({
    where: { email: 'bursar@embakwehigh.edu.zw' },
    update: {},
    create: {
      email: 'bursar@embakwehigh.edu.zw',
      password: await hash('Bursar@1234'),
      name: 'Mrs. Finance Dube',
      role: 'BURSAR',
      schoolId: school.id,
    },
  });

  const librarianUser = await prisma.user.upsert({
    where: { email: 'library@embakwehigh.edu.zw' },
    update: {},
    create: {
      email: 'library@embakwehigh.edu.zw',
      password: await hash('Library@1234'),
      name: 'Mr. Books Moyo',
      role: 'LIBRARIAN',
      schoolId: school.id,
    },
  });

  const teacher1User = await prisma.user.upsert({
    where: { email: 'zhou@embakwehigh.edu.zw' },
    update: {},
    create: {
      email: 'zhou@embakwehigh.edu.zw',
      password: await hash('Teacher@1234'),
      name: 'Mr. T. Zhou',
      role: 'TEACHER',
      schoolId: school.id,
    },
  });

  const teacher2User = await prisma.user.upsert({
    where: { email: 'ncube@embakwehigh.edu.zw' },
    update: {},
    create: {
      email: 'ncube@embakwehigh.edu.zw',
      password: await hash('Teacher@1234'),
      name: 'Mrs. R. Ncube',
      role: 'TEACHER',
      schoolId: school.id,
    },
  });
  console.log('✅ Users seeded');

  // ─── Subjects ─────────────────────────────────────────────────────
  const subjectData = [
    { name: 'Mathematics', code: 'MATH', department: 'Sciences' },
    { name: 'Physics', code: 'PHY', department: 'Sciences' },
    { name: 'Chemistry', code: 'CHEM', department: 'Sciences' },
    { name: 'Biology', code: 'BIO', department: 'Sciences' },
    { name: 'English Language', code: 'ENG', department: 'Humanities' },
    { name: 'History', code: 'HIST', department: 'Humanities' },
    { name: 'Geography', code: 'GEO', department: 'Humanities' },
    { name: 'Computer Science', code: 'CS', department: 'ICT' },
  ];

  const subjects: Record<string, any> = {};
  for (const s of subjectData) {
    const subj = await prisma.subject.upsert({
      where: { id: `subj-${s.code}-${school.id}`.substring(0, 25) },
      update: {},
      create: { ...s, schoolId: school.id },
    });
    subjects[s.code] = subj;
  }
  console.log('✅ Subjects seeded');

  // ─── Teachers ─────────────────────────────────────────────────────
  const teacher1 = await prisma.teacher.upsert({
    where: { userId: teacher1User.id },
    update: {},
    create: {
      staffId: 'TCH-001',
      userId: teacher1User.id,
      schoolId: school.id,
      qualification: 'MSc Physics, BEd Science',
      department: 'Sciences',
    },
  });

  const teacher2 = await prisma.teacher.upsert({
    where: { userId: teacher2User.id },
    update: {},
    create: {
      staffId: 'TCH-002',
      userId: teacher2User.id,
      schoolId: school.id,
      qualification: 'MA History, BA Ed',
      department: 'Humanities',
    },
  });

  // Link teachers to subjects
  await prisma.teacherSubject.upsert({
    where: { teacherId_subjectId: { teacherId: teacher1.id, subjectId: subjects['MATH'].id } },
    update: {},
    create: { teacherId: teacher1.id, subjectId: subjects['MATH'].id },
  });
  await prisma.teacherSubject.upsert({
    where: { teacherId_subjectId: { teacherId: teacher1.id, subjectId: subjects['PHY'].id } },
    update: {},
    create: { teacherId: teacher1.id, subjectId: subjects['PHY'].id },
  });
  await prisma.teacherSubject.upsert({
    where: { teacherId_subjectId: { teacherId: teacher2.id, subjectId: subjects['HIST'].id } },
    update: {},
    create: { teacherId: teacher2.id, subjectId: subjects['HIST'].id },
  });
  await prisma.teacherSubject.upsert({
    where: { teacherId_subjectId: { teacherId: teacher2.id, subjectId: subjects['ENG'].id } },
    update: {},
    create: { teacherId: teacher2.id, subjectId: subjects['ENG'].id },
  });
  console.log('✅ Teachers seeded');

  // ─── Classes ──────────────────────────────────────────────────────
  const class3A = await prisma.schoolClass.create({
    data: { name: 'Form 3A', level: 'Form 3', teacherId: teacher1.id, schoolId: school.id },
  });
  const class4B = await prisma.schoolClass.create({
    data: { name: 'Form 4B', level: 'Form 4', teacherId: teacher2.id, schoolId: school.id },
  });
  console.log('✅ Classes seeded');

  // ─── Timetable ────────────────────────────────────────────────────
  const timetableSlots = [
    { classId: class3A.id, subjectId: subjects['MATH'].id, dayOfWeek: 1, startTime: '08:00', endTime: '09:00', room: 'Room 101' },
    { classId: class3A.id, subjectId: subjects['PHY'].id, dayOfWeek: 1, startTime: '09:00', endTime: '10:00', room: 'Lab 1' },
    { classId: class3A.id, subjectId: subjects['ENG'].id, dayOfWeek: 2, startTime: '08:00', endTime: '09:00', room: 'Room 203' },
    { classId: class3A.id, subjectId: subjects['HIST'].id, dayOfWeek: 2, startTime: '09:00', endTime: '10:00', room: 'Room 105' },
    { classId: class3A.id, subjectId: subjects['CHEM'].id, dayOfWeek: 3, startTime: '08:00', endTime: '09:00', room: 'Lab 2' },
    { classId: class3A.id, subjectId: subjects['MATH'].id, dayOfWeek: 4, startTime: '08:00', endTime: '09:00', room: 'Room 101' },
    { classId: class3A.id, subjectId: subjects['BIO'].id, dayOfWeek: 5, startTime: '10:00', endTime: '11:00', room: 'Lab 3' },
  ];
  for (const slot of timetableSlots) {
    await prisma.timetableSlot.create({ data: { ...slot, schoolId: school.id } });
  }
  console.log('✅ Timetable seeded');

  // ─── Students ─────────────────────────────────────────────────────
  const studentData = [
    { studentId: 'STU-0001', name: 'Tendai Moyo', email: 'tendai@student.embakwe.edu.zw', gender: 'Male' },
    { studentId: 'STU-0002', name: 'Ruvimbo Dube', email: 'ruvimbo@student.embakwe.edu.zw', gender: 'Female' },
    { studentId: 'STU-0003', name: 'Farai Ncube', email: 'farai@student.embakwe.edu.zw', gender: 'Male' },
  ];

  const students: any[] = [];
  for (const s of studentData) {
    // Create a user account for each student too
    const studentUser = await prisma.user.upsert({
      where: { email: s.email },
      update: {},
      create: {
        email: s.email,
        password: await hash('Student@1234'),
        name: s.name,
        role: 'STUDENT',
        schoolId: school.id,
      },
    });

    const student = await prisma.student.upsert({
      where: { schoolId_studentId: { schoolId: school.id, studentId: s.studentId } },
      update: {},
      create: {
        ...s,
        classId: class3A.id,
        schoolId: school.id,
      },
    });
    students.push(student);
  }
  console.log('✅ Students seeded');

  // ─── Grades ───────────────────────────────────────────────────────
  const gradeMap: Record<number, string> = { 90: 'A', 80: 'B+', 70: 'B', 60: 'C', 50: 'D' };
  const getGrade = (score: number) => {
    for (const [min, g] of Object.entries(gradeMap).sort((a, b) => Number(b[0]) - Number(a[0]))) {
      if (score >= Number(min)) return g;
    }
    return 'F';
  };

  const gradeEntries = [
    { subjectCode: 'MATH', score: 85 }, { subjectCode: 'PHY', score: 78 },
    { subjectCode: 'ENG', score: 92 }, { subjectCode: 'HIST', score: 67 },
    { subjectCode: 'CHEM', score: 74 }, { subjectCode: 'BIO', score: 88 },
  ];

  for (const student of students) {
    for (const entry of gradeEntries) {
      const subject = subjects[entry.subjectCode];
      if (!subject) continue;
      await prisma.grade.create({
        data: {
          studentId: student.id,
          subjectId: subject.id,
          teacherId: teacher1.id,
          schoolId: school.id,
          term: 'Term 1',
          year: 2024,
          score: entry.score + Math.round(Math.random() * 10 - 5),
          maxScore: 100,
          grade: getGrade(entry.score),
        },
      });
    }
  }
  console.log('✅ Grades seeded');

  // ─── Attendance ───────────────────────────────────────────────────
  const statuses = ['present', 'present', 'present', 'present', 'late', 'absent'];
  const today = new Date();
  for (const student of students) {
    for (let d = 0; d < 20; d++) {
      const date = new Date(today);
      date.setDate(today.getDate() - d);
      if (date.getDay() === 0 || date.getDay() === 6) continue; // skip weekends
      await prisma.attendance.create({
        data: {
          studentId: student.id,
          teacherId: teacher1.id,
          schoolId: school.id,
          date,
          status: statuses[Math.floor(Math.random() * statuses.length)],
        },
      });
    }
  }
  console.log('✅ Attendance seeded');

  // ─── Fees ─────────────────────────────────────────────────────────
  for (const student of students) {
    for (const term of ['Term 1', 'Term 2', 'Term 3']) {
      const paid = term === 'Term 1' ? 450 : term === 'Term 2' ? 200 : 0;
      await prisma.fee.create({
        data: {
          studentId: student.id,
          term,
          year: 2024,
          amount: 450,
          schoolId: school.id,
          paid,
          dueDate: new Date(`2024-${term === 'Term 1' ? '01' : term === 'Term 2' ? '05' : '09'}-15`),
          status: paid >= 450 ? 'paid' : paid > 0 ? 'partial' : 'unpaid',
          description: `${term} 2024 Tuition & Boarding`,
        },
      });
    }
  }
  console.log('✅ Fees seeded');

  // ─── Assignments ──────────────────────────────────────────────────
  const assignments = [
    { title: 'Mathematics Problem Set 3', subjectCode: 'MATH', daysUntilDue: 5 },
    { title: 'Physics Lab Report - Waves', subjectCode: 'PHY', daysUntilDue: 10 },
    { title: 'English Essay - Great Expectations', subjectCode: 'ENG', daysUntilDue: 7 },
    { title: 'History Essay - Colonial Era', subjectCode: 'HIST', daysUntilDue: -2 },
  ];

  for (const a of assignments) {
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + a.daysUntilDue);
      await prisma.assignment.create({
        data: {
          title: a.title,
          subjectId: subjects[a.subjectCode].id,
          teacherId: teacher1.id,
          schoolId: school.id,
          dueDate,
          maxScore: 100,
          isAccepting: a.daysUntilDue >= 0,
        },
      });
  }
  console.log('✅ Assignments seeded');

  // ─── Announcements ────────────────────────────────────────────────
  await prisma.announcement.createMany({
    data: [
      { title: 'End of Term Exams Schedule', content: 'Examinations will commence on November 15th. All students must be present.', targetRole: 'ALL', schoolId: school.id },
      { title: 'Sports Day – November 20th', content: 'Annual sports day will be held on the main field. Parents are welcome.', targetRole: 'ALL', schoolId: school.id },
      { title: 'Staff Meeting – Friday 3PM', content: 'All teaching staff are required to attend the Friday briefing in the staffroom.', targetRole: 'TEACHER', schoolId: school.id },
      { title: 'Fee Collection Deadline', content: 'Term 2 fees must be settled by the end of this month. Contact the bursar\'s office.', targetRole: 'STUDENT', schoolId: school.id },
    ],
  });
  console.log('✅ Announcements seeded');

  // ─── Books ────────────────────────────────────────────────────────
  const books = [
    { title: 'Advanced Mathematics for A-Level', author: 'K. Murwisi', isbn: '978-0-00-123456-7', category: 'Mathematics', copies: 10, available: 7 },
    { title: 'Cambridge Physics', author: 'D. Sang', isbn: '978-0-52-145678-9', category: 'Sciences', copies: 8, available: 5 },
    { title: 'Oxford English Grammar', author: 'J. Eastwood', isbn: '978-0-19-456789-0', category: 'Languages', copies: 15, available: 12 },
    { title: 'Africa: A History', author: 'J. Reader', isbn: '978-0-67-989012-3', category: 'History', copies: 6, available: 4 },
    { title: 'Computer Science for ZIMSEC', author: 'T. Moyo', isbn: '978-0-00-345678-1', category: 'ICT', copies: 12, available: 9 },
    { title: 'Biology: Concepts & Applications', author: 'C. Starr', isbn: '978-1-30-523456-7', category: 'Sciences', copies: 9, available: 6 },
  ];

  const categoryNames = Array.from(new Set(books.map(b => b.category)));
  const categoryMap: Record<string, string> = {};
  for (const name of categoryNames) {
    const cat = await prisma.libraryCategory.upsert({
      where: { schoolId_name: { schoolId: school.id, name } },
      update: {},
      create: { name, schoolId: school.id }
    });
    categoryMap[name] = cat.id;
  }

  const bookRecords: any[] = [];
  for (const b of books) {
    const { category, ...rest } = b;
    const book = await prisma.book.create({
      data: {
        ...rest,
        categoryId: categoryMap[category],
        schoolId: school.id
      }
    });
    bookRecords.push(book);
  }

  // Give student 1 a book loan
  const dueDate = new Date();
  dueDate.setDate(dueDate.getDate() + 14);
  await prisma.bookLoan.create({
    data: { bookId: bookRecords[0].id, studentId: students[0].id, schoolId: school.id, dueDate, status: 'borrowed' },
  });
  console.log('✅ Books seeded');

  // ─── Applications ─────────────────────────────────────────────────
  await prisma.application.createMany({
    data: [
      { applicantName: 'Simba Chirwa', email: 'simba@gmail.com', appType: 'Form 1', status: 'pending', schoolId: school.id },
      { applicantName: 'Nokuthula Mpofu', email: 'noku@gmail.com', appType: 'A-Level', status: 'accepted', schoolId: school.id },
      { applicantName: 'Brian Mutasa', email: 'brian@gmail.com', appType: 'Transfer', status: 'pending', schoolId: school.id },
      { applicantName: 'Grace Sibanda', email: 'grace@gmail.com', appType: 'Form 1', status: 'rejected', schoolId: school.id },
    ],
  });
  console.log('✅ Applications seeded');

  // ─── Extra Test Schools ───────────────────────────────────────────
  // Primary School (Starter Plan)
  const primarySchool = await prisma.school.upsert({
    where: { code: 'AX-PRIMARY' },
    update: {},
    create: {
      code: 'AX-PRIMARY',
      name: 'Sunshine Primary School',
      type: 'primary',
      address: 'Harare, Zimbabwe',
      email: 'admin@sunshineprimary.edu.zw',
      status: 'active',
      planId: starterPlan.id,
    },
  });
  await prisma.user.upsert({
    where: { email: 'admin@sunshineprimary.edu.zw' },
    update: {},
    create: { email: 'admin@sunshineprimary.edu.zw', password: await hash('Admin@1234'), name: 'Mrs. Sunshine', role: 'SCHOOL_ADMIN', schoolId: primarySchool.id },
  });

  // Tertiary Institution (Enterprise Plan)
  const tertiarySchool = await prisma.school.upsert({
    where: { code: 'AX-TERTIARY' },
    update: {},
    create: {
      code: 'AX-TERTIARY',
      name: 'National University of Tech',
      type: 'tertiary',
      address: 'Bulawayo, Zimbabwe',
      email: 'admin@nut.ac.zw',
      status: 'active',
      planId: enterprisePlan.id,
    },
  });
  await prisma.user.upsert({
    where: { email: 'admin@nut.ac.zw' },
    update: {},
    create: { email: 'admin@nut.ac.zw', password: await hash('Admin@1234'), name: 'Prof. Tech', role: 'SCHOOL_ADMIN', schoolId: tertiarySchool.id },
  });

  // Nursing School (Enterprise Plan)
  const nursingSchool = await prisma.school.upsert({
    where: { code: 'AX-NURSING' },
    update: {},
    create: {
      code: 'AX-NURSING',
      name: 'Nightingale School of Nursing',
      type: 'tertiary',
      address: 'Gweru, Zimbabwe',
      email: 'admin@nightingalenursing.ac.zw',
      status: 'active',
      planId: enterprisePlan.id,
    },
  });
  await prisma.user.upsert({
    where: { email: 'admin@nightingalenursing.ac.zw' },
    update: {},
    create: { email: 'admin@nightingalenursing.ac.zw', password: await hash('Admin@1234'), name: 'Dr. Nightingale', role: 'SCHOOL_ADMIN', schoolId: nursingSchool.id },
  });

  // Seminary School (Professional Plan)
  const seminarySchool = await prisma.school.upsert({
    where: { code: 'AX-SEMINARY' },
    update: {},
    create: {
      code: 'AX-SEMINARY',
      name: 'St. Peter Seminary',
      type: 'tertiary',
      address: 'Chishawasha, Zimbabwe',
      email: 'admin@stpeterseminary.org',
      status: 'active',
      planId: proPlan.id,
    },
  });
  await prisma.user.upsert({
    where: { email: 'admin@stpeterseminary.org' },
    update: {},
    create: { email: 'admin@stpeterseminary.org', password: await hash('Admin@1234'), name: 'Father Peter', role: 'SCHOOL_ADMIN', schoolId: seminarySchool.id },
  });
  console.log('✅ Extra Test Schools seeded');

  console.log('\n🎉 Database seeded successfully!');
  console.log('\n📋 Test Credentials (Secondary / PRO): AX-EMBAKWE');
  console.log('  Admin:    admin@embakwehigh.edu.zw / Admin@1234');
  console.log('  Teacher:  zhou@embakwehigh.edu.zw / Teacher@1234');
  console.log('  Student:  tendai@student.embakwe.edu.zw / Student@1234');
  console.log('\n📋 Test Credentials (Primary / STARTER): AX-PRIMARY');
  console.log('  Admin:    admin@sunshineprimary.edu.zw / Admin@1234');
  console.log('\n📋 Test Credentials (Tertiary / ENTERPRISE): AX-TERTIARY');
  console.log('  Admin:    admin@nut.ac.zw / Admin@1234');
  console.log('\n📋 Test Credentials (Nursing / ENTERPRISE): AX-NURSING');
  console.log('  Admin:    admin@nightingalenursing.ac.zw / Admin@1234');
  console.log('\n📋 Test Credentials (Seminary / PRO): AX-SEMINARY');
  console.log('  Admin:    admin@stpeterseminary.org / Admin@1234');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
