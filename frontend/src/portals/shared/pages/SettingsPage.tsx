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
  defaultTab?: TabType;
}

export default function SettingsPage({ defaultTab }: SettingsPageProps) {
  const { user, refreshUser } = useAuth();
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState<TabType>('personal');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

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

    // Extended settings fields
    baseCurrency: 'USD',
    baseCurrencySymbol: '$',
    altCurrency: 'ZWG',
    altCurrencySymbol: 'ZWG',
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

  // Construct visible tabs based on RBAC roles
  const visibleTabs: { id: TabType; label: string; icon: string }[] = [];

  // Website Settings (CMS) are visible to Admins and Ancillary staff
  if (isAdmin || isAncillary) {
    visibleTabs.push(
      { id: 'banner', label: 'Banner Settings', icon: 'fas fa-image' },
      { id: 'about', label: 'About Us', icon: 'fas fa-address-card' },
      { id: 'inquiry', label: 'Web Inquiries', icon: 'fas fa-envelope-open-text' },
      { id: 'news', label: 'News Feed', icon: 'fas fa-newspaper' },
      { id: 'gallery', label: 'Galleries', icon: 'fas fa-images' },
      { id: 'noticeboard', label: 'Noticeboard', icon: 'fas fa-clipboard-list' }
    );
  }

  // Personal preferences visible to everyone
  visibleTabs.push({ id: 'personal', label: 'Personal Preferences', icon: 'fas fa-user-cog' });

  // Other system/financial settings
  if (isAdmin) {
    visibleTabs.push(
      { id: 'academics', label: 'Academic & Terms', icon: 'fas fa-graduation-cap' },
      { id: 'financial', label: 'Financial Settings', icon: 'fas fa-money-bill-wave' },
      { id: 'communication', label: 'Communication', icon: 'fas fa-envelope-open-text' }
    );
  } else {
    if (isBursar || isHR) {
      visibleTabs.push(
        { id: 'financial', label: 'Financial Settings', icon: 'fas fa-money-bill-wave' }
      );
    }
  }

  useEffect(() => {
    if (defaultTab && visibleTabs.some(t => t.id === defaultTab)) {
      setActiveTab(defaultTab);
    } else {
      const params = new URLSearchParams(window.location.search);
      const tabParam = params.get('tab') as TabType;
      if (tabParam && visibleTabs.some(t => t.id === tabParam)) {
        setActiveTab(tabParam);
      } else if (visibleTabs.length > 0) {
        setActiveTab(visibleTabs[0].id);
      }
    }
  }, [defaultTab, window.location.search, user]);

  useEffect(() => {
    fetchSettings();
  }, []);

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
        if (payload.nextTermBegin && payload.nextTermBegin.trim() !== '') payload.nextTermBegin = new Date(payload.nextTermBegin).toISOString();
        else delete payload.nextTermBegin;
        if (payload.scoreClosingDate && payload.scoreClosingDate.trim() !== '') payload.scoreClosingDate = new Date(payload.scoreClosingDate).toISOString();
        else delete payload.scoreClosingDate;
        
        await api.patch('/api/schools/settings', payload);
      }

      await refreshUser();
      showToast('Settings saved successfully', 'success');

      if (activeTab === 'personal') {
        setTimeout(() => {
          window.location.reload();
        }, 1000);
      }
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

  if (loading) {
    return (
      <div className="portal-container" style={{ padding: '80px', textAlign: 'center' }}>
        <div className="portal-spinner" style={{ margin: '0 auto 20px' }}></div>
        <p style={{ fontWeight: 800, color: '#64748b' }}>Synchronizing settings registry...</p>
      </div>
    );
  }

  return (
    <div className="portal-container">
      <div className="portal-page-header">
        <div className="header-content">
          <h1>System Control Panel</h1>
          <p>Configure personal preferences, institutional details, financial profiles, and portal settings.</p>
        </div>
        {['personal', 'academics', 'financial', 'communication'].includes(activeTab) && (
          <button 
            className="portal-btn-primary" 
            onClick={() => handleSave()} 
            disabled={saving}
            style={{ minWidth: '180px', fontWeight: 900, padding: '12px 28px' }}
          >
            {saving ? (
              <i className="fas fa-spinner fa-spin mr-2"></i>
            ) : (
              <i className="fas fa-save mr-2"></i>
            )}
            Save Changes
          </button>
        )}
      </div>

      <div className="portal-card" style={{ padding: '32px', overflow: 'hidden' }}>
        <div style={{ display: 'flex', gap: '32px', alignItems: 'flex-start', width: '100%' }}>
          {/* Left Navigation Sidebar */}
          <div style={{ width: '240px', display: 'flex', flexDirection: 'column', gap: '8px', flexShrink: 0, borderRight: '1px solid #f1f5f9', paddingRight: '24px' }}>
            <div style={{ fontSize: '0.75rem', fontWeight: 900, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px', paddingLeft: '12px' }}>
              System Settings
            </div>
            {visibleTabs.map(tab => (
              <button
                key={tab.id}
                type="button"
                className={`portal-btn-${activeTab === tab.id ? 'primary' : 'ghost'}`}
                onClick={() => setActiveTab(tab.id as TabType)}
                style={{ justifyContent: 'flex-start', padding: '12px 16px', fontWeight: 800, fontSize: '0.85rem', textAlign: 'left', width: '100%' }}
              >
                <i className={`${tab.icon} mr-2`} style={{ width: '18px' }}></i>
                {tab.label}
              </button>
            ))}
          </div>

          {/* Right Content Panel */}
          <div style={{ flex: 1, minWidth: '320px' }}>
            {activeTab === 'banner' && <BannerSettings />}
            {activeTab === 'about' && <AboutSettings />}
            {activeTab === 'inquiry' && <InquirySettings />}
            {activeTab === 'news' && <NewsSettings />}
            {activeTab === 'gallery' && <GallerySettings />}
            {activeTab === 'noticeboard' && <NoticeboardSettings />}

            {activeTab === 'personal' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '40px' }}>
                <div className="portal-grid-2">
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
                    <div>
                      <h4 style={{ margin: '0 0 24px', fontSize: '1rem', fontWeight: 900, color: '#1e293b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        <i className="fas fa-bell mr-2" style={{ color: '#2563eb' }}></i>Notification Preferences
                      </h4>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                        {[
                          { key: 'emailAlerts', label: 'Email Alerts', desc: 'Receive grade updates & financial notices' },
                          { key: 'browserNotifications', label: 'Browser Notifications', desc: 'Real-time alerts for system messages' },
                          { key: 'weeklyDigest', label: 'Weekly Digest', desc: 'Weekly summary of your academic/work stats' }
                        ].map((pref) => (
                          <div key={pref.key} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px', background: '#f8fafc', borderRadius: '16px', border: '1px solid #f1f5f9' }}>
                            <div>
                              <div style={{ fontWeight: 800, fontSize: '0.95rem', color: '#1e293b' }}>{pref.label}</div>
                              <div style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 600 }}>{pref.desc}</div>
                            </div>
                            <label className="portal-switch">
                              <input 
                                type="checkbox" 
                                checked={settings[pref.key]} 
                                onChange={(e) => updateSetting(pref.key, e.target.checked)}
                              />
                              <span className="portal-slider round"></span>
                            </label>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                  
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
                    <div>
                      <h4 style={{ margin: '0 0 24px', fontSize: '1rem', fontWeight: 900, color: '#1e293b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        <i className="fas fa-desktop mr-2" style={{ color: '#059669' }}></i>Display Settings
                      </h4>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                        <div className="form-group">
                          <label className="portal-label">Preferred Language</label>
                          <select 
                            className="portal-input" 
                            style={{ fontWeight: 700 }}
                            value={settings.preferredLanguage}
                            onChange={(e) => updateSetting('preferredLanguage', e.target.value)}
                          >
                            <option value="en">English</option>
                            <option value="fr">French</option>
                            <option value="es">Spanish</option>
                            <option value="nd">Ndebele</option>
                            <option value="sn">Shona</option>
                          </select>
                        </div>
                        <div className="form-group">
                          <label className="portal-label">Preferred Time Zone</label>
                          <select 
                            className="portal-input" 
                            style={{ fontWeight: 700 }}
                            value={settings.preferredTimezone}
                            onChange={(e) => updateSetting('preferredTimezone', e.target.value)}
                          >
                            <option value="Africa/Harare">Africa/Harare (CAT, UTC+2)</option>
                            <option value="Africa/Johannesburg">Africa/Johannesburg (SAST, UTC+2)</option>
                            <option value="UTC">UTC (Greenwich Mean Time)</option>
                          </select>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {isAdmin && (
                  <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '32px' }}>
                    <h4 style={{ margin: '0 0 24px', fontSize: '1.1rem', fontWeight: 900, color: '#1e293b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      <i className="fas fa-sliders-h mr-2" style={{ color: '#2563eb' }}></i>System Defaults (Global Settings)
                    </h4>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '24px' }}>
                      <div className="form-group">
                        <label className="portal-label">Session Idle Time limit (Seconds)</label>
                        <input type="number" className="portal-input" value={settings.idleTime || 0} onChange={e => updateSetting('idleTime', parseInt(e.target.value))} />
                      </div>
                      <div className="form-group">
                        <label className="portal-label">Idle Timeout Warning Count (Seconds)</label>
                        <input type="number" className="portal-input" value={settings.idleTimeCountdown || 0} onChange={e => updateSetting('idleTimeCountdown', parseInt(e.target.value))} />
                      </div>
                      <div className="form-group">
                        <label className="portal-label">Default Website Language</label>
                        <select 
                          className="portal-input" 
                          value={settings.language || 'en'} 
                          onChange={e => updateSetting('language', e.target.value)}
                        >
                          <option value="en">English</option>
                          <option value="fr">French</option>
                          <option value="es">Spanish</option>
                          <option value="nd">Ndebele</option>
                          <option value="sn">Shona</option>
                        </select>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'academics' && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '24px' }}>
                <div className="form-group">
                  <label className="portal-label">Running Session / Academic Year *</label>
                  <select className="portal-input" value={settings.runningSession || ''} onChange={e => updateSetting('runningSession', e.target.value)} required>
                    <option value="">Select Year</option>
                    {[
                      `${new Date().getFullYear() - 1}-${new Date().getFullYear()}`,
                      `${new Date().getFullYear()}-${new Date().getFullYear() + 1}`,
                      `${new Date().getFullYear() + 1}-${new Date().getFullYear() + 2}`,
                      `${new Date().getFullYear() + 2}-${new Date().getFullYear() + 3}`
                    ].map(y => (
                      <option key={y} value={y}>{y}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label className="portal-label">Current Academic Period *</label>
                  <select 
                    className="portal-input" 
                    value={settings.currentTerm || ''} 
                    onChange={e => updateSetting('currentTerm', e.target.value)} 
                    required
                  >
                    <option value="">Select Period</option>
                    {(() => {
                      const schoolType = (user?.schoolType || 'Secondary').toLowerCase();
                      const isTertiary = schoolType.includes('college') || schoolType.includes('colledge') ||
                        schoolType.includes('university') || schoolType.includes('varsity') ||
                        schoolType.includes('tertiary') || schoolType.includes('nursing') ||
                        schoolType.includes('medical') || schoolType.includes('poly') ||
                        schoolType.includes('seminary');
                      return isTertiary ? (
                        <>
                          <option value="Semester 1">Semester 1</option>
                          <option value="Semester 2">Semester 2</option>
                        </>
                      ) : (
                        <>
                          <option value="Term 1">Term 1</option>
                          <option value="Term 2">Term 2</option>
                          <option value="Term 3">Term 3</option>
                        </>
                      );
                    })()}
                  </select>
                </div>
                <div className="form-group">
                  <label className="portal-label">Next Period Begin Date *</label>
                  <input type="date" className="portal-input" value={settings.nextTermBegin || ''} onChange={e => updateSetting('nextTermBegin', e.target.value)} required />
                </div>
                <div className="form-group">
                  <label className="portal-label">Weekend Days (Comma separated)</label>
                  <input 
                    type="text" 
                    className="portal-input" 
                    value={Array.isArray(settings.weekends) ? settings.weekends.join(', ') : ''} 
                    onChange={e => updateSetting('weekends', e.target.value.split(',').map((s: string) => s.trim()))} 
                    placeholder="Saturday, Sunday" 
                  />
                </div>
                <div className="form-group">
                  <label className="portal-label">Report Comment Signature *</label>
                  <select className="portal-input" value={settings.reportCommentSignature || 'CLASS TEACHER'} onChange={e => updateSetting('reportCommentSignature', e.target.value)} required>
                    <option value="CLASS TEACHER">CLASS TEACHER</option>
                    <option value="PRINCIPAL">PRINCIPAL</option>
                    <option value="HEADMASTER">HEADMASTER</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="portal-label">Allow Teachers to Enter Student Scores?</label>
                  <select className="portal-input" value={settings.allowTeacherEnterScores ? 'Yes' : 'No'} onChange={e => updateSetting('allowTeacherEnterScores', e.target.value === 'Yes')}>
                    <option value="Yes">Yes</option>
                    <option value="No">No</option>
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
            )}

            {activeTab === 'financial' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '48px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '24px' }}>
                  <div className="form-group">
                    <label className="portal-label">System Currency *</label>
                    <input type="text" className="portal-input" value={settings.systemCurrency || 'USD'} onChange={e => updateSetting('systemCurrency', e.target.value)} required />
                  </div>
                  <div className="form-group">
                    <label className="portal-label">Base Currency Code</label>
                    <select className="portal-input" value={settings.baseCurrency} onChange={e => updateSetting('baseCurrency', e.target.value)}>
                      <option value="USD">USD</option>
                      <option value="ZWG">ZWG</option>
                      <option value="ZAR">ZAR</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="portal-label">Base Currency Symbol</label>
                    <input type="text" className="portal-input" value={settings.baseCurrencySymbol} onChange={e => updateSetting('baseCurrencySymbol', e.target.value)} />
                  </div>
                  <div className="form-group">
                    <label className="portal-label">Alternative Currency Code</label>
                    <select className="portal-input" value={settings.altCurrency} onChange={e => updateSetting('altCurrency', e.target.value)}>
                      <option value="ZWG">ZWG</option>
                      <option value="USD">USD</option>
                      <option value="ZAR">ZAR</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="portal-label">Alternative Currency Symbol</label>
                    <input type="text" className="portal-input" value={settings.altCurrencySymbol} onChange={e => updateSetting('altCurrencySymbol', e.target.value)} />
                  </div>
                  <div className="form-group">
                    <label className="portal-label">Paypal Gateway Email</label>
                    <input type="email" className="portal-input" value={settings.paypalEmail || ''} onChange={e => updateSetting('paypalEmail', e.target.value)} />
                  </div>
                  <div className="form-group">
                    <label className="portal-label">Mandatory Receipt Numbers</label>
                    <select className="portal-input" value={settings.mandatoryReceipts ? 'true' : 'false'} onChange={e => updateSetting('mandatoryReceipts', e.target.value === 'true')}>
                      <option value="true">Yes (Strict Mode)</option>
                      <option value="false">No (Optional)</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="portal-label">Show Balance on Receipts</label>
                    <select className="portal-input" value={settings.showBalanceOnReceipts ? 'true' : 'false'} onChange={e => updateSetting('showBalanceOnReceipts', e.target.value === 'true')}>
                      <option value="true">Yes</option>
                      <option value="false">No</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="portal-label">Delete Invoice on Partial Payments Refund?</label>
                    <select className="portal-input" value={settings.deletePaymentHistoryWithPartial ? 'Yes' : 'No'} onChange={e => updateSetting('deletePaymentHistoryWithPartial', e.target.value === 'Yes')}>
                      <option value="Yes">Yes</option>
                      <option value="No">No</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="portal-label">Enable Parent Marketplace</label>
                    <select className="portal-input" value={settings.enableParentMarketplace ? 'Yes' : 'No'} onChange={e => updateSetting('enableParentMarketplace', e.target.value === 'Yes')}>
                      <option value="Yes">Yes</option>
                      <option value="No">No</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="portal-label">Enable Uniforms Module</label>
                    <select className="portal-input" value={settings.showUniformsModule ? 'true' : 'false'} onChange={e => updateSetting('showUniformsModule', e.target.value === 'true')}>
                      <option value="true">Yes (Active)</option>
                      <option value="false">No (Hidden)</option>
                    </select>
                  </div>
                </div>

                <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: '40px' }}>
                  <PayrollSettingsPage isEmbedded={true} />
                </div>
              </div>
            )}

            {activeTab === 'communication' && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '32px' }}>
                <div style={{ gridColumn: '1 / -1' }}>
                  <h4 style={{ margin: '0 0 24px', fontSize: '0.95rem', fontWeight: 900, color: '#1e293b', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <i className="fas fa-paper-plane" style={{ color: '#2563eb' }}></i> Institutional SMTP Configuration
                  </h4>
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
                      <label className="portal-label">SMTP Security Protocol</label>
                      <select className="portal-input" value={settings.smtpSsl ? 'true' : 'false'} onChange={e => updateSetting('smtpSsl', e.target.value === 'true')}>
                        <option value="true">SSL/TLS (Encrypted)</option>
                        <option value="false">Plain (Unsecured)</option>
                      </select>
                    </div>
                  </div>
                </div>

                <div style={{ gridColumn: '1 / -1', marginTop: '16px' }}>
                  <h4 style={{ margin: '0 0 24px', fontSize: '0.95rem', fontWeight: 900, color: '#1e293b', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <i className="fab fa-whatsapp" style={{ color: '#059669' }}></i> Instant Messaging Gateway & Widgets
                  </h4>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '24px' }}>
                    <div className="form-group" style={{ gridColumn: 'span 2' }}>
                      <label className="portal-label">WhatsApp Cloud API Endpoint</label>
                      <input className="portal-input" type="url" value={settings.whatsappApiUrl || ''} onChange={e => updateSetting('whatsappApiUrl', e.target.value)} placeholder="https://graph.facebook.com/v1.0/..." />
                    </div>
                    <div className="form-group" style={{ gridColumn: 'span 2' }}>
                      <label className="portal-label">Permanent Access Token</label>
                      <input className="portal-input" type="password" value={settings.whatsappAccessToken || ''} onChange={e => updateSetting('whatsappAccessToken', e.target.value)} placeholder="EAA..." />
                    </div>
                    <div className="form-group">
                      <label className="portal-label">Default Country Phone Code</label>
                      <select className="portal-input" value={settings.countryPhoneCode || '263'} onChange={e => updateSetting('countryPhoneCode', e.target.value)}>
                        <option value="263">+263 (Zimbabwe)</option>
                        <option value="27">+27 (South Africa)</option>
                        <option value="260">+260 (Zambia)</option>
                      </select>
                    </div>
                    <div className="form-group">
                      <label className="portal-label">Tawk.to Property ID</label>
                      <input className="portal-input" type="text" value={settings.tawktoPropertyId || ''} onChange={e => updateSetting('tawktoPropertyId', e.target.value)} placeholder="tawk_property_id" />
                    </div>
                    <div className="form-group" style={{ gridColumn: 'span 2' }}>
                      <label className="portal-label">Canonical System URL</label>
                      <input className="portal-input" type="url" value={settings.systemUrl || ''} onChange={e => updateSetting('systemUrl', e.target.value)} placeholder="https://portal.acadex.com" />
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <style>{`
        .portal-switch {
          position: relative;
          display: inline-block;
          width: 52px;
          height: 28px;
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
