
Object.defineProperty(exports, "__esModule", { value: true });

const {
  Decimal,
  objectEnumValues,
  makeStrictEnum,
  Public,
  getRuntime,
  skip
} = require('./runtime/index-browser.js')


const Prisma = {}

exports.Prisma = Prisma
exports.$Enums = {}

/**
 * Prisma Client JS version: 5.22.0
 * Query Engine version: 605197351a3c8bdd595af2d2a9bc3025bca48ea2
 */
Prisma.prismaVersion = {
  client: "5.22.0",
  engine: "605197351a3c8bdd595af2d2a9bc3025bca48ea2"
}

Prisma.PrismaClientKnownRequestError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`PrismaClientKnownRequestError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)};
Prisma.PrismaClientUnknownRequestError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`PrismaClientUnknownRequestError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.PrismaClientRustPanicError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`PrismaClientRustPanicError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.PrismaClientInitializationError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`PrismaClientInitializationError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.PrismaClientValidationError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`PrismaClientValidationError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.NotFoundError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`NotFoundError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.Decimal = Decimal

/**
 * Re-export of sql-template-tag
 */
Prisma.sql = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`sqltag is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.empty = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`empty is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.join = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`join is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.raw = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`raw is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.validator = Public.validator

/**
* Extensions
*/
Prisma.getExtensionContext = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`Extensions.getExtensionContext is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.defineExtension = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`Extensions.defineExtension is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}

/**
 * Shorthand utilities for JSON filtering
 */
Prisma.DbNull = objectEnumValues.instances.DbNull
Prisma.JsonNull = objectEnumValues.instances.JsonNull
Prisma.AnyNull = objectEnumValues.instances.AnyNull

Prisma.NullTypes = {
  DbNull: objectEnumValues.classes.DbNull,
  JsonNull: objectEnumValues.classes.JsonNull,
  AnyNull: objectEnumValues.classes.AnyNull
}



/**
 * Enums
 */

exports.Prisma.TransactionIsolationLevel = makeStrictEnum({
  ReadUncommitted: 'ReadUncommitted',
  ReadCommitted: 'ReadCommitted',
  RepeatableRead: 'RepeatableRead',
  Serializable: 'Serializable'
});

exports.Prisma.PlanScalarFieldEnum = {
  id: 'id',
  name: 'name',
  price: 'price',
  features: 'features',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.SchoolScalarFieldEnum = {
  id: 'id',
  code: 'code',
  name: 'name',
  type: 'type',
  isCombined: 'isCombined',
  levels: 'levels',
  address: 'address',
  country: 'country',
  email: 'email',
  phone: 'phone',
  website: 'website',
  status: 'status',
  planId: 'planId',
  branding: 'branding',
  customContent: 'customContent',
  hexcoCenterNumber: 'hexcoCenterNumber',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt',
  idCardTemplate: 'idCardTemplate',
  settings: 'settings'
};

exports.Prisma.GradingScaleScalarFieldEnum = {
  id: 'id',
  grade: 'grade',
  minScore: 'minScore',
  maxScore: 'maxScore',
  status: 'status',
  schoolId: 'schoolId',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.HostelCategoryScalarFieldEnum = {
  id: 'id',
  name: 'name',
  description: 'description',
  schoolId: 'schoolId',
  createdAt: 'createdAt'
};

exports.Prisma.HostelRoomScalarFieldEnum = {
  id: 'id',
  name: 'name',
  type: 'type',
  numberOfBeds: 'numberOfBeds',
  cost: 'cost',
  description: 'description',
  schoolId: 'schoolId',
  createdAt: 'createdAt'
};

exports.Prisma.UniformItemScalarFieldEnum = {
  id: 'id',
  name: 'name',
  orderPrice: 'orderPrice',
  sellingPrice: 'sellingPrice',
  stockLevel: 'stockLevel',
  schoolId: 'schoolId',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.UniformStockOrderScalarFieldEnum = {
  id: 'id',
  orderDate: 'orderDate',
  supplierId: 'supplierId',
  paymentMode: 'paymentMode',
  reference: 'reference',
  totalAmount: 'totalAmount',
  initialPayment: 'initialPayment',
  schoolId: 'schoolId',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.UniformStockOrderItemScalarFieldEnum = {
  id: 'id',
  orderId: 'orderId',
  itemId: 'itemId',
  quantity: 'quantity',
  unitPrice: 'unitPrice',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.UniformSaleScalarFieldEnum = {
  id: 'id',
  saleDate: 'saleDate',
  studentId: 'studentId',
  parentId: 'parentId',
  paymentMode: 'paymentMode',
  reference: 'reference',
  totalAmount: 'totalAmount',
  schoolId: 'schoolId',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.UniformSaleItemScalarFieldEnum = {
  id: 'id',
  saleId: 'saleId',
  itemId: 'itemId',
  quantity: 'quantity',
  unitPrice: 'unitPrice',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.UniformSupplierPaymentScalarFieldEnum = {
  id: 'id',
  supplierId: 'supplierId',
  amount: 'amount',
  date: 'date',
  paymentMode: 'paymentMode',
  reference: 'reference',
  schoolId: 'schoolId',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.AccountCategoryScalarFieldEnum = {
  id: 'id',
  name: 'name',
  type: 'type',
  schoolId: 'schoolId',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.LiabilityScalarFieldEnum = {
  id: 'id',
  name: 'name',
  categoryId: 'categoryId',
  amount: 'amount',
  settled: 'settled',
  date: 'date',
  status: 'status',
  schoolId: 'schoolId',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.IncomeScalarFieldEnum = {
  id: 'id',
  title: 'title',
  amount: 'amount',
  categoryId: 'categoryId',
  date: 'date',
  paymentMode: 'paymentMode',
  currency: 'currency',
  schoolId: 'schoolId',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.ExpenseScalarFieldEnum = {
  id: 'id',
  title: 'title',
  amount: 'amount',
  categoryId: 'categoryId',
  date: 'date',
  paymentMode: 'paymentMode',
  currency: 'currency',
  schoolId: 'schoolId',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.UserScalarFieldEnum = {
  id: 'id',
  email: 'email',
  password: 'password',
  name: 'name',
  role: 'role',
  secondaryRoles: 'secondaryRoles',
  avatar: 'avatar',
  religion: 'religion',
  phone: 'phone',
  preferredLanguage: 'preferredLanguage',
  staffId: 'staffId',
  schoolId: 'schoolId',
  departmentId: 'departmentId',
  metadata: 'metadata',
  isLocked: 'isLocked',
  mustChangePassword: 'mustChangePassword',
  passwordLastChanged: 'passwordLastChanged',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.UserSessionScalarFieldEnum = {
  id: 'id',
  userId: 'userId',
  tokenFamily: 'tokenFamily',
  ipAddress: 'ipAddress',
  userAgent: 'userAgent',
  deviceInfo: 'deviceInfo',
  isValid: 'isValid',
  expiresAt: 'expiresAt',
  createdAt: 'createdAt',
  lastActiveAt: 'lastActiveAt'
};

exports.Prisma.TeacherScalarFieldEnum = {
  id: 'id',
  staffId: 'staffId',
  userId: 'userId',
  schoolId: 'schoolId',
  qualification: 'qualification',
  title: 'title',
  department: 'department',
  departmentId: 'departmentId',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.StudentScalarFieldEnum = {
  id: 'id',
  studentId: 'studentId',
  name: 'name',
  userId: 'userId',
  email: 'email',
  phone: 'phone',
  dob: 'dob',
  gender: 'gender',
  preferredLanguage: 'preferredLanguage',
  address: 'address',
  classId: 'classId',
  schoolId: 'schoolId',
  programLevel: 'programLevel',
  studyMode: 'studyMode',
  researchTitle: 'researchTitle',
  startDate: 'startDate',
  maxCompletionDate: 'maxCompletionDate',
  extensionMonths: 'extensionMonths',
  status: 'status',
  standing: 'standing',
  part: 'part',
  enrolledAt: 'enrolledAt',
  guardianName: 'guardianName',
  boardingStatus: 'boardingStatus',
  roomId: 'roomId',
  hostelId: 'hostelId',
  prevSchool: 'prevSchool',
  reasonForTransfer: 'reasonForTransfer',
  lastGradeAchieved: 'lastGradeAchieved',
  admissionsNotes: 'admissionsNotes',
  academicHistory: 'academicHistory',
  enrollmentDate: 'enrollmentDate',
  hexcoId: 'hexcoId',
  houseId: 'houseId',
  motherTongue: 'motherTongue',
  nationality: 'nationality',
  city: 'city',
  state: 'state',
  prevSchoolClass: 'prevSchoolClass',
  prevSchoolAddress: 'prevSchoolAddress',
  hasTransferCertificate: 'hasTransferCertificate',
  transferCertificateUrl: 'transferCertificateUrl',
  isPhysicallyHandicapped: 'isPhysicallyHandicapped',
  handicapDetails: 'handicapDetails',
  category: 'category',
  section: 'section',
  dormitory: 'dormitory',
  birthCertificateUrl: 'birthCertificateUrl',
  age: 'age',
  clubId: 'clubId',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.SchoolClassScalarFieldEnum = {
  id: 'id',
  name: 'name',
  level: 'level',
  capacity: 'capacity',
  sectionId: 'sectionId',
  teacherId: 'teacherId',
  schoolId: 'schoolId'
};

exports.Prisma.SectionScalarFieldEnum = {
  id: 'id',
  name: 'name',
  schoolId: 'schoolId',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.SubjectScalarFieldEnum = {
  id: 'id',
  name: 'name',
  code: 'code',
  department: 'department',
  departmentId: 'departmentId',
  schoolId: 'schoolId',
  gradingType: 'gradingType',
  credits: 'credits',
  isIndustrial: 'isIndustrial',
  isProject: 'isProject',
  isSubsidiary: 'isSubsidiary',
  caWeight: 'caWeight',
  examWeight: 'examWeight'
};

exports.Prisma.TeacherSubjectScalarFieldEnum = {
  id: 'id',
  teacherId: 'teacherId',
  subjectId: 'subjectId'
};

exports.Prisma.ClassSubjectTeacherScalarFieldEnum = {
  id: 'id',
  classId: 'classId',
  subjectId: 'subjectId',
  teacherId: 'teacherId'
};

exports.Prisma.GradeScalarFieldEnum = {
  id: 'id',
  studentId: 'studentId',
  subjectId: 'subjectId',
  teacherId: 'teacherId',
  term: 'term',
  year: 'year',
  score: 'score',
  maxScore: 'maxScore',
  caScore: 'caScore',
  examScore: 'examScore',
  grade: 'grade',
  industrialScores: 'industrialScores',
  isIndustrialGrade: 'isIndustrialGrade',
  gradePoint: 'gradePoint',
  comment: 'comment',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt',
  schoolId: 'schoolId'
};

exports.Prisma.FacultyScalarFieldEnum = {
  id: 'id',
  name: 'name',
  schoolId: 'schoolId',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.DepartmentScalarFieldEnum = {
  id: 'id',
  name: 'name',
  code: 'code',
  deptCode: 'deptCode',
  duration: 'duration',
  schoolId: 'schoolId',
  facultyId: 'facultyId',
  headId: 'headId',
  services: 'services',
  facilities: 'facilities',
  pictures: 'pictures',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.AttendanceScalarFieldEnum = {
  id: 'id',
  studentId: 'studentId',
  teacherId: 'teacherId',
  date: 'date',
  status: 'status',
  note: 'note',
  scanMethod: 'scanMethod',
  classId: 'classId',
  createdAt: 'createdAt',
  schoolId: 'schoolId'
};

exports.Prisma.StaffAttendanceScalarFieldEnum = {
  id: 'id',
  staffId: 'staffId',
  schoolId: 'schoolId',
  date: 'date',
  timeIn: 'timeIn',
  timeOut: 'timeOut',
  status: 'status',
  clockInImage: 'clockInImage',
  clockOutImage: 'clockOutImage',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.FeeScalarFieldEnum = {
  id: 'id',
  studentId: 'studentId',
  term: 'term',
  year: 'year',
  amount: 'amount',
  discount: 'discount',
  vatPercentage: 'vatPercentage',
  paid: 'paid',
  dueDate: 'dueDate',
  status: 'status',
  description: 'description',
  isLedger: 'isLedger',
  feeGroupId: 'feeGroupId',
  schoolId: 'schoolId',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.FeeLineItemScalarFieldEnum = {
  id: 'id',
  feeId: 'feeId',
  item: 'item',
  amount: 'amount',
  date: 'date'
};

exports.Prisma.AssignmentScalarFieldEnum = {
  id: 'id',
  title: 'title',
  description: 'description',
  subjectId: 'subjectId',
  teacherId: 'teacherId',
  dueDate: 'dueDate',
  maxScore: 'maxScore',
  category: 'category',
  timeLimit: 'timeLimit',
  allowLate: 'allowLate',
  isAccepting: 'isAccepting',
  questions: 'questions',
  classId: 'classId',
  attachments: 'attachments',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt',
  schoolId: 'schoolId'
};

exports.Prisma.QuestionPaperScalarFieldEnum = {
  id: 'id',
  title: 'title',
  description: 'description',
  subjectId: 'subjectId',
  teacherId: 'teacherId',
  sections: 'sections',
  duration: 'duration',
  totalMarks: 'totalMarks',
  instructions: 'instructions',
  schoolId: 'schoolId',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.TimetableSlotScalarFieldEnum = {
  id: 'id',
  classId: 'classId',
  subjectId: 'subjectId',
  schoolId: 'schoolId',
  dayOfWeek: 'dayOfWeek',
  startTime: 'startTime',
  endTime: 'endTime',
  room: 'room',
  term: 'term',
  year: 'year',
  isPublished: 'isPublished'
};

exports.Prisma.AnnouncementScalarFieldEnum = {
  id: 'id',
  title: 'title',
  content: 'content',
  targetRole: 'targetRole',
  visiblePortals: 'visiblePortals',
  isPublic: 'isPublic',
  schoolId: 'schoolId',
  publishedAt: 'publishedAt',
  expiresAt: 'expiresAt'
};

exports.Prisma.AuditLogScalarFieldEnum = {
  id: 'id',
  actorId: 'actorId',
  action: 'action',
  entityType: 'entityType',
  entityId: 'entityId',
  details: 'details',
  ipAddress: 'ipAddress',
  schoolId: 'schoolId',
  createdAt: 'createdAt'
};

exports.Prisma.BookScalarFieldEnum = {
  id: 'id',
  title: 'title',
  author: 'author',
  isbn: 'isbn',
  edition: 'edition',
  publisher: 'publisher',
  price: 'price',
  publishedDate: 'publishedDate',
  description: 'description',
  status: 'status',
  categoryId: 'categoryId',
  subjectId: 'subjectId',
  classId: 'classId',
  teacherId: 'teacherId',
  coverUrl: 'coverUrl',
  pdfUrl: 'pdfUrl',
  copies: 'copies',
  available: 'available',
  schoolId: 'schoolId',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.StudentHouseScalarFieldEnum = {
  id: 'id',
  name: 'name',
  description: 'description',
  logo: 'logo',
  color: 'color',
  motto: 'motto',
  points: 'points',
  schoolId: 'schoolId',
  houseMasterId: 'houseMasterId',
  houseCaptainId: 'houseCaptainId',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.ChaplaincyEventScalarFieldEnum = {
  id: 'id',
  title: 'title',
  type: 'type',
  date: 'date',
  theme: 'theme',
  status: 'status',
  schoolId: 'schoolId',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.HolidayScalarFieldEnum = {
  id: 'id',
  title: 'title',
  content: 'content',
  startDate: 'startDate',
  endDate: 'endDate',
  schoolId: 'schoolId',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.LibraryCategoryScalarFieldEnum = {
  id: 'id',
  name: 'name',
  schoolId: 'schoolId',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.BookLoanScalarFieldEnum = {
  id: 'id',
  bookId: 'bookId',
  studentId: 'studentId',
  userId: 'userId',
  borrowedAt: 'borrowedAt',
  dueDate: 'dueDate',
  returnedAt: 'returnedAt',
  status: 'status',
  loanType: 'loanType',
  notes: 'notes',
  schoolId: 'schoolId'
};

exports.Prisma.AssignmentSubmissionScalarFieldEnum = {
  id: 'id',
  assignmentId: 'assignmentId',
  studentId: 'studentId',
  attachments: 'attachments',
  submittedAt: 'submittedAt',
  startedAt: 'startedAt',
  status: 'status',
  grade: 'grade',
  autoScore: 'autoScore',
  feedback: 'feedback',
  gradedAt: 'gradedAt',
  schoolId: 'schoolId'
};

exports.Prisma.NewsScalarFieldEnum = {
  id: 'id',
  title: 'title',
  content: 'content',
  image: 'image',
  category: 'category',
  author: 'author',
  schoolId: 'schoolId',
  publishedAt: 'publishedAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.SchoolSettingScalarFieldEnum = {
  id: 'id',
  schoolId: 'schoolId',
  favicon: 'favicon',
  idleTime: 'idleTime',
  idleTimeCountdown: 'idleTimeCountdown',
  baseCurrency: 'baseCurrency',
  baseCurrencySymbol: 'baseCurrencySymbol',
  altCurrency: 'altCurrency',
  altCurrencySymbol: 'altCurrencySymbol',
  mandatoryReceipts: 'mandatoryReceipts',
  showBalanceOnReceipts: 'showBalanceOnReceipts',
  showUniformsModule: 'showUniformsModule',
  smtpEmail: 'smtpEmail',
  smtpHost: 'smtpHost',
  smtpPort: 'smtpPort',
  smtpPassword: 'smtpPassword',
  smtpSsl: 'smtpSsl',
  systemUrl: 'systemUrl',
  whatsappApiUrl: 'whatsappApiUrl',
  whatsappAccessToken: 'whatsappAccessToken',
  countryPhoneCode: 'countryPhoneCode',
  systemName: 'systemName',
  systemTitle: 'systemTitle',
  shortSystemName: 'shortSystemName',
  systemEmail: 'systemEmail',
  phone: 'phone',
  address: 'address',
  paypalEmail: 'paypalEmail',
  systemCurrency: 'systemCurrency',
  runningSession: 'runningSession',
  weekends: 'weekends',
  currentTerm: 'currentTerm',
  nextTermBegin: 'nextTermBegin',
  language: 'language',
  timezone: 'timezone',
  tawktoPropertyId: 'tawktoPropertyId',
  theme: 'theme',
  textAlignment: 'textAlignment',
  themeColour: 'themeColour',
  enableParentMarketplace: 'enableParentMarketplace',
  deletePaymentHistoryWithPartial: 'deletePaymentHistoryWithPartial',
  footer: 'footer',
  country: 'country',
  state: 'state',
  city: 'city',
  facebook: 'facebook',
  twitter: 'twitter',
  youtube: 'youtube',
  instagram: 'instagram',
  linkedin: 'linkedin',
  tiktok: 'tiktok',
  reportCardTemplate: 'reportCardTemplate',
  allowTeacherEnterScores: 'allowTeacherEnterScores',
  scoreClosingDate: 'scoreClosingDate',
  allowStudentCheckResult: 'allowStudentCheckResult',
  allowParentPrintReport: 'allowParentPrintReport',
  reportCommentSignature: 'reportCommentSignature',
  showSubjectPosition: 'showSubjectPosition',
  gateMinPaidAmount: 'gateMinPaidAmount',
  gateMinPaidPercent: 'gateMinPaidPercent',
  gateRequiredType: 'gateRequiredType',
  idCardTemplateFront: 'idCardTemplateFront',
  idCardTemplateBack: 'idCardTemplateBack',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.PaymentPlanScalarFieldEnum = {
  id: 'id',
  schoolId: 'schoolId',
  studentId: 'studentId',
  parentUserId: 'parentUserId',
  amount: 'amount',
  dueDate: 'dueDate',
  status: 'status',
  notes: 'notes',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.GalleryScalarFieldEnum = {
  id: 'id',
  title: 'title',
  content: 'content',
  coverImage: 'coverImage',
  category: 'category',
  schoolId: 'schoolId',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.ClubScalarFieldEnum = {
  id: 'id',
  name: 'name',
  description: 'description',
  date: 'date',
  icon: 'icon',
  category: 'category',
  patron: 'patron',
  chairperson: 'chairperson',
  schoolId: 'schoolId'
};

exports.Prisma.SportScalarFieldEnum = {
  id: 'id',
  name: 'name',
  description: 'description',
  icon: 'icon',
  coach: 'coach',
  category: 'category',
  sportMaster: 'sportMaster',
  sportMasterId: 'sportMasterId',
  captain: 'captain',
  captains: 'captains',
  coaches: 'coaches',
  ageGroups: 'ageGroups',
  schoolId: 'schoolId'
};

exports.Prisma.SportingEquipmentScalarFieldEnum = {
  id: 'id',
  name: 'name',
  sportId: 'sportId',
  quantity: 'quantity',
  condition: 'condition',
  custodianId: 'custodianId',
  schoolId: 'schoolId',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.ApplicationScalarFieldEnum = {
  id: 'id',
  applicationNumber: 'applicationNumber',
  applicantName: 'applicantName',
  email: 'email',
  phone: 'phone',
  dob: 'dob',
  gender: 'gender',
  appType: 'appType',
  status: 'status',
  interviewDate: 'interviewDate',
  interviewTime: 'interviewTime',
  interviewVenue: 'interviewVenue',
  prevSchool: 'prevSchool',
  reasonForTransfer: 'reasonForTransfer',
  lastGradeAchieved: 'lastGradeAchieved',
  academicHistory: 'academicHistory',
  academicData: 'academicData',
  entryCategory: 'entryCategory',
  programLevel: 'programLevel',
  studyMode: 'studyMode',
  researchTitle: 'researchTitle',
  assignedClassId: 'assignedClassId',
  address: 'address',
  schoolId: 'schoolId',
  notes: 'notes',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.SupplierScalarFieldEnum = {
  id: 'id',
  globalId: 'globalId',
  companyName: 'companyName',
  contactName: 'contactName',
  email: 'email',
  phone: 'phone',
  address: 'address',
  taxClearance: 'taxClearance',
  prazCert: 'prazCert',
  status: 'status',
  userId: 'userId',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.SchoolSupplierScalarFieldEnum = {
  id: 'id',
  schoolSpecificId: 'schoolSpecificId',
  schoolId: 'schoolId',
  supplierId: 'supplierId',
  status: 'status',
  notes: 'notes',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.ParentScalarFieldEnum = {
  id: 'id',
  globalId: 'globalId',
  userId: 'userId',
  phone: 'phone',
  preferredLanguage: 'preferredLanguage',
  address: 'address',
  occupation: 'occupation',
  employer: 'employer',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.ParentStudentScalarFieldEnum = {
  id: 'id',
  parentId: 'parentId',
  studentId: 'studentId',
  relation: 'relation',
  isPrimaryPayer: 'isPrimaryPayer',
  status: 'status',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.TenderScalarFieldEnum = {
  id: 'id',
  title: 'title',
  description: 'description',
  category: 'category',
  budget: 'budget',
  openDate: 'openDate',
  closeDate: 'closeDate',
  status: 'status',
  schoolId: 'schoolId',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.TenderBidScalarFieldEnum = {
  id: 'id',
  tenderId: 'tenderId',
  supplierId: 'supplierId',
  amount: 'amount',
  proposal: 'proposal',
  status: 'status',
  submittedAt: 'submittedAt'
};

exports.Prisma.PurchaseOrderScalarFieldEnum = {
  id: 'id',
  poNumber: 'poNumber',
  supplierId: 'supplierId',
  description: 'description',
  items: 'items',
  totalAmount: 'totalAmount',
  status: 'status',
  schoolId: 'schoolId',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.InvoiceScalarFieldEnum = {
  id: 'id',
  invoiceNo: 'invoiceNo',
  supplierId: 'supplierId',
  amount: 'amount',
  status: 'status',
  dueDate: 'dueDate',
  schoolId: 'schoolId',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.MessageScalarFieldEnum = {
  id: 'id',
  senderId: 'senderId',
  recipientId: 'recipientId',
  subject: 'subject',
  body: 'body',
  isRead: 'isRead',
  schoolId: 'schoolId',
  createdAt: 'createdAt'
};

exports.Prisma.SupportTicketScalarFieldEnum = {
  id: 'id',
  title: 'title',
  description: 'description',
  category: 'category',
  priority: 'priority',
  status: 'status',
  requesterId: 'requesterId',
  assignedTo: 'assignedTo',
  schoolId: 'schoolId',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.StaffLeaveScalarFieldEnum = {
  id: 'id',
  userId: 'userId',
  leaveType: 'leaveType',
  startDate: 'startDate',
  endDate: 'endDate',
  reason: 'reason',
  status: 'status',
  approvedBy: 'approvedBy',
  schoolId: 'schoolId',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.AssetScalarFieldEnum = {
  id: 'id',
  name: 'name',
  category: 'category',
  serialNumber: 'serialNumber',
  location: 'location',
  condition: 'condition',
  purchaseDate: 'purchaseDate',
  purchasePrice: 'purchasePrice',
  custodianId: 'custodianId',
  schoolId: 'schoolId',
  nextMaintenance: 'nextMaintenance',
  maintenanceInterval: 'maintenanceInterval',
  attachments: 'attachments',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.AssetIncidentScalarFieldEnum = {
  id: 'id',
  assetId: 'assetId',
  reporterId: 'reporterId',
  issueType: 'issueType',
  details: 'details',
  status: 'status',
  resolvedBy: 'resolvedBy',
  fixDetails: 'fixDetails',
  attachments: 'attachments',
  schoolId: 'schoolId',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.AssetMaintenanceScalarFieldEnum = {
  id: 'id',
  assetId: 'assetId',
  scheduledDate: 'scheduledDate',
  performedDate: 'performedDate',
  description: 'description',
  attachments: 'attachments',
  cost: 'cost',
  notes: 'notes',
  schoolId: 'schoolId',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.TransportRouteScalarFieldEnum = {
  id: 'id',
  name: 'name',
  description: 'description',
  driverName: 'driverName',
  driverPhone: 'driverPhone',
  vehicle: 'vehicle',
  stops: 'stops',
  schoolId: 'schoolId',
  createdAt: 'createdAt'
};

exports.Prisma.SchoolEventScalarFieldEnum = {
  id: 'id',
  title: 'title',
  description: 'description',
  date: 'date',
  endDate: 'endDate',
  venue: 'venue',
  category: 'category',
  schoolId: 'schoolId',
  createdAt: 'createdAt'
};

exports.Prisma.TuckshopItemScalarFieldEnum = {
  id: 'id',
  name: 'name',
  category: 'category',
  price: 'price',
  stock: 'stock',
  schoolId: 'schoolId',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.TuckshopSaleScalarFieldEnum = {
  id: 'id',
  itemId: 'itemId',
  quantity: 'quantity',
  totalAmount: 'totalAmount',
  soldAt: 'soldAt',
  studentId: 'studentId',
  schoolId: 'schoolId'
};

exports.Prisma.DigitalResourceScalarFieldEnum = {
  id: 'id',
  title: 'title',
  description: 'description',
  fileUrl: 'fileUrl',
  fileType: 'fileType',
  category: 'category',
  teacherId: 'teacherId',
  subjectId: 'subjectId',
  schoolId: 'schoolId',
  createdAt: 'createdAt'
};

exports.Prisma.SyllabusScalarFieldEnum = {
  id: 'id',
  schoolId: 'schoolId',
  classId: 'classId',
  subjectId: 'subjectId',
  topic: 'topic',
  content: 'content',
  week: 'week',
  createdAt: 'createdAt'
};

exports.Prisma.LessonPlanScalarFieldEnum = {
  id: 'id',
  schoolId: 'schoolId',
  classId: 'classId',
  subjectId: 'subjectId',
  syllabusId: 'syllabusId',
  teacherId: 'teacherId',
  week: 'week',
  session: 'session',
  content: 'content',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.SalaryStubScalarFieldEnum = {
  id: 'id',
  userId: 'userId',
  month: 'month',
  year: 'year',
  basicPay: 'basicPay',
  allowances: 'allowances',
  deductions: 'deductions',
  netPay: 'netPay',
  status: 'status',
  paidAt: 'paidAt',
  schoolId: 'schoolId',
  createdAt: 'createdAt'
};

exports.Prisma.ShiftAssignmentScalarFieldEnum = {
  id: 'id',
  userId: 'userId',
  dayOfWeek: 'dayOfWeek',
  startTime: 'startTime',
  endTime: 'endTime',
  location: 'location',
  task: 'task',
  schoolId: 'schoolId'
};

exports.Prisma.ApplicantDocumentScalarFieldEnum = {
  id: 'id',
  applicationId: 'applicationId',
  name: 'name',
  url: 'url',
  status: 'status',
  createdAt: 'createdAt'
};

exports.Prisma.ApplicantTimelineScalarFieldEnum = {
  id: 'id',
  applicationId: 'applicationId',
  event: 'event',
  description: 'description',
  occurredAt: 'occurredAt'
};

exports.Prisma.AcademicReportScalarFieldEnum = {
  id: 'id',
  studentId: 'studentId',
  term: 'term',
  year: 'year',
  data: 'data',
  publishedStudent: 'publishedStudent',
  publishedParent: 'publishedParent',
  schoolId: 'schoolId',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.ReportTemplateScalarFieldEnum = {
  id: 'id',
  schoolId: 'schoolId',
  config: 'config',
  signatureUrl: 'signatureUrl',
  updatedAt: 'updatedAt'
};

exports.Prisma.RequisitionScalarFieldEnum = {
  id: 'id',
  refNumber: 'refNumber',
  title: 'title',
  description: 'description',
  estimatedAmount: 'estimatedAmount',
  status: 'status',
  departmentId: 'departmentId',
  requesterId: 'requesterId',
  hodId: 'hodId',
  bursarId: 'bursarId',
  adminId: 'adminId',
  schoolId: 'schoolId',
  purchaseOrderId: 'purchaseOrderId',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.HostelScalarFieldEnum = {
  id: 'id',
  name: 'name',
  type: 'type',
  capacity: 'capacity',
  location: 'location',
  description: 'description',
  categoryId: 'categoryId',
  roomId: 'roomId',
  schoolId: 'schoolId',
  createdAt: 'createdAt'
};

exports.Prisma.RoomScalarFieldEnum = {
  id: 'id',
  name: 'name',
  capacity: 'capacity',
  hostelId: 'hostelId',
  createdAt: 'createdAt'
};

exports.Prisma.BoardingLogScalarFieldEnum = {
  id: 'id',
  studentId: 'studentId',
  type: 'type',
  reason: 'reason',
  authorizedById: 'authorizedById',
  timestamp: 'timestamp',
  returnedAt: 'returnedAt',
  schoolId: 'schoolId'
};

exports.Prisma.VisitorLogScalarFieldEnum = {
  id: 'id',
  name: 'name',
  phone: 'phone',
  idCard: 'idCard',
  numOfPerson: 'numOfPerson',
  meetingWith: 'meetingWith',
  note: 'note',
  purpose: 'purpose',
  vehicleReg: 'vehicleReg',
  entryTime: 'entryTime',
  exitTime: 'exitTime',
  guardId: 'guardId',
  schoolId: 'schoolId'
};

exports.Prisma.AdmissionInquiryScalarFieldEnum = {
  id: 'id',
  name: 'name',
  phone: 'phone',
  source: 'source',
  classId: 'classId',
  inquiryDate: 'inquiryDate',
  lastFollowUpDate: 'lastFollowUpDate',
  nextFollowUpDate: 'nextFollowUpDate',
  status: 'status',
  schoolId: 'schoolId'
};

exports.Prisma.PhoneCallLogScalarFieldEnum = {
  id: 'id',
  name: 'name',
  phone: 'phone',
  date: 'date',
  nextFollowUpDate: 'nextFollowUpDate',
  callDuration: 'callDuration',
  callType: 'callType',
  description: 'description',
  schoolId: 'schoolId'
};

exports.Prisma.FrontOfficeComplaintScalarFieldEnum = {
  id: 'id',
  complainType: 'complainType',
  source: 'source',
  complainBy: 'complainBy',
  phone: 'phone',
  date: 'date',
  actionTaken: 'actionTaken',
  assignedTo: 'assignedTo',
  description: 'description',
  schoolId: 'schoolId'
};

exports.Prisma.SecurityIncidentScalarFieldEnum = {
  id: 'id',
  title: 'title',
  description: 'description',
  severity: 'severity',
  location: 'location',
  reportedById: 'reportedById',
  timestamp: 'timestamp',
  schoolId: 'schoolId'
};

exports.Prisma.WeeklyMenuScalarFieldEnum = {
  id: 'id',
  weekStarting: 'weekStarting',
  menuData: 'menuData',
  published: 'published',
  schoolId: 'schoolId'
};

exports.Prisma.TransferAuthorizationScalarFieldEnum = {
  id: 'id',
  studentUserId: 'studentUserId',
  originSchoolId: 'originSchoolId',
  targetSchoolId: 'targetSchoolId',
  studentConsent: 'studentConsent',
  originConsent: 'originConsent',
  targetConsent: 'targetConsent',
  status: 'status',
  expiresAt: 'expiresAt',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.SupervisorAssignmentScalarFieldEnum = {
  id: 'id',
  studentId: 'studentId',
  teacherId: 'teacherId',
  role: 'role',
  assignedAt: 'assignedAt',
  schoolId: 'schoolId'
};

exports.Prisma.ExtensionRequestScalarFieldEnum = {
  id: 'id',
  studentId: 'studentId',
  reason: 'reason',
  durationRequested: 'durationRequested',
  justificationUrl: 'justificationUrl',
  status: 'status',
  adminComment: 'adminComment',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt',
  schoolId: 'schoolId'
};

exports.Prisma.ProgressReportScalarFieldEnum = {
  id: 'id',
  studentId: 'studentId',
  assignmentId: 'assignmentId',
  reportPeriod: 'reportPeriod',
  content: 'content',
  status: 'status',
  supervisorNote: 'supervisorNote',
  submittedAt: 'submittedAt',
  reviewedAt: 'reviewedAt',
  schoolId: 'schoolId'
};

exports.Prisma.PaymentMethodScalarFieldEnum = {
  id: 'id',
  name: 'name',
  schoolId: 'schoolId',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.FeeGroupScalarFieldEnum = {
  id: 'id',
  name: 'name',
  amount: 'amount',
  year: 'year',
  billingType: 'billingType',
  isRecurring: 'isRecurring',
  remindersEnabled: 'remindersEnabled',
  schoolId: 'schoolId',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.FeeGroupClassAmountScalarFieldEnum = {
  id: 'id',
  feeGroupId: 'feeGroupId',
  classId: 'classId',
  amount: 'amount'
};

exports.Prisma.PhysicalProductScalarFieldEnum = {
  id: 'id',
  name: 'name',
  unit: 'unit',
  quantity: 'quantity',
  price: 'price',
  schoolId: 'schoolId',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.PhysicalProductConsumptionScalarFieldEnum = {
  id: 'id',
  productId: 'productId',
  quantity: 'quantity',
  requestedBy: 'requestedBy',
  dispatchedBy: 'dispatchedBy',
  date: 'date',
  schoolId: 'schoolId',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.FeeReminderLogScalarFieldEnum = {
  id: 'id',
  studentId: 'studentId',
  source: 'source',
  status: 'status',
  retries: 'retries',
  lastAttempt: 'lastAttempt',
  error: 'error',
  schoolId: 'schoolId',
  createdAt: 'createdAt'
};

exports.Prisma.StudentPaymentScalarFieldEnum = {
  id: 'id',
  studentId: 'studentId',
  feeId: 'feeId',
  amount: 'amount',
  paymentMode: 'paymentMode',
  reference: 'reference',
  status: 'status',
  date: 'date',
  schoolId: 'schoolId',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.CommunicationLogScalarFieldEnum = {
  id: 'id',
  type: 'type',
  senderId: 'senderId',
  studentId: 'studentId',
  description: 'description',
  status: 'status',
  providerMsgId: 'providerMsgId',
  errorDetails: 'errorDetails',
  schoolId: 'schoolId',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.NotificationQueueScalarFieldEnum = {
  id: 'id',
  type: 'type',
  recipientPhone: 'recipientPhone',
  recipientEmail: 'recipientEmail',
  template: 'template',
  payload: 'payload',
  status: 'status',
  retries: 'retries',
  nextAttempt: 'nextAttempt',
  errorDetails: 'errorDetails',
  senderId: 'senderId',
  schoolId: 'schoolId',
  studentId: 'studentId',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.RevenueAllocationScalarFieldEnum = {
  id: 'id',
  name: 'name',
  schoolYear: 'schoolYear',
  period: 'period',
  isActive: 'isActive',
  breakdown: 'breakdown',
  schoolId: 'schoolId',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.PayrollAllowanceScalarFieldEnum = {
  id: 'id',
  name: 'name',
  isRecurring: 'isRecurring',
  isPercentage: 'isPercentage',
  defaultValue: 'defaultValue',
  schoolId: 'schoolId',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.PayrollDeductionScalarFieldEnum = {
  id: 'id',
  name: 'name',
  isRecurring: 'isRecurring',
  isPercentage: 'isPercentage',
  defaultValue: 'defaultValue',
  schoolId: 'schoolId',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.TaxTableScalarFieldEnum = {
  id: 'id',
  name: 'name',
  region: 'region',
  effectiveFrom: 'effectiveFrom',
  effectiveTo: 'effectiveTo',
  isActive: 'isActive',
  schoolId: 'schoolId',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.TaxBandScalarFieldEnum = {
  id: 'id',
  taxTableId: 'taxTableId',
  minIncome: 'minIncome',
  maxIncome: 'maxIncome',
  rate: 'rate',
  fixedAmount: 'fixedAmount',
  schoolId: 'schoolId',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.EmployeeProfileScalarFieldEnum = {
  id: 'id',
  userId: 'userId',
  jobTitle: 'jobTitle',
  basePay: 'basePay',
  payFrequency: 'payFrequency',
  contractType: 'contractType',
  hireDate: 'hireDate',
  bloodGroup: 'bloodGroup',
  dateAssumedPost: 'dateAssumedPost',
  dateOfLeaving: 'dateOfLeaving',
  designation: 'designation',
  accountNumber: 'accountNumber',
  accountHolderName: 'accountHolderName',
  bankName: 'bankName',
  bankBranch: 'bankBranch',
  branchCode: 'branchCode',
  accountType: 'accountType',
  accountNumberZig: 'accountNumberZig',
  accountHolderNameZig: 'accountHolderNameZig',
  bankNameZig: 'bankNameZig',
  bankBranchZig: 'bankBranchZig',
  branchCodeZig: 'branchCodeZig',
  accountTypeZig: 'accountTypeZig',
  facebookLink: 'facebookLink',
  linkedinLink: 'linkedinLink',
  twitterLink: 'twitterLink',
  staffDocuments: 'staffDocuments',
  status: 'status',
  schoolId: 'schoolId',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.TermlyCommentScalarFieldEnum = {
  id: 'id',
  studentId: 'studentId',
  term: 'term',
  year: 'year',
  classTeacherComment: 'classTeacherComment',
  principalComment: 'principalComment',
  schoolId: 'schoolId',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.PayrollRunScalarFieldEnum = {
  id: 'id',
  month: 'month',
  year: 'year',
  runDate: 'runDate',
  status: 'status',
  frequency: 'frequency',
  employeesCount: 'employeesCount',
  totalGross: 'totalGross',
  totalDeductions: 'totalDeductions',
  totalNet: 'totalNet',
  schoolId: 'schoolId',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.PayrollEntryScalarFieldEnum = {
  id: 'id',
  payrollRunId: 'payrollRunId',
  userId: 'userId',
  employeeName: 'employeeName',
  jobTitle: 'jobTitle',
  grossSalary: 'grossSalary',
  totalAllowances: 'totalAllowances',
  totalDeductions: 'totalDeductions',
  taxAmount: 'taxAmount',
  aidsLevy: 'aidsLevy',
  netSalary: 'netSalary',
  isPaid: 'isPaid',
  schoolId: 'schoolId',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.CBTExamScalarFieldEnum = {
  id: 'id',
  title: 'title',
  description: 'description',
  instructions: 'instructions',
  date: 'date',
  time: 'time',
  passingPercent: 'passingPercent',
  totalMarks: 'totalMarks',
  status: 'status',
  classId: 'classId',
  sectionId: 'sectionId',
  subjectId: 'subjectId',
  schoolId: 'schoolId',
  teacherId: 'teacherId',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.CBTQuestionScalarFieldEnum = {
  id: 'id',
  examId: 'examId',
  type: 'type',
  mark: 'mark',
  question: 'question',
  options: 'options',
  answer: 'answer',
  section: 'section',
  page: 'page',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.CBTResultScalarFieldEnum = {
  id: 'id',
  examId: 'examId',
  studentId: 'studentId',
  score: 'score',
  totalMarks: 'totalMarks',
  status: 'status',
  responses: 'responses',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.LiveClassScalarFieldEnum = {
  id: 'id',
  schoolId: 'schoolId',
  teacherId: 'teacherId',
  classId: 'classId',
  section: 'section',
  title: 'title',
  platform: 'platform',
  meetingId: 'meetingId',
  meetingPassword: 'meetingPassword',
  date: 'date',
  timeStart: 'timeStart',
  timeEnd: 'timeEnd',
  remarks: 'remarks',
  sendSms: 'sendSms',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.AwardScalarFieldEnum = {
  id: 'id',
  schoolId: 'schoolId',
  userId: 'userId',
  awardName: 'awardName',
  gift: 'gift',
  amount: 'amount',
  date: 'date',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.CourseScalarFieldEnum = {
  id: 'id',
  schoolId: 'schoolId',
  teacherId: 'teacherId',
  classId: 'classId',
  title: 'title',
  courseType: 'courseType',
  level: 'level',
  language: 'language',
  category: 'category',
  shortDescription: 'shortDescription',
  fullDescription: 'fullDescription',
  status: 'status',
  price: 'price',
  isFree: 'isFree',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.CourseEnrollmentScalarFieldEnum = {
  id: 'id',
  courseId: 'courseId',
  studentId: 'studentId',
  enrolledAt: 'enrolledAt'
};

exports.Prisma.StudyMaterialScalarFieldEnum = {
  id: 'id',
  schoolId: 'schoolId',
  title: 'title',
  date: 'date',
  classId: 'classId',
  subjectId: 'subjectId',
  teacherId: 'teacherId',
  description: 'description',
  documentUrl: 'documentUrl',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.WebsiteSettingsScalarFieldEnum = {
  id: 'id',
  schoolId: 'schoolId',
  bannerTitle: 'bannerTitle',
  bannerSubTitleOne: 'bannerSubTitleOne',
  bannerSubTitleTwo: 'bannerSubTitleTwo',
  bannerSubContentTwo: 'bannerSubContentTwo',
  bannerSubTitleThree: 'bannerSubTitleThree',
  bannerSubContentThree: 'bannerSubContentThree',
  applyTitle: 'applyTitle',
  applyContent: 'applyContent',
  bannerTitleColor: 'bannerTitleColor',
  schoolPrimaryColor: 'schoolPrimaryColor',
  bannerImage: 'bannerImage',
  aboutTitle: 'aboutTitle',
  youtubeLink: 'youtubeLink',
  directorName: 'directorName',
  directorTitle: 'directorTitle',
  countryOfEstablishment: 'countryOfEstablishment',
  yearOfEstablishment: 'yearOfEstablishment',
  aboutFeatures: 'aboutFeatures',
  aboutUsContent: 'aboutUsContent',
  directorImage: 'directorImage',
  campusTitle: 'campusTitle',
  campusContent: 'campusContent',
  campusImages: 'campusImages',
  admissionProcedure: 'admissionProcedure',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.WebsiteInquiryScalarFieldEnum = {
  id: 'id',
  name: 'name',
  email: 'email',
  phone: 'phone',
  message: 'message',
  schoolId: 'schoolId',
  createdAt: 'createdAt'
};

exports.Prisma.NoticeboardScalarFieldEnum = {
  id: 'id',
  title: 'title',
  content: 'content',
  date: 'date',
  schoolId: 'schoolId',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.VacancyScalarFieldEnum = {
  id: 'id',
  schoolId: 'schoolId',
  jobTitle: 'jobTitle',
  departmentId: 'departmentId',
  skills: 'skills',
  location: 'location',
  interviewRounds: 'interviewRounds',
  numberOfVacancies: 'numberOfVacancies',
  startDate: 'startDate',
  endDate: 'endDate',
  status: 'status',
  recruiterId: 'recruiterId',
  jobType: 'jobType',
  workExperience: 'workExperience',
  currency: 'currency',
  showPaymentMethodBy: 'showPaymentMethodBy',
  rate: 'rate',
  isRemote: 'isRemote',
  discloseSalary: 'discloseSalary',
  requiredFields: 'requiredFields',
  shortDescription: 'shortDescription',
  fullDescription: 'fullDescription',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.JobApplicationScalarFieldEnum = {
  id: 'id',
  schoolId: 'schoolId',
  vacancyId: 'vacancyId',
  applicantName: 'applicantName',
  gender: 'gender',
  email: 'email',
  phone: 'phone',
  qualification: 'qualification',
  skills: 'skills',
  workExperience: 'workExperience',
  address: 'address',
  coverLetter: 'coverLetter',
  status: 'status',
  resumeUrl: 'resumeUrl',
  photoUrl: 'photoUrl',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.SchoolVehicleScalarFieldEnum = {
  id: 'id',
  name: 'name',
  number: 'number',
  model: 'model',
  quantity: 'quantity',
  yearMade: 'yearMade',
  driverName: 'driverName',
  driverLicense: 'driverLicense',
  driverContact: 'driverContact',
  status: 'status',
  description: 'description',
  schoolId: 'schoolId',
  createdAt: 'createdAt'
};

exports.Prisma.SchoolTransportScalarFieldEnum = {
  id: 'id',
  name: 'name',
  routeId: 'routeId',
  vehicleId: 'vehicleId',
  routeFare: 'routeFare',
  description: 'description',
  schoolId: 'schoolId',
  createdAt: 'createdAt'
};

exports.Prisma.MeetingMinutesScalarFieldEnum = {
  id: 'id',
  schoolId: 'schoolId',
  date: 'date',
  title: 'title',
  attendees: 'attendees',
  status: 'status',
  documentUrl: 'documentUrl',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.ProjectFundingScalarFieldEnum = {
  id: 'id',
  schoolId: 'schoolId',
  name: 'name',
  budget: 'budget',
  spent: 'spent',
  status: 'status',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.ClinicAppointmentScalarFieldEnum = {
  id: 'id',
  userId: 'userId',
  appointment: 'appointment',
  symptoms: 'symptoms',
  medicine: 'medicine',
  date: 'date',
  schoolId: 'schoolId',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.ClinicComplaintScalarFieldEnum = {
  id: 'id',
  userId: 'userId',
  title: 'title',
  symptoms: 'symptoms',
  date: 'date',
  medicine: 'medicine',
  schoolId: 'schoolId',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.ClinicEmergencyScalarFieldEnum = {
  id: 'id',
  title: 'title',
  details: 'details',
  date: 'date',
  time: 'time',
  schoolId: 'schoolId',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.ClinicImmunizationScalarFieldEnum = {
  id: 'id',
  userId: 'userId',
  title: 'title',
  details: 'details',
  date: 'date',
  schoolId: 'schoolId',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.ClinicReferralScalarFieldEnum = {
  id: 'id',
  userId: 'userId',
  title: 'title',
  details: 'details',
  date: 'date',
  to: 'to',
  address: 'address',
  schoolId: 'schoolId',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.FarmLivestockBatchScalarFieldEnum = {
  id: 'id',
  batchName: 'batchName',
  type: 'type',
  datePlaced: 'datePlaced',
  currentCount: 'currentCount',
  startCount: 'startCount',
  mortalityRate: 'mortalityRate',
  status: 'status',
  schoolId: 'schoolId',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.FarmCropCycleScalarFieldEnum = {
  id: 'id',
  name: 'name',
  type: 'type',
  sector: 'sector',
  datePlanted: 'datePlanted',
  expectedHarvest: 'expectedHarvest',
  status: 'status',
  schoolId: 'schoolId',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.FarmInventoryItemScalarFieldEnum = {
  id: 'id',
  name: 'name',
  category: 'category',
  quantity: 'quantity',
  condition: 'condition',
  schoolId: 'schoolId',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.DiningHallReportScalarFieldEnum = {
  id: 'id',
  category: 'category',
  rating: 'rating',
  feedback: 'feedback',
  reportedById: 'reportedById',
  schoolId: 'schoolId',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.PrefectDutyScalarFieldEnum = {
  id: 'id',
  prefectName: 'prefectName',
  zone: 'zone',
  timeSlot: 'timeSlot',
  day: 'day',
  schoolId: 'schoolId',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.PrefectMeetingScalarFieldEnum = {
  id: 'id',
  title: 'title',
  date: 'date',
  chair: 'chair',
  recordsText: 'recordsText',
  schoolId: 'schoolId',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.PrefectReportScalarFieldEnum = {
  id: 'id',
  studentName: 'studentName',
  category: 'category',
  narrative: 'narrative',
  reportedById: 'reportedById',
  schoolId: 'schoolId',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.StudentWalletScalarFieldEnum = {
  id: 'id',
  studentId: 'studentId',
  balance: 'balance',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.WalletTransactionScalarFieldEnum = {
  id: 'id',
  walletId: 'walletId',
  amount: 'amount',
  type: 'type',
  description: 'description',
  createdAt: 'createdAt',
  referenceId: 'referenceId',
  referenceType: 'referenceType'
};

exports.Prisma.SchoolSequenceScalarFieldEnum = {
  id: 'id',
  schoolId: 'schoolId',
  entity: 'entity',
  lastValue: 'lastValue'
};

exports.Prisma.SortOrder = {
  asc: 'asc',
  desc: 'desc'
};

exports.Prisma.NullableJsonNullValueInput = {
  DbNull: Prisma.DbNull,
  JsonNull: Prisma.JsonNull
};

exports.Prisma.JsonNullValueInput = {
  JsonNull: Prisma.JsonNull
};

exports.Prisma.QueryMode = {
  default: 'default',
  insensitive: 'insensitive'
};

exports.Prisma.JsonNullValueFilter = {
  DbNull: Prisma.DbNull,
  JsonNull: Prisma.JsonNull,
  AnyNull: Prisma.AnyNull
};

exports.Prisma.NullsOrder = {
  first: 'first',
  last: 'last'
};


exports.Prisma.ModelName = {
  Plan: 'Plan',
  School: 'School',
  GradingScale: 'GradingScale',
  HostelCategory: 'HostelCategory',
  HostelRoom: 'HostelRoom',
  UniformItem: 'UniformItem',
  UniformStockOrder: 'UniformStockOrder',
  UniformStockOrderItem: 'UniformStockOrderItem',
  UniformSale: 'UniformSale',
  UniformSaleItem: 'UniformSaleItem',
  UniformSupplierPayment: 'UniformSupplierPayment',
  AccountCategory: 'AccountCategory',
  Liability: 'Liability',
  Income: 'Income',
  Expense: 'Expense',
  User: 'User',
  UserSession: 'UserSession',
  Teacher: 'Teacher',
  Student: 'Student',
  SchoolClass: 'SchoolClass',
  Section: 'Section',
  Subject: 'Subject',
  TeacherSubject: 'TeacherSubject',
  ClassSubjectTeacher: 'ClassSubjectTeacher',
  Grade: 'Grade',
  Faculty: 'Faculty',
  Department: 'Department',
  Attendance: 'Attendance',
  StaffAttendance: 'StaffAttendance',
  Fee: 'Fee',
  FeeLineItem: 'FeeLineItem',
  Assignment: 'Assignment',
  QuestionPaper: 'QuestionPaper',
  TimetableSlot: 'TimetableSlot',
  Announcement: 'Announcement',
  AuditLog: 'AuditLog',
  Book: 'Book',
  StudentHouse: 'StudentHouse',
  ChaplaincyEvent: 'ChaplaincyEvent',
  Holiday: 'Holiday',
  LibraryCategory: 'LibraryCategory',
  BookLoan: 'BookLoan',
  AssignmentSubmission: 'AssignmentSubmission',
  News: 'News',
  SchoolSetting: 'SchoolSetting',
  PaymentPlan: 'PaymentPlan',
  Gallery: 'Gallery',
  Club: 'Club',
  Sport: 'Sport',
  SportingEquipment: 'SportingEquipment',
  Application: 'Application',
  Supplier: 'Supplier',
  SchoolSupplier: 'SchoolSupplier',
  Parent: 'Parent',
  ParentStudent: 'ParentStudent',
  Tender: 'Tender',
  TenderBid: 'TenderBid',
  PurchaseOrder: 'PurchaseOrder',
  Invoice: 'Invoice',
  Message: 'Message',
  SupportTicket: 'SupportTicket',
  StaffLeave: 'StaffLeave',
  Asset: 'Asset',
  AssetIncident: 'AssetIncident',
  AssetMaintenance: 'AssetMaintenance',
  TransportRoute: 'TransportRoute',
  SchoolEvent: 'SchoolEvent',
  TuckshopItem: 'TuckshopItem',
  TuckshopSale: 'TuckshopSale',
  DigitalResource: 'DigitalResource',
  Syllabus: 'Syllabus',
  LessonPlan: 'LessonPlan',
  SalaryStub: 'SalaryStub',
  ShiftAssignment: 'ShiftAssignment',
  ApplicantDocument: 'ApplicantDocument',
  ApplicantTimeline: 'ApplicantTimeline',
  AcademicReport: 'AcademicReport',
  ReportTemplate: 'ReportTemplate',
  Requisition: 'Requisition',
  Hostel: 'Hostel',
  Room: 'Room',
  BoardingLog: 'BoardingLog',
  VisitorLog: 'VisitorLog',
  AdmissionInquiry: 'AdmissionInquiry',
  PhoneCallLog: 'PhoneCallLog',
  FrontOfficeComplaint: 'FrontOfficeComplaint',
  SecurityIncident: 'SecurityIncident',
  WeeklyMenu: 'WeeklyMenu',
  TransferAuthorization: 'TransferAuthorization',
  SupervisorAssignment: 'SupervisorAssignment',
  ExtensionRequest: 'ExtensionRequest',
  ProgressReport: 'ProgressReport',
  PaymentMethod: 'PaymentMethod',
  FeeGroup: 'FeeGroup',
  FeeGroupClassAmount: 'FeeGroupClassAmount',
  PhysicalProduct: 'PhysicalProduct',
  PhysicalProductConsumption: 'PhysicalProductConsumption',
  FeeReminderLog: 'FeeReminderLog',
  StudentPayment: 'StudentPayment',
  CommunicationLog: 'CommunicationLog',
  NotificationQueue: 'NotificationQueue',
  RevenueAllocation: 'RevenueAllocation',
  PayrollAllowance: 'PayrollAllowance',
  PayrollDeduction: 'PayrollDeduction',
  TaxTable: 'TaxTable',
  TaxBand: 'TaxBand',
  EmployeeProfile: 'EmployeeProfile',
  TermlyComment: 'TermlyComment',
  PayrollRun: 'PayrollRun',
  PayrollEntry: 'PayrollEntry',
  CBTExam: 'CBTExam',
  CBTQuestion: 'CBTQuestion',
  CBTResult: 'CBTResult',
  LiveClass: 'LiveClass',
  Award: 'Award',
  Course: 'Course',
  CourseEnrollment: 'CourseEnrollment',
  StudyMaterial: 'StudyMaterial',
  WebsiteSettings: 'WebsiteSettings',
  WebsiteInquiry: 'WebsiteInquiry',
  Noticeboard: 'Noticeboard',
  Vacancy: 'Vacancy',
  JobApplication: 'JobApplication',
  SchoolVehicle: 'SchoolVehicle',
  SchoolTransport: 'SchoolTransport',
  MeetingMinutes: 'MeetingMinutes',
  ProjectFunding: 'ProjectFunding',
  ClinicAppointment: 'ClinicAppointment',
  ClinicComplaint: 'ClinicComplaint',
  ClinicEmergency: 'ClinicEmergency',
  ClinicImmunization: 'ClinicImmunization',
  ClinicReferral: 'ClinicReferral',
  FarmLivestockBatch: 'FarmLivestockBatch',
  FarmCropCycle: 'FarmCropCycle',
  FarmInventoryItem: 'FarmInventoryItem',
  DiningHallReport: 'DiningHallReport',
  PrefectDuty: 'PrefectDuty',
  PrefectMeeting: 'PrefectMeeting',
  PrefectReport: 'PrefectReport',
  StudentWallet: 'StudentWallet',
  WalletTransaction: 'WalletTransaction',
  SchoolSequence: 'SchoolSequence'
};

/**
 * This is a stub Prisma Client that will error at runtime if called.
 */
class PrismaClient {
  constructor() {
    return new Proxy(this, {
      get(target, prop) {
        let message
        const runtime = getRuntime()
        if (runtime.isEdge) {
          message = `PrismaClient is not configured to run in ${runtime.prettyName}. In order to run Prisma Client on edge runtime, either:
- Use Prisma Accelerate: https://pris.ly/d/accelerate
- Use Driver Adapters: https://pris.ly/d/driver-adapters
`;
        } else {
          message = 'PrismaClient is unable to run in this browser environment, or has been bundled for the browser (running in `' + runtime.prettyName + '`).'
        }
        
        message += `
If this is unexpected, please open an issue: https://pris.ly/prisma-prisma-bug-report`

        throw new Error(message)
      }
    })
  }
}

exports.PrismaClient = PrismaClient

Object.assign(exports, Prisma)
