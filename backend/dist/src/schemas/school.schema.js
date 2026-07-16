import { z } from 'zod';
/**
 * Schema for Institutional System Settings
 * (SMTP, Currencies, Module Visibility, etc.)
 */
export const SystemSettingsSchema = z.object({
    body: z.object({
        // General Settings
        baseCurrency: z.string().length(3, 'Base currency must be a 3-letter code (e.g., USD)').optional(),
        baseCurrencySymbol: z.string().min(1).max(5).optional(),
        altCurrency: z.string().length(3).optional(),
        altCurrencySymbol: z.string().min(1).max(5).optional(),
        mandatoryReceipts: z.boolean().optional(),
        showBalanceOnReceipts: z.boolean().optional(),
        showUniformsModule: z.boolean().optional(),
        // Communication Settings
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
//# sourceMappingURL=school.schema.js.map