"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const prisma_1 = __importDefault(require("../lib/prisma"));
const auth_1 = require("../middleware/auth");
const coa_seeder_1 = require("../../prisma/seeders/coa.seeder");
const router = (0, express_1.Router)();
// Default modules state
const DEFAULT_MODULES = {
    academic: true,
    accounting: true,
    fees: true,
    uniforms: true,
    clinic: true
};
const STAGES_ORDER = [
    'org_profile',
    'roles_staff',
    'chart_of_accounts',
    'academic_structure',
    'fee_structure',
    'students_staff',
    'uniform_setup',
    'clinic_setup',
    'review_golive'
];
/**
 * Helper to compute active stages based on enabled modules
 */
function getActiveStages(modules) {
    const active = ['org_profile', 'roles_staff', 'chart_of_accounts'];
    if (modules.academic)
        active.push('academic_structure');
    if (modules.academic && modules.fees)
        active.push('fee_structure');
    if (modules.academic)
        active.push('students_staff');
    if (modules.uniforms)
        active.push('uniform_setup');
    if (modules.clinic)
        active.push('clinic_setup');
    active.push('review_golive');
    return active;
}
/**
 * @route   GET /api/setup/status
 * @desc    Fetch tenant setup status, real-time DB counts, and module configurations
 */
router.get('/status', auth_1.requireAuth, async (req, res) => {
    try {
        const schoolId = req.user.schoolId;
        const school = await prisma_1.default.school.findUnique({
            where: { id: schoolId },
            include: { schoolSetting: true }
        });
        if (!school)
            return res.status(404).json({ error: 'School not found' });
        let schoolSetting = school.schoolSetting;
        if (!schoolSetting) {
            schoolSetting = await prisma_1.default.schoolSetting.create({
                data: {
                    schoolId,
                    systemName: school.name,
                    systemEmail: school.email,
                    phone: school.phone || '',
                    address: school.address || ''
                }
            });
        }
        const currentStatus = schoolSetting.setupStatus || {};
        const enabledModules = { ...DEFAULT_MODULES, ...(currentStatus.enabledModules || {}) };
        // Real-time DB counts to auto-verify completion
        const [coaCount, classesCount, studentsCount, feesCount, uniformsCount, clinicCount, staffCount] = await Promise.all([
            prisma_1.default.chartOfAccount.count({ where: { schoolId } }),
            prisma_1.default.schoolClass.count({ where: { schoolId } }),
            prisma_1.default.student.count({ where: { schoolId } }),
            prisma_1.default.feeGroup.count({ where: { schoolId } }),
            prisma_1.default.uniformItem.count({ where: { schoolId } }),
            prisma_1.default.clinicInventoryItem.count({ where: { schoolId } }),
            prisma_1.default.user.count({ where: { schoolId, role: { in: ['TEACHER', 'BURSAR', 'LIBRARIAN', 'ANCILLARY', 'SCHOOL_ADMIN'] } } })
        ]);
        const dbCompletedStages = {
            org_profile: !!school.name,
            roles_staff: staffCount > 0,
            chart_of_accounts: coaCount > 0,
            academic_structure: classesCount > 0,
            fee_structure: feesCount > 0,
            students_staff: studentsCount > 0,
            uniform_setup: uniformsCount > 0,
            clinic_setup: clinicCount > 0,
            review_golive: currentStatus.completedStages?.review_golive || false
        };
        // Merge explicitly completed stages in status with real-time DB truths
        const completedStages = {
            ...(currentStatus.completedStages || {}),
            ...dbCompletedStages
        };
        const activeStages = getActiveStages(enabledModules);
        const completedActiveCount = activeStages.filter(st => completedStages[st]).length;
        const progressPercentage = Math.round((completedActiveCount / activeStages.length) * 100);
        const isComplete = progressPercentage === 100;
        const fullStatus = {
            schoolId,
            schoolName: school.name,
            schoolType: school.type,
            currentStep: currentStatus.currentStep || 1,
            isComplete,
            progressPercentage,
            activeStages,
            enabledModules,
            completedStages,
            counts: {
                coa: coaCount,
                classes: classesCount,
                students: studentsCount,
                fees: feesCount,
                uniforms: uniformsCount,
                clinic: clinicCount,
                staff: staffCount
            }
        };
        res.json(fullStatus);
    }
    catch (error) {
        console.error('Fetch setup status error:', error);
        res.status(500).json({ error: 'Failed to fetch setup status' });
    }
});
/**
 * @route   POST /api/setup/update-stage
 * @desc    [SCHOOL_ADMIN] Update specific stage completion or step progress
 */
router.post('/update-stage', auth_1.requireAuth, (0, auth_1.requireRole)('SCHOOL_ADMIN'), async (req, res) => {
    try {
        const schoolId = req.user.schoolId;
        const { stageKey, completed, currentStep } = req.body;
        const setting = await prisma_1.default.schoolSetting.findFirst({ where: { schoolId } });
        const currentStatus = setting?.setupStatus || {};
        const updatedCompletedStages = {
            ...(currentStatus.completedStages || {}),
            ...(stageKey ? { [stageKey]: !!completed } : {})
        };
        const newSetupStatus = {
            ...currentStatus,
            currentStep: currentStep !== undefined ? currentStep : currentStatus.currentStep || 1,
            completedStages: updatedCompletedStages,
            updatedAt: new Date().toISOString()
        };
        await prisma_1.default.schoolSetting.upsert({
            where: { schoolId },
            create: { schoolId, setupStatus: newSetupStatus },
            update: { setupStatus: newSetupStatus }
        });
        res.json({ success: true, setupStatus: newSetupStatus });
    }
    catch (error) {
        console.error('Update setup stage error:', error);
        res.status(500).json({ error: 'Failed to update setup stage' });
    }
});
/**
 * @route   POST /api/setup/modules
 * @desc    [SCHOOL_ADMIN] Configure active modules for tenant wizard
 */
router.post('/modules', auth_1.requireAuth, (0, auth_1.requireRole)('SCHOOL_ADMIN'), async (req, res) => {
    try {
        const schoolId = req.user.schoolId;
        const { enabledModules } = req.body;
        const setting = await prisma_1.default.schoolSetting.findFirst({ where: { schoolId } });
        const currentStatus = setting?.setupStatus || {};
        const newSetupStatus = {
            ...currentStatus,
            enabledModules: {
                ...DEFAULT_MODULES,
                ...enabledModules
            }
        };
        await prisma_1.default.schoolSetting.upsert({
            where: { schoolId },
            create: { schoolId, setupStatus: newSetupStatus },
            update: { setupStatus: newSetupStatus }
        });
        res.json({ success: true, enabledModules: newSetupStatus.enabledModules });
    }
    catch (error) {
        console.error('Update setup modules error:', error);
        res.status(500).json({ error: 'Failed to update setup modules' });
    }
});
/**
 * @route   POST /api/setup/seed-coa
 * @desc    [SCHOOL_ADMIN] Seed standard Chart of Accounts for tenant
 */
router.post('/seed-coa', auth_1.requireAuth, (0, auth_1.requireRole)('SCHOOL_ADMIN'), async (req, res) => {
    try {
        const schoolId = req.user.schoolId;
        await (0, coa_seeder_1.seedChartOfAccounts)(schoolId, prisma_1.default);
        const coaCount = await prisma_1.default.chartOfAccount.count({ where: { schoolId } });
        res.json({ success: true, count: coaCount });
    }
    catch (error) {
        console.error('Seed COA error:', error);
        res.status(500).json({ error: 'Failed to seed Chart of Accounts' });
    }
});
/**
 * @route   GET /api/setup/role-orientation
 * @desc    Fetch role-specific first-login orientation guide
 */
router.get('/role-orientation', auth_1.requireAuth, async (req, res) => {
    try {
        const userId = req.user.id;
        const dbUser = await prisma_1.default.user.findUnique({ where: { id: userId } });
        const userMeta = dbUser?.metadata || {};
        const isDismissed = !!userMeta.orientationDismissed;
        let orientationGuide = {
            title: 'Welcome to ACADEX Portal',
            description: 'Your account is ready. Explore key tools and shortcuts tailored for your role.',
            icon: 'fas fa-compass',
            dismissed: isDismissed,
            actions: [
                { label: 'View Profile', link: '/admin/profile' }
            ]
        };
        if (req.user.role === 'BURSAR') {
            orientationGuide = {
                title: 'Bursar Financial Desk Orientation',
                description: 'Manage student fee billing, record ledger transactions, monitor receipts, and process uniform sales.',
                icon: 'fas fa-calculator',
                dismissed: isDismissed,
                actions: [
                    { label: 'View Student Fee Ledgers', link: '/admin/fees-management/ledgers' },
                    { label: 'Check Chart of Accounts', link: '/admin/accounts/coa' },
                    { label: 'Uniform Sales Counter', link: '/admin/accounts/uniforms' }
                ]
            };
        }
        else if (req.user.role === 'CLINIC' || (req.user.role === 'ANCILLARY' && req.user.secondaryRoles?.includes('NURSE'))) {
            orientationGuide = {
                title: 'Clinic & Infirmary Care Desk Orientation',
                description: 'Log patient complaints, manage bed allocations, record pharmacy inventory, and track student vitals.',
                icon: 'fas fa-user-nurse',
                dismissed: isDismissed,
                actions: [
                    { label: 'Open Clinic Dashboard', link: '/admin/clinic/dashboard' },
                    { label: 'Check Pharmacy Stock', link: '/admin/clinic/pharmacy' },
                    { label: 'Record Triage & Vitals', link: '/admin/clinic/triage' }
                ]
            };
        }
        else if (req.user.role === 'TEACHER') {
            orientationGuide = {
                title: 'Teacher Academic Desk Orientation',
                description: 'Record student assessment marks, view assigned subjects, create lesson plans, and take daily attendance.',
                icon: 'fas fa-chalkboard-teacher',
                dismissed: isDismissed,
                actions: [
                    { label: 'Enter Marks', link: '/admin/assessments/marks-entry' },
                    { label: 'Syllabus & Lesson Plans', link: '/admin/syllabus' },
                    { label: 'Take Attendance', link: '/admin/timetable' }
                ]
            };
        }
        res.json(orientationGuide);
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to fetch role orientation' });
    }
});
/**
 * @route   POST /api/setup/dismiss-orientation
 * @desc    Dismiss role orientation guide banner
 */
router.post('/dismiss-orientation', auth_1.requireAuth, async (req, res) => {
    try {
        const userId = req.user.id;
        const user = await prisma_1.default.user.findUnique({ where: { id: userId } });
        const currentMeta = user?.metadata || {};
        await prisma_1.default.user.update({
            where: { id: userId },
            data: {
                metadata: {
                    ...currentMeta,
                    orientationDismissed: true
                }
            }
        });
        res.json({ success: true });
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to dismiss orientation' });
    }
});
exports.default = router;
//# sourceMappingURL=setup.js.map