import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import helmet from 'helmet';
import path from 'path';
import authRoutes from './api/auth';
import classRoutes from './api/classes';
import timetableRoutes from './api/timetable';
import schoolRoutes from './api/schools';
import contentRoutes from './api/content';
import chatRoutes from './api/chat';
import userRoutes from './api/users';
import teacherRoutes from './api/teachers';
import studentRoutes from './api/students';
import applicationRoutes from './api/applications';
import dashboardRoutes from './api/dashboard';
import supportRoutes from './api/support';
import webhooksRoutes from './api/webhooks';
import assetRoutes from './api/assets';
import reportRoutes from './api/reports';
import procurementRoutes from './api/procurement';
import auditRoutes from './api/audit';
import publicRoutes from './api/public';
import departmentRoutes from './api/departments';
import ancillaryRoutes from './api/ancillary';
import libraryRoutes from './api/library';
import transfersRoutes from './api/transfers';
import transportRoutes from './api/transport-routes';
import vehiclesRoutes from './api/vehicles';
import transportsRoutes from './api/transports';
import feesRoutes from './api/fees';
import gradeRoutes from './api/grades';
import supervisorRoutes from './api/supervisors';
import extensionRoutes from './api/extensions';
import storageRoutes from './api/storage';
import financeRoutes from './api/finance';
import payrollRoutes from './api/payroll';
import accountsRoutes from './api/accounts';
import uniformsRoutes from './api/uniforms';
import inventoryRoutes from './api/inventory';
import reportDataRoutes from './api/report-data';
import subjectRoutes from './api/subjects';
import academicToolsRouter from './api/academic-tools';
import gradingRouter from './api/grading';
import cbtRoutes from './api/cbt';
import syllabusRoutes from './api/syllabus';
import lessonPlanRoutes from './api/lesson-plan';
import staffAttendanceRoutes from './api/staff-attendance';
import attendanceRoutes from './api/attendance';
import liveClassRoutes from './api/live-class';
import leaveRoutes from './api/leave';
import awardsRoutes from './api/awards';
import chaplaincyRoutes from './api/chaplaincy';
import coursesRoutes from './api/courses';
import studyMaterialRoutes from './api/study-materials';
import payslipRoutes from './api/payslips';
import messagesRoutes from './api/messages';
import meetingMinutesRoutes from './api/meeting-minutes';
import receptionRoutes from './api/reception';
import websiteSettingsRoutes from './api/website-settings';
import websiteSettingsInquiriesRoutes from './api/website-settings-inquiries';
import websiteSettingsNewsRoutes from './api/website-settings-news';
import websiteSettingsGalleriesRoutes from './api/website-settings-galleries';
import websiteSettingsNoticeboardRoutes from './api/website-settings-noticeboard';
import hrVacanciesRoutes from './api/hr-vacancies';
import hrApplicationsRoutes from './api/hr-applications';
import paymentPlanRoutes from './api/payment-plans';
import fundingRoutes from './api/funding';
import clinicRoutes from './api/clinic';
import farmRoutes from './api/farm';
import diningHallRoutes from './api/dining-hall';
import prefectsRoutes from './api/prefects';
import schedulesRoutes from './api/schedules';
import tuckshopRoutes from './api/tuckshop';
import walletRoutes from './api/wallets';

const app = express();
const port = process.env.PORT || 5000;
// Middleware
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));
// Secure CORS policy
const allowedOrigins = process.env.FRONTEND_URL 
  ? [process.env.FRONTEND_URL] 
  : ['http://localhost:3000', 'http://localhost:5173'];

app.use(cors({
  origin: function(origin, callback) {
    if (!origin || allowedOrigins.indexOf(origin) !== -1 || process.env.NODE_ENV === 'development') {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
}));
app.use(express.json({ limit: '50mb' }));
app.use(morgan('dev'));
app.use(express.static(path.join(__dirname, '../storage')));
// Security: Rate Limiting
// Apply global rate limiter to all requests
import { globalLimiter, authLimiter } from './middleware/rate-limit';
import { auditMiddleware } from './middleware/audit';
import { notificationWorker } from './jobs/notification-worker';
notificationWorker.start();
app.use(globalLimiter);
app.use(auditMiddleware);
// Routes
app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/schools', schoolRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/content', contentRoutes);
app.use('/api/subjects', subjectRoutes);
app.use('/api/classes', classRoutes);
app.use('/api/timetable', timetableRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/users', userRoutes);
app.use('/api/teachers', teacherRoutes);
app.use('/api/students', studentRoutes);
app.use('/api/applications', applicationRoutes);
app.use('/api/support', supportRoutes);
app.use('/api/webhooks', webhooksRoutes);
app.use('/api/assets', assetRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/procurement', procurementRoutes);
app.use('/api/audit', auditRoutes);
app.use('/api/departments', departmentRoutes);
app.use('/api/ancillary', ancillaryRoutes);
app.use('/api/library', libraryRoutes);
app.use('/api/transfers', transfersRoutes);
app.use('/api/transport-routes', transportRoutes);
app.use('/api/vehicles', vehiclesRoutes);
app.use('/api/transports', transportsRoutes);
app.use('/api/fees', feesRoutes);
app.use('/api/grades', gradeRoutes);
app.use('/api/supervisors', supervisorRoutes);
app.use('/api/extensions', extensionRoutes);
app.use('/api/storage', storageRoutes);
app.use('/api/finance', financeRoutes);
app.use('/api/payroll', payrollRoutes);
app.use('/api/accounts', accountsRoutes);
app.use('/api/uniforms', uniformsRoutes);
app.use('/api/inventory', inventoryRoutes);
app.use('/api/report-data', reportDataRoutes);
app.use('/api/academic-tools', academicToolsRouter);
app.use('/api/grading', gradingRouter);
app.use('/api/cbt', cbtRoutes);
app.use('/api/syllabus', syllabusRoutes);
app.use('/api/lesson-plan', lessonPlanRoutes);
app.use('/api/staff-attendance', staffAttendanceRoutes);
app.use('/api/clinic', clinicRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/live-class', liveClassRoutes);
app.use('/api/leave', leaveRoutes);
app.use('/api/awards', awardsRoutes);
app.use('/api/chaplaincy', chaplaincyRoutes);
app.use('/api/courses', coursesRoutes);
app.use('/api/study-materials', studyMaterialRoutes);
app.use('/api/payslips', payslipRoutes);
app.use('/api/reception', receptionRoutes);
app.use('/api/website-settings', websiteSettingsRoutes);
app.use('/api/website-settings/inquiries', websiteSettingsInquiriesRoutes);
app.use('/api/website-settings/news', websiteSettingsNewsRoutes);
app.use('/api/website-settings/galleries', websiteSettingsGalleriesRoutes);
app.use('/api/website-settings/noticeboard', websiteSettingsNoticeboardRoutes);
app.use('/api/hr/vacancies', hrVacanciesRoutes);
app.use('/api/hr/applications', hrApplicationsRoutes);
app.use('/api/payment-plans', paymentPlanRoutes);
app.use('/api/funding', fundingRoutes);
app.use('/api/messages', messagesRoutes);
app.use('/api/meeting-minutes', meetingMinutesRoutes);
app.use('/api/farm', farmRoutes);
app.use('/api/dining-hall', diningHallRoutes);
app.use('/api/prefects', prefectsRoutes);
app.use('/api/schedules', schedulesRoutes);
app.use('/api/tuckshop', tuckshopRoutes);
app.use('/api/wallets', walletRoutes);
app.use('/public', publicRoutes);
app.use('/api/public', publicRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.status(200).send('OK');
});

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
