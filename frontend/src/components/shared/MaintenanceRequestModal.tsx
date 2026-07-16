import { useState, useEffect } from 'react';
import api from '../../lib/api';
import { useToast } from '../../context/ToastContext';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export default function MaintenanceRequestModal({ isOpen, onClose }: Props) {
  const [assets, setAssets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedAsset, setSelectedAsset] = useState('');
  const [details, setDetails] = useState('');
  const [submitting, setSubmitting] = useState(false);
  
  const { showToast } = useToast();

  useEffect(() => {
    if (isOpen) {
      fetchAssets();
    }
  }, [isOpen]);

  const fetchAssets = async () => {
    try {
      const { data } = await api.get('/api/assets');
      setAssets(data);
    } catch (err) {
      console.error('Failed to load assets');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAsset) return showToast('Please select an asset', 'warning');
    
    setSubmitting(true);
    try {
      await api.post('/api/assets/request-maintenance', {
        assetId: selectedAsset,
        details
      });
      showToast('Maintenance request submitted successfully', 'success');
      onClose();
      setDetails('');
      setSelectedAsset('');
    } catch (err) {
      showToast('Failed to submit request', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="portal-modal-overlay">
      <div className="portal-modal" style={{ maxWidth: 500 }}>
        <div className="modal-header">
          <h2>Request Maintenance</h2>
          <button onClick={onClose} className="close-modal">&times;</button>
        </div>
        <form onSubmit={handleSubmit} style={{ padding: 20 }}>
          <div className="form-group" style={{ marginBottom: 15 }}>
            <label>Select Asset</label>
            <select 
              className="form-control" 
              value={selectedAsset} 
              onChange={e => setSelectedAsset(e.target.value)}
              required
            >
              <option value="">-- Choose Asset --</option>
              {assets.map(a => (
                <option key={a.id} value={a.id}>{a.name} ({a.location || 'Unknown Location'})</option>
              ))}
            </select>
          </div>
          <div className="form-group" style={{ marginBottom: 20 }}>
            <label>Describe the Issue / Maintenance Needed</label>
            <textarea 
              className="form-control" 
              rows={4}
              value={details}
              onChange={e => setDetails(e.target.value)}
              placeholder="Please provide details about what needs attention..."
              required
            ></textarea>
          </div>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
            <button type="button" onClick={onClose} className="btn btn-secondary">Cancel</button>
            <button type="submit" className="portal-btn-primary" disabled={submitting}>
              {submitting ? 'Submitting...' : 'Submit Request'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
