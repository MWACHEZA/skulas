import { z } from 'zod';

/**
 * Schema for Institutional System Settings
 */
export const SystemSettingsSchema = z.object({
  body: z.object({
    baseCurrency: z.string().length(3, 'Base currency must be a 3-letter code (e.g., USD)').optional(),
    baseCurrencySymbol: z.string().min(1).max(5).optional(),
    altCurrency: z.string().length(3).optional(),
    altCurrencySymbol: z.string().min(1).max(5).optional(),
    mandatoryReceipts: z.boolean().optional(),
    showBalanceOnReceipts: z.boolean().optional(),
    showUniformsModule: z.boolean().optional(),

    smtpEmail: z.string().email('Invalid SMTP sender email').optional(),
    smtpHost: z.string().min(1, 'SMTP Host is required').optional(),
    smtpPort: z.number().int().min(1).max(65535).optional(),
    smtpPassword: z.string().optional(),
    smtpSsl: z.boolean().optional(),
    systemUrl: z.string().url('Invalid System URL').optional(),
    whatsappApiUrl: z.string().url('Invalid WhatsApp API URL').optional(),
    whatsappAccessToken: z.string().optional(),
    countryPhoneCode: z.string().min(1).max(5).optional(),
  }),
});

export const UpdatePlanSchema = z.object({
  body: z.object({
    planName: z.string().min(1),
  }),
});

export const UpdateBrandingSchema = z.object({
  body: z.object({
    primaryColor: z.string().optional().nullable(),
    accentColor: z.string().optional().nullable(),
    motto: z.string().optional().nullable(),
  }),
});

export const UpdateSchoolInfoSchema = z.object({
  body: z.object({
    address: z.string().optional().nullable(),
    phone: z.string().optional().nullable(),
    email: z.string().email().optional().nullable().or(z.literal('')),
    website: z.string().optional().nullable(),
    twitter: z.string().optional().nullable(),
    facebook: z.string().optional().nullable(),
    linkedin: z.string().optional().nullable(),
    instagram: z.string().optional().nullable(),
    youtube: z.string().optional().nullable(),
    tiktok: z.string().optional().nullable(),
  }),
});

export const HouseSchema = z.object({
  body: z.object({
    name: z.string().min(1, 'House name is required'),
    description: z.string().optional().nullable(),
    houseMasterId: z.string().optional().nullable(),
    houseCaptainId: z.string().optional().nullable(),
    color: z.string().optional().nullable(),
    motto: z.string().optional().nullable(),
  }),
});

export const AssignHouseStudentSchema = z.object({
  body: z.object({
    studentId: z.string().min(1, 'Student ID is required'),
    houseId: z.string().min(1, 'House ID is required'),
  }),
});

export const ClubSchema = z.object({
  body: z.object({
    name: z.string().min(1, 'Club name is required'),
    description: z.string().optional().nullable(),
    date: z.string().optional().nullable(),
    category: z.string().optional().nullable(),
    patron: z.string().optional().nullable(),
    chairperson: z.string().optional().nullable(),
  }),
});

export const SportSchema = z.object({
  body: z.object({
    name: z.string().min(1, 'Sport name is required'),
    description: z.string().optional().nullable(),
    category: z.string().optional().nullable(),
    coach: z.string().optional().nullable(),
    sportMaster: z.string().optional().nullable(),
    captain: z.string().optional().nullable(),
    sportMasterId: z.string().optional().nullable(),
    
    // Some endpoints receive these as JSON strings, some as arrays
    captains: z.preprocess((val) => typeof val === 'string' ? (val ? JSON.parse(val) : []) : val, z.array(z.any())).optional().nullable(),
    coaches: z.preprocess((val) => typeof val === 'string' ? (val ? JSON.parse(val) : []) : val, z.array(z.any())).optional().nullable(),
    ageGroups: z.preprocess((val) => typeof val === 'string' ? (val ? JSON.parse(val) : []) : val, z.array(z.any())).optional().nullable(),
  }),
});

export const SportEquipmentSchema = z.object({
  body: z.object({
    name: z.string().min(1, 'Equipment name is required'),
    sportId: z.string().min(1, 'Sport ID is required'),
    quantity: z.union([z.number(), z.string()]).optional().nullable(),
    condition: z.string().optional().nullable(),
    custodianId: z.string().optional().nullable(),
  }),
});

export const HolidaySchema = z.object({
  body: z.object({
    title: z.string().min(1, 'Title is required'),
    content: z.string().optional().nullable(),
    startDate: z.string().datetime().or(z.string()).optional().nullable(),
    endDate: z.string().datetime().or(z.string()).optional().nullable(),
  }),
});

export const SupplierCategoriesSchema = z.object({
  body: z.object({
    categories: z.array(z.string()).min(1, 'At least one category is required'),
  }),
});

export const SuperAdminSchoolSchema = z.object({
  body: z.object({
    name: z.string().min(1, 'School name is required'),
    email: z.string().email().optional().nullable().or(z.literal('')),
    phone: z.string().optional().nullable(),
    address: z.string().optional().nullable(),
    status: z.string().optional().nullable(),
    planName: z.string().optional().nullable(),
    type: z.string().optional().nullable(),
  }),
});
