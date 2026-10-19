import React, { useState, useRef, useEffect, useCallback } from 'react';
import api from '../../lib/api';
import { useToast } from '../../context/ToastContext';
import SecondaryRoleSelect from './SecondaryRoleSelect';
import { useAuth } from '../../contexts/AuthContext';
import {
  validateZimNationalId,
  validateNationalIdOrBirthCert,
  validatePhone,
  validateEmail,
  validateNssaNumber,
  validateZimraNumber,
  validateBankAccount,
  checkImageDimensions,
  checkAgeGradeMismatch,
  checkTeacherQualifications
} from '../../utils/validation';

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

interface DocFiles {
  idDoc?: File | null;
  residenceDoc?: File | null;
  qualificationsDoc?: File | null;
  transferCertificate?: File | null;
  birthCertificate?: File | null;
}

interface SchoolClass {
  id: string;
  name: string;
  level: string;
}

interface SchoolHouse {
  id: string;
  name: string;
}

interface SchoolClub {
  id: string;
  name: string;
}

interface SchoolHostel {
  id: string;
  name: string;
}

interface SchoolDepartment {
  id: string;
  name: string;
}

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
  const [formData, setFormData] = useState<Record<string, string>>({});
  const [docs, setDocs] = useState<Record<string, string>>({});
  const [docFiles, setDocFiles] = useState<DocFiles>({
    idDoc: null,
    residenceDoc: null,
    qualificationsDoc: null,
    transferCertificate: null,
    birthCertificate: null
  });
  const [classes, setClasses] = useState<SchoolClass[]>([]);
  const [departments, setDepartments] = useState<SchoolDepartment[]>([]);
  const [houses, setHouses] = useState<SchoolHouse[]>([]);
  const [clubs, setClubs] = useState<SchoolClub[]>([]);
  const [hostels, setHostels] = useState<SchoolHostel[]>([]);
  const [secondaryRoles, setSecondaryRoles] = useState<string[]>([]);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const { showToast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Validation & Live Duplicate Check States
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [duplicateWarnings, setDuplicateWarnings] = useState<{ email?: string; nationalId?: string }>({});
  const [isCheckingDuplicate, setIsCheckingDuplicate] = useState(false);
  const [ageGradeWarning, setAgeGradeWarning] = useState<string | null>(null);
  const [ageGradeAcknowledged, setAgeGradeAcknowledged] = useState(false);

  const STAFF_ROLES = ['TEACHER', 'BURSAR', 'LIBRARIAN', 'ANCILLARY', 'SCHOOL_ADMIN'];
  const [staffStep, setStaffStep] = useState(1);

  useEffect(() => {
    setStaffStep(1);
    setFieldErrors({});
    setDuplicateWarnings({});
    setAgeGradeWarning(null);
  }, [role]);

  // Load select options on open
  useEffect(() => {
    if (isOpen) {
      fetchClasses();
      fetchDepartments();
      fetchHouses();
      fetchClubs();
      fetchHostels();
    }
  }, [isOpen]);

  // Live duplicate checking (debounced 400ms)
  useEffect(() => {
    const checkEmail = (formData.email || '').trim();
    const checkNid = (formData.nationalId || '').trim();

    if (!checkEmail && !checkNid) {
      setDuplicateWarnings({});
      return;
    }

    const timer = setTimeout(async () => {
      try {
        setIsCheckingDuplicate(true);
        const params: Record<string, string> = { role };
        if (checkEmail && validateEmail(checkEmail)) params.email = checkEmail;
        if (checkNid) params.nationalId = checkNid;

        if (!params.email && !params.nationalId) {
          setIsCheckingDuplicate(false);
          return;
        }

        const res = await api.get('/api/users/check-duplicate', { params });
        setDuplicateWarnings({
          email: res.data.emailExists ? res.data.emailMessage : undefined,
          nationalId: res.data.nationalIdExists ? res.data.nationalIdMessage : undefined
        });
      } catch {
        // Non-blocking
      } finally {
        setIsCheckingDuplicate(false);
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [formData.email, formData.nationalId, role]);

  // Auto calculate age and evaluate age-vs-grade variance
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
        setFormData(prev => ({ ...prev, age: calculatedAge.toString() }));

        if (role === 'STUDENT' && formData.classId) {
          const selectedClassObj = classes.find(c => c.id === formData.classId);
          const className = selectedClassObj ? `${selectedClassObj.name} (${selectedClassObj.level})` : '';
          const mismatchResult = checkAgeGradeMismatch(calculatedAge, className);
          if (mismatchResult && mismatchResult.mismatch) {
            setAgeGradeWarning(mismatchResult.warning || null);
          } else {
            setAgeGradeWarning(null);
          }
        }
      }
    }
  }, [formData.dob, formData.classId, role, classes]);

  const fetchClasses = async () => {
    try {
      const { data } = await api.get('/api/classes');
      setClasses(data);
    } catch {
      console.error('Failed to fetch classes');
    }
  };

  const fetchDepartments = async () => {
    try {
      const { data } = await api.get('/api/departments');
      setDepartments(data);
    } catch {
      console.error('Failed to fetch departments');
    }
  };

  const fetchHouses = async () => {
    try {
      const { data } = await api.get('/api/schools/houses');
      setHouses(data);
    } catch {
      console.error('Failed to fetch houses');
    }
  };

  const fetchClubs = async () => {
    try {
      const { data } = await api.get('/api/schools/clubs-list');
      setClubs(data);
    } catch {
      console.error('Failed to fetch clubs');
    }
  };

  const fetchHostels = async () => {
    try {
      const { data } = await api.get('/api/ancillary/hostels');
      setHostels(data);
    } catch {
      console.error('Failed to fetch hostels');
    }
  };

  if (!isOpen) return null;

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));

    // Clear error for field upon typing
    if (fieldErrors[name]) {
      setFieldErrors(prev => {
        const copy = { ...prev };
        delete copy[name];
        return copy;
      });
    }
  };

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        showToast('Profile photo exceeds the 5MB size limit', 'error');
        setFieldErrors(prev => ({ ...prev, avatar: 'Photo exceeds 5MB limit' }));
        return;
      }
      if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
        showToast('Profile photo must be JPG or PNG', 'error');
        setFieldErrors(prev => ({ ...prev, avatar: 'Must be JPG or PNG' }));
        return;
      }

      // Check minimum dimensions (200x200px)
      const dimCheck = await checkImageDimensions(file, 200, 200);
      if (!dimCheck.valid) {
        showToast(dimCheck.message || 'Image resolution too low (minimum 200x200px)', 'error');
        setFieldErrors(prev => ({ ...prev, avatar: dimCheck.message || 'Minimum 200x200px required' }));
        return;
      }

      setFieldErrors(prev => {
        const copy = { ...prev };
        delete copy.avatar;
        return copy;
      });

      setAvatarFile(file);
      const reader = new FileReader();
      reader.onloadend = () => setAvatarPreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleDocFileChange = (e: React.ChangeEvent<HTMLInputElement>, key: string) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 15 * 1024 * 1024) {
        showToast('Document size exceeds 15MB limit', 'error');
        setFieldErrors(prev => ({ ...prev, [key]: 'Document exceeds 15MB limit' }));
        return;
      }
      const allowed = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'];
      if (!allowed.includes(file.type)) {
        showToast('Document must be PDF, JPG or PNG', 'error');
        setFieldErrors(prev => ({ ...prev, [key]: 'Must be PDF, JPG, or PNG' }));
        return;
      }

      setFieldErrors(prev => {
        const copy = { ...prev };
        delete copy[key];
        return copy;
      });

      setDocFiles(prev => ({ ...prev, [key]: file }));
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
      if (file.size > 15 * 1024 * 1024) {
        showToast('Document size exceeds 15MB limit', 'error');
        return;
      }
      try {
        const base64 = await toBase64(file);
        setDocs(prev => ({ ...prev, [docKey]: base64 }));
        showToast(`${docKey.replace(/([A-Z])/g, ' $1').trim()} updated!`, 'success');
      } catch {
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
    setFieldErrors({});
    setDuplicateWarnings({});
    setAgeGradeWarning(null);
    setAgeGradeAcknowledged(false);
    setRole(defaultRole || 'STUDENT');
    setStaffStep(1);
  };

  // Student Form Validation
  const validateStudentForm = () => {
    const errors: Record<string, string> = {};

    if (!formData.name || !formData.name.trim()) {
      errors.name = 'Full Name is required';
    }

    // Email is optional for student. If provided, check syntax.
    if (formData.email && formData.email.trim()) {
      if (!validateEmail(formData.email)) {
        errors.email = 'Invalid email syntax (e.g. student@school.co.zw)';
      }
    }

    if (formData.guardianEmail && formData.guardianEmail.trim()) {
      if (!validateEmail(formData.guardianEmail)) {
        errors.guardianEmail = 'Invalid guardian email syntax';
      }
    }

    if (!formData.classId) {
      errors.classId = 'Grade / Class assignment is required';
    }

    if (!formData.guardianName || !formData.guardianName.trim()) {
      errors.guardianName = 'Guardian / Parent Name is required';
    }

    if (!formData.guardianPhone || !formData.guardianPhone.trim()) {
      errors.guardianPhone = 'Guardian Phone Number is required';
    } else {
      const pCheck = validatePhone(formData.guardianPhone);
      if (!pCheck.valid) {
        errors.guardianPhone = 'Invalid phone format (use +263... or 07...)';
      }
    }

    if (formData.phone && formData.phone.trim()) {
      const pCheck = validatePhone(formData.phone);
      if (!pCheck.valid) {
        errors.phone = 'Invalid phone format (use +263... or 07...)';
      }
    }

    // National ID or Birth Certificate format
    if (formData.nationalId && formData.nationalId.trim()) {
      const nidCheck = validateNationalIdOrBirthCert(formData.nationalId);
      if (!nidCheck.valid) {
        errors.nationalId = 'Invalid format — use Zimbabwean National ID (e.g. 63-1234567-X-42) or Birth Certificate number';
      }
    }

    // DOB & Age logic (Age >= 5)
    if (formData.dob) {
      const bDate = new Date(formData.dob);
      if (bDate > new Date()) {
        errors.dob = 'Date of birth cannot be in the future';
      } else {
        const ageNum = parseInt(formData.age || '0', 10);
        if (ageNum < 5) {
          errors.dob = 'Student must be at least 5 years old for enrollment';
        }
      }
    }

    // Date Admitted <= today
    if (formData.dateAdmitted) {
      const aDate = new Date(formData.dateAdmitted);
      if (aDate > new Date()) {
        errors.dateAdmitted = 'Admission date cannot be in the future';
      }
    }

    // Duplicate check blocks
    if (duplicateWarnings.email) {
      errors.email = duplicateWarnings.email;
    }
    if (duplicateWarnings.nationalId) {
      errors.nationalId = duplicateWarnings.nationalId;
    }

    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) {
      const firstError = Object.values(errors)[0];
      showToast(firstError, 'warning');
      return false;
    }
    return true;
  };

  // Staff Wizard Step Validation
  const validateStaffStep = (stepNum: number) => {
    const errors: Record<string, string> = { ...fieldErrors };

    if (stepNum === 1) {
      delete errors.firstName;
      delete errors.lastName;
      delete errors.email;
      delete errors.nationalId;
      delete errors.phone;
      delete errors.dob;

      if (!formData.firstName || !formData.firstName.trim()) {
        errors.firstName = 'First Name is required';
      }
      if (!formData.lastName || !formData.lastName.trim()) {
        errors.lastName = 'Last Name is required';
      }
      if (!formData.email || !formData.email.trim()) {
        errors.email = 'Official Email Address is required';
      } else if (!validateEmail(formData.email)) {
        errors.email = 'Invalid email syntax (e.g. staff@school.co.zw)';
      }

      if (duplicateWarnings.email) {
        errors.email = duplicateWarnings.email;
      }

      // National ID required if nationality is Zimbabwean (or not specified)
      const isZim = !formData.nationality || formData.nationality.toLowerCase().includes('zimbabw');
      if (isZim) {
        if (!formData.nationalId || !formData.nationalId.trim()) {
          errors.nationalId = 'National ID is required for Zimbabwean staff members';
        } else if (!validateZimNationalId(formData.nationalId)) {
          errors.nationalId = 'Invalid Zimbabwean ID format — use 63-1234567-X-42';
        }
      } else if (formData.nationalId && formData.nationalId.trim() && !validateNationalIdOrBirthCert(formData.nationalId).valid) {
        errors.nationalId = 'Invalid identity document format';
      }

      if (duplicateWarnings.nationalId) {
        errors.nationalId = duplicateWarnings.nationalId;
      }

      if (formData.phone && formData.phone.trim()) {
        const pCheck = validatePhone(formData.phone);
        if (!pCheck.valid) {
          errors.phone = 'Invalid phone format (use +263... or 07...)';
        }
      }

      if (formData.dob) {
        const bDate = new Date(formData.dob);
        if (bDate > new Date()) {
          errors.dob = 'Date of birth cannot be in the future';
        } else {
          const ageNum = parseInt(formData.age || '0', 10);
          if (ageNum < 18) {
            errors.dob = 'Staff members must be at least 18 years of age';
          }
        }
      }

      setFieldErrors(errors);
      const step1Keys = ['firstName', 'lastName', 'email', 'nationalId', 'phone', 'dob'];
      const hasStep1Error = step1Keys.some(k => errors[k]);
      if (hasStep1Error) {
        const firstErrMsg = step1Keys.map(k => errors[k]).filter(Boolean)[0];
        showToast(firstErrMsg, 'warning');
        return false;
      }
      return true;
    }

    if (stepNum === 2) {
      delete errors.dateAssumedPost;
      delete errors.dateOfLeaving;
      delete errors.nssaNumber;
      delete errors.taxNumber;

      if (!formData.dateAssumedPost) {
        errors.dateAssumedPost = 'Date Assumed Post is required';
      } else {
        const aDate = new Date(formData.dateAssumedPost);
        if (aDate > new Date()) {
          errors.dateAssumedPost = 'Date assumed post cannot be in the future';
        }
      }

      if (formData.dateOfLeaving && formData.dateAssumedPost) {
        const lDate = new Date(formData.dateOfLeaving);
        const aDate = new Date(formData.dateAssumedPost);
        if (lDate < aDate) {
          errors.dateOfLeaving = 'Date of leaving cannot be earlier than date assumed post';
        }
      }

      if (formData.nssaNumber && formData.nssaNumber.trim() && !validateNssaNumber(formData.nssaNumber)) {
        errors.nssaNumber = 'Invalid NSSA number format (leave blank for pending)';
      }

      if (formData.taxNumber && formData.taxNumber.trim() && !validateZimraNumber(formData.taxNumber)) {
        errors.taxNumber = 'Invalid ZIMRA BP number format (leave blank for pending)';
      }

      setFieldErrors(errors);
      const step2Keys = ['dateAssumedPost', 'dateOfLeaving', 'nssaNumber', 'taxNumber'];
      const hasStep2Error = step2Keys.some(k => errors[k]);
      if (hasStep2Error) {
        const firstErrMsg = step2Keys.map(k => errors[k]).filter(Boolean)[0];
        showToast(firstErrMsg, 'warning');
        return false;
      }
      return true;
    }

    if (stepNum === 3) {
      delete errors.accountNumber;
      delete errors.accountNumberZig;

      if (formData.accountNumber && formData.accountNumber.trim()) {
        const check = validateBankAccount(formData.accountNumber, formData.bankName);
        if (!check.valid) errors.accountNumber = check.message || 'Invalid USD account number format';
      }
      if (formData.accountNumberZig && formData.accountNumberZig.trim()) {
        const check = validateBankAccount(formData.accountNumberZig, formData.bankNameZig);
        if (!check.valid) errors.accountNumberZig = check.message || 'Invalid ZiG account number format';
      }

      setFieldErrors(errors);
      const step3Keys = ['accountNumber', 'accountNumberZig'];
      const hasStep3Error = step3Keys.some(k => errors[k]);
      if (hasStep3Error) {
        const firstErrMsg = step3Keys.map(k => errors[k]).filter(Boolean)[0];
        showToast(firstErrMsg, 'warning');
        return false;
      }
      return true;
    }

    return true;
  };

  const handleSubmit = async (e?: React.FormEvent, addAnother = false) => {
    if (e) e.preventDefault();

    const isStaff = STAFF_ROLES.includes(role);
    if (isStaff) {
      if (staffStep < 4) {
        validateStaffStep(staffStep);
        return;
      }
      if (!validateStaffStep(1) || !validateStaffStep(2) || !validateStaffStep(3)) {
        return;
      }
    } else if (role === 'STUDENT') {
      if (!validateStudentForm()) return;
    }

    // Check duplicate blockers
    if (duplicateWarnings.email || duplicateWarnings.nationalId) {
      showToast(duplicateWarnings.email || duplicateWarnings.nationalId || 'Duplicate identity detected', 'error');
      return;
    }

    setLoading(true);

    try {
      const data = new FormData();
      data.append('password', 'Password');
      data.append('role', role);

      // Append standard fields
      Object.keys(formData).forEach(key => {
        if (formData[key] !== undefined && formData[key] !== null) {
          data.append(key, formData[key]);
        }
      });

      if (isStaff) {
        const combinedName = `${formData.firstName || ''} ${formData.lastName || ''}`.trim();
        data.append('name', combinedName);
        if (formData.departmentId) {
          const matchedDept = departments.find(d => d.id === formData.departmentId);
          if (matchedDept && !formData.department) {
            data.append('department', matchedDept.name);
          }
        }
        if (formData.nokRelationship) {
          data.append('nokRelation', formData.nokRelationship);
        }
        if (formData.religion === 'Other' && formData.religionCustom) {
          data.set('religion', formData.religionCustom);
        }
      }

      if (role === 'STUDENT') {
        if (formData.guardianName) data.append('nokName', formData.guardianName);
        if (formData.guardianPhone) data.append('nokPhone', formData.guardianPhone);
        if (formData.guardianEmail) data.append('guardianEmail', formData.guardianEmail);
      }

      if (role === 'SUPPLIER') {
        const metadata = { ...formData, docs };
        data.append('metadata', JSON.stringify(metadata));
      }

      // Staff docs
      if (isStaff) {
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
      onSuccess();

      if (addAnother) {
        resetForm();
        showToast(`Ready to enroll next ${role.toLowerCase()}.`, 'info');
      } else {
        resetForm();
        onClose();
      }
    } catch (error) {
      const err = error as { response?: { data?: { error?: string } } };
      showToast(err.response?.data?.error || 'Failed to create user', 'error');
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
          background: #2563eb;
          color: white;
        }
        .step-item.done .step-num {
          background: #16a34a;
          color: white;
        }
        .step-item span {
          font-size: 0.75rem;
        }
        .input-error {
          border-color: #ef4444 !important;
          background-color: #fef2f2 !important;
        }
        .field-error-msg {
          color: #dc2626;
          font-size: 0.75rem;
          margin-top: 4px;
          display: flex;
          align-items: center;
          gap: 4px;
        }
        .field-duplicate-msg {
          color: #b91c1c;
          font-size: 0.75rem;
          margin-top: 4px;
          font-weight: 600;
          display: flex;
          align-items: center;
          gap: 4px;
        }
      `}</style>
      <div className="portal-modal user-edit-modal" style={{ position: 'relative', width: '95%', maxWidth: '1100px', maxHeight: '90vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div className="modal-header" style={{ position: 'relative' }}>
          <div className="header-titles">
            <h2>Add New {role.charAt(0) + role.slice(1).toLowerCase()}</h2>
            <span>System User Creation & HR Onboarding</span>
          </div>
          <button className="close-modal" onClick={onClose} type="button">&times;</button>
        </div>
        
        <div style={{ flex: 1, overflowY: 'auto', padding: '0 20px 20px' }}>
          <form
            onSubmit={(e) => handleSubmit(e, false)}
            id="createUserForm"
            noValidate
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                const target = e.target as HTMLElement;
                if (target.tagName.toLowerCase() !== 'textarea') {
                  e.preventDefault();
                }
              }
            }}
          >
            
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
                  <div className={`step-item ${staffStep === 4 ? 'active' : ''}`} onClick={() => validateStaffStep(1) && validateStaffStep(2) && validateStaffStep(3) && setStaffStep(4)}>
                    <div className="step-num">4</div>
                    <span>Documents &amp; Kin</span>
                  </div>
                </div>

                {/* Step 1: Personal */}
                {staffStep === 1 && (
                  <div className="modal-form-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 20 }}>
                    <div className="avatar-upload-section row-span-2">
                      <div
                        className="avatar-preview-large"
                        onClick={() => fileInputRef.current?.click()}
                        style={{ cursor: 'pointer', borderColor: fieldErrors.avatar ? '#ef4444' : undefined }}
                      >
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
                        accept="image/jpeg,image/png,image/webp"
                        style={{ display: 'none' }}
                      />
                      <p className="help-text text-center mt-2">Profile Avatar (Max 5MB, min 200x200px)</p>
                      {fieldErrors.avatar && <span className="field-error-msg justify-center"><i className="fas fa-exclamation-circle"></i>{fieldErrors.avatar}</span>}
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
                        <option value="Rev.">Rev.</option>
                        <option value="Fr.">Fr.</option>
                        <option value="Sr.">Sr.</option>
                        <option value="Pastor">Pastor</option>
                        <option value="Eng.">Eng.</option>
                      </select>
                    </div>

                    <div className="form-group">
                      <label>First Name <span className="text-red-500">*</span></label>
                      <input
                        name="firstName"
                        value={formData.firstName || ''}
                        onChange={handleInputChange}
                        className={`form-control ${fieldErrors.firstName ? 'input-error' : ''}`}
                        required
                        placeholder="John"
                      />
                      {fieldErrors.firstName && <span className="field-error-msg"><i className="fas fa-exclamation-circle"></i>{fieldErrors.firstName}</span>}
                    </div>

                    <div className="form-group">
                      <label>Last Name <span className="text-red-500">*</span></label>
                      <input
                        name="lastName"
                        value={formData.lastName || ''}
                        onChange={handleInputChange}
                        className={`form-control ${fieldErrors.lastName ? 'input-error' : ''}`}
                        required
                        placeholder="Doe"
                      />
                      {fieldErrors.lastName && <span className="field-error-msg"><i className="fas fa-exclamation-circle"></i>{fieldErrors.lastName}</span>}
                    </div>

                    <div className="form-group">
                      <label>Email Address <span className="text-red-500">*</span></label>
                      <input
                        type="email"
                        name="email"
                        value={formData.email || ''}
                        onChange={handleInputChange}
                        className={`form-control ${fieldErrors.email || duplicateWarnings.email ? 'input-error' : ''}`}
                        required
                        placeholder="john.doe@school.co.zw"
                      />
                      {duplicateWarnings.email ? (
                        <span className="field-duplicate-msg"><i className="fas fa-exclamation-triangle"></i>{duplicateWarnings.email}</span>
                      ) : fieldErrors.email ? (
                        <span className="field-error-msg"><i className="fas fa-exclamation-circle"></i>{fieldErrors.email}</span>
                      ) : (
                        <small className="help-text">Used for staff authentication and secure portal access</small>
                      )}
                    </div>

                    <div className="form-group">
                      <label>Phone Number</label>
                      <input
                        type="tel"
                        name="phone"
                        value={formData.phone || ''}
                        onChange={handleInputChange}
                        className={`form-control ${fieldErrors.phone ? 'input-error' : ''}`}
                        placeholder="+263 77 123 4567"
                      />
                      {fieldErrors.phone ? (
                        <span className="field-error-msg"><i className="fas fa-exclamation-circle"></i>{fieldErrors.phone}</span>
                      ) : (
                        <small className="help-text">e.g. +263... or 07...</small>
                      )}
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
                      <input
                        type="date"
                        name="dob"
                        value={formData.dob || ''}
                        onChange={handleInputChange}
                        className={`form-control ${fieldErrors.dob ? 'input-error' : ''}`}
                      />
                      {fieldErrors.dob ? (
                        <span className="field-error-msg"><i className="fas fa-exclamation-circle"></i>{fieldErrors.dob}</span>
                      ) : (
                        <small className="help-text">Staff must be 18+ years of age</small>
                      )}
                    </div>

                    <div className="form-group">
                      <label>Nationality</label>
                      <select name="nationality" value={formData.nationality || 'Zimbabwean'} onChange={handleInputChange} className="form-control">
                        {NATIONALITIES.map((n) => (
                          <option key={n} value={n}>{n}</option>
                        ))}
                      </select>
                    </div>

                    <div className="form-group">
                      <label>
                        National ID {(!formData.nationality || formData.nationality.toLowerCase().includes('zimbabw')) ? <span className="text-red-500">*</span> : '(Optional)'}
                      </label>
                      <input
                        name="nationalId"
                        value={formData.nationalId || ''}
                        onChange={handleInputChange}
                        className={`form-control ${fieldErrors.nationalId || duplicateWarnings.nationalId ? 'input-error' : ''}`}
                        placeholder="63-1234567-X-42"
                      />
                      {duplicateWarnings.nationalId ? (
                        <span className="field-duplicate-msg"><i className="fas fa-exclamation-triangle"></i>{duplicateWarnings.nationalId}</span>
                      ) : fieldErrors.nationalId ? (
                        <span className="field-error-msg"><i className="fas fa-exclamation-circle"></i>{fieldErrors.nationalId}</span>
                      ) : (
                        <small className="help-text">Format: 63-1234567-X-42</small>
                      )}
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
                      <label>Religion</label>
                      <select name="religion" value={formData.religion || ''} onChange={handleInputChange} className="form-control">
                        <option value="">Select Religion</option>
                        <option value="Christianity">Christianity</option>
                        <option value="Islam">Islam</option>
                        <option value="Hinduism">Hinduism</option>
                        <option value="Judaism">Judaism</option>
                        <option value="Buddhism">Buddhism</option>
                        <option value="None">None</option>
                        <option value="Other">Other</option>
                      </select>
                      {formData.religion === 'Other' && (
                        <input
                          name="religionCustom"
                          value={formData.religionCustom || ''}
                          onChange={handleInputChange}
                          className="form-control"
                          placeholder="Specify religion..."
                          style={{ marginTop: 6 }}
                        />
                      )}
                    </div>

                    <div className="form-group" style={{ gridColumn: 'span 3' }}>
                      <label>Allergies (if any)</label>
                      <textarea
                        name="allergies"
                        value={formData.allergies || ''}
                        onChange={handleInputChange}
                        className="form-control"
                        rows={2}
                        placeholder="e.g. Penicillin, Peanuts, Latex (leave blank if none)"
                      />
                    </div>

                    <div className="form-group" style={{ gridColumn: 'span 3' }}>
                      <label>Chronic Conditions / Regular Medications</label>
                      <textarea
                        name="medications"
                        value={formData.medications || ''}
                        onChange={handleInputChange}
                        className="form-control"
                        rows={2}
                        placeholder="e.g. Asthma (Salbutamol), Diabetes (Metformin) — leave blank if none"
                      />
                    </div>

                    <div className="form-group" style={{ gridColumn: 'span 3' }}>
                      <label>Physical Address</label>
                      <textarea name="address" value={formData.address || ''} onChange={handleInputChange} className="form-control" rows={2} placeholder="Enter residential address..." />
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
                      <input 
                        name="designation" 
                        value={formData.designation || ''} 
                        onChange={handleInputChange} 
                        list="staff-designations-list"
                        className="form-control" 
                        placeholder="e.g. Senior Lecturer / Head of Dept" 
                      />
                    </div>

                    <div className="form-group">
                      <label>Date Assumed Post <span className="text-red-500">*</span></label>
                      <input
                        type="date"
                        name="dateAssumedPost"
                        value={formData.dateAssumedPost || ''}
                        onChange={handleInputChange}
                        className={`form-control ${fieldErrors.dateAssumedPost ? 'input-error' : ''}`}
                        required
                      />
                      {fieldErrors.dateAssumedPost ? (
                        <span className="field-error-msg"><i className="fas fa-exclamation-circle"></i>{fieldErrors.dateAssumedPost}</span>
                      ) : (
                        <small className="help-text">Must be ≤ today</small>
                      )}
                    </div>

                    <div className="form-group">
                      <label>Date of Leaving</label>
                      <input
                        type="date"
                        name="dateOfLeaving"
                        value={formData.dateOfLeaving || ''}
                        onChange={handleInputChange}
                        className={`form-control ${fieldErrors.dateOfLeaving ? 'input-error' : ''}`}
                      />
                      {fieldErrors.dateOfLeaving ? (
                        <span className="field-error-msg"><i className="fas fa-exclamation-circle"></i>{fieldErrors.dateOfLeaving}</span>
                      ) : (
                        <small className="help-text">Optional contract conclusion date</small>
                      )}
                    </div>

                    {/* Statutory Compliance Numbers (NSSA & ZIMRA) */}
                    <div className="form-group">
                      <label>NSSA Statutory Number</label>
                      <input
                        name="nssaNumber"
                        value={formData.nssaNumber || ''}
                        onChange={handleInputChange}
                        className={`form-control ${fieldErrors.nssaNumber ? 'input-error' : ''}`}
                        placeholder="e.g. 12345678"
                      />
                      {fieldErrors.nssaNumber ? (
                        <span className="field-error-msg"><i className="fas fa-exclamation-circle"></i>{fieldErrors.nssaNumber}</span>
                      ) : (
                        <small className="help-text">Leave blank to auto-flag as 'Pending Registration'</small>
                      )}
                    </div>

                    <div className="form-group">
                      <label>ZIMRA Tax BP Number</label>
                      <input
                        name="taxNumber"
                        value={formData.taxNumber || ''}
                        onChange={handleInputChange}
                        className={`form-control ${fieldErrors.taxNumber ? 'input-error' : ''}`}
                        placeholder="e.g. 0200123456"
                      />
                      {fieldErrors.taxNumber ? (
                        <span className="field-error-msg"><i className="fas fa-exclamation-circle"></i>{fieldErrors.taxNumber}</span>
                      ) : (
                        <small className="help-text">Leave blank to auto-flag as 'Pending Registration'</small>
                      )}
                    </div>

                    {/* Role-Specific Qualifications */}
                    <div className="form-group" style={{ gridColumn: 'span 3' }}>
                      <label className="font-semibold text-sm text-gray-700 block border-b pb-1 mb-3">Role-Specific Qualifications &amp; Details</label>
                    </div>

                    {role === 'TEACHER' && (
                      <div className="form-group" style={{ gridColumn: 'span 3' }}>
                        <label>Academic Qualifications</label>
                        <input
                          name="qualification"
                          value={formData.qualification || ''}
                          onChange={handleInputChange}
                          className="form-control"
                          placeholder="e.g. BSc Mathematics, DipEd"
                        />
                        {/* Qualification match advisory banner (non-blocking) */}
                        {formData.qualification !== undefined && (
                          <div style={{ marginTop: '8px' }}>
                            <div style={{
                              padding: '8px 12px',
                              borderRadius: '6px',
                              background: checkTeacherQualifications(formData.qualification).hasQualification ? '#f0fdf4' : '#eff6ff',
                              border: `1px solid ${checkTeacherQualifications(formData.qualification).hasQualification ? '#bbf7d0' : '#bfdbfe'}`,
                              color: checkTeacherQualifications(formData.qualification).hasQualification ? '#166534' : '#1e40af',
                              fontSize: '0.78rem',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '6px'
                            }}>
                              <i className={`fas ${checkTeacherQualifications(formData.qualification).hasQualification ? 'fa-check-circle' : 'fa-info-circle'}`}></i>
                              <span>{checkTeacherQualifications(formData.qualification).warning || 'Teaching credential recorded.'}</span>
                            </div>
                          </div>
                        )}
                      </div>
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
                    <div className="form-group" style={{ gridColumn: 'span 3' }}>
                      <label className="font-semibold text-sm text-gray-700 block border-b pb-1 mb-2">💵 USD Banking Details (Nostro / Foreign Currency Account)</label>
                    </div>
                    <div className="form-group"><label>Bank Name (USD)</label><input name="bankName" value={formData.bankName || ''} onChange={handleInputChange} list="zim-banks-list" className="form-control" placeholder="e.g. Stanbic / CABS" /></div>
                    <div className="form-group"><label>Bank Branch (USD)</label><input name="bankBranch" value={formData.bankBranch || ''} onChange={handleInputChange} className="form-control" placeholder="e.g. Samora Machel" /></div>
                    <div className="form-group"><label>Branch Code (USD)</label><input name="branchCode" value={formData.branchCode || ''} onChange={handleInputChange} className="form-control" placeholder="e.g. 02100" /></div>
                    <div className="form-group">
                      <label>Account Number (USD)</label>
                      <input
                        name="accountNumber"
                        value={formData.accountNumber || ''}
                        onChange={handleInputChange}
                        className={`form-control ${fieldErrors.accountNumber ? 'input-error' : ''}`}
                        placeholder="e.g. 9140002847192"
                      />
                      {fieldErrors.accountNumber && <span className="field-error-msg"><i className="fas fa-exclamation-circle"></i>{fieldErrors.accountNumber}</span>}
                    </div>
                    <div className="form-group"><label>Account Holder Name (USD)</label><input name="accountHolderName" value={formData.accountHolderName || ''} onChange={handleInputChange} className="form-control" /></div>
                    <div className="form-group"><label>Account Type (USD)</label><input name="accountType" value={formData.accountType || ''} onChange={handleInputChange} className="form-control" placeholder="Nostro / Current" /></div>

                    <div className="form-group" style={{ gridColumn: 'span 3' }}>
                      <label className="font-semibold text-sm text-gray-700 block border-b pb-1 mt-2 mb-2">🪙 ZiG Banking Details (Local Currency Account)</label>
                    </div>
                    <div className="form-group"><label>Bank Name (ZiG)</label><input name="bankNameZig" value={formData.bankNameZig || ''} onChange={handleInputChange} list="zim-banks-list" className="form-control" placeholder="e.g. CBZ Bank" /></div>
                    <div className="form-group"><label>Bank Branch (ZiG)</label><input name="bankBranchZig" value={formData.bankBranchZig || ''} onChange={handleInputChange} className="form-control" /></div>
                    <div className="form-group"><label>Branch Code (ZiG)</label><input name="branchCodeZig" value={formData.branchCodeZig || ''} onChange={handleInputChange} className="form-control" /></div>
                    <div className="form-group">
                      <label>Account Number (ZiG)</label>
                      <input
                        name="accountNumberZig"
                        value={formData.accountNumberZig || ''}
                        onChange={handleInputChange}
                        className={`form-control ${fieldErrors.accountNumberZig ? 'input-error' : ''}`}
                        placeholder="e.g. 0112349001928"
                      />
                      {fieldErrors.accountNumberZig && <span className="field-error-msg"><i className="fas fa-exclamation-circle"></i>{fieldErrors.accountNumberZig}</span>}
                    </div>
                    <div className="form-group"><label>Account Holder Name (ZiG)</label><input name="accountHolderNameZig" value={formData.accountHolderNameZig || ''} onChange={handleInputChange} className="form-control" /></div>
                    <div className="form-group"><label>Account Type (ZiG)</label><input name="accountTypeZig" value={formData.accountTypeZig || ''} onChange={handleInputChange} className="form-control" placeholder="Savings / Current" /></div>

                    <div className="form-group" style={{ gridColumn: 'span 3', marginTop: '1rem' }}>
                      <label className="font-semibold text-sm text-gray-700 block border-b pb-1 mb-3">Professional &amp; Social Profiles</label>
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
                      <label className="font-semibold text-sm text-gray-700 block border-b pb-1 mb-3">Emergency &amp; Next of Kin</label>
                    </div>
                    <div className="form-group">
                      <label>Kin Name</label>
                      <input name="nokName" value={formData.nokName || ''} onChange={handleInputChange} className="form-control" placeholder="e.g. Mary Doe" />
                    </div>
                    <div className="form-group">
                      <label>Kin Phone</label>
                      <input
                        name="nokPhone"
                        value={formData.nokPhone || ''}
                        onChange={handleInputChange}
                        className={`form-control ${fieldErrors.nokPhone ? 'input-error' : ''}`}
                        placeholder="+263..."
                      />
                      {fieldErrors.nokPhone && <span className="field-error-msg"><i className="fas fa-exclamation-circle"></i>{fieldErrors.nokPhone}</span>}
                    </div>
                    <div className="form-group">
                      <label>Kin Relationship</label>
                      <select
                        name="nokRelationship"
                        value={['Spouse', 'Parent', 'Sibling', 'Child', 'Guardian', 'Next of Kin', 'Friend', 'Colleague'].includes(formData.nokRelationship) ? formData.nokRelationship : (formData.nokRelationship ? 'Other' : '')}
                        onChange={(e) => {
                          const val = e.target.value;
                          if (val === 'Other') {
                            setFormData(prev => ({ ...prev, nokRelationship: prev.nokRelationshipCustom || 'Other' }));
                          } else {
                            setFormData(prev => ({ ...prev, nokRelationship: val }));
                          }
                        }}
                        className="form-control"
                      >
                        <option value="">Select Relationship...</option>
                        <option value="Spouse">Spouse</option>
                        <option value="Parent">Parent</option>
                        <option value="Sibling">Sibling</option>
                        <option value="Child">Child</option>
                        <option value="Guardian">Guardian</option>
                        <option value="Next of Kin">Next of Kin</option>
                        <option value="Friend">Friend</option>
                        <option value="Colleague">Colleague</option>
                        <option value="Other">Other</option>
                      </select>
                      {(!['Spouse', 'Parent', 'Sibling', 'Child', 'Guardian', 'Next of Kin', 'Friend', 'Colleague', ''].includes(formData.nokRelationship) || formData.nokRelationship === 'Other') && (
                        <input
                          name="nokRelationshipCustom"
                          value={formData.nokRelationshipCustom ?? (['Spouse', 'Parent', 'Sibling', 'Child', 'Guardian', 'Next of Kin', 'Friend', 'Colleague', 'Other'].includes(formData.nokRelationship) ? '' : formData.nokRelationship)}
                          onChange={(e) => {
                            const val = e.target.value;
                            setFormData(prev => ({ ...prev, nokRelationshipCustom: val, nokRelationship: val || 'Other' }));
                          }}
                          className="form-control"
                          placeholder="Specify relationship..."
                          style={{ marginTop: 6 }}
                        />
                      )}
                    </div>

                    <div className="form-group" style={{ gridColumn: 'span 3' }}>
                      <label className="font-semibold text-sm text-gray-700 block border-b pb-1 mb-3">Compliance Documentation Uploads (Max 15MB each, PDF/JPG/PNG)</label>
                    </div>
                    <div className="form-group border p-3 rounded" style={{ borderColor: docFiles.idDoc ? '#16a34a' : (fieldErrors.idDoc ? '#ef4444' : '#e2e8f0') }}>
                       <label className="text-xs font-bold block mb-1">{docFiles.idDoc ? '✅ ID Uploaded' : 'Upload National ID'}</label>
                       <input type="file" onChange={(e) => handleDocFileChange(e, 'idDoc')} accept=".pdf,image/jpeg,image/png" style={{ fontSize: '0.7rem' }} />
                       {fieldErrors.idDoc && <span className="field-error-msg"><i className="fas fa-exclamation-circle"></i>{fieldErrors.idDoc}</span>}
                    </div>
                    <div className="form-group border p-3 rounded" style={{ borderColor: docFiles.residenceDoc ? '#16a34a' : (fieldErrors.residenceDoc ? '#ef4444' : '#e2e8f0') }}>
                       <label className="text-xs font-bold block mb-1">{docFiles.residenceDoc ? '✅ Residence Doc Uploaded' : 'Proof of Residence'}</label>
                       <input type="file" onChange={(e) => handleDocFileChange(e, 'residenceDoc')} accept=".pdf,image/jpeg,image/png" style={{ fontSize: '0.7rem' }} />
                       {fieldErrors.residenceDoc && <span className="field-error-msg"><i className="fas fa-exclamation-circle"></i>{fieldErrors.residenceDoc}</span>}
                    </div>
                    <div className="form-group border p-3 rounded" style={{ borderColor: docFiles.qualificationsDoc ? '#16a34a' : (fieldErrors.qualificationsDoc ? '#ef4444' : '#e2e8f0') }}>
                       <label className="text-xs font-bold block mb-1">{docFiles.qualificationsDoc ? '✅ Qualifications Uploaded' : 'Qualifications (PDF)'}</label>
                       <input type="file" onChange={(e) => handleDocFileChange(e, 'qualificationsDoc')} accept=".pdf,image/jpeg,image/png" style={{ fontSize: '0.7rem' }} />
                       {fieldErrors.qualificationsDoc && <span className="field-error-msg"><i className="fas fa-exclamation-circle"></i>{fieldErrors.qualificationsDoc}</span>}
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
                    <div
                      className="avatar-preview-large"
                      onClick={() => fileInputRef.current?.click()}
                      style={{ cursor: 'pointer', borderColor: fieldErrors.avatar ? '#ef4444' : undefined }}
                    >
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
                      accept="image/jpeg,image/png,image/webp"
                      style={{ display: 'none' }}
                    />
                    <p className="help-text text-center mt-2">Profile Avatar (Max 5MB, min 200x200px)</p>
                    {fieldErrors.avatar && <span className="field-error-msg justify-center"><i className="fas fa-exclamation-circle"></i>{fieldErrors.avatar}</span>}
                  </div>

                  <div className="form-group">
                    <label>Full Name <span className="text-red-500">*</span></label>
                    <input
                      name="name"
                      value={formData.name || ''}
                      onChange={handleInputChange}
                      className={`form-control ${fieldErrors.name ? 'input-error' : ''}`}
                      required
                      placeholder="Tendai Chikore"
                    />
                    {fieldErrors.name && <span className="field-error-msg"><i className="fas fa-exclamation-circle"></i>{fieldErrors.name}</span>}
                  </div>

                  <div className="form-group">
                    <label>Student Email Address <span className="text-gray-400 font-normal text-xs">(Optional)</span></label>
                    <input
                      type="email"
                      name="email"
                      value={formData.email || ''}
                      onChange={handleInputChange}
                      className={`form-control ${fieldErrors.email || duplicateWarnings.email ? 'input-error' : ''}`}
                      placeholder="student@school.co.zw"
                    />
                    {duplicateWarnings.email ? (
                      <span className="field-duplicate-msg"><i className="fas fa-exclamation-triangle"></i>{duplicateWarnings.email}</span>
                    ) : fieldErrors.email ? (
                      <span className="field-error-msg"><i className="fas fa-exclamation-circle"></i>{fieldErrors.email}</span>
                    ) : (
                      <small className="help-text">Optional — if left blank, Guardian's email will be used</small>
                    )}
                  </div>

                  <div className="form-group">
                    <label>Contact Phone</label>
                    <input
                      type="tel"
                      name="phone"
                      value={formData.phone || ''}
                      onChange={handleInputChange}
                      className={`form-control ${fieldErrors.phone ? 'input-error' : ''}`}
                      placeholder="+263 77..."
                    />
                    {fieldErrors.phone && <span className="field-error-msg"><i className="fas fa-exclamation-circle"></i>{fieldErrors.phone}</span>}
                  </div>
                </div>

                {/* Student Specific Fields */}
                {role === 'STUDENT' && (
                  <>
                    <div className="form-section-header mt-6">Identity &amp; Background</div>
                    <div className="modal-form-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 20 }}>
                      <div className="form-group">
                        <label>National ID / Birth Cert No. <span className="text-gray-400 font-normal text-xs">(Optional)</span></label>
                        <input 
                          name="nationalId" 
                          value={formData.nationalId || ''} 
                          onChange={handleInputChange} 
                          className={`form-control ${fieldErrors.nationalId || duplicateWarnings.nationalId ? 'input-error' : ''}`}
                          placeholder="e.g. 63-1234567-X-42 or BC-98765" 
                        />
                        {duplicateWarnings.nationalId ? (
                          <span className="field-duplicate-msg"><i className="fas fa-exclamation-triangle"></i>{duplicateWarnings.nationalId}</span>
                        ) : fieldErrors.nationalId ? (
                          <span className="field-error-msg"><i className="fas fa-exclamation-circle"></i>{fieldErrors.nationalId}</span>
                        ) : (
                          <small className="help-text">Zimbabwean ID or Birth Certificate number</small>
                        )}
                      </div>

                      <div className="form-group">
                        <label>Date of Birth</label>
                        <input
                          type="date"
                          name="dob"
                          value={formData.dob || ''}
                          onChange={handleInputChange}
                          className={`form-control ${fieldErrors.dob ? 'input-error' : ''}`}
                        />
                        {fieldErrors.dob && <span className="field-error-msg"><i className="fas fa-exclamation-circle"></i>{fieldErrors.dob}</span>}
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
                        <label>Age (Auto-calculated)</label>
                        <input name="age" value={formData.age ? `${formData.age} Years` : ''} readOnly className="form-control" style={{ background: '#f1f5f9' }} placeholder="Auto-calculated" />
                      </div>

                      <div className="form-group">
                        <label>Nationality</label>
                        <select name="nationality" value={formData.nationality || 'Zimbabwean'} onChange={handleInputChange} className="form-control">
                          {NATIONALITIES.map((n) => (
                            <option key={n} value={n}>{n}</option>
                          ))}
                        </select>
                      </div>

                      <div className="form-group">
                        <label>Mother Tongue</label>
                        <input name="motherTongue" value={formData.motherTongue || ''} onChange={handleInputChange} className="form-control" placeholder="e.g. Shona, Ndebele" />
                      </div>

                      <div className="form-group">
                        <label>Religion</label>
                        <select name="religion" value={formData.religion || ''} onChange={handleInputChange} className="form-control">
                          <option value="">Select Religion</option>
                          <option value="Christianity">Christianity</option>
                          <option value="Islam">Islam</option>
                          <option value="Hinduism">Hinduism</option>
                          <option value="Judaism">Judaism</option>
                          <option value="Buddhism">Buddhism</option>
                          <option value="None">None</option>
                          <option value="Other">Other</option>
                        </select>
                        {formData.religion === 'Other' && (
                          <input
                            name="religionCustom"
                            value={formData.religionCustom || ''}
                            onChange={handleInputChange}
                            className="form-control"
                            placeholder="Specify religion..."
                            style={{ marginTop: 6 }}
                          />
                        )}
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
                        <label>Physical Handicap</label>
                        <select name="isPhysicallyHandicapped" value={formData.isPhysicallyHandicapped || 'false'} onChange={handleInputChange} className="form-control">
                          <option value="false">No</option>
                          <option value="true">Yes</option>
                        </select>
                      </div>

                      {formData.isPhysicallyHandicapped === 'true' && (
                        <div className="form-group col-span-3" style={{ gridColumn: 'span 3' }}>
                          <label>Handicap Details</label>
                          <input name="handicapDetails" value={formData.handicapDetails || ''} onChange={handleInputChange} className="form-control" placeholder="Specify nature of handicap..." />
                        </div>
                      )}

                      <div className="form-group" style={{ gridColumn: 'span 3' }}>
                        <label>Allergies (if any)</label>
                        <textarea
                          name="allergies"
                          value={formData.allergies || ''}
                          onChange={handleInputChange}
                          className="form-control"
                          rows={2}
                          placeholder="e.g. Penicillin, Peanuts, Latex (leave blank if none)"
                        />
                      </div>

                      <div className="form-group" style={{ gridColumn: 'span 3' }}>
                        <label>Chronic Conditions / Regular Medications</label>
                        <textarea
                          name="medications"
                          value={formData.medications || ''}
                          onChange={handleInputChange}
                          className="form-control"
                          rows={2}
                          placeholder="e.g. Asthma (Salbutamol), Diabetes (Metformin) — leave blank if none"
                        />
                      </div>
                    </div>

                    <div className="form-section-header mt-6">Institutional Assignment</div>
                    <div className="modal-form-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 20 }}>
                      <div className="form-group" style={{ gridColumn: ageGradeWarning ? 'span 3' : 'span 1' }}>
                        <label>{isK12 ? 'Grade / Class Assignment' : 'Program / Cohort Assignment'} <span className="text-red-500">*</span></label>
                        <select
                          name="classId"
                          value={formData.classId || ''}
                          onChange={handleInputChange}
                          className={`form-control ${fieldErrors.classId ? 'input-error' : ''}`}
                          required
                        >
                          <option value="">Select Class</option>
                          {classes.map(c => (
                            <option key={c.id} value={c.id}>{c.name} ({c.level})</option>
                          ))}
                        </select>
                        {fieldErrors.classId && <span className="field-error-msg"><i className="fas fa-exclamation-circle"></i>{fieldErrors.classId}</span>}

                        {/* Non-blocking Age vs Grade Mismatch Advisory Banner */}
                        {ageGradeWarning && (
                          <div style={{
                            marginTop: '10px',
                            padding: '10px 14px',
                            borderRadius: '8px',
                            background: '#fffbeb',
                            border: '1px solid #fde68a',
                            color: '#92400e',
                            fontSize: '0.8rem',
                            display: 'flex',
                            alignItems: 'flex-start',
                            gap: '8px'
                          }}>
                            <i className="fas fa-exclamation-triangle" style={{ marginTop: '2px', color: '#d97706' }}></i>
                            <div style={{ flex: 1 }}>
                              <strong>Age &amp; Class Placement Advisory:</strong> {ageGradeWarning}
                              <div style={{ marginTop: '6px' }}>
                                <label style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontWeight: 600, color: '#b45309' }}>
                                  <input
                                    type="checkbox"
                                    checked={ageGradeAcknowledged}
                                    onChange={e => setAgeGradeAcknowledged(e.target.checked)}
                                    style={{ width: '14px', height: '14px' }}
                                  />
                                  <span>Acknowledge age/grade placement variance and proceed</span>
                                </label>
                              </div>
                            </div>
                          </div>
                        )}
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

                      <div className="form-group"><label>Section / Stream</label><input name="section" value={formData.section || ''} onChange={handleInputChange} className="form-control" placeholder="e.g. Blue, Alpha" /></div>

                      <div className="form-group">
                        <label>Dormitory / Room</label>
                        <select 
                          name="dormitory" 
                          value={formData.dormitory || ''} 
                          onChange={(e) => {
                            const val = e.target.value;
                            const selectedHostel = hostels.find(h => h.name === val);
                            setFormData(prev => ({
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
                        <>
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
                        </>
                      )}

                      <div className="form-group">
                        <label>Date Admitted</label>
                        <input
                          type="date"
                          name="dateAdmitted"
                          value={formData.dateAdmitted || ''}
                          onChange={handleInputChange}
                          className={`form-control ${fieldErrors.dateAdmitted ? 'input-error' : ''}`}
                        />
                        {fieldErrors.dateAdmitted ? (
                          <span className="field-error-msg"><i className="fas fa-exclamation-circle"></i>{fieldErrors.dateAdmitted}</span>
                        ) : (
                          <small className="help-text">Must be ≤ today</small>
                        )}
                      </div>
                    </div>

                    {!isK12 && (
                      <>
                        <div className="form-section-header mt-6">Tertiary &amp; Research Details</div>
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
                          <div className="form-group col-span-3" style={{ gridColumn: 'span 3' }}>
                            <label>Research / Thesis Title</label>
                            <input name="researchTitle" value={formData.researchTitle || ''} onChange={handleInputChange} className="form-control" placeholder="For postgraduate research students..." />
                          </div>
                        </div>
                      </>
                    )}

                    <div className="form-section-header mt-6">{isK12 ? 'Emergency & Guardian Contact' : 'Emergency & Next of Kin Contact'}</div>
                    <div className="modal-form-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 20 }}>
                      <div className="form-group">
                        <label>{isK12 ? 'Guardian Name' : 'Next of Kin Name'} <span className="text-red-500">*</span></label>
                        <input
                          name="guardianName"
                          value={formData.guardianName || ''}
                          onChange={handleInputChange}
                          className={`form-control ${fieldErrors.guardianName ? 'input-error' : ''}`}
                          placeholder={isK12 ? 'e.g. Sarah Smith' : 'e.g. Mary Doe'}
                        />
                        {fieldErrors.guardianName && <span className="field-error-msg"><i className="fas fa-exclamation-circle"></i>{fieldErrors.guardianName}</span>}
                      </div>

                      <div className="form-group">
                        <label>{isK12 ? 'Guardian Phone' : 'Next of Kin Phone'} <span className="text-red-500">*</span></label>
                        <input
                          type="tel"
                          name="guardianPhone"
                          value={formData.guardianPhone || ''}
                          onChange={handleInputChange}
                          className={`form-control ${fieldErrors.guardianPhone ? 'input-error' : ''}`}
                          placeholder="+263 77..."
                        />
                        {fieldErrors.guardianPhone ? (
                          <span className="field-error-msg"><i className="fas fa-exclamation-circle"></i>{fieldErrors.guardianPhone}</span>
                        ) : (
                          <small className="help-text">e.g. +263... or 07...</small>
                        )}
                      </div>

                      <div className="form-group">
                        <label>{isK12 ? 'Guardian Email' : 'Next of Kin Email'}</label>
                        <input
                          type="email"
                          name="guardianEmail"
                          value={formData.guardianEmail || ''}
                          onChange={handleInputChange}
                          className={`form-control ${fieldErrors.guardianEmail ? 'input-error' : ''}`}
                          placeholder="guardian@example.com"
                        />
                        {fieldErrors.guardianEmail ? (
                          <span className="field-error-msg"><i className="fas fa-exclamation-circle"></i>{fieldErrors.guardianEmail}</span>
                        ) : (
                          <small className="help-text">Primary recipient for billing and student notices</small>
                        )}
                      </div>

                      <div className="form-group"><label>City / Town</label><input name="city" value={formData.city || ''} onChange={handleInputChange} className="form-control" placeholder="e.g. Harare" /></div>
                      <div className="form-group"><label>State / Province</label><input name="state" value={formData.state || ''} onChange={handleInputChange} className="form-control" placeholder="e.g. Harare Province" /></div>
                      <div className="form-group col-span-3" style={{ gridColumn: 'span 3' }}><label>Physical Address</label><textarea name="address" value={formData.address || ''} onChange={handleInputChange} className="form-control" rows={2} placeholder="Residential address..." /></div>
                    </div>

                    <div className="form-section-header mt-6">Previous Academic History</div>
                    <div className="modal-form-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 20 }}>
                      <div className="form-group"><label>Previous School Name</label><input name="prevSchoolName" value={formData.prevSchoolName || ''} onChange={handleInputChange} className="form-control" placeholder="Former school attended" /></div>
                      <div className="form-group"><label>Previous School Class</label><input name="prevSchoolClass" value={formData.prevSchoolClass || ''} onChange={handleInputChange} className="form-control" placeholder="Last grade completed" /></div>
                      <div className="form-group col-span-3" style={{ gridColumn: 'span 3' }}><label>Previous School Address</label><input name="prevSchoolAddress" value={formData.prevSchoolAddress || ''} onChange={handleInputChange} className="form-control" /></div>
                      <div className="form-group col-span-3" style={{ gridColumn: 'span 3' }}><label>Purpose for Leaving</label><input name="purposeForLeaving" value={formData.purposeForLeaving || ''} onChange={handleInputChange} className="form-control" placeholder="Reason for transfer..." /></div>
                    </div>

                    <div className="form-section-header mt-6">Document Uploads (Max 15MB each, PDF/JPG/PNG)</div>
                    <div className="modal-form-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 20 }}>
                      <div className="form-group">
                        <label>Transfer Certificate?</label>
                        <select name="hasTransferCertificate" value={formData.hasTransferCertificate || 'false'} onChange={handleInputChange} className="form-control">
                          <option value="false">No</option>
                          <option value="true">Yes</option>
                        </select>
                      </div>
                      {formData.hasTransferCertificate === 'true' && (
                        <div className="form-group border p-3 rounded" style={{ borderColor: docFiles.transferCertificate ? '#16a34a' : (fieldErrors.transferCertificate ? '#ef4444' : '#e2e8f0') }}>
                           <label className="text-xs font-bold block mb-1">{docFiles.transferCertificate ? '✅ TC Uploaded' : 'Upload Transfer Certificate'}</label>
                           <input type="file" onChange={(e) => handleDocFileChange(e, 'transferCertificate')} accept=".pdf,image/jpeg,image/png" style={{ fontSize: '0.7rem' }} />
                           {fieldErrors.transferCertificate && <span className="field-error-msg"><i className="fas fa-exclamation-circle"></i>{fieldErrors.transferCertificate}</span>}
                        </div>
                      )}
                      <div className="form-group border p-3 rounded" style={{ borderColor: docFiles.birthCertificate ? '#16a34a' : (fieldErrors.birthCertificate ? '#ef4444' : '#e2e8f0') }}>
                         <label className="text-xs font-bold block mb-1">{docFiles.birthCertificate ? '✅ BC Uploaded' : 'Upload Birth Certificate'}</label>
                         <input type="file" onChange={(e) => handleDocFileChange(e, 'birthCertificate')} accept=".pdf,image/jpeg,image/png" style={{ fontSize: '0.7rem' }} />
                         {fieldErrors.birthCertificate && <span className="field-error-msg"><i className="fas fa-exclamation-circle"></i>{fieldErrors.birthCertificate}</span>}
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
                        <label>Sports Honors &amp; Other Achievements</label>
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
                          <option value="Uniforms & Apparel">Uniforms & Apparel</option>
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
                        <label>Items Supplied &amp; Product Catalog</label>
                        <textarea
                          name="itemsSupplied"
                          value={formData.itemsSupplied || ''}
                          onChange={handleInputChange}
                          className="form-control"
                          rows={2}
                          placeholder="e.g. School blazers, ties, white shirts, tracksuits, sports kits..."
                        />
                      </div>
                      <div className="form-group" style={{ gridColumn: 'span 3' }}>
                        <label>Business Address *</label>
                        <textarea name="address" value={formData.address || ''} onChange={handleInputChange} className="form-control" rows={2} required placeholder="Physical business address..." />
                      </div>
                    </div>

                    <div className="form-section-header mt-6">Banking &amp; Settlement Profile</div>
                    <div className="modal-form-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 20 }}>
                      <div className="form-group">
                        <label>Bank Name</label>
                        <input name="bankName" value={formData.bankName || ''} onChange={handleInputChange} className="form-control" placeholder="e.g. Stanbic / CBZ" />
                      </div>
                      <div className="form-group">
                        <label>Branch &amp; Code</label>
                        <input name="branchCode" value={formData.branchCode || ''} onChange={handleInputChange} className="form-control" placeholder="e.g. Harare Centre" />
                      </div>
                      <div className="form-group">
                        <label>Account Number</label>
                        <input name="accountNumber" value={formData.accountNumber || ''} onChange={handleInputChange} className="form-control" placeholder="Account No." />
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
                      <div className="form-group border p-3 rounded" style={{ borderColor: docs.taxClearance ? '#16a34a' : '#e2e8f0' }}>
                         <label className="text-sm font-semibold block mb-2">{docs.taxClearance ? '✅ Tax Clearance Uploaded' : 'Upload Tax Clearance *'}</label>
                         <input type="file" onChange={(e) => handleDocumentUpload(e, 'taxClearance')} style={{ width: '100%' }} />
                      </div>
                      <div className="form-group border p-3 rounded" style={{ borderColor: docs.prazCert ? '#16a34a' : '#e2e8f0' }}>
                         <label className="text-sm font-semibold block mb-2">{docs.prazCert ? '✅ PRAZ Certificate Uploaded' : 'Upload PRAZ Cert *'}</label>
                         <input type="file" onChange={(e) => handleDocumentUpload(e, 'prazCert')} style={{ width: '100%' }} />
                      </div>
                      <div className="form-group border p-3 rounded" style={{ borderColor: docs.certIncorp ? '#16a34a' : '#e2e8f0' }}>
                         <label className="text-sm font-semibold block mb-2">{docs.certIncorp ? '✅ Cert of Incorp Uploaded' : 'Upload Cert of Incorp *'}</label>
                         <input type="file" onChange={(e) => handleDocumentUpload(e, 'certIncorp')} style={{ width: '100%' }} />
                      </div>
                      <div className="form-group border p-3 rounded" style={{ borderColor: docs.nssaClearance ? '#16a34a' : '#e2e8f0' }}>
                         <label className="text-sm font-semibold block mb-2">{docs.nssaClearance ? '✅ NSSA Uploaded' : 'Upload NSSA Clearance'}</label>
                         <input type="file" onChange={(e) => handleDocumentUpload(e, 'nssaClearance')} style={{ width: '100%' }} />
                      </div>
                      <div className="form-group border p-3 rounded" style={{ borderColor: docs.vendorRegFile ? '#16a34a' : '#e2e8f0' }}>
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
          <div className="text-xs text-gray-500 flex items-center gap-2">
            <i className="fas fa-lock text-gray-400"></i>
            <span>Default password: <strong>Password</strong> (must change on first sign-in)</span>
            {isCheckingDuplicate && <span className="text-xs text-blue-600 ml-2"><i className="fas fa-spinner fa-spin"></i> Checking availability...</span>}
          </div>
          <div className="flex gap-2" style={{ display: 'flex', gap: 8 }}>
            {isStaff ? (
              <>
                <button key="btn-staff-cancel" type="button" className="btn btn-secondary py-2 px-4 rounded border font-medium" onClick={onClose} style={{ background: 'white' }}>Cancel</button>
                {staffStep > 1 && (
                  <button key="btn-staff-back" type="button" className="btn btn-secondary py-2 px-4 rounded border font-medium" onClick={() => setStaffStep(s => s - 1)} style={{ background: 'white' }}>Back</button>
                )}
                {staffStep < 4 ? (
                  <button key="btn-staff-next" type="button" className="btn btn-primary py-2 px-4 rounded text-white font-medium shadow-sm" onClick={() => validateStaffStep(staffStep) && setStaffStep(s => s + 1)} style={{ background: '#2563eb' }}>Next Step →</button>
                ) : (
                  <>
                    <button
                      key="btn-staff-add-another"
                      type="button"
                      className="btn btn-secondary py-2 px-3 rounded border font-medium text-slate-700"
                      onClick={() => handleSubmit(undefined, true)}
                      disabled={loading}
                      style={{ background: '#ffffff', borderColor: '#cbd5e1' }}
                    >
                      <i className="fas fa-plus mr-1"></i> Save &amp; Add Another
                    </button>
                    <button
                      key="btn-staff-submit"
                      type="submit"
                      form="createUserForm"
                      className="btn btn-primary py-2 px-4 rounded text-white font-medium shadow-sm transition-transform active:scale-95"
                      disabled={loading}
                      style={{ background: '#16a34a' }}
                    >
                      {loading ? <i className="fas fa-spinner fa-spin"></i> : `Create ${role.charAt(0) + role.slice(1).toLowerCase()} Profile`}
                    </button>
                  </>
                )}
              </>
            ) : (
              <>
                <button key="btn-cancel" type="button" className="btn btn-secondary py-2 px-4 rounded border font-medium" onClick={onClose} style={{ background: 'white' }}>Cancel</button>
                <button
                  key="btn-add-another"
                  type="button"
                  className="btn btn-secondary py-2 px-3 rounded border font-medium text-slate-700"
                  onClick={() => handleSubmit(undefined, true)}
                  disabled={loading}
                  style={{ background: '#ffffff', borderColor: '#cbd5e1' }}
                >
                  <i className="fas fa-plus mr-1"></i> Save &amp; Add Another
                </button>
                <button
                  key="btn-submit"
                  type="submit"
                  form="createUserForm"
                  className="btn btn-primary py-2 px-4 rounded text-white font-medium shadow-sm transition-transform active:scale-95"
                  disabled={loading}
                  style={{ background: '#2563eb' }}
                >
                  {loading ? <i className="fas fa-spinner fa-spin"></i> : `Create ${role.charAt(0) + role.slice(1).toLowerCase()} Profile`}
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      <datalist id="zim-banks-list">
        <option value="CBZ Bank" />
        <option value="CABS" />
        <option value="Stanbic Bank" />
        <option value="Standard Chartered Bank" />
        <option value="Nedbank Zimbabwe" />
        <option value="FBC Bank" />
        <option value="BancABC" />
        <option value="Ecobank Zimbabwe" />
        <option value="First Capital Bank" />
        <option value="ZB Bank" />
        <option value="Steward Bank" />
        <option value="NMB Bank" />
        <option value="POSB (People's Own Savings Bank)" />
        <option value="AFC Commercial Bank" />
        <option value="EmpowerBank" />
      </datalist>

      <datalist id="staff-designations-list">
        <option value="Senior Teacher" />
        <option value="Lead Teacher" />
        <option value="Head of Department (HOD)" />
        <option value="Class Teacher" />
        <option value="Assistant Teacher" />
        <option value="Sports Director / Coach" />
        <option value="Deputy Head / Vice Principal" />
        <option value="Principal / Headmaster" />
        <option value="Bursar" />
        <option value="Chief Accountant" />
        <option value="Assistant Bursar" />
        <option value="Accounts Clerk" />
        <option value="Finance Officer" />
        <option value="Head Librarian" />
        <option value="Assistant Librarian" />
        <option value="Library Assistant" />
        <option value="Estate Manager" />
        <option value="Caretaker / Facility Officer" />
        <option value="Maintenance Technician" />
        <option value="Security Officer" />
        <option value="Dining Hall Supervisor" />
        <option value="Driver" />
        <option value="Administrative Assistant" />
        <option value="Academic Registrar" />
      </datalist>
    </div>
  );
}
