import { z } from 'zod';
/**
 * Schema for Bulk Grade Entry
 */
export const BulkGradeSchema = z.object({
    body: z.object({
        classId: z.string().min(1, 'Class ID is required'),
        subjectId: z.string().min(1, 'Subject ID is required'),
        term: z.string().min(1, 'Term is required'),
        year: z.union([z.string(), z.number()]),
        results: z.array(z.object({
            studentId: z.string().min(1, 'Student ID is required'),
            caScore: z.number().optional().default(0),
            examScore: z.number().optional().default(0),
            industrialScores: z.record(z.string(), z.any()).optional(),
        })).min(1, 'At least one student result is required'),
    }),
});
/**
 * Schema for Subject Creation/Update
 */
export const SubjectSchema = z.object({
    body: z.object({
        name: z.string().min(2, 'Subject name is too short'),
        code: z.string().min(2, 'Subject code is too short'),
        departmentId: z.string().optional(),
        caWeight: z.number().min(0).max(100).optional(),
        examWeight: z.number().min(0).max(100).optional(),
        isIndustrial: z.boolean().optional(),
    }),
});
/**
 * Schema for Question Paper Design
 */
export const QuestionPaperSchema = z.object({
    title: z.string().min(1, 'Paper title is required'),
    description: z.string().optional(),
    subjectId: z.string().min(1, 'Subject is required'),
    duration: z.number().optional(), // In minutes
    totalMarks: z.number().optional(),
    instructions: z.string().optional(),
    sections: z.array(z.object({
        id: z.string(),
        title: z.string(),
        instructions: z.string().optional(),
        questions: z.array(z.object({
            id: z.string(),
            type: z.enum(['MULTIPLE_CHOICE', 'STRUCTURED', 'ESSAY']),
            text: z.string().min(1, 'Question text is required'),
            options: z.array(z.string()).optional(),
            answer: z.any().optional(),
            marks: z.number().min(0).default(1),
        }))
    })).min(1, 'At least one section is required'),
});
//# sourceMappingURL=academic.schema.js.map