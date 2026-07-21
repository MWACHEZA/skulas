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
                    'Student', 'Teacher', 'User', 'SchoolClass', 'Subject',
                    'Grade', 'Attendance', 'Fee', 'Assignment', 'AssignmentSubmission',
                    'AcademicReport', 'ApplicantDocument', 'ApplicantTimeline', 'Application',
                    'Asset', 'AssetIncident', 'AssetMaintenance', 'Book', 'BookLoan',
                    'Club', 'Sport', 'Gallery', 'News', 'Announcement', 'Department',
                    'Faculty', 'Requisition', 'PurchaseOrder', 'Invoice', 'Tender', 'TenderBid',
                    'Hostel', 'Room', 'WeeklyMenu', 'BoardingLog', 'VisitorLog', 'SecurityIncident',
                    'SupervisorAssignment', 'ExtensionRequest', 'ProgressReport',
                    'AccountCategory', 'Liability', 'Income', 'Expense',
                    'UniformItem', 'UniformStockOrder', 'UniformStockOrderItem', 'UniformSale', 'UniformSaleItem', 'UniformSupplierPayment',
                    'PhysicalProduct', 'PhysicalProductConsumption', 'FeeReminderLog', 'CommunicationLog',
                    'PayrollRun', 'PayrollEntry', 'StudentPayment', 'FeeGroup', 'RevenueAllocation',
                    'QuestionPaper', 'PaymentMethod',
                    // Newly added from audit
                    'GradingScale', 'HostelCategory', 'HostelRoom', 'Section', 'StaffAttendance', 'TimetableSlot',
                    'AuditLog', 'StudentHouse', 'ChaplaincyEvent', 'Holiday', 'LibraryCategory', 'SchoolSetting',
                    'PaymentPlan', 'SportingEquipment', 'SchoolSupplier', 'Message', 'SupportTicket', 'StaffLeave',
                    'SchoolEvent', 'TuckshopItem', 'TuckshopSale', 'DigitalResource', 'Syllabus', 'LessonPlan',
                    'SalaryStub', 'ShiftAssignment', 'ReportTemplate', 'AdmissionInquiry', 'PhoneCallLog', 'FrontOfficeComplaint',
                    'PayrollAllowance', 'PayrollDeduction', 'TaxTable', 'TaxBand', 'TermlyComment', 'CBTExam',
                    'LiveClass', 'Award', 'Course', 'StudyMaterial', 'WebsiteSettings', 'WebsiteInquiry',
                    'Noticeboard', 'Vacancy', 'JobApplication', 'SchoolVehicle', 'SchoolTransport', 'MeetingMinutes',
                    'ProjectFunding', 'ClinicAppointment', 'ClinicComplaint', 'ClinicEmergency', 'ClinicImmunization', 'ClinicReferral',
                    'FarmLivestockBatch', 'FarmCropCycle', 'FarmInventoryItem', 'DiningHallReport', 'PrefectDuty', 'PrefectMeeting',
                    'PrefectReport', 'NotificationQueue'
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