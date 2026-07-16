import { PrismaClient, School, Student, User } from '../../src/generated/client';

export async function seedOperations(
  prisma: PrismaClient,
  school: School,
  students: Student[],
  staff: User[]
) {
  console.log(`  -> Seeding Operations for ${school.name}...`);

  // 1. Clinic
  // 1. Clinic
  for (let i = 0; i < 10; i++) {
    if (i < students.length) {
      await prisma.clinicAppointment.create({
        data: { userId: students[i].userId!, appointment: `Checkup ${i + 1}`, symptoms: 'Fever', date: new Date(), schoolId: school.id }
      });
      await prisma.clinicComplaint.create({
        data: { userId: students[i].userId!, title: `Complaint ${i + 1}`, symptoms: 'Severe headache', date: new Date(), schoolId: school.id }
      });
    }
  }

  // 2. Farm
  for (let i = 0; i < 10; i++) {
    await prisma.farmLivestockBatch.create({
      data: { batchName: `B-00${i + 1}`, type: 'Broilers', datePlaced: new Date(), currentCount: 100, startCount: 105, mortalityRate: 5, status: 'Growing', schoolId: school.id }
    });
    await prisma.farmCropCycle.create({
      data: { name: `Maize Field ${i + 1}`, type: 'Maize', sector: 'North Field', datePlanted: new Date(), expectedHarvest: new Date(Date.now() + 86400000 * 90), status: 'Growing', schoolId: school.id }
    });
    await prisma.farmInventoryItem.create({
      data: { name: `Feed ${i + 1}`, category: 'Feed', quantity: '50', condition: 'Good', schoolId: school.id }
    });
  }

  // 3. Clubs, Sports, Prefects
  for (let i = 0; i < 10; i++) {
    const club = await prisma.club.create({
      data: { name: `Club ${i + 1}`, description: `Club description ${i + 1}`, schoolId: school.id }
    });
    if (i < students.length) {
      await prisma.student.update({
        where: { id: students[i].id },
        data: { clubId: club.id }
      });
    }

    const sport = await prisma.sport.create({
      data: { name: `Sport ${i + 1}`, category: 'Outdoor', schoolId: school.id }
    });
    await prisma.sportingEquipment.create({
      data: { name: `Equipment ${i + 1}`, quantity: 10, condition: 'Good', sportId: sport.id, schoolId: school.id }
    });

    await prisma.prefectDuty.create({
      data: { prefectName: `Prefect ${i + 1}`, zone: `Zone ${i + 1}`, timeSlot: 'Lunch Time', day: 'Monday', schoolId: school.id }
    });
  }

  // 4. Library
  const cat = await prisma.libraryCategory.upsert({
    where: { schoolId_name: { schoolId: school.id, name: 'General Textbooks' } },
    update: {},
    create: { name: 'General Textbooks', schoolId: school.id }
  });

  for (let i = 0; i < 10; i++) {
    const book = await prisma.book.create({
      data: { title: `Book ${i + 1}`, author: `Author ${i + 1}`, isbn: `987-654-32${i}`, copies: 5, available: 4, categoryId: cat.id, schoolId: school.id }
    });
    if (i < students.length) {
      await prisma.bookLoan.create({
        data: { bookId: book.id, studentId: students[i].id, dueDate: new Date(), status: 'borrowed', schoolId: school.id },
      });
    }
  }

  // 5. Staff Leave & Requisitions
  for (let i = 0; i < 10; i++) {
    if (staff.length > 0) {
      await prisma.staffLeave.create({
        data: { userId: staff[0].id, leaveType: 'annual', startDate: new Date(), endDate: new Date(Date.now() + 86400000 * 5), reason: `Vacation ${i + 1}`, status: 'approved', schoolId: school.id }
      });
      
      let dept = await prisma.department.findFirst({ where: { schoolId: school.id, name: `Department ${i + 1}` } });
      if (!dept) {
        dept = await prisma.department.create({
          data: { name: `Department ${i + 1}`, schoolId: school.id }
        });
      }
      
      let requisition = await prisma.requisition.findFirst({ where: { refNumber: `REQ-00${i + 1}` } });
      if (!requisition) {
        requisition = await prisma.requisition.create({
          data: { refNumber: `REQ-00${i + 1}`, title: `Request ${i + 1}`, estimatedAmount: 2000, requesterId: staff[0].id, status: 'PENDING', schoolId: school.id }
        });
      }
    }
  }
}
