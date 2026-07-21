import { PrismaClient, School, Student } from '../../src/generated/client';
export declare function seedInfrastructure(prisma: PrismaClient, school: School, students: Student[]): Promise<void>;
