import React, { useState, useEffect } from 'react';
import api from '../../../lib/api';
import { useToast } from '../../../context/ToastContext';
import { formatCurrency } from '../../../utils/formatters';
import '../../../styles/portal.css';
import { useTerminology } from '../../../hooks/useTerminology';

const exportToCSV = (title: string, headers: string[], dataRows: string[][]) => {
  const content = [
    headers.map(h => `"${h.replace(/"/g, '""')}"`).join(','),
    ...dataRows.map(row => row.map(cell => `"${(cell || '').toString().replace(/"/g, '""')}"`).join(','))
  ].join('\n');
  const blob = new Blob(['\ufeff' + content], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${title.toLowerCase().replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

const exportToWord = (title: string, headers: string[], dataRows: string[][]) => {
  let html = `
    <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40">
    <head>
      <title>${title}</title>
      <style>
        table { border-collapse: collapse; width: 100%; }
        th, td { border: 1px solid #ccc; padding: 8px; text-align: left; }
        th { background-color: #f2f2f2; }
      </style>
    </head>
    <body>
      <h2>${title}</h2>
      <table>
        <thead>
          <tr>${headers.map(h => `<th>${h}</th>`).join('')}</tr>
        </thead>
        <tbody>
          ${dataRows.map(row => `<tr>${row.map(cell => `<td>${cell}</td>`).join('')}</tr>`).join('')}
        </tbody>
      </table>
    </body>
    </html>
  `;
  const blob = new Blob(['\ufeff' + html], { type: 'application/msword' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${title.toLowerCase().replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 10)}.doc`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

interface Payment {
  id: string;
  student: { name: string; class: { name: string } };
  fee?: { description: string; feeGroup?: { name: string } };
  amount: number;
  paymentMode: string;
  date: string;
  status: string;
}

export default function PaymentHistoryPage() {
  const { t } = useTerminology();
  const { showToast } = useToast();
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [classes, setClasses] = useState<{ id: string; name: string }[]>([]);
  const [students, setStudents] = useState<{ id: string; name: string }[]>([]);
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedStudent, setSelectedStudent] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  useEffect(() => {
    fetchClasses();
    fetchPayments();
  }, []);

  useEffect(() => {
    if (selectedClass) fetchStudents(selectedClass);
    else setStudents([]);
  }, [selectedClass]);

  const fetchClasses = async () => {
    try {
      const { data } = await api.get('/api/classes');
      setClasses(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Failed to load classes');
    
    }
  };

  const fetchStudents = async (classId: string) => {
    try {
      const { data } = await api.get(`/api/students?classId=${classId}`);
      setStudents(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Failed to load students');
    
    }
  };

  const fetchPayments = async () => {
    try {
      setLoading(true);
      let url = '/api/fees/payments';
      const params = new URLSearchParams();
      if (selectedStudent) params.append('studentId', selectedStudent);
      else if (selectedClass) params.append('classId', selectedClass);
      
      if (params.toString()) url += `?${params.toString()}`;

      const { data } = await api.get(url);
      setPayments(Array.isArray(data) ? data : []);
    } catch (error) {
      showToast('Failed to load payment history', 'error');
    
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="portal-container">
      <div className="portal-page-header">
        <div className="header-content">
          <h1>Payment History Report</h1>
          <p>Review comprehensive logs of all student financial transactions.</p>
        </div>
      </div>

      <div className="portal-card animate-in fade-in slide-in-from-top-4 duration-500 no-print" style={{ marginBottom: '40px' }}>
        <div className="portal-card-body" style={{ padding: '24px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px', alignItems: 'end' }}>
            <div className="form-group">
              <label className="portal-label">{t('class')}</label>
              <select className="portal-input" value={selectedClass} onChange={e => { setSelectedClass(e.target.value); setSelectedStudent(''); }}>
                <option value="">All {t('classes')}</option>
                {classes.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label className="portal-label">{t('student')}</label>
              <select className="portal-input" value={selectedStudent} onChange={e => setSelectedStudent(e.target.value)} disabled={!selectedClass}>
                <option value="">All {t('students')} in {t('class')}</option>
                {students.map(s => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <button className="portal-btn-primary" onClick={fetchPayments} style={{ width: '100%', height: '48px', fontWeight: 900 }}>
                <i className="fas fa-filter mr-2"></i> Load Report
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="management-table-card animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="portal-card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 24px', borderBottom: '1px solid #f1f5f9' }}>
          <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 900, color: '#1e293b' }}>
            <i className="fas fa-history mr-2"></i> Transaction Logs
          </h2>
          <div style={{ display: 'flex', gap: '8px' }} className="no-print">
            <button 
              onClick={() => {
                const headers = ['Date', t('student') + ' Name', t('class'), 'Title / Description', 'Method', 'Amount'];
                const rows = payments.map(p => [
                  new Date(p.date).toLocaleString(),
                  p.student?.name || 'N/A',
                  p.student?.class?.name || 'Unassigned',
                  p.fee?.description || p.fee?.feeGroup?.name || 'N/A',
                  p.paymentMode,
                  p.amount.toString()
                ]);
                exportToCSV('Payment_History', headers, rows);
              }}
              className="portal-btn-secondary"
              style={{ padding: '8px 16px', fontSize: '0.85rem' }}
              title="Export to CSV"
            >
              <i className="fas fa-file-csv mr-1"></i> CSV
            </button>
            <button 
              onClick={() => {
                const headers = ['Date', t('student') + ' Name', t('class'), 'Title / Description', 'Method', 'Amount'];
                const rows = payments.map(p => [
                  new Date(p.date).toLocaleString(),
                  p.student?.name || 'N/A',
                  p.student?.class?.name || 'Unassigned',
                  p.fee?.description || p.fee?.feeGroup?.name || 'N/A',
                  p.paymentMode,
                  p.amount.toString()
                ]);
                exportToWord('Payment_History', headers, rows);
              }}
              className="portal-btn-secondary"
              style={{ padding: '8px 16px', fontSize: '0.85rem' }}
              title="Export to Word"
            >
              <i className="fas fa-file-word mr-1"></i> Word
            </button>
            <button 
              onClick={() => window.print()}
              className="portal-btn-secondary"
              style={{ padding: '8px 16px', fontSize: '0.85rem' }}
              title="Print / PDF"
            >
              <i className="fas fa-print mr-1"></i> Print/PDF
            </button>
          </div>
        </div>
        <div className="table-responsive">
          <table className="management-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>{t('student')}</th>
                <th>Title / Description</th>
                <th>Method</th>
                <th style={{ textAlign: 'right' }}>Amount</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={5} style={{ textAlign: 'center', padding: '40px' }}>Loading...</td>
                </tr>
              ) : payments.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ textAlign: 'center', padding: '40px' }}>No payments found matching criteria</td>
                </tr>
              ) : (
                (() => {
                  const totalPages = Math.ceil(payments.length / itemsPerPage);
                  const paginatedPayments = payments.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
                  return paginatedPayments.map(payment => (
                    <tr key={payment.id}>
                      <td>{new Date(payment.date).toLocaleString()}</td>
                      <td>
                        <div style={{ fontWeight: 900 }}>{payment.student?.name}</div>
                        <div style={{ fontSize: '0.8rem', color: '#64748b' }}>{payment.student?.class?.name}</div>
                      </td>
                      <td>{payment.fee?.description || payment.fee?.feeGroup?.name || 'N/A'}</td>
                      <td>
                        <span className="status-badge" style={{ background: '#f8fafc', color: '#475569', border: '1px solid #e2e8f0' }}>
                          {payment.paymentMode.toUpperCase()}
                        </span>
                      </td>
                      <td style={{ textAlign: 'right', fontWeight: 900, color: '#059669', fontSize: '1.1rem' }}>
                        {formatCurrency(payment.amount)}
                      </td>
                    </tr>
                  ));
                })()
              )}
            </tbody>
          </table>
          {payments.length > 0 && (() => {
            const totalPages = Math.ceil(payments.length / itemsPerPage);
            return (
              <div style={{ padding: '16px 24px', display: 'flex', justifyContent: 'space-between', color: '#718096', fontSize: '0.9rem', borderTop: '1px solid #f1f5f9' }}>
                <span>Showing {(currentPage - 1) * itemsPerPage + 1} to {Math.min(currentPage * itemsPerPage, payments.length)} of {payments.length} entries</span>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button 
                    className="portal-btn-ghost" 
                    style={{ padding: '6px 12px', fontSize: '0.85rem', cursor: currentPage === 1 ? 'not-allowed' : 'pointer', opacity: currentPage === 1 ? 0.5 : 1 }} 
                    disabled={currentPage === 1} 
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  >
                    Previous
                  </button>
                  <button 
                    className="portal-btn-ghost" 
                    style={{ padding: '6px 12px', fontSize: '0.85rem', cursor: currentPage >= totalPages ? 'not-allowed' : 'pointer', opacity: currentPage >= totalPages ? 0.5 : 1 }} 
                    disabled={currentPage >= totalPages} 
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  >
                    Next
                  </button>
                </div>
              </div>
            );
          })()}
        </div>
      </div>
      <style>{`
        @media print {
          .no-print, .portal-page-header, .portal-card, .portal-sidebar, .portal-header {
            display: none !important;
          }
          .portal-container {
            margin: 0 !important;
            padding: 0 !important;
            max-width: 100% !important;
          }
          .management-table-card {
            box-shadow: none !important;
            border: none !important;
          }
          table { width: 100% !important; }
        }
      `}</style>
    </div>
  );
}
