import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../../../lib/api';
import { SearchInput } from '../../../../components/shared';

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

  const filteredCards = cards.filter(c => {
    if (!search) return true;
    const q = search.toLowerCase();
    return c.name.toLowerCase().includes(q) || c.regNo.toLowerCase().includes(q) || c.className.toLowerCase().includes(q);
  });

  return (
    <div style={{ padding: '24px', maxWidth: '1400px', margin: '0 auto', fontFamily: 'Inter, system-ui, sans-serif' }}>
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
          filteredCards.map(card => (
            <div
              key={card.id}
              className="id-card-wrapper"
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
                {/* Student Photo */}
                <div style={{
                  width: '90px',
                  height: '110px',
                  borderRadius: '8px',
                  backgroundColor: '#f1f5f9',
                  border: '1px solid #cbd5e1',
                  overflow: 'hidden',
                  flexShrink: 0,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  {card.avatar ? (
                    <img src={card.avatar} alt={card.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    <span style={{ fontSize: '38px', color: '#94a3b8' }}>👤</span>
                  )}
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
                
                {/* Screen-only Reissue Action */}
                <button
                  className="no-print"
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
          ))
        )}
      </div>
    </div>
  );
}
