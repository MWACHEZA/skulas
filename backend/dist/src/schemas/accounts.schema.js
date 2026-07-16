import { z } from 'zod';
export const AccountCategorySchema = z.object({
    name: z.string().min(1, 'Name is required'),
    type: z.enum(['INCOME', 'EXPENSE', 'LIABILITY']),
});
export const LiabilitySchema = z.object({
    name: z.string().min(1, 'Name is required'),
    categoryId: z.string().min(1, 'Category is required'),
    amount: z.number().min(0, 'Amount must be positive'),
    settled: z.number().min(0).optional().default(0),
    date: z.string().optional().transform(val => val ? new Date(val) : new Date()),
});
export const IncomeSchema = z.object({
    title: z.string().min(1, 'Title is required'),
    amount: z.number().min(0, 'Amount must be positive'),
    categoryId: z.string().min(1, 'Category is required'),
    date: z.string().optional().transform(val => val ? new Date(val) : new Date()),
    paymentMode: z.string().optional(),
    currency: z.string().default('USD'),
});
export const ExpenseSchema = z.object({
    title: z.string().min(1, 'Title is required'),
    amount: z.number().min(0, 'Amount must be positive'),
    categoryId: z.string().min(1, 'Category is required'),
    date: z.string().optional().transform(val => val ? new Date(val) : new Date()),
    paymentMode: z.string().optional(),
    currency: z.string().default('USD'),
});
export const PaymentMethodSchema = z.object({
    name: z.string().min(1, 'Name is required (e.g. ZB Bank Main)'),
    type: z.enum(['BANK', 'MOBILE_MONEY', 'CASH']),
    details: z.object({
        accountNumber: z.string().optional(),
        branch: z.string().optional(),
        paybill: z.string().optional(),
        phone: z.string().optional(),
        provider: z.string().optional(), // EcoCash, OneMoney, etc.
        currency: z.string().default('USD'),
        instructions: z.string().optional(),
    }).optional(),
    isActive: z.boolean().default(true),
});
//# sourceMappingURL=accounts.schema.js.map