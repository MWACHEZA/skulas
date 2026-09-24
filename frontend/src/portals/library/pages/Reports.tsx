import { useState, useEffect } from 'react';
import api from '../../../lib/api';
import { useAuth } from '../../../contexts/AuthContext';
import {
  LineChart, Line, BarChart, Bar, AreaChart, Area, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import '../../../styles/portal.css';

type ReportTab = 'circulation' | 'inventory' | 'users' | 'financial' | 'reservations';
type DateRangeOption = 'today' | 'month' | 'term' | 'custom';

export default function LibraryReports() {
  const { user } = useAuth();
  const [reportData, setReportData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<ReportTab>('circulation');

  // Filters
  const [dateRange, setDateRange] = useState<DateRangeOption>('month');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState<'library' | 'all'>('library');
  const [isExporting, setIsExporting] = useState(false);

  const isAdmin = user?.role === 'SCHOOL_ADMIN' || user?.role === 'SUPER_ADMIN';

  useEffect(() => {
    fetchReports();
  }, [dateRange, departmentFilter]);

  const fetchReports = async () => {
    setLoading(true);
    try {
      let query = `?dateRange=${dateRange}&department=${departmentFilter}`;
      if (dateRange === 'custom' && customStartDate && customEndDate) {
        query += `&startDate=${customStartDate}&endDate=${customEndDate}`;
      }
      const res = await api.get(`/api/library/reports${query}`);
      setReportData(res.data);
    } catch (err) {
      console.error('Failed to load library reports:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleApplyCustomDate = (e: React.FormEvent) => {
    e.preventDefault();
    if (customStartDate && customEndDate) {
      fetchReports();
    }
  };

  // Export Handlers
  const exportToCSV = () => {
    if (!reportData) return;
    setIsExporting(true);
    try {
      let csvContent = "data:text/csv;charset=utf-8,";
      csvContent += `Library Report - ${activeTab.toUpperCase()}\n`;
      csvContent += `Date Range: ${dateRange.toUpperCase()}\n`;
      csvContent += `Generated At: ${new Date().toLocaleString()}\n\n`;

      if (activeTab === 'circulation') {
        csvContent += "Rank,Book Title,Author,Category,Times Borrowed\n";
        (reportData.circulation?.mostBorrowed || []).forEach((b: any) => {
          csvContent += `"${b.rank}","${b.title}","${b.author}","${b.category}","${b.borrowCount}"\n`;
        });
      } else if (activeTab === 'inventory') {
        csvContent += "Category,Count\n";
        (reportData.inventory?.booksByCategory || []).forEach((c: any) => {
          csvContent += `"${c.name}","${c.count}"\n`;
        });
      } else if (activeTab === 'users') {
        csvContent += "Name,Role,Identifier,Class,Borrows\n";
        (reportData.users?.mostActiveBorrowers || []).forEach((u: any) => {
          csvContent += `"${u.name}","${u.type}","${u.identifier}","${u.class}","${u.count}"\n`;
        });
      } else if (activeTab === 'financial') {
        csvContent += "Metric,Amount\n";
        csvContent += `"Fines Collected","$${reportData.financial?.finesCollectedThisPeriod || 0}"\n`;
        csvContent += `"Fines Outstanding","$${reportData.financial?.finesOutstanding || 0}"\n`;
        csvContent += `"Cost of Books Purchased","$${reportData.financial?.costOfBooksPurchased || 0}"\n`;
        csvContent += `"Requisitions Value","$${reportData.financial?.requisitions?.totalRequestedValue || 0}"\n`;
      } else {
        csvContent += "Book Title,Requester,Date,Status\n";
        (reportData.reservations?.pendingReservations || []).forEach((r: any) => {
          csvContent += `"${r.bookTitle}","${r.requesterName}","${new Date(r.requestDate).toLocaleDateString()}","${r.status}"\n`;
        });
      }

      const encodedUri = encodeURI(csvContent);
      const link = document.createElement("a");
      link.setAttribute("href", encodedUri);
      link.setAttribute("download", `Library_Report_${activeTab}_${Date.now()}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } finally {
      setIsExporting(false);
    }
  };

  const exportToWord = () => {
    if (!reportData) return;
    setIsExporting(true);
    try {
      const title = `Library Analytics Report - ${activeTab.toUpperCase()}`;
      const dateStr = new Date().toLocaleDateString();
      let bodyHtml = `
        <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
        <head><title>${title}</title>
        <style>
          body { font-family: Calibri, sans-serif; font-size: 11pt; color: #333; line-height: 1.4; }
          h1 { color: #1e3a8a; border-bottom: 2px solid #1e3a8a; padding-bottom: 6px; }
          table { width: 100%; border-collapse: collapse; margin-top: 15px; }
          th { background-color: #2563eb; color: #fff; padding: 8px; border: 1px solid #ddd; text-align: left; }
          td { padding: 8px; border: 1px solid #ddd; }
          .kpi-box { border: 1px solid #cbd5e1; padding: 12px; margin-bottom: 15px; border-radius: 6px; }
        </style>
        </head><body>
        <h1>${title}</h1>
        <p><strong>Date Range:</strong> ${dateRange.toUpperCase()} | <strong>Scope:</strong> ${departmentFilter === 'all' ? 'School-Wide' : 'Library Department'} | <strong>Exported:</strong> ${dateStr}</p>
        <div class="kpi-box">
          <p><strong>Total Books:</strong> ${reportData.kpis?.totalBooks?.value} (${reportData.kpis?.totalBooks?.trend})</p>
          <p><strong>Currently Borrowed:</strong> ${reportData.kpis?.borrowed?.value} (${reportData.kpis?.borrowed?.trend})</p>
          <p><strong>Overdue:</strong> ${reportData.kpis?.overdue?.value} (${reportData.kpis?.overdue?.trend})</p>
          <p><strong>Total Fines:</strong> $${reportData.kpis?.fines?.value} (${reportData.kpis?.fines?.trend})</p>
        </div>
      `;

      if (activeTab === 'circulation') {
        bodyHtml += `<h3>Top Most Borrowed Books</h3><table><tr><th>Rank</th><th>Title</th><th>Author</th><th>Category</th><th>Borrows</th></tr>`;
        (reportData.circulation?.mostBorrowed || []).forEach((b: any) => {
          bodyHtml += `<tr><td>${b.rank}</td><td>${b.title}</td><td>${b.author}</td><td>${b.category}</td><td>${b.borrowCount}</td></tr>`;
        });
        bodyHtml += `</table>`;
      } else if (activeTab === 'inventory') {
        bodyHtml += `<h3>Books by Category</h3><table><tr><th>Category</th><th>Volumes</th></tr>`;
        (reportData.inventory?.booksByCategory || []).forEach((c: any) => {
          bodyHtml += `<tr><td>${c.name}</td><td>${c.count}</td></tr>`;
        });
        bodyHtml += `</table>`;
      } else if (activeTab === 'financial') {
        bodyHtml += `<h3>Financial Breakdown</h3><table><tr><th>Metric</th><th>Valuation</th></tr>
          <tr><td>Fines Collected</td><td>$${reportData.financial?.finesCollectedThisPeriod}</td></tr>
          <tr><td>Fines Outstanding</td><td>$${reportData.financial?.finesOutstanding}</td></tr>
          <tr><td>Cost of Books Purchased</td><td>$${reportData.financial?.costOfBooksPurchased}</td></tr>
          <tr><td>Requisitions Total</td><td>$${reportData.financial?.requisitions?.totalRequestedValue}</td></tr>
        </table>`;
      } else {
        bodyHtml += `<h3>Active Loans & Overdue Defaulters</h3><table><tr><th>Borrower</th><th>Book</th><th>Due Date</th><th>Days Overdue</th><th>Fine</th></tr>`;
        (reportData.overdueList || []).forEach((o: any) => {
          bodyHtml += `<tr><td>${o.borrowerName} (${o.borrowerClass})</td><td>${o.bookTitle}</td><td>${new Date(o.dueDate).toLocaleDateString()}</td><td>${o.daysOverdue} days</td><td>$${o.fineAmount}</td></tr>`;
        });
        bodyHtml += `</table>`;
      }

      bodyHtml += `</body></html>`;
      const blob = new Blob(['\ufeff', bodyHtml], { type: 'application/msword' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `Library_Report_${activeTab}_${Date.now()}.doc`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } finally {
      setIsExporting(false);
    }
  };

  const exportToPDF = () => {
    window.print();
  };

  const renderOverdueBadge = (days: number) => {
    if (days >= 15) {
      return (
        <span style={{
          background: '#fee2e2',
          color: '#991b1b',
          border: '1px solid #f87171',
          padding: '3px 10px',
          borderRadius: 9999,
          fontWeight: 800,
          fontSize: '0.75rem'
        }}>
          ● {days}d (15+ days)
        </span>
      );
    }
    if (days >= 8) {
      return (
        <span style={{
          background: '#ffedd5',
          color: '#c2410c',
          border: '1px solid #fb923c',
          padding: '3px 10px',
          borderRadius: 9999,
          fontWeight: 800,
          fontSize: '0.75rem'
        }}>
          ● {days}d (8–14 days)
        </span>
      );
    }
    return (
      <span style={{
        background: '#fef9c3',
        color: '#854d0e',
        border: '1px solid #facc15',
        padding: '3px 10px',
        borderRadius: 9999,
        fontWeight: 800,
        fontSize: '0.75rem'
      }}>
        ● {days}d (1–7 days)
      </span>
    );
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '120px 20px' }}>
        <div className="portal-spinner" style={{ margin: '0 auto 16px' }}></div>
        <h3 style={{ color: '#1e293b', fontWeight: 800 }}>Generating Analytics & Visual Reports...</h3>
        <p style={{ color: '#64748b', fontSize: '0.9rem' }}>Compiling circulation patterns, inventory audits, and financial subsets</p>
      </div>
    );
  }

  if (!reportData) {
    return (
      <div className="portal-card" style={{ textAlign: 'center', padding: 60, color: 'var(--portal-danger)' }}>
        <h2>Failed to load reports.</h2>
        <button onClick={fetchReports} className="portal-btn-primary" style={{ marginTop: 16 }}>Retry</button>
      </div>
    );
  }

  const { kpis, circulation, inventory, users, financial, reservations, overdueList = [] } = reportData;

  return (
    <div className="portal-container animate-in fade-in duration-300" style={{ maxWidth: 1400, margin: '0 auto', padding: '24px 20px' }}>
      
      {/* PAGE HEADER */}
      <div style={{
        display: 'flex',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: 16,
        marginBottom: 20
      }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '1.85rem', fontWeight: 900, color: '#0f172a' }}>
            Library Intelligence & Visual Reports
          </h1>
          <p style={{ margin: '4px 0 0 0', color: '#64748b', fontSize: '0.9rem' }}>
            Deep analytics, multi-tab trend tracking, circulation patterns, and scoped financial subsets.
          </p>
        </div>

        {/* Admin School-Wide Integration Toggle */}
        {isAdmin && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#475569' }}>Data Scope:</span>
            <button
              onClick={() => setDepartmentFilter(departmentFilter === 'library' ? 'all' : 'library')}
              className={departmentFilter === 'all' ? 'portal-btn-primary' : 'portal-btn-secondary'}
              style={{
                padding: '8px 16px',
                fontSize: '0.85rem',
                fontWeight: 800,
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6
              }}
            >
              <i className="fas fa-network-wired"></i>
              {departmentFilter === 'all' ? 'Viewing Full School Reports' : 'View Full School Reports'}
            </button>
          </div>
        )}
      </div>

      {/* TOP-LEVEL FILTERS BAR */}
      <div style={{
        background: '#ffffff',
        border: '1px solid #e2e8f0',
        borderRadius: 12,
        padding: '14px 20px',
        display: 'flex',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: 16,
        marginBottom: 24,
        boxShadow: '0 1px 3px rgba(0,0,0,0.02)'
      }}>
        {/* Date Range Selector */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <span style={{ fontSize: '0.85rem', fontWeight: 800, color: '#334155', display: 'flex', alignItems: 'center', gap: 6 }}>
            <i className="fas fa-filter text-primary"></i> Date Range:
          </span>
          {(['today', 'month', 'term', 'custom'] as DateRangeOption[]).map((opt) => (
            <button
              key={opt}
              onClick={() => setDateRange(opt)}
              style={{
                padding: '6px 14px',
                borderRadius: 6,
                border: 'none',
                fontWeight: 700,
                fontSize: '0.8rem',
                cursor: 'pointer',
                background: dateRange === opt ? 'var(--school-primary, #3182ce)' : '#f1f5f9',
                color: dateRange === opt ? '#ffffff' : '#475569',
                transition: 'all 0.15s ease'
              }}
            >
              {opt === 'today' ? 'Today' : opt === 'month' ? 'This Month' : opt === 'term' ? 'This Term' : 'Custom'}
            </button>
          ))}

          {dateRange === 'custom' && (
            <form onSubmit={handleApplyCustomDate} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <input
                type="date"
                value={customStartDate}
                onChange={(e) => setCustomStartDate(e.target.value)}
                style={{ padding: '4px 8px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: '0.8rem' }}
                required
              />
              <span style={{ color: '#94a3b8' }}>to</span>
              <input
                type="date"
                value={customEndDate}
                onChange={(e) => setCustomEndDate(e.target.value)}
                style={{ padding: '4px 8px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: '0.8rem' }}
                required
              />
              <button
                type="submit"
                className="portal-btn-primary"
                style={{ padding: '4px 10px', fontSize: '0.75rem', fontWeight: 800 }}
              >
                Apply
              </button>
            </form>
          )}
        </div>

        {/* Export Buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#64748b' }}>Export Tab:</span>
          <button
            onClick={exportToPDF}
            className="portal-btn-secondary"
            style={{ padding: '6px 12px', fontSize: '0.8rem', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 6 }}
          >
            <i className="fas fa-file-pdf text-danger"></i> PDF
          </button>
          <button
            onClick={exportToCSV}
            className="portal-btn-secondary"
            style={{ padding: '6px 12px', fontSize: '0.8rem', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 6 }}
          >
            <i className="fas fa-file-excel text-success"></i> Excel
          </button>
          <button
            onClick={exportToWord}
            className="portal-btn-secondary"
            style={{ padding: '6px 12px', fontSize: '0.8rem', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 6 }}
          >
            <i className="fas fa-file-word text-primary"></i> Word
          </button>
        </div>
      </div>

      {/* 1. TOP KPI CARDS WITH TREND */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
        gap: 16,
        marginBottom: 28
      }}>
        {/* Total Books */}
        <div style={{ background: '#ffffff', borderRadius: 14, border: '1px solid #e2e8f0', padding: 20, boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Total Books</span>
              <div style={{ fontSize: '1.9rem', fontWeight: 900, color: '#0f172a', margin: '4px 0' }}>
                {kpis?.totalBooks?.value?.toLocaleString() || 0}
              </div>
            </div>
            <div style={{ width: 44, height: 44, borderRadius: 12, background: '#eff6ff', color: '#2563eb', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem' }}>
              <i className="fas fa-book"></i>
            </div>
          </div>
          <div style={{ fontSize: '0.8rem', color: '#16a34a', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 4, marginTop: 4 }}>
            <i className="fas fa-arrow-up"></i> {kpis?.totalBooks?.trend}
          </div>
        </div>

        {/* Currently Borrowed */}
        <div style={{ background: '#ffffff', borderRadius: 14, border: '1px solid #e2e8f0', padding: 20, boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Borrowed</span>
              <div style={{ fontSize: '1.9rem', fontWeight: 900, color: '#0f172a', margin: '4px 0' }}>
                {kpis?.borrowed?.value?.toLocaleString() || 0}
              </div>
            </div>
            <div style={{ width: 44, height: 44, borderRadius: 12, background: '#f5f3ff', color: '#7c3aed', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem' }}>
              <i className="fas fa-book-reader"></i>
            </div>
          </div>
          <div style={{ fontSize: '0.8rem', color: '#16a34a', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 4, marginTop: 4 }}>
            <i className="fas fa-arrow-up"></i> {kpis?.borrowed?.trend}
          </div>
        </div>

        {/* Overdue */}
        <div style={{ background: '#ffffff', borderRadius: 14, border: '1px solid #e2e8f0', padding: 20, boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Overdue</span>
              <div style={{ fontSize: '1.9rem', fontWeight: 900, color: '#b91c1c', margin: '4px 0' }}>
                {kpis?.overdue?.value?.toLocaleString() || 0}
              </div>
            </div>
            <div style={{ width: 44, height: 44, borderRadius: 12, background: '#fee2e2', color: '#dc2626', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem' }}>
              <i className="fas fa-exclamation-triangle"></i>
            </div>
          </div>
          <div style={{ fontSize: '0.8rem', color: '#16a34a', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 4, marginTop: 4 }}>
            <i className="fas fa-arrow-down"></i> {kpis?.overdue?.trend}
          </div>
        </div>

        {/* Fines */}
        <div style={{ background: '#ffffff', borderRadius: 14, border: '1px solid #e2e8f0', padding: 20, boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Fines Accrued</span>
              <div style={{ fontSize: '1.9rem', fontWeight: 900, color: '#0f172a', margin: '4px 0' }}>
                ${kpis?.fines?.value?.toLocaleString() || '0.00'}
              </div>
            </div>
            <div style={{ width: 44, height: 44, borderRadius: 12, background: '#fef3c7', color: '#d97706', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem' }}>
              <i className="fas fa-coins"></i>
            </div>
          </div>
          <div style={{ fontSize: '0.8rem', color: '#d97706', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 4, marginTop: 4 }}>
            <i className="fas fa-info-circle"></i> {kpis?.fines?.trend}
          </div>
        </div>
      </div>

      {/* REPORT SECTION TABS */}
      <div style={{
        display: 'flex',
        gap: 8,
        borderBottom: '2px solid #e2e8f0',
        marginBottom: 24,
        overflowX: 'auto',
        paddingBottom: 4
      }}>
        {[
          { key: 'circulation', label: 'Circulation Reports', icon: 'fa-exchange-alt' },
          { key: 'inventory', label: 'Inventory & Assets', icon: 'fa-boxes' },
          { key: 'users', label: 'User Reports', icon: 'fa-users' },
          { key: 'financial', label: 'Financial (Bursar Linked)', icon: 'fa-file-invoice-dollar' },
          { key: 'reservations', label: 'Reservations', icon: 'fa-bookmark' }
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key as ReportTab)}
            style={{
              padding: '10px 20px',
              border: 'none',
              background: 'none',
              cursor: 'pointer',
              fontWeight: 800,
              fontSize: '0.9rem',
              color: activeTab === tab.key ? 'var(--school-primary, #3182ce)' : '#64748b',
              borderBottom: activeTab === tab.key ? '3px solid var(--school-primary, #3182ce)' : '3px solid transparent',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              whiteSpace: 'nowrap'
            }}
          >
            <i className={`fas ${tab.icon}`}></i> {tab.label}
          </button>
        ))}
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: CIRCULATION REPORTS                                               */}
      {/* ========================================================================= */}
      {activeTab === 'circulation' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          {/* Row of Visual Charts (Limit <= 6 charts per tab) */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(440px, 1fr))', gap: 20 }}>
            {/* Chart 1: Issues per Month (Line Chart) */}
            <div className="portal-card" style={{ padding: 20 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 800, color: '#1e293b' }}>
                    <i className="fas fa-chart-line mr-2 text-primary"></i> Issues per Month (Seasonal Borrowing)
                  </h3>
                  <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Seasonal borrowing patterns across terms</span>
                </div>
              </div>
              <div style={{ height: 260 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={circulation?.issuesPerMonth || []}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                    <XAxis dataKey="month" stroke="#94a3b8" fontSize={12} />
                    <YAxis stroke="#94a3b8" fontSize={12} />
                    <Tooltip contentStyle={{ borderRadius: 8, border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
                    <Line type="monotone" dataKey="issues" stroke="var(--school-primary, #3182ce)" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 7 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Chart 2: Total Issues vs Returns (Bar Chart) */}
            <div className="portal-card" style={{ padding: 20 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 800, color: '#1e293b' }}>
                    <i className="fas fa-chart-bar mr-2 text-indigo-500"></i> Total Issues vs. Returns
                  </h3>
                  <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Comparative loan throughput by month</span>
                </div>
              </div>
              <div style={{ height: 260 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={circulation?.issuesVsReturns || []}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                    <XAxis dataKey="month" stroke="#94a3b8" fontSize={12} />
                    <YAxis stroke="#94a3b8" fontSize={12} />
                    <Tooltip contentStyle={{ borderRadius: 8, border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
                    <Legend />
                    <Bar dataKey="issues" name="Issues" fill="var(--school-primary, #3182ce)" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="returns" name="Returns" fill="#10b981" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Chart 3: Most Borrowed Books (Horizontal Bar Chart, Top 5 Only) */}
            <div className="portal-card" style={{ padding: 20 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 800, color: '#1e293b' }}>
                    <i className="fas fa-award mr-2 text-amber-500"></i> Most Borrowed Books (Top 5)
                  </h3>
                  <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Horizontal view optimized for book titles</span>
                </div>
              </div>
              <div style={{ height: 260 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart layout="vertical" data={circulation?.mostBorrowedTop5 || []} margin={{ left: 20, right: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" />
                    <XAxis type="number" stroke="#94a3b8" fontSize={12} />
                    <YAxis
                      dataKey="title"
                      type="category"
                      width={140}
                      stroke="#475569"
                      fontSize={11}
                      tickFormatter={(val) => val.length > 18 ? `${val.slice(0, 18)}...` : val}
                    />
                    <Tooltip contentStyle={{ borderRadius: 8, border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
                    <Bar dataKey="borrowCount" name="Times Borrowed" fill="#f59e0b" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Circulation Summary Badges */}
            <div className="portal-card" style={{ padding: 20, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
              <div>
                <h3 style={{ margin: '0 0 12px 0', fontSize: '1rem', fontWeight: 800, color: '#1e293b' }}>
                  <i className="fas fa-tachometer-alt mr-2 text-primary"></i> Circulation Operations Summary
                </h3>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div style={{ background: '#f8fafc', padding: 14, borderRadius: 8, border: '1px solid #e2e8f0' }}>
                    <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 700 }}>Average Loan Duration</div>
                    <div style={{ fontSize: '1.6rem', fontWeight: 900, color: '#0f172a', margin: '4px 0' }}>
                      {circulation?.averageLoanDurationDays || 14} days
                    </div>
                    <div style={{ fontSize: '0.75rem', color: '#10b981' }}>Within 14-day policy</div>
                  </div>

                  <div style={{ background: '#f8fafc', padding: 14, borderRadius: 8, border: '1px solid #e2e8f0' }}>
                    <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 700 }}>Peak Borrowing Period</div>
                    <div style={{ fontSize: '1.2rem', fontWeight: 900, color: '#2563eb', margin: '4px 0' }}>
                      {circulation?.peakBorrowing?.peakDay}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{circulation?.peakBorrowing?.peakHour}</div>
                  </div>

                  <div style={{ background: '#ecfdf5', padding: 14, borderRadius: 8, border: '1px solid #a7f3d0' }}>
                    <div style={{ fontSize: '0.75rem', color: '#065f46', fontWeight: 700 }}>Fines Collected</div>
                    <div style={{ fontSize: '1.4rem', fontWeight: 900, color: '#047857', margin: '4px 0' }}>
                      ${circulation?.overdueSummary?.finesCollected?.toFixed(2) || '0.00'}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: '#059669' }}>Paid by patrons</div>
                  </div>

                  <div style={{ background: '#fef2f2', padding: 14, borderRadius: 8, border: '1px solid #fecaca' }}>
                    <div style={{ fontSize: '0.75rem', color: '#991b1b', fontWeight: 700 }}>Fines Pending</div>
                    <div style={{ fontSize: '1.4rem', fontWeight: 900, color: '#b91c1c', margin: '4px 0' }}>
                      ${circulation?.overdueSummary?.finesPending?.toFixed(2) || '0.00'}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: '#dc2626' }}>Accrued on overdue items</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Overdue List — Colored Table (Yellow, Orange, Red) */}
          <div className="portal-card" style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid #e2e8f0', background: '#f8fafc', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: '#0f172a' }}>
                  <i className="fas fa-exclamation-triangle text-danger mr-2"></i> Overdue Items Roster (Color Coded)
                </h3>
                <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
                  Badges: <span style={{ color: '#854d0e', fontWeight: 700 }}>Yellow = 1–7d</span>, <span style={{ color: '#c2410c', fontWeight: 700 }}>Orange = 8–14d</span>, <span style={{ color: '#991b1b', fontWeight: 700 }}>Red = 15+ days</span>
                </span>
              </div>
              <span style={{ fontSize: '0.8rem', fontWeight: 800, color: '#dc2626' }}>
                Total Overdue: {overdueList.length}
              </span>
            </div>

            <div className="table-responsive">
              <table className="management-table" style={{ width: '100%' }}>
                <thead>
                  <tr style={{ background: '#f8fafc' }}>
                    <th style={{ padding: '12px 18px', textAlign: 'left' }}>Book Title & Author</th>
                    <th style={{ padding: '12px 18px', textAlign: 'left' }}>Borrower</th>
                    <th style={{ padding: '12px 18px', textAlign: 'left' }}>Class / Role</th>
                    <th style={{ padding: '12px 18px', textAlign: 'left' }}>Due Date</th>
                    <th style={{ padding: '12px 18px', textAlign: 'left' }}>Overdue Severity</th>
                    <th style={{ padding: '12px 18px', textAlign: 'right' }}>Fine Accrued</th>
                  </tr>
                </thead>
                <tbody>
                  {overdueList.length === 0 ? (
                    <tr>
                      <td colSpan={6} style={{ textAlign: 'center', padding: '40px 20px', color: '#64748b' }}>
                        No overdue books on record.
                      </td>
                    </tr>
                  ) : (
                    overdueList.map((item: any) => (
                      <tr key={item.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '12px 18px' }}>
                          <div style={{ fontWeight: 800, color: '#1e293b' }}>{item.bookTitle}</div>
                          <div style={{ fontSize: '0.75rem', color: '#64748b' }}>By {item.bookAuthor}</div>
                        </td>
                        <td style={{ padding: '12px 18px', fontWeight: 700, color: '#334155' }}>
                          {item.borrowerName}
                        </td>
                        <td style={{ padding: '12px 18px', fontSize: '0.85rem', color: '#64748b' }}>
                          {item.borrowerClass}
                        </td>
                        <td style={{ padding: '12px 18px', fontSize: '0.85rem', fontWeight: 700, color: '#dc2626' }}>
                          {new Date(item.dueDate).toLocaleDateString()}
                        </td>
                        <td style={{ padding: '12px 18px' }}>
                          {renderOverdueBadge(item.daysOverdue)}
                        </td>
                        <td style={{ padding: '12px 18px', textAlign: 'right', fontWeight: 900, color: '#b91c1c' }}>
                          ${(item.fineAmount || 0).toFixed(2)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Tables: Top 10 Most Borrowed & Least Borrowed (Dead Stock) */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(460px, 1fr))', gap: 20 }}>
            {/* Top 10 Most Borrowed */}
            <div className="portal-card" style={{ padding: 0, overflow: 'hidden' }}>
              <div style={{ padding: '14px 18px', borderBottom: '1px solid #e2e8f0', background: '#f8fafc' }}>
                <h3 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 800, color: '#0f172a' }}>
                  <i className="fas fa-fire text-amber-500 mr-2"></i> Most Borrowed Books (Top 10)
                </h3>
              </div>
              <div className="table-responsive">
                <table className="management-table" style={{ width: '100%' }}>
                  <thead>
                    <tr style={{ background: '#f8fafc' }}>
                      <th style={{ padding: '10px 14px', width: 40, textAlign: 'center' }}>#</th>
                      <th style={{ padding: '10px 14px' }}>Book Title</th>
                      <th style={{ padding: '10px 14px' }}>Category</th>
                      <th style={{ padding: '10px 14px', textAlign: 'right' }}>Borrows</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(circulation?.mostBorrowed || []).map((b: any) => (
                      <tr key={b.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '10px 14px', textAlign: 'center', fontWeight: 800, color: b.rank <= 3 ? '#eab308' : '#64748b' }}>
                          {b.rank}
                        </td>
                        <td style={{ padding: '10px 14px', fontWeight: 700, color: '#1e293b' }}>
                          {b.title}
                        </td>
                        <td style={{ padding: '10px 14px', fontSize: '0.8rem', color: '#64748b' }}>
                          {b.category}
                        </td>
                        <td style={{ padding: '10px 14px', textAlign: 'right', fontWeight: 800, color: 'var(--school-primary, #3182ce)' }}>
                          {b.borrowCount}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Least Borrowed Books (Dead Stock) */}
            <div className="portal-card" style={{ padding: 0, overflow: 'hidden' }}>
              <div style={{ padding: '14px 18px', borderBottom: '1px solid #e2e8f0', background: '#f8fafc' }}>
                <h3 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 800, color: '#0f172a' }}>
                  <i className="fas fa-box-open text-slate-500 mr-2"></i> Least Borrowed Books (Dead Stock Audit)
                </h3>
              </div>
              <div className="table-responsive">
                <table className="management-table" style={{ width: '100%' }}>
                  <thead>
                    <tr style={{ background: '#f8fafc' }}>
                      <th style={{ padding: '10px 14px' }}>Book Title</th>
                      <th style={{ padding: '10px 14px' }}>Category</th>
                      <th style={{ padding: '10px 14px', textAlign: 'center' }}>Copies</th>
                      <th style={{ padding: '10px 14px', textAlign: 'right' }}>Borrows</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(circulation?.leastBorrowed || []).map((b: any) => (
                      <tr key={b.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '10px 14px', fontWeight: 700, color: '#1e293b' }}>
                          {b.title}
                        </td>
                        <td style={{ padding: '10px 14px', fontSize: '0.8rem', color: '#64748b' }}>
                          {b.category}
                        </td>
                        <td style={{ padding: '10px 14px', textAlign: 'center', fontSize: '0.85rem', color: '#475569' }}>
                          {b.copies}
                        </td>
                        <td style={{ padding: '10px 14px', textAlign: 'right', fontWeight: 800, color: '#94a3b8' }}>
                          {b.borrowCount}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: INVENTORY & ASSET REPORTS                                         */}
      {/* ========================================================================= */}
      {activeTab === 'inventory' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          {/* Visual Charts */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(440px, 1fr))', gap: 20 }}>
            {/* Chart 1: Books by Category (Donut Chart) */}
            <div className="portal-card" style={{ padding: 20 }}>
              <div style={{ marginBottom: 16 }}>
                <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 800, color: '#1e293b' }}>
                  <i className="fas fa-chart-pie mr-2 text-primary"></i> Books by Category (Library Composition)
                </h3>
                <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Collection breakdown across categories</span>
              </div>
              <div style={{ height: 260 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={inventory?.booksByCategory || []}
                      innerRadius={60}
                      outerRadius={95}
                      paddingAngle={4}
                      dataKey="count"
                      nameKey="name"
                    >
                      {(inventory?.booksByCategory || []).map((entry: any, index: number) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ borderRadius: 8, border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Chart 2: Available vs Borrowed vs Damaged vs Lost */}
            <div className="portal-card" style={{ padding: 20 }}>
              <div style={{ marginBottom: 16 }}>
                <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 800, color: '#1e293b' }}>
                  <i className="fas fa-chart-pie mr-2 text-indigo-500"></i> Available vs. Borrowed vs. Damaged
                </h3>
                <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Inventory health and circulation status</span>
              </div>
              <div style={{ height: 260 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={inventory?.statusBreakdown || []}
                      innerRadius={55}
                      outerRadius={95}
                      paddingAngle={4}
                      dataKey="value"
                      nameKey="name"
                    >
                      {(inventory?.statusBreakdown || []).map((entry: any, index: number) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ borderRadius: 8, border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* CRITICAL INTEGRATION SECTION: Value of Library Assets vs School Total */}
          <div style={{
            background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
            borderRadius: 16,
            padding: 24,
            color: '#ffffff',
            boxShadow: '0 10px 25px rgba(0,0,0,0.15)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16, marginBottom: 20 }}>
              <div>
                <span style={{ background: '#3b82f6', color: '#ffffff', padding: '3px 10px', borderRadius: 20, fontSize: '0.75rem', fontWeight: 800 }}>
                  SYSTEM ASSET INTEGRATION
                </span>
                <h2 style={{ margin: '8px 0 4px 0', fontSize: '1.4rem', fontWeight: 900, color: '#ffffff' }}>
                  Library Asset Valuation & Scoped School Register
                </h2>
                <p style={{ margin: 0, color: '#94a3b8', fontSize: '0.85rem' }}>
                  Scoped subset of the main school system's reports (department = library) — unified with the school balance sheet.
                </p>
              </div>
              <div style={{ textAlign: 'right' }}>
                <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>Library Share of Total Assets</span>
                <div style={{ fontSize: '1.75rem', fontWeight: 900, color: '#38bdf8' }}>
                  {inventory?.valuation?.librarySharePercent}%
                </div>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16 }}>
              <div style={{ background: 'rgba(255,255,255,0.06)', borderRadius: 10, padding: 16, border: '1px solid rgba(255,255,255,0.1)' }}>
                <div style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: 700 }}>Library Total Valuation</div>
                <div style={{ fontSize: '1.6rem', fontWeight: 900, color: '#ffffff', margin: '4px 0' }}>
                  ${(inventory?.valuation?.libraryAssetsValue || 0).toLocaleString()}
                </div>
                <div style={{ fontSize: '0.75rem', color: '#38bdf8' }}>Physical assets + book collection</div>
              </div>

              <div style={{ background: 'rgba(255,255,255,0.06)', borderRadius: 10, padding: 16, border: '1px solid rgba(255,255,255,0.1)' }}>
                <div style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: 700 }}>Total School Assets Value</div>
                <div style={{ fontSize: '1.6rem', fontWeight: 900, color: '#94a3b8', margin: '4px 0' }}>
                  ${(inventory?.valuation?.totalSchoolAssetsValue || 0).toLocaleString()}
                </div>
                <div style={{ fontSize: '0.75rem', color: '#cbd5e1' }}>Main School System Register</div>
              </div>

              <div style={{ background: 'rgba(255,255,255,0.06)', borderRadius: 10, padding: 16, border: '1px solid rgba(255,255,255,0.1)' }}>
                <div style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: 700 }}>Books Added This Month</div>
                <div style={{ fontSize: '1.6rem', fontWeight: 900, color: '#4ade80', margin: '4px 0' }}>
                  +{inventory?.booksAddedThisMonth || 0}
                </div>
                <div style={{ fontSize: '0.75rem', color: '#86efac' }}>New acquisitions logged</div>
              </div>

              <div style={{ background: 'rgba(255,255,255,0.06)', borderRadius: 10, padding: 16, border: '1px solid rgba(255,255,255,0.1)' }}>
                <div style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: 700 }}>Damaged / To Be Disposed</div>
                <div style={{ fontSize: '1.6rem', fontWeight: 900, color: '#f87171', margin: '4px 0' }}>
                  {inventory?.booksToDispose?.length || 0}
                </div>
                <div style={{ fontSize: '0.75rem', color: '#fca5a5' }}>Requires Bursar/Admin write-off</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: USER REPORTS                                                      */}
      {/* ========================================================================= */}
      {activeTab === 'users' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          {/* Chart 1: Borrowers by Class/Form (Column Chart) */}
          <div className="portal-card" style={{ padding: 20 }}>
            <div style={{ marginBottom: 16 }}>
              <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 800, color: '#1e293b' }}>
                <i className="fas fa-users-class mr-2 text-primary"></i> Borrowers by Class / Form
              </h3>
              <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Which class/form borrows most books</span>
            </div>
            <div style={{ height: 260 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={users?.borrowersByClass || []}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis dataKey="className" stroke="#94a3b8" fontSize={12} />
                  <YAxis stroke="#94a3b8" fontSize={12} />
                  <Tooltip contentStyle={{ borderRadius: 8, border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
                  <Bar dataKey="count" name="Total Loans" fill="var(--school-primary, #3182ce)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* User Tables: Most Active Borrowers, Never Borrowed, Defaulters */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(440px, 1fr))', gap: 20 }}>
            {/* Most Active Borrowers */}
            <div className="portal-card" style={{ padding: 0, overflow: 'hidden' }}>
              <div style={{ padding: '14px 18px', borderBottom: '1px solid #e2e8f0', background: '#f8fafc' }}>
                <h3 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 800, color: '#0f172a' }}>
                  <i className="fas fa-star text-amber-500 mr-2"></i> Most Active Borrowers (Students & Staff)
                </h3>
              </div>
              <div className="table-responsive">
                <table className="management-table" style={{ width: '100%' }}>
                  <thead>
                    <tr style={{ background: '#f8fafc' }}>
                      <th style={{ padding: '10px 14px' }}>Name</th>
                      <th style={{ padding: '10px 14px' }}>Role</th>
                      <th style={{ padding: '10px 14px' }}>Class</th>
                      <th style={{ padding: '10px 14px', textAlign: 'right' }}>Loans Count</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(users?.mostActiveBorrowers || []).map((u: any, idx: number) => (
                      <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '10px 14px', fontWeight: 700, color: '#1e293b' }}>{u.name}</td>
                        <td style={{ padding: '10px 14px', fontSize: '0.8rem', color: '#64748b' }}>{u.type}</td>
                        <td style={{ padding: '10px 14px', fontSize: '0.8rem', color: '#475569' }}>{u.class}</td>
                        <td style={{ padding: '10px 14px', textAlign: 'right', fontWeight: 800, color: 'var(--school-primary, #3182ce)' }}>{u.count}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Defaulters List (> 30 days overdue) */}
            <div className="portal-card" style={{ padding: 0, overflow: 'hidden' }}>
              <div style={{ padding: '14px 18px', borderBottom: '1px solid #e2e8f0', background: '#fee2e2' }}>
                <h3 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 800, color: '#991b1b' }}>
                  <i className="fas fa-user-times mr-2"></i> Defaulters List (Over 30 Days Overdue)
                </h3>
              </div>
              <div className="table-responsive">
                <table className="management-table" style={{ width: '100%' }}>
                  <thead>
                    <tr style={{ background: '#f8fafc' }}>
                      <th style={{ padding: '10px 14px' }}>Borrower</th>
                      <th style={{ padding: '10px 14px' }}>Book Title</th>
                      <th style={{ padding: '10px 14px', textAlign: 'center' }}>Overdue</th>
                      <th style={{ padding: '10px 14px', textAlign: 'right' }}>Fine</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(users?.defaultersList || []).length === 0 ? (
                      <tr>
                        <td colSpan={4} style={{ textAlign: 'center', padding: '30px 14px', color: '#64748b' }}>
                          No defaulters over 30 days. Excellent compliance!
                        </td>
                      </tr>
                    ) : (
                      (users?.defaultersList || []).map((d: any) => (
                        <tr key={d.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                          <td style={{ padding: '10px 14px' }}>
                            <div style={{ fontWeight: 800, color: '#1e293b' }}>{d.borrowerName}</div>
                            <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{d.borrowerClass} • {d.borrowerPhone}</div>
                          </td>
                          <td style={{ padding: '10px 14px', fontSize: '0.85rem', color: '#334155' }}>{d.bookTitle}</td>
                          <td style={{ padding: '10px 14px', textAlign: 'center' }}>
                            <span style={{ background: '#fee2e2', color: '#991b1b', padding: '2px 8px', borderRadius: 999, fontWeight: 800, fontSize: '0.75rem' }}>
                              {d.daysOverdue} days
                            </span>
                          </td>
                          <td style={{ padding: '10px 14px', textAlign: 'right', fontWeight: 900, color: '#b91c1c' }}>
                            ${(d.fineAmount || 0).toFixed(2)}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 4: FINANCIAL REPORTS (LINKED TO BURSAR)                              */}
      {/* ========================================================================= */}
      {activeTab === 'financial' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          {/* Fines Income Area Chart */}
          <div className="portal-card" style={{ padding: 20 }}>
            <div style={{ marginBottom: 16 }}>
              <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 800, color: '#1e293b' }}>
                <i className="fas fa-chart-area mr-2 text-emerald-500"></i> Fines Collected Over Time (Income Stream)
              </h3>
              <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Revenue generated from overdue recoveries</span>
            </div>
            <div style={{ height: 260 }}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={financial?.finesOverTime || []}>
                  <defs>
                    <linearGradient id="fineColor" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis dataKey="month" stroke="#94a3b8" fontSize={12} />
                  <YAxis stroke="#94a3b8" fontSize={12} />
                  <Tooltip contentStyle={{ borderRadius: 8, border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
                  <Area type="monotone" dataKey="amount" name="Fines Collected ($)" stroke="#10b981" fillOpacity={1} fill="url(#fineColor)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Requisitions Summary & School Comparison Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(440px, 1fr))', gap: 20 }}>
            {/* Requisitions Summary */}
            <div className="portal-card" style={{ padding: 20 }}>
              <h3 style={{ margin: '0 0 16px 0', fontSize: '1.05rem', fontWeight: 800, color: '#0f172a' }}>
                <i className="fas fa-file-invoice mr-2 text-indigo-500"></i> Requisitions Roster (Linked to Bursar)
              </h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
                <div style={{ background: '#f8fafc', padding: 14, borderRadius: 8, border: '1px solid #e2e8f0' }}>
                  <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 700 }}>Total Requisition Value</div>
                  <div style={{ fontSize: '1.5rem', fontWeight: 900, color: '#0f172a', margin: '4px 0' }}>
                    ${financial?.requisitions?.totalRequestedValue?.toLocaleString() || '0.00'}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#475569' }}>Total requested</div>
                </div>

                <div style={{ background: '#f0fdf4', padding: 14, borderRadius: 8, border: '1px solid #bbf7d0' }}>
                  <div style={{ fontSize: '0.75rem', color: '#166534', fontWeight: 700 }}>Approved Budget</div>
                  <div style={{ fontSize: '1.5rem', fontWeight: 900, color: '#15803d', margin: '4px 0' }}>
                    ${financial?.requisitions?.approvedValue?.toLocaleString() || '0.00'}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#16a34a' }}>Approved by Bursar & Admin</div>
                </div>
              </div>

              <div style={{ display: 'flex', gap: 12 }}>
                <span style={{ background: '#fef3c7', color: '#92400e', padding: '6px 12px', borderRadius: 6, fontSize: '0.8rem', fontWeight: 700 }}>
                  Pending: {financial?.requisitions?.pendingCount}
                </span>
                <span style={{ background: '#dcfce7', color: '#166534', padding: '6px 12px', borderRadius: 6, fontSize: '0.8rem', fontWeight: 700 }}>
                  Approved: {financial?.requisitions?.approvedCount}
                </span>
                <span style={{ background: '#fee2e2', color: '#991b1b', padding: '6px 12px', borderRadius: 6, fontSize: '0.8rem', fontWeight: 700 }}>
                  Rejected: {financial?.requisitions?.rejectedCount}
                </span>
              </div>
            </div>

            {/* School Comparison Scoped Card */}
            <div className="portal-card" style={{ padding: 20 }}>
              <h3 style={{ margin: '0 0 16px 0', fontSize: '1.05rem', fontWeight: 800, color: '#0f172a' }}>
                <i className="fas fa-balance-scale mr-2 text-primary"></i> School System Scoped Alignment
              </h3>
              <p style={{ fontSize: '0.8rem', color: '#64748b', marginBottom: 16 }}>
                Ensures library financial indicators match the bursary general ledger without drift.
              </p>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', fontWeight: 700, marginBottom: 4 }}>
                    <span>Library Assets Value:</span>
                    <strong style={{ color: '#2563eb' }}>${financial?.schoolComparison?.libraryAssetsValue?.toLocaleString()} ({financial?.schoolComparison?.libraryAssetSharePercent}% of School)</strong>
                  </div>
                  <div style={{ background: '#f1f5f9', borderRadius: 4, height: 8, overflow: 'hidden' }}>
                    <div style={{ width: `${Math.min(100, financial?.schoolComparison?.libraryAssetSharePercent || 0)}%`, background: '#2563eb', height: '100%' }}></div>
                  </div>
                </div>

                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', fontWeight: 700, marginBottom: 4 }}>
                    <span>Library Fines Share:</span>
                    <strong style={{ color: '#10b981' }}>${financial?.schoolComparison?.libraryFines} (100% of fine accounts)</strong>
                  </div>
                  <div style={{ background: '#f1f5f9', borderRadius: 4, height: 8, overflow: 'hidden' }}>
                    <div style={{ width: '100%', background: '#10b981', height: '100%' }}></div>
                  </div>
                </div>

                <div style={{ background: '#f8fafc', padding: 12, borderRadius: 8, border: '1px solid #e2e8f0', marginTop: 4 }}>
                  <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 700 }}>Total Cost of Books Acquired:</span>
                  <div style={{ fontSize: '1.25rem', fontWeight: 900, color: '#0f172a' }}>
                    ${financial?.costOfBooksPurchased?.toLocaleString() || '0.00'}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 5: RESERVATIONS                                                      */}
      {/* ========================================================================= */}
      {activeTab === 'reservations' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          {/* Reservation KPI Highlights */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 }}>
            <div className="portal-card" style={{ padding: 20 }}>
              <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>Conversion Rate</span>
              <div style={{ fontSize: '2rem', fontWeight: 900, color: '#2563eb', margin: '4px 0' }}>
                {reservations?.conversionRate}%
              </div>
              <div style={{ fontSize: '0.75rem', color: '#16a34a', fontWeight: 700 }}>Reservations successfully issued to patrons</div>
            </div>

            <div className="portal-card" style={{ padding: 20 }}>
              <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>Pending Reservations</span>
              <div style={{ fontSize: '2rem', fontWeight: 900, color: '#f59e0b', margin: '4px 0' }}>
                {reservations?.pendingReservations?.length || 0}
              </div>
              <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Waiting on shelf or return</div>
            </div>

            <div className="portal-card" style={{ padding: 20 }}>
              <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>Requisitions Raised vs Approved</span>
              <div style={{ fontSize: '1.5rem', fontWeight: 900, color: '#0f172a', margin: '4px 0' }}>
                {reservations?.requisitionsRaisedVsApproved?.approved} / {reservations?.requisitionsRaisedVsApproved?.raised}
              </div>
              <div style={{ fontSize: '0.75rem', color: '#059669', fontWeight: 700 }}>Budget approval fulfillment rate</div>
            </div>
          </div>

          {/* Pending Reservations Table */}
          <div className="portal-card" style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{ padding: '14px 18px', borderBottom: '1px solid #e2e8f0', background: '#f8fafc' }}>
              <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 800, color: '#0f172a' }}>
                <i className="fas fa-bookmark text-primary mr-2"></i> Pending & Ready Book Reservations
              </h3>
            </div>
            <div className="table-responsive">
              <table className="management-table" style={{ width: '100%' }}>
                <thead>
                  <tr style={{ background: '#f8fafc' }}>
                    <th style={{ padding: '12px 18px', textAlign: 'left' }}>Book Title</th>
                    <th style={{ padding: '12px 18px', textAlign: 'left' }}>Requester</th>
                    <th style={{ padding: '12px 18px', textAlign: 'left' }}>Request Date</th>
                    <th style={{ padding: '12px 18px', textAlign: 'center' }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {(reservations?.pendingReservations || []).length === 0 ? (
                    <tr>
                      <td colSpan={4} style={{ textAlign: 'center', padding: '40px 18px', color: '#64748b' }}>
                        No pending book reservations at this time.
                      </td>
                    </tr>
                  ) : (
                    (reservations?.pendingReservations || []).map((r: any) => (
                      <tr key={r.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '12px 18px', fontWeight: 800, color: '#1e293b' }}>{r.bookTitle}</td>
                        <td style={{ padding: '12px 18px', fontWeight: 700, color: '#475569' }}>{r.requesterName}</td>
                        <td style={{ padding: '12px 18px', color: '#64748b' }}>{new Date(r.requestDate).toLocaleDateString()}</td>
                        <td style={{ padding: '12px 18px', textAlign: 'center' }}>
                          <span style={{
                            background: r.status === 'Ready for Pickup' ? '#ecfdf5' : '#fef3c7',
                            color: r.status === 'Ready for Pickup' ? '#065f46' : '#92400e',
                            padding: '4px 10px',
                            borderRadius: 9999,
                            fontWeight: 800,
                            fontSize: '0.75rem'
                          }}>
                            {r.status}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
