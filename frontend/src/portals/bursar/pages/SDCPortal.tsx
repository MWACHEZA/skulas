import { useState, useEffect } from 'react';
import api from '../../../lib/api';
import { useTerminology } from '../../../hooks/useTerminology';

interface ProjectFunding {
  id: string;
  name: string;
  budget: number;
  spent: number;
  status: string;
}

interface MeetingMinute {
  id: string;
  date: string;
  title: string;
  attendees: string;
  status: string;
  documentUrl: string | null;
}

export default function BursarSDCPortal() {
  const { t } = useTerminology();
  const [minutes, setMinutes] = useState<MeetingMinute[]>([]);
  const [funding, setFunding] = useState<ProjectFunding[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [minutesRes, fundingRes] = await Promise.all([
        api.get('/api/meeting-minutes'),
        api.get('/api/funding')
      ]);
      setMinutes(minutesRes.data.slice(0, 5)); // show latest 5
      setFunding(fundingRes.data);
    } catch (err) {
      console.error('Failed to fetch SDC portal data', err);
    
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadFile = async (documentUrl: string, fileName: string) => {
    try {
      const response = await api.get(`/api/storage/file/${documentUrl}`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', fileName || 'minutes.pdf');
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      console.error('Failed to download file', error);
      alert('Failed to download file');
    }
  };

  const totalBudget = funding.reduce((sum, p) => sum + (p.budget || 0), 0);

  return (
    <>
      <div className="portal-page-header">
        <h1>{t('governanceShort')} Portal</h1>
        <p>{t('governance')} official records, meeting minutes, and development funding oversight.</p>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 60 }}>
          <i className="fas fa-spinner fa-spin" style={{ fontSize: '2rem', color: 'var(--school-primary, #0056b3)' }}></i>
          <p style={{ marginTop: 10, fontWeight: 600 }}>Loading portal data...</p>
        </div>
      ) : (
        <div className="portal-grid-2">
          {/* Fund Allocation Card */}
          <div className="portal-card">
            <div className="portal-card-header">
              <h2><i className="fas fa-chart-pie" style={{ marginRight: 8, color: 'var(--school-primary, #3182ce)' }}></i>Development Fund Allocation</h2>
            </div>
            <div className="portal-card-body">
              {funding.length === 0 ? (
                <div style={{ padding: '40px 20px', textAlign: 'center', color: '#a0aec0' }}>
                  <i className="fas fa-hand-holding-usd" style={{ fontSize: '2.5rem', marginBottom: 12, opacity: 0.3 }}></i>
                  <p style={{ margin: 0, fontWeight: 600 }}>No development projects registered.</p>
                </div>
              ) : (
                funding.map((p, index) => {
                  const pct = totalBudget > 0 ? (p.budget / totalBudget) * 100 : 0;
                  // Harmonious colors for bars
                  const colors = ['var(--school-primary, #3182ce)', 'var(--portal-success)', 'var(--portal-danger)', '#805ad5', '#dd6b20', '#319795'];
                  const color = colors[index % colors.length];
                  return (
                    <div key={p.id} style={{ marginBottom: index < funding.length - 1 ? 20 : 0 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                        <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>{p.name}</span>
                        <span style={{ fontWeight: 700, color }}>{Math.round(pct)}%</span>
                      </div>
                      <div style={{ height: 10, background: '#edf2f7', borderRadius: 5, overflow: 'hidden' }}>
                        <div style={{ width: `${pct}%`, height: '100%', background: color, borderRadius: 5 }}></div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Meeting Minutes Card */}
          <div className="portal-card">
            <div className="portal-card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2><i className="fas fa-file-invoice" style={{ marginRight: 8, color: '#805ad5' }}></i>{t('governanceShort')} Meeting Minutes</h2>
            </div>
            <div className="portal-card-body" style={{ padding: 0 }}>
              <table className="portal-table">
                <thead>
                  <tr>
                    <th>Topic</th>
                    <th>Date</th>
                    <th style={{ textAlign: 'center' }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {minutes.length === 0 ? (
                    <tr>
                      <td colSpan={3} style={{ textAlign: 'center', padding: '40px 20px', color: '#a0aec0' }}>
                        No meeting minutes available.
                      </td>
                    </tr>
                  ) : (
                    minutes.map((m) => (
                      <tr key={m.id}>
                        <td>
                          <div style={{ fontWeight: 600 }}>{m.title}</div>
                          <div style={{ fontSize: '0.75rem', color: '#a0aec0' }}>{m.status}</div>
                        </td>
                        <td style={{ color: '#718096' }}>{new Date(m.date).toLocaleDateString()}</td>
                        <td style={{ textAlign: 'center' }}>
                          {m.documentUrl ? (
                            <button 
                              style={{ background: 'none', border: 'none', color: 'var(--school-primary, #0056b3)', cursor: 'pointer', fontSize: '1.1rem' }}
                              onClick={() => handleDownloadFile(m.documentUrl!, `${m.title.replace(/\s+/g, '_')}_Minutes.pdf`)}
                              title="Download Minutes PDF"
                            >
                              <i className="fas fa-download"></i>
                            </button>
                          ) : (
                            <span style={{ color: '#cbd5e1', fontSize: '0.85rem' }}>—</span>
                          )}
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
    </>
  );
}
