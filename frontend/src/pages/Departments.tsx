import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useSchool } from '../components/layout/Layout';
import api from '../lib/api';

interface Subject {
  subject: {
    name: string;
  };
}

interface Teacher {
  id: string;
  userId: string;
  qualification: string | null;
  title: string | null;
  user: {
    id: string;
    name: string;
    avatar: string | null;
    employeeProfile: {
      jobTitle: string | null;
      designation: string | null;
    } | null;
  };
  subjects: Subject[];
}

interface Department {
  id: string;
  name: string;
  code: string;
  services: string | null;
  facilities: string | null;
  pictures: string | null;
  headId: string | null;
  head: {
    id: string;
    name: string;
    avatar: string | null;
    teacher: {
      qualification: string | null;
      subjects: Subject[];
    } | null;
  } | null;
  teachers: Teacher[];
}

export default function Departments() {
  const school = useSchool();
  const { schoolCode } = useParams<{ schoolCode: string }>();
  const code = (schoolCode || school?.code || '').toUpperCase();

  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedStaff, setSelectedStaff] = useState<any | null>(null);

  useEffect(() => {
    if (!code) return;
    setLoading(true);
    api.get(`/api/public/schools/${code}/departments`)
      .then(res => {
        setDepartments(res.data || []);
      })
      .catch(err => {
        console.error('Failed to fetch departments:', err);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [code]);

  const parseJsonArray = (str: string | null): string[] => {
    if (!str) return [];
    try {
      if (str.startsWith('[')) {
        return JSON.parse(str);
      }
      return str.split(',').map(s => s.trim()).filter(Boolean);
    } catch (e) {
      return str.split(',').map(s => s.trim()).filter(Boolean);
    }
  };

  const groupTeachers = (teachersList: Teacher[]) => {
    const groups: { [key: string]: Teacher[] } = {};
    teachersList.forEach(t => {
      const title = t.user?.employeeProfile?.jobTitle || t.user?.employeeProfile?.designation || 'Teachers';
      if (!groups[title]) {
        groups[title] = [];
      }
      groups[title].push(t);
    });
    return groups;
  };

  const getAvatarUrl = (avatar: string | null) => {
    if (!avatar) return null;
    if (avatar.startsWith('http')) return avatar;
    return `${api.defaults.baseURL}/api/storage/media/${code}/${avatar}`;
  };

  const settings = (school as any)?.websiteSettings;
  const bannerImage = settings?.bannerImage;
  const bannerStyle = bannerImage 
    ? { backgroundImage: `linear-gradient(rgba(0, 0, 0, 0.6), rgba(0, 0, 0, 0.6)), url(${api.defaults.baseURL}/api/storage/media/${code}/${bannerImage})`, backgroundSize: 'cover', backgroundPosition: 'center', padding: '80px 0', color: 'white', textAlign: 'center' as const }
    : { background: 'linear-gradient(135deg, var(--school-primary, #1e3a8a) 0%, var(--school-accent, #3b82f6) 100%)', padding: '80px 0', color: 'white', textAlign: 'center' as const };

  return (
    <>
      <div className="page-banner" style={bannerStyle}>
        <div className="container">
          <h1 id="hero-title" style={{ fontSize: '2.5rem', fontWeight: 700, marginBottom: '15px', color: 'var(--banner-title-color, white)' }}>Academic Departments</h1>
          <p id="hero-subtitle" style={{ fontSize: '1.1rem', maxWidth: '700px', margin: '0 auto', opacity: 0.9 }}>
            Our academic structure is built on excellence, led by dedicated professionals committed to holistic education.
          </p>
        </div>
      </div>

      <div className="container" style={{ padding: '60px 0' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '60px' }}>
            <i className="fas fa-spinner fa-spin fa-3x" style={{ color: '#3b82f6' }}></i>
            <p style={{ marginTop: '15px', color: '#64748b', fontSize: '1.1rem' }}>Loading departments...</p>
          </div>
        ) : departments.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '80px', background: '#f8fafc', borderRadius: '16px', border: '1px dashed #cbd5e1' }}>
            <i className="fas fa-building fa-4x" style={{ color: '#cbd5e1', marginBottom: '20px' }}></i>
            <p style={{ color: '#64748b', fontSize: '1.2rem', fontWeight: 500 }}>No departments registered yet.</p>
          </div>
        ) : (
          departments.map((dept, index) => {
            const nonHodTeachers = dept.teachers?.filter(t => t.userId !== dept.headId) || [];
            const groupedStaff = groupTeachers(nonHodTeachers);
            const services = parseJsonArray(dept.services);
            const facilities = parseJsonArray(dept.facilities);
            const pictures = parseJsonArray(dept.pictures);

            return (
              <section 
                key={dept.id} 
                className="department-section" 
                style={{ 
                  background: 'white', 
                  borderRadius: '16px', 
                  boxShadow: '0 4px 20px rgba(0,0,0,0.05)', 
                  padding: '40px', 
                  marginBottom: '50px',
                  border: '1px solid #f1f5f9',
                  transition: 'transform 0.3s ease',
                  position: 'relative'
                }}
              >
                <div className="dept-header" style={{ display: 'flex', alignItems: 'center', gap: '20px', marginBottom: '35px', borderBottom: '2px solid #f1f5f9', paddingBottom: '20px' }}>
                  <div className="dept-icon" style={{ width: '60px', height: '60px', borderRadius: '12px', background: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px', color: '#3b82f6' }}>
                    <i className={index % 3 === 0 ? "fas fa-flask" : index % 3 === 1 ? "fas fa-book-reader" : "fas fa-laptop-code"}></i>
                  </div>
                  <div className="dept-title">
                    <h2 style={{ fontSize: '1.8rem', color: '#1e293b', margin: 0, fontWeight: 700 }}>{dept.name}</h2>
                    <p style={{ color: '#64748b', margin: '5px 0 0 0', fontSize: '1rem' }}>Academic Department & Faculty</p>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '40px', alignItems: 'start' }}>
                  {/* Left Column: Staff Hierarchy */}
                  <div className="staff-hierarchy" style={{ background: '#f8fafc', padding: '30px', borderRadius: '12px' }}>
                    <h3 style={{ fontSize: '1.25rem', color: '#0f172a', marginBottom: '20px', fontWeight: 600, borderBottom: '1px solid #e2e8f0', paddingBottom: '10px' }}>
                      Staff Hierarchy
                    </h3>
                    
                    <div className="hierarchy-tree" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                      {/* HOD Card */}
                      {dept.head ? (
                        <div className="role-group">
                          <span style={{ fontSize: '0.85rem', textTransform: 'uppercase', color: '#3b82f6', fontWeight: 700, letterSpacing: '0.05em', display: 'block', marginBottom: '8px' }}>
                            Head of Department (HOD)
                          </span>
                          <div 
                            className="staff-card" 
                            style={{ 
                              display: 'flex', 
                              alignItems: 'center', 
                              gap: '15px', 
                              background: 'white', 
                              padding: '15px', 
                              borderRadius: '10px', 
                              border: '2px solid #bfdbfe',
                              boxShadow: '0 2px 8px rgba(59, 130, 246, 0.08)',
                              cursor: 'pointer',
                              transition: 'transform 0.2s ease, box-shadow 0.2s ease'
                            }}
                            onClick={() => setSelectedStaff({
                              name: dept.head?.name,
                              avatar: dept.head?.avatar,
                              jobTitle: 'Head of Department',
                              qualification: dept.head?.teacher?.qualification || 'Not Specified',
                              subjects: dept.head?.teacher?.subjects?.map(s => s.subject.name) || []
                            })}
                          >
                            <div style={{ width: '48px', height: '48px', borderRadius: '50%', overflow: 'hidden', background: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                              {dept.head.avatar ? (
                                <img src={getAvatarUrl(dept.head.avatar) || ''} alt={dept.head.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                              ) : (
                                <span style={{ fontSize: '1.2rem', fontWeight: 700, color: '#3b82f6' }}>{dept.head.name.charAt(0)}</span>
                              )}
                            </div>
                            <div>
                              <span style={{ fontWeight: 600, color: '#1e293b', display: 'block' }}>{dept.head.name}</span>
                              <span style={{ fontSize: '0.85rem', color: '#64748b' }}>{dept.head.teacher?.qualification || 'BEd / Specialist'}</span>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="role-group">
                          <span style={{ fontSize: '0.85rem', textTransform: 'uppercase', color: '#64748b', fontWeight: 700, letterSpacing: '0.05em', display: 'block', marginBottom: '8px' }}>
                            Head of Department (HOD)
                          </span>
                          <div style={{ padding: '15px', background: '#f1f5f9', borderRadius: '10px', color: '#94a3b8', fontSize: '0.9rem', fontStyle: 'italic', border: '1px dashed #cbd5e1' }}>
                            Currently Vacant
                          </div>
                        </div>
                      )}

                      {/* Other Staff Groupings */}
                      {Object.keys(groupedStaff).map(groupTitle => (
                        <div key={groupTitle} className="role-group">
                          <span style={{ fontSize: '0.85rem', textTransform: 'uppercase', color: '#475569', fontWeight: 700, letterSpacing: '0.05em', display: 'block', marginBottom: '8px' }}>
                            {groupTitle}
                          </span>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                            {groupedStaff[groupTitle].map(teacher => (
                              <div 
                                key={teacher.id} 
                                className="staff-card" 
                                style={{ 
                                  display: 'flex', 
                                  alignItems: 'center', 
                                  gap: '15px', 
                                  background: 'white', 
                                  padding: '12px 15px', 
                                  borderRadius: '8px', 
                                  border: '1px solid #e2e8f0',
                                  cursor: 'pointer',
                                  transition: 'transform 0.2s ease, box-shadow 0.2s ease'
                                }}
                                onClick={() => setSelectedStaff({
                                  name: teacher.user?.name,
                                  avatar: teacher.user?.avatar,
                                  jobTitle: groupTitle,
                                  qualification: teacher.qualification || 'Not Specified',
                                  subjects: teacher.subjects?.map(s => s.subject.name) || []
                                })}
                              >
                                <div style={{ width: '40px', height: '40px', borderRadius: '50%', overflow: 'hidden', background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                  {teacher.user?.avatar ? (
                                    <img src={getAvatarUrl(teacher.user.avatar) || ''} alt={teacher.user.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                  ) : (
                                    <span style={{ fontSize: '1rem', fontWeight: 700, color: '#475569' }}>{teacher.user?.name?.charAt(0)}</span>
                                  )}
                                </div>
                                <div>
                                  <span style={{ fontWeight: 600, color: '#334155', display: 'block', fontSize: '0.95rem' }}>{teacher.user?.name}</span>
                                  <span style={{ fontSize: '0.8rem', color: '#64748b' }}>{teacher.qualification || 'Academic Staff'}</span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}

                      {/* Fallback if no teachers exist */}
                      {nonHodTeachers.length === 0 && (
                        <div style={{ color: '#94a3b8', fontSize: '0.85rem', fontStyle: 'italic', marginTop: '10px' }}>
                          No additional departmental staff assigned.
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Right Column: Services, Facilities, Pictures */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
                    {/* Services & Facilities */}
                    <div className="services-list" style={{ background: '#f8fafc', padding: '30px', borderRadius: '12px' }}>
                      <h3 style={{ fontSize: '1.25rem', color: '#0f172a', marginBottom: '20px', fontWeight: 600, borderBottom: '1px solid #e2e8f0', paddingBottom: '10px' }}>
                        Services &amp; Facilities
                      </h3>
                      
                      {services.length > 0 && (
                        <div style={{ marginBottom: '20px' }}>
                          <span style={{ fontSize: '0.85rem', textTransform: 'uppercase', color: '#3b82f6', fontWeight: 700, letterSpacing: '0.05em', display: 'block', marginBottom: '8px' }}>
                            Key Services
                          </span>
                          <ul style={{ paddingLeft: '20px', margin: 0, color: '#334155', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                            {services.map((srv, sIdx) => (
                              <li key={sIdx} style={{ fontSize: '0.95rem' }}>{srv}</li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {facilities.length > 0 && (
                        <div>
                          <span style={{ fontSize: '0.85rem', textTransform: 'uppercase', color: '#10b981', fontWeight: 700, letterSpacing: '0.05em', display: 'block', marginBottom: '8px' }}>
                            Facilities &amp; Resources
                          </span>
                          <ul style={{ paddingLeft: '20px', margin: 0, color: '#334155', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                            {facilities.map((fac, fIdx) => (
                              <li key={fIdx} style={{ fontSize: '0.95rem' }}>{fac}</li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {services.length === 0 && facilities.length === 0 && (
                        <div style={{ color: '#94a3b8', fontSize: '0.9rem', fontStyle: 'italic' }}>
                          No services or facilities documented.
                        </div>
                      )}
                    </div>

                    {/* Department Pictures Gallery */}
                    {pictures.length > 0 && (
                      <div className="pictures-gallery">
                        <span style={{ fontSize: '0.85rem', textTransform: 'uppercase', color: '#475569', fontWeight: 700, letterSpacing: '0.05em', display: 'block', marginBottom: '12px' }}>
                          Department Gallery
                        </span>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: '12px' }}>
                          {pictures.map((pic, pIdx) => (
                            <div 
                              key={pIdx} 
                              style={{ 
                                height: '100px', 
                                borderRadius: '8px', 
                                overflow: 'hidden', 
                                border: '1px solid #e2e8f0', 
                                boxShadow: '0 2px 4px rgba(0,0,0,0.03)',
                                transition: 'transform 0.2s'
                              }}
                              className="gallery-item"
                            >
                              <img 
                                src={`${api.defaults.baseURL}/api/storage/media/${code}/${pic}`} 
                                alt={`${dept.name} Gallery ${pIdx + 1}`} 
                                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                onError={(e) => {
                                  (e.target as HTMLImageElement).src = `${api.defaults.baseURL}/api/storage/media/global/${pic}`;
                                }}
                              />
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </section>
            );
          })
        )}
      </div>

      {/* Staff Detail Modal */}
      {selectedStaff && (
        <div 
          style={{ 
            position: 'fixed', 
            top: 0, 
            left: 0, 
            width: '100vw', 
            height: '100vh', 
            background: 'rgba(15, 23, 42, 0.6)', 
            backdropFilter: 'blur(4px)', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center', 
            zIndex: 9999,
            padding: '20px'
          }}
          onClick={() => setSelectedStaff(null)}
        >
          <div 
            style={{ 
              background: 'white', 
              borderRadius: '16px', 
              width: '100%', 
              maxWidth: '450px', 
              boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1), 0 10px 10px -5px rgba(0,0,0,0.04)',
              overflow: 'hidden',
              position: 'relative'
            }}
            onClick={e => e.stopPropagation()}
          >
            {/* Header / Avatar Section */}
            <div style={{ background: 'linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%)', padding: '40px 30px', textAlign: 'center', position: 'relative' }}>
              <button 
                onClick={() => setSelectedStaff(null)}
                style={{ position: 'absolute', top: '15px', right: '15px', background: 'rgba(255,255,255,0.2)', border: 'none', width: '28px', height: '28px', borderRadius: '50%', color: 'white', fontSize: '14px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              >
                &times;
              </button>
              <div style={{ width: '90px', height: '90px', borderRadius: '50%', border: '4px solid white', margin: '0 auto 15px auto', overflow: 'hidden', background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}>
                {selectedStaff.avatar ? (
                  <img src={getAvatarUrl(selectedStaff.avatar) || ''} alt={selectedStaff.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  <span style={{ fontSize: '2.5rem', fontWeight: 700, color: '#3b82f6' }}>{selectedStaff.name?.charAt(0)}</span>
                )}
              </div>
              <h4 style={{ color: 'white', fontSize: '1.4rem', fontWeight: 700, margin: 0 }}>{selectedStaff.name}</h4>
              <p style={{ color: '#bfdbfe', fontSize: '0.9rem', margin: '5px 0 0 0', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>
                {selectedStaff.jobTitle}
              </p>
            </div>

            {/* Profile Info */}
            <div style={{ padding: '30px' }}>
              <div style={{ marginBottom: '20px' }}>
                <span style={{ fontSize: '0.8rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 700, display: 'block', marginBottom: '5px' }}>
                  Educational Qualifications
                </span>
                <p style={{ color: '#1e293b', fontSize: '1rem', margin: 0, fontWeight: 500, lineHeight: 1.5 }}>
                  {selectedStaff.qualification}
                </p>
              </div>

              {selectedStaff.subjects && selectedStaff.subjects.length > 0 ? (
                <div>
                  <span style={{ fontSize: '0.8rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 700, display: 'block', marginBottom: '8px' }}>
                    Subjects Taught
                  </span>
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    {selectedStaff.subjects.map((subj: string, idx: number) => (
                      <span 
                        key={idx} 
                        style={{ 
                          fontSize: '0.85rem', 
                          background: '#eff6ff', 
                          color: '#1e40af', 
                          padding: '4px 12px', 
                          borderRadius: '20px', 
                          fontWeight: 600,
                          border: '1px solid #dbeafe'
                        }}
                      >
                        {subj}
                      </span>
                    ))}
                  </div>
                </div>
              ) : (
                <div>
                  <span style={{ fontSize: '0.8rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 700, display: 'block', marginBottom: '8px' }}>
                    Subjects Taught
                  </span>
                  <span style={{ fontSize: '0.9rem', color: '#64748b', fontStyle: 'italic' }}>No subjects assigned to teach.</span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
