import React from 'react';

interface Props {
  title: string;
  reportType: string;
  filters: any;
  data: any;
  template: any;
  visualizations?: React.ReactNode;
  columns?: { label: string; key: string; align?: string; format?: (v: any, row?: any) => string }[];
}

const InstitutionalReportDocument: React.FC<Props> = ({ title, reportType, filters, data, template, columns, visualizations }) => {
  const primaryColor = template?.config?.primaryColor || '#2563eb';
  const school = template?.school;
  const signatureUrl = template?.signatureUrl;

  const rows = Array.isArray(data) ? data : (data?.records || data?.list || data?.breakdown || data?.detailed || []);

  const infoLabel: React.CSSProperties = {
    fontSize: '0.58rem', fontWeight: 700, color: '#94a3b8',
    textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '2px'
  };
  const infoValue: React.CSSProperties = {
    fontSize: '0.82rem', fontWeight: 600, color: '#1e293b'
  };
  const sectionTitle: React.CSSProperties = {
    fontSize: '0.65rem', fontWeight: 800, color: primaryColor,
    textTransform: 'uppercase', letterSpacing: '0.08em',
    borderBottom: `2px solid ${primaryColor}`,
    paddingBottom: '4px', marginBottom: '10px', marginTop: '20px'
  };

  // Derive summary stats for the strip
  const summaryStats = (() => {
    if (!rows.length) return [];
    const totalAmount = rows.reduce((s: number, r: any) =>
      s + (r.amount || r.totalBalance || r.outstanding || r.paid || r.totalNet || 0), 0);
    const totalBalance = rows.reduce((s: number, r: any) =>
      s + (r.balance || r.collectible || 0), 0);
    const totalPaid = rows.reduce((s: number, r: any) =>
      s + (r.paid || r.amount || 0), 0);

    switch (reportType) {
      case 'student-balances':
      case 'single-fee-group':
      case 'balances-summary':
        return [
          { label: 'TOTAL RECORDS', value: rows.length.toString() },
          { label: 'TOTAL PAID', value: `$${totalPaid.toLocaleString()}` },
          { label: 'OUTSTANDING', value: `$${totalBalance.toLocaleString()}` },
          { label: 'REPORT YEAR', value: filters?.year || new Date().getFullYear().toString() }
        ];
      case 'student-debtors':
        return [
          { label: 'TOTAL DEBTORS', value: rows.length.toString() },
          { label: 'TOTAL OUTSTANDING', value: `$${totalAmount.toLocaleString()}` },
          { label: 'REPORT YEAR', value: filters?.year || new Date().getFullYear().toString() }
        ];
      case 'fees-takings':
      case 'fees-payments':
      case 'payments-analytics':
        return [
          { label: 'TRANSACTIONS', value: rows.length.toString() },
          { label: 'TOTAL COLLECTED', value: `$${totalAmount.toLocaleString()}` },
          { label: 'PERIOD', value: `${filters?.from || '—'} to ${filters?.to || '—'}` }
        ];
      case 'payroll-runs':
      case 'employee-payslips':
        return [
          { label: 'RECORDS', value: rows.length.toString() },
          { label: 'TOTAL NET', value: `$${totalAmount.toLocaleString()}` }
        ];
      case 'profit-loss':
        return [
          { label: 'INCOME', value: `$${(data?.summary?.totalIncome || 0).toLocaleString()}` },
          { label: 'EXPENSES', value: `$${(data?.summary?.totalExpenses || 0).toLocaleString()}` },
          { label: 'NET PROFIT', value: `$${(data?.summary?.netProfit || 0).toLocaleString()}` }
        ];
      default:
        return [{ label: 'TOTAL RECORDS', value: rows.length.toString() }];
    }
  })();

  return (
    <div
      id="institutional-report-doc"
      style={{
        padding: '36px 40px',
        background: 'white',
        color: '#1e293b',
        fontFamily: "'Inter', 'Segoe UI', system-ui, sans-serif",
        width: '794px',
        margin: '0 auto',
        minHeight: '1123px',
        position: 'relative',
        boxSizing: 'border-box',
        fontSize: '13px'
      }}
    >
      {/* ══ HEADER ══ */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        borderBottom: `4px solid ${primaryColor}`, paddingBottom: '18px', marginBottom: '20px'
      }}>
        {/* Logo */}
        <div style={{ width: '72px', height: '72px', flexShrink: 0 }}>
          {school?.logoUrl ? (
            <img src={school.logoUrl} alt="Logo" style={{ width: '100%', height: '100%', objectFit: 'contain' }} crossOrigin="anonymous" />
          ) : (
            <div style={{
              width: '72px', height: '72px', borderRadius: '50%',
              background: `${primaryColor}18`, border: `2px solid ${primaryColor}30`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '1.5rem', color: primaryColor, fontWeight: 800
            }}>
              {(school?.name || 'S').charAt(0).toUpperCase()}
            </div>
          )}
        </div>

        {/* Center: school name */}
        <div style={{ textAlign: 'center', flex: 1, padding: '0 20px' }}>
          <div style={{ fontSize: '1.25rem', fontWeight: 900, color: primaryColor }}>
            {school?.name || 'ACADEX HIGH SCHOOL'}
          </div>
          {school?.address && <div style={{ fontSize: '0.7rem', color: '#64748b', marginTop: '2px' }}>{school.address}</div>}
          {school?.motto && <div style={{ fontSize: '0.7rem', fontStyle: 'italic', color: '#94a3b8', marginTop: '2px' }}>"{school.motto}"</div>}
          {(school?.phone || school?.email) && (
            <div style={{ fontSize: '0.65rem', color: '#94a3b8', marginTop: '2px' }}>
              {[school?.phone, school?.email].filter(Boolean).join('  ·  ')}
            </div>
          )}
        </div>

        {/* Right: report meta */}
        <div style={{ textAlign: 'right', flexShrink: 0 }}>
          <div style={{
            fontSize: '0.75rem', fontWeight: 800, color: primaryColor,
            background: `${primaryColor}12`, padding: '4px 12px',
            borderRadius: '20px', display: 'inline-block', marginBottom: '6px'
          }}>
            {title.toUpperCase()}
          </div>
          <div style={{ fontSize: '0.7rem', color: '#64748b' }}>Academic Year {filters?.year || new Date().getFullYear()}</div>
          <div style={{ fontSize: '0.65rem', color: '#94a3b8', marginTop: '2px' }}>
            Issued: {new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' })}
          </div>
        </div>
      </div>

      {/* ══ SUMMARY STRIP ══ */}
      {summaryStats.length > 0 && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: `repeat(${summaryStats.length}, 1fr)`,
          gap: '10px',
          background: `${primaryColor}06`,
          border: `1px solid ${primaryColor}20`,
          borderRadius: '10px',
          padding: '14px 16px',
          marginBottom: '18px'
        }}>
          {summaryStats.map((s, i) => (
            <div key={i} style={{ textAlign: 'center' }}>
              <div style={infoLabel}>{s.label}</div>
              <div style={{ ...infoValue, fontSize: '1rem', color: primaryColor }}>{s.value}</div>
            </div>
          ))}
        </div>
      )}

      {visualizations && <div style={{ marginBottom: '32px' }}>{visualizations}</div>}

      {/* ══ DATA TABLE ══ */}
      <div style={sectionTitle}>Report Data</div>

      {columns && columns.length > 0 ? (
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.79rem' }}>
          <thead>
            <tr style={{ background: primaryColor, color: 'white' }}>
              {columns.map((col, i) => (
                <th key={i} style={{
                  padding: '9px 10px',
                  textAlign: (col.align as any) || 'left',
                  fontWeight: 700,
                  borderRadius: i === 0 ? '6px 0 0 6px' : i === columns.length - 1 ? '0 6px 6px 0' : undefined
                }}>
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={columns.length} style={{ textAlign: 'center', padding: '30px', color: '#94a3b8' }}>
                  No records found.
                </td>
              </tr>
            ) : (
              rows.map((row: any, idx: number) => (
                <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9', background: idx % 2 === 0 ? 'white' : '#fafbfc' }}>
                  {columns.map((col, ci) => {
                    const val = col.key.split('.').reduce((o: any, k: string) => o?.[k], row);
                    const formatted = col.format ? col.format(val, row) : (val ?? '—');
                    return (
                      <td key={ci} style={{ padding: '8px 10px', textAlign: (col.align as any) || 'left' }}>
                        {formatted}
                      </td>
                    );
                  })}
                </tr>
              ))
            )}
          </tbody>
        </table>
      ) : (
        <div style={{ color: '#94a3b8', textAlign: 'center', padding: '30px' }}>No data available.</div>
      )}

      {/* ══ FOOTER ══ */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end',
        marginTop: '32px', paddingTop: '16px', borderTop: `2px solid ${primaryColor}20`
      }}>
        <div style={{ flex: 1, maxWidth: '60%' }}>
          <div style={{ fontSize: '0.65rem', fontWeight: 800, color: primaryColor, textTransform: 'uppercase', marginBottom: '6px' }}>
            OFFICIAL REMARKS
          </div>
          <p style={{ fontSize: '0.72rem', color: '#64748b', lineHeight: 1.6, margin: 0 }}>
            This is a digitally generated report from the Acadex School Management System.
            The information contained herein is verified and authentic as of the date of issue.
            Any alterations render this document invalid.
          </p>
        </div>
        <div style={{ textAlign: 'center', minWidth: '180px' }}>
          <div style={{ height: '55px', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', marginBottom: '6px' }}>
            {signatureUrl ? (
              <img src={signatureUrl} alt="Signature" style={{ maxWidth: '150px', maxHeight: '50px', objectFit: 'contain' }} crossOrigin="anonymous" />
            ) : (
              <div style={{ borderBottom: '1px dashed #cbd5e0', width: '150px' }} />
            )}
          </div>
          <div style={{ fontWeight: 700, fontSize: '0.78rem', borderTop: '1px solid #e2e8f0', paddingTop: '6px' }}>
            Authorized Signatory
          </div>
          <div style={{ fontSize: '0.65rem', color: '#94a3b8' }}>
            {school?.name || 'School'} — Official Seal
          </div>
        </div>
      </div>

      {/* ══ BOTTOM BAR ══ */}
      <div style={{
        marginTop: '12px', paddingTop: '8px', borderTop: '1px solid #f1f5f9',
        display: 'flex', justifyContent: 'space-between', fontSize: '0.6rem', color: '#94a3b8'
      }}>
        <div>ACADEX SCHOOL MANAGEMENT SYSTEM — VERIFIED DOCUMENT</div>
        <div>{school?.name || 'School'} · {filters?.year || new Date().getFullYear()} · {new Date().toLocaleDateString()}</div>
      </div>
    </div>
  );
};

export default InstitutionalReportDocument;

