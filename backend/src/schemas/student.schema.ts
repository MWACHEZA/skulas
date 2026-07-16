import { z } from 'zod';

export const CreateStudentSchema = z.object({
  body: z.object({
    studentId: z.string().min(1, 'Student ID is required'),
    name: z.string().min(2, 'Name is required'),
    email: z.string().email('Invalid email').optional().or(z.literal('')).nullable(),
    phone: z.string().optional().nullable(),
    dob: z.string().optional().nullable(),
    gender: z.string().optional().nullable(),
    address: z.string().optional().nullable(),
    classId: z.string().optional().nullable(),
  })
});

export const UpdateStudentSchema = z.object({
  body: z.object({
    name: z.string().min(2, 'Name is required').optional(),
    email: z.string().email('Invalid email').optional().or(z.literal('')).nullable(),
    phone: z.string().optional().nullable(),
    dob: z.string().optional().nullable(),
    gender: z.string().optional().nullable(),
    address: z.string().optional().nullable(),
    classId: z.string().optional().nullable(),
    status: z.string().optional().nullable(),
    part: z.union([z.number(), z.string()]).optional().nullable(),
    standing: z.string().optional().nullable(),
  })
});

export const GenerateReportSchema = z.object({
  body: z.object({
    term: z.string().min(1, 'Term is required'),
    year: z.union([z.string(), z.number()]),
  })
});

// Using preprocess to support both stringified JSON or raw objects for answers
export const SubmitAssignmentSchema = z.object({
  body: z.object({
    answers: z.preprocess(
      (val) => {
        if (typeof val === 'string') {
          try { return JSON.parse(val); } catch (e) { return val; }
        }
        return val;
      },
      z.record(z.string(), z.any())
    ).optional().nullable(),
  })
});

export const BulkClassAssignmentSchema = z.object({
  body: z.object({
    studentIds: z.array(z.string()).min(1, 'At least one student ID is required'),
    targetClassId: z.string().min(1, 'Target class ID is required'),
    targetPart: z.union([z.number(), z.string()]).optional().nullable(),
  })
});

export const AutoPromoteSchema = z.object({
  body: z.object({
    mappings: z.array(
      z.object({
        sourceClassId: z.string(),
        targetClassId: z.string(),
        targetPart: z.union([z.number(), z.string()]).optional().nullable(),
      })
    ).min(1, 'At least one mapping is required'),
  })
});
