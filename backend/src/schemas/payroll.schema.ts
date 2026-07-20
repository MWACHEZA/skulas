import { z } from 'zod';

export const PayrollAllowanceSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  isRecurring: z.boolean().default(false),
  isPercentage: z.boolean().default(false),
  defaultValue: z.number().default(0),
});

export const PayrollDeductionSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  isRecurring: z.boolean().default(false),
  isPercentage: z.boolean().default(false),
  defaultValue: z.number().default(0),
});

export const TaxBandSchema = z.object({
  id: z.string().optional(),
  minIncome: z.number().min(0, 'Min income must be positive'),
  maxIncome: z.number().nullable().optional(),
  rate: z.number().min(0, 'Rate must be between 0 and 100').max(100, 'Rate must be between 0 and 100'),
  fixedAmount: z.number().default(0),
}).refine((data) => data.maxIncome === null || data.maxIncome === undefined || data.maxIncome > data.minIncome, {
  message: "Max income must be greater than min income or left blank (null)",
  path: ["maxIncome"],
});

export const TaxTableSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  region: z.string().optional(),
  effectiveFrom: z.string().transform((str) => new Date(str)),
  effectiveTo: z.string().optional().transform((str) => str ? new Date(str) : undefined),
  isActive: z.boolean().default(true),
  bands: z.array(TaxBandSchema).min(1, 'At least one tax band is required'),
});

export const EmployeeProfileSchema = z.object({
  userId: z.string().min(1, 'User ID is required'),
  jobTitle: z.string().optional(),
  basePay: z.number().min(0, 'Base pay cannot be negative'),
  payFrequency: z.enum(['DAILY', 'WEEKLY', 'FORTNIGHTLY', 'MONTHLY', 'ANNUALLY']),
  contractType: z.string().optional(),
  hireDate: z.string().transform((str) => new Date(str)),
  status: z.enum(['Active', 'Inactive', 'Terminated']).default('Active'),
  bloodGroup: z.string().optional(),
  designation: z.string().optional(),
  accountNumber: z.string().optional(),
  accountHolderName: z.string().optional(),
  bankName: z.string().optional(),
  bankBranch: z.string().optional(),
  branchCode: z.string().optional(),
  accountType: z.string().optional(),
  // ZiG Account
  accountNumberZig: z.string().optional(),
  accountHolderNameZig: z.string().optional(),
  bankNameZig: z.string().optional(),
  bankBranchZig: z.string().optional(),
  branchCodeZig: z.string().optional(),
  accountTypeZig: z.string().optional(),
  facebookLink: z.string().optional(),
  linkedinLink: z.string().optional(),
  twitterLink: z.string().optional(),
});
