"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SuperAdminSchoolSchema = exports.SupplierCategoriesSchema = exports.HolidaySchema = exports.SportEquipmentSchema = exports.SportSchema = exports.ClubSchema = exports.AssignHouseStudentSchema = exports.HouseSchema = exports.UpdateSchoolInfoSchema = exports.UpdateBrandingSchema = exports.UpdatePlanSchema = exports.SystemSettingsSchema = void 0;
const zod_1 = require("zod");
/**
 * Schema for Institutional System Settings
 */
exports.SystemSettingsSchema = zod_1.z.object({
    body: zod_1.z.object({
        baseCurrency: zod_1.z.string().length(3, 'Base currency must be a 3-letter code (e.g., USD)').optional(),
        baseCurrencySymbol: zod_1.z.string().min(1).max(5).optional(),
        altCurrency: zod_1.z.string().length(3).optional(),
        altCurrencySymbol: zod_1.z.string().min(1).max(5).optional(),
        mandatoryReceipts: zod_1.z.boolean().optional(),
        showBalanceOnReceipts: zod_1.z.boolean().optional(),
        showUniformsModule: zod_1.z.boolean().optional(),
        smtpEmail: zod_1.z.string().email('Invalid SMTP sender email').optional(),
        smtpHost: zod_1.z.string().min(1, 'SMTP Host is required').optional(),
        smtpPort: zod_1.z.number().int().min(1).max(65535).optional(),
        smtpPassword: zod_1.z.string().optional(),
        smtpSsl: zod_1.z.boolean().optional(),
        systemUrl: zod_1.z.string().url('Invalid System URL').optional(),
        whatsappApiUrl: zod_1.z.string().url('Invalid WhatsApp API URL').optional(),
        whatsappAccessToken: zod_1.z.string().optional(),
        countryPhoneCode: zod_1.z.string().min(1).max(5).optional(),
    }),
});
exports.UpdatePlanSchema = zod_1.z.object({
    body: zod_1.z.object({
        planName: zod_1.z.string().min(1),
    }),
});
exports.UpdateBrandingSchema = zod_1.z.object({
    body: zod_1.z.object({
        primaryColor: zod_1.z.string().optional().nullable(),
        accentColor: zod_1.z.string().optional().nullable(),
        motto: zod_1.z.string().optional().nullable(),
    }),
});
exports.UpdateSchoolInfoSchema = zod_1.z.object({
    body: zod_1.z.object({
        address: zod_1.z.string().optional().nullable(),
        phone: zod_1.z.string().optional().nullable(),
        email: zod_1.z.string().email().optional().nullable().or(zod_1.z.literal('')),
        website: zod_1.z.string().optional().nullable(),
        twitter: zod_1.z.string().optional().nullable(),
        facebook: zod_1.z.string().optional().nullable(),
        linkedin: zod_1.z.string().optional().nullable(),
        instagram: zod_1.z.string().optional().nullable(),
        youtube: zod_1.z.string().optional().nullable(),
        tiktok: zod_1.z.string().optional().nullable(),
    }),
});
exports.HouseSchema = zod_1.z.object({
    body: zod_1.z.object({
        name: zod_1.z.string().min(1, 'House name is required'),
        description: zod_1.z.string().optional().nullable(),
        houseMasterId: zod_1.z.string().optional().nullable(),
        houseCaptainId: zod_1.z.string().optional().nullable(),
        color: zod_1.z.string().optional().nullable(),
        motto: zod_1.z.string().optional().nullable(),
    }),
});
exports.AssignHouseStudentSchema = zod_1.z.object({
    body: zod_1.z.object({
        studentId: zod_1.z.string().min(1, 'Student ID is required'),
        houseId: zod_1.z.string().min(1, 'House ID is required'),
    }),
});
exports.ClubSchema = zod_1.z.object({
    body: zod_1.z.object({
        name: zod_1.z.string().min(1, 'Club name is required'),
        description: zod_1.z.string().optional().nullable(),
        date: zod_1.z.string().optional().nullable(),
        category: zod_1.z.string().optional().nullable(),
        patron: zod_1.z.string().optional().nullable(),
        chairperson: zod_1.z.string().optional().nullable(),
    }),
});
exports.SportSchema = zod_1.z.object({
    body: zod_1.z.object({
        name: zod_1.z.string().min(1, 'Sport name is required'),
        description: zod_1.z.string().optional().nullable(),
        category: zod_1.z.string().optional().nullable(),
        coach: zod_1.z.string().optional().nullable(),
        sportMaster: zod_1.z.string().optional().nullable(),
        captain: zod_1.z.string().optional().nullable(),
        sportMasterId: zod_1.z.string().optional().nullable(),
        // Some endpoints receive these as JSON strings, some as arrays
        captains: zod_1.z.preprocess((val) => typeof val === 'string' ? (val ? JSON.parse(val) : []) : val, zod_1.z.array(zod_1.z.any())).optional().nullable(),
        coaches: zod_1.z.preprocess((val) => typeof val === 'string' ? (val ? JSON.parse(val) : []) : val, zod_1.z.array(zod_1.z.any())).optional().nullable(),
        ageGroups: zod_1.z.preprocess((val) => typeof val === 'string' ? (val ? JSON.parse(val) : []) : val, zod_1.z.array(zod_1.z.any())).optional().nullable(),
    }),
});
exports.SportEquipmentSchema = zod_1.z.object({
    body: zod_1.z.object({
        name: zod_1.z.string().min(1, 'Equipment name is required'),
        sportId: zod_1.z.string().min(1, 'Sport ID is required'),
        quantity: zod_1.z.union([zod_1.z.number(), zod_1.z.string()]).optional().nullable(),
        condition: zod_1.z.string().optional().nullable(),
        custodianId: zod_1.z.string().optional().nullable(),
    }),
});
exports.HolidaySchema = zod_1.z.object({
    body: zod_1.z.object({
        title: zod_1.z.string().min(1, 'Title is required'),
        content: zod_1.z.string().optional().nullable(),
        startDate: zod_1.z.string().datetime().or(zod_1.z.string()).optional().nullable(),
        endDate: zod_1.z.string().datetime().or(zod_1.z.string()).optional().nullable(),
    }),
});
exports.SupplierCategoriesSchema = zod_1.z.object({
    body: zod_1.z.object({
        categories: zod_1.z.array(zod_1.z.string()).min(1, 'At least one category is required'),
    }),
});
exports.SuperAdminSchoolSchema = zod_1.z.object({
    body: zod_1.z.object({
        name: zod_1.z.string().min(1, 'School name is required'),
        email: zod_1.z.string().email().optional().nullable().or(zod_1.z.literal('')),
        phone: zod_1.z.string().optional().nullable(),
        address: zod_1.z.string().optional().nullable(),
        status: zod_1.z.string().optional().nullable(),
        planName: zod_1.z.string().optional().nullable(),
        type: zod_1.z.string().optional().nullable(),
    }),
});
//# sourceMappingURL=school.schema.js.map