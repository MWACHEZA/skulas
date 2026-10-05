import React, { useState, useEffect } from 'react';
import api from '../../../lib/api';
import { useAuth } from '../../../contexts/AuthContext';
import { useToast } from '../../../context/ToastContext';
import '../../../styles/portal.css';

export default function SystemConfigCommunication() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const isAdmin = user?.role === 'SCHOOL_ADMIN' || user?.role === 'SUPER_ADMIN';
  const isBursar = user?.role === 'BURSAR';

  const [activeSubTab, setActiveSubTab] = useState<'email' | 'messaging' | 'integrations' | 'advanced'>('email');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Password reset toggles
  const [resetSmtpPass, setResetSmtpPass] = useState(false);
  const [resetWaToken, setResetWaToken] = useState(false);
  const [resetPaynowKey, setResetPaynowKey] = useState(false);

  // Form State
  const [config, setConfig] = useState({
    // Email
    smtpEmail: '',
    smtpHost: '',
    smtpPort: 465,
    smtpPassword: '',
    smtpSsl: true,

    // SMS & WhatsApp
    countryPhoneCode: '263',
    smsGatewayProvider: 'BulkSMS_ZW',
    smsSenderId: '',
    smsApiKey: '',
    whatsappApiUrl: 'https://graph.facebook.com/v19.0',
    whatsappAccessToken: '',
    paynowMerchantId: '',
    paynowMerchantKey: '',

    // Optional Integrations
    liveChatEnabled: false,
    tawktoPropertyId: '',

    // Advanced / Canonical URL
    systemUrl: '',
    shortCode: user?.schoolCode || 'school'
  });

  useEffect(() => {
    fetchConfig();
  }, []);

  const fetchConfig = async () => {
    try {
      setLoading(true);
      const res = await api.get('/api/schools/settings');
      const data = res.data || {};
      const school = data.school || {};

      const rootDomain = window.location.hostname.includes('.') ? window.location.hostname.split('.').slice(-2).join('.') : 'skulas.co.zw';
      const autoCanonical = `https://${(school.code || user?.schoolCode || 'school').toLowerCase()}.${rootDomain}`;

      setConfig({
        smtpEmail: data.smtpEmail || '',
        smtpHost: data.smtpHost || '',
        smtpPort: data.smtpPort || 465,
        smtpPassword: '',
        smtpSsl: data.smtpSsl !== undefined ? data.smtpSsl : true,

        countryPhoneCode: data.countryPhoneCode || '263',
        smsGatewayProvider: data.smsGatewayProvider || 'BulkSMS_ZW',
        smsSenderId: data.smsSenderId || school.code || '',
        smsApiKey: '',
        whatsappApiUrl: data.whatsappApiUrl || 'https://graph.facebook.com/v19.0',
        whatsappAccessToken: '',
        paynowMerchantId: data.paynowMerchantId || '',
        paynowMerchantKey: '',

        liveChatEnabled: data.liveChatEnabled || !!data.tawktoPropertyId,
        tawktoPropertyId: data.tawktoPropertyId || '',

        systemUrl: data.systemUrl || autoCanonical,
        shortCode: school.code || user?.schoolCode || 'school'
      });
    } catch (err) {
      console.error('Failed to load communication configuration', err);
      showToast('Failed to load communication settings', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin) {
      showToast('Permission denied: Only School Administrators can modify institutional communication configuration.', 'error');
      return;
    }

    setSaving(true);
    try {
      const payload: Record<string, any> = {
        smtpEmail: config.smtpEmail,
        smtpHost: config.smtpHost,
        smtpPort: config.smtpPort,
        smtpSsl: config.smtpSsl,
        countryPhoneCode: config.countryPhoneCode,
        smsGatewayProvider: config.smsGatewayProvider,
        smsSenderId: config.smsSenderId,
        whatsappApiUrl: config.whatsappApiUrl,
        paynowMerchantId: config.paynowMerchantId,
        liveChatEnabled: config.liveChatEnabled,
        tawktoPropertyId: config.liveChatEnabled ? config.tawktoPropertyId : ''
      };

      if (resetSmtpPass && config.smtpPassword) {
        payload.smtpPassword = config.smtpPassword;
      }
      if (resetWaToken && config.whatsappAccessToken) {
        payload.whatsappAccessToken = config.whatsappAccessToken;
      }
      if (resetPaynowKey && config.paynowMerchantKey) {
        payload.paynowMerchantKey = config.paynowMerchantKey;
      }

      await api.patch('/api/schools/settings', payload);
      showToast('Communication configuration saved and audit-logged successfully', 'success');
      setResetSmtpPass(false);
      setResetWaToken(false);
      setResetPaynowKey(false);
      fetchConfig();
    } catch (err: any) {
      showToast(err.response?.data?.error || 'Failed to save communication configuration', 'error');
    } finally {
      setSaving(false);
    }
  };

  if (!isAdmin && !isBursar) {
    return (
      <div className="portal-container" style={{ padding: 48, textAlign: 'center' }}>
        <i className="fas fa-lock fa-3x" style={{ color: '#ef4444', marginBottom: 16 }} />
        <h2 style={{ color: '#1e293b' }}>Access Restricted</h2>
        <p style={{ color: '#64748b' }}>Institutional system communications are strictly restricted to School Administrators.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div style={{ padding: 48, textAlign: 'center', color: '#64748b' }}>
        <i className="fas fa-spinner fa-spin fa-2x" style={{ color: '#4f46e5' }} />
        <p style={{ marginTop: 12 }}>Loading communication configuration...</p>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {isBursar && (
        <div style={{ padding: '12px 16px', borderRadius: 8, background: '#eff6ff', border: '1px solid #bfdbfe', color: '#1e40af', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: 10 }}>
          <i className="fas fa-info-circle" />
          <span>Read-only overview for Bursar financial oversight. Modifications require School Administrator authorization.</span>
        </div>
      )}

      {/* Sub-tabs */}
      <div style={{ display: 'flex', gap: 8, borderBottom: '1px solid #e2e8f0', paddingBottom: 8, flexWrap: 'wrap' }}>
        {[
          { id: 'email', label: 'Email (SMTP)', icon: 'fas fa-envelope' },
          { id: 'messaging', label: 'SMS & WhatsApp & Paynow', icon: 'fas fa-comment-dots' },
          { id: 'integrations', label: 'Optional Integrations', icon: 'fas fa-puzzle-piece' },
          { id: 'advanced', label: 'Advanced & Canonical URL', icon: 'fas fa-link' }
        ].map(st => (
          <button
            key={st.id}
            type="button"
            onClick={() => setActiveSubTab(st.id as any)}
            style={{
              padding: '8px 16px',
              borderRadius: 6,
              border: 'none',
              background: activeSubTab === st.id ? '#4f46e5' : '#f1f5f9',
              color: activeSubTab === st.id ? '#fff' : '#475569',
              fontWeight: 600,
              fontSize: '0.85rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 8
            }}
          >
            <i className={st.icon} />
            {st.label}
          </button>
        ))}
      </div>

      <form onSubmit={handleSave}>
        {/* SUBTAB 1: EMAIL (SMTP) */}
        {activeSubTab === 'email' && (
          <div className="portal-card" style={{ background: '#fff', borderRadius: 10, padding: 24, border: '1px solid #e2e8f0' }}>
            <h3 style={{ margin: '0 0 16px', fontSize: '1.1rem', fontWeight: 700, color: '#1e293b', display: 'flex', alignItems: 'center', gap: 8 }}>
              <i className="fas fa-at" style={{ color: '#4f46e5' }} /> SMTP Institutional Email Delivery
            </h3>
            <p style={{ color: '#64748b', fontSize: '0.85rem', marginTop: -8, marginBottom: 20 }}>
              Encrypted credentials used for automated report card dispatch, termly invoices, and password resets.
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
              <div>
                <label className="form-label" style={{ fontWeight: 600, fontSize: '0.85rem' }}>Sender Email Address *</label>
                <input
                  type="email"
                  required
                  disabled={isBursar}
                  placeholder="notifications@school.ac.zw"
                  className="portal-input"
                  value={config.smtpEmail}
                  onChange={e => setConfig({ ...config, smtpEmail: e.target.value })}
                />
              </div>
              <div>
                <label className="form-label" style={{ fontWeight: 600, fontSize: '0.85rem' }}>SMTP Host Server *</label>
                <input
                  type="text"
                  required
                  disabled={isBursar}
                  placeholder="smtp.office365.com or smtp.gmail.com"
                  className="portal-input"
                  value={config.smtpHost}
                  onChange={e => setConfig({ ...config, smtpHost: e.target.value })}
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16, marginBottom: 16 }}>
              <div>
                <label className="form-label" style={{ fontWeight: 600, fontSize: '0.85rem' }}>Port</label>
                <input
                  type="number"
                  disabled={isBursar}
                  className="portal-input"
                  value={config.smtpPort}
                  onChange={e => setConfig({ ...config, smtpPort: parseInt(e.target.value) || 465 })}
                />
              </div>
              <div>
                <label className="form-label" style={{ fontWeight: 600, fontSize: '0.85rem' }}>SSL / TLS Encryption</label>
                <div style={{ display: 'flex', alignItems: 'center', height: 42 }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: isBursar ? 'default' : 'pointer', fontSize: '0.9rem', fontWeight: 600 }}>
                    <input
                      type="checkbox"
                      disabled={isBursar}
                      checked={config.smtpSsl}
                      onChange={e => setConfig({ ...config, smtpSsl: e.target.checked })}
                    />
                    Enforce SSL/TLS
                  </label>
                </div>
              </div>
              <div>
                <label className="form-label" style={{ fontWeight: 600, fontSize: '0.85rem' }}>SMTP Password</label>
                {!resetSmtpPass ? (
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <input
                      type="password"
                      disabled
                      value="••••••••••••••••"
                      className="portal-input"
                      style={{ background: '#f1f5f9', color: '#94a3b8' }}
                    />
                    {!isBursar && (
                      <button
                        type="button"
                        onClick={() => setResetSmtpPass(true)}
                        className="portal-btn"
                        style={{ padding: '8px 12px', fontSize: '0.8rem', background: '#e0f2fe', color: '#0369a1', border: '1px solid #bae6fd' }}
                      >
                        Reset
                      </button>
                    )}
                  </div>
                ) : (
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <input
                      type="password"
                      placeholder="Enter new password"
                      autoFocus
                      className="portal-input"
                      value={config.smtpPassword}
                      onChange={e => setConfig({ ...config, smtpPassword: e.target.value })}
                    />
                    <button
                      type="button"
                      onClick={() => { setResetSmtpPass(false); setConfig({ ...config, smtpPassword: '' }); }}
                      className="portal-btn"
                      style={{ padding: '8px 12px', fontSize: '0.8rem', background: '#f1f5f9', color: '#64748b' }}
                    >
                      Cancel
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* SUBTAB 2: SMS & WHATSAPP & PAYNOW */}
        {activeSubTab === 'messaging' && (
          <div className="portal-card" style={{ background: '#fff', borderRadius: 10, padding: 24, border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: 24 }}>
            {/* SMS Gateway Section */}
            <div>
              <h3 style={{ margin: '0 0 12px', fontSize: '1.05rem', fontWeight: 700, color: '#1e293b', display: 'flex', alignItems: 'center', gap: 8 }}>
                <i className="fas fa-sms" style={{ color: '#0284c7' }} /> Cellular SMS Gateway Configuration
              </h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14 }}>
                <div>
                  <label className="form-label" style={{ fontWeight: 600, fontSize: '0.85rem' }}>Default Country Dial Code</label>
                  <input
                    type="text"
                    disabled={isBursar}
                    placeholder="263"
                    className="portal-input"
                    value={config.countryPhoneCode}
                    onChange={e => setConfig({ ...config, countryPhoneCode: e.target.value })}
                  />
                </div>
                <div>
                  <label className="form-label" style={{ fontWeight: 600, fontSize: '0.85rem' }}>SMS Gateway Provider</label>
                  <select
                    disabled={isBursar}
                    className="portal-input"
                    value={config.smsGatewayProvider}
                    onChange={e => setConfig({ ...config, smsGatewayProvider: e.target.value })}
                  >
                    <option value="BulkSMS_ZW">BulkSMS Zimbabwe</option>
                    <option value="Twilio">Twilio</option>
                    <option value="AfricaTalking">Africa's Talking</option>
                    <option value="EconetDirect">Econet SMS Direct</option>
                  </select>
                </div>
                <div>
                  <label className="form-label" style={{ fontWeight: 600, fontSize: '0.85rem' }}>Sender ID / Alpha Tag</label>
                  <input
                    type="text"
                    disabled={isBursar}
                    maxLength={11}
                    placeholder="ST_GEORGES"
                    className="portal-input"
                    value={config.smsSenderId}
                    onChange={e => setConfig({ ...config, smsSenderId: e.target.value.toUpperCase() })}
                  />
                </div>
              </div>
            </div>

            {/* WhatsApp Cloud API */}
            <div style={{ paddingTop: 16, borderTop: '1px solid #f1f5f9' }}>
              <h3 style={{ margin: '0 0 12px', fontSize: '1.05rem', fontWeight: 700, color: '#1e293b', display: 'flex', alignItems: 'center', gap: 8 }}>
                <i className="fab fa-whatsapp" style={{ color: '#22c55e' }} /> Meta WhatsApp Cloud API
              </h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                <div>
                  <label className="form-label" style={{ fontWeight: 600, fontSize: '0.85rem' }}>Graph API Endpoint</label>
                  <input
                    type="text"
                    disabled={isBursar}
                    className="portal-input"
                    value={config.whatsappApiUrl}
                    onChange={e => setConfig({ ...config, whatsappApiUrl: e.target.value })}
                  />
                </div>
                <div>
                  <label className="form-label" style={{ fontWeight: 600, fontSize: '0.85rem' }}>Permanent Access Token</label>
                  {!resetWaToken ? (
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                      <input
                        type="password"
                        disabled
                        value="••••••••••••••••••••••••"
                        className="portal-input"
                        style={{ background: '#f1f5f9', color: '#94a3b8' }}
                      />
                      {!isBursar && (
                        <button
                          type="button"
                          onClick={() => setResetWaToken(true)}
                          className="portal-btn"
                          style={{ padding: '8px 12px', fontSize: '0.8rem', background: '#e0f2fe', color: '#0369a1', border: '1px solid #bae6fd' }}
                        >
                          Reset Token
                        </button>
                      )}
                    </div>
                  ) : (
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                      <input
                        type="password"
                        placeholder="Paste new Meta access token"
                        autoFocus
                        className="portal-input"
                        value={config.whatsappAccessToken}
                        onChange={e => setConfig({ ...config, whatsappAccessToken: e.target.value })}
                      />
                      <button
                        type="button"
                        onClick={() => { setResetWaToken(false); setConfig({ ...config, whatsappAccessToken: '' }); }}
                        className="portal-btn"
                        style={{ padding: '8px 12px', fontSize: '0.8rem', background: '#f1f5f9', color: '#64748b' }}
                      >
                        Cancel
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Paynow Fee Collection Gateway */}
            <div style={{ paddingTop: 16, borderTop: '1px solid #f1f5f9' }}>
              <h3 style={{ margin: '0 0 12px', fontSize: '1.05rem', fontWeight: 700, color: '#1e293b', display: 'flex', alignItems: 'center', gap: 8 }}>
                <i className="fas fa-credit-card" style={{ color: '#059669' }} /> Paynow Payment Gateway (Fee Collections)
              </h3>
              <p style={{ color: '#64748b', fontSize: '0.8rem', marginTop: -6, marginBottom: 14 }}>
                For parent online fee settlement and wallet top-ups. (Not used for staff payroll).
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                <div>
                  <label className="form-label" style={{ fontWeight: 600, fontSize: '0.85rem' }}>Paynow Integration ID</label>
                  <input
                    type="text"
                    disabled={isBursar}
                    placeholder="e.g. 12948"
                    className="portal-input"
                    value={config.paynowMerchantId}
                    onChange={e => setConfig({ ...config, paynowMerchantId: e.target.value })}
                  />
                </div>
                <div>
                  <label className="form-label" style={{ fontWeight: 600, fontSize: '0.85rem' }}>Paynow Integration Key</label>
                  {!resetPaynowKey ? (
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                      <input
                        type="password"
                        disabled
                        value="••••••••••••••••"
                        className="portal-input"
                        style={{ background: '#f1f5f9', color: '#94a3b8' }}
                      />
                      {!isBursar && (
                        <button
                          type="button"
                          onClick={() => setResetPaynowKey(true)}
                          className="portal-btn"
                          style={{ padding: '8px 12px', fontSize: '0.8rem', background: '#e0f2fe', color: '#0369a1', border: '1px solid #bae6fd' }}
                        >
                          Reset Key
                        </button>
                      )}
                    </div>
                  ) : (
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                      <input
                        type="password"
                        placeholder="Paste new integration key"
                        autoFocus
                        className="portal-input"
                        value={config.paynowMerchantKey}
                        onChange={e => setConfig({ ...config, paynowMerchantKey: e.target.value })}
                      />
                      <button
                        type="button"
                        onClick={() => { setResetPaynowKey(false); setConfig({ ...config, paynowMerchantKey: '' }); }}
                        className="portal-btn"
                        style={{ padding: '8px 12px', fontSize: '0.8rem', background: '#f1f5f9', color: '#64748b' }}
                      >
                        Cancel
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* SUBTAB 3: OPTIONAL INTEGRATIONS */}
        {activeSubTab === 'integrations' && (
          <div className="portal-card" style={{ background: '#fff', borderRadius: 10, padding: 24, border: '1px solid #e2e8f0' }}>
            <h3 style={{ margin: '0 0 16px', fontSize: '1.1rem', fontWeight: 700, color: '#1e293b' }}>
              Optional External Integrations
            </h3>
            <p style={{ color: '#64748b', fontSize: '0.85rem', marginTop: -8, marginBottom: 20 }}>
              Non-core modular services. These are collapsed and disabled by default until explicitly enabled by your institution.
            </p>

            <div style={{ padding: '16px 20px', borderRadius: 8, border: '1px solid #e2e8f0', background: '#f8fafc' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontWeight: 700, color: '#1e293b', fontSize: '0.95rem', display: 'flex', alignItems: 'center', gap: 8 }}>
                    <i className="fas fa-comments" style={{ color: '#0284c7' }} /> Tawk.to Live Admissions Chat
                  </div>
                  <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: 3 }}>
                    Live visitor chat widget. <strong style={{ color: '#059669' }}>Renders strictly on the public admissions site</strong>, never inside logged-in student, parent, or staff portals.
                  </div>
                </div>
                <label style={{ position: 'relative', display: 'inline-block', width: 46, height: 24, cursor: isBursar ? 'default' : 'pointer' }}>
                  <input
                    type="checkbox"
                    disabled={isBursar}
                    checked={config.liveChatEnabled}
                    onChange={e => setConfig({ ...config, liveChatEnabled: e.target.checked })}
                    style={{ opacity: 0, width: 0, height: 0 }}
                  />
                  <span style={{
                    position: 'absolute', inset: 0, borderRadius: 24,
                    background: config.liveChatEnabled ? '#4f46e5' : '#cbd5e1',
                    transition: '0.2s'
                  }}>
                    <span style={{
                      position: 'absolute', left: config.liveChatEnabled ? 24 : 3, top: 3,
                      width: 18, height: 18, borderRadius: '50%', background: '#fff',
                      transition: '0.2s'
                    }} />
                  </span>
                </label>
              </div>

              {config.liveChatEnabled && (
                <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid #e2e8f0' }}>
                  <label className="form-label" style={{ fontWeight: 600, fontSize: '0.85rem' }}>
                    Tawk.to Property ID / Direct Widget ID *
                  </label>
                  <input
                    type="text"
                    required={config.liveChatEnabled}
                    disabled={isBursar}
                    placeholder="e.g. 648a1234bc9876543210abcd/1h2j3k4l5"
                    className="portal-input"
                    value={config.tawktoPropertyId}
                    onChange={e => setConfig({ ...config, tawktoPropertyId: e.target.value })}
                    style={{ maxWidth: 440 }}
                  />
                  <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: 4 }}>
                    Obtain this from your Tawk.to dashboard under Administration &gt; Channels &gt; Chat Widget.
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* SUBTAB 4: ADVANCED & CANONICAL URL */}
        {activeSubTab === 'advanced' && (
          <div className="portal-card" style={{ background: '#fff', borderRadius: 10, padding: 24, border: '1px solid #e2e8f0' }}>
            <h3 style={{ margin: '0 0 16px', fontSize: '1.1rem', fontWeight: 700, color: '#1e293b' }}>
              Advanced Network & Canonical Subdomain
            </h3>

            <div style={{ marginBottom: 20 }}>
              <label className="form-label" style={{ fontWeight: 600, fontSize: '0.85rem' }}>Canonical Institutional URL</label>
              <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                <input
                  type="text"
                  disabled
                  value={config.systemUrl}
                  className="portal-input"
                  style={{ background: '#f8fafc', color: '#334155', fontWeight: 600, maxWidth: 460 }}
                />
                <span className="portal-badge info" style={{ fontWeight: 700, padding: '6px 12px' }}>
                  Managed by Platform DNS
                </span>
              </div>
              <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: 6, maxWidth: 640 }}>
                This canonical subdomain is auto-provisioned based on your institutional identifier (<strong>{config.shortCode}</strong>). To prevent broken authentication redirects and broken email links, custom apex domains must be verified by the platform Super Administrator.
              </div>
            </div>

            <div style={{ padding: 16, borderRadius: 8, background: '#f1f5f9', border: '1px solid #e2e8f0', fontSize: '0.85rem', color: '#475569' }}>
              <strong>Multi-School Subdomain Provisioning:</strong> Wildcard routing and automated SSL encryption are managed centrally. Institutional admins cannot manually alter domain strings to prevent tenant isolation breaches.
            </div>
          </div>
        )}

        {/* Form Submit */}
        {isAdmin && (
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 20 }}>
            <button
              type="submit"
              disabled={saving}
              className="portal-btn portal-btn-primary"
              style={{ padding: '12px 28px', fontWeight: 700, background: '#4f46e5' }}
            >
              {saving ? (
                <>
                  <i className="fas fa-spinner fa-spin mr-2" /> Saving Configuration...
                </>
              ) : (
                <>
                  <i className="fas fa-save mr-2" /> Save & Audit Log Configuration
                </>
              )}
            </button>
          </div>
        )}
      </form>
    </div>
  );
}
