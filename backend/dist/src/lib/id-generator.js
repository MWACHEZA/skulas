import prisma from './prisma';
/**
 * Generates a sequential ID following the legacy pattern: PREFIX-YY000001 or PREFIX-GLB-YY000001 (for global)
 * @param schoolId - The unique ID of the school (null for global records)
 * @param role - The user role or entity type
 * @param tx - Optional Prisma Transaction Client
 * @returns {Promise<string>} - The generated ID
 */
export async function generateSequentialId(schoolId, role, tx) {
    const client = tx || prisma;
    const prefixMap = {
        STUDENT: 'STU',
        TEACHER: 'TCH',
        SCHOOL_ADMIN: 'ADM',
        BURSAR: 'BUR',
        LIBRARIAN: 'LIB',
        ANCILLARY: 'ANC',
        ALUMNI: 'ALU',
        SUPPLIER: 'SUP',
        PARENT: 'PAR'
    };
    const roleUpper = role.toUpperCase();
    const prefix = prefixMap[roleUpper] || (roleUpper === 'APPLICATION' ? 'APP' : 'USR');
    const yearShort = new Date().getFullYear().toString().slice(-2);
    // Special handling for Application IDs which include school code
    if (roleUpper === 'APPLICATION' && schoolId) {
        const school = await client.school.findUnique({ where: { id: schoolId }, select: { code: true } });
        const schoolCode = school?.code || 'XX';
        const pattern = `APP-${schoolCode}-${yearShort}`;
        const last = await client.application.findFirst({
            where: { schoolId, applicationNumber: { startsWith: pattern } },
            orderBy: { applicationNumber: 'desc' },
            select: { applicationNumber: true }
        });
        const highestId = last?.applicationNumber || '';
        let nextNumber = 1;
        if (highestId && highestId.startsWith(pattern)) {
            const sequencePart = highestId.substring(pattern.length);
            const numericPart = sequencePart.match(/^\d+/);
            if (numericPart) {
                nextNumber = parseInt(numericPart[0], 10) + 1;
            }
        }
        const paddedSequence = nextNumber.toString().padStart(4, '0');
        return `${pattern}${paddedSequence}`;
    }
    // Pattern for local school vs global registry
    const pattern = schoolId ? `${prefix}-${yearShort}` : `${prefix}-GLB-${yearShort}`;
    let highestId = '';
    if (roleUpper === 'STUDENT' && schoolId) {
        const last = await client.student.findFirst({
            where: { schoolId, studentId: { startsWith: pattern } },
            orderBy: { studentId: 'desc' },
            select: { studentId: true }
        });
        highestId = last?.studentId || '';
    }
    else if (roleUpper === 'TEACHER' && schoolId) {
        const last = await client.teacher.findFirst({
            where: { schoolId, staffId: { startsWith: pattern } },
            orderBy: { staffId: 'desc' },
            select: { staffId: true }
        });
        highestId = last?.staffId || '';
    }
    else if (roleUpper === 'SUPPLIER' && schoolId) {
        // Generate school-specific ID for linked suppliers
        const last = await client.schoolSupplier.findFirst({
            where: { schoolId, schoolSpecificId: { startsWith: pattern } },
            orderBy: { schoolSpecificId: 'desc' },
            select: { schoolSpecificId: true }
        });
        highestId = last?.schoolSpecificId || '';
    }
    else if (roleUpper === 'SUPPLIER' && !schoolId) {
        // Global Supplier ID
        const last = await client.supplier.findFirst({
            where: { globalId: { startsWith: pattern } },
            orderBy: { globalId: 'desc' },
            select: { globalId: true }
        });
        highestId = last?.globalId || '';
    }
    else if (roleUpper === 'PARENT' && !schoolId) {
        // Global Parent ID
        const last = await client.parent.findFirst({
            where: { globalId: { startsWith: pattern } },
            orderBy: { globalId: 'desc' },
            select: { globalId: true }
        });
        highestId = last?.globalId || '';
    }
    else {
        // For other staff roles (BUR, LIB, ADM, etc.)
        const last = await client.user.findFirst({
            where: {
                schoolId,
                role: roleUpper,
                staffId: { startsWith: pattern }
            },
            orderBy: { staffId: 'desc' },
            select: { staffId: true }
        });
        highestId = last?.staffId || '';
    }
    let nextNumber = 1;
    if (highestId && highestId.startsWith(pattern)) {
        const sequencePart = highestId.substring(pattern.length);
        const numericPart = sequencePart.match(/^\d+/);
        if (numericPart) {
            nextNumber = parseInt(numericPart[0], 10) + 1;
        }
    }
    const paddedSequence = nextNumber.toString().padStart(6, '0');
    return `${pattern}${paddedSequence}`;
}
//# sourceMappingURL=id-generator.js.map