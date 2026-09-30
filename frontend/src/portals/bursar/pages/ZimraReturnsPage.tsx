import React, { useState, useEffect } from 'react';
import api from '../../../lib/api';
import { useToast } from '../../../context/ToastContext';

export default function ZimraReturnsPage() {
  const { showToast } = useToast();
  const currentMonth = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`;
  const [period, setPeriod] = useState(currentMonth);
  const [activeTab, setActiveTab] = useState<'vat2' | 'p2' | 'emis' | 'clearance'>('vat2');
  const [loading, setLoading] = useState(false);

  const [vatData, setVatData] = useState<any>(null);
  const [p2Data, setP2Data] = useState<any>(null);
  const [emisData, setEmisData] = useState<any>(null);

  // Clearance search
  const [studentSearchId, setStudentSearchId] = useState('');
  const [clearanceData, setClearanceData] = useState<any>(null);

  useEffect(() => {
    fetchReturnData();
  }, [period, activeTab]);

  const fetchReturnData = async () => {
    setLoading(true);
    try {
      if (activeTab === 'vat2') {
        const res = await api.get(`/compliance/zimra/vat2?period=${period}`);
        setVatData(res.data);
      } else if (activeTab === 'p2') {
        const res = await api.get(`/compliance/zimra/p2?period=${period}`);
        setP2Data(res.data);
      } else if (activeTab === 'emis') {
        const res = await api.get(`/compliance/emis?year=${period.substring(0, 4)}`);
        setEmisData(res.data);
      }
    } catch (err) {
      console.error('Fetch returns error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadCsv = (type: 'vat2' | 'p2') => {
    window.open(`/api/compliance/zimra/${type}?period=${period}&format=csv`, '_blank');
  };

  const handleCheckClearance = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!studentSearchId) return;
    try {
      const res = await api.get(`/compliance/clearance/${studentSearchId}`);
      setClearanceData(res.data);
    } catch (err: any) {
      showToast(err.response?.data?.error || 'Student clearance not found', 'error');
    }
  };

  const handleSignoff = async (section: 'LIBRARY' | 'FEES' | 'HOSTEL' | 'FINAL') => {
    if (!studentSearchId) return;
    try {
      await api.post(`/compliance/clearance/${studentSearchId}/signoff`, { section });
      const res = await api.get(`/compliance/clearance/${studentSearchId}`);
      setClearanceData(res.data);
      showToast(`Clearance for ${section.toLowerCase()} recorded successfully`, 'success');
    } catch (err: any) {
      showToast(err.response?.data?.error || 'Failed to signoff clearance', 'error');
    }
  };

  return (
    <div style={{ padding: 24, maxWidth: 1400, margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: '1.6rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>
            <i className="fas fa-landmark" style={{ color: '#0284c7', marginRight: 10 }} />
            Statutory Returns & Ministry EMIS Compliance
          </h1>
          <p style={{ color: '#64748b', fontSize: '0.95rem', marginTop: 4 }}>
            Official ZIMRA Form VAT2, Form P2/NSSA payroll remittances, and Ministry of Primary and Secondary Education reporting.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <label style={{ fontWeight: 600, color: '#334155', fontSize: '0.9rem' }}>Period:</label>
          <input
            type="month"
            value={period}
            onChange={e => setPeriod(e.target.value)}
            style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid #cbd5e1', fontWeight: 600 }}
          />
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 10, borderBottom: '2px solid #e2e8f0', marginBottom: 24 }}>
        {[
          { id: 'vat2', label: 'ZIMRA Form VAT2', icon: 'fa-percentage' },
          { id: 'p2', label: 'Form P2 & NSSA', icon: 'fa-users' },
          { id: 'emis', label: 'Ministry EMIS Matrix', icon: 'fa-school' },
          { id: 'clearance', label: 'Student Clearance', icon: 'fa-user-check' }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            style={{
              padding: '12px 20px',
              border: 'none',
              background: 'none',
              cursor: 'pointer',
              fontWeight: activeTab === tab.id ? 700 : 500,
              color: activeTab === tab.id ? '#0284c7' : '#64748b',
              borderBottom: activeTab === tab.id ? '3px solid #0284c7' : '3px solid transparent',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              fontSize: '0.95rem'
            }}
          >
            <i className={`fas ${tab.icon}`} />
            {tab.label}
          </button>
        ))}
      </div>

      {loading && <div style={{ padding: 20, textAlign: 'center', color: '#64748b' }}>Generating return...</div>}

      {/* TAB 1: VAT2 RETURN */}
      {!loading && activeTab === 'vat2' && vatData && (
        <div style={{ background: '#fff', borderRadius: 10, border: '1px solid #e2e8f0', padding: 24 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <div>
              <h3 style={{ margin: 0, fontWeight: 800 }}>ZIMRA FORM VAT2 — Value Added Tax Return</h3>
              <div style={{ color: '#64748b', fontSize: '0.85rem', marginTop: 4 }}>
                Period: {vatData.period} | Taxpayer TIN: {vatData.vatNumber}
              </div>
            </div>
            <button
              onClick={() => handleDownloadCsv('vat2')}
              style={{
                background: '#16a34a',
                color: '#fff',
                border: 'none',
                borderRadius: 8,
                padding: '8px 16px',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 8
              }}
            >
              <i className="fas fa-file-csv" />
              Download ZIMRA e-Services CSV
            </button>
          </div>

          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.95rem' }}>
            <thead>
              <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
                <th style={{ padding: 12, textAlign: 'left' }}>Line</th>
                <th style={{ padding: 12, textAlign: 'left' }}>Tax Bracket Description</th>
                <th style={{ padding: 12, textAlign: 'right' }}>Gross Supplies (USD)</th>
                <th style={{ padding: 12, textAlign: 'right' }}>Output Tax (15%)</th>
              </tr>
            </thead>
            <tbody>
              <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                <td style={{ padding: 12, fontWeight: 700 }}>1</td>
                <td style={{ padding: 12 }}>Standard Rated Commercial Supplies (Tuckshop, Uniforms, Bookstore)</td>
                <td style={{ padding: 12, textAlign: 'right' }}>${vatData.standardRatedSales?.toFixed(2)}</td>
                <td style={{ padding: 12, textAlign: 'right', fontWeight: 600, color: '#0284c7' }}>
                  ${vatData.standardRatedVat?.toFixed(2)}
                </td>
              </tr>
              <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                <td style={{ padding: 12, fontWeight: 700 }}>2</td>
                <td style={{ padding: 12 }}>Exempt Supplies (Tuition, Boarding, Exam Fees)</td>
                <td style={{ padding: 12, textAlign: 'right' }}>${vatData.exemptSales?.toFixed(2)}</td>
                <td style={{ padding: 12, textAlign: 'right', color: '#64748b' }}>$0.00</td>
              </tr>
              <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                <td style={{ padding: 12, fontWeight: 700 }}>3</td>
                <td style={{ padding: 12 }}>Credit Notes & Commercial Reversals</td>
                <td style={{ padding: 12, textAlign: 'right', color: '#dc2626' }}>-${vatData.creditNotesTotal?.toFixed(2)}</td>
                <td style={{ padding: 12, textAlign: 'right', color: '#dc2626' }}>-${vatData.creditNotesVat?.toFixed(2)}</td>
              </tr>
              <tr style={{ background: '#f8fafc', fontWeight: 800, borderTop: '2px solid #cbd5e1' }}>
                <td style={{ padding: 12 }}>4</td>
                <td style={{ padding: 12 }}>NET OUTPUT TAX PAYABLE TO ZIMRA</td>
                <td style={{ padding: 12, textAlign: 'right' }}>${vatData.netTaxableSales?.toFixed(2)}</td>
                <td style={{ padding: 12, textAlign: 'right', color: '#16a34a', fontSize: '1.15rem' }}>
                  ${vatData.netVatPayable?.toFixed(2)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      )}

      {/* TAB 2: P2 & NSSA RETURN */}
      {!loading && activeTab === 'p2' && p2Data && (
        <div style={{ background: '#fff', borderRadius: 10, border: '1px solid #e2e8f0', padding: 24 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <div>
              <h3 style={{ margin: 0, fontWeight: 800 }}>ZIMRA Form P2 (PAYE) & NSSA Remittance Schedule</h3>
              <div style={{ color: '#64748b', fontSize: '0.85rem', marginTop: 4 }}>Period: {p2Data.period}</div>
            </div>
            <button
              onClick={() => handleDownloadCsv('p2')}
              style={{
                background: '#16a34a',
                color: '#fff',
                border: 'none',
                borderRadius: 8,
                padding: '8px 16px',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 8
              }}
            >
              <i className="fas fa-file-csv" />
              Download Remittance CSV
            </button>
          </div>

          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.95rem' }}>
            <tbody>
              <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                <td style={{ padding: 12, fontWeight: 600 }}>Total Gross Remuneration (Salaries & Allowances)</td>
                <td style={{ padding: 12, textAlign: 'right', fontWeight: 700 }}>${p2Data.grossSalaries?.toFixed(2)}</td>
              </tr>
              <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                <td style={{ padding: 12, fontWeight: 600 }}>ZIMRA PAYE Tax Withheld (Form P2)</td>
                <td style={{ padding: 12, textAlign: 'right', color: '#0284c7', fontWeight: 700 }}>
                  ${p2Data.payeWithheld?.toFixed(2)}
                </td>
              </tr>
              <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                <td style={{ padding: 12, fontWeight: 600 }}>NSSA Statutory Contributions (Employer 4.5% + Employee 4.5%)</td>
                <td style={{ padding: 12, textAlign: 'right', color: '#0284c7', fontWeight: 700 }}>
                  ${(p2Data.nssaEmployer + p2Data.nssaEmployee).toFixed(2)}
                </td>
              </tr>
              <tr style={{ background: '#f8fafc', fontWeight: 800, borderTop: '2px solid #cbd5e1' }}>
                <td style={{ padding: 12 }}>TOTAL STATUTORY REMITTANCE DUE</td>
                <td style={{ padding: 12, textAlign: 'right', color: '#16a34a', fontSize: '1.2rem' }}>
                  ${p2Data.totalStatutoryDue?.toFixed(2)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      )}

      {/* TAB 3: EMIS DATA EXTRACT */}
      {!loading && activeTab === 'emis' && emisData && (
        <div style={{ background: '#fff', borderRadius: 10, border: '1px solid #e2e8f0', padding: 24 }}>
          <h3 style={{ margin: '0 0 16px 0', fontWeight: 800 }}>Ministry of Primary & Secondary Education EMIS Report</h3>

          {/* Enrolment Matrix */}
          <h4 style={{ margin: '16px 0 8px 0', color: '#334155' }}>1. Enrolment by Form and Gender</h4>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem', marginBottom: 24 }}>
            <thead>
              <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
                <th style={{ padding: 10, textAlign: 'left' }}>Grade / Form</th>
                <th style={{ padding: 10, textAlign: 'center' }}>Male</th>
                <th style={{ padding: 10, textAlign: 'center' }}>Female</th>
                <th style={{ padding: 10, textAlign: 'right' }}>Total Enrolment</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(emisData.formBreakdown || {}).map(([form, counts]: any) => (
                <tr key={form} style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ padding: 10, fontWeight: 600 }}>{form}</td>
                  <td style={{ padding: 10, textAlign: 'center' }}>{counts.male}</td>
                  <td style={{ padding: 10, textAlign: 'center' }}>{counts.female}</td>
                  <td style={{ padding: 10, textAlign: 'right', fontWeight: 700 }}>{counts.total}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Fees Summary */}
          <h4 style={{ margin: '16px 0 8px 0', color: '#334155' }}>2. Fees Billed vs Collected (Annual Ministry Return)</h4>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14 }}>
            <div style={{ background: '#f8fafc', padding: 14, borderRadius: 8, border: '1px solid #e2e8f0' }}>
              <div style={{ fontSize: '0.8rem', color: '#64748b' }}>Total Fees Billed:</div>
              <div style={{ fontSize: '1.2rem', fontWeight: 800 }}>${emisData.feesSummary?.totalBilled?.toFixed(2)}</div>
            </div>
            <div style={{ background: '#f8fafc', padding: 14, borderRadius: 8, border: '1px solid #e2e8f0' }}>
              <div style={{ fontSize: '0.8rem', color: '#64748b' }}>Total Collected:</div>
              <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#16a34a' }}>
                ${emisData.feesSummary?.totalCollected?.toFixed(2)}
              </div>
            </div>
            <div style={{ background: '#f8fafc', padding: 14, borderRadius: 8, border: '1px solid #e2e8f0' }}>
              <div style={{ fontSize: '0.8rem', color: '#64748b' }}>Outstanding Debts:</div>
              <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#dc2626' }}>
                ${emisData.feesSummary?.outstanding?.toFixed(2)}
              </div>
            </div>
            <div style={{ background: '#f8fafc', padding: 14, borderRadius: 8, border: '1px solid #e2e8f0' }}>
              <div style={{ fontSize: '0.8rem', color: '#64748b' }}>Collection Rate:</div>
              <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#0284c7' }}>
                {emisData.feesSummary?.collectionRatePercent}%
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: STUDENT CLEARANCE */}
      {!loading && activeTab === 'clearance' && (
        <div style={{ background: '#fff', borderRadius: 10, border: '1px solid #e2e8f0', padding: 24 }}>
          <h3 style={{ margin: '0 0 16px 0', fontWeight: 800 }}>Student Transfer & Leaving Clearance Checklist</h3>
          <form onSubmit={handleCheckClearance} style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
            <input
              type="text"
              placeholder="Enter Student ID or Registration #"
              value={studentSearchId}
              onChange={e => setStudentSearchId(e.target.value)}
              style={{ flex: 1, padding: '10px 14px', borderRadius: 8, border: '1px solid #cbd5e1' }}
            />
            <button
              type="submit"
              style={{ background: '#0284c7', color: '#fff', border: 'none', borderRadius: 8, padding: '10px 20px', fontWeight: 600 }}
            >
              Verify Clearance
            </button>
          </form>

          {clearanceData && (
            <div style={{ border: '1px solid #e2e8f0', borderRadius: 8, padding: 20 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <div>
                  <h4 style={{ margin: 0, fontSize: '1.1rem' }}>
                    {clearanceData.clearance?.student?.name} ({clearanceData.clearance?.student?.studentId})
                  </h4>
                  <span style={{ fontSize: '0.85rem', color: '#64748b' }}>Form / Class: {clearanceData.clearance?.student?.grade}</span>
                </div>
                <span
                  style={{
                    padding: '4px 12px',
                    borderRadius: 999,
                    fontSize: '0.8rem',
                    fontWeight: 700,
                    background: clearanceData.clearance?.status === 'APPROVED' ? '#dcfce7' : '#fee2e2',
                    color: clearanceData.clearance?.status === 'APPROVED' ? '#166534' : '#991b1b'
                  }}
                >
                  {clearanceData.clearance?.status}
                </span>
              </div>

              {/* Checklist items */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {/* Library */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: 12, background: '#f8fafc', borderRadius: 6 }}>
                  <div>
                    <strong>Library Sign-Off:</strong>{' '}
                    {clearanceData.checks?.library?.cleared ? (
                      <span style={{ color: '#16a34a' }}>No outstanding books</span>
                    ) : (
                      <span style={{ color: '#dc2626' }}>{clearanceData.checks?.library?.unreturnedBooksCount} unreturned book(s)</span>
                    )}
                  </div>
                  {!clearanceData.checks?.library?.cleared && (
                    <button
                      onClick={() => handleSignoff('LIBRARY')}
                      style={{ background: '#16a34a', color: '#fff', border: 'none', padding: '6px 12px', borderRadius: 6, fontSize: '0.8rem', cursor: 'pointer' }}
                    >
                      Authorize Library Sign-off
                    </button>
                  )}
                </div>

                {/* Fees */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: 12, background: '#f8fafc', borderRadius: 6 }}>
                  <div>
                    <strong>Fees / Finance Sign-Off:</strong>{' '}
                    {clearanceData.checks?.fees?.cleared ? (
                      <span style={{ color: '#16a34a' }}>Account clear ($0.00 balance)</span>
                    ) : (
                      <span style={{ color: '#dc2626' }}>Outstanding balance: ${clearanceData.checks?.fees?.balance?.toFixed(2)}</span>
                    )}
                  </div>
                  {!clearanceData.checks?.fees?.cleared && (
                    <button
                      onClick={() => handleSignoff('FEES')}
                      style={{ background: '#16a34a', color: '#fff', border: 'none', padding: '6px 12px', borderRadius: 6, fontSize: '0.8rem', cursor: 'pointer' }}
                    >
                      Authorize Bursar Exception
                    </button>
                  )}
                </div>

                {/* Hostel */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: 12, background: '#f8fafc', borderRadius: 6 }}>
                  <div>
                    <strong>Hostel & Kit Sign-Off:</strong>{' '}
                    {clearanceData.checks?.hostel?.cleared ? (
                      <span style={{ color: '#16a34a' }}>Hostel room & kit returned</span>
                    ) : (
                      <span style={{ color: '#ea580c' }}>Pending Matron check</span>
                    )}
                  </div>
                  {!clearanceData.checks?.hostel?.cleared && (
                    <button
                      onClick={() => handleSignoff('HOSTEL')}
                      style={{ background: '#16a34a', color: '#fff', border: 'none', padding: '6px 12px', borderRadius: 6, fontSize: '0.8rem', cursor: 'pointer' }}
                    >
                      Sign-off Hostel
                    </button>
                  )}
                </div>

                {/* Final Signoff */}
                <div style={{ marginTop: 12, textAlign: 'right' }}>
                  <button
                    onClick={() => handleSignoff('FINAL')}
                    disabled={clearanceData.clearance?.status === 'APPROVED'}
                    style={{
                      background: clearanceData.clearance?.status === 'APPROVED' ? '#94a3b8' : '#0284c7',
                      color: '#fff',
                      border: 'none',
                      padding: '10px 20px',
                      borderRadius: 8,
                      fontWeight: 700,
                      cursor: clearanceData.clearance?.status === 'APPROVED' ? 'default' : 'pointer'
                    }}
                  >
                    {clearanceData.clearance?.status === 'APPROVED'
                      ? `Clearance Issued (${clearanceData.clearance?.certificateNo})`
                      : 'Issue Final Clearance Certificate'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
