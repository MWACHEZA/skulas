"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EmployeeProfileSchema = exports.TaxTableSchema = exports.TaxBandSchema = exports.PayrollDeductionSchema = exports.PayrollAllowanceSchema = void 0;
const zod_1 = require("zod");
exports.PayrollAllowanceSchema = zod_1.z.object({
    name: zod_1.z.string().min(1, 'Name is required'),
    isRecurring: zod_1.z.boolean().default(false),
    isPercentage: zod_1.z.boolean().default(false),
    defaultValue: zod_1.z.number().default(0),
});
exports.PayrollDeductionSchema = zod_1.z.object({
    name: zod_1.z.string().min(1, 'Name is required'),
    isRecurring: zod_1.z.boolean().default(false),
    isPercentage: zod_1.z.boolean().default(false),
    defaultValue: zod_1.z.number().default(0),
});
exports.TaxBandSchema = zod_1.z.object({
    id: zod_1.z.string().optional(),
    minIncome: zod_1.z.number().min(0, 'Min income must be positive'),
    maxIncome: zod_1.z.number().nullable().optional(),
    rate: zod_1.z.number().min(0, 'Rate must be between 0 and 100').max(100, 'Rate must be between 0 and 100'),
    fixedAmount: zod_1.z.number().default(0),
}).refine((data) => data.maxIncome === null || data.maxIncome === undefined || data.maxIncome > data.minIncome, {
    message: "Max income must be greater than min income or left blank (null)",
    path: ["maxIncome"],
});
exports.TaxTableSchema = zod_1.z.object({
    name: zod_1.z.string().min(1, 'Name is required'),
    region: zod_1.z.string().optional(),
    effectiveFrom: zod_1.z.string().transform((str) => new Date(str)),
    effectiveTo: zod_1.z.string().optional().transform((str) => str ? new Date(str) : undefined),
    isActive: zod_1.z.boolean().default(true),
    bands: zod_1.z.array(exports.TaxBandSchema).min(1, 'At least one tax band is required'),
});
exports.EmployeeProfileSchema = zod_1.z.object({
    userId: zod_1.z.string().min(1, 'User ID is required'),
    jobTitle: zod_1.z.string().optional(),
    basePay: zod_1.z.number().min(0, 'Base pay cannot be negative'),
    payFrequency: zod_1.z.enum(['DAILY', 'WEEKLY', 'FORTNIGHTLY', 'MONTHLY', 'ANNUALLY']),
    contractType: zod_1.z.string().optional(),
    hireDate: zod_1.z.string().transform((str) => new Date(str)),
    status: zod_1.z.enum(['Active', 'Inactive', 'Terminated']).default('Active'),
    bloodGroup: zod_1.z.string().optional(),
    designation: zod_1.z.string().optional(),
    accountNumber: zod_1.z.string().optional(),
    accountHolderName: zod_1.z.string().optional(),
    bankName: zod_1.z.string().optional(),
    bankBranch: zod_1.z.string().optional(),
    branchCode: zod_1.z.string().optional(),
    accountType: zod_1.z.string().optional(),
    // ZiG Account
    accountNumberZig: zod_1.z.string().optional(),
    accountHolderNameZig: zod_1.z.string().optional(),
    bankNameZig: zod_1.z.string().optional(),
    bankBranchZig: zod_1.z.string().optional(),
    branchCodeZig: zod_1.z.string().optional(),
    accountTypeZig: zod_1.z.string().optional(),
    facebookLink: zod_1.z.string().optional(),
    linkedinLink: zod_1.z.string().optional(),
    twitterLink: zod_1.z.string().optional(),
});
//# sourceMappingURL=payroll.schema.js.map