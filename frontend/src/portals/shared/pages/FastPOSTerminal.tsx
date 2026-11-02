import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../../lib/api';
import { useAuth } from '../../../contexts/AuthContext';
import { useToast } from '../../../context/ToastContext';
import type { TuckshopItem } from '../../bursar/pages/TuckshopInventory';
import '../../../styles/portal.css';

interface POSItem {
  id: string;
  name: string;
  category: string;
  price: number;
  stock: number;
  barcode?: string;
}

interface CartItem extends POSItem {
  quantity: number;
}

interface StudentRecord {
  id: string;
  studentId: string;
  name: string;
  class?: { name: string };
  balance?: number;
}

interface TillSession {
  sessionNumber: string;
  status: string;
  cashierName: string;
  float: number;
}

type PaymentMethod = 'WALLET' | 'CASH_USD' | 'CASH_ZIG' | 'ECOCASH' | 'CARD';

interface POSReceipt {
  receiptNo: string;
  date: string;
  items: CartItem[];
  subtotalUSD: number;
  subtotalZiG: number;
  paymentMethod: PaymentMethod;
  studentName: string | null;
  studentId: string | null;
  newBalance: number | null;
  tendered: number;
}

interface UniformProductItem {
  id: string;
  name: string;
  size?: string;
  category?: { name?: string };
  sellingPrice?: number | string;
  stockQty?: number | string;
  barcode?: string;
}

export default function FastPOSTerminal() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const exchangeRate = 26.5; // USD to ZiG rate

  // POS Mode: Tuckshop vs Uniforms Store
  const [posMode, setPosMode] = useState<'TUCKSHOP' | 'UNIFORMS'>('TUCKSHOP');

  // Till status
  const [tillSession, setTillSession] = useState<TillSession>({
    sessionNumber: 'TILL-2026-001',
    status: 'ACTIVE',
    cashierName: user?.name || 'Cashier',
    float: 25.00
  });

  // Inventory & Categories
  const [items, setItems] = useState<POSItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [itemSearch, setItemSearch] = useState('');

  // Cart & Checkout
  const [cart, setCart] = useState<CartItem[]>([]);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('WALLET');

  // Student Wallet Search
  const [studentSearch, setStudentSearch] = useState('');
  const [searchingStudents, setSearchingStudents] = useState(false);
  const [searchResults, setSearchResults] = useState<StudentRecord[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<StudentRecord | null>(null);
  const [walletBalance, setWalletBalance] = useState<number | null>(null);

  // Cash change calculator
  const [tenderedAmount, setTenderedAmount] = useState('');

  // Processing & Receipt
  const [processing, setProcessing] = useState(false);
  const [receipt, setReceipt] = useState<POSReceipt | null>(null);

  const fetchItems = useCallback(async () => {
    setLoading(true);
    try {
      if (posMode === 'UNIFORMS') {
        const res = await api.get('/api/uniforms/products');
        const prods = Array.isArray(res.data) ? res.data : [];
        setItems(prods.map((p: UniformProductItem) => ({
          id: p.id,
          name: `${p.name}${p.size ? ` (${p.size})` : ''}`,
          category: p.category?.name || 'Apparel',
          price: Number(p.sellingPrice) || 0,
          stock: Number(p.stockQty) || 0,
          barcode: p.barcode || undefined
        })));
      } else {
        const res = await api.get('/api/tuckshop/items');
        const data = Array.isArray(res.data) ? res.data : [];
        setItems(data.map((item: TuckshopItem) => ({
          id: item.id,
          name: item.name,
          category: item.category,
          price: Number(item.price) || 0,
          stock: Number(item.stock) || 0,
          barcode: item.barcode || undefined
        })));
      }
    } catch (err: unknown) {
      console.error('Failed to fetch items from database:', err);
      showToast(`Failed to load ${posMode === 'UNIFORMS' ? 'uniform' : 'tuckshop'} items from database`, 'error');
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [posMode, showToast]);

  const checkTill = useCallback(async () => {
    try {
      const res = await api.get('/api/tills/active?deviceId=POS-TERMINAL-1');
      if (res.data?.session) {
        setTillSession({
          sessionNumber: res.data.session.sessionNumber || 'TILL-2026-ACTIVE',
          status: 'ACTIVE',
          cashierName: user?.name || 'Cashier',
          float: res.data.session.openingFloat || 25.00
        });
      }
    } catch {
      // Till session fetch fallback
    }
  }, [user?.name]);

  useEffect(() => {
    fetchItems();
    checkTill();
  }, [fetchItems, checkTill]);

  // Student Search for Wallet Deduction
  useEffect(() => {
    const query = studentSearch.trim();
    if (query.length < 2) {
      setSearchResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      setSearchingStudents(true);
      try {
        const res = await api.get(`/api/students?search=${encodeURIComponent(query)}`);
        const list = Array.isArray(res.data) ? res.data : res.data?.students || [];
        setSearchResults(list.slice(0, 5));
      } catch {
        setSearchResults([]);
      } finally {
        setSearchingStudents(false);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [studentSearch]);

  const selectStudent = async (st: StudentRecord) => {
    setSelectedStudent(st);
    setStudentSearch(`${st.name} (${st.studentId})`);
    setSearchResults([]);

    try {
      const res = await api.get(`/api/wallets/${st.id}`);
      setWalletBalance(res.data?.balance ?? 0);
    } catch {
      setWalletBalance(null);
    }
  };

  // Cart operations
  const addToCart = (item: POSItem) => {
    if (item.stock <= 0) {
      showToast(`${item.name} is out of stock`, 'warning');
      return;
    }
    const existing = cart.find(c => c.id === item.id);
    if (existing) {
      if (existing.quantity >= item.stock) {
        showToast('Maximum available stock reached', 'warning');
        return;
      }
      setCart(cart.map(c => c.id === item.id ? { ...c, quantity: c.quantity + 1 } : c));
    } else {
      setCart([...cart, { ...item, quantity: 1 }]);
    }
  };

  const updateQuantity = (id: string, delta: number) => {
    const item = cart.find(c => c.id === id);
    if (!item) return;
    const newQty = item.quantity + delta;
    if (newQty <= 0) {
      setCart(cart.filter(c => c.id !== id));
    } else {
      if (newQty > item.stock) {
        showToast('Cannot exceed available stock', 'warning');
        return;
      }
      setCart(cart.map(c => c.id === id ? { ...c, quantity: newQty } : c));
    }
  };

  const clearCart = () => {
    setCart([]);
    setSelectedStudent(null);
    setStudentSearch('');
    setWalletBalance(null);
    setTenderedAmount('');
  };

  const subtotalUSD = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const subtotalZiG = subtotalUSD * exchangeRate;

  // Checkout Handler
  const handleCheckout = async () => {
    if (cart.length === 0) {
      showToast('Cart is empty', 'warning');
      return;
    }

    if (paymentMethod === 'WALLET') {
      if (!selectedStudent) {
        showToast('Please search and select a student for wallet checkout', 'warning');
        return;
      }
      if (walletBalance !== null && walletBalance < subtotalUSD) {
        showToast(`Insufficient student wallet balance! Needed: $${subtotalUSD.toFixed(2)}, Available: $${walletBalance.toFixed(2)}`, 'error');
        return;
      }
    }

    setProcessing(true);
    try {
      const payloadMethod = paymentMethod === 'WALLET' ? 'WALLET' :
        paymentMethod === 'CARD' ? 'CARD' :
        paymentMethod === 'ECOCASH' ? 'ECOCASH' : 'CASH';

      if (posMode === 'UNIFORMS') {
        await api.post('/api/uniforms/sales', {
          items: cart.map(c => ({ itemId: c.id, quantity: c.quantity, unitPrice: c.price })),
          paymentMode: payloadMethod,
          studentId: selectedStudent?.id || null
        });
      } else {
        await api.post('/api/tuckshop/sales', {
          items: cart.map(c => ({ itemId: c.id, quantity: c.quantity, price: c.price })),
          paymentMethod: payloadMethod,
          studentId: selectedStudent?.id || null
        });
      }

      // Receipt data
      const saleReceipt = {
        receiptNo: `${posMode === 'UNIFORMS' ? 'UNI' : 'POS'}-${Date.now().toString().slice(-6)}`,
        date: new Date().toLocaleString(),
        items: [...cart],
        subtotalUSD,
        subtotalZiG,
        paymentMethod,
        studentName: selectedStudent ? selectedStudent.name : null,
        studentId: selectedStudent ? selectedStudent.studentId : null,
        newBalance: walletBalance !== null ? Math.max(0, walletBalance - subtotalUSD) : null,
        tendered: parseFloat(tenderedAmount || '0')
      };

      setReceipt(saleReceipt);
      showToast(`${posMode === 'UNIFORMS' ? 'Uniform' : 'Tuckshop'} sale completed and posted to ledger`, 'success');
      clearCart();
      fetchItems();
    } catch (err: unknown) {
      const error = err as { response?: { data?: { error?: string } } };
      showToast(error.response?.data?.error || 'Failed to complete checkout', 'error');
    } finally {
      setProcessing(false);
    }
  };

  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const code = itemSearch.trim();
      if (!code) return;

      // Find exact barcode or name match first
      const exactMatch = items.find(i => 
        (i.barcode && i.barcode.toLowerCase() === code.toLowerCase()) ||
        i.name.toLowerCase() === code.toLowerCase()
      );

      if (exactMatch) {
        if (exactMatch.stock <= 0) {
          showToast(`${exactMatch.name} is OUT OF STOCK!`, 'warning');
        } else {
          addToCart(exactMatch);
          showToast(`Scanned: ${exactMatch.name}`, 'success');
          setItemSearch('');
        }
      } else if (filteredItems.length === 1) {
        if (filteredItems[0].stock <= 0) {
          showToast(`${filteredItems[0].name} is OUT OF STOCK!`, 'warning');
        } else {
          addToCart(filteredItems[0]);
          showToast(`Added: ${filteredItems[0].name}`, 'success');
          setItemSearch('');
        }
      } else if (filteredItems.length === 0) {
        showToast(`No item found for barcode "${code}"`, 'error');
      }
    }
  };

  const categories = posMode === 'UNIFORMS'
    ? ['ALL', 'Boys Wear', 'Girls Wear', 'Shirts', 'Blazers', 'Accessories', 'Apparel']
    : ['ALL', 'Bakery', 'Drinks', 'Snacks', 'Stationery'];

  const filteredItems = items.filter(i => {
    const matchCat = selectedCategory === 'ALL' || i.category.toLowerCase() === selectedCategory.toLowerCase();
    const matchSearch = i.name.toLowerCase().includes(itemSearch.toLowerCase()) ||
      (i.barcode && i.barcode.toLowerCase().includes(itemSearch.toLowerCase()));
    return matchCat && matchSearch;
  });

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f1f5f9', display: 'flex', flexDirection: 'column', fontFamily: 'Inter, system-ui, sans-serif' }}>
      {/* Top POS Header Bar */}
      <header style={{
        backgroundColor: '#0f172a',
        color: '#ffffff',
        padding: '12px 24px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
        zIndex: 10
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <button
            onClick={() => navigate(posMode === 'UNIFORMS' ? '/admin/uniforms' : (user?.role === 'ANCILLARY' ? '/ancillary/tuckshop' : '/bursar/tuckshop'))}
            style={{ background: '#1e293b', border: '1px solid #334155', color: '#cbd5e1', padding: '6px 12px', borderRadius: 6, cursor: 'pointer', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: 6 }}
          >
            <i className="fas fa-arrow-left" /> Exit POS
          </button>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <i className={posMode === 'UNIFORMS' ? "fas fa-tshirt" : "fas fa-cash-register"} style={{ color: '#38bdf8', fontSize: '1.25rem' }} />
            <span style={{ fontWeight: 800, fontSize: '1.1rem', letterSpacing: '-0.02em' }}>
              {posMode === 'UNIFORMS' ? 'Uniforms Store POS' : 'Tuckshop Express POS'}
            </span>
          </div>
          <span style={{ backgroundColor: '#1e293b', color: '#94a3b8', padding: '4px 8px', borderRadius: 4, fontSize: '0.8rem', border: '1px solid #334155' }}>
            {tillSession.sessionNumber}
          </span>

          {/* Mode Switcher */}
          <div style={{ display: 'flex', background: '#020617', padding: 3, borderRadius: 8, border: '1px solid #1e293b' }}>
            <button
              onClick={() => { setPosMode('TUCKSHOP'); setSelectedCategory('ALL'); }}
              style={{
                border: 'none',
                background: posMode === 'TUCKSHOP' ? '#0284c7' : 'transparent',
                color: posMode === 'TUCKSHOP' ? '#ffffff' : '#94a3b8',
                padding: '4px 10px',
                borderRadius: 6,
                fontSize: '0.8rem',
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              <i className="fas fa-cookie-bite" style={{ marginRight: 5 }} /> Tuckshop
            </button>
            <button
              onClick={() => { setPosMode('UNIFORMS'); setSelectedCategory('ALL'); }}
              style={{
                border: 'none',
                background: posMode === 'UNIFORMS' ? '#0284c7' : 'transparent',
                color: posMode === 'UNIFORMS' ? '#ffffff' : '#94a3b8',
                padding: '4px 10px',
                borderRadius: 6,
                fontSize: '0.8rem',
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              <i className="fas fa-tshirt" style={{ marginRight: 5 }} /> Uniforms Store
            </button>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
          <div style={{ fontSize: '0.85rem', color: '#94a3b8' }}>
            Rate: <strong>1 USD = {exchangeRate} ZiG</strong>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: '#22c55e' }} />
            <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>{tillSession.cashierName}</span>
          </div>
        </div>
      </header>

      {/* Main Split Layout: Left 65% Catalog / Right 35% Cart */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        {/* Left Side: Product Selection */}
        <div style={{ flex: '1 1 65%', display: 'flex', flexDirection: 'column', padding: '16px 20px', overflowY: 'auto' }}>
          {/* Search and Category Filter */}
          <div style={{ display: 'flex', gap: 12, marginBottom: 14, flexWrap: 'wrap', alignItems: 'center' }}>
            <div style={{ position: 'relative', flex: '1 1 280px' }}>
              <i className="fas fa-barcode" style={{ position: 'absolute', left: 14, top: 12, color: '#3b82f6', fontSize: '1rem' }} />
              <input
                type="text"
                className="portal-input"
                style={{ width: '100%', paddingLeft: 40, borderRadius: 8, borderColor: itemSearch ? '#3b82f6' : undefined }}
                placeholder="Scan barcode or type name (Press Enter)..."
                value={itemSearch}
                onChange={e => setItemSearch(e.target.value)}
                onKeyDown={handleSearchKeyDown}
                autoFocus
              />
            </div>

            <span style={{ fontSize: '0.75rem', color: '#16a34a', background: '#dcfce7', padding: '6px 10px', borderRadius: 6, fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <i className="fas fa-bolt" /> Barcode Auto-Scan Ready
            </span>

            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {categories.map(cat => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  style={{
                    padding: '8px 14px',
                    borderRadius: 8,
                    border: 'none',
                    cursor: 'pointer',
                    fontWeight: 600,
                    fontSize: '0.85rem',
                    backgroundColor: selectedCategory === cat ? '#2563eb' : '#ffffff',
                    color: selectedCategory === cat ? '#ffffff' : '#475569',
                    boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
                  }}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Grid of Items */}
          {loading ? (
            <div style={{ textAlign: 'center', padding: 60, color: '#64748b' }}>
              <i className="fas fa-spinner fa-spin" style={{ fontSize: '2rem', color: '#2563eb' }} />
              <p style={{ marginTop: 12 }}>Loading {posMode === 'UNIFORMS' ? 'uniforms' : 'tuckshop'} catalog...</p>
            </div>
          ) : filteredItems.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px 20px', color: '#64748b', background: '#fff', borderRadius: 12, border: '1px dashed #cbd5e1' }}>
              <i className="fas fa-box-open" style={{ fontSize: '2.5rem', color: '#94a3b8', marginBottom: 12 }} />
              <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: '#1e293b', margin: '0 0 6px 0' }}>No items found in database</h3>
              <p style={{ margin: 0, fontSize: '0.85rem' }}>
                {itemSearch ? `No products match "${itemSearch}"` : `No ${posMode === 'UNIFORMS' ? 'uniform' : 'tuckshop'} items currently registered in the system.`}
              </p>
            </div>
          ) : (
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
              gap: 12,
              alignContent: 'start'
            }}>
              {filteredItems.map(item => {
                const isOutOfStock = item.stock <= 0;
                return (
                  <button
                    key={item.id}
                    onClick={() => addToCart(item)}
                    disabled={isOutOfStock}
                    style={{
                      background: '#ffffff',
                      border: '1px solid #e2e8f0',
                      borderRadius: 12,
                      padding: 14,
                      textAlign: 'left',
                      cursor: isOutOfStock ? 'not-allowed' : 'pointer',
                      opacity: isOutOfStock ? 0.5 : 1,
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      boxShadow: '0 2px 4px rgba(0,0,0,0.02)',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 4 }}>
                        <span style={{ fontSize: '0.7rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 700 }}>
                          {item.category}
                        </span>
                        {item.barcode && (
                          <span style={{ fontSize: '0.65rem', color: '#1e40af', background: '#eff6ff', border: '1px solid #bfdbfe', padding: '1px 5px', borderRadius: 4, fontFamily: 'monospace', fontWeight: 700 }}>
                            <i className="fas fa-barcode mr-1" />{item.barcode}
                          </span>
                        )}
                      </div>
                      <div style={{ fontWeight: 700, color: '#0f172a', fontSize: '0.95rem', marginTop: 4, lineHeight: 1.25 }}>
                        {item.name}
                      </div>
                    </div>

                    <div style={{ marginTop: 16 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                        <span style={{ fontSize: '1.15rem', fontWeight: 800, color: '#2563eb' }}>
                          ${item.price.toFixed(2)}
                        </span>
                        <span style={{ fontSize: '0.75rem', color: '#16a34a', fontWeight: 600 }}>
                          ZiG {(item.price * exchangeRate).toFixed(1)}
                        </span>
                      </div>
                      <div style={{ fontSize: '0.75rem', color: isOutOfStock ? '#dc2626' : '#64748b', marginTop: 4 }}>
                        {isOutOfStock ? 'Out of stock' : `${item.stock} in stock`}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Right Side: Cart, Student Wallet, and Tender */}
        <div style={{
          flex: '0 0 380px',
          backgroundColor: '#ffffff',
          borderLeft: '1px solid #e2e8f0',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '-2px 0 10px rgba(0,0,0,0.03)'
        }}>
          {/* Cart Header */}
          <div style={{ padding: '16px 20px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ fontWeight: 700, fontSize: '1rem', color: '#0f172a', display: 'flex', alignItems: 'center', gap: 8 }}>
              <i className="fas fa-shopping-basket" style={{ color: '#2563eb' }} />
              Current Order ({cart.reduce((s, c) => s + c.quantity, 0)})
            </div>
            {cart.length > 0 && (
              <button
                onClick={clearCart}
                style={{ background: 'none', border: 'none', color: '#ef4444', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer' }}
              >
                Clear Cart
              </button>
            )}
          </div>

          {/* Cart Items List */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '12px 16px' }}>
            {cart.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px 10px', color: '#94a3b8' }}>
                <i className="fas fa-shopping-cart" style={{ fontSize: '2.5rem', marginBottom: 10, opacity: 0.3 }} />
                <p style={{ margin: 0, fontSize: '0.9rem' }}>Tap products on the left to add to order</p>
              </div>
            ) : (
              cart.map(item => (
                <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid #f8fafc' }}>
                  <div style={{ flex: 1, paddingRight: 8 }}>
                    <div style={{ fontWeight: 600, fontSize: '0.875rem', color: '#1e293b' }}>{item.name}</div>
                    <div style={{ fontSize: '0.75rem', color: '#64748b' }}>${item.price.toFixed(2)} each</div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <button
                      onClick={() => updateQuantity(item.id, -1)}
                      style={{ width: 26, height: 26, borderRadius: 4, border: '1px solid #cbd5e1', background: '#f8fafc', cursor: 'pointer', fontWeight: 700 }}
                    >
                      -
                    </button>
                    <span style={{ fontWeight: 700, minWidth: 20, textAlign: 'center', fontSize: '0.9rem' }}>
                      {item.quantity}
                    </span>
                    <button
                      onClick={() => updateQuantity(item.id, 1)}
                      style={{ width: 26, height: 26, borderRadius: 4, border: '1px solid #cbd5e1', background: '#f8fafc', cursor: 'pointer', fontWeight: 700 }}
                    >
                      +
                    </button>
                  </div>

                  <div style={{ minWidth: 60, textAlign: 'right', fontWeight: 700, color: '#0f172a', fontSize: '0.9rem' }}>
                    ${(item.price * item.quantity).toFixed(2)}
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Student Search / Wallet Lookup */}
          <div style={{ padding: '12px 16px', background: '#f8fafc', borderTop: '1px solid #e2e8f0', borderBottom: '1px solid #e2e8f0' }}>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase', marginBottom: 6 }}>
              Student Wallet Lookup
            </label>
            <div style={{ position: 'relative' }}>
              <input
                type="text"
                placeholder="Type student name or ID..."
                className="portal-input"
                style={{ width: '100%', fontSize: '0.85rem' }}
                value={studentSearch}
                onChange={e => {
                  setStudentSearch(e.target.value);
                  if (selectedStudent && e.target.value !== selectedStudent.name) {
                    setSelectedStudent(null);
                    setWalletBalance(null);
                  }
                }}
              />
              {searchingStudents && (
                <i className="fas fa-spinner fa-spin" style={{ position: 'absolute', right: 10, top: 10, color: '#2563eb' }} />
              )}
            </div>

            {/* Dropdown Results */}
            {searchResults.length > 0 && (
              <div style={{ background: '#fff', border: '1px solid #cbd5e1', borderRadius: 6, marginTop: 4, boxShadow: '0 4px 6px rgba(0,0,0,0.05)', maxHeight: 120, overflowY: 'auto' }}>
                {searchResults.map(s => (
                  <div
                    key={s.id}
                    onClick={() => selectStudent(s)}
                    style={{ padding: '8px 12px', fontSize: '0.85rem', cursor: 'pointer', borderBottom: '1px solid #f1f5f9' }}
                  >
                    <strong>{s.name}</strong> <span style={{ color: '#64748b' }}>({s.studentId} &bull; {s.class?.name || 'Class'})</span>
                  </div>
                ))}
              </div>
            )}

            {selectedStudent && (
              <div style={{ marginTop: 8, padding: 8, borderRadius: 6, backgroundColor: walletBalance !== null && walletBalance >= subtotalUSD ? '#f0fdf4' : '#fef2f2', border: '1px solid #cbd5e1', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: '0.85rem', color: '#1e293b' }}>{selectedStudent.name}</div>
                  <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{selectedStudent.studentId} &bull; {selectedStudent.class?.name}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '0.7rem', color: '#64748b' }}>Pocket Balance</div>
                  <strong style={{ color: walletBalance !== null && walletBalance >= subtotalUSD ? '#166534' : '#b91c1c' }}>
                    ${walletBalance?.toFixed(2) || '0.00'}
                  </strong>
                </div>
              </div>
            )}
          </div>

          {/* Payment Method Selector */}
          <div style={{ padding: '12px 16px', borderBottom: '1px solid #f1f5f9' }}>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase', marginBottom: 6 }}>
              Payment Method
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 6 }}>
              {[
                { id: 'WALLET', label: 'Wallet', icon: 'fa-wallet' },
                { id: 'CASH_USD', label: 'USD Cash', icon: 'fa-dollar-sign' },
                { id: 'CASH_ZIG', label: 'ZiG Cash', icon: 'fa-coins' },
                { id: 'ECOCASH', label: 'EcoCash', icon: 'fa-mobile-alt' },
                { id: 'CARD', label: 'POS Card', icon: 'fa-credit-card' }
              ].map(m => (
                <button
                  key={m.id}
                  onClick={() => setPaymentMethod(m.id as PaymentMethod)}
                  style={{
                    padding: '8px 4px',
                    borderRadius: 6,
                    border: '1px solid',
                    borderColor: paymentMethod === m.id ? '#2563eb' : '#e2e8f0',
                    background: paymentMethod === m.id ? '#eff6ff' : '#ffffff',
                    color: paymentMethod === m.id ? '#1e40af' : '#475569',
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: 4
                  }}
                >
                  <i className={`fas ${m.icon}`} /> {m.label}
                </button>
              ))}
            </div>
          </div>

          {/* Cash Change Calculator */}
          {(paymentMethod === 'CASH_USD' || paymentMethod === 'CASH_ZIG') && (
            <div style={{ padding: '10px 16px', background: '#fffbeb', borderBottom: '1px solid #fef3c7' }}>
              <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#92400e' }}>Tendered Amount</label>
                  <input
                    type="number"
                    step="0.01"
                    className="portal-input"
                    style={{ width: '100%', fontSize: '0.85rem' }}
                    placeholder={paymentMethod === 'CASH_USD' ? '$' : 'ZiG'}
                    value={tenderedAmount}
                    onChange={e => setTenderedAmount(e.target.value)}
                  />
                </div>
                {tenderedAmount && (
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '0.75rem', color: '#92400e' }}>Change Due</div>
                    <strong style={{ fontSize: '1rem', color: '#b45309' }}>
                      {paymentMethod === 'CASH_USD'
                        ? `$${Math.max(0, parseFloat(tenderedAmount || '0') - subtotalUSD).toFixed(2)}`
                        : `ZiG ${Math.max(0, parseFloat(tenderedAmount || '0') - subtotalZiG).toFixed(2)}`
                      }
                    </strong>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Totals & Submit */}
          <div style={{ padding: '16px 20px', background: '#f8fafc', marginTop: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, fontSize: '0.85rem', color: '#64748b' }}>
              <span>Total in ZiG:</span>
              <strong style={{ color: '#16a34a' }}>ZiG {subtotalZiG.toFixed(2)}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12, alignItems: 'baseline' }}>
              <span style={{ fontSize: '1rem', fontWeight: 700, color: '#0f172a' }}>Total Due (USD):</span>
              <span style={{ fontSize: '1.75rem', fontWeight: 800, color: '#0f172a' }}>
                ${subtotalUSD.toFixed(2)}
              </span>
            </div>

            <button
              onClick={handleCheckout}
              disabled={processing || cart.length === 0}
              style={{
                width: '100%',
                padding: '14px',
                borderRadius: 10,
                border: 'none',
                background: cart.length === 0 ? '#94a3b8' : '#2563eb',
                color: '#ffffff',
                fontWeight: 800,
                fontSize: '1rem',
                cursor: cart.length === 0 ? 'not-allowed' : 'pointer',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                gap: 8,
                boxShadow: cart.length > 0 ? '0 4px 6px -1px rgba(37,99,235,0.3)' : 'none'
              }}
            >
              {processing ? (
                <>
                  <i className="fas fa-spinner fa-spin" /> Processing Sale...
                </>
              ) : (
                <>
                  <i className="fas fa-check-circle" /> Charge & Complete Sale
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Instant Receipt Modal */}
      {receipt && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 99999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div style={{ background: '#ffffff', borderRadius: 12, maxWidth: 420, width: '100%', padding: 24, boxShadow: '0 20px 25px -5px rgba(0,0,0,0.2)' }}>
            <div style={{ textAlign: 'center', borderBottom: '1px dashed #cbd5e1', paddingBottom: 14, marginBottom: 14 }}>
              <i className="fas fa-check-circle" style={{ fontSize: '2.5rem', color: '#16a34a', marginBottom: 8 }} />
              <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800 }}>Sale Confirmed</h3>
              <div style={{ fontSize: '0.85rem', color: '#64748b', marginTop: 4 }}>
                Receipt: <strong>{receipt.receiptNo}</strong> &bull; {receipt.date}
              </div>
            </div>

            {receipt.studentName && (
              <div style={{ background: '#f8fafc', padding: 10, borderRadius: 6, fontSize: '0.85rem', marginBottom: 12 }}>
                <div>Student: <strong>{receipt.studentName}</strong> ({receipt.studentId})</div>
                {receipt.newBalance !== null && (
                  <div style={{ color: '#16a34a', marginTop: 2 }}>
                    Remaining Wallet Balance: <strong>${receipt.newBalance.toFixed(2)}</strong>
                  </div>
                )}
              </div>
            )}

            <div style={{ maxHeight: 180, overflowY: 'auto', marginBottom: 14 }}>
              {receipt.items.map((it) => (
                <div key={it.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', padding: '4px 0' }}>
                  <span>{it.name} &times; {it.quantity}</span>
                  <strong>${(it.price * it.quantity).toFixed(2)}</strong>
                </div>
              ))}
            </div>

            <div style={{ borderTop: '1px dashed #cbd5e1', paddingTop: 10, marginBottom: 18 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1.1rem', fontWeight: 800 }}>
                <span>Total Paid:</span>
                <span>${receipt.subtotalUSD.toFixed(2)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: '#64748b' }}>
                <span>Method: {receipt.paymentMethod}</span>
                <span>ZiG {receipt.subtotalZiG.toFixed(2)}</span>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 10 }}>
              <button
                onClick={() => window.print()}
                className="portal-btn-secondary"
                style={{ flex: 1, padding: '10px' }}
              >
                <i className="fas fa-print mr-1" /> Print
              </button>
              <button
                onClick={() => setReceipt(null)}
                className="portal-btn-primary"
                style={{ flex: 1, padding: '10px' }}
              >
                Next Sale
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
