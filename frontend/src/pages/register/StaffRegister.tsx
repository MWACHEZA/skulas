import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../../lib/api';
import { useToast } from '../../context/ToastContext';
import '../../styles/registration.css';


const DESIGNATIONS: any = {
    'Facilities & Maintenance': ['Maintenance Supervisor', 'Plumber', 'Electrician', 'General Maintenance Worker', 'Carpenter'],
    'Hostels & Catering': ['Hostel Matron', 'Cook', 'Kitchen Assistant', 'Catering Supervisor', 'Housekeeper'],
    'ICT Department': ['ICT Technician', 'Network Administrator', 'Systems Support', 'Computer Lab Attendant'],
    'Security': ['Security Guard', 'Security Supervisor', 'Night Watchman', 'Gate Officer'],
    'Sports & Grounds': ['Groundskeeper', 'Sports Coordinator', 'Gardener', 'Pool Attendant'],
    'Tuckshop Management': ['Tuckshop Manager', 'Cashier', 'Stock Controller', 'Tuckshop Assistant'],
    'Finance': ['Chief Bursar', 'Assistant Bursar', 'Senior Accountant', 'Accounts Clerk', 'Cashier'],
    'Library Affairs': ['Lead Librarian', 'Assistant Librarian', 'Library Researcher', 'Resource Specialist'],
    'Health & Medical Services': ['School Doctor', 'School Nurse', 'Clinic Assistant', 'Paramedic', 'Counselor']
};

const STRONG_PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20MB

const cardStyle: React.CSSProperties = {
  background: 'var(--bg-secondary, #f8fafc)',
  border: '1px solid var(--border-color, #e2e8f0)',
  borderRadius: '12px', padding: '20px', marginBottom: '16px',
};
const sectionHeaderStyle: React.CSSProperties = {
  display: 'flex', alignItems: 'center', gap: '8px',
  fontSize: '14px', fontWeight: 700, color: 'var(--primary-color, #2563eb)',
  marginBottom: '16px', paddingBottom: '10px',
  borderBottom: '1px solid var(--border-color, #e2e8f0)',
};
const uploadBoxStyle: React.CSSProperties = {
  border: '2px dashed var(--border-color, #cbd5e1)',
  borderRadius: '10px', padding: '20px', textAlign: 'center', cursor: 'pointer',
};

const DEFAULT_CATEGORIES = [
  'ICT / Software',
  'Transport & Logistics',
  'Stationery & Printing',
  'Building & Construction',
  'Food & Catering',
  'General Services'
];

/**
 * Supplier Registration Component
 */
const getCategorySection = (catName: string): 'GOODS' | 'SERVICES' | 'CONSULTANCY' => {
  const lower = catName.toLowerCase();
  if (lower.includes('consult') || lower.includes('advice') || lower.includes('legal') || lower.includes('audit')) {
    return 'CONSULTANCY';
  }
  if (lower.includes('service') || lower.includes('transport') || lower.includes('logistic') || lower.includes('maintenance') || lower.includes('catering') || lower.includes('cleaning') || lower.includes('security')) {
    return 'SERVICES';
  }
  return 'GOODS';
};

const getCategoryCode = (index: number): string => {
  return `SC00${index + 1}`;
};

export function SupplierRegister() {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [categories, setCategories] = useState<string[]>([]);
  const [selectedCategories, setSelectedCategories] = useState<any[]>([]);
  const [paymentCurrency, setPaymentCurrency] = useState<'USD' | 'ZiG'>('USD');
  const [categoryDisclaimer, setCategoryDisclaimer] = useState(false);
  const [declarationChecked, setDeclarationChecked] = useState(false);

  const [docs, setDocs] = useState<any>({
    taxClearance: null,
    prazCert: null,
    certIncorp: null,
    nssaClearance: null,
    vendorRegFile: null,
    supportingDoc: null,
    membershipDocs: null,
    profile: null,
    cv: null
  });

  const [formData, setFormData] = useState({
    companyName: '',
    regNo: '',
    incorpYear: '',
    specialization: '',
    address: '',
    category: '',
    location: 'Local',
    orgType: '',
    prazRegistered: 'No',
    prazNo: '',
    businessOwnedBy: '',
    country: 'Zimbabwe',
    province: '',
    city: '',
    landlineAreaCode: '',
    landlineNumber: '',
    landlineExtension: '',
    faxAreaCode: '',
    faxNumber: '',
    faxExtension: '',
    mobileNumber: '',
    contactTitle: 'Mr',
    contactFirstName: '',
    contactMiddleName: '',
    contactLastName: '',
    contactGender: '',
    contactPosition: '',
    contactEmail: '',
    password: '',
    confirmPassword: '',
    schoolCode: '',
    // Compliance dates/nos
    taxNumber: '',
    taxExpiry: '',
    prazExpiry: '',
    nssaExpiry: '',
    vendorNo: ''
  });

  const [bankAccounts, setBankAccounts] = useState<any[]>([]);
  const [showBankModal, setShowBankModal] = useState(false);
  const [bankModalType, setBankModalType] = useState<'USD' | 'ZiG'>('USD');
  const [bankFormData, setBankFormData] = useState({
    bankName: '',
    branchCode: '',
    bankBranch: '',
    accountName: '',
    accountNumber: ''
  });

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const urlSchoolCode = params.get('school') || params.get('code') || localStorage.getItem('last_school_code');
    if (urlSchoolCode) {
      const codeUpper = urlSchoolCode.trim().toUpperCase();
      setFormData(prev => ({ ...prev, schoolCode: codeUpper }));
      localStorage.setItem('last_school_code', codeUpper);
    }
  }, []);

  useEffect(() => {
    const fetchSchoolCategories = async () => {
      const code = formData.schoolCode?.trim();
      if (!code || code.length < 5) {
        setCategories([]);
        return;
      }
      try {
        const { data } = await api.get(`/api/public/schools/${code.toUpperCase()}/data`);
        const cats = data.supplierCategories || [];
        setCategories(cats);
      } catch (err) {
        console.error('Failed to fetch school categories:', err);
        setCategories([]);
      }
    };
    fetchSchoolCategories();
  }, [formData.schoolCode]);

  const handleInputChange = (e: any) => {
    const { name, value } = e.target;
    if (name === 'schoolCode') {
      localStorage.setItem('last_school_code', value.toUpperCase());
    }
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleFileChange = (e: any, docName: string) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > MAX_FILE_SIZE) {
        showToast('File size exceeds 20MB limit.', 'error');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => setDocs((prev: any) => ({ ...prev, [docName]: reader.result }));
      reader.readAsDataURL(file);
    }
  };

  // Bank accounts helper functions
  const openBankModal = (type: 'USD' | 'ZiG') => {
    setBankModalType(type);
    setBankFormData({
      bankName: '',
      branchCode: '',
      bankBranch: '',
      accountName: '',
      accountNumber: ''
    });
    setShowBankModal(true);
  };

  const handleSaveBankAccount = () => {
    if (!bankFormData.bankName || !bankFormData.branchCode || !bankFormData.bankBranch || !bankFormData.accountName || !bankFormData.accountNumber) {
      showToast('Please fill in all bank details.', 'warning');
      return;
    }
    setBankAccounts([...bankAccounts, {
      ...bankFormData,
      accountType: bankModalType,
      status: 'Active'
    }]);
    setShowBankModal(false);
    showToast(`${bankModalType} bank account added.`, 'success');
  };

  const removeBankAccount = (index: number) => {
    setBankAccounts(bankAccounts.filter((_, idx) => idx !== index));
    showToast('Bank account removed.', 'info');
  };

  const validateStep = () => {
    if (step === 1) {
      if (formData.orgType === 'Individual Consultant') {
        if (!formData.companyName || !formData.location || !formData.orgType || !formData.province || !formData.city || !formData.address || !formData.mobileNumber) {
          showToast('Please fill in all required consultant name, address and phone details.', 'warning');
          return false;
        }
      } else {
        if (!formData.companyName || !formData.regNo || !formData.incorpYear || !formData.location || !formData.orgType || !formData.businessOwnedBy || !formData.province || !formData.city || !formData.address || !formData.mobileNumber) {
          showToast('Please fill in all required organization and address details.', 'warning');
          return false;
        }
      }
      if (formData.prazRegistered === 'Yes' && !formData.prazNo) {
        showToast('Please enter your PRAZ Registration Number.', 'warning');
        return false;
      }
      if (selectedCategories.length === 0) {
        showToast('Please register for at least one category.', 'warning');
        return false;
      }
      if (!categoryDisclaimer) {
        showToast('Please confirm the selected categories disclaimer.', 'warning');
        return false;
      }
      if (formData.orgType !== 'Individual Consultant' && !docs.supportingDoc) {
        showToast('Please upload a supporting document.', 'warning');
        return false;
      }
    } else if (step === 2) {
      if (!formData.contactFirstName || !formData.contactLastName || !formData.contactGender || !formData.contactPosition || !formData.contactEmail || !formData.password || !formData.confirmPassword || !formData.schoolCode) {
        showToast('Please fill in all required contact and account details.', 'warning');
        return false;
      }
      if (formData.password !== formData.confirmPassword) {
        showToast('Passwords do not match.', 'error');
        return false;
      }
      if (!STRONG_PASSWORD_REGEX.test(formData.password)) {
        showToast('Password is too weak.', 'error');
        return false;
      }
      if (bankAccounts.length === 0) {
        showToast('Please add at least one bank account details.', 'warning');
        return false;
      }
    }
    return true;
  };

  const nextStep = () => {
    if (validateStep()) setStep(s => s + 1);
  };

  const prevStep = () => setStep(s => s - 1);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.orgType === 'Individual Consultant') {
      if (!docs.membershipDocs || !docs.profile || !docs.cv) {
        showToast('Please upload required membership documents, profile, and CV.', 'warning');
        return;
      }
    } else {
      if (!formData.taxExpiry || !formData.taxNumber || !docs.taxClearance || !docs.certIncorp) {
          showToast('Please provide all compliance details and documents.', 'warning');
          return;
      }
    }
    if (formData.prazRegistered === 'Yes') {
      if (!formData.prazExpiry || !docs.prazCert) {
        showToast('Please provide PRAZ Expiry and Certificate.', 'warning');
        return;
      }
    }
    if (!declarationChecked) {
      showToast('Please check the declaration box before completing registration.', 'warning');
      return;
    }

    setLoading(true);
    try {
      const payload = {
        name: `${formData.contactTitle} ${formData.contactFirstName} ${formData.contactLastName}`, 
        email: formData.contactEmail,
        password: formData.password,
        phone: formData.mobileNumber,
        role: 'SUPPLIER',
        schoolCode: formData.schoolCode,
        metadata: {
            ...formData,
            category: selectedCategories[0]?.name || '', // primary category for compatibility
            selectedCategories,
            categoryPayment: {
              currency: paymentCurrency,
              amount: selectedCategories.length * (paymentCurrency === 'USD' ? 60.00 : 1500.00),
              disclaimerAccepted: true
            },
            prazReg: formData.prazNo || '', // compatibility field
            taxClearance: formData.taxNumber, // compatibility field
            docs, // Base64 docs including consultant files
            bankAccounts // list of USD and ZiG accounts
        }
      };
      await api.post('/api/auth/register-user', payload);
      showToast('Supplier registration submitted successfully! Pending verification.', 'success');
      navigate('/supplier/login');
    } catch (err: any) {
      showToast(err.response?.data?.error || 'Registration failed', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="register-page-wrapper">
      <div className="register-container" style={{ maxWidth: step === 3 ? 700 : 850 }}>
        <div className="register-header" style={{ background: '#334155' }}>
          <i className="fas fa-truck-loading" style={{ fontSize: '2.5rem', marginBottom: 15 }}></i>
          <h2>Supplier Registration</h2>
          <p>Official School Vendor Enrollment</p>
        </div>

        <div className="steps-bar">
          <div className={`step-item ${step === 1 ? 'active' : ''} ${step > 1 ? 'done' : ''}`} onClick={() => setStep(1)}><div className="step-num">1</div><span>Company & Address</span></div>
          <div className={`step-item ${step === 2 ? 'active' : ''} ${step > 2 ? 'done' : ''}`} onClick={() => step > 1 && setStep(2)}><div className="step-num">2</div><span>Contact & Banking</span></div>
          <div className={`step-item ${step === 3 ? 'active' : ''}`} onClick={() => step > 2 && setStep(3)}><div className="step-num">3</div><span>Compliance Docs</span></div>
        </div>

        <div className="form-body">
          <form onSubmit={handleSubmit}>
            {step === 1 && (
              <div className="step-panel active">
                <div className="step-title"><i className="fas fa-building"></i> Organization Basic Details</div>
                
                {/* Notes box */}
                <div style={{ background: '#fff1f2', border: '1px solid #fecdd3', color: '#9f1239', padding: '15px', borderRadius: '8px', fontSize: '0.85rem', marginBottom: '20px' }}>
                  <strong style={{ display: 'block', marginBottom: '5px' }}>Notes:</strong>
                  <ol style={{ margin: 0, paddingLeft: '15px' }}>
                    <li>Micro Enterprise (ME) can participate in tenders with a maximum value of up to USD 100,000.00 and the annual registration fee is USD 50.00 per category.</li>
                    <li>Small/Medium Enterprise (SME) can participate in tenders with a maximum value of up to USD 200,000.00 and the annual registration fee is USD 60.00 per category.</li>
                    <li>Non Micro Small/Medium Enterprise (Other Entity) No limit for tender value and the annual registration fee is USD 75.00 per category.</li>
                    <li>Foreign Organization - No limit for tender value and the annual registration fee is USD 850.00 per category.</li>
                  </ol>
                </div>

                <div className="form-group">
                  <label>{formData.orgType === 'Individual Consultant' ? 'Legal Consultant Name *' : 'Legal Company Name *'}</label>
                  <input type="text" name="companyName" value={formData.companyName} onChange={handleInputChange} required />
                </div>
                
                <div className="form-row">
                  <div className="form-group">
                    <label>BP / Registration No {formData.orgType !== 'Individual Consultant' && '*'}</label>
                    <input type="text" name="regNo" value={formData.regNo} onChange={handleInputChange} required={formData.orgType !== 'Individual Consultant'} />
                  </div>
                  <div className="form-group">
                    <label>{formData.orgType === 'Individual Consultant' ? 'Practice Start Year' : 'Year of Incorporation *'}</label>
                    <input type="number" name="incorpYear" value={formData.incorpYear} onChange={handleInputChange} required={formData.orgType !== 'Individual Consultant'} />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 15, marginBottom: 15 }}>
                  <div className="form-group">
                    <label>Location *</label>
                    <select name="location" value={formData.location} onChange={handleInputChange} required>
                      <option value="Local">Local</option>
                      <option value="International">International</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Organization Type *</label>
                    <select name="orgType" value={formData.orgType} onChange={handleInputChange} required>
                      <option value="">Select Type...</option>
                      <option value="Private Limited Company">Private Limited Company</option>
                      <option value="Public Limited Company">Public Limited Company</option>
                      <option value="Sole Proprietorship">Sole Proprietorship</option>
                      <option value="Partnership">Partnership</option>
                      <option value="Cooperative">Cooperative</option>
                      <option value="NGO">NGO</option>
                      <option value="Trust">Trust</option>
                      <option value="Individual Consultant">Individual Consultant</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 15, marginBottom: 15 }}>
                  <div className="form-group">
                    <label>Already Registered with PRAZ? *</label>
                    <div style={{ display: 'flex', gap: 20, marginTop: 10 }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: 5, fontWeight: 'normal', cursor: 'pointer' }}>
                        <input type="radio" name="prazRegistered" value="Yes" checked={formData.prazRegistered === 'Yes'} onChange={handleInputChange} /> Yes
                      </label>
                      <label style={{ display: 'flex', alignItems: 'center', gap: 5, fontWeight: 'normal', cursor: 'pointer' }}>
                        <input type="radio" name="prazRegistered" value="No" checked={formData.prazRegistered === 'No'} onChange={handleInputChange} /> No
                      </label>
                    </div>
                  </div>
                  <div className="form-group">
                    <label>Company/Business Owned By *</label>
                    <select name="businessOwnedBy" value={formData.businessOwnedBy} onChange={handleInputChange} required>
                      <option value="">Select Owned By...</option>
                      <option value="Youth">Youth</option>
                      <option value="Women">Women</option>
                      <option value="People with Disabilities (PWD)">People with Disabilities (PWD)</option>
                      <option value="General / Other">General / Other</option>
                    </select>
                  </div>
                  {formData.orgType !== 'Individual Consultant' ? (
                    <div className="form-group">
                      <label>Upload Supporting Document *</label>
                      <input type="file" onChange={(e) => handleFileChange(e, 'supportingDoc')} accept=".pdf,image/*" required={formData.orgType !== 'Individual Consultant'} />
                      {docs.supportingDoc && <small style={{ color: '#10b981' }}>File uploaded <i className="fas fa-check"></i></small>}
                    </div>
                  ) : (
                    <div className="form-group">
                      <label>Practice / Consultancy Sector *</label>
                      <input type="text" name="specialization" value={formData.specialization} onChange={handleInputChange} required placeholder="e.g. Legal Advisory, Financial Audits" />
                    </div>
                  )}
                </div>

                {formData.prazRegistered === 'Yes' && (
                  <div className="form-group animate-in slide-in-from-top-2 duration-200" style={{ background: '#eff6ff', padding: '15px', borderRadius: '8px', border: '1px solid #bfdbfe', marginBottom: 20 }}>
                    <label style={{ color: '#1e3a8a', fontWeight: 'bold' }}>PRAZ Registration Number *</label>
                    <input type="text" name="prazNo" value={formData.prazNo} onChange={handleInputChange} required placeholder="e.g. PR0000000" style={{ borderColor: '#3b82f6' }} />
                  </div>
                )}

                <div style={{ color: '#047857', fontWeight: 600, fontSize: '0.85rem', background: '#ecfdf5', padding: '10px 15px', borderRadius: '8px', border: '1px solid #a7f3d0', marginBottom: '25px' }}>
                  <i className="fas fa-info-circle mr-1"></i> Please note if your organization is already registered with previous PRAZ portal, you are required to input exact Organization Name and Registration Number (e.g. PR0000000).
                </div>

                {/* Categories Table UI Section */}
                <div className="step-title" style={{ marginTop: 30 }}><i className="fas fa-tags"></i> Registered Categories & Payments</div>
                
                <div style={{ display: 'flex', gap: '15px', marginBottom: '20px', alignItems: 'end' }}>
                  <div className="form-group" style={{ flex: 1, marginBottom: 0 }}>
                    <label>Select Category to Register</label>
                    <select id="categorySelect" className="portal-input" style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1' }}>
                      <option value="">Choose category...</option>
                      {(categories.length > 0 ? categories : DEFAULT_CATEGORIES)
                        .filter(cat => !selectedCategories.some(sc => sc.name === cat))
                        .map((cat, idx) => (
                          <option key={idx} value={cat}>{cat}</option>
                        ))
                      }
                    </select>
                  </div>
                  <button type="button" className="portal-btn-primary" style={{ height: '42px', padding: '0 20px', background: '#1e3a8a', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }} onClick={() => {
                    const select = document.getElementById('categorySelect') as HTMLSelectElement;
                    const val = select?.value;
                    if (val) {
                      const section = getCategorySection(val);
                      const code = getCategoryCode(selectedCategories.length);
                      setSelectedCategories([...selectedCategories, {
                        name: val,
                        code,
                        section,
                        fee: 60.00
                      }]);
                      select.value = '';
                    } else {
                      showToast('Please select a category first.', 'warning');
                    }
                  }}>
                    Add Category
                  </button>
                </div>

                <div style={{ overflowX: 'auto', marginBottom: '20px', border: '1px solid #cbd5e1', borderRadius: '8px' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', background: '#fff' }}>
                    <thead>
                      <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0', color: '#334155', fontWeight: 'bold' }}>
                        <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '0.85rem', borderBottom: '1px solid #cbd5e1' }}>Sr. No.</th>
                        <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '0.85rem', borderBottom: '1px solid #cbd5e1' }}>Registration Year</th>
                        <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '0.85rem', borderBottom: '1px solid #cbd5e1' }}>Section Name</th>
                        <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '0.85rem', borderBottom: '1px solid #cbd5e1' }}>Category Code</th>
                        <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '0.85rem', borderBottom: '1px solid #cbd5e1' }}>Section</th>
                        <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '0.85rem', borderBottom: '1px solid #cbd5e1' }}>Payment Amount</th>
                        <th style={{ padding: '12px 16px', textAlign: 'center', fontSize: '0.85rem', borderBottom: '1px solid #cbd5e1' }}>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedCategories.length === 0 ? (
                        <tr>
                          <td colSpan={7} style={{ padding: '24px', textAlign: 'center', color: '#64748b' }}>No categories selected. Please add at least one category.</td>
                        </tr>
                      ) : (
                        selectedCategories.map((sc, index) => (
                          <tr key={index} style={{ borderBottom: '1px solid #e2e8f0', color: '#334155' }}>
                            <td style={{ padding: '12px 16px' }}>{index + 1}</td>
                            <td style={{ padding: '12px 16px' }}>{new Date().getFullYear()}</td>
                            <td style={{ padding: '12px 16px' }}>{sc.name}</td>
                            <td style={{ padding: '12px 16px' }}>{sc.code}</td>
                            <td style={{ padding: '12px 16px' }}>
                              <span style={{ background: sc.section === 'GOODS' ? '#dbeafe' : sc.section === 'SERVICES' ? '#d1fae5' : '#fef3c7', color: sc.section === 'GOODS' ? '#1e40af' : sc.section === 'SERVICES' ? '#065f46' : '#92400e', padding: '4px 8px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 'bold' }}>
                                {sc.section}
                              </span>
                            </td>
                            <td style={{ padding: '12px 16px' }}>
                              {paymentCurrency} {(paymentCurrency === 'USD' ? sc.fee : sc.fee * 25).toFixed(2)}
                            </td>
                            <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                              <button type="button" style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: 5 }} onClick={() => {
                                setSelectedCategories(selectedCategories.filter((_, idx) => idx !== index));
                              }}>
                                <i className="fas fa-trash"></i>
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '20px', flexWrap: 'wrap', background: '#f8fafc', padding: '15px 20px', borderRadius: '8px', border: '1px solid #e2e8f0', marginBottom: '20px' }}>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Currency Type *</label>
                    <select value={paymentCurrency} onChange={(e) => setPaymentCurrency(e.target.value as any)} style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1' }}>
                      <option value="USD">USD</option>
                      <option value="ZiG">ZiG</option>
                    </select>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <span style={{ fontSize: '0.9rem', color: '#64748b', fontWeight: 'bold' }}>Net Amount To Be Paid :</span>
                    <span style={{ fontSize: '1.25rem', color: '#1e3a8a', fontWeight: 'bold', marginLeft: '10px' }}>
                      {paymentCurrency} {(selectedCategories.length * (paymentCurrency === 'USD' ? 60.00 : 1500.00)).toFixed(2)}
                    </span>
                  </div>
                </div>

                <div className="form-group" style={{ marginBottom: '25px' }}>
                  <label style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', cursor: 'pointer', fontWeight: 'normal' }}>
                    <input type="checkbox" checked={categoryDisclaimer} onChange={(e) => setCategoryDisclaimer(e.target.checked)} style={{ marginTop: '4px' }} />
                    <span style={{ fontSize: '0.85rem', color: '#475569' }}>
                      <strong>Disclaimer: *</strong> I am confirming the selected categories are in line with my business requirement. I also accept that categories will not allow to change after the payment.
                    </span>
                  </label>
                </div>

                <div className="step-title" style={{ marginTop: 30 }}><i className="fas fa-map-marker-alt"></i> Organization Address</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 15, marginBottom: 15 }}>
                  <div className="form-group">
                    <label>Country *</label>
                    <input type="text" name="country" value={formData.country} onChange={handleInputChange} required />
                  </div>
                  <div className="form-group">
                    <label>Province *</label>
                    <select name="province" value={formData.province} onChange={handleInputChange} required>
                      <option value="">Select Province...</option>
                      <option value="Bulawayo">Bulawayo</option>
                      <option value="Harare">Harare</option>
                      <option value="Manicaland">Manicaland</option>
                      <option value="Mashonaland Central">Mashonaland Central</option>
                      <option value="Mashonaland East">Mashonaland East</option>
                      <option value="Mashonaland West">Mashonaland West</option>
                      <option value="Masvingo">Masvingo</option>
                      <option value="Matabeleland North">Matabeleland North</option>
                      <option value="Matabeleland South">Matabeleland South</option>
                      <option value="Midlands">Midlands</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label>City/Town/Village *</label>
                    <select name="city" value={formData.city} onChange={handleInputChange} required>
                      <option value="">Select City/Town...</option>
                      <option value="Harare">Harare</option>
                      <option value="Bulawayo">Bulawayo</option>
                      <option value="Chitungwiza">Chitungwiza</option>
                      <option value="Mutare">Mutare</option>
                      <option value="Epworth">Epworth</option>
                      <option value="Gweru">Gweru</option>
                      <option value="Kwekwe">Kwekwe</option>
                      <option value="Kadoma">Kadoma</option>
                      <option value="Masvingo">Masvingo</option>
                      <option value="Chinhoyi">Chinhoyi</option>
                      <option value="Marondera">Marondera</option>
                      <option value="Norton">Norton</option>
                      <option value="Hwange">Hwange</option>
                      <option value="Zvishavane">Zvishavane</option>
                      <option value="Beitbridge">Beitbridge</option>
                      <option value="Victoria Falls">Victoria Falls</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                </div>

                <div className="form-group"><label>Street Address *</label><textarea name="address" value={formData.address} onChange={handleInputChange} required rows={2} placeholder="Physical street details..."></textarea></div>

                <div className="form-group"><label>Primary Specialization</label><input type="text" name="specialization" value={formData.specialization} onChange={handleInputChange} placeholder="e.g. Stationery, IT Maintenance" /></div>

                {/* Landline Details */}
                <div style={{ display: 'grid', gridTemplateColumns: '120px 1.5fr 1fr 1fr', gap: 15, marginBottom: 15, alignItems: 'end' }}>
                  <div className="form-group">
                    <label>Landline CC</label>
                    <input type="text" value="+263" disabled style={{ background: '#f1f5f9' }} />
                  </div>
                  <div className="form-group">
                    <label>Area Code</label>
                    <input type="text" name="landlineAreaCode" value={formData.landlineAreaCode} onChange={handleInputChange} placeholder="e.g. 24" />
                  </div>
                  <div className="form-group">
                    <label>Landline Number</label>
                    <input type="text" name="landlineNumber" value={formData.landlineNumber} onChange={handleInputChange} placeholder="e.g. 700000" />
                  </div>
                  <div className="form-group">
                    <label>Extension</label>
                    <input type="text" name="landlineExtension" value={formData.landlineExtension} onChange={handleInputChange} placeholder="e.g. 101" />
                  </div>
                </div>

                {/* Fax Details */}
                <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr 1fr', gap: 15, marginBottom: 15 }}>
                  <div className="form-group">
                    <label>Fax Area Code</label>
                    <input type="text" name="faxAreaCode" value={formData.faxAreaCode} onChange={handleInputChange} placeholder="e.g. 24" />
                  </div>
                  <div className="form-group">
                    <label>Fax Number</label>
                    <input type="text" name="faxNumber" value={formData.faxNumber} onChange={handleInputChange} placeholder="e.g. 700001" />
                  </div>
                  <div className="form-group">
                    <label>Fax Extension</label>
                    <input type="text" name="faxExtension" value={formData.faxExtension} onChange={handleInputChange} placeholder="e.g. 102" />
                  </div>
                </div>

                {/* Mobile Details */}
                <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: 15, marginBottom: 25, alignItems: 'end' }}>
                  <div className="form-group">
                    <label>Country Code *</label>
                    <input type="text" value="+263" disabled style={{ background: '#f1f5f9' }} />
                  </div>
                  <div className="form-group">
                    <label>Mobile Number *</label>
                    <input type="tel" name="mobileNumber" value={formData.mobileNumber} onChange={handleInputChange} required placeholder="772123456" />
                  </div>
                </div>

                <div className="btn-row"><button type="button" className="btn-next" onClick={nextStep}>Continue <i className="fas fa-arrow-right"></i></button></div>
              </div>
            )}

            {step === 2 && (
              <div className="step-panel active">
                <div className="step-title"><i className="fas fa-user-tie"></i> Primary Contact</div>
                
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 15, marginBottom: 15 }}>
                  <div className="form-group">
                    <label>Title *</label>
                    <select name="contactTitle" value={formData.contactTitle} onChange={handleInputChange} required>
                      <option value="Mr">Mr</option>
                      <option value="Mrs">Mrs</option>
                      <option value="Ms">Ms</option>
                      <option value="Dr">Dr</option>
                      <option value="Prof">Prof</option>
                      <option value="Rev">Rev</option>
                    </select>
                  </div>
                  <div className="form-group"><label>First Name *</label><input type="text" name="contactFirstName" value={formData.contactFirstName} onChange={handleInputChange} required /></div>
                  <div className="form-group"><label>Middle Name</label><input type="text" name="contactMiddleName" value={formData.contactMiddleName} onChange={handleInputChange} /></div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 15, marginBottom: 15 }}>
                  <div className="form-group"><label>Last Name *</label><input type="text" name="contactLastName" value={formData.contactLastName} onChange={handleInputChange} required /></div>
                  <div className="form-group">
                    <label>Gender *</label>
                    <select name="contactGender" value={formData.contactGender} onChange={handleInputChange} required>
                      <option value="">Select Gender...</option>
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                    </select>
                  </div>
                  <div className="form-group"><label>Position *</label><input type="text" name="contactPosition" value={formData.contactPosition} onChange={handleInputChange} required /></div>
                </div>

                <div className="form-group" style={{ marginBottom: 30 }}><label>Email Address *</label><input type="email" name="contactEmail" value={formData.contactEmail} onChange={handleInputChange} required /></div>

                <div className="step-title"><i className="fas fa-wallet"></i> Organization Bank Account Details</div>
                
                <div style={{ display: 'flex', gap: '15px', marginBottom: '20px' }}>
                  <button type="button" className="portal-btn-primary" style={{ background: '#1e3a8a', color: '#fff', border: 'none', padding: '10px 20px', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }} onClick={() => openBankModal('USD')}>
                    <i className="fas fa-plus mr-2"></i>Add USD Account
                  </button>
                  <button type="button" className="portal-btn-primary" style={{ background: '#10b981', color: '#fff', border: 'none', padding: '10px 20px', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }} onClick={() => openBankModal('ZiG')}>
                    <i className="fas fa-plus mr-2"></i>Add ZiG Account
                  </button>
                </div>

                <div style={{ overflowX: 'auto', marginBottom: '30px', border: '1px solid #cbd5e1', borderRadius: '8px' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0', color: '#334155', fontWeight: 'bold' }}>
                        <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '0.85rem' }}>Bank Name</th>
                        <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '0.85rem' }}>Branch Code</th>
                        <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '0.85rem' }}>Bank Branch</th>
                        <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '0.85rem' }}>Account Name</th>
                        <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '0.85rem' }}>Account Number</th>
                        <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '0.85rem' }}>Account Type</th>
                        <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '0.85rem' }}>Status</th>
                        <th style={{ padding: '12px 16px', textAlign: 'center', fontSize: '0.85rem' }}>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {bankAccounts.length === 0 ? (
                        <tr>
                          <td colSpan={8} style={{ padding: '24px', textAlign: 'center', color: '#64748b' }}>No bank accounts added yet. Please add at least one account.</td>
                        </tr>
                      ) : (
                        bankAccounts.map((acc, index) => (
                          <tr key={index} style={{ borderBottom: '1px solid #e2e8f0', color: '#334155' }}>
                            <td style={{ padding: '12px 16px' }}>{acc.bankName}</td>
                            <td style={{ padding: '12px 16px' }}>{acc.branchCode}</td>
                            <td style={{ padding: '12px 16px' }}>{acc.bankBranch}</td>
                            <td style={{ padding: '12px 16px' }}>{acc.accountName}</td>
                            <td style={{ padding: '12px 16px' }}>{acc.accountNumber}</td>
                            <td style={{ padding: '12px 16px' }}>
                              <span style={{ background: acc.accountType === 'USD' ? '#dbeafe' : '#d1fae5', color: acc.accountType === 'USD' ? '#1e40af' : '#065f46', padding: '4px 8px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 'bold' }}>
                                {acc.accountType}
                              </span>
                            </td>
                            <td style={{ padding: '12px 16px' }}><span style={{ color: '#10b981', fontWeight: 'bold' }}>Active</span></td>
                            <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                              <button type="button" style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: 5 }} onClick={() => removeBankAccount(index)}>
                                <i className="fas fa-trash"></i>
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

                <div className="step-title"><i className="fas fa-lock"></i> Portal Login Settings</div>
                <div className="form-row">
                  <div className="form-group"><label>Password *</label><input type="password" name="password" value={formData.password} onChange={handleInputChange} required /></div>
                  <div className="form-group"><label>Confirm Password *</label><input type="password" name="confirmPassword" value={formData.confirmPassword} onChange={handleInputChange} required /></div>
                </div>
                <div className="form-group" style={{ background: '#f8fafc', padding: '15px', borderRadius: '8px', border: '1px solid #cbd5e1' }}>
                  <label style={{ color: '#0f172a', fontWeight: 700 }}>School Access Code *</label>
                  <input type="text" name="schoolCode" placeholder="AX-XXXXXX" value={formData.schoolCode} onChange={handleInputChange} required />
                  <small style={{ color: '#64748b' }}>Enter the unique code of the school you wish to link with.</small>
                </div>

                <div className="btn-row" style={{ marginTop: '25px' }}>
                  <button type="button" className="btn-prev" onClick={prevStep}>Back</button>
                  <button type="button" className="btn-next" onClick={nextStep}>Continue</button>
                </div>
              </div>
            )}

            {step === 3 && (
              <div className="step-panel active">
                <div className="step-title"><i className="fas fa-file-contract"></i> Compliance Documents</div>
                
                {formData.orgType === 'Individual Consultant' ? (
                  <div style={{ border: '1px solid #cbd5e1', borderRadius: '8px', overflow: 'hidden', marginBottom: '20px' }}>
                    <div style={{ background: '#1e3a8a', color: '#fff', padding: '12px 16px', fontWeight: 'bold', fontSize: '0.95rem' }}>
                      Upload Supporting Document(s) For Individual Consultant
                    </div>
                    <table style={{ width: '100%', borderCollapse: 'collapse', background: '#fff' }}>
                      <thead>
                        <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#334155', fontWeight: 'bold' }}>
                          <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '0.85rem' }}>Supporting Document(s)</th>
                          <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '0.85rem' }}>Uploaded Document(s)</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                          <td style={{ padding: '12px 16px', verticalAlign: 'middle', fontSize: '0.9rem', color: '#334155' }}>Membership documents *</td>
                          <td style={{ padding: '12px 16px' }}>
                            <input type="file" onChange={(e) => handleFileChange(e, 'membershipDocs')} accept=".pdf,image/*" required={!docs.membershipDocs} style={{ display: 'none' }} id="membershipDocsFile" />
                            {docs.membershipDocs ? (
                              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                <span style={{ color: '#10b981', fontSize: '0.85rem' }}><i className="fas fa-check-circle"></i> File uploaded</span>
                                <button type="button" style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer' }} onClick={() => setDocs((p: any) => ({ ...p, membershipDocs: null }))}><i className="fas fa-trash"></i></button>
                              </div>
                            ) : (
                              <button type="button" className="portal-btn-primary" style={{ padding: '6px 12px', background: '#1e3a8a', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '0.8rem' }} onClick={() => document.getElementById('membershipDocsFile')?.click()}>Upload</button>
                            )}
                          </td>
                        </tr>
                        <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                          <td style={{ padding: '12px 16px', verticalAlign: 'middle', fontSize: '0.9rem', color: '#334155' }}>Profile *</td>
                          <td style={{ padding: '12px 16px' }}>
                            <input type="file" onChange={(e) => handleFileChange(e, 'profile')} accept=".pdf,image/*" required={!docs.profile} style={{ display: 'none' }} id="profileFile" />
                            {docs.profile ? (
                              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                <span style={{ color: '#10b981', fontSize: '0.85rem' }}><i className="fas fa-check-circle"></i> File uploaded</span>
                                <button type="button" style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer' }} onClick={() => setDocs((p: any) => ({ ...p, profile: null }))}><i className="fas fa-trash"></i></button>
                              </div>
                            ) : (
                              <button type="button" className="portal-btn-primary" style={{ padding: '6px 12px', background: '#1e3a8a', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '0.8rem' }} onClick={() => document.getElementById('profileFile')?.click()}>Upload</button>
                            )}
                          </td>
                        </tr>
                        <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                          <td style={{ padding: '12px 16px', verticalAlign: 'middle', fontSize: '0.9rem', color: '#334155' }}>CV *</td>
                          <td style={{ padding: '12px 16px' }}>
                            <input type="file" onChange={(e) => handleFileChange(e, 'cv')} accept=".pdf,image/*" required={!docs.cv} style={{ display: 'none' }} id="cvFile" />
                            {docs.cv ? (
                              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                <span style={{ color: '#10b981', fontSize: '0.85rem' }}><i className="fas fa-check-circle"></i> File uploaded</span>
                                <button type="button" style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer' }} onClick={() => setDocs((p: any) => ({ ...p, cv: null }))}><i className="fas fa-trash"></i></button>
                              </div>
                            ) : (
                              <button type="button" className="portal-btn-primary" style={{ padding: '6px 12px', background: '#1e3a8a', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '0.8rem' }} onClick={() => document.getElementById('cvFile')?.click()}>Upload</button>
                            )}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <>
                    <div className="form-row">
                       <div className="form-group"><label>Tax Clearance (BP) Number *</label><input type="text" name="taxNumber" value={formData.taxNumber} onChange={handleInputChange} placeholder="Tax BP Number" required /></div>
                       <div className="form-group"><label>Tax Expiry Date *</label><input type="date" name="taxExpiry" value={formData.taxExpiry} onChange={handleInputChange} required /></div>
                    </div>
                    <div className="form-row">
                       <div className="form-group"><label>Tax Clearance (ITF263) Doc *</label><input type="file" onChange={(e) => handleFileChange(e, 'taxClearance')} accept=".pdf,image/*" required /></div>
                       <div className="form-group"><label>Certificate of Incorporation *</label><input type="file" onChange={(e) => handleFileChange(e, 'certIncorp')} accept=".pdf,image/*" required /></div>
                    </div>
                  </>
                )}

                {formData.prazRegistered === 'Yes' ? (
                  <>
                    <div className="form-row">
                       <div className="form-group"><label>PRAZ Reg No (Step 1) *</label><input type="text" name="prazNo" value={formData.prazNo} disabled style={{ background: '#f1f5f9' }} /></div>
                       <div className="form-group"><label>PRAZ Expiry Date *</label><input type="date" name="prazExpiry" value={formData.prazExpiry} onChange={handleInputChange} required /></div>
                    </div>
                    <div className="form-group"><label>PRAZ Certificate (PDF/Image) *</label><input type="file" onChange={(e) => handleFileChange(e, 'prazCert')} accept=".pdf,image/*" required /></div>
                  </>
                ) : (
                  <div style={{ background: '#f8fafc', padding: 15, borderRadius: 8, border: '1px solid #cbd5e1', marginBottom: 20 }}>
                    <p style={{ margin: 0, color: '#64748b', fontSize: '0.85rem' }}><i className="fas fa-info-circle mr-1"></i> PRAZ compliance details and certificate upload are optional since you selected "No" for PRAZ registration.</p>
                  </div>
                )}

                <div className="form-row">
                   <div className="form-group"><label>NSSA Expiry</label><input type="date" name="nssaExpiry" value={formData.nssaExpiry} onChange={handleInputChange} /></div>
                   <div className="form-group"><label>NSSA Clearance Doc</label><input type="file" onChange={(e) => handleFileChange(e, 'nssaClearance')} accept=".pdf,image/*" /></div>
                </div>
                <div className="form-group" style={{ marginBottom: '20px' }}><label>Other Vendor Doc</label><input type="file" onChange={(e) => handleFileChange(e, 'vendorRegFile')} accept=".pdf,image/*" /></div>

                {/* Declaration Checkbox */}
                <div style={{ background: '#f8fafc', border: '1px solid #cbd5e1', padding: '15px 20px', borderRadius: '8px', marginBottom: '20px' }}>
                  <label style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', cursor: 'pointer', fontWeight: 'normal', margin: 0 }}>
                    <input type="checkbox" checked={declarationChecked} onChange={(e) => setDeclarationChecked(e.target.checked)} required style={{ marginTop: '4px' }} />
                    <span style={{ fontSize: '0.85rem', color: '#334155', lineHeight: '1.4' }}>
                      <strong>Declaration: *</strong> I hereby certify that the information contained herein are true and accurate. I also verify and confirm that I have selected the correct Organization Category.
                    </span>
                  </label>
                </div>

                <div className="btn-row">
                  <button type="button" className="btn-prev" onClick={prevStep}>Back</button>
                  <button type="submit" className="btn-submit" disabled={loading}>{loading ? 'Submitting...' : 'Complete Registration'}</button>
                </div>
              </div>
            )}
          </form>
        </div>

        <div className="register-footer" style={{ marginTop: 20, textAlign: 'center', borderTop: '1px solid #e2e8f0', paddingTop: 15 }}>
          Already have an account? <Link to="/supplier/login">Sign In</Link> &nbsp;|&nbsp; <Link to={formData.schoolCode ? `/school/${formData.schoolCode.trim().toUpperCase()}` : "/"}><i className="fas fa-home"></i> Home</Link>
        </div>
      </div>

      {/* Add Bank Account Modal */}
      {showBankModal && (
        <div className="portal-modal-overlay" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0, 0, 0, 0.5)', zIndex: 10000 }}>
          <div className="portal-modal-card animate-in zoom-in duration-200" style={{ maxWidth: '500px', width: '90%', padding: 0, background: '#fff', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)' }}>
            <div className="portal-modal-header" style={{ padding: '20px 30px', borderBottom: '1px solid #e2e8f0', background: '#1e3a8a', color: '#fff', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 'bold' }}>Add Bank Details</h3>
              <button type="button" onClick={() => setShowBankModal(false)} style={{ background: 'none', border: 'none', color: '#fff', fontSize: '1.5rem', cursor: 'pointer' }}>&times;</button>
            </div>
            <div className="portal-modal-body" style={{ padding: '25px 30px' }}>
              <div className="form-group" style={{ marginBottom: '15px' }}>
                <label>Account Type *</label>
                <input type="text" value={bankModalType} disabled style={{ background: '#f1f5f9', fontWeight: 'bold', color: '#334155', border: '1px solid #cbd5e1', padding: '10px', width: '100%', borderRadius: '6px' }} />
              </div>
              <div className="form-group" style={{ marginBottom: '15px' }}>
                <label>Bank Name *</label>
                <input type="text" required value={bankFormData.bankName} onChange={e => setBankFormData({...bankFormData, bankName: e.target.value})} placeholder="e.g. Nedbank" style={{ border: '1px solid #cbd5e1', padding: '10px', width: '100%', borderRadius: '6px' }} />
              </div>
              <div className="form-group" style={{ marginBottom: '15px' }}>
                <label>Branch Code *</label>
                <input type="text" required value={bankFormData.branchCode} onChange={e => setBankFormData({...bankFormData, branchCode: e.target.value})} placeholder="e.g. 190001" style={{ border: '1px solid #cbd5e1', padding: '10px', width: '100%', borderRadius: '6px' }} />
              </div>
              <div className="form-group" style={{ marginBottom: '15px' }}>
                <label>Bank Branch *</label>
                <input type="text" required value={bankFormData.bankBranch} onChange={e => setBankFormData({...bankFormData, bankBranch: e.target.value})} placeholder="e.g. Avondale" style={{ border: '1px solid #cbd5e1', padding: '10px', width: '100%', borderRadius: '6px' }} />
              </div>
              <div className="form-group" style={{ marginBottom: '15px' }}>
                <label>Account Name *</label>
                <input type="text" required value={bankFormData.accountName} onChange={e => setBankFormData({...bankFormData, accountName: e.target.value})} placeholder="e.g. Apex Textiles Ltd" style={{ border: '1px solid #cbd5e1', padding: '10px', width: '100%', borderRadius: '6px' }} />
              </div>
              <div className="form-group" style={{ marginBottom: '15px' }}>
                <label>Account Number *</label>
                <input type="text" required value={bankFormData.accountNumber} onChange={e => setBankFormData({...bankFormData, accountNumber: e.target.value})} placeholder="e.g. 10023456789" style={{ border: '1px solid #cbd5e1', padding: '10px', width: '100%', borderRadius: '6px' }} />
              </div>
            </div>
            <div className="portal-modal-footer" style={{ padding: '15px 30px', background: '#f8fafc', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button type="button" className="portal-btn-secondary" style={{ padding: '10px 20px', background: '#e2e8f0', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }} onClick={() => setShowBankModal(false)}>Close</button>
              <button type="button" className="portal-btn-primary" style={{ padding: '10px 25px', background: '#1e3a8a', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }} onClick={handleSaveBankAccount}>Save</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Staff Registration Component (Multi-step high fidelity)
 */
export function StaffRegister({ role, label, icon }: { role: string, label: string, icon: string }) {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [schoolData, setSchoolData] = useState<any>(null);
  const [verifying, setVerifying] = useState(false);

  // File name tracking
  const [idDocName, setIdDocName] = useState('');
  const [residenceDocName, setResidenceDocName] = useState('');
  const [qualificationsDocName, setQualificationsDocName] = useState('');

  // Shared style constants
  const cardStyle: React.CSSProperties = { background: 'var(--bg-secondary,#f8fafc)', border: '1px solid var(--border-color,#e2e8f0)', borderRadius: '12px', padding: '20px', marginBottom: '16px' };
  const sectionHeaderStyle: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', fontWeight: 700, color: '#2563eb', marginBottom: '16px', paddingBottom: '10px', borderBottom: '1px solid var(--border-color,#e2e8f0)' };
  const uploadBoxStyle: React.CSSProperties = { border: '2px dashed #cbd5e1', borderRadius: '10px', padding: '20px', textAlign: 'center', cursor: 'pointer', transition: 'all 0.2s' };
  
  const [formData, setFormData] = useState<any>({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    schoolCode: '',
    password: '',
    confirmPassword: '',
    // Personal extra
    dob: '',
    gender: '',
    nationalId: '',
    address: '',
    bloodGroup: '',
    department: '',
    designation: '',
    secondaryRoles: [] as string[],
    maritalStatus: '',
    spouseName: '',
    spousePhone: '',
    nokName: '',
    nokRelation: '',
    nokPhone: '',
    // HR / Payroll / Social
    dateAssumedPost: '',
    dateOfLeaving: '',
    // USD Account
    accountNumber: '',
    accountHolderName: '',
    bankName: '',
    bankBranch: '',
    branchCode: '',
    accountType: 'USD',
    // ZiG Account
    accountNumberZig: '',
    accountHolderNameZig: '',
    bankNameZig: '',
    bankBranchZig: '',
    branchCodeZig: '',
    accountTypeZig: 'ZiG',
    facebookLink: '',
    linkedinLink: '',
    twitterLink: '',
  });

  const [docs, setDocs] = useState<any>({
    idDoc: null,
    residenceDoc: null,
    qualificationsDoc: null
  });

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const urlSchoolCode = params.get('school') || params.get('code') || localStorage.getItem('last_school_code');
    if (urlSchoolCode) {
      const codeUpper = urlSchoolCode.trim().toUpperCase();
      setFormData((prev: any) => ({ ...prev, schoolCode: codeUpper }));
      localStorage.setItem('last_school_code', codeUpper);
      
      const autoVerify = async () => {
        setVerifying(true);
        try {
          const { data } = await api.get(`/api/public/schools/${codeUpper}/data`);
          setSchoolData(data);
        } catch (e) {
          console.error("Auto verification failed for school code:", codeUpper, e);
        } finally {
          setVerifying(false);
        }
      };
      autoVerify();
    }
  }, []);

  const handleInputChange = (e: any) => {
    const { name, value } = e.target;
    if (name === 'schoolCode') {
      localStorage.setItem('last_school_code', value.toUpperCase());
    }
    setFormData((prev: any) => ({ ...prev, [name]: value }));
  };

  const handleFileChange = (e: any, field: string = 'avatar') => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > MAX_FILE_SIZE) {
        showToast('File size exceeds 20MB limit.', 'error');
        e.target.value = '';
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        if (field === 'avatar') {
          setAvatarPreview(reader.result as string);
        } else {
          setDocs((prev: any) => ({ ...prev, [field]: reader.result }));
          if (field === 'idDoc') { setIdDocName(file.name); showToast('National ID uploaded', 'success'); }
          else if (field === 'residenceDoc') { setResidenceDocName(file.name); showToast('Proof of Residence uploaded', 'success'); }
          else if (field === 'qualificationsDoc') { setQualificationsDocName(file.name); showToast('Qualifications uploaded', 'success'); }
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const FileUploadCard = ({ label, type, file, fileName, icon }: {
    label: string; type: 'idDoc'|'residenceDoc'|'qualificationsDoc'; file: string|null; fileName: string; icon: string;
  }) => (
    <div style={{ ...uploadBoxStyle, borderColor: file ? '#22c55e' : 'var(--border-color,#cbd5e1)', background: file ? '#f0fdf4' : 'var(--bg-secondary,#f8fafc)' }}>
      <label htmlFor={'staff-file-'+type} style={{ cursor:'pointer', display:'block' }}>
        <div style={{ fontSize:'32px', marginBottom:'8px' }}>
          {file ? '✅' : <i className={'fas '+icon} style={{ color:'#94a3b8' }}></i>}
        </div>
        <div style={{ fontWeight:700, fontSize:'14px', color: file ? '#16a34a' : 'var(--text-primary,#1e293b)', marginBottom:'4px' }}>{label}</div>
        {file
          ? <div style={{ fontSize:'12px', color:'#16a34a', fontWeight:600 }}>{fileName} — <span style={{ textDecoration:'underline' }}>Change</span></div>
          : <div style={{ fontSize:'12px', color:'#94a3b8' }}>Click to upload PDF, JPG or PNG (max 20MB)</div>
        }
      </label>
      <input type="file" id={'staff-file-'+type} accept=".pdf,.jpg,.jpeg,.png" style={{ display:'none' }} onChange={(e) => handleFileChange(e, type)} />
    </div>
  );


  const verifySchool = async () => {
    if (!formData.schoolCode) return showToast('Enter school code first', 'warning');
    setVerifying(true);
    try {
      const { data } = await api.get(`/api/public/schools/${formData.schoolCode}/data`);
      setSchoolData(data);
      showToast(`Verified: ${data.schoolName}`, 'success');
    } catch {
      showToast('Invalid school code', 'error');
      setSchoolData(null);
    } finally {
      setVerifying(false);
    }
  };

  const nextStep = () => {
    if (step === 1) {
       if (!formData.schoolCode || !schoolData) {
         return showToast('Please enter and verify your school code first.', 'warning');
       }
    }
    const panels: Record<number, string[]> = {
      1: ['firstName', 'lastName', 'nationalId', 'gender'],
      2: ['department', 'designation', 'dateAssumedPost'],
      3: [], // Banking & Social are optional
      4: [],
      5: ['email', 'password', 'confirmPassword']
    };
    
    const required = panels[step];
    for (const field of required) {
      if (!formData[field]) {
        showToast(`Please fill in all required fields.`, 'warning');
        return;
      }
    }

    if (step === 5) {
      if (!STRONG_PASSWORD_REGEX.test(formData.password)) {
        return showToast('Password is too weak.', 'error');
      }
      if (formData.password !== formData.confirmPassword) {
        return showToast('Passwords do not match', 'error');
      }
    }
    setStep(s => s + 1);
  };

  const prevStep = () => setStep(s => s - 1);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!STRONG_PASSWORD_REGEX.test(formData.password)) {
        showToast('Password must be at least 8 characters long, including uppercase, lowercase, numbers, and symbols.', 'error');
        return;
    }
    if (formData.password !== formData.confirmPassword) {
      showToast('Passwords do not match', 'error'); return;
    }

    setLoading(true);
    try {
      const payload = { 
        ...formData, 
        ...docs,
        name: `${formData.firstName} ${formData.lastName}`, 
        role, 
        avatar: avatarPreview 
      };
      await api.post('/api/auth/register-user', payload);
      showToast(`${label} registered successfully! Welcome to the team.`, 'success');
      navigate(`/${role.toLowerCase()}/login`);
    } catch (err: any) {
      showToast(err.response?.data?.error || 'Registration failed', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="register-page-wrapper">
      <div className="register-container" style={{ maxWidth: step === 3 || step === 4 ? 800 : 650 }}>
        <div className="register-header" style={{ background: role === 'BURSAR' ? '#065f46' : role === 'LIBRARIAN' ? '#1e40af' : 'var(--school-primary)' }}>
          <i className={`fas ${icon}`} style={{ fontSize: '2.5rem', marginBottom: 15 }}></i>
          <h2>{label} Registration</h2>
          <p>Official School Enrollment Portal</p>
        </div>

        <div className="steps-bar">
          <div className={`step-item ${step === 1 ? 'active' : ''} ${step > 1 ? 'done' : ''}`} onClick={() => setStep(1)}><div className="step-num">1</div><span>Personal</span></div>
          <div className={`step-item ${step === 2 ? 'active' : ''} ${step > 2 ? 'done' : ''}`} onClick={() => step > 1 && setStep(2)}><div className="step-num">2</div><span>Work</span></div>
          <div className={`step-item ${step === 3 ? 'active' : ''} ${step > 3 ? 'done' : ''}`} onClick={() => step > 2 && setStep(3)}><div className="step-num">3</div><span>HR & Social</span></div>
          <div className={`step-item ${step === 4 ? 'active' : ''} ${step > 4 ? 'done' : ''}`} onClick={() => step > 3 && setStep(4)}><div className="step-num">4</div><span>Documents</span></div>
          <div className={`step-item ${step === 5 ? 'active' : ''}`} onClick={() => step > 4 && setStep(5)}><div className="step-num">5</div><span>Account</span></div>
        </div>

        <div className="form-body">
          <form onSubmit={handleSubmit}>
            {step === 1 && (
              <div className="step-panel active">
                <div className="step-title"><i className="fas fa-school"></i> School &amp; Personal Info</div>
                
                {/* School Code Verification — matching StudentRegister card design */}
                <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderLeft: '4px solid #2563eb', borderRadius: '10px', padding: '16px', marginBottom: '20px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', fontWeight: 700, color: '#2563eb', marginBottom: '12px', paddingBottom: '8px', borderBottom: '1px solid #bfdbfe' }}>
                    <i className="fas fa-school"></i> School Verification
                  </div>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label style={{ color: '#1d4ed8', fontWeight: 700 }}>School Access Code *</label>
                    <div style={{ display: 'flex', gap: '10px' }}>
                      <input type="text" name="schoolCode" placeholder="e.g. ABC123" value={formData.schoolCode} onChange={handleInputChange} required style={{ flex: 1, textTransform: 'uppercase' }} />
                      <button type="button" className="portal-btn-primary" onClick={verifySchool} disabled={verifying}>
                        {verifying ? <><i className="fas fa-spinner fa-spin"></i> Verifying&hellip;</> : <><i className="fas fa-check-circle"></i> Verify</>}
                      </button>
                    </div>
                    {schoolData && (
                      <div style={{ marginTop: '8px', padding: '8px 12px', background: '#dcfce7', borderRadius: '8px', color: '#16a34a', fontWeight: 700, fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <i className="fas fa-check-circle"></i> Verified: {schoolData.schoolName}
                      </div>
                    )}
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', marginBottom: 20 }}>
                  <div className="avatar-preview-wrap" onClick={() => document.getElementById('avatar-input')?.click()}>
                    {avatarPreview ? <img src={avatarPreview} alt="Preview" /> : <i className="fas fa-camera fa-2x" style={{ color: '#cbd5e0' }}></i>}
                  </div>
                  <div>
                    <label style={{ fontSize: '0.85rem', fontWeight: 600, color: '#475569', display: 'block', marginBottom: 5 }}>Staff Profile Photo (Max 20MB)</label>
                    <input type="file" id="avatar-input" accept="image/*" onChange={(e) => handleFileChange(e, 'avatar')} style={{ fontSize: '0.8rem' }} />
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group"><label>First Name *</label><input type="text" name="firstName" value={formData.firstName} onChange={handleInputChange} required /></div>
                  <div className="form-group"><label>Last Name *</label><input type="text" name="lastName" value={formData.lastName} onChange={handleInputChange} required /></div>
                </div>
                <div className="form-row">
                  <div className="form-group"><label>National ID *</label><input type="text" name="nationalId" value={formData.nationalId} onChange={handleInputChange} required /></div>
                  <div className="form-group">
                    <label>Blood Group</label>
                    <select name="bloodGroup" value={formData.bloodGroup} onChange={handleInputChange}>
                      <option value="">Select...</option>
                      <option>A+</option><option>A-</option>
                      <option>B+</option><option>B-</option>
                      <option>AB+</option><option>AB-</option>
                      <option>O+</option><option>O-</option>
                    </select>
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>Gender *</label>
                    <select name="gender" value={formData.gender} onChange={handleInputChange} required>
                      <option value="">Select...</option><option>Male</option><option>Female</option>
                    </select>
                  </div>
                  <div className="form-group"><label>Date of Birth</label><input type="date" name="dob" value={formData.dob} onChange={handleInputChange} /></div>
                </div>
                <div className="btn-row"><button type="button" className="btn-next" onClick={nextStep}>Continue <i className="fas fa-arrow-right"></i></button></div>
              </div>
            )}

            {step === 2 && (
              <div className="step-panel active">
                <div className="step-title"><i className="fas fa-briefcase"></i> Work & Designation</div>
                <div className="form-row">
                  <div className="form-group">
                    <label>Department *</label>
                    <select name="department" value={formData.department} onChange={handleInputChange} required>
                      <option value="">Select Dept...</option>
                      {Object.keys(DESIGNATIONS).map(d => <option key={d} value={d}>{d}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Official Designation *</label>
                    <select name="designation" value={formData.designation} onChange={handleInputChange} required disabled={!formData.department}>
                      <option value="">Select Post...</option>
                      {formData.department && DESIGNATIONS[formData.department].map((p: string) => <option key={p} value={p}>{p}</option>)}
                    </select>
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>Date Assumed Post *</label>
                    <input type="date" name="dateAssumedPost" value={formData.dateAssumedPost} onChange={handleInputChange} required />
                  </div>
                  <div className="form-group">
                    <label>Date of Leaving (If applicable)</label>
                    <input type="date" name="dateOfLeaving" value={formData.dateOfLeaving} onChange={handleInputChange} />
                  </div>
                </div>
                <div className="btn-row">
                  <button type="button" className="btn-prev" onClick={prevStep}>Back</button>
                  <button type="button" className="btn-next" onClick={nextStep}>Continue</button>
                </div>
              </div>
            )}

            {step === 3 && (
              <div className="step-panel active">
                <div className="step-title"><i className="fas fa-money-check-alt"></i> Banking & Social Links <small style={{ fontWeight: 400, color: '#94a3b8' }}>(Optional)</small></div>
                <div style={{ padding: '10px 14px', background: '#eff6ff', borderLeft: '3px solid #3b82f6', borderRadius: 6, marginBottom: 16, fontSize: '0.82rem', color: '#1e40af' }}>
                  <i className="fas fa-info-circle mr-1"></i> Banking details are used for payroll. You can fill these in later if needed.
                </div>
                <div className="section-divider">Banking Details (For Payroll)</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px', marginBottom: '20px' }}>
                  {/* USD Account Card */}
                  <div style={{ ...cardStyle, borderLeft: '4px solid #3b82f6' }}>
                    <div style={sectionHeaderStyle}>
                      <i className="fas fa-dollar-sign" style={{ color: '#3b82f6' }}></i> USD Account Details
                    </div>
                    <div className="form-group mb-3"><label className="text-xs font-semibold">Bank Name</label><input type="text" name="bankName" value={formData.bankName} onChange={handleInputChange} style={{ width: '100%' }} /></div>
                    <div className="form-group mb-3"><label className="text-xs font-semibold">Branch Name</label><input type="text" name="bankBranch" value={formData.bankBranch} onChange={handleInputChange} style={{ width: '100%' }} /></div>
                    <div style={{ display: 'flex', gap: '10px' }} className="mb-3">
                      <div className="form-group flex-1"><label className="text-xs font-semibold">Branch Code</label><input type="text" name="branchCode" value={formData.branchCode} onChange={handleInputChange} style={{ width: '100%' }} /></div>
                      <div className="form-group flex-1"><label className="text-xs font-semibold">Account Type</label><input type="text" name="accountType" value={formData.accountType} readOnly style={{ width: '100%', background: '#f1f5f9', cursor: 'not-allowed' }} /></div>
                    </div>
                    <div className="form-group mb-3"><label className="text-xs font-semibold">Account Number</label><input type="text" name="accountNumber" value={formData.accountNumber} onChange={handleInputChange} style={{ width: '100%' }} /></div>
                    <div className="form-group"><label className="text-xs font-semibold">Account Holder Name</label><input type="text" name="accountHolderName" value={formData.accountHolderName} onChange={handleInputChange} style={{ width: '100%' }} /></div>
                  </div>

                  {/* ZiG Account Card */}
                  <div style={{ ...cardStyle, borderLeft: '4px solid #f59e0b' }}>
                    <div style={{ ...sectionHeaderStyle, color: '#b45309' }}>
                      <i className="fas fa-coins" style={{ color: '#f59e0b' }}></i> ZiG Account Details
                    </div>
                    <div className="form-group mb-3"><label className="text-xs font-semibold">Bank Name</label><input type="text" name="bankNameZig" value={formData.bankNameZig} onChange={handleInputChange} style={{ width: '100%' }} /></div>
                    <div className="form-group mb-3"><label className="text-xs font-semibold">Branch Name</label><input type="text" name="bankBranchZig" value={formData.bankBranchZig} onChange={handleInputChange} style={{ width: '100%' }} /></div>
                    <div style={{ display: 'flex', gap: '10px' }} className="mb-3">
                      <div className="form-group flex-1"><label className="text-xs font-semibold">Branch Code</label><input type="text" name="branchCodeZig" value={formData.branchCodeZig} onChange={handleInputChange} style={{ width: '100%' }} /></div>
                      <div className="form-group flex-1"><label className="text-xs font-semibold">Account Type</label><input type="text" name="accountTypeZig" value={formData.accountTypeZig} readOnly style={{ width: '100%', background: '#f1f5f9', cursor: 'not-allowed' }} /></div>
                    </div>
                    <div className="form-group mb-3"><label className="text-xs font-semibold">Account Number</label><input type="text" name="accountNumberZig" value={formData.accountNumberZig} onChange={handleInputChange} style={{ width: '100%' }} /></div>
                    <div className="form-group"><label className="text-xs font-semibold">Account Holder Name</label><input type="text" name="accountHolderNameZig" value={formData.accountHolderNameZig} onChange={handleInputChange} style={{ width: '100%' }} /></div>
                  </div>
                </div>

                <div className="section-divider">Social Media Profiles (Optional)</div>
                <div className="form-row">
                  <div className="form-group"><label><i className="fab fa-facebook"></i> Facebook Link</label><input type="url" name="facebookLink" value={formData.facebookLink} onChange={handleInputChange} placeholder="https://facebook.com/..." /></div>
                  <div className="form-group"><label><i className="fab fa-linkedin"></i> LinkedIn Link</label><input type="url" name="linkedinLink" value={formData.linkedinLink} onChange={handleInputChange} placeholder="https://linkedin.com/in/..." /></div>
                  <div className="form-group"><label><i className="fab fa-twitter"></i> Twitter Link</label><input type="url" name="twitterLink" value={formData.twitterLink} onChange={handleInputChange} placeholder="https://twitter.com/..." /></div>
                </div>

                <div className="btn-row">
                  <button type="button" className="btn-prev" onClick={prevStep}><i className="fas fa-arrow-left"></i> Back</button>
                  <button type="button" className="btn-next" onClick={nextStep}>Continue <i className="fas fa-arrow-right"></i></button>
                </div>
              </div>
            )}

            {step === 4 && (
              <div className="step-panel active">
                <div className="step-title"><i className="fas fa-file-upload"></i> Supporting Documents <small style={{ fontWeight: 400, color: '#94a3b8' }}>(Optional)</small></div>
                <div style={{ padding: '10px 14px', background: '#eff6ff', borderLeft: '3px solid #3b82f6', borderRadius: 6, marginBottom: 16, fontSize: '0.82rem', color: '#1e40af' }}>
                  <i className="fas fa-info-circle mr-1"></i> Upload your identification and qualification documents. Each file is stored separately. You can submit these later if needed.
                </div>

                <div style={cardStyle}>
                  <div style={sectionHeaderStyle}><i className="fas fa-folder-open"></i> Staff Documents</div>
                  <p style={{ fontSize: '13px', color: '#64748b', marginBottom: '16px' }}>Upload your documents individually. Each file is stored separately in your staff record.</p>
                  <div className="form-row" style={{ alignItems: 'stretch' }}>
                    <div className="form-group" style={{ flex: 1 }}>
                      <FileUploadCard label="National ID / Passport" type="idDoc" file={docs.idDoc} fileName={idDocName} icon="fa-id-card" />
                    </div>
                    <div className="form-group" style={{ flex: 1 }}>
                      <FileUploadCard label="Proof of Residence" type="residenceDoc" file={docs.residenceDoc} fileName={residenceDocName} icon="fa-home" />
                    </div>
                  </div>
                  <div style={{ marginTop: '16px' }}>
                    <FileUploadCard label="Professional Qualifications" type="qualificationsDoc" file={docs.qualificationsDoc} fileName={qualificationsDocName} icon="fa-graduation-cap" />
                  </div>
                </div>

                <div className="section-divider">Next of Kin</div>
                <div className="form-row">
                  <div className="form-group"><label>Full Name</label><input type="text" name="nokName" value={formData.nokName} onChange={handleInputChange} /></div>
                  <div className="form-group"><label>Phone Number</label><input type="tel" name="nokPhone" value={formData.nokPhone} onChange={handleInputChange} /></div>
                </div>

                <div className="btn-row">
                  <button type="button" className="btn-prev" onClick={prevStep}><i className="fas fa-arrow-left"></i> Back</button>
                  <button type="button" className="btn-next" onClick={nextStep}>Continue <i className="fas fa-arrow-right"></i></button>
                </div>
              </div>
            )}

            {step === 5 && (
              <div className="step-panel active">
                <div className="step-title"><i className="fas fa-lock"></i> Account & Security</div>
                <div className="form-group">
                  <label>Work Email Address *</label>
                  <input type="email" name="email" value={formData.email} onChange={handleInputChange} required />
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>Password *</label>
                    <input type="password" name="password" value={formData.password} onChange={handleInputChange} required />
                    <small style={{ fontSize: '0.7rem', color: '#718096' }}>Min 8 chars, uppercase, lowercase, number & symbol</small>
                  </div>
                  <div className="form-group"><label>Confirm *</label><input type="password" name="confirmPassword" value={formData.confirmPassword} onChange={handleInputChange} required /></div>
                </div>
                <div className="btn-row">
                  <button type="button" className="btn-prev" onClick={prevStep}>Back</button>
                  <button type="submit" className="btn-submit" disabled={loading}>{loading ? 'Finalizing...' : 'Complete Registration'}</button>
                </div>
              </div>
            )}
          </form>
        </div>

        <div className="register-footer">
          Already have an account? <Link to={`/${role.toLowerCase()}/login`}>Sign In</Link> &nbsp;|&nbsp; <Link to={formData.schoolCode ? `/school/${formData.schoolCode.trim().toUpperCase()}` : "/"}><i className="fas fa-home"></i> Home</Link>
        </div>
      </div>
    </div>
  );
}
