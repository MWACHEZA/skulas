import prisma from '../lib/prisma';
import bcrypt from 'bcryptjs';
import { ProcurementService } from '../services/procurement.service';
import { seedChartOfAccounts } from '../../prisma/seeders/coa.seeder';

let passed = 0;
let failed = 0;

function assert(condition: boolean, message: string) {
  if (condition) {
    console.log(`  ✓ PASS: ${message}`);
    passed++;
  } else {
    console.error(`  ✗ FAIL: ${message}`);
    failed++;
  }
}

async function runPhase8ProcurementInventoryAssetsTests() {
  console.log('\n================================================================');
  console.log('   PHASE 8.3: PROCUREMENT, INVENTORY, ASSETS & SUPPLIERS TEST');
  console.log('   (Budget Gate, GRN Flow, 3-Way Match AP Ledger, Asset Depreciation)');
  console.log('================================================================\n');

  let schoolAId: string = '';
  let schoolBId: string = '';
  const runId = Date.now().toString().slice(-6);

  try {
    // -------------------------------------------------------------------------
    // TEST GROUP 1: Setup Isolated Tenant Environments & Seed Chart of Accounts
    // -------------------------------------------------------------------------
    console.log('Test Group 1: Setup Isolated Tenant Environments & Chart of Accounts');

    const oldSchools = await prisma.school.findMany({
      where: { name: { in: ['P8 Procurement Academy A', 'P8 Procurement Academy B'] } }
    });
    for (const old of oldSchools) {
      await prisma.school.delete({ where: { id: old.id } }).catch(() => {});
    }

    let plan = await prisma.plan.findFirst();
    if (!plan) {
      plan = await prisma.plan.create({
        data: { name: 'Standard Plan', price: 0, features: [] }
      });
    }

    const schoolA = await prisma.school.create({
      data: {
        name: 'P8 Procurement Academy A',
        code: `P8-PROC-A-${Date.now().toString().slice(-4)}`,
        email: `proc-a-${Date.now()}@test.com`,
        type: 'Secondary',
        planId: plan.id
      }
    });
    schoolAId = schoolA.id;

    const schoolB = await prisma.school.create({
      data: {
        name: 'P8 Procurement Academy B',
        code: `P8-PROC-B-${Date.now().toString().slice(-4)}`,
        email: `proc-b-${Date.now()}@test.com`,
        type: 'Secondary',
        planId: plan.id
      }
    });
    schoolBId = schoolBId = schoolB.id;

    // Seed modern 80-account chart of accounts for school A
    await seedChartOfAccounts(schoolAId, prisma as any);
    await seedChartOfAccounts(schoolBId, prisma as any);

    const passwordHash = await bcrypt.hash('Secret123!', 6);

    // Seed Users for School A
    const bursarUser = await prisma.user.create({
      data: {
        schoolId: schoolAId,
        email: `bursar-${Date.now()}@procurement.test`,
        name: 'Mr. Biti (Bursar)',
        password: passwordHash,
        role: 'BURSAR',
        secondaryRoles: []
      }
    });

    const storeClerk = await prisma.user.create({
      data: {
        schoolId: schoolAId,
        email: `clerk-${Date.now()}@procurement.test`,
        name: 'Tariro (Stores Clerk)',
        password: passwordHash,
        role: 'ANCILLARY',
        secondaryRoles: ['stores_clerk']
      }
    });

    // Seed Supplier
    const supplier = await prisma.supplier.create({
      data: {
        companyName: 'Apex Scholastic Wholesale Ltd',
        contactName: 'Mrs. Dube',
        email: `apex-${Date.now()}@suppliertest.com`,
        status: 'active'
      }
    });

    // Link Supplier to School A
    await prisma.schoolSupplier.create({
      data: {
        schoolId: schoolAId,
        supplierId: supplier.id,
        status: 'APPROVED'
      }
    });

    // Seed Catalog Product in PhysicalProduct
    const paperProduct = await prisma.physicalProduct.create({
      data: {
        schoolId: schoolAId,
        name: 'A4 Printing Paper (80gsm Ream)',
        price: 6.0,
        quantity: 10,
        unit: 'Ream'
      }
    });

    assert(Boolean(schoolAId && supplier.id && paperProduct.id), 'Successfully initialized tenant school, chart of accounts, users, and supplier');

    // -------------------------------------------------------------------------
    // TEST GROUP 2: Budget Ceiling Check Prior to Purchase Order Approval
    // -------------------------------------------------------------------------
    console.log('\nTest Group 2: Budget Ceiling Check Prior to Purchase Order Approval');

    const currentYear = new Date().getFullYear();

    // Configure budget ceiling for COA code 5062 (Exercise Books & Classroom Stationery) = $1,000 for current year
    const budget5062 = await prisma.budget.create({
      data: {
        schoolId: schoolAId,
        year: currentYear,
        term: 'Annual',
        coaCode: '5062',
        amount: 1000.0,
        currency: 'USD'
      }
    });

    assert(budget5062.amount === 1000.0, 'Budget ceiling configured for account 5062: $1,000.00');

    // Create PO 1: 50 reams paper @ $6.00 + 100 notebooks @ $3.00 = $600.00 ($600 <= $1,000 ceiling)
    const po1 = await ProcurementService.createPurchaseOrder({
      schoolId: schoolAId,
      supplierId: supplier.id,
      description: 'Term 1 general exam printing paper and student stationery',
      coaCode: '5062',
      department: 'Academics',
      items: [
        { name: 'A4 Printing Paper (80gsm Ream)', qty: 50, unitPrice: 6.0 },
        { name: 'Standard A5 Exercise Notebooks', qty: 100, unitPrice: 3.0 }
      ]
    });

    assert(po1.status === 'draft', 'PO 1 created in draft status');
    assert(po1.totalAmount === 600.0, `PO 1 total calculated accurately: $${po1.totalAmount}`);
    assert(po1.budgetChecked === true, 'PO 1 budgetChecked flag is true');
    assert(po1.budgetOverrun === false, 'PO 1 within budget ceiling (budgetOverrun = false)');

    // Preview budget availability check
    const check1 = await ProcurementService.checkBudget({
      schoolId: schoolAId,
      coaCode: '5062',
      amount: po1.totalAmount
    });

    assert(check1.withinBudget === true, 'Budget check reports withinBudget = true');
    assert(check1.availableBudget === 1000.0, 'Full $1,000 budget is available before approval');
    assert(check1.remainingAfter === 400.0, 'Available after approval projected at $400.00');

    // Approve PO 1
    const approvedPO1 = await ProcurementService.approvePurchaseOrder(
      schoolAId,
      po1.id,
      bursarUser.id
    );

    assert(approvedPO1.status === 'approved', 'PO 1 successfully approved by Bursar');
    assert(approvedPO1.approvedById === bursarUser.id, 'Approver user ID recorded');
    assert(approvedPO1.budgetRemaining === 400.0, 'Recorded remaining budget is $400.00');

    // Now attempt PO 2: $500.00 on account 5062 ($500 > $400 remaining -> Overrun of $100)
    const po2 = await ProcurementService.createPurchaseOrder({
      schoolId: schoolAId,
      supplierId: supplier.id,
      description: 'Supplemental science graph books and cartridge paper',
      coaCode: '5062',
      items: [
        { name: 'A4 Graph Paper Pads', qty: 50, unitPrice: 10.0 }
      ]
    });

    assert(po2.totalAmount === 500.0, 'PO 2 created for $500.00');
    assert(po2.budgetOverrun === true, 'PO 2 pre-check detected budget overrun');

    // Attempting normal approval without force override MUST be blocked
    let blockedError: string = '';
    try {
      await ProcurementService.approvePurchaseOrder(
        schoolAId,
        po2.id,
        bursarUser.id,
        false // no force override
      );
    } catch (err: any) {
      blockedError = err.message;
    }

    assert(blockedError.includes('Budget ceiling exceeded') === true, 'Approval blocked when PO amount exceeds remaining budget');

    // Approve PO 2 with administrative force override
    const approvedPO2 = await ProcurementService.approvePurchaseOrder(
      schoolAId,
      po2.id,
      bursarUser.id,
      true, // force override
      'Headmaster authorized supplementary exam printing budget'
    );

    assert(approvedPO2.status === 'approved', 'PO 2 approved with force override');
    assert(approvedPO2.budgetOverrun === true, 'PO 2 flagged with budgetOverrun = true');
    assert(approvedPO2.rejectionReason?.includes('Headmaster authorized') === true, 'Override authorization audit reason stored');

    // -------------------------------------------------------------------------
    // TEST GROUP 3: Goods Received Note (GRN) Flow & Inventory Stock Updates
    // -------------------------------------------------------------------------
    console.log('\nTest Group 3: Goods Received Note (GRN) Flow & Stock Fulfillment');

    // Verify initial stock of A4 Paper
    const initialPaper = await prisma.physicalProduct.findUnique({ where: { id: paperProduct.id } });
    assert(initialPaper?.quantity === 10, `Initial paper stock is 10 (got: ${initialPaper?.quantity})`);

    // Receive full shipment for PO 1
    const grn1 = await ProcurementService.createGoodsReceivedNote({
      schoolId: schoolAId,
      purchaseOrderId: po1.id,
      receivedById: storeClerk.id,
      deliveryNoteNumber: 'DN-APEX-8821',
      items: [
        { name: 'A4 Printing Paper (80gsm Ream)', orderedQty: 50, receivedQty: 50, unitPrice: 6.0, condition: 'GOOD' },
        { name: 'Standard A5 Exercise Notebooks', orderedQty: 100, receivedQty: 100, unitPrice: 3.0, condition: 'GOOD' }
      ],
      notes: 'Delivered in clean, undamaged condition'
    });

    assert(grn1.status === 'ACCEPTED', 'GRN 1 created with status ACCEPTED for full delivery');
    assert(grn1.totalValueReceived === 600.0, `Total goods value received is $600.00 (got: $${grn1.totalValueReceived})`);

    // Verify PO 1 updated to delivered
    const po1AfterGRN = await prisma.purchaseOrder.findUnique({ where: { id: po1.id } });
    assert(po1AfterGRN?.status === 'delivered', 'PO 1 status updated to delivered');

    // Verify physical product stock incremented: 10 + 50 = 60
    const updatedPaper = await prisma.physicalProduct.findUnique({ where: { id: paperProduct.id } });
    assert(updatedPaper?.quantity === 60, `Physical stock incremented to 60 (got: ${updatedPaper?.quantity})`);

    // Verify StockMovement audit entry created
    const movements = await prisma.stockMovement.findMany({
      where: { schoolId: schoolAId, reference: grn1.grnNumber }
    });
    assert(movements.length === 2, '2 StockMovement entries logged for received items');
    assert(movements[0].direction === 'IN', 'Stock movement direction is IN');
    assert(movements[0].quantity === 50, 'Stock movement quantity recorded as 50');

    // -------------------------------------------------------------------------
    // TEST GROUP 4: 3-Way Matching Engine: Price Variance Detection
    // -------------------------------------------------------------------------
    console.log('\nTest Group 4: 3-Way Matching Engine: Price Variance Detection');

    // Supplier sends an inflated invoice: $750.00 for PO 1 ($600.00)
    const inflatedInvoice = await prisma.invoice.create({
      data: {
        schoolId: schoolAId,
        invoiceNo: `INV-APEX-VAR-PRICE-${runId}`,
        supplierId: supplier.id,
        purchaseOrderId: po1.id,
        grnId: grn1.id,
        amount: 750.0, // Inflated!
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
      }
    });

    const matchPriceVariance = await ProcurementService.perform3WayMatch(
      schoolAId,
      inflatedInvoice.id,
      bursarUser.id
    );

    assert(matchPriceVariance.matchingStatus === 'PRICE_VARIANCE', '3-Way Match detected PRICE_VARIANCE');
    assert(matchPriceVariance.invoice.status === 'pending', 'Invoice status remains pending (not approved)');
    assert(matchPriceVariance.invoice.matchingNotes?.includes('differs from PO total') === true, 'Price variance discrepancy details noted');

    // -------------------------------------------------------------------------
    // TEST GROUP 5: 3-Way Matching Engine: Quantity Variance Detection
    // -------------------------------------------------------------------------
    console.log('\nTest Group 5: 3-Way Matching Engine: Quantity Variance Detection');

    // Create PO 3 and a partial GRN (received only 30 units out of 50)
    const po3 = await ProcurementService.createPurchaseOrder({
      schoolId: schoolAId,
      supplierId: supplier.id,
      description: 'Staffroom whiteboard markers and dusters',
      coaCode: '5062',
      items: [{ name: 'Whiteboard Marker Boxes', qty: 50, unitPrice: 10.0 }]
    });

    await ProcurementService.approvePurchaseOrder(schoolAId, po3.id, bursarUser.id, true);

    const partialGRN = await ProcurementService.createGoodsReceivedNote({
      schoolId: schoolAId,
      purchaseOrderId: po3.id,
      receivedById: storeClerk.id,
      items: [{ name: 'Whiteboard Marker Boxes', orderedQty: 50, receivedQty: 30, unitPrice: 10.0 }]
    });

    assert(partialGRN.status === 'PARTIAL', 'GRN recorded as PARTIAL (30/50)');

    // Supplier bills for full 50 markers
    const qtyMismatchInvoice = await prisma.invoice.create({
      data: {
        schoolId: schoolAId,
        invoiceNo: `INV-APEX-VAR-QTY-${runId}`,
        supplierId: supplier.id,
        purchaseOrderId: po3.id,
        grnId: partialGRN.id,
        amount: 500.0,
        items: [{ name: 'Whiteboard Marker Boxes', quantity: 50, unitPrice: 10.0 }],
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
      }
    });

    const matchQtyVariance = await ProcurementService.perform3WayMatch(
      schoolAId,
      qtyMismatchInvoice.id,
      bursarUser.id
    );

    assert(matchQtyVariance.matchingStatus === 'QUANTITY_VARIANCE', '3-Way Match detected QUANTITY_VARIANCE');
    assert(matchQtyVariance.invoice.matchingNotes?.includes('exceeds GRN received quantity') === true, 'Quantity variance discrepancy details noted');

    // -------------------------------------------------------------------------
    // TEST GROUP 6: 3-Way Match Success & Accounts Payable General Ledger Posting
    // -------------------------------------------------------------------------
    console.log('\nTest Group 6: 3-Way Match Success & Accounts Payable General Ledger Posting');

    // Supplier bills exact amount: $600.00 for PO 1 and items matching GRN 1
    const validInvoice = await prisma.invoice.create({
      data: {
        schoolId: schoolAId,
        invoiceNo: `INV-APEX-CLEAN-01-${runId}`,
        supplierId: supplier.id,
        purchaseOrderId: po1.id,
        grnId: grn1.id,
        amount: 600.0,
        items: [
          { name: 'A4 Printing Paper (80gsm Ream)', quantity: 50, unitPrice: 6.0 },
          { name: 'Standard A5 Exercise Notebooks', quantity: 100, unitPrice: 3.0 }
        ],
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
      }
    });

    const matchSuccess = await ProcurementService.perform3WayMatch(
      schoolAId,
      validInvoice.id,
      bursarUser.id
    );

    assert(matchSuccess.invoice.matchingStatus === 'MATCHED', 'Clean invoice successfully MATCHED');
    assert(matchSuccess.invoice.status === 'approved', 'Invoice status updated to approved');
    assert(Boolean(matchSuccess.invoice.journalEntryId), 'General Ledger Journal Entry ID attached to invoice');

    // Verify double-entry balance in JournalEntry and JournalEntryLine
    const je = await prisma.journalEntry.findUnique({
      where: { id: matchSuccess.invoice.journalEntryId! },
      include: { lines: true }
    });

    assert(Boolean(je), 'Journal entry created in General Ledger');
    assert(je?.sourceType === 'procurement', 'Journal entry sourceType is procurement');
    assert(je?.lines.length === 2, 'Journal entry contains 2 balanced lines');

    const debitLine = je?.lines.find(l => l.debit > 0);
    const creditLine = je?.lines.find(l => l.credit > 0);

    assert(debitLine?.coaCode === '5062', `Debit line posted to Stationery Expense 5062 (got: ${debitLine?.coaCode})`);
    assert(debitLine?.debit === 600.0, `Debit line amount is $600.00 (got: ${debitLine?.debit})`);

    assert(creditLine?.coaCode === '2010', `Credit line posted to Trade Creditors / Accounts Payable 2010 (got: ${creditLine?.coaCode})`);
    assert(creditLine?.credit === 600.0, `Credit line amount is $600.00 (got: ${creditLine?.credit})`);
    assert(debitLine?.debit === creditLine?.credit, 'Double-entry balanced: Total debits ($600) === Total credits ($600)');

    // -------------------------------------------------------------------------
    // TEST GROUP 7: Asset Straight-Line Depreciation & General Ledger Posting
    // -------------------------------------------------------------------------
    console.log('\nTest Group 7: Asset Straight-Line Depreciation & General Ledger Posting');

    // Create Asset: Server rack for ICT lab ($3,000, 20% annual straight-line)
    const serverAsset = await prisma.asset.create({
      data: {
        schoolId: schoolAId,
        name: 'ICT Lab High-Performance Core Server',
        assetNumber: `AST-ICT-${runId}`,
        category: 'electronics',
        condition: 'good',
        status: 'ACTIVE',
        purchasePrice: 3000.0,
        depreciationRate: 20.0, // 20% per year = $600/yr -> $200 per term
        coaExpenseCode: '5077', // Depreciation — Equipment & ICT
        coaAccumulatedCode: '1541' // Accumulated Depreciation — ICT
      }
    });

    assert(serverAsset.purchasePrice === 3000.0, 'Asset created with purchase price $3,000.00');

    // Run first depreciation cycle (Term 1)
    const depCycle1 = await ProcurementService.depreciateAsset({
      schoolId: schoolAId,
      assetId: serverAsset.id,
      fiscalYear: currentYear,
      fiscalPeriod: `${currentYear}-Term1`,
      userId: bursarUser.id
    });

    // Expected: $3,000 * 20% = $600/yr -> / 3 = $200.00
    assert(depCycle1.depreciationRecord.depreciationAmount === 200.0, `Term 1 depreciation computed as $200.00 (got: $${depCycle1.depreciationRecord.depreciationAmount})`);
    assert(depCycle1.asset.bookValue === 2800.0, `Book value reduced to $2,800.00 (got: $${depCycle1.asset.bookValue})`);
    assert(depCycle1.asset.accumulatedDepreciation === 200.0, `Accumulated depreciation increased to $200.00 (got: $${depCycle1.asset.accumulatedDepreciation})`);

    // Verify General Ledger Journal Entry for Asset Depreciation
    const depJE1 = await prisma.journalEntry.findUnique({
      where: { id: depCycle1.journalEntry.id },
      include: { lines: true }
    });

    assert(depJE1 !== null, 'Depreciation journal entry posted to General Ledger');
    assert(depJE1?.sourceType === 'depreciation', 'Source module is depreciation');

    const depDebit = depJE1?.lines.find(l => l.debit > 0);
    const depCredit = depJE1?.lines.find(l => l.credit > 0);

    assert(depDebit?.coaCode === '5077', 'Debit posted to 5077 (Depreciation Expense — Equipment & ICT)');
    assert(depDebit?.debit === 200.0, 'Debit amount is $200.00');

    assert(depCredit?.coaCode === '1541', 'Credit posted to 1541 (Accumulated Depreciation — ICT)');
    assert(depCredit?.credit === 200.0, 'Credit amount is $200.00');
    assert(depDebit?.debit === depCredit?.credit, 'Depreciation entry perfectly balanced ($200 Dr === $200 Cr)');

    // -------------------------------------------------------------------------
    // TEST GROUP 8: Multi-Cycle Depreciation & Book Value Depletion Safeguards
    // -------------------------------------------------------------------------
    console.log('\nTest Group 8: Multi-Cycle Depreciation & Book Value Depletion Safeguards');

    // Run second depreciation cycle (Term 2)
    const depCycle2 = await ProcurementService.depreciateAsset({
      schoolId: schoolAId,
      assetId: serverAsset.id,
      fiscalYear: currentYear,
      fiscalPeriod: `${currentYear}-Term2`,
      userId: bursarUser.id
    });

    assert(depCycle2.depreciationRecord.depreciationAmount === 200.0, 'Term 2 depreciation amount is $200.00');
    assert(depCycle2.asset.bookValue === 2600.0, `Book value reduced to $2,600.00 (got: $${depCycle2.asset.bookValue})`);
    assert(depCycle2.asset.accumulatedDepreciation === 400.0, `Accumulated depreciation increased to $400.00 (got: $${depCycle2.asset.accumulatedDepreciation})`);

    // Test zero book value safeguard:
    // Create an asset with book value = $15
    const smallAsset = await prisma.asset.create({
      data: {
        schoolId: schoolAId,
        name: 'Desk Lamp',
        assetNumber: `AST-LAMP-${runId}`,
        category: 'furniture',
        condition: 'good',
        status: 'ACTIVE',
        purchasePrice: 100.0,
        depreciationRate: 80.0, // $80/yr -> $26.67/term
        bookValue: 15.0, // Only $15 remaining!
        accumulatedDepreciation: 85.0
      }
    });

    // Depreciating should clamp at the remaining $15, reducing book value to exactly 0
    const clampedDep = await ProcurementService.depreciateAsset({
      schoolId: schoolAId,
      assetId: smallAsset.id
    });

    assert(clampedDep.depreciationRecord.depreciationAmount === 15.0, `Depreciation clamped to remaining book value: $15.00 (got: $${clampedDep.depreciationRecord.depreciationAmount})`);
    assert(clampedDep.asset.bookValue === 0.0, 'Book value reaches exactly $0.00 without dipping negative');

    // Attempting to depreciate again when book value is $0 MUST be rejected
    let fullyDepreciatedError = '';
    try {
      await ProcurementService.depreciateAsset({
        schoolId: schoolAId,
        assetId: smallAsset.id
      });
    } catch (err: any) {
      fullyDepreciatedError = err.message;
    }
    assert(fullyDepreciatedError.includes('already fully depreciated') === true, 'Gracefully prevents depreciating zero-value asset');

    // -------------------------------------------------------------------------
    // TEST GROUP 9: Multi-Tenant Cross-School Data & Authority Isolation
    // -------------------------------------------------------------------------
    console.log('\nTest Group 9: Multi-Tenant Cross-School Data & Authority Isolation');

    // School B user attempts to approve School A's PO
    let crossSchoolError = '';
    try {
      await ProcurementService.approvePurchaseOrder(
        schoolBId, // School B tenant context
        po1.id,    // School A's PO
        'USER-B'
      );
    } catch (err: any) {
      crossSchoolError = err.message;
    }

    assert(crossSchoolError.includes('not found') === true, 'Cross-tenant PO approval blocked by tenant scoping');

    // School B attempts to match School A's invoice
    let crossInvoiceError = '';
    try {
      await ProcurementService.perform3WayMatch(
        schoolBId,
        validInvoice.id
      );
    } catch (err: any) {
      crossInvoiceError = err.message;
    }

    assert(crossInvoiceError.includes('not found') === true, 'Cross-tenant 3-way invoice match blocked');

  } catch (error: any) {
    console.error('Test suite encountered an error:', error);
    failed++;
  } finally {
    if (schoolAId) {
      await prisma.school.delete({ where: { id: schoolAId } }).catch(() => {});
    }
    if (schoolBId) {
      await prisma.school.delete({ where: { id: schoolBId } }).catch(() => {});
    }
  }

  console.log('\n================================================================');
  console.log(`   PHASE 8.3 TEST SUMMARY: Passed: ${passed} | Failed: ${failed}`);
  console.log('================================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runPhase8ProcurementInventoryAssetsTests().catch(err => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
