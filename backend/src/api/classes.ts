import { Router, Response } from 'express';
import prisma from '../lib/prisma';
import { requireAuth, requireRole, AuthRequest } from '../middleware/auth';
import multer from 'multer';
import { generateClassTemplateBuffer, parseExcelBuffer } from '../lib/xlsx-utils';

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

/**
 * @route   GET /api/classes
 * @desc    Get all classes for the school
 */
router.get('/', requireAuth, async (req: AuthRequest, res: Response) => {
  const schoolId = req.user!.schoolId!;
  try {
    const classes = await prisma.schoolClass.findMany({
      where: { schoolId },
      include: {
        teacher: { include: { user: { select: { name: true } } } },
        section: true,
        subjectTeachers: {
          include: {
            subject: { select: { id: true, name: true, code: true } },
            teacher: { include: { user: { select: { name: true } } } }
          }
        },
        students: { select: { id: true, name: true, studentId: true, gender: true } },
        _count: { select: { students: true } }
      },
      orderBy: { name: 'asc' }
    });
    res.json(classes);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch classes' });
  }
});

/**
 * @route   POST /api/classes
 * @desc    Create a new class
 */
router.post('/', requireAuth, requireRole('SCHOOL_ADMIN'), async (req: AuthRequest, res: Response) => {
  const { name, level, teacherId, capacity, sectionId } = req.body;
  const schoolId = req.user!.schoolId!;

  try {
    const newClass = await prisma.schoolClass.create({
      data: {
        name,
        level,
        capacity: capacity ? parseInt(capacity) : null,
        sectionId: sectionId || null,
        teacherId: teacherId || null,
        schoolId
      }
    });
    res.json(newClass);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create class' });
  }
});

/**
 * @route   PUT /api/classes/:id
 * @desc    Update a class
 */
router.put('/:id', requireAuth, requireRole('SCHOOL_ADMIN'), async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const { name, level, teacherId, capacity, sectionId } = req.body;

  try {
    const updatedClass = await prisma.schoolClass.update({
      where: { id: id as string },
      data: {
        name,
        level,
        capacity: capacity ? parseInt(capacity) : null,
        sectionId: sectionId || null,
        teacherId: teacherId || null
      }
    });
    res.json(updatedClass);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update class' });
  }
});

/**
 * @route   GET /api/classes/template
 * @desc    Download the Excel template for class imports
 */
router.get('/template', requireAuth, requireRole('SCHOOL_ADMIN'), async (req, res) => {
  try {
    const buffer = await generateClassTemplateBuffer();
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=class_import_template.xlsx');
    res.send(buffer);
  } catch (error) {
    res.status(500).json({ error: 'Failed to generate template' });
  }
});

/**
 * @route   POST /api/classes/bulk-upload
 * @desc    Bulk upload classes from Excel
 */
router.post('/bulk-upload', requireAuth, requireRole('SCHOOL_ADMIN'), upload.single('file'), async (req: AuthRequest, res: Response) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
  const schoolId = req.user!.schoolId!;

  try {
    const data = (await parseExcelBuffer(req.file.buffer)) as any[];

    const classesToCreate = data.map((row, index) => ({
      name: String(row.name || row.Name || '').trim(),
      level: String(row.level || row.Level || 'Form 1').trim(),
      capacity: row.capacity || row.Capacity ? parseInt(row.capacity || row.Capacity) : null,
      schoolId,
      _rowIndex: index + 2
    })).filter(c => c.name);

    if (classesToCreate.length === 0) return res.status(400).json({ error: 'No valid classes found in sheet' });

    const results = {
      created: 0,
      errors: [] as string[]
    };

    await prisma.$transaction(async (tx) => {
      for (const row of classesToCreate) {
        try {
          const existing = await tx.schoolClass.findUnique({
            where: {
              schoolId_name: {
                schoolId,
                name: row.name
              }
            }
          });

          if (existing) {
            results.errors.push(`Row ${row._rowIndex}: Class "${row.name}" already exists.`);
            continue;
          }

          await tx.schoolClass.create({
            data: {
              name: row.name,
              level: row.level,
              capacity: row.capacity,
              schoolId
            }
          });
          results.created++;
        } catch (err: any) {
          results.errors.push(`Row ${row._rowIndex}: ${err.message}`);
        }
      }

      if (results.errors.length > 0) {
        const err = new Error('IMPORT_VALIDATION_FAILED');
        (err as any).details = results;
        throw err;
      }
    });

    res.json({ success: true, message: `Successfully uploaded ${results.created} classes`, details: results });
  } catch (error: any) {
    if (error.message === 'IMPORT_VALIDATION_FAILED') {
      return res.status(400).json({ error: 'Bulk upload failed due to validation errors', details: error.details });
    }
    console.error('Bulk upload error:', error);
    res.status(500).json({ error: 'Failed to process Excel file' });
  }
});

/**
 * @route   GET /api/classes/sections
 * @desc    Get all sections for the school
 */
router.get('/sections', requireAuth, async (req: AuthRequest, res: Response) => {
  const schoolId = req.user!.schoolId!;
  try {
    const sections = await prisma.section.findMany({
      where: { schoolId },
      orderBy: { name: 'asc' }
    });
    res.json(sections);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch sections' });
  }
});

/**
 * @route   POST /api/classes/sections
 * @desc    Create a new section
 */
router.post('/sections', requireAuth, requireRole('SCHOOL_ADMIN'), async (req: AuthRequest, res: Response) => {
  const { name } = req.body;
  const schoolId = req.user!.schoolId!;
  try {
    const section = await prisma.section.create({
      data: { name, schoolId }
    });
    res.json(section);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create section' });
  }
});

/**
 * @route   DELETE /api/classes/sections/:id
 * @desc    Delete a section
 */
router.delete('/sections/:id', requireAuth, requireRole('SCHOOL_ADMIN'), async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  try {
    await prisma.section.delete({ where: { id: id as string } });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete section' });
  }
});

/**
 * @route   DELETE /api/classes/:id
 * @desc    Delete a class
 */
router.delete('/:id', requireAuth, requireRole('SCHOOL_ADMIN'), async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  try {
    await prisma.schoolClass.delete({ where: { id: id as string } });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete class' });
  }
});

/**
 * @route   POST /api/classes/:id/subject-teachers
 * @desc    Assign a teacher to a subject for this class
 */
router.post('/:id/subject-teachers', requireAuth, requireRole('SCHOOL_ADMIN'), async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const { subjectId, teacherId } = req.body;

  try {
    const assignment = await prisma.classSubjectTeacher.create({
      data: {
        classId: id as string,
        subjectId,
        teacherId
      },
      include: {
        subject: { select: { id: true, name: true, code: true } },
        teacher: { include: { user: { select: { name: true } } } }
      }
    });
    res.json(assignment);
  } catch (error: any) {
    if (error.code === 'P2002') return res.status(400).json({ error: 'This teacher is already assigned to this subject for this class.' });
    res.status(500).json({ error: 'Failed to assign subject teacher' });
  }
});

/**
 * @route   DELETE /api/classes/:id/subject-teachers/:recordId
 * @desc    Remove a subject teacher assignment
 */
router.delete('/:id/subject-teachers/:recordId', requireAuth, requireRole('SCHOOL_ADMIN'), async (req: AuthRequest, res: Response) => {
  const { recordId } = req.params;
  try {
    await prisma.classSubjectTeacher.delete({
      where: { id: recordId as string }
    });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to remove assignment' });
  }
});

export default router;
