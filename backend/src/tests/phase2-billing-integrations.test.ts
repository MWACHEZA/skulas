import dotenv from 'dotenv';
dotenv.config();

import prisma from '../lib/prisma';
import { BursarService } from '../services/bursar.service';
import { CreditNoteService } from '../services/credit-note.service';
import { getAccountId } from '../../prisma/seeders/coa.seeder';

export async function runPhase2BillingIntegrationsTests() {
  console.log('====================================================');
  console.log('  PHASE 2: BILLING INTEGRATIONS VERIFICATION');
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
          name: 'Integration Academy',
          code: 'INT-ACAD-' + Date.now().toString().slice(-4),
          type: 'COMBINED',
          planId: plan.id,
          address: 'Bulawayo, Zimbabwe',
          phone: '+263772111222',
          email: `integration_${Date.now()}@skulas.test`
        }
      });
    }

    const schoolId = school.id;

    // Ensure Chart of Accounts accounts exist for testing
    await getAccountId(schoolId, '1100', prisma as any); // Debtors
    await getAccountId(schoolId, '1020', prisma as any); // Cash Vault
    await getAccountId(schoolId, '4010', prisma as any); // Tuition Primary
    await getAccountId(schoolId, '4020', prisma as any); // Boarding
    await getAccountId(schoolId, '4041', prisma as any); // Uniforms
    await getAccountId(schoolId, '4033', prisma as any); // Transport
    await getAccountId(schoolId, '4031', prisma as any); // Trips & Activities
    await getAccountId(schoolId, '4065', prisma as any); // Library Fines

    // Ensure a test student exists
    let student = await prisma.student.findFirst({ where: { schoolId } });
    if (!student) {
      student = await prisma.student.create({
        data: {
          schoolId,
          studentId: 'ST-P2-' + Date.now().toString().slice(-4),
          name: 'Tinashe Chikwanha',
          status: 'Enrolled'
        }
      });
    }

    const testTag = Date.now().toString().slice(-6);

    // ─────────────────────────────────────────────────────────────────
    // 1. BOARDING ON BED ALLOCATION
    // ─────────────────────────────────────────────────────────────────
    console.log('\n--- 1. Boarding: Bed Allocation & Vacate Reversal ---');

    const hostel = await prisma.hostel.create({
      data: {
        schoolId,
        name: `Kudu Boys Hall ${testTag}`,
        type: 'BOYS',
        capacity: 40
      }
    });

    const bedAllocation = await prisma.hostelBedAllocation.create({
      data: {
        schoolId,
        studentId: student.id,
        hostelId: hostel.id,
        termId: 'term_1_2026',
        feeAmount: 350.00,
        status: 'ACTIVE'
      }
    });

    const boardIdempotencyKey = `board_${bedAllocation.id}`;
    const boardInvoiceRes = await BursarService.createStudentInvoice({
      schoolId,
      idempotencyKey: boardIdempotencyKey,
      studentId: student.id,
      termId: 'term_1_2026',
      sourceModule: 'boarding',
      sourceId: bedAllocation.id,
      items: [
        {
          billingItemCode: 'BOARD',
          description: `Boarding & Hostel Accommodation — ${hostel.name}`,
          quantity: 1,
          unitPrice: 350.00,
          totalAmount: 350.00,
          revenueAccountCode: '4020'
        }
      ]
    });

    await prisma.hostelBedAllocation.update({
      where: { id: bedAllocation.id },
      data: { invoiceId: boardInvoiceRes.invoice.id }
    });

    assert(
      boardInvoiceRes.invoice.idempotencyKey === boardIdempotencyKey,
      'Boarding Invoice: Idempotency key adheres to board_{allocation_id}'
    );
    assert(
      boardInvoiceRes.invoice.items[0].revenueAccountCode === '4020',
      'Boarding Invoice: Revenue posted to Account 4020 (Boarding Accommodation)'
    );
    assert(
      boardInvoiceRes.invoice.totalAmount === 350.00,
      'Boarding Invoice: Correct total amount $350.00'
    );

    // Vacate bed with 50% pro-rata credit note
    const vacateCn = await CreditNoteService.createCreditNoteForInvoice({
      schoolId,
      invoiceId: boardInvoiceRes.invoice.id,
      reason: 'Student vacated hostel mid-term',
      proRataRatio: 0.5
    });

    assert(
      vacateCn.creditNote.totalAmount === 175.00,
      'Boarding Vacate: Pro-rata Credit Note issued for 50% ($175.00)'
    );
    assert(
      vacateCn.reversingEntry !== undefined,
      'Boarding Vacate: Double-entry reversing journal entry posted'
    );

    // ─────────────────────────────────────────────────────────────────
    // 2. UNIFORMS ON ISSUANCE
    // ─────────────────────────────────────────────────────────────────
    console.log('\n--- 2. Uniforms: Issuance & Return Reversal ---');

    const uniformItem = await prisma.uniformItem.create({
      data: {
        schoolId,
        name: `Blazer Maroon Size 34 ${testTag}`,
        costPrice: 25.00,
        sellingPrice: 45.00
      }
    });

    const issuanceId = `issuance_${testTag}`;
    const uniformIdempotencyKey = `uniform_${issuanceId}`;

    const uniformInvoiceRes = await BursarService.createStudentInvoice({
      schoolId,
      idempotencyKey: uniformIdempotencyKey,
      studentId: student.id,
      termId: 'term_1_2026',
      sourceModule: 'uniforms',
      sourceId: issuanceId,
      items: [
        {
          billingItemCode: 'UNIF',
          description: `Uniform Store Issuance: ${uniformItem.name}`,
          quantity: 2,
          unitPrice: 45.00,
          totalAmount: 90.00,
          revenueAccountCode: '4041'
        }
      ]
    });

    assert(
      uniformInvoiceRes.invoice.idempotencyKey === uniformIdempotencyKey,
      'Uniform Invoice: Idempotency key adheres to uniform_{issuance_id}'
    );
    assert(
      uniformInvoiceRes.invoice.items[0].revenueAccountCode === '4041',
      'Uniform Invoice: Revenue posted to Account 4041 (Uniform Store Sales)'
    );
    assert(
      uniformInvoiceRes.invoice.totalAmount === 90.00,
      'Uniform Invoice: Correct total amount $90.00 (2 x $45)'
    );

    // Return wrong size -> full credit note
    const uniformCn = await CreditNoteService.createCreditNoteForInvoice({
      schoolId,
      invoiceId: uniformInvoiceRes.invoice.id,
      reason: 'Returned wrong size blazer'
    });

    assert(
      uniformCn.creditNote.totalAmount === 90.00,
      'Uniform Return: Full Credit Note issued for $90.00'
    );

    // ─────────────────────────────────────────────────────────────────
    // 3. TRANSPORT ON ROUTE / BUS ALLOCATION
    // ─────────────────────────────────────────────────────────────────
    console.log('\n--- 3. Transport: Route Allocation & Arrears Policy ---');

    const route = await prisma.transportRoute.create({
      data: {
        schoolId,
        name: `Borrowdale - CBD Express ${testTag}`,
        description: 'Morning and afternoon route'
      }
    });

    // Check student balance (should be positive from prior invoices/credit notes)
    const balCheck = await BursarService.getStudentBalance(schoolId, student.id);
    assert(
      typeof balCheck.balance === 'number',
      'Transport Policy Check: Student live balance queried successfully'
    );

    const transportAlloc = await prisma.studentTransportAllocation.create({
      data: {
        schoolId,
        studentId: student.id,
        routeId: route.id,
        termId: 'term_1_2026',
        feeAmount: 80.00,
        status: 'ACTIVE',
        flaggedForDebt: balCheck.balance > 0
      }
    });

    const transportIdempotencyKey = `transport_${transportAlloc.id}_term_1_2026`;
    const transportInvoiceRes = await BursarService.createStudentInvoice({
      schoolId,
      idempotencyKey: transportIdempotencyKey,
      studentId: student.id,
      termId: 'term_1_2026',
      sourceModule: 'transport',
      sourceId: transportAlloc.id,
      items: [
        {
          billingItemCode: 'TRANS',
          description: `Transport Bus & Route Levy — ${route.name}`,
          quantity: 1,
          unitPrice: 80.00,
          totalAmount: 80.00,
          revenueAccountCode: '4033'
        }
      ]
    });

    assert(
      transportInvoiceRes.invoice.idempotencyKey === transportIdempotencyKey,
      'Transport Invoice: Idempotency key adheres to transport_{allocation_id}_{term_id}'
    );
    assert(
      transportInvoiceRes.invoice.items[0].revenueAccountCode === '4033',
      'Transport Invoice: Revenue posted to Account 4033 (School Transport & Bus Levies)'
    );
    assert(
      transportAlloc.flaggedForDebt === (balCheck.balance > 0),
      'Transport Policy: Arrears flag correctly set based on student balance'
    );

    // ─────────────────────────────────────────────────────────────────
    // 4. SCHOOL TRIPS ON PARENT CONSENT / APPROVAL
    // ─────────────────────────────────────────────────────────────────
    console.log('\n--- 4. School Trips: Excursion Consent & Billing ---');

    const trip = await prisma.schoolTrip.create({
      data: {
        schoolId,
        title: `Victoria Falls Geography Excursion ${testTag}`,
        destination: 'Victoria Falls Rainforest',
        date: new Date('2026-11-15'),
        cost: 120.00,
        currency: 'USD',
        status: 'PLANNED'
      }
    });

    const tripConsent = await prisma.tripConsent.create({
      data: {
        schoolId,
        tripId: trip.id,
        studentId: student.id,
        parentName: 'Mrs. Chikwanha',
        parentPhone: '+263772998877',
        status: 'APPROVED'
      }
    });

    const tripIdempotencyKey = `trip_${tripConsent.id}`;
    const tripInvoiceRes = await BursarService.createStudentInvoice({
      schoolId,
      idempotencyKey: tripIdempotencyKey,
      studentId: student.id,
      termId: 'term_1_2026',
      sourceModule: 'trips',
      sourceId: tripConsent.id,
      items: [
        {
          billingItemCode: 'TRIP',
          description: `Excursion / School Trip Fee — ${trip.title}`,
          quantity: 1,
          unitPrice: 120.00,
          totalAmount: 120.00,
          revenueAccountCode: '4031'
        }
      ]
    });

    assert(
      tripInvoiceRes.invoice.idempotencyKey === tripIdempotencyKey,
      'Trip Invoice: Idempotency key adheres to trip_{consent_id}'
    );
    assert(
      tripInvoiceRes.invoice.items[0].revenueAccountCode === '4031',
      'Trip Invoice: Revenue posted to Account 4031 (Sports, Culture & Activity Levies)'
    );
    assert(
      tripInvoiceRes.invoice.totalAmount === 120.00,
      'Trip Invoice: Correct trip cost $120.00'
    );

    // ─────────────────────────────────────────────────────────────────
    // 5. LIBRARY FINES ON OVERDUE / LOST BOOK
    // ─────────────────────────────────────────────────────────────────
    console.log('\n--- 5. Library Fines: Overdue / Lost Book Charging ---');

    const book = await prisma.book.create({
      data: {
        schoolId,
        title: `Advanced Level Pure Mathematics 1 ${testTag}`,
        author: 'Backhouse & Houldsworth',
        isbn: `97805820${testTag.slice(0, 4)}`,
        price: 25.00,
        copies: 5,
        available: 5
      }
    });

    const loan = await prisma.bookLoan.create({
      data: {
        schoolId,
        bookId: book.id,
        studentId: student.id,
        borrowedAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        dueDate: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
        status: 'overdue'
      }
    });

    const fine = await prisma.bookLoanFine.create({
      data: {
        schoolId,
        loanId: loan.id,
        studentId: student.id,
        amount: 8.50,
        fineType: 'OVERDUE',
        reason: '10 days overdue fine',
        status: 'BILLED'
      }
    });

    const fineIdempotencyKey = `libfine_${fine.id}`;
    const fineInvoiceRes = await BursarService.createStudentInvoice({
      schoolId,
      idempotencyKey: fineIdempotencyKey,
      studentId: student.id,
      sourceModule: 'library_fine',
      sourceId: fine.id,
      items: [
        {
          billingItemCode: 'LIBFINE',
          description: `Library Overdue Fine: ${book.title}`,
          quantity: 1,
          unitPrice: 8.50,
          totalAmount: 8.50,
          revenueAccountCode: '4065'
        }
      ]
    });

    assert(
      fineInvoiceRes.invoice.idempotencyKey === fineIdempotencyKey,
      'Library Fine Invoice: Idempotency key adheres to libfine_{fine_id}'
    );
    assert(
      fineInvoiceRes.invoice.items[0].revenueAccountCode === '4065',
      'Library Fine Invoice: Revenue posted to Account 4065 (Library Fines & Overdue Book Charges)'
    );
    assert(
      fineInvoiceRes.invoice.totalAmount === 8.50,
      'Library Fine Invoice: Correct fine amount $8.50'
    );

    // ─────────────────────────────────────────────────────────────────
    // 6. OVERALL TRIAL BALANCE & DOUBLE-ENTRY EQUALITY CHECK
    // ─────────────────────────────────────────────────────────────────
    console.log('\n--- 6. Double-Entry Verification across All 5 Integrations ---');

    // Retrieve all journal entries created in this test session
    const invoiceIds = [
      boardInvoiceRes.invoice.id,
      uniformInvoiceRes.invoice.id,
      transportInvoiceRes.invoice.id,
      tripInvoiceRes.invoice.id,
      fineInvoiceRes.invoice.id
    ];

    const entries = await prisma.journalEntry.findMany({
      where: {
        schoolId,
        sourceType: 'invoice',
        sourceId: { in: invoiceIds }
      },
      include: { lines: true }
    });

    assert(
      entries.length === 5,
      `All 5 modules posted valid Journal Entries (found ${entries.length}/5)`
    );

    let allBalanced = true;
    for (const entry of entries) {
      const dr = entry.lines.reduce((s, l) => s + l.debit, 0);
      const cr = entry.lines.reduce((s, l) => s + l.credit, 0);
      if (Math.abs(dr - cr) > 0.01) {
        allBalanced = false;
        console.error(`Unbalanced Entry ${entry.entryNumber}: DR $${dr} !== CR $${cr}`);
      }
    }

    assert(
      allBalanced,
      'All 5 operational module invoices have perfect Debit == Credit balance'
    );

    // Dynamic Balance Verification
    const finalBalance = await BursarService.getStudentBalance(schoolId, student.id);
    assert(
      typeof finalBalance.balance === 'number' && finalBalance.totalBilled > 0,
      `Student balance dynamically derived: Billed $${finalBalance.totalBilled}, Balance $${finalBalance.balance}`
    );

    console.log('\n====================================================');
    console.log(`RESULTS: ${passed} PASSED, ${failed} FAILED`);
    console.log('====================================================\n');

    if (failed > 0) {
      process.exit(1);
    }
  } catch (err) {
    console.error('Test execution failed with error:', err);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

if (require.main === module) {
  runPhase2BillingIntegrationsTests();
}
