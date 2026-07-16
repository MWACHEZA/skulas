import { z } from 'zod';
export declare const AccountCategorySchema: z.ZodObject<{
    name: z.ZodString;
    type: z.ZodEnum<{
        INCOME: "INCOME";
        EXPENSE: "EXPENSE";
        LIABILITY: "LIABILITY";
    }>;
}, z.core.$strip>;
export declare const LiabilitySchema: z.ZodObject<{
    name: z.ZodString;
    categoryId: z.ZodString;
    amount: z.ZodNumber;
    settled: z.ZodDefault<z.ZodOptional<z.ZodNumber>>;
    date: z.ZodPipe<z.ZodOptional<z.ZodString>, z.ZodTransform<Date, string | undefined>>;
}, z.core.$strip>;
export declare const IncomeSchema: z.ZodObject<{
    title: z.ZodString;
    amount: z.ZodNumber;
    categoryId: z.ZodString;
    date: z.ZodPipe<z.ZodOptional<z.ZodString>, z.ZodTransform<Date, string | undefined>>;
    paymentMode: z.ZodOptional<z.ZodString>;
    currency: z.ZodDefault<z.ZodString>;
}, z.core.$strip>;
export declare const ExpenseSchema: z.ZodObject<{
    title: z.ZodString;
    amount: z.ZodNumber;
    categoryId: z.ZodString;
    date: z.ZodPipe<z.ZodOptional<z.ZodString>, z.ZodTransform<Date, string | undefined>>;
    paymentMode: z.ZodOptional<z.ZodString>;
    currency: z.ZodDefault<z.ZodString>;
}, z.core.$strip>;
export declare const PaymentMethodSchema: z.ZodObject<{
    name: z.ZodString;
    type: z.ZodEnum<{
        BANK: "BANK";
        MOBILE_MONEY: "MOBILE_MONEY";
        CASH: "CASH";
    }>;
    details: z.ZodOptional<z.ZodObject<{
        accountNumber: z.ZodOptional<z.ZodString>;
        branch: z.ZodOptional<z.ZodString>;
        paybill: z.ZodOptional<z.ZodString>;
        phone: z.ZodOptional<z.ZodString>;
        provider: z.ZodOptional<z.ZodString>;
        currency: z.ZodDefault<z.ZodString>;
        instructions: z.ZodOptional<z.ZodString>;
    }, z.core.$strip>>;
    isActive: z.ZodDefault<z.ZodBoolean>;
}, z.core.$strip>;
