import { z } from 'zod';
export const PaymentMethodSchema = z.object({
    name: z.string().min(1, 'Name is required (e.g. ZB Bank Main)'),
    type: z.enum(['BANK', 'MOBILE_MONEY', 'CASH']).default('CASH'),
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
export const FeeGroupSchema = z.object({
    name: z.string().min(1, 'Name is required').max(100),
    amount: z.number().min(0),
    year: z.number().int().min(2000).max(2100),
    billingType: z.string().min(1, 'Billing Type/Period is required'),
    isRecurring: z.boolean().optional(),
    remindersEnabled: z.boolean().optional(),
});
export const RevenueAllocationSchema = z.object({
    name: z.string().min(1, 'Name is required'),
    schoolYear: z.number().int().min(2000).max(2100),
    period: z.string().min(1, 'Period is required (e.g. Term 1)'),
    isActive: z.boolean().default(true),
    breakdown: z.array(z.object({
        label: z.string().min(1, 'Label is required'),
        percentage: z.number().min(0).max(100)
    })).refine((items) => {
        const total = items.reduce((sum, item) => sum + item.percentage, 0);
        return Math.abs(total - 100) < 0.01;
    }, {
        message: 'Total percentage must sum to 100%',
    }),
    feeGroupIds: z.array(z.string()).min(1, 'At least one fee group must be selected'),
});
//# sourceMappingURL=finance.schema.js.map