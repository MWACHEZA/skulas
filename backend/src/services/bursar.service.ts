import prisma from '../lib/prisma';
import type { Prisma } from '../generated/client';
import { LedgerService } from './ledger.service';
import { SequenceService } from './sequence.service';
import { getAccountId } from '../../prisma/seeders/coa.seeder';
import { LedgerEvents } from './ledger-events';
import { getFiscalProvider } from './fiscal.provider';
import { NotificationService } from './notifications';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface InvoiceItemInput {
  billingItemCode?: string;
  description: string;
  quantity: number;
  unitPrice: number;
  revenueAccountCode?: string;
  totalAmount: number;
}

export interface CreateStudentInvoiceInput {
  schoolId: string;
  idempotencyKey: string;
  studentId: string;
  termId?: string;
  term?: string;
  year?: number;
  currency?: string;
  sourceModule: 'boarding' | 'uniforms' | 'transport' | 'trips' | 'bulk_billing' | 'library_fine' | string;
  sourceId?: string;
  dueDate?: Date | string;
  items: InvoiceItemInput[];
  createdBy?: string;
  batchId?: string;
  tx?: Prisma.TransactionClient;
}

export interface ReceivePaymentInput {
  schoolId: string;
  idempotencyKey: string;
  studentId: string;
  amount: number;
  paymentCurrency: string; // "USD" | "ZiG"
  invoiceCurrency?: string; // default "USD"
  exchangeRate?: number; // e.g. 26.5 ZiG per USD
  paymentMethod: 'cash_usd' | 'cash_zig' | 'ecocash' | 'bank_usd' | 'bank_zig' | 'wallet' | string;
  receivedBy?: string;
  fiscalize?: boolean;
  allocateStrategy?: 'oldest_first' | 'specific_invoice';
  specificInvoiceId?: string;
  tx?: Prisma.TransactionClient;
}

export interface StudentBalanceResult {
  studentId: string;
  studentName: string;
  className: string | null;
  totalBilled: number;
  totalPaid: number;
  unallocatedCredit: number;
  balance: number;
  currency: string;
}

export interface DefaulterAgingResult {
  studentId: string;
  studentCode: string;
  studentName: string;
  className: string | null;
  boardingStatus: string;
  parentPhone: string | null;
  current: number;    // 0–30 days
  days31_60: number;  // 31–60 days
  days61_90: number;  // 61–90 days
  over90: number;     // 90+ days
  totalArrears: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function round2(val: number): number {
  return Math.round(val * 100) / 100;
}

/**
 * Maps payment method string to Chart of Accounts code
 */
export function getPaymentMethodAccountCode(paymentMethod: string): string {
  const norm = (paymentMethod || '').toLowerCase();
  switch (norm) {
    case 'cash_usd':
    case 'cash':
      return '1020'; // Cash Office Vault
    case 'cash_zig':
      return '1020'; // Cash Office Vault
    case 'ecocash':
    case 'mobile':
    case 'onemoney':
      return '1022'; // Mobile Money Float
    case 'bank_usd':
    case 'nostro':
      return '1011'; // Bank Account — Nostro USD
    case 'bank_zig':
    case 'bank':
    case 'transfer':
      return '1010'; // Bank Account — Main Operations
    case 'wallet':
      return '2110'; // Student Pocket Money / Digital Wallets (Liability reduction)
    default:
      return '1020'; // Cash Office Vault fallback
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// BursarService Implementation
// ─────────────────────────────────────────────────────────────────────────────

export class BursarService {
  /**
   * createStudentInvoice() — Central billing function called by all school modules.
   * Atomic double-entry: DR Student Debtors Control (1100/1210) | CR Item Revenue Accounts.
   * Idempotent: same idempotencyKey returns existing invoice without double-billing.
   */
  static async createStudentInvoice(input: CreateStudentInvoiceInput) {
    const {
      schoolId,
      idempotencyKey,
      studentId,
      termId,
      term,
      year = new Date().getFullYear(),
      currency = 'USD',
      sourceModule,
      sourceId,
      dueDate,
      items,
      createdBy,
      batchId,
      tx: externalTx
    } = input;

    if (!idempotencyKey || !idempotencyKey.trim()) {
      throw new Error('idempotencyKey is required for invoice creation');
    }
    if (!studentId) {
      throw new Error('studentId is required for invoice creation');
    }
    if (!items || items.length === 0) {
      throw new Error('Invoice must contain at least one billing item');
    }

    const run = async (db: Prisma.TransactionClient) => {
      // 1. Idempotency Check: if key exists, return existing invoice immediately
      const existing = await db.studentInvoice.findUnique({
        where: { idempotencyKey },
        include: { items: true, allocations: true }
      });
      if (existing) {
        return {
          invoice: existing,
          isDuplicate: true,
          message: 'Existing invoice returned (idempotency match)'
        };
      }

      // 2. Validate Student & Tenant
      const student = await db.student.findFirst({
        where: { id: studentId, schoolId },
        include: { class: true }
      });
      if (!student) {
        throw new Error(`Student ${studentId} not found in this school context`);
      }

      // 3. Validate Items and Compute Totals
      let invoiceTotal = 0;
      const validatedItems: Array<InvoiceItemInput & { totalAmount: number; revenueAccountCode: string }> = [];

      for (const item of items) {
        const qty = item.quantity && item.quantity > 0 ? item.quantity : 1;
        const price = Number(item.unitPrice) || 0;
        if (price < 0) {
          throw new Error(`Item price cannot be negative: ${item.description}`);
        }
        const calcTotal = round2(qty * price);
        const givenTotal = item.totalAmount !== undefined ? round2(item.totalAmount) : calcTotal;

        // Ensure given total matches quantity * unitPrice within rounding margin
        if (Math.abs(givenTotal - calcTotal) > 0.05) {
          throw new Error(
            `Line item total mismatch for "${item.description}": ${givenTotal} vs calculated ${calcTotal}`
          );
        }

        // Validate or resolve revenue account code
        const revCode = item.revenueAccountCode || '4010';
        const account = await db.chartOfAccount.findFirst({
          where: { schoolId, code: revCode, isActive: true }
        });
        if (!account) {
          // Verify if fallback 4010 or 4000 exists
          const fallback = await db.chartOfAccount.findFirst({
            where: { schoolId, code: { in: ['4010', '4000'] }, isActive: true }
          });
          if (!fallback) {
            throw new Error(`Invalid revenue account code "${revCode}" — account not found in Chart of Accounts`);
          }
        }

        invoiceTotal += givenTotal;
        validatedItems.push({
          ...item,
          quantity: qty,
          unitPrice: price,
          totalAmount: givenTotal,
          revenueAccountCode: revCode
        });
      }

      invoiceTotal = round2(invoiceTotal);
      if (invoiceTotal <= 0) {
        throw new Error('Total invoice amount must be greater than zero');
      }

      // 4. Generate Atomic Sequential Invoice Number
      const invoiceNumber = await SequenceService.nextDocNo(schoolId, 'INV', db);

      // 5. Create Invoice & Line Items in Database
      const invoice = await db.studentInvoice.create({
        data: {
          schoolId,
          studentId,
          termId: termId || null,
          term: term || (termId ? `Term ${termId}` : 'Term 1'),
          year,
          batchId: batchId || null,
          invoiceNumber,
          totalAmount: invoiceTotal,
          currency,
          status: 'posted',
          sourceModule,
          sourceId: sourceId || null,
          idempotencyKey,
          dueDate: dueDate ? new Date(dueDate) : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          createdBy: createdBy || 'SYSTEM',
          items: {
            create: validatedItems.map(it => ({
              billingItemCode: it.billingItemCode || null,
              description: it.description,
              quantity: it.quantity,
              unitPrice: it.unitPrice,
              totalAmount: it.totalAmount,
              revenueAccountCode: it.revenueAccountCode
            }))
          }
        },
        include: { items: true, allocations: true }
      });

      // 6. Post Double-Entry Journal Entry
      // DR Student Accounts Receivable / Debtors Control (1100, fallback 1210)
      const arAccountId = (await getAccountId(schoolId, '1100', db).catch(() => null)) ||
                          (await getAccountId(schoolId, '1210', db));

      const journalLines = [
        {
          accountId: arAccountId,
          coaCode: '1100',
          debit: invoiceTotal,
          credit: 0,
          description: `Fee Invoice ${invoiceNumber} — ${student.name}`,
          studentId,
          currency
        }
      ];

      // CR Revenue Accounts per line item
      for (const item of validatedItems) {
        const revAccountId = (await getAccountId(schoolId, item.revenueAccountCode, db).catch(() => null)) ||
                             (await getAccountId(schoolId, '4010', db));
        journalLines.push({
          accountId: revAccountId,
          coaCode: item.revenueAccountCode,
          debit: 0,
          credit: item.totalAmount,
          description: `${item.description} (${invoiceNumber})`,
          studentId,
          currency
        });
      }

      const journalEntry = await LedgerService.postEntry({
        schoolId,
        date: new Date(),
        description: `Student Invoice ${invoiceNumber}: ${sourceModule} (${student.name})`,
        sourceType: 'invoice',
        sourceId: invoice.id,
        lines: journalLines,
        createdByUserId: createdBy,
        currency,
        tx: db
      });

      // 7. Write Audit Log
      try {
        await db.auditLog.create({
          data: {
            schoolId,
            actorId: createdBy && createdBy !== 'SYSTEM' ? createdBy : (student.userId || studentId),
            action: 'CREATE_STUDENT_INVOICE',
            entityType: 'StudentInvoice',
            entityId: invoice.id,
            details: {
              invoiceNumber,
              totalAmount: invoiceTotal,
              currency,
              sourceModule,
              studentId,
              journalEntryId: journalEntry.id,
              idempotencyKey
            },
            status: 'SUCCESS',
            ipAddress: '127.0.0.1'
          }
        });
      } catch (auditErr) {
        console.warn('Audit log write skipped:', auditErr);
      }

      // 8. Broadcast Real-Time Ledger Event
      LedgerEvents.broadcast({
        type: 'LEDGER_POSTED',
        schoolId,
        studentId,
        sourceType: 'invoice',
        sourceId: invoice.id,
        timestamp: new Date().toISOString()
      });

      return {
        invoice,
        isDuplicate: false,
        journalEntryId: journalEntry.id
      };
    };

    return externalTx ? run(externalTx) : prisma.$transaction(run);
  }

  /**
   * receivePayment() — Central payment receipt function.
   * Atomically:
   * 1. Checks idempotency
   * 2. Fiscalises via FiscalProvider if requested
   * 3. Creates Receipt and allocates to unpaid invoices (or unallocated credit)
   * 4. Posts DR Cash/Bank/Wallet | CR Debtors Control
   * 5. Sends parent receipt SMS
   */
  static async receivePayment(input: ReceivePaymentInput) {
    const {
      schoolId,
      idempotencyKey,
      studentId,
      amount,
      paymentCurrency = 'USD',
      invoiceCurrency = 'USD',
      exchangeRate = 1.0,
      paymentMethod,
      receivedBy,
      fiscalize = false,
      allocateStrategy = 'oldest_first',
      specificInvoiceId,
      tx: externalTx
    } = input;

    if (!idempotencyKey || !idempotencyKey.trim()) {
      throw new Error('idempotencyKey is required for payment receipt');
    }
    if (!studentId) {
      throw new Error('studentId is required for payment receipt');
    }
    if (!amount || amount <= 0) {
      throw new Error('Payment amount must be greater than zero');
    }
    if (!exchangeRate || exchangeRate <= 0) {
      throw new Error('Exchange rate must be greater than zero');
    }

    const run = async (db: Prisma.TransactionClient) => {
      // 1. Idempotency check
      const existing = await db.receipt.findUnique({
        where: { idempotencyKey },
        include: { allocations: { include: { invoice: true } } }
      });
      if (existing) {
        return {
          receipt: existing,
          isDuplicate: true,
          message: 'Existing receipt returned (idempotency match)'
        };
      }

      // 2. Validate Student
      const student = await db.student.findFirst({
        where: { id: studentId, schoolId },
        include: {
          class: true,
          user: { select: { name: true, phone: true } },
          parents: {
            where: { status: 'APPROVED' },
            include: { parent: { include: { user: { select: { phone: true, name: true } } } } }
          }
        }
      });
      if (!student) {
        throw new Error(`Student ${studentId} not found in this school context`);
      }

      // 3. Generate Atomic Sequential Receipt Number
      const receiptNumber = await SequenceService.nextDocNo(schoolId, 'REC', db);

      // 4. Fiscalisation Check (ZIMRA FDMS Virtual Fiscal Device)
      let fiscalSignature: string | null = null;
      let fiscalQr: string | null = null;
      let fiscalReceiptNumber: string | null = null;

      if (fiscalize) {
        const provider = getFiscalProvider(schoolId);
        try {
          const fiscalRes = await provider.fiscaliseReceipt({
            schoolId,
            receiptNumber,
            amount,
            currency: paymentCurrency,
            paymentMethod,
            studentName: student.name,
            items: [{ description: `Fee Payment (${receiptNumber})`, amount }]
          });
          fiscalSignature = fiscalRes.fiscalSignature;
          fiscalQr = fiscalRes.fiscalQr;
          fiscalReceiptNumber = fiscalRes.fiscalReceiptNumber;
        } catch (fErr: any) {
          throw new Error(`Fiscalisation failed: ${fErr.message || fErr}. Receipt aborted.`);
        }
      }

      // 5. Multi-Currency Calculation
      // Convert payment amount into invoice currency
      let allocatableAmount = round2(amount);
      if (paymentCurrency !== invoiceCurrency) {
        if (paymentCurrency === 'ZiG' && invoiceCurrency === 'USD') {
          allocatableAmount = round2(amount / exchangeRate);
        } else if (paymentCurrency === 'USD' && invoiceCurrency === 'ZiG') {
          allocatableAmount = round2(amount * exchangeRate);
        } else {
          allocatableAmount = round2(amount / exchangeRate);
        }
      }

      // 6. Create Receipt
      const receipt = await db.receipt.create({
        data: {
          schoolId,
          studentId,
          receiptNumber,
          amount: round2(amount),
          paymentCurrency,
          invoiceCurrency,
          exchangeRate,
          paymentMethod,
          idempotencyKey,
          fiscalSignature,
          fiscalQr,
          fiscalReceiptNumber,
          receivedBy: receivedBy || 'SYSTEM',
          status: 'completed'
        }
      });

      // 7. Allocate to Invoices
      let remainingToAllocate = allocatableAmount;
      const allocationsData: Array<{
        receiptId: string;
        invoiceId: string | null;
        allocatedAmount: number;
        type: string;
      }> = [];

      // A) Handle specific invoice if provided
      if (allocateStrategy === 'specific_invoice' && specificInvoiceId) {
        const specificInv = await db.studentInvoice.findFirst({
          where: { id: specificInvoiceId, studentId, schoolId, status: { not: 'cancelled' } },
          include: { allocations: true }
        });

        if (specificInv) {
          const alreadyPaid = specificInv.allocations.reduce((s, a) => s + a.allocatedAmount, 0);
          const due = Math.max(0, round2(specificInv.totalAmount - alreadyPaid));
          const toAlloc = Math.min(remainingToAllocate, due);

          if (toAlloc > 0) {
            allocationsData.push({
              receiptId: receipt.id,
              invoiceId: specificInv.id,
              allocatedAmount: toAlloc,
              type: 'INVOICE'
            });
            remainingToAllocate = round2(remainingToAllocate - toAlloc);

            const newTotalPaid = round2(alreadyPaid + toAlloc);
            const newStatus = newTotalPaid >= specificInv.totalAmount ? 'paid' : 'partial';
            await db.studentInvoice.update({
              where: { id: specificInv.id },
              data: { status: newStatus }
            });
          }
        }
      }

      // B) Oldest-first allocation for any remaining balance
      if (remainingToAllocate > 0) {
        const openInvoices = await db.studentInvoice.findMany({
          where: {
            studentId,
            schoolId,
            status: { in: ['posted', 'partial'] },
            ...(specificInvoiceId ? { id: { not: specificInvoiceId } } : {})
          },
          include: { allocations: true },
          orderBy: { createdAt: 'asc' }
        });

        for (const inv of openInvoices) {
          if (remainingToAllocate <= 0) break;

          const alreadyPaid = inv.allocations.reduce((s, a) => s + a.allocatedAmount, 0);
          const due = Math.max(0, round2(inv.totalAmount - alreadyPaid));
          if (due <= 0) continue;

          const toAlloc = Math.min(remainingToAllocate, due);
          allocationsData.push({
            receiptId: receipt.id,
            invoiceId: inv.id,
            allocatedAmount: toAlloc,
            type: 'INVOICE'
          });
          remainingToAllocate = round2(remainingToAllocate - toAlloc);

          const newTotalPaid = round2(alreadyPaid + toAlloc);
          const newStatus = newTotalPaid >= inv.totalAmount ? 'paid' : 'partial';
          await db.studentInvoice.update({
            where: { id: inv.id },
            data: { status: newStatus }
          });
        }
      }

      // C) Unallocated Credit if excess amount remains
      if (remainingToAllocate > 0) {
        allocationsData.push({
          receiptId: receipt.id,
          invoiceId: null,
          allocatedAmount: remainingToAllocate,
          type: 'UNALLOCATED_CREDIT'
        });
        remainingToAllocate = 0;
      }

      // Save allocations
      if (allocationsData.length > 0) {
        await db.paymentAllocation.createMany({
          data: allocationsData
        });
      }

      // 8. Ledger Double-Entry Posting
      // DR Payment Account (Cash/Bank/Wallet)
      const debitCode = getPaymentMethodAccountCode(paymentMethod);
      const debitAccountId = await getAccountId(schoolId, debitCode, db);

      // CR Student Accounts Receivable / Debtors Control (1100, fallback 1210)
      const creditAccountId = (await getAccountId(schoolId, '1100', db).catch(() => null)) ||
                              (await getAccountId(schoolId, '1210', db));

      const je = await LedgerService.postEntry({
        schoolId,
        date: new Date(),
        description: `Receipt ${receiptNumber} (${student.name}) via ${paymentMethod}`,
        sourceType: 'receipt',
        sourceId: receipt.id,
        lines: [
          {
            accountId: debitAccountId,
            coaCode: debitCode,
            debit: round2(amount),
            credit: 0,
            description: `Payment received via ${paymentMethod}`,
            studentId,
            currency: paymentCurrency,
            exchangeRate
          },
          {
            accountId: creditAccountId,
            coaCode: '1100',
            debit: 0,
            credit: round2(amount),
            description: `Credit Debtors — ${student.name}`,
            studentId,
            currency: paymentCurrency,
            exchangeRate
          }
        ],
        createdByUserId: receivedBy,
        currency: paymentCurrency,
        exchangeRateUsed: exchangeRate,
        tx: db
      });

      // 9. If paid via Student Wallet, deduct wallet liability transaction
      if ((paymentMethod || '').toLowerCase() === 'wallet') {
        const wallet = await db.studentWallet.upsert({
          where: { studentId },
          update: {},
          create: { studentId }
        });
        await db.walletTransaction.create({
          data: {
            walletId: wallet.id,
            amount: -round2(amount),
            type: 'PURCHASE',
            description: `Fees payment (${receiptNumber})`
          }
        });
      }

      // 10. Audit Log Write
      try {
        await db.auditLog.create({
          data: {
            schoolId,
            actorId: receivedBy && receivedBy !== 'SYSTEM' ? receivedBy : (student.userId || studentId),
            action: 'RECEIVE_STUDENT_PAYMENT',
            entityType: 'Receipt',
            entityId: receipt.id,
            details: {
              receiptNumber,
              amount,
              paymentCurrency,
              invoiceCurrency,
              exchangeRate,
              paymentMethod,
              journalEntryId: je.id,
              fiscalReceiptNumber
            },
            status: 'SUCCESS',
            ipAddress: '127.0.0.1'
          }
        });
      } catch (aErr) {
        console.warn('Receipt audit log skipped:', aErr);
      }

      // 11. Parent Notification / SMS
      const parentPhone = student.parents?.[0]?.parent?.phone || student.parents?.[0]?.parent?.user?.phone || student.user?.phone;
      if (parentPhone) {
        try {
          await NotificationService.enqueue({
            type: 'SMS',
            schoolId,
            senderId: receivedBy || 'SYSTEM',
            studentId,
            recipientPhone: parentPhone,
            payload: {
              message: `Receipt ${receiptNumber}: Received ${paymentCurrency} ${amount.toFixed(2)} for ${student.name}. Thank you.`
            }
          });
        } catch (notifErr) {
          console.warn('Parent notification skipped:', notifErr);
        }
      }

      // 12. Broadcast Real-Time Ledger Event
      LedgerEvents.broadcast({
        type: 'PAYMENT_RECEIVED',
        schoolId,
        studentId,
        sourceType: 'receipt',
        sourceId: receipt.id,
        timestamp: new Date().toISOString()
      });

      // 13. Fetch updated receipt with allocations
      const finalReceipt = await db.receipt.findUnique({
        where: { id: receipt.id },
        include: { allocations: { include: { invoice: true } } }
      });

      return {
        receipt: finalReceipt,
        isDuplicate: false,
        journalEntryId: je.id
      };
    };

    return externalTx ? run(externalTx) : prisma.$transaction(run);
  }

  /**
   * getStudentBalance() — Derives student balances dynamically from the ledger & invoices.
   * Balances are NEVER written directly; always computed from invoices minus allocations.
   */
  static async getStudentBalance(schoolId: string, studentId: string): Promise<StudentBalanceResult> {
    const student = await prisma.student.findFirst({
      where: { id: studentId, schoolId },
      include: { class: true }
    });
    if (!student) {
      throw new Error(`Student ${studentId} not found`);
    }

    // 1. Sum of all non-cancelled invoices
    const invoices = await prisma.studentInvoice.findMany({
      where: { studentId, schoolId, status: { not: 'cancelled' } },
      select: { totalAmount: true }
    });
    const totalBilled = round2(invoices.reduce((s, i) => s + i.totalAmount, 0));

    // 2. Sum of all allocations
    const allocations = await prisma.paymentAllocation.findMany({
      where: { receipt: { studentId, schoolId } },
      select: { allocatedAmount: true, type: true }
    });

    const totalPaid = round2(allocations.reduce((s, a) => s + a.allocatedAmount, 0));
    const unallocatedCredit = round2(
      allocations.filter(a => a.type === 'UNALLOCATED_CREDIT').reduce((s, a) => s + a.allocatedAmount, 0)
    );
    const balance = round2(Math.max(0, totalBilled - totalPaid));

    return {
      studentId,
      studentName: student.name,
      className: student.class?.name || null,
      totalBilled,
      totalPaid,
      unallocatedCredit,
      balance,
      currency: 'USD'
    };
  }

  /**
   * getAllStudentBalances() — Returns all students with derived balances.
   */
  static async getAllStudentBalances(schoolId: string): Promise<StudentBalanceResult[]> {
    const students = await prisma.student.findMany({
      where: { schoolId },
      include: {
        class: true,
        studentInvoices: {
          where: { status: { not: 'cancelled' } },
          select: { totalAmount: true }
        },
        receipts: {
          include: { allocations: true }
        }
      },
      orderBy: { name: 'asc' }
    });

    return students.map(s => {
      const totalBilled = round2(s.studentInvoices.reduce((acc, inv) => acc + inv.totalAmount, 0));
      const allAllocations = s.receipts.flatMap(r => r.allocations);
      const totalPaid = round2(allAllocations.reduce((acc, a) => acc + a.allocatedAmount, 0));
      const unallocatedCredit = round2(
        allAllocations.filter(a => a.type === 'UNALLOCATED_CREDIT').reduce((acc, a) => acc + a.allocatedAmount, 0)
      );
      const balance = round2(Math.max(0, totalBilled - totalPaid));

      return {
        studentId: s.id,
        studentName: s.name,
        className: s.class?.name || null,
        totalBilled,
        totalPaid,
        unallocatedCredit,
        balance,
        currency: 'USD'
      };
    });
  }

  /**
   * getDefaultersAging() — Categorizes debtors into 0–30, 31–60, 61–90, 90+ day buckets.
   */
  static async getDefaultersAging(schoolId: string, asOfDate: Date = new Date()): Promise<DefaulterAgingResult[]> {
    const students = await prisma.student.findMany({
      where: { schoolId },
      include: {
        class: true,
        studentInvoices: {
          where: { status: { in: ['posted', 'partial'] } },
          include: { allocations: true },
          orderBy: { dueDate: 'asc' }
        },
        parents: {
          include: { parent: { include: { user: { select: { phone: true } } } } }
        },
        user: { select: { phone: true } }
      }
    });

    const now = asOfDate.getTime();
    const results: DefaulterAgingResult[] = [];

    for (const student of students) {
      let current = 0;
      let days31_60 = 0;
      let days61_90 = 0;
      let over90 = 0;

      for (const inv of student.studentInvoices) {
        const allocated = inv.allocations.reduce((sum, a) => sum + a.allocatedAmount, 0);
        const unpaid = round2(inv.totalAmount - allocated);
        if (unpaid <= 0) continue;

        const due = inv.dueDate ? new Date(inv.dueDate).getTime() : new Date(inv.createdAt).getTime();
        const diffDays = Math.max(0, Math.floor((now - due) / (1000 * 60 * 60 * 24)));

        if (diffDays <= 30) {
          current += unpaid;
        } else if (diffDays <= 60) {
          days31_60 += unpaid;
        } else if (diffDays <= 90) {
          days61_90 += unpaid;
        } else {
          over90 += unpaid;
        }
      }

      const totalArrears = round2(current + days31_60 + days61_90 + over90);
      if (totalArrears > 0) {
        const parentPhone = student.parents?.[0]?.parent?.phone || student.parents?.[0]?.parent?.user?.phone || student.user?.phone || null;
        results.push({
          studentId: student.id,
          studentCode: student.studentId,
          studentName: student.name,
          className: student.class?.name || null,
          boardingStatus: student.boardingStatus || 'Day',
          parentPhone,
          current: round2(current),
          days31_60: round2(days31_60),
          days61_90: round2(days61_90),
          over90: round2(over90),
          totalArrears
        });
      }
    }

    return results.sort((a, b) => b.totalArrears - a.totalArrears);
  }
}
