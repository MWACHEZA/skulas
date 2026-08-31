import React, { useState, useEffect, useCallback } from 'react';
import api from '../../../lib/api';
import { useToast } from '../../../context/ToastContext';

export interface AppointmentRecord {
  id: string;
  userId?: string;
  appointment: string;
  symptoms?: string;
  date: string;
}

export interface ComplaintRecord {
  id: string;
  userId?: string;
  title: string;
  symptoms: string;
  medicine?: string;
  date: string;
}

export interface ImmunizationRecord {
  id: string;
  userId?: string;
  title: string;
  details?: string;
  date: string;
}

export interface ReferralRecord {
  id: string;
  userId?: string;
  title: string;
  details?: string;
  to: string;
  address?: string;
  date: string;
}

export interface HospitalizationRecord {
  id: string;
  stage: string;
  createdAt: string;
  preAdmissionData?: {
    reasonForAdmission?: string;
  };
}

export interface PatientUser {
  id: string;
  name: string;
  role: string;
  email?: string;
  phone?: string;
  staffId?: string;
  student?: {
    studentId?: string;
  };
}

export interface PatientHistory {
  appointments: AppointmentRecord[];
  complaints: ComplaintRecord[];
  immunizations: ImmunizationRecord[];
  referrals: ReferralRecord[];
  hospitalizations: HospitalizationRecord[];
}

export interface PharmacyStockItem {
  id: string;
  name: string;
  category: string;
  batchNumber?: string;
  expiryDate?: string;
  unit: string;
  stock: number;
  reorderLevel: number;
  unitCost?: number;
  unitPrice: number;
  location?: string;
  isLowStock?: boolean;
  isExpired?: boolean;
  isExpiringSoon?: boolean;
}

export default function PatientManagement() {
  const { showToast } = useToast();
  const [users, setUsers] = useState<PatientUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('ALL');

  // Selected Patient Details & History Modal
  const [selectedUser, setSelectedUser] = useState<PatientUser | null>(null);
  const [history, setHistory] = useState<PatientHistory>({
    appointments: [],
    complaints: [],
    immunizations: [],
    referrals: [],
    hospitalizations: []
  });
  const [loadingHistory, setLoadingHistory] = useState(false);

  // Walk-in Patient Modal State
  const [showWalkinModal, setShowWalkinModal] = useState(false);
  const [walkinForm, setWalkinForm] = useState({
    firstName: '',
    lastName: '',
    dob: '',
    gender: 'MALE',
    contactNumber: '',
    address: '',
    bloodType: '',
    allergies: '',
    chronicConditions: '',
    guardianName: '',
    guardianContact: ''
  });

  // Pharmacy Modal State
  const [showPharmacyModal, setShowPharmacyModal] = useState(false);
  const [pharmacyItems, setPharmacyItems] = useState<PharmacyStockItem[]>([]);
  const [loadingPharmacy, setLoadingPharmacy] = useState(false);
  const [showAddDrugForm, setShowAddDrugForm] = useState(false);
  const [newDrugForm, setNewDrugForm] = useState({
    name: '',
    category: 'MEDICATION',
    batchNumber: '',
    expiryDate: '',
    unit: 'tablets',
    stock: 100,
    reorderLevel: 20,
    unitCost: 0.5,
    unitPrice: 1.0,
    location: 'Sick Bay Shelf A'
  });
  const [dispenseForm, setDispenseForm] = useState({
    itemId: '',
    patientId: '',
    quantity: 1,
    notes: ''
  });

  // Add Medical Record Modal State
  const [submitting, setSubmitting] = useState(false);
  const [showAddRecordModal, setShowAddRecordModal] = useState<PatientUser | null>(null);
  const [recordType, setRecordType] = useState<'COMPLAINT' | 'APPOINTMENT' | 'IMMUNIZATION' | 'REFERRAL' | 'HOSPITALIZATION'>('COMPLAINT');

  const [complaintForm, setComplaintForm] = useState({
    title: '',
    symptoms: '',
    medicine: '',
    date: new Date().toISOString().split('T')[0]
  });

  const [appointmentForm, setAppointmentForm] = useState({
    appointment: '',
    symptoms: '',
    date: new Date().toISOString().split('T')[0]
  });

  const [immunizationForm, setImmunizationForm] = useState({
    title: '',
    details: '',
    date: new Date().toISOString().split('T')[0]
  });

  const [referralForm, setReferralForm] = useState({
    title: '',
    details: '',
    to: '',
    address: '',
    date: new Date().toISOString().split('T')[0]
  });

  const [hospitalizationForm, setHospitalizationForm] = useState({
    reasonForAdmission: '',
    admissionType: 'PLANNED',
    emergencyContacts: '',
    medicalHistory: '',
    currentMedications: '',
    insurance: '',
    lifestyle: '',
    consentTreatment: false,
    consentPrivacy: false,
    consentRelease: false
  });



  const fetchPharmacyInventory = useCallback(async () => {
    try {
      setLoadingPharmacy(true);
      const res = await api.get('/api/clinic/pharmacy/inventory');
      setPharmacyItems(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error('Fetch pharmacy inventory error:', err);
      showToast('Failed to load pharmacy stock', 'error');
    } finally {
      setLoadingPharmacy(false);
    }
  }, [showToast]);

  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get('/api/users');
      setUsers(res.data?.users || (Array.isArray(res.data) ? res.data : []));
    } catch (err) {
      console.error('Fetch users error:', err);
      showToast('Failed to load patient database', 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  useEffect(() => {
    if (showPharmacyModal) {
      fetchPharmacyInventory();
    }
  }, [showPharmacyModal, fetchPharmacyInventory]);

  const fetchPatientHistory = async (targetUser: PatientUser) => {
    setSelectedUser(targetUser);
    setLoadingHistory(true);
    try {
      const [compRes, appRes, immRes, refRes, hospRes] = await Promise.all([
        api.get('/api/clinic/complaints'),
        api.get('/api/clinic/appointments'),
        api.get('/api/clinic/immunizations'),
        api.get('/api/clinic/referrals'),
        api.get(`/api/clinic/patient/${targetUser.id}/hospitalizations`)
      ]);

      // Filter each record type by the patient's userId
      const userId = targetUser.id;
      setHistory({
        complaints: (compRes.data || []).filter((x: ComplaintRecord) => x.userId === userId),
        appointments: (appRes.data || []).filter((x: AppointmentRecord) => x.userId === userId),
        immunizations: (immRes.data || []).filter((x: ImmunizationRecord) => x.userId === userId),
        referrals: (refRes.data || []).filter((x: ReferralRecord) => x.userId === userId),
        hospitalizations: hospRes.data || []
      });
    } catch (err) {
      console.error('Fetch patient medical history error:', err);
      showToast('Failed to retrieve patient medical history', 'error');
    } finally {
      setLoadingHistory(false);
    }
  };

  const handleAddRecordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!showAddRecordModal) return;
    setSubmitting(true);

    try {
      const targetUserId = showAddRecordModal.id;
      if (recordType === 'COMPLAINT') {
        if (!complaintForm.title || !complaintForm.symptoms) {
          showToast('Please specify complaint title and symptoms', 'warning');
          setSubmitting(false);
          return;
        }
        await api.post('/api/clinic/complaints', { ...complaintForm, targetUserId });
        showToast('Complaint registered successfully', 'success');
        setComplaintForm({ title: '', symptoms: '', medicine: '', date: new Date().toISOString().split('T')[0] });
      } else if (recordType === 'APPOINTMENT') {
        if (!appointmentForm.appointment || !appointmentForm.date) {
          showToast('Please specify appointment reason and schedule date', 'warning');
          setSubmitting(false);
          return;
        }
        await api.post('/api/clinic/appointments', { ...appointmentForm, targetUserId });
        showToast('Appointment booked successfully', 'success');
      } else if (recordType === 'IMMUNIZATION') {
        if (!immunizationForm.title) {
          showToast('Please specify vaccine title', 'warning');
          setSubmitting(false);
          return;
        }
        await api.post('/api/clinic/immunizations', { ...immunizationForm, targetUserId });
        showToast('Immunization record added', 'success');
        setImmunizationForm({ title: '', details: '', date: new Date().toISOString().split('T')[0] });
      } else if (recordType === 'REFERRAL') {
        if (!referralForm.title || !referralForm.to) {
          showToast('Please specify referral reason and hospital name', 'warning');
          setSubmitting(false);
          return;
        }
        await api.post('/api/clinic/referrals', { ...referralForm, targetUserId });
        showToast('Referral created successfully', 'success');
        setReferralForm({ title: '', details: '', to: '', address: '', date: new Date().toISOString().split('T')[0] });
      } else if (recordType === 'HOSPITALIZATION') {
        if (!hospitalizationForm.reasonForAdmission) {
          showToast('Please specify the reason for admission', 'warning');
          setSubmitting(false);
          return;
        }
        await api.post('/api/clinic/hospitalizations', { 
           targetUserId, 
           preAdmissionData: hospitalizationForm 
        });
        showToast('Hospitalization initiated', 'success');
        setHospitalizationForm({ 
          reasonForAdmission: '', admissionType: 'PLANNED', emergencyContacts: '', 
          medicalHistory: '', currentMedications: '', insurance: '', lifestyle: '', 
          consentTreatment: false, consentPrivacy: false, consentRelease: false 
        });
      }

      setShowAddRecordModal(null);
      if (selectedUser && selectedUser.id === targetUserId) {
        fetchPatientHistory(selectedUser);
      }
    } catch (error: unknown) {
      console.error('Save medical record error:', error);
      const err = error as { response?: { data?: { error?: string } } };
      showToast(err.response?.data?.error || 'Failed to save medical record', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleRegisterWalkin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!walkinForm.firstName || !walkinForm.lastName) {
      showToast('First and last name are required', 'warning');
      return;
    }
    setSubmitting(true);
    try {
      await api.post('/api/clinic/walkin-patients', walkinForm);
      showToast('Walk-in patient registered successfully', 'success');
      setWalkinForm({
        firstName: '',
        lastName: '',
        dob: '',
        gender: 'MALE',
        contactNumber: '',
        address: '',
        bloodType: '',
        allergies: '',
        chronicConditions: '',
        guardianName: '',
        guardianContact: ''
      });
      setShowWalkinModal(false);
      fetchUsers();
    } catch (error: unknown) {
      console.error('Register walk-in error:', error);
      const err = error as { response?: { data?: { error?: string } } };
      showToast(err.response?.data?.error || 'Failed to register walk-in patient', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleAddDrugSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDrugForm.name) {
      showToast('Medication name is required', 'warning');
      return;
    }
    setSubmitting(true);
    try {
      await api.post('/api/clinic/pharmacy/inventory', newDrugForm);
      showToast('Pharmacy item added successfully', 'success');
      setNewDrugForm({
        name: '',
        category: 'MEDICATION',
        batchNumber: '',
        expiryDate: '',
        unit: 'tablets',
        stock: 100,
        reorderLevel: 20,
        unitCost: 0.5,
        unitPrice: 1.0,
        location: 'Sick Bay Shelf A'
      });
      setShowAddDrugForm(false);
      fetchPharmacyInventory();
    } catch (error: unknown) {
      console.error('Add drug error:', error);
      const err = error as { response?: { data?: { error?: string } } };
      showToast(err.response?.data?.error || 'Failed to add pharmacy item', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDispenseSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!dispenseForm.itemId) {
      showToast('Please select a medication to dispense', 'warning');
      return;
    }
    setSubmitting(true);
    try {
      await api.post('/api/clinic/pharmacy/dispense', dispenseForm);
      showToast('Medication dispensed successfully', 'success');
      setDispenseForm({
        itemId: '',
        patientId: '',
        quantity: 1,
        notes: ''
      });
      fetchPharmacyInventory();
    } catch (error: unknown) {
      console.error('Dispense error:', error);
      const err = error as { response?: { data?: { error?: string } } };
      showToast(err.response?.data?.error || 'Failed to dispense medication', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const filteredUsers = (Array.isArray(users) ? users : []).filter(u => {
    if (!u) return false;
    const name = u.name || '';
    const email = u.email || '';
    const staffId = u.staffId || u.student?.studentId || '';
    const matchesSearch = name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      staffId.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = roleFilter === 'ALL' || u.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  return (
    <>
      <div className="portal-page-header">
        <h1>Patient Management</h1>
        <p>Manage all student and staff medical records dynamically.</p>
      </div>

      <div className="portal-card">
        <div className="portal-card-header portal-flex-between">
          <h2><i className="fas fa-users mr-2 portal-icon-green"></i>Patient Database</h2>
          <div className="portal-filter-bar">
            <button
              type="button"
              className="portal-btn-green portal-btn-icon-label"
              onClick={() => setShowPharmacyModal(true)}
            >
              <i className="fas fa-pills"></i> Pharmacy & Dispensary
            </button>
            <button
              type="button"
              className="portal-btn-blue portal-btn-icon-label"
              onClick={() => setShowWalkinModal(true)}
            >
              <i className="fas fa-user-plus"></i> Register Walk-in Patient
            </button>
            <select
              id="patientRoleFilter"
              name="patientRoleFilter"
              title="Filter by role"
              aria-label="Filter by role"
              className="portal-input portal-min-w-140"
              value={roleFilter}
              onChange={e => setRoleFilter(e.target.value)}
            >
              <option value="ALL">All Roles</option>
              <option value="STUDENT">Students</option>
              <option value="TEACHER">Teachers</option>
              <option value="ANCILLARY">Ancillary Staff</option>
              <option value="BURSAR">Bursars</option>
              <option value="SCHOOL_ADMIN">Admins</option>
            </select>
            <input
              type="text"
              id="patientSearchTerm"
              name="patientSearchTerm"
              title="Search by name, email, ID..."
              aria-label="Search by name, email, ID..."
              className="portal-input portal-min-w-200"
              placeholder="Search by name, email, ID..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
        <div className="portal-card-body p-0">
          {loading ? (
            <div className="portal-loading-card">
              <i className="fas fa-spinner fa-spin mr-2"></i> Loading patients...
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="portal-empty-card">
              No matching records found.
            </div>
          ) : (
            <table className="portal-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Role</th>
                  <th>ID / Code</th>
                  <th>Email</th>
                  <th>Phone</th>
                  <th className="text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map(u => (
                  <tr key={u.id}>
                    <td className="font-bold">{u.name}</td>
                    <td><span className={`portal-badge ${u.role === 'STUDENT' ? 'success' : 'info'}`}>{u.role}</span></td>
                    <td>{u.staffId || u.student?.studentId || 'N/A'}</td>
                    <td>{u.email}</td>
                    <td>{u.phone || 'N/A'}</td>
                    <td className="text-right">
                      <button
                        type="button"
                        className="portal-btn-secondary mr-2 portal-btn-icon-label"
                        title="View Medical History"
                        aria-label="View Medical History"
                        onClick={() => fetchPatientHistory(u)}
                      >
                        <i className="fas fa-eye portal-icon-blue"></i> History
                      </button>
                      <button
                        type="button"
                        className="portal-btn-green portal-btn-icon-label"
                        title="Record Clinical Note"
                        aria-label="Record Clinical Note"
                        onClick={() => setShowAddRecordModal(u)}
                      >
                        <i className="fas fa-plus"></i> Record
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Patient Medical History Drawer / Modal */}
      {selectedUser && (
        <div className="portal-modal-backdrop">
          <div className="portal-modal-content-lg">
            <button
              type="button"
              className="portal-modal-close"
              title="Close Patient History"
              aria-label="Close Patient History"
              onClick={() => setSelectedUser(null)}
            >
              &times;
            </button>
            <h2 className="portal-modal-title">
              <i className="fas fa-notes-medical mr-2 portal-icon-green"></i>
              Medical File: {selectedUser.name}
            </h2>
            <p className="portal-modal-subtitle">Role: {selectedUser.role} | ID: {selectedUser.staffId || selectedUser.student?.studentId || 'N/A'}</p>

            {loadingHistory ? (
              <div className="portal-loading-card">
                <i className="fas fa-spinner fa-spin mr-2"></i> Fetching records...
              </div>
            ) : (
              <div className="portal-card-column-gap">
                {/* Complaints */}
                <div>
                  <h3 className="portal-history-title-red">
                    <i className="fas fa-heartbeat mr-2"></i> Complaints & Diagnoses
                  </h3>
                  {history.complaints.length === 0 ? (
                    <p className="portal-empty-text">No recorded complaints.</p>
                  ) : (
                    <div className="portal-card-list-grid">
                      {history.complaints.map(c => (
                        <div key={c.id} className="portal-history-card-complaint">
                          <div className="portal-card-header-row">
                            <span>{c.title}</span>
                            <span className="portal-text-red">{new Date(c.date).toLocaleDateString()}</span>
                          </div>
                          <p className="portal-card-subtext"><strong>Symptoms:</strong> {c.symptoms}</p>
                          {c.medicine && <p className="portal-card-rx"><strong>Rx:</strong> {c.medicine}</p>}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Appointments */}
                <div>
                  <h3 className="portal-history-title-blue">
                    <i className="fas fa-calendar-check mr-2"></i> Clinic Appointments
                  </h3>
                  {history.appointments.length === 0 ? (
                    <p className="portal-empty-text">No recorded appointments.</p>
                  ) : (
                    <div className="portal-card-list-grid">
                      {history.appointments.map(a => (
                        <div key={a.id} className="portal-history-card-appointment">
                          <div className="portal-card-header-row">
                            <span>Reason: {a.appointment}</span>
                            <span className="portal-text-blue">{new Date(a.date).toLocaleString()}</span>
                          </div>
                          {a.symptoms && <p className="portal-card-subtext"><strong>Symptoms:</strong> {a.symptoms}</p>}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Immunizations */}
                <div>
                  <h3 className="portal-history-title-green">
                    <i className="fas fa-syringe mr-2"></i> Immunization History
                  </h3>
                  {history.immunizations.length === 0 ? (
                    <p className="portal-empty-text">No recorded immunizations.</p>
                  ) : (
                    <div className="portal-card-list-grid">
                      {history.immunizations.map(i => (
                        <div key={i.id} className="portal-history-card-immunization">
                          <div className="portal-card-header-row">
                            <span>{i.title}</span>
                            <span className="portal-text-green">{new Date(i.date).toLocaleDateString()}</span>
                          </div>
                          {i.details && <p className="portal-card-subtext">{i.details}</p>}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Referrals */}
                <div>
                  <h3 className="portal-history-title-purple">
                    <i className="fas fa-file-medical mr-2"></i> Referrals
                  </h3>
                  {history.referrals.length === 0 ? (
                    <p className="portal-empty-text">No recorded referrals.</p>
                  ) : (
                    <div className="portal-card-list-grid">
                      {history.referrals.map(r => (
                        <div key={r.id} className="portal-history-card-referral">
                          <div className="portal-card-header-row">
                            <span>Referred to: {r.to}</span>
                            <span className="portal-text-purple">{new Date(r.date).toLocaleDateString()}</span>
                          </div>
                          <p className="portal-card-subtext"><strong>Reason:</strong> {r.title}</p>
                          {r.details && <p className="portal-card-subtext"><strong>Details:</strong> {r.details}</p>}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                
                {/* Hospitalizations */}
                <div>
                  <h3 className="portal-history-title-amber">
                    <i className="fas fa-procedures mr-2"></i> Hospitalizations
                  </h3>
                  {history.hospitalizations.length === 0 ? (
                    <p className="portal-empty-text">No recorded hospitalizations.</p>
                  ) : (
                    <div className="portal-card-list-grid">
                      {history.hospitalizations.map(h => (
                        <div key={h.id} className="portal-history-card-hospitalization">
                          <div className="portal-card-header-row">
                            <span>Stage: {h.stage.replace('_', ' ')}</span>
                            <span className="portal-text-amber">{new Date(h.createdAt).toLocaleDateString()}</span>
                          </div>
                          {h.preAdmissionData?.reasonForAdmission && (
                             <p className="portal-card-subtext"><strong>Reason:</strong> {h.preAdmissionData.reasonForAdmission}</p>
                          )}
                          <div className="portal-card-action-row">
                            <a href={`/clinic/hospitalizations/${h.id}`} target="_blank" rel="noreferrer" className="portal-link">Manage / Print Discharge Summary</a>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Add Medical Record Popup Modal */}
      {showAddRecordModal && (
        <div className="portal-modal-backdrop">
          <div className="portal-modal-content-sm">
            <button
              type="button"
              className="portal-modal-close"
              title="Close Add Medical Record"
              aria-label="Close Add Medical Record"
              onClick={() => setShowAddRecordModal(null)}
            >
              &times;
            </button>
            <h2 className="portal-modal-title">
              Add Medical Record
            </h2>
            <p className="portal-modal-subtitle">Registering clinical note for patient: {showAddRecordModal.name}</p>

            <div className="portal-tabs-bar">
              {(['COMPLAINT', 'APPOINTMENT', 'IMMUNIZATION', 'REFERRAL', 'HOSPITALIZATION'] as const).map(type => (
                <button
                  type="button"
                  key={type}
                  onClick={() => setRecordType(type)}
                  className={`portal-tab-btn ${recordType === type ? 'portal-tab-btn-active' : ''}`}
                >
                  {type}
                </button>
              ))}
            </div>

            <form onSubmit={handleAddRecordSubmit}>
              {recordType === 'COMPLAINT' && (
                <>
                  <div className="portal-form-group">
                    <label className="portal-label" htmlFor="complaintTitle">Complaint Title *</label>
                    <input
                      type="text"
                      id="complaintTitle"
                      name="complaintTitle"
                      title="Complaint Title"
                      aria-label="Complaint Title"
                      className="portal-input"
                      placeholder="e.g. Flu, Stomach Ache"
                      value={complaintForm.title}
                      onChange={e => setComplaintForm({ ...complaintForm, title: e.target.value })}
                      required
                    />
                  </div>
                  <div className="portal-form-group">
                    <label className="portal-label" htmlFor="complaintSymptoms">Symptoms *</label>
                    <textarea
                      id="complaintSymptoms"
                      name="complaintSymptoms"
                      title="Symptoms"
                      aria-label="Symptoms"
                      className="portal-input"
                      rows={3}
                      placeholder="Describe symptoms..."
                      value={complaintForm.symptoms}
                      onChange={e => setComplaintForm({ ...complaintForm, symptoms: e.target.value })}
                      required
                    ></textarea>
                  </div>
                  <div className="portal-form-group">
                    <label className="portal-label" htmlFor="complaintMedicine">Prescription (Medicine)</label>
                    <input
                      type="text"
                      id="complaintMedicine"
                      name="complaintMedicine"
                      title="Prescription (Medicine)"
                      aria-label="Prescription (Medicine)"
                      className="portal-input"
                      placeholder="Prescribed medicine..."
                      value={complaintForm.medicine}
                      onChange={e => setComplaintForm({ ...complaintForm, medicine: e.target.value })}
                    />
                  </div>
                </>
              )}

              {recordType === 'APPOINTMENT' && (
                <>
                  <div className="portal-form-group">
                    <label className="portal-label" htmlFor="appointmentTitle">Appointment Title / Purpose *</label>
                    <input
                      type="text"
                      id="appointmentTitle"
                      name="appointmentTitle"
                      title="Appointment Title / Purpose"
                      aria-label="Appointment Title / Purpose"
                      className="portal-input"
                      placeholder="e.g. Regular Checkup, Dental check"
                      value={appointmentForm.appointment}
                      onChange={e => setAppointmentForm({ ...appointmentForm, appointment: e.target.value })}
                      required
                    />
                  </div>
                  <div className="portal-form-group">
                    <label className="portal-label" htmlFor="appointmentSymptoms">Symptoms / Notes</label>
                    <textarea
                      id="appointmentSymptoms"
                      name="appointmentSymptoms"
                      title="Symptoms / Notes"
                      aria-label="Symptoms / Notes"
                      className="portal-input"
                      rows={2}
                      placeholder="Note down complaints..."
                      value={appointmentForm.symptoms}
                      onChange={e => setAppointmentForm({ ...appointmentForm, symptoms: e.target.value })}
                    ></textarea>
                  </div>
                  <div className="portal-form-group">
                    <label className="portal-label" htmlFor="appointmentDate">Schedule Date & Time *</label>
                    <input
                      type="datetime-local"
                      id="appointmentDate"
                      name="appointmentDate"
                      title="Schedule Date & Time"
                      aria-label="Schedule Date & Time"
                      placeholder="Select schedule date & time"
                      className="portal-input"
                      value={appointmentForm.date}
                      onChange={e => setAppointmentForm({ ...appointmentForm, date: e.target.value })}
                      required
                    />
                  </div>
                </>
              )}

              {recordType === 'IMMUNIZATION' && (
                <>
                  <div className="portal-form-group">
                    <label className="portal-label" htmlFor="immunizationTitle">Vaccine Title *</label>
                    <input
                      type="text"
                      id="immunizationTitle"
                      name="immunizationTitle"
                      title="Vaccine Title"
                      aria-label="Vaccine Title"
                      className="portal-input"
                      placeholder="e.g. BCG, Tetanus, COVID-19"
                      value={immunizationForm.title}
                      onChange={e => setImmunizationForm({ ...immunizationForm, title: e.target.value })}
                      required
                    />
                  </div>
                  <div className="portal-form-group">
                    <label className="portal-label" htmlFor="immunizationDetails">Immunization details</label>
                    <textarea
                      id="immunizationDetails"
                      name="immunizationDetails"
                      title="Immunization details"
                      aria-label="Immunization details"
                      className="portal-input"
                      rows={3}
                      placeholder="Dosage, batch, remarks..."
                      value={immunizationForm.details}
                      onChange={e => setImmunizationForm({ ...immunizationForm, details: e.target.value })}
                    ></textarea>
                  </div>
                </>
              )}

              {recordType === 'REFERRAL' && (
                <>
                  <div className="portal-form-group">
                    <label className="portal-label" htmlFor="referralTitle">Reason for Referral *</label>
                    <input
                      type="text"
                      id="referralTitle"
                      name="referralTitle"
                      title="Reason for Referral"
                      aria-label="Reason for Referral"
                      className="portal-input"
                      placeholder="e.g. Secondary Specialist consult"
                      value={referralForm.title}
                      onChange={e => setReferralForm({ ...referralForm, title: e.target.value })}
                      required
                    />
                  </div>
                  <div className="portal-form-group">
                    <label className="portal-label" htmlFor="referralTo">Referral Target Hospital / Specialist *</label>
                    <input
                      type="text"
                      id="referralTo"
                      name="referralTo"
                      title="Referral Target Hospital / Specialist"
                      aria-label="Referral Target Hospital / Specialist"
                      className="portal-input"
                      placeholder="Hospital Name"
                      value={referralForm.to}
                      onChange={e => setReferralForm({ ...referralForm, to: e.target.value })}
                      required
                    />
                  </div>
                  <div className="portal-form-group">
                    <label className="portal-label" htmlFor="referralAddress">Hospital Address</label>
                    <input
                      type="text"
                      id="referralAddress"
                      name="referralAddress"
                      title="Hospital Address"
                      aria-label="Hospital Address"
                      className="portal-input"
                      placeholder="Hospital address details..."
                      value={referralForm.address}
                      onChange={e => setReferralForm({ ...referralForm, address: e.target.value })}
                    />
                  </div>
                  <div className="portal-form-group">
                    <label className="portal-label" htmlFor="referralDetails">Clinical Details / Diagnostic Summary</label>
                    <textarea
                      id="referralDetails"
                      name="referralDetails"
                      title="Clinical Details / Diagnostic Summary"
                      aria-label="Clinical Details / Diagnostic Summary"
                      className="portal-input"
                      rows={2}
                      placeholder="Patient medical details to pass along..."
                      value={referralForm.details}
                      onChange={e => setReferralForm({ ...referralForm, details: e.target.value })}
                    ></textarea>
                  </div>
                </>
              )}

              {recordType === 'HOSPITALIZATION' && (
                <>
                  <div className="portal-modal-grid-2">
                    <div className="portal-form-group">
                      <label className="portal-label" htmlFor="hospAdmissionType">Admission Type *</label>
                      <select 
                        id="hospAdmissionType"
                        name="hospAdmissionType"
                        title="Admission Type"
                        aria-label="Admission Type"
                        className="portal-input" 
                        value={hospitalizationForm.admissionType}
                        onChange={e => setHospitalizationForm({...hospitalizationForm, admissionType: e.target.value})}
                      >
                        <option value="PLANNED">Planned Procedure</option>
                        <option value="EMERGENCY">Emergency Condition</option>
                        <option value="OBSERVATION">Observation</option>
                      </select>
                    </div>
                    <div className="portal-form-group">
                      <label className="portal-label" htmlFor="hospReason">Reason Details *</label>
                      <input
                        type="text"
                        id="hospReason"
                        name="hospReason"
                        title="Reason Details"
                        aria-label="Reason Details"
                        className="portal-input"
                        placeholder="Detailed reason..."
                        value={hospitalizationForm.reasonForAdmission}
                        onChange={e => setHospitalizationForm({ ...hospitalizationForm, reasonForAdmission: e.target.value })}
                        required
                      />
                    </div>
                    
                    <div className="portal-form-group">
                      <label className="portal-label" htmlFor="hospEmergencyContacts">Emergency Contacts</label>
                      <textarea
                        id="hospEmergencyContacts"
                        name="hospEmergencyContacts"
                        title="Emergency Contacts"
                        aria-label="Emergency Contacts"
                        className="portal-input"
                        rows={2}
                        placeholder="Names, relationships, numbers..."
                        value={hospitalizationForm.emergencyContacts}
                        onChange={e => setHospitalizationForm({ ...hospitalizationForm, emergencyContacts: e.target.value })}
                      ></textarea>
                    </div>
                    
                    <div className="portal-form-group">
                      <label className="portal-label" htmlFor="hospMedicalHistory">Medical History</label>
                      <textarea
                        id="hospMedicalHistory"
                        name="hospMedicalHistory"
                        title="Medical History"
                        aria-label="Medical History"
                        className="portal-input"
                        rows={2}
                        placeholder="Chronic conditions, surgeries, allergies..."
                        value={hospitalizationForm.medicalHistory}
                        onChange={e => setHospitalizationForm({ ...hospitalizationForm, medicalHistory: e.target.value })}
                      ></textarea>
                    </div>

                    <div className="portal-form-group">
                      <label className="portal-label" htmlFor="hospCurrentMedications">Current Medications</label>
                      <textarea
                        id="hospCurrentMedications"
                        name="hospCurrentMedications"
                        title="Current Medications"
                        aria-label="Current Medications"
                        className="portal-input"
                        rows={2}
                        placeholder="Dosage, frequency, OTC..."
                        value={hospitalizationForm.currentMedications}
                        onChange={e => setHospitalizationForm({ ...hospitalizationForm, currentMedications: e.target.value })}
                      ></textarea>
                    </div>
                    
                    <div className="portal-form-group">
                      <label className="portal-label" htmlFor="hospLifestyle">Lifestyle / Social Factors</label>
                      <textarea
                        id="hospLifestyle"
                        name="hospLifestyle"
                        title="Lifestyle / Social Factors"
                        aria-label="Lifestyle / Social Factors"
                        className="portal-input"
                        rows={2}
                        placeholder="Occupation, living situation, smoking..."
                        value={hospitalizationForm.lifestyle}
                        onChange={e => setHospitalizationForm({ ...hospitalizationForm, lifestyle: e.target.value })}
                      ></textarea>
                    </div>
                    
                    <div className="portal-form-group grid-col-full">
                      <label className="portal-label" htmlFor="hospInsurance">Insurance / Financial Info</label>
                      <input
                        type="text"
                        id="hospInsurance"
                        name="hospInsurance"
                        title="Insurance / Financial Info"
                        aria-label="Insurance / Financial Info"
                        className="portal-input"
                        placeholder="Coverage details, co-payments..."
                        value={hospitalizationForm.insurance}
                        onChange={e => setHospitalizationForm({ ...hospitalizationForm, insurance: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="portal-consent-box">
                    <h4 className="portal-consent-title">Required Consents</h4>
                    <label className="portal-checkbox-label" htmlFor="consentTreatment">
                      <input
                        type="checkbox"
                        id="consentTreatment"
                        name="consentTreatment"
                        title="Consent for Treatment"
                        aria-label="Consent for Treatment"
                        checked={hospitalizationForm.consentTreatment}
                        onChange={e => setHospitalizationForm({...hospitalizationForm, consentTreatment: e.target.checked})}
                      />
                      Consent for Treatment
                    </label>
                    <label className="portal-checkbox-label" htmlFor="consentPrivacy">
                      <input
                        type="checkbox"
                        id="consentPrivacy"
                        name="consentPrivacy"
                        title="Consent for Data Privacy"
                        aria-label="Consent for Data Privacy"
                        checked={hospitalizationForm.consentPrivacy}
                        onChange={e => setHospitalizationForm({...hospitalizationForm, consentPrivacy: e.target.checked})}
                      />
                      Consent for Data Privacy
                    </label>
                    <label className="portal-checkbox-label" htmlFor="consentRelease">
                      <input
                        type="checkbox"
                        id="consentRelease"
                        name="consentRelease"
                        title="Consent for Release of Medical Info"
                        aria-label="Consent for Release of Medical Info"
                        checked={hospitalizationForm.consentRelease}
                        onChange={e => setHospitalizationForm({...hospitalizationForm, consentRelease: e.target.checked})}
                      />
                      Consent for Release of Medical Info
                    </label>
                  </div>
                </>
              )}

              <button
                type="submit"
                className="portal-btn-primary portal-btn-full-green"
                disabled={submitting}
              >
                {submitting ? 'Registering...' : 'Save Medical Record'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* WALK-IN PATIENT REGISTRATION MODAL */}
      {showWalkinModal && (
        <div className="portal-modal-overlay">
          <div className="portal-modal-card portal-modal-card-md">
            <div className="portal-modal-header">
              <h3 className="portal-flex-align-gap-8">
                <i className="fas fa-user-plus portal-icon-blue"></i>
                Register Community / Walk-in Patient
              </h3>
              <button
                type="button"
                className="portal-modal-close"
                title="Close Walk-in Registration"
                aria-label="Close Walk-in Registration"
                onClick={() => setShowWalkinModal(false)}
              >
                &times;
              </button>
            </div>
            <form onSubmit={handleRegisterWalkin} className="portal-flex-col-gap-12">
              <div className="portal-modal-grid-2">
                <div className="portal-form-group">
                  <label className="portal-label" htmlFor="walkinFirstName">First Name *</label>
                  <input
                    type="text"
                    id="walkinFirstName"
                    name="walkinFirstName"
                    title="First Name"
                    aria-label="First Name"
                    placeholder="Enter first name"
                    className="portal-input"
                    required
                    value={walkinForm.firstName}
                    onChange={e => setWalkinForm({ ...walkinForm, firstName: e.target.value })}
                  />
                </div>
                <div className="portal-form-group">
                  <label className="portal-label" htmlFor="walkinLastName">Last Name *</label>
                  <input
                    type="text"
                    id="walkinLastName"
                    name="walkinLastName"
                    title="Last Name"
                    aria-label="Last Name"
                    placeholder="Enter last name"
                    className="portal-input"
                    required
                    value={walkinForm.lastName}
                    onChange={e => setWalkinForm({ ...walkinForm, lastName: e.target.value })}
                  />
                </div>
                <div className="portal-form-group">
                  <label className="portal-label" htmlFor="walkinDob">Date of Birth</label>
                  <input
                    type="date"
                    id="walkinDob"
                    name="walkinDob"
                    title="Date of Birth"
                    aria-label="Date of Birth"
                    placeholder="Select date of birth"
                    className="portal-input"
                    value={walkinForm.dob}
                    onChange={e => setWalkinForm({ ...walkinForm, dob: e.target.value })}
                  />
                </div>
                <div className="portal-form-group">
                  <label className="portal-label" htmlFor="walkinGender">Gender</label>
                  <select
                    id="walkinGender"
                    name="walkinGender"
                    title="Gender"
                    aria-label="Gender"
                    className="portal-input"
                    value={walkinForm.gender}
                    onChange={e => setWalkinForm({ ...walkinForm, gender: e.target.value })}
                  >
                    <option value="MALE">Male</option>
                    <option value="FEMALE">Female</option>
                    <option value="OTHER">Other</option>
                  </select>
                </div>
                <div className="portal-form-group">
                  <label className="portal-label" htmlFor="walkinPhone">Contact Phone</label>
                  <input
                    type="text"
                    id="walkinPhone"
                    name="walkinPhone"
                    title="Contact Phone"
                    aria-label="Contact Phone"
                    className="portal-input"
                    placeholder="+263..."
                    value={walkinForm.contactNumber}
                    onChange={e => setWalkinForm({ ...walkinForm, contactNumber: e.target.value })}
                  />
                </div>
                <div className="portal-form-group">
                  <label className="portal-label" htmlFor="walkinBloodType">Blood Group</label>
                  <select
                    id="walkinBloodType"
                    name="walkinBloodType"
                    title="Blood Group"
                    aria-label="Blood Group"
                    className="portal-input"
                    value={walkinForm.bloodType}
                    onChange={e => setWalkinForm({ ...walkinForm, bloodType: e.target.value })}
                  >
                    <option value="">Unknown</option>
                    <option value="A+">A+</option>
                    <option value="A-">A-</option>
                    <option value="B+">B+</option>
                    <option value="B-">B-</option>
                    <option value="AB+">AB+</option>
                    <option value="AB-">AB-</option>
                    <option value="O+">O+</option>
                    <option value="O-">O-</option>
                  </select>
                </div>
              </div>

              <div className="portal-modal-grid-2">
                <div className="portal-form-group">
                  <label className="portal-label" htmlFor="walkinAllergies">Known Allergies</label>
                  <input
                    type="text"
                    id="walkinAllergies"
                    name="walkinAllergies"
                    title="Known Allergies"
                    aria-label="Known Allergies"
                    className="portal-input"
                    placeholder="e.g. Penicillin, Sulfa"
                    value={walkinForm.allergies}
                    onChange={e => setWalkinForm({ ...walkinForm, allergies: e.target.value })}
                  />
                </div>
                <div className="portal-form-group">
                  <label className="portal-label" htmlFor="walkinChronic">Chronic Conditions</label>
                  <input
                    type="text"
                    id="walkinChronic"
                    name="walkinChronic"
                    title="Chronic Conditions"
                    aria-label="Chronic Conditions"
                    className="portal-input"
                    placeholder="e.g. Asthma, Hypertension"
                    value={walkinForm.chronicConditions}
                    onChange={e => setWalkinForm({ ...walkinForm, chronicConditions: e.target.value })}
                  />
                </div>
              </div>

              <div className="portal-modal-grid-2">
                <div className="portal-form-group">
                  <label className="portal-label" htmlFor="walkinGuardianName">Next of Kin / Guardian Name</label>
                  <input
                    type="text"
                    id="walkinGuardianName"
                    name="walkinGuardianName"
                    title="Next of Kin / Guardian Name"
                    aria-label="Next of Kin / Guardian Name"
                    placeholder="Guardian full name"
                    className="portal-input"
                    value={walkinForm.guardianName}
                    onChange={e => setWalkinForm({ ...walkinForm, guardianName: e.target.value })}
                  />
                </div>
                <div className="portal-form-group">
                  <label className="portal-label" htmlFor="walkinGuardianContact">Guardian Contact Phone</label>
                  <input
                    type="text"
                    id="walkinGuardianContact"
                    name="walkinGuardianContact"
                    title="Guardian Contact Phone"
                    aria-label="Guardian Contact Phone"
                    placeholder="Guardian phone number"
                    className="portal-input"
                    value={walkinForm.guardianContact}
                    onChange={e => setWalkinForm({ ...walkinForm, guardianContact: e.target.value })}
                  />
                </div>
              </div>

              <div className="portal-form-group">
                <label className="portal-label" htmlFor="walkinAddress">Residential Address</label>
                <input
                  type="text"
                  id="walkinAddress"
                  name="walkinAddress"
                  title="Residential Address"
                  aria-label="Residential Address"
                  className="portal-input"
                  placeholder="Physical home address..."
                  value={walkinForm.address}
                  onChange={e => setWalkinForm({ ...walkinForm, address: e.target.value })}
                />
              </div>

              <button
                type="submit"
                className="portal-btn-primary portal-btn-full-blue"
                disabled={submitting}
              >
                {submitting ? 'Registering Patient...' : 'Save Walk-in Patient (Auto-Assign MRN)'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* PHARMACY & DISPENSARY MODAL */}
      {showPharmacyModal && (
        <div className="portal-modal-overlay">
          <div className="portal-modal-card portal-modal-card-xl">
            <div className="portal-modal-header">
              <h3 className="portal-flex-align-gap-8 portal-title-green">
                <i className="fas fa-pills"></i> Pharmacy Stock & Drug Dispensary
              </h3>
              <button
                type="button"
                className="portal-modal-close"
                title="Close Pharmacy Modal"
                aria-label="Close Pharmacy Modal"
                onClick={() => setShowPharmacyModal(false)}
              >
                &times;
              </button>
            </div>

            <div className="portal-flex-gap-10">
              <button
                type="button"
                className={`portal-btn-${showAddDrugForm ? 'secondary' : 'primary'} portal-btn-sm-text`}
                onClick={() => setShowAddDrugForm(!showAddDrugForm)}
              >
                <i className={`fas fa-${showAddDrugForm ? 'list' : 'plus'}`}></i> {showAddDrugForm ? 'View Stock Inventory' : 'Add Medication Stock'}
              </button>
            </div>

            {showAddDrugForm ? (
              <form onSubmit={handleAddDrugSubmit} className="portal-modal-grid-2">
                <div className="portal-form-group">
                  <label className="portal-label" htmlFor="drugName">Medication / Item Name *</label>
                  <input
                    type="text"
                    id="drugName"
                    name="drugName"
                    title="Medication / Item Name"
                    aria-label="Medication / Item Name"
                    className="portal-input"
                    required
                    placeholder="e.g. Paracetamol 500mg"
                    value={newDrugForm.name}
                    onChange={e => setNewDrugForm({ ...newDrugForm, name: e.target.value })}
                  />
                </div>
                <div className="portal-form-group">
                  <label className="portal-label" htmlFor="drugCategory">Category</label>
                  <select
                    id="drugCategory"
                    name="drugCategory"
                    title="Category"
                    aria-label="Category"
                    className="portal-input"
                    value={newDrugForm.category}
                    onChange={e => setNewDrugForm({ ...newDrugForm, category: e.target.value })}
                  >
                    <option value="MEDICATION">Medication (Analgesic, Antibiotic, etc)</option>
                    <option value="CONSUMABLE">Consumable (Bandages, Syringes)</option>
                    <option value="EQUIPMENT">Medical Equipment</option>
                  </select>
                </div>
                <div className="portal-form-group">
                  <label className="portal-label" htmlFor="drugBatchNumber">Batch / Lot Number</label>
                  <input
                    type="text"
                    id="drugBatchNumber"
                    name="drugBatchNumber"
                    title="Batch / Lot Number"
                    aria-label="Batch / Lot Number"
                    className="portal-input"
                    placeholder="e.g. LOT-2026-X"
                    value={newDrugForm.batchNumber}
                    onChange={e => setNewDrugForm({ ...newDrugForm, batchNumber: e.target.value })}
                  />
                </div>
                <div className="portal-form-group">
                  <label className="portal-label" htmlFor="drugExpiryDate">Expiry Date</label>
                  <input
                    type="date"
                    id="drugExpiryDate"
                    name="drugExpiryDate"
                    title="Expiry Date"
                    aria-label="Expiry Date"
                    placeholder="Select expiry date"
                    className="portal-input"
                    value={newDrugForm.expiryDate}
                    onChange={e => setNewDrugForm({ ...newDrugForm, expiryDate: e.target.value })}
                  />
                </div>
                <div className="portal-form-group">
                  <label className="portal-label" htmlFor="drugStock">Stock Quantity</label>
                  <input
                    type="number"
                    id="drugStock"
                    name="drugStock"
                    title="Stock Quantity"
                    aria-label="Stock Quantity"
                    placeholder="Quantity in stock"
                    className="portal-input"
                    required
                    min="1"
                    value={newDrugForm.stock}
                    onChange={e => setNewDrugForm({ ...newDrugForm, stock: parseInt(e.target.value) || 0 })}
                  />
                </div>
                <div className="portal-form-group">
                  <label className="portal-label" htmlFor="drugReorderLevel">Reorder Level Threshold</label>
                  <input
                    type="number"
                    id="drugReorderLevel"
                    name="drugReorderLevel"
                    title="Reorder Level Threshold"
                    aria-label="Reorder Level Threshold"
                    placeholder="Reorder threshold"
                    className="portal-input"
                    required
                    min="1"
                    value={newDrugForm.reorderLevel}
                    onChange={e => setNewDrugForm({ ...newDrugForm, reorderLevel: parseInt(e.target.value) || 0 })}
                  />
                </div>
                <div className="portal-form-group">
                  <label className="portal-label" htmlFor="drugUnitCost">Unit Cost ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    id="drugUnitCost"
                    name="drugUnitCost"
                    title="Unit Cost"
                    aria-label="Unit Cost ($)"
                    placeholder="Cost per unit"
                    className="portal-input"
                    required
                    value={newDrugForm.unitCost}
                    onChange={e => setNewDrugForm({ ...newDrugForm, unitCost: parseFloat(e.target.value) || 0 })}
                  />
                </div>
                <div className="portal-form-group">
                  <label className="portal-label" htmlFor="drugUnitPrice">Selling / Dispense Price ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    id="drugUnitPrice"
                    name="drugUnitPrice"
                    title="Selling / Dispense Price"
                    aria-label="Selling / Dispense Price ($)"
                    placeholder="Dispense price"
                    className="portal-input"
                    required
                    value={newDrugForm.unitPrice}
                    onChange={e => setNewDrugForm({ ...newDrugForm, unitPrice: parseFloat(e.target.value) || 0 })}
                  />
                </div>
                <div className="portal-form-group grid-col-full">
                  <button
                    type="submit"
                    className="portal-btn-primary portal-btn-full-green"
                    disabled={submitting}
                  >
                    {submitting ? 'Saving...' : 'Save Stock Item'}
                  </button>
                </div>
              </form>
            ) : (
              <>
                <div className="portal-dispense-box">
                  <h4 className="portal-dispense-title">Dispense Drug to Patient</h4>
                  <form onSubmit={handleDispenseSubmit} className="portal-dispense-grid">
                    <div>
                      <label className="portal-label" htmlFor="dispenseItemId">Select Drug *</label>
                      <select
                        id="dispenseItemId"
                        name="dispenseItemId"
                        title="Select Drug"
                        aria-label="Select Drug"
                        className="portal-input"
                        value={dispenseForm.itemId}
                        onChange={e => setDispenseForm({ ...dispenseForm, itemId: e.target.value })}
                        required
                      >
                        <option value="">-- Choose Stock Item --</option>
                        {pharmacyItems.map((item: PharmacyStockItem) => (
                          <option key={item.id} value={item.id} disabled={item.stock <= 0 || item.isExpired}>
                            {item.name} (Stock: {item.stock} {item.unit}) {item.isExpired ? ' - EXPIRED' : ''}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="portal-label" htmlFor="dispenseQuantity">Qty *</label>
                      <input
                        type="number"
                        id="dispenseQuantity"
                        name="dispenseQuantity"
                        title="Quantity"
                        aria-label="Quantity"
                        placeholder="Qty"
                        className="portal-input"
                        min="1"
                        required
                        value={dispenseForm.quantity}
                        onChange={e => setDispenseForm({ ...dispenseForm, quantity: parseInt(e.target.value) || 1 })}
                      />
                    </div>
                    <div>
                      <label className="portal-label" htmlFor="dispenseNotes">Dispense Notes</label>
                      <input
                        type="text"
                        id="dispenseNotes"
                        name="dispenseNotes"
                        title="Dispense Notes"
                        aria-label="Dispense Notes"
                        className="portal-input"
                        placeholder="Dosage notes..."
                        value={dispenseForm.notes}
                        onChange={e => setDispenseForm({ ...dispenseForm, notes: e.target.value })}
                      />
                    </div>
                    <button
                      type="submit"
                      className="portal-btn-primary portal-bg-green"
                      disabled={submitting}
                    >
                      {submitting ? 'Dispensing...' : 'Dispense'}
                    </button>
                  </form>
                </div>

                {loadingPharmacy ? (
                  <div className="portal-text-center-p30"><i className="fas fa-spinner fa-spin"></i> Loading stock...</div>
                ) : (
                  <table className="portal-table portal-table-sm">
                    <thead>
                      <tr>
                        <th>Item / Drug</th>
                        <th>Category</th>
                        <th>Batch</th>
                        <th>Expiry</th>
                        <th>In Stock</th>
                        <th>Unit Price</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pharmacyItems.length === 0 ? (
                        <tr><td colSpan={7} className="portal-table-empty">No pharmacy inventory items recorded.</td></tr>
                      ) : (
                        pharmacyItems.map((item: PharmacyStockItem) => (
                          <tr key={item.id}>
                            <td className="portal-td-bold">{item.name}</td>
                            <td>{item.category}</td>
                            <td>{item.batchNumber || 'N/A'}</td>
                            <td>{item.expiryDate ? new Date(item.expiryDate).toLocaleDateString() : 'N/A'}</td>
                            <td className={item.isLowStock ? 'portal-text-stock-danger' : 'portal-text-stock-success'}>{item.stock} {item.unit}</td>
                            <td>${item.unitPrice?.toFixed(2)}</td>
                            <td>
                              {item.isExpired ? (
                                <span className="portal-badge danger">EXPIRED</span>
                              ) : item.isExpiringSoon ? (
                                <span className="portal-badge warning">EXPIRING SOON</span>
                              ) : item.isLowStock ? (
                                <span className="portal-badge warning">LOW STOCK</span>
                              ) : (
                                <span className="portal-badge success">AVAILABLE</span>
                              )}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
