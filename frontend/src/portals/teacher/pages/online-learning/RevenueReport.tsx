import React, { useState, useEffect } from 'react';
import api from '../../../../lib/api';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

export default function RevenueReport() {
  const [report, setReport] = useState<any>(null);

  useEffect(() => {
    fetchReport();
  }, []);

  const fetchReport = async () => {
    try {
      const res = await api.get('/api/courses/revenue/report');
      setReport(res.data);
    } catch (error) {
      console.error('Error fetching revenue report', error);
    
    }
  };

  if (!report) {
    return <div>Loading...</div>;
  }

  return (
    <>
      <div className="portal-page-header">
        <h1>Revenue Report</h1>
      </div>

      <div className="portal-card">
        <div className="portal-card-header">
          <h2><i className="fas fa-chart-line"></i> REVENUE REPORT</h2>
        </div>
        <div className="portal-card-body">
          
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 20, marginBottom: 40, textAlign: 'center' }}>
            <div>
              <h1 style={{ fontSize: '2.5rem', color: '#4a5568', margin: '0 0 5px 0' }}>
                Z${report.lifetimeEarnings.toFixed(2)} <i className="fas fa-arrow-up" style={{ color: 'var(--portal-success)', fontSize: '1.2rem' }}></i>
              </h1>
              <p style={{ color: '#718096', margin: 0 }}>Lifetime earnings as of {new Date().toLocaleDateString()}</p>
            </div>
            <div>
              <h1 style={{ fontSize: '2.5rem', color: '#4a5568', margin: '0 0 5px 0' }}>
                Z${report.thisMonthEarnings.toFixed(2)} <i className="fas fa-arrow-up" style={{ color: 'var(--portal-success)', fontSize: '1.2rem' }}></i>
              </h1>
              <p style={{ color: '#718096', margin: 0 }}>This month earnings</p>
            </div>
            <div>
              <h1 style={{ fontSize: '2.5rem', color: '#4a5568', margin: '0 0 5px 0' }}>
                Z${report.lifetimeEarnings.toFixed(2)} <i className="fas fa-arrow-up" style={{ color: 'var(--portal-success)', fontSize: '1.2rem' }}></i>
              </h1>
              <p style={{ color: '#718096', margin: 0 }}>Total earnings received as of {new Date().toLocaleDateString()}</p>
            </div>
          </div>

          <div style={{ width: '100%', height: 400 }}>
            <ResponsiveContainer>
              <LineChart
                data={report.monthlyData}
                margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" axisLine={false} tickLine={false} />
                <YAxis axisLine={false} tickLine={false} domain={[0, 'auto']} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#2d3748', border: 'none', borderRadius: 4, color: '#fff' }}
                  itemStyle={{ color: '#fff' }}
                />
                <Legend verticalAlign="top" wrapperStyle={{ paddingBottom: 20 }} iconType="rect" />
                <Line type="monotone" dataKey="courseRevenue" name="Course revenue" stroke='var(--portal-success)' strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                <Line type="monotone" dataKey="tutorRevenue" name="Tutor revenue" stroke="#d53f8c" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>

        </div>
      </div>

      <div className="portal-card" style={{ marginTop: 20 }}>
        <div className="portal-card-body" style={{ padding: 0 }}>
          <table className="portal-table" style={{ margin: 0 }}>
            <thead style={{ background: '#edf2f7' }}>
              <tr>
                <th style={{ padding: '15px 20px', borderBottom: '1px solid #e2e8f0' }}>TIME PERIOD</th>
                <th style={{ padding: '15px 20px', borderBottom: '1px solid #e2e8f0' }}>EARNINGS</th>
                <th style={{ padding: '15px 20px', borderBottom: '1px solid #e2e8f0' }}>STATUS</th>
              </tr>
            </thead>
            <tbody>
              {report.monthlyData.map((data: any, idx: number) => {
                const isCurrentMonth = new Date().getMonth() === idx;
                const isPast = new Date().getMonth() > idx;
                
                return (
                  <tr key={idx}>
                    <td style={{ padding: '15px 20px', borderBottom: '1px solid #e2e8f0' }}>
                      {data.name} {new Date().getFullYear()}
                      {isCurrentMonth && (
                        <span style={{ marginLeft: 10, background: '#4299e1', color: 'white', padding: '2px 8px', borderRadius: 12, fontSize: '0.8rem' }}>
                          current month <i className="fas fa-sync-alt"></i>
                        </span>
                      )}
                    </td>
                    <td style={{ padding: '15px 20px', borderBottom: '1px solid #e2e8f0' }}>
                      {data.courseRevenue > 0 ? `Z$${data.courseRevenue}` : '---'}
                    </td>
                    <td style={{ padding: '15px 20px', borderBottom: '1px solid #e2e8f0' }}>
                      {isCurrentMonth ? <i className="fas fa-circle-notch fa-spin" style={{ color: '#a0aec0' }}></i> : 
                       isPast ? <i className="fas fa-lock" style={{ color: '#4a5568' }}></i> : '---'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
