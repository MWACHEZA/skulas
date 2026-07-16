import { Router, Response } from 'express';
import path from 'path';
import prisma from '../lib/prisma';
import { requireAuth, requireRole, AuthRequest } from '../middleware/auth';
import { libraryUpload } from '../middleware/upload';

const router = Router();

/**
 * @route   GET /api/library/books
 * @desc    Get all books in the catalog
 */
router.get('/books', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const books = await prisma.book.findMany({
      where: { schoolId: req.user!.schoolId! },
      include: { category: true },
      orderBy: { title: 'asc' }
    });
    // For backwards compatibility and UI mapping
    const formattedBooks = books.map(book => ({
      ...book,
      categoryName: book.category?.name || 'Uncategorized',
      totalCopies: book.copies 
    }));
    res.json(formattedBooks);
  } catch (error) {
    console.error('Fetch books error:', error);
    res.status(500).json({ error: 'Failed to load library catalog' });
  }
});

/**
 * @route   GET /api/library/categories
 * @desc    Get custom library categories and book counts
 */
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
    console.error('Fetch categories error:', error);
    res.status(500).json({ error: 'Failed to load resource categories' });
  }
});

/**
 * @route   POST /api/library/categories
 * @desc    Create a new library category
 */
router.post('/categories', requireAuth, requireRole('SCHOOL_ADMIN', 'LIBRARIAN'), async (req: AuthRequest, res: Response) => {
  const { name } = req.body;
  const schoolId = req.user!.schoolId!;
  try {
    const category = await prisma.libraryCategory.create({
      data: { name, schoolId }
    });
    res.status(201).json(category);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create category' });
  }
});

/**
 * @route   GET /api/library/reports
 * @desc    Get analytical reports for the librarian
 */
router.get('/reports', requireAuth, async (req: AuthRequest, res: Response) => {
  const schoolId = req.user!.schoolId!;
  try {
    const [totalBooks, categoryDistribution, activeLoans, overdueCount] = await Promise.all([
      prisma.book.aggregate({
        where: { schoolId },
        _sum: { copies: true }
      }),
      prisma.libraryCategory.findMany({
        where: { schoolId },
        include: { _count: { select: { books: true } } }
      }),
      prisma.bookLoan.count({
        where: { schoolId, status: 'borrowed' }
      }),
      prisma.bookLoan.count({
        where: { 
          schoolId, 
          status: 'borrowed', 
          dueDate: { lt: new Date() } 
        }
      })
    ]);

    // Fetch detailed overdue loans
    const overdueLoans = await prisma.bookLoan.findMany({
      where: {
        schoolId,
        status: 'borrowed',
        dueDate: { lt: new Date() }
      },
      include: {
        book: { select: { title: true, author: true } },
        student: { select: { name: true, studentId: true } },
        user: { select: { name: true, email: true } }
      },
      orderBy: { dueDate: 'asc' }
    });

    // Fetch detailed inventory list
    const inventoryList = await prisma.book.findMany({
      where: { schoolId },
      include: {
        category: { select: { name: true } }
      },
      orderBy: { title: 'asc' }
    });

    // Fetch popular books/trends
    const popularBooks = await prisma.book.findMany({
      where: { schoolId },
      include: {
        category: { select: { name: true } },
        _count: { select: { loans: true } }
      },
      orderBy: {
        loans: {
          _count: 'desc'
        }
      },
      take: 10
    });

    res.json({
      summary: {
        totalVolumes: totalBooks._sum.copies || 0,
        uniqueTitles: await prisma.book.count({ where: { schoolId } }),
        activeLoans,
        overdueLoansCount: overdueCount,
        byCategory: categoryDistribution.map(c => ({ name: c.name, count: c._count.books }))
      },
      overdueLoans,
      inventory: inventoryList,
      trends: popularBooks.map(b => ({
        id: b.id,
        title: b.title,
        author: b.author,
        category: b.category?.name || 'Uncategorized',
        borrowCount: b._count.loans
      }))
    });
  } catch (error) {
    console.error('Error generating library reports:', error);
    res.status(500).json({ error: 'Failed to generate reports' });
  }
});

/**
 * @route   GET /api/library/digital
 * @desc    Get all digital resources (books with PDF/files)
 */
router.get('/digital', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const digitalBooks = await prisma.book.findMany({
      where: { 
        schoolId: req.user!.schoolId!,
        pdfUrl: { not: null }
      },
      include: { category: true },
      orderBy: { title: 'asc' }
    });
    res.json(digitalBooks);
  } catch (error) {
    res.status(500).json({ error: 'Failed to load digital repository' });
  }
});

/**
 * @route   GET /api/library/loans/overdue
 * @desc    Get all overdue loans
 */
router.get('/loans/overdue', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const overdueLoans = await prisma.bookLoan.findMany({
      where: { 
        schoolId: req.user!.schoolId!,
        returnedAt: null,
        dueDate: { lt: new Date() }
      },
      include: {
        book: true,
        student: { include: { user: { select: { name: true } }, class: true } }
      },
      orderBy: { dueDate: 'asc' }
    });
    res.json(overdueLoans);
  } catch (error) {
    res.status(500).json({ error: 'Failed to load overdue records' });
  }
});

/**
 * @route   POST /api/library/books
 * @desc    Add a new book to the catalog (with optional cover/PDF)
 */
router.post('/books', requireAuth, requireRole('SCHOOL_ADMIN', 'ANCILLARY', 'TEACHER', 'LIBRARIAN'), libraryUpload.fields([
  { name: 'cover', maxCount: 1 },
  { name: 'pdf', maxCount: 1 }
]), async (req: AuthRequest, res: Response) => {
  const { 
    title, author, isbn, categoryId, totalCopies,
    edition, publisher, price, publishedDate, description,
    status, subjectId, classId 
  } = req.body;
  const schoolId = req.user!.schoolId!;
  const files = req.files as { [fieldname: string]: Express.Multer.File[] };

  try {
    let teacherId = null;
    if (req.user!.role === 'TEACHER') {
      const teacher = await prisma.teacher.findFirst({ where: { userId: req.user!.id } });
      if (teacher) {
        teacherId = teacher.id;
      }
    }

    const book = await prisma.book.create({
      data: {
        title,
        author,
        isbn,
        categoryId,
        edition,
        publisher,
        price: price ? parseFloat(price) : null,
        publishedDate: publishedDate ? new Date(publishedDate) : null,
        description,
        status: status || 'Available',
        subjectId,
        classId,
        copies: parseInt(totalCopies) || 1,
        available: parseInt(totalCopies) || 1,
        coverUrl: files?.cover?.[0] ? path.join(req.uploadCategoryPath || '', files.cover[0].filename).replace(/\\/g, '/') : null,
        pdfUrl: files?.pdf?.[0] ? path.join(req.uploadCategoryPath || '', files.pdf[0].filename).replace(/\\/g, '/') : null,
        schoolId,
        teacherId
      }
    });
    res.status(201).json(book);
  } catch (error) {
    console.error('Book creation error:', error);
    res.status(500).json({ error: 'Failed to register book' });
  }
});

/**
 * @route   PATCH /api/library/books/:id
 * @desc    Update book details or upload files
 */
router.patch('/books/:id', requireAuth, requireRole('SCHOOL_ADMIN', 'ANCILLARY', 'TEACHER', 'LIBRARIAN'), libraryUpload.fields([
  { name: 'cover', maxCount: 1 },
  { name: 'pdf', maxCount: 1 }
]), async (req: AuthRequest, res: Response) => {
  const id = req.params.id as string;
  const { 
    title, author, isbn, categoryId, totalCopies,
    edition, publisher, price, publishedDate, description,
    status, subjectId, classId 
  } = req.body;
  const files = req.files as { [fieldname: string]: Express.Multer.File[] };

  try {
    const data: any = { 
      title, author, isbn, categoryId,
      edition, publisher, description, status,
      subjectId, classId
    };
    if (totalCopies) {
      data.copies = parseInt(totalCopies);
      // Logic for available adjustment can be more complex, but for now:
      data.available = parseInt(totalCopies); 
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

/**
 * @route   GET /api/library/my-books
 * @desc    Get current user's library loans (both staff and student)
 */
router.get('/my-books', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    // If the user is a student, their student ID would normally be used,
    // but we can query by userId directly since we added it to BookLoan.
    // For backwards compatibility we check both.
    
    // First, let's find if they have a student profile
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
        book: { select: { title: true, author: true, isbn: true, categoryId: true } }
      },
      orderBy: { borrowedAt: 'desc' }
    });
    
    // Add category as string for frontend compatibility
    const formattedLoans = await Promise.all(loans.map(async l => {
      let categoryName = 'General';
      if (l.book.categoryId) {
        const cat = await prisma.libraryCategory.findFirst({ where: { id: l.book.categoryId } });
        if (cat) categoryName = cat.name;
      }
      return {
        ...l,
        book: {
          ...l.book,
          category: categoryName
        }
      };
    }));

    res.json(formattedLoans);
  } catch (error) {
    console.error('Failed to fetch user books:', error);
    res.status(500).json({ error: 'Failed to fetch your books' });
  }
});

/**
 * @route   GET /api/library/loans
 * @desc    Get all active/recent loans
 */
router.get('/loans', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const loans = await prisma.bookLoan.findMany({
      where: { 
        schoolId: req.user!.schoolId!
      },
      include: {
        book: true,
        student: { include: { user: { select: { name: true } } } }
      },
      orderBy: { borrowedAt: 'desc' }
    });
    res.json(loans);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch loan records' });
  }
});

/**
 * @route   POST /api/library/loans/issue
 * @desc    Hand out a book to a student (Individual Loan)
 */
router.post('/loans/issue', requireAuth, requireRole('SCHOOL_ADMIN', 'ANCILLARY', 'TEACHER', 'LIBRARIAN'), async (req: AuthRequest, res: Response) => {
  const { studentId, userId, bookId, dueDate, loanType = 'LIBRARY' } = req.body;

  try {
    const loan = await prisma.$transaction(async (tx) => {
      // Atomically decrement available — fails if already 0
      const stockUpdate = await tx.book.updateMany({
        where: { id: bookId, available: { gt: 0 } },
        data: { available: { decrement: 1 } }
      });

      if (stockUpdate.count === 0) {
        throw new Error('Book not available for loan');
      }

      return tx.bookLoan.create({
        data: {
          schoolId: req.user!.schoolId!,
          studentId,
          userId,
          bookId,
          dueDate: new Date(dueDate),
          loanType,
          status: 'borrowed'
        }
      });
    });

    res.status(201).json(loan);
  } catch (error: any) {
    res.status(400).json({ error: error.message || 'Failed to issue book' });
  }
});

/**
 * @route   POST /api/library/loans/:id/return
 * @desc    Give back a book (Mark Returned)
 */
router.post('/loans/:id/return', requireAuth, requireRole('SCHOOL_ADMIN', 'ANCILLARY', 'TEACHER', 'LIBRARIAN'), async (req: AuthRequest, res: Response) => {
  const id = req.params.id as string;

  try {
    const updatedLoan = await prisma.$transaction(async (tx) => {
      // Mark returned atomically — only if currently borrowed
      const returnResult = await tx.bookLoan.updateMany({
        where: { id, status: 'borrowed' },
        data: { status: 'returned', returnedAt: new Date() }
      });

      if (returnResult.count === 0) {
        throw new Error('Invalid loan record or already returned');
      }

      const loan = await tx.bookLoan.findFirst({ where: { id } });
      await tx.book.update({
        where: { id: loan!.bookId },
        data: { available: { increment: 1 } }
      });

      return loan;
    });

    res.json(updatedLoan);
  } catch (error: any) {
    res.status(400).json({ error: error.message || 'Failed to process return' });
  }
});

export default router;
