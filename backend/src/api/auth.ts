import crypto from 'crypto';
import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import prisma from '../lib/prisma';
import { requireAuth, requireRole, AuthRequest } from '../middleware/auth';
import { generateSequentialId } from '../lib/id-generator';
import { saveBase64Image } from '../lib/file-utils';
import { normalizeSchoolCode } from '../lib/utils';
import { validate } from '../middleware/validation';
import { LoginSchema, RegisterUserSchema, UpdateProfileSchema } from '../schemas/auth.schema';
import { authLimiter, strictLimiter } from '../middleware/rate-limit';
import { requireOwnership } from '../middleware/auth';
import { logSecurityEvent } from '../lib/security-logger';

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET as string;

if (!JWT_SECRET || JWT_SECRET === 'your_jwt_secret_here') {
  console.error('CRITICAL ERROR: JWT_SECRET must be set to a strong value in .env');
  // In production we would exit, but in dev we'll allow it with a loud warning
  // if (process.env.NODE_ENV === 'production') process.exit(1);
}

// Password Security Policy
const PASSWORD_EXPIRY_DAYS = 90;
const STRONG_PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;

/**
 * @route   POST /api/auth/impersonate/:userId
 * @desc    [SUPER_ADMIN] Generate a token for any user (impersonation)
 */
router.post('/impersonate/:userId', requireAuth, requireRole('SUPER_ADMIN'), async (req: AuthRequest, res) => {
  const userId = req.params.userId as string;

  try {
    const targetUser = await prisma.user.findFirst({
      where: { id: userId },
      include: { school: true }
    }) as any;

    if (!targetUser) return res.status(404).json({ error: 'User not found' });

    const token = jwt.sign(
      { 
        id: targetUser.id, 
        email: targetUser.email, 
        name: targetUser.name,
        role: targetUser.role, 
        schoolId: targetUser.schoolId,
        schoolCode: targetUser.school?.code,
        isImpersonated: true,
        impersonatorId: req.user!.id
      },
      JWT_SECRET,
      { expiresIn: '1h' } // Shorter duration for impersonation sessions
    );

    res.json({ 
      token, 
      user: { 
        id: targetUser.id,
        name: targetUser.name, 
        role: targetUser.role, 
        schoolName: targetUser.school?.name,
        schoolCode: targetUser.school?.code
      } 
    });
  } catch (error: any) {
    console.error('Impersonation error:', error);
    res.status(500).json({ error: 'Failed to generate impersonation token' });
  }
});

/**
 * @route   POST /api/auth/register
 * @desc    Registers a new school and its primary administrator with branding and details
 */
router.post('/register', async (req, res) => {
  const { 
    name, email, password, adminName, planName, 
    type, address, country, phone, website,
    branding, // { primaryColor, accentColor, logo }
    studentCount
  } = req.body;
  
  const normalizedEmail = email?.trim().toLowerCase();

  try {
    const plan = await prisma.plan.findUnique({ where: { name: planName || 'Starter' } });
    if (!plan) return res.status(400).json({ error: 'Invalid plan selected' });

    const hashedPassword = await bcrypt.hash(password, 10);
    const rawCode = `AX-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
    const schoolCode = normalizeSchoolCode(rawCode);

    const school = await prisma.school.create({
      data: {
        name,
        email: normalizedEmail,
        type: type || 'secondary',
        isCombined: req.body.isCombined || false,
        levels: req.body.levels || [],
        code: schoolCode,
        address,
        country,
        phone,
        website,
        branding: branding || undefined,
        customContent: studentCount ? { studentCount } : undefined,
        planId: plan.id,
        users: {
          create: {
            email: normalizedEmail,
            password: hashedPassword,
            name: adminName || `${name} Admin`,
            role: 'SCHOOL_ADMIN',
          },
        },
        schoolSetting: {
          create: {} // Create default setting
        }
      },
      include: { users: true, schoolSetting: true },
    });

    res.json({ 
      success: true, 
      message: 'School registered successfully',
      schoolCode: school.code 
    });
  } catch (error: any) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Registration failed. Email might already be in use.' });
  }
});

/**
 * @route   POST /api/auth/register-user
 * @desc    Public registration for students, parents, teachers, etc.
 */
router.post('/register-user', authLimiter, validate(RegisterUserSchema), async (req, res) => {
  const { 
    email, password, name, role, phone, schoolCode, avatar,
    // Role specific
    staffId, studentId, dob, gender, address, departmentId,
    metadata // For role-specific custom fields
  } = req.body;
  const normalizedEmail = email?.trim().toLowerCase();

  try {
    let school = null;
    if (schoolCode) {
      const normalizedCode = normalizeSchoolCode(schoolCode);
      school = await prisma.school.findUnique({ where: { code: normalizedCode } });
      if (!school) return res.status(404).json({ error: 'Invalid school code' });
    } else if (role !== 'PARENT' && role !== 'SUPPLIER') {
      return res.status(400).json({ error: 'School code is required for this role' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const finalRole = role.toUpperCase();
    const resolvedSchoolId = school ? school.id : null;
    
    // Handle avatar saving if provided as base64
    const avatarFilename = avatar ? saveBase64Image(avatar, 'avatar', 'images', school?.code) : null;
    
    // Define staff roles
    const STAFF_ROLES = ['TEACHER', 'BURSAR', 'LIBRARIAN', 'ANCILLARY', 'SCHOOL_ADMIN', 'CLINIC'];

    // Use transaction for atomic ID generation and record creation
    const result = await prisma.$transaction(async (tx) => {
      // 1. Resolve Class if grade name is provided (for direct registration)
      let resolvedClassId = req.body.classId || null;
      if (!resolvedClassId && req.body.grade && resolvedSchoolId) {
        const gradeName = req.body.grade.trim();
        const schoolClass = await tx.schoolClass.findFirst({
          where: { name: { equals: gradeName, mode: 'insensitive' }, schoolId: resolvedSchoolId }
        });
        if (schoolClass) resolvedClassId = schoolClass.id;
      }

      // 2. Generate IDs inside transaction
      const generatedId = resolvedSchoolId ? await generateSequentialId(resolvedSchoolId, finalRole, tx) : null;
      const globalId = (finalRole === 'SUPPLIER' || finalRole === 'PARENT') ? await generateSequentialId(null, finalRole, tx) : null;

      // Handle Documents (Base64)
      const staffDocs: any = {};
      if (STAFF_ROLES.includes(finalRole)) {
        if (req.body.idDoc) staffDocs.idDoc = saveBase64Image(req.body.idDoc, 'id', 'docs', school?.code, 'staff', generatedId || 'unknown');
        if (req.body.residenceDoc) staffDocs.residenceDoc = saveBase64Image(req.body.residenceDoc, 'residence', 'docs', school?.code, 'staff', generatedId || 'unknown');
        if (req.body.qualificationsDoc) staffDocs.qualificationsDoc = saveBase64Image(req.body.qualificationsDoc, 'qual', 'docs', school?.code, 'staff', generatedId || 'unknown');
      }

      // Handle Student Documents (Base64)
      let transferCertificateUrl = null;
      let birthCertificateUrl = null;
      if (finalRole === 'STUDENT') {
        if (req.body.transferCertificate) transferCertificateUrl = saveBase64Image(req.body.transferCertificate, 'transfer_cert', 'docs', school?.code, 'students', generatedId || 'unknown');
        if (req.body.birthCertificate) birthCertificateUrl = saveBase64Image(req.body.birthCertificate, 'birth_cert', 'docs', school?.code, 'students', generatedId || 'unknown');
      }

      // 3. Create User
      const user = await tx.user.create({
        data: {
          email,
          password: hashedPassword,
          name,
          role: finalRole,
          phone,
          avatar: avatarFilename,
          staffId: (finalRole !== 'STUDENT' && finalRole !== 'PARENT' && finalRole !== 'SUPPLIER') ? (staffId || (generatedId as string)) : (finalRole === 'SUPPLIER' ? (staffId || (generatedId as string)) : null),
          schoolId: resolvedSchoolId,
          metadata: {
            ...metadata,
            staffDocs
          },
          ...(finalRole === 'TEACHER' && resolvedSchoolId && {
            teacher: {
              create: {
                staffId: (staffId || generatedId) as string,
                schoolId: resolvedSchoolId,
                qualification: req.body.qualification || null,
                department: req.body.department || null,
                departmentId: req.body.departmentId || null
              }
            }
          }),
          ...(STAFF_ROLES.includes(finalRole) && resolvedSchoolId && {
            employeeProfile: {
              create: {
                jobTitle: req.body.designation || finalRole,
                designation: req.body.designation,
                bloodGroup: req.body.bloodGroup,
                dateAssumedPost: req.body.dateAssumedPost ? new Date(req.body.dateAssumedPost) : new Date(),
                accountNumber: req.body.accountNumber,
                accountHolderName: req.body.accountHolderName,
                bankName: req.body.bankName,
                bankBranch: req.body.bankBranch,
                branchCode: req.body.branchCode || null,
                accountType: req.body.accountType || null,
                accountNumberZig: req.body.accountNumberZig || null,
                accountHolderNameZig: req.body.accountHolderNameZig || null,
                bankNameZig: req.body.bankNameZig || null,
                bankBranchZig: req.body.bankBranchZig || null,
                branchCodeZig: req.body.branchCodeZig || null,
                accountTypeZig: req.body.accountTypeZig || null,
                facebookLink: req.body.facebookLink,
                linkedinLink: req.body.linkedinLink,
                twitterLink: req.body.twitterLink,
                staffDocuments: staffDocs as any,
                schoolId: resolvedSchoolId!
              }
            }
          })
        },
        include: { teacher: true }
      });

      // 4. Handle Teacher Subjects linkage
      if (finalRole === 'TEACHER' && req.body.subjects && user.teacher) {
        const subjectNames = (req.body.subjects as string).split(',').map(s => s.trim()).filter(s => !!s);
        const subjects = await tx.subject.findMany({
          where: {
            schoolId: resolvedSchoolId!,
            name: { in: subjectNames }
          }
        });

        if (subjects.length > 0) {
          await tx.teacherSubject.createMany({
            data: subjects.map(s => ({
              teacherId: user.teacher!.id,
              subjectId: s.id
            }))
          });
        }
      }

      // 3. Create Role-Specific Models
      if (finalRole === 'STUDENT' && resolvedSchoolId) {
        await tx.student.create({
          data: {
            studentId: studentId || generatedId,
            name,
            email: email.trim().toLowerCase(),
            phone,
            dob: dob ? new Date(dob) : null,
            gender,
            address,
            userId: user.id,
            schoolId: resolvedSchoolId,
            classId: resolvedClassId,
            status: 'Enrolled',
            
            // Expanded Registration Fields
            motherTongue: req.body.motherTongue,
            nationality: req.body.nationality,
            city: req.body.city,
            state: req.body.state,
            prevSchoolClass: req.body.prevSchoolClass,
            prevSchoolAddress: req.body.prevSchoolAddress,
            hasTransferCertificate: req.body.hasTransferCertificate === 'true' || req.body.hasTransferCertificate === true,
            transferCertificateUrl,
            isPhysicallyHandicapped: req.body.isPhysicallyHandicapped === 'true' || req.body.isPhysicallyHandicapped === true,
            handicapDetails: req.body.handicapDetails,
            category: req.body.category,
            section: req.body.section,
            dormitory: req.body.dormitory,
            birthCertificateUrl,
            age: req.body.age ? parseInt(req.body.age) : null,
            clubId: req.body.clubId,
            prevSchool: req.body.prevSchoolName || req.body.prevSchool,
            reasonForTransfer: req.body.reasonForTransfer || req.body.purposeForLeaving,
            lastGradeAchieved: req.body.lastGradeAchieved || req.body.prevSchoolClass,
            enrollmentDate: req.body.dateAdmitted ? new Date(req.body.dateAdmitted) : new Date(),
            houseId: req.body.houseId || req.body.studentHouseId,
            hostelId: req.body.hostelId || null,
            roomId: req.body.roomId || null,
          }
        });
      }

      if (finalRole === 'SUPPLIER') {
        const supplier = await tx.supplier.create({
          data: {
            globalId,
            companyName: metadata?.companyName || req.body.companyName || name,
            contactName: name,
            email,
            phone,
            userId: user.id,
            address: metadata?.address || req.body.address,
            taxClearance: metadata?.taxNumber || metadata?.taxClearance || req.body.taxNumber || req.body.taxClearance || null,
            prazCert: metadata?.prazReg || metadata?.prazNo || req.body.prazNo || req.body.prazReg || null
          }
        });

        if (resolvedSchoolId) {
          await tx.schoolSupplier.create({
            data: {
              schoolId: resolvedSchoolId,
              supplierId: supplier.id,
              status: 'PENDING'
            }
          });
        }
      }

      if (finalRole === 'PARENT') {
        const parent = await tx.parent.create({
          data: {
            globalId,
            userId: user.id,
            phone,
            address: metadata?.address,
            occupation: metadata?.occupation,
            employer: metadata?.employer
          }
        });

        // Link student if details provided
        if (school && req.body.studentId) {
            const student = await tx.student.findFirst({
                where: { 
                    studentId: req.body.studentId,
                    schoolId: school.id
                },
                include: { user: true }
            });

            if (student) {
                let isApproved = false;
                if (req.body.studentPassword && student.user) {
                    isApproved = await bcrypt.compare(req.body.studentPassword, student.user.password);
                }

                await tx.parentStudent.create({
                    data: {
                        parentId: parent.id,
                        studentId: student.id,
                        status: isApproved ? 'APPROVED' : 'PENDING',
                        relation: metadata?.relation || 'Guardian',
                        isPrimaryPayer: !!metadata?.isPayer
                    }
                });
            }
        }
      }

      return user;
    });

    res.json({ success: true, message: 'Account created successfully', userId: result.id });
  } catch (error: any) {
    console.error('Portal registration error:', error);
    if (error.code === 'P2002') {
      const target = error.meta?.target as string[];
      return res.status(400).json({ error: `This ${target?.[0] || 'record'} is already registered. Please use a different one or login.` });
    }
    if (error.code === 'P2003') {
      return res.status(400).json({ error: 'Invalid reference selected (e.g. Department or School no longer exists). Please refresh and try again.' });
    }
    res.status(500).json({ error: 'Registration failed due to a server error.' });
  }
});

/**
 * @route   POST /api/auth/login
 * @desc    Authenticates a user and returns a token
 */
router.post('/login', authLimiter, validate(LoginSchema), async (req, res) => {
  const { email, password, schoolCode } = req.body;
  
  if (!email || !password) {
    console.log('Login attempt failed: Missing email or password');
    return res.status(400).json({ error: 'Email and password are required' });
  }

  const normalizedEmail = email.trim().toLowerCase();
  const normalizedCode = normalizeSchoolCode(schoolCode);

  console.log(`Login attempt: email=${normalizedEmail}, code=${normalizedCode}`);

  try {
    const user = await prisma.user.findFirst({
      where: { email: normalizedEmail },
      include: { 
        school: { include: { plan: true } },
        supplier: {
          include: { schools: { include: { school: true } } }
        },
        parent: {
          include: { students: { include: { student: { include: { school: true } } } } }
        },
        student: true
      },
    });

    // Special handling for Parent/Supplier/SuperAdmin login
    const userRole = user?.role?.toUpperCase();
    const isGlobalRole = userRole === 'SUPER_ADMIN' || userRole === 'PARENT' || userRole === 'SUPPLIER';
    
    console.log(`[Login] Role: ${userRole}, IsGlobal: ${isGlobalRole}, Code: ${normalizedCode}`);

    if (!user) {
      return res.status(401).json({ error: "We couldn't find an account matching that email and password. Please check for typos and make sure Caps Lock is off." });
    }

    if (!isGlobalRole) {
        if (!normalizedCode) {
          console.log('Login failed: Missing school code for non-global role');
          return res.status(401).json({ error: "Please enter your School Access Code (e.g., AX-EMBAKWE) to log in. You can find this in your welcome email." });
        }
        if (user.school?.code !== normalizedCode) {
          console.log(`Login failed: School code mismatch for [${normalizedEmail}]. Expected [${user.school?.code}], got [${normalizedCode}]`);
          return res.status(401).json({ error: 'Invalid school code' });
        }
        if (user.school?.status === 'suspended') {
          return res.status(403).json({ error: 'Your school account is currently suspended. Please contact our support team to reactivate your access.' });
        }
        if (user.school?.status === 'deleted') {
          return res.status(403).json({ error: 'Your school account has been deleted.' });
        }
    }

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
      console.log(`Login failed: Password mismatch for [${normalizedEmail}]`);
      if (user.schoolId) {
        logSecurityEvent({ 
          actorId: user.id, 
          action: 'FAILED_LOGIN', 
          entityType: 'User', 
          entityId: user.id, 
          details: { reason: 'Password mismatch' }, 
          schoolId: user.schoolId, 
          ipAddress: req.ip 
        });
      }
      return res.status(401).json({ error: "We couldn't find an account matching that email and password. Please check for typos and make sure Caps Lock is off." });
    }

    // Check if account is locked
    if (user.isLocked) {
      return res.status(403).json({ error: 'This account has been locked. Please contact your school administrator.' });
    }

    // Check if password change is required
    let changePasswordRequired = user.mustChangePassword;
    
    // Check for 90-day expiry
    const lastChanged = new Date(user.passwordLastChanged);
    const now = new Date();
    const diffDays = Math.ceil(Math.abs(now.getTime() - lastChanged.getTime()) / (1000 * 60 * 60 * 24));
    
    if (diffDays >= PASSWORD_EXPIRY_DAYS) {
      changePasswordRequired = true;
    }

    // Create UserSession
    const sessionExpiryHours = (userRole === 'BURSAR' || userRole === 'SCHOOL_ADMIN' || userRole === 'SUPER_ADMIN') ? 8 : 24;
    
    const session = await prisma.userSession.create({
      data: {
        userId: user.id,
        ipAddress: req.ip || null,
        userAgent: req.headers['user-agent'] || null,
        expiresAt: new Date(Date.now() + sessionExpiryHours * 60 * 60 * 1000)
      }
    });

    const token = jwt.sign(
      { 
        id: user.id, 
        email: user.email, 
        name: user.name,
        role: user.role, 
        schoolId: user.schoolId,
        schoolCode: user.school?.code,
        staffId: user.staffId,
        studentId: userRole === 'STUDENT' ? (user as any).student?.studentId : undefined,
        sessionId: session.id
      },
      JWT_SECRET,
      { expiresIn: `${sessionExpiryHours}h` }
    );

    // Populate linkedEntities for frontend compatibility
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
            id: ps.student.id, // Use CUID for internal lookups
            name: ps.student.name,
            studentCode: ps.student.studentId, // Keep school-specific ID as metadata
            schoolCode: ps.student.school.code,
            schoolName: ps.student.school.name,
            status: ps.status
        }));
    }

    res.json({ 
      token, 
      user: { 
        id: user.id,
        name: user.name, 
        role: user.role, 
        secondaryRoles: user.secondaryRoles,
        staffId: user.staffId,
        studentId: userRole === 'STUDENT' ? (user as any).student?.studentId : undefined,
        schoolName: user.school?.name,
        schoolCode: user.school?.code,
        schoolType: user.school?.type,
        schoolBranding: user.school?.branding,
        schoolPlan: (user.school as any)?.plan?.name || null,
        linkedEntities,
        createdAt: user.createdAt.toISOString(),
        mustChangePassword: changePasswordRequired
      } 
    });
    // Audit login
    if (user.schoolId) {
      logSecurityEvent({ actorId: user.id, action: 'USER_LOGIN', entityType: 'User', entityId: user.id, details: { role: user.role, email: user.email }, schoolId: user.schoolId, ipAddress: req.ip });
    }
    } catch (error: any) {
      console.error('Login error:', error);
      res.status(500).json({ error: 'Internal server error during login' });
    }
});

/**
 * @route   POST /api/auth/logout
 * @desc    Logs out user by invalidating their specific session
 */
router.post('/logout', requireAuth, async (req: AuthRequest, res) => {
  try {
    const sessionId = req.user?.sessionId;
    if (sessionId) {
      await prisma.userSession.update({
        where: { id: sessionId },
        data: { isValid: false }
      });
      if (req.user?.schoolId) {
        logSecurityEvent({ 
          actorId: req.user.id, 
          action: 'USER_LOGOUT', 
          entityType: 'UserSession', 
          entityId: sessionId, 
          details: { reason: 'Explicit logout' }, 
          schoolId: req.user.schoolId, 
          ipAddress: req.ip 
        });
      }
    }
    res.json({ success: true, message: 'Logged out successfully' });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({ error: 'Failed to logout' });
  }
});

/**
 * @route   GET /api/auth/sessions
 * @desc    Gets active sessions for the current user
 */
router.get('/sessions', requireAuth, async (req: AuthRequest, res) => {
  try {
    const sessions = await prisma.userSession.findMany({
      where: { 
        userId: req.user!.id,
        isValid: true,
        expiresAt: { gt: new Date() }
      },
      orderBy: { lastActiveAt: 'desc' }
    });
    res.json(sessions);
  } catch (error) {
    console.error('Fetch sessions error:', error);
    res.status(500).json({ error: 'Failed to fetch sessions' });
  }
});

/**
 * @route   DELETE /api/auth/sessions/:id
 * @desc    Revokes a specific session
 */
router.delete('/sessions/:id', requireAuth, async (req: AuthRequest, res) => {
  try {
    const sessionId = req.params['id'] as string;
    const session = await prisma.userSession.findFirst({
      where: { id: sessionId, userId: req.user!.id }
    });

    if (!session) {
      return res.status(404).json({ error: 'Session not found or already revoked' });
    }

    await prisma.userSession.update({
      where: { id: sessionId },
      data: { isValid: false }
    });
    
    if (req.user?.schoolId) {
      logSecurityEvent({ 
        actorId: req.user.id, 
        action: 'REVOKE_SESSION', 
        entityType: 'UserSession', 
        entityId: sessionId, 
        details: { revokedSessionId: sessionId }, 
        schoolId: req.user.schoolId, 
        ipAddress: req.ip 
      });
    }

    res.json({ success: true, message: 'Session revoked successfully' });
  } catch (error) {
    console.error('Revoke session error:', error);
    res.status(500).json({ error: 'Failed to revoke session' });
  }
});

/**
 * @route   POST /api/auth/register-application
 * @desc    Submit an entrance application for prospective students
 */
router.post('/register-application', authLimiter, async (req, res) => {
  try {
    const { schoolCode, applicantName, email, phone, dob, gender, appType, notes, password, classId, entryCategory, academicData } = req.body;
    const normalizedCode = normalizeSchoolCode(schoolCode);
    const school = await prisma.school.findUnique({ where: { code: normalizedCode } });
    if (!school) return res.status(404).json({ error: 'Invalid school code' });

    const randomPassword = password || crypto.randomBytes(8).toString('hex');
    const hashedPassword = await bcrypt.hash(randomPassword, 10);

    const result = await prisma.$transaction(async (tx) => {
      // 1. Generate unguessable Application ID to prevent enumeration
      const applicationNumber = `APP-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;

      // 2. Create User account for the applicant
      const user = await tx.user.create({
        data: {
          email,
          password: hashedPassword,
          name: applicantName,
          role: 'APPLICANT',
          phone,
          schoolId: school.id,
          staffId: applicationNumber,
          mustChangePassword: true
        }
      });

      // 3. Create Application linked to the user
      const application = await tx.application.create({
        data: {
          applicationNumber,
          applicantName,
          email,
          phone,
          dob: dob ? new Date(dob) : null,
          gender,
          appType: appType || 'Form 1',
          entryCategory,
          academicData,
          schoolId: school.id,
          address: req.body.address,
          prevSchool: req.body.prevSchool,
          reasonForTransfer: req.body.reasonForTransfer,
          lastGradeAchieved: req.body.lastGradeAchieved,
          academicHistory: req.body.academicHistory,
          assignedClassId: classId || undefined,
          notes,
          status: 'pending',
          timeline: {
            create: {
              event: 'Application Submitted',
              description: `Application received via online portal. Tracking ID: ${applicationNumber}`
            }
          }
        }
      });

      // 4. Handle Documents
      if (req.body.documents && Array.isArray(req.body.documents)) {
        for (const doc of req.body.documents) {
          const filename = saveBase64Image(doc.data, 'doc', 'docs', school.code, 'students', applicationNumber);
          if (filename) {
            await tx.applicantDocument.create({
              data: {
                applicationId: application.id,
                name: doc.name,
                url: filename,
                status: 'pending'
              }
            });
          }
        }
      }

      return { user, application };
    });

    res.json({ 
      success: true, 
      message: 'Application submitted and Portal Account created!', 
      applicationId: result.application.applicationNumber || result.application.id,
      userId: result.user.id
    });
  } catch (error: any) {
    console.error('Application submission error:', error);
    res.status(500).json({ error: 'Submitting application failed. Email might already be registered.' });
  }
});

/**
 * @route   GET /api/auth/application-status/:appId
 * @desc    Check the status of an application
 */
router.get('/application-status/:appId', authLimiter, async (req, res) => {
  const { appId } = req.params;
  const { schoolCode } = req.query;
  const safeAppId = String(appId);

  try {
    const application = await prisma.application.findFirst({
      where: {
        OR: [
          { id: safeAppId },
          { applicationNumber: safeAppId }
        ]
      },
      include: {
        timeline: { orderBy: { occurredAt: 'desc' } },
        school: { select: { code: true } }
      }
    });

    if (application && (!schoolCode || application.school.code === (schoolCode as string).toUpperCase())) {
      return res.json({
        status: application.status,
        applicantName: application.applicantName,
        type: application.appType,
        timeline: application.timeline
      });
    }

    // Fallback: Check Job Applications
    const jobApp = await prisma.jobApplication.findFirst({
      where: { id: safeAppId },
      include: {
        school: { select: { code: true } },
        vacancy: { select: { jobTitle: true } }
      }
    });

    if (jobApp && (!schoolCode || jobApp.school.code === (schoolCode as string).toUpperCase())) {
      const timeline: any[] = [];

      timeline.push({
        id: 'applied',
        occurredAt: jobApp.createdAt,
        event: 'Application Submitted',
        description: `Successfully applied for the vacancy: ${jobApp.vacancy.jobTitle}`
      });

      const status = jobApp.status;
      if (status !== 'Applied') {
        const updateDate = jobApp.updatedAt;
        if (status === 'Under Review') {
          timeline.push({ id: 'review', occurredAt: updateDate, event: 'Application Under Review', description: 'Recruitment team is reviewing your profile and credentials.' });
        } else if (status === 'Shortlisted' || status === 'Interviewing') {
          timeline.push({ id: 'interview', occurredAt: updateDate, event: 'Shortlisted for Interview', description: 'You have been shortlisted. The recruitment team will reach out for interviews.' });
        } else if (status === 'Hired' || status === 'Accepted') {
          timeline.push({ id: 'hired', occurredAt: updateDate, event: 'Application Approved (Hired)', description: 'Congratulations! You have been selected and hired for this position.' });
        } else if (status === 'Rejected') {
          timeline.push({ id: 'rejected', occurredAt: updateDate, event: 'Application Closed', description: 'Thank you for your interest. We have decided to proceed with other candidates at this time.' });
        }
      }

      timeline.sort((a, b) => new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime());

      return res.json({
        status: jobApp.status,
        applicantName: jobApp.applicantName,
        type: `Job Application: ${jobApp.vacancy.jobTitle}`,
        timeline
      });
    }

    return res.status(404).json({ error: 'Application not found' });
  } catch (error) {
    console.error('Error tracking application:', error);
    res.status(500).json({ error: 'Searching for application failed.' });
  }
});

/**
 * @route   POST /api/auth/change-password
 * @desc    Mandatory or voluntary password update
 */
router.post('/change-password', requireAuth, strictLimiter, async (req: AuthRequest, res) => {
  const { oldPassword, newPassword } = req.body;

  try {
    const user = await prisma.user.findFirst({ where: { id: req.user!.id } });
    if (!user) return res.status(404).json({ error: 'User not found' });

    // Verify old password
    const valid = await bcrypt.compare(oldPassword, user.password);
    if (!valid) {
      console.log(`[ChangePassword Error] ID: ${user.id}, Email: ${user.email}, Hashed start: ${user.password.substring(0, 10)}`);
      return res.status(400).json({ error: 'Current password provided is incorrect' });
    }

    // Validate new password strength
    if (!STRONG_PASSWORD_REGEX.test(newPassword)) {
      return res.status(400).json({ 
        error: 'Password must be at least 8 characters long and include uppercase, lowercase, numbers, and symbols.' 
      });
    }

    const hashedNewPassword = await bcrypt.hash(newPassword, 10);

    await prisma.user.update({
      where: { id: user.id },
      data: {
        password: hashedNewPassword,
        mustChangePassword: false,
        passwordLastChanged: new Date()
      }
    });

    res.json({ success: true, message: 'Password updated successfully' });
  } catch (error: any) {
    console.error('Password change error:', error);
    res.status(500).json({ error: 'Failed to update password' });
  }
});

/**
 * @route   POST /api/auth/link-entity
 * @desc    Submit a connection request to a school (either Parent or Supplier)
 */
router.post('/link-entity', requireAuth, async (req: AuthRequest, res) => {
  const { schoolCode, entityId, password } = req.body;
  const user = await prisma.user.findFirst({ 
    where: { id: req.user!.id },
    include: { supplier: true, parent: true }
  });
  
  if (!user) return res.status(404).json({ error: 'User not found' });
  if (!schoolCode) return res.status(400).json({ error: 'School code is required' });

  try {
    const normalizedCode = normalizeSchoolCode(schoolCode);
    const school = await prisma.school.findUnique({ where: { code: normalizedCode } });
    if (!school) return res.status(404).json({ error: 'School not found' });

    if (user.role === 'PARENT') {
      if (!user.parent) return res.status(400).json({ error: 'Parent record not found for this account' });
      if (!entityId) return res.status(400).json({ error: 'Student ID required' });
      if (!password) return res.status(400).json({ error: 'Student portal password required for verification' });

      const student = await prisma.student.findFirst({
        where: { studentId: entityId, schoolId: school.id },
        include: { user: true }
      });

      if (!student || !student.user) {
        return res.status(404).json({ error: 'Student not found in this school' });
      }

      const valid = await bcrypt.compare(password, student.user.password);
      if (!valid) return res.status(401).json({ error: 'Incorrect student portal password' });

      // Create linked student record
      await prisma.parentStudent.upsert({
        where: {
          parentId_studentId: {
            parentId: user.parent.id,
            studentId: student.id
          }
        },
        update: { status: 'APPROVED' },
        create: {
          parentId: user.parent.id,
          studentId: student.id,
          status: 'APPROVED'
        }
      });

    } else if (user.role === 'SUPPLIER') {
      if (!user.supplier) return res.status(400).json({ error: 'Supplier record not found for this account' });

      await prisma.schoolSupplier.upsert({
        where: {
          schoolId_supplierId: {
            schoolId: school.id,
            supplierId: user.supplier.id
          }
        },
        update: { status: 'PENDING' },
        create: {
          schoolId: school.id,
          supplierId: user.supplier.id,
          status: 'PENDING'
        }
      });
    } else {
      return res.status(403).json({ error: 'Role not supported for entity linking' });
    }

    // Fetch updated linked entities to return to frontend
    let linkedEntities: any[] = [];
    const updatedUser = await prisma.user.findFirst({
      where: { id: user.id },
      include: {
        supplier: { include: { schools: { include: { school: true } } } },
        parent: { include: { students: { include: { student: { include: { school: true } } } } } }
      }
    });

    if (updatedUser?.role === 'SUPPLIER' && updatedUser.supplier) {
      linkedEntities = updatedUser.supplier.schools.map(ps => ({
        id: ps.school.code,
        name: ps.school.name,
        schoolCode: ps.school.code,
        schoolName: ps.school.name,
        status: ps.status,
        roleSpecificId: ps.schoolSpecificId
      }));
    } else if (updatedUser?.role === 'PARENT' && updatedUser.parent) {
      linkedEntities = updatedUser.parent.students.map(ps => ({
        id: ps.student.studentId,
        name: ps.student.name,
        schoolCode: ps.student.school.code,
        schoolName: ps.student.school.name,
        status: ps.status
      }));
    }

    res.json({ success: true, message: 'Link established or request submitted', linkedEntities });
  } catch (error) {
    console.error('Link entity error:', error);
    res.status(500).json({ error: 'Failed to link entity' });
  }
});

export default router;
