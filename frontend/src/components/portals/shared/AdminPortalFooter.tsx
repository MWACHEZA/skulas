import { useAuth } from '../../../contexts/AuthContext';

export default function AdminPortalFooter() {
  const { user } = useAuth();
  const schoolName = user?.schoolName || 'St Patricks School';
  const currentYear = new Date().getFullYear();

  return (
    <footer style={{
      marginTop: 'auto',
      padding: '24px 0',
      borderTop: '1px solid rgba(226, 232, 240, 0.08)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: '0.82rem',
      color: '#64748b',
      background: 'transparent',
      gap: '4px'
    }}>
      <div style={{ textAlign: 'center', lineHeight: '1.6' }}>
        <span>&copy; {currentYear} <strong style={{ color: '#64748b' }}>{schoolName}</strong>. All Rights Reserved.</span>
      </div>
      <div style={{ textAlign: 'center', lineHeight: '1.6' }}>
        <span>Powered by <strong style={{ color: '#94a3b8' }}>ACADEX</strong></span>
        <span style={{ margin: '0 8px', color: '#475569' }}>|</span>
        <span>Designed by <span style={{ color: '#64748b' }}>Santana IT Solutions</span></span>
      </div>
    </footer>
  );
}
