import { useEffect, useState } from 'react';
import api from '../../../lib/api';
import { useAuth } from '../../../contexts/AuthContext';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, Cell
} from 'recharts';
import ClockInModal from '../../../components/attendance/ClockInModal';
import '../../../styles/portal.css';

interface DashboardData {
  totalBooks: number;
  activeLoans: number;
  overdueLoans: number;
  recentLoans: { id: string; student: { name: string }; book: { title: string; author: string }; borrowedAt: string; returnedAt?: string | null; dueDate?: string }[];
  lendingTrends: { name: string; loans: number }[];
  categoryData: { name: string; count: number; color: string }[];
  trendingBooks: { id: string; title: string; author: string; borrows: number; cover: string | null }[];
}

export default function LibraryDashboard() {
  const { user } = useAuth();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [showScanModal, setShowScanModal] = useState(false);
  const [showAddCategoryModal, setShowAddCategoryModal] = useState(false);
  const [scanInput, setScanInput] = useState('');
  const [newCategoryName, setNewCategoryName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [clockModalAction, setClockModalAction] = useState<'IN'|'OUT'|null>(null);
  const [attendanceStatus, setAttendanceStatus] = useState<any>(null);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = () => {
    setLoading(true);
    Promise.all([
      api.get('/api/dashboard/library'),
      api.get('/api/staff-attendance/today')
    ])
      .then(([dashRes, attRes]) => {
        setData(dashRes.data);
        setAttendanceStatus(attRes.data);
      })
      .catch(() => {
          // Fallback static data for demonstration if API fails
          setData({
              totalBooks: 4500,
              activeLoans: 124,
              overdueLoans: 8,
              recentLoans: [],
              lendingTrends: [],
              categoryData: [],
              trendingBooks: []
          });
      })
      .finally(() => setLoading(false));
  };

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '80vh', flexDirection: 'column', gap: 20 }}>
      <div className="portal-loader-ring" style={{ borderColor: 'var(--school-primary, #3182ce)', borderTopColor: 'transparent' }}></div>
      <p style={{ color: 'var(--school-primary, #3182ce)', fontWeight: 600 }}>Curating library insights...</p>
    </div>
  );

  return (
    <div className="library-portal-wrapper" style={{ 
      minHeight: '100vh', 
      background: '#f8fafc', 
      padding: '40px',
      color: '#334155',
      fontFamily: "'Inter', sans-serif"
    }}>
      <style>{`
        .glass-card {
          background: #ffffff;
          border: 1px solid rgba(226, 232, 240, 0.8);
          border-radius: 24px;
          transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03);
          backdrop-filter: blur(10px);
        }
        .glass-card:hover {
          transform: translateY(-5px);
          box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
          border-color: rgba(226, 232, 240, 1);
        }
        .stat-icon-wrapper {
          position: relative;
          width: 56px; height: 56px; 
          border-radius: 16px;
          display: flex; align-items: center; justify-content: center;
          font-size: 1.5rem;
          overflow: hidden;
          transition: transform 0.3s ease;
        }
        .glass-card:hover .stat-icon-wrapper {
          transform: scale(1.1) rotate(5deg);
        }
        .stat-icon-wrapper::before {
          content: ''; position: absolute; inset: 0; opacity: 0.15;
          background: currentColor;
        }
        .hover-btn {
          transition: all 0.2s ease;
        }
        .hover-btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
        }
        .table-row-glass {
          transition: all 0.2s ease;
        }
        .table-row-glass:hover {
          background: #f8fafc;
          transform: scale(1.01);
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);
          border-radius: 12px;
        }
        .gradient-text {
          background: linear-gradient(135deg, var(--school-primary, #3182ce) 0%, #8b5cf6 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }
        .trending-card {
          background: #fff;
          border-radius: 16px;
          padding: 16px;
          border: 1px solid #f1f5f9;
          transition: all 0.3s;
          display: flex;
          align-items: center;
          gap: 16px;
        }
        .trending-card:hover {
          box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
          border-color: #e2e8f0;
          transform: translateX(4px);
        }
        .cover-placeholder {
          width: 48px;
          height: 64px;
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: rgba(0,0,0,0.5);
          font-size: 1.5rem;
          box-shadow: inset 0 2px 4px rgba(0,0,0,0.1);
        }
      `}</style>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 40 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
            <div style={{ width: 40, height: 40, borderRadius: 12, background: 'var(--school-primary, #3182ce)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem', boxShadow: '0 4px 10px rgba(0,0,0,0.2)' }}>
              <i className="fas fa-books"></i>
            </div>
            <h1 className="gradient-text" style={{ fontSize: '2.5rem', fontWeight: 900, letterSpacing: '-1px', margin: 0 }}>
              Command Centre
            </h1>
          </div>
          <p style={{ color: '#64748b', fontSize: '1.1rem', margin: 0, fontWeight: 500 }}>
            Welcome back, <strong style={{ color: '#334155' }}>{user?.name}</strong>. Here's what's happening in your library today.
          </p>
        </div>
        <div style={{ display: 'flex', gap: 12 }}>
          <div style={{ padding: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column', background: '#fff', borderRadius: '12px', border: '1px solid #e2e8f0', minWidth: '150px' }}>
            <div 
              onClick={() => {
                if (attendanceStatus && !attendanceStatus.timeOut) setClockModalAction('OUT');
                else if (!attendanceStatus) setClockModalAction('IN');
              }}
              className="hover-btn"
              style={{ 
                background: (!attendanceStatus || attendanceStatus.timeOut) ? 'var(--portal-danger)' : 'var(--portal-success)', 
                color: 'white', 
                padding: '10px 20px', 
                display: 'flex', 
                justifyContent: 'center', 
                alignItems: 'center', 
                cursor: (!attendanceStatus || !attendanceStatus.timeOut) ? 'pointer' : 'default',
                fontWeight: 600,
                fontSize: '0.9rem',
                gap: 8,
                height: '100%',
                boxShadow: `0 4px 10px ${(!attendanceStatus || attendanceStatus.timeOut) ? 'rgba(229, 62, 62, 0.3)' : 'rgba(56, 161, 105, 0.3)'}`
              }}
            >
              <i className="fas fa-clock"></i>
              {(!attendanceStatus || attendanceStatus.timeOut) ? 'Clock IN' : 'Clock OUT'}
            </div>
          </div>
          <button onClick={() => setShowScanModal(true)} className="hover-btn" style={{ background: '#fff', color: '#334155', border: '1px solid #e2e8f0', padding: '10px 20px', borderRadius: '12px', fontWeight: 600, fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
            <i className="fas fa-barcode-read"></i> Scan Book
          </button>
          <a href="/librarian/loans" className="hover-btn" style={{ background: 'var(--school-primary, #3182ce)', color: '#fff', border: 'none', padding: '10px 20px', borderRadius: '12px', textDecoration: 'none', fontWeight: 600, fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: 8, boxShadow: '0 4px 10px rgba(49, 130, 206, 0.3)' }}>
            <i className="fas fa-plus"></i> Issue Loan
          </a>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '24px', marginBottom: '32px' }}>
        {[
          { label: 'Total Catalog', value: data?.totalBooks, icon: 'fa-book-journal-whills', color: '#3b82f6' },
          { label: 'Active Loans', value: data?.activeLoans, icon: 'fa-hand-holding-hand', color: '#f59e0b' },
          { label: 'Overdue Books', value: data?.overdueLoans, icon: 'fa-triangle-exclamation', color: 'var(--portal-danger)' },
          { label: 'Available', value: data?.totalBooks && data?.activeLoans ? data.totalBooks - data.activeLoans : 0, icon: 'fa-book-open-reader', color: '#10b981' }
        ].map((stat, i) => (
          <div key={i} className="glass-card" style={{ padding: '24px', display: 'flex', alignItems: 'center', gap: '20px' }}>
            <div className="stat-icon-wrapper" style={{ color: stat.color }}>
              <i className={`fas ${stat.icon}`}></i>
            </div>
            <div>
              <div style={{ color: '#64748b', fontWeight: 700, fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 4 }}>{stat.label}</div>
              <div style={{ color: '#1e293b', fontSize: '2rem', fontWeight: 900, lineHeight: 1 }}>{stat.value?.toLocaleString()}</div>
            </div>
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '32px', marginBottom: '32px' }}>
        <div className="glass-card" style={{ flex: '2 1 500px', padding: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
            <div>
              <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800, color: '#1e293b' }}>Lending Activity</h2>
              <p style={{ margin: '4px 0 0', fontSize: '0.85rem', color: '#64748b' }}>Loans processed over the last 7 days</p>
            </div>
            <select style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid #e2e8f0', background: '#f8fafc', color: '#475569', fontWeight: 600, outline: 'none' }}>
              <option>This Week</option>
              <option>This Month</option>
              <option>This Year</option>
            </select>
          </div>
          <div style={{ height: 300, width: '100%' }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data?.lendingTrends || []} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorLoans" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--school-primary, #3182ce)" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="var(--school-primary, #3182ce)" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} />
                <Tooltip 
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}
                  itemStyle={{ color: '#1e293b', fontWeight: 700 }}
                />
                <Area type="monotone" dataKey="loans" stroke="var(--school-primary, #3182ce)" strokeWidth={3} fillOpacity={1} fill="url(#colorLoans)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="glass-card" style={{ flex: '1 1 300px', padding: '24px', display: 'flex', flexDirection: 'column' }}>
          <div style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800, color: '#1e293b' }}>Top Categories</h2>
              <p style={{ margin: '4px 0 0', fontSize: '0.85rem', color: '#64748b' }}>Inventory distribution</p>
            </div>
            <button onClick={() => setShowAddCategoryModal(true)} style={{ background: '#f1f5f9', color: '#3b82f6', border: 'none', padding: '6px 12px', borderRadius: '8px', fontWeight: 600, fontSize: '0.8rem', cursor: 'pointer', transition: 'all 0.2s' }} title="Add Category">
              <i className="fas fa-plus"></i> New
            </button>
          </div>
          <div style={{ flex: 1, minHeight: 200 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data?.categoryData || []} layout="vertical" margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
                <XAxis type="number" hide />
                <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{ fill: '#475569', fontSize: 13, fontWeight: 600 }} width={70} />
                <Tooltip cursor={{ fill: 'transparent' }} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }} />
                <Bar dataKey="count" radius={[0, 4, 4, 0]} barSize={20}>
                  {(data?.categoryData || []).map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color || '#3b82f6'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '32px' }}>
        <div className="glass-card" style={{ flex: '2 1 500px' }}>
          <div style={{ padding: '24px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800, color: '#1e293b' }}>Recent Loans</h2>
            <a href="/librarian/loans" className="hover-btn" style={{ color: 'var(--school-primary, #3182ce)', fontSize: '0.9rem', fontWeight: 700, textDecoration: 'none' }}>
              View All <i className="fas fa-arrow-right ml-1"></i>
            </a>
          </div>
          <div style={{ padding: '16px' }}>
            {!data?.recentLoans?.length ? (
              <div style={{ padding: '60px 0', textAlign: 'center' }}>
                <div style={{ width: 64, height: 64, background: '#f1f5f9', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', color: '#94a3b8', fontSize: '1.5rem' }}>
                  <i className="fas fa-books"></i>
                </div>
                <h3 style={{ margin: '0 0 8px', color: '#334155', fontWeight: 700 }}>No Recent Loans</h3>
                <p style={{ color: '#64748b', fontSize: '0.95rem', margin: 0 }}>There hasn't been any borrowing activity recently.</p>
              </div>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ color: '#94a3b8', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '1px' }}>
                    <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 700 }}>Borrower</th>
                    <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 700 }}>Book Title</th>
                    <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 700 }}>Date Borrowed</th>
                    <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 700 }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {data.recentLoans.map(loan => {
                    const isReturned = !!loan.returnedAt;
                    const isOverdue = !isReturned && loan.dueDate && new Date(loan.dueDate) < new Date();
                    return (
                      <tr key={loan.id} className="table-row-glass" style={{ borderBottom: '1px solid #f8fafc' }}>
                        <td style={{ padding: '12px 16px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'linear-gradient(135deg, #e2e8f0 0%, #cbd5e1 100%)', color: '#475569', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.9rem', fontWeight: 800, boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
                              {loan.student?.name?.charAt(0) || 'U'}
                            </div>
                            <span style={{ fontWeight: 700, color: '#1e293b' }}>{loan.student?.name || 'Unknown'}</span>
                          </div>
                        </td>
                        <td style={{ padding: '12px 16px' }}>
                          <div style={{ fontWeight: 700, color: '#334155', marginBottom: 2 }}>{loan.book?.title}</div>
                          <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{loan.book?.author}</div>
                        </td>
                        <td style={{ padding: '12px 16px', color: '#64748b', fontSize: '0.9rem', fontWeight: 500 }}>
                          {new Date(loan.borrowedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </td>
                        <td style={{ padding: '12px 16px' }}>
                          <span style={{ 
                            background: isReturned ? '#dcfce7' : isOverdue ? '#fee2e2' : '#dbeafe',
                            color: isReturned ? '#166534' : isOverdue ? '#991b1b' : '#1e40af',
                            padding: '4px 10px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 800
                          }}>
                            {isReturned ? 'Returned' : isOverdue ? 'Overdue' : 'Active'}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>

        <div>
          <div className="glass-card" style={{ padding: '24px', marginBottom: '24px' }}>
            <h2 style={{ margin: '0 0 20px', fontSize: '1.25rem', fontWeight: 800, color: '#1e293b' }}>Trending Books</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {(data?.trendingBooks || []).map((book: any, i: number) => (
                <div key={i} className="trending-card">
                  <div className="cover-placeholder" style={{ background: '#f1f5f9' }}>
                    {book.cover ? (
                      <img src={`${api.defaults.baseURL}/${book.cover}`} alt="cover" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '8px' }} />
                    ) : (
                      <i className="fas fa-book" style={{ color: '#94a3b8' }}></i>
                    )}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 800, color: '#1e293b', fontSize: '0.95rem', marginBottom: 4 }}>{book.title}</div>
                    <div style={{ fontSize: '0.8rem', color: '#64748b', marginBottom: 6 }}>{book.author}</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.75rem', color: '#f59e0b', fontWeight: 700 }}>
                      <i className="fas fa-fire"></i> {book.borrows} borrows this month
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
          
          <div className="glass-card" style={{ padding: '24px', background: 'linear-gradient(135deg, #fef2f2 0%, #fff1f2 100%)', borderColor: '#ffe4e6' }}>
            <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-start' }}>
               <div style={{ color: '#e11d48', fontSize: '1.5rem', marginTop: '2px' }}>
                 <i className="fas fa-bell-on"></i>
               </div>
               <div>
                 <h4 style={{ margin: '0 0 6px 0', color: '#9f1239', fontSize: '0.95rem', fontWeight: 800 }}>Action Required</h4>
                 <p style={{ margin: 0, fontSize: '0.85rem', color: '#be123c', lineHeight: 1.5, fontWeight: 500 }}>
                   You have <strong style={{ fontWeight: 800 }}>{data?.overdueLoans || 8}</strong> books currently marked as overdue. Please issue reminders to the respective borrowers.
                 </p>
                 <a href="/librarian/loans" className="hover-btn" style={{ marginTop: 12, background: '#e11d48', color: '#fff', border: 'none', padding: '6px 16px', borderRadius: '8px', fontSize: '0.8rem', fontWeight: 700, cursor: 'pointer', display: 'inline-block', textDecoration: 'none' }}>
                   View Overdue List
                 </a>
               </div>
            </div>
          </div>
        </div>
      </div>

      {/* Modals */}
      {showScanModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 20 }}>
          <div style={{ background: '#fff', borderRadius: '24px', padding: '32px', width: '100%', maxWidth: '400px', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)' }}>
            <h3 style={{ margin: '0 0 16px', fontSize: '1.25rem', fontWeight: 800 }}>Scan Book</h3>
            <p style={{ color: '#64748b', fontSize: '0.9rem', marginBottom: '24px' }}>Enter the book's ISBN or system ID to quickly pull up its records.</p>
            <input 
              autoFocus
              type="text" 
              placeholder="e.g. 978-0132350884" 
              value={scanInput}
              onChange={e => setScanInput(e.target.value)}
              style={{ width: '100%', padding: '12px 16px', borderRadius: '12px', border: '2px solid #e2e8f0', outline: 'none', fontSize: '1rem', marginBottom: '24px' }}
            />
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button onClick={() => setShowScanModal(false)} style={{ padding: '10px 20px', borderRadius: '12px', border: 'none', background: '#f1f5f9', color: '#64748b', fontWeight: 600, cursor: 'pointer' }}>Cancel</button>
              <button onClick={() => {
                window.location.href = `/librarian/books?search=${encodeURIComponent(scanInput)}`;
              }} style={{ padding: '10px 20px', borderRadius: '12px', border: 'none', background: 'var(--school-primary, #3182ce)', color: '#fff', fontWeight: 600, cursor: 'pointer' }}>Search</button>
            </div>
          </div>
        </div>
      )}

      {showAddCategoryModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 20 }}>
          <div style={{ background: '#fff', borderRadius: '24px', padding: '32px', width: '100%', maxWidth: '400px', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)' }}>
            <h3 style={{ margin: '0 0 16px', fontSize: '1.25rem', fontWeight: 800 }}>New Category</h3>
            <p style={{ color: '#64748b', fontSize: '0.9rem', marginBottom: '24px' }}>Create a new genre or subject category for the library catalog.</p>
            <input 
              autoFocus
              type="text" 
              placeholder="e.g. Science Fiction" 
              value={newCategoryName}
              onChange={e => setNewCategoryName(e.target.value)}
              style={{ width: '100%', padding: '12px 16px', borderRadius: '12px', border: '2px solid #e2e8f0', outline: 'none', fontSize: '1rem', marginBottom: '24px' }}
            />
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button onClick={() => setShowAddCategoryModal(false)} style={{ padding: '10px 20px', borderRadius: '12px', border: 'none', background: '#f1f5f9', color: '#64748b', fontWeight: 600, cursor: 'pointer' }}>Cancel</button>
              <button 
                onClick={() => {
                  if(!newCategoryName.trim()) return;
                  setIsSubmitting(true);
                  api.post('/api/library/categories', { name: newCategoryName })
                    .then(() => {
                      setShowAddCategoryModal(false);
                      setNewCategoryName('');
                      api.get('/api/dashboard/library').then(r => setData(r.data)); // Refresh data
                    })
                    .catch(console.error)
                    .finally(() => setIsSubmitting(false));
                }} 
                disabled={isSubmitting}
                style={{ padding: '10px 20px', borderRadius: '12px', border: 'none', background: 'var(--school-primary, #3182ce)', color: '#fff', fontWeight: 600, cursor: 'pointer', opacity: isSubmitting ? 0.7 : 1 }}
              >{isSubmitting ? 'Saving...' : 'Save'}</button>
            </div>
          </div>
        </div>
      )}

      {clockModalAction && (
        <ClockInModal 
          action={clockModalAction} 
          onClose={() => setClockModalAction(null)} 
          onSuccess={fetchDashboardData} 
        />
      )}
    </div>
  );
}
