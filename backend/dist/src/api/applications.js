"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const prisma_1 = __importDefault(require("../lib/prisma"));
const auth_1 = require("../middleware/auth");
const file_utils_1 = require("../lib/file-utils");
const academic_1 = require("../utils/academic");
const router = (0, express_1.Router)();
/**
 * @route   GET /api/applications
 * @desc    List all applications for current school (SCHOOL_ADMIN, BURSAR, TEACHER)
 */
router.get('/', auth_1.requireAuth, async (req, res) => {
    const userRole = req.user.role.toUpperCase();
    const secondaryRoles = req.user.secondaryRoles || [];
    const isAuthorized = userRole === 'SCHOOL_ADMIN' || userRole === 'BURSAR' || secondaryRoles.includes('Senior Teacher') || secondaryRoles.includes('Class Teacher');
    if (!isAuthorized)
        return res.status(403).json({ error: 'Access denied' });
    const { status, page = '1', limit = '20' } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    try {
        const where = {
            schoolId: req.user.schoolId,
            ...(status && status !== 'all' ? { status: status } : {}),
        };
        const [applications, total] = await Promise.all([
            prisma_1.default.application.findMany({
                where,
                include: { school: true },
                orderBy: { createdAt: 'desc' },
                skip,
                take: parseInt(limit),
            }),
            prisma_1.default.application.count({ where }),
        ]);
        // Enhance with eligibility if University
        const enhancedApplications = applications.map(app => {
            if (app.school?.type?.toLowerCase() === 'university' && app.academicData) {
                const data = app.academicData;
                const entryCategory = app.entryCategory || 'Normal';
                const dob = app.dob ? new Date(app.dob) : null;
                const age = dob ? new Date().getFullYear() - dob.getFullYear() : undefined;
                const eligibility = (0, academic_1.checkUniversityEligibility)({
                    entryCategory,
                    oLevels: (data.oLevels || []).map((o) => o.subject).filter(Boolean),
                    aLevels: (data.aLevels || []).map((a) => a.subject).filter(Boolean),
                    age
                });
                return { ...app, eligibility };
            }
            return app;
        });
        res.json({ applications: enhancedApplications, total, page: parseInt(page), totalPages: Math.ceil(total / parseInt(limit)) });
    }
    catch (error) {
        console.error('List applications error:', error);
        res.status(500).json({ error: 'Failed to fetch applications' });
    }
});
/**
 * @route   POST /api/applications
 * @desc    Submit a new application (public – no auth required)
 */
router.post('/', async (req, res) => {
    const { applicantName, email, phone, dob, gender, appType, schoolCode, prevSchool, reasonForTransfer, lastGradeAchieved, academicHistory, address, notes, entryCategory, academicData, programLevel, studyMode, researchTitle } = req.body;
    try {
        const school = await prisma_1.default.school.findUnique({ where: { code: schoolCode?.toUpperCase() } });
        if (!school)
            return res.status(404).json({ error: 'School not found. Check school code.' });
        const application = await prisma_1.default.$transaction(async (tx) => {
            const { generateSequentialId } = await Promise.resolve().then(() => __importStar(require('../lib/id-generator')));
            const applicationNumber = await generateSequentialId(school.id, 'APPLICATION', tx);
            return await tx.application.create({
                data: {
                    applicationNumber,
                    applicantName,
                    email,
                    phone,
                    dob: dob ? new Date(dob) : undefined,
                    gender,
                    appType: appType || 'Form 1',
                    schoolId: school.id,
                    status: 'pending',
                    prevSchool,
                    reasonForTransfer,
                    lastGradeAchieved,
                    academicHistory: academicHistory ? (typeof academicHistory === 'string' ? JSON.parse(academicHistory) : academicHistory) : undefined,
                    academicData: academicData ? (typeof academicData === 'string' ? JSON.parse(academicData) : academicData) : undefined,
                    entryCategory,
                    programLevel,
                    studyMode,
                    researchTitle,
                    address,
                    notes,
                    timeline: {
                        create: {
                            event: 'Application Submitted',
                            description: `Application received via online portal. Tracking ID: ${applicationNumber}`
                        }
                    }
                },
            });
        });
        res.status(201).json({
            success: true,
            applicationId: application.applicationNumber || application.id,
            message: 'Application submitted successfully.'
        });
    }
    catch (error) {
        console.error('Submission error:', error);
        res.status(500).json({ error: 'Failed to submit application' });
    }
});
/**
 * @route   GET /api/applications/:id
 * @desc    Get a single application
 */
router.get('/:id', auth_1.requireAuth, async (req, res) => {
    const userRole = req.user.role.toUpperCase();
    const secondaryRoles = req.user.secondaryRoles || [];
    const isAuthorized = userRole === 'SCHOOL_ADMIN' || userRole === 'BURSAR' || secondaryRoles.includes('Senior Teacher') || secondaryRoles.includes('Class Teacher');
    if (!isAuthorized)
        return res.status(403).json({ error: 'Access denied' });
    const { id } = req.params;
    try {
        const application = await prisma_1.default.application.findFirst({
            where: { id: String(id), schoolId: req.user.schoolId },
            include: {
                timeline: { orderBy: { occurredAt: 'desc' } },
                documents: true,
                school: true
            }
        });
        if (!application)
            return res.status(404).json({ error: 'Application not found' });
        // Enhance with eligibility if University
        let eligibility = null;
        if (application.school?.type?.toLowerCase() === 'university' && application.academicData) {
            const data = application.academicData;
            const entryCategory = application.entryCategory || 'Normal';
            const dob = application.dob ? new Date(application.dob) : null;
            const age = dob ? new Date().getFullYear() - dob.getFullYear() : undefined;
            eligibility = (0, academic_1.checkUniversityEligibility)({
                entryCategory,
                oLevels: (data.oLevels || []).map((o) => o.subject).filter(Boolean),
                aLevels: (data.aLevels || []).map((a) => a.subject).filter(Boolean),
                age
            });
        }
        res.json({ ...application, eligibility });
    }
    catch (error) {
        console.error('Fetch application error:', error);
        res.status(500).json({ error: 'Failed to fetch application' });
    }
});
/**
 * @route   PATCH /api/applications/:id
 * @desc    Update application status & Enroll (Admin/Authorized Teachers)
 */
router.patch('/:id', auth_1.requireAuth, async (req, res) => {
    const { id } = req.params;
    const { status, notes, classId, interviewDate, interviewTime, interviewVenue } = req.body;
    const userRole = req.user.role.toUpperCase();
    const secondaryRoles = req.user.secondaryRoles || [];
    const isAuthorized = userRole === 'SCHOOL_ADMIN' || secondaryRoles.includes('Senior Teacher') || secondaryRoles.includes('Class Teacher');
    if (!isAuthorized)
        return res.status(403).json({ error: 'Access denied' });
    try {
        const application = await prisma_1.default.application.findFirst({
            where: { id: String(id) },
            include: { school: true }
        });
        if (!application || application.schoolId !== req.user.schoolId) {
            return res.status(404).json({ error: 'Application not found' });
        }
        const result = await prisma_1.default.$transaction(async (tx) => {
            // 1. Update Application status
            const updatedApp = await tx.application.update({
                where: { id: application.id },
                data: {
                    status,
                    notes,
                    assignedClassId: classId || undefined,
                    interviewDate: interviewDate ? new Date(interviewDate) : undefined,
                    interviewTime,
                    interviewVenue,
                    timeline: {
                        create: {
                            event: `Status updated: ${status}`,
                            description: notes || `Application marked as ${status}`
                        }
                    }
                }
            });
            // 2. Handle Enrollment Transition
            if (status === 'accepted') {
                if (!classId)
                    throw new Error('Class assignment is required for approval');
                // Find existing user (created during registration) or create new one
                let user = await tx.user.findFirst({
                    where: { email: application.email }
                });
                if (!user) {
                    // Create a guest user account if it doesn't exist
                    const hashedPassword = await Promise.resolve().then(() => __importStar(require('bcryptjs'))).then(m => m.hash('Password', 10));
                    const { generateSequentialId } = await Promise.resolve().then(() => __importStar(require('../lib/id-generator')));
                    const staffId = await generateSequentialId(application.schoolId, 'STUDENT', tx);
                    user = await tx.user.create({
                        data: {
                            email: application.email,
                            password: hashedPassword,
                            name: application.applicantName,
                            role: 'STUDENT',
                            phone: application.phone,
                            schoolId: application.schoolId,
                            mustChangePassword: true,
                            staffId
                        }
                    });
                }
                else {
                    // Promote existing guest/applicant user to STUDENT role
                    await tx.user.update({
                        where: { id: user.id },
                        data: { role: 'STUDENT' }
                    });
                }
                // Check if student record exists, create if not
                const existingStudent = await tx.student.findFirst({
                    where: { email: application.email, schoolId: application.schoolId }
                });
                if (!existingStudent) {
                    const { generateSequentialId } = await Promise.resolve().then(() => __importStar(require('../lib/id-generator')));
                    const { renameEntityDir } = await Promise.resolve().then(() => __importStar(require('../lib/file-utils')));
                    const studentId = await generateSequentialId(application.schoolId, 'STUDENT', tx);
                    // Calculate maxCompletionDate based on level and mode
                    const startDate = new Date();
                    let maxDate = new Date(startDate);
                    const level = application.programLevel || 'UNDERGRADUATE';
                    const isFullTime = application.studyMode !== 'PART_TIME';
                    const multiplier = isFullTime ? 1 : 1.5;
                    if (level === 'PG_DIPLOMA')
                        maxDate.setFullYear(maxDate.getFullYear() + Math.ceil(1 * multiplier));
                    else if (level === 'MASTERS_TAUGHT' || level === 'MASTERS_RESEARCH')
                        maxDate.setFullYear(maxDate.getFullYear() + Math.ceil(2 * multiplier));
                    else if (level === 'MPHIL')
                        maxDate.setFullYear(maxDate.getFullYear() + Math.ceil(3 * multiplier));
                    else if (level === 'PHD')
                        maxDate.setFullYear(maxDate.getFullYear() + Math.ceil(5 * multiplier));
                    else
                        maxDate.setFullYear(maxDate.getFullYear() + 6); // Max duration for UG (NUST Regs usually 6 years)
                    // 1. Rename the physical folder from Application No to Student ID
                    const school = await tx.school.findUnique({ where: { id: application.schoolId } });
                    const oldStaffId = user.staffId;
                    if (oldStaffId && school) {
                        renameEntityDir(school.code, 'students', oldStaffId, studentId);
                    }
                    // 2. Update User staffId to the new Student ID
                    await tx.user.update({
                        where: { id: user.id },
                        data: { staffId: studentId, role: 'STUDENT' }
                    });
                    // 3. Create Student Record
                    await tx.student.create({
                        data: {
                            studentId,
                            name: application.applicantName,
                            email: application.email,
                            phone: application.phone,
                            dob: application.dob,
                            gender: application.gender,
                            address: application.address || '',
                            classId: classId,
                            status: 'Enrolled',
                            userId: user.id,
                            schoolId: application.schoolId,
                            prevSchool: application.prevSchool,
                            reasonForTransfer: application.reasonForTransfer,
                            lastGradeAchieved: application.lastGradeAchieved,
                            admissionsNotes: application.notes,
                            academicHistory: application.academicHistory,
                            programLevel: application.programLevel,
                            studyMode: application.studyMode,
                            researchTitle: application.researchTitle,
                            startDate: startDate,
                            maxCompletionDate: maxDate,
                            enrollmentDate: new Date()
                        }
                    });
                    // 4. Update all Document URLs in DB to the new folder path
                    if (oldStaffId) {
                        const docs = await tx.applicantDocument.findMany({ where: { applicationId: application.id } });
                        for (const doc of docs) {
                            await tx.applicantDocument.update({
                                where: { id: doc.id },
                                data: { url: doc.url.replace(`${oldStaffId}/docs`, `${studentId}/docs`) }
                            });
                        }
                    }
                    await tx.applicantTimeline.create({
                        data: {
                            applicationId: application.id,
                            event: 'Enrollment Finalized',
                            description: `Student account activated with ID: ${studentId}`
                        }
                    });
                }
            }
            return updatedApp;
        });
        res.json(result);
    }
    catch (error) {
        console.error('Application update error:', error);
        res.status(500).json({ error: error.message || 'Failed to update application' });
    }
});
/**
 * @route   POST /api/applications/documents
 * @desc    Upload a document for an application (Applicant only)
 */
router.post('/documents', auth_1.requireAuth, async (req, res) => {
    const { name, url } = req.body; // url is base64
    try {
        const application = await prisma_1.default.application.findFirst({
            where: { email: req.user.email },
            include: { school: true }
        });
        if (!application)
            return res.status(404).json({ error: 'Application not found' });
        const humanId = req.user?.staffId || application.applicationNumber || application.id;
        const filename = (0, file_utils_1.saveBase64Image)(url, 'doc', 'docs', application.school?.code || 'global', 'students', humanId);
        if (!filename)
            return res.status(400).json({ error: 'Upload failed' });
        const doc = await prisma_1.default.applicantDocument.create({
            data: { applicationId: application.id, name, url: filename, status: 'pending' }
        });
        await prisma_1.default.applicantTimeline.create({
            data: {
                applicationId: application.id,
                event: 'Document Uploaded',
                description: `New document submitted: ${name}`
            }
        });
        res.json(doc);
    }
    catch (err) {
        res.status(500).json({ error: 'Failed to upload document' });
    }
});
/**
 * @route   PATCH /api/applications/documents/:id
 * @desc    Verify or Reject a document (Admin/Authorized Teachers)
 */
router.patch('/documents/:id', auth_1.requireAuth, async (req, res) => {
    const { id } = req.params;
    const { status } = req.body; // verified, rejected, pending
    const userRole = req.user.role.toUpperCase();
    const secondaryRoles = req.user.secondaryRoles || [];
    const isAuthorized = userRole === 'SCHOOL_ADMIN' || secondaryRoles.includes('Senior Teacher');
    if (!isAuthorized)
        return res.status(403).json({ error: 'Access denied' });
    try {
        const document = await prisma_1.default.applicantDocument.update({
            where: { id: String(id) },
            data: { status: String(status) },
            include: { application: true }
        });
        await prisma_1.default.applicantTimeline.create({
            data: {
                applicationId: document.applicationId,
                event: `Document ${status.toUpperCase()}`,
                description: `Documentation: ${document.name} has been ${status}.`
            }
        });
        res.json(document);
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to update document status' });
    }
});
exports.default = router;
//# sourceMappingURL=applications.js.map