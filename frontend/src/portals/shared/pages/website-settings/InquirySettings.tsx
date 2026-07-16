import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';
import api from '../../../../lib/api';

interface Inquiry {
  id: string;
  name: string;
  email: string;
  phone: string;
  message: string;
  createdAt: string;
}

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

export default function InquirySettings() {
  const [inquiries, setInquiries] = useState<Inquiry[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchInquiries();
  }, []);

  const fetchInquiries = async () => {
    try {
      const response = await api.get('/api/website-settings/inquiries');
      setInquiries(response.data);
    } catch (error) {
      console.error('Failed to fetch inquiries', error);
    
    } finally {
      setLoading(false);
    }
  };

  const deleteInquiry = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this inquiry?')) return;
    try {
      await api.delete(`/api/website-settings/inquiries/${id}`);
      setInquiries(inquiries.filter((inq) => inq.id !== id));
    } catch (error) {
      console.error('Failed to delete inquiry', error);
    
    }
  };

  const filteredInquiries = inquiries.filter(inq => {
    const nameText = inq.name || '';
    const emailText = inq.email || '';
    const messageText = inq.message || '';
    return nameText.toLowerCase().includes(searchTerm.toLowerCase()) ||
      emailText.toLowerCase().includes(searchTerm.toLowerCase()) ||
      messageText.toLowerCase().includes(searchTerm.toLowerCase());
  });

  return (
    <div className="portal-card" style={{ borderRadius: '40px', border: '2px solid #f1f5f9', overflow: 'hidden', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.04)' }}>
      <div className="portal-card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px', padding: '24px 30px', borderBottom: '1px solid #f1f5f9' }}>
        <h3 style={{ color: '#1e3a8a', margin: 0, fontSize: '1.4rem', fontWeight: 900 }}>
          <i className="fas fa-envelope-open-text mr-2" style={{ color: '#2196F3' }}></i>
          Website Inquiries
        </h3>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }} className="no-print">
          <button 
            onClick={() => {
              const headers = ['Name', 'Email', 'Phone', 'Message', 'Date'];
              const rows = filteredInquiries.map(inq => [
                inq.name,
                inq.email,
                inq.phone,
                inq.message,
                format(new Date(inq.createdAt), 'dd/MM/yyyy')
              ]);
              exportToCSV('Website_Inquiries', headers, rows);
            }}
            className="portal-btn-secondary"
            style={{ padding: '8px 16px', fontSize: '0.85rem' }}
            title="Export to CSV"
          >
            <i className="fas fa-file-csv mr-1"></i> CSV
          </button>
          <button 
            onClick={() => {
              const headers = ['Name', 'Email', 'Phone', 'Message', 'Date'];
              const rows = filteredInquiries.map(inq => [
                inq.name,
                inq.email,
                inq.phone,
                inq.message,
                format(new Date(inq.createdAt), 'dd/MM/yyyy')
              ]);
              exportToWord('Website_Inquiries', headers, rows);
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

      <div className="portal-card-body" style={{ padding: '24px' }}>
        <div style={{ display: 'flex', gap: 10, marginBottom: 20, justifyContent: 'flex-end' }}>
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <span style={{ marginRight: 10 }}>Search:</span>
            <input 
              type="text" 
              className="portal-input" 
              style={{ width: 200, padding: '5px 10px' }} 
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        <table className="portal-table">
          <thead>
            <tr>
              <th>NAME</th>
              <th>EMAIL</th>
              <th>PHONE</th>
              <th>MESSAGE</th>
              <th>DATE</th>
              <th style={{ textAlign: 'center' }}>OPTIONS</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={6} style={{ textAlign: 'center', padding: '20px', color: '#718096' }}>
                  Loading inquiries...
                </td>
              </tr>
            ) : filteredInquiries.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ textAlign: 'center', padding: '40px', color: '#a0aec0' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
                    <i className="fas fa-folder-open fa-2x" style={{ color: '#ecc94b' }}></i>
                    <span>No inquiries found</span>
                  </div>
                </td>
              </tr>
            ) : (
              filteredInquiries.map((inquiry) => (
                <tr key={inquiry.id}>
                  <td style={{ fontWeight: 600 }}>{inquiry.name}</td>
                  <td style={{ color: 'var(--portal-primary)' }}>
                    <a href={`mailto:${inquiry.email}`} style={{ color: 'inherit', textDecoration: 'none' }}>{inquiry.email}</a>
                  </td>
                  <td>{inquiry.phone}</td>
                  <td style={{ maxWidth: '250px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={inquiry.message}>
                    {inquiry.message}
                  </td>
                  <td>
                    {format(new Date(inquiry.createdAt), 'dd/MM/yyyy')}
                  </td>
                  <td style={{ textAlign: 'center' }}>
                    <button
                      onClick={() => deleteInquiry(inquiry.id)}
                      className="portal-btn-secondary"
                      style={{ padding: '6px 10px', color: 'white', background: 'var(--portal-danger)', border: 'none' }}
                      title="Delete"
                    >
                      <i className="fas fa-trash"></i>
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
