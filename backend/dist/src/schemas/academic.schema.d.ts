import { z } from 'zod';
/**
 * Schema for Bulk Grade Entry
 */
export declare const BulkGradeSchema: z.ZodObject<{
    body: z.ZodObject<{
        classId: z.ZodString;
        subjectId: z.ZodString;
        term: z.ZodString;
        year: z.ZodUnion<readonly [z.ZodString, z.ZodNumber]>;
        results: z.ZodArray<z.ZodObject<{
            studentId: z.ZodString;
            caScore: z.ZodDefault<z.ZodOptional<z.ZodNumber>>;
            examScore: z.ZodDefault<z.ZodOptional<z.ZodNumber>>;
            industrialScores: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodAny>>;
        }, z.core.$strip>>;
    }, z.core.$strip>;
}, z.core.$strip>;
/**
 * Schema for Subject Creation/Update
 */
export declare const SubjectSchema: z.ZodObject<{
    body: z.ZodObject<{
        name: z.ZodString;
        code: z.ZodString;
        departmentId: z.ZodOptional<z.ZodString>;
        caWeight: z.ZodOptional<z.ZodNumber>;
        examWeight: z.ZodOptional<z.ZodNumber>;
        isIndustrial: z.ZodOptional<z.ZodBoolean>;
    }, z.core.$strip>;
}, z.core.$strip>;
/**
 * Schema for Question Paper Design
 */
export declare const QuestionPaperSchema: z.ZodObject<{
    title: z.ZodString;
    description: z.ZodOptional<z.ZodString>;
    subjectId: z.ZodString;
    duration: z.ZodOptional<z.ZodNumber>;
    totalMarks: z.ZodOptional<z.ZodNumber>;
    instructions: z.ZodOptional<z.ZodString>;
    sections: z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        title: z.ZodString;
        instructions: z.ZodOptional<z.ZodString>;
        questions: z.ZodArray<z.ZodObject<{
            id: z.ZodString;
            type: z.ZodEnum<{
                MULTIPLE_CHOICE: "MULTIPLE_CHOICE";
                STRUCTURED: "STRUCTURED";
                ESSAY: "ESSAY";
            }>;
            text: z.ZodString;
            options: z.ZodOptional<z.ZodArray<z.ZodString>>;
            answer: z.ZodOptional<z.ZodAny>;
            marks: z.ZodDefault<z.ZodNumber>;
        }, z.core.$strip>>;
    }, z.core.$strip>>;
}, z.core.$strip>;
