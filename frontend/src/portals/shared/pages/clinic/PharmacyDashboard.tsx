import React, { useState, useEffect, useCallback } from 'react';
import api from '../../../../lib/api';
import { useToast } from '../../../../context/ToastContext';
import { EmptyState } from '../../../../components/common/EmptyState';

interface PharmacyItem {
  id: string;
  name: string;
  category: string;
  batchNumber?: string;
  expiryDate?: string;
  unit: string;
  stock: number;
  reorderLevel: number;
  unitCost: number;
  unitPrice: number;
  location?: string;
  isLowStock?: boolean;
  isExpired?: boolean;
  isExpiringSoon?: boolean;
}

interface ActiveVisitItem {
  id: string;
  visitCode?: string;
  visitDate: string;
  status: string;
  patient?: {
    firstName?: string;
    lastName?: string;
    mrn?: string;
  };
}

export default function PharmacyDashboard() {
  const { showToast } = useToast();
  const [items, setItems] = useState<PharmacyItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'ALL' | 'LOW_STOCK' | 'EXPIRED' | 'EXPIRING_SOON'>('ALL');
  const [searchTerm, setSearchTerm] = useState('');

  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [showDispenseModal, setShowDispenseModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Active Visits for Dispensing
  const [activeVisits, setActiveVisits] = useState<ActiveVisitItem[]>([]);
  const [loadingVisits, setLoadingVisits] = useState(false);

  // Forms State
  const [addForm, setAddForm] = useState({
    name: '',
    category: 'MEDICATION',
    batchNumber: '',
    expiryDate: '',
    unit: 'tablets',
    stock: 100,
    reorderLevel: 20,
    unitCost: 0.5,
    unitPrice: 1.0,
    location: 'Shelf A1'
  });

  const [dispenseForm, setDispenseForm] = useState({
    itemId: '',
    visitId: '',
    quantity: 1,
    notes: ''
  });

  const fetchInventory = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get('/api/clinic/pharmacy/inventory');
      setItems(Array.isArray(res.data) ? res.data : []);
    } catch (error) {
      console.error('Fetch pharmacy inventory error:', error);
      showToast('Failed to load pharmacy inventory', 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  const fetchActiveVisits = useCallback(async () => {
    try {
      setLoadingVisits(true);
      const res = await api.get('/api/clinic/visits');
      const visits = (Array.isArray(res.data) ? res.data : []).filter(
        (v: ActiveVisitItem) => v.status !== 'DISCHARGED' && v.status !== 'BILLED'
      );
      setActiveVisits(visits);
    } catch (error) {
      console.error('Fetch active visits error:', error);
      showToast('Failed to load clinic visits', 'error');
    } finally {
      setLoadingVisits(false);
    }
  }, [showToast]);

  useEffect(() => {
    fetchInventory();
  }, [fetchInventory]);

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await api.post('/api/clinic/pharmacy/inventory', addForm);
      showToast('Medication added to pharmacy stock successfully', 'success');
      setShowAddModal(false);
      fetchInventory();
    } catch (error: unknown) {
      const err = error as { response?: { data?: { error?: string } } };
      showToast(err.response?.data?.error || 'Failed to add medication stock', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDispenseSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await api.post('/api/clinic/pharmacy/dispense', dispenseForm);
      showToast('Medication dispensed and stock updated', 'success');
      setShowDispenseModal(false);
      fetchInventory();
    } catch (error: unknown) {
      const err = error as { response?: { data?: { error?: string } } };
      showToast(err.response?.data?.error || 'Failed to dispense medication', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const openDispenseModal = () => {
    setShowDispenseModal(true);
    fetchActiveVisits();
  };

  const filteredItems = items.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (item.batchNumber && item.batchNumber.toLowerCase().includes(searchTerm.toLowerCase()));

    if (!matchesSearch) return false;

    if (filter === 'LOW_STOCK') return item.isLowStock;
    if (filter === 'EXPIRED') return item.isExpired;
    if (filter === 'EXPIRING_SOON') return item.isExpiringSoon;
    return true;
  });

  const lowStockCount = items.filter(i => i.isLowStock).length;
  const expiredCount = items.filter(i => i.isExpired).length;
  const expiringSoonCount = items.filter(i => i.isExpiringSoon).length;

  return (
    <div className="portal-container">
      <div className="portal-page-header">
        <div>
          <h1>Pharmacy & Stock Inventory</h1>
          <p>Real-time drug tracking, batch expiry alerts, automated stock deduction upon dispensing, and inventory reorder points.</p>
        </div>
        <div className="portal-header-actions">
          <button
            type="button"
            className="portal-btn-blue"
            onClick={openDispenseModal}
          >
            <i className="fas fa-hand-holding-medical mr-1"></i> Dispense Medication
          </button>
          <button
            type="button"
            className="portal-btn-green"
            onClick={() => setShowAddModal(true)}
          >
            <i className="fas fa-plus mr-1"></i> Add Stock Item
          </button>
        </div>
      </div>

      {/* STAT CARDS */}
      <div className="portal-stats-grid">
        <div className="portal-card portal-stat-card-blue">
          <div className="portal-stat-label">TOTAL SKUS & MEDICATIONS</div>
          <div className="portal-stat-val-blue">{items.length}</div>
        </div>
        <div className="portal-card portal-stat-card-warning">
          <div className="portal-stat-label">LOW STOCK ALERTS</div>
          <div className="portal-stat-val-warning">{lowStockCount}</div>
        </div>
        <div className="portal-card portal-stat-card-danger">
          <div className="portal-stat-label">EXPIRED ITEMS</div>
          <div className="portal-stat-val-danger">{expiredCount}</div>
        </div>
        <div className="portal-card portal-stat-card-amber">
          <div className="portal-stat-label">EXPIRING SOON (30 DAYS)</div>
          <div className="portal-stat-val-amber">{expiringSoonCount}</div>
        </div>
      </div>

      {/* FILTER & INVENTORY TABLE */}
      <div className="portal-card">
        <div className="portal-card-header portal-flex-between">
          <h3 className="font-extrabold text-lg">Pharmacy Stock Register</h3>
          <div className="portal-filter-bar">
            <button
              type="button"
              onClick={() => setFilter('ALL')}
              className={`portal-btn-${filter === 'ALL' ? 'primary' : 'secondary'}`}
            >
              All Items ({items.length})
            </button>
            <button
              type="button"
              onClick={() => setFilter('LOW_STOCK')}
              className={`portal-btn-${filter === 'LOW_STOCK' ? 'warning' : 'secondary'}`}
            >
              Low Stock ({lowStockCount})
            </button>
            <button
              type="button"
              onClick={() => setFilter('EXPIRING_SOON')}
              className={`portal-btn-${filter === 'EXPIRING_SOON' ? 'warning' : 'secondary'}`}
            >
              Expiring Soon ({expiringSoonCount})
            </button>
            <button
              type="button"
              onClick={() => setFilter('EXPIRED')}
              className={`portal-btn-${filter === 'EXPIRED' ? 'danger' : 'secondary'}`}
            >
              Expired ({expiredCount})
            </button>
            <input
              type="text"
              id="pharmacySearchTerm"
              name="pharmacySearchTerm"
              title="Search item name or batch..."
              aria-label="Search item name or batch..."
              className="portal-input"
              placeholder="Search item name or batch..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        <div className="portal-card-body">
          {loading ? (
            <div className="portal-loading-card">
              <i className="fas fa-spinner fa-spin mr-2"></i> Loading pharmacy inventory...
            </div>
          ) : filteredItems.length === 0 ? (
            <EmptyState
              icon="fas fa-pills"
              title="No Pharmacy Stock Items Configured"
              description="Your pharmacy inventory has zero stock entries. Add medications and consumables to enable dispensing."
              actionLabel="Add Stock Item"
              onAction={() => setShowAddModal(true)}
              setupStageLink={{ step: 8, label: 'Initialize Pharmacy in Setup Wizard' }}
            />
          ) : (
            <table className="portal-table">
              <thead>
                <tr>
                  <th>Medication / Item</th>
                  <th>Category</th>
                  <th>Batch No.</th>
                  <th>Expiry Date</th>
                  <th>Location</th>
                  <th>Available Stock</th>
                  <th>Unit Cost / Price</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {filteredItems.map(item => (
                  <tr key={item.id}>
                    <td className="font-bold">{item.name}</td>
                    <td><span className="portal-badge secondary">{item.category}</span></td>
                    <td>{item.batchNumber || 'N/A'}</td>
                    <td>
                      {item.expiryDate ? (
                        <span className={item.isExpired ? 'font-bold portal-icon-red' : item.isExpiringSoon ? 'font-bold portal-text-due' : ''}>
                          {new Date(item.expiryDate).toLocaleDateString()}
                        </span>
                      ) : 'N/A'}
                    </td>
                    <td>{item.location || 'Main Shelf'}</td>
                    <td className="font-bold">
                      <span className={item.stock <= item.reorderLevel ? 'portal-text-due' : 'portal-icon-green'}>
                        {item.stock} {item.unit}
                      </span>
                    </td>
                    <td>${item.unitCost?.toFixed(2)} / ${item.unitPrice?.toFixed(2)}</td>
                    <td>
                      {item.isExpired ? (
                        <span className="portal-badge danger">EXPIRED</span>
                      ) : item.isExpiringSoon ? (
                        <span className="portal-badge warning">EXPIRING SOON</span>
                      ) : item.isLowStock ? (
                        <span className="portal-badge warning">LOW STOCK</span>
                      ) : (
                        <span className="portal-badge success">AVAILABLE</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* ADD MEDICATION MODAL */}
      {showAddModal && (
        <div className="portal-modal-overlay">
          <div className="portal-modal-card">
            <div className="portal-modal-header">
              <h3 className="portal-flex-between portal-icon-green">
                <i className="fas fa-plus-circle mr-2"></i> Add Pharmacy Stock Item
              </h3>
              <button type="button" className="portal-modal-close" onClick={() => setShowAddModal(false)}>&times;</button>
            </div>
            <form onSubmit={handleAddSubmit} className="portal-modal-grid-2">
              <div className="portal-form-group portal-grid-full">
                <label htmlFor="addMedicationName" className="portal-label">Item / Drug Name *</label>
                <input
                  type="text"
                  id="addMedicationName"
                  name="addMedicationName"
                  title="Item / Drug Name"
                  aria-label="Item / Drug Name"
                  className="portal-input"
                  required
                  placeholder="e.g. Amoxicillin 500mg"
                  value={addForm.name}
                  onChange={e => setAddForm({ ...addForm, name: e.target.value })}
                />
              </div>
              <div className="portal-form-group">
                <label htmlFor="addMedicationCategory" className="portal-label">Category</label>
                <select
                  id="addMedicationCategory"
                  name="addMedicationCategory"
                  title="Category"
                  aria-label="Category"
                  className="portal-input"
                  value={addForm.category}
                  onChange={e => setAddForm({ ...addForm, category: e.target.value })}
                >
                  <option value="MEDICATION">Medication</option>
                  <option value="CONSUMABLE">Consumable</option>
                  <option value="EQUIPMENT">Equipment</option>
                </select>
              </div>
              <div className="portal-form-group">
                <label htmlFor="addMedicationUnit" className="portal-label">Unit of Measure</label>
                <input
                  type="text"
                  id="addMedicationUnit"
                  name="addMedicationUnit"
                  title="Unit of Measure"
                  aria-label="Unit of Measure"
                  className="portal-input"
                  required
                  placeholder="tablets, bottles, packs..."
                  value={addForm.unit}
                  onChange={e => setAddForm({ ...addForm, unit: e.target.value })}
                />
              </div>
              <div className="portal-form-group">
                <label htmlFor="addMedicationBatchNumber" className="portal-label">Batch Number</label>
                <input
                  type="text"
                  id="addMedicationBatchNumber"
                  name="addMedicationBatchNumber"
                  title="Batch Number"
                  aria-label="Batch Number"
                  className="portal-input"
                  placeholder="e.g. LOT-2026-X"
                  value={addForm.batchNumber}
                  onChange={e => setAddForm({ ...addForm, batchNumber: e.target.value })}
                />
              </div>
              <div className="portal-form-group">
                <label htmlFor="addMedicationExpiryDate" className="portal-label">Expiry Date</label>
                <input
                  type="date"
                  id="addMedicationExpiryDate"
                  name="addMedicationExpiryDate"
                  title="Expiry Date"
                  aria-label="Expiry Date"
                  className="portal-input"
                  value={addForm.expiryDate}
                  onChange={e => setAddForm({ ...addForm, expiryDate: e.target.value })}
                />
              </div>
              <div className="portal-form-group">
                <label htmlFor="addMedicationStock" className="portal-label">Stock Quantity *</label>
                <input
                  type="number"
                  id="addMedicationStock"
                  name="addMedicationStock"
                  title="Stock Quantity"
                  aria-label="Stock Quantity"
                  className="portal-input"
                  required
                  min="1"
                  placeholder="100"
                  value={addForm.stock}
                  onChange={e => setAddForm({ ...addForm, stock: parseInt(e.target.value) || 0 })}
                />
              </div>
              <div className="portal-form-group">
                <label htmlFor="addMedicationReorderLevel" className="portal-label">Reorder Level *</label>
                <input
                  type="number"
                  id="addMedicationReorderLevel"
                  name="addMedicationReorderLevel"
                  title="Reorder Level"
                  aria-label="Reorder Level"
                  className="portal-input"
                  required
                  min="1"
                  placeholder="20"
                  value={addForm.reorderLevel}
                  onChange={e => setAddForm({ ...addForm, reorderLevel: parseInt(e.target.value) || 0 })}
                />
              </div>
              <div className="portal-form-group">
                <label htmlFor="addMedicationUnitCost" className="portal-label">Unit Cost ($)</label>
                <input
                  type="number"
                  step="0.01"
                  id="addMedicationUnitCost"
                  name="addMedicationUnitCost"
                  title="Unit Cost ($)"
                  aria-label="Unit Cost ($)"
                  className="portal-input"
                  required
                  placeholder="0.50"
                  value={addForm.unitCost}
                  onChange={e => setAddForm({ ...addForm, unitCost: parseFloat(e.target.value) || 0 })}
                />
              </div>
              <div className="portal-form-group">
                <label htmlFor="addMedicationUnitPrice" className="portal-label">Dispense Price ($)</label>
                <input
                  type="number"
                  step="0.01"
                  id="addMedicationUnitPrice"
                  name="addMedicationUnitPrice"
                  title="Dispense Price ($)"
                  aria-label="Dispense Price ($)"
                  className="portal-input"
                  required
                  placeholder="1.00"
                  value={addForm.unitPrice}
                  onChange={e => setAddForm({ ...addForm, unitPrice: parseFloat(e.target.value) || 0 })}
                />
              </div>
              <div className="portal-form-group portal-grid-full">
                <label htmlFor="addMedicationLocation" className="portal-label">Storage Bin / Location</label>
                <input
                  type="text"
                  id="addMedicationLocation"
                  name="addMedicationLocation"
                  title="Storage Bin / Location"
                  aria-label="Storage Bin / Location"
                  className="portal-input"
                  placeholder="e.g. Shelf B, Fridge A"
                  value={addForm.location}
                  onChange={e => setAddForm({ ...addForm, location: e.target.value })}
                />
              </div>
              <button
                type="submit" className="portal-btn-green portal-grid-full mt-2" disabled={submitting}
              >
                {submitting ? 'Saving Item...' : 'Add Stock Item'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* DISPENSE MEDICATION MODAL */}
      {showDispenseModal && (
        <div className="portal-modal-overlay">
          <div className="portal-modal-card">
            <div className="portal-modal-header">
              <h3 className="portal-flex-between portal-icon-blue">
                <i className="fas fa-hand-holding-medical mr-2"></i> Dispense Medication
              </h3>
              <button type="button" className="portal-modal-close" onClick={() => setShowDispenseModal(false)}>&times;</button>
            </div>
            <form onSubmit={handleDispenseSubmit} className="flex flex-col gap-3">
              <div className="portal-form-group">
                <label htmlFor="dispenseItemId" className="portal-label">Select Medication Stock *</label>
                <select
                  id="dispenseItemId"
                  name="dispenseItemId"
                  title="Select Medication Stock"
                  aria-label="Select Medication Stock"
                  className="portal-input"
                  required
                  value={dispenseForm.itemId}
                  onChange={e => setDispenseForm({ ...dispenseForm, itemId: e.target.value })}
                >
                  <option value="">-- Choose Stock Item --</option>
                  {items.map(i => (
                    <option key={i.id} value={i.id} disabled={i.stock <= 0 || i.isExpired}>
                      {i.name} (Stock: {i.stock} {i.unit}) {i.isExpired ? ' - EXPIRED' : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div className="portal-form-group">
                <label htmlFor="dispenseVisitId" className="portal-label">Link to Patient Visit (Optional)</label>
                <select
                  id="dispenseVisitId"
                  name="dispenseVisitId"
                  title="Link to Patient Visit"
                  aria-label="Link to Patient Visit"
                  className="portal-input"
                  disabled={loadingVisits}
                  value={dispenseForm.visitId}
                  onChange={e => setDispenseForm({ ...dispenseForm, visitId: e.target.value })}
                >
                  <option value="">{loadingVisits ? '-- Loading active clinic encounters... --' : '-- Direct Dispensing / Walk-in --'}</option>
                  {activeVisits.map(v => (
                    <option key={v.id} value={v.id}>
                      Visit {v.visitCode || v.id.slice(0, 6)} - {v.patient?.firstName} {v.patient?.lastName} ({v.status})
                    </option>
                  ))}
                </select>
              </div>

              <div className="portal-form-group">
                <label htmlFor="dispenseQuantity" className="portal-label">Dispense Quantity *</label>
                <input
                  type="number"
                  id="dispenseQuantity"
                  name="dispenseQuantity"
                  title="Dispense Quantity"
                  aria-label="Dispense Quantity"
                  placeholder="1"
                  className="portal-input"
                  min="1"
                  required
                  value={dispenseForm.quantity}
                  onChange={e => setDispenseForm({ ...dispenseForm, quantity: parseInt(e.target.value) || 1 })}
                />
              </div>

              <div className="portal-form-group">
                <label htmlFor="dispenseNotes" className="portal-label">Dosage Instructions / Notes</label>
                <textarea
                  id="dispenseNotes"
                  name="dispenseNotes"
                  title="Dosage Instructions / Notes"
                  aria-label="Dosage Instructions / Notes"
                  className="portal-input"
                  rows={2}
                  placeholder="e.g. 1 tablet every 8 hours after food for 5 days"
                  value={dispenseForm.notes}
                  onChange={e => setDispenseForm({ ...dispenseForm, notes: e.target.value })}
                ></textarea>
              </div>

              <button
                type="submit" className="portal-btn-blue mt-2" disabled={submitting}
              >
                {submitting ? 'Dispensing...' : 'Confirm Dispense & Deduct Stock'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
