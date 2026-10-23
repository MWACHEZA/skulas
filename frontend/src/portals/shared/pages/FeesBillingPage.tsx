import React, { useState, useEffect, useMemo } from 'react';
import { Pagination } from '../../../components/shared/Pagination';
import { Link } from 'react-router-dom';
import api from '../../../lib/api';
import { useToast } from '../../../context/ToastContext';
import { formatCurrency } from '../../../utils/formatters';
import '../../../styles/portal.css';
import { useTerminology } from '../../../hooks/useTerminology';

const exportToCSV = (title: string, headers: string[], dataRows: string[][]) => {
  const content = [
    headers.map(h => `"${h.replace(/"/g, '""')}"`).join(','),
    ...dataRows.map(row => row.map(cell => `"${(cell || '').toString().replace(/"/g, '""')}"`).join(','))
  ].join('\n');
  const blob = new Blob(['\ufeff' + content], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${title.toLowerCase().replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

const exportToWord = (title: string, headers: string[], dataRows: string[][]) => {
  const html = `
    <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40">
    <head>
      <title>${title}</title>
      <style>
        body { font-family: Arial, sans-serif; }
        table { border-collapse: collapse; width: 100%; margin-top: 16px; }
        th, td { border: 1px solid #cbd5e1; padding: 10px; text-align: left; font-size: 12px; }
        th { background-color: #f1f5f9; font-weight: bold; color: #1e293b; }
      </style>
    </head>
    <body>
      <h2>${title}</h2>
      <p>Generated on ${new Date().toLocaleDateString()}</p>
      <table>
        <thead>
          <tr>${headers.map(h => `<th>${h}</th>`).join('')}</tr>
        </thead>
        <tbody>
          ${dataRows.map(row => `<tr>${row.map(cell => `<td>${cell}</td>`).join('')}</tr>`).join('')}
        </tbody>
      </table>
    </body>
    </html>
  `;
  const blob = new Blob(['\ufeff' + html], { type: 'application/msword' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${title.toLowerCase().replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 10)}.doc`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

interface FeeGroup {
  id: string;
  name: string;
  amount: number;
  year: number;
  billingType: string;
  incomeAccountId?: string;
  arAccountId?: string;
  classAmounts?: Array<{ classId: string; amount: number }>;
}

interface Student {
  id: string;
  studentId: string;
  name: string;
  boardingStatus: string;
  avatar?: string | null;
  class?: { id?: string; name: string };
}

interface ClassEntity {
  id: string;
  name: string;
}

export default function FeesBillingPage() {
  const { t } = useTerminology();
  const { showToast } = useToast();

  // Mode: standard bulk invoicing vs custom ad-hoc billing
  const [activeTab, setActiveTab] = useState<'standard' | 'custom'>('standard');
  const [feeGroups, setFeeGroups] = useState<FeeGroup[]>([]);
  const [classes, setClasses] = useState<ClassEntity[]>([]);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [activeFeeYear, setActiveFeeYear] = useState(new Date().getFullYear());
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(15);

  // In-page search filter
  const [searchFilter, setSearchFilter] = useState('');

  // Standard Invoicing State
  const [selectedFeeGroupIds, setSelectedFeeGroupIds] = useState<string[]>([]);
  const [selectedClassIds, setSelectedClassIds] = useState<string[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
  const [dueDate, setDueDate] = useState<string>(() => {
    // Default to 14 days in the future
    const d = new Date();
    d.setDate(d.getDate() + 14);
    return d.toISOString().slice(0, 10);
  });

  // Shared Invoice Data
  const [discount, setDiscount] = useState('');
  const [paymentStatus, setPaymentStatus] = useState<'unpaid' | 'paid'>('unpaid');
  const [paymentMethod, setPaymentMethod] = useState('');
  const [description, setDescription] = useState('');
  const [paymentMethods, setPaymentMethods] = useState<{ id: string; name: string }[]>([]);

  // Custom Invoicing State
  const [customFeeGroupId, setCustomFeeGroupId] = useState('');
  const [customAmount, setCustomAmount] = useState('');

  useEffect(() => {
    fetchInitialData();
  }, []);

  useEffect(() => {
    setCurrentPage(1);
    fetchStudents();
  }, [selectedClassIds, selectedCategory, activeTab]);

  const fetchInitialData = async () => {
    try {
      setLoading(true);
      const [groupsRes, classesRes, methodsRes, accountsRes] = await Promise.all([
        api.get('/api/fees/groups'),
        api.get('/api/classes'),
        api.get('/api/finance/payment-methods'),
        api.get('/api/accounts/coa')
      ]);

      const groups: FeeGroup[] = Array.isArray(groupsRes.data) ? groupsRes.data : [];
      setFeeGroups(groups);
      setClasses(Array.isArray(classesRes.data) ? classesRes.data : []);
      setPaymentMethods(Array.isArray(methodsRes.data) ? methodsRes.data.filter((m: any) => m.isActive !== false) : []);
      setAccounts(Array.isArray(accountsRes.data) ? accountsRes.data : []);

      if (groups.length > 0) {
        const uniqueYears = Array.from(new Set(groups.map((g: any) => g.year))) as number[];
        const currentYear = new Date().getFullYear();
        if (uniqueYears.includes(currentYear)) {
          setActiveFeeYear(currentYear);
        } else {
          setActiveFeeYear(Math.max(...uniqueYears));
        }

        // Auto-select groups for the active year by default
        const yearGroups = groups.filter(g => g.year === (uniqueYears.includes(currentYear) ? currentYear : Math.max(...uniqueYears)));
        if (yearGroups.length > 0) {
          setSelectedFeeGroupIds(yearGroups.map(g => g.id));
        }
      }
    } catch (error) {
      console.error('Failed to load billing registry data:', error);
      showToast('Failed to load billing registry data', 'error');
    } finally {
      setLoading(false);
    }
  };

  const fetchStudents = async () => {
    try {
      const params = new URLSearchParams();
      if (selectedClassIds.length > 0) params.append('classIds', selectedClassIds.join(','));
      if (selectedCategory) params.append('category', selectedCategory);

      const { data } = await api.get(`/api/fees/students-list?${params.toString()}`);
      const studentData: Student[] = Array.isArray(data) ? data : [];
      setStudents(studentData);
      setSelectedStudentIds(studentData.map((s: any) => s.id));
    } catch (error) {
      console.error('Failed to synchronize student roster:', error);
      showToast('Failed to synchronize student roster', 'error');
    }
  };

  const handleProcessStandard = async () => {
    if (selectedFeeGroupIds.length === 0) {
      showToast('Please select at least one institutional fee group', 'warning');
      return;
    }
    if (selectedStudentIds.length === 0) {
      showToast('No students selected for invoicing', 'warning');
      return;
    }

    setProcessing(true);
    try {
      const res = await api.post('/api/fees/invoice/standard', {
        feeGroupIds: selectedFeeGroupIds,
        studentIds: selectedStudentIds,
        dueDate,
        discount: Number(discount) || 0,
        paymentStatus,
        paymentMethod: paymentStatus === 'paid' ? paymentMethod : undefined,
        description: description.trim() || undefined
      });

      const count = res.data?.count || selectedStudentIds.length;
      showToast(`Invoicing authorized: ${count} student fee records created and posted to general ledger.`, 'success');
      setIsModalOpen(false);
      // Refresh students
      fetchStudents();
    } catch (error: any) {
      console.error('Standard invoicing error:', error);
      showToast(error.response?.data?.error || 'Standard invoicing process failed', 'error');
    } finally {
      setProcessing(false);
    }
  };

  const handleProcessCustom = async () => {
    if (!customFeeGroupId) {
      showToast('Please select an authorized fee group category', 'warning');
      return;
    }
    const amt = parseFloat(customAmount);
    if (isNaN(amt) || amt <= 0) {
      showToast('Please enter a valid billing amount', 'warning');
      return;
    }
    if (selectedStudentIds.length === 0) {
      showToast('No students selected for custom billing', 'warning');
      return;
    }

    setProcessing(true);
    try {
      const res = await api.post('/api/fees/invoice/custom', {
        feeGroupId: customFeeGroupId,
        studentIds: selectedStudentIds,
        customAmount: amt,
        dueDate,
        discount: Number(discount) || 0,
        paymentStatus,
        paymentMethod: paymentStatus === 'paid' ? paymentMethod : undefined,
        description: description.trim() || undefined
      });

      showToast(res.data?.message || `Custom ad-hoc fee batch authorized for ${selectedStudentIds.length} students.`, 'success');
      setIsModalOpen(false);
      fetchStudents();
    } catch (error: any) {
      console.error('Custom invoicing error:', error);
      showToast(error.response?.data?.error || 'Custom invoicing failed', 'error');
    } finally {
      setProcessing(false);
    }
  };

  const toggleStudent = (id: string) => {
    setSelectedStudentIds(prev =>
      prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]
    );
  };

  const toggleAllStudents = () => {
    const list = filteredStudents;
    const allFilteredSelected = list.every(s => selectedStudentIds.includes(s.id));
    if (allFilteredSelected) {
      setSelectedStudentIds(prev => prev.filter(id => !list.some(s => s.id === id)));
    } else {
      const set = new Set([...selectedStudentIds, ...list.map(s => s.id)]);
      setSelectedStudentIds(Array.from(set));
    }
  };

  // Filter students by search term
  const filteredStudents = useMemo(() => {
    if (!searchFilter.trim()) return students;
    const q = searchFilter.trim().toLowerCase();
    return students.filter(
      s =>
        (s.name && s.name.toLowerCase().includes(q)) ||
        (s.studentId && s.studentId.toLowerCase().includes(q)) ||
        (s.class?.name && s.class.name.toLowerCase().includes(q))
    );
  }, [students, searchFilter]);

  const totalPages = Math.ceil(filteredStudents.length / pageSize) || 1;
  const paginatedStudents = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredStudents.slice(start, start + pageSize);
  }, [filteredStudents, currentPage, pageSize]);

  // Projected Calculations
  const selectedGroups = useMemo(() => {
    return feeGroups.filter(g => selectedFeeGroupIds.includes(g.id));
  }, [feeGroups, selectedFeeGroupIds]);

  const projectedBatchAmount = useMemo(() => {
    if (activeTab === 'standard') {
      const groupTotal = selectedGroups.reduce((acc, g) => acc + (g.amount || 0), 0);
      return groupTotal * selectedStudentIds.length;
    } else {
      const amt = parseFloat(customAmount) || 0;
      return amt * selectedStudentIds.length;
    }
  }, [activeTab, selectedGroups, selectedStudentIds, customAmount]);

  const allFilteredSelected = filteredStudents.length > 0 && filteredStudents.every(s => selectedStudentIds.includes(s.id));

  return (
    <div style={{ maxWidth: '1440px', margin: '0 auto', padding: '0 8px' }}>
      {/* Page Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '16px',
        marginBottom: '24px'
      }}>
        <div>
          <h1 style={{
            fontSize: '1.75rem',
            fontWeight: 800,
            color: '#0f172a',
            margin: '0 0 6px 0',
            letterSpacing: '-0.02em',
            display: 'flex',
            alignItems: 'center',
            gap: '10px'
          }}>
            <span style={{
              width: '38px',
              height: '38px',
              borderRadius: '10px',
              backgroundColor: '#0284c7',
              color: '#fff',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '18px'
            }}>
              💳
            </span>
            Financial Billing & Invoicing
          </h1>
          <p style={{ margin: 0, fontSize: '0.92rem', color: '#64748b' }}>
            Authorize institutional fee assessments, execute bulk invoicing cycles, and manage ad-hoc student billings.
          </p>
        </div>

        {/* Engine Status & Academic Year */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '8px 16px',
            backgroundColor: '#ecfdf5',
            color: '#065f46',
            border: '1px solid #a7f3d0',
            borderRadius: '12px',
            fontSize: '12px',
            fontWeight: 700
          }}>
            <span style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              backgroundColor: '#10b981',
              boxShadow: '0 0 0 3px rgba(16, 185, 129, 0.2)'
            }} />
            <span>Automated Invoicing Engine • Active</span>
          </div>

          <div style={{
            padding: '8px 14px',
            backgroundColor: '#f1f5f9',
            color: '#334155',
            borderRadius: '12px',
            fontSize: '12px',
            fontWeight: 700,
            border: '1px solid #e2e8f0'
          }}>
            Session: <strong>{activeFeeYear}</strong>
          </div>
        </div>
      </div>

      {/* Mode Navigation Switcher */}
      <div style={{
        background: '#f8fafc',
        border: '1px solid #e2e8f0',
        borderRadius: '16px',
        padding: '6px',
        marginBottom: '24px',
        display: 'inline-flex',
        alignItems: 'center',
        gap: '6px',
        flexWrap: 'wrap',
        boxShadow: '0 1px 2px rgba(0,0,0,0.03)'
      }}>
        <button
          type="button"
          onClick={() => setActiveTab('standard')}
          style={{
            padding: '10px 20px',
            borderRadius: '12px',
            border: 'none',
            cursor: 'pointer',
            fontSize: '0.92rem',
            fontWeight: activeTab === 'standard' ? 700 : 600,
            color: activeTab === 'standard' ? '#0369a1' : '#64748b',
            backgroundColor: activeTab === 'standard' ? '#ffffff' : 'transparent',
            boxShadow: activeTab === 'standard' ? '0 2px 8px -1px rgba(0,0,0,0.08), 0 1px 3px rgba(0,0,0,0.05)' : 'none',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            transition: 'all 0.15s ease'
          }}
        >
          <span>📦</span>
          <span>Standard Bulk Invoicing</span>
          {activeTab === 'standard' && (
            <span style={{
              backgroundColor: '#e0f2fe',
              color: '#0369a1',
              padding: '2px 8px',
              borderRadius: '999px',
              fontSize: '11px',
              fontWeight: 800
            }}>
              {selectedGroups.length} Structures
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('custom')}
          style={{
            padding: '10px 20px',
            borderRadius: '12px',
            border: 'none',
            cursor: 'pointer',
            fontSize: '0.92rem',
            fontWeight: activeTab === 'custom' ? 700 : 600,
            color: activeTab === 'custom' ? '#0369a1' : '#64748b',
            backgroundColor: activeTab === 'custom' ? '#ffffff' : 'transparent',
            boxShadow: activeTab === 'custom' ? '0 2px 8px -1px rgba(0,0,0,0.08), 0 1px 3px rgba(0,0,0,0.05)' : 'none',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            transition: 'all 0.15s ease'
          }}
        >
          <span>✏️</span>
          <span>Custom Ad-Hoc Billing</span>
        </button>

        <Link
          to="/bursar/fee-groups"
          style={{
            padding: '10px 20px',
            borderRadius: '12px',
            textDecoration: 'none',
            fontSize: '0.92rem',
            fontWeight: 600,
            color: '#475569',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            transition: 'all 0.15s ease'
          }}
          onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#ffffff'; e.currentTarget.style.color = '#0284c7'; }}
          onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.color = '#475569'; }}
        >
          <span>⚙️</span>
          <span>Configure Fee Groups</span>
          <span style={{ fontSize: '11px', color: '#94a3b8' }}>↗</span>
        </Link>
      </div>

      {/* Recipient Registry Card */}
      <div style={{
        backgroundColor: '#ffffff',
        border: '1px solid #e2e8f0',
        borderRadius: '20px',
        overflow: 'hidden',
        boxShadow: '0 4px 16px -2px rgba(0, 0, 0, 0.05)',
        marginBottom: '32px'
      }}>
        {/* Toolbar Header */}
        <div style={{
          padding: '24px 28px',
          borderBottom: '1px solid #f1f5f9',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '16px',
          backgroundColor: '#fafafa'
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>
                Recipient Registry ({filteredStudents.length})
              </h2>
              <span style={{
                backgroundColor: selectedStudentIds.length > 0 ? '#eff6ff' : '#f1f5f9',
                color: selectedStudentIds.length > 0 ? '#1d4ed8' : '#64748b',
                padding: '3px 10px',
                borderRadius: '999px',
                fontSize: '11px',
                fontWeight: 700,
                border: '1px solid #e2e8f0'
              }}>
                {selectedStudentIds.length} of {students.length} Selected
              </span>
            </div>
            <p style={{ margin: 0, fontSize: '0.86rem', color: '#64748b' }}>
              Authorized students scheduled for invoice generation in this billing batch.
            </p>
          </div>

          {/* Action Buttons */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            {/* Configure Parameters Button */}
            <button
              type="button"
              onClick={() => setIsModalOpen(true)}
              style={{
                padding: '11px 22px',
                backgroundColor: '#0284c7',
                color: '#ffffff',
                border: 'none',
                borderRadius: '12px',
                fontSize: '0.9rem',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                boxShadow: '0 4px 12px rgba(2, 132, 199, 0.25)',
                transition: 'all 0.15s ease'
              }}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#0369a1')}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#0284c7')}
            >
              <span>⚡</span>
              <span>CONFIGURE PARAMETERS</span>
              {activeTab === 'standard' && (
                <span style={{
                  backgroundColor: 'rgba(255,255,255,0.25)',
                  color: '#fff',
                  padding: '2px 6px',
                  borderRadius: '6px',
                  fontSize: '10px',
                  fontWeight: 800
                }}>
                  {selectedFeeGroupIds.length} Fees
                </span>
              )}
            </button>

            {/* Select/Deselect All Toggle */}
            <button
              type="button"
              onClick={toggleAllStudents}
              style={{
                padding: '10px 16px',
                backgroundColor: '#ffffff',
                color: '#334155',
                border: '1px solid #cbd5e1',
                borderRadius: '12px',
                fontSize: '0.85rem',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              <span>{allFilteredSelected ? '☒' : '☑'}</span>
              <span>{allFilteredSelected ? 'Deselect All' : `Select All (${filteredStudents.length})`}</span>
            </button>

            {/* Export CSV */}
            <button
              type="button"
              onClick={() => {
                const headers = ['Student Name', 'Reg ID', 'Class', 'Boarding Status'];
                const rows = filteredStudents.map(s => [
                  s.name,
                  s.studentId,
                  s.class?.name || 'UNASSIGNED',
                  s.boardingStatus || 'Day'
                ]);
                exportToCSV('Billing_Recipients', headers, rows);
              }}
              style={{
                padding: '10px 14px',
                backgroundColor: '#ffffff',
                color: '#475569',
                border: '1px solid #cbd5e1',
                borderRadius: '12px',
                fontSize: '0.85rem',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px'
              }}
              title="Export to CSV"
            >
              <span>📊</span>
              <span>CSV</span>
            </button>

            {/* Export Word */}
            <button
              type="button"
              onClick={() => {
                const headers = ['Student Name', 'Reg ID', 'Class', 'Boarding Status'];
                const rows = filteredStudents.map(s => [
                  s.name,
                  s.studentId,
                  s.class?.name || 'UNASSIGNED',
                  s.boardingStatus || 'Day'
                ]);
                exportToWord('Billing_Recipients', headers, rows);
              }}
              style={{
                padding: '10px 14px',
                backgroundColor: '#ffffff',
                color: '#475569',
                border: '1px solid #cbd5e1',
                borderRadius: '12px',
                fontSize: '0.85rem',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px'
              }}
              title="Export to Word"
            >
              <span>📄</span>
              <span>Word</span>
            </button>
          </div>
        </div>

        {/* Filters Bar: Search, Class, Boarding Category */}
        <div style={{
          padding: '16px 28px',
          borderBottom: '1px solid #f1f5f9',
          display: 'flex',
          alignItems: 'center',
          gap: '14px',
          flexWrap: 'wrap',
          backgroundColor: '#ffffff'
        }}>
          {/* Live Search */}
          <div style={{ position: 'relative', flex: '1 1 240px', minWidth: '220px' }}>
            <span style={{
              position: 'absolute',
              left: '12px',
              top: '50%',
              transform: 'translateY(-50%)',
              color: '#94a3b8',
              fontSize: '14px'
            }}>
              🔍
            </span>
            <input
              type="text"
              placeholder="Search by student name or reg ID..."
              value={searchFilter}
              onChange={(e) => { setSearchFilter(e.target.value); setCurrentPage(1); }}
              style={{
                width: '100%',
                padding: '9px 12px 9px 34px',
                backgroundColor: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: '10px',
                fontSize: '0.88rem',
                color: '#1e293b',
                outline: 'none',
                boxSizing: 'border-box'
              }}
            />
          </div>

          {/* Class Filter */}
          <div style={{ minWidth: '180px' }}>
            <select
              value={selectedClassIds[0] || ''}
              onChange={(e) => {
                const val = e.target.value;
                setSelectedClassIds(val ? [val] : []);
              }}
              style={{
                width: '100%',
                padding: '9px 12px',
                backgroundColor: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: '10px',
                fontSize: '0.88rem',
                color: '#334155',
                fontWeight: 600,
                outline: 'none',
                boxSizing: 'border-box'
              }}
            >
              <option value="">All Classes / Grades</option>
              {classes.map(cls => (
                <option key={cls.id} value={cls.id}>{cls.name}</option>
              ))}
            </select>
          </div>

          {/* Boarding Category Filter */}
          <div style={{ minWidth: '160px' }}>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              style={{
                width: '100%',
                padding: '9px 12px',
                backgroundColor: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: '10px',
                fontSize: '0.88rem',
                color: '#334155',
                fontWeight: 600,
                outline: 'none',
                boxSizing: 'border-box'
              }}
            >
              <option value="">All Classifications</option>
              <option value="Day">Day Scholars Only</option>
              <option value="Boarder">Boarders Only</option>
            </select>
          </div>

          {/* Reset Filters if Active */}
          {(searchFilter || selectedClassIds.length > 0 || selectedCategory) && (
            <button
              type="button"
              onClick={() => {
                setSearchFilter('');
                setSelectedClassIds([]);
                setSelectedCategory('');
              }}
              style={{
                padding: '8px 14px',
                backgroundColor: '#f1f5f9',
                color: '#64748b',
                border: 'none',
                borderRadius: '10px',
                fontSize: '12px',
                fontWeight: 700,
                cursor: 'pointer'
              }}
            >
              Reset Filters
            </button>
          )}
        </div>

        {/* Table Content */}
        <div style={{ overflowX: 'auto' }}>
          <table style={{
            width: '100%',
            borderCollapse: 'collapse',
            textAlign: 'left'
          }}>
            <thead>
              <tr style={{
                backgroundColor: '#f8fafc',
                borderBottom: '1px solid #e2e8f0',
                fontSize: '12px',
                fontWeight: 800,
                color: '#475569',
                textTransform: 'uppercase',
                letterSpacing: '0.05em'
              }}>
                <th style={{ width: '56px', padding: '14px 16px', textAlign: 'center' }}>
                  <input
                    type="checkbox"
                    checked={allFilteredSelected}
                    onChange={toggleAllStudents}
                    style={{ width: '18px', height: '18px', accentColor: '#0284c7', cursor: 'pointer' }}
                  />
                </th>
                <th style={{ padding: '14px 16px' }}>Student Identity</th>
                <th style={{ padding: '14px 16px' }}>Class / Grade</th>
                <th style={{ padding: '14px 16px' }}>Classification</th>
                <th style={{ padding: '14px 16px' }}>Applied Invoicing Structures</th>
                <th style={{ padding: '14px 16px', textAlign: 'right' }}>Projected Charge</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} style={{ padding: '60px 20px', textAlign: 'center', color: '#94a3b8' }}>
                    <div style={{ fontSize: '24px', marginBottom: '8px' }}>⏳</div>
                    <div style={{ fontWeight: 600 }}>Loading recipient registry from database...</div>
                  </td>
                </tr>
              ) : paginatedStudents.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ padding: '60px 20px', textAlign: 'center', color: '#94a3b8' }}>
                    <div style={{ fontSize: '28px', marginBottom: '8px' }}>🔍</div>
                    <div style={{ fontSize: '15px', fontWeight: 700, color: '#334155' }}>No students found</div>
                    <p style={{ margin: '4px 0 0 0', fontSize: '13px' }}>
                      Try adjusting your search criteria or class filters above.
                    </p>
                  </td>
                </tr>
              ) : (
                paginatedStudents.map((student) => {
                  const isSelected = selectedStudentIds.includes(student.id);
                  const isBoarder = (student.boardingStatus || '').toLowerCase() === 'boarder';

                  // Calculate projected fee for this student
                  let studentProjected = 0;
                  if (activeTab === 'standard') {
                    for (const g of selectedGroups) {
                      let amt = g.amount;
                      if (student.class?.id && g.classAmounts) {
                        const ca = g.classAmounts.find(c => c.classId === student.class?.id);
                        if (ca) amt = ca.amount;
                      }
                      studentProjected += amt;
                    }
                  } else {
                    studentProjected = parseFloat(customAmount) || 0;
                  }

                  return (
                    <tr
                      key={student.id}
                      onClick={() => toggleStudent(student.id)}
                      style={{
                        backgroundColor: isSelected ? '#f0f9ff' : 'transparent',
                        borderBottom: '1px solid #f1f5f9',
                        cursor: 'pointer',
                        transition: 'background-color 0.12s ease'
                      }}
                      onMouseEnter={(e) => {
                        if (!isSelected) e.currentTarget.style.backgroundColor = '#fafafa';
                      }}
                      onMouseLeave={(e) => {
                        if (!isSelected) e.currentTarget.style.backgroundColor = 'transparent';
                      }}
                    >
                      <td style={{ padding: '14px 16px', textAlign: 'center' }} onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleStudent(student.id)}
                          style={{ width: '18px', height: '18px', accentColor: '#0284c7', cursor: 'pointer' }}
                        />
                      </td>

                      <td style={{ padding: '14px 16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <div style={{
                            width: '36px',
                            height: '36px',
                            borderRadius: '10px',
                            backgroundColor: '#e2e8f0',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '13px',
                            fontWeight: 800,
                            color: '#475569',
                            flexShrink: 0
                          }}>
                            {student.name.slice(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <div style={{ fontWeight: 700, color: '#0f172a', fontSize: '0.94rem' }}>
                              {student.name}
                            </div>
                            <div style={{ fontSize: '11px', color: '#64748b', fontFamily: 'monospace', fontWeight: 600 }}>
                              REG ID: {student.studentId}
                            </div>
                          </div>
                        </div>
                      </td>

                      <td style={{ padding: '14px 16px' }}>
                        <span style={{
                          display: 'inline-block',
                          padding: '3px 10px',
                          borderRadius: '6px',
                          backgroundColor: '#f1f5f9',
                          color: '#334155',
                          fontSize: '12px',
                          fontWeight: 700
                        }}>
                          {student.class?.name || 'Unassigned'}
                        </span>
                      </td>

                      <td style={{ padding: '14px 16px' }}>
                        <span style={{
                          display: 'inline-block',
                          padding: '3px 10px',
                          borderRadius: '6px',
                          backgroundColor: isBoarder ? '#ffedd5' : '#e0f2fe',
                          color: isBoarder ? '#c2410c' : '#0369a1',
                          fontSize: '11px',
                          fontWeight: 800,
                          textTransform: 'uppercase'
                        }}>
                          {student.boardingStatus || 'Day'}
                        </span>
                      </td>

                      <td style={{ padding: '14px 16px' }}>
                        {activeTab === 'standard' ? (
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', maxWidth: '360px' }}>
                            {selectedGroups.length === 0 ? (
                              <span style={{ color: '#94a3b8', fontSize: '12px', fontStyle: 'italic' }}>
                                No fee structures selected
                              </span>
                            ) : (
                              selectedGroups.slice(0, 3).map(g => (
                                <span
                                  key={g.id}
                                  style={{
                                    backgroundColor: '#f1f5f9',
                                    color: '#475569',
                                    padding: '2px 8px',
                                    borderRadius: '6px',
                                    fontSize: '11px',
                                    fontWeight: 600
                                  }}
                                >
                                  {g.name} (${g.amount})
                                </span>
                              ))
                            )}
                            {selectedGroups.length > 3 && (
                              <span style={{
                                backgroundColor: '#e2e8f0',
                                color: '#334155',
                                padding: '2px 6px',
                                borderRadius: '6px',
                                fontSize: '10px',
                                fontWeight: 800
                              }}>
                                +{selectedGroups.length - 3} more
                              </span>
                            )}
                          </div>
                        ) : (
                          <span style={{ color: '#059669', fontSize: '12px', fontWeight: 700 }}>
                            Ad-hoc Custom Charge
                          </span>
                        )}
                      </td>

                      <td style={{ padding: '14px 16px', textAlign: 'right' }}>
                        <span style={{
                          fontWeight: 800,
                          fontSize: '0.98rem',
                          color: studentProjected > 0 ? '#059669' : '#94a3b8'
                        }}>
                          {formatCurrency(studentProjected)}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Section */}
        <div style={{ padding: '16px 24px', borderTop: '1px solid #f1f5f9' }}>
          <Pagination
            currentPage={currentPage}
            totalItems={filteredStudents.length}
            pageSize={pageSize}
            onPageChange={setCurrentPage}
            onPageSizeChange={(sz) => { setPageSize(sz); setCurrentPage(1); }}
            itemLabel="students"
          />
        </div>

        {/* Batch Audit & Financial Impact Footer Bar */}
        <div style={{
          padding: '20px 28px',
          backgroundColor: '#0f172a',
          color: '#f8fafc',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '16px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '20px', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: '#38bdf8' }} />
              <span style={{ fontSize: '13px', color: '#94a3b8' }}>
                Audited Recipients: <strong style={{ color: '#fff' }}>{selectedStudentIds.length}</strong> / {students.length}
              </span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: '#4ade80' }} />
              <span style={{ fontSize: '13px', color: '#94a3b8' }}>
                Structures: <strong style={{ color: '#fff' }}>{activeTab === 'standard' ? selectedGroups.length : (customFeeGroupId ? 1 : 0)}</strong>
              </span>
            </div>

            <div style={{ fontSize: '13px', color: '#94a3b8' }}>
              Projected Ledger Volume: <strong style={{ color: '#4ade80', fontSize: '1.1rem' }}>{formatCurrency(projectedBatchAmount)}</strong>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setIsModalOpen(true)}
            style={{
              padding: '12px 28px',
              backgroundColor: '#0284c7',
              color: '#ffffff',
              border: 'none',
              borderRadius: '12px',
              fontSize: '0.92rem',
              fontWeight: 800,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              boxShadow: '0 4px 12px rgba(2, 132, 199, 0.35)'
            }}
          >
            <span>⚡</span>
            <span>REVIEW & AUTHORIZE INVOICING</span>
          </button>
        </div>
      </div>

      {/* REDESIGNED BILLING PARAMETERS & AUTHORIZATION MODAL */}
      {isModalOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.65)',
            backdropFilter: 'blur(6px)',
            zIndex: 1000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px'
          }}
          onClick={() => setIsModalOpen(false)}
        >
          <div
            style={{
              width: '100%',
              maxWidth: '740px',
              backgroundColor: '#ffffff',
              borderRadius: '24px',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.35)',
              border: '1px solid #e2e8f0',
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column',
              maxHeight: '92vh',
              animation: 'fadeIn 0.2s ease-in-out'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div style={{
              padding: '22px 28px',
              borderBottom: '1px solid #e2e8f0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              backgroundColor: '#f8fafc'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{
                  width: '42px',
                  height: '42px',
                  borderRadius: '12px',
                  backgroundColor: '#0284c7',
                  color: '#fff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '20px'
                }}>
                  📑
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800, color: '#0f172a' }}>
                    Configure Billing Parameters
                  </h3>
                  <p style={{ margin: '2px 0 0', fontSize: '12px', color: '#64748b' }}>
                    {activeTab === 'standard' ? 'Standard Institutional Bulk Invoicing Cycle' : 'Custom Ad-Hoc Fee Assessment'}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '22px',
                  color: '#94a3b8',
                  cursor: 'pointer',
                  padding: '4px'
                }}
              >
                ✕
              </button>
            </div>

            {/* Modal Scrollable Body */}
            <div style={{
              padding: '26px 28px',
              overflowY: 'auto',
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              gap: '24px'
            }}>
              {/* Mode A: Standard Fee Structure Registry */}
              {activeTab === 'standard' ? (
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                    <label style={{ fontSize: '13px', fontWeight: 800, color: '#334155', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      1. Select Institutional Fee Structures ({selectedFeeGroupIds.length} Selected)
                    </label>

                    {/* Year Filter Chips */}
                    <div style={{ display: 'flex', gap: '6px' }}>
                      {Array.from(new Set(feeGroups.map(g => g.year)))
                        .sort((a, b) => b - a)
                        .map(year => (
                          <button
                            key={year}
                            type="button"
                            onClick={() => setActiveFeeYear(year)}
                            style={{
                              padding: '4px 12px',
                              borderRadius: '8px',
                              border: activeFeeYear === year ? '1px solid #0284c7' : '1px solid #e2e8f0',
                              backgroundColor: activeFeeYear === year ? '#eff6ff' : '#ffffff',
                              color: activeFeeYear === year ? '#0284c7' : '#64748b',
                              fontSize: '12px',
                              fontWeight: 700,
                              cursor: 'pointer'
                            }}
                          >
                            {year}
                          </button>
                        ))}
                    </div>
                  </div>

                  {/* Fee Group Cards */}
                  <div style={{
                    maxHeight: '220px',
                    overflowY: 'auto',
                    border: '1px solid #e2e8f0',
                    borderRadius: '14px',
                    backgroundColor: '#f8fafc',
                    padding: '10px'
                  }}>
                    {feeGroups.filter(g => g.year === activeFeeYear).length === 0 ? (
                      <div style={{ padding: '30px', textAlign: 'center', color: '#94a3b8', fontSize: '13px' }}>
                        No fee structures found for {activeFeeYear}. Configure fee groups in setup.
                      </div>
                    ) : (
                      feeGroups.filter(g => g.year === activeFeeYear).map(group => {
                        const checked = selectedFeeGroupIds.includes(group.id);
                        return (
                          <label
                            key={group.id}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '14px',
                              padding: '12px 14px',
                              borderRadius: '10px',
                              marginBottom: '6px',
                              backgroundColor: checked ? '#eff6ff' : '#ffffff',
                              border: `1px solid ${checked ? '#bfdbfe' : '#e2e8f0'}`,
                              cursor: 'pointer',
                              transition: 'all 0.12s ease'
                            }}
                          >
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() => {
                                setSelectedFeeGroupIds(prev =>
                                  prev.includes(group.id) ? prev.filter(id => id !== group.id) : [...prev, group.id]
                                );
                              }}
                              style={{ width: '18px', height: '18px', accentColor: '#0284c7', cursor: 'pointer' }}
                            />
                            <div style={{ flex: 1 }}>
                              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                <span style={{ fontWeight: 700, color: '#0f172a', fontSize: '14px' }}>
                                  {group.name}
                                </span>
                                <span style={{ fontWeight: 800, color: '#059669', fontSize: '14px' }}>
                                  {formatCurrency(group.amount)}
                                </span>
                              </div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
                                <span style={{
                                  backgroundColor: '#f1f5f9',
                                  color: '#475569',
                                  padding: '2px 6px',
                                  borderRadius: '4px',
                                  fontSize: '10px',
                                  fontWeight: 700,
                                  textTransform: 'uppercase'
                                }}>
                                  {group.billingType}
                                </span>
                                <span style={{ fontSize: '11px', color: '#94a3b8' }}>
                                  AR Account: {accounts.find(a => a.id === group.arAccountId)?.code || '1210'} • Income: {accounts.find(a => a.id === group.incomeAccountId)?.code || '5100'}
                                </span>
                              </div>
                            </div>
                          </label>
                        );
                      })
                    )}
                  </div>
                </div>
              ) : (
                /* Mode B: Custom Ad-Hoc Fee Group & Amount */
                <div>
                  <label style={{ fontSize: '13px', fontWeight: 800, color: '#334155', textTransform: 'uppercase', letterSpacing: '0.04em', display: 'block', marginBottom: '8px' }}>
                    1. Select Fee Classification & Assessment Amount
                  </label>

                  <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: '14px' }}>
                    <div>
                      <select
                        value={customFeeGroupId}
                        onChange={(e) => setCustomFeeGroupId(e.target.value)}
                        style={{
                          width: '100%',
                          padding: '12px 14px',
                          border: '1px solid #cbd5e1',
                          borderRadius: '10px',
                          fontSize: '14px',
                          color: '#0f172a',
                          fontWeight: 600,
                          backgroundColor: '#ffffff'
                        }}
                      >
                        <option value="">-- Select Fee Classification --</option>
                        {feeGroups.map(g => (
                          <option key={g.id} value={g.id}>{g.name} ({g.billingType} {g.year})</option>
                        ))}
                      </select>
                    </div>

                    <div style={{ position: 'relative' }}>
                      <span style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', fontWeight: 800, color: '#059669', fontSize: '16px' }}>
                        $
                      </span>
                      <input
                        type="number"
                        step="0.01"
                        placeholder="0.00"
                        value={customAmount}
                        onChange={(e) => setCustomAmount(e.target.value)}
                        style={{
                          width: '100%',
                          padding: '12px 14px 12px 30px',
                          border: '1px solid #cbd5e1',
                          borderRadius: '10px',
                          fontSize: '15px',
                          fontWeight: 800,
                          color: '#059669',
                          boxSizing: 'border-box'
                        }}
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Section 2: Invoicing Terms & Accounts */}
              <div>
                <label style={{ fontSize: '13px', fontWeight: 800, color: '#334155', textTransform: 'uppercase', letterSpacing: '0.04em', display: 'block', marginBottom: '12px' }}>
                  2. Settlement Terms & Payment Configuration
                </label>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '14px' }}>
                  {/* Due Date */}
                  <div>
                    <span style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#64748b', marginBottom: '6px' }}>
                      Payment Due Date
                    </span>
                    <input
                      type="date"
                      value={dueDate}
                      onChange={(e) => setDueDate(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '10px 12px',
                        border: '1px solid #cbd5e1',
                        borderRadius: '10px',
                        fontSize: '13px',
                        color: '#0f172a',
                        fontWeight: 600,
                        boxSizing: 'border-box'
                      }}
                    />
                  </div>

                  {/* Payment Discount */}
                  <div>
                    <span style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#64748b', marginBottom: '6px' }}>
                      Settlement Discount ($)
                    </span>
                    <input
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      value={discount}
                      onChange={(e) => setDiscount(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '10px 12px',
                        border: '1px solid #cbd5e1',
                        borderRadius: '10px',
                        fontSize: '13px',
                        color: '#0f172a',
                        fontWeight: 600,
                        boxSizing: 'border-box'
                      }}
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: paymentStatus === 'paid' ? '1fr 1fr' : '1fr', gap: '14px', marginBottom: '14px' }}>
                  {/* Payment Status */}
                  <div>
                    <span style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#64748b', marginBottom: '6px' }}>
                      Invoice Initial Status
                    </span>
                    <select
                      value={paymentStatus}
                      onChange={(e) => setPaymentStatus(e.target.value as any)}
                      style={{
                        width: '100%',
                        padding: '10px 12px',
                        border: '1px solid #cbd5e1',
                        borderRadius: '10px',
                        fontSize: '13px',
                        color: '#0f172a',
                        fontWeight: 600,
                        backgroundColor: '#ffffff'
                      }}
                    >
                      <option value="unpaid">Unpaid (Post Debit to Accounts Receivable)</option>
                      <option value="paid">Direct Paid Settlement (Record Cash Receipt)</option>
                    </select>
                  </div>

                  {/* If Paid: Payment Method */}
                  {paymentStatus === 'paid' && (
                    <div>
                      <span style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#64748b', marginBottom: '6px' }}>
                        Settlement Payment Channel
                      </span>
                      <select
                        value={paymentMethod}
                        onChange={(e) => setPaymentMethod(e.target.value)}
                        style={{
                          width: '100%',
                          padding: '10px 12px',
                          border: '1px solid #cbd5e1',
                          borderRadius: '10px',
                          fontSize: '13px',
                          color: '#0f172a',
                          fontWeight: 600,
                          backgroundColor: '#ffffff'
                        }}
                      >
                        <option value="">-- Select Payment Method --</option>
                        {paymentMethods.length > 0 ? (
                          paymentMethods.map(m => (
                            <option key={m.id} value={m.name}>{m.name}</option>
                          ))
                        ) : (
                          <>
                            <option value="Cash">Cash Counter</option>
                            <option value="Bank Transfer">Bank Transfer</option>
                            <option value="EcoCash">EcoCash</option>
                            <option value="POS Swipe">POS Swipe Card</option>
                          </>
                        )}
                      </select>
                    </div>
                  )}
                </div>

                {/* Memo / Description */}
                <div>
                  <span style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#64748b', marginBottom: '6px' }}>
                    Invoice Statement Memo (Optional)
                  </span>
                  <input
                    type="text"
                    placeholder="e.g. Term 1 Tuition Assessment & Amenities Levy"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      border: '1px solid #cbd5e1',
                      borderRadius: '10px',
                      fontSize: '13px',
                      color: '#0f172a',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>
              </div>

              {/* Pre-Flight Audit Box */}
              <div style={{
                backgroundColor: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: '14px',
                padding: '16px 20px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '12px'
              }}>
                <div>
                  <div style={{ fontSize: '11px', fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>
                    PRE-FLIGHT AUTHORIZATION AUDIT
                  </div>
                  <div style={{ fontSize: '13px', color: '#334155', marginTop: '2px' }}>
                    Targeting <strong>{selectedStudentIds.length}</strong> active student accounts across{' '}
                    <strong>{activeTab === 'standard' ? selectedFeeGroupIds.length : 1}</strong> fee structures.
                  </div>
                </div>

                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '11px', fontWeight: 700, color: '#64748b' }}>
                    PROJECTED BATCH VALUE
                  </div>
                  <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#059669' }}>
                    {formatCurrency(projectedBatchAmount)}
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div style={{
              padding: '18px 28px',
              borderTop: '1px solid #e2e8f0',
              backgroundColor: '#f8fafc',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '12px'
            }}>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                disabled={processing}
                style={{
                  padding: '10px 20px',
                  backgroundColor: '#ffffff',
                  color: '#475569',
                  border: '1px solid #cbd5e1',
                  borderRadius: '10px',
                  fontSize: '13px',
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={activeTab === 'standard' ? handleProcessStandard : handleProcessCustom}
                disabled={processing || selectedStudentIds.length === 0 || (activeTab === 'standard' && selectedFeeGroupIds.length === 0)}
                style={{
                  padding: '12px 28px',
                  backgroundColor: processing ? '#94a3b8' : '#059669',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '12px',
                  fontSize: '14px',
                  fontWeight: 800,
                  cursor: processing ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  boxShadow: '0 4px 12px rgba(5, 150, 105, 0.3)'
                }}
              >
                {processing ? (
                  <>
                    <span>⏳</span>
                    <span>AUTHORIZING BATCH RUN...</span>
                  </>
                ) : (
                  <>
                    <span>✓</span>
                    <span>AUTHORIZE & ISSUE INVOICES ({selectedStudentIds.length})</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
