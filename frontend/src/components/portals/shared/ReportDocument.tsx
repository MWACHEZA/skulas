import React from 'react';

interface ReportGrade {
  subject: string;
  grade: string;
  score: number;
  credits?: number;
  comment?: string;
  teacher?: { name: string };
}

interface ReportData {
  type?: string;
  student?: {
    name: string;
    studentId: string;
    class?: { name: string };
  };
  name?: string;
  id?: string;
  studentId?: string;
  staffId?: string;
  assetId?: string;
  role?: string;
  email?: string;
  phone?: string;
  statusText?: string;
  category?: string;
  location?: string;
  custodian?: string;
  grades?: ReportGrade[];
  fees?: any[];
  totalFee?: number;
  totalPaid?: number;
  balance?: number;
  class?: { name: string };
  term: string;
  year: string;
  globalComment?: string;
  schoolType?: string;
}

interface ReportTemplateConfig {
  primaryColor: string;
  secondaryColor?: string;
  showAttendance?: boolean;
  showRanking?: boolean;
}

interface Props {
  data: ReportData;
  template: {
    config: ReportTemplateConfig;
    signatureUrl?: string;
  };
}

const ReportDocument: React.FC<Props> = ({ data, template }) => {
  const { primaryColor } = template.config;
  const reportType = data.type || 'ACADEMIC';

  const getTitle = () => {
    const isMedical = data.schoolType?.toLowerCase().includes('nursing') || 
                      data.schoolType?.toLowerCase().includes('medical');
    const isUniversity = data.schoolType?.toLowerCase().includes('university') || 
                         data.schoolType?.toLowerCase().includes('varsity');

    switch (reportType) {
      case 'STAFF': return 'STAFF RECORDS';
      case 'ASSETS': return 'ASSET INVENTORY REPORT';
      case 'FEES': return 'FEE STATUS STATEMENT';
      default: 
        if (isUniversity) return 'OFFICIAL ACADEMIC TRANSCRIPT';
        return isMedical ? 'COMPETENCY ASSESSMENT REPORT' : 'ACADEMIC PROGRESS REPORT';
    }
  };

  const renderContent = () => {
    if (reportType === 'STAFF') {
      return (
        <div style={{ marginTop: 20 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
            <div><strong>Role:</strong> {data.role}</div>
            <div><strong>Staff ID:</strong> {data.staffId}</div>
            <div><strong>Email:</strong> {data.email}</div>
            <div><strong>Phone:</strong> {data.phone || 'N/A'}</div>
          </div>
          <div style={{ marginTop: 40, padding: 20, border: '1px solid #edf2f7', borderRadius: 8 }}>
            <p>This document serves as an official record of employment/service for the above named individual at Acadex High.</p>
          </div>
        </div>
      );
    }

    if (reportType === 'ASSETS') {
      return (
        <div style={{ marginTop: 20 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
            <div><strong>Category:</strong> {data.category}</div>
            <div><strong>Serial/ID:</strong> {data.assetId}</div>
            <div><strong>Location:</strong> {data.location}</div>
            <div><strong>Custodian:</strong> {data.custodian || 'Unassigned'}</div>
          </div>
          <div style={{ marginTop: 40, padding: 20, border: '1px solid #edf2f7', borderRadius: 8 }}>
            <p><strong>Condition:</strong> {data.statusText}</p>
            <p>Asset verification record generated on {new Date().toLocaleDateString()}.</p>
          </div>
        </div>
      );
    }

    if (reportType === 'FEES') {
      return (
        <div style={{ marginTop: 20 }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '20px' }}>
             <thead>
               <tr style={{ borderBottom: `2px solid ${primaryColor}` }}>
                  <th style={{ textAlign: 'left', padding: 10 }}>DESCRIPTION</th>
                  <th style={{ textAlign: 'right', padding: 10 }}>AMOUNT</th>
                  <th style={{ textAlign: 'right', padding: 10 }}>PAID</th>
                  <th style={{ textAlign: 'right', padding: 10 }}>BALANCE</th>
               </tr>
             </thead>
             <tbody>
               {(data.fees || []).map((f: any, idx: number) => (
                 <tr key={idx}>
                    <td style={{ padding: 10 }}>{f.description || `${data.term} ${data.year} Fees`}</td>
                    <td style={{ textAlign: 'right', padding: 10 }}>${f.amount.toLocaleString()}</td>
                    <td style={{ textAlign: 'right', padding: 10 }}>${f.paid.toLocaleString()}</td>
                    <td style={{ textAlign: 'right', padding: 10 }}>${(f.amount - f.paid).toLocaleString()}</td>
                 </tr>
               ))}
               <tr style={{ borderTop: '2px solid #edf2f7', fontWeight: 700 }}>
                  <td style={{ padding: 10 }}>TOTALS</td>
                  <td style={{ textAlign: 'right', padding: 10 }}>${data.totalFee?.toLocaleString()}</td>
                  <td style={{ textAlign: 'right', padding: 10 }}>${data.totalPaid?.toLocaleString()}</td>
                  <td style={{ textAlign: 'right', padding: 10, color: (data.balance || 0) > 0 ? '#e53e3e' : '#38a169' }}>
                    ${data.balance?.toLocaleString()}
                  </td>
               </tr>
             </tbody>
          </table>
        </div>
      );
    }

    // Default: Academic
    const isUniversity = data.schoolType?.toLowerCase().includes('university') || 
                         data.schoolType?.toLowerCase().includes('varsity');

    const calculateGradePoint = (score: number) => {
      if (score >= 75) return 4.0;
      if (score >= 65) return 3.0;
      if (score >= 60) return 2.0;
      if (score >= 50) return 1.0;
      return 0.0;
    };

    const getDivision = (score: number) => {
      if (score >= 75) return '1';
      if (score >= 65) return '2.1';
      if (score >= 60) return '2.2';
      if (score >= 50) return 'Pass';
      return 'Fail';
    };

    const validGrades = (data.grades || []).filter(g => typeof g.score === 'number' && !isNaN(g.score));
    const gpaData = validGrades.reduce((acc, g) => {
      const credits = g.credits || 0;
      const point = calculateGradePoint(g.score);
      acc.totalPoints += point * credits;
      acc.totalCredits += credits;
      return acc;
    }, { totalPoints: 0, totalCredits: 0 });

    const gpa = gpaData.totalCredits > 0 ? (gpaData.totalPoints / gpaData.totalCredits).toFixed(2) : '0.00';

    return (
      <>
        {/* Student Info Bar */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '15px', background: 'transparent', padding: '15px', borderRadius: '8px', marginBottom: '30px' }}>
          {[
            { label: 'STUDENT NAME', value: data.name || data.student?.name },
            { label: 'STUDENT ID', value: data.studentId || data.student?.studentId },
            { label: 'CLASS', value: data.class?.name || data.student?.class?.name || 'N/A' },
            { label: 'DATE ISSUED', value: new Date().toLocaleDateString() }
          ].map((info, idx) => (
            <div key={idx}>
              <div style={{ fontSize: '0.65rem', fontWeight: 700, color: '#a0aec0', marginBottom: '4px' }}>{info.label}</div>
              <div style={{ fontSize: '0.9rem', fontWeight: 600 }}>{info.value}</div>
            </div>
          ))}
        </div>

        {/* Grades Table */}
        <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '40px' }}>
          <thead>
            <tr style={{ background: primaryColor, color: 'white' }}>
              <th style={{ padding: '12px', textAlign: 'left', borderRadius: '4px 0 0 4px' }}>{isUniversity ? 'COURSE' : 'SUBJECT'}</th>
              {isUniversity && <th style={{ padding: '12px', textAlign: 'center' }}>CREDITS</th>}
              <th style={{ padding: '12px', textAlign: 'center' }}>SCORE</th>
              <th style={{ padding: '12px', textAlign: 'center' }}>GRADE</th>
              <th style={{ padding: '12px', textAlign: 'left', borderRadius: '0 4px 4px 0' }}>{isUniversity ? 'REMARKS' : 'TEACHER REMARKS'}</th>
            </tr>
          </thead>
          <tbody>
            {(data.grades || []).map((g, idx) => (
              <tr key={idx} style={{ borderBottom: '1px solid #edf2f7' }}>
                <td style={{ padding: '15px 12px', fontWeight: 600 }}>{g.subject}</td>
                {isUniversity && <td style={{ padding: '15px 12px', textAlign: 'center', fontWeight: 700 }}>{g.credits || 0}</td>}
                <td style={{ padding: '15px 12px', textAlign: 'center' }}>{g.score}</td>
                <td style={{ padding: '15px 12px', textAlign: 'center' }}>
                  <span style={{ 
                    padding: '4px 10px', 
                    borderRadius: '4px', 
                    background: `${primaryColor}15`, 
                    color: primaryColor, 
                    fontWeight: 700 
                  }}>{isUniversity ? getDivision(g.score) : g.grade}</span>
                </td>
                <td style={{ padding: '15px 12px', fontSize: '0.85rem', color: '#4a5568', fontStyle: 'italic' }}>
                  {g.comment || (isUniversity ? 'Satisfactory' : 'Satisfactory progress.')}
                </td>
              </tr>
            ))}
            {isUniversity && (
               <tr style={{ background: '#f8fafc', fontWeight: 700 }}>
                  <td colSpan={2} style={{ padding: '15px 12px', textAlign: 'right' }}>WEIGHTED GPA (4.0 SCALE)</td>
                  <td colSpan={3} style={{ padding: '15px 12px', color: primaryColor, fontSize: '1.2rem' }}>
                    {gpa}
                  </td>
               </tr>
            )}
          </tbody>
        </table>

        {data.globalComment && (
          <div style={{ marginTop: '20px', padding: '15px', border: `1px solid ${primaryColor}40`, borderRadius: '8px', background: `${primaryColor}05` }}>
            <div style={{ fontSize: '0.75rem', fontWeight: 800, color: primaryColor, marginBottom: '8px', textTransform: 'uppercase' }}>General Performance Appraisal</div>
            <div style={{ fontSize: '0.9rem', color: '#2d3748', lineHeight: '1.5' }}>{data.globalComment}</div>
          </div>
        )}
      </>
    );
  };

  return (
    <div id={`report-${data.id || data.studentId}`} className="report-container" style={{ 
      padding: '40px', 
      background: 'transparent', 
      color: '#2d3748', 
      fontFamily: 'Inter, system-ui, sans-serif',
      width: '800px',
      margin: '0 auto',
      minHeight: '1100px',
      position: 'relative'
    }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: `4px solid ${primaryColor}`, paddingBottom: '20px', marginBottom: '30px' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '2rem', fontWeight: 800, color: primaryColor }}>ACADEX HIGH</h1>
          <p style={{ margin: 0, fontSize: '0.85rem', color: '#718096' }}>Excellence in Education & Character</p>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: '1.2rem', fontWeight: 700 }}>{getTitle()}</div>
          <div style={{ color: '#718096' }}>{data.term} | {data.year} Session</div>
        </div>
      </div>

      {renderContent()}

      {/* Footer Area with Comments & Signature */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 250px', gap: '40px', marginTop: 'auto', position: 'absolute', bottom: 60, left: 40, right: 40 }}>
        <div>
          <div style={{ marginBottom: '20px' }}>
            <h4 style={{ margin: '0 0 8px', fontSize: '0.85rem', color: primaryColor, borderBottom: '1px solid #edf2f7', paddingBottom: '4px' }}>OFFICIAL REMARKS</h4>
            <p style={{ fontSize: '0.9rem', color: '#4a5568', lineHeight: '1.6' }}>
              This is a digitally generated report from the Acadex Management System. 
              The information contained herein is verified and authentic as of the date of issue.
            </p>
          </div>
          {/* Decorative QR Code */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 15, opacity: 0.6 }}>
             <svg width="60" height="60" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M3 3h6v6H3V3zm1 1v4h4V4H4zm1 1h2v2H5V5zM3 15h6v6H3v-6zm1 1v4h4v-4H4zm1 1h2v2H5v-2zM15 3h6v6h-6V3zm1 1v4h4V4h-4zm1 1h2v2h-2V5zM15 15h2v2h-2v-2zM19 19h2v2h-2v-2zM17 17h2v2h-2v-2zM21 15h2v2h-2v-2zM15 19h2v2h-2v-2zM19 15h2v2h-2v-2zM21 19h2v2h-2v-2z" fill={primaryColor} />
             </svg>
             <div style={{ fontSize: '0.65rem', color: '#94a3b8' }}>
                Scan to verify<br/>document authenticity
             </div>
          </div>
        </div>

        <div style={{ textAlign: 'center' }}>
          <div style={{ height: '80px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '10px' }}>
            {template.signatureUrl ? (
              <img src={template.signatureUrl} alt="Signature" style={{ maxWidth: '180px', maxHeight: '70px' }} />
            ) : (
              <div style={{ borderBottom: '1px dashed #cbd5e0', width: '100%', height: '40px' }}></div>
            )}
          </div>
          <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>Authorized Signature</div>
          <div style={{ fontSize: '0.75rem', color: '#718096' }}>School Academic Seal</div>
        </div>
      </div>

      {/* Bottom Branding */}
      <div style={{ position: 'absolute', bottom: '20px', left: '40px', right: '40px', fontSize: '0.7rem', color: '#a0aec0', display: 'flex', justifyContent: 'space-between', borderTop: '1px solid #f7fafc', paddingTop: '10px' }}>
        <div>ACADEX MANAGEMENT SYSTEM - VERIFIED DOCUMENT</div>
        <div>Page 1 of 1</div>
      </div>
    </div>
  );
};

export default ReportDocument;
