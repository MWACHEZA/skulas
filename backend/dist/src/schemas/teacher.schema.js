"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AssignTeacherClassSchema = exports.AssignBookSchema = exports.BulkAttendanceSchema = exports.GradeSubmissionSchema = exports.UpdateAssignmentAcceptingSchema = exports.CreateAssignmentSchema = void 0;
const zod_1 = require("zod");
exports.CreateAssignmentSchema = zod_1.z.object({
    body: zod_1.z.object({
        title: zod_1.z.string().min(1, 'Title is required'),
        description: zod_1.z.string().optional().nullable(),
        subjectId: zod_1.z.string().min(1, 'Subject ID is required'),
        classId: zod_1.z.string().min(1, 'Class ID is required'),
        dueDate: zod_1.z.string().datetime().optional().nullable(),
        maxScore: zod_1.z.union([zod_1.z.number(), zod_1.z.string()]).optional().nullable(),
        category: zod_1.z.string().optional().nullable(),
        timeLimit: zod_1.z.union([zod_1.z.number(), zod_1.z.string()]).optional().nullable(),
        allowLate: zod_1.z.union([zod_1.z.boolean(), zod_1.z.string()]).optional().nullable(),
        questions: zod_1.z.preprocess((val) => {
            if (typeof val === 'string') {
                try {
                    return JSON.parse(val);
                }
                catch (e) {
                    return val;
                }
            }
            return val;
        }, zod_1.z.array(zod_1.z.any())).optional().nullable(),
    })
});
exports.UpdateAssignmentAcceptingSchema = zod_1.z.object({
    body: zod_1.z.object({
        isAccepting: zod_1.z.union([zod_1.z.boolean(), zod_1.z.string()]).optional().nullable(),
    })
});
exports.GradeSubmissionSchema = zod_1.z.object({
    body: zod_1.z.object({
        grade: zod_1.z.union([zod_1.z.number(), zod_1.z.string()]).optional().nullable(),
        feedback: zod_1.z.string().optional().nullable(),
    })
});
exports.BulkAttendanceSchema = zod_1.z.object({
    body: zod_1.z.object({
        date: zod_1.z.string().datetime().or(zod_1.z.string()),
        records: zod_1.z.array(zod_1.z.object({
            studentId: zod_1.z.string(),
            status: zod_1.z.string(),
            note: zod_1.z.string().optional().nullable(),
        })).min(1, 'At least one record is required'),
    })
});
exports.AssignBookSchema = zod_1.z.object({
    body: zod_1.z.object({
        bookId: zod_1.z.string().min(1, 'Book ID is required'),
        classId: zod_1.z.string().min(1, 'Class ID is required'),
        dueDate: zod_1.z.string().optional().nullable(),
    })
});
exports.AssignTeacherClassSchema = zod_1.z.object({
    body: zod_1.z.object({
        classId: zod_1.z.string().min(1, 'Class ID is required'),
        subjectId: zod_1.z.string().min(1, 'Subject ID is required'),
        isClassTeacher: zod_1.z.union([zod_1.z.boolean(), zod_1.z.string()]).optional().nullable(),
    })
});
//# sourceMappingURL=teacher.schema.js.map