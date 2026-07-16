-- CreateTable: Atomic sequential ID counter per school/entity.
-- This replaces the race-prone select-max+1 pattern in id-generator.ts.
CREATE TABLE "SchoolSequence" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "entity" TEXT NOT NULL,
    "lastValue" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "SchoolSequence_pkey" PRIMARY KEY ("id")
);

-- CreateIndex: Composite unique ensures one counter per school+entity combination.
CREATE UNIQUE INDEX "SchoolSequence_schoolId_entity_key" ON "SchoolSequence"("schoolId", "entity");

