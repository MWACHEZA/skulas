"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.QuestionPaperSchema = exports.SubjectSchema = exports.BulkGradeSchema = void 0;
const zod_1 = require("zod");
/**
 * Schema for Bulk Grade Entry
 */
exports.BulkGradeSchema = zod_1.z.object({
    body: zod_1.z.object({
        classId: zod_1.z.string().min(1, 'Class ID is required'),
        subjectId: zod_1.z.string().min(1, 'Subject ID is required'),
        term: zod_1.z.string().min(1, 'Term is required'),
        year: zod_1.z.union([zod_1.z.string(), zod_1.z.number()]),
        results: zod_1.z.array(zod_1.z.object({
            studentId: zod_1.z.string().min(1, 'Student ID is required'),
            caScore: zod_1.z.number().optional().default(0),
            examScore: zod_1.z.number().optional().default(0),
            industrialScores: zod_1.z.record(zod_1.z.string(), zod_1.z.any()).optional(),
        })).min(1, 'At least one student result is required'),
    }),
});
/**
 * Schema for Subject Creation/Update
 */
exports.SubjectSchema = zod_1.z.object({
    body: zod_1.z.object({
        name: zod_1.z.string().min(2, 'Subject name is too short'),
        code: zod_1.z.string().min(2, 'Subject code is too short'),
        departmentId: zod_1.z.string().optional(),
        caWeight: zod_1.z.number().min(0).max(100).optional(),
        examWeight: zod_1.z.number().min(0).max(100).optional(),
        isIndustrial: zod_1.z.boolean().optional(),
    }),
});
/**
 * Schema for Question Paper Design
 */
exports.QuestionPaperSchema = zod_1.z.object({
    title: zod_1.z.string().min(1, 'Paper title is required'),
    description: zod_1.z.string().optional(),
    subjectId: zod_1.z.string().min(1, 'Subject is required'),
    duration: zod_1.z.number().optional(), // In minutes
    totalMarks: zod_1.z.number().optional(),
    instructions: zod_1.z.string().optional(),
    sections: zod_1.z.array(zod_1.z.object({
        id: zod_1.z.string(),
        title: zod_1.z.string(),
        instructions: zod_1.z.string().optional(),
        questions: zod_1.z.array(zod_1.z.object({
            id: zod_1.z.string(),
            type: zod_1.z.enum(['MULTIPLE_CHOICE', 'STRUCTURED', 'ESSAY']),
            text: zod_1.z.string().min(1, 'Question text is required'),
            options: zod_1.z.array(zod_1.z.string()).optional(),
            answer: zod_1.z.any().optional(),
            marks: zod_1.z.number().min(0).default(1),
        }))
    })).min(1, 'At least one section is required'),
});
//# sourceMappingURL=academic.schema.js.map