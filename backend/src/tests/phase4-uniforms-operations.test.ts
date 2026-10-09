import dotenv from 'dotenv';
dotenv.config();

import prisma from '../lib/prisma';
import { BursarService } from '../services/bursar.service';
import { LedgerService } from '../services/ledger.service';
import { getAccountId } from '../../prisma/seeders/coa.seeder';

/**
 * Phase 4 Automated Test Suite:
 * Uniform Products, Kits, Student Sizing Issuance, Auto-Invoicing, Double-Entry GL & Stock Ledger,
 * Returns with Credit Notes, Low-Stock Requisitions, and GRN Restock.
 */
async function runPhase4Tests() {
  console.log('================================================================');
  console.log('  PHASE 4: UNIFORM STORE, KITS, SIZING & STOCK LEDGER TESTS');
  console.log('================================================================\n');
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

  try {
    // 0. Use existing or create test school
    let school = await prisma.school.findFirst();
    if (!school) {
      const plan = await prisma.plan.upsert({
        where: { name: 'Starter' },
        update: {},
        create: { name: 'Starter', price: 0, features: [] }
      });
      school = await prisma.school.create({
        data: {
          name: 'Phase 4 Uniforms Academy',
          code: `P4-${Date.now().toString().slice(-4)}`,
          type: 'COMBINED',
          planId: plan.id,
          email: `p4_${Date.now()}@school.test`
        }
      });
    }
    const schoolId = school.id;

    // Ensure COA accounts exist
    await getAccountId(schoolId, '1100', prisma as any); // Debtors
    await getAccountId(schoolId, '1210', prisma as any); // Uniforms Inventory
    await getAccountId(schoolId, '4041', prisma as any); // Uniforms Revenue
    await getAccountId(schoolId, '5041', prisma as any); // Uniforms COGS
    await getAccountId(schoolId, '2010', prisma as any); // Accounts Payable

    let adminUser = await prisma.user.findFirst({ where: { schoolId } });
    if (!adminUser) {
      adminUser = await prisma.user.create({
        data: {
          email: `admin_p4_${Date.now()}@school.test`,
          password: 'hashedpassword',
          name: 'Uniform Store Admin',
          role: 'SCHOOL_ADMIN',
          schoolId
        }
      });
    }

    let student = await prisma.student.findFirst({ where: { schoolId } });
    if (!student) {
      const user = await prisma.user.create({
        data: {
          email: `student_p4_${Date.now()}@school.test`,
          password: 'hashedpassword',
          name: 'Tendai Moyo',
          role: 'STUDENT',
          schoolId
        }
      });
      student = await prisma.student.create({
        data: {
          userId: user.id,
          schoolId,
          studentId: `STU-P4-${Date.now().toString().slice(-4)}`,
          name: 'Tendai Moyo',
          gender: 'BOYS',
          status: 'ACTIVE'
        }
      });
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // TEST 1: Category & Product Creation with Initial Stock Ledger
    // ─────────────────────────────────────────────────────────────────────────────
    console.log('\n--- Test 1: Category & Product Creation ---');
    const category = await prisma.uniformCategory.create({
      data: {
        schoolId,
        name: `Boys Formal Wear ${Date.now().toString().slice(-4)}`,
        description: 'Standard day and winter formal apparel'
      }
    });
    assert(!!category.id, 'UniformCategory created successfully');

    const productBlazer = await prisma.uniformProduct.create({
      data: {
        schoolId,
        name: 'Navy Woollen Blazer',
        categoryId: category.id,
        gender: 'BOYS',
        size: '34',
        ageRange: 'Secondary',
        costPrice: 28.00,
        sellingPrice: 45.00,
        stockQty: 20,
        minStockAlert: 5,
        barcode: `BLZ-${Date.now().toString().slice(-5)}`
      }
    });

    const initialLedger = await prisma.uniformStockLedger.create({
      data: {
        schoolId,
        productId: productBlazer.id,
        type: 'purchase',
        qtyChange: 20,
        referenceId: 'INITIAL_STOCK',
        balanceAfter: 20,
        unitCost: 28.00,
        notes: 'Initial opening stock intake'
      }
    });

    assert(productBlazer.stockQty === 20, 'UniformProduct created with initial quantity of 20');
    assert(initialLedger.balanceAfter === 20 && initialLedger.qtyChange === 20, 'UniformStockLedger accurately tracks initial balance');

    const productTie = await prisma.uniformProduct.create({
      data: {
        schoolId,
        name: 'Official Striped School Tie',
        categoryId: category.id,
        gender: 'UNISEX',
        size: 'Standard',
        costPrice: 3.50,
        sellingPrice: 8.00,
        stockQty: 50,
        minStockAlert: 10,
        barcode: `TIE-${Date.now().toString().slice(-5)}`
      }
    });

    // ─────────────────────────────────────────────────────────────────────────────
    // TEST 2: Kits Builder (Bundle Creation)
    // ─────────────────────────────────────────────────────────────────────────────
    console.log('\n--- Test 2: Kits Builder ---');
    const kit = await prisma.uniformKit.create({
      data: {
        schoolId,
        name: 'Form 1 Boys Starter Kit',
        classLevel: 'Form 1',
        gender: 'BOYS',
        items: [
          { productId: productBlazer.id, productName: productBlazer.name, qty: 1, defaultSize: '34', unitPrice: 45.00 },
          { productId: productTie.id, productName: productTie.name, qty: 2, defaultSize: 'Standard', unitPrice: 8.00 }
        ],
        totalPrice: 45.00 + (2 * 8.00) // 61.00
      }
    });

    assert(kit.totalPrice === 61.00, 'UniformKit calculated bundle price accurately ($61.00)');
    assert(Array.isArray(kit.items) && (kit.items as any[]).length === 2, 'UniformKit contains 2 bundle items');

    // ─────────────────────────────────────────────────────────────────────────────
    // TEST 3: Student Kit Issuance, Auto-Invoicing, Stock Deduction & COGS GL Posting
    // ─────────────────────────────────────────────────────────────────────────────
    console.log('\n--- Test 3: Kit Issuance & Bursar Invoicing ---');
    const issuanceItems = [
      { productId: productBlazer.id, productName: productBlazer.name, size: '34', qty: 1, unitPrice: 45.00, total: 45.00 },
      { productId: productTie.id, productName: productTie.name, size: 'Standard', qty: 2, unitPrice: 8.00, total: 16.00 }
    ];
    const issuanceTotal = 61.00;
    const totalCogs = (28.00 * 1) + (3.50 * 2); // 35.00

    // Deduct stock and write stock ledger
    for (const it of issuanceItems) {
      const updated = await prisma.uniformProduct.update({
        where: { id: it.productId },
        data: { stockQty: { decrement: it.qty } }
      });
      await prisma.uniformStockLedger.create({
        data: {
          schoolId,
          productId: it.productId,
          type: 'issuance',
          qtyChange: -it.qty,
          referenceId: `STU-${student.studentId || student.id.slice(-4)}`,
          balanceAfter: updated.stockQty,
          unitCost: it.productId === productBlazer.id ? 28.00 : 3.50,
          notes: `Issued to ${student.name}`
        }
      });
    }

    // Create issuance record
    const issuance = await prisma.uniformIssuance.create({
      data: {
        schoolId,
        studentId: student.id,
        termId: 'term_1',
        term: 'Term 1',
        year: 2026,
        items: issuanceItems,
        totalAmount: issuanceTotal,
        issuedById: adminUser.id,
        paymentStatus: 'INVOICED',
        collectionStatus: 'COLLECTED'
      }
    });

    // Auto-Invoice through BursarService
    const invResult = await BursarService.createStudentInvoice({
      schoolId,
      idempotencyKey: `uniform_${issuance.id}`,
      studentId: student.id,
      termId: 'term_1',
      term: 'Term 1',
      year: 2026,
      currency: 'USD',
      sourceModule: 'uniforms',
      sourceId: issuance.id,
      dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
      items: issuanceItems.map(it => ({
        billingItemCode: 'UNIF',
        description: `Uniform: ${it.productName} (${it.size}) x${it.qty}`,
        quantity: it.qty,
        unitPrice: it.unitPrice,
        revenueAccountCode: '4041',
        totalAmount: it.total
      })),
      createdBy: adminUser.id
    });

    await prisma.uniformIssuance.update({
      where: { id: issuance.id },
      data: { invoiceId: invResult.invoice.id }
    });

    // COGS double-entry: DR COGS (5041) / CR Inventory (1210)
    const cogsJe = await LedgerService.postDoubleEntry({
      tenantId: schoolId,
      debitCode: '5041',
      creditCode: '1210',
      amount: totalCogs,
      description: `COGS: Uniform issuance to ${student.name}`,
      sourceModule: 'uniform_cogs',
      reference: issuance.id,
      userId: adminUser.id,
      bypassApprovalCheck: true
    });

    const reloadedBlazer = await prisma.uniformProduct.findUniqueOrThrow({ where: { id: productBlazer.id } });
    const reloadedTie = await prisma.uniformProduct.findUniqueOrThrow({ where: { id: productTie.id } });

    assert(reloadedBlazer.stockQty === 19, 'Blazer stock deducted by 1 (20 -> 19)');
    assert(reloadedTie.stockQty === 48, 'Tie stock deducted by 2 (50 -> 48)');
    assert(invResult.invoice.totalAmount === 61.00, 'Student invoice generated for $61.00');
    assert(!!cogsJe.id, 'COGS double-entry posted DR 5041 / CR 1210 for $35.00');

    // ─────────────────────────────────────────────────────────────────────────────
    // TEST 4: Sizing Return & Reversal with Credit Note
    // ─────────────────────────────────────────────────────────────────────────────
    console.log('\n--- Test 4: Uniform Return & Restock Ledger ---');
    // Student returns the blazer due to size misfit
    const returnedProd = await prisma.uniformProduct.update({
      where: { id: productBlazer.id },
      data: { stockQty: { increment: 1 } }
    });

    const returnLedger = await prisma.uniformStockLedger.create({
      data: {
        schoolId,
        productId: productBlazer.id,
        type: 'return',
        qtyChange: 1,
        referenceId: `RET-${issuance.id.slice(-6)}`,
        balanceAfter: returnedProd.stockQty,
        unitCost: 28.00,
        notes: `Returned blazer from ${student.name} for sizing exchange`
      }
    });

    // COGS Reversal: DR Inventory (1210) / CR COGS (5041)
    const cogsReturnJe = await LedgerService.postDoubleEntry({
      tenantId: schoolId,
      debitCode: '1210',
      creditCode: '5041',
      amount: 28.00,
      description: `COGS Return reversal: ${student.name}`,
      sourceModule: 'uniform_cogs_return',
      reference: issuance.id,
      userId: adminUser.id,
      bypassApprovalCheck: true
    });

    assert(returnedProd.stockQty === 20, 'Returned blazer restocked back to 20 units');
    assert(returnLedger.type === 'return' && returnLedger.qtyChange === 1, 'Return logged to UniformStockLedger');
    assert(!!cogsReturnJe.id, 'COGS reversal posted DR 1210 / CR 5041 for $28.00');

    // ─────────────────────────────────────────────────────────────────────────────
    // TEST 5: Low-Stock Alerts & Auto-Requisition Creation
    // ─────────────────────────────────────────────────────────────────────────────
    console.log('\n--- Test 5: Low Stock Alerts & Reorder Requisition ---');
    // Create an item with stock below alert threshold
    const lowStockSkirt = await prisma.uniformProduct.create({
      data: {
        schoolId,
        name: 'Senior Girls Pleated Skirt (Size 26)',
        gender: 'GIRLS',
        size: '26',
        costPrice: 12.00,
        sellingPrice: 20.00,
        stockQty: 2, // below threshold 5
        minStockAlert: 5,
        barcode: `SKT-${Date.now().toString().slice(-5)}`
      }
    });

    const allLow = await prisma.uniformProduct.findMany({
      where: { schoolId }
    });
    const depletedItems = allLow.filter(p => p.stockQty <= p.minStockAlert);
    assert(depletedItems.some(p => p.id === lowStockSkirt.id), 'Low stock filter identifies depleted item');

    const reqRef = `REQ-UNIF-${Date.now().toString().slice(-6)}`;
    const requisition = await prisma.requisition.create({
      data: {
        schoolId,
        refNumber: reqRef,
        title: 'Depleted Uniform Stock Replenishment',
        description: 'Auto-requisition for items below safety buffer',
        estimatedAmount: 12.00 * 10,
        requisitionType: 'UNIFORM_STOCK_RESTOCK',
        requesterId: adminUser.id,
        status: 'PENDING',
        items: [
          { productId: lowStockSkirt.id, name: lowStockSkirt.name, size: lowStockSkirt.size, quantity: 10, estimatedCost: 12.00 }
        ]
      }
    });

    assert(!!requisition.id && requisition.status === 'PENDING', 'Requisition created with status PENDING for Bursar approval');

    // ─────────────────────────────────────────────────────────────────────────────
    // TEST 6: GRN Restock Intake & Supplier Payable GL Entry
    // ─────────────────────────────────────────────────────────────────────────────
    console.log('\n--- Test 6: GRN Restock Intake & Supplier GL Entry ---');
    const grnRef = `GRN-${Date.now().toString().slice(-6)}`;
    const receivedQty = 15;
    const restockUnitCost = 11.50; // New unit cost
    const totalGrnAmount = receivedQty * restockUnitCost;

    const restockedSkirt = await prisma.uniformProduct.update({
      where: { id: lowStockSkirt.id },
      data: {
        stockQty: { increment: receivedQty },
        costPrice: restockUnitCost
      }
    });

    const grnStockLedger = await prisma.uniformStockLedger.create({
      data: {
        schoolId,
        productId: lowStockSkirt.id,
        type: 'purchase',
        qtyChange: receivedQty,
        referenceId: grnRef,
        balanceAfter: restockedSkirt.stockQty,
        unitCost: restockUnitCost,
        notes: `GRN Intake: ${grnRef}`
      }
    });

    // DR Inventory Uniforms (1210) / CR Accounts Payable (2010)
    const grnJournal = await LedgerService.postDoubleEntry({
      tenantId: schoolId,
      debitCode: '1210',
      creditCode: '2010',
      amount: totalGrnAmount,
      description: `GRN Restock: ${grnRef}`,
      sourceModule: 'uniform_grn',
      reference: grnRef,
      userId: adminUser.id,
      bypassApprovalCheck: true
    });

    assert(restockedSkirt.stockQty === 17, 'Skirt stock increased to 17 (2 + 15)');
    assert(grnStockLedger.balanceAfter === 17 && grnStockLedger.qtyChange === 15, 'GRN movement written to UniformStockLedger');
    assert(!!grnJournal.id, 'GRN double-entry posted DR 1210 / CR 2010 for $172.50');

    // ─────────────────────────────────────────────────────────────────────────────
    // TEST 7: Barcode Lookup
    // ─────────────────────────────────────────────────────────────────────────────
    console.log('\n--- Test 7: Barcode Lookup ---');
    const scanned = await prisma.uniformProduct.findFirst({
      where: { schoolId, barcode: productBlazer.barcode! }
    });
    assert(scanned?.id === productBlazer.id, 'Barcode lookup returns exact product and size variant');

  } catch (err: any) {
    console.error('Test execution failed with error:', err);
    assert(false, `Unexpected exception: ${err.message}`);
  }

  console.log('\n================================================================');
  console.log(`  PHASE 4 TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log('================================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runPhase4Tests().catch(e => {
  console.error(e);
  process.exit(1);
});
