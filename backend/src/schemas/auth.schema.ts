import { z } from 'zod';

/**
 * Schema for User Login
 */
export const LoginSchema = z.object({
  body: z.object({
    email: z.string().email('Invalid email format').trim().toLowerCase(),
    password: z.string().min(1, 'Password is required'),
    schoolCode: z.string().optional(),
  }),
});

/**
 * Schema for User Registration (School or Portal User)
 */
export const RegisterUserSchema = z.object({
  body: z.object({
    email: z.string().email('Invalid email format').trim().toLowerCase(),
    password: z.string().min(8, 'Password must be at least 8 characters long'),
    name: z.string().min(2, 'Name is too short'),
    role: z.enum(['STUDENT', 'TEACHER', 'PARENT', 'SCHOOL_ADMIN', 'SUPER_ADMIN', 'BURSAR', 'LIBRARIAN', 'ANCILLARY', 'SUPPLIER', 'ALUMNI', 'CLINIC']),
    phone: z.string().optional(),
    schoolCode: z.string().optional(),
    avatar: z.string().nullable().optional(),
    
    // Role specific optional fields
    staffId: z.string().optional(),
    studentId: z.string().optional(),
    dob: z.string().optional(), 
    gender: z.string().optional(),
    address: z.string().optional(),
    departmentId: z.string().optional(),
    
    // HR / Payroll / Social Fields
    bloodGroup: z.string().optional(),
    dateAssumedPost: z.string().optional(),
    dateOfLeaving: z.string().optional(),
    designation: z.string().optional(),
    accountNumber: z.string().optional(),
    accountHolderName: z.string().optional(),
    bankName: z.string().optional(),
    bankBranch: z.string().optional(),
    branchCode: z.string().optional(),
    accountType: z.string().optional(),
    
    // ZiG Banking Fields
    accountNumberZig: z.string().optional(),
    accountHolderNameZig: z.string().optional(),
    bankNameZig: z.string().optional(),
    bankBranchZig: z.string().optional(),
    branchCodeZig: z.string().optional(),
    accountTypeZig: z.string().optional(),
    
    facebookLink: z.string().optional(),
    linkedinLink: z.string().optional(),
    twitterLink: z.string().optional(),
    
    // Student specific additional fields
    motherTongue: z.string().optional(),
    nationality: z.string().optional(),
    city: z.string().optional(),
    state: z.string().optional(),
    prevSchoolClass: z.string().optional(),
    prevSchoolAddress: z.string().optional(),
    hasTransferCertificate: z.union([z.string(), z.boolean()]).optional(),
    isPhysicallyHandicapped: z.union([z.string(), z.boolean()]).optional(),
    handicapDetails: z.string().optional(),
    category: z.string().optional(),
    section: z.string().optional(),
    dormitory: z.string().optional(),
    age: z.union([z.string(), z.number()]).nullable().optional(),
    clubId: z.string().optional(),
    hostelId: z.string().optional(),
    roomId: z.string().optional(),
    studentHouseId: z.string().optional(),
    houseId: z.string().optional(),

    metadata: z.record(z.string(), z.any()).optional(),

    // Teacher / Staff specific
    subjects: z.string().optional(),
    qualification: z.string().optional(),
    religion: z.string().optional(),
    maritalStatus: z.string().optional(),
    spouseName: z.string().optional(),
    spousePhone: z.string().optional(),
    nokName: z.string().optional(),
    nokRelation: z.string().optional(),
    nokPhone: z.string().optional(),
    nationalId: z.string().optional(),

    // Student specific
    grade: z.string().optional(),
    classId: z.string().optional(),
    prevSchoolName: z.string().optional(),
    prevSchool: z.string().optional(),
    purposeForLeaving: z.string().optional(),
    reasonForTransfer: z.string().optional(),
    dateAdmitted: z.string().optional(),
    lastGradeAchieved: z.string().optional(),
    transferCertificate: z.string().nullable().optional(),
    birthCertificate: z.string().nullable().optional(),

    // Docs (base64)
    idDoc: z.string().nullable().optional(),
    residenceDoc: z.string().nullable().optional(),
    qualificationsDoc: z.string().nullable().optional(),

    // Extra fields passed from various forms
    firstName: z.string().optional(),
    lastName: z.string().optional(),
  }),
});

/**
 * Schema for Profile Update
 */
export const UpdateProfileSchema = z.object({
  body: z.object({
    name: z.string().min(2, 'Name is too short').optional(),
    email: z.string().email('Invalid email').optional(),
    phone: z.string().optional(),
    avatar: z.string().optional(),
    address: z.string().optional(),
    gender: z.string().optional(),
    dob: z.string().optional(),
    religion: z.string().optional(),
    
    // Academic fields
    prevSchool: z.string().optional(),
    reasonForTransfer: z.string().optional(),
    lastGradeAchieved: z.string().optional(),
    admissionsNotes: z.string().optional(),

    // Linked parents info
    parents: z.array(z.object({
      parentId: z.string(),
      name: z.string(),
      email: z.string().email('Invalid email'),
      phone: z.string().optional()
    })).optional(),
    
    // Allow HR updates
    bloodGroup: z.string().optional(),
    accountNumber: z.string().optional(),
    accountHolderName: z.string().optional(),
    bankName: z.string().optional(),
    bankBranch: z.string().optional(),
    branchCode: z.string().optional(),
    accountType: z.string().optional(),
    facebookLink: z.string().optional(),
    linkedinLink: z.string().optional(),
    twitterLink: z.string().optional(),
    metadata: z.any().optional(),
  }),
});
