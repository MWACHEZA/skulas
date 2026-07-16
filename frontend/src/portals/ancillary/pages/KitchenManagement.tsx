import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../../lib/api';
import { useToast } from '../../../context/ToastContext';

export default function KitchenManagement() {
  const [menu, setMenu] = useState<any>(null);
  const [studentCounts, setStudentCounts] = useState({ total: 0, boarders: 0, staff: 0 });
  const [loading, setLoading] = useState(true);
  const [isMenuModalOpen, setIsMenuModalOpen] = useState(false);
  
  const { showToast } = useToast();

  const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

  useEffect(() => {
    fetchKitchenData();
  }, []);

  const fetchKitchenData = async () => {
    try {
      const [menuRes, studentRes, staffRes] = await Promise.all([
        api.get('/api/ancillary/menu/current'),
        api.get('/api/students'),
        api.get('/api/users')
      ]);
      
      setMenu(menuRes.data);
      
      const allStudents = studentRes.data.students || [];
      const boarders = allStudents.filter((s: any) => s.boardingStatus === 'Boarder').length;
      const staffTotal = staffRes.data.users.length;
      
      setStudentCounts({
        total: allStudents.length,
        boarders,
        staff: staffTotal
      });
    } catch (err) {
      showToast('Failed to load kitchen data', 'error');
    
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="portal-page-header">
        <h1>Kitchen & Dining Management</h1>
        <p>Plan meals, manage food inventory, and track student dining numbers.</p>
      </div>

      <div className="portal-grid-3" style={{ marginBottom: 30 }}>
        <div className="portal-card" style={{ background: '#f6ad55', color: '#744210' }}>
          <div className="portal-card-body" style={{ textAlign: 'center' }}>
            <h2 style={{ fontSize: '2.5rem', margin: 0 }}>{studentCounts.boarders}</h2>
            <p style={{ margin: 0, fontWeight: 600 }}>Total Boarders for Meals</p>
          </div>
        </div>
        <div className="portal-card" style={{ padding: 0 }}>
           <Link 
             to="/ancillary/procurement"
             className="portal-btn-primary" 
             style={{ width: '100%', height: '100%', borderRadius: 12, display: 'flex', flexDirection: 'column', gap: 10, alignItems: 'center', justifyContent: 'center', minHeight: 120, background: 'var(--portal-success)', textDecoration: 'none' }}
           >
             <i className="fas fa-shopping-basket" style={{ fontSize: '1.5rem' }}></i>
             <span>New Food Requisition</span>
           </Link>
        </div>
        <div className="portal-card">
           <button 
             onClick={() => setIsMenuModalOpen(true)}
             className="portal-btn-secondary" 
             style={{ width: '100%', height: '100%', borderRadius: 12, display: 'flex', flexDirection: 'column', gap: 10, alignItems: 'center', justifyContent: 'center', minHeight: 120 }}
           >
             <i className="fas fa-utensils" style={{ fontSize: '1.5rem' }}></i>
             <span>{menu ? 'Update Menu' : 'Plan Weekly Menu'}</span>
           </button>
        </div>
      </div>

      <div className="portal-card">
        <div className="portal-card-header">
          <h2><i className="fas fa-calendar-alt" style={{ marginRight: 10, color: '#f6ad55' }}></i>Weekly Menu Overview</h2>
        </div>
        <div className="portal-card-body" style={{ padding: 20 }}>
          {loading ? (
             <div style={{ textAlign: 'center' }}><i className="fas fa-spinner fa-spin"></i> Loading...</div>
          ) : menu ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 20 }}>
              {days.map(day => (
                <div key={day} style={{ background: '#f7fafc', padding: 15, borderRadius: 12, border: '1px solid #e2e8f0' }}>
                  <h3 style={{ textTransform: 'capitalize', margin: '0 0 10px', fontSize: '1rem', borderBottom: '2px solid #ed8936', paddingBottom: 5 }}>{day}</h3>
                  <div style={{ fontSize: '0.9rem' }}>
                    <p style={{ margin: '0 0 5px' }}><strong>B:</strong> {menu.menuData?.[day]?.breakfast || 'Not set'}</p>
                    <p style={{ margin: '0 0 5px' }}><strong>L:</strong> {menu.menuData?.[day]?.lunch || 'Not set'}</p>
                    <p style={{ margin: 0 }}><strong>D:</strong> {menu.menuData?.[day]?.dinner || 'Not set'}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: 40, color: '#a0aec0' }}>
              <i className="fas fa-utensils" style={{ fontSize: '3rem', marginBottom: 15, display: 'block' }}></i>
              <p>No menu has been published for this week yet.</p>
              <button onClick={() => setIsMenuModalOpen(true)} className="portal-btn-primary">Create First Menu</button>
            </div>
          )}
        </div>
      </div>

      <div className="portal-card" style={{ marginTop: 30 }}>
        <div className="portal-card-header">Kitchen Status</div>
        <div className="portal-card-body">
          <div style={{ display: 'flex', gap: 40 }}>
             <div>
               <p style={{ color: '#718096', margin: '0 0 5px', fontSize: '0.85rem' }}>Special Diets Requested</p>
               <p style={{ fontSize: '1.2rem', fontWeight: 700 }}>12</p>
             </div>
             <div>
               <p style={{ color: '#718096', margin: '0 0 5px', fontSize: '0.85rem' }}>Gas Level</p>
               <div style={{ width: 120, height: 10, background: '#e2e8f0', borderRadius: 5, marginTop: 5 }}>
                 <div style={{ width: '65%', height: '100%', background: 'var(--portal-success)', borderRadius: 5 }}></div>
               </div>
             </div>
          </div>
        </div>
      </div>
    </>
  );
}
