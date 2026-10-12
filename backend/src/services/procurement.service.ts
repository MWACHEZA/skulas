import prisma from '../lib/prisma';
import { LedgerService } from './ledger.service';

export interface CreatePOParams {
  schoolId: string;
  supplierId: string;
  description: string;
  items: Array<{ name: string; qty: number; unitPrice: number; total?: number }>;
  totalAmount?: number;
  coaCode?: string;
  department?: string;
}

export interface CreateGRNParams {
  schoolId: string;
  purchaseOrderId: string;
  supplierId?: string;
  receivedById: string;
  deliveryNoteNumber?: string;
  items: Array<{
    name: string;
    orderedQty: number;
    receivedQty: number;
    unitPrice: number;
    condition?: 'GOOD' | 'DAMAGED' | 'FAIR';
    notes?: string;
  }>;
  notes?: string;
}

export interface CreateSupplierInvoiceParams {
  schoolId: string;
  invoiceNo: string;
  supplierId: string;
  purchaseOrderId?: string;
  grnId?: string;
  amount: number;
  dueDate: Date | string;
  items?: Array<{ name: string; quantity: number; unitPrice: number; total?: number }>;
}

export class ProcurementService {
  /**
   * Evaluate budget availability for an expense account before approving a Purchase Order.
   */
  static async checkBudget(params: {
    schoolId: string;
    coaCode?: string;
    amount: number;
    year?: number;
    term?: string;
    excludePoId?: string;
  }) {
    const {
      schoolId,
      coaCode,
      amount,
      year = new Date().getFullYear(),
      term,
      excludePoId
    } = params;

    if (!coaCode) {
      return {
        budgetConfigured: false,
        withinBudget: true,
        message: 'No Chart of Accounts code assigned to Purchase Order'
      };
    }

    // Lookup budget for the school, year, and COA code
    let budget = await prisma.budget.findFirst({
      where: {
        schoolId,
        year,
        coaCode,
        ...(term ? { term } : {})
      }
    });

    // Fallback to annual budget if specific term budget not found
    if (!budget && term) {
      budget = await prisma.budget.findFirst({
        where: {
          schoolId,
          year,
          coaCode,
          OR: [{ term: null }, { term: 'Annual' }]
        }
      });
    }

    if (!budget) {
      return {
        budgetConfigured: false,
        withinBudget: true,
        coaCode,
        message: `No budget ceiling configured for COA code ${coaCode} in ${year}`
      };
    }

    // Calculate already committed Purchase Orders for this account & year
    const committedPOs = await prisma.purchaseOrder.findMany({
      where: {
        schoolId,
        coaCode,
        status: { in: ['approved', 'delivered', 'partially_delivered'] },
        ...(excludePoId ? { id: { not: excludePoId } } : {})
      }
    });

    const alreadyCommitted = committedPOs.reduce((acc, po) => acc + po.totalAmount, 0);
    const availableBudget = budget.amount - alreadyCommitted;
    const remainingAfter = availableBudget - amount;
    const withinBudget = availableBudget >= amount;

    return {
      budgetConfigured: true,
      withinBudget,
      coaCode,
      budgetTotal: budget.amount,
      alreadyCommitted,
      availableBudget,
      requestedAmount: amount,
      remainingAfter,
      currency: budget.currency || 'USD'
    };
  }

  /**
   * Create a Purchase Order in draft status.
   */
  static async createPurchaseOrder(params: CreatePOParams) {
    const { schoolId, supplierId, description, items, coaCode, department } = params;

    const calculatedTotal = items.reduce(
      (acc, item) => acc + item.qty * item.unitPrice,
      0
    );
    const totalAmount = params.totalAmount ?? calculatedTotal;

    const count = await prisma.purchaseOrder.count({ where: { schoolId } });
    const poNumber = `PO-${Date.now().toString().slice(-4)}-${(count + 1).toString().padStart(4, '0')}`;

    // Perform budget check
    const budgetCheck = await this.checkBudget({
      schoolId,
      coaCode,
      amount: totalAmount
    });

    return await prisma.purchaseOrder.create({
      data: {
        poNumber,
        supplierId,
        description,
        items,
        totalAmount,
        status: 'draft',
        schoolId,
        coaCode,
        department,
        budgetChecked: budgetCheck.budgetConfigured,
        budgetOverrun: budgetCheck.budgetConfigured ? !budgetCheck.withinBudget : false,
        budgetRemaining: budgetCheck.budgetConfigured ? budgetCheck.remainingAfter : null
      },
      include: {
        supplier: true
      }
    });
  }

  /**
   * Approve a Purchase Order with budget ceiling enforcement.
   */
  static async approvePurchaseOrder(
    schoolId: string,
    poId: string,
    approverUserId: string,
    forceOverride: boolean = false,
    overrideReason?: string
  ) {
    const po = await prisma.purchaseOrder.findFirst({
      where: { id: poId, schoolId }
    });

    if (!po) {
      throw new Error('Purchase order not found');
    }

    if (po.status === 'approved' || po.status === 'delivered') {
      throw new Error(`Purchase order is already ${po.status}`);
    }

    // Budget check
    const budgetCheck = await this.checkBudget({
      schoolId,
      coaCode: po.coaCode || undefined,
      amount: po.totalAmount,
      excludePoId: po.id
    });

    if (budgetCheck.budgetConfigured && !budgetCheck.withinBudget && !forceOverride) {
      const avail = budgetCheck.availableBudget !== undefined ? budgetCheck.availableBudget.toFixed(2) : '0.00';
      throw new Error(
        `Budget ceiling exceeded: PO total ($${po.totalAmount.toFixed(2)}) exceeds remaining available budget ($${avail}) for account ${po.coaCode}. Administrative force override required.`
      );
    }

    return await prisma.purchaseOrder.update({
      where: { id: poId },
      data: {
        status: 'approved',
        approvedById: approverUserId,
        approvedAt: new Date(),
        budgetChecked: true,
        budgetOverrun: budgetCheck.budgetConfigured ? !budgetCheck.withinBudget : false,
        budgetRemaining: budgetCheck.budgetConfigured ? budgetCheck.remainingAfter : null,
        rejectionReason: forceOverride && overrideReason ? `Budget override authorized: ${overrideReason}` : null
      },
      include: {
        supplier: true
      }
    });
  }

  /**
   * Create a Goods Received Note (GRN) against an approved Purchase Order.
   * Updates inventory stock & records StockMovement audit entries.
   */
  static async createGoodsReceivedNote(params: CreateGRNParams) {
    const {
      schoolId,
      purchaseOrderId,
      receivedById,
      deliveryNoteNumber,
      items,
      notes
    } = params;

    const po = await prisma.purchaseOrder.findFirst({
      where: { id: purchaseOrderId, schoolId }
    });

    if (!po) {
      throw new Error('Purchase order not found');
    }

    if (po.status !== 'approved' && po.status !== 'partially_delivered') {
      throw new Error(`Cannot receive goods for PO with status "${po.status}". PO must be approved.`);
    }

    const supplierId = params.supplierId || po.supplierId;
    const count = await prisma.goodsReceivedNote.count();
    const grnNumber = `GRN-${new Date().getFullYear()}-${Date.now().toString().slice(-4)}-${(count + 1).toString().padStart(4, '0')}`;

    const totalValueReceived = items.reduce(
      (acc, item) => acc + item.receivedQty * item.unitPrice,
      0
    );

    // Determine status (ACCEPTED vs PARTIAL)
    const isFullyReceived = items.every((i) => i.receivedQty >= i.orderedQty);
    const grnStatus = isFullyReceived ? 'ACCEPTED' : 'PARTIAL';

    return await prisma.$transaction(async (tx) => {
      // 1. Create GoodsReceivedNote
      const grn = await tx.goodsReceivedNote.create({
        data: {
          grnNumber,
          schoolId,
          purchaseOrderId,
          supplierId,
          receivedById,
          deliveryNoteNumber,
          status: grnStatus,
          items,
          totalValueReceived,
          notes
        }
      });

      // 2. Update Purchase Order status
      const nextPoStatus = isFullyReceived ? 'delivered' : 'partially_delivered';
      await tx.purchaseOrder.update({
        where: { id: purchaseOrderId },
        data: { status: nextPoStatus }
      });

      // 3. Record Stock Movements and increment inventory quantities
      for (const item of items) {
        if (item.receivedQty > 0) {
          await tx.stockMovement.create({
            data: {
              schoolId,
              module: 'INVENTORY',
              itemId: item.name,
              itemName: item.name,
              direction: 'IN',
              quantity: item.receivedQty,
              unitCost: item.unitPrice,
              totalCost: item.receivedQty * item.unitPrice,
              reference: grnNumber,
              date: new Date()
            }
          });

          // Check if physical product exists in inventory catalog
          const existingProduct = await tx.physicalProduct.findFirst({
            where: { schoolId, name: item.name }
          });

          if (existingProduct) {
            await tx.physicalProduct.update({
              where: { id: existingProduct.id },
              data: {
                quantity: { increment: item.receivedQty },
                price: item.unitPrice
              }
            });
          }
        }
      }

      return grn;
    });
  }

  /**
   * Perform 3-Way Matching: Purchase Order + GRN + Supplier Invoice.
   * On successful match, approves invoice and posts to Accounts Payable (AP) in the General Ledger.
   */
  static async perform3WayMatch(
    schoolId: string,
    invoiceId: string,
    approverUserId: string = 'SYSTEM'
  ) {
    const invoice = await prisma.invoice.findFirst({
      where: { id: invoiceId, schoolId },
      include: {
        purchaseOrder: true,
        grn: true
      }
    });

    if (!invoice) {
      throw new Error('Supplier invoice not found');
    }

    if (!invoice.purchaseOrderId) {
      const updated = await prisma.invoice.update({
        where: { id: invoiceId },
        data: {
          matchingStatus: 'UNMATCHED',
          matchingNotes: 'Invoice has no linked Purchase Order'
        }
      });
      return {
        success: false,
        matchingStatus: 'UNMATCHED' as const,
        invoice: updated
      };
    }

    const po = invoice.purchaseOrder;
    if (!po) {
      throw new Error('Linked Purchase Order not found');
    }

    // Find linked GRN or latest GRN for the PO
    let grn = invoice.grn;
    if (!grn) {
      grn = await prisma.goodsReceivedNote.findFirst({
        where: { purchaseOrderId: po.id, schoolId },
        orderBy: { receivedDate: 'desc' }
      });
    }

    if (!grn) {
      const updated = await prisma.invoice.update({
        where: { id: invoiceId },
        data: {
          matchingStatus: 'UNMATCHED',
          matchingNotes: 'No Goods Received Note (GRN) found for Purchase Order'
        }
      });
      return {
        success: false,
        matchingStatus: 'UNMATCHED' as const,
        invoice: updated
      };
    }

    // 1. Price / Total Amount Match Check (allow up to 1% or $1 rounding tolerance)
    const amountDifference = Math.abs(invoice.amount - po.totalAmount);
    const amountTolerance = Math.max(1.0, po.totalAmount * 0.01);
    const priceMatched = amountDifference <= amountTolerance;

    if (!priceMatched) {
      const updatedInvoice = await prisma.invoice.update({
        where: { id: invoiceId },
        data: {
          matchingStatus: 'PRICE_VARIANCE',
          matchingNotes: `Invoice amount ($${invoice.amount.toFixed(2)}) differs from PO total ($${po.totalAmount.toFixed(2)}) by $${amountDifference.toFixed(2)}`
        }
      });
      return {
        success: false,
        matchingStatus: 'PRICE_VARIANCE' as const,
        invoice: updatedInvoice
      };
    }

    // 2. Quantity Match Check against GRN
    const grnItems = (grn.items as any[]) || [];
    let quantityMatched = true;
    let qtyVarianceReason = '';

    if (Array.isArray(invoice.items) && (invoice.items as any[]).length > 0) {
      for (const invItem of invoice.items as any[]) {
        const matchingGrnItem = grnItems.find((gi) => gi.name === invItem.name);
        if (matchingGrnItem && invItem.quantity > matchingGrnItem.receivedQty) {
          quantityMatched = false;
          qtyVarianceReason = `Invoiced quantity (${invItem.quantity}) for "${invItem.name}" exceeds GRN received quantity (${matchingGrnItem.receivedQty})`;
          break;
        }
      }
    }

    if (!quantityMatched) {
      const updatedInvoice = await prisma.invoice.update({
        where: { id: invoiceId },
        data: {
          matchingStatus: 'QUANTITY_VARIANCE',
          matchingNotes: qtyVarianceReason
        }
      });
      return {
        success: false,
        matchingStatus: 'QUANTITY_VARIANCE' as const,
        invoice: updatedInvoice
      };
    }

    // 3. Clean Match: Approve Invoice and Post Double-Entry to General Ledger
    return await prisma.$transaction(async (tx) => {
      // Post to General Ledger:
      // Debit: Expense / Inventory (po.coaCode or 5090 General Sundries)
      // Credit: 2010 (Trade Creditors / Accounts Payable)
      const debitAccount = po.coaCode || '5090';
      const creditAccount = '2010'; // Trade Creditors / AP

      const journalEntry = await LedgerService.postDoubleEntry({
        tenantId: schoolId,
        debitCode: debitAccount,
        creditCode: creditAccount,
        amount: invoice.amount,
        currency: 'USD',
        description: `Supplier Invoice matched & approved (PO: ${po.poNumber}, GRN: ${grn.grnNumber})`,
        reference: invoice.invoiceNo,
        sourceModule: 'procurement',
        supplierId: invoice.supplierId,
        userId: approverUserId,
        bypassApprovalCheck: true,
        tx
      });

      const updatedInvoice = await tx.invoice.update({
        where: { id: invoiceId },
        data: {
          matchingStatus: 'MATCHED',
          status: 'approved',
          approvedById: approverUserId,
          approvedAt: new Date(),
          grnId: grn.id,
          journalEntryId: journalEntry.id,
          matchingNotes: `3-Way Match Verified (PO: ${po.poNumber}, GRN: ${grn.grnNumber}). Posted to AP (JE: ${journalEntry.entryNumber})`
        },
        include: {
          supplier: true,
          purchaseOrder: true,
          grn: true
        }
      });

      return {
        success: true,
        matchingStatus: 'MATCHED' as const,
        invoice: updatedInvoice,
        journalEntry
      };
    });
  }

  /**
   * Calculate and post straight-line depreciation for an active asset to the General Ledger.
   */
  static async depreciateAsset(params: {
    schoolId: string;
    assetId: string;
    fiscalYear?: number;
    fiscalPeriod?: string;
    userId?: string;
  }) {
    const {
      schoolId,
      assetId,
      fiscalYear = new Date().getFullYear(),
      fiscalPeriod = `${new Date().getFullYear()}-${(new Date().getMonth() + 1).toString().padStart(2, '0')}`,
      userId = 'SYSTEM'
    } = params;

    const asset = await prisma.asset.findFirst({
      where: { id: assetId, schoolId }
    });

    if (!asset) {
      throw new Error('Asset not found');
    }

    const purchasePrice = asset.purchasePrice || 0;
    const rate = asset.depreciationRate || 10; // Default 10% annual straight-line

    if (purchasePrice <= 0) {
      throw new Error(`Asset "${asset.name}" has no valid purchase price recorded for depreciation`);
    }

    // Current book value before depreciation
    const accumulatedSoFar = asset.accumulatedDepreciation || 0;
    const currentBookValue =
      asset.bookValue !== null && asset.bookValue !== undefined
        ? asset.bookValue
        : Math.max(0, purchasePrice - accumulatedSoFar);

    if (currentBookValue <= 0) {
      throw new Error(`Asset "${asset.name}" is already fully depreciated (Book Value: $0.00)`);
    }

    // Straight-line annual depreciation divided into termly / monthly chunk (e.g. 1/3 for term or annual rate / 12)
    const annualDepreciation = purchasePrice * (rate / 100);
    // Standard termly / periodic calculation (1/3 of annual depreciation per school term)
    const rawDepreciation = Math.round((annualDepreciation / 3) * 100) / 100;
    const finalDepreciationAmount = Math.min(rawDepreciation, currentBookValue);

    const newBookValue = Math.max(0, Math.round((currentBookValue - finalDepreciationAmount) * 100) / 100);
    const newAccumulated = Math.round((accumulatedSoFar + finalDepreciationAmount) * 100) / 100;

    // Accounts:
    // Debit: 5077 (Depreciation Expense — Equipment & ICT) or asset.coaExpenseCode
    // Credit: 1541 (Accumulated Depreciation — ICT) or asset.coaAccumulatedCode
    const expenseCode = asset.coaExpenseCode || '5077';
    const contraCode = asset.coaAccumulatedCode || '1541';

    return await prisma.$transaction(async (tx) => {
      // 1. Post double-entry to General Ledger
      const journalEntry = await LedgerService.postDoubleEntry({
        tenantId: schoolId,
        debitCode: expenseCode,
        creditCode: contraCode,
        amount: finalDepreciationAmount,
        currency: 'USD',
        description: `Straight-line depreciation for ${asset.name} (${asset.assetNumber || 'AST'}) at ${rate}% p.a.`,
        reference: `DEP-${asset.assetNumber || asset.id}-${fiscalPeriod}`,
        sourceModule: 'depreciation',
        userId,
        bypassApprovalCheck: true,
        tx
      });

      // 2. Create AssetDepreciation log
      const depreciationRecord = await tx.assetDepreciation.create({
        data: {
          schoolId,
          assetId,
          date: new Date(),
          fiscalYear,
          fiscalPeriod,
          depreciationAmount: finalDepreciationAmount,
          bookValueBefore: currentBookValue,
          bookValueAfter: newBookValue,
          rateUsed: rate,
          method: 'STRAIGHT_LINE',
          journalEntryId: journalEntry.id,
          processedById: userId,
          notes: `Posted to GL ${expenseCode}/${contraCode} (JE: ${journalEntry.entryNumber})`
        }
      });

      // 3. Update Asset
      const updatedAsset = await tx.asset.update({
        where: { id: assetId },
        data: {
          accumulatedDepreciation: newAccumulated,
          bookValue: newBookValue,
          lastDepreciationDate: new Date()
        }
      });

      return {
        asset: updatedAsset,
        depreciationRecord,
        journalEntry
      };
    });
  }
}
