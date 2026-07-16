import React, { useState, useRef } from 'react';
import api from '../../lib/api';
import { useToast } from '../../context/ToastContext';
import SecondaryRoleSelect from './SecondaryRoleSelect';
import { useAuth } from '../../contexts/AuthContext';

const NATIONALITIES = [
  "Zimbabwean", "South African", "Malawian", "Zambian", "Mozambican", "Botswanan", "Namibian", "Angolan", "Lesotho", "Swazi",
  "Afghan", "Albanian", "Algerian", "American", "Andorran", "Antiguans", "Argentinean", "Armenian", "Australian", "Austrian", 
  "Azerbaijani", "Bahamian", "Bahraini", "Bangladeshi", "Barbadian", "Belarusian", "Belgian", "Belizean", "Beninese", "Bhutanese", 
  "Bolivian", "Bosnian", "Brazilian", "British", "Bruneian", "Bulgarian", "Burkinabe", "Burmese", "Burundian", "Cambodian", 
  "Cameroonian", "Canadian", "Cape Verdean", "Central African", "Chadian", "Chilean", "Chinese", "Colombian", "Comoran", 
  "Congolese", "Costa Rican", "Croatian", "Cuban", "Cypriot", "Czech", "Danish", "Djiboutian", "Dominican", "Dutch", 
  "East Timorese", "Ecuadorian", "Egyptian", "Emirati", "Equatorial Guinean", "Eritrean", "Estonian", "Ethiopian", "Fijian", 
  "Filipino", "Finnish", "French", "Gabonese", "Gambian", "Georgian", "German", "Ghanaian", "Greek", "Grenadian", 
  "Guatemalan", "Guinea-Bissauan", "Guinean", "Guyanese", "Haitian", "Honduran", "Hungarian", "Icelander", "Indian", 
  "Indonesian", "Iranian", "Iraqi", "Irish", "Israeli", "Italian", "Ivorian", "Jamaican", "Japanese", "Jordanian", 
  "Kazakhstani", "Kenyan", "Kuwaiti", "Kyrgyz", "Laotian", "Latvian", "Lebanese", "Liberian", "Libyan", "Liechtensteiner", 
  "Lithuanian", "Luxembourger", "Macedonian", "Malagasy", "Malaysian", "Maldivian", "Malian", "Maltese", "Marshallese", 
  "Mauritanian", "Mauritian", "Mexican", "Micronesian", "Moldovan", "Monacan", "Mongolian", "Moroccan", "Nauruan", 
  "Nepalese", "New Zealander", "Nicaraguan", "Nigerian", "Nigerien", "North Korean", "Norwegian", "Omani", "Pakistani", 
  "Palauan", "Panamanian", "Papua New Guinean", "Paraguayan", "Peruvian", "Polish", "Portuguese", "Qatari", "Romanian", 
  "Russian", "Rwandan", "Saint Lucian", "Salvadoran", "Samoan", "Saudi", "Senegalese", "Serbian", "Seychellois", 
  "Sierra Leonean", "Singaporean", "Slovakian", "Slovenian", "Somali", "South Korean", "Spanish", "Sri Lankan", 
  "Sudanese", "Surinamer", "Swedish", "Swiss", "Syrian", "Taiwanese", "Tajik", "Tanzanian", "Thai", "Togolese", 
  "Tongan", "Tunisian", "Turkish", "Ugandan", "Ukrainian", "Uruguayan", "Uzbekistani", "Venezuelan", "Vietnamese", 
  "Yemenite"
];

interface AdminUserCreateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  defaultRole?: string; // If provided, locks the role selector
}

export default function AdminUserCreateModal({
  isOpen,
  onClose,
  onSuccess,
  defaultRole
}: AdminUserCreateModalProps) {
  const { user } = useAuth();
  const schoolType = user?.schoolType || 'Secondary';

  const isK12 = !(
    schoolType.toLowerCase().includes('university') ||
    schoolType.toLowerCase().includes('college') ||
    schoolType.toLowerCase().includes('colledge') ||
    schoolType.toLowerCase().includes('tertiary') ||
    schoolType.toLowerCase().includes('nursing') ||
    schoolType.toLowerCase().includes('medical') ||
    schoolType.toLowerCase().includes('clinical') ||
    schoolType.toLowerCase().includes('seminary')
  );

  const [role, setRole] = useState(defaultRole || 'STUDENT');
  const [formData, setFormData] = useState<any>({});
  const [docs, setDocs] = useState<any>({});
  const [docFiles, setDocFiles] = useState<any>({
    idDoc: null,
    residenceDoc: null,
    qualificationsDoc: null,
    transferCertificate: null,
    birthCertificate: null
  });
  const [classes, setClasses] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [houses, setHouses] = useState<any[]>([]);
  const [clubs, setClubs] = useState<any[]>([]);
  const [hostels, setHostels] = useState<any[]>([]);
  const [secondaryRoles, setSecondaryRoles] = useState<string[]>([]);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const { showToast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const STAFF_ROLES = ['TEACHER', 'BURSAR', 'LIBRARIAN', 'ANCILLARY', 'SCHOOL_ADMIN'];
  const [staffStep, setStaffStep] = useState(1);

  React.useEffect(() => {
    setStaffStep(1);
  }, [role]);

  const validateStaffStep = (stepNum: number) => {
    if (stepNum === 1) {
      if (!formData.firstName || !formData.firstName.trim()) {
        showToast('First Name is required', 'warning');
        return false;
      }
      if (!formData.lastName || !formData.lastName.trim()) {
        showToast('Last Name is required', 'warning');
        return false;
      }
      if (!formData.email || !formData.email.trim()) {
        showToast('Email Address is required', 'warning');
        return false;
      }
    } else if (stepNum === 2) {
      if (!formData.dateAssumedPost) {
        showToast('Date Assumed Post is required', 'warning');
        return false;
      }
    }
    return true;
  };

  React.useEffect(() => {
    if (isOpen) {
      fetchClasses();
      fetchDepartments();
      fetchHouses();
      fetchClubs();
      fetchHostels();
    }
  }, [isOpen]);

  React.useEffect(() => {
    if (formData.dob) {
      const birthDate = new Date(formData.dob);
      const today = new Date();
      let calculatedAge = today.getFullYear() - birthDate.getFullYear();
      const m = today.getMonth() - birthDate.getMonth();
      if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
        calculatedAge--;
      }
      if (calculatedAge >= 0) {
        setFormData((prev: any) => ({ ...prev, age: calculatedAge.toString() }));
      }
    }
  }, [formData.dob]);

  const fetchClasses = async () => {
    try {
      const { data } = await api.get('/api/classes');
      setClasses(data);
    } catch (err) {
      console.error('Failed to fetch classes');
    }
  };

  const fetchDepartments = async () => {
    try {
      const { data } = await api.get('/api/departments');
      setDepartments(data);
    } catch (err) {
      console.error('Failed to fetch departments');
    }
  };

  const fetchHouses = async () => {
    try {
      const { data } = await api.get('/api/schools/houses');
      setHouses(data);
    } catch (err) {
      console.error('Failed to fetch houses');
    }
  };

  const fetchClubs = async () => {
    try {
      const { data } = await api.get('/api/schools/clubs-list');
      setClubs(data);
    } catch (err) {
      console.error('Failed to fetch clubs');
    }
  };

  const fetchHostels = async () => {
    try {
      const { data } = await api.get('/api/ancillary/hostels');
      setHostels(data);
    } catch (err) {
      console.error('Failed to fetch hostels');
    }
  };

  if (!isOpen) return null;

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev: any) => ({ ...prev, [name]: value }));
  };

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 20 * 1024 * 1024) {
        showToast('File size exceeds 20MB limit', 'error');
        return;
      }
      setAvatarFile(file);
      const reader = new FileReader();
      reader.onloadend = () => setAvatarPreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleDocFileChange = (e: React.ChangeEvent<HTMLInputElement>, key: string) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        showToast('Document size exceeds 10MB limit', 'error');
        return;
      }
      setDocFiles((prev: any) => ({ ...prev, [key]: file }));
    }
  };

  const toBase64 = (file: File) => new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = error => reject(error);
  });

  const handleDocumentUpload = async (e: React.ChangeEvent<HTMLInputElement>, docKey: string) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        showToast('Document size exceeds 5MB limit', 'error');
        return;
      }
      try {
        const base64 = await toBase64(file);
        setDocs((prev: any) => ({ ...prev, [docKey]: base64 }));
        showToast(`${docKey.replace(/([A-Z])/g, ' $1').trim()} updated!`, 'success');
      } catch (err) {
        showToast('Failed to read file', 'error');
      }
    }
  };

  const resetForm = () => {
    setFormData({});
    setDocs({});
    setDocFiles({});
    setSecondaryRoles([]);
    setAvatarFile(null);
    setAvatarPreview(null);
    setRole(defaultRole || 'STUDENT');
    setStaffStep(1);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      const data = new FormData();
      
      // Default password handling as requested
      data.append('password', 'Password');
      data.append('role', role);

      // Append standard fields
      Object.keys(formData).forEach(key => {
        if (formData[key]) data.append(key, formData[key]);
      });

      if (STAFF_ROLES.includes(role)) {
        const combinedName = `${formData.firstName || ''} ${formData.lastName || ''}`.trim();
        data.append('name', combinedName);
        if (formData.nokRelationship) {
          data.append('nokRelation', formData.nokRelationship);
        }
      }

      if (role === 'STUDENT') {
        if (formData.guardianName) data.append('nokName', formData.guardianName);
        if (formData.guardianPhone) data.append('nokPhone', formData.guardianPhone);
      }

      // Special supplier docs (still using base64 in metadata for suppliers for now)
      if (role === 'SUPPLIER') {
        const metadata = { ...formData, docs };
        data.append('metadata', JSON.stringify(metadata));
      }
      
      // Staff docs (using FormData files as updated in backend)
      if (STAFF_ROLES.includes(role)) {
        if (docFiles.idDoc) data.append('idDoc', docFiles.idDoc);
        if (docFiles.residenceDoc) data.append('residenceDoc', docFiles.residenceDoc);
        if (docFiles.qualificationsDoc) data.append('qualificationsDoc', docFiles.qualificationsDoc);
      }

      // Student docs
      if (role === 'STUDENT') {
        if (docFiles.transferCertificate) data.append('transferCertificate', docFiles.transferCertificate);
        if (docFiles.birthCertificate) data.append('birthCertificate', docFiles.birthCertificate);
      }
      
      data.append('secondaryRoles', JSON.stringify(secondaryRoles.filter(r => r.trim() !== '')));
      
      if (avatarFile) {
        data.append('avatar', avatarFile);
      }

      await api.post('/api/users', data, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      showToast(`${role} created successfully with default password!`, 'success');
      resetForm();
      onSuccess();
      onClose();
    } catch (error: any) {
      showToast(error.response?.data?.error || 'Failed to create user', 'error');
    } finally {
      setLoading(false);
    }
  };

  const isStaff = STAFF_ROLES.includes(role);

  return (
    <div className="portal-modal-overlay" style={{ zIndex: 9999 }}>
      <style>{`
        .steps-bar {
          display: flex;
          justify-content: space-between;
          margin-bottom: 25px;
          background: #f1f5f9;
          padding: 10px;
          border-radius: 8px;
          margin-top: 15px;
        }
        .step-item {
          flex: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          cursor: pointer;
          opacity: 0.6;
          position: relative;
          transition: all 0.2s ease;
        }
        .step-item.active {
          opacity: 1;
          font-weight: 600;
        }
        .step-item.done {
          opacity: 0.9;
        }
        .step-num {
          width: 28px;
          height: 28px;
          border-radius: 50%;
          background: #cbd5e1;
          color: #475569;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 0.85rem;
          margin-bottom: 4px;
          transition: all 0.2s ease;
        }
        .step-item.active .step-num {
          background: #3182ce;
          color: white;
        }
        .step-item.done .step-num {
          background: #4ade80;
          color: white;
        }
        .step-item span {
          font-size: 0.75rem;
        }
      `}</style>
      <div className="portal-modal user-edit-modal" style={{ width: '95%', maxWidth: '1100px', maxHeight: '90vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div className="modal-header">
          <div className="header-titles">
            <h2>Add New {role.charAt(0) + role.slice(1).toLowerCase()}</h2>
            <span>System User Creation & HR Onboarding</span>
          </div>
          <button className="close-modal" onClick={onClose} type="button">&times;</button>
        </div>
        
        <div style={{ flex: 1, overflowY: 'auto', padding: '0 20px 20px' }}>
          <form onSubmit={handleSubmit} id="createUserForm">
            
            {/* Global Fields */}
            <div className="form-section-header mt-4">Account Profile</div>
            <div className="modal-form-grid mb-4" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 20 }}>
              <div className="form-group">
                <label>System Role *</label>
                <select value={role} onChange={e => setRole(e.target.value)} disabled={!!defaultRole} className="form-control" required>
                  <option value="STUDENT">Student</option>
                  <option value="ALUMNI">Alumni / Graduate</option>
                  <option value="TEACHER">Teacher</option>
                  <option value="PARENT">Parent</option>
                  <option value="SUPPLIER">Supplier / Vendor</option>
                  <option value="SCHOOL_ADMIN">School Administrator</option>
                  <option value="BURSAR">Bursar / Finance</option>
                  <option value="LIBRARIAN">Librarian</option>
                  <option value="ANCILLARY">Ancillary Staff</option>
                </select>
                {!!defaultRole && <small className="help-text">Role is locked for this directory.</small>}
              </div>
            </div>

            {isStaff ? (
              <>
                {/* Staff Multi-Step Wizard Progress Bar */}
                <div className="steps-bar">
                  <div className={`step-item ${staffStep === 1 ? 'active' : ''} ${staffStep > 1 ? 'done' : ''}`} onClick={() => setStaffStep(1)}>
                    <div className="step-num">1</div>
                    <span>Personal</span>
                  </div>
                  <div className={`step-item ${staffStep === 2 ? 'active' : ''} ${staffStep > 2 ? 'done' : ''}`} onClick={() => validateStaffStep(1) && setStaffStep(2)}>
                    <div className="step-num">2</div>
                    <span>Work</span>
                  </div>
                  <div className={`step-item ${staffStep === 3 ? 'active' : ''} ${staffStep > 3 ? 'done' : ''}`} onClick={() => validateStaffStep(1) && validateStaffStep(2) && setStaffStep(3)}>
                    <div className="step-num">3</div>
                    <span>Banking &amp; Social</span>
                  </div>
                  <div className={`step-item ${staffStep === 4 ? 'active' : ''}`} onClick={() => validateStaffStep(1) && validateStaffStep(2) && setStaffStep(4)}>
                    <div className="step-num">4</div>
                    <span>Documents &amp; Kin</span>
                  </div>
                </div>

                {/* Step 1: Personal */}
                {staffStep === 1 && (
                  <div className="modal-form-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 20 }}>
                    <div className="avatar-upload-section row-span-2">
                      <div className="avatar-preview-large" onClick={() => fileInputRef.current?.click()} style={{ cursor: 'pointer' }}>
                        {avatarPreview ? (
                          <img src={avatarPreview} alt="Preview" />
                        ) : (
                          <i className="fas fa-camera"></i>
                        )}
                        <div className="upload-overlay"><i className="fas fa-plus"></i></div>
                      </div>
                      <input 
                        type="file" 
                        ref={fileInputRef} 
                        onChange={handleAvatarChange} 
                        className="hidden" 
                        accept="image/*"
                        style={{ display: 'none' }}
                      />
                      <p className="help-text text-center mt-2">Profile Avatar (Max 20MB)</p>
                    </div>

                    <div className="form-group">
                      <label>Title (Salutation)</label>
                      <select name="title" value={formData.title || ''} onChange={handleInputChange} className="form-control">
                        <option value="">Select...</option>
                        <option value="Mr.">Mr.</option>
                        <option value="Mrs.">Mrs.</option>
                        <option value="Ms.">Ms.</option>
                        <option value="Dr.">Dr.</option>
                        <option value="Prof.">Prof.</option>
                      </select>
                    </div>

                    <div className="form-group">
                      <label>First Name *</label>
                      <input name="firstName" value={formData.firstName || ''} onChange={handleInputChange} className="form-control" required placeholder="John" />
                    </div>

                    <div className="form-group">
                      <label>Last Name *</label>
                      <input name="lastName" value={formData.lastName || ''} onChange={handleInputChange} className="form-control" required placeholder="Doe" />
                    </div>

                    <div className="form-group">
                      <label>Email Address *</label>
                      <input type="email" name="email" value={formData.email || ''} onChange={handleInputChange} className="form-control" required placeholder="john@example.com" />
                    </div>

                    <div className="form-group">
                      <label>Phone Number</label>
                      <input type="tel" name="phone" value={formData.phone || ''} onChange={handleInputChange} className="form-control" placeholder="+263..." />
                    </div>

                    <div className="form-group">
                      <label>Gender</label>
                      <select name="gender" value={formData.gender || ''} onChange={handleInputChange} className="form-control">
                        <option value="">Select Gender</option>
                        <option value="Male">Male</option>
                        <option value="Female">Female</option>
                      </select>
                    </div>

                    <div className="form-group">
                      <label>Date of Birth</label>
                      <input type="date" name="dob" value={formData.dob || ''} onChange={handleInputChange} className="form-control" />
                    </div>

                    <div className="form-group">
                      <label>National ID</label>
                      <input name="nationalId" value={formData.nationalId || ''} onChange={handleInputChange} className="form-control" placeholder="e.g. 63-123456-X-78" />
                    </div>

                    <div className="form-group">
                      <label>Blood Group</label>
                      <select name="bloodGroup" value={formData.bloodGroup || ''} onChange={handleInputChange} className="form-control">
                        <option value="">Select...</option>
                        <option>A+</option><option>A-</option><option>B+</option><option>B-</option>
                        <option>AB+</option><option>AB-</option><option>O+</option><option>O-</option>
                      </select>
                    </div>

                    <div className="form-group" style={{ gridColumn: 'span 3' }}>
                      <label>Physical Address</label>
                      <textarea name="address" value={formData.address || ''} onChange={handleInputChange} className="form-control" rows={2} placeholder="Enter physical address..." />
                    </div>
                  </div>
                )}

                {/* Step 2: Work */}
                {staffStep === 2 && (
                  <div className="modal-form-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 20 }}>
                    <div className="form-group">
                      <label>Department</label>
                      <select name="departmentId" value={formData.departmentId || ''} onChange={handleInputChange} className="form-control">
                        <option value="">No Department</option>
                        {departments.map(d => (
                          <option key={d.id} value={d.id}>{d.name}</option>
                        ))}
                      </select>
                    </div>

                    <div className="form-group">
                      <label>Job Title / Designation</label>
                      <input name="designation" value={formData.designation || ''} onChange={handleInputChange} className="form-control" placeholder="e.g. Senior Lecturer" />
                    </div>

                    <div className="form-group">
                      <label>Date Assumed Post *</label>
                      <input type="date" name="dateAssumedPost" value={formData.dateAssumedPost || ''} onChange={handleInputChange} className="form-control" required />
                    </div>

                    <div className="form-group">
                      <label>Date of Leaving</label>
                      <input type="date" name="dateOfLeaving" value={formData.dateOfLeaving || ''} onChange={handleInputChange} className="form-control" />
                    </div>

                    {/* Role-Specific Qualifications */}
                    <div className="form-group" style={{ gridColumn: 'span 3' }}>
                      <label className="font-semibold text-sm text-gray-700 block border-b pb-1 mb-3">Role-Specific Qualifications & Details</label>
                    </div>

                    {role === 'ANCILLARY' && (
                      <>
                        <div className="form-group">
                          <label>Duty Station</label>
                          <input name="dutyStation" value={formData.dutyStation || ''} onChange={handleInputChange} className="form-control" placeholder="e.g. Main Campus, Sports Grounds" />
                        </div>
                        <div className="form-group">
                          <label>Skills / Expertise</label>
                          <input name="skills" value={formData.skills || ''} onChange={handleInputChange} className="form-control" placeholder="e.g. Plumbing, Carpentry, Electrical" />
                        </div>
                      </>
                    )}
                    {role === 'BURSAR' && (
                      <>
                        <div className="form-group">
                          <label>Accounting Level</label>
                          <input name="accountingLevel" value={formData.accountingLevel || ''} onChange={handleInputChange} className="form-control" placeholder="e.g. Senior, CPA, ACCA" />
                        </div>
                        <div className="form-group">
                          <label>Specialization</label>
                          <input name="specialization" value={formData.specialization || ''} onChange={handleInputChange} className="form-control" placeholder="e.g. Public Sector, Taxation" />
                        </div>
                        <div className="form-group">
                          <label>Clearance Level</label>
                          <select name="clearanceLevel" value={formData.clearanceLevel || ''} onChange={handleInputChange} className="form-control">
                            <option value="">Select Clearance...</option>
                            <option value="High">High</option>
                            <option value="Medium">Medium</option>
                            <option value="Low">Low</option>
                          </select>
                        </div>
                      </>
                    )}
                    {role === 'LIBRARIAN' && (
                      <>
                        <div className="form-group">
                          <label>Qualification</label>
                          <input name="qualification" value={formData.qualification || ''} onChange={handleInputChange} className="form-control" placeholder="e.g. Degree in Library Science" />
                        </div>
                        <div className="form-group">
                          <label>Specialization</label>
                          <input name="specialization" value={formData.specialization || ''} onChange={handleInputChange} className="form-control" placeholder="e.g. Digital Cataloging, Archival" />
                        </div>
                      </>
                    )}
                    {role === 'TEACHER' && (
                      <div className="form-group" style={{ gridColumn: 'span 3' }}>
                        <label>Academic Qualifications</label>
                        <input name="qualification" value={formData.qualification || ''} onChange={handleInputChange} className="form-control" placeholder="e.g. BSc Mathematics, DipEd" />
                      </div>
                    )}
                    {role === 'SCHOOL_ADMIN' && (
                      <div className="form-group" style={{ gridColumn: 'span 3' }}>
                        <label>Role Description / Responsibility</label>
                        <input name="roleDescription" value={formData.roleDescription || ''} onChange={handleInputChange} className="form-control" placeholder="e.g. Head of Academics, Operations Overseer" />
                      </div>
                    )}
                  </div>
                )}

                {/* Step 3: Banking & Social */}
                {staffStep === 3 && (
                  <div className="modal-form-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 20 }}>
                    <div className="form-group"><label>Bank Name</label><input name="bankName" value={formData.bankName || ''} onChange={handleInputChange} className="form-control" /></div>
                    <div className="form-group"><label>Bank Branch</label><input name="bankBranch" value={formData.bankBranch || ''} onChange={handleInputChange} className="form-control" /></div>
                    <div className="form-group"><label>Branch Code</label><input name="branchCode" value={formData.branchCode || ''} onChange={handleInputChange} className="form-control" /></div>
                    <div className="form-group">
                      <label>Account Currency / Type</label>
                      <select name="accountType" value={formData.accountType || ''} onChange={handleInputChange} className="form-control">
                        <option value="">Select Currency...</option>
                        <option value="USD">USD</option>
                        <option value="ZiG">ZiG</option>
                      </select>
                    </div>
                    <div className="form-group"><label>Account Number</label><input name="accountNumber" value={formData.accountNumber || ''} onChange={handleInputChange} className="form-control" /></div>
                    <div className="form-group"><label>Account Holder Name</label><input name="accountHolderName" value={formData.accountHolderName || ''} onChange={handleInputChange} className="form-control" /></div>
                    
                    <div className="form-group" style={{ gridColumn: 'span 3' }}>
                      <label className="font-semibold text-sm text-gray-700 block border-b pb-1 mb-3">Social Media Profiles</label>
                    </div>
                    <div className="form-group"><label><i className="fab fa-facebook"></i> Facebook Link</label><input name="facebookLink" value={formData.facebookLink || ''} onChange={handleInputChange} className="form-control" placeholder="https://..." /></div>
                    <div className="form-group"><label><i className="fab fa-linkedin"></i> LinkedIn Link</label><input name="linkedinLink" value={formData.linkedinLink || ''} onChange={handleInputChange} className="form-control" placeholder="https://..." /></div>
                    <div className="form-group"><label><i className="fab fa-twitter"></i> Twitter Link</label><input name="twitterLink" value={formData.twitterLink || ''} onChange={handleInputChange} className="form-control" placeholder="https://..." /></div>
                  </div>
                )}

                {/* Step 4: Documents & Kin */}
                {staffStep === 4 && (
                  <div className="modal-form-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 20 }}>
                    <div className="form-group" style={{ gridColumn: 'span 3' }}>
                      <label className="font-semibold text-sm text-gray-700 block border-b pb-1 mb-3">Emergency & Next of Kin</label>
                    </div>
                    <div className="form-group">
                      <label>Kin Name</label>
                      <input name="nokName" value={formData.nokName || ''} onChange={handleInputChange} className="form-control" placeholder="e.g. Mary Doe" />
                    </div>
                    <div className="form-group">
                      <label>Kin Phone</label>
                      <input name="nokPhone" value={formData.nokPhone || ''} onChange={handleInputChange} className="form-control" placeholder="+263..." />
                    </div>
                    <div className="form-group">
                      <label>Kin Relationship</label>
                      <input name="nokRelationship" value={formData.nokRelationship || ''} onChange={handleInputChange} className="form-control" placeholder="e.g. Spouse, Sibling" />
                    </div>

                    <div className="form-group" style={{ gridColumn: 'span 3' }}>
                      <label className="font-semibold text-sm text-gray-700 block border-b pb-1 mb-3">Compliance Documentation Uploads</label>
                    </div>
                    <div className="form-group border p-3 rounded" style={{ borderColor: docFiles.idDoc ? '#4ade80' : '#e2e8f0' }}>
                       <label className="text-xs font-bold block mb-1">{docFiles.idDoc ? '✅ ID Uploaded' : 'Upload National ID'}</label>
                       <input type="file" onChange={(e) => handleDocFileChange(e, 'idDoc')} style={{ fontSize: '0.7rem' }} />
                    </div>
                    <div className="form-group border p-3 rounded" style={{ borderColor: docFiles.residenceDoc ? '#4ade80' : '#e2e8f0' }}>
                       <label className="text-xs font-bold block mb-1">{docFiles.residenceDoc ? '✅ Residence Doc Uploaded' : 'Proof of Residence'}</label>
                       <input type="file" onChange={(e) => handleDocFileChange(e, 'residenceDoc')} style={{ fontSize: '0.7rem' }} />
                    </div>
                    <div className="form-group border p-3 rounded" style={{ borderColor: docFiles.qualificationsDoc ? '#4ade80' : '#e2e8f0' }}>
                       <label className="text-xs font-bold block mb-1">{docFiles.qualificationsDoc ? '✅ Qualifications Uploaded' : 'Qualifications (PDF)'}</label>
                       <input type="file" onChange={(e) => handleDocFileChange(e, 'qualificationsDoc')} style={{ fontSize: '0.7rem' }} />
                    </div>

                    <div className="form-group col-span-3 mt-4" style={{ gridColumn: 'span 3' }}>
                      <label className="font-semibold text-sm text-gray-700 block border-b pb-1 mb-3">Administrative Access</label>
                      <div className="roles-management-section">
                        <div className="secondary-roles-list">
                          <label className="mb-2 block">Secondary Roles (Max 4)</label>
                          <SecondaryRoleSelect 
                            selectedRoles={secondaryRoles}
                            onChange={setSecondaryRoles}
                            maxRoles={4}
                            primaryRole={role}
                          />
                          {secondaryRoles.length === 0 && <p className="empty-roles text-sm text-gray-500 mt-2">No secondary roles applied.</p>}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <>
                <div className="modal-form-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 20 }}>
                  <div className="avatar-upload-section row-span-2">
                    <div className="avatar-preview-large" onClick={() => fileInputRef.current?.click()} style={{ cursor: 'pointer' }}>
                      {avatarPreview ? (
                        <img src={avatarPreview} alt="Preview" />
                      ) : (
                        <i className="fas fa-camera"></i>
                      )}
                      <div className="upload-overlay"><i className="fas fa-plus"></i></div>
                    </div>
                    <input 
                      type="file" 
                      ref={fileInputRef} 
                      onChange={handleAvatarChange} 
                      className="hidden" 
                      accept="image/*"
                      style={{ display: 'none' }}
                    />
                    <p className="help-text text-center mt-2">Profile Avatar (Max 20MB)</p>
                  </div>

                  <div className="form-group">
                    <label>Full Name *</label>
                    <input name="name" value={formData.name || ''} onChange={handleInputChange} className="form-control" required placeholder="John Doe" />
                  </div>

                  <div className="form-group">
                    <label>Email Address *</label>
                    <input type="email" name="email" value={formData.email || ''} onChange={handleInputChange} className="form-control" required placeholder="john@example.com" />
                  </div>

                  <div className="form-group">
                    <label>Phone Number</label>
                    <input type="tel" name="phone" value={formData.phone || ''} onChange={handleInputChange} className="form-control" placeholder="+263..." />
                  </div>
                </div>

                {/* Student Specific Fields */}
                {role === 'STUDENT' && (
                  <>
                    <div className="form-section-header mt-6">Identity & Background</div>
                    <div className="modal-form-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 20 }}>
                      <div className="form-group"><label>Date of Birth</label><input type="date" name="dob" value={formData.dob || ''} onChange={handleInputChange} className="form-control" /></div>
                      <div className="form-group">
                        <label>Gender</label>
                        <select name="gender" value={formData.gender || ''} onChange={handleInputChange} className="form-control">
                          <option value="">Select Gender</option>
                          <option value="Male">Male</option>
                          <option value="Female">Female</option>
                        </select>
                      </div>
                      <div className="form-group"><label>Age</label><input type="number" name="age" value={formData.age || ''} onChange={handleInputChange} className="form-control" placeholder="Years" /></div>
                      <div className="form-group">
                        <label>Nationality</label>
                        <select name="nationality" value={formData.nationality || ''} onChange={handleInputChange} className="form-control">
                          <option value="">Select Nationality</option>
                          {NATIONALITIES.map((n) => (
                            <option key={n} value={n}>{n}</option>
                          ))}
                        </select>
                      </div>
                      <div className="form-group"><label>Mother Tongue</label><input name="motherTongue" value={formData.motherTongue || ''} onChange={handleInputChange} className="form-control" placeholder="e.g. Shona" /></div>
                      <div className="form-group">
                        <label>Physical Handicap</label>
                        <select name="isPhysicallyHandicapped" value={formData.isPhysicallyHandicapped || 'false'} onChange={handleInputChange} className="form-control">
                          <option value="false">No</option>
                          <option value="true">Yes</option>
                        </select>
                      </div>
                      {formData.isPhysicallyHandicapped === 'true' && (
                        <div className="form-group col-span-3"><label>Handicap Details</label><input name="handicapDetails" value={formData.handicapDetails || ''} onChange={handleInputChange} className="form-control" placeholder="Specify nature of handicap..." /></div>
                      )}
                    </div>

                    <div className="form-section-header mt-6">Institutional Assignment</div>
                    <div className="modal-form-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 20 }}>
                      <div className="form-group">
                        <label>{isK12 ? 'Grade / Class Assignment *' : 'Program / Cohort Assignment *'}</label>
                        <select name="classId" value={formData.classId || ''} onChange={handleInputChange} className="form-control" required>
                          <option value="">Select Class</option>
                          {classes.map(c => (
                            <option key={c.id} value={c.id}>{c.name} ({c.level})</option>
                          ))}
                        </select>
                      </div>
                      {isK12 && (
                        <>
                          <div className="form-group">
                            <label>Student House</label>
                            <select name="studentHouseId" value={formData.studentHouseId || ''} onChange={handleInputChange} className="form-control">
                              <option value="">Select House</option>
                              {houses.map(h => <option key={h.id} value={h.id}>{h.name}</option>)}
                            </select>
                          </div>
                          <div className="form-group">
                            <label>Student Club</label>
                            <select name="clubId" value={formData.clubId || ''} onChange={handleInputChange} className="form-control">
                              <option value="">Select Club</option>
                              {clubs.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                            </select>
                          </div>
                        </>
                      )}
                      <div className="form-group"><label>Section</label><input name="section" value={formData.section || ''} onChange={handleInputChange} className="form-control" placeholder="e.g. Blue" /></div>
                      <div className="form-group">
                        <label>Dormitory / Room</label>
                        <select 
                          name="dormitory" 
                          value={formData.dormitory || ''} 
                          onChange={(e) => {
                            const val = e.target.value;
                            const selectedHostel = hostels.find(h => h.name === val);
                            setFormData((prev: any) => ({
                              ...prev,
                              dormitory: val,
                              hostelId: selectedHostel ? selectedHostel.id : ''
                            }));
                          }}
                          className="form-control"
                        >
                          <option value="">Select Dormitory</option>
                          {hostels.map(h => (
                            <option key={h.id} value={h.name}>{h.name}</option>
                          ))}
                        </select>
                      </div>
                      <div className="form-group">
                        <label>Student Category</label>
                        <select name="category" value={formData.category || ''} onChange={handleInputChange} className="form-control">
                          <option value="">Select Category</option>
                          <option value="General">General</option>
                          <option value="Boarder">Boarder</option>
                          <option value="Day Student">Day Student</option>
                          <option value="Scholarship">Scholarship</option>
                          <option value="Special Needs">Special Needs</option>
                        </select>
                      </div>
                      <div className="form-group">
                        <label>Boarding Status</label>
                        <select name="boardingStatus" value={formData.boardingStatus || 'Day'} onChange={handleInputChange} className="form-control">
                          <option value="Day">Day Student</option>
                          <option value="Boarder">Boarder</option>
                        </select>
                      </div>
                      {!isK12 && (
                        <div className="form-group">
                          <label>Year of Study (Part)</label>
                          <select name="part" value={formData.part || '1'} onChange={handleInputChange} className="form-control">
                            <option value="1">Part 1</option>
                            <option value="2">Part 2</option>
                            <option value="3">Part 3</option>
                            <option value="4">Part 4</option>
                            <option value="5">Part 5</option>
                            <option value="6">Part 6</option>
                          </select>
                        </div>
                      )}
                      <div className="form-group">
                        <label>Academic Standing</label>
                        <select name="standing" value={formData.standing || 'Normal'} onChange={handleInputChange} className="form-control">
                          <option value="Normal">Normal</option>
                          <option value="Carry">Carry</option>
                          <option value="Repeat">Repeat</option>
                          <option value="Discontinue">Discontinue</option>
                          <option value="Withdraw">Withdraw</option>
                        </select>
                      </div>
                      <div className="form-group"><label>Date Admitted</label><input type="date" name="dateAdmitted" value={formData.dateAdmitted || ''} onChange={handleInputChange} className="form-control" /></div>
                    </div>

                    {!isK12 && (
                      <>
                        <div className="form-section-header mt-6">Tertiary & Research Details</div>
                        <div className="modal-form-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 20 }}>
                          <div className="form-group">
                            <label>Program Level</label>
                            <select name="programLevel" value={formData.programLevel || 'UNDERGRADUATE'} onChange={handleInputChange} className="form-control">
                              <option value="UNDERGRADUATE">Undergraduate</option>
                              <option value="PG_DIPLOMA">Postgraduate Diploma</option>
                              <option value="MASTERS_TAUGHT">Masters (Taught)</option>
                              <option value="MASTERS_RESEARCH">Masters (Research)</option>
                              <option value="MPHIL">MPhil</option>
                              <option value="PHD">PhD</option>
                            </select>
                          </div>
                          <div className="form-group">
                            <label>Study Mode</label>
                            <select name="studyMode" value={formData.studyMode || 'FULL_TIME'} onChange={handleInputChange} className="form-control">
                              <option value="FULL_TIME">Full Time</option>
                              <option value="PART_TIME">Part Time</option>
                            </select>
                          </div>
                          <div className="form-group col-span-3"><label>Research / Thesis Title</label><input name="researchTitle" value={formData.researchTitle || ''} onChange={handleInputChange} className="form-control" placeholder="For postgraduate students..." style={{ gridColumn: 'span 3' }} /></div>
                        </div>
                      </>
                    )}

                    <div className="form-section-header mt-6">{isK12 ? 'Emergency & Guardian Contact' : 'Emergency & Next of Kin Contact'}</div>
                    <div className="modal-form-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 20 }}>
                      <div className="form-group">
                        <label>{isK12 ? 'Guardian Name' : 'Next of Kin Name'}</label>
                        <input name="guardianName" value={formData.guardianName || ''} onChange={handleInputChange} className="form-control" placeholder={isK12 ? 'e.g. Sarah Smith' : 'e.g. Mary Doe'} />
                      </div>
                      <div className="form-group">
                        <label>{isK12 ? 'Guardian Phone' : 'Next of Kin Phone'}</label>
                        <input type="tel" name="guardianPhone" value={formData.guardianPhone || ''} onChange={handleInputChange} className="form-control" placeholder="+263..." />
                      </div>
                      <div className="form-group"><label>City</label><input name="city" value={formData.city || ''} onChange={handleInputChange} className="form-control" /></div>
                      <div className="form-group"><label>State / Province</label><input name="state" value={formData.state || ''} onChange={handleInputChange} className="form-control" /></div>
                      <div className="form-group col-span-3" style={{ gridColumn: 'span 3' }}><label>Physical Address</label><textarea name="address" value={formData.address || ''} onChange={handleInputChange} className="form-control" rows={2} /></div>
                    </div>

                    <div className="form-section-header mt-6">Previous Academic History</div>
                    <div className="modal-form-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 20 }}>
                      <div className="form-group"><label>Previous School Name</label><input name="prevSchoolName" value={formData.prevSchoolName || ''} onChange={handleInputChange} className="form-control" /></div>
                      <div className="form-group"><label>Previous School Class</label><input name="prevSchoolClass" value={formData.prevSchoolClass || ''} onChange={handleInputChange} className="form-control" /></div>
                      <div className="form-group col-span-3" style={{ gridColumn: 'span 3' }}><label>Previous School Address</label><input name="prevSchoolAddress" value={formData.prevSchoolAddress || ''} onChange={handleInputChange} className="form-control" /></div>
                      <div className="form-group col-span-3" style={{ gridColumn: 'span 3' }}><label>Purpose for Leaving</label><input name="purposeForLeaving" value={formData.purposeForLeaving || ''} onChange={handleInputChange} className="form-control" placeholder="Reason for transfer..." /></div>
                    </div>

                    <div className="form-section-header mt-6">Document Uploads</div>
                    <div className="modal-form-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 20 }}>
                      <div className="form-group">
                        <label>Transfer Certificate?</label>
                        <select name="hasTransferCertificate" value={formData.hasTransferCertificate || 'false'} onChange={handleInputChange} className="form-control">
                          <option value="false">No</option>
                          <option value="true">Yes</option>
                        </select>
                      </div>
                      {formData.hasTransferCertificate === 'true' && (
                        <div className="form-group border p-3 rounded" style={{ borderColor: docFiles.transferCertificate ? '#4ade80' : '#e2e8f0' }}>
                           <label className="text-xs font-bold block mb-1">{docFiles.transferCertificate ? '✅ TC Uploaded' : 'Upload Transfer Certificate'}</label>
                           <input type="file" onChange={(e) => handleDocFileChange(e, 'transferCertificate')} style={{ fontSize: '0.7rem' }} />
                        </div>
                      )}
                      <div className="form-group border p-3 rounded" style={{ borderColor: docFiles.birthCertificate ? '#4ade80' : '#e2e8f0' }}>
                         <label className="text-xs font-bold block mb-1">{docFiles.birthCertificate ? '✅ BC Uploaded' : 'Upload Birth Certificate'}</label>
                         <input type="file" onChange={(e) => handleDocFileChange(e, 'birthCertificate')} style={{ fontSize: '0.7rem' }} />
                      </div>
                    </div>
                  </>
                )}

                {/* Alumni Specific Fields */}
                {role === 'ALUMNI' && (
                  <>
                    <div className="form-section-header mt-6">Academic Legacy</div>
                    <div className="modal-form-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 20 }}>
                      <div className="form-group">
                        <label>Graduation Year *</label>
                        <input type="number" name="graduationYear" value={formData.graduationYear || ''} onChange={handleInputChange} className="form-control" required placeholder="e.g. 2024" />
                      </div>
                      <div className="form-group">
                        <label>O-Level / Old House</label>
                        <input name="oldHouse" value={formData.oldHouse || ''} onChange={handleInputChange} className="form-control" placeholder="e.g. Red House" />
                      </div>
                      <div className="form-group">
                        <label>Was Prefect / Leader?</label>
                        <select name="wasPrefect" value={formData.wasPrefect || 'false'} onChange={handleInputChange} className="form-control">
                          <option value="false">No</option>
                          <option value="true">Yes</option>
                        </select>
                      </div>
                      <div className="form-group">
                        <label>Gender</label>
                        <select name="gender" value={formData.gender || ''} onChange={handleInputChange} className="form-control">
                          <option value="">Select Gender</option>
                          <option value="Male">Male</option>
                          <option value="Female">Female</option>
                        </select>
                      </div>
                      <div className="form-group" style={{ gridColumn: 'span 2' }}>
                        <label>Sports Honors & Other Achievements</label>
                        <input name="sportsHonors" value={formData.sportsHonors || ''} onChange={handleInputChange} className="form-control" placeholder="e.g. Athletics Captain, National Debate..." />
                      </div>
                    </div>

                    <div className="form-section-header mt-6">Current Professional / Higher Education Status</div>
                    <div className="modal-form-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 20 }}>
                      <div className="form-group">
                        <label>Current Profession</label>
                        <input name="profession" value={formData.profession || ''} onChange={handleInputChange} className="form-control" placeholder="e.g. Software Engineer" />
                      </div>
                      <div className="form-group">
                        <label>Current Organization</label>
                        <input name="organization" value={formData.organization || ''} onChange={handleInputChange} className="form-control" placeholder="e.g. Santana IT" />
                      </div>
                      <div className="form-group">
                        <label>Current University (If applicable)</label>
                        <input name="university" value={formData.university || ''} onChange={handleInputChange} className="form-control" placeholder="e.g. NUST" />
                      </div>
                      <div className="form-group" style={{ gridColumn: 'span 3' }}>
                        <label>Current Address / Location</label>
                        <input name="address" value={formData.address || ''} onChange={handleInputChange} className="form-control" placeholder="City, Country" />
                      </div>
                    </div>
                  </>
                )}

                {/* Supplier Specific Fields */}
                {role === 'SUPPLIER' && (
                  <>
                    <div className="form-section-header mt-6">Enterprise Profile</div>
                    <div className="modal-form-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 20 }}>
                      <div className="form-group">
                        <label>Company / Enterprise Name *</label>
                        <input name="companyName" value={formData.companyName || ''} onChange={handleInputChange} className="form-control" required placeholder="Legal Company Name" />
                      </div>
                      <div className="form-group">
                        <label>BP / Registration No *</label>
                        <input name="regNo" value={formData.regNo || ''} onChange={handleInputChange} className="form-control" required placeholder="Registration Number" />
                      </div>
                      <div className="form-group">
                        <label>Year of Incorporation *</label>
                        <input type="number" name="incorpYear" value={formData.incorpYear || ''} onChange={handleInputChange} className="form-control" required placeholder="e.g. 2020" />
                      </div>
                      <div className="form-group">
                        <label>Primary Specialization</label>
                        <input name="specialization" value={formData.specialization || ''} onChange={handleInputChange} className="form-control" placeholder="e.g. Stationery Maintenance" />
                      </div>
                      <div className="form-group">
                        <label>Business Category *</label>
                        <select name="category" value={formData.category || ''} onChange={handleInputChange} className="form-control" required>
                          <option value="">Select Category...</option>
                          <option value="ICT / Software">ICT / Software</option>
                          <option value="Transport & Logistics">Transport & Logistics</option>
                          <option value="Stationery & Printing">Stationery & Printing</option>
                          <option value="Building & Construction">Building & Construction</option>
                          <option value="Food & Catering">Food & Catering</option>
                          <option value="General Services">General Services</option>
                        </select>
                      </div>
                      <div className="form-group">
                        <label>Contact Designation</label>
                        <input name="designation" value={formData.designation || ''} onChange={handleInputChange} className="form-control" placeholder="e.g. Sales Manager" />
                      </div>
                      <div className="form-group" style={{ gridColumn: 'span 3' }}>
                        <label>Business Address *</label>
                        <textarea name="address" value={formData.address || ''} onChange={handleInputChange} className="form-control" rows={2} required placeholder="Physical business address..." />
                      </div>
                    </div>

                    <div className="form-section-header mt-6">Compliance Documentation</div>
                    <div className="modal-form-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 20 }}>
                      <div className="form-group">
                        <label>PRAZ Registration Number *</label>
                        <input name="prazNo" value={formData.prazNo || ''} onChange={handleInputChange} className="form-control" required placeholder="PRAZ Reg No" />
                      </div>
                      <div className="form-group">
                         <label>PRAZ Expiry Date *</label>
                         <input type="date" name="prazExpiry" value={formData.prazExpiry || ''} onChange={handleInputChange} className="form-control" required />
                      </div>
                      <div className="form-group">
                        <label>Tax Clearance (BP) Number *</label>
                        <input name="taxNumber" value={formData.taxNumber || ''} onChange={handleInputChange} className="form-control" required placeholder="Tax BP Number" />
                      </div>
                      <div className="form-group">
                         <label>Tax Clearance Expiry *</label>
                         <input type="date" name="taxExpiry" value={formData.taxExpiry || ''} onChange={handleInputChange} className="form-control" required />
                      </div>
                      <div className="form-group">
                         <label>NSSA Expiry Date</label>
                         <input type="date" name="nssaExpiry" value={formData.nssaExpiry || ''} onChange={handleInputChange} className="form-control" />
                      </div>
                    </div>

                    <div className="form-section-header mt-6">Documents Upload</div>
                    <div className="modal-form-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 20 }}>
                      <div className="form-group border p-3 rounded" style={{ borderColor: docs.taxClearance ? '#4ade80' : '#e2e8f0' }}>
                         <label className="text-sm font-semibold block mb-2">{docs.taxClearance ? '✅ Tax Clearance Uploaded' : 'Upload Tax Clearance *'}</label>
                         <input type="file" onChange={(e) => handleDocumentUpload(e, 'taxClearance')} style={{ width: '100%' }} />
                      </div>
                      <div className="form-group border p-3 rounded" style={{ borderColor: docs.prazCert ? '#4ade80' : '#e2e8f0' }}>
                         <label className="text-sm font-semibold block mb-2">{docs.prazCert ? '✅ PRAZ Certificate Uploaded' : 'Upload PRAZ Cert *'}</label>
                         <input type="file" onChange={(e) => handleDocumentUpload(e, 'prazCert')} style={{ width: '100%' }} />
                      </div>
                      <div className="form-group border p-3 rounded" style={{ borderColor: docs.certIncorp ? '#4ade80' : '#e2e8f0' }}>
                         <label className="text-sm font-semibold block mb-2">{docs.certIncorp ? '✅ Cert of Incorp Uploaded' : 'Upload Cert of Incorp *'}</label>
                         <input type="file" onChange={(e) => handleDocumentUpload(e, 'certIncorp')} style={{ width: '100%' }} />
                      </div>
                      <div className="form-group border p-3 rounded" style={{ borderColor: docs.nssaClearance ? '#4ade80' : '#e2e8f0' }}>
                         <label className="text-sm font-semibold block mb-2">{docs.nssaClearance ? '✅ NSSA Uploaded' : 'Upload NSSA Clearance'}</label>
                         <input type="file" onChange={(e) => handleDocumentUpload(e, 'nssaClearance')} style={{ width: '100%' }} />
                      </div>
                      <div className="form-group border p-3 rounded" style={{ borderColor: docs.vendorRegFile ? '#4ade80' : '#e2e8f0' }}>
                         <label className="text-sm font-semibold block mb-2">{docs.vendorRegFile ? '✅ Vendor Doc Uploaded' : 'Other Vendor Doc'}</label>
                         <input type="file" onChange={(e) => handleDocumentUpload(e, 'vendorRegFile')} style={{ width: '100%' }} />
                      </div>
                    </div>
                  </>
                )}

                {/* Secondary Roles Component */}
                {role !== 'STUDENT' && role !== 'PARENT' && role !== 'SUPPLIER' && (
                  <>
                    <div className="form-section-header mt-6">Administrative Access</div>
                    <div className="roles-management-section">
                      <div className="secondary-roles-list">
                        <label className="mb-2 block">Secondary Roles (Max 4)</label>
                        <SecondaryRoleSelect 
                          selectedRoles={secondaryRoles}
                          onChange={setSecondaryRoles}
                          maxRoles={4}
                          primaryRole={role}
                        />
                        {secondaryRoles.length === 0 && <p className="empty-roles text-sm text-gray-500 mt-2">No secondary roles applied.</p>}
                      </div>
                    </div>
                  </>
                )}
              </>
            )}

          </form>
        </div>

        <div className="modal-footer" style={{ borderTop: '1px solid #e2e8f0', padding: '15px 20px', background: '#f8fafc', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div className="text-xs text-gray-500"><i className="fas fa-lock"></i> Temporary password will be set to: <strong>Password</strong></div>
          <div className="flex gap-3" style={{ display: 'flex', gap: 10 }}>
            {isStaff ? (
              <>
                <button type="button" className="btn btn-secondary py-2 px-4 rounded border font-medium" onClick={onClose} style={{ background: 'white' }}>Cancel</button>
                {staffStep > 1 && (
                  <button type="button" className="btn btn-secondary py-2 px-4 rounded border font-medium" onClick={() => setStaffStep(s => s - 1)} style={{ background: 'white' }}>Back</button>
                )}
                {staffStep < 4 ? (
                  <button type="button" className="btn btn-primary py-2 px-4 rounded text-white font-medium shadow-sm" onClick={() => validateStaffStep(staffStep) && setStaffStep(s => s + 1)} style={{ background: '#3182ce' }}>Next</button>
                ) : (
                  <button type="submit" form="createUserForm" className="btn btn-primary py-2 px-4 rounded text-white font-medium shadow-sm transition-transform active:scale-95" disabled={loading} style={{ background: '#4ade80' }}>
                    {loading ? <i className="fas fa-spinner fa-spin"></i> : `Create ${role.charAt(0) + role.slice(1).toLowerCase()} Profile`}
                  </button>
                )}
              </>
            ) : (
              <>
                <button type="button" className="btn btn-secondary py-2 px-4 rounded border font-medium" onClick={onClose} style={{ background: 'white' }}>Cancel</button>
                <button type="submit" form="createUserForm" className="btn btn-primary py-2 px-4 rounded text-white font-medium shadow-sm transition-transform active:scale-95" disabled={loading} style={{ background: '#3182ce' }}>
                  {loading ? <i className="fas fa-spinner fa-spin"></i> : `Create ${role.charAt(0) + role.slice(1).toLowerCase()} Profile`}
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
