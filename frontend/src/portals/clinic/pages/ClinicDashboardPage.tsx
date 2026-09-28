import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import api from '../../../lib/api';

export type ClinicDashboardTab = 'active-patients' | 'triage-queue' | 'today-consults' | 'critical-alerts' | 'low-stock';

export default function ClinicDashboardPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const currentTab = (searchParams.get('tab') as ClinicDashboardTab) || 'active-patients';
  const [activeTab, setActiveTab] = useState<ClinicDashboardTab>(currentTab);
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    const tabParam = searchParams.get('tab') as ClinicDashboardTab;
    if (tabParam && ['active-patients', 'triage-queue', 'today-consults', 'critical-alerts', 'low-stock'].includes(tabParam)) {
      setActiveTab(tabParam);
    }
  }, [searchParams]);

  const loadData = async () => {
    try {
      setLoading(true);
      const res = await api.get('/clinic/dashboard-kpis');
      setData(res.data);
    } catch (err) {
      console.error('Failed to load clinic dashboard KPIs:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleTabChange = (tab: ClinicDashboardTab) => {
    setActiveTab(tab);
    setSearchParams({ tab });
  };

  const kpis = data?.kpis || {
    activePatients: 0,
    triageQueueLength: 0,
    todayConsultsCount: 0,
    occupiedBeds: 0,
    totalBeds: 10,
    bedOccupancyRate: 0,
    emergenciesThisWeek: 0
  };

  return (
    <div className="portal-container" style={{ padding: '24px', maxWidth: '1400px', margin: '0 auto' }}>
      {/* Page Header */}
      <div className="portal-page-header" style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: '1.6rem', fontWeight: 700, color: '#0f172a', display: 'flex', alignItems: 'center', gap: 10 }}>
          <i className="fas fa-stethoscope" style={{ color: 'var(--portal-success, #10b981)' }} />
          Clinical Operations Dashboard
        </h1>
        <p style={{ color: '#64748b', fontSize: '0.95rem', marginTop: 4 }}>
          Live clinical monitoring, triage intake, doctor consultation queue, bed occupancy, and low-stock alerts.
        </p>
      </div>

      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16, marginBottom: 24 }}>
        <div style={{ background: '#fff', borderRadius: 10, padding: 18, border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: 600 }}>Active In-Clinic</span>
            <i className="fas fa-user-injured" style={{ color: '#3b82f6', fontSize: '1.2rem' }} />
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: 700, color: '#0f172a', marginTop: 8 }}>{kpis.activePatients}</div>
          <div style={{ fontSize: '0.75rem', color: '#10b981', marginTop: 4 }}>Under direct observation</div>
        </div>

        <div style={{ background: '#fff', borderRadius: 10, padding: 18, border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: 600 }}>Triage Queue</span>
            <i className="fas fa-clipboard-list" style={{ color: '#f59e0b', fontSize: '1.2rem' }} />
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: 700, color: '#0f172a', marginTop: 8 }}>{kpis.triageQueueLength}</div>
          <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: 4 }}>Awaiting nurse assessment</div>
        </div>

        <div style={{ background: '#fff', borderRadius: 10, padding: 18, border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: 600 }}>Sick Bay Beds</span>
            <i className="fas fa-bed" style={{ color: '#8b5cf6', fontSize: '1.2rem' }} />
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: 700, color: '#0f172a', marginTop: 8 }}>
            {kpis.occupiedBeds} <span style={{ fontSize: '1rem', fontWeight: 500, color: '#64748b' }}>/ {kpis.totalBeds}</span>
          </div>
          <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: 4 }}>{kpis.bedOccupancyRate}% occupancy rate</div>
        </div>

        <div style={{ background: '#fff', borderRadius: 10, padding: 18, border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: 600 }}>Weekly Emergencies</span>
            <i className="fas fa-ambulance" style={{ color: '#ef4444', fontSize: '1.2rem' }} />
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: 700, color: '#ef4444', marginTop: 8 }}>{kpis.emergenciesThisWeek}</div>
          <div style={{ fontSize: '0.75rem', color: '#ef4444', marginTop: 4 }}>High-acuity incidents</div>
        </div>
      </div>

      {/* Level 1 Navigation Tabs */}
      <div
        className="portal-tabs"
        style={{
          display: 'flex',
          gap: 8,
          borderBottom: '2px solid #e2e8f0',
          marginBottom: 20,
          background: '#fff',
          padding: '8px 12px 0 12px',
          borderRadius: '8px 8px 0 0'
        }}
      >
        <button
          type="button"
          onClick={() => handleTabChange('active-patients')}
          style={{
            padding: '10px 18px',
            border: 'none',
            background: 'none',
            cursor: 'pointer',
            fontWeight: activeTab === 'active-patients' ? 600 : 500,
            color: activeTab === 'active-patients' ? '#10b981' : '#64748b',
            borderBottom: activeTab === 'active-patients' ? '3px solid #10b981' : '3px solid transparent',
            display: 'flex',
            alignItems: 'center',
            gap: 8
          }}
        >
          <i className="fas fa-users" />
          Active Patients ({data?.openVisits?.length || 0})
        </button>

        <button
          type="button"
          onClick={() => handleTabChange('triage-queue')}
          style={{
            padding: '10px 18px',
            border: 'none',
            background: 'none',
            cursor: 'pointer',
            fontWeight: activeTab === 'triage-queue' ? 600 : 500,
            color: activeTab === 'triage-queue' ? '#10b981' : '#64748b',
            borderBottom: activeTab === 'triage-queue' ? '3px solid #10b981' : '3px solid transparent',
            display: 'flex',
            alignItems: 'center',
            gap: 8
          }}
        >
          <i className="fas fa-clock" />
          Triage Queue ({data?.triageQueue?.length || 0})
        </button>

        <button
          type="button"
          onClick={() => handleTabChange('today-consults')}
          style={{
            padding: '10px 18px',
            border: 'none',
            background: 'none',
            cursor: 'pointer',
            fontWeight: activeTab === 'today-consults' ? 600 : 500,
            color: activeTab === 'today-consults' ? '#10b981' : '#64748b',
            borderBottom: activeTab === 'today-consults' ? '3px solid #10b981' : '3px solid transparent',
            display: 'flex',
            alignItems: 'center',
            gap: 8
          }}
        >
          <i className="fas fa-user-md" />
          Today's Consults ({data?.todayConsults?.length || 0})
        </button>

        <button
          type="button"
          onClick={() => handleTabChange('critical-alerts')}
          style={{
            padding: '10px 18px',
            border: 'none',
            background: 'none',
            cursor: 'pointer',
            fontWeight: activeTab === 'critical-alerts' ? 600 : 500,
            color: activeTab === 'critical-alerts' ? '#ef4444' : '#64748b',
            borderBottom: activeTab === 'critical-alerts' ? '3px solid #ef4444' : '3px solid transparent',
            display: 'flex',
            alignItems: 'center',
            gap: 8
          }}
        >
          <i className="fas fa-exclamation-triangle" />
          Critical Alerts ({data?.criticalAlerts?.length || 0})
        </button>

        <button
          type="button"
          onClick={() => handleTabChange('low-stock')}
          style={{
            padding: '10px 18px',
            border: 'none',
            background: 'none',
            cursor: 'pointer',
            fontWeight: activeTab === 'low-stock' ? 600 : 500,
            color: activeTab === 'low-stock' ? '#f59e0b' : '#64748b',
            borderBottom: activeTab === 'low-stock' ? '3px solid #f59e0b' : '3px solid transparent',
            display: 'flex',
            alignItems: 'center',
            gap: 8
          }}
        >
          <i className="fas fa-pills" />
          Low Stock ({data?.lowStockItems?.length || 0})
        </button>
      </div>

      {/* Tab Contents */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px 0', color: '#64748b' }}>
          <i className="fas fa-spinner fa-spin fa-2x" style={{ marginBottom: 12 }} />
          <div>Loading clinical feeds...</div>
        </div>
      ) : (
        <div style={{ background: '#fff', borderRadius: 8, padding: 20, border: '1px solid #e2e8f0' }}>
          {activeTab === 'active-patients' && (
            <div>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: 16 }}>Currently Active Patients</h3>
              {(!data?.admissions || data.admissions.length === 0) ? (
                <div style={{ textAlign: 'center', padding: '40px 0', color: '#94a3b8' }}>
                  <i className="fas fa-check-circle fa-2x" style={{ color: '#10b981', marginBottom: 8 }} />
                  <div>No patients currently admitted to sick bay beds.</div>
                </div>
              ) : (
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.9rem' }}>
                    <thead>
                      <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0', color: '#475569' }}>
                        <th style={{ padding: '10px 12px' }}>Bed Number</th>
                        <th style={{ padding: '10px 12px' }}>Patient Name</th>
                        <th style={{ padding: '10px 12px' }}>Admitted At</th>
                        <th style={{ padding: '10px 12px' }}>Diet / Care Notes</th>
                        <th style={{ padding: '10px 12px' }}>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.admissions.map((adm: any) => (
                        <tr key={adm.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                          <td style={{ padding: '10px 12px', fontWeight: 600, color: '#0f172a' }}>{adm.bed?.bedNumber}</td>
                          <td style={{ padding: '10px 12px' }}>{adm.student?.name}</td>
                          <td style={{ padding: '10px 12px', color: '#64748b' }}>{new Date(adm.admittedAt).toLocaleDateString()} {new Date(adm.admittedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</td>
                          <td style={{ padding: '10px 12px', color: '#0f172a' }}>{adm.dietNotes || 'Standard hydration & rest'}</td>
                          <td style={{ padding: '10px 12px' }}>
                            <span style={{ background: '#dcfce7', color: '#166534', padding: '3px 8px', borderRadius: 4, fontSize: '0.8rem', fontWeight: 600 }}>
                              In Sick Bay
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {activeTab === 'triage-queue' && (
            <div>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: 16 }}>Live Triage Intake Queue</h3>
              {(!data?.triageQueue || data.triageQueue.length === 0) ? (
                <div style={{ textAlign: 'center', padding: '40px 0', color: '#94a3b8' }}>
                  <i className="fas fa-clipboard-check fa-2x" style={{ color: '#10b981', marginBottom: 8 }} />
                  <div>Triage queue is clear. No waiting patients.</div>
                </div>
              ) : (
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.9rem' }}>
                    <thead>
                      <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0', color: '#475569' }}>
                        <th style={{ padding: '10px 12px' }}>Episode Code</th>
                        <th style={{ padding: '10px 12px' }}>Patient</th>
                        <th style={{ padding: '10px 12px' }}>Source</th>
                        <th style={{ padding: '10px 12px' }}>Complaint</th>
                        <th style={{ padding: '10px 12px' }}>Acuity</th>
                        <th style={{ padding: '10px 12px' }}>Vitals</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.triageQueue.map((v: any) => (
                        <tr key={v.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                          <td style={{ padding: '10px 12px', fontWeight: 600 }}>{v.visitCode || 'N/A'}</td>
                          <td style={{ padding: '10px 12px' }}>{v.user?.name || v.patient?.firstName || 'Student'}</td>
                          <td style={{ padding: '10px 12px', color: '#64748b' }}>{v.source}</td>
                          <td style={{ padding: '10px 12px' }}>{v.presentingComplaint || 'Assessment pending'}</td>
                          <td style={{ padding: '10px 12px' }}>
                            <span style={{
                              background: v.acuity === 'RED' ? '#fee2e2' : v.acuity === 'YELLOW' ? '#fef3c7' : '#dcfce7',
                              color: v.acuity === 'RED' ? '#991b1b' : v.acuity === 'YELLOW' ? '#92400e' : '#166534',
                              padding: '3px 8px', borderRadius: 4, fontSize: '0.8rem', fontWeight: 600
                            }}>
                              {v.acuity || 'GREEN'}
                            </span>
                          </td>
                          <td style={{ padding: '10px 12px', color: '#64748b' }}>
                            {v.vitalsRecord?.temp ? `${v.vitalsRecord.temp}°C` : v.temperature ? `${v.temperature}°C` : 'Pending'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {activeTab === 'today-consults' && (
            <div>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: 16 }}>Consultation & Doctor Queue</h3>
              {(!data?.todayConsults || data.todayConsults.length === 0) ? (
                <div style={{ textAlign: 'center', padding: '40px 0', color: '#94a3b8' }}>
                  <i className="fas fa-user-md fa-2x" style={{ color: '#3b82f6', marginBottom: 8 }} />
                  <div>No patients in the active consult queue.</div>
                </div>
              ) : (
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.9rem' }}>
                    <thead>
                      <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0', color: '#475569' }}>
                        <th style={{ padding: '10px 12px' }}>Episode Code</th>
                        <th style={{ padding: '10px 12px' }}>Patient</th>
                        <th style={{ padding: '10px 12px' }}>Triage Vitals</th>
                        <th style={{ padding: '10px 12px' }}>Complaint</th>
                        <th style={{ padding: '10px 12px' }}>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.todayConsults.map((v: any) => (
                        <tr key={v.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                          <td style={{ padding: '10px 12px', fontWeight: 600 }}>{v.visitCode || 'N/A'}</td>
                          <td style={{ padding: '10px 12px' }}>{v.user?.name || 'Student'}</td>
                          <td style={{ padding: '10px 12px', color: '#64748b' }}>
                            {v.vitalsRecord ? `T: ${v.vitalsRecord.temp || '-'}°C | BP: ${v.vitalsRecord.bp || '-'}` : 'Vitals logged'}
                          </td>
                          <td style={{ padding: '10px 12px' }}>{v.presentingComplaint}</td>
                          <td style={{ padding: '10px 12px' }}>
                            <span style={{ background: '#e0e7ff', color: '#3730a3', padding: '3px 8px', borderRadius: 4, fontSize: '0.8rem', fontWeight: 600 }}>
                              {v.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {activeTab === 'critical-alerts' && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: '#ef4444' }}>Critical Clinical Alerts</h3>
                <span style={{ fontSize: '0.8rem', color: '#64748b' }}>
                  Alert Threshold: &gt;= {data?.settings?.tempAlertThreshold || 38.0}°C (Configured per institutional policy)
                </span>
              </div>
              {(!data?.criticalAlerts || data.criticalAlerts.length === 0) ? (
                <div style={{ textAlign: 'center', padding: '40px 0', color: '#94a3b8' }}>
                  <i className="fas fa-shield-alt fa-2x" style={{ color: '#10b981', marginBottom: 8 }} />
                  <div>No critical clinical alerts at this time. All patients within normal limits.</div>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {data.criticalAlerts.map((alt: any, idx: number) => (
                    <div key={idx} style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, padding: 14, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <div style={{ fontWeight: 600, color: '#991b1b', display: 'flex', alignItems: 'center', gap: 8 }}>
                          <i className="fas fa-exclamation-circle" />
                          {alt.patientName} &bull; Acuity: {alt.acuity}
                        </div>
                        <div style={{ fontSize: '0.85rem', color: '#7f1d1d', marginTop: 4 }}>
                          Reported: {alt.reason} {alt.temp ? `(Temperature: ${alt.temp}°C)` : ''}
                        </div>
                      </div>
                      <span style={{ fontSize: '0.75rem', color: '#991b1b', background: '#fee2e2', padding: '4px 8px', borderRadius: 4 }}>
                        Attention Suggested
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'low-stock' && (
            <div>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: 16 }}>Pharmacy Low Stock &amp; Reorder Warning</h3>
              {(!data?.lowStockItems || data.lowStockItems.length === 0) ? (
                <div style={{ textAlign: 'center', padding: '40px 0', color: '#94a3b8' }}>
                  <i className="fas fa-boxes fa-2x" style={{ color: '#10b981', marginBottom: 8 }} />
                  <div>All pharmacy medication inventories are above safety reorder thresholds.</div>
                </div>
              ) : (
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.9rem' }}>
                    <thead>
                      <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0', color: '#475569' }}>
                        <th style={{ padding: '10px 12px' }}>Medication Name</th>
                        <th style={{ padding: '10px 12px' }}>Unit</th>
                        <th style={{ padding: '10px 12px' }}>Current Quantity</th>
                        <th style={{ padding: '10px 12px' }}>Minimum Stock</th>
                        <th style={{ padding: '10px 12px' }}>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.lowStockItems.map((item: any) => (
                        <tr key={item.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                          <td style={{ padding: '10px 12px', fontWeight: 600, color: '#0f172a' }}>{item.drugName}</td>
                          <td style={{ padding: '10px 12px', color: '#64748b' }}>{item.unit}</td>
                          <td style={{ padding: '10px 12px', color: '#ef4444', fontWeight: 700 }}>{item.totalQty}</td>
                          <td style={{ padding: '10px 12px', color: '#64748b' }}>{item.minStock}</td>
                          <td style={{ padding: '10px 12px' }}>
                            <span style={{ background: '#fef3c7', color: '#92400e', padding: '3px 8px', borderRadius: 4, fontSize: '0.8rem', fontWeight: 600 }}>
                              Reorder Required
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
