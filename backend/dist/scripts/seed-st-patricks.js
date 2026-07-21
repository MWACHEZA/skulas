"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("../src/generated/client");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const prisma = new client_1.PrismaClient();
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
    const hash = async (pw) => bcryptjs_1.default.hash(pw, 10);
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
        },
        {
            name: 'Mrs. Elizabeth Watson',
            email: 'senior.teacher@stpatricks.edu.zw',
            secondaryRoles: ['Senior Teacher'],
            jobTitle: 'Senior Teacher & Prefect Supervisor'
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
    const ancillaryData = [
        {
            name: 'Nurse Joyce Moyo',
            email: 'nurse@stpatricks.edu.zw',
            secondaryRoles: ['Nurse', 'Health Coordinator'],
            jobTitle: 'School Nurse'
        },
        {
            name: 'Mr. Frank Miller',
            email: 'farm.manager@stpatricks.edu.zw',
            secondaryRoles: ['Farm Manager'],
            jobTitle: 'Farm Manager'
        },
        {
            name: 'Mrs. Nomsa Khumalo',
            email: 'kitchen.manager@stpatricks.edu.zw',
            secondaryRoles: ['Kitchen Manager'],
            jobTitle: 'Kitchen Manager'
        },
        {
            name: 'Sarah Jenkins',
            email: 'receptionist@stpatricks.edu.zw',
            secondaryRoles: ['Receptionist', 'Front Desk Officer'],
            jobTitle: 'Front Desk Lead'
        },
        {
            name: 'Mrs. Martha Smith',
            email: 'boarding.matron@stpatricks.edu.zw',
            secondaryRoles: ['Hostel Matron', 'Hostel Supervisor'],
            jobTitle: 'Senior Hostel Matron'
        },
        {
            name: 'Officer John Connor',
            email: 'security@stpatricks.edu.zw',
            secondaryRoles: ['Security Guard', 'Security Supervisor'],
            jobTitle: 'Head of Security'
        },
        {
            name: 'Miss Emily Rose',
            email: 'tuckshop@stpatricks.edu.zw',
            secondaryRoles: ['Tuckshop Manager', 'Cashier'],
            jobTitle: 'Tuckshop Operator'
        },
        {
            name: 'Mr. Thomas Shelby',
            email: 'driver@stpatricks.edu.zw',
            secondaryRoles: ['Driver', 'Transport Coordinator'],
            jobTitle: 'Senior Transport Officer'
        },
        {
            name: 'Ms. Clara Oswald',
            email: 'it.support@stpatricks.edu.zw',
            secondaryRoles: ['IT Support', 'Systems Administrator'],
            jobTitle: 'Senior IT Technician'
        },
        {
            name: 'Mr. David Ndlovu',
            email: 'procurement@stpatricks.edu.zw',
            secondaryRoles: ['Procurement Officer', 'Buyer'],
            jobTitle: 'Procurement Specialist'
        },
        {
            name: 'Mr. Amos Gumbo',
            email: 'maintenance@stpatricks.edu.zw',
            secondaryRoles: ['Maintenance Manager', 'Artisan'],
            jobTitle: 'Head of Maintenance'
        },
        {
            name: 'Mrs. Grace Sibanda',
            email: 'cleaner@stpatricks.edu.zw',
            secondaryRoles: ['Cleaner', 'Janitor'],
            jobTitle: 'Head Cleaner'
        },
        {
            name: 'Mr. Peter Chigumba',
            email: 'groundsman@stpatricks.edu.zw',
            secondaryRoles: ['Groundsman', 'Landscaper'],
            jobTitle: 'Head Groundsman'
        }
    ];
    for (const a of ancillaryData) {
        const user = await prisma.user.upsert({
            where: { email: a.email },
            update: {},
            create: {
                email: a.email,
                password: await hash('Ancillary@1234'),
                name: a.name,
                role: 'ANCILLARY',
                schoolId: school.id,
                secondaryRoles: a.secondaryRoles
            }
        });
        await createEmployeeProfile(user.id, 'ANCILLARY', a.jobTitle);
    }
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
    // ─── Seed Departments, HODs & Shift Assignments ───
    console.log('🏛️ Seeding Departments and Work Shifts...');
    // Clean old departments and shifts first
    await prisma.department.deleteMany({ where: { schoolId: school.id } });
    await prisma.shiftAssignment.deleteMany({ where: { schoolId: school.id } });
    // Create Departments
    const sportsDept = await prisma.department.create({
        data: {
            name: 'Sports & Athletics',
            code: 'SPT001',
            schoolId: school.id
        }
    });
    const agriDept = await prisma.department.create({
        data: {
            name: 'Agriculture & Operations',
            code: 'AGR001',
            schoolId: school.id
        }
    });
    const kitchenDept = await prisma.department.create({
        data: {
            name: 'Kitchen & Catering',
            code: 'KIT001',
            schoolId: school.id
        }
    });
    const sportsMaster = await prisma.user.findUnique({ where: { email: 'sports.master@stpatricks.edu.zw' } });
    const farmTeacher = await prisma.user.findUnique({ where: { email: 'farm@stpatricks.edu.zw' } });
    const kitchenMgr = await prisma.user.findUnique({ where: { email: 'kitchen.manager@stpatricks.edu.zw' } });
    const farmMgr = await prisma.user.findUnique({ where: { email: 'farm.manager@stpatricks.edu.zw' } });
    const chaplain = await prisma.user.findUnique({ where: { email: 'chaplain@stpatricks.edu.zw' } });
    if (sportsMaster) {
        await prisma.department.update({
            where: { id: sportsDept.id },
            data: { headId: sportsMaster.id }
        });
        await prisma.user.update({
            where: { id: sportsMaster.id },
            data: { departmentId: sportsDept.id }
        });
    }
    if (chaplain) {
        await prisma.user.update({
            where: { id: chaplain.id },
            data: { departmentId: sportsDept.id }
        });
    }
    if (farmTeacher) {
        await prisma.department.update({
            where: { id: agriDept.id },
            data: { headId: farmTeacher.id }
        });
        await prisma.user.update({
            where: { id: farmTeacher.id },
            data: { departmentId: agriDept.id }
        });
    }
    if (farmMgr) {
        await prisma.user.update({
            where: { id: farmMgr.id },
            data: { departmentId: agriDept.id }
        });
        // Seed shifts for farm manager
        await prisma.shiftAssignment.createMany({
            data: [
                { userId: farmMgr.id, dayOfWeek: 1, startTime: '06:00', endTime: '14:00', location: 'Section 1 Garden', task: 'Watering & weeding cabbages', schoolId: school.id },
                { userId: farmMgr.id, dayOfWeek: 2, startTime: '06:00', endTime: '14:00', location: 'Poultry Run', task: 'Feed inventory & egg collection', schoolId: school.id },
                { userId: farmMgr.id, dayOfWeek: 4, startTime: '06:00', endTime: '14:00', location: 'Section 2 Maize', task: 'Fertilizer application', schoolId: school.id }
            ]
        });
    }
    if (kitchenMgr) {
        await prisma.department.update({
            where: { id: kitchenDept.id },
            data: { headId: kitchenMgr.id }
        });
        await prisma.user.update({
            where: { id: kitchenMgr.id },
            data: { departmentId: kitchenDept.id }
        });
    }
    // ─── 7. Seed Farm & Dining Hall Data ───
    console.log('🌱 Seeding Farm & Dining Hall data...');
    const headboyUser = await prisma.user.findUnique({ where: { email: 'headboy@student.stpatricks.edu.zw' } });
    const monitorUser = await prisma.user.findUnique({ where: { email: 'monitor@student.stpatricks.edu.zw' } });
    // Clean old ones first to prevent duplicates on re-run
    await prisma.diningHallReport.deleteMany({ where: { schoolId: school.id } });
    await prisma.weeklyMenu.deleteMany({ where: { schoolId: school.id } });
    await prisma.farmLivestockBatch.deleteMany({ where: { schoolId: school.id } });
    await prisma.farmCropCycle.deleteMany({ where: { schoolId: school.id } });
    await prisma.farmInventoryItem.deleteMany({ where: { schoolId: school.id } });
    if (headboyUser && monitorUser) {
        // Dining Hall Reports
        await prisma.diningHallReport.createMany({
            data: [
                {
                    category: 'Food Quality',
                    rating: 8,
                    feedback: 'The chicken peri-peri was cooked perfectly today. Portion sizes were excellent.',
                    reportedById: headboyUser.id,
                    schoolId: school.id,
                    createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000) // 1 day ago
                },
                {
                    category: 'Portion Fairness',
                    rating: 5,
                    feedback: 'Some juniors complained that they received smaller meat portions than the seniors.',
                    reportedById: monitorUser.id,
                    schoolId: school.id,
                    createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000) // 2 days ago
                }
            ]
        });
    }
    // Weekly Menu
    await prisma.weeklyMenu.create({
        data: {
            weekStarting: new Date(),
            published: true,
            schoolId: school.id,
            menuData: {
                monday: { breakfast: "Oats with honey", lunch: "Peri-peri chicken and rice", dinner: "Veggie salad and bread" },
                tuesday: { breakfast: "Cornflakes and milk", lunch: "Beef stew and sadza", dinner: "Bean soup and bread" },
                wednesday: { breakfast: "Mabel oats", lunch: "Boiled eggs and toast", dinner: "Roasted butternut and rice" },
                thursday: { breakfast: "Porridge", lunch: "Chicken pie and chips", dinner: "Fish fillet and mash" },
                friday: { breakfast: "Pancakes", lunch: "Beef burgers", dinner: "Mixed vegetable curry" },
                saturday: { breakfast: "Bread and jam", lunch: "Macaroni and cheese", dinner: "Meatballs and spaghetti" },
                sunday: { breakfast: "Fried eggs and bacon", lunch: "Roasted chicken feast", dinner: "Light soup" }
            }
        }
    });
    // Farm Livestock Batches
    await prisma.farmLivestockBatch.createMany({
        data: [
            {
                batchName: 'Batch A - Broilers',
                type: 'Broilers',
                datePlaced: new Date('2026-03-01'),
                currentCount: 245,
                startCount: 250,
                mortalityRate: 2.0,
                status: 'Maturing',
                schoolId: school.id
            },
            {
                batchName: 'Batch B - Layers',
                type: 'Layers',
                datePlaced: new Date('2025-10-15'),
                currentCount: 200,
                startCount: 200,
                mortalityRate: 0.0,
                status: 'Producing',
                schoolId: school.id
            }
        ]
    });
    // Farm Crop Cycles
    await prisma.farmCropCycle.createMany({
        data: [
            {
                name: 'Maize Field (Sector 2)',
                type: 'Maize',
                sector: 'Sector 2',
                datePlanted: new Date('2025-11-01'),
                expectedHarvest: new Date('2026-04-30'),
                status: 'Ready for Harvest',
                schoolId: school.id
            },
            {
                name: 'Vegetable Garden (Cabbages)',
                type: 'Cabbages',
                sector: 'Sector 1',
                datePlanted: new Date('2026-02-10'),
                expectedHarvest: new Date('2026-05-15'),
                status: 'Growing',
                schoolId: school.id
            }
        ]
    });
    // Farm Inventory Items
    await prisma.farmInventoryItem.createMany({
        data: [
            {
                name: 'Chicken Grower Feed',
                category: 'Consumables (Feed)',
                quantity: '12 Bags (50kg)',
                condition: 'Adequate',
                schoolId: school.id
            },
            {
                name: 'Compound D Fertilizer',
                category: 'Consumables (Fertilizer)',
                quantity: '1 Bag (50kg)',
                condition: 'Low Stock',
                schoolId: school.id
            },
            {
                name: 'Wheelbarrows',
                category: 'Equipment',
                quantity: '4 Units',
                condition: 'Good Condition',
                schoolId: school.id
            }
        ]
    });
    console.log('✅ Farm & Dining Hall data seeded successfully.');
    // Clean old Prefect data
    console.log('🌱 Seeding Prefect Council data...');
    await prisma.prefectDuty.deleteMany({ where: { schoolId: school.id } });
    await prisma.prefectMeeting.deleteMany({ where: { schoolId: school.id } });
    await prisma.prefectReport.deleteMany({ where: { schoolId: school.id } });
    // Duties
    await prisma.prefectDuty.createMany({
        data: [
            { prefectName: 'Sarah Dube', zone: 'Dining Hall (DH)', timeSlot: '12:30 - 13:30', day: 'Monday', schoolId: school.id },
            { prefectName: 'James Banda', zone: 'Main Gate', timeSlot: '07:00 - 08:00', day: 'Tuesday', schoolId: school.id },
            { prefectName: 'Thabo Ncube', zone: 'Corridor B', timeSlot: '10:15 - 10:45', day: 'Monday', schoolId: school.id }
        ]
    });
    // Meetings
    await prisma.prefectMeeting.createMany({
        data: [
            { title: 'Full Council Session', date: new Date('2026-10-14'), chair: 'Head Boy', recordsText: 'Discussed standard of dress, lateness at assemblies, and upcoming sports fixture coordination.', schoolId: school.id },
            { title: 'Emergency Committee', date: new Date('2026-10-10'), chair: 'Senior Prefect', recordsText: 'Addressed minor corridor rowdiness. Assigned new monitors to Corridor B.', schoolId: school.id }
        ]
    });
    // Prefect Reports
    if (headboyUser) {
        await prisma.prefectReport.create({
            data: {
                studentName: 'John Sibanda',
                category: 'Uniform Violation',
                narrative: 'Found target student wearing non-regulation socks and missing school tie during morning inspection.',
                reportedById: headboyUser.id,
                schoolId: school.id
            }
        });
    }
    console.log('✅ Prefect Council data seeded successfully.');
    console.log('\n🎉 St Patrick\'s High School users seeded successfully!');
    console.log('\n📋 Test Credentials (School Code: AX-KHYVF4):');
    console.log('  Admin:          admin@stpatricks.edu.zw / Admin@1234');
    console.log('  Bursar:         bursar@stpatricks.edu.zw / Bursar@1234');
    console.log('  Librarian:      library@stpatricks.edu.zw / Library@1234');
    console.log('  Sports Master:  sports.master@stpatricks.edu.zw / Teacher@1234');
    console.log('  Chaplain:       chaplain@stpatricks.edu.zw / Teacher@1234');
    console.log('  Senior Teacher: senior.teacher@stpatricks.edu.zw / Teacher@1234');
    console.log('  Nurse/Health:   nurse@stpatricks.edu.zw / Ancillary@1234');
    console.log('  Farm Manager:   farm.manager@stpatricks.edu.zw / Ancillary@1234');
    console.log('  Kitchen Mgr:    kitchen.manager@stpatricks.edu.zw / Ancillary@1234');
    console.log('  Receptionist:   receptionist@stpatricks.edu.zw / Ancillary@1234');
    console.log('  Boarding Matron: boarding.matron@stpatricks.edu.zw / Ancillary@1234');
    console.log('  Security Guard: security@stpatricks.edu.zw / Ancillary@1234');
    console.log('  Tuckshop Mgr:   tuckshop@stpatricks.edu.zw / Ancillary@1234');
    console.log('  Driver:         driver@stpatricks.edu.zw / Ancillary@1234');
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