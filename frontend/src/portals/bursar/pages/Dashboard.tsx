import api from '../../../lib/api';
import { useAuth } from '../../../contexts/AuthContext';
import { useAccountingQuery } from '../../../hooks/useAccountingQuery';

interface DashboardData {
  metrics: {
    expected: number;
    collected: number;
    outstanding: number;
    walletDeposits: number;
  };
  recentTransactions: {
    id: string;
    entryNumber: string;
    date: string;
    description: string;
    sourceType: string;
    status: string;
    lines: {
      id: string;
      debit: number;
      credit: number;
      account: { name: string; type: string };
    }[];
  }[];
}

export default function BursarDashboard() {
  const { user } = useAuth();

  const { data, isLoading, refetch } = useAccountingQuery<DashboardData>({
    key: 'accounting:dashboard:bursar:metrics',
    fetcher: async () => {
      const r = await api.get('/api/bursar-dashboard/metrics');
      return r.data;
    }
  });

  if (isLoading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh', flexDirection: 'column', gap: 16 }}>
      <i className="fas fa-spinner fa-spin fa-3x" style={{ color: 'var(--portal-primary)', opacity: 0.6 }}></i>
      <p style={{ color: '#718096' }}>Loading financial dashboard...</p>
    </div>
  );

  const m = data?.metrics;
  const collectionRate = m?.expected ? Math.round(((m.collected ?? 0) / m.expected) * 100) : 0;

  return (
    <>
      <div className="portal-page-header">
        <h1>Bursar Dashboard</h1>
        <p>Welcome, {user?.name}. Manage school finances, ledger, and payment plans.</p>
      </div>

      <div className="portal-stats-grid">
        <div className="portal-stat-card">
          <div className="portal-stat-icon blue"><i className="fas fa-file-invoice-dollar"></i></div>
          <div className="portal-stat-info"><h3>${(m?.expected ?? 0).toLocaleString()}</h3><p>Expected (Billed)</p></div>
        </div>
        <div className="portal-stat-card">
          <div className="portal-stat-icon green"><i className="fas fa-check-double"></i></div>
          <div className="portal-stat-info"><h3>${(m?.collected ?? 0).toLocaleString()}</h3><p>Collected</p></div>
        </div>
        <div className="portal-stat-card">
          <div className="portal-stat-icon red"><i className="fas fa-exclamation-circle"></i></div>
          <div className="portal-stat-info"><h3>${(m?.outstanding ?? 0).toLocaleString()}</h3><p>Outstanding</p></div>
        </div>
        <div className="portal-stat-card">
          <div className="portal-stat-icon teal"><i className="fas fa-wallet"></i></div>
          <div className="portal-stat-info"><h3>${(m?.walletDeposits ?? 0).toLocaleString()}</h3><p>Wallet Deposits</p></div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: 24, marginTop: 24 }}>
        <div className="portal-card">
          <div className="portal-card-header">
            <h2><i className="fas fa-history" style={{ marginRight: 8, color: '#48bb78' }}></i>Recent Ledger Transactions</h2>
          </div>
          <div className="portal-card-body" style={{ padding: 0 }}>
            {!data?.recentTransactions?.length ? (
              <div style={{ padding: 30, textAlign: 'center', color: '#718096' }}>No transactions found.</div>
            ) : (
              <table className="portal-table">
                <thead><tr><th>Date</th><th>Entry</th><th>Description</th><th>Source</th><th>Status</th></tr></thead>
                <tbody>
                  {data.recentTransactions.map((tx) => (
                    <tr key={tx.id}>
                      <td>{new Date(tx.date).toLocaleDateString()}</td>
                      <td style={{ fontWeight: 600 }}>{tx.entryNumber}</td>
                      <td>{tx.description}</td>
                      <td><span className="portal-badge">{tx.sourceType}</span></td>
                      <td><span className={`portal-badge ${tx.status === 'POSTED' ? 'success' : 'warning'}`}>{tx.status}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        <div className="portal-card">
          <div className="portal-card-header">
            <h2><i className="fas fa-bolt" style={{ marginRight: 8, color: '#f6ad55' }}></i>Quick Actions</h2>
          </div>
          <div className="portal-card-body" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <a href="/bursar/fees/receive" className="portal-btn" style={{ textAlign: 'center' }}>Receive Payment</a>
            <a href="/bursar/payment-plans" className="portal-btn outline" style={{ textAlign: 'center' }}>Manage Payment Plans</a>
            <a href="/bursar/ledger/journal" className="portal-btn outline" style={{ textAlign: 'center' }}>Post Journal Entry</a>
            <a href="/bursar/reports/aging" className="portal-btn outline" style={{ textAlign: 'center' }}>Debtors Aging</a>
          </div>
        </div>
      </div>
    </>
  );
}
