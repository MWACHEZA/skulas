import React, { useState, useEffect } from 'react';
import api from '../../../lib/api';
import { useAuth } from '../../../contexts/AuthContext';
import { useToast } from '../../../context/ToastContext';
import { applySchoolTheme } from '../../../utils/theme';

interface SystemColorsConfigProps {
  onSaved?: () => void;
}

const PRIMARY_PALETTES = [
  { name: 'Royal Blue', hex: '#2563eb' },
  { name: 'Classic Navy', hex: '#1e3a8a' },
  { name: 'Emerald Green', hex: '#059669' },
  { name: 'Forest Green', hex: '#166534' },
  { name: 'Ruby Crimson', hex: '#dc2626' },
  { name: 'Deep Burgundy', hex: '#881337' },
  { name: 'Royal Purple', hex: '#7c3aed' },
  { name: 'Deep Violet', hex: '#581c87' },
  { name: 'Indigo Blue', hex: '#4f46e5' },
  { name: 'Amber Ochre', hex: '#d97706' },
  { name: 'Teal Lagoon', hex: '#0d9488' },
  { name: 'Midnight Slate', hex: '#0f172a' }
];

const ACCENT_PALETTES = [
  { name: 'Sunburst Amber', hex: '#f59e0b' },
  { name: 'Coral Fire', hex: '#ea580c' },
  { name: 'Mint Emerald', hex: '#10b981' },
  { name: 'Sky Cyan', hex: '#0284c7' },
  { name: 'Rose Charm', hex: '#e11d48' },
  { name: 'Electric Violet', hex: '#8b5cf6' },
  { name: 'Goldenrod', hex: '#eab308' },
  { name: 'Steel Slate', hex: '#64748b' }
];

export default function SystemColorsConfig({ onSaved }: SystemColorsConfigProps) {
  const { user, updateUser } = useAuth();
  const { showToast } = useToast();

  const [primaryColor, setPrimaryColor] = useState('#2563eb');
  const [accentColor, setAccentColor] = useState('#d97706');
  const [sidebarTheme, setSidebarTheme] = useState<'dark' | 'primary' | 'light' | 'slate'>('dark');
  const [headerTheme, setHeaderTheme] = useState<'white' | 'slate' | 'primary-tint'>('white');
  const [mode, setMode] = useState<'light' | 'dark'>('light');
  const [textAlignment, setTextAlignment] = useState<'Left-to-right' | 'Right-to-left'>('Left-to-right');

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchColors();
  }, []);

  const fetchColors = async () => {
    setLoading(true);
    try {
      const [settingsRes, schoolRes] = await Promise.all([
        api.get('/api/schools/settings').catch(() => ({ data: {} })),
        api.get('/api/schools/info').catch(() => ({ data: {} }))
      ]);

      const settings = settingsRes.data || {};
      const school = schoolRes.data?.school || user?.school || {};
      const branding = school.branding || user?.schoolBranding || {};

      if (branding.primaryColor) setPrimaryColor(branding.primaryColor);
      else if (settings.themeColour && settings.themeColour.startsWith('#')) setPrimaryColor(settings.themeColour);

      if (branding.accentColor) setAccentColor(branding.accentColor);
      if (branding.sidebarTheme) setSidebarTheme(branding.sidebarTheme);
      if (branding.headerTheme) setHeaderTheme(branding.headerTheme);
      if (branding.mode) setMode(branding.mode);
      if (settings.textAlignment) setTextAlignment(settings.textAlignment);
    } catch (err) {
      console.error('Failed to load branding colors', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      // 1. Update branding in School model
      const brandRes = await api.patch('/api/schools/branding', {
        primaryColor,
        accentColor,
        sidebarTheme,
        headerTheme,
        mode
      });

      // 2. Update settings in SchoolSetting model
      await api.patch('/api/schools/settings', {
        themeColour: primaryColor,
        theme: primaryColor,
        textAlignment
      });

      // 3. Immediately apply full CSS variable color palette to the document
      applySchoolTheme({ primaryColor, accentColor });

      // 4. Update AuthContext user state
      if (user && updateUser) {
        updateUser({
          ...user,
          school: {
            ...(user.school || {}),
            branding: {
              ...((user.school as any)?.branding || {}),
              primaryColor,
              accentColor,
              sidebarTheme,
              headerTheme,
              mode
            }
          },
          schoolBranding: {
            ...(user.schoolBranding || {}),
            primaryColor,
            accentColor,
            sidebarTheme,
            headerTheme,
            mode
          }
        });
      }

      await api.put('/api/website-settings', { schoolPrimaryColor: primaryColor }).catch(() => {});
      window.dispatchEvent(new CustomEvent('school-settings-updated', { detail: { type: 'colors', primaryColor, accentColor } }));
      localStorage.setItem('school_settings_updated', Date.now().toString());
      showToast('System color palette and visual themes saved successfully!', 'success');
      if (onSaved) onSaved();
    } catch (err: any) {
      showToast(err.response?.data?.error || 'Failed to save system colors', 'error');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="portal-card" style={{ background: '#fff', borderRadius: 10, padding: 32, textAlign: 'center' }}>
        <i className="fas fa-spinner fa-spin fa-2x" style={{ color: '#4f46e5', marginBottom: 12 }} />
        <p style={{ color: '#64748b', fontSize: '0.9rem' }}>Loading institutional visual palette...</p>
      </div>
    );
  }

  // Calculate sidebar background preview style
  const getSidebarBgPreview = () => {
    switch (sidebarTheme) {
      case 'primary': return primaryColor;
      case 'light': return '#ffffff';
      case 'slate': return '#1e293b';
      case 'dark':
      default: return '#0f172a';
    }
  };

  const getHeaderBgPreview = () => {
    switch (headerTheme) {
      case 'slate': return '#f8fafc';
      case 'primary-tint': return `${primaryColor}15`;
      case 'white':
      default: return '#ffffff';
    }
  };

  return (
    <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Overview Banner */}
      <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 12, padding: '20px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 36, height: 36, borderRadius: 8, background: '#e0e7ff', color: '#4338ca', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.1rem' }}>
              <i className="fas fa-palette" />
            </div>
            <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800, color: '#1e293b' }}>
              System Color Palette & Institutional Theme
            </h2>
          </div>
          <p style={{ margin: '6px 0 0', color: '#64748b', fontSize: '0.88rem' }}>
            Choose the primary institutional colors, accent highlights, and navigation surface themes applied across the portals and public website.
          </p>
        </div>
        <button
          type="submit"
          disabled={saving}
          className="portal-btn-primary"
          style={{
            background: primaryColor,
            borderColor: primaryColor,
            color: '#fff',
            padding: '10px 24px',
            borderRadius: 8,
            fontWeight: 700,
            fontSize: '0.9rem',
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            cursor: saving ? 'not-allowed' : 'pointer',
            boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
          }}
        >
          <i className={`fas ${saving ? 'fa-spinner fa-spin' : 'fa-check'}`} />
          {saving ? 'Applying Colors...' : 'Save System Colors'}
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.4fr) minmax(0, 1fr)', gap: 24, alignItems: 'start' }}>
        
        {/* LEFT COLUMN: CONTROLS & PALETTES */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          
          {/* Card 1: Primary Brand Color */}
          <div className="portal-card" style={{ background: '#fff', borderRadius: 12, padding: 24, border: '1px solid #e2e8f0' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700, color: '#1e293b', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ width: 14, height: 14, borderRadius: '50%', background: primaryColor, display: 'inline-block' }} />
                  Primary Institutional Brand Color
                </h3>
                <p style={{ margin: '4px 0 0', color: '#64748b', fontSize: '0.8rem' }}>
                  Applied to main buttons, active navigation menus, table headers, and public banner accents.
                </p>
              </div>
            </div>

            {/* Custom Input */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
              <div style={{ position: 'relative', width: 52, height: 44, borderRadius: 8, border: '2px solid #e2e8f0', overflow: 'hidden', flexShrink: 0, background: primaryColor }}>
                <input
                  type="color"
                  value={primaryColor}
                  onChange={e => setPrimaryColor(e.target.value)}
                  style={{ position: 'absolute', inset: -10, width: 80, height: 80, cursor: 'pointer', opacity: 0 }}
                />
              </div>
              <input
                type="text"
                value={primaryColor}
                onChange={e => setPrimaryColor(e.target.value)}
                placeholder="#2563eb"
                className="portal-input"
                style={{ width: 140, fontFamily: 'monospace', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}
              />
              <span style={{ fontSize: '0.78rem', color: '#94a3b8' }}>
                Hex color code or click the swatch to pick
              </span>
            </div>

            {/* Preset Color Swatches */}
            <div>
              <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 10 }}>
                Popular Academic Color Presets
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: 8 }}>
                {PRIMARY_PALETTES.map(p => (
                  <button
                    key={p.hex}
                    type="button"
                    onClick={() => setPrimaryColor(p.hex)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      padding: '8px 10px',
                      borderRadius: 8,
                      border: primaryColor.toLowerCase() === p.hex.toLowerCase() ? `2px solid ${p.hex}` : '1px solid #e2e8f0',
                      background: primaryColor.toLowerCase() === p.hex.toLowerCase() ? '#f8fafc' : '#ffffff',
                      cursor: 'pointer',
                      textAlign: 'left'
                    }}
                  >
                    <span style={{ width: 18, height: 18, borderRadius: 4, background: p.hex, flexShrink: 0 }} />
                    <span style={{ fontSize: '0.78rem', fontWeight: primaryColor.toLowerCase() === p.hex.toLowerCase() ? 700 : 500, color: '#1e293b' }}>
                      {p.name}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Card 2: Secondary / Accent Color */}
          <div className="portal-card" style={{ background: '#fff', borderRadius: 12, padding: 24, border: '1px solid #e2e8f0' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700, color: '#1e293b', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ width: 14, height: 14, borderRadius: '50%', background: accentColor, display: 'inline-block' }} />
                  Secondary Accent Highlight Color
                </h3>
                <p style={{ margin: '4px 0 0', color: '#64748b', fontSize: '0.8rem' }}>
                  Used for status badges, metric highlights, callouts, and secondary calls-to-action.
                </p>
              </div>
            </div>

            {/* Custom Input */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
              <div style={{ position: 'relative', width: 52, height: 44, borderRadius: 8, border: '2px solid #e2e8f0', overflow: 'hidden', flexShrink: 0, background: accentColor }}>
                <input
                  type="color"
                  value={accentColor}
                  onChange={e => setAccentColor(e.target.value)}
                  style={{ position: 'absolute', inset: -10, width: 80, height: 80, cursor: 'pointer', opacity: 0 }}
                />
              </div>
              <input
                type="text"
                value={accentColor}
                onChange={e => setAccentColor(e.target.value)}
                placeholder="#d97706"
                className="portal-input"
                style={{ width: 140, fontFamily: 'monospace', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}
              />
              <span style={{ fontSize: '0.78rem', color: '#94a3b8' }}>
                Hex color code or click swatch
              </span>
            </div>

            {/* Preset Accent Swatches */}
            <div>
              <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 10 }}>
                Harmonious Accent Presets
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: 8 }}>
                {ACCENT_PALETTES.map(a => (
                  <button
                    key={a.hex}
                    type="button"
                    onClick={() => setAccentColor(a.hex)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      padding: '8px 10px',
                      borderRadius: 8,
                      border: accentColor.toLowerCase() === a.hex.toLowerCase() ? `2px solid ${a.hex}` : '1px solid #e2e8f0',
                      background: accentColor.toLowerCase() === a.hex.toLowerCase() ? '#f8fafc' : '#ffffff',
                      cursor: 'pointer',
                      textAlign: 'left'
                    }}
                  >
                    <span style={{ width: 18, height: 18, borderRadius: 4, background: a.hex, flexShrink: 0 }} />
                    <span style={{ fontSize: '0.78rem', fontWeight: accentColor.toLowerCase() === a.hex.toLowerCase() ? 700 : 500, color: '#1e293b' }}>
                      {a.name}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Card 3: Sidebar & Header Surface Themes */}
          <div className="portal-card" style={{ background: '#fff', borderRadius: 12, padding: 24, border: '1px solid #e2e8f0' }}>
            <h3 style={{ margin: '0 0 16px', fontSize: '1.05rem', fontWeight: 700, color: '#1e293b' }}>
              Portal Surface & Layout Themes
            </h3>

            {/* Sidebar Theme Selector */}
            <div style={{ marginBottom: 20 }}>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: '#334155', marginBottom: 8 }}>
                Sidebar Navigation Style
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 10 }}>
                {[
                  { id: 'dark', label: 'Midnight Dark', color: '#0f172a', desc: 'Deep Navy (Standard)' },
                  { id: 'slate', label: 'Charcoal Slate', color: '#1e293b', desc: 'Modern Neutral' },
                  { id: 'primary', label: 'Brand Matched', color: primaryColor, desc: 'Primary School Tint' },
                  { id: 'light', label: 'Crisp Light', color: '#ffffff', desc: 'Minimalist White' }
                ].map(opt => (
                  <div
                    key={opt.id}
                    onClick={() => setSidebarTheme(opt.id as any)}
                    style={{
                      border: sidebarTheme === opt.id ? '2px solid #4f46e5' : '1px solid #e2e8f0',
                      borderRadius: 10,
                      padding: '12px 14px',
                      cursor: 'pointer',
                      background: sidebarTheme === opt.id ? '#f5f3ff' : '#ffffff',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 6
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ width: 16, height: 16, borderRadius: '50%', background: opt.color, border: '1px solid #cbd5e1' }} />
                      <strong style={{ fontSize: '0.82rem', color: '#1e293b' }}>{opt.label}</strong>
                    </div>
                    <span style={{ fontSize: '0.72rem', color: '#64748b' }}>{opt.desc}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Header Theme Selector */}
            <div style={{ marginBottom: 20 }}>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: '#334155', marginBottom: 8 }}>
                Top Navigation Bar Style
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 10 }}>
                {[
                  { id: 'white', label: 'Pure White', desc: 'Clean standard navbar' },
                  { id: 'slate', label: 'Soft Slate', desc: 'Subtle light grey' },
                  { id: 'primary-tint', label: 'Primary Tint', desc: 'Soft institutional glow' }
                ].map(opt => (
                  <div
                    key={opt.id}
                    onClick={() => setHeaderTheme(opt.id as any)}
                    style={{
                      border: headerTheme === opt.id ? '2px solid #4f46e5' : '1px solid #e2e8f0',
                      borderRadius: 10,
                      padding: '12px 14px',
                      cursor: 'pointer',
                      background: headerTheme === opt.id ? '#f5f3ff' : '#ffffff'
                    }}
                  >
                    <strong style={{ fontSize: '0.82rem', color: '#1e293b', display: 'block' }}>{opt.label}</strong>
                    <span style={{ fontSize: '0.72rem', color: '#64748b' }}>{opt.desc}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Text Alignment & Interface Mode */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              <div>
                <label className="form-label" style={{ fontWeight: 600, fontSize: '0.85rem' }}>Text & Layout Direction</label>
                <select
                  className="portal-input"
                  value={textAlignment}
                  onChange={e => setTextAlignment(e.target.value as any)}
                >
                  <option value="Left-to-right">Left-to-Right (LTR - Standard)</option>
                  <option value="Right-to-left">Right-to-Left (RTL - Arabic/Hebrew)</option>
                </select>
              </div>

              <div>
                <label className="form-label" style={{ fontWeight: 600, fontSize: '0.85rem' }}>Default Interface Mode</label>
                <select
                  className="portal-input"
                  value={mode}
                  onChange={e => setMode(e.target.value as any)}
                >
                  <option value="light">Light Mode (Academic Clean)</option>
                  <option value="dark">Dark Theme (Low Light)</option>
                </select>
              </div>
            </div>

          </div>

        </div>

        {/* RIGHT COLUMN: LIVE INTERACTIVE PREVIEW */}
        <div style={{ position: 'sticky', top: 20 }}>
          <div className="portal-card" style={{ background: '#fff', borderRadius: 12, padding: 24, border: '1px solid #e2e8f0', boxShadow: '0 4px 16px rgba(0,0,0,0.06)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Live Portal Interactive Preview
              </span>
              <span style={{ fontSize: '0.75rem', background: '#dcfce7', color: '#166534', padding: '2px 8px', borderRadius: 6, fontWeight: 700 }}>
                Instant Swatch
              </span>
            </div>

            {/* Mockup Frame */}
            <div style={{ border: '1px solid #cbd5e1', borderRadius: 10, overflow: 'hidden', boxShadow: '0 8px 24px rgba(0,0,0,0.08)' }}>
              
              {/* Header Bar */}
              <div style={{
                background: getHeaderBgPreview(),
                padding: '10px 14px',
                borderBottom: '1px solid #e2e8f0',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#ef4444' }} />
                  <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#f59e0b' }} />
                  <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#10b981' }} />
                  <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#475569', marginLeft: 6 }}>
                    {user?.schoolName || 'Acadex Institutional Portal'}
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ width: 22, height: 22, borderRadius: '50%', background: primaryColor, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.65rem', fontWeight: 800 }}>
                    AD
                  </span>
                </div>
              </div>

              {/* Body: Sidebar + Main Content */}
              <div style={{ display: 'flex', minHeight: 280 }}>
                
                {/* Mini Sidebar */}
                <div style={{
                  width: 90,
                  background: getSidebarBgPreview(),
                  padding: '12px 8px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 6,
                  borderRight: sidebarTheme === 'light' ? '1px solid #e2e8f0' : 'none'
                }}>
                  <div style={{ padding: '4px 6px', borderRadius: 6, background: primaryColor, color: '#fff', fontSize: '0.68rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 4 }}>
                    <i className="fas fa-th-large" style={{ fontSize: '0.6rem' }} /> Dashboard
                  </div>
                  <div style={{ padding: '4px 6px', borderRadius: 6, color: sidebarTheme === 'light' ? '#475569' : '#94a3b8', fontSize: '0.68rem', display: 'flex', alignItems: 'center', gap: 4 }}>
                    <i className="fas fa-user-graduate" style={{ fontSize: '0.6rem' }} /> Students
                  </div>
                  <div style={{ padding: '4px 6px', borderRadius: 6, color: sidebarTheme === 'light' ? '#475569' : '#94a3b8', fontSize: '0.68rem', display: 'flex', alignItems: 'center', gap: 4 }}>
                    <i className="fas fa-receipt" style={{ fontSize: '0.6rem' }} /> Finance
                  </div>
                  <div style={{ padding: '4px 6px', borderRadius: 6, color: sidebarTheme === 'light' ? '#475569' : '#94a3b8', fontSize: '0.68rem', display: 'flex', alignItems: 'center', gap: 4 }}>
                    <i className="fas fa-calendar-alt" style={{ fontSize: '0.6rem' }} /> Timetable
                  </div>
                </div>

                {/* Mini Page Content */}
                <div style={{ flex: 1, background: '#f8fafc', padding: 14, display: 'flex', flexDirection: 'column', gap: 10 }}>
                  
                  {/* Metric Card */}
                  <div style={{ background: '#fff', borderRadius: 8, padding: 10, border: '1px solid #e2e8f0', borderLeft: `4px solid ${primaryColor}` }}>
                    <div style={{ fontSize: '0.65rem', color: '#64748b' }}>Active Term Enrollment</div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 2 }}>
                      <strong style={{ fontSize: '0.95rem', color: '#1e293b' }}>1,280 Students</strong>
                      <span style={{ fontSize: '0.62rem', background: `${accentColor}20`, color: accentColor, padding: '2px 6px', borderRadius: 4, fontWeight: 700 }}>
                        +8.4%
                      </span>
                    </div>
                  </div>

                  {/* Button Swatches */}
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    <button
                      type="button"
                      style={{
                        padding: '6px 12px',
                        borderRadius: 6,
                        border: 'none',
                        background: primaryColor,
                        color: '#fff',
                        fontSize: '0.7rem',
                        fontWeight: 700
                      }}
                    >
                      Primary Action
                    </button>
                    <button
                      type="button"
                      style={{
                        padding: '6px 12px',
                        borderRadius: 6,
                        border: 'none',
                        background: accentColor,
                        color: '#fff',
                        fontSize: '0.7rem',
                        fontWeight: 700
                      }}
                    >
                      Accent Badge
                    </button>
                  </div>

                  {/* Table Sample */}
                  <div style={{ background: '#fff', borderRadius: 6, border: '1px solid #e2e8f0', overflow: 'hidden', marginTop: 'auto' }}>
                    <div style={{ background: `${primaryColor}12`, padding: '4px 8px', fontSize: '0.65rem', fontWeight: 800, color: primaryColor, display: 'flex', justifyContent: 'space-between' }}>
                      <span>Class / Form</span>
                      <span>Attendance</span>
                    </div>
                    <div style={{ padding: '4px 8px', fontSize: '0.62rem', color: '#334155', display: 'flex', justifyContent: 'space-between' }}>
                      <span>Grade 7 Red</span>
                      <strong style={{ color: '#16a34a' }}>98.2%</strong>
                    </div>
                  </div>

                </div>

              </div>

            </div>

            <div style={{ marginTop: 16, textAlign: 'center' }}>
              <button
                type="submit"
                disabled={saving}
                style={{
                  width: '100%',
                  padding: '12px',
                  background: primaryColor,
                  color: '#fff',
                  border: 'none',
                  borderRadius: 8,
                  fontWeight: 700,
                  fontSize: '0.9rem',
                  cursor: saving ? 'not-allowed' : 'pointer'
                }}
              >
                {saving ? 'Saving Changes...' : 'Save & Deploy Theme'}
              </button>
            </div>

          </div>
        </div>

      </div>
    </form>
  );
}
