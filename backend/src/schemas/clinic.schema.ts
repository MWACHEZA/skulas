import { z } from 'zod';

const numeric = z.union([z.number(), z.string()]).nullish();
const optStr = z.string().nullish();

export const TriageRecordSchema = z.object({
  studentId: z.string().min(1, 'Student ID is required'),
  source: z.string().min(1).default('WALK_IN'), // WALK_IN, TEACHER_REFERRAL, STUDENT_APPOINTMENT, MATRON_ALERT
  presentingComplaint: z.string().min(2, 'Presenting complaint is required'),
  acuity: z.enum(['GREEN', 'YELLOW', 'RED']).default('GREEN'),
  isConfidential: z.boolean().default(false),
  isEmergency: z.boolean().default(false),
  consentOverride: z.boolean().optional(),
  temp: numeric,
  bp: optStr,
  pulse: numeric,
  spo2: numeric,
  weight: numeric,
  height: numeric
});

export const PrescriptionItemSchema = z.object({
  drugName: z.string(),
  dosage: optStr,
  frequency: optStr,
  duration: optStr
});

export const ConsultationFinalizeSchema = z
  .object({
    visitId: z.string().min(1, 'Visit ID is required'),
    icd10Code: optStr,
    diagnoses: z.array(z.string()).optional(),
    examNotes: optStr,
    notes: optStr, // legacy alias for examNotes
    parentNote: optStr,
    prescriptions: z.array(PrescriptionItemSchema).optional(),
    disposition: z.enum(['DISCHARGE_CLASS', 'ADMIT_SICK_BAY', 'REFER_HOSPITAL', 'EXCUSE_SPORTS']).default('DISCHARGE_CLASS'),
    bedId: optStr,
    dietNotes: optStr,
    admitDietNotes: optStr, // legacy alias for dietNotes
    hospitalName: optStr,
    referralReason: optStr
  })
  .refine(d => d.disposition !== 'REFER_HOSPITAL' || !!d.hospitalName, {
    message: 'Hospital name is required for a hospital referral',
    path: ['hospitalName']
  });

export const AdmitPatientSchema = z.object({
  studentId: z.string().min(1, 'Student ID is required'),
  bedId: optStr,
  visitId: optStr,
  dietNotes: optStr
});

export const DischargePatientSchema = z.object({
  admissionId: z.string().min(1, 'Admission ID is required'),
  dischargeNotes: optStr
});

export const MonitoringLogSchema = z.object({
  admissionId: z.string().min(1, 'Admission ID is required'),
  temp: numeric,
  bp: optStr,
  pulse: numeric,
  spo2: numeric,
  notes: optStr
});

export const DispenseDrugFEFOSchema = z.object({
  stockId: z.string().min(1, 'Pharmacy Stock ID is required'),
  visitId: optStr,
  patientId: optStr,
  quantity: z.coerce.number().int().positive('Quantity must be a positive integer'),
  notes: optStr
});
