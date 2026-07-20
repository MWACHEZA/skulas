import React, { useState, useEffect, useRef } from 'react';
import api, { BASE_URL } from '../../lib/api';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../context/ToastContext';
import SecondaryRoleSelect from './SecondaryRoleSelect';

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

interface UserEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: any;
  onSuccess: () => void;
  currentUserRole: string;
}

const UserEditModal: React.FC<UserEditModalProps> = ({
  isOpen,
  onClose,
  user,
  onSuccess,
  currentUserRole
}) => {
  const [activeTab, setActiveTab] = useState('basic');
  const [formData, setFormData] = useState<any>({});
  const [secondaryRoles, setSecondaryRoles] = useState<string[]>([]);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [docFiles, setDocFiles] = useState<any>({});
  const [loading, setLoading] = useState(false);
  const [classes, setClasses] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { user: currentUserSession } = useAuth();
  const { showToast } = useToast();

  const isAdmin = currentUserRole === 'SCHOOL_ADMIN' || currentUserRole === 'SUPER_ADMIN';
  const isStaff = ['TEACHER', 'BURSAR', 'LIBRARIAN', 'ANCILLARY', 'SCHOOL_ADMIN'].includes(user?.role);
  
  const schoolType = currentUserSession?.schoolType || 'Secondary';
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

  useEffect(() => {
    if (user) {
      setFormData({
        ...user,
        ...(user.metadata || {}),
        ...(user.employeeProfile || {}) // Include profile fields like bloodGroup
      });
      setSecondaryRoles(user.secondaryRoles || []);
      setAvatarPreview(user.avatar ? `${BASE_URL}/api/storage/media/${currentUserSession?.schoolCode}/images/${user.avatar}` : null);
      setDocFiles({});
      setActiveTab('basic');
      if (user.role === 'STUDENT') {
        fetchClasses();
      }
      fetchDepartments();
    }
  }, [user]);

  useEffect(() => {
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

  const fetchDepartments = async () => {
    try {
      const { data } = await api.get('/api/departments');
      setDepartments(data);
    } catch (err) {
      console.error('Failed to fetch departments');
    }
  };

  const fetchClasses = async () => {
    try {
      const { data } = await api.get('/api/reports/classes');
      setClasses(data);
    } catch (err) {
      console.error('Failed to fetch classes');
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
      reader.onloadend = () => {
        setAvatarPreview(reader.result as string);
      };
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      const data = new FormData();
      Object.keys(formData).forEach(key => {
        if (typeof formData[key] !== 'object' && formData[key] !== undefined && formData[key] !== null) {
          data.append(key, formData[key]);
        }
      });
      
      data.append('secondaryRoles', JSON.stringify(secondaryRoles.filter(r => r.trim() !== '')));
      
      if (avatarFile) data.append('avatar', avatarFile);
      if (docFiles.idDoc) data.append('idDoc', docFiles.idDoc);
      if (docFiles.residenceDoc) data.append('residenceDoc', docFiles.residenceDoc);
      if (docFiles.qualificationsDoc) data.append('qualificationsDoc', docFiles.qualificationsDoc);
      if (docFiles.transferCertificate) data.append('transferCertificate', docFiles.transferCertificate);
      if (docFiles.birthCertificate) data.append('birthCertificate', docFiles.birthCertificate);

      await api.put(`/api/users/${user.id}`, data, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      showToast('User updated successfully', 'success');
      onSuccess();
      onClose();
    } catch (error: any) {
      showToast(error.response?.data?.error || 'Failed to update user', 'error');
    } finally {
      setLoading(false);
    }
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case 'basic':
        return (
          <div className="modal-form-grid">
            <div className="avatar-upload-section">
              <div className="avatar-preview-large" onClick={() => fileInputRef.current?.click()}>
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
              />
              <p className="help-text">Click to change profile picture (Max 20MB)</p>
            </div>
            <div className="form-group">
              <label>Full Name</label>
              <input name="name" value={formData.name || ''} onChange={handleInputChange} className="form-control" />
            </div>
            <div className="form-group">
              <label>Email Address</label>
              <input name="email" value={formData.email || ''} onChange={handleInputChange} className="form-control" />
            </div>
            <div className="form-group">
              <label>Phone Number</label>
              <input name="phone" value={formData.phone || ''} onChange={handleInputChange} className="form-control" />
            </div>
            <div className="form-group">
              <label>Status</label>
              <select name="status" value={formData.status || 'Active'} onChange={handleInputChange} className="form-control">
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
                <option value="Suspended">Suspended</option>
                <option value="Enrolled">Enrolled</option>
              </select>
            </div>
            {user.role === 'STUDENT' && (
              <div className="form-group">
                <label>Assigned Class</label>
                <select name="classId" value={formData.classId || ''} onChange={handleInputChange} className="form-control">
                  <option value="">Unassigned</option>
                  {classes.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
            )}
          </div>
        );
      case 'personal':
        return (
          <div className="modal-form-grid">
             <div className="form-group">
              <label>Date of Birth</label>
              <input type="date" name="dob" value={formData.dob || ''} onChange={handleInputChange} className="form-control" />
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
              <label>National ID</label>
              <input name="nationalId" value={formData.nationalId || ''} onChange={handleInputChange} className="form-control" />
            </div>
            <div className="form-group">
              <label>Religion</label>
              <input name="religion" value={formData.religion || ''} onChange={handleInputChange} className="form-control" />
            </div>
            <div className="form-group col-span-2">
              <label>Physical Address</label>
              <textarea name="address" value={formData.address || ''} onChange={handleInputChange} className="form-control" rows={2} />
            </div>
            <div className="form-section-header col-span-2">{isK12 ? 'Family & Guardian Details' : 'Family & Next of Kin'}</div>
            <div className="form-group">
              <label>Spouse Name</label>
              <input name="spouseName" value={formData.spouseName || ''} onChange={handleInputChange} className="form-control" />
            </div>
            <div className="form-group">
              <label>{isK12 ? 'Guardian Name' : 'Next of Kin Name'}</label>
              <input name="nokName" value={formData.nokName || ''} onChange={handleInputChange} className="form-control" />
            </div>
            <div className="form-group">
              <label>{isK12 ? 'Guardian Relationship' : 'Next of Kin Relationship'}</label>
              <input name="nokRelationship" value={formData.nokRelationship || ''} onChange={handleInputChange} className="form-control" />
            </div>
            <div className="form-group">
              <label>{isK12 ? 'Guardian Phone' : 'Next of Kin Phone'}</label>
              <input name="nokPhone" value={formData.nokPhone || ''} onChange={handleInputChange} className="form-control" />
            </div>
          </div>
        );
      case 'roles':
        return (
          <div className="roles-management-section">
            <div className="info-alert mb-4">
              <i className="fas fa-info-circle"></i>
              <span>{isAdmin ? 'You have permission to manage secondary roles.' : 'Role management is restricted to Administrators.'}</span>
            </div>
            
            <div className="form-group">
              <label>Primary Role</label>
              <input value={formData.role || ''} disabled className="form-control disabled" />
              <small className="help-text">Primary role cannot be changed manually.</small>
            </div>

            <div className="secondary-roles-list">
               <label className="mb-2 block">Secondary Roles (Max 4)</label>
               <SecondaryRoleSelect 
                 selectedRoles={secondaryRoles}
                 onChange={setSecondaryRoles}
                 disabled={!isAdmin}
                 maxRoles={4}
                 primaryRole={user.role}
               />
               {secondaryRoles.length === 0 && <p className="empty-roles mt-2">No secondary roles assigned.</p>}
               <small className="help-text block mt-1">Select roles to grant access to specialized departmental flows.</small>
             </div>
          </div>
        );

      case 'hr':
        return (
          <div className="modal-form-grid">
            <div className="form-section-header col-span-2">Payroll & Banking</div>
            <div className="form-group">
              <label>Job Title / Designation</label>
              <input name="designation" value={formData.designation || ''} onChange={handleInputChange} className="form-control" />
            </div>
            <div className="form-group">
              <label>Blood Group</label>
              <select name="bloodGroup" value={formData.bloodGroup || ''} onChange={handleInputChange} className="form-control">
                <option value="">Select...</option>
                <option>A+</option><option>A-</option><option>B+</option><option>B-</option>
                <option>AB+</option><option>AB-</option><option>O+</option><option>O-</option>
              </select>
            </div>
            <div className="form-group">
              <label>Date Assumed Post</label>
              <input type="date" name="dateAssumedPost" value={formData.dateAssumedPost ? new Date(formData.dateAssumedPost).toISOString().split('T')[0] : ''} onChange={handleInputChange} className="form-control" />
            </div>
            <div className="form-group">
              <label>Date of Leaving</label>
              <input type="date" name="dateOfLeaving" value={formData.dateOfLeaving ? new Date(formData.dateOfLeaving).toISOString().split('T')[0] : ''} onChange={handleInputChange} className="form-control" />
            </div>
            {/* ─── USD Account ─── */}
            <div className="form-section-header col-span-2" style={{ background: '#eff6ff', color: '#1d4ed8', borderLeft: '4px solid #3b82f6', padding: '8px 12px', borderRadius: '6px', fontWeight: 800 }}>
              <i className="fas fa-dollar-sign" style={{ marginRight: '8px' }}></i>USD Bank Account
            </div>
            <div className="form-group"><label>Bank Name (USD)</label><input name="bankName" value={formData.bankName || ''} onChange={handleInputChange} className="form-control" placeholder="e.g. CBZ Bank" /></div>
            <div className="form-group"><label>Bank Branch (USD)</label><input name="bankBranch" value={formData.bankBranch || ''} onChange={handleInputChange} className="form-control" /></div>
            <div className="form-group"><label>Branch Code (USD)</label><input name="branchCode" value={formData.branchCode || ''} onChange={handleInputChange} className="form-control" /></div>
            <div className="form-group"><label>Account Type (USD)</label>
              <select name="accountType" value={formData.accountType || ''} onChange={handleInputChange} className="form-control">
                <option value="">Select type...</option>
                <option value="Savings">Savings</option>
                <option value="Current">Current</option>
                <option value="Nostro">Nostro / RTGS</option>
              </select>
            </div>
            <div className="form-group"><label>Account Number (USD)</label><input name="accountNumber" value={formData.accountNumber || ''} onChange={handleInputChange} className="form-control" /></div>
            <div className="form-group"><label>Account Holder Name (USD)</label><input name="accountHolderName" value={formData.accountHolderName || ''} onChange={handleInputChange} className="form-control" /></div>

            {/* ─── ZiG Account ─── */}
            <div className="form-section-header col-span-2" style={{ background: '#fefce8', color: '#92400e', borderLeft: '4px solid #f59e0b', padding: '8px 12px', borderRadius: '6px', fontWeight: 800 }}>
              <i className="fas fa-coins" style={{ marginRight: '8px' }}></i>ZiG Bank Account
            </div>
            <div className="form-group"><label>Bank Name (ZiG)</label><input name="bankNameZig" value={formData.bankNameZig || ''} onChange={handleInputChange} className="form-control" placeholder="e.g. CBZ Bank" /></div>
            <div className="form-group"><label>Bank Branch (ZiG)</label><input name="bankBranchZig" value={formData.bankBranchZig || ''} onChange={handleInputChange} className="form-control" /></div>
            <div className="form-group"><label>Branch Code (ZiG)</label><input name="branchCodeZig" value={formData.branchCodeZig || ''} onChange={handleInputChange} className="form-control" /></div>
            <div className="form-group"><label>Account Type (ZiG)</label>
              <select name="accountTypeZig" value={formData.accountTypeZig || ''} onChange={handleInputChange} className="form-control">
                <option value="">Select type...</option>
                <option value="Savings">Savings</option>
                <option value="Current">Current</option>
              </select>
            </div>
            <div className="form-group"><label>Account Number (ZiG)</label><input name="accountNumberZig" value={formData.accountNumberZig || ''} onChange={handleInputChange} className="form-control" /></div>
            <div className="form-group"><label>Account Holder Name (ZiG)</label><input name="accountHolderNameZig" value={formData.accountHolderNameZig || ''} onChange={handleInputChange} className="form-control" /></div>


            <div className="form-section-header col-span-2">Social & Documents</div>
            <div className="form-group"><label>Facebook</label><input name="facebookLink" value={formData.facebookLink || ''} onChange={handleInputChange} className="form-control" /></div>
            <div className="form-group"><label>LinkedIn</label><input name="linkedinLink" value={formData.linkedinLink || ''} onChange={handleInputChange} className="form-control" /></div>
            <div className="form-group"><label>Twitter</label><input name="twitterLink" value={formData.twitterLink || ''} onChange={handleInputChange} className="form-control" /></div>
            
            <div className="form-group border p-2 rounded mt-2">
              <label className="text-xs font-bold block mb-1">{docFiles.idDoc ? '✅ New ID Selected' : 'Update National ID'}</label>
              <input type="file" onChange={(e) => handleDocFileChange(e, 'idDoc')} style={{ fontSize: '0.7rem' }} />
            </div>
            <div className="form-group border p-2 rounded mt-2">
              <label className="text-xs font-bold block mb-1">{docFiles.residenceDoc ? '✅ New Residence Selected' : 'Update Residence'}</label>
              <input type="file" onChange={(e) => handleDocFileChange(e, 'residenceDoc')} style={{ fontSize: '0.7rem' }} />
            </div>
            <div className="form-group border p-2 rounded mt-2">
              <label className="text-xs font-bold block mb-1">{docFiles.qualificationsDoc ? '✅ New Quals Selected' : 'Update Qualifications'}</label>
              <input type="file" onChange={(e) => handleDocFileChange(e, 'qualificationsDoc')} style={{ fontSize: '0.7rem' }} />
            </div>
          </div>
        );

      case 'extra':
        if (user.role === 'STUDENT') {
          return (
            <div className="modal-form-grid">
              <div className="form-group">
                <label>Age</label>
                <input type="number" name="age" value={formData.age || ''} onChange={handleInputChange} className="form-control" placeholder="Years" />
              </div>
              <div className="form-group">
                <label>Nationality</label>
                <select name="nationality" value={formData.nationality || ''} onChange={handleInputChange} className="form-control">
                  <option value="">Select Nationality</option>
                  {NATIONALITIES.map((n) => (
                    <option key={n} value={n}>{n}</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label>Mother Tongue</label>
                <input name="motherTongue" value={formData.motherTongue || ''} onChange={handleInputChange} className="form-control" placeholder="e.g. Shona" />
              </div>
              <div className="form-group">
                <label>Date Admitted</label>
                <input type="date" name="dateAdmitted" value={formData.dateAdmitted ? new Date(formData.dateAdmitted).toISOString().split('T')[0] : (formData.enrollmentDate ? new Date(formData.enrollmentDate).toISOString().split('T')[0] : '')} onChange={handleInputChange} className="form-control" />
              </div>
              <div className="form-group">
                <label>Student Category</label>
                <input name="category" value={formData.category || ''} onChange={handleInputChange} className="form-control" placeholder="e.g. Day, Boarder" />
              </div>
              <div className="form-group">
                <label>Section</label>
                <input name="section" value={formData.section || ''} onChange={handleInputChange} className="form-control" placeholder="e.g. Alpha" />
              </div>
              <div className="form-group">
                <label>Dormitory / Room</label>
                <input name="dormitory" value={formData.dormitory || ''} onChange={handleInputChange} className="form-control" />
              </div>
              <div className="form-group">
                <label>Physical Handicap</label>
                <select name="isPhysicallyHandicapped" value={formData.isPhysicallyHandicapped || 'false'} onChange={handleInputChange} className="form-control">
                  <option value="false">No</option>
                  <option value="true">Yes</option>
                </select>
              </div>
              {formData.isPhysicallyHandicapped === 'true' && (
                <div className="form-group col-span-2">
                  <label>Handicap Details</label>
                  <input name="handicapDetails" value={formData.handicapDetails || ''} onChange={handleInputChange} className="form-control" placeholder="Specify nature of handicap..." />
                </div>
              )}
              
              <div className="form-section-header col-span-2">Previous Academic History</div>
              <div className="form-group">
                <label>Previous School Name</label>
                <input name="prevSchool" value={formData.prevSchool || formData.prevSchoolName || ''} onChange={handleInputChange} className="form-control" />
              </div>
              <div className="form-group">
                <label>Previous Class/Grade</label>
                <input name="prevSchoolClass" value={formData.prevSchoolClass || ''} onChange={handleInputChange} className="form-control" />
              </div>
              <div className="form-group col-span-2">
                <label>Previous School Address</label>
                <input name="prevSchoolAddress" value={formData.prevSchoolAddress || ''} onChange={handleInputChange} className="form-control" />
              </div>
              <div className="form-group col-span-2">
                <label>Purpose for Leaving</label>
                <textarea name="reasonForTransfer" value={formData.reasonForTransfer || formData.purposeForLeaving || ''} onChange={handleInputChange} className="form-control" rows={2} />
              </div>

              <div className="form-group">
                <label>Has Transfer Certificate?</label>
                <select name="hasTransferCertificate" value={formData.hasTransferCertificate || 'false'} onChange={handleInputChange} className="form-control">
                  <option value="false">No</option>
                  <option value="true">Yes</option>
                </select>
              </div>

              <div className="form-section-header col-span-2">Documents & Uploads</div>
              
              {formData.hasTransferCertificate === 'true' && (
                <div className="form-group border p-3 rounded" style={{ borderColor: docFiles.transferCertificate ? '#4ade80' : '#e2e8f0' }}>
                  <label className="text-xs font-bold block mb-1">
                    {docFiles.transferCertificate ? '✅ New TC Selected' : 'Upload Transfer Certificate'}
                  </label>
                  <input type="file" onChange={(e) => handleDocFileChange(e, 'transferCertificate')} style={{ fontSize: '0.7rem' }} />
                  {formData.transferCertificateUrl && (
                    <div className="mt-2 text-xs">
                      <a href={`${BASE_URL}/api/storage/file/${formData.transferCertificateUrl}?token=${localStorage.getItem('acadex_token')}`} target="_blank" rel="noreferrer" style={{ color: '#2563eb', fontWeight: 'bold', textDecoration: 'none' }}>
                        <i className="fas fa-eye mr-1"></i> View Existing TC
                      </a>
                    </div>
                  )}
                </div>
              )}

              <div className="form-group border p-3 rounded" style={{ borderColor: docFiles.birthCertificate ? '#4ade80' : '#e2e8f0' }}>
                <label className="text-xs font-bold block mb-1">
                  {docFiles.birthCertificate ? '✅ New BC Selected' : 'Upload Birth Certificate'}
                </label>
                <input type="file" onChange={(e) => handleDocFileChange(e, 'birthCertificate')} style={{ fontSize: '0.7rem' }} />
                {formData.birthCertificateUrl && (
                  <div className="mt-2 text-xs">
                    <a href={`${BASE_URL}/api/storage/file/${formData.birthCertificateUrl}?token=${localStorage.getItem('acadex_token')}`} target="_blank" rel="noreferrer" style={{ color: '#2563eb', fontWeight: 'bold', textDecoration: 'none' }}>
                      <i className="fas fa-eye mr-1"></i> View Existing BC
                    </a>
                  </div>
                )}
              </div>

            </div>
          );
        }

        return (
          <div className="modal-form-grid">
             <div className="form-group">
              <label>Department / Faculty</label>
              <select 
                name="departmentId" 
                value={formData.departmentId || ''} 
                onChange={e => {
                  const dept = departments.find(d => d.id === e.target.value);
                  setFormData({
                    ...formData, 
                    departmentId: e.target.value,
                    department: dept ? dept.name : ''
                  });
                }} 
                className="form-control"
              >
                <option value="">No Department</option>
                {departments.map(d => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label>Joined Date</label>
              <input type="date" name="joinedDate" value={formData.joinedDate ? new Date(formData.joinedDate).toISOString().split('T')[0] : ''} onChange={handleInputChange} className="form-control" />
            </div>
            <div className="form-group">
              <label>Secondary Role Extra</label>
              <input name="extraRoleInfo" value={formData.extraRoleInfo || ''} onChange={handleInputChange} className="form-control" />
            </div>

            {/* Role-Specific Details */}
            {user.role === 'ANCILLARY' && (
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
            {user.role === 'BURSAR' && (
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
            {user.role === 'LIBRARIAN' && (
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
            {user.role === 'TEACHER' && (
              <div className="form-group col-span-2">
                <label>Academic Qualifications</label>
                <input name="qualification" value={formData.qualification || ''} onChange={handleInputChange} className="form-control" placeholder="e.g. BSc Mathematics, DipEd" />
              </div>
            )}
            {user.role === 'SCHOOL_ADMIN' && (
              <div className="form-group col-span-2">
                <label>Role Description / Responsibility</label>
                <input name="roleDescription" value={formData.roleDescription || ''} onChange={handleInputChange} className="form-control" placeholder="e.g. Head of Academics, Operations Overseer" />
              </div>
            )}
            {user.role === 'SUPPLIER' && (
              <>
                <div className="form-group">
                  <label>Company / Enterprise Name *</label>
                  <input name="companyName" value={formData.companyName || ''} onChange={handleInputChange} className="form-control" required />
                </div>
                <div className="form-group">
                  <label>BP / Registration No *</label>
                  <input name="regNo" value={formData.regNo || ''} onChange={handleInputChange} className="form-control" required />
                </div>
                <div className="form-group">
                  <label>Year of Incorporation *</label>
                  <input type="number" name="incorpYear" value={formData.incorpYear || ''} onChange={handleInputChange} className="form-control" required />
                </div>
                <div className="form-group">
                  <label>Primary Specialization</label>
                  <input name="specialization" value={formData.specialization || ''} onChange={handleInputChange} className="form-control" />
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
                  <input name="designation" value={formData.designation || ''} onChange={handleInputChange} className="form-control" />
                </div>
                <div className="form-group">
                  <label>PRAZ Registration Number *</label>
                  <input name="prazNo" value={formData.prazNo || ''} onChange={handleInputChange} className="form-control" required />
                </div>
                <div className="form-group">
                   <label>PRAZ Expiry Date *</label>
                   <input type="date" name="prazExpiry" value={formData.prazExpiry ? new Date(formData.prazExpiry).toISOString().split('T')[0] : ''} onChange={handleInputChange} className="form-control" required />
                </div>
                <div className="form-group">
                  <label>Tax Clearance (BP) Number *</label>
                  <input name="taxNumber" value={formData.taxNumber || ''} onChange={handleInputChange} className="form-control" required />
                </div>
                <div className="form-group">
                   <label>Tax Clearance Expiry *</label>
                   <input type="date" name="taxExpiry" value={formData.taxExpiry ? new Date(formData.taxExpiry).toISOString().split('T')[0] : ''} onChange={handleInputChange} className="form-control" required />
                </div>
                <div className="form-group">
                   <label>NSSA Expiry Date</label>
                   <input type="date" name="nssaExpiry" value={formData.nssaExpiry ? new Date(formData.nssaExpiry).toISOString().split('T')[0] : ''} onChange={handleInputChange} className="form-control" />
                </div>
              </>
            )}
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="portal-modal-overlay">
      <div className="portal-modal user-edit-modal" style={{ width: '95%', maxWidth: '800px', maxHeight: '90vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div className="modal-header">
          <div className="header-titles">
            <h2>Edit User Profile</h2>
            <span>{user.staffId || user.studentId || user.id}</span>
          </div>
          <button className="close-modal" onClick={onClose}>&times;</button>
        </div>
        
        <div className="modal-tabs">
          <button className={`tab-btn ${activeTab === 'basic' ? 'active' : ''}`} onClick={() => setActiveTab('basic')}>Basic Info</button>
          <button className={`tab-btn ${activeTab === 'personal' ? 'active' : ''}`} onClick={() => setActiveTab('personal')}>Personal Details</button>
          <button className={`tab-btn ${activeTab === 'roles' ? 'active' : ''}`} onClick={() => setActiveTab('roles')}>Roles & Access</button>
          {isStaff && <button className={`tab-btn ${activeTab === 'hr' ? 'active' : ''}`} onClick={() => setActiveTab('hr')}>HR & Payroll</button>}
          <button className={`tab-btn ${activeTab === 'extra' ? 'active' : ''}`} onClick={() => setActiveTab('extra')}>{user.role === 'STUDENT' ? 'Academic Details' : 'Professional'}</button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
          <div className="modal-body" style={{ flex: 1, overflowY: 'auto', padding: '20px 25px' }}>
            {renderTabContent()}
          </div>
          
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? <i className="fas fa-spinner fa-spin"></i> : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default UserEditModal;
