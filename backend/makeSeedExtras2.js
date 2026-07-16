const fs = require('fs');

let out = "import { PrismaClient, School, User, Student } from '../../src/generated/client';\n\n";
out += "export async function seedExtras2(prisma: PrismaClient, school: School, admin: User, student: Student) {\n";
out += "  console.log('  -> Seeding Extras2 for ' + school.name + '...');\n";

out += 
  const hostel = await prisma.hostel.findFirst({ where: { schoolId: school.id } });
  if (hostel) {
    await prisma.hostelRoom.create({ data: { name: 'A1', type: 'Single', numberOfBeds: 1, cost: 50, schoolId: school.id, hostelId: hostel.id } }).catch(()=>{});
  }

  await prisma.gradingScale.create({ data: { grade: 'A', minScore: 80, maxScore: 100, status: 'ACTIVE', schoolId: school.id } }).catch(()=>{});

  let uniformItem = await prisma.uniformItem.findFirst({ where: { schoolId: school.id } });
  if (!uniformItem) uniformItem = await prisma.uniformItem.create({ data: { name: 'Shirt', type: 'Top', size: 'M', price: 15, stock: 10, status: 'ACTIVE', schoolId: school.id } }).catch(()=>{});
  
  if (uniformItem) {
    let order = await prisma.uniformStockOrder.create({ data: { schoolId: school.id } }).catch(()=>{});
    if (order) {
      await prisma.uniformStockOrderItem.create({ data: { orderId: order.id, itemId: uniformItem.id, quantity: 10, unitPrice: 10 } }).catch(()=>{});
    }
  }

  let supplier = await prisma.supplier.findFirst();
  if (supplier) {
    await prisma.uniformSupplierPayment.create({ data: { supplierId: supplier.id, amount: 100, schoolId: school.id } }).catch(()=>{});
  }

  await prisma.userSession.create({ data: { userId: admin.id } }).catch(()=>{});

  let sClass = await prisma.schoolClass.findFirst({ where: { schoolId: school.id } });
  let subject = await prisma.subject.findFirst({ where: { schoolId: school.id } });
  let teacher = await prisma.teacher.findFirst({ where: { schoolId: school.id } });
  if (sClass && subject && teacher) {
    await prisma.classSubjectTeacher.create({ data: { classId: sClass.id, subjectId: subject.id, teacherId: teacher.id } }).catch(()=>{});
  }

  let dept = await prisma.department.findFirst({ where: { schoolId: school.id } });
  let faculty = await prisma.faculty.create({ data: { name: 'Science', schoolId: school.id } }).catch(()=>{});
  
  await prisma.staffAttendance.create({ data: { staffId: admin.id, schoolId: school.id } }).catch(()=>{});

  let fee = await prisma.fee.findFirst({ where: { schoolId: school.id } });
  if (fee) {
    await prisma.feeLineItem.create({ data: { feeId: fee.id, item: 'Tuition', amount: 100 } }).catch(()=>{});
  }

  await prisma.auditLog.create({ data: { actorId: admin.id, action: 'Login', entityType: 'User', schoolId: school.id } }).catch(()=>{});
  await prisma.studentHouse.create({ data: { name: 'Gryffindor', schoolId: school.id } }).catch(()=>{});
  await prisma.chaplaincyEvent.create({ data: { title: 'Sunday Service', type: 'Service', theme: 'Love', status: 'UPCOMING', schoolId: school.id } }).catch(()=>{});
  await prisma.holiday.create({ data: { title: 'Summer Break', schoolId: school.id } }).catch(()=>{});

  let assignment = await prisma.assignment.findFirst({ where: { schoolId: school.id } });
  if (assignment) {
    await prisma.assignmentSubmission.create({ data: { assignmentId: assignment.id, studentId: student.id, schoolId: school.id } }).catch(()=>{});
  }

  await prisma.schoolSetting.create({ data: { schoolId: school.id } }).catch(()=>{});
  await prisma.paymentPlan.create({ data: { schoolId: school.id, studentId: student.id, parentUserId: admin.id, amount: 500 } }).catch(()=>{});

  await prisma.visitorLog.create({ data: { name: 'John Doe', phone: '123', purpose: 'Visit', schoolId: school.id } }).catch(()=>{});
  await prisma.admissionInquiry.create({ data: { name: 'Jane Doe', phone: '123', source: 'Web', schoolId: school.id } }).catch(()=>{});
  await prisma.phoneCallLog.create({ data: { name: 'Alice', phone: '123', callType: 'Incoming', schoolId: school.id } }).catch(()=>{});
  await prisma.frontOfficeComplaint.create({ data: { complainType: 'Noise', source: 'Parent', complainBy: 'Bob', phone: '123', schoolId: school.id } }).catch(()=>{});
  await prisma.securityIncident.create({ data: { title: 'Theft', description: 'Stolen bag', reportedById: admin.id, schoolId: school.id } }).catch(()=>{});
  await prisma.weeklyMenu.create({ data: { menuData: {}, schoolId: school.id } }).catch(()=>{});

  let otherSchool = await prisma.school.findFirst({ where: { id: { not: school.id } } });
  if (otherSchool) {
    await prisma.transferAuthorization.create({ data: { studentUserId: student.userId, originSchoolId: school.id, targetSchoolId: otherSchool.id } }).catch(()=>{});
  }

  await prisma.extensionRequest.create({ data: { studentId: student.id, reason: 'Sick', durationRequested: 2, schoolId: school.id } }).catch(()=>{});

  let feeGroup = await prisma.feeGroup.findFirst({ where: { schoolId: school.id } });
  if (feeGroup && sClass) {
    await prisma.feeGroupClassAmount.create({ data: { feeGroupId: feeGroup.id, classId: sClass.id, amount: 100 } }).catch(()=>{});
  }

  let product = await prisma.physicalProduct.create({ data: { name: 'Chalk', unit: 'Box', schoolId: school.id } }).catch(()=>{});
  if (product) {
    await prisma.physicalProductConsumption.create({ data: { productId: product.id, quantity: 1, requestedBy: admin.id, schoolId: school.id } }).catch(()=>{});
  }

  await prisma.feeReminderLog.create({ data: { studentId: student.id, source: 'System', status: 'Sent', schoolId: school.id } }).catch(()=>{});
  await prisma.communicationLog.create({ data: { type: 'Email', senderId: admin.id, description: 'Test', schoolId: school.id } }).catch(()=>{});
  await prisma.notificationQueue.create({ data: { type: 'Email', payload: '{}', senderId: admin.id, schoolId: school.id } }).catch(()=>{});
  await prisma.payrollAllowance.create({ data: { name: 'Transport', schoolId: school.id } }).catch(()=>{});
  await prisma.payrollDeduction.create({ data: { name: 'Tax', schoolId: school.id } }).catch(()=>{});
  await prisma.termlyComment.create({ data: { studentId: student.id, term: 'Term 1', year: 2024, schoolId: school.id } }).catch(()=>{});

  let exam = await prisma.cBTExam.findFirst({ where: { schoolId: school.id } });
  if (exam) {
    await prisma.cBTResult.create({ data: { examId: exam.id, studentId: student.userId, score: 50, totalMarks: 100, status: 'PASSED' } }).catch(()=>{});
  }

  if (teacher && sClass) {
    await prisma.liveClass.create({ data: { schoolId: school.id, teacherId: admin.id, classId: sClass.id, title: 'Math', meetingId: '123', timeStart: '10:00', timeEnd: '11:00' } }).catch(()=>{});
    
    let course = await prisma.course.create({ data: { schoolId: school.id, teacherId: admin.id, classId: sClass.id, title: 'Algebra', courseType: 'Core', level: '1', language: 'En', category: 'Math', shortDescription: 'Desc', fullDescription: 'Desc' } }).catch(()=>{});
    if (course) {
      await prisma.courseEnrollment.create({ data: { courseId: course.id, studentId: student.id } }).catch(()=>{});
    }
  }

  await prisma.award.create({ data: { schoolId: school.id, userId: admin.id, awardName: 'Best Teacher', gift: 'Mug', amount: 0 } }).catch(()=>{});
  await prisma.meetingMinutes.create({ data: { schoolId: school.id, title: 'Staff Meeting' } }).catch(()=>{});
  await prisma.projectFunding.create({ data: { schoolId: school.id, name: 'New Block', budget: 10000 } }).catch(()=>{});

  await prisma.clinicEmergency.create({ data: { title: 'Fever', details: 'High temp', time: '10:00', schoolId: school.id } }).catch(()=>{});
  await prisma.clinicImmunization.create({ data: { userId: student.userId, title: 'Polio', details: 'Done', schoolId: school.id } }).catch(()=>{});
  await prisma.clinicReferral.create({ data: { userId: student.userId, title: 'Eye Test', details: 'Needs glasses', to: 'Hospital', address: 'City', schoolId: school.id } }).catch(()=>{});

  await prisma.diningHallReport.create({ data: { category: 'Lunch', rating: 5, feedback: 'Good', reportedById: admin.id, schoolId: school.id } }).catch(()=>{});
  await prisma.prefectMeeting.create({ data: { title: 'Discipline', chair: 'Head Boy', recordsText: 'Done', schoolId: school.id } }).catch(()=>{});
  await prisma.prefectReport.create({ data: { studentName: 'John', category: 'Late', narrative: 'Late to class', reportedById: admin.id, schoolId: school.id } }).catch(()=>{});
  
  let wallet = await prisma.studentWallet.findFirst();
  if (!wallet) wallet = await prisma.studentWallet.create({ data: { studentId: student.userId, balance: 10 } }).catch(()=>{});
  if (wallet) {
    await prisma.walletTransaction.create({ data: { walletId: wallet.id, amount: 10, type: 'Deposit' } }).catch(()=>{});
  }

  await prisma.schoolSequence.create({ data: { schoolId: school.id, entity: 'Invoice' } }).catch(()=>{});

;

out += "}\n";
fs.writeFileSync('prisma/seeders/seedExtras2.ts', out);
