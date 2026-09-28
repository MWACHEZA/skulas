declare const router: import("express-serve-static-core").Router;
/**
 * Plain-language reason mapper: maps clinical ICD10 codes and medical terminology to parent-friendly terms
 */
export declare function mapToPlainReason(rawReason?: string | null): string;
/**
 * Plain-language treatment mapper: removes clinical Latin dosage codes (PRN, PO, etc.)
 */
export declare function mapToPlainTreatment(rawTreatment?: string | null): string;
export declare const VISIT_STAGES: readonly ["CHECK_IN", "TRIAGE", "CONSULTATION", "PRESCRIBED", "DISPENSED", "BILLED", "DISCHARGED"];
export default router;
