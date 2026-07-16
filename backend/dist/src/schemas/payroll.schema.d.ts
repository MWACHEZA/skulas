import { z } from 'zod';
export declare const PayrollAllowanceSchema: z.ZodObject<{
    name: z.ZodString;
    isRecurring: z.ZodDefault<z.ZodBoolean>;
    isPercentage: z.ZodDefault<z.ZodBoolean>;
    defaultValue: z.ZodDefault<z.ZodNumber>;
}, z.core.$strip>;
export declare const PayrollDeductionSchema: z.ZodObject<{
    name: z.ZodString;
    isRecurring: z.ZodDefault<z.ZodBoolean>;
    isPercentage: z.ZodDefault<z.ZodBoolean>;
    defaultValue: z.ZodDefault<z.ZodNumber>;
}, z.core.$strip>;
export declare const TaxBandSchema: z.ZodObject<{
    id: z.ZodOptional<z.ZodString>;
    minIncome: z.ZodNumber;
    maxIncome: z.ZodOptional<z.ZodNullable<z.ZodNumber>>;
    rate: z.ZodNumber;
    fixedAmount: z.ZodDefault<z.ZodNumber>;
}, z.core.$strip>;
export declare const TaxTableSchema: z.ZodObject<{
    name: z.ZodString;
    region: z.ZodOptional<z.ZodString>;
    effectiveFrom: z.ZodPipe<z.ZodString, z.ZodTransform<Date, string>>;
    effectiveTo: z.ZodPipe<z.ZodOptional<z.ZodString>, z.ZodTransform<Date | undefined, string | undefined>>;
    isActive: z.ZodDefault<z.ZodBoolean>;
    bands: z.ZodArray<z.ZodObject<{
        id: z.ZodOptional<z.ZodString>;
        minIncome: z.ZodNumber;
        maxIncome: z.ZodOptional<z.ZodNullable<z.ZodNumber>>;
        rate: z.ZodNumber;
        fixedAmount: z.ZodDefault<z.ZodNumber>;
    }, z.core.$strip>>;
}, z.core.$strip>;
export declare const EmployeeProfileSchema: z.ZodObject<{
    userId: z.ZodString;
    jobTitle: z.ZodOptional<z.ZodString>;
    basePay: z.ZodNumber;
    payFrequency: z.ZodEnum<{
        DAILY: "DAILY";
        WEEKLY: "WEEKLY";
        FORTNIGHTLY: "FORTNIGHTLY";
        MONTHLY: "MONTHLY";
        ANNUALLY: "ANNUALLY";
    }>;
    contractType: z.ZodOptional<z.ZodString>;
    hireDate: z.ZodPipe<z.ZodString, z.ZodTransform<Date, string>>;
    status: z.ZodDefault<z.ZodEnum<{
        Active: "Active";
        Inactive: "Inactive";
        Terminated: "Terminated";
    }>>;
    bloodGroup: z.ZodOptional<z.ZodString>;
    designation: z.ZodOptional<z.ZodString>;
    accountNumber: z.ZodOptional<z.ZodString>;
    accountHolderName: z.ZodOptional<z.ZodString>;
    bankName: z.ZodOptional<z.ZodString>;
    bankBranch: z.ZodOptional<z.ZodString>;
    branchCode: z.ZodOptional<z.ZodString>;
    accountType: z.ZodOptional<z.ZodString>;
    facebookLink: z.ZodOptional<z.ZodString>;
    linkedinLink: z.ZodOptional<z.ZodString>;
    twitterLink: z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
