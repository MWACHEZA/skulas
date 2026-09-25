import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import api from '../../../lib/api';
import { useToast } from '../../../context/ToastContext';
import '../../../styles/portal.css';

type DiningTab = 'menu' | 'reports';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

export default function AdminDining() {
  const { showToast } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab: DiningTab = (searchParams.get('tab') as DiningTab) || 'menu';

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [reports, setReports] = useState<any[]>([]);

  // Menu State
  const [weekStarting, setWeekStarting] = useState(new Date().toISOString().split('T')[0]);
  const [isPublished, setIsPublished] = useState(true);
  const [weeklyMenu, setWeeklyMenu] = useState<Record<string, { breakfast: string; lunch: string; dinner: string }>>({
    Monday: { breakfast: 'Oatmeal & Fruits', lunch: 'Beef Stew & Sadza with Greens', dinner: 'Roast Chicken & Rice' },
    Tuesday: { breakfast: 'Scrambled Eggs & Toast', lunch: 'Chicken Stew & Rice with Salad', dinner: 'Spaghetti Bolognaise' },
    Wednesday: { breakfast: 'Pancakes & Syrup', lunch: 'Fish & Chips with Tartar', dinner: 'Beef Curry & Sadza' },
    Thursday: { breakfast: 'Cornflakes & Milk', lunch: 'Pork Chops & Mashed Potatoes', dinner: 'Vegetable Stew & Rice' },
    Friday: { breakfast: 'French Toast', lunch: 'Sadza & Mixed Braai Meats', dinner: 'Burger & Potato Wedges' },
    Saturday: { breakfast: 'Boiled Eggs & Toast', lunch: 'Jollof Rice & Grilled Chicken', dinner: 'Pasta Alfredo' },
    Sunday: { breakfast: 'Full English Breakfast', lunch: 'Sunday Roast Beef & Gravy', dinner: 'Soup & Fresh Rolls' }
  });

  useEffect(() => {
    fetchDiningData();
  }, [activeTab]);

  const fetchDiningData = async () => {
    setLoading(true);
    try {
      if (activeTab === 'menu') {
        const res = await api.get('/api/dining-hall/menu');
        if (res.data) {
          if (res.data.weekStarting) setWeekStarting(res.data.weekStarting.split('T')[0]);
          if (res.data.menuData) setWeeklyMenu(res.data.menuData);
          if (res.data.published !== undefined) setIsPublished(res.data.published);
        }
      } else {
        const res = await api.get('/api/dining-hall/reports');
        setReports(Array.isArray(res.data) ? res.data : []);
      }
    } catch (err) {
      console.error('Failed to load dining data', err);
    } finally {
      setLoading(false);
    }
  };

  const handleTabChange = (tab: DiningTab) => {
    setSearchParams({ tab });
  };

  const handleMealChange = (day: string, meal: 'breakfast' | 'lunch' | 'dinner', value: string) => {
    setWeeklyMenu(prev => ({
      ...prev,
      [day]: {
        ...prev[day],
        [meal]: value
      }
    }));
  };

  const handleSaveMenu = async () => {
    setSaving(true);
    try {
      await api.post('/api/dining-hall/menu', {
        weekStarting,
        menuData: weeklyMenu,
        published: isPublished
      });
      showToast('Weekly dining menu saved & updated', 'success');
    } catch (err) {
      showToast('Failed to save menu', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="portal-container" style={{ padding: '24px', maxWidth: '1400px', margin: '0 auto' }}>
      {/* Header */}
      <div className="portal-page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
        <div>
          <h1 style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '1.6rem', fontWeight: 700, color: '#1e293b' }}>
            <i className="fas fa-utensils" style={{ color: '#ea580c' }}></i>
            Dining Hall & Meal Service
          </h1>
          <p style={{ color: '#64748b', fontSize: '0.95rem', marginTop: '4px' }}>
            Weekly institutional meal menu planning, dietary requirements, and dining attendance reports.
          </p>
        </div>
        {activeTab === 'menu' && (
          <div>
            <button
              type="button"
              className="btn btn-primary"
              disabled={saving}
              onClick={handleSaveMenu}
              style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 18px', background: '#ea580c', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 600 }}
            >
              <i className="fas fa-save"></i>
              {saving ? 'Publishing...' : 'Save & Publish Menu'}
            </button>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div
        className="portal-tabs"
        style={{
          display: 'flex',
          gap: '8px',
          borderBottom: '2px solid #e2e8f0',
          marginBottom: '20px',
          background: '#fff',
          padding: '8px 12px 0 12px',
          borderRadius: '8px 8px 0 0'
        }}
      >
        <button
          type="button"
          onClick={() => handleTabChange('menu')}
          style={{
            padding: '10px 18px',
            border: 'none',
            background: 'none',
            cursor: 'pointer',
            fontWeight: activeTab === 'menu' ? 700 : 500,
            color: activeTab === 'menu' ? '#ea580c' : '#64748b',
            borderBottom: activeTab === 'menu' ? '3px solid #ea580c' : '3px solid transparent',
            marginBottom: '-2px',
            fontSize: '0.95rem',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          <i className="fas fa-calendar-alt"></i>
          Weekly Menu Planning
        </button>

        <button
          type="button"
          onClick={() => handleTabChange('reports')}
          style={{
            padding: '10px 18px',
            border: 'none',
            background: 'none',
            cursor: 'pointer',
            fontWeight: activeTab === 'reports' ? 700 : 500,
            color: activeTab === 'reports' ? '#ea580c' : '#64748b',
            borderBottom: activeTab === 'reports' ? '3px solid #ea580c' : '3px solid transparent',
            marginBottom: '-2px',
            fontSize: '0.95rem',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          <i className="fas fa-chart-pie"></i>
          Dietary Records & Meal Attendance
        </button>
      </div>

      {/* Tab Panels */}
      {loading ? (
        <div style={{ padding: 60, textAlign: 'center', background: '#fff', borderRadius: '8px' }}>
          <i className="fas fa-spinner fa-spin fa-2x" style={{ color: '#ea580c' }}></i>
          <p style={{ marginTop: 12, color: '#64748b' }}>Loading dining schedule...</p>
        </div>
      ) : activeTab === 'menu' ? (
        <div>
          {/* Week & Publish status bar */}
          <div style={{ background: '#fff', padding: '16px 20px', borderRadius: '8px', marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', flexWrap: 'wrap', gap: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <label style={{ fontSize: '0.85rem', fontWeight: 600, color: '#475569' }}>Week Commencing:</label>
              <input
                type="date"
                value={weekStarting}
                onChange={e => setWeekStarting(e.target.value)}
                style={{ padding: '6px 10px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
              />
            </div>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem', fontWeight: 600, color: '#475569', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={isPublished}
                onChange={e => setIsPublished(e.target.checked)}
              />
              Publish to Student & Parent Portals
            </label>
          </div>

          {/* Days Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: '16px' }}>
            {DAYS.map(day => (
              <div key={day} style={{ background: '#fff', borderRadius: '8px', padding: '18px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', border: '1px solid #e2e8f0' }}>
                <h3 style={{ margin: '0 0 14px 0', fontSize: '1.05rem', fontWeight: 700, color: '#1e293b', borderBottom: '1px solid #f1f5f9', paddingBottom: '8px' }}>
                  {day}
                </h3>

                <div style={{ marginBottom: '10px' }}>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#d97706', marginBottom: '4px', textTransform: 'uppercase' }}>
                    <i className="fas fa-sun" style={{ marginRight: 6 }}></i> Breakfast
                  </label>
                  <input
                    type="text"
                    value={weeklyMenu[day]?.breakfast || ''}
                    onChange={e => handleMealChange(day, 'breakfast', e.target.value)}
                    style={{ width: '100%', padding: '7px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
                  />
                </div>

                <div style={{ marginBottom: '10px' }}>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#059669', marginBottom: '4px', textTransform: 'uppercase' }}>
                    <i className="fas fa-cloud-sun" style={{ marginRight: 6 }}></i> Lunch
                  </label>
                  <input
                    type="text"
                    value={weeklyMenu[day]?.lunch || ''}
                    onChange={e => handleMealChange(day, 'lunch', e.target.value)}
                    style={{ width: '100%', padding: '7px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#4f46e5', marginBottom: '4px', textTransform: 'uppercase' }}>
                    <i className="fas fa-moon" style={{ marginRight: 6 }}></i> Dinner
                  </label>
                  <input
                    type="text"
                    value={weeklyMenu[day]?.dinner || ''}
                    onChange={e => handleMealChange(day, 'dinner', e.target.value)}
                    style={{ width: '100%', padding: '7px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        /* Reports Table */
        <div style={{ background: '#fff', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', overflow: 'hidden' }}>
          {reports.length === 0 ? (
            <div style={{ padding: 48, textAlign: 'center', color: '#64748b' }}>
              <i className="fas fa-utensils fa-3x" style={{ color: '#cbd5e1', marginBottom: 12 }}></i>
              <p style={{ fontWeight: 600 }}>No dietary reports recorded</p>
              <p style={{ fontSize: '0.85rem', marginTop: 4 }}>Daily meal service records will appear here.</p>
            </div>
          ) : (
            <table className="portal-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', textAlign: 'left' }}>
                  <th style={{ padding: '12px 16px', fontWeight: 600, color: '#475569', fontSize: '0.85rem' }}>Meal Date</th>
                  <th style={{ padding: '12px 16px', fontWeight: 600, color: '#475569', fontSize: '0.85rem' }}>Service</th>
                  <th style={{ padding: '12px 16px', fontWeight: 600, color: '#475569', fontSize: '0.85rem' }}>Students Served</th>
                  <th style={{ padding: '12px 16px', fontWeight: 600, color: '#475569', fontSize: '0.85rem' }}>Special Diets / Allergies</th>
                  <th style={{ padding: '12px 16px', fontWeight: 600, color: '#475569', fontSize: '0.85rem' }}>Supervisor</th>
                </tr>
              </thead>
              <tbody>
                {reports.map((r, idx) => (
                  <tr key={r.id || idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '12px 16px', fontWeight: 600, color: '#1e293b' }}>
                      {new Date(r.date || r.createdAt).toLocaleDateString()}
                    </td>
                    <td style={{ padding: '12px 16px', color: '#475569', fontSize: '0.9rem' }}>
                      {r.mealType || 'Lunch Service'}
                    </td>
                    <td style={{ padding: '12px 16px', fontWeight: 600, color: '#059669' }}>
                      {r.headcount || 240} meals
                    </td>
                    <td style={{ padding: '12px 16px', color: '#64748b', fontSize: '0.85rem' }}>
                      {r.specialDietNotes || 'Standard balanced menu served'}
                    </td>
                    <td style={{ padding: '12px 16px', color: '#64748b', fontSize: '0.85rem' }}>
                      {r.supervisor?.name || 'Kitchen Staff'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}
