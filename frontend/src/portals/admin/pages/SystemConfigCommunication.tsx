import React, { useState, useEffect } from 'react';
import api from '../../../lib/api';
import { useAuth } from '../../../contexts/AuthContext';
import { useToast } from '../../../context/ToastContext';
import { SkeletonLoader } from '../../../components/shared';
import '../../../styles/portal.css';

export default function SystemConfigCommunication() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const isAdmin = user?.role === 'SCHOOL_ADMIN' || user?.role === 'SUPER_ADMIN';
  const isBursar = user?.role === 'BURSAR';

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Password / Secret reset toggles
  const [resetSmtpPass, setResetSmtpPass] = useState(false);
  const [resetWaToken, setResetWaToken] = useState(false);
  const [resetPaynowKey, setResetPaynowKey] = useState(false);

  // Form State
  const [config, setConfig] = useState({
    // Email (SMTP)
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

        liveChatEnabled: !!data.liveChatEnabled,

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
      showToast('Communication gateways saved and audit-logged successfully!', 'success');
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
      <div style={{ padding: 24 }}>
        <SkeletonLoader type="form" />
      </div>
    );
  }

  return (
    <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {isBursar && (
        <div style={{ padding: '12px 16px', borderRadius: 8, background: '#eff6ff', border: '1px solid #bfdbfe', color: '#1e40af', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: 10 }}>
          <i className="fas fa-info-circle" />
          <span>Read-only overview for Bursar financial oversight. Modifications require School Administrator authorization.</span>
        </div>
      )}

      {/* Top Action Bar */}
      <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 12, padding: '20px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 36, height: 36, borderRadius: 8, background: '#e0e7ff', color: '#4338ca', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.1rem' }}>
              <i className="fas fa-broadcast-tower" />
            </div>
            <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800, color: '#1e293b' }}>
              SMS, Email &amp; Payment Gateway Configuration
            </h2>
          </div>
          <p style={{ margin: '6px 0 0', color: '#64748b', fontSize: '0.88rem' }}>
            Configure institutional dispatch credentials for automated report card delivery, parent SMS notifications, WhatsApp API, and online fee settlements.
          </p>
        </div>

        {isAdmin && (
          <button
            type="submit"
            disabled={saving}
            className="portal-btn-primary"
            style={{
              padding: '10px 24px',
              borderRadius: 8,
              fontWeight: 700,
              fontSize: '0.9rem',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              background: '#4f46e5',
              borderColor: '#4f46e5',
              color: '#fff',
              cursor: saving ? 'not-allowed' : 'pointer',
              boxShadow: '0 4px 12px rgba(79, 70, 229, 0.2)'
            }}
          >
            <i className={`fas ${saving ? 'fa-spinner fa-spin' : 'fa-save'}`} />
            {saving ? 'Saving Gateways...' : 'Save All Gateways'}
          </button>
        )}
      </div>

      {/* ───────────────────────────────────────────────────────────── */}
      {/* SECTION 1: SMTP EMAIL DELIVERY */}
      {/* ───────────────────────────────────────────────────────────── */}
      <div className="portal-card" style={{ background: '#fff', borderRadius: 12, padding: 24, border: '1px solid #e2e8f0' }}>
        <h3 style={{ margin: '0 0 16px', fontSize: '1.1rem', fontWeight: 700, color: '#1e293b', display: 'flex', alignItems: 'center', gap: 8 }}>
          <i className="fas fa-at" style={{ color: '#4f46e5' }} /> SMTP Institutional Email Delivery
        </h3>
        <p style={{ color: '#64748b', fontSize: '0.85rem', marginTop: -8, marginBottom: 20 }}>
          Encrypted credentials used for automated report card dispatch, termly invoices, and password resets.
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16, marginBottom: 16 }}>
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

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
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

      {/* ───────────────────────────────────────────────────────────── */}
      {/* SECTION 2: CELLULAR SMS & BULK MESSAGING GATEWAY */}
      {/* ───────────────────────────────────────────────────────────── */}
      <div className="portal-card" style={{ background: '#fff', borderRadius: 12, padding: 24, border: '1px solid #e2e8f0' }}>
        <h3 style={{ margin: '0 0 12px', fontSize: '1.05rem', fontWeight: 700, color: '#1e293b', display: 'flex', alignItems: 'center', gap: 8 }}>
          <i className="fas fa-sms" style={{ color: '#0284c7' }} /> Cellular SMS Gateway Configuration
        </h3>
        <p style={{ color: '#64748b', fontSize: '0.85rem', marginTop: -6, marginBottom: 16 }}>
          Automated SMS alerts dispatched to parents for daily attendance roll-call, disciplinary summons, and urgent school notices.
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16 }}>
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
            <label className="form-label" style={{ fontWeight: 600, fontSize: '0.85rem' }}>Sender ID / Alpha Tag (Max 11 chars)</label>
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

      {/* ───────────────────────────────────────────────────────────── */}
      {/* SECTION 3: META WHATSAPP CLOUD API */}
      {/* ───────────────────────────────────────────────────────────── */}
      <div className="portal-card" style={{ background: '#fff', borderRadius: 12, padding: 24, border: '1px solid #e2e8f0' }}>
        <h3 style={{ margin: '0 0 12px', fontSize: '1.05rem', fontWeight: 700, color: '#1e293b', display: 'flex', alignItems: 'center', gap: 8 }}>
          <i className="fab fa-whatsapp" style={{ color: '#22c55e' }} /> Meta WhatsApp Cloud API
        </h3>
        <p style={{ color: '#64748b', fontSize: '0.85rem', marginTop: -6, marginBottom: 16 }}>
          Direct official WhatsApp messages dispatched to parent contact numbers with digital invoice links and fee balance reminders.
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 }}>
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

      {/* ───────────────────────────────────────────────────────────── */}
      {/* SECTION 4: PAYNOW PAYMENT GATEWAY */}
      {/* ───────────────────────────────────────────────────────────── */}
      <div className="portal-card" style={{ background: '#fff', borderRadius: 12, padding: 24, border: '1px solid #e2e8f0' }}>
        <h3 style={{ margin: '0 0 12px', fontSize: '1.05rem', fontWeight: 700, color: '#1e293b', display: 'flex', alignItems: 'center', gap: 8 }}>
          <i className="fas fa-credit-card" style={{ color: '#059669' }} /> Paynow Payment Gateway (Fee Collections)
        </h3>
        <p style={{ color: '#64748b', fontSize: '0.85rem', marginTop: -6, marginBottom: 16 }}>
          For parent online fee settlement and wallet top-ups via EcoCash, OneMoney, Visa, and Mastercard. (Not used for staff payroll).
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 }}>
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

      {/* ───────────────────────────────────────────────────────────── */}
      {/* SECTION 5: WEBHOOKS & API ACCESS */}
      {/* ───────────────────────────────────────────────────────────── */}
      <div className="portal-card" style={{ background: '#fff', borderRadius: 12, padding: 24, border: '1px solid #e2e8f0' }}>
        <h3 style={{ margin: '0 0 16px', fontSize: '1.1rem', fontWeight: 700, color: '#1e293b', display: 'flex', alignItems: 'center', gap: 8 }}>
          <i className="fas fa-plug" style={{ color: '#4f46e5' }} /> Webhooks &amp; Institutional API Access
        </h3>
        <p style={{ color: '#64748b', fontSize: '0.85rem', marginTop: -8, marginBottom: 20 }}>
          Connect third-party accounting software, custom LMS, or biometric attendance turnstiles with tenant webhook dispatches.
        </p>

        <div style={{ padding: '20px', borderRadius: 8, border: '1px solid #e2e8f0', background: '#f8fafc' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{ width: 44, height: 44, borderRadius: 10, background: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#2563eb', flexShrink: 0 }}>
              <i className="fas fa-network-wired fa-lg" />
            </div>
            <div>
              <div style={{ fontWeight: 700, color: '#1e293b', fontSize: '0.95rem' }}>External Webhook Event Dispatcher</div>
              <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: 4 }}>
                Dispatches cryptographically signed JSON payloads upon attendance check-in, fee settlement, and grade submission events. Configured via custom tenant API integrations.
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ───────────────────────────────────────────────────────────── */}
      {/* SECTION 6: CANONICAL SUBDOMAIN & NETWORK ROUTING */}
      {/* ───────────────────────────────────────────────────────────── */}
      <div className="portal-card" style={{ background: '#fff', borderRadius: 12, padding: 24, border: '1px solid #e2e8f0' }}>
        <h3 style={{ margin: '0 0 16px', fontSize: '1.1rem', fontWeight: 700, color: '#1e293b', display: 'flex', alignItems: 'center', gap: 8 }}>
          <i className="fas fa-link" style={{ color: '#0284c7' }} /> Advanced Network &amp; Canonical Subdomain
        </h3>

        <div style={{ marginBottom: 20 }}>
          <label className="form-label" style={{ fontWeight: 600, fontSize: '0.85rem' }}>Canonical Institutional URL</label>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
            <input
              type="text"
              disabled
              value={config.systemUrl}
              className="portal-input"
              style={{ background: '#f8fafc', color: '#334155', fontWeight: 600, maxWidth: 460 }}
            />
            <span className="portal-badge info" style={{ fontWeight: 700, padding: '6px 12px', background: '#e0f2fe', color: '#0369a1', borderRadius: 6 }}>
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

      {/* Bottom Save Action */}
      {isAdmin && (
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, paddingBottom: 24 }}>
          <button
            type="submit"
            disabled={saving}
            className="portal-btn portal-btn-primary"
            style={{
              padding: '12px 32px',
              fontWeight: 700,
              fontSize: '0.95rem',
              background: '#4f46e5',
              borderColor: '#4f46e5',
              color: '#fff',
              borderRadius: 8,
              cursor: saving ? 'not-allowed' : 'pointer',
              boxShadow: '0 4px 12px rgba(79, 70, 229, 0.25)'
            }}
          >
            {saving ? (
              <>
                <i className="fas fa-spinner fa-spin mr-2" /> Saving Configuration...
              </>
            ) : (
              <>
                <i className="fas fa-save mr-2" /> Save &amp; Audit Log Configuration
              </>
            )}
          </button>
        </div>
      )}
    </form>
  );
}
