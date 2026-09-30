import React, { useRef } from 'react';

export interface FiscalReceiptLine {
  name: string;
  quantity: number;
  unitPrice: number;
  totalAmount: number;
  taxCode?: string; // 'A' or 'E'
}

export interface FiscalReceiptData {
  schoolName: string;
  vatNumber?: string;
  receiptNo: string;
  fiscalCode?: string;
  fiscalDayNo?: number;
  qrCode?: string;
  deviceSerial?: string;
  date: string;
  paymentMethod: string;
  currency?: string;
  items: FiscalReceiptLine[];
  grossTotal: number;
  vatTotal: number;
  isCreditNote?: boolean;
  originalFiscalCode?: string;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  data: FiscalReceiptData | null;
}

export default function FiscalReceiptModal({ isOpen, onClose, data }: Props) {
  const receiptRef = useRef<HTMLDivElement>(null);

  if (!isOpen || !data) return null;

  const handlePrint = () => {
    if (!receiptRef.current) return;
    const printContents = receiptRef.current.innerHTML;
    const printWindow = window.open('', '_blank', 'width=400,height=600');
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head>
            <title>${data.isCreditNote ? 'Fiscal Credit Note' : 'Fiscal Tax Invoice'} - ${data.receiptNo}</title>
            <style>
              @page { margin: 5mm; size: 80mm auto; }
              body { font-family: 'Courier New', monospace; font-size: 12px; margin: 0; padding: 10px; color: #000; }
              .center { text-align: center; }
              .right { text-align: right; }
              .bold { font-weight: bold; }
              .divider { border-top: 1px dashed #000; margin: 6px 0; }
              .flex-between { display: flex; justify-content: space-between; }
              table { width: 100%; border-collapse: collapse; margin: 6px 0; }
              th, td { text-align: left; padding: 2px 0; font-size: 11px; }
              .qr-box { text-align: center; margin: 10px 0; }
            </style>
          </head>
          <body>
            ${printContents}
            <script>
              window.onload = function() { window.print(); window.close(); }
            </script>
          </body>
        </html>
      `);
      printWindow.document.close();
    }
  };

  const currency = data.currency || 'USD';
  const netAmount = Math.max(0, data.grossTotal - data.vatTotal);

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.6)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
        padding: 16
      }}
    >
      <div
        style={{
          background: '#fff',
          borderRadius: 12,
          maxWidth: 420,
          width: '100%',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2)'
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '16px 20px',
            borderBottom: '1px solid #e2e8f0',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <i className="fas fa-receipt" style={{ color: '#0284c7', fontSize: '1.2rem' }} />
            <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700 }}>
              {data.isCreditNote ? 'Fiscal Credit Note' : 'ZIMRA Fiscal Receipt'}
            </h3>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              fontSize: '1.2rem',
              cursor: 'pointer',
              color: '#64748b'
            }}
          >
            &times;
          </button>
        </div>

        {/* Printable Receipt Preview */}
        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: 20,
            background: '#f8fafc',
            display: 'flex',
            justifyContent: 'center'
          }}
        >
          <div
            ref={receiptRef}
            style={{
              background: '#fff',
              border: '1px solid #cbd5e1',
              borderRadius: 4,
              padding: '16px 14px',
              width: '100%',
              maxWidth: 320,
              fontFamily: '"Courier New", Courier, monospace',
              fontSize: 12,
              lineHeight: 1.4,
              color: '#0f172a'
            }}
          >
            {/* Business Header */}
            <div style={{ textAlign: 'center', marginBottom: 6 }}>
              <div style={{ fontWeight: 800, fontSize: 14 }}>{data.schoolName.toUpperCase()}</div>
              <div>ZIMRA REGISTERED OPERATOR</div>
              {data.vatNumber && <div>VAT TIN: {data.vatNumber}</div>}
              {data.deviceSerial && <div>DEVICE: {data.deviceSerial}</div>}
            </div>

            <div style={{ borderTop: '1px dashed #000', margin: '6px 0' }} />

            <div style={{ textAlign: 'center', fontWeight: 800, fontSize: 13, margin: '4px 0' }}>
              {data.isCreditNote ? '*** FISCAL CREDIT NOTE ***' : '*** FISCAL TAX INVOICE ***'}
            </div>

            <div style={{ borderTop: '1px dashed #000', margin: '6px 0' }} />

            {/* Receipt Meta */}
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>DOC NO:</span>
              <span style={{ fontWeight: 'bold' }}>{data.receiptNo}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>DATE/TIME:</span>
              <span>{data.date}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>PAY METHOD:</span>
              <span style={{ fontWeight: 'bold' }}>{data.paymentMethod}</span>
            </div>
            {data.fiscalDayNo && (
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>FISCAL DAY:</span>
                <span>#{data.fiscalDayNo}</span>
              </div>
            )}
            {data.originalFiscalCode && (
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10 }}>
                <span>ORIG FISCAL:</span>
                <span>{data.originalFiscalCode}</span>
              </div>
            )}

            <div style={{ borderTop: '1px dashed #000', margin: '6px 0' }} />

            {/* Items Table */}
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #000' }}>
                  <th style={{ textAlign: 'left', fontSize: 10 }}>DESC</th>
                  <th style={{ textAlign: 'center', fontSize: 10 }}>QTY</th>
                  <th style={{ textAlign: 'right', fontSize: 10 }}>TOTAL</th>
                  <th style={{ textAlign: 'right', fontSize: 10, width: 20 }}>TX</th>
                </tr>
              </thead>
              <tbody>
                {data.items.map((it, idx) => (
                  <tr key={idx}>
                    <td style={{ fontSize: 11 }}>{it.name}</td>
                    <td style={{ textAlign: 'center', fontSize: 11 }}>{it.quantity}</td>
                    <td style={{ textAlign: 'right', fontSize: 11 }}>
                      {it.totalAmount.toFixed(2)}
                    </td>
                    <td style={{ textAlign: 'right', fontSize: 10 }}>{it.taxCode || 'A'}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div style={{ borderTop: '1px dashed #000', margin: '6px 0' }} />

            {/* Totals & VAT Breakdown (15/115 inclusive) */}
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11 }}>
              <span>TAXABLE (NET):</span>
              <span>{currency} {netAmount.toFixed(2)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11 }}>
              <span>VAT @ 15% (INCL):</span>
              <span>{currency} {data.vatTotal.toFixed(2)}</span>
            </div>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                fontWeight: 900,
                fontSize: 14,
                marginTop: 4
              }}
            >
              <span>TOTAL ({currency}):</span>
              <span>{currency} {data.grossTotal.toFixed(2)}</span>
            </div>

            <div style={{ borderTop: '1px dashed #000', margin: '6px 0' }} />

            {/* ZIMRA Fiscal Verification Block */}
            {data.fiscalCode && (
              <div style={{ textAlign: 'center', margin: '8px 0' }}>
                <div style={{ fontSize: 10, fontWeight: 700 }}>ZIMRA FISCAL SIGNATURE:</div>
                <div style={{ fontSize: 9, wordBreak: 'break-all', fontFamily: 'monospace' }}>
                  {data.fiscalCode}
                </div>
              </div>
            )}

            {data.qrCode && (
              <div style={{ textAlign: 'center', margin: '8px 0' }}>
                <img
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=${encodeURIComponent(
                    data.qrCode
                  )}`}
                  alt="ZIMRA QR"
                  style={{ width: 90, height: 90, margin: '0 auto', display: 'block' }}
                />
                <div style={{ fontSize: 8, color: '#475569', marginTop: 4 }}>
                  SCAN TO VERIFY WITH ZIMRA FDMS
                </div>
              </div>
            )}

            <div style={{ textAlign: 'center', fontSize: 9, marginTop: 6, color: '#475569' }}>
              Tax Code A = 15% Standard | Tax Code E = Exempt
              <br />
              Powered by ACADEX Fiscal Engine
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div
          style={{
            padding: '12px 20px',
            borderTop: '1px solid #e2e8f0',
            display: 'flex',
            justifyContent: 'flex-end',
            gap: 10
          }}
        >
          <button
            onClick={onClose}
            style={{
              padding: '8px 16px',
              borderRadius: 6,
              border: '1px solid #cbd5e1',
              background: '#fff',
              cursor: 'pointer',
              fontWeight: 600,
              color: '#475569'
            }}
          >
            Close
          </button>
          <button
            onClick={handlePrint}
            style={{
              padding: '8px 20px',
              borderRadius: 6,
              border: 'none',
              background: '#0284c7',
              color: '#fff',
              cursor: 'pointer',
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              gap: 8
            }}
          >
            <i className="fas fa-print" />
            Print Receipt
          </button>
        </div>
      </div>
    </div>
  );
}
