/**
 * Staging Database Seed Script
 *
 * Seeds the staging database with a realistic data volume:
 * - 3 school tenants
 * - 80+ teacher accounts per tenant
 * - 500+ students per tenant with years of historical attendance/grade/fee records
 *
 * Run AFTER the staging DB is up:
 *   node tests/load/seed_staging.js
 *
 * Requires: DATABASE_URL env pointing to the staging DB (port 5433)
 */

const { PrismaClient } = require('../../backend/src/generated/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient({
  datasources: { db: { url: process.env.DATABASE_URL || 'postgresql://acadex_staging:staging_secret@localhost:5433/acadex_staging' } }
});

const TENANTS = [
  { code: 'STAGING-01', name: 'Staging School Alpha' },
  { code: 'STAGING-02', name: 'Staging School Beta' },
  { code: 'STAGING-03', name: 'Staging School Gamma' },
];

const HASHED_PASSWORD = bcrypt.hashSync('StagingPass123!', 10);

async function seedTenant(tenantConfig, index) {
  console.log(`\n[Seed] Creating tenant: ${tenantConfig.name} (${tenantConfig.code})`);

  // Create school
  const school = await prisma.school.upsert({
    where: { code: tenantConfig.code },
    update: {},
    create: {
      name: tenantConfig.name,
      code: tenantConfig.code,
      status: 'active',
      settings: { create: {} },
    }
  });

  // Create classes
  const classes = [];
  for (let c = 1; c <= 5; c++) {
    const cls = await prisma.class.upsert({
      where: { id: `${tenantConfig.code.toLowerCase()}-class-${c}` },
      update: {},
      create: {
        id: `${tenantConfig.code.toLowerCase()}-class-${c}`,
        name: `Form ${c}`,
        schoolId: school.id,
        year: '2025',
      }
    });
    classes.push(cls);
  }

  // Create 80 teacher accounts
  const numTeachers = 80;
  console.log(`[Seed] Creating ${numTeachers} teachers for ${tenantConfig.code}`);
  for (let t = 1; t <= numTeachers; t++) {
    const email = `teacher${t}@${tenantConfig.code.toLowerCase().replace('-', '')}.acadex.com`;
    await prisma.user.upsert({
      where: { email },
      update: {},
      create: {
        name: `Teacher ${t} ${tenantConfig.name}`,
        email,
        password: HASHED_PASSWORD,
        role: 'TEACHER',
        schoolId: school.id,
      }
    });
  }

  // Create 2 admin accounts
  for (let a = 1; a <= 2; a++) {
    const email = `admin${a}@${tenantConfig.code.toLowerCase().replace('-', '')}.acadex.com`;
    await prisma.user.upsert({
      where: { email },
      update: {},
      create: {
        name: `Admin ${a} ${tenantConfig.name}`,
        email,
        password: HASHED_PASSWORD,
        role: 'SCHOOL_ADMIN',
        schoolId: school.id,
      }
    });
  }

  // Create 500 students per tenant
  const numStudents = 500;
  console.log(`[Seed] Creating ${numStudents} students for ${tenantConfig.code}`);
  for (let s = 1; s <= numStudents; s++) {
    const classId = classes[s % classes.length].id;
    const studentId = `${tenantConfig.code}-STU-${String(s).padStart(4, '0')}`;

    const studentUser = await prisma.user.upsert({
      where: { email: `student${s}@${tenantConfig.code.toLowerCase().replace('-', '')}.acadex.com` },
      update: {},
      create: {
        name: `Student ${s}`,
        email: `student${s}@${tenantConfig.code.toLowerCase().replace('-', '')}.acadex.com`,
        password: HASHED_PASSWORD,
        role: 'STUDENT',
        schoolId: school.id,
      }
    });

    const student = await prisma.student.upsert({
      where: { id: `${tenantConfig.code.toLowerCase()}-student-${s}` },
      update: {},
      create: {
        id: `${tenantConfig.code.toLowerCase()}-student-${s}`,
        name: `Student ${s}`,
        studentId,
        email: studentUser.email,
        classId,
        schoolId: school.id,
      }
    });

    // Seed 2 years of historical attendance (fast insert, batch)
    const attendanceRecords = [];
    const today = new Date();
    for (let d = 0; d < 365; d++) {
      const date = new Date(today);
      date.setDate(today.getDate() - d);
      // Skip weekends
      if (date.getDay() === 0 || date.getDay() === 6) continue;
      attendanceRecords.push({
        studentId: student.id,
        schoolId: school.id,
        classId,
        date,
        status: ['Present', 'Absent', 'Late'][Math.floor(Math.random() * 3)],
        scanMethod: 'Manual',
        teacherId: 'system-seed',
      });
    }

    // Insert in batches of 50 to avoid overwhelming Prisma
    for (let i = 0; i < attendanceRecords.length; i += 50) {
      await prisma.attendance.createMany({
        data: attendanceRecords.slice(i, i + 50),
        skipDuplicates: true,
      });
    }

    // Seed 2 years of fee records
    for (let y = 2024; y <= 2025; y++) {
      for (const term of ['Term 1', 'Term 2', 'Term 3']) {
        await prisma.fee.upsert({
          where: { id: `fee-${tenantConfig.code}-${s}-${y}-${term}` },
          update: {},
          create: {
            id: `fee-${tenantConfig.code}-${s}-${y}-${term}`,
            studentId: student.id,
            schoolId: school.id,
            description: `School Fees ${term} ${y}`,
            amount: 2500,
            paid: 2500,
            year: String(y),
            term,
            type: 'tuition',
          }
        });
      }
    }

    if (s % 100 === 0) console.log(`[Seed]   ... ${s}/${numStudents} students done`);
  }

  console.log(`[Seed] ✅ Tenant ${tenantConfig.code} seeded.`);
}

async function main() {
  console.log('[Seed] Starting staging database seed...');
  for (let i = 0; i < TENANTS.length; i++) {
    await seedTenant(TENANTS[i], i);
  }
  console.log('\n[Seed] 🎉 All tenants seeded successfully.');
  console.log('[Seed] Now update the k6 scripts with real staging IDs from the DB.');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
