import { PrismaClient, School, User, Student, Asset, Subject, JobApplication } from '../../src/generated/client';

export async function seedExtras(prisma: PrismaClient, school: School, admin: User, student: Student) {
  console.log('  -> Seeding Extras for ' + school.name + '...');

  // 1. Finance / Procurement
  let supplier = await prisma.supplier.findFirst();
  if (!supplier) {
    supplier = await prisma.supplier.create({
      data: { companyName: 'Acme Supplies', contactName: 'John Doe', email: 'acme@example.com', phone: '1234', address: 'Harare', taxClearance: 'TC001', prazCert: 'PRZ001', status: 'ACTIVE', userId: admin.id, globalId: 'SUP-001' }
    });
  }

  for (let i = 0; i < 10; i++) {
    const tender = await prisma.tender.create({
      data: {
        title: `Tender ${i + 1}`,
        description: `Supply of ${i + 1}0 microscopes`,
        category: 'Equipment',
        budget: 5000 + i * 100,
        openDate: new Date(),
        closeDate: new Date(Date.now() + 86400000 * 10),
        status: 'OPEN',
        schoolId: school.id
      }
    });

    await prisma.tenderBid.create({
      data: {
        tenderId: tender.id,
        supplierId: supplier.id,
        amount: 4500 + i * 100,
        proposal: `We can supply them in ${i + 1} weeks`,
        status: 'SUBMITTED',
        submittedAt: new Date()
      }
    });

    let purchaseOrder = await prisma.purchaseOrder.findFirst({ where: { poNumber: `PO-${school.code}-00${i + 1}` } });
    if (!purchaseOrder) {
      purchaseOrder = await prisma.purchaseOrder.create({
        data: {
          poNumber: `PO-${school.code}-00${i + 1}`,
          supplierId: supplier.id,
          description: `PO Description ${i + 1}`,
          items: [{ name: 'Microscope', qty: 20, price: 200 }],
          totalAmount: 4000,
          status: 'ISSUED',
          schoolId: school.id
        }
      });
    }

    let invoice = await prisma.invoice.findFirst({ where: { invoiceNo: `INV-${school.code}-00${i + 1}` } });
    if (!invoice) {
      invoice = await prisma.invoice.create({
        data: {
          invoiceNo: `INV-${school.code}-00${i + 1}`,
          supplierId: supplier.id,
          amount: 4000 + i * 100,
          status: 'UNPAID',
          dueDate: new Date(Date.now() + 86400000 * 30),
          schoolId: school.id
        }
      });
    }
  }

  // 2. Support & Operations
  for (let i = 0; i < 10; i++) {
    await prisma.supportTicket.create({
      data: {
        title: `Ticket ${i + 1}`,
        description: `Description ${i + 1}`,
        category: 'IT',
        priority: 'HIGH',
        status: 'OPEN',
        requesterId: student.userId!,
        schoolId: school.id
      }
    });
  }

  const asset = await prisma.asset.findFirst({ where: { schoolId: school.id } });
  if (asset) {
    for (let i = 0; i < 10; i++) {
      await prisma.assetIncident.create({
        data: {
          assetId: asset.id,
          reporterId: admin.id,
          issueType: 'Damage',
          details: `Damage detail ${i + 1}`,
          status: 'REPORTED',
          schoolId: school.id
        }
      });
    }
  }

  for (let i = 0; i < 10; i++) {
    await prisma.shiftAssignment.create({
      data: {
        userId: admin.id,
        dayOfWeek: (i % 7) + 1,
        startTime: '08:00',
        endTime: '17:00',
        task: `Shift ${i + 1}`,
        schoolId: school.id
      }
    });
  }

  // 3. Communications & HR
  for (let i = 0; i < 10; i++) {
    await prisma.schoolEvent.create({
      data: {
        title: `Event ${i + 1}`,
        description: `Description ${i + 1}`,
        date: new Date(Date.now() + 86400000 * (i + 10)),
        category: 'Celebration',
        schoolId: school.id
      }
    });
  }

  for (let i = 0; i < 10; i++) {
    let application = await prisma.application.create({
      data: { applicantName: `Applicant ${i + 1}`, email: `app${i + 1}@example.com`, phone: '1234', dob: new Date(), gender: 'Female', appType: 'Student', status: 'PENDING', schoolId: school.id }
    });
    
    await prisma.applicantDocument.create({
      data: {
        applicationId: application.id,
        name: 'Resume',
        url: 'https://example.com/resume.pdf',
        status: 'VERIFIED'
      }
    });

    await prisma.applicantTimeline.create({
      data: {
        applicationId: application.id,
        event: 'Applied',
        occurredAt: new Date()
      }
    });
  }

  // 4. Academics
  const subject = await prisma.subject.findFirst({ where: { schoolId: school.id } });
  let teacher = await prisma.teacher.findFirst({ where: { schoolId: school.id } });
  if (subject && teacher) {
    for (let i = 0; i < 10; i++) {
      await prisma.digitalResource.create({
        data: {
          title: `Digital Resource ${i + 1}`,
          fileUrl: 'https://example.com/maths.pdf',
          fileType: 'PDF',
          category: 'Past Paper',
          teacherId: teacher.id,
          subjectId: subject.id,
          schoolId: school.id
        }
      });
    }
  }

  let reportTemplate = await prisma.reportTemplate.findFirst({ where: { schoolId: school.id } });
  if (!reportTemplate) {
    reportTemplate = await prisma.reportTemplate.create({
      data: {
        schoolId: school.id,
        config: { showGrades: true, showAttendance: true }
      }
    });
  }

  for (let i = 0; i < 10; i++) {
    await prisma.academicReport.create({
      data: {
        studentId: student.userId!,
        term: `Term ${i % 3 + 1}`,
        year: '2024',
        data: { math: 'A', science: 'B' },
        publishedStudent: true,
        publishedParent: true,
        schoolId: school.id
      }
    });
  }
}
