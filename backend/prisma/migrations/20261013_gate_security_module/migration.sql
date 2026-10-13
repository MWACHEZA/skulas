-- Migration: 20261013_gate_security_module
-- Up Migration: Gate security module tables, signed QR tokens, gate logs, payment plan grace overrides

-- 1. Extend SchoolSetting with gate grace days and cutoff time
ALTER TABLE "SchoolSetting" 
ADD COLUMN IF NOT EXISTS "gateGraceDays" INTEGER NOT NULL DEFAULT 3,
ADD COLUMN IF NOT EXISTS "gateCutoffTime" TEXT DEFAULT '08:00';

-- 2. Extend PaymentPlan with allowGateEntry humanitarian override
ALTER TABLE "PaymentPlan" 
ADD COLUMN IF NOT EXISTS "allowGateEntry" BOOLEAN NOT NULL DEFAULT false;

-- 3. Extend User with gatePin for guard authentication and HM overrides
ALTER TABLE "User" 
ADD COLUMN IF NOT EXISTS "gatePin" TEXT;

-- 4. Create student_qr_codes table
CREATE TABLE IF NOT EXISTS "student_qr_codes" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "qrToken" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "printedAt" TIMESTAMP(3),
    "deactivatedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "student_qr_codes_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "student_qr_codes_qrToken_key" UNIQUE ("qrToken")
);

-- 5. Create staff_qr_codes table
CREATE TABLE IF NOT EXISTS "staff_qr_codes" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "staffId" TEXT NOT NULL,
    "qrToken" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "printedAt" TIMESTAMP(3),
    "deactivatedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "staff_qr_codes_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "staff_qr_codes_qrToken_key" UNIQUE ("qrToken")
);

-- 6. Create gate_logs table
CREATE TABLE IF NOT EXISTS "gate_logs" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "studentId" TEXT,
    "staffId" TEXT,
    "scannedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "scannedByGuardId" TEXT,
    "deviceId" TEXT,
    "direction" TEXT NOT NULL DEFAULT 'IN',
    "entryStatus" TEXT NOT NULL,
    "feeStatusSnapshot" TEXT,
    "balanceAtScan" DOUBLE PRECISION,
    "paymentPlanId" TEXT,
    "denialReason" TEXT,
    "attendanceRecordId" TEXT,
    "overrideByStaffId" TEXT,
    "overrideReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "gate_logs_pkey" PRIMARY KEY ("id")
);

-- 7. Add foreign keys and indices
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'student_qr_codes_schoolId_fkey') THEN
        ALTER TABLE "student_qr_codes" 
        ADD CONSTRAINT "student_qr_codes_schoolId_fkey" 
        FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'student_qr_codes_studentId_fkey') THEN
        ALTER TABLE "student_qr_codes" 
        ADD CONSTRAINT "student_qr_codes_studentId_fkey" 
        FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'staff_qr_codes_schoolId_fkey') THEN
        ALTER TABLE "staff_qr_codes" 
        ADD CONSTRAINT "staff_qr_codes_schoolId_fkey" 
        FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'staff_qr_codes_staffId_fkey') THEN
        ALTER TABLE "staff_qr_codes" 
        ADD CONSTRAINT "staff_qr_codes_staffId_fkey" 
        FOREIGN KEY ("staffId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'gate_logs_schoolId_fkey') THEN
        ALTER TABLE "gate_logs" 
        ADD CONSTRAINT "gate_logs_schoolId_fkey" 
        FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'gate_logs_studentId_fkey') THEN
        ALTER TABLE "gate_logs" 
        ADD CONSTRAINT "gate_logs_studentId_fkey" 
        FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'gate_logs_staffId_fkey') THEN
        ALTER TABLE "gate_logs" 
        ADD CONSTRAINT "gate_logs_staffId_fkey" 
        FOREIGN KEY ("staffId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'gate_logs_scannedByGuardId_fkey') THEN
        ALTER TABLE "gate_logs" 
        ADD CONSTRAINT "gate_logs_scannedByGuardId_fkey" 
        FOREIGN KEY ("scannedByGuardId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'gate_logs_paymentPlanId_fkey') THEN
        ALTER TABLE "gate_logs" 
        ADD CONSTRAINT "gate_logs_paymentPlanId_fkey" 
        FOREIGN KEY ("paymentPlanId") REFERENCES "PaymentPlan"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS "student_qr_codes_schoolId_idx" ON "student_qr_codes"("schoolId");
CREATE INDEX IF NOT EXISTS "student_qr_codes_studentId_idx" ON "student_qr_codes"("studentId");
CREATE INDEX IF NOT EXISTS "student_qr_codes_qrToken_idx" ON "student_qr_codes"("qrToken");

CREATE INDEX IF NOT EXISTS "staff_qr_codes_schoolId_idx" ON "staff_qr_codes"("schoolId");
CREATE INDEX IF NOT EXISTS "staff_qr_codes_staffId_idx" ON "staff_qr_codes"("staffId");
CREATE INDEX IF NOT EXISTS "staff_qr_codes_qrToken_idx" ON "staff_qr_codes"("qrToken");

CREATE INDEX IF NOT EXISTS "gate_logs_schoolId_idx" ON "gate_logs"("schoolId");
CREATE INDEX IF NOT EXISTS "gate_logs_studentId_idx" ON "gate_logs"("studentId");
CREATE INDEX IF NOT EXISTS "gate_logs_scannedAt_idx" ON "gate_logs"("scannedAt");
CREATE INDEX IF NOT EXISTS "gate_logs_schoolId_scannedAt_idx" ON "gate_logs"("schoolId", "scannedAt");
