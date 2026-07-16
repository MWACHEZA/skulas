import React, { useState, useEffect } from 'react';
import api from '../../../lib/api';
import { toast } from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import '../../../styles/portal.css';

interface ReportCard {
  id: string;
  title: string;
  description: string;
  icon: string;
  color: string;
  section: string;
}

const REPORT_CARDS: ReportCard[] = [
  // School Fees
  { id: 'student-balances', title: 'Student Balances', description: 'Outstanding balances per student.', icon: 'fa-user-clock', color: '#3b82f6', section: 'School Fees' },
  { id: 'single-fee-group', title: 'Single Fee Group', description: 'Analysis of a specific fee group.', icon: 'fa-tags', color: '#3b82f6', section: 'School Fees' },
  { id: 'balances-summary', title: 'Balance Summary', description: 'Summaries per class and fee group.', icon: 'fa-chart-pie', color: '#3b82f6', section: 'School Fees' },
  { id: 'student-debtors', title: 'Student Debts', description: 'Students currently in arrears.', icon: 'fa-exclamation-triangle', color: '#3b82f6', section: 'School Fees' },
  { id: 'fees-payments', title: 'Fees Payments', description: 'All student payment records.', icon: 'fa-money-bill-wave', color: '#3b82f6', section: 'School Fees' },
  { id: 'fees-takings', title: 'Fees Takings', description: 'Detailed fees payment takings.', icon: 'fa-cash-register', color: '#3b82f6', section: 'School Fees' },
  
  // Enrollment
  { id: 'enrollment-grouped', title: 'Enrollment Reports', description: 'Student enrollment distribution by class, category, and gender.', icon: 'fa-users', color: '#10b981', section: 'Enrollment' },
  
  // Finance
  { id: 'profit-loss', title: 'Profit & Loss', description: 'Financial income vs expenditure.', icon: 'fa-balance-scale', color: 'var(--portal-danger)', section: 'Finance' },
  { id: 'detailed-expenses', title: 'Detailed Expenses', description: 'Full breakdown of all expenses, and salaries.', icon: 'fa-file-invoice-dollar', color: 'var(--portal-danger)', section: 'Finance' },
  { id: 'revenue-allocation', title: 'Revenue Allocation', description: '% Revenue Allocations.', icon: 'fa-chart-line', color: 'var(--portal-danger)', section: 'Finance' },
  { id: 'grocery-consumption', title: 'Grocery Consumption', description: 'Food & grocery usage reporting.', icon: 'fa-shopping-basket', color: 'var(--portal-danger)', section: 'Finance' },
  
  // Payroll
  { id: 'payroll-runs', title: 'Payroll Runs Summary', description: 'Overview of all payroll runs.', icon: 'fa-history', color: '#8b5cf6', section: 'Payroll' },
  { id: 'employee-payslips', title: 'Employee Payslips', description: 'Detailed payslips per employee.', icon: 'fa-user-tag', color: '#8b5cf6', section: 'Payroll' },
  { id: 'tax-contributions', title: 'Tax & Contributions', description: 'Aggregate deductions per payroll.', icon: 'fa-university', color: '#8b5cf6', section: 'Payroll' },

  // Management
  { id: 'communication-logs', title: 'Communication Logs', description: 'SMS & WhatsApp activity logs.', icon: 'fa-comments', color: '#f59e0b', section: 'Management' },
    { id: 'payment-history', title: 'Payment History', description: 'Student-specific payment audit trail.', icon: 'fa-history', color: '#f59e0b', section: 'Management' },
  { id: 'fee-reminders', title: 'Fee Reminder History', description: 'Log of all reminders sent to parents.', icon: 'fa-bell', color: '#f59e0b', section: 'Management' },
  { id: 'institutional-overview', title: 'Institutional Overview', description: 'High-level summary of school health.', icon: 'fa-chart-network', color: '#f59e0b', section: 'Management' },

  // Uniforms
  { id: 'uniforms-analytics', title: 'Uniforms Analytics', description: 'Uniform sales and stock reporting.', icon: 'fa-tshirt', color: '#14b8a6', section: 'Uniforms' },
];

export default function ReportsDashboardPage() {
  const navigate = useNavigate();
  const [summary, setSummary] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSummary();
  }, []);

  const fetchSummary = async () => {
    try {
      setLoading(true);
      const res = await api.get('/api/report-data/summary');
      setSummary(res.data);
    } catch (error) {
      toast.error('Failed to load summary stats');
    } finally {
      setLoading(false);
    }
  };

  const sections = Array.from(new Set(REPORT_CARDS.map(c => c.section)));

  return (
    <div className="portal-container">
      <div className="portal-page-header">
        <div className="header-content">
          <h1>Report Generation Wizard</h1>
          <p>Access deep analytical insights and generate institutional performance reports.</p>
        </div>
        
        {/* Quick Stats Summary */}
        {!loading && summary && (
          <div style={{ display: 'flex', gap: '16px' }}>
            <div className="portal-card" style={{ padding: '16px 24px', textAlign: 'center', minWidth: '160px' }}>
              <div style={{ fontSize: '0.7rem', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', marginBottom: '4px', letterSpacing: '0.05em' }}>Institutional Population</div>
              <div style={{ fontSize: '1.75rem', fontWeight: 900, color: '#1e293b' }}>{summary.students?.toLocaleString()}</div>
            </div>
            <div className="portal-card" style={{ padding: '16px 24px', textAlign: 'center', minWidth: '160px', borderTop: '4px solid #2563eb' }}>
              <div style={{ fontSize: '0.7rem', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', marginBottom: '4px', letterSpacing: '0.05em' }}>Outstanding Receivables</div>
              <div style={{ fontSize: '1.75rem', fontWeight: 900, color: '#2563eb' }}>${summary.fees?.outstanding?.toLocaleString()}</div>
            </div>
          </div>
        )}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '48px' }}>
        {(Array.isArray(sections) ? sections : []).map(section => (
          <div key={section}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '20px', marginBottom: '32px' }}>
              <h2 style={{ fontSize: '0.85rem', fontWeight: 900, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.15em', margin: 0, whiteSpace: 'nowrap' }}>
                {section}
              </h2>
              <div style={{ height: '2px', background: '#f1f5f9', flex: 1, borderRadius: '1px' }}></div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '24px' }}>
              {(Array.isArray(REPORT_CARDS) ? REPORT_CARDS : []).filter(c => c.section === section).map(card => (
                <div 
                  key={card.id}
                  onClick={() => navigate(`view/${card.id}`)}
                  className="portal-card hover-card"
                  style={{ 
                    cursor: 'pointer', 
                    padding: '24px', 
                    position: 'relative', 
                    overflow: 'hidden',
                    border: '1px solid #f1f5f9',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between'
                  }}
                >
                  <div style={{ display: 'flex', gap: '20px', alignItems: 'flex-start' }}>
                    <div style={{ 
                      width: '56px', height: '56px', borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem',
                      background: `${card.color}10`, color: card.color, flexShrink: 0,
                      border: `1px solid ${card.color}20`
                    }}>
                      <i className={`fas ${card.icon}`}></i>
                    </div>
                    <div>
                      <h3 style={{ margin: '0 0 8px 0', fontSize: '1.1rem', fontWeight: 800, color: '#1e293b' }}>{card.title}</h3>
                      <p style={{ margin: 0, fontSize: '0.9rem', color: '#64748b', lineHeight: '1.6', fontWeight: 500 }}>{card.description}</p>
                    </div>
                  </div>
                  
                  <div style={{ marginTop: '24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid #f8fafc', paddingTop: '20px' }}>
                    <span style={{ fontSize: '0.75rem', fontWeight: 900, color: '#2563eb', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      Analyze Data <i className="fas fa-arrow-right" style={{ marginLeft: '8px', fontSize: '0.7rem' }}></i>
                    </span>
                    <div style={{ width: '40px', height: '3px', background: `${card.color}20`, borderRadius: '2px' }}></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
