import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../../lib/api';
import { useToast } from '../../../context/ToastContext';
import '../../../styles/portal.css';

interface SchoolRevenueBreakdown {
  id: string;
  code: string;
  name: string;
  type: string;
  country: string;
  status: string;
  planName: string;
  totalStudents: number;
  activeStudents: number;
  ratePerStudent: number;
  monthlyAmount: number;
  annualAmount: number;
  adminContact: {
    name: string;
    email: string;
    phone?: string;
  } | null;
  onboardedAt: string;
}

interface RevenueMetrics {
  monthlyRecurringRevenue: number;
  annualRecurringRevenue: number;
  ratePerStudent: number;
  totalActiveStudents: number;
  totalEnrolledStudents: number;
  activeSchoolsCount: number;
  totalRegisteredSchools: number;
  averageRevenuePerSchool: number;
}

interface TrendMonth {
  month: string;
  billableStudents: number;
  revenue: number;
}

export default function GlobalRevenue() {
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState<RevenueMetrics | null>(null);
  const [schools, setSchools] = useState<SchoolRevenueBreakdown[]>([]);
  const [trend, setTrend] = useState<TrendMonth[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  useEffect(() => {
    fetchRevenueData();
  }, []);

  const fetchRevenueData = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/api/acadex/revenue');
      setMetrics(data.metrics);
      setSchools(data.schools || []);
      setTrend(data.trend || []);
    } catch (err: any) {
      console.error('Failed to fetch platform revenue:', err);
      showToast(err.response?.data?.error || 'Failed to load revenue data', 'error');
    } finally {
      setLoading(false);
    }
  };

  const filteredSchools = schools.filter(s => {
    const matchesSearch =
      s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.country.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus =
      statusFilter === 'ALL' ||
      s.status.toLowerCase() === statusFilter.toLowerCase();
    return matchesSearch && matchesStatus;
  });

  const exportCSV = () => {
    if (filteredSchools.length === 0) {
      showToast('No school data to export', 'warning');
      return;
    }

    const headers = [
      'License Code',
      'School Name',
      'Country',
      'Status',
      'Plan',
      'Enrolled Students',
      'Billable Active Students',
      'Rate Per Student (USD)',
      'Monthly SaaS Bill (USD)',
      'Annual SaaS Bill (USD)',
      'Admin Name',
      'Admin Email',
      'Onboarded Date'
    ];

    const rows = filteredSchools.map(s => [
      `"${s.code}"`,
      `"${s.name.replace(/"/g, '""')}"`,
      `"${s.country}"`,
      `"${s.status}"`,
      `"${s.planName}"`,
      s.totalStudents,
      s.activeStudents,
      s.ratePerStudent.toFixed(2),
      s.monthlyAmount.toFixed(2),
      s.annualAmount.toFixed(2),
      `"${s.adminContact?.name || 'N/A'}"`,
      `"${s.adminContact?.email || 'N/A'}"`,
      `"${new Date(s.onboardedAt).toLocaleDateString()}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `acadex_global_revenue_${new Date().toISOString().substring(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('Platform revenue report exported successfully', 'success');
  };

  return (
    <div className="global-revenue-page">
      <div className="portal-page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 15 }}>
        <div>
          <h1>Global Platform Revenue</h1>
          <p>Official SaaS billing and revenue command center. Platform subscription is calculated at <strong>$2.00 / active student / month</strong>.</p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button className="portal-btn-secondary" onClick={fetchRevenueData} disabled={loading}>
            <i className={`fas fa-sync-alt ${loading ? 'fa-spin' : ''}`} style={{ marginRight: 6 }}></i> Refresh
          </button>
          <button className="portal-btn-primary" onClick={exportCSV} disabled={loading || filteredSchools.length === 0}>
            <i className="fas fa-file-download" style={{ marginRight: 6 }}></i> Export Billing Statement
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="portal-stats-grid" style={{ marginBottom: 25 }}>
        <div className="portal-stat-card">
          <div className="portal-stat-icon" style={{ backgroundColor: 'rgba(52, 211, 153, 0.15)', color: '#34d399' }}>
            <i className="fas fa-money-bill-wave"></i>
          </div>
          <div className="portal-stat-info">
            <h3>{loading ? '...' : `$${(metrics?.monthlyRecurringRevenue || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}</h3>
            <p>Monthly Recurring Revenue (MRR)</p>
          </div>
        </div>

        <div className="portal-stat-card">
          <div className="portal-stat-icon" style={{ backgroundColor: 'rgba(99, 102, 241, 0.15)', color: '#6366f1' }}>
            <i className="fas fa-chart-line"></i>
          </div>
          <div className="portal-stat-info">
            <h3>{loading ? '...' : `$${(metrics?.annualRecurringRevenue || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}</h3>
            <p>Annualized Run Rate (ARR)</p>
          </div>
        </div>

        <div className="portal-stat-card">
          <div className="portal-stat-icon" style={{ backgroundColor: 'rgba(192, 132, 252, 0.15)', color: '#c084fc' }}>
            <i className="fas fa-user-graduate"></i>
          </div>
          <div className="portal-stat-info">
            <h3>{loading ? '...' : (metrics?.totalActiveStudents || 0).toLocaleString()}</h3>
            <p>Billable Active Students</p>
          </div>
        </div>

        <div className="portal-stat-card">
          <div className="portal-stat-icon" style={{ backgroundColor: 'rgba(56, 189, 248, 0.15)', color: '#38bdf8' }}>
            <i className="fas fa-university"></i>
          </div>
          <div className="portal-stat-info">
            <h3>{loading ? '...' : `${metrics?.activeSchoolsCount || 0} / ${metrics?.totalRegisteredSchools || 0}`}</h3>
            <p>Active / Total School Tenants</p>
          </div>
        </div>
      </div>

      {/* Pricing Model Highlight & Historical Trend */}
      <div className="portal-grid-2" style={{ marginBottom: 25 }}>
        <div className="portal-card">
          <div className="portal-card-header">
            <h2><i className="fas fa-calculator" style={{ marginRight: 8, color: 'var(--portal-primary)' }}></i>Pricing Architecture</h2>
            <span className="portal-badge success">Live Billing Policy</span>
          </div>
          <div className="portal-card-body">
            <div style={{ background: '#f8fafc', padding: 20, borderRadius: 12, border: '1px solid #e2e8f0' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <span style={{ fontWeight: 600, color: '#475569' }}>Standard Tenant Subscription</span>
                <span style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--portal-primary)' }}>$2.00 <small style={{ fontSize: '0.8rem', color: '#64748b' }}>/ student / mo</small></span>
              </div>
              <p style={{ fontSize: '0.875rem', color: '#64748b', margin: 0, lineHeight: 1.5 }}>
                Every tenant is invoiced monthly based exclusively on active, enrolled students. Inactive, suspended, or archived records are excluded automatically from the billable count.
              </p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 15, marginTop: 15 }}>
              <div style={{ padding: 12, background: '#f1f5f9', borderRadius: 8 }}>
                <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: '#64748b', fontWeight: 700 }}>Avg Revenue / School</div>
                <div style={{ fontSize: '1.25rem', fontWeight: 700, color: '#1e293b', marginTop: 4 }}>
                  ${(metrics?.averageRevenuePerSchool || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}<small style={{ fontSize: '0.75rem' }}>/mo</small>
                </div>
              </div>
              <div style={{ padding: 12, background: '#f1f5f9', borderRadius: 8 }}>
                <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: '#64748b', fontWeight: 700 }}>Total Enrolled Registry</div>
                <div style={{ fontSize: '1.25rem', fontWeight: 700, color: '#1e293b', marginTop: 4 }}>
                  {(metrics?.totalEnrolledStudents || 0).toLocaleString()} <small style={{ fontSize: '0.75rem' }}>students</small>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="portal-card">
          <div className="portal-card-header">
            <h2><i className="fas fa-chart-bar" style={{ marginRight: 8, color: '#6366f1' }}></i>6-Month MRR Trajectory</h2>
          </div>
          <div className="portal-card-body">
            <div style={{ display: 'flex', alignItems: 'flex-end', height: 160, gap: 12, paddingTop: 10 }}>
              {trend.map((t, idx) => {
                const maxRev = Math.max(...trend.map(item => item.revenue), 100);
                const heightPct = Math.max(15, Math.round((t.revenue / maxRev) * 100));
                return (
                  <div key={idx} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', height: '100%', justifyContent: 'flex-end' }}>
                    <div style={{ fontSize: '0.7rem', fontWeight: 700, color: '#475569', marginBottom: 4 }}>
                      ${Math.round(t.revenue)}
                    </div>
                    <div
                      style={{
                        width: '100%',
                        height: `${heightPct}%`,
                        background: 'linear-gradient(to top, #6366f1, #38bdf8)',
                        borderRadius: '6px 6px 0 0',
                        transition: 'height 0.4s ease'
                      }}
                      title={`${t.month}: ${t.billableStudents} students ($${t.revenue.toFixed(2)})`}
                    ></div>
                    <div style={{ fontSize: '0.7rem', color: '#64748b', marginTop: 6, whiteSpace: 'nowrap' }}>
                      {t.month.split(' ')[0]}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* School Breakdown Table */}
      <div className="portal-card" style={{ overflow: 'visible' }}>
        <div className="portal-card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 15 }}>
          <h2><i className="fas fa-list-alt" style={{ marginRight: 8, color: 'var(--portal-primary)' }}></i>Tenant Billing Breakdown</h2>
          <div style={{ display: 'flex', gap: 10 }}>
            <input
              type="text"
              placeholder="Search school name or code..."
              className="portal-input"
              style={{ width: 260 }}
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
            <select
              className="portal-input"
              style={{ width: 140 }}
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
            >
              <option value="ALL">All Status</option>
              <option value="active">Active Only</option>
              <option value="suspended">Suspended</option>
            </select>
          </div>
        </div>

        <div className="portal-card-body" style={{ padding: 0 }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: 50 }}>
              <i className="fas fa-spinner fa-spin" style={{ fontSize: '2rem', color: 'var(--portal-primary)' }}></i>
              <p style={{ marginTop: 10, color: '#64748b' }}>Calculating platform revenue metrics...</p>
            </div>
          ) : (
            <table className="portal-table">
              <thead>
                <tr>
                  <th>License ID</th>
                  <th>School Name</th>
                  <th>Status</th>
                  <th>Billable Students</th>
                  <th>Rate</th>
                  <th>Monthly SaaS Fee</th>
                  <th>Annual Value</th>
                  <th>Primary Admin</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredSchools.length > 0 ? (
                  filteredSchools.map(school => (
                    <tr key={school.id}>
                      <td style={{ fontWeight: 700, color: 'var(--portal-primary)', fontFamily: 'monospace' }}>
                        {school.code}
                      </td>
                      <td>
                        <div style={{ fontWeight: 600 }}>{school.name}</div>
                        <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{school.country} • {school.type}</div>
                      </td>
                      <td>
                        <span className={`portal-badge ${school.status === 'active' ? 'success' : 'danger'}`}>
                          {school.status.toUpperCase()}
                        </span>
                      </td>
                      <td style={{ fontWeight: 700 }}>
                        {school.activeStudents.toLocaleString()}
                        <div style={{ fontSize: '0.7rem', color: '#94a3b8' }}>of {school.totalStudents} enrolled</div>
                      </td>
                      <td>${school.ratePerStudent.toFixed(2)}/mo</td>
                      <td style={{ fontWeight: 700, color: school.status === 'active' ? '#059669' : '#94a3b8' }}>
                        ${school.monthlyAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td style={{ color: '#475569' }}>
                        ${school.annualAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td>
                        {school.adminContact ? (
                          <div>
                            <div style={{ fontSize: '0.85rem', fontWeight: 600 }}>{school.adminContact.name}</div>
                            <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{school.adminContact.email}</div>
                          </div>
                        ) : (
                          <span style={{ color: '#94a3b8', fontSize: '0.85rem' }}>No admin registered</span>
                        )}
                      </td>
                      <td>
                        <button
                          className="portal-btn-secondary"
                          style={{ padding: '6px 12px', fontSize: '0.8rem' }}
                          onClick={() => navigate(`/acadex/schools/${school.code}`)}
                        >
                          <i className="fas fa-eye" style={{ marginRight: 4 }}></i> View Profile
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={9} style={{ textAlign: 'center', padding: 40, color: '#94a3b8' }}>
                      No schools match the specified criteria.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
