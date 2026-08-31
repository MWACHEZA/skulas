import React, { useState, useEffect, useCallback } from 'react';
import api from '../../../../lib/api';
import { useToast } from '../../../../context/ToastContext';

interface DispensingLogItem {
  id?: string;
  totalPrice?: number;
  item?: {
    id: string;
    name: string;
    unitPrice: number;
  };
}

interface ClinicPatientInfo {
  id?: string;
  mrn?: string;
  firstName?: string;
  lastName?: string;
  bloodType?: string;
  allergies?: string;
  contactNumber?: string;
  userId?: string;
}

interface ClinicBillingVisit {
  id: string;
  visitCode?: string;
  visitDate: string;
  status: string;
  diagnosis?: string;
  chiefComplaint?: string;
  patient?: ClinicPatientInfo;
  dispensings?: DispensingLogItem[];
  dispensingLogs?: DispensingLogItem[];
}

export default function ClinicBillingPage() {
  const { showToast } = useToast();
  const [visits, setVisits] = useState<ClinicBillingVisit[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'ALL' | 'UNBILLED' | 'BILLED'>('UNBILLED');
  const [searchTerm, setSearchTerm] = useState('');

  // Billing Modal
  const [selectedVisit, setSelectedVisit] = useState<ClinicBillingVisit | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [billingForm, setBillingForm] = useState({
    consultationFee: 15,
    medicationCost: 10,
    procedureCost: 0,
    paymentMode: 'CASH',
    isSubsidized: false
  });

  const fetchVisits = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get('/api/clinic/visits');
      setVisits(Array.isArray(res.data) ? res.data : []);
    } catch (error) {
      console.error('Fetch clinic billing visits error:', error);
      showToast('Failed to load clinic billing visits', 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    fetchVisits();
  }, [fetchVisits]);

  const openBillingModal = (visit: ClinicBillingVisit) => {
    setSelectedVisit(visit);
    // Auto-calculate medication charges from dispensing logs if any
    const logs = visit.dispensings || visit.dispensingLogs || [];
    const medCost = logs.reduce((sum: number, log: DispensingLogItem) => sum + (log.totalPrice || 0), 0);
    setBillingForm({
      consultationFee: 15,
      medicationCost: medCost > 0 ? medCost : 10,
      procedureCost: 0,
      paymentMode: 'CASH',
      isSubsidized: false
    });
  };

  const handleBillSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedVisit) return;
    setSubmitting(true);
    try {
      const res = await api.post(`/api/clinic/visits/${selectedVisit.id}/bill`, billingForm);
      showToast(res.data?.message || 'Visit billed and posted to General Ledger successfully', 'success');
      setSelectedVisit(null);
      fetchVisits();
    } catch (error: unknown) {
      const err = error as { response?: { data?: { error?: string } } };
      showToast(err.response?.data?.error || 'Failed to bill clinic visit', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const filteredVisits = visits.filter(v => {
    const pName = `${v.patient?.firstName || ''} ${v.patient?.lastName || ''}`.toLowerCase();
    const matchesSearch = pName.includes(searchTerm.toLowerCase()) || (v.visitCode && v.visitCode.toLowerCase().includes(searchTerm.toLowerCase()));

    if (!matchesSearch) return false;
    if (filter === 'UNBILLED') return v.status !== 'BILLED';
    if (filter === 'BILLED') return v.status === 'BILLED';
    return true;
  });

  const unbilledCount = visits.filter(v => v.status !== 'BILLED').length;
  const billedCount = visits.filter(v => v.status === 'BILLED').length;

  return (
    <div className="portal-container">
      <div className="portal-page-header">
        <div>
          <h1>Clinic Billing & General Ledger Checkout</h1>
          <p>Settle patient encounter fees, automatically post revenue entries and COGS inventory credit to the accounting ledger.</p>
        </div>
      </div>

      {/* SUMMARY STATS */}
      <div className="portal-stats-grid">
        <div className="portal-card portal-stat-card-warning">
          <div className="portal-stat-label">PENDING BILLING ENCOUNTERS</div>
          <div className="portal-stat-val-warning">{unbilledCount}</div>
        </div>
        <div className="portal-card portal-stat-card-success">
          <div className="portal-stat-label">POSTED & BILLED VISITS</div>
          <div className="portal-stat-val-success">{billedCount}</div>
        </div>
      </div>

      {/* VISITS TABLE */}
      <div className="portal-card">
        <div className="portal-card-header portal-flex-between">
          <h3 className="font-extrabold text-lg">Clinic Billing Queue</h3>
          <div className="portal-filter-bar">
            <button
              type="button"
              onClick={() => setFilter('UNBILLED')}
              className={`portal-btn-${filter === 'UNBILLED' ? 'warning' : 'secondary'}`}
            >
              Pending Billing ({unbilledCount})
            </button>
            <button
              type="button"
              onClick={() => setFilter('BILLED')}
              className={`portal-btn-${filter === 'BILLED' ? 'success' : 'secondary'}`}
            >
              Billed & Posted ({billedCount})
            </button>
            <button
              type="button"
              onClick={() => setFilter('ALL')}
              className={`portal-btn-${filter === 'ALL' ? 'primary' : 'secondary'}`}
            >
              All Encounters ({visits.length})
            </button>
            <input
              type="text"
              id="billingSearchTerm"
              name="billingSearchTerm"
              title="Search patient or code"
              aria-label="Search patient or code"
              className="portal-input"
              placeholder="Search patient or code..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        <div className="portal-card-body">
          {loading ? (
            <div className="portal-loading-card">
              <i className="fas fa-spinner fa-spin mr-2"></i> Loading billing queue...
            </div>
          ) : filteredVisits.length === 0 ? (
            <div className="portal-empty-card">
              No encounters found for the selected billing filter.
            </div>
          ) : (
            <table className="portal-table">
              <thead>
                <tr>
                  <th>Encounter Code</th>
                  <th>Patient Name</th>
                  <th>MRN / ID</th>
                  <th>Visit Date</th>
                  <th>Diagnosis / Complaints</th>
                  <th>Current Stage</th>
                  <th className="text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredVisits.map(visit => (
                  <tr key={visit.id}>
                    <td className="font-bold">{visit.visitCode || visit.id.slice(0, 8)}</td>
                    <td className="font-semibold">{visit.patient?.firstName} {visit.patient?.lastName}</td>
                    <td>{visit.patient?.mrn || 'N/A'}</td>
                    <td>{new Date(visit.visitDate).toLocaleDateString()}</td>
                    <td>{visit.diagnosis || visit.chiefComplaint || 'Routine Checkup'}</td>
                    <td>
                      <span className={`portal-badge ${visit.status === 'BILLED' ? 'success' : 'warning'}`}>
                        {visit.status}
                      </span>
                    </td>
                    <td className="text-right">
                      {visit.status === 'BILLED' ? (
                        <span className="font-bold portal-icon-green">
                          <i className="fas fa-check-circle mr-1"></i> Billed
                        </span>
                      ) : (
                        <button
                          type="button"
                          className="portal-btn-primary"
                          onClick={() => openBillingModal(visit)}
                        >
                          <i className="fas fa-file-invoice-dollar mr-1"></i> Generate Bill
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* BILLING MODAL */}
      {selectedVisit && (
        <div className="portal-modal-overlay">
          <div className="portal-modal-card">
            <div className="portal-modal-header">
              <h3 className="portal-flex-between portal-icon-green">
                <i className="fas fa-calculator mr-2"></i> Settle Encounter Billing
              </h3>
              <button type="button" className="portal-modal-close" onClick={() => setSelectedVisit(null)}>&times;</button>
            </div>
            <form onSubmit={handleBillSubmit} className="flex flex-col gap-3">
              <div className="portal-info-box">
                <div><strong>Patient:</strong> {selectedVisit.patient?.firstName} {selectedVisit.patient?.lastName} ({selectedVisit.patient?.mrn})</div>
                <div><strong>Encounter Date:</strong> {new Date(selectedVisit.visitDate).toLocaleDateString()}</div>
                <div><strong>Diagnosis:</strong> {selectedVisit.diagnosis || 'Routine Sick Bay Visit'}</div>
              </div>

              <div className="portal-form-group">
                <label htmlFor="consultationFee" className="portal-label">Consultation Fee ($)</label>
                <input
                  type="number"
                  step="0.01"
                  id="consultationFee"
                  name="consultationFee"
                  title="Consultation Fee ($)"
                  aria-label="Consultation Fee ($)"
                  placeholder="15.00"
                  className="portal-input"
                  required
                  value={billingForm.consultationFee}
                  onChange={e => setBillingForm({ ...billingForm, consultationFee: parseFloat(e.target.value) || 0 })}
                />
              </div>

              <div className="portal-form-group">
                <label htmlFor="medicationCost" className="portal-label">Medication & Pharmacy Charges ($)</label>
                <input
                  type="number"
                  step="0.01"
                  id="medicationCost"
                  name="medicationCost"
                  title="Medication & Pharmacy Charges ($)"
                  aria-label="Medication & Pharmacy Charges ($)"
                  placeholder="10.00"
                  className="portal-input"
                  required
                  value={billingForm.medicationCost}
                  onChange={e => setBillingForm({ ...billingForm, medicationCost: parseFloat(e.target.value) || 0 })}
                />
              </div>

              <div className="portal-form-group">
                <label htmlFor="procedureCost" className="portal-label">Procedure / Lab Charges ($)</label>
                <input
                  type="number"
                  step="0.01"
                  id="procedureCost"
                  name="procedureCost"
                  title="Procedure / Lab Charges ($)"
                  aria-label="Procedure / Lab Charges ($)"
                  placeholder="0.00"
                  className="portal-input"
                  required
                  value={billingForm.procedureCost}
                  onChange={e => setBillingForm({ ...billingForm, procedureCost: parseFloat(e.target.value) || 0 })}
                />
              </div>

              <div className="portal-form-group">
                <label htmlFor="paymentMode" className="portal-label">Payment Method</label>
                <select
                  id="paymentMode"
                  name="paymentMode"
                  title="Payment Method"
                  aria-label="Payment Method"
                  className="portal-input"
                  value={billingForm.paymentMode}
                  onChange={e => setBillingForm({ ...billingForm, paymentMode: e.target.value })}
                >
                  <option value="CASH">Cash Payment</option>
                  <option value="CARD">Bank / Card Payment</option>
                  <option value="STUDENT_AR">Add to Student Fee Account (AR)</option>
                </select>
              </div>

              <div className="portal-subsidized-box">
                <label htmlFor="isSubsidized" className="portal-subsidized-label">
                  <input
                    type="checkbox"
                    id="isSubsidized"
                    name="isSubsidized"
                    title="Mark as Subsidized / Mission Outreach Care"
                    aria-label="Mark as Subsidized / Mission Outreach Care"
                    checked={billingForm.isSubsidized}
                    onChange={e => setBillingForm({ ...billingForm, isSubsidized: e.target.checked })}
                  />
                  Mark as Subsidized / Mission Outreach Care (Donated Care)
                </label>
                <p className="portal-subsidized-text">
                  Posts to Donated Care Expense (7900) instead of collecting cash.
                </p>
              </div>

              <div className="portal-total-row">
                <span className="font-extrabold text-base">Total Charge:</span>
                <span className="portal-total-val">
                  ${(billingForm.consultationFee + billingForm.medicationCost + billingForm.procedureCost).toFixed(2)}
                </span>
              </div>

              <button
                type="submit" className="portal-btn-primary" disabled={submitting}
              >
                {submitting ? 'Posting Bill to General Ledger...' : 'Post Bill to Accounting Ledger'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
