import { useState } from 'react';
import { useToast } from '../../../context/ToastContext';
import { SearchInput, ExportButton } from '../../../components/shared';

export default function AlumniNetworkDirectory() {
  const { showToast } = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedIndustry, setSelectedIndustry] = useState('All Industries');

  const [alumni] = useState([
    { name: 'John Mupfumi', class: 'Class of 2010', profession: 'Software Engineer', location: 'Harare', industry: 'Technology' },
    { name: 'Sithembile Ncube', class: 'Class of 2012', profession: 'Medical Doctor', location: 'Bulawayo', industry: 'Healthcare' },
    { name: 'Tatenda Chigumira', class: 'Class of 2008', profession: 'Civil Engineer', location: 'Johannesburg', industry: 'Engineering' },
    { name: 'Rufaro Dube', class: 'Class of 2015', profession: 'Commercial Lawyer', location: 'London', industry: 'Law' },
  ]);

  const filteredAlumni = alumni.filter(a => {
    const term = searchTerm.toLowerCase();
    const matchSearch =
      a.name.toLowerCase().includes(term) ||
      a.profession.toLowerCase().includes(term) ||
      a.location.toLowerCase().includes(term) ||
      a.class.toLowerCase().includes(term);
    const matchIndustry =
      selectedIndustry === 'All Industries' || a.industry.toLowerCase() === selectedIndustry.toLowerCase();
    return matchSearch && matchIndustry;
  });

  return (
    <>
      <div className="portal-page-header">
        <h1>Global Alumni Directory</h1>
        <p>Explore the network of alumni worldwide and connect for mentorship or professional opportunities.</p>
      </div>

      <div style={{ marginBottom: 24, display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: 260, maxWidth: 450 }}>
          <SearchInput
            value={searchTerm}
            onChange={setSearchTerm}
            placeholder="Search by name, profession, or city..."
          />
        </div>
        <select
          className="portal-select"
          value={selectedIndustry}
          onChange={e => setSelectedIndustry(e.target.value)}
          style={{ padding: '0 16px', height: '42px', borderRadius: 8, border: '1px solid #cbd5e1' }}
        >
          <option>All Industries</option>
          <option>Healthcare</option>
          <option>Technology</option>
          <option>Engineering</option>
          <option>Finance</option>
          <option>Law</option>
        </select>
        <ExportButton
          data={filteredAlumni.map(a => ({
            name: a.name,
            class: a.class,
            profession: a.profession,
            industry: a.industry,
            location: a.location
          }))}
          columns={[
            { header: 'Alumnus Name', key: 'name', width: 25 },
            { header: 'Graduation Class', key: 'class', width: 18 },
            { header: 'Profession / Job Title', key: 'profession', width: 24 },
            { header: 'Industry', key: 'industry', width: 18 },
            { header: 'City / Location', key: 'location', width: 18 }
          ]}
          filename="alumni-directory"
          title="Global Alumni Network Directory"
          subtitle={`Total Alumni: ${filteredAlumni.length}`}
        />
      </div>

      {filteredAlumni.length === 0 ? (
        <div className="portal-card" style={{ padding: 60, textAlign: 'center', color: '#64748b' }}>
          <i className="fas fa-user-friends fa-3x" style={{ color: '#cbd5e1', marginBottom: 16 }}></i>
          <h3>No alumni found</h3>
          <p>No alumni matching "{searchTerm}" in {selectedIndustry}.</p>
        </div>
      ) : (
        <div className="portal-grid-2">
          {filteredAlumni.map((a, idx) => (
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
                <button className="portal-btn-primary" style={{ padding: '8px 16px', fontSize: '0.8rem' }} onClick={() => showToast(`Connection request sent to ${a.name}`, 'success')}>Connect</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
