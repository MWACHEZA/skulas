import React, { useRef, useState, useEffect } from 'react';
import api from '../../lib/api';

export interface ReceiptLineItem {
  desc?: string;
  description?: string;
  amount: number;
}

export interface ReceiptModalData {
  receiptNo: string;
  date?: string | Date;
  timestamp?: string;
  studentName: string;
  studentId?: string;
  className?: string;
  form?: string;
  paymentMode?: string;
  method?: string;
  amount?: number;
  amountPaid?: number;
  currency?: string;
  currencySymbol?: string;
  reference?: string;
  recordedBy?: string;
  cashierName?: string;
  items?: ReceiptLineItem[];
  feeItems?: ReceiptLineItem[];
  previousBalance?: number;
  newBalance?: number;
  baseUSD?: number;
  fiscalReceiptNumber?: string;
  fiscalSignature?: string;
  smsSent?: boolean;
  status?: string;
}

export interface ReceiptTemplateConfig {
  receiptDesign?: string;
  primaryColor?: string;
  showLogo?: boolean;
  showBalanceOnReceipts?: boolean;
  showStamp?: boolean;
  enableQR?: boolean;
  footerText?: string;
  [key: string]: unknown;
}

export interface ReceiptSchoolInfo {
  name?: string;
  address?: string;
  email?: string;
  phone?: string;
  logo?: string;
  branding?: {
    logo?: string;
    primaryColor?: string;
    accentColor?: string;
  } | null;
  [key: string]: unknown;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  data: ReceiptModalData | null;
  templateConfig?: ReceiptTemplateConfig | null;
  school?: ReceiptSchoolInfo | null;
}

const RECEIPT_THEMES: Record<string, { color: string; accent: string; border: string }> = {
  'clean-white': { color: '#0f172a', accent: '#f8fafc', border: '#e2e8f0' },
  'blue-corporate': { color: '#1e3a8a', accent: '#eff6ff', border: '#bfdbfe' },
  'green-eco': { color: '#14532d', accent: '#f0fdf4', border: '#bbf7d0' },
  'dark-premium': { color: '#0f172a', accent: '#fef3c7', border: '#fde68a' },
  'maroon-classic': { color: '#7c2d12', accent: '#fef9c3', border: '#fef08a' },
  'purple-modern': { color: '#4c1d95', accent: '#ede9fe', border: '#ddd6fe' },
};

export default function ReceiptModal({
  isOpen,
  onClose,
  data,
  templateConfig: propConfig,
  school: propSchool
}: Props) {
  const printAreaRef = useRef<HTMLDivElement>(null);
  const [fetchedConfig, setFetchedConfig] = useState<ReceiptTemplateConfig | null>(null);
  const [fetchedSchool, setFetchedSchool] = useState<ReceiptSchoolInfo | null>(null);
  const [printLayout, setPrintLayout] = useState<'standard' | 'thermal'>('standard');

  const templateConfig = propConfig ?? fetchedConfig;
  const school = propSchool ?? fetchedSchool;

  useEffect(() => {
    if (!propConfig) {
      api.get('/api/reports/template')
        .then((res: { data?: { config?: ReceiptTemplateConfig; school?: ReceiptSchoolInfo } }) => {
          if (res.data?.config) setFetchedConfig(res.data.config);
          if (res.data?.school && !propSchool) setFetchedSchool(res.data.school);
        })
        .catch(() => {});
    }
  }, [propConfig, propSchool]);

  useEffect(() => {
    if (!propSchool && !fetchedSchool) {
      api.get('/api/schools/me')
        .then((res: { data?: ReceiptSchoolInfo }) => {
          if (res.data) setFetchedSchool(res.data);
        })
        .catch(() => {});
    }
  }, [propSchool, fetchedSchool]);

  if (!isOpen || !data) return null;

  const activeThemeId = templateConfig?.receiptDesign || 'clean-white';
  const theme = RECEIPT_THEMES[activeThemeId] || RECEIPT_THEMES['clean-white'];
  const primaryCol = templateConfig?.primaryColor || theme.color;
  const accentCol = theme.accent;
  const borderCol = theme.border;

  const schoolName = school?.name || 'Lobengula Primary School';
  const schoolAddress = school?.address || 'P.O. Box 42, Bulawayo, Zimbabwe';
  const schoolEmail = school?.email || 'bursar@school.edu';
  const schoolPhone = school?.phone || '+263 292 123456';
  const logoUrl = school?.branding?.logo
    ? `/api/storage/file/${school.branding.logo}`
    : school?.logo
    ? `/api/storage/file/${school.logo}`
    : null;

  const receiptNumber = data.receiptNo || 'REC-OFFICIAL';
  const formattedDate = data.date
    ? new Date(data.date).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
    : data.timestamp || new Date().toLocaleDateString();
  const studentName = data.studentName || 'Student';
  const studentClass = data.className || data.form || 'Class N/A';
  const paymentMethod = data.paymentMode || data.method || 'Cash Office';
  const reference = data.reference || 'COUNTER-RECEIPT';
  const currencySymbol = data.currencySymbol || (data.currency === 'ZIG' ? 'ZiG ' : '$');
  const amountPaid = typeof data.amountPaid === 'number'
    ? data.amountPaid
    : typeof data.amount === 'number'
    ? data.amount
    : 0;

  const lineItems: ReceiptLineItem[] = (data.feeItems && data.feeItems.length > 0)
    ? data.feeItems
    : (data.items && data.items.length > 0)
    ? data.items
    : [{ desc: reference && reference !== 'COUNTER-RECEIPT' ? `School Fees [${reference}]` : 'Tuition & Academic Fees Payment', amount: amountPaid }];

  const handlePrint = () => {
    window.print();
  };

  return (
    <div
      className="portal-modal-overlay"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.72)',
        backdropFilter: 'blur(5px)',
        zIndex: 99999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px'
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      {/* Print-specific style sheet */}
      <style>{`
        @media print {
          body * {
            visibility: hidden !important;
          }
          #official-receipt-print-area, #official-receipt-print-area * {
            visibility: visible !important;
          }
          #official-receipt-print-area {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            max-width: ${printLayout === 'thermal' ? '80mm' : '800px'} !important;
            margin: 0 auto !important;
            padding: ${printLayout === 'thermal' ? '10px' : '24px'} !important;
            box-shadow: none !important;
            border: none !important;
          }
          .no-print {
            display: none !important;
          }
        }
      `}</style>

      <div
        className="portal-modal-card"
        style={{
          background: '#ffffff',
          borderRadius: 16,
          maxWidth: printLayout === 'thermal' ? 440 : 760,
          width: '100%',
          maxHeight: '94vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
          overflow: 'hidden',
          transition: 'max-width 0.25s ease'
        }}
      >
        {/* Modal Top Bar (Screen Only) */}
        <div
          className="no-print"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '16px 24px',
            borderBottom: '1px solid #e2e8f0',
            background: '#f8fafc'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: 8,
                background: primaryCol,
                color: '#fff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '1rem'
              }}
            >
              <i className="fas fa-receipt"></i>
            </div>
            <div>
              <h2 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, color: '#0f172a' }}>
                Official Payment Receipt
              </h2>
              <span style={{ fontSize: '0.8rem', color: '#64748b' }}>
                Ref: {receiptNumber}
              </span>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {/* Format toggle: Standard Voucher vs Thermal Slip */}
            <div
              style={{
                display: 'inline-flex',
                background: '#e2e8f0',
                borderRadius: 8,
                padding: 2,
                fontSize: '0.75rem',
                fontWeight: 700
              }}
            >
              <button
                type="button"
                onClick={() => setPrintLayout('standard')}
                style={{
                  border: 'none',
                  padding: '4px 10px',
                  borderRadius: 6,
                  cursor: 'pointer',
                  background: printLayout === 'standard' ? '#ffffff' : 'transparent',
                  color: printLayout === 'standard' ? '#0f172a' : '#64748b',
                  boxShadow: printLayout === 'standard' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                  transition: 'all 0.15s'
                }}
              >
                <i className="fas fa-file-invoice mr-1"></i> A4 Voucher
              </button>
              <button
                type="button"
                onClick={() => setPrintLayout('thermal')}
                style={{
                  border: 'none',
                  padding: '4px 10px',
                  borderRadius: 6,
                  cursor: 'pointer',
                  background: printLayout === 'thermal' ? '#ffffff' : 'transparent',
                  color: printLayout === 'thermal' ? '#0f172a' : '#64748b',
                  boxShadow: printLayout === 'thermal' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                  transition: 'all 0.15s'
                }}
              >
                <i className="fas fa-print mr-1"></i> 80mm Slip
              </button>
            </div>

            <button
              onClick={onClose}
              style={{
                border: 'none',
                background: 'transparent',
                width: 32,
                height: 32,
                borderRadius: 8,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#64748b',
                fontSize: '1.2rem'
              }}
              title="Close"
            >
              &times;
            </button>
          </div>
        </div>

        {/* Modal Scrollable Body */}
        <div style={{ padding: '24px', overflowY: 'auto', background: '#f1f5f9', flex: 1 }}>
          {/* Printable Receipt Paper */}
          <div
            id="official-receipt-print-area"
            ref={printAreaRef}
            style={{
              width: '100%',
              maxWidth: printLayout === 'thermal' ? 380 : 700,
              margin: '0 auto',
              background: '#ffffff',
              borderRadius: printLayout === 'thermal' ? 6 : 12,
              overflow: 'hidden',
              boxShadow: '0 4px 20px rgba(0, 0, 0, 0.08)',
              border: `1px solid ${borderCol}`,
              fontFamily: printLayout === 'thermal' ? "'Courier New', Courier, monospace" : 'inherit'
            }}
          >
            {/* ── HEADER ── */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: printLayout === 'thermal' ? '16px 16px 12px' : '28px 32px',
                borderBottom: `2px solid ${borderCol}`,
                background: printLayout === 'thermal' ? '#fafafa' : '#ffffff'
              }}
            >
              <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
                {logoUrl && templateConfig?.showLogo !== false ? (
                  <img
                    src={logoUrl}
                    alt={schoolName}
                    style={{
                      width: printLayout === 'thermal' ? 44 : 58,
                      height: printLayout === 'thermal' ? 44 : 58,
                      objectFit: 'contain'
                    }}
                  />
                ) : (
                  <div
                    style={{
                      width: printLayout === 'thermal' ? 44 : 58,
                      height: printLayout === 'thermal' ? 44 : 58,
                      borderRadius: 12,
                      background: primaryCol,
                      color: '#ffffff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: printLayout === 'thermal' ? '1.2rem' : '1.6rem',
                      boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                    }}
                  >
                    <i className="fas fa-university"></i>
                  </div>
                )}
                <div>
                  <div style={{ color: primaryCol, fontWeight: 900, fontSize: printLayout === 'thermal' ? '1.05rem' : '1.35rem', lineHeight: 1.2 }}>
                    {schoolName}
                  </div>
                  <div style={{ color: '#64748b', fontSize: '0.8rem', marginTop: 3 }}>
                    {schoolAddress}
                  </div>
                  <div style={{ color: '#64748b', fontSize: '0.78rem' }}>
                    {schoolEmail} • {schoolPhone}
                  </div>
                </div>
              </div>

              <div style={{ textAlign: 'right' }}>
                <div
                  style={{
                    color: primaryCol,
                    fontWeight: 900,
                    fontSize: printLayout === 'thermal' ? '1.2rem' : '1.6rem',
                    letterSpacing: '0.05em',
                    textTransform: 'uppercase'
                  }}
                >
                  RECEIPT
                </div>
                <div
                  style={{
                    display: 'inline-block',
                    marginTop: 6,
                    padding: '3px 10px',
                    borderRadius: 20,
                    background: '#dcfce7',
                    color: '#15803d',
                    fontWeight: 800,
                    fontSize: '0.75rem',
                    border: '1px solid #bbf7d0'
                  }}
                >
                  <i className="fas fa-check-circle mr-1"></i> VERIFIED PAID
                </div>
              </div>
            </div>

            {/* ── METADATA STRIP ── */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: printLayout === 'thermal' ? '1fr' : '1.2fr 1fr',
                gap: 12,
                padding: printLayout === 'thermal' ? '14px 16px' : '18px 32px',
                background: accentCol,
                borderBottom: `1px solid ${borderCol}`
              }}
            >
              <div>
                <div style={{ fontSize: '0.72rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Received From / Student
                </div>
                <div style={{ fontWeight: 800, color: '#0f172a', fontSize: '1.05rem', marginTop: 3 }}>
                  {studentName}
                </div>
                <div style={{ fontSize: '0.82rem', color: '#475569', marginTop: 2, display: 'flex', gap: 12 }}>
                  <span>Class: <strong>{studentClass}</strong></span>
                  {data.studentId && <span>ID: <strong style={{ fontFamily: 'monospace' }}>{data.studentId}</strong></span>}
                </div>
              </div>

              <div style={{ textAlign: printLayout === 'thermal' ? 'left' : 'right' }}>
                <div style={{ fontSize: '0.82rem', color: '#334155', marginBottom: 3 }}>
                  <span style={{ color: '#64748b', fontWeight: 600 }}>Receipt #: </span>
                  <strong style={{ fontFamily: 'monospace', color: primaryCol }}>{receiptNumber}</strong>
                </div>
                <div style={{ fontSize: '0.82rem', color: '#334155', marginBottom: 3 }}>
                  <span style={{ color: '#64748b', fontWeight: 600 }}>Date: </span>
                  <strong>{formattedDate}</strong>
                </div>
                <div style={{ fontSize: '0.82rem', color: '#334155' }}>
                  <span style={{ color: '#64748b', fontWeight: 600 }}>Channel: </span>
                  <strong>{paymentMethod}</strong> {reference && reference !== 'COUNTER-RECEIPT' ? `(${reference})` : ''}
                </div>
              </div>
            </div>

            {/* ── LINE ITEMS ── */}
            <div style={{ padding: printLayout === 'thermal' ? '14px 16px' : '24px 32px' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
                <thead>
                  <tr style={{ borderBottom: `2px solid ${primaryCol}` }}>
                    <th style={{ textAlign: 'left', padding: '10px 4px', color: primaryCol, fontWeight: 800 }}>Item Description</th>
                    <th style={{ textAlign: 'right', padding: '10px 4px', color: primaryCol, fontWeight: 800 }}>Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {lineItems.map((item, idx) => {
                    const desc = item.desc || item.description || `Fees Allocation #${idx + 1}`;
                    return (
                      <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '12px 4px', color: '#1e293b', fontWeight: 600 }}>
                          {desc}
                        </td>
                        <td style={{ textAlign: 'right', fontWeight: 800, color: '#0f172a', padding: '12px 4px', fontFamily: 'monospace' }}>
                          {currencySymbol}{Number(item.amount || 0).toFixed(2)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              {/* ── TOTALS SECTION ── */}
              <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                <div style={{ width: printLayout === 'thermal' ? '100%' : '320px' }}>
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '12px 14px',
                      background: primaryCol,
                      color: '#ffffff',
                      borderRadius: 8,
                      boxShadow: '0 2px 6px rgba(0,0,0,0.1)'
                    }}
                  >
                    <span style={{ fontWeight: 800, fontSize: '0.92rem', letterSpacing: '0.04em' }}>TOTAL AMOUNT PAID</span>
                    <span style={{ fontWeight: 900, fontSize: '1.4rem', fontFamily: 'monospace' }}>
                      {currencySymbol}{amountPaid.toFixed(2)}
                    </span>
                  </div>

                  {/* Optional Balance Disclosure */}
                  {templateConfig?.showBalanceOnReceipts !== false && typeof data.newBalance === 'number' && (
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        padding: '10px 14px',
                        background: '#f8fafc',
                        border: '1px solid #e2e8f0',
                        borderRadius: 6,
                        marginTop: 8,
                        fontSize: '0.85rem'
                      }}
                    >
                      <span style={{ color: '#64748b', fontWeight: 600 }}>Remaining Balance Due:</span>
                      <span style={{ fontWeight: 800, color: data.newBalance > 0 ? '#dc2626' : '#16a34a', fontFamily: 'monospace' }}>
                        {currencySymbol}{data.newBalance.toFixed(2)}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* ── FISCAL & SECURITY BAR ── */}
              {data.fiscalReceiptNumber && (
                <div
                  style={{
                    marginTop: 16,
                    padding: '10px 14px',
                    borderRadius: 8,
                    background: '#f0fdf4',
                    border: '1px solid #bbf7d0',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    fontSize: '0.78rem'
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 800, color: '#166534' }}>
                      <i className="fas fa-shield-alt mr-1"></i> ZIMRA FDMS FISCAL COMPLIANT
                    </div>
                    <div style={{ color: '#15803d', fontFamily: 'monospace', marginTop: 2 }}>
                      Fiscal Ref: {data.fiscalReceiptNumber}
                    </div>
                  </div>
                  {data.fiscalSignature && (
                    <div style={{ fontSize: '0.68rem', color: '#166534', maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontFamily: 'monospace' }}>
                      Sig: {data.fiscalSignature}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* ── OFFICIAL FOOTER (STAMP, SIGNATURE, QR) ── */}
            <div
              style={{
                padding: printLayout === 'thermal' ? '12px 16px 16px' : '18px 32px 24px',
                background: accentCol,
                borderTop: `1px solid ${borderCol}`,
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-end',
                gap: 16
              }}
            >
              {/* Signature Block */}
              <div style={{ minWidth: 120 }}>
                <div style={{ width: 140, height: 1, background: '#94a3b8', marginBottom: 6 }}></div>
                <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b' }}>
                  {data.recordedBy || data.cashierName || 'Bursar / Cashier Signature'}
                </div>
                <div style={{ fontSize: '0.68rem', color: '#94a3b8' }}>Authorized Signatory</div>
              </div>

              {/* Official Stamp */}
              {templateConfig?.showStamp !== false && (
                <div
                  style={{
                    width: 72,
                    height: 72,
                    border: `2px double ${primaryCol}`,
                    borderRadius: '50%',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: primaryCol,
                    transform: 'rotate(-10deg)',
                    opacity: 0.85,
                    userSelect: 'none',
                    textAlign: 'center',
                    padding: 2
                  }}
                >
                  <span style={{ fontSize: '0.45rem', fontWeight: 900, letterSpacing: '0.08em' }}>OFFICIAL</span>
                  <span style={{ fontSize: '0.55rem', fontWeight: 900 }}>BURSAR</span>
                  <span style={{ fontSize: '0.45rem', fontWeight: 800 }}>SEAL</span>
                </div>
              )}

              {/* QR Code */}
              {templateConfig?.enableQR !== false && (
                <div style={{ textAlign: 'center' }}>
                  <div
                    style={{
                      width: 52,
                      height: 52,
                      background: '#ffffff',
                      borderRadius: 8,
                      border: '1px solid #cbd5e1',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
                    }}
                  >
                    <i className="fas fa-qrcode" style={{ color: primaryCol, fontSize: '36px' }}></i>
                  </div>
                  <div style={{ fontSize: '0.6rem', color: '#64748b', marginTop: 3 }}>
                    Scan to Verify
                  </div>
                </div>
              )}
            </div>

            {/* Disclaimer line */}
            <div
              style={{
                textAlign: 'center',
                fontSize: '0.68rem',
                color: '#64748b',
                padding: '8px 24px',
                background: '#ffffff',
                borderTop: '1px solid #f1f5f9',
                fontStyle: 'italic'
              }}
            >
              {templateConfig?.footerText || 'Official Computer Generated Payment Receipt • Retain for your accounting records.'}
            </div>
          </div>
        </div>

        {/* Modal Bottom Actions (Screen Only) */}
        <div
          className="no-print"
          style={{
            padding: '16px 24px',
            borderTop: '1px solid #e2e8f0',
            background: '#ffffff',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}
        >
          <div style={{ fontSize: '0.82rem', color: '#64748b', display: 'flex', alignItems: 'center', gap: 6 }}>
            <i className="fas fa-palette" style={{ color: primaryCol }}></i>
            <span>Theme: <strong>{activeThemeId}</strong></span>
          </div>

          <div style={{ display: 'flex', gap: 12 }}>
            <button
              type="button"
              className="portal-btn-ghost"
              onClick={onClose}
              style={{
                padding: '10px 18px',
                borderRadius: 8,
                border: '1px solid #cbd5e1',
                background: '#ffffff',
                fontWeight: 600,
                fontSize: '0.9rem',
                cursor: 'pointer'
              }}
            >
              Close
            </button>
            <button
              type="button"
              className="portal-btn-primary"
              onClick={handlePrint}
              style={{
                padding: '10px 24px',
                borderRadius: 8,
                background: primaryCol,
                color: '#ffffff',
                border: 'none',
                fontWeight: 800,
                fontSize: '0.92rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                boxShadow: '0 2px 6px rgba(0,0,0,0.15)'
              }}
            >
              <i className="fas fa-print"></i> PRINT RECEIPT
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
