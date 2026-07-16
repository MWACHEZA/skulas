import { Response } from 'express';
interface ReportData {
    student: {
        name: string;
        studentId: string;
        class?: {
            name: string;
            level: string;
        };
    };
    grades: Array<{
        subject: {
            name: string;
            code: string;
        };
        score: number;
        grade: string;
        teacherComment?: string;
    }>;
    attendance: {
        present: number;
        absent: number;
        rate: number;
    };
    school: {
        name: string;
        address?: string;
        email?: string;
        logo?: string;
        type?: string;
        branding?: {
            primaryColor?: string;
        };
    };
    term: string;
    year: string;
}
export declare function generateAcademicReportPDF(data: ReportData, res: Response): Promise<void>;
export {};
