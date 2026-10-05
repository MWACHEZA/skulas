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
  Clock,
  FileText,
  Download,
  Printer,
  Filter,
  CheckSquare,
  Square
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
import { exportToCsv, exportToPdf } from '../../../utils/exportService';

export default function AnalyticsEnginesPage() {
  const [activeEngine, setActiveEngine] = useState<'finance' | 'academics' | 'attendance' | 'operations' | 'engagement' | 'adhoc-builder'>('finance');
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshingViews, setRefreshingViews] = useState(false);

  // Ad-Hoc Report Builder State
  const [selectedEntity, setSelectedEntity] = useState<'STUDENTS' | 'FINANCE' | 'ATTENDANCE' | 'STAFF'>('STUDENTS');
  const [adhocSearch, setAdhocSearch] = useState('');
  const [adhocStatusFilter, setAdhocStatusFilter] = useState('ALL');

  const entityDefinitions = {
    STUDENTS: {
      label: 'Student Enrolment Register',
      columns: [
        { key: 'name', label: 'Student Full Name' },
        { key: 'studentId', label: 'Admission Number' },
        { key: 'formClass', label: 'Form / Class' },
        { key: 'gender', label: 'Gender' },
        { key: 'boardingStatus', label: 'Boarding Status' },
        { key: 'feeStatus', label: 'Fee Clearance' },
        { key: 'guardianPhone', label: 'Guardian Phone' }
      ],
      sampleData: [
        { id: '1', name: 'Takudzwa Moyo', studentId: 'STU-4001', formClass: 'Form 4A', gender: 'Male', boardingStatus: 'Boarder', feeStatus: 'Paid in Full', guardianPhone: '+263 77 234 5678' },
        { id: '2', name: 'Tinashe Marange', studentId: 'STU-4015', formClass: 'Form 4A', gender: 'Male', boardingStatus: 'Boarder', feeStatus: 'Partially Paid ($120 due)', guardianPhone: '+263 77 999 1122' },
        { id: '3', name: 'Nomsa Chidzero', studentId: 'STU-4022', formClass: 'Form 3B', gender: 'Female', boardingStatus: 'Day Scholar', feeStatus: 'Paid in Full', guardianPhone: '+263 71 334 9900' },
        { id: '4', name: 'Ruvimbo Ndlovu', studentId: 'STU-4039', formClass: 'Form 2A', gender: 'Female', boardingStatus: 'Boarder', feeStatus: 'Overdue ($380 due)', guardianPhone: '+263 77 554 1188' },
        { id: '5', name: 'Farai Gumbo', studentId: 'STU-4050', formClass: 'Lower 6 Science', gender: 'Male', boardingStatus: 'Day Scholar', feeStatus: 'Paid in Full', guardianPhone: '+263 78 889 0012' }
      ]
    },
    FINANCE: {
      label: 'Financial Transactions & General Ledger',
      columns: [
        { key: 'reference', label: 'Doc / Receipt Ref' },
        { key: 'studentName', label: 'Student / Account' },
        { key: 'itemDescription', label: 'Fee Description' },
        { key: 'amount', label: 'Amount' },
        { key: 'currency', label: 'Currency' },
        { key: 'paymentMethod', label: 'Payment Method' },
        { key: 'glAccount', label: 'COA Code' },
        { key: 'date', label: 'Transaction Date' }
      ],
      sampleData: [
        { id: '1', reference: 'REC-2026-00412', studentName: 'Takudzwa Moyo', itemDescription: 'Term 1 Tuition Fee', amount: '450.00', currency: 'USD', paymentMethod: 'Cash USD', glAccount: '1010 Cash at Hand', date: '2026-01-14' },
        { id: '2', reference: 'REC-2026-00413', studentName: 'Tinashe Marange', itemDescription: 'Boarding Fee Deposit', amount: '350.00', currency: 'USD', paymentMethod: 'EcoCash USD', glAccount: '1020 EcoCash Merchant', date: '2026-01-14' },
        { id: '3', reference: 'REC-2026-00414', studentName: 'Nomsa Chidzero', itemDescription: 'Science Lab Levy', amount: '45.00', currency: 'USD', paymentMethod: 'Bank Transfer', glAccount: '1000 Bank Operating', date: '2026-01-15' },
        { id: '4', reference: 'REC-2026-00415', studentName: 'Farai Gumbo', itemDescription: 'Cambridge Exam Fee', amount: '180.00', currency: 'USD', paymentMethod: 'Cash USD', glAccount: '2050 Cambridge Payable', date: '2026-01-16' }
      ]
    },
    ATTENDANCE: {
      label: 'Student Daily Attendance Logs',
      columns: [
        { key: 'date', label: 'Roll-Call Date' },
        { key: 'studentName', label: 'Student Name' },
        { key: 'formClass', label: 'Class / Stream' },
        { key: 'status', label: 'Attendance Status' },
        { key: 'reason', label: 'Excused / Reason' },
        { key: 'recordedBy', label: 'Teacher / Staff' }
      ],
      sampleData: [
        { id: '1', date: '2026-03-24', studentName: 'Takudzwa Moyo', formClass: 'Form 4A', status: 'Present', reason: 'On Time', recordedBy: 'Mr. Chikore' },
        { id: '2', date: '2026-03-24', studentName: 'Tinashe Marange', formClass: 'Form 4A', status: 'Present', reason: 'On Time', recordedBy: 'Mr. Chikore' },
        { id: '3', date: '2026-03-24', studentName: 'Ruvimbo Ndlovu', formClass: 'Form 2A', status: 'Absent', reason: 'Unexcused (Auto SMS Dispatched)', recordedBy: 'Mrs. Sibanda' },
        { id: '4', date: '2026-03-24', studentName: 'Farai Gumbo', formClass: 'Lower 6 Science', status: 'Late', reason: 'Transport Delay (15 min)', recordedBy: 'Mrs. Dube' }
      ]
    },
    STAFF: {
      label: 'Staff Roster & Payroll Directory',
      columns: [
        { key: 'staffId', label: 'Staff Payroll ID' },
        { key: 'name', label: 'Full Name' },
        { key: 'department', label: 'Department' },
        { key: 'role', label: 'Institutional Role' },
        { key: 'employmentStatus', label: 'Contract Type' },
        { key: 'email', label: 'Official Email' }
      ],
      sampleData: [
        { id: '1', staffId: 'STF-010', name: 'Mr. Chikore', department: 'Mathematics & Science', role: 'Senior Teacher (HOD)', employmentStatus: 'Full Time Permanent', email: 'chikore.m@stgeorges.ac.zw' },
        { id: '2', staffId: 'STF-014', name: 'Mrs. Dube', department: 'Natural Sciences', role: 'Physics Teacher', employmentStatus: 'Full Time Permanent', email: 'dube.e@stgeorges.ac.zw' },
        { id: '3', staffId: 'STF-022', name: 'Mr. Ncube', department: 'Finance & Administration', role: 'Bursar / Cashier', employmentStatus: 'Full Time Permanent', email: 'ncube.b@stgeorges.ac.zw' },
        { id: '4', staffId: 'STF-035', name: 'Mrs. Sibanda', department: 'Humanities & Geography', role: 'Teacher & Hostel Matron', employmentStatus: 'Full Time Permanent', email: 'sibanda.j@stgeorges.ac.zw' }
      ]
    }
  };

  const [selectedColumns, setSelectedColumns] = useState<Record<string, boolean>>({
    name: true,
    studentId: true,
    formClass: true,
    boardingStatus: true,
    feeStatus: true,
    guardianPhone: true
  });

  const handleEntityChange = (entity: 'STUDENTS' | 'FINANCE' | 'ATTENDANCE' | 'STAFF') => {
    setSelectedEntity(entity);
    const initialCols: Record<string, boolean> = {};
    entityDefinitions[entity].columns.forEach(c => {
      initialCols[c.key] = true;
    });
    setSelectedColumns(initialCols);
  };

  const handleToggleColumn = (colKey: string) => {
    setSelectedColumns(prev => ({
      ...prev,
      [colKey]: !prev[colKey]
    }));
  };

  const handleExportCustomCSV = () => {
    const def = entityDefinitions[selectedEntity];
    const activeCols = def.columns.filter(c => selectedColumns[c.key]);
    if (activeCols.length === 0) {
      toast.error('Please select at least one column for export');
      return;
    }

    const exportCols = activeCols.map(c => ({
      header: c.label,
      key: c.key
    }));

    exportToCsv<any>({
      filename: `adhoc_${selectedEntity.toLowerCase()}_${new Date().toISOString().slice(0, 10)}`,
      title: `${def.label} - Ad-Hoc Report`,
      columns: exportCols,
      data: def.sampleData as any[]
    });
    toast.success('Custom ad-hoc CSV report generated!');
  };

  const handleExportCustomPDF = () => {
    const def = entityDefinitions[selectedEntity];
    const activeCols = def.columns.filter(c => selectedColumns[c.key]);
    if (activeCols.length === 0) {
      toast.error('Please select at least one column for export');
      return;
    }

    const exportCols = activeCols.map(c => ({
      header: c.label,
      key: c.key
    }));

    exportToPdf<any>({
      filename: `adhoc_${selectedEntity.toLowerCase()}_${new Date().toISOString().slice(0, 10)}`,
      title: `${def.label} - Ad-Hoc Report`,
      columns: exportCols,
      data: def.sampleData as any[]
    });
    toast.success('Custom ad-hoc PDF report generated!');
  };

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
          { id: 'engagement', label: '5. Library & Engagement', icon: BookOpen },
          { id: 'adhoc-builder', label: '6. Ad-Hoc Report Builder', icon: FileText }
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

      {/* ───────────────────────────────────────────────────────────── */}
      {/* 6. AD-HOC CUSTOM REPORT BUILDER */}
      {/* ───────────────────────────────────────────────────────────── */}
      {activeEngine === 'adhoc-builder' && (
        <div>
          {/* Top Configuration Card */}
          <div style={{ background: '#fff', borderRadius: 8, padding: 24, border: '1px solid #e2e8f0', marginBottom: 20 }}>
            <div style={{ marginBottom: 18 }}>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0, color: '#1e293b' }}>
                Bounded Ad-Hoc Data Query & Custom Report Builder
              </h2>
              <p style={{ margin: '4px 0 0', fontSize: '0.85rem', color: '#64748b' }}>
                Select an institutional entity, customize visible column dimensions, filter dataset boundaries, and export to official CSV or formatted PDF.
              </p>
            </div>

            {/* Step 1: Select Entity */}
            <div style={{ marginBottom: 20 }}>
              <label style={{ fontSize: '0.85rem', fontWeight: 700, color: '#334155', display: 'block', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Step 1: Select Institutional Entity
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
                {[
                  { id: 'STUDENTS', label: '1. Student Enrolments', icon: 'fas fa-user-graduate', desc: 'Roster, boarding, clearance' },
                  { id: 'FINANCE', label: '2. Finance & Ledger', icon: 'fas fa-receipt', desc: 'Receipts, invoices, GL codes' },
                  { id: 'ATTENDANCE', label: '3. Daily Attendance', icon: 'fas fa-clipboard-check', desc: 'Roll-calls, absences, flags' },
                  { id: 'STAFF', label: '4. Staff & Payroll', icon: 'fas fa-id-badge', desc: 'Teachers, departments, roles' }
                ].map(ent => (
                  <button
                    key={ent.id}
                    type="button"
                    onClick={() => handleEntityChange(ent.id as any)}
                    style={{
                      padding: '14px 16px',
                      borderRadius: 6,
                      border: selectedEntity === ent.id ? '2px solid #2563eb' : '1px solid #cbd5e1',
                      background: selectedEntity === ent.id ? '#eff6ff' : '#fff',
                      textAlign: 'left',
                      cursor: 'pointer'
                    }}
                  >
                    <div style={{ fontWeight: 700, color: selectedEntity === ent.id ? '#1e40af' : '#1e293b', fontSize: '0.95rem' }}>
                      <i className={`${ent.icon} mr-2`} style={{ marginRight: 8, color: selectedEntity === ent.id ? '#2563eb' : '#64748b' }}></i>
                      {ent.label}
                    </div>
                    <div style={{ fontSize: '0.78rem', color: '#64748b', marginTop: 4 }}>
                      {ent.desc}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Step 2: Select Columns */}
            <div style={{ marginBottom: 20, background: '#f8fafc', padding: 16, borderRadius: 6, border: '1px solid #e2e8f0' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <label style={{ fontSize: '0.85rem', fontWeight: 700, color: '#334155', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Step 2: Choose Visible Columns ({Object.values(selectedColumns).filter(Boolean).length} Selected)
                </label>
                <div style={{ display: 'flex', gap: 10, fontSize: '0.8rem' }}>
                  <button
                    type="button"
                    onClick={() => {
                      const all: Record<string, boolean> = {};
                      entityDefinitions[selectedEntity].columns.forEach(c => all[c.key] = true);
                      setSelectedColumns(all);
                    }}
                    style={{ border: 'none', background: 'none', color: '#2563eb', fontWeight: 600, cursor: 'pointer' }}
                  >
                    Select All
                  </button>
                  <span style={{ color: '#cbd5e1' }}>|</span>
                  <button
                    type="button"
                    onClick={() => setSelectedColumns({})}
                    style={{ border: 'none', background: 'none', color: '#64748b', fontWeight: 600, cursor: 'pointer' }}
                  >
                    Clear All
                  </button>
                </div>
              </div>

              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
                {entityDefinitions[selectedEntity].columns.map(col => {
                  const isChecked = !!selectedColumns[col.key];
                  return (
                    <button
                      key={col.key}
                      type="button"
                      onClick={() => handleToggleColumn(col.key)}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 6,
                        padding: '6px 12px',
                        borderRadius: 20,
                        border: isChecked ? '1px solid #2563eb' : '1px solid #cbd5e1',
                        background: isChecked ? '#2563eb' : '#fff',
                        color: isChecked ? '#fff' : '#475569',
                        fontSize: '0.82rem',
                        fontWeight: 600,
                        cursor: 'pointer'
                      }}
                    >
                      {isChecked ? <CheckSquare size={13} /> : <Square size={13} />}
                      {col.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Step 3: Query Filters & Action Buttons */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
              <div style={{ display: 'flex', gap: 10, alignItems: 'center', flex: 1, minWidth: 260 }}>
                <input
                  type="text"
                  placeholder="Filter by keyword / name / code..."
                  value={adhocSearch}
                  onChange={e => setAdhocSearch(e.target.value)}
                  style={{ padding: '8px 12px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: '0.85rem', width: '100%', maxWidth: 320 }}
                />
              </div>

              <div style={{ display: 'flex', gap: 10 }}>
                <button
                  type="button"
                  onClick={handleExportCustomCSV}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    padding: '9px 16px',
                    borderRadius: 6,
                    border: 'none',
                    background: '#059669',
                    color: '#fff',
                    fontWeight: 600,
                    fontSize: '0.85rem',
                    cursor: 'pointer'
                  }}
                >
                  <Download size={14} /> Export CSV
                </button>

                <button
                  type="button"
                  onClick={handleExportCustomPDF}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    padding: '9px 16px',
                    borderRadius: 6,
                    border: 'none',
                    background: '#2563eb',
                    color: '#fff',
                    fontWeight: 600,
                    fontSize: '0.85rem',
                    cursor: 'pointer'
                  }}
                >
                  <Printer size={14} /> Export PDF / Print
                </button>
              </div>
            </div>
          </div>

          {/* Data Preview Table */}
          <div style={{ background: '#fff', borderRadius: 8, border: '1px solid #e2e8f0', overflow: 'hidden' }}>
            <div style={{ padding: '14px 20px', background: '#f8fafc', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ fontWeight: 700, color: '#1e293b', fontSize: '0.9rem' }}>
                Query Preview: {entityDefinitions[selectedEntity].label}
              </div>
              <span style={{ fontSize: '0.8rem', color: '#64748b' }}>
                Showing {entityDefinitions[selectedEntity].sampleData.length} records matching criteria
              </span>
            </div>

            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                <thead style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0', color: '#475569', textAlign: 'left' }}>
                  <tr>
                    {entityDefinitions[selectedEntity].columns
                      .filter(c => selectedColumns[c.key])
                      .map(c => (
                        <th key={c.key} style={{ padding: '10px 14px', fontWeight: 600 }}>
                          {c.label}
                        </th>
                      ))}
                  </tr>
                </thead>
                <tbody>
                  {entityDefinitions[selectedEntity].sampleData
                    .filter(row => {
                      if (!adhocSearch) return true;
                      const q = adhocSearch.toLowerCase();
                      return Object.values(row).some(v => String(v).toLowerCase().includes(q));
                    })
                    .map((row: any) => (
                      <tr key={row.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        {entityDefinitions[selectedEntity].columns
                          .filter(c => selectedColumns[c.key])
                          .map(c => (
                            <td key={c.key} style={{ padding: '10px 14px', color: '#334155' }}>
                              {row[c.key] || '—'}
                            </td>
                          ))}
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
