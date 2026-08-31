import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useSetup } from '../../../hooks/useSetup';
import { useToast } from '../../../context/ToastContext';
import api from '../../../lib/api';
import '../../../styles/portal.css';

export default function SetupWizardPage() {
  const { setupStatus, loading, offline, refreshSetupStatus, updateStage, updateModules, seedCOA } = useSetup();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  // Wizard Step State
  const initialStepParam = parseInt(searchParams.get('step') || '1', 10);
  const [step, setStep] = useState<number>(initialStepParam);

  // Step 1: System & Personal Preferences State
  const [sysPrefs, setSysPrefs] = useState({
    language: 'en',
    preferredTimezone: 'Africa/Harare',
    systemCurrency: 'USD',
    runningSession: `${new Date().getFullYear()}-${new Date().getFullYear() + 1}`,
    currentTerm: 'Term 1'
  });

  // Step 2: Org Profile State
  const [orgData, setOrgData] = useState({
    name: '',
    type: 'secondary',
    email: '',
    phone: '',
    address: ''
  });

  // Step 3: School Branding & Document Templates State
  const [brandingData, setBrandingData] = useState({
    motto: '',
    systemEmail: '',
    reportHeader: ''
  });

  // Step 4: Public Website & Landing Page Preferences State
  const [websiteData, setWebsiteData] = useState({
    bannerTitle: '',
    bannerSubTitleOne: '',
    aboutTitle: '',
    aboutUsContent: '',
    directorName: '',
    directorTitle: 'Headmaster',
    yearOfEstablishment: '1995',
    facebook: '',
    twitter: '',
    instagram: '',
    linkedin: '',
    admissionProcedure: ''
  });

  // Step 5: ID Cards & Gate Access Control State
  const [idCardData, setIdCardData] = useState({
    idCardLayout: 'VERTICAL',
    gateRequiredType: 'none',
    gateMinPaidAmount: '0',
    gateMinPaidPercent: '50',
    idCardTemplateFront: '',
    idCardTemplateBack: ''
  });

  // Step 6: Staff State
  const [staffData, setStaffData] = useState({ name: '', email: '', role: 'BURSAR' });

  // Step 8: Departments State
  const [deptName, setDeptName] = useState('');
  const [deptCode, setDeptCode] = useState('');

  // Step 9: Subjects State
  const [subjectName, setSubjectName] = useState('');
  const [subjectCode, setSubjectCode] = useState('');
  const [subjectDeptId, setSubjectDeptId] = useState('');
  const [deptList, setDeptList] = useState<{ id: string; name: string }[]>([]);

  // Step 10: Class State
  const [className, setClassName] = useState('');
  const [classLevel, setClassLevel] = useState('Form 1');

  // Step 11: Grading Policy State
  const [gradeForm, setGradeForm] = useState({
    grade: 'A',
    minScore: '80',
    maxScore: '100',
    status: 'DISTINCTION'
  });

  // Step 12: Fee State
  const [feeTitle, setFeeTitle] = useState('');
  const [feeAmount, setFeeAmount] = useState('');
  const [feeBillingType, setFeeBillingType] = useState('Termly');
  const [feeIncomeAccountId, setFeeIncomeAccountId] = useState('');
  const [feeArAccountId, setFeeArAccountId] = useState('');
  const [coaAccounts, setCoaAccounts] = useState<{ id: string; code: string; name: string; type: string }[]>([]);

  // Step 14: Transportation State
  const [routeName, setRouteName] = useState('');
  const [routeDesc, setRouteDesc] = useState('');
  const [vehicleName, setVehicleName] = useState('');
  const [vehicleNumber, setVehicleNumber] = useState('');
  const [vehicleModel, setVehicleModel] = useState('');
  const [driverName, setDriverName] = useState('');
  const [driverContact, setDriverContact] = useState('');

  // Step 15: Boarding Hostels State
  const [hostelCatName, setHostelCatName] = useState('');
  const [hostelCatDesc, setHostelCatDesc] = useState('');
  const [roomName, setRoomName] = useState('');
  const [roomBeds, setRoomBeds] = useState('4');
  const [roomCost, setRoomCost] = useState('150');

  // Step 16: Asset Governance State
  const [assetName, setAssetName] = useState('');
  const [assetCategory, setAssetCategory] = useState('Furniture');
  const [assetSerial, setAssetSerial] = useState('');
  const [assetLocation, setAssetLocation] = useState('');
  const [assetPrice, setAssetPrice] = useState('');

  // Step 17: Sports & Houses State
  const [sportName, setSportName] = useState('');
  const [sportCategory, setSportCategory] = useState('Outdoors');
  const [houseName, setHouseName] = useState('');
  const [houseColor, setHouseColor] = useState('#2563eb');

  // Step 18: Student Clubs State
  const [clubName, setClubName] = useState('');
  const [clubCategory, setClubCategory] = useState('Academic');

  // Step 19: Uniform State
  const [uniformName, setUniformName] = useState('');
  const [uniformPrice, setUniformPrice] = useState('');

  // Step 20: Pharmacy State
  const [medName, setMedName] = useState('');
  const [medQty, setMedQty] = useState('');

  // Step 21: Document & Certificate Templates Branding State
  const [docBranding, setDocBranding] = useState({
    receiptPrefix: 'REC-',
    invoiceDesign: 'modern-clean',
    certTitle: 'Certificate of Achievement',
    mandatoryReceipts: true,
    showBalanceOnReceipts: true
  });

  // Sync setupStatus data on load
  const [prevSetupStatus, setPrevSetupStatus] = useState<typeof setupStatus | null>(null);
  const [prevStepParam, setPrevStepParam] = useState<string | null>(null);

  useEffect(() => {
    api.get('/api/accounts/coa')
      .then(res => setCoaAccounts(Array.isArray(res.data) ? res.data : []))
      .catch(() => {});
    api.get('/api/departments')
      .then(res => setDeptList(Array.isArray(res.data) ? res.data : []))
      .catch(() => {});
    api.get('/api/schools/settings')
      .then(res => {
        if (res.data) {
          setBrandingData({
            motto: res.data.motto || '',
            systemEmail: res.data.systemEmail || '',
            reportHeader: res.data.reportHeader || ''
          });
          setIdCardData(prev => ({
            ...prev,
            gateRequiredType: res.data.gateRequiredType || 'none',
            gateMinPaidAmount: (res.data.gateMinPaidAmount || 0).toString(),
            gateMinPaidPercent: (res.data.gateMinPaidPercent || 50).toString(),
            idCardTemplateFront: res.data.idCardTemplateFront || '',
            idCardTemplateBack: res.data.idCardTemplateBack || ''
          }));
          setWebsiteData(prev => ({
            ...prev,
            facebook: res.data.facebook || '',
            twitter: res.data.twitter || '',
            instagram: res.data.instagram || '',
            linkedin: res.data.linkedin || ''
          }));
        }
      })
      .catch(() => {});
    api.get('/api/website-settings')
      .then(res => {
        if (res.data) {
          setWebsiteData(prev => ({ ...prev, ...res.data }));
        }
      })
      .catch(() => {});
  }, []);

  const currentStepParam = searchParams.get('step');

  if (setupStatus && (setupStatus !== prevSetupStatus || currentStepParam !== prevStepParam)) {
    setPrevSetupStatus(setupStatus);
    setPrevStepParam(currentStepParam);

    if (setupStatus !== prevSetupStatus) {
      setOrgData({
        name: setupStatus.schoolName || '',
        type: setupStatus.schoolType || 'secondary',
        email: '',
        phone: '',
        address: ''
      });
    }

    if (currentStepParam) {
      setStep(parseInt(currentStepParam, 10));
    } else if (setupStatus.currentStep && setupStatus !== prevSetupStatus) {
      setStep(setupStatus.currentStep);
    }
  }

  if (loading) {
    return (
      <div className="portal-card portal-p-40-center">
        <i className="fas fa-spinner fa-spin fa-2x portal-icon-primary"></i>
        <p className="portal-text-muted-sm portal-mt-12">Loading Setup Wizard Status...</p>
      </div>
    );
  }

  if (offline || !setupStatus) {
    return (
      <div className="portal-card portal-p-40-center">
        <i className="fas fa-wifi fa-3x" style={{ color: '#dc2626', marginBottom: '16px' }}></i>
        <h3 style={{ color: '#dc2626', marginBottom: '8px' }}>Backend Server Offline</h3>
        <p className="portal-text-muted-sm" style={{ maxWidth: '400px', margin: '0 auto 20px' }}>
          The Setup Wizard requires a connection to the backend server. Please ensure the backend is running and try again.
        </p>
        <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
          <button className="portal-btn-primary" onClick={() => { refreshSetupStatus(); }}>
            <i className="fas fa-refresh portal-mr-6"></i>Retry Connection
          </button>
          <button className="portal-btn-secondary" onClick={() => navigate('/admin/dashboard')}>
            <i className="fas fa-arrow-left portal-mr-6"></i>Return to Dashboard
          </button>
        </div>
      </div>
    );
  }

  const { enabledModules, completedStages, counts } = setupStatus;

  const handleModuleToggle = async (modKey: keyof typeof enabledModules) => {
    const updated = { ...enabledModules, [modKey]: !enabledModules[modKey] };
    await updateModules(updated);
    showToast(`Updated active modules. Setup steps re-aligned!`, 'info');
  };

  const handleNextStep = async (currentStageKey?: string) => {
    if (currentStageKey) {
      await updateStage(currentStageKey, true, Math.min(step + 1, 22));
    }
    const nextStep = Math.min(step + 1, 22);
    setStep(nextStep);
    setSearchParams({ step: nextStep.toString() });
  };

  const handlePrevStep = () => {
    const prevStep = Math.max(step - 1, 1);
    setStep(prevStep);
    setSearchParams({ step: prevStep.toString() });
  };

  // Step 1: Save System Preferences
  const handleSaveSystemPrefs = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.patch('/api/schools/settings', {
        language: sysPrefs.language,
        preferredTimezone: sysPrefs.preferredTimezone,
        systemCurrency: sysPrefs.systemCurrency,
        runningSession: sysPrefs.runningSession,
        currentTerm: sysPrefs.currentTerm
      });
      showToast('System preferences saved successfully!', 'success');
      await handleNextStep('system_preferences');
    } catch {
      showToast('Failed to save system preferences.', 'error');
    }
  };

  // Step 2: Save Org Info
  const handleSaveOrgInfo = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.patch('/api/schools/info', {
        phone: orgData.phone,
        address: orgData.address,
        email: orgData.email
      });
      showToast('Organization info updated!', 'success');
      await handleNextStep('org_profile');
    } catch {
      showToast('Failed to update organization info.', 'error');
    }
  };

  // Step 3: Save Branding & Document Templates Header
  const handleSaveBranding = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.patch('/api/schools/settings', {
        motto: brandingData.motto,
        systemEmail: brandingData.systemEmail,
        reportHeader: brandingData.reportHeader
      });
      showToast('Institutional branding & templates updated!', 'success');
      await handleNextStep('branding');
    } catch {
      showToast('Failed to save branding details.', 'error');
    }
  };

  // Step 4: Save Website Preferences
  const handleSaveWebsiteSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.put('/api/website-settings', {
        bannerTitle: websiteData.bannerTitle,
        bannerSubTitleOne: websiteData.bannerSubTitleOne,
        aboutTitle: websiteData.aboutTitle,
        aboutUsContent: websiteData.aboutUsContent,
        directorName: websiteData.directorName,
        directorTitle: websiteData.directorTitle,
        yearOfEstablishment: websiteData.yearOfEstablishment,
        admissionProcedure: websiteData.admissionProcedure
      });
      await api.patch('/api/schools/settings', {
        facebook: websiteData.facebook,
        twitter: websiteData.twitter,
        instagram: websiteData.instagram,
        linkedin: websiteData.linkedin
      });
      showToast('Public website preferences saved successfully!', 'success');
      await handleNextStep('website_setup');
    } catch {
      showToast('Failed to save website preferences.', 'error');
    }
  };

  // Step 5: Save ID Cards & Gate Access Controls
  const handleSaveIdCardSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.patch('/api/schools/settings', {
        gateRequiredType: idCardData.gateRequiredType,
        gateMinPaidAmount: parseFloat(idCardData.gateMinPaidAmount || '0'),
        gateMinPaidPercent: parseFloat(idCardData.gateMinPaidPercent || '0')
      });
      showToast('ID card & gate access settings saved!', 'success');
      await handleNextStep('id_cards_setup');
    } catch {
      showToast('Failed to save ID card settings.', 'error');
    }
  };

  // Step 6: Add Staff
  const handleQuickAddStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!staffData.name || !staffData.email) return;
    try {
      await api.post('/api/users', {
        name: staffData.name,
        email: staffData.email,
        role: staffData.role,
        password: 'Password123!'
      });
      showToast(`Invited ${staffData.role} account for ${staffData.name}!`, 'success');
      setStaffData({ name: '', email: '', role: 'BURSAR' });
      await refreshSetupStatus();
    } catch {
      showToast('Failed to add staff member.', 'error');
    }
  };

  // Step 7: Seed COA
  const handleSeedCOAAction = async () => {
    const success = await seedCOA();
    if (success) {
      showToast('Chart of Accounts successfully seeded with 35 standard accounts!', 'success');
      await updateStage('chart_of_accounts', true);
    } else {
      showToast('Failed to seed Chart of Accounts.', 'error');
    }
  };

  // Step 8: Add Department
  const handleAddDepartment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!deptName) return;
    try {
      await api.post('/api/departments', { name: deptName, deptCode: deptCode || undefined });
      showToast(`Created Department "${deptName}"!`, 'success');
      setDeptName('');
      setDeptCode('');
      api.get('/api/departments').then(res => setDeptList(Array.isArray(res.data) ? res.data : []));
      await refreshSetupStatus();
    } catch {
      showToast('Failed to add department.', 'error');
    }
  };

  // Step 9: Add Subject
  const handleAddSubject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subjectName) return;
    try {
      await api.post('/api/subjects', {
        name: subjectName,
        code: subjectCode || undefined,
        departmentId: subjectDeptId || undefined
      });
      showToast(`Created Subject "${subjectName}"!`, 'success');
      setSubjectName('');
      setSubjectCode('');
      await refreshSetupStatus();
    } catch {
      showToast('Failed to add subject.', 'error');
    }
  };

  // Step 10: Add Class
  const handleQuickAddClass = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!className) return;
    try {
      await api.post('/api/classes', { name: className, level: classLevel });
      showToast(`Created class "${className}"!`, 'success');
      setClassName('');
      await refreshSetupStatus();
    } catch {
      showToast('Failed to create class.', 'error');
    }
  };

  // Step 11: Add Grade Boundary & Seed Defaults
  const handleAddGradeBoundary = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/api/grading', [
        {
          grade: gradeForm.grade,
          minScore: parseFloat(gradeForm.minScore),
          maxScore: parseFloat(gradeForm.maxScore),
          status: gradeForm.status
        }
      ]);
      showToast(`Added Grade "${gradeForm.grade}" (${gradeForm.minScore}% - ${gradeForm.maxScore}%)!`, 'success');
      await refreshSetupStatus();
    } catch {
      showToast('Failed to save grade boundary.', 'error');
    }
  };

  const handleSeedDefaultGrading = async () => {
    try {
      await api.post('/api/grading', [
        { grade: 'A', minScore: 80, maxScore: 100, status: 'DISTINCTION' },
        { grade: 'B', minScore: 70, maxScore: 79, status: 'MERIT' },
        { grade: 'C', minScore: 60, maxScore: 69, status: 'CREDIT' },
        { grade: 'D', minScore: 50, maxScore: 59, status: 'PASS' },
        { grade: 'F', minScore: 0, maxScore: 49, status: 'FAIL' }
      ]);
      showToast('Seeded standard 5-point grading scale (A-F)!', 'success');
      await refreshSetupStatus();
    } catch {
      showToast('Failed to seed default grading scale.', 'error');
    }
  };

  // Step 12: Add Fee Group
  const handleQuickAddFee = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!feeTitle || !feeAmount || !feeBillingType) return;
    try {
      await api.post('/api/fees/groups', {
        name: feeTitle,
        amount: parseFloat(feeAmount),
        billingType: feeBillingType,
        year: new Date().getFullYear(),
        isRecurring: false,
        remindersEnabled: true,
        ...(feeIncomeAccountId ? { incomeAccountId: feeIncomeAccountId } : {}),
        ...(feeArAccountId ? { arAccountId: feeArAccountId } : {})
      });
      showToast(`Created Fee Group "${feeTitle}"!`, 'success');
      setFeeTitle('');
      setFeeAmount('');
      setFeeBillingType('Termly');
      setFeeIncomeAccountId('');
      setFeeArAccountId('');
      await refreshSetupStatus();
    } catch {
      showToast('Failed to add fee group.', 'error');
    }
  };

  // Step 14: Transportation Routes & Vehicles
  const handleAddTransportRoute = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!routeName) return;
    try {
      await api.post('/api/transport-routes', { name: routeName, description: routeDesc });
      showToast(`Created Transport Route "${routeName}"!`, 'success');
      setRouteName('');
      setRouteDesc('');
      await refreshSetupStatus();
    } catch {
      showToast('Failed to create transport route.', 'error');
    }
  };

  const handleAddVehicle = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!vehicleName || !vehicleNumber) return;
    try {
      await api.post('/api/vehicles', {
        name: vehicleName,
        number: vehicleNumber,
        model: vehicleModel,
        driverName,
        driverContact
      });
      showToast(`Registered Vehicle "${vehicleName}" (${vehicleNumber})!`, 'success');
      setVehicleName('');
      setVehicleNumber('');
      setVehicleModel('');
      setDriverName('');
      setDriverContact('');
      await refreshSetupStatus();
    } catch {
      showToast('Failed to register vehicle.', 'error');
    }
  };

  // Step 15: Boarding Hostels & Rooms
  const handleAddHostelCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!hostelCatName) return;
    try {
      await api.post('/api/ancillary/hostel-categories', { name: hostelCatName, description: hostelCatDesc });
      showToast(`Created Hostel Category "${hostelCatName}"!`, 'success');
      setHostelCatName('');
      setHostelCatDesc('');
      await refreshSetupStatus();
    } catch {
      showToast('Failed to create hostel category.', 'error');
    }
  };

  const handleAddHostelRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!roomName) return;
    try {
      await api.post('/api/ancillary/hostel-rooms', {
        name: roomName,
        numberOfBeds: parseInt(roomBeds, 10),
        cost: parseFloat(roomCost),
        type: 'Dormitory'
      });
      showToast(`Created Hostel Room "${roomName}"!`, 'success');
      setRoomName('');
      await refreshSetupStatus();
    } catch {
      showToast('Failed to create hostel room.', 'error');
    }
  };

  // Step 16: Asset Registry
  const handleAddAsset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!assetName) return;
    try {
      await api.post('/api/assets', {
        name: assetName,
        category: assetCategory,
        serialNumber: assetSerial || undefined,
        location: assetLocation || undefined,
        purchasePrice: assetPrice ? parseFloat(assetPrice) : undefined,
        condition: 'good'
      });
      showToast(`Registered Asset "${assetName}"!`, 'success');
      setAssetName('');
      setAssetSerial('');
      setAssetLocation('');
      setAssetPrice('');
      await refreshSetupStatus();
    } catch {
      showToast('Failed to register asset.', 'error');
    }
  };

  // Step 17: Add Sport & House
  const handleAddSport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sportName) return;
    try {
      await api.post('/api/schools/sports-list', { name: sportName, category: sportCategory });
      showToast(`Added Sport "${sportName}"!`, 'success');
      setSportName('');
      await refreshSetupStatus();
    } catch {
      showToast('Failed to add sport.', 'error');
    }
  };

  const handleAddHouse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!houseName) return;
    try {
      await api.post('/api/schools/houses', { name: houseName, color: houseColor });
      showToast(`Created House "${houseName}"!`, 'success');
      setHouseName('');
      await refreshSetupStatus();
    } catch {
      showToast('Failed to add student house.', 'error');
    }
  };

  // Step 18: Add Student Club
  const handleAddClub = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clubName) return;
    try {
      await api.post('/api/schools/clubs', { name: clubName, category: clubCategory });
      showToast(`Created Student Club "${clubName}"!`, 'success');
      setClubName('');
      await refreshSetupStatus();
    } catch {
      showToast('Failed to add student club.', 'error');
    }
  };

  // Step 19: Add Uniform Item
  const handleQuickAddUniform = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uniformName || !uniformPrice) return;
    try {
      await api.post('/api/uniforms/items', {
        name: uniformName,
        sellingPrice: parseFloat(uniformPrice),
        costPrice: parseFloat(uniformPrice) * 0.7
      });
      showToast(`Created uniform item "${uniformName}"!`, 'success');
      setUniformName('');
      setUniformPrice('');
      await refreshSetupStatus();
    } catch {
      showToast('Failed to add uniform item.', 'error');
    }
  };

  // Step 20: Add Pharmacy Item
  const handleQuickAddPharmacy = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!medName || !medQty) return;
    try {
      await api.post('/api/clinic/pharmacy/inventory', {
        name: medName,
        stock: parseInt(medQty, 10),
        unitPrice: 5.00
      });
      showToast(`Added ${medQty} units of "${medName}" to pharmacy!`, 'success');
      setMedName('');
      setMedQty('');
      await refreshSetupStatus();
    } catch {
      showToast('Failed to add medicine stock.', 'error');
    }
  };

  // Step 21: Save Document & Certificate Templates Branding
  const handleSaveDocumentBranding = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const formData = new FormData();
      formData.append('config', JSON.stringify({
        receiptPrefix: docBranding.receiptPrefix,
        invoiceDesign: docBranding.invoiceDesign,
        certTitle: docBranding.certTitle
      }));
      await api.post('/api/reports/template', formData);
      await api.patch('/api/schools/settings', {
        mandatoryReceipts: docBranding.mandatoryReceipts,
        showBalanceOnReceipts: docBranding.showBalanceOnReceipts
      });
      showToast('Document template branding saved successfully!', 'success');
      await handleNextStep('document_branding');
    } catch {
      showToast('Failed to save document branding.', 'error');
    }
  };

  const stepList = [
    { s: 1, label: 'Preferences', key: 'system_preferences' },
    { s: 2, label: 'Org Profile', key: 'org_profile' },
    { s: 3, label: 'Branding & Templates', key: 'branding', hidden: enabledModules.branding === false },
    { s: 4, label: 'Website & Public Portal', key: 'website_setup', hidden: enabledModules.website === false },
    { s: 5, label: 'ID Cards & Gate Passes', key: 'id_cards_setup', hidden: enabledModules.id_cards === false },
    { s: 6, label: 'Admin & Staff', key: 'roles_staff' },
    { s: 7, label: 'Chart of Accounts', key: 'chart_of_accounts', hidden: enabledModules.accounting === false },
    { s: 8, label: 'Departments', key: 'departments', hidden: enabledModules.academic === false },
    { s: 9, label: 'Subjects', key: 'subjects', hidden: enabledModules.academic === false },
    { s: 10, label: 'Classes', key: 'academic_structure', hidden: enabledModules.academic === false },
    { s: 11, label: 'Grading Policy', key: 'grading_setup', hidden: enabledModules.grading === false && enabledModules.academic === false },
    { s: 12, label: 'Fee Structure', key: 'fee_structure', hidden: enabledModules.academic === false || enabledModules.fees === false },
    { s: 13, label: 'Students', key: 'students_staff', hidden: enabledModules.academic === false },
    { s: 14, label: 'Transportation', key: 'transport_setup', hidden: !enabledModules.transportation },
    { s: 15, label: 'Hostels & Boarding', key: 'boarding_setup', hidden: !enabledModules.boarding },
    { s: 16, label: 'Asset Governance', key: 'asset_setup', hidden: !enabledModules.assets },
    { s: 17, label: 'Sports & Houses', key: 'sports_houses', hidden: enabledModules.academic === false },
    { s: 18, label: 'Clubs & Societies', key: 'clubs_setup', hidden: !enabledModules.clubs },
    { s: 19, label: 'Uniforms', key: 'uniform_setup', hidden: !enabledModules.uniforms },
    { s: 20, label: 'Clinic', key: 'clinic_setup', hidden: !enabledModules.clinic },
    { s: 21, label: 'Doc Templates & Certs', key: 'document_branding', hidden: enabledModules.document_branding === false },
    { s: 22, label: 'Go-Live Review', key: 'review_golive' }
  ].filter(item => !item.hidden);

  return (
    <>
      <div className="portal-page-header">
        <div>
          <h1>Guided Institutional Setup Wizard</h1>
          <p>Complete all mandatory steps to initialize your institution for live operation.</p>
        </div>
        <div className="portal-flex-gap-10">
          <button className="portal-btn-secondary" onClick={() => navigate('/admin/dashboard')}>
            <i className="fas fa-arrow-left portal-mr-6"></i>Return to Dashboard
          </button>
        </div>
      </div>

      {/* Module Enable / Disable Selector */}
      <div className="portal-card portal-card-mb20">
        <div className="portal-card-header">
          <h2><i className="fas fa-cubes portal-icon-primary"></i>Active Tenant Module Configuration</h2>
        </div>
        <div className="portal-card-body">
          <p className="portal-text-muted-sm portal-mb-12">
            Toggle modules relevant to your institution. Irrelevant setup steps will automatically adjust.
          </p>
          <div className="portal-flex-wrap-16">
            <label htmlFor="mod-academic" className="portal-checkbox-label">
              <input id="mod-academic" type="checkbox" checked={enabledModules.academic} onChange={() => handleModuleToggle('academic')} />
              <i className="fas fa-graduation-cap text-primary"></i> Academic & Students
            </label>
            <label htmlFor="mod-accounting" className="portal-checkbox-label">
              <input id="mod-accounting" type="checkbox" checked={enabledModules.accounting} onChange={() => handleModuleToggle('accounting')} />
              <i className="fas fa-book-journal-whills text-success"></i> Ledger & Accounting
            </label>
            <label htmlFor="mod-fees" className="portal-checkbox-label">
              <input id="mod-fees" type="checkbox" checked={enabledModules.fees} onChange={() => handleModuleToggle('fees')} />
              <i className="fas fa-file-invoice-dollar text-warning"></i> Student Fee Billing
            </label>
            <label htmlFor="mod-branding" className="portal-checkbox-label">
              <input id="mod-branding" type="checkbox" checked={enabledModules.branding !== false} onChange={() => handleModuleToggle('branding')} />
              <i className="fas fa-paint-brush text-primary"></i> Branding & Header Templates
            </label>
            <label htmlFor="mod-website" className="portal-checkbox-label">
              <input id="mod-website" type="checkbox" checked={enabledModules.website !== false} onChange={() => handleModuleToggle('website')} />
              <i className="fas fa-globe text-info"></i> Public Website & Landing Portal
            </label>
            <label htmlFor="mod-id-cards" className="portal-checkbox-label">
              <input id="mod-id-cards" type="checkbox" checked={enabledModules.id_cards !== false} onChange={() => handleModuleToggle('id_cards')} />
              <i className="fas fa-id-card text-primary"></i> Student & Staff ID Cards
            </label>
            <label htmlFor="mod-doc-branding" className="portal-checkbox-label">
              <input id="mod-doc-branding" type="checkbox" checked={enabledModules.document_branding !== false} onChange={() => handleModuleToggle('document_branding')} />
              <i className="fas fa-file-signature text-warning"></i> Receipts & Certificate Templates
            </label>
            <label htmlFor="mod-grading" className="portal-checkbox-label">
              <input id="mod-grading" type="checkbox" checked={enabledModules.grading !== false} onChange={() => handleModuleToggle('grading')} />
              <i className="fas fa-chart-bar text-info"></i> Grading Policy & Mark Bands
            </label>
            <label htmlFor="mod-transportation" className="portal-checkbox-label">
              <input id="mod-transportation" type="checkbox" checked={!!enabledModules.transportation} onChange={() => handleModuleToggle('transportation')} />
              <i className="fas fa-bus text-warning"></i> Bus Fleet & Routes
            </label>
            <label htmlFor="mod-boarding" className="portal-checkbox-label">
              <input id="mod-boarding" type="checkbox" checked={!!enabledModules.boarding} onChange={() => handleModuleToggle('boarding')} />
              <i className="fas fa-hotel text-danger"></i> Hostels & Boarding
            </label>
            <label htmlFor="mod-assets" className="portal-checkbox-label">
              <input id="mod-assets" type="checkbox" checked={!!enabledModules.assets} onChange={() => handleModuleToggle('assets')} />
              <i className="fas fa-boxes text-success"></i> Asset Governance
            </label>
            <label htmlFor="mod-clubs" className="portal-checkbox-label">
              <input id="mod-clubs" type="checkbox" checked={!!enabledModules.clubs} onChange={() => handleModuleToggle('clubs')} />
              <i className="fas fa-users-slash text-primary"></i> Clubs & Societies
            </label>
            <label htmlFor="mod-uniforms" className="portal-checkbox-label">
              <input id="mod-uniforms" type="checkbox" checked={enabledModules.uniforms} onChange={() => handleModuleToggle('uniforms')} />
              <i className="fas fa-tshirt text-info"></i> Uniform Store & Inventory
            </label>
            <label htmlFor="mod-clinic" className="portal-checkbox-label">
              <input id="mod-clinic" type="checkbox" checked={enabledModules.clinic} onChange={() => handleModuleToggle('clinic')} />
              <i className="fas fa-notes-medical text-danger"></i> Infirmary & Clinic
            </label>
          </div>
        </div>
      </div>

      {/* Step Indicator Navigation */}
      <div className="portal-card portal-card-mb20 portal-p-16-20">
        <div className="portal-wizard-nav-wrap">
          {stepList.map((stItem) => {
            const isCurrent = step === stItem.s;
            const isDone = completedStages[stItem.key];
            return (
              <button
                key={stItem.s}
                onClick={() => { setStep(stItem.s); setSearchParams({ step: stItem.s.toString() }); }}
                className={`portal-wizard-step-btn ${isCurrent ? 'current' : isDone ? 'done' : 'pending'}`}
              >
                {isDone ? <i className="fas fa-check-circle text-success"></i> : <span>{stItem.s}.</span>}
                {stItem.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Step Content Container */}
      <div className="portal-card portal-min-h-400">
        {/* Step 1: System Preferences & Localization */}
        {step === 1 && (
          <div>
            <div className="portal-card-header">
              <h2><i className="fas fa-globe portal-icon-primary"></i>Step 1: System Preferences & Localization</h2>
            </div>
            <div className="portal-card-body">
              <p className="portal-text-muted-sm portal-mb-16">
                Configure mandatory default language, timezone, base currency, and current academic period.
              </p>
              <form onSubmit={handleSaveSystemPrefs} className="portal-card portal-wizard-form-box">
                <div className="portal-wizard-form-grid">
                  <div>
                    <label htmlFor="pref-lang" className="portal-label-bold-sm">System Language *</label>
                    <select id="pref-lang" className="portal-input" value={sysPrefs.language} onChange={e => setSysPrefs({ ...sysPrefs, language: e.target.value })} required>
                      <option value="en">English</option>
                      <option value="fr">French</option>
                      <option value="es">Spanish</option>
                      <option value="nd">Ndebele</option>
                      <option value="sn">Shona</option>
                    </select>
                  </div>
                  <div>
                    <label htmlFor="pref-timezone" className="portal-label-bold-sm">Timezone *</label>
                    <select id="pref-timezone" className="portal-input" value={sysPrefs.preferredTimezone} onChange={e => setSysPrefs({ ...sysPrefs, preferredTimezone: e.target.value })} required>
                      <option value="Africa/Harare">Africa/Harare (CAT, UTC+2)</option>
                      <option value="Africa/Johannesburg">Africa/Johannesburg (SAST, UTC+2)</option>
                      <option value="UTC">UTC (Greenwich Mean Time)</option>
                    </select>
                  </div>
                  <div>
                    <label htmlFor="pref-currency" className="portal-label-bold-sm">System Currency *</label>
                    <input id="pref-currency" type="text" className="portal-input" value={sysPrefs.systemCurrency} onChange={e => setSysPrefs({ ...sysPrefs, systemCurrency: e.target.value })} required />
                  </div>
                  <div>
                    <label htmlFor="pref-session" className="portal-label-bold-sm">Academic Session / Year *</label>
                    <select id="pref-session" className="portal-input" value={sysPrefs.runningSession} onChange={e => setSysPrefs({ ...sysPrefs, runningSession: e.target.value })} required>
                      {[
                        `${new Date().getFullYear() - 1}-${new Date().getFullYear()}`,
                        `${new Date().getFullYear()}-${new Date().getFullYear() + 1}`,
                        `${new Date().getFullYear() + 1}-${new Date().getFullYear() + 2}`
                      ].map(y => (
                        <option key={y} value={y}>{y}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label htmlFor="pref-term" className="portal-label-bold-sm">Current Academic Period *</label>
                    <select id="pref-term" className="portal-input" value={sysPrefs.currentTerm} onChange={e => setSysPrefs({ ...sysPrefs, currentTerm: e.target.value })} required>
                      <option value="Term 1">Term 1</option>
                      <option value="Term 2">Term 2</option>
                      <option value="Term 3">Term 3</option>
                      <option value="Semester 1">Semester 1</option>
                      <option value="Semester 2">Semester 2</option>
                    </select>
                  </div>
                </div>
                <div style={{ marginTop: '16px', display: 'flex', justifyContent: 'flex-end' }}>
                  <button type="submit" className="portal-btn-primary">
                    Save Preferences & Next <i className="fas fa-arrow-right portal-ml-6"></i>
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Step 2: Org Profile */}
        {step === 2 && (
          <div>
            <div className="portal-card-header">
              <h2><i className="fas fa-university portal-icon-primary"></i>Step 2: Organization Profile & Contact Info</h2>
            </div>
            <div className="portal-card-body">
              <form onSubmit={handleSaveOrgInfo} className="portal-card portal-wizard-form-box">
                <div className="portal-wizard-form-grid">
                  <div>
                    <label htmlFor="org-name" className="portal-label-bold-sm">School Name</label>
                    <input id="org-name" type="text" className="portal-input" value={orgData.name} onChange={e => setOrgData({ ...orgData, name: e.target.value })} required />
                  </div>
                  <div>
                    <label htmlFor="org-type" className="portal-label-bold-sm">Institution Type</label>
                    <select id="org-type" className="portal-input" value={orgData.type} onChange={e => setOrgData({ ...orgData, type: e.target.value })}>
                      <option value="primary">Primary School</option>
                      <option value="secondary">Secondary School</option>
                      <option value="tertiary">Polytechnic / University</option>
                      <option value="mission">Mission / Clinic Center</option>
                    </select>
                  </div>
                  <div>
                    <label htmlFor="org-email" className="portal-label-bold-sm">Official Email</label>
                    <input id="org-email" type="email" className="portal-input" placeholder="admin@school.com" value={orgData.email} onChange={e => setOrgData({ ...orgData, email: e.target.value })} />
                  </div>
                  <div>
                    <label htmlFor="org-phone" className="portal-label-bold-sm">Contact Phone</label>
                    <input id="org-phone" type="text" className="portal-input" placeholder="+263..." value={orgData.phone} onChange={e => setOrgData({ ...orgData, phone: e.target.value })} />
                  </div>
                  <div style={{ gridColumn: 'span 2' }}>
                    <label htmlFor="org-address" className="portal-label-bold-sm">Physical Address</label>
                    <input id="org-address" type="text" className="portal-input" placeholder="Street / Location" value={orgData.address} onChange={e => setOrgData({ ...orgData, address: e.target.value })} />
                  </div>
                </div>
                <div style={{ marginTop: '16px', display: 'flex', justifyContent: 'flex-end' }}>
                  <button type="submit" className="portal-btn-primary">
                    Save Profile & Next <i className="fas fa-arrow-right portal-ml-6"></i>
                  </button>
                </div>
              </form>
              <div className="portal-wizard-nav-footer">
                <button className="portal-btn-secondary" onClick={handlePrevStep}>Back</button>
              </div>
            </div>
          </div>
        )}

        {/* Step 3: School Branding & Document Templates */}
        {step === 3 && (
          <div>
            <div className="portal-card-header">
              <h2><i className="fas fa-paint-brush portal-icon-primary"></i>Step 3: School Branding & Header Templates</h2>
            </div>
            <div className="portal-card-body">
              <p className="portal-text-muted-sm portal-mb-16">
                Configure your institution's motto, official correspondence email, and report card letterhead title.
              </p>
              <form onSubmit={handleSaveBranding} className="portal-card portal-wizard-form-box">
                <div className="portal-wizard-form-grid">
                  <div style={{ gridColumn: 'span 2' }}>
                    <label htmlFor="brand-motto" className="portal-label-bold-sm">School Motto / Tagline</label>
                    <input id="brand-motto" type="text" className="portal-input" placeholder="e.g. Strive for Excellence and Integrity" value={brandingData.motto} onChange={e => setBrandingData({ ...brandingData, motto: e.target.value })} />
                  </div>
                  <div>
                    <label htmlFor="brand-email" className="portal-label-bold-sm">Correspondence Email</label>
                    <input id="brand-email" type="email" className="portal-input" placeholder="info@school.com" value={brandingData.systemEmail} onChange={e => setBrandingData({ ...brandingData, systemEmail: e.target.value })} />
                  </div>
                  <div>
                    <label htmlFor="brand-header" className="portal-label-bold-sm">Report Card Letterhead Header</label>
                    <input id="brand-header" type="text" className="portal-input" placeholder="e.g. ACADEX HIGH SCHOOL - OFFICIAL TRANSCRIPT" value={brandingData.reportHeader} onChange={e => setBrandingData({ ...brandingData, reportHeader: e.target.value })} />
                  </div>
                </div>
                <div style={{ marginTop: '16px', display: 'flex', justifyContent: 'flex-end' }}>
                  <button type="submit" className="portal-btn-primary">
                    Save Branding & Next <i className="fas fa-arrow-right portal-ml-6"></i>
                  </button>
                </div>
              </form>
              <div className="portal-wizard-nav-footer">
                <button className="portal-btn-secondary" onClick={handlePrevStep}>Back</button>
              </div>
            </div>
          </div>
        )}

        {/* Step 4: Public Website & Landing Page Preferences */}
        {step === 4 && (
          <div>
            <div className="portal-card-header">
              <h2><i className="fas fa-globe portal-icon-primary"></i>Step 4: Public Website & Landing Page Preferences</h2>
            </div>
            <div className="portal-card-body">
              <p className="portal-text-muted-sm portal-mb-16">
                Configure website headline, Headmaster's message, establishment year, and official social media handles for your public web portal.
              </p>
              <form onSubmit={handleSaveWebsiteSettings} className="portal-card portal-wizard-form-box">
                <div className="portal-wizard-form-grid">
                  <div style={{ gridColumn: 'span 2' }}>
                    <label htmlFor="web-banner-title" className="portal-label-bold-sm">Website Main Banner Headline</label>
                    <input id="web-banner-title" type="text" className="portal-input" placeholder="Welcome to Acadex High School" value={websiteData.bannerTitle} onChange={e => setWebsiteData({ ...websiteData, bannerTitle: e.target.value })} />
                  </div>
                  <div>
                    <label htmlFor="web-director-name" className="portal-label-bold-sm">Headmaster / Principal Name</label>
                    <input id="web-director-name" type="text" className="portal-input" placeholder="Dr. A. Moyo" value={websiteData.directorName} onChange={e => setWebsiteData({ ...websiteData, directorName: e.target.value })} />
                  </div>
                  <div>
                    <label htmlFor="web-year-est" className="portal-label-bold-sm">Year Established</label>
                    <input id="web-year-est" type="text" className="portal-input" placeholder="1995" value={websiteData.yearOfEstablishment} onChange={e => setWebsiteData({ ...websiteData, yearOfEstablishment: e.target.value })} />
                  </div>
                  <div style={{ gridColumn: 'span 2' }}>
                    <label htmlFor="web-about-content" className="portal-label-bold-sm">About Us & Principal's Welcome Message</label>
                    <textarea id="web-about-content" className="portal-input" rows={3} placeholder="Our institution is committed to holistic academic excellence..." value={websiteData.aboutUsContent} onChange={e => setWebsiteData({ ...websiteData, aboutUsContent: e.target.value })} />
                  </div>
                  <div>
                    <label htmlFor="web-fb" className="portal-label-bold-sm">Facebook Page URL</label>
                    <input id="web-fb" type="text" className="portal-input" placeholder="https://facebook.com/myschool" value={websiteData.facebook} onChange={e => setWebsiteData({ ...websiteData, facebook: e.target.value })} />
                  </div>
                  <div>
                    <label htmlFor="web-twitter" className="portal-label-bold-sm">Twitter / X Handle</label>
                    <input id="web-twitter" type="text" className="portal-input" placeholder="https://x.com/myschool" value={websiteData.twitter} onChange={e => setWebsiteData({ ...websiteData, twitter: e.target.value })} />
                  </div>
                  <div style={{ gridColumn: 'span 2' }}>
                    <label htmlFor="web-admission-proc" className="portal-label-bold-sm">Public Online Admission Guidelines</label>
                    <input id="web-admission-proc" type="text" className="portal-input" placeholder="Submit Form 1 application with birth certificate & Grade 7 results..." value={websiteData.admissionProcedure} onChange={e => setWebsiteData({ ...websiteData, admissionProcedure: e.target.value })} />
                  </div>
                </div>
                <div style={{ marginTop: '16px', display: 'flex', justifyContent: 'flex-end' }}>
                  <button type="submit" className="portal-btn-primary">
                    Save Website Settings & Next <i className="fas fa-arrow-right portal-ml-6"></i>
                  </button>
                </div>
              </form>
              <div className="portal-wizard-nav-footer">
                <button className="portal-btn-secondary" onClick={handlePrevStep}>Back</button>
              </div>
            </div>
          </div>
        )}

        {/* Step 5: Student & Staff ID Cards Setup */}
        {step === 5 && (
          <div>
            <div className="portal-card-header">
              <h2><i className="fas fa-id-card portal-icon-primary"></i>Step 5: Student & Staff ID Cards & Gate Access Controls</h2>
            </div>
            <div className="portal-card-body">
              <p className="portal-text-muted-sm portal-mb-16">
                Configure automated gate entry clearance, QR barcode verification, and payment thresholds for student ID cards.
              </p>
              <form onSubmit={handleSaveIdCardSettings} className="portal-card portal-wizard-form-box">
                <div className="portal-wizard-form-grid">
                  <div>
                    <label htmlFor="gate-req-type" className="portal-label-bold-sm">Automated Gate Access Rule *</label>
                    <select id="gate-req-type" className="portal-input" value={idCardData.gateRequiredType} onChange={e => setIdCardData({ ...idCardData, gateRequiredType: e.target.value })}>
                      <option value="none">Allow All Active Students (No Fee Barrier)</option>
                      <option value="percent">Require Minimum Paid Percentage (%)</option>
                      <option value="amount">Require Fixed Minimum Amount Paid ($)</option>
                    </select>
                  </div>
                  {idCardData.gateRequiredType === 'percent' && (
                    <div>
                      <label htmlFor="gate-min-percent" className="portal-label-bold-sm">Min Required Paid Fee (%)</label>
                      <input id="gate-min-percent" type="number" className="portal-input" placeholder="50" value={idCardData.gateMinPaidPercent} onChange={e => setIdCardData({ ...idCardData, gateMinPaidPercent: e.target.value })} />
                    </div>
                  )}
                  {idCardData.gateRequiredType === 'amount' && (
                    <div>
                      <label htmlFor="gate-min-amount" className="portal-label-bold-sm">Min Required Paid Fee ($)</label>
                      <input id="gate-min-amount" type="number" className="portal-input" placeholder="200" value={idCardData.gateMinPaidAmount} onChange={e => setIdCardData({ ...idCardData, gateMinPaidAmount: e.target.value })} />
                    </div>
                  )}
                </div>
                <div style={{ marginTop: '20px', padding: '16px', background: '#f8fafc', borderRadius: '12px', border: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <h4 style={{ margin: 0 }}><i className="fas fa-crop-alt text-primary portal-mr-6"></i>Visual Card Layout & Custom Background Templates</h4>
                    <p className="portal-text-muted-sm" style={{ margin: '4px 0 0' }}>Upload front/back face images or pick built-in preset card themes in Document Templates.</p>
                  </div>
                  <button type="button" className="portal-btn-secondary" onClick={() => navigate('/admin/document-templates?tab=id-cards')}>
                    <i className="fas fa-external-link-alt portal-mr-6"></i>Open Card Designer Studio
                  </button>
                </div>
                <div style={{ marginTop: '16px', display: 'flex', justifyContent: 'flex-end' }}>
                  <button type="submit" className="portal-btn-primary">
                    Save ID Card Controls & Next <i className="fas fa-arrow-right portal-ml-6"></i>
                  </button>
                </div>
              </form>
              <div className="portal-wizard-nav-footer">
                <button className="portal-btn-secondary" onClick={handlePrevStep}>Back</button>
              </div>
            </div>
          </div>
        )}

        {/* Step 6: Roles & Staff */}
        {step === 6 && (
          <div>
            <div className="portal-card-header">
              <h2><i className="fas fa-users-cog portal-icon-primary"></i>Step 6: Staff & Key Roles Setup</h2>
            </div>
            <div className="portal-card-body">
              <form onSubmit={handleQuickAddStaff} className="portal-card portal-wizard-form-box">
                <div className="portal-wizard-form-grid">
                  <div>
                    <label htmlFor="staff-name" className="portal-label-bold-sm">Staff Name</label>
                    <input id="staff-name" type="text" className="portal-input" placeholder="Full Name" value={staffData.name} onChange={e => setStaffData({ ...staffData, name: e.target.value })} required />
                  </div>
                  <div>
                    <label htmlFor="staff-email" className="portal-label-bold-sm">Email</label>
                    <input id="staff-email" type="email" className="portal-input" placeholder="staff@school.com" value={staffData.email} onChange={e => setStaffData({ ...staffData, email: e.target.value })} required />
                  </div>
                  <div>
                    <label htmlFor="staff-role" className="portal-label-bold-sm">Role</label>
                    <select id="staff-role" className="portal-input" value={staffData.role} onChange={e => setStaffData({ ...staffData, role: e.target.value })}>
                      <option value="BURSAR">Bursar</option>
                      <option value="CLINIC">Nurse/Clinic</option>
                      <option value="TEACHER">Teacher</option>
                      <option value="LIBRARIAN">Librarian</option>
                      <option value="ANCILLARY">Ancillary Staff</option>
                      <option value="SCHOOL_ADMIN">Admin</option>
                    </select>
                  </div>
                  <button type="submit" className="portal-btn-primary" style={{ alignSelf: 'flex-end' }}>
                    <i className="fas fa-user-plus portal-mr-6"></i>Invite Staff
                  </button>
                </div>
              </form>
              <div className="portal-stat-card portal-stat-card-blue">
                <i className="fas fa-user-check fa-2x text-primary portal-mr-16"></i>
                <div>
                  <h4>Registered Staff Members ({counts.staff})</h4>
                </div>
              </div>
              <div className="portal-wizard-nav-footer">
                <button className="portal-btn-secondary" onClick={handlePrevStep}>Back</button>
                <button className="portal-btn-primary" onClick={() => handleNextStep('roles_staff')}>
                  Continue to Chart of Accounts <i className="fas fa-arrow-right portal-ml-6"></i>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Step 7: Chart of Accounts */}
        {step === 7 && (
          <div>
            <div className="portal-card-header">
              <h2><i className="fas fa-book-journal-whills portal-icon-primary"></i>Step 7: Chart of Accounts (COA)</h2>
            </div>
            <div className="portal-card-body">
              <p className="portal-text-body-md">
                Income and receivable accounts must exist before student fee billing or uniform sales can be processed.
              </p>
              {counts.coa > 0 ? (
                <div className="portal-card portal-coa-box-active">
                  <div className="portal-flex-center-gap16">
                    <i className="fas fa-check-circle fa-3x text-success"></i>
                    <div>
                      <h3 className="portal-coa-active-title">Chart of Accounts Active ({counts.coa} Accounts)</h3>
                      <p className="portal-coa-active-desc">Ledger accounts are ready for billing and transactions.</p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="portal-card portal-coa-box-pending">
                  <h3 className="portal-coa-pending-title">No Accounts Configured Yet</h3>
                  <p className="portal-coa-pending-desc">Seed our standard 35-account Chart of Accounts optimized for schools.</p>
                  <button className="portal-btn-primary" onClick={handleSeedCOAAction}>
                    <i className="fas fa-seedling portal-mr-6"></i>Seed Default Chart of Accounts Now
                  </button>
                </div>
              )}
              <div className="portal-wizard-nav-footer">
                <button className="portal-btn-secondary" onClick={handlePrevStep}>Back</button>
                <button className="portal-btn-primary" onClick={() => handleNextStep('chart_of_accounts')}>
                  Continue to Departments <i className="fas fa-arrow-right portal-ml-6"></i>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Step 8: Departments */}
        {step === 8 && (
          <div>
            <div className="portal-card-header">
              <h2><i className="fas fa-sitemap portal-icon-primary"></i>Step 8: Academic Departments Setup</h2>
            </div>
            <div className="portal-card-body">
              <p className="portal-text-muted-sm portal-mb-16">
                Create departments (e.g. Science, Mathematics, Languages) to organize subjects and teaching staff.
              </p>
              <form onSubmit={handleAddDepartment} className="portal-card portal-wizard-form-box">
                <div className="portal-wizard-form-grid">
                  <div>
                    <label htmlFor="dept-name" className="portal-label-bold-sm">Department Name *</label>
                    <input id="dept-name" type="text" className="portal-input" placeholder="e.g. Sciences" value={deptName} onChange={e => setDeptName(e.target.value)} required />
                  </div>
                  <div>
                    <label htmlFor="dept-code" className="portal-label-bold-sm">Department Code</label>
                    <input id="dept-code" type="text" className="portal-input" placeholder="e.g. SCI" value={deptCode} onChange={e => setDeptCode(e.target.value)} />
                  </div>
                  <button type="submit" className="portal-btn-primary" style={{ alignSelf: 'flex-end' }}>
                    <i className="fas fa-plus portal-mr-6"></i>Add Department
                  </button>
                </div>
              </form>
              <div className="portal-stat-card">
                <i className="fas fa-building fa-2x text-primary portal-mr-16"></i>
                <div>
                  <h4>Configured Departments ({counts.departments})</h4>
                </div>
              </div>
              <div className="portal-wizard-nav-footer">
                <button className="portal-btn-secondary" onClick={handlePrevStep}>Back</button>
                <button className="portal-btn-primary" onClick={() => handleNextStep('departments')}>
                  Continue to Subjects <i className="fas fa-arrow-right portal-ml-6"></i>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Step 9: Subjects */}
        {step === 9 && (
          <div>
            <div className="portal-card-header">
              <h2><i className="fas fa-book portal-icon-primary"></i>Step 9: Curriculum Subjects Setup</h2>
            </div>
            <div className="portal-card-body">
              <p className="portal-text-muted-sm portal-mb-16">
                Define the subjects taught in your institution (e.g. Mathematics, English, Physics).
              </p>
              <form onSubmit={handleAddSubject} className="portal-card portal-wizard-form-box">
                <div className="portal-wizard-form-grid">
                  <div>
                    <label htmlFor="subj-name" className="portal-label-bold-sm">Subject Name *</label>
                    <input id="subj-name" type="text" className="portal-input" placeholder="e.g. Mathematics" value={subjectName} onChange={e => setSubjectName(e.target.value)} required />
                  </div>
                  <div>
                    <label htmlFor="subj-code" className="portal-label-bold-sm">Subject Code</label>
                    <input id="subj-code" type="text" className="portal-input" placeholder="e.g. MATH101" value={subjectCode} onChange={e => setSubjectCode(e.target.value)} />
                  </div>
                  <div>
                    <label htmlFor="subj-dept" className="portal-label-bold-sm">Department</label>
                    <select id="subj-dept" className="portal-input" value={subjectDeptId} onChange={e => setSubjectDeptId(e.target.value)}>
                      <option value="">-- None --</option>
                      {deptList.map(d => (
                        <option key={d.id} value={d.id}>{d.name}</option>
                      ))}
                    </select>
                  </div>
                  <button type="submit" className="portal-btn-primary" style={{ alignSelf: 'flex-end' }}>
                    <i className="fas fa-plus portal-mr-6"></i>Add Subject
                  </button>
                </div>
              </form>
              <div className="portal-stat-card">
                <i className="fas fa-book-open fa-2x text-primary portal-mr-16"></i>
                <div>
                  <h4>Configured Subjects ({counts.subjects})</h4>
                </div>
              </div>
              <div className="portal-wizard-nav-footer">
                <button className="portal-btn-secondary" onClick={handlePrevStep}>Back</button>
                <button className="portal-btn-primary" onClick={() => handleNextStep('subjects')}>
                  Continue to Academic Classes <i className="fas fa-arrow-right portal-ml-6"></i>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Step 10: Academic Structure */}
        {step === 10 && (
          <div>
            <div className="portal-card-header">
              <h2><i className="fas fa-door-open portal-icon-primary"></i>Step 10: Academic Classes Setup</h2>
            </div>
            <div className="portal-card-body">
              <p className="portal-text-muted-sm portal-mb-16">
                Set up class levels (e.g. Form 1 East, Grade 3 Blue) for student enrollment.
              </p>
              <form onSubmit={handleQuickAddClass} className="portal-card portal-wizard-form-box">
                <div className="portal-wizard-form-grid">
                  <div>
                    <label htmlFor="class-name" className="portal-label-bold-sm">Class Name</label>
                    <input id="class-name" type="text" className="portal-input" placeholder="e.g. Form 1 East" value={className} onChange={e => setClassName(e.target.value)} required />
                  </div>
                  <div>
                    <label htmlFor="class-level" className="portal-label-bold-sm">Grade / Level</label>
                    <select id="class-level" className="portal-input" value={classLevel} onChange={e => setClassLevel(e.target.value)}>
                      <option value="Form 1">Form 1</option>
                      <option value="Form 2">Form 2</option>
                      <option value="Form 3">Form 3</option>
                      <option value="Form 4">Form 4</option>
                      <option value="Lower 6">Lower 6</option>
                      <option value="Upper 6">Upper 6</option>
                    </select>
                  </div>
                  <button type="submit" className="portal-btn-primary" style={{ alignSelf: 'flex-end' }}>
                    <i className="fas fa-plus portal-mr-6"></i>Add Class
                  </button>
                </div>
              </form>
              <div className="portal-stat-card">
                <i className="fas fa-school fa-2x text-primary portal-mr-16"></i>
                <div>
                  <h4>Registered Classes ({counts.classes})</h4>
                </div>
              </div>
              <div className="portal-wizard-nav-footer">
                <button className="portal-btn-secondary" onClick={handlePrevStep}>Back</button>
                <button className="portal-btn-primary" onClick={() => handleNextStep('academic_structure')}>
                  Continue to Grading Policy <i className="fas fa-arrow-right portal-ml-6"></i>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Step 11: Grading Policy & Mark Bands */}
        {step === 11 && (
          <div>
            <div className="portal-card-header">
              <h2><i className="fas fa-chart-bar portal-icon-primary"></i>Step 11: Grading Policy & Mark Bands</h2>
            </div>
            <div className="portal-card-body">
              <p className="portal-text-muted-sm portal-mb-16">
                Configure your institution's grade boundaries (e.g. A: 80-100%, B: 70-79%) for student report cards.
              </p>
              <div className="portal-card portal-p-16-20 portal-mb-16" style={{ background: '#f8fafc' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <h4 style={{ margin: 0 }}>Quick Seed Standard Grading Scale</h4>
                    <p className="portal-text-muted-sm" style={{ margin: '4px 0 0' }}>Automatically seed 5-point scale (A: 80-100, B: 70-79, C: 60-69, D: 50-59, F: 0-49).</p>
                  </div>
                  <button className="portal-btn-primary" onClick={handleSeedDefaultGrading}>
                    <i className="fas fa-magic portal-mr-6"></i>Seed Scale Now
                  </button>
                </div>
              </div>
              <form onSubmit={handleAddGradeBoundary} className="portal-card portal-wizard-form-box">
                <div className="portal-wizard-form-grid">
                  <div>
                    <label htmlFor="grade-lbl" className="portal-label-bold-sm">Grade Symbol *</label>
                    <input id="grade-lbl" type="text" className="portal-input" placeholder="e.g. A+" value={gradeForm.grade} onChange={e => setGradeForm({ ...gradeForm, grade: e.target.value })} required />
                  </div>
                  <div>
                    <label htmlFor="min-score" className="portal-label-bold-sm">Min Score (%) *</label>
                    <input id="min-score" type="number" className="portal-input" placeholder="80" value={gradeForm.minScore} onChange={e => setGradeForm({ ...gradeForm, minScore: e.target.value })} required />
                  </div>
                  <div>
                    <label htmlFor="max-score" className="portal-label-bold-sm">Max Score (%) *</label>
                    <input id="max-score" type="number" className="portal-input" placeholder="100" value={gradeForm.maxScore} onChange={e => setGradeForm({ ...gradeForm, maxScore: e.target.value })} required />
                  </div>
                  <div>
                    <label htmlFor="grade-status" className="portal-label-bold-sm">Remark / Status</label>
                    <select id="grade-status" className="portal-input" value={gradeForm.status} onChange={e => setGradeForm({ ...gradeForm, status: e.target.value })}>
                      <option value="DISTINCTION">DISTINCTION</option>
                      <option value="MERIT">MERIT</option>
                      <option value="CREDIT">CREDIT</option>
                      <option value="PASS">PASS</option>
                      <option value="FAIL">FAIL</option>
                    </select>
                  </div>
                  <button type="submit" className="portal-btn-primary" style={{ alignSelf: 'flex-end' }}>
                    <i className="fas fa-plus portal-mr-6"></i>Add Grade Band
                  </button>
                </div>
              </form>
              <div className="portal-stat-card">
                <i className="fas fa-award fa-2x text-info portal-mr-16"></i>
                <div>
                  <h4>Configured Grade Boundaries ({counts.grading || 0})</h4>
                </div>
              </div>
              <div className="portal-wizard-nav-footer">
                <button className="portal-btn-secondary" onClick={handlePrevStep}>Back</button>
                <button className="portal-btn-primary" onClick={() => handleNextStep('grading_setup')}>
                  Continue to Fee Structure <i className="fas fa-arrow-right portal-ml-6"></i>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Step 12: Fee Structure */}
        {step === 12 && (
          <div>
            <div className="portal-card-header">
              <h2><i className="fas fa-tags portal-icon-primary"></i>Step 12: Student Fee Structure</h2>
            </div>
            <div className="portal-card-body">
              <p className="portal-text-muted-sm portal-mb-16">
                Define fee schedules (e.g. Tuition Fee, Boarding Fee) linked to ledger income accounts.
              </p>
              <form onSubmit={handleQuickAddFee} className="portal-card portal-wizard-form-box">
                <div className="portal-wizard-form-grid">
                  <div>
                    <label htmlFor="fee-title" className="portal-label-bold-sm">Fee Group Name</label>
                    <input id="fee-title" type="text" className="portal-input" placeholder="e.g. Term 1 Tuition Fee" value={feeTitle} onChange={e => setFeeTitle(e.target.value)} required />
                  </div>
                  <div>
                    <label htmlFor="fee-amount" className="portal-label-bold-sm">Default Amount ($)</label>
                    <input id="fee-amount" type="number" className="portal-input" placeholder="e.g. 450" value={feeAmount} onChange={e => setFeeAmount(e.target.value)} required />
                  </div>
                  <div>
                    <label htmlFor="fee-billing-type" className="portal-label-bold-sm">Billing Cycle</label>
                    <select id="fee-billing-type" className="portal-input" value={feeBillingType} onChange={e => setFeeBillingType(e.target.value)} required>
                      <option value="Termly">Termly</option>
                      <option value="Annual">Annual</option>
                      <option value="Monthly">Monthly</option>
                      <option value="Once-off">Once-off</option>
                    </select>
                  </div>
                  <div>
                    <label htmlFor="fee-income-account" className="portal-label-bold-sm">Income Account (Credit)</label>
                    <select id="fee-income-account" className="portal-input" value={feeIncomeAccountId} onChange={e => setFeeIncomeAccountId(e.target.value)}>
                      <option value="">-- Default Income Account --</option>
                      {coaAccounts.filter(a => a.type === 'INCOME' || a.type === 'REVENUE').map(acc => (
                        <option key={acc.id} value={acc.id}>{acc.code} – {acc.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label htmlFor="fee-ar-account" className="portal-label-bold-sm">Receivable Account (Debit)</label>
                    <select id="fee-ar-account" className="portal-input" value={feeArAccountId} onChange={e => setFeeArAccountId(e.target.value)}>
                      <option value="">-- Default AR Account --</option>
                      {coaAccounts.filter(a => a.type === 'ASSET' && (a.name.toLowerCase().includes('receivable') || a.name.toLowerCase().includes('debtor'))).map(acc => (
                        <option key={acc.id} value={acc.id}>{acc.code} – {acc.name}</option>
                      ))}
                    </select>
                  </div>
                  <button type="submit" className="portal-btn-primary" style={{ alignSelf: 'flex-end' }}>
                    <i className="fas fa-plus portal-mr-6"></i>Add Fee Group
                  </button>
                </div>
              </form>
              <div className="portal-stat-card">
                <i className="fas fa-file-invoice-dollar fa-2x text-warning portal-mr-16"></i>
                <div>
                  <h4>Configured Fee Groups ({counts.fees})</h4>
                </div>
              </div>
              <div className="portal-wizard-nav-footer">
                <button className="portal-btn-secondary" onClick={handlePrevStep}>Back</button>
                <button className="portal-btn-primary" onClick={() => handleNextStep('fee_structure')}>
                  Continue to Students <i className="fas fa-arrow-right portal-ml-6"></i>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Step 13: Students */}
        {step === 13 && (
          <div>
            <div className="portal-card-header">
              <h2><i className="fas fa-user-graduate portal-icon-primary"></i>Step 13: Student Enrollment & Roster</h2>
            </div>
            <div className="portal-card-body">
              <div className="portal-grid-2-gap16">
                <div className="portal-card portal-wizard-action-card">
                  <i className="fas fa-file-csv fa-3x text-success portal-mb-12"></i>
                  <h3>Bulk CSV Import</h3>
                  <p className="portal-text-muted-sm">Import student rosters from CSV file.</p>
                  <button className="portal-btn-secondary" onClick={() => navigate('/admin/students')}>
                    <i className="fas fa-upload portal-mr-6"></i>Open Student Roster Tool
                  </button>
                </div>
                <div className="portal-card portal-wizard-action-card">
                  <i className="fas fa-user-plus fa-3x text-primary portal-mb-12"></i>
                  <h3>Direct Student Add</h3>
                  <p className="portal-text-muted-sm">Add individual student records into classes.</p>
                  <button className="portal-btn-primary" onClick={() => navigate('/admin/students')}>
                    <i className="fas fa-plus portal-mr-6"></i>Add Student
                  </button>
                </div>
              </div>
              <div className="portal-stat-card">
                <i className="fas fa-users fa-2x text-primary portal-mr-16"></i>
                <div>
                  <h4>Enrolled Students ({counts.students})</h4>
                </div>
              </div>
              <div className="portal-wizard-nav-footer">
                <button className="portal-btn-secondary" onClick={handlePrevStep}>Back</button>
                <button className="portal-btn-primary" onClick={() => handleNextStep('students_staff')}>
                  Continue to Transportation <i className="fas fa-arrow-right portal-ml-6"></i>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Step 14: Transportation Routes & Fleet */}
        {step === 14 && (
          <div>
            <div className="portal-card-header">
              <h2><i className="fas fa-bus portal-icon-primary"></i>Step 14: Transportation Routes & Bus Fleet</h2>
            </div>
            <div className="portal-card-body">
              {!enabledModules.transportation ? (
                <div className="portal-card portal-p-40-center">
                  <h3>Transportation Module Disabled</h3>
                  <p className="portal-text-muted-sm">This stage is currently skipped for your tenant.</p>
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                  <form onSubmit={handleAddTransportRoute} className="portal-card portal-wizard-form-box">
                    <h4><i className="fas fa-route text-primary mr-2"></i>Add Bus Route</h4>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '12px' }}>
                      <div>
                        <label htmlFor="route-name" className="portal-label-bold-sm">Route Name *</label>
                        <input id="route-name" type="text" className="portal-input" placeholder="e.g. Route A - North Suburban" value={routeName} onChange={e => setRouteName(e.target.value)} required />
                      </div>
                      <div>
                        <label htmlFor="route-desc" className="portal-label-bold-sm">Pickup Points & Notes</label>
                        <input id="route-desc" type="text" className="portal-input" placeholder="Main Gate -> North Plaza -> West End" value={routeDesc} onChange={e => setRouteDesc(e.target.value)} />
                      </div>
                      <button type="submit" className="portal-btn-primary">
                        <i className="fas fa-plus portal-mr-6"></i>Add Transport Route
                      </button>
                    </div>
                  </form>

                  <form onSubmit={handleAddVehicle} className="portal-card portal-wizard-form-box">
                    <h4><i className="fas fa-shuttle-van text-warning mr-2"></i>Register Bus / Vehicle</h4>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '12px' }}>
                      <div>
                        <label htmlFor="veh-name" className="portal-label-bold-sm">Vehicle Name *</label>
                        <input id="veh-name" type="text" className="portal-input" placeholder="e.g. Bus 1 (65 Seater)" value={vehicleName} onChange={e => setVehicleName(e.target.value)} required />
                      </div>
                      <div>
                        <label htmlFor="veh-num" className="portal-label-bold-sm">Registration Plate *</label>
                        <input id="veh-num" type="text" className="portal-input" placeholder="e.g. AEB-1234" value={vehicleNumber} onChange={e => setVehicleNumber(e.target.value)} required />
                      </div>
                      <div>
                        <label htmlFor="driver-name" className="portal-label-bold-sm">Assigned Driver</label>
                        <input id="driver-name" type="text" className="portal-input" placeholder="Driver Full Name" value={driverName} onChange={e => setDriverName(e.target.value)} />
                      </div>
                      <button type="submit" className="portal-btn-primary">
                        <i className="fas fa-plus portal-mr-6"></i>Register Vehicle
                      </button>
                    </div>
                  </form>
                </div>
              )}
              <div className="portal-stat-card">
                <i className="fas fa-bus fa-2x text-warning portal-mr-16"></i>
                <div>
                  <h4>Configured Routes ({counts.routes || 0}) | Registered Fleet ({counts.vehicles || 0})</h4>
                </div>
              </div>
              <div className="portal-wizard-nav-footer">
                <button className="portal-btn-secondary" onClick={handlePrevStep}>Back</button>
                <button className="portal-btn-primary" onClick={() => handleNextStep('transport_setup')}>
                  Continue to Hostels & Boarding <i className="fas fa-arrow-right portal-ml-6"></i>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Step 15: Boarding Hostels & Rooms */}
        {step === 15 && (
          <div>
            <div className="portal-card-header">
              <h2><i className="fas fa-hotel portal-icon-primary"></i>Step 15: Boarding Hostels & Rooms Setup</h2>
            </div>
            <div className="portal-card-body">
              {!enabledModules.boarding ? (
                <div className="portal-card portal-p-40-center">
                  <h3>Boarding Module Disabled</h3>
                  <p className="portal-text-muted-sm">This stage is currently skipped for your tenant.</p>
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                  <form onSubmit={handleAddHostelCategory} className="portal-card portal-wizard-form-box">
                    <h4><i className="fas fa-building text-primary mr-2"></i>Add Hostel Category / Hall</h4>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '12px' }}>
                      <div>
                        <label htmlFor="cat-name" className="portal-label-bold-sm">Category Name *</label>
                        <input id="cat-name" type="text" className="portal-input" placeholder="e.g. Senior Boys Hostel" value={hostelCatName} onChange={e => setHostelCatName(e.target.value)} required />
                      </div>
                      <div>
                        <label htmlFor="cat-desc" className="portal-label-bold-sm">Description</label>
                        <input id="cat-desc" type="text" className="portal-input" placeholder="e.g. Block A & B residential wings" value={hostelCatDesc} onChange={e => setHostelCatDesc(e.target.value)} />
                      </div>
                      <button type="submit" className="portal-btn-primary">
                        <i className="fas fa-plus portal-mr-6"></i>Add Category
                      </button>
                    </div>
                  </form>

                  <form onSubmit={handleAddHostelRoom} className="portal-card portal-wizard-form-box">
                    <h4><i className="fas fa-bed text-info mr-2"></i>Add Hostel Room Template</h4>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '12px' }}>
                      <div>
                        <label htmlFor="room-name" className="portal-label-bold-sm">Room Name / No. *</label>
                        <input id="room-name" type="text" className="portal-input" placeholder="e.g. Room 101" value={roomName} onChange={e => setRoomName(e.target.value)} required />
                      </div>
                      <div>
                        <label htmlFor="room-beds" className="portal-label-bold-sm">Bed Capacity</label>
                        <input id="room-beds" type="number" className="portal-input" placeholder="4" value={roomBeds} onChange={e => setRoomBeds(e.target.value)} />
                      </div>
                      <div>
                        <label htmlFor="room-cost" className="portal-label-bold-sm">Termly Boarding Fee ($)</label>
                        <input id="room-cost" type="number" className="portal-input" placeholder="150" value={roomCost} onChange={e => setRoomCost(e.target.value)} />
                      </div>
                      <button type="submit" className="portal-btn-primary">
                        <i className="fas fa-plus portal-mr-6"></i>Add Room Template
                      </button>
                    </div>
                  </form>
                </div>
              )}
              <div className="portal-stat-card">
                <i className="fas fa-hotel fa-2x text-danger portal-mr-16"></i>
                <div>
                  <h4>Configured Hostel Categories ({counts.hostels || 0})</h4>
                </div>
              </div>
              <div className="portal-wizard-nav-footer">
                <button className="portal-btn-secondary" onClick={handlePrevStep}>Back</button>
                <button className="portal-btn-primary" onClick={() => handleNextStep('boarding_setup')}>
                  Continue to Asset Governance <i className="fas fa-arrow-right portal-ml-6"></i>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Step 16: Asset Governance */}
        {step === 16 && (
          <div>
            <div className="portal-card-header">
              <h2><i className="fas fa-boxes portal-icon-primary"></i>Step 16: Asset Governance & Equipment Register</h2>
            </div>
            <div className="portal-card-body">
              {!enabledModules.assets ? (
                <div className="portal-card portal-p-40-center">
                  <h3>Asset Module Disabled</h3>
                  <p className="portal-text-muted-sm">This stage is currently skipped for your tenant.</p>
                </div>
              ) : (
                <form onSubmit={handleAddAsset} className="portal-card portal-wizard-form-box">
                  <div className="portal-wizard-form-grid">
                    <div>
                      <label htmlFor="ast-name" className="portal-label-bold-sm">Asset Name *</label>
                      <input id="ast-name" type="text" className="portal-input" placeholder="e.g. Lab Standby Generator" value={assetName} onChange={e => setAssetName(e.target.value)} required />
                    </div>
                    <div>
                      <label htmlFor="ast-cat" className="portal-label-bold-sm">Category</label>
                      <select id="ast-cat" className="portal-input" value={assetCategory} onChange={e => setAssetCategory(e.target.value)}>
                        <option value="Furniture">Furniture & Desks</option>
                        <option value="Electronics">Computers & IT</option>
                        <option value="Laboratory">Science Lab Equipment</option>
                        <option value="Generator">Power & Generators</option>
                        <option value="Vehicles">Vehicles & Transport</option>
                      </select>
                    </div>
                    <div>
                      <label htmlFor="ast-serial" className="portal-label-bold-sm">Serial / Asset Tag</label>
                      <input id="ast-serial" type="text" className="portal-input" placeholder="TAG-9012" value={assetSerial} onChange={e => setAssetSerial(e.target.value)} />
                    </div>
                    <div>
                      <label htmlFor="ast-loc" className="portal-label-bold-sm">Location / Room</label>
                      <input id="ast-loc" type="text" className="portal-input" placeholder="Main Science Block" value={assetLocation} onChange={e => setAssetLocation(e.target.value)} />
                    </div>
                    <button type="submit" className="portal-btn-primary" style={{ alignSelf: 'flex-end' }}>
                      <i className="fas fa-plus portal-mr-6"></i>Register Asset
                    </button>
                  </div>
                </form>
              )}
              <div className="portal-stat-card">
                <i className="fas fa-cubes fa-2x text-success portal-mr-16"></i>
                <div>
                  <h4>Registered Institutional Assets ({counts.assets || 0})</h4>
                </div>
              </div>
              <div className="portal-wizard-nav-footer">
                <button className="portal-btn-secondary" onClick={handlePrevStep}>Back</button>
                <button className="portal-btn-primary" onClick={() => handleNextStep('asset_setup')}>
                  Continue to Sports & Houses <i className="fas fa-arrow-right portal-ml-6"></i>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Step 17: Sports & Houses */}
        {step === 17 && (
          <div>
            <div className="portal-card-header">
              <h2><i className="fas fa-running portal-icon-primary"></i>Step 17: Sports & Student Houses Setup</h2>
            </div>
            <div className="portal-card-body">
              <p className="portal-text-muted-sm portal-mb-16">
                Add co-curricular sports and competitive houses before student assignment.
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                <form onSubmit={handleAddSport} className="portal-card portal-wizard-form-box">
                  <h4><i className="fas fa-football-ball text-primary mr-2"></i>Add Sport</h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '12px' }}>
                    <div>
                      <label htmlFor="sport-name" className="portal-label-bold-sm">Sport Name *</label>
                      <input id="sport-name" type="text" className="portal-input" placeholder="e.g. Football / Soccer" value={sportName} onChange={e => setSportName(e.target.value)} required />
                    </div>
                    <div>
                      <label htmlFor="sport-cat" className="portal-label-bold-sm">Category</label>
                      <select id="sport-cat" className="portal-input" value={sportCategory} onChange={e => setSportCategory(e.target.value)}>
                        <option value="Outdoors">Outdoors</option>
                        <option value="Indoors">Indoors</option>
                        <option value="Aquatics">Aquatics</option>
                        <option value="Athletics">Athletics</option>
                      </select>
                    </div>
                    <button type="submit" className="portal-btn-primary">
                      <i className="fas fa-plus portal-mr-6"></i>Add Sport
                    </button>
                  </div>
                </form>

                <form onSubmit={handleAddHouse} className="portal-card portal-wizard-form-box">
                  <h4><i className="fas fa-shield-alt text-warning mr-2"></i>Add Student House</h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '12px' }}>
                    <div>
                      <label htmlFor="house-name" className="portal-label-bold-sm">House Name *</label>
                      <input id="house-name" type="text" className="portal-input" placeholder="e.g. Eagle House" value={houseName} onChange={e => setHouseName(e.target.value)} required />
                    </div>
                    <div>
                      <label htmlFor="house-color" className="portal-label-bold-sm">Theme Color</label>
                      <input id="house-color" type="color" className="portal-input" value={houseColor} onChange={e => setHouseColor(e.target.value)} style={{ height: '40px', padding: '2px' }} />
                    </div>
                    <button type="submit" className="portal-btn-primary">
                      <i className="fas fa-plus portal-mr-6"></i>Add House
                    </button>
                  </div>
                </form>
              </div>
              <div className="portal-stat-card">
                <i className="fas fa-trophy fa-2x text-warning portal-mr-16"></i>
                <div>
                  <h4>Configured Sports ({counts.sports}) | Houses ({counts.houses})</h4>
                </div>
              </div>
              <div className="portal-wizard-nav-footer">
                <button className="portal-btn-secondary" onClick={handlePrevStep}>Back</button>
                <button className="portal-btn-primary" onClick={() => handleNextStep('sports_houses')}>
                  Continue to Clubs & Societies <i className="fas fa-arrow-right portal-ml-6"></i>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Step 18: Student Clubs & Extracurriculars */}
        {step === 18 && (
          <div>
            <div className="portal-card-header">
              <h2><i className="fas fa-users-slash portal-icon-primary"></i>Step 18: Student Clubs & Societies</h2>
            </div>
            <div className="portal-card-body">
              {!enabledModules.clubs ? (
                <div className="portal-card portal-p-40-center">
                  <h3>Clubs Module Disabled</h3>
                  <p className="portal-text-muted-sm">This stage is currently skipped for your tenant.</p>
                </div>
              ) : (
                <form onSubmit={handleAddClub} className="portal-card portal-wizard-form-box">
                  <div className="portal-wizard-form-grid">
                    <div>
                      <label htmlFor="club-name" className="portal-label-bold-sm">Club Name *</label>
                      <input id="club-name" type="text" className="portal-input" placeholder="e.g. Debate & Public Speaking Club" value={clubName} onChange={e => setClubName(e.target.value)} required />
                    </div>
                    <div>
                      <label htmlFor="club-cat" className="portal-label-bold-sm">Category</label>
                      <select id="club-cat" className="portal-input" value={clubCategory} onChange={e => setClubCategory(e.target.value)}>
                        <option value="Academic">Academic & Debate</option>
                        <option value="Arts">Arts & Culture</option>
                        <option value="Science">Science & Robotics</option>
                        <option value="Community">Community & Leadership</option>
                      </select>
                    </div>
                    <button type="submit" className="portal-btn-primary" style={{ alignSelf: 'flex-end' }}>
                      <i className="fas fa-plus portal-mr-6"></i>Create Club
                    </button>
                  </div>
                </form>
              )}
              <div className="portal-stat-card">
                <i className="fas fa-users-cog fa-2x text-primary portal-mr-16"></i>
                <div>
                  <h4>Registered Clubs ({counts.clubs || 0})</h4>
                </div>
              </div>
              <div className="portal-wizard-nav-footer">
                <button className="portal-btn-secondary" onClick={handlePrevStep}>Back</button>
                <button className="portal-btn-primary" onClick={() => handleNextStep('clubs_setup')}>
                  Continue to Uniform Store <i className="fas fa-arrow-right portal-ml-6"></i>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Step 19: Uniform Store */}
        {step === 19 && (
          <div>
            <div className="portal-card-header">
              <h2><i className="fas fa-tshirt portal-icon-primary"></i>Step 19: Uniform Store Inventory</h2>
            </div>
            <div className="portal-card-body">
              {!enabledModules.uniforms ? (
                <div className="portal-card portal-p-40-center">
                  <h3>Uniform Module Disabled</h3>
                  <p className="portal-text-muted-sm">This stage is currently skipped for your tenant.</p>
                </div>
              ) : (
                <>
                  <form onSubmit={handleQuickAddUniform} className="portal-card portal-wizard-form-box">
                    <div className="portal-wizard-form-grid">
                      <div>
                        <label htmlFor="uniform-name" className="portal-label-bold-sm">Uniform Item Name</label>
                        <input id="uniform-name" type="text" className="portal-input" placeholder="e.g. School Blazer" value={uniformName} onChange={e => setUniformName(e.target.value)} required />
                      </div>
                      <div>
                        <label htmlFor="uniform-price" className="portal-label-bold-sm">Price ($)</label>
                        <input id="uniform-price" type="number" className="portal-input" placeholder="e.g. 45" value={uniformPrice} onChange={e => setUniformPrice(e.target.value)} required />
                      </div>
                      <button type="submit" className="portal-btn-primary" style={{ alignSelf: 'flex-end' }}>
                        <i className="fas fa-plus portal-mr-6"></i>Add Uniform Item
                      </button>
                    </div>
                  </form>
                  <div className="portal-stat-card">
                    <i className="fas fa-tshirt fa-2x text-info portal-mr-16"></i>
                    <div>
                      <h4>Uniform Items ({counts.uniforms})</h4>
                    </div>
                  </div>
                </>
              )}
              <div className="portal-wizard-nav-footer">
                <button className="portal-btn-secondary" onClick={handlePrevStep}>Back</button>
                <button className="portal-btn-primary" onClick={() => handleNextStep('uniform_setup')}>
                  Continue to Clinic Setup <i className="fas fa-arrow-right portal-ml-6"></i>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Step 20: Clinic Setup */}
        {step === 20 && (
          <div>
            <div className="portal-card-header">
              <h2><i className="fas fa-pills portal-icon-primary"></i>Step 20: Clinic Pharmacy Inventory</h2>
            </div>
            <div className="portal-card-body">
              {!enabledModules.clinic ? (
                <div className="portal-card portal-p-40-center">
                  <h3>Clinic Module Disabled</h3>
                  <p className="portal-text-muted-sm">This stage is currently skipped for your tenant.</p>
                </div>
              ) : (
                <>
                  <form onSubmit={handleQuickAddPharmacy} className="portal-card portal-wizard-form-box">
                    <div className="portal-wizard-form-grid">
                      <div>
                        <label htmlFor="med-name" className="portal-label-bold-sm">Medicine Name</label>
                        <input id="med-name" type="text" className="portal-input" placeholder="e.g. Paracetamol 500mg" value={medName} onChange={e => setMedName(e.target.value)} required />
                      </div>
                      <div>
                        <label htmlFor="med-qty" className="portal-label-bold-sm">Initial Stock Qty</label>
                        <input id="med-qty" type="number" className="portal-input" placeholder="e.g. 100" value={medQty} onChange={e => setMedQty(e.target.value)} required />
                      </div>
                      <button type="submit" className="portal-btn-primary" style={{ alignSelf: 'flex-end' }}>
                        <i className="fas fa-plus portal-mr-6"></i>Add Stock
                      </button>
                    </div>
                  </form>
                  <div className="portal-stat-card">
                    <i className="fas fa-clinic-medical fa-2x text-danger portal-mr-16"></i>
                    <div>
                      <h4>Pharmacy Inventory ({counts.clinic})</h4>
                    </div>
                  </div>
                </>
              )}
              <div className="portal-wizard-nav-footer">
                <button className="portal-btn-secondary" onClick={handlePrevStep}>Back</button>
                <button className="portal-btn-primary" onClick={() => handleNextStep('clinic_setup')}>
                  Continue to Document Branding <i className="fas fa-arrow-right portal-ml-6"></i>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Step 21: Document & Certificate Templates Branding */}
        {step === 21 && (
          <div>
            <div className="portal-card-header">
              <h2><i className="fas fa-file-signature portal-icon-primary"></i>Step 21: Financial Receipts & Certificate Templates</h2>
            </div>
            <div className="portal-card-body">
              <p className="portal-text-muted-sm portal-mb-16">
                Configure receipt prefixes, mandatory balance disclosures, and official document layout themes.
              </p>
              <form onSubmit={handleSaveDocumentBranding} className="portal-card portal-wizard-form-box">
                <div className="portal-wizard-form-grid">
                  <div>
                    <label htmlFor="doc-rec-prefix" className="portal-label-bold-sm">Official Receipt Number Prefix</label>
                    <input id="doc-rec-prefix" type="text" className="portal-input" placeholder="REC-" value={docBranding.receiptPrefix} onChange={e => setDocBranding({ ...docBranding, receiptPrefix: e.target.value })} />
                  </div>
                  <div>
                    <label htmlFor="doc-inv-design" className="portal-label-bold-sm">Invoice Visual Style</label>
                    <select id="doc-inv-design" className="portal-input" value={docBranding.invoiceDesign} onChange={e => setDocBranding({ ...docBranding, invoiceDesign: e.target.value })}>
                      <option value="modern-clean">Modern Clean</option>
                      <option value="professional-blue">Professional Blue</option>
                      <option value="classic-gray">Classic Gray</option>
                    </select>
                  </div>
                  <div>
                    <label htmlFor="doc-cert-title" className="portal-label-bold-sm">Certificate Title</label>
                    <input id="doc-cert-title" type="text" className="portal-input" placeholder="Certificate of Achievement" value={docBranding.certTitle} onChange={e => setDocBranding({ ...docBranding, certTitle: e.target.value })} />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', justifyContent: 'center' }}>
                    <label className="portal-checkbox-label">
                      <input type="checkbox" checked={docBranding.mandatoryReceipts} onChange={e => setDocBranding({ ...docBranding, mandatoryReceipts: e.target.checked })} />
                      Mandatory Receipt Generation for Fee Payments
                    </label>
                    <label className="portal-checkbox-label">
                      <input type="checkbox" checked={docBranding.showBalanceOnReceipts} onChange={e => setDocBranding({ ...docBranding, showBalanceOnReceipts: e.target.checked })} />
                      Display Outstanding Balance on Receipts
                    </label>
                  </div>
                </div>
                <div style={{ marginTop: '20px', padding: '16px', background: '#f8fafc', borderRadius: '12px', border: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <h4 style={{ margin: 0 }}><i className="fas fa-stamp text-warning portal-mr-6"></i>Signatures, Official Seals & Watermarks Studio</h4>
                    <p className="portal-text-muted-sm" style={{ margin: '4px 0 0' }}>Upload PNG digital signatures and principal stamps in the Document Templates manager.</p>
                  </div>
                  <button type="button" className="portal-btn-secondary" onClick={() => navigate('/admin/document-templates')}>
                    <i className="fas fa-external-link-alt portal-mr-6"></i>Open Document Templates Manager
                  </button>
                </div>
                <div style={{ marginTop: '16px', display: 'flex', justifyContent: 'flex-end' }}>
                  <button type="submit" className="portal-btn-primary">
                    Save Document Branding & Next <i className="fas fa-arrow-right portal-ml-6"></i>
                  </button>
                </div>
              </form>
              <div className="portal-wizard-nav-footer">
                <button className="portal-btn-secondary" onClick={handlePrevStep}>Back</button>
              </div>
            </div>
          </div>
        )}

        {/* Step 22: Go-Live Review */}
        {step === 22 && (
          <div>
            <div className="portal-card-header">
              <h2><i className="fas fa-check-double portal-icon-primary"></i>Step 22: System Readiness Audit & Go-Live</h2>
            </div>
            <div className="portal-card-body">
              <div className="portal-card portal-wizard-audit-card">
                <h3 className="portal-wizard-audit-title">Tenant Readiness Checklist Audit</h3>
                <div className="portal-wizard-audit-grid">
                  <div className="portal-wizard-audit-item">
                    <i className={`fas fa-${completedStages.system_preferences ? 'check-circle text-success' : 'times-circle text-danger'}`}></i>
                    <span>System Preferences & Language</span>
                  </div>
                  <div className="portal-wizard-audit-item">
                    <i className={`fas fa-${completedStages.org_profile ? 'check-circle text-success' : 'times-circle text-danger'}`}></i>
                    <span>Org Profile & Contacts</span>
                  </div>
                  <div className="portal-wizard-audit-item">
                    <i className={`fas fa-${completedStages.branding ? 'check-circle text-success' : 'times-circle text-danger'}`}></i>
                    <span>Branding & Header Templates</span>
                  </div>
                  {enabledModules.website !== false && (
                    <div className="portal-wizard-audit-item">
                      <i className={`fas fa-${completedStages.website_setup ? 'check-circle text-success' : 'times-circle text-danger'}`}></i>
                      <span>Public Website & Landing Portal</span>
                    </div>
                  )}
                  {enabledModules.id_cards !== false && (
                    <div className="portal-wizard-audit-item">
                      <i className={`fas fa-${completedStages.id_cards_setup ? 'check-circle text-success' : 'times-circle text-danger'}`}></i>
                      <span>Student ID Cards & Gate Access Control</span>
                    </div>
                  )}
                  <div className="portal-wizard-audit-item">
                    <i className={`fas fa-${completedStages.chart_of_accounts ? 'check-circle text-success' : 'times-circle text-danger'}`}></i>
                    <span>Chart of Accounts ({counts.coa} Accounts)</span>
                  </div>
                  <div className="portal-wizard-audit-item">
                    <i className={`fas fa-${completedStages.departments ? 'check-circle text-success' : 'times-circle text-danger'}`}></i>
                    <span>Departments ({counts.departments} Departments)</span>
                  </div>
                  <div className="portal-wizard-audit-item">
                    <i className={`fas fa-${completedStages.subjects ? 'check-circle text-success' : 'times-circle text-danger'}`}></i>
                    <span>Subjects ({counts.subjects} Subjects)</span>
                  </div>
                  <div className="portal-wizard-audit-item">
                    <i className={`fas fa-${completedStages.academic_structure ? 'check-circle text-success' : 'times-circle text-danger'}`}></i>
                    <span>Classes ({counts.classes} Classes)</span>
                  </div>
                  <div className="portal-wizard-audit-item">
                    <i className={`fas fa-${completedStages.grading_setup ? 'check-circle text-success' : 'times-circle text-danger'}`}></i>
                    <span>Grading Policy ({counts.grading || 0} Grade Bands)</span>
                  </div>
                  <div className="portal-wizard-audit-item">
                    <i className={`fas fa-${completedStages.sports_houses ? 'check-circle text-success' : 'times-circle text-danger'}`}></i>
                    <span>Sports & Houses ({counts.sports} Sports, {counts.houses} Houses)</span>
                  </div>
                  {enabledModules.transportation && (
                    <div className="portal-wizard-audit-item">
                      <i className={`fas fa-${completedStages.transport_setup ? 'check-circle text-success' : 'times-circle text-danger'}`}></i>
                      <span>Transportation ({counts.routes || 0} Routes, {counts.vehicles || 0} Fleet)</span>
                    </div>
                  )}
                  {enabledModules.boarding && (
                    <div className="portal-wizard-audit-item">
                      <i className={`fas fa-${completedStages.boarding_setup ? 'check-circle text-success' : 'times-circle text-danger'}`}></i>
                      <span>Hostels & Boarding ({counts.hostels || 0} Hostel Halls)</span>
                    </div>
                  )}
                  {enabledModules.assets && (
                    <div className="portal-wizard-audit-item">
                      <i className={`fas fa-${completedStages.asset_setup ? 'check-circle text-success' : 'times-circle text-danger'}`}></i>
                      <span>Asset Governance ({counts.assets || 0} Registered Assets)</span>
                    </div>
                  )}
                  {enabledModules.clubs && (
                    <div className="portal-wizard-audit-item">
                      <i className={`fas fa-${completedStages.clubs_setup ? 'check-circle text-success' : 'times-circle text-danger'}`}></i>
                      <span>Clubs & Societies ({counts.clubs || 0} Clubs)</span>
                    </div>
                  )}
                  {enabledModules.document_branding !== false && (
                    <div className="portal-wizard-audit-item">
                      <i className={`fas fa-${completedStages.document_branding ? 'check-circle text-success' : 'times-circle text-danger'}`}></i>
                      <span>Document & Certificate Branding</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="portal-wizard-launch-box">
                <i className="fas fa-rocket fa-3x text-primary portal-wizard-launch-icon"></i>
                <h2>Your Institution is Ready for Live Operations!</h2>
                <p className="portal-text-muted-sm portal-wizard-launch-desc">
                  All prerequisite system dependencies have been configured. You can revisit any setup step anytime from Admin Settings.
                </p>
                <button 
                  className="portal-btn-primary portal-wizard-launch-btn" 
                  onClick={async () => {
                    await updateStage('review_golive', true, 22);
                    showToast('🎉 Setup Complete! Welcome to ACADEX ERP Live Operations.', 'success');
                    navigate('/admin/dashboard');
                  }}
                >
                  <i className="fas fa-check-double portal-mr-6"></i>Finish Setup & Launch Dashboard
                </button>
              </div>

              <div className="portal-wizard-footer-flex">
                <button className="portal-btn-secondary" onClick={handlePrevStep}>Back</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
