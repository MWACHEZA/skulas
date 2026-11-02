import React, { useState, useEffect, useMemo, useCallback } from 'react';
import api from '../../../../lib/api';
import { useToast } from '../../../../context/ToastContext';
import { useAuth } from '../../../../contexts/AuthContext';
import { format, differenceInDays, isPast, isToday, addDays, addMonths, addWeeks } from 'date-fns';
import { useTerminology } from '../../../../hooks/useTerminology';
import { SearchInput, ExportButton, SkeletonLoader, PaginatedTable } from '../../../../components/shared';
import { getAvatarUrl, formatCurrency } from '../../../../utils/formatters';

interface PaymentPlanInstallment {
  id: string;
  planId: string;
  amount: number;
  dueDate: string;
  status: 'PENDING' | 'PAID' | 'OVERDUE';
}

interface PaymentPlan {
  id: string;
  amount: number;
  dueDate: string;
  status: 'PENDING' | 'APPROVED' | 'ACTIVE' | 'REJECTED' | 'PAID' | 'OVERDUE' | 'DEFAULTED' | 'COMPLETED';
  notes: string;
  allowGateEntry?: boolean;
  planType?: string;
  installmentsCount?: number;
  createdAt: string;
  student: {
    id?: string;
    name: string;
    studentId: string;
    class?: { name: string };
  };
  parentUser: {
    name: string;
    email: string;
  };
  installments?: PaymentPlanInstallment[];
}

interface PlanTemplate {
  id: string;
  name: string;
  amount: number;
  dueDate?: string | null;
  notes?: string;
}

interface StudentOption {
  id: string;
  name: string;
  studentId: string;
  class?: { name: string };
}

interface AuthUserSchoolDetails {
  schoolCode?: string;
  schoolName?: string;
  schoolLogo?: string;
  school?: {
    code?: string;
    name?: string;
    logo?: string;
    branding?: {
      logo?: string;
    } | null;
  };
}

interface ApiErrorShape {
  response?: {
    data?: {
      error?: string;
    };
  };
}

const STATUS_CONFIG: Record<string, { bg: string; border: string; color: string; label: string; icon: string }> = {
  PENDING:   { bg: '#fffbeb', border: '#fde68a', color: '#b45309', label: 'Pending Review', icon: 'fa-clock' },
  APPROVED:  { bg: '#ecfdf5', border: '#a7f3d0', color: '#047857', label: 'Approved', icon: 'fa-check' },
  ACTIVE:    { bg: '#eff6ff', border: '#bfdbfe', color: '#1d4ed8', label: 'Active (On Track)', icon: 'fa-spinner' },
  OVERDUE:   { bg: '#fff1f2', border: '#fecdd3', color: '#be123c', label: 'Overdue Arrears', icon: 'fa-exclamation-circle' },
  DEFAULTED: { bg: '#fef2f2', border: '#fca5a5', color: '#991b1b', label: 'Defaulted (>14d)', icon: 'fa-ban' },
  PAID:      { bg: '#f0fdf4', border: '#86efac', color: '#15803d', label: 'Paid in Full', icon: 'fa-check-double' },
  COMPLETED: { bg: '#f0fdf4', border: '#86efac', color: '#15803d', label: 'Completed', icon: 'fa-award' },
  REJECTED:  { bg: '#f8fafc', border: '#e2e8f0', color: '#64748b', label: 'Declined', icon: 'fa-times' },
};

export default function ManagePaymentPlans() {
  const { t } = useTerminology();
  const { showToast, toastConfirm } = useToast();
  const { user } = useAuth();

  // Branding state
  const [schoolLogo, setSchoolLogo] = useState<string | null>(null);
  const [schoolName, setSchoolName] = useState<string>('ACADEX Institution');
  const [schoolCode, setSchoolCode] = useState<string>('ACADEX');

  // Core data states
  const [plans, setPlans] = useState<PaymentPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  // Filters & Tabs
  const [activeSubTab, setActiveSubTab] = useState<'applications' | 'templates'>('applications');
  const [filterStatus, setFilterStatus] = useState<string>('');
  const [filterGrace, setFilterGrace] = useState<'all' | 'grace' | 'strict'>('all');
  const [activeCardFilter, setActiveCardFilter] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState<string>('');

  // Templates state
  const [templates, setTemplates] = useState<PlanTemplate[]>([]);
  const [loadingTemplates, setLoadingTemplates] = useState(false);
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<PlanTemplate | null>(null);
  const [templateForm, setTemplateForm] = useState({
    name: '',
    amount: '',
    dueDate: '',
    notes: '',
  });

  // Students list for Enrollment modal
  const [availableStudents, setAvailableStudents] = useState<StudentOption[]>([]);
  const [loadingStudents, setLoadingStudents] = useState(false);

  // Enroll Student Modal State
  const [showEnrollModal, setShowEnrollModal] = useState(false);
  const [submittingEnroll, setSubmittingEnroll] = useState(false);
  const [enrollStudentSearch, setEnrollStudentSearch] = useState('');
  const [enrollForm, setEnrollForm] = useState({
    studentId: '',
    totalAmount: '',
    planType: 'monthly',
    installmentsCount: 3,
    startDate: new Date().toISOString().split('T')[0],
  });

  // Installment Inspector & Settlement Modal State
  const [inspectPlan, setInspectPlan] = useState<PaymentPlan | null>(null);
  const [paymentMethodModal, setPaymentMethodModal] = useState<{ installmentId: string; amount: number } | null>(null);
  const [payMethod, setPayMethod] = useState<'CASH' | 'BANK_TRANSFER' | 'CARD' | 'ECOCASH'>('CASH');
  const [payReference, setPayReference] = useState('');
  const [processingPayment, setProcessingPayment] = useState(false);

  const fetchSchoolBranding = useCallback(async () => {
    try {
      const u = user as unknown as AuthUserSchoolDetails;
      const activeCode = u?.schoolCode || u?.school?.code || 'AX-GOXN5P';
      const activeName = u?.schoolName || u?.school?.name || 'Lobengula Primary';
      setSchoolCode(activeCode);
      setSchoolName(activeName);

      let resolved = getAvatarUrl(
        u?.school?.logo || u?.schoolLogo || u?.school?.branding?.logo,
        activeCode
      );

      if (!resolved) {
        const res = await api.get('/api/schools/settings');
        const s = (res.data?.settings || res.data || {}) as { logo?: string; schoolLogo?: string; favicon?: string; branding?: { logo?: string } };
        const logoPath = s.logo || s.schoolLogo || s.favicon || s.branding?.logo;
        resolved = getAvatarUrl(logoPath, activeCode);
      }

      if (resolved) {
        setSchoolLogo(resolved);
      }
    } catch {
      // Branding fallback
    }
  }, [user]);

  const fetchPlans = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/api/payment-plans/admin');
      const data = Array.isArray(res.data) ? res.data : [];
      setPlans(data);
      if (inspectPlan) {
        const updated = data.find((p: PaymentPlan) => p.id === inspectPlan.id);
        if (updated) setInspectPlan(updated);
      }
    } catch {
      showToast('Failed to load payment plans', 'error');
    } finally {
      setLoading(false);
    }
  }, [inspectPlan, showToast]);

  const fetchTemplates = useCallback(async () => {
    setLoadingTemplates(true);
    try {
      const res = await api.get('/api/payment-plans/templates');
      setTemplates(Array.isArray(res.data) ? res.data : []);
    } catch {
      showToast('Failed to load predefined plans', 'error');
    } finally {
      setLoadingTemplates(false);
    }
  }, [showToast]);

  // Load branding & initial data
  useEffect(() => {
    fetchSchoolBranding();
    fetchPlans();
    fetchTemplates();
  }, [fetchSchoolBranding, fetchPlans, fetchTemplates]);

  const loadStudentsForEnrollment = async () => {
    if (availableStudents.length > 0) return;
    setLoadingStudents(true);
    try {
      const res = await api.get('/api/students?limit=250');
      const list = res.data?.students || (Array.isArray(res.data) ? res.data : []);
      setAvailableStudents(list);
    } catch {
      showToast('Failed to load students roster for enrollment', 'error');
    } finally {
      setLoadingStudents(false);
    }
  };

  const openEnrollModal = (initialTemplate?: PlanTemplate) => {
    loadStudentsForEnrollment();
    setEnrollForm({
      studentId: '',
      totalAmount: initialTemplate ? String(initialTemplate.amount) : '',
      planType: 'monthly',
      installmentsCount: 3,
      startDate: new Date().toISOString().split('T')[0],
    });
    setEnrollStudentSearch('');
    setShowEnrollModal(true);
  };

  const handleCreatePaymentPlan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!enrollForm.studentId) {
      showToast('Please select a student to enroll', 'error');
      return;
    }
    if (!enrollForm.totalAmount || Number(enrollForm.totalAmount) <= 0) {
      showToast('Please provide a valid agreement total amount', 'error');
      return;
    }

    setSubmittingEnroll(true);
    try {
      await api.post('/api/payment-plans', {
        studentId: enrollForm.studentId,
        totalAmount: Number(enrollForm.totalAmount),
        planType: enrollForm.planType,
        installmentsCount: Number(enrollForm.installmentsCount),
        startDate: enrollForm.startDate,
      });

      showToast('Student enrolled into payment plan successfully', 'success');
      setShowEnrollModal(false);
      setActiveSubTab('applications');
      fetchPlans();
    } catch (err: unknown) {
      const error = err as ApiErrorShape;
      showToast(error.response?.data?.error || 'Failed to create payment plan', 'error');
    } finally {
      setSubmittingEnroll(false);
    }
  };

  const handleSaveTemplate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!templateForm.name || !templateForm.amount) {
      showToast('Name and amount are required', 'error');
      return;
    }
    try {
      const payload = {
        id: selectedTemplate?.id || undefined,
        name: templateForm.name,
        amount: parseFloat(templateForm.amount),
        dueDate: templateForm.dueDate || undefined,
        notes: templateForm.notes,
      };
      const res = await api.post('/api/payment-plans/templates', payload);
      showToast('Offered plan template saved successfully', 'success');
      if (res.data && Array.isArray(res.data.templates)) {
        setTemplates(res.data.templates);
      } else {
        fetchTemplates();
      }
      setShowTemplateModal(false);
      setSelectedTemplate(null);
      setTemplateForm({ name: '', amount: '', dueDate: '', notes: '' });
    } catch (err: unknown) {
      const error = err as ApiErrorShape;
      showToast(error.response?.data?.error || 'Failed to save template', 'error');
    }
  };

  const handleDeleteTemplate = async (id: string) => {
    const confirmed = toastConfirm
      ? await toastConfirm('Are you sure you want to delete this offered plan?')
      : window.confirm('Are you sure you want to delete this offered plan?');
    if (!confirmed) return;

    try {
      const res = await api.delete(`/api/payment-plans/templates/${id}`);
      showToast('Offered plan template deleted successfully', 'success');
      if (res.data && Array.isArray(res.data.templates)) {
        setTemplates(res.data.templates);
      } else {
        fetchTemplates();
      }
    } catch (err: unknown) {
      const error = err as ApiErrorShape;
      showToast(error.response?.data?.error || 'Failed to delete template', 'error');
    }
  };

  const openEditTemplate = (tmpl: PlanTemplate) => {
    setSelectedTemplate(tmpl);
    setTemplateForm({
      name: tmpl.name || '',
      amount: tmpl.amount?.toString() || '',
      dueDate: tmpl.dueDate ? new Date(tmpl.dueDate).toISOString().split('T')[0] : '',
      notes: tmpl.notes || '',
    });
    setShowTemplateModal(true);
  };

  const openCreateTemplate = () => {
    setSelectedTemplate(null);
    setTemplateForm({ name: '', amount: '', dueDate: '', notes: '' });
    setShowTemplateModal(true);
  };

  const updateStatus = async (id: string, status: PaymentPlan['status']) => {
    setUpdatingId(id);
    try {
      await api.patch(`/api/payment-plans/${id}/status`, { status });
      showToast(`Payment plan status marked as ${status.toLowerCase()}`, 'success');
      setPlans(prev => prev.map(p => p.id === id ? { ...p, status } : p));
      if (inspectPlan && inspectPlan.id === id) {
        setInspectPlan(prev => prev ? { ...prev, status } : null);
      }
    } catch (err: unknown) {
      const error = err as ApiErrorShape;
      showToast(error.response?.data?.error || 'Failed to update status', 'error');
    } finally {
      setUpdatingId(null);
    }
  };

  const toggleGateEntry = async (planId: string, currentVal: boolean) => {
    try {
      const res = await api.post(`/api/gate/payment-plan/${planId}/toggle-gate-entry`, {
        allowGateEntry: !currentVal,
      });
      if (res.data.success) {
        setPlans(prev => prev.map(p => p.id === planId ? { ...p, allowGateEntry: !currentVal } : p));
        if (inspectPlan && inspectPlan.id === planId) {
          setInspectPlan(prev => prev ? { ...prev, allowGateEntry: !currentVal } : null);
        }
        showToast(
          !currentVal
            ? 'Gate Entry Grace Granted: Student permitted through gate turnstiles'
            : 'Gate Entry Grace Revoked: Standard gate access policy active',
          'success'
        );
      }
    } catch (err: unknown) {
      const error = err as ApiErrorShape;
      showToast(error.response?.data?.error || 'Failed to update gate entry flag', 'error');
    }
  };

  const handlePayInstallment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!paymentMethodModal) return;

    setProcessingPayment(true);
    try {
      await api.post(`/api/payment-plans/installments/${paymentMethodModal.installmentId}/pay`, {
        paymentMethod: payMethod,
        reference: payReference || `Counter settlement ${Date.now()}`,
      });

      showToast('Installment recorded as paid in student ledger', 'success');
      setPaymentMethodModal(null);
      setPayReference('');
      await fetchPlans();
    } catch (err: unknown) {
      const error = err as ApiErrorShape;
      showToast(error.response?.data?.error || 'Failed to record installment payment', 'error');
    } finally {
      setProcessingPayment(false);
    }
  };

  // Preview generated installments for the enroll modal
  const simulatedInstallments = useMemo(() => {
    const total = parseFloat(enrollForm.totalAmount);
    const count = parseInt(String(enrollForm.installmentsCount), 10);
    if (isNaN(total) || total <= 0 || isNaN(count) || count <= 0) return [];

    const baseAmount = Math.floor((total / count) * 100) / 100;
    const remainder = Math.round((total - baseAmount * count) * 100) / 100;

    let current = enrollForm.startDate ? new Date(enrollForm.startDate) : new Date();
    const result = [];

    for (let i = 0; i < count; i++) {
      const isLast = i === count - 1;
      const amt = isLast ? baseAmount + remainder : baseAmount;
      result.push({
        index: i + 1,
        amount: amt,
        dueDate: new Date(current),
      });

      if (enrollForm.planType === 'weekly') {
        current = addWeeks(current, 1);
      } else if (enrollForm.planType === 'biweekly') {
        current = addDays(current, 14);
      } else {
        current = addMonths(current, 1);
      }
    }
    return result;
  }, [enrollForm.totalAmount, enrollForm.installmentsCount, enrollForm.planType, enrollForm.startDate]);

  // Statistics calculation
  const stats = useMemo(() => {
    const total = plans.length;
    const totalCommitted = plans.reduce((acc, p) => acc + (Number(p.amount) || 0), 0);
    const pending = plans.filter(p => p.status === 'PENDING').length;
    const active = plans.filter(p => p.status === 'ACTIVE' || p.status === 'APPROVED').length;
    const overdue = plans.filter(p => p.status === 'OVERDUE' || p.status === 'DEFAULTED').length;
    const grace = plans.filter(p => !!p.allowGateEntry).length;
    const paid = plans.filter(p => p.status === 'PAID' || p.status === 'COMPLETED').length;
    return { total, totalCommitted, pending, active, overdue, grace, paid };
  }, [plans]);

  // Filtered plans list
  const filteredPlans = useMemo(() => {
    return plans.filter(p => {
      // 1. KPI quick filter
      if (activeCardFilter === 'PENDING' && p.status !== 'PENDING') return false;
      if (activeCardFilter === 'ACTIVE' && p.status !== 'ACTIVE' && p.status !== 'APPROVED') return false;
      if (activeCardFilter === 'OVERDUE' && p.status !== 'OVERDUE' && p.status !== 'DEFAULTED') return false;
      if (activeCardFilter === 'GRACE' && !p.allowGateEntry) return false;
      if (activeCardFilter === 'PAID' && p.status !== 'PAID' && p.status !== 'COMPLETED') return false;

      // 2. Status dropdown
      if (filterStatus && p.status !== filterStatus) return false;

      // 3. Grace dropdown
      if (filterGrace === 'grace' && !p.allowGateEntry) return false;
      if (filterGrace === 'strict' && !!p.allowGateEntry) return false;

      // 4. Search query
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        const studentName = p.student?.name?.toLowerCase() || '';
        const studentId = p.student?.studentId?.toLowerCase() || '';
        const className = p.student?.class?.name?.toLowerCase() || '';
        const parentName = p.parentUser?.name?.toLowerCase() || '';
        const parentEmail = p.parentUser?.email?.toLowerCase() || '';
        if (
          !studentName.includes(q) &&
          !studentId.includes(q) &&
          !className.includes(q) &&
          !parentName.includes(q) &&
          !parentEmail.includes(q)
        ) {
          return false;
        }
      }

      return true;
    });
  }, [plans, activeCardFilter, filterStatus, filterGrace, searchTerm]);

  // Filtered student options for enrollment selector
  const filteredEnrollStudents = useMemo(() => {
    if (!enrollStudentSearch.trim()) return availableStudents.slice(0, 30);
    const q = enrollStudentSearch.toLowerCase();
    return availableStudents
      .filter(s => s.name?.toLowerCase().includes(q) || s.studentId?.toLowerCase().includes(q) || s.class?.name?.toLowerCase().includes(q))
      .slice(0, 30);
  }, [availableStudents, enrollStudentSearch]);

  const selectedStudentObj = useMemo(() => {
    return availableStudents.find(s => s.id === enrollForm.studentId);
  }, [availableStudents, enrollForm.studentId]);

  return (
    <div className="manage-payment-plans-wrapper" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* 1. ACADEX Executive Institutional Hero Header */}
      <div
        className="portal-card executive-header-banner"
        style={{
          background: 'linear-gradient(135deg, #0c2340 0%, #0369a1 100%)',
          color: '#ffffff',
          borderRadius: '20px',
          padding: '28px 32px',
          boxShadow: '0 12px 32px -4px rgba(12, 35, 64, 0.25)',
          position: 'relative',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          gap: '20px',
        }}
      >
        {/* Subtle decorative radial accent */}
        <div
          style={{
            position: 'absolute',
            top: -40,
            right: -40,
            width: '260px',
            height: '260px',
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(255,255,255,0.12) 0%, rgba(255,255,255,0) 70%)',
            pointerEvents: 'none',
          }}
        />

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '20px', zIndex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '18px' }}>
            {/* School Emblem / Logo Badge */}
            <div
              style={{
                width: '64px',
                height: '64px',
                borderRadius: '16px',
                background: '#ffffff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 8px 20px rgba(0,0,0,0.18)',
                overflow: 'hidden',
                flexShrink: 0,
                border: '2px solid rgba(255,255,255,0.8)',
              }}
            >
              {schoolLogo ? (
                <img
                  src={schoolLogo}
                  alt={schoolName}
                  style={{ width: '100%', height: '100%', objectFit: 'contain', padding: '4px' }}
                  onError={() => setSchoolLogo(null)}
                />
              ) : (
                <i className="fas fa-hand-holding-usd" style={{ fontSize: '28px', color: '#0284c7' }} />
              )}
            </div>

            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap', marginBottom: '6px' }}>
                <span
                  style={{
                    fontSize: '0.75rem',
                    fontWeight: 800,
                    letterSpacing: '0.08em',
                    textTransform: 'uppercase',
                    background: 'rgba(255, 255, 255, 0.16)',
                    padding: '3px 10px',
                    borderRadius: '20px',
                    border: '1px solid rgba(255,255,255,0.25)',
                    color: '#e0f2fe',
                  }}
                >
                  <i className="fas fa-university" style={{ marginRight: '6px' }} />
                  {schoolName} • {schoolCode}
                </span>

                <span
                  style={{
                    fontSize: '0.72rem',
                    fontWeight: 800,
                    letterSpacing: '0.06em',
                    textTransform: 'uppercase',
                    background: '#10b981',
                    padding: '3px 10px',
                    borderRadius: '20px',
                    color: '#ffffff',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '5px',
                  }}
                >
                  <i className="fas fa-shield-alt" />
                  Fee Recovery & Gate Clearances
                </span>
              </div>

              <h1 style={{ margin: 0, fontSize: '1.75rem', fontWeight: 900, color: '#ffffff', letterSpacing: '-0.02em' }}>
                Manage Student Payment Plans
              </h1>
              <p style={{ margin: '6px 0 0', fontSize: '0.92rem', color: '#bae6fd', maxWidth: '680px', lineHeight: 1.45 }}>
                Enforce structured installment arrangements, approve parent contracts, review scheduled splits, and toggle humanitarian gate exemptions in real time.
              </p>
            </div>
          </div>

          {/* Action buttons toolbar */}
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center', zIndex: 1 }} className="no-print">
            <button
              onClick={() => openEnrollModal()}
              type="button"
              style={{
                background: '#ffffff',
                color: '#0369a1',
                border: 'none',
                fontWeight: 800,
                fontSize: '0.9rem',
                padding: '10px 20px',
                borderRadius: '12px',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                cursor: 'pointer',
                boxShadow: '0 4px 14px rgba(0,0,0,0.15)',
                transition: 'all 0.2s ease',
              }}
              onMouseEnter={e => (e.currentTarget.style.transform = 'translateY(-1px)')}
              onMouseLeave={e => (e.currentTarget.style.transform = 'translateY(0)')}
            >
              <i className="fas fa-user-plus" />
              Enroll Student
            </button>

            <button
              onClick={openCreateTemplate}
              type="button"
              style={{
                background: 'rgba(255, 255, 255, 0.16)',
                color: '#ffffff',
                border: '1px solid rgba(255, 255, 255, 0.3)',
                fontWeight: 700,
                fontSize: '0.9rem',
                padding: '10px 18px',
                borderRadius: '12px',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                cursor: 'pointer',
                backdropFilter: 'blur(8px)',
                transition: 'all 0.2s ease',
              }}
              onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255, 255, 255, 0.25)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'rgba(255, 255, 255, 0.16)')}
            >
              <i className="fas fa-plus-circle" />
              Formulate Plan
            </button>

            <button
              onClick={activeSubTab === 'templates' ? fetchTemplates : fetchPlans}
              type="button"
              style={{
                background: 'rgba(255, 255, 255, 0.12)',
                color: '#ffffff',
                border: '1px solid rgba(255, 255, 255, 0.25)',
                fontWeight: 600,
                fontSize: '0.88rem',
                padding: '10px 14px',
                borderRadius: '12px',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
              }}
              title="Refresh register"
            >
              <i className={`fas fa-sync-alt ${loading || loadingTemplates ? 'fa-spin' : ''}`} />
              Refresh
            </button>
          </div>
        </div>

        {/* Sub-tab segmented pill switch */}
        <div
          style={{
            display: 'inline-flex',
            background: 'rgba(0, 0, 0, 0.25)',
            padding: '4px',
            borderRadius: '12px',
            alignSelf: 'flex-start',
            gap: '4px',
            border: '1px solid rgba(255,255,255,0.12)',
          }}
          className="no-print"
        >
          <button
            type="button"
            onClick={() => setActiveSubTab('applications')}
            style={{
              padding: '8px 18px',
              borderRadius: '9px',
              border: 'none',
              fontSize: '0.88rem',
              fontWeight: 800,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              transition: 'all 0.2s',
              background: activeSubTab === 'applications' ? '#ffffff' : 'transparent',
              color: activeSubTab === 'applications' ? '#0c2340' : '#e0f2fe',
              boxShadow: activeSubTab === 'applications' ? '0 2px 8px rgba(0,0,0,0.15)' : 'none',
            }}
          >
            <i className="fas fa-file-contract" />
            Active Contracts & Applications
            <span
              style={{
                fontSize: '0.75rem',
                padding: '1px 7px',
                borderRadius: '10px',
                background: activeSubTab === 'applications' ? '#0284c7' : 'rgba(255,255,255,0.2)',
                color: '#ffffff',
                fontWeight: 800,
              }}
            >
              {plans.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSubTab('templates')}
            style={{
              padding: '8px 18px',
              borderRadius: '9px',
              border: 'none',
              fontSize: '0.88rem',
              fontWeight: 800,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              transition: 'all 0.2s',
              background: activeSubTab === 'templates' ? '#ffffff' : 'transparent',
              color: activeSubTab === 'templates' ? '#0c2340' : '#e0f2fe',
              boxShadow: activeSubTab === 'templates' ? '0 2px 8px rgba(0,0,0,0.15)' : 'none',
            }}
          >
            <i className="fas fa-layer-group" />
            Offered Plan Templates
            <span
              style={{
                fontSize: '0.75rem',
                padding: '1px 7px',
                borderRadius: '10px',
                background: activeSubTab === 'templates' ? '#0284c7' : 'rgba(255,255,255,0.2)',
                color: '#ffffff',
                fontWeight: 800,
              }}
            >
              {templates.length}
            </span>
          </button>
        </div>
      </div>

      {activeSubTab === 'templates' ? (
        /* 2. Offered Templates Section */
        <div className="portal-card animate-in fade-in duration-300" style={{ padding: '24px 28px' }}>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              paddingBottom: '20px',
              borderBottom: '1px solid #f1f5f9',
              flexWrap: 'wrap',
              gap: '16px',
            }}
          >
            <div>
              <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 900, color: '#0f172a' }}>
                Predefined Payment Plan Catalog
              </h2>
              <span style={{ fontSize: '0.88rem', color: '#64748b', fontWeight: 600 }}>
                Standard payment frameworks made available for {t('parents').toLowerCase()} to select during enrollment or fees billing.
              </span>
            </div>

            <button
              onClick={openCreateTemplate}
              type="button"
              style={{
                background: '#0284c7',
                color: '#ffffff',
                border: 'none',
                fontWeight: 800,
                fontSize: '0.88rem',
                padding: '10px 22px',
                borderRadius: '12px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                cursor: 'pointer',
                boxShadow: '0 4px 12px rgba(2, 132, 199, 0.25)',
              }}
            >
              <i className="fas fa-plus" />
              Create New Template
            </button>
          </div>

          <div style={{ marginTop: '24px' }}>
            {loadingTemplates ? (
              <SkeletonLoader type="table" rows={3} columns={4} />
            ) : templates.length === 0 ? (
              <div
                style={{
                  textAlign: 'center',
                  padding: '50px 20px',
                  background: '#f8fafc',
                  borderRadius: '16px',
                  border: '2px dashed #cbd5e1',
                }}
              >
                <i className="fas fa-file-invoice" style={{ fontSize: '42px', color: '#94a3b8', marginBottom: '12px', display: 'block' }} />
                <h3 style={{ color: '#334155', margin: '0 0 6px', fontWeight: 800 }}>No Offered Plans Configured</h3>
                <p style={{ color: '#64748b', margin: '0 0 16px', fontSize: '0.9rem' }}>
                  Formulate standard installment structures to allow automated adoption by guardians.
                </p>
                <button
                  onClick={openCreateTemplate}
                  type="button"
                  style={{
                    background: '#0284c7',
                    color: '#fff',
                    padding: '8px 20px',
                    borderRadius: '10px',
                    fontWeight: 700,
                    border: 'none',
                    cursor: 'pointer',
                  }}
                >
                  <i className="fas fa-plus mr-1" /> Add First Plan
                </button>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '20px' }}>
                {templates.map(tmpl => (
                  <div
                    key={tmpl.id}
                    style={{
                      background: '#ffffff',
                      border: '1px solid #e2e8f0',
                      borderRadius: '16px',
                      padding: '22px',
                      boxShadow: '0 4px 14px rgba(0,0,0,0.03)',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      transition: 'all 0.2s',
                    }}
                    onMouseEnter={e => {
                      e.currentTarget.style.borderColor = '#0284c7';
                      e.currentTarget.style.boxShadow = '0 8px 24px rgba(2, 132, 199, 0.08)';
                    }}
                    onMouseLeave={e => {
                      e.currentTarget.style.borderColor = '#e2e8f0';
                      e.currentTarget.style.boxShadow = '0 4px 14px rgba(0,0,0,0.03)';
                    }}
                  >
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                        <div>
                          <span
                            style={{
                              fontSize: '0.72rem',
                              fontWeight: 800,
                              textTransform: 'uppercase',
                              color: '#0284c7',
                              background: '#e0f2fe',
                              padding: '2px 8px',
                              borderRadius: '6px',
                            }}
                          >
                            OFFERED TEMPLATE
                          </span>
                          <h3 style={{ margin: '8px 0 0', fontSize: '1.15rem', fontWeight: 800, color: '#0f172a' }}>
                            {tmpl.name}
                          </h3>
                        </div>

                        <div
                          style={{
                            fontSize: '1.25rem',
                            fontWeight: 900,
                            color: '#0284c7',
                            background: '#f0f9ff',
                            padding: '6px 12px',
                            borderRadius: '10px',
                            border: '1px solid #bae6fd',
                          }}
                        >
                          {formatCurrency(tmpl.amount)}
                        </div>
                      </div>

                      <div style={{ fontSize: '0.85rem', color: '#64748b', marginBottom: '16px', minHeight: '44px', lineHeight: 1.45 }}>
                        {tmpl.notes || 'Standard school agreement with pre-calculated equal installments.'}
                      </div>

                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          fontSize: '0.8rem',
                          color: '#475569',
                          background: '#f8fafc',
                          padding: '8px 12px',
                          borderRadius: '8px',
                          marginBottom: '16px',
                        }}
                      >
                        <i className="fas fa-calendar-alt" style={{ color: '#0284c7' }} />
                        <span>
                          <strong>Schedule: </strong>
                          {tmpl.dueDate ? format(new Date(tmpl.dueDate), 'dd MMM yyyy') : 'Termly / Flexible Recurring'}
                        </span>
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: '8px', borderTop: '1px solid #f1f5f9', paddingTop: '14px' }}>
                      <button
                        onClick={() => openEnrollModal(tmpl)}
                        type="button"
                        style={{
                          flex: 1,
                          background: '#0284c7',
                          color: '#ffffff',
                          border: 'none',
                          padding: '8px 12px',
                          borderRadius: '8px',
                          fontSize: '0.82rem',
                          fontWeight: 700,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '6px',
                        }}
                      >
                        <i className="fas fa-user-plus" /> Enroll Student
                      </button>

                      <button
                        onClick={() => openEditTemplate(tmpl)}
                        type="button"
                        style={{
                          background: '#f8fafc',
                          color: '#475569',
                          border: '1px solid #cbd5e1',
                          padding: '8px 12px',
                          borderRadius: '8px',
                          cursor: 'pointer',
                        }}
                        title="Edit Template"
                      >
                        <i className="fas fa-pencil-alt" />
                      </button>

                      <button
                        onClick={() => handleDeleteTemplate(tmpl.id)}
                        type="button"
                        style={{
                          background: '#fef2f2',
                          color: '#ef4444',
                          border: '1px solid #fecaca',
                          padding: '8px 12px',
                          borderRadius: '8px',
                          cursor: 'pointer',
                        }}
                        title="Delete Template"
                      >
                        <i className="fas fa-trash" />
                      </button>
                    </div>
                  </div>
                ))}

                {/* Card to formulate new template */}
                <div
                  onClick={openCreateTemplate}
                  style={{
                    border: '2px dashed #cbd5e1',
                    borderRadius: '16px',
                    padding: '24px',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    minHeight: '220px',
                    background: '#f8fafc',
                    transition: 'all 0.2s',
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.borderColor = '#0284c7';
                    e.currentTarget.style.background = '#f0f9ff';
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.borderColor = '#cbd5e1';
                    e.currentTarget.style.background = '#f8fafc';
                  }}
                >
                  <div
                    style={{
                      width: '48px',
                      height: '48px',
                      borderRadius: '50%',
                      background: '#e0f2fe',
                      color: '#0284c7',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '1.25rem',
                      marginBottom: '10px',
                    }}
                  >
                    <i className="fas fa-plus" />
                  </div>
                  <strong style={{ color: '#0f172a', fontSize: '0.95rem' }}>Add Offered Plan Template</strong>
                  <span style={{ fontSize: '0.8rem', color: '#64748b', textAlign: 'center', marginTop: '4px' }}>
                    Formulate structured payment options for term tuition.
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      ) : (
        /* 3. Applications & Contracts Management */
        <>
          {/* Executive KPI Stat Cards (Interactive Filtering) */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
              gap: '16px',
            }}
            className="no-print animate-in fade-in duration-300"
          >
            {[
              {
                id: 'ALL',
                label: 'Total Agreements',
                value: stats.total,
                subtext: `${formatCurrency(stats.totalCommitted)} Total Value`,
                icon: 'fa-handshake',
                color: '#0284c7',
                bg: 'linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%)',
                badgeBg: '#bae6fd',
              },
              {
                id: 'PENDING',
                label: 'Pending Review',
                value: stats.pending,
                subtext: 'Awaiting Administrator Decision',
                icon: 'fa-hourglass-half',
                color: '#d97706',
                bg: 'linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%)',
                badgeBg: '#fde68a',
              },
              {
                id: 'ACTIVE',
                label: 'Active & Compliant',
                value: stats.active,
                subtext: 'Installments On Schedule',
                icon: 'fa-shield-check',
                color: '#059669',
                bg: 'linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%)',
                badgeBg: '#a7f3d0',
              },
              {
                id: 'OVERDUE',
                label: 'Overdue / Breached',
                value: stats.overdue,
                subtext: 'Missed Settlement Windows',
                icon: 'fa-exclamation-triangle',
                color: '#dc2626',
                bg: 'linear-gradient(135deg, #fff1f2 0%, #fee2e2 100%)',
                badgeBg: '#fecdd3',
              },
              {
                id: 'GRACE',
                label: 'Gate Entry Grace',
                value: stats.grace,
                subtext: 'Humanitarian Gate Overrides',
                icon: 'fa-id-badge',
                color: '#7c3aed',
                bg: 'linear-gradient(135deg, #f5f3ff 0%, #ede9fe 100%)',
                badgeBg: '#ddd6fe',
              },
            ].map(card => {
              const isSelected = activeCardFilter === card.id || (card.id === 'ALL' && activeCardFilter === null);
              return (
                <div
                  key={card.id}
                  onClick={() => setActiveCardFilter(card.id === 'ALL' ? null : (activeCardFilter === card.id ? null : card.id))}
                  style={{
                    background: card.bg,
                    borderRadius: '16px',
                    padding: '18px 20px',
                    border: isSelected ? `2px solid ${card.color}` : '1px solid rgba(0,0,0,0.06)',
                    boxShadow: isSelected
                      ? `0 8px 20px -2px rgba(0, 0, 0, 0.12), 0 0 0 3px ${card.color}22`
                      : '0 2px 10px rgba(0,0,0,0.02)',
                    cursor: 'pointer',
                    transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                  }}
                  onMouseEnter={e => (e.currentTarget.style.transform = 'translateY(-2px)')}
                  onMouseLeave={e => (e.currentTarget.style.transform = 'translateY(0)')}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                    <span style={{ fontSize: '0.82rem', fontWeight: 800, color: '#334155' }}>
                      {card.label}
                    </span>
                    <div
                      style={{
                        width: '36px',
                        height: '36px',
                        borderRadius: '10px',
                        background: card.badgeBg,
                        color: card.color,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '1rem',
                      }}
                    >
                      <i className={`fas ${card.icon}`} />
                    </div>
                  </div>

                  <div>
                    <div style={{ fontSize: '1.9rem', fontWeight: 900, color: '#0f172a', lineHeight: 1.1 }}>
                      {card.value}
                    </div>
                    <div style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 600, marginTop: '6px' }}>
                      {card.subtext}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Active Filter Notification */}
          {activeCardFilter && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                background: '#f0f9ff',
                border: '1px solid #bae6fd',
                padding: '8px 16px',
                borderRadius: '10px',
                fontSize: '0.85rem',
                color: '#0369a1',
              }}
              className="no-print"
            >
              <span>
                <i className="fas fa-filter mr-2" />
                Filtered by card: <strong>{activeCardFilter}</strong>
              </span>
              <button
                type="button"
                onClick={() => setActiveCardFilter(null)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#0369a1',
                  fontWeight: 800,
                  cursor: 'pointer',
                  textDecoration: 'underline',
                }}
              >
                Clear Card Filter
              </button>
            </div>
          )}

          {/* Search & Status Filters Bar */}
          <div
            className="portal-card no-print"
            style={{
              padding: '16px 20px',
              display: 'flex',
              gap: '14px',
              alignItems: 'center',
              flexWrap: 'wrap',
              background: '#ffffff',
              borderRadius: '16px',
            }}
          >
            <div style={{ flex: 1, minWidth: '280px' }}>
              <SearchInput
                value={searchTerm}
                onChange={setSearchTerm}
                placeholder="Search by student name, student ID, class, parent name or email..."
              />
            </div>

            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
              <select
                className="portal-input"
                style={{ margin: 0, width: '180px', height: '42px', fontSize: '0.88rem', fontWeight: 600 }}
                value={filterStatus}
                onChange={e => setFilterStatus(e.target.value)}
              >
                <option value="">All Statuses</option>
                {Object.keys(STATUS_CONFIG).map(s => (
                  <option key={s} value={s}>
                    {STATUS_CONFIG[s].label}
                  </option>
                ))}
              </select>

              <select
                className="portal-input"
                style={{ margin: 0, width: '190px', height: '42px', fontSize: '0.88rem', fontWeight: 600 }}
                value={filterGrace}
                onChange={e => setFilterGrace(e.target.value as 'all' | 'grace' | 'strict')}
              >
                <option value="all">Gate: All Students</option>
                <option value="grace">🛡️ Grace Active Only</option>
                <option value="strict">⛔ Strict Gating Only</option>
              </select>

              {(filterStatus || filterGrace !== 'all' || searchTerm) && (
                <button
                  type="button"
                  onClick={() => {
                    setFilterStatus('');
                    setFilterGrace('all');
                    setSearchTerm('');
                    setActiveCardFilter(null);
                  }}
                  style={{
                    background: '#f1f5f9',
                    border: 'none',
                    color: '#64748b',
                    padding: '8px 14px',
                    borderRadius: '8px',
                    fontWeight: 700,
                    fontSize: '0.82rem',
                    cursor: 'pointer',
                  }}
                >
                  <i className="fas fa-times mr-1" /> Reset
                </button>
              )}
            </div>
          </div>

          {/* Applications Master Table Card */}
          <div className="portal-card animate-in fade-in duration-300" style={{ padding: '0', borderRadius: '16px', overflow: 'hidden' }}>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '16px',
                padding: '20px 24px',
                borderBottom: '1px solid #f1f5f9',
                background: '#ffffff',
              }}
            >
              <div>
                <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 900, color: '#0f172a' }}>
                  Student Payment Plan Applications & Contracts
                </h2>
                <span style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: 600 }}>
                  Showing {filteredPlans.length} agreement(s) of {plans.length} total
                </span>
              </div>

              <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }} className="no-print">
                <ExportButton
                  data={filteredPlans.map(plan => ({
                    studentName: plan.student?.name || 'N/A',
                    studentId: plan.student?.studentId || 'N/A',
                    className: plan.student?.class?.name || 'N/A',
                    parentName: plan.parentUser?.name || 'N/A',
                    parentEmail: plan.parentUser?.email || 'N/A',
                    amount: formatCurrency(plan.amount),
                    planType: plan.planType || 'Custom',
                    installmentsCount: plan.installmentsCount || plan.installments?.length || 1,
                    dueDate: plan.dueDate ? format(new Date(plan.dueDate), 'dd MMM yyyy') : 'N/A',
                    createdAt: plan.createdAt ? format(new Date(plan.createdAt), 'dd MMM yyyy') : 'N/A',
                    status: plan.status,
                    gateGrace: plan.allowGateEntry ? 'Granted' : 'Strict',
                  }))}
                  columns={[
                    { header: `${t('student')} Name`, key: 'studentName', width: 24 },
                    { header: 'Student ID', key: 'studentId', width: 16 },
                    { header: 'Class', key: 'className', width: 14 },
                    { header: `${t('parent')} Name`, key: 'parentName', width: 22 },
                    { header: 'Parent Email', key: 'parentEmail', width: 24 },
                    { header: 'Total Value', key: 'amount', width: 14 },
                    { header: 'Plan Structure', key: 'planType', width: 15 },
                    { header: 'Splits', key: 'installmentsCount', width: 10 },
                    { header: 'Next Due', key: 'dueDate', width: 15 },
                    { header: 'Created', key: 'createdAt', width: 15 },
                    { header: 'Agreement Status', key: 'status', width: 16 },
                    { header: 'Gate Exemption', key: 'gateGrace', width: 15 },
                  ]}
                  filename="acadex-payment-plans-register"
                  title={`${schoolName} Payment Plan Register`}
                  subtitle={`Total Active Agreements: ${filteredPlans.length}`}
                />

                <button
                  type="button"
                  onClick={() => window.print()}
                  style={{
                    background: '#f8fafc',
                    border: '1px solid #cbd5e1',
                    color: '#334155',
                    padding: '8px 16px',
                    borderRadius: '8px',
                    fontSize: '0.85rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                  title="Print / Save PDF"
                >
                  <i className="fas fa-print" />
                  Print
                </button>
              </div>
            </div>

            <div>
              {loading ? (
                <div style={{ padding: '24px' }}>
                  <SkeletonLoader type="table" rows={6} columns={7} />
                </div>
              ) : filteredPlans.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '60px 24px', background: '#fafafa' }}>
                  <div
                    style={{
                      width: '64px',
                      height: '64px',
                      borderRadius: '50%',
                      background: '#e0f2fe',
                      color: '#0284c7',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '28px',
                      margin: '0 auto 16px',
                    }}
                  >
                    <i className="fas fa-file-contract" />
                  </div>
                  <h3 style={{ color: '#0f172a', margin: '0 0 6px', fontWeight: 800 }}>
                    {plans.length === 0 ? 'No Payment Plans Registered Yet' : 'No Payment Plans Match Filters'}
                  </h3>
                  <p style={{ color: '#64748b', margin: '0 auto 20px', maxWidth: '420px', fontSize: '0.9rem' }}>
                    {plans.length === 0
                      ? 'Establish installment plans for students with outstanding fees to ensure humanitarian school access.'
                      : 'Try resetting search keywords or choosing "All Statuses" to see existing contracts.'}
                  </p>
                  {plans.length === 0 ? (
                    <button
                      onClick={() => openEnrollModal()}
                      type="button"
                      style={{
                        background: '#0284c7',
                        color: '#ffffff',
                        border: 'none',
                        padding: '10px 24px',
                        borderRadius: '10px',
                        fontWeight: 800,
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '8px',
                      }}
                    >
                      <i className="fas fa-user-plus" /> Enroll First Student
                    </button>
                  ) : (
                    <button
                      onClick={() => {
                        setFilterStatus('');
                        setFilterGrace('all');
                        setSearchTerm('');
                        setActiveCardFilter(null);
                      }}
                      type="button"
                      style={{
                        background: '#f1f5f9',
                        color: '#475569',
                        border: 'none',
                        padding: '8px 18px',
                        borderRadius: '8px',
                        fontWeight: 700,
                        cursor: 'pointer',
                      }}
                    >
                      Reset All Filters
                    </button>
                  )}
                </div>
              ) : (
                <PaginatedTable className="portal-table">
                  <thead>
                    <tr>
                      <th style={{ minWidth: '220px' }}>{t('student')}</th>
                      <th style={{ minWidth: '180px' }}>{t('parent')} / Guardian</th>
                      <th>Plan Value & Splits</th>
                      <th>Next Due Date</th>
                      <th>Contract Status</th>
                      <th style={{ minWidth: '160px' }}>Gate Entry (Grace)</th>
                      <th className="no-print" style={{ textAlign: 'right', minWidth: '200px' }}>
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredPlans.map(plan => {
                      const cfg = STATUS_CONFIG[plan.status] || STATUS_CONFIG.PENDING;
                      const isUpdating = updatingId === plan.id;
                      const nextDue = plan.dueDate ? new Date(plan.dueDate) : null;
                      const overdue = nextDue ? isPast(nextDue) && !isToday(nextDue) && plan.status !== 'PAID' && plan.status !== 'COMPLETED' : false;
                      const daysDiff = nextDue ? differenceInDays(nextDue, new Date()) : 0;

                      const totalInstallments = plan.installments?.length || plan.installmentsCount || 1;
                      const paidInstallments = plan.installments ? plan.installments.filter(i => i.status === 'PAID').length : (plan.status === 'PAID' ? 1 : 0);

                      return (
                        <tr
                          key={plan.id}
                          style={{
                            background: plan.status === 'DEFAULTED' ? '#fff5f5' : (overdue ? '#fff8f8' : undefined),
                            transition: 'background 0.2s',
                          }}
                        >
                          {/* Student Details */}
                          <td>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                              <div
                                style={{
                                  width: '38px',
                                  height: '38px',
                                  borderRadius: '50%',
                                  background: 'linear-gradient(135deg, #0284c7, #0369a1)',
                                  color: '#ffffff',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  fontWeight: 800,
                                  fontSize: '0.85rem',
                                  flexShrink: 0,
                                }}
                              >
                                {plan.student.name ? plan.student.name.charAt(0).toUpperCase() : 'S'}
                              </div>
                              <div>
                                <div style={{ fontWeight: 800, color: '#0f172a', fontSize: '0.92rem' }}>
                                  {plan.student.name}
                                </div>
                                <div style={{ display: 'flex', gap: '6px', alignItems: 'center', marginTop: '2px' }}>
                                  <span
                                    style={{
                                      fontSize: '0.72rem',
                                      fontWeight: 700,
                                      background: '#f1f5f9',
                                      color: '#475569',
                                      padding: '1px 6px',
                                      borderRadius: '4px',
                                    }}
                                  >
                                    {plan.student.studentId}
                                  </span>
                                  {plan.student.class?.name && (
                                    <span
                                      style={{
                                        fontSize: '0.72rem',
                                        fontWeight: 700,
                                        background: '#e0f2fe',
                                        color: '#0369a1',
                                        padding: '1px 6px',
                                        borderRadius: '4px',
                                      }}
                                    >
                                      {plan.student.class.name}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                          </td>

                          {/* Parent Details */}
                          <td>
                            <div style={{ fontWeight: 700, color: '#1e293b', fontSize: '0.9rem' }}>
                              {plan.parentUser?.name || 'Direct / Enrolled Student'}
                            </div>
                            {plan.parentUser?.email ? (
                              <a
                                href={`mailto:${plan.parentUser.email}`}
                                style={{
                                  fontSize: '0.78rem',
                                  color: '#0284c7',
                                  textDecoration: 'none',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '4px',
                                  marginTop: '2px',
                                }}
                              >
                                <i className="fas fa-envelope" style={{ fontSize: '0.7rem' }} />
                                {plan.parentUser.email}
                              </a>
                            ) : (
                              <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>No email provided</span>
                            )}
                          </td>

                          {/* Plan Value & Splits */}
                          <td>
                            <div style={{ fontWeight: 900, color: '#0f172a', fontSize: '1rem' }}>
                              {formatCurrency(plan.amount)}
                            </div>
                            <div style={{ display: 'flex', gap: '6px', alignItems: 'center', marginTop: '2px' }}>
                              <span
                                style={{
                                  fontSize: '0.72rem',
                                  fontWeight: 700,
                                  background: '#f8fafc',
                                  color: '#475569',
                                  border: '1px solid #e2e8f0',
                                  padding: '1px 6px',
                                  borderRadius: '4px',
                                  textTransform: 'capitalize',
                                }}
                              >
                                {plan.planType || 'Installment'}
                              </span>
                              <span
                                style={{
                                  fontSize: '0.72rem',
                                  fontWeight: 700,
                                  color: paidInstallments === totalInstallments ? '#15803d' : '#0284c7',
                                }}
                              >
                                {paidInstallments}/{totalInstallments} paid
                              </span>
                            </div>
                          </td>

                          {/* Promised Due Date */}
                          <td>
                            {nextDue ? (
                              <div>
                                <div style={{ fontSize: '0.88rem', fontWeight: 700, color: overdue ? '#dc2626' : '#1e293b' }}>
                                  {format(nextDue, 'dd MMM yyyy')}
                                </div>
                                <div style={{ marginTop: '2px' }}>
                                  {plan.status === 'PAID' || plan.status === 'COMPLETED' ? (
                                    <span style={{ fontSize: '0.72rem', fontWeight: 800, color: '#16a34a' }}>
                                      <i className="fas fa-check-circle mr-1" /> Settled
                                    </span>
                                  ) : isToday(nextDue) ? (
                                    <span style={{ fontSize: '0.72rem', fontWeight: 800, color: '#d97706', background: '#fef3c7', padding: '1px 6px', borderRadius: '4px' }}>
                                      Due Today
                                    </span>
                                  ) : overdue ? (
                                    <span style={{ fontSize: '0.72rem', fontWeight: 800, color: '#dc2626', background: '#fee2e2', padding: '1px 6px', borderRadius: '4px' }}>
                                      Overdue by {Math.abs(daysDiff)}d
                                    </span>
                                  ) : (
                                    <span style={{ fontSize: '0.72rem', fontWeight: 600, color: '#64748b' }}>
                                      Due in {daysDiff}d
                                    </span>
                                  )}
                                </div>
                              </div>
                            ) : (
                              <span style={{ color: '#94a3b8', fontStyle: 'italic', fontSize: '0.85rem' }}>
                                Open / Flexible
                              </span>
                            )}
                          </td>

                          {/* Status Badge */}
                          <td>
                            <span
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '6px',
                                padding: '4px 10px',
                                borderRadius: '20px',
                                fontSize: '0.75rem',
                                fontWeight: 800,
                                background: cfg.bg,
                                color: cfg.color,
                                border: `1px solid ${cfg.border}`,
                              }}
                            >
                              <i className={`fas ${cfg.icon}`} style={{ fontSize: '0.75rem' }} />
                              {cfg.label}
                            </span>
                          </td>

                          {/* Gate Entry Grace Switch */}
                          <td>
                            <button
                              type="button"
                              onClick={() => toggleGateEntry(plan.id, !!plan.allowGateEntry)}
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '6px',
                                padding: '6px 12px',
                                borderRadius: '8px',
                                border: plan.allowGateEntry ? '1px solid #86efac' : '1px solid #cbd5e1',
                                fontSize: '0.78rem',
                                fontWeight: 800,
                                cursor: 'pointer',
                                background: plan.allowGateEntry
                                  ? 'linear-gradient(135deg, #dcfce7, #bbf7d0)'
                                  : '#f8fafc',
                                color: plan.allowGateEntry ? '#166534' : '#64748b',
                                transition: 'all 0.15s ease',
                                boxShadow: plan.allowGateEntry ? '0 2px 8px rgba(34, 197, 94, 0.2)' : 'none',
                              }}
                              title="Humanitarian Exception: Click to toggle whether student can scan through turnstiles despite payment agreement status"
                            >
                              <i className={plan.allowGateEntry ? 'fas fa-shield-alt' : 'fas fa-ban'} />
                              {plan.allowGateEntry ? 'Grace Active' : 'Strict Gate'}
                            </button>
                          </td>

                          {/* Actions */}
                          <td className="no-print" style={{ textAlign: 'right' }}>
                            <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                              {/* Inspect Schedule & Installments Button */}
                              <button
                                type="button"
                                onClick={() => setInspectPlan(plan)}
                                style={{
                                  background: '#f0f9ff',
                                  color: '#0284c7',
                                  border: '1px solid #bae6fd',
                                  padding: '6px 10px',
                                  borderRadius: '8px',
                                  fontSize: '0.78rem',
                                  fontWeight: 700,
                                  cursor: 'pointer',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '5px',
                                }}
                                title="Inspect scheduled installments and record counter payments"
                              >
                                <i className="fas fa-list-ol" />
                                Schedule
                              </button>

                              {plan.status === 'PENDING' && (
                                <>
                                  <button
                                    type="button"
                                    onClick={() => updateStatus(plan.id, 'APPROVED')}
                                    disabled={isUpdating}
                                    style={{
                                      background: '#10b981',
                                      color: '#ffffff',
                                      border: 'none',
                                      padding: '6px 12px',
                                      borderRadius: '8px',
                                      fontSize: '0.78rem',
                                      fontWeight: 800,
                                      cursor: 'pointer',
                                    }}
                                  >
                                    {isUpdating ? <i className="fas fa-spinner fa-spin" /> : 'Approve'}
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => updateStatus(plan.id, 'REJECTED')}
                                    disabled={isUpdating}
                                    style={{
                                      background: '#fef2f2',
                                      color: '#ef4444',
                                      border: '1px solid #fecaca',
                                      padding: '6px 10px',
                                      borderRadius: '8px',
                                      fontSize: '0.78rem',
                                      fontWeight: 700,
                                      cursor: 'pointer',
                                    }}
                                  >
                                    Decline
                                  </button>
                                </>
                              )}

                              {(plan.status === 'APPROVED' || plan.status === 'ACTIVE') && (
                                <button
                                  type="button"
                                  onClick={() => updateStatus(plan.id, 'PAID')}
                                  disabled={isUpdating}
                                  style={{
                                    background: '#0284c7',
                                    color: '#ffffff',
                                    border: 'none',
                                    padding: '6px 12px',
                                    borderRadius: '8px',
                                    fontSize: '0.78rem',
                                    fontWeight: 800,
                                    cursor: 'pointer',
                                  }}
                                  title="Mark agreement completely settled"
                                >
                                  {isUpdating ? <i className="fas fa-spinner fa-spin" /> : 'Mark Settled'}
                                </button>
                              )}

                              {(plan.status === 'OVERDUE' || plan.status === 'DEFAULTED') && (
                                <button
                                  type="button"
                                  onClick={() => showToast(`Payment demand notice dispatched to ${plan.parentUser?.email || plan.student.name}`, 'success')}
                                  style={{
                                    background: '#fee2e2',
                                    color: '#b91c1c',
                                    border: '1px solid #fca5a5',
                                    padding: '6px 10px',
                                    borderRadius: '8px',
                                    fontSize: '0.78rem',
                                    fontWeight: 700,
                                    cursor: 'pointer',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '4px',
                                  }}
                                >
                                  <i className="fas fa-bell" /> Remind
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </PaginatedTable>
              )}
            </div>
          </div>
        </>
      )}

      {/* 4. MODAL: ENROLL STUDENT IN PAYMENT PLAN */}
      {showEnrollModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.7)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: '20px',
          }}
        >
          <div
            className="portal-card animate-in zoom-in duration-200"
            style={{
              width: '100%',
              maxWidth: '680px',
              maxHeight: '92vh',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
              padding: 0,
              borderRadius: '20px',
              boxShadow: '0 25px 60px -15px rgba(0,0,0,0.3)',
            }}
          >
            {/* Modal Header */}
            <div
              style={{
                padding: '24px 30px',
                background: 'linear-gradient(135deg, #0c2340 0%, #0369a1 100%)',
                color: '#ffffff',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <div>
                <span
                  style={{
                    fontSize: '0.72rem',
                    fontWeight: 800,
                    textTransform: 'uppercase',
                    background: 'rgba(255,255,255,0.18)',
                    padding: '3px 8px',
                    borderRadius: '6px',
                  }}
                >
                  ADMINISTRATIVE REGISTRATION
                </span>
                <h2 style={{ color: '#ffffff', margin: '6px 0 0', fontSize: '1.3rem', fontWeight: 900 }}>
                  <i className="fas fa-user-plus mr-2" />
                  Enroll Student in Payment Plan
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setShowEnrollModal(false)}
                style={{ background: 'none', border: 'none', color: '#fff', fontSize: '1.25rem', cursor: 'pointer' }}
              >
                <i className="fas fa-times" />
              </button>
            </div>

            {/* Modal Body */}
            <div style={{ padding: '28px 30px', overflowY: 'auto', flex: 1 }}>
              <form onSubmit={handleCreatePaymentPlan}>
                {/* Student Selection */}
                <div style={{ marginBottom: '20px' }}>
                  <label className="portal-label" style={{ fontWeight: 800, color: '#1e293b' }}>
                    Select Student *
                  </label>
                  <input
                    type="text"
                    className="portal-input"
                    placeholder="Search by student name, ID, or class..."
                    value={enrollStudentSearch}
                    onChange={e => setEnrollStudentSearch(e.target.value)}
                    style={{ marginBottom: '8px' }}
                  />

                  {loadingStudents ? (
                    <div style={{ padding: '10px', fontSize: '0.85rem', color: '#64748b' }}>
                      <i className="fas fa-spinner fa-spin mr-2" /> Loading student roster...
                    </div>
                  ) : (
                    <div
                      style={{
                        maxHeight: '140px',
                        overflowY: 'auto',
                        border: '1px solid #cbd5e1',
                        borderRadius: '10px',
                        background: '#ffffff',
                      }}
                    >
                      {filteredEnrollStudents.length === 0 ? (
                        <div style={{ padding: '12px', fontSize: '0.85rem', color: '#94a3b8', textAlign: 'center' }}>
                          No students matched your search
                        </div>
                      ) : (
                        filteredEnrollStudents.map(st => {
                          const isSelected = enrollForm.studentId === st.id;
                          return (
                            <div
                              key={st.id}
                              onClick={() => setEnrollForm(f => ({ ...f, studentId: st.id }))}
                              style={{
                                padding: '8px 14px',
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                cursor: 'pointer',
                                background: isSelected ? '#e0f2fe' : '#ffffff',
                                borderBottom: '1px solid #f1f5f9',
                              }}
                            >
                              <div>
                                <strong style={{ fontSize: '0.9rem', color: '#0f172a' }}>{st.name}</strong>
                                <span style={{ fontSize: '0.78rem', color: '#64748b', marginLeft: '8px' }}>
                                  ({st.studentId})
                                </span>
                              </div>
                              {st.class?.name && (
                                <span
                                  style={{
                                    fontSize: '0.72rem',
                                    fontWeight: 700,
                                    background: '#f1f5f9',
                                    padding: '2px 8px',
                                    borderRadius: '4px',
                                  }}
                                >
                                  {st.class.name}
                                </span>
                              )}
                            </div>
                          );
                        })
                      )}
                    </div>
                  )}

                  {selectedStudentObj && (
                    <div
                      style={{
                        marginTop: '8px',
                        background: '#ecfdf5',
                        border: '1px solid #a7f3d0',
                        color: '#065f46',
                        padding: '8px 12px',
                        borderRadius: '8px',
                        fontSize: '0.85rem',
                        fontWeight: 700,
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                      }}
                    >
                      <i className="fas fa-check-circle" />
                      Selected: {selectedStudentObj.name} ({selectedStudentObj.studentId}) - {selectedStudentObj.class?.name || 'General'}
                    </div>
                  )}
                </div>

                {/* Amount & Schedule Grid */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '20px' }}>
                  <div>
                    <label className="portal-label" style={{ fontWeight: 800 }}>Total Plan Amount ($) *</label>
                    <input
                      type="number"
                      step="0.01"
                      min="1"
                      className="portal-input"
                      placeholder="e.g. 450.00"
                      value={enrollForm.totalAmount}
                      onChange={e => setEnrollForm(f => ({ ...f, totalAmount: e.target.value }))}
                      required
                    />
                  </div>

                  <div>
                    <label className="portal-label" style={{ fontWeight: 800 }}>Start Date *</label>
                    <input
                      type="date"
                      className="portal-input"
                      value={enrollForm.startDate}
                      onChange={e => setEnrollForm(f => ({ ...f, startDate: e.target.value }))}
                      required
                    />
                  </div>

                  <div>
                    <label className="portal-label" style={{ fontWeight: 800 }}>Billing Cadence</label>
                    <select
                      className="portal-input"
                      value={enrollForm.planType}
                      onChange={e => setEnrollForm(f => ({ ...f, planType: e.target.value }))}
                    >
                      <option value="monthly">Monthly Recurring</option>
                      <option value="biweekly">Bi-Weekly (Fortnightly)</option>
                      <option value="weekly">Weekly</option>
                    </select>
                  </div>

                  <div>
                    <label className="portal-label" style={{ fontWeight: 800 }}>Number of Installments (Splits)</label>
                    <select
                      className="portal-input"
                      value={enrollForm.installmentsCount}
                      onChange={e => setEnrollForm(f => ({ ...f, installmentsCount: Number(e.target.value) }))}
                    >
                      {[2, 3, 4, 5, 6, 8, 10, 12].map(num => (
                        <option key={num} value={num}>
                          {num} equal installments
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Real-time Installments Calculator Preview */}
                {simulatedInstallments.length > 0 && (
                  <div
                    style={{
                      background: '#f8fafc',
                      border: '1px solid #e2e8f0',
                      borderRadius: '12px',
                      padding: '16px',
                      marginBottom: '24px',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                      <strong style={{ fontSize: '0.88rem', color: '#0f172a' }}>
                        <i className="fas fa-calculator mr-2" style={{ color: '#0284c7' }} />
                        Generated Installment Schedule Preview
                      </strong>
                      <span style={{ fontSize: '0.78rem', color: '#64748b' }}>
                        ~{formatCurrency(simulatedInstallments[0].amount)} / split
                      </span>
                    </div>

                    <div style={{ maxHeight: '130px', overflowY: 'auto' }}>
                      <table style={{ width: '100%', fontSize: '0.82rem', borderCollapse: 'collapse' }}>
                        <thead>
                          <tr style={{ color: '#64748b', textAlign: 'left', borderBottom: '1px solid #e2e8f0' }}>
                            <th style={{ padding: '4px 6px' }}>Split</th>
                            <th style={{ padding: '4px 6px' }}>Scheduled Date</th>
                            <th style={{ padding: '4px 6px', textAlign: 'right' }}>Amount</th>
                          </tr>
                        </thead>
                        <tbody>
                          {simulatedInstallments.map(item => (
                            <tr key={item.index} style={{ borderBottom: '1px solid #f1f5f9' }}>
                              <td style={{ padding: '6px' }}>Installment #{item.index}</td>
                              <td style={{ padding: '6px' }}>{format(item.dueDate, 'dd MMM yyyy')}</td>
                              <td style={{ padding: '6px', textAlign: 'right', fontWeight: 800, color: '#0284c7' }}>
                                {formatCurrency(item.amount)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* Form Buttons */}
                <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                  <button
                    type="button"
                    onClick={() => setShowEnrollModal(false)}
                    style={{
                      background: '#f1f5f9',
                      border: 'none',
                      padding: '10px 20px',
                      borderRadius: '10px',
                      fontWeight: 700,
                      cursor: 'pointer',
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submittingEnroll}
                    style={{
                      background: '#0284c7',
                      color: '#ffffff',
                      border: 'none',
                      padding: '10px 26px',
                      borderRadius: '10px',
                      fontWeight: 800,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      boxShadow: '0 4px 14px rgba(2, 132, 199, 0.3)',
                    }}
                  >
                    {submittingEnroll ? <i className="fas fa-spinner fa-spin" /> : <i className="fas fa-check" />}
                    Confirm & Enroll Student
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* 5. MODAL: INSPECT INSTALLMENTS & RECORD PAYMENTS */}
      {inspectPlan && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.7)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: '20px',
          }}
        >
          <div
            className="portal-card animate-in zoom-in duration-200"
            style={{
              width: '100%',
              maxWidth: '720px',
              maxHeight: '90vh',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
              padding: 0,
              borderRadius: '20px',
              boxShadow: '0 25px 60px -15px rgba(0,0,0,0.3)',
            }}
          >
            {/* Inspector Header */}
            <div
              style={{
                padding: '24px 30px',
                background: 'linear-gradient(135deg, #0c2340 0%, #0369a1 100%)',
                color: '#ffffff',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <div>
                <span
                  style={{
                    fontSize: '0.72rem',
                    fontWeight: 800,
                    textTransform: 'uppercase',
                    background: 'rgba(255,255,255,0.18)',
                    padding: '3px 8px',
                    borderRadius: '6px',
                  }}
                >
                  CONTRACT SCHEDULE BREAKDOWN
                </span>
                <h2 style={{ color: '#ffffff', margin: '6px 0 0', fontSize: '1.3rem', fontWeight: 900 }}>
                  {inspectPlan.student.name} • {formatCurrency(inspectPlan.amount)}
                </h2>
                <span style={{ fontSize: '0.85rem', color: '#bae6fd' }}>
                  ID: {inspectPlan.student.studentId} • Parent: {inspectPlan.parentUser?.name || 'N/A'}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setInspectPlan(null)}
                style={{ background: 'none', border: 'none', color: '#fff', fontSize: '1.25rem', cursor: 'pointer' }}
              >
                <i className="fas fa-times" />
              </button>
            </div>

            {/* Inspector Body */}
            <div style={{ padding: '24px 30px', overflowY: 'auto', flex: 1 }}>
              {/* Top Summary Bar */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(3, 1fr)',
                  gap: '12px',
                  marginBottom: '20px',
                  background: '#f8fafc',
                  padding: '16px',
                  borderRadius: '12px',
                  border: '1px solid #e2e8f0',
                }}
              >
                <div>
                  <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600 }}>Total Agreed</span>
                  <div style={{ fontSize: '1.25rem', fontWeight: 900, color: '#0f172a' }}>
                    {formatCurrency(inspectPlan.amount)}
                  </div>
                </div>

                <div>
                  <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600 }}>Humanitarian Gate Grace</span>
                  <div style={{ marginTop: '4px' }}>
                    <button
                      type="button"
                      onClick={() => toggleGateEntry(inspectPlan.id, !!inspectPlan.allowGateEntry)}
                      style={{
                        padding: '4px 10px',
                        borderRadius: '6px',
                        border: 'none',
                        fontSize: '0.75rem',
                        fontWeight: 800,
                        cursor: 'pointer',
                        background: inspectPlan.allowGateEntry ? '#dcfce7' : '#fee2e2',
                        color: inspectPlan.allowGateEntry ? '#15803d' : '#b91c1c',
                      }}
                    >
                      {inspectPlan.allowGateEntry ? '🛡️ Grace Active' : '⛔ Strict Gating'}
                    </button>
                  </div>
                </div>

                <div>
                  <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600 }}>Contract Status</span>
                  <div style={{ marginTop: '4px' }}>
                    <span
                      style={{
                        padding: '3px 8px',
                        borderRadius: '6px',
                        fontSize: '0.75rem',
                        fontWeight: 800,
                        background: STATUS_CONFIG[inspectPlan.status]?.bg || '#f1f5f9',
                        color: STATUS_CONFIG[inspectPlan.status]?.color || '#475569',
                      }}
                    >
                      {STATUS_CONFIG[inspectPlan.status]?.label || inspectPlan.status}
                    </span>
                  </div>
                </div>
              </div>

              {/* Installments Table */}
              <h3 style={{ margin: '0 0 12px', fontSize: '1rem', fontWeight: 800, color: '#0f172a' }}>
                Scheduled Payment Milestones
              </h3>

              {(!inspectPlan.installments || inspectPlan.installments.length === 0) ? (
                <div style={{ padding: '30px', textAlign: 'center', color: '#64748b', background: '#f8fafc', borderRadius: '10px' }}>
                  No installment splits generated for this plan. You can mark the entire agreement as settled below.
                  <div style={{ marginTop: '12px' }}>
                    <button
                      onClick={() => updateStatus(inspectPlan.id, 'PAID')}
                      style={{
                        background: '#0284c7',
                        color: '#fff',
                        border: 'none',
                        padding: '8px 18px',
                        borderRadius: '8px',
                        fontWeight: 700,
                        cursor: 'pointer',
                      }}
                    >
                      Mark Entire Plan Settled
                    </button>
                  </div>
                </div>
              ) : (
                <div style={{ border: '1px solid #e2e8f0', borderRadius: '12px', overflow: 'hidden' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.88rem' }}>
                    <thead>
                      <tr style={{ background: '#f8fafc', textAlign: 'left', borderBottom: '1px solid #e2e8f0', color: '#475569' }}>
                        <th style={{ padding: '10px 14px' }}>#</th>
                        <th style={{ padding: '10px 14px' }}>Due Date</th>
                        <th style={{ padding: '10px 14px' }}>Amount</th>
                        <th style={{ padding: '10px 14px' }}>Status</th>
                        <th style={{ padding: '10px 14px', textAlign: 'right' }}>Counter Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {inspectPlan.installments.map((inst, idx) => {
                        const isPaid = inst.status === 'PAID';
                        const isOver = inst.status === 'OVERDUE' || (isPast(new Date(inst.dueDate)) && !isPaid);
                        return (
                          <tr key={inst.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                            <td style={{ padding: '12px 14px', fontWeight: 700 }}>Split {idx + 1}</td>
                            <td style={{ padding: '12px 14px' }}>
                              {format(new Date(inst.dueDate), 'dd MMM yyyy')}
                            </td>
                            <td style={{ padding: '12px 14px', fontWeight: 800, color: '#0284c7' }}>
                              {formatCurrency(inst.amount)}
                            </td>
                            <td style={{ padding: '12px 14px' }}>
                              <span
                                style={{
                                  fontSize: '0.75rem',
                                  fontWeight: 800,
                                  padding: '3px 8px',
                                  borderRadius: '6px',
                                  background: isPaid ? '#dcfce7' : isOver ? '#fee2e2' : '#fef3c7',
                                  color: isPaid ? '#15803d' : isOver ? '#dc2626' : '#b45309',
                                }}
                              >
                                {inst.status}
                              </span>
                            </td>
                            <td style={{ padding: '12px 14px', textAlign: 'right' }}>
                              {!isPaid ? (
                                <button
                                  type="button"
                                  onClick={() => setPaymentMethodModal({ installmentId: inst.id, amount: inst.amount })}
                                  style={{
                                    background: '#0284c7',
                                    color: '#ffffff',
                                    border: 'none',
                                    padding: '6px 14px',
                                    borderRadius: '8px',
                                    fontSize: '0.78rem',
                                    fontWeight: 800,
                                    cursor: 'pointer',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '6px',
                                  }}
                                >
                                  <i className="fas fa-cash-register" /> Pay
                                </button>
                              ) : (
                                <span style={{ color: '#16a34a', fontSize: '0.8rem', fontWeight: 700 }}>
                                  <i className="fas fa-check mr-1" /> Paid
                                </span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div style={{ padding: '16px 30px', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'flex-end' }}>
              <button
                type="button"
                onClick={() => setInspectPlan(null)}
                style={{
                  background: '#f1f5f9',
                  border: 'none',
                  padding: '10px 22px',
                  borderRadius: '10px',
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                Close Inspector
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 6. POPUP: RECORD COUNTER PAYMENT FOR INSTALLMENT */}
      {paymentMethodModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.75)',
            backdropFilter: 'blur(10px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 10000,
            padding: '20px',
          }}
        >
          <div
            className="portal-card animate-in zoom-in duration-150"
            style={{
              width: '100%',
              maxWidth: '440px',
              padding: '24px',
              borderRadius: '16px',
              boxShadow: '0 20px 40px rgba(0,0,0,0.3)',
            }}
          >
            <h3 style={{ margin: '0 0 4px', fontSize: '1.2rem', fontWeight: 900, color: '#0f172a' }}>
              Record Installment Settlement
            </h3>
            <p style={{ margin: '0 0 16px', fontSize: '0.88rem', color: '#64748b' }}>
              Amount: <strong style={{ color: '#0284c7' }}>{formatCurrency(paymentMethodModal.amount)}</strong>
            </p>

            <form onSubmit={handlePayInstallment}>
              <div style={{ marginBottom: '14px' }}>
                <label className="portal-label" style={{ fontWeight: 800 }}>Payment Method</label>
                <select
                  className="portal-input"
                  value={payMethod}
                  onChange={e => setPayMethod(e.target.value as 'CASH' | 'BANK_TRANSFER' | 'CARD' | 'ECOCASH')}
                >
                  <option value="CASH">Physical Cash</option>
                  <option value="BANK_TRANSFER">Direct Bank Deposit / Wire</option>
                  <option value="CARD">POS / Debit Card</option>
                  <option value="ECOCASH">EcoCash / Mobile Money</option>
                </select>
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label className="portal-label" style={{ fontWeight: 800 }}>Receipt Reference Code (Optional)</label>
                <input
                  type="text"
                  className="portal-input"
                  placeholder="e.g. REC-8921 / Bank Ref"
                  value={payReference}
                  onChange={e => setPayReference(e.target.value)}
                />
              </div>

              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  onClick={() => setPaymentMethodModal(null)}
                  style={{
                    background: '#f1f5f9',
                    border: 'none',
                    padding: '8px 16px',
                    borderRadius: '8px',
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={processingPayment}
                  style={{
                    background: '#0284c7',
                    color: '#fff',
                    border: 'none',
                    padding: '8px 20px',
                    borderRadius: '8px',
                    fontWeight: 800,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                >
                  {processingPayment ? <i className="fas fa-spinner fa-spin" /> : <i className="fas fa-check" />}
                  Confirm Payment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 7. MODAL: CREATE / EDIT OFFERED PLAN TEMPLATE */}
      {showTemplateModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.65)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: '24px',
          }}
        >
          <div
            className="portal-card animate-in zoom-in duration-200"
            style={{
              width: '100%',
              maxWidth: '540px',
              maxHeight: '90vh',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
              padding: 0,
              borderRadius: '20px',
              boxShadow: '0 24px 50px -12px rgba(0, 0, 0, 0.25)',
            }}
          >
            <div
              style={{
                padding: '22px 28px',
                background: 'linear-gradient(135deg, #0c2340 0%, #0369a1 100%)',
                color: '#fff',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <h2 style={{ color: '#fff', margin: 0, fontSize: '1.25rem', fontWeight: 900 }}>
                <i className="fas fa-file-invoice-dollar mr-2" />
                {selectedTemplate ? 'Edit Offered Plan' : 'Create Offered Plan'}
              </h2>
              <button
                type="button"
                onClick={() => setShowTemplateModal(false)}
                style={{ background: 'none', border: 'none', color: '#fff', fontSize: '1.25rem', cursor: 'pointer' }}
              >
                <i className="fas fa-times" />
              </button>
            </div>
            <div style={{ padding: '28px', overflowY: 'auto' }}>
              <form onSubmit={handleSaveTemplate}>
                <div style={{ marginBottom: '18px' }}>
                  <label className="portal-label" style={{ fontWeight: 800 }}>Plan Title *</label>
                  <input
                    type="text"
                    className="portal-input"
                    placeholder="e.g. Term 1 Balanced 3-Split Agreement"
                    value={templateForm.name}
                    onChange={e => setTemplateForm(f => ({ ...f, name: e.target.value }))}
                    style={{ margin: 0 }}
                    required
                  />
                </div>
                <div style={{ marginBottom: '18px' }}>
                  <label className="portal-label" style={{ fontWeight: 800 }}>Standard Amount ($) *</label>
                  <input
                    type="number"
                    className="portal-input"
                    placeholder="e.g. 450.00"
                    value={templateForm.amount}
                    onChange={e => setTemplateForm(f => ({ ...f, amount: e.target.value }))}
                    min={1}
                    step={0.01}
                    style={{ margin: 0 }}
                    required
                  />
                </div>
                <div style={{ marginBottom: '18px' }}>
                  <label className="portal-label" style={{ fontWeight: 800 }}>Target Due Date (Optional)</label>
                  <input
                    type="date"
                    className="portal-input"
                    value={templateForm.dueDate}
                    onChange={e => setTemplateForm(f => ({ ...f, dueDate: e.target.value }))}
                    style={{ margin: 0 }}
                  />
                </div>
                <div style={{ marginBottom: '24px' }}>
                  <label className="portal-label" style={{ fontWeight: 800 }}>Description & Guidelines</label>
                  <textarea
                    className="portal-input"
                    placeholder="Provide details about the schedule, installments, or humanitarian grace rules..."
                    value={templateForm.notes}
                    onChange={e => setTemplateForm(f => ({ ...f, notes: e.target.value }))}
                    style={{ minHeight: '90px', resize: 'vertical', width: '100%', padding: '12px', margin: 0 }}
                  />
                </div>
                <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                  <button
                    type="button"
                    onClick={() => setShowTemplateModal(false)}
                    style={{
                      background: '#f1f5f9',
                      border: 'none',
                      padding: '10px 20px',
                      borderRadius: '10px',
                      fontWeight: 700,
                      cursor: 'pointer',
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    style={{
                      background: '#0284c7',
                      color: '#ffffff',
                      border: 'none',
                      padding: '10px 26px',
                      borderRadius: '10px',
                      fontWeight: 800,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      boxShadow: '0 4px 14px rgba(2, 132, 199, 0.3)',
                    }}
                  >
                    <i className="fas fa-save" /> Save Template
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
