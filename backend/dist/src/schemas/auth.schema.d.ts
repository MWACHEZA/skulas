import { z } from 'zod';
/**
 * Schema for User Login
 */
export declare const LoginSchema: z.ZodObject<{
    body: z.ZodObject<{
        email: z.ZodString;
        password: z.ZodString;
        schoolCode: z.ZodOptional<z.ZodString>;
    }, z.core.$strip>;
}, z.core.$strip>;
/**
 * Schema for User Registration (School or Portal User)
 */
export declare const RegisterUserSchema: z.ZodObject<{
    body: z.ZodObject<{
        email: z.ZodString;
        password: z.ZodString;
        name: z.ZodString;
        role: z.ZodEnum<{
            SCHOOL_ADMIN: "SCHOOL_ADMIN";
            SUPER_ADMIN: "SUPER_ADMIN";
            STUDENT: "STUDENT";
            TEACHER: "TEACHER";
            BURSAR: "BURSAR";
            LIBRARIAN: "LIBRARIAN";
            ANCILLARY: "ANCILLARY";
            ALUMNI: "ALUMNI";
            SUPPLIER: "SUPPLIER";
            PARENT: "PARENT";
            CLINIC: "CLINIC";
        }>;
        phone: z.ZodOptional<z.ZodString>;
        schoolCode: z.ZodOptional<z.ZodString>;
        avatar: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        staffId: z.ZodOptional<z.ZodString>;
        studentId: z.ZodOptional<z.ZodString>;
        dob: z.ZodOptional<z.ZodString>;
        gender: z.ZodOptional<z.ZodString>;
        address: z.ZodOptional<z.ZodString>;
        departmentId: z.ZodOptional<z.ZodString>;
        bloodGroup: z.ZodOptional<z.ZodString>;
        dateAssumedPost: z.ZodOptional<z.ZodString>;
        dateOfLeaving: z.ZodOptional<z.ZodString>;
        designation: z.ZodOptional<z.ZodString>;
        accountNumber: z.ZodOptional<z.ZodString>;
        accountHolderName: z.ZodOptional<z.ZodString>;
        bankName: z.ZodOptional<z.ZodString>;
        bankBranch: z.ZodOptional<z.ZodString>;
        branchCode: z.ZodOptional<z.ZodString>;
        accountType: z.ZodOptional<z.ZodString>;
        accountNumberZig: z.ZodOptional<z.ZodString>;
        accountHolderNameZig: z.ZodOptional<z.ZodString>;
        bankNameZig: z.ZodOptional<z.ZodString>;
        bankBranchZig: z.ZodOptional<z.ZodString>;
        branchCodeZig: z.ZodOptional<z.ZodString>;
        accountTypeZig: z.ZodOptional<z.ZodString>;
        facebookLink: z.ZodOptional<z.ZodString>;
        linkedinLink: z.ZodOptional<z.ZodString>;
        twitterLink: z.ZodOptional<z.ZodString>;
        motherTongue: z.ZodOptional<z.ZodString>;
        nationality: z.ZodOptional<z.ZodString>;
        city: z.ZodOptional<z.ZodString>;
        state: z.ZodOptional<z.ZodString>;
        prevSchoolClass: z.ZodOptional<z.ZodString>;
        prevSchoolAddress: z.ZodOptional<z.ZodString>;
        hasTransferCertificate: z.ZodOptional<z.ZodUnion<readonly [z.ZodString, z.ZodBoolean]>>;
        isPhysicallyHandicapped: z.ZodOptional<z.ZodUnion<readonly [z.ZodString, z.ZodBoolean]>>;
        handicapDetails: z.ZodOptional<z.ZodString>;
        category: z.ZodOptional<z.ZodString>;
        section: z.ZodOptional<z.ZodString>;
        dormitory: z.ZodOptional<z.ZodString>;
        age: z.ZodOptional<z.ZodNullable<z.ZodUnion<readonly [z.ZodString, z.ZodNumber]>>>;
        clubId: z.ZodOptional<z.ZodString>;
        hostelId: z.ZodOptional<z.ZodString>;
        roomId: z.ZodOptional<z.ZodString>;
        studentHouseId: z.ZodOptional<z.ZodString>;
        houseId: z.ZodOptional<z.ZodString>;
        metadata: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodAny>>;
        subjects: z.ZodOptional<z.ZodString>;
        qualification: z.ZodOptional<z.ZodString>;
        religion: z.ZodOptional<z.ZodString>;
        maritalStatus: z.ZodOptional<z.ZodString>;
        spouseName: z.ZodOptional<z.ZodString>;
        spousePhone: z.ZodOptional<z.ZodString>;
        nokName: z.ZodOptional<z.ZodString>;
        nokRelation: z.ZodOptional<z.ZodString>;
        nokPhone: z.ZodOptional<z.ZodString>;
        nationalId: z.ZodOptional<z.ZodString>;
        grade: z.ZodOptional<z.ZodString>;
        classId: z.ZodOptional<z.ZodString>;
        prevSchoolName: z.ZodOptional<z.ZodString>;
        prevSchool: z.ZodOptional<z.ZodString>;
        purposeForLeaving: z.ZodOptional<z.ZodString>;
        reasonForTransfer: z.ZodOptional<z.ZodString>;
        dateAdmitted: z.ZodOptional<z.ZodString>;
        lastGradeAchieved: z.ZodOptional<z.ZodString>;
        transferCertificate: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        birthCertificate: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        idDoc: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        residenceDoc: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        qualificationsDoc: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        firstName: z.ZodOptional<z.ZodString>;
        lastName: z.ZodOptional<z.ZodString>;
    }, z.core.$strip>;
}, z.core.$strip>;
/**
 * Schema for Profile Update
 */
export declare const UpdateProfileSchema: z.ZodObject<{
    body: z.ZodObject<{
        name: z.ZodOptional<z.ZodString>;
        email: z.ZodOptional<z.ZodString>;
        phone: z.ZodOptional<z.ZodString>;
        avatar: z.ZodOptional<z.ZodString>;
        address: z.ZodOptional<z.ZodString>;
        gender: z.ZodOptional<z.ZodString>;
        dob: z.ZodOptional<z.ZodString>;
        religion: z.ZodOptional<z.ZodString>;
        prevSchool: z.ZodOptional<z.ZodString>;
        reasonForTransfer: z.ZodOptional<z.ZodString>;
        lastGradeAchieved: z.ZodOptional<z.ZodString>;
        admissionsNotes: z.ZodOptional<z.ZodString>;
        parents: z.ZodOptional<z.ZodArray<z.ZodObject<{
            parentId: z.ZodString;
            name: z.ZodString;
            email: z.ZodString;
            phone: z.ZodOptional<z.ZodString>;
        }, z.core.$strip>>>;
        bloodGroup: z.ZodOptional<z.ZodString>;
        accountNumber: z.ZodOptional<z.ZodString>;
        accountHolderName: z.ZodOptional<z.ZodString>;
        bankName: z.ZodOptional<z.ZodString>;
        bankBranch: z.ZodOptional<z.ZodString>;
        branchCode: z.ZodOptional<z.ZodString>;
        accountType: z.ZodOptional<z.ZodString>;
        facebookLink: z.ZodOptional<z.ZodString>;
        linkedinLink: z.ZodOptional<z.ZodString>;
        twitterLink: z.ZodOptional<z.ZodString>;
        metadata: z.ZodOptional<z.ZodAny>;
    }, z.core.$strip>;
}, z.core.$strip>;
