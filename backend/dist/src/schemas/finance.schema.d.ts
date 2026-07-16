import { z } from 'zod';
export declare const PaymentMethodSchema: z.ZodObject<{
    name: z.ZodString;
    type: z.ZodDefault<z.ZodEnum<{
        BANK: "BANK";
        MOBILE_MONEY: "MOBILE_MONEY";
        CASH: "CASH";
    }>>;
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
export declare const FeeGroupSchema: z.ZodObject<{
    name: z.ZodString;
    amount: z.ZodNumber;
    year: z.ZodNumber;
    billingType: z.ZodString;
    isRecurring: z.ZodOptional<z.ZodBoolean>;
    remindersEnabled: z.ZodOptional<z.ZodBoolean>;
}, z.core.$strip>;
export declare const RevenueAllocationSchema: z.ZodObject<{
    name: z.ZodString;
    schoolYear: z.ZodNumber;
    period: z.ZodString;
    isActive: z.ZodDefault<z.ZodBoolean>;
    breakdown: z.ZodArray<z.ZodObject<{
        label: z.ZodString;
        percentage: z.ZodNumber;
    }, z.core.$strip>>;
    feeGroupIds: z.ZodArray<z.ZodString>;
}, z.core.$strip>;
