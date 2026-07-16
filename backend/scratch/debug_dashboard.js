const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testDashboard(schoolId) {
  try {
    console.log(`Testing dashboard for schoolId: ${schoolId}`);
    
    const totalStudents = await prisma.student.count({ where: { schoolId } });
    console.log('Total Students:', totalStudents);

    const totalTeachers = await prisma.teacher.count({ where: { schoolId } });
    console.log('Total Teachers:', totalTeachers);

    const pendingApplications = await prisma.application.count({ where: { schoolId, status: 'pending' } });
    console.log('Pending Applications:', pendingApplications);

    // This aggregate often fails if schema is mismatched or data is null
    const totalRevenue = await prisma.fee.aggregate({ 
      where: { student: { schoolId } }, 
      _sum: { paid: true } 
    });
    console.log('Total Revenue:', totalRevenue);

    const reportsCount = await prisma.academicReport.count({ where: { schoolId } });
    console.log('Reports Count:', reportsCount);

    const recentApplications = await prisma.application.findMany({
      where: { schoolId },
      orderBy: { createdAt: 'desc' },
      take: 5,
    });
    console.log('Recent Applications Count:', recentApplications.length);

  } catch (err) {
    console.error('DASHBOARD ERROR:', err);
  }
}

// Get the schoolId for "St Patrick's Primary" from the previous debug run
// Based on the ID format, it's likely a cuid.
async function run() {
    const school = await prisma.school.findFirst({
        where: { name: { contains: "St Patrick's" } }
    });
    if (school) {
        await testDashboard(school.id);
    } else {
        console.log("School not found");
    }
}

run().finally(() => prisma.$disconnect());
