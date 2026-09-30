import React, { useState } from 'react';
import api from '../../lib/api';
import FiscalReceiptModal, { type FiscalReceiptData } from './FiscalReceiptModal';
import { useToast } from '../../context/ToastContext';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  journalEntryId: string;
  entryNumber?: string;
  originalAmount?: number;
  onSuccess?: () => void;
}

export default function CreditNoteModal({
  isOpen,
  onClose,
  journalEntryId,
  entryNumber,
  originalAmount,
  onSuccess
}: Props) {
  const [reason, setReason] = useState('Customer return / refund');
  const [customReason, setCustomReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [receiptData, setReceiptData] = useState<FiscalReceiptData | null>(null);
  const [showReceipt, setShowReceipt] = useState(false);
  const { showToast } = useToast();

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    const finalReason = reason === 'Other' ? customReason : reason;

    try {
      const res = await api.post('/credit-notes', {
        originalJournalEntryId: journalEntryId,
        reason: finalReason
      });

      const { creditNote, reversingEntry, fiscalCreditNote } = res.data;

      // Populate printable receipt
      setReceiptData({
        schoolName: 'ACADEX Boarding School',
        vatNumber: '100234567',
        receiptNo: creditNote.creditNoteNumber,
        fiscalCode: fiscalCreditNote?.fiscalCode,
        fiscalDayNo: 1,
        qrCode: fiscalCreditNote?.qrCode,
        deviceSerial: 'VFD-01',
        date: new Date().toLocaleString(),
        paymentMethod: 'REVERSAL / CREDIT NOTE',
        currency: creditNote.currency,
        items: [
          {
            name: `Reversal of ${entryNumber || 'Transaction'}: ${finalReason}`,
            quantity: 1,
            unitPrice: creditNote.totalAmount,
            totalAmount: creditNote.totalAmount,
            taxCode: creditNote.totalVat > 0 ? 'A' : 'E'
          }
        ],
        grossTotal: creditNote.totalAmount,
        vatTotal: creditNote.totalVat,
        isCreditNote: true,
        originalFiscalCode: fiscalCreditNote?.originalFiscalCode
      });

      showToast('Credit note issued successfully', 'success');
      setShowReceipt(true);
      if (onSuccess) onSuccess();
    } catch (err: any) {
      showToast(err.response?.data?.error || 'Failed to issue credit note', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <div
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999
        }}
      >
        <div style={{ background: '#fff', borderRadius: 12, padding: 24, width: '100%', maxWidth: 460 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <h3 style={{ margin: 0, fontWeight: 800, color: '#dc2626' }}>
              <i className="fas fa-undo-alt" style={{ marginRight: 8 }} />
              Issue Credit Note Reversal
            </h3>
            <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: '1.2rem', cursor: 'pointer' }}>
              &times;
            </button>
          </div>

          <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, padding: 12, marginBottom: 16, fontSize: '0.85rem', color: '#991b1b' }}>
            <strong>Immutable Reversal Policy:</strong> Posted transactions cannot be deleted. Issuing this credit note will atomically post exact opposite GL lines and emit a ZIMRA FiscalCreditNote if applicable.
          </div>

          <div style={{ marginBottom: 14, fontSize: '0.9rem', color: '#334155' }}>
            <div><strong>Original Transaction:</strong> {entryNumber || journalEntryId}</div>
            {originalAmount !== undefined && (
              <div><strong>Reversal Amount:</strong> ${originalAmount.toFixed(2)}</div>
            )}
          </div>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div>
              <label style={{ fontSize: '0.85rem', fontWeight: 600 }}>Reason for Reversal *</label>
              <select
                value={reason}
                onChange={e => setReason(e.target.value)}
                style={{ width: '100%', padding: '8px 12px', borderRadius: 6, border: '1px solid #cbd5e1', marginTop: 4 }}
              >
                <option value="Customer return / refund">Customer return / refund</option>
                <option value="Billing / pricing error">Billing / pricing error</option>
                <option value="Duplicate transaction">Duplicate transaction</option>
                <option value="Incorrect student account debited">Incorrect student account debited</option>
                <option value="Damaged / defective goods">Damaged / defective goods</option>
                <option value="Other">Other (specify below)</option>
              </select>
            </div>

            {reason === 'Other' && (
              <div>
                <label style={{ fontSize: '0.85rem', fontWeight: 600 }}>Specify Reason *</label>
                <textarea
                  required
                  rows={2}
                  placeholder="Enter detailed reason for auditor review..."
                  value={customReason}
                  onChange={e => setCustomReason(e.target.value)}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: 6, border: '1px solid #cbd5e1', marginTop: 4 }}
                />
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 10 }}>
              <button
                type="button"
                onClick={onClose}
                disabled={submitting}
                style={{ padding: '8px 16px', borderRadius: 6, border: '1px solid #cbd5e1', background: '#fff' }}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                style={{ padding: '8px 20px', borderRadius: 6, border: 'none', background: '#dc2626', color: '#fff', fontWeight: 700 }}
              >
                {submitting ? 'Processing...' : 'Confirm & Post Credit Note'}
              </button>
            </div>
          </form>
        </div>
      </div>

      {showReceipt && (
        <FiscalReceiptModal
          isOpen={showReceipt}
          onClose={() => {
            setShowReceipt(false);
            onClose();
          }}
          data={receiptData}
        />
      )}
    </>
  );
}
