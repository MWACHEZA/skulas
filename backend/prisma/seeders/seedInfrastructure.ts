import { PrismaClient, School, Student } from '@prisma/client';

export async function seedInfrastructure(
  prisma: PrismaClient,
  school: School,
  students: Student[]
) {
  console.log(`  -> Seeding Infrastructure for ${school.name}...`);

  // 1. Hostels & Rooms
  const hostelCat = await prisma.hostelCategory.create({
    data: { name: 'Boys Hostel', schoolId: school.id }
  });

  const hostel = await prisma.hostel.create({
    data: { name: 'Block A', capacity: 100, type: 'Boys', categoryId: hostelCat.id, schoolId: school.id }
  });

  for (let i = 0; i < 10; i++) {
    await prisma.hostel.create({
      data: { name: `Block ${i + 2}`, capacity: 100, type: 'Boys', categoryId: hostelCat.id, schoolId: school.id }
    });

    const room = await prisma.room.create({
      data: { name: `Room 10${i + 1}`, capacity: 4, hostelId: hostel.id }
    });

    if (i < students.length) {
      await prisma.student.update({
        where: { id: students[i].id },
        data: { boardingStatus: 'Boarder', hostelId: hostel.id, roomId: room.id }
      });
      
      const admin = await prisma.user.findFirst({ where: { schoolId: school.id } });
      if (admin) {
        await prisma.boardingLog.create({
          data: { studentId: students[i].id, type: 'SIGN_OUT', timestamp: new Date(), authorizedById: admin.id, schoolId: school.id }
        });
      }
    }
  }

  // 2. Transport & Vehicles
  for (let i = 0; i < 10; i++) {
    const vehicle = await prisma.schoolVehicle.create({
      data: { name: `Bus ${i + 1}`, number: `AB123${i}CD`, schoolId: school.id }
    });

    const route = await prisma.transportRoute.create({
      data: { name: `Route ${i + 1}`, schoolId: school.id }
    });

    await prisma.schoolTransport.create({
      data: { name: `Transport ${i + 1}`, vehicleId: vehicle.id, routeId: route.id, schoolId: school.id }
    });
  }

  // 3. Assets
  for (let i = 0; i < 10; i++) {
    const asset = await prisma.asset.create({
      data: { name: `Projector ${i + 1}`, serialNumber: `PRJ-00${i + 1}`, category: 'Electronics', purchaseDate: new Date(), purchasePrice: 500, location: `Room 10${i + 1}`, schoolId: school.id }
    });

    await prisma.assetMaintenance.create({
      data: { assetId: asset.id, scheduledDate: new Date(), description: `Routine checkup ${i + 1}`, schoolId: school.id }
    });
  }

}
