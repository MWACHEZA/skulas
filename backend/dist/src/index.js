"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const morgan_1 = __importDefault(require("morgan"));
const helmet_1 = __importDefault(require("helmet"));
const path_1 = __importDefault(require("path"));
const auth_1 = __importDefault(require("./api/auth"));
const classes_1 = __importDefault(require("./api/classes"));
const timetable_1 = __importDefault(require("./api/timetable"));
const schools_1 = __importDefault(require("./api/schools"));
const content_1 = __importDefault(require("./api/content"));
const chat_1 = __importDefault(require("./api/chat"));
const users_1 = __importDefault(require("./api/users"));
const teachers_1 = __importDefault(require("./api/teachers"));
const students_1 = __importDefault(require("./api/students"));
const applications_1 = __importDefault(require("./api/applications"));
const dashboard_1 = __importDefault(require("./api/dashboard"));
const support_1 = __importDefault(require("./api/support"));
const webhooks_1 = __importDefault(require("./api/webhooks"));
const assets_1 = __importDefault(require("./api/assets"));
const reports_1 = __importDefault(require("./api/reports"));
const procurement_1 = __importDefault(require("./api/procurement"));
const audit_1 = __importDefault(require("./api/audit"));
const public_1 = __importDefault(require("./api/public"));
const departments_1 = __importDefault(require("./api/departments"));
const ancillary_1 = __importDefault(require("./api/ancillary"));
const library_1 = __importDefault(require("./api/library"));
const transfers_1 = __importDefault(require("./api/transfers"));
const transport_routes_1 = __importDefault(require("./api/transport-routes"));
const vehicles_1 = __importDefault(require("./api/vehicles"));
const transports_1 = __importDefault(require("./api/transports"));
const fees_1 = __importDefault(require("./api/fees"));
const grades_1 = __importDefault(require("./api/grades"));
const supervisors_1 = __importDefault(require("./api/supervisors"));
const extensions_1 = __importDefault(require("./api/extensions"));
const storage_1 = __importDefault(require("./api/storage"));
const finance_1 = __importDefault(require("./api/finance"));
const payroll_1 = __importDefault(require("./api/payroll"));
const accounts_1 = __importDefault(require("./api/accounts"));
const uniforms_1 = __importDefault(require("./api/uniforms"));
const inventory_1 = __importDefault(require("./api/inventory"));
const report_data_1 = __importDefault(require("./api/report-data"));
const subjects_1 = __importDefault(require("./api/subjects"));
const academic_tools_1 = __importDefault(require("./api/academic-tools"));
const grading_1 = __importDefault(require("./api/grading"));
const cbt_1 = __importDefault(require("./api/cbt"));
const syllabus_1 = __importDefault(require("./api/syllabus"));
const lesson_plan_1 = __importDefault(require("./api/lesson-plan"));
const staff_attendance_1 = __importDefault(require("./api/staff-attendance"));
const attendance_1 = __importDefault(require("./api/attendance"));
const live_class_1 = __importDefault(require("./api/live-class"));
const leave_1 = __importDefault(require("./api/leave"));
const awards_1 = __importDefault(require("./api/awards"));
const chaplaincy_1 = __importDefault(require("./api/chaplaincy"));
const courses_1 = __importDefault(require("./api/courses"));
const study_materials_1 = __importDefault(require("./api/study-materials"));
const payslips_1 = __importDefault(require("./api/payslips"));
const messages_1 = __importDefault(require("./api/messages"));
const meeting_minutes_1 = __importDefault(require("./api/meeting-minutes"));
const reception_1 = __importDefault(require("./api/reception"));
const website_settings_1 = __importDefault(require("./api/website-settings"));
const website_settings_inquiries_1 = __importDefault(require("./api/website-settings-inquiries"));
const website_settings_news_1 = __importDefault(require("./api/website-settings-news"));
const website_settings_galleries_1 = __importDefault(require("./api/website-settings-galleries"));
const website_settings_noticeboard_1 = __importDefault(require("./api/website-settings-noticeboard"));
const hr_vacancies_1 = __importDefault(require("./api/hr-vacancies"));
const hr_applications_1 = __importDefault(require("./api/hr-applications"));
const payment_plans_1 = __importDefault(require("./api/payment-plans"));
const funding_1 = __importDefault(require("./api/funding"));
const clinic_1 = __importDefault(require("./api/clinic"));
const farm_1 = __importDefault(require("./api/farm"));
const dining_hall_1 = __importDefault(require("./api/dining-hall"));
const prefects_1 = __importDefault(require("./api/prefects"));
const schedules_1 = __importDefault(require("./api/schedules"));
const tuckshop_1 = __importDefault(require("./api/tuckshop"));
const wallets_1 = __importDefault(require("./api/wallets"));
const app = (0, express_1.default)();
const port = process.env.PORT || 5000;
// Middleware
app.use((0, helmet_1.default)({
    crossOriginResourcePolicy: { policy: "cross-origin" }
}));
// Secure CORS policy
const allowedOrigins = process.env.FRONTEND_URL
    ? [process.env.FRONTEND_URL]
    : ['http://localhost:3000', 'http://localhost:5173'];
app.use((0, cors_1.default)({
    origin: function (origin, callback) {
        if (!origin || allowedOrigins.indexOf(origin) !== -1 || process.env.NODE_ENV === 'development') {
            callback(null, true);
        }
        else {
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true
}));
app.use(express_1.default.json({ limit: '50mb' }));
app.use((0, morgan_1.default)('dev'));
app.use(express_1.default.static(path_1.default.join(__dirname, '../storage')));
// Security: Rate Limiting
// Apply global rate limiter to all requests
const rate_limit_1 = require("./middleware/rate-limit");
const audit_2 = require("./middleware/audit");
const notification_worker_1 = require("./jobs/notification-worker");
notification_worker_1.notificationWorker.start();
app.use(rate_limit_1.globalLimiter);
app.use(audit_2.auditMiddleware);
// Routes
app.use('/api/auth', rate_limit_1.authLimiter, auth_1.default);
app.use('/api/schools', schools_1.default);
app.use('/api/dashboard', dashboard_1.default);
app.use('/api/content', content_1.default);
app.use('/api/subjects', subjects_1.default);
app.use('/api/classes', classes_1.default);
app.use('/api/timetable', timetable_1.default);
app.use('/api/chat', chat_1.default);
app.use('/api/users', users_1.default);
app.use('/api/teachers', teachers_1.default);
app.use('/api/students', students_1.default);
app.use('/api/applications', applications_1.default);
app.use('/api/support', support_1.default);
app.use('/api/webhooks', webhooks_1.default);
app.use('/api/assets', assets_1.default);
app.use('/api/reports', reports_1.default);
app.use('/api/procurement', procurement_1.default);
app.use('/api/audit', audit_1.default);
app.use('/api/departments', departments_1.default);
app.use('/api/ancillary', ancillary_1.default);
app.use('/api/library', library_1.default);
app.use('/api/transfers', transfers_1.default);
app.use('/api/transport-routes', transport_routes_1.default);
app.use('/api/vehicles', vehicles_1.default);
app.use('/api/transports', transports_1.default);
app.use('/api/fees', fees_1.default);
app.use('/api/grades', grades_1.default);
app.use('/api/supervisors', supervisors_1.default);
app.use('/api/extensions', extensions_1.default);
app.use('/api/storage', storage_1.default);
app.use('/api/finance', finance_1.default);
app.use('/api/payroll', payroll_1.default);
app.use('/api/accounts', accounts_1.default);
app.use('/api/uniforms', uniforms_1.default);
app.use('/api/inventory', inventory_1.default);
app.use('/api/report-data', report_data_1.default);
app.use('/api/academic-tools', academic_tools_1.default);
app.use('/api/grading', grading_1.default);
app.use('/api/cbt', cbt_1.default);
app.use('/api/syllabus', syllabus_1.default);
app.use('/api/lesson-plan', lesson_plan_1.default);
app.use('/api/staff-attendance', staff_attendance_1.default);
app.use('/api/clinic', clinic_1.default);
app.use('/api/attendance', attendance_1.default);
app.use('/api/live-class', live_class_1.default);
app.use('/api/leave', leave_1.default);
app.use('/api/awards', awards_1.default);
app.use('/api/chaplaincy', chaplaincy_1.default);
app.use('/api/courses', courses_1.default);
app.use('/api/study-materials', study_materials_1.default);
app.use('/api/payslips', payslips_1.default);
app.use('/api/reception', reception_1.default);
app.use('/api/website-settings', website_settings_1.default);
app.use('/api/website-settings/inquiries', website_settings_inquiries_1.default);
app.use('/api/website-settings/news', website_settings_news_1.default);
app.use('/api/website-settings/galleries', website_settings_galleries_1.default);
app.use('/api/website-settings/noticeboard', website_settings_noticeboard_1.default);
app.use('/api/hr/vacancies', hr_vacancies_1.default);
app.use('/api/hr/applications', hr_applications_1.default);
app.use('/api/payment-plans', payment_plans_1.default);
app.use('/api/funding', funding_1.default);
app.use('/api/messages', messages_1.default);
app.use('/api/meeting-minutes', meeting_minutes_1.default);
app.use('/api/farm', farm_1.default);
app.use('/api/dining-hall', dining_hall_1.default);
app.use('/api/prefects', prefects_1.default);
app.use('/api/schedules', schedules_1.default);
app.use('/api/tuckshop', tuckshop_1.default);
app.use('/api/wallets', wallets_1.default);
app.use('/public', public_1.default);
app.use('/api/public', public_1.default);
// Health check endpoint
app.get('/api/health', (req, res) => {
    res.status(200).send('OK');
});
app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});
//# sourceMappingURL=index.js.map