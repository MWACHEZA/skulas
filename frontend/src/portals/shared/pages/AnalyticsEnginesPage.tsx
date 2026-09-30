import React, { useState, useEffect } from 'react';
import api from '../../../lib/api';
import AnalyticsCard from '../../../components/shared/AnalyticsCard';
import {
  GraduationCap,
  DollarSign,
  CalendarCheck,
  Building2,
  BookOpen,
  RefreshCw,
  TrendingUp,
  AlertTriangle,
  Users,
  Bed,
  Wrench,
  CheckCircle,
  Clock
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend
} from 'recharts';
import { toast } from '../../../context/ToastContext';

export default function AnalyticsEnginesPage() {
  const [activeEngine, setActiveEngine] = useState<'finance' | 'academics' | 'attendance' | 'operations' | 'engagement'>('finance');
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshingViews, setRefreshingViews] = useState(false);

  useEffect(() => {
    fetchEngineData(activeEngine);
  }, [activeEngine]);

  const fetchEngineData = async (engine: string) => {
    try {
      setLoading(true);
      const res = await api.get(`/api/accounts/analytics/${engine}`);
      setData(res.data);
    } catch (err: any) {
      toast.error(err.response?.data?.error || `Failed to load ${engine} analytics`);
    } finally {
      setLoading(false);
    }
  };

  const handleRefreshMaterializedViews = async () => {
    try {
      setRefreshingViews(true);
      await api.post('/api/accounts/analytics/refresh');
      toast.success('Materialized analytics views refreshed from PostgreSQL general ledger!');
      fetchEngineData(activeEngine);
    } catch (err: any) {
      toast.error('Failed to refresh analytics views');
    } finally {
      setRefreshingViews(false);
    }
  };

  return (
    <div style={{ padding: '24px', maxWidth: '1360px', margin: '0 auto' }}>
      {/* Page Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 'bold', margin: 0, color: '#1e293b' }}>
            Institutional Analytics Engine
          </h1>
          <p style={{ margin: '4px 0 0', color: '#64748b', fontSize: '14px' }}>
            Multi-portal analytics suite computed from real-time PostgreSQL materialized views
          </p>
        </div>

        <button
          onClick={handleRefreshMaterializedViews}
          disabled={refreshingViews}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            padding: '8px 16px',
            borderRadius: '6px',
            border: '1px solid #cbd5e1',
            backgroundColor: '#fff',
            fontSize: '13px',
            fontWeight: 600,
            cursor: refreshingViews ? 'not-allowed' : 'pointer'
          }}
        >
          <RefreshCw size={14} className={refreshingViews ? 'spin' : ''} />
          {refreshingViews ? 'Refreshing Database Views...' : 'Refresh Views'}
        </button>
      </div>

      {/* 5 Engine Tabs */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '24px', borderBottom: '1px solid #e2e8f0', paddingBottom: '12px', flexWrap: 'wrap' }}>
        {[
          { id: 'finance', label: '1. Finance Analytics', icon: DollarSign },
          { id: 'academics', label: '2. Academic Performance', icon: GraduationCap },
          { id: 'attendance', label: '3. Attendance Tracking', icon: CalendarCheck },
          { id: 'operations', label: '4. Operations & Boarding', icon: Building2 },
          { id: 'engagement', label: '5. Library & Engagement', icon: BookOpen }
        ].map(t => {
          const Icon = t.icon;
          const isActive = activeEngine === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setActiveEngine(t.id as any)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '10px 18px',
                borderRadius: '6px',
                border: 'none',
                backgroundColor: isActive ? '#2563eb' : '#f1f5f9',
                color: isActive ? '#fff' : '#475569',
                fontWeight: 600,
                fontSize: '14px',
                cursor: 'pointer'
              }}
            >
              <Icon size={16} />
              {t.label}
            </button>
          );
        })}
      </div>

      {/* ───────────────────────────────────────────────────────────── */}
      {/* 1. FINANCE ANALYTICS ENGINE */}
      {/* ───────────────────────────────────────────────────────────── */}
      {activeEngine === 'finance' && (
        <div>
          {loading ? (
            <div style={{ padding: '60px', textAlign: 'center', color: '#64748b' }}>Computing financial metrics...</div>
          ) : data?.kpis ? (
            <div>
              {/* 4 Analytics Cards */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '24px' }}>
                <AnalyticsCard
                  title="Revenue Billed"
                  subtitle="Total invoiced tuition & fees"
                  value={`$${(data.kpis.totalRevenueBilled || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}`}
                  icon={DollarSign}
                  iconColor="#2563eb"
                  iconBg="#eff6ff"
                  badge="YTD"
                  badgeColor="blue"
                />

                <AnalyticsCard
                  title="Fees Collected"
                  subtitle="Bank & cash collections"
                  value={`$${(data.kpis.totalFeesCollected || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}`}
                  icon={TrendingUp}
                  iconColor="#16a34a"
                  iconBg="#f0fdf4"
                  badge="Cash In"
                  badgeColor="green"
                />

                <AnalyticsCard
                  title="Operating Expenses"
                  subtitle="Staff, dining & facility costs"
                  value={`$${(data.kpis.totalExpenses || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}`}
                  icon={AlertTriangle}
                  iconColor="#dc2626"
                  iconBg="#fef2f2"
                  badge="Cash Out"
                  badgeColor="red"
                />

                <AnalyticsCard
                  title="Collection Rate"
                  subtitle="Collected vs Billed"
                  value={`${data.kpis.avgCollectionRate || 0}%`}
                  icon={CheckCircle}
                  iconColor="#7c3aed"
                  iconBg="#f5f3ff"
                  badge="Efficiency"
                  badgeColor="purple"
                />
              </div>

              {/* Monthly Trend Chart */}
              {data.monthlyTrend?.length > 0 && (
                <div style={{ backgroundColor: '#fff', padding: '24px', borderRadius: '10px', border: '1px solid #e2e8f0', marginBottom: '24px' }}>
                  <h3 style={{ margin: '0 0 16px', fontSize: '16px', fontWeight: 700, color: '#0f172a' }}>
                    Monthly Billing vs Collection vs Expenses Trend
                  </h3>
                  <div style={{ height: '320px', width: '100%' }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={data.monthlyTrend.slice().reverse()} margin={{ top: 10, right: 30, left: 10, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                        <XAxis dataKey="period" stroke="#64748b" fontSize={12} />
                        <YAxis stroke="#64748b" fontSize={12} tickFormatter={v => `$${v}`} />
                        <Tooltip formatter={(value: any) => [`$${Number(value).toFixed(2)}`, '']} />
                        <Legend />
                        <Bar dataKey="total_revenue_billed" name="Billed" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                        <Bar dataKey="total_fees_collected" name="Collected" fill="#10b981" radius={[4, 4, 0, 0]} />
                        <Bar dataKey="total_expenses" name="Expenses" fill="#ef4444" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}
            </div>
          ) : data?.studentBalance ? (
            /* Student View */
            <div style={{ backgroundColor: '#fff', padding: '24px', borderRadius: '8px', border: '1px solid #e2e8f0', maxWidth: '600px' }}>
              <h3 style={{ margin: '0 0 16px', fontSize: '18px', fontWeight: 700 }}>Your School Ledger Balance</h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', textAlign: 'center' }}>
                <div style={{ padding: '16px', backgroundColor: '#f8fafc', borderRadius: '6px' }}>
                  <div style={{ fontSize: '12px', color: '#64748b' }}>Total Billed</div>
                  <div style={{ fontSize: '20px', fontWeight: 800 }}>${Number(data.studentBalance.total_billed || 0).toFixed(2)}</div>
                </div>
                <div style={{ padding: '16px', backgroundColor: '#f0fdf4', borderRadius: '6px' }}>
                  <div style={{ fontSize: '12px', color: '#16a34a' }}>Total Paid</div>
                  <div style={{ fontSize: '20px', fontWeight: 800, color: '#16a34a' }}>${Number(data.studentBalance.total_paid || 0).toFixed(2)}</div>
                </div>
                <div style={{ padding: '16px', backgroundColor: '#fef2f2', borderRadius: '6px' }}>
                  <div style={{ fontSize: '12px', color: '#dc2626' }}>Balance Due</div>
                  <div style={{ fontSize: '20px', fontWeight: 800, color: '#dc2626' }}>${Number(data.studentBalance.balance_due || 0).toFixed(2)}</div>
                </div>
              </div>
            </div>
          ) : null}
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────── */}
      {/* 2. ACADEMICS ANALYTICS ENGINE */}
      {/* ───────────────────────────────────────────────────────────── */}
      {activeEngine === 'academics' && (
        <div>
          {loading ? (
            <div style={{ padding: '60px', textAlign: 'center', color: '#64748b' }}>Computing academic results...</div>
          ) : data?.rows?.length > 0 ? (
            <div>
              <div style={{ backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', textAlign: 'left' }}>
                  <thead>
                    <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#475569', fontWeight: 600 }}>
                      <th style={{ padding: '12px 16px' }}>Subject</th>
                      <th style={{ padding: '12px 16px' }}>Class</th>
                      <th style={{ padding: '12px 16px' }}>Term / Year</th>
                      <th style={{ padding: '12px 16px', textAlign: 'right' }}>Average Score</th>
                      <th style={{ padding: '12px 16px', textAlign: 'right' }}>Pass Rate</th>
                      <th style={{ padding: '12px 16px', textAlign: 'right' }}>At Risk (&lt; 50%)</th>
                      <th style={{ padding: '12px 16px', textAlign: 'right' }}>Graded Students</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.rows.map((r: any, idx: number) => (
                      <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '12px 16px', fontWeight: 600, color: '#0f172a' }}>{r.subject_name}</td>
                        <td style={{ padding: '12px 16px', color: '#64748b' }}>{r.class_name || 'All'}</td>
                        <td style={{ padding: '12px 16px' }}>{r.term} {r.year}</td>
                        <td style={{ padding: '12px 16px', textAlign: 'right', fontFamily: 'monospace', fontWeight: 700 }}>
                          {r.average_score}%
                        </td>
                        <td style={{ padding: '12px 16px', textAlign: 'right', fontFamily: 'monospace', color: r.pass_rate_pct >= 60 ? '#16a34a' : '#dc2626' }}>
                          {r.pass_rate_pct}%
                        </td>
                        <td style={{ padding: '12px 16px', textAlign: 'right', fontFamily: 'monospace', color: r.at_risk_count > 0 ? '#dc2626' : '#16a34a' }}>
                          {r.at_risk_count}
                        </td>
                        <td style={{ padding: '12px 16px', textAlign: 'right', fontFamily: 'monospace' }}>
                          {r.total_graded_students}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div style={{ padding: '40px', textAlign: 'center', color: '#64748b', backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
              No academic marks recorded in the system yet.
            </div>
          )}
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────── */}
      {/* 3. ATTENDANCE ANALYTICS ENGINE */}
      {/* ───────────────────────────────────────────────────────────── */}
      {activeEngine === 'attendance' && (
        <div>
          {loading ? (
            <div style={{ padding: '60px', textAlign: 'center', color: '#64748b' }}>Loading attendance analytics...</div>
          ) : data?.rows?.length > 0 ? (
            <div style={{ backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', textAlign: 'left' }}>
                <thead>
                  <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#475569', fontWeight: 600 }}>
                    <th style={{ padding: '12px 16px' }}>Period</th>
                    <th style={{ padding: '12px 16px' }}>Class</th>
                    <th style={{ padding: '12px 16px', textAlign: 'right' }}>Present</th>
                    <th style={{ padding: '12px 16px', textAlign: 'right' }}>Absent</th>
                    <th style={{ padding: '12px 16px', textAlign: 'right' }}>Late</th>
                    <th style={{ padding: '12px 16px', textAlign: 'right' }}>Excused</th>
                    <th style={{ padding: '12px 16px', textAlign: 'right' }}>Attendance Rate</th>
                  </tr>
                </thead>
                <tbody>
                  {data.rows.map((r: any, idx: number) => (
                    <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '12px 16px', fontFamily: 'monospace', fontWeight: 600 }}>{r.month_period}</td>
                      <td style={{ padding: '12px 16px', color: '#0f172a' }}>{r.class_name || 'School-Wide'}</td>
                      <td style={{ padding: '12px 16px', textAlign: 'right', fontFamily: 'monospace', color: '#16a34a' }}>{r.present_count}</td>
                      <td style={{ padding: '12px 16px', textAlign: 'right', fontFamily: 'monospace', color: '#dc2626' }}>{r.absent_count}</td>
                      <td style={{ padding: '12px 16px', textAlign: 'right', fontFamily: 'monospace', color: '#b45309' }}>{r.late_count}</td>
                      <td style={{ padding: '12px 16px', textAlign: 'right', fontFamily: 'monospace' }}>{r.excused_count}</td>
                      <td style={{ padding: '12px 16px', textAlign: 'right', fontFamily: 'monospace', fontWeight: 700, color: r.attendance_rate_pct >= 85 ? '#16a34a' : '#dc2626' }}>
                        {r.attendance_rate_pct}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div style={{ padding: '40px', textAlign: 'center', color: '#64748b', backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
              No attendance roll call records found.
            </div>
          )}
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────── */}
      {/* 4. OPERATIONS & BOARDING ANALYTICS ENGINE */}
      {/* ───────────────────────────────────────────────────────────── */}
      {activeEngine === 'operations' && (
        <div>
          {loading ? (
            <div style={{ padding: '60px', textAlign: 'center', color: '#64748b' }}>Computing operational metrics...</div>
          ) : data?.kpis ? (
            <div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '24px' }}>
                <AnalyticsCard
                  title="Hostel Occupancy"
                  subtitle={`${data.kpis.current_hostel_occupancy || 0} of ${data.kpis.total_hostel_capacity || 0} beds`}
                  value={`${data.kpis.hostelOccupancyRate || 0}%`}
                  icon={Bed}
                  iconColor="#2563eb"
                  iconBg="#eff6ff"
                  badge="Boarding"
                  badgeColor="blue"
                />

                <AnalyticsCard
                  title="Pending Maintenance"
                  subtitle="Open facility tickets"
                  value={data.kpis.pending_maintenance_count || 0}
                  icon={Wrench}
                  iconColor="#b45309"
                  iconBg="#fef3c7"
                  badge="Facility"
                  badgeColor="amber"
                />

                <AnalyticsCard
                  title="Tuckshop Cost of Sales"
                  subtitle="Stock outflows (FIFO)"
                  value={`$${(data.kpis.tuckshop_cost_of_sales || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}`}
                  icon={DollarSign}
                  iconColor="#16a34a"
                  iconBg="#f0fdf4"
                  badge="Tuckshop"
                  badgeColor="green"
                />

                <AnalyticsCard
                  title="Clinic Pharmacy Cost"
                  subtitle="Dispensed medications cost"
                  value={`$${(data.kpis.pharmacy_dispensed_cost || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}`}
                  icon={Building2}
                  iconColor="#7c3aed"
                  iconBg="#f5f3ff"
                  badge="Healthcare"
                  badgeColor="purple"
                />
              </div>
            </div>
          ) : null}
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────── */}
      {/* 5. ENGAGEMENT & LIBRARY ANALYTICS ENGINE */}
      {/* ───────────────────────────────────────────────────────────── */}
      {activeEngine === 'engagement' && (
        <div>
          {loading ? (
            <div style={{ padding: '60px', textAlign: 'center', color: '#64748b' }}>Loading engagement data...</div>
          ) : data?.kpis ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px' }}>
              <AnalyticsCard
                title="Total Book Loans"
                subtitle="All-time circulation"
                value={data.kpis.total_book_loans || 0}
                icon={BookOpen}
                iconColor="#2563eb"
                iconBg="#eff6ff"
              />

              <AnalyticsCard
                title="Active Loans"
                subtitle="Currently in circulation"
                value={data.kpis.active_loans || 0}
                icon={Clock}
                iconColor="#16a34a"
                iconBg="#f0fdf4"
              />

              <AnalyticsCard
                title="Overdue Loans"
                subtitle="Requires library return"
                value={data.kpis.overdue_loans || 0}
                icon={AlertTriangle}
                iconColor="#dc2626"
                iconBg="#fef2f2"
              />

              <AnalyticsCard
                title="Return Rate"
                subtitle="Successful returns"
                value={`${data.kpis.return_rate_pct || 0}%`}
                icon={CheckCircle}
                iconColor="#7c3aed"
                iconBg="#f5f3ff"
              />
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}
