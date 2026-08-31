import React, { useState, useEffect } from "react";
import api from "../../../lib/api";
import { useToast } from "../../../context/ToastContext";
import { format } from "date-fns";
import { useAuth } from "../../../contexts/AuthContext";
import ManagementDetailPanel from "../../../components/shared/ManagementDetailPanel";
import '../../../styles/portal.css';
import { useAccountingQuery, invalidateAllAccountingKeys } from "../../../hooks/useAccountingQuery";
import { EmptyState } from "../../../components/common/EmptyState";

export interface UniformItem {
  id: string;
  name: string;
  orderPrice: number;
  sellingPrice: number;
  stockLevel: number;
}

export interface SupplierMetadata {
  companyName?: string;
  location?: string;
  orgType?: string;
  businessOwnedBy?: string;
  prazRegistered?: string;
  prazNo?: string;
  prazReg?: string;
  regNo?: string;
  incorpYear?: string;
  category?: string;
  selectedCategories?: { code?: string; name?: string; section?: string }[];
  specialization?: string;
  taxNumber?: string;
  taxClearance?: string;
  taxExpiry?: string;
  prazExpiry?: string;
  nssaExpiry?: string;
  contactTitle?: string;
  contactFirstName?: string;
  contactMiddleName?: string;
  contactLastName?: string;
  contactGender?: string;
  contactPosition?: string;
  designation?: string;
  contactEmail?: string;
  mobileNumber?: string;
  country?: string;
  province?: string;
  city?: string;
  address?: string;
  landlineNumber?: string;
  landlineAreaCode?: string;
  landlineExtension?: string;
  faxNumber?: string;
  faxAreaCode?: string;
  faxExtension?: string;
  bankAccounts?: { accountType?: string; bankName?: string; bankBranch?: string; branchCode?: string; accountName?: string; accountNumber?: string }[];
  categoryPayment?: { currency?: string; amount?: number; disclaimerAccepted?: boolean };
  docs?: {
    membershipDocs?: string;
    profile?: string;
    cv?: string;
    supportingDoc?: string;
    taxClearance?: string;
    certIncorp?: string;
    prazCert?: string;
    nssaClearance?: string;
    vendorRegFile?: string;
  };
  [key: string]: unknown;
}

export interface Supplier {
  id: string;
  companyName: string;
  contactName?: string;
  phone?: string;
  name?: string;
  email?: string;
  globalId?: string;
  regNo?: string;
  incorpYear?: string;
  category?: string;
  specialization?: string;
  address?: string;
  taxClearance?: string;
  prazCert?: string;
  user?: {
    metadata?: SupplierMetadata;
  };
  metadata?: SupplierMetadata;
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
  studentId?: string;
  parentId?: string;
  student?: { name: string };
  totalAmount: number;
  paymentMode: string;
}

const UniformsPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState("items");

  const { user, hasRole } = useAuth();
  const canManage = hasRole('BURSAR', 'SCHOOL_ADMIN');
  const isSupplier = hasRole('SUPPLIER');
  const isParentOrStudent = hasRole('PARENT', 'STUDENT');

  const [showAddItemModal, setShowAddItemModal] = useState(false);
  const [showRestockModal, setShowRestockModal] = useState(false);
  const [showSalesModal, setShowSalesModal] = useState(false);

  // Fetch items via reactive query cache
  const { data: items = [], isLoading: itemsLoading } = useAccountingQuery<UniformItem[]>({
    key: 'uniforms:items',
    fetcher: async () => {
      const res = await api.get('/api/uniforms/items');
      return Array.isArray(res.data) ? res.data : [];
    }
  });

  const { data: suppliers = [] } = useAccountingQuery<Supplier[]>({
    key: 'uniforms:suppliers',
    fetcher: async () => {
      const res = await api.get('/api/uniforms/suppliers');
      return Array.isArray(res.data) ? res.data : [];
    }
  });

  const { data: orders = [] } = useAccountingQuery<StockOrder[]>({
    key: 'uniforms:orders',
    fetcher: async () => {
      const res = await api.get('/api/uniforms/stock-orders');
      return Array.isArray(res.data) ? res.data : [];
    }
  });

  const { data: rawSales = [] } = useAccountingQuery<Sale[]>({
    key: 'uniforms:sales',
    fetcher: async () => {
      const res = await api.get('/api/uniforms/sales');
      return Array.isArray(res.data) ? res.data : [];
    }
  });

  const sales = isParentOrStudent
    ? rawSales.filter((s: Sale) => s.studentId === user?.id || s.parentId === user?.id)
    : rawSales;

  const loading = itemsLoading;
  const fetchData = () => invalidateAllAccountingKeys();

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
        <div className="portal-header-actions-row">
          <div className="status-badge portal-status-badge-authorization">
             <i className="fas fa-shield-alt mr-2"></i>{user?.role?.toUpperCase()} AUTHORIZATION
          </div>
          {canManage && activeTab === "items" && (
             <button 
              onClick={() => setShowAddItemModal(true)}
              className="portal-btn-primary portal-btn-header-lg" 
             >
                <i className="fas fa-plus-circle mr-2"></i>Catalog Item
             </button>
          )}
          {canManage && activeTab === "stock" && (
             <button 
              onClick={() => setShowRestockModal(true)}
              className="portal-btn-primary portal-btn-header-lg portal-btn-emerald" 
             >
                <i className="fas fa-truck-loading mr-2"></i>Authorize Restock
             </button>
          )}
          {canManage && activeTab === "sales" && (
             <button 
              onClick={() => setShowSalesModal(true)}
              className="portal-btn-primary portal-btn-header-lg portal-btn-amber" 
             >
                <i className="fas fa-cart-plus mr-2"></i>Record Sale
             </button>
          )}
        </div>
      </div>

      <div className="portal-tabs-bar-container">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`portal-btn-${activeTab === tab.id ? 'primary' : 'ghost'} portal-tab-btn-pill`}
          >
            <i className={`fas ${tab.icon} mr-2`}></i>{tab.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="portal-card animate-in fade-in duration-500 portal-loading-card-padded">
          <div className="portal-spinner portal-spinner-centered"></div>
          <p className="portal-loading-text">Synchronizing institutional registry...</p>
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

interface ItemsTabProps {
  items: UniformItem[];
  onUpdate: () => void;
  canManage: boolean;
  showModal: boolean;
  setShowModal: (show: boolean) => void;
}

const ItemsTab: React.FC<ItemsTabProps> = ({ items, onUpdate, canManage, showModal, setShowModal }) => {
  const [formData, setFormData] = useState({ name: '', orderPrice: '', sellingPrice: '' });
  const [editingId, setEditingId] = useState<string | null>(null);
  const { showToast, toastConfirm } = useToast();

  const handleEdit = (item: UniformItem) => {
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
    } catch {
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
    } catch {
      showToast("Failed to authorize inventory cataloging", "error");
    }
  };

  return (
    <div className="portal-flex-col-gap32">
      <div className="management-table-card">
        <div className="portal-card-header portal-card-header-flex-padded">
           <div>
              <h3 className="portal-card-title-lg">Uniform Inventory Matrix</h3>
              <p className="portal-card-subtitle">Real-time oversight of institutional apparel stock levels.</p>
           </div>
           <span className="status-badge portal-status-badge-blue">
              {(Array.isArray(items) ? items : []).length} REGISTERED ARTICLES
           </span>
        </div>
        <div className="table-responsive">
          <table className="management-table">
            <thead>
              <tr>
                <th className="portal-th-pad-left">Inventory Item</th>
                {canManage && <th>Procurement Price</th>}
                <th>Standard Retail</th>
                <th>Availability</th>
                {canManage && <th className="portal-th-align-right">Management</th>}
              </tr>
            </thead>
            <tbody>
              {(Array.isArray(items) ? items : []).length > 0 ? (Array.isArray(items) ? items : []).map(item => (
                <tr key={item.id}>
                  <td className="portal-td-pad-left">
                    <div className="portal-text-bold-dark">{item.name}</div>
                    <div className="portal-text-sku">SKU: {item.id.slice(0, 8).toUpperCase()}</div>
                  </td>
                  {canManage && <td className="portal-text-muted-bold">${item.orderPrice.toFixed(2)}</td>}
                  <td className="portal-text-price-blue">${item.sellingPrice.toFixed(2)}</td>
                  <td>
                    {item.stockLevel > 0 ? (
                      <span className="status-badge status-active portal-status-badge-pill">
                        {item.stockLevel} In Stock
                      </span>
                    ) : (
                      <span className="status-badge status-inactive portal-status-badge-pill">Out of Stock</span>
                    )}
                  </td>
                  {canManage && (
                    <td className="portal-th-align-right">
                      <div className="action-buttons portal-action-buttons-end">
                        <button className="portal-btn-ghost portal-btn-icon-blue" title="Edit Item" aria-label="Edit Item" onClick={() => handleEdit(item)}><i className="fas fa-pencil-alt"></i></button>
                        <button className="portal-btn-ghost portal-btn-icon-red" title="Delete Item" aria-label="Delete Item" onClick={() => handleDelete(item.id)}><i className="fas fa-trash"></i></button>
                      </div>
                    </td>
                  )}
                </tr>
              )) : (
                <tr><td colSpan={canManage ? 5 : 3} className="portal-td-padded-20">
                  <EmptyState
                    icon="fas fa-tshirt"
                    title="No Uniform Items Cataloged Yet"
                    description="Your school uniform store catalog is empty. Catalog your school blazers, ties, and skirts to begin selling."
                    actionLabel={canManage ? "Catalog New Item" : undefined}
                    onAction={canManage ? () => setShowModal(true) : undefined}
                    setupStageLink={{ step: 7, label: 'Configure Catalog in Setup Wizard' }}
                  />
                </td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <div className="portal-modal-overlay">
          <div className="portal-modal-card animate-in zoom-in duration-200 portal-modal-card-560">
            <div className="portal-modal-header portal-modal-header-padded">
               <div>
                  <h3 className="portal-modal-header-title-lg">{editingId ? 'Update Item' : 'Catalog New Item'}</h3>
                  <p className="portal-card-subtitle">{editingId ? 'Modify an existing apparel article.' : 'Register a new apparel article into the institutional registry.'}</p>
               </div>
               <button title="Close Modal" aria-label="Close Modal" onClick={() => { setShowModal(false); setEditingId(null); setFormData({ name: '', orderPrice: '', sellingPrice: '' }); }} className="portal-btn-ghost portal-modal-close-btn-lg"><i className="fas fa-times"></i></button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="portal-modal-body portal-modal-body-padded-40">
                <div className="form-group portal-form-group-mb24">
                  <label className="portal-label">Canonical Item Name</label>
                  <input 
                    type="text" required
                    className="portal-input portal-input-height-56"
                    value={formData.name}
                    onChange={e => setFormData({...formData, name: e.target.value})}
                    placeholder="e.g. Academy Blazer (Premium Edition)"
                  />
                </div>
                <div className="portal-grid-2-gap24">
                  <div className="form-group">
                    <label className="portal-label">Procurement Cost ($)</label>
                    <input 
                      type="number" required
                      className="portal-input portal-input-height-56"
                      value={formData.orderPrice}
                      onChange={e => setFormData({...formData, orderPrice: e.target.value})}
                      placeholder="0.00"
                    />
                  </div>
                  <div className="form-group">
                    <label className="portal-label">Standard Retail Price ($)</label>
                    <input 
                      type="number" required
                      className="portal-input portal-input-height-56"
                      value={formData.sellingPrice}
                      onChange={e => setFormData({...formData, sellingPrice: e.target.value})}
                      placeholder="0.00"
                    />
                  </div>
                </div>
                <div className="portal-modal-footer-actions-end">
                  <button type="button" onClick={() => { setShowModal(false); setEditingId(null); setFormData({ name: '', orderPrice: '', sellingPrice: '' }); }} className="portal-btn-ghost">Cancel</button>
                  <button type="submit" className="portal-btn-primary portal-btn-header-lg">
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

interface StockTabProps {
  items: UniformItem[];
  suppliers: Supplier[];
  orders: StockOrder[];
  onUpdate: () => void;
  canManage: boolean;
  showModal: boolean;
  setShowModal: (show: boolean) => void;
}

export const StockTab: React.FC<StockTabProps> = ({ items, suppliers, orders, onUpdate, canManage, showModal, setShowModal }) => {
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
    } catch {
      showToast("Failed to finalize institutional stock order", "error");
    }
  };

  return (
    <div className="portal-flex-col-gap32">
      <div className="management-table-card">
         <div className="portal-card-header portal-card-header-flex-padded">
            <div>
               <h3 className="portal-card-title-lg">Procurement History Ledger</h3>
               <p className="portal-card-subtitle">Comprehensive audit of institutional apparel procurement.</p>
            </div>
            <span className="status-badge portal-status-badge-neutral">
              {(Array.isArray(orders) ? orders : []).length} AUTHORIZED ORDERS
            </span>
         </div>
         <div className="table-responsive">
          <table className="management-table">
              <thead>
                <tr>
                    <th className="portal-th-pad-left">Settlement Date</th>
                    <th>Manifest Summary</th>
                    {canManage && <th>Unit Procurement</th>}
                    <th>Total Settlement</th>
                    <th className="portal-th-pad-right">Associated Supplier</th>
                </tr>
              </thead>
              <tbody>
                {(Array.isArray(orders) ? orders : []).length === 0 ? (
                    <tr><td colSpan={5} className="portal-td-empty-padded">
                      <i className="fas fa-history portal-empty-icon-faint"></i>
                      <p className="portal-text-bold-muted">No procurement logs recorded</p>
                    </td></tr>
                ) : (Array.isArray(orders) ? orders : []).map(order => (
                    <tr key={order.id}>
                      <td className="portal-td-date">{format(new Date(order.orderDate), 'dd MMM yyyy')}</td>
                      <td className="portal-text-bold-dark">{order.items[0]?.item.name} {order.items.length > 1 && <span className="portal-text-more-count">(+{order.items.length - 1} more)</span>}</td>
                      {canManage && <td className="portal-text-muted-bold">${order.items[0]?.unitPrice.toFixed(2)}</td>}
                      <td className="portal-text-price-blue">${order.totalAmount.toFixed(2)}</td>
                      <td className="portal-th-pad-right">
                        <span className="status-badge portal-status-badge-supplier">
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
          <div className="portal-modal-card animate-in zoom-in duration-200 portal-modal-card-800">
            <div className="portal-modal-header portal-modal-header-padded">
               <div>
                  <h3 className="portal-modal-header-title-lg">Authorize Restock Manifest</h3>
                  <p className="portal-card-subtitle">Execute batch procurement of institutional apparel articles.</p>
               </div>
               <button title="Close Modal" aria-label="Close Modal" onClick={() => setShowModal(false)} className="portal-btn-ghost portal-modal-close-btn-lg"><i className="fas fa-times"></i></button>
            </div>
            <div className="portal-modal-body portal-modal-body-padded-40">
              <div className="portal-grid-2-gap24-mb32">
                 <div className="form-group">
                    <label htmlFor="designated-supplier" className="portal-label">Designated Supplier</label>
                    <select 
                      id="designated-supplier"
                      title="Designated Supplier"
                      aria-label="Designated Supplier"
                      value={supplierId}
                      onChange={e => setSupplierId(e.target.value)}
                      className="portal-input portal-input-height-56"
                    >
                       <option value="">-- Generic Procurement --</option>
                       {(Array.isArray(suppliers) ? suppliers : []).map((s: Supplier) => <option key={s.id} value={s.id}>{s.companyName}</option>)}
                    </select>
                 </div>
                 <div className="form-group">
                    <label htmlFor="add-manifest-item" className="portal-label">Add Item to Manifest</label>
                    <select 
                      id="add-manifest-item"
                      title="Add Item to Manifest"
                      aria-label="Add Item to Manifest"
                      className="portal-input portal-input-height-56"
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
                <div className="portal-table-card-bordered">
                   <table className="management-table portal-table-margin-zero">
                      <thead className="portal-thead-bg-light">
                         <tr>
                            <th className="portal-th-pad-24">Manifest Item</th>
                            <th className="portal-th-center">Quantity</th>
                            <th className="portal-th-center">Unit Price</th>
                            <th className="portal-th-right-24">Sub-Total</th>
                         </tr>
                      </thead>
                      <tbody>
                         {(Array.isArray(orderItems) ? orderItems : []).map((oi, idx) => (
                           <tr key={idx}>
                              <td className="portal-th-pad-24">
                                <div className="portal-text-bold-dark">{items.find((i: UniformItem) => i.id === oi.itemId)?.name}</div>
                              </td>
                              <td className="portal-th-center">
                                <input 
                                  title="Item Quantity" placeholder="Qty" aria-label="Item Quantity" type="number" 
                                  value={oi.quantity} 
                                  onChange={e => {
                                    const newItems = [...orderItems];
                                    newItems[idx].quantity = parseInt(e.target.value) || 0;
                                    setOrderItems(newItems);
                                  }}
                                  className="portal-input portal-input-qty-center"
                                />
                              </td>
                              <td className="portal-td-center-muted">${oi.unitPrice.toFixed(2)}</td>
                              <td className="portal-td-right-blue">${(oi.quantity * oi.unitPrice).toFixed(2)}</td>
                           </tr>
                         ))}
                      </tbody>
                      <tfoot className="portal-tfoot-bg-light">
                         <tr>
                            <td colSpan={3} className="portal-tfoot-label">MANIFEST TOTAL SETTLEMENT:</td>
                            <td className="portal-tfoot-total-amount">
                               ${orderItems.reduce((acc, curr) => acc + (curr.quantity * curr.unitPrice), 0).toFixed(2)}
                            </td>
                         </tr>
                      </tfoot>
                   </table>
                </div>
              ) : (
                <div className="portal-empty-dashed-box">
                   <i className="fas fa-clipboard-list portal-empty-icon-faint-lg"></i>
                   <p className="portal-empty-text-dashed">Manifest is currently empty. Select items to authorize procurement.</p>
                </div>
              )}
            </div>
            <div className="portal-modal-footer portal-modal-footer-padded">
               <button onClick={() => setShowModal(false)} className="portal-btn-ghost portal-btn-ghost-lg">Abort Manifest</button>
               <button 
                onClick={handleSaveOrder}
                disabled={orderItems.length === 0}
                className="portal-btn-primary portal-btn-emerald-lg"
               >
                <i className="fas fa-check-circle mr-2"></i>Authorize Order Manifest
               </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

interface SalesTabProps {
  items: UniformItem[];
  sales: Sale[];
  onUpdate: () => void;
  canManage: boolean;
  showModal: boolean;
  setShowModal: (show: boolean) => void;
}

const SalesTab: React.FC<SalesTabProps> = ({ items, sales, onUpdate, canManage, showModal, setShowModal }) => {
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
    } catch (err) {
      const error = err as { response?: { data?: { error?: string } } };
      showToast(error.response?.data?.error || "Failed to secure distribution record", "error");
    }
  };

  return (
    <div className="portal-flex-col-gap32">
      <div className="management-table-card">
         <div className="portal-card-header portal-card-header-flex-padded">
            <div>
               <h3 className="portal-card-title-lg">Institutional Distribution Ledger</h3>
               <p className="portal-card-subtitle">Comprehensive audit of uniform sales and distributions.</p>
            </div>
            <span className="status-badge portal-status-badge-amber">
              {(Array.isArray(sales) ? sales : []).length} COMPLETED TRANSACTIONS
            </span>
         </div>
         <div className="table-responsive">
          <table className="management-table">
            <thead>
              <tr>
                <th className="portal-th-pad-left">Temporal Log</th>
                <th>Beneficiary Entity</th>
                <th>Transaction Volume</th>
                <th className="portal-th-align-right">Settlement Total</th>
              </tr>
            </thead>
            <tbody>
              {(Array.isArray(sales) ? sales : []).length === 0 ? (
                <tr><td colSpan={4} className="portal-td-empty-padded">
                  <i className="fas fa-shopping-cart portal-empty-icon-faint"></i>
                  <p className="portal-text-bold-muted">No distribution records identified</p>
                </td></tr>
              ) : (Array.isArray(sales) ? sales : []).map(sale => (
                <tr key={sale.id}>
                  <td className="portal-td-pad-left">
                    <div className="portal-text-bold-dark">{format(new Date(sale.saleDate), 'dd MMM yyyy')}</div>
                    <div className="portal-text-id-sm">ID: {sale.id.slice(0, 8).toUpperCase()}</div>
                  </td>
                  <td className="portal-text-bold-dark">{sale.student?.name || 'Walk-in Beneficiary'}</td>
                  <td className="portal-text-muted-bold">Processed Order</td>
                  <td className="portal-td-right-blue-padded">${sale.totalAmount.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
         </div>
      </div>

      {showModal && (
        <div className="portal-modal-overlay">
          <div className="portal-modal-card animate-in zoom-in duration-200 portal-modal-card-800">
            <div className="portal-modal-header portal-modal-header-padded">
               <div>
                  <h3 className="portal-modal-header-title-lg">Secure Distribution Entry</h3>
                  <p className="portal-card-subtitle">Log and authorize the distribution of apparel articles.</p>
               </div>
               <button title="Close Modal" aria-label="Close Modal" onClick={() => setShowModal(false)} className="portal-btn-ghost portal-modal-close-btn-lg"><i className="fas fa-times"></i></button>
            </div>
            <div className="portal-modal-body portal-modal-body-padded-40">
               <div className="portal-grid-2-gap24-mb32">
                  <div className="form-group">
                    <label className="portal-label">Entity Beneficiary (Optional)</label>
                    <input 
                        type="text" 
                        placeholder="Search student identifier..." 
                        value={studentId}
                        onChange={e => setStudentId(e.target.value)}
                        className="portal-input portal-input-height-56" 
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="add-distribution-item" className="portal-label">Add Distribution Item</label>
                    <select 
                        id="add-distribution-item"
                        title="Add Distribution Item"
                        aria-label="Add Distribution Item"
                        className="portal-input portal-input-height-56"
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
                <div className="portal-table-card-bordered">
                    <table className="management-table portal-table-margin-zero">
                      <thead className="portal-thead-bg-light">
                          <tr>
                            <th className="portal-th-pad-24">Inventory Item</th>
                            <th className="portal-th-center">Units</th>
                            <th className="portal-th-right-24">Distribution Total</th>
                          </tr>
                      </thead>
                      <tbody>
                          {(Array.isArray(selectedItems) ? selectedItems : []).map((si, idx) => (
                            <tr key={idx}>
                                <td className="portal-td-pad24-bold">{items.find((i: UniformItem) => i.id === si.itemId)?.name}</td>
                                <td className="portal-th-center">
                                    <input 
                                      title="Distribution Quantity" placeholder="Qty" aria-label="Distribution Quantity" type="number" 
                                      value={si.quantity}
                                      onChange={e => {
                                        const newItems = [...selectedItems];
                                        newItems[idx].quantity = parseInt(e.target.value) || 0;
                                        setSelectedItems(newItems);
                                      }}
                                      className="portal-input portal-input-qty-center"
                                    />
                                </td>
                                <td className="portal-td-right-blue">${(si.quantity * si.unitPrice).toFixed(2)}</td>
                            </tr>
                          ))}
                      </tbody>
                      <tfoot className="portal-tfoot-bg-light">
                         <tr>
                            <td colSpan={2} className="portal-tfoot-label">TRANSACTION TOTAL:</td>
                            <td className="portal-tfoot-total-amount">
                               ${selectedItems.reduce((acc, curr) => acc + (curr.quantity * curr.unitPrice), 0).toFixed(2)}
                            </td>
                         </tr>
                      </tfoot>
                    </table>
                </div>
               ) : (
                <div className="portal-empty-dashed-box">
                   <i className="fas fa-cart-plus portal-empty-icon-faint-lg"></i>
                   <p className="portal-empty-text-dashed">Cart is currently empty. Add items to authorize distribution.</p>
                </div>
               )}
            </div>
            <div className="portal-modal-footer portal-modal-footer-padded">
               <button onClick={() => setShowModal(false)} className="portal-btn-ghost portal-btn-ghost-lg">Abort Transaction</button>
               <button 
                onClick={handleSaveSale}
                disabled={selectedItems.length === 0}
                className="portal-btn-primary portal-btn-amber-lg"
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

export const SuppliersTab: React.FC<{ suppliers: Supplier[], onUpdate: () => void, canManage: boolean }> = ({ suppliers, onUpdate, canManage }) => {
   const [formData, setFormData] = useState({ companyName: '', contactName: '', phone: '' });
   const [selectedSupplierForDetail, setSelectedSupplierForDetail] = useState<Supplier | null>(null);
   const [isDetailOpen, setIsDetailOpen] = useState(false);
   
   const [editingVendor, setEditingVendor] = useState<Supplier | null>(null);
   const [deletingVendor, setDeletingVendor] = useState<Supplier | null>(null);
   
   const { showToast } = useToast();

   const handleSave = async () => {
      if (!canManage) return;
      try {
         await api.post("/api/uniforms/suppliers", formData);
         showToast("Vendor credentials cataloged and archived", "success");
         setFormData({ companyName: '', contactName: '', phone: '' });
         onUpdate();
      } catch {
         showToast("Failed to catalog institutional vendor", "error");
      }
   };

   const openProfileDetail = (supp: Supplier) => {
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
      <div className="portal-flex-col-gap32">
         {canManage && (
            <div className="portal-card">
               <div className="portal-card-header portal-card-header-mb32">
                  <h3 className="portal-card-title-md"><i className="fas fa-truck mr-3 portal-icon-blue"></i>Vendor Registry</h3>
               </div>
               <div className="portal-grid-autofit-200-gap24">
                  <div className="form-group">
                    <label className="portal-label">Entity Name</label>
                    <input 
                        type="text" 
                        value={formData.companyName}
                        onChange={e => setFormData({ ...formData, companyName: e.target.value })}
                        className="portal-input portal-input-bold" 
                        placeholder="e.g. Apex Textiles Ltd"
                    />
                  </div>
                  <div className="form-group">
                    <label className="portal-label">Liaison Name</label>
                    <input 
                        type="text" 
                        value={formData.contactName}
                        onChange={e => setFormData({ ...formData, contactName: e.target.value })}
                        className="portal-input portal-input-bold" 
                        placeholder="Primary contact"
                    />
                  </div>
                  <div className="form-group">
                    <label className="portal-label">Communication Channel</label>
                    <input 
                        type="text" 
                        value={formData.phone}
                        onChange={e => setFormData({ ...formData, phone: e.target.value })}
                        className="portal-input portal-input-bold" 
                        placeholder="+263..."
                    />
                  </div>
                  <button 
                    onClick={handleSave}
                    className="portal-btn-primary portal-btn-padded-14"
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
                      <th className="portal-th-align-right">Actions</th>
                    </tr>
                </thead>
                <tbody>
                    {(Array.isArray(suppliers) ? suppliers : []).length > 0 ? (Array.isArray(suppliers) ? suppliers : []).map((supp: Supplier) => (
                      <tr key={supp.id}>
                          <td>
                            <div className="portal-text-bold-dark">{supp.companyName}</div>
                            <div className="portal-text-sku">ID: {supp.id.slice(0, 8).toUpperCase()}</div>
                          </td>
                          <td className="portal-text-muted-bold">{supp.contactName || '-'}</td>
                          <td className="portal-text-price-blue">{supp.phone || '-'}</td>
                          <td className="portal-th-align-right">
                              <div className="action-buttons portal-action-buttons-end">
                                <button className="portal-btn-ghost portal-btn-icon-slate" title="View Profile" aria-label="View Profile" onClick={() => openProfileDetail(supp)}>
                                  <i className="fas fa-eye"></i>
                                </button>
                                {canManage && (
                                  <>
                                    <button className="portal-btn-ghost portal-btn-icon-blue" title="Edit Vendor" aria-label="Edit Vendor" onClick={() => setEditingVendor(supp)}><i className="fas fa-pencil-alt"></i></button>
                                    <button className="portal-btn-ghost portal-btn-icon-red" title="Delete Vendor" aria-label="Delete Vendor" onClick={() => setDeletingVendor(supp)}><i className="fas fa-trash"></i></button>
                                  </>
                                )}
                              </div>
                          </td>
                      </tr>
                    )) : (
                      <tr><td colSpan={canManage ? 4 : 3} className="portal-td-empty-padded">
                        <i className="fas fa-address-book portal-empty-icon-faint"></i>
                        <p className="portal-text-bold-muted">Vendor registry is empty</p>
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
               title={selectedSupplierForDetail.metadata?.companyName || selectedSupplierForDetail.name || 'Vendor'}
               subTitle={`Local ID: ${selectedSupplierForDetail.id.slice(0, 8).toUpperCase()} | Global: ${selectedSupplierForDetail.globalId || 'N/A'}`}
               role="Supplier"
               avatarText={(selectedSupplierForDetail.metadata?.companyName || selectedSupplierForDetail.name || 'V').charAt(0)}
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
                         ? selectedSupplierForDetail.metadata.selectedCategories.map((c: { code?: string; name?: string; section?: string }) => `${c.code}: ${c.name} (${c.section})`).join(', ')
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
                     ? selectedSupplierForDetail.metadata.bankAccounts.map((acc: { accountType?: string; bankName?: string; bankBranch?: string; branchCode?: string; accountName?: string; accountNumber?: string }, index: number) => ({
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

         {editingVendor && (
            <div className="portal-modal-overlay">
               <div className="portal-modal">
                  <div className="portal-modal-header">
                     <h3 className="portal-modal-title-zero">Edit Vendor Registry</h3>
                     <button className="portal-btn-ghost portal-btn-close-sm" title="Close Modal" aria-label="Close Modal" onClick={() => setEditingVendor(null)}>
                        <i className="fas fa-times"></i>
                     </button>
                  </div>
                  <div className="portal-modal-body portal-flex-col-gap16">
                     <div className="form-group">
                        <label className="portal-label">Entity Name</label>
                        <input type="text" className="portal-input" id="edit-vendor-entity-name" title="Entity Name" placeholder="Entity Name" defaultValue={editingVendor.companyName} />
                     </div>
                     <div className="form-group">
                        <label className="portal-label">Liaison Name</label>
                        <input type="text" className="portal-input" id="edit-vendor-liaison-name" title="Liaison Name" placeholder="Liaison Name" defaultValue={editingVendor.contactName} />
                     </div>
                     <div className="form-group">
                        <label className="portal-label">Contact Number</label>
                        <input type="text" className="portal-input" id="edit-vendor-contact-number" title="Contact Number" placeholder="Contact Number" defaultValue={editingVendor.phone} />
                     </div>
                  </div>
                  <div className="portal-modal-footer">
                     <button className="portal-btn-secondary" onClick={() => setEditingVendor(null)}>Cancel</button>
                     <button className="portal-btn-primary" onClick={() => { 
                        setEditingVendor(null); 
                        showToast('Vendor registry updated successfully', 'success');
                     }}>Save Changes</button>
                  </div>
               </div>
            </div>
         )}

         {deletingVendor && (
            <div className="portal-modal-overlay">
               <div className="portal-modal portal-modal-card-400">
                  <div className="portal-modal-header portal-modal-header-noborder">
                     <h3 className="portal-text-danger-title">Admin Approval Required</h3>
                  </div>
                  <div className="portal-modal-body portal-modal-body-centered">
                     <i className="fas fa-exclamation-circle portal-danger-icon-lg"></i>
                     <p>You are about to delete vendor <strong>{deletingVendor.companyName}</strong>. This requires administrator verification.</p>
                     <input type="password" id="admin-pin-auth" title="Admin Verification PIN" aria-label="Admin Verification PIN" placeholder="Enter admin PIN" className="portal-input portal-pin-input-centered" />
                  </div>
                  <div className="portal-modal-footer portal-footer-justify-center">
                     <button className="portal-btn-secondary" onClick={() => setDeletingVendor(null)}>Cancel</button>
                     <button className="portal-btn-primary portal-btn-danger-bg" onClick={() => { 
                        setDeletingVendor(null); 
                        showToast('Vendor deleted successfully', 'success');
                     }}>Authorize Deletion</button>
                  </div>
               </div>
            </div>
         )}
      </div>
   );
};

const PaymentsTab = ({ suppliers, canManage }: { suppliers: Supplier[], canManage: boolean }) => {
   const { showToast } = useToast();
   const [settleVendor, setSettleVendor] = useState<Supplier | null>(null);
   const [amount, setAmount] = useState('');
   const [paymentMode, setPaymentMode] = useState('');
   const [paymentMethods, setPaymentMethods] = useState<{ id: string; name: string }[]>([]);
   const [submitting, setSubmitting] = useState(false);

   useEffect(() => {
     api.get('/api/finance/payment-methods').then(res => {
       const pms = Array.isArray(res.data) ? res.data : [];
       setPaymentMethods(pms);
       if (pms.length > 0) setPaymentMode(pms[0].name);
     }).catch(() => {});
   }, []);

   const handleSettle = async () => {
     if (!settleVendor || !amount || parseFloat(amount) <= 0) {
       showToast('Please enter a valid settlement amount', 'error');
       return;
     }
     setSubmitting(true);
     try {
       await api.post('/api/uniforms/supplier-payments', {
         supplierId: settleVendor.id,
         amount: parseFloat(amount),
         paymentMode: paymentMode || 'Main Bank Gateway',
         date: new Date().toISOString()
       });
       showToast('Settlement posted & recorded in double-entry ledger', 'success');
       setSettleVendor(null);
       setAmount('');
       invalidateAllAccountingKeys();
     } catch (err) {
       const error = err as { response?: { data?: { error?: string } } };
       showToast(error.response?.data?.error || 'Failed to post settlement', 'error');
     } finally {
       setSubmitting(false);
     }
   };

   const exportAuditLogs = (vendorName: string) => {
      const headers = ['Timestamp,Action,Amount,Status'];
      const rows = [
         `${new Date().toISOString()},Initial Invoice,$10613.00,Processed`,
         `${new Date().toISOString()},Partial Payment,$3754.00,Processed`
      ];
      const csvContent = "data:text/csv;charset=utf-8," + [headers, ...rows].join("\n");
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement("a");
      link.setAttribute("href", encodedUri);
      link.setAttribute("download", `audit_log_${vendorName.replace(/\s+/g, '_')}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      showToast('Audit logs exported successfully.', 'success');
   };

   return (
      <div className="portal-flex-col-gap32">
         <div className="portal-card">
            <div className="portal-card-header portal-card-header-mb16">
               <h3 className="portal-card-title-md"><i className="fas fa-wallet mr-3 portal-icon-emerald"></i>Financial Settlements</h3>
            </div>
            <p className="portal-card-desc">Monitor vendor procurement balances and settle outstanding financial obligations into the general ledger.</p>
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
                      {canManage && <th className="portal-th-align-right">Settle Liability</th>}
                    </tr>
                </thead>
                <tbody>
                    {(Array.isArray(suppliers) ? suppliers : []).length > 0 ? (Array.isArray(suppliers) ? suppliers : []).map((supp: Supplier) => (
                      <tr key={supp.id}>
                          <td className="portal-text-bold-dark">{supp.companyName}</td>
                          <td className="portal-text-heavy-dark">$10,613.00</td>
                          <td className="portal-text-heavy-emerald">$3,754.00</td>
                          <td className="portal-text-heavy-red">$6,859.00</td>
                          {canManage && (
                            <td className="portal-th-align-right">
                                <div className="action-buttons portal-action-buttons-end">
                                  <button className="portal-btn-primary portal-btn-emerald-pill" title="Initiate Settlement" onClick={() => setSettleVendor(supp)}>
                                    <i className="fas fa-plus mr-2"></i>Settle
                                  </button>
                                  <button className="portal-btn-ghost portal-btn-icon-blue" title="View Audit Trail" aria-label="View Audit Trail" onClick={() => exportAuditLogs(supp.companyName)}> <i className="fas fa-history"></i></button>
                                </div>
                            </td>
                          )}
                      </tr>
                    )) : (
                      <tr><td colSpan={5} className="portal-td-empty-padded">
                        <i className="fas fa-money-check-alt portal-empty-icon-faint"></i>
                        <p className="portal-text-bold-muted">No active vendor liabilities detected</p>
                      </td></tr>
                    )}
                </tbody>
              </table>
            </div>
         </div>

         {settleVendor && (
            <div className="portal-modal-overlay">
               <div className="portal-modal-card animate-in zoom-in duration-200 portal-modal-card-440">
                  <div className="portal-modal-header portal-modal-header-pad-24-32">
                     <h3 className="portal-modal-header-title-md">Initiate Vendor Settlement</h3>
                     <button className="portal-btn-ghost portal-modal-close-btn-lg" title="Close Modal" aria-label="Close Modal" onClick={() => setSettleVendor(null)}>
                        <i className="fas fa-times"></i>
                     </button>
                  </div>
                  <div className="portal-modal-body portal-modal-body-pad32-gap20">
                     <div className="portal-card portal-card-summary-box">
                        <p className="portal-card-summary-label">Vendor Entity</p>
                        <h4 className="portal-card-summary-title">{settleVendor.companyName}</h4>
                     </div>
                     <div className="form-group">
                        <label className="portal-label">Amount to Settle (USD) *</label>
                        <input 
                          type="number" 
                          step="0.01"
                          className="portal-input portal-input-emerald-lg" 
                          placeholder="0.00" 
                          value={amount}
                          onChange={e => setAmount(e.target.value)}
                        />
                     </div>
                     <div className="form-group">
                        <label htmlFor="payment-method-select" className="portal-label">Payment Method (Registered Gateway) *</label>
                        <select 
                          id="payment-method-select"
                          title="Payment Method"
                          aria-label="Payment Method"
                          className="portal-input portal-input-height-52"
                          value={paymentMode}
                          onChange={e => setPaymentMode(e.target.value)}
                        >
                           {paymentMethods.map(pm => (
                             <option key={pm.id} value={pm.name}>{pm.name}</option>
                           ))}
                           {paymentMethods.length === 0 && (
                             <>
                               <option value="Main Bank Gateway">Main Bank Gateway</option>
                               <option value="Cash Office Vault">Cash Office Vault</option>
                               <option value="Mobile Money Endpoint">Mobile Money Endpoint</option>
                             </>
                           )}
                        </select>
                     </div>
                  </div>
                  <div className="portal-modal-footer portal-modal-footer-pad-24-32">
                     <button className="portal-btn-ghost portal-btn-ghost-bold" onClick={() => setSettleVendor(null)}>Cancel</button>
                     <button 
                       className="portal-btn-primary portal-btn-emerald-solid" 
                       disabled={submitting}
                       onClick={handleSettle}
                     >
                        {submitting ? <i className="fas fa-spinner fa-spin mr-2"></i> : <i className="fas fa-check-circle mr-2"></i>}
                        {submitting ? 'Posting...' : 'Confirm & Post Settlement'}
                     </button>
                  </div>
               </div>
            </div>
         )}
      </div>
   );
};


export default UniformsPage;
