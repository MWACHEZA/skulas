import { useState, useEffect } from 'react';
import api from '../../../lib/api';

interface TuckshopItem {
  id: string;
  name: string;
  price: number;
  stock: number;
}

interface CartItem extends TuckshopItem {
  quantity: number;
}

interface Sale {
  id: string;
  totalAmount: number;
  soldAt: string;
  studentId?: string;
}

export default function TuckshopSales() {
  const [items, setItems] = useState<TuckshopItem[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [recentSales, setRecentSales] = useState<Sale[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Checkout state
  const [paymentMethod, setPaymentMethod] = useState<'CASH' | 'WALLET' | 'SWIPE'>('CASH');
  const [studentId, setStudentId] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    fetchItems();
    fetchRecentSales();
  }, []);

  const fetchItems = async () => {
    try {
      const res = await api.get('/api/tuckshop/items');
      setItems(res.data);
    } catch (e) {
      console.error('Failed to fetch items', e);
    
    }
  };

  const fetchRecentSales = async () => {
    try {
      const res = await api.get('/api/tuckshop/sales/recent');
      setRecentSales(res.data);
    } catch (e) {
      console.error('Failed to fetch recent sales', e);
    
    }
  };

  const addToCart = (item: TuckshopItem) => {
    if (item.stock <= 0) {
      alert('Item is out of stock!');
      return;
    }
    const existing = cart.find(c => c.id === item.id);
    if (existing) {
      if (existing.quantity >= item.stock) {
        alert('Not enough stock available!');
        return;
      }
      setCart(cart.map(c => c.id === item.id ? { ...c, quantity: c.quantity + 1 } : c));
    } else {
      setCart([...cart, { ...item, quantity: 1 }]);
    }
  };

  const removeFromCart = (id: string) => {
    setCart(cart.filter(c => c.id !== id));
  };

  const handleCheckout = async () => {
    if (cart.length === 0) return alert('Cart is empty');
    if (paymentMethod === 'WALLET' && !studentId) return alert('Student ID is required for Wallet payments');

    setIsProcessing(true);
    try {
      await api.post('/api/tuckshop/sales', {
        items: cart.map(c => ({ itemId: c.id, quantity: c.quantity, price: c.price })),
        paymentMethod,
        studentId: studentId || null
      });
      alert('Sale processed successfully!');
      setCart([]);
      setStudentId('');
      fetchItems();
      fetchRecentSales();
    } catch (e: any) {
      console.error('Checkout error:', e);
      alert(e.response?.data?.error || 'Failed to process sale');
    } finally {
      setIsProcessing(false);
    }
  };

  const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const filteredItems = items.filter(i => i.name.toLowerCase().includes(searchQuery.toLowerCase()));

  return (
    <>
      <div className="portal-page-header">
        <h1>Tuckshop Point of Sale</h1>
        <p>Record daily sales and process payments for shop items.</p>
      </div>

      <div className="portal-grid-2">
        <div className="portal-card">
          <div className="portal-card-header">
            <h2><i className="fas fa-shopping-cart" style={{ marginRight: 8, color: 'var(--school-primary, #3182ce)' }}></i>Current Transaction</h2>
          </div>
          <div className="portal-card-body">
            <div style={{ marginBottom: 20 }}>
              <input 
                type="text" 
                className="portal-input" 
                placeholder="Search inventory to add..." 
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
              />
              {searchQuery && (
                <div style={{ maxHeight: 150, overflowY: 'auto', border: '1px solid #e2e8f0', borderRadius: 8, marginTop: 5 }}>
                  {filteredItems.map(item => (
                    <div 
                      key={item.id} 
                      style={{ padding: '10px 15px', borderBottom: '1px solid #e2e8f0', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', background: item.stock > 0 ? '#fff' : '#f7fafc' }}
                      onClick={() => addToCart(item)}
                    >
                      <span>{item.name} <small style={{ color: '#718096' }}>({item.stock} in stock)</small></span>
                      <span style={{ fontWeight: 600 }}>${item.price.toFixed(2)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div style={{ marginBottom: 20, minHeight: 150 }}>
              <table className="portal-table">
                <thead>
                  <tr>
                    <th>Item</th>
                    <th>Qty</th>
                    <th>Price</th>
                    <th>Total</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {cart.length === 0 ? (
                    <tr><td colSpan={5} style={{ textAlign: 'center', padding: 20 }}>Cart is empty</td></tr>
                  ) : cart.map(item => (
                    <tr key={item.id}>
                      <td>{item.name}</td>
                      <td>{item.quantity}</td>
                      <td>${item.price.toFixed(2)}</td>
                      <td style={{ fontWeight: 600 }}>${(item.price * item.quantity).toFixed(2)}</td>
                      <td><button onClick={() => removeFromCart(item.id)} style={{ color: 'var(--portal-danger)', background: 'none', border: 'none', cursor: 'pointer' }}><i className="fas fa-times"></i></button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div style={{ background: '#f8fafc', padding: 20, borderRadius: 12, marginBottom: 20 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1.25rem', color: '#2d3748' }}>
                <span style={{ fontWeight: 700 }}>Total Due:</span>
                <span style={{ fontWeight: 700 }}>${subtotal.toFixed(2)}</span>
              </div>
            </div>

            <div style={{ marginBottom: 15 }}>
              <label className="portal-label">Payment Method</label>
              <select className="portal-input" value={paymentMethod} onChange={(e: any) => setPaymentMethod(e.target.value)}>
                <option value="CASH">Cash</option>
                <option value="WALLET">Student Wallet</option>
                <option value="SWIPE">Swipe / Card</option>
              </select>
            </div>

            {paymentMethod === 'WALLET' && (
              <div style={{ marginBottom: 15 }}>
                <label className="portal-label">Student ID</label>
                <input type="text" className="portal-input" placeholder="e.g. STU-0001" value={studentId} onChange={e => setStudentId(e.target.value)} />
              </div>
            )}

            <button 
              className="portal-btn-primary" 
              style={{ width: '100%', height: 50, fontSize: '1.1rem' }} 
              onClick={handleCheckout}
              disabled={cart.length === 0 || isProcessing}
            >
              {isProcessing ? 'Processing...' : `Process ${paymentMethod} Payment`}
            </button>
          </div>
        </div>

        <div className="portal-card">
          <div className="portal-card-header">
            <h2>Recent Transactions</h2>
          </div>
          <div className="portal-card-body" style={{ padding: 0 }}>
             <table className="portal-table">
               <thead>
                 <tr>
                   <th>Time</th>
                   <th>Student</th>
                   <th>Amount</th>
                 </tr>
               </thead>
               <tbody>
                 {recentSales.length === 0 ? (
                   <tr><td colSpan={3} style={{ textAlign: 'center', padding: 20 }}>No recent sales</td></tr>
                 ) : recentSales.map(sale => (
                   <tr key={sale.id}>
                     <td style={{ fontSize: '0.85rem' }}>{new Date(sale.soldAt).toLocaleTimeString()}</td>
                     <td style={{ fontWeight: 600 }}>{sale.studentId || 'Walk-in'}</td>
                     <td style={{ fontWeight: 600, color: '#2f855a' }}>${sale.totalAmount.toFixed(2)}</td>
                   </tr>
                 ))}
               </tbody>
             </table>
          </div>
        </div>
      </div>
    </>
  );
}
