import React, { useState, useEffect, useMemo } from 'react';
import { Pagination } from '../../../../components/shared/Pagination';
import { useAuth } from '../../../../contexts/AuthContext';
import { useToast } from '../../../../context/ToastContext';
import api from '../../../../lib/api';
import { format } from 'date-fns';
import SearchInput from '../../../../components/shared/SearchInput';
import ExportButton from '../../../../components/shared/ExportButton';
import { SkeletonLoader } from '../../../../components/shared';
import { useModuleAccess } from '../../../../hooks/useModuleAccess';
import ViewingAsToggle from '../../../../components/shared/ViewingAsToggle';

interface AwardItem {
  id: string;
  awardName?: string;
  title?: string;
  gift?: string;
  prize?: string;
  amount?: number;
  cashPrize?: number;
  date?: string;
  createdAt?: string;
  awardType?: string;
  rewardType?: string;
  reason?: string;
  recipientName?: string;
  user?: {
    id?: string;
    name?: string;
    role?: string;
    email?: string;
  };
  student?: {
    id?: string;
    name?: string;
    className?: string;
  };
}

export default function MyAwards() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const { level, actingAs } = useModuleAccess('awards');

  const isPrivileged = level === 'full' || level === 'scoped' || ['BURSAR', 'SCHOOL_ADMIN', 'SUPER_ADMIN', 'FINANCE', 'TEACHER'].includes(user?.role || '');
  const [viewMode, setViewMode] = useState<'my' | 'institutional'>(isPrivileged ? 'institutional' : 'my');
  const [awards, setAwards] = useState<AwardItem[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // Nominate / Present Award Modal
  const [showNominateModal, setShowNominateModal] = useState(false);
  const [submittingNomination, setSubmittingNomination] = useState(false);
  const [nominationForm, setNominationForm] = useState({
    recipientType: 'STUDENT',
    title: '',
    awardType: 'Excellence',
    rewardType: 'Certificate Only',
    amount: 0,
    giftDescription: '',
    reason: ''
  });

  useEffect(() => {
    fetchAwards();
  }, [viewMode]);

  const fetchAwards = async () => {
    try {
      setLoading(true);
      const endpoint = viewMode === 'institutional' && isPrivileged ? '/api/awards/staff' : '/api/awards/my';
      const res = await api.get(endpoint);
      const data = Array.isArray(res.data) ? res.data : (res.data?.awards || []);
      setAwards(data);
    } catch (error) {
      console.error('Error fetching awards', error);
      setAwards([]);
    } finally {
      setLoading(false);
    }
  };

  const filteredAwards = useMemo(() => {
    const q = searchTerm.toLowerCase().trim();
    if (!q) return awards;
    return awards.filter(award => {
      const nameText = award.awardName || award.title || '';
      const giftText = award.gift || award.prize || '';
      const recipientText = award.recipientName || award.user?.name || award.student?.name || '';
      const reasonText = award.reason || '';
      return nameText.toLowerCase().includes(q) ||
        giftText.toLowerCase().includes(q) ||
        recipientText.toLowerCase().includes(q) ||
        reasonText.toLowerCase().includes(q);
    });
  }, [awards, searchTerm]);

  const paginatedAwards = useMemo(() => {
    return filteredAwards.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
  }, [filteredAwards, currentPage]);

  const totalPages = Math.ceil(filteredAwards.length / itemsPerPage);

  // Summary KPI Metrics
  const stats = useMemo(() => {
    const totalCount = awards.length;
    const totalCash = awards.reduce((sum, a) => sum + (a.amount || a.cashPrize || 0), 0);
    const certificates = awards.filter(a => (a.rewardType || '').toLowerCase().includes('certificate') || !a.amount).length;
    const cashBonuses = awards.filter(a => (a.amount || a.cashPrize || 0) > 0).length;
    return { totalCount, totalCash, certificates, cashBonuses };
  }, [awards]);

  const handleNominateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nominationForm.title || !nominationForm.reason) {
      showToast('Please provide an award title and citation rationale', 'warning');
      return;
    }

    setSubmittingNomination(true);
    try {
      await api.post('/api/awards', nominationForm);
      showToast('Award nomination recorded successfully', 'success');
      setShowNominateModal(false);
      setNominationForm({
        recipientType: 'STUDENT',
        title: '',
        awardType: 'Excellence',
        rewardType: 'Certificate Only',
        amount: 0,
        giftDescription: '',
        reason: ''
      });
      fetchAwards();
    } catch (err: any) {
      showToast(err.response?.data?.error || 'Failed to submit award nomination', 'error');
    } finally {
      setSubmittingNomination(false);
    }
  };

  // Export Columns definition for ExportButton
  const exportColumns = useMemo(() => {
    const cols: any[] = [
      { header: 'Award Title', key: 'title', formatter: (_: any, row: AwardItem) => row.awardName || row.title || 'Award' },
      { header: 'Reward / Gift', key: 'gift', formatter: (_: any, row: AwardItem) => row.gift || row.prize || '-' },
      { header: 'Funded Amount ($)', key: 'amount', formatter: (_: any, row: AwardItem) => `$${(row.amount || row.cashPrize || 0).toFixed(2)}` },
      { header: 'Date Awarded', key: 'date', formatter: (val: string) => val ? format(new Date(val), 'yyyy-MM-dd') : '—' }
    ];
    if (viewMode === 'institutional') {
      cols.splice(1, 0, {
        header: 'Recipient / Honoree',
        key: 'recipient',
        formatter: (_: any, row: AwardItem) => row.recipientName || row.user?.name || row.student?.name || 'Staff'
      });
    }
    return cols;
  }, [viewMode]);

  return (
    <>
      <div className="portal-page-header" style={{ marginBottom: 20 }}>
        <div>
          <h1>{viewMode === 'institutional' ? 'Institutional Awards & Honours Registry' : 'My Awards & Honours'}</h1>
          <p style={{ color: '#64748b', fontSize: '0.9rem', marginTop: 4 }}>
            {viewMode === 'institutional'
              ? 'Institutional prize funding, citations, staff & student honours, and financial prize allocations.'
              : 'Track personal merit citations, academic honours, and prize allocations.'}
          </p>
          {actingAs && <ViewingAsToggle actingAs={actingAs} />}
        </div>

        {/* Action Button for Privileged Roles */}
        {isPrivileged && (
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <button
              onClick={() => setShowNominateModal(true)}
              className="portal-btn-primary"
              style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '9px 18px', fontWeight: 600 }}
            >
              <i className="fas fa-trophy"></i> Nominate / Issue Award
            </button>
          </div>
        )}
      </div>

      {/* Split-View Mode Toggle */}
      {isPrivileged && (
        <div style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
          <button
            className={viewMode === 'institutional' ? 'portal-btn-primary' : 'portal-btn-secondary'}
            onClick={() => { setViewMode('institutional'); setCurrentPage(1); }}
            style={{ padding: '8px 18px', fontSize: '0.9rem', fontWeight: 700 }}
          >
            <i className="fas fa-trophy mr-2" style={{ marginRight: 6 }} />
            {level === 'scoped' ? 'Department / Class Honours' : 'Institutional Awards Registry'}
          </button>
          <button
            className={viewMode === 'my' ? 'portal-btn-primary' : 'portal-btn-secondary'}
            onClick={() => { setViewMode('my'); setCurrentPage(1); }}
            style={{ padding: '8px 18px', fontSize: '0.9rem', fontWeight: 700 }}
          >
            <i className="fas fa-user-graduate mr-2" style={{ marginRight: 6 }} />
            My Personal Awards
          </button>
        </div>
      )}

      {/* 4 Summary KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: 16, marginBottom: 24 }}>
        <div className="portal-card" style={{ background: '#fff', padding: '16px 20px', borderRadius: 10, borderLeft: '4px solid #f59e0b' }}>
          <div style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 600 }}>TOTAL HONOURS</div>
          <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#b45309', marginTop: 4 }}>{stats.totalCount}</div>
          <div style={{ fontSize: '0.75rem', color: '#d97706', marginTop: 4 }}>Conferred citations</div>
        </div>
        <div className="portal-card" style={{ background: '#fff', padding: '16px 20px', borderRadius: 10, borderLeft: '4px solid #10b981' }}>
          <div style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 600 }}>FUNDED CASH PRIZES</div>
          <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#059669', marginTop: 4 }}>${stats.totalCash.toLocaleString()}</div>
          <div style={{ fontSize: '0.75rem', color: '#10b981', marginTop: 4 }}>Total disbursement value</div>
        </div>
        <div className="portal-card" style={{ background: '#fff', padding: '16px 20px', borderRadius: 10, borderLeft: '4px solid #0284c7' }}>
          <div style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 600 }}>CASH BONUS HONOURS</div>
          <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#0369a1', marginTop: 4 }}>{stats.cashBonuses}</div>
          <div style={{ fontSize: '0.75rem', color: '#0284c7', marginTop: 4 }}>With monetary stipend</div>
        </div>
        <div className="portal-card" style={{ background: '#fff', padding: '16px 20px', borderRadius: 10, borderLeft: '4px solid #8b5cf6' }}>
          <div style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 600 }}>MERIT CITATIONS</div>
          <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#7c3aed', marginTop: 4 }}>{stats.certificates}</div>
          <div style={{ fontSize: '0.75rem', color: '#8b5cf6', marginTop: 4 }}>Certificates & shields</div>
        </div>
      </div>

      {/* Main Awards Table Card */}
      <div className="portal-card" style={{ borderRadius: '12px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
        <div className="portal-card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px', padding: '18px 24px', borderBottom: '1px solid #f1f5f9' }}>
          <h2 style={{ color: '#1e3a8a', margin: 0, fontSize: '1.25rem', fontWeight: 800 }}>
            <i className="fas fa-award mr-2" style={{ marginRight: 8 }} />
            {viewMode === 'institutional' ? 'INSTITUTIONAL HONOURS REGISTER' : 'PERSONAL CITATIONS & BADGES'}
          </h2>
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }} className="no-print">
            <ExportButton
              data={filteredAwards}
              filename={viewMode === 'institutional' ? 'Institutional_Awards_Register' : 'My_Awards_Honours'}
              columns={exportColumns}
              title={viewMode === 'institutional' ? 'Institutional Honours Register' : 'My Awards & Honours'}
            />
          </div>
        </div>

        <div className="portal-card-body" style={{ padding: 20 }}>
          {/* Shared Live-Search Component */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
            <div style={{ width: 280 }}>
              <SearchInput
                value={searchTerm}
                onChange={setSearchTerm}
                placeholder="Search awards, citations, recipients..."
              />
            </div>
          </div>

          <table className="portal-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0', textAlign: 'left' }}>
                <th style={{ padding: '12px 14px' }}>AWARD TITLE</th>
                {viewMode === 'institutional' && <th style={{ padding: '12px 14px' }}>HONOREE / RECIPIENT</th>}
                <th style={{ padding: '12px 14px' }}>GIFT / PRIZE</th>
                <th style={{ padding: '12px 14px' }}>FUNDED AMOUNT</th>
                <th style={{ padding: '12px 14px' }}>DATE AWARDED</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={viewMode === 'institutional' ? 5 : 4} style={{ padding: 24 }}>
                    <SkeletonLoader type="table" rows={6} columns={viewMode === 'institutional' ? 5 : 4} />
                  </td>
                </tr>
              ) : paginatedAwards.length === 0 ? (
                <tr>
                  <td colSpan={viewMode === 'institutional' ? 5 : 4} style={{ textAlign: 'center', padding: 40, color: '#94a3b8' }}>
                    No awards found matching current search.
                  </td>
                </tr>
              ) : (
                paginatedAwards.map((award) => (
                  <tr key={award.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '12px 14px', fontWeight: 700, color: '#1e293b' }}>
                      {award.awardName || award.title || 'Honour Citation'}
                    </td>
                    {viewMode === 'institutional' && (
                      <td style={{ padding: '12px 14px' }}>
                        <strong style={{ color: '#1e293b' }}>{award.recipientName || award.user?.name || award.student?.name || 'Staff Member'}</strong>
                        {award.user?.role && (
                          <span style={{ fontSize: '0.75rem', color: '#64748b', display: 'block' }}>{award.user.role}</span>
                        )}
                      </td>
                    )}
                    <td style={{ padding: '12px 14px', color: '#475569' }}>{award.gift || award.prize || 'Official Certificate'}</td>
                    <td style={{ padding: '12px 14px', color: '#059669', fontWeight: 700 }}>
                      ${(award.amount || award.cashPrize || 0).toFixed(2)}
                    </td>
                    <td style={{ padding: '12px 14px', color: '#64748b' }}>
                      {award.date ? format(new Date(award.date), 'yyyy-MM-dd') : '—'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>

          {/* Pagination Controls */}
          {filteredAwards.length > 0 && (
            <Pagination currentPage={currentPage} totalItems={filteredAwards.length} pageSize={itemsPerPage} onPageChange={setCurrentPage} onPageSizeChange={(size) => { setItemsPerPage(size); setCurrentPage(1); }} itemLabel="honours" />
          )}
        </div>
      </div>

      {/* Nominate / Present Award Modal */}
      {showNominateModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.65)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 16 }}>
          <div style={{ background: '#fff', borderRadius: 12, maxWidth: 520, width: '100%', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.2)', overflow: 'hidden' }}>
            <div style={{ padding: '16px 20px', background: '#f8fafc', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, color: '#1e293b' }}>
                Nominate & Confer Institutional Award
              </h3>
              <button
                type="button"
                onClick={() => setShowNominateModal(false)}
                style={{ border: 'none', background: 'transparent', fontSize: '1.2rem', color: '#94a3b8', cursor: 'pointer' }}
              >
                &times;
              </button>
            </div>
            <form onSubmit={handleNominateSubmit} style={{ padding: 20 }}>
              <div style={{ marginBottom: 14 }}>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#334155', marginBottom: 4 }}>Award Title *</label>
                <input
                  type="text"
                  className="portal-input"
                  style={{ width: '100%', padding: '8px 10px' }}
                  placeholder="e.g. Teacher of the Month, Academic Excellence..."
                  value={nominationForm.title}
                  onChange={e => setNominationForm({ ...nominationForm, title: e.target.value })}
                  required
                />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#334155', marginBottom: 4 }}>Recipient Category</label>
                  <select
                    className="portal-select"
                    style={{ width: '100%', padding: '8px 10px' }}
                    value={nominationForm.recipientType}
                    onChange={e => setNominationForm({ ...nominationForm, recipientType: e.target.value })}
                  >
                    <option value="STUDENT">Student Honoree</option>
                    <option value="STAFF">Staff / Faculty</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#334155', marginBottom: 4 }}>Reward Type</label>
                  <select
                    className="portal-select"
                    style={{ width: '100%', padding: '8px 10px' }}
                    value={nominationForm.rewardType}
                    onChange={e => setNominationForm({ ...nominationForm, rewardType: e.target.value })}
                  >
                    <option value="Certificate Only">Certificate Only</option>
                    <option value="Cash Bonus">Cash Bonus & Certificate</option>
                    <option value="Gift">Plaque / Gift</option>
                  </select>
                </div>
              </div>
              {nominationForm.rewardType === 'Cash Bonus' && (
                <div style={{ marginBottom: 14 }}>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#334155', marginBottom: 4 }}>Cash Stipend Amount ($ USD)</label>
                  <input
                    type="number"
                    className="portal-input"
                    style={{ width: '100%', padding: '8px 10px' }}
                    value={nominationForm.amount}
                    onChange={e => setNominationForm({ ...nominationForm, amount: parseFloat(e.target.value) || 0 })}
                  />
                </div>
              )}
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#334155', marginBottom: 4 }}>Citation Rationale *</label>
                <textarea
                  className="portal-input"
                  style={{ width: '100%', minHeight: 80, padding: '8px 10px', resize: 'vertical' }}
                  placeholder="Official citation outlining grounds for recognition..."
                  value={nominationForm.reason}
                  onChange={e => setNominationForm({ ...nominationForm, reason: e.target.value })}
                  required
                />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
                <button
                  type="button"
                  className="portal-btn-secondary"
                  onClick={() => setShowNominateModal(false)}
                  disabled={submittingNomination}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="portal-btn-primary"
                  disabled={submittingNomination}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
                >
                  {submittingNomination && <i className="fas fa-spinner fa-spin" />}
                  Confer Award
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
