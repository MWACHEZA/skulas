import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../../../contexts/AuthContext';
import { useToast } from '../../../context/ToastContext';
import api from '../../../lib/api';
import '../../../styles/portal.css';
import { SkeletonLoader } from '../../../components/shared';

interface WeeklyMenuData {
  breakfast: string;
  lunch: string;
  dinner: string;
  calories?: string;
  allergens?: string;
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
  reportedBy?: {
    name: string;
    role: string;
  };
}

export default function DHRepresentative() {
  const { user } = useAuth();
  const { showToast } = useToast();

  const [menu, setMenu] = useState<MenuData | null>(null);
  const [reports, setReports] = useState<DiningReport[]>([]);
  const [myReports, setMyReports] = useState<DiningReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDay, setSelectedDay] = useState<'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday'>('monday');
  const [activeTab, setActiveTab] = useState<'today' | 'week' | 'reviews' | 'rules'>('today');

  // Modals
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

  const isStudent = user?.role === 'STUDENT';
  const isStaff = user?.role === 'ANCILLARY' || user?.role === 'SCHOOL_ADMIN' || user?.role === 'TEACHER';
  const canModifyMenu = user?.role === 'SCHOOL_ADMIN' || 
                        user?.role === 'BURSAR' || 
                        user?.role === 'ANCILLARY' || 
                        user?.secondaryRoles?.includes('Kitchen Manager') ||
                        user?.secondaryRoles?.includes('Cook');

  // Fallback Menu Data
  const defaultMenuData: MenuData = {
    monday: { breakfast: 'Oatmeal Porridge, Honey & Tropical Fresh Fruits', lunch: 'Sadza with Tender Beef Stew & Braised Cabbage', dinner: 'Savory Rice & Herb Roast Chicken with Rich Gravy' },
    tuesday: { breakfast: 'Scrambled Eggs, Toasted Sourdough & Fresh Milk', lunch: 'Mild Chicken Curry with Fragrant Jasmine Rice', dinner: 'Spaghetti Bolognaise with Parmesan & Garden Salad' },
    wednesday: { breakfast: 'Fluffy Golden Pancakes with Maple Syrup & Tea', lunch: 'Crispy Battered Fish Fillets & Chips with Tartar Sauce', dinner: 'Sadza & Slow-Cooked Beef Stew with Mixed Greens' },
    thursday: { breakfast: 'Cornflakes, Banana Slices & Farm-Fresh Milk', lunch: 'Savory Beef Cottage Pie & Steamed Broccoli', dinner: 'Vegetable Chow Mein with Stir-Fried Tofu' },
    friday: { breakfast: 'French Toast with Cinnamon Butter & Hot Chocolate', lunch: 'Sadza & Braai-Grilled Chicken with Chakalaka', dinner: 'Gourmet Beef Burger with Seasoned Potato Wedges' },
    saturday: { breakfast: 'Boiled Eggs, Farmhouse Sausage & Buttered Toast', lunch: 'Spiced Jollof Rice & Roasted Chicken Drumsticks', dinner: 'Creamy Penne Alfredo with Sweet Peas & Carrots' },
    sunday: { breakfast: 'Full Weekend Breakfast (Eggs, Sausage, Baked Beans & Toast)', lunch: 'Traditional Sunday Roast Beef, Roast Potatoes & Pan Gravy', dinner: 'Hearty Cream of Tomato Soup with Crusty Garlic Rolls' }
  };

  const [menuForm, setMenuForm] = useState<MenuData>(defaultMenuData);

  useEffect(() => {
    // Set initial selected day to current day of week
    const dayNames: Array<'sunday' | 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday'> = [
      'sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'
    ];
    const todayIndex = new Date().getDay();
    const todayKey = dayNames[todayIndex] as any;
    setSelectedDay(todayKey);

    fetchDiningData();
  }, []);

  const fetchDiningData = async () => {
    setLoading(true);
    try {
      const [menuRes, reportsRes, myReportsRes] = await Promise.allSettled([
        api.get('/api/dining-hall/menu'),
        isStaff ? api.get('/api/dining-hall/reports') : Promise.resolve({ data: [] }),
        api.get('/api/dining-hall/my-reports')
      ]);

      if (menuRes.status === 'fulfilled' && menuRes.value.data?.menuData) {
        setMenu(menuRes.value.data.menuData);
        setMenuForm(menuRes.value.data.menuData);
      } else {
        setMenu(defaultMenuData);
      }

      if (reportsRes.status === 'fulfilled' && Array.isArray(reportsRes.value.data)) {
        setReports(reportsRes.value.data);
      }

      if (myReportsRes.status === 'fulfilled' && Array.isArray(myReportsRes.value.data)) {
        setMyReports(myReportsRes.value.data);
      }
    } catch (error) {
      console.error('Failed to load dining hall data:', error);
      setMenu(defaultMenuData);
    } finally {
      setLoading(false);
    }
  };

  const handleReportSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!feedbackForm.feedback.trim()) {
      showToast('Please provide your feedback or comments', 'warning');
      return;
    }
    try {
      await api.post('/api/dining-hall/reports', feedbackForm);
      showToast('Dining feedback submitted directly to Kitchen Management!', 'success');
      setShowReportModal(false);
      setFeedbackForm({ category: 'Food Quality', rating: 5, feedback: '' });
      fetchDiningData();
    } catch {
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
      showToast('Weekly Dining Menu published successfully!', 'success');
      setShowMenuEditModal(false);
      setMenu(menuForm);
    } catch {
      showToast('Failed to update dining menu', 'error');
    }
  };

  const handleAddItemSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addItemForm.item.trim()) {
      showToast('Please enter item description', 'warning');
      return;
    }

    const updatedMenu = {
      ...menuForm,
      [addItemForm.day]: {
        ...menuForm[addItemForm.day as keyof MenuData],
        [addItemForm.meal]: addItemForm.item.trim()
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
    } catch {
      showToast('Failed to add menu item', 'error');
    }
  };

  // Determine current meal period based on current hour
  const currentMealPeriod = useMemo(() => {
    const hour = new Date().getHours();
    if (hour >= 6 && hour < 10) return { name: 'Breakfast Service', time: '06:30 - 08:30', active: true, icon: 'fa-sun', color: '#d97706', bg: '#fef3c7' };
    if (hour >= 11 && hour < 15) return { name: 'Lunch Service', time: '12:00 - 14:30', active: true, icon: 'fa-utensils', color: '#2563eb', bg: '#dbeafe' };
    if (hour >= 17 && hour < 20) return { name: 'Dinner Service', time: '18:00 - 19:45', active: true, icon: 'fa-moon', color: '#7c3aed', bg: '#ede9fe' };
    return { name: 'Kitchen Prep & Closed', time: 'Next Service at 06:30', active: false, icon: 'fa-clock', color: '#64748b', bg: '#f1f5f9' };
  }, []);

  const activeMenu = menu || defaultMenuData;
  const currentDayData = activeMenu[selectedDay] || activeMenu.monday;

  const todayCards = [
    {
      title: 'Breakfast',
      time: '06:30 AM – 08:30 AM',
      dish: currentDayData.breakfast || 'Nutritious Morning Serving',
      desc: 'Energizing start featuring high-fiber whole grains, dairy, fresh seasonal fruit, and hot beverages.',
      calories: '420 kcal',
      allergens: 'Contains Dairy, Gluten',
      dietary: 'Vegetarian Option Available',
      icon: 'fa-coffee',
      theme: '#d97706',
      bg: '#fffbeb',
      badgeBg: '#fef3c7'
    },
    {
      title: 'Lunch',
      time: '12:00 PM – 02:30 PM',
      dish: currentDayData.lunch || 'Balanced Midday Meal',
      desc: 'Chef-crafted high-protein meal balanced with fresh local vegetables, carbohydrate staples, and salads.',
      calories: '780 kcal',
      allergens: 'Nut-Free Kitchen Protocol',
      dietary: 'Balanced Nutritional Standard',
      icon: 'fa-drumstick-bite',
      theme: '#2563eb',
      bg: '#eff6ff',
      badgeBg: '#dbeafe'
    },
    {
      title: 'Dinner',
      time: '06:00 PM – 07:45 PM',
      dish: currentDayData.dinner || 'Evening Entrée',
      desc: 'Satisfying wholesome supper formulated for evening recovery, digestion, and restful boarding sleep.',
      calories: '650 kcal',
      allergens: 'Prepared with Halal Certification',
      dietary: 'Freshly Prepared Daily',
      icon: 'fa-bowl-rice',
      theme: '#7c3aed',
      bg: '#f5f3ff',
      badgeBg: '#ede9fe'
    }
  ];

  const daysList: Array<{ key: keyof MenuData; label: string; short: string }> = [
    { key: 'monday', label: 'Monday', short: 'Mon' },
    { key: 'tuesday', label: 'Tuesday', short: 'Tue' },
    { key: 'wednesday', label: 'Wednesday', short: 'Wed' },
    { key: 'thursday', label: 'Thursday', short: 'Thu' },
    { key: 'friday', label: 'Friday', short: 'Fri' },
    { key: 'saturday', label: 'Saturday', short: 'Sat' },
    { key: 'sunday', label: 'Sunday', short: 'Sun' }
  ];

  return (
    <div className="portal-container" style={{ paddingBottom: '60px' }}>
      {/* Hero Dining Hall Banner */}
      <div 
        style={{
          background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #334155 100%)',
          borderRadius: '24px',
          padding: '32px 36px',
          color: '#ffffff',
          marginBottom: '28px',
          position: 'relative',
          overflow: 'hidden',
          boxShadow: '0 12px 30px rgba(0,0,0,0.12)'
        }}
      >
        <div style={{ position: 'relative', zIndex: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '20px' }}>
          <div>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', background: 'rgba(255,255,255,0.12)', padding: '6px 14px', borderRadius: '30px', fontSize: '0.82rem', fontWeight: 700, marginBottom: '12px' }}>
              <i className={`fas ${currentMealPeriod.icon}`} style={{ color: currentMealPeriod.color }}></i>
              <span>{currentMealPeriod.name}</span>
              <span style={{ opacity: 0.7 }}>• {currentMealPeriod.time}</span>
            </div>
            <h1 style={{ margin: '0 0 8px 0', fontSize: '2.1rem', fontWeight: 900, letterSpacing: '-0.02em', color: '#fff' }}>
              Campus Dining Hall & Canteen
            </h1>
            <p style={{ margin: 0, color: '#94a3b8', fontSize: '1rem', maxWidth: '600px', lineHeight: 1.5 }}>
              Wholesome, balanced, and chef-curated nutrition fueling academic excellence and daily wellness.
            </p>
          </div>

          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
            <button
              onClick={() => setShowReportModal(true)}
              className="portal-btn-primary"
              style={{
                background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                border: 'none',
                color: '#fff',
                padding: '12px 22px',
                borderRadius: '14px',
                fontWeight: 800,
                fontSize: '0.9rem',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                cursor: 'pointer',
                boxShadow: '0 6px 16px rgba(217, 119, 6, 0.35)'
              }}
            >
              <i className="fas fa-comment-alt"></i>
              Rate Meal / Service
            </button>

            {canModifyMenu && (
              <button
                onClick={() => setShowMenuEditModal(true)}
                style={{
                  background: 'rgba(255,255,255,0.14)',
                  border: '1px solid rgba(255,255,255,0.25)',
                  color: '#fff',
                  padding: '12px 18px',
                  borderRadius: '14px',
                  fontWeight: 700,
                  fontSize: '0.9rem',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  cursor: 'pointer'
                }}
              >
                <i className="fas fa-edit"></i>
                Publish Menu
              </button>
            )}
          </div>
        </div>

        {/* Ambient background badge */}
        <div 
          style={{
            position: 'absolute',
            right: '-20px',
            bottom: '-30px',
            fontSize: '12rem',
            opacity: 0.05,
            pointerEvents: 'none',
            color: '#fff'
          }}
        >
          <i className="fas fa-utensils"></i>
        </div>
      </div>

      {/* 4 Executive KPI Cards */}
      <div 
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '18px',
          marginBottom: '28px'
        }}
      >
        <div className="portal-card" style={{ padding: '20px', display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ width: '48px', height: '48px', borderRadius: '14px', background: '#dbeafe', color: '#1d4ed8', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.25rem' }}>
            <i className="fas fa-clock"></i>
          </div>
          <div>
            <div style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>Current Service</div>
            <div style={{ fontSize: '1.2rem', fontWeight: 900, color: '#0f172a' }}>{currentMealPeriod.name.split(' ')[0]}</div>
          </div>
        </div>

        <div className="portal-card" style={{ padding: '20px', display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ width: '48px', height: '48px', borderRadius: '14px', background: '#ecfdf5', color: '#059669', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.25rem' }}>
            <i className="fas fa-shield-alt"></i>
          </div>
          <div>
            <div style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>Hygiene Status</div>
            <div style={{ fontSize: '1.2rem', fontWeight: 900, color: '#059669' }}>Grade A+ Certified</div>
          </div>
        </div>

        <div className="portal-card" style={{ padding: '20px', display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ width: '48px', height: '48px', borderRadius: '14px', background: '#fef3c7', color: '#d97706', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.25rem' }}>
            <i className="fas fa-star"></i>
          </div>
          <div>
            <div style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>Student Rating</div>
            <div style={{ fontSize: '1.2rem', fontWeight: 900, color: '#0f172a' }}>
              {reports.length > 0 ? (reports.reduce((acc, r) => acc + r.rating, 0) / reports.length).toFixed(1) : '4.8'} / 5.0 ★
            </div>
          </div>
        </div>

        <div className="portal-card" style={{ padding: '20px', display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ width: '48px', height: '48px', borderRadius: '14px', background: '#ede9fe', color: '#7c3aed', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.25rem' }}>
            <i className="fas fa-heartbeat"></i>
          </div>
          <div>
            <div style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>Dietary Profile</div>
            <div style={{ fontSize: '1.2rem', fontWeight: 900, color: '#0f172a' }}>Nut-Free Campus</div>
          </div>
        </div>
      </div>

      {/* Main Tab Navigation */}
      <div 
        style={{
          display: 'flex',
          gap: '10px',
          borderBottom: '2px solid #e2e8f0',
          marginBottom: '24px',
          overflowX: 'auto',
          paddingBottom: '2px'
        }}
      >
        <button
          onClick={() => setActiveTab('today')}
          style={{
            padding: '12px 20px',
            background: 'none',
            border: 'none',
            borderBottom: activeTab === 'today' ? '3px solid #2563eb' : '3px solid transparent',
            color: activeTab === 'today' ? '#2563eb' : '#64748b',
            fontWeight: activeTab === 'today' ? 800 : 600,
            fontSize: '0.95rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            marginBottom: '-2px'
          }}
        >
          <i className="fas fa-calendar-day"></i>
          Today's Meal Board
        </button>

        <button
          onClick={() => setActiveTab('week')}
          style={{
            padding: '12px 20px',
            background: 'none',
            border: 'none',
            borderBottom: activeTab === 'week' ? '3px solid #2563eb' : '3px solid transparent',
            color: activeTab === 'week' ? '#2563eb' : '#64748b',
            fontWeight: activeTab === 'week' ? 800 : 600,
            fontSize: '0.95rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            marginBottom: '-2px'
          }}
        >
          <i className="fas fa-calendar-alt"></i>
          Weekly Cycle Menu
        </button>

        <button
          onClick={() => setActiveTab('reviews')}
          style={{
            padding: '12px 20px',
            background: 'none',
            border: 'none',
            borderBottom: activeTab === 'reviews' ? '3px solid #2563eb' : '3px solid transparent',
            color: activeTab === 'reviews' ? '#2563eb' : '#64748b',
            fontWeight: activeTab === 'reviews' ? 800 : 600,
            fontSize: '0.95rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            marginBottom: '-2px'
          }}
        >
          <i className="fas fa-comments"></i>
          Feedback & Reviews ({isStaff ? reports.length : myReports.length})
        </button>

        <button
          onClick={() => setActiveTab('rules')}
          style={{
            padding: '12px 20px',
            background: 'none',
            border: 'none',
            borderBottom: activeTab === 'rules' ? '3px solid #2563eb' : '3px solid transparent',
            color: activeTab === 'rules' ? '#2563eb' : '#64748b',
            fontWeight: activeTab === 'rules' ? 800 : 600,
            fontSize: '0.95rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            marginBottom: '-2px'
          }}
        >
          <i className="fas fa-book-open"></i>
          Dietary & Hall Guidelines
        </button>
      </div>

      {loading ? (
        <div style={{ padding: '24px 0' }}>
          <SkeletonLoader type="card" count={3} />
        </div>
      ) : (
        <>
          {/* TAB 1: TODAY'S MEAL BOARD */}
          {activeTab === 'today' && (
            <div>
              {/* Day selector pills */}
              <div 
                style={{ 
                  display: 'flex', 
                  gap: '8px', 
                  overflowX: 'auto', 
                  paddingBottom: '14px', 
                  marginBottom: '20px' 
                }}
              >
                {daysList.map(d => (
                  <button
                    key={d.key}
                    onClick={() => setSelectedDay(d.key)}
                    style={{
                      padding: '8px 18px',
                      borderRadius: '24px',
                      border: selectedDay === d.key ? '2px solid #2563eb' : '1px solid #e2e8f0',
                      background: selectedDay === d.key ? '#eff6ff' : '#ffffff',
                      color: selectedDay === d.key ? '#1d4ed8' : '#64748b',
                      fontWeight: selectedDay === d.key ? 800 : 600,
                      fontSize: '0.88rem',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                      whiteSpace: 'nowrap'
                    }}
                  >
                    {d.label}
                  </button>
                ))}
              </div>

              {/* 3 Meal Cards: Breakfast, Lunch, Dinner */}
              <div 
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
                  gap: '24px',
                  marginBottom: '32px'
                }}
              >
                {todayCards.map((meal, idx) => (
                  <div
                    key={idx}
                    className="portal-card"
                    style={{
                      borderRadius: '20px',
                      overflow: 'hidden',
                      border: '1px solid #e2e8f0',
                      display: 'flex',
                      flexDirection: 'column',
                      boxShadow: '0 4px 14px rgba(0,0,0,0.03)'
                    }}
                  >
                    {/* Header Strip */}
                    <div 
                      style={{
                        background: meal.bg,
                        padding: '18px 24px',
                        borderBottom: '1px solid rgba(0,0,0,0.05)',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div 
                          style={{
                            width: '40px',
                            height: '40px',
                            borderRadius: '12px',
                            background: '#ffffff',
                            color: meal.theme,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '1.1rem',
                            boxShadow: '0 2px 6px rgba(0,0,0,0.06)'
                          }}
                        >
                          <i className={`fas ${meal.icon}`}></i>
                        </div>
                        <div>
                          <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, color: '#0f172a' }}>{meal.title}</h3>
                          <span style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 600 }}>{meal.time}</span>
                        </div>
                      </div>

                      <span 
                        style={{
                          fontSize: '0.75rem',
                          fontWeight: 800,
                          color: meal.theme,
                          background: meal.badgeBg,
                          padding: '4px 10px',
                          borderRadius: '20px'
                        }}
                      >
                        <i className="fas fa-fire mr-1"></i>
                        {meal.calories}
                      </span>
                    </div>

                    {/* Meal Content */}
                    <div style={{ padding: '24px', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                      <div>
                        <h4 style={{ margin: '0 0 10px 0', fontSize: '1.25rem', fontWeight: 900, color: '#1e293b', lineHeight: 1.35 }}>
                          {meal.dish}
                        </h4>
                        <p style={{ margin: '0 0 20px 0', fontSize: '0.9rem', color: '#64748b', lineHeight: 1.6 }}>
                          {meal.desc}
                        </p>
                      </div>

                      <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: '16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.8rem', color: '#64748b', marginBottom: '8px' }}>
                          <span style={{ fontWeight: 700 }}><i className="fas fa-shield-virus mr-1" style={{ color: '#10b981' }}></i>Allergen Advisory:</span>
                          <span style={{ fontWeight: 600, color: '#475569' }}>{meal.allergens}</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.8rem', color: '#64748b' }}>
                          <span style={{ fontWeight: 700 }}><i className="fas fa-leaf mr-1" style={{ color: '#059669' }}></i>Standard:</span>
                          <span style={{ fontWeight: 600, color: '#475569' }}>{meal.dietary}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Service & Hall Etiquette Callout */}
              <div 
                style={{
                  background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)',
                  borderRadius: '18px',
                  padding: '24px 28px',
                  border: '1px solid #e2e8f0',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: '20px'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                  <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: '#dbeafe', color: '#1d4ed8', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.3rem' }}>
                    <i className="fas fa-hand-holding-heart"></i>
                  </div>
                  <div>
                    <h4 style={{ margin: '0 0 4px 0', fontSize: '1.05rem', fontWeight: 800, color: '#0f172a' }}>
                      Notice a service issue or special dietary concern?
                    </h4>
                    <p style={{ margin: 0, fontSize: '0.88rem', color: '#64748b' }}>
                      Submit your feedback anytime. Every response is reviewed daily by the Head of Catering.
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => setShowReportModal(true)}
                  className="portal-btn-secondary"
                  style={{
                    padding: '10px 20px',
                    borderRadius: '12px',
                    fontWeight: 700,
                    fontSize: '0.88rem',
                    cursor: 'pointer'
                  }}
                >
                  <i className="fas fa-pen-nib mr-2"></i>
                  Submit Service Feedback
                </button>
              </div>
            </div>
          )}

          {/* TAB 2: WEEKLY CYCLE MENU */}
          {activeTab === 'week' && (
            <div className="portal-card" style={{ padding: '24px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
                <div>
                  <h3 style={{ margin: '0 0 4px 0', fontSize: '1.25rem', fontWeight: 800, color: '#0f172a' }}>
                    7-Day School Cycle Menu
                  </h3>
                  <p style={{ margin: 0, fontSize: '0.88rem', color: '#64748b' }}>
                    Standard boarding school cycle reviewed by the School Nutrition Board.
                  </p>
                </div>

                {canModifyMenu && (
                  <button
                    onClick={() => setShowMenuEditModal(true)}
                    className="portal-btn-primary"
                    style={{
                      padding: '10px 18px',
                      borderRadius: '12px',
                      fontWeight: 800,
                      fontSize: '0.85rem'
                    }}
                  >
                    <i className="fas fa-edit mr-2"></i>Edit Full Schedule
                  </button>
                )}
              </div>

              <div style={{ overflowX: 'auto' }}>
                <table className="portal-table" style={{ width: '100%', minWidth: '700px' }}>
                  <thead>
                    <tr>
                      <th style={{ width: '120px' }}>Day</th>
                      <th>Breakfast</th>
                      <th>Lunch</th>
                      <th>Dinner</th>
                    </tr>
                  </thead>
                  <tbody>
                    {daysList.map(d => {
                      const dayMenu = activeMenu[d.key] || defaultMenuData[d.key];
                      const isToday = daysList[new Date().getDay() === 0 ? 6 : new Date().getDay() - 1]?.key === d.key;
                      return (
                        <tr key={d.key} style={{ background: isToday ? '#f0fdf4' : undefined }}>
                          <td style={{ fontWeight: 800, color: isToday ? '#15803d' : '#0f172a' }}>
                            {d.label}
                            {isToday && (
                              <span style={{ display: 'block', fontSize: '0.72rem', color: '#16a34a', fontWeight: 700 }}>
                                TODAY
                              </span>
                            )}
                          </td>
                          <td style={{ fontSize: '0.9rem', color: '#334155' }}>
                            <i className="fas fa-coffee mr-2" style={{ color: '#d97706', fontSize: '0.8rem' }}></i>
                            {dayMenu.breakfast || '—'}
                          </td>
                          <td style={{ fontSize: '0.9rem', color: '#334155' }}>
                            <i className="fas fa-drumstick-bite mr-2" style={{ color: '#2563eb', fontSize: '0.8rem' }}></i>
                            {dayMenu.lunch || '—'}
                          </td>
                          <td style={{ fontSize: '0.9rem', color: '#334155' }}>
                            <i className="fas fa-moon mr-2" style={{ color: '#7c3aed', fontSize: '0.8rem' }}></i>
                            {dayMenu.dinner || '—'}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 3: FEEDBACK & REVIEWS */}
          {activeTab === 'reviews' && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
                <div>
                  <h3 style={{ margin: '0 0 4px 0', fontSize: '1.25rem', fontWeight: 800, color: '#0f172a' }}>
                    {isStaff ? 'All Dining Service Reports' : 'My Submitted Dining Reports'}
                  </h3>
                  <p style={{ margin: 0, fontSize: '0.88rem', color: '#64748b' }}>
                    {isStaff ? 'Review student feedback, hygiene logs, and catering remarks.' : 'Direct records of your service feedback submitted to kitchen management.'}
                  </p>
                </div>

                <button
                  onClick={() => setShowReportModal(true)}
                  className="portal-btn-primary"
                  style={{
                    padding: '10px 18px',
                    borderRadius: '12px',
                    fontWeight: 800,
                    fontSize: '0.85rem'
                  }}
                >
                  <i className="fas fa-plus mr-2"></i>New Feedback
                </button>
              </div>

              {((isStaff ? reports : myReports).length === 0) ? (
                <div className="portal-card" style={{ padding: '60px 20px', textAlign: 'center' }}>
                  <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: '#f1f5f9', color: '#94a3b8', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.75rem', marginBottom: '16px' }}>
                    <i className="fas fa-comment-dots"></i>
                  </div>
                  <h4 style={{ margin: '0 0 6px 0', fontSize: '1.1rem', fontWeight: 800, color: '#0f172a' }}>No Feedback Submitted Yet</h4>
                  <p style={{ margin: 0, color: '#64748b', fontSize: '0.9rem' }}>
                    Share your thoughts on today's food quality, portions, or dining cleanliness.
                  </p>
                </div>
              ) : (
                <div style={{ display: 'grid', gap: '16px' }}>
                  {(isStaff ? reports : myReports).map(report => (
                    <div 
                      key={report.id}
                      className="portal-card"
                      style={{ padding: '20px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}
                    >
                      <div style={{ flex: 1, minWidth: '260px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                          <span 
                            style={{
                              fontSize: '0.75rem',
                              fontWeight: 800,
                              background: '#eff6ff',
                              color: '#1d4ed8',
                              padding: '4px 10px',
                              borderRadius: '20px'
                            }}
                          >
                            {report.category}
                          </span>
                          <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>
                            {new Date(report.createdAt).toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' })}
                          </span>
                          {report.reportedBy && (
                            <span style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 600 }}>
                              by {report.reportedBy.name} ({report.reportedBy.role})
                            </span>
                          )}
                        </div>
                        <p style={{ margin: 0, fontSize: '0.95rem', color: '#1e293b', lineHeight: 1.5 }}>
                          "{report.feedback}"
                        </p>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px', background: '#fef3c7', padding: '6px 14px', borderRadius: '20px', color: '#d97706', fontWeight: 800, fontSize: '0.9rem' }}>
                        <i className="fas fa-star"></i>
                        <span>{report.rating} / 5</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 4: GUIDELINES & HALL RULES */}
          {activeTab === 'rules' && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '24px' }}>
              <div className="portal-card" style={{ padding: '24px' }}>
                <h3 style={{ margin: '0 0 16px 0', fontSize: '1.15rem', fontWeight: 800, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <i className="fas fa-clock" style={{ color: '#2563eb' }}></i>
                  Dining Hall Service Schedule
                </h3>
                <div style={{ display: 'grid', gap: '14px', fontSize: '0.9rem', color: '#475569' }}>
                  <div style={{ padding: '12px 16px', background: '#f8fafc', borderRadius: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div><strong>Breakfast:</strong> Mon – Sun</div>
                    <span className="portal-badge info">06:30 – 08:30</span>
                  </div>
                  <div style={{ padding: '12px 16px', background: '#f8fafc', borderRadius: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div><strong>Lunch:</strong> Daily Midday</div>
                    <span className="portal-badge info">12:00 – 14:30</span>
                  </div>
                  <div style={{ padding: '12px 16px', background: '#f8fafc', borderRadius: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div><strong>Dinner:</strong> Boarding Evening</div>
                    <span className="portal-badge info">18:00 – 19:45</span>
                  </div>
                  <div style={{ padding: '12px 16px', background: '#f8fafc', borderRadius: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div><strong>Late Study Cocoa/Tea:</strong> Pre-Bed</div>
                    <span className="portal-badge info">20:30 – 21:15</span>
                  </div>
                </div>
              </div>

              <div className="portal-card" style={{ padding: '24px' }}>
                <h3 style={{ margin: '0 0 16px 0', fontSize: '1.15rem', fontWeight: 800, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <i className="fas fa-utensils" style={{ color: '#059669' }}></i>
                  Hall Etiquette & Rules
                </h3>
                <ul style={{ margin: 0, paddingLeft: '20px', fontSize: '0.9rem', color: '#475569', lineHeight: 1.8 }}>
                  <li>Proper school attire or authorized weekend casual dress is required.</li>
                  <li>Scan your digital student ID or present your boarding card at turnstiles.</li>
                  <li>Queue respectfully; cutting lines is subject to house master inquiry.</li>
                  <li>Clear and stack all trays and cutlery at designated drop stations.</li>
                  <li>Food and beverages may not be removed from the dining premises.</li>
                  <li>Special dietary items must be requested 24 hours in advance.</li>
                </ul>
              </div>
            </div>
          )}
        </>
      )}

      {/* FEEDBACK & REPORT MODAL */}
      {showReportModal && (
        <div className="portal-modal-overlay">
          <div className="portal-modal-card" style={{ maxWidth: '520px' }}>
            <div className="portal-modal-header">
              <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800, color: '#0f172a' }}>
                <i className="fas fa-comment-alt mr-2" style={{ color: '#d97706' }}></i>
                Rate Dining Hall Service
              </h2>
              <button 
                className="modal-close" 
                onClick={() => setShowReportModal(false)}
                style={{ border: 'none', background: 'none', fontSize: '1.5rem', cursor: 'pointer', color: '#64748b' }}
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleReportSubmit}>
              <div className="portal-modal-body" style={{ display: 'grid', gap: '18px' }}>
                <div>
                  <label className="portal-label">Service Category</label>
                  <select
                    className="portal-input"
                    value={feedbackForm.category}
                    onChange={e => setFeedbackForm({ ...feedbackForm, category: e.target.value })}
                  >
                    <option value="Food Quality">Food Quality & Taste</option>
                    <option value="Portion Size">Portion Size</option>
                    <option value="Cleanliness & Hygiene">Cleanliness & Hygiene</option>
                    <option value="Serving Speed">Serving Speed / Queue Time</option>
                    <option value="Staff Courtesy">Staff Courtesy</option>
                    <option value="Special Dietary">Special Dietary / Allergy</option>
                  </select>
                </div>

                <div>
                  <label className="portal-label">Your Rating (1 to 5 Stars)</label>
                  <div style={{ display: 'flex', gap: '10px', marginTop: '6px' }}>
                    {[1, 2, 3, 4, 5].map(star => (
                      <button
                        key={star}
                        type="button"
                        onClick={() => setFeedbackForm({ ...feedbackForm, rating: star })}
                        style={{
                          width: '46px',
                          height: '46px',
                          borderRadius: '12px',
                          border: feedbackForm.rating >= star ? '2px solid #f59e0b' : '1px solid #e2e8f0',
                          background: feedbackForm.rating >= star ? '#fef3c7' : '#ffffff',
                          color: feedbackForm.rating >= star ? '#d97706' : '#cbd5e1',
                          fontSize: '1.25rem',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          transition: 'all 0.15s ease'
                        }}
                      >
                        <i className="fas fa-star"></i>
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="portal-label">Detailed Comments / Suggestions *</label>
                  <textarea
                    className="portal-input"
                    rows={4}
                    placeholder="Tell us about the meal quality, temperature, portion, or dining hall atmosphere..."
                    value={feedbackForm.feedback}
                    onChange={e => setFeedbackForm({ ...feedbackForm, feedback: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="portal-modal-footer">
                <button
                  type="button"
                  className="portal-btn-neutral"
                  onClick={() => setShowReportModal(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="portal-btn-primary"
                  style={{
                    background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                    border: 'none',
                    padding: '10px 24px',
                    fontWeight: 800
                  }}
                >
                  Submit Feedback
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* PUBLISH / EDIT MENU MODAL (STAFF) */}
      {showMenuEditModal && (
        <div className="portal-modal-overlay">
          <div className="portal-modal-card" style={{ maxWidth: '750px', maxHeight: '90vh', overflowY: 'auto' }}>
            <div className="portal-modal-header">
              <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800, color: '#0f172a' }}>
                <i className="fas fa-calendar-edit mr-2" style={{ color: '#2563eb' }}></i>
                Edit 7-Day Cycle Menu
              </h2>
              <button 
                className="modal-close" 
                onClick={() => setShowMenuEditModal(false)}
                style={{ border: 'none', background: 'none', fontSize: '1.5rem', cursor: 'pointer', color: '#64748b' }}
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleMenuSubmit}>
              <div className="portal-modal-body" style={{ display: 'grid', gap: '20px' }}>
                {daysList.map(d => (
                  <div key={d.key} style={{ padding: '16px', background: '#f8fafc', borderRadius: '14px', border: '1px solid #e2e8f0' }}>
                    <h4 style={{ margin: '0 0 12px 0', fontSize: '1rem', fontWeight: 800, color: '#1e293b' }}>
                      {d.label}
                    </h4>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
                      <div>
                        <label style={{ fontSize: '0.78rem', fontWeight: 700, color: '#64748b' }}>Breakfast</label>
                        <input
                          type="text"
                          className="portal-input"
                          value={menuForm[d.key]?.breakfast || ''}
                          onChange={e => setMenuForm({
                            ...menuForm,
                            [d.key]: { ...menuForm[d.key], breakfast: e.target.value }
                          })}
                        />
                      </div>
                      <div>
                        <label style={{ fontSize: '0.78rem', fontWeight: 700, color: '#64748b' }}>Lunch</label>
                        <input
                          type="text"
                          className="portal-input"
                          value={menuForm[d.key]?.lunch || ''}
                          onChange={e => setMenuForm({
                            ...menuForm,
                            [d.key]: { ...menuForm[d.key], lunch: e.target.value }
                          })}
                        />
                      </div>
                      <div>
                        <label style={{ fontSize: '0.78rem', fontWeight: 700, color: '#64748b' }}>Dinner</label>
                        <input
                          type="text"
                          className="portal-input"
                          value={menuForm[d.key]?.dinner || ''}
                          onChange={e => setMenuForm({
                            ...menuForm,
                            [d.key]: { ...menuForm[d.key], dinner: e.target.value }
                          })}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="portal-modal-footer">
                <button
                  type="button"
                  className="portal-btn-neutral"
                  onClick={() => setShowMenuEditModal(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="portal-btn-primary"
                  style={{ padding: '10px 24px', fontWeight: 800 }}
                >
                  Save & Publish Weekly Menu
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
