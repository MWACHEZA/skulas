import { useState, useEffect } from 'react';
import api from '../../../lib/api';
import '../../../styles/portal.css';

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

export default function LibraryOverdue() {
  const [overdue, setOverdue] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/api/library/loans/overdue')
      .then(res => setOverdue(res.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const calculateDaysOverdue = (dueDate: string) => {
    const diffTime = Math.abs(new Date().getTime() - new Date(dueDate).getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  if (loading) {
    return <div className="p-8 text-center text-blue-600 font-bold"><i className="fas fa-spinner fa-spin mr-2"></i>Analyzing circulation records...</div>;
  }

  return (
    <div className="library-portal-container" style={{ padding: '30px', minHeight: '100vh', background: 'white' }}>
      <div className="portal-page-header" style={{ marginBottom: 40, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <div>
          <h1 style={{ color: '#1e3a8a', fontSize: '2.8rem', fontWeight: 900, marginBottom: 5 }}>Overdue Books</h1>
          <p style={{ color: '#475569', fontSize: '1.1rem' }}>Track and follow up on overdue library materials.</p>
        </div>
      </div>

      <div className="portal-card" style={{ borderRadius: '40px', border: '2px solid #f1f5f9', overflow: 'hidden', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.04)' }}>
        <div className="portal-card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px', padding: '24px 30px', borderBottom: '1px solid #f1f5f9' }}>
          <h2 style={{ color: '#1e3a8a', margin: 0, fontSize: '1.4rem', fontWeight: 900 }}>
            <i className="fas fa-exclamation-triangle mr-2" style={{ color: 'var(--portal-danger)' }}></i>{overdue.length} Overdue Items
          </h2>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }} className="no-print">
            <button 
              onClick={() => {
                const headers = ['Student', 'Book', 'Form', 'Due Date', 'Days Overdue'];
                const rows = overdue.map(o => [
                  o.student?.user?.name || '',
                  o.book?.title || '',
                  o.student?.class?.name || 'N/A',
                  new Date(o.dueDate).toLocaleDateString(),
                  calculateDaysOverdue(o.dueDate).toString()
                ]);
                exportToCSV('Overdue_Books', headers, rows);
              }}
              className="portal-btn-secondary"
              style={{ padding: '8px 16px', fontSize: '0.85rem' }}
              title="Export to CSV"
            >
              <i className="fas fa-file-csv mr-1"></i> CSV
            </button>
            <button 
              onClick={() => {
                const headers = ['Student', 'Book', 'Form', 'Due Date', 'Days Overdue'];
                const rows = overdue.map(o => [
                  o.student?.user?.name || '',
                  o.book?.title || '',
                  o.student?.class?.name || 'N/A',
                  new Date(o.dueDate).toLocaleDateString(),
                  calculateDaysOverdue(o.dueDate).toString()
                ]);
                exportToWord('Overdue_Books', headers, rows);
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
            <button 
              className="portal-btn-primary"
              style={{ padding: '8px 16px', fontSize: '0.85rem', background: 'var(--portal-warning)', borderColor: 'var(--portal-warning)' }}
             onClick={() => alert('This feature is currently under development or disabled.')}>
              <i className="fas fa-envelope mr-1"></i>Send Reminders
            </button>
          </div>
        </div>
        <div className="portal-card-body" style={{ padding: 0 }}>
          <table className="portal-table">
            <thead>
              <tr>
                <th>Student</th>
                <th>Book</th>
                <th>Form</th>
                <th>Due Date</th>
                <th>Days Overdue</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {overdue.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: '30px' }}>
                    Great news! No overdue books found in the system.
                  </td>
                </tr>
              ) : (
                overdue.map((o, i) => (
                  <tr key={i}>
                    <td style={{ fontWeight: 600 }}>{o.student?.user?.name}</td>
                    <td>{o.book?.title}</td>
                    <td>{o.student?.class?.name || 'N/A'}</td>
                    <td style={{ color: '#718096' }}>{new Date(o.dueDate).toLocaleDateString()}</td>
                    <td>
                      <span className="portal-badge danger">{calculateDaysOverdue(o.dueDate)} days</span>
                    </td>
                    <td>
                      <button style={{ background: 'none', border: 'none', color: 'var(--portal-primary)', cursor: 'pointer', fontWeight: 600 }} onClick={() => alert('This feature is currently under development or disabled.')}>
                        Contact
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
