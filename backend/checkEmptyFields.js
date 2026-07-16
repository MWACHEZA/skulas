const { Prisma } = require('./src/generated/client');
const emptyModels = ['GradingScale', 'HostelRoom', 'UniformStockOrder', 'UniformStockOrderItem', 'UniformSupplierPayment', 'UserSession', 'ClassSubjectTeacher', 'Faculty', 'StaffAttendance', 'FeeLineItem', 'AuditLog', 'StudentHouse', 'ChaplaincyEvent', 'Holiday', 'AssignmentSubmission', 'SchoolSetting', 'PaymentPlan', 'VisitorLog', 'AdmissionInquiry', 'PhoneCallLog', 'FrontOfficeComplaint', 'SecurityIncident', 'WeeklyMenu', 'TransferAuthorization', 'ExtensionRequest', 'FeeGroupClassAmount', 'PhysicalProduct', 'PhysicalProductConsumption', 'FeeReminderLog', 'CommunicationLog', 'NotificationQueue', 'PayrollAllowance', 'PayrollDeduction', 'TermlyComment', 'CBTResult', 'LiveClass', 'Award', 'Course', 'CourseEnrollment', 'MeetingMinutes', 'ProjectFunding', 'ClinicEmergency', 'ClinicImmunization', 'ClinicReferral', 'DiningHallReport', 'PrefectMeeting', 'PrefectReport', 'WalletTransaction', 'SchoolSequence'];

emptyModels.forEach(modelName => {
  const model = Prisma.dmmf.datamodel.models.find(m => m.name === modelName);
  if (model) {
    const required = model.fields.filter(f => f.isRequired && !f.hasDefaultValue && f.type !== 'DateTime').map(f => f.name + ': ' + f.type);
    console.log(modelName + ' -> ' + required.join(', '));
  }
});
