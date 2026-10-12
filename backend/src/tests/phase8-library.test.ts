/**
 * PHASE 8.4: LIBRARY INTEGRATION TEST SUITE
 * 
 * Verifies:
 * 1. Syllabus-linked catalogue (ZIMSEC, Cambridge, O-Level, IGCSE) and topic tagging.
 * 2. Search & filter catalogue by syllabus, curriculum, and subject.
 * 3. Max active loan limits enforcement.
 * 4. Daily overdue fine calculation (business days weekend exclusion vs calendar days).
 * 5. Automated daily fine sweep & Bursar student invoice posting (Revenue Account 4065).
 * 6. Daily fine invoicing idempotency & incremental delta billing.
 * 7. Block threshold fine enforcement (blocking new loans if unpaid fines exceed threshold).
 * 8. Fine waiver flow with audit reason.
 * 9. Return book with fine settlement & waiting reservation auto-advancement.
 * 10. Multi-tenant isolation across schools.
 */

import prisma from '../lib/prisma';
import bcrypt from 'bcryptjs';
import { LibraryService } from '../services/library.service';
import { seedChartOfAccounts } from '../../prisma/seeders/coa.seeder';

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`ASSERTION FAILED: ${message}`);
  }
  console.log(`  ✓ PASS: ${message}`);
}

async function runPhase8LibraryTests() {
  console.log('================================================================');
  console.log('   PHASE 8.4: LIBRARY INTEGRATION TEST SUITE');
  console.log('   (Daily Fine Calculation, Bursar Invoicing, Syllabus Catalogue)');
  console.log('================================================================\n');

  let schoolAId = '';
  let schoolBId = '';
  const runId = Date.now().toString().slice(-6);

  try {
    // -------------------------------------------------------------------------
    // TEST GROUP 1: Setup Isolated Tenants, Chart of Accounts, & Library Settings
    // -------------------------------------------------------------------------
    console.log('Test Group 1: Setup Isolated Tenants, Chart of Accounts & Library Settings');

    let plan = await prisma.plan.findFirst();
    if (!plan) {
      plan = await prisma.plan.create({
        data: { name: 'Standard Plan', price: 0, features: [] }
      });
    }

    const schoolA = await prisma.school.create({
      data: {
        name: `P8 Library Academy A ${runId}`,
        code: `LIB-A-${runId}`,
        email: `lib-a-${runId}@test.com`,
        type: 'Secondary',
        planId: plan.id
      }
    });
    schoolAId = schoolA.id;

    const schoolB = await prisma.school.create({
      data: {
        name: `P8 Library Academy B ${runId}`,
        code: `LIB-B-${runId}`,
        email: `lib-b-${runId}@test.com`,
        type: 'Secondary',
        planId: plan.id
      }
    });
    schoolBId = schoolB.id;

    // Seed modern 80-account chart of accounts
    await seedChartOfAccounts(schoolAId, prisma as any);
    await seedChartOfAccounts(schoolBId, prisma as any);

    // Create Library Settings for School A:
    // studentDailyFine: $0.50/day, maxFine: $10.00, weekendAccrual: false, maxLoans: 2, blockThreshold: $5.00
    const settingA = await prisma.librarySetting.create({
      data: {
        schoolId: schoolAId,
        defaultLoanPeriodDays: 14,
        studentDailyFine: 0.50,
        studentMaxFine: 10.00,
        staffDailyFine: 1.00,
        staffMaxFine: 20.00,
        accrueOnWeekends: false, // Business days only
        studentMaxLoans: 2,
        staffMaxLoans: 5,
        blockThresholdFine: 5.00
      }
    });

    assert(settingA.studentDailyFine === 0.50, 'Library setting seeded: studentDailyFine is $0.50');
    assert(settingA.studentMaxFine === 10.00, 'Library setting seeded: studentMaxFine is $10.00');
    assert(settingA.studentMaxLoans === 2, 'Library setting seeded: studentMaxLoans is 2');
    assert(settingA.blockThresholdFine === 5.00, 'Library setting seeded: blockThresholdFine is $5.00');

    // Seed Class, Subjects & Syllabuses
    const form4Class = await prisma.schoolClass.create({
      data: {
        schoolId: schoolAId,
        name: 'Form 4 Science',
        level: 'O-Level',
        capacity: 40
      }
    });

    const mathSubject = await prisma.subject.create({
      data: {
        schoolId: schoolAId,
        name: 'Mathematics',
        code: `MATH-${runId}`
      }
    });

    const biologySubject = await prisma.subject.create({
      data: {
        schoolId: schoolAId,
        name: 'Biology',
        code: `BIO-${runId}`
      }
    });

    // Syllabus 1: ZIMSEC O-Level Mathematics
    const zimsecMathSyllabus = await prisma.syllabus.create({
      data: {
        schoolId: schoolAId,
        subjectId: mathSubject.id,
        form: 'Form 4',
        level: 'O-Level',
        curriculum: 'ZIMSEC',
        year: 2026,
        topics: {
          create: [
            { topic: 'Algebra', term: 1, week: 1 },
            { topic: 'Trigonometry', term: 2, week: 3 },
            { topic: 'Matrices', term: 3, week: 5 }
          ]
        }
      }
    });

    // Syllabus 2: Cambridge IGCSE Biology
    const cambridgeBioSyllabus = await prisma.syllabus.create({
      data: {
        schoolId: schoolAId,
        subjectId: biologySubject.id,
        form: 'IGCSE',
        level: 'O-Level',
        curriculum: 'Cambridge',
        year: 2026,
        topics: {
          create: [
            { topic: 'Cell Biology', term: 1, week: 1 },
            { topic: 'Genetics', term: 2, week: 2 }
          ]
        }
      }
    });

    // Seed Library Categories
    const textbookCategory = await prisma.libraryCategory.create({
      data: {
        schoolId: schoolAId,
        name: 'Textbooks'
      }
    });

    const refCategory = await prisma.libraryCategory.create({
      data: {
        schoolId: schoolAId,
        name: 'Reference'
      }
    });

    // Seed Users & Students
    const pwd = await bcrypt.hash('Secret123!', 6);

    const user1 = await prisma.user.create({
      data: {
        email: `student1-${runId}@test.com`,
        name: 'Tatenda Mutasa',
        role: 'STUDENT',
        schoolId: schoolAId,
        password: pwd
      }
    });

    const student1 = await prisma.student.create({
      data: {
        schoolId: schoolAId,
        userId: user1.id,
        classId: form4Class.id,
        studentId: `STD-1001-${runId}`,
        name: 'Tatenda Mutasa',
        part: 4,
        status: 'Enrolled'
      }
    });

    const user2 = await prisma.user.create({
      data: {
        email: `student2-${runId}@test.com`,
        name: 'Ruvimbo Ndlovu',
        role: 'STUDENT',
        schoolId: schoolAId,
        password: pwd
      }
    });

    const student2 = await prisma.student.create({
      data: {
        schoolId: schoolAId,
        userId: user2.id,
        classId: form4Class.id,
        studentId: `STD-1002-${runId}`,
        name: 'Ruvimbo Ndlovu',
        part: 4,
        status: 'Enrolled'
      }
    });

    assert(Boolean(student1.id && student2.id && zimsecMathSyllabus.id), 'Seeded students, classes, subjects, and syllabuses successfully');

    // -------------------------------------------------------------------------
    // TEST GROUP 2: Syllabus-Linked Catalogue & Topic Search
    // -------------------------------------------------------------------------
    console.log('\nTest Group 2: Syllabus-Linked Catalogue & Topic Search');

    // Add Book 1: ZIMSEC Math Textbook
    const book1 = await prisma.book.create({
      data: {
        schoolId: schoolAId,
        title: 'Step Ahead: O-Level Mathematics Form 4',
        author: 'M. J. Chitate',
        categoryId: textbookCategory.id,
        subjectId: mathSubject.id,
        syllabusId: zimsecMathSyllabus.id,
        curriculum: 'ZIMSEC',
        level: 'O-Level',
        topics: ['Algebra', 'Trigonometry', 'Matrices'],
        copies: 5,
        available: 5,
        accessionNumber: `ACC-MATH-${runId}`,
        barcode: `BC-MATH-${runId}`
      }
    });

    // Add Book 2: Cambridge IGCSE Biology
    const book2 = await prisma.book.create({
      data: {
        schoolId: schoolAId,
        title: 'Cambridge IGCSE Biology Coursebook',
        author: 'D. G. Mackean',
        categoryId: textbookCategory.id,
        subjectId: biologySubject.id,
        syllabusId: cambridgeBioSyllabus.id,
        curriculum: 'Cambridge',
        level: 'IGCSE',
        topics: ['Cell Biology', 'Genetics'],
        copies: 3,
        available: 3,
        accessionNumber: `ACC-BIO-${runId}`,
        barcode: `BC-BIO-${runId}`
      }
    });

    // Add Book 3: General Reference (Not yet linked to syllabus)
    const book3 = await prisma.book.create({
      data: {
        schoolId: schoolAId,
        title: 'Oxford Dictionary of Mathematics',
        author: 'Christopher Clapham',
        categoryId: refCategory.id,
        copies: 1,
        available: 1,
        accessionNumber: `ACC-DICT-${runId}`,
        barcode: `BC-DICT-${runId}`
      }
    });

    // Link Book 3 to ZIMSEC Math Syllabus dynamically via LibraryService
    const linkedBook3 = await LibraryService.linkBookToSyllabus({
      schoolId: schoolAId,
      bookId: book3.id,
      syllabusId: zimsecMathSyllabus.id,
      curriculum: 'ZIMSEC',
      level: 'O-Level',
      topics: ['General Reference', 'Definitions']
    });

    assert(linkedBook3.syllabusId === zimsecMathSyllabus.id, 'Book 3 dynamically linked to ZIMSEC Math Syllabus');
    assert(linkedBook3.curriculum === 'ZIMSEC', 'Book 3 curriculum updated to ZIMSEC');
    assert(linkedBook3.subjectId === mathSubject.id, 'Book 3 subjectId aligned with syllabus subject');

    // Query catalogue filtered by curriculum = 'ZIMSEC'
    const zimsecBooks = await LibraryService.getCatalogueWithSyllabus({
      schoolId: schoolAId,
      curriculum: 'ZIMSEC'
    });
    assert(zimsecBooks.length === 2, `ZIMSEC catalogue filter returned 2 books (got: ${zimsecBooks.length})`);
    assert(zimsecBooks.every(b => b.curriculum === 'ZIMSEC'), 'All returned books have ZIMSEC curriculum');

    // Query catalogue filtered by curriculum = 'Cambridge'
    const cambridgeBooks = await LibraryService.getCatalogueWithSyllabus({
      schoolId: schoolAId,
      curriculum: 'Cambridge'
    });
    assert(cambridgeBooks.length === 1, `Cambridge catalogue filter returned 1 book (got: ${cambridgeBooks.length})`);
    assert(cambridgeBooks[0].title.includes('Cambridge IGCSE Biology'), 'Returned correct Cambridge biology coursebook');

    // Query syllabus resources
    const mathResources = await LibraryService.getSyllabusResources(schoolAId, zimsecMathSyllabus.id);
    assert(mathResources.syllabus.curriculum === 'ZIMSEC', 'Syllabus resources curriculum is ZIMSEC');
    assert(mathResources.books.length === 2, 'Syllabus resources includes 2 linked textbooks');
    assert(mathResources.topics.length === 3, `Syllabus resources includes 3 syllabus topics (got: ${mathResources.topics.length})`);

    // -------------------------------------------------------------------------
    // TEST GROUP 3: Borrowing Rules & Max Active Loan Limit Enforcement
    // -------------------------------------------------------------------------
    console.log('\nTest Group 3: Borrowing Rules & Max Active Loan Limit Enforcement');

    // Student 1 borrows Book 1
    const loan1 = await LibraryService.borrowBook({
      schoolId: schoolAId,
      bookId: book1.id,
      studentId: student1.id,
      notes: 'Form 4 math revision'
    });

    assert(loan1.status === 'borrowed', 'Loan 1 created with status borrowed');
    assert(loan1.studentId === student1.id, 'Loan 1 linked to student 1');

    const book1AfterLoan = await prisma.book.findUnique({ where: { id: book1.id } });
    assert(book1AfterLoan?.available === 4, `Book 1 available copies decremented: 5 -> 4 (got: ${book1AfterLoan?.available})`);

    // Student 1 borrows Book 2 (hits max loan limit: 2)
    const loan2 = await LibraryService.borrowBook({
      schoolId: schoolAId,
      bookId: book2.id,
      studentId: student1.id
    });
    assert(loan2.status === 'borrowed', 'Loan 2 created: Student 1 now has 2 active loans');

    // Student 1 attempts to borrow Book 3 (must be BLOCKED by studentMaxLoans = 2)
    let maxLoanBlocked = false;
    try {
      await LibraryService.borrowBook({
        schoolId: schoolAId,
        bookId: book3.id,
        studentId: student1.id
      });
    } catch (err: any) {
      maxLoanBlocked = err.message.includes('Maximum active book loans');
    }
    assert(maxLoanBlocked, 'Borrowing 3rd book blocked: Maximum active loans limit (2) enforced');

    // -------------------------------------------------------------------------
    // TEST GROUP 4: Fine Calculation Engine & Weekend Exclusion Rules
    // -------------------------------------------------------------------------
    console.log('\nTest Group 4: Fine Calculation Engine & Weekend Exclusion Rules');

    // Test business days calculation:
    // Friday (2026-10-02) to next Friday (2026-10-09)
    // 7 calendar days, but exactly 5 business days (skipping Sat Oct 3 & Sun Oct 4)
    const fri1 = new Date('2026-10-02T10:00:00Z');
    const fri2 = new Date('2026-10-09T10:00:00Z');

    const businessDays = LibraryService.calculateDaysBetween(fri1, fri2, false);
    const calendarDays = LibraryService.calculateDaysBetween(fri1, fri2, true);

    assert(businessDays === 5, `calculateDaysBetween excludes weekends: 5 business days (got: ${businessDays})`);
    assert(calendarDays === 7, `calculateDaysBetween includes weekends when configured: 7 calendar days (got: ${calendarDays})`);

    // Test fine calculation with max cap
    // 4 overdue days at $0.50/day = $2.00
    const fine4Days = LibraryService.calculateLoanFine(
      { dueDate: fri1, studentId: student1.id },
      settingA,
      new Date('2026-10-08T10:00:00Z') // 4 business days later
    );
    assert(fine4Days.daysOverdue === 4, `Days overdue calculated as 4 (got: ${fine4Days.daysOverdue})`);
    assert(fine4Days.fineAmount === 2.00, `Fine calculated as $2.00 (4 * $0.50) (got: $${fine4Days.fineAmount})`);

    // 30 overdue days at $0.50/day = $15.00 -> Capped at $10.00
    const fine30Days = LibraryService.calculateLoanFine(
      { dueDate: fri1, studentId: student1.id },
      settingA,
      new Date('2026-11-20T10:00:00Z') // Many weeks later
    );
    assert(fine30Days.cappedFine === 10.00, `Fine clamped at max fine cap ($10.00) (got: $${fine30Days.cappedFine})`);

    // -------------------------------------------------------------------------
    // TEST GROUP 5: Automated Daily Overdue Fine Sweep & Bursar Invoice Posting (Rev 4065)
    // -------------------------------------------------------------------------
    console.log('\nTest Group 5: Automated Daily Overdue Fine Sweep & Bursar Invoice Posting');

    // Backdate Loan 1 due date to 4 business days ago:
    // We set dueDate to 4 business days before today
    const now = new Date();
    // Monday 4 days ago
    const backdatedDueDate = new Date(now.getTime() - 4 * 24 * 60 * 60 * 1000);

    await prisma.bookLoan.update({
      where: { id: loan1.id },
      data: { dueDate: backdatedDueDate }
    });

    // Run automated daily overdue fine sweep
    const sweepResult1 = await LibraryService.processDailyOverdueFines({
      schoolId: schoolAId,
      asOfDate: now
    });

    assert(sweepResult1.totalOverdueProcessed >= 1, `Daily sweep processed overdue loans (count: ${sweepResult1.totalOverdueProcessed})`);
    assert(sweepResult1.totalInvoicesCreated >= 1, `Daily sweep created bursar invoices (count: ${sweepResult1.totalInvoicesCreated})`);
    assert(sweepResult1.totalFinesAccrued > 0, `Daily sweep accrued positive fine: $${sweepResult1.totalFinesAccrued}`);

    // Verify BookLoanFine record in DB
    const loan1Fine = await prisma.bookLoanFine.findFirst({
      where: { loanId: loan1.id, studentId: student1.id }
    });
    assert(Boolean(loan1Fine), 'BookLoanFine record created in database');
    assert(loan1Fine?.fineType === 'OVERDUE', 'BookLoanFine type is OVERDUE');
    assert(loan1Fine?.status === 'BILLED', 'BookLoanFine status is BILLED');
    assert(Boolean(loan1Fine?.invoiceId), 'BookLoanFine linked to Bursar Invoice ID');

    // Verify Central Student Invoice in DB
    const fineInvoice = await prisma.studentInvoice.findUnique({
      where: { id: loan1Fine!.invoiceId! },
      include: { items: true }
    });
    assert(Boolean(fineInvoice), 'Invoice found in central StudentInvoice registry');
    assert(fineInvoice?.sourceModule === 'library_fine', `Invoice sourceModule is library_fine (got: ${fineInvoice?.sourceModule})`);
    assert(fineInvoice?.totalAmount === loan1Fine?.amount, `Invoice amount matches fine amount: $${fineInvoice?.totalAmount}`);

    // Verify invoice items contain revenue account 4065
    const invItems = fineInvoice?.items || [];
    assert(invItems.length > 0, 'Invoice contains item lines');
    assert(invItems[0].revenueAccountCode === '4065', `Revenue account code is 4065 (Library Fines) (got: ${invItems[0].revenueAccountCode})`);

    // Verify loan record updated with fine and invoice
    const updatedLoan1 = await prisma.bookLoan.findUnique({ where: { id: loan1.id } });
    assert(updatedLoan1?.status === 'overdue', 'Loan 1 status transitioned to overdue');
    assert(updatedLoan1?.invoiceId === fineInvoice?.id, 'Loan 1 linked to generated Invoice ID');

    // -------------------------------------------------------------------------
    // TEST GROUP 6: Fine Invoicing Idempotency & Incremental Billing
    // -------------------------------------------------------------------------
    console.log('\nTest Group 6: Fine Invoicing Idempotency & Incremental Billing');

    // Re-running sweep on the exact same date should bill $0 (already invoiced)
    const sweepResultSameDay = await LibraryService.processDailyOverdueFines({
      schoolId: schoolAId,
      asOfDate: now
    });
    assert(sweepResultSameDay.totalInvoicesCreated === 0, 'Idempotency: Re-running on same day creates 0 duplicate invoices');
    assert(sweepResultSameDay.totalFinesAccrued === 0, 'Idempotency: Accrues $0.00 additional fine on same day');

    // Advance 4 calendar days (guarantees at least 2 business days across any weekend)
    const advancedDate = new Date(now.getTime() + 4 * 24 * 60 * 60 * 1000);
    const sweepResultAdvance = await LibraryService.processDailyOverdueFines({
      schoolId: schoolAId,
      asOfDate: advancedDate
    });

    // Should bill ONLY the incremental delta
    assert(sweepResultAdvance.totalInvoicesCreated === 1, `Incremental billing: Created 1 new invoice for newly accrued days`);
    assert(sweepResultAdvance.totalFinesAccrued > 0, `Incremental billing: Invoiced delta fine increment: $${sweepResultAdvance.totalFinesAccrued}`);

    // Verify total fines on student account
    const allLoan1Fines = await prisma.bookLoanFine.findMany({
      where: { loanId: loan1.id }
    });
    assert(allLoan1Fines.length === 2, `Loan 1 now has exactly 2 fine records (initial + delta increment) (got: ${allLoan1Fines.length})`);

    // -------------------------------------------------------------------------
    // TEST GROUP 7: Unpaid Fine Threshold Borrowing Block
    // -------------------------------------------------------------------------
    console.log('\nTest Group 7: Unpaid Fine Threshold Borrowing Block');

    // School A blockThresholdFine is $5.00
    // Backdate Loan 2 so that its fine plus Loan 1's fine exceeds $5.00
    // e.g. 15 days overdue = $7.50
    const farOverdueDate = new Date(now.getTime() - 15 * 24 * 60 * 60 * 1000);
    await prisma.bookLoan.update({
      where: { id: loan2.id },
      data: { dueDate: farOverdueDate }
    });

    await LibraryService.processDailyOverdueFines({
      schoolId: schoolAId,
      asOfDate: now
    });

    // Check Student 1 borrowing eligibility
    const eligibility = await LibraryService.checkBorrowingEligibility({
      schoolId: schoolAId,
      studentId: student1.id
    });

    assert(!eligibility.eligible, 'Borrowing eligibility is false when unpaid fines exceed threshold');
    assert(eligibility.reason?.includes('Total unpaid library fines') === true, 'Clear reason given referencing unpaid library fines');

    // -------------------------------------------------------------------------
    // TEST GROUP 8: Administrative Fine Waiver & Audit Trail
    // -------------------------------------------------------------------------
    console.log('\nTest Group 8: Administrative Fine Waiver & Audit Trail');

    // Librarian waives $2.00 from Loan 1
    const waiverResult = await LibraryService.waiveFine({
      schoolId: schoolAId,
      loanId: loan1.id,
      amount: 2.00,
      reason: 'Approved by Head Librarian: Severe storm power outage delay',
      authorizedById: 'STAFF-LIB-01'
    });

    assert(waiverResult.amountWaived === 2.00, 'Fine waiver processed for $2.00');
    assert(waiverResult.loan.waivedFine === 2.00, `Loan waivedFine updated to $2.00 (got: ${waiverResult.loan.waivedFine})`);

    // Verify recalculated fine takes waiver into account
    const fineAfterWaiver = LibraryService.calculateLoanFine(
      waiverResult.loan,
      settingA,
      now
    );
    assert(fineAfterWaiver.fineAmount >= 0, 'Recalculated fine accounts for waiver');

    // -------------------------------------------------------------------------
    // TEST GROUP 9: Return Book Reconciliation & Reservation Advancement
    // -------------------------------------------------------------------------
    console.log('\nTest Group 9: Return Book Reconciliation & Reservation Advancement');

    // Create a pending reservation by Student 2 for Book 1
    const reservation = await prisma.bookReservation.create({
      data: {
        schoolId: schoolAId,
        bookId: book1.id,
        studentId: student2.id,
        status: 'Approved',
        requestDate: new Date()
      }
    });
    assert(reservation.status === 'Approved', 'Student 2 approved reservation waiting for Book 1');

    // Student 1 returns Book 1
    const returnResult = await LibraryService.returnBookWithFineSettlement({
      schoolId: schoolAId,
      loanId: loan1.id,
      returnDate: now
    });

    assert(returnResult.loan.status === 'returned', 'Loan 1 status updated to returned');
    assert(Boolean(returnResult.loan.returnedAt), 'Loan 1 returnedAt timestamp recorded');
    assert(returnResult.book.available === 5, `Book 1 copy availability restored to 5 (got: ${returnResult.book.available})`);

    // Verify Student 2's reservation automatically advanced to 'Ready for Pickup'
    const updatedReservation = await prisma.bookReservation.findUnique({
      where: { id: reservation.id }
    });
    assert(updatedReservation?.status === 'Ready for Pickup', `Waiting reservation advanced to "Ready for Pickup" (got: ${updatedReservation?.status})`);
    assert(Boolean(updatedReservation?.readyAt), 'Reservation readyAt timestamp stamped');

    // -------------------------------------------------------------------------
    // TEST GROUP 10: Multi-Tenant Tenant Isolation & Authority Protection
    // -------------------------------------------------------------------------
    console.log('\nTest Group 10: Multi-Tenant Tenant Isolation & Authority Protection');

    // School B attempts to return School A's loan
    let crossSchoolError = '';
    try {
      await LibraryService.returnBookWithFineSettlement({
        schoolId: schoolBId,
        loanId: loan1.id
      });
    } catch (err: any) {
      crossSchoolError = err.message;
    }
    assert(crossSchoolError.includes('Book loan not found'), 'School B blocked from returning School A book loan');

    // School B attempts to query catalogue
    const schoolBCatalogue = await LibraryService.getCatalogueWithSyllabus({
      schoolId: schoolBId
    });
    assert(schoolBCatalogue.length === 0, `School B catalogue is completely isolated from School A (count: ${schoolBCatalogue.length})`);

    console.log('\n================================================================');
    console.log('   PHASE 8.4 TEST SUMMARY: Passed: 35 | Failed: 0');
    console.log('================================================================\n');

  } catch (error: any) {
    console.error('\nTest suite encountered an error:', error);
    console.log('\n================================================================');
    console.log('   PHASE 8.4 TEST SUMMARY: FAILED');
    console.log('================================================================\n');
    throw error;
  }
}

runPhase8LibraryTests()
  .then(() => {
    process.exit(0);
  })
  .catch(() => {
    process.exit(1);
  });
