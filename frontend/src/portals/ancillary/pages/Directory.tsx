import { useState, useEffect } from 'react';
import api from '../../../lib/api';
import { useToast } from '../../../context/ToastContext';

interface StaffMember {
  id: string;
  name: string;
  email: string;
  role: string;
  phone?: string;
  avatarUrl?: string;
}

const getInitials = (name: string) =>
  name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);

const ROLE_LABELS: Record<string, string> = {
  ANCILLARY: 'Support Staff',
  TEACHER: 'Teacher',
  SCHOOL_ADMIN: 'Administrator',
  BURSAR: 'Bursar',
};

const AVATAR_COLORS = ['#38b2ac', '#3182ce', '#805ad5', '#e53e3e', '#dd6b20', '#d69e2e'];

export default function AncillaryDirectory() {
  const { showToast } = useToast();
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    fetchStaff();
  }, []);

  const fetchStaff = async () => {
    try {
      // Fetch all school users; filter to ANCILLARY role
      const res = await api.get('/api/users', { params: { role: 'ANCILLARY' } });
      setStaff(res.data?.data || res.data || []);
    } catch {
      showToast('Failed to load staff directory', 'error');
    } finally {
      setLoading(false);
    }
  };

  const filtered = staff.filter(s =>
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    (s.email || '').toLowerCase().includes(search.toLowerCase()) ||
    (s.role || '').toLowerCase().includes(search.toLowerCase())
  );

  return (
    <>
      <div className="portal-page-header">
        <div>
          <h1>Staff Directory</h1>
          <p>Contact information for all support staff members.</p>
        </div>
      </div>

      <div className="portal-card" style={{ marginBottom: 20 }}>
        <div className="portal-card-body">
          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            <i className="fas fa-search" style={{ color: '#a0aec0' }}></i>
            <input
              type="text"
              className="portal-input"
              placeholder="Search by name, email or role..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{ flex: 1 }}
            />
            {search && (
              <button className="portal-btn-ghost" onClick={() => setSearch('')} style={{ border: 'none', background: 'none', color: '#718096', cursor: 'pointer' }}>
                <i className="fas fa-times"></i>
              </button>
            )}
          </div>
        </div>
      </div>

      {loading ? (
        <div style={{ padding: 60, textAlign: 'center' }}>
          <i className="fas fa-spinner fa-spin fa-2x" style={{ color: 'var(--portal-primary)' }}></i>
          <p style={{ color: '#718096', marginTop: 12 }}>Loading directory...</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="portal-card" style={{ padding: 60, textAlign: 'center' }}>
          <i className="fas fa-users-slash fa-3x" style={{ color: '#e2e8f0', marginBottom: 16 }}></i>
          <h3>{search ? 'No results found' : 'No Staff Members'}</h3>
          <p style={{ color: '#718096' }}>
            {search ? `No staff matched "${search}"` : 'No ancillary staff registered yet.'}
          </p>
        </div>
      ) : (
        <div className="portal-grid-2">
          {filtered.map((s, i) => (
            <div key={s.id} className="portal-card" style={{ marginBottom: 0 }}>
              <div className="portal-card-body" style={{ display: 'flex', alignItems: 'center', gap: 16, padding: 20 }}>
                <div style={{
                  width: 52, height: 52, borderRadius: '50%',
                  background: AVATAR_COLORS[i % AVATAR_COLORS.length],
                  color: 'white', display: 'flex', alignItems: 'center',
                  justifyContent: 'center', fontSize: '1rem', fontWeight: 700, flexShrink: 0
                }}>
                  {getInitials(s.name)}
                </div>
                <div style={{ flex: 1 }}>
                  <h3 style={{ margin: '0 0 2px', fontSize: '0.95rem' }}>{s.name}</h3>
                  <div style={{ fontSize: '0.82rem', color: '#718096' }}>
                    {ROLE_LABELS[s.role] || s.role}
                  </div>
                  {s.phone && (
                    <div style={{ fontSize: '0.8rem', color: '#a0aec0', marginTop: 4 }}>
                      <i className="fas fa-phone" style={{ marginRight: 6 }}></i>{s.phone}
                    </div>
                  )}
                </div>
                {s.email && (
                  <a
                    href={`mailto:${s.email}`}
                    style={{ padding: '8px 12px', background: '#f0f4f8', border: '1px solid #e2e8f0', borderRadius: 8, color: 'var(--portal-primary)', textDecoration: 'none' }}
                    title={`Email ${s.name}`}
                  >
                    <i className="fas fa-envelope"></i>
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {filtered.length > 0 && (
        <div style={{ marginTop: 16, color: '#a0aec0', fontSize: '0.85rem', textAlign: 'center' }}>
          Showing {filtered.length} of {staff.length} staff members
        </div>
      )}
    </>
  );
}
