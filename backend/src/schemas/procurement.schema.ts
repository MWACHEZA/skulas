import { z } from 'zod';

export const CreatePurchaseOrderSchema = z.object({
  body: z.object({
    supplierId: z.string().min(1, 'Supplier is required'),
    description: z.string().min(1, 'Description is required'),
    items: z.array(
      z.object({
        name: z.string().min(1, 'Item name is required'),
        qty: z.coerce.number().min(0.01, 'Quantity must be positive'),
        unitPrice: z.coerce.number().min(0, 'Unit price cannot be negative'),
        total: z.coerce.number().optional()
      })
    ).min(1, 'At least one item is required'),
    totalAmount: z.coerce.number().optional(),
    coaCode: z.string().optional(),
    department: z.string().optional()
  })
});

export const ApprovePurchaseOrderSchema = z.object({
  body: z.object({
    forceOverride: z.boolean().optional(),
    overrideReason: z.string().optional()
  }).optional()
});

export const CreateGRNSchema = z.object({
  body: z.object({
    purchaseOrderId: z.string().min(1, 'Purchase Order ID is required'),
    deliveryNoteNumber: z.string().optional().nullable(),
    items: z.array(
      z.object({
        name: z.string().min(1, 'Item name is required'),
        orderedQty: z.coerce.number().min(0),
        receivedQty: z.coerce.number().min(0),
        unitPrice: z.coerce.number().min(0),
        condition: z.enum(['GOOD', 'DAMAGED', 'FAIR']).optional().default('GOOD'),
        notes: z.string().optional()
      })
    ).min(1, 'At least one item required'),
    notes: z.string().optional().nullable()
  })
});

export const CreateSupplierInvoiceSchema = z.object({
  body: z.object({
    invoiceNo: z.string().min(1, 'Invoice number is required'),
    supplierId: z.string().min(1, 'Supplier ID is required'),
    purchaseOrderId: z.string().optional().nullable(),
    grnId: z.string().optional().nullable(),
    amount: z.coerce.number().min(0.01, 'Invoice amount must be positive'),
    dueDate: z.union([z.string(), z.date()]),
    items: z.array(
      z.object({
        name: z.string().min(1),
        quantity: z.coerce.number().min(0),
        unitPrice: z.coerce.number().min(0),
        total: z.coerce.number().optional()
      })
    ).optional()
  })
});

export const AssetDepreciationSchema = z.object({
  body: z.object({
    fiscalYear: z.coerce.number().optional(),
    fiscalPeriod: z.string().optional()
  }).optional()
});
