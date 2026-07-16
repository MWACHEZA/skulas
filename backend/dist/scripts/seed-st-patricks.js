import { PrismaClient } from '../src/generated/client';
import bcrypt from 'bcryptjs';
const prisma = new PrismaClient();
async function main() {
    console.log("🌱 Seeding St Patrick's High School (AX-KHYVF4)...");
    // 1. Get Plan
    const plan = await prisma.plan.findFirst();
    if (!plan) {
        throw new Error('No subscription plans found in the database. Please run the main seed first.');
    }
    // 2. Create School
    const school = await prisma.school.upsert({
        where: { code: 'AX-KHYVF4' },
        update: {},
        create: {
            code: 'AX-KHYVF4',
            name: "St Patrick's High School",
            type: 'secondary',
            address: '123 Main Street, Bulawayo, Zimbabwe',
            country: 'Zimbabwe',
            email: 'info@stpatricks.edu.zw',
            phone: '+263 9 123456',
            status: 'active',
            planId: plan.id,
            branding: {
                primaryColor: '#1e3a8a', // Dark blue
                accentColor: '#f59e0b', // Gold/Amber
                logo: '/images/logo.png',
            },
            customContent: {
                motto: 'Virtute et Labore',
                welcomeTitle: "Welcome to St Patrick's High School"
            }
        }
    });
    console.log('✅ School upserted:', school.name);
    // 3. Create a Class
    let class3A = await prisma.schoolClass.findFirst({
        where: { schoolId: school.id, name: 'Form 3A' }
    });
    if (!class3A) {
        class3A = await prisma.schoolClass.create({
            data: {
                name: 'Form 3A',
                level: 'Form 3',
                schoolId: school.id,
            }
        });
    }
    console.log('✅ Class Form 3A loaded/created');
    const hash = async (pw) => bcrypt.hash(pw, 10);
    // Helper to create employee profile
    const createEmployeeProfile = async (userId, role, jobTitle) => {
        const existing = await prisma.employeeProfile.findFirst({
            where: { userId }
        });
        if (!existing) {
            await prisma.employeeProfile.create({
                data: {
                    userId,
                    schoolId: school.id,
                    basePay: 600,
                    payFrequency: 'MONTHLY',
                    contractType: 'Permanent',
                    status: 'Active',
                    hireDate: new Date(),
                    jobTitle
                }
            });
        }
    };
    // ─── 1. Admin Portal User ───
    const adminUser = await prisma.user.upsert({
        where: { email: 'admin@stpatricks.edu.zw' },
        update: {},
        create: {
            email: 'admin@stpatricks.edu.zw',
            password: await hash('Admin@1234'),
            name: 'Dr. Arthur Pendelton',
            role: 'SCHOOL_ADMIN',
            schoolId: school.id,
        }
    });
    await createEmployeeProfile(adminUser.id, 'SCHOOL_ADMIN', 'Principal');
    // ─── 2. Bursar Portal User ───
    const bursarUser = await prisma.user.upsert({
        where: { email: 'bursar@stpatricks.edu.zw' },
        update: {},
        create: {
            email: 'bursar@stpatricks.edu.zw',
            password: await hash('Bursar@1234'),
            name: 'Mrs. Abigail Sterling',
            role: 'BURSAR',
            schoolId: school.id,
        }
    });
    await createEmployeeProfile(bursarUser.id, 'BURSAR', 'Bursar');
    // ─── 3. Librarian Portal User ───
    const librarianUser = await prisma.user.upsert({
        where: { email: 'library@stpatricks.edu.zw' },
        update: {},
        create: {
            email: 'library@stpatricks.edu.zw',
            password: await hash('Library@1234'),
            name: 'Mr. Lawrence Page',
            role: 'LIBRARIAN',
            schoolId: school.id,
        }
    });
    await createEmployeeProfile(librarianUser.id, 'LIBRARIAN', 'Librarian');
    // ─── 4. Teacher Portal Users (with different secondary roles) ───
    const teachersData = [
        {
            name: 'Mr. Patrick Sports',
            email: 'sports.master@stpatricks.edu.zw',
            secondaryRoles: ['Sports Master', 'Sports Coordinator'],
            jobTitle: 'Director of Sports'
        },
        {
            name: 'Father Patrick John',
            email: 'chaplain@stpatricks.edu.zw',
            secondaryRoles: ['School Chaplain', 'House Master'],
            jobTitle: 'Chaplain & Counselor'
        },
        {
            name: 'Mr. Patrick Green',
            email: 'farm@stpatricks.edu.zw',
            secondaryRoles: ['Agriculture Teacher', 'Farm Assistant'],
            jobTitle: 'Agri-Sciences Lead'
        }
    ];
    for (const t of teachersData) {
        const teacherUser = await prisma.user.upsert({
            where: { email: t.email },
            update: {},
            create: {
                email: t.email,
                password: await hash('Teacher@1234'),
                name: t.name,
                role: 'TEACHER',
                schoolId: school.id,
                secondaryRoles: t.secondaryRoles
            }
        });
        await prisma.teacher.upsert({
            where: { userId: teacherUser.id },
            update: {},
            create: {
                staffId: `TCH-SP-${Math.floor(1000 + Math.random() * 9000)}`,
                userId: teacherUser.id,
                schoolId: school.id
            }
        });
        await createEmployeeProfile(teacherUser.id, 'TEACHER', t.jobTitle);
    }
    // ─── 5. Ancillary / Clinic Staff (with secondary roles) ───
    const nurseUser = await prisma.user.upsert({
        where: { email: 'nurse@stpatricks.edu.zw' },
        update: {},
        create: {
            email: 'nurse@stpatricks.edu.zw',
            password: await hash('Ancillary@1234'),
            name: 'Nurse Joyce Moyo',
            role: 'ANCILLARY',
            schoolId: school.id,
            secondaryRoles: ['Nurse', 'Health Coordinator']
        }
    });
    await createEmployeeProfile(nurseUser.id, 'ANCILLARY', 'School Nurse');
    // ─── 6. Student Portal Users (with different secondary roles) ───
    const studentsData = [
        {
            studentId: 'STU-SP-0001',
            name: 'David Moyo',
            email: 'headboy@student.stpatricks.edu.zw',
            gender: 'Male',
            secondaryRoles: ['Head Boy', 'Prefect']
        },
        {
            studentId: 'STU-SP-0002',
            name: 'Alex Ncube',
            email: 'sportscap@student.stpatricks.edu.zw',
            gender: 'Male',
            secondaryRoles: ['Sports Captain', 'House Captain']
        },
        {
            studentId: 'STU-SP-0003',
            name: 'Grace Dube',
            email: 'monitor@student.stpatricks.edu.zw',
            gender: 'Female',
            secondaryRoles: ['Class Monitor', 'DH Captain']
        },
        {
            studentId: 'STU-SP-0004',
            name: 'Jane Sibanda',
            email: 'student@student.stpatricks.edu.zw',
            gender: 'Female',
            secondaryRoles: []
        }
    ];
    const dbStudents = [];
    for (const s of studentsData) {
        const studentUser = await prisma.user.upsert({
            where: { email: s.email },
            update: {},
            create: {
                email: s.email,
                password: await hash('Student@1234'),
                name: s.name,
                role: 'STUDENT',
                schoolId: school.id,
                secondaryRoles: s.secondaryRoles
            }
        });
        const student = await prisma.student.upsert({
            where: { schoolId_studentId: { schoolId: school.id, studentId: s.studentId } },
            update: {},
            create: {
                studentId: s.studentId,
                name: s.name,
                email: s.email,
                gender: s.gender,
                classId: class3A.id,
                schoolId: school.id,
                userId: studentUser.id
            }
        });
        dbStudents.push(student);
    }
    // ─── 7. Parent Portal User ───
    const parentUser = await prisma.user.upsert({
        where: { email: 'parent@stpatricks.edu.zw' },
        update: {},
        create: {
            email: 'parent@stpatricks.edu.zw',
            password: await hash('Parent@1234'),
            name: 'Mr. Moyo Parent',
            role: 'PARENT',
            schoolId: school.id,
        }
    });
    const parent = await prisma.parent.upsert({
        where: { userId: parentUser.id },
        update: {},
        create: {
            userId: parentUser.id,
            phone: '+263 77 111 2222',
            address: 'Bulawayo, Zimbabwe'
        }
    });
    // Link Parent to student David Moyo
    const davidMoyoStudent = dbStudents.find(s => s.studentId === 'STU-SP-0001');
    if (davidMoyoStudent) {
        const existingLink = await prisma.parentStudent.findFirst({
            where: { parentId: parent.id, studentId: davidMoyoStudent.id }
        });
        if (!existingLink) {
            await prisma.parentStudent.create({
                data: {
                    parentId: parent.id,
                    studentId: davidMoyoStudent.id,
                    relation: 'Father',
                    isPrimaryPayer: true
                }
            });
        }
    }
    // ─── 8. Supplier Portal User ───
    const supplierUser = await prisma.user.upsert({
        where: { email: 'supplier@stpatricks.edu.zw' },
        update: {},
        create: {
            email: 'supplier@stpatricks.edu.zw',
            password: await hash('Supplier@1234'),
            name: 'St Patrick\'s Food Supplier',
            role: 'SUPPLIER',
            schoolId: school.id,
        }
    });
    const supplier = await prisma.supplier.upsert({
        where: { email: supplierUser.email },
        update: {},
        create: {
            companyName: 'St Patricks Supplier Ltd',
            contactName: supplierUser.name,
            email: supplierUser.email,
            phone: '+263 77 333 4444',
            address: 'Bulawayo Industrial Site',
            userId: supplierUser.id
        }
    });
    await prisma.schoolSupplier.upsert({
        where: { schoolId_supplierId: { schoolId: school.id, supplierId: supplier.id } },
        update: {},
        create: {
            schoolId: school.id,
            supplierId: supplier.id
        }
    });
    console.log('\n🎉 St Patrick\'s High School users seeded successfully!');
    console.log('\n📋 Test Credentials (School Code: AX-KHYVF4):');
    console.log('  Admin:          admin@stpatricks.edu.zw / Admin@1234');
    console.log('  Bursar:         bursar@stpatricks.edu.zw / Bursar@1234');
    console.log('  Librarian:      library@stpatricks.edu.zw / Library@1234');
    console.log('  Sports Master:  sports.master@stpatricks.edu.zw / Teacher@1234');
    console.log('  Chaplain:       chaplain@stpatricks.edu.zw / Teacher@1234');
    console.log('  Nurse/Health:   nurse@stpatricks.edu.zw / Ancillary@1234');
    console.log('  Head Boy (Stu): headboy@student.stpatricks.edu.zw / Student@1234');
    console.log('  Parent:         parent@stpatricks.edu.zw / Parent@1234');
    console.log('  Supplier:       supplier@stpatricks.edu.zw / Supplier@1234');
}
main()
    .catch((e) => {
    console.error(e);
    process.exit(1);
})
    .finally(async () => {
    await prisma.$disconnect();
});
//# sourceMappingURL=seed-st-patricks.js.map