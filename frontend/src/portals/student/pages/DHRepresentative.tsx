import React, { useState, useEffect } from 'react';
import { useAuth } from '../../../contexts/AuthContext';
import { useToast } from '../../../context/ToastContext';
import api from '../../../lib/api';
import '../../../styles/portal.css';

interface MenuItem {
  meal: string;
  description: string;
  calories?: string;
}

interface WeeklyMenuData {
  breakfast: string;
  lunch: string;
  dinner: string;
  calories?: string;
}

interface MenuData {
  monday: WeeklyMenuData;
  tuesday: WeeklyMenuData;
  wednesday: WeeklyMenuData;
  thursday: WeeklyMenuData;
  friday: WeeklyMenuData;
  saturday: WeeklyMenuData;
  sunday: WeeklyMenuData;
}

interface DiningReport {
  id: string;
  category: string;
  rating: number;
  feedback: string;
  createdAt: string;
  reportedBy: {
    name: string;
    role: string;
  };
}

export default function DHRepresentative() {
  const { user } = useAuth();
  const { showToast } = useToast();

  // Dynamic Data
  const [menu, setMenu] = useState<MenuData | null>(null);
  const [reports, setReports] = useState<DiningReport[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal and Form States
  const [showReportModal, setShowReportModal] = useState(false);
  const [showMenuEditModal, setShowMenuEditModal] = useState(false);
  const [showAddMenuItemModal, setShowAddMenuItemModal] = useState(false);

  const [addItemForm, setAddItemForm] = useState({
    day: 'monday',
    meal: 'breakfast',
    item: ''
  });

  const [feedbackForm, setFeedbackForm] = useState({
    category: 'Food Quality',
    rating: 5,
    feedback: ''
  });

  // Current day menu fallback
  const fallbackMenu = [
    { meal: 'Oatmeal & Tropical Fruit', description: 'Creamy oats topped with honey, mango, and toasted coconut.', type: 'Breakfast', calories: '320 kcal' },
    { meal: 'Grilled Peri-Peri Chicken', description: 'Flame-grilled chicken breast with spicy glaze, served with savory rice.', type: 'Lunch', calories: '650 kcal' },
    { meal: 'Garden Vegetable Medley', description: 'Seasonal roasted vegetables with herb-infused olive oil and rustic bread.', type: 'Dinner', calories: '480 kcal' },
  ];

  // Menu Form (For editing)
  const [menuForm, setMenuForm] = useState<MenuData>({
    monday: { breakfast: 'Oatmeal & Fruit', lunch: 'Grilled Chicken & Rice', dinner: 'Garden Veggie Medley' },
    tuesday: { breakfast: 'Cornflakes & Milk', lunch: 'Beef Stew & Sadza', dinner: 'Bean Soup & Bread' },
    wednesday: { breakfast: 'Mabel Oats & Banana', lunch: 'Boiled Eggs & Toast', dinner: 'Roasted Butternut' },
    thursday: { breakfast: 'Porridge & Milk', lunch: 'Chicken Pie & Chips', dinner: 'Fish & Mash' },
    friday: { breakfast: 'Pancakes & Syrup', lunch: 'Beef Burgers & Salad', dinner: 'Mixed Vegetable Curry' },
    saturday: { breakfast: 'Toast & Jam', lunch: 'Mac & Cheese', dinner: 'Meatballs & Pasta' },
    sunday: { breakfast: 'Scrambled Eggs', lunch: 'Roasted Chicken Feast', dinner: 'Light Tomato Soup' }
  });

  // Roles Definition
  const isStudent = user?.role === 'STUDENT';
  const isStaff = user?.role === 'ANCILLARY' || user?.role === 'SCHOOL_ADMIN' || user?.role === 'TEACHER';
  const canModifyMenu = user?.role === 'SCHOOL_ADMIN' || 
                        user?.role === 'BURSAR' || 
                        user?.role === 'ANCILLARY' || 
                        user?.secondaryRoles?.includes('Kitchen Manager') ||
                        user?.secondaryRoles?.includes('Cook');

  // Styles & Branding
  const primaryColor = user?.schoolBranding?.primaryColor || 'var(--portal-primary)';
  const accentColor = user?.schoolBranding?.accentColor || 'var(--portal-accent)';

  useEffect(() => {
    fetchDiningData();
  }, []);

  const fetchDiningData = async () => {
    setLoading(true);
    try {
      // Fetch Menu
      const menuRes = await api.get('/api/dining-hall/menu');
      if (menuRes.data && menuRes.data.menuData) {
        setMenu(menuRes.data.menuData);
        setMenuForm(menuRes.data.menuData);
      }

      // Fetch Reports if staff/admin
      if (isStaff) {
        const reportsRes = await api.get('/api/dining-hall/reports');
        setReports(reportsRes.data);
      }
    } catch (error) {
      console.error('Failed to fetch dining hall data:', error);
    
    } finally {
      setLoading(false);
    }
  };

  const handleReportSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/api/dining-hall/reports', feedbackForm);
      showToast('DH Report submitted to Kitchen Management!', 'success');
      setShowReportModal(false);
      setFeedbackForm({
        category: 'Food Quality',
        rating: 5,
        feedback: ''
      });
      fetchDiningData();
    } catch (error) {
      showToast('Failed to submit dining hall report', 'error');
    
    }
  };

  const handleMenuSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/api/dining-hall/menu', {
        weekStarting: new Date(),
        menuData: menuForm,
        published: true
      });
      showToast('Weekly Dining Menu updated successfully!', 'success');
      setShowMenuEditModal(false);
      fetchDiningData();
    } catch (error) {
      showToast('Failed to update dining menu', 'error');
    
    }
  };

  const handleAddItemSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addItemForm.item) {
      showToast('Please enter a menu item description', 'warning');
      return;
    }

    const updatedMenu = {
      ...menuForm,
      [addItemForm.day]: {
        ...menuForm[addItemForm.day as keyof MenuData],
        [addItemForm.meal]: addItemForm.item
      }
    };

    try {
      await api.post('/api/dining-hall/menu', {
        weekStarting: new Date(),
        menuData: updatedMenu,
        published: true
      });
      showToast(`Updated menu for ${addItemForm.day} ${addItemForm.meal}!`, 'success');
      setMenuForm(updatedMenu);
      setMenu(updatedMenu);
      setShowAddMenuItemModal(false);
      setAddItemForm(prev => ({ ...prev, item: '' }));
      fetchDiningData();
    } catch (error) {
      showToast('Failed to add menu item', 'error');
    
    }
  };

  // Get current day of week menu
  const getTodayMenu = () => {
    if (!menu) return fallbackMenu;
    const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const currentDay = days[new Date().getDay()] as keyof MenuData;
    const dayData = menu[currentDay];
    if (!dayData) return fallbackMenu;

    return [
      { meal: dayData.breakfast || 'N/A', description: 'Breakfast serving for today.', type: 'Breakfast', calories: '320 kcal' },
      { meal: dayData.lunch || 'N/A', description: 'Lunch serving for today.', type: 'Lunch', calories: '650 kcal' },
      { meal: dayData.dinner || 'N/A', description: 'Dinner serving for today.', type: 'Dinner', calories: '480 kcal' }
    ];
  };

  const todayMenu = getTodayMenu();

  return (
    <div className="dh-portal-container" style={{ 
      minHeight: '100vh', 
      background: `linear-gradient(135deg, ${primaryColor}08 0%, ${accentColor}08 100%)`, 
      padding: '30px' 
    }}>
      {/* Header */}
      <div className="portal-page-header">
        <h1 style={{ color: primaryColor, fontSize: '2.5rem', fontWeight: 900, margin: 0 }}>Dining Hall (DH) Hub</h1>
        <p style={{ color: accentColor, fontSize: '1.1rem', marginTop: '8px', fontWeight: 600 }}>
          Bridging the gap between the kitchen and the school body.
        </p>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px 0' }}>
          <i className="fas fa-spinner fa-spin fa-2x" style={{ color: primaryColor }}></i>
          <p style={{ marginTop: '16px', color: '#64748b' }}>Loading dining hall data...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
          
          {/* Menu Overview */}
          <div className="lg:col-span-1">
            <div className="portal-card">
              <div className="portal-card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h2 style={{ display: 'flex', alignItems: 'center', gap: 12, color: primaryColor, margin: 0, fontSize: '1.25rem', fontWeight: 800 }}>
                  <i className="fas fa-utensils"></i> Today's Menu
                </h2>
                {canModifyMenu && (
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button 
                      onClick={() => setShowAddMenuItemModal(true)}
                      className="portal-btn-primary" 
                      style={{ fontSize: '0.8rem', padding: '8px 12px', borderRadius: '8px', background: primaryColor, border: 'none', color: 'white', cursor: 'pointer' }}
                    >
                      <i className="fas fa-plus mr-1"></i> Add Item
                    </button>
                    <button 
                      onClick={() => setShowMenuEditModal(true)}
                      className="portal-btn-ghost" 
                      style={{ fontSize: '0.8rem', padding: '8px 12px', borderRadius: '8px' }}
                    >
                      <i className="fas fa-edit mr-1"></i> Edit Week
                    </button>
                  </div>
                )}
              </div>
              <div className="portal-card-body" style={{ padding: '25px' }}>
                <div className="space-y-6">
                  {todayMenu.map((item, index) => (
                    <div key={index} className="relative p-6 rounded-2xl transition-all hover:scale-[1.02]" style={{ 
                      background: item.type === 'Breakfast' ? 'linear-gradient(135deg, #fff 0%, #fffbf0 100%)' :
                                 item.type === 'Lunch' ? 'linear-gradient(135deg, #fff 0%, #f4f8ff 100%)' :
                                 'linear-gradient(135deg, #fff 0%, #fbf9ff 100%)',
                      boxShadow: '0 4px 15px rgba(0,0,0,0.02)'
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                         <span style={{ 
                           fontSize: '0.7rem', 
                           fontWeight: 800, 
                           letterSpacing: '0.05em', 
                           color: item.type === 'Breakfast' ? '#d97706' : item.type === 'Lunch' ? '#2563eb' : '#7c3aed',
                           background: item.type === 'Breakfast' ? '#fef3c7' : item.type === 'Lunch' ? '#dbeafe' : '#ede9fe',
                           padding: '4px 12px',
                           borderRadius: '20px'
                         }}>{item.type.toUpperCase()}</span>
                         <span style={{ fontSize: '0.75rem', color: '#718096' }}><i className="fas fa-fire mr-1"></i>{item.calories}</span>
                      </div>
                      <h4 style={{ margin: '0 0 4px 0', color: '#2d3748', fontSize: '1.1rem', fontWeight: 800 }}>{item.meal}</h4>
                      <p style={{ margin: 0, fontSize: '0.85rem', color: '#718096', lineHeight: 1.5 }}>{item.description}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Right Section: Student Action or Admin Logs */}
          <div className="lg:col-span-2">
            
            {/* Student Interface (Button to open Feedback Modal) */}
            {isStudent && (
              <div className="portal-card" style={{ textAlign: 'center', padding: '40px' }}>
                <div style={{ 
                  width: '80px', 
                  height: '80px', 
                  borderRadius: '50%', 
                  background: `${primaryColor}15`, 
                  color: primaryColor, 
                  display: 'inline-flex', 
                  alignItems: 'center', 
                  justifyContent: 'center', 
                  fontSize: '2.5rem', 
                  marginBottom: '20px' 
                }}>
                  <i className="fas fa-comment-medical"></i>
                </div>
                <h2 style={{ margin: '0 0 10px 0', fontWeight: 800, color: '#1e293b' }}>Student Service Report</h2>
                <p style={{ color: '#64748b', maxWidth: '500px', margin: '0 auto 30px auto', fontSize: '1.05rem', lineHeight: 1.6 }}>
                  Have comments, compliments, or feedback about the food quality, portion sizes, or dining services today? Submit an official report to the kitchen management.
                </p>
                <button 
                  onClick={() => setShowReportModal(true)} 
                  className="portal-btn-primary" 
                  style={{ 
                    background: primaryColor, 
                    border: 'none', 
                    padding: '16px 36px', 
                    borderRadius: '16px', 
                    fontWeight: 800, 
                    fontSize: '1.1rem', 
                    boxShadow: `0 10px 25px ${primaryColor}33` 
                  }}
                >
                  <i className="fas fa-paper-plane mr-2"></i> Submit Service Report
                </button>
              </div>
            )}

            {/* Staff / Admin Dashboard Logs */}
            {isStaff && (
              <div style={{ display: 'grid', gap: '30px' }}>
                
                {/* Stats Summary */}
                <div className="portal-stats-grid">
                  <div className="portal-stat-card" style={{ borderTop: `4px solid ${primaryColor}` }}>
                    <div className="portal-stat-icon" style={{ background: `${primaryColor}1A`, color: primaryColor }}>
                      <i className="fas fa-star"></i>
                    </div>
                    <div className="portal-stat-info">
                      <h3>
                        {reports.length > 0 ? (reports.reduce((acc, r) => acc + r.rating, 0) / reports.length).toFixed(1) : 'N/A'} / 10
                      </h3>
                      <p>Average Rating</p>
                    </div>
                  </div>
                  <div className="portal-stat-card" style={{ borderTop: `4px solid ${accentColor}` }}>
                    <div className="portal-stat-icon" style={{ background: `${accentColor}1A`, color: accentColor }}>
                      <i className="fas fa-file-alt"></i>
                    </div>
                    <div className="portal-stat-info">
                      <h3>{reports.length}</h3>
                      <p>Total Reports</p>
                    </div>
                  </div>
                </div>

                {/* Submissions Log */}
                <div className="portal-card">
                  <div className="portal-card-header">
                    <h2>Student Service Reports Log</h2>
                  </div>
                  <div className="portal-card-body" style={{ maxHeight: '450px', overflowY: 'auto' }}>
                    {reports.length === 0 ? (
                      <div style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>
                        No service reports submitted yet.
                      </div>
                    ) : (
                      reports.map(report => (
                        <div key={report.id} style={{ 
                          padding: '20px', 
                          border: '1px solid #f1f5f9', 
                          borderRadius: '16px',
                          background: '#f8fafc' 
                        }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '10px', marginBottom: '10px' }}>
                            <div>
                              <span className="status-badge" style={{ background: `${primaryColor}15`, color: primaryColor, marginRight: '8px' }}>
                                {report.category}
                              </span>
                              <span style={{ fontSize: '0.85rem', fontWeight: 800, color: '#1e293b' }}>
                                Rating: <strong style={{ color: primaryColor }}>{report.rating}/10</strong>
                              </span>
                            </div>
                            <span style={{ fontSize: '0.8rem', color: '#94a3b8', fontWeight: 600 }}>
                              {new Date(report.createdAt).toLocaleString()}
                            </span>
                          </div>
                          <p style={{ margin: '0 0 12px 0', fontSize: '0.92rem', color: '#475569', lineHeight: 1.5 }}>
                            "{report.feedback}"
                          </p>
                          <div style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 700 }}>
                            <i className="fas fa-user mr-1"></i> Reported by: {report.reportedBy?.name} ({report.reportedBy?.role})
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>

              </div>
            )}

          </div>

        </div>
      )}

      {/* POPUP MODALS */}

      {/* Submit Report Modal */}
      {showReportModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div className="portal-card" style={{ width: '90%', maxWidth: '550px', padding: '35px', borderRadius: '24px', background: 'white' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <h3 style={{ margin: 0, fontSize: '1.4rem', fontWeight: 800, color: '#1e293b' }}>Submit Student Service Report</h3>
              <button onClick={() => setShowReportModal(false)} style={{ background: 'none', border: 'none', fontSize: '1.2rem', cursor: 'pointer', color: '#94a3b8' }}>
                <i className="fas fa-times"></i>
              </button>
            </div>
            
            <form onSubmit={handleReportSubmit}>
              <div className="form-group mb-6">
                <label style={{ display: 'block', fontWeight: 700, color: '#4a5568', marginBottom: '8px' }}>Reporting Category</label>
                <select 
                  className="portal-select w-full" 
                  value={feedbackForm.category} 
                  onChange={e => setFeedbackForm({ ...feedbackForm, category: e.target.value })}
                >
                  <option>Food Quality</option>
                  <option>Portion Fairness</option>
                  <option>Kitchen Cleanliness</option>
                  <option>Service Speed</option>
                  <option>Special Dietary Needs</option>
                </select>
              </div>

              <div className="form-group mb-6">
                <label style={{ display: 'block', fontWeight: 700, color: '#4a5568', marginBottom: '8px' }}>Satisfaction Score ({feedbackForm.rating} / 10)</label>
                <input 
                  type="range" min="1" max="10" 
                  className="w-full h-2 rounded-lg cursor-pointer" 
                  value={feedbackForm.rating} 
                  onChange={e => setFeedbackForm({ ...feedbackForm, rating: parseInt(e.target.value) })}
                  style={{ accentColor: primaryColor }}
                />
              </div>

              <div className="form-group mb-6">
                <label style={{ display: 'block', fontWeight: 700, color: '#4a5568', marginBottom: '8px' }}>Observation Details</label>
                <textarea 
                  className="portal-input w-full" 
                  rows={4} required
                  placeholder="Describe your dining experience or specific issues..."
                  value={feedbackForm.feedback}
                  onChange={e => setFeedbackForm({ ...feedbackForm, feedback: e.target.value })}
                ></textarea>
              </div>

              <div style={{ background: '#fff5f5', border: '1px solid #fed7d7', borderRadius: '12px', padding: '15px', display: 'flex', gap: '12px', marginBottom: '24px' }}>
                <i className="fas fa-shield-alt" style={{ color: 'var(--portal-danger)', fontSize: '1.1rem', marginTop: '2px' }}></i>
                <p style={{ margin: 0, color: '#9b2c2c', fontSize: '0.82rem', lineHeight: 1.4 }}>
                  <strong>Policy Reminder:</strong> reports are official records used to improve school life. Please ensure observations are accurate.
                </p>
              </div>

              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                <button type="button" className="portal-btn-ghost" onClick={() => setShowReportModal(false)}>Cancel</button>
                <button type="submit" className="portal-btn-primary" style={{ background: primaryColor }}>Submit Report</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Menu Modal */}
      {showMenuEditModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div className="portal-card" style={{ width: '90%', maxWidth: '700px', maxHeight: '90vh', overflowY: 'auto', padding: '35px', borderRadius: '24px', background: 'white' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <h3 style={{ margin: 0, fontSize: '1.4rem', fontWeight: 800, color: '#1e293b' }}>Manage Weekly Menu</h3>
              <button onClick={() => setShowMenuEditModal(false)} style={{ background: 'none', border: 'none', fontSize: '1.2rem', cursor: 'pointer', color: '#94a3b8' }}>
                <i className="fas fa-times"></i>
              </button>
            </div>

            <form onSubmit={handleMenuSubmit}>
              <div style={{ display: 'grid', gap: '20px' }}>
                {(['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'] as const).map(day => (
                  <div key={day} style={{ borderBottom: '1px solid #f1f5f9', paddingBottom: '16px' }}>
                    <h4 style={{ textTransform: 'capitalize', color: primaryColor, margin: '0 0 10px 0', fontWeight: 800 }}>{day}</h4>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
                      <div className="form-group">
                        <label style={{ fontSize: '0.8rem', fontWeight: 700 }}>Breakfast</label>
                        <input 
                          type="text" className="portal-input w-full"
                          value={menuForm[day].breakfast}
                          onChange={e => setMenuForm({
                            ...menuForm,
                            [day]: { ...menuForm[day], breakfast: e.target.value }
                          })}
                        />
                      </div>
                      <div className="form-group">
                        <label style={{ fontSize: '0.8rem', fontWeight: 700 }}>Lunch</label>
                        <input 
                          type="text" className="portal-input w-full"
                          value={menuForm[day].lunch}
                          onChange={e => setMenuForm({
                            ...menuForm,
                            [day]: { ...menuForm[day], lunch: e.target.value }
                          })}
                        />
                      </div>
                      <div className="form-group">
                        <label style={{ fontSize: '0.8rem', fontWeight: 700 }}>Dinner</label>
                        <input 
                          type="text" className="portal-input w-full"
                          value={menuForm[day].dinner}
                          onChange={e => setMenuForm({
                            ...menuForm,
                            [day]: { ...menuForm[day], dinner: e.target.value }
                          })}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '30px' }}>
                <button type="button" className="portal-btn-ghost" onClick={() => setShowMenuEditModal(false)}>Cancel</button>
                <button type="submit" className="portal-btn-primary" style={{ background: primaryColor }}>Publish Menu</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Single Menu Item Modal */}
      {showAddMenuItemModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div className="portal-card" style={{ width: '95%', maxWidth: '500px', padding: '35px', borderRadius: '24px', background: 'white' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <h3 style={{ margin: 0, fontSize: '1.4rem', fontWeight: 800, color: '#1e293b' }}>Add Dining Menu Item</h3>
              <button onClick={() => setShowAddMenuItemModal(false)} style={{ background: 'none', border: 'none', fontSize: '1.2rem', cursor: 'pointer', color: '#94a3b8' }}>
                <i className="fas fa-times"></i>
              </button>
            </div>

            <form onSubmit={handleAddItemSubmit}>
              <div className="space-y-4">
                <div className="form-group">
                  <label style={{ display: 'block', fontWeight: 700, marginBottom: '8px', color: '#4b5563' }}>Day of Week</label>
                  <select 
                    className="portal-select w-full"
                    value={addItemForm.day} onChange={e => setAddItemForm({ ...addItemForm, day: e.target.value })}
                  >
                    <option value="monday">Monday</option>
                    <option value="tuesday">Tuesday</option>
                    <option value="wednesday">Wednesday</option>
                    <option value="thursday">Thursday</option>
                    <option value="friday">Friday</option>
                    <option value="saturday">Saturday</option>
                    <option value="sunday">Sunday</option>
                  </select>
                </div>

                <div className="form-group">
                  <label style={{ display: 'block', fontWeight: 700, marginBottom: '8px', color: '#4b5563' }}>Meal Type</label>
                  <select 
                    className="portal-select w-full"
                    value={addItemForm.meal} onChange={e => setAddItemForm({ ...addItemForm, meal: e.target.value })}
                  >
                    <option value="breakfast">Breakfast</option>
                    <option value="lunch">Lunch</option>
                    <option value="dinner">Dinner</option>
                  </select>
                </div>

                <div className="form-group">
                  <label style={{ display: 'block', fontWeight: 700, marginBottom: '8px', color: '#4b5563' }}>Menu Item Details</label>
                  <input 
                    type="text" className="portal-input w-full" required placeholder="e.g. Scrambled Eggs & Bacon"
                    value={addItemForm.item} onChange={e => setAddItemForm({ ...addItemForm, item: e.target.value })}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '30px' }}>
                <button type="button" className="portal-btn-ghost" onClick={() => setShowAddMenuItemModal(false)}>Cancel</button>
                <button type="submit" className="portal-btn-primary" style={{ background: primaryColor }}>Add to Menu</button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
