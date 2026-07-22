import { PrismaClient, School, User, Student } from '../../src/generated/client';
export async function seedExtras2(prisma: PrismaClient, school: School, admin: User, student: Student) {
  console.log('  -> Seeding Extras2 for ' + school.name + '...');
  for (let i = 0; i < 10; i++) {
    const hostel = await prisma.hostel.findFirst({ where: { schoolId: school.id } });
    if (hostel) { try { await prisma.hostelRoom.create({ data: { name: `A1-${i}`, type: 'Single', numberOfBeds: 1, cost: 50, schoolId: school.id } }); } catch(e){} }
    try { await prisma.gradingScale.create({ data: { grade: `A${i}`, minScore: 80, maxScore: 100, status: 'ACTIVE', schoolId: school.id } }); } catch(e){}
    
    let uniformItem = await prisma.uniformItem.findFirst({ where: { schoolId: school.id } });
    if (!uniformItem) { try { uniformItem = await prisma.uniformItem.create({ data: { name: `Shirt ${i}`, sellingPrice: 15, stockLevel: 10, schoolId: school.id } }); } catch(e){} }
    if (uniformItem) {
      let order; try { order = await prisma.uniformStockOrder.create({ data: { schoolId: school.id } }); } catch(e){}
      if (order) { try { await prisma.uniformStockOrderItem.create({ data: { orderId: order.id, itemId: uniformItem.id, quantity: 10, unitPrice: 10 } }); } catch(e){} }
    }
    
    let supplier = await prisma.supplier.findFirst();
    if (supplier) { try { await prisma.uniformSupplierPayment.create({ data: { supplierId: supplier.id, amount: 100, schoolId: school.id } }); } catch(e){} }
    
    try { await prisma.userSession.create({ data: { userId: admin.id, expiresAt: new Date(Date.now() + 86400000) } }); } catch(e){}
    
    let sClass = await prisma.schoolClass.findFirst({ where: { schoolId: school.id } });
    let subject = await prisma.subject.findFirst({ where: { schoolId: school.id } });
    let teacher = await prisma.teacher.findFirst({ where: { schoolId: school.id } });
    if (sClass && subject && teacher) { try { await prisma.classSubjectTeacher.create({ data: { classId: sClass.id, subjectId: subject.id, teacherId: teacher.id } }); } catch(e){} }
    
    try { await prisma.faculty.create({ data: { name: `Science ${i}`, schoolId: school.id } }); } catch(e){}
    try { await prisma.staffAttendance.create({ data: { staffId: admin.id, schoolId: school.id, date: new Date(Date.now() - 86400000 * i) } }); } catch(e){}
    
    let fee = await prisma.fee.findFirst({ where: { schoolId: school.id } });
    if (fee) { try { await prisma.feeLineItem.create({ data: { feeId: fee.id, item: `Tuition ${i}`, amount: 100 } }); } catch(e){} }
    
    try { await prisma.auditLog.create({ data: { actorId: admin.id, action: `Login ${i}`, entityType: 'User', schoolId: school.id } }); } catch(e){}
    try { await prisma.studentHouse.create({ data: { name: `Gryffindor ${i}`, schoolId: school.id } }); } catch(e){}
    try { await prisma.chaplaincyEvent.create({ data: { title: `Sunday Service ${i}`, type: 'Service', theme: 'Love', status: 'UPCOMING', schoolId: school.id, date: new Date() } }); } catch(e){}
    try { await prisma.holiday.create({ data: { title: `Summer Break ${i}`, startDate: new Date(), endDate: new Date(), schoolId: school.id } }); } catch(e){}
    
    let assignment = await prisma.assignment.findFirst({ where: { schoolId: school.id } });
    if (assignment) { try { await prisma.assignmentSubmission.create({ data: { assignmentId: assignment.id, studentId: student.id, schoolId: school.id } }); } catch(e){} }
    
    try { await prisma.schoolSetting.create({ data: { schoolId: school.id } }); } catch(e){}
    try { await prisma.paymentPlan.create({ data: { schoolId: school.id, studentId: student.id, parentUserId: admin.id, amount: 500, dueDate: new Date() } }); } catch(e){}
    try { await prisma.visitorLog.create({ data: { name: `John Doe ${i}`, phone: '123', purpose: 'Visit', schoolId: school.id } }); } catch(e){}
    try { await prisma.admissionInquiry.create({ data: { name: `Jane Doe ${i}`, phone: '123', source: 'Web', schoolId: school.id } }); } catch(e){}
    try { await prisma.phoneCallLog.create({ data: { name: `Alice ${i}`, phone: '123', callType: 'Incoming', schoolId: school.id } }); } catch(e){}
    try { await prisma.frontOfficeComplaint.create({ data: { complainType: `Noise ${i}`, source: 'Parent', complainBy: 'Bob', phone: '123', schoolId: school.id } }); } catch(e){}
    try { await prisma.securityIncident.create({ data: { title: `Theft ${i}`, description: 'Stolen bag', reportedById: admin.id, schoolId: school.id } }); } catch(e){}
    try { await prisma.weeklyMenu.create({ data: { menuData: {}, weekStarting: new Date(Date.now() + 86400000 * 7 * i), schoolId: school.id } }); } catch(e){}
    
    let otherSchool = await prisma.school.findFirst({ where: { id: { not: school.id } } });
    if (otherSchool) { try { await prisma.transferAuthorization.create({ data: { studentUserId: student.userId!, originSchoolId: school.id, targetSchoolId: otherSchool.id, expiresAt: new Date() } }); } catch(e){} }
    
    try { await prisma.extensionRequest.create({ data: { studentId: student.id, reason: `Sick ${i}`, durationRequested: 2, schoolId: school.id } }); } catch(e){}
    
    let feeGroup = await prisma.feeGroup.findFirst({ where: { schoolId: school.id } });
    if (feeGroup && sClass) { try { await prisma.feeGroupClassAmount.create({ data: { feeGroupId: feeGroup.id, classId: sClass.id, amount: 100 } }); } catch(e){} }
    
    let product; try { product = await prisma.physicalProduct.create({ data: { name: `Chalk ${i}`, unit: 'Box', schoolId: school.id } }); } catch(e){}
    if (product) { try { await prisma.physicalProductConsumption.create({ data: { productId: product.id, quantity: 1, requestedBy: admin.id, date: new Date(), schoolId: school.id } }); } catch(e){} }
    
    try { await prisma.feeReminderLog.create({ data: { studentId: student.id, source: `System ${i}`, status: 'Sent', schoolId: school.id } }); } catch(e){}
    try { await prisma.communicationLog.create({ data: { type: 'Email', senderId: admin.id, description: `Test ${i}`, schoolId: school.id } }); } catch(e){}
    try { await prisma.notificationQueue.create({ data: { type: 'Email', payload: '{}', senderId: admin.id, schoolId: school.id } }); } catch(e){}
    try { await prisma.payrollAllowance.create({ data: { name: `Transport ${i}`, schoolId: school.id } }); } catch(e){}
    try { await prisma.payrollDeduction.create({ data: { name: `Tax ${i}`, schoolId: school.id } }); } catch(e){}
    try { await prisma.termlyComment.create({ data: { studentId: student.id, term: `Term ${i % 3 + 1}`, year: 2024, schoolId: school.id } }); } catch(e){}
    
    let exam = await prisma.cBTExam.findFirst({ where: { schoolId: school.id } });
    if (exam) { try { await prisma.cBTResult.create({ data: { examId: exam.id, studentId: student.userId!, score: 50, totalMarks: 100, status: 'PASSED' } }); } catch(e){} }
    
    if (teacher && sClass) {
      try { await prisma.liveClass.create({ data: { schoolId: school.id, teacherId: admin.id, classId: sClass.id, title: `Math ${i}`, meetingId: '123', timeStart: '10:00', timeEnd: '11:00', date: new Date() } }); } catch(e){}
      let course; try { course = await prisma.course.create({ data: { schoolId: school.id, teacherId: admin.id, classId: sClass.id, title: `Algebra ${i}`, courseType: 'Core', level: '1', language: 'En', category: 'Math', shortDescription: 'Desc', fullDescription: 'Desc' } }); } catch(e){}
      if (course) { try { await prisma.courseEnrollment.create({ data: { courseId: course.id, studentId: student.id } }); } catch(e){} }
    }
    
    try { await prisma.award.create({ data: { schoolId: school.id, userId: admin.id, awardName: `Best Teacher ${i}`, gift: 'Mug', amount: 0, date: new Date() } }); } catch(e){}
    try { await prisma.meetingMinutes.create({ data: { schoolId: school.id, title: `Staff Meeting ${i}`, date: new Date() } }); } catch(e){}
    try { await prisma.projectFunding.create({ data: { schoolId: school.id, name: `New Block ${i}`, budget: 10000 } }); } catch(e){}
    try { await prisma.clinicEmergency.create({ data: { title: `Fever ${i}`, details: 'High temp', time: '10:00', schoolId: school.id } }); } catch(e){}
    try { await prisma.clinicImmunization.create({ data: { userId: student.userId!, title: `Polio ${i}`, details: 'Done', schoolId: school.id } }); } catch(e){}
    try { await prisma.clinicReferral.create({ data: { userId: student.userId!, title: `Eye Test ${i}`, details: 'Needs glasses', to: 'Hospital', address: 'City', schoolId: school.id } }); } catch(e){}
    try { await prisma.diningHallReport.create({ data: { category: `Lunch ${i}`, rating: 5, feedback: 'Good', reportedById: admin.id, schoolId: school.id } }); } catch(e){}
    try { await prisma.prefectMeeting.create({ data: { title: `Discipline ${i}`, chair: 'Head Boy', recordsText: 'Done', date: new Date(), schoolId: school.id } }); } catch(e){}
    try { await prisma.prefectReport.create({ data: { studentName: `John ${i}`, category: 'Late', narrative: 'Late to class', reportedById: admin.id, schoolId: school.id } }); } catch(e){}
    
    let wallet = await prisma.studentWallet.findFirst({ where: { studentId: student.userId! } });
    if (!wallet) { try { wallet = await prisma.studentWallet.create({ data: { studentId: student.userId!, balance: 10 } }); } catch(e){} }
    if (wallet) { try { await prisma.walletTransaction.create({ data: { walletId: wallet.id, amount: 10, type: 'Deposit' } }); } catch(e){} }
    
    try { await prisma.schoolSequence.create({ data: { schoolId: school.id, entity: `Invoice ${i}` } }); } catch(e){}
  }
}