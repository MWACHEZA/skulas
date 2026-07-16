import React, { useState, useEffect } from "react";
import api from "../../../lib/api";
import { useToast } from "../../../context/ToastContext";
import { format } from "date-fns";
import { useAuth } from "../../../contexts/AuthContext";
import ManagementDetailPanel from "../../../components/shared/ManagementDetailPanel";
import '../../../styles/portal.css';

export interface UniformItem {
  id: string;
  name: string;
  orderPrice: number;
  sellingPrice: number;
  stockLevel: number;
}

export interface Supplier {
  id: string;
  companyName: string;
  contactName?: string;
  phone?: string;
}

export interface StockOrder {
  id: string;
  orderDate: string;
  supplier: Supplier;
  totalAmount: number;
  paymentMode: string;
  items: { item: UniformItem, quantity: number, unitPrice: number }[];
}

interface Sale {
  id: string;
  saleDate: string;
  student?: { name: string };
  totalAmount: number;
  paymentMode: string;
}

const UniformsPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState("items");
  const [items, setItems] = useState<UniformItem[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [orders, setOrders] = useState<StockOrder[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(true);
  const { showToast } = useToast();

  const { user, hasRole } = useAuth();
  const canManage = hasRole('BURSAR', 'SCHOOL_ADMIN');
  const isSupplier = hasRole('SUPPLIER');
  const isParentOrStudent = hasRole('PARENT', 'STUDENT');

  const [showAddItemModal, setShowAddItemModal] = useState(false);
  const [showRestockModal, setShowRestockModal] = useState(false);
  const [showSalesModal, setShowSalesModal] = useState(false);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [itemsRes, suppsRes, ordersRes, salesRes] = await Promise.all([
        api.get("/api/uniforms/items"),
        api.get("/api/uniforms/suppliers"),
        api.get("/api/uniforms/stock-orders"),
        api.get("/api/uniforms/sales")
      ]);
      setItems(Array.isArray(itemsRes.data) ? itemsRes.data : []);
      setSuppliers(Array.isArray(suppsRes.data) ? suppsRes.data : []);
      setOrders(Array.isArray(ordersRes.data) ? ordersRes.data : []);
      
      const salesData = Array.isArray(salesRes.data) ? salesRes.data : [];
      if (isParentOrStudent) {
        setSales(salesData.filter((s: any) => s.studentId === user?.id || s.parentId === user?.id));
      } else {
        setSales(salesData);
      }
    } catch (error) {
      showToast("Failed to synchronize institutional uniform registry", "error");
    
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [user]);

  const tabs = [
    { id: "items", label: "Uniform Inventory", icon: "fa-tshirt", show: canManage || isParentOrStudent },
    { id: "stock", label: "Supply History", icon: "fa-truck-loading", show: !canManage && isSupplier },
    { id: "sales", label: canManage ? "Sales Ledger" : "Purchase History", icon: "fa-shopping-cart", show: canManage || isParentOrStudent },
    { id: "suppliers", label: "Supplier Directory", icon: "fa-address-book", show: false },
    { id: "payments", label: canManage ? "Settlements" : "Payouts", icon: "fa-money-check-alt", show: canManage || isSupplier }
  ].filter(t => t.show);

  return (
    <div className="portal-container">
      <div className="portal-page-header">
        <div className="header-content">
          <h1>Uniforms Management</h1>
          <p>{canManage ? "Comprehensive oversight of institutional uniform inventory, procurement, and distribution." : "View available uniforms and monitor your transaction history."}</p>
        </div>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <div className="status-badge" style={{ padding: '8px 24px', background: '#f8fafc', border: '1px solid #f1f5f9', color: '#64748b', fontWeight: 900 }}>
             <i className="fas fa-shield-alt mr-2"></i>{user?.role?.toUpperCase()} AUTHORIZATION
          </div>
          {canManage && activeTab === "items" && (
             <button 
              onClick={() => setShowAddItemModal(true)}
              className="portal-btn-primary" 
              style={{ padding: '12px 32px', fontWeight: 900 }}
             >
                <i className="fas fa-plus-circle mr-2"></i>Catalog Item
             </button>
          )}
          {canManage && activeTab === "stock" && (
             <button 
              onClick={() => setShowRestockModal(true)}
              className="portal-btn-primary" 
              style={{ padding: '12px 32px', fontWeight: 900, background: '#059669' }}
             >
                <i className="fas fa-truck-loading mr-2"></i>Authorize Restock
             </button>
          )}
          {canManage && activeTab === "sales" && (
             <button 
              onClick={() => setShowSalesModal(true)}
              className="portal-btn-primary" 
              style={{ padding: '12px 32px', fontWeight: 900, background: '#f59e0b' }}
             >
                <i className="fas fa-cart-plus mr-2"></i>Record Sale
             </button>
          )}
        </div>
      </div>

      <div style={{ display: 'flex', gap: '8px', marginBottom: '40px', background: '#f8fafc', padding: '8px', borderRadius: '16px', border: '1px solid #f1f5f9', width: 'fit-content' }}>
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`portal-btn-${activeTab === tab.id ? 'primary' : 'ghost'}`}
            style={{ padding: '12px 24px', borderRadius: '12px', fontWeight: 900, fontSize: '0.85rem' }}
          >
            <i className={`fas ${tab.icon} mr-2`}></i>{tab.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="portal-card animate-in fade-in duration-500" style={{ padding: '100px', textAlign: 'center' }}>
          <div className="portal-spinner" style={{ margin: '0 auto 24px' }}></div>
          <p style={{ fontWeight: 900, color: '#64748b' }}>Synchronizing institutional registry...</p>
        </div>
      ) : (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
          {activeTab === "items" && (
            <ItemsTab 
              items={items} 
              onUpdate={fetchData} 
              canManage={canManage} 
              showModal={showAddItemModal} 
              setShowModal={setShowAddItemModal} 
            />
          )}
          {activeTab === "stock" && (
            <StockTab 
              items={items} 
              suppliers={suppliers} 
              orders={orders} 
              onUpdate={fetchData} 
              canManage={canManage} 
              showModal={showRestockModal} 
              setShowModal={setShowRestockModal} 
            />
          )}
          {activeTab === "sales" && (
            <SalesTab 
              items={items} 
              sales={sales} 
              onUpdate={fetchData} 
              canManage={canManage} 
              showModal={showSalesModal}
              setShowModal={setShowSalesModal}
            />
          )}
          {activeTab === "suppliers" && <SuppliersTab suppliers={suppliers} onUpdate={fetchData} canManage={canManage} />}
          {activeTab === "payments" && <PaymentsTab suppliers={suppliers} canManage={canManage} />}
        </div>
      )}
    </div>
  );
};

// ═══════════ SUB-COMPONENTS ═══════════

const ItemsTab = ({ items, onUpdate, canManage, showModal, setShowModal }: any) => {
  const [formData, setFormData] = useState({ name: '', orderPrice: '', sellingPrice: '' });
  const [editingId, setEditingId] = useState<string | null>(null);
  const { showToast } = useToast();

  const handleEdit = (item: any) => {
    setFormData({ name: item.name, orderPrice: item.orderPrice.toString(), sellingPrice: item.sellingPrice.toString() });
    setEditingId(item.id);
    setShowModal(true);
  };

  const handleDelete = async (id: string) => {
    if (!(await toastConfirm("Are you sure you want to delete this item?"))) return;
    try {
      await api.delete(`/api/uniforms/items/${id}`);
      showToast("Item deleted successfully", "success");
      onUpdate();
    } catch (error) {
      showToast("Failed to delete item", "error");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canManage) return;
    try {
      const payload = {
        ...formData,
        orderPrice: parseFloat(formData.orderPrice) || 0,
        sellingPrice: parseFloat(formData.sellingPrice) || 0
      };
      if (editingId) {
        await api.patch(`/api/uniforms/items/${editingId}`, payload);
        showToast("Inventory item updated successfully", "success");
      } else {
        await api.post("/api/uniforms/items", payload);
        showToast("Inventory item cataloged and archived", "success");
      }
      setFormData({ name: '', orderPrice: '', sellingPrice: '' });
      setEditingId(null);
      setShowModal(false);
      onUpdate();
    } catch (error) {
      showToast("Failed to authorize inventory cataloging", "error");
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
      <div className="management-table-card">
        <div className="portal-card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '32px', borderBottom: '1px solid #f1f5f9' }}>
           <div>
              <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 900, color: '#1e293b' }}>Uniform Inventory Matrix</h3>
              <p style={{ margin: '4px 0 0 0', color: '#64748b', fontWeight: 700, fontSize: '0.9rem' }}>Real-time oversight of institutional apparel stock levels.</p>
           </div>
           <span className="status-badge" style={{ background: '#eff6ff', color: '#1d4ed8', fontWeight: 900, padding: '8px 16px', border: '1px solid #dbeafe' }}>
              {(Array.isArray(items) ? items : []).length} REGISTERED ARTICLES
           </span>
        </div>
        <div className="table-responsive">
          <table className="management-table">
            <thead>
              <tr>
                <th style={{ paddingLeft: '32px' }}>Inventory Item</th>
                {canManage && <th>Procurement Price</th>}
                <th>Standard Retail</th>
                <th>Availability</th>
                {canManage && <th style={{ textAlign: 'right', paddingRight: '32px' }}>Management</th>}
              </tr>
            </thead>
            <tbody>
              {(Array.isArray(items) ? items : []).length > 0 ? (Array.isArray(items) ? items : []).map(item => (
                <tr key={item.id}>
                  <td style={{ paddingLeft: '32px' }}>
                    <div style={{ fontWeight: 800, color: '#1e293b' }}>{item.name}</div>
                    <div style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: 600 }}>SKU: {item.id.slice(0, 8).toUpperCase()}</div>
                  </td>
                  {canManage && <td style={{ color: '#64748b', fontWeight: 700 }}>${item.orderPrice.toFixed(2)}</td>}
                  <td style={{ fontWeight: 900, color: '#2563eb' }}>${item.sellingPrice.toFixed(2)}</td>
                  <td>
                    {item.stockLevel > 0 ? (
                      <span className="status-badge status-active" style={{ padding: '6px 14px', fontWeight: 900 }}>
                        {item.stockLevel} In Stock
                      </span>
                    ) : (
                      <span className="status-badge status-inactive" style={{ padding: '6px 14px', fontWeight: 900 }}>Out of Stock</span>
                    )}
                  </td>
                  {canManage && (
                    <td style={{ textAlign: 'right', paddingRight: '32px' }}>
                      <div className="action-buttons" style={{ justifyContent: 'flex-end' }}>
                        <button className="portal-btn-ghost" style={{ padding: '8px', color: '#2563eb' }} onClick={() => handleEdit(item)}><i className="fas fa-pencil-alt"></i></button>
                        <button className="portal-btn-ghost" style={{ padding: '8px', color: '#dc2626' }} onClick={() => handleDelete(item.id)}><i className="fas fa-trash"></i></button>
                      </div>
                    </td>
                  )}
                </tr>
              )) : (
                <tr><td colSpan={canManage ? 5 : 3} style={{ textAlign: 'center', padding: '80px', color: '#94a3b8' }}>
                  <i className="fas fa-box-open" style={{ fontSize: '3.5rem', display: 'block', marginBottom: '24px', opacity: 0.1 }}></i>
                  <p style={{ fontWeight: 700, fontSize: '1.1rem' }}>Empty catalog detected</p>
                </td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <div className="portal-modal-overlay">
          <div className="portal-modal-card animate-in zoom-in duration-200" style={{ maxWidth: '560px', padding: 0 }}>
            <div className="portal-modal-header" style={{ padding: '32px 40px', borderBottom: '1px solid #f1f5f9' }}>
               <div>
                  <h3 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 900 }}>{editingId ? 'Update Item' : 'Catalog New Item'}</h3>
                  <p style={{ margin: '4px 0 0 0', color: '#64748b', fontWeight: 700, fontSize: '0.9rem' }}>{editingId ? 'Modify an existing apparel article.' : 'Register a new apparel article into the institutional registry.'}</p>
               </div>
               <button onClick={() => { setShowModal(false); setEditingId(null); setFormData({ name: '', orderPrice: '', sellingPrice: '' }); }} className="portal-btn-ghost" style={{ padding: '12px' }}><i className="fas fa-times"></i></button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="portal-modal-body" style={{ padding: '40px' }}>
                <div className="form-group" style={{ marginBottom: '24px' }}>
                  <label className="portal-label">Canonical Item Name</label>
                  <input 
                    type="text" required
                    className="portal-input"
                    value={formData.name}
                    onChange={e => setFormData({...formData, name: e.target.value})}
                    placeholder="e.g. Academy Blazer (Premium Edition)"
                    style={{ fontWeight: 700, height: '56px' }}
                  />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
                  <div className="form-group">
                    <label className="portal-label">Procurement Cost ($)</label>
                    <input 
                      type="number" required
                      className="portal-input"
                      value={formData.orderPrice}
                      onChange={e => setFormData({...formData, orderPrice: e.target.value})}
                      placeholder="0.00"
                      style={{ fontWeight: 700, height: '56px' }}
                    />
                  </div>
                  <div className="form-group">
                    <label className="portal-label">Standard Retail Price ($)</label>
                    <input 
                      type="number" required
                      className="portal-input"
                      value={formData.sellingPrice}
                      onChange={e => setFormData({...formData, sellingPrice: e.target.value})}
                      placeholder="0.00"
                      style={{ fontWeight: 700, height: '56px' }}
                    />
                  </div>
                </div>
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '16px', marginTop: '32px' }}>
                  <button type="button" onClick={() => { setShowModal(false); setEditingId(null); setFormData({ name: '', orderPrice: '', sellingPrice: '' }); }} className="portal-btn-ghost">Cancel</button>
                  <button type="submit" className="portal-btn-primary" style={{ padding: '12px 32px' }}>
                    <i className="fas fa-save mr-2"></i> {editingId ? 'Update Item' : 'Commit Catalog Registration'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export const StockTab = ({ items, suppliers, orders, onUpdate, canManage, showModal, setShowModal }: any) => {
  const [supplierId, setSupplierId] = useState('');
  const [orderItems, setOrderItems] = useState<{ itemId: string, quantity: number, unitPrice: number }[]>([]);
  const { showToast } = useToast();

  const handleSaveOrder = async () => {
    if (!canManage || orderItems.length === 0) return;
    try {
      await api.post("/api/uniforms/stock-orders", {
        supplierId: supplierId || null,
        orderDate: new Date().toISOString(),
        items: orderItems,
        paymentMode: 'CASH'
      });
      showToast("Stock order manifest finalized and archived", "success");
      setOrderItems([]);
      setShowModal(false);
      onUpdate();
    } catch (error) {
      showToast("Failed to finalize institutional stock order", "error");
    
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
      <div className="management-table-card">
         <div className="portal-card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '32px', borderBottom: '1px solid #f1f5f9' }}>
            <div>
               <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 900, color: '#1e293b' }}>Procurement History Ledger</h3>
               <p style={{ margin: '4px 0 0 0', color: '#64748b', fontWeight: 700, fontSize: '0.9rem' }}>Comprehensive audit of institutional apparel procurement.</p>
            </div>
            <span className="status-badge" style={{ background: '#f8fafc', fontWeight: 900, color: '#475569', padding: '8px 16px', border: '1px solid #f1f5f9' }}>
              {(Array.isArray(orders) ? orders : []).length} AUTHORIZED ORDERS
            </span>
         </div>
         <div className="table-responsive">
          <table className="management-table">
              <thead>
                <tr>
                    <th style={{ paddingLeft: '32px' }}>Settlement Date</th>
                    <th>Manifest Summary</th>
                    {canManage && <th>Unit Procurement</th>}
                    <th>Total Settlement</th>
                    <th style={{ paddingRight: '32px' }}>Associated Supplier</th>
                </tr>
              </thead>
              <tbody>
                {(Array.isArray(orders) ? orders : []).length === 0 ? (
                    <tr><td colSpan={5} style={{ textAlign: 'center', padding: '80px', color: '#94a3b8' }}>
                      <i className="fas fa-history" style={{ fontSize: '3.5rem', display: 'block', marginBottom: '24px', opacity: 0.1 }}></i>
                      <p style={{ fontWeight: 700 }}>No procurement logs recorded</p>
                    </td></tr>
                ) : (Array.isArray(orders) ? orders : []).map(order => (
                    <tr key={order.id}>
                      <td style={{ paddingLeft: '32px', color: '#64748b', fontWeight: 700 }}>{format(new Date(order.orderDate), 'dd MMM yyyy')}</td>
                      <td style={{ fontWeight: 800 }}>{order.items[0]?.item.name} {order.items.length > 1 && <span style={{ color: '#94a3b8' }}>(+{order.items.length - 1} more)</span>}</td>
                      {canManage && <td style={{ color: '#64748b', fontWeight: 700 }}>${order.items[0]?.unitPrice.toFixed(2)}</td>}
                      <td style={{ fontWeight: 900, color: '#2563eb' }}>${order.totalAmount.toFixed(2)}</td>
                      <td style={{ paddingRight: '32px' }}>
                        <span className="status-badge" style={{ background: '#f8fafc', fontWeight: 800, color: '#475569' }}>
                          {order.supplier?.companyName || 'Internal Restock'}
                        </span>
                      </td>
                    </tr>
                ))}
              </tbody>
          </table>
         </div>
      </div>

      {showModal && (
        <div className="portal-modal-overlay">
          <div className="portal-modal-card animate-in zoom-in duration-200" style={{ maxWidth: '800px', padding: 0 }}>
            <div className="portal-modal-header" style={{ padding: '32px 40px', borderBottom: '1px solid #f1f5f9' }}>
               <div>
                  <h3 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 900 }}>Authorize Restock Manifest</h3>
                  <p style={{ margin: '4px 0 0 0', color: '#64748b', fontWeight: 700, fontSize: '0.9rem' }}>Execute batch procurement of institutional apparel articles.</p>
               </div>
               <button onClick={() => setShowModal(false)} className="portal-btn-ghost" style={{ padding: '12px' }}><i className="fas fa-times"></i></button>
            </div>
            <div className="portal-modal-body" style={{ padding: '40px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginBottom: '32px' }}>
                 <div className="form-group">
                    <label className="portal-label">Designated Supplier</label>
                    <select 
                      value={supplierId}
                      onChange={e => setSupplierId(e.target.value)}
                      className="portal-input"
                      style={{ fontWeight: 700, height: '56px' }}
                    >
                       <option value="">-- Generic Procurement --</option>
                       {(Array.isArray(suppliers) ? suppliers : []).map((s: Supplier) => <option key={s.id} value={s.id}>{s.companyName}</option>)}
                    </select>
                 </div>
                 <div className="form-group">
                    <label className="portal-label">Add Item to Manifest</label>
                    <select 
                      className="portal-input"
                      style={{ fontWeight: 700, height: '56px' }}
                      onChange={(e) => {
                        const item = items.find((i: UniformItem) => i.id === e.target.value);
                        if (item) {
                          setOrderItems([...orderItems, { itemId: item.id, quantity: 1, unitPrice: item.orderPrice }]);
                        }
                        e.target.value = "";
                      }}
                    >
                       <option value="">-- Select Catalog Item --</option>
                       {(Array.isArray(items) ? items : []).map((i: UniformItem) => <option key={i.id} value={i.id}>{i.name}</option>)}
                    </select>
                 </div>
              </div>
              
              {(Array.isArray(orderItems) ? orderItems : []).length > 0 ? (
                <div style={{ border: '1px solid #f1f5f9', borderRadius: '16px', overflow: 'hidden' }}>
                   <table className="management-table" style={{ margin: 0 }}>
                      <thead style={{ background: '#f8fafc' }}>
                         <tr>
                            <th style={{ paddingLeft: '24px' }}>Manifest Item</th>
                            <th style={{ textAlign: 'center' }}>Quantity</th>
                            <th style={{ textAlign: 'center' }}>Unit Price</th>
                            <th style={{ textAlign: 'right', paddingRight: '24px' }}>Sub-Total</th>
                         </tr>
                      </thead>
                      <tbody>
                         {(Array.isArray(orderItems) ? orderItems : []).map((oi, idx) => (
                           <tr key={idx}>
                              <td style={{ paddingLeft: '24px' }}>
                                <div style={{ fontWeight: 800 }}>{items.find((i: UniformItem) => i.id === oi.itemId)?.name}</div>
                              </td>
                              <td style={{ textAlign: 'center' }}>
                                <input 
                                  type="number" 
                                  value={oi.quantity} 
                                  onChange={e => {
                                    const newItems = [...orderItems];
                                    newItems[idx].quantity = parseInt(e.target.value) || 0;
                                    setOrderItems(newItems);
                                  }}
                                  className="portal-input"
                                  style={{ width: '80px', height: '40px', textAlign: 'center', fontWeight: 800 }} 
                                />
                              </td>
                              <td style={{ textAlign: 'center', fontWeight: 700, color: '#64748b' }}>${oi.unitPrice.toFixed(2)}</td>
                              <td style={{ textAlign: 'right', paddingRight: '24px', fontWeight: 900, color: '#2563eb' }}>${(oi.quantity * oi.unitPrice).toFixed(2)}</td>
                           </tr>
                         ))}
                      </tbody>
                      <tfoot style={{ background: '#f8fafc' }}>
                         <tr>
                            <td colSpan={3} style={{ textAlign: 'right', padding: '20px', fontWeight: 800, color: '#64748b' }}>MANIFEST TOTAL SETTLEMENT:</td>
                            <td style={{ textAlign: 'right', padding: '20px 24px', fontWeight: 900, fontSize: '1.2rem', color: '#1e293b' }}>
                               ${orderItems.reduce((acc, curr) => acc + (curr.quantity * curr.unitPrice), 0).toFixed(2)}
                            </td>
                         </tr>
                      </tfoot>
                   </table>
                </div>
              ) : (
                <div style={{ padding: '60px', textAlign: 'center', background: '#f8fafc', borderRadius: '16px', border: '2px dashed #e2e8f0' }}>
                   <i className="fas fa-clipboard-list" style={{ fontSize: '3rem', color: '#cbd5e1', marginBottom: '16px', display: 'block' }}></i>
                   <p style={{ margin: 0, fontWeight: 700, color: '#94a3b8' }}>Manifest is currently empty. Select items to authorize procurement.</p>
                </div>
              )}
            </div>
            <div className="portal-modal-footer" style={{ padding: '32px 40px', background: '#f8fafc', borderTop: '1px solid #f1f5f9' }}>
               <button onClick={() => setShowModal(false)} className="portal-btn-ghost" style={{ padding: '14px 32px', fontWeight: 800 }}>Abort Manifest</button>
               <button 
                onClick={handleSaveOrder}
                disabled={orderItems.length === 0}
                className="portal-btn-primary"
                style={{ padding: '14px 40px', fontWeight: 900, background: '#059669' }}
               >
                <i className="fas fa-check-circle mr-2"></i>Authorize Procurement
               </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const SalesTab = ({ items, sales, onUpdate, canManage, showModal, setShowModal }: any) => {
  const [studentId, setStudentId] = useState('');
  const [selectedItems, setSelectedItems] = useState<{ itemId: string, quantity: number, unitPrice: number }[]>([]);
  const { showToast } = useToast();

  const handleSaveSale = async () => {
    if (!canManage || selectedItems.length === 0) return;
    try {
      await api.post("/api/uniforms/sales", {
        studentId: studentId || null,
        saleDate: new Date().toISOString(),
        items: selectedItems,
        paymentMode: 'CASH'
      });
      showToast("Distribution record secured and archived", "success");
      setStudentId('');
      setSelectedItems([]);
      setShowModal(false);
      onUpdate();
    } catch (error: any) {
      showToast(error.response?.data?.error || "Failed to secure distribution record", "error");
    
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
      <div className="management-table-card">
         <div className="portal-card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '32px', borderBottom: '1px solid #f1f5f9' }}>
            <div>
               <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 900, color: '#1e293b' }}>Institutional Distribution Ledger</h3>
               <p style={{ margin: '4px 0 0 0', color: '#64748b', fontWeight: 700, fontSize: '0.9rem' }}>Comprehensive audit of uniform sales and distributions.</p>
            </div>
            <span className="status-badge" style={{ background: '#fff7ed', fontWeight: 900, color: '#c2410c', padding: '8px 16px', border: '1px solid #ffedd5' }}>
              {(Array.isArray(sales) ? sales : []).length} COMPLETED TRANSACTIONS
            </span>
         </div>
         <div className="table-responsive">
          <table className="management-table">
            <thead>
              <tr>
                <th style={{ paddingLeft: '32px' }}>Temporal Log</th>
                <th>Beneficiary Entity</th>
                <th>Transaction Volume</th>
                <th style={{ textAlign: 'right', paddingRight: '32px' }}>Settlement Total</th>
              </tr>
            </thead>
            <tbody>
              {(Array.isArray(sales) ? sales : []).length === 0 ? (
                <tr><td colSpan={4} style={{ textAlign: 'center', padding: '80px', color: '#94a3b8' }}>
                  <i className="fas fa-shopping-cart" style={{ fontSize: '3.5rem', display: 'block', marginBottom: '24px', opacity: 0.1 }}></i>
                  <p style={{ fontWeight: 700 }}>No distribution records identified</p>
                </td></tr>
              ) : (Array.isArray(sales) ? sales : []).map(sale => (
                <tr key={sale.id}>
                  <td style={{ paddingLeft: '32px' }}>
                    <div style={{ fontWeight: 800, color: '#1e293b' }}>{format(new Date(sale.saleDate), 'dd MMM yyyy')}</div>
                    <div style={{ fontSize: '0.7rem', color: '#94a3b8', fontWeight: 600 }}>ID: {sale.id.slice(0, 8).toUpperCase()}</div>
                  </td>
                  <td style={{ fontWeight: 800 }}>{sale.student?.name || 'Walk-in Beneficiary'}</td>
                  <td style={{ fontWeight: 700, color: '#64748b' }}>Processed Order</td>
                  <td style={{ textAlign: 'right', paddingRight: '32px', fontWeight: 900, color: '#2563eb' }}>${sale.totalAmount.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
         </div>
      </div>

      {showModal && (
        <div className="portal-modal-overlay">
          <div className="portal-modal-card animate-in zoom-in duration-200" style={{ maxWidth: '800px', padding: 0 }}>
            <div className="portal-modal-header" style={{ padding: '32px 40px', borderBottom: '1px solid #f1f5f9' }}>
               <div>
                  <h3 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 900 }}>Secure Distribution Entry</h3>
                  <p style={{ margin: '4px 0 0 0', color: '#64748b', fontWeight: 700, fontSize: '0.9rem' }}>Log and authorize the distribution of apparel articles.</p>
               </div>
               <button onClick={() => setShowModal(false)} className="portal-btn-ghost" style={{ padding: '12px' }}><i className="fas fa-times"></i></button>
            </div>
            <div className="portal-modal-body" style={{ padding: '40px' }}>
               <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginBottom: '32px' }}>
                  <div className="form-group">
                    <label className="portal-label">Entity Beneficiary (Optional)</label>
                    <input 
                        type="text" 
                        placeholder="Search student identifier..." 
                        value={studentId}
                        onChange={e => setStudentId(e.target.value)}
                        className="portal-input" 
                        style={{ fontWeight: 700, height: '56px' }}
                    />
                  </div>
                  <div className="form-group">
                    <label className="portal-label">Add Distribution Item</label>
                    <select 
                        className="portal-input"
                        style={{ fontWeight: 700, height: '56px' }}
                        onChange={(e) => {
                          const item = items.find((i: UniformItem) => i.id === e.target.value);
                          if (item) {
                              setSelectedItems([...selectedItems, { itemId: item.id, quantity: 1, unitPrice: item.sellingPrice }]);
                          }
                          e.target.value = "";
                        }}
                    >
                        <option value="">-- Select Distribution Item --</option>
                        {(Array.isArray(items) ? items : []).map((i: UniformItem) => <option key={i.id} value={i.id}>{i.name} (${i.sellingPrice})</option>)}
                    </select>
                  </div>
               </div>

               {(Array.isArray(selectedItems) ? selectedItems : []).length > 0 ? (
                <div style={{ border: '1px solid #f1f5f9', borderRadius: '16px', overflow: 'hidden' }}>
                    <table className="management-table" style={{ margin: 0 }}>
                      <thead style={{ background: '#f8fafc' }}>
                          <tr>
                            <th style={{ paddingLeft: '24px' }}>Inventory Item</th>
                            <th style={{ textAlign: 'center' }}>Units</th>
                            <th style={{ textAlign: 'right', paddingRight: '24px' }}>Distribution Total</th>
                          </tr>
                      </thead>
                      <tbody>
                          {(Array.isArray(selectedItems) ? selectedItems : []).map((si, idx) => (
                            <tr key={idx}>
                                <td style={{ paddingLeft: '24px', fontWeight: 800 }}>{items.find((i: UniformItem) => i.id === si.itemId)?.name}</td>
                                <td style={{ textAlign: 'center' }}>
                                    <input 
                                      type="number" 
                                      value={si.quantity}
                                      onChange={e => {
                                        const newItems = [...selectedItems];
                                        newItems[idx].quantity = parseInt(e.target.value) || 0;
                                        setSelectedItems(newItems);
                                      }}
                                      className="portal-input"
                                      style={{ width: '80px', height: '40px', textAlign: 'center', fontWeight: 800 }}
                                    />
                                </td>
                                <td style={{ textAlign: 'right', paddingRight: '24px', fontWeight: 900, color: '#2563eb' }}>${(si.quantity * si.unitPrice).toFixed(2)}</td>
                            </tr>
                          ))}
                      </tbody>
                      <tfoot style={{ background: '#f8fafc' }}>
                         <tr>
                            <td colSpan={2} style={{ textAlign: 'right', padding: '20px', fontWeight: 800, color: '#64748b' }}>TRANSACTION TOTAL:</td>
                            <td style={{ textAlign: 'right', padding: '20px 24px', fontWeight: 900, fontSize: '1.2rem', color: '#1e293b' }}>
                               ${selectedItems.reduce((acc, curr) => acc + (curr.quantity * curr.unitPrice), 0).toFixed(2)}
                            </td>
                         </tr>
                      </tfoot>
                    </table>
                </div>
               ) : (
                <div style={{ padding: '60px', textAlign: 'center', background: '#f8fafc', borderRadius: '16px', border: '2px dashed #e2e8f0' }}>
                   <i className="fas fa-cart-plus" style={{ fontSize: '3rem', color: '#cbd5e1', marginBottom: '16px', display: 'block' }}></i>
                   <p style={{ margin: 0, fontWeight: 700, color: '#94a3b8' }}>Cart is currently empty. Add items to authorize distribution.</p>
                </div>
               )}
            </div>
            <div className="portal-modal-footer" style={{ padding: '32px 40px', background: '#f8fafc', borderTop: '1px solid #f1f5f9' }}>
               <button onClick={() => setShowModal(false)} className="portal-btn-ghost" style={{ padding: '14px 32px', fontWeight: 800 }}>Abort Transaction</button>
               <button 
                onClick={handleSaveSale}
                disabled={selectedItems.length === 0}
                className="portal-btn-primary"
                style={{ padding: '14px 40px', fontWeight: 900, background: '#f59e0b' }}
               >
                <i className="fas fa-check-circle mr-2"></i>Authorize Distribution
               </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export const SuppliersTab = ({ suppliers, onUpdate, canManage }: { suppliers: any[], onUpdate: () => void, canManage: boolean }) => {
   const [formData, setFormData] = useState({ companyName: '', contactName: '', phone: '' });
   const [selectedSupplierForDetail, setSelectedSupplierForDetail] = useState<any>(null);
   const [isDetailOpen, setIsDetailOpen] = useState(false);
   const { showToast } = useToast();

   const handleSave = async () => {
      if (!canManage) return;
      try {
         await api.post("/api/uniforms/suppliers", formData);
         showToast("Vendor credentials cataloged and archived", "success");
         setFormData({ companyName: '', contactName: '', phone: '' });
         onUpdate();
      } catch (error) {
         showToast("Failed to catalog institutional vendor", "error");
      
    }
   };

   const openProfileDetail = (supp: any) => {
      const normalized = {
         ...supp,
         name: supp.contactName || supp.name,
         email: supp.email,
         phone: supp.phone,
         metadata: {
            ...(supp.user?.metadata || {}),
            companyName: supp.companyName,
            regNo: supp.regNo || supp.user?.metadata?.regNo,
            incorpYear: supp.incorpYear || supp.user?.metadata?.incorpYear,
            category: supp.category || supp.user?.metadata?.category,
            specialization: supp.specialization || supp.user?.metadata?.specialization,
            address: supp.address || supp.user?.metadata?.address,
            taxNumber: supp.taxClearance || supp.user?.metadata?.taxNumber,
            prazNo: supp.prazCert || supp.user?.metadata?.prazNo || supp.user?.metadata?.prazReg
         }
      };
      setSelectedSupplierForDetail(normalized);
      setIsDetailOpen(true);
   };

   return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
         {canManage && (
            <div className="portal-card">
               <div className="portal-card-header" style={{ marginBottom: '32px' }}>
                  <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800 }}><i className="fas fa-truck mr-3" style={{ color: '#2563eb' }}></i>Vendor Registry</h3>
               </div>
               <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '24px', alignItems: 'flex-end' }}>
                  <div className="form-group">
                    <label className="portal-label">Entity Name</label>
                    <input 
                        type="text" 
                        value={formData.companyName}
                        onChange={e => setFormData({ ...formData, companyName: e.target.value })}
                        className="portal-input" 
                        style={{ fontWeight: 700 }}
                        placeholder="e.g. Apex Textiles Ltd"
                    />
                  </div>
                  <div className="form-group">
                    <label className="portal-label">Liaison Name</label>
                    <input 
                        type="text" 
                        value={formData.contactName}
                        onChange={e => setFormData({ ...formData, contactName: e.target.value })}
                        className="portal-input" 
                        style={{ fontWeight: 700 }}
                        placeholder="Primary contact"
                    />
                  </div>
                  <div className="form-group">
                    <label className="portal-label">Communication Channel</label>
                    <input 
                        type="text" 
                        value={formData.phone}
                        onChange={e => setFormData({ ...formData, phone: e.target.value })}
                        className="portal-input" 
                        style={{ fontWeight: 700 }}
                        placeholder="+263..."
                    />
                  </div>
                  <button 
                    onClick={handleSave}
                    className="portal-btn-primary"
                    style={{ fontWeight: 900, padding: '14px' }}
                  >
                    <i className="fas fa-user-plus mr-2"></i>Catalog Vendor
                  </button>
               </div>
            </div>
         )}

         <div className="management-table-card">
            <div className="table-responsive">
              <table className="management-table">
                <thead>
                    <tr>
                      <th>Vendor Entity</th>
                      <th>Liaison Agent</th>
                      <th>Direct Channel</th>
                      <th style={{ textAlign: 'right' }}>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    {(Array.isArray(suppliers) ? suppliers : []).length > 0 ? (Array.isArray(suppliers) ? suppliers : []).map((supp: any) => (
                      <tr key={supp.id}>
                          <td>
                            <div style={{ fontWeight: 800 }}>{supp.companyName}</div>
                            <div style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: 600 }}>ID: {supp.id.slice(0, 8).toUpperCase()}</div>
                          </td>
                          <td style={{ fontWeight: 700 }}>{supp.contactName || '-'}</td>
                          <td style={{ fontWeight: 800, color: '#2563eb' }}>{supp.phone || '-'}</td>
                          <td style={{ textAlign: 'right' }}>
                              <div className="action-buttons" style={{ justifyContent: 'flex-end' }}>
                                <button className="portal-btn-ghost" title="View Profile" style={{ padding: '8px', color: '#4a5568' }} onClick={() => openProfileDetail(supp)}>
                                  <i className="fas fa-eye"></i>
                                </button>
                                {canManage && (
                                  <>
                                    <button className="portal-btn-ghost" style={{ padding: '8px', color: '#2563eb' }} onClick={() => alert('This feature is currently under development or disabled.')}><i className="fas fa-pencil-alt"></i></button>
                                    <button className="portal-btn-ghost" style={{ padding: '8px', color: '#dc2626' }} onClick={() => alert('This feature is currently under development or disabled.')}><i className="fas fa-trash"></i></button>
                                  </>
                                )}
                              </div>
                          </td>
                      </tr>
                    )) : (
                      <tr><td colSpan={canManage ? 4 : 3} style={{ textAlign: 'center', padding: '80px', color: '#94a3b8' }}>
                        <i className="fas fa-address-book" style={{ fontSize: '3.5rem', display: 'block', marginBottom: '24px', opacity: 0.1 }}></i>
                        <p style={{ fontWeight: 700 }}>Vendor registry is empty</p>
                      </td></tr>
                    )}
                </tbody>
              </table>
            </div>
         </div>

         {selectedSupplierForDetail && (
            <ManagementDetailPanel
               isOpen={isDetailOpen}
               onClose={() => setIsDetailOpen(false)}
               title={selectedSupplierForDetail.metadata?.companyName || selectedSupplierForDetail.name}
               subTitle={`Local ID: ${selectedSupplierForDetail.id.slice(0, 8).toUpperCase()} | Global: ${selectedSupplierForDetail.globalId || 'N/A'}`}
               role="Supplier"
               avatarText={(selectedSupplierForDetail.metadata?.companyName || selectedSupplierForDetail.name).charAt(0)}
               sections={[
                 {
                   title: "Business Profile",
                   fields: [
                     { label: "Company Name", value: selectedSupplierForDetail.metadata?.companyName || selectedSupplierForDetail.name },
                     { label: "Location Type", value: selectedSupplierForDetail.metadata?.location || 'Local' },
                     { label: "Organization Type", value: selectedSupplierForDetail.metadata?.orgType || 'N/A' },
                     { label: "Company Owned By", value: selectedSupplierForDetail.metadata?.businessOwnedBy || 'General / Other' },
                     { label: "Registered with PRAZ?", value: selectedSupplierForDetail.metadata?.prazRegistered || 'N/A' },
                     { label: "PRAZ Registration No", value: selectedSupplierForDetail.metadata?.prazNo || selectedSupplierForDetail.metadata?.prazReg || 'N/A' },
                     { label: "BP / Registration No", value: selectedSupplierForDetail.metadata?.regNo || 'N/A' },
                     { label: "Year of Incorporation", value: selectedSupplierForDetail.metadata?.incorpYear || 'N/A' },
                     { 
                       label: "Business Categories", 
                       value: selectedSupplierForDetail.metadata?.selectedCategories && selectedSupplierForDetail.metadata.selectedCategories.length > 0
                         ? selectedSupplierForDetail.metadata.selectedCategories.map((c: any) => `${c.code}: ${c.name} (${c.section})`).join(', ')
                         : selectedSupplierForDetail.metadata?.category || 'N/A' 
                     },
                     { label: "Specialization", value: selectedSupplierForDetail.metadata?.specialization || 'N/A' },
                     { label: "Tax BP Number", value: selectedSupplierForDetail.metadata?.taxNumber || 'N/A' },
                     { label: "Tax Clearance Expiry", value: selectedSupplierForDetail.metadata?.taxExpiry || 'N/A' },
                     { label: "PRAZ Expiry", value: selectedSupplierForDetail.metadata?.prazExpiry || 'N/A' },
                     { label: "NSSA Expiry", value: selectedSupplierForDetail.metadata?.nssaExpiry || 'N/A' }
                   ]
                 },
                 {
                   title: "Contact & Representative",
                   fields: [
                     { 
                       label: "Contact Person", 
                       value: selectedSupplierForDetail.metadata?.contactFirstName 
                         ? `${selectedSupplierForDetail.metadata?.contactTitle || 'Mr'} ${selectedSupplierForDetail.metadata?.contactFirstName} ${selectedSupplierForDetail.metadata?.contactMiddleName || ''} ${selectedSupplierForDetail.metadata?.contactLastName}`
                         : selectedSupplierForDetail.name 
                     },
                     { label: "Gender", value: selectedSupplierForDetail.metadata?.contactGender || 'N/A' },
                     { label: "Designation/Position", value: selectedSupplierForDetail.metadata?.contactPosition || selectedSupplierForDetail.metadata?.designation || 'N/A' },
                     { label: "Email Address", value: selectedSupplierForDetail.metadata?.contactEmail || selectedSupplierForDetail.email },
                     { label: "Mobile Number", value: selectedSupplierForDetail.metadata?.mobileNumber || selectedSupplierForDetail.phone || 'N/A' }
                   ]
                 },
                 {
                   title: "Address & Logistics",
                   fields: [
                     { label: "Country", value: selectedSupplierForDetail.metadata?.country || 'Zimbabwe' },
                     { label: "Province", value: selectedSupplierForDetail.metadata?.province || 'N/A' },
                     { label: "City/Town/Village", value: selectedSupplierForDetail.metadata?.city || 'N/A' },
                     { label: "Street Address", value: selectedSupplierForDetail.metadata?.address || 'N/A' },
                     { 
                       label: "Landline Number", 
                       value: selectedSupplierForDetail.metadata?.landlineNumber 
                         ? `+263 (${selectedSupplierForDetail.metadata?.landlineAreaCode || ''}) ${selectedSupplierForDetail.metadata?.landlineNumber} ${selectedSupplierForDetail.metadata?.landlineExtension ? 'Ext ' + selectedSupplierForDetail.metadata?.landlineExtension : ''}`
                         : 'N/A' 
                     },
                     { 
                       label: "Fax Number", 
                       value: selectedSupplierForDetail.metadata?.faxNumber 
                         ? `(${selectedSupplierForDetail.metadata?.faxAreaCode || ''}) ${selectedSupplierForDetail.metadata?.faxNumber} ${selectedSupplierForDetail.metadata?.faxExtension ? 'Ext ' + selectedSupplierForDetail.metadata?.faxExtension : ''}`
                         : 'N/A' 
                     }
                   ]
                 },
                 {
                   title: "Bank Details",
                   fields: (selectedSupplierForDetail.metadata?.bankAccounts && selectedSupplierForDetail.metadata.bankAccounts.length > 0)
                     ? selectedSupplierForDetail.metadata.bankAccounts.map((acc: any, index: number) => ({
                         label: `${acc.accountType || 'Bank'} Account #${index + 1}`,
                         value: `${acc.bankName} (Branch: ${acc.bankBranch}, Code: ${acc.branchCode}) \nName: ${acc.accountName} \nNo: ${acc.accountNumber}`
                       }))
                     : [{ label: "Bank Accounts", value: "No bank accounts added" }]
                 },
                 {
                   title: "Category Payment Details",
                   fields: selectedSupplierForDetail.metadata?.categoryPayment
                     ? [
                         { label: "Currency Type", value: selectedSupplierForDetail.metadata.categoryPayment.currency || 'N/A' },
                         { label: "Total Amount Paid/Due", value: `${selectedSupplierForDetail.metadata.categoryPayment.currency || 'USD'} ${(selectedSupplierForDetail.metadata.categoryPayment.amount || 0).toFixed(2)}` },
                         { label: "Disclaimer Confirmed", value: selectedSupplierForDetail.metadata.categoryPayment.disclaimerAccepted ? "Yes" : "No" }
                       ]
                     : [{ label: "Payment Status", value: "No payment details recorded" }]
                 },
                 {
                   title: "Compliance Attachments",
                   fields: selectedSupplierForDetail.metadata?.orgType === 'Individual Consultant'
                     ? [
                         { label: "Membership Documents", value: selectedSupplierForDetail.metadata?.docs?.membershipDocs, type: selectedSupplierForDetail.metadata?.docs?.membershipDocs ? 'image' : 'text' },
                         { label: "Profile", value: selectedSupplierForDetail.metadata?.docs?.profile, type: selectedSupplierForDetail.metadata?.docs?.profile ? 'image' : 'text' },
                         { label: "CV", value: selectedSupplierForDetail.metadata?.docs?.cv, type: selectedSupplierForDetail.metadata?.docs?.cv ? 'image' : 'text' }
                       ]
                     : [
                         { label: "Supporting Document", value: selectedSupplierForDetail.metadata?.docs?.supportingDoc, type: selectedSupplierForDetail.metadata?.docs?.supportingDoc ? 'image' : 'text' },
                         { label: "Tax Clearance (ITF263)", value: selectedSupplierForDetail.metadata?.docs?.taxClearance, type: selectedSupplierForDetail.metadata?.docs?.taxClearance ? 'image' : 'text' },
                         { label: "Certificate of Incorporation", value: selectedSupplierForDetail.metadata?.docs?.certIncorp, type: selectedSupplierForDetail.metadata?.docs?.certIncorp ? 'image' : 'text' },
                         { label: "PRAZ Certificate", value: selectedSupplierForDetail.metadata?.docs?.prazCert, type: selectedSupplierForDetail.metadata?.docs?.prazCert ? 'image' : 'text' },
                         { label: "NSSA Clearance Doc", value: selectedSupplierForDetail.metadata?.docs?.nssaClearance, type: selectedSupplierForDetail.metadata?.docs?.nssaClearance ? 'image' : 'text' },
                         { label: "Other Vendor Doc", value: selectedSupplierForDetail.metadata?.docs?.vendorRegFile, type: selectedSupplierForDetail.metadata?.docs?.vendorRegFile ? 'image' : 'text' }
                       ]
                 }
               ]}
            />
         )}
      </div>
   );
};

const PaymentsTab = ({ suppliers, canManage }: { suppliers: Supplier[], canManage: boolean }) => {
   return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
         <div className="portal-card">
            <div className="portal-card-header" style={{ marginBottom: '16px' }}>
               <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800 }}><i className="fas fa-wallet mr-3" style={{ color: '#059669' }}></i>Financial Settlements</h3>
            </div>
            <p style={{ color: '#64748b', fontSize: '1rem', fontWeight: 600, margin: 0 }}>Monitor vendor procurement balances and settle outstanding financial obligations.</p>
         </div>

         <div className="management-table-card">
            <div className="table-responsive">
              <table className="management-table">
                <thead>
                    <tr>
                      <th>Vendor Entity</th>
                      <th>Gross Liabilities</th>
                      <th>Settled Amounts</th>
                      <th>Outstanding Balance</th>
                      {canManage && <th style={{ textAlign: 'right' }}>Settle Liability</th>}
                    </tr>
                </thead>
                <tbody>
                    {(Array.isArray(suppliers) ? suppliers : []).length > 0 ? (Array.isArray(suppliers) ? suppliers : []).map((supp: Supplier) => (
                      <tr key={supp.id}>
                          <td style={{ fontWeight: 800 }}>{supp.companyName}</td>
                          <td style={{ fontWeight: 900, color: '#1e293b' }}>$10,613.00</td>
                          <td style={{ fontWeight: 900, color: '#059669' }}>$3,754.00</td>
                          <td style={{ fontWeight: 900, color: '#dc2626' }}>$6,859.00</td>
                          {canManage && (
                            <td style={{ textAlign: 'right' }}>
                                <div className="action-buttons" style={{ justifyContent: 'flex-end' }}>
                                  <button className="portal-btn-primary" title="Initiate Settlement" style={{ background: '#dcfce7', color: '#059669', border: '1px solid #bbf7d0', padding: '8px 16px', borderRadius: '10px' }} onClick={() => alert('This feature is currently under development or disabled.')}>
                                    <i className="fas fa-plus mr-2"></i>Settle
                                  </button>
                                  <button className="portal-btn-ghost" title="View Audit Trail" style={{ color: '#2563eb' }} onClick={() => alert('This feature is currently under development or disabled.')}><i className="fas fa-history"></i></button>
                                </div>
                            </td>
                          )}
                      </tr>
                    )) : (
                      <tr><td colSpan={5} style={{ textAlign: 'center', padding: '80px', color: '#94a3b8' }}>
                        <i className="fas fa-money-check-alt" style={{ fontSize: '3.5rem', display: 'block', marginBottom: '24px', opacity: 0.1 }}></i>
                        <p style={{ fontWeight: 700 }}>No active vendor liabilities detected</p>
                      </td></tr>
                    )}
                </tbody>
              </table>
            </div>
         </div>
      </div>
   );
};

export default UniformsPage;
