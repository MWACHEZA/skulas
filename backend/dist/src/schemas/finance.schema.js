"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RevenueAllocationSchema = exports.FeeGroupSchema = exports.PaymentMethodSchema = void 0;
const zod_1 = require("zod");
exports.PaymentMethodSchema = zod_1.z.object({
    name: zod_1.z.string().min(1, 'Name is required (e.g. ZB Bank Main)'),
    type: zod_1.z.enum(['BANK', 'MOBILE_MONEY', 'CASH']).default('CASH'),
    details: zod_1.z.object({
        accountNumber: zod_1.z.string().optional(),
        branch: zod_1.z.string().optional(),
        paybill: zod_1.z.string().optional(),
        phone: zod_1.z.string().optional(),
        provider: zod_1.z.string().optional(), // EcoCash, OneMoney, etc.
        currency: zod_1.z.string().default('USD'),
        instructions: zod_1.z.string().optional(),
    }).optional(),
    isActive: zod_1.z.boolean().default(true),
});
exports.FeeGroupSchema = zod_1.z.object({
    name: zod_1.z.string().min(1, 'Name is required').max(100),
    amount: zod_1.z.number().min(0),
    year: zod_1.z.number().int().min(2000).max(2100),
    billingType: zod_1.z.string().min(1, 'Billing Type/Period is required'),
    isRecurring: zod_1.z.boolean().optional(),
    remindersEnabled: zod_1.z.boolean().optional(),
});
exports.RevenueAllocationSchema = zod_1.z.object({
    name: zod_1.z.string().min(1, 'Name is required'),
    schoolYear: zod_1.z.number().int().min(2000).max(2100),
    period: zod_1.z.string().min(1, 'Period is required (e.g. Term 1)'),
    isActive: zod_1.z.boolean().default(true),
    breakdown: zod_1.z.array(zod_1.z.object({
        label: zod_1.z.string().min(1, 'Label is required'),
        percentage: zod_1.z.number().min(0).max(100)
    })).refine((items) => {
        const total = items.reduce((sum, item) => sum + item.percentage, 0);
        return Math.abs(total - 100) < 0.01;
    }, {
        message: 'Total percentage must sum to 100%',
    }),
    feeGroupIds: zod_1.z.array(zod_1.z.string()).min(1, 'At least one fee group must be selected'),
});
//# sourceMappingURL=finance.schema.js.map