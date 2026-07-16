import { PrismaClient, School } from '../../src/generated/client';
import bcrypt from 'bcryptjs';

const hash = (pw: string) => bcrypt.hash(pw, 10);

export async function seedUsers(prisma: PrismaClient, school: School, emailPrefix: string) {
  console.log(`  -> Seeding Users & Staff for ${school.name}...`);
  
  const schoolCode = school.code;

  // 0. Faculties & Departments
  const genericFaculty = await prisma.faculty.upsert({
    where: { schoolId_name: { schoolId: school.id, name: 'General Faculty' } },
    update: {},
    create: { name: 'General Faculty', schoolId: school.id }
  });

  const adminDept = await prisma.department.upsert({
    where: { schoolId_name: { schoolId: school.id, name: 'Administration' } },
    update: {},
    create: { name: 'Administration', code: 'ADM', facultyId: genericFaculty.id, schoolId: school.id }
  });
  
  const financeDept = await prisma.department.upsert({
    where: { schoolId_name: { schoolId: school.id, name: 'Finance' } },
    update: {},
    create: { name: 'Finance', code: 'FIN', facultyId: genericFaculty.id, schoolId: school.id }
  });

  const academicsDept = await prisma.department.upsert({
    where: { schoolId_name: { schoolId: school.id, name: 'Academics' } },
    update: {},
    create: { name: 'Academics', code: 'ACA', facultyId: genericFaculty.id, schoolId: school.id }
  });

  const supportDept = await prisma.department.upsert({
    where: { schoolId_name: { schoolId: school.id, name: 'Support Services' } },
    update: {},
    create: { name: 'Support Services', code: 'SUP', facultyId: genericFaculty.id, schoolId: school.id }
  });

  // 1. Core Admin & Staff
  const adminUser = await prisma.user.upsert({
    where: { email: `admin@${emailPrefix}` },
    update: {},
    create: { email: `admin@${emailPrefix}`, password: await hash('Admin@1234'), name: 'Mr. Admin', role: 'SCHOOL_ADMIN', schoolId: school.id, departmentId: adminDept.id },
  });

  const admin2User = await prisma.user.upsert({
    where: { email: `admin2@${emailPrefix}` },
    update: {},
    create: { email: `admin2@${emailPrefix}`, password: await hash('Admin@1234'), name: 'Mrs. Admin Two', role: 'SCHOOL_ADMIN', schoolId: school.id, departmentId: adminDept.id },
  });

  const adminFinanceUser = await prisma.user.upsert({
    where: { email: `admin.finance@${emailPrefix}` },
    update: {},
    create: { email: `admin.finance@${emailPrefix}`, password: await hash('Admin@1234'), name: 'Mr. Admin Finance', role: 'SCHOOL_ADMIN', schoolId: school.id, departmentId: financeDept.id },
  });

  const adminAcademicsUser = await prisma.user.upsert({
    where: { email: `admin.academic@${emailPrefix}` },
    update: {},
    create: { email: `admin.academic@${emailPrefix}`, password: await hash('Admin@1234'), name: 'Dr. Admin Academic', role: 'SCHOOL_ADMIN', schoolId: school.id, departmentId: academicsDept.id },
  });

  const adminSupportUser = await prisma.user.upsert({
    where: { email: `admin.support@${emailPrefix}` },
    update: {},
    create: { email: `admin.support@${emailPrefix}`, password: await hash('Admin@1234'), name: 'Ms. Admin Support', role: 'SCHOOL_ADMIN', schoolId: school.id, departmentId: supportDept.id },
  });

  const bursarUser = await prisma.user.upsert({
    where: { email: `bursar@${emailPrefix}` },
    update: {},
    create: { email: `bursar@${emailPrefix}`, password: await hash('Bursar@1234'), name: 'Mrs. Bursar', role: 'BURSAR', schoolId: school.id, departmentId: financeDept.id },
  });

  const libraryUser = await prisma.user.upsert({
    where: { email: `library@${emailPrefix}` },
    update: {},
    create: { email: `library@${emailPrefix}`, password: await hash('Library@1234'), name: 'Mr. Librarian', role: 'LIBRARIAN', schoolId: school.id, departmentId: academicsDept.id },
  });

  // 2. Ancillary Staff
  const ancillaryUsers = [
    { email: `ancillary@${emailPrefix}`, name: 'Mr. Groundskeeper', secondaryRoles: ['Farm Assistant'] },
    { email: `receptionist@${emailPrefix}`, name: 'Ms. Receptionist', secondaryRoles: ['Receptionist', 'Front Desk Officer'] },
    { email: `boardingmaster@${emailPrefix}`, name: 'Mr. Boarding', secondaryRoles: ['Boarding Master', 'Hostel Supervisor'] },
    { email: `matron@${emailPrefix}`, name: 'Mrs. Matron', secondaryRoles: ['Hostel Matron'] },
    { email: `security@${emailPrefix}`, name: 'Mr. Security', secondaryRoles: ['Security Guard', 'Gate Officer'] },
    { email: `tuckshop@${emailPrefix}`, name: 'Mrs. Tuckshop', secondaryRoles: ['Tuckshop Manager', 'Cashier'] },
    { email: `farmmanager@${emailPrefix}`, name: 'Mr. Farmer', secondaryRoles: ['Farm Manager'] },
    { email: `driver@${emailPrefix}`, name: 'Mr. Driver', secondaryRoles: ['Driver', 'Transport Coordinator'] },
    { email: `kitchen@${emailPrefix}`, name: 'Mrs. Cook', secondaryRoles: ['Kitchen Manager', 'Cook'] },
    { email: `cleaner1@${emailPrefix}`, name: 'Ms. Cleaner', secondaryRoles: [] },
    { email: `cleaner2@${emailPrefix}`, name: 'Mr. Sweeper', secondaryRoles: [] },
    { email: `guard2@${emailPrefix}`, name: 'Mr. Guard', secondaryRoles: ['Security Guard'] },
    { email: `assistant1@${emailPrefix}`, name: 'Mr. Assistant', secondaryRoles: [] },
    { email: `assistant2@${emailPrefix}`, name: 'Ms. Helper', secondaryRoles: [] },
  ];

  const dbAncillaryUsers = [];
  for (const a of ancillaryUsers) {
    const user = await prisma.user.upsert({
      where: { email: a.email },
      update: {},
      create: { email: a.email, password: await hash('Ancillary@1234'), name: a.name, role: 'ANCILLARY', schoolId: school.id, secondaryRoles: a.secondaryRoles, departmentId: supportDept.id },
    });
    dbAncillaryUsers.push(user);
  }

  // Employee Profile creation logic will be handled at the end for all staff

  // 3. Teachers
  const teacherUsers = [
    { email: `teacher1@${emailPrefix}`, name: 'Mr. Senior Teacher', id: `T1-${schoolCode}`, secondaryRoles: ['Senior Teacher'] },
    { email: `teacher2@${emailPrefix}`, name: 'Mrs. Junior Teacher', id: `T2-${schoolCode}`, secondaryRoles: [] },
    { email: `sportsmaster@${emailPrefix}`, name: 'Mr. Sports', id: `T3-${schoolCode}`, secondaryRoles: ['Sports Master', 'Sports Coordinator'] },
    { email: `agriteach@${emailPrefix}`, name: 'Mr. Agri', id: `T4-${schoolCode}`, secondaryRoles: ['Agriculture Teacher'] },
    { email: `housemaster@${emailPrefix}`, name: 'Mr. House', id: `T5-${schoolCode}`, secondaryRoles: ['House Master'] },
    { email: `chaplain@${emailPrefix}`, name: 'Rev. Chaplain', id: `T6-${schoolCode}`, secondaryRoles: ['School Chaplain'] },
    { email: `teacher7@${emailPrefix}`, name: 'Ms. English', id: `T7-${schoolCode}`, secondaryRoles: [] },
    { email: `teacher8@${emailPrefix}`, name: 'Mr. Math', id: `T8-${schoolCode}`, secondaryRoles: [] },
    { email: `teacher9@${emailPrefix}`, name: 'Dr. Science', id: `T9-${schoolCode}`, secondaryRoles: [] },
    { email: `teacher10@${emailPrefix}`, name: 'Mrs. History', id: `T10-${schoolCode}`, secondaryRoles: [] },
    { email: `teacher11@${emailPrefix}`, name: 'Mr. Geography', id: `T11-${schoolCode}`, secondaryRoles: [] },
  ];

  const dbTeacherUsers = [];
  const dbTeachers = [];
  for (const t of teacherUsers) {
    const user = await prisma.user.upsert({
      where: { email: t.email },
      update: {},
      create: { email: t.email, password: await hash('Teacher@1234'), name: t.name, role: 'TEACHER', schoolId: school.id, secondaryRoles: t.secondaryRoles, departmentId: academicsDept.id },
    });
    const teacher = await prisma.teacher.upsert({
      where: { userId: user.id },
      update: {},
      create: { staffId: t.id, userId: user.id, schoolId: school.id, departmentId: academicsDept.id },
    });
    dbTeacherUsers.push(user);
    dbTeachers.push(teacher);
  }

  // Create Employee Profiles for all staff members
  const allStaffUsers = [adminUser, admin2User, adminFinanceUser, adminAcademicsUser, adminSupportUser, bursarUser, libraryUser, ...dbAncillaryUsers, ...dbTeacherUsers];
  
  for (const staff of allStaffUsers) {
    const jobTitleMap: Record<string, string> = {
      'SCHOOL_ADMIN': 'Administrator',
      'BURSAR': 'Bursar',
      'LIBRARIAN': 'Librarian',
      'TEACHER': 'Teacher',
      'ANCILLARY': 'Ancillary Staff'
    };
    
    let basePay = 800;
    if (staff.role === 'SCHOOL_ADMIN') basePay = 2000;
    if (staff.role === 'BURSAR') basePay = 1500;
    if (staff.role === 'TEACHER') basePay = 1200;
    if (staff.role === 'LIBRARIAN') basePay = 900;
    
    await prisma.employeeProfile.upsert({
      where: { userId: staff.id },
      update: {},
      create: {
        userId: staff.id,
        schoolId: school.id,
        jobTitle: jobTitleMap[staff.role] || 'Staff',
        basePay: basePay,
        contractType: 'Full-Time',
        dateAssumedPost: new Date(),
      }
    });
  }

  // 4. Students
  const studentUsers = Array.from({ length: 30 }).map((_, i) => {
    const num = i + 1;
    let secondaryRoles: string[] = [];
    if (num === 1) secondaryRoles = ['Head Girl'];
    else if (num === 2) secondaryRoles = ['Head Boy'];
    else if (num === 3) secondaryRoles = ['Prefect', 'Sports Captain'];
    else if (num === 4) secondaryRoles = ['Senior Prefect'];
    else if (num === 5) secondaryRoles = ['Class Monitor'];
    else if (num === 6) secondaryRoles = ['House Captain'];
    else if (num === 7) secondaryRoles = ['Church Prefect'];
    else if (num === 8) secondaryRoles = ['Student Librarian'];

    return {
      email: `student${num}@student.${emailPrefix}`,
      name: `Student Name ${num}`,
      id: `S${num}-${schoolCode}`,
      secondaryRoles,
      gender: num % 2 === 0 ? 'Male' : 'Female'
    };
  });

  const dbStudents = [];
  for (const s of studentUsers) {
    const user = await prisma.user.upsert({
      where: { email: s.email },
      update: {},
      create: { email: s.email, password: await hash('Student@1234'), name: s.name, role: 'STUDENT', schoolId: school.id, secondaryRoles: s.secondaryRoles },
    });
    const student = await prisma.student.upsert({
      where: { schoolId_studentId: { schoolId: school.id, studentId: s.id } },
      update: { userId: user.id },
      create: { studentId: s.id, userId: user.id, name: s.name, email: s.email, gender: s.gender, schoolId: school.id },
    });
    dbStudents.push(student);
  }

  // 5. Parents
  const parentUser = await prisma.user.upsert({
    where: { email: `parent@${emailPrefix}` },
    update: {},
    create: { email: `parent@${emailPrefix}`, password: await hash('Parent@1234'), name: 'Mr. Smith', role: 'PARENT', schoolId: school.id },
  });

  const parent = await prisma.parent.upsert({
    where: { userId: parentUser.id },
    update: {},
    create: { userId: parentUser.id },
  });

  const existingPS = await prisma.parentStudent.findFirst({ where: { parentId: parent.id, studentId: dbStudents[0].id } });
  if (!existingPS) {
    await prisma.parentStudent.create({
      data: { parentId: parent.id, studentId: dbStudents[0].id, relation: 'Father' },
    });
  }

  // 6. Suppliers
  const supplierUser = await prisma.user.upsert({
    where: { email: `supplier@${emailPrefix}` },
    update: {},
    create: { email: `supplier@${emailPrefix}`, password: await hash('Supplier@1234'), name: 'Acme Supplies', role: 'SUPPLIER', schoolId: school.id },
  });

  const supplier = await prisma.supplier.upsert({
    where: { userId: supplierUser.id },
    update: {},
    create: { userId: supplierUser.id, companyName: 'Acme Supplies', contactName: 'Acme Supplies', email: `supplier@${emailPrefix}`, phone: '+263 777 888 999' },
  });

  const existingSS = await prisma.schoolSupplier.findFirst({ where: { schoolId: school.id, supplierId: supplier.id } });
  if (!existingSS) {
    await prisma.schoolSupplier.create({
      data: { schoolId: school.id, supplierId: supplier.id },
    });
  }

  // 7. Alumni
  const alumniUser = await prisma.user.upsert({
    where: { email: `alumni@${emailPrefix}` },
    update: {},
    create: { email: `alumni@${emailPrefix}`, password: await hash('Alumni@1234'), name: 'Mr. Alumni', role: 'ALUMNI', schoolId: school.id },
  });

  return { dbTeachers, dbStudents, adminUser, bursarUser, parent, supplier, alumniUser };
}
