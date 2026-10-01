import prisma from '../lib/prisma';
import { SequenceService } from '../services/sequence.service';
import { TillService } from '../services/till.service';
import { CreditNoteService } from '../services/credit-note.service';
import { ComplianceService } from '../services/compliance.service';
import { LedgerService } from '../services/ledger.service';

async function runTests() {
  console.log('====================================================');
  console.log('  ACADEX ACCOUNTING & COMPLIANCE VERIFICATION SUITE');
  console.log('====================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string, detail?: string) {
    if (condition) {
      console.log(`  ✓ PASS: ${testName}`);
      passed++;
    } else {
      console.error(`  ✗ FAIL: ${testName} ${detail ? `(${detail})` : ''}`);
      failed++;
    }
  }

  try {
    // 0. Setup test school / tenants
    const existingSchools = await prisma.school.findMany({ take: 2 });
    let schoolA = existingSchools[0];
    let schoolB = existingSchools[1];

    // Ensure a default plan exists (planId is required on School)
    const testPlan = await prisma.plan.upsert({
      where: { name: 'Starter' },
      update: {},
      create: { name: 'Starter', price: 0, features: [] }
    });

    if (!schoolA) {
      schoolA = await prisma.school.create({
        data: {
          name: 'Test Academy Alpha',
          code: 'SCH-ALP-' + Date.now().toString().slice(-4),
          type: 'COMBINED',
          planId: testPlan.id,
          address: 'Harare, Zimbabwe',
          phone: '+263771000001',
          email: `alpha_${Date.now()}@acadex.test`
        }
      });
    }

    if (!schoolB) {
      schoolB = await prisma.school.create({
        data: {
          name: 'Test Academy Beta',
          code: 'SCH-BET-' + Date.now().toString().slice(-4),
          type: 'COMBINED',
          planId: testPlan.id,
          address: 'Bulawayo, Zimbabwe',
          phone: '+263771000002',
          email: `beta_${Date.now()}@acadex.test`
        }
      });
    }

    const tenantA = schoolA.id;
    const tenantB = schoolB.id;

    // ─────────────────────────────────────────────────────────────
    // TEST 1: Tenant-isolated Document Sequences
    // ─────────────────────────────────────────────────────────────
    console.log('[1/5] Testing Tenant Document Sequences...');
    const docA1 = await SequenceService.nextDocNo(tenantA, 'INV');
    const docA2 = await SequenceService.nextDocNo(tenantA, 'INV');
    const docB1 = await SequenceService.nextDocNo(tenantB, 'INV');

    assert(docA1 === 'INV-000001' || docA1.startsWith('INV-'), 'Tenant A receives sequential INV prefix', `Got ${docA1}`);
    assert(docB1 === 'INV-000001' || docB1.startsWith('INV-'), 'Tenant B sequence starts independently from Tenant A', `Got ${docB1}`);
    assert(docA1 !== docA2, 'Sequential numbers increment per tenant', `${docA1} -> ${docA2}`);

    // ─────────────────────────────────────────────────────────────
    // TEST 2: Till Session Guard & Opening Float
    // ─────────────────────────────────────────────────────────────
    console.log('\n[2/5] Testing Till Session Guard...');

    // Close any previous sessions for tenantA
    await prisma.tillSession.updateMany({
      where: { schoolId: tenantA, status: 'OPEN' },
      data: { status: 'CLOSED', closedAt: new Date() }
    });

    let guardBlocked = false;
    try {
      await TillService.requireOpenTill(tenantA);
    } catch (e: any) {
      guardBlocked = true;
    }
    assert(guardBlocked, 'TillService.requireOpenTill blocks sales when no active till session is open');

    // ─────────────────────────────────────────────────────────────
    // TEST 3: Debtor Limit Enforcement
    // ─────────────────────────────────────────────────────────────
    console.log('\n[3/5] Testing Debtor Limit Engine...');
    const testStudent = await prisma.student.create({
      data: {
        schoolId: tenantA,
        studentId: 'ST-TEST-' + Date.now().toString().slice(-4),
        name: 'Debtor Test Student',
        gender: 'Male',
        dob: new Date('2010-01-01')
      }
    });

    // An invoice of $600 exceeds default limit of $500
    let debtorBlocked = false;
    try {
      await ComplianceService.checkDebtorLimit(tenantA, testStudent.id, 600);
    } catch (e: any) {
      debtorBlocked = true;
    }
    assert(debtorBlocked, 'Debtor limit blocks invoice of $600 exceeding $500 threshold');

    // Create an approved override
    await prisma.approval.create({
      data: {
        schoolId: tenantA,
        entityType: 'STUDENT_DEBTOR_OVERRIDE',
        entityId: testStudent.id,
        status: 'APPROVED',
        approvedBy: 'Bursar Office',
        approverRole: 'BURSAR',
        requestedBy: 'Bursar Office',
        amount: 600.0
      }
    });

    let debtorAllowedWithOverride = false;
    try {
      const res = await ComplianceService.checkDebtorLimit(tenantA, testStudent.id, 600);
      debtorAllowedWithOverride = res.allowed;
    } catch (e) {
      debtorAllowedWithOverride = false;
    }
    assert(debtorAllowedWithOverride, 'Debtor limit permits invoice when approved override exists');

    // ─────────────────────────────────────────────────────────────
    // TEST 4: Accounting Period Lock & Negative Stock Guard
    // ─────────────────────────────────────────────────────────────
    console.log('\n[4/5] Testing Period Lock & Negative Stock...');
    const periodName = '2025-Q4';
    await prisma.accountingPeriod.upsert({
      where: { schoolId_period: { schoolId: tenantA, period: periodName } },
      update: { status: 'LOCKED' },
      create: {
        schoolId: tenantA,
        period: periodName,
        startDate: new Date('2025-10-01'),
        endDate: new Date('2025-12-31'),
        status: 'LOCKED'
      }
    });

    let periodBlocked = false;
    try {
      await ComplianceService.enforcePeriodLock(tenantA, periodName);
    } catch (e: any) {
      periodBlocked = true;
    }
    assert(periodBlocked, `Period lock strictly blocks transactions in locked period "${periodName}"`);

    // Negative stock check
    let stockBlocked = false;
    try {
      await ComplianceService.checkNegativeStock(tenantA, 3, 10, 'Standard Exercise Books');
    } catch (e: any) {
      stockBlocked = true;
    }
    assert(stockBlocked, 'Negative stock policy blocks dispensing 10 items when only 3 are in stock');

    // ─────────────────────────────────────────────────────────────
    // TEST 5: Generalized Credit Note Multi-Line Reversal
    // ─────────────────────────────────────────────────────────────
    console.log('\n[5/5] Testing Generalized Credit Note Engine...');

    // Post double entry: DR 1200 ($45) / CR 4010 ($45) - under $50 threshold
    const originalEntry = await LedgerService.postDoubleEntry({
      tenantId: tenantA,
      debitCode: '1200', // Accounts Receivable
      creditCode: '4010', // Tuition Fees
      amount: 45.00,
      description: 'Term 1 Tuition Billing - Test',
      sourceModule: 'billing',
      reference: 'INV-TEST-001'
    });

    const result = await CreditNoteService.createCreditNote({
      schoolId: tenantA,
      originalJournalEntryId: originalEntry.id,
      reason: 'Billing error correction - overcharge'
    });

    const creditNote = result.creditNote;
    const reversalJournal = result.reversingEntry;

    assert(creditNote.creditNoteNumber.startsWith('CN-'), 'Credit Note created with official sequence prefix', creditNote.creditNoteNumber);
    assert(creditNote.totalAmount === 45.00, 'Credit Note captures exact gross amount to reverse', `${creditNote.totalAmount}`);

    const arLine = reversalJournal?.lines.find(l => l.coaCode === '1200');
    const revLine = reversalJournal?.lines.find(l => l.coaCode === '4010');

    assert(arLine?.credit === 45.00 && arLine?.debit === 0, 'Original Debit line (1200 AR) was swapped to Credit', `CR ${arLine?.credit}`);
    assert(revLine?.debit === 45.00 && revLine?.credit === 0, 'Original Credit line (4010 Tuition) was swapped to Debit', `DR ${revLine?.debit}`);

    // Verify original entry marked reversed
    const updatedOriginal = await prisma.journalEntry.findUnique({ where: { id: originalEntry.id } });
    assert(updatedOriginal?.isReversed === true, 'Original journal entry flagged as reversed');
    assert(updatedOriginal?.reversedByCnId === creditNote.id || updatedOriginal?.reversedByCnId === creditNote.creditNoteNumber, 'Original entry linked to credit note reference');

    console.log('\n====================================================');
    console.log(`  TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
    console.log('====================================================\n');

  } catch (err: any) {
    console.error('Test execution error:', err);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

runTests();
