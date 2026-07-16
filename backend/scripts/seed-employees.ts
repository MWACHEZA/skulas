import { PrismaClient } from '../src/generated/client';

const prisma = new PrismaClient();

async function backfillEmployeeProfiles() {
  console.log('Starting employee profile backfill...');
  
  // Find all Staff members (excluding students, parents, applicants, and system)
  const staffRoles = ['TEACHER', 'BURSAR', 'LIBRARIAN', 'ANCILLARY', 'SCHOOL_ADMIN', 'SUPER_ADMIN'];
  
  const usersWithoutProfile = await prisma.user.findMany({
    where: {
      role: { in: staffRoles },
      employeeProfile: null
    }
  });

  console.log(`Found ${usersWithoutProfile.length} staff members needing a payroll profile.`);

  let createdCount = 0;
  for (const user of usersWithoutProfile) {
    // Only attempt if they have a school linked
    if (!user.schoolId) {
      console.log(`Skipping user ${user.id} (${user.email}): No schoolId`);
      continue;
    }

    try {
      await prisma.employeeProfile.create({
        data: {
          userId: user.id,
          schoolId: user.schoolId,
          basePay: 0,
          payFrequency: 'MONTHLY',
          contractType: 'Permanent',
          status: user.isLocked ? 'Inactive' : 'Active',
          hireDate: user.createdAt,
          jobTitle: user.role === 'SCHOOL_ADMIN' ? 'Administrator' 
                  : user.role.charAt(0).toUpperCase() + user.role.slice(1).toLowerCase() // Basic titling
        }
      });
      createdCount++;
    } catch (error) {
      console.error(`Failed to create profile for user ${user.id}:`, error);
    }
  }

  console.log(`Backfill complete. Created ${createdCount} payroll profiles.`);
}

backfillEmployeeProfiles()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
