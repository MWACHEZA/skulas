import { z } from 'zod';

export const CreateAssignmentSchema = z.object({
  body: z.object({
    title: z.string().min(1, 'Title is required'),
    description: z.string().optional().nullable(),
    subjectId: z.string().min(1, 'Subject ID is required'),
    classId: z.string().min(1, 'Class ID is required'),
    dueDate: z.string().datetime().optional().nullable(),
    maxScore: z.union([z.number(), z.string()]).optional().nullable(),
    category: z.string().optional().nullable(),
    timeLimit: z.union([z.number(), z.string()]).optional().nullable(),
    allowLate: z.union([z.boolean(), z.string()]).optional().nullable(),
    questions: z.preprocess(
      (val) => {
        if (typeof val === 'string') {
          try { return JSON.parse(val); } catch (e) { return val; }
        }
        return val;
      },
      z.array(z.any())
    ).optional().nullable(),
  })
});

export const UpdateAssignmentAcceptingSchema = z.object({
  body: z.object({
    isAccepting: z.union([z.boolean(), z.string()]).optional().nullable(),
  })
});

export const GradeSubmissionSchema = z.object({
  body: z.object({
    grade: z.union([z.number(), z.string()]).optional().nullable(),
    feedback: z.string().optional().nullable(),
  })
});

export const BulkAttendanceSchema = z.object({
  body: z.object({
    date: z.string().datetime().or(z.string()),
    records: z.array(
      z.object({
        studentId: z.string(),
        status: z.string(),
        note: z.string().optional().nullable(),
      })
    ).min(1, 'At least one record is required'),
  })
});

export const AssignBookSchema = z.object({
  body: z.object({
    bookId: z.string().min(1, 'Book ID is required'),
    classId: z.string().min(1, 'Class ID is required'),
    dueDate: z.string().optional().nullable(),
  })
});

export const AssignTeacherClassSchema = z.object({
  body: z.object({
    classId: z.string().min(1, 'Class ID is required'),
    subjectId: z.string().min(1, 'Subject ID is required'),
    isClassTeacher: z.union([z.boolean(), z.string()]).optional().nullable(),
  })
});
