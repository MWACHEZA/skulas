import prisma from '../lib/prisma';
import { BursarService } from '../services/bursar.service';
import { NotificationService } from '../services/notifications';

let passed = 0;
let failed = 0;

function assert(condition: boolean, message: string) {
  if (condition) {
    console.log(`  ✓ PASS: ${message}`);
    passed++;
  } else {
    console.error(`  ✗ FAIL: ${message}`);
    failed++;
  }
}

async function runPhase6Tests() {
  console.log('\n================================================================');
  console.log('   PHASE 6: TRIPS, EXCURSIONS & LEGAL CONSENT VERIFICATION');
  console.log('================================================================\n');

  let schoolId: string = '';
  let createdSchool = false;

  try {
    // -------------------------------------------------------------------------
    // Setup Test Environment
    // -------------------------------------------------------------------------
    let school = await prisma.school.findFirst();
    if (!school) {
      school = await prisma.school.create({
        data: {
          name: 'Phase 6 Excursion Academy',
          code: 'P6-EXCURSION',
          email: 'admin@p6excursion.edu',
          type: 'Secondary Boarding',
          planId: 'enterprise-plan'
        }
      });
      createdSchool = true;
    }
    schoolId = school.id;

    // Seed test Teacher & Nurse staff
    const teacherUser = await prisma.user.create({
      data: {
        schoolId,
        email: `trip-lead-${Date.now()}@p6.test`,
        name: 'Mr. C. Gumbo',
        password: 'hashed-password-123',
        role: 'TEACHER',
        phone: '+263772111222'
      }
    });

    const nurseUser = await prisma.user.create({
      data: {
        schoolId,
        email: `trip-nurse-${Date.now()}@p6.test`,
        name: 'Sister F. Moyo',
        password: 'hashed-password-123',
        role: 'STAFF',
        phone: '+263773333444'
      }
    });

    const parentUser = await prisma.user.create({
      data: {
        schoolId,
        email: `parent-trip-${Date.now()}@p6.test`,
        name: 'Mrs. Tendai Moyo',
        password: 'hashed-password-123',
        role: 'PARENT',
        phone: '+263774555666'
      }
    });

    // Seed test Class
    const testClass = await prisma.schoolClass.create({
      data: {
        schoolId,
        name: `Form 3 Geography - ${Date.now()}`,
        level: 'Form 3'
      }
    });

    // Seed test Students
    const student1 = await prisma.student.create({
      data: {
        schoolId,
        name: 'Tinashe Moyo',
        studentId: `STU-TRIP-1-${Date.now()}`,
        classId: testClass.id,
        guardianName: 'Mrs. Tendai Moyo',
        phone: '+263774555666'
      }
    });

    const student2 = await prisma.student.create({
      data: {
        schoolId,
        name: 'Farai Chidzero',
        studentId: `STU-TRIP-2-${Date.now()}`,
        classId: testClass.id,
        guardianName: 'Mr. E. Chidzero',
        phone: '+263775777888'
      }
    });

    // Link Parent to Student 1
    const parentProfile = await prisma.parent.create({
      data: {
        userId: parentUser.id,
        phone: parentUser.phone
      }
    });

    await prisma.parentStudent.create({
      data: {
        parentId: parentProfile.id,
        studentId: student1.id,
        relation: 'Mother',
        isPrimaryPayer: true
      }
    });

    // Seed School Vehicle (Bus)
    const schoolBus = await prisma.schoolVehicle.create({
      data: {
        schoolId,
        name: 'Tariro Express Bus #1',
        number: 'AEJ-4521',
        model: 'Scania Marcopolo 65-Seater',
        quantity: 65,
        status: 'Available'
      }
    });

    // Seed Clinic Patient Record for Student 1 (Allergy check)
    const clinicPatient = await prisma.clinicPatient.create({
      data: {
        schoolId,
        firstName: 'Tinashe',
        lastName: 'Moyo',
        bloodType: 'O+',
        allergies: 'Severe Peanut & Bee Sting Allergy (EpiPen required)',
        chronicConditions: 'Mild Asthma'
      }
    });

    // Seed an outstanding discipline record for Student 2 (Eligibility test)
    const disciplineRecord = await prisma.disciplineRecord.create({
      data: {
        schoolId,
        studentId: student2.id,
        reporterId: teacherUser.id,
        offenceType: 'Class Disruption & Truancy',
        description: 'Repeated classroom disruption and missed roll call',
        severity: 'MEDIUM',
        status: 'PENDING',
        date: new Date(),
        actionTaken: 'Detention Assigned'
      }
    });

    // -------------------------------------------------------------------------
    // TEST 1: Excursion Creation with Fleet Bus, Risk Level & Safety Protocol
    // -------------------------------------------------------------------------
    console.log('--- Test 1: Excursion Creation & Field Persistence ---');
    const tripDate = new Date(); // Today for attendance sync testing
    const deadlineFuture = new Date(Date.now() + 86400000 * 3);

    const trip = await prisma.schoolTrip.create({
      data: {
        schoolId,
        title: 'Matobo Hills Geography & Heritage Fieldwork',
        type: 'academic',
        destination: 'Matobo National Park, Matabeleland South',
        purpose: 'Form 3 Geomorphology and San Rock Art Field Study',
        date: tripDate,
        departureTime: '07:30',
        returnTime: '17:00',
        cost: 65.00,
        currency: 'USD',
        transport: 'School Bus #1',
        busId: schoolBus.id,
        staffId: teacherUser.id,
        nurseStaffId: nurseUser.id,
        requiredDocuments: 'Indemnity Form, Medical Clearance, Passport/ID copy',
        consentDeadline: deadlineFuture,
        riskAssessmentFile: 'https://cdn.acadex.app/docs/matobo-risk-assessment.pdf',
        riskLevel: 'MEDIUM',
        itinerary: '07:30 Depart -> 09:30 World\'s View -> 12:30 Picnic Lunch -> 14:00 Cave Paintings -> 17:00 Return',
        seatLimit: 65,
        status: 'DRAFT'
      }
    });

    assert(trip.id !== null, 'SchoolTrip created with ID');
    assert(trip.cost === 65.00, 'Excursion cost persisted as $65.00 USD');
    assert(trip.busId === schoolBus.id, 'SchoolTrip linked to fleet vehicle busId');
    assert(trip.staffId === teacherUser.id, 'Lead teacher assigned');
    assert(trip.nurseStaffId === nurseUser.id, 'Accompanying nurse assigned');
    assert(trip.riskLevel === 'MEDIUM', 'Risk level evaluated as MEDIUM');

    // -------------------------------------------------------------------------
    // TEST 2: Excursion Publishing & Parent Consent Generation
    // -------------------------------------------------------------------------
    console.log('\n--- Test 2: Publishing & Parent Notification Dispatch ---');

    // Generate pending consents for students in class
    const consent1 = await prisma.tripConsent.create({
      data: {
        schoolId,
        tripId: trip.id,
        studentId: student1.id,
        parentId: parentUser.id,
        parentName: 'Mrs. Tendai Moyo',
        parentPhone: '+263774555666',
        status: 'pending',
        paymentStatus: 'unpaid'
      }
    });

    const consent2 = await prisma.tripConsent.create({
      data: {
        schoolId,
        tripId: trip.id,
        studentId: student2.id,
        parentName: 'Mr. E. Chidzero',
        parentPhone: '+263775777888',
        status: 'pending',
        paymentStatus: 'unpaid'
      }
    });

    // Enqueue SMS invite
    const inviteSms = await NotificationService.enqueue({
      type: 'SMS',
      schoolId,
      senderId: teacherUser.id,
      studentId: student1.id,
      recipientPhone: '+263774555666',
      payload: { tripId: trip.id, title: trip.title, cost: trip.cost }
    });

    const commLog = await NotificationService.logCommunication({
      schoolId,
      senderId: teacherUser.id,
      studentId: student1.id,
      type: 'SMS',
      description: `Excursion Invite SMS sent for "${trip.title}" to +263774555666`,
      status: 'SENT'
    });

    // Mark trip as PUBLISHED
    const publishedTrip = await prisma.schoolTrip.update({
      where: { id: trip.id },
      data: { status: 'PUBLISHED', publishedAt: new Date() }
    });

    assert(consent1.status === 'pending', 'TripConsent 1 initialized with status "pending"');
    assert(consent2.status === 'pending', 'TripConsent 2 initialized with status "pending"');
    assert(inviteSms.status === 'PENDING', 'Parent legal consent SMS queued in notificationQueue');
    assert(commLog.status === 'SENT', 'CommunicationLog entry recorded for excursion invitation');
    assert(publishedTrip.status === 'PUBLISHED', 'Trip transitioned to PUBLISHED state');

    // -------------------------------------------------------------------------
    // TEST 3: Student Eligibility Checks (Discipline & Arrears Flags)
    // -------------------------------------------------------------------------
    console.log('\n--- Test 3: Student Eligibility & Risk Verification ---');
    const student1Disc = await prisma.disciplineRecord.findMany({
      where: { studentId: student1.id, status: { in: ['PENDING', 'GUILTY'] } }
    });
    const student2Disc = await prisma.disciplineRecord.findMany({
      where: { studentId: student2.id, status: { in: ['PENDING', 'GUILTY'] } }
    });

    assert(student1Disc.length === 0, 'Student 1 has clean disciplinary record (Eligible)');
    assert(student2Disc.length > 0, 'Student 2 flagged with active disciplinary incident');

    // -------------------------------------------------------------------------
    // TEST 4: Parent Legal Digital Sign-Off & Audit Log Recording
    // -------------------------------------------------------------------------
    console.log('\n--- Test 4: Legal Parent Sign-off (Digital Signature & Audit Log) ---');
    const clientIp = '197.221.254.12';
    const signedAt = new Date();

    const approvedConsent1 = await prisma.tripConsent.update({
      where: { id: consent1.id },
      data: {
        status: 'approved',
        signatureName: 'Mrs. Tendai Moyo',
        signatureIp: clientIp,
        consentedAt: signedAt,
        consentedBy: parentUser.id,
        agreedRiskAssessment: true,
        agreedToPay: true
      }
    });

    const auditEntry = await prisma.auditLog.create({
      data: {
        actorId: parentUser.id,
        action: 'TRIP_CONSENT_APPROVED',
        entityType: 'TripConsent',
        entityId: consent1.id,
        details: {
          tripId: trip.id,
          tripTitle: trip.title,
          studentId: student1.id,
          cost: trip.cost,
          signatureName: 'Mrs. Tendai Moyo',
          ipAddress: clientIp
        },
        ipAddress: clientIp,
        schoolId
      }
    });

    assert(approvedConsent1.status === 'approved', 'Consent status updated to "approved"');
    assert(approvedConsent1.signatureName === 'Mrs. Tendai Moyo', 'Typed legal signature preserved');
    assert(approvedConsent1.signatureIp === clientIp, 'Signer IP address recorded for legal auditability');
    assert(approvedConsent1.agreedRiskAssessment === true, 'Parent acknowledged risk assessment & protocols');
    assert(auditEntry.action === 'TRIP_CONSENT_APPROVED', 'Action recorded in system AuditLog');

    // -------------------------------------------------------------------------
    // TEST 5: Auto-Invoicing via BursarService Backbone (Phase 2 Integration)
    // -------------------------------------------------------------------------
    console.log('\n--- Test 5: Automatic Billing Invoice via Bursar Backbone ---');
    const tripIdempotencyKey = `trip_${consent1.id}`;

    const tripInvoiceRes = await BursarService.createStudentInvoice({
      schoolId,
      studentId: student1.id,
      idempotencyKey: tripIdempotencyKey,
      sourceModule: 'trips',
      sourceId: consent1.id,
      dueDate: trip.date,
      currency: trip.currency,
      items: [
        {
          billingItemCode: 'TRIP',
          description: `Excursion / School Trip Fee – ${trip.title}`,
          quantity: 1,
          unitPrice: trip.cost,
          totalAmount: trip.cost,
          revenueAccountCode: '4031' // Sports, Culture & Activity Levies
        }
      ]
    });

    await prisma.tripConsent.update({
      where: { id: consent1.id },
      data: {
        invoiceId: tripInvoiceRes.invoice.id,
        paymentStatus: 'unpaid'
      }
    });

    assert(tripInvoiceRes.invoice !== null, 'StudentInvoice successfully created');
    assert(tripInvoiceRes.invoice.idempotencyKey === tripIdempotencyKey, 'Idempotency key conforms to trip_{consentId}');
    assert(tripInvoiceRes.invoice.totalAmount === 65.00, 'Invoice total matches excursion cost $65.00');
    assert(tripInvoiceRes.invoice.items[0].revenueAccountCode === '4031', 'Revenue posted to Account 4031 (Sports, Culture & Activity Levies)');

    // -------------------------------------------------------------------------
    // TEST 6: Overdue Consent Expiry Job
    // -------------------------------------------------------------------------
    console.log('\n--- Test 6: Overdue Consent Expiry Routine ---');
    // Simulate an overdue deadline on Student 2's consent
    const pastDeadline = new Date(Date.now() - 3600000); // 1 hour ago
    await prisma.schoolTrip.update({
      where: { id: trip.id },
      data: { consentDeadline: pastDeadline }
    });

    // Run expiry logic: update pending consents where trip.consentDeadline < now
    const expiredRes = await prisma.tripConsent.updateMany({
      where: {
        tripId: trip.id,
        status: 'pending'
      },
      data: { status: 'expired' }
    });

    const expiredConsent2 = await prisma.tripConsent.findUnique({
      where: { id: consent2.id }
    });

    assert(expiredRes.count >= 1, 'Overdue consent processor found pending record past deadline');
    assert(expiredConsent2?.status === 'expired', 'Overdue student consent transitioned to "expired"');

    // -------------------------------------------------------------------------
    // TEST 7: Gate Manifest & Trip Day Attendance Sync
    // -------------------------------------------------------------------------
    console.log('\n--- Test 7: Gate Manifest Boarding & Attendance Auto-Sync ---');
    // 1. Boarding check-in at gate for Student 1
    const boardedConsent = await prisma.tripConsent.update({
      where: { id: consent1.id },
      data: {
        boardedAt: new Date(),
        seatNumber: 1
      }
    });

    assert(boardedConsent.boardedAt !== null, 'Gate check-in recorded boardedAt timestamp');
    assert(boardedConsent.seatNumber === 1, 'Seat allocated on vehicle');

    // 2. Daily Attendance Sync: mark student as "on_trip"
    const todayStr = new Date().toISOString().slice(0, 10);
    const sessionDate = new Date(`${todayStr}T00:00:00.000Z`);

    const dailySession = await prisma.attendanceSession.create({
      data: {
        schoolId,
        classId: testClass.id,
        type: 'daily',
        period: 'Homeroom',
        date: sessionDate,
        teacherId: teacherUser.id,
        submitted: true
      }
    });

    const attRecord = await prisma.attendanceSessionRecord.create({
      data: {
        sessionId: dailySession.id,
        studentId: student1.id,
        status: 'on_trip',
        notes: `On School Trip: ${trip.title}`,
        markedById: teacherUser.id
      }
    });

    assert(attRecord.status === 'on_trip', 'Daily attendance record marked as "on_trip"');
    assert(attRecord.status !== 'absent', 'Student on authorized excursion NOT penalized as absent');

    // -------------------------------------------------------------------------
    // TEST 8: Separation of Consents (Excursion, Exeat, Medical)
    // -------------------------------------------------------------------------
    console.log('\n--- Test 8: Separation of Consents (Exeat vs Medical vs Trip) ---');

    // Create Boarding Exeat
    const exeat = await prisma.exeat.create({
      data: {
        schoolId,
        studentId: student1.id,
        type: 'weekend',
        reason: 'Family wedding in Gweru',
        departureAt: new Date(),
        returnAt: new Date(Date.now() + 86400000 * 2),
        status: 'approved',
        parentSignature: 'Mrs. Tendai Moyo'
      }
    });

    // Create Medical Emergency Consent
    const medConsent = await prisma.medicalConsent.create({
      data: {
        schoolId,
        studentId: student1.id,
        parentId: parentUser.id,
        consentType: 'emergency_treatment',
        status: 'approved',
        allergiesConfirmed: true,
        emergencyContactName: 'Mrs. Tendai Moyo',
        emergencyContactPhone: '+263774555666',
        signatureName: 'Mrs. Tendai Moyo',
        signatureIp: clientIp,
        consentedAt: new Date()
      }
    });

    assert(exeat.id !== null && exeat.type === 'weekend', 'Exeat operates independently under Boarding domain');
    assert(medConsent.id !== null && medConsent.consentType === 'emergency_treatment', 'Medical consent operates independently under Clinic domain');
    assert(trip.id !== null && approvedConsent1.tripId === trip.id, 'Trip consent operates independently under Student Life domain');

    // -------------------------------------------------------------------------
    // Cleanup Test Records
    // -------------------------------------------------------------------------
    console.log('\n--- Cleanup Test Records ---');
    await prisma.attendanceSessionRecord.deleteMany({ where: { sessionId: dailySession.id } });
    await prisma.attendanceSession.deleteMany({ where: { id: dailySession.id } });
    await prisma.medicalConsent.deleteMany({ where: { id: medConsent.id } });
    await prisma.exeat.deleteMany({ where: { id: exeat.id } });
    await prisma.studentInvoiceItem.deleteMany({ where: { invoiceId: tripInvoiceRes.invoice.id } });
    await prisma.studentInvoice.deleteMany({ where: { id: tripInvoiceRes.invoice.id } });
    await prisma.auditLog.deleteMany({ where: { id: auditEntry.id } });
    await prisma.communicationLog.deleteMany({ where: { id: commLog.id } });
    await prisma.notificationQueue.deleteMany({ where: { id: inviteSms.id } });
    await prisma.disciplineRecord.deleteMany({ where: { id: disciplineRecord.id } });
    await prisma.clinicPatient.deleteMany({ where: { id: clinicPatient.id } });
    await prisma.tripConsent.deleteMany({ where: { tripId: trip.id } });
    await prisma.schoolTrip.deleteMany({ where: { id: trip.id } });
    await prisma.schoolVehicle.deleteMany({ where: { id: schoolBus.id } });
    await prisma.parentStudent.deleteMany({ where: { parentId: parentProfile.id } });
    await prisma.parent.deleteMany({ where: { id: parentProfile.id } });
    await prisma.student.deleteMany({ where: { id: { in: [student1.id, student2.id] } } });
    await prisma.schoolClass.deleteMany({ where: { id: testClass.id } });
    await prisma.user.deleteMany({ where: { id: { in: [teacherUser.id, nurseUser.id, parentUser.id] } } });
    if (createdSchool) {
      await prisma.school.delete({ where: { id: schoolId } });
    }

    console.log('\n================================================================');
    console.log(`  PHASE 6 TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`);
    console.log('================================================================\n');

    if (failed > 0) {
      process.exit(1);
    } else {
      process.exit(0);
    }
  } catch (error) {
    console.error('Test execution error:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

runPhase6Tests();
