import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../../lib/api';
import { toast } from 'react-hot-toast';
import '../../../styles/portal.css';

import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, AreaChart, Area, ComposedChart
} from 'recharts';

const COLORS = ['#2563eb', '#10b981', 'var(--portal-danger)', '#8b5cf6', '#f59e0b', '#06b6d4', '#ec4899', '#f97316'];

export default function ReportViewerPage() {
  const { type } = useParams<{ type: string }>();
  const navigate = useNavigate();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ 
    from: '', to: '', categoryId: '', paymentMode: '', allocationId: '', classId: '',
    groupName: '2024', studentCategory: 'All', classCategory: 'All', reportMode: 'Detailed List',
    selectedClasses: [] as string[],
    feeGroupId: '', receiptNo: '', year: new Date().getFullYear().toString(), term: 'All Terms', status: 'Active Students',
    selectedFeeGroups: [] as string[],
    searchName: '', searchSurname: '', searchTerm: '', showBalanceOnly: true,
    logType: 'WhatsApp'
  });
  
  const [categories, setCategories] = useState<any[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<any[]>([]);
  const [allocations, setAllocations] = useState<any[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [feeGroups, setFeeGroups] = useState<any[]>([]);

  useEffect(() => {
    fetchData();
    fetchOptions();
  }, [type]);

  const fetchOptions = async () => {
    try {
      const classRes = await api.get('/api/classes');
      setClasses(Array.isArray(classRes.data) ? classRes.data : []);

      if (['detailed-expenses', 'fees-takings', 'payments-analytics', 'balances-summary', 'single-fee-group'].includes(type || '')) {
        const [catRes, payRes, fgRes] = await Promise.all([
          api.get('/api/accounts/categories'),
          api.get('/api/finance/payment-methods'),
          api.get('/api/fees/groups')
        ]);
        setCategories(Array.isArray(catRes.data) ? catRes.data.filter((c: any) => c.type === 'EXPENSE') : []);
        setPaymentMethods(Array.isArray(payRes.data) ? payRes.data : []);
        setFeeGroups(Array.isArray(fgRes.data) ? fgRes.data : []);
      }
      if (type === 'revenue-allocation') {
        const allocRes = await api.get('/api/finance/revenue-allocations');
        setAllocations(Array.isArray(allocRes.data) ? allocRes.data : []);
        if (allocRes.data.length > 0 && !filters.allocationId) {
          setFilters(f => ({ ...f, allocationId: allocRes.data[0].id }));
        }
      }
    } catch (error) {}
  };

  const fetchData = async () => {
    try {
      setLoading(true);
      let endpoint = '';
      switch (type) {
        case 'payroll-runs': endpoint = '/api/report-data/payroll-runs'; break;
        case 'employee-payslips': endpoint = '/api/report-data/employee-payslips'; break;
        case 'tax-contributions': endpoint = '/api/report-data/tax-contributions'; break;
        case 'grocery-consumption': endpoint = '/api/report-data/grocery-consumption'; break;
        case 'profit-loss': endpoint = '/api/report-data/profit-loss'; break;
        case 'detailed-expenses': endpoint = '/api/report-data/detailed-expenses'; break;
        case 'revenue-allocation': endpoint = '/api/report-data/revenue-allocation'; break;
        case 'enrollment-grouped': endpoint = '/api/report-data/enrollment-grouped'; break;
        case 'fees-takings': endpoint = '/api/report-data/fees-takings'; break;
        case 'payments-analytics': endpoint = '/api/report-data/payments-analytics'; break;
        case 'student-debtors': endpoint = '/api/report-data/student-debtors'; break;
        case 'balances-summary': endpoint = '/api/report-data/balances-summary'; break;
        case 'single-fee-group': endpoint = '/api/report-data/single-fee-group'; break;
        case 'student-balances': endpoint = '/api/report-data/student-balances'; break;
        case 'communication-logs': endpoint = '/api/report-data/communication-logs'; break;
        case 'payment-history': endpoint = '/api/report-data/payment-history'; break;
        case 'uniforms-analytics': endpoint = '/api/report-data/uniforms-analytics'; break;
        case 'fees-payments': endpoint = '/api/report-data/fees-payments'; break;
        case 'audit-logs': endpoint = '/api/report-data/audit-logs'; break;
        case 'fee-reminders': endpoint = '/api/report-data/fee-reminders'; break;
        case 'institutional-overview': endpoint = '/api/report-data/institutional-overview'; break;
        default: endpoint = '';
      }

      if (endpoint) {
        const params = { 
          ...filters, 
          classIds: filters.selectedClasses.join(','),
          feeGroupIds: filters.selectedFeeGroups.join(','),
          type: filters.logType // for communication logs
        };
        const res = await api.get(endpoint, { params });
        setData(res.data);
      }
    } catch (error) {
      toast.error('Failed to load report data');
    } finally {
      setLoading(false);
    }
  };

  const getTitle = () => {
    switch (type) {
      case 'payroll-runs': return 'Payroll Runs Summary';
      case 'employee-payslips': return 'Employee Payslips Report';
      case 'tax-contributions': return 'Tax & Contributions Report';
      case 'grocery-consumption': return 'Grocery Consumption Report';
      case 'profit-loss': return 'Profit & Loss Report';
      case 'detailed-expenses': return 'Detailed Expense Report';
      case 'revenue-allocation': return 'Revenue Allocation Report';
      case 'enrollment-grouped': return 'Grouped Enrollment Report';
      case 'fees-takings': return 'School Fees Takings';
      case 'payments-analytics': return 'Payments Report';
      case 'student-debtors': return 'Student Debtors Report';
      case 'balances-summary': return 'Fees Balance Summary Report';
      case 'single-fee-group': return 'Single Fee Group Report';
      case 'student-balances': return 'Student Balances Dashboard';
      case 'communication-logs': return 'Communication activity logs';
      case 'payment-history': return 'Student Payment History';
      case 'uniforms-analytics': return 'Uniforms Analytics';
      case 'fees-payments': return 'All Student Fees Payments';
      case 'fee-reminders': return 'Fee Reminders Sent History';
      case 'institutional-overview': return 'Institutional Executive Summary';
      default: return 'Report Viewer';
    }
  };

  const toggleClass = (id: string) => {
    const next = filters.selectedClasses.includes(id) 
      ? filters.selectedClasses.filter(c => c !== id)
      : [...filters.selectedClasses, id];
    setFilters({ ...filters, selectedClasses: next });
  };

  if (loading) return (
    <div className="portal-container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '400px' }}>
      <div className="portal-spinner"></div>
    </div>
  );

  const exportToCSV = () => {
    const rows = Array.isArray(data) ? data : (data?.records || data?.list || []);
    if (!rows.length) return toast.error('No data to export');
    const headers = Object.keys(rows[0]).filter(k => typeof rows[0][k] !== 'object');
    const csv = [headers.join(','), ...rows.map((r: any) => headers.map(h => `"${r[h] ?? ''}"`).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = `${type}-report.csv`; a.click();
  };

  const exportToWord = () => {
    const rows = Array.isArray(data) ? data : (data?.records || data?.list || []);
    if (!rows.length) return toast.error('No data to export');
    const headers = Object.keys(rows[0]).filter(k => typeof rows[0][k] !== 'object');
    const tableRows = rows.map((r: any) => `<tr>${headers.map(h => `<td>${r[h] ?? ''}</td>`).join('')}</tr>`).join('');
    const html = `<html><body><h2>${getTitle()}</h2><table border="1"><thead><tr>${headers.map(h => `<th>${h}</th>`).join('')}</tr></thead><tbody>${tableRows}</tbody></table></body></html>`;
    const blob = new Blob([html], { type: 'application/msword' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = `${type}-report.doc`; a.click();
  };

  const handlePrint = () => window.print();

  return (
    <div className="portal-container">
      <div className="portal-page-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <button onClick={() => navigate(-1)} className="portal-btn-ghost" style={{ padding: '8px', width: '40px', height: '40px', borderRadius: '10px' }}>
            <i className="fas fa-arrow-left"></i>
          </button>
          <div>
            <h1>{getTitle()}</h1>
            <p>Institutional Audit & Insights | Academic Session {filters.year}</p>
          </div>
        </div>
      </div>

      {/* ── Summary Cards ── */}
      {data?.summary && (
        <div className={`animate-in fade-in slide-in-from-top-4 duration-500`} style={{ marginBottom: '32px', display: 'flex', flexWrap: 'wrap', gap: '16px' }}>
          {type === 'uniforms-analytics' && (
            <>
              <div className="portal-card"><div className="portal-card-body" style={{padding: '24px'}}><label className="portal-label">REVENUE</label><div className="stat-value">${data.summary.totalRevenue.toLocaleString()}</div></div></div>
              <div className="portal-card"><div className="portal-card-body" style={{padding: '24px'}}><label className="portal-label">TOTAL SALES</label><div className="stat-value">{data.summary.totalSales}</div></div></div>
              <div className="portal-card"><div className="portal-card-body" style={{padding: '24px'}}><label className="portal-label">LOW STOCK</label><div className="stat-value" style={{color: 'var(--portal-danger)'}}>{data.summary.lowStockItems}</div></div></div>
              <div className="portal-card"><div className="portal-card-body" style={{padding: '24px'}}><label className="portal-label">CATALOG</label><div className="stat-value">{data.summary.totalItems} Items</div></div></div>
            </>
          )}
          {type === 'institutional-overview' && (
            <>
              <div className="portal-card"><div className="portal-card-body" style={{padding: '24px', textAlign: 'center'}}><label className="portal-label">STUDENTS</label><div className="stat-value">{data.summary.totalStudents}</div></div></div>
              <div className="portal-card"><div className="portal-card-body" style={{padding: '24px', textAlign: 'center'}}><label className="portal-label">STAFF</label><div className="stat-value">{data.summary.totalStaff}</div></div></div>
              <div className="portal-card"><div className="portal-card-body" style={{padding: '24px', textAlign: 'center'}}><label className="portal-label">REVENUE</label><div className="stat-value" style={{color: '#10b981'}}>${data.summary.totalRevenue.toLocaleString()}</div></div></div>
              <div className="portal-card"><div className="portal-card-body" style={{padding: '24px', textAlign: 'center'}}><label className="portal-label">DEBT</label><div className="stat-value" style={{color: 'var(--portal-danger)'}}>${data.summary.outstandingDebt.toLocaleString()}</div></div></div>
            </>
          )}
          {type === 'profit-loss' && (
            <>
              <div className="portal-card"><div className="portal-card-body" style={{padding: '24px'}}><label className="portal-label">INCOME</label><div className="stat-value" style={{color: '#10b981'}}>${data.summary.totalIncome.toLocaleString()}</div></div></div>
              <div className="portal-card"><div className="portal-card-body" style={{padding: '24px'}}><label className="portal-label">EXPENSES</label><div className="stat-value" style={{color: 'var(--portal-danger)'}}>${data.summary.totalExpenses.toLocaleString()}</div></div></div>
              <div className="portal-card"><div className="portal-card-body" style={{padding: '24px'}}><label className="portal-label">NET PROFIT</label><div className="stat-value" style={{color: data.summary.netProfit >= 0 ? '#10b981' : 'var(--portal-danger)'}}>${data.summary.netProfit.toLocaleString()}</div></div></div>
              <div className="portal-card"><div className="portal-card-body" style={{padding: '24px'}}><label className="portal-label">STUDENT CREDIT</label><div className="stat-value" style={{color: '#2563eb'}}>${data.summary.totalStudentCredit.toLocaleString()}</div></div></div>
            </>
          )}
          {type === 'balances-summary' && (
            <>
              <div className="portal-card" style={{flex: '1 1 180px'}}><div className="portal-card-body" style={{padding: '20px', textAlign:'center'}}><label className="portal-label" style={{fontSize:'0.65rem'}}>ALLOCATED</label><div className="stat-value" style={{fontSize:'1.4rem'}}>${data.summary.totalAllocated?.toLocaleString()}</div></div></div>
              <div className="portal-card" style={{flex: '1 1 180px'}}><div className="portal-card-body" style={{padding: '20px', textAlign:'center'}}><label className="portal-label" style={{fontSize:'0.65rem'}}>PAID</label><div className="stat-value" style={{color: '#10b981', fontSize:'1.4rem'}}>${data.summary.totalPaid?.toLocaleString()}</div></div></div>
              <div className="portal-card" style={{flex: '1 1 180px'}}><div className="portal-card-body" style={{padding: '20px', textAlign:'center'}}><label className="portal-label" style={{fontSize:'0.65rem'}}>OUTSTANDING</label><div className="stat-value" style={{color: 'var(--portal-danger)', fontSize:'1.4rem'}}>${data.summary.outstanding?.toLocaleString()}</div></div></div>
              <div className="portal-card" style={{flex: '1 1 180px'}}><div className="portal-card-body" style={{padding: '20px', textAlign:'center'}}><label className="portal-label" style={{fontSize:'0.65rem'}}>STUDENTS</label><div className="stat-value" style={{fontSize:'1.4rem'}}>{data.summary.studentCount}</div></div></div>
            </>
          )}
        </div>
      )}

      {/* ── Parameters ── */}
      <div className="portal-card" style={{ marginBottom: '32px' }}>
        <div className="portal-card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ margin: 0 }}>Audit Parameters</h3>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button onClick={exportToCSV} className="portal-btn-ghost" style={{ padding: '8px 16px', fontWeight: 900, fontSize: '0.8rem', border: '1px solid #e2e8f0' }} title="Export CSV">
              <i className="fas fa-file-csv mr-2" style={{ color: '#059669' }}></i>CSV
            </button>
            <button onClick={exportToWord} className="portal-btn-ghost" style={{ padding: '8px 16px', fontWeight: 900, fontSize: '0.8rem', border: '1px solid #e2e8f0' }} title="Export Word">
              <i className="fas fa-file-word mr-2" style={{ color: '#2563eb' }}></i>Word
            </button>
            <button onClick={handlePrint} className="portal-btn-ghost" style={{ padding: '8px 16px', fontWeight: 900, fontSize: '0.8rem', border: '1px solid #e2e8f0' }} title="Print">
              <i className="fas fa-print mr-2" style={{ color: '#64748b' }}></i>Print
            </button>
          </div>
        </div>
        <div className="portal-card-body" style={{ padding: '24px', display: 'flex', flexWrap: 'wrap', gap: '16px', alignItems: 'flex-end' }}>
          {(['grocery-consumption', 'profit-loss', 'detailed-expenses', 'fees-takings', 'payments-analytics', 'fees-payments', 'audit-logs', 'fee-reminders'].includes(type || '')) && (
            <>
              <div className="form-group" style={{marginBottom: 0}}><label className="portal-label">From</label><input type="date" value={filters.from} onChange={e => setFilters({...filters, from: e.target.value})} className="portal-input" /></div>
              <div className="form-group" style={{marginBottom: 0}}><label className="portal-label">To</label><input type="date" value={filters.to} onChange={e => setFilters({...filters, to: e.target.value})} className="portal-input" /></div>
            </>
          )}
          {type === 'student-balances' && (
            <div className="form-group" style={{marginBottom: 0, flex: 1}}><label className="portal-label">Search Student</label><input type="text" placeholder="Name or Surname..." value={filters.searchName} onChange={e => setFilters({...filters, searchName: e.target.value})} className="portal-input" /></div>
          )}
          {type === 'revenue-allocation' && (
            <div className="form-group" style={{marginBottom: 0, flex: 1}}><label className="portal-label">Allocation Config</label>
              <select value={filters.allocationId} onChange={e => setFilters({...filters, allocationId: e.target.value})} className="portal-input">
                <option value="">Select Config</option>
                {allocations.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
              </select>
            </div>
          )}
          <button onClick={fetchData} className="portal-btn-primary" style={{height: '48px', padding: '0 24px', fontWeight: 900}}><i className="fas fa-sync-alt mr-2"></i> Update Report</button>
        </div>
      </div>

      {/* ── Main Data View ── */}
      {data && (
        <div className="management-table-card">
          <div className="table-responsive">
            <table className="management-table">
              <thead>
                {type === 'payroll-runs' && <tr><th>Run ID</th><th>Date</th><th>Period</th><th>Employees</th><th style={{textAlign: 'right'}}>Total Net</th></tr>}
                {type === 'employee-payslips' && <tr><th>Employee</th><th>Month/Year</th><th style={{textAlign: 'right'}}>Gross</th><th style={{textAlign: 'right'}}>Tax</th><th style={{textAlign: 'right'}}>Net</th><th>Action</th></tr>}
                {type === 'tax-contributions' && <tr><th>Period</th><th>Employees</th><th style={{textAlign: 'right'}}>PAYE</th><th style={{textAlign: 'right'}}>Aids Levy</th><th style={{textAlign: 'right'}}>Total Ded.</th><th>Breakdown</th></tr>}
                {type === 'grocery-consumption' && <tr><th>Item</th><th>Date</th><th>Quantity</th><th>Unit</th><th>Recorded By</th></tr>}
                {type === 'profit-loss' && <tr><th>Narrative</th><th>Type</th><th style={{textAlign: 'right'}}>Credit</th><th style={{textAlign: 'right'}}>Debit</th><th style={{textAlign: 'right'}}>Impact</th></tr>}
                {type === 'detailed-expenses' && <tr><th>Description</th><th>Category</th><th>Mode</th><th style={{textAlign: 'right'}}>Amount</th><th>Date</th></tr>}
                {type === 'revenue-allocation' && <tr><th>Target</th><th style={{textAlign: 'center'}}>Percentage</th><th style={{textAlign: 'right'}}>Allocated Amount</th></tr>}
                {type === 'enrollment-grouped' && <tr><th>First Name</th><th>Surname</th><th>Gender</th><th>Group</th><th>Category</th><th>Class</th></tr>}
                {type === 'fees-takings' && <tr><th>Student</th><th>ID</th><th>Class</th><th>Mode</th><th style={{textAlign: 'right'}}>Amount</th><th>Captured By</th></tr>}
                {type === 'payments-analytics' && <tr><th>Receipt</th><th>Fee Group</th><th>Date</th><th>Mode</th><th style={{textAlign: 'right'}}>Amount</th><th style={{textAlign: 'right'}}>CR Saved</th></tr>}
                {type === 'student-debtors' && <tr><th>Student</th><th>Class</th><th>Phone</th><th style={{textAlign: 'right'}}>Outstanding</th></tr>}
                {type === 'balances-summary' && <tr><th>Fee Group</th><th>Students</th><th style={{textAlign: 'right'}}>Allocated</th><th style={{textAlign: 'right'}}>Paid</th><th style={{textAlign: 'right'}}>Collectible</th></tr>}
                {type === 'single-fee-group' && <tr><th>Student</th><th>Class</th><th style={{textAlign: 'right'}}>Allocated</th><th style={{textAlign: 'right'}}>Paid</th><th style={{textAlign: 'right'}}>Balance</th></tr>}
                {type === 'student-balances' && <tr><th>Student</th><th>Class</th>{data.columns?.map((c: any) => <th key={c.id} style={{textAlign: 'right'}}>{c.name}</th>)}<th style={{textAlign: 'right'}}>Total Balance</th></tr>}
                {type === 'communication-logs' && <tr><th>Timestamp</th><th>Recipient</th><th>Channel</th><th>Status</th><th>Sender</th></tr>}
                {type === 'payment-history' && <tr><th>Identifier</th><th>Student</th><th>History Summary</th><th>Action</th></tr>}
                {type === 'uniforms-analytics' && <tr><th>Date</th><th>Customer</th><th>Mode</th><th>Items</th><th style={{textAlign: 'right'}}>Total</th></tr>}
                {type === 'fees-payments' && <tr><th>Date</th><th>Student</th><th>Class</th><th>Fee Group</th><th>Mode</th><th style={{textAlign: 'right'}}>Amount</th></tr>}
                {type === 'audit-logs' && <tr><th>Action</th><th>Actor</th><th>Module</th><th>Time</th></tr>}
                {type === 'fee-reminders' && <tr><th>Timestamp</th><th>Student</th><th>Channel</th><th>Status</th></tr>}
              </thead>
              <tbody>
                {(Array.isArray(data) ? data : data.records || data.list || []).map((item: any, i: number) => (
                  <tr key={i}>
                    {type === 'payroll-runs' && <><td style={{fontWeight: 800}}>{item.id.slice(-8)}</td><td>{new Date(item.runDate).toLocaleDateString()}</td><td>{item.month}/{item.year}</td><td>{item.employeesCount}</td><td style={{textAlign: 'right', fontWeight: 900}}>${item.totalNet?.toLocaleString()}</td></>}
                    {type === 'employee-payslips' && <><td>{item.employeeName}</td><td>{item.payrollRun?.month}/{item.payrollRun?.year}</td><td style={{textAlign: 'right'}}>${item.grossSalary?.toLocaleString()}</td><td style={{textAlign: 'right'}}>${item.taxAmount?.toLocaleString()}</td><td style={{textAlign: 'right', fontWeight: 800}}>${item.netSalary?.toLocaleString()}</td><td><button className="portal-btn-ghost" style={{padding: '4px 8px', fontSize: '0.7rem'}} onClick={() => alert('This feature is currently under development or disabled.')}>View</button></td></>}
                    {type === 'tax-contributions' && <><td>{item.period}</td><td>{item.employees}</td><td style={{textAlign: 'right'}}>${item.totalPAYE?.toLocaleString()}</td><td style={{textAlign: 'right'}}>${item.totalAidsLevy?.toLocaleString()}</td><td style={{textAlign: 'right', fontWeight: 800}}>${(item.totalPAYE + item.totalAidsLevy + item.totalOtherDeductions).toLocaleString()}</td><td style={{fontSize: '0.75rem', color: '#64748b'}}>{item.breakdown}</td></>}
                    {type === 'grocery-consumption' && <><td>{item.product?.name}</td><td>{new Date(item.date).toLocaleDateString()}</td><td style={{fontWeight: 800}}>{item.quantity}</td><td>{item.unit || 'Units'}</td><td>{item.recordedBy || 'System'}</td></>}
                    {type === 'profit-loss' && <><td>{item.description}</td><td><span className="status-badge" style={{background: '#f1f5f9', color: '#475569'}}>{item.category || 'General'}</span></td><td style={{textAlign: 'right', color: '#10b981', fontWeight: 800}}>{item.income > 0 ? `$${item.income.toLocaleString()}` : '-'}</td><td style={{textAlign: 'right', color: 'var(--portal-danger)', fontWeight: 800}}>{item.expense > 0 ? `$${item.expense.toLocaleString()}` : '-'}</td><td style={{textAlign: 'right', fontWeight: 900}}>${item.balance?.toLocaleString() || '0'}</td></>}
                    {type === 'detailed-expenses' && <><td>{item.description}</td><td>{item.category?.name}</td><td>{item.paymentMode}</td><td style={{textAlign: 'right', fontWeight: 800}}>${item.amount?.toLocaleString()}</td><td>{new Date(item.date).toLocaleDateString()}</td></>}
                    {type === 'revenue-allocation' && <><td>{item.label}</td><td style={{textAlign: 'center'}}>{item.percentage}%</td><td style={{textAlign: 'right', fontWeight: 900}}>${item.allocatedAmount?.toLocaleString()}</td></>}
                    {type === 'enrollment-grouped' && <><td>{item.name}</td><td>{item.surname}</td><td>{item.gender}</td><td>{item.group}</td><td>{item.category}</td><td>{item.className}</td></>}
                    {type === 'fees-takings' && <><td>{item.studentName}</td><td>{item.id.slice(-6)}</td><td>{item.className}</td><td>{item.mode}</td><td style={{textAlign: 'right', fontWeight: 800}}>${item.amount?.toLocaleString()}</td><td>{item.capturedBy}</td></>}
                    {type === 'payments-analytics' && <><td>{item.receipt}</td><td>{item.group}</td><td>{new Date(item.date).toLocaleDateString()}</td><td>{item.mode}</td><td style={{textAlign: 'right', fontWeight: 800}}>${item.usd?.toLocaleString()}</td><td style={{textAlign: 'right', color: '#10b981'}}>${item.crSaved?.toLocaleString()}</td></>}
                    {type === 'student-debtors' && <><td>{item.name}</td><td>{item.className}</td><td>{item.phone}</td><td style={{textAlign: 'right', fontWeight: 900, color: 'var(--portal-danger)'}}>${item.balance?.toLocaleString()}</td></>}
                    {type === 'balances-summary' && <><td>{item.name}</td><td>{item.students}</td><td style={{textAlign: 'right'}}>${item.allocated?.toLocaleString()}</td><td style={{textAlign: 'right', color: '#10b981'}}>${item.paid?.toLocaleString()}</td><td style={{textAlign: 'right', color: 'var(--portal-danger)', fontWeight: 800}}>${item.collectible?.toLocaleString()}</td></>}
                    {type === 'single-fee-group' && <><td>{item.name}</td><td>{item.className}</td><td style={{textAlign: 'right'}}>${item.amount?.toLocaleString()}</td><td style={{textAlign: 'right', color: '#10b981'}}>${item.paid?.toLocaleString()}</td><td style={{textAlign: 'right', color: 'var(--portal-danger)', fontWeight: 800}}>${item.balance?.toLocaleString()}</td></>}
                    {type === 'student-balances' && <><td>{item.name}</td><td>{item.className}</td>{data.columns?.map((c: any) => <td key={c.id} style={{textAlign: 'right'}}>${(item.balances[c.id] || 0).toLocaleString()}</td>)}<td style={{textAlign: 'right', fontWeight: 900}}>${item.totalBalance?.toLocaleString()}</td></>}
                    {type === 'communication-logs' && <><td>{new Date(item.createdAt).toLocaleString()}</td><td>{item.student?.name}</td><td>{item.type}</td><td><span className={`status-badge ${item.status === 'Sent' ? 'success' : 'warning'}`}>{item.status}</span></td><td>{item.sender?.name}</td></>}
                    {type === 'payment-history' && <><td>{item.studentId}</td><td>{item.name}</td><td style={{fontSize: '0.8rem'}}>{item.history?.length} Billing Groups Tracked</td><td><button className="portal-btn-ghost" style={{padding: '4px 8px', fontSize: '0.7rem'}} onClick={() => alert('This feature is currently under development or disabled.')}>Open Audit</button></td></>}
                    {type === 'uniforms-analytics' && <><td>{new Date(item.date).toLocaleDateString()}</td><td>{item.student}</td><td>{item.paymentMode}</td><td>{item.itemsCount} Items</td><td style={{textAlign: 'right', fontWeight: 800}}>${item.total?.toLocaleString()}</td></>}
                    {type === 'fees-payments' && <><td>{new Date(item.date).toLocaleDateString()}</td><td>{item.studentName}</td><td>{item.className}</td><td>{item.feeGroup}</td><td>{item.mode}</td><td style={{textAlign: 'right', fontWeight: 800}}>${item.amount?.toLocaleString()}</td></>}
                    {type === 'audit-logs' && <><td>{item.action}</td><td>{item.actor?.name}</td><td>{item.action?.split('_')[0]}</td><td>{new Date(item.createdAt).toLocaleString()}</td></>}
                    {type === 'fee-reminders' && <><td>{new Date(item.createdAt).toLocaleString()}</td><td>{item.student?.name}</td><td>{item.type}</td><td>{item.status}</td></>}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* ── Visualizations ── */}
          {(['student-balances','single-fee-group','balances-summary','student-debtors','fees-payments','fees-takings',
             'enrollment-grouped','profit-loss','detailed-expenses','revenue-allocation','grocery-consumption',
             'payroll-runs','employee-payslips','uniforms-analytics','fee-reminders'].includes(type || '')) && data && (() => {
            const records = Array.isArray(data) ? data : (data?.records || data?.list || data?.breakdown || data?.detailed || []);
            const CC = ['#2563eb','#10b981','var(--portal-danger)','#8b5cf6','#f59e0b','#06b6d4','#ec4899','#f97316'];
            const ttStyle = { borderRadius: '12px', border: '1px solid #f1f5f9' };
            const chartCard = (title: string, children: React.ReactNode) => (
              <div style={{ background: 'white', borderRadius: '16px', padding: '24px', border: '1px solid #f1f5f9', boxShadow: '0 1px 8px rgba(0,0,0,0.04)' }}>
                <p style={{ margin: '0 0 16px', fontWeight: 900, fontSize: '0.85rem', color: '#475569', textTransform: 'uppercase', letterSpacing: '1px' }}>{title}</p>
                <div style={{ height: '260px' }}>{children}</div>
              </div>
            );
            const gradDef = (id: string, color: string) => <defs><linearGradient id={id} x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor={color} stopOpacity={0.18} /><stop offset="95%" stopColor={color} stopOpacity={0} /></linearGradient></defs>;
            const vizWrap = (icon: string, color: string, title: string, children: React.ReactNode) => (
              <div style={{ padding: '32px', background: '#f8fafc', borderTop: '1px solid #f1f5f9' }}>
                <h3 style={{ marginBottom: '28px', fontSize:'1.1rem', fontWeight:900, color:'#1e293b' }}>
                  <i className={`fas ${icon} mr-3`} style={{color}} /> {title}
                </h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '24px' }}>{children}</div>
              </div>
            );

            const byClass: Record<string,{paid:number,balance:number,count:number}> = {};
            records.forEach((r: any) => {
              const cls = r.className || r.class || 'Unknown';
              if (!byClass[cls]) byClass[cls] = { paid:0, balance:0, count:0 };
              byClass[cls].paid += r.paid || r.amount || 0;
              byClass[cls].balance += r.balance || r.collectible || r.outstanding || 0;
              byClass[cls].count += 1;
            });
            const classData = Object.entries(byClass).map(([name,v]) => ({ name, ...v }));
            const totalPaid = records.reduce((s: number, r: any) => s + (r.paid || r.amount || 0), 0);
            const totalBalance = records.reduce((s: number, r: any) => s + (r.balance || r.collectible || r.outstanding || 0), 0);
            const donutData = [
              { name: 'Paid', value: totalPaid },
              { name: 'Outstanding', value: totalBalance }
            ];
            const top10 = [...records].sort((a:any,b:any) => (b.balance||b.collectible||b.outstanding||0) - (a.balance||a.collectible||a.outstanding||0)).slice(0,10);
            const top10Data = top10.map((r:any) => ({ name: r.studentName||r.name||r.feeGroup||'?', value: r.balance||r.collectible||r.outstanding||r.amount||0 }));
            // Group by fee group or date for trend
            const trendMap: Record<string,number> = {};
            records.forEach((r:any) => { const k = r.feeGroup||r.name||r.date?.slice(0,7)||'?'; trendMap[k] = (trendMap[k]||0) + (r.amount||r.paid||r.collectible||0); });
            const trendData = Object.entries(trendMap).map(([name,value]) => ({ name, value })).slice(0,12);
            // ─── Enrollment Grouped ────────────────────────────────────────
            if (type === 'enrollment-grouped') {
              const byClass: Record<string,{male:number,female:number}> = {};
              records.forEach((r:any) => { const cls = r.className||'Unknown'; if (!byClass[cls]) byClass[cls]={male:0,female:0}; if(r.gender==='Male') byClass[cls].male++; else byClass[cls].female++; });
              const cd = Object.entries(byClass).map(([name,v]) => ({name,...v}));
              const gd = [{name:'Male',value:records.filter((r:any)=>r.gender==='Male').length},{name:'Female',value:records.filter((r:any)=>r.gender==='Female').length}];
              const t10 = Object.entries(byClass).map(([name,v])=>({name,value:v.male+v.female})).sort((a,b)=>b.value-a.value).slice(0,10);
              const catM: Record<string,number>={}; records.forEach((r:any)=>{ const k=r.category||'Unknown'; catM[k]=(catM[k]||0)+1; });
              const catD = Object.entries(catM).map(([name,value])=>({name,value}));
              return vizWrap('fa-users','#10b981','Enrollment Visualizations',<>
                {chartCard('By Class (M/F)',<ResponsiveContainer width="100%" height="100%"><BarChart data={cd} margin={{top:4,right:8,bottom:0,left:0}}><CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" /><XAxis dataKey="name" fontSize={9} tick={{fill:'#94a3b8'}} /><YAxis fontSize={10} tick={{fill:'#94a3b8'}} /><Tooltip contentStyle={ttStyle} /><Legend /><Bar dataKey="male" name="Male" fill="#3b82f6" radius={[4,4,0,0]} /><Bar dataKey="female" name="Female" fill="#ec4899" radius={[4,4,0,0]} /></BarChart></ResponsiveContainer>)}
                {chartCard('Gender Ratio',<ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={gd} dataKey="value" nameKey="name" innerRadius={70} outerRadius={110} paddingAngle={4}><Cell fill="#3b82f6" /><Cell fill="#ec4899" /></Pie><Tooltip contentStyle={ttStyle} /><Legend /></PieChart></ResponsiveContainer>)}
                {chartCard('Top 10 Classes',<ResponsiveContainer width="100%" height="100%"><BarChart data={t10} layout="vertical" margin={{top:0,right:16,bottom:0,left:0}}><CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" /><XAxis type="number" fontSize={10} tick={{fill:'#94a3b8'}} /><YAxis type="category" dataKey="name" fontSize={9} tick={{fill:'#64748b'}} width={80} /><Tooltip contentStyle={ttStyle} /><Bar dataKey="value" name="Students" fill="#10b981" radius={[0,4,4,0]}>{t10.map((_: any, i: number)=><Cell key={i} fill={CC[i%CC.length]} />)}</Bar></BarChart></ResponsiveContainer>)}
                {chartCard('By Category',<ResponsiveContainer width="100%" height="100%"><AreaChart data={catD} margin={{top:4,right:8,bottom:0,left:0}}>{gradDef('cGr','#10b981')}<CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" /><XAxis dataKey="name" fontSize={10} tick={{fill:'#94a3b8'}} /><YAxis fontSize={10} tick={{fill:'#94a3b8'}} /><Tooltip contentStyle={ttStyle} /><Area type="monotone" dataKey="value" name="Students" stroke="#10b981" strokeWidth={2.5} fill="url(#cGr)" dot={{r:4,fill:'#10b981'}} /></AreaChart></ResponsiveContainer>)}
              </>);
            }
            // ─── Profit & Loss ─────────────────────────────────────────────
            if (type === 'profit-loss') {
              const bk = Array.isArray(data?.breakdown) ? data.breakdown : records;
              const bd = bk.map((r:any)=>({name:(r.description||'?').slice(0,14),income:r.income||r.usd||0,expense:r.expense||0}));
              const pp = [{name:'Income',value:data?.summary?.totalIncome||0},{name:'Expenses',value:data?.summary?.totalExpenses||0}];
              const nd = bk.map((r:any)=>({name:(r.description||'?').slice(0,14),value:(r.income||r.usd||0)-(r.expense||0)}));
              const td = bk.map((r:any)=>({name:(r.description||'?').slice(0,12),value:r.income||r.usd||r.expense||0}));
              return vizWrap('fa-balance-scale','var(--portal-danger)','Financial Visualizations',<>
                {chartCard('Income vs Expenses',<ResponsiveContainer width="100%" height="100%"><BarChart data={bd} margin={{top:4,right:8,bottom:0,left:0}}><CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" /><XAxis dataKey="name" fontSize={9} tick={{fill:'#94a3b8'}} /><YAxis fontSize={10} tick={{fill:'#94a3b8'}} /><Tooltip contentStyle={ttStyle} formatter={(v:any)=>`$${Number(v).toLocaleString()}`} /><Legend /><Bar dataKey="income" name="Income" fill="#10b981" radius={[4,4,0,0]} /><Bar dataKey="expense" name="Expense" fill='var(--portal-danger)' radius={[4,4,0,0]} /></BarChart></ResponsiveContainer>)}
                {chartCard('Income vs Expenses Ratio',<ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={pp} dataKey="value" nameKey="name" innerRadius={70} outerRadius={110} paddingAngle={4}><Cell fill="#10b981" /><Cell fill='var(--portal-danger)' /></Pie><Tooltip contentStyle={ttStyle} formatter={(v:any)=>`$${Number(v).toLocaleString()}`} /><Legend /></PieChart></ResponsiveContainer>)}
                {chartCard('Net Impact per Category',<ResponsiveContainer width="100%" height="100%"><BarChart data={nd} layout="vertical" margin={{top:0,right:16,bottom:0,left:0}}><CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" /><XAxis type="number" fontSize={10} tick={{fill:'#94a3b8'}} /><YAxis type="category" dataKey="name" fontSize={9} tick={{fill:'#64748b'}} width={90} /><Tooltip contentStyle={ttStyle} formatter={(v:any)=>`$${Number(v).toLocaleString()}`} /><Bar dataKey="value" name="Net" radius={[0,4,4,0]}>{nd.map((e:any,i:number)=><Cell key={i} fill={e.value>=0?'#10b981':'var(--portal-danger)'} />)}</Bar></BarChart></ResponsiveContainer>)}
                {chartCard('Revenue & Expense Trend',<ResponsiveContainer width="100%" height="100%"><AreaChart data={td} margin={{top:4,right:8,bottom:0,left:0}}>{gradDef('pGr','var(--portal-danger)')}<CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" /><XAxis dataKey="name" fontSize={9} tick={{fill:'#94a3b8'}} /><YAxis fontSize={10} tick={{fill:'#94a3b8'}} /><Tooltip contentStyle={ttStyle} formatter={(v:any)=>`$${Number(v).toLocaleString()}`} /><Area type="monotone" dataKey="value" name="Amount" stroke='var(--portal-danger)' strokeWidth={2.5} fill="url(#pGr)" dot={{r:4,fill:'var(--portal-danger)'}} /></AreaChart></ResponsiveContainer>)}
              </>);
            }
            // ─── Detailed Expenses ─────────────────────────────────────────
            if (type === 'detailed-expenses') {
              const catM: Record<string,number>={}; const modeM: Record<string,number>={};
              records.forEach((r:any)=>{ const c=r.category?.name||'Other'; catM[c]=(catM[c]||0)+(r.amount||0); const m=r.paymentMode||'Unknown'; modeM[m]=(modeM[m]||0)+(r.amount||0); });
              const cd = Object.entries(catM).map(([name,value])=>({name,value}));
              const md = Object.entries(modeM).map(([name,value])=>({name,value}));
              const t10 = [...records].sort((a:any,b:any)=>(b.amount||0)-(a.amount||0)).slice(0,10).map((r:any)=>({name:(r.description||r.title||'?').slice(0,20),value:r.amount||0}));
              const tM: Record<string,number>={}; records.forEach((r:any)=>{ const k=(r.date||'').slice(0,7)||'?'; tM[k]=(tM[k]||0)+(r.amount||0); });
              const td = Object.entries(tM).map(([name,value])=>({name,value}));
              return vizWrap('fa-file-invoice-dollar','var(--portal-danger)','Expense Visualizations',<>
                {chartCard('By Category',<ResponsiveContainer width="100%" height="100%"><BarChart data={cd} margin={{top:4,right:8,bottom:0,left:0}}><CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" /><XAxis dataKey="name" fontSize={9} tick={{fill:'#94a3b8'}} /><YAxis fontSize={10} tick={{fill:'#94a3b8'}} /><Tooltip contentStyle={ttStyle} formatter={(v:any)=>`$${Number(v).toLocaleString()}`} /><Bar dataKey="value" name="Amount" radius={[4,4,0,0]}>{cd.map((_: any, i: number)=><Cell key={i} fill={CC[i%CC.length]} />)}</Bar></BarChart></ResponsiveContainer>)}
                {chartCard('By Payment Mode',<ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={md} dataKey="value" nameKey="name" innerRadius={65} outerRadius={105} paddingAngle={4}>{md.map((_: any, i: number)=><Cell key={i} fill={CC[i%CC.length]} />)}</Pie><Tooltip contentStyle={ttStyle} formatter={(v:any)=>`$${Number(v).toLocaleString()}`} /><Legend /></PieChart></ResponsiveContainer>)}
                {chartCard('Top 10 Expenses',<ResponsiveContainer width="100%" height="100%"><BarChart data={t10} layout="vertical" margin={{top:0,right:16,bottom:0,left:0}}><CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" /><XAxis type="number" fontSize={10} tick={{fill:'#94a3b8'}} /><YAxis type="category" dataKey="name" fontSize={9} tick={{fill:'#64748b'}} width={100} /><Tooltip contentStyle={ttStyle} formatter={(v:any)=>`$${Number(v).toLocaleString()}`} /><Bar dataKey="value" name="Amount" fill='var(--portal-danger)' radius={[0,4,4,0]}>{t10.map((_: any, i: number)=><Cell key={i} fill={CC[i%CC.length]} />)}</Bar></BarChart></ResponsiveContainer>)}
                {chartCard('Expense Trend',<ResponsiveContainer width="100%" height="100%"><AreaChart data={td} margin={{top:4,right:8,bottom:0,left:0}}>{gradDef('eGr','var(--portal-danger)')}<CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" /><XAxis dataKey="name" fontSize={10} tick={{fill:'#94a3b8'}} /><YAxis fontSize={10} tick={{fill:'#94a3b8'}} /><Tooltip contentStyle={ttStyle} formatter={(v:any)=>`$${Number(v).toLocaleString()}`} /><Area type="monotone" dataKey="value" name="Amount" stroke='var(--portal-danger)' strokeWidth={2.5} fill="url(#eGr)" dot={{r:4,fill:'var(--portal-danger)'}} /></AreaChart></ResponsiveContainer>)}
              </>);
            }
            // ─── Revenue Allocation ────────────────────────────────────────
            if (type === 'revenue-allocation') {
              const bk = Array.isArray(data?.breakdown) ? data.breakdown : records;
              const pd = bk.map((r:any)=>({name:r.label||'?',value:r.percentage||0}));
              const bd = bk.map((r:any)=>({name:(r.label||'?').slice(0,16),value:r.allocatedAmount||0}));
              const cd = bk.map((r:any)=>({name:(r.label||'?').slice(0,14),pct:r.percentage||0,amount:r.allocatedAmount||0}));
              const tot = data?.totalRevenue||0; const alloc = bk.reduce((s:number,r:any)=>s+(r.allocatedAmount||0),0);
              const rp = [{name:'Allocated',value:alloc},{name:'Remaining',value:Math.max(0,tot-alloc)}];
              return vizWrap('fa-chart-pie','var(--portal-danger)','Revenue Allocation Visualizations',<>
                {chartCard('Allocation Share (%)',<ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={pd} dataKey="value" nameKey="name" outerRadius={110} paddingAngle={3}>{pd.map((_: any, i: number)=><Cell key={i} fill={CC[i%CC.length]} />)}</Pie><Tooltip contentStyle={ttStyle} formatter={(v:any)=>`${Number(v).toFixed(1)}%`} /><Legend /></PieChart></ResponsiveContainer>)}
                {chartCard('Allocated Amount',<ResponsiveContainer width="100%" height="100%"><BarChart data={bd} margin={{top:4,right:8,bottom:0,left:0}}><CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" /><XAxis dataKey="name" fontSize={9} tick={{fill:'#94a3b8'}} /><YAxis fontSize={10} tick={{fill:'#94a3b8'}} /><Tooltip contentStyle={ttStyle} formatter={(v:any)=>`$${Number(v).toLocaleString()}`} /><Bar dataKey="value" name="Amount" radius={[4,4,0,0]}>{bd.map((_: any, i: number)=><Cell key={i} fill={CC[i%CC.length]} />)}</Bar></BarChart></ResponsiveContainer>)}
                {chartCard('Allocated vs Remaining',<ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={rp} dataKey="value" nameKey="name" innerRadius={65} outerRadius={105} paddingAngle={4}><Cell fill="#10b981" /><Cell fill="#94a3b8" /></Pie><Tooltip contentStyle={ttStyle} formatter={(v:any)=>`$${Number(v).toLocaleString()}`} /><Legend /></PieChart></ResponsiveContainer>)}
                {chartCard('% vs Amount',<ResponsiveContainer width="100%" height="100%"><ComposedChart data={cd} margin={{top:4,right:8,bottom:0,left:0}}><CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" /><XAxis dataKey="name" fontSize={9} tick={{fill:'#94a3b8'}} /><YAxis yAxisId="p" orientation="left" fontSize={10} tick={{fill:'#94a3b8'}} /><YAxis yAxisId="a" orientation="right" fontSize={10} tick={{fill:'#94a3b8'}} /><Tooltip contentStyle={ttStyle} /><Legend /><Bar yAxisId="a" dataKey="amount" name="Amount $" fill="#10b981" radius={[4,4,0,0]} opacity={0.7} /><Line yAxisId="p" type="monotone" dataKey="pct" name="%" stroke='var(--portal-danger)' strokeWidth={2} dot={{r:4}} /></ComposedChart></ResponsiveContainer>)}
              </>);
            }
            // ─── Grocery Consumption ───────────────────────────────────────
            if (type === 'grocery-consumption') {
              const iM: Record<string,number>={}; const tM: Record<string,number>={};
              records.forEach((r:any)=>{ const it=r.product?.name||r.item||'Unknown'; iM[it]=(iM[it]||0)+(r.quantity||0); const k=(r.date||'').slice(0,7)||'?'; tM[k]=(tM[k]||0)+(r.quantity||0); });
              const id = Object.entries(iM).map(([name,value])=>({name,value}));
              const td = Object.entries(tM).map(([name,value])=>({name,value}));
              const t10 = [...id].sort((a,b)=>b.value-a.value).slice(0,10);
              return vizWrap('fa-shopping-basket','#f59e0b','Grocery Visualizations',<>
                {chartCard('Quantity by Item',<ResponsiveContainer width="100%" height="100%"><BarChart data={id} margin={{top:4,right:8,bottom:0,left:0}}><CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" /><XAxis dataKey="name" fontSize={9} tick={{fill:'#94a3b8'}} /><YAxis fontSize={10} tick={{fill:'#94a3b8'}} /><Tooltip contentStyle={ttStyle} /><Bar dataKey="value" name="Qty" radius={[4,4,0,0]}>{id.map((_: any, i: number)=><Cell key={i} fill={CC[i%CC.length]} />)}</Bar></BarChart></ResponsiveContainer>)}
                {chartCard('Share by Product',<ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={id.slice(0,8)} dataKey="value" nameKey="name" outerRadius={110} paddingAngle={3}>{id.slice(0,8).map((_: any, i: number)=><Cell key={i} fill={CC[i%CC.length]} />)}</Pie><Tooltip contentStyle={ttStyle} /><Legend /></PieChart></ResponsiveContainer>)}
                {chartCard('Top 10 Consumed',<ResponsiveContainer width="100%" height="100%"><BarChart data={t10} layout="vertical" margin={{top:0,right:16,bottom:0,left:0}}><CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" /><XAxis type="number" fontSize={10} tick={{fill:'#94a3b8'}} /><YAxis type="category" dataKey="name" fontSize={9} tick={{fill:'#64748b'}} width={90} /><Tooltip contentStyle={ttStyle} /><Bar dataKey="value" name="Qty" fill="#f59e0b" radius={[0,4,4,0]}>{t10.map((_: any, i: number)=><Cell key={i} fill={CC[i%CC.length]} />)}</Bar></BarChart></ResponsiveContainer>)}
                {chartCard('Consumption Trend',<ResponsiveContainer width="100%" height="100%"><AreaChart data={td} margin={{top:4,right:8,bottom:0,left:0}}>{gradDef('gGr','#f59e0b')}<CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" /><XAxis dataKey="name" fontSize={10} tick={{fill:'#94a3b8'}} /><YAxis fontSize={10} tick={{fill:'#94a3b8'}} /><Tooltip contentStyle={ttStyle} /><Area type="monotone" dataKey="value" name="Quantity" stroke="#f59e0b" strokeWidth={2.5} fill="url(#gGr)" dot={{r:4,fill:'#f59e0b'}} /></AreaChart></ResponsiveContainer>)}
              </>);
            }
            // ─── Payroll Runs ──────────────────────────────────────────────
            if (type === 'payroll-runs') {
              const bd = records.map((r:any)=>({name:`${r.month}/${r.year}`,net:r.totalNet||0,employees:r.employeesCount||0}));
              const ld = [...bd].reverse();
              const ep = records.slice(0,6).map((r:any)=>({name:`${r.month}/${r.year}`,value:r.employeesCount||0}));
              return vizWrap('fa-history','#8b5cf6','Payroll Visualizations',<>
                {chartCard('Net Pay per Run',<ResponsiveContainer width="100%" height="100%"><BarChart data={bd} margin={{top:4,right:8,bottom:0,left:0}}><CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" /><XAxis dataKey="name" fontSize={9} tick={{fill:'#94a3b8'}} /><YAxis fontSize={10} tick={{fill:'#94a3b8'}} /><Tooltip contentStyle={ttStyle} formatter={(v:any)=>`$${Number(v).toLocaleString()}`} /><Bar dataKey="net" name="Net Pay" fill="#8b5cf6" radius={[4,4,0,0]} /></BarChart></ResponsiveContainer>)}
                {chartCard('Payroll Trend',<ResponsiveContainer width="100%" height="100%"><AreaChart data={ld} margin={{top:4,right:8,bottom:0,left:0}}>{gradDef('pyGr','#8b5cf6')}<CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" /><XAxis dataKey="name" fontSize={9} tick={{fill:'#94a3b8'}} /><YAxis fontSize={10} tick={{fill:'#94a3b8'}} /><Tooltip contentStyle={ttStyle} formatter={(v:any)=>`$${Number(v).toLocaleString()}`} /><Area type="monotone" dataKey="net" name="Net Pay" stroke="#8b5cf6" strokeWidth={2.5} fill="url(#pyGr)" dot={{r:4,fill:'#8b5cf6'}} /></AreaChart></ResponsiveContainer>)}
                {chartCard('Employees per Run',<ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={ep} dataKey="value" nameKey="name" outerRadius={110} paddingAngle={3}>{ep.map((_:any,i:number)=><Cell key={i} fill={CC[i%CC.length]} />)}</Pie><Tooltip contentStyle={ttStyle} /><Legend /></PieChart></ResponsiveContainer>)}
                {chartCard('Net vs Employees',<ResponsiveContainer width="100%" height="100%"><ComposedChart data={bd} margin={{top:4,right:8,bottom:0,left:0}}><CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" /><XAxis dataKey="name" fontSize={9} tick={{fill:'#94a3b8'}} /><YAxis yAxisId="n" orientation="left" fontSize={10} tick={{fill:'#94a3b8'}} /><YAxis yAxisId="e" orientation="right" fontSize={10} tick={{fill:'#94a3b8'}} /><Tooltip contentStyle={ttStyle} /><Legend /><Bar yAxisId="n" dataKey="net" name="Net Pay $" fill="#8b5cf6" radius={[4,4,0,0]} opacity={0.8} /><Line yAxisId="e" type="monotone" dataKey="employees" name="Employees" stroke="#f59e0b" strokeWidth={2} dot={{r:4}} /></ComposedChart></ResponsiveContainer>)}
              </>);
            }
            // ─── Employee Payslips ─────────────────────────────────────────
            if (type === 'employee-payslips') {
              const bd = records.slice(0,20).map((r:any)=>({name:(r.employeeName||'?').split(' ')[0],gross:r.grossSalary||0,tax:r.taxAmount||0,net:r.netSalary||0}));
              const tp = [{name:'Net Pay',value:records.reduce((s:number,r:any)=>s+(r.netSalary||0),0)},{name:'Tax',value:records.reduce((s:number,r:any)=>s+(r.taxAmount||0),0)}];
              const t10 = [...records].sort((a:any,b:any)=>(b.grossSalary||0)-(a.grossSalary||0)).slice(0,10).map((r:any)=>({name:(r.employeeName||'?').slice(0,18),value:r.grossSalary||0}));
              const tM: Record<string,number>={}; records.forEach((r:any)=>{ const k=`${r.payrollRun?.month||'?'}/${r.payrollRun?.year||''}`; tM[k]=(tM[k]||0)+(r.netSalary||0); });
              const td = Object.entries(tM).map(([name,value])=>({name,value}));
              return vizWrap('fa-user-tag','#8b5cf6','Payslip Visualizations',<>
                {chartCard('Gross vs Net',<ResponsiveContainer width="100%" height="100%"><BarChart data={bd} margin={{top:4,right:8,bottom:0,left:0}}><CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" /><XAxis dataKey="name" fontSize={9} tick={{fill:'#94a3b8'}} /><YAxis fontSize={10} tick={{fill:'#94a3b8'}} /><Tooltip contentStyle={ttStyle} formatter={(v:any)=>`$${Number(v).toLocaleString()}`} /><Legend /><Bar dataKey="gross" name="Gross" fill="#8b5cf6" radius={[4,4,0,0]} opacity={0.7} /><Bar dataKey="net" name="Net" fill="#10b981" radius={[4,4,0,0]} /></BarChart></ResponsiveContainer>)}
                {chartCard('Tax vs Net Split',<ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={tp} dataKey="value" nameKey="name" innerRadius={65} outerRadius={105} paddingAngle={4}><Cell fill="#10b981" /><Cell fill='var(--portal-danger)' /></Pie><Tooltip contentStyle={ttStyle} formatter={(v:any)=>`$${Number(v).toLocaleString()}`} /><Legend /></PieChart></ResponsiveContainer>)}
                {chartCard('Top 10 by Gross',<ResponsiveContainer width="100%" height="100%"><BarChart data={t10} layout="vertical" margin={{top:0,right:16,bottom:0,left:0}}><CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" /><XAxis type="number" fontSize={10} tick={{fill:'#94a3b8'}} /><YAxis type="category" dataKey="name" fontSize={9} tick={{fill:'#64748b'}} width={100} /><Tooltip contentStyle={ttStyle} formatter={(v:any)=>`$${Number(v).toLocaleString()}`} /><Bar dataKey="value" name="Gross" fill="#8b5cf6" radius={[0,4,4,0]}>{t10.map((_: any, i: number)=><Cell key={i} fill={CC[i%CC.length]} />)}</Bar></BarChart></ResponsiveContainer>)}
                {chartCard('Salary Trend',<ResponsiveContainer width="100%" height="100%"><AreaChart data={td} margin={{top:4,right:8,bottom:0,left:0}}>{gradDef('slGr','#8b5cf6')}<CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" /><XAxis dataKey="name" fontSize={10} tick={{fill:'#94a3b8'}} /><YAxis fontSize={10} tick={{fill:'#94a3b8'}} /><Tooltip contentStyle={ttStyle} formatter={(v:any)=>`$${Number(v).toLocaleString()}`} /><Area type="monotone" dataKey="value" name="Net Pay" stroke="#8b5cf6" strokeWidth={2.5} fill="url(#slGr)" dot={{r:4,fill:'#8b5cf6'}} /></AreaChart></ResponsiveContainer>)}
              </>);
            }
            // ─── Uniforms Analytics ────────────────────────────────────────
            if (type === 'uniforms-analytics') {
              const mM: Record<string,number>={}; const tM: Record<string,number>={};
              records.forEach((r:any)=>{ const m=r.paymentMode||'Unknown'; mM[m]=(mM[m]||0)+(r.total||0); const k=(r.date||'').slice(0,7)||'?'; tM[k]=(tM[k]||0)+(r.total||0); });
              const md = Object.entries(mM).map(([name,value])=>({name,value}));
              const td = Object.entries(tM).map(([name,value])=>({name,value}));
              const t10 = [...records].sort((a:any,b:any)=>(b.total||0)-(a.total||0)).slice(0,10).map((r:any)=>({name:(r.student||'?').slice(0,18),value:r.total||0}));
              return vizWrap('fa-tshirt','#14b8a6','Uniform Analytics Visualizations',<>
                {chartCard('Sales by Mode',<ResponsiveContainer width="100%" height="100%"><BarChart data={md} margin={{top:4,right:8,bottom:0,left:0}}><CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" /><XAxis dataKey="name" fontSize={10} tick={{fill:'#94a3b8'}} /><YAxis fontSize={10} tick={{fill:'#94a3b8'}} /><Tooltip contentStyle={ttStyle} formatter={(v:any)=>`$${Number(v).toLocaleString()}`} /><Bar dataKey="value" name="Revenue" radius={[4,4,0,0]}>{md.map((_: any, i: number)=><Cell key={i} fill={CC[i%CC.length]} />)}</Bar></BarChart></ResponsiveContainer>)}
                {chartCard('Revenue Share',<ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={md} dataKey="value" nameKey="name" outerRadius={110} paddingAngle={3}>{md.map((_: any, i: number)=><Cell key={i} fill={CC[i%CC.length]} />)}</Pie><Tooltip contentStyle={ttStyle} formatter={(v:any)=>`$${Number(v).toLocaleString()}`} /><Legend /></PieChart></ResponsiveContainer>)}
                {chartCard('Top 10 by Spend',<ResponsiveContainer width="100%" height="100%"><BarChart data={t10} layout="vertical" margin={{top:0,right:16,bottom:0,left:0}}><CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" /><XAxis type="number" fontSize={10} tick={{fill:'#94a3b8'}} /><YAxis type="category" dataKey="name" fontSize={9} tick={{fill:'#64748b'}} width={100} /><Tooltip contentStyle={ttStyle} formatter={(v:any)=>`$${Number(v).toLocaleString()}`} /><Bar dataKey="value" name="Spend" fill="#14b8a6" radius={[0,4,4,0]}>{t10.map((_: any, i: number)=><Cell key={i} fill={CC[i%CC.length]} />)}</Bar></BarChart></ResponsiveContainer>)}
                {chartCard('Sales Trend',<ResponsiveContainer width="100%" height="100%"><AreaChart data={td} margin={{top:4,right:8,bottom:0,left:0}}>{gradDef('uGr','#14b8a6')}<CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" /><XAxis dataKey="name" fontSize={10} tick={{fill:'#94a3b8'}} /><YAxis fontSize={10} tick={{fill:'#94a3b8'}} /><Tooltip contentStyle={ttStyle} formatter={(v:any)=>`$${Number(v).toLocaleString()}`} /><Area type="monotone" dataKey="value" name="Revenue" stroke="#14b8a6" strokeWidth={2.5} fill="url(#uGr)" dot={{r:4,fill:'#14b8a6'}} /></AreaChart></ResponsiveContainer>)}
              </>);
            }
            // ─── Fee Reminders ─────────────────────────────────────────────
            if (type === 'fee-reminders') {
              const cM: Record<string,number>={}; const sM: Record<string,number>={}; const tM: Record<string,number>={}; const stuM: Record<string,number>={};
              records.forEach((r:any)=>{ const c=r.type||r.channel||'Unknown'; cM[c]=(cM[c]||0)+1; const s=r.status||'Unknown'; sM[s]=(sM[s]||0)+1; const k=(r.createdAt||'').slice(0,7)||'?'; tM[k]=(tM[k]||0)+1; const st=r.student?.name||'Unknown'; stuM[st]=(stuM[st]||0)+1; });
              const cd = Object.entries(cM).map(([name,value])=>({name,value}));
              const sd = Object.entries(sM).map(([name,value])=>({name,value}));
              const td = Object.entries(tM).map(([name,value])=>({name,value}));
              const t10 = Object.entries(stuM).sort((a,b)=>b[1]-a[1]).slice(0,10).map(([name,value])=>({name,value}));
              return vizWrap('fa-bell','#f59e0b','Reminder Visualizations',<>
                {chartCard('By Channel',<ResponsiveContainer width="100%" height="100%"><BarChart data={cd} margin={{top:4,right:8,bottom:0,left:0}}><CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" /><XAxis dataKey="name" fontSize={10} tick={{fill:'#94a3b8'}} /><YAxis fontSize={10} tick={{fill:'#94a3b8'}} /><Tooltip contentStyle={ttStyle} /><Bar dataKey="value" name="Reminders" radius={[4,4,0,0]}>{cd.map((_: any, i: number)=><Cell key={i} fill={CC[i%CC.length]} />)}</Bar></BarChart></ResponsiveContainer>)}
                {chartCard('Delivery Status',<ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={sd} dataKey="value" nameKey="name" innerRadius={65} outerRadius={105} paddingAngle={4}>{sd.map((_: any, i: number)=><Cell key={i} fill={CC[i%CC.length]} />)}</Pie><Tooltip contentStyle={ttStyle} /><Legend /></PieChart></ResponsiveContainer>)}
                {chartCard('Top 10 Students',<ResponsiveContainer width="100%" height="100%"><BarChart data={t10} layout="vertical" margin={{top:0,right:16,bottom:0,left:0}}><CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" /><XAxis type="number" fontSize={10} tick={{fill:'#94a3b8'}} /><YAxis type="category" dataKey="name" fontSize={9} tick={{fill:'#64748b'}} width={100} /><Tooltip contentStyle={ttStyle} /><Bar dataKey="value" name="Count" fill="#f59e0b" radius={[0,4,4,0]}>{t10.map((_: any, i: number)=><Cell key={i} fill={CC[i%CC.length]} />)}</Bar></BarChart></ResponsiveContainer>)}
                {chartCard('Reminder Trend',<ResponsiveContainer width="100%" height="100%"><AreaChart data={td} margin={{top:4,right:8,bottom:0,left:0}}>{gradDef('rGr','#f59e0b')}<CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" /><XAxis dataKey="name" fontSize={10} tick={{fill:'#94a3b8'}} /><YAxis fontSize={10} tick={{fill:'#94a3b8'}} /><Tooltip contentStyle={ttStyle} /><Area type="monotone" dataKey="value" name="Reminders" stroke="#f59e0b" strokeWidth={2.5} fill="url(#rGr)" dot={{r:4,fill:'#f59e0b'}} /></AreaChart></ResponsiveContainer>)}
              </>);
            }
            return null;
          })()}
        </div>
      )}

      {!data && !loading && (
        <div style={{ padding: '80px', textAlign: 'center', background: 'white', borderRadius: '20px', border: '1px solid #f1f5f9' }}>
          <i className="fas fa-cloud-download-alt" style={{ fontSize: '3rem', opacity: 0.1, marginBottom: '16px' }}></i>
          <h3>No Synchronized Data</h3>
          <p>Please update report parameters to fetch latest registry records.</p>
        </div>
      )}

    </div>
  );
}
