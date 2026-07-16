import React, { useRef, useState, useCallback } from 'react';
import Webcam from 'react-webcam';
import api from '../../lib/api';
import { useToast } from '../../context/ToastContext';
import { format } from 'date-fns';

interface ClockInModalProps {
  onClose: () => void;
  onSuccess: () => void;
  action: 'IN' | 'OUT';
}

export default function ClockInModal({ onClose, onSuccess, action }: ClockInModalProps) {
  const webcamRef = useRef<Webcam>(null);
  const { showToast } = useToast();
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleCapture = useCallback(() => {
    if (webcamRef.current) {
      const imageSrc = webcamRef.current.getScreenshot();
      setCapturedImage(imageSrc);
    }
  }, [webcamRef]);

  const handlePunch = async () => {
    if (!capturedImage) {
      showToast('Please capture an image first', 'error');
      return;
    }

    setLoading(true);
    try {
      const endpoint = action === 'IN' ? '/api/staff-attendance/clock-in' : '/api/staff-attendance/clock-out';
      await api.post(endpoint, { image: capturedImage });
      showToast(`Successfully Clocked ${action}`, 'success');
      onSuccess();
      onClose();
    } catch (error: any) {
      showToast(error.response?.data?.error || `Failed to clock ${action.toLowerCase()}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, 
      backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 9999,
      display: 'flex', alignItems: 'center', justifyContent: 'center'
    }}>
      <div style={{ background: 'white', borderRadius: 8, width: 800, maxWidth: '90%' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', padding: 15, borderBottom: '1px solid #e2e8f0' }}>
          <h3 style={{ margin: 0, fontSize: '0.9rem', color: '#4a5568' }}>
            STAFF ATTENDANCE - {format(new Date(), 'do, MMMM yyyy - hh:mm:ssa').toUpperCase()}
          </h3>
          <button 
            onClick={onClose} 
            style={{ background: '#38a169', color: 'white', border: 'none', padding: '2px 8px', borderRadius: 4, cursor: 'pointer' }}
          >
            <i className="fas fa-times"></i>
          </button>
        </div>
        
        <div style={{ padding: 20, display: 'flex', gap: 20 }}>
          {/* Webcam Area */}
          <div style={{ flex: 1, background: 'black', borderRadius: 4, overflow: 'hidden', position: 'relative', minHeight: 250, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Webcam
              audio={false}
              ref={webcamRef}
              screenshotFormat="image/jpeg"
              width="100%"
              style={{ objectFit: 'cover' }}
            />
          </div>

          {/* Capture Button */}
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <button 
              onClick={handleCapture}
              className="portal-btn-primary" 
              style={{ background: '#3182ce', borderColor: '#3182ce', padding: '10px 20px', display: 'flex', alignItems: 'center', gap: 8 }}
            >
              <i className="fas fa-camera"></i> Capture
            </button>
          </div>

          {/* Preview Area */}
          <div style={{ flex: 1, border: '1px dashed #cbd5e0', borderRadius: 4, minHeight: 250, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f7fafc', overflow: 'hidden' }}>
            {capturedImage ? (
              <img src={capturedImage} alt="Captured preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : (
              <span style={{ color: '#a0aec0' }}>Preview</span>
            )}
          </div>
        </div>

        <div style={{ padding: 15, borderTop: '1px solid #e2e8f0', background: '#f7fafc', borderBottomLeftRadius: 8, borderBottomRightRadius: 8 }}>
          <button 
            onClick={handlePunch}
            disabled={loading}
            className="portal-btn-primary" 
            style={{ background: action === 'IN' ? '#38a169' : '#e53e3e', borderColor: action === 'IN' ? '#38a169' : '#e53e3e', padding: '8px 20px', display: 'flex', alignItems: 'center', gap: 8 }}
          >
            <i className={`fas fa-sign-${action === 'IN' ? 'in' : 'out'}-alt`}></i> Punch {action}
          </button>
        </div>
      </div>
    </div>
  );
}
