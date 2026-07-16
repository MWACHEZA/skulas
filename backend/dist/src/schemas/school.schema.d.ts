import { z } from 'zod';
/**
 * Schema for Institutional System Settings
 * (SMTP, Currencies, Module Visibility, etc.)
 */
export declare const SystemSettingsSchema: z.ZodObject<{
    body: z.ZodObject<{
        baseCurrency: z.ZodOptional<z.ZodString>;
        baseCurrencySymbol: z.ZodOptional<z.ZodString>;
        altCurrency: z.ZodOptional<z.ZodString>;
        altCurrencySymbol: z.ZodOptional<z.ZodString>;
        mandatoryReceipts: z.ZodOptional<z.ZodBoolean>;
        showBalanceOnReceipts: z.ZodOptional<z.ZodBoolean>;
        showUniformsModule: z.ZodOptional<z.ZodBoolean>;
        smtpEmail: z.ZodOptional<z.ZodString>;
        smtpHost: z.ZodOptional<z.ZodString>;
        smtpPort: z.ZodOptional<z.ZodNumber>;
        smtpPassword: z.ZodOptional<z.ZodString>;
        smtpSsl: z.ZodOptional<z.ZodBoolean>;
        systemUrl: z.ZodOptional<z.ZodString>;
        whatsappApiUrl: z.ZodOptional<z.ZodString>;
        whatsappAccessToken: z.ZodOptional<z.ZodString>;
        countryPhoneCode: z.ZodOptional<z.ZodString>;
    }, z.core.$strip>;
}, z.core.$strip>;
