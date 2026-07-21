import { PrismaClient, School, Student, User } from '../../src/generated/client';
export declare function seedFinance(prisma: PrismaClient, school: School, students: Student[], staff: User[]): Promise<void>;
