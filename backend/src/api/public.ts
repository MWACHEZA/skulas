import { Router } from 'express';
import prisma from '../lib/prisma';
import { saveBase64Image } from '../lib/file-utils';
import nodemailer from 'nodemailer';

const router = Router();

/**
 * @route   GET /api/public/announcements
 * @desc    Get public announcements for a specific school
 */
router.get('/announcements', async (req, res) => {
  const { schoolCode } = req.query;

  try {
    const school = await prisma.school.findUnique({
      where: { code: schoolCode as string }
    });

    if (!school) return res.status(404).json({ error: 'School not found' });

    const announcements = await prisma.announcement.findMany({
      where: { 
        schoolId: school.id,
        isPublic: true
      },
      orderBy: { publishedAt: 'desc' },
      take: 10
    });

    res.json(announcements);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch public announcements' });
  }
});

/**
 * @route   GET /api/public/news
 * @desc    Get public news for a school
 */
router.get('/news', async (req, res) => {
  const { schoolCode } = req.query;
  try {
    const school = await prisma.school.findUnique({ where: { code: schoolCode as string } });
    if (!school) return res.status(404).json({ error: 'School not found' });

    const news = await prisma.news.findMany({
      where: { schoolId: school.id },
      orderBy: { publishedAt: 'desc' },
      take: 10
    });
    res.json(news);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch news' });
  }
});

/**
 * @route   GET /api/public/schools/:code/data
 * @desc    Get dynamic dropdown data (classes, subjects) for registration
 */
router.get('/schools/:code/data', async (req, res) => {
  const { code } = req.params;
  try {
    const normalizedCode = code.trim().toUpperCase();
    const school = await prisma.school.findUnique({
      where: { code: normalizedCode },
      select: {
        id: true,
        name: true,
        customContent: true,
        classes: {
          select: { id: true, name: true, level: true },
          orderBy: { name: 'asc' }
        },
        subjects: {
          select: { id: true, name: true, departmentId: true, department: true },
          orderBy: { name: 'asc' }
        },
        departments: {
          select: { id: true, name: true, code: true },
          orderBy: { name: 'asc' }
        },
        studentHouses: {
          select: { id: true, name: true },
          orderBy: { name: 'asc' }
        },
        clubs: {
          select: { id: true, name: true },
          orderBy: { name: 'asc' }
        },
        hostels: {
          select: { 
            id: true, 
            name: true,
            rooms: {
              select: { id: true, name: true }
            }
          },
          orderBy: { name: 'asc' }
        },
        sections: {
          select: { id: true, name: true },
          orderBy: { name: 'asc' }
        }
      }
    });

    if (!school) return res.status(404).json({ error: 'School not found' });

    const customContentObj = (school.customContent || {}) as any;
    const supplierCategories = customContentObj.supplierCategories || [];

    res.json({
      schoolName: school.name,
      classes: school.classes,
      subjects: school.subjects,
      departments: school.departments,
      supplierCategories,
      houses: (school as any).studentHouses || [],
      clubs: (school as any).clubs || [],
      hostels: (school as any).hostels || [],
      sections: (school as any).sections || []
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch school registration data' });
  }
});

/**
 * @route   POST /api/public/inquiries
 * @desc    Submit a public contact inquiry for a school
 */
router.post('/inquiries', async (req, res) => {
  const { name, email, phone, message, schoolCode } = req.body;
  if (!name || !email || !message || !schoolCode) {
    return res.status(400).json({ error: 'Name, email, message, and schoolCode are required' });
  }

  try {
    const school = await prisma.school.findUnique({
      where: { code: schoolCode.toUpperCase() }
    });

    if (!school) return res.status(404).json({ error: 'School not found' });

    const inquiry = await prisma.websiteInquiry.create({
      data: {
        name,
        email,
        phone: phone || '',
        message,
        schoolId: school.id
      }
    });

    // ── Email Notification (best-effort, only if SMTP is configured) ─────────
    try {
      const setting = await prisma.schoolSetting.findFirst({
        where: { schoolId: school.id }
      });

      if (setting?.smtpHost && setting?.smtpEmail && setting?.smtpPassword && setting?.systemEmail) {
        const transporter = nodemailer.createTransport({
          host:   setting.smtpHost,
          port:   setting.smtpPort || 465,
          secure: setting.smtpSsl ?? true,
          auth: {
            user: setting.smtpEmail,
            pass: setting.smtpPassword
          }
        });

        await transporter.sendMail({
          from:    `"${school.name} Website" <${setting.smtpEmail}>`,
          to:      setting.systemEmail,
          replyTo: email,
          subject: `New Website Enquiry from ${name}`,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden;">
              <div style="background: #1e3a8a; color: white; padding: 24px;">
                <h2 style="margin: 0;">New Website Enquiry</h2>
                <p style="margin: 4px 0 0; opacity: 0.8;">${school.name}</p>
              </div>
              <div style="padding: 24px;">
                <table style="width: 100%; border-collapse: collapse;">
                  <tr><td style="padding: 8px 0; color: #64748b; width: 120px;"><strong>Name:</strong></td><td style="padding: 8px 0;">${name}</td></tr>
                  <tr><td style="padding: 8px 0; color: #64748b;"><strong>Email:</strong></td><td style="padding: 8px 0;"><a href="mailto:${email}">${email}</a></td></tr>
                  <tr><td style="padding: 8px 0; color: #64748b;"><strong>Phone:</strong></td><td style="padding: 8px 0;">${phone || 'Not provided'}</td></tr>
                </table>
                <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 16px 0;" />
                <p style="color: #64748b; margin: 0 0 8px;"><strong>Message:</strong></p>
                <p style="color: #1e293b; line-height: 1.6; white-space: pre-wrap;">${message}</p>
              </div>
              <div style="background: #f8fafc; padding: 16px 24px; font-size: 0.85rem; color: #94a3b8; text-align: center;">
                This email was sent from the ${school.name} website contact form.
              </div>
            </div>
          `
        });
      }
    } catch (mailErr) {
      // Email failure must NOT block the API response
      console.warn('[Inquiry Email] Failed to send notification:', mailErr);
    }
    // ────────────────────────────────────────────────────────────────────────

    res.json(inquiry);
  } catch (error) {
    console.error('Failed to submit inquiry:', error);
    res.status(500).json({ error: 'Failed to submit inquiry' });
  }
});

/**
 * @route   GET /api/public/schools/:code/departments
 * @desc    Get dynamic public departments data with staff hierarchy
 */
router.get('/schools/:code/departments', async (req, res) => {
  const { code } = req.params;
  try {
    const school = await prisma.school.findUnique({
      where: { code: code.toUpperCase() }
    });
    if (!school) return res.status(404).json({ error: 'School not found' });

    const departments = await prisma.department.findMany({
      where: { schoolId: school.id },
      include: {
        head: {
          select: {
            id: true,
            name: true,
            role: true,
            avatar: true,
            teacher: {
              select: {
                qualification: true,
                subjects: {
                  include: {
                    subject: { select: { name: true } }
                  }
                }
              }
            }
          }
        },
        teachers: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                role: true,
                avatar: true,
                employeeProfile: {
                  select: {
                    jobTitle: true,
                    designation: true
                  }
                }
              }
            },
            subjects: {
              include: {
                subject: { select: { name: true } }
              }
            }
          }
        }
      },
      orderBy: { name: 'asc' }
    });

    res.json(departments);
  } catch (error) {
    console.error('Failed to fetch public departments:', error);
    res.status(500).json({ error: 'Failed to fetch public departments' });
  }
});

/**
 * @route   GET /api/public/vacancies
 * @desc    Get active vacancies for a school by schoolCode
 */
router.get('/vacancies', async (req, res) => {
  const { schoolCode } = req.query;
  if (!schoolCode) {
    return res.status(400).json({ error: 'School code is required' });
  }

  try {
    const school = await prisma.school.findUnique({
      where: { code: (schoolCode as string).toUpperCase() }
    });

    if (!school) return res.status(404).json({ error: 'School not found' });

    const vacancies = await prisma.vacancy.findMany({
      where: {
        schoolId: school.id,
        status: 'Active',
        endDate: {
          gte: new Date(new Date().setHours(0, 0, 0, 0))
        }
      },
      include: {
        department: { select: { name: true } }
      },
      orderBy: { endDate: 'asc' }
    });

    res.json(vacancies);
  } catch (error) {
    console.error('Error fetching vacancies:', error);
    res.status(500).json({ error: 'Failed to fetch vacancies' });
  }
});

/**
 * @route   POST /api/public/applications
 * @desc    Submit a job application publicly
 */
router.post('/applications', async (req, res) => {
  try {
    const {
      schoolCode,
      vacancyId,
      applicantName,
      gender,
      email,
      phone,
      qualification,
      skills,
      workExperience,
      address,
      coverLetter,
      resumeUrl,
      photoUrl
    } = req.body;

    if (!schoolCode || !vacancyId || !applicantName || !email || !phone) {
      return res.status(400).json({ error: 'Missing required fields (schoolCode, vacancyId, applicantName, email, phone)' });
    }

    const school = await prisma.school.findUnique({
      where: { code: schoolCode.toUpperCase() }
    });
    if (!school) return res.status(404).json({ error: 'School not found' });

    const vacancy = await prisma.vacancy.findFirst({
      where: { id: vacancyId }
    });
    if (!vacancy) return res.status(404).json({ error: 'Vacancy not found' });

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const expiry = new Date(vacancy.endDate);
    expiry.setHours(0, 0, 0, 0);
    if (today > expiry) {
      return res.status(400).json({ error: 'This vacancy has expired and is closed for applications' });
    }

    const app = await prisma.jobApplication.create({
      data: {
        schoolId: school.id,
        vacancyId,
        applicantName,
        gender: gender || '',
        email,
        phone,
        qualification: qualification || '',
        skills: skills || '',
        workExperience: workExperience || '',
        address: address || '',
        coverLetter: coverLetter || '',
        status: 'Applied'
      }
    });

    let updatedResumeUrl = null;
    let updatedPhotoUrl = null;

    if (resumeUrl && resumeUrl.includes(';base64,')) {
      updatedResumeUrl = saveBase64Image(resumeUrl, 'resume', 'docs', school.code, 'recruitment/applications', app.id);
    }
    if (photoUrl && photoUrl.includes(';base64,')) {
      updatedPhotoUrl = saveBase64Image(photoUrl, 'photo', 'images', school.code, 'recruitment/applications', app.id);
    }

    if (updatedResumeUrl || updatedPhotoUrl) {
      await prisma.jobApplication.update({
        where: { id: app.id },
        data: {
          ...(updatedResumeUrl ? { resumeUrl: updatedResumeUrl } : {}),
          ...(updatedPhotoUrl ? { photoUrl: updatedPhotoUrl } : {})
        }
      });
      app.resumeUrl = updatedResumeUrl || app.resumeUrl;
      app.photoUrl = updatedPhotoUrl || app.photoUrl;
    }

    res.status(201).json({
      success: true,
      applicationId: app.id,
      applicantName: app.applicantName
    });
  } catch (error) {
    console.error('Error submitting application:', error);
    res.status(500).json({ error: 'Failed to submit application' });
  }
});

/**
 * @route   GET /api/public/noticeboard
 * @desc    Get noticeboard events publicly for a school
 */
router.get('/noticeboard', async (req, res) => {
  const { schoolCode } = req.query;
  try {
    const school = await prisma.school.findUnique({
      where: { code: (schoolCode as string).toUpperCase() }
    });
    if (!school) return res.status(404).json({ error: 'School not found' });

    const noticeboard = await prisma.noticeboard.findMany({
      where: { schoolId: school.id },
      orderBy: { date: 'desc' }
    });
    res.json(noticeboard);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch noticeboard events' });
  }
});

export default router;

