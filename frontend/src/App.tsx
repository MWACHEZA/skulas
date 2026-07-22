// WebsiteSettings subcomponents and layout imports removed as they are unified in SettingsPage
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import ProtectedRoute from './components/auth/ProtectedRoute';
import { ToastProvider } from './context/ToastContext';
import Layout from './components/layout/Layout';

// Public pages
import Home from './pages/Home';
import Departments from './pages/Departments';
import Apply from './pages/Apply';
import CheckStatus from './pages/CheckStatus';
import Gallery from './pages/Gallery';
import News from './pages/News';
import Sports from './pages/Sports';
import Clubs from './pages/Clubs';
import Contact from './pages/Contact';
import AcadexLanding from './pages/AcadexLanding';
import ComingSoon from './pages/ComingSoon';
import About from './pages/About';
import Careers from './pages/Careers'; // public careers/vacancies portal
import Noticeboard from './pages/Noticeboard'; // public school noticeboard


// Portal layouts
import StudentLayout from './portals/student/StudentLayout';
import TeacherLayout from './portals/teacher/TeacherLayout';
import AdminLayout from './portals/admin/AdminLayout';
import BursarLayout from './portals/bursar/BursarLayout';
import LibraryLayout from './portals/library/LibraryLayout';
import AlumniLayout from './portals/alumni/AlumniLayout';
import AncillaryLayout from './portals/ancillary/AncillaryLayout';
import SportsManagement from './portals/shared/pages/SportsManagement';
import HouseDashboard from './portals/shared/pages/HouseDashboard';
import ChaplaincyDashboard from './portals/shared/pages/ChaplaincyDashboard';
import FarmManagement from './portals/shared/pages/FarmManagement';
import DHRepresentative from './portals/student/pages/DHRepresentative';
import PrefectCouncil from './portals/student/pages/PrefectCouncil';
import ClassMonitorDashboard from './portals/student/pages/ClassMonitorDashboard';
import ParentLayout from './portals/parent/ParentLayout';
import SupplierLayout from './portals/supplier/SupplierLayout';
import AcadexLayout from './portals/acadex/AcadexLayout';

// CBT Pages
import ManageCBT from './portals/shared/pages/cbt/ManageCBT';
import ManageQuestions from './portals/shared/pages/cbt/ManageQuestions';
import TakeExam from './portals/shared/pages/cbt/TakeExam';

// Portal login
import PortalLoginPage from './components/portals/PortalLoginPage';
import StudentLogin from './portals/student/pages/Login';

//  Student pages 
import StudentDashboard from './portals/student/pages/Dashboard';
import StudentGrades from './portals/student/pages/Grades';
import StudentTimetable from './portals/student/pages/Timetable';
import StudentAttendance from './portals/student/pages/Attendance';
import StudentFees from './portals/student/pages/Fees';
import StudentAssignments from './portals/student/pages/Assignments';
import StudentMyBooks from './portals/student/pages/MyBooks';
import Library from './portals/shared/pages/Library';
import StudentEvents from './portals/student/pages/Events';
import ResearchDashboard from './portals/student/pages/ResearchDashboard';
import CBTExams from './portals/student/pages/CBTExams';
import CBTResults from './portals/shared/pages/cbt/CBTResults';

//  Clinic Portal pages 
import ClinicLayout from './portals/clinic/ClinicLayout';
import ClinicDashboard from './portals/clinic/pages/Dashboard';
import PatientManagement from './portals/clinic/pages/PatientManagement';

import HealthComplaints from './portals/shared/pages/clinic/HealthComplaints';
import Appointments from './portals/shared/pages/clinic/Appointments';
import TriageDashboard from './portals/shared/pages/clinic/TriageDashboard';
import PatientHistory from './portals/shared/pages/clinic/PatientHistory';
import Emergencies from './portals/shared/pages/clinic/Emergencies';
import Referrals from './portals/shared/pages/clinic/Referrals';
import Immunization from './portals/shared/pages/clinic/Immunization';

//  Teacher pages 
import TeacherDashboard from './portals/teacher/pages/Dashboard';
import TeacherClasses from './portals/teacher/pages/Classes';
import TeacherGrades from './portals/teacher/pages/Grades';
import TeacherAssignments from './portals/teacher/pages/Assignments';
import TeacherAttendance from './portals/teacher/pages/Attendance';
import TeacherTimetable from './portals/teacher/pages/Timetable';
import TeacherStudents from './portals/teacher/pages/Students';
import TeacherReports from './portals/teacher/pages/Reports';
import TeacherSubmissions from './portals/teacher/pages/AssignmentSubmissions';
import TeacherResources from './portals/teacher/pages/DigitalResources';
import TeacherTextbooks from './portals/teacher/pages/Textbooks';
import TeacherClassAttendance from './portals/teacher/pages/ClassAttendance';
import CreateSyllabus from './portals/shared/pages/academics/CreateSyllabus';
import TeacherLessonPlan from './portals/shared/pages/academics/TeacherLessonPlan';
import TeacherSyllabusManager from './portals/teacher/pages/SyllabusManager';
import TeacherAssets from './portals/teacher/pages/Assets';
import TeacherClassDetails from './portals/teacher/pages/ClassDetails';
import SupervisorDashboard from './portals/teacher/pages/SupervisorDashboardPage';
import DailyStudentAttendance from './portals/shared/pages/attendance/DailyStudentAttendance';
import QRAttendance from './portals/shared/pages/attendance/QRAttendance';
import DailyStudentAttendanceReport from './portals/shared/pages/attendance/DailyStudentAttendanceReport';
import DailyStaffAttendance from './portals/shared/pages/attendance/DailyStaffAttendance';
import ZoomLiveClass from './portals/shared/pages/live-classes/ZoomLiveClass';
import JitsiLiveClass from './portals/shared/pages/live-classes/JitsiLiveClass';
import MyLeave from './portals/shared/pages/hr/MyLeave';
import MyAwards from './portals/shared/pages/hr/MyAwards';
import CoursesDashboard from './portals/teacher/pages/online-learning/CoursesDashboard';
import AddNewCourse from './portals/teacher/pages/online-learning/AddNewCourse';
import EnrolStudent from './portals/teacher/pages/online-learning/EnrolStudent';
import StudyMaterial from './portals/shared/pages/academics/StudyMaterial';
import StudentStudyMaterial from './portals/student/pages/academics/StudentStudyMaterial';
import RevenueReport from './portals/teacher/pages/online-learning/RevenueReport';
import MyPaymentSlip from './portals/shared/pages/hr/MyPaymentSlip';
import AdminDashboard from './portals/admin/pages/Dashboard';

import ManageVacancies from './portals/shared/pages/human-resources/ManageVacancies';
import JobApplications from './portals/shared/pages/human-resources/JobApplications';
import CreatePayslip from './portals/shared/pages/human-resources/CreatePayslip';
import PayrollList from './portals/shared/pages/human-resources/PayrollList';
import ListLeaves from './portals/shared/pages/human-resources/ListLeaves';
import ManageAwards from './portals/shared/pages/human-resources/ManageAwards';
import AdminStudents from './portals/admin/pages/Students';
import AdminTeachers from './portals/admin/pages/Teachers';
import AdminApplications from './portals/admin/pages/Applications';
import AdminReports from './portals/admin/pages/Reports';
import AdminProcurement from './portals/admin/pages/Procurement';
import AdminAlumni from './portals/admin/pages/AlumniManagement';
import AdminAncillary from './portals/admin/pages/AncillaryManagement';
import AdminBursars from './portals/admin/pages/BursarManagement';
import AdminLibrarians from './portals/admin/pages/LibrarianManagement';
import AdminSuppliers from './portals/admin/pages/SupplierManagement';
import AdminStudentHouse from './portals/admin/pages/StudentHouse';
import ClockInLogsPage from './portals/shared/pages/ClockInLogsPage';
import AdminClasses from './portals/admin/pages/Classes';
import AdminUsers from './portals/admin/pages/Users';
import AdminSubjects from './portals/admin/pages/Subjects';
import AdminDepartments from './portals/admin/pages/Departments';
import AdminTimetable from './portals/admin/pages/Timetable';
import AdminFees from './portals/admin/pages/Fees';
import AdminAssetManagement from './portals/admin/pages/AssetManagement';
import LeaveManagement from './portals/shared/pages/hr/MyLeave';
import HostelCategory from './portals/ancillary/pages/boarding/HostelCategory';
import HostelRoom from './portals/ancillary/pages/boarding/HostelRoom';
import ManageHostel from './portals/ancillary/pages/boarding/ManageHostel';
import AssignStudents from './portals/ancillary/pages/boarding/AssignStudents';
import GiveStudentAward from './portals/ancillary/pages/GiveStudentAward';
import AdminManagement from './portals/admin/pages/AdminManagement';
import AdminParents from './portals/admin/pages/ParentManagement';
import AdminDocumentTemplates from './portals/admin/pages/DocumentTemplates';
import AdminAnnouncementsManagement from './portals/admin/pages/AnnouncementsManagement';
import AdminTeacherLoad from './portals/admin/pages/TeacherLoad';
import AdminSubscription from './portals/admin/pages/Subscription';
import StudentProfile from './portals/admin/pages/StudentProfile';
import AdminAcademicHistory from './portals/admin/pages/AcademicHistory';
import AdminSDCMinutes from './portals/admin/pages/SDCMinutes';
import AdminSDCFunding from './portals/admin/pages/SDCFunding';
import AdminAssetMaintenance from './portals/admin/pages/AssetMaintenance';
import AdminHelpdesk from './portals/admin/pages/Helpdesk';
import AdminClassMigration from './portals/admin/pages/ClassMigration';
import AdminStudentClub from './portals/admin/pages/StudentClub';
import ManagePaymentPlans from './portals/shared/pages/human-resources/ManagePaymentPlans';

import TransportRoute from './portals/admin/pages/TransportRoute';
import ManageVehicle from './portals/admin/pages/ManageVehicle';
import SchoolTransportation from './portals/admin/pages/SchoolTransportation';

//  Bursar pages 
import BursarDashboard from './portals/bursar/pages/Dashboard';
import BursarFinancialReconciliation from './portals/bursar/pages/FinancialReconciliation';
import BursarPayrollRun from './portals/bursar/pages/PayrollRun';
import BursarTuckshop from './portals/bursar/pages/Tuckshop';
import BursarTuckshopInventory from './portals/bursar/pages/TuckshopInventory';
import BursarTuckshopSales from './portals/bursar/pages/TuckshopSales';
import BursarTuckshopReports from './portals/bursar/pages/TuckshopReports';
import BursarSDC from './portals/bursar/pages/SDCPortal';
import BursarSDCMinutes from './portals/bursar/pages/SDCMinutes';
import BursarSDCFunding from './portals/bursar/pages/SDCFunding';
import BursarProcurement from './portals/bursar/pages/Procurement';

//  Library pages 
import LibraryDashboard from './portals/library/pages/Dashboard';
import LibraryBooks from './portals/library/pages/Books';
import LibraryLoans from './portals/library/pages/Loans';
import LibraryOverdue from './portals/library/pages/Overdue';
import LibraryReports from './portals/library/pages/Reports';
import LibraryDigitalRepository from './portals/library/pages/DigitalRepository';
import LibraryResourceCategories from './portals/library/pages/ResourceCategories';
import LibraryRequests from './portals/library/pages/Requests';

//  Alumni pages 
import AlumniDashboard from './portals/alumni/pages/Dashboard';
import AlumniEvents from './portals/alumni/pages/Events';
import AlumniNetwork from './portals/alumni/pages/NetworkDirectory';
import AlumniUpdates from './portals/alumni/pages/Updates';
import AlumniFees from './portals/alumni/pages/Fees';

//  Ancillary pages 
import AncillaryDashboard from './portals/ancillary/pages/Dashboard';
import AncillaryAssets from './portals/ancillary/pages/Assets';
import AncillaryProcurement from './portals/ancillary/pages/Procurement';
import AncillaryDirectory from './portals/ancillary/pages/Directory';
import AncillarySchedules from './portals/ancillary/pages/AncillarySchedules';
import AncillaryHRServices from './portals/ancillary/pages/HRServices';
import BoardingManagement from './portals/ancillary/pages/BoardingManagement';
import SecurityLog from './portals/ancillary/pages/SecurityLog';
import KitchenManagement from './portals/ancillary/pages/KitchenManagement';
import AdmissionInquiryPage from './portals/ancillary/pages/office/AdmissionInquiryPage';
import VisitorBookPage from './portals/ancillary/pages/office/VisitorBookPage';
import PhoneCallLogPage from './portals/ancillary/pages/office/PhoneCallLogPage';
import ComplaintsPage from './portals/ancillary/pages/office/ComplaintsPage';

//  Parent pages 
import ParentDashboard from './portals/parent/pages/Dashboard';
import ParentPaymentPlans from './portals/parent/pages/PaymentPlans';
import ParentFees from './portals/parent/pages/Fees';
import ParentAcademics from './portals/parent/pages/AcademicsDetail';
import ParentTransport from './portals/parent/pages/Transport';
import ParentNotices from './portals/parent/pages/Notices';
import ParentHistory from './portals/parent/pages/History';
import ParentWellbeing from './portals/parent/pages/Wellbeing';
import ParentWallet from './portals/parent/pages/Wallet';
import ParentCalendar from './portals/parent/pages/Calendar';
import ParentApprovals from './portals/parent/pages/Approvals';
import TeacherProcurement from './portals/teacher/pages/Procurement';
import AcademicPortfolio from './portals/shared/pages/AcademicPortfolio';
import ProgressReports from './portals/shared/pages/ProgressReports';
import AttendanceHistory from './portals/shared/pages/AttendanceHistory';

//  Applicant pages 
import ApplicantLayout from './portals/applicant/ApplicantLayout';
import ApplicantDashboard from './portals/applicant/pages/Dashboard';
import ApplicantDocuments from './portals/applicant/pages/Documents';
import ApplicantTimeline from './portals/applicant/pages/Timeline';
import ApplicantInterview from './portals/applicant/pages/Interview';
import ApplicantFees from './portals/applicant/pages/Fees';

//  Supplier pages 
import SupplierDashboard from './portals/supplier/pages/Dashboard';
import SupplierOrders from './portals/supplier/pages/Orders';
import SupplierInvoices from './portals/supplier/pages/Invoices';
import SupplierTenders from './portals/supplier/pages/TenderBidding';
import SupplierQuotations from './portals/supplier/pages/Quotations';
import SupplierCompliance from './portals/supplier/pages/Compliance';
import SupplierPolicies from './portals/supplier/pages/Policies';
import SupplierContracts from './portals/supplier/pages/AwardedContracts';

//  Acadex (Platform) pages 
import AcadexDashboard from './portals/acadex/pages/Dashboard';
import AcadexSchools from './portals/acadex/pages/SchoolRegistry';
import AcadexProvisioning from './portals/acadex/pages/Onboarding';
import AcadexPlans from './portals/acadex/pages/Subscriptions';
import AcadexSchoolDetails from './portals/acadex/pages/SchoolDetails';
import PlatformLogs from './portals/acadex/pages/PlatformLogs';


//  Shared pages 
import MessagesPage from './portals/shared/pages/MessagesPage';
import ProfilePage from './portals/shared/pages/ProfilePage';
import SettingsPage from './portals/shared/pages/SettingsPage';
import ITSupportPage from './portals/shared/pages/ITSupportPage';
import PaymentMethodsPage from './portals/shared/pages/PaymentMethodsPage';
import RevenueAllocationPage from './portals/shared/pages/RevenueAllocationPage';
import FeeGroupsPage from './portals/shared/pages/FeeGroupsPage';
import FeesBillingPage from './portals/shared/pages/FeesBillingPage';
import ManageInvoicesPage from './portals/shared/pages/ManageInvoicesPage';
import PaymentHistoryPage from './portals/shared/pages/PaymentHistoryPage';
import StudentLedgersPage from './portals/shared/pages/StudentLedgersPage';
import GroceriesPage from './portals/shared/pages/GroceriesPage';
import BulkInvoicesPage from './portals/shared/pages/BulkInvoicesPage';
import FeeReminderLogsPage from './portals/shared/pages/FeeReminderLogsPage';
import PayrollSettingsPage from './portals/shared/pages/PayrollSettingsPage';
import EmployeeManagementPage from './portals/shared/pages/EmployeeManagementPage';
import LiabilitiesPage from './portals/shared/pages/LiabilitiesPage';
import IncomePage from './portals/shared/pages/IncomePage';
import ExpensesPage from './portals/shared/pages/ExpensesPage';
import UniformsPage from './portals/shared/pages/UniformsPage';
import MarksEntryPage from './portals/shared/pages/MarksEntryPage';
import PrincipalCommentsPage from './portals/shared/pages/PrincipalCommentsPage';
import ReportsDashboardPage from './portals/shared/pages/ReportsDashboardPage';
import ReportViewerPage from './portals/shared/pages/ReportViewerPage';
import QuestionPapersPage from './portals/shared/pages/QuestionPapersPage';
import QuestionPaperBuilder from './portals/shared/pages/QuestionPaperBuilder';
import GradingSettingsPage from './portals/shared/pages/GradingSettingsPage';
import AdmissionLetterPage from './portals/shared/pages/AdmissionLetterPage';

import StudentRegister from './pages/register/StudentRegister';
import TeacherRegister from './pages/register/TeacherRegister';
import AdminRegister from './pages/register/AdminRegister';
import ParentRegister from './pages/register/ParentRegister';
import ApplicantRegister from './pages/register/ApplicantRegister';
import AlumniRegister from './pages/register/AlumniRegister';
import TrackApplication from './pages/register/TrackApplication';
import { SupplierRegister, StaffRegister } from './pages/register/StaffRegister';
import SchoolRegister from './pages/register/SchoolRegister';

// Clinic Staff Registration
const ClinicRegister = () => <StaffRegister role="CLINIC" label="Clinic Staff" icon="fa-user-md" />;

const Placeholder = ({ title }: { title: string }) => (
  <div className="container" style={{ padding: '80px 0' }}><h2>{title} coming soon.</h2></div>
);

/**
 * SchoolCodeRedirect: Catches /:schoolCode URLs and redirects to /school/:schoolCode
 * Only fires for paths that don't match known portal/system prefixes.
 * This lets users access school public sites via localhost/AX-SEMINARY
 */
const RESERVED_PATHS = new Set([
  'student', 'teacher', 'admin', 'bursar', 'library', 'librarian',
  'alumni', 'ancillary', 'parent', 'supplier', 'clinic', 'acadex',
  'register', 'login', 'school', 'api', 'apply', 'check-status'
]);

function SchoolCodeRedirect() {
  const pathname = window.location.pathname;
  const parts = pathname.split('/').filter(Boolean);
  const code = parts[0] || '';
  // If it's a reserved system path, don't redirect — let the router handle it
  if (RESERVED_PATHS.has(code.toLowerCase())) {
    return <Navigate to="/" replace />;
  }
  const rest = parts.slice(1).join('/');
  const target = `/school/${code.toUpperCase()}${rest ? `/${rest}` : ''}`;
  return <Navigate to={target} replace />;
}

import { useAuth } from './contexts/AuthContext';
import { useState, useEffect } from 'react';
import i18n from './i18n';
import api from './lib/api';

function SiteConfigHandler() {
  const { user } = useAuth();
  const [favicon, setFavicon] = useState<string | null>(null);
  const [schoolCode, setSchoolCode] = useState<string | null>(null);

  useEffect(() => {
    const fetchFaviconAndCode = async () => {
      // 1. Logged-in Portal User
      if (user?.schoolId) {
        if (user.schoolCode) {
          setSchoolCode(user.schoolCode);
        }
        try {
          const res = await api.get('/api/schools/settings');
          if (res.data?.favicon) setFavicon(res.data.favicon);

          // Apply language: Personal Prefs -> School Settings
          const localPrefs = localStorage.getItem('personal_prefs');
          let prefLang = null;
          if (localPrefs) {
            prefLang = JSON.parse(localPrefs).preferredLanguage;
          }
          const langToSet = prefLang || res.data?.language;
          if (langToSet) i18n.changeLanguage(langToSet);

        } catch (err) {
          console.error('Favicon fetch error', err);
        }
      } else {
        // 2. Public Website Visitor
        const match = window.location.pathname.match(/\/school\/([^\/]+)/i);
        if (match && match[1]) {
          const sCode = match[1].toUpperCase();
          setSchoolCode(sCode);
          try {
            const res = await api.get(`/api/schools/${sCode}`);
            if (res.data?.schoolSetting?.favicon) {
              setFavicon(res.data.schoolSetting.favicon);
            }
            if (res.data?.schoolSetting?.language) {
              i18n.changeLanguage(res.data.schoolSetting.language);
            }
          } catch (err) {
            console.error('Public favicon fetch error', err);
          }
        }
      }
    };
    fetchFaviconAndCode();
  }, [user, window.location.pathname]);

  useEffect(() => {
    if (favicon && schoolCode) {
      const link: any = document.querySelector("link[rel*='icon']") || document.createElement('link');
      link.type = 'image/x-icon';
      link.rel = 'shortcut icon';
      // Strip schoolCode prefix from favicon path if present (media route handles it dynamically)
      const cleanedFavicon = favicon.replace(new RegExp(`^${schoolCode}/`), '');
      link.href = `${api.defaults.baseURL}/api/storage/media/${schoolCode}/${cleanedFavicon}`;
      document.getElementsByTagName('head')[0].appendChild(link);
    }
  }, [favicon, schoolCode]);

  return null;
}

export default function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <SiteConfigHandler />
        <BrowserRouter>
          <Routes>
            {/*  Acadex Platform Landing (Solo)  */}
            <Route path="/" element={<AcadexLanding />} />

            {/*
              Short school URL: localhost/AX-SEMINARY  → /school/AX-SEMINARY
              Also catches sub-paths: localhost/AX-SEMINARY/gallery → /school/AX-SEMINARY/gallery
            */}
            <Route path="/:schoolCode" element={<SchoolCodeRedirect />} />
            <Route path="/:schoolCode/*" element={<SchoolCodeRedirect />} />

            {/*  School Public Website (Wrapped in Layout)  */}
            <Route path="/school/:schoolCode" element={<Layout />}>
              <Route index element={<Home />} />
              <Route path="departments" element={<Departments />} />
              <Route path="library" element={<div>Library</div>} />
              <Route path="gallery" element={<Gallery />} />
              <Route path="news" element={<News />} />
              <Route path="sports" element={<Sports />} />
              <Route path="clubs" element={<Clubs />} />
              <Route path="contact" element={<Contact />} />
              <Route path="about" element={<About />} />
              <Route path="apply" element={<Apply />} />
              <Route path="check-status" element={<CheckStatus />} />
              <Route path="careers" element={<Careers />} />
              <Route path="noticeboard" element={<Noticeboard />} />
            </Route>

            {/* Registration & Application (Solo Layout) */}
            <Route path="/register/school" element={<SchoolRegister />} />
            <Route path="apply" element={<ApplicantRegister />} />
            <Route path="check-status" element={<TrackApplication />} />
            <Route path="/register/student" element={<StudentRegister />} />
            <Route path="/register/teacher" element={<TeacherRegister />} />
            <Route path="/register/admin" element={<AdminRegister />} />
            <Route path="/register/parent" element={<ParentRegister />} />
            <Route path="/register/supplier" element={<SupplierRegister />} />
            <Route path="/register/clinic" element={<ClinicRegister />} />
            <Route path="/register/bursar" element={<StaffRegister role="BURSAR" label="Bursar" icon="fa-money-bill-wave" />} />
            <Route path="/register/librarian" element={<StaffRegister role="LIBRARIAN" label="Librarian" icon="fa-book" />} />
            <Route path="/register/ancillary" element={<StaffRegister role="ANCILLARY" label="Ancillary Staff" icon="fa-tools" />} />
            <Route path="/register/alumni" element={<AlumniRegister />} />

            {/*  STUDENT PORTAL   */}
            <Route path="/student/login" element={
              <PortalLoginPage portalName="Student Portal" portalIcon="fas fa-graduation-cap"
                roleBadge="Student" allowedRole="STUDENT" dashboardPath="/student/dashboard"
                registrationPath="/register/student" />
            } />
            <Route path="/student" element={
              <ProtectedRoute allowedRole="STUDENT" loginPath="/student/login">
                <StudentLayout />
              </ProtectedRoute>
            }>
              <Route index element={<StudentDashboard />} />
              <Route path="dashboard" element={<StudentDashboard />} />
              <Route path="grades" element={<StudentGrades />} />
              <Route path="timetable" element={<StudentTimetable />} />
              <Route path="assignments" element={<StudentAssignments />} />
              <Route path="attendance" element={<StudentAttendance />} />
              <Route path="my-books" element={<StudentMyBooks />} />
              <Route path="admission-letter" element={<AdmissionLetterPage />} />
              <Route path="fees" element={<StudentFees />} />
              <Route path="study-materials" element={<StudentStudyMaterial />} />
              <Route path="awards" element={<MyAwards />} />
              <Route path="*" element={<Navigate to="dashboard" replace />} />
              <Route path="library" element={<Library />} />
              <Route path="events" element={<StudentEvents />} />
              <Route path="prefects" element={<PrefectCouncil />} />
              <Route path="class-monitor" element={<ClassMonitorDashboard />} />
              <Route path="chaplaincy" element={<ChaplaincyDashboard />} />
              <Route path="sports" element={<SportsManagement />} />
              <Route path="house" element={<HouseDashboard />} />
              <Route path="dining-hall" element={<DHRepresentative />} />
              <Route path="farm" element={<FarmManagement />} />
              <Route path="library-staff" element={<Placeholder title="Student Library Assistant" />} />
              <Route path="clinic/complaints" element={<HealthComplaints />} />
              <Route path="clinic/appointments" element={<Appointments />} />
              <Route path="clinic/emergencies" element={<Emergencies />} />
              <Route path="support" element={<ITSupportPage />} />
              <Route path="uniforms" element={<UniformsPage />} />
              <Route path="research" element={<ResearchDashboard />} />
              <Route path="portfolio" element={<AcademicPortfolio />} />
              <Route path="settings" element={<SettingsPage />} />
              <Route path="profile" element={<ProfilePage />} />
              <Route path="cbt" element={<CBTExams />} />
              <Route path="cbt/take/:id" element={<TakeExam />} />
            </Route>

            {/* TEACHER PORTAL  */}
            <Route path="/teacher/login" element={
              <PortalLoginPage portalName="Teacher Portal" portalIcon="fas fa-chalkboard-teacher"
                roleBadge="Teacher" allowedRole="TEACHER" dashboardPath="/teacher/dashboard"
                registrationPath="/register/teacher" />
            } />
            <Route path="/teacher" element={
              <ProtectedRoute allowedRole="TEACHER" loginPath="/teacher/login">
                <TeacherLayout />
              </ProtectedRoute>
            }>
              <Route index element={<TeacherDashboard />} />
              <Route path="dashboard" element={<TeacherDashboard />} />
              <Route path="classes" element={<TeacherClasses />} />
              <Route path="classes/:classId" element={<TeacherClassDetails />} />
              <Route path="students" element={<TeacherStudents />} />
              <Route path="student-profile" element={<StudentProfile />} />
              <Route path="grades" element={<TeacherGrades />} />
              <Route path="assignments" element={<TeacherAssignments />} />

              <Route path="attendance/student" element={<DailyStudentAttendance />} />
              <Route path="attendance/qr" element={<QRAttendance />} />
              <Route path="attendance/report" element={<DailyStudentAttendanceReport />} />
              <Route path="attendance-logs" element={<ClockInLogsPage />} />

              <Route path="study-materials" element={<StudyMaterial />} />
              <Route path="leave" element={<MyLeave />} />
              <Route path="awards" element={<MyAwards />} />
              <Route path="payslips" element={<MyPaymentSlip />} />
              <Route path="*" element={<Navigate to="dashboard" replace />} />
              <Route path="attendance" element={<TeacherClassAttendance />} />

              <Route path="live-class/zoom" element={<ZoomLiveClass />} />
              <Route path="live-class/jitsi" element={<JitsiLiveClass />} />

              <Route path="leave" element={<MyLeave />} />
              <Route path="awards" element={<MyAwards />} />

              <Route path="planner" element={<TeacherLessonPlan />} />
              <Route path="syllabus" element={<CreateSyllabus />} />


              <Route path="courses" element={<CoursesDashboard />} />
              <Route path="online-learning/revenue-report" element={<RevenueReport />} />
              <Route path="add-new-course" element={<AddNewCourse />} />
              <Route path="enrol-student" element={<EnrolStudent />} />

              <Route path="cbt/manage" element={<ManageCBT />} />
              <Route path="cbt/manage/:id/questions" element={<ManageQuestions />} />
              <Route path="cbt/manage/:id/results" element={<CBTResults />} />
              <Route path="cbt/take/:id" element={<TakeExam />} />
              <Route path="timetable" element={<TeacherTimetable />} />
              <Route path="sports" element={<SportsManagement />} />
              <Route path="house" element={<HouseDashboard />} />
              <Route path="farm" element={<FarmManagement />} />
              <Route path="dining-hall" element={<DHRepresentative />} />
              <Route path="chaplaincy" element={<ChaplaincyDashboard />} />
              <Route path="prefects" element={<PrefectCouncil />} />
              <Route path="schedules" element={<AncillarySchedules />} />
              <Route path="submissions" element={<TeacherSubmissions />} />

              <Route path="messages" element={<MessagesPage />} />
              <Route path="reports" element={<TeacherReports />} />
              <Route path="question-papers" element={<QuestionPapersPage />} />
              <Route path="question-papers/new" element={<QuestionPaperBuilder />} />
              <Route path="question-papers/edit/:id" element={<QuestionPaperBuilder />} />
              <Route path="library" element={<Library />} />
              <Route path="textbooks" element={<TeacherTextbooks />} />
              <Route path="clinic/complaints" element={<HealthComplaints />} />
              <Route path="clinic/appointments" element={<Appointments />} />
              <Route path="clinic/emergencies" element={<Emergencies />} />
              <Route path="support" element={<ITSupportPage />} />
              <Route path="procurement" element={<TeacherProcurement />} />
              <Route path="supervision" element={<SupervisorDashboard />} />
              <Route path="assets" element={<TeacherAssets />} />
              <Route path="uniforms" element={<UniformsPage />} />
              <Route path="settings" element={<SettingsPage />} />
              <Route path="profile" element={<ProfilePage />} />
            </Route>

            {/* ADMIN PORTAL */}
            <Route path="/admin/login" element={
              <PortalLoginPage portalName="Admin Portal" portalIcon="fas fa-user-shield"
                roleBadge="Admin" allowedRole="SCHOOL_ADMIN" dashboardPath="/admin/dashboard"
                registrationPath="/register/admin" />
            } />
            <Route path="/admin" element={
              <ProtectedRoute allowedRole="SCHOOL_ADMIN" loginPath="/admin/login">
                <AdminLayout />
              </ProtectedRoute>
            }>
              <Route index element={<AdminDashboard />} />
              <Route path="dashboard" element={<AdminDashboard />} />
              <Route path="syllabus" element={<CreateSyllabus />} />
              <Route path="lesson-plan" element={<TeacherLessonPlan />} />
              <Route path="study-materials" element={<StudyMaterial />} />
              <Route path="leave" element={<MyLeave />} />
              <Route path="awards" element={<MyAwards />} />
              <Route path="library" element={<Library />} />
              <Route path="students" element={<AdminStudents />} />
              <Route path="parents" element={<AdminParents />} />
              <Route path="teachers" element={<AdminTeachers />} />
              <Route path="users" element={<AdminUsers />} />
              <Route path="classes" element={<AdminClasses />} />
              <Route path="departments" element={<AdminDepartments />} />
              <Route path="cbt/manage" element={<ManageCBT />} />
              <Route path="website-settings" element={<SettingsPage />} />
              <Route path="cbt/manage/:id/questions" element={<ManageQuestions />} />
              <Route path="cbt/manage/:id/results" element={<CBTResults />} />
              <Route path="subjects" element={<AdminSubjects />} />
              <Route path="timetable" element={<AdminTimetable />} />
              <Route path="applications" element={<AdminApplications />} />
              <Route path="fees" element={<AdminFees />} />
              <Route path="reports">
                <Route index element={<ReportsDashboardPage />} />
                <Route path="view/:type" element={<ReportViewerPage />} />
              </Route>
              <Route path="announcements" element={<AdminAnnouncementsManagement />} />
              <Route path="branding" element={<AdminDocumentTemplates />} />
              <Route path="procurement" element={<AdminProcurement />} />
              <Route path="teacher-load" element={<AdminTeacherLoad />} />
              <Route path="alumni" element={<AdminAlumni />} />
              <Route path="hr/vacancies" element={<ManageVacancies />} />
              <Route path="hr/applications" element={<JobApplications />} />
              <Route path="hr/payroll/create" element={<CreatePayslip />} />
              <Route path="hr/payroll/list" element={<PayrollList />} />
              <Route path="hr/leaves" element={<ListLeaves />} />
              <Route path="hr/awards" element={<ManageAwards />} />
              <Route path="hr/attendance" element={<ClockInLogsPage />} />
              <Route path="ancillary" element={<AdminAncillary />} />
              <Route path="bursars" element={<AdminBursars />} />
              <Route path="librarians" element={<AdminLibrarians />} />
              <Route path="suppliers" element={<AdminSuppliers />} />
              <Route path="assets" element={<AdminAssetManagement />} />
              <Route path="staff-admins" element={<AdminManagement />} />
              {/* cms integrated into website-settings */}
              <Route path="document-templates" element={<AdminDocumentTemplates />} />
              <Route path="subscription" element={<AdminSubscription />} />
              <Route path="student-profile" element={<StudentProfile />} />
              <Route path="student-history" element={<AdminAcademicHistory />} />
              <Route path="assessments">
                <Route path="marks-entry" element={<MarksEntryPage />} />
                <Route path="principal-comments" element={<PrincipalCommentsPage />} />
                <Route path="question-papers" element={<QuestionPapersPage />} />
                <Route path="question-papers/new" element={<QuestionPaperBuilder />} />
                <Route path="question-papers/edit/:id" element={<QuestionPaperBuilder />} />
                <Route path="grading" element={<GradingSettingsPage />} />
                <Route path="admission-letters" element={<AdmissionLetterPage />} />
              </Route>
              <Route path="sdc-minutes" element={<AdminSDCMinutes />} />
              <Route path="sdc-funding" element={<AdminSDCFunding />} />
              <Route path="asset-maintenance" element={<AdminAssetMaintenance />} />
              <Route path="messages" element={<MessagesPage />} />
              <Route path="settings" element={<SettingsPage />} />
              <Route path="personal-settings" element={<SettingsPage />} />
              <Route path="payment-methods" element={<PaymentMethodsPage />} />
              <Route path="fee-groups" element={<FeeGroupsPage />} />
              <Route path="revenue-allocation" element={<RevenueAllocationPage />} />
              <Route path="accounts">
                <Route path="liabilities" element={<LiabilitiesPage />} />
                <Route path="income" element={<IncomePage />} />
                <Route path="expenses" element={<ExpensesPage />} />
                <Route path="uniforms" element={<UniformsPage />} />
              </Route>
              <Route path="fees-management">
                <Route path="groups" element={<FeeGroupsPage />} />
                <Route path="billing" element={<FeesBillingPage />} />
                <Route path="invoices" element={<ManageInvoicesPage />} />
                <Route path="payment-history" element={<PaymentHistoryPage />} />
                <Route path="ledgers" element={<StudentLedgersPage />} />
                <Route path="groceries" element={<GroceriesPage />} />
                <Route path="bulk-invoices" element={<BulkInvoicesPage />} />
                <Route path="reminder-logs" element={<FeeReminderLogsPage />} />
              </Route>
              <Route path="payroll">
                <Route path="settings" element={<SettingsPage defaultTab="financial" />} />
                <Route path="employees" element={<EmployeeManagementPage />} />
              </Route>
              <Route path="profile" element={<ProfilePage />} />
              {/* clinic routes restored under admin portal */}
              <Route path="clinic/complaints" element={<HealthComplaints />} />
              <Route path="clinic/appointments" element={<Appointments />} />
              <Route path="clinic/emergencies" element={<Emergencies />} />
              <Route path="clinic/referrals" element={<Referrals />} />
              <Route path="clinic/immunization" element={<Immunization />} />
              <Route path="transportation/routes" element={<TransportRoute />} />
              <Route path="transportation/vehicles" element={<ManageVehicle />} />
              <Route path="transportation/assignments" element={<SchoolTransportation />} />
              <Route path="helpdesk" element={<AdminHelpdesk />} />
              <Route path="class-migration" element={<AdminClassMigration />} />
              <Route path="student-club" element={<AdminStudentClub />} />
              <Route path="sports-management" element={<SportsManagement />} />
              <Route path="payment-plans" element={<ManagePaymentPlans />} />
              <Route path="house" element={<AdminStudentHouse />} />
              <Route path="chaplaincy" element={<ChaplaincyDashboard />} />
              <Route path="farm" element={<FarmManagement />} />
              <Route path="dining-hall" element={<DHRepresentative />} />
              <Route path="prefects" element={<PrefectCouncil />} />
              <Route path="schedules" element={<AncillarySchedules />} />
            </Route>

            {/* BURSAR PORTAL  */}
            <Route path="/bursar/login" element={
              <PortalLoginPage portalName="Bursar Portal" portalIcon="fas fa-money-check-alt"
                roleBadge="Bursar" allowedRole="BURSAR" dashboardPath="/bursar/dashboard"
                registrationPath="/register/bursar" />
            } />
            <Route path="/bursar" element={
              <ProtectedRoute allowedRole="BURSAR" loginPath="/bursar/login">
                <BursarLayout />
              </ProtectedRoute>
            }>
              <Route index element={<BursarDashboard />} />
              <Route path="dashboard" element={<BursarDashboard />} />
              <Route path="fees" element={<FeesBillingPage />} />
              <Route path="payments" element={<PaymentHistoryPage />} />
              <Route path="expenses" element={<ExpensesPage />} />
              <Route path="reconcile" element={<BursarFinancialReconciliation />} />
              <Route path="payroll">
                <Route index element={<PayrollList />} />
                <Route path="run" element={<BursarPayrollRun />} />
                <Route path="settings" element={<SettingsPage defaultTab="financial" />} />
                <Route path="employees" element={<EmployeeManagementPage />} />
              </Route>
              <Route path="tuckshop">
                <Route index element={<BursarTuckshop />} />
                <Route path="inventory" element={<BursarTuckshopInventory />} />
                <Route path="sales" element={<BursarTuckshopSales />} />
                <Route path="reports" element={<BursarTuckshopReports />} />
              </Route>
              <Route path="fees-management">
                <Route path="groups" element={<FeeGroupsPage />} />
                <Route path="billing" element={<FeesBillingPage />} />
                <Route path="invoices" element={<ManageInvoicesPage />} />
                <Route path="payment-history" element={<PaymentHistoryPage />} />
                <Route path="ledgers" element={<StudentLedgersPage />} />
                <Route path="groceries" element={<GroceriesPage />} />
                <Route path="bulk-invoices" element={<BulkInvoicesPage />} />
                <Route path="reminder-logs" element={<FeeReminderLogsPage />} />
              </Route>
              <Route path="sdc">
                <Route index element={<BursarSDC />} />
                <Route path="funding" element={<BursarSDCFunding />} />
                <Route path="minutes" element={<BursarSDCMinutes />} />
              </Route>
              <Route path="staff">
                <Route index element={<EmployeeManagementPage />} />
                <Route path="directory" element={<EmployeeManagementPage />} />
              </Route>
              <Route path="reports">
                <Route index element={<ReportsDashboardPage />} />
                <Route path="view/:type" element={<ReportViewerPage />} />
              </Route>
              <Route path="website-settings" element={<SettingsPage />} />
              <Route path="settings" element={<SettingsPage />} />
              <Route path="payment-methods" element={<PaymentMethodsPage />} />
              <Route path="fee-groups" element={<FeeGroupsPage />} />
              <Route path="revenue-allocation" element={<RevenueAllocationPage />} />
              <Route path="accounts">
                <Route path="liabilities" element={<LiabilitiesPage />} />
                <Route path="income" element={<IncomePage />} />
                <Route path="expenses" element={<ExpensesPage />} />
                <Route path="uniforms" element={<UniformsPage />} />
              </Route>
              <Route path="profile" element={<ProfilePage />} />
              <Route path="assets" element={<AncillaryAssets />} />
              <Route path="transportation/routes" element={<TransportRoute />} />
              <Route path="transportation/vehicles" element={<ManageVehicle />} />
              <Route path="transportation/assignments" element={<SchoolTransportation />} />
              <Route path="support" element={<ITSupportPage />} />
              <Route path="procurement" element={<BursarProcurement />} />
              <Route path="class-migration" element={<AdminClassMigration />} />
              <Route path="payment-plans" element={<ManagePaymentPlans />} />
              <Route path="students" element={<AdminStudents />} />
              <Route path="leave" element={<MyLeave />} />
              <Route path="awards" element={<MyAwards />} />
            </Route>

            {/* LIBRARIAN PORTAL  */}
            <Route path="/librarian/login" element={
              <PortalLoginPage portalName="Librarian Portal" portalIcon="fas fa-book"
                roleBadge="Librarian" allowedRole="LIBRARIAN" dashboardPath="/librarian/dashboard"
                registrationPath="/register/librarian" />
            } />
            <Route path="/librarian" element={
              <ProtectedRoute allowedRole="LIBRARIAN" loginPath="/librarian/login">
                <LibraryLayout />
              </ProtectedRoute>
            }>
              <Route index element={<LibraryDashboard />} />
              <Route path="dashboard" element={<LibraryDashboard />} />
              <Route path="books" element={<LibraryBooks />} />
              <Route path="categories" element={<LibraryResourceCategories />} />
              <Route path="digital" element={<LibraryDigitalRepository />} />
              <Route path="loans" element={<LibraryLoans />} />
              <Route path="overdue" element={<LibraryOverdue />} />
              <Route path="reports" element={<LibraryReports />} />
              <Route path="requests" element={<LibraryRequests />} />
              <Route path="assets" element={<AncillaryAssets />} />
              <Route path="procurement" element={<AncillaryProcurement />} />
              <Route path="messages" element={<MessagesPage />} />
              <Route path="settings" element={<SettingsPage />} />
              <Route path="profile" element={<ProfilePage />} />
              <Route path="leave" element={<MyLeave />} />
              <Route path="awards" element={<MyAwards />} />
              <Route path="payslips" element={<MyPaymentSlip />} />
              <Route path="schedules" element={<AncillarySchedules />} />
              <Route path="support" element={<ITSupportPage />} />
              <Route path="attendance" element={<ClockInLogsPage />} />
            </Route>

            {/* Legacy redirect for old library links */}
            <Route path="/library/*" element={<Navigate to="/librarian/dashboard" replace />} />

            {/*  ALUMNI PORTAL  */}
            <Route path="/alumni/login" element={
              <PortalLoginPage portalName="Alumni Portal" portalIcon="fas fa-user-graduate"
                roleBadge="Alumni" allowedRole="ALUMNI" dashboardPath="/alumni/dashboard"
                registrationPath="/register/alumni" />
            } />
            <Route path="/alumni" element={
              <ProtectedRoute allowedRole="ALUMNI" loginPath="/alumni/login">
                <AlumniLayout />
              </ProtectedRoute>
            }>
              <Route index element={<AlumniDashboard />} />
              <Route path="dashboard" element={<AlumniDashboard />} />
              <Route path="network" element={<AlumniNetwork />} />
              <Route path="events" element={<AlumniEvents />} />
              <Route path="fees" element={<AlumniFees />} />
              <Route path="updates" element={<AlumniUpdates />} />
              <Route path="settings" element={<SettingsPage />} />
              <Route path="profile" element={<ProfilePage />} />
              <Route path="support" element={<ITSupportPage />} />
            </Route>

            {/* ANCILLARY PORTAL  */}
            <Route path="/ancillary/login" element={
              <PortalLoginPage portalName="Ancillary Portal" portalIcon="fas fa-hands-helping"
                roleBadge="Staff" allowedRole="ANCILLARY" dashboardPath="/ancillary/dashboard"
                registrationPath="/register/ancillary" />
            } />
            <Route path="/ancillary" element={
              <ProtectedRoute allowedRole="ANCILLARY" loginPath="/ancillary/login">
                <AncillaryLayout />
              </ProtectedRoute>
            }>
              <Route index element={<AncillaryDashboard />} />
              <Route path="dashboard" element={<AncillaryDashboard />} />
              <Route path="office/inquiries" element={<AdmissionInquiryPage />} />
              <Route path="office/visitors" element={<VisitorBookPage />} />
              <Route path="office/calls" element={<PhoneCallLogPage />} />
              <Route path="office/complaints" element={<ComplaintsPage />} />
              <Route path="it-support" element={<ITSupportPage />} />
              <Route path="website-settings" element={<SettingsPage />} />
              <Route path="settings" element={<SettingsPage />} />
              <Route path="assets" element={<AncillaryAssets />} />
              <Route path="procurement" element={<AncillaryProcurement />} />
              <Route path="directory" element={<EmployeeManagementPage />} />
              <Route path="schedules" element={<AncillarySchedules />} />
              <Route path="boarding" element={<BoardingManagement />} />
              <Route path="boarding/hostel-category" element={<HostelCategory />} />
              <Route path="boarding/hostel-room" element={<HostelRoom />} />
              <Route path="boarding/manage-hostel" element={<ManageHostel />} />
              <Route path="boarding/assign-students" element={<AssignStudents />} />
              <Route path="security" element={<SecurityLog />} />
              <Route path="kitchen" element={<KitchenManagement />} />
              <Route path="tuckshop">
                <Route index element={<BursarTuckshop />} />
                <Route path="inventory" element={<BursarTuckshopInventory />} />
                <Route path="sales" element={<BursarTuckshopSales />} />
                <Route path="reports" element={<BursarTuckshopReports />} />
              </Route>
              <Route path="transportation/routes" element={<TransportRoute />} />
              <Route path="transportation/vehicles" element={<ManageVehicle />} />
              <Route path="transportation/assignments" element={<SchoolTransportation />} />
              <Route path="house" element={<HouseDashboard />} />
              <Route path="farm" element={<FarmManagement />} />
              <Route path="dining-hall" element={<DHRepresentative />} />
              <Route path="sports" element={<SportsManagement />} />
              <Route path="leave" element={<LeaveManagement />} />
              <Route path="awards" element={<MyAwards />} />
              <Route path="give-award" element={<GiveStudentAward />} />
              <Route path="messages" element={<MessagesPage />} />
              <Route path="profile" element={<ProfilePage />} />
              <Route path="payslips" element={<MyPaymentSlip />} />
              <Route path="clinic/complaints" element={<HealthComplaints />} />
              <Route path="clinic/appointments" element={<Appointments />} />
              <Route path="clinic/emergencies" element={<Emergencies />} />
              <Route path="clinic/referrals" element={<Referrals />} />
              <Route path="clinic/immunization" element={<Immunization />} />
            </Route>

            {/*  PARENT PORTAL */}
            <Route path="/parent/login" element={
              <PortalLoginPage portalName="Parent Portal" portalIcon="fas fa-home"
                roleBadge="Parent" allowedRole="PARENT" dashboardPath="/parent/dashboard"
                registrationPath="/register/parent" />
            } />
            <Route path="/parent" element={
              <ProtectedRoute allowedRole="PARENT" loginPath="/parent/login">
                <ParentLayout />
              </ProtectedRoute>
            }>
              <Route index element={<ParentDashboard />} />
              <Route path="dashboard" element={<ParentDashboard />} />
              <Route path="reports" element={<ProgressReports />} />
              <Route path="portfolio" element={<AcademicPortfolio />} />
              <Route path="attendance" element={<AttendanceHistory />} />
              <Route path="timetable" element={<StudentTimetable />} />
              <Route path="history" element={<ParentHistory />} />
              <Route path="wellbeing" element={<ParentWellbeing />} />
              <Route path="calendar" element={<ParentCalendar />} />
              <Route path="wallet" element={<ParentWallet />} />
              <Route path="approvals" element={<ParentApprovals />} />
              <Route path="fees" element={<ParentFees />} />
              <Route path="payment-plans" element={<ParentPaymentPlans />} />
              <Route path="notices" element={<ParentNotices />} />
              <Route path="messages" element={<MessagesPage />} />
              <Route path="transport" element={<ParentTransport />} />
              <Route path="uniforms" element={<UniformsPage />} />
              <Route path="settings" element={<SettingsPage />} />
              <Route path="profile" element={<ProfilePage />} />
              <Route path="clinic/complaints" element={<HealthComplaints />} />
              <Route path="clinic/appointments" element={<Appointments />} />
              <Route path="clinic/emergencies" element={<Emergencies />} />
              <Route path="support" element={<ITSupportPage />} />
            </Route>

            {/*  SUPPLIER PORTAL  */}
            <Route path="/supplier/login" element={
              <PortalLoginPage portalName="Supplier Portal" portalIcon="fas fa-truck"
                roleBadge="Supplier" allowedRole="SUPPLIER" dashboardPath="/supplier/dashboard"
                registrationPath="/register/supplier" />
            } />
            <Route path="/supplier" element={
              <ProtectedRoute allowedRole="SUPPLIER" loginPath="/supplier/login">
                <SupplierLayout />
              </ProtectedRoute>
            }>
              <Route index element={<SupplierDashboard />} />
              <Route path="dashboard" element={<SupplierDashboard />} />
              <Route path="orders" element={<SupplierOrders />} />
              <Route path="uniforms" element={<UniformsPage />} />
              <Route path="invoices" element={<SupplierInvoices />} />
              <Route path="tenders" element={<SupplierTenders />} />
              <Route path="contracts" element={<SupplierContracts />} />
              <Route path="quotations" element={<SupplierQuotations />} />
              <Route path="compliance" element={<SupplierCompliance />} />
              <Route path="policies" element={<SupplierPolicies />} />
              <Route path="profile" element={<ProfilePage />} />
              <Route path="messages" element={<MessagesPage />} />
              <Route path="support" element={<ITSupportPage />} />
            </Route>


            {/*  CLINIC PORTAL */}
            <Route path="/register/clinic" element={<ClinicRegister />} />
            <Route path="/clinic/login" element={
              <PortalLoginPage portalName="Clinic Portal" portalIcon="fas fa-user-md"
                roleBadge="Medical Staff" allowedRole="CLINIC" dashboardPath="/clinic/dashboard"
                registrationPath="/register/clinic" />
            } />
            <Route path="/clinic" element={
              <ProtectedRoute allowedRole="CLINIC" loginPath="/clinic/login">
                <ClinicLayout />
              </ProtectedRoute>
            }>
              <Route index element={<ClinicDashboard />} />
              <Route path="dashboard" element={<ClinicDashboard />} />
              <Route path="patients" element={<PatientManagement />} />
              <Route path="appointments" element={<Appointments />} />
              <Route path="emergencies" element={<Emergencies />} />
              <Route path="referrals" element={<Referrals />} />
              <Route path="immunization" element={<Immunization />} />
              <Route path="complaints" element={<HealthComplaints />} />
              <Route path="messages" element={<MessagesPage />} />
              <Route path="profile" element={<ProfilePage />} />
              <Route path="support" element={<ITSupportPage />} />
              <Route path="settings" element={<SettingsPage />} />
            </Route>

            {/*  APPLICANT PORTAL */}
            <Route path="/applicant/login" element={
              <PortalLoginPage portalName="Applicant Portal" portalIcon="fas fa-file-signature"
                roleBadge="Prospective" allowedRole="APPLICANT" dashboardPath="/applicant/dashboard"
                registrationPath="/apply" />
            } />
            <Route path="/applicant" element={<ApplicantLayout />}>
              <Route index element={<ApplicantDashboard />} />
              <Route path="dashboard" element={<ApplicantDashboard />} />
              <Route path="profile" element={<ProfilePage />} />
              <Route path="timeline" element={<ApplicantTimeline />} />
              <Route path="documents" element={<ApplicantDocuments />} />
              <Route path="interview" element={<ApplicantInterview />} />
              <Route path="fees" element={<ApplicantFees />} />
              <Route path="messages" element={<MessagesPage />} />
              <Route path="faq" element={<Placeholder title="Applicant FAQ" />} />
              <Route path="settings" element={<SettingsPage />} />
              <Route path="clinic/complaints" element={<HealthComplaints />} />
              <Route path="clinic/appointments" element={<Appointments />} />
              <Route path="clinic/triage" element={<TriageDashboard />} />
              <Route path="clinic/patient-history" element={<PatientHistory />} />
              <Route path="clinic/emergencies" element={<Emergencies />} />
              <Route path="clinic/referrals" element={<Referrals />} />
              <Route path="clinic/immunization" element={<Immunization />} />
              <Route path="support" element={<ITSupportPage />} />
            </Route>

            {/*  ACADEX PLATFORM PORTAL */}
            <Route path="/acadex/login" element={
              <PortalLoginPage portalName="Acadex Platform" portalIcon="fas fa-shield-alt"
                roleBadge="Platform Admin" allowedRole="SUPER_ADMIN" dashboardPath="/acadex/dashboard" />
            } />
            <Route path="/acadex" element={<AcadexLayout />}>
              <Route index element={<AcadexDashboard />} />
              <Route path="dashboard" element={<AcadexDashboard />} />
              <Route path="schools" element={<AcadexSchools />} />
              <Route path="provision" element={<AcadexProvisioning />} />
              <Route path="plans" element={<AcadexPlans />} />
              <Route path="revenue" element={<ComingSoon />} />
              <Route path="logs" element={<PlatformLogs />} />
              <Route path="settings" element={<SettingsPage />} />
              <Route path="profile" element={<ProfilePage />} />
              <Route path="clinic/complaints" element={<HealthComplaints />} />
              <Route path="clinic/appointments" element={<Appointments />} />
              <Route path="clinic/emergencies" element={<Emergencies />} />
              <Route path="clinic/referrals" element={<Referrals />} />
              <Route path="clinic/immunization" element={<Immunization />} />
              <Route path="support" element={<ITSupportPage />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </ToastProvider>
    </AuthProvider>
  );
}
