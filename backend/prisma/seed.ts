import { PrismaClient } from '../src/generated/client';
import { seedUsers } from './seeders/seedUsers';
import { seedAcademics } from './seeders/seedAcademics';
import { seedFinance } from './seeders/seedFinance';
import { seedInfrastructure } from './seeders/seedInfrastructure';
import { seedOperations } from './seeders/seedOperations';
import { seedCommunications } from './seeders/seedCommunications';
import { seedExtras } from './seeders/seedExtras';
import { seedExtras2 } from './seeders/seedExtras2';

const prisma = new PrismaClient();

async function seedSchoolData(
  schoolCode: string,
  schoolName: string,
  schoolType: string,
  planId: string,
  emailPrefix: string
) {
  console.log(`\n--- Seeding ${schoolName} (${schoolType}) ---`);

  // 1. Core School Creation
  const school = await prisma.school.upsert({
    where: { code: schoolCode },
    update: {},
    create: {
      code: schoolCode,
      name: schoolName,
      type: schoolType,
      address: 'Harare, Zimbabwe',
      country: 'Zimbabwe',
      email: `admin@${emailPrefix}`,
      phone: '+263 123 456 789',
      status: 'active',
      planId: planId,
    },
  });

  // 2. Delegate to Domain Seeders
  const { dbTeachers, dbStudents, adminUser, bursarUser, parent, supplier } = await seedUsers(prisma, school, emailPrefix);
  
  await seedAcademics(prisma, school, dbTeachers, dbStudents);
  
  await seedFinance(prisma, school, dbStudents, [adminUser, bursarUser]);
  
  await seedInfrastructure(prisma, school, dbStudents);
  
  await seedOperations(prisma, school, dbStudents, [adminUser, bursarUser]);
  
  await seedCommunications(prisma, school);

  await seedExtras(prisma, school, adminUser, dbStudents[0]);
  await seedExtras2(prisma, school, adminUser, dbStudents[0]);

  console.log(`  -> Completed seeding for ${school.name}`);
}

async function main() {
  console.log('🌱 Seeding database with comprehensive data for ALL 150+ tables...');

  // ─── Plans ────────────────────────────────────────────────────────
  const starterPlan = await prisma.plan.upsert({
    where: { name: 'Starter' },
    update: { price: 49 },
    create: { name: 'Starter', price: 49, features: ['Student Management (up to 200)'] },
  });
  
  const proPlan = await prisma.plan.upsert({
    where: { name: 'Professional' },
    update: { price: 149 },
    create: { name: 'Professional', price: 149, features: ['Everything in Starter', 'Student Management (up to 800)'] },
  });
  
  const enterprisePlan = await prisma.plan.upsert({
    where: { name: 'Enterprise' },
    update: { price: 999 },
    create: { name: 'Enterprise', price: 999, features: ['Everything in Professional', 'Multi-Campus & API Access'] },
  });

  // Seed Each School
  await seedSchoolData('AX-EMBAKWE', 'Embakwe High School', 'secondary', proPlan.id, 'embakwehigh.edu.zw');
  await seedSchoolData('AX-PRIMARY', 'Sunshine Primary School', 'primary', starterPlan.id, 'sunshineprimary.edu.zw');
  await seedSchoolData('AX-TERTIARY', 'National University of Tech', 'tertiary', enterprisePlan.id, 'nut.ac.zw');
  await seedSchoolData('AX-NURSING', 'Nightingale School of Nursing', 'tertiary', enterprisePlan.id, 'nightingalenursing.ac.zw');
  await seedSchoolData('AX-SEMINARY', 'St. Peter Seminary', 'tertiary', proPlan.id, 'stpeterseminary.org');

  console.log('\n🎉 Database seeded successfully with FULL 150+ TABLE DATA for all 5 schools!');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
