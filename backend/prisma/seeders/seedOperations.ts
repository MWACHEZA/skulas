import { PrismaClient, School, Student, User } from '../../src/generated/client';

export async function seedOperations(
  prisma: PrismaClient,
  school: School,
  students: Student[],
  staff: User[],
  clinicStaff?: User[]
) {
  console.log(`  -> Seeding Operations & Clinic Data for ${school.name}...`);

  // 1. Clinic (Rich intertwined medical & health records)
  const appointmentTemplates = [
    { appointment: 'Annual Routine Medical & Vitals Screening', symptoms: 'Routine checkup, BP 120/80, Pulse 72 bpm', medicine: 'Multivitamin Supplements' },
    { appointment: 'Asthma Management & Inhaler Review', symptoms: 'Wheezing after exercise, mild cough', medicine: 'Salbutamol Inhaler 100mcg' },
    { appointment: 'Sports Trauma & Sprain Evaluation', symptoms: 'Right ankle edema & localized tenderness', medicine: 'Ibuprofen 400mg, Cold Compress, Ankle Support' },
    { appointment: 'Pre-Clinical Rotation Health Clearance', symptoms: 'Fit for clinical hospital duty, clear chest', medicine: 'Immunity Clearance Certificate' },
    { appointment: 'Ophthalmic & Vision Screening', symptoms: 'Difficulty reading whiteboards from back row', medicine: 'Optometry Referral Issued' },
    { appointment: 'Hypertension Follow-Up Check', symptoms: 'Mild occipital headache, BP 142/90', medicine: 'Amlodipine 5mg' },
    { appointment: 'Allergic Rhinitis Consultation', symptoms: 'Nasal congestion, sneezing, watery eyes', medicine: 'Cetirizine 10mg, Saline Nasal Spray' },
    { appointment: 'Gastroenteritis & Dehydration Care', symptoms: 'Nausea, abdominal cramping, mild fever', medicine: 'Oral Rehydration Salts (ORS), Metoclopramide 10mg' }
  ];

  const complaintTemplates = [
    { title: 'Severe Acute Migraine', symptoms: 'Throbbing hemicranial headache with photophobia', medicine: 'Paracetamol 1000mg, Rest in Dark Room' },
    { title: 'Dysmenorrhea & Abdominal Pain', symptoms: 'Lower abdominal cramps during classes', medicine: 'Mefenamic Acid 500mg, Hot Water Bottle' },
    { title: 'Acute Pharyngitis & Sore Throat', symptoms: 'Painful swallowing, swollen tonsils, temp 38.2°C', medicine: 'Amoxicillin 500mg, Dequalinium Lozenges' },
    { title: 'Contact Dermatitis', symptoms: 'Pruritic erythematous rash on forearm from lab chemicals', medicine: 'Hydrocortisone 1% Cream, Cetirizine 10mg' },
    { title: 'Dental Caries & Toothache', symptoms: 'Sharp pain in lower molar when drinking cold water', medicine: 'Ibuprofen 400mg, Dental Referral' }
  ];

  const emergencyTemplates = [
    { title: 'Severe Acute Asthma Attack', details: 'Student collapsed during athletic training. Sister Grace administered Nebulized Salbutamol and 100% Oxygen in clinic bay. Vitals stabilized.', time: '14:30' },
    { title: 'Deep Laceration on Forearm', details: 'Accidental injury in woodwork workshop. Wound cleaned, pressure applied, Tetanus toxoid given. Referred to hospital for 4 sutures.', time: '10:15' },
    { title: 'Food Allergy Anaphylactic Reaction', details: 'Sudden onset of facial edema and dyspnea after lunch. Epinephrine Auto-Injector (0.3mg) administered by Sr. Mary. Full recovery monitored.', time: '12:45' },
    { title: 'Heat Exhaustion & Fainting Episode', details: 'Student fainted during parade practice under direct sun. IV Normal Saline rehydration initiated, cooling fans applied.', time: '11:20' }
  ];

  const immunizationTemplates = [
    { title: 'Tetanus Toxoid Booster (TT)', details: 'Routine 10-year booster dose administered in right deltoid.' },
    { title: 'Hepatitis B Vaccine (Series Complete)', details: 'Dose 3 of 3 completed for healthcare & clinical school requirements.' },
    { title: 'Meningococcal ACWY Conjugate Vaccine', details: 'Preventative boarding school immunization administered.' },
    { title: 'Influenza Seasonal Quadrivalent Vaccine', details: 'Annual flu vaccination dose.' },
    { title: 'Measles-Rubella (MR) Booster', details: 'National health campaign booster dose.' }
  ];

  const referralTemplates = [
    { title: 'Referral for X-Ray & Orthopedic Evaluation', details: 'Suspected radius fracture following fall during sports practice.', to: 'Parirenyatwa General Hospital', address: 'Mazowe Street, Harare' },
    { title: 'Referral for Specialist Eye Refraction', details: 'Progressive myopia affecting academic performance.', to: 'Harare Eye Center', address: 'Baines Avenue Medical Chambers, Harare' },
    { title: 'Referral for ENT Evaluation', details: 'Recurrent otitis media unresponsive to oral antibiotics.', to: 'Avenues Hospital Specialist Clinic', address: 'Corner Baines & Mazowe St, Harare' },
    { title: 'Referral for Dental Extraction', details: 'Impacted lower wisdom tooth with pericoronitis.', to: 'City Dental Specialists', address: 'Sam Nujoma Street, Harare' }
  ];

  // Seed Appointments & Complaints
  for (let i = 0; i < Math.min(12, students.length); i++) {
    const studentUser = students[i].userId;
    if (studentUser) {
      const appt = appointmentTemplates[i % appointmentTemplates.length];
      await prisma.clinicAppointment.create({
        data: {
          userId: studentUser,
          appointment: appt.appointment,
          symptoms: appt.symptoms,
          medicine: appt.medicine,
          date: new Date(Date.now() - 86400000 * (i * 2 + 1)),
          schoolId: school.id
        }
      });

      const comp = complaintTemplates[i % complaintTemplates.length];
      await prisma.clinicComplaint.create({
        data: {
          userId: studentUser,
          title: comp.title,
          symptoms: comp.symptoms,
          medicine: comp.medicine,
          date: new Date(Date.now() - 86400000 * (i * 3 + 1)),
          schoolId: school.id
        }
      });

      const imm = immunizationTemplates[i % immunizationTemplates.length];
      await prisma.clinicImmunization.create({
        data: {
          userId: studentUser,
          title: imm.title,
          details: imm.details,
          date: new Date(Date.now() - 86400000 * (i * 5 + 2)),
          schoolId: school.id
        }
      });
    }
  }

  // Also seed clinic visits for staff members
  for (let i = 0; i < Math.min(4, staff.length); i++) {
    const staffUser = staff[i].id;
    const appt = appointmentTemplates[(i + 4) % appointmentTemplates.length];
    await prisma.clinicAppointment.create({
      data: {
        userId: staffUser,
        appointment: `Staff Wellness: ${appt.appointment}`,
        symptoms: appt.symptoms,
        medicine: appt.medicine,
        date: new Date(Date.now() - 86400000 * (i * 4 + 2)),
        schoolId: school.id
      }
    });

    if (i < referralTemplates.length) {
      const ref = referralTemplates[i];
      await prisma.clinicReferral.create({
        data: {
          userId: staffUser,
          title: ref.title,
          details: ref.details,
          to: ref.to,
          address: ref.address,
          date: new Date(Date.now() - 86400000 * (i * 7 + 3)),
          schoolId: school.id
        }
      });
    }
  }

  // Seed Emergencies & Student Referrals
  for (let i = 0; i < emergencyTemplates.length; i++) {
    const emg = emergencyTemplates[i];
    await prisma.clinicEmergency.create({
      data: {
        title: emg.title,
        details: emg.details,
        time: emg.time,
        date: new Date(Date.now() - 86400000 * (i * 6 + 1)),
        schoolId: school.id
      }
    });

    if (i < students.length && students[i].userId) {
      const ref = referralTemplates[i % referralTemplates.length];
      await prisma.clinicReferral.create({
        data: {
          userId: students[i].userId!,
          title: ref.title,
          details: ref.details,
          to: ref.to,
          address: ref.address,
          date: new Date(Date.now() - 86400000 * (i * 4 + 2)),
          schoolId: school.id
        }
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
