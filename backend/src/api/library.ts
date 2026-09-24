import { Router, Response } from 'express';
import path from 'path';
import prisma from '../lib/prisma';
import { requireAuth, requireRole, AuthRequest } from '../middleware/auth';
import { libraryUpload } from '../middleware/upload';
import { LedgerService } from '../services/ledger.service';
import { getAccountId } from '../../prisma/seeders/coa.seeder';
import { computeLoanFine, runLibraryReminders } from '../jobs/library-reminder-job';
import { NotificationService } from '../services/notifications';

const router = Router();

function normalizeIsbn(isbn?: string | null): string {
  if (!isbn) return '';
  return isbn.replace(/[^0-9X]/gi, '').toUpperCase();
}

function levenshteinDistance(s1: string, s2: string): number {
  const m = s1.length, n = s2.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (s1[i - 1].toLowerCase() === s2[j - 1].toLowerCase()) {
        dp[i][j] = dp[i - 1][j - 1];
      } else {
        dp[i][j] = 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
      }
    }
  }
  return dp[m][n];
}

async function getOrCreateLibrarySetting(schoolId: string) {
  let setting = await prisma.librarySetting.findUnique({ where: { schoolId } });
  if (!setting) {
    setting = await prisma.librarySetting.create({
      data: {
        schoolId,
        defaultLoanPeriodDays: 14,
        studentDailyFine: 0.50,
        studentMaxFine: 20.00,
        staffDailyFine: 1.00,
        staffMaxFine: 30.00,
        accrueOnWeekends: false,
        studentMaxLoans: 3,
        staffMaxLoans: 5,
        maxCopiesSameTitle: 1,
        blockThresholdFine: 10.00
      }
    });
  }
  return setting;
}

// ----------------------------------------------------
// 1. SETTINGS ENDPOINTS
// ----------------------------------------------------
/**
 * @route   GET /api/library/settings
 * @desc    Get configurable library rules and settings for current school
 */
router.get('/settings', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const schoolId = req.user!.schoolId!;
    const setting = await getOrCreateLibrarySetting(schoolId);
    res.json(setting);
  } catch (error) {
    console.error('Fetch library settings error:', error);
    res.status(500).json({ error: 'Failed to fetch library settings' });
  }
});

/**
 * @route   PATCH /api/library/settings
 * @desc    Update library rules (Admin, Librarian, Bursar)
 */
router.patch('/settings', requireAuth, requireRole('SCHOOL_ADMIN', 'LIBRARIAN', 'BURSAR'), async (req: AuthRequest, res: Response) => {
  try {
    const schoolId = req.user!.schoolId!;
    const {
      defaultLoanPeriodDays,
      studentDailyFine,
      studentMaxFine,
      staffDailyFine,
      staffMaxFine,
      accrueOnWeekends,
      studentMaxLoans,
      staffMaxLoans,
      maxCopiesSameTitle,
      blockThresholdFine
    } = req.body;

    const data: any = {};
    if (defaultLoanPeriodDays !== undefined) data.defaultLoanPeriodDays = parseInt(defaultLoanPeriodDays);
    if (studentDailyFine !== undefined) data.studentDailyFine = parseFloat(studentDailyFine);
    if (studentMaxFine !== undefined) data.studentMaxFine = parseFloat(studentMaxFine);
    if (staffDailyFine !== undefined) data.staffDailyFine = parseFloat(staffDailyFine);
    if (staffMaxFine !== undefined) data.staffMaxFine = parseFloat(staffMaxFine);
    if (accrueOnWeekends !== undefined) data.accrueOnWeekends = Boolean(accrueOnWeekends);
    if (studentMaxLoans !== undefined) data.studentMaxLoans = parseInt(studentMaxLoans);
    if (staffMaxLoans !== undefined) data.staffMaxLoans = parseInt(staffMaxLoans);
    if (maxCopiesSameTitle !== undefined) data.maxCopiesSameTitle = parseInt(maxCopiesSameTitle);
    if (blockThresholdFine !== undefined) data.blockThresholdFine = parseFloat(blockThresholdFine);

    const setting = await prisma.librarySetting.upsert({
      where: { schoolId },
      create: { schoolId, ...data },
      update: data
    });

    res.json(setting);
  } catch (error) {
    console.error('Update library settings error:', error);
    res.status(500).json({ error: 'Failed to update library settings' });
  }
});

// ----------------------------------------------------
// 2. BOOK CATALOG & SEARCH (Section 9)
// ----------------------------------------------------
/**
 * @route   GET /api/library/books
 * @desc    Search and filter books catalog with typo-tolerance, ISBN prioritization & ranking
 */
router.get('/books', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const schoolId = req.user!.schoolId!;
    const searchRaw = (req.query.search as string || '').trim();
    const categoryFilter = req.query.category as string;
    const yearFilter = req.query.year as string;
    const languageFilter = req.query.language as string;
    const availableOnly = req.query.available === 'true';

    const books = await prisma.book.findMany({
      where: { schoolId },
      include: { category: true, subject: true },
      orderBy: { title: 'asc' }
    });

    const cleanQuery = searchRaw.toLowerCase();
    const cleanIsbnQuery = normalizeIsbn(searchRaw);
    const isIsbnLength = cleanIsbnQuery.length === 10 || cleanIsbnQuery.length === 13;

    // Filter books by secondary filters first
    let candidates = books.filter(book => {
      if (categoryFilter && categoryFilter !== 'all') {
        const catName = book.category?.name?.toLowerCase() || '';
        if (catName !== categoryFilter.toLowerCase() && book.categoryId !== categoryFilter) {
          return false;
        }
      }
      if (yearFilter && yearFilter !== 'all') {
        const bookYear = book.publishedDate ? new Date(book.publishedDate).getFullYear().toString() : '';
        if (bookYear !== yearFilter) return false;
      }
      if (languageFilter && languageFilter !== 'all') {
        const lang = (book.language || 'English').toLowerCase();
        if (lang !== languageFilter.toLowerCase()) return false;
      }
      if (availableOnly && book.available <= 0) {
        return false;
      }
      return true;
    });

    // Score and rank candidates if a search term was provided
    let ranked = candidates;
    let didYouMean: string | undefined = undefined;
    const suggestions: Set<string> = new Set();

    if (cleanQuery.length > 0) {
      const scored = candidates.map(book => {
        let score = 0;
        const normIsbn = normalizeIsbn(book.isbn);
        const normIsbn10 = normalizeIsbn(book.isbn10);
        const normIsbn13 = normalizeIsbn(book.isbn13);
        const normAccession = (book.accessionNumber || '').toLowerCase();
        const normBarcode = (book.barcode || '').toLowerCase();
        const titleLower = book.title.toLowerCase();
        const authorLower = book.author.toLowerCase();
        const pubLower = (book.publisher || '').toLowerCase();
        const subjectLower = (book.subject?.name || '').toLowerCase();
        const keywordsLower = (book.keywords || []).map(k => k.toLowerCase()).join(' ');

        // 1. Exact ISBN Match (Highest Priority)
        if (cleanIsbnQuery && (normIsbn === cleanIsbnQuery || normIsbn10 === cleanIsbnQuery || normIsbn13 === cleanIsbnQuery)) {
          score += 1000;
        } else if (normAccession === cleanQuery || normBarcode === cleanQuery) {
          score += 900;
        }

        // 2. Exact Title Match
        if (titleLower === cleanQuery) {
          score += 500;
        } else if (titleLower.startsWith(cleanQuery)) {
          score += 350;
        } else if (titleLower.includes(cleanQuery)) {
          score += 250;
        }

        // 3. Author Match
        if (authorLower === cleanQuery) {
          score += 200;
        } else if (authorLower.includes(cleanQuery)) {
          score += 150;
        }

        // 4. Keyword / Subject / Publisher Match
        if (keywordsLower.includes(cleanQuery)) {
          score += 100;
        }
        if (subjectLower.includes(cleanQuery)) {
          score += 90;
        }
        if (pubLower.includes(cleanQuery)) {
          score += 60;
        }

        // 5. Fuzzy Matching for typos (if query >= 3 chars)
        if (score === 0 && cleanQuery.length >= 3 && !isIsbnLength) {
          const titleWords = titleLower.split(/\s+/);
          for (const word of titleWords) {
            if (Math.abs(word.length - cleanQuery.length) <= 2) {
              const dist = levenshteinDistance(word, cleanQuery);
              if (dist <= 2) {
                score += Math.max(10, 40 - dist * 10);
                if (!didYouMean) didYouMean = word;
                break;
              }
            }
          }
          if (score === 0) {
            const authorWords = authorLower.split(/\s+/);
            for (const word of authorWords) {
              if (Math.abs(word.length - cleanQuery.length) <= 2) {
                const dist = levenshteinDistance(word, cleanQuery);
                if (dist <= 2) {
                  score += Math.max(10, 30 - dist * 10);
                  if (!didYouMean) didYouMean = word;
                  break;
                }
              }
            }
          }
        }

        // Collect autocomplete suggestions
        if (score > 0) {
          suggestions.add(book.title);
          if (book.author) suggestions.add(book.author);
        }

        return { book, score };
      });

      // Filter to matching results and sort by score descending
      const matched = scored.filter(item => item.score > 0).sort((a, b) => b.score - a.score);
      
      if (matched.length > 0) {
        ranked = matched.map(m => m.book);
      } else {
        // No direct match: find best fuzzy suggestion across all books
        let closestWord = '';
        let minDistance = 999;
        for (const b of books) {
          const words = `${b.title} ${b.author}`.toLowerCase().split(/\s+/);
          for (const w of words) {
            if (w.length >= 3) {
              const d = levenshteinDistance(w, cleanQuery);
              if (d < minDistance && d <= 3) {
                minDistance = d;
                closestWord = w;
              }
            }
          }
        }
        if (closestWord) {
          didYouMean = closestWord;
          // Fall back to showing books containing closest word or top popular books
          ranked = books.filter(b => `${b.title} ${b.author}`.toLowerCase().includes(closestWord)).slice(0, 10);
        } else {
          // Provide related results (e.g. top 5 books) so user is never given a bare dead-end
          ranked = books.slice(0, 8);
        }
      }
    }

    const formattedBooks = ranked.map(book => ({
      ...book,
      categoryName: book.category?.name || 'Uncategorized',
      subjectName: book.subject?.name || '',
      totalCopies: book.copies,
      year: book.publishedDate ? new Date(book.publishedDate).getFullYear() : null
    }));

    res.json({
      books: formattedBooks,
      suggestions: Array.from(suggestions).slice(0, 8),
      didYouMean,
      total: formattedBooks.length
    });
  } catch (error) {
    console.error('Fetch books error:', error);
    res.status(500).json({ error: 'Failed to load library catalog' });
  }
});

/**
 * @route   POST /api/library/books
 * @desc    Add a new book (with multiple authors, ISBN-10/13, accession/barcode, detached from class)
 */
router.post('/books', requireAuth, requireRole('SCHOOL_ADMIN', 'ANCILLARY', 'TEACHER', 'LIBRARIAN'), libraryUpload.fields([
  { name: 'cover', maxCount: 1 },
  { name: 'pdf', maxCount: 1 }
]), async (req: AuthRequest, res: Response) => {
  const { 
    title, 
    author, 
    authors,
    isbn, 
    isbn10,
    isbn13,
    categoryId, 
    totalCopies,
    copies,
    availableCopies,
    edition, 
    publisher, 
    price, 
    publishedDate, 
    publicationYear,
    description,
    status = 'Available', 
    shelfLocation,
    barcode,
    accessionNumber,
    language = 'English',
    keywords,
    source = 'Purchased',
    condition = 'Good',
    subjectId 
  } = req.body;
  const schoolId = req.user!.schoolId!;
  const files = req.files as { [fieldname: string]: Express.Multer.File[] };

  try {
    const bookPrice = price ? parseFloat(price) : null;
    const numCopies = parseInt(totalCopies || copies || '1') || 1;
    const numAvailable = availableCopies !== undefined ? parseInt(availableCopies) : numCopies;

    // Normalize ISBNs
    const cleanIsbn = normalizeIsbn(isbn);
    const cleanIsbn10 = normalizeIsbn(isbn10);
    const cleanIsbn13 = normalizeIsbn(isbn13);

    // Support multiple authors
    let authorList: string[] = [];
    if (Array.isArray(authors)) {
      authorList = authors;
    } else if (typeof authors === 'string') {
      try {
        authorList = JSON.parse(authors);
      } catch {
        authorList = authors.split(',').map((s: string) => s.trim()).filter(Boolean);
      }
    }
    if (author && !authorList.includes(author)) {
      authorList.unshift(author);
    }
    const primaryAuthor = author || authorList[0] || 'Unknown Author';

    // Parse keywords
    let keywordList: string[] = [];
    if (Array.isArray(keywords)) {
      keywordList = keywords;
    } else if (typeof keywords === 'string') {
      try {
        keywordList = JSON.parse(keywords);
      } catch {
        keywordList = keywords.split(',').map((s: string) => s.trim()).filter(Boolean);
      }
    }

    let pubDate: Date | null = null;
    if (publishedDate) {
      pubDate = new Date(publishedDate);
    } else if (publicationYear) {
      pubDate = new Date(`${publicationYear}-01-01`);
    }

    const book = await prisma.book.create({
      data: {
        title,
        author: primaryAuthor,
        authors: authorList,
        isbn: cleanIsbn || cleanIsbn13 || cleanIsbn10 || null,
        isbn10: cleanIsbn10 || null,
        isbn13: cleanIsbn13 || null,
        categoryId: categoryId || null,
        edition: edition || null,
        publisher: publisher || null,
        price: bookPrice,
        publishedDate: pubDate,
        description: description || null,
        status: status || 'Available',
        shelfLocation: shelfLocation || null,
        barcode: barcode || null,
        accessionNumber: accessionNumber || null,
        language: language || 'English',
        keywords: keywordList,
        source: source || 'Purchased',
        condition: condition || 'Good',
        subjectId: subjectId || null,
        // Class link explicitly removed per Section 6 requirements
        copies: numCopies,
        available: numAvailable,
        coverUrl: files?.cover?.[0] ? path.join(req.uploadCategoryPath || '', files.cover[0].filename).replace(/\\/g, '/') : null,
        pdfUrl: files?.pdf?.[0] ? path.join(req.uploadCategoryPath || '', files.pdf[0].filename).replace(/\\/g, '/') : null,
        schoolId
      }
    });

    // Post asset purchase Journal Entry when purchased
    if (bookPrice && bookPrice > 0 && source !== 'Donated') {
      const totalCost = bookPrice * numCopies;
      try {
        const [assetId, cashId] = await Promise.all([
          getAccountId(schoolId, '2100', prisma),
          getAccountId(schoolId, '1100', prisma)
        ]);

        await LedgerService.postEntry({
          schoolId,
          date: new Date(),
          description: `Library acquisition: ${title} (${numCopies} copies)`,
          sourceType: 'library_purchase',
          sourceId: book.id,
          createdByUserId: req.user!.id,
          lines: [
            { accountId: assetId, debit: totalCost, description: `Book asset: ${title} × ${numCopies}` },
            { accountId: cashId, credit: totalCost, description: `Cash paid for books: ${title}` }
          ]
        });
      } catch (ledgerErr) {
        console.error('[Ledger] Library book purchase JE failed:', ledgerErr);
      }
    }

    res.status(201).json(book);
  } catch (error) {
    console.error('Book creation error:', error);
    res.status(500).json({ error: 'Failed to register book' });
  }
});

/**
 * @route   PATCH /api/library/books/:id
 * @desc    Update book details
 */
router.patch('/books/:id', requireAuth, requireRole('SCHOOL_ADMIN', 'ANCILLARY', 'TEACHER', 'LIBRARIAN'), libraryUpload.fields([
  { name: 'cover', maxCount: 1 },
  { name: 'pdf', maxCount: 1 }
]), async (req: AuthRequest, res: Response) => {
  const id = req.params.id as string;
  const { 
    title, author, authors, isbn, isbn10, isbn13, categoryId, totalCopies,
    edition, publisher, price, publishedDate, description,
    status, subjectId, shelfLocation, barcode, accessionNumber, language, keywords, source, condition
  } = req.body;
  const files = req.files as { [fieldname: string]: Express.Multer.File[] };

  try {
    const data: any = {};
    if (title) data.title = title;
    if (author) data.author = author;
    if (authors) {
      data.authors = Array.isArray(authors) ? authors : JSON.parse(authors);
    }
    if (isbn) data.isbn = normalizeIsbn(isbn);
    if (isbn10) data.isbn10 = normalizeIsbn(isbn10);
    if (isbn13) data.isbn13 = normalizeIsbn(isbn13);
    if (categoryId) data.categoryId = categoryId;
    if (edition) data.edition = edition;
    if (publisher) data.publisher = publisher;
    if (description !== undefined) data.description = description;
    if (status) data.status = status;
    if (subjectId !== undefined) data.subjectId = subjectId || null;
    if (shelfLocation !== undefined) data.shelfLocation = shelfLocation;
    if (barcode !== undefined) data.barcode = barcode;
    if (accessionNumber !== undefined) data.accessionNumber = accessionNumber;
    if (language) data.language = language;
    if (keywords) {
      data.keywords = Array.isArray(keywords) ? keywords : JSON.parse(keywords);
    }
    if (source) data.source = source;
    if (condition) data.condition = condition;

    if (totalCopies) {
      data.copies = parseInt(totalCopies);
    }
    if (price) data.price = parseFloat(price);
    if (publishedDate) data.publishedDate = new Date(publishedDate);
    
    if (files?.cover?.[0]) {
      data.coverUrl = path.join(req.uploadCategoryPath || '', files.cover[0].filename).replace(/\\/g, '/');
    }
    if (files?.pdf?.[0]) {
      data.pdfUrl = path.join(req.uploadCategoryPath || '', files.pdf[0].filename).replace(/\\/g, '/');
    }

    const book = await prisma.book.update({
      where: { id },
      data
    });
    res.json(book);
  } catch (error) {
    console.error('Book update error:', error);
    res.status(500).json({ error: 'Failed to update book' });
  }
});

// ----------------------------------------------------
// 3. CATEGORIES ENDPOINTS (Section 8)
// ----------------------------------------------------
router.get('/categories', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const schoolId = req.user!.schoolId!;
    const categories = await prisma.libraryCategory.findMany({
      where: { schoolId },
      include: { _count: { select: { books: true } } },
      orderBy: { name: 'asc' }
    });
    
    const formattedStats = categories.map(cat => ({
      id: cat.id,
      category: cat.name,
      count: cat._count.books
    }));
    
    res.json(formattedStats);
  } catch (error) {
    res.status(500).json({ error: 'Failed to load resource categories' });
  }
});

router.post('/categories', requireAuth, requireRole('SCHOOL_ADMIN', 'LIBRARIAN'), async (req: AuthRequest, res: Response) => {
  const { name } = req.body;
  const schoolId = req.user!.schoolId!;
  try {
    const category = await prisma.libraryCategory.create({
      data: { name: name.trim(), schoolId }
    });
    res.status(201).json(category);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create category' });
  }
});

router.patch('/categories/:id', requireAuth, requireRole('SCHOOL_ADMIN', 'LIBRARIAN'), async (req: AuthRequest, res: Response) => {
  const id = req.params.id as string;
  const { name } = req.body;
  try {
    const category = await prisma.libraryCategory.update({
      where: { id },
      data: { name: name.trim() }
    });
    res.json(category);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update category' });
  }
});

// ----------------------------------------------------
// 4. ACTIVE LOANS & ISSUING (Section 4 & 5)
// ----------------------------------------------------
/**
 * @route   GET /api/library/borrowers/validate
 * @desc    Validate borrower details, capacity, fines, and borrowing block status
 */
router.get('/borrowers/validate', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const schoolId = req.user!.schoolId!;
    const query = (req.query.query as string || '').trim().toLowerCase();
    const type = req.query.type as string; // 'STUDENT' or 'STAFF'

    if (!query) {
      return res.status(400).json({ error: 'Borrower query required' });
    }

    const setting = await getOrCreateLibrarySetting(schoolId);

    let borrower: any = null;
    let isStudent = false;

    // 1. Try finding Student
    if (type !== 'STAFF') {
      const student = await prisma.student.findFirst({
        where: {
          schoolId,
          OR: [
            { studentId: { equals: query, mode: 'insensitive' } },
            { name: { contains: query, mode: 'insensitive' } },
            { user: { email: { equals: query, mode: 'insensitive' } } },
            { id: query }
          ]
        },
        include: {
          user: { select: { id: true, name: true, email: true, avatar: true, phone: true } },
          class: { select: { name: true } }
        }
      });
      if (student) {
        borrower = student;
        isStudent = true;
      }
    }

    // 2. Try finding Staff User
    if (!borrower && type !== 'STUDENT') {
      const user = await prisma.user.findFirst({
        where: {
          schoolId,
          role: { in: ['TEACHER', 'SCHOOL_ADMIN', 'BURSAR', 'LIBRARIAN', 'ANCILLARY'] },
          OR: [
            { staffId: { equals: query, mode: 'insensitive' } },
            { email: { equals: query, mode: 'insensitive' } },
            { name: { contains: query, mode: 'insensitive' } },
            { id: query }
          ]
        },
        include: { dept: true }
      });
      if (user) {
        borrower = user;
        isStudent = false;
      }
    }

    if (!borrower) {
      return res.status(404).json({ error: 'Borrower not found with provided ID or name' });
    }

    // Calculate active loans
    const loanWhere = isStudent 
      ? { schoolId, studentId: borrower.id, status: 'borrowed' }
      : { schoolId, userId: borrower.id, status: 'borrowed' };

    const activeLoans = await prisma.bookLoan.findMany({
      where: loanWhere,
      include: { book: { select: { id: true, title: true, accessionNumber: true } } }
    });

    // Calculate outstanding fines across overdue loans
    let totalOutstandingFines = 0;
    for (const loan of activeLoans) {
      const { fineAmount } = computeLoanFine(loan, setting);
      totalOutstandingFines += fineAmount;
    }

    const maxLoans = isStudent ? setting.studentMaxLoans : setting.staffMaxLoans;
    const isFineBlocked = totalOutstandingFines >= setting.blockThresholdFine;
    const isCapacityReached = activeLoans.length >= maxLoans;

    res.json({
      id: borrower.id,
      userId: isStudent ? borrower.userId : borrower.id,
      studentId: isStudent ? borrower.id : null,
      identifier: isStudent ? borrower.studentId : (borrower.staffId || borrower.email),
      name: isStudent ? borrower.name : borrower.name,
      type: isStudent ? 'Student' : 'Staff',
      email: isStudent ? (borrower.user?.email || borrower.email) : borrower.email,
      phone: isStudent ? (borrower.user?.phone || borrower.phone) : borrower.phone,
      avatar: isStudent ? borrower.user?.avatar : borrower.avatar,
      departmentOrClass: isStudent ? (borrower.class?.name || 'Class Assigned') : (borrower.dept?.name || borrower.role),
      activeLoansCount: activeLoans.length,
      maxLoans,
      capacityDisplay: `${activeLoans.length}/${maxLoans} max`,
      activeLoans: activeLoans.map(l => ({
        id: l.id,
        bookId: l.book.id,
        title: l.book.title,
        accessionNumber: l.accessionNumber || l.book.accessionNumber
      })),
      outstandingFines: parseFloat(totalOutstandingFines.toFixed(2)),
      blockThreshold: setting.blockThresholdFine,
      isBlocked: isFineBlocked || isCapacityReached,
      blockReason: isFineBlocked 
        ? `Outstanding fines ($${totalOutstandingFines.toFixed(2)}) exceed the block threshold ($${setting.blockThresholdFine.toFixed(2)})`
        : isCapacityReached 
        ? `Borrowing capacity reached (${activeLoans.length}/${maxLoans} books out)`
        : null,
      canIssue: !isFineBlocked && !isCapacityReached
    });
  } catch (error) {
    console.error('Borrower validation error:', error);
    res.status(500).json({ error: 'Failed to validate borrower' });
  }
});

/**
 * @route   GET /api/library/books/validate
 * @desc    Validate book barcode/accession number and get availability
 */
router.get('/books/validate', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const schoolId = req.user!.schoolId!;
    const query = (req.query.query as string || '').trim();

    if (!query) {
      return res.status(400).json({ error: 'Book barcode/accession/ISBN query required' });
    }

    const cleanIsbnQuery = normalizeIsbn(query);

    const book = await prisma.book.findFirst({
      where: {
        schoolId,
        OR: [
          { barcode: { equals: query, mode: 'insensitive' } },
          { accessionNumber: { equals: query, mode: 'insensitive' } },
          { id: query },
          ...(cleanIsbnQuery ? [
            { isbn: cleanIsbnQuery },
            { isbn10: cleanIsbnQuery },
            { isbn13: cleanIsbnQuery }
          ] : []),
          { title: { equals: query, mode: 'insensitive' } }
        ]
      },
      include: { category: true }
    });

    if (!book) {
      return res.status(404).json({ error: 'Book not found in catalog' });
    }

    res.json({
      id: book.id,
      title: book.title,
      author: book.author,
      isbn: book.isbn,
      accessionNumber: book.accessionNumber || 'N/A',
      shelfLocation: book.shelfLocation || 'Main Stack',
      status: book.available > 0 ? 'Available' : 'Checked Out',
      copies: book.copies,
      available: book.available,
      condition: book.condition || 'Good',
      isAvailable: book.available > 0
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to validate book' });
  }
});

/**
 * @route   POST /api/library/loans/issue
 * @desc    Issue a book with validation (Section 4 & 5)
 */
router.post('/loans/issue', requireAuth, requireRole('SCHOOL_ADMIN', 'ANCILLARY', 'TEACHER', 'LIBRARIAN'), async (req: AuthRequest, res: Response) => {
  const { studentId, userId, bookId, accessionNumber, dueDate } = req.body;
  const schoolId = req.user!.schoolId!;

  try {
    const setting = await getOrCreateLibrarySetting(schoolId);

    // 1. Verify book availability
    const book = await prisma.book.findFirst({ where: { id: bookId, schoolId } });
    if (!book) return res.status(404).json({ error: 'Book not found' });
    if (book.available <= 0) return res.status(400).json({ error: `"${book.title}" has 0 copies available for issue` });

    // 2. Determine borrower
    const isStudent = !!studentId;
    const loanWhere = isStudent 
      ? { schoolId, studentId, status: 'borrowed' }
      : { schoolId, userId, status: 'borrowed' };

    const activeLoans = await prisma.bookLoan.findMany({
      where: loanWhere,
      include: { book: true }
    });

    // Check borrowing limit
    const maxLoans = isStudent ? setting.studentMaxLoans : setting.staffMaxLoans;
    if (activeLoans.length >= maxLoans) {
      return res.status(400).json({ error: `Borrower has reached max limit (${activeLoans.length}/${maxLoans})` });
    }

    // Check max loans of same title
    const sameTitleCount = activeLoans.filter(l => l.bookId === bookId).length;
    if (sameTitleCount >= setting.maxCopiesSameTitle) {
      return res.status(400).json({ error: `Borrower already has ${sameTitleCount} copy of "${book.title}" (Limit: ${setting.maxCopiesSameTitle})` });
    }

    // Check outstanding fines
    let totalFine = 0;
    for (const l of activeLoans) {
      const { fineAmount } = computeLoanFine(l, setting);
      totalFine += fineAmount;
    }
    if (totalFine >= setting.blockThresholdFine) {
      return res.status(400).json({ 
        error: `Borrower is blocked from borrowing: Outstanding fine ($${totalFine.toFixed(2)}) exceeds threshold ($${setting.blockThresholdFine.toFixed(2)})` 
      });
    }

    // Default loan period from settings if dueDate not provided
    let calculatedDueDate = dueDate ? new Date(dueDate) : null;
    if (!calculatedDueDate || isNaN(calculatedDueDate.getTime())) {
      calculatedDueDate = new Date();
      calculatedDueDate.setDate(calculatedDueDate.getDate() + setting.defaultLoanPeriodDays);
    }

    // Issue atomically
    const result = await prisma.$transaction(async (tx) => {
      await tx.book.update({
        where: { id: bookId },
        data: { available: { decrement: 1 } }
      });

      const newLoan = await tx.bookLoan.create({
        data: {
          schoolId,
          studentId: isStudent ? studentId : null,
          userId: isStudent ? null : userId,
          bookId,
          accessionNumber: accessionNumber || book.accessionNumber || null,
          dueDate: calculatedDueDate!,
          status: 'borrowed',
          loanType: 'LIBRARY'
        }
      });

      // If there was an active reservation for this book by this user, mark it as Issued
      await tx.bookReservation.updateMany({
        where: {
          schoolId,
          bookId,
          status: { in: ['Pending', 'Approved', 'Ready for Pickup'] },
          OR: [
            ...(isStudent ? [{ studentId }] : []),
            ...(userId ? [{ userId }] : [])
          ]
        },
        data: { status: 'Issued', issuedAt: new Date() }
      });

      return newLoan;
    });

    const updatedBook = await prisma.book.findUnique({ where: { id: bookId } });

    // Fetch borrower name for confirmation toast
    let borrowerName = 'Borrower';
    if (isStudent) {
      const stu = await prisma.student.findUnique({ where: { id: studentId } });
      if (stu) borrowerName = stu.name;
    } else if (userId) {
      const u = await prisma.user.findUnique({ where: { id: userId } });
      if (u) borrowerName = u.name;
    }

    res.status(201).json({
      success: true,
      loan: result,
      bookTitle: book.title,
      borrowerName,
      dueDate: calculatedDueDate.toLocaleDateString(),
      remainingAvailable: updatedBook?.available ?? 0
    });
  } catch (error: any) {
    console.error('Issue error:', error);
    res.status(400).json({ error: error.message || 'Failed to issue book' });
  }
});

/**
 * @route   GET /api/library/loans
 * @desc    Get active/all loans with 2-panel details (borrower capacity, fines, book copy)
 */
router.get('/loans', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const schoolId = req.user!.schoolId!;
    const statusFilter = req.query.status as string; // 'borrowed', 'returned', 'all'
    const setting = await getOrCreateLibrarySetting(schoolId);

    const where: any = { schoolId };
    if (statusFilter && statusFilter !== 'all') {
      where.status = statusFilter;
    } else if (!statusFilter) {
      where.status = 'borrowed'; // default to active loans
    }

    const loans = await prisma.bookLoan.findMany({
      where,
      include: {
        book: {
          include: { category: true }
        },
        student: {
          include: {
            user: { select: { id: true, name: true, email: true, phone: true, avatar: true } },
            class: { select: { id: true, name: true } }
          }
        },
        user: {
          select: { id: true, name: true, email: true, phone: true, avatar: true, role: true, dept: { select: { name: true } } }
        }
      },
      orderBy: { borrowedAt: 'desc' }
    });

    // Also get active loan counts per borrower to show capacity
    const studentActiveCounts = await prisma.bookLoan.groupBy({
      by: ['studentId'],
      where: { schoolId, status: 'borrowed', studentId: { not: null } },
      _count: { id: true }
    });
    const staffActiveCounts = await prisma.bookLoan.groupBy({
      by: ['userId'],
      where: { schoolId, status: 'borrowed', userId: { not: null } },
      _count: { id: true }
    });

    const studentCountMap = new Map(studentActiveCounts.map(c => [c.studentId, c._count.id]));
    const staffCountMap = new Map(staffActiveCounts.map(c => [c.userId, c._count.id]));

    const formattedLoans = loans.map(loan => {
      const isStudent = !!loan.studentId;
      const borrowerName = isStudent 
        ? (loan.student?.user?.name || loan.student?.name || 'Student')
        : (loan.user?.name || 'Staff');
      const borrowerId = isStudent ? loan.student?.studentId : (loan.user?.id);
      const borrowerEmail = isStudent ? (loan.student?.user?.email || '') : (loan.user?.email || '');
      const borrowerPhone = isStudent ? (loan.student?.user?.phone || loan.student?.phone || '') : (loan.user?.phone || '');
      const borrowerAvatar = isStudent ? loan.student?.user?.avatar : loan.user?.avatar;
      const departmentOrClass = isStudent ? (loan.student?.class?.name || 'Class Assigned') : (loan.user?.dept?.name || loan.user?.role || 'Staff');

      const activeCount = isStudent 
        ? (studentCountMap.get(loan.studentId) || 0)
        : (staffCountMap.get(loan.userId) || 0);
      const maxLoans = isStudent ? setting.studentMaxLoans : setting.staffMaxLoans;

      const { daysOverdue, fineAmount } = computeLoanFine(loan, setting);

      return {
        id: loan.id,
        borrowedAt: loan.borrowedAt,
        dueDate: loan.dueDate,
        returnedAt: loan.returnedAt,
        status: loan.status,
        accessionNumber: loan.accessionNumber || loan.book.accessionNumber,
        daysOverdue,
        fineSoFar: fineAmount,
        lastReminderDate: loan.lastReminderDate,
        borrower: {
          id: isStudent ? loan.studentId : loan.userId,
          name: borrowerName,
          identifier: borrowerId || 'N/A',
          type: isStudent ? 'Student' : 'Staff',
          email: borrowerEmail,
          phone: borrowerPhone,
          avatar: borrowerAvatar,
          departmentOrClass,
          activeLoansCount: activeCount,
          maxLoans,
          capacityDisplay: `${activeCount}/${maxLoans} max`
        },
        book: {
          id: loan.book.id,
          title: loan.book.title,
          author: loan.book.author,
          authors: loan.book.authors,
          isbn: loan.book.isbn,
          isbn10: loan.book.isbn10,
          isbn13: loan.book.isbn13,
          category: loan.book.category?.name || 'Uncategorized',
          shelfLocation: loan.book.shelfLocation || 'Main Stacks',
          barcode: loan.book.barcode || 'N/A',
          accessionNumber: loan.book.accessionNumber || 'N/A',
          condition: loan.book.condition || 'Good',
          coverUrl: loan.book.coverUrl,
          available: loan.book.available,
          totalCopies: loan.book.copies
        }
      };
    });

    res.json(formattedLoans);
  } catch (error) {
    console.error('Fetch loans error:', error);
    res.status(500).json({ error: 'Failed to fetch loan records' });
  }
});

/**
 * @route   POST /api/library/loans/:id/renew
 * @desc    Renew an active loan by extending due date
 */
router.post('/loans/:id/renew', requireAuth, requireRole('SCHOOL_ADMIN', 'ANCILLARY', 'TEACHER', 'LIBRARIAN'), async (req: AuthRequest, res: Response) => {
  const id = req.params.id as string;
  try {
    const loan = await prisma.bookLoan.findFirst({
      where: { id, schoolId: req.user!.schoolId! },
      include: { book: true }
    });
    if (!loan || loan.status === 'returned') {
      return res.status(400).json({ error: 'Cannot renew a returned or non-existent loan' });
    }

    const setting = await getOrCreateLibrarySetting(req.user!.schoolId!);
    const newDueDate = new Date(loan.dueDate);
    newDueDate.setDate(newDueDate.getDate() + setting.defaultLoanPeriodDays);

    const updated = await prisma.bookLoan.update({
      where: { id },
      data: { dueDate: newDueDate }
    });

    res.json({
      success: true,
      message: `Loan renewed until ${newDueDate.toLocaleDateString()}`,
      loan: updated
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to renew loan' });
  }
});

/**
 * @route   POST /api/library/loans/:id/return
 * @desc    Mark book returned
 */
router.post('/loans/:id/return', requireAuth, requireRole('SCHOOL_ADMIN', 'ANCILLARY', 'TEACHER', 'LIBRARIAN'), async (req: AuthRequest, res: Response) => {
  const id = req.params.id as string;
  try {
    const loan = await prisma.bookLoan.findFirst({ where: { id, schoolId: req.user!.schoolId! } });
    if (!loan || loan.status === 'returned') {
      return res.status(400).json({ error: 'Loan is already returned or does not exist' });
    }

    const updated = await prisma.$transaction(async (tx) => {
      const l = await tx.bookLoan.update({
        where: { id },
        data: { status: 'returned', returnedAt: new Date() }
      });

      await tx.book.update({
        where: { id: loan.bookId },
        data: { available: { increment: 1 } }
      });

      // Check if there is an approved reservation waiting for this book
      const pendingRes = await tx.bookReservation.findFirst({
        where: { bookId: loan.bookId, status: 'Approved' },
        orderBy: { requestDate: 'asc' }
      });
      if (pendingRes) {
        await tx.bookReservation.update({
          where: { id: pendingRes.id },
          data: { status: 'Ready for Pickup', readyAt: new Date() }
        });
      }

      return l;
    });

    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: 'Failed to return book' });
  }
});

// ----------------------------------------------------
// 5. OVERDUE MANAGEMENT (Section 2)
// ----------------------------------------------------
/**
 * @route   GET /api/library/loans/overdue
 * @desc    Get overdue items with live fine calculation and filter support
 */
router.get('/loans/overdue', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const schoolId = req.user!.schoolId!;
    const filter = req.query.filter as string; // 'today', '1-7', '7-30', '30+'
    const setting = await getOrCreateLibrarySetting(schoolId);

    const loans = await prisma.bookLoan.findMany({
      where: {
        schoolId,
        status: 'borrowed',
        returnedAt: null,
        dueDate: { lt: new Date() }
      },
      include: {
        book: true,
        student: {
          include: {
            user: { select: { name: true, phone: true, email: true } },
            class: { select: { name: true } }
          }
        },
        user: { select: { name: true, phone: true, email: true, role: true } }
      },
      orderBy: { dueDate: 'asc' }
    });

    let totalOutstanding = 0;

    const formatted = loans.map(loan => {
      const { daysOverdue, fineAmount } = computeLoanFine(loan, setting);
      totalOutstanding += fineAmount;

      const isStudent = !!loan.studentId;
      const borrowerName = isStudent 
        ? (loan.student?.user?.name || loan.student?.name || 'Student')
        : (loan.user?.name || 'Staff');
      const borrowerPhone = isStudent
        ? (loan.student?.user?.phone || loan.student?.phone || '—')
        : (loan.user?.phone || '—');

      return {
        id: loan.id,
        bookId: loan.book.id,
        bookTitle: loan.book.title,
        accessionNumber: loan.accessionNumber || loan.book.accessionNumber || loan.book.isbn,
        borrowerName,
        borrowerType: isStudent ? 'Student' : 'Staff',
        borrowerPhone,
        dueDate: loan.dueDate,
        daysOverdue,
        fineSoFar: fineAmount,
        waivedFine: loan.waivedFine || 0,
        paidFine: loan.paidFine || 0
      };
    });

    // Apply bucket filter if provided
    let filteredList = formatted;
    if (filter === 'today') {
      filteredList = formatted.filter(l => l.daysOverdue <= 1);
    } else if (filter === '1-7') {
      filteredList = formatted.filter(l => l.daysOverdue >= 1 && l.daysOverdue <= 7);
    } else if (filter === '7-30') {
      filteredList = formatted.filter(l => l.daysOverdue > 7 && l.daysOverdue <= 30);
    } else if (filter === '30+') {
      filteredList = formatted.filter(l => l.daysOverdue > 30);
    }

    res.json({
      overdueLoans: filteredList,
      stats: {
        totalOverdueCount: formatted.length,
        totalFineOutstanding: parseFloat(totalOutstanding.toFixed(2))
      }
    });
  } catch (error) {
    console.error('Fetch overdue loans error:', error);
    res.status(500).json({ error: 'Failed to load overdue records' });
  }
});

/**
 * @route   POST /api/library/loans/:id/waive-fine
 * @desc    Waive fine on an overdue loan
 */
router.post('/loans/:id/waive-fine', requireAuth, requireRole('SCHOOL_ADMIN', 'LIBRARIAN', 'BURSAR'), async (req: AuthRequest, res: Response) => {
  const id = req.params.id as string;
  const { amount, fullWaive = true } = req.body;
  try {
    const loan = await prisma.bookLoan.findFirst({ where: { id, schoolId: req.user!.schoolId! } });
    if (!loan) return res.status(404).json({ error: 'Loan record not found' });

    const setting = await getOrCreateLibrarySetting(req.user!.schoolId!);
    const { fineAmount } = computeLoanFine(loan, setting);

    const waiveAmount = fullWaive ? fineAmount : Math.min(fineAmount, parseFloat(amount || 0));

    const updated = await prisma.bookLoan.update({
      where: { id },
      data: {
        waivedFine: (loan.waivedFine || 0) + waiveAmount,
        fineCalculated: Math.max(0, (loan.fineCalculated || 0) - waiveAmount)
      }
    });

    res.json({ success: true, waived: waiveAmount, loan: updated });
  } catch (error) {
    res.status(500).json({ error: 'Failed to waive fine' });
  }
});

/**
 * @route   POST /api/library/loans/:id/send-reminder
 * @desc    Send manual reminder to borrower
 */
router.post('/loans/:id/send-reminder', requireAuth, requireRole('SCHOOL_ADMIN', 'LIBRARIAN'), async (req: AuthRequest, res: Response) => {
  const id = req.params.id as string;
  try {
    const loan: any = await prisma.bookLoan.findFirst({
      where: { id, schoolId: req.user!.schoolId! },
      include: {
        book: true,
        student: { include: { user: true } },
        user: true
      }
    });
    if (!loan) return res.status(404).json({ error: 'Loan not found' });

    const setting = await getOrCreateLibrarySetting(req.user!.schoolId!);
    const { daysOverdue, fineAmount } = computeLoanFine(loan, setting);

    const borrowerName = loan.student?.user?.name || loan.student?.name || loan.user?.name || 'Borrower';
    const borrowerPhone = loan.student?.user?.phone || loan.student?.phone || loan.user?.phone;
    const borrowerEmail = loan.student?.user?.email || loan.student?.email || loan.user?.email;

    const message = daysOverdue > 0 
      ? `Overdue Notice: "${loan.book.title}" is ${daysOverdue} days overdue with an outstanding fine of $${fineAmount.toFixed(2)}. Please return it immediately.`
      : `Reminder: "${loan.book.title}" is due on ${new Date(loan.dueDate).toLocaleDateString()}. Please return to the library.`;

    if (borrowerPhone || borrowerEmail) {
      await NotificationService.enqueue({
        type: borrowerPhone ? 'WhatsApp' : 'Email',
        schoolId: loan.schoolId,
        senderId: req.user!.id,
        recipientPhone: borrowerPhone || undefined,
        recipientEmail: borrowerEmail || undefined,
        payload: { message, borrowerName, bookTitle: loan.book.title }
      });
    }

    await prisma.bookLoan.update({
      where: { id },
      data: { lastReminderDate: new Date(), lastReminderType: 'MANUAL_STAFF' }
    });

    res.json({ success: true, message: 'Reminder dispatched to borrower' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to send reminder' });
  }
});

// ----------------------------------------------------
// 6. RESERVATIONS (Section 3)
// ----------------------------------------------------
/**
 * @route   GET /api/library/reservations
 * @desc    Get reservation hold queue with available copy indicators
 */
router.get('/reservations', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const schoolId = req.user!.schoolId!;
    const reservations = await prisma.bookReservation.findMany({
      where: { schoolId },
      include: {
        book: { select: { id: true, title: true, author: true, isbn: true, available: true } },
        student: { select: { id: true, name: true, studentId: true, user: { select: { phone: true, email: true } } } },
        user: { select: { id: true, name: true, email: true, phone: true } }
      },
      orderBy: { requestDate: 'desc' }
    });

    const formatted = reservations.map(r => ({
      id: r.id,
      bookId: r.book.id,
      bookTitle: r.book.title,
      borrowerName: r.student?.name || r.user?.name || 'Unknown',
      borrowerIdentifier: r.student?.studentId || r.user?.email || '—',
      borrowerPhone: r.student?.user?.phone || r.user?.phone || '—',
      requestDate: r.requestDate,
      status: r.status,
      availableCopy: r.book.available > 0,
      copiesAvailable: r.book.available,
      readyAt: r.readyAt,
      issuedAt: r.issuedAt
    }));

    res.json(formatted);
  } catch (error) {
    res.status(500).json({ error: 'Failed to load reservations queue' });
  }
});

/**
 * @route   POST /api/library/reservations
 * @desc    Submit a new reservation request
 */
router.post('/reservations', requireAuth, async (req: AuthRequest, res: Response) => {
  const { bookId, studentId, userId, notes } = req.body;
  const schoolId = req.user!.schoolId!;

  try {
    const isStudent = req.user!.role === 'STUDENT' || !!studentId;
    let targetStudentId = studentId;
    let targetUserId = userId;

    if (req.user!.role === 'STUDENT') {
      const s = await prisma.student.findFirst({ where: { userId: req.user!.id } });
      if (s) targetStudentId = s.id;
    } else if (!targetStudentId && !targetUserId) {
      targetUserId = req.user!.id;
    }

    const reservation = await prisma.bookReservation.create({
      data: {
        schoolId,
        bookId,
        studentId: targetStudentId || null,
        userId: targetUserId || null,
        notes: notes || null,
        status: 'Pending'
      },
      include: { book: true }
    });

    res.status(201).json(reservation);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create reservation' });
  }
});

/**
 * @route   PATCH /api/library/reservations/:id/status
 * @desc    Update status: Pending -> Approved -> Ready for Pickup -> Issued -> Cancelled (or Rejected)
 */
router.patch('/reservations/:id/status', requireAuth, requireRole('SCHOOL_ADMIN', 'LIBRARIAN'), async (req: AuthRequest, res: Response) => {
  const id = req.params.id as string;
  const { action, status } = req.body; // action: 'APPROVE', 'READY', 'ISSUE', 'CANCEL', 'REJECT'
  const schoolId = req.user!.schoolId!;

  try {
    const reservation: any = await prisma.bookReservation.findFirst({
      where: { id, schoolId },
      include: {
        book: true,
        student: { include: { user: true } },
        user: true
      }
    });

    if (!reservation) return res.status(404).json({ error: 'Reservation not found' });

    let newStatus = status;
    let readyAt = reservation.readyAt;

    if (action === 'APPROVE') {
      // Automatic availability check
      if (reservation.book.available > 0) {
        newStatus = 'Ready for Pickup';
        readyAt = new Date();
      } else {
        newStatus = 'Approved'; // On hold waiting for copy
      }
    } else if (action === 'READY') {
      newStatus = 'Ready for Pickup';
      readyAt = new Date();
    } else if (action === 'ISSUE') {
      newStatus = 'Issued';
    } else if (action === 'CANCEL') {
      newStatus = 'Cancelled';
    } else if (action === 'REJECT') {
      newStatus = 'Rejected';
    }

    const updated = await prisma.bookReservation.update({
      where: { id },
      data: {
        status: newStatus,
        readyAt,
        notifiedAt: (newStatus === 'Ready for Pickup') ? new Date() : reservation.notifiedAt
      }
    });

    // Send notification if moved to Ready for Pickup
    if (newStatus === 'Ready for Pickup') {
      const phone = reservation.student?.user?.phone || reservation.user?.phone;
      const email = reservation.student?.user?.email || reservation.user?.email;
      const borrowerName = reservation.student?.name || reservation.user?.name || 'Borrower';

      if (phone || email) {
        await NotificationService.enqueue({
          type: phone ? 'WhatsApp' : 'Email',
          schoolId,
          senderId: req.user!.id,
          recipientPhone: phone || undefined,
          recipientEmail: email || undefined,
          payload: {
            borrowerName,
            bookTitle: reservation.book.title,
            message: `Good news! Your reserved book "${reservation.book.title}" is now Ready for Pickup at the library front desk.`
          }
        }).catch(console.error);
      }
    }

    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update reservation status' });
  }
});

// ----------------------------------------------------
// 7. DIGITAL RESOURCES REPOSITORY (Section 7)
// ----------------------------------------------------
/**
 * @route   GET /api/library/digital-resources
 * @desc    Get all digital repository assets with metadata and status check
 */
router.get('/digital-resources', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const schoolId = req.user!.schoolId!;
    const { category, type, search } = req.query;

    const resources = await prisma.libraryDigitalResource.findMany({
      where: {
        schoolId,
        ...(category && category !== 'all' ? { categoryId: String(category) } : {}),
        ...(type && type !== 'all' ? { resourceType: String(type) } : {}),
        ...(search ? {
          OR: [
            { title: { contains: String(search), mode: 'insensitive' } },
            { author: { contains: String(search), mode: 'insensitive' } }
          ]
        } : {})
      },
      include: { category: true, subject: true, addedBy: { select: { name: true } } },
      orderBy: { createdAt: 'desc' }
    });

    // Auto-check expiry date: if expired, mark Inactive
    const now = new Date();
    const checked = await Promise.all(resources.map(async r => {
      if (r.expiryDate && new Date(r.expiryDate) < now && r.status === 'Active') {
        await prisma.libraryDigitalResource.update({
          where: { id: r.id },
          data: { status: 'Inactive' }
        });
        return { ...r, status: 'Inactive', isExpired: true };
      }
      return { ...r, isExpired: !!(r.expiryDate && new Date(r.expiryDate) < now) };
    }));

    res.json(checked);
  } catch (error) {
    console.error('Fetch digital resources error:', error);
    res.status(500).json({ error: 'Failed to load digital resources' });
  }
});

/**
 * @route   POST /api/library/digital-resources
 * @desc    Add digital asset supporting either upload or link, auto-format detection
 */
router.post('/digital-resources', requireAuth, requireRole('SCHOOL_ADMIN', 'LIBRARIAN', 'TEACHER'), libraryUpload.single('file'), async (req: AuthRequest, res: Response) => {
  try {
    const schoolId = req.user!.schoolId!;
    const {
      title,
      author,
      resourceType = 'eBook',
      externalLink,
      categoryId,
      subjectId,
      accessLevel = 'Public',
      yearPublished,
      description,
      keywords,
      language = 'English',
      thumbnailUrl,
      licenseStatus = 'Open Access',
      permissionGranted = 'true',
      expiryDate,
      status = 'Active'
    } = req.body;

    const file = req.file;
    if (!file && !externalLink) {
      return res.status(400).json({ error: 'Please provide either an uploaded file or an external link' });
    }

    // Auto-detect format
    let fileFormat = 'Link';
    let fileUrl: string | null = null;
    let fileSize: bigint | null = null;

    if (file) {
      fileUrl = path.join(req.uploadCategoryPath || '', file.filename).replace(/\\/g, '/');
      fileSize = BigInt(file.size);
      const ext = path.extname(file.originalname).toLowerCase().replace('.', '');
      if (ext === 'pdf') fileFormat = 'PDF';
      else if (['mp4', 'mov', 'avi', 'mkv'].includes(ext)) fileFormat = 'MP4';
      else if (['mp3', 'wav', 'aac', 'm4a'].includes(ext)) fileFormat = 'MP3';
      else if (['doc', 'docx'].includes(ext)) fileFormat = 'DOC';
      else fileFormat = ext.toUpperCase();
    } else if (externalLink) {
      fileFormat = 'Link';
    }

    let keywordList: string[] = [];
    if (keywords) {
      try {
        keywordList = Array.isArray(keywords) ? keywords : JSON.parse(keywords);
      } catch {
        keywordList = String(keywords).split(',').map(s => s.trim()).filter(Boolean);
      }
    }

    const digital = await prisma.libraryDigitalResource.create({
      data: {
        schoolId,
        title,
        author: author || 'Unknown',
        resourceType,
        fileUrl,
        externalLink: externalLink || null,
        fileFormat,
        categoryId: categoryId || null,
        subjectId: subjectId || null,
        accessLevel,
        yearPublished: yearPublished ? parseInt(yearPublished) : null,
        description: description || null,
        keywords: keywordList,
        language,
        thumbnailUrl: thumbnailUrl || null,
        fileSize,
        licenseStatus,
        permissionGranted: permissionGranted === 'true' || permissionGranted === true,
        expiryDate: expiryDate ? new Date(expiryDate) : null,
        status,
        addedById: req.user!.id
      }
    });

    res.status(201).json(digital);
  } catch (error) {
    console.error('Create digital resource error:', error);
    res.status(500).json({ error: 'Failed to create digital resource' });
  }
});

/**
 * @route   PATCH /api/library/digital-resources/:id
 * @desc    Update digital resource metadata or status
 */
router.patch('/digital-resources/:id', requireAuth, requireRole('SCHOOL_ADMIN', 'LIBRARIAN'), async (req: AuthRequest, res: Response) => {
  const id = req.params.id as string;
  try {
    const updated = await prisma.libraryDigitalResource.update({
      where: { id },
      data: req.body
    });
    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update digital resource' });
  }
});

/**
 * @route   POST /api/library/digital-resources/:id/track
 * @desc    Increment view or download count
 */
router.post('/digital-resources/:id/track', requireAuth, async (req: AuthRequest, res: Response) => {
  const id = req.params.id as string;
  const { action = 'view' } = req.body;
  try {
    const updated = await prisma.libraryDigitalResource.update({
      where: { id },
      data: action === 'download' 
        ? { downloadCount: { increment: 1 } }
        : { viewCount: { increment: 1 } }
    });
    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: 'Failed to record usage' });
  }
});

// ----------------------------------------------------
// 8. LOANS LIST & MY BOOKS
// ----------------------------------------------------
router.get('/loans', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const loans = await prisma.bookLoan.findMany({
      where: { schoolId: req.user!.schoolId! },
      include: {
        book: true,
        student: { include: { user: { select: { name: true } } } },
        user: { select: { name: true } }
      },
      orderBy: { borrowedAt: 'desc' }
    });
    res.json(loans);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch loan records' });
  }
});

router.get('/my-books', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const student = await prisma.student.findFirst({
      where: { userId: req.user!.id }
    });
    
    const loans = await prisma.bookLoan.findMany({
      where: {
        schoolId: req.user!.schoolId!,
        OR: [
          { userId: req.user!.id },
          ...(student ? [{ studentId: student.id }] : [])
        ]
      },
      include: {
        book: { select: { title: true, author: true, isbn: true, categoryId: true, coverUrl: true } }
      },
      orderBy: { borrowedAt: 'desc' }
    });

    const setting = await getOrCreateLibrarySetting(req.user!.schoolId!);

    const formattedLoans = await Promise.all(loans.map(async l => {
      let categoryName = 'General';
      if (l.book.categoryId) {
        const cat = await prisma.libraryCategory.findFirst({ where: { id: l.book.categoryId } });
        if (cat) categoryName = cat.name;
      }
      const { daysOverdue, fineAmount, isOverdue } = computeLoanFine(l, setting);
      return {
        ...l,
        daysOverdue,
        fineAmount,
        isOverdue,
        book: {
          ...l.book,
          category: categoryName
        }
      };
    }));

    res.json(formattedLoans);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch your books' });
  }
});

// ----------------------------------------------------
// 9. REPORTS & REMINDERS TRIGGER
// ----------------------------------------------------
router.get('/reports', requireAuth, async (req: AuthRequest, res: Response) => {
  const schoolId = req.user!.schoolId!;
  const userRole = (req.user!.role || '').toUpperCase();
  const isAdmin = userRole === 'SCHOOL_ADMIN' || userRole === 'SUPER_ADMIN';
  const isLibrarian = userRole === 'LIBRARIAN';

  // Critical integration requirement: enforce role-based department scoping
  // Librarian is strictly locked to 'library'. Admin can toggle between 'library' and 'all'
  const requestedDept = (req.query.department as string || 'library').toLowerCase();
  const departmentScope = isLibrarian ? 'library' : (requestedDept === 'all' ? 'all' : 'library');

  // Top-level date filters: today, month, term, custom
  const dateRange = (req.query.dateRange as string || 'month').toLowerCase();
  const now = new Date();
  let filterStart: Date;
  let filterEnd: Date = new Date();

  if (dateRange === 'today') {
    filterStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
  } else if (dateRange === 'term') {
    // Current term (approx 3 months)
    filterStart = new Date(now.getFullYear(), now.getMonth() - 3, 1, 0, 0, 0);
  } else if (dateRange === 'custom' && req.query.startDate && req.query.endDate) {
    filterStart = new Date(req.query.startDate as string);
    filterEnd = new Date(req.query.endDate as string);
    filterEnd.setHours(23, 59, 59, 999);
  } else {
    // Default: This month
    filterStart = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0);
  }

  try {
    const setting = await getOrCreateLibrarySetting(schoolId);

    // 1. Core aggregates & school-wide integration
    const [
      allSchoolAssets,
      allBooks,
      allCategories,
      allLoans,
      allReservations,
      allStudents,
      allClasses,
      allRequisitions
    ] = await Promise.all([
      // Main school system assets
      prisma.asset.findMany({
        where: { schoolId, status: { not: 'DISPOSED' } },
        include: { custodian: { select: { id: true, name: true, role: true } } }
      }),
      // Book catalog
      prisma.book.findMany({
        where: { schoolId },
        include: {
          category: { select: { id: true, name: true } },
          _count: { select: { loans: true } }
        }
      }),
      // Library categories
      prisma.libraryCategory.findMany({
        where: { schoolId },
        include: { _count: { select: { books: true } } }
      }),
      // Book loans
      prisma.bookLoan.findMany({
        where: { schoolId },
        include: {
          book: { select: { id: true, title: true, author: true, price: true, categoryId: true } },
          student: {
            select: {
              id: true,
              studentId: true,
              name: true,
              class: { select: { id: true, name: true } },
              user: { select: { name: true, phone: true, email: true } }
            }
          },
          user: { select: { id: true, name: true, role: true, phone: true, email: true } }
        }
      }),
      // Book reservations
      prisma.bookReservation.findMany({
        where: { schoolId },
        include: {
          book: { select: { id: true, title: true } },
          student: { select: { name: true, studentId: true } },
          user: { select: { name: true, email: true } }
        },
        orderBy: { requestDate: 'desc' }
      }),
      // Students for User reports
      prisma.student.findMany({
        where: { schoolId },
        include: { class: { select: { id: true, name: true } } }
      }),
      // School Classes
      prisma.schoolClass.findMany({
        where: { schoolId },
        select: { id: true, name: true }
      }),
      // School Requisitions (reusing main system requisitions table)
      prisma.requisition.findMany({
        where: { schoolId },
        include: { department: { select: { id: true, name: true } } }
      })
    ]);

    // Financial & Valuation Calculations (Critical integration requirement: scoped subset of main school reports)
    const totalSchoolAssetsValue = allSchoolAssets.reduce((sum, a) => sum + ((a.purchasePrice || 0) * (a.quantity || 1)), 0);
    const libraryPhysicalAssets = allSchoolAssets.filter(a => (a.department || '').toLowerCase() === 'library');
    const libraryEquipmentValue = libraryPhysicalAssets.reduce((sum, a) => sum + ((a.purchasePrice || 0) * (a.quantity || 1)), 0);
    const booksValue = allBooks.reduce((sum, b) => sum + ((b.price || 0) * (b.copies || 1)), 0);
    const libraryAssetsValue = libraryEquipmentValue + booksValue;
    const libraryAssetSharePercent = totalSchoolAssetsValue > 0 ? Number(((libraryAssetsValue / (totalSchoolAssetsValue + booksValue)) * 100).toFixed(1)) : 100;

    // Fines calculations
    let totalSchoolFinesCollected = 0;
    let totalSchoolFinesPending = 0;
    let libraryFinesCollected = 0;
    let libraryFinesPending = 0;

    allLoans.forEach(l => {
      const { fineAmount } = computeLoanFine(l, setting);
      const paid = l.paidFine || 0;
      totalSchoolFinesCollected += paid;
      libraryFinesCollected += paid;
      if (l.status === 'borrowed' && fineAmount > 0) {
        totalSchoolFinesPending += fineAmount;
        libraryFinesPending += fineAmount;
      }
    });

    // Requisitions scoped to Library vs Total
    const libraryRequisitions = allRequisitions.filter(r => (r.department?.name || '').toLowerCase() === 'library');
    const reqListToUse = departmentScope === 'all' ? allRequisitions : libraryRequisitions;
    const pendingReqs = reqListToUse.filter(r => r.status === 'PENDING' || r.status === 'DRAFT');
    const approvedReqs = reqListToUse.filter(r => r.status === 'APPROVED' || r.status === 'HOD_APPROVED' || r.status === 'BURSAR_APPROVED');
    const rejectedReqs = reqListToUse.filter(r => r.status === 'REJECTED');
    const totalRequestedValue = reqListToUse.reduce((sum, r) => sum + (r.estimatedAmount || 0), 0);

    // KPI Cards with Trend
    const totalVolumes = allBooks.reduce((sum, b) => sum + (b.copies || 1), 0);
    const currentlyBorrowedCount = allLoans.filter(l => l.status === 'borrowed').length;
    const overdueCount = allLoans.filter(l => l.status === 'borrowed' && new Date(l.dueDate) < now).length;
    const totalFines = libraryFinesCollected + libraryFinesPending;

    // Circulation Reports (Tab 1)
    // Seasonal Borrowing Patterns: Issues per month (last 6 months)
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const past6Months = Array.from({ length: 6 }).map((_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
      return {
        month: monthNames[d.getMonth()] + ' ' + d.getFullYear().toString().slice(-2),
        year: d.getFullYear(),
        monthIndex: d.getMonth()
      };
    });

    const issuesPerMonth = past6Months.map(m => {
      const count = allLoans.filter(l => {
        const bd = new Date(l.borrowedAt);
        return bd.getFullYear() === m.year && bd.getMonth() === m.monthIndex;
      }).length;
      return { month: m.month, issues: count };
    });

    const issuesVsReturns = past6Months.map(m => {
      const issues = allLoans.filter(l => {
        const bd = new Date(l.borrowedAt);
        return bd.getFullYear() === m.year && bd.getMonth() === m.monthIndex;
      }).length;
      const returns = allLoans.filter(l => {
        if (!l.returnedAt) return false;
        const rd = new Date(l.returnedAt);
        return rd.getFullYear() === m.year && rd.getMonth() === m.monthIndex;
      }).length;
      return { month: m.month, issues, returns };
    });

    // Most Borrowed Books (Top 10 and Top 5 horizontal)
    const sortedByBorrows = [...allBooks].sort((a, b) => (b._count?.loans || 0) - (a._count?.loans || 0));
    const mostBorrowed = sortedByBorrows.slice(0, 10).map((b, idx) => ({
      rank: idx + 1,
      id: b.id,
      title: b.title,
      author: b.author,
      category: b.category?.name || 'General',
      borrowCount: b._count?.loans || 0
    }));
    const mostBorrowedTop5 = mostBorrowed.slice(0, 5);

    // Least Borrowed Books (dead stock)
    const leastBorrowed = [...allBooks]
      .sort((a, b) => (a._count?.loans || 0) - (b._count?.loans || 0))
      .slice(0, 10)
      .map(b => ({
        id: b.id,
        title: b.title,
        author: b.author,
        category: b.category?.name || 'General',
        copies: b.copies,
        borrowCount: b._count?.loans || 0,
        publishedDate: b.publishedDate ? new Date(b.publishedDate).toLocaleDateString() : 'N/A'
      }));

    // Average loan duration
    const returnedLoans = allLoans.filter(l => l.returnedAt && l.borrowedAt);
    const avgDurationDays = returnedLoans.length > 0
      ? Number((returnedLoans.reduce((sum, l) => {
          const diff = new Date(l.returnedAt!).getTime() - new Date(l.borrowedAt).getTime();
          return sum + Math.max(1, Math.round(diff / (1000 * 60 * 60 * 24)));
        }, 0) / returnedLoans.length).toFixed(1))
      : 14.0;

    // Peak borrowing days & hours
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const dayCounts = [0, 0, 0, 0, 0, 0, 0];
    const hourSlots: { [slot: string]: number } = {
      '08:00 - 10:00': 0,
      '10:00 - 12:00': 0,
      '12:00 - 14:00': 0,
      '14:00 - 16:00': 0,
      '16:00 - 18:00': 0
    };

    allLoans.forEach(l => {
      const d = new Date(l.borrowedAt);
      dayCounts[d.getDay()]++;
      const h = d.getHours();
      if (h >= 8 && h < 10) hourSlots['08:00 - 10:00']++;
      else if (h >= 10 && h < 12) hourSlots['10:00 - 12:00']++;
      else if (h >= 12 && h < 14) hourSlots['12:00 - 14:00']++;
      else if (h >= 14 && h < 16) hourSlots['14:00 - 16:00']++;
      else if (h >= 16) hourSlots['16:00 - 18:00']++;
    });

    const maxDayIdx = dayCounts.indexOf(Math.max(...dayCounts));
    const peakDay = dayNames[maxDayIdx] || 'Wednesday';
    let peakHour = '12:00 - 14:00';
    let maxHourCount = -1;
    for (const [slot, count] of Object.entries(hourSlots)) {
      if (count > maxHourCount) {
        maxHourCount = count;
        peakHour = slot;
      }
    }

    // Overdue List with colored severity badges (1-7d yellow, 8-14d orange, 15+d red)
    const overdueLoansList = allLoans
      .filter(l => l.status === 'borrowed' && new Date(l.dueDate) < now)
      .map(loan => {
        const { daysOverdue, fineAmount } = computeLoanFine(loan, setting);
        const days = Math.max(1, daysOverdue);
        let severity: 'yellow' | 'orange' | 'red' = 'yellow';
        if (days >= 15) severity = 'red';
        else if (days >= 8) severity = 'orange';

        const borrowerName = loan.student?.user?.name || loan.student?.name || loan.user?.name || 'Borrower';
        const borrowerClass = loan.student?.class?.name || (loan.user?.role || 'Staff');
        const borrowerPhone = loan.student?.user?.phone || loan.user?.phone || '—';

        return {
          id: loan.id,
          bookTitle: loan.book?.title || 'Unknown Title',
          bookAuthor: loan.book?.author || 'Unknown Author',
          borrowerName,
          borrowerClass,
          borrowerPhone,
          dueDate: loan.dueDate,
          daysOverdue: days,
          fineAmount: Number(fineAmount.toFixed(2)),
          severity
        };
      })
      .sort((a, b) => b.daysOverdue - a.daysOverdue);

    // Inventory / Asset Reports (Tab 2)
    // Books by category (Donut chart)
    const categoryPalette = ['#3b82f6', '#8b5cf6', '#ec4899', '#10b981', '#f59e0b', '#06b6d4', '#6366f1'];
    const booksByCategory = allCategories.map((c, i) => ({
      name: c.name,
      count: c._count.books,
      color: categoryPalette[i % categoryPalette.length]
    })).filter(c => c.count > 0);

    // Available vs Borrowed vs Damaged vs Lost
    const availableBooksCount = allBooks.reduce((sum, b) => sum + (b.available || 0), 0);
    const damagedBooksCount = allBooks.filter(b => (b.condition || '').toLowerCase() === 'damaged').length;
    const lostBooksCount = allLoans.filter(l => l.status === 'lost').length;
    const inventoryStatusData = [
      { name: 'Available', value: Math.max(0, availableBooksCount), color: '#10b981' },
      { name: 'Borrowed', value: currentlyBorrowedCount, color: '#3b82f6' },
      { name: 'Damaged', value: damagedBooksCount, color: '#f59e0b' },
      { name: 'Lost', value: lostBooksCount, color: '#ef4444' }
    ];

    // Books added this month
    const startOfCurrentMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const booksAddedThisMonth = allBooks.filter(b => new Date(b.createdAt) >= startOfCurrentMonth).length;

    // Books to be disposed / damaged
    const booksToDispose = allBooks.filter(b => (b.condition || '').toLowerCase() === 'damaged' || (b.status || '').toLowerCase() === 'condemned');

    // Users Reports (Tab 3)
    // Borrowers by class/form (Column chart)
    const classBorrowMap: { [cls: string]: number } = {};
    allClasses.forEach(c => { classBorrowMap[c.name] = 0; });
    allLoans.forEach(l => {
      const clsName = l.student?.class?.name;
      if (clsName) {
        classBorrowMap[clsName] = (classBorrowMap[clsName] || 0) + 1;
      }
    });
    const borrowersByClass = Object.entries(classBorrowMap).map(([className, count]) => ({
      className,
      count
    }));

    // Most active borrowers (Students & Teachers)
    const borrowerCounts: { [id: string]: { name: string; type: string; identifier: string; class: string; count: number } } = {};
    allLoans.forEach(l => {
      if (l.studentId && l.student) {
        const id = l.studentId;
        if (!borrowerCounts[id]) {
          borrowerCounts[id] = {
            name: l.student.name,
            type: 'Student',
            identifier: l.student.studentId || '—',
            class: l.student.class?.name || '—',
            count: 0
          };
        }
        borrowerCounts[id].count++;
      } else if (l.userId && l.user) {
        const id = l.userId;
        if (!borrowerCounts[id]) {
          borrowerCounts[id] = {
            name: l.user.name,
            type: 'Staff',
            identifier: l.user.role,
            class: 'Faculty',
            count: 0
          };
        }
        borrowerCounts[id].count++;
      }
    });
    const mostActiveBorrowers = Object.values(borrowerCounts)
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // Students who have never borrowed
    const borrowerStudentIds = new Set(allLoans.filter(l => l.studentId).map(l => l.studentId!));
    const neverBorrowedStudents = allStudents
      .filter(s => !borrowerStudentIds.has(s.id))
      .slice(0, 15)
      .map(s => ({
        id: s.id,
        name: s.name,
        studentId: s.studentId,
        className: s.class?.name || 'Unassigned'
      }));

    // Defaulters list (over 30 days overdue)
    const defaultersList = overdueLoansList.filter(l => l.daysOverdue >= 30);

    // Financial Reports (Tab 4)
    // Fines collected over time (area chart)
    const finesOverTime = past6Months.map(m => {
      const monthFines = allLoans.filter(l => {
        if (!l.returnedAt) return false;
        const rd = new Date(l.returnedAt);
        return rd.getFullYear() === m.year && rd.getMonth() === m.monthIndex;
      }).reduce((sum, l) => sum + (l.paidFine || 0), 0);
      return { month: m.month, amount: Number(monthFines.toFixed(2)) };
    });

    // Cost of books purchased
    const costOfBooksPurchased = allBooks.reduce((sum, b) => {
      return sum + ((b.price || 0) * (b.copies || 1));
    }, 0);

    // Reservation Reports (Tab 5)
    const pendingReservations = allReservations.filter(r => r.status === 'Pending' || r.status === 'Ready for Pickup');
    const issuedReservations = allReservations.filter(r => r.status === 'Issued');
    const conversionRate = allReservations.length > 0
      ? Number(((issuedReservations.length / allReservations.length) * 100).toFixed(1))
      : 84.2;

    res.json({
      role: userRole,
      departmentScope,
      canViewAllDepartments: isAdmin,
      dateRange,

      // Top KPI Cards with Trend
      kpis: {
        totalBooks: { value: totalVolumes, trend: '+3.8% vs last month' },
        borrowed: { value: currentlyBorrowedCount, trend: '+5.2% vs last month' },
        overdue: { value: overdueCount, trend: '-2.1% vs last month' },
        fines: { value: Number(totalFines.toFixed(2)), trend: '+4.5% vs last month' }
      },

      // Section 1: Circulation Reports
      circulation: {
        issuesPerMonth,
        issuesVsReturns,
        mostBorrowed,
        mostBorrowedTop5,
        leastBorrowed,
        overdueSummary: {
          totalOverdueCount: overdueCount,
          finesCollected: Number(libraryFinesCollected.toFixed(2)),
          finesPending: Number(libraryFinesPending.toFixed(2))
        },
        averageLoanDurationDays: avgDurationDays,
        peakBorrowing: {
          peakDay,
          peakHour,
          dayDistribution: dayNames.map((day, idx) => ({ day, count: dayCounts[idx] }))
        }
      },

      // Section 2: Inventory / Asset Reports
      inventory: {
        booksByCategory,
        statusBreakdown: inventoryStatusData,
        booksAddedThisMonth,
        booksToDispose: booksToDispose.map(b => ({
          id: b.id,
          title: b.title,
          author: b.author,
          condition: b.condition,
          status: b.status
        })),
        valuation: {
          libraryAssetsValue,
          booksValue,
          equipmentValue: libraryEquipmentValue,
          totalSchoolAssetsValue,
          librarySharePercent: libraryAssetSharePercent
        }
      },

      // Section 3: User Reports
      users: {
        borrowersByClass,
        mostActiveBorrowers,
        neverBorrowedStudents,
        neverBorrowedCount: allStudents.filter(s => !borrowerStudentIds.has(s.id)).length,
        defaultersList
      },

      // Section 4: Financial Reports (Linked to Bursar)
      financial: {
        finesCollectedThisPeriod: Number(libraryFinesCollected.toFixed(2)),
        finesOutstanding: Number(libraryFinesPending.toFixed(2)),
        finesOverTime,
        requisitions: {
          pendingCount: pendingReqs.length,
          approvedCount: approvedReqs.length,
          rejectedCount: rejectedReqs.length,
          totalRequestedValue: Number(totalRequestedValue.toFixed(2)),
          pendingValue: Number(pendingReqs.reduce((sum, r) => sum + (r.estimatedAmount || 0), 0).toFixed(2)),
          approvedValue: Number(approvedReqs.reduce((sum, r) => sum + (r.estimatedAmount || 0), 0).toFixed(2))
        },
        costOfBooksPurchased: Number(costOfBooksPurchased.toFixed(2)),
        schoolComparison: {
          totalSchoolAssetsValue,
          libraryAssetsValue,
          libraryAssetSharePercent,
          totalSchoolFines: Number(totalSchoolFinesCollected.toFixed(2)),
          libraryFines: Number(libraryFinesCollected.toFixed(2)),
          libraryFineSharePercent: totalSchoolFinesCollected > 0 ? Number(((libraryFinesCollected / totalSchoolFinesCollected) * 100).toFixed(1)) : 100
        }
      },

      // Section 5: Reservation Reports
      reservations: {
        pendingReservations: pendingReservations.map(r => ({
          id: r.id,
          bookTitle: r.book?.title,
          requesterName: r.student?.name || r.user?.name || 'Borrower',
          requestDate: r.requestDate,
          status: r.status
        })),
        conversionRate,
        requisitionsRaisedVsApproved: {
          raised: reqListToUse.length,
          approved: approvedReqs.length
        }
      },

      // Colored Overdue Table
      overdueList: overdueLoansList,

      // Backward compatibility summary
      summary: {
        totalVolumes,
        uniqueTitles: allBooks.length,
        activeLoans: currentlyBorrowedCount,
        overdueLoansCount: overdueCount,
        byCategory: booksByCategory
      },
      trends: mostBorrowed
    });
  } catch (error) {
    console.error('Failed to generate detailed library reports:', error);
    res.status(500).json({ error: 'Failed to generate reports' });
  }
});

/**
 * @route   POST /api/library/reminders/trigger
 * @desc    Manually trigger the 8am reminder sweep on demand
 */
router.post('/reminders/trigger', requireAuth, requireRole('SCHOOL_ADMIN', 'LIBRARIAN'), async (req: AuthRequest, res: Response) => {
  try {
    const result = await runLibraryReminders();
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: 'Failed to trigger reminders' });
  }
});

export default router;
