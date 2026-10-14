import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../../../contexts/AuthContext';
import api from '../../../lib/api';
import { useToast } from '../../../context/ToastContext';
import { SearchInput, ExportButton } from '../../../components/shared';
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

  // Search Query
  const [searchQuery, setSearchQuery] = useState('');

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
                    user?.role === 'SUPER_ADMIN' ||
                    user?.secondaryRoles?.includes('Agriculture Teacher') || 
                    user?.secondaryRoles?.includes('Farm Assistant') || 
                    user?.secondaryRoles?.includes('Farm Manager') || 
                    user?.secondaryRoles?.includes('Farm Manager Assistant');

  // Styles & Colors from School Branding
  const primaryColor = user?.schoolBranding?.primaryColor || '#0056b3';
  const accentColor = user?.schoolBranding?.accentColor || '#1e293b';

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
      showToast(`Failed to load ${activeTab} data`, 'error');
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

  // Filtered Data
  const filteredLivestock = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return livestock;
    return livestock.filter(b => 
      b.batchName.toLowerCase().includes(q) || 
      b.type.toLowerCase().includes(q) || 
      b.status.toLowerCase().includes(q)
    );
  }, [livestock, searchQuery]);

  const filteredCrops = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return crops;
    return crops.filter(c => 
      c.name.toLowerCase().includes(q) || 
      c.type.toLowerCase().includes(q) || 
      c.sector.toLowerCase().includes(q) || 
      c.status.toLowerCase().includes(q)
    );
  }, [crops, searchQuery]);

  const filteredInventory = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return inventory;
    return inventory.filter(i => 
      i.name.toLowerCase().includes(q) || 
      i.category.toLowerCase().includes(q) || 
      i.condition.toLowerCase().includes(q)
    );
  }, [inventory, searchQuery]);

  // Export Columns & Data
  const exportHeaders = useMemo(() => {
    if (activeTab === 'livestock') {
      return ['Batch Name', 'Type', 'Placed Date', 'Current Count', 'Start Count', 'Mortality %', 'Status'];
    } else if (activeTab === 'crops') {
      return ['Identifier', 'Crop Type', 'Field Sector', 'Planted Date', 'Expected Harvest', 'Status'];
    } else {
      return ['Item Name', 'Category', 'Quantity', 'Condition'];
    }
  }, [activeTab]);

  const exportData = useMemo(() => {
    if (activeTab === 'livestock') {
      return filteredLivestock.map(b => ({
        'Batch Name': b.batchName,
        'Type': b.type,
        'Placed Date': new Date(b.datePlaced).toLocaleDateString(),
        'Current Count': b.currentCount,
        'Start Count': b.startCount,
        'Mortality %': `${b.mortalityRate}%`,
        'Status': b.status
      }));
    } else if (activeTab === 'crops') {
      return filteredCrops.map(c => ({
        'Identifier': c.name,
        'Crop Type': c.type,
        'Field Sector': c.sector,
        'Planted Date': new Date(c.datePlanted).toLocaleDateString(),
        'Expected Harvest': new Date(c.expectedHarvest).toLocaleDateString(),
        'Status': c.status
      }));
    } else {
      return filteredInventory.map(i => ({
        'Item Name': i.name,
        'Category': i.category,
        'Quantity': i.quantity,
        'Condition': i.condition
      }));
    }
  }, [activeTab, filteredLivestock, filteredCrops, filteredInventory]);

  return (
    <div className="portal-container" style={{ padding: '28px', maxWidth: '1440px', margin: '0 auto' }}>
      {/* Modern Header Banner */}
      <div style={{
        background: 'linear-gradient(135deg, #064e3b 0%, #047857 50%, #059669 100%)',
        borderRadius: '20px',
        padding: '30px',
        color: '#ffffff',
        marginBottom: '28px',
        boxShadow: '0 10px 25px -5px rgba(5, 150, 105, 0.25)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '20px'
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
            <span style={{
              background: 'rgba(255,255,255,0.2)',
              borderRadius: '10px',
              padding: '6px 12px',
              fontSize: '0.8rem',
              fontWeight: 800,
              textTransform: 'uppercase',
              letterSpacing: '0.05em'
            }}>
              Agricultural Operations
            </span>
          </div>
          <h1 style={{ margin: 0, fontSize: '1.9rem', fontWeight: 900, letterSpacing: '-0.02em', color: '#ffffff' }}>
            {title}
          </h1>
          <p style={{ margin: '8px 0 0', opacity: 0.9, fontSize: '1rem', fontWeight: 500, maxWidth: '650px' }}>
            {desc}
          </p>
        </div>

        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <ExportButton
            data={exportData as any}
            filename={`farm_${activeTab}_report`}
            title={`${title} - ${activeTab.toUpperCase()}`}
            headers={exportHeaders}
          />
          {canModify && (
            <button
              onClick={() => {
                if (activeTab === 'livestock') setShowBatchModal(true);
                else if (activeTab === 'crops') setShowCropModal(true);
                else setShowInventoryModal(true);
              }}
              style={{
                background: '#ffffff',
                color: '#064e3b',
                border: 'none',
                borderRadius: '12px',
                padding: '12px 22px',
                fontWeight: 800,
                fontSize: '0.9rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
              }}
            >
              <i className="fas fa-plus"></i>
              {activeTab === 'livestock' ? 'New Batch' : activeTab === 'crops' ? 'Schedule Crop' : 'Add Item'}
            </button>
          )}
        </div>
      </div>

      {/* KPI Summary Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '18px', marginBottom: '28px' }}>
        <div style={{
          background: '#ffffff',
          borderRadius: '16px',
          padding: '20px 22px',
          border: '1px solid #e2e8f0',
          boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div>
            <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Total Broilers</div>
            <div style={{ fontSize: '1.9rem', fontWeight: 900, color: '#0f172a', marginTop: '6px' }}>
              {livestock.filter(b => b.type.toLowerCase().includes('broiler')).reduce((acc, curr) => acc + (curr.currentCount || 0), 0).toLocaleString()}
            </div>
            <div style={{ fontSize: '0.75rem', color: '#059669', fontWeight: 700, marginTop: '4px' }}>Active production</div>
          </div>
          <div style={{ width: 48, height: 48, borderRadius: 12, background: '#ecfdf5', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#059669', fontSize: '1.3rem' }}>
            <i className="fas fa-drumstick-bite"></i>
          </div>
        </div>

        <div style={{
          background: '#ffffff',
          borderRadius: '16px',
          padding: '20px 22px',
          border: '1px solid #e2e8f0',
          boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div>
            <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Total Layers</div>
            <div style={{ fontSize: '1.9rem', fontWeight: 900, color: '#0f172a', marginTop: '6px' }}>
              {livestock.filter(b => b.type.toLowerCase().includes('layer')).reduce((acc, curr) => acc + (curr.currentCount || 0), 0).toLocaleString()}
            </div>
            <div style={{ fontSize: '0.75rem', color: '#2563eb', fontWeight: 700, marginTop: '4px' }}>Egg laying cycle</div>
          </div>
          <div style={{ width: 48, height: 48, borderRadius: 12, background: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#2563eb', fontSize: '1.3rem' }}>
            <i className="fas fa-egg"></i>
          </div>
        </div>

        <div style={{
          background: '#ffffff',
          borderRadius: '16px',
          padding: '20px 22px',
          border: '1px solid #e2e8f0',
          boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div>
            <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Crop Plots</div>
            <div style={{ fontSize: '1.9rem', fontWeight: 900, color: '#0f172a', marginTop: '6px' }}>
              {crops.length}
            </div>
            <div style={{ fontSize: '0.75rem', color: '#d97706', fontWeight: 700, marginTop: '4px' }}>
              {crops.filter(c => c.status === 'Ready for Harvest').length} ready for harvest
            </div>
          </div>
          <div style={{ width: 48, height: 48, borderRadius: 12, background: '#fef3c7', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#d97706', fontSize: '1.3rem' }}>
            <i className="fas fa-seedling"></i>
          </div>
        </div>

        <div style={{
          background: '#ffffff',
          borderRadius: '16px',
          padding: '20px 22px',
          border: '1px solid #e2e8f0',
          boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div>
            <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Avg Mortality</div>
            <div style={{ fontSize: '1.9rem', fontWeight: 900, color: '#0f172a', marginTop: '6px' }}>
              {livestock.length > 0 ? (livestock.reduce((acc, curr) => acc + (curr.mortalityRate || 0), 0) / livestock.length).toFixed(1) : '0.0'}%
            </div>
            <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 700, marginTop: '4px' }}>Health index</div>
          </div>
          <div style={{ width: 48, height: 48, borderRadius: 12, background: '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b', fontSize: '1.3rem' }}>
            <i className="fas fa-heartbeat"></i>
          </div>
        </div>
      </div>

      {/* Tabs and Shared Search Toolbar */}
      <div style={{
        background: '#ffffff',
        borderRadius: '16px',
        padding: '16px 20px',
        border: '1px solid #e2e8f0',
        marginBottom: '24px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '16px'
      }}>
        {/* Navigation Tabs */}
        <div style={{ display: 'flex', gap: '8px', background: '#f1f5f9', padding: '4px', borderRadius: '12px' }}>
          <button
            onClick={() => setActiveTab('livestock')}
            style={{
              padding: '9px 18px',
              borderRadius: '9px',
              border: 'none',
              fontWeight: 800,
              fontSize: '0.88rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              background: activeTab === 'livestock' ? '#ffffff' : 'transparent',
              color: activeTab === 'livestock' ? '#064e3b' : '#64748b',
              boxShadow: activeTab === 'livestock' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
              transition: 'all 0.15s ease'
            }}
          >
            <i className="fas fa-drumstick-bite"></i> Livestock
          </button>
          <button
            onClick={() => setActiveTab('crops')}
            style={{
              padding: '9px 18px',
              borderRadius: '9px',
              border: 'none',
              fontWeight: 800,
              fontSize: '0.88rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              background: activeTab === 'crops' ? '#ffffff' : 'transparent',
              color: activeTab === 'crops' ? '#064e3b' : '#64748b',
              boxShadow: activeTab === 'crops' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
              transition: 'all 0.15s ease'
            }}
          >
            <i className="fas fa-seedling"></i> Crops & Plots
          </button>
          <button
            onClick={() => setActiveTab('inventory')}
            style={{
              padding: '9px 18px',
              borderRadius: '9px',
              border: 'none',
              fontWeight: 800,
              fontSize: '0.88rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              background: activeTab === 'inventory' ? '#ffffff' : 'transparent',
              color: activeTab === 'inventory' ? '#064e3b' : '#64748b',
              boxShadow: activeTab === 'inventory' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
              transition: 'all 0.15s ease'
            }}
          >
            <i className="fas fa-boxes"></i> Equipment & Feeds
          </button>
        </div>

        {/* Live Search-As-You-Type */}
        <div style={{ minWidth: '320px', flex: '1', maxWidth: '450px' }}>
          <SearchInput
            placeholder={`Search ${activeTab}...`}
            value={searchQuery}
            onChange={setSearchQuery}
          />
        </div>
      </div>

      {/* Main Content Area */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '80px 0', background: '#ffffff', borderRadius: '16px', border: '1px solid #e2e8f0' }}>
          <i className="fas fa-spinner fa-spin fa-2x" style={{ color: '#059669' }}></i>
          <p style={{ marginTop: '16px', color: '#64748b', fontWeight: 600 }}>Loading farm records...</p>
        </div>
      ) : (
        <>
          {/* LIVESTOCK TAB */}
          {activeTab === 'livestock' && (
            <div style={{ background: '#ffffff', borderRadius: '16px', border: '1px solid #e2e8f0', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
              <div style={{ padding: '20px 24px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, color: '#0f172a' }}>Active Livestock Batches</h3>
                  <p style={{ margin: '4px 0 0', color: '#64748b', fontSize: '0.85rem' }}>
                    Tracking flock population, mortality metrics, and production readiness
                  </p>
                </div>
                <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#64748b' }}>
                  {filteredLivestock.length} {filteredLivestock.length === 1 ? 'batch' : 'batches'}
                </span>
              </div>

              <div className="table-responsive">
                <table className="management-table" style={{ width: '100%' }}>
                  <thead>
                    <tr>
                      <th style={{ padding: '14px 24px' }}>Batch Name / Type</th>
                      <th>Placed Date</th>
                      <th>Headcount (Current / Initial)</th>
                      <th>Mortality Rate</th>
                      <th style={{ textAlign: 'center', padding: '14px 24px' }}>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredLivestock.length === 0 ? (
                      <tr>
                        <td colSpan={5} style={{ textAlign: 'center', padding: '48px 24px', color: '#64748b' }}>
                          <i className="fas fa-feather" style={{ fontSize: '2rem', color: '#cbd5e1', marginBottom: 10, display: 'block' }}></i>
                          No livestock batches found matching your filter.
                        </td>
                      </tr>
                    ) : (
                      filteredLivestock.map(batch => (
                        <tr key={batch.id} style={{ borderBottom: '1px solid #f8fafc' }}>
                          <td style={{ padding: '16px 24px' }}>
                            <div style={{ fontWeight: 800, color: '#0f172a', fontSize: '0.95rem' }}>{batch.batchName}</div>
                            <span style={{
                              display: 'inline-block',
                              marginTop: 4,
                              background: '#f1f5f9',
                              color: '#475569',
                              padding: '2px 8px',
                              borderRadius: 6,
                              fontSize: '0.75rem',
                              fontWeight: 700
                            }}>
                              {batch.type}
                            </span>
                          </td>
                          <td style={{ fontWeight: 600, color: '#475569', fontSize: '0.9rem' }}>
                            {batch.datePlaced ? new Date(batch.datePlaced).toLocaleDateString() : '—'}
                          </td>
                          <td>
                            <span style={{ fontWeight: 900, color: '#059669', fontSize: '1.05rem' }}>
                              {(batch.currentCount || 0).toLocaleString()}
                            </span>
                            <span style={{ color: '#94a3b8', fontSize: '0.85rem', marginLeft: '6px' }}>
                              / {(batch.startCount || 0).toLocaleString()}
                            </span>
                          </td>
                          <td>
                            <span style={{
                              fontWeight: 800,
                              color: batch.mortalityRate > 5 ? '#ef4444' : batch.mortalityRate > 2 ? '#f59e0b' : '#10b981',
                              fontSize: '0.95rem'
                            }}>
                              {batch.mortalityRate}%
                            </span>
                          </td>
                          <td style={{ textAlign: 'center', padding: '16px 24px' }}>
                            <span style={{
                              display: 'inline-block',
                              padding: '4px 12px',
                              borderRadius: '20px',
                              fontSize: '0.78rem',
                              fontWeight: 800,
                              background: batch.status === 'Producing' || batch.status === 'Active' ? '#ecfdf5' : '#fef3c7',
                              color: batch.status === 'Producing' || batch.status === 'Active' ? '#059669' : '#d97706'
                            }}>
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
          )}

          {/* CROPS TAB */}
          {activeTab === 'crops' && (
            <div style={{ background: '#ffffff', borderRadius: '16px', border: '1px solid #e2e8f0', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
              <div style={{ padding: '20px 24px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, color: '#0f172a' }}>Crop Cycle & Field Sectors</h3>
                  <p style={{ margin: '4px 0 0', color: '#64748b', fontSize: '0.85rem' }}>
                    Sowing schedules, sector allotments, and projected harvesting milestones
                  </p>
                </div>
                <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#64748b' }}>
                  {filteredCrops.length} {filteredCrops.length === 1 ? 'cycle' : 'cycles'}
                </span>
              </div>

              <div style={{ padding: '24px', display: 'grid', gap: '16px' }}>
                {filteredCrops.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '48px 24px', color: '#64748b', background: '#f8fafc', borderRadius: '14px', border: '1px dashed #cbd5e1' }}>
                    <i className="fas fa-seedling" style={{ fontSize: '2rem', color: '#cbd5e1', marginBottom: 10, display: 'block' }}></i>
                    No crop cycles planned or matching your search.
                  </div>
                ) : (
                  filteredCrops.map(crop => (
                    <div key={crop.id} style={{
                      padding: '20px 24px',
                      border: '1px solid #e2e8f0',
                      borderRadius: '16px',
                      background: '#ffffff',
                      display: 'flex',
                      gap: '20px',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      flexWrap: 'wrap',
                      boxShadow: '0 1px 2px rgba(0,0,0,0.02)'
                    }}>
                      <div style={{ display: 'flex', gap: '18px', alignItems: 'center' }}>
                        <div style={{
                          width: '54px',
                          height: '54px',
                          borderRadius: '14px',
                          background: crop.status === 'Ready for Harvest' ? '#ecfdf5' : '#f0fdf4',
                          color: crop.status === 'Ready for Harvest' ? '#059669' : '#16a34a',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '1.6rem'
                        }}>
                          <i className={crop.type.toLowerCase().includes('maize') ? 'fas fa-leaf' : 'fas fa-carrot'}></i>
                        </div>
                        <div>
                          <h4 style={{ margin: '0 0 4px 0', fontSize: '1.1rem', fontWeight: 800, color: '#0f172a' }}>{crop.name}</h4>
                          <p style={{ fontSize: '0.85rem', color: '#64748b', margin: 0, fontWeight: 600 }}>
                            Type: <strong style={{ color: '#334155' }}>{crop.type}</strong> | Sector: <strong style={{ color: '#334155' }}>{crop.sector}</strong>
                          </p>
                          <div style={{ fontSize: '0.8rem', color: '#94a3b8', marginTop: 4 }}>
                            Planted: {crop.datePlanted ? new Date(crop.datePlanted).toLocaleDateString() : '—'} &bull; Expected Harvest: {crop.expectedHarvest ? new Date(crop.expectedHarvest).toLocaleDateString() : '—'}
                          </div>
                        </div>
                      </div>

                      <div style={{ textAlign: 'right' }}>
                        <span style={{
                          display: 'inline-block',
                          padding: '6px 14px',
                          borderRadius: '20px',
                          fontSize: '0.8rem',
                          fontWeight: 800,
                          background: crop.status === 'Ready for Harvest' ? '#ecfdf5' : '#eff6ff',
                          color: crop.status === 'Ready for Harvest' ? '#059669' : '#2563eb'
                        }}>
                          {crop.status}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* INVENTORY TAB */}
          {activeTab === 'inventory' && (
            <div style={{ background: '#ffffff', borderRadius: '16px', border: '1px solid #e2e8f0', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
              <div style={{ padding: '20px 24px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, color: '#0f172a' }}>Farm Inventory & Equipment</h3>
                  <p style={{ margin: '4px 0 0', color: '#64748b', fontSize: '0.85rem' }}>
                    Agri-chemicals, animal feed reserves, tools, and farming implements
                  </p>
                </div>
                <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#64748b' }}>
                  {filteredInventory.length} {filteredInventory.length === 1 ? 'item' : 'items'}
                </span>
              </div>

              <div className="table-responsive">
                <table className="management-table" style={{ width: '100%' }}>
                  <thead>
                    <tr>
                      <th style={{ padding: '14px 24px' }}>Item Name</th>
                      <th>Category</th>
                      <th>Quantity / Balance</th>
                      <th style={{ textAlign: 'right', padding: '14px 24px' }}>Condition / Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredInventory.length === 0 ? (
                      <tr>
                        <td colSpan={4} style={{ textAlign: 'center', padding: '48px 24px', color: '#64748b' }}>
                          <i className="fas fa-boxes" style={{ fontSize: '2rem', color: '#cbd5e1', marginBottom: 10, display: 'block' }}></i>
                          No inventory items recorded or matching your search.
                        </td>
                      </tr>
                    ) : (
                      filteredInventory.map(item => (
                        <tr key={item.id} style={{ borderBottom: '1px solid #f8fafc' }}>
                          <td style={{ padding: '16px 24px', fontWeight: 800, color: '#0f172a' }}>{item.name}</td>
                          <td>
                            <span style={{
                              background: '#f1f5f9',
                              color: '#475569',
                              padding: '3px 9px',
                              borderRadius: 6,
                              fontSize: '0.75rem',
                              fontWeight: 700
                            }}>
                              {item.category}
                            </span>
                          </td>
                          <td style={{ fontWeight: 800, color: '#0f172a', fontSize: '0.95rem' }}>{item.quantity}</td>
                          <td style={{ textAlign: 'right', padding: '16px 24px' }}>
                            <span style={{
                              display: 'inline-block',
                              padding: '4px 12px',
                              borderRadius: '20px',
                              fontSize: '0.78rem',
                              fontWeight: 800,
                              background: 
                                item.condition === 'Adequate' || item.condition === 'Good Condition' ? '#ecfdf5' :
                                item.condition === 'Low Stock' ? '#fef2f2' : '#f8fafc',
                              color: 
                                item.condition === 'Adequate' || item.condition === 'Good Condition' ? '#059669' :
                                item.condition === 'Low Stock' ? '#ef4444' : '#475569'
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
          )}
        </>
      )}

      {/* MODALS */}

      {/* Add Batch Modal */}
      {showBatchModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.65)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 20 }}>
          <div style={{ width: '100%', maxWidth: '520px', padding: '30px', borderRadius: '20px', background: 'white', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 900, color: '#0f172a' }}>Record Livestock Batch</h3>
              <button onClick={() => setShowBatchModal(false)} style={{ background: 'none', border: 'none', fontSize: '1.4rem', color: '#64748b', cursor: 'pointer' }}>&times;</button>
            </div>
            <form onSubmit={handleAddBatch}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '20px' }}>
                <div style={{ gridColumn: 'span 2' }}>
                  <label style={{ display: 'block', fontWeight: 700, fontSize: '0.8rem', color: '#334155', marginBottom: '6px' }}>Batch Name / Identifier *</label>
                  <input 
                    type="text" className="portal-input" style={{ width: '100%' }} required
                    value={batchForm.batchName} onChange={e => setBatchForm({ ...batchForm, batchName: e.target.value })}
                    placeholder="e.g. Broiler Batch 2026-A"
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontWeight: 700, fontSize: '0.8rem', color: '#334155', marginBottom: '6px' }}>Livestock Type</label>
                  <select 
                    className="portal-select" style={{ width: '100%' }}
                    value={batchForm.type} onChange={e => setBatchForm({ ...batchForm, type: e.target.value })}
                  >
                    <option>Broilers</option>
                    <option>Layers</option>
                    <option>Turkeys</option>
                    <option>Cattle</option>
                    <option>Pigs</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontWeight: 700, fontSize: '0.8rem', color: '#334155', marginBottom: '6px' }}>Placement Date *</label>
                  <input 
                    type="date" className="portal-input" style={{ width: '100%' }} required
                    value={batchForm.datePlaced} onChange={e => setBatchForm({ ...batchForm, datePlaced: e.target.value })}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontWeight: 700, fontSize: '0.8rem', color: '#334155', marginBottom: '6px' }}>Initial Headcount *</label>
                  <input 
                    type="number" className="portal-input" style={{ width: '100%' }} required min="1"
                    value={batchForm.startCount} onChange={e => setBatchForm({ ...batchForm, startCount: e.target.value, currentCount: e.target.value })}
                    placeholder="e.g. 500"
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontWeight: 700, fontSize: '0.8rem', color: '#334155', marginBottom: '6px' }}>Current Headcount</label>
                  <input 
                    type="number" className="portal-input" style={{ width: '100%' }} min="0"
                    value={batchForm.currentCount} onChange={e => setBatchForm({ ...batchForm, currentCount: e.target.value })}
                    placeholder="e.g. 490"
                  />
                </div>
              </div>
              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', paddingTop: '10px', borderTop: '1px solid #f1f5f9' }}>
                <button type="button" className="portal-btn-ghost" onClick={() => setShowBatchModal(false)}>Cancel</button>
                <button type="submit" style={{ background: '#059669', color: '#ffffff', border: 'none', borderRadius: '10px', padding: '10px 24px', fontWeight: 800, fontSize: '0.88rem', cursor: 'pointer' }}>
                  Save Batch
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Crop Modal */}
      {showCropModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.65)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 20 }}>
          <div style={{ width: '100%', maxWidth: '520px', padding: '30px', borderRadius: '20px', background: 'white', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 900, color: '#0f172a' }}>Schedule Crop Cycle</h3>
              <button onClick={() => setShowCropModal(false)} style={{ background: 'none', border: 'none', fontSize: '1.4rem', color: '#64748b', cursor: 'pointer' }}>&times;</button>
            </div>
            <form onSubmit={handleAddCrop}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '20px' }}>
                <div style={{ gridColumn: 'span 2' }}>
                  <label style={{ display: 'block', fontWeight: 700, fontSize: '0.8rem', color: '#334155', marginBottom: '6px' }}>Crop Identifier *</label>
                  <input 
                    type="text" className="portal-input" style={{ width: '100%' }} required
                    value={cropForm.name} onChange={e => setCropForm({ ...cropForm, name: e.target.value })}
                    placeholder="e.g. Cabbage Patch East"
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontWeight: 700, fontSize: '0.8rem', color: '#334155', marginBottom: '6px' }}>Crop Type *</label>
                  <input 
                    type="text" className="portal-input" style={{ width: '100%' }} required
                    value={cropForm.type} onChange={e => setCropForm({ ...cropForm, type: e.target.value })}
                    placeholder="e.g. Sugar Beans, Maize"
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontWeight: 700, fontSize: '0.8rem', color: '#334155', marginBottom: '6px' }}>Field Sector / Plot *</label>
                  <input 
                    type="text" className="portal-input" style={{ width: '100%' }} required
                    value={cropForm.sector} onChange={e => setCropForm({ ...cropForm, sector: e.target.value })}
                    placeholder="e.g. Sector 2A"
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontWeight: 700, fontSize: '0.8rem', color: '#334155', marginBottom: '6px' }}>Date Planted *</label>
                  <input 
                    type="date" className="portal-input" style={{ width: '100%' }} required
                    value={cropForm.datePlanted} onChange={e => setCropForm({ ...cropForm, datePlanted: e.target.value })}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontWeight: 700, fontSize: '0.8rem', color: '#334155', marginBottom: '6px' }}>Expected Harvest *</label>
                  <input 
                    type="date" className="portal-input" style={{ width: '100%' }} required
                    value={cropForm.expectedHarvest} onChange={e => setCropForm({ ...cropForm, expectedHarvest: e.target.value })}
                  />
                </div>
              </div>
              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', paddingTop: '10px', borderTop: '1px solid #f1f5f9' }}>
                <button type="button" className="portal-btn-ghost" onClick={() => setShowCropModal(false)}>Cancel</button>
                <button type="submit" style={{ background: '#059669', color: '#ffffff', border: 'none', borderRadius: '10px', padding: '10px 24px', fontWeight: 800, fontSize: '0.88rem', cursor: 'pointer' }}>
                  Schedule Crop
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Inventory Modal */}
      {showInventoryModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.65)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 20 }}>
          <div style={{ width: '100%', maxWidth: '520px', padding: '30px', borderRadius: '20px', background: 'white', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 900, color: '#0f172a' }}>Record Supply or Equipment</h3>
              <button onClick={() => setShowInventoryModal(false)} style={{ background: 'none', border: 'none', fontSize: '1.4rem', color: '#64748b', cursor: 'pointer' }}>&times;</button>
            </div>
            <form onSubmit={handleAddInventory}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '20px' }}>
                <div style={{ gridColumn: 'span 2' }}>
                  <label style={{ display: 'block', fontWeight: 700, fontSize: '0.8rem', color: '#334155', marginBottom: '6px' }}>Item Name *</label>
                  <input 
                    type="text" className="portal-input" style={{ width: '100%' }} required
                    value={inventoryForm.name} onChange={e => setInventoryForm({ ...inventoryForm, name: e.target.value })}
                    placeholder="e.g. Starter Feed Bags (50kg)"
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontWeight: 700, fontSize: '0.8rem', color: '#334155', marginBottom: '6px' }}>Category</label>
                  <select 
                    className="portal-select" style={{ width: '100%' }}
                    value={inventoryForm.category} onChange={e => setInventoryForm({ ...inventoryForm, category: e.target.value })}
                  >
                    <option>Consumables (Feed)</option>
                    <option>Consumables (Fertilizer)</option>
                    <option>Consumables (Seeds)</option>
                    <option>Equipment</option>
                    <option>Tools</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontWeight: 700, fontSize: '0.8rem', color: '#334155', marginBottom: '6px' }}>Quantity / Units *</label>
                  <input 
                    type="text" className="portal-input" style={{ width: '100%' }} required
                    value={inventoryForm.quantity} onChange={e => setInventoryForm({ ...inventoryForm, quantity: e.target.value })}
                    placeholder="e.g. 25 Bags, 8 Units"
                  />
                </div>
                <div style={{ gridColumn: 'span 2' }}>
                  <label style={{ display: 'block', fontWeight: 700, fontSize: '0.8rem', color: '#334155', marginBottom: '6px' }}>Condition / Stock Status</label>
                  <select 
                    className="portal-select" style={{ width: '100%' }}
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
              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', paddingTop: '10px', borderTop: '1px solid #f1f5f9' }}>
                <button type="button" className="portal-btn-ghost" onClick={() => setShowInventoryModal(false)}>Cancel</button>
                <button type="submit" style={{ background: '#059669', color: '#ffffff', border: 'none', borderRadius: '10px', padding: '10px 24px', fontWeight: 800, fontSize: '0.88rem', cursor: 'pointer' }}>
                  Add to Inventory
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
