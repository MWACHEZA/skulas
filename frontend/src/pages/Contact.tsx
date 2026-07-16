import React, { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useSchool } from '../components/layout/Layout';
import { useToast } from '../context/ToastContext';
import api from '../lib/api';

export default function Contact() {
  const school = useSchool();
  const { schoolCode } = useParams<{ schoolCode: string }>();
  const { showToast } = useToast();
  const [submitting, setSubmitting] = useState(false);

  const primary = school?.branding?.primaryColor || '#1e3a8a';

  const schoolName = school?.name || 'our school';
  const address   = school?.schoolSetting?.address   || school?.address;
  const phone     = school?.schoolSetting?.phone     || school?.phone;
  const email     = school?.schoolSetting?.systemEmail || school?.email;

  const facebook  = school?.schoolSetting?.facebook  || school?.branding?.facebook;
  const twitter   = school?.schoolSetting?.twitter   || school?.branding?.twitter;
  const linkedin  = school?.schoolSetting?.linkedin  || school?.branding?.linkedin;
  const instagram = school?.schoolSetting?.instagram;
  const youtube   = school?.schoolSetting?.youtube;
  const tiktok    = school?.schoolSetting?.tiktok;

  const hasSocial = facebook || twitter || linkedin || instagram || youtube || tiktok;

  const handleFormSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSubmitting(true);
    const fd = new FormData(e.currentTarget);
    const payload = {
      name:       fd.get('name'),
      email:      fd.get('email'),
      phone:      fd.get('phone') || '',
      message:    `[Subject: ${fd.get('subject')}] ${fd.get('message')}`,
      schoolCode: schoolCode || school?.code
    };
    try {
      await api.post('/api/public/inquiries', payload);
      showToast('Your message has been sent successfully!', 'success');
      (e.target as HTMLFormElement).reset();
    } catch (err) {
      console.error(err);
      showToast('Failed to send message. Please try again.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const infoPanelStyle: React.CSSProperties = {
    display: 'flex', alignItems: 'flex-start', gap: '16px',
    padding: '20px', borderRadius: '12px',
    background: 'rgba(255,255,255,0.07)',
    border: '1px solid rgba(255,255,255,0.1)'
  };
  const iconWrapStyle: React.CSSProperties = {
    width: '44px', height: '44px', borderRadius: '12px',
    background: 'rgba(255,255,255,0.12)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    flexShrink: 0, fontSize: '17px', color: 'white'
  };

  const code = (schoolCode || school?.code || '').toUpperCase();
  const settings = (school as any)?.websiteSettings;
  const bannerImage = settings?.bannerImage;
  const bannerStyle = bannerImage 
    ? { backgroundImage: `linear-gradient(rgba(0, 0, 0, 0.6), rgba(0, 0, 0, 0.6)), url(${api.defaults.baseURL}/api/storage/media/${code}/${bannerImage})`, backgroundSize: 'cover', backgroundPosition: 'center', padding: '80px 0', color: 'white', textAlign: 'center' as const }
    : { background: 'linear-gradient(135deg, var(--school-primary, #1e3a8a) 0%, var(--school-accent, #3b82f6) 100%)', padding: '80px 0', color: 'white', textAlign: 'center' as const };

  return (
    <>
      {/* Hero Banner */}
      <section className="page-banner" style={bannerStyle}>
        <div className="container">
          <h1 id="hero-title" style={{ fontSize: '2.5rem', fontWeight: 800, marginBottom: '12px', color: 'var(--banner-title-color, white)' }}>Contact Us</h1>
          <p id="hero-subtitle" style={{ fontSize: '1.1rem', opacity: 0.9, maxWidth: '560px', margin: '0 auto' }}>
            Get in touch with <strong>{schoolName}</strong> — we're here to help.
          </p>
        </div>
      </section>

      {/* Main Contact Section */}
      <section style={{ padding: '70px 0', backgroundColor: '#f8fafc' }}>
        <div className="container" style={{ display: 'grid', gridTemplateColumns: '1fr 1.4fr', gap: '40px', alignItems: 'start' }}>

          {/* Left: Contact Info */}
          <div style={{ background: `linear-gradient(160deg, ${primary} 0%, #1e40af 100%)`, borderRadius: '20px', padding: '40px', color: 'white' }}>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: '10px' }}>Contact Information</h2>
            <p style={{ opacity: 0.8, fontSize: '0.9rem', marginBottom: '35px', lineHeight: 1.6 }}>
              Have questions about admissions, events, or anything else? Reach out through any of the methods below.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', marginBottom: '35px' }}>
              {address && (
                <div style={infoPanelStyle}>
                  <div style={iconWrapStyle}><i className="fas fa-map-marker-alt"></i></div>
                  <div>
                    <p style={{ margin: '0 0 4px 0', fontWeight: 700, fontSize: '0.85rem', opacity: 0.7, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Location</p>
                    <p style={{ margin: 0, fontSize: '0.95rem' }}>{address}</p>
                  </div>
                </div>
              )}
              {phone && (
                <div style={infoPanelStyle}>
                  <div style={iconWrapStyle}><i className="fas fa-phone"></i></div>
                  <div>
                    <p style={{ margin: '0 0 4px 0', fontWeight: 700, fontSize: '0.85rem', opacity: 0.7, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Phone</p>
                    <p style={{ margin: 0, fontSize: '0.95rem' }}>{phone}</p>
                  </div>
                </div>
              )}
              {email && (
                <div style={infoPanelStyle}>
                  <div style={iconWrapStyle}><i className="fas fa-envelope"></i></div>
                  <div>
                    <p style={{ margin: '0 0 4px 0', fontWeight: 700, fontSize: '0.85rem', opacity: 0.7, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Email</p>
                    <p style={{ margin: 0, fontSize: '0.95rem' }}>{email}</p>
                  </div>
                </div>
              )}
              {!address && !phone && !email && (
                <div style={infoPanelStyle}>
                  <div style={iconWrapStyle}><i className="fas fa-school"></i></div>
                  <div>
                    <p style={{ margin: 0, fontSize: '0.95rem', opacity: 0.85 }}>{schoolName}</p>
                    <p style={{ margin: '4px 0 0 0', fontSize: '0.85rem', opacity: 0.65 }}>Contact details will appear here once set in System Settings.</p>
                  </div>
                </div>
              )}
            </div>

            {/* Social Links */}
            <div style={{ borderTop: '1px solid rgba(255,255,255,0.15)', paddingTop: '25px' }}>
              <p style={{ margin: '0 0 15px 0', fontSize: '0.85rem', fontWeight: 700, opacity: 0.7, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Follow Us</p>
              <div style={{ display: 'flex', gap: '12px' }}>
                {hasSocial ? (
                  <>
                    {facebook  && <a href={facebook}  target="_blank" rel="noopener noreferrer" style={{ width: '38px', height: '38px', borderRadius: '50%', background: 'rgba(255,255,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', textDecoration: 'none' }}><i className="fab fa-facebook-f"></i></a>}
                    {twitter   && <a href={twitter}   target="_blank" rel="noopener noreferrer" style={{ width: '38px', height: '38px', borderRadius: '50%', background: 'rgba(255,255,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', textDecoration: 'none' }}><i className="fab fa-twitter"></i></a>}
                    {instagram && <a href={instagram} target="_blank" rel="noopener noreferrer" style={{ width: '38px', height: '38px', borderRadius: '50%', background: 'rgba(255,255,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', textDecoration: 'none' }}><i className="fab fa-instagram"></i></a>}
                    {linkedin  && <a href={linkedin}  target="_blank" rel="noopener noreferrer" style={{ width: '38px', height: '38px', borderRadius: '50%', background: 'rgba(255,255,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', textDecoration: 'none' }}><i className="fab fa-linkedin-in"></i></a>}
                    {youtube   && <a href={youtube}   target="_blank" rel="noopener noreferrer" style={{ width: '38px', height: '38px', borderRadius: '50%', background: 'rgba(255,255,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', textDecoration: 'none' }}><i className="fab fa-youtube"></i></a>}
                    {tiktok    && <a href={tiktok}    target="_blank" rel="noopener noreferrer" style={{ width: '38px', height: '38px', borderRadius: '50%', background: 'rgba(255,255,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', textDecoration: 'none' }}><i className="fab fa-tiktok"></i></a>}
                  </>
                ) : (
                  <>
                    {['fa-facebook-f', 'fa-twitter', 'fa-instagram'].map(ic => (
                      <a key={ic} href="#" style={{ width: '38px', height: '38px', borderRadius: '50%', background: 'rgba(255,255,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', textDecoration: 'none' }}><i className={`fab ${ic}`}></i></a>
                    ))}
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Right: Contact Form */}
          <div style={{ background: 'white', borderRadius: '20px', padding: '40px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.04)' }}>
            <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#0f172a', marginBottom: '8px' }}>Send Us a Message</h2>
            <p style={{ color: '#64748b', fontSize: '0.9rem', marginBottom: '30px' }}>Fill out the form below and we'll get back to you as soon as possible.</p>

            <form id="contactForm" onSubmit={handleFormSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                <div>
                  <label htmlFor="name" style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#374151', marginBottom: '6px' }}>Full Name *</label>
                  <input type="text" id="name" name="name" required
                    style={{ width: '100%', padding: '11px 14px', border: '1.5px solid #e2e8f0', borderRadius: '10px', fontSize: '0.95rem', color: '#1e293b', outline: 'none', boxSizing: 'border-box', transition: 'border-color 0.2s' }}
                    onFocus={e => e.target.style.borderColor = '#3b82f6'}
                    onBlur={e => e.target.style.borderColor = '#e2e8f0'}
                  />
                </div>
                <div>
                  <label htmlFor="email" style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#374151', marginBottom: '6px' }}>Email Address *</label>
                  <input type="email" id="email" name="email" required
                    style={{ width: '100%', padding: '11px 14px', border: '1.5px solid #e2e8f0', borderRadius: '10px', fontSize: '0.95rem', color: '#1e293b', outline: 'none', boxSizing: 'border-box', transition: 'border-color 0.2s' }}
                    onFocus={e => e.target.style.borderColor = '#3b82f6'}
                    onBlur={e => e.target.style.borderColor = '#e2e8f0'}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                <div>
                  <label htmlFor="phone" style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#374151', marginBottom: '6px' }}>Phone Number</label>
                  <input type="tel" id="phone" name="phone"
                    style={{ width: '100%', padding: '11px 14px', border: '1.5px solid #e2e8f0', borderRadius: '10px', fontSize: '0.95rem', color: '#1e293b', outline: 'none', boxSizing: 'border-box', transition: 'border-color 0.2s' }}
                    onFocus={e => e.target.style.borderColor = '#3b82f6'}
                    onBlur={e => e.target.style.borderColor = '#e2e8f0'}
                  />
                </div>
                <div>
                  <label htmlFor="subject" style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#374151', marginBottom: '6px' }}>Subject *</label>
                  <select id="subject" name="subject" required
                    style={{ width: '100%', padding: '11px 14px', border: '1.5px solid #e2e8f0', borderRadius: '10px', fontSize: '0.95rem', color: '#1e293b', outline: 'none', boxSizing: 'border-box', background: 'white', transition: 'border-color 0.2s' }}
                    onFocus={e => e.target.style.borderColor = '#3b82f6'}
                    onBlur={e => e.target.style.borderColor = '#e2e8f0'}
                  >
                    <option value="">Select a subject</option>
                    <option value="admission">Admission Inquiry</option>
                    <option value="event">Event Information</option>
                    <option value="academic">Academic Enquiry</option>
                    <option value="alumni">Alumni Relations</option>
                    <option value="feedback">Feedback</option>
                    <option value="other">Other</option>
                  </select>
                </div>
              </div>

              <div>
                <label htmlFor="message" style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#374151', marginBottom: '6px' }}>Message *</label>
                <textarea id="message" name="message" required rows={5}
                  style={{ width: '100%', padding: '11px 14px', border: '1.5px solid #e2e8f0', borderRadius: '10px', fontSize: '0.95rem', color: '#1e293b', outline: 'none', boxSizing: 'border-box', resize: 'vertical', fontFamily: 'inherit', transition: 'border-color 0.2s' }}
                  onFocus={e => e.target.style.borderColor = '#3b82f6'}
                  onBlur={e => e.target.style.borderColor = '#e2e8f0'}
                  placeholder="Write your message here..."
                ></textarea>
              </div>

              <button type="submit" disabled={submitting}
                style={{
                  padding: '13px 30px', background: submitting ? '#94a3b8' : `linear-gradient(135deg, ${primary}, #3b82f6)`,
                  color: 'white', border: 'none', borderRadius: '10px',
                  fontWeight: 700, fontSize: '1rem', cursor: submitting ? 'not-allowed' : 'pointer',
                  transition: 'all 0.2s', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px'
                }}>
                {submitting ? (
                  <><i className="fas fa-spinner fa-spin"></i> Sending...</>
                ) : (
                  <><i className="fas fa-paper-plane"></i> Send Message</>
                )}
              </button>
            </form>
          </div>
        </div>
      </section>

      {/* Map Section */}
      {address && (
        <div style={{ height: '380px', width: '100%' }}>
          <iframe
            src={`https://maps.google.com/maps?q=${encodeURIComponent(address)}&t=&z=13&ie=UTF8&iwloc=&output=embed`}
            allowFullScreen
            loading="lazy"
            title="School Map"
            style={{ width: '100%', height: '100%', border: 'none', display: 'block' }}
          ></iframe>
        </div>
      )}
    </>
  );
}
