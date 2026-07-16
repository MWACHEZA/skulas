import React, { useState, useEffect, useRef } from 'react';
import api from '../../../lib/api';
import { useToast } from '../../../context/ToastContext';
import { useAuth } from '../../../contexts/AuthContext';

interface StudentData {
  id: string;
  name: string;
  studentId: string;
  gender: string;
  dob: string;
  address: string;
  createdAt: string;
  class?: { name: string; level: string };
  school: { 
    name: string; 
    type: string;
    address?: string; 
    phone?: string; 
    email?: string;
    logo?: string;
  };
  user?: { email: string };
}

export default function AdmissionLetterPage() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [student, setStudent] = useState<StudentData | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const printRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (user?.role === 'STUDENT') {
      fetchStudentData();
    } else {
      setLoading(false);
    }
  }, [user]);

  const fetchStudentData = async (id?: string) => {
    setLoading(true);
    try {
      const url = id ? `/api/students/${id}` : '/api/students/me';
      const { data } = await api.get(url);
      setStudent(data);
    } catch (error) {
      showToast('Failed to load admission details', 'error');
    
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchTerm.trim()) fetchStudentData(searchTerm);
  };

  const handlePrint = () => {
    window.print();
  };

  if (loading) return <div className="loading-state">Generating letter...</div>;

  return (
    <div className="portal-content">
      {user?.role !== 'STUDENT' && !student && (
        <div className="search-box glass animate-in" style={{ maxWidth: '600px', margin: '2rem auto', padding: '2rem', textAlign: 'center' }}>
          <i className="fas fa-id-card-alt" style={{ fontSize: '3rem', opacity: 0.1, marginBottom: '1rem' }}></i>
          <h2>Admission Letter Search</h2>
          <p style={{ color: 'var(--gray-400)', marginBottom: '1.5rem' }}>Enter Student ID or Registration Number to generate letter.</p>
          <form onSubmit={handleSearch} style={{ display: 'flex', gap: '10px' }}>
            <input 
              type="text" 
              placeholder="e.g. STU-2026-001" 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="glass-input"
            />
            <button className="btn btn-primary" type="submit">Generate</button>
          </form>
        </div>
      )}

      {student && (
        <div className="letter-actions no-print" style={{ display: 'flex', justifyContent: 'center', gap: '1rem', marginBottom: '2rem' }}>
          <button className="btn btn-primary" onClick={handlePrint}>
            <i className="fas fa-print mr-2"></i> Print Admission Letter
          </button>
          {user?.role !== 'STUDENT' && (
            <button className="btn btn-ghost" onClick={() => setStudent(null)}>Search Another</button>
          )}
        </div>
      )}

      {student && (
        <div className="admission-letter-container printable" ref={printRef}>
          {/* Header */}
          <div className="letter-header">
            <div className="school-logo">
              {student.school.logo ? <img src={student.school.logo} alt="Logo" /> : <i className="fas fa-university"></i>}
            </div>
            <div className="school-info">
              <h1>{student.school.name}</h1>
              <p>{student.school.address || 'Institution Address Not Set'}</p>
              <p>Email: {student.school.email} | Phone: {student.school.phone}</p>
            </div>
            <div className="qr-code">
               <i className="fas fa-qrcode" style={{ fontSize: '4rem', opacity: 0.8 }}></i>
               <p style={{ fontSize: '0.6rem', marginTop: '5px' }}>Verify Digital Copy</p>
            </div>
          </div>

          <div className="letter-title">
            <h2>ADMISSION LETTER</h2>
            <div className="date-row">
              <span>Date: {new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' })}</span>
              <span>Serial No: {student.id.substr(0, 8).toUpperCase()}</span>
            </div>
          </div>

          <div className="student-profile-section">
            <div className="profile-pic">
               <i className="fas fa-user-circle" style={{ fontSize: '6rem', color: '#e2e8f0' }}></i>
            </div>
            <div className="profile-details">
               <div className="detail-item"><span>Student Name:</span> <strong>{student.name}</strong></div>
               <div className="detail-item"><span>Registration No:</span> <strong>{student.studentId}</strong></div>
               <div className="detail-item"><span>Admission Date:</span> <strong>{new Date(student.createdAt).toLocaleDateString()}</strong></div>
               <div className="detail-item"><span>Current Class:</span> <strong>{student.class?.name || 'N/A'}</strong></div>
               <div className="detail-item"><span>Gender:</span> <strong>{student.gender || 'Not Specified'}</strong></div>
               <div className="detail-item"><span>Date of Birth:</span> <strong>{student.dob ? new Date(student.dob).toLocaleDateString() : 'N/A'}</strong></div>
            </div>
          </div>

          <div className="letter-body">
            <p>Dear <strong>{student.name}</strong>,</p>
            {student.school.type === 'seminary' ? (
              <p>Grace and peace to you. We are pleased to inform you that you have been admitted to <strong>{student.school.name}</strong> to pursue your theological studies and vocational training. Your placement in <strong>{student.class?.name || 'your assigned cohort'}</strong> has been confirmed as you begin this journey of spiritual and academic formation.</p>
            ) : (
              <p>We are pleased to inform you that you have been admitted to <strong>{student.school.name}</strong> for the current academic session. Your placement in <strong>{student.class?.name || 'your assigned class'}</strong> has been confirmed based on your successful application and verification of credentials.</p>
            )}
            
            <h3>{student.school.type === 'seminary' ? 'Covenant and Conduct' : 'Rules and Regulations'}</h3>
            <ul className="rules-list">
              <li>Students are expected to adhere to the institution's {student.school.type === 'seminary' ? 'vocation-based' : 'code of'} conduct at all times.</li>
              <li>Attendance is mandatory for all scheduled {student.school.type === 'seminary' ? 'chapel sessions,' : ''} lessons and academic activities.</li>
              {student.school.type === 'seminary' && <li>Commitment to personal spiritual discipline and community service is required.</li>}
              <li>{student.school.type === 'seminary' ? 'Modest and appropriate' : 'School uniforms'} attire must be worn correctly during school hours and official events.</li>
              <li>The institution maintains a zero-tolerance policy towards bullying and harassment.</li>
              <li>All tuition fees must be settled according to the payment schedule provided by the bursar.</li>
            </ul>

            <p style={{ marginTop: '2rem' }}>Please present this letter to the administration office upon your first arrival to complete your final registration and receive your student ID card.</p>
          </div>

          <div className="letter-footer">
            <div className="signature-block">
              <div className="sig-line"></div>
              <p>Signature of Authority</p>
              <p style={{ fontSize: '0.7rem', opacity: 0.6 }}>Registrar / School Administrator</p>
            </div>
            <div className="stamp-block">
              <div className="stamp-circle">INSTITUTION STAMP</div>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .admission-letter-container {
          background: white;
          color: black;
          width: 210mm;
          min-height: 297mm;
          padding: 20mm;
          margin: 0 auto;
          box-shadow: 0 0 20px rgba(0,0,0,0.1);
          font-family: 'Inter', sans-serif;
          position: relative;
        }
        .letter-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          border-bottom: 2px solid #1a202c;
          padding-bottom: 1rem;
          margin-bottom: 2rem;
        }
        .school-info h1 { margin: 0; font-size: 1.8rem; font-weight: 900; text-transform: uppercase; }
        .school-info p { margin: 2px 0; font-size: 0.85rem; opacity: 0.8; }
        
        .letter-title { text-align: center; margin-bottom: 2rem; }
        .letter-title h2 { text-decoration: underline; letter-spacing: 2px; margin-bottom: 10px; }
        .date-row { display: flex; justify-content: space-between; font-size: 0.9rem; font-weight: 600; }

        .student-profile-section {
          display: flex;
          gap: 3rem;
          background: #f8fafc;
          padding: 2rem;
          border-radius: 8px;
          margin-bottom: 2rem;
          border: 1px solid #e2e8f0;
        }
        .detail-item { display: flex; margin-bottom: 8px; font-size: 0.95rem; }
        .detail-item span { width: 150px; color: #64748b; font-weight: 500; }

        .letter-body h3 { font-size: 1.1rem; border-bottom: 1px solid #cbd5e1; padding-bottom: 5px; margin-top: 2rem; }
        .rules-list { padding-left: 20px; font-size: 0.9rem; line-height: 1.6; }
        .rules-list li { margin-bottom: 8px; }

        .letter-footer {
          margin-top: 4rem;
          display: flex;
          justify-content: space-between;
          align-items: flex-end;
        }
        .sig-line { border-bottom: 1px solid black; width: 200px; margin-bottom: 10px; }
        .stamp-circle {
          width: 120px;
          height: 120px;
          border: 2px dashed #cbd5e1;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 0.7rem;
          color: #94a3b8;
          text-align: center;
        }

        @media print {
          body * { visibility: hidden; }
          .printable, .printable * { visibility: visible; }
          .printable { position: absolute; left: 0; top: 0; box-shadow: none; margin: 0; padding: 10mm; }
          .no-print { display: none !important; }
        }
      `}</style>
    </div>
  );
}
