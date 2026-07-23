import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../../lib/api';
import { useToast } from '../../../context/ToastContext';

export default function HospitalizationManager() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { showToast } = useToast();
  
  const [loading, setLoading] = useState(true);
  const [record, setRecord] = useState<any>(null);
  
  // Forms
  const [stage, setStage] = useState('PRE_ADMISSION');
  const [admissionData, setAdmissionData] = useState({ 
    vitalSigns: '', height: '', weight: '', generalExam: '',
    medicationReconciliation: '', idBandAssigned: false, roomAssignment: '',
    orientationExplained: false, initialOrders: '', nurseObservations: '', admissionNotes: ''
  });
  const [transferData, setTransferData] = useState({ 
    targetHospital: '', reason: '', currentCondition: '', 
    belongingsAccompanying: '', ongoingTreatments: '', handoffSummary: '', orientationReceivingUnit: false 
  });
  const [dischargeData, setDischargeData] = useState({ 
    finalDiagnosis: '', clinicalStability: '', medication: '', woundCare: '', 
    dietaryRestrictions: '', activityLevels: '', followUpAppointments: '', 
    equipmentNeeds: '', warningSignsExplained: false, billingReviewed: false,
    consentUnderstood: false, lama: false
  });

  useEffect(() => {
    fetchRecord();
  }, [id]);

  const fetchRecord = async () => {
    try {
      // Fetch via history logic is tricky since we don't have the user ID from the URL.
      // Wait, we need a dedicated endpoint to GET /api/clinic/hospitalization/:id
      const res = await api.get(`/api/clinic/hospitalizations/${id}`);
      setRecord(res.data);
      setStage(res.data.stage);
      if (res.data.admissionData) setAdmissionData(prev => ({ ...prev, ...res.data.admissionData }));
      if (res.data.transferData) setTransferData(prev => ({ ...prev, ...res.data.transferData }));
      if (res.data.dischargeData) setDischargeData(prev => ({ ...prev, ...res.data.dischargeData }));
    } catch (err) {
      showToast('Failed to load hospitalization record', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdate = async () => {
    try {
      const payload = {
        stage,
        admissionData: admissionData,
        transferData: transferData,
        dischargeData: dischargeData,
      };
      await api.put(`/api/clinic/hospitalizations/${id}`, payload);
      showToast('Record updated successfully', 'success');
      fetchRecord();
    } catch (err) {
      showToast('Failed to update record', 'error');
    }
  };

  const handlePrint = () => {
    window.print();
  };

  if (loading) return <div style={{ padding: 40, textAlign: 'center' }}>Loading...</div>;
  if (!record) return <div style={{ padding: 40, textAlign: 'center' }}>Record not found.</div>;

  return (
    <>
      <style>{`
        @media print {
          body * { visibility: hidden !important; }
          .print-section, .print-section * { visibility: visible !important; }
          .print-section { position: absolute !important; left: 0 !important; top: 0 !important; width: 100% !important; padding: 20px !important; }
          .no-print { display: none !important; }
          .print-only-block { display: block !important; }
        }
      `}</style>

      <div className="portal-page-header no-print">
        <button onClick={() => navigate(-1)} className="portal-btn-secondary" style={{ marginBottom: 10 }}>
           <i className="fas fa-arrow-left"></i> Back
        </button>
        <h1>Manage Hospitalization</h1>
        <p>Patient: {record.user?.name || 'Unknown'}</p>
      </div>

      <div className="portal-card print-section">
        <div className="portal-card-header no-print" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2><i className="fas fa-procedures" style={{ color: 'var(--portal-warning)', marginRight: 8 }}></i> Hospitalization Record</h2>
          <button className="portal-btn-primary" onClick={handlePrint}>
            <i className="fas fa-print"></i> Export / Print Summary
          </button>
        </div>
        
        <div className="portal-card-body">
          <div className="no-print" style={{ marginBottom: 20 }}>
             <strong>Current Stage:</strong> <span className="portal-badge warning" style={{ marginLeft: 10 }}>{stage.replace('_', ' ')}</span>
          </div>

          <div className="no-print" style={{ marginBottom: 20, display: 'flex', gap: 10 }}>
            {['PRE_ADMISSION', 'ADMITTED', 'TRANSFERRED', 'DISCHARGED'].map(s => (
              <button 
                key={s} 
                className={stage === s ? 'portal-btn-primary' : 'portal-btn-secondary'}
                onClick={() => setStage(s)}
              >
                {s.replace('_', ' ')}
              </button>
            ))}
          </div>

          {stage === 'PRE_ADMISSION' && (
            <div className="no-print" style={{ background: '#f8fafc', padding: 16, borderRadius: 8 }}>
              <h3>Pre-Admission Info</h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                <p><strong>Admission Type:</strong> {record.preAdmissionData?.admissionType || 'N/A'}</p>
                <p><strong>Reason:</strong> {record.preAdmissionData?.reasonForAdmission || 'N/A'}</p>
                <p><strong>Emergency Contacts:</strong> {record.preAdmissionData?.emergencyContacts || 'N/A'}</p>
                <p><strong>Medical History:</strong> {record.preAdmissionData?.medicalHistory || 'N/A'}</p>
                <p><strong>Current Meds:</strong> {record.preAdmissionData?.currentMedications || 'N/A'}</p>
                <p><strong>Lifestyle:</strong> {record.preAdmissionData?.lifestyle || 'N/A'}</p>
                <p><strong>Insurance:</strong> {record.preAdmissionData?.insurance || 'N/A'}</p>
                <div>
                  <p><strong>Consents:</strong></p>
                  <ul style={{ margin: 0, paddingLeft: 20 }}>
                    <li>Treatment: {record.preAdmissionData?.consentTreatment ? 'Yes' : 'No'}</li>
                    <li>Privacy: {record.preAdmissionData?.consentPrivacy ? 'Yes' : 'No'}</li>
                    <li>Release of Info: {record.preAdmissionData?.consentRelease ? 'Yes' : 'No'}</li>
                  </ul>
                </div>
              </div>
              <p style={{ marginTop: 15, fontSize: '0.85rem' }}><em>(Read-only, recorded at creation)</em></p>
            </div>
          )}

          {stage === 'ADMITTED' && (
            <div className="no-print" style={{ background: '#f0fdf4', padding: 16, borderRadius: 8 }}>
              <h3>Admission Details</h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                <div className="portal-form-group">
                  <label className="portal-label">Vital Signs</label>
                  <input type="text" className="portal-input" placeholder="Temp, Pulse, BP, Resp, O2" 
                    value={admissionData.vitalSigns} onChange={e => setAdmissionData({...admissionData, vitalSigns: e.target.value})} />
                </div>
                <div className="portal-form-group">
                  <label className="portal-label">Physical Assessment</label>
                  <input type="text" className="portal-input" placeholder="Height, Weight, General Exam" 
                    value={admissionData.generalExam} onChange={e => setAdmissionData({...admissionData, generalExam: e.target.value})} />
                </div>
                <div className="portal-form-group">
                  <label className="portal-label">Medication Reconciliation</label>
                  <textarea className="portal-input" rows={2} placeholder="Verified current medications..."
                    value={admissionData.medicationReconciliation} onChange={e => setAdmissionData({...admissionData, medicationReconciliation: e.target.value})}></textarea>
                </div>
                <div className="portal-form-group">
                  <label className="portal-label">Initial Orders</label>
                  <textarea className="portal-input" rows={2} placeholder="Labs, imaging, diet, physician orders..."
                    value={admissionData.initialOrders} onChange={e => setAdmissionData({...admissionData, initialOrders: e.target.value})}></textarea>
                </div>
                <div className="portal-form-group">
                  <label className="portal-label">Nurse Observations</label>
                  <textarea className="portal-input" rows={2} placeholder="Mental status, mobility, anxiety..."
                    value={admissionData.nurseObservations} onChange={e => setAdmissionData({...admissionData, nurseObservations: e.target.value})}></textarea>
                </div>
                <div className="portal-form-group">
                  <label className="portal-label">Admission Notes / Care Plan</label>
                  <textarea className="portal-input" rows={2} placeholder="Detailed care plan..."
                    value={admissionData.admissionNotes} onChange={e => setAdmissionData({...admissionData, admissionNotes: e.target.value})}></textarea>
                </div>
                <div className="portal-form-group">
                  <label className="portal-label">Room Assignment</label>
                  <input type="text" className="portal-input" placeholder="Ward / Room No." 
                    value={admissionData.roomAssignment} onChange={e => setAdmissionData({...admissionData, roomAssignment: e.target.value})} />
                </div>
                <div className="portal-form-group" style={{ display: 'flex', flexDirection: 'column', gap: 10, justifyContent: 'center' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: '0.9rem' }}>
                    <input type="checkbox" checked={admissionData.idBandAssigned} onChange={e => setAdmissionData({...admissionData, idBandAssigned: e.target.checked})} />
                    Patient ID Band Assigned & Verified
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: '0.9rem' }}>
                    <input type="checkbox" checked={admissionData.orientationExplained} onChange={e => setAdmissionData({...admissionData, orientationExplained: e.target.checked})} />
                    Orientation to Facility Provided
                  </label>
                </div>
              </div>
            </div>
          )}

          {stage === 'TRANSFERRED' && (
            <div className="no-print" style={{ background: '#fef2f2', padding: 16, borderRadius: 8 }}>
              <h3>Transfer Details</h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                <div className="portal-form-group">
                  <label className="portal-label">Current Condition</label>
                  <input type="text" className="portal-input" placeholder="Vitals, stability, pain level..." 
                    value={transferData.currentCondition} onChange={e => setTransferData({...transferData, currentCondition: e.target.value})} />
                </div>
                <div className="portal-form-group">
                  <label className="portal-label">Target Hospital / Unit</label>
                  <input type="text" className="portal-input" placeholder="Receiving facility or ward"
                    value={transferData.targetHospital} onChange={e => setTransferData({...transferData, targetHospital: e.target.value})} />
                </div>
                <div className="portal-form-group">
                  <label className="portal-label">Transfer Reason</label>
                  <input type="text" className="portal-input" placeholder="Higher level care, specialty..."
                    value={transferData.reason} onChange={e => setTransferData({...transferData, reason: e.target.value})} />
                </div>
                <div className="portal-form-group">
                  <label className="portal-label">Belongings & Equipment</label>
                  <input type="text" className="portal-input" placeholder="Items accompanying patient..."
                    value={transferData.belongingsAccompanying} onChange={e => setTransferData({...transferData, belongingsAccompanying: e.target.value})} />
                </div>
                <div className="portal-form-group">
                  <label className="portal-label">Ongoing Treatments</label>
                  <textarea className="portal-input" rows={2} placeholder="IV therapy, wound care..."
                    value={transferData.ongoingTreatments} onChange={e => setTransferData({...transferData, ongoingTreatments: e.target.value})}></textarea>
                </div>
                <div className="portal-form-group">
                  <label className="portal-label">Handoff Summary</label>
                  <textarea className="portal-input" rows={2} placeholder="Diagnosis, care plan to pass on..."
                    value={transferData.handoffSummary} onChange={e => setTransferData({...transferData, handoffSummary: e.target.value})}></textarea>
                </div>
                <div className="portal-form-group" style={{ gridColumn: '1 / -1' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: '0.9rem' }}>
                    <input type="checkbox" checked={transferData.orientationReceivingUnit} onChange={e => setTransferData({...transferData, orientationReceivingUnit: e.target.checked})} />
                    Orientation to Receiving Unit Checked
                  </label>
                </div>
              </div>
            </div>
          )}

          {stage === 'DISCHARGED' && (
            <div className="no-print" style={{ background: '#eff6ff', padding: 16, borderRadius: 8 }}>
              <h3>Discharge Summary</h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                <div className="portal-form-group">
                  <label className="portal-label">Final Diagnosis</label>
                  <input type="text" className="portal-input" 
                    value={dischargeData.finalDiagnosis} onChange={e => setDischargeData({...dischargeData, finalDiagnosis: e.target.value})} />
                </div>
                <div className="portal-form-group">
                  <label className="portal-label">Clinical Stability</label>
                  <input type="text" className="portal-input" placeholder="Vitals acceptable..." 
                    value={dischargeData.clinicalStability} onChange={e => setDischargeData({...dischargeData, clinicalStability: e.target.value})} />
                </div>
                <div className="portal-form-group">
                  <label className="portal-label">Discharge Medications</label>
                  <textarea className="portal-input" rows={2}
                    value={dischargeData.medication} onChange={e => setDischargeData({...dischargeData, medication: e.target.value})}></textarea>
                </div>
                <div className="portal-form-group">
                  <label className="portal-label">Wound / Post-Discharge Care</label>
                  <textarea className="portal-input" rows={2}
                    value={dischargeData.woundCare} onChange={e => setDischargeData({...dischargeData, woundCare: e.target.value})}></textarea>
                </div>
                <div className="portal-form-group">
                  <label className="portal-label">Dietary & Activity Restrictions</label>
                  <textarea className="portal-input" rows={2}
                    value={dischargeData.dietaryRestrictions} onChange={e => setDischargeData({...dischargeData, dietaryRestrictions: e.target.value})}></textarea>
                </div>
                <div className="portal-form-group">
                  <label className="portal-label">Follow-Up Appointments</label>
                  <input type="text" className="portal-input" placeholder="Specialist, dates..." 
                    value={dischargeData.followUpAppointments} onChange={e => setDischargeData({...dischargeData, followUpAppointments: e.target.value})} />
                </div>
                <div className="portal-form-group">
                  <label className="portal-label">Medical Equipment Needs</label>
                  <input type="text" className="portal-input" placeholder="Wheelchair, oxygen..." 
                    value={dischargeData.equipmentNeeds} onChange={e => setDischargeData({...dischargeData, equipmentNeeds: e.target.value})} />
                </div>
                <div className="portal-form-group" style={{ display: 'flex', flexDirection: 'column', gap: 10, justifyContent: 'center' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: '0.9rem' }}>
                    <input type="checkbox" checked={dischargeData.warningSignsExplained} onChange={e => setDischargeData({...dischargeData, warningSignsExplained: e.target.checked})} />
                    Patient/Family Educated on Warning Signs
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: '0.9rem' }}>
                    <input type="checkbox" checked={dischargeData.billingReviewed} onChange={e => setDischargeData({...dischargeData, billingReviewed: e.target.checked})} />
                    Billing & Insurance Admin Completed
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: '0.9rem' }}>
                    <input type="checkbox" checked={dischargeData.consentUnderstood} onChange={e => setDischargeData({...dischargeData, consentUnderstood: e.target.checked})} />
                    Consent / Legal Instructions Understood
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: '0.9rem', color: '#e53e3e', fontWeight: 'bold' }}>
                    <input type="checkbox" checked={dischargeData.lama} onChange={e => setDischargeData({...dischargeData, lama: e.target.checked})} />
                    Leave Against Medical Advice (LAMA)
                  </label>
                </div>
              </div>
            </div>
          )}

          <div className="no-print" style={{ marginTop: 20 }}>
             <button className="portal-btn-primary" onClick={handleUpdate}>Save Changes</button>
          </div>

          {/* Printable Report Section - Visible only during print */}
          <div style={{ display: 'none' }} className="print-only-block">
             <div style={{ textAlign: 'center', marginBottom: 20 }}>
               <h2>Medical Discharge / Transfer Summary</h2>
               <p><strong>Patient Name:</strong> {record.user?.name}</p>
               <p><strong>Date of Record:</strong> {new Date(record.createdAt).toLocaleDateString()}</p>
               <p><strong>Final Stage:</strong> {stage.replace('_', ' ')}</p>
             </div>

             {record.preAdmissionData && (
               <div style={{ marginBottom: 15 }}>
                 <h4 style={{ borderBottom: '1px solid #ddd', paddingBottom: 5 }}>Pre-Admission Details</h4>
                 <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', fontSize: '0.9rem' }}>
                   <p><strong>Type:</strong> {record.preAdmissionData.admissionType}</p>
                   <p><strong>Reason:</strong> {record.preAdmissionData.reasonForAdmission}</p>
                   <p><strong>History:</strong> {record.preAdmissionData.medicalHistory}</p>
                   <p><strong>Current Meds:</strong> {record.preAdmissionData.currentMedications}</p>
                   <p><strong>Insurance:</strong> {record.preAdmissionData.insurance}</p>
                   <p><strong>Emergency Contact:</strong> {record.preAdmissionData.emergencyContacts}</p>
                 </div>
               </div>
             )}

             {admissionData.vitalSigns && (
               <div style={{ marginBottom: 15 }}>
                 <h4 style={{ borderBottom: '1px solid #ddd', paddingBottom: 5 }}>Admission Data</h4>
                 <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', fontSize: '0.9rem' }}>
                   <p><strong>Vitals:</strong> {admissionData.vitalSigns}</p>
                   <p><strong>Physical Exam:</strong> {admissionData.generalExam}</p>
                   <p><strong>Initial Orders:</strong> {admissionData.initialOrders}</p>
                   <p><strong>Room:</strong> {admissionData.roomAssignment}</p>
                   <p><strong>Notes:</strong> {admissionData.admissionNotes}</p>
                 </div>
               </div>
             )}
             
             {stage === 'TRANSFERRED' && (
               <div style={{ marginBottom: 15 }}>
                 <h4 style={{ borderBottom: '1px solid #ddd', paddingBottom: 5 }}>Transfer Information</h4>
                 <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', fontSize: '0.9rem' }}>
                   <p><strong>Transferred To:</strong> {transferData.targetHospital}</p>
                   <p><strong>Condition:</strong> {transferData.currentCondition}</p>
                   <p><strong>Reason:</strong> {transferData.reason}</p>
                   <p><strong>Ongoing Treatments:</strong> {transferData.ongoingTreatments}</p>
                   <p><strong>Handoff:</strong> {transferData.handoffSummary}</p>
                 </div>
               </div>
             )}
             
             {stage === 'DISCHARGED' && (
               <div style={{ marginBottom: 15 }}>
                 <h4 style={{ borderBottom: '1px solid #ddd', paddingBottom: 5 }}>Discharge Information</h4>
                 <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', fontSize: '0.9rem' }}>
                   <p><strong>Final Diagnosis:</strong> {dischargeData.finalDiagnosis}</p>
                   <p><strong>Clinical Stability:</strong> {dischargeData.clinicalStability}</p>
                   <p><strong>Discharge Medications:</strong> {dischargeData.medication}</p>
                   <p><strong>Follow Up:</strong> {dischargeData.followUpAppointments}</p>
                   <p><strong>Wound / Care:</strong> {dischargeData.woundCare}</p>
                   <p><strong>Equipment Needs:</strong> {dischargeData.equipmentNeeds}</p>
                   <p><strong>LAMA:</strong> {dischargeData.lama ? 'Yes' : 'No'}</p>
                 </div>
               </div>
             )}
             
             <div style={{ marginTop: 40, display: 'flex', justifyContent: 'space-between' }}>
               <div>
                 <p>___________________________</p>
                 <p>Attending Physician / Nurse</p>
               </div>
               <div>
                 <p>___________________________</p>
                 <p>Date</p>
               </div>
             </div>
          </div>
        </div>
      </div>
    </>
  );
}
