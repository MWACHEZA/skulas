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
export function calculateUniversityDivision(score, level = 'UNDERGRADUATE') {
    if (level === 'UNDERGRADUATE') {
        if (score >= 75)
            return '1';
        if (score >= 65)
            return '2.1';
        if (score >= 60)
            return '2.2';
        if (score >= 50)
            return 'Pass';
        return 'Fail';
    }
    // PG Diplomas and Taught Masters
    if (level === 'PG_DIPLOMA' || level === 'MASTERS_TAUGHT') {
        if (score >= 80)
            return 'Distinction';
        if (score >= 70)
            return 'Merit';
        if (score >= 60)
            return 'Credit';
        if (score >= 50)
            return 'Pass';
        return 'Fail';
    }
    // Research Degrees (MPhil/PhD) are usually non-classified
    return score >= 50 ? 'Pass' : 'Fail';
}
export function calculateGradePoint(score, level = 'UNDERGRADUATE') {
    if (level === 'UNDERGRADUATE') {
        if (score >= 75)
            return 4.0;
        if (score >= 65)
            return 3.0;
        if (score >= 60)
            return 2.0;
        if (score >= 50)
            return 1.0;
        return 0.0;
    }
    // PG
    if (score >= 80)
        return 4.0;
    if (score >= 70)
        return 3.0;
    if (score >= 60)
        return 2.0;
    if (score >= 50)
        return 1.0;
    return 0.0;
}
export function calculateGPA(grades, level = 'UNDERGRADUATE') {
    if (grades.length === 0)
        return 0.0;
    let totalPoints = 0;
    let totalCredits = 0;
    grades.forEach(g => {
        const credits = g.credits || 0;
        const point = calculateGradePoint(g.score, level);
        totalPoints += point * credits;
        totalCredits += credits;
    });
    return totalCredits > 0 ? parseFloat((totalPoints / totalCredits).toFixed(2)) : 0.0;
}
export function determineAcademicStanding(results, previousFailsCount = 0) {
    const totalModules = results.length;
    if (totalModules === 0)
        return { standing: 'Normal', reasons: [] };
    const passedModules = results.filter(r => r.isPassed).length;
    const failedModules = totalModules - passedModules;
    const passRate = (passedModules / totalModules) * 100;
    const failRate = (failedModules / totalModules) * 100;
    const totalScore = results.reduce((acc, r) => acc + r.score, 0);
    const aggregate = totalScore / totalModules;
    const reasons = [];
    // 1. Withdraw Checks
    if (passRate < 25) {
        reasons.push('Passed less than 25% of modules');
        return { standing: 'Withdraw', reasons };
    }
    if (previousFailsCount >= 1 && passRate < 100) {
        // Simplified: "Failed same part twice" logic usually triggers withdraw
        reasons.push('Failed the same academic part twice');
        return { standing: 'Withdraw', reasons };
    }
    // 2. Discontinue Checks
    if (failRate > 50) {
        reasons.push('Failed more than half of the modules');
        return { standing: 'Discontinue', reasons };
    }
    if (aggregate < 35) {
        reasons.push(`Overall aggregate (${aggregate.toFixed(1)}%) is below minimum 35%`);
        return { standing: 'Discontinue', reasons };
    }
    // 3. Repeat Checks
    // A student pass >= 50% but fails more than 25% (Carry limit)
    if (failRate > 25 && passRate >= 50) {
        reasons.push(`Failed ${failedModules} modules (more than 25% limit for carry-over) but passed 50%+ modules.`);
        return { standing: 'Repeat', reasons };
    }
    // 4. Carry Over
    if (failedModules > 0 && failRate <= 25) {
        reasons.push(`Carrying over ${failedModules} failed module(s).`);
        return { standing: 'Carry Over', reasons };
    }
    return { standing: 'Normal', reasons: [] };
}
/**
 * INDUSTRIAL ATTACHMENT GRADING
 * 50% CA + 50% Final (40% Report + 10% Oral)
 */
export function calculateIndustrialAttachmentMark(scores) {
    const ca = (scores.industrialSup + scores.academicSup) / 2;
    const final = (scores.report * 0.8) + (scores.oral * 0.2); // 40/50 for report, 10/50 for oral relative to the 50% final block
    // Real weights: 
    // CA (50%) = industrialSup*0.25 + academicSup*0.25
    // Final (50%) = report*0.4 + oral*0.1
    const finalMark = (ca * 0.5) + (scores.report * 0.4) + (scores.oral * 0.1);
    return parseFloat(finalMark.toFixed(2));
}
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
export function generateCourseCode(deptCode, part, sequence, level = 'UNDERGRADUATE') {
    const cleanDept = deptCode.toUpperCase().substring(0, 3);
    let partDigit = part;
    if (level === 'PG_DIPLOMA' || level === 'MASTERS_TAUGHT' || level === 'MASTERS_RESEARCH') {
        partDigit = part === 1 ? 5 : 6;
    }
    else if (level === 'MPHIL') {
        partDigit = 8;
    }
    else if (level === 'PHD') {
        partDigit = 9;
    }
    const seqStr = sequence.toString().padStart(3, '0');
    return `${cleanDept}${partDigit}${seqStr}`; // e.g. SCS5101
}
/**
 * Extract level from course code
 */
export function getLevelFromCode(code) {
    const digits = code.match(/\d+/);
    if (!digits)
        return 1;
    const firstDigit = parseInt(digits[0][0]);
    return firstDigit;
}
/**
 * ADMISSION ELIGIBILITY LOGIC
 */
const OVERLAP_GROUPS = [
    ['Accounting', 'Accounts, Principles of', 'Accounts', 'Bookkeeping'],
    ['Art', 'History of Art'],
    ['Biology', 'Rural Biology', 'Botany', 'Zoology', 'General Science'],
    ['Chemistry', 'Physical Science', 'Physics with Chemistry', 'General Science'],
    ['Economic Geography', 'Geography', 'Environmental Studies'],
    ['Economics', 'Economic Principles', 'Commerce'],
    ['Elementary Physiology', 'Human Biology'],
    ['Elements of Sociology', 'Sociology'],
    ['Engineering Drawing', 'Technical Drawing'],
    ['Environmental Studies', 'Geography'],
    ['General Mathematics', 'Mathematics'],
    ['General Science', 'Physics', 'Physical Science', 'Physics with Chemistry', 'Biology', 'Zoology', 'Botany', 'Rural Biology'],
    ['Geography', 'Economic Geography'],
    ['Government & Political Studies', 'Politics', 'Government & Politics'],
    ['Health Science', 'Human Biology'],
    ['Human Biology', 'Zoology', 'Biology', 'Health Science'],
    ['Mathematics', 'Pure & Applied Mathematics', 'Pure Mathematics', 'Applied Mathematics'],
    ['Physical Science', 'Physics with Chemistry', 'General Science', 'Physics'],
    ['Physics', 'Physics with Chemistry', 'Physical Science', 'General Science'],
    ['Pure & Applied Mathematics', 'Pure Mathematics', 'Applied Mathematics'],
    ['Social Science', 'Sociology'],
    ['Zoology', 'Human Biology', 'Health Science']
];
export function checkUniversityEligibility(criteria) {
    const reasons = [];
    const flags = [];
    // 1. Overlap Filtering Helper
    const getUniqueCount = (subjects) => {
        const processed = new Set();
        const uniqueList = [];
        subjects.forEach(s => {
            // Find if this subject belongs to any overlap group
            const group = OVERLAP_GROUPS.find(g => g.includes(s));
            if (group) {
                // Use a consistent key for the group (the first item)
                const groupKey = `group_overlap_${group[0]}`;
                if (!processed.has(groupKey)) {
                    processed.add(groupKey);
                    uniqueList.push(s);
                }
                else {
                    flags.push(`Overlap detected: '${s}' excluded as it overlaps with another subject.`);
                }
            }
            else {
                if (!processed.has(s)) {
                    processed.add(s);
                    uniqueList.push(s);
                }
            }
        });
        return uniqueList.length;
    };
    const uniqueOLevels = getUniqueCount(criteria.oLevels);
    const hasEng = criteria.oLevels.some(s => s.toLowerCase().includes('english'));
    const hasMath = criteria.oLevels.some(s => s.toLowerCase().includes('mathematics') || s.toLowerCase().includes('accounts'));
    if (criteria.entryCategory === 'Normal') {
        if (uniqueOLevels < 5)
            reasons.push(`Requires at least 5 O-Level subjects (Unique: ${uniqueOLevels})`);
        if (!hasEng)
            reasons.push('Missing English Language at O-Level');
        if (!hasMath)
            reasons.push('Missing Mathematics at O-Level');
        if (criteria.aLevels.length < 2)
            reasons.push(`Requires at least 2 A-Level subjects (Current: ${criteria.aLevels.length})`);
    }
    if (criteria.entryCategory === 'Mature') {
        if (!criteria.age || criteria.age < 25)
            reasons.push(`Mature entry requires age >= 25 (Current: ${criteria.age || 'Unknown'})`);
        if (uniqueOLevels < 5)
            reasons.push(`Requires at least 5 O-Level subjects (Unique: ${uniqueOLevels})`);
        if (!hasEng)
            reasons.push('Missing English Language at O-Level');
        if (!hasMath)
            reasons.push('Missing Mathematics at O-Level');
    }
    return {
        eligible: reasons.length === 0,
        reasons,
        flags
    };
}
//# sourceMappingURL=academic.js.map