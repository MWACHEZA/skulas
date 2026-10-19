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
    submissionText: z.string().optional().nullable(),
    notes: z.string().optional().nullable(),
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

export const ClassMigrationWizardSchema = z.object({
  body: z.object({
    sourceClassId: z.string().min(1, 'Source class ID is required'),
    targetAcademicYear: z.union([z.string(), z.number()]).transform((val) => Number(val)),
    targetTerm: z.union([z.string(), z.number()]).default(1),
    decisions: z.array(
      z.object({
        studentId: z.string().min(1, 'Student ID is required'),
        action: z.enum(['PROMOTE', 'REPEAT', 'GRADUATE']),
        targetClassId: z.string().optional().nullable(),
        targetPart: z.union([z.number(), z.string()]).optional().nullable(),
        note: z.string().optional().nullable(),
      })
    ).min(1, 'At least one student decision is required'),
    options: z.object({
      carryForwardFees: z.boolean().default(true),
      resetBoardingAllocation: z.boolean().default(true),
      graduatedRoleAlumni: z.boolean().default(true),
    }).optional().default({
      carryForwardFees: true,
      resetBoardingAllocation: true,
      graduatedRoleAlumni: true,
    })
  })
});
