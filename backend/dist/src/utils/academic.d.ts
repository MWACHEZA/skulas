export type ProgramLevel = 'UNDERGRADUATE' | 'PG_DIPLOMA' | 'MASTERS_TAUGHT' | 'MASTERS_RESEARCH' | 'MPHIL' | 'PHD';
/**
 * NUST Zimbabwean University Division Mapping
 *
 * UNDERGRADUATE:
 * % Range | Division | Point
 * --------|----------|-------
 * 75-100  | 1        | 4.0
 * 65-74   | 2.1      | 3.0
 * 60-64   | 2.2      | 2.0
 * 50-59   | Pass     | 1.0
 * 0-49    | Fail     | 0.0
 *
 * POSTGRADUATE (Taught):
 * % Range | Division    | Point
 * --------|-------------|-------
 * 80-100  | Distinction | 4.0
 * 70-79   | Merit       | 3.0
 * 60-69   | Credit      | 2.0
 * 50-59   | Pass        | 1.0
 * 0-49    | Fail        | 0.0
 */
export declare function calculateUniversityDivision(score: number, level?: ProgramLevel): string;
export declare function calculateGradePoint(score: number, level?: ProgramLevel): number;
export declare function calculateGPA(grades: {
    score: number;
    credits?: number;
}[], level?: ProgramLevel): number;
/**
 * ACADEMIC STANDING LOGIC
 * Based on NUST General Academic Regulations
 */
export type AcademicStanding = 'Normal' | 'Carry Over' | 'Repeat' | 'Discontinue' | 'Withdraw';
export declare function determineAcademicStanding(results: {
    score: number;
    isPassed: boolean;
}[], previousFailsCount?: number): {
    standing: AcademicStanding;
    reasons: string[];
};
/**
 * INDUSTRIAL ATTACHMENT GRADING
 * 50% CA + 50% Final (40% Report + 10% Oral)
 */
export declare function calculateIndustrialAttachmentMark(scores: {
    industrialSup: number;
    academicSup: number;
    report: number;
    oral: number;
}): number;
/**
 * COURSE CODING SYSTEM
 * XXX 0000 -> Faculty/Dept Code + Part + Digits
 * First digit mapping:
 * 1-4: UG Part I-IV
 * 5: PGD / Masters Part I
 * 6: Masters Part II
 * 8: MPhil
 * 9: PhD
 */
export declare function generateCourseCode(deptCode: string, part: number, sequence: number, level?: ProgramLevel): string;
/**
 * Extract level from course code
 */
export declare function getLevelFromCode(code: string): number;
export interface AdmissionCriteria {
    oLevels: string[];
    aLevels: string[];
    age?: number;
    entryCategory: 'Normal' | 'Special' | 'Mature';
}
export declare function checkUniversityEligibility(criteria: AdmissionCriteria): {
    eligible: boolean;
    reasons: string[];
    flags: string[];
};
