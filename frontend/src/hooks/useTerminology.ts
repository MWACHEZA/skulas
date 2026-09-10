import { useAuth } from '../contexts/AuthContext';

type DomainLabels = {
  student: string;
  students: string;
  teacher: string;
  teachers: string;
  class: string;
  classes: string;
  subject: string;
  subjects: string;
  assignment: string;
  assignments: string;
  attendance: string;
  timetable: string;
  grades: string;
  exam: string;
  library: string;
  resources: string;
  parent: string;
  parents: string;
  applicant: string;
  applicants: string;
  report: string;
  reports: string;
  staff: string;
  admission: string;
  admissions: string;
  term: string;
  governance: string;
  governanceShort: string;
  house: string;
  houses: string;
  club: string;
  clubs: string;
  // Extended keys
  department: string;       // "Department" vs "Faculty"
  departments: string;
  prefects: string;         // "Prefects" vs "Student Representative Council"
  prefectsShort: string;   // "Prefects" vs "SRC"
  grade: string;            // "Grade" vs "Level" vs "Form"
  grades_label: string;     // "Grades" vs "Levels"
  migration: string;        // "Migrate Class" vs "Migrate Cohort"
  syllabus: string;         // "Syllabus" vs "Course Outline"
  headTitle: string;        // "Principal" vs "Dean / Head of Department"
};

const K12_LABELS: DomainLabels = {
  student: 'Student',
  students: 'Students',
  teacher: 'Teacher',
  teachers: 'Teachers',
  class: 'Class',
  classes: 'Classes',
  subject: 'Subject',
  subjects: 'Subjects',
  assignment: 'Assignment',
  assignments: 'Assignments',
  attendance: 'Attendance',
  timetable: 'Timetable',
  grades: 'Grades',
  exam: 'Exam',
  library: 'Library',
  resources: 'Educational Resources',
  parent: 'Parent/Guardian',
  parents: 'Parents/Guardians',
  applicant: 'Applicant',
  applicants: 'Applicants',
  report: 'Academic Report',
  reports: 'Academic Reports',
  staff: 'Staff',
  admission: 'Admission',
  admissions: 'Admissions',
  term: 'Term',
  governance: 'School Development Committee (SDC)',
  governanceShort: 'SDC',
  house: 'House',
  houses: 'Houses',
  club: 'Club',
  clubs: 'Clubs',
  department: 'Department',
  departments: 'Departments',
  prefects: 'Prefects',
  prefectsShort: 'Prefects',
  grade: 'Grade',
  grades_label: 'Grades',
  migration: 'Migrate Class',
  syllabus: 'Syllabus',
  headTitle: 'Principal',
};

const NURSING_LABELS: DomainLabels = {
  student: 'Student Nurse',
  students: 'Student Nurses',
  teacher: 'Instructor',
  teachers: 'Faculty instructors',
  class: 'Clinical Group',
  classes: 'Clinical Groups',
  subject: 'Module',
  subjects: 'Modules',
  assignment: 'Practical Task',
  assignments: 'Practicals',
  attendance: 'Ward Registry',
  timetable: 'Rotation Schedule',
  grades: 'Competencies',
  exam: 'Final Assessment',
  library: 'Resource Hub',
  resources: 'Medical Literature & Research',
  parent: 'Next of Kin / Sponsor',
  parents: 'Next of Kin / Sponsors',
  applicant: 'Prospective Student Nurse',
  applicants: 'Prospective Student Nurses',
  report: 'Validation Report',
  reports: 'Validation Reports',
  staff: 'Clinical Faculty',
  admission: 'Clinical Enrollment',
  admissions: 'Clinical Enrollments',
  term: 'Semester / Block',
  governance: 'Clinical Advisory Board',
  governanceShort: 'Board',
  house: 'Dormitory / Ward Group',
  houses: 'Dormitories / Ward Groups',
  club: 'Nursing Society',
  clubs: 'Nursing Societies',
  department: 'Faculty / Division',
  departments: 'Faculties / Divisions',
  prefects: 'Student Representative Council (SRC)',
  prefectsShort: 'SRC',
  grade: 'Level',
  grades_label: 'Levels',
  migration: 'Migrate Cohort',
  syllabus: 'Course Outline',
  headTitle: 'Principal / Director',
};

const POLYTECHNIC_LABELS: DomainLabels = {
  student: 'Student',
  students: 'Students',
  teacher: 'Lecturer',
  teachers: 'Lecturers',
  class: 'Intake / Department',
  classes: 'Intakes / Departments',
  subject: 'Module / Course',
  subjects: 'Modules / Courses',
  assignment: 'Assignment / Project',
  assignments: 'Assignments / Projects',
  attendance: 'Lecture Attendance',
  timetable: 'Lecture Timetable',
  grades: 'Competencies / Results',
  exam: 'HEXCO / Sessional Exam',
  library: 'Resource Center',
  resources: 'Academic Materials',
  parent: 'Sponsor / Guardian',
  parents: 'Sponsors / Guardians',
  applicant: 'Applicant',
  applicants: 'Applicants',
  report: 'Assessment Transcript',
  reports: 'Assessment Transcripts',
  staff: 'College Staff',
  admission: 'Enrollment',
  admissions: 'Enrollments',
  term: 'Semester',
  governance: 'College Advisory Council',
  governanceShort: 'Council',
  house: 'Hostel / House',
  houses: 'Hostels / Houses',
  club: 'Student Club / Union',
  clubs: 'Student Clubs / Unions',
  department: 'Faculty',
  departments: 'Faculties',
  prefects: 'Student Representative Council (SRC)',
  prefectsShort: 'SRC',
  grade: 'Level',
  grades_label: 'Levels',
  migration: 'Migrate Cohort',
  syllabus: 'Course Outline',
  headTitle: 'Principal / Rector',
};

const SEMINARY_LABELS: DomainLabels = {
  student: 'Seminarian',
  students: 'Seminarians',
  teacher: 'Formator',
  teachers: 'Formators / Faculty',
  class: 'Cohort / Formation Year',
  classes: 'Cohorts / Formation Years',
  subject: 'Theology / Scriptural Module',
  subjects: 'Theology / Scriptural Modules',
  assignment: 'Reflective Paper / Task',
  assignments: 'Reflections / Tasks',
  attendance: 'Liturgy & Class Presence',
  timetable: 'Formation Schedule',
  grades: 'Assessments / Growth',
  exam: 'Comprehensive / Final Exam',
  library: 'Theological Library',
  resources: 'Sacred Texts & Liturgy',
  parent: 'Diocese / Religious Order',
  parents: 'Dioceses / Religious Orders',
  applicant: 'Candidate',
  applicants: 'Candidates',
  report: 'Formation Assessment',
  reports: 'Formation Assessments',
  staff: 'Seminary Staff',
  admission: 'Candidacy Enrollment',
  admissions: 'Candidacy Enrollments',
  term: 'Session / Semester',
  governance: 'Board of Formators',
  governanceShort: 'Board',
  house: 'Formation House',
  houses: 'Formation Houses',
  club: 'Confraternity / Sodality',
  clubs: 'Confraternities / Sodalities',
  department: 'Faculty / Division',
  departments: 'Faculties / Divisions',
  prefects: 'Student Representative Council (SRC)',
  prefectsShort: 'SRC',
  grade: 'Year / Level',
  grades_label: 'Years / Levels',
  migration: 'Migrate Cohort',
  syllabus: 'Course Outline',
  headTitle: 'Rector',
};

const UNIVERSITY_LABELS: DomainLabels = {
  student: 'Student',
  students: 'Students',
  teacher: 'Professor / Lecturer',
  teachers: 'Faculty Members',
  class: 'Department / Faculty',
  classes: 'Departments / Faculties',
  subject: 'Course Code',
  subjects: 'Courses',
  assignment: 'Coursework / Project',
  assignments: 'Assignments / Projects',
  attendance: 'Lecture Attendance',
  timetable: 'Lecture Schedule',
  grades: 'Academic Results / GPA',
  exam: 'Sessional / Degree Exam',
  library: 'University Library',
  resources: 'Case Studies & Research',
  parent: 'Sponsor / Next of Kin',
  parents: 'Sponsors / Next of Kin',
  applicant: 'Prospect / Applicant',
  applicants: 'Prospects / Applicants',
  report: 'Academic Transcript',
  reports: 'Academic Transcripts',
  staff: 'University Staff',
  admission: 'Enrollment',
  admissions: 'Enrollments',
  term: 'Semester / Session',
  governance: 'University Council',
  governanceShort: 'Council',
  house: 'Hall of Residence',
  houses: 'Halls of Residence',
  club: 'Student Society',
  clubs: 'Student Societies',
  department: 'Faculty',
  departments: 'Faculties',
  prefects: 'Student Representative Council (SRC)',
  prefectsShort: 'SRC',
  grade: 'Level / Year',
  grades_label: 'Levels',
  migration: 'Migrate Cohort',
  syllabus: 'Course Outline',
  headTitle: 'Dean / Vice Chancellor',
};

export function useTerminology() {
  const { user } = useAuth();
  
  // Normalize type
  const type = (user?.schoolType || 'Secondary').toLowerCase();
  
  const isMedical = type.includes('nursing') || type.includes('medical') || type.includes('college');
  const isPoly = type.includes('poly') || type.includes('technical') || type.includes('vocational');
  const isUniversity = type.includes('university') || type.includes('varsity') || type.includes('tertiary');
  const isSeminary = type.includes('seminary') || type.includes('theological');
  const isK12 = !isMedical && !isPoly && !isUniversity && !isSeminary;
  const isTertiary = !isK12;
  
  const labels = isUniversity ? UNIVERSITY_LABELS : (isPoly ? POLYTECHNIC_LABELS : (isMedical ? NURSING_LABELS : (isSeminary ? SEMINARY_LABELS : K12_LABELS)));

  /**
   * Translates an internal key to a domain-specific label
   */
  const t = (key: keyof DomainLabels) => {
    return labels[key] || key;
  };

  return { t, labels, isMedical, isPoly, isUniversity, isSeminary, isK12, isTertiary };
}
