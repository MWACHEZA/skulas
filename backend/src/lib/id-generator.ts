import prisma from './prisma';

/**
 * Generates a sequential ID following the legacy pattern: PREFIX-YY000001 or PREFIX-GLB-YY000001 (for global)
 *
 * Uses an atomic upsert + increment on the `SchoolSequence` table so that concurrent calls
 * for the same school/entity always get a unique value — eliminating the previous
 * select-max + insert race condition.
 *
 * @param schoolId - The unique ID of the school (null for global records like Supplier, Parent)
 * @param role - The user role or entity type
 * @param tx - Optional Prisma Transaction Client (pass `tx` when calling inside a $transaction)
 * @returns {Promise<string>} - The generated ID
 */
export async function generateSequentialId(schoolId: string | null, role: string, tx?: any): Promise<string> {
  const client = tx || prisma;

  const prefixMap: Record<string, string> = {
    STUDENT: 'STU',
    TEACHER: 'TCH',
    SCHOOL_ADMIN: 'ADM',
    BURSAR: 'BUR',
    LIBRARIAN: 'LIB',
    ANCILLARY: 'ANC',
    ALUMNI: 'ALU',
    SUPPLIER: 'SUP',
    PARENT: 'PAR',
    APPLICATION: 'APP',
  };

  const roleUpper = role.toUpperCase();
  const prefix = prefixMap[roleUpper] ?? 'USR';
  const yearShort = new Date().getFullYear().toString().slice(-2);

  // '__GLOBAL__' is the sentinel for global (non-school-specific) sequences
  const sequenceSchoolId = schoolId ?? '__GLOBAL__';

  // ── Atomically increment the counter ────────────────────────────────────────
  // upsert: create row with lastValue=1 if it doesn't exist yet,
  //         or increment lastValue by 1 if it does.
  // This single SQL statement is safe under any level of concurrent requests.
  const sequence = await client.schoolSequence.upsert({
    where: {
      schoolId_entity: { schoolId: sequenceSchoolId, entity: roleUpper },
    },
    create: {
      schoolId: sequenceSchoolId,
      entity: roleUpper,
      lastValue: 1,
    },
    update: {
      lastValue: { increment: 1 },
    },
  });

  const nextNumber = sequence.lastValue;

  // ── Format the ID ────────────────────────────────────────────────────────────
  if (roleUpper === 'APPLICATION' && schoolId) {
    // Application IDs embed the school code: APP-SCHOOLCODE-YY0001
    const school = await client.school.findUnique({
      where: { id: schoolId },
      select: { code: true },
    });
    const schoolCode = school?.code ?? 'XX';
    const paddedSequence = nextNumber.toString().padStart(4, '0');
    return `APP-${schoolCode}-${yearShort}${paddedSequence}`;
  }

  const pattern = schoolId ? `${prefix}-${yearShort}` : `${prefix}-GLB-${yearShort}`;
  const padLength = roleUpper === 'APPLICATION' ? 4 : 6;
  const paddedSequence = nextNumber.toString().padStart(padLength, '0');
  return `${pattern}${paddedSequence}`;
}
