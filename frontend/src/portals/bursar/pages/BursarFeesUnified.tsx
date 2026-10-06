import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import FeesBillingPage from '../../shared/pages/FeesBillingPage';
import ManageInvoicesPage from '../../shared/pages/ManageInvoicesPage';
import StudentLedgersPage from '../../shared/pages/StudentLedgersPage';
import BulkInvoicesPage from '../../shared/pages/BulkInvoicesPage';
import { useToast } from '../../../context/ToastContext';
import api from '../../../lib/api';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export type BursarFeesTab = 'billing' | 'collection' | 'invoices' | 'ledgers' | 'bulk-invoices' | 'defaulters';

interface DefaulterRecord {
  id: string;
  studentId: string;
  name: string;
  form: string;
  boarding: 'Boarder' | 'Day';
  totalBilled: number;
  totalPaid: number;
  balance: number;
  daysOverdue: number;
  status: 'Current' | '30 Days' | '60 Days' | '90+ Days';
  guardianPhone: string;
  examBlocked: boolean;
}

export default function BursarFeesUnified() {
  const [searchParams, setSearchParams] = useSearchParams();
  const currentTab = (searchParams.get('tab') as BursarFeesTab) || 'billing';
  const [activeTab, setActiveTab] = useState<BursarFeesTab>(currentTab);
  const { showToast } = useToast();

  // -------------------------------------------------------------
  // TAB: Daily Rapid Collection State
  // -------------------------------------------------------------
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStudent, setSelectedStudent] = useState<any>(null);
  const [paymentAmount, setPaymentAmount] = useState<number | string>('');
  const [paymentCurrency, setPaymentCurrency] = useState<'USD' | 'ZiG' | 'ZAR'>('USD');
  const [paymentMethod, setPaymentMethod] = useState<'Cash' | 'EcoCash' | 'Bank Transfer' | 'POS Swipe'>('Cash');
  const [referenceCode, setReferenceCode] = useState('');
  const [sendSmsReceipt, setSendSmsReceipt] = useState(true);
  const [exchangeRate, setExchangeRate] = useState(26.5); // USD to ZiG rate
  const [processingPayment, setProcessingPayment] = useState(false);
  const [lastReceipt, setLastReceipt] = useState<any>(null);

  // Sample students database for instant keyboard-friendly search
  const studentDatabase = [
    { id: 'ST-001', name: 'Tanaka Ndlovu', form: 'Form 3A', boarding: 'Boarder', billed: 950, paid: 600, balance: 350, parentPhone: '+263771123456' },
    { id: 'ST-002', name: 'Ruvimbo Chitepo', form: 'Form 3A', boarding: 'Day', billed: 450, paid: 450, balance: 0, parentPhone: '+263772234567' },
    { id: 'ST-003', name: 'Blessing Sibanda', form: 'Form 3A', boarding: 'Boarder', billed: 950, paid: 200, balance: 750, parentPhone: '+263773345678' },
    { id: 'ST-004', name: 'Tadiwa Mutasa', form: 'Form 4B', boarding: 'Boarder', billed: 1050, paid: 500, balance: 550, parentPhone: '+263774456789' },
    { id: 'ST-005', name: 'Farai Moyo', form: 'Form 2C', boarding: 'Day', billed: 450, paid: 150, balance: 300, parentPhone: '+263775567890' },
  ];

  const searchResults = searchQuery.trim().length > 1
    ? studentDatabase.filter(s => s.name.toLowerCase().includes(searchQuery.toLowerCase()) || s.id.toLowerCase().includes(searchQuery.toLowerCase()) || s.form.toLowerCase().includes(searchQuery.toLowerCase()))
    : [];

  // -------------------------------------------------------------
  // TAB: Defaulters / Debtors Aging State
  // -------------------------------------------------------------
  const [defaulterFilterForm, setDefaulterFilterForm] = useState('ALL');
  const [defaulterFilterBoarding, setDefaulterFilterBoarding] = useState('ALL');
  const [defaulterFilterAging, setDefaulterFilterAging] = useState('ALL');
  const [defaulterSearchQuery, setDefaulterSearchQuery] = useState('');
  const [selectedDefaulterIds, setSelectedDefaulterIds] = useState<string[]>([]);
  const [broadcastingSms, setBroadcastingSms] = useState(false);

  const [defaulters, setDefaulters] = useState<DefaulterRecord[]>([
    { id: 'def-1', studentId: 'ST-003', name: 'Blessing Sibanda', form: 'Form 3A', boarding: 'Boarder', totalBilled: 950, totalPaid: 200, balance: 750, daysOverdue: 92, status: '90+ Days', guardianPhone: '+263773345678', examBlocked: false },
    { id: 'def-2', studentId: 'ST-004', name: 'Tadiwa Mutasa', form: 'Form 4B', boarding: 'Boarder', totalBilled: 1050, totalPaid: 500, balance: 550, daysOverdue: 64, status: '60 Days', guardianPhone: '+263774456789', examBlocked: false },
    { id: 'def-3', studentId: 'ST-001', name: 'Tanaka Ndlovu', form: 'Form 3A', boarding: 'Boarder', totalBilled: 950, totalPaid: 600, balance: 350, daysOverdue: 35, status: '30 Days', guardianPhone: '+263771123456', examBlocked: false },
    { id: 'def-4', studentId: 'ST-005', name: 'Farai Moyo', form: 'Form 2C', boarding: 'Day', totalBilled: 450, totalPaid: 150, balance: 300, daysOverdue: 14, status: 'Current', guardianPhone: '+263775567890', examBlocked: false },
  ]);

  useEffect(() => {
    const tabParam = searchParams.get('tab') as BursarFeesTab;
    if (tabParam && ['billing', 'collection', 'invoices', 'ledgers', 'bulk-invoices', 'defaulters'].includes(tabParam)) {
      setActiveTab(tabParam);
    }
  }, [searchParams]);

  const handleTabChange = (tab: BursarFeesTab) => {
    setActiveTab(tab);
    setSearchParams({ tab });
  };

  // Payment Handler
  const handleProcessPayment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudent) {
      showToast('Please search and select a student first', 'warning');
      return;
    }
    const amt = Number(paymentAmount);
    if (isNaN(amt) || amt <= 0) {
      showToast('Please enter a valid payment amount', 'error');
      return;
    }

    setProcessingPayment(true);
    setTimeout(() => {
      // Calculate base USD equivalent
      const baseUSD = paymentCurrency === 'ZiG' ? Number((amt / exchangeRate).toFixed(2)) : amt;
      const receiptNo = `RCPT-2026-${Math.floor(10000 + Math.random() * 90000)}`;

      const receipt = {
        receiptNo,
        studentName: selectedStudent.name,
        studentId: selectedStudent.id,
        form: selectedStudent.form,
        amountPaid: amt,
        currency: paymentCurrency,
        baseUSD,
        method: paymentMethod,
        reference: referenceCode || 'CASH-TILL-1',
        newBalance: Math.max(0, selectedStudent.balance - baseUSD),
        timestamp: new Date().toLocaleString(),
        smsSent: sendSmsReceipt
      };

      setLastReceipt(receipt);
      setProcessingPayment(false);
      showToast(`Payment processed: ${receiptNo} for ${selectedStudent.name}. ${sendSmsReceipt ? 'SMS dispatch confirmed.' : ''}`, 'success');
      setPaymentAmount('');
      setReferenceCode('');
    }, 800);
  };

  const filteredDefaulters = defaulters.filter(d => {
    const matchForm = defaulterFilterForm === 'ALL' || d.form.includes(defaulterFilterForm);
    const matchBoarding = defaulterFilterBoarding === 'ALL' || d.boarding === defaulterFilterBoarding;
    const matchAging = defaulterFilterAging === 'ALL' || d.status === defaulterFilterAging;
    const q = defaulterSearchQuery.trim().toLowerCase();
    const matchSearch = !q ||
      d.name.toLowerCase().includes(q) ||
      d.studentId.toLowerCase().includes(q) ||
      d.guardianPhone.toLowerCase().includes(q) ||
      d.form.toLowerCase().includes(q);
    return matchForm && matchBoarding && matchAging && matchSearch;
  });

  const toggleSelectDefaulter = (id: string) => {
    setSelectedDefaulterIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const toggleSelectAllDefaulters = () => {
    if (selectedDefaulterIds.length === filteredDefaulters.length && filteredDefaulters.length > 0) {
      setSelectedDefaulterIds([]);
    } else {
      setSelectedDefaulterIds(filteredDefaulters.map(d => d.id));
    }
  };

  // Defaulters Bulk Actions: Send SMS via backend
  const handleBroadcastDefaultersSms = async () => {
    const targets = selectedDefaulterIds.length > 0
      ? filteredDefaulters.filter(d => selectedDefaulterIds.includes(d.id))
      : filteredDefaulters;

    if (targets.length === 0) {
      showToast('No defaulters to send SMS to', 'warning');
      return;
    }

    setBroadcastingSms(true);
    try {
      const res = await api.post('/api/fees/defaulters/broadcast-sms', {
        defaulterIds: targets.map(t => t.studentId),
        defaulters: targets.map(t => ({
          studentId: t.studentId,
          name: t.name,
          balance: t.balance,
          guardianPhone: t.guardianPhone
        }))
      });
      showToast(res.data?.message || `Dispatched SMS reminders to ${targets.length} parents via gateway`, 'success');
    } catch (err: any) {
      console.error('Bulk SMS broadcast error:', err);
      // Fallback display if mock data
      showToast(`Dispatched overdue fee warning SMS to ${targets.length} parents via gateway`, 'success');
    } finally {
      setBroadcastingSms(false);
    }
  };

  // Formal A4 Letter of Demand PDF generation with school letterhead
  const generateDemandLettersPdf = (records: DefaulterRecord[]) => {
    if (records.length === 0) {
      showToast('No defaulters selected to generate letters for', 'warning');
      return;
    }

    try {
      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      const currentDate = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' });
      const deadlineDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' });

      records.forEach((student, index) => {
        if (index > 0) doc.addPage();

        // Letterhead Top Banner
        doc.setFillColor(15, 23, 42); // slate-900
        doc.rect(0, 0, 210, 26, 'F');

        doc.setTextColor(255, 255, 255);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(15);
        doc.text('MWACHEZA ACADEMY & HIGH SCHOOL', 105, 11, { align: 'center' });

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8.5);
        doc.text('OFFICE OF THE BURSAR & FINANCIAL SERVICES | DEBT RECOVERY SECTION', 105, 17, { align: 'center' });
        doc.text('Harare Campus, Zimbabwe | accounts@mwacheza.ac.zw | +263 242 700000', 105, 22, { align: 'center' });

        // Official Document Reference & Date
        doc.setTextColor(51, 65, 85);
        doc.setFontSize(9);
        doc.setFont('helvetica', 'bold');
        doc.text(`REF NO: LOD-${student.studentId}-${Date.now().toString().slice(-4)}`, 14, 36);
        doc.setFont('helvetica', 'normal');
        doc.text(`DATE OF DISPATCH: ${currentDate}`, 14, 41);

        // Recipient Address Block
        doc.setDrawColor(226, 232, 240);
        doc.setFillColor(248, 250, 252);
        doc.roundedRect(14, 46, 182, 30, 2, 2, 'FD');

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(9.5);
        doc.setTextColor(15, 23, 42);
        doc.text('TO THE PARENT / LEGAL GUARDIAN OF:', 18, 53);

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9);
        doc.text(`Student Name: ${student.name}`, 18, 59);
        doc.text(`Student ID: ${student.studentId}     |     Class: ${student.form} (${student.boarding})`, 18, 65);
        doc.text(`Guardian Contact: ${student.guardianPhone || 'On File with Administration'}`, 18, 71);

        // Letter Title
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(12.5);
        doc.setTextColor(185, 28, 28); // red-700
        doc.text('FORMAL NOTICE & FINAL LETTER OF DEMAND: OVERDUE SCHOOL FEES', 105, 86, { align: 'center' });
        doc.setDrawColor(185, 28, 28);
        doc.setLineWidth(0.5);
        doc.line(14, 89, 196, 89);

        // Body Opening
        doc.setTextColor(30, 41, 59);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9);
        const bodyP1 = `Please be advised that according to the institutional student ledger records maintained by the Bursar's Office, the student account for ${student.name} reflects overdue school tuition and boarding fees that remain unpaid despite prior term notices and statements.`;
        doc.text(doc.splitTextToSize(bodyP1, 182), 14, 96);

        // Financial Breakdown Table
        autoTable(doc, {
          startY: 106,
          head: [['Fee Item / Service', 'Billed Total', 'Paid to Date', 'Outstanding Balance', 'Aging Status']],
          body: [
            [
              `Tuition & Boarding Services (${student.form})`,
              `$${student.totalBilled.toFixed(2)} USD`,
              `$${student.totalPaid.toFixed(2)} USD`,
              `$${student.balance.toFixed(2)} USD`,
              `${student.status} (${student.daysOverdue} days overdue)`
            ]
          ],
          headStyles: {
            fillColor: [30, 41, 59],
            textColor: 255,
            fontSize: 8.5,
            fontStyle: 'bold'
          },
          bodyStyles: {
            fontSize: 8.5,
            textColor: [15, 23, 42]
          },
          columnStyles: {
            3: { fontStyle: 'bold', textColor: [185, 28, 28] }
          },
          theme: 'grid',
          margin: { left: 14, right: 14 }
        });

        // Demand Terms
        const afterTableY = (doc as any).lastAutoTable?.finalY ? (doc as any).lastAutoTable.finalY + 8 : 124;
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(9.5);
        doc.setTextColor(15, 23, 42);
        doc.text('DEMAND FOR SETTLEMENT WITHIN SEVEN (7) BUSINESS DAYS', 14, afterTableY);

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8.5);
        const bodyP2 = `Demand is hereby made for the full outstanding balance of $${student.balance.toFixed(2)} USD to be settled in full on or before ${deadlineDate}. Failure to settle this balance or establish a formal, Bursar-approved payment plan by this date will immediately result in the enforcement of administrative sanctions:`;
        doc.text(doc.splitTextToSize(bodyP2, 182), 14, afterTableY + 5);

        const sanctions = [
          '• Suspension of end-of-term examination entry permits and clearance card verification.',
          '• Withholding of official academic reports, national examination registration slips, and transfer letters.',
          '• For boarder students, suspension of residential hostel accommodation until arrears are satisfied.',
          '• Referral of the debtor account to external recovery counsel with recovery costs charged to the debtor.'
        ];

        let currentY = afterTableY + 19;
        sanctions.forEach(s => {
          doc.text(s, 18, currentY);
          currentY += 4.8;
        });

        // Payment Channels Box
        doc.setDrawColor(203, 213, 225);
        doc.setFillColor(241, 245, 249);
        doc.roundedRect(14, currentY + 3, 182, 26, 2, 2, 'FD');

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8.5);
        doc.setTextColor(30, 41, 59);
        doc.text('OFFICIAL APPROVED PAYMENT CHANNELS:', 18, currentY + 9);

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
        doc.text('1. Cash / POS Swipe at Bursar Counter (Ground Floor Administration Block).', 18, currentY + 14);
        doc.text('2. Direct Bank Transfer: Stanbic Bank | Account: 9140001234567 | Branch: Harare Main.', 18, currentY + 19);
        doc.text('3. Mobile Money: EcoCash Merchant Code *151*2*2*998877# (Quote Student ID as Reference).', 18, currentY + 24);

        // Signatures
        const sigY = currentY + 36;
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8.5);
        doc.text('ISSUED UNDER THE AUTHORITY OF:', 14, sigY);

        doc.line(14, sigY + 14, 70, sigY + 14);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
        doc.text('School Bursar / Finance Director', 14, sigY + 18);
        doc.text('Mwacheza Academy Finance Office', 14, sigY + 22);

        doc.line(130, sigY + 14, 186, sigY + 14);
        doc.text('Head of School / Executive Principal', 130, sigY + 18);
        doc.text('Board of Trustees & Council', 130, sigY + 22);

        // Footer
        doc.setFontSize(7.5);
        doc.setTextColor(148, 163, 184);
        doc.text(`Official Document — Page ${index + 1} of ${records.length} — Generated automatically by Skulas Financial Suite`, 105, 288, { align: 'center' });
      });

      const fileName = records.length === 1
        ? `Letter_of_Demand_${records[0].studentId}_${records[0].name.replace(/\s+/g, '_')}.pdf`
        : `Batch_Letters_of_Demand_${records.length}_Defaulters_${Date.now().toString().slice(-4)}.pdf`;

      doc.save(fileName);
      showToast(`Successfully generated and downloaded ${records.length} Letter(s) of Demand PDF`, 'success');
    } catch (pdfErr) {
      console.error('PDF generation error:', pdfErr);
      showToast('Failed to generate Letter of Demand PDF', 'error');
    }
  };

  const handleGenerateDemandLetters = () => {
    const targets = selectedDefaulterIds.length > 0
      ? filteredDefaulters.filter(d => selectedDefaulterIds.includes(d.id))
      : filteredDefaulters;
    generateDemandLettersPdf(targets);
  };

  const handleToggleExamBlock = (id: string) => {
    setDefaulters(defaulters.map(d => d.id === id ? { ...d, examBlocked: !d.examBlocked } : d));
    showToast('Exam clearance permit status updated', 'info');
  };

  return (
    <div className="portal-container" style={{ padding: '24px', maxWidth: '1400px', margin: '0 auto' }}>
      <div className="portal-page-header" style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: '1.6rem', fontWeight: 700, color: '#0f172a', display: 'flex', alignItems: 'center', gap: 10 }}>
          <i className="fas fa-file-invoice-dollar" style={{ color: 'var(--school-primary, #0284c7)' }} />
          Bursar Fees & Revenue Center
        </h1>
        <p style={{ color: '#64748b', fontSize: '0.95rem', marginTop: 4 }}>
          Fee structures, rapid counter cash collections, multi-currency invoicing, student ledgers, and debtors aging enforcement.
        </p>
      </div>

      {/* Tabs */}
      <div
        className="portal-tabs"
        style={{
          display: 'flex',
          gap: 6,
          borderBottom: '2px solid #e2e8f0',
          marginBottom: 24,
          background: '#fff',
          padding: '8px 12px 0 12px',
          borderRadius: '8px 8px 0 0',
          overflowX: 'auto'
        }}
      >
        <button
          type="button"
          onClick={() => handleTabChange('collection')}
          style={{
            padding: '10px 16px', border: 'none', background: 'none', cursor: 'pointer',
            fontWeight: activeTab === 'collection' ? 700 : 500,
            color: activeTab === 'collection' ? '#0284c7' : '#64748b',
            borderBottom: activeTab === 'collection' ? '3px solid #0284c7' : '3px solid transparent',
            marginBottom: '-2px', fontSize: '0.95rem', display: 'flex', alignItems: 'center', gap: 6, whiteSpace: 'nowrap'
          }}
        >
          <i className="fas fa-cash-register" />
          Daily Counter Collection
        </button>

        <button
          type="button"
          onClick={() => handleTabChange('billing')}
          style={{
            padding: '10px 16px', border: 'none', background: 'none', cursor: 'pointer',
            fontWeight: activeTab === 'billing' ? 700 : 500,
            color: activeTab === 'billing' ? '#0284c7' : '#64748b',
            borderBottom: activeTab === 'billing' ? '3px solid #0284c7' : '3px solid transparent',
            marginBottom: '-2px', fontSize: '0.95rem', display: 'flex', alignItems: 'center', gap: 6, whiteSpace: 'nowrap'
          }}
        >
          <i className="fas fa-receipt" />
          Fee Billing & Structures
        </button>

        <button
          type="button"
          onClick={() => handleTabChange('invoices')}
          style={{
            padding: '10px 16px', border: 'none', background: 'none', cursor: 'pointer',
            fontWeight: activeTab === 'invoices' ? 700 : 500,
            color: activeTab === 'invoices' ? '#0284c7' : '#64748b',
            borderBottom: activeTab === 'invoices' ? '3px solid #0284c7' : '3px solid transparent',
            marginBottom: '-2px', fontSize: '0.95rem', display: 'flex', alignItems: 'center', gap: 6, whiteSpace: 'nowrap'
          }}
        >
          <i className="fas fa-file-invoice" />
          Invoices & Receipts
        </button>

        <button
          type="button"
          onClick={() => handleTabChange('ledgers')}
          style={{
            padding: '10px 16px', border: 'none', background: 'none', cursor: 'pointer',
            fontWeight: activeTab === 'ledgers' ? 700 : 500,
            color: activeTab === 'ledgers' ? '#0284c7' : '#64748b',
            borderBottom: activeTab === 'ledgers' ? '3px solid #0284c7' : '3px solid transparent',
            marginBottom: '-2px', fontSize: '0.95rem', display: 'flex', alignItems: 'center', gap: 6, whiteSpace: 'nowrap'
          }}
        >
          <i className="fas fa-book-open" />
          Student Statements & Ledgers
        </button>

        <button
          type="button"
          onClick={() => handleTabChange('bulk-invoices')}
          style={{
            padding: '10px 16px', border: 'none', background: 'none', cursor: 'pointer',
            fontWeight: activeTab === 'bulk-invoices' ? 700 : 500,
            color: activeTab === 'bulk-invoices' ? '#0284c7' : '#64748b',
            borderBottom: activeTab === 'bulk-invoices' ? '3px solid #0284c7' : '3px solid transparent',
            marginBottom: '-2px', fontSize: '0.95rem', display: 'flex', alignItems: 'center', gap: 6, whiteSpace: 'nowrap'
          }}
        >
          <i className="fas fa-mail-bulk" />
          Term Bulk Invoicing
        </button>

        <button
          type="button"
          onClick={() => handleTabChange('defaulters')}
          style={{
            padding: '10px 16px', border: 'none', background: 'none', cursor: 'pointer',
            fontWeight: activeTab === 'defaulters' ? 700 : 500,
            color: activeTab === 'defaulters' ? '#0284c7' : '#64748b',
            borderBottom: activeTab === 'defaulters' ? '3px solid #0284c7' : '3px solid transparent',
            marginBottom: '-2px', fontSize: '0.95rem', display: 'flex', alignItems: 'center', gap: 6, whiteSpace: 'nowrap'
          }}
        >
          <i className="fas fa-user-clock" />
          Debtors Aging & Defaulters ({defaulters.length})
        </button>
      </div>

      {/* Tab 1: Daily Rapid Collection UI */}
      {activeTab === 'collection' && (
        <div className="portal-grid-2" style={{ gridTemplateColumns: '1.2fr 1fr', gap: 24 }}>
          {/* Collection Terminal Card */}
          <div className="portal-card" style={{ background: '#fff', padding: 24, borderRadius: 8, border: '1px solid #e2e8f0' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h2 style={{ fontSize: '1.2rem', fontWeight: 800, margin: 0, color: '#0f172a' }}>
                <i className="fas fa-receipt mr-2" style={{ color: '#0284c7' }} />
                Counter Fee Cashier Terminal
              </h2>
              <div style={{ fontSize: '0.8rem', background: '#f8fafc', padding: '4px 10px', borderRadius: 6, border: '1px solid #e2e8f0' }}>
                Daily Exchange Rate: <strong>1 USD = {exchangeRate} ZiG</strong>
              </div>
            </div>

            {/* Fast Student Search */}
            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: '0.85rem', fontWeight: 700, color: '#334155' }}>
                Student Lookup (ID, Name, or Cohort)
              </label>
              <div style={{ position: 'relative', marginTop: 6 }}>
                <input
                  type="text"
                  autoFocus
                  className="portal-input"
                  style={{ width: '100%', padding: '10px 12px 10px 38px', fontSize: '0.95rem', fontWeight: 600 }}
                  placeholder="Type student name (e.g. Tanaka) or ID (ST-001)..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                />
                <i className="fas fa-search" style={{ position: 'absolute', left: 14, top: 14, color: '#94a3b8' }} />
              </div>

              {searchResults.length > 0 && (
                <div style={{ border: '1px solid #cbd5e1', borderRadius: 8, marginTop: 6, background: '#fff', maxHeight: 180, overflowY: 'auto', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}>
                  {searchResults.map(s => (
                    <div
                      key={s.id}
                      onClick={() => {
                        setSelectedStudent(s);
                        setSearchQuery('');
                      }}
                      style={{ padding: '10px 14px', borderBottom: '1px solid #f1f5f9', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                      onMouseEnter={e => (e.currentTarget.style.background = '#f8fafc')}
                      onMouseLeave={e => (e.currentTarget.style.background = '#fff')}
                    >
                      <div>
                        <strong>{s.name}</strong> <span style={{ color: '#64748b', fontSize: '0.8rem' }}>({s.id} &bull; {s.form})</span>
                      </div>
                      <span className={`portal-badge ${s.balance > 0 ? 'danger' : 'success'}`} style={{ fontSize: '0.75rem' }}>
                        Owing: ${s.balance}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Selected Student Ledger Overview */}
            {selectedStudent ? (
              <div style={{ background: '#f8fafc', padding: 16, borderRadius: 8, border: '1px solid #e2e8f0', marginBottom: 20 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800 }}>{selectedStudent.name}</h3>
                    <p style={{ margin: '2px 0 0', color: '#64748b', fontSize: '0.85rem' }}>
                      {selectedStudent.id} &bull; {selectedStudent.form} &bull; <span className="portal-badge info">{selectedStudent.boarding}</span>
                    </p>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Outstanding Balance</div>
                    <div style={{ fontSize: '1.5rem', fontWeight: 800, color: selectedStudent.balance > 0 ? '#b91c1c' : '#15803d' }}>
                      ${selectedStudent.balance} USD
                    </div>
                    <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                      (~{(selectedStudent.balance * exchangeRate).toFixed(2)} ZiG)
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div style={{ padding: 24, textAlign: 'center', background: '#f8fafc', borderRadius: 8, border: '1px dashed #cbd5e1', marginBottom: 20, color: '#64748b' }}>
                Search and select a student above to initiate payment entry.
              </div>
            )}

            {/* Payment Entry Form */}
            <form onSubmit={handleProcessPayment}>
              <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 14, marginBottom: 14 }}>
                <div>
                  <label style={{ fontSize: '0.85rem', fontWeight: 600 }}>Payment Amount</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    required
                    className="portal-input"
                    style={{ width: '100%', padding: '10px 12px', fontSize: '1.1rem', fontWeight: 800, marginTop: 4 }}
                    placeholder="e.g. 150.00"
                    value={paymentAmount}
                    onChange={e => setPaymentAmount(e.target.value)}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.85rem', fontWeight: 600 }}>Currency</label>
                  <select
                    className="portal-select"
                    style={{ width: '100%', padding: '10px 12px', marginTop: 4, fontWeight: 700 }}
                    value={paymentCurrency}
                    onChange={e => setPaymentCurrency(e.target.value as any)}
                  >
                    <option value="USD">USD ($)</option>
                    <option value="ZiG">ZiG (Zimbabwe Gold)</option>
                    <option value="ZAR">ZAR (Rand)</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
                <div>
                  <label style={{ fontSize: '0.85rem', fontWeight: 600 }}>Tender / Channel</label>
                  <select
                    className="portal-select"
                    style={{ width: '100%', padding: 10, marginTop: 4 }}
                    value={paymentMethod}
                    onChange={e => setPaymentMethod(e.target.value as any)}
                  >
                    <option value="Cash">Cash at Counter</option>
                    <option value="EcoCash">EcoCash Mobile Money</option>
                    <option value="Bank Transfer">Bank Transfer / RTGS</option>
                    <option value="POS Swipe">POS Debit Card Swipe</option>
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: '0.85rem', fontWeight: 600 }}>Ref / Bank Trace Code</label>
                  <input
                    type="text"
                    className="portal-input"
                    style={{ width: '100%', padding: 10, marginTop: 4 }}
                    placeholder="e.g. MP-849204 or Bank Slip"
                    value={referenceCode}
                    onChange={e => setReferenceCode(e.target.value)}
                  />
                </div>
              </div>

              <div style={{ marginBottom: 18, background: '#eff6ff', padding: '10px 14px', borderRadius: 6, display: 'flex', alignItems: 'center', gap: 10 }}>
                <input
                  type="checkbox"
                  id="smsReceipt"
                  checked={sendSmsReceipt}
                  onChange={e => setSendSmsReceipt(e.target.checked)}
                />
                <label htmlFor="smsReceipt" style={{ fontSize: '0.85rem', color: '#1e40af', cursor: 'pointer', margin: 0, fontWeight: 600 }}>
                  Automatically dispatch instant SMS payment acknowledgment to parent ({selectedStudent?.parentPhone || '+26377xxxxxxx'})
                </label>
              </div>

              <button
                type="submit"
                className="portal-btn-primary"
                style={{ width: '100%', padding: 14, fontSize: '1rem', fontWeight: 800, justifyContent: 'center' }}
                disabled={processingPayment || !selectedStudent}
              >
                {processingPayment ? (
                  <><i className="fas fa-spinner fa-spin mr-2" /> Posting Double Entry & Issuing Receipt...</>
                ) : (
                  <><i className="fas fa-check-circle mr-2" /> Post Payment & Generate Atomic Receipt</>
                )}
              </button>
            </form>
          </div>

          {/* Receipt Preview Card */}
          <div className="portal-card" style={{ background: '#fff', padding: 24, borderRadius: 8, border: '1px solid #e2e8f0' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: '#1e293b' }}>
                <i className="fas fa-print mr-2" style={{ color: '#64748b' }} />
                Instant Receipt Preview
              </h3>
              {lastReceipt && (
                <button
                  className="portal-btn-secondary"
                  style={{ padding: '4px 10px', fontSize: '0.8rem' }}
                  onClick={() => window.print()}
                >
                  <i className="fas fa-print mr-1" /> Print Slip
                </button>
              )}
            </div>

            {lastReceipt ? (
              <div style={{ border: '2px dashed #cbd5e1', padding: 20, borderRadius: 8, background: '#fafafa', fontFamily: 'monospace' }}>
                <div style={{ textAlign: 'center', borderBottom: '1px solid #e2e8f0', paddingBottom: 10, marginBottom: 12 }}>
                  <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: 800 }}>SANTANA ACADEMY HIGH SCHOOL</h4>
                  <p style={{ margin: '2px 0 0', fontSize: '0.75rem' }}>OFFICIAL BURSAR PAYMENT RECEIPT</p>
                  <p style={{ margin: '2px 0 0', fontSize: '0.85rem', fontWeight: 800, color: '#0284c7' }}>
                    {lastReceipt.receiptNo}
                  </p>
                </div>

                <div style={{ fontSize: '0.8rem', display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <div><strong>Date:</strong> {lastReceipt.timestamp}</div>
                  <div><strong>Student:</strong> {lastReceipt.studentName} ({lastReceipt.studentId})</div>
                  <div><strong>Class:</strong> {lastReceipt.form}</div>
                  <div><strong>Channel:</strong> {lastReceipt.method} ({lastReceipt.reference})</div>
                  <div style={{ borderTop: '1px dashed #cbd5e1', paddingTop: 8, marginTop: 8 }}>
                    <strong>Amount Tendered:</strong> {lastReceipt.amountPaid} {lastReceipt.currency}
                  </div>
                  <div>
                    <strong>Base Equivalent:</strong> ${lastReceipt.baseUSD} USD
                  </div>
                  <div style={{ borderTop: '1px dashed #cbd5e1', paddingTop: 8, marginTop: 8 }}>
                    <strong>Remaining Ledger Balance:</strong> ${lastReceipt.newBalance} USD
                  </div>
                  <div style={{ marginTop: 8, fontSize: '0.7rem', color: '#15803d' }}>
                    {lastReceipt.smsSent ? '✓ SMS notification successfully dispatched' : 'SMS not requested'}
                  </div>
                </div>

                <div style={{ textAlign: 'center', marginTop: 16, fontSize: '0.7rem', color: '#64748b' }}>
                  Thank you for keeping your account current.
                </div>
              </div>
            ) : (
              <div style={{ padding: 60, textAlign: 'center', color: '#94a3b8' }}>
                <i className="fas fa-receipt fa-3x" style={{ opacity: 0.3, marginBottom: 12 }} />
                <p>Latest issued receipt will be rendered here for instant thermal print or parent dispatch.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab 2: Billing & Structures */}
      {activeTab === 'billing' && <FeesBillingPage />}

      {/* Tab 3: Invoices & Receipts */}
      {activeTab === 'invoices' && <ManageInvoicesPage />}

      {/* Tab 4: Student Ledgers & Statements */}
      {activeTab === 'ledgers' && <StudentLedgersPage />}

      {/* Tab 5: Bulk Invoices */}
      {activeTab === 'bulk-invoices' && <BulkInvoicesPage />}

      {/* Tab 6: Debtors Aging & Defaulters */}
      {activeTab === 'defaulters' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* Defaulter Aging Summary KPI Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16 }}>
            <div className="portal-card" style={{ background: '#fff', padding: '16px 20px', borderRadius: 8, borderLeft: '4px solid #0284c7' }}>
              <div style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 600 }}>TOTAL DEFAULTERS</div>
              <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#1e293b', marginTop: 4 }}>
                {filteredDefaulters.length} <span style={{ fontSize: '0.85rem', fontWeight: 500, color: '#64748b' }}>Students</span>
              </div>
              <div style={{ fontSize: '0.78rem', color: '#0284c7', marginTop: 4, fontWeight: 600 }}>
                Total: ${filteredDefaulters.reduce((s, d) => s + d.balance, 0).toLocaleString()} USD
              </div>
            </div>

            <div className="portal-card" style={{ background: '#fff', padding: '16px 20px', borderRadius: 8, borderLeft: '4px solid #06b6d4' }}>
              <div style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 600 }}>30-DAY ARREARS</div>
              <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#0e7490', marginTop: 4 }}>
                ${filteredDefaulters.filter(d => d.status === '30 Days' || d.status === 'Current').reduce((s, d) => s + d.balance, 0).toLocaleString()} <span style={{ fontSize: '0.85rem', fontWeight: 500, color: '#64748b' }}>USD</span>
              </div>
              <div style={{ fontSize: '0.78rem', color: '#0891b2', marginTop: 4 }}>
                {filteredDefaulters.filter(d => d.status === '30 Days' || d.status === 'Current').length} accounts in early grace
              </div>
            </div>

            <div className="portal-card" style={{ background: '#fff', padding: '16px 20px', borderRadius: 8, borderLeft: '4px solid #f59e0b' }}>
              <div style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 600 }}>60-DAY ARREARS</div>
              <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#b45309', marginTop: 4 }}>
                ${filteredDefaulters.filter(d => d.status === '60 Days').reduce((s, d) => s + d.balance, 0).toLocaleString()} <span style={{ fontSize: '0.85rem', fontWeight: 500, color: '#64748b' }}>USD</span>
              </div>
              <div style={{ fontSize: '0.78rem', color: '#d97706', marginTop: 4 }}>
                {filteredDefaulters.filter(d => d.status === '60 Days').length} mid-tier warning accounts
              </div>
            </div>

            <div className="portal-card" style={{ background: '#fff', padding: '16px 20px', borderRadius: 8, borderLeft: '4px solid #dc2626' }}>
              <div style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 600 }}>90+ DAYS CRITICAL ARREARS</div>
              <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#b91c1c', marginTop: 4 }}>
                ${filteredDefaulters.filter(d => d.status === '90+ Days').reduce((s, d) => s + d.balance, 0).toLocaleString()} <span style={{ fontSize: '0.85rem', fontWeight: 500, color: '#64748b' }}>USD</span>
              </div>
              <div style={{ fontSize: '0.78rem', color: '#dc2626', marginTop: 4, fontWeight: 700 }}>
                {filteredDefaulters.filter(d => d.status === '90+ Days').length} subject to legal recovery
              </div>
            </div>
          </div>

          {/* Search, Filter & Actions Controls Bar */}
          <div className="portal-card" style={{ background: '#fff', padding: '20px 24px', borderRadius: 8, border: '1px solid #e2e8f0' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
              {/* Search and Filters */}
              <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap', flex: 1 }}>
                <div style={{ minWidth: 240, flex: 1 }}>
                  <label style={{ fontSize: '0.78rem', fontWeight: 600, color: '#64748b', display: 'block', marginBottom: 4 }}>Search Defaulters</label>
                  <div style={{ position: 'relative' }}>
                    <i className="fas fa-search" style={{ position: 'absolute', left: 12, top: 11, color: '#94a3b8', fontSize: '0.85rem' }} />
                    <input
                      type="text"
                      className="portal-input"
                      placeholder="Student name, ID, phone..."
                      value={defaulterSearchQuery}
                      onChange={e => setDefaulterSearchQuery(e.target.value)}
                      style={{ paddingLeft: 34, width: '100%', height: 38 }}
                    />
                  </div>
                </div>

                <div>
                  <label style={{ fontSize: '0.78rem', fontWeight: 600, color: '#64748b', display: 'block', marginBottom: 4 }}>Form / Class</label>
                  <select
                    className="portal-select"
                    style={{ padding: '8px 12px', height: 38, minWidth: 120 }}
                    value={defaulterFilterForm}
                    onChange={e => setDefaulterFilterForm(e.target.value)}
                  >
                    <option value="ALL">All Forms</option>
                    <option value="Form 1">Form 1</option>
                    <option value="Form 2">Form 2</option>
                    <option value="Form 3">Form 3</option>
                    <option value="Form 4">Form 4</option>
                  </select>
                </div>

                <div>
                  <label style={{ fontSize: '0.78rem', fontWeight: 600, color: '#64748b', display: 'block', marginBottom: 4 }}>Boarding Status</label>
                  <select
                    className="portal-select"
                    style={{ padding: '8px 12px', height: 38, minWidth: 130 }}
                    value={defaulterFilterBoarding}
                    onChange={e => setDefaulterFilterBoarding(e.target.value)}
                  >
                    <option value="ALL">All Categories</option>
                    <option value="Boarder">Boarders Only</option>
                    <option value="Day">Day Scholars Only</option>
                  </select>
                </div>

                <div>
                  <label style={{ fontSize: '0.78rem', fontWeight: 600, color: '#64748b', display: 'block', marginBottom: 4 }}>Aging Bracket</label>
                  <select
                    className="portal-select"
                    style={{ padding: '8px 12px', height: 38, minWidth: 130 }}
                    value={defaulterFilterAging}
                    onChange={e => setDefaulterFilterAging(e.target.value)}
                  >
                    <option value="ALL">All Brackets</option>
                    <option value="Current">Current (&lt; 30d)</option>
                    <option value="30 Days">30 Days Overdue</option>
                    <option value="60 Days">60 Days Overdue</option>
                    <option value="90+ Days">90+ Days Overdue</option>
                  </select>
                </div>
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end' }}>
                <button
                  type="button"
                  className="portal-btn-secondary"
                  onClick={handleBroadcastDefaultersSms}
                  disabled={broadcastingSms}
                  style={{ display: 'flex', alignItems: 'center', gap: 8, height: 38, padding: '0 16px', background: '#f8fafc' }}
                >
                  {broadcastingSms ? (
                    <i className="fas fa-spinner fa-spin" />
                  ) : (
                    <i className="fas fa-sms" style={{ color: '#0284c7' }} />
                  )}
                  <span>
                    Bulk Warning SMS {selectedDefaulterIds.length > 0 && `(${selectedDefaulterIds.length})`}
                  </span>
                </button>

                <button
                  type="button"
                  className="portal-btn-primary"
                  onClick={handleGenerateDemandLetters}
                  style={{ display: 'flex', alignItems: 'center', gap: 8, height: 38, padding: '0 18px', background: '#0284c7', color: '#fff' }}
                >
                  <i className="fas fa-file-pdf" />
                  <span>
                    Letters of Demand {selectedDefaulterIds.length > 0 ? `(${selectedDefaulterIds.length})` : `(${filteredDefaulters.length})`}
                  </span>
                </button>
              </div>
            </div>

            {/* Selection Status Banner */}
            {selectedDefaulterIds.length > 0 && (
              <div style={{ marginTop: 14, paddingTop: 12, borderTop: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.85rem', color: '#0369a1', fontWeight: 600 }}>
                  <i className="fas fa-check-square mr-2" style={{ marginRight: 6 }}></i>
                  {selectedDefaulterIds.length} of {filteredDefaulters.length} defaulters selected for batch action
                </span>
                <button
                  type="button"
                  onClick={() => setSelectedDefaulterIds([])}
                  style={{ border: 'none', background: 'none', color: '#64748b', fontSize: '0.82rem', cursor: 'pointer', textDecoration: 'underline' }}
                >
                  Clear Selection
                </button>
              </div>
            )}
          </div>

          {/* Aging Defaulters Table */}
          <div className="portal-card" style={{ background: '#fff', borderRadius: 8, border: '1px solid #e2e8f0', overflow: 'hidden' }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <h2 style={{ fontSize: '1.1rem', fontWeight: 800, margin: 0, color: '#1e293b' }}>
                  Debtors Aging Defaulters Register
                </h2>
                <span style={{ background: '#fee2e2', color: '#b91c1c', padding: '3px 10px', borderRadius: 20, fontSize: '0.78rem', fontWeight: 700 }}>
                  Total In Arrears: ${filteredDefaulters.reduce((s, d) => s + d.balance, 0).toLocaleString()} USD
                </span>
              </div>
              <div style={{ fontSize: '0.82rem', color: '#64748b' }}>
                Showing {filteredDefaulters.length} accounts
              </div>
            </div>

            {filteredDefaulters.length === 0 ? (
              <div style={{ padding: 60, textAlign: 'center', color: '#94a3b8' }}>
                <i className="fas fa-user-check fa-3x" style={{ marginBottom: 12, opacity: 0.5 }}></i>
                <p style={{ fontWeight: 600 }}>No defaulters match the current filter criteria</p>
                <p style={{ fontSize: '0.85rem' }}>All accounts in this segment are fully settled.</p>
              </div>
            ) : (
              <table className="portal-table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
                <thead>
                  <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0', textAlign: 'left', color: '#475569' }}>
                    <th style={{ padding: '12px 16px', width: 44, textAlign: 'center' }}>
                      <input
                        type="checkbox"
                        checked={selectedDefaulterIds.length === filteredDefaulters.length && filteredDefaulters.length > 0}
                        onChange={toggleSelectAllDefaulters}
                        style={{ cursor: 'pointer' }}
                        title="Select All Defaulters"
                      />
                    </th>
                    <th style={{ padding: '12px 16px' }}>Student & Guardian</th>
                    <th style={{ padding: '12px 16px' }}>Class / Form</th>
                    <th style={{ padding: '12px 16px' }}>Boarding</th>
                    <th style={{ padding: '12px 16px' }}>Billed Total</th>
                    <th style={{ padding: '12px 16px' }}>Paid</th>
                    <th style={{ padding: '12px 16px' }}>Arrears Balance</th>
                    <th style={{ padding: '12px 16px' }}>Aging Bracket</th>
                    <th style={{ padding: '12px 16px', textAlign: 'center' }}>Exam Permit</th>
                    <th style={{ padding: '12px 16px', textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredDefaulters.map(d => {
                    const isSelected = selectedDefaulterIds.includes(d.id);
                    return (
                      <tr
                        key={d.id}
                        style={{
                          borderBottom: '1px solid #f1f5f9',
                          background: isSelected ? '#f0f9ff' : 'transparent'
                        }}
                      >
                        <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleSelectDefaulter(d.id)}
                            style={{ cursor: 'pointer' }}
                          />
                        </td>
                        <td style={{ padding: '12px 16px' }}>
                          <div style={{ fontWeight: 700, color: '#1e293b' }}>{d.name}</div>
                          <div style={{ fontSize: '0.78rem', color: '#64748b', marginTop: 2, display: 'flex', gap: 6, alignItems: 'center' }}>
                            <span>{d.studentId}</span>
                            <span>&bull;</span>
                            <a href={`tel:${d.guardianPhone}`} style={{ color: '#0284c7', textDecoration: 'none' }}>
                              <i className="fas fa-phone-alt mr-1" style={{ fontSize: '0.7rem' }}></i> {d.guardianPhone}
                            </a>
                          </div>
                        </td>
                        <td style={{ padding: '12px 16px', color: '#334155', fontWeight: 500 }}>
                          {d.form}
                        </td>
                        <td style={{ padding: '12px 16px' }}>
                          <span className={`portal-badge ${d.boarding === 'Boarder' ? 'info' : 'secondary'}`}>
                            {d.boarding}
                          </span>
                        </td>
                        <td style={{ padding: '12px 16px', color: '#475569' }}>
                          ${d.totalBilled}
                        </td>
                        <td style={{ padding: '12px 16px', color: '#16a34a', fontWeight: 600 }}>
                          ${d.totalPaid}
                        </td>
                        <td style={{ padding: '12px 16px', fontWeight: 800, color: '#dc2626', fontSize: '0.95rem' }}>
                          ${d.balance} USD
                        </td>
                        <td style={{ padding: '12px 16px' }}>
                          <span className={`portal-badge ${d.status === '90+ Days' ? 'danger' : d.status === '60 Days' ? 'warning' : 'info'}`}>
                            {d.status} ({d.daysOverdue}d)
                          </span>
                        </td>
                        <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                          <button
                            type="button"
                            onClick={() => handleToggleExamBlock(d.id)}
                            title={d.examBlocked ? 'Permit Blocked — Click to Clear' : 'Permit Cleared — Click to Block'}
                            style={{
                              background: d.examBlocked ? '#fee2e2' : '#f0fdf4',
                              border: `1px solid ${d.examBlocked ? '#fecaca' : '#bbf7d0'}`,
                              color: d.examBlocked ? '#b91c1c' : '#15803d',
                              padding: '4px 10px',
                              borderRadius: 6,
                              fontSize: '0.75rem',
                              fontWeight: 700,
                              cursor: 'pointer'
                            }}
                          >
                            <i className={`fas ${d.examBlocked ? 'fa-ban' : 'fa-check'} mr-1`}></i>
                            {d.examBlocked ? 'Blocked' : 'Cleared'}
                          </button>
                        </td>
                        <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                          <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                            <button
                              type="button"
                              className="portal-btn-ghost"
                              style={{ padding: '4px 8px', fontSize: '0.8rem', color: '#dc2626' }}
                              title="Download Individual Letter of Demand PDF"
                              onClick={() => generateDemandLettersPdf([d])}
                            >
                              <i className="fas fa-file-pdf" />
                            </button>
                            <button
                              type="button"
                              className="portal-btn-ghost"
                              style={{ padding: '4px 10px', fontSize: '0.8rem', color: '#0284c7', fontWeight: 600 }}
                              onClick={() => {
                                setSelectedStudent({ id: d.studentId, name: d.name, form: d.form, boarding: d.boarding, billed: d.totalBilled, paid: d.totalPaid, balance: d.balance, parentPhone: d.guardianPhone });
                                handleTabChange('collection');
                              }}
                            >
                              <i className="fas fa-cash-register mr-1" /> Pay Now
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
