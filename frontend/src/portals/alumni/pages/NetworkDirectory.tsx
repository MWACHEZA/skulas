import { useState } from 'react';

export default function AlumniNetworkDirectory() {
  const [alumni] = useState([
    { name: 'John Mupfumi', class: 'Class of 2010', profession: 'Software Engineer', location: 'Harare', industry: 'Technology' },
    { name: 'Sithembile Ncube', class: 'Class of 2012', profession: 'Medical Doctor', location: 'Bulawayo', industry: 'Healthcare' },
    { name: 'Tatenda Chigumira', class: 'Class of 2008', profession: 'Civil Engineer', location: 'Johannesburg', industry: 'Engineering' },
    { name: 'Rufaro Dube', class: 'Class of 2015', profession: 'Commercial Lawyer', location: 'London', industry: 'Law' },
  ]);

  return (
    <>
      <div className="portal-page-header">
        <h1>Global Alumni Directory</h1>
        <p>Explore the network of Embakwe High School alumni worldwide and connect for mentorship or professional opportunities.</p>
      </div>

      <div style={{ marginBottom: 24, display: 'flex', gap: 12 }}>
        <input 
          type="text" 
          placeholder="Search by name, profession, or city..." 
          className="portal-input"
          style={{ flex: 1, padding: '12px 16px', borderRadius: 8, border: '1px solid #e2e8f0' }}
        />
        <select className="portal-select" style={{ padding: '0 16px', borderRadius: 8, border: '1px solid #e2e8f0' }}>
          <option>All Industries</option>
          <option>Healthcare</option>
          <option>Technology</option>
          <option>Finance</option>
          <option>Law</option>
        </select>
      </div>

      <div className="portal-grid-2">
        {alumni.map((a, idx) => (
          <div key={idx} className="portal-card" style={{ marginBottom: 0 }}>
            <div className="portal-card-body" style={{ display: 'flex', gap: 20, alignItems: 'center' }}>
              <div style={{ 
                width: 60, 
                height: 60, 
                borderRadius: 12, 
                background: '#f0f4f8', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center',
                fontSize: '1.2rem',
                color: 'var(--school-primary, #3182ce)',
                fontWeight: 700,
                flexShrink: 0
              }}>
                {a.name.split(' ').map(n => n[0]).join('')}
              </div>
              <div style={{ flex: 1 }}>
                <h3 style={{ margin: '0 0 4px', fontSize: '1.05rem' }}>{a.name}</h3>
                <div style={{ fontSize: '0.85rem', color: '#4a5568', fontWeight: 500 }}>{a.profession}</div>
                <div style={{ fontSize: '0.8rem', color: '#718096', marginTop: 2 }}>{a.location} &bull; <span style={{ fontWeight: 600 }}>{a.class}</span></div>
              </div>
              <button className="portal-btn-primary" style={{ padding: '8px 16px', fontSize: '0.8rem' }} onClick={() => alert('This feature is currently under development or disabled.')}>Connect</button>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
