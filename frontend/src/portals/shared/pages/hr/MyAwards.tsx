import React, { useState, useEffect } from 'react';
import { useAuth } from '../../../../contexts/AuthContext';
import { useToast } from '../../../../context/ToastContext';
import api from '../../../../lib/api';
import { format } from 'date-fns';

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

export default function MyAwards() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [awards, setAwards] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchAwards();
  }, []);

  const fetchAwards = async () => {
    try {
      const res = await api.get('/api/awards/my');
      setAwards(res.data);
    } catch (error) {
      console.error('Error fetching awards', error);
      showToast('Failed to load awards', 'error');
    
    }
  };

  const filteredAwards = awards.filter(award => {
    const nameText = award.awardName || '';
    const giftText = award.gift || '';
    return nameText.toLowerCase().includes(searchTerm.toLowerCase()) ||
      giftText.toLowerCase().includes(searchTerm.toLowerCase());
  });

  return (
    <>
      <div className="portal-page-header">
        <h1>My Awards & Honors</h1>
      </div>

      <div className="portal-card" style={{ borderRadius: '40px', border: '2px solid #f1f5f9', overflow: 'hidden', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.04)' }}>
        <div className="portal-card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px', padding: '24px 30px', borderBottom: '1px solid #f1f5f9' }}>
          <h2 style={{ color: '#1e3a8a', margin: 0, fontSize: '1.4rem', fontWeight: 900 }}>
            <i className="fas fa-award mr-2"></i>My Awards & Trophies
          </h2>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }} className="no-print">
            <button 
              onClick={() => {
                const headers = ['Award Name', 'Gift', 'Amount', 'Date'];
                const rows = filteredAwards.map(a => [
                  a.awardName,
                  a.gift || '-',
                  `$${a.amount?.toFixed(2)}`,
                  format(new Date(a.date), 'yyyy-MM-dd')
                ]);
                exportToCSV('My_Awards', headers, rows);
              }}
              className="portal-btn-secondary"
              style={{ padding: '8px 16px', fontSize: '0.85rem' }}
              title="Export to CSV"
            >
              <i className="fas fa-file-csv mr-1"></i> CSV
            </button>
            <button 
              onClick={() => {
                const headers = ['Award Name', 'Gift', 'Amount', 'Date'];
                const rows = filteredAwards.map(a => [
                  a.awardName,
                  a.gift || '-',
                  `$${a.amount?.toFixed(2)}`,
                  format(new Date(a.date), 'yyyy-MM-dd')
                ]);
                exportToWord('My_Awards', headers, rows);
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

        <div className="portal-card-body" style={{ padding: 20 }}>
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
                <th>AWARD NAME</th>
                <th>GIFT</th>
                <th>AMOUNT</th>
                <th>DATE</th>
              </tr>
            </thead>
            <tbody>
              {filteredAwards.length === 0 ? (
                <tr>
                  <td colSpan={4} style={{ textAlign: 'center', padding: 50, color: '#a0aec0' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                      <div style={{ background: '#ebf8fa', borderRadius: '50%', padding: 20, marginBottom: 15 }}>
                        <i className="fas fa-folder-open fa-3x" style={{ color: '#ecc94b' }}></i>
                      </div>
                      <span>No awards found.</span>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredAwards.map((award) => (
                  <tr key={award.id}>
                    <td style={{ fontWeight: 600 }}>{award.awardName}</td>
                    <td>{award.gift || '-'}</td>
                    <td>${award.amount?.toFixed(2)}</td>
                    <td>{format(new Date(award.date), 'yyyy-MM-dd')}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
          
          <div style={{ marginTop: 15, display: 'flex', justifyContent: 'space-between', color: '#718096', fontSize: '0.9rem' }}>
             <span>Showing {filteredAwards.length > 0 ? 1 : 0} to {filteredAwards.length} of {filteredAwards.length} entries</span>
             <div>
                <button style={{ border: 'none', background: 'transparent', color: '#718096', cursor: 'pointer', marginRight: 10 }} onClick={() => alert('This feature is currently under development or disabled.')}>Previous</button>
                <button style={{ border: 'none', background: 'transparent', color: '#718096', cursor: 'pointer', marginLeft: 10 }} onClick={() => alert('This feature is currently under development or disabled.')}>Next</button>
             </div>
          </div>
        </div>
      </div>
    </>
  );
}
