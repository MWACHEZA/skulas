import React, { useState, useEffect, useCallback } from 'react';
import api from '../../../../lib/api';
import { useToast } from '../../../../context/ToastContext';

interface SurveillanceItem {
  diagnosis?: string;
  _id?: string;
  count?: number;
  _count?: number;
}

interface ImmunizationDueItem {
  id?: string;
  vaccineName?: string;
  doseNumber?: number;
  nextDueDate?: string;
  patient?: {
    firstName?: string;
    lastName?: string;
    mrn?: string;
  };
}

interface InventoryItemStat {
  id: string;
  name: string;
  batchNumber?: string;
  stock: number;
  unit: string;
  unitCost: number;
  isLowStock?: boolean;
  isExpired?: boolean;
}

interface InventoryStats {
  items: InventoryItemStat[];
  totalVal: number;
  lowStock: number;
  expired: number;
}

export default function ClinicReportsPage() {
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState<'SURVEILLANCE' | 'IMMUNIZATION' | 'STOCK_VALUATION'>('SURVEILLANCE');
  const [loading, setLoading] = useState(true);

  const [surveillanceData, setSurveillanceData] = useState<SurveillanceItem[]>([]);
  const [immunizationDue, setImmunizationDue] = useState<ImmunizationDueItem[]>([]);
  const [inventoryStats, setInventoryStats] = useState<InventoryStats | null>(null);

  const fetchReportData = useCallback(async () => {
    try {
      setLoading(true);
      if (activeTab === 'SURVEILLANCE') {
        const res = await api.get('/api/clinic/reports/surveillance');
        // Backend returns { period, totalCasesLogged, surveillanceSummary }
        const data = res.data;
        setSurveillanceData(Array.isArray(data) ? data : (Array.isArray(data?.surveillanceSummary) ? data.surveillanceSummary : []));

      } else if (activeTab === 'IMMUNIZATION') {
        const res = await api.get('/api/clinic/immunizations/due-report');
        setImmunizationDue(Array.isArray(res.data) ? res.data : []);
      } else if (activeTab === 'STOCK_VALUATION') {
        const res = await api.get('/api/clinic/pharmacy/inventory');
        const items: InventoryItemStat[] = Array.isArray(res.data) ? res.data : [];
        const totalVal = items.reduce((sum, i) => sum + (i.stock * i.unitCost), 0);
        const lowStock = items.filter(i => i.isLowStock).length;
        const expired = items.filter(i => i.isExpired).length;
        setInventoryStats({ items, totalVal, lowStock, expired });
      }
    } catch (error) {
      console.error('Clinical report fetch error:', error);
      showToast('Failed to fetch clinical report data', 'error');
    } finally {
      setLoading(false);
    }
  }, [activeTab, showToast]);

  useEffect(() => {
    fetchReportData();
  }, [fetchReportData]);

  return (
    <div className="portal-container">
      <div className="portal-page-header">
        <div>
          <h1>Clinical & Public Health Reports</h1>
          <p>Epidemiological surveillance, public health disease aggregation, booster immunization tracking, and pharmacy valuation audits.</p>
        </div>
      </div>

      {/* TABS */}
      <div className="portal-tabs-row">
        <button
          className={`portal-btn-${activeTab === 'SURVEILLANCE' ? 'primary' : 'secondary'}`}
          onClick={() => setActiveTab('SURVEILLANCE')}
        >
          <i className="fas fa-chart-line mr-1"></i> Epidemiological Surveillance
        </button>
        <button
          className={`portal-btn-${activeTab === 'IMMUNIZATION' ? 'primary' : 'secondary'}`}
          onClick={() => setActiveTab('IMMUNIZATION')}
        >
          <i className="fas fa-syringe mr-1"></i> Booster Immunization Due Report
        </button>
        <button
          className={`portal-btn-${activeTab === 'STOCK_VALUATION' ? 'primary' : 'secondary'}`}
          onClick={() => setActiveTab('STOCK_VALUATION')}
        >
          <i className="fas fa-boxes mr-1"></i> Pharmacy Valuation Audit
        </button>
      </div>

      {/* TAB CONTENT */}
      {loading ? (
        <div className="portal-card portal-loading-card">
          <i className="fas fa-spinner fa-spin mr-2"></i> Generating report analytics...
        </div>
      ) : activeTab === 'SURVEILLANCE' ? (
        <div className="portal-card">
          <div className="portal-card-header">
            <h3><i className="fas fa-microscope portal-icon-blue mr-2"></i> Disease Aggregation & Outbreak Monitor</h3>
          </div>
          <div className="portal-card-body">
            {surveillanceData.length === 0 ? (
              <div className="portal-empty-card">
                No diagnostic surveillance records documented yet.
              </div>
            ) : (
              <table className="portal-table">
                <thead>
                  <tr>
                    <th>ICD-10 / Disease Classification</th>
                    <th>Reported Cases Count</th>
                    <th>Public Health Risk Level</th>
                  </tr>
                </thead>
                <tbody>
                  {surveillanceData.map((item, idx) => {
                    const count = item._count || item.count || 1;
                    return (
                      <tr key={idx}>
                        <td className="font-bold">{item.diagnosis || item._id || 'Unclassified Infection'}</td>
                        <td className="font-black portal-icon-blue">{count} cases</td>
                        <td>
                          {count > 10 ? (
                            <span className="portal-badge danger">HIGH OUTBREAK RISK</span>
                          ) : count > 3 ? (
                            <span className="portal-badge warning">MODERATE MONITORING</span>
                          ) : (
                            <span className="portal-badge success">NORMAL BASELINE</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      ) : activeTab === 'IMMUNIZATION' ? (
        <div className="portal-card">
          <div className="portal-card-header">
            <h3><i className="fas fa-syringe portal-icon-green mr-2"></i> Upcoming Vaccine Booster Schedule</h3>
          </div>
          <div className="portal-card-body">
            {immunizationDue.length === 0 ? (
              <div className="portal-empty-card">
                All student and community patient immunization booster records are up to date!
              </div>
            ) : (
              <table className="portal-table">
                <thead>
                  <tr>
                    <th>Patient Name</th>
                    <th>MRN</th>
                    <th>Vaccine Name</th>
                    <th>Dose Number</th>
                    <th>Next Due Date</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {immunizationDue.map((item, idx) => (
                    <tr key={idx}>
                      <td className="font-bold">{item.patient?.firstName} {item.patient?.lastName}</td>
                      <td>{item.patient?.mrn || 'N/A'}</td>
                      <td>{item.vaccineName}</td>
                      <td>Dose {item.doseNumber || 1}</td>
                      <td className="portal-text-due">
                        {item.nextDueDate ? new Date(item.nextDueDate).toLocaleDateString() : 'Immediate'}
                      </td>
                      <td>
                        <span className="portal-badge warning">BOOSTER DUE</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      ) : (
        <div className="portal-card">
          <div className="portal-card-header portal-flex-between">
            <h3><i className="fas fa-boxes portal-icon-green mr-2"></i> Pharmacy Inventory Asset Audit</h3>
            {inventoryStats && (
              <div className="portal-text-val">
                Total Valuation: ${inventoryStats.totalVal.toFixed(2)}
              </div>
            )}
          </div>
          <div className="portal-card-body">
            {!inventoryStats ? (
              <div className="portal-empty-card">No inventory stats available.</div>
            ) : (
              <table className="portal-table">
                <thead>
                  <tr>
                    <th>Drug / Medical Item</th>
                    <th>Batch</th>
                    <th>On-Hand Stock</th>
                    <th>Unit Cost</th>
                    <th>Asset Value</th>
                    <th>Condition</th>
                  </tr>
                </thead>
                <tbody>
                  {inventoryStats.items.map(item => (
                    <tr key={item.id}>
                      <td className="font-bold">{item.name}</td>
                      <td>{item.batchNumber || 'N/A'}</td>
                      <td>{item.stock} {item.unit}</td>
                      <td>${item.unitCost?.toFixed(2)}</td>
                      <td className="font-extrabold">${(item.stock * item.unitCost).toFixed(2)}</td>
                      <td>
                        {item.isExpired ? (
                          <span className="portal-badge danger">EXPIRED - WRITE OFF</span>
                        ) : item.isLowStock ? (
                          <span className="portal-badge warning">REORDER NEEDED</span>
                        ) : (
                          <span className="portal-badge success">GOOD CONDITION</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
