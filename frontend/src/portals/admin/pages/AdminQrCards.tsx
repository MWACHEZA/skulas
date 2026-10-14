import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../../lib/api';
import { SearchInput } from '../../../components/shared';
import { getAvatarUrl } from '../../../utils/formatters';

interface StudentCard {
  id: string;
  regNo: string;
  name: string;
  className: string;
  avatar: string | null;
  boardingStatus: string;
  qrToken: string;
  schoolName: string;
  schoolCode: string;
}

export default function AdminQrCards() {
  const navigate = useNavigate();
  const [cards, setCards] = useState<StudentCard[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [selectedClass, setSelectedClass] = useState<string>('');
  const [search, setSearch] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const [reissuingId, setReissuingId] = useState<string | null>(null);
  const [activePrintCardId, setActivePrintCardId] = useState<string | null>(null);
  const [uploadingStudentId, setUploadingStudentId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const targetStudentIdRef = useRef<string | null>(null);

  useEffect(() => {
    fetchClasses();
  }, []);

  useEffect(() => {
    fetchCards();
  }, [selectedClass]);

  const fetchClasses = async () => {
    try {
      const res = await api.get('/api/classes');
      setClasses(res.data.data || res.data || []);
    } catch (err) {
      console.error('Failed to load classes:', err);
    }
  };

  const fetchCards = async () => {
    setLoading(true);
    try {
      const res = await api.get('/api/gate/qr-cards', {
        params: { classId: selectedClass || undefined }
      });
      if (res.data.cards) {
        setCards(res.data.cards);
      }
    } catch (err) {
      console.error('Failed to load student QR cards:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleReissueQr = async (studentId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm('Are you sure you want to reissue this QR code? The student\'s previous card QR will be immediately deactivated and rejected at the gate.')) {
      return;
    }

    setReissuingId(studentId);
    try {
      const res = await api.post(`/api/gate/student/${studentId}/reissue-qr`);
      if (res.data.qrToken) {
        setCards(prev => prev.map(c => c.id === studentId ? { ...c, qrToken: res.data.qrToken } : c));
        alert('QR code reissued successfully. Old token has been permanently deactivated.');
      }
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to reissue student QR code');
    } finally {
      setReissuingId(null);
    }
  };

  const handlePrintSingleCard = (cardId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setActivePrintCardId(cardId);
    document.body.classList.add('printing-single-card');
    setTimeout(() => {
      window.print();
      document.body.classList.remove('printing-single-card');
      setActivePrintCardId(null);
    }, 150);
  };

  const handleUploadPhotoClick = (studentId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    targetStudentIdRef.current = studentId;
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
      fileInputRef.current.click();
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    const studentId = targetStudentIdRef.current;
    if (!file || !studentId) return;

    setUploadingStudentId(studentId);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const uploadRes = await api.post('/api/storage/upload?dir=avatars', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      const filePath = uploadRes.data?.filePath || uploadRes.data?.fileName;
      if (filePath) {
        await api.post(`/api/gate/student/${studentId}/photo`, { avatar: filePath });
        setCards(prev => prev.map(c => c.id === studentId ? { ...c, avatar: filePath } : c));
        alert('Student photo updated successfully!');
      }
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to upload student photo');
    } finally {
      setUploadingStudentId(null);
      targetStudentIdRef.current = null;
    }
  };

  const filteredCards = cards.filter(c => {
    if (!search) return true;
    const q = search.toLowerCase();
    return c.name.toLowerCase().includes(q) || c.regNo.toLowerCase().includes(q) || c.className.toLowerCase().includes(q);
  });

  return (
    <div style={{ padding: '24px', maxWidth: '1400px', margin: '0 auto', fontFamily: 'Inter, system-ui, sans-serif' }}>
      {/* Hidden File Input for Direct Photo Upload */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept="image/*"
        style={{ display: 'none' }}
      />

      {/* Print CSS Styles */}
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #print-cards-container, #print-cards-container * {
            visibility: visible;
          }
          #print-cards-container {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            margin: 0;
            padding: 10mm;
            display: grid !important;
            grid-template-columns: repeat(2, 1fr) !important;
            gap: 8mm !important;
          }
          .no-print {
            display: none !important;
          }
          .id-card-wrapper {
            break-inside: avoid;
            page-break-inside: avoid;
            box-shadow: none !important;
            border: 1.5px solid #000 !important;
          }
          body.printing-single-card #print-cards-container {
            display: flex !important;
            justify-content: center !important;
            align-items: center !important;
            padding: 30mm 15mm !important;
          }
          body.printing-single-card .id-card-wrapper:not(.active-print-target) {
            display: none !important;
          }
          body.printing-single-card .active-print-target {
            display: flex !important;
            width: 95mm !important;
            height: 60mm !important;
            margin: 0 auto !important;
            box-shadow: none !important;
          }
        }
      `}</style>

      {/* Screen Toolbar Header */}
      <div className="no-print" style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '16px',
        marginBottom: '24px'
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              onClick={() => navigate('/admin/gate-dashboard')}
              style={{
                border: 'none',
                background: 'none',
                color: '#64748b',
                fontSize: '18px',
                cursor: 'pointer',
                marginRight: '6px'
              }}
            >
              ← Back
            </button>
            <h1 style={{ fontSize: '24px', fontWeight: '800', margin: 0, color: '#0f172a' }}>
              🪪 Student ID Cards & HMAC QR Codes
            </h1>
          </div>
          <p style={{ color: '#64748b', fontSize: '14px', margin: '4px 0 0' }}>
            Generate standard printable student ID cards with cryptographically signed gate QR codes
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <select
            value={selectedClass}
            onChange={e => setSelectedClass(e.target.value)}
            style={{
              padding: '10px 14px',
              borderRadius: '8px',
              border: '1px solid #cbd5e1',
              fontSize: '13px',
              backgroundColor: '#fff',
              outline: 'none'
            }}
          >
            <option value="">All Classes / Forms</option>
            {classes.map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>

          <button
            onClick={() => window.print()}
            style={{
              padding: '10px 18px',
              backgroundColor: '#0284c7',
              color: '#fff',
              border: 'none',
              borderRadius: '8px',
              fontSize: '13px',
              fontWeight: '700',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            🖨️ Print Sheet ({filteredCards.length} Cards)
          </button>
        </div>
      </div>

      {/* Screen Search Bar */}
      <div className="no-print" style={{ marginBottom: '24px', width: '320px' }}>
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Search student or registration no..."
        />
      </div>

      {/* Cards Grid Container (Visible on screen and print) */}
      <div
        id="print-cards-container"
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))',
          gap: '20px'
        }}
      >
        {loading ? (
          <div className="no-print" style={{ gridColumn: '1 / -1', padding: '60px', textAlign: 'center', color: '#64748b' }}>
            Generating signed student ID cards...
          </div>
        ) : filteredCards.length === 0 ? (
          <div className="no-print" style={{ gridColumn: '1 / -1', padding: '60px', textAlign: 'center', color: '#64748b' }}>
            No student cards found for this selection.
          </div>
        ) : (
          filteredCards.map(card => {
            const resolvedAvatar = getAvatarUrl(card.avatar, card.schoolCode);
            return (
              <div
                key={card.id}
                className={`id-card-wrapper ${activePrintCardId === card.id ? 'active-print-target' : ''}`}
                style={{
                  backgroundColor: '#fff',
                  borderRadius: '12px',
                  border: '1px solid #cbd5e1',
                  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.08)',
                  overflow: 'hidden',
                  position: 'relative',
                  display: 'flex',
                  flexDirection: 'column'
                }}
              >
                {/* Card Header */}
                <div style={{
                  backgroundColor: '#0f172a',
                  color: '#fff',
                  padding: '10px 14px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  borderBottom: '3px solid #0284c7'
                }}>
                  <div>
                    <div style={{ fontSize: '13px', fontWeight: '800', letterSpacing: '0.02em', textTransform: 'uppercase' }}>
                      {card.schoolName}
                    </div>
                    <div style={{ fontSize: '9px', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      Official Student Identification
                    </div>
                  </div>
                  <div style={{ fontSize: '16px' }}>🎓</div>
                </div>

                {/* Card Body */}
                <div style={{ padding: '14px', display: 'flex', gap: '14px', flex: 1, alignItems: 'center' }}>
                  {/* Student Photo with Direct Upload Capability */}
                  <div
                    onClick={e => handleUploadPhotoClick(card.id, e)}
                    title="Click to upload or replace student photo"
                    style={{
                      width: '90px',
                      height: '110px',
                      borderRadius: '8px',
                      backgroundColor: '#f1f5f9',
                      border: '1.5px dashed #cbd5e1',
                      overflow: 'hidden',
                      flexShrink: 0,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      position: 'relative',
                      cursor: 'pointer'
                    }}
                  >
                    {uploadingStudentId === card.id ? (
                      <span style={{ fontSize: '10px', color: '#0284c7', fontWeight: 800 }}>Uploading...</span>
                    ) : resolvedAvatar ? (
                      <img
                        src={resolvedAvatar}
                        alt={card.name}
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        onError={(e) => {
                          // If remote image fails, show placeholder
                          (e.currentTarget as HTMLElement).style.display = 'none';
                        }}
                      />
                    ) : (
                      <div style={{ textAlign: 'center', padding: '4px' }}>
                        <span style={{ fontSize: '32px', color: '#94a3b8' }}>👤</span>
                        <div className="no-print" style={{ fontSize: '9px', color: '#0284c7', fontWeight: 800, marginTop: '2px' }}>
                          + Add Photo
                        </div>
                      </div>
                    )}
                    <div className="no-print" style={{
                      position: 'absolute',
                      bottom: 0,
                      left: 0,
                      right: 0,
                      background: 'rgba(15, 23, 42, 0.75)',
                      color: '#fff',
                      fontSize: '8px',
                      textAlign: 'center',
                      padding: '2px 0',
                      opacity: 0.85
                    }}>
                      📷 Upload
                    </div>
                  </div>

                  {/* Student Details */}
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '15px', fontWeight: '800', color: '#0f172a', marginBottom: '4px' }}>
                      {card.name}
                    </div>
                    <div style={{ fontSize: '11px', color: '#64748b', marginBottom: '4px' }}>
                      ID: <strong style={{ color: '#0f172a' }}>{card.regNo}</strong>
                    </div>
                    <div style={{ fontSize: '11px', color: '#64748b', marginBottom: '4px' }}>
                      Class: <strong style={{ color: '#0f172a' }}>{card.className}</strong>
                    </div>
                    <div style={{ fontSize: '11px', color: '#64748b', marginBottom: '6px' }}>
                      Status: <strong style={{ color: card.boardingStatus === 'Boarder' ? '#7c3aed' : '#0284c7' }}>
                        {card.boardingStatus === 'Boarder' ? 'Boarder' : 'Day Scholar'}
                      </strong>
                    </div>
                    <div style={{
                      display: 'inline-block',
                      padding: '2px 6px',
                      borderRadius: '4px',
                      fontSize: '9px',
                      fontWeight: '700',
                      backgroundColor: '#e0f2fe',
                      color: '#0369a1'
                    }}>
                      Session 2026 / 2027
                    </div>
                  </div>

                  {/* Signed HMAC QR Code */}
                  <div style={{ textAlign: 'center', flexShrink: 0 }}>
                    <img
                      src={`https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=${encodeURIComponent(card.qrToken)}`}
                      alt="Gate QR"
                      style={{
                        width: '85px',
                        height: '85px',
                        display: 'block',
                        borderRadius: '4px',
                        border: '1px solid #e2e8f0',
                        padding: '2px',
                        backgroundColor: '#fff'
                      }}
                    />
                    <div style={{ fontSize: '8px', fontWeight: '700', color: '#64748b', marginTop: '4px' }}>
                      CAMPUS GATE PASS
                    </div>
                  </div>
                </div>

                {/* Card Footer Bar */}
                <div style={{
                  backgroundColor: '#f8fafc',
                  borderTop: '1px solid #e2e8f0',
                  padding: '8px 14px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  fontSize: '10px',
                  color: '#64748b'
                }}>
                  <span>Anti-Tamper Signed Token</span>
                  
                  {/* Actions Row */}
                  <div className="no-print" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <button
                      onClick={e => handlePrintSingleCard(card.id, e)}
                      style={{
                        border: '1px solid #0284c7',
                        background: '#f0f9ff',
                        color: '#0284c7',
                        borderRadius: '4px',
                        padding: '3px 8px',
                        fontWeight: '700',
                        fontSize: '10px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px'
                      }}
                      title="Print only this student's ID card"
                    >
                      🖨️ Print Card
                    </button>
                    <button
                      onClick={e => handleReissueQr(card.id, e)}
                      disabled={reissuingId === card.id}
                      style={{
                        border: 'none',
                        background: 'none',
                        color: '#dc2626',
                        fontWeight: '700',
                        fontSize: '10px',
                        cursor: 'pointer',
                        textDecoration: 'underline'
                      }}
                    >
                      {reissuingId === card.id ? 'Reissuing...' : '↻ Reissue QR'}
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
