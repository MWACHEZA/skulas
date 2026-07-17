import React, { useState, useEffect } from 'react';
import { useAuth } from '../../../contexts/AuthContext';
import api from '../../../lib/api';
import { useToast } from '../../../context/ToastContext';
import '../../../styles/portal.css';

interface LivestockBatch {
  id: string;
  batchName: string;
  type: string;
  datePlaced: string;
  currentCount: number;
  startCount: number;
  mortalityRate: number;
  status: string;
}

interface CropCycle {
  id: string;
  name: string;
  type: string;
  sector: string;
  datePlanted: string;
  expectedHarvest: string;
  status: string;
}

interface InventoryItem {
  id: string;
  name: string;
  category: string;
  quantity: string;
  condition: string;
}

export default function FarmManagement() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState<'livestock' | 'crops' | 'inventory'>('livestock');

  // Dynamic Data
  const [livestock, setLivestock] = useState<LivestockBatch[]>([]);
  const [crops, setCrops] = useState<CropCycle[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Modals
  const [showBatchModal, setShowBatchModal] = useState(false);
  const [showCropModal, setShowCropModal] = useState(false);
  const [showInventoryModal, setShowInventoryModal] = useState(false);

  // Form States
  const [batchForm, setBatchForm] = useState({
    batchName: '',
    type: 'Broilers',
    datePlaced: '',
    startCount: '',
    currentCount: '',
    mortalityRate: '0.0',
    status: 'Maturing'
  });

  const [cropForm, setCropForm] = useState({
    name: '',
    type: '',
    sector: '',
    datePlanted: '',
    expectedHarvest: '',
    status: 'Growing'
  });

  const [inventoryForm, setInventoryForm] = useState({
    name: '',
    category: 'Consumables (Feed)',
    quantity: '',
    condition: 'Adequate'
  });

  // User Permissions
  const canModify = user?.role === 'SCHOOL_ADMIN' || 
                    user?.secondaryRoles?.includes('Agriculture Teacher') || 
                    user?.secondaryRoles?.includes('Farm Assistant') || 
                    user?.secondaryRoles?.includes('Farm Manager') || 
                    user?.secondaryRoles?.includes('Farm Manager Assistant');

  // Styles & Colors from School Branding
  const primaryColor = user?.schoolBranding?.primaryColor || '#0056b3'; // System default primary
  const accentColor = user?.schoolBranding?.accentColor || '#1e293b'; // System default accent

  // Respect School Type
  let title = 'School Farm & Agriculture Hub';
  let desc = 'Manage farm projects, livestock, crop schedules, and agricultural inventory.';
  if (user?.schoolType === 'primary') {
    title = 'School Vegetable Garden & Poultry Log';
    desc = 'Fun and educational crop growing and small animal logging for primary students.';
  } else if (user?.schoolType === 'tertiary' || user?.schoolType === 'university' || user?.schoolType === 'combined') {
    title = 'Agri-Academic Projects & Research Hub';
    desc = 'Monitor scientific crop trials, animal breeding research, and high-tech inventory.';
  }

  useEffect(() => {
    fetchData();
  }, [activeTab]);

  const fetchData = async () => {
    setLoading(true);
    try {
      if (activeTab === 'livestock') {
        const res = await api.get('/api/farm/livestock');
        setLivestock(res.data);
      } else if (activeTab === 'crops') {
        const res = await api.get('/api/farm/crops');
        setCrops(res.data);
      } else if (activeTab === 'inventory') {
        const res = await api.get('/api/farm/inventory');
        setInventory(res.data);
      }
    } catch (error) {
      showToast(`Failed to load ${activeTab
    } data`, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleAddBatch = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        ...batchForm,
        startCount: parseInt(batchForm.startCount),
        currentCount: parseInt(batchForm.currentCount || batchForm.startCount),
        mortalityRate: parseFloat(batchForm.mortalityRate)
      };
      await api.post('/api/farm/livestock', payload);
      showToast('Livestock batch added successfully', 'success');
      setShowBatchModal(false);
      setBatchForm({
        batchName: '',
        type: 'Broilers',
        datePlaced: '',
        startCount: '',
        currentCount: '',
        mortalityRate: '0.0',
        status: 'Maturing'
      });
      fetchData();
    } catch (error) {
      showToast('Failed to add livestock batch', 'error');
    
    }
  };

  const handleAddCrop = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/api/farm/crops', cropForm);
      showToast('Crop cycle added successfully', 'success');
      setShowCropModal(false);
      setCropForm({
        name: '',
        type: '',
        sector: '',
        datePlanted: '',
        expectedHarvest: '',
        status: 'Growing'
      });
      fetchData();
    } catch (error) {
      showToast('Failed to add crop cycle', 'error');
    
    }
  };

  const handleAddInventory = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/api/farm/inventory', inventoryForm);
      showToast('Inventory item added successfully', 'success');
      setShowInventoryModal(false);
      setInventoryForm({
        name: '',
        category: 'Consumables (Feed)',
        quantity: '',
        condition: 'Adequate'
      });
      fetchData();
    } catch (error) {
      showToast('Failed to add inventory item', 'error');
    
    }
  };

  return (
    <div className="portal-container" style={{ padding: '30px' }}>
      <div className="portal-page-header" style={{
        background: `linear-gradient(135deg, ${primaryColor}1A 0%, ${accentColor}1A 100%)`,
        borderLeft: `6px solid ${primaryColor}`,
        borderRadius: '16px',
        padding: '24px',
        marginBottom: '32px'
      }}>
        <div className="header-content">
          <h1 style={{ color: primaryColor, margin: 0, fontWeight: 900 }}>{title}</h1>
          <p style={{ color: '#475569', marginTop: '8px', fontSize: '1.05rem', fontWeight: 500 }}>{desc}</p>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '12px', marginBottom: '32px', flexWrap: 'wrap' }}>
        <button 
          onClick={() => setActiveTab('livestock')}
          style={{ 
            minWidth: '180px', 
            padding: '12px 24px', 
            borderRadius: '12px', 
            fontWeight: 800,
            fontSize: '0.95rem',
            transition: 'all 0.2s',
            border: activeTab === 'livestock' ? 'none' : '1px solid #cbd5e1',
            background: activeTab === 'livestock' ? primaryColor : 'white',
            color: activeTab === 'livestock' ? 'white' : '#475569',
            boxShadow: activeTab === 'livestock' ? `0 4px 14px ${primaryColor}4D` : 'none'
          }}
        >
          <i className="fas fa-drumstick-bite mr-2"></i> Livestock Monitoring
        </button>
        <button 
          onClick={() => setActiveTab('crops')}
          style={{ 
            minWidth: '180px', 
            padding: '12px 24px', 
            borderRadius: '12px', 
            fontWeight: 800,
            fontSize: '0.95rem',
            transition: 'all 0.2s',
            border: activeTab === 'crops' ? 'none' : '1px solid #cbd5e1',
            background: activeTab === 'crops' ? primaryColor : 'white',
            color: activeTab === 'crops' ? 'white' : '#475569',
            boxShadow: activeTab === 'crops' ? `0 4px 14px ${primaryColor}4D` : 'none'
          }}
        >
          <i className="fas fa-seedling mr-2"></i> Crops & Planting
        </button>
        <button 
          onClick={() => setActiveTab('inventory')}
          style={{ 
            minWidth: '180px', 
            padding: '12px 24px', 
            borderRadius: '12px', 
            fontWeight: 800,
            fontSize: '0.95rem',
            transition: 'all 0.2s',
            border: activeTab === 'inventory' ? 'none' : '1px solid #cbd5e1',
            background: activeTab === 'inventory' ? primaryColor : 'white',
            color: activeTab === 'inventory' ? 'white' : '#475569',
            boxShadow: activeTab === 'inventory' ? `0 4px 14px ${primaryColor}4D` : 'none'
          }}
        >
          <i className="fas fa-tractor mr-2"></i> Farm Inventory
        </button>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px 0' }}>
          <i className="fas fa-spinner fa-spin fa-2x" style={{ color: primaryColor }}></i>
          <p style={{ marginTop: '16px', color: '#64748b', fontWeight: 600 }}>Loading farm data...</p>
        </div>
      ) : (
        <>
          {/* LIVESTOCK TAB */}
          {activeTab === 'livestock' && (
            <div style={{ display: 'grid', gap: '32px' }}>
              <div className="portal-card" style={{ padding: '30px', borderRadius: '24px', boxShadow: '0 10px 30px rgba(0,0,0,0.04)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px', flexWrap: 'wrap', gap: '16px' }}>
                  <h3 style={{ margin: 0, fontSize: '1.4rem', fontWeight: 800, color: '#1e293b' }}>Active Batches</h3>
                  {canModify && (
                    <button 
                      onClick={() => setShowBatchModal(true)} 
                      className="portal-btn-primary"
                      style={{ background: primaryColor, padding: '0 32px', fontWeight: 900, height: '52px', borderRadius: '16px', display: 'flex', alignItems: 'center', gap: '12px' }}
                    >
                      <i className="fas fa-plus"></i> ADD BATCH
                    </button>
                  )}
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '20px', marginBottom: '32px' }}>
                  <div style={{ padding: '24px', borderRadius: '20px', background: `${primaryColor}08`, border: `1px solid ${primaryColor}20` }}>
                    <h4 style={{ color: primaryColor, margin: '0 0 10px 0', fontSize: '0.75rem', textTransform: 'uppercase', fontWeight: 800, letterSpacing: '0.05em' }}>Total Broilers</h4>
                    <div style={{ fontSize: '2.5rem', fontWeight: 900, color: primaryColor }}>
                      {livestock.filter(b => b.type === 'Broilers').reduce((acc, curr) => acc + curr.currentCount, 0)}
                    </div>
                  </div>
                  <div style={{ padding: '24px', borderRadius: '20px', background: `${accentColor}08`, border: `1px solid ${accentColor}20` }}>
                    <h4 style={{ color: accentColor, margin: '0 0 10px 0', fontSize: '0.75rem', textTransform: 'uppercase', fontWeight: 800, letterSpacing: '0.05em' }}>Layers</h4>
                    <div style={{ fontSize: '2.5rem', fontWeight: 900, color: accentColor }}>
                      {livestock.filter(b => b.type === 'Layers').reduce((acc, curr) => acc + curr.currentCount, 0)}
                    </div>
                  </div>
                  <div style={{ padding: '24px', borderRadius: '20px', background: '#ecfdf5', border: '1px solid #d1fae5' }}>
                    <h4 style={{ color: '#065f46', margin: '0 0 10px 0', fontSize: '0.75rem', textTransform: 'uppercase', fontWeight: 800, letterSpacing: '0.05em' }}>Avg Mortality</h4>
                    <div style={{ fontSize: '2.5rem', fontWeight: 900, color: '#059669' }}>
                      {livestock.length > 0 ? (livestock.reduce((acc, curr) => acc + curr.mortalityRate, 0) / livestock.length).toFixed(1) : 0}%
                    </div>
                  </div>
                </div>

                <div className="management-table-card" style={{ boxShadow: 'none', border: '1px solid #f1f5f9', borderRadius: '16px', overflow: 'hidden' }}>
                  <div className="table-responsive">
                    <table className="management-table">
                      <thead>
                        <tr>
                          <th>Batch Name / Type</th>
                          <th>Placed Date</th>
                          <th>Counts (Current / Start)</th>
                          <th>Mortality</th>
                          <th style={{ textAlign: 'center' }}>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {livestock.length === 0 ? (
                          <tr>
                            <td colSpan={5} style={{ textAlign: 'center', padding: '30px', color: '#64748b' }}>No livestock batches seeded yet.</td>
                          </tr>
                        ) : (
                          livestock.map(batch => (
                            <tr key={batch.id}>
                              <td>
                                <div style={{ fontWeight: 800, color: '#1e293b' }}>{batch.batchName}</div>
                                <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 700 }}>{batch.type}</div>
                              </td>
                              <td><span style={{ fontWeight: 700, color: '#475569' }}>{new Date(batch.datePlaced).toLocaleDateString()}</span></td>
                              <td>
                                <span style={{ fontWeight: 800, color: primaryColor }}>{batch.currentCount}</span>
                                <span style={{ color: '#94a3b8', fontSize: '0.8rem', marginLeft: '6px' }}>/ {batch.startCount}</span>
                              </td>
                              <td><span style={{ color: batch.mortalityRate > 3 ? 'var(--portal-danger)' : '#059669', fontWeight: 800 }}>{batch.mortalityRate}%</span></td>
                              <td style={{ textAlign: 'center' }}>
                                <span className={`status-badge ${batch.status === 'Producing' || batch.status === 'Active' ? 'status-active' : 'status-pending'}`}>
                                  {batch.status}
                                </span>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* CROPS TAB */}
          {activeTab === 'crops' && (
            <div style={{ display: 'grid', gap: '32px' }}>
              <div className="portal-card" style={{ padding: '30px', borderRadius: '24px', boxShadow: '0 10px 30px rgba(0,0,0,0.04)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px', flexWrap: 'wrap', gap: '16px' }}>
                  <h3 style={{ margin: 0, fontSize: '1.4rem', fontWeight: 800, color: '#1e293b' }}>Crop Cycle Planner</h3>
                  {canModify && (
                    <button 
                      onClick={() => setShowCropModal(true)} 
                      className="portal-btn-primary"
                      style={{ background: primaryColor, padding: '0 32px', fontWeight: 900, height: '52px', borderRadius: '16px', display: 'flex', alignItems: 'center', gap: '12px' }}
                    >
                      <i className="fas fa-plus"></i> ADD CROP EVENT
                    </button>
                  )}
                </div>

                <div style={{ display: 'grid', gap: '16px' }}>
                  {crops.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '30px', color: '#64748b', background: '#f8fafc', borderRadius: '16px', border: '1px dashed #cbd5e1' }}>
                      No crop cycles planned yet.
                    </div>
                  ) : (
                    crops.map(crop => (
                      <div key={crop.id} style={{ padding: '24px', border: '1px solid #f1f5f9', borderRadius: '20px', background: '#f8fafc', display: 'flex', gap: '24px', alignItems: 'center', flexWrap: 'wrap' }}>
                        <div style={{ 
                          width: '64px', 
                          height: '64px', 
                          borderRadius: '16px', 
                          background: crop.status === 'Ready for Harvest' ? '#ecfdf5' : '#fff7ed', 
                          color: crop.status === 'Ready for Harvest' ? '#059669' : '#ea580c', 
                          display: 'flex', 
                          alignItems: 'center', 
                          justifyContent: 'center', 
                          fontSize: '2rem' 
                        }}>
                          <i className={crop.type.toLowerCase().includes('maize') ? 'fas fa-leaf' : 'fas fa-carrot'}></i>
                        </div>
                        <div style={{ flex: 1, minWidth: '200px' }}>
                          <h4 style={{ margin: '0 0 4px 0', fontSize: '1.25rem', fontWeight: 800, color: '#1e293b' }}>{crop.name}</h4>
                          <p style={{ fontSize: '0.9rem', color: '#64748b', margin: 0, fontWeight: 600 }}>
                            Planted: {new Date(crop.datePlanted).toLocaleDateString()} | Expected Harvest: {new Date(crop.expectedHarvest).toLocaleDateString()} ({crop.sector})
                          </p>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', marginBottom: '8px' }}>Status</div>
                          <span className={`status-badge ${crop.status === 'Ready for Harvest' ? 'status-active' : 'status-pending'}`}>
                            {crop.status}
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}

          {/* INVENTORY TAB */}
          {activeTab === 'inventory' && (
            <div style={{ display: 'grid', gap: '32px' }}>
              <div className="portal-card" style={{ padding: '30px', borderRadius: '24px', boxShadow: '0 10px 30px rgba(0,0,0,0.04)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px', flexWrap: 'wrap', gap: '16px' }}>
                  <h3 style={{ margin: 0, fontSize: '1.4rem', fontWeight: 800, color: '#1e293b' }}>Agricultural Equipment & Supplies</h3>
                  {canModify && (
                    <button 
                      onClick={() => setShowInventoryModal(true)} 
                      className="portal-btn-primary"
                      style={{ background: primaryColor, padding: '0 32px', fontWeight: 900, height: '52px', borderRadius: '16px', display: 'flex', alignItems: 'center', gap: '12px' }}
                    >
                      <i className="fas fa-plus"></i> ADD SUPPLY / TOOL
                    </button>
                  )}
                </div>

                <div className="management-table-card" style={{ boxShadow: 'none', border: '1px solid #f1f5f9', borderRadius: '16px', overflow: 'hidden' }}>
                  <div className="table-responsive">
                    <table className="management-table">
                      <thead>
                        <tr>
                          <th>Item Name</th>
                          <th>Category</th>
                          <th>Stock / Quantity</th>
                          <th style={{ textAlign: 'right' }}>Condition / Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {inventory.length === 0 ? (
                          <tr>
                            <td colSpan={4} style={{ textAlign: 'center', padding: '30px', color: '#64748b' }}>No inventory recorded yet.</td>
                          </tr>
                        ) : (
                          inventory.map(item => (
                            <tr key={item.id}>
                              <td><span style={{ fontWeight: 800, color: '#1e293b' }}>{item.name}</span></td>
                              <td><span style={{ fontWeight: 700, color: '#64748b' }}>{item.category}</span></td>
                              <td><span style={{ fontWeight: 800, color: '#2563eb' }}>{item.quantity}</span></td>
                              <td style={{ textAlign: 'right' }}>
                                <span className={`status-badge ${
                                  item.condition === 'Adequate' || item.condition === 'Good Condition' ? 'status-active' : 
                                  item.condition === 'Low Stock' ? 'status-inactive' : ''
                                }`} style={{
                                  background: item.condition.includes('Condition') ? '#f1f5f9' : undefined,
                                  color: item.condition.includes('Condition') ? '#475569' : undefined
                                }}>
                                  {item.condition}
                                </span>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* MODALS */}

      {/* Add Batch Modal */}
      {showBatchModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div className="portal-card" style={{ width: '90%', maxWidth: '550px', padding: '35px', borderRadius: '24px', background: 'white' }}>
            <h3 style={{ margin: '0 0 24px 0', fontSize: '1.4rem', fontWeight: 800 }}>Record New Livestock Batch</h3>
            <form onSubmit={handleAddBatch}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '20px' }}>
                <div className="form-group" style={{ gridColumn: 'span 2' }}>
                  <label style={{ display: 'block', fontWeight: 700, marginBottom: '8px' }}>Batch Name / Code</label>
                  <input 
                    type="text" className="portal-input w-full" required
                    value={batchForm.batchName} onChange={e => setBatchForm({ ...batchForm, batchName: e.target.value })}
                    placeholder="e.g. Batch C - Layers"
                  />
                </div>
                <div className="form-group">
                  <label style={{ display: 'block', fontWeight: 700, marginBottom: '8px' }}>Livestock Type</label>
                  <select 
                    className="portal-select w-full"
                    value={batchForm.type} onChange={e => setBatchForm({ ...batchForm, type: e.target.value })}
                  >
                    <option>Broilers</option>
                    <option>Layers</option>
                    <option>Turkeys</option>
                    <option>Cattle</option>
                    <option>Pigs</option>
                  </select>
                </div>
                <div className="form-group">
                  <label style={{ display: 'block', fontWeight: 700, marginBottom: '8px' }}>Placement Date</label>
                  <input 
                    type="date" className="portal-input w-full" required
                    value={batchForm.datePlaced} onChange={e => setBatchForm({ ...batchForm, datePlaced: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label style={{ display: 'block', fontWeight: 700, marginBottom: '8px' }}>Initial Count</label>
                  <input 
                    type="number" className="portal-input w-full" required
                    value={batchForm.startCount} onChange={e => setBatchForm({ ...batchForm, startCount: e.target.value, currentCount: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label style={{ display: 'block', fontWeight: 700, marginBottom: '8px' }}>Current Count</label>
                  <input 
                    type="number" className="portal-input w-full"
                    value={batchForm.currentCount} onChange={e => setBatchForm({ ...batchForm, currentCount: e.target.value })}
                  />
                </div>
              </div>
              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '30px' }}>
                <button type="button" className="portal-btn-ghost" onClick={() => setShowBatchModal(false)}>Cancel</button>
                <button type="submit" className="portal-btn-primary" style={{ background: primaryColor, padding: '0 32px', fontWeight: 900, height: '52px', borderRadius: '16px', display: 'flex', alignItems: 'center', gap: '12px' }}>SAVE BATCH</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Crop Modal */}
      {showCropModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div className="portal-card" style={{ width: '90%', maxWidth: '550px', padding: '35px', borderRadius: '24px', background: 'white' }}>
            <h3 style={{ margin: '0 0 24px 0', fontSize: '1.4rem', fontWeight: 800 }}>Schedule New Crop Cycle</h3>
            <form onSubmit={handleAddCrop}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '20px' }}>
                <div className="form-group" style={{ gridColumn: 'span 2' }}>
                  <label style={{ display: 'block', fontWeight: 700, marginBottom: '8px' }}>Crop Identifier</label>
                  <input 
                    type="text" className="portal-input w-full" required
                    value={cropForm.name} onChange={e => setCropForm({ ...cropForm, name: e.target.value })}
                    placeholder="e.g. Cabbage Patch 3"
                  />
                </div>
                <div className="form-group">
                  <label style={{ display: 'block', fontWeight: 700, marginBottom: '8px' }}>Crop Type</label>
                  <input 
                    type="text" className="portal-input w-full" required
                    value={cropForm.type} onChange={e => setCropForm({ ...cropForm, type: e.target.value })}
                    placeholder="e.g. Cabbages, Maize"
                  />
                </div>
                <div className="form-group">
                  <label style={{ display: 'block', fontWeight: 700, marginBottom: '8px' }}>Field Sector / Zone</label>
                  <input 
                    type="text" className="portal-input w-full" required
                    value={cropForm.sector} onChange={e => setCropForm({ ...cropForm, sector: e.target.value })}
                    placeholder="e.g. Sector 4B"
                  />
                </div>
                <div className="form-group">
                  <label style={{ display: 'block', fontWeight: 700, marginBottom: '8px' }}>Date Planted</label>
                  <input 
                    type="date" className="portal-input w-full" required
                    value={cropForm.datePlanted} onChange={e => setCropForm({ ...cropForm, datePlanted: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label style={{ display: 'block', fontWeight: 700, marginBottom: '8px' }}>Expected Harvest</label>
                  <input 
                    type="date" className="portal-input w-full" required
                    value={cropForm.expectedHarvest} onChange={e => setCropForm({ ...cropForm, expectedHarvest: e.target.value })}
                  />
                </div>
              </div>
              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '30px' }}>
                <button type="button" className="portal-btn-ghost" onClick={() => setShowCropModal(false)}>Cancel</button>
                <button type="submit" className="portal-btn-primary" style={{ background: primaryColor, padding: '0 32px', fontWeight: 900, height: '52px', borderRadius: '16px', display: 'flex', alignItems: 'center', gap: '12px' }}>SCHEDULE CROP</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Inventory Modal */}
      {showInventoryModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div className="portal-card" style={{ width: '90%', maxWidth: '550px', padding: '35px', borderRadius: '24px', background: 'white' }}>
            <h3 style={{ margin: '0 0 24px 0', fontSize: '1.4rem', fontWeight: 800 }}>Record Supply or Equipment</h3>
            <form onSubmit={handleAddInventory}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '20px' }}>
                <div className="form-group" style={{ gridColumn: 'span 2' }}>
                  <label style={{ display: 'block', fontWeight: 700, marginBottom: '8px' }}>Item Name</label>
                  <input 
                    type="text" className="portal-input w-full" required
                    value={inventoryForm.name} onChange={e => setInventoryForm({ ...inventoryForm, name: e.target.value })}
                    placeholder="e.g. Spade, NPK Fertilizer"
                  />
                </div>
                <div className="form-group">
                  <label style={{ display: 'block', fontWeight: 700, marginBottom: '8px' }}>Category</label>
                  <select 
                    className="portal-select w-full"
                    value={inventoryForm.category} onChange={e => setInventoryForm({ ...inventoryForm, category: e.target.value })}
                  >
                    <option>Consumables (Feed)</option>
                    <option>Consumables (Fertilizer)</option>
                    <option>Consumables (Seeds)</option>
                    <option>Equipment</option>
                    <option>Tools</option>
                  </select>
                </div>
                <div className="form-group">
                  <label style={{ display: 'block', fontWeight: 700, marginBottom: '8px' }}>Quantity / Units</label>
                  <input 
                    type="text" className="portal-input w-full" required
                    value={inventoryForm.quantity} onChange={e => setInventoryForm({ ...inventoryForm, quantity: e.target.value })}
                    placeholder="e.g. 5 Units, 25 Bags"
                  />
                </div>
                <div className="form-group" style={{ gridColumn: 'span 2' }}>
                  <label style={{ display: 'block', fontWeight: 700, marginBottom: '8px' }}>Condition / Stock Status</label>
                  <select 
                    className="portal-select w-full"
                    value={inventoryForm.condition} onChange={e => setInventoryForm({ ...inventoryForm, condition: e.target.value })}
                  >
                    <option>Adequate</option>
                    <option>Good Condition</option>
                    <option>Low Stock</option>
                    <option>Damaged</option>
                    <option>Needs Repair</option>
                  </select>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '30px' }}>
                <button type="button" className="portal-btn-ghost" onClick={() => setShowInventoryModal(false)}>Cancel</button>
                <button type="submit" className="portal-btn-primary" style={{ background: primaryColor, padding: '0 32px', fontWeight: 900, height: '52px', borderRadius: '16px', display: 'flex', alignItems: 'center', gap: '12px' }}>ADD TO INVENTORY</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
