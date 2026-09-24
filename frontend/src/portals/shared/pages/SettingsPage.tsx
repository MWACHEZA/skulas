import { useState, useEffect } from 'react';
import api from '../../../lib/api';
import { useAuth } from '../../../contexts/AuthContext';
import { useToast } from '../../../context/ToastContext';
import '../../../styles/portal.css';

// Website Settings subcomponents
import BannerSettings from './website-settings/BannerSettings';
import AboutSettings from './website-settings/AboutSettings';
import AdmissionSettings from './website-settings/AdmissionSettings';
import InquirySettings from './website-settings/InquirySettings';
import NewsSettings from './website-settings/NewsSettings';
import GallerySettings from './website-settings/GallerySettings';
import NoticeboardSettings from './website-settings/NoticeboardSettings';

// Payroll Settings component
import PayrollSettingsPage from './PayrollSettingsPage';

type TabType = 'banner' | 'about' | 'admission' | 'inquiry' | 'news' | 'gallery' | 'noticeboard' | 'personal' | 'academics' | 'financial' | 'communication';

interface SettingsPageProps {
  defaultTab?: string;
}

export default function SettingsPage({ defaultTab: _defaultTab }: SettingsPageProps) {
  const { user, refreshUser } = useAuth();
  const { showToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [coaAccounts, setCoaAccounts] = useState<any[]>([]);
  const [activeCmsSection, setActiveCmsSection] = useState<'banner' | 'about' | 'inquiry' | 'news' | 'gallery' | 'noticeboard'>('banner');

  // Settings State
  const [settings, setSettings] = useState<any>({
    // Personal Settings
    emailAlerts: true,
    browserNotifications: true,
    weeklyDigest: false,
    preferredLanguage: 'en',
    preferredTimezone: 'Africa/Harare',

    // School Settings
    systemEmail: '',
    phone: '',
    address: '',
    paypalEmail: '',
    systemCurrency: 'USD',
    runningSession: '',
    weekends: ['Saturday', 'Sunday'],
    currentTerm: '',
    nextTermBegin: '',
    language: 'en',
    timezone: 'UTC',
    tawktoPropertyId: '',
    theme: 'Blue',
    textAlignment: 'Left-to-right',
    themeColour: 'All white',
    enableParentMarketplace: false,
    deletePaymentHistoryWithPartial: false,
    facebook: '',
    twitter: '',
    youtube: '',
    instagram: '',
    reportCardTemplate: 'Report card three',
    allowTeacherEnterScores: false,
    scoreClosingDate: '',
    allowStudentCheckResult: false,
    allowParentPrintReport: false,
    reportCommentSignature: 'CLASS TEACHER',
    showSubjectPosition: false,
    idleTime: 0,
    idleTimeCountdown: 0,
    favicon: '',

    // Extended Currency & Ledger Synchronization Settings
    baseCurrency: 'USD',
    baseCurrencySymbol: '$',
    altCurrency: 'ZWG',
    altCurrencySymbol: 'ZWG',
    exchangeRate: 27.50,
    autoPostToLedger: true,
    defaultIncomeAccountId: '',
    defaultReceivableAccountId: '',
    defaultBankAccountId: '',
    defaultCashAccountId: '',
    defaultExpenseAccountId: '',

    mandatoryReceipts: true,
    showBalanceOnReceipts: true,
    showUniformsModule: true,
    smtpEmail: '',
    smtpHost: '',
    smtpPort: 465,
    smtpPassword: '',
    smtpSsl: true,
    systemUrl: '',
    whatsappApiUrl: '',
    whatsappAccessToken: '',
    countryPhoneCode: '263',
    mapLocation: '',
    mapLatitude: '',
    mapLongitude: ''
  });

  const [librarySettings, setLibrarySettings] = useState<any>({
    defaultLoanPeriodDays: 14,
    studentDailyFine: 0.50,
    studentMaxFine: 20.00,
    staffDailyFine: 1.00,
    staffMaxFine: 30.00,
    accrueOnWeekends: false,
    studentMaxLoans: 3,
    staffMaxLoans: 5,
    maxCopiesSameTitle: 1,
    blockThresholdFine: 10.00
  });

  const role = user?.role || '';
  const isSuperAdmin = role === 'SUPER_ADMIN';
  const isSchoolAdmin = role === 'SCHOOL_ADMIN' || isSuperAdmin;
  const isBursar = role === 'BURSAR';
  const isTeacher = role === 'TEACHER';
  const isLibrarian = role === 'LIBRARIAN' || user?.secondaryRoles?.some((r: string) => r.toUpperCase() === 'LIBRARIAN');
  const isClinic = role === 'CLINIC';
  const isPersonalOnly = ['STUDENT', 'PARENT', 'ANCILLARY', 'ALUMNI'].includes(role) && !isLibrarian;

  // Teacher Operational Preferences state
  const [teacherSettings, setTeacherSettings] = useState(() => {
    try {
      const saved = localStorage.getItem('teacher_operational_settings');
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return {
      defaultGradingScale: 'Standard (A-F)',
      scoreReminderDaysBefore: 3,
      timetableDefaultView: 'week',
      showClassRoomOnTimetable: true,
      reportSignatureRole: 'CLASS TEACHER'
    };
  });

  // Clinic Operational Settings state
  const [clinicSettings, setClinicSettings] = useState(() => {
    try {
      const saved = localStorage.getItem('clinic_operational_settings');
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return {
      appointmentSlotIntervalMinutes: 20,
      emergencyAlertSMS: true,
      defaultTriageScale: 'Standard 4-Tier (Emergency, Urgent, Priority, Routine)',
      enableAllergyWarningPopup: true,
      requireParentConsentUnder16: true
    };
  });

  useEffect(() => {
    fetchSettings();
    if (isSchoolAdmin || isBursar) {
      fetchCoa();
    }
  }, []);

  const fetchCoa = async () => {
    try {
      const { data } = await api.get('/api/accounts/coa');
      if (Array.isArray(data)) {
        setCoaAccounts(data);
      }
    } catch (err) {
      console.warn('Could not load Chart of Accounts for settings synchronization', err);
    }
  };

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const { data } = await api.get('/api/schools/settings');
      if (data) {
        const formattedData = { ...data };
        if (formattedData.nextTermBegin) {
          formattedData.nextTermBegin = formattedData.nextTermBegin.split('T')[0];
        }
        if (formattedData.scoreClosingDate) {
          formattedData.scoreClosingDate = formattedData.scoreClosingDate.split('T')[0];
        }
        const localPrefs = localStorage.getItem('personal_prefs');
        const prefs = localPrefs ? JSON.parse(localPrefs) : {};

        setSettings((prev: any) => ({ ...prev, ...formattedData, ...prefs }));
      }

      if (isSchoolAdmin || isBursar || isLibrarian) {
        try {
          const libRes = await api.get('/api/library/settings');
          if (libRes.data) {
            setLibrarySettings((prev: any) => ({ ...prev, ...libRes.data }));
          }
        } catch (libErr) {
          console.warn('Could not load library settings', libErr);
        }
      }
    } catch (err) {
      console.error('Failed to fetch settings:', err);
      showToast('Failed to load settings from server', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setSaving(true);
    try {
      // 1. Save personal preferences locally
      const personalPrefs = {
        emailAlerts: settings.emailAlerts,
        browserNotifications: settings.browserNotifications,
        weeklyDigest: settings.weeklyDigest,
        preferredLanguage: settings.preferredLanguage,
        preferredTimezone: settings.preferredTimezone
      };
      localStorage.setItem('personal_prefs', JSON.stringify(personalPrefs));

      // 2. Save teacher operational settings
      if (isTeacher || isSchoolAdmin) {
        localStorage.setItem('teacher_operational_settings', JSON.stringify(teacherSettings));
      }

      // 3. Save clinic operational settings
      if (isClinic || isSchoolAdmin) {
        localStorage.setItem('clinic_operational_settings', JSON.stringify(clinicSettings));
      }

      // 4. Save settings to DB if admin/bursar
      if (isSchoolAdmin || isBursar) {
        const payload: any = { ...settings };
        if (payload.nextTermBegin && payload.nextTermBegin.trim() !== '') {
          payload.nextTermBegin = new Date(payload.nextTermBegin).toISOString();
        } else {
          delete payload.nextTermBegin;
        }
        if (payload.scoreClosingDate && payload.scoreClosingDate.trim() !== '') {
          payload.scoreClosingDate = new Date(payload.scoreClosingDate).toISOString();
        } else {
          delete payload.scoreClosingDate;
        }

        if (payload.exchangeRate !== undefined) {
          payload.exchangeRate = parseFloat(payload.exchangeRate) || 1.0;
        }
        
        await api.patch('/api/schools/settings', payload);
      }

      // 5. Save library circulation settings if admin, bursar, or librarian
      if (isSchoolAdmin || isBursar || isLibrarian) {
        try {
          await api.patch('/api/library/settings', librarySettings);
        } catch (libErr) {
          console.warn('Failed to save library settings', libErr);
        }
      }

      await refreshUser();
      showToast('Settings saved successfully', 'success');
    } catch (err) {
      console.error(err);
      showToast('Failed to save settings configurations', 'error');
    } finally {
      setSaving(false);
    }
  };

  const updateSetting = (key: string, value: any) => {
    setSettings((prev: any) => ({ ...prev, [key]: value }));
  };

  const scrollToSection = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  // Filter COA accounts by type for intuitive categorization
  const revenueAccounts = coaAccounts.filter(a => a.type === 'REVENUE' || a.type === 'INCOME');
  const assetAccounts = coaAccounts.filter(a => a.type === 'ASSET');
  const bankAccounts = coaAccounts.filter(a => a.type === 'ASSET' && (/bank|operating|account/i.test(a.name) || a.code.startsWith('11')));
  const cashAccounts = coaAccounts.filter(a => a.type === 'ASSET' && (/cash|petty|drawer|pos/i.test(a.name) || a.code === '1100' || a.code === '1120'));
  const receivableAccounts = coaAccounts.filter(a => a.type === 'ASSET' && (/receivable|debtor|student/i.test(a.name) || a.code.startsWith('12')));
  const expenseAccounts = coaAccounts.filter(a => a.type === 'EXPENSE' || a.type === 'COST_OF_GOODS_SOLD');

  if (loading) {
    return (
      <div className="portal-container" style={{ padding: '80px', textAlign: 'center' }}>
        <div className="portal-spinner" style={{ margin: '0 auto 20px' }}></div>
        <p style={{ fontWeight: 800, color: '#64748b' }}>Synchronizing institutional & accounting registry...</p>
      </div>
    );
  }

  return (
    <div className="portal-container" style={{ maxWidth: '1200px', margin: '0 auto' }}>
      {/* Super Admin Global Controls Banner */}
      {isSuperAdmin && (
        <div style={{
          background: 'linear-gradient(135deg, #1e1b4b 0%, #312e81 100%)',
          color: '#ffffff',
          padding: '24px',
          borderRadius: '16px',
          marginBottom: '28px',
          boxShadow: '0 4px 16px rgba(49, 46, 129, 0.2)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '16px'
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
              <i className="fas fa-network-wired" style={{ fontSize: '1.4rem', color: '#a5b4fc' }}></i>
              <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 900, color: '#ffffff' }}>Platform Multi-Tenant Master Controls</h3>
            </div>
            <p style={{ margin: 0, color: '#c7d2fe', fontSize: '0.88rem' }}>
              You have global system authority. Manage tenant instances, inspect institutions, and review cross-tenant health metrics.
            </p>
          </div>
          <div style={{ display: 'flex', gap: '10px' }}>
            <a
              href="/admin/setup"
              style={{
                background: '#4f46e5',
                color: '#ffffff',
                padding: '10px 18px',
                borderRadius: '10px',
                textDecoration: 'none',
                fontWeight: 800,
                fontSize: '0.85rem',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                border: '1px solid rgba(255,255,255,0.2)'
              }}
            >
              <i className="fas fa-school"></i> Setup Wizard & Schools
            </a>
            <a
              href="/admin/audit"
              style={{
                background: 'rgba(255,255,255,0.1)',
                color: '#ffffff',
                padding: '10px 18px',
                borderRadius: '10px',
                textDecoration: 'none',
                fontWeight: 800,
                fontSize: '0.85rem',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                border: '1px solid rgba(255,255,255,0.2)'
              }}
            >
              <i className="fas fa-shield-alt"></i> Security Audit Logs
            </a>
          </div>
        </div>
      )}

      {/* Header Bar */}
      <div className="portal-page-header" style={{ marginBottom: '24px' }}>
        <div className="header-content">
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <h1>
              {isSuperAdmin && 'Platform & Multi-Tenant Global Controls'}
              {!isSuperAdmin && isSchoolAdmin && 'Institutional Preferences & Control Panel'}
              {isBursar && 'Financial & Accounting Settings'}
              {isTeacher && 'Teacher Operational Preferences'}
              {isLibrarian && 'Library Circulation & Policy Settings'}
              {isClinic && 'Clinical & Medical Operational Settings'}
              {isPersonalOnly && 'Personal Account & Notification Settings'}
            </h1>
            <span className="status-badge portal-status-badge-supplier" style={{ fontSize: '0.75rem', fontWeight: 800 }}>
              <i className="fas fa-shield-alt mr-1"></i> {role} Scoped
            </span>
          </div>
          <p>
            {isSuperAdmin && 'Global multi-tenant governance, system health oversight, and institutional configurations.'}
            {!isSuperAdmin && isSchoolAdmin && 'Unified administration of financial controls, chart of accounts, academics, public website, and system communication.'}
            {isBursar && 'Configure institutional billing currencies, ledger account mappings, and receipt formatting.'}
            {isTeacher && 'Configure your grading defaults, timetable preferences, and academic alert thresholds.'}
            {isLibrarian && 'Manage catalog circulation terms, borrowing limits, and overdue fine schedules.'}
            {isClinic && 'Configure clinic appointment schedules, triage priority rules, and emergency alert protocols.'}
            {isPersonalOnly && 'Manage your account security, notification alerts, and localized preferences.'}
          </p>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button 
            type="button"
            className="portal-btn-primary" 
            onClick={() => handleSave()} 
            disabled={saving}
            style={{ minWidth: '190px', fontWeight: 900, padding: '12px 28px', fontSize: '0.95rem' }}
          >
            {saving ? (
              <><i className="fas fa-spinner fa-spin mr-2"></i> Saving Settings...</>
            ) : (
              <><i className="fas fa-save mr-2"></i> Save Settings</>
            )}
          </button>
        </div>
      </div>

      {/* Sticky Quick-Navigation Anchor Bar (Replaces tabs with fast section navigation) */}
      <div style={{ 
        position: 'sticky', 
        top: '72px', 
        zIndex: 20, 
        backgroundColor: '#ffffff', 
        padding: '12px 16px', 
        borderRadius: '16px', 
        boxShadow: '0 4px 12px rgba(0,0,0,0.06)', 
        border: '1px solid #e2e8f0', 
        marginBottom: '32px',
        display: 'flex',
        flexWrap: 'wrap',
        gap: '8px',
        alignItems: 'center'
      }}>
        <span style={{ fontSize: '0.75rem', fontWeight: 900, color: '#94a3b8', textTransform: 'uppercase', marginRight: '8px' }}>
          Quick Jump:
        </span>
        {(isSchoolAdmin || isBursar) && (
          <button type="button" onClick={() => scrollToSection('sec-financial')} className="portal-btn-ghost" style={{ fontSize: '0.85rem', fontWeight: 800, padding: '8px 14px' }}>
            <i className="fas fa-balance-scale mr-2" style={{ color: '#2563eb' }}></i>Financial & Accounting
          </button>
        )}
        {isSchoolAdmin && (
          <button type="button" onClick={() => scrollToSection('sec-academics')} className="portal-btn-ghost" style={{ fontSize: '0.85rem', fontWeight: 800, padding: '8px 14px' }}>
            <i className="fas fa-graduation-cap mr-2" style={{ color: '#7c3aed' }}></i>Academics & Terms
          </button>
        )}
        {(isSchoolAdmin || isTeacher) && (
          <button type="button" onClick={() => scrollToSection('sec-teacher-ops')} className="portal-btn-ghost" style={{ fontSize: '0.85rem', fontWeight: 800, padding: '8px 14px' }}>
            <i className="fas fa-chalkboard-teacher mr-2" style={{ color: '#10b981' }}></i>Teacher Preferences
          </button>
        )}
        {(isSchoolAdmin || isLibrarian) && (
          <button type="button" onClick={() => scrollToSection('sec-library')} className="portal-btn-ghost" style={{ fontSize: '0.85rem', fontWeight: 800, padding: '8px 14px' }}>
            <i className="fas fa-book-reader mr-2" style={{ color: '#059669' }}></i>Library & Fines Policy
          </button>
        )}
        {(isSchoolAdmin || isClinic) && (
          <button type="button" onClick={() => scrollToSection('sec-clinic-ops')} className="portal-btn-ghost" style={{ fontSize: '0.85rem', fontWeight: 800, padding: '8px 14px' }}>
            <i className="fas fa-stethoscope mr-2" style={{ color: '#14b8a6' }}></i>Clinical Operations
          </button>
        )}
        {isSchoolAdmin && (
          <button type="button" onClick={() => scrollToSection('sec-map')} className="portal-btn-ghost" style={{ fontSize: '0.85rem', fontWeight: 800, padding: '8px 14px' }}>
            <i className="fas fa-map-marked-alt mr-2" style={{ color: '#d97706' }}></i>Campus Map Location
          </button>
        )}
        {isSchoolAdmin && (
          <button type="button" onClick={() => scrollToSection('sec-cms')} className="portal-btn-ghost" style={{ fontSize: '0.85rem', fontWeight: 800, padding: '8px 14px' }}>
            <i className="fas fa-globe mr-2" style={{ color: '#059669' }}></i>Website Public CMS
          </button>
        )}
        {isSchoolAdmin && (
          <button type="button" onClick={() => scrollToSection('sec-communication')} className="portal-btn-ghost" style={{ fontSize: '0.85rem', fontWeight: 800, padding: '8px 14px' }}>
            <i className="fas fa-paper-plane mr-2" style={{ color: '#ea580c' }}></i>Communication & Gateways
          </button>
        )}
        <button type="button" onClick={() => scrollToSection('sec-personal')} className="portal-btn-ghost" style={{ fontSize: '0.85rem', fontWeight: 800, padding: '8px 14px' }}>
          <i className="fas fa-user-cog mr-2" style={{ color: '#0284c7' }}></i>Personal Preferences
        </button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '36px' }}>

        {/* SECTION 1: FINANCIAL & GENERAL LEDGER ACCOUNTING SETTINGS */}
        {(isSchoolAdmin || isBursar) && (
          <div id="sec-financial" className="portal-card" style={{ padding: '32px', borderLeft: '4px solid #2563eb' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px', borderBottom: '1px solid #f1f5f9', paddingBottom: '16px' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#2563eb', fontSize: '1.2rem' }}>
                  <i className="fas fa-coins"></i>
                </div>
                <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 900, color: '#1e293b' }}>
                  Financial Management & Chart of Accounts Integration
                </h3>
              </div>
              <p style={{ margin: '6px 0 0 46px', color: '#64748b', fontSize: '0.9rem' }}>
                Synchronize institutional fee billing, revenue allocation, apparel sales, and expenses directly with the general ledger.
              </p>
            </div>
            <span className="status-badge portal-status-badge-supplier">
              {coaAccounts.length} CoA Accounts Available
            </span>
          </div>

          {/* Chart of Accounts Mapping Card */}
          <div style={{ background: '#f8fafc', padding: '24px', borderRadius: '16px', border: '1px solid #e2e8f0', marginBottom: '28px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
              <i className="fas fa-project-diagram" style={{ color: '#2563eb' }}></i>
              <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#1e293b' }}>
                Default General Ledger Accounts (Chart of Accounts Sync)
              </h4>
            </div>
            <p style={{ fontSize: '0.85rem', color: '#64748b', marginBottom: '20px' }}>
              Select the default balance sheet and income statement accounts that will automatically receive posted transactions from invoicing, student fee payments, uniform purchases, and supplier orders.
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '20px' }}>
              {/* Default Fee Income Account */}
              <div className="form-group">
                <label className="portal-label">
                  <i className="fas fa-file-invoice-dollar mr-1" style={{ color: '#059669' }}></i> Default Tuition & Fee Revenue Account
                </label>
                <select 
                  className="portal-input" 
                  value={settings.defaultIncomeAccountId || ''} 
                  onChange={e => updateSetting('defaultIncomeAccountId', e.target.value)}
                >
                  <option value="">-- Default (5000 / 5100 Tuition Fees Income) --</option>
                  {(revenueAccounts.length > 0 ? revenueAccounts : coaAccounts).map((acc: any) => (
                    <option key={acc.id} value={acc.id}>
                      {acc.code} — {acc.name} ({acc.type})
                    </option>
                  ))}
                </select>
                <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Receives credit entries when student invoices and fees are billed.</span>
              </div>

              {/* Default Student Debtors / AR */}
              <div className="form-group">
                <label className="portal-label">
                  <i className="fas fa-users mr-1" style={{ color: '#2563eb' }}></i> Default Student Debtors (Accounts Receivable)
                </label>
                <select 
                  className="portal-input" 
                  value={settings.defaultReceivableAccountId || ''} 
                  onChange={e => updateSetting('defaultReceivableAccountId', e.target.value)}
                >
                  <option value="">-- Default (1210 Student Accounts Receivable) --</option>
                  {(receivableAccounts.length > 0 ? receivableAccounts : assetAccounts).map((acc: any) => (
                    <option key={acc.id} value={acc.id}>
                      {acc.code} — {acc.name} ({acc.type})
                    </option>
                  ))}
                </select>
                <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Debited on invoice issuance; credited upon student fee settlement.</span>
              </div>

              {/* Default Operating Bank Account */}
              <div className="form-group">
                <label className="portal-label">
                  <i className="fas fa-university mr-1" style={{ color: '#4f46e5' }}></i> Primary Operating Bank Account
                </label>
                <select 
                  className="portal-input" 
                  value={settings.defaultBankAccountId || ''} 
                  onChange={e => updateSetting('defaultBankAccountId', e.target.value)}
                >
                  <option value="">-- Default (1110 Bank Account Main) --</option>
                  {(bankAccounts.length > 0 ? bankAccounts : assetAccounts).map((acc: any) => (
                    <option key={acc.id} value={acc.id}>
                      {acc.code} — {acc.name} ({acc.type})
                    </option>
                  ))}
                </select>
                <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Target for bank transfers, online gateway payments, and wire receipts.</span>
              </div>

              {/* Default Cash on Hand Account */}
              <div className="form-group">
                <label className="portal-label">
                  <i className="fas fa-wallet mr-1" style={{ color: '#d97706' }}></i> Cash on Hand / Till Account
                </label>
                <select 
                  className="portal-input" 
                  value={settings.defaultCashAccountId || ''} 
                  onChange={e => updateSetting('defaultCashAccountId', e.target.value)}
                >
                  <option value="">-- Default (1100 Cash on Hand / 1120 Petty Cash) --</option>
                  {(cashAccounts.length > 0 ? cashAccounts : assetAccounts).map((acc: any) => (
                    <option key={acc.id} value={acc.id}>
                      {acc.code} — {acc.name} ({acc.type})
                    </option>
                  ))}
                </select>
                <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Target for front-desk cash collections and over-the-counter sales.</span>
              </div>

              {/* Default Operating Expense Account */}
              <div className="form-group">
                <label className="portal-label">
                  <i className="fas fa-receipt mr-1" style={{ color: '#dc2626' }}></i> Default Operating Expense Account
                </label>
                <select 
                  className="portal-input" 
                  value={settings.defaultExpenseAccountId || ''} 
                  onChange={e => updateSetting('defaultExpenseAccountId', e.target.value)}
                >
                  <option value="">-- Default (7000 Operating Expenses / 6000 COGS) --</option>
                  {(expenseAccounts.length > 0 ? expenseAccounts : coaAccounts).map((acc: any) => (
                    <option key={acc.id} value={acc.id}>
                      {acc.code} — {acc.name} ({acc.type})
                    </option>
                  ))}
                </select>
                <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Default allocation account for general supplier vouchers and requisitions.</span>
              </div>

              {/* Auto-Post to Ledger Toggle */}
              <div className="form-group" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                <label className="portal-label">Automatic General Ledger Posting</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px', background: '#ffffff', padding: '12px 16px', borderRadius: '12px', border: '1px solid #cbd5e1' }}>
                  <label className="portal-switch">
                    <input 
                      type="checkbox" 
                      checked={settings.autoPostToLedger !== false} 
                      onChange={e => updateSetting('autoPostToLedger', e.target.checked)} 
                    />
                    <span className="portal-slider round"></span>
                  </label>
                  <div>
                    <div style={{ fontWeight: 800, fontSize: '0.9rem', color: '#1e293b' }}>
                      {settings.autoPostToLedger !== false ? 'Active (Real-Time Double-Entry)' : 'Manual Posting Only'}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                      Generates balanced DR/CR journals upon receipting and uniform sales.
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Multi-Currency & Financial Controls */}
          <h4 style={{ margin: '0 0 16px', fontSize: '0.95rem', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#1e293b', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <i className="fas fa-money-check-alt" style={{ color: '#2563eb' }}></i> Multi-Currency Architecture & FX Rates
          </h4>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '20px', marginBottom: '32px' }}>
            <div className="form-group">
              <label className="portal-label">Base Currency Code *</label>
              <select className="portal-input" value={settings.baseCurrency || 'USD'} onChange={e => updateSetting('baseCurrency', e.target.value)}>
                <option value="USD">USD - United States Dollar</option>
                <option value="ZWG">ZWG - Zimbabwe Gold</option>
                <option value="ZAR">ZAR - South African Rand</option>
              </select>
            </div>
            <div className="form-group">
              <label className="portal-label">Base Currency Symbol</label>
              <input type="text" className="portal-input" value={settings.baseCurrencySymbol || '$'} onChange={e => updateSetting('baseCurrencySymbol', e.target.value)} />
            </div>
            <div className="form-group">
              <label className="portal-label">Alternative Currency Code</label>
              <select className="portal-input" value={settings.altCurrency || 'ZWG'} onChange={e => updateSetting('altCurrency', e.target.value)}>
                <option value="ZWG">ZWG - Zimbabwe Gold</option>
                <option value="USD">USD - United States Dollar</option>
                <option value="ZAR">ZAR - South African Rand</option>
              </select>
            </div>
            <div className="form-group">
              <label className="portal-label">Alternative Currency Symbol</label>
              <input type="text" className="portal-input" value={settings.altCurrencySymbol || 'ZWG'} onChange={e => updateSetting('altCurrencySymbol', e.target.value)} />
            </div>
            <div className="form-group">
              <label className="portal-label">Official FX Exchange Rate (ZWG per 1 USD)</label>
              <input 
                type="number" 
                step="0.01" 
                className="portal-input" 
                value={settings.exchangeRate || 27.50} 
                onChange={e => updateSetting('exchangeRate', e.target.value)} 
              />
            </div>
            <div className="form-group">
              <label className="portal-label">Paypal Gateway Email</label>
              <input type="email" className="portal-input" value={settings.paypalEmail || ''} onChange={e => updateSetting('paypalEmail', e.target.value)} placeholder="finance@school.ac.zw" />
            </div>
          </div>

          <h4 style={{ margin: '0 0 16px', fontSize: '0.95rem', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#1e293b', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <i className="fas fa-shield-alt" style={{ color: '#2563eb' }}></i> Institutional Invoicing & Receipts Policy
          </h4>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '20px', marginBottom: '32px' }}>
            <div className="form-group">
              <label className="portal-label">Mandatory Receipt Numbers</label>
              <select className="portal-input" value={settings.mandatoryReceipts ? 'true' : 'false'} onChange={e => updateSetting('mandatoryReceipts', e.target.value === 'true')}>
                <option value="true">Yes (Strict Audit Mode)</option>
                <option value="false">No (Optional / Permissive)</option>
              </select>
            </div>
            <div className="form-group">
              <label className="portal-label">Show Balance on Receipts</label>
              <select className="portal-input" value={settings.showBalanceOnReceipts ? 'true' : 'false'} onChange={e => updateSetting('showBalanceOnReceipts', e.target.value === 'true')}>
                <option value="true">Yes (Print Current Arrears/Balance)</option>
                <option value="false">No (Hide Balance on Slip)</option>
              </select>
            </div>
            <div className="form-group">
              <label className="portal-label">Delete Invoice on Partial Refund</label>
              <select className="portal-input" value={settings.deletePaymentHistoryWithPartial ? 'Yes' : 'No'} onChange={e => updateSetting('deletePaymentHistoryWithPartial', e.target.value === 'Yes')}>
                <option value="No">No (Retain Audit Ledger)</option>
                <option value="Yes">Yes (Purge Invoice Record)</option>
              </select>
            </div>
            <div className="form-group">
              <label className="portal-label">Uniforms & Apparel Module</label>
              <select className="portal-input" value={settings.showUniformsModule ? 'true' : 'false'} onChange={e => updateSetting('showUniformsModule', e.target.value === 'true')}>
                <option value="true">Enabled (Procurement & Sales Active)</option>
                <option value="false">Disabled (Module Hidden)</option>
              </select>
            </div>
            <div className="form-group">
              <label className="portal-label">Parent Marketplace</label>
              <select className="portal-input" value={settings.enableParentMarketplace ? 'Yes' : 'No'} onChange={e => updateSetting('enableParentMarketplace', e.target.value === 'Yes')}>
                <option value="Yes">Enabled (Parent portal trade)</option>
                <option value="No">Disabled (Restricted)</option>
              </select>
            </div>
          </div>

          {/* Embedded Payroll Configuration */}
          <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '28px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
              <i className="fas fa-calculator" style={{ color: '#2563eb' }}></i>
              <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: 900, color: '#1e293b' }}>Institutional Payroll & Statutory Deductions</h4>
            </div>
            <PayrollSettingsPage isEmbedded={true} />
          </div>
        </div>
        )}

        {/* SECTION 2: ACADEMICS & TERM OPERATIONS */}
        {isSchoolAdmin && (
          <div id="sec-academics" className="portal-card" style={{ padding: '32px', borderLeft: '4px solid #7c3aed' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '24px', borderBottom: '1px solid #f1f5f9', paddingBottom: '16px' }}>
              <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: '#f5f3ff', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#7c3aed', fontSize: '1.2rem' }}>
                <i className="fas fa-graduation-cap"></i>
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 900, color: '#1e293b' }}>Academic Calendar & Examination Policies</h3>
                <p style={{ margin: 0, color: '#64748b', fontSize: '0.9rem' }}>Configure academic sessions, term milestones, and grading result access rules.</p>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '24px' }}>
              <div className="form-group">
                <label className="portal-label">Academic Running Session</label>
                <input type="text" className="portal-input" value={settings.runningSession || ''} onChange={e => updateSetting('runningSession', e.target.value)} placeholder="e.g. 2025-2026" />
              </div>
              <div className="form-group">
                <label className="portal-label">Current Active Term</label>
                <input type="text" className="portal-input" value={settings.currentTerm || ''} onChange={e => updateSetting('currentTerm', e.target.value)} placeholder="e.g. Term 1" />
              </div>
              <div className="form-group">
                <label className="portal-label">Next Term Resumption Date</label>
                <input type="date" className="portal-input" value={settings.nextTermBegin || ''} onChange={e => updateSetting('nextTermBegin', e.target.value)} />
              </div>
              <div className="form-group">
                <label className="portal-label">Report Card Template</label>
                <select className="portal-input" value={settings.reportCardTemplate || 'Report card three'} onChange={e => updateSetting('reportCardTemplate', e.target.value)}>
                  <option value="Report card one">Report Card Template 1 (Classic Standard)</option>
                  <option value="Report card two">Report Card Template 2 (Modern Grid)</option>
                  <option value="Report card three">Report Card Template 3 (Executive K12 / Cambridge)</option>
                </select>
              </div>
              <div className="form-group">
                <label className="portal-label">Report Comment Signature *</label>
                <select className="portal-input" value={settings.reportCommentSignature || 'CLASS TEACHER'} onChange={e => updateSetting('reportCommentSignature', e.target.value)}>
                  <option value="CLASS TEACHER">CLASS TEACHER</option>
                  <option value="PRINCIPAL">PRINCIPAL</option>
                  <option value="HEADMASTER">HEADMASTER</option>
                </select>
              </div>
              <div className="form-group">
                <label className="portal-label">Allow Teachers to Enter Student Scores?</label>
                <select className="portal-input" value={settings.allowTeacherEnterScores ? 'Yes' : 'No'} onChange={e => updateSetting('allowTeacherEnterScores', e.target.value === 'Yes')}>
                  <option value="Yes">Yes (Score entry open)</option>
                  <option value="No">No (Score entry locked)</option>
                </select>
              </div>
              <div className="form-group">
                <label className="portal-label">Score Entry Closing Date</label>
                <input type="date" className="portal-input" value={settings.scoreClosingDate || ''} onChange={e => updateSetting('scoreClosingDate', e.target.value)} />
              </div>
              <div className="form-group">
                <label className="portal-label">Allow Students to Check Current Result?</label>
                <select className="portal-input" value={settings.allowStudentCheckResult ? 'Yes' : 'No'} onChange={e => updateSetting('allowStudentCheckResult', e.target.value === 'Yes')}>
                  <option value="Yes">Yes</option>
                  <option value="No">No</option>
                </select>
              </div>
              <div className="form-group">
                <label className="portal-label">Allow Parents to Print Report Card?</label>
                <select className="portal-input" value={settings.allowParentPrintReport ? 'Yes' : 'No'} onChange={e => updateSetting('allowParentPrintReport', e.target.value === 'Yes')}>
                  <option value="Yes">Yes</option>
                  <option value="No">No</option>
                </select>
              </div>
            </div>
          </div>
        )}

        {/* SECTION: TEACHER OPERATIONAL PREFERENCES */}
        {(isSchoolAdmin || isTeacher) && (
          <div id="sec-teacher-ops" className="portal-card" style={{ padding: '32px', borderLeft: '4px solid #10b981' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '24px', borderBottom: '1px solid #f1f5f9', paddingBottom: '16px' }}>
              <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: '#ecfdf5', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#10b981', fontSize: '1.2rem' }}>
                <i className="fas fa-chalkboard-teacher"></i>
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 900, color: '#1e293b' }}>Teacher Operational Preferences & Grade Entry</h3>
                <p style={{ margin: 0, color: '#64748b', fontSize: '0.9rem' }}>Configure timetable views, default grading scales, and report card signature conventions.</p>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '24px' }}>
              <div className="form-group">
                <label className="portal-label">Default Grading Scale</label>
                <select 
                  className="portal-input" 
                  value={teacherSettings.defaultGradingScale} 
                  onChange={e => setTeacherSettings({ ...teacherSettings, defaultGradingScale: e.target.value })}
                >
                  <option value="Standard (A-F)">Standard (A-F letter grading)</option>
                  <option value="Cambridge (A*, A, B, C, D, E, U)">Cambridge (A*, A, B, C, D, E, U)</option>
                  <option value="100-Point Percentage">100-Point Percentage (0-100%)</option>
                  <option value="Competency-Based (1-4)">Competency-Based (1-4 Scale)</option>
                </select>
                <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Default scheme pre-selected when creating new gradebooks.</span>
              </div>

              <div className="form-group">
                <label className="portal-label">Score Deadline Reminder Alert</label>
                <select 
                  className="portal-input" 
                  value={teacherSettings.scoreReminderDaysBefore} 
                  onChange={e => setTeacherSettings({ ...teacherSettings, scoreReminderDaysBefore: parseInt(e.target.value, 10) })}
                >
                  <option value={1}>1 Day before cutoff</option>
                  <option value={3}>3 Days before cutoff</option>
                  <option value={5}>5 Days before cutoff</option>
                  <option value={7}>7 Days before cutoff</option>
                </select>
                <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Automatic notification alert before mark submission closes.</span>
              </div>

              <div className="form-group">
                <label className="portal-label">Timetable Default Display</label>
                <select 
                  className="portal-input" 
                  value={teacherSettings.timetableDefaultView} 
                  onChange={e => setTeacherSettings({ ...teacherSettings, timetableDefaultView: e.target.value })}
                >
                  <option value="week">Weekly Timetable Grid</option>
                  <option value="day">Today's Daily Schedule</option>
                </select>
                <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Default presentation mode when loading the timetable.</span>
              </div>

              <div className="form-group">
                <label className="portal-label">Report Card Signature Title</label>
                <select 
                  className="portal-input" 
                  value={teacherSettings.reportSignatureRole} 
                  onChange={e => setTeacherSettings({ ...teacherSettings, reportSignatureRole: e.target.value })}
                >
                  <option value="CLASS TEACHER">Class Teacher</option>
                  <option value="SUBJECT TEACHER">Subject Teacher</option>
                  <option value="HEAD OF DEPARTMENT">Head of Department (HOD)</option>
                  <option value="FORM TUTOR">Form Tutor</option>
                </select>
                <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Designation printed below your comments on terminal reports.</span>
              </div>

              <div className="form-group" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                <label className="portal-label">Display Classroom Room on Timetable</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px', background: '#f8fafc', padding: '12px 16px', borderRadius: '12px', border: '1px solid #cbd5e1' }}>
                  <label className="portal-switch">
                    <input 
                      type="checkbox" 
                      checked={teacherSettings.showClassRoomOnTimetable} 
                      onChange={e => setTeacherSettings({ ...teacherSettings, showClassRoomOnTimetable: e.target.checked })} 
                    />
                    <span className="portal-slider round"></span>
                  </label>
                  <div>
                    <div style={{ fontWeight: 800, fontSize: '0.9rem', color: '#1e293b' }}>
                      {teacherSettings.showClassRoomOnTimetable ? 'Visible' : 'Hidden'}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Show assigned physical room number in timetable blocks.</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* SECTION: LIBRARY & CIRCULATION RULES */}
        {(isSchoolAdmin || isLibrarian) && (
          <div id="sec-library" className="portal-card" style={{ padding: '32px', borderLeft: '4px solid #059669' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '24px', borderBottom: '1px solid #f1f5f9', paddingBottom: '16px' }}>
              <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: '#ecfdf5', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#059669', fontSize: '1.2rem' }}>
                <i className="fas fa-book-reader"></i>
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 900, color: '#1e293b' }}>Library Circulation & Fine Policies</h3>
                <p style={{ margin: 0, color: '#64748b', fontSize: '0.9rem' }}>Configure borrowing limits, daily overdue fines, caps, weekend fine accruals, and checkout block thresholds.</p>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '24px' }}>
              <div className="form-group">
                <label className="portal-label">Default Loan Period (Days)</label>
                <input 
                  type="number" 
                  min="1" 
                  className="portal-input" 
                  value={librarySettings.defaultLoanPeriodDays ?? 14} 
                  onChange={e => setLibrarySettings({ ...librarySettings, defaultLoanPeriodDays: parseInt(e.target.value) || 14 })} 
                />
                <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Standard checkout duration for students and faculty.</span>
              </div>

              <div className="form-group">
                <label className="portal-label">Student Daily Overdue Fine ($/day)</label>
                <input 
                  type="number" 
                  step="0.05" 
                  min="0" 
                  className="portal-input" 
                  value={librarySettings.studentDailyFine ?? 0.50} 
                  onChange={e => setLibrarySettings({ ...librarySettings, studentDailyFine: parseFloat(e.target.value) || 0 })} 
                />
                <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Default: $0.50 per day past the due date.</span>
              </div>

              <div className="form-group">
                <label className="portal-label">Student Maximum Fine Cap ($)</label>
                <input 
                  type="number" 
                  step="1" 
                  min="0" 
                  className="portal-input" 
                  value={librarySettings.studentMaxFine ?? 20.00} 
                  onChange={e => setLibrarySettings({ ...librarySettings, studentMaxFine: parseFloat(e.target.value) || 0 })} 
                />
                <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Max fine per book (Default: $20.00 cap).</span>
              </div>

              <div className="form-group">
                <label className="portal-label">Staff Daily Overdue Fine ($/day)</label>
                <input 
                  type="number" 
                  step="0.05" 
                  min="0" 
                  className="portal-input" 
                  value={librarySettings.staffDailyFine ?? 1.00} 
                  onChange={e => setLibrarySettings({ ...librarySettings, staffDailyFine: parseFloat(e.target.value) || 0 })} 
                />
                <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Default: $1.00 per day past the due date.</span>
              </div>

              <div className="form-group">
                <label className="portal-label">Staff Maximum Fine Cap ($)</label>
                <input 
                  type="number" 
                  step="1" 
                  min="0" 
                  className="portal-input" 
                  value={librarySettings.staffMaxFine ?? 30.00} 
                  onChange={e => setLibrarySettings({ ...librarySettings, staffMaxFine: parseFloat(e.target.value) || 0 })} 
                />
                <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Max fine per book for staff (Default: $30.00 cap).</span>
              </div>

              <div className="form-group">
                <label className="portal-label">Accrue Fines on Weekends?</label>
                <select 
                  className="portal-input" 
                  value={librarySettings.accrueOnWeekends ? 'true' : 'false'} 
                  onChange={e => setLibrarySettings({ ...librarySettings, accrueOnWeekends: e.target.value === 'true' })}
                >
                  <option value="false">No (Exclude Saturdays & Sundays)</option>
                  <option value="true">Yes (Accrue on All Calendar Days)</option>
                </select>
                <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Toggle whether overdue calculations skip non-school days.</span>
              </div>

              <div className="form-group">
                <label className="portal-label">Student Max Simultaneous Loans</label>
                <input 
                  type="number" 
                  min="1" 
                  className="portal-input" 
                  value={librarySettings.studentMaxLoans ?? 3} 
                  onChange={e => setLibrarySettings({ ...librarySettings, studentMaxLoans: parseInt(e.target.value) || 3 })} 
                />
                <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Maximum volumes a student can hold at one time.</span>
              </div>

              <div className="form-group">
                <label className="portal-label">Staff Max Simultaneous Loans</label>
                <input 
                  type="number" 
                  min="1" 
                  className="portal-input" 
                  value={librarySettings.staffMaxLoans ?? 5} 
                  onChange={e => setLibrarySettings({ ...librarySettings, staffMaxLoans: parseInt(e.target.value) || 5 })} 
                />
                <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Maximum volumes faculty can hold at one time.</span>
              </div>

              <div className="form-group">
                <label className="portal-label">Max Copies of Same Title</label>
                <input 
                  type="number" 
                  min="1" 
                  className="portal-input" 
                  value={librarySettings.maxCopiesSameTitle ?? 1} 
                  onChange={e => setLibrarySettings({ ...librarySettings, maxCopiesSameTitle: parseInt(e.target.value) || 1 })} 
                />
                <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Prevents single patron hoarding identical textbooks.</span>
              </div>

              <div className="form-group">
                <label className="portal-label">Borrowing Block Threshold ($)</label>
                <input 
                  type="number" 
                  step="0.5" 
                  min="0" 
                  className="portal-input" 
                  value={librarySettings.blockThresholdFine ?? 10.00} 
                  onChange={e => setLibrarySettings({ ...librarySettings, blockThresholdFine: parseFloat(e.target.value) || 10 })} 
                />
                <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Automatic checkout lock if unpaid fines reach this level.</span>
              </div>
            </div>
          </div>
        )}

        {/* SECTION: CLINIC MEDICAL OPERATIONAL SETTINGS */}
        {(isSchoolAdmin || isClinic) && (
          <div id="sec-clinic-ops" className="portal-card" style={{ padding: '32px', borderLeft: '4px solid #14b8a6' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '24px', borderBottom: '1px solid #f1f5f9', paddingBottom: '16px' }}>
              <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: '#f0fdfa', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#14b8a6', fontSize: '1.2rem' }}>
                <i className="fas fa-stethoscope"></i>
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 900, color: '#1e293b' }}>Clinic & Medical Operational Settings</h3>
                <p style={{ margin: 0, color: '#64748b', fontSize: '0.9rem' }}>Configure appointment slot intervals, triage severity scales, and allergy dispensing warnings.</p>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '24px' }}>
              <div className="form-group">
                <label className="portal-label">Appointment Slot Duration</label>
                <select 
                  className="portal-input" 
                  value={clinicSettings.appointmentSlotIntervalMinutes} 
                  onChange={e => setClinicSettings({ ...clinicSettings, appointmentSlotIntervalMinutes: parseInt(e.target.value, 10) })}
                >
                  <option value={15}>15 Minutes</option>
                  <option value={20}>20 Minutes (Standard)</option>
                  <option value={30}>30 Minutes</option>
                  <option value={45}>45 Minutes</option>
                  <option value={60}>60 Minutes</option>
                </select>
                <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Interval used when booking medical visits and checkups.</span>
              </div>

              <div className="form-group">
                <label className="portal-label">Default Triage Severity Scale</label>
                <select 
                  className="portal-input" 
                  value={clinicSettings.defaultTriageScale} 
                  onChange={e => setClinicSettings({ ...clinicSettings, defaultTriageScale: e.target.value })}
                >
                  <option value="Standard 4-Tier (Emergency, Urgent, Priority, Routine)">Standard 4-Tier (Red/Yellow/Green/Blue)</option>
                  <option value="Manchester Triage System (5-Scale)">Manchester Triage System (5-Level)</option>
                  <option value="Simple Binary (Urgent / Routine)">Simple Binary (Urgent / Routine)</option>
                </select>
                <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Priority categorization framework used in the triage queue.</span>
              </div>

              <div className="form-group" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                <label className="portal-label">Emergency SMS & Push Alert Protocol</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px', background: '#f8fafc', padding: '12px 16px', borderRadius: '12px', border: '1px solid #cbd5e1' }}>
                  <label className="portal-switch">
                    <input 
                      type="checkbox" 
                      checked={clinicSettings.emergencyAlertSMS} 
                      onChange={e => setClinicSettings({ ...clinicSettings, emergencyAlertSMS: e.target.checked })} 
                    />
                    <span className="portal-slider round"></span>
                  </label>
                  <div>
                    <div style={{ fontWeight: 800, fontSize: '0.9rem', color: '#1e293b' }}>
                      {clinicSettings.emergencyAlertSMS ? 'Enabled (Instant Dispatch)' : 'Disabled'}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Dispatch alerts to headmaster and parent on Emergency triage.</div>
                  </div>
                </div>
              </div>

              <div className="form-group" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                <label className="portal-label">Pharmacy Allergy Warning Popups</label>
                <div style={{ display: 'center', alignItems: 'center', gap: '16px', background: '#f8fafc', padding: '12px 16px', borderRadius: '12px', border: '1px solid #cbd5e1' }}>
                  <label className="portal-switch">
                    <input 
                      type="checkbox" 
                      checked={clinicSettings.enableAllergyWarningPopup} 
                      onChange={e => setClinicSettings({ ...clinicSettings, enableAllergyWarningPopup: e.target.checked })} 
                    />
                    <span className="portal-slider round"></span>
                  </label>
                  <div>
                    <div style={{ fontWeight: 800, fontSize: '0.9rem', color: '#1e293b' }}>
                      {clinicSettings.enableAllergyWarningPopup ? 'Active (Strict Safety)' : 'Inactive'}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Warn nurse if dispensing medication with documented patient contraindications.</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* SECTION 3: PUBLIC WEBSITE & CMS PREFERENCES */}
        {isSchoolAdmin && (
          <div id="sec-cms" className="portal-card" style={{ padding: '32px', borderLeft: '4px solid #059669' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px', borderBottom: '1px solid #f1f5f9', paddingBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: '#ecfdf5', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#059669', fontSize: '1.2rem' }}>
                  <i className="fas fa-globe"></i>
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 900, color: '#1e293b' }}>Website & Public Portal CMS</h3>
                  <p style={{ margin: 0, color: '#64748b', fontSize: '0.9rem' }}>Manage public website banners, about statements, admissions, news feed, and gallery showcase.</p>
                </div>
              </div>

              {/* Sub-selector pills for CMS sections without leaving the page */}
              <div style={{ display: 'flex', gap: '6px', background: '#f1f5f9', padding: '4px', borderRadius: '12px' }}>
                {[
                  { id: 'banner', label: 'Banners' },
                  { id: 'about', label: 'About Us' },
                  { id: 'inquiry', label: 'Inquiries' },
                  { id: 'news', label: 'News' },
                  { id: 'gallery', label: 'Galleries' },
                  { id: 'noticeboard', label: 'Noticeboard' }
                ].map((item: any) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setActiveCmsSection(item.id)}
                    style={{
                      padding: '6px 14px',
                      borderRadius: '8px',
                      border: 'none',
                      fontWeight: 800,
                      fontSize: '0.8rem',
                      cursor: 'pointer',
                      background: activeCmsSection === item.id ? '#ffffff' : 'transparent',
                      color: activeCmsSection === item.id ? '#059669' : '#64748b',
                      boxShadow: activeCmsSection === item.id ? '0 2px 6px rgba(0,0,0,0.08)' : 'none'
                    }}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ minHeight: '280px' }}>
              {activeCmsSection === 'banner' && <BannerSettings />}
              {activeCmsSection === 'about' && <AboutSettings />}
              {activeCmsSection === 'inquiry' && <InquirySettings />}
              {activeCmsSection === 'news' && <NewsSettings />}
              {activeCmsSection === 'gallery' && <GallerySettings />}
              {activeCmsSection === 'noticeboard' && <NoticeboardSettings />}
            </div>
          </div>
        )}

        {/* SECTION: CAMPUS LOCATION & MAP COORDINATES */}
        {isSchoolAdmin && (
          <div id="sec-map" className="portal-card" style={{ padding: '32px', borderLeft: '4px solid #d97706' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '24px', borderBottom: '1px solid #f1f5f9', paddingBottom: '16px' }}>
              <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: '#fffbeb', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#d97706', fontSize: '1.2rem' }}>
                <i className="fas fa-map-marked-alt"></i>
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 900, color: '#1e293b' }}>Campus Geographical Location & Map Marker</h3>
                <p style={{ margin: 0, color: '#64748b', fontSize: '0.9rem' }}>Configure school campus address, geographical coordinates, and interactive marker for the public Contact Us page.</p>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '24px' }}>
              <div className="form-group" style={{ gridColumn: 'span 2' }}>
                <label className="portal-label">Physical Campus / Map Address</label>
                <input 
                  type="text" 
                  className="portal-input" 
                  placeholder="e.g. 120 Leopold Takawira St, Harare, Zimbabwe"
                  value={settings.mapLocation || ''} 
                  onChange={e => updateSetting('mapLocation', e.target.value)} 
                />
                <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Display address and Google Maps geocode query.</span>
              </div>

              <div className="form-group">
                <label className="portal-label">Map Latitude</label>
                <input 
                  type="number" 
                  step="0.000001" 
                  className="portal-input" 
                  placeholder="e.g. -17.829220"
                  value={settings.mapLatitude ?? ''} 
                  onChange={e => updateSetting('mapLatitude', e.target.value)} 
                />
                <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Decimal coordinate (-90 to +90).</span>
              </div>

              <div className="form-group">
                <label className="portal-label">Map Longitude</label>
                <input 
                  type="number" 
                  step="0.000001" 
                  className="portal-input" 
                  placeholder="e.g. 31.052220"
                  value={settings.mapLongitude ?? ''} 
                  onChange={e => updateSetting('mapLongitude', e.target.value)} 
                />
                <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Decimal coordinate (-180 to +180).</span>
              </div>
            </div>
          </div>
        )}

        {/* SECTION 4: COMMUNICATION & INTEGRATION GATEWAYS */}
        {isSchoolAdmin && (
          <div id="sec-communication" className="portal-card" style={{ padding: '32px', borderLeft: '4px solid #ea580c' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '24px', borderBottom: '1px solid #f1f5f9', paddingBottom: '16px' }}>
              <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: '#fff7ed', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ea580c', fontSize: '1.2rem' }}>
                <i className="fas fa-paper-plane"></i>
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 900, color: '#1e293b' }}>Communication Channels & API Integrations</h3>
                <p style={{ margin: 0, color: '#64748b', fontSize: '0.9rem' }}>Configure institutional SMTP mail relay, WhatsApp Business Cloud API, and live web support.</p>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '24px' }}>
              <div className="form-group">
                <label className="portal-label">Sender Email Address</label>
                <input className="portal-input" type="email" value={settings.smtpEmail || ''} onChange={e => updateSetting('smtpEmail', e.target.value)} placeholder="notifications@school.ac.zw" />
              </div>
              <div className="form-group">
                <label className="portal-label">SMTP Host</label>
                <input className="portal-input" type="text" value={settings.smtpHost || ''} onChange={e => updateSetting('smtpHost', e.target.value)} placeholder="mail.institution.com" />
              </div>
              <div className="form-group">
                <label className="portal-label">SMTP Port</label>
                <input className="portal-input" type="number" value={settings.smtpPort || 465} onChange={e => updateSetting('smtpPort', parseInt(e.target.value))} />
              </div>
              <div className="form-group">
                <label className="portal-label">SMTP Password</label>
                <input className="portal-input" type="password" value={settings.smtpPassword || ''} onChange={e => updateSetting('smtpPassword', e.target.value)} placeholder="••••••••" />
              </div>
              <div className="form-group">
                <label className="portal-label">SMTP Protocol</label>
                <select className="portal-input" value={settings.smtpSsl ? 'true' : 'false'} onChange={e => updateSetting('smtpSsl', e.target.value === 'true')}>
                  <option value="true">SSL/TLS (Encrypted Port 465)</option>
                  <option value="false">Plain / STARTTLS (Port 587)</option>
                </select>
              </div>
              <div className="form-group">
                <label className="portal-label">Default Country Phone Code</label>
                <select className="portal-input" value={settings.countryPhoneCode || '263'} onChange={e => updateSetting('countryPhoneCode', e.target.value)}>
                  <option value="263">+263 (Zimbabwe)</option>
                  <option value="27">+27 (South Africa)</option>
                  <option value="260">+260 (Zambia)</option>
                </select>
              </div>
              <div className="form-group" style={{ gridColumn: 'span 2' }}>
                <label className="portal-label">WhatsApp Cloud API Endpoint</label>
                <input className="portal-input" type="url" value={settings.whatsappApiUrl || ''} onChange={e => updateSetting('whatsappApiUrl', e.target.value)} placeholder="https://graph.facebook.com/v18.0/..." />
              </div>
              <div className="form-group" style={{ gridColumn: 'span 2' }}>
                <label className="portal-label">WhatsApp Permanent Access Token</label>
                <input className="portal-input" type="password" value={settings.whatsappAccessToken || ''} onChange={e => updateSetting('whatsappAccessToken', e.target.value)} placeholder="EAA..." />
              </div>
              <div className="form-group">
                <label className="portal-label">Tawk.to Property ID</label>
                <input className="portal-input" type="text" value={settings.tawktoPropertyId || ''} onChange={e => updateSetting('tawktoPropertyId', e.target.value)} placeholder="tawk_property_id" />
              </div>
              <div className="form-group">
                <label className="portal-label">Canonical System URL</label>
                <input className="portal-input" type="url" value={settings.systemUrl || ''} onChange={e => updateSetting('systemUrl', e.target.value)} placeholder="https://portal.acadex.com" />
              </div>
            </div>
          </div>
        )}

        {/* SECTION 5: PERSONAL PREFERENCES */}
        <div id="sec-personal" className="portal-card" style={{ padding: '32px', borderLeft: '4px solid #0284c7' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '24px', borderBottom: '1px solid #f1f5f9', paddingBottom: '16px' }}>
            <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: '#f0f9ff', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#0284c7', fontSize: '1.2rem' }}>
              <i className="fas fa-user-cog"></i>
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 900, color: '#1e293b' }}>Personal Account Preferences</h3>
              <p style={{ margin: 0, color: '#64748b', fontSize: '0.9rem' }}>Manage your personalized notification thresholds, alerts, and display localization.</p>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '20px' }}>
            {[
              { key: 'emailAlerts', label: 'Email Alerts', desc: 'Receive real-time notifications for ledger, grade, and attendance events' },
              { key: 'browserNotifications', label: 'Browser Notifications', desc: 'Push desktop alerts for system events and incoming inquiries' },
              { key: 'weeklyDigest', label: 'Weekly Performance Digest', desc: 'Weekly analytical summary of school operations and collections' }
            ].map(pref => (
              <div key={pref.key} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px', background: '#f8fafc', borderRadius: '16px', border: '1px solid #f1f5f9' }}>
                <div>
                  <div style={{ fontWeight: 800, fontSize: '0.9rem', color: '#1e293b' }}>{pref.label}</div>
                  <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '2px' }}>{pref.desc}</div>
                </div>
                <label className="portal-switch">
                  <input type="checkbox" checked={!!settings[pref.key]} onChange={e => updateSetting(pref.key, e.target.checked)} />
                  <span className="portal-slider round"></span>
                </label>
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* Floating Save Bar at the bottom */}
      <div style={{
        marginTop: '32px',
        padding: '20px 28px',
        background: '#ffffff',
        borderRadius: '16px',
        border: '1px solid #e2e8f0',
        boxShadow: '0 4px 20px rgba(0,0,0,0.06)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <i className="fas fa-info-circle" style={{ color: '#2563eb', fontSize: '1.2rem' }}></i>
          <div>
            <div style={{ fontWeight: 800, color: '#1e293b', fontSize: '0.95rem' }}>All Configurations Ready to Save</div>
            <div style={{ fontSize: '0.8rem', color: '#64748b' }}>Changes to General Ledger accounts, currency exchange rates, and academic dates will take effect immediately.</div>
          </div>
        </div>
        <button 
          type="button"
          className="portal-btn-primary" 
          onClick={() => handleSave()} 
          disabled={saving}
          style={{ minWidth: '200px', fontWeight: 900, padding: '12px 28px', fontSize: '1rem' }}
        >
          {saving ? (
            <><i className="fas fa-spinner fa-spin mr-2"></i> Saving Settings...</>
          ) : (
            <><i className="fas fa-save mr-2"></i> Save All Settings</>
          )}
        </button>
      </div>

      <style>{`
        .portal-switch {
          position: relative;
          display: inline-block;
          width: 52px;
          height: 28px;
          flex-shrink: 0;
        }
        .portal-switch input {
          opacity: 0;
          width: 0;
          height: 0;
        }
        .portal-slider {
          position: absolute;
          cursor: pointer;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background-color: #e2e8f0;
          transition: .4s;
          border: 1px solid #cbd5e1;
        }
        .portal-slider:before {
          position: absolute;
          content: "";
          height: 20px;
          width: 20px;
          left: 3px;
          bottom: 3px;
          background-color: white;
          transition: .4s;
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        input:checked + .portal-slider {
          background-color: #2563eb;
          border-color: #1d4ed8;
        }
        input:checked + .portal-slider:before {
          transform: translateX(24px);
        }
        .portal-slider.round {
          border-radius: 34px;
        }
        .portal-slider.round:before {
          border-radius: 50%;
        }
      `}</style>
    </div>
  );
}
