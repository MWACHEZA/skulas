import prisma from '../lib/prisma';
import { BursarService } from '../services/bursar.service';
import { LedgerService } from '../services/ledger.service';
import { getAccountId } from '../../prisma/seeders/coa.seeder';

export async function runBursarMoneyBackboneTests() {
  console.log('====================================================');
  console.log('  PHASE 1: BURSAR CORE & MONEY BACKBONE VERIFICATION');
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
    // 0. Resolve or create test school & student
    let school = await prisma.school.findFirst();
    if (!school) {
      const plan = await prisma.plan.upsert({
        where: { name: 'Starter' },
        update: {},
        create: { name: 'Starter', price: 0, features: [] }
      });
      school = await prisma.school.create({
        data: {
          name: 'Money Backbone Academy',
          code: 'MB-ACAD-' + Date.now().toString().slice(-4),
          type: 'COMBINED',
          planId: plan.id,
          address: 'Harare, Zimbabwe',
          phone: '+263771999888',
          email: `bursar_${Date.now()}@skulas.test`
        }
      });
    }

    const schoolId = school.id;

    // Ensure Chart of Accounts accounts exist for testing
    await getAccountId(schoolId, '1100', prisma as any); // Debtors
    await getAccountId(schoolId, '1020', prisma as any); // Cash Vault
    await getAccountId(schoolId, '4010', prisma as any); // Tuition Primary
    await getAccountId(schoolId, '4020', prisma as any); // Boarding

    // Ensure a test student exists
    const testTag = Date.now().toString().slice(-6);
    const student = await prisma.student.create({
      data: {
        schoolId,
        studentId: 'ST-MB-' + testTag,
        name: 'Tatenda Muzorewa ' + testTag,
        gender: 'Male',
        dob: new Date('2008-05-15'),
        enrollmentDate: new Date()
      }
    });

    // ─────────────────────────────────────────────────────────────
    // TEST 1: createStudentInvoice() & Ledger Balancing
    // ─────────────────────────────────────────────────────────────
    console.log('[1/5] Testing createStudentInvoice() & Double-Entry Balancing...');
    const invKey = `test_inv_${Date.now()}`;
    const invoiceResult = await BursarService.createStudentInvoice({
      schoolId,
      idempotencyKey: invKey,
      studentId: student.id,
      term: 'Term 1',
      year: 2026,
      currency: 'USD',
      sourceModule: 'bulk_billing',
      dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      items: [
        {
          description: 'Term 1 Tuition Fee',
          quantity: 1,
          unitPrice: 450.00,
          totalAmount: 450.00,
          revenueAccountCode: '4010'
        },
        {
          description: 'Term 1 Boarding Accommodation',
          quantity: 1,
          unitPrice: 350.00,
          totalAmount: 350.00,
          revenueAccountCode: '4020'
        }
      ]
    });

    assert(!invoiceResult.isDuplicate, 'Invoice created successfully on first call');
    assert(invoiceResult.invoice.totalAmount === 800.00, 'Invoice total matches line items sum ($800.00)');

    // Verify journal entry lines balance (DR = CR)
    const je = await prisma.journalEntry.findUnique({
      where: { id: invoiceResult.journalEntryId },
      include: { lines: true }
    });
    const totalDr = je?.lines.reduce((s, l) => s + l.debit, 0) || 0;
    const totalCr = je?.lines.reduce((s, l) => s + l.credit, 0) || 0;
    assert(Math.abs(totalDr - totalCr) < 0.01, 'Journal entry debits equal credits', `DR: ${totalDr}, CR: ${totalCr}`);
    assert(totalDr === 800.00, 'Journal entry totals $800.00');

    // ─────────────────────────────────────────────────────────────
    // TEST 2: Idempotency Protection on Invoicing
    // ─────────────────────────────────────────────────────────────
    console.log('\n[2/5] Testing Idempotency Protection on Invoicing...');
    const duplicateInvResult = await BursarService.createStudentInvoice({
      schoolId,
      idempotencyKey: invKey, // Re-use exact same key
      studentId: student.id,
      term: 'Term 1',
      year: 2026,
      currency: 'USD',
      sourceModule: 'bulk_billing',
      items: [
        {
          description: 'Term 1 Tuition Fee',
          quantity: 1,
          unitPrice: 450.00,
          totalAmount: 450.00,
          revenueAccountCode: '4010'
        }
      ]
    });

    assert(duplicateInvResult.isDuplicate, 'Duplicate call identified by idempotency key');
    assert(duplicateInvResult.invoice.id === invoiceResult.invoice.id, 'Returned existing invoice without recreating');

    // Verify no extra invoice created
    const countInvoices = await prisma.studentInvoice.count({
      where: { idempotencyKey: invKey }
    });
    assert(countInvoices === 1, 'Exactly one invoice exists in database with this key');

    // ─────────────────────────────────────────────────────────────
    // TEST 3: receivePayment() & Multi-Currency Allocation
    // ─────────────────────────────────────────────────────────────
    console.log('\n[3/5] Testing receivePayment() & Multi-Currency Allocation...');
    const payKey = `test_pay_${Date.now()}`;
    const paymentResult = await BursarService.receivePayment({
      schoolId,
      idempotencyKey: payKey,
      studentId: student.id,
      amount: 500.00,
      paymentCurrency: 'USD',
      invoiceCurrency: 'USD',
      exchangeRate: 1.0,
      paymentMethod: 'cash_usd',
      fiscalize: true,
      allocateStrategy: 'oldest_first'
    });

    assert(!paymentResult.isDuplicate, 'Payment receipt created successfully');
    assert(paymentResult.receipt?.amount === 500.00, 'Receipt amount is $500.00');
    assert(Boolean(paymentResult.receipt?.fiscalSignature), 'ZIMRA fiscal signature generated by provider');
    assert(Boolean(paymentResult.receipt?.fiscalQr), 'ZIMRA verification QR generated');

    // Check allocations: $500 should be allocated against the $800 invoice
    const allocations = paymentResult.receipt?.allocations || [];
    assert(allocations.length > 0, 'Allocations created against unpaid invoice');
    assert(allocations[0].allocatedAmount === 500.00, 'Allocated amount is $500.00');

    // Verify double-entry for receipt: DR Cash, CR Debtors
    const payJe = await prisma.journalEntry.findUnique({
      where: { id: paymentResult.journalEntryId },
      include: { lines: true }
    });
    const payDr = payJe?.lines.reduce((s, l) => s + l.debit, 0) || 0;
    const payCr = payJe?.lines.reduce((s, l) => s + l.credit, 0) || 0;
    assert(Math.abs(payDr - payCr) < 0.01, 'Payment journal entry debits equal credits', `DR: ${payDr}, CR: ${payCr}`);

    // ─────────────────────────────────────────────────────────────
    // TEST 4: Idempotency Protection on Receipts
    // ─────────────────────────────────────────────────────────────
    console.log('\n[4/5] Testing Idempotency Protection on Payment Receipts...');
    const duplicatePayResult = await BursarService.receivePayment({
      schoolId,
      idempotencyKey: payKey, // Re-use exact key
      studentId: student.id,
      amount: 500.00,
      paymentCurrency: 'USD',
      paymentMethod: 'cash_usd'
    });

    assert(duplicatePayResult.isDuplicate, 'Duplicate payment identified by idempotency key');
    assert(duplicatePayResult.receipt?.id === paymentResult.receipt?.id, 'Returned existing receipt without double-charging');

    // ─────────────────────────────────────────────────────────────
    // TEST 5: Derived Student Balance & Trial Balance Balancing
    // ─────────────────────────────────────────────────────────────
    console.log('\n[5/5] Testing Derived Balance & General Ledger Trial Balance...');
    const balanceResult = await BursarService.getStudentBalance(schoolId, student.id);
    assert(balanceResult.totalBilled >= 800.00, 'Total billed reflects invoices');
    assert(balanceResult.totalPaid >= 500.00, 'Total paid reflects allocations');
    assert(balanceResult.balance === Math.round((balanceResult.totalBilled - balanceResult.totalPaid) * 100) / 100,
      'Balance is strictly derived as totalBilled - totalPaid (never written directly)');

    // Trial Balance test: Total DR == Total CR across the entire General Ledger
    const currentPeriod = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`;
    const trialBalance = await LedgerService.trialBalance(schoolId, currentPeriod);
    const tbDebit = trialBalance.totalDebit;
    const tbCredit = trialBalance.totalCredit;
    assert(Math.abs(tbDebit - tbCredit) < 0.05,
      `Trial Balance balances: Total DR ($${tbDebit}) === Total CR ($${tbCredit})`);

  } catch (error: any) {
    console.error('Test execution error:', error);
    failed++;
  }

  console.log('\n====================================================');
  console.log(`  RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log('====================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

// Allow direct CLI execution
if (require.main === module) {
  runBursarMoneyBackboneTests().then(() => process.exit(0)).catch(() => process.exit(1));
}
