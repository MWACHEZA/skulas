import React, { type ReactNode } from 'react';
import { useAuth } from '../../../contexts/AuthContext';
import { Link } from 'react-router-dom';

interface PortalGateProps {
  children: ReactNode;
}

export default function PortalGate({ children }: PortalGateProps) {
  const { user, activeEntity, updateLinkedEntities, setActiveEntity } = useAuth();

  // 1. Check if an entity is active
  if (!activeEntity) {
    return (
      <div style={{ textAlign: 'center', padding: '100px 20px' }}>
        <div style={{ fontSize: '4rem', color: '#cbd5e0', marginBottom: 20 }}>
          <i className="fas fa-layer-group"></i>
        </div>
        <h2>No Active School Selected</h2>
        <p style={{ color: '#718096', maxWidth: 450, margin: '10px auto', lineHeight: 1.6 }}>
          You are currently logged into your {user?.role === 'SUPPLIER' ? 'Supplier' : 'Parent'} Global Account. 
          Please select or link a school to view specific data.
        </p>
        <div style={{ marginTop: 30 }}>
          <button 
            className="portal-btn-primary" 
            onClick={() => window.location.reload()}
            style={{ padding: '12px 24px' }}
          >
            <i className="fas fa-link" style={{ marginRight: 8 }}></i> Link a New Entity
          </button>
        </div>
      </div>
    );
  }

  // 2. Check for Approval (only for Suppliers and Parents where applicable)
  if (activeEntity.status === 'PENDING') {
    const simulateApproval = () => {
      if (!user?.linkedEntities) return;
      const updated = user.linkedEntities.map(e => 
        e.id === activeEntity.id ? { ...e, status: 'APPROVED' as const } : e
      );
      updateLinkedEntities(updated);
      setActiveEntity({ ...activeEntity, status: 'APPROVED' });
    };

    return (
      <div style={{ textAlign: 'center', padding: '100px 20px' }}>
        <div style={{ fontSize: '4rem', color: '#ecc94b', marginBottom: 20 }}>
          <i className="fas fa-hourglass-half"></i>
        </div>
        <h2>Connection Pending Approval</h2>
        <p style={{ color: '#718096', maxWidth: 450, margin: '10px auto', lineHeight: 1.6 }}>
          Your request to connect with <strong>{activeEntity.schoolName}</strong> has been submitted. 
          The school's admin must verify your account before you can access confidential data like tenders, invoices, or academic reports.
        </p>
        <div style={{ marginTop: 30, display: 'flex', gap: 10, justifyContent: 'center' }}>
          <button className="portal-btn-secondary" onClick={() => window.location.reload()}>
            <i className="fas fa-sync"></i> Refresh Status
          </button>
          <button className="portal-btn-primary" onClick={simulateApproval} style={{ background: '#3182ce' }}>
            <i className="fas fa-check-double"></i> [Dev] Simulate Admin Approval
          </button>
        </div>
      </div>
    );
  }

  // 3. Render children if approved and active
  return <>{children}</>;
}
