import { z } from 'zod';
/**
 * Schema for Institutional System Settings
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
export declare const UpdatePlanSchema: z.ZodObject<{
    body: z.ZodObject<{
        planName: z.ZodString;
    }, z.core.$strip>;
}, z.core.$strip>;
export declare const UpdateBrandingSchema: z.ZodObject<{
    body: z.ZodObject<{
        primaryColor: z.ZodNullable<z.ZodOptional<z.ZodString>>;
        accentColor: z.ZodNullable<z.ZodOptional<z.ZodString>>;
        motto: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    }, z.core.$strip>;
}, z.core.$strip>;
export declare const UpdateSchoolInfoSchema: z.ZodObject<{
    body: z.ZodObject<{
        address: z.ZodNullable<z.ZodOptional<z.ZodString>>;
        phone: z.ZodNullable<z.ZodOptional<z.ZodString>>;
        email: z.ZodUnion<[z.ZodNullable<z.ZodOptional<z.ZodString>>, z.ZodLiteral<"">]>;
        website: z.ZodNullable<z.ZodOptional<z.ZodString>>;
        twitter: z.ZodNullable<z.ZodOptional<z.ZodString>>;
        facebook: z.ZodNullable<z.ZodOptional<z.ZodString>>;
        linkedin: z.ZodNullable<z.ZodOptional<z.ZodString>>;
        instagram: z.ZodNullable<z.ZodOptional<z.ZodString>>;
        youtube: z.ZodNullable<z.ZodOptional<z.ZodString>>;
        tiktok: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    }, z.core.$strip>;
}, z.core.$strip>;
export declare const HouseSchema: z.ZodObject<{
    body: z.ZodObject<{
        name: z.ZodString;
        description: z.ZodNullable<z.ZodOptional<z.ZodString>>;
        houseMasterId: z.ZodNullable<z.ZodOptional<z.ZodString>>;
        houseCaptainId: z.ZodNullable<z.ZodOptional<z.ZodString>>;
        color: z.ZodNullable<z.ZodOptional<z.ZodString>>;
        motto: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    }, z.core.$strip>;
}, z.core.$strip>;
export declare const AssignHouseStudentSchema: z.ZodObject<{
    body: z.ZodObject<{
        studentId: z.ZodString;
        houseId: z.ZodString;
    }, z.core.$strip>;
}, z.core.$strip>;
export declare const ClubSchema: z.ZodObject<{
    body: z.ZodObject<{
        name: z.ZodString;
        description: z.ZodNullable<z.ZodOptional<z.ZodString>>;
        date: z.ZodNullable<z.ZodOptional<z.ZodString>>;
        category: z.ZodNullable<z.ZodOptional<z.ZodString>>;
        patron: z.ZodNullable<z.ZodOptional<z.ZodString>>;
        chairperson: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    }, z.core.$strip>;
}, z.core.$strip>;
export declare const SportSchema: z.ZodObject<{
    body: z.ZodObject<{
        name: z.ZodString;
        description: z.ZodNullable<z.ZodOptional<z.ZodString>>;
        category: z.ZodNullable<z.ZodOptional<z.ZodString>>;
        coach: z.ZodNullable<z.ZodOptional<z.ZodString>>;
        sportMaster: z.ZodNullable<z.ZodOptional<z.ZodString>>;
        captain: z.ZodNullable<z.ZodOptional<z.ZodString>>;
        sportMasterId: z.ZodNullable<z.ZodOptional<z.ZodString>>;
        captains: z.ZodNullable<z.ZodOptional<z.ZodPipe<z.ZodTransform<any, unknown>, z.ZodArray<z.ZodAny>>>>;
        coaches: z.ZodNullable<z.ZodOptional<z.ZodPipe<z.ZodTransform<any, unknown>, z.ZodArray<z.ZodAny>>>>;
        ageGroups: z.ZodNullable<z.ZodOptional<z.ZodPipe<z.ZodTransform<any, unknown>, z.ZodArray<z.ZodAny>>>>;
    }, z.core.$strip>;
}, z.core.$strip>;
export declare const SportEquipmentSchema: z.ZodObject<{
    body: z.ZodObject<{
        name: z.ZodString;
        sportId: z.ZodString;
        quantity: z.ZodNullable<z.ZodOptional<z.ZodUnion<readonly [z.ZodNumber, z.ZodString]>>>;
        condition: z.ZodNullable<z.ZodOptional<z.ZodString>>;
        custodianId: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    }, z.core.$strip>;
}, z.core.$strip>;
export declare const HolidaySchema: z.ZodObject<{
    body: z.ZodObject<{
        title: z.ZodString;
        content: z.ZodNullable<z.ZodOptional<z.ZodString>>;
        startDate: z.ZodNullable<z.ZodOptional<z.ZodUnion<[z.ZodString, z.ZodString]>>>;
        endDate: z.ZodNullable<z.ZodOptional<z.ZodUnion<[z.ZodString, z.ZodString]>>>;
    }, z.core.$strip>;
}, z.core.$strip>;
export declare const SupplierCategoriesSchema: z.ZodObject<{
    body: z.ZodObject<{
        categories: z.ZodArray<z.ZodString>;
    }, z.core.$strip>;
}, z.core.$strip>;
export declare const SuperAdminSchoolSchema: z.ZodObject<{
    body: z.ZodObject<{
        name: z.ZodString;
        email: z.ZodUnion<[z.ZodNullable<z.ZodOptional<z.ZodString>>, z.ZodLiteral<"">]>;
        phone: z.ZodNullable<z.ZodOptional<z.ZodString>>;
        address: z.ZodNullable<z.ZodOptional<z.ZodString>>;
        status: z.ZodNullable<z.ZodOptional<z.ZodString>>;
        planName: z.ZodNullable<z.ZodOptional<z.ZodString>>;
        type: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    }, z.core.$strip>;
}, z.core.$strip>;
