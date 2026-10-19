import { Router, Request, Response } from 'express';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import prisma from '../lib/prisma';
import { requireAuth, requireRole, AuthRequest } from '../middleware/auth';
import { generateSequentialId } from '../lib/id-generator';
import { upload, submissionUpload, staffDocumentUpload } from '../middleware/upload';
import multer from 'multer';
import { parseExcelBuffer, generateStaffTemplateBuffer } from '../lib/xlsx-utils';
import { validate } from '../middleware/validation';
import { UpdateProfileSchema } from '../schemas/auth.schema';
import { uploadLimiter } from '../middleware/rate-limit';

const router = Router();
const memoryUpload = multer({ storage: multer.memoryStorage() });

// Define staff roles for EmployeeProfile creation
const STAFF_ROLES = ['TEACHER', 'BURSAR', 'LIBRARIAN', 'ANCILLARY', 'SCHOOL_ADMIN'];

// Roles that a SCHOOL_ADMIN is allowed to assign (cannot self-escalate to SUPER_ADMIN)
const SCHOOL_ADMIN_ASSIGNABLE_ROLES = [
  'TEACHER', 'STUDENT', 'BURSAR', 'LIBRARIAN', 'ANCILLARY', 'PARENT', 'SUPPLIER', 'ALUMNI', 'APPLICANT', 'CLINIC'
];

/**
 * @route   GET /api/users/template
 * @desc    Download the Excel template for staff accounts import
 */
router.get('/template', requireAuth, requireRole('SCHOOL_ADMIN', 'SUPER_ADMIN'), async (req, res) => {
  try {
    const buffer = await generateStaffTemplateBuffer();
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=staff_import_template.xlsx');
    res.send(buffer);
  } catch (error) {
    res.status(500).json({ error: 'Failed to generate staff template' });
  }
});

/**
 * @route   POST /api/users/import
 * @desc    Bulk import staff / user accounts from an Excel file
 */
router.post('/import', requireAuth, requireRole('SCHOOL_ADMIN', 'SUPER_ADMIN'), memoryUpload.single('file'), async (req: AuthRequest, res: Response) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

  try {
    const data = await parseExcelBuffer(req.file.buffer);
    const schoolId = req.user!.schoolId || (req.query.schoolId as string) || (await prisma.school.findFirst())?.id;
    if (!schoolId) return res.status(400).json({ error: 'School ID required for staff import' });

    const results = {
      created: 0,
      skipped: 0,
      errors: [] as string[]
    };

    const defaultHashedPassword = await bcrypt.hash('Password123!', 10);

    for (const [index, row] of (data as any[]).entries()) {
      const rowNum = index + 2;
      const name = (row['Name'] || '').toString().trim();
      const email = (row['Email'] || '').toString().trim().toLowerCase();
      let role = (row['Role'] || 'TEACHER').toString().trim().toUpperCase();
      const staffIdRaw = (row['Staff ID'] || '').toString().trim();
      const phone = (row['Phone'] || '').toString().trim();
      const department = (row['Department'] || '').toString().trim();
      const designation = (row['Designation'] || '').toString().trim();
      const qualification = (row['Qualification'] || '').toString().trim();

      if (!name) {
        results.errors.push(`Row ${rowNum}: Missing name`);
        continue;
      }
      if (!email) {
        results.errors.push(`Row ${rowNum}: Missing email`);
        continue;
      }

      if (!SCHOOL_ADMIN_ASSIGNABLE_ROLES.includes(role)) {
        role = 'TEACHER';
      }

      // Check if user already exists
      const existingUser = await prisma.user.findFirst({
        where: {
          OR: [
            { email },
            ...(staffIdRaw ? [{ staffId: staffIdRaw }] : [])
          ]
        }
      });

      if (existingUser) {
        results.errors.push(`Row ${rowNum}: User with email "${email}" or Staff ID "${staffIdRaw}" already exists`);
        results.skipped++;
        continue;
      }

      try {
        await prisma.$transaction(async (tx) => {
          const generatedId = staffIdRaw || await generateSequentialId(schoolId, role, tx);
          await tx.user.create({
            data: {
              email,
              password: defaultHashedPassword,
              name,
              role,
              phone: phone || null,
              staffId: generatedId,
              schoolId,
              mustChangePassword: true,
              metadata: {
                department,
                designation,
                qualification,
                importedAt: new Date().toISOString()
              },
              ...(role === 'TEACHER' && {
                teacher: {
                  create: {
                    staffId: generatedId,
                    department: department || null,
                    qualification: qualification || null,
                    schoolId
                  }
                }
              }),
              ...(STAFF_ROLES.includes(role) && {
                employeeProfile: {
                  create: {
                    schoolId,
                    jobTitle: designation || role,
                    department: department || null,
                    qualification: qualification || null
                  }
                }
              })
            }
          });
          results.created++;
        });
      } catch (err: any) {
        results.errors.push(`Row ${rowNum}: ${err.message}`);
      }
    }

    res.json({
      success: true,
      summary: `Successfully imported ${results.created} staff members (${results.skipped} skipped).`,
      details: results
    });
  } catch (error: any) {
    console.error('Staff import error:', error);
    res.status(500).json({ error: error.message || 'Failed to process Excel file' });
  }
});

/**
 * @route   GET /api/users/check-duplicate
 * @desc    Live duplicate check for email and national ID / birth certificate within tenant
 */
router.get('/check-duplicate', requireAuth, async (req: AuthRequest, res: Response) => {
  const { email, nationalId, role, excludeUserId } = req.query;
  const schoolId = req.user!.schoolId;
  if (!schoolId) {
    return res.status(400).json({ error: 'School ID required' });
  }

  try {
    let emailCollision: any = null;
    let nationalIdCollision: any = null;

    if (email && typeof email === 'string' && email.trim()) {
      const cleanEmail = email.trim().toLowerCase();
      emailCollision = await prisma.user.findFirst({
        where: {
          schoolId,
          email: cleanEmail,
          ...(excludeUserId ? { id: { not: String(excludeUserId) } } : {})
        },
        select: { id: true, name: true, role: true, email: true }
      });
    }

    if (nationalId && typeof nationalId === 'string' && nationalId.trim()) {
      const cleanNationalId = nationalId.trim();

      // Check students by nationalId column
      const studentMatch = await prisma.student.findFirst({
        where: {
          schoolId,
          nationalId: { equals: cleanNationalId, mode: 'insensitive' },
          ...(excludeUserId ? { userId: { not: String(excludeUserId) } } : {})
        },
        select: { id: true, name: true, class: { select: { name: true } }, user: { select: { id: true, role: true } } }
      });

      if (studentMatch) {
        nationalIdCollision = {
          name: studentMatch.name,
          role: 'STUDENT',
          className: studentMatch.class?.name || null
        };
      } else {
        // Also check if any staff or other user has this national ID in metadata
        const userMatch = await prisma.user.findFirst({
          where: {
            schoolId,
            ...(excludeUserId ? { id: { not: String(excludeUserId) } } : {}),
            OR: [
              { metadata: { path: ['nationalId'], equals: cleanNationalId } },
              { student: { nationalId: { equals: cleanNationalId, mode: 'insensitive' } } }
            ]
          },
          select: { id: true, name: true, role: true }
        });
        if (userMatch) {
          nationalIdCollision = {
            name: userMatch.name,
            role: userMatch.role,
            className: null
          };
        }
      }
    }

    return res.json({
      emailExists: !!emailCollision,
      emailMessage: emailCollision 
        ? `An account with this email already exists: ${emailCollision.name} (${emailCollision.role})` 
        : null,
      nationalIdExists: !!nationalIdCollision,
      nationalIdMessage: nationalIdCollision 
        ? (nationalIdCollision.role === 'STUDENT'
            ? `A student with this ID already exists: ${nationalIdCollision.name}${nationalIdCollision.className ? `, ${nationalIdCollision.className}` : ''}`
            : `A staff account with this National ID already exists: ${nationalIdCollision.name} (${nationalIdCollision.role})`)
        : null
    });
  } catch (error) {
    console.error('Check duplicate error:', error);
    res.status(500).json({ error: 'Failed to verify duplicates' });
  }
});

/**
 * @route   GET /api/users/search
 * @desc    Search registered users (students and staff) in the school by name or ID
 */
router.get('/search', requireAuth, async (req: AuthRequest, res: Response) => {
  const { query, role } = req.query;
  const searchTerm = query ? String(query).trim() : '';

  try {
    const users = await prisma.user.findMany({
      where: {
        schoolId: req.user!.schoolId!,
        ...(role ? { role: String(role).toUpperCase() } : {}),
        OR: [
          { name: { contains: searchTerm, mode: 'insensitive' } },
          { email: { contains: searchTerm, mode: 'insensitive' } },
          { staffId: { contains: searchTerm, mode: 'insensitive' } }
        ]
      },
      select: {
        id: true,
        name: true,
        role: true,
        secondaryRoles: true,
        email: true,
        staffId: true,
        phone: true,
      },
      take: 20,
      orderBy: { name: 'asc' }
    });

    res.json(users);
  } catch (error) {
    console.error('User search error:', error);
    res.status(500).json({ error: 'Failed to search users' });
  }
});

/**
 * @route   GET /api/users/me
 * @desc    Get current user profile
 */
router.get('/me', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const user = await prisma.user.findFirst({
      where: { id: req.user!.id },
      select: {
          id: true,
          email: true,
          name: true,
          role: true,
          secondaryRoles: true,
          phone: true,
          avatar: true,
          staffId: true,
          schoolId: true,
          createdAt: true,
          updatedAt: true,
          religion: true,
          departmentId: true,
          dept: { select: { id: true, name: true } },
          headedDepartments: { select: { id: true, name: true } },
          metadata: true,
          school: { include: { plan: true } },
          teacher: {
            include: {
              dept: { select: { id: true, name: true } },
              classes: { select: { id: true, name: true, level: true } },
              subjects: {
                include: {
                  subject: { select: { id: true, name: true, code: true } }
                }
              },
              subjectClasses: {
                include: {
                  class: { select: { id: true, name: true, level: true } },
                  subject: { select: { id: true, name: true, code: true } }
                }
              },
              houseMastered: { select: { id: true, name: true } }
            }
          },
          employeeProfile: true, // Include HR details
          awards: {
            orderBy: { createdAt: 'desc' },
            take: 10
          },
          assignedAssets: {
            select: { id: true, name: true, assetNumber: true, category: true, status: true, location: true },
            take: 10
          },
          staffQrCodes: {
            select: { id: true, qrToken: true, isActive: true, createdAt: true },
            take: 1
          },
          gateLogs: {
            take: 5,
            orderBy: { scannedAt: 'desc' },
            select: { id: true, scannedAt: true, direction: true, entryStatus: true }
          },
          student: {
            include: { 
              class: true,
              house: true,
              parents: { include: { parent: { include: { user: { select: { id: true, name: true, email: true, role: true, avatar: true } } } } } }
            }
          },
          supplier: {
            include: { schools: { include: { school: true } } }
          },
          parent: {
            include: { students: { include: { student: { include: { school: true } } } } }
          }
      }
    });
    if (!user) return res.status(404).json({ error: 'User not found' });

    // Populate linkedEntities for frontend
    const userRole = user.role.toUpperCase();
    let linkedEntities: any[] = [];
    if (userRole === 'SUPPLIER' && user.supplier) {
        linkedEntities = user.supplier.schools.map(ps => ({
            id: ps.school.code,
            name: ps.school.name,
            schoolCode: ps.school.code,
            schoolName: ps.school.name,
            status: ps.status,
            roleSpecificId: ps.schoolSpecificId
        }));
    } else if (userRole === 'PARENT' && user.parent) {
        linkedEntities = user.parent.students.map(ps => ({
            id: ps.student.studentId,
            name: ps.student.name,
            schoolCode: ps.student.school.code,
            schoolName: ps.student.school.name,
            status: ps.status
        }));
    }

    const schoolData = user.school ? {
      ...user.school,
      subscription: {
        plan: (user.school as any)?.plan?.name || 'Starter',
        status: (user.school as any)?.status || 'active',
        modules: ((user.school as any)?.subscription as any)?.modules || {
          boarding: true,
          clinic: true,
          tuckshop: true,
          uniforms: true,
          transport: true,
          farm: true,
          sports: true
        },
        ...(((user.school as any)?.subscription as any) || {})
      }
    } : null;

    res.json({
        ...user,
        school: schoolData,
        schoolPlan: (user.school as any)?.plan?.name || null,
        linkedEntities
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch user profile' });
  }
});

/**
 * @route   GET /api/users/me/tutorial
 * @desc    Get user's tutorial state for their active role
 */
router.get('/me/tutorial', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const role = (req.user!.role || '').toUpperCase();
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { metadata: true, createdAt: true }
    });
    if (!user) return res.status(404).json({ error: 'User not found' });

    const metadata = (user.metadata as Record<string, any>) || {};
    const tutorialStates = metadata.tutorialState || {};
    let roleTutorial = tutorialStates[role];

    if (!roleTutorial) {
      // Default initial state: 'pending' so onboarding checklist is accessible for the role
      roleTutorial = {
        userId,
        role,
        status: 'pending',
        completedStepIds: [],
        updatedAt: new Date().toISOString()
      };
      await prisma.user.update({
        where: { id: userId },
        data: {
          metadata: {
            ...metadata,
            tutorialState: { ...tutorialStates, [role]: roleTutorial }
          }
        }
      });
    }

    res.json(roleTutorial);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch tutorial state' });
  }
});

/**
 * @route   PATCH /api/users/me/tutorial
 * @desc    Update tutorial status or completed steps for active role
 */
router.patch('/me/tutorial', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const role = (req.user!.role || '').toUpperCase();
    const { status, completedStepIds } = req.body;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { metadata: true }
    });
    if (!user) return res.status(404).json({ error: 'User not found' });

    const metadata = (user.metadata as Record<string, any>) || {};
    const tutorialStates = metadata.tutorialState || {};
    const currentRoleState = tutorialStates[role] || { completedStepIds: [] };

    const updatedRoleState = {
      userId,
      role,
      status: status || currentRoleState.status || 'in_progress',
      completedStepIds: Array.isArray(completedStepIds) ? completedStepIds : currentRoleState.completedStepIds || [],
      updatedAt: new Date().toISOString()
    };

    await prisma.user.update({
      where: { id: userId },
      data: {
        metadata: {
          ...metadata,
          tutorialState: { ...tutorialStates, [role]: updatedRoleState }
        }
      }
    });

    res.json({ success: true, tutorial: updatedRoleState });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update tutorial state' });
  }
});

/**
 * @route   POST /api/users/me/tutorial/reset
 * @desc    Reset tutorial state for replay
 */
router.post('/me/tutorial/reset', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const role = (req.user!.role || '').toUpperCase();

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { metadata: true }
    });
    if (!user) return res.status(404).json({ error: 'User not found' });

    const metadata = (user.metadata as Record<string, any>) || {};
    const tutorialStates = metadata.tutorialState || {};

    const resetState = {
      userId,
      role,
      status: 'pending',
      completedStepIds: [],
      updatedAt: new Date().toISOString()
    };

    await prisma.user.update({
      where: { id: userId },
      data: {
        metadata: {
          ...metadata,
          tutorialState: { ...tutorialStates, [role]: resetState }
        }
      }
    });

    res.json({ success: true, tutorial: resetState, message: 'Tutorial reset for replay' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to reset tutorial' });
  }
});

/**
 * @route   GET /api/users
 * @desc    [ADMIN] Get all users with optional role filter
 */
router.get('/', requireAuth, requireRole('SCHOOL_ADMIN', 'SUPER_ADMIN', 'CLINIC'), async (req: AuthRequest, res: Response) => {
  const { role } = req.query;
  const targetRole = role ? String(role).toUpperCase() : undefined;
  
  try {
    const school = await prisma.school.findUnique({ where: { id: req.user!.schoolId! }});
    
    // First fetch users strictly tied by schoolId, excluding global roles which are managed via junction tables
    let users = await prisma.user.findMany({
      where: { 
        schoolId: req.user!.schoolId,
        role: { notIn: ['SUPPLIER', 'PARENT'] },
        ...(targetRole ? { role: targetRole } : {})
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        secondaryRoles: true,
        avatar: true,
        phone: true,
        staffId: true,
        schoolId: true,
        departmentId: true,
        dept: { select: { id: true, name: true } },
        metadata: true,
        isLocked: true,
        employeeProfile: true, // Added
        teacher: {
          include: {
            subjects: { include: { subject: true } },
            classes: true
          }
        },
        createdAt: true
      },
      orderBy: { name: 'asc' }
    });

    // 2. Fetch Global Roles (SUPPLIER/PARENT) via junction tables
    if (!targetRole || targetRole === 'SUPPLIER') {
        const linkedSuppliers = await prisma.schoolSupplier.findMany({
            where: { schoolId: req.user!.schoolId!, status: 'APPROVED' },
            include: { supplier: { include: { user: true } } }
        });
        const supplierUsers = linkedSuppliers.map(s => {
            if (!s.supplier.user) return null;
            return {
                ...s.supplier.user,
                staffId: s.schoolSpecificId || s.supplier.globalId || s.supplier.user?.staffId
            };
        }).filter(Boolean);
        
        // Merge
        const userIds = new Set(users.map(u => u.id));
        supplierUsers.forEach(su => {
            if (su && su.id && !userIds.has(su.id)) users.push(su as any);
        });
    }

    if (!targetRole || targetRole === 'PARENT') {
        const linkedParents = await prisma.parentStudent.findMany({
            where: { 
                student: { schoolId: req.user!.schoolId! },
                status: 'APPROVED'
            },
            include: { parent: { include: { user: true } } }
        });
        const parentUsers = linkedParents.map(p => {
            if (!p.parent.user) return null;
            return {
                ...p.parent.user,
                staffId: p.parent.globalId || p.parent.user.staffId
            };
        }).filter(Boolean);

        // Merge and deduplicate (a parent might have multiple students in same school)
        const userIds = new Set(users.map(u => u.id));
        parentUsers.forEach(pu => {
            if (pu && pu.id && !userIds.has(pu.id)) users.push(pu as any);
        });
    }

    res.json({ users });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});



/**
 * @route   POST /api/users
 * @desc    [ADMIN] Create a new user account for any role with profile pic and HR details
 */
router.post('/', requireAuth, staffDocumentUpload.fields([
  { name: 'avatar', maxCount: 1 },
  { name: 'idDoc', maxCount: 1 },
  { name: 'residenceDoc', maxCount: 1 },
  { name: 'qualificationsDoc', maxCount: 1 },
  { name: 'transferCertificate', maxCount: 1 },
  { name: 'birthCertificate', maxCount: 1 }
]), async (req: AuthRequest, res: Response) => {
  const { 
    email, password, name, role, phone, 
    // Teacher specific
    staffId, department, qualification,
    // Student specific
    studentId, dob, gender, address, classId, nationalId,
    // Supplier specific
    companyName, contactName, taxClearance, prazCert, vendorNo,
    // Global fields
    departmentId,
    // HR / Payroll / Social Fields
    bloodGroup, dateAssumedPost, dateOfLeaving, designation, 
    accountNumber, accountHolderName, bankName, bankBranch, branchCode, accountType,
    accountNumberZig, accountHolderNameZig, bankNameZig, bankBranchZig, branchCodeZig, accountTypeZig,
    facebookLink, linkedinLink, twitterLink,
    // New Student Specific
    motherTongue, nationality, city, state, prevSchoolClass, prevSchoolAddress,
    hasTransferCertificate, isPhysicallyHandicapped, handicapDetails,
    category, section, dormitory, age, clubId,
    prevSchoolName, purposeForLeaving, dateAdmitted, studentHouseId,
    // Onboarding additional fields
    programLevel, studyMode, researchTitle, standing, part, boardingStatus, guardianName, title, religion
  } = req.body;
  const normalizedEmail = (email || '').trim().toLowerCase();

  // Process secondaryRoles
  let secondaryRoles = req.body.secondaryRoles;
  if (typeof secondaryRoles === 'string') {
    try {
      secondaryRoles = JSON.parse(secondaryRoles);
    } catch {
      secondaryRoles = secondaryRoles.split(',').filter(Boolean).map((s: string) => s.trim());
    }
  }
  if (!Array.isArray(secondaryRoles)) secondaryRoles = [];
  
  if (secondaryRoles.length > 4) {
    return res.status(400).json({ error: 'Maximum 4 secondary roles allowed' });
  }

  // Handle files
  const files = req.files as { [fieldname: string]: Express.Multer.File[] } || {};
  const avatar = files['avatar'] ? `${(req as any).uploadCategoryPath}/${files['avatar'][0].filename}` : (req.body.avatar || null);
  
  const staffDocs = {
    idDoc: files['idDoc'] ? `${(req as any).uploadCategoryPath}/${files['idDoc'][0].filename}` : null,
    residenceDoc: files['residenceDoc'] ? `${(req as any).uploadCategoryPath}/${files['residenceDoc'][0].filename}` : null,
    qualificationsDoc: files['qualificationsDoc'] ? `${(req as any).uploadCategoryPath}/${files['qualificationsDoc'][0].filename}` : null,
  };

  const studentDocs = {
    transferCertificateUrl: files['transferCertificate'] ? `${(req as any).uploadCategoryPath}/${files['transferCertificate'][0].filename}` : null,
    birthCertificateUrl: files['birthCertificate'] ? `${(req as any).uploadCategoryPath}/${files['birthCertificate'][0].filename}` : null,
  };

  // Consolidate all extra fields into metadata for "Show Everything" depth
  const metadata = {
    ...req.body,
    secondaryRoles, // Include for redundant access in JSON
    avatar,
    staffDocs,
    lastModifiedBy: req.user!.id,
    updatedAt: new Date().toISOString()
  };

  const schoolId = req.user!.schoolId;
  if (!schoolId && req.user!.role !== 'SUPER_ADMIN') {
    return res.status(403).json({ error: 'Unauthorized to create users' });
  }

  try {
    const finalRole = (role || 'STUDENT').toUpperCase();

    // Role escalation guard: SCHOOL_ADMINs cannot assign privileged roles to users
    if (req.user!.role === 'SCHOOL_ADMIN' && !SCHOOL_ADMIN_ASSIGNABLE_ROLES.includes(finalRole)) {
      return res.status(403).json({ error: `Unauthorized: Cannot assign role '${finalRole}'` });
    }

    // 1. Email Handling & Validation
    let effectiveEmail = normalizedEmail;
    if (finalRole === 'STUDENT' && !effectiveEmail) {
      if (req.body.guardianEmail && req.body.guardianEmail.trim()) {
        effectiveEmail = req.body.guardianEmail.trim().toLowerCase();
      } else {
        const tempUnique = Date.now().toString(36) + Math.random().toString(36).substring(2, 6);
        effectiveEmail = `student_${tempUnique}@skulas.internal`;
      }
    }

    if (!effectiveEmail) {
      return res.status(400).json({ error: 'Email address is required' });
    }

    if (!effectiveEmail.endsWith('@skulas.internal')) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(effectiveEmail)) {
        return res.status(400).json({ error: `Invalid email address format: ${effectiveEmail}` });
      }

      // Email uniqueness check across the whole tenant
      const existingEmail = await prisma.user.findFirst({
        where: { schoolId, email: effectiveEmail }
      });
      if (existingEmail) {
        return res.status(400).json({
          error: `An account with email '${effectiveEmail}' already exists in this school (${existingEmail.name} - ${existingEmail.role}).`
        });
      }
    }

    // 2. National ID & Birth Certificate Validation and Uniqueness
    const zimIdRegex = /^[0-9]{2}-?[0-9]{6,7}\s?[A-Za-z]\s?-?[0-9]{2}$/;
    const birthCertRegex = /^[A-Za-z0-9/_-]{3,25}$/;

    if (nationalId && typeof nationalId === 'string' && nationalId.trim()) {
      const cleanNid = nationalId.trim();

      if (STAFF_ROLES.includes(finalRole)) {
        const isZim = nationality ? nationality.toLowerCase().includes('zimbabw') : true;
        if (isZim && !zimIdRegex.test(cleanNid)) {
          return res.status(400).json({
            error: `Invalid Zimbabwean National ID format: '${cleanNid}'. Expected format: 63-1234567-X-42`
          });
        }
      } else if (finalRole === 'STUDENT') {
        if (!zimIdRegex.test(cleanNid) && !birthCertRegex.test(cleanNid)) {
          return res.status(400).json({
            error: `Invalid National ID or Birth Certificate number: '${cleanNid}'`
          });
        }
      }

      const existingStudentNid = await prisma.student.findFirst({
        where: { schoolId, nationalId: { equals: cleanNid, mode: 'insensitive' } },
        include: { class: true }
      });
      if (existingStudentNid) {
        return res.status(400).json({
          error: `A student with National ID/Birth Certificate '${cleanNid}' already exists: ${existingStudentNid.name}${existingStudentNid.class ? ` (${existingStudentNid.class.name})` : ''}`
        });
      }

      const existingUserNid = await prisma.user.findFirst({
        where: {
          schoolId,
          OR: [
            { metadata: { path: ['nationalId'], equals: cleanNid } },
            { student: { nationalId: { equals: cleanNid, mode: 'insensitive' } } }
          ]
        }
      });
      if (existingUserNid) {
        return res.status(400).json({
          error: `A user with National ID '${cleanNid}' already exists: ${existingUserNid.name} (${existingUserNid.role})`
        });
      }
    } else if (STAFF_ROLES.includes(finalRole)) {
      const isZim = nationality ? nationality.toLowerCase().includes('zimbabw') : true;
      if (isZim) {
        return res.status(400).json({ error: 'National ID is required for Zimbabwean staff members' });
      }
    }

    // 3. Logic & Date Checks
    if (finalRole === 'STUDENT') {
      if (dob) {
        const birthDate = new Date(dob);
        if (birthDate > new Date()) {
          return res.status(400).json({ error: 'Date of birth cannot be in the future' });
        }
        const ageYears = (Date.now() - birthDate.getTime()) / (365.25 * 24 * 60 * 60 * 1000);
        if (ageYears < 5) {
          return res.status(400).json({ error: 'Student must be at least 5 years of age for enrollment' });
        }
      }
      if (dateAdmitted && new Date(dateAdmitted) > new Date()) {
        return res.status(400).json({ error: 'Admission date cannot be in the future' });
      }
    }

    if (STAFF_ROLES.includes(finalRole)) {
      if (!name || !name.trim()) {
        return res.status(400).json({ error: 'Staff name is required' });
      }
      if (!dateAssumedPost) {
        return res.status(400).json({ error: 'Date assumed post is required for staff' });
      }
      if (new Date(dateAssumedPost) > new Date()) {
        return res.status(400).json({ error: 'Date assumed post cannot be in the future' });
      }
      if (dateOfLeaving && new Date(dateOfLeaving) < new Date(dateAssumedPost)) {
        return res.status(400).json({ error: 'Date of leaving cannot be earlier than date assumed post' });
      }
      if (dob) {
        const birthDate = new Date(dob);
        if (birthDate > new Date()) {
          return res.status(400).json({ error: 'Date of birth cannot be in the future' });
        }
        const ageYears = (Date.now() - birthDate.getTime()) / (365.25 * 24 * 60 * 60 * 1000);
        if (ageYears < 18) {
          return res.status(400).json({ error: 'Staff members must be at least 18 years of age' });
        }
      }
    }

    // 4. File Size Limits Check (Photo <= 5MB, Docs <= 15MB)
    const MAX_AVATAR_SIZE = 5 * 1024 * 1024;
    const MAX_DOC_SIZE = 15 * 1024 * 1024;
    if (files['avatar'] && files['avatar'][0].size > MAX_AVATAR_SIZE) {
      return res.status(400).json({ error: 'Profile photo exceeds the 5MB size limit' });
    }
    const docFields = ['idDoc', 'residenceDoc', 'qualificationsDoc', 'transferCertificate', 'birthCertificate'];
    for (const f of docFields) {
      if (files[f] && files[f][0].size > MAX_DOC_SIZE) {
        return res.status(400).json({ error: `Supporting document (${f}) exceeds the 15MB size limit` });
      }
    }

    const randomPassword = password || crypto.randomBytes(8).toString('hex');
    const hashedPassword = await bcrypt.hash(randomPassword, 10);
    
    // Auto-generate placeholder NSSA and ZIMRA if left blank at creation
    const nssaNumber = req.body.nssaNumber ? req.body.nssaNumber.trim() : 'PENDING_REGISTRATION';
    const taxNumber = req.body.taxNumber ? req.body.taxNumber.trim() : (req.body.taxBpNumber ? req.body.taxBpNumber.trim() : 'PENDING_REGISTRATION');

    // Consolidate enriched metadata
    const finalMetadata = {
      ...metadata,
      effectiveEmail,
      nssaNumber,
      taxNumber,
      nssaStatus: nssaNumber === 'PENDING_REGISTRATION' ? 'PENDING' : 'REGISTERED',
      zimraStatus: taxNumber === 'PENDING_REGISTRATION' ? 'PENDING' : 'REGISTERED'
    };

    // Use transaction for atomic ID generation and record creation
    const user = await prisma.$transaction(async (tx) => {
      // 1. Generate sequential ID inside transaction
      const generatedId = await generateSequentialId(schoolId!, finalRole, tx);

      // 2. Create the base User
      const newUser = await tx.user.create({
        data: {
          email: effectiveEmail,
          password: hashedPassword,
          name,
          role: finalRole,
          secondaryRoles,
          avatar,
          phone,
          religion,
          staffId: staffId || studentId || vendorNo || generatedId,
          schoolId,
          departmentId: (role === 'TEACHER' && !departmentId) ? req.body.departmentId : departmentId,
          metadata: finalMetadata as any,
          mustChangePassword: true,
          ...(finalRole === 'TEACHER' && {
            teacher: {
              create: {
                staffId: staffId || generatedId,
                department,
                qualification,
                title: title || null,
                schoolId: schoolId!
              }
            }
          }),
          ...(finalRole === 'STUDENT' && {
            student: {
              create: {
                studentId: studentId || generatedId,
                nationalId: nationalId || null,
                name,
                email: effectiveEmail,
                phone,
                dob: dob ? new Date(dob) : null,
                gender,
                address,
                schoolId: schoolId!,
                classId: classId || null,
                status: 'Enrolled',
                
                // Expanded Fields
                motherTongue,
                nationality,
                city,
                state,
                prevSchoolClass,
                prevSchoolAddress,
                hasTransferCertificate: hasTransferCertificate === 'true' || hasTransferCertificate === true,
                transferCertificateUrl: studentDocs.transferCertificateUrl,
                isPhysicallyHandicapped: isPhysicallyHandicapped === 'true' || isPhysicallyHandicapped === true,
                handicapDetails,
                category,
                section,
                dormitory,
                birthCertificateUrl: studentDocs.birthCertificateUrl,
                age: age ? parseInt(age) : null,
                clubId,
                prevSchool: prevSchoolName,
                reasonForTransfer: purposeForLeaving,
                enrollmentDate: dateAdmitted ? new Date(dateAdmitted) : new Date(),
                houseId: studentHouseId,
                boardingStatus: boardingStatus || 'Day',
                part: part ? parseInt(part) : 1,
                standing: standing || 'Normal',
                programLevel: programLevel || 'UNDERGRADUATE',
                studyMode: studyMode || 'FULL_TIME',
                researchTitle: researchTitle || null,
                guardianName: guardianName || null
              }
            }
          }),
          ...(STAFF_ROLES.includes(finalRole) && {
            employeeProfile: {
              create: {
                jobTitle: designation || finalRole,
                designation,
                bloodGroup,
                dateAssumedPost: dateAssumedPost ? new Date(dateAssumedPost) : new Date(),
                dateOfLeaving: dateOfLeaving ? new Date(dateOfLeaving) : null,
                accountNumber,
                accountHolderName,
                bankName,
                bankBranch,
                branchCode: branchCode || null,
                accountType: accountType || null,
                accountNumberZig: accountNumberZig || null,
                accountHolderNameZig: accountHolderNameZig || null,
                bankNameZig: bankNameZig || null,
                bankBranchZig: bankBranchZig || null,
                branchCodeZig: branchCodeZig || null,
                accountTypeZig: accountTypeZig || null,
                facebookLink,
                linkedinLink,
                twitterLink,
                staffDocuments: staffDocs as any,
                schoolId: schoolId!
              }
            }
          })
        }
      });

      // 3. Nested student creation is already handled inside newUser.create above.

      // 4. Handle Supplier
      if (finalRole === 'SUPPLIER') {
        const globalId = await generateSequentialId(null, 'SUPPLIER', tx);
        const schoolSpecificId = await generateSequentialId(schoolId || null, 'SUPPLIER', tx);

        const supplier = await tx.supplier.create({
          data: {
            globalId,
            companyName: companyName || req.body.companyName || name,
            contactName: contactName || req.body.contactName || name,
            email,
            phone,
            address: address || req.body.address,
            taxClearance: taxClearance || req.body.taxNumber || req.body.taxClearance || metadata?.taxNumber || metadata?.taxClearance || null,
            prazCert: prazCert || req.body.prazNo || req.body.prazReg || req.body.prazCert || metadata?.prazNo || metadata?.prazReg || metadata?.prazCert || null,
            userId: newUser.id
          }
        });

        // Link to current school immediately as APPROVED (admin created)
        await tx.schoolSupplier.create({
          data: {
            schoolId: schoolId!,
            supplierId: supplier.id,
            status: 'APPROVED',
            schoolSpecificId
          }
        });
      }

      // 5. Handle Parent
      if (finalRole === 'PARENT') {
        const globalId = await generateSequentialId(null, 'PARENT', tx);
        await tx.parent.create({
          data: {
            globalId,
            userId: newUser.id,
            phone,
            address: metadata?.address,
            occupation: metadata?.occupation,
            employer: metadata?.employer
          }
        });
      }

      return newUser;
    });

    res.json({ success: true, message: 'User created successfully', user });
  } catch (error: any) {
    console.error('User creation error:', error);
    res.status(500).json({ error: 'Failed to create user account. Email might be in use or data is invalid.' });
  }
});

/**
 * @route   PUT /api/users/me
 * @desc    Update current user's profile
 */
router.put('/me', requireAuth, uploadLimiter, upload.single('avatar'), validate(UpdateProfileSchema), async (req: AuthRequest, res: Response) => {
  const { 
    name, email, phone, dob, gender, address, metadata, prevSchool, 
    reasonForTransfer, lastGradeAchieved, admissionsNotes, parents, religion,
    bloodGroup, designation, jobTitle, qualification, bio, specialization,
    contractType, nationalId, emergencyName, emergencyPhone, emergencyRelation,
    accountNumber, accountHolderName, bankName, bankBranch, branchCode, accountType,
    accountNumberZig, accountHolderNameZig, bankNameZig, bankBranchZig, branchCodeZig, accountTypeZig,
    facebookLink, linkedinLink, twitterLink
  } = req.body;
  const avatar = req.file ? `${(req as any).uploadCategoryPath}/${req.file.filename}` : req.body.avatar;

  try {
    // 1. Process Metadata
    let parsedMetadata: any = {};
    if (typeof metadata === 'string') {
      try { parsedMetadata = JSON.parse(metadata); } catch(e) {}
    } else if (typeof metadata === 'object' && metadata !== null) {
      parsedMetadata = metadata;
    }

    const existingUser = await prisma.user.findFirst({ 
        where: { id: req.user!.id },
        include: { student: true, parent: true, teacher: true, employeeProfile: true }
    });

    if (!existingUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    const updatedUser = await prisma.$transaction(async (tx) => {
      // 2. Update Student record if exists
      if (existingUser?.student) {
        await tx.student.update({
          where: { id: existingUser.student.id },
          data: {
             dob: dob ? new Date(dob) : undefined,
             gender,
             address,
             hexcoId: req.body.hexcoId,
             nationalId: nationalId !== undefined ? nationalId : undefined,
             prevSchool: prevSchool !== undefined ? prevSchool : undefined,
             reasonForTransfer: reasonForTransfer !== undefined ? reasonForTransfer : undefined,
             lastGradeAchieved: lastGradeAchieved !== undefined ? lastGradeAchieved : undefined,
             admissionsNotes: admissionsNotes !== undefined ? admissionsNotes : undefined
          }
        });
      }

      // 2.2. Update Teacher record if exists
      if (existingUser?.teacher && (qualification !== undefined || req.body.title !== undefined)) {
        await tx.teacher.update({
          where: { id: existingUser.teacher.id },
          data: {
            qualification: qualification !== undefined ? qualification : undefined,
            title: req.body.title !== undefined ? req.body.title : undefined
          }
        });
      }

      // 2.3. Update/Upsert EmployeeProfile for Staff Roles
      const isStaffRole = STAFF_ROLES.includes(existingUser.role) || ['SUPER_ADMIN', 'CLINIC', 'NURSE'].includes(existingUser.role);
      if (isStaffRole && existingUser.schoolId) {
        await tx.employeeProfile.upsert({
          where: { userId: req.user!.id },
          create: {
            userId: req.user!.id,
            schoolId: existingUser.schoolId,
            jobTitle: jobTitle || designation || existingUser.role,
            designation: designation || jobTitle || existingUser.role,
            contractType: contractType || 'Permanent',
            bloodGroup,
            bankName,
            bankBranch,
            branchCode,
            accountNumber,
            accountHolderName,
            accountType,
            bankNameZig,
            bankBranchZig,
            branchCodeZig,
            accountNumberZig,
            accountHolderNameZig,
            accountTypeZig,
            facebookLink,
            linkedinLink,
            twitterLink
          },
          update: {
            jobTitle: jobTitle !== undefined ? jobTitle : undefined,
            designation: designation !== undefined ? designation : undefined,
            contractType: contractType !== undefined ? contractType : undefined,
            bloodGroup: bloodGroup !== undefined ? bloodGroup : undefined,
            bankName: bankName !== undefined ? bankName : undefined,
            bankBranch: bankBranch !== undefined ? bankBranch : undefined,
            branchCode: branchCode !== undefined ? branchCode : undefined,
            accountNumber: accountNumber !== undefined ? accountNumber : undefined,
            accountHolderName: accountHolderName !== undefined ? accountHolderName : undefined,
            accountType: accountType !== undefined ? accountType : undefined,
            bankNameZig: bankNameZig !== undefined ? bankNameZig : undefined,
            bankBranchZig: bankBranchZig !== undefined ? bankBranchZig : undefined,
            branchCodeZig: branchCodeZig !== undefined ? branchCodeZig : undefined,
            accountNumberZig: accountNumberZig !== undefined ? accountNumberZig : undefined,
            accountHolderNameZig: accountHolderNameZig !== undefined ? accountHolderNameZig : undefined,
            accountTypeZig: accountTypeZig !== undefined ? accountTypeZig : undefined,
            facebookLink: facebookLink !== undefined ? facebookLink : undefined,
            linkedinLink: linkedinLink !== undefined ? linkedinLink : undefined,
            twitterLink: twitterLink !== undefined ? twitterLink : undefined
          }
        });
      }

      // 2.5. Update Parent details if provided (looping parents array)
      if (existingUser?.student && parents && Array.isArray(parents)) {
        for (const p of parents) {
          const parentStudent = await tx.parentStudent.findUnique({
            where: {
              parentId_studentId: {
                parentId: p.parentId,
                studentId: existingUser.student.id
              }
            },
            include: { parent: true }
          });
          if (parentStudent) {
            await tx.user.update({
              where: { id: parentStudent.parent.userId },
              data: {
                name: p.name,
                email: p.email,
                phone: p.phone
              }
            });
          }
        }
      }

      // 3. Update User base
      const mergedMetadata = {
        ...(existingUser?.metadata as any || {}),
        ...parsedMetadata,
        ...(existingUser?.role !== 'STUDENT' ? { 
            dob: dob || undefined, 
            gender: gender || undefined, 
            address: address || undefined,
            bio: bio || undefined,
            qualification: qualification || undefined,
            specialization: specialization || undefined,
            nationalId: nationalId || undefined,
        } : {}),
        emergencyName: emergencyName !== undefined ? emergencyName : (existingUser?.metadata as any)?.emergencyName,
        emergencyPhone: emergencyPhone !== undefined ? emergencyPhone : (existingUser?.metadata as any)?.emergencyPhone,
        emergencyRelation: emergencyRelation !== undefined ? emergencyRelation : (existingUser?.metadata as any)?.emergencyRelation,
        avatar: avatar || undefined,
        updatedAt: new Date().toISOString()
      };

      return await tx.user.update({
        where: { id: req.user!.id },
        data: { 
          name, 
          email,
          phone, 
          avatar: avatar || undefined,
          religion: religion !== undefined ? religion : undefined,
          metadata: mergedMetadata as any
        },
        select: { id: true, name: true, email: true, role: true, phone: true, avatar: true, metadata: true, religion: true, updatedAt: true },
      });
    });

    res.json(updatedUser);
  } catch (err) {
    console.error('Profile update error:', err);
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

/**
 * @route   PUT /api/users/:id
 * @desc    [ADMIN] Update any user's profile, roles, and metadata
 */
router.put('/:id', requireAuth, requireRole('SCHOOL_ADMIN'), staffDocumentUpload.fields([
  { name: 'avatar', maxCount: 1 },
  { name: 'idDoc', maxCount: 1 },
  { name: 'residenceDoc', maxCount: 1 },
  { name: 'qualificationsDoc', maxCount: 1 },
  { name: 'transferCertificate', maxCount: 1 },
  { name: 'birthCertificate', maxCount: 1 }
]), async (req: AuthRequest, res: Response) => {
  const id = req.params.id as string;
  const { 
    name, email, phone, role, status, departmentId, secondaryRoles, religion,
    bloodGroup, dateAssumedPost, dateOfLeaving, designation,
    accountNumber, accountHolderName, bankName, bankBranch, branchCode, accountType,
    accountNumberZig, accountHolderNameZig, bankNameZig, bankBranchZig, branchCodeZig, accountTypeZig,
    facebookLink, linkedinLink, twitterLink
  } = req.body;
  
  let parsedSecondaryRoles: string[] = [];
  if (secondaryRoles) {
    if (typeof secondaryRoles === 'string') {
      try {
        parsedSecondaryRoles = JSON.parse(secondaryRoles);
      } catch {
        parsedSecondaryRoles = secondaryRoles.split(',').filter(Boolean).map((s: string) => s.trim());
      }
    } else if (Array.isArray(secondaryRoles)) {
      parsedSecondaryRoles = secondaryRoles;
    }
  }
  
  // Handle files
  const files = req.files as { [fieldname: string]: Express.Multer.File[] } || {};
  const avatar = files['avatar'] ? `${(req as any).uploadCategoryPath}/${files['avatar'][0].filename}` : req.body.avatar;
  
  const newStaffDocs = {
    idDoc: files['idDoc'] ? `${(req as any).uploadCategoryPath}/${files['idDoc'][0].filename}` : undefined,
    residenceDoc: files['residenceDoc'] ? `${(req as any).uploadCategoryPath}/${files['residenceDoc'][0].filename}` : undefined,
    qualificationsDoc: files['qualificationsDoc'] ? `${(req as any).uploadCategoryPath}/${files['qualificationsDoc'][0].filename}` : undefined,
  };

  const studentDocs = {
    transferCertificateUrl: files['transferCertificate'] ? `${(req as any).uploadCategoryPath}/${files['transferCertificate'][0].filename}` : undefined,
    birthCertificateUrl: files['birthCertificate'] ? `${(req as any).uploadCategoryPath}/${files['birthCertificate'][0].filename}` : undefined,
  };

  try {
    const existingUser = await prisma.user.findFirst({ where: { id } });
    if (!existingUser) return res.status(404).json({ error: 'User not found' });

    const updatedUser = await prisma.$transaction(async (tx) => {
      // 1. Sync Student record if it exists
      if (existingUser.role === 'STUDENT') {
        await tx.student.update({
          where: { userId: id },
          data: {
            name,
            email,
            phone,
            dob: req.body.dob ? new Date(req.body.dob) : undefined,
            gender: req.body.gender || undefined,
            address: req.body.address || undefined,
            classId: req.body.classId !== undefined ? (req.body.classId || null) : undefined,
            status: status || undefined,
            motherTongue: req.body.motherTongue !== undefined ? req.body.motherTongue : undefined,
            nationality: req.body.nationality !== undefined ? req.body.nationality : undefined,
            city: req.body.city !== undefined ? req.body.city : undefined,
            state: req.body.state !== undefined ? req.body.state : undefined,
            prevSchoolClass: req.body.prevSchoolClass !== undefined ? req.body.prevSchoolClass : undefined,
            prevSchoolAddress: req.body.prevSchoolAddress !== undefined ? req.body.prevSchoolAddress : undefined,
            hasTransferCertificate: req.body.hasTransferCertificate !== undefined ? (req.body.hasTransferCertificate === 'true' || req.body.hasTransferCertificate === true) : undefined,
            transferCertificateUrl: studentDocs.transferCertificateUrl,
            isPhysicallyHandicapped: req.body.isPhysicallyHandicapped !== undefined ? (req.body.isPhysicallyHandicapped === 'true' || req.body.isPhysicallyHandicapped === true) : undefined,
            handicapDetails: req.body.handicapDetails !== undefined ? req.body.handicapDetails : undefined,
            category: req.body.category !== undefined ? req.body.category : undefined,
            section: req.body.section !== undefined ? req.body.section : undefined,
            dormitory: req.body.dormitory !== undefined ? req.body.dormitory : undefined,
            birthCertificateUrl: studentDocs.birthCertificateUrl,
            age: req.body.age !== undefined ? (req.body.age ? parseInt(req.body.age) : null) : undefined,
            clubId: req.body.clubId !== undefined ? (req.body.clubId || null) : undefined,
            prevSchool: req.body.prevSchoolName !== undefined ? req.body.prevSchoolName : undefined,
            reasonForTransfer: req.body.purposeForLeaving !== undefined ? req.body.purposeForLeaving : undefined,
            enrollmentDate: req.body.dateAdmitted ? new Date(req.body.dateAdmitted) : undefined,
            houseId: req.body.studentHouseId !== undefined ? (req.body.studentHouseId || null) : undefined,
            boardingStatus: req.body.boardingStatus !== undefined ? req.body.boardingStatus : undefined,
            part: req.body.part !== undefined ? (req.body.part ? parseInt(req.body.part) : 1) : undefined,
            standing: req.body.standing !== undefined ? req.body.standing : undefined,
            programLevel: req.body.programLevel !== undefined ? req.body.programLevel : undefined,
            studyMode: req.body.studyMode !== undefined ? req.body.studyMode : undefined,
            researchTitle: req.body.researchTitle !== undefined ? req.body.researchTitle : undefined,
            guardianName: req.body.guardianName !== undefined ? req.body.guardianName : undefined,
            hostelId: req.body.hostelId !== undefined ? (req.body.hostelId || null) : undefined,
            nationalId: req.body.nationalId !== undefined ? req.body.nationalId : undefined
          }
        }).catch((err) => {
          console.error('Failed to sync student update:', err);
        });
      }

      // Build merged metadata
      const existingMetadata = (existingUser.metadata as any) || {};
      const newMetadata = {
        ...existingMetadata,
        ...req.body,
        ...(avatar ? { avatar } : {}),
        staffDocs: {
          ...(existingMetadata.staffDocs || {}),
          ...(newStaffDocs.idDoc ? { idDoc: newStaffDocs.idDoc } : {}),
          ...(newStaffDocs.residenceDoc ? { residenceDoc: newStaffDocs.residenceDoc } : {}),
          ...(newStaffDocs.qualificationsDoc ? { qualificationsDoc: newStaffDocs.qualificationsDoc } : {})
        },
        lastModifiedBy: req.user!.id,
        updatedAt: new Date().toISOString()
      };

      // Role escalation guard on update: only allow safe role changes
      const newRole = role ? role.toUpperCase() : undefined;
      if (newRole && req.user!.role === 'SCHOOL_ADMIN' && !SCHOOL_ADMIN_ASSIGNABLE_ROLES.includes(newRole)) {
        throw new Error(`Unauthorized: Cannot assign role '${newRole}'`);
      }

      return await tx.user.update({
        where: { id },
        data: {
          name,
          email,
          phone,
          role: newRole,
          secondaryRoles: parsedSecondaryRoles,
          avatar,
          departmentId,
          religion: religion !== undefined ? religion : undefined,
          metadata: newMetadata as any
        },
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          secondaryRoles: true,
          avatar: true,
          phone: true,
          staffId: true,
          schoolId: true,
          departmentId: true,
          dept: { select: { id: true, name: true } },
          metadata: true
        }
      });
    });

    // Handle Teacher-specific fields if applicable
    if (updatedUser.role === 'TEACHER') {
       await prisma.teacher.update({
         where: { userId: id },
         data: {
            department: req.body.department || undefined,
            departmentId: req.body.departmentId || undefined,
            qualification: req.body.qualification || undefined,
            title: req.body.title || undefined
         }
       }).catch(() => {});
    }

    // Handle EmployeeProfile updates
    if (STAFF_ROLES.includes(updatedUser.role)) {
      const existingProfile = await prisma.employeeProfile.findUnique({ where: { userId: id } });
      
      const profileData: any = {
        designation: designation || undefined,
        bloodGroup: bloodGroup || undefined,
        dateAssumedPost: dateAssumedPost ? new Date(dateAssumedPost) : undefined,
        dateOfLeaving: dateOfLeaving ? new Date(dateOfLeaving) : undefined,
        accountNumber: accountNumber || undefined,
        accountHolderName: accountHolderName || undefined,
        bankName: bankName || undefined,
        bankBranch: bankBranch || undefined,
        branchCode: branchCode || undefined,
        accountType: accountType || undefined,
        accountNumberZig: accountNumberZig || undefined,
        accountHolderNameZig: accountHolderNameZig || undefined,
        bankNameZig: bankNameZig || undefined,
        bankBranchZig: bankBranchZig || undefined,
        branchCodeZig: branchCodeZig || undefined,
        accountTypeZig: accountTypeZig || undefined,
        facebookLink: facebookLink || undefined,
        linkedinLink: linkedinLink || undefined,
        twitterLink: twitterLink || undefined,
      };

      // Merge documents
      if (existingProfile) {
        const mergedDocs = {
          ...(existingProfile.staffDocuments as any || {}),
          ...newStaffDocs
        };
        profileData.staffDocuments = mergedDocs;
        
        await prisma.employeeProfile.update({
          where: { userId: id },
          data: profileData
        });
      } else {
        await prisma.employeeProfile.create({
          data: {
            ...profileData,
            userId: id,
            schoolId: updatedUser.schoolId!,
            staffDocuments: newStaffDocs as any
          }
        });
      }
    }

    // Sync supplier profile if user is a supplier
    if (updatedUser.role === 'SUPPLIER') {
      const metadataObj = (updatedUser.metadata || {}) as any;
      await prisma.supplier.update({
        where: { userId: id },
        data: {
          companyName: req.body.companyName || metadataObj.companyName || name || undefined,
          contactName: name || req.body.contactName || metadataObj.contactName || undefined,
          email: email || undefined,
          phone: phone || undefined,
          address: req.body.address || metadataObj.address || undefined,
          taxClearance: req.body.taxNumber || req.body.taxClearance || metadataObj.taxNumber || metadataObj.taxClearance || undefined,
          prazCert: req.body.prazNo || req.body.prazReg || req.body.prazCert || metadataObj.prazNo || metadataObj.prazReg || metadataObj.prazCert || undefined
        }
      }).catch((err) => {
        console.error('Failed to sync supplier update:', err);
      });
    }

    res.json({ success: true, user: updatedUser });
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({ error: 'Failed to update user' });
  }
});


// Helper to resolve User ID from User, Student, or Teacher ID
async function resolveUserId(id: string): Promise<string | null> {
  // Check if ID is directly a User ID
  const userExists = await prisma.user.findFirst({
    where: { id },
    select: { id: true }
  });
  if (userExists) return userExists.id;

  // Check if ID belongs to a Student profile
  const student = await prisma.student.findFirst({
    where: { id },
    select: { userId: true }
  });
  if (student?.userId) return student.userId;

  // Check if ID belongs to a Teacher profile
  const teacher = await prisma.teacher.findFirst({
    where: { id },
    select: { userId: true }
  });
  if (teacher?.userId) return teacher.userId;

  return null;
}

/**
 * @route   POST /api/users/:id/lock
 * @desc    [ADMIN] Lock a user account
 */
router.post('/:id/lock', requireAuth, requireRole('SCHOOL_ADMIN'), async (req: AuthRequest, res: Response) => {
  try {
    const resolvedId = await resolveUserId(req.params.id as string);
    if (!resolvedId) {
      return res.status(404).json({ error: 'User account not found' });
    }

    await prisma.user.update({
      where: { id: resolvedId },
      data: { isLocked: true }
    });
    res.json({ success: true, message: 'Account locked successfully' });
  } catch (error) {
    console.error('Lock account error:', error);
    res.status(500).json({ error: 'Failed to lock account' });
  }
});

/**
 * @route   POST /api/users/:id/unlock
 * @desc    [ADMIN] Unlock a user account
 */
router.post('/:id/unlock', requireAuth, requireRole('SCHOOL_ADMIN'), async (req: AuthRequest, res: Response) => {
  try {
    const resolvedId = await resolveUserId(req.params.id as string);
    if (!resolvedId) {
      return res.status(404).json({ error: 'User account not found' });
    }

    await prisma.user.update({
      where: { id: resolvedId },
      data: { isLocked: false }
    });
    res.json({ success: true, message: 'Account unlocked successfully' });
  } catch (error) {
    console.error('Unlock account error:', error);
    res.status(500).json({ error: 'Failed to unlock account' });
  }
});

/**
 * @route   DELETE /api/users/:id
 * @desc    [ADMIN] Delete a user account (cascades to linked profiles)
 */
router.delete('/:id', requireAuth, requireRole('SCHOOL_ADMIN', 'SUPER_ADMIN'), async (req: AuthRequest, res: Response) => {
  try {
    const resolvedId = await resolveUserId(req.params.id as string);
    if (!resolvedId) {
      return res.status(404).json({ error: 'User account not found' });
    }

    // Prevent self-deletion
    if (resolvedId === req.user!.id) {
      return res.status(400).json({ error: 'Cannot delete your own account' });
    }

    await prisma.user.deleteMany({
      where: { id: resolvedId }
    });
    
    res.json({ success: true, message: 'User deleted successfully' });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({ error: 'Failed to delete user' });
  }
});

/**
 * @route   POST /api/users/:id/reset-password
 * @desc    [ADMIN] Reset user password to default "Password"
 */
router.post('/:id/reset-password', requireAuth, requireRole('SCHOOL_ADMIN'), async (req: AuthRequest, res: Response) => {
  try {
    const resolvedId = await resolveUserId(req.params.id as string);
    if (!resolvedId) {
      return res.status(404).json({ error: 'User account not found' });
    }

    const randomPassword = crypto.randomBytes(8).toString('hex');
    const hashedPassword = await bcrypt.hash(randomPassword, 10);
    await prisma.user.update({
      where: { id: resolvedId },
      data: { 
        password: hashedPassword,
        mustChangePassword: true,
        passwordLastChanged: new Date()
      }
    });
    res.json({ success: true, message: 'Password reset to system default successfully' });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ error: 'Failed to reset password' });
  }
});

export default router;
