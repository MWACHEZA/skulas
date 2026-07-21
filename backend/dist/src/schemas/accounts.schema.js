"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PaymentMethodSchema = exports.ExpenseSchema = exports.IncomeSchema = exports.LiabilitySchema = exports.AccountCategorySchema = void 0;
const zod_1 = require("zod");
exports.AccountCategorySchema = zod_1.z.object({
    name: zod_1.z.string().min(1, 'Name is required'),
    type: zod_1.z.enum(['INCOME', 'EXPENSE', 'LIABILITY']),
});
exports.LiabilitySchema = zod_1.z.object({
    name: zod_1.z.string().min(1, 'Name is required'),
    categoryId: zod_1.z.string().min(1, 'Category is required'),
    amount: zod_1.z.number().min(0, 'Amount must be positive'),
    settled: zod_1.z.number().min(0).optional().default(0),
    date: zod_1.z.string().optional().transform(val => val ? new Date(val) : new Date()),
});
exports.IncomeSchema = zod_1.z.object({
    title: zod_1.z.string().min(1, 'Title is required'),
    amount: zod_1.z.number().min(0, 'Amount must be positive'),
    categoryId: zod_1.z.string().min(1, 'Category is required'),
    date: zod_1.z.string().optional().transform(val => val ? new Date(val) : new Date()),
    paymentMode: zod_1.z.string().optional(),
    currency: zod_1.z.string().default('USD'),
});
exports.ExpenseSchema = zod_1.z.object({
    title: zod_1.z.string().min(1, 'Title is required'),
    amount: zod_1.z.number().min(0, 'Amount must be positive'),
    categoryId: zod_1.z.string().min(1, 'Category is required'),
    date: zod_1.z.string().optional().transform(val => val ? new Date(val) : new Date()),
    paymentMode: zod_1.z.string().optional(),
    currency: zod_1.z.string().default('USD'),
});
exports.PaymentMethodSchema = zod_1.z.object({
    name: zod_1.z.string().min(1, 'Name is required (e.g. ZB Bank Main)'),
    type: zod_1.z.enum(['BANK', 'MOBILE_MONEY', 'CASH']),
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
//# sourceMappingURL=accounts.schema.js.map