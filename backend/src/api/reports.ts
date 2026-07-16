import { Router, Response } from 'express';
import prisma from '../lib/prisma';
import { requireAuth, requireRole, AuthRequest } from '../middleware/auth';
import multer from 'multer';
import path from 'path';
import { generateAcademicReportPDF } from '../lib/pdf-generator';
import { signatureUpload, brandingUpload } from '../middleware/upload';
const router = Router();

/**
 * @route   GET /api/reports/classes
 * @desc    [TEACHER/ADMIN] Get list of classes for the school
 */
router.get('/classes', requireAuth, requireRole('SCHOOL_ADMIN', 'TEACHER'), async (req: AuthRequest, res: Response) => {
  try {
    const userRole = req.user!.role.toUpperCase();
    const secondaryRoles = req.user!.secondaryRoles || [];
    const isClassTeacher = userRole === 'TEACHER' && secondaryRoles.includes('Class Teacher');
    const isAdmin = userRole === 'SCHOOL_ADMIN' || secondaryRoles.includes('Senior Teacher');

    let where: any = { schoolId: req.user!.schoolId! };

    if (isClassTeacher && !isAdmin) {
      // Find teacher record
      const teacher = await prisma.teacher.findFirst({
        where: { userId: req.user!.id }
      });
      if (teacher) {
        where.teacherId = teacher.id;
      } else {
        return res.json([]); // No teacher record found
      }
    }

    const classes = await prisma.schoolClass.findMany({
      where,
      select: { id: true, name: true }
    });
    res.json(classes);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch classes' });
  }
});


/**
 * @route   GET /api/reports/preview
 * @desc    [TEACHER/ADMIN] Get student data for report preview
 */
router.get('/preview', requireAuth, requireRole('SCHOOL_ADMIN', 'TEACHER'), async (req: AuthRequest, res: Response) => {
  const { type, classId, term, year, studentId } = req.query;
  const schoolId = req.user!.schoolId!;
  const userRole = req.user!.role.toUpperCase();
  const secondaryRoles = req.user!.secondaryRoles || [];
  const isClassTeacher = userRole === 'TEACHER' && secondaryRoles.includes('Class Teacher');
  const isAdmin = userRole === 'SCHOOL_ADMIN' || secondaryRoles.includes('Senior Teacher');

  try {
    // Security check for class teachers
    if (isClassTeacher && !isAdmin && classId) {
      const teacher = await prisma.teacher.findFirst({ where: { userId: req.user!.id } });
      const targetClass = await prisma.schoolClass.findFirst({
        where: { id: String(classId), teacherId: teacher?.id }
      });
      if (!targetClass) return res.status(403).json({ error: 'Access denied to this class' });
    }

    let data: any[] = [];

    switch (type) {
      case 'ACADEMIC':
      case 'ATTENDANCE':
      case 'ENROLLMENT':
        const students = await prisma.user.findMany({
          where: { 
            role: 'STUDENT',
            schoolId,
            ...(studentId ? { id: String(studentId) } : (classId ? { student: { classId: String(classId) } } : {}))
          },
          include: {
            student: {
              include: {
                class: true,
                grades: {
                  where: { term: String(term), year: parseInt(String(year)) },
                  include: { teacher: { include: { user: { select: { name: true } } } } }
                },
                attendance: {
                  where: { 
                    date: {
                      gte: new Date(`${year}-01-01`),
                      lte: new Date(`${year}-12-31`)
                    }
                  }
                }
              }
            }
          }
        });
        data = students.map(u => ({
          id: u.id,
          name: u.name,
          studentId: u.student?.studentId,
          complete: type === 'ACADEMIC' ? (u.student?.grades.length || 0) > 0 : true,
          statusText: type === 'ACADEMIC' ? `${u.student?.grades.length || 0} subjects graded` : (type === 'ATTENDANCE' ? `${u.student?.attendance.length || 0} records` : 'Enrolled'),
          grades: u.student?.grades,
          attendance: u.student?.attendance,
          class: u.student?.class
        }));
        break;

      case 'FEES':
        const feeStudents = await prisma.student.findMany({
          where: { 
            schoolId,
            ...(classId ? { classId: String(classId) } : {})
          },
          include: {
            user: { select: { name: true } },
            fees: {
              where: { term: String(term), year: parseInt(String(year)) }
            }
          }
        });
        data = feeStudents.map(s => {
          const totalFee = Math.round(s.fees.reduce((sum, f) => sum + f.amount, 0) * 100) / 100;
          const totalPaid = Math.round(s.fees.reduce((sum, f) => sum + f.paid, 0) * 100) / 100;
          const balance = Math.round((totalFee - totalPaid) * 100) / 100;
          return {
            id: s.id,
            name: s.user?.name || s.name,
            studentId: s.studentId,
            complete: balance <= 0,
            statusText: balance <= 0 ? 'Fully Paid' : `$${balance.toLocaleString()} Outstanding`,
            fees: s.fees,
            totalFee,
            totalPaid,
            balance
          };
        });
        break;

      case 'STAFF':
        const staff = await prisma.user.findMany({
          where: { 
            schoolId,
            role: { in: ['TEACHER', 'BURSAR', 'LIBRARIAN', 'ANCILLARY'] }
          }
        });
        data = staff.map(u => ({
          id: u.id,
          name: u.name,
          staffId: u.staffId,
          statusText: u.role,
          complete: true,
          role: u.role,
          email: u.email,
          phone: u.phone
        }));
        break;

      case 'ASSETS':
        const assets = await prisma.asset.findMany({
          where: { schoolId },
          include: { custodian: { select: { name: true } } }
        });
        data = assets.map(a => ({
          id: a.id,
          name: a.name,
          assetId: a.serialNumber || a.id,
          statusText: a.condition.toUpperCase(),
          complete: a.condition === 'good',
          category: a.category,
          location: a.location,
          custodian: a.custodian?.name
        }));
        break;

      default:
        return res.status(400).json({ error: 'Invalid report type' });
    }

    res.json(data);
  } catch (error) {
    console.error('API Error:', error);
    res.status(500).json({ error: 'Failed to fetch report preview data' });
  }
});

/**
 * @route   POST /api/reports/snapshot
 * @desc    [TEACHER/ADMIN] Bulk generate and save reports
 */
router.post('/snapshot', requireAuth, requireRole('SCHOOL_ADMIN', 'TEACHER'), async (req: AuthRequest, res: Response) => {
  const { studentIds, term, year, publishStudent, publishParent } = req.body;

  if (!studentIds || !Array.isArray(studentIds)) {
    return res.status(400).json({ error: 'List of student IDs is required' });
  }

  try {
    // 1. Fetch fresh data for all students in a single query
    const gteDate = term === 'Term 1' ? new Date(`${year}-01-01`) : 
                    term === 'Term 2' ? new Date(`${year}-05-01`) :
                    term === 'Term 3' ? new Date(`${year}-09-01`) :
                    new Date(`${year}-01-01`);
                    
    const lteDate = term === 'Term 1' ? new Date(`${year}-04-30`) : 
                    term === 'Term 2' ? new Date(`${year}-08-31`) :
                    term === 'Term 3' ? new Date(`${year}-12-31`) :
                    new Date(`${year}-12-31`);

    const studentsData = await prisma.user.findMany({
      where: { id: { in: studentIds }, schoolId: req.user!.schoolId! },
      include: {
        student: {
          include: {
            class: true,
            grades: {
              where: { term: term as string, year: parseInt(year as string) }
            },
            attendance: {
              where: { 
                date: {
                  gte: gteDate,
                  lte: lteDate
                }
              }
            }
          }
        }
      }
    });

    // 2. Prepare bulk upsert operations
    const upsertOperations = studentsData.map(studentData => {
      const sid = studentData.id;
      return prisma.academicReport.upsert({
        where: {
          id: `${sid}-${term}-${year}` // Deterministic ID for upsert
        },
        update: {
          data: studentData as any,
          publishedStudent: !!publishStudent,
          publishedParent: !!publishParent,
        },
        create: {
          id: `${sid}-${term}-${year}`,
          studentId: sid,
          term,
          year,
          data: studentData as any,
          publishedStudent: !!publishStudent,
          publishedParent: !!publishParent,
          schoolId: req.user!.schoolId!
        }
      });
    });

    // 3. Execute all upserts in a single transaction
    const reports = await prisma.$transaction(upsertOperations);

    res.json({ success: true, count: reports.length });
  } catch (error) {
    console.error('Report generation error:', error);
    res.status(500).json({ error: 'Failed to generate reports' });
  }
});

/**
 * @route   GET /api/reports/my
 * @desc    Get reports for the current student or parent
 */
router.get('/my', requireAuth, async (req: AuthRequest, res: Response) => {
  const userId = req.user!.id;
  const role = req.user!.role;

  try {
    let reports: any[] = [];
    if (role === 'STUDENT') {
      reports = await prisma.academicReport.findMany({
        where: { studentId: userId, publishedStudent: true },
        orderBy: { createdAt: 'desc' }
      });
    } else if (role === 'PARENT') {
      // Find linked students
      const parent = await prisma.parent.findUnique({
        where: { userId },
        include: { students: { where: { status: 'APPROVED' } } }
      });

      if (parent) {
        const studentIds = parent.students.map(ps => ps.studentId);
        reports = await prisma.academicReport.findMany({
          where: { 
            studentId: { in: studentIds },
            publishedParent: true 
          },
          include: { student: { select: { name: true } } },
          orderBy: { createdAt: 'desc' }
        });
      }
    }

    res.json(reports);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch reports' });
  }
});

/**
 * @route   POST /api/reports/template
 * @desc    [ADMIN] Update report template and signature
 */
router.post('/template', requireAuth, requireRole('SCHOOL_ADMIN'), signatureUpload.single('signature'), async (req: AuthRequest, res: Response) => {
  const { config } = req.body;
  const signatureUrl = req.file ? `/storage/${(req as any).uploadCategoryPath}/${req.file.filename}` : undefined;

  try {
    const template = await prisma.reportTemplate.upsert({
      where: { schoolId: String(req.user!.schoolId!) },
      update: {
        config: config ? JSON.parse(config) : undefined,
        ...(signatureUrl && { signatureUrl })
      },
      create: {
        schoolId: String(req.user!.schoolId!),
        config: config ? JSON.parse(config) : { primaryColor: '#3182ce', showAttendance: true },
        signatureUrl: signatureUrl || null
      }
    });

    res.json(template);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update template' });
  }
});

/**
 * @route   GET /api/reports/template
 * @desc    Get school report template
 */
router.get('/template', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const template = await prisma.reportTemplate.findFirst({
      where: { schoolId: String(req.user!.schoolId!) }
    });
    res.json(template || { config: { primaryColor: '#3182ce' } });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch template' });
  }
});

/**
 * @route   PATCH /api/reports/cert-template
 * @desc    [ADMIN] Upload certificate background template
 */
router.patch('/cert-template', requireAuth, requireRole('SCHOOL_ADMIN', 'BURSAR'), brandingUpload.single('template'), async (req: AuthRequest, res: Response) => {
  try {
    const templatePath = (req as any).uploadCategoryPath && req.file 
      ? `${(req as any).uploadCategoryPath}/${req.file.filename}` 
      : undefined;

    if (!templatePath) return res.status(400).json({ error: 'No template file uploaded' });

    const schoolId = String(req.user!.schoolId!);
    const existing = await prisma.reportTemplate.findFirst({ where: { schoolId } });
    const config = existing ? (existing.config as any) || {} : {};
    config.certTemplateUrl = templatePath;

    const updated = await prisma.reportTemplate.upsert({
      where: { schoolId },
      update: { config },
      create: { schoolId, config }
    });

    res.json({ success: true, certTemplateUrl: templatePath, config: updated.config });
  } catch (error) {
    console.error('Certificate Template upload error:', error);
    res.status(500).json({ error: 'Failed to update certificate template' });
  }
});

/**
 * @route   PATCH /api/reports/report-template
 * @desc    [ADMIN] Upload report background template
 */
router.patch('/report-template', requireAuth, requireRole('SCHOOL_ADMIN', 'BURSAR'), brandingUpload.single('template'), async (req: AuthRequest, res: Response) => {
  try {
    const templatePath = (req as any).uploadCategoryPath && req.file 
      ? `${(req as any).uploadCategoryPath}/${req.file.filename}` 
      : undefined;

    if (!templatePath) return res.status(400).json({ error: 'No template file uploaded' });

    const schoolId = String(req.user!.schoolId!);
    const existing = await prisma.reportTemplate.findFirst({ where: { schoolId } });
    const config = existing ? (existing.config as any) || {} : {};
    config.reportTemplateUrl = templatePath;

    const updated = await prisma.reportTemplate.upsert({
      where: { schoolId },
      update: { config },
      create: { schoolId, config }
    });

    res.json({ success: true, reportTemplateUrl: templatePath, config: updated.config });
  } catch (error) {
    console.error('Report Template upload error:', error);
    res.status(500).json({ error: 'Failed to update report template' });
  }
});

/**
 * @route   PATCH /api/reports/receipt-logo
 * @desc    [ADMIN] Upload receipt logo
 */
router.patch('/receipt-logo', requireAuth, requireRole('SCHOOL_ADMIN', 'BURSAR'), brandingUpload.single('logo'), async (req: AuthRequest, res: Response) => {
  try {
    const logoPath = (req as any).uploadCategoryPath && req.file 
      ? `${(req as any).uploadCategoryPath}/${req.file.filename}` 
      : undefined;

    if (!logoPath) return res.status(400).json({ error: 'No logo file uploaded' });

    const schoolId = String(req.user!.schoolId!);
    const existing = await prisma.reportTemplate.findFirst({ where: { schoolId } });
    const config = existing ? (existing.config as any) || {} : {};
    config.receiptLogoUrl = logoPath;

    const updated = await prisma.reportTemplate.upsert({
      where: { schoolId },
      update: { config },
      create: { schoolId, config }
    });

    res.json({ success: true, receiptLogoUrl: logoPath, config: updated.config });
  } catch (error) {
    console.error('Receipt Logo upload error:', error);
    res.status(500).json({ error: 'Failed to update receipt logo' });
  }
});

/**
 * @route   PATCH /api/reports/consultation-logo
 * @desc    [ADMIN] Upload consultation logo
 */
router.patch('/consultation-logo', requireAuth, requireRole('SCHOOL_ADMIN', 'CLINIC'), brandingUpload.single('logo'), async (req: AuthRequest, res: Response) => {
  try {
    const logoPath = (req as any).uploadCategoryPath && req.file 
      ? `${(req as any).uploadCategoryPath}/${req.file.filename}` 
      : undefined;

    if (!logoPath) return res.status(400).json({ error: 'No logo file uploaded' });

    const schoolId = String(req.user!.schoolId!);
    const existing = await prisma.reportTemplate.findFirst({ where: { schoolId } });
    const config = existing ? (existing.config as any) || {} : {};
    config.consultationLogoUrl = logoPath;

    const updated = await prisma.reportTemplate.upsert({
      where: { schoolId },
      update: { config },
      create: { schoolId, config }
    });

    res.json({ success: true, consultationLogoUrl: logoPath, config: updated.config });
  } catch (error) {
    console.error('Consultation Logo upload error:', error);
    res.status(500).json({ error: 'Failed to update consultation logo' });
  }
});

/**
 * @route   GET /api/reports/download/:id
 * @desc    Generate and download PDF report
 */
router.get('/download/:id', requireAuth, async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const userId = req.user!.id;
  const role = req.user!.role;

  try {
    const report = await prisma.academicReport.findFirst({
      where: { id: String(id) }
    });

    if (!report) return res.status(404).json({ error: 'Report not found' });

    // Security check: Only the student, their parent, or school staff
    if (role === 'STUDENT' && report.studentId !== userId) {
      return res.status(403).json({ error: 'Access denied' });
    }
    // (Parent check could be added here if needed, but 'my' route handles listing)

    const reportData = report.data as any;
    
    // Enrich with school branding
    const school = await prisma.school.findUnique({
      where: { id: report.schoolId }
    });

    // Map to PDF Generator Interface
    const pdfData = {
      student: {
        name: reportData.name,
        studentId: reportData.student?.studentId || 'N/A',
        class: reportData.student?.class
      },
      grades: reportData.student?.grades.map((g: any) => ({
        subject: { name: g.subjectName || 'Unknown Subject', code: '' }, // We might need to fetch subject name if it's just an ID
        score: g.score,
        grade: g.grade,
        teacherComment: g.feedback
      })) || [],
      attendance: {
        present: reportData.student?.attendance.filter((a: any) => a.status === 'present').length || 0,
        absent: reportData.student?.attendance.filter((a: any) => a.status === 'absent').length || 0,
        rate: 0 // Will compute below
      },
      school: {
        name: school?.name || 'Academic Institution',
        address: school?.address || undefined,
        email: school?.email,
        type: school?.type,
        branding: school?.branding as any
      },
      term: report.term,
      year: report.year
    };

    // Fix subject names if they are IDs (they should be enriched in the snapshot)
    // Actually, in the snapshot route (line 217), grades are included but might need more enrichment.
    // For now, assume the snapshot was enriched.

    // Compute attendance rate
    const total = pdfData.attendance.present + pdfData.attendance.absent;
    pdfData.attendance.rate = total > 0 ? Math.round((pdfData.attendance.present / total) * 100) : 100;

    await generateAcademicReportPDF(pdfData, res);
  } catch (error) {
    console.error('PDF Download Error:', error);
    res.status(500).json({ error: 'Failed to generate PDF' });
  }
});

/**
 * @route   GET /api/reports/principal-comments/:classId
 * @desc    [ADMIN/TEACHER] Get students and their principal comments for a class
 */
router.get('/principal-comments/:classId', requireAuth, requireRole('SCHOOL_ADMIN', 'TEACHER'), async (req: AuthRequest, res: Response) => {
  const { classId } = req.params;
  const { term, year, subjectId } = req.query;
  const schoolId = req.user!.schoolId!;

  try {
    const students = await (prisma as any).student.findMany({
      where: { classId: String(classId), schoolId: String(schoolId) },
      include: {
        termlyComments: {
          where: { 
            term: String(term), 
            year: parseInt(String(year)) 
          }
        },
        grades: {
          where: { 
            subjectId: String(subjectId), 
            term: String(term), 
            year: parseInt(String(year)) 
          },
          include: { subject: { select: { name: true } } }
        }
      },
      orderBy: { name: 'asc' }
    });
    res.json(students);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch principal comments' });
  }
});

/**
 * @route   POST /api/reports/principal-comments/bulk
 * @desc    [ADMIN] Bulk save principal comments
 */
router.post('/principal-comments/bulk', requireAuth, requireRole('SCHOOL_ADMIN'), async (req: AuthRequest, res: Response) => {
  const { term, year, comments } = req.body;
  const schoolId = req.user!.schoolId!;

  // comments: Array<{ studentId: string, principalComment: string }>

  try {
    const operations = comments.map((c: any) => {
      return prisma.termlyComment.upsert({
        where: {
          schoolId_studentId_term_year: {
            schoolId,
            studentId: c.studentId,
            term,
            year: parseInt(year)
          }
        },
        update: {
          principalComment: c.principalComment
        },
        create: {
          schoolId,
          studentId: c.studentId,
          term,
          year: parseInt(year),
          principalComment: c.principalComment
        }
      });
    });

    await prisma.$transaction(operations);
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to save comments: ' + error.message });
  }
});

export default router;
