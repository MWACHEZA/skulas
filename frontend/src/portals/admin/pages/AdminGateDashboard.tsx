import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../../lib/api';
import { SearchInput, ExportButton, Pagination, usePagination } from '../../../components/shared';
import { format } from 'date-fns';

interface GateDashboardData {
  kpis: {
    currentlyOnCampus: number;
    checkedOutToday: number;
    deniedToday: number;
    notYetArrived: number;
    lateArrivals: number;
  };
  cutoffTime: string;
  currentlyOnCampus: any[];
  checkedOut: any[];
  deniedToday: any[];
  notYetArrived: any[];
  recentScans: any[];
}

export default function AdminGateDashboard() {
  const navigate = useNavigate();
  const [data, setData] = useState<GateDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState<'on_campus' | 'not_arrived' | 'denied' | 'all_scans'>('on_campus');
  const [selectedDate, setSelectedDate] = useState(() => format(new Date(), 'yyyy-MM-dd'));

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const res = await api.get('/api/gate/dashboard', {
        params: { date: selectedDate }
      });
      if (res.data.data) {
        setData(res.data.data);
      }
    } catch (err) {
      console.error('Failed to load gate dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, [selectedDate]);

  const kpis = data?.kpis || {
    currentlyOnCampus: 0,
    checkedOutToday: 0,
    deniedToday: 0,
    notYetArrived: 0,
    lateArrivals: 0
  };

  // Filter datasets by search query
  const searchLower = search.toLowerCase();

  const filteredOnCampus = (data?.currentlyOnCampus || []).filter((item: any) => {
    const student = item.student;
    return !search || (
      student?.name?.toLowerCase().includes(searchLower) ||
      student?.studentId?.toLowerCase().includes(searchLower) ||
      student?.class?.name?.toLowerCase().includes(searchLower)
    );
  });

  const filteredNotArrived = (data?.notYetArrived || []).filter((item: any) => {
    return !search || (
      item.name?.toLowerCase().includes(searchLower) ||
      item.regNo?.toLowerCase().includes(searchLower) ||
      item.className?.toLowerCase().includes(searchLower) ||
      item.parentName?.toLowerCase().includes(searchLower)
    );
  });

  const filteredDenied = (data?.deniedToday || []).filter((item: any) => {
    return !search || (
      item.name?.toLowerCase().includes(searchLower) ||
      item.regNo?.toLowerCase().includes(searchLower) ||
      item.className?.toLowerCase().includes(searchLower) ||
      item.denialReason?.toLowerCase().includes(searchLower)
    );
  });

  const filteredAllScans = (data?.recentScans || []).filter((item: any) => {
    const name = item.student?.name || item.staff?.name || '';
    const reg = item.student?.studentId || item.staff?.staffId || '';
    return !search || (
      name.toLowerCase().includes(searchLower) ||
      reg.toLowerCase().includes(searchLower) ||
      item.entryStatus?.toLowerCase().includes(searchLower)
    );
  });

  const onCampusPage = usePagination(filteredOnCampus, 15);
  const notArrivedPage = usePagination(filteredNotArrived, 15);
  const deniedPage = usePagination(filteredDenied, 15);
  const allScansPage = usePagination(filteredAllScans, 15);

  // Export datasets
  const exportColumnsMap: Record<string, any[]> = {
    on_campus: [
      { header: 'Student Name', key: 'name' },
      { header: 'Reg No', key: 'regNo' },
      { header: 'Class', key: 'className' },
      { header: 'Arrival Time', key: 'scannedAt' },
      { header: 'Status', key: 'status' }
    ],
    not_arrived: [
      { header: 'Student Name', key: 'name' },
      { header: 'Reg No', key: 'regNo' },
      { header: 'Class', key: 'className' },
      { header: 'Parent Name', key: 'parentName' },
      { header: 'Parent Phone', key: 'parentPhone' }
    ],
    denied: [
      { header: 'Student Name', key: 'name' },
      { header: 'Reg No', key: 'regNo' },
      { header: 'Class', key: 'className' },
      { header: 'Balance Owing', key: 'balance' },
      { header: 'Denial Reason', key: 'denialReason' },
      { header: 'Time', key: 'scannedAt' }
    ],
    all_scans: [
      { header: 'Name', key: 'name' },
      { header: 'Type', key: 'type' },
      { header: 'Direction', key: 'direction' },
      { header: 'Status', key: 'status' },
      { header: 'Timestamp', key: 'scannedAt' }
    ]
  };

  const getExportData = (): any[] => {
    if (activeTab === 'on_campus') {
      return filteredOnCampus.map((l: any) => ({
        name: l.student?.name,
        regNo: l.student?.studentId,
        className: l.student?.class?.name || '—',
        scannedAt: format(new Date(l.scannedAt), 'HH:mm:ss'),
        status: l.feeStatusSnapshot || 'ALLOWED'
      }));
    }
    if (activeTab === 'not_arrived') {
      return filteredNotArrived.map((s: any) => ({
        name: s.name,
        regNo: s.regNo,
        className: s.className || '—',
        parentName: s.parentName || '—',
        parentPhone: s.parentPhone || '—'
      }));
    }
    if (activeTab === 'denied') {
      return filteredDenied.map((d: any) => ({
        name: d.name,
        regNo: d.regNo,
        className: d.className || '—',
        balance: `$${Number(d.balance).toFixed(2)}`,
        denialReason: d.denialReason,
        scannedAt: format(new Date(d.scannedAt), 'HH:mm:ss')
      }));
    }
    return filteredAllScans.map((l: any) => ({
      name: l.student?.name || l.staff?.name || 'Unknown',
      type: l.student ? 'Student' : 'Staff',
      direction: l.direction,
      status: l.entryStatus,
      scannedAt: format(new Date(l.scannedAt), 'HH:mm:ss')
    }));
  };

  return (
    <div style={{ padding: '24px', maxWidth: '1400px', margin: '0 auto', fontFamily: 'Inter, system-ui, sans-serif' }}>
      {/* Top Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '16px',
        marginBottom: '24px'
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '24px' }}>🛡️</span>
            <h1 style={{ fontSize: '24px', fontWeight: '800', margin: 0, color: '#0f172a' }}>
              Gate Security & Real-Time Campus Attendance
            </h1>
          </div>
          <p style={{ color: '#64748b', fontSize: '14px', margin: '4px 0 0' }}>
            Live morning gate scans, late arrival audits, absent day scholars, and fee compliance tracking
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <input
            type="date"
            value={selectedDate}
            onChange={e => setSelectedDate(e.target.value)}
            style={{
              padding: '8px 12px',
              border: '1px solid #cbd5e1',
              borderRadius: '8px',
              fontSize: '13px',
              outline: 'none'
            }}
          />

          <button
            onClick={() => window.open('/gate', '_blank')}
            style={{
              padding: '9px 16px',
              backgroundColor: '#0284c7',
              color: '#fff',
              border: 'none',
              borderRadius: '8px',
              fontSize: '13px',
              fontWeight: '700',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            Launch Gate Scanner PWA ↗
          </button>

          <button
            onClick={() => navigate('/admin/qr-cards')}
            style={{
              padding: '9px 16px',
              backgroundColor: '#f8fafc',
              color: '#0f172a',
              border: '1px solid #cbd5e1',
              borderRadius: '8px',
              fontSize: '13px',
              fontWeight: '600',
              cursor: 'pointer'
            }}
          >
            🪪 Printable ID QR Cards
          </button>

          <button
            onClick={fetchDashboardData}
            style={{
              padding: '9px 14px',
              backgroundColor: '#f1f5f9',
              color: '#475569',
              border: '1px solid #cbd5e1',
              borderRadius: '8px',
              fontSize: '13px',
              fontWeight: '600',
              cursor: 'pointer'
            }}
          >
            ↻ Refresh
          </button>
        </div>
      </div>

      {/* 5 Live KPI Summary Cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
        gap: '16px',
        marginBottom: '24px'
      }}>
        {/* On Campus */}
        <div style={{
          backgroundColor: '#fff',
          borderRadius: '12px',
          padding: '18px',
          border: '1px solid #e2e8f0',
          borderLeft: '5px solid #10b981',
          boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
        }}>
          <div style={{ fontSize: '12px', fontWeight: '700', color: '#64748b', textTransform: 'uppercase' }}>
            Currently On Campus
          </div>
          <div style={{ fontSize: '28px', fontWeight: '800', color: '#059669', margin: '6px 0 2px' }}>
            {kpis.currentlyOnCampus}
          </div>
          <div style={{ fontSize: '12px', color: '#94a3b8' }}>
            Scanned IN with no exit today
          </div>
        </div>

        {/* Checked Out */}
        <div style={{
          backgroundColor: '#fff',
          borderRadius: '12px',
          padding: '18px',
          border: '1px solid #e2e8f0',
          borderLeft: '5px solid #3b82f6',
          boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
        }}>
          <div style={{ fontSize: '12px', fontWeight: '700', color: '#64748b', textTransform: 'uppercase' }}>
            Checked Out Today
          </div>
          <div style={{ fontSize: '28px', fontWeight: '800', color: '#2563eb', margin: '6px 0 2px' }}>
            {kpis.checkedOutToday}
          </div>
          <div style={{ fontSize: '12px', color: '#94a3b8' }}>
            Scanned OUT through gate
          </div>
        </div>

        {/* Denied Today */}
        <div style={{
          backgroundColor: '#fff',
          borderRadius: '12px',
          padding: '18px',
          border: '1px solid #e2e8f0',
          borderLeft: '5px solid #ef4444',
          boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
        }}>
          <div style={{ fontSize: '12px', fontWeight: '700', color: '#64748b', textTransform: 'uppercase' }}>
            Denied Entry Today
          </div>
          <div style={{ fontSize: '28px', fontWeight: '800', color: '#dc2626', margin: '6px 0 2px' }}>
            {kpis.deniedToday}
          </div>
          <div style={{ fontSize: '12px', color: '#94a3b8' }}>
            Fee arrears / defaulted plans
          </div>
        </div>

        {/* Not Yet Arrived */}
        <div style={{
          backgroundColor: '#fff',
          borderRadius: '12px',
          padding: '18px',
          border: '1px solid #e2e8f0',
          borderLeft: '5px solid #f59e0b',
          boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
        }}>
          <div style={{ fontSize: '12px', fontWeight: '700', color: '#64748b', textTransform: 'uppercase' }}>
            Not Yet Arrived
          </div>
          <div style={{ fontSize: '28px', fontWeight: '800', color: '#d97706', margin: '6px 0 2px' }}>
            {kpis.notYetArrived}
          </div>
          <div style={{ fontSize: '12px', color: '#94a3b8' }}>
            Day scholars awaiting check-in
          </div>
        </div>

        {/* Late Arrivals */}
        <div style={{
          backgroundColor: '#fff',
          borderRadius: '12px',
          padding: '18px',
          border: '1px solid #e2e8f0',
          borderLeft: '5px solid #8b5cf6',
          boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
        }}>
          <div style={{ fontSize: '12px', fontWeight: '700', color: '#64748b', textTransform: 'uppercase' }}>
            Late Arrivals
          </div>
          <div style={{ fontSize: '28px', fontWeight: '800', color: '#7c3aed', margin: '6px 0 2px' }}>
            {kpis.lateArrivals}
          </div>
          <div style={{ fontSize: '12px', color: '#94a3b8' }}>
            Arrived after {data?.cutoffTime || '08:00'} cutoff
          </div>
        </div>
      </div>

      {/* Main Tabbed Container */}
      <div style={{
        backgroundColor: '#fff',
        borderRadius: '16px',
        border: '1px solid #e2e8f0',
        overflow: 'hidden',
        boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
      }}>
        {/* Navigation Tabs Bar */}
        <div style={{
          display: 'flex',
          borderBottom: '1px solid #e2e8f0',
          backgroundColor: '#f8fafc',
          padding: '0 16px',
          gap: '8px'
        }}>
          <button
            onClick={() => setActiveTab('on_campus')}
            style={{
              padding: '14px 18px',
              border: 'none',
              background: 'none',
              fontSize: '14px',
              fontWeight: '700',
              cursor: 'pointer',
              color: activeTab === 'on_campus' ? '#0284c7' : '#64748b',
              borderBottom: activeTab === 'on_campus' ? '3px solid #0284c7' : '3px solid transparent'
            }}
          >
            🏢 On Campus Now ({filteredOnCampus.length})
          </button>

          <button
            onClick={() => setActiveTab('not_arrived')}
            style={{
              padding: '14px 18px',
              border: 'none',
              background: 'none',
              fontSize: '14px',
              fontWeight: '700',
              cursor: 'pointer',
              color: activeTab === 'not_arrived' ? '#d97706' : '#64748b',
              borderBottom: activeTab === 'not_arrived' ? '3px solid #d97706' : '3px solid transparent'
            }}
          >
            ⏳ Not Yet Arrived ({filteredNotArrived.length})
          </button>

          <button
            onClick={() => setActiveTab('denied')}
            style={{
              padding: '14px 18px',
              border: 'none',
              background: 'none',
              fontSize: '14px',
              fontWeight: '700',
              cursor: 'pointer',
              color: activeTab === 'denied' ? '#dc2626' : '#64748b',
              borderBottom: activeTab === 'denied' ? '3px solid #dc2626' : '3px solid transparent'
            }}
          >
            ⛔ Denied Entry ({filteredDenied.length})
          </button>

          <button
            onClick={() => setActiveTab('all_scans')}
            style={{
              padding: '14px 18px',
              border: 'none',
              background: 'none',
              fontSize: '14px',
              fontWeight: '700',
              cursor: 'pointer',
              color: activeTab === 'all_scans' ? '#475569' : '#64748b',
              borderBottom: activeTab === 'all_scans' ? '3px solid #475569' : '3px solid transparent'
            }}
          >
            📋 All Scans Audit Trail ({filteredAllScans.length})
          </button>
        </div>

        {/* Action Controls Bar */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '16px 20px',
          borderBottom: '1px solid #e2e8f0',
          gap: '16px',
          flexWrap: 'wrap'
        }}>
          <div style={{ width: '320px' }}>
            <SearchInput
              value={search}
              onChange={setSearch}
              placeholder={`Search in ${activeTab.replace('_', ' ')}...`}
            />
          </div>

          <ExportButton
            columns={exportColumnsMap[activeTab]}
            data={getExportData()}
            filename={`gate_${activeTab}_${selectedDate}`}
            title={`Gate Security - ${activeTab.toUpperCase()} (${selectedDate})`}
          />
        </div>

        {/* Tab 1: On Campus Now */}
        {activeTab === 'on_campus' && (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '14px' }}>
              <thead>
                <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#475569' }}>
                  <th style={{ padding: '12px 16px', fontWeight: '700' }}>Student</th>
                  <th style={{ padding: '12px 16px', fontWeight: '700' }}>Reg Number</th>
                  <th style={{ padding: '12px 16px', fontWeight: '700' }}>Class / Form</th>
                  <th style={{ padding: '12px 16px', fontWeight: '700' }}>Arrival Time</th>
                  <th style={{ padding: '12px 16px', fontWeight: '700' }}>Gate Guard</th>
                  <th style={{ padding: '12px 16px', fontWeight: '700' }}>Fee Status</th>
                </tr>
              </thead>
              <tbody>
                {filteredOnCampus.length === 0 ? (
                  <tr>
                    <td colSpan={6} style={{ padding: '32px', textAlign: 'center', color: '#94a3b8' }}>
                      No students currently checked in on campus.
                    </td>
                  </tr>
                ) : (
                  onCampusPage.paginatedItems.map((l: any) => (
                    <tr key={l.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '12px 16px', fontWeight: '600', color: '#0f172a' }}>
                        {l.student?.name}
                      </td>
                      <td style={{ padding: '12px 16px', color: '#64748b' }}>
                        {l.student?.studentId}
                      </td>
                      <td style={{ padding: '12px 16px', color: '#475569' }}>
                        {l.student?.class?.name || '—'}
                      </td>
                      <td style={{ padding: '12px 16px', fontWeight: '600', color: '#059669' }}>
                        {format(new Date(l.scannedAt), 'HH:mm:ss')}
                      </td>
                      <td style={{ padding: '12px 16px', color: '#64748b' }}>
                        {l.scannedByGuard?.name || 'Gate Officer'}
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <span style={{
                          padding: '3px 8px',
                          borderRadius: '6px',
                          fontSize: '11px',
                          fontWeight: '700',
                          backgroundColor: '#ecfdf5',
                          color: '#059669'
                        }}>
                          {l.feeStatusSnapshot || 'PAID'}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
            <Pagination
              currentPage={onCampusPage.currentPage}
              totalItems={onCampusPage.totalItems}
              pageSize={onCampusPage.pageSize}
              onPageChange={onCampusPage.setCurrentPage}
              onPageSizeChange={onCampusPage.setPageSize}
              itemLabel="students on campus"
            />
          </div>
        )}

        {/* Tab 2: Not Yet Arrived */}
        {activeTab === 'not_arrived' && (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '14px' }}>
              <thead>
                <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#475569' }}>
                  <th style={{ padding: '12px 16px', fontWeight: '700' }}>Student Name</th>
                  <th style={{ padding: '12px 16px', fontWeight: '700' }}>Reg Number</th>
                  <th style={{ padding: '12px 16px', fontWeight: '700' }}>Class / Form</th>
                  <th style={{ padding: '12px 16px', fontWeight: '700' }}>Parent / Guardian</th>
                  <th style={{ padding: '12px 16px', fontWeight: '700' }}>Parent Contact</th>
                  <th style={{ padding: '12px 16px', fontWeight: '700' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredNotArrived.length === 0 ? (
                  <tr>
                    <td colSpan={6} style={{ padding: '32px', textAlign: 'center', color: '#94a3b8' }}>
                      All day scholars have arrived at school!
                    </td>
                  </tr>
                ) : (
                  notArrivedPage.paginatedItems.map((s: any) => (
                    <tr key={s.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '12px 16px', fontWeight: '600', color: '#0f172a' }}>
                        {s.name}
                      </td>
                      <td style={{ padding: '12px 16px', color: '#64748b' }}>
                        {s.regNo}
                      </td>
                      <td style={{ padding: '12px 16px', color: '#475569' }}>
                        {s.className || '—'}
                      </td>
                      <td style={{ padding: '12px 16px', color: '#334155' }}>
                        {s.parentName || 'Parent / Guardian'}
                      </td>
                      <td style={{ padding: '12px 16px', color: '#0284c7', fontWeight: '600' }}>
                        {s.parentPhone ? (
                          <a href={`tel:${s.parentPhone}`} style={{ color: '#0284c7', textDecoration: 'none' }}>
                            📞 {s.parentPhone}
                          </a>
                        ) : (
                          <span style={{ color: '#94a3b8' }}>No phone recorded</span>
                        )}
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        {s.parentPhone && (
                          <button
                            onClick={() => alert(`Prompting absent SMS reminder to ${s.parentPhone} for ${s.name}...`)}
                            style={{
                              padding: '5px 10px',
                              backgroundColor: '#f1f5f9',
                              border: '1px solid #cbd5e1',
                              borderRadius: '6px',
                              fontSize: '12px',
                              fontWeight: '600',
                              cursor: 'pointer'
                            }}
                          >
                            Send SMS Notice
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
            <Pagination
              currentPage={notArrivedPage.currentPage}
              totalItems={notArrivedPage.totalItems}
              pageSize={notArrivedPage.pageSize}
              onPageChange={notArrivedPage.setCurrentPage}
              onPageSizeChange={notArrivedPage.setPageSize}
              itemLabel="day scholars"
            />
          </div>
        )}

        {/* Tab 3: Denied Today */}
        {activeTab === 'denied' && (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '14px' }}>
              <thead>
                <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#475569' }}>
                  <th style={{ padding: '12px 16px', fontWeight: '700' }}>Student Name</th>
                  <th style={{ padding: '12px 16px', fontWeight: '700' }}>Reg Number</th>
                  <th style={{ padding: '12px 16px', fontWeight: '700' }}>Class / Form</th>
                  <th style={{ padding: '12px 16px', fontWeight: '700' }}>Outstanding Balance</th>
                  <th style={{ padding: '12px 16px', fontWeight: '700' }}>Denial Reason</th>
                  <th style={{ padding: '12px 16px', fontWeight: '700' }}>Scanned Time</th>
                  <th style={{ padding: '12px 16px', fontWeight: '700' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredDenied.length === 0 ? (
                  <tr>
                    <td colSpan={7} style={{ padding: '32px', textAlign: 'center', color: '#94a3b8' }}>
                      No students denied entry today.
                    </td>
                  </tr>
                ) : (
                  deniedPage.paginatedItems.map((d: any) => (
                    <tr key={d.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '12px 16px', fontWeight: '600', color: '#0f172a' }}>
                        {d.name}
                      </td>
                      <td style={{ padding: '12px 16px', color: '#64748b' }}>
                        {d.regNo}
                      </td>
                      <td style={{ padding: '12px 16px', color: '#475569' }}>
                        {d.className || '—'}
                      </td>
                      <td style={{ padding: '12px 16px', fontWeight: '700', color: '#dc2626' }}>
                        ${Number(d.balance).toFixed(2)}
                      </td>
                      <td style={{ padding: '12px 16px', color: '#64748b', fontSize: '13px' }}>
                        {d.denialReason}
                      </td>
                      <td style={{ padding: '12px 16px', color: '#475569' }}>
                        {format(new Date(d.scannedAt), 'HH:mm:ss')}
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <button
                          onClick={() => navigate(`/bursar/fees?studentId=${d.studentId}&tab=payment-plans`)}
                          style={{
                            padding: '6px 12px',
                            backgroundColor: '#0284c7',
                            color: '#fff',
                            border: 'none',
                            borderRadius: '6px',
                            fontSize: '12px',
                            fontWeight: '700',
                            cursor: 'pointer',
                            whiteSpace: 'nowrap'
                          }}
                        >
                          Create Payment Plan Now →
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
            <Pagination
              currentPage={deniedPage.currentPage}
              totalItems={deniedPage.totalItems}
              pageSize={deniedPage.pageSize}
              onPageChange={deniedPage.setCurrentPage}
              onPageSizeChange={deniedPage.setPageSize}
              itemLabel="denied scans"
            />
          </div>
        )}

        {/* Tab 4: All Scans Timeline */}
        {activeTab === 'all_scans' && (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '14px' }}>
              <thead>
                <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#475569' }}>
                  <th style={{ padding: '12px 16px', fontWeight: '700' }}>Time</th>
                  <th style={{ padding: '12px 16px', fontWeight: '700' }}>Individual</th>
                  <th style={{ padding: '12px 16px', fontWeight: '700' }}>Type</th>
                  <th style={{ padding: '12px 16px', fontWeight: '700' }}>Direction</th>
                  <th style={{ padding: '12px 16px', fontWeight: '700' }}>Result Status</th>
                  <th style={{ padding: '12px 16px', fontWeight: '700' }}>Device</th>
                </tr>
              </thead>
              <tbody>
                {filteredAllScans.length === 0 ? (
                  <tr>
                    <td colSpan={6} style={{ padding: '32px', textAlign: 'center', color: '#94a3b8' }}>
                      No scan events logged for this date.
                    </td>
                  </tr>
                ) : (
                  allScansPage.paginatedItems.map((l: any) => (
                    <tr key={l.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '12px 16px', fontWeight: '600', color: '#475569' }}>
                        {format(new Date(l.scannedAt), 'HH:mm:ss')}
                      </td>
                      <td style={{ padding: '12px 16px', fontWeight: '600', color: '#0f172a' }}>
                        {l.student?.name || l.staff?.name || 'Unknown'}
                      </td>
                      <td style={{ padding: '12px 16px', color: '#64748b' }}>
                        {l.student ? 'Student' : 'Staff'}
                      </td>
                      <td style={{ padding: '12px 16px', fontWeight: '700' }}>
                        <span style={{
                          color: l.direction === 'IN' ? '#059669' : '#2563eb'
                        }}>
                          {l.direction === 'IN' ? '☀️ Entry (IN)' : '🌙 Exit (OUT)'}
                        </span>
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <span style={{
                          padding: '3px 8px',
                          borderRadius: '6px',
                          fontSize: '11px',
                          fontWeight: '700',
                          backgroundColor: l.entryStatus === 'allowed' ? '#ecfdf5' : (l.entryStatus === 'override' ? '#fef3c7' : '#fef2f2'),
                          color: l.entryStatus === 'allowed' ? '#059669' : (l.entryStatus === 'override' ? '#d97706' : '#dc2626')
                        }}>
                          {l.entryStatus.toUpperCase()}
                        </span>
                      </td>
                      <td style={{ padding: '12px 16px', color: '#64748b', fontSize: '12px' }}>
                        {l.deviceId || 'GATE-STATION'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
            <Pagination
              currentPage={allScansPage.currentPage}
              totalItems={allScansPage.totalItems}
              pageSize={allScansPage.pageSize}
              onPageChange={allScansPage.setCurrentPage}
              onPageSizeChange={allScansPage.setPageSize}
              itemLabel="gate scan events"
            />
          </div>
        )}
      </div>
    </div>
  );
}
