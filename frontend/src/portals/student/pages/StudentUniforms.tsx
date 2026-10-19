import React, { useState, useEffect } from 'react';
import api from '../../../lib/api';
import { useAuth } from '../../../contexts/AuthContext';
import { useToast } from '../../../context/ToastContext';
import { formatCurrency, getAvatarUrl } from '../../../utils/formatters';
import { SkeletonLoader } from '../../../components/shared';

interface UniformItem {
  id: string;
  name: string;
  category?: string;
  sellingPrice: number;
  stockLevel: number;
  description?: string;
  imageUrl?: string;
  sizes?: string[];
}

export default function StudentUniforms() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [items, setItems] = useState<UniformItem[]>([]);
  const [myIssuances, setMyIssuances] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'catalog' | 'sizes' | 'history'>('catalog');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');

  // Request uniform modal state
  const [requestModalOpen, setRequestModalOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<UniformItem | null>(null);
  const [requestSize, setRequestSize] = useState('M');
  const [requestQty, setRequestQty] = useState(1);
  const [requestNotes, setRequestNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchUniformData();
  }, []);

  const fetchUniformData = async () => {
    try {
      setLoading(true);
      const [itemsRes, salesRes] = await Promise.allSettled([
        api.get('/api/uniforms/items'),
        api.get('/api/uniforms/sales')
      ]);

      if (itemsRes.status === 'fulfilled') {
        const raw = Array.isArray(itemsRes.value.data) ? itemsRes.value.data : [];
        setItems(raw);
      }

      if (salesRes.status === 'fulfilled') {
        const rawSales = Array.isArray(salesRes.value.data) ? salesRes.value.data : [];
        // Filter student's own sales/issuances
        const mine = rawSales.filter((s: any) => s.studentId === user?.id || s.student?.userId === user?.id);
        setMyIssuances(mine);
      }
    } catch (err) {
      console.error('Failed to load uniforms:', err);
      showToast('Failed to load uniform catalog', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleRequestSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedItem) return;

    setSubmitting(true);
    try {
      // Create requisition / store pickup request
      await api.post('/api/requisitions', {
        title: `Uniform Request: ${selectedItem.name} (${requestSize})`,
        category: 'UNIFORM',
        priority: 'MEDIUM',
        items: [{
          name: `${selectedItem.name} [Size: ${requestSize}]`,
          quantity: requestQty,
          unitCost: selectedItem.sellingPrice,
          estimatedTotal: selectedItem.sellingPrice * requestQty
        }],
        description: requestNotes || `Requested from student portal for ${user?.name}`
      });

      showToast('Uniform requisition submitted! Check with the stores clerk for collection.', 'success');
      setRequestModalOpen(false);
      setSelectedItem(null);
      setRequestNotes('');
    } catch (err: any) {
      showToast(err.response?.data?.error || 'Failed to submit uniform request', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const categories = ['ALL', 'FORMAL', 'SPORTS', 'ACCESSORIES', 'HOUSE'];

  const filteredItems = items.filter(it => {
    if (selectedCategory === 'ALL') return true;
    const cat = (it.category || '').toUpperCase();
    if (selectedCategory === 'FORMAL') return cat.includes('FORMAL') || cat.includes('BLAZER') || cat.includes('SHIRT') || cat.includes('SKIRT');
    if (selectedCategory === 'SPORTS') return cat.includes('SPORT') || cat.includes('TRACK') || cat.includes('P.E');
    if (selectedCategory === 'ACCESSORIES') return cat.includes('TIE') || cat.includes('SOCK') || cat.includes('BELT') || cat.includes('BADGE');
    if (selectedCategory === 'HOUSE') return cat.includes('HOUSE');
    return true;
  });

  return (
    <div className="portal-container" style={{ maxWidth: 1300, margin: '0 auto', paddingBottom: 40 }}>
      {/* Header */}
      <div className="portal-page-header" style={{ marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: '1.6rem', fontWeight: 800, margin: '0 0 6px', color: '#0f172a' }}>
            <i className="fas fa-tshirt mr-2" style={{ color: '#8b5cf6' }}></i>Official School Uniforms & Attire
          </h1>
          <p style={{ margin: 0, color: '#64748b', fontSize: '0.92rem' }}>
            Browse authorized academic and sports attire, check sizing guides, and manage garment requests.
          </p>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div style={{
        display: 'flex',
        gap: 8,
        borderBottom: '1px solid #e2e8f0',
        paddingBottom: 10,
        marginBottom: 24
      }}>
        <button
          onClick={() => setActiveTab('catalog')}
          style={{
            padding: '9px 18px',
            borderRadius: 8,
            border: 'none',
            fontSize: '0.85rem',
            fontWeight: activeTab === 'catalog' ? 800 : 600,
            cursor: 'pointer',
            background: activeTab === 'catalog' ? '#8b5cf6' : '#f1f5f9',
            color: activeTab === 'catalog' ? '#ffffff' : '#64748b'
          }}
        >
          <i className="fas fa-store mr-2"></i>Uniform Catalog
        </button>
        <button
          onClick={() => setActiveTab('sizes')}
          style={{
            padding: '9px 18px',
            borderRadius: 8,
            border: 'none',
            fontSize: '0.85rem',
            fontWeight: activeTab === 'sizes' ? 800 : 600,
            cursor: 'pointer',
            background: activeTab === 'sizes' ? '#8b5cf6' : '#f1f5f9',
            color: activeTab === 'sizes' ? '#ffffff' : '#64748b'
          }}
        >
          <i className="fas fa-ruler-combined mr-2"></i>Sizing Chart & Fitting Guide
        </button>
        <button
          onClick={() => setActiveTab('history')}
          style={{
            padding: '9px 18px',
            borderRadius: 8,
            border: 'none',
            fontSize: '0.85rem',
            fontWeight: activeTab === 'history' ? 800 : 600,
            cursor: 'pointer',
            background: activeTab === 'history' ? '#8b5cf6' : '#f1f5f9',
            color: activeTab === 'history' ? '#ffffff' : '#64748b'
          }}
        >
          <i className="fas fa-history mr-2"></i>My Issuances ({myIssuances.length})
        </button>
      </div>

      {/* TAB 1: CATALOG */}
      {activeTab === 'catalog' && (
        <>
          {/* Category Filter Pills */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
            {categories.map(cat => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                style={{
                  padding: '6px 14px',
                  borderRadius: 20,
                  border: selectedCategory === cat ? '1.5px solid #8b5cf6' : '1px solid #cbd5e1',
                  background: selectedCategory === cat ? '#f5f3ff' : '#ffffff',
                  color: selectedCategory === cat ? '#7c3aed' : '#64748b',
                  fontSize: '0.8rem',
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                {cat === 'ALL' ? 'All Attire' : cat}
              </button>
            ))}
          </div>

          {loading ? (
            <div style={{ padding: '20px 0' }}>
              <SkeletonLoader type="card" count={4} />
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="portal-card" style={{ textAlign: 'center', padding: '60px 20px', color: '#64748b' }}>
              <i className="fas fa-tshirt fa-3x" style={{ opacity: 0.2, marginBottom: 16 }}></i>
              <h3 style={{ margin: '0 0 6px', fontSize: '1.1rem', color: '#1e293b' }}>No uniform items found</h3>
              <p style={{ margin: 0, fontSize: '0.85rem' }}>Check back later or visit the tuckshop / stores office directly.</p>
            </div>
          ) : (
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
              gap: 20
            }}>
              {filteredItems.map(item => (
                <div
                  key={item.id}
                  className="portal-card"
                  style={{
                    padding: 18,
                    borderRadius: 14,
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    border: '1px solid #e2e8f0',
                    boxShadow: '0 4px 6px -1px rgba(0,0,0,0.03)'
                  }}
                >
                  <div>
                    {/* Item Image / Graphic Frame */}
                    <div style={{
                      height: 140,
                      borderRadius: 10,
                      background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      marginBottom: 14,
                      border: '1px solid #e2e8f0',
                      position: 'relative'
                    }}>
                      <i className="fas fa-tshirt fa-3x" style={{ color: '#cbd5e1' }}></i>
                      {item.stockLevel > 0 ? (
                        <span style={{
                          position: 'absolute',
                          top: 8,
                          right: 8,
                          background: '#dcfce7',
                          color: '#15803d',
                          fontSize: '0.7rem',
                          fontWeight: 800,
                          padding: '2px 8px',
                          borderRadius: 12
                        }}>
                          In Stock ({item.stockLevel})
                        </span>
                      ) : (
                        <span style={{
                          position: 'absolute',
                          top: 8,
                          right: 8,
                          background: '#fee2e2',
                          color: '#b91c1c',
                          fontSize: '0.7rem',
                          fontWeight: 800,
                          padding: '2px 8px',
                          borderRadius: 12
                        }}>
                          Pre-Order
                        </span>
                      )}
                    </div>

                    <h3 style={{ margin: '0 0 4px', fontSize: '1rem', fontWeight: 800, color: '#0f172a' }}>
                      {item.name}
                    </h3>
                    <p style={{ margin: '0 0 12px', fontSize: '0.8rem', color: '#64748b', lineHeight: 1.4, minHeight: 32 }}>
                      {item.description || 'Standard approved institutional uniform attire.'}
                    </p>
                  </div>

                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                      <span style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0f172a' }}>
                        {formatCurrency(item.sellingPrice)}
                      </span>
                      <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
                        Official Price
                      </span>
                    </div>

                    <button
                      onClick={() => {
                        setSelectedItem(item);
                        setRequestModalOpen(true);
                      }}
                      className="portal-btn-primary"
                      style={{
                        width: '100%',
                        padding: '9px 14px',
                        fontSize: '0.82rem',
                        fontWeight: 800,
                        background: '#7c3aed',
                        borderColor: '#7c3aed',
                        borderRadius: 8
                      }}
                    >
                      <i className="fas fa-shopping-bag mr-2"></i>Request / Reserve
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* TAB 2: SIZING CHART */}
      {activeTab === 'sizes' && (
        <div className="portal-card" style={{ padding: 24 }}>
          <h3 style={{ margin: '0 0 12px', fontSize: '1.15rem', fontWeight: 800, color: '#0f172a' }}>
            Official Uniform Sizing Chart
          </h3>
          <p style={{ margin: '0 0 20px', color: '#64748b', fontSize: '0.88rem' }}>
            Use these body measurements to select the best fit before requesting uniforms from the school store.
          </p>

          <div style={{ overflowX: 'auto' }}>
            <table className="portal-table" style={{ width: '100%' }}>
              <thead>
                <tr>
                  <th>Size</th>
                  <th>Chest (Inches)</th>
                  <th>Waist (Inches)</th>
                  <th>Shoulder Width</th>
                  <th>Recommended Age / Form</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td><strong>Small (S / 28-30)</strong></td>
                  <td>32 – 34"</td>
                  <td>26 – 28"</td>
                  <td>15.5"</td>
                  <td>Form 1 – Form 2</td>
                </tr>
                <tr>
                  <td><strong>Medium (M / 32-34)</strong></td>
                  <td>36 – 38"</td>
                  <td>30 – 32"</td>
                  <td>16.5"</td>
                  <td>Form 3 – Form 4</td>
                </tr>
                <tr>
                  <td><strong>Large (L / 36-38)</strong></td>
                  <td>40 – 42"</td>
                  <td>34 – 36"</td>
                  <td>17.5"</td>
                  <td>Form 5 / Lower 6</td>
                </tr>
                <tr>
                  <td><strong>Extra Large (XL / 40+)</strong></td>
                  <td>44 – 46"</td>
                  <td>38 – 40"</td>
                  <td>18.5"</td>
                  <td>Upper 6 / Senior</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: ISSUANCE HISTORY */}
      {activeTab === 'history' && (
        <div className="portal-card" style={{ padding: 24 }}>
          <h3 style={{ margin: '0 0 16px', fontSize: '1.1rem', fontWeight: 800, color: '#0f172a' }}>
            Your Uniform Collection History
          </h3>

          {myIssuances.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 16px', color: '#64748b' }}>
              <i className="fas fa-box-open fa-2x" style={{ opacity: 0.3, marginBottom: 8 }}></i>
              <p style={{ margin: 0, fontSize: '0.88rem' }}>No past uniform sales or issuances recorded for your student account.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {myIssuances.map((iss, idx) => (
                <div key={idx} style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '12px 16px',
                  background: '#f8fafc',
                  borderRadius: 10,
                  border: '1px solid #e2e8f0'
                }}>
                  <div>
                    <div style={{ fontWeight: 800, fontSize: '0.92rem', color: '#1e293b' }}>
                      {iss.item?.name || 'Uniform Item'}
                    </div>
                    <div style={{ fontSize: '0.78rem', color: '#64748b' }}>
                      Issued on {new Date(iss.createdAt || Date.now()).toLocaleDateString()} · Quantity: {iss.quantity || 1}
                    </div>
                  </div>
                  <span style={{
                    fontSize: '0.78rem',
                    fontWeight: 800,
                    padding: '3px 8px',
                    borderRadius: 6,
                    background: '#dcfce7',
                    color: '#15803d'
                  }}>
                    Dispatched / Received
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* REQUEST MODAL */}
      {requestModalOpen && selectedItem && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(15, 23, 42, 0.6)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 99999,
          padding: 20
        }}>
          <div style={{
            background: '#ffffff',
            borderRadius: 14,
            maxWidth: 480,
            width: '100%',
            padding: 24,
            boxShadow: '0 20px 25px -5px rgba(0,0,0,0.2)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800, color: '#0f172a' }}>
                Reserve Uniform Item
              </h3>
              <button
                onClick={() => setRequestModalOpen(false)}
                style={{ background: 'none', border: 'none', fontSize: '1.4rem', color: '#94a3b8', cursor: 'pointer' }}
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleRequestSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: 700, color: '#64748b' }}>Item</label>
                <div style={{ fontWeight: 800, fontSize: '1rem', color: '#0f172a', marginTop: 2 }}>
                  {selectedItem.name} — {formatCurrency(selectedItem.sellingPrice)}
                </div>
              </div>

              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: 700, color: '#334155', display: 'block', marginBottom: 4 }}>
                  Select Size
                </label>
                <select
                  value={requestSize}
                  onChange={e => setRequestSize(e.target.value)}
                  style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #cbd5e1', outline: 'none' }}
                >
                  <option value="S">Small (S / 28-30)</option>
                  <option value="M">Medium (M / 32-34)</option>
                  <option value="L">Large (L / 36-38)</option>
                  <option value="XL">Extra Large (XL / 40+)</option>
                </select>
              </div>

              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: 700, color: '#334155', display: 'block', marginBottom: 4 }}>
                  Quantity
                </label>
                <input
                  type="number"
                  min="1"
                  max="10"
                  value={requestQty}
                  onChange={e => setRequestQty(parseInt(e.target.value) || 1)}
                  style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #cbd5e1', outline: 'none' }}
                />
              </div>

              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: 700, color: '#334155', display: 'block', marginBottom: 4 }}>
                  Notes / Fitting Preference
                </label>
                <textarea
                  rows={2}
                  value={requestNotes}
                  onChange={e => setRequestNotes(e.target.value)}
                  placeholder="e.g. Please hold for collection by Friday"
                  style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #cbd5e1', outline: 'none', resize: 'none' }}
                />
              </div>

              <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
                <button
                  type="button"
                  onClick={() => setRequestModalOpen(false)}
                  className="portal-btn-secondary"
                  style={{ flex: 1, padding: 10 }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="portal-btn-primary"
                  style={{ flex: 1, padding: 10, background: '#7c3aed', borderColor: '#7c3aed', fontWeight: 800 }}
                >
                  {submitting ? 'Submitting...' : 'Confirm Request'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
