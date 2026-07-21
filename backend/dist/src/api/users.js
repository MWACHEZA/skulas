"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const crypto_1 = __importDefault(require("crypto"));
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const prisma_1 = __importDefault(require("../lib/prisma"));
const auth_1 = require("../middleware/auth");
const id_generator_1 = require("../lib/id-generator");
const upload_1 = require("../middleware/upload");
const validation_1 = require("../middleware/validation");
const auth_schema_1 = require("../schemas/auth.schema");
const rate_limit_1 = require("../middleware/rate-limit");
const router = (0, express_1.Router)();
// Define staff roles for EmployeeProfile creation
const STAFF_ROLES = ['TEACHER', 'BURSAR', 'LIBRARIAN', 'ANCILLARY', 'SCHOOL_ADMIN'];
// Roles that a SCHOOL_ADMIN is allowed to assign (cannot self-escalate to SUPER_ADMIN)
const SCHOOL_ADMIN_ASSIGNABLE_ROLES = [
    'TEACHER', 'STUDENT', 'BURSAR', 'LIBRARIAN', 'ANCILLARY', 'PARENT', 'SUPPLIER', 'ALUMNI', 'APPLICANT', 'CLINIC'
];
/**
 * @route   GET /api/users/me
 * @desc    Get current user profile
 */
router.get('/me', auth_1.requireAuth, async (req, res) => {
    try {
        const user = await prisma_1.default.user.findFirst({
            where: { id: req.user.id },
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
                religion: true,
                departmentId: true,
                dept: { select: { id: true, name: true } },
                metadata: true,
                school: { include: { plan: true } },
                teacher: {
                    include: {
                        subjects: {
                            include: {
                                subject: true
                            }
                        }
                    }
                },
                employeeProfile: true, // Include HR details
                student: {
                    include: {
                        class: true,
                        parents: { include: { parent: { include: { user: { select: { id: true, name: true, email: true, role: true, avatar: true } } } } } }
                    }
                },
                // Include HEXCO fields explicitly if they are in the models
                // They are already in Student/School models, but need to be selectable
                supplier: {
                    include: { schools: { include: { school: true } } }
                },
                parent: {
                    include: { students: { include: { student: { include: { school: true } } } } }
                }
            }
        });
        if (!user)
            return res.status(404).json({ error: 'User not found' });
        // Populate linkedEntities for frontend
        const userRole = user.role.toUpperCase();
        let linkedEntities = [];
        if (userRole === 'SUPPLIER' && user.supplier) {
            linkedEntities = user.supplier.schools.map(ps => ({
                id: ps.school.code,
                name: ps.school.name,
                schoolCode: ps.school.code,
                schoolName: ps.school.name,
                status: ps.status,
                roleSpecificId: ps.schoolSpecificId
            }));
        }
        else if (userRole === 'PARENT' && user.parent) {
            linkedEntities = user.parent.students.map(ps => ({
                id: ps.student.studentId,
                name: ps.student.name,
                schoolCode: ps.student.school.code,
                schoolName: ps.student.school.name,
                status: ps.status
            }));
        }
        res.json({
            ...user,
            schoolPlan: user.school?.plan?.name || null,
            linkedEntities
        });
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to fetch user profile' });
    }
});
/**
 * @route   GET /api/users
 * @desc    [ADMIN] Get all users with optional role filter
 */
router.get('/', auth_1.requireAuth, (0, auth_1.requireRole)('SCHOOL_ADMIN', 'SUPER_ADMIN', 'CLINIC'), async (req, res) => {
    const { role } = req.query;
    const targetRole = role ? String(role).toUpperCase() : undefined;
    try {
        const school = await prisma_1.default.school.findUnique({ where: { id: req.user.schoolId } });
        // First fetch users strictly tied by schoolId, excluding global roles which are managed via junction tables
        let users = await prisma_1.default.user.findMany({
            where: {
                schoolId: req.user.schoolId,
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
                createdAt: true
            },
            orderBy: { name: 'asc' }
        });
        // 2. Fetch Global Roles (SUPPLIER/PARENT) via junction tables
        if (!targetRole || targetRole === 'SUPPLIER') {
            const linkedSuppliers = await prisma_1.default.schoolSupplier.findMany({
                where: { schoolId: req.user.schoolId, status: 'APPROVED' },
                include: { supplier: { include: { user: true } } }
            });
            const supplierUsers = linkedSuppliers.map(s => {
                if (!s.supplier.user)
                    return null;
                return {
                    ...s.supplier.user,
                    staffId: s.schoolSpecificId || s.supplier.globalId || s.supplier.user?.staffId
                };
            }).filter(Boolean);
            // Merge
            const userIds = new Set(users.map(u => u.id));
            supplierUsers.forEach(su => {
                if (su && su.id && !userIds.has(su.id))
                    users.push(su);
            });
        }
        if (!targetRole || targetRole === 'PARENT') {
            const linkedParents = await prisma_1.default.parentStudent.findMany({
                where: {
                    student: { schoolId: req.user.schoolId },
                    status: 'APPROVED'
                },
                include: { parent: { include: { user: true } } }
            });
            const parentUsers = linkedParents.map(p => {
                if (!p.parent.user)
                    return null;
                return {
                    ...p.parent.user,
                    staffId: p.parent.globalId || p.parent.user.staffId
                };
            }).filter(Boolean);
            // Merge and deduplicate (a parent might have multiple students in same school)
            const userIds = new Set(users.map(u => u.id));
            parentUsers.forEach(pu => {
                if (pu && pu.id && !userIds.has(pu.id))
                    users.push(pu);
            });
        }
        res.json({ users });
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to fetch users' });
    }
});
/**
 * @route   POST /api/users
 * @desc    [ADMIN] Create a new user account for any role with profile pic and HR details
 */
router.post('/', auth_1.requireAuth, upload_1.staffDocumentUpload.fields([
    { name: 'avatar', maxCount: 1 },
    { name: 'idDoc', maxCount: 1 },
    { name: 'residenceDoc', maxCount: 1 },
    { name: 'qualificationsDoc', maxCount: 1 },
    { name: 'transferCertificate', maxCount: 1 },
    { name: 'birthCertificate', maxCount: 1 }
]), async (req, res) => {
    const { email, password, name, role, phone, 
    // Teacher specific
    staffId, department, qualification, 
    // Student specific
    studentId, dob, gender, address, classId, 
    // Supplier specific
    companyName, contactName, taxClearance, prazCert, vendorNo, 
    // Global fields
    departmentId, 
    // HR / Payroll / Social Fields
    bloodGroup, dateAssumedPost, dateOfLeaving, designation, accountNumber, accountHolderName, bankName, bankBranch, branchCode, accountType, accountNumberZig, accountHolderNameZig, bankNameZig, bankBranchZig, branchCodeZig, accountTypeZig, facebookLink, linkedinLink, twitterLink, 
    // New Student Specific
    motherTongue, nationality, city, state, prevSchoolClass, prevSchoolAddress, hasTransferCertificate, isPhysicallyHandicapped, handicapDetails, category, section, dormitory, age, clubId, prevSchoolName, purposeForLeaving, dateAdmitted, studentHouseId, 
    // Onboarding additional fields
    programLevel, studyMode, researchTitle, standing, part, boardingStatus, guardianName, title } = req.body;
    const normalizedEmail = (email || '').trim().toLowerCase();
    // Process secondaryRoles
    let secondaryRoles = req.body.secondaryRoles;
    if (typeof secondaryRoles === 'string') {
        try {
            secondaryRoles = JSON.parse(secondaryRoles);
        }
        catch {
            secondaryRoles = secondaryRoles.split(',').filter(Boolean).map((s) => s.trim());
        }
    }
    if (!Array.isArray(secondaryRoles))
        secondaryRoles = [];
    if (secondaryRoles.length > 4) {
        return res.status(400).json({ error: 'Maximum 4 secondary roles allowed' });
    }
    // Handle files
    const files = req.files || {};
    const avatar = files['avatar'] ? `${req.uploadCategoryPath}/${files['avatar'][0].filename}` : null;
    const staffDocs = {
        idDoc: files['idDoc'] ? `${req.uploadCategoryPath}/${files['idDoc'][0].filename}` : null,
        residenceDoc: files['residenceDoc'] ? `${req.uploadCategoryPath}/${files['residenceDoc'][0].filename}` : null,
        qualificationsDoc: files['qualificationsDoc'] ? `${req.uploadCategoryPath}/${files['qualificationsDoc'][0].filename}` : null,
    };
    const studentDocs = {
        transferCertificateUrl: files['transferCertificate'] ? `${req.uploadCategoryPath}/${files['transferCertificate'][0].filename}` : null,
        birthCertificateUrl: files['birthCertificate'] ? `${req.uploadCategoryPath}/${files['birthCertificate'][0].filename}` : null,
    };
    // Consolidate all extra fields into metadata for "Show Everything" depth
    const metadata = {
        ...req.body,
        secondaryRoles, // Include for redundant access in JSON
        avatar,
        staffDocs,
        lastModifiedBy: req.user.id,
        updatedAt: new Date().toISOString()
    };
    const schoolId = req.user.schoolId;
    if (!schoolId && req.user.role !== 'SUPER_ADMIN') {
        return res.status(403).json({ error: 'Unauthorized to create users' });
    }
    try {
        const randomPassword = password || crypto_1.default.randomBytes(8).toString('hex');
        const hashedPassword = await bcryptjs_1.default.hash(randomPassword, 10);
        const finalRole = role.toUpperCase();
        // Role escalation guard: SCHOOL_ADMINs cannot assign privileged roles to users
        if (req.user.role === 'SCHOOL_ADMIN' && !SCHOOL_ADMIN_ASSIGNABLE_ROLES.includes(finalRole)) {
            return res.status(403).json({ error: `Unauthorized: Cannot assign role '${finalRole}'` });
        }
        // Use transaction for atomic ID generation and record creation
        const user = await prisma_1.default.$transaction(async (tx) => {
            // 1. Generate sequential ID inside transaction
            const generatedId = await (0, id_generator_1.generateSequentialId)(schoolId, finalRole, tx);
            // 2. Create the base User
            const newUser = await tx.user.create({
                data: {
                    email: normalizedEmail,
                    password: hashedPassword,
                    name,
                    role: finalRole,
                    secondaryRoles,
                    avatar,
                    phone,
                    staffId: staffId || studentId || vendorNo || generatedId,
                    schoolId,
                    departmentId: (role === 'TEACHER' && !departmentId) ? req.body.departmentId : departmentId, // Fallback for teacher specific logic if needed
                    metadata: metadata,
                    mustChangePassword: true,
                    ...(finalRole === 'TEACHER' && {
                        teacher: {
                            create: {
                                staffId: staffId || generatedId,
                                department,
                                qualification,
                                title: title || null,
                                schoolId: schoolId
                            }
                        }
                    }),
                    ...(finalRole === 'STUDENT' && {
                        student: {
                            create: {
                                studentId: studentId || generatedId,
                                name,
                                email: normalizedEmail,
                                phone,
                                dob: dob ? new Date(dob) : null,
                                gender,
                                address,
                                schoolId: schoolId,
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
                                staffDocuments: staffDocs,
                                schoolId: schoolId
                            }
                        }
                    })
                }
            });
            // 3. Nested student creation is already handled inside newUser.create above.
            // 4. Handle Supplier
            if (finalRole === 'SUPPLIER') {
                const globalId = await (0, id_generator_1.generateSequentialId)(null, 'SUPPLIER', tx);
                const schoolSpecificId = await (0, id_generator_1.generateSequentialId)(schoolId || null, 'SUPPLIER', tx);
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
                        schoolId: schoolId,
                        supplierId: supplier.id,
                        status: 'APPROVED',
                        schoolSpecificId
                    }
                });
            }
            // 5. Handle Parent
            if (finalRole === 'PARENT') {
                const globalId = await (0, id_generator_1.generateSequentialId)(null, 'PARENT', tx);
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
    }
    catch (error) {
        console.error('User creation error:', error);
        res.status(500).json({ error: 'Failed to create user account. Email might be in use or data is invalid.' });
    }
});
/**
 * @route   PUT /api/users/me
 * @desc    Update current user's profile
 */
router.put('/me', auth_1.requireAuth, rate_limit_1.uploadLimiter, upload_1.upload.single('avatar'), (0, validation_1.validate)(auth_schema_1.UpdateProfileSchema), async (req, res) => {
    const { name, email, phone, dob, gender, address, metadata, prevSchool, reasonForTransfer, lastGradeAchieved, admissionsNotes, parents, religion } = req.body;
    const avatar = req.file ? `${req.uploadCategoryPath}/${req.file.filename}` : req.body.avatar;
    try {
        // 1. Process Metadata
        let parsedMetadata = {};
        if (typeof metadata === 'string') {
            try {
                parsedMetadata = JSON.parse(metadata);
            }
            catch (e) { }
        }
        else if (typeof metadata === 'object') {
            parsedMetadata = metadata;
        }
        const existingUser = await prisma_1.default.user.findFirst({
            where: { id: req.user.id },
            include: { student: true, parent: true, teacher: true }
        });
        const updatedUser = await prisma_1.default.$transaction(async (tx) => {
            // 2. Update Student record if exists
            if (existingUser?.student) {
                await tx.student.update({
                    where: { id: existingUser.student.id },
                    data: {
                        dob: dob ? new Date(dob) : undefined,
                        gender,
                        address,
                        hexcoId: req.body.hexcoId,
                        prevSchool: prevSchool !== undefined ? prevSchool : undefined,
                        reasonForTransfer: reasonForTransfer !== undefined ? reasonForTransfer : undefined,
                        lastGradeAchieved: lastGradeAchieved !== undefined ? lastGradeAchieved : undefined,
                        admissionsNotes: admissionsNotes !== undefined ? admissionsNotes : undefined
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
            return await tx.user.update({
                where: { id: req.user.id },
                data: {
                    name,
                    email,
                    phone,
                    avatar: avatar || undefined,
                    religion: religion !== undefined ? religion : undefined,
                    metadata: {
                        ...(existingUser?.metadata || {}),
                        ...parsedMetadata,
                        ...(existingUser?.role !== 'STUDENT' ? {
                            dob: dob || undefined,
                            gender: gender || undefined,
                            address: address || undefined
                        } : {}),
                        avatar: avatar || undefined,
                        updatedAt: new Date().toISOString()
                    }
                },
                select: { id: true, name: true, email: true, role: true, phone: true, avatar: true, metadata: true, religion: true },
            });
        });
        res.json(updatedUser);
    }
    catch (err) {
        console.error('Profile update error:', err);
        res.status(500).json({ error: 'Failed to update profile' });
    }
});
/**
 * @route   PUT /api/users/:id
 * @desc    [ADMIN] Update any user's profile, roles, and metadata
 */
router.put('/:id', auth_1.requireAuth, (0, auth_1.requireRole)('SCHOOL_ADMIN'), upload_1.staffDocumentUpload.fields([
    { name: 'avatar', maxCount: 1 },
    { name: 'idDoc', maxCount: 1 },
    { name: 'residenceDoc', maxCount: 1 },
    { name: 'qualificationsDoc', maxCount: 1 },
    { name: 'transferCertificate', maxCount: 1 },
    { name: 'birthCertificate', maxCount: 1 }
]), async (req, res) => {
    const id = req.params.id;
    const { name, email, phone, role, status, departmentId, secondaryRoles, bloodGroup, dateAssumedPost, dateOfLeaving, designation, accountNumber, accountHolderName, bankName, bankBranch, branchCode, accountType, accountNumberZig, accountHolderNameZig, bankNameZig, bankBranchZig, branchCodeZig, accountTypeZig, facebookLink, linkedinLink, twitterLink } = req.body;
    let parsedSecondaryRoles = [];
    if (secondaryRoles) {
        if (typeof secondaryRoles === 'string') {
            try {
                parsedSecondaryRoles = JSON.parse(secondaryRoles);
            }
            catch {
                parsedSecondaryRoles = secondaryRoles.split(',').filter(Boolean).map((s) => s.trim());
            }
        }
        else if (Array.isArray(secondaryRoles)) {
            parsedSecondaryRoles = secondaryRoles;
        }
    }
    // Handle files
    const files = req.files || {};
    const avatar = files['avatar'] ? `${req.uploadCategoryPath}/${files['avatar'][0].filename}` : req.body.avatar;
    const newStaffDocs = {
        idDoc: files['idDoc'] ? `${req.uploadCategoryPath}/${files['idDoc'][0].filename}` : undefined,
        residenceDoc: files['residenceDoc'] ? `${req.uploadCategoryPath}/${files['residenceDoc'][0].filename}` : undefined,
        qualificationsDoc: files['qualificationsDoc'] ? `${req.uploadCategoryPath}/${files['qualificationsDoc'][0].filename}` : undefined,
    };
    const studentDocs = {
        transferCertificateUrl: files['transferCertificate'] ? `${req.uploadCategoryPath}/${files['transferCertificate'][0].filename}` : undefined,
        birthCertificateUrl: files['birthCertificate'] ? `${req.uploadCategoryPath}/${files['birthCertificate'][0].filename}` : undefined,
    };
    try {
        const existingUser = await prisma_1.default.user.findFirst({ where: { id } });
        if (!existingUser)
            return res.status(404).json({ error: 'User not found' });
        const updatedUser = await prisma_1.default.$transaction(async (tx) => {
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
                        hostelId: req.body.hostelId !== undefined ? (req.body.hostelId || null) : undefined
                    }
                }).catch((err) => {
                    console.error('Failed to sync student update:', err);
                });
            }
            // Build merged metadata
            const existingMetadata = existingUser.metadata || {};
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
                lastModifiedBy: req.user.id,
                updatedAt: new Date().toISOString()
            };
            // Role escalation guard on update: only allow safe role changes
            const newRole = role ? role.toUpperCase() : undefined;
            if (newRole && req.user.role === 'SCHOOL_ADMIN' && !SCHOOL_ADMIN_ASSIGNABLE_ROLES.includes(newRole)) {
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
                    metadata: newMetadata
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
            await prisma_1.default.teacher.update({
                where: { userId: id },
                data: {
                    department: req.body.department || undefined,
                    departmentId: req.body.departmentId || undefined,
                    qualification: req.body.qualification || undefined,
                    title: req.body.title || undefined
                }
            }).catch(() => { });
        }
        // Handle EmployeeProfile updates
        if (STAFF_ROLES.includes(updatedUser.role)) {
            const existingProfile = await prisma_1.default.employeeProfile.findUnique({ where: { userId: id } });
            const profileData = {
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
                    ...(existingProfile.staffDocuments || {}),
                    ...newStaffDocs
                };
                profileData.staffDocuments = mergedDocs;
                await prisma_1.default.employeeProfile.update({
                    where: { userId: id },
                    data: profileData
                });
            }
            else {
                await prisma_1.default.employeeProfile.create({
                    data: {
                        ...profileData,
                        userId: id,
                        schoolId: updatedUser.schoolId,
                        staffDocuments: newStaffDocs
                    }
                });
            }
        }
        // Sync supplier profile if user is a supplier
        if (updatedUser.role === 'SUPPLIER') {
            const metadataObj = (updatedUser.metadata || {});
            await prisma_1.default.supplier.update({
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
    }
    catch (error) {
        console.error('Update user error:', error);
        res.status(500).json({ error: 'Failed to update user' });
    }
});
// Helper to resolve User ID from User, Student, or Teacher ID
async function resolveUserId(id) {
    // Check if ID is directly a User ID
    const userExists = await prisma_1.default.user.findFirst({
        where: { id },
        select: { id: true }
    });
    if (userExists)
        return userExists.id;
    // Check if ID belongs to a Student profile
    const student = await prisma_1.default.student.findFirst({
        where: { id },
        select: { userId: true }
    });
    if (student?.userId)
        return student.userId;
    // Check if ID belongs to a Teacher profile
    const teacher = await prisma_1.default.teacher.findFirst({
        where: { id },
        select: { userId: true }
    });
    if (teacher?.userId)
        return teacher.userId;
    return null;
}
/**
 * @route   POST /api/users/:id/lock
 * @desc    [ADMIN] Lock a user account
 */
router.post('/:id/lock', auth_1.requireAuth, (0, auth_1.requireRole)('SCHOOL_ADMIN'), async (req, res) => {
    try {
        const resolvedId = await resolveUserId(req.params.id);
        if (!resolvedId) {
            return res.status(404).json({ error: 'User account not found' });
        }
        await prisma_1.default.user.update({
            where: { id: resolvedId },
            data: { isLocked: true }
        });
        res.json({ success: true, message: 'Account locked successfully' });
    }
    catch (error) {
        console.error('Lock account error:', error);
        res.status(500).json({ error: 'Failed to lock account' });
    }
});
/**
 * @route   POST /api/users/:id/unlock
 * @desc    [ADMIN] Unlock a user account
 */
router.post('/:id/unlock', auth_1.requireAuth, (0, auth_1.requireRole)('SCHOOL_ADMIN'), async (req, res) => {
    try {
        const resolvedId = await resolveUserId(req.params.id);
        if (!resolvedId) {
            return res.status(404).json({ error: 'User account not found' });
        }
        await prisma_1.default.user.update({
            where: { id: resolvedId },
            data: { isLocked: false }
        });
        res.json({ success: true, message: 'Account unlocked successfully' });
    }
    catch (error) {
        console.error('Unlock account error:', error);
        res.status(500).json({ error: 'Failed to unlock account' });
    }
});
/**
 * @route   DELETE /api/users/:id
 * @desc    [ADMIN] Delete a user account (cascades to linked profiles)
 */
router.delete('/:id', auth_1.requireAuth, (0, auth_1.requireRole)('SCHOOL_ADMIN', 'SUPER_ADMIN'), async (req, res) => {
    try {
        const resolvedId = await resolveUserId(req.params.id);
        if (!resolvedId) {
            return res.status(404).json({ error: 'User account not found' });
        }
        // Prevent self-deletion
        if (resolvedId === req.user.id) {
            return res.status(400).json({ error: 'Cannot delete your own account' });
        }
        await prisma_1.default.user.deleteMany({
            where: { id: resolvedId }
        });
        res.json({ success: true, message: 'User deleted successfully' });
    }
    catch (error) {
        console.error('Delete user error:', error);
        res.status(500).json({ error: 'Failed to delete user' });
    }
});
/**
 * @route   POST /api/users/:id/reset-password
 * @desc    [ADMIN] Reset user password to default "Password"
 */
router.post('/:id/reset-password', auth_1.requireAuth, (0, auth_1.requireRole)('SCHOOL_ADMIN'), async (req, res) => {
    try {
        const resolvedId = await resolveUserId(req.params.id);
        if (!resolvedId) {
            return res.status(404).json({ error: 'User account not found' });
        }
        const randomPassword = crypto_1.default.randomBytes(8).toString('hex');
        const hashedPassword = await bcryptjs_1.default.hash(randomPassword, 10);
        await prisma_1.default.user.update({
            where: { id: resolvedId },
            data: {
                password: hashedPassword,
                mustChangePassword: true,
                passwordLastChanged: new Date()
            }
        });
        res.json({ success: true, message: 'Password reset to system default successfully' });
    }
    catch (error) {
        console.error('Reset password error:', error);
        res.status(500).json({ error: 'Failed to reset password' });
    }
});
exports.default = router;
//# sourceMappingURL=users.js.map