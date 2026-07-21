import { z } from 'zod';
export declare const CreateAssignmentSchema: z.ZodObject<{
    body: z.ZodObject<{
        title: z.ZodString;
        description: z.ZodNullable<z.ZodOptional<z.ZodString>>;
        subjectId: z.ZodString;
        classId: z.ZodString;
        dueDate: z.ZodNullable<z.ZodOptional<z.ZodString>>;
        maxScore: z.ZodNullable<z.ZodOptional<z.ZodUnion<readonly [z.ZodNumber, z.ZodString]>>>;
        category: z.ZodNullable<z.ZodOptional<z.ZodString>>;
        timeLimit: z.ZodNullable<z.ZodOptional<z.ZodUnion<readonly [z.ZodNumber, z.ZodString]>>>;
        allowLate: z.ZodNullable<z.ZodOptional<z.ZodUnion<readonly [z.ZodBoolean, z.ZodString]>>>;
        questions: z.ZodNullable<z.ZodOptional<z.ZodPipe<z.ZodTransform<any, unknown>, z.ZodArray<z.ZodAny>>>>;
    }, z.core.$strip>;
}, z.core.$strip>;
export declare const UpdateAssignmentAcceptingSchema: z.ZodObject<{
    body: z.ZodObject<{
        isAccepting: z.ZodNullable<z.ZodOptional<z.ZodUnion<readonly [z.ZodBoolean, z.ZodString]>>>;
    }, z.core.$strip>;
}, z.core.$strip>;
export declare const GradeSubmissionSchema: z.ZodObject<{
    body: z.ZodObject<{
        grade: z.ZodNullable<z.ZodOptional<z.ZodUnion<readonly [z.ZodNumber, z.ZodString]>>>;
        feedback: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    }, z.core.$strip>;
}, z.core.$strip>;
export declare const BulkAttendanceSchema: z.ZodObject<{
    body: z.ZodObject<{
        date: z.ZodUnion<[z.ZodString, z.ZodString]>;
        records: z.ZodArray<z.ZodObject<{
            studentId: z.ZodString;
            status: z.ZodString;
            note: z.ZodNullable<z.ZodOptional<z.ZodString>>;
        }, z.core.$strip>>;
    }, z.core.$strip>;
}, z.core.$strip>;
export declare const AssignBookSchema: z.ZodObject<{
    body: z.ZodObject<{
        bookId: z.ZodString;
        classId: z.ZodString;
        dueDate: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    }, z.core.$strip>;
}, z.core.$strip>;
export declare const AssignTeacherClassSchema: z.ZodObject<{
    body: z.ZodObject<{
        classId: z.ZodString;
        subjectId: z.ZodString;
        isClassTeacher: z.ZodNullable<z.ZodOptional<z.ZodUnion<readonly [z.ZodBoolean, z.ZodString]>>>;
    }, z.core.$strip>;
}, z.core.$strip>;
