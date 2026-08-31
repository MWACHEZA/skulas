import { Router, Response } from 'express';
import prisma from '../lib/prisma';
import { requireAuth, requireRole, AuthRequest } from '../middleware/auth';
import { seedChartOfAccounts } from '../../prisma/seeders/coa.seeder';

const router = Router();

// Default modules state
const DEFAULT_MODULES = {
  academic: true,
  accounting: true,
  fees: true,
  branding: true,
  website: true,
  id_cards: true,
  document_branding: true,
  grading: true,
  transportation: true,
  boarding: true,
  assets: true,
  clubs: true,
  uniforms: true,
  clinic: true
};

const STAGES_ORDER = [
  'system_preferences',
  'org_profile',
  'branding',
  'website_setup',
  'id_cards_setup',
  'roles_staff',
  'chart_of_accounts',
  'departments',
  'subjects',
  'academic_structure',
  'grading_setup',
  'fee_structure',
  'students_staff',
  'transport_setup',
  'boarding_setup',
  'asset_setup',
  'sports_houses',
  'clubs_setup',
  'uniform_setup',
  'clinic_setup',
  'document_branding',
  'review_golive'
];

/**
 * Helper to compute active stages based on enabled modules
 */
function getActiveStages(modules: Record<string, boolean>) {
  const active: string[] = ['system_preferences', 'org_profile'];
  if (modules.branding !== false) active.push('branding');
  if (modules.website !== false) active.push('website_setup');
  if (modules.id_cards !== false) active.push('id_cards_setup');
  active.push('roles_staff');
  if (modules.accounting !== false) active.push('chart_of_accounts');
  if (modules.academic !== false) active.push('departments');
  if (modules.academic !== false) active.push('subjects');
  if (modules.academic !== false) active.push('academic_structure');
  if (modules.academic !== false || modules.grading !== false) active.push('grading_setup');
  if (modules.academic !== false && modules.fees !== false) active.push('fee_structure');
  if (modules.academic !== false) active.push('students_staff');
  if (modules.transportation) active.push('transport_setup');
  if (modules.boarding) active.push('boarding_setup');
  if (modules.assets) active.push('asset_setup');
  if (modules.academic !== false) active.push('sports_houses');
  if (modules.clubs) active.push('clubs_setup');
  if (modules.uniforms) active.push('uniform_setup');
  if (modules.clinic) active.push('clinic_setup');
  if (modules.document_branding !== false) active.push('document_branding');
  active.push('review_golive');
  return active;
}

/**
 * @route   GET /api/setup/status
 * @desc    Fetch tenant setup status, real-time DB counts, and module configurations
 */
router.get('/status', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const schoolId = req.user!.schoolId!;
    const school = await prisma.school.findUnique({
      where: { id: schoolId },
      include: { schoolSetting: true }
    });

    if (!school) return res.status(404).json({ error: 'School not found' });

    let schoolSetting = school.schoolSetting;
    if (!schoolSetting) {
      schoolSetting = await prisma.schoolSetting.create({
        data: {
          schoolId,
          systemName: school.name,
          systemEmail: school.email,
          phone: school.phone || '',
          address: school.address || ''
        }
      });
    }

    const currentStatus = (schoolSetting as any).setupStatus || {};
    const enabledModules = { ...DEFAULT_MODULES, ...(currentStatus.enabledModules || {}) };

    // Real-time DB counts to auto-verify completion
    const [
      coaCount, classesCount, studentsCount, feesCount, uniformsCount, clinicCount, staffCount,
      deptCount, subjectCount, sportsCount, housesCount, routesCount, vehiclesCount, hostelsCount,
      assetsCount, gradingCount, clubsCount, websiteSettingsCount, reportTemplateCount
    ] = await Promise.all([
      prisma.chartOfAccount.count({ where: { schoolId } }),
      prisma.schoolClass.count({ where: { schoolId } }),
      prisma.student.count({ where: { schoolId } }),
      prisma.feeGroup.count({ where: { schoolId } }),
      prisma.uniformItem.count({ where: { schoolId } }),
      prisma.clinicInventoryItem.count({ where: { schoolId } }),
      prisma.user.count({ where: { schoolId, role: { in: ['TEACHER', 'BURSAR', 'LIBRARIAN', 'ANCILLARY', 'SCHOOL_ADMIN'] } } }),
      prisma.department.count({ where: { schoolId } }),
      prisma.subject.count({ where: { schoolId } }),
      prisma.sport.count({ where: { schoolId } }),
      prisma.studentHouse.count({ where: { schoolId } }),
      prisma.transportRoute.count({ where: { schoolId } }),
      prisma.schoolVehicle.count({ where: { schoolId } }),
      prisma.hostelCategory.count({ where: { schoolId } }),
      prisma.asset.count({ where: { schoolId } }),
      prisma.gradingScale.count({ where: { schoolId } }),
      prisma.club.count({ where: { schoolId } }),
      prisma.websiteSettings.count({ where: { schoolId } }),
      prisma.reportTemplate.count({ where: { schoolId } })
    ]);

    const dbCompletedStages: Record<string, boolean> = {
      system_preferences: !!(currentStatus.completedStages?.system_preferences),
      org_profile: !!school.name,
      branding: !!((schoolSetting as any)?.motto || (schoolSetting as any)?.systemEmail || (schoolSetting as any)?.reportHeader),
      website_setup: websiteSettingsCount > 0 || !!((schoolSetting as any)?.facebook || (schoolSetting as any)?.twitter || (schoolSetting as any)?.systemUrl),
      id_cards_setup: !!((schoolSetting as any)?.idCardTemplateFront || (schoolSetting as any)?.idCardTemplateBack || (schoolSetting as any)?.gateRequiredType !== 'none'),
      roles_staff: staffCount > 0,
      chart_of_accounts: coaCount > 0,
      departments: deptCount > 0,
      subjects: subjectCount > 0,
      academic_structure: classesCount > 0,
      grading_setup: gradingCount > 0,
      fee_structure: feesCount > 0,
      students_staff: studentsCount > 0,
      transport_setup: routesCount > 0 || vehiclesCount > 0,
      boarding_setup: hostelsCount > 0,
      asset_setup: assetsCount > 0,
      sports_houses: sportsCount > 0 || housesCount > 0,
      clubs_setup: clubsCount > 0,
      uniform_setup: uniformsCount > 0,
      clinic_setup: clinicCount > 0,
      document_branding: reportTemplateCount > 0 || !!schoolSetting?.mandatoryReceipts,
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
        staff: staffCount,
        departments: deptCount,
        subjects: subjectCount,
        sports: sportsCount,
        houses: housesCount,
        routes: routesCount,
        vehicles: vehiclesCount,
        hostels: hostelsCount,
        assets: assetsCount,
        grading: gradingCount,
        clubs: clubsCount
      }
    };

    res.json(fullStatus);
  } catch (error) {
    console.error('Fetch setup status error:', error);
    res.status(500).json({ error: 'Failed to fetch setup status' });
  }
});

/**
 * @route   POST /api/setup/update-stage
 * @desc    [SCHOOL_ADMIN] Update specific stage completion or step progress
 */
router.post('/update-stage', requireAuth, requireRole('SCHOOL_ADMIN'), async (req: AuthRequest, res: Response) => {
  try {
    const schoolId = req.user!.schoolId!;
    const { stageKey, completed, currentStep } = req.body;

    const setting = await prisma.schoolSetting.findFirst({ where: { schoolId } });
    const currentStatus = (setting?.setupStatus as any) || {};

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

    await prisma.schoolSetting.upsert({
      where: { schoolId },
      create: { schoolId, setupStatus: newSetupStatus },
      update: { setupStatus: newSetupStatus }
    });

    res.json({ success: true, setupStatus: newSetupStatus });
  } catch (error) {
    console.error('Update setup stage error:', error);
    res.status(500).json({ error: 'Failed to update setup stage' });
  }
});

/**
 * @route   POST /api/setup/modules
 * @desc    [SCHOOL_ADMIN] Configure active modules for tenant wizard
 */
router.post('/modules', requireAuth, requireRole('SCHOOL_ADMIN'), async (req: AuthRequest, res: Response) => {
  try {
    const schoolId = req.user!.schoolId!;
    const { enabledModules } = req.body;

    const setting = await prisma.schoolSetting.findFirst({ where: { schoolId } });
    const currentStatus = (setting?.setupStatus as any) || {};

    const newSetupStatus = {
      ...currentStatus,
      enabledModules: {
        ...DEFAULT_MODULES,
        ...enabledModules
      }
    };

    await prisma.schoolSetting.upsert({
      where: { schoolId },
      create: { schoolId, setupStatus: newSetupStatus },
      update: { setupStatus: newSetupStatus }
    });

    res.json({ success: true, enabledModules: newSetupStatus.enabledModules });
  } catch (error) {
    console.error('Update setup modules error:', error);
    res.status(500).json({ error: 'Failed to update setup modules' });
  }
});

/**
 * @route   POST /api/setup/seed-coa
 * @desc    [SCHOOL_ADMIN] Seed standard Chart of Accounts for tenant
 */
router.post('/seed-coa', requireAuth, requireRole('SCHOOL_ADMIN'), async (req: AuthRequest, res: Response) => {
  try {
    const schoolId = req.user!.schoolId!;
    await seedChartOfAccounts(schoolId, prisma);
    const coaCount = await prisma.chartOfAccount.count({ where: { schoolId } });
    res.json({ success: true, count: coaCount });
  } catch (error) {
    console.error('Seed COA error:', error);
    res.status(500).json({ error: 'Failed to seed Chart of Accounts' });
  }
});

/**
 * @route   GET /api/setup/role-orientation
 * @desc    Fetch role-specific first-login orientation guide
 */
router.get('/role-orientation', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const dbUser = await prisma.user.findUnique({ where: { id: userId } });
    const userMeta = (dbUser?.metadata as any) || {};
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

    if (req.user!.role === 'BURSAR') {
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
    } else if (req.user!.role === 'CLINIC' || (req.user!.role === 'ANCILLARY' && req.user!.secondaryRoles?.includes('NURSE'))) {
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
    } else if (req.user!.role === 'TEACHER') {
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
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch role orientation' });
  }
});

/**
 * @route   POST /api/setup/dismiss-orientation
 * @desc    Dismiss role orientation guide banner
 */
router.post('/dismiss-orientation', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const user = await prisma.user.findUnique({ where: { id: userId } });
    const currentMeta = (user?.metadata as any) || {};

    await prisma.user.update({
      where: { id: userId },
      data: {
        metadata: {
          ...currentMeta,
          orientationDismissed: true
        }
      }
    });

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to dismiss orientation' });
  }
});

export default router;
