import { z } from 'zod';
export declare const CreateStudentSchema: z.ZodObject<{
    body: z.ZodObject<{
        studentId: z.ZodString;
        name: z.ZodString;
        email: z.ZodNullable<z.ZodUnion<[z.ZodOptional<z.ZodString>, z.ZodLiteral<"">]>>;
        phone: z.ZodNullable<z.ZodOptional<z.ZodString>>;
        dob: z.ZodNullable<z.ZodOptional<z.ZodString>>;
        gender: z.ZodNullable<z.ZodOptional<z.ZodString>>;
        address: z.ZodNullable<z.ZodOptional<z.ZodString>>;
        classId: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    }, z.core.$strip>;
}, z.core.$strip>;
export declare const UpdateStudentSchema: z.ZodObject<{
    body: z.ZodObject<{
        name: z.ZodOptional<z.ZodString>;
        email: z.ZodNullable<z.ZodUnion<[z.ZodOptional<z.ZodString>, z.ZodLiteral<"">]>>;
        phone: z.ZodNullable<z.ZodOptional<z.ZodString>>;
        dob: z.ZodNullable<z.ZodOptional<z.ZodString>>;
        gender: z.ZodNullable<z.ZodOptional<z.ZodString>>;
        address: z.ZodNullable<z.ZodOptional<z.ZodString>>;
        classId: z.ZodNullable<z.ZodOptional<z.ZodString>>;
        status: z.ZodNullable<z.ZodOptional<z.ZodString>>;
        part: z.ZodNullable<z.ZodOptional<z.ZodUnion<readonly [z.ZodNumber, z.ZodString]>>>;
        standing: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    }, z.core.$strip>;
}, z.core.$strip>;
export declare const GenerateReportSchema: z.ZodObject<{
    body: z.ZodObject<{
        term: z.ZodString;
        year: z.ZodUnion<readonly [z.ZodString, z.ZodNumber]>;
    }, z.core.$strip>;
}, z.core.$strip>;
export declare const SubmitAssignmentSchema: z.ZodObject<{
    body: z.ZodObject<{
        answers: z.ZodNullable<z.ZodOptional<z.ZodPipe<z.ZodTransform<any, unknown>, z.ZodRecord<z.ZodString, z.ZodAny>>>>;
    }, z.core.$strip>;
}, z.core.$strip>;
export declare const BulkClassAssignmentSchema: z.ZodObject<{
    body: z.ZodObject<{
        studentIds: z.ZodArray<z.ZodString>;
        targetClassId: z.ZodString;
        targetPart: z.ZodNullable<z.ZodOptional<z.ZodUnion<readonly [z.ZodNumber, z.ZodString]>>>;
    }, z.core.$strip>;
}, z.core.$strip>;
export declare const AutoPromoteSchema: z.ZodObject<{
    body: z.ZodObject<{
        mappings: z.ZodArray<z.ZodObject<{
            sourceClassId: z.ZodString;
            targetClassId: z.ZodString;
            targetPart: z.ZodNullable<z.ZodOptional<z.ZodUnion<readonly [z.ZodNumber, z.ZodString]>>>;
        }, z.core.$strip>>;
    }, z.core.$strip>;
}, z.core.$strip>;
