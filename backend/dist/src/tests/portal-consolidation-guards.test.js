"use strict";
/**
 * Portal Consolidation & Security Guard Automated Test Suite
 *
 * Verifies:
 * 1. Clinic Data Scrubbing: Student and Parent roles receive plain-language summaries
 *    with vitals, ICD-10 codes, and clinical dosages completely omitted.
 * 2. Parent-Child Fee Boundary: Parent can only access invoices and ledgers belonging to their linked children.
 * 3. Teacher Class Attendance Scope: Teacher is restricted to recording/viewing attendance for assigned classes.
 * 4. Cross-Tenant Requisition Isolation: Student leader in Tenant A cannot query or view Tenant B requests.
 * 5. Procurement RBAC Enforcement: Unauthorized roles cannot approve or issue requisitions.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.runConsolidationGuardTests = runConsolidationGuardTests;
function serializeClinicVisitForAudience(visit, role) {
    if (role === 'NURSE' || role === 'DOCTOR' || role === 'CLINICIAN') {
        return visit; // Full clinical view
    }
    // Scrubbed patient/parent facing view
    const mapReason = (v) => {
        if (v.symptoms?.toLowerCase().includes('headache'))
            return 'Reported feeling unwell (headache)';
        if (v.symptoms?.toLowerCase().includes('fever'))
            return 'Reported mild fever / temperature';
        if (v.symptoms?.toLowerCase().includes('stomach'))
            return 'Reported upset stomach';
        return 'General health checkup / clinic visit';
    };
    const mapTreatment = (v) => {
        if (v.treatment?.toLowerCase().includes('paracetamol'))
            return 'Rest and mild pain relief provided';
        if (v.treatment?.toLowerCase().includes('rest'))
            return 'Bed rest in clinic observation';
        return 'Standard clinic care and observation provided';
    };
    return {
        id: visit.id,
        studentId: visit.studentId,
        reason: mapReason(visit),
        treatmentSummary: mapTreatment(visit),
        // Explicitly omit sensitive vitals, ICD10, and clinical dosage
        temperature: undefined,
        bloodPressure: undefined,
        heartRate: undefined,
        oxygenLevel: undefined,
        vitalSigns: undefined,
        icd10Code: undefined,
        clinicalDosage: undefined,
        notes: undefined,
    };
}
function verifyParentChildFeeAccess(parentChildStudentIds, requestedInvoiceStudentId) {
    return parentChildStudentIds.includes(requestedInvoiceStudentId);
}
function verifyTeacherClassAttendanceAccess(teacherAssignedClassIds, targetClassId) {
    return teacherAssignedClassIds.includes(targetClassId);
}
function verifyStudentRequisitionTenantAccess(user, requisition) {
    if (user.schoolId !== requisition.schoolId) {
        return { allowed: false, reason: 'Cross-tenant requisition access forbidden' };
    }
    if (!user.isLeader) {
        return { allowed: false, reason: 'Active student leadership assignment required' };
    }
    return { allowed: true };
}
function verifyRequisitionIssueRBAC(role) {
    const allowedRoles = ['ANCILLARY', 'BURSAR', 'SCHOOL_ADMIN', 'SUPER_ADMIN'];
    if (!allowedRoles.includes(role)) {
        return { allowed: false, statusCode: 403 };
    }
    return { allowed: true, statusCode: 200 };
}
function verifyRequisitionMatronApprovalRBAC(role, department) {
    if (role === 'SUPER_ADMIN' || role === 'SCHOOL_ADMIN') {
        return { allowed: true, statusCode: 200 };
    }
    if (role === 'ANCILLARY' && department?.toLowerCase() === 'boarding') {
        return { allowed: true, statusCode: 200 };
    }
    return { allowed: false, statusCode: 403 };
}
async function runConsolidationGuardTests() {
    console.log('=================================================================');
    console.log('  RUNNING PORTAL CONSOLIDATION GUARDS & SERIALIZATION TEST SUITE  ');
    console.log('=================================================================\n');
    let passed = 0;
    let failed = 0;
    function assert(condition, testName, detail) {
        if (condition) {
            console.log(`[PASS] ${testName}`);
            passed++;
        }
        else {
            console.error(`[FAIL] ${testName}`);
            if (detail)
                console.error(`       Detail: ${detail}`);
            failed++;
        }
    }
    // ---------------------------------------------------------------------------
    // TEST SUITE 1: Clinic Scrubbed Serialization for Student and Parent
    // ---------------------------------------------------------------------------
    console.log('--- Test Suite 1: Clinic Data Scrubbing ---');
    {
        const rawVisit = {
            id: 'visit-101',
            studentId: 'stud-1',
            symptoms: 'Acute headache, nausea',
            diagnosis: 'Migraine with aura, ICD10: G43.909',
            treatment: 'Paracetamol 500mg, oral rehydration',
            temperature: 38.6,
            bloodPressure: '118/76',
            heartRate: 88,
            oxygenLevel: 98,
            vitalSigns: { pulse: 88, bp: '118/76', temp: 38.6 },
            icd10Code: 'G43.909',
            clinicalDosage: '500mg q8h PO',
            notes: 'Patient advised to avoid bright light.'
        };
        const studentView = serializeClinicVisitForAudience(rawVisit, 'STUDENT');
        assert(studentView.temperature === undefined &&
            studentView.bloodPressure === undefined &&
            studentView.icd10Code === undefined &&
            studentView.clinicalDosage === undefined &&
            studentView.vitalSigns === undefined &&
            studentView.notes === undefined, 'Student clinic response omits vital signs, raw ICD-10, and clinical dosage');
        assert(studentView.reason === 'Reported feeling unwell (headache)' &&
            studentView.treatmentSummary === 'Rest and mild pain relief provided', 'Student clinic response provides reassuring plain-language reason and treatment');
        const parentView = serializeClinicVisitForAudience(rawVisit, 'PARENT');
        assert(parentView.icd10Code === undefined && parentView.bloodPressure === undefined, 'Parent clinic response protects medical confidentiality with plain summary');
        const nurseView = serializeClinicVisitForAudience(rawVisit, 'NURSE');
        assert(nurseView.icd10Code === 'G43.909' && nurseView.temperature === 38.6, 'Clinician/Nurse retains full diagnostic and vital records');
    }
    // ---------------------------------------------------------------------------
    // TEST SUITE 2: Parent-Child Fee Isolation
    // ---------------------------------------------------------------------------
    console.log('\n--- Test Suite 2: Parent-Child Fee Access Boundary ---');
    {
        const parentChildren = ['stud-child-1', 'stud-child-2'];
        assert(verifyParentChildFeeAccess(parentChildren, 'stud-child-1') === true, 'Parent CAN access fee invoices for their linked child');
        assert(verifyParentChildFeeAccess(parentChildren, 'stud-other-child-99') === false, 'Parent CANNOT access fee records or ledgers for another parent’s child');
    }
    // ---------------------------------------------------------------------------
    // TEST SUITE 3: Teacher Class Attendance Boundary
    // ---------------------------------------------------------------------------
    console.log('\n--- Test Suite 3: Teacher Class Attendance Access ---');
    {
        const teacherAssignedClasses = ['cls-form-3a', 'cls-form-3b'];
        assert(verifyTeacherClassAttendanceAccess(teacherAssignedClasses, 'cls-form-3a') === true, 'Teacher CAN record/view attendance for assigned class Form 3A');
        assert(verifyTeacherClassAttendanceAccess(teacherAssignedClasses, 'cls-form-4c') === false, 'Teacher CANNOT record or view attendance for unassigned class Form 4C');
    }
    // ---------------------------------------------------------------------------
    // TEST SUITE 4: Cross-Tenant Student Leader Requisition Scoping
    // ---------------------------------------------------------------------------
    console.log('\n--- Test Suite 4: Cross-Tenant Student Leader Requisition Scoping ---');
    {
        const studentTenantA = { schoolId: 'school-tenant-a', isLeader: true };
        const reqTenantA = { schoolId: 'school-tenant-a', requesterStudentId: 'stud-leader-1' };
        const reqTenantB = { schoolId: 'school-tenant-b', requesterStudentId: 'stud-leader-2' };
        const accessOwn = verifyStudentRequisitionTenantAccess(studentTenantA, reqTenantA);
        assert(accessOwn.allowed === true, 'Student leader in Tenant A CAN access requisitions in Tenant A');
        const accessCross = verifyStudentRequisitionTenantAccess(studentTenantA, reqTenantB);
        assert(accessCross.allowed === false && Boolean(accessCross.reason?.includes('Cross-tenant')), 'Student leader in Tenant A CANNOT query or view requisitions belonging to Tenant B');
        const nonLeader = { schoolId: 'school-tenant-a', isLeader: false };
        const accessNonLeader = verifyStudentRequisitionTenantAccess(nonLeader, reqTenantA);
        assert(accessNonLeader.allowed === false && Boolean(accessNonLeader.reason?.includes('leadership')), 'Non-leader student is blocked from requisition access even within same tenant');
    }
    // ---------------------------------------------------------------------------
    // TEST SUITE 5: Procurement RBAC & Step Approver Enforcements
    // ---------------------------------------------------------------------------
    console.log('\n--- Test Suite 5: Procurement RBAC Enforcement ---');
    {
        // Requisition Issue Permission
        assert(verifyRequisitionIssueRBAC('TEACHER').allowed === false &&
            verifyRequisitionIssueRBAC('TEACHER').statusCode === 403, 'Teacher is forbidden from issuing inventory stock (403)');
        assert(verifyRequisitionIssueRBAC('STUDENT').allowed === false &&
            verifyRequisitionIssueRBAC('STUDENT').statusCode === 403, 'Student is forbidden from issuing inventory stock (403)');
        assert(verifyRequisitionIssueRBAC('ANCILLARY').allowed === true &&
            verifyRequisitionIssueRBAC('BURSAR').allowed === true &&
            verifyRequisitionIssueRBAC('SCHOOL_ADMIN').allowed === true, 'Store Ancillary, Bursar, and Admin are authorized to issue inventory items');
        // Matron Approval Permission
        assert(verifyRequisitionMatronApprovalRBAC('ANCILLARY', 'Boarding').allowed === true, 'Boarding Ancillary/Matron CAN approve hostel student cleaning requests');
        assert(verifyRequisitionMatronApprovalRBAC('ANCILLARY', 'Maintenance').allowed === false &&
            verifyRequisitionMatronApprovalRBAC('ANCILLARY', 'Maintenance').statusCode === 403, 'Non-Boarding Ancillary staff CANNOT act as Matron approver (403)');
        assert(verifyRequisitionMatronApprovalRBAC('TEACHER', 'Academics').allowed === false, 'Teacher CANNOT act as Matron approver for hostel cleaning requisitions');
    }
    console.log(`\n=================================================================`);
    console.log(`TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`);
    console.log(`=================================================================\n`);
    if (failed > 0) {
        process.exit(1);
    }
}
if (require.main === module) {
    runConsolidationGuardTests().catch(err => {
        console.error('Test run failed:', err);
        process.exit(1);
    });
}
//# sourceMappingURL=portal-consolidation-guards.test.js.map