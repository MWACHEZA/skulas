import { z } from 'zod';

export const CreateDisciplineRecordSchema = z.object({
  body: z.object({
    studentId: z.string().min(1, 'Student ID is required'),
    type: z.enum(['MERIT', 'DEMERIT']).default('DEMERIT'),
    points: z.coerce.number().min(0).default(1),
    offenceType: z.string().min(1, 'Offence/Merit category is required'),
    description: z.string().min(1, 'Description is required'),
    severity: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).optional().default('MEDIUM'),
    actionTaken: z.string().optional().nullable(),
    date: z.union([z.string(), z.date()]).optional()
  })
});

export const ApproveDemeritSchema = z.object({
  body: z.object({
    notes: z.string().optional()
  }).optional()
});

export const RejectDemeritSchema = z.object({
  body: z.object({
    reason: z.string().min(1, 'Rejection reason is required')
  })
});
