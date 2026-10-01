import React, { useEffect, useState } from 'react';
import DHRepresentative from '../../student/pages/DHRepresentative';
import api from '../../../lib/api';

export default function TeacherDiningHall() {
  const [hasAccess, setHasAccess] = useState<boolean | null>(null);
  const [reason, setReason] = useState<string>('');

  useEffect(() => {
    api.get('/api/dining-hall/access')
      .then(res => {
        setHasAccess(res.data.hasAccess);
        setReason(res.data.reason || '');
      })
      .catch(() => {
        setHasAccess(false);
      });
  }, []);

  if (hasAccess === null) {
    return <div style={{ padding: 40, textAlign: 'center' }}><i className="fas fa-spinner fa-spin fa-2x"></i></div>;
  }

  if (!hasAccess) {
    return (
      <div className="portal-page-header">
        <h1>Access Denied</h1>
        <p>You do not have access to the Dining Hall module. Access is restricted to boarding staff, teachers on duty, or class teachers with dietary alerts in their class.</p>
      </div>
    );
  }

  return (
    <div>
      <div style={{ marginBottom: 16, padding: '12px 16px', background: '#ebf8ff', color: '#2b6cb0', borderRadius: 8, fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: 10 }}>
        <i className="fas fa-info-circle"></i>
        <span><strong>Access Granted:</strong> {reason}</span>
      </div>
      <DHRepresentative />
    </div>
  );
}
