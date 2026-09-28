-- Migration: 20260928_student_leader_cleaning_requests
-- Up Migration: Add leadership assignments, student allowed items, and procurement request extensions

-- 1. Create LeadershipRole and RequesterRole Enums if not exist
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'LeadershipRole') THEN
        CREATE TYPE "LeadershipRole" AS ENUM (
            'HEAD_BOY', 'HEAD_GIRL', 'HOSTEL_PREFECT', 
            'DINING_PREFECT', 'SRC_PRESIDENT', 'SRC_MEMBER'
        );
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'RequesterRole') THEN
        CREATE TYPE "RequesterRole" AS ENUM (
            'TEACHER', 'ANCILLARY', 'ADMIN', 'STUDENT_LEADER'
        );
    END IF;
END $$;

-- 2. Create LeadershipAssignment Table
CREATE TABLE IF NOT EXISTS "LeadershipAssignment" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "leadershipRole" "LeadershipRole" NOT NULL,
    "hostelId" TEXT,
    "term" TEXT NOT NULL,
    "academicYear" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "assignedById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LeadershipAssignment_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "LeadershipAssignment_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "LeadershipAssignment_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "LeadershipAssignment_hostelId_fkey" FOREIGN KEY ("hostelId") REFERENCES "Hostel"("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "LeadershipAssignment_assignedById_fkey" FOREIGN KEY ("assignedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "LeadershipAssignment_schoolId_studentId_isActive_idx" 
ON "LeadershipAssignment"("schoolId", "studentId", "isActive");

-- 3. Create StudentAllowedItem Table
CREATE TABLE IF NOT EXISTS "StudentAllowedItem" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "itemSku" TEXT NOT NULL,
    "itemName" TEXT NOT NULL,
    "category" TEXT NOT NULL DEFAULT 'cleaning',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StudentAllowedItem_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "StudentAllowedItem_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "StudentAllowedItem_schoolId_itemSku_key" UNIQUE ("schoolId", "itemSku")
);

CREATE INDEX IF NOT EXISTS "StudentAllowedItem_schoolId_idx" ON "StudentAllowedItem"("schoolId");

-- 4. Alter Hostel: add wardenUserId
ALTER TABLE "Hostel" ADD COLUMN IF NOT EXISTS "wardenUserId" TEXT;
DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'Hostel_wardenUserId_fkey'
    ) THEN
        ALTER TABLE "Hostel" ADD CONSTRAINT "Hostel_wardenUserId_fkey" 
        FOREIGN KEY ("wardenUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
END $$;

-- 5. Alter Requisition: add student leader fields & references
ALTER TABLE "Requisition" ADD COLUMN IF NOT EXISTS "requesterRole" "RequesterRole";
ALTER TABLE "Requisition" ADD COLUMN IF NOT EXISTS "hostelReqId" TEXT;
ALTER TABLE "Requisition" ADD COLUMN IF NOT EXISTS "requestedByStudentId" TEXT;
ALTER TABLE "Requisition" ADD COLUMN IF NOT EXISTS "matronApprovedAt" TIMESTAMP(3);
ALTER TABLE "Requisition" ADD COLUMN IF NOT EXISTS "matronApprovedById" TEXT;
ALTER TABLE "Requisition" ADD COLUMN IF NOT EXISTS "rejectionReason" TEXT;
ALTER TABLE "Requisition" ADD COLUMN IF NOT EXISTS "issuedAt" TIMESTAMP(3);
ALTER TABLE "Requisition" ADD COLUMN IF NOT EXISTS "issuedById" TEXT;
ALTER TABLE "Requisition" ADD COLUMN IF NOT EXISTS "receivedAt" TIMESTAMP(3);

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Requisition_hostelReqId_fkey') THEN
        ALTER TABLE "Requisition" ADD CONSTRAINT "Requisition_hostelReqId_fkey" 
        FOREIGN KEY ("hostelReqId") REFERENCES "Hostel"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Requisition_requestedByStudentId_fkey') THEN
        ALTER TABLE "Requisition" ADD CONSTRAINT "Requisition_requestedByStudentId_fkey" 
        FOREIGN KEY ("requestedByStudentId") REFERENCES "Student"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Requisition_matronApprovedById_fkey') THEN
        ALTER TABLE "Requisition" ADD CONSTRAINT "Requisition_matronApprovedById_fkey" 
        FOREIGN KEY ("matronApprovedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Requisition_issuedById_fkey') THEN
        ALTER TABLE "Requisition" ADD CONSTRAINT "Requisition_issuedById_fkey" 
        FOREIGN KEY ("issuedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
END $$;

-- 6. Enforce DB constraint: For student_leader requests, estimatedAmount must be 0
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'check_student_leader_zero_amount') THEN
        ALTER TABLE "Requisition" ADD CONSTRAINT "check_student_leader_zero_amount" 
        CHECK ("requesterRole" IS DISTINCT FROM 'STUDENT_LEADER' OR "estimatedAmount" = 0);
    END IF;
END $$;

-- 7. Alter PhysicalProductConsumption: add hostelId
ALTER TABLE "PhysicalProductConsumption" ADD COLUMN IF NOT EXISTS "hostelId" TEXT;
CREATE INDEX IF NOT EXISTS "PhysicalProductConsumption_hostelId_idx" ON "PhysicalProductConsumption"("hostelId");
