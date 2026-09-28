-- Rollback Migration: 20260928_student_leader_cleaning_requests_rollback
-- Reverts all changes made by the up migration

-- 1. Remove DB Check constraint
ALTER TABLE "Requisition" DROP CONSTRAINT IF EXISTS "check_student_leader_zero_amount";

-- 2. Drop Requisition foreign keys and columns
ALTER TABLE "Requisition" DROP CONSTRAINT IF EXISTS "Requisition_issuedById_fkey";
ALTER TABLE "Requisition" DROP CONSTRAINT IF EXISTS "Requisition_matronApprovedById_fkey";
ALTER TABLE "Requisition" DROP CONSTRAINT IF EXISTS "Requisition_requestedByStudentId_fkey";
ALTER TABLE "Requisition" DROP CONSTRAINT IF EXISTS "Requisition_hostelReqId_fkey";

ALTER TABLE "Requisition" 
    DROP COLUMN IF EXISTS "receivedAt",
    DROP COLUMN IF EXISTS "issuedById",
    DROP COLUMN IF EXISTS "issuedAt",
    DROP COLUMN IF EXISTS "rejectionReason",
    DROP COLUMN IF EXISTS "matronApprovedById",
    DROP COLUMN IF EXISTS "matronApprovedAt",
    DROP COLUMN IF EXISTS "requestedByStudentId",
    DROP COLUMN IF EXISTS "hostelReqId",
    DROP COLUMN IF EXISTS "requesterRole";

-- 3. Drop Hostel warden foreign key and column
ALTER TABLE "Hostel" DROP CONSTRAINT IF EXISTS "Hostel_wardenUserId_fkey";
ALTER TABLE "Hostel" DROP COLUMN IF EXISTS "wardenUserId";

-- 4. Drop PhysicalProductConsumption hostelId
DROP INDEX IF EXISTS "PhysicalProductConsumption_hostelId_idx";
ALTER TABLE "PhysicalProductConsumption" DROP COLUMN IF EXISTS "hostelId";

-- 5. Drop StudentAllowedItem Table
DROP TABLE IF EXISTS "StudentAllowedItem" CASCADE;

-- 6. Drop LeadershipAssignment Table
DROP TABLE IF EXISTS "LeadershipAssignment" CASCADE;

-- 7. Drop Enum types
DROP TYPE IF EXISTS "RequesterRole";
DROP TYPE IF EXISTS "LeadershipRole";
