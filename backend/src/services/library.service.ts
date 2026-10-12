import prisma from '../lib/prisma';
import type { Prisma } from '../generated/client';
import { BursarService } from './bursar.service';

export interface FineCalculationResult {
  daysOverdue: number;
  fineAmount: number;
  rawFine: number;
  cappedFine: number;
  isOverdue: boolean;
}

export interface ProcessDailyFinesOptions {
  schoolId?: string;
  asOfDate?: Date;
}

export interface ReturnBookOptions {
  schoolId: string;
  loanId: string;
  returnDate?: Date;
  condition?: string;
  waivedAmount?: number;
  waiverReason?: string;
  authorizedById?: string;
}

export interface WaiveFineOptions {
  schoolId: string;
  loanId: string;
  fineId?: string;
  amount: number;
  reason: string;
  authorizedById: string;
}

export interface LinkBookSyllabusOptions {
  schoolId: string;
  bookId: string;
  syllabusId: string;
  curriculum?: string;
  level?: string;
  topics?: string[];
}

export interface BorrowBookOptions {
  schoolId: string;
  bookId: string;
  studentId?: string;
  userId?: string;
  loanType?: string;
  dueDate?: Date;
  notes?: string;
}

export interface SearchCatalogueOptions {
  schoolId: string;
  search?: string;
  categoryId?: string;
  subjectId?: string;
  syllabusId?: string;
  curriculum?: string;
  level?: string;
  availableOnly?: boolean;
}

export class LibraryService {
  /**
   * Calculates calendar or business days between two dates.
   * Excludes weekends (Saturday & Sunday) when includeWeekends is false.
   */
  static calculateDaysBetween(
    startDate: Date,
    endDate: Date,
    includeWeekends: boolean = false
  ): number {
    if (startDate >= endDate) return 0;

    if (includeWeekends) {
      const diff = endDate.getTime() - startDate.getTime();
      return Math.floor(diff / (1000 * 60 * 60 * 24));
    }

    let count = 0;
    const cur = new Date(startDate);
    cur.setHours(0, 0, 0, 0);
    const target = new Date(endDate);
    target.setHours(0, 0, 0, 0);

    while (cur < target) {
      cur.setDate(cur.getDate() + 1);
      const day = cur.getDay();
      if (day !== 0 && day !== 6) {
        // Skip Sunday (0) and Saturday (6)
        count++;
      }
    }
    return count;
  }

  /**
   * Computes overdue days and fine amount for a book loan based on school library settings.
   */
  static calculateLoanFine(
    loan: {
      dueDate: Date;
      studentId?: string | null;
      waivedFine?: number | null;
      paidFine?: number | null;
    },
    setting?: {
      studentDailyFine?: number;
      studentMaxFine?: number;
      staffDailyFine?: number;
      staffMaxFine?: number;
      accrueOnWeekends?: boolean;
    } | null,
    asOfDate: Date = new Date()
  ): FineCalculationResult {
    const due = new Date(loan.dueDate);

    if (asOfDate <= due) {
      return { daysOverdue: 0, fineAmount: 0, rawFine: 0, cappedFine: 0, isOverdue: false };
    }

    const isStudent = Boolean(loan.studentId);
    const dailyRate = isStudent
      ? (setting?.studentDailyFine ?? 0.50)
      : (setting?.staffDailyFine ?? 1.00);
    const maxCap = isStudent
      ? (setting?.studentMaxFine ?? 20.00)
      : (setting?.staffMaxFine ?? 30.00);
    const includeWeekends = setting?.accrueOnWeekends ?? false;

    const daysOverdue = this.calculateDaysBetween(due, asOfDate, includeWeekends);
    const rawFine = daysOverdue * dailyRate;
    const cappedFine = Math.min(rawFine, maxCap);

    const waived = loan.waivedFine ?? 0;
    const paid = loan.paidFine ?? 0;
    const netFine = Math.max(0, cappedFine - waived - paid);

    return {
      daysOverdue,
      fineAmount: parseFloat(netFine.toFixed(2)),
      rawFine: parseFloat(rawFine.toFixed(2)),
      cappedFine: parseFloat(cappedCap(cappedFine)),
      isOverdue: daysOverdue > 0
    };

    function cappedCap(val: number): string {
      return val.toFixed(2);
    }
  }

  /**
   * Daily Fine Calculation Engine:
   * Sweeps overdue loans, computes accrued fines according to library rules,
   * creates BookLoanFine records, and posts student invoices to Bursar (Revenue 4065).
   * Enforces idempotency per calendar day.
   */
  static async processDailyOverdueFines(options: ProcessDailyFinesOptions = {}) {
    const asOfDate = options.asOfDate || new Date();
    const asOfDateStr = asOfDate.toISOString().slice(0, 10);

    const whereClause: Prisma.BookLoanWhereInput = {
      status: { in: ['borrowed', 'overdue'] },
      returnedAt: null,
      dueDate: { lt: asOfDate },
      ...(options.schoolId ? { schoolId: options.schoolId } : {})
    };

    const overdueLoans = await prisma.bookLoan.findMany({
      where: whereClause,
      include: {
        book: true,
        student: {
          include: {
            user: { select: { id: true, name: true, email: true } }
          }
        },
        user: { select: { id: true, name: true, email: true } },
        fines: true
      }
    });

    const settingsCache: Record<string, any> = {};
    const results = {
      totalOverdueProcessed: overdueLoans.length,
      totalFinesAccrued: 0,
      totalInvoicesCreated: 0,
      blockedBorrowersCount: 0,
      processedLoans: [] as Array<{
        loanId: string;
        studentId?: string | null;
        bookTitle: string;
        daysOverdue: number;
        newFineIncrement: number;
        totalFineCalculated: number;
        invoiceId?: string | null;
      }>,
      errors: [] as Array<{ loanId: string; error: string }>
    };

    for (const loan of overdueLoans) {
      try {
        if (!settingsCache[loan.schoolId]) {
          settingsCache[loan.schoolId] = await prisma.librarySetting.findUnique({
            where: { schoolId: loan.schoolId }
          });
        }
        const setting = settingsCache[loan.schoolId];

        const { daysOverdue, fineAmount, isOverdue } = this.calculateLoanFine(
          loan,
          setting,
          asOfDate
        );

        if (!isOverdue) continue;

        // Calculate previously billed overdue fines for this loan
        const previouslyBilled = (loan.fines || [])
          .filter(f => f.fineType === 'OVERDUE' && f.status !== 'WAIVED')
          .reduce((sum, f) => sum + f.amount, 0);

        const unbilledIncrement = Math.max(
          0,
          parseFloat((fineAmount - previouslyBilled).toFixed(2))
        );

        let createdInvoiceId: string | null = null;

        // Only bill students if there is an unbilled positive increment
        if (unbilledIncrement >= 0.01 && loan.studentId) {
          // 1. Create BookLoanFine record
          const fineRecord = await prisma.bookLoanFine.create({
            data: {
              schoolId: loan.schoolId,
              loanId: loan.id,
              studentId: loan.studentId,
              amount: unbilledIncrement,
              fineType: 'OVERDUE',
              reason: `Overdue fine (${daysOverdue} days overdue) for "${loan.book.title}"`,
              status: 'BILLED'
            }
          });

          // 2. Post Central Student Invoice via BursarService
          const idempotencyKey = `libfine_${loan.id}_${asOfDateStr}_${fineRecord.id.slice(-6)}`;
          const invoiceResult = await BursarService.createStudentInvoice({
            schoolId: loan.schoolId,
            idempotencyKey,
            studentId: loan.studentId,
            sourceModule: 'library_fine',
            sourceId: fineRecord.id,
            dueDate: asOfDate,
            items: [
              {
                billingItemCode: 'LIB-FINE',
                description: `Library Overdue Fine: "${loan.book.title}" (${daysOverdue} days overdue)`,
                quantity: 1,
                unitPrice: unbilledIncrement,
                totalAmount: unbilledIncrement,
                revenueAccountCode: '4065' // 4065: Library Fines & Overdue Book Charges
              }
            ]
          });

          createdInvoiceId = invoiceResult.invoice.id;

          // 3. Link Invoice to Fine Record and update Loan
          await prisma.bookLoanFine.update({
            where: { id: fineRecord.id },
            data: { invoiceId: createdInvoiceId }
          });

          await prisma.bookLoan.update({
            where: { id: loan.id },
            data: {
              fineCalculated: fineAmount,
              invoiceId: createdInvoiceId,
              status: 'overdue'
            }
          });

          results.totalFinesAccrued += unbilledIncrement;
          results.totalInvoicesCreated++;
        } else {
          // Just update fineCalculated & status on loan if amount unchanged or non-student
          await prisma.bookLoan.update({
            where: { id: loan.id },
            data: {
              fineCalculated: fineAmount,
              status: 'overdue'
            }
          });
        }

        results.processedLoans.push({
          loanId: loan.id,
          studentId: loan.studentId,
          bookTitle: loan.book.title,
          daysOverdue,
          newFineIncrement: unbilledIncrement,
          totalFineCalculated: fineAmount,
          invoiceId: createdInvoiceId
        });
      } catch (err: any) {
        console.error(`[LibraryService] Error processing daily fine for loan ${loan.id}:`, err);
        results.errors.push({ loanId: loan.id, error: err.message || String(err) });
      }
    }

    results.totalFinesAccrued = parseFloat(results.totalFinesAccrued.toFixed(2));
    return results;
  }

  /**
   * Return a book with fine settlement.
   * If overdue, calculates final fine, invoices any unbilled amount, restores copy availability,
   * and advances waiting reservations.
   */
  static async returnBookWithFineSettlement(options: ReturnBookOptions) {
    const { schoolId, loanId, returnDate = new Date(), waivedAmount = 0, waiverReason } = options;

    const loan = await prisma.bookLoan.findFirst({
      where: { id: loanId, schoolId },
      include: {
        book: true,
        fines: true
      }
    });

    if (!loan) {
      throw new Error('Book loan not found');
    }

    if (loan.status === 'returned') {
      throw new Error('Book loan is already returned');
    }

    const setting = await prisma.librarySetting.findUnique({
      where: { schoolId }
    });

    // Compute fine up to the return date
    const { daysOverdue, fineAmount, isOverdue } = this.calculateLoanFine(
      {
        ...loan,
        waivedFine: (loan.waivedFine || 0) + waivedAmount
      },
      setting,
      returnDate
    );

    // Calculate previously billed fines
    const previouslyBilled = (loan.fines || [])
      .filter(f => f.fineType === 'OVERDUE' && f.status !== 'WAIVED')
      .reduce((sum, f) => sum + f.amount, 0);

    const unbilledIncrement = Math.max(
      0,
      parseFloat((fineAmount - previouslyBilled).toFixed(2))
    );

    let finalInvoice: any = null;

    return await prisma.$transaction(async (tx) => {
      // 1. If unbilled fine remains on a student loan, invoice it
      if (isOverdue && unbilledIncrement >= 0.01 && loan.studentId) {
        const fineRecord = await tx.bookLoanFine.create({
          data: {
            schoolId,
            loanId: loan.id,
            studentId: loan.studentId,
            amount: unbilledIncrement,
            fineType: 'OVERDUE',
            reason: `Final overdue fine upon return (${daysOverdue} days overdue) for "${loan.book.title}"`,
            status: 'BILLED'
          }
        });

        const idempotencyKey = `libfine_ret_${loan.id}_${Date.now()}`;
        const invoiceResult = await BursarService.createStudentInvoice({
          schoolId,
          idempotencyKey,
          studentId: loan.studentId,
          sourceModule: 'library_fine',
          sourceId: fineRecord.id,
          dueDate: returnDate,
          tx,
          items: [
            {
              billingItemCode: 'LIB-FINE',
              description: `Final Library Overdue Fine upon return: "${loan.book.title}" (${daysOverdue} days overdue)`,
              quantity: 1,
              unitPrice: unbilledIncrement,
              totalAmount: unbilledIncrement,
              revenueAccountCode: '4065'
            }
          ]
        });

        finalInvoice = invoiceResult.invoice;

        await tx.bookLoanFine.update({
          where: { id: fineRecord.id },
          data: { invoiceId: finalInvoice.id }
        });
      }

      // 2. Update BookLoan record
      const updatedLoan = await tx.bookLoan.update({
        where: { id: loanId },
        data: {
          status: 'returned',
          returnedAt: returnDate,
          fineCalculated: fineAmount,
          waivedFine: (loan.waivedFine || 0) + waivedAmount,
          ...(finalInvoice ? { invoiceId: finalInvoice.id } : {})
        }
      });

      // 3. Restore Book copy availability
      const updatedBook = await tx.book.update({
        where: { id: loan.bookId },
        data: { available: { increment: 1 } }
      });

      // 4. Check & Advance waiting reservation for this book
      let reservationAdvanced: any = null;
      const pendingRes = await tx.bookReservation.findFirst({
        where: { bookId: loan.bookId, status: 'Approved' },
        orderBy: { requestDate: 'asc' }
      });

      if (pendingRes) {
        reservationAdvanced = await tx.bookReservation.update({
          where: { id: pendingRes.id },
          data: { status: 'Ready for Pickup', readyAt: new Date() }
        });
      }

      return {
        loan: updatedLoan,
        book: updatedBook,
        daysOverdue,
        fineAmount,
        waivedAmount,
        invoice: finalInvoice,
        reservationAdvanced
      };
    });
  }

  /**
   * Waive an overdue or damage fine.
   */
  static async waiveFine(options: WaiveFineOptions) {
    const { schoolId, loanId, fineId, amount, reason, authorizedById } = options;

    const loan = await prisma.bookLoan.findFirst({
      where: { id: loanId, schoolId }
    });

    if (!loan) {
      throw new Error('Book loan not found');
    }

    return await prisma.$transaction(async (tx) => {
      if (fineId) {
        const fine = await tx.bookLoanFine.findFirst({
          where: { id: fineId, schoolId, loanId }
        });
        if (fine) {
          const newWaived = (fine.waivedAmount || 0) + amount;
          const status = newWaived >= fine.amount ? 'WAIVED' : fine.status;
          await tx.bookLoanFine.update({
            where: { id: fineId },
            data: {
              waivedAmount: newWaived,
              status,
              reason: fine.reason ? `${fine.reason} | Waived: ${reason}` : `Waived: ${reason}`
            }
          });
        }
      }

      const updatedLoan = await tx.bookLoan.update({
        where: { id: loanId },
        data: {
          waivedFine: (loan.waivedFine || 0) + amount
        }
      });

      return {
        loan: updatedLoan,
        amountWaived: amount,
        reason,
        authorizedById
      };
    });
  }

  /**
   * Checks borrower eligibility:
   * 1. Evaluates active loans against max loans (studentMaxLoans vs staffMaxLoans)
   * 2. Evaluates outstanding unpaid library fines against blockThresholdFine
   */
  static async checkBorrowingEligibility(params: {
    schoolId: string;
    studentId?: string;
    userId?: string;
  }) {
    const { schoolId, studentId, userId } = params;

    const setting = await prisma.librarySetting.findUnique({
      where: { schoolId }
    });

    const isStudent = Boolean(studentId);
    const maxAllowedLoans = isStudent
      ? (setting?.studentMaxLoans ?? 3)
      : (setting?.staffMaxLoans ?? 5);
    const blockThreshold = setting?.blockThresholdFine ?? 10.0;

    // Check active loan count
    const activeLoansCount = await prisma.bookLoan.count({
      where: {
        schoolId,
        ...(studentId ? { studentId } : { userId }),
        status: { in: ['borrowed', 'overdue'] }
      }
    });

    const reasons: string[] = [];
    let totalUnpaidFines = 0;

    if (activeLoansCount >= maxAllowedLoans) {
      reasons.push(`Maximum active book loans (${maxAllowedLoans}) reached for this borrower.`);
    }

    // Check outstanding unpaid fines (if student)
    if (studentId) {
      const unpaidFines = await prisma.bookLoanFine.findMany({
        where: {
          schoolId,
          studentId,
          status: 'BILLED'
        }
      });

      totalUnpaidFines = unpaidFines.reduce(
        (sum, f) => sum + (f.amount - (f.waivedAmount || 0)),
        0
      );

      if (totalUnpaidFines >= blockThreshold) {
        reasons.push(
          `Borrowing blocked: Total unpaid library fines ($${totalUnpaidFines.toFixed(2)}) exceed the library threshold ($${blockThreshold.toFixed(2)}).`
        );
      }
    }

    if (reasons.length > 0) {
      return {
        eligible: false,
        activeLoansCount,
        maxAllowedLoans,
        totalUnpaidFines: parseFloat(totalUnpaidFines.toFixed(2)),
        blockThreshold,
        reason: reasons.join(' ')
      };
    }

    return {
      eligible: true,
      activeLoansCount,
      maxAllowedLoans
    };
  }

  /**
   * Borrow a book with borrower eligibility enforcement & stock decrement.
   */
  static async borrowBook(options: BorrowBookOptions) {
    const { schoolId, bookId, studentId, userId, loanType = 'LIBRARY', notes } = options;

    // 1. Eligibility Check
    const eligibility = await this.checkBorrowingEligibility({
      schoolId,
      studentId,
      userId
    });

    if (!eligibility.eligible) {
      throw new Error(eligibility.reason || 'Borrower is not eligible to borrow books');
    }

    // 2. Book Availability Check
    const book = await prisma.book.findFirst({
      where: { id: bookId, schoolId }
    });

    if (!book) {
      throw new Error('Book not found in library catalogue');
    }

    if (book.available <= 0) {
      throw new Error(`"${book.title}" is currently out of stock (0 copies available)`);
    }

    // 3. Resolve Due Date
    const setting = await prisma.librarySetting.findUnique({
      where: { schoolId }
    });
    const loanDays = setting?.defaultLoanPeriodDays ?? 14;
    const now = new Date();
    const dueDate = options.dueDate || new Date(now.getTime() + loanDays * 24 * 60 * 60 * 1000);

    return await prisma.$transaction(async (tx) => {
      const loan = await tx.bookLoan.create({
        data: {
          schoolId,
          bookId,
          studentId: studentId || null,
          userId: userId || null,
          borrowedAt: now,
          dueDate,
          loanType,
          status: 'borrowed',
          notes,
          fineCalculated: 0
        },
        include: {
          book: true
        }
      });

      await tx.book.update({
        where: { id: bookId },
        data: { available: { decrement: 1 } }
      });

      return loan;
    });
  }

  /**
   * Link a book/textbook to a Syllabus subject and curriculum (ZIMSEC, Cambridge, etc.)
   */
  static async linkBookToSyllabus(options: LinkBookSyllabusOptions) {
    const { schoolId, bookId, syllabusId, curriculum, level, topics = [] } = options;

    const book = await prisma.book.findFirst({
      where: { id: bookId, schoolId }
    });

    if (!book) {
      throw new Error('Book not found');
    }

    const syllabus = await prisma.syllabus.findFirst({
      where: { id: syllabusId, schoolId },
      include: { subject: true }
    });

    if (!syllabus) {
      throw new Error('Syllabus not found in school registry');
    }

    return await prisma.book.update({
      where: { id: bookId },
      data: {
        syllabusId,
        subjectId: syllabus.subjectId,
        curriculum: curriculum || syllabus.curriculum,
        level: level || syllabus.level || syllabus.form,
        topics: topics.length > 0 ? topics : book.topics
      },
      include: {
        subject: true,
        syllabus: true
      }
    });
  }

  /**
   * Unlink a book from its syllabus.
   */
  static async unlinkBookFromSyllabus(schoolId: string, bookId: string) {
    const book = await prisma.book.findFirst({
      where: { id: bookId, schoolId }
    });

    if (!book) {
      throw new Error('Book not found');
    }

    return await prisma.book.update({
      where: { id: bookId },
      data: {
        syllabusId: null
      },
      include: {
        subject: true
      }
    });
  }

  /**
   * Search and filter the library catalogue with Syllabus & Curriculum integration.
   */
  static async getCatalogueWithSyllabus(options: SearchCatalogueOptions) {
    const {
      schoolId,
      search,
      categoryId,
      subjectId,
      syllabusId,
      curriculum,
      level,
      availableOnly
    } = options;

    const where: Prisma.BookWhereInput = {
      schoolId,
      ...(categoryId ? { categoryId } : {}),
      ...(subjectId ? { subjectId } : {}),
      ...(syllabusId ? { syllabusId } : {}),
      ...(curriculum ? { curriculum: { equals: curriculum, mode: 'insensitive' } } : {}),
      ...(level ? { level: { equals: level, mode: 'insensitive' } } : {}),
      ...(availableOnly ? { available: { gt: 0 } } : {})
    };

    if (search && search.trim()) {
      const q = search.trim();
      where.OR = [
        { title: { contains: q, mode: 'insensitive' } },
        { author: { contains: q, mode: 'insensitive' } },
        { isbn: { contains: q, mode: 'insensitive' } },
        { accessionNumber: { contains: q, mode: 'insensitive' } },
        { barcode: { contains: q, mode: 'insensitive' } },
        { topics: { has: q } }
      ];
    }

    return await prisma.book.findMany({
      where,
      include: {
        category: true,
        subject: true,
        syllabus: {
          select: {
            id: true,
            curriculum: true,
            form: true,
            level: true,
            year: true
          }
        }
      },
      orderBy: { title: 'asc' }
    });
  }

  /**
   * Retrieve all syllabus resources: textbooks, reference books, and digital resources
   * linked to a specific syllabus.
   */
  static async getSyllabusResources(schoolId: string, syllabusId: string) {
    const syllabus = await prisma.syllabus.findFirst({
      where: { id: syllabusId, schoolId },
      include: {
        subject: true,
        topics: { orderBy: { term: 'asc' } },
        books: {
          include: { category: true }
        },
        digitalResources: {
          include: { category: true }
        }
      }
    });

    if (!syllabus) {
      throw new Error('Syllabus not found');
    }

    return {
      syllabus: {
        id: syllabus.id,
        curriculum: syllabus.curriculum,
        subjectName: syllabus.subject.name,
        subjectCode: syllabus.subject.code,
        form: syllabus.form,
        level: syllabus.level,
        year: syllabus.year,
        topicsCount: syllabus.topics.length
      },
      topics: syllabus.topics,
      books: syllabus.books,
      digitalResources: syllabus.digitalResources
    };
  }
}
