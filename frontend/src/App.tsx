// WebsiteSettings subcomponents and layout imports removed as they are unified in SettingsPage
import { BrowserRouter, Routes, Route, Navigate, useSearchParams } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import ProtectedRoute from './components/auth/ProtectedRoute';
import { ToastProvider } from './context/ToastContext';
import { SetupProvider } from './context/SetupContext';
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
import AcadexFeatures from './pages/AcadexFeatures';
import AcadexPricing from './pages/AcadexPricing';
import AcadexContact from './pages/AcadexContact';
import About from './pages/About';
import Careers from './pages/Careers'; // public careers/vacancies portal
import Noticeboard from './pages/Noticeboard'; // public school noticeboard
import PublicSchoolLibrary from './pages/PublicSchoolLibrary';


// Portal layouts
import StudentLayout from './portals/student/StudentLayout';
import TeacherLayout from './portals/teacher/TeacherLayout';
import AdminLayout from './portals/admin/AdminLayout';
import BursarLayout from './portals/bursar/BursarLayout';
import LibraryLayout from './portals/library/LibraryLayout';
import AlumniLayout from './portals/alumni/AlumniLayout';
import AncillaryLayout from './portals/ancillary/AncillaryLayout';
import SportsManagement from './portals/shared/pages/SportsManagement';
import SportsModule from './portals/teacher/pages/SportsModule';
import HouseDashboard from './portals/shared/pages/HouseDashboard';
import ChaplaincyDashboard from './portals/shared/pages/ChaplaincyDashboard';
import FarmManagement from './portals/shared/pages/FarmManagement';
import DHRepresentative from './portals/student/pages/DHRepresentative';
import TeacherDiningHall from './portals/teacher/pages/DiningHall';
import PrefectCouncil from './portals/student/pages/PrefectCouncil';
import ClassMonitorDashboard from './portals/student/pages/ClassMonitorDashboard';
import ParentLayout from './portals/parent/ParentLayout';
import SupplierLayout from './portals/supplier/SupplierLayout';
import AcadexLayout from './portals/acadex/AcadexLayout';

// CBT Pages
import ManageCBT from './portals/shared/pages/cbt/ManageCBT';
import QuestionBank from './portals/teacher/pages/QuestionBank';
import OnlineExamsCbt from './portals/teacher/pages/OnlineExamsCbt';
import ManageQuestions from './portals/shared/pages/cbt/ManageQuestions';
import TakeExam from './portals/shared/pages/cbt/TakeExam';

// Portal login
import PortalLoginPage from './components/portals/PortalLoginPage';

//  Student pages 
import StudentDashboard from './portals/student/pages/Dashboard';
import StudentGrades from './portals/student/pages/Grades';
import StudentTimetable from './portals/student/pages/Timetable';
import StudentAttendance from './portals/student/pages/Attendance';
import StudentFees from './portals/student/pages/Fees';
import StudentAssignments from './portals/student/pages/Assignments';
import Library from './portals/shared/pages/Library';
import StudentEvents from './portals/student/pages/Events';
import ResearchDashboard from './portals/student/pages/ResearchDashboard';
import CBTExams from './portals/student/pages/CBTExams';
import CBTResults from './portals/shared/pages/cbt/CBTResults';
import CleaningRequests from './portals/student/pages/CleaningRequests';
import LeaderGuard from './components/auth/LeaderGuard';
import StudentClinicUnified from './portals/student/pages/StudentClinicUnified';
import TeacherAttendanceUnified from './portals/teacher/pages/TeacherAttendanceUnified';
import TeacherClinicUnified from './portals/teacher/pages/TeacherClinicUnified';
import TeacherGradesUnified from './portals/teacher/pages/TeacherGradesUnified';
import TeacherCurriculum from './portals/teacher/pages/TeacherCurriculum';
import AdminFinance from './portals/admin/pages/AdminFinance';
import BursarFeesUnified from './portals/bursar/pages/BursarFeesUnified';
import BursarTuckshopUnified from './portals/bursar/pages/BursarTuckshopUnified';
import FastPOSTerminal from './portals/shared/pages/FastPOSTerminal';

//  Clinic Portal pages 
import ClinicLayout from './portals/clinic/ClinicLayout';
import ClinicDashboardPage from './portals/clinic/pages/ClinicDashboardPage';
import ClinicTriagePage from './portals/clinic/pages/ClinicTriagePage';
import ClinicConsultationsPage from './portals/clinic/pages/ClinicConsultationsPage';
import ClinicHospitalizationPage from './portals/clinic/pages/ClinicHospitalizationPage';
import ClinicPharmacyPage from './portals/clinic/pages/ClinicPharmacyPage';
import ClinicWellnessPage from './portals/clinic/pages/ClinicWellnessPage';
import ClinicEmergencyPage from './portals/clinic/pages/ClinicEmergencyPage';
import ClinicReportsUnifiedPage from './portals/clinic/pages/ClinicReportsUnifiedPage';

//  Teacher pages 
import TeacherDashboard from './portals/teacher/pages/Dashboard';
import TeacherClasses from './portals/teacher/pages/Classes';
import TeacherAssignments from './portals/teacher/pages/Assignments';
import TeacherTimetable from './portals/teacher/pages/Timetable';
import TeacherStudents from './portals/teacher/pages/Students';
import TeacherReports from './portals/teacher/pages/Reports';
import TeacherSubmissions from './portals/teacher/pages/AssignmentSubmissions';
import TeacherResources from './portals/teacher/pages/DigitalResources';
import TeacherAssets from './portals/teacher/pages/Assets';
import TeacherClassDetails from './portals/teacher/pages/ClassDetails';
import SupervisorDashboard from './portals/teacher/pages/SupervisorDashboardPage';
import ZoomLiveClass from './portals/shared/pages/live-classes/ZoomLiveClass';
import JitsiLiveClass from './portals/shared/pages/live-classes/JitsiLiveClass';
import MyLeave from './portals/shared/pages/hr/MyLeave';
import TeacherLeave from './portals/teacher/pages/TeacherLeave';
import MyAwards from './portals/shared/pages/hr/MyAwards';
import CoursesDashboard from './portals/teacher/pages/online-learning/CoursesDashboard';
import AddNewCourse from './portals/teacher/pages/online-learning/AddNewCourse';
import EnrolStudent from './portals/teacher/pages/online-learning/EnrolStudent';
import StudyMaterial from './portals/shared/pages/academics/StudyMaterial';
import StudentStudyMaterial from './portals/student/pages/academics/StudentStudyMaterial';
import RevenueReport from './portals/teacher/pages/online-learning/RevenueReport';
import MyPaymentSlip from './portals/shared/pages/hr/MyPaymentSlip';
import AdminDashboard from './portals/admin/pages/Dashboard';
import AdminSetupWizard from './portals/admin/pages/AdminSetupWizard';

import PayrollList from './portals/shared/pages/human-resources/PayrollList';
import AdminStudents from './portals/admin/pages/Students';
import StaffDirectory from './portals/admin/pages/StaffDirectory';
import AdminStudentDetail from './portals/admin/pages/StudentDetail';
import AdminAcademicsSetup from './portals/admin/pages/AcademicsSetup';
import AdminAcademicsMarks from './portals/admin/pages/AcademicsMarks';
import AdminAcademicsTimetable from './portals/admin/pages/AcademicsTimetable';
import AdminAttendance from './portals/admin/pages/Attendance';
import AdminStaffAttendance from './portals/admin/pages/AdminStaffAttendance';
import AdminClinic from './portals/admin/pages/AdminClinic';
import AdminDiscipline from './portals/admin/pages/AdminDiscipline';
import AdminTrips from './portals/admin/pages/AdminTrips';
import AdminTransport from './portals/admin/pages/AdminTransport';
import AdminUniformsInventory from './portals/admin/pages/AdminUniformsInventory';
import AdminCommunication from './portals/admin/pages/AdminCommunication';
import AdminSystem from './portals/admin/pages/AdminSystem';
import AdminSystemConfig from './portals/admin/pages/AdminSystemConfig';
import AdminBoarding from './portals/admin/pages/AdminBoarding';
import AdminDining from './portals/admin/pages/AdminDining';
import AdminApplications from './portals/admin/pages/Applications';
import AdminProcurement from './portals/admin/pages/Procurement';
import AdminSuppliers from './portals/admin/pages/SupplierManagement';
import ClockInLogsPage from './portals/shared/pages/ClockInLogsPage';
import AdminDepartments from './portals/admin/pages/Departments';
import StudentClub from './portals/admin/pages/StudentClub';
import AdminAssetManagement from './portals/admin/pages/AssetManagement';
import LeaveManagement from './portals/shared/pages/hr/MyLeave';
import HostelCategory from './portals/ancillary/pages/boarding/HostelCategory';
import HostelRoom from './portals/ancillary/pages/boarding/HostelRoom';
import ManageHostel from './portals/ancillary/pages/boarding/ManageHostel';
import AssignStudents from './portals/ancillary/pages/boarding/AssignStudents';
import GiveStudentAward from './portals/ancillary/pages/GiveStudentAward';
import AdminDocumentTemplates from './portals/admin/pages/DocumentTemplates';
import AdminTeacherLoad from './portals/admin/pages/TeacherLoad';
import AdminSubscription from './portals/admin/pages/Subscription';
import StudentProfile from './portals/admin/pages/StudentProfile';
import AdminSDCMinutes from './portals/admin/pages/SDCMinutes';
import AdminSDCFunding from './portals/admin/pages/SDCFunding';
import AdminHelpdesk from './portals/admin/pages/Helpdesk';
import AdminClassMigration from './portals/admin/pages/ClassMigration';
import ManagePaymentPlans from './portals/shared/pages/human-resources/ManagePaymentPlans';
import ChartOfAccountsPage from './portals/shared/pages/ChartOfAccountsPage';
import FinancialReportsPage from './portals/shared/pages/FinancialReportsPage';
import BankReconciliationPage from './portals/shared/pages/BankReconciliationPage';
import GeneralLedgerPage from './portals/bursar/pages/GeneralLedgerPage';
import BudgetsPage from './portals/bursar/pages/BudgetsPage';
import AnalyticsEnginesPage from './portals/shared/pages/AnalyticsEnginesPage';


//  Bursar pages 
import BursarDashboard from './portals/bursar/pages/Dashboard';
import BursarFinancialReconciliation from './portals/bursar/pages/FinancialReconciliation';
import BursarPayrollRun from './portals/bursar/pages/PayrollRun';
import BursarSDC from './portals/bursar/pages/SDCPortal';
import BursarSDCMinutes from './portals/bursar/pages/SDCMinutes';
import BursarSDCFunding from './portals/bursar/pages/SDCFunding';
import BursarProcurement from './portals/bursar/pages/Procurement';
import FiscalManagementPage from './portals/bursar/pages/FiscalManagementPage';
import ZimraReturnsPage from './portals/bursar/pages/ZimraReturnsPage';

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
import ParentFees from './portals/parent/pages/Fees';
import ParentAcademics from './portals/parent/pages/Academics';
import ParentTransport from './portals/parent/pages/Transport';
import ParentNotices from './portals/parent/pages/Notices';
import ParentWallet from './portals/parent/pages/Wallet';
import ParentCalendar from './portals/parent/pages/Calendar';
import ParentApprovals from './portals/parent/pages/Approvals';
import ParentClinic from './portals/parent/pages/Clinic';
import ParentUniforms from './portals/parent/pages/Uniforms';
import TeacherProcurement from './portals/teacher/pages/Procurement';
import AcademicPortfolio from './portals/shared/pages/AcademicPortfolio';
import AttendanceHistory from './portals/shared/pages/AttendanceHistory';

import SetupWizardPage from './portals/admin/pages/SetupWizardPage';

//  Applicant pages 
import ApplicantLayout from './portals/applicant/ApplicantLayout';
import ApplicantDashboard from './portals/applicant/pages/Dashboard';
import ApplicantDocuments from './portals/applicant/pages/Documents';
import ApplicantTimeline from './portals/applicant/pages/Timeline';
import ApplicantInterview from './portals/applicant/pages/Interview';
import ApplicantFees from './portals/applicant/pages/Fees';
import ApplicantFAQPage from './portals/applicant/pages/ApplicantFAQPage';

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
import GlobalRevenue from './portals/acadex/pages/GlobalRevenue';
import PlatformSettings from './portals/acadex/pages/PlatformSettings';


//  Shared pages 
import MessagesPage from './portals/shared/pages/MessagesPage';
import ProfilePage from './portals/shared/pages/ProfilePage';
import SettingsPage from './portals/shared/pages/SettingsPage';
import PersonalPreferences from './portals/shared/pages/PersonalPreferences';
import NotFoundPage from './portals/shared/pages/NotFoundPage';
import PrivacyPolicyPage from './portals/shared/pages/PrivacyPolicyPage';
import TermsPage from './portals/shared/pages/TermsPage';
import GovernancePage from './portals/shared/pages/GovernancePage';
import ITSupportPage from './portals/shared/pages/ITSupportPage';
import PaymentMethodsPage from './portals/shared/pages/PaymentMethodsPage';
import RevenueAllocationPage from './portals/shared/pages/RevenueAllocationPage';
import FeeGroupsPage from './portals/shared/pages/FeeGroupsPage';
import PaymentHistoryPage from './portals/shared/pages/PaymentHistoryPage';
import PayrollSettingsPage from './portals/shared/pages/PayrollSettingsPage';
import EmployeeManagementPage from './portals/shared/pages/EmployeeManagementPage';
import LiabilitiesPage from './portals/shared/pages/LiabilitiesPage';
import IncomePage from './portals/shared/pages/IncomePage';
import ExpensesPage from './portals/shared/pages/ExpensesPage';
import UniformsPage from './portals/shared/pages/UniformsPage';
import ReportsDashboardPage from './portals/shared/pages/ReportsDashboardPage';
import ReportViewerPage from './portals/shared/pages/ReportViewerPage';
import QuestionPapersPage from './portals/shared/pages/QuestionPapersPage';
import QuestionPaperBuilder from './portals/shared/pages/QuestionPaperBuilder';
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

// Smart redirect for legacy admin student profile links preserving query id
const AdminStudentProfileRedirect = () => {
  const [searchParams] = useSearchParams();
  const id = searchParams.get('id');
  return <Navigate to={id ? `/admin/students/${id}` : '/admin/students'} replace />;
};

/**
 * SchoolCodeRedirect: Catches /:schoolCode URLs and redirects to /school/:schoolCode
 * Only fires for paths that don't match known portal/system prefixes.
 * This lets users access school public sites via localhost/AX-SEMINARY
 */
const RESERVED_PATHS = new Set([
  'student', 'teacher', 'admin', 'bursar', 'library', 'librarian',
  'alumni', 'ancillary', 'parent', 'supplier', 'clinic', 'acadex',
  'register', 'login', 'school', 'api', 'apply', 'check-status',
  'features', 'pricing', 'contact', 'pos', 'tuckshop'
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
        const match = window.location.pathname.match(/\/school\/([^/]+)/i);
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
  }, [user]);

  useEffect(() => {
    if (favicon && schoolCode) {
      const link = (document.querySelector("link[rel*='icon']") as HTMLLinkElement) || document.createElement('link');
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
        <SetupProvider>
          <SiteConfigHandler />
          <BrowserRouter>
          <Routes>
            {/*  Acadex Platform Marketing Pages (Solo)  */}
            <Route path="/" element={<AcadexLanding />} />
            <Route path="/features" element={<AcadexFeatures />} />
            <Route path="/pricing" element={<AcadexPricing />} />
            <Route path="/contact" element={<AcadexContact />} />

            {/* Standalone Fast Touchscreen POS */}
            <Route path="/pos" element={<FastPOSTerminal />} />
            <Route path="/tuckshop/pos" element={<FastPOSTerminal />} />

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
              <Route path="library" element={<PublicSchoolLibrary />} />
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
              <Route path="admission-letter" element={<AdmissionLetterPage />} />
              <Route path="fees" element={<StudentFees />} />
              <Route path="study-materials" element={<StudentStudyMaterial />} />
              <Route path="awards" element={<MyAwards />} />
              <Route path="library" element={<Library />} />
              <Route path="events" element={<StudentEvents />} />
              <Route path="prefects" element={<PrefectCouncil />} />
              <Route path="class-monitor" element={<ClassMonitorDashboard />} />
              <Route path="chaplaincy" element={<ChaplaincyDashboard />} />
              <Route path="sports" element={<SportsManagement />} />
              <Route path="dining-hall" element={<DHRepresentative />} />
              <Route path="farm" element={<FarmManagement />} />
              <Route path="clinic" element={<StudentClinicUnified />} />
              <Route path="support" element={<ITSupportPage />} />
              <Route path="uniforms" element={<UniformsPage />} />
              <Route path="research" element={<ResearchDashboard />} />
              <Route path="portfolio" element={<AcademicPortfolio />} />
              <Route path="messages" element={<MessagesPage />} />
              <Route path="settings" element={<PersonalPreferences />} />
              <Route path="profile" element={<ProfilePage />} />
              <Route path="cbt" element={<CBTExams />} />
              <Route path="cbt/take/:id" element={<TakeExam />} />
              <Route path="cleaning-requests" element={
                <LeaderGuard>
                  <CleaningRequests />
                </LeaderGuard>
              } />

              {/* Backward Compatibility Redirects */}
              <Route path="my-books" element={<Navigate to="/student/library?tab=loans" replace />} />
              <Route path="library-staff" element={<Navigate to="/student/library?tab=duty-desk" replace />} />
              <Route path="requests" element={<Navigate to="/student/cleaning-requests" replace />} />
              <Route path="house" element={<Navigate to="/student/dashboard" replace />} />
              <Route path="clinic/complaints" element={<Navigate to="/student/clinic?tab=visits" replace />} />
              <Route path="clinic/appointments" element={<Navigate to="/student/clinic?tab=book" replace />} />
              <Route path="clinic/emergencies" element={<Navigate to="/student/clinic?tab=visits" replace />} />
              <Route path="*" element={<Navigate to="dashboard" replace />} />
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
              <Route path="grades" element={<TeacherGradesUnified />} />
              <Route path="assignments" element={<TeacherAssignments />} />
              <Route path="attendance" element={<TeacherAttendanceUnified />} />
              <Route path="marks" element={<Navigate to="/teacher/grades?tab=marks-entry" replace />} />

              <Route path="curriculum" element={<TeacherCurriculum />} />
              <Route path="clinic" element={<TeacherClinicUnified />} />
              <Route path="library" element={<Library />} />

              <Route path="study-materials" element={<StudyMaterial />} />
              <Route path="leave" element={<TeacherLeave />} />
              <Route path="awards" element={<MyAwards />} />
              <Route path="payslips" element={<MyPaymentSlip />} />

              <Route path="live-class/zoom" element={<ZoomLiveClass />} />
              <Route path="live-class/jitsi" element={<JitsiLiveClass />} />

              <Route path="courses" element={<CoursesDashboard />} />
              <Route path="online-learning/revenue-report" element={<RevenueReport />} />
              <Route path="add-new-course" element={<AddNewCourse />} />
              <Route path="enrol-student" element={<EnrolStudent />} />

              <Route path="cbt/manage" element={<OnlineExamsCbt />} />
              <Route path="question-bank" element={<QuestionBank />} />
              <Route path="cbt/manage/:id/questions" element={<ManageQuestions />} />
              <Route path="cbt/manage/:id/results" element={<CBTResults />} />
              <Route path="cbt/take/:id" element={<TakeExam />} />
              <Route path="timetable" element={<TeacherTimetable />} />
              <Route path="sports" element={<SportsModule />} />
              <Route path="house" element={<HouseDashboard />} />
              <Route path="farm" element={<FarmManagement />} />
              <Route path="dining-hall" element={<TeacherDiningHall />} />
              <Route path="chaplaincy" element={<ChaplaincyDashboard />} />
              <Route path="prefects" element={<PrefectCouncil />} />
              <Route path="schedules" element={<AncillarySchedules />} />
              <Route path="submissions" element={<TeacherSubmissions />} />

              <Route path="messages" element={<MessagesPage />} />
              <Route path="reports" element={<TeacherReports />} />
              <Route path="question-papers" element={<QuestionPapersPage />} />
              <Route path="question-papers/new" element={<QuestionPaperBuilder />} />
              <Route path="resources" element={<TeacherResources />} />
              <Route path="digital-resources" element={<TeacherResources />} />
              <Route path="support" element={<ITSupportPage />} />
              <Route path="procurement" element={<TeacherProcurement />} />
              <Route path="supervision" element={<SupervisorDashboard />} />
              <Route path="assets" element={<TeacherAssets />} />
              <Route path="uniforms" element={<UniformsPage />} />
              <Route path="settings" element={<PersonalPreferences />} />
              <Route path="profile" element={<ProfilePage />} />

              {/* Backward-Compatible Redirects */}
              <Route path="attendance/student" element={<Navigate to="/teacher/attendance?tab=roll-call" replace />} />
              <Route path="attendance/staff" element={<Navigate to="/teacher/attendance?tab=roll-call" replace />} />
              <Route path="attendance/qr" element={<Navigate to="/teacher/attendance?tab=qr" replace />} />
              <Route path="attendance/report" element={<Navigate to="/teacher/attendance?tab=reports" replace />} />
              <Route path="attendance-logs" element={<Navigate to="/teacher/attendance?tab=reports" replace />} />
              <Route path="attendance/mark" element={<Navigate to="/teacher/attendance?tab=roll-call" replace />} />

              <Route path="planner" element={<Navigate to="/teacher/curriculum?tab=lesson-plans" replace />} />
              <Route path="syllabus" element={<Navigate to="/teacher/curriculum?tab=syllabus" replace />} />
              <Route path="syllabus-manager" element={<Navigate to="/teacher/curriculum?tab=syllabus" replace />} />

              <Route path="assessments/marks-entry" element={<Navigate to="/teacher/grades?tab=marks-entry" replace />} />

              <Route path="clinic/complaints" element={<Navigate to="/teacher/clinic?tab=refer" replace />} />
              <Route path="clinic/appointments" element={<Navigate to="/teacher/clinic?tab=my-referrals" replace />} />
              <Route path="clinic/emergencies" element={<Navigate to="/teacher/clinic?tab=refer" replace />} />

              <Route path="library/dashboard" element={<Navigate to="/teacher/library" replace />} />
              <Route path="library/books" element={<Navigate to="/teacher/library?tab=catalog" replace />} />
              <Route path="library/categories" element={<Navigate to="/teacher/library?tab=catalog" replace />} />
              <Route path="library/digital" element={<Navigate to="/teacher/library?tab=digital" replace />} />
              <Route path="library/loans" element={<Navigate to="/teacher/library?tab=loans" replace />} />
              <Route path="library/overdue" element={<Navigate to="/teacher/library?tab=loans" replace />} />
              <Route path="library/reports" element={<Navigate to="/teacher/library" replace />} />
              <Route path="library/reservations" element={<Navigate to="/teacher/library?tab=reservations" replace />} />
              <Route path="library/requests" element={<Navigate to="/teacher/library?tab=reservations" replace />} />
              <Route path="*" element={<Navigate to="dashboard" replace />} />
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
              <Route path="setup" element={<AdminSetupWizard />} />
              <Route path="onboarding" element={<Navigate to="/admin/setup" replace />} />

              {/* CORE CONSOLIDATED ADMIN PAGES (16 PAGES + TENANT CONDITIONALS) */}
              {/* 1. People & Enrollment Module */}
              <Route path="students" element={<AdminStudents />} />
              <Route path="students/:id" element={<AdminStudentDetail />} />
              <Route path="staff" element={<StaffDirectory />} />
              <Route path="teachers" element={<Navigate to="/admin/staff?role=TEACHER" replace />} />
              <Route path="hr/staff" element={<Navigate to="/admin/staff" replace />} />
              <Route path="admissions" element={<AdminApplications />} />

              {/* 2. Finance Module */}
              <Route path="finance" element={<AdminFinance />} />
              <Route path="finance/overview" element={<Navigate to="/admin/finance?tab=overview" replace />} />
              <Route path="finance/billing" element={<Navigate to="/admin/finance?tab=billing" replace />} />
              <Route path="finance/payment-plans" element={<Navigate to="/admin/finance?tab=payment-plans" replace />} />
              <Route path="finance/wallets" element={<Navigate to="/admin/finance?tab=wallets" replace />} />

              {/* 3. Academics Module */}
              <Route path="academics/setup" element={<AdminAcademicsSetup />} />
              <Route path="academics/marks" element={<AdminAcademicsMarks />} />
              <Route path="academics/timetable" element={<AdminAcademicsTimetable />} />

              {/* 4. Attendance Module */}
              <Route path="attendance" element={<AdminAttendance />} />
              <Route path="attendance/staff" element={<AdminStaffAttendance />} />

              {/* 5. Welfare & Student Life Module */}
              <Route path="clinic" element={<AdminClinic />} />
              <Route path="discipline" element={<AdminDiscipline />} />
              <Route path="trips" element={<AdminTrips />} />
              <Route path="trips/create" element={<AdminTrips defaultTab="create" />} />
              <Route path="trips/:id" element={<AdminTrips defaultTab="details" />} />

              {/* 6. Operations Module */}
              <Route path="transport" element={<AdminTransport />} />
              <Route path="uniforms" element={<AdminUniformsInventory />} />

              {/* 7. Communication Module */}
              <Route path="communication" element={<AdminCommunication />} />

              {/* 8. System Module */}
              <Route path="system" element={<AdminSystem />} />
              <Route path="system-config" element={<AdminSystemConfig />} />
              <Route path="settings" element={<PersonalPreferences />} />
              <Route path="personal-settings" element={<PersonalPreferences />} />
              <Route path="profile" element={<ProfilePage />} />
              <Route path="setup" element={<SetupWizardPage />} />
              <Route path="helpdesk" element={<AdminHelpdesk />} />
              <Route path="subscription" element={<AdminSubscription />} />

              {/* Tenant-Conditional Additions */}
              <Route path="boarding" element={<AdminBoarding />} />
              <Route path="dining" element={<AdminDining />} />
              <Route path="sports" element={<SportsManagement />} />
              <Route path="farm" element={<FarmManagement />} />

              {/* Remaining operational / governance child routes */}
              <Route path="cbt/manage" element={<ManageCBT />} />
              <Route path="cbt/manage/:id/questions" element={<ManageQuestions />} />
              <Route path="cbt/manage/:id/results" element={<CBTResults />} />
              <Route path="procurement" element={<AdminProcurement />} />
              <Route path="suppliers" element={<AdminSuppliers />} />
              <Route path="assets" element={<AdminAssetManagement />} />
              <Route path="asset-maintenance" element={<Navigate to="/admin/assets?tab=maintenance" replace />} />
              <Route path="sdc-minutes" element={<AdminSDCMinutes />} />
              <Route path="sdc-funding" element={<AdminSDCFunding />} />
              <Route path="document-templates" element={<AdminDocumentTemplates />} />
              <Route path="branding" element={<AdminDocumentTemplates />} />
              <Route path="website-settings" element={<SettingsPage defaultTab="banner" />} />
              <Route path="departments" element={<AdminDepartments />} />
              <Route path="clubs" element={<StudentClub />} />
              <Route path="student-club" element={<Navigate to="/admin/clubs" replace />} />
              <Route path="student-house" element={<Navigate to="/admin/boarding" replace />} />
              <Route path="houses" element={<Navigate to="/admin/boarding" replace />} />
              <Route path="teacher-load" element={<AdminTeacherLoad />} />

              {/* ============================================================== */}
              {/* BACKWARD-COMPATIBLE REDIRECTS FOR CONSOLIDATED ADMIN ROUTES     */}
              {/* ============================================================== */}
              <Route path="student-management" element={<Navigate to="/admin/students" replace />} />
              <Route path="add-student" element={<Navigate to="/admin/students?action=add" replace />} />
              <Route path="edit-student" element={<Navigate to="/admin/students" replace />} />
              <Route path="student-profile" element={<AdminStudentProfileRedirect />} />
              <Route path="student-history" element={<AdminStudentProfileRedirect />} />
              <Route path="applications" element={<Navigate to="/admin/admissions" replace />} />

              <Route path="finance/fees-billing" element={<Navigate to="/admin/finance?tab=billing" replace />} />
              <Route path="finance/invoices" element={<Navigate to="/admin/finance?tab=billing" replace />} />
              <Route path="finance/receipts" element={<Navigate to="/admin/finance?tab=billing" replace />} />
              <Route path="finance/student-ledgers" element={<Navigate to="/admin/finance?tab=billing" replace />} />
              <Route path="finance/groceries" element={<Navigate to="/admin/finance?tab=wallets" replace />} />
              <Route path="fees" element={<Navigate to="/admin/finance?tab=overview" replace />} />
              <Route path="fee-groups" element={<Navigate to="/admin/finance?tab=overview" replace />} />
              <Route path="payment-methods" element={<Navigate to="/admin/finance?tab=overview" replace />} />
              <Route path="revenue-allocation" element={<Navigate to="/admin/finance?tab=overview" replace />} />
              <Route path="payment-plans" element={<Navigate to="/admin/finance?tab=payment-plans" replace />} />
              <Route path="fees-management/billing" element={<Navigate to="/admin/finance?tab=billing" replace />} />
              <Route path="fees-management/invoices" element={<Navigate to="/admin/finance?tab=billing" replace />} />
              <Route path="fees-management/bulk-invoices" element={<Navigate to="/admin/finance?tab=billing" replace />} />
              <Route path="fees-management/payment-history" element={<Navigate to="/admin/finance?tab=billing" replace />} />
              <Route path="fees-management/ledgers" element={<Navigate to="/admin/finance?tab=billing" replace />} />
              <Route path="fees-management/groceries" element={<Navigate to="/admin/finance?tab=wallets" replace />} />
              <Route path="fees-management/reminder-logs" element={<Navigate to="/admin/finance?tab=billing" replace />} />
              <Route path="grocery-store" element={<Navigate to="/admin/finance?tab=wallets" replace />} />
              <Route path="dining-hall" element={<Navigate to="/admin/finance?tab=wallets" replace />} />

              <Route path="subjects" element={<Navigate to="/admin/academics/setup?tab=subjects" replace />} />
              <Route path="classes" element={<Navigate to="/admin/academics/setup?tab=classes" replace />} />
              <Route path="class-migration" element={<Navigate to="/admin/academics/setup?tab=classes" replace />} />
              <Route path="syllabus" element={<Navigate to="/admin/academics/setup?tab=subjects" replace />} />
              <Route path="lesson-plan" element={<Navigate to="/admin/academics/setup?tab=subjects" replace />} />
              <Route path="assessments/grading" element={<Navigate to="/admin/academics/setup?tab=grading" replace />} />
              <Route path="assessments/marks-entry" element={<Navigate to="/admin/academics/marks?tab=marks" replace />} />
              <Route path="reports" element={<AnalyticsEnginesPage />} />
              <Route path="reports/analytics" element={<AnalyticsEnginesPage />} />
              <Route path="reports/academics" element={<Navigate to="/admin/academics/marks?tab=reports" replace />} />
              <Route path="admin-reports" element={<AnalyticsEnginesPage />} />

              <Route path="timetable" element={<Navigate to="/admin/academics/timetable?tab=schedule" replace />} />
              <Route path="calendar" element={<Navigate to="/admin/academics/timetable?tab=calendar" replace />} />

              <Route path="hr/attendance" element={<Navigate to="/admin/attendance/staff" replace />} />
              <Route path="clock-in-logs" element={<Navigate to="/admin/attendance/staff?tab=raw-logs" replace />} />

              <Route path="clinic/dashboard" element={<Navigate to="/admin/clinic" replace />} />
              <Route path="clinic/patients" element={<Navigate to="/admin/clinic?tab=visits" replace />} />
              <Route path="clinic/triage" element={<Navigate to="/admin/clinic?tab=visits" replace />} />
              <Route path="clinic/hospitalization" element={<Navigate to="/admin/clinic?tab=visits" replace />} />
              <Route path="clinic/pharmacy" element={<Navigate to="/admin/clinic?tab=inventory" replace />} />
              <Route path="clinic/reports" element={<Navigate to="/admin/clinic?tab=reports" replace />} />
              <Route path="clinic/appointments" element={<Navigate to="/admin/clinic?tab=visits" replace />} />
              <Route path="clinic/complaints" element={<Navigate to="/admin/clinic?tab=visits" replace />} />
              <Route path="clinic/emergencies" element={<Navigate to="/admin/clinic?tab=visits" replace />} />
              <Route path="clinic/referrals" element={<Navigate to="/admin/clinic?tab=visits" replace />} />
              <Route path="clinic/immunization" element={<Navigate to="/admin/clinic?tab=visits" replace />} />
              <Route path="clinic/immunizations" element={<Navigate to="/admin/clinic?tab=visits" replace />} />
              <Route path="clinic/icd10" element={<Navigate to="/admin/clinic?tab=visits" replace />} />
              <Route path="clinic/billing" element={<Navigate to="/admin/clinic?tab=inventory" replace />} />

              <Route path="prefects" element={<Navigate to="/admin/discipline?tab=conduct" replace />} />
              <Route path="awards" element={<Navigate to="/admin/discipline?tab=awards" replace />} />
              <Route path="hr/awards" element={<Navigate to="/admin/discipline?tab=awards" replace />} />

              <Route path="transportation/routes" element={<Navigate to="/admin/transport?tab=routes" replace />} />
              <Route path="transportation/vehicles" element={<Navigate to="/admin/transport?tab=buses" replace />} />
              <Route path="transportation/assignments" element={<Navigate to="/admin/transport?tab=fees" replace />} />
              <Route path="transport-tracking" element={<Navigate to="/admin/transport?tab=map" replace />} />

              <Route path="accounts/uniforms" element={<Navigate to="/admin/uniforms?category=uniforms" replace />} />
              <Route path="bookstore" element={<Navigate to="/admin/uniforms?category=bookstore" replace />} />
              <Route path="library" element={<Navigate to="/admin/uniforms?category=library" replace />} />
              <Route path="library/*" element={<Navigate to="/admin/uniforms?category=library" replace />} />

              <Route path="messages" element={<Navigate to="/admin/communication?tab=messages" replace />} />
              <Route path="announcements" element={<Navigate to="/admin/communication?tab=announcements" replace />} />
              <Route path="approvals" element={<Navigate to="/admin/communication?tab=approvals" replace />} />

              <Route path="users" element={<Navigate to="/admin/staff" replace />} />
              <Route path="roles" element={<Navigate to="/admin/system" replace />} />
              <Route path="bursars" element={<Navigate to="/admin/staff?role=BURSAR" replace />} />
              <Route path="librarians" element={<Navigate to="/admin/staff?role=LIBRARIAN" replace />} />
              <Route path="ancillary" element={<Navigate to="/admin/staff?role=ANCILLARY" replace />} />
              <Route path="staff-admins" element={<Navigate to="/admin/staff?role=SCHOOL_ADMIN" replace />} />
              <Route path="parents" element={<Navigate to="/admin/system?role=PARENT" replace />} />
              <Route path="alumni" element={<Navigate to="/admin/system?role=ALUMNI" replace />} />
              <Route path="accounts/gl" element={<Navigate to="/bursar/accounts/gl" replace />} />
              <Route path="accounts/financial-reports" element={<Navigate to="/bursar/accounts/financial-reports" replace />} />
              <Route path="accounts/coa" element={<Navigate to="/bursar/accounts/coa" replace />} />
              <Route path="budgets" element={<Navigate to="/bursar/budgets" replace />} />
              <Route path="fiscal" element={<Navigate to="/bursar/fiscal" replace />} />
              <Route path="fiscal/*" element={<Navigate to="/bursar/fiscal" replace />} />
              <Route path="zimra/returns" element={<Navigate to="/bursar/zimra/returns" replace />} />
              <Route path="house" element={<Navigate to="/admin/boarding" replace />} />
            </Route>

            {/* BURSAR PORTAL  */}
            <Route path="/bursar/login" element={
              <PortalLoginPage portalName="Bursar Portal" portalIcon="fas fa-money-check-alt"
                roleBadge="Bursar" allowedRole="BURSAR" dashboardPath="/bursar/dashboard"
                registrationPath="/register/bursar" />
            } />
            <Route path="/bursar" element={
              <ProtectedRoute allowedRoles={['BURSAR', 'SCHOOL_ADMIN', 'SUPER_ADMIN', 'FINANCE']} loginPath="/bursar/login">
                <BursarLayout />
              </ProtectedRoute>
            }>
              <Route index element={<BursarDashboard />} />
              <Route path="dashboard" element={<BursarDashboard />} />
              <Route path="assets" element={<AdminAssetManagement />} />
              <Route path="fees" element={<BursarFeesUnified />} />
              <Route path="payments" element={<PaymentHistoryPage />} />
              <Route path="expenses" element={<ExpensesPage />} />
              <Route path="reconcile" element={<BursarFinancialReconciliation />} />
              <Route path="accounts">
                <Route path="coa" element={<ChartOfAccountsPage />} />
                <Route path="gl" element={<GeneralLedgerPage />} />
                <Route path="financial-reports" element={<FinancialReportsPage />} />
                <Route path="bank-reconciliation" element={<BankReconciliationPage />} />
                <Route path="liabilities" element={<LiabilitiesPage />} />
                <Route path="income" element={<IncomePage />} />
                <Route path="expenses" element={<ExpensesPage />} />
                <Route path="uniforms" element={<UniformsPage />} />
              </Route>
              <Route path="budgets" element={<BudgetsPage />} />
              <Route path="fiscal" element={<FiscalManagementPage />} />
              <Route path="fiscal/*" element={<FiscalManagementPage />} />
              <Route path="zimra/returns" element={<ZimraReturnsPage />} />
              <Route path="tuckshop/cashup" element={<Navigate to="/bursar/tuckshop?tab=cashup" replace />} />
              <Route path="reports/till-variance" element={<Navigate to="/bursar/tuckshop?tab=cashup" replace />} />
              <Route path="payroll">
                <Route index element={<PayrollList />} />
                <Route path="run" element={<BursarPayrollRun />} />
                <Route path="settings" element={<PayrollSettingsPage />} />
                <Route path="employees" element={<EmployeeManagementPage />} />
              </Route>
              <Route path="tuckshop" element={<BursarTuckshopUnified />} />
              <Route path="tuckshop/pos" element={<FastPOSTerminal />} />
              <Route path="tuckshop/inventory" element={<Navigate to="/bursar/tuckshop?tab=inventory" replace />} />
              <Route path="tuckshop/sales" element={<Navigate to="/bursar/tuckshop?tab=sales" replace />} />
              <Route path="tuckshop/reports" element={<Navigate to="/bursar/tuckshop?tab=reports" replace />} />

              {/* Backward-Compatible Fees Management Redirects */}
              <Route path="fees-management/groups" element={<Navigate to="/bursar/fees?tab=billing" replace />} />
              <Route path="fees-management/billing" element={<Navigate to="/bursar/fees?tab=billing" replace />} />
              <Route path="fees-management/invoices" element={<Navigate to="/bursar/fees?tab=invoices" replace />} />
              <Route path="fees-management/payment-history" element={<Navigate to="/bursar/payments" replace />} />
              <Route path="fees-management/ledgers" element={<Navigate to="/bursar/fees?tab=ledgers" replace />} />
              <Route path="fees-management/groceries" element={<Navigate to="/bursar/tuckshop?tab=inventory" replace />} />
              <Route path="fees-management/bulk-invoices" element={<Navigate to="/bursar/fees?tab=bulk-invoices" replace />} />
              <Route path="fees-management/reminder-logs" element={<Navigate to="/bursar/fees?tab=invoices" replace />} />
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
                <Route index element={<AnalyticsEnginesPage />} />
                <Route path="analytics" element={<AnalyticsEnginesPage />} />
                <Route path="financial" element={<FinancialReportsPage />} />
                <Route path="wizard" element={<ReportsDashboardPage />} />
                <Route path="view/:type" element={<ReportViewerPage />} />
              </Route>

              <Route path="website-settings" element={<SettingsPage defaultTab="banner" />} />
              <Route path="settings" element={<PersonalPreferences />} />
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
              <Route path="transportation/routes" element={<Navigate to="/admin/transport?tab=routes" replace />} />
              <Route path="transportation/vehicles" element={<Navigate to="/admin/transport?tab=buses" replace />} />
              <Route path="transportation/assignments" element={<Navigate to="/admin/transport?tab=fees" replace />} />
              <Route path="support" element={<ITSupportPage />} />
              <Route path="procurement" element={<BursarProcurement />} />
              <Route path="class-migration" element={<AdminClassMigration />} />
              <Route path="payment-plans" element={<ManagePaymentPlans />} />
              <Route path="students" element={<AdminStudents />} />
              <Route path="leave" element={<MyLeave />} />
              <Route path="awards" element={<MyAwards />} />
              <Route path="messages" element={<MessagesPage />} />
              {/* LIBRARY FINANCIAL MODULE ACCESS FOR BURSAR */}
              <Route path="library">
                <Route index element={<LibraryReports />} />
                <Route path="reports" element={<LibraryReports />} />
                <Route path="overdue" element={<LibraryOverdue />} />
                <Route path="books" element={<LibraryBooks />} />
              </Route>
            </Route>

            {/* LIBRARIAN PORTAL  */}
            <Route path="/librarian/login" element={
              <PortalLoginPage portalName="Librarian Portal" portalIcon="fas fa-book"
                roleBadge="Librarian" allowedRole="LIBRARIAN" dashboardPath="/librarian/dashboard"
                registrationPath="/register/librarian" />
            } />
            <Route path="/librarian" element={
              <ProtectedRoute allowedRoles={['LIBRARIAN', 'SCHOOL_ADMIN', 'SUPER_ADMIN', 'ANCILLARY']} loginPath="/librarian/login">
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
              <Route path="reservations" element={<LibraryRequests />} />
              <Route path="requests" element={<LibraryRequests />} />
              <Route path="assets" element={<AdminAssetManagement />} />
              <Route path="procurement" element={<AncillaryProcurement />} />
              <Route path="messages" element={<MessagesPage />} />
              <Route path="settings" element={<PersonalPreferences />} />
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
              <Route path="settings" element={<PersonalPreferences />} />
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
              <Route path="support" element={<ITSupportPage />} />
              <Route path="website-settings" element={<SettingsPage defaultTab="banner" />} />
              <Route path="settings" element={<PersonalPreferences />} />
              <Route path="assets" element={<AncillaryAssets />} />
              <Route path="procurement" element={<AncillaryProcurement />} />
              <Route path="directory" element={<AncillaryDirectory />} />
              <Route path="schedules" element={<AncillarySchedules />} />
              <Route path="boarding" element={<BoardingManagement />} />
              <Route path="boarding/hostel-category" element={<HostelCategory />} />
              <Route path="boarding/hostel-room" element={<HostelRoom />} />
              <Route path="boarding/manage-hostel" element={<ManageHostel />} />
              <Route path="boarding/assign-students" element={<AssignStudents />} />
              <Route path="security" element={<SecurityLog />} />
              <Route path="kitchen" element={<KitchenManagement />} />
              <Route path="tuckshop" element={<Navigate to="/bursar/tuckshop" replace />} />
              <Route path="tuckshop/*" element={<Navigate to="/bursar/tuckshop" replace />} />
              <Route path="transportation/routes" element={<Navigate to="/admin/transport?tab=routes" replace />} />
              <Route path="transportation/vehicles" element={<Navigate to="/admin/transport?tab=buses" replace />} />
              <Route path="transportation/assignments" element={<Navigate to="/admin/transport?tab=fees" replace />} />
              <Route path="house" element={<HouseDashboard />} />
              <Route path="farm" element={<FarmManagement />} />
              <Route path="dining-hall" element={<DHRepresentative />} />
              <Route path="sports" element={<SportsManagement />} />
              <Route path="leave" element={<LeaveManagement />} />
              <Route path="hr-services" element={<AncillaryHRServices />} />
              <Route path="hr" element={<AncillaryHRServices />} />
              <Route path="awards" element={<MyAwards />} />
              <Route path="give-award" element={<GiveStudentAward />} />
              <Route path="messages" element={<MessagesPage />} />
              <Route path="profile" element={<ProfilePage />} />
              <Route path="payslips" element={<MyPaymentSlip />} />
              {/* LIBRARY MODULE ACCESS FOR ANCILLARY */}
              <Route path="library">
                <Route index element={<LibraryDashboard />} />
                <Route path="dashboard" element={<LibraryDashboard />} />
                <Route path="books" element={<LibraryBooks />} />
                <Route path="categories" element={<LibraryResourceCategories />} />
                <Route path="digital" element={<LibraryDigitalRepository />} />
                <Route path="loans" element={<LibraryLoans />} />
                <Route path="overdue" element={<LibraryOverdue />} />
                <Route path="reports" element={<LibraryReports />} />
                <Route path="reservations" element={<LibraryRequests />} />
                <Route path="requests" element={<LibraryRequests />} />
                <Route path="assets" element={<AdminAssetManagement />} />
              </Route>
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
              <Route path="profile" element={<ProfilePage />} />
              <Route path="academics" element={<ParentAcademics />} />
              <Route path="attendance" element={<AttendanceHistory />} />
              <Route path="timetable" element={<StudentTimetable />} />
              <Route path="calendar" element={<ParentCalendar />} />
              <Route path="fees" element={<ParentFees />} />
              <Route path="payment-plans" element={<Navigate to="/parent/fees?tab=payment-plan" replace />} />
              <Route path="wallet" element={<ParentWallet />} />
              <Route path="uniforms" element={<ParentUniforms />} />
              <Route path="transport" element={<ParentTransport />} />
              <Route path="messages" element={<MessagesPage />} />
              <Route path="notices" element={<ParentNotices />} />
              <Route path="approvals" element={<ParentApprovals />} />
              <Route path="clinic" element={<ParentClinic />} />
              <Route path="settings" element={<PersonalPreferences />} />
              <Route path="support" element={<ITSupportPage />} />

              {/* Backward-Compatible Redirects for Consolidated Pages */}
              <Route path="reports" element={<Navigate to="/parent/academics?tab=report-cards" replace />} />
              <Route path="academic-details" element={<Navigate to="/parent/academics?tab=subject-breakdown" replace />} />
              <Route path="history" element={<Navigate to="/parent/academics?tab=history" replace />} />
              <Route path="portfolio" element={<Navigate to="/parent/academics?tab=subject-breakdown" replace />} />
              <Route path="wellbeing" element={<Navigate to="/parent/clinic?tab=wellbeing" replace />} />
              <Route path="clinic/complaints" element={<Navigate to="/parent/clinic?tab=visits" replace />} />
              <Route path="clinic/appointments" element={<Navigate to="/parent/clinic?tab=visits" replace />} />
              <Route path="clinic/emergencies" element={<Navigate to="/parent/clinic?tab=visits" replace />} />
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
              <Route index element={<ClinicDashboardPage />} />
              <Route path="dashboard" element={<ClinicDashboardPage />} />
              <Route path="triage" element={<ClinicTriagePage />} />
              <Route path="consultations" element={<ClinicConsultationsPage />} />
              <Route path="hospitalization" element={<ClinicHospitalizationPage />} />
              <Route path="pharmacy" element={<ClinicPharmacyPage />} />
              <Route path="wellness" element={<ClinicWellnessPage />} />
              <Route path="emergency" element={<ClinicEmergencyPage />} />
              <Route path="reports" element={<ClinicReportsUnifiedPage />} />

              {/* Backward-Compatible Redirects */}
              <Route path="emergencies" element={<Navigate to="/clinic/emergency?tab=emergency-log" replace />} />
              <Route path="referrals" element={<Navigate to="/clinic/emergency?tab=referrals" replace />} />
              <Route path="appointments" element={<Navigate to="/clinic/wellness?tab=appointments" replace />} />
              <Route path="immunization" element={<Navigate to="/clinic/wellness?tab=vaccines" replace />} />
              <Route path="immunizations" element={<Navigate to="/clinic/wellness?tab=vaccines" replace />} />
              <Route path="icd10" element={<Navigate to="/clinic/consultations?tab=icd10" replace />} />
              <Route path="billing" element={<Navigate to="/clinic/reports?tab=billing" replace />} />
              <Route path="patients" element={<Navigate to="/clinic/reports?tab=patients" replace />} />
              <Route path="patient-history" element={<Navigate to="/clinic/reports?tab=patients" replace />} />
              <Route path="complaints" element={<Navigate to="/clinic/triage" replace />} />
              <Route path="hospitalizations" element={<Navigate to="/clinic/hospitalization" replace />} />
              <Route path="hospitalizations/:id" element={<Navigate to="/clinic/hospitalization" replace />} />

              {/* Shared operational / utility routes */}
              <Route path="messages" element={<MessagesPage />} />
              <Route path="profile" element={<ProfilePage />} />
              <Route path="support" element={<ITSupportPage />} />
              <Route path="assets" element={<AdminAssetManagement />} />
              <Route path="settings" element={<PersonalPreferences />} />
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
              <Route path="faq" element={<ApplicantFAQPage />} />
              <Route path="settings" element={<PersonalPreferences />} />
              <Route path="support" element={<ITSupportPage />} />
            </Route>

            {/* Legal & Compliance Pages */}
            <Route path="/privacy-policy" element={<PrivacyPolicyPage />} />
            <Route path="/terms" element={<TermsPage />} />
            <Route path="/404" element={<NotFoundPage />} />

            {/*  ACADEX PLATFORM PORTAL */}
            <Route path="/acadex/login" element={
              <PortalLoginPage portalName="Acadex Platform" portalIcon="fas fa-shield-alt"
                roleBadge="Platform Admin" allowedRole="SUPER_ADMIN" dashboardPath="/acadex/dashboard" />
            } />
            <Route path="/acadex" element={<AcadexLayout />}>
              <Route index element={<AcadexDashboard />} />
              <Route path="dashboard" element={<AcadexDashboard />} />
              <Route path="schools" element={<AcadexSchools />} />
              <Route path="schools/:schoolId" element={<AcadexSchoolDetails />} />
              <Route path="provision" element={<AcadexProvisioning />} />
              <Route path="plans" element={<AcadexPlans />} />
              <Route path="revenue" element={<GlobalRevenue />} />
              <Route path="logs" element={<PlatformLogs />} />
              <Route path="settings" element={<PlatformSettings />} />
              <Route path="profile" element={<ProfilePage />} />
              <Route path="support" element={<ITSupportPage />} />
            </Route>

            {/* Catch-all 404 Route */}
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </BrowserRouter>
        </SetupProvider>
      </ToastProvider>
    </AuthProvider>
  );
}
