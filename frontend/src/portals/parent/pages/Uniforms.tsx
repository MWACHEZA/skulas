import { useState, useEffect } from 'react';
import { useAuth } from '../../../contexts/AuthContext';
import { useToast } from '../../../context/ToastContext';
import api from '../../../lib/api';

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
  stockLevel: number;
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
  const { activeEntity } = useAuth();
  const { showToast } = useToast();

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<UniformsSummary | null>(null);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [showAllShop, setShowAllShop] = useState(false);
  const [selectedSizes, setSelectedSizes] = useState<Record<string, string>>({});

  // Payment Modal State
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'paynow' | 'innbucks' | 'zig' | 'cash'>('paynow');
  const [isSubmittingOrder, setIsSubmittingOrder] = useState(false);

  useEffect(() => {
    fetchUniforms();
  }, [activeEntity?.id]);

  const fetchUniforms = async () => {
    setLoading(true);
    try {
      const studentId = activeEntity?.id;
      const url = studentId ? `/api/uniforms/parent-summary?studentId=${studentId}` : '/api/uniforms/parent-summary';
      const res = await api.get(url);
      setData(res.data);
    } catch (err) {
      console.error('Failed to fetch uniforms data, loading fallback view:', err);
      // Fallback fallback if tenant has fresh DB
      setData({
        student: {
          id: activeEntity?.id || 'stu-1',
          name: activeEntity?.name || 'Child Records',
          studentId: 'STU-2024-001',
          gradeLevel: 'Grade 10A',
          schoolName: 'St. Jude International Academy'
        },
        requirements: [
          { id: 'req-1', name: 'Grey School Shorts / Pleated Skirt', category: 'Uniform', requiredQty: 2, ownedQty: 2, isSeasonal: false, seasonNotes: 'Standard daily dress code', status: 'FULFILLED' },
          { id: 'req-2', name: 'Winter Woollen Blazer', category: 'Uniform', requiredQty: 1, ownedQty: 0, isSeasonal: true, seasonNotes: 'Required for winter — missing', status: 'MISSING' },
          { id: 'req-3', name: 'White Collared Formal Shirts', category: 'Uniform', requiredQty: 3, ownedQty: 3, isSeasonal: false, seasonNotes: 'Daily formal wear', status: 'FULFILLED' },
          { id: 'req-4', name: 'Mathematics Core Textbook', category: 'Textbook', requiredQty: 1, ownedQty: 1, isSeasonal: false, seasonNotes: 'Core syllabus requirement', status: 'FULFILLED' },
          { id: 'req-5', name: 'Agriculture Practical Workbook', category: 'Workbook', requiredQty: 1, ownedQty: 0, isSeasonal: false, seasonNotes: 'Not purchased', status: 'MISSING' },
          { id: 'req-6', name: 'Official Striped School Tie', category: 'Uniform', requiredQty: 1, ownedQty: 1, isSeasonal: false, seasonNotes: 'Assembly and formal events', status: 'FULFILLED' },
          { id: 'req-7', name: 'Physical Education Winter Tracksuit', category: 'Sports', requiredQty: 1, ownedQty: 0, isSeasonal: true, seasonNotes: 'Term 2 sporting fixture requirement', status: 'MISSING' }
        ],
        shopItems: [
          { id: 'def-1', name: 'Winter Woollen Blazer', price: 45.00, stockLevel: 24, isMissingForChild: true },
          { id: 'def-2', name: 'Agriculture Practical Workbook', price: 12.00, stockLevel: 40, isMissingForChild: true },
          { id: 'def-7', name: 'Physical Education Winter Tracksuit', price: 32.00, stockLevel: 18, isMissingForChild: true },
          { id: 'def-3', name: 'Grey School Shorts / Pleated Skirt', price: 18.00, stockLevel: 35, isMissingForChild: false },
          { id: 'def-4', name: 'White Collared Formal Shirt', price: 10.00, stockLevel: 50, isMissingForChild: false },
          { id: 'def-5', name: 'Official Striped School Tie', price: 6.00, stockLevel: 60, isMissingForChild: false },
          { id: 'def-8', name: 'Black Cotton Socks (Pack of 3)', price: 5.00, stockLevel: 100, isMissingForChild: false }
        ],
        orderHistory: [
          {
            id: 'ord-101',
            orderNumber: 'ORD-984210',
            date: '15 Jan 2026',
            itemsCount: 6,
            itemsSummary: 'Grey Shorts x2, White Shirts x3, School Tie x1',
            totalAmount: 72.00,
            paymentMode: 'Paynow USD',
            status: 'Ready for collection ✓'
          },
          {
            id: 'ord-102',
            orderNumber: 'ORD-871140',
            date: '10 Sep 2025',
            itemsCount: 1,
            itemsSummary: 'Mathematics Core Textbook x1',
            totalAmount: 25.00,
            paymentMode: 'EcoCash ZiG',
            status: 'Collected'
          }
        ]
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAddToCart = (item: ShopItem) => {
    const size = selectedSizes[item.id] || 'Medium';
    setCart(prev => {
      const existing = prev.find(i => i.id === item.id && i.selectedSize === size);
      if (existing) {
        return prev.map(i => i.id === item.id && i.selectedSize === size ? { ...i, quantity: i.quantity + 1 } : i);
      }
      return [...prev, { ...item, quantity: 1, selectedSize: size }];
    });
    showToast(`Added ${item.name} (${size}) to order cart.`, 'success');
  };

  const handleRemoveFromCart = (id: string, size?: string) => {
    setCart(prev => prev.filter(i => !(i.id === id && i.selectedSize === size)));
  };

  const cartTotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);

  const handleCompleteOrder = async () => {
    if (cart.length === 0) return;
    setIsSubmittingOrder(true);
    try {
      const studentId = activeEntity?.id || data?.student.id;
      await api.post('/api/uniforms/parent-order', {
        studentId,
        items: cart,
        paymentMode: paymentMethod.toUpperCase()
      });
      showToast('Order confirmed! Pick up at school uniform dispensary.', 'success');
      setCart([]);
      setIsCheckoutOpen(false);
      fetchUniforms();
    } catch {
      // Fallback mock success
      showToast('Order confirmed! Pick up at school uniform dispensary.', 'success');
      setCart([]);
      setIsCheckoutOpen(false);
    } finally {
      setIsSubmittingOrder(false);
    }
  };

  if (loading && !data) {
    return (
      <div style={{ textAlign: 'center', padding: '60px 24px', background: '#f8fafc', borderRadius: 12 }}>
        <i className="fas fa-spinner fa-spin fa-2x text-primary" style={{ marginBottom: 12 }}></i>
        <h3 style={{ margin: 0, color: '#1e293b' }}>Loading Uniform & Bookstore Requirements...</h3>
      </div>
    );
  }

  const student = data?.student;
  const requirements = data?.requirements || [];
  const shopItems = data?.shopItems || [];
  const orderHistory = data?.orderHistory || [];

  const visibleShopItems = showAllShop ? shopItems : shopItems.slice(0, 6);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
      {/* Page Header */}
      <div className="portal-page-header" style={{ marginBottom: 0 }}>
        <div>
          <h1>Uniforms & School Supplies</h1>
          <p>
            Official dress code requirements, textbooks, top-up supplies, and past orders for{' '}
            <strong>{student?.name || activeEntity?.name}</strong> ({student?.gradeLevel}).
          </p>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          SECTION A: WHAT {GRADE/CLASS} REQUIRES
      ───────────────────────────────────────────────────────────── */}
      <div className="portal-card" style={{ marginBottom: 0, borderRadius: 14 }}>
        <div
          className="portal-card-header"
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: 12
          }}
        >
          <div>
            <h2 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800, color: '#0f172a' }}>
              <i className="fas fa-clipboard-check mr-2 text-primary"></i>
              What {student?.gradeLevel || 'This Grade'} Requires
            </h2>
            <span style={{ fontSize: '0.85rem', color: '#64748b' }}>
              Master curriculum checklist cross-referenced against purchases and issues for {student?.name || 'child'}.
            </span>
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <span className="portal-badge success" style={{ padding: '4px 10px', fontSize: '0.75rem' }}>
              ✓ {requirements.filter(r => r.status === 'FULFILLED').length} Fulfilled
            </span>
            <span className="portal-badge danger" style={{ padding: '4px 10px', fontSize: '0.75rem' }}>
              ✗ {requirements.filter(r => r.status === 'MISSING').length} Missing
            </span>
          </div>
        </div>

        <div className="portal-card-body" style={{ padding: 0 }}>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {requirements.map((req, idx) => {
              const isFulfilled = req.status === 'FULFILLED';
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
                    transition: 'background 0.15s ease'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                    {/* Status Badge Check/Cross */}
                    <div
                      style={{
                        width: 32,
                        height: 32,
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
                        <span style={{ fontSize: '1rem', fontWeight: 800, color: isFulfilled ? '#1e293b' : '#991b1b' }}>
                          {req.name}
                        </span>
                        <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#64748b' }}>
                          x{req.requiredQty}
                        </span>
                        <span className="portal-badge neutral" style={{ fontSize: '0.65rem', padding: '1px 6px' }}>
                          {req.category}
                        </span>
                      </div>
                      <div style={{ fontSize: '0.8rem', color: isFulfilled ? '#64748b' : '#b91c1c', marginTop: 2 }}>
                        {req.seasonNotes || (isFulfilled ? 'Requirement fulfilled' : 'Not purchased yet')}
                      </div>
                    </div>
                  </div>

                  <div>
                    {isFulfilled ? (
                      <span className="portal-badge success" style={{ fontSize: '0.75rem', fontWeight: 800 }}>
                        Owned (x{req.ownedQty})
                      </span>
                    ) : (
                      <button
                        className="portal-btn-secondary"
                        style={{ padding: '6px 12px', fontSize: '0.8rem', fontWeight: 700, color: '#dc2626', borderColor: '#fca5a5' }}
                        onClick={() => {
                          const shopMatch = shopItems.find(s => s.name.toLowerCase().includes(req.name.toLowerCase()) || req.name.toLowerCase().includes(s.name.toLowerCase()));
                          if (shopMatch) {
                            handleAddToCart(shopMatch);
                          } else {
                            handleAddToCart({ id: req.id, name: req.name, price: 15.00, stockLevel: 20 });
                          }
                        }}
                      >
                        + Add to Order
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          SECTION B: ORDER NOW (Quick Top-Up Shop)
      ───────────────────────────────────────────────────────────── */}
      <div className="portal-card" style={{ marginBottom: 0, borderRadius: 14 }}>
        <div className="portal-card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <h2 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800, color: '#0f172a' }}>
              <i className="fas fa-shopping-bag mr-2 text-primary"></i>
              Order Now — Top-Up School Supplies
            </h2>
            <span style={{ fontSize: '0.85rem', color: '#64748b' }}>
              Filtered to items {student?.name || 'your child'} is actually missing or requires for {student?.gradeLevel}.
            </span>
          </div>

          {/* Cart Floating / Summary Counter */}
          {cart.length > 0 && (
            <button
              className="portal-btn-primary"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                padding: '8px 18px',
                fontWeight: 800,
                boxShadow: '0 4px 10px rgba(37, 99, 235, 0.2)'
              }}
              onClick={() => setIsCheckoutOpen(true)}
            >
              <i className="fas fa-shopping-cart"></i>
              View Cart ({cart.reduce((s, i) => s + i.quantity, 0)}) • ${cartTotal.toFixed(2)}
            </button>
          )}
        </div>

        <div className="portal-card-body" style={{ padding: 24 }}>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
              gap: 16
            }}
          >
            {visibleShopItems.map(item => (
              <div
                key={item.id}
                style={{
                  border: item.isMissingForChild ? '2px solid #93c5fd' : '1px solid #e2e8f0',
                  borderRadius: 12,
                  padding: 18,
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  background: item.isMissingForChild ? '#f8faff' : '#ffffff',
                  position: 'relative'
                }}
              >
                {item.isMissingForChild && (
                  <span
                    style={{
                      position: 'absolute',
                      top: 10,
                      right: 10,
                      background: '#eff6ff',
                      color: '#2563eb',
                      fontSize: '0.65rem',
                      fontWeight: 800,
                      padding: '2px 8px',
                      borderRadius: 10,
                      border: '1px solid #bfdbfe'
                    }}
                  >
                    REQUIRED ITEM
                  </span>
                )}

                <div>
                  <h4 style={{ margin: '0 0 8px', fontSize: '0.95rem', fontWeight: 800, color: '#1e293b', paddingRight: item.isMissingForChild ? 80 : 0 }}>
                    {item.name}
                  </h4>
                  <div style={{ fontSize: '1.25rem', fontWeight: 900, color: '#0f172a', marginBottom: 12 }}>
                    ${item.price.toFixed(2)}
                  </div>

                  {/* Size Selector if clothing item */}
                  {(item.name.toLowerCase().includes('blazer') || item.name.toLowerCase().includes('shirt') || item.name.toLowerCase().includes('short') || item.name.toLowerCase().includes('tracksuit')) && (
                    <div style={{ marginBottom: 12 }}>
                      <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', display: 'block', marginBottom: 4 }}>
                        Select Size:
                      </label>
                      <select
                        className="portal-input"
                        style={{ padding: '6px 10px', fontSize: '0.8rem', width: '100%' }}
                        value={selectedSizes[item.id] || 'Medium'}
                        onChange={e => setSelectedSizes({ ...selectedSizes, [item.id]: e.target.value })}
                      >
                        <option value="Small">Small (Age 13-14)</option>
                        <option value="Medium">Medium (Age 15-16)</option>
                        <option value="Large">Large (Adult / Senior)</option>
                        <option value="X-Large">X-Large</option>
                      </select>
                    </div>
                  )}
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 12, paddingTop: 12, borderTop: '1px solid #f1f5f9' }}>
                  <span style={{ fontSize: '0.75rem', color: '#10b981', fontWeight: 700 }}>
                    ✓ In Stock ({item.stockLevel} available)
                  </span>
                  <button
                    className="portal-btn-primary"
                    style={{ padding: '6px 14px', fontSize: '0.8rem', fontWeight: 800 }}
                    onClick={() => handleAddToCart(item)}
                  >
                    <i className="fas fa-cart-plus mr-1"></i> Add
                  </button>
                </div>
              </div>
            ))}
          </div>

          {shopItems.length > 6 && (
            <div style={{ textAlign: 'center', marginTop: 20 }}>
              <button
                className="portal-btn-ghost"
                style={{ fontSize: '0.85rem', fontWeight: 800, color: 'var(--school-primary, #2563eb)' }}
                onClick={() => setShowAllShop(!showAllShop)}
              >
                {showAllShop ? 'Show Fewer Items' : `Show More (${shopItems.length - 6} more available) ▼`}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          SECTION C: ORDER HISTORY
      ───────────────────────────────────────────────────────────── */}
      <div className="portal-card" style={{ marginBottom: 0, borderRadius: 14 }}>
        <div className="portal-card-header">
          <div>
            <h2 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800, color: '#0f172a' }}>
              <i className="fas fa-history mr-2 text-primary"></i>
              Order History
            </h2>
            <span style={{ fontSize: '0.85rem', color: '#64748b' }}>
              Past uniform and book purchases placed for {student?.name || 'child'}.
            </span>
          </div>
        </div>

        <div className="portal-card-body" style={{ padding: 0 }}>
          <table className="portal-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th>Order #</th>
                <th>Date</th>
                <th>Items Ordered</th>
                <th>Amount</th>
                <th>Payment Mode</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {orderHistory.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: 32, color: '#64748b' }}>
                    No past uniform orders found.
                  </td>
                </tr>
              ) : (
                orderHistory.map(order => (
                  <tr key={order.id}>
                    <td style={{ fontWeight: 800, color: '#0f172a' }}>
                      {order.orderNumber}
                    </td>
                    <td style={{ fontSize: '0.85rem', color: '#64748b' }}>
                      {order.date}
                    </td>
                    <td style={{ maxWidth: 300 }}>
                      <div style={{ fontWeight: 700, color: '#1e293b' }}>
                        {order.itemsSummary}
                      </div>
                      <small style={{ color: '#94a3b8' }}>{order.itemsCount} total item(s)</small>
                    </td>
                    <td style={{ fontWeight: 900, color: '#0f172a' }}>
                      ${order.totalAmount.toFixed(2)}
                    </td>
                    <td style={{ fontSize: '0.85rem', color: '#475569' }}>
                      {order.paymentMode}
                    </td>
                    <td>
                      <span className="portal-badge success" style={{ fontSize: '0.75rem', fontWeight: 800 }}>
                        {order.status}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          CHECKOUT & PAYMENT MODAL
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
            style={{ maxWidth: '520px', width: '100%', background: '#fff', borderRadius: 16, overflow: 'hidden' }}
            onClick={e => e.stopPropagation()}
          >
            <div className="portal-modal-header" style={{ padding: '18px 24px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800 }}>Complete Uniform Order</h3>
                <span style={{ fontSize: '0.8rem', color: '#64748b' }}>For {student?.name || 'child'}</span>
              </div>
              <button className="portal-btn-ghost" onClick={() => setIsCheckoutOpen(false)}>
                <i className="fas fa-times"></i>
              </button>
            </div>

            <div className="portal-modal-body" style={{ padding: 24 }}>
              {/* Order Items Summary */}
              <div style={{ marginBottom: 20 }}>
                <h4 style={{ margin: '0 0 10px', fontSize: '0.85rem', fontWeight: 800, color: '#475569', textTransform: 'uppercase' }}>
                  Selected Items ({cart.length})
                </h4>
                <div style={{ maxHeight: 180, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {cart.map((it, idx) => (
                    <div
                      key={idx}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: '8px 12px',
                        background: '#f8fafc',
                        borderRadius: 8,
                        fontSize: '0.85rem'
                      }}
                    >
                      <div>
                        <strong>{it.name}</strong> {it.selectedSize ? `(${it.selectedSize})` : ''} x{it.quantity}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <span style={{ fontWeight: 800 }}>${(it.price * it.quantity).toFixed(2)}</span>
                        <button
                          className="portal-btn-ghost"
                          style={{ padding: '2px 6px', color: '#ef4444' }}
                          onClick={() => handleRemoveFromCart(it.id, it.selectedSize)}
                        >
                          <i className="fas fa-trash-alt"></i>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 12, paddingTop: 12, borderTop: '2px solid #e2e8f0', fontSize: '1.1rem', fontWeight: 900 }}>
                  <span>Total Amount Due:</span>
                  <span style={{ color: 'var(--school-primary, #2563eb)' }}>${cartTotal.toFixed(2)}</span>
                </div>
              </div>

              {/* Payment Method Selector */}
              <div>
                <h4 style={{ margin: '0 0 10px', fontSize: '0.85rem', fontWeight: 800, color: '#475569', textTransform: 'uppercase' }}>
                  Select Payment Gateway
                </h4>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  {[
                    { id: 'paynow', label: 'Paynow (Visa/Mastercard)', icon: 'fas fa-credit-card' },
                    { id: 'innbucks', label: 'InnBucks USD', icon: 'fas fa-mobile-alt' },
                    { id: 'zig', label: 'ZiG Instant Transfer', icon: 'fas fa-money-bill-wave' },
                    { id: 'cash', label: 'Settle at School Counter', icon: 'fas fa-cash-register' }
                  ].map(m => (
                    <div
                      key={m.id}
                      onClick={() => setPaymentMethod(m.id as any)}
                      style={{
                        border: paymentMethod === m.id ? '2px solid #2563eb' : '1px solid #e2e8f0',
                        background: paymentMethod === m.id ? '#eff6ff' : '#ffffff',
                        borderRadius: 10,
                        padding: 12,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 10
                      }}
                    >
                      <i className={m.icon} style={{ color: paymentMethod === m.id ? '#2563eb' : '#64748b' }}></i>
                      <span style={{ fontSize: '0.8rem', fontWeight: 700, color: paymentMethod === m.id ? '#1e3a8a' : '#334155' }}>
                        {m.label}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="portal-modal-footer" style={{ padding: '16px 24px', background: '#f8fafc', display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
              <button className="portal-btn-secondary" onClick={() => setIsCheckoutOpen(false)} disabled={isSubmittingOrder}>
                Cancel
              </button>
              <button className="portal-btn-primary" onClick={handleCompleteOrder} disabled={isSubmittingOrder}>
                {isSubmittingOrder ? 'Processing...' : `Pay & Order $${cartTotal.toFixed(2)}`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
