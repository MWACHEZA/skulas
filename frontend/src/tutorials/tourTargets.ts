/**
 * Type-safe target identifiers for interactive onboarding tutorials.
 * Naming convention: <module>-<action>-<element>
 */
export const TOUR_TARGETS = {
  // Teacher targets
  TEACHER_CLASSES_LINK: 'teacher-classes-link',
  ATTENDANCE_TAKE_BTN: 'attendance-take-btn',
  MARKS_ADD_BTN: 'marks-add-btn',

  // Bursar targets
  BURSAR_FEES_LINK: 'bursar-fees-link',
  BURSAR_RECEIPT_NEW_BTN: 'fees-receipt-new-btn',
  REPORTS_COLLECTION_LINK: 'reports-collection-link',

  // Student targets
  STUDENT_TIMETABLE_LINK: 'student-timetable-link',
  STUDENT_ASSIGNMENTS_LINK: 'student-assignments-link',
  STUDENT_GRADES_LINK: 'student-grades-link',

  // Parent targets
  PARENT_STUDENTS_CARD: 'parent-students-card',
  PARENT_FEES_LINK: 'parent-fees-link',
  PARENT_REPORTS_LINK: 'parent-reports-link',

  // HOD targets
  HOD_CURRICULUM_LINK: 'hod-curriculum-link',
  HOD_OBSERVATION_BTN: 'hod-observation-btn',
  HOD_MARKS_APPROVE_BTN: 'hod-marks-approve-btn',

  // Clerk / Ancillary / Reception targets
  CLERK_RECEPTION_LINK: 'clerk-reception-link',
  CLERK_ADMISSIONS_BTN: 'clerk-admissions-btn',
  CLERK_DOCUMENTS_LINK: 'clerk-documents-link'
} as const;

export type TourTargetId = typeof TOUR_TARGETS[keyof typeof TOUR_TARGETS];
