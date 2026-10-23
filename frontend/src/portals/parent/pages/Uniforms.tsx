import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../../../contexts/AuthContext';
import { useToast } from '../../../context/ToastContext';
import api from '../../../lib/api';
import { SkeletonLoader, Pagination } from '../../../components/shared';

interface RequirementItem {
  id: string;
  name: string;
  category: string;
  requiredQty: number;
  ownedQty: number;
  isSeasonal: boolean;
  seasonNotes?: string;
  status: 'FULFILLED' | 'MISSING';
}

interface ShopItem {
  id: string;
  name: string;
  price: number;
  costPrice?: number;
  stockLevel: number;
  category?: string;
  isMissingForChild?: boolean;
}

interface CartItem extends ShopItem {
  quantity: number;
  selectedSize?: string;
}

interface OrderHistoryItem {
  id: string;
  orderNumber: string;
  date: string;
  itemsCount: number;
  itemsSummary: string;
  totalAmount: number;
  paymentMode: string;
  status: string;
}

interface UniformsSummary {
  student: {
    id: string;
    name: string;
    studentId: string;
    gradeLevel: string;
    schoolName: string;
  };
  requirements: RequirementItem[];
  shopItems: ShopItem[];
  orderHistory: OrderHistoryItem[];
}

export default function ParentUniforms() {
  const { user, activeEntity } = useAuth();
  const currentChild = activeEntity || user?.linkedEntities?.[0];
  const { showToast } = useToast();

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<UniformsSummary | null>(null);
  const [activeTab, setActiveTab] = useState<'requirements' | 'store' | 'orders'>('requirements');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedSizes, setSelectedSizes] = useState<Record<string, string>>({});
  const [storeFilter, setStoreFilter] = useState<'ALL' | 'UNIFORM' | 'SPORTS' | 'ACCESSORIES' | 'MISSING'>('ALL');
  const [storeSearch, setStoreSearch] = useState('');

  // Orders Pagination
  const [ordersPage, setOrdersPage] = useState(1);
  const [ordersPerPage, setOrdersPerPage] = useState(8);

  // Checkout Modal State
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'paynow' | 'innbucks' | 'zig' | 'cash'>('paynow');
  const [isSubmittingOrder, setIsSubmittingOrder] = useState(false);
  const [selectedOrderForVoucher, setSelectedOrderForVoucher] = useState<OrderHistoryItem | null>(null);

  useEffect(() => {
    fetchUniforms();
  }, [currentChild?.id]);

  const fetchUniforms = async () => {
    setLoading(true);
    try {
      const studentId = currentChild?.id;
      const url = studentId ? `/api/uniforms/parent-summary?studentId=${studentId}` : '/api/uniforms/parent-summary';
      const res = await api.get(url);
      if (res.data) {
        setData(res.data);
      } else {
        setData({
          student: {
            id: currentChild?.id || '',
            name: currentChild?.name || 'Student',
            studentId: (currentChild as any)?.studentId || currentChild?.code || '',
            gradeLevel: (currentChild as any)?.className || 'Current Class',
            schoolName: currentChild?.schoolName || 'School'
          },
          requirements: [],
          shopItems: [],
          orderHistory: []
        });
      }
    } catch (err: any) {
      console.error('Failed to fetch uniforms data from database:', err);
      showToast('Could not load uniform catalog from server.', 'error');
      setData({
        student: {
          id: currentChild?.id || '',
          name: currentChild?.name || 'Student',
          studentId: (currentChild as any)?.studentId || currentChild?.code || '',
          gradeLevel: (currentChild as any)?.className || 'Current Class',
          schoolName: currentChild?.schoolName || 'School'
        },
        requirements: [],
        shopItems: [],
        orderHistory: []
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAddToCart = (item: ShopItem, defaultSize?: string) => {
    const size = defaultSize || selectedSizes[item.id] || 'Medium';
    setCart(prev => {
      const existing = prev.find(i => i.id === item.id && i.selectedSize === size);
      if (existing) {
        return prev.map(i => i.id === item.id && i.selectedSize === size ? { ...i, quantity: i.quantity + 1 } : i);
      }
      return [...prev, { ...item, quantity: 1, selectedSize: size }];
    });
    showToast(`Added ${item.name} (${size}) to order cart.`, 'success');
  };

  const handleUpdateQuantity = (id: string, size: string | undefined, delta: number) => {
    setCart(prev =>
      prev
        .map(i => {
          if (i.id === id && i.selectedSize === size) {
            const newQty = i.quantity + delta;
            return newQty > 0 ? { ...i, quantity: newQty } : null;
          }
          return i;
        })
        .filter(Boolean) as CartItem[]
    );
  };

  const handleRemoveFromCart = (id: string, size?: string) => {
    setCart(prev => prev.filter(i => !(i.id === id && i.selectedSize === size)));
  };

  const cartTotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);

  const handleCompleteOrder = async () => {
    if (cart.length === 0) return;
    setIsSubmittingOrder(true);
    try {
      const studentId = currentChild?.id || data?.student.id;
      const res = await api.post('/api/uniforms/parent-order', {
        studentId,
        items: cart,
        paymentMode: paymentMethod.toUpperCase()
      });
      showToast(`Order confirmed! Voucher #${res.data?.orderNumber || 'ORD'} generated.`, 'success');
      setCart([]);
      setIsCheckoutOpen(false);
      // Immediately refresh live database summary
      fetchUniforms();
      setActiveTab('orders');
    } catch (err: any) {
      console.error('Order submission failed:', err);
      showToast(err.response?.data?.error || 'Order could not be processed. Please try again.', 'error');
    } finally {
      setIsSubmittingOrder(false);
    }
  };

  const student = data?.student;
  const requirements = data?.requirements || [];
  const shopItems = data?.shopItems || [];
  const orderHistory = data?.orderHistory || [];

  const fulfilledCount = requirements.filter(r => r.status === 'FULFILLED').length;
  const missingCount = requirements.filter(r => r.status === 'MISSING').length;
  const fulfillmentPercent = requirements.length > 0 ? Math.round((fulfilledCount / requirements.length) * 100) : 100;

  // Filtered Shop Catalog
  const filteredShopItems = useMemo(() => {
    return shopItems.filter(item => {
      if (storeFilter === 'MISSING' && !item.isMissingForChild) return false;
      if (storeFilter === 'UNIFORM') {
        const n = item.name.toLowerCase();
        if (n.includes('sport') || n.includes('tracksuit') || n.includes('tie') || n.includes('sock')) return false;
      }
      if (storeFilter === 'SPORTS') {
        const n = item.name.toLowerCase();
        if (!n.includes('sport') && !n.includes('tracksuit') && !n.includes('kit')) return false;
      }
      if (storeFilter === 'ACCESSORIES') {
        const n = item.name.toLowerCase();
        if (!n.includes('tie') && !n.includes('sock') && !n.includes('cap') && !n.includes('belt')) return false;
      }

      if (storeSearch.trim()) {
        const q = storeSearch.toLowerCase();
        return item.name.toLowerCase().includes(q);
      }
      return true;
    });
  }, [shopItems, storeFilter, storeSearch]);

  // Paginated Orders
  const paginatedOrders = useMemo(() => {
    const start = (ordersPage - 1) * ordersPerPage;
    return orderHistory.slice(start, start + ordersPerPage);
  }, [orderHistory, ordersPage, ordersPerPage]);

  if (loading && !data) {
    return (
      <div style={{ padding: '24px 0' }}>
        <SkeletonLoader type="card" count={6} />
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24, maxWidth: 1200, margin: '0 auto' }}>
      {/* Page Header */}
      <div className="portal-page-header" style={{ marginBottom: 0 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16 }}>
          <div>
            <h1 style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '0 0 6px 0', fontSize: '1.6rem', fontWeight: 800 }}>
              <i className="fas fa-tshirt" style={{ color: '#2563eb' }}></i>
              Uniforms & School Supplies
            </h1>
            <p style={{ margin: 0, color: '#64748b', fontSize: '0.9rem' }}>
              Official curriculum dress code, dispensary catalog, and order fulfillment for{' '}
              <strong style={{ color: '#0f172a' }}>{student?.name || currentChild?.name}</strong>{' '}
              {student?.gradeLevel ? `(${student.gradeLevel})` : ''} at {student?.schoolName || 'our school'}.
            </p>
          </div>

          {cart.length > 0 && (
            <button
              onClick={() => setIsCheckoutOpen(true)}
              className="portal-btn-primary"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                padding: '10px 20px',
                fontWeight: 800,
                borderRadius: 12,
                boxShadow: '0 4px 12px rgba(37, 99, 235, 0.25)'
              }}
            >
              <i className="fas fa-shopping-cart"></i>
              View Cart ({cart.reduce((s, i) => s + i.quantity, 0)}) • ${cartTotal.toFixed(2)}
            </button>
          )}
        </div>
      </div>

      {/* KPI Stat Cards */}
      <div className="portal-stats-grid">
        <div className="portal-stat-card" style={{ borderLeft: '4px solid #10b981' }}>
          <div className="portal-stat-icon green">
            <i className="fas fa-check-circle"></i>
          </div>
          <div className="portal-stat-info">
            <h3 style={{ fontSize: '1.8rem', fontWeight: 900 }}>
              {fulfilledCount} / {requirements.length}
            </h3>
            <p>Requirements Fulfilled</p>
          </div>
        </div>

        <div className="portal-stat-card" style={{ borderLeft: missingCount > 0 ? '4px solid #ef4444' : '4px solid #10b981' }}>
          <div className="portal-stat-icon orange">
            <i className="fas fa-tshirt"></i>
          </div>
          <div className="portal-stat-info">
            <h3 style={{ fontSize: '1.8rem', fontWeight: 900, color: missingCount > 0 ? '#dc2626' : '#16a34a' }}>
              {missingCount}
            </h3>
            <p>Missing Items Needed</p>
          </div>
        </div>

        <div className="portal-stat-card" style={{ borderLeft: '4px solid #3b82f6' }}>
          <div className="portal-stat-icon blue">
            <i className="fas fa-store"></i>
          </div>
          <div className="portal-stat-info">
            <h3 style={{ fontSize: '1.8rem', fontWeight: 900 }}>{shopItems.length}</h3>
            <p>Items in School Store</p>
          </div>
        </div>

        <div className="portal-stat-card" style={{ borderLeft: '4px solid #8b5cf6' }}>
          <div className="portal-stat-icon purple">
            <i className="fas fa-receipt"></i>
          </div>
          <div className="portal-stat-info">
            <h3 style={{ fontSize: '1.8rem', fontWeight: 900 }}>{orderHistory.length}</h3>
            <p>Orders & Receipts</p>
          </div>
        </div>
      </div>

      {/* Dress Code Progress Banner */}
      {requirements.length > 0 && (
        <div
          style={{
            background: '#ffffff',
            borderRadius: 14,
            padding: '16px 20px',
            border: '1px solid #e2e8f0',
            boxShadow: '0 1px 3px rgba(0,0,0,0.04)'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <span style={{ fontSize: '0.85rem', fontWeight: 800, color: '#334155' }}>
              Dress Code Readiness: {fulfillmentPercent}% Complete
            </span>
            <span style={{ fontSize: '0.8rem', fontWeight: 700, color: missingCount === 0 ? '#10b981' : '#d97706' }}>
              {missingCount === 0 ? '✓ Complete Standard Uniform Set' : `● ${missingCount} item(s) needed for full compliance`}
            </span>
          </div>
          <div style={{ width: '100%', height: 8, background: '#f1f5f9', borderRadius: 999, overflow: 'hidden' }}>
            <div
              style={{
                width: `${fulfillmentPercent}%`,
                height: '100%',
                background: fulfillmentPercent === 100 ? '#10b981' : 'linear-gradient(90deg, #3b82f6, #10b981)',
                borderRadius: 999,
                transition: 'width 0.4s ease'
              }}
            />
          </div>
        </div>
      )}

      {/* Portal Tabs Bar */}
      <div style={{ display: 'flex', gap: 10, borderBottom: '2px solid #e2e8f0', paddingBottom: 0 }}>
        <button
          onClick={() => setActiveTab('requirements')}
          style={{
            border: 'none',
            background: 'none',
            padding: '12px 20px',
            fontSize: '0.92rem',
            fontWeight: activeTab === 'requirements' ? 800 : 600,
            color: activeTab === 'requirements' ? '#2563eb' : '#64748b',
            borderBottom: activeTab === 'requirements' ? '3px solid #2563eb' : '3px solid transparent',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            transition: 'all 0.15s ease'
          }}
        >
          <i className="fas fa-clipboard-check"></i>
          Requirements Checklist
          <span
            style={{
              fontSize: '0.72rem',
              fontWeight: 800,
              padding: '2px 8px',
              borderRadius: 10,
              background: activeTab === 'requirements' ? '#eff6ff' : '#f1f5f9',
              color: activeTab === 'requirements' ? '#2563eb' : '#64748b'
            }}
          >
            {requirements.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('store')}
          style={{
            border: 'none',
            background: 'none',
            padding: '12px 20px',
            fontSize: '0.92rem',
            fontWeight: activeTab === 'store' ? 800 : 600,
            color: activeTab === 'store' ? '#2563eb' : '#64748b',
            borderBottom: activeTab === 'store' ? '3px solid #2563eb' : '3px solid transparent',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            transition: 'all 0.15s ease'
          }}
        >
          <i className="fas fa-shopping-bag"></i>
          School Store & Dispensary
          <span
            style={{
              fontSize: '0.72rem',
              fontWeight: 800,
              padding: '2px 8px',
              borderRadius: 10,
              background: activeTab === 'store' ? '#eff6ff' : '#f1f5f9',
              color: activeTab === 'store' ? '#2563eb' : '#64748b'
            }}
          >
            {shopItems.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('orders')}
          style={{
            border: 'none',
            background: 'none',
            padding: '12px 20px',
            fontSize: '0.92rem',
            fontWeight: activeTab === 'orders' ? 800 : 600,
            color: activeTab === 'orders' ? '#2563eb' : '#64748b',
            borderBottom: activeTab === 'orders' ? '3px solid #2563eb' : '3px solid transparent',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            transition: 'all 0.15s ease'
          }}
        >
          <i className="fas fa-history"></i>
          Order History & Receipts
          <span
            style={{
              fontSize: '0.72rem',
              fontWeight: 800,
              padding: '2px 8px',
              borderRadius: 10,
              background: activeTab === 'orders' ? '#eff6ff' : '#f1f5f9',
              color: activeTab === 'orders' ? '#2563eb' : '#64748b'
            }}
          >
            {orderHistory.length}
          </span>
        </button>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          TAB 1: REQUIREMENTS CHECKLIST
      ───────────────────────────────────────────────────────────── */}
      {activeTab === 'requirements' && (
        <div className="portal-card" style={{ marginBottom: 0, borderRadius: 14 }}>
          <div className="portal-card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
            <div>
              <h2 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800, color: '#0f172a' }}>
                <i className="fas fa-clipboard-list mr-2 text-primary"></i>
                Official Dress Code Checklist
              </h2>
              <span style={{ fontSize: '0.85rem', color: '#64748b' }}>
                Cross-referenced with school store issuances and verified purchases for {student?.name || 'child'}.
              </span>
            </div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <span className="portal-badge success" style={{ padding: '4px 10px', fontSize: '0.75rem' }}>
                ✓ {fulfilledCount} Fulfilled
              </span>
              <span className="portal-badge danger" style={{ padding: '4px 10px', fontSize: '0.75rem' }}>
                ✗ {missingCount} Missing
              </span>
            </div>
          </div>

          <div className="portal-card-body" style={{ padding: 0 }}>
            {requirements.length === 0 ? (
              <div style={{ padding: '48px 24px', textAlign: 'center', color: '#64748b' }}>
                <i className="fas fa-tshirt fa-3x" style={{ color: '#cbd5e1', marginBottom: 12 }}></i>
                <h4 style={{ margin: '0 0 4px', color: '#1e293b' }}>No Requirements Configured in Database</h4>
                <p style={{ margin: 0, fontSize: '0.85rem' }}>
                  The school has not registered any items in the uniform database yet.
                </p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                {requirements.map((req, idx) => {
                  const isFulfilled = req.status === 'FULFILLED';
                  const shopMatch = shopItems.find(s => s.id === req.id || s.name.toLowerCase() === req.name.toLowerCase());

                  return (
                    <div
                      key={req.id || idx}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '16px 24px',
                        borderBottom: idx === requirements.length - 1 ? 'none' : '1px solid #f1f5f9',
                        background: isFulfilled ? '#ffffff' : '#fffdfd',
                        gap: 16,
                        flexWrap: 'wrap',
                        transition: 'background 0.15s ease'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                        <div
                          style={{
                            width: 34,
                            height: 34,
                            borderRadius: '50%',
                            background: isFulfilled ? '#ecfdf5' : '#fef2f2',
                            color: isFulfilled ? '#10b981' : '#ef4444',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '1rem',
                            fontWeight: 900,
                            flexShrink: 0
                          }}
                        >
                          {isFulfilled ? '✓' : '✗'}
                        </div>

                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                            <span style={{ fontSize: '0.98rem', fontWeight: 800, color: isFulfilled ? '#1e293b' : '#991b1b' }}>
                              {req.name}
                            </span>
                            <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#64748b' }}>
                              x{req.requiredQty} required
                            </span>
                            <span className="portal-badge neutral" style={{ fontSize: '0.68rem', padding: '2px 8px' }}>
                              {req.category}
                            </span>
                            {req.isSeasonal && (
                              <span style={{ fontSize: '0.68rem', fontWeight: 700, background: '#fef3c7', color: '#b45309', padding: '2px 8px', borderRadius: 4 }}>
                                Winter Item
                              </span>
                            )}
                          </div>
                          <div style={{ fontSize: '0.82rem', color: isFulfilled ? '#64748b' : '#b91c1c', marginTop: 2 }}>
                            {req.seasonNotes || (isFulfilled ? 'Requirement fulfilled' : 'Not recorded in uniform records')}
                          </div>
                        </div>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        {isFulfilled ? (
                          <span
                            style={{
                              fontSize: '0.78rem',
                              fontWeight: 800,
                              background: '#ecfdf5',
                              color: '#10b981',
                              padding: '5px 12px',
                              borderRadius: 6,
                              border: '1px solid #a7f3d0'
                            }}
                          >
                            Owned & Verified (x{req.ownedQty}) ✓
                          </span>
                        ) : (
                          <button
                            className="portal-btn-primary"
                            style={{
                              padding: '7px 14px',
                              fontSize: '0.82rem',
                              fontWeight: 800,
                              background: '#2563eb',
                              display: 'flex',
                              alignItems: 'center',
                              gap: 6
                            }}
                            onClick={() => {
                              if (shopMatch) {
                                handleAddToCart(shopMatch);
                              } else {
                                handleAddToCart({ id: req.id, name: req.name, price: 15.0, stockLevel: 20 });
                              }
                            }}
                          >
                            <i className="fas fa-cart-plus"></i> Order from Dispensary
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          TAB 2: SCHOOL UNIFORM STORE
      ───────────────────────────────────────────────────────────── */}
      {activeTab === 'store' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Store Filter Bar */}
          <div
            className="portal-card"
            style={{
              marginBottom: 0,
              padding: 16,
              borderRadius: 14,
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: 12
            }}
          >
            <div style={{ display: 'flex', gap: 8, overflowX: 'auto', alignItems: 'center' }}>
              {[
                { key: 'ALL', label: 'All Store Items' },
                { key: 'MISSING', label: 'Missing for Child' },
                { key: 'UNIFORM', label: 'Uniforms & Shirts' },
                { key: 'SPORTS', label: 'Sportswear & Kits' },
                { key: 'ACCESSORIES', label: 'Ties & Accessories' }
              ].map(f => (
                <button
                  key={f.key}
                  type="button"
                  onClick={() => setStoreFilter(f.key as any)}
                  style={{
                    border: '1px solid',
                    borderColor: storeFilter === f.key ? '#2563eb' : '#e2e8f0',
                    borderRadius: 20,
                    padding: '6px 14px',
                    fontSize: '0.82rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    background: storeFilter === f.key ? '#2563eb' : '#ffffff',
                    color: storeFilter === f.key ? '#ffffff' : '#475569',
                    whiteSpace: 'nowrap'
                  }}
                >
                  {f.label}
                </button>
              ))}
            </div>

            <div style={{ position: 'relative', width: 260 }}>
              <i className="fas fa-search" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', fontSize: '0.85rem' }} />
              <input
                type="text"
                placeholder="Search uniform item..."
                value={storeSearch}
                onChange={e => setStoreSearch(e.target.value)}
                style={{
                  width: '100%',
                  padding: '7px 12px 7px 34px',
                  borderRadius: 10,
                  border: '1px solid #cbd5e1',
                  fontSize: '0.85rem',
                  outline: 'none',
                  background: '#f8fafc'
                }}
              />
            </div>
          </div>

          {filteredShopItems.length === 0 ? (
            <div className="portal-card" style={{ textAlign: 'center', padding: '60px 24px', background: '#f8fafc', borderRadius: 14 }}>
              <i className="fas fa-box-open fa-3x" style={{ color: '#cbd5e1', marginBottom: 12 }}></i>
              <h3 style={{ margin: '0 0 4px', color: '#1e293b', fontSize: '1.15rem', fontWeight: 800 }}>No Items Found</h3>
              <p style={{ margin: 0, color: '#64748b', fontSize: '0.85rem' }}>
                No database items match the selected category filter.
              </p>
            </div>
          ) : (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
                gap: 16
              }}
            >
              {filteredShopItems.map(item => {
                const isClothing =
                  item.name.toLowerCase().includes('shirt') ||
                  item.name.toLowerCase().includes('skirt') ||
                  item.name.toLowerCase().includes('short') ||
                  item.name.toLowerCase().includes('jersey') ||
                  item.name.toLowerCase().includes('tracksuit') ||
                  item.name.toLowerCase().includes('blazer');

                return (
                  <div
                    key={item.id}
                    className="portal-card"
                    style={{
                      marginBottom: 0,
                      borderRadius: 14,
                      padding: 20,
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      border: item.isMissingForChild ? '2px solid #bfdbfe' : '1px solid #e2e8f0',
                      background: item.isMissingForChild ? '#f8faff' : '#ffffff',
                      position: 'relative'
                    }}
                  >
                    {item.isMissingForChild && (
                      <span
                        style={{
                          position: 'absolute',
                          top: 12,
                          right: 12,
                          background: '#eff6ff',
                          color: '#2563eb',
                          fontSize: '0.68rem',
                          fontWeight: 800,
                          padding: '2px 8px',
                          borderRadius: 6,
                          border: '1px solid #93c5fd'
                        }}
                      >
                        REQUIRED FOR CHILD
                      </span>
                    )}

                    <div>
                      <h4 style={{ margin: '0 0 6px', fontSize: '1rem', fontWeight: 800, color: '#0f172a', paddingRight: item.isMissingForChild ? 90 : 0 }}>
                        {item.name}
                      </h4>
                      <div style={{ fontSize: '1.35rem', fontWeight: 900, color: '#0f172a', marginBottom: 12 }}>
                        ${item.price.toFixed(2)}
                      </div>

                      {/* Size selector if apparel */}
                      {isClothing && (
                        <div style={{ marginBottom: 12 }}>
                          <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', display: 'block', marginBottom: 4 }}>
                            Select Size:
                          </label>
                          <select
                            className="portal-input"
                            style={{ padding: '6px 10px', fontSize: '0.82rem', width: '100%' }}
                            value={selectedSizes[item.id] || 'Medium'}
                            onChange={e => setSelectedSizes({ ...selectedSizes, [item.id]: e.target.value })}
                          >
                            <option value="Small">Small (Junior / Grade 1-3)</option>
                            <option value="Medium">Medium (Intermediate / Grade 4-5)</option>
                            <option value="Large">Large (Senior / Grade 6-7)</option>
                            <option value="X-Large">X-Large (Senior Fit)</option>
                          </select>
                        </div>
                      )}
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 12, paddingTop: 12, borderTop: '1px solid #f1f5f9' }}>
                      <span style={{ fontSize: '0.78rem', color: item.stockLevel > 0 ? '#10b981' : '#dc2626', fontWeight: 700 }}>
                        {item.stockLevel > 0 ? `✓ In Stock (${item.stockLevel})` : 'Out of Stock'}
                      </span>
                      <button
                        className="portal-btn-primary"
                        style={{ padding: '7px 16px', fontSize: '0.82rem', fontWeight: 800, borderRadius: 8 }}
                        onClick={() => handleAddToCart(item)}
                        disabled={item.stockLevel <= 0}
                      >
                        <i className="fas fa-cart-plus mr-1"></i> Add
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          TAB 3: ORDER HISTORY & RECEIPTS
      ───────────────────────────────────────────────────────────── */}
      {activeTab === 'orders' && (
        <div className="portal-card" style={{ marginBottom: 0, borderRadius: 14 }}>
          <div className="portal-card-header">
            <div>
              <h2 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800, color: '#0f172a' }}>
                <i className="fas fa-history mr-2 text-primary"></i>
                Dispensary Order History & Issuances
              </h2>
              <span style={{ fontSize: '0.85rem', color: '#64748b' }}>
                Past purchases and school uniform issuances for {student?.name || 'child'}.
              </span>
            </div>
          </div>

          <div className="portal-card-body" style={{ padding: 0 }}>
            {orderHistory.length === 0 ? (
              <div style={{ padding: '48px 24px', textAlign: 'center', color: '#64748b' }}>
                <i className="fas fa-receipt fa-3x" style={{ color: '#cbd5e1', marginBottom: 12 }}></i>
                <h4 style={{ margin: '0 0 4px', color: '#1e293b' }}>No Previous Orders Recorded</h4>
                <p style={{ margin: 0, fontSize: '0.85rem' }}>
                  Orders placed through the parent portal will appear here with collection status.
                </p>
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table className="portal-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                      <th style={{ padding: '12px 16px', textAlign: 'left' }}>Order #</th>
                      <th style={{ padding: '12px 16px', textAlign: 'left' }}>Date</th>
                      <th style={{ padding: '12px 16px', textAlign: 'left' }}>Items Summary</th>
                      <th style={{ padding: '12px 16px', textAlign: 'right' }}>Total</th>
                      <th style={{ padding: '12px 16px', textAlign: 'center' }}>Payment Mode</th>
                      <th style={{ padding: '12px 16px', textAlign: 'center' }}>Status</th>
                      <th style={{ padding: '12px 16px', textAlign: 'right' }}>Voucher</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedOrders.map(order => (
                      <tr key={order.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '12px 16px', fontWeight: 800, color: '#2563eb' }}>
                          {order.orderNumber}
                        </td>
                        <td style={{ padding: '12px 16px', color: '#64748b', fontSize: '0.85rem' }}>
                          {order.date}
                        </td>
                        <td style={{ padding: '12px 16px', fontSize: '0.88rem', color: '#1e293b', maxWidth: 300 }}>
                          {order.itemsSummary}
                        </td>
                        <td style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 900, color: '#0f172a' }}>
                          ${order.totalAmount.toFixed(2)}
                        </td>
                        <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                          <span className="portal-badge neutral" style={{ fontSize: '0.72rem' }}>
                            {order.paymentMode}
                          </span>
                        </td>
                        <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                          <span
                            style={{
                              fontSize: '0.72rem',
                              fontWeight: 800,
                              background: '#ecfdf5',
                              color: '#10b981',
                              padding: '3px 8px',
                              borderRadius: 4
                            }}
                          >
                            {order.status}
                          </span>
                        </td>
                        <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                          <button
                            className="portal-btn-ghost"
                            style={{ padding: '5px 10px', fontSize: '0.78rem' }}
                            onClick={() => setSelectedOrderForVoucher(order)}
                          >
                            <i className="fas fa-print mr-1"></i> Receipt
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {/* Unified Pagination */}
                <Pagination
                  currentPage={ordersPage}
                  totalItems={orderHistory.length}
                  pageSize={ordersPerPage}
                  onPageChange={setOrdersPage}
                  onPageSizeChange={(newSize) => {
                    setOrdersPerPage(newSize);
                    setOrdersPage(1);
                  }}
                  itemLabel="orders"
                />
              </div>
            )}
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          CHECKOUT & ORDER CONFIRMATION MODAL
      ───────────────────────────────────────────────────────────── */}
      {isCheckoutOpen && (
        <div
          className="portal-modal-overlay"
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.65)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: 20
          }}
          onClick={() => setIsCheckoutOpen(false)}
        >
          <div
            className="portal-modal-card"
            style={{ maxWidth: 520, width: '100%', background: '#fff', borderRadius: 16, overflow: 'hidden' }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{ padding: '20px 24px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f8fafc' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, color: '#0f172a' }}>
                  Confirm Uniform Dispensary Order
                </h3>
                <span style={{ fontSize: '0.8rem', color: '#64748b' }}>
                  Student: {student?.name} ({student?.studentId})
                </span>
              </div>
              <button className="portal-btn-ghost" onClick={() => setIsCheckoutOpen(false)}>
                <i className="fas fa-times"></i>
              </button>
            </div>

            <div style={{ padding: 24, maxHeight: '60vh', overflowY: 'auto' }}>
              <div style={{ marginBottom: 16 }}>
                <span style={{ fontSize: '0.78rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Order Items ({cart.reduce((s, i) => s + i.quantity, 0)})
                </span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 20 }}>
                {cart.map(item => (
                  <div
                    key={`${item.id}-${item.selectedSize}`}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '10px 14px',
                      background: '#f8fafc',
                      borderRadius: 10,
                      border: '1px solid #e2e8f0'
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 800, fontSize: '0.9rem', color: '#1e293b' }}>{item.name}</div>
                      <div style={{ fontSize: '0.78rem', color: '#64748b' }}>
                        Size: <strong>{item.selectedSize || 'Standard'}</strong> • ${item.price.toFixed(2)} each
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <button
                          className="portal-btn-ghost"
                          style={{ padding: '2px 8px', fontSize: '0.8rem', borderRadius: 4, border: '1px solid #cbd5e1' }}
                          onClick={() => handleUpdateQuantity(item.id, item.selectedSize, -1)}
                        >
                          -
                        </button>
                        <span style={{ fontWeight: 800, fontSize: '0.85rem', minWidth: 20, textAlign: 'center' }}>
                          {item.quantity}
                        </span>
                        <button
                          className="portal-btn-ghost"
                          style={{ padding: '2px 8px', fontSize: '0.8rem', borderRadius: 4, border: '1px solid #cbd5e1' }}
                          onClick={() => handleUpdateQuantity(item.id, item.selectedSize, 1)}
                        >
                          +
                        </button>
                      </div>

                      <div style={{ fontWeight: 900, fontSize: '0.92rem', minWidth: 60, textAlign: 'right' }}>
                        ${(item.price * item.quantity).toFixed(2)}
                      </div>

                      <button
                        onClick={() => handleRemoveFromCart(item.id, item.selectedSize)}
                        style={{ border: 'none', background: 'none', color: '#94a3b8', cursor: 'pointer', padding: 4 }}
                      >
                        <i className="fas fa-trash-alt"></i>
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Total Row */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', background: '#eff6ff', borderRadius: 10, border: '1px solid #bfdbfe', marginBottom: 20 }}>
                <span style={{ fontWeight: 800, color: '#1e40af' }}>Total Amount:</span>
                <span style={{ fontSize: '1.4rem', fontWeight: 900, color: '#1e40af' }}>${cartTotal.toFixed(2)}</span>
              </div>

              {/* Payment Mode Selector */}
              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: 800, color: '#334155', display: 'block', marginBottom: 8 }}>
                  Choose Settlement Method:
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  {[
                    { id: 'paynow', label: 'Paynow / Ecocash' },
                    { id: 'innbucks', label: 'InnBucks Voucher' },
                    { id: 'zig', label: 'ZiG / POS Debit' },
                    { id: 'cash', label: 'Pay at Tuckshop Counter' }
                  ].map(m => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => setPaymentMethod(m.id as any)}
                      style={{
                        padding: '10px 12px',
                        borderRadius: 8,
                        border: '1px solid',
                        borderColor: paymentMethod === m.id ? '#2563eb' : '#e2e8f0',
                        background: paymentMethod === m.id ? '#eff6ff' : '#ffffff',
                        color: paymentMethod === m.id ? '#2563eb' : '#334155',
                        fontWeight: 700,
                        fontSize: '0.82rem',
                        cursor: 'pointer',
                        textAlign: 'left'
                      }}
                    >
                      {paymentMethod === m.id ? '● ' : '○ '} {m.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div style={{ padding: '16px 24px', borderTop: '1px solid #e2e8f0', background: '#f8fafc', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <button className="portal-btn-secondary" onClick={() => setIsCheckoutOpen(false)}>
                Cancel
              </button>
              <button
                className="portal-btn-primary"
                style={{ padding: '10px 24px', fontWeight: 800 }}
                onClick={handleCompleteOrder}
                disabled={isSubmittingOrder || cart.length === 0}
              >
                {isSubmittingOrder ? 'Processing...' : `Confirm & Place Order ($${cartTotal.toFixed(2)})`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Printable Receipt Modal */}
      {selectedOrderForVoucher && (
        <div
          className="portal-modal-overlay"
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.65)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: 20
          }}
          onClick={() => setSelectedOrderForVoucher(null)}
        >
          <div
            className="portal-modal-card"
            style={{ maxWidth: 440, width: '100%', background: '#fff', borderRadius: 16, overflow: 'hidden', padding: 24 }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{ textAlign: 'center', borderBottom: '1px dashed #cbd5e1', paddingBottom: 16, marginBottom: 16 }}>
              <div style={{ width: 48, height: 48, borderRadius: '50%', background: '#dcfce7', color: '#16a34a', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 10px', fontSize: '1.4rem' }}>
                <i className="fas fa-check"></i>
              </div>
              <h3 style={{ margin: '0 0 4px', fontSize: '1.2rem', fontWeight: 800 }}>Dispensary Order Voucher</h3>
              <p style={{ margin: 0, color: '#64748b', fontSize: '0.85rem' }}>
                Present this voucher at the uniform store for pickup
              </p>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, fontSize: '0.85rem', marginBottom: 20 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#64748b' }}>Order Number:</span>
                <strong style={{ color: '#2563eb' }}>{selectedOrderForVoucher.orderNumber}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#64748b' }}>Student Name:</span>
                <strong>{student?.name}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#64748b' }}>Date:</span>
                <strong>{selectedOrderForVoucher.date}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#64748b' }}>Settlement Mode:</span>
                <strong>{selectedOrderForVoucher.paymentMode}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid #f1f5f9', paddingTop: 8 }}>
                <span style={{ color: '#64748b' }}>Items Summary:</span>
                <span style={{ textAlign: 'right', maxWidth: 220, fontWeight: 600 }}>{selectedOrderForVoucher.itemsSummary}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '2px solid #e2e8f0', paddingTop: 8 }}>
                <span style={{ fontWeight: 800, fontSize: '1rem' }}>Total Amount:</span>
                <span style={{ fontWeight: 900, fontSize: '1.1rem', color: '#16a34a' }}>
                  ${selectedOrderForVoucher.totalAmount.toFixed(2)}
                </span>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 10 }}>
              <button
                className="portal-btn-secondary"
                style={{ flex: 1, justifyContent: 'center' }}
                onClick={() => window.print()}
              >
                <i className="fas fa-print mr-2"></i> Print Voucher
              </button>
              <button
                className="portal-btn-primary"
                style={{ flex: 1, justifyContent: 'center' }}
                onClick={() => setSelectedOrderForVoucher(null)}
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
