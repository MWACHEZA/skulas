import { PrismaClient, School, User, Student } from '../../src/generated/client';
export declare function seedExtras(prisma: PrismaClient, school: School, admin: User, student: Student): Promise<void>;
