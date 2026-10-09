"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.tenantStorage = void 0;
const client_1 = require("../generated/client");
const async_hooks_1 = require("async_hooks");
// Storage for the current institution's context (schoolId)
exports.tenantStorage = new async_hooks_1.AsyncLocalStorage();
const basePrisma = new client_1.PrismaClient();
/**
 * ACADEX Zero-Trust Tenant Extension
 * Automatically injects schoolId filters into all queries for tenant-scoped models.
 */
const prisma = basePrisma.$extends({
    query: {
        $allModels: {
            async $allOperations({ model, operation, args, query }) {
                const context = exports.tenantStorage.getStore();
                // Define which models are school-scoped (tenant-isolated)
                const tenantScopedModels = [
                    'GradingScale', 'HostelCategory', 'HostelRoom', 'UniformItem', 'UniformStockOrder', 'UniformSale',
                    'UniformSupplierPayment', 'AccountCategory', 'Liability', 'Income', 'Expense', 'User',
                    'Teacher', 'Student', 'SchoolClass', 'Section', 'Subject', 'Grade',
                    'Faculty', 'Department', 'Attendance', 'StaffAttendance', 'Fee', 'Assignment',
                    'QuestionPaper', 'TimetableSlot', 'Announcement', 'AuditLog', 'Book', 'StudentHouse',
                    'ChaplaincyEvent', 'Holiday', 'LibraryCategory', 'BookLoan', 'LibrarySetting', 'BookReservation',
                    'LibraryDigitalResource', 'AssignmentSubmission', 'News', 'SchoolSetting', 'PaymentPlan', 'Gallery',
                    'Club', 'Sport', 'SportingEquipment', 'Application', 'SchoolSupplier', 'Tender',
                    'PurchaseOrder', 'Invoice', 'Message', 'SupportTicket', 'StaffLeave', 'Asset',
                    'AssetIncident', 'AssetMaintenance', 'TransportRoute', 'SchoolEvent', 'TuckshopItem', 'TuckshopSale',
                    'DigitalResource', 'Syllabus', 'LessonPlan', 'SalaryStub', 'ShiftAssignment', 'AcademicReport',
                    'ReportTemplate', 'Requisition', 'Hostel', 'BoardingLog', 'VisitorLog', 'AdmissionInquiry',
                    'PhoneCallLog', 'FrontOfficeComplaint', 'SecurityIncident', 'WeeklyMenu', 'SupervisorAssignment', 'ExtensionRequest',
                    'ProgressReport', 'PaymentMethod', 'FeeGroup', 'PhysicalProduct', 'PhysicalProductConsumption', 'FeeReminderLog',
                    'StudentPayment', 'CommunicationLog', 'NotificationQueue', 'RevenueAllocation', 'PayrollAllowance', 'PayrollDeduction',
                    'TaxTable', 'TaxBand', 'EmployeeProfile', 'TermlyComment', 'PayrollRun', 'PayrollEntry',
                    'CBTExam', 'LiveClass', 'Award', 'Course', 'StudyMaterial', 'WebsiteSettings',
                    'WebsiteInquiry', 'Noticeboard', 'Vacancy', 'JobApplication', 'SchoolVehicle', 'SchoolTransport',
                    'MeetingMinutes', 'ProjectFunding', 'ClinicPatient', 'ClinicAppointment', 'ClinicComplaint', 'ClinicEmergency',
                    'ClinicImmunization', 'ClinicReferral', 'ClinicVisit', 'ClinicInventoryItem', 'ClinicDispensingLog', 'ClinicHospitalization',
                    'FarmLivestockBatch', 'FarmCropCycle', 'FarmInventoryItem', 'DiningHallReport', 'PrefectDuty', 'PrefectMeeting',
                    'PrefectReport', 'WalletTransaction', 'SchoolSequence', 'ChartOfAccount', 'JournalEntry', 'JournalEntryLine',
                    'AccountingPeriod', 'UniformStockMovement', 'BankStatement',
                    'LeadershipAssignment', 'StudentAllowedItem',
                    'UniformCategory', 'UniformProduct', 'UniformKit', 'UniformIssuance', 'UniformStockLedger',
                    'AttendanceSession', 'AttendanceSessionRecord', 'StaffAttendanceDaily', 'BiometricRawLog', 'HrTardinessLog'
                ];
                if (context?.schoolId && tenantScopedModels.includes(model)) {
                    // Wrap operations that use 'where'
                    const operationsWithWhere = [
                        'findFirst', 'findMany', 'findUnique', 'update', 'updateMany',
                        'delete', 'deleteMany', 'count', 'aggregate', 'groupBy', 'upsert'
                    ];
                    if (operationsWithWhere.includes(operation)) {
                        const a = args;
                        a.where = {
                            ...a.where,
                            schoolId: context.schoolId
                        };
                    }
                    // Force schoolId on creation
                    if (operation === 'create' || operation === 'upsert') {
                        const a = args;
                        if (operation === 'create') {
                            a.data = { ...a.data, schoolId: context.schoolId };
                        }
                        else {
                            // upsert
                            a.create = { ...a.create, schoolId: context.schoolId };
                            a.update = { ...a.update, schoolId: context.schoolId };
                        }
                    }
                    if (operation === 'createMany' || operation === 'createManyAndReturn') {
                        const a = args;
                        if (Array.isArray(a.data)) {
                            a.data = a.data.map((item) => ({
                                ...item,
                                schoolId: context.schoolId
                            }));
                        }
                    }
                }
                return query(args);
            }
        }
    }
});
exports.default = prisma;
//# sourceMappingURL=prisma.js.map