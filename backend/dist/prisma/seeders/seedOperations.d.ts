import { PrismaClient, School, Student, User } from '../../src/generated/client';
export declare function seedOperations(prisma: PrismaClient, school: School, students: Student[], staff: User[]): Promise<void>;
