"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AutoPromoteSchema = exports.BulkClassAssignmentSchema = exports.SubmitAssignmentSchema = exports.GenerateReportSchema = exports.UpdateStudentSchema = exports.CreateStudentSchema = void 0;
const zod_1 = require("zod");
exports.CreateStudentSchema = zod_1.z.object({
    body: zod_1.z.object({
        studentId: zod_1.z.string().min(1, 'Student ID is required'),
        name: zod_1.z.string().min(2, 'Name is required'),
        email: zod_1.z.string().email('Invalid email').optional().or(zod_1.z.literal('')).nullable(),
        phone: zod_1.z.string().optional().nullable(),
        dob: zod_1.z.string().optional().nullable(),
        gender: zod_1.z.string().optional().nullable(),
        address: zod_1.z.string().optional().nullable(),
        classId: zod_1.z.string().optional().nullable(),
    })
});
exports.UpdateStudentSchema = zod_1.z.object({
    body: zod_1.z.object({
        name: zod_1.z.string().min(2, 'Name is required').optional(),
        email: zod_1.z.string().email('Invalid email').optional().or(zod_1.z.literal('')).nullable(),
        phone: zod_1.z.string().optional().nullable(),
        dob: zod_1.z.string().optional().nullable(),
        gender: zod_1.z.string().optional().nullable(),
        address: zod_1.z.string().optional().nullable(),
        classId: zod_1.z.string().optional().nullable(),
        status: zod_1.z.string().optional().nullable(),
        part: zod_1.z.union([zod_1.z.number(), zod_1.z.string()]).optional().nullable(),
        standing: zod_1.z.string().optional().nullable(),
    })
});
exports.GenerateReportSchema = zod_1.z.object({
    body: zod_1.z.object({
        term: zod_1.z.string().min(1, 'Term is required'),
        year: zod_1.z.union([zod_1.z.string(), zod_1.z.number()]),
    })
});
// Using preprocess to support both stringified JSON or raw objects for answers
exports.SubmitAssignmentSchema = zod_1.z.object({
    body: zod_1.z.object({
        answers: zod_1.z.preprocess((val) => {
            if (typeof val === 'string') {
                try {
                    return JSON.parse(val);
                }
                catch (e) {
                    return val;
                }
            }
            return val;
        }, zod_1.z.record(zod_1.z.string(), zod_1.z.any())).optional().nullable(),
    })
});
exports.BulkClassAssignmentSchema = zod_1.z.object({
    body: zod_1.z.object({
        studentIds: zod_1.z.array(zod_1.z.string()).min(1, 'At least one student ID is required'),
        targetClassId: zod_1.z.string().min(1, 'Target class ID is required'),
        targetPart: zod_1.z.union([zod_1.z.number(), zod_1.z.string()]).optional().nullable(),
    })
});
exports.AutoPromoteSchema = zod_1.z.object({
    body: zod_1.z.object({
        mappings: zod_1.z.array(zod_1.z.object({
            sourceClassId: zod_1.z.string(),
            targetClassId: zod_1.z.string(),
            targetPart: zod_1.z.union([zod_1.z.number(), zod_1.z.string()]).optional().nullable(),
        })).min(1, 'At least one mapping is required'),
    })
});
//# sourceMappingURL=student.schema.js.map