import { PrismaClient, School } from '@prisma/client';

export async function seedCommunications(
  prisma: PrismaClient,
  school: School
) {
  console.log(`  -> Seeding Communications & HR for ${school.name}...`);

  // 1. Noticeboard & Announcements
  for (let i = 0; i < 10; i++) {
    await prisma.noticeboard.create({
      data: { title: `Notice ${i + 1}`, content: `Notice content ${i + 1}`, date: new Date(), schoolId: school.id }
    });
    
    await prisma.announcement.create({
      data: { title: `Announcement ${i + 1}`, content: `Announcement content ${i + 1}`, targetRole: 'ALL', schoolId: school.id }
    });
  }

  // 2. News & Gallery
  for (let i = 0; i < 10; i++) {
    await prisma.news.create({
      data: { title: `News Article ${i + 1}`, content: `News content ${i + 1}`, author: 'Admin', schoolId: school.id }
    });

    await prisma.gallery.create({
      data: { title: `Gallery Event ${i + 1}`, content: 'Photos of our facilities.', category: 'Campus', coverImage: 'https://example.com/photo.jpg', schoolId: school.id }
    });
  }

  // 3. Vacancies & Job Applications
  const admin = await prisma.user.findFirst({ where: { schoolId: school.id } });
  let dept = await prisma.department.findFirst({ where: { schoolId: school.id } });
  if (!dept) dept = await prisma.department.create({ data: { name: 'HR', schoolId: school.id } });
  
  if (admin) {
    for (let i = 0; i < 10; i++) {
      const vacancy = await prisma.vacancy.create({
        data: { 
          jobTitle: `Teacher Position ${i + 1}`, 
          location: 'On-site', 
          skills: 'BSc Maths', 
          startDate: new Date(), 
          endDate: new Date(Date.now() + 86400000 * 30), 
          status: 'Active', 
          schoolId: school.id, 
          departmentId: dept.id, 
          recruiterId: admin.id,
          jobType: 'Full-Time',
          workExperience: '2 years',
          currency: 'USD',
          showPaymentMethodBy: 'Monthly',
          rate: 'Negotiable',
          requiredFields: 'CV',
          shortDescription: `Teach subject ${i + 1}.`,
          fullDescription: `Teach subject ${i + 1} to students.`
        }
      });

      await prisma.jobApplication.create({
        data: { vacancyId: vacancy.id, applicantName: `Applicant ${i + 1}`, email: `applicant${i + 1}@example.com`, phone: '12345678', gender: 'Male', qualification: 'BSc', skills: 'Math', workExperience: '2 years', address: 'Harare', coverLetter: 'I am a great teacher.', status: 'Applied', schoolId: school.id }
      });
    }
  }

  // 4. Website Settings & Inquiries
  let websiteSettings = await prisma.websiteSettings.findFirst({ where: { schoolId: school.id } });
  if (!websiteSettings) {
    websiteSettings = await prisma.websiteSettings.create({
      data: { 
        schoolId: school.id, 
        bannerTitle: 'Welcome to ' + school.name,
        aboutUsContent: 'A great place to learn.',
      }
    });
  }

  for (let i = 0; i < 10; i++) {
    await prisma.websiteInquiry.create({
      data: { name: `Inquirer ${i + 1}`, email: `inquiry${i + 1}@test.com`, phone: '12345678', message: `Question ${i + 1}`, schoolId: school.id }
    });
  }

  // 5. Messages
  for (let i = 0; i < 10; i++) {
    await prisma.message.create({
      data: { senderId: 'System', recipientId: 'All', subject: `System Message ${i + 1}`, body: `Message content ${i + 1}.`, isRead: false, schoolId: school.id }
    });
  }
}
