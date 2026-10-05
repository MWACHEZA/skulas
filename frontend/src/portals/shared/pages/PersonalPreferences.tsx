import React, { useState, useEffect } from 'react';
import api from '../../../lib/api';
import { useAuth } from '../../../contexts/AuthContext';
import { useToast } from '../../../context/ToastContext';
import '../../../styles/portal.css';

interface UserPreferences {
  emailAlerts: boolean;
  browserNotifications: boolean;
  whatsappAlerts: boolean;
  whatsappNumber: string;
  smsAlerts: boolean;
  summaryFrequency: 'off' | 'daily' | 'weekly';
  language: string;
}

export default function PersonalPreferences() {
  const { user, updateUser } = useAuth();
  const { showToast } = useToast();
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [browserPermission, setBrowserPermission] = useState<NotificationPermission>('default');

  const isBursar = user?.role === 'BURSAR';
  const defaultFrequency = isBursar ? 'daily' : 'weekly';

  const [prefs, setPrefs] = useState<UserPreferences>({
    emailAlerts: true,
    browserNotifications: false,
    whatsappAlerts: false,
    whatsappNumber: user?.phone || '',
    smsAlerts: false,
    summaryFrequency: defaultFrequency,
    language: 'en'
  });

  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      setBrowserPermission(Notification.permission);
    }
    fetchPreferences();
  }, [user?.id]);

  const fetchPreferences = async () => {
    try {
      setFetching(true);
      const res = await api.get('/api/users/me');
      const meta = res.data?.metadata || {};
      const savedPrefs = meta.preferences || {};

      setPrefs({
        emailAlerts: savedPrefs.emailAlerts !== undefined ? savedPrefs.emailAlerts : true,
        browserNotifications: savedPrefs.browserNotifications !== undefined ? savedPrefs.browserNotifications : (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted'),
        whatsappAlerts: savedPrefs.whatsappAlerts !== undefined ? savedPrefs.whatsappAlerts : false,
        whatsappNumber: savedPrefs.whatsappNumber || res.data?.phone || user?.phone || '',
        smsAlerts: savedPrefs.smsAlerts !== undefined ? savedPrefs.smsAlerts : false,
        summaryFrequency: savedPrefs.summaryFrequency || defaultFrequency,
        language: savedPrefs.language || 'en'
      });
    } catch (err) {
      console.error('Failed to load user preferences', err);
    } finally {
      setFetching(false);
    }
  };

  const handleRequestBrowserPermission = async () => {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      showToast('Browser notifications are not supported on this device', 'error');
      return;
    }

    try {
      const permission = await Notification.requestPermission();
      setBrowserPermission(permission);
      if (permission === 'granted') {
        setPrefs(p => ({ ...p, browserNotifications: true }));
        showToast('Browser notifications enabled for this device', 'success');
      } else {
        setPrefs(p => ({ ...p, browserNotifications: false }));
        showToast('Browser notifications permission was not granted', 'info');
      }
    } catch (err) {
      console.error('Failed to request notification permission', err);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const existingMeta = (user as any)?.metadata || {};
      const updatedMeta = {
        ...existingMeta,
        preferences: prefs
      };

      const res = await api.put('/api/users/me', {
        metadata: updatedMeta,
        phone: prefs.whatsappNumber || user?.phone
      });

      if (res.data) {
        updateUser({
          metadata: updatedMeta,
          phone: prefs.whatsappNumber || user?.phone
        });
      }

      showToast('Personal preferences saved successfully', 'success');
    } catch (err: any) {
      showToast(err.response?.data?.error || 'Failed to save preferences', 'error');
    } finally {
      setLoading(false);
    }
  };

  if (fetching) {
    return (
      <div className="portal-container" style={{ padding: 48, textAlign: 'center', color: '#64748b' }}>
        <i className="fas fa-spinner fa-spin fa-2x" style={{ color: 'var(--school-primary, #0284c7)' }} />
        <p style={{ marginTop: 12 }}>Loading personal preferences...</p>
      </div>
    );
  }

  return (
    <div className="portal-container" style={{ padding: '24px', maxWidth: '900px', margin: '0 auto' }}>
      <div className="portal-page-header" style={{ marginBottom: 24 }}>
        <h1 style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: '1.6rem', fontWeight: 700, color: '#0f172a' }}>
          <i className="fas fa-user-cog" style={{ color: 'var(--school-primary, #0284c7)' }} />
          Personal Preferences & Notifications
        </h1>
        <p style={{ color: '#64748b', fontSize: '0.95rem', marginTop: 4 }}>
          Control how and when you receive personal updates, summary digests, and alert notifications.
        </p>
      </div>

      <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
        {/* CARD 1: Communication Alert Channels */}
        <div className="portal-card" style={{ background: '#fff', borderRadius: 12, padding: 24, border: '1px solid #e2e8f0' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18, borderBottom: '1px solid #f1f5f9', paddingBottom: 12 }}>
            <div style={{ width: 36, height: 36, borderRadius: 8, background: '#e0f2fe', color: '#0284c7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <i className="fas fa-bell" />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, color: '#1e293b' }}>Direct Alert Channels</h3>
              <p style={{ margin: 0, fontSize: '0.8rem', color: '#64748b' }}>Choose the communication channels skulas will use to notify you.</p>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* Email Toggle */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 16px', background: '#f8fafc', borderRadius: 8, border: '1px solid #f1f5f9' }}>
              <div>
                <div style={{ fontWeight: 600, color: '#1e293b', fontSize: '0.95rem' }}>Email Notifications</div>
                <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: 2 }}>
                  Sent to your registered email: <strong style={{ color: '#0284c7' }}>{user?.email || 'N/A'}</strong>
                </div>
              </div>
              <label style={{ position: 'relative', display: 'inline-block', width: 46, height: 24, cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={prefs.emailAlerts}
                  onChange={e => setPrefs({ ...prefs, emailAlerts: e.target.checked })}
                  style={{ opacity: 0, width: 0, height: 0 }}
                />
                <span style={{
                  position: 'absolute', inset: 0, borderRadius: 24,
                  background: prefs.emailAlerts ? '#0284c7' : '#cbd5e1',
                  transition: '0.2s'
                }}>
                  <span style={{
                    position: 'absolute', left: prefs.emailAlerts ? 24 : 3, top: 3,
                    width: 18, height: 18, borderRadius: '50%', background: '#fff',
                    transition: '0.2s'
                  }} />
                </span>
              </label>
            </div>

            {/* Browser Notifications Toggle */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 16px', background: '#f8fafc', borderRadius: 8, border: '1px solid #f1f5f9' }}>
              <div>
                <div style={{ fontWeight: 600, color: '#1e293b', fontSize: '0.95rem' }}>Browser Push Notifications</div>
                <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: 2 }}>
                  Desktop and mobile browser alerts on this device (Permission: <span style={{ textTransform: 'capitalize', fontWeight: 600, color: browserPermission === 'granted' ? '#16a34a' : '#ea580c' }}>{browserPermission}</span>)
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                {browserPermission !== 'granted' && (
                  <button
                    type="button"
                    onClick={handleRequestBrowserPermission}
                    className="portal-btn"
                    style={{ padding: '6px 12px', fontSize: '0.8rem', background: '#e0f2fe', color: '#0369a1', border: '1px solid #bae6fd' }}
                  >
                    Allow
                  </button>
                )}
                <label style={{ position: 'relative', display: 'inline-block', width: 46, height: 24, cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={prefs.browserNotifications}
                    onChange={e => {
                      if (e.target.checked && browserPermission !== 'granted') {
                        handleRequestBrowserPermission();
                      } else {
                        setPrefs({ ...prefs, browserNotifications: e.target.checked });
                      }
                    }}
                    style={{ opacity: 0, width: 0, height: 0 }}
                  />
                  <span style={{
                    position: 'absolute', inset: 0, borderRadius: 24,
                    background: prefs.browserNotifications ? '#0284c7' : '#cbd5e1',
                    transition: '0.2s'
                  }}>
                    <span style={{
                      position: 'absolute', left: prefs.browserNotifications ? 24 : 3, top: 3,
                      width: 18, height: 18, borderRadius: '50%', background: '#fff',
                      transition: '0.2s'
                    }} />
                  </span>
                </label>
              </div>
            </div>

            {/* WhatsApp Alerts Toggle + Number */}
            <div style={{ padding: '14px 16px', background: '#f8fafc', borderRadius: 8, border: '1px solid #f1f5f9' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: prefs.whatsappAlerts ? 12 : 0 }}>
                <div>
                  <div style={{ fontWeight: 600, color: '#1e293b', fontSize: '0.95rem', display: 'flex', alignItems: 'center', gap: 6 }}>
                    <i className="fab fa-whatsapp" style={{ color: '#22c55e' }} /> WhatsApp Alerts
                  </div>
                  <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: 2 }}>
                    Receive official school notifications directly to your WhatsApp inbox.
                  </div>
                </div>
                <label style={{ position: 'relative', display: 'inline-block', width: 46, height: 24, cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={prefs.whatsappAlerts}
                    onChange={e => setPrefs({ ...prefs, whatsappAlerts: e.target.checked })}
                    style={{ opacity: 0, width: 0, height: 0 }}
                  />
                  <span style={{
                    position: 'absolute', inset: 0, borderRadius: 24,
                    background: prefs.whatsappAlerts ? '#22c55e' : '#cbd5e1',
                    transition: '0.2s'
                  }}>
                    <span style={{
                      position: 'absolute', left: prefs.whatsappAlerts ? 24 : 3, top: 3,
                      width: 18, height: 18, borderRadius: '50%', background: '#fff',
                      transition: '0.2s'
                    }} />
                  </span>
                </label>
              </div>

              {prefs.whatsappAlerts && (
                <div style={{ marginTop: 10, paddingTop: 10, borderTop: '1px solid #e2e8f0' }}>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#334155', marginBottom: 6 }}>
                    Your WhatsApp Mobile Number (Include country code e.g. +263)
                  </label>
                  <input
                    type="tel"
                    placeholder="+263 77 123 4567"
                    value={prefs.whatsappNumber}
                    onChange={e => setPrefs({ ...prefs, whatsappNumber: e.target.value })}
                    style={{ width: '100%', maxWidth: 360, padding: '9px 12px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: '0.9rem' }}
                  />
                </div>
              )}
            </div>

            {/* SMS Fallback Toggle */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 16px', background: '#f8fafc', borderRadius: 8, border: '1px solid #f1f5f9' }}>
              <div>
                <div style={{ fontWeight: 600, color: '#1e293b', fontSize: '0.95rem' }}>SMS Fallback Alerts</div>
                <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: 2 }}>
                  Receive urgent cellular text alerts if WhatsApp or Email is unreachable.
                </div>
              </div>
              <label style={{ position: 'relative', display: 'inline-block', width: 46, height: 24, cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={prefs.smsAlerts}
                  onChange={e => setPrefs({ ...prefs, smsAlerts: e.target.checked })}
                  style={{ opacity: 0, width: 0, height: 0 }}
                />
                <span style={{
                  position: 'absolute', inset: 0, borderRadius: 24,
                  background: prefs.smsAlerts ? '#0284c7' : '#cbd5e1',
                  transition: '0.2s'
                }}>
                  <span style={{
                    position: 'absolute', left: prefs.smsAlerts ? 24 : 3, top: 3,
                    width: 18, height: 18, borderRadius: '50%', background: '#fff',
                    transition: '0.2s'
                  }} />
                </span>
              </label>
            </div>
          </div>
        </div>

        {/* CARD 2: Digest Frequency ("My Summary") */}
        <div className="portal-card" style={{ background: '#fff', borderRadius: 12, padding: 24, border: '1px solid #e2e8f0' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18, borderBottom: '1px solid #f1f5f9', paddingBottom: 12 }}>
            <div style={{ width: 36, height: 36, borderRadius: 8, background: '#fef3c7', color: '#b45309', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <i className="fas fa-newspaper" />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, color: '#1e293b' }}>
                "My Summary" Digest Frequency
              </h3>
              <p style={{ margin: 0, fontSize: '0.8rem', color: '#64748b' }}>
                {isBursar
                  ? 'Default: Daily collection summary and fiscal reconciliation overview.'
                  : 'Default: Weekly academic performance, attendance, and activity briefing.'}
              </p>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
            {[
              { id: 'off', label: 'Off', desc: 'No scheduled digest summaries' },
              { id: 'daily', label: 'Daily', desc: isBursar ? 'Daily revenue & payment collection digest' : 'End-of-day activity and schedule briefing' },
              { id: 'weekly', label: 'Weekly', desc: 'End-of-week institutional performance digest' }
            ].map(item => {
              const selected = prefs.summaryFrequency === item.id;
              return (
                <div
                  key={item.id}
                  onClick={() => setPrefs({ ...prefs, summaryFrequency: item.id as any })}
                  style={{
                    padding: '16px',
                    borderRadius: 10,
                    border: `2px solid ${selected ? 'var(--school-primary, #0284c7)' : '#e2e8f0'}`,
                    background: selected ? '#f0f9ff' : '#fff',
                    cursor: 'pointer',
                    transition: '0.15s'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                    <span style={{ fontWeight: 700, fontSize: '0.95rem', color: selected ? '#0284c7' : '#1e293b' }}>
                      {item.label}
                    </span>
                    <input
                      type="radio"
                      name="summaryFrequency"
                      checked={selected}
                      onChange={() => setPrefs({ ...prefs, summaryFrequency: item.id as any })}
                      style={{ accentColor: '#0284c7' }}
                    />
                  </div>
                  <div style={{ fontSize: '0.8rem', color: '#64748b' }}>{item.desc}</div>
                </div>
              );
            })}
          </div>
        </div>

        {/* CARD 3: Language Preference */}
        <div className="portal-card" style={{ background: '#fff', borderRadius: 12, padding: 24, border: '1px solid #e2e8f0' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18, borderBottom: '1px solid #f1f5f9', paddingBottom: 12 }}>
            <div style={{ width: 36, height: 36, borderRadius: 8, background: '#f3e8ff', color: '#7e22ce', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <i className="fas fa-globe" />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, color: '#1e293b' }}>Language Preference</h3>
              <p style={{ margin: 0, fontSize: '0.8rem', color: '#64748b' }}>Select your preferred interface language for system prompts.</p>
            </div>
          </div>

          <div style={{ maxWidth: 360 }}>
            <select
              value={prefs.language}
              onChange={e => setPrefs({ ...prefs, language: e.target.value })}
              className="portal-input"
              style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: '0.9rem', fontWeight: 600 }}
            >
              <option value="en">English (Default)</option>
              <option value="sn">ChiShona</option>
              <option value="nd">isiNdebele</option>
            </select>
          </div>
        </div>

        {/* Submit */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
          <button
            type="submit"
            disabled={loading}
            className="portal-btn portal-btn-primary"
            style={{ padding: '12px 28px', fontWeight: 700, fontSize: '0.95rem' }}
          >
            {loading ? (
              <>
                <i className="fas fa-spinner fa-spin mr-2" /> Saving Preferences...
              </>
            ) : (
              <>
                <i className="fas fa-save mr-2" /> Save Personal Preferences
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
