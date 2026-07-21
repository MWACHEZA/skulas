"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const prisma_1 = __importDefault(require("../lib/prisma"));
const auth_1 = require("../middleware/auth");
const id_generator_1 = require("../lib/id-generator");
const upload_1 = require("../middleware/upload");
const validation_1 = require("../middleware/validation");
const school_schema_1 = require("../schemas/school.schema");
const audit_1 = require("../utils/audit");
const router = (0, express_1.Router)();
/**
 * @route   GET /api/schools/settings
 * @desc    [SCHOOL_ADMIN] Get institutional settings
 */
router.get('/settings', auth_1.requireAuth, async (req, res) => {
    try {
        const schoolId = req.user.schoolId;
        let settings = await prisma_1.default.schoolSetting.findFirst({
            where: { schoolId }
        });
        // Fallback if not created yet
        if (!settings) {
            settings = await prisma_1.default.schoolSetting.create({
                data: { schoolId }
            });
        }
        // Sanitize credentials for non-admins to prevent credential leakage
        if (req.user.role !== 'SCHOOL_ADMIN') {
            const sanitized = { ...settings };
            delete sanitized.smtpPassword;
            delete sanitized.whatsAppApiKey;
            return res.json(sanitized);
        }
        res.json(settings);
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to fetch settings' });
    }
});
/**
 * @route   PATCH /api/schools/settings
 * @desc    [SCHOOL_ADMIN] Update institutional settings
 */
router.patch('/settings', auth_1.requireAuth, (0, auth_1.requireRole)('SCHOOL_ADMIN'), (0, validation_1.validate)(school_schema_1.SystemSettingsSchema), async (req, res) => {
    try {
        const schoolId = req.user.schoolId;
        const settingsData = req.body;
        const allowedKeys = [
            'favicon', 'idleTime', 'idleTimeCountdown', 'baseCurrency', 'baseCurrencySymbol',
            'altCurrency', 'altCurrencySymbol', 'mandatoryReceipts', 'showBalanceOnReceipts',
            'showUniformsModule', 'smtpEmail', 'smtpHost', 'smtpPort', 'smtpPassword',
            'smtpSsl', 'systemUrl', 'whatsappApiUrl', 'whatsappAccessToken', 'countryPhoneCode',
            'systemName', 'systemTitle', 'shortSystemName', 'systemEmail', 'phone',
            'address', 'paypalEmail', 'systemCurrency', 'runningSession', 'weekends',
            'currentTerm', 'nextTermBegin', 'language', 'timezone', 'tawktoPropertyId',
            'theme', 'textAlignment', 'themeColour', 'enableParentMarketplace',
            'deletePaymentHistoryWithPartial', 'footer', 'country', 'state', 'city',
            'facebook', 'twitter', 'youtube', 'instagram', 'linkedin', 'tiktok',
            'reportCardTemplate', 'allowTeacherEnterScores', 'scoreClosingDate',
            'allowStudentCheckResult', 'allowParentPrintReport', 'reportCommentSignature',
            'showSubjectPosition', 'gateMinPaidAmount', 'gateMinPaidPercent', 'gateRequiredType',
            'idCardTemplateFront', 'idCardTemplateBack'
        ];
        const filteredData = {};
        for (const key of allowedKeys) {
            if (settingsData[key] !== undefined) {
                filteredData[key] = settingsData[key];
            }
        }
        // Safely parse numbers
        if (filteredData.idleTime !== undefined) {
            filteredData.idleTime = parseInt(filteredData.idleTime) || 0;
        }
        if (filteredData.idleTimeCountdown !== undefined) {
            filteredData.idleTimeCountdown = parseInt(filteredData.idleTimeCountdown) || 0;
        }
        if (filteredData.smtpPort !== undefined) {
            filteredData.smtpPort = parseInt(filteredData.smtpPort) || 465;
        }
        if (filteredData.gateMinPaidAmount !== undefined) {
            filteredData.gateMinPaidAmount = parseFloat(filteredData.gateMinPaidAmount) || 0;
        }
        if (filteredData.gateMinPaidPercent !== undefined) {
            filteredData.gateMinPaidPercent = parseFloat(filteredData.gateMinPaidPercent) || 0;
        }
        // Safely parse booleans
        const booleanFields = [
            'mandatoryReceipts', 'showBalanceOnReceipts', 'showUniformsModule',
            'smtpSsl', 'enableParentMarketplace', 'deletePaymentHistoryWithPartial',
            'allowTeacherEnterScores', 'allowStudentCheckResult', 'allowParentPrintReport',
            'showSubjectPosition'
        ];
        for (const key of booleanFields) {
            if (filteredData[key] !== undefined) {
                filteredData[key] = filteredData[key] === true || filteredData[key] === 'true' || filteredData[key] === 'Yes';
            }
        }
        // Safely parse date fields
        if (filteredData.nextTermBegin) {
            filteredData.nextTermBegin = new Date(filteredData.nextTermBegin).toISOString();
        }
        else if (filteredData.nextTermBegin === '') {
            filteredData.nextTermBegin = null;
        }
        if (filteredData.scoreClosingDate) {
            filteredData.scoreClosingDate = new Date(filteredData.scoreClosingDate).toISOString();
        }
        else if (filteredData.scoreClosingDate === '') {
            filteredData.scoreClosingDate = null;
        }
        const settings = await prisma_1.default.schoolSetting.upsert({
            where: { schoolId },
            update: filteredData,
            create: { ...filteredData, schoolId }
        });
        // Log the change for audit
        await prisma_1.default.auditLog.create({
            data: {
                actorId: req.user.id,
                schoolId: schoolId,
                action: 'UPDATE_SYSTEM_SETTINGS',
                entityType: 'SchoolSetting',
                entityId: settings.id,
                details: {
                    changedFields: Object.keys(filteredData),
                    timestamp: new Date().toISOString()
                }
            }
        });
        res.json({ success: true, settings });
    }
    catch (error) {
        console.error('Settings update error:', error);
        res.status(500).json({ error: 'Failed to update system settings' });
    }
});
/**
 * @route   GET /api/schools/me
 * @desc    [SCHOOL_ADMIN] Get own school details with plan
 */
router.get('/me', auth_1.requireAuth, (0, auth_1.requireRole)('SCHOOL_ADMIN'), async (req, res) => {
    try {
        const school = await prisma_1.default.school.findUnique({
            where: { id: req.user.schoolId },
            include: { plan: true }
        });
        if (!school)
            return res.status(404).json({ error: 'School not found' });
        res.json(school);
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to fetch school data' });
    }
});
/**
 * @route   PATCH /api/schools/me/plan
 * @desc    [SCHOOL_ADMIN] Change own school's subscription plan
 */
router.patch('/me/plan', auth_1.requireAuth, (0, auth_1.requireRole)('SCHOOL_ADMIN'), (0, validation_1.validate)(school_schema_1.UpdatePlanSchema), async (req, res) => {
    try {
        const { planName } = req.body;
        if (!planName)
            return res.status(400).json({ error: 'Plan name is required' });
        // SECURITY FIX: Prevent arbitrary free upgrades by school admins.
        // This endpoint is blocked until a proper SaaS billing gateway (e.g. Stripe) is integrated.
        return res.status(501).json({
            error: 'SaaS Subscription Gateway is not configured. Please contact support (Super Admin) to upgrade your plan.'
        });
    }
    catch (err) {
        console.error('Failed to update subscription plan', err);
        res.status(500).json({ error: 'Failed to update subscription plan' });
    }
});
/**
 * @route   PATCH /api/schools/branding
 * @desc    [SCHOOL_ADMIN] Update own school branding (logo, colors, motto)
 */
router.patch('/branding', auth_1.requireAuth, (0, auth_1.requireRole)('SCHOOL_ADMIN'), upload_1.upload.single('logo'), (0, validation_1.validate)(school_schema_1.UpdateBrandingSchema), async (req, res) => {
    try {
        const { primaryColor, accentColor, motto } = req.body;
        const logoFilename = req.file ? req.file.filename : undefined;
        const existing = await prisma_1.default.school.findUnique({ where: { id: req.user.schoolId } });
        if (!existing)
            return res.status(404).json({ error: 'School not found' });
        const currentBranding = existing.branding || {};
        const updatedBranding = {
            ...currentBranding,
            primaryColor: primaryColor || currentBranding.primaryColor,
            accentColor: accentColor || currentBranding.accentColor,
            motto: motto !== undefined ? motto : currentBranding.motto,
            logo: logoFilename || currentBranding.logo,
        };
        const school = await prisma_1.default.school.update({
            where: { id: req.user.schoolId },
            data: { branding: updatedBranding }
        });
        res.json({ success: true, branding: school.branding });
    }
    catch (error) {
        console.error('Branding update error:', error);
        res.status(500).json({ error: 'Failed to update branding' });
    }
});
/**
 * @route   PATCH /api/schools/info
 * @desc    [SCHOOL_ADMIN] Update own school contact info and social links
 */
router.patch('/info', auth_1.requireAuth, (0, auth_1.requireRole)('SCHOOL_ADMIN'), (0, validation_1.validate)(school_schema_1.UpdateSchoolInfoSchema), async (req, res) => {
    try {
        const { address, phone, email, website, twitter, facebook, linkedin, instagram, youtube, tiktok } = req.body;
        const existing = await prisma_1.default.school.findUnique({ where: { id: req.user.schoolId } });
        if (!existing)
            return res.status(404).json({ error: 'School not found' });
        const currentBranding = existing.branding || {};
        // Keep branding backward-compat (twitter, facebook, linkedin for legacy reads)
        const updatedBranding = { ...currentBranding, twitter, facebook, linkedin };
        // Update the School record (address, phone, email, website)
        const school = await prisma_1.default.school.update({
            where: { id: req.user.schoolId },
            data: {
                address: address ?? existing.address,
                phone: phone ?? existing.phone,
                email: email ?? existing.email,
                website: website ?? existing.website,
                hexcoCenterNumber: req.body.hexcoCenterNumber || existing.hexcoCenterNumber,
                branding: updatedBranding,
            }
        });
        // Also write contact info + all social URLs to SchoolSetting for public page reads
        await prisma_1.default.schoolSetting.upsert({
            where: { schoolId: req.user.schoolId },
            update: {
                ...(phone !== undefined && { phone }),
                ...(address !== undefined && { address }),
                ...(email !== undefined && { systemEmail: email }),
                ...(facebook !== undefined && { facebook }),
                ...(twitter !== undefined && { twitter }),
                ...(instagram !== undefined && { instagram }),
                ...(youtube !== undefined && { youtube }),
                ...(linkedin !== undefined && { linkedin }),
                ...(tiktok !== undefined && { tiktok }),
            },
            create: {
                schoolId: req.user.schoolId,
                phone: phone || '',
                address: address || '',
                systemEmail: email || '',
                facebook: facebook || '',
                twitter: twitter || '',
                instagram: instagram || '',
                youtube: youtube || '',
                linkedin: linkedin || '',
                tiktok: tiktok || '',
            }
        });
        res.json({ success: true, school });
    }
    catch (error) {
        console.error('Info update error:', error);
        res.status(500).json({ error: 'Failed to update school info' });
    }
});
/**
 * @route   GET /api/schools
 * @desc    Fetch list of all active schools for public linking/browsing
 */
router.get('/', async (req, res) => {
    try {
        const schools = await prisma_1.default.school.findMany({
            where: {
                status: { in: ['active', 'trial'] }
            },
            select: {
                code: true,
                name: true,
                type: true
            },
            orderBy: { name: 'asc' }
        });
        res.json(schools);
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to fetch schools' });
    }
});
/**
 * @route   PATCH /api/schools/id-template
 * @desc    [SCHOOL_ADMIN] Update own school ID card template (front, legacy single)
 */
router.patch('/id-template', auth_1.requireAuth, (0, auth_1.requireRole)('SCHOOL_ADMIN', 'BURSAR'), upload_1.brandingUpload.single('template'), async (req, res) => {
    try {
        const templatePath = req.uploadCategoryPath && req.file
            ? `${req.uploadCategoryPath}/${req.file.filename}`
            : undefined;
        if (!templatePath)
            return res.status(400).json({ error: 'No template file uploaded' });
        const school = await prisma_1.default.school.update({
            where: { id: req.user.schoolId },
            data: { idCardTemplate: templatePath }
        });
        res.json({ success: true, idCardTemplate: school.idCardTemplate });
    }
    catch (error) {
        console.error('ID Template update error:', error);
        res.status(500).json({ error: 'Failed to update ID card template' });
    }
});
/**
 * @route   PATCH /api/schools/id-template/front
 * @desc    [SCHOOL_ADMIN] Upload front-face of the student ID card template
 */
router.patch('/id-template/front', auth_1.requireAuth, (0, auth_1.requireRole)('SCHOOL_ADMIN', 'BURSAR'), upload_1.brandingUpload.single('template'), async (req, res) => {
    try {
        const templatePath = req.uploadCategoryPath && req.file
            ? `${req.uploadCategoryPath}/${req.file.filename}`
            : undefined;
        if (!templatePath)
            return res.status(400).json({ error: 'No front template file uploaded' });
        // Store front template in the idCardTemplate field (legacy) + settings JSON
        const school = await prisma_1.default.school.update({
            where: { id: req.user.schoolId },
            data: { idCardTemplate: templatePath }
        });
        // Also persist to school settings as JSON for front/back distinction
        await prisma_1.default.schoolSetting.upsert({
            where: { schoolId: req.user.schoolId },
            update: { idCardTemplateFront: templatePath },
            create: { schoolId: req.user.schoolId, idCardTemplateFront: templatePath }
        });
        res.json({ success: true, idCardTemplateFront: templatePath, idCardTemplate: school.idCardTemplate });
    }
    catch (error) {
        console.error('ID Template (front) update error:', error);
        res.status(500).json({ error: 'Failed to update front ID card template' });
    }
});
/**
 * @route   PATCH /api/schools/id-template/back
 * @desc    [SCHOOL_ADMIN] Upload back-face of the student ID card template
 */
router.patch('/id-template/back', auth_1.requireAuth, (0, auth_1.requireRole)('SCHOOL_ADMIN', 'BURSAR'), upload_1.brandingUpload.single('template'), async (req, res) => {
    try {
        const templatePath = req.uploadCategoryPath && req.file
            ? `${req.uploadCategoryPath}/${req.file.filename}`
            : undefined;
        if (!templatePath)
            return res.status(400).json({ error: 'No back template file uploaded' });
        await prisma_1.default.schoolSetting.upsert({
            where: { schoolId: req.user.schoolId },
            update: { idCardTemplateBack: templatePath },
            create: { schoolId: req.user.schoolId, idCardTemplateBack: templatePath }
        });
        res.json({ success: true, idCardTemplateBack: templatePath });
    }
    catch (error) {
        console.error('ID Template (back) update error:', error);
        res.status(500).json({ error: 'Failed to update back ID card template' });
    }
});
/**
 * @route   GET /api/schools/id-card/students
 * @desc    [SCHOOL_ADMIN/BURSAR] Get students list for ID card preview selection
 */
router.get('/id-card/students', auth_1.requireAuth, (0, auth_1.requireRole)('SCHOOL_ADMIN', 'BURSAR'), async (req, res) => {
    try {
        const { classId } = req.query;
        const students = await prisma_1.default.student.findMany({
            where: {
                schoolId: req.user.schoolId,
                ...(classId && classId !== 'all' ? { classId: classId } : {})
            },
            select: {
                id: true,
                name: true,
                studentId: true,
                gender: true,
                classId: true,
                class: { select: { name: true, level: true } },
                user: { select: { avatar: true } }
            },
            orderBy: { name: 'asc' },
            take: 200
        });
        const formattedStudents = students.map(s => ({
            ...s,
            photo: s.user?.avatar || null
        }));
        res.json(formattedStudents);
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to fetch students for ID card generation' });
    }
});
/**
 * @route   GET /api/schools/id-card/data/:studentId
 * @desc    [SCHOOL_ADMIN/BURSAR] Get full data needed to render a student ID card
 */
router.get('/id-card/data/:studentId', auth_1.requireAuth, (0, auth_1.requireRole)('SCHOOL_ADMIN', 'BURSAR'), async (req, res) => {
    try {
        const schoolId = req.user.schoolId;
        const [school, settings, student] = await Promise.all([
            prisma_1.default.school.findUnique({
                where: { id: schoolId },
                select: {
                    name: true,
                    address: true,
                    phone: true,
                    email: true,
                    website: true,
                    branding: true,
                    customContent: true,
                    idCardTemplate: true
                }
            }),
            prisma_1.default.schoolSetting.findFirst({ where: { schoolId } }),
            prisma_1.default.student.findFirst({
                where: { id: req.params.studentId, schoolId },
                select: {
                    id: true,
                    name: true,
                    studentId: true,
                    gender: true,
                    dob: true,
                    classId: true,
                }
            })
        ]);
        if (!student)
            return res.status(404).json({ error: 'Student not found' });
        if (!school)
            return res.status(404).json({ error: 'School not found' });
        // Fetch class and user separately
        const cls = student.classId ? await prisma_1.default.schoolClass.findFirst({ where: { id: student.classId }, select: { name: true, level: true } }) : null;
        const userRecord = await prisma_1.default.user.findFirst({ where: { staffId: student.studentId, schoolId }, select: { avatar: true } });
        const branding = school.branding || {};
        const customContent = school.customContent || {};
        res.json({
            school: {
                name: school.name,
                address: school.address,
                phone: school.phone,
                email: school.email,
                website: school.website,
                logo: branding.logo || null,
                motto: customContent.motto || '',
                primaryColor: branding.primaryColor || '#1e40af',
                accentColor: branding.accentColor || '#dbeafe',
            },
            templates: {
                front: settings?.idCardTemplateFront || school.idCardTemplate || null,
                back: settings?.idCardTemplateBack || null,
            },
            student: {
                id: student.id,
                name: student.name,
                studentId: student.studentId,
                gender: student.gender,
                dob: student.dob,
                class: cls?.name || '—',
                classLevel: cls?.level || '',
                photo: userRecord?.avatar || null,
            }
        });
    }
    catch (error) {
        console.error('ID card data error:', error);
        res.status(500).json({ error: 'Failed to fetch ID card data' });
    }
});
/**
 * @route   PATCH /api/schools/favicon
 * @desc    [SCHOOL_ADMIN] Update school favicon
 */
router.patch('/favicon', auth_1.requireAuth, (0, auth_1.requireRole)('SCHOOL_ADMIN'), upload_1.brandingUpload.single('favicon'), async (req, res) => {
    try {
        const faviconPath = req.uploadCategoryPath && req.file
            ? `${req.uploadCategoryPath}/${req.file.filename}`
            : undefined;
        if (!faviconPath)
            return res.status(400).json({ error: 'No favicon file uploaded' });
        const settings = await prisma_1.default.schoolSetting.upsert({
            where: { schoolId: req.user.schoolId },
            update: { favicon: faviconPath },
            create: { schoolId: req.user.schoolId, favicon: faviconPath }
        });
        res.json({ success: true, favicon: settings.favicon });
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to update favicon' });
    }
});
// ── STUDENT HOUSES ──
router.get('/houses', auth_1.requireAuth, async (req, res) => {
    try {
        const houses = await prisma_1.default.studentHouse.findMany({
            where: { schoolId: req.user.schoolId },
            include: {
                houseMaster: {
                    select: {
                        id: true,
                        title: true,
                        user: { select: { name: true } }
                    }
                },
                houseCaptain: {
                    select: {
                        id: true,
                        name: true,
                        studentId: true
                    }
                }
            },
            orderBy: { name: 'asc' }
        });
        res.json(houses);
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to fetch houses' });
    }
});
router.post('/houses', auth_1.requireAuth, (0, auth_1.requireRole)('SCHOOL_ADMIN'), upload_1.brandingUpload.single('logo'), (0, validation_1.validate)(school_schema_1.HouseSchema), async (req, res) => {
    try {
        const { name, description, houseMasterId, houseCaptainId, color, motto } = req.body;
        const logoFilename = req.file ? req.file.filename : undefined;
        const house = await prisma_1.default.studentHouse.create({
            data: {
                name,
                description,
                logo: logoFilename || null,
                color: color || null,
                motto: motto || null,
                houseMasterId: (houseMasterId && houseMasterId !== 'none' && houseMasterId !== '') ? houseMasterId : null,
                houseCaptainId: (houseCaptainId && houseCaptainId !== 'none' && houseCaptainId !== '') ? houseCaptainId : null,
                schoolId: req.user.schoolId
            },
            include: {
                houseMaster: {
                    select: {
                        id: true,
                        title: true,
                        user: { select: { name: true } }
                    }
                },
                houseCaptain: {
                    select: {
                        id: true,
                        name: true,
                        studentId: true
                    }
                }
            }
        });
        res.json(house);
    }
    catch (error) {
        console.error('Create house error:', error);
        res.status(500).json({ error: 'Failed to create house' });
    }
});
router.patch('/houses/:id', auth_1.requireAuth, (0, auth_1.requireRole)('SCHOOL_ADMIN'), upload_1.brandingUpload.single('logo'), (0, validation_1.validate)(school_schema_1.HouseSchema), async (req, res) => {
    try {
        const { id } = req.params;
        const { name, description, houseMasterId, houseCaptainId, color, motto } = req.body;
        const logoFilename = req.file ? req.file.filename : undefined;
        const updateData = {
            name,
            description,
            color: color !== undefined ? (color || null) : undefined,
            motto: motto !== undefined ? (motto || null) : undefined,
            houseMasterId: (houseMasterId && houseMasterId !== 'none' && houseMasterId !== '') ? houseMasterId : null,
            houseCaptainId: (houseCaptainId && houseCaptainId !== 'none' && houseCaptainId !== '') ? houseCaptainId : null,
        };
        if (logoFilename) {
            updateData.logo = logoFilename;
        }
        const house = await prisma_1.default.studentHouse.update({
            where: { id: id, schoolId: req.user.schoolId },
            data: updateData,
            include: {
                houseMaster: {
                    select: {
                        id: true,
                        title: true,
                        user: { select: { name: true } }
                    }
                },
                houseCaptain: {
                    select: {
                        id: true,
                        name: true,
                        studentId: true
                    }
                }
            }
        });
        res.json(house);
    }
    catch (error) {
        console.error('Update house error:', error);
        res.status(500).json({ error: 'Failed to update house' });
    }
});
router.delete('/houses/:id', auth_1.requireAuth, (0, auth_1.requireRole)('SCHOOL_ADMIN'), async (req, res) => {
    try {
        await prisma_1.default.studentHouse.delete({ where: { id: req.params.id } });
        res.json({ success: true });
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to delete house' });
    }
});
// Assign student to house (Admins, Sports Master, Sports Captain)
router.post('/houses/assign-student', auth_1.requireAuth, (0, validation_1.validate)(school_schema_1.AssignHouseStudentSchema), async (req, res) => {
    try {
        const { studentId, houseId } = req.body;
        const isAuthorized = req.user.role === 'SCHOOL_ADMIN' ||
            req.user.secondaryRoles.includes('Sports Master') ||
            req.user.secondaryRoles.includes('Sports Captain');
        if (!isAuthorized) {
            return res.status(403).json({ error: 'Unauthorized to assign students to houses' });
        }
        if (!studentId) {
            return res.status(400).json({ error: 'Student ID is required' });
        }
        const updatedStudent = await prisma_1.default.student.update({
            where: { id: studentId },
            data: {
                houseId: houseId ? houseId : null
            }
        });
        res.json({ success: true, student: updatedStudent });
    }
    catch (error) {
        console.error('Assign student to house error:', error);
        res.status(500).json({ error: 'Failed to assign student to house' });
    }
});
// Get members of a specific house
router.get('/houses/:id/members', auth_1.requireAuth, async (req, res) => {
    try {
        const { id } = req.params;
        const members = await prisma_1.default.student.findMany({
            where: { houseId: id, schoolId: req.user.schoolId },
            include: {
                class: { select: { name: true } }
            },
            orderBy: { name: 'asc' }
        });
        res.json(members);
    }
    catch (error) {
        console.error('Fetch house members error:', error);
        res.status(500).json({ error: 'Failed to fetch house members' });
    }
});
// ── STUDENT CLUBS ──
router.get('/clubs-list', auth_1.requireAuth, async (req, res) => {
    try {
        const clubs = await prisma_1.default.club.findMany({
            where: { schoolId: req.user.schoolId },
            orderBy: { name: 'asc' }
        });
        res.json(clubs);
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to fetch clubs' });
    }
});
router.post('/clubs-list', auth_1.requireAuth, (0, auth_1.requireRole)('SCHOOL_ADMIN'), upload_1.clubsUpload.single('logo'), (0, validation_1.validate)(school_schema_1.ClubSchema), async (req, res) => {
    try {
        const { name, description, date, category, patron, chairperson } = req.body;
        const logoFilename = req.file ? req.file.filename : undefined;
        const club = await prisma_1.default.club.create({
            data: {
                name,
                description,
                date: date ? new Date(date) : new Date(),
                icon: logoFilename || null,
                category: category || null,
                patron: patron || null,
                chairperson: chairperson || null,
                schoolId: req.user.schoolId
            }
        });
        res.json(club);
    }
    catch (error) {
        console.error('Create club error:', error);
        res.status(500).json({ error: 'Failed to create club' });
    }
});
router.patch('/clubs-list/:id', auth_1.requireAuth, (0, auth_1.requireRole)('SCHOOL_ADMIN'), upload_1.clubsUpload.single('logo'), (0, validation_1.validate)(school_schema_1.ClubSchema), async (req, res) => {
    try {
        const { id } = req.params;
        const { name, description, date, category, patron, chairperson } = req.body;
        const logoFilename = req.file ? req.file.filename : undefined;
        const updateData = { name, description };
        if (date)
            updateData.date = new Date(date);
        if (logoFilename)
            updateData.icon = logoFilename;
        if (category !== undefined)
            updateData.category = category || null;
        if (patron !== undefined)
            updateData.patron = patron || null;
        if (chairperson !== undefined)
            updateData.chairperson = chairperson || null;
        const club = await prisma_1.default.club.update({
            where: { id: id, schoolId: req.user.schoolId },
            data: updateData
        });
        res.json(club);
    }
    catch (error) {
        console.error('Update club error:', error);
        res.status(500).json({ error: 'Failed to update club' });
    }
});
router.delete('/clubs-list/:id', auth_1.requireAuth, (0, auth_1.requireRole)('SCHOOL_ADMIN'), async (req, res) => {
    try {
        const club = await prisma_1.default.club.findFirst({
            where: { id: req.params.id, schoolId: req.user.schoolId }
        });
        if (!club)
            return res.status(404).json({ error: 'Club not found' });
        await prisma_1.default.club.delete({ where: { id: club.id } });
        res.json({ success: true });
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to delete club' });
    }
});
// ── SCHOOL SPORTS ──
router.get('/sports-list', auth_1.requireAuth, async (req, res) => {
    try {
        const sports = await prisma_1.default.sport.findMany({
            where: { schoolId: req.user.schoolId },
            orderBy: { name: 'asc' }
        });
        res.json(sports);
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to fetch sports' });
    }
});
router.post('/sports-list', auth_1.requireAuth, (0, auth_1.requireRole)('SCHOOL_ADMIN'), upload_1.sportsUpload.single('logo'), (0, validation_1.validate)(school_schema_1.SportSchema), async (req, res) => {
    try {
        const { name, description, category, coach, sportMaster, captain, sportMasterId, captains, coaches, ageGroups } = req.body;
        const logoFilename = req.file ? req.file.filename : undefined;
        let ageGroupsArr = [];
        if (ageGroups) {
            if (typeof ageGroups === 'string') {
                try {
                    const parsed = JSON.parse(ageGroups);
                    if (Array.isArray(parsed)) {
                        ageGroupsArr = parsed;
                    }
                    else {
                        ageGroupsArr = ageGroups.split(',').map((s) => s.trim()).filter(Boolean);
                    }
                }
                catch {
                    ageGroupsArr = ageGroups.split(',').map((s) => s.trim()).filter(Boolean);
                }
            }
            else if (Array.isArray(ageGroups)) {
                ageGroupsArr = ageGroups;
            }
        }
        let captainsArr = [];
        if (captains) {
            if (typeof captains === 'string') {
                try {
                    const parsed = JSON.parse(captains);
                    if (Array.isArray(parsed)) {
                        captainsArr = parsed;
                    }
                    else {
                        captainsArr = captains.split(',').map((s) => s.trim()).filter(Boolean);
                    }
                }
                catch {
                    captainsArr = captains.split(',').map((s) => s.trim()).filter(Boolean);
                }
            }
            else if (Array.isArray(captains)) {
                captainsArr = captains;
            }
        }
        let coachesJson = null;
        if (coaches) {
            if (typeof coaches === 'string') {
                try {
                    coachesJson = JSON.parse(coaches);
                }
                catch {
                    coachesJson = coaches;
                }
            }
            else {
                coachesJson = coaches;
            }
        }
        const sport = await prisma_1.default.sport.create({
            data: {
                name,
                description,
                icon: logoFilename || null,
                category: category || null,
                coach: coach || null,
                sportMaster: sportMaster || null,
                sportMasterId: sportMasterId || null,
                captain: captain || null,
                captains: captainsArr,
                coaches: coachesJson || null,
                ageGroups: ageGroupsArr,
                schoolId: req.user.schoolId
            }
        });
        res.json(sport);
    }
    catch (error) {
        console.error('Create sport error:', error);
        res.status(500).json({ error: 'Failed to create sport' });
    }
});
router.patch('/sports-list/:id', auth_1.requireAuth, (0, auth_1.requireRole)('SCHOOL_ADMIN'), upload_1.sportsUpload.single('logo'), (0, validation_1.validate)(school_schema_1.SportSchema), async (req, res) => {
    try {
        const { id } = req.params;
        const { name, description, category, coach, sportMaster, captain, sportMasterId, captains, coaches, ageGroups } = req.body;
        const logoFilename = req.file ? req.file.filename : undefined;
        const updateData = { name, description };
        if (logoFilename)
            updateData.icon = logoFilename;
        if (category !== undefined)
            updateData.category = category || null;
        if (coach !== undefined)
            updateData.coach = coach || null;
        if (sportMaster !== undefined)
            updateData.sportMaster = sportMaster || null;
        if (sportMasterId !== undefined)
            updateData.sportMasterId = sportMasterId || null;
        if (captain !== undefined)
            updateData.captain = captain || null;
        if (captains !== undefined) {
            let captainsArr = [];
            if (captains) {
                if (typeof captains === 'string') {
                    try {
                        const parsed = JSON.parse(captains);
                        if (Array.isArray(parsed)) {
                            captainsArr = parsed;
                        }
                        else {
                            captainsArr = captains.split(',').map((s) => s.trim()).filter(Boolean);
                        }
                    }
                    catch {
                        captainsArr = captains.split(',').map((s) => s.trim()).filter(Boolean);
                    }
                }
                else if (Array.isArray(captains)) {
                    captainsArr = captains;
                }
            }
            updateData.captains = captainsArr;
        }
        if (coaches !== undefined) {
            let coachesJson = null;
            if (coaches) {
                if (typeof coaches === 'string') {
                    try {
                        coachesJson = JSON.parse(coaches);
                    }
                    catch {
                        coachesJson = coaches;
                    }
                }
                else {
                    coachesJson = coaches;
                }
            }
            updateData.coaches = coachesJson || null;
        }
        if (ageGroups !== undefined) {
            let ageGroupsArr = [];
            if (ageGroups) {
                if (typeof ageGroups === 'string') {
                    try {
                        const parsed = JSON.parse(ageGroups);
                        if (Array.isArray(parsed)) {
                            ageGroupsArr = parsed;
                        }
                        else {
                            ageGroupsArr = ageGroups.split(',').map((s) => s.trim()).filter(Boolean);
                        }
                    }
                    catch {
                        ageGroupsArr = ageGroups.split(',').map((s) => s.trim()).filter(Boolean);
                    }
                }
                else if (Array.isArray(ageGroups)) {
                    ageGroupsArr = ageGroups;
                }
            }
            updateData.ageGroups = ageGroupsArr;
        }
        const sport = await prisma_1.default.sport.update({
            where: { id: id, schoolId: req.user.schoolId },
            data: updateData
        });
        res.json(sport);
    }
    catch (error) {
        console.error('Update sport error:', error);
        res.status(500).json({ error: 'Failed to update sport' });
    }
});
router.delete('/sports-list/:id', auth_1.requireAuth, (0, auth_1.requireRole)('SCHOOL_ADMIN'), async (req, res) => {
    try {
        const sport = await prisma_1.default.sport.findFirst({
            where: { id: req.params.id, schoolId: req.user.schoolId }
        });
        if (!sport)
            return res.status(404).json({ error: 'Sport not found' });
        await prisma_1.default.sport.delete({ where: { id: sport.id } });
        res.json({ success: true });
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to delete sport' });
    }
});
// ── SPORTING EQUIPMENT ──
router.get('/sports-equipment', auth_1.requireAuth, async (req, res) => {
    try {
        const equipment = await prisma_1.default.sportingEquipment.findMany({
            where: { schoolId: req.user.schoolId },
            include: {
                sport: { select: { id: true, name: true } },
                custodian: { select: { id: true, name: true, role: true } }
            },
            orderBy: { name: 'asc' }
        });
        res.json(equipment);
    }
    catch (error) {
        console.error('Fetch sporting equipment error:', error);
        res.status(500).json({ error: 'Failed to fetch sporting equipment' });
    }
});
router.post('/sports-equipment', auth_1.requireAuth, (0, auth_1.requireRole)('SCHOOL_ADMIN'), (0, validation_1.validate)(school_schema_1.SportEquipmentSchema), async (req, res) => {
    try {
        const { name, sportId, quantity, condition, custodianId } = req.body;
        const equipment = await prisma_1.default.sportingEquipment.create({
            data: {
                name,
                sportId: sportId || null,
                quantity: quantity ? parseInt(quantity) : 0,
                condition: condition || 'GOOD',
                custodianId: custodianId || null,
                schoolId: req.user.schoolId
            },
            include: {
                sport: { select: { id: true, name: true } },
                custodian: { select: { id: true, name: true, role: true } }
            }
        });
        res.json(equipment);
    }
    catch (error) {
        console.error('Create sporting equipment error:', error);
        res.status(500).json({ error: 'Failed to create sporting equipment' });
    }
});
router.patch('/sports-equipment/:id', auth_1.requireAuth, (0, auth_1.requireRole)('SCHOOL_ADMIN'), (0, validation_1.validate)(school_schema_1.SportEquipmentSchema), async (req, res) => {
    try {
        const { id } = req.params;
        const { name, sportId, quantity, condition, custodianId } = req.body;
        const updateData = {};
        if (name !== undefined)
            updateData.name = name;
        if (sportId !== undefined)
            updateData.sportId = sportId || null;
        if (quantity !== undefined)
            updateData.quantity = quantity ? parseInt(quantity) : 0;
        if (condition !== undefined)
            updateData.condition = condition;
        if (custodianId !== undefined)
            updateData.custodianId = custodianId || null;
        const equipment = await prisma_1.default.sportingEquipment.update({
            where: { id: id, schoolId: req.user.schoolId },
            data: updateData,
            include: {
                sport: { select: { id: true, name: true } },
                custodian: { select: { id: true, name: true, role: true } }
            }
        });
        res.json(equipment);
    }
    catch (error) {
        console.error('Update sporting equipment error:', error);
        res.status(500).json({ error: 'Failed to update sporting equipment' });
    }
});
router.delete('/sports-equipment/:id', auth_1.requireAuth, (0, auth_1.requireRole)('SCHOOL_ADMIN'), async (req, res) => {
    try {
        const { id } = req.params;
        const equipment = await prisma_1.default.sportingEquipment.findFirst({
            where: { id: id, schoolId: req.user.schoolId }
        });
        if (!equipment)
            return res.status(404).json({ error: 'Equipment not found' });
        await prisma_1.default.sportingEquipment.delete({ where: { id: equipment.id } });
        res.json({ success: true });
    }
    catch (error) {
        console.error('Delete sporting equipment error:', error);
        res.status(500).json({ error: 'Failed to delete sporting equipment' });
    }
});
// ── HOLIDAYS ──
router.get('/holidays', auth_1.requireAuth, async (req, res) => {
    try {
        const holidays = await prisma_1.default.holiday.findMany({
            where: { schoolId: req.user.schoolId },
            orderBy: { startDate: 'asc' }
        });
        res.json(holidays);
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to fetch holidays' });
    }
});
router.post('/holidays', auth_1.requireAuth, (0, auth_1.requireRole)('SCHOOL_ADMIN'), (0, validation_1.validate)(school_schema_1.HolidaySchema), async (req, res) => {
    try {
        const { title, content, startDate, endDate } = req.body;
        const holiday = await prisma_1.default.holiday.create({
            data: {
                title,
                content,
                startDate: new Date(startDate),
                endDate: new Date(endDate),
                schoolId: req.user.schoolId
            }
        });
        res.json(holiday);
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to create holiday' });
    }
});
router.delete('/holidays/:id', auth_1.requireAuth, (0, auth_1.requireRole)('SCHOOL_ADMIN'), async (req, res) => {
    try {
        await prisma_1.default.holiday.delete({ where: { id: req.params.id } });
        res.json({ success: true });
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to delete holiday' });
    }
});
/**
 * @route   GET /api/schools/tenant/export
 * @desc    Export all critical data for the current school
 */
router.get('/tenant/export', auth_1.requireAuth, (0, auth_1.requireRole)('SCHOOL_ADMIN'), async (req, res) => {
    try {
        const schoolId = req.user.schoolId;
        // Fetch critical tables
        const students = await prisma_1.default.student.findMany({ where: { schoolId } });
        const teachers = await prisma_1.default.teacher.findMany({ where: { schoolId } });
        const users = await prisma_1.default.user.findMany({ where: { schoolId }, select: { id: true, name: true, email: true, role: true } });
        const fees = await prisma_1.default.fee.findMany({ where: { schoolId } });
        const payments = await prisma_1.default.studentPayment.findMany({ where: { schoolId } });
        const classes = await prisma_1.default.schoolClass.findMany({ where: { schoolId } });
        const subjects = await prisma_1.default.subject.findMany({ where: { schoolId } });
        const exportData = {
            timestamp: new Date().toISOString(),
            schoolId,
            data: {
                users,
                students,
                teachers,
                classes,
                subjects,
                fees,
                payments
            }
        };
        // Audit Log the data exfiltration event
        await (0, audit_1.logAction)(req, 'EXPORT_TENANT_DATA', 'School', schoolId, {
            recordsExported: {
                users: users.length,
                students: students.length,
                teachers: teachers.length,
                classes: classes.length,
                subjects: subjects.length,
                fees: fees.length,
                payments: payments.length
            }
        });
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Content-Disposition', `attachment; filename="school_export_${new Date().toISOString().split('T')[0]}.json"`);
        res.send(JSON.stringify(exportData, null, 2));
    }
    catch (error) {
        console.error('Export error:', error);
        res.status(500).json({ error: 'Failed to export data' });
    }
});
/**
 * @route   GET /api/schools/:code
 * @desc    Fetch school public data by code
 */
router.get('/:code', async (req, res) => {
    const { code } = req.params;
    try {
        const school = await prisma_1.default.school.findUnique({
            where: { code: code.toUpperCase() },
            select: {
                id: true,
                code: true,
                name: true,
                type: true,
                address: true,
                phone: true,
                email: true,
                branding: true,
                customContent: true,
                status: true,
                plan: { select: { name: true, features: true } },
                schoolSetting: true,
                websiteSettings: true,
                createdAt: true,
                _count: {
                    select: {
                        sports: true,
                        clubs: true
                    }
                }
            }
        });
        if (!school)
            return res.status(404).json({ error: 'School not found' });
        if (school.status === 'suspended')
            return res.status(403).json({ error: 'School access is suspended' });
        // Auto-create websiteSettings if null
        let websiteSettings = school.websiteSettings;
        if (!websiteSettings) {
            websiteSettings = await prisma_1.default.websiteSettings.create({
                data: {
                    schoolId: school.id,
                    bannerTitle: `Welcome to ${school.name}`,
                    bannerSubTitleOne: 'Nurturing minds, building character, and inspiring excellence.',
                    bannerTitleColor: '#ffffff',
                    schoolPrimaryColor: '#0056b3',
                    aboutTitle: `About ${school.name}`,
                    aboutUsContent: `${school.name} is a premier educational institution committed to academic excellence and personal growth.`,
                    campusTitle: 'Our Campus',
                    campusContent: 'Explore our state-of-the-art facilities and campus environment.',
                    campusImages: []
                }
            });
            school.websiteSettings = websiteSettings;
        }
        // Auto-create schoolSetting if null
        let schoolSetting = school.schoolSetting;
        if (!schoolSetting) {
            schoolSetting = await prisma_1.default.schoolSetting.create({
                data: {
                    schoolId: school.id,
                    systemName: school.name,
                    systemEmail: school.email || 'info@school.com',
                    phone: school.phone || '',
                    address: school.address || ''
                }
            });
            school.schoolSetting = schoolSetting;
        }
        // Calculate dynamic Years of Excellence based on oldest student
        const oldestStudent = await prisma_1.default.student.findFirst({
            where: { schoolId: school.id },
            orderBy: { enrolledAt: 'asc' },
            select: { enrolledAt: true }
        });
        const firstAttendedYear = oldestStudent
            ? new Date(oldestStudent.enrolledAt).getFullYear()
            : new Date(school.createdAt).getFullYear();
        const currentYear = new Date().getFullYear();
        const yearsOfExcellence = Math.max(0, currentYear - firstAttendedYear);
        res.json({
            ...school,
            yearsOfExcellence,
            firstAttendedYear,
            sportsCount: school._count?.sports ?? 0,
            clubsCount: school._count?.clubs ?? 0
        });
    }
    catch (error) {
        console.error('Failed to fetch school data:', error);
        res.status(500).json({ error: 'Failed to fetch school data' });
    }
});
/**
 * @route   PATCH /api/schools/supplier-categories
 * @desc    [SCHOOL_ADMIN] Update school supplier categories list
 */
router.patch('/supplier-categories', auth_1.requireAuth, (0, auth_1.requireRole)('SCHOOL_ADMIN'), (0, validation_1.validate)(school_schema_1.SupplierCategoriesSchema), async (req, res) => {
    const { categories } = req.body;
    if (!Array.isArray(categories)) {
        return res.status(400).json({ error: 'Categories must be an array of strings' });
    }
    try {
        const schoolId = req.user.schoolId;
        const school = await prisma_1.default.school.findUnique({ where: { id: schoolId } });
        if (!school)
            return res.status(404).json({ error: 'School not found' });
        const currentContent = school.customContent || {};
        const updatedContent = {
            ...currentContent,
            supplierCategories: categories
        };
        await prisma_1.default.school.update({
            where: { id: schoolId },
            data: { customContent: updatedContent }
        });
        res.json({ success: true, categories });
    }
    catch (error) {
        console.error('Failed to update supplier categories:', error);
        res.status(500).json({ error: 'Failed to update supplier categories' });
    }
});
/**
 * @route   PATCH /api/schools/:code
 * @desc    [SUPER_ADMIN] Update school metadata, status or plan
 */
router.patch('/:code', auth_1.requireAuth, (0, auth_1.requireRole)('SUPER_ADMIN'), (0, validation_1.validate)(school_schema_1.SuperAdminSchoolSchema), async (req, res) => {
    const code = req.params.code;
    const { name, email, phone, address, status, planName, type } = req.body;
    try {
        const updateData = {};
        if (name)
            updateData.name = name;
        if (email)
            updateData.email = email;
        if (phone)
            updateData.phone = phone;
        if (address)
            updateData.address = address;
        if (status)
            updateData.status = status;
        if (type)
            updateData.type = type;
        if (planName) {
            const plan = await prisma_1.default.plan.findUnique({ where: { name: planName } });
            if (!plan)
                return res.status(400).json({ error: 'Invalid plan name' });
            updateData.planId = plan.id;
        }
        const school = await prisma_1.default.school.update({
            where: { code: code.toUpperCase() },
            data: updateData
        });
        res.json({ message: 'School updated successfully', school });
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to update school' });
    }
});
/**
 * @route   DELETE /api/schools/:code
 * @desc    [SUPER_ADMIN] Permanently delete a school
 */
router.delete('/:code', auth_1.requireAuth, (0, auth_1.requireRole)('SUPER_ADMIN'), async (req, res) => {
    const code = req.params.code;
    try {
        const school = await prisma_1.default.school.update({
            where: { code: code.toUpperCase() },
            data: { status: 'deleted' }
        });
        // Invalidate all tokens for users of this school by locking them or requiring password change
        // For now, the requireAuth middleware will block them because school.status === 'deleted'
        res.json({ message: 'School deleted successfully' });
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to delete school' });
    }
});
/**
 * @route   GET /api/schools/:code/content
 * @desc    Fetch dynamic public content
 */
router.get('/:code/content', async (req, res) => {
    const { code } = req.params;
    try {
        const school = await prisma_1.default.school.findUnique({
            where: { code: code.toUpperCase() },
            include: {
                news: { orderBy: { publishedAt: 'desc' }, take: 10 },
                gallery: { orderBy: { createdAt: 'desc' }, take: 12 },
                clubs: true,
                sports: true
            }
        });
        if (!school)
            return res.status(404).json({ error: 'School not found' });
        res.json({ news: school.news, gallery: school.gallery, clubs: school.clubs, sports: school.sports });
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to fetch content' });
    }
});
/**
 * @route   GET /api/schools/connections/pending
 * @desc    [SCHOOL_ADMIN] Fetch all users with pending link requests (Suppliers or Parents)
 */
router.get('/connections/pending', auth_1.requireAuth, (0, auth_1.requireRole)('SCHOOL_ADMIN'), async (req, res) => {
    const { role } = req.query;
    try {
        const schoolId = req.user.schoolId;
        if (role === 'PARENT') {
            const pendingParents = await prisma_1.default.parentStudent.findMany({
                where: {
                    student: { schoolId },
                    status: 'PENDING'
                },
                include: {
                    parent: { include: { user: true } },
                    student: true
                }
            });
            return res.json(pendingParents.map(p => ({
                ...p.parent.user,
                parentRecordId: p.parent.id,
                connectionId: p.id,
                studentName: p.student.name,
                studentId: p.student.studentId,
                relation: p.relation
            })));
        }
        // Default: Fetch PENDING connections from SchoolSupplier table
        const pendingConnections = await prisma_1.default.schoolSupplier.findMany({
            where: {
                schoolId,
                status: 'PENDING'
            },
            include: {
                supplier: {
                    include: { user: true }
                }
            }
        });
        const pendingSuppliers = pendingConnections.map(c => ({
            ...c.supplier.user,
            supplierRecordId: c.supplier.id,
            connectionId: c.id,
            metadata: {
                ...(c.supplier.user?.metadata || {}),
                companyName: c.supplier.companyName,
                address: c.supplier.address,
                taxNumber: c.supplier.taxClearance,
                prazReg: c.supplier.prazCert
            }
        }));
        res.json(pendingSuppliers);
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to fetch pending connections' });
    }
});
/**
 * @route   PATCH /api/schools/connections/:userId/approve
 * @desc    [SCHOOL_ADMIN] Approve a pending connection request
 */
router.patch('/connections/:userId/approve', auth_1.requireAuth, (0, auth_1.requireRole)('SCHOOL_ADMIN'), async (req, res) => {
    try {
        const applicantId = req.params.userId;
        const school = await prisma_1.default.school.findUnique({ where: { id: req.user.schoolId } });
        if (!school)
            return res.status(404).json({ error: 'School not found' });
        const applicant = await prisma_1.default.user.findFirst({ where: { id: applicantId } });
        if (!applicant)
            return res.status(404).json({ error: 'User not found' });
        // 1. Find the pending connection (Check Supplier first, then Parent)
        let schoolSpecificId = null;
        let type = 'SUPPLIER';
        let connection = await prisma_1.default.schoolSupplier.findFirst({
            where: {
                schoolId: school.id,
                supplier: { userId: applicantId },
                status: 'PENDING'
            }
        });
        if (!connection) {
            connection = await prisma_1.default.parentStudent.findFirst({
                where: {
                    student: { schoolId: school.id },
                    parent: { userId: applicantId },
                    status: 'PENDING'
                }
            });
            type = 'PARENT';
        }
        if (!connection) {
            return res.status(400).json({ error: 'No pending request found for this school' });
        }
        // 2. Handle role-specific logic (e.g., ID generation)
        if (type === 'SUPPLIER') {
            // Generate ID before the transaction (atomic via SchoolSequence table)
            schoolSpecificId = await (0, id_generator_1.generateSequentialId)(school.id, 'SUPPLIER');
            // Both writes must succeed or neither should — wrap in transaction
            await prisma_1.default.$transaction([
                prisma_1.default.schoolSupplier.update({
                    where: { id: connection.id },
                    data: { status: 'APPROVED', schoolSpecificId }
                }),
                // Sync generated ID back to the User table
                prisma_1.default.user.update({
                    where: { id: applicantId },
                    data: { staffId: schoolSpecificId }
                })
            ]);
        }
        else {
            await prisma_1.default.parentStudent.update({
                where: { id: connection.id },
                data: { status: 'APPROVED' }
            });
        }
        res.json({ success: true, message: 'Connection approved successfully', schoolSpecificId });
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to approve connection' });
    }
});
exports.default = router;
//# sourceMappingURL=schools.js.map