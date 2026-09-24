import React, { useState, useEffect } from 'react';
import api from '../../../lib/api';
import { useAuth } from '../../../contexts/AuthContext';
import { useToast } from '../../../context/ToastContext';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  initialDepartment?: string;
}

interface ItemRow {
  description: string;
  qty: number;
  unitPrice: number;
  totalPrice: number;
}

export const NewRequisitionModal: React.FC<Props> = ({ isOpen, onClose, onSuccess, initialDepartment }) => {
  const { user } = useAuth();
  const { showToast } = useToast();

  const [refNumber, setRefNumber] = useState('');
  const [types, setTypes] = useState<string[]>([]);
  const [requisitionType, setRequisitionType] = useState('Books & Learning Resources');
  const [title, setTitle] = useState('');
  const [priority, setPriority] = useState<'Low' | 'Medium' | 'High' | 'Urgent'>('Medium');
  const [neededByDate, setNeededByDate] = useState('');
  const [notes, setNotes] = useState('');
  const [attachmentUrl, setAttachmentUrl] = useState('');
  const [attachmentName, setAttachmentName] = useState('');
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);

  const [items, setItems] = useState<ItemRow[]>([
    { description: '', qty: 1, unitPrice: 0, totalPrice: 0 }
  ]);

  const raisedBy = user?.name || 'Staff Member';
  const department = initialDepartment || (user as any)?.dept?.name || (user as any)?.department || 'Library';
  const currentDate = new Date().toISOString().split('T')[0];

  useEffect(() => {
    if (isOpen) {
      // Fetch next requisition number
      api.get('/api/procurement/requisitions/next-number')
        .then(res => {
          if (res.data?.nextNumber) setRefNumber(res.data.nextNumber);
        })
        .catch(() => {
          const year = new Date().getFullYear();
          setRefNumber(`REQ-${year}-0001`);
        });

      // Fetch types
      api.get('/api/procurement/requisitions/types')
        .then(res => {
          if (Array.isArray(res.data)) {
            setTypes(res.data);
            if (res.data.length > 0 && !requisitionType) {
              setRequisitionType(res.data[0]);
            }
          }
        })
        .catch(() => {
          setTypes(['Books & Learning Resources', 'Stationery & Classroom Supplies', 'IT Hardware & Software', 'Other']);
        });
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleItemChange = (index: number, field: keyof ItemRow, value: any) => {
    const updated = [...items];
    const item = { ...updated[index] };

    if (field === 'qty') {
      const q = Math.max(1, parseInt(value) || 0);
      item.qty = q;
      item.totalPrice = Number((q * item.unitPrice).toFixed(2));
    } else if (field === 'unitPrice') {
      const p = Math.max(0, parseFloat(value) || 0);
      item.unitPrice = p;
      item.totalPrice = Number((item.qty * p).toFixed(2));
    } else if (field === 'description') {
      item.description = value;
    }

    updated[index] = item;
    setItems(updated);
  };

  const addItemRow = () => {
    setItems(prev => [...prev, { description: '', qty: 1, unitPrice: 0, totalPrice: 0 }]);
  };

  const removeItemRow = (index: number) => {
    if (items.length <= 1) {
      setItems([{ description: '', qty: 1, unitPrice: 0, totalPrice: 0 }]);
      return;
    }
    setItems(prev => prev.filter((_, idx) => idx !== index));
  };

  const grandTotal = items.reduce((sum, item) => sum + (item.totalPrice || 0), 0);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);
    setUploading(true);
    try {
      const res = await api.post('/api/storage/upload?dir=requisitions', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      if (res.data?.filePath) {
        setAttachmentUrl(`/api/storage/file/${res.data.filePath}`);
        setAttachmentName(file.name);
        showToast('Document uploaded successfully', 'success');
      }
    } catch (err: any) {
      showToast(err.response?.data?.error || 'Failed to upload attachment', 'error');
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (submitStatus: 'PENDING' | 'DRAFT') => {
    if (!title.trim()) {
      showToast('Please enter a requisition title', 'error');
      return;
    }

    const validItems = items.filter(it => it.description.trim().length > 0);
    if (validItems.length === 0) {
      showToast('Please add at least one item with a description', 'error');
      return;
    }

    setSaving(true);
    try {
      await api.post('/api/procurement/requisitions', {
        title,
        description: notes,
        estimatedAmount: grandTotal,
        requisitionType,
        priority,
        neededByDate: neededByDate || null,
        attachmentUrl: attachmentUrl || null,
        items: validItems,
        status: submitStatus
      });

      showToast(
        submitStatus === 'DRAFT' 
          ? 'Requisition draft saved successfully' 
          : 'Requisition submitted to HOD for approval', 
        'success'
      );
      onSuccess();
      onClose();
    } catch (err: any) {
      showToast(err.response?.data?.error || 'Failed to submit requisition', 'error');
    } finally {
      setSaving(false);
    }
  };

  const getPriorityStyle = (p: string) => {
    switch (p) {
      case 'Urgent': return { background: '#fee2e2', color: '#b91c1c', border: '1px solid #f87171' };
      case 'High': return { background: '#ffedd5', color: '#c2410c', border: '1px solid #fb923c' };
      case 'Medium': return { background: '#fef3c7', color: '#b45309', border: '1px solid #fcd34d' };
      default: return { background: '#f0fdf4', color: '#15803d', border: '1px solid #86efac' };
    }
  };

  return (
    <div className="portal-modal-overlay" style={{ zIndex: 1100 }}>
      <div className="portal-modal-card" style={{ maxWidth: 860, maxHeight: '90vh', overflowY: 'auto' }}>
        <div className="portal-modal-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e2e8f0', paddingBottom: '16px' }}>
          <div>
            <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800, color: '#1e293b' }}>
              <i className="fas fa-file-invoice mr-2" style={{ color: '#2563eb' }}></i>
              New Requisition Form
            </h2>
            <p style={{ margin: '4px 0 0', fontSize: '0.85rem', color: '#64748b' }}>
              Create an official procurement request for materials, books, or services.
            </p>
          </div>
          <button className="close-btn" style={{ border: 'none', background: 'none', fontSize: '1.5rem', cursor: 'pointer' }} onClick={onClose}>&times;</button>
        </div>

        <div className="portal-modal-body" style={{ padding: '20px 0', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Header Metadata Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '14px', background: '#f8fafc', padding: '16px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
            <div className="portal-form-group" style={{ margin: 0 }}>
              <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Requisition No.</label>
              <input 
                type="text" 
                className="portal-input" 
                value={refNumber || 'Generating...'} 
                readOnly 
                style={{ background: '#e2e8f0', fontFamily: 'monospace', fontWeight: 700, color: '#1e40af' }} 
              />
            </div>
            <div className="portal-form-group" style={{ margin: 0 }}>
              <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Raised By</label>
              <input 
                type="text" 
                className="portal-input" 
                value={raisedBy} 
                readOnly 
                style={{ background: '#e2e8f0', color: '#334155' }} 
              />
            </div>
            <div className="portal-form-group" style={{ margin: 0 }}>
              <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Department</label>
              <input 
                type="text" 
                className="portal-input" 
                value={department} 
                readOnly 
                style={{ background: '#e2e8f0', color: '#334155' }} 
              />
            </div>
            <div className="portal-form-group" style={{ margin: 0 }}>
              <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Date</label>
              <input 
                type="text" 
                className="portal-input" 
                value={currentDate} 
                readOnly 
                style={{ background: '#e2e8f0', color: '#334155' }} 
              />
            </div>
          </div>

          {/* Core Info */}
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: '14px' }}>
            <div className="portal-form-group" style={{ margin: 0 }}>
              <label style={{ fontWeight: 600, fontSize: '0.85rem' }}>Requisition Title / Summary *</label>
              <input 
                type="text" 
                className="portal-input" 
                placeholder="e.g. Q4 Library Science Textbooks Batch"
                value={title} 
                onChange={e => setTitle(e.target.value)} 
                required 
              />
            </div>

            <div className="portal-form-group" style={{ margin: 0 }}>
              <label style={{ fontWeight: 600, fontSize: '0.85rem' }}>Requisition Type</label>
              <select 
                className="portal-input" 
                value={requisitionType} 
                onChange={e => setRequisitionType(e.target.value)}
              >
                {types.map(t => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>

            <div className="portal-form-group" style={{ margin: 0 }}>
              <label style={{ fontWeight: 600, fontSize: '0.85rem' }}>Priority</label>
              <select 
                className="portal-input" 
                value={priority} 
                onChange={e => setPriority(e.target.value as any)}
                style={getPriorityStyle(priority)}
              >
                <option value="Low">Low</option>
                <option value="Medium">Medium</option>
                <option value="High">High</option>
                <option value="Urgent">Urgent</option>
              </select>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
            <div className="portal-form-group" style={{ margin: 0 }}>
              <label style={{ fontWeight: 600, fontSize: '0.85rem' }}>Needed By Date</label>
              <input 
                type="date" 
                className="portal-input" 
                value={neededByDate} 
                onChange={e => setNeededByDate(e.target.value)} 
              />
            </div>

            <div className="portal-form-group" style={{ margin: 0 }}>
              <label style={{ fontWeight: 600, fontSize: '0.85rem' }}>Attachment / Vendor Quotation (PDF, Doc)</label>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <input 
                  type="file" 
                  accept=".pdf,.doc,.docx,.xls,.xlsx,image/*" 
                  id="req-file-upload" 
                  style={{ display: 'none' }} 
                  onChange={handleFileUpload} 
                />
                <label 
                  htmlFor="req-file-upload" 
                  className="portal-btn-secondary" 
                  style={{ cursor: 'pointer', padding: '8px 16px', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '6px' }}
                >
                  <i className="fas fa-paperclip"></i>
                  {uploading ? 'Uploading...' : 'Choose File'}
                </label>
                {attachmentName && (
                  <span style={{ fontSize: '0.85rem', color: '#059669', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                    <i className="fas fa-check-circle"></i> {attachmentName}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Items Table */}
          <div style={{ border: '1px solid #e2e8f0', borderRadius: '12px', padding: '16px', background: '#ffffff' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <div>
                <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 700, color: '#1e293b' }}>
                  <i className="fas fa-list-ol mr-2" style={{ color: '#059669' }}></i> Itemized Requisition List
                </h4>
                <p style={{ margin: '2px 0 0', fontSize: '0.75rem', color: '#64748b' }}>
                  Add each specific item, estimated unit cost, and quantity.
                </p>
              </div>
              <button 
                type="button" 
                onClick={addItemRow} 
                className="portal-btn-secondary" 
                style={{ padding: '6px 14px', fontSize: '0.8rem', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                <i className="fas fa-plus"></i> Add Item
              </button>
            </div>

            <table className="portal-table" style={{ width: '100%', marginBottom: '12px' }}>
              <thead>
                <tr style={{ background: '#f8fafc' }}>
                  <th style={{ width: 40, textAlign: 'center' }}>#</th>
                  <th>Item Description</th>
                  <th style={{ width: 100 }}>Qty</th>
                  <th style={{ width: 130 }}>Unit Price ($)</th>
                  <th style={{ width: 130 }}>Total ($)</th>
                  <th style={{ width: 60, textAlign: 'center' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {items.map((row, idx) => (
                  <tr key={idx}>
                    <td style={{ textAlign: 'center', fontWeight: 600, color: '#94a3b8' }}>{idx + 1}</td>
                    <td>
                      <input 
                        type="text" 
                        className="portal-input" 
                        placeholder="e.g. Oxford Advanced Learner's Dictionary (10th Ed)" 
                        value={row.description} 
                        onChange={e => handleItemChange(idx, 'description', e.target.value)} 
                        style={{ width: '100%', fontSize: '0.85rem' }} 
                      />
                    </td>
                    <td>
                      <input 
                        type="number" 
                        min="1" 
                        className="portal-input" 
                        value={row.qty} 
                        onChange={e => handleItemChange(idx, 'qty', e.target.value)} 
                        style={{ width: '100%', fontSize: '0.85rem' }} 
                      />
                    </td>
                    <td>
                      <input 
                        type="number" 
                        step="0.01" 
                        min="0" 
                        className="portal-input" 
                        value={row.unitPrice} 
                        onChange={e => handleItemChange(idx, 'unitPrice', e.target.value)} 
                        style={{ width: '100%', fontSize: '0.85rem' }} 
                      />
                    </td>
                    <td style={{ fontWeight: 700, color: '#1e293b' }}>
                      ${(row.totalPrice || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <button 
                        type="button" 
                        onClick={() => removeItemRow(idx)} 
                        style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '0.9rem' }}
                        title="Remove Item"
                      >
                        <i className="fas fa-trash-alt"></i>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Running Grand Total */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '16px', padding: '12px 16px', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
              <span style={{ fontSize: '0.95rem', fontWeight: 600, color: '#475569' }}>Running Grand Total:</span>
              <span style={{ fontSize: '1.35rem', fontWeight: 800, color: '#1e40af', fontFamily: 'monospace' }}>
                ${grandTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
          </div>

          {/* Notes / Justification */}
          <div className="portal-form-group" style={{ margin: 0 }}>
            <label style={{ fontWeight: 600, fontSize: '0.85rem' }}>Justification & Procurement Notes</label>
            <textarea 
              className="portal-input" 
              rows={3} 
              placeholder="State the academic purpose, target curriculum requirements, or department reason for this requisition..."
              value={notes} 
              onChange={e => setNotes(e.target.value)} 
            />
          </div>
        </div>

        {/* Modal Footer with Draft vs Submit Actions */}
        <div className="portal-modal-footer" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #e2e8f0', paddingTop: '16px' }}>
          <button 
            type="button" 
            className="portal-btn-secondary" 
            onClick={onClose} 
            disabled={saving}
          >
            Cancel
          </button>
          
          <div style={{ display: 'flex', gap: '12px' }}>
            <button 
              type="button" 
              className="portal-btn-ghost" 
              onClick={() => handleSubmit('DRAFT')} 
              disabled={saving}
              style={{ border: '1px solid #cbd5e1', padding: '0 20px', borderRadius: '12px', fontWeight: 700, height: '46px' }}
            >
              <i className="fas fa-save mr-2"></i>
              Save as Draft
            </button>
            <button 
              type="button" 
              className="portal-btn-primary" 
              onClick={() => handleSubmit('PENDING')} 
              disabled={saving}
              style={{ padding: '0 28px', borderRadius: '12px', fontWeight: 800, height: '46px', display: 'flex', alignItems: 'center', gap: '8px', background: '#2563eb' }}
            >
              <i className="fas fa-paper-plane"></i>
              Submit for Approval
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
