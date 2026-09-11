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

export default function SettingsPage({ defaultTab }: SettingsPageProps) {
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
    countryPhoneCode: '263'
  });

  const isAdmin = user?.role === 'SCHOOL_ADMIN' || user?.role === 'SUPER_ADMIN';
  const isBursar = user?.role === 'BURSAR';
  const isHR = user?.role === 'HR';
  const isAncillary = user?.role === 'ANCILLARY';

  useEffect(() => {
    fetchSettings();
    if (isAdmin || isBursar) {
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

      // 2. Save settings to DB if admin/bursar/HR
      if (isAdmin || isBursar || isHR) {
        const payload = { ...settings };
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

      await refreshUser();
      showToast('Institutional & accounting settings saved successfully', 'success');
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
      {/* Header Bar */}
      <div className="portal-page-header" style={{ marginBottom: '24px' }}>
        <div className="header-content">
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <h1>Institutional Preferences & Control Panel</h1>
            <span className="status-badge portal-status-badge-supplier" style={{ fontSize: '0.75rem', fontWeight: 800 }}>
              <i className="fas fa-check-double mr-1"></i> Ledger Synchronized
            </span>
          </div>
          <p>Unified administration of financial controls, chart of accounts, academics, public website, and system communication.</p>
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
              <><i className="fas fa-save mr-2"></i> Save All Settings</>
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
        <button type="button" onClick={() => scrollToSection('sec-financial')} className="portal-btn-ghost" style={{ fontSize: '0.85rem', fontWeight: 800, padding: '8px 14px' }}>
          <i className="fas fa-balance-scale mr-2" style={{ color: '#2563eb' }}></i>Financial & Accounting
        </button>
        <button type="button" onClick={() => scrollToSection('sec-academics')} className="portal-btn-ghost" style={{ fontSize: '0.85rem', fontWeight: 800, padding: '8px 14px' }}>
          <i className="fas fa-graduation-cap mr-2" style={{ color: '#7c3aed' }}></i>Academics & Terms
        </button>
        {(isAdmin || isAncillary) && (
          <button type="button" onClick={() => scrollToSection('sec-cms')} className="portal-btn-ghost" style={{ fontSize: '0.85rem', fontWeight: 800, padding: '8px 14px' }}>
            <i className="fas fa-globe mr-2" style={{ color: '#059669' }}></i>Website Public CMS
          </button>
        )}
        {isAdmin && (
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

        {/* SECTION 2: ACADEMICS & TERM OPERATIONS */}
        {isAdmin && (
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

        {/* SECTION 3: PUBLIC WEBSITE & CMS PREFERENCES */}
        {(isAdmin || isAncillary) && (
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

        {/* SECTION 4: COMMUNICATION & INTEGRATION GATEWAYS */}
        {isAdmin && (
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
