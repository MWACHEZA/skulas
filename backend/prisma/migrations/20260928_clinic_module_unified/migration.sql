-- Migration: 20260928_clinic_module_unified
-- Up Migration: Normalize clinical architecture into dedicated tables, FEFO pharmacy, bed map, and privacy guards

-- 1. Extend RequesterRole Enum to support automated CLINIC low-stock procurement
DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'RequesterRole') THEN
        ALTER TYPE "RequesterRole" ADD VALUE IF NOT EXISTS 'CLINIC';
    END IF;
END $$;

-- 2. Extend ClinicVisit with triage, disposition, and confidentiality metadata
ALTER TABLE "ClinicVisit" 
ADD COLUMN IF NOT EXISTS "source" TEXT NOT NULL DEFAULT 'WALK_IN',
ADD COLUMN IF NOT EXISTS "acuity" TEXT NOT NULL DEFAULT 'GREEN',
ADD COLUMN IF NOT EXISTS "isEmergency" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS "isConfidential" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS "disposition" TEXT,
ADD COLUMN IF NOT EXISTS "triageById" TEXT,
ADD COLUMN IF NOT EXISTS "consultedById" TEXT,
ADD COLUMN IF NOT EXISTS "closedAt" TIMESTAMP(3);

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ClinicVisit_triageById_fkey') THEN
        ALTER TABLE "ClinicVisit" 
        ADD CONSTRAINT "ClinicVisit_triageById_fkey" 
        FOREIGN KEY ("triageById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ClinicVisit_consultedById_fkey') THEN
        ALTER TABLE "ClinicVisit" 
        ADD CONSTRAINT "ClinicVisit_consultedById_fkey" 
        FOREIGN KEY ("consultedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
END $$;

-- 3. Create Icd10ParentLabel Table (Plain-language mapping for Super Admin ICD-10 reference)
CREATE TABLE IF NOT EXISTS "Icd10ParentLabel" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "plainLabel" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Icd10ParentLabel_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "Icd10ParentLabel_code_key" UNIQUE ("code"),
    CONSTRAINT "Icd10ParentLabel_code_fkey" FOREIGN KEY ("code") REFERENCES "Icd10Code"("code") ON DELETE CASCADE ON UPDATE CASCADE
);

-- 4. Create StudentHealthProfile Table
CREATE TABLE IF NOT EXISTS "StudentHealthProfile" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "allergies" TEXT,
    "chronicConditions" TEXT,
    "bloodGroup" TEXT,
    "emergencyContactName" TEXT,
    "emergencyContactPhone" TEXT,
    "emergencyContactRel" TEXT,
    "treatmentConsent" BOOLEAN NOT NULL DEFAULT false,
    "consentBy" TEXT,
    "consentedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StudentHealthProfile_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "StudentHealthProfile_studentId_key" UNIQUE ("studentId"),
    CONSTRAINT "StudentHealthProfile_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "StudentHealthProfile_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "StudentHealthProfile_schoolId_idx" ON "StudentHealthProfile"("schoolId");

-- 5. Create ClinicVital Table (Physically isolated from ClinicVisit to avoid accidental exposure)
CREATE TABLE IF NOT EXISTS "ClinicVital" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "visitId" TEXT NOT NULL,
    "temp" DOUBLE PRECISION,
    "bp" TEXT,
    "pulse" INTEGER,
    "spo2" INTEGER,
    "weight" DOUBLE PRECISION,
    "height" DOUBLE PRECISION,
    "recordedById" TEXT,
    "recordedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ClinicVital_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "ClinicVital_visitId_key" UNIQUE ("visitId"),
    CONSTRAINT "ClinicVital_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ClinicVital_visitId_fkey" FOREIGN KEY ("visitId") REFERENCES "ClinicVisit"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ClinicVital_recordedById_fkey" FOREIGN KEY ("recordedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "ClinicVital_schoolId_idx" ON "ClinicVital"("schoolId");

-- 6. Create ClinicDiagnosis Table
CREATE TABLE IF NOT EXISTS "ClinicDiagnosis" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "visitId" TEXT NOT NULL,
    "icd10Code" TEXT,
    "notes" TEXT,
    "parentNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ClinicDiagnosis_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "ClinicDiagnosis_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ClinicDiagnosis_visitId_fkey" FOREIGN KEY ("visitId") REFERENCES "ClinicVisit"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ClinicDiagnosis_icd10Code_fkey" FOREIGN KEY ("icd10Code") REFERENCES "Icd10Code"("code") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "ClinicDiagnosis_schoolId_idx" ON "ClinicDiagnosis"("schoolId");
CREATE INDEX IF NOT EXISTS "ClinicDiagnosis_visitId_idx" ON "ClinicDiagnosis"("visitId");

-- 7. Create ClinicPrescription Table
CREATE TABLE IF NOT EXISTS "ClinicPrescription" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "visitId" TEXT NOT NULL,
    "drugName" TEXT NOT NULL,
    "dosage" TEXT NOT NULL,
    "frequency" TEXT,
    "duration" TEXT,
    "prescribedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ClinicPrescription_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "ClinicPrescription_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ClinicPrescription_visitId_fkey" FOREIGN KEY ("visitId") REFERENCES "ClinicVisit"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ClinicPrescription_prescribedById_fkey" FOREIGN KEY ("prescribedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "ClinicPrescription_schoolId_idx" ON "ClinicPrescription"("schoolId");
CREATE INDEX IF NOT EXISTS "ClinicPrescription_visitId_idx" ON "ClinicPrescription"("visitId");

-- 8. Create PharmacyStock Table
CREATE TABLE IF NOT EXISTS "PharmacyStock" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "drugName" TEXT NOT NULL,
    "category" TEXT NOT NULL DEFAULT 'MEDICATION',
    "unit" TEXT NOT NULL DEFAULT 'tablets',
    "minStock" INTEGER NOT NULL DEFAULT 10,
    "location" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PharmacyStock_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "PharmacyStock_schoolId_drugName_key" UNIQUE ("schoolId", "drugName"),
    CONSTRAINT "PharmacyStock_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "PharmacyStock_schoolId_idx" ON "PharmacyStock"("schoolId");

-- 9. Create PharmacyBatch Table (Enables First-Expiry-First-Out)
CREATE TABLE IF NOT EXISTS "PharmacyBatch" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "stockId" TEXT NOT NULL,
    "batchNumber" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 0,
    "expiryDate" TIMESTAMP(3) NOT NULL,
    "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PharmacyBatch_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "PharmacyBatch_stockId_fkey" FOREIGN KEY ("stockId") REFERENCES "PharmacyStock"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "PharmacyBatch_schoolId_idx" ON "PharmacyBatch"("schoolId");
CREATE INDEX IF NOT EXISTS "PharmacyBatch_stockId_idx" ON "PharmacyBatch"("stockId");
CREATE INDEX IF NOT EXISTS "PharmacyBatch_expiryDate_idx" ON "PharmacyBatch"("expiryDate");

-- 10. Create PharmacyDispense Table
CREATE TABLE IF NOT EXISTS "PharmacyDispense" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "visitId" TEXT,
    "stockId" TEXT NOT NULL,
    "batchId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "dispensedById" TEXT,
    "dispensedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PharmacyDispense_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "PharmacyDispense_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "PharmacyDispense_visitId_fkey" FOREIGN KEY ("visitId") REFERENCES "ClinicVisit"("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "PharmacyDispense_stockId_fkey" FOREIGN KEY ("stockId") REFERENCES "PharmacyStock"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "PharmacyDispense_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "PharmacyBatch"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "PharmacyDispense_dispensedById_fkey" FOREIGN KEY ("dispensedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "PharmacyDispense_schoolId_idx" ON "PharmacyDispense"("schoolId");
CREATE INDEX IF NOT EXISTS "PharmacyDispense_visitId_idx" ON "PharmacyDispense"("visitId");

-- 11. Create ClinicBed Table
CREATE TABLE IF NOT EXISTS "ClinicBed" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "bedNumber" TEXT NOT NULL,
    "ward" TEXT NOT NULL DEFAULT 'Main Sick Bay',
    "status" TEXT NOT NULL DEFAULT 'AVAILABLE',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ClinicBed_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "ClinicBed_schoolId_bedNumber_key" UNIQUE ("schoolId", "bedNumber"),
    CONSTRAINT "ClinicBed_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "ClinicBed_schoolId_idx" ON "ClinicBed"("schoolId");

-- 12. Create ClinicAdmission Table
CREATE TABLE IF NOT EXISTS "ClinicAdmission" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "bedId" TEXT NOT NULL,
    "visitId" TEXT,
    "studentId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ADMITTED',
    "dietNotes" TEXT,
    "dischargeNotes" TEXT,
    "admittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dischargedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ClinicAdmission_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "ClinicAdmission_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ClinicAdmission_bedId_fkey" FOREIGN KEY ("bedId") REFERENCES "ClinicBed"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ClinicAdmission_visitId_fkey" FOREIGN KEY ("visitId") REFERENCES "ClinicVisit"("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "ClinicAdmission_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "ClinicAdmission_schoolId_idx" ON "ClinicAdmission"("schoolId");
CREATE INDEX IF NOT EXISTS "ClinicAdmission_studentId_idx" ON "ClinicAdmission"("studentId");
CREATE INDEX IF NOT EXISTS "ClinicAdmission_status_idx" ON "ClinicAdmission"("status");

-- 13. Create ClinicMonitoringLog Table
CREATE TABLE IF NOT EXISTS "ClinicMonitoringLog" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "admissionId" TEXT NOT NULL,
    "temp" DOUBLE PRECISION,
    "bp" TEXT,
    "pulse" INTEGER,
    "spo2" INTEGER,
    "notes" TEXT,
    "recordedById" TEXT,
    "recordedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ClinicMonitoringLog_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "ClinicMonitoringLog_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ClinicMonitoringLog_admissionId_fkey" FOREIGN KEY ("admissionId") REFERENCES "ClinicAdmission"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ClinicMonitoringLog_recordedById_fkey" FOREIGN KEY ("recordedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "ClinicMonitoringLog_schoolId_idx" ON "ClinicMonitoringLog"("schoolId");
CREATE INDEX IF NOT EXISTS "ClinicMonitoringLog_admissionId_idx" ON "ClinicMonitoringLog"("admissionId");

-- 14. Create ClinicAccessAudit Table (HIPAA/FERPA-grade clinical audit logging)
CREATE TABLE IF NOT EXISTS "ClinicAccessAudit" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "studentId" TEXT,
    "userId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "resource" TEXT NOT NULL,
    "ipAddress" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ClinicAccessAudit_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "ClinicAccessAudit_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ClinicAccessAudit_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "ClinicAccessAudit_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "ClinicAccessAudit_schoolId_idx" ON "ClinicAccessAudit"("schoolId");
CREATE INDEX IF NOT EXISTS "ClinicAccessAudit_studentId_idx" ON "ClinicAccessAudit"("studentId");
CREATE INDEX IF NOT EXISTS "ClinicAccessAudit_userId_idx" ON "ClinicAccessAudit"("userId");
CREATE INDEX IF NOT EXISTS "ClinicAccessAudit_createdAt_idx" ON "ClinicAccessAudit"("createdAt");

-- 15. Create ClinicEmergencyLog Table
CREATE TABLE IF NOT EXISTS "ClinicEmergencyLog" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "visitId" TEXT,
    "studentId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "acuity" TEXT NOT NULL DEFAULT 'RED',
    "ambulanceCalled" BOOLEAN NOT NULL DEFAULT false,
    "ambulanceDetails" TEXT,
    "parentContacted" BOOLEAN NOT NULL DEFAULT false,
    "parentContactPhone" TEXT,
    "parentContactNotes" TEXT,
    "photoUrls" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    "loggedById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ClinicEmergencyLog_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "ClinicEmergencyLog_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ClinicEmergencyLog_visitId_fkey" FOREIGN KEY ("visitId") REFERENCES "ClinicVisit"("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "ClinicEmergencyLog_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ClinicEmergencyLog_loggedById_fkey" FOREIGN KEY ("loggedById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "ClinicEmergencyLog_schoolId_idx" ON "ClinicEmergencyLog"("schoolId");
CREATE INDEX IF NOT EXISTS "ClinicEmergencyLog_studentId_idx" ON "ClinicEmergencyLog"("studentId");

-- 16. Create ClinicSetting Table (Configurable per-tenant clinical policies)
CREATE TABLE IF NOT EXISTS "ClinicSetting" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "hasDoctorQueue" BOOLEAN NOT NULL DEFAULT false,
    "bedCount" INTEGER NOT NULL DEFAULT 10,
    "monitoringIntervalHours" INTEGER NOT NULL DEFAULT 4,
    "tempAlertThreshold" DOUBLE PRECISION NOT NULL DEFAULT 38.0,
    "billingEnabled" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ClinicSetting_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "ClinicSetting_schoolId_key" UNIQUE ("schoolId"),
    CONSTRAINT "ClinicSetting_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
