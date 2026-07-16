import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useSchool } from '../components/layout/Layout';
import api from '../lib/api';

// ── Hero Section ──────────────────────────────────────────────────────────────
function Hero() {
  const school = useSchool();
  const { schoolCode } = useParams<{ schoolCode: string }>();
  const code = (schoolCode || school?.code || '').toUpperCase();
  const base = code ? `/school/${code}` : '/';

  const websiteSettings = (school as any)?.websiteSettings;
  const name    = school?.name    || '';
  const motto   = school?.branding?.motto || '';
  const content = school?.customContent as any;

  // Banner details from settings
  const heroTitle = websiteSettings?.bannerTitle || (name ? `Welcome to ${name}` : 'Welcome');
  const heroTitleColor = websiteSettings?.bannerTitleColor || '#ffffff';
  const heroBg = websiteSettings?.bannerImage 
    ? `url(${api.defaults.baseURL}/api/storage/media/${code}/${websiteSettings.bannerImage})`
    : undefined;

  // Calculate Years of Excellence dynamically from the current year and establishment year
  const estYear = parseInt(websiteSettings?.yearOfEstablishment || '', 10);
  const yearsOfExcellence = (!isNaN(estYear) && estYear > 0)
    ? `${new Date().getFullYear() - estYear}+`
    : (content?.statYears || '15+');

  return (
    <section 
      className="hero" 
      style={{
        backgroundImage: heroBg || 'linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%)', 
        backgroundSize: 'cover', 
        backgroundPosition: 'center',
        position: 'relative',
        padding: '120px 0 100px 0',
        color: 'white',
        textAlign: 'center'
      }}
    >
      <div style={{
        position: 'absolute',
        top: 0, left: 0, right: 0, bottom: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.65)',
        zIndex: 1
      }}></div>
      <div className="container" style={{ position: 'relative', zIndex: 2 }}>
        <div className="hero-content" style={{ maxWidth: '800px', margin: '0 auto' }}>
          <h1 id="hero-title" style={{ color: heroTitleColor, fontSize: '3rem', fontWeight: 800, marginBottom: '20px', lineHeight: 1.2 }}>{heroTitle}</h1>
          {motto && <p className="school-motto" id="school-motto" style={{ fontSize: '1.25rem', fontStyle: 'italic', marginBottom: '20px', color: '#93c5fd' }}>"{motto}"</p>}
          <p id="hero-subtitle" style={{ fontSize: '1.1rem', marginBottom: '40px', opacity: 0.9, lineHeight: 1.6 }}>
            {websiteSettings?.bannerSubTitleOne || content?.heroSubtitle || 'Nurturing minds, building character, and inspiring excellence.'}
          </p>

          <div className="stats-container" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '20px', marginBottom: '50px' }}>
            <div className="stat-item" style={{ background: 'rgba(255,255,255,0.1)', padding: '20px', borderRadius: '12px', backdropFilter: 'blur(8px)' }}>
              <div className="stat-number" style={{ fontSize: '2rem', fontWeight: 800 }}>
                {yearsOfExcellence}
              </div>
              <div className="stat-label" style={{ fontSize: '0.85rem', opacity: 0.8 }}>Years of Excellence</div>
            </div>
            <div className="stat-item" style={{ background: 'rgba(255,255,255,0.1)', padding: '20px', borderRadius: '12px', backdropFilter: 'blur(8px)' }}>
              <div className="stat-number" style={{ fontSize: '2rem', fontWeight: 800 }}>
                {school?.sportsCount !== undefined ? school.sportsCount : (content?.statSports || '8+')}
              </div>
              <div className="stat-label" style={{ fontSize: '0.85rem', opacity: 0.8 }}>Sports Teams</div>
            </div>
            <div className="stat-item" style={{ background: 'rgba(255,255,255,0.1)', padding: '20px', borderRadius: '12px', backdropFilter: 'blur(8px)' }}>
              <div className="stat-number" style={{ fontSize: '2rem', fontWeight: 800 }}>
                {school?.clubsCount !== undefined ? school.clubsCount : (content?.statClubs || '12+')}
              </div>
              <div className="stat-label" style={{ fontSize: '0.85rem', opacity: 0.8 }}>Registered Student Clubs</div>
            </div>
          </div>

          {/* Banner sub-contents list if set in website settings */}
          {(websiteSettings?.bannerSubTitleTwo || websiteSettings?.bannerSubTitleThree) && (
            <div className="banner-sub-cards" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px', marginBottom: '40px', textAlign: 'left' }}>
              {websiteSettings?.bannerSubTitleTwo && (
                <div className="sub-card" style={{ background: 'rgba(255, 255, 255, 0.1)', backdropFilter: 'blur(12px)', padding: '24px', borderRadius: '16px', border: '1px solid rgba(255, 255, 255, 0.2)' }}>
                  <h4 style={{ color: '#fff', fontSize: '1.1rem', fontWeight: 800, marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <i className="fas fa-check-circle" style={{ color: '#4ade80' }}></i> {websiteSettings.bannerSubTitleTwo}
                  </h4>
                  <p style={{ color: 'rgba(255, 255, 255, 0.85)', fontSize: '0.875rem', lineHeight: 1.6, margin: 0 }}>{websiteSettings.bannerSubContentTwo}</p>
                </div>
              )}
              {websiteSettings?.bannerSubTitleThree && (
                <div className="sub-card" style={{ background: 'rgba(255, 255, 255, 0.1)', backdropFilter: 'blur(12px)', padding: '24px', borderRadius: '16px', border: '1px solid rgba(255, 255, 255, 0.2)' }}>
                  <h4 style={{ color: '#fff', fontSize: '1.1rem', fontWeight: 800, marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <i className="fas fa-star" style={{ color: '#facc15' }}></i> {websiteSettings.bannerSubTitleThree}
                  </h4>
                  <p style={{ color: 'rgba(255, 255, 255, 0.85)', fontSize: '0.875rem', lineHeight: 1.6, margin: 0 }}>{websiteSettings.bannerSubContentThree}</p>
                </div>
              )}
            </div>
          )}

          <div className="hero-buttons" style={{ display: 'flex', gap: '15px', justifyContent: 'center' }}>
            <Link to={`${base}/about`} className="btn btn-primary" style={{ padding: '12px 30px', background: '#3b82f6', color: 'white', borderRadius: '8px', fontWeight: 600, textDecoration: 'none' }}>Learn More</Link>
            <Link to={`${base}/contact`} className="btn btn-secondary" style={{ padding: '12px 30px', background: 'transparent', color: 'white', border: '2px solid white', borderRadius: '8px', fontWeight: 600, textDecoration: 'none' }}>Contact Us</Link>
          </div>
        </div>
      </div>
    </section>
  );
}

// ── About / Welcome Section ───────────────────────────────────────────────────
function AboutSection() {
  const school = useSchool();
  const websiteSettings = (school as any)?.websiteSettings;
  const content = school?.customContent as any;

  const aboutHeading = websiteSettings?.aboutTitle || content?.aboutHeading || (school?.name ? `About ${school.name}` : 'About Us');
  const aboutText = websiteSettings?.aboutUsContent || content?.aboutText;

  if (!aboutText) return null;

  return (
    <section style={{ padding: '80px 0', backgroundColor: '#fff' }}>
      <div className="container">
        <div className="section-header" style={{ textAlign: 'center', marginBottom: '40px' }}>
          <h2 style={{ fontSize: '2.25rem', color: '#1e293b', fontWeight: 700, marginBottom: '20px' }}>{aboutHeading}</h2>
          <p style={{ maxWidth: '800px', margin: '0 auto', color: '#475569', fontSize: '1.1rem', lineHeight: 1.8, whiteSpace: 'pre-wrap' }}>
            {aboutText}
          </p>
        </div>
      </div>
    </section>
  );
}

// ── Portals & Digital Capabilities Section ────────────────────────────────────
function PortalsSection() {
  const school = useSchool();

  const portalCards = [
    {
      title: 'Admin Portal',
      description: 'Manage school settings, departments, users, and oversee all institutional operations.',
      icon: 'fa-user-shield',
      color: '#94a3b8',
      badge: 'Integrated',
      to: '/admin/login'
    },
    {
      title: 'Teacher Portal',
      description: 'Mark student attendance daily, enter test/exam grades, publish assignments, and upload digital learning materials.',
      icon: 'fa-chalkboard-teacher',
      color: '#fbbf24',
      badge: 'Integrated',
      to: '/teacher/login'
    },
    {
      title: 'Student Portal',
      description: 'Access digital lesson plans, take Computer Based Tests (CBT), submit assignments, and review performance metrics.',
      icon: 'fa-graduation-cap',
      color: '#34d399',
      badge: 'Integrated',
      to: '/student/login'
    },
    {
      title: 'Parent Portal',
      description: 'Track academic performance, review terminal report cards, pay fees online, and stay in direct contact with teachers.',
      icon: 'fa-home',
      color: '#60a5fa',
      badge: 'Integrated',
      to: '/parent/login'
    },
    {
      title: 'Bursar & Finance',
      description: 'Review fee payment updates, generate invoices, record expenditures, and access visual profit and loss statements.',
      icon: 'fa-money-check-alt',
      color: '#c084fc',
      badge: 'Integrated',
      to: '/bursar/login'
    },
    {
      title: 'Digital Library',
      description: 'Browse the catalog of available publications, request reserves, and monitor book issue and return timelines.',
      icon: 'fa-book',
      color: '#f472b6',
      badge: 'Integrated',
      to: '/librarian/login'
    },
    {
      title: 'Clinic Portal',
      description: 'Manage student health records, record immunisations, handle referrals, and report clinical emergencies.',
      icon: 'fa-user-md',
      color: '#10b981',
      badge: 'Integrated',
      to: '/clinic/login'
    },
    {
      title: 'Alumni Portal',
      description: 'Connect former students, manage reunions, and coordinate school developmental support.',
      icon: 'fa-user-tie',
      color: '#fb923c',
      badge: 'Integrated',
      to: '/alumni/login'
    },
    {
      title: 'Supplier Portal',
      description: 'Submit contract bids, review procurement requests, and verify shipment delivery statuses securely.',
      icon: 'fa-truck',
      color: '#22d3ee',
      badge: 'Integrated',
      to: '/supplier/login'
    },
    {
      title: 'Ancillary Portal',
      description: 'Orchestrate hostel room allocations, dining menus, transport logs, and boarding facility logistics.',
      icon: 'fa-hands-helping',
      color: '#38bdf8',
      badge: 'Integrated',
      to: '/ancillary/login'
    }
  ];

  return (
    <section style={{ padding: '80px 0', backgroundColor: '#f8fafc' }}>
      <div className="container">
        <div className="section-header" style={{ textAlign: 'center', marginBottom: '50px' }}>
          <h2 style={{ fontSize: '2.25rem', color: '#1e293b', fontWeight: 700, marginBottom: '15px' }}>Unified Portals &amp; Digital Capabilities</h2>
          <p style={{ maxWidth: '700px', margin: '0 auto', color: '#64748b', fontSize: '1.05rem', lineHeight: 1.6 }}>
            Our school platform runs on ACADEX, offering interconnected workflows for parents, students, staff, and partners.
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '30px' }}>
          {portalCards.map((p, idx) => (
            <div 
              key={idx}
              className="portal-showcase-card"
              style={{
                background: 'white',
                borderRadius: '16px',
                padding: '30px',
                border: '1px solid #e2e8f0',
                boxShadow: '0 4px 6px -1px rgba(0,0,0,0.02), 0 2px 4px -1px rgba(0,0,0,0.02)',
                transition: 'transform 0.3s ease, box-shadow 0.3s ease',
                position: 'relative',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                height: '100%'
              }}
            >
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                  <div style={{
                    width: '50px',
                    height: '50px',
                    borderRadius: '12px',
                    background: `${p.color}15`,
                    color: p.color,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '22px'
                  }}>
                    <i className={`fas ${p.icon}`}></i>
                  </div>
                  <span style={{ fontSize: '0.75rem', background: '#f1f5f9', color: '#475569', padding: '4px 10px', borderRadius: '20px', fontWeight: 600 }}>{p.badge}</span>
                </div>
                <h3 style={{ fontSize: '1.25rem', color: '#0f172a', fontWeight: 700, marginBottom: '12px' }}>{p.title}</h3>
                <p style={{ color: '#475569', fontSize: '0.95rem', lineHeight: 1.6, margin: 0 }}>{p.description}</p>
              </div>

              <div style={{ marginTop: '25px', borderTop: '1px solid #f1f5f9', paddingTop: '15px' }}>
                <Link 
                  to={p.to} 
                  style={{
                    color: p.color,
                    textDecoration: 'none',
                    fontWeight: 600,
                    fontSize: '0.9rem',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                >
                  Access Portal <i className="fas fa-arrow-right" style={{ fontSize: '11px' }}></i>
                </Link>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ── Academic Departments Showcase Section ────────────────────────────────────
function DepartmentsShowcase() {
  const school = useSchool();
  const { schoolCode } = useParams<{ schoolCode: string }>();
  const code = (schoolCode || school?.code || '').toUpperCase();
  const base = code ? `/school/${code}` : '/';

  const [departments, setDepartments] = useState<any[]>([]);

  useEffect(() => {
    if (!code) return;
    api.get(`/api/public/schools/${code}/departments`)
      .then(res => setDepartments(res.data || []))
      .catch(err => console.error(err));
  }, [code]);

  if (departments.length === 0) {
    // Render static fallback cards
    return (
      <section style={{ padding: '80px 0', background: 'white' }}>
        <div className="container">
          <div className="section-header" style={{ textAlign: 'center', marginBottom: '50px' }}>
            <h2 style={{ fontSize: '2.25rem', color: '#1e293b', fontWeight: 700, marginBottom: '15px' }}>Academic Excellence</h2>
            <p style={{ maxWidth: '700px', margin: '0 auto', color: '#64748b', fontSize: '1.05rem' }}>Discover our specialized departments dedicated to nurturing talent.</p>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '30px' }}>
            {['Sciences', 'Humanities', 'ICT & Technicals', 'Arts & Culture'].map((deptName, idx) => (
              <div key={idx} style={{ background: '#f8fafc', padding: '30px', borderRadius: '16px', border: '1px solid #e2e8f0', textAlign: 'center' }}>
                <div style={{ fontSize: '30px', color: '#3b82f6', marginBottom: '15px' }}>
                  <i className={idx % 3 === 0 ? "fas fa-flask" : idx % 3 === 1 ? "fas fa-book-reader" : "fas fa-laptop-code"}></i>
                </div>
                <h3 style={{ fontSize: '1.2rem', color: '#0f172a', fontWeight: 700, marginBottom: '10px' }}>{deptName}</h3>
                <Link to={`${base}/departments`} style={{ color: '#3b82f6', textDecoration: 'none', fontWeight: 600, fontSize: '0.9rem' }}>
                  Explore Details &rarr;
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>
    );
  }

  return (
    <section style={{ padding: '80px 0', background: 'white' }}>
      <div className="container">
        <div className="section-header" style={{ textAlign: 'center', marginBottom: '50px' }}>
          <h2 style={{ fontSize: '2.25rem', color: '#1e293b', fontWeight: 700, marginBottom: '15px' }}>Registered Academic Departments</h2>
          <p style={{ maxWidth: '700px', margin: '0 auto', color: '#64748b', fontSize: '1.05rem' }}>
            Meet our specialized branches of learning and faculty leaders.
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '30px' }}>
          {departments.map((dept, idx) => (
            <div 
              key={dept.id} 
              style={{ 
                background: '#f8fafc', 
                padding: '30px', 
                borderRadius: '16px', 
                border: '1px solid #e2e8f0',
                transition: 'transform 0.3s ease',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between'
              }}
              className="dept-showcase-card"
            >
              <div>
                <div style={{ width: '48px', height: '48px', borderRadius: '10px', background: '#3b82f615', color: '#3b82f6', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px', marginBottom: '20px' }}>
                  <i className={idx % 3 === 0 ? "fas fa-flask" : idx % 3 === 1 ? "fas fa-book-reader" : "fas fa-laptop-code"}></i>
                </div>
                <h3 style={{ fontSize: '1.25rem', color: '#0f172a', fontWeight: 700, marginBottom: '8px' }}>{dept.name}</h3>
                <p style={{ color: '#64748b', fontSize: '0.875rem', marginBottom: '20px' }}>Code: {dept.code}</p>

                {dept.head && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', background: 'white', padding: '10px 15px', borderRadius: '10px', border: '1px solid #edf2f7', marginBottom: '15px' }}>
                    <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#3b82f6', textTransform: 'uppercase' }}>HOD</div>
                    <div style={{ fontSize: '0.9rem', fontWeight: 600, color: '#475569' }}>{dept.head.name}</div>
                  </div>
                )}
              </div>

              <Link 
                to={`${base}/departments`} 
                style={{ 
                  color: '#3b82f6', 
                  textDecoration: 'none', 
                  fontWeight: 600, 
                  fontSize: '0.9rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '5px',
                  marginTop: '15px'
                }}
              >
                View Hierarchy &amp; Labs <i className="fas fa-arrow-right" style={{ fontSize: '11px' }}></i>
              </Link>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ── Admissions Guide Section ──────────────────────────────────────────────────
function AdmissionsGuide() {
  const school = useSchool();
  const { schoolCode } = useParams<{ schoolCode: string }>();
  const code = (schoolCode || school?.code || '').toUpperCase();
  const base = code ? `/school/${code}` : '/';

  const steps = [
    {
      step: '1',
      title: 'Complete Profile Details',
      desc: 'Fill out the digital application form. Provide basic demographic info, and select the target grade/class or year of study.'
    },
    {
      step: '2',
      title: 'Submit Required Documents',
      desc: 'Securely upload clear scan copies of the applicant birth certificate, latest academic report card, and parent/guardian IDs.'
    },
    {
      step: '3',
      title: 'Submit Fee Transaction',
      desc: 'Process the online application fee securely through our bursary transaction vault to finalize validation queues.'
    },
    {
      step: '4',
      title: 'Receive Approval Alert',
      desc: 'Monitor application review updates. You will receive email/SMS notifications once the registrar issues acceptance letters.'
    }
  ];

  return (
    <section style={{ padding: '80px 0', backgroundColor: '#f8fafc' }}>
      <div className="container">
        <div className="section-header" style={{ textAlign: 'center', marginBottom: '50px' }}>
          <h2 style={{ fontSize: '2.25rem', color: '#1e293b', fontWeight: 700, marginBottom: '15px' }}>Online Admission &amp; Enrollment Guide</h2>
          <p style={{ maxWidth: '700px', margin: '0 auto', color: '#64748b', fontSize: '1.05rem' }}>
            Register new pupils through our digital queueing system in four straightforward steps.
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '30px', marginBottom: '40px' }}>
          {steps.map((s, idx) => (
            <div key={idx} style={{ background: 'white', padding: '30px', borderRadius: '16px', border: '1px solid #e2e8f0', position: 'relative' }}>
              <div style={{
                position: 'absolute',
                top: '-15px',
                left: '30px',
                width: '35px',
                height: '35px',
                borderRadius: '50%',
                background: '#3b82f6',
                color: 'white',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 700,
                fontSize: '1rem',
                boxShadow: '0 4px 6px rgba(59, 130, 246, 0.3)'
              }}>
                {s.step}
              </div>
              <h3 style={{ fontSize: '1.15rem', color: '#0f172a', fontWeight: 700, marginTop: '10px', marginBottom: '12px' }}>{s.title}</h3>
              <p style={{ color: '#475569', fontSize: '0.9rem', lineHeight: 1.6, margin: 0 }}>{s.desc}</p>
            </div>
          ))}
        </div>

        <div style={{ textAlign: 'center' }}>
          <Link to={`${base}/apply`} className="btn btn-primary" style={{ padding: '12px 35px', background: '#3b82f6', color: 'white', borderRadius: '8px', fontWeight: 600, textDecoration: 'none', boxShadow: '0 4px 12px rgba(59, 130, 246, 0.2)' }}>
            Start Application Online
          </Link>
        </div>
      </div>
    </section>
  );
}

// ── Campus Gallery Section ───────────────────────────────────────────────────
function CampusSection() {
  const school = useSchool();
  const settings = (school as any)?.websiteSettings;
  const { schoolCode } = useParams<{ schoolCode: string }>();
  const code = (schoolCode || school?.code || '').toUpperCase();
  const [galleryImages, setGalleryImages] = useState<string[]>([]);

  useEffect(() => {
    if (!code) return;
    api.get(`/api/schools/${code}/content`)
      .then(res => {
        const gallery = res.data.gallery || [];
        const images = gallery
          .map((item: any) => item.coverImage)
          .filter(Boolean)
          .slice(0, 5);
        setGalleryImages(images);
      })
      .catch(err => console.error('Failed to load gallery items for home page', err));
  }, [code]);

  if (!settings?.campusTitle && !settings?.campusContent) return null;

  return (
    <section className="campus-section" style={{ padding: '80px 0', backgroundColor: 'white' }}>
      <div className="container">
        <div className="section-header" style={{ textAlign: 'center', marginBottom: '40px' }}>
          <h2 style={{ fontSize: '2.25rem', color: '#1e293b', fontWeight: 700 }}>{settings.campusTitle}</h2>
          <p style={{ maxWidth: '800px', margin: '0 auto', color: '#64748b', fontSize: '1.1rem', lineHeight: 1.6 }}>
            {settings.campusContent}
          </p>
        </div>
        {galleryImages.length > 0 && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '24px', marginTop: '40px' }}>
            {galleryImages.map((imgName: string, idx: number) => {
              const imgUrl = `${api.defaults.baseURL}/api/storage/media/${code}/${imgName}`;
              return (
                <div key={idx} className="campus-img-card" style={{ height: '280px', borderRadius: '16px', overflow: 'hidden', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.05), 0 4px 6px -4px rgba(0, 0, 0, 0.05)', transition: 'transform 0.3s' }}>
                  <img src={imgUrl} alt={`Campus ${idx + 1}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                </div>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}

// ── News Highlights ───────────────────────────────────────────────────────────
function NewsHighlights() {
  const school = useSchool();
  const { schoolCode } = useParams<{ schoolCode: string }>();
  const code = (schoolCode || school?.code || '').toUpperCase();
  const base = code ? `/school/${code}` : '/';
  const planFeatures: string[] = school?.plan?.features ?? [];
  const hasNews = !planFeatures.length || planFeatures.includes('news');
  if (!hasNews) return null;

  return (
    <section className="news-highlights" style={{ padding: '80px 0', backgroundColor: '#f8fafc' }}>
      <div className="container">
        <div className="section-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
          <h2 style={{ fontSize: '2.25rem', color: '#1e293b', fontWeight: 700 }}>Latest News &amp; Bulletins</h2>
          <Link to={`${base}/news`} className="view-all" style={{ color: '#3b82f6', textDecoration: 'none', fontWeight: 600 }}>View All Articles &rarr;</Link>
        </div>
        <div className="news-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '30px' }}>
          {[1,2,3].map(i => (
            <div key={i} className="news-item" style={{ background: 'white', borderRadius: '16px', overflow: 'hidden', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.01)' }}>
              <div className="news-image" style={{ height: '200px', backgroundSize: 'cover', backgroundPosition: 'center', backgroundImage: `url('https://images.unsplash.com/photo-1546410531-bb4caa6b424d?q=80&w=600')` }}></div>
              <div className="news-content" style={{ padding: '25px' }}>
                <div className="news-date" style={{ color: '#3b82f6', fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase', marginBottom: '8px' }}>June 2026</div>
                <h3 style={{ fontSize: '1.15rem', color: '#0f172a', fontWeight: 700, marginBottom: '10px' }}>Academic Term Upgrades</h3>
                <p style={{ color: '#475569', fontSize: '0.9rem', lineHeight: 1.6, marginBottom: '20px' }}>Learn more about our school program structure and dynamic digital activities.</p>
                <Link to={`${base}/news`} className="read-more" style={{ color: '#3b82f6', textDecoration: 'none', fontWeight: 600, fontSize: '0.95rem' }}>Read Article</Link>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ── Clubs Preview ─────────────────────────────────────────────────────────────
function ClubsPreview() {
  const school = useSchool();
  const planFeatures: string[] = school?.plan?.features ?? [];
  const hasClubs = !planFeatures.length || planFeatures.includes('clubs');
  if (!hasClubs) return null;

  return (
    <section className="clubs-section" style={{ padding: '80px 0', backgroundColor: 'white' }}>
      <div className="container">
        <div className="section-header" style={{ textAlign: 'center', marginBottom: '50px' }}>
          <h2 style={{ fontSize: '2.25rem', color: '#1e293b', fontWeight: 700, marginBottom: '15px' }}>Extracurricular Clubs &amp; Associations</h2>
          <p style={{ maxWidth: '700px', margin: '0 auto', color: '#64748b', fontSize: '1.05rem' }}>
            Cultivating collaborative skills, soft talents, and critical competencies beyond classrooms.
          </p>
        </div>
        <div className="clubs-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '30px' }}>
          {[
            { icon: 'fa-microphone', name: 'Public Speaking & Debate', desc: 'Sharpen articulation, critical assessment, and logical argumentation queues.' },
            { icon: 'fa-robot', name: 'Coding & Robotics', desc: 'Design microcontrollers, code simple algorithms, and build electronic sensors.' },
            { icon: 'fa-theater-masks', name: 'Drama & Performing Arts', desc: 'Perform original theatrical plays, explore scene setups, and foster self-expression.' },
            { icon: 'fa-music', name: 'Symphony & Choir', desc: 'Read sheet music, master individual instrument keys, and perform group harmonies.' },
            { icon: 'fa-hands-helping', name: 'Interact & Charity Guild', desc: 'Spearhead community donation campaigns, clean local areas, and practice empathy.' },
            { icon: 'fa-running', name: 'Athletics & Sports', desc: 'Maintain peak cardiovascular health, learn game mechanics, and build teamwork.' },
          ].map(club => (
            <div key={club.name} className="club-item" style={{ background: '#f8fafc', padding: '30px', borderRadius: '16px', border: '1px solid #e2e8f0', transition: 'transform 0.3s' }}>
              <div className="club-icon" style={{ width: '45px', height: '45px', borderRadius: '50%', background: '#3b82f615', color: '#3b82f6', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', marginBottom: '20px' }}>
                <i className={`fas ${club.icon}`}></i>
              </div>
              <h3 className="club-name" style={{ fontSize: '1.15rem', color: '#0f172a', fontWeight: 700, marginBottom: '10px' }}>{club.name}</h3>
              <p className="club-description" style={{ color: '#475569', fontSize: '0.9rem', lineHeight: 1.6, margin: 0 }}>{club.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ── CTA Section ───────────────────────────────────────────────────────────────
function CTA() {
  const school = useSchool();
  const { schoolCode } = useParams<{ schoolCode: string }>();
  const code = (schoolCode || school?.code || '').toUpperCase();
  const base = code ? `/school/${code}` : '/';
  const planFeatures: string[] = school?.plan?.features ?? [];
  const hasAdmissions = !planFeatures.length || planFeatures.includes('admissions');

  const websiteSettings = (school as any)?.websiteSettings;
  const ctaTitle = websiteSettings?.applyTitle || `Join the ${school?.name || 'School'} Family`;
  const ctaContent = websiteSettings?.applyContent || "Applications for the upcoming academic term are open. Step into a world of qualitative transformation.";

  return (
    <section className="cta" style={{ background: 'linear-gradient(135deg, #1e3a8a 0%, #1d4ed8 100%)', color: 'white', padding: '80px 0', textAlign: 'center' }}>
      <div className="container">
        <div className="cta-content" style={{ maxWidth: '750px', margin: '0 auto' }}>
          <h2 style={{ fontSize: '2.25rem', fontWeight: 700, marginBottom: '20px' }}>{ctaTitle}</h2>
          <p style={{ fontSize: '1.1rem', marginBottom: '35px', opacity: 0.9, lineHeight: 1.6 }}>{ctaContent}</p>
          {hasAdmissions && (
            <Link to={`${base}/apply`} className="btn btn-primary" style={{ padding: '15px 35px', background: 'white', color: '#1e3a8a', borderRadius: '8px', fontWeight: 700, textDecoration: 'none', boxShadow: '0 4px 10px rgba(0,0,0,0.1)' }}>
              Enroll Pupil Now
            </Link>
          )}
        </div>
      </div>
    </section>
  );
}

// ── Main Home Export ──────────────────────────────────────────────────────────
export default function Home() {
  return (
    <>
      <Hero />
      <AboutSection />
      <PortalsSection />
      <DepartmentsShowcase />
      <AdmissionsGuide />
      <CampusSection />
      <NewsHighlights />
      <ClubsPreview />
      <CTA />
    </>
  );
}
