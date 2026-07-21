"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UniformSupplierPaymentSchema = exports.UniformSaleSchema = exports.UniformSaleItemSchema = exports.UniformStockOrderSchema = exports.UniformStockOrderItemSchema = exports.UniformItemSchema = void 0;
const zod_1 = require("zod");
exports.UniformItemSchema = zod_1.z.object({
    name: zod_1.z.string().min(1, 'Name is required'),
    orderPrice: zod_1.z.number().min(0).default(0),
    sellingPrice: zod_1.z.number().min(0).default(0),
    stockLevel: zod_1.z.number().int().min(0).default(0),
});
exports.UniformStockOrderItemSchema = zod_1.z.object({
    itemId: zod_1.z.string(),
    quantity: zod_1.z.number().int().positive(),
    unitPrice: zod_1.z.number().min(0),
});
exports.UniformStockOrderSchema = zod_1.z.object({
    orderDate: zod_1.z.string().optional().transform(v => v ? new Date(v) : new Date()),
    supplierId: zod_1.z.string().optional(),
    paymentMode: zod_1.z.string().optional(),
    reference: zod_1.z.string().optional(),
    initialPayment: zod_1.z.number().min(0).default(0),
    items: zod_1.z.array(exports.UniformStockOrderItemSchema).min(1, 'At least one item is required'),
});
exports.UniformSaleItemSchema = zod_1.z.object({
    itemId: zod_1.z.string(),
    quantity: zod_1.z.number().int().positive(),
    unitPrice: zod_1.z.number().min(0),
});
exports.UniformSaleSchema = zod_1.z.object({
    saleDate: zod_1.z.string().optional().transform(v => v ? new Date(v) : new Date()),
    studentId: zod_1.z.string().optional(),
    parentId: zod_1.z.string().optional(),
    paymentMode: zod_1.z.string().optional(),
    reference: zod_1.z.string().optional(),
    items: zod_1.z.array(exports.UniformSaleItemSchema).min(1, 'At least one item is required'),
});
exports.UniformSupplierPaymentSchema = zod_1.z.object({
    supplierId: zod_1.z.string(),
    amount: zod_1.z.number().positive(),
    date: zod_1.z.string().optional().transform(v => v ? new Date(v) : new Date()),
    paymentMode: zod_1.z.string().optional(),
    reference: zod_1.z.string().optional(),
});
//# sourceMappingURL=uniforms.schema.js.map