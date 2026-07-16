import { useState } from 'react';
import { useToast } from '../../../context/ToastContext';
import { useAuth } from '../../../contexts/AuthContext';
import PortalGate from '../../../components/portals/shared/PortalGate';

export default function ComplianceDocs() {
  const { showToast } = useToast();
  const { activeEntity } = useAuth();
  const [loading, setLoading] = useState<string | null>(null);

  const [docs, setDocs] = useState([
    { id: 'tax', name: 'Tax Clearance (ITF263)', category: 'Tax', status: 'Valid', expiry: '2024-12-31', daysLeft: 265, percent: 90, icon: 'fas fa-file-invoice-dollar' },
    { id: 'praz', name: 'PRAZ Registration', category: 'Procurement', status: 'Expiring Soon', expiry: '2024-04-30', daysLeft: 20, percent: 20, icon: 'fas fa-stamp' },
    { id: 'nssa', name: 'NSSA Clearance', category: 'Social Security', status: 'Valid', expiry: '2024-12-31', daysLeft: 265, percent: 85, icon: 'fas fa-shield-alt' },
    { id: 'cert', name: 'Cert of Incorporation', category: 'Legal', status: 'Verified', expiry: 'N/A', daysLeft: 365, percent: 100, icon: 'fas fa-file-contract' },
    { id: 'vendor', name: 'Gov Vendor Number', category: 'Legal', status: 'Missing', expiry: '-', daysLeft: 0, percent: 0, icon: 'fas fa-barcode' },
  ]);

  const handleUpdate = (id: string) => {
    setLoading(id);
    setTimeout(() => {
        showToast(`Update request for ${id.toUpperCase()} submitted.`, 'success');
        setLoading(null);
    }, 1000);
  };

  const overallScore = Math.round(docs.reduce((acc, d) => acc + (d.status === 'Valid' || d.status === 'Verified' ? 1 : d.status === 'Expiring Soon' ? 0.5 : 0), 0) / docs.length * 100);

  return (
    <PortalGate>
      <div className="portal-page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <div>
          <h1>Compliance Management</h1>
          <p>Maintain mandatory registration documents for <strong>{activeEntity?.schoolName}</strong>.</p>
        </div>
        <div className={`portal-badge ${overallScore > 80 ? 'success' : 'warning'}`} style={{ padding: '8px 16px', fontSize: '0.9rem' }}>
           {overallScore > 80 ? 'Compliant Supplier' : 'Action Required'}
        </div>
      </div>

      <div className="portal-card" style={{ background: 'linear-gradient(135deg, #ffffff 0%, #f8faff 100%)' }}>
        <div className="portal-card-body" style={{ display: 'flex', alignItems: 'center', gap: 32, padding: '32px' }}>
          <div style={{ position: 'relative', width: 100, height: 100, flexShrink: 0 }}>
             <svg width="100" height="100" viewBox="0 0 100 100">
                <circle cx="50" cy="50" r="45" fill="none" stroke="#e2e8f0" strokeWidth="8" />
                <circle 
                    cx="50" cy="50" r="45" fill="none" stroke={overallScore > 80 ? 'var(--portal-success)' : 'var(--portal-warning)'} strokeWidth="8" 
                    strokeDasharray="283" 
                    strokeDashoffset={283 - (283 * overallScore / 100)} 
                    strokeLinecap="round"
                    style={{ transition: 'stroke-dashoffset 1s ease' }}
                />
             </svg>
             <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                <span style={{ fontSize: '1.4rem', fontWeight: 800, color: '#2d3748' }}>{overallScore}%</span>
                <span style={{ fontSize: '0.65rem', fontWeight: 700, color: '#718096', textTransform: 'uppercase' }}>Score</span>
             </div>
          </div>
          <div>
            <h3 style={{ margin: '0 0 6px', fontSize: '1.25rem' }}>Overall Compliance Health</h3>
            <p style={{ margin: 0, color: '#718096', fontSize: '0.9rem' }}>
                Your standing as a registered supplier for the current fiscal term. 
                Keep all documents <strong>Valid</strong> to receive purchase orders.
            </p>
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, marginTop: 24 }}>
        {docs.map((doc) => (
          <div key={doc.id} className="portal-card" style={{ marginBottom: 0 }}>
            <div className="portal-card-header" style={{ padding: '16px 20px' }}>
              <h2 style={{ fontSize: '0.95rem' }}><i className={`${doc.icon}`} style={{ marginRight: 10, color: 'var(--school-primary, #3182ce)' }}></i>{doc.name}</h2>
              <span className={`portal-badge ${
                doc.status === 'Valid' || doc.status === 'Verified' ? 'success' : 
                doc.status === 'Expiring Soon' ? 'warning' : 'danger'
              }`} style={{ fontSize: '0.65rem' }}>
                {doc.status}
              </span>
            </div>
            <div className="portal-card-body" style={{ padding: '20px' }}>
              <div style={{ marginBottom: 15 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: 6 }}>
                    <span style={{ color: '#718096' }}>Expiry: <strong style={{ color: '#2d3748' }}>{doc.expiry}</strong></span>
                    <span style={{ fontWeight: 600, color: doc.daysLeft < 30 ? 'var(--portal-danger)' : 'var(--portal-success)' }}>{doc.daysLeft} days left</span>
                </div>
                <div style={{ height: 6, background: '#edf2f7', borderRadius: 3, overflow: 'hidden' }}>
                    <div style={{ 
                        width: `${doc.percent}%`, 
                        height: '100%', 
                        background: doc.status === 'Valid' || doc.status === 'Verified' ? 'var(--portal-success)' : doc.status === 'Expiring Soon' ? 'var(--portal-warning)' : 'var(--portal-danger)',
                        transition: 'width 1s ease'
                    }} />
                </div>
              </div>
              <button 
                className="portal-btn-secondary" 
                style={{ width: '100%', justifyContent: 'center', fontSize: '0.82rem', padding: '8px' }}
                onClick={() => handleUpdate(doc.id)}
                disabled={loading === doc.id}
              >
                <i className={loading === doc.id ? "fas fa-spinner fa-spin" : "fas fa-upload"}></i> 
                {loading === doc.id ? ' Processing...' : ' Update Document'}
              </button>
            </div>
          </div>
        ))}
      </div>
    </PortalGate>
  );
}

