import { z } from 'zod';

export const ProcessDailyFinesSchema = z.object({
  schoolId: z.string().optional(),
  asOfDate: z.string().datetime().optional()
});

export const ReturnBookLoanSchema = z.object({
  returnDate: z.string().datetime().optional(),
  condition: z.enum(['New', 'Good', 'Fair', 'Damaged', 'Lost']).optional(),
  waivedAmount: z.number().min(0).optional(),
  waiverReason: z.string().optional()
});

export const WaiveLoanFineSchema = z.object({
  fineId: z.string().optional(),
  amount: z.number().positive('Waiver amount must be strictly greater than 0'),
  reason: z.string().min(3, 'Waiver reason is required'),
  authorizedById: z.string().optional()
});

export const LinkBookSyllabusSchema = z.object({
  syllabusId: z.string().min(1, 'Syllabus ID is required'),
  curriculum: z.string().optional(), // ZIMSEC, Cambridge, National
  level: z.string().optional(), // O-Level, A-Level, Primary
  topics: z.array(z.string()).optional()
});

export const BorrowBookSchema = z.object({
  bookId: z.string().min(1, 'Book ID is required'),
  studentId: z.string().optional(),
  userId: z.string().optional(),
  loanType: z.enum(['LIBRARY', 'TEXTBOOK']).default('LIBRARY'),
  dueDate: z.string().datetime().optional(),
  notes: z.string().optional()
});

export const SearchCatalogueSchema = z.object({
  search: z.string().optional(),
  categoryId: z.string().optional(),
  subjectId: z.string().optional(),
  syllabusId: z.string().optional(),
  curriculum: z.string().optional(),
  level: z.string().optional(),
  availableOnly: z.enum(['true', 'false']).optional().transform(v => v === 'true')
});
