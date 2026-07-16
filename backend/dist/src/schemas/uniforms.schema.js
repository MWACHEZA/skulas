import { z } from 'zod';
export const UniformItemSchema = z.object({
    name: z.string().min(1, 'Name is required'),
    orderPrice: z.number().min(0).default(0),
    sellingPrice: z.number().min(0).default(0),
    stockLevel: z.number().int().min(0).default(0),
});
export const UniformStockOrderItemSchema = z.object({
    itemId: z.string(),
    quantity: z.number().int().positive(),
    unitPrice: z.number().min(0),
});
export const UniformStockOrderSchema = z.object({
    orderDate: z.string().optional().transform(v => v ? new Date(v) : new Date()),
    supplierId: z.string().optional(),
    paymentMode: z.string().optional(),
    reference: z.string().optional(),
    initialPayment: z.number().min(0).default(0),
    items: z.array(UniformStockOrderItemSchema).min(1, 'At least one item is required'),
});
export const UniformSaleItemSchema = z.object({
    itemId: z.string(),
    quantity: z.number().int().positive(),
    unitPrice: z.number().min(0),
});
export const UniformSaleSchema = z.object({
    saleDate: z.string().optional().transform(v => v ? new Date(v) : new Date()),
    studentId: z.string().optional(),
    parentId: z.string().optional(),
    paymentMode: z.string().optional(),
    reference: z.string().optional(),
    items: z.array(UniformSaleItemSchema).min(1, 'At least one item is required'),
});
export const UniformSupplierPaymentSchema = z.object({
    supplierId: z.string(),
    amount: z.number().positive(),
    date: z.string().optional().transform(v => v ? new Date(v) : new Date()),
    paymentMode: z.string().optional(),
    reference: z.string().optional(),
});
//# sourceMappingURL=uniforms.schema.js.map