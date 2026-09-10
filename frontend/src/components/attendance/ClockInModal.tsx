import React, { useRef, useState, useCallback } from 'react';
import Webcam from 'react-webcam';
import api from '../../lib/api';
import { useToast } from '../../context/ToastContext';
import { format } from 'date-fns';

interface ClockInModalProps {
  onClose?: () => void;
  onSuccess: () => void;
  action: 'IN' | 'OUT';
  isMandatory?: boolean;
}

export default function ClockInModal({ onClose, onSuccess, action, isMandatory = false }: ClockInModalProps) {
  const webcamRef = useRef<Webcam>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { showToast } = useToast();
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [cameraError, setCameraError] = useState(false);

  const handleCapture = useCallback(() => {
    if (webcamRef.current) {
      const imageSrc = webcamRef.current.getScreenshot();
      if (imageSrc) {
        setCapturedImage(imageSrc);
      } else {
        showToast('Unable to capture from camera. You may upload a photo instead.', 'error');
      }
    }
  }, [webcamRef, showToast]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setCapturedImage(reader.result as string);
        showToast('Photo uploaded successfully', 'success');
      };
      reader.readAsDataURL(file);
    }
  };

  const handlePunch = async () => {
    if (!capturedImage) {
      showToast('Please capture or upload a verification photo first', 'error');
      return;
    }

    setLoading(true);
    try {
      const endpoint = action === 'IN' ? '/api/staff-attendance/clock-in' : '/api/staff-attendance/clock-out';
      await api.post(endpoint, { image: capturedImage });
      showToast(`Successfully Clocked ${action}`, 'success');
      onSuccess();
      if (onClose) onClose();
    } catch (error: any) {
      showToast(error.response?.data?.error || `Failed to clock ${action.toLowerCase()}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, 
      backgroundColor: isMandatory ? 'rgba(15, 23, 42, 0.92)' : 'rgba(0,0,0,0.5)', 
      backdropFilter: isMandatory ? 'blur(8px)' : 'none',
      zIndex: 99999,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '16px'
    }}>
      <div style={{ background: 'white', borderRadius: 16, width: 840, maxWidth: '95%', overflow: 'hidden', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)' }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px', borderBottom: '1px solid #e2e8f0', background: isMandatory ? '#fef2f2' : '#ffffff' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: isMandatory ? '#fee2e2' : '#eff6ff', color: isMandatory ? '#dc2626' : '#2563eb', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.1rem' }}>
              <i className={isMandatory ? "fas fa-user-lock" : "fas fa-clock"}></i>
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 900, color: isMandatory ? '#991b1b' : '#1e293b' }}>
                {isMandatory ? 'MANDATORY STAFF CLOCK-IN REQUIRED' : `STAFF ATTENDANCE — CLOCK ${action}`}
              </h3>
              <p style={{ margin: 0, fontSize: '0.75rem', color: '#64748b' }}>
                {format(new Date(), 'EEEE, do MMMM yyyy — hh:mm:ss a')}
              </p>
            </div>
          </div>
          
          {!isMandatory && onClose && (
            <button 
              onClick={onClose} 
              style={{ background: '#f1f5f9', color: '#64748b', border: 'none', width: '32px', height: '32px', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            >
              <i className="fas fa-times"></i>
            </button>
          )}
        </div>

        {/* Mandatory Warning Banner */}
        {isMandatory && (
          <div style={{ padding: '12px 20px', background: '#fffbeb', borderBottom: '1px solid #fef3c7', fontSize: '0.85rem', color: '#92400e', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <i className="fas fa-exclamation-circle" style={{ fontSize: '1.1rem', color: '#d97706' }}></i>
            <div>
              <strong>Institutional Policy Enforcement:</strong> All academic and administrative staff are required to clock in before accessing platform records, teaching tools, or student registries.
            </div>
          </div>
        )}
        
        {/* Main Content Area */}
        <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 20, alignItems: 'center' }}>
            {/* Camera / Feed Area */}
            <div style={{ background: '#0f172a', borderRadius: 12, overflow: 'hidden', position: 'relative', minHeight: 260, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {!cameraError ? (
                <Webcam
                  audio={false}
                  ref={webcamRef}
                  screenshotFormat="image/jpeg"
                  width="100%"
                  onUserMediaError={() => setCameraError(true)}
                  style={{ objectFit: 'cover', width: '100%', maxHeight: '280px' }}
                />
              ) : (
                <div style={{ textAlign: 'center', padding: '24px', color: '#94a3b8' }}>
                  <i className="fas fa-video-slash fa-2x mb-2" style={{ color: '#ef4444' }}></i>
                  <p style={{ margin: 0, fontSize: '0.85rem' }}>Camera access unavailable</p>
                  <p style={{ margin: '4px 0 0', fontSize: '0.75rem', color: '#64748b' }}>Please use the photo upload option below</p>
                </div>
              )}
            </div>

            {/* Preview Area */}
            <div style={{ border: '2px dashed #cbd5e1', borderRadius: 12, minHeight: 260, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#f8fafc', overflow: 'hidden', padding: 12 }}>
              {capturedImage ? (
                <img src={capturedImage} alt="Captured verification" style={{ maxWidth: '100%', maxHeight: '240px', objectFit: 'contain', borderRadius: 8 }} />
              ) : (
                <div style={{ textAlign: 'center', color: '#94a3b8' }}>
                  <i className="fas fa-id-badge fa-3x mb-2" style={{ opacity: 0.3 }}></i>
                  <p style={{ margin: 0, fontWeight: 700, fontSize: '0.9rem' }}>Verification Preview</p>
                  <p style={{ margin: '4px 0 0', fontSize: '0.75rem' }}>Capture camera snapshot or upload photo</p>
                </div>
              )}
            </div>
          </div>

          {/* Action buttons bar */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, justifyContent: 'center' }}>
            <button 
              type="button"
              onClick={handleCapture}
              className="portal-btn-primary" 
              style={{ background: '#2563eb', borderColor: '#1d4ed8', padding: '10px 20px', display: 'flex', alignItems: 'center', gap: 8, borderRadius: 10, fontWeight: 800 }}
            >
              <i className="fas fa-camera"></i> Capture Snapshot
            </button>

            <button 
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="portal-btn-ghost" 
              style={{ padding: '10px 20px', display: 'flex', alignItems: 'center', gap: 8, borderRadius: 10, fontWeight: 800, border: '1px solid #cbd5e1', background: '#ffffff' }}
            >
              <i className="fas fa-upload"></i> Upload Photo / ID Selfie
            </button>
            <input
              type="file"
              ref={fileInputRef}
              accept="image/*"
              style={{ display: 'none' }}
              onChange={handleFileUpload}
            />
          </div>
        </div>

        {/* Footer */}
        <div style={{ padding: '16px 20px', borderTop: '1px solid #e2e8f0', background: '#f8fafc', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            {capturedImage && (
              <span style={{ fontSize: '0.8rem', color: '#059669', fontWeight: 800 }}>
                <i className="fas fa-check-circle mr-1"></i> Verification photo ready
              </span>
            )}
          </div>
          <button 
            onClick={handlePunch}
            disabled={loading || !capturedImage}
            className="portal-btn-primary" 
            style={{ 
              background: action === 'IN' ? '#059669' : '#dc2626', 
              borderColor: action === 'IN' ? '#047857' : '#b91c1c', 
              padding: '12px 32px', 
              display: 'flex', 
              alignItems: 'center', 
              gap: 10,
              fontSize: '1rem',
              fontWeight: 900,
              borderRadius: 12,
              boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
            }}
          >
            {loading ? <i className="fas fa-spinner fa-spin"></i> : <i className={`fas fa-sign-${action === 'IN' ? 'in' : 'out'}-alt`}></i>}
            Confirm & Clock {action} Now
          </button>
        </div>
      </div>
    </div>
  );
}
