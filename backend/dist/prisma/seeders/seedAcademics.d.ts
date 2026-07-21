import { PrismaClient, School, Teacher, Student } from '../../src/generated/client';
export declare function seedAcademics(prisma: PrismaClient, school: School, teachers: Teacher[], students: Student[]): Promise<{
    schoolClass: {
        id: string;
        name: string;
        schoolId: string;
        level: string;
        capacity: number | null;
        sectionId: string | null;
        teacherId: string | null;
    };
    dbSubjects: {
        department: string | null;
        id: string;
        name: string;
        code: string | null;
        schoolId: string;
        departmentId: string | null;
        gradingType: string;
        credits: number | null;
        isIndustrial: boolean;
        isProject: boolean;
        isSubsidiary: boolean;
        caWeight: number;
        examWeight: number;
    }[];
}>;
