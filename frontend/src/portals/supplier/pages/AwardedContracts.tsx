import { useState } from 'react';
import { useAuth } from '../../../contexts/AuthContext';
import PortalGate from '../../../components/portals/shared/PortalGate';

export default function AwardedContracts() {
  const { activeEntity } = useAuth();
  const [contracts] = useState([
    { id: 'CON-2024-005', title: 'Stationery Supply Agreement', value: '$2,500/mo', duration: '12 Months', status: 'Active' },
    { id: 'CON-2024-001', title: 'Main Campus Flooring Project', value: '$18,500', duration: '3 Months', status: 'Completed' },
  ]);

  return (
    <PortalGate>
      <div className="portal-page-header">
        <h1>Awarded Contracts</h1>
        <p>Review agreements and contracts with <strong>{activeEntity?.schoolName}</strong>.</p>
      </div>

      <div className="portal-card">
        <div className="portal-card-header">
          <h2><i className="fas fa-file-contract" style={{ marginRight: 8, color: 'var(--school-primary, #3182ce)' }}></i>Contract Repository</h2>
        </div>
        <div className="portal-card-body" style={{ padding: 0 }}>
          <table className="portal-table">
            <thead>
              <tr>
                <th>Contract ID</th>
                <th>Title</th>
                <th>Contract Value</th>
                <th>Duration</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {contracts.map((contract) => (
                <tr key={contract.id}>
                  <td style={{ fontSize: '0.85rem', color: '#718096' }}>{contract.id}</td>
                  <td style={{ fontWeight: 600 }}>{contract.title}</td>
                  <td style={{ fontWeight: 600 }}>{contract.value}</td>
                  <td>{contract.duration}</td>
                  <td>
                    <span className={`portal-badge ${contract.status === 'Active' ? 'success' : 'neutral'}`}>
                      {contract.status}
                    </span>
                  </td>
                  <td>
                    <button className="portal-btn-secondary" style={{ padding: '6px 12px' }} onClick={() => alert('This feature is currently under development or disabled.')}>View PDF</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </PortalGate>
  );
}
