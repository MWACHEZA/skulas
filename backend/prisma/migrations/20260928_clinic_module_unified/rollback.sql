-- Rollback Migration: 20260928_clinic_module_unified
-- Safely revert all created tables and columns in reverse dependency order

DROP TABLE IF EXISTS "ClinicSetting" CASCADE;
DROP TABLE IF EXISTS "ClinicEmergencyLog" CASCADE;
DROP TABLE IF EXISTS "ClinicAccessAudit" CASCADE;
DROP TABLE IF EXISTS "ClinicMonitoringLog" CASCADE;
DROP TABLE IF EXISTS "ClinicAdmission" CASCADE;
DROP TABLE IF EXISTS "ClinicBed" CASCADE;
DROP TABLE IF EXISTS "PharmacyDispense" CASCADE;
DROP TABLE IF EXISTS "PharmacyBatch" CASCADE;
DROP TABLE IF EXISTS "PharmacyStock" CASCADE;
DROP TABLE IF EXISTS "ClinicPrescription" CASCADE;
DROP TABLE IF EXISTS "ClinicDiagnosis" CASCADE;
DROP TABLE IF EXISTS "ClinicVital" CASCADE;
DROP TABLE IF EXISTS "StudentHealthProfile" CASCADE;
DROP TABLE IF EXISTS "Icd10ParentLabel" CASCADE;

-- Revert ClinicVisit extensions
ALTER TABLE "ClinicVisit" 
DROP CONSTRAINT IF EXISTS "ClinicVisit_consultedById_fkey",
DROP CONSTRAINT IF EXISTS "ClinicVisit_triageById_fkey",
DROP COLUMN IF EXISTS "closedAt",
DROP COLUMN IF EXISTS "consultedById",
DROP COLUMN IF EXISTS "triageById",
DROP COLUMN IF EXISTS "disposition",
DROP COLUMN IF EXISTS "isConfidential",
DROP COLUMN IF EXISTS "isEmergency",
DROP COLUMN IF EXISTS "acuity",
DROP COLUMN IF EXISTS "source";
