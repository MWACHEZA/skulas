import { z } from 'zod';
export declare const UniformItemSchema: z.ZodObject<{
    name: z.ZodString;
    orderPrice: z.ZodDefault<z.ZodNumber>;
    sellingPrice: z.ZodDefault<z.ZodNumber>;
    stockLevel: z.ZodDefault<z.ZodNumber>;
}, z.core.$strip>;
export declare const UniformStockOrderItemSchema: z.ZodObject<{
    itemId: z.ZodString;
    quantity: z.ZodNumber;
    unitPrice: z.ZodNumber;
}, z.core.$strip>;
export declare const UniformStockOrderSchema: z.ZodObject<{
    orderDate: z.ZodPipe<z.ZodOptional<z.ZodString>, z.ZodTransform<Date, string | undefined>>;
    supplierId: z.ZodOptional<z.ZodString>;
    paymentMode: z.ZodOptional<z.ZodString>;
    reference: z.ZodOptional<z.ZodString>;
    initialPayment: z.ZodDefault<z.ZodNumber>;
    items: z.ZodArray<z.ZodObject<{
        itemId: z.ZodString;
        quantity: z.ZodNumber;
        unitPrice: z.ZodNumber;
    }, z.core.$strip>>;
}, z.core.$strip>;
export declare const UniformSaleItemSchema: z.ZodObject<{
    itemId: z.ZodString;
    quantity: z.ZodNumber;
    unitPrice: z.ZodNumber;
}, z.core.$strip>;
export declare const UniformSaleSchema: z.ZodObject<{
    saleDate: z.ZodPipe<z.ZodOptional<z.ZodString>, z.ZodTransform<Date, string | undefined>>;
    studentId: z.ZodOptional<z.ZodString>;
    parentId: z.ZodOptional<z.ZodString>;
    paymentMode: z.ZodOptional<z.ZodString>;
    reference: z.ZodOptional<z.ZodString>;
    items: z.ZodArray<z.ZodObject<{
        itemId: z.ZodString;
        quantity: z.ZodNumber;
        unitPrice: z.ZodNumber;
    }, z.core.$strip>>;
}, z.core.$strip>;
export declare const UniformSupplierPaymentSchema: z.ZodObject<{
    supplierId: z.ZodString;
    amount: z.ZodNumber;
    date: z.ZodPipe<z.ZodOptional<z.ZodString>, z.ZodTransform<Date, string | undefined>>;
    paymentMode: z.ZodOptional<z.ZodString>;
    reference: z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
