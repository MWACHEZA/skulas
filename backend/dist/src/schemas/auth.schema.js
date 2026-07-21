"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UpdateProfileSchema = exports.RegisterUserSchema = exports.LoginSchema = void 0;
const zod_1 = require("zod");
/**
 * Schema for User Login
 */
exports.LoginSchema = zod_1.z.object({
    body: zod_1.z.object({
        email: zod_1.z.string().email('Invalid email format').trim().toLowerCase(),
        password: zod_1.z.string().min(1, 'Password is required'),
        schoolCode: zod_1.z.string().optional(),
    }),
});
/**
 * Schema for User Registration (School or Portal User)
 */
exports.RegisterUserSchema = zod_1.z.object({
    body: zod_1.z.object({
        email: zod_1.z.string().email('Invalid email format').trim().toLowerCase(),
        password: zod_1.z.string().min(8, 'Password must be at least 8 characters long'),
        name: zod_1.z.string().min(2, 'Name is too short'),
        role: zod_1.z.enum(['STUDENT', 'TEACHER', 'PARENT', 'SCHOOL_ADMIN', 'SUPER_ADMIN', 'BURSAR', 'LIBRARIAN', 'ANCILLARY', 'SUPPLIER', 'ALUMNI', 'CLINIC']),
        phone: zod_1.z.string().optional(),
        schoolCode: zod_1.z.string().optional(),
        avatar: zod_1.z.string().nullable().optional(),
        // Role specific optional fields
        staffId: zod_1.z.string().optional(),
        studentId: zod_1.z.string().optional(),
        dob: zod_1.z.string().optional(),
        gender: zod_1.z.string().optional(),
        address: zod_1.z.string().optional(),
        departmentId: zod_1.z.string().optional(),
        // HR / Payroll / Social Fields
        bloodGroup: zod_1.z.string().optional(),
        dateAssumedPost: zod_1.z.string().optional(),
        dateOfLeaving: zod_1.z.string().optional(),
        designation: zod_1.z.string().optional(),
        accountNumber: zod_1.z.string().optional(),
        accountHolderName: zod_1.z.string().optional(),
        bankName: zod_1.z.string().optional(),
        bankBranch: zod_1.z.string().optional(),
        branchCode: zod_1.z.string().optional(),
        accountType: zod_1.z.string().optional(),
        // ZiG Banking Fields
        accountNumberZig: zod_1.z.string().optional(),
        accountHolderNameZig: zod_1.z.string().optional(),
        bankNameZig: zod_1.z.string().optional(),
        bankBranchZig: zod_1.z.string().optional(),
        branchCodeZig: zod_1.z.string().optional(),
        accountTypeZig: zod_1.z.string().optional(),
        facebookLink: zod_1.z.string().optional(),
        linkedinLink: zod_1.z.string().optional(),
        twitterLink: zod_1.z.string().optional(),
        // Student specific additional fields
        motherTongue: zod_1.z.string().optional(),
        nationality: zod_1.z.string().optional(),
        city: zod_1.z.string().optional(),
        state: zod_1.z.string().optional(),
        prevSchoolClass: zod_1.z.string().optional(),
        prevSchoolAddress: zod_1.z.string().optional(),
        hasTransferCertificate: zod_1.z.union([zod_1.z.string(), zod_1.z.boolean()]).optional(),
        isPhysicallyHandicapped: zod_1.z.union([zod_1.z.string(), zod_1.z.boolean()]).optional(),
        handicapDetails: zod_1.z.string().optional(),
        category: zod_1.z.string().optional(),
        section: zod_1.z.string().optional(),
        dormitory: zod_1.z.string().optional(),
        age: zod_1.z.union([zod_1.z.string(), zod_1.z.number()]).nullable().optional(),
        clubId: zod_1.z.string().optional(),
        hostelId: zod_1.z.string().optional(),
        roomId: zod_1.z.string().optional(),
        studentHouseId: zod_1.z.string().optional(),
        houseId: zod_1.z.string().optional(),
        metadata: zod_1.z.record(zod_1.z.string(), zod_1.z.any()).optional(),
        // Teacher / Staff specific
        subjects: zod_1.z.string().optional(),
        qualification: zod_1.z.string().optional(),
        religion: zod_1.z.string().optional(),
        maritalStatus: zod_1.z.string().optional(),
        spouseName: zod_1.z.string().optional(),
        spousePhone: zod_1.z.string().optional(),
        nokName: zod_1.z.string().optional(),
        nokRelation: zod_1.z.string().optional(),
        nokPhone: zod_1.z.string().optional(),
        nationalId: zod_1.z.string().optional(),
        // Student specific
        grade: zod_1.z.string().optional(),
        classId: zod_1.z.string().optional(),
        prevSchoolName: zod_1.z.string().optional(),
        prevSchool: zod_1.z.string().optional(),
        purposeForLeaving: zod_1.z.string().optional(),
        reasonForTransfer: zod_1.z.string().optional(),
        dateAdmitted: zod_1.z.string().optional(),
        lastGradeAchieved: zod_1.z.string().optional(),
        transferCertificate: zod_1.z.string().nullable().optional(),
        birthCertificate: zod_1.z.string().nullable().optional(),
        // Docs (base64)
        idDoc: zod_1.z.string().nullable().optional(),
        residenceDoc: zod_1.z.string().nullable().optional(),
        qualificationsDoc: zod_1.z.string().nullable().optional(),
        // Extra fields passed from various forms
        firstName: zod_1.z.string().optional(),
        lastName: zod_1.z.string().optional(),
    }),
});
/**
 * Schema for Profile Update
 */
exports.UpdateProfileSchema = zod_1.z.object({
    body: zod_1.z.object({
        name: zod_1.z.string().min(2, 'Name is too short').optional(),
        email: zod_1.z.string().email('Invalid email').optional(),
        phone: zod_1.z.string().optional(),
        avatar: zod_1.z.string().optional(),
        address: zod_1.z.string().optional(),
        gender: zod_1.z.string().optional(),
        dob: zod_1.z.string().optional(),
        religion: zod_1.z.string().optional(),
        // Academic fields
        prevSchool: zod_1.z.string().optional(),
        reasonForTransfer: zod_1.z.string().optional(),
        lastGradeAchieved: zod_1.z.string().optional(),
        admissionsNotes: zod_1.z.string().optional(),
        // Linked parents info
        parents: zod_1.z.array(zod_1.z.object({
            parentId: zod_1.z.string(),
            name: zod_1.z.string(),
            email: zod_1.z.string().email('Invalid email'),
            phone: zod_1.z.string().optional()
        })).optional(),
        // Allow HR updates
        bloodGroup: zod_1.z.string().optional(),
        accountNumber: zod_1.z.string().optional(),
        accountHolderName: zod_1.z.string().optional(),
        bankName: zod_1.z.string().optional(),
        bankBranch: zod_1.z.string().optional(),
        branchCode: zod_1.z.string().optional(),
        accountType: zod_1.z.string().optional(),
        facebookLink: zod_1.z.string().optional(),
        linkedinLink: zod_1.z.string().optional(),
        twitterLink: zod_1.z.string().optional(),
        metadata: zod_1.z.any().optional(),
    }),
});
//# sourceMappingURL=auth.schema.js.map