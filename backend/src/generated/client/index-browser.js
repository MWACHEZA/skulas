
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
  settings: 'settings',
  subscription: 'subscription'
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

exports.Prisma.LeadershipAssignmentScalarFieldEnum = {
  id: 'id',
  schoolId: 'schoolId',
  studentId: 'studentId',
  leadershipRole: 'leadershipRole',
  hostelId: 'hostelId',
  term: 'term',
  academicYear: 'academicYear',
  isActive: 'isActive',
  assignedById: 'assignedById',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.StudentAllowedItemScalarFieldEnum = {
  id: 'id',
  schoolId: 'schoolId',
  itemSku: 'itemSku',
  itemName: 'itemName',
  category: 'category',
  isActive: 'isActive',
  createdAt: 'createdAt'
};

exports.Prisma.UniformItemScalarFieldEnum = {
  id: 'id',
  name: 'name',
  orderPrice: 'orderPrice',
  sellingPrice: 'sellingPrice',
  costPrice: 'costPrice',
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
  nationalId: 'nationalId',
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
  createdById: 'createdById',
  gradingType: 'gradingType',
  moderatedScale: 'moderatedScale',
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
  assessmentEntries: 'assessmentEntries',
  classAverage: 'classAverage',
  classPosition: 'classPosition',
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
  incomeAccountId: 'incomeAccountId',
  arAccountId: 'arAccountId',
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

exports.Prisma.StudentInvoiceScalarFieldEnum = {
  id: 'id',
  schoolId: 'schoolId',
  studentId: 'studentId',
  termId: 'termId',
  term: 'term',
  year: 'year',
  batchId: 'batchId',
  invoiceNumber: 'invoiceNumber',
  totalAmount: 'totalAmount',
  currency: 'currency',
  status: 'status',
  sourceModule: 'sourceModule',
  sourceId: 'sourceId',
  idempotencyKey: 'idempotencyKey',
  journalEntryId: 'journalEntryId',
  dueDate: 'dueDate',
  createdBy: 'createdBy',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.StudentInvoiceItemScalarFieldEnum = {
  id: 'id',
  invoiceId: 'invoiceId',
  billingItemCode: 'billingItemCode',
  description: 'description',
  quantity: 'quantity',
  unitPrice: 'unitPrice',
  totalAmount: 'totalAmount',
  revenueAccountCode: 'revenueAccountCode',
  createdAt: 'createdAt'
};

exports.Prisma.ReceiptScalarFieldEnum = {
  id: 'id',
  schoolId: 'schoolId',
  studentId: 'studentId',
  receiptNumber: 'receiptNumber',
  amount: 'amount',
  paymentCurrency: 'paymentCurrency',
  invoiceCurrency: 'invoiceCurrency',
  exchangeRate: 'exchangeRate',
  paymentMethod: 'paymentMethod',
  idempotencyKey: 'idempotencyKey',
  fiscalSignature: 'fiscalSignature',
  fiscalQr: 'fiscalQr',
  fiscalReceiptNumber: 'fiscalReceiptNumber',
  receivedBy: 'receivedBy',
  status: 'status',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.PaymentAllocationScalarFieldEnum = {
  id: 'id',
  receiptId: 'receiptId',
  invoiceId: 'invoiceId',
  invoiceItemId: 'invoiceItemId',
  allocatedAmount: 'allocatedAmount',
  type: 'type',
  createdAt: 'createdAt'
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
  body: 'body',
  category: 'category',
  priority: 'priority',
  audience: 'audience',
  targetClassId: 'targetClassId',
  isPinned: 'isPinned',
  expiryDate: 'expiryDate',
  createdById: 'createdById',
  targetRole: 'targetRole',
  visiblePortals: 'visiblePortals',
  isPublic: 'isPublic',
  schoolId: 'schoolId',
  publishedAt: 'publishedAt',
  expiresAt: 'expiresAt',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.AnnouncementReadScalarFieldEnum = {
  id: 'id',
  announcementId: 'announcementId',
  userId: 'userId',
  readAt: 'readAt'
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
  status: 'status',
  createdAt: 'createdAt'
};

exports.Prisma.BookScalarFieldEnum = {
  id: 'id',
  title: 'title',
  author: 'author',
  authors: 'authors',
  isbn: 'isbn',
  isbn10: 'isbn10',
  isbn13: 'isbn13',
  edition: 'edition',
  publisher: 'publisher',
  price: 'price',
  publishedDate: 'publishedDate',
  description: 'description',
  status: 'status',
  shelfLocation: 'shelfLocation',
  barcode: 'barcode',
  accessionNumber: 'accessionNumber',
  language: 'language',
  keywords: 'keywords',
  source: 'source',
  condition: 'condition',
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
  accessionNumber: 'accessionNumber',
  waivedFine: 'waivedFine',
  paidFine: 'paidFine',
  fineCalculated: 'fineCalculated',
  lastReminderDate: 'lastReminderDate',
  lastReminderType: 'lastReminderType',
  invoiceId: 'invoiceId',
  schoolId: 'schoolId'
};

exports.Prisma.LibrarySettingScalarFieldEnum = {
  id: 'id',
  schoolId: 'schoolId',
  defaultLoanPeriodDays: 'defaultLoanPeriodDays',
  studentDailyFine: 'studentDailyFine',
  studentMaxFine: 'studentMaxFine',
  staffDailyFine: 'staffDailyFine',
  staffMaxFine: 'staffMaxFine',
  accrueOnWeekends: 'accrueOnWeekends',
  studentMaxLoans: 'studentMaxLoans',
  staffMaxLoans: 'staffMaxLoans',
  maxCopiesSameTitle: 'maxCopiesSameTitle',
  blockThresholdFine: 'blockThresholdFine',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.BookReservationScalarFieldEnum = {
  id: 'id',
  bookId: 'bookId',
  studentId: 'studentId',
  userId: 'userId',
  status: 'status',
  requestDate: 'requestDate',
  notifiedAt: 'notifiedAt',
  readyAt: 'readyAt',
  issuedAt: 'issuedAt',
  notes: 'notes',
  schoolId: 'schoolId',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.LibraryDigitalResourceScalarFieldEnum = {
  id: 'id',
  schoolId: 'schoolId',
  title: 'title',
  author: 'author',
  resourceType: 'resourceType',
  fileUrl: 'fileUrl',
  externalLink: 'externalLink',
  fileFormat: 'fileFormat',
  categoryId: 'categoryId',
  subjectId: 'subjectId',
  accessLevel: 'accessLevel',
  yearPublished: 'yearPublished',
  description: 'description',
  keywords: 'keywords',
  language: 'language',
  thumbnailUrl: 'thumbnailUrl',
  fileSize: 'fileSize',
  licenseStatus: 'licenseStatus',
  permissionGranted: 'permissionGranted',
  addedById: 'addedById',
  downloadCount: 'downloadCount',
  viewCount: 'viewCount',
  expiryDate: 'expiryDate',
  status: 'status',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
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
  financialApprovalThreshold: 'financialApprovalThreshold',
  tier1ApprovalRole: 'tier1ApprovalRole',
  tier2ApprovalRole: 'tier2ApprovalRole',
  debtorLimit: 'debtorLimit',
  tillVarianceThreshold: 'tillVarianceThreshold',
  allowNegativeStock: 'allowNegativeStock',
  vatNumber: 'vatNumber',
  vatRate: 'vatRate',
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
  mapLocation: 'mapLocation',
  mapLatitude: 'mapLatitude',
  mapLongitude: 'mapLongitude',
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
  setupStatus: 'setupStatus',
  housesModuleEnabled: 'housesModuleEnabled',
  transportGpsEnabled: 'transportGpsEnabled',
  transportTodayStatus: 'transportTodayStatus',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.PaymentPlanScalarFieldEnum = {
  id: 'id',
  schoolId: 'schoolId',
  studentId: 'studentId',
  parentUserId: 'parentUserId',
  totalAmount: 'totalAmount',
  planType: 'planType',
  installmentsCount: 'installmentsCount',
  status: 'status',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.PaymentPlanInstallmentScalarFieldEnum = {
  id: 'id',
  planId: 'planId',
  amount: 'amount',
  dueDate: 'dueDate',
  status: 'status',
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
  coverTeacherId: 'coverTeacherId',
  rejectionReason: 'rejectionReason',
  department: 'department',
  hodApprovedAt: 'hodApprovedAt',
  hodApprovedById: 'hodApprovedById',
  headApprovedAt: 'headApprovedAt',
  attachmentUrl: 'attachmentUrl',
  days: 'days',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.LeaveBalanceScalarFieldEnum = {
  id: 'id',
  schoolId: 'schoolId',
  userId: 'userId',
  annualTotal: 'annualTotal',
  annualUsed: 'annualUsed',
  sickTotal: 'sickTotal',
  sickUsed: 'sickUsed',
  compassionateTotal: 'compassionateTotal',
  compassionateUsed: 'compassionateUsed',
  maternityTotal: 'maternityTotal',
  maternityUsed: 'maternityUsed',
  studyTotal: 'studyTotal',
  studyUsed: 'studyUsed',
  unpaidTotal: 'unpaidTotal',
  unpaidUsed: 'unpaidUsed',
  academicYear: 'academicYear',
  updatedAt: 'updatedAt',
  createdAt: 'createdAt'
};

exports.Prisma.AssetScalarFieldEnum = {
  id: 'id',
  assetNumber: 'assetNumber',
  name: 'name',
  category: 'category',
  serialNumber: 'serialNumber',
  location: 'location',
  condition: 'condition',
  status: 'status',
  department: 'department',
  departmentId: 'departmentId',
  quantity: 'quantity',
  purchaseDate: 'purchaseDate',
  purchasePrice: 'purchasePrice',
  supplierName: 'supplierName',
  invoiceNumber: 'invoiceNumber',
  depreciationRate: 'depreciationRate',
  warrantyExpiry: 'warrantyExpiry',
  photoUrl: 'photoUrl',
  custodianId: 'custodianId',
  registeredById: 'registeredById',
  approvalStatus: 'approvalStatus',
  hodApprovedAt: 'hodApprovedAt',
  hodApprovedById: 'hodApprovedById',
  bursarApprovedAt: 'bursarApprovedAt',
  bursarApprovedById: 'bursarApprovedById',
  adminApprovedAt: 'adminApprovedAt',
  adminApprovedById: 'adminApprovedById',
  rejectionReason: 'rejectionReason',
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
  requisitionType: 'requisitionType',
  priority: 'priority',
  neededByDate: 'neededByDate',
  attachmentUrl: 'attachmentUrl',
  items: 'items',
  departmentId: 'departmentId',
  requesterId: 'requesterId',
  hodId: 'hodId',
  bursarId: 'bursarId',
  adminId: 'adminId',
  schoolId: 'schoolId',
  purchaseOrderId: 'purchaseOrderId',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt',
  requesterRole: 'requesterRole',
  hostelReqId: 'hostelReqId',
  requestedByStudentId: 'requestedByStudentId',
  matronApprovedAt: 'matronApprovedAt',
  matronApprovedById: 'matronApprovedById',
  rejectionReason: 'rejectionReason',
  issuedAt: 'issuedAt',
  issuedById: 'issuedById',
  receivedAt: 'receivedAt'
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
  createdAt: 'createdAt',
  wardenUserId: 'wardenUserId'
};

exports.Prisma.RoomScalarFieldEnum = {
  id: 'id',
  name: 'name',
  roomNumber: 'roomNumber',
  capacity: 'capacity',
  bedCount: 'bedCount',
  conditionStatus: 'conditionStatus',
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
  incomeAccountId: 'incomeAccountId',
  arAccountId: 'arAccountId',
  itemCode: 'itemCode',
  revenueAccountCode: 'revenueAccountCode',
  applicableTo: 'applicableTo',
  frequency: 'frequency',
  module: 'module',
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
  hostelId: 'hostelId',
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
  journalEntryId: 'journalEntryId',
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

exports.Prisma.ClinicPatientScalarFieldEnum = {
  id: 'id',
  schoolId: 'schoolId',
  userId: 'userId',
  mrn: 'mrn',
  firstName: 'firstName',
  lastName: 'lastName',
  dob: 'dob',
  gender: 'gender',
  contactNumber: 'contactNumber',
  address: 'address',
  bloodType: 'bloodType',
  allergies: 'allergies',
  chronicConditions: 'chronicConditions',
  guardianName: 'guardianName',
  guardianContact: 'guardianContact',
  medicalHistory: 'medicalHistory',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.ClinicAppointmentScalarFieldEnum = {
  id: 'id',
  userId: 'userId',
  patientId: 'patientId',
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
  patientId: 'patientId',
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
  patientId: 'patientId',
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
  patientId: 'patientId',
  title: 'title',
  details: 'details',
  vaccine: 'vaccine',
  doseNumber: 'doseNumber',
  nextDueDate: 'nextDueDate',
  administeredBy: 'administeredBy',
  date: 'date',
  schoolId: 'schoolId',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.ClinicReferralScalarFieldEnum = {
  id: 'id',
  userId: 'userId',
  patientId: 'patientId',
  title: 'title',
  details: 'details',
  date: 'date',
  to: 'to',
  address: 'address',
  urgency: 'urgency',
  status: 'status',
  outcomeNotes: 'outcomeNotes',
  schoolId: 'schoolId',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.ClinicVisitScalarFieldEnum = {
  id: 'id',
  visitCode: 'visitCode',
  userId: 'userId',
  patientId: 'patientId',
  schoolId: 'schoolId',
  temperature: 'temperature',
  bloodPressure: 'bloodPressure',
  heartRate: 'heartRate',
  respiratoryRate: 'respiratoryRate',
  weight: 'weight',
  height: 'height',
  oxygenSaturation: 'oxygenSaturation',
  presentingComplaint: 'presentingComplaint',
  triageLevel: 'triageLevel',
  conditionDetails: 'conditionDetails',
  diagnosis: 'diagnosis',
  treatment: 'treatment',
  prescription: 'prescription',
  notes: 'notes',
  source: 'source',
  acuity: 'acuity',
  isEmergency: 'isEmergency',
  isConfidential: 'isConfidential',
  disposition: 'disposition',
  triageById: 'triageById',
  consultedById: 'consultedById',
  closedAt: 'closedAt',
  status: 'status',
  visitDate: 'visitDate',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.ClinicInventoryItemScalarFieldEnum = {
  id: 'id',
  schoolId: 'schoolId',
  name: 'name',
  category: 'category',
  batchNumber: 'batchNumber',
  expiryDate: 'expiryDate',
  unit: 'unit',
  stock: 'stock',
  reorderLevel: 'reorderLevel',
  unitCost: 'unitCost',
  unitPrice: 'unitPrice',
  location: 'location',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.ClinicDispensingLogScalarFieldEnum = {
  id: 'id',
  schoolId: 'schoolId',
  itemId: 'itemId',
  visitId: 'visitId',
  patientId: 'patientId',
  quantity: 'quantity',
  unitCost: 'unitCost',
  totalPrice: 'totalPrice',
  dispensedBy: 'dispensedBy',
  notes: 'notes',
  dispensedAt: 'dispensedAt'
};

exports.Prisma.ClinicHospitalizationScalarFieldEnum = {
  id: 'id',
  userId: 'userId',
  patientId: 'patientId',
  schoolId: 'schoolId',
  stage: 'stage',
  preAdmissionData: 'preAdmissionData',
  admissionData: 'admissionData',
  transferData: 'transferData',
  dischargeData: 'dischargeData',
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
  studentId: 'studentId',
  date: 'date',
  role: 'role',
  status: 'status',
  schoolId: 'schoolId',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.PrefectMeetingScalarFieldEnum = {
  id: 'id',
  date: 'date',
  chairId: 'chairId',
  agenda: 'agenda',
  minutes: 'minutes',
  status: 'status',
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
  hasPunishment: 'hasPunishment',
  punishment: 'punishment',
  punishmentLocation: 'punishmentLocation',
  punishmentStatus: 'punishmentStatus',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.StudentWalletScalarFieldEnum = {
  id: 'id',
  studentId: 'studentId',
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

exports.Prisma.Icd10CodeScalarFieldEnum = {
  id: 'id',
  code: 'code',
  description: 'description',
  category: 'category',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.ChartOfAccountScalarFieldEnum = {
  id: 'id',
  schoolId: 'schoolId',
  code: 'code',
  name: 'name',
  type: 'type',
  parentId: 'parentId',
  isSystemAccount: 'isSystemAccount',
  isBank: 'isBank',
  isTemplate: 'isTemplate',
  isActive: 'isActive',
  description: 'description',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.JournalEntryScalarFieldEnum = {
  id: 'id',
  schoolId: 'schoolId',
  entryNumber: 'entryNumber',
  date: 'date',
  description: 'description',
  status: 'status',
  currency: 'currency',
  exchangeRateUsed: 'exchangeRateUsed',
  ipAddress: 'ipAddress',
  isReversing: 'isReversing',
  reversedById: 'reversedById',
  isReversed: 'isReversed',
  reversedByCnId: 'reversedByCnId',
  sourceType: 'sourceType',
  sourceId: 'sourceId',
  period: 'period',
  isLocked: 'isLocked',
  createdByUserId: 'createdByUserId',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.JournalEntryLineScalarFieldEnum = {
  id: 'id',
  journalEntryId: 'journalEntryId',
  accountId: 'accountId',
  schoolId: 'schoolId',
  coaCode: 'coaCode',
  description: 'description',
  debit: 'debit',
  credit: 'credit',
  baseAmount: 'baseAmount',
  taxCode: 'taxCode',
  currency: 'currency',
  exchangeRate: 'exchangeRate',
  debitForeign: 'debitForeign',
  creditForeign: 'creditForeign',
  studentId: 'studentId',
  supplierId: 'supplierId',
  isReconciled: 'isReconciled',
  reconciledAt: 'reconciledAt',
  bankLineId: 'bankLineId',
  createdAt: 'createdAt'
};

exports.Prisma.AccountingPeriodScalarFieldEnum = {
  id: 'id',
  schoolId: 'schoolId',
  period: 'period',
  year: 'year',
  term: 'term',
  startDate: 'startDate',
  endDate: 'endDate',
  status: 'status',
  closedBy: 'closedBy',
  closedAt: 'closedAt',
  notes: 'notes',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.ExchangeRateScalarFieldEnum = {
  id: 'id',
  schoolId: 'schoolId',
  date: 'date',
  fromCurrency: 'fromCurrency',
  toCurrency: 'toCurrency',
  rate: 'rate',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.ApprovalScalarFieldEnum = {
  id: 'id',
  schoolId: 'schoolId',
  entityType: 'entityType',
  entityId: 'entityId',
  requestedBy: 'requestedBy',
  amount: 'amount',
  currency: 'currency',
  status: 'status',
  tier: 'tier',
  approverRole: 'approverRole',
  approvedBy: 'approvedBy',
  approvedAt: 'approvedAt',
  rejectionReason: 'rejectionReason',
  thresholdRule: 'thresholdRule',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.BudgetScalarFieldEnum = {
  id: 'id',
  schoolId: 'schoolId',
  year: 'year',
  term: 'term',
  coaCode: 'coaCode',
  amount: 'amount',
  currency: 'currency',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.StockMovementScalarFieldEnum = {
  id: 'id',
  schoolId: 'schoolId',
  module: 'module',
  itemId: 'itemId',
  itemName: 'itemName',
  batchNumber: 'batchNumber',
  direction: 'direction',
  quantity: 'quantity',
  unitCost: 'unitCost',
  totalCost: 'totalCost',
  date: 'date',
  reference: 'reference',
  journalEntryId: 'journalEntryId',
  createdAt: 'createdAt'
};

exports.Prisma.TaxBracketScalarFieldEnum = {
  id: 'id',
  schoolId: 'schoolId',
  currency: 'currency',
  effectiveFrom: 'effectiveFrom',
  effectiveTo: 'effectiveTo',
  minIncome: 'minIncome',
  maxIncome: 'maxIncome',
  rate: 'rate',
  deduction: 'deduction',
  aidsLevyRate: 'aidsLevyRate',
  nssaCeiling: 'nssaCeiling',
  nssaRate: 'nssaRate',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.UniformStockMovementScalarFieldEnum = {
  id: 'id',
  schoolId: 'schoolId',
  itemId: 'itemId',
  movementType: 'movementType',
  quantity: 'quantity',
  unitCost: 'unitCost',
  totalCost: 'totalCost',
  reference: 'reference',
  sourceType: 'sourceType',
  sourceId: 'sourceId',
  journalEntryId: 'journalEntryId',
  createdAt: 'createdAt'
};

exports.Prisma.BankStatementScalarFieldEnum = {
  id: 'id',
  schoolId: 'schoolId',
  accountId: 'accountId',
  period: 'period',
  reference: 'reference',
  uploadedAt: 'uploadedAt'
};

exports.Prisma.BankStatementLineScalarFieldEnum = {
  id: 'id',
  statementId: 'statementId',
  date: 'date',
  description: 'description',
  debit: 'debit',
  credit: 'credit',
  balance: 'balance',
  isReconciled: 'isReconciled',
  journalLineId: 'journalLineId',
  matchedAt: 'matchedAt',
  matchedBy: 'matchedBy'
};

exports.Prisma.PlatformSettingScalarFieldEnum = {
  id: 'id',
  platformName: 'platformName',
  supportEmail: 'supportEmail',
  supportPhone: 'supportPhone',
  billingCurrency: 'billingCurrency',
  studentMonthlyRate: 'studentMonthlyRate',
  trialDays: 'trialDays',
  maintenanceMode: 'maintenanceMode',
  allowSelfRegistration: 'allowSelfRegistration',
  backupFrequency: 'backupFrequency',
  maxUploadSizeMb: 'maxUploadSizeMb',
  smtpHost: 'smtpHost',
  smtpPort: 'smtpPort',
  smtpEmail: 'smtpEmail',
  smtpPassword: 'smtpPassword',
  smtpSsl: 'smtpSsl',
  securityAlertEmails: 'securityAlertEmails',
  updatedAt: 'updatedAt',
  createdAt: 'createdAt'
};

exports.Prisma.Icd10ParentLabelScalarFieldEnum = {
  id: 'id',
  code: 'code',
  plainLabel: 'plainLabel',
  createdAt: 'createdAt'
};

exports.Prisma.StudentHealthProfileScalarFieldEnum = {
  id: 'id',
  schoolId: 'schoolId',
  studentId: 'studentId',
  allergies: 'allergies',
  chronicConditions: 'chronicConditions',
  bloodGroup: 'bloodGroup',
  emergencyContactName: 'emergencyContactName',
  emergencyContactPhone: 'emergencyContactPhone',
  emergencyContactRel: 'emergencyContactRel',
  treatmentConsent: 'treatmentConsent',
  consentBy: 'consentBy',
  consentedAt: 'consentedAt',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.ClinicVitalScalarFieldEnum = {
  id: 'id',
  schoolId: 'schoolId',
  visitId: 'visitId',
  temp: 'temp',
  bp: 'bp',
  pulse: 'pulse',
  spo2: 'spo2',
  weight: 'weight',
  height: 'height',
  recordedById: 'recordedById',
  recordedAt: 'recordedAt'
};

exports.Prisma.ClinicDiagnosisScalarFieldEnum = {
  id: 'id',
  schoolId: 'schoolId',
  visitId: 'visitId',
  icd10Code: 'icd10Code',
  notes: 'notes',
  parentNote: 'parentNote',
  createdAt: 'createdAt'
};

exports.Prisma.ClinicPrescriptionScalarFieldEnum = {
  id: 'id',
  schoolId: 'schoolId',
  visitId: 'visitId',
  drugName: 'drugName',
  dosage: 'dosage',
  frequency: 'frequency',
  duration: 'duration',
  prescribedById: 'prescribedById',
  createdAt: 'createdAt'
};

exports.Prisma.PharmacyStockScalarFieldEnum = {
  id: 'id',
  schoolId: 'schoolId',
  drugName: 'drugName',
  category: 'category',
  unit: 'unit',
  minStock: 'minStock',
  location: 'location',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.PharmacyBatchScalarFieldEnum = {
  id: 'id',
  schoolId: 'schoolId',
  stockId: 'stockId',
  batchNumber: 'batchNumber',
  quantity: 'quantity',
  expiryDate: 'expiryDate',
  receivedAt: 'receivedAt'
};

exports.Prisma.PharmacyDispenseScalarFieldEnum = {
  id: 'id',
  schoolId: 'schoolId',
  visitId: 'visitId',
  stockId: 'stockId',
  batchId: 'batchId',
  quantity: 'quantity',
  dispensedById: 'dispensedById',
  dispensedAt: 'dispensedAt'
};

exports.Prisma.ClinicBedScalarFieldEnum = {
  id: 'id',
  schoolId: 'schoolId',
  bedNumber: 'bedNumber',
  ward: 'ward',
  status: 'status',
  notes: 'notes',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.ClinicAdmissionScalarFieldEnum = {
  id: 'id',
  schoolId: 'schoolId',
  bedId: 'bedId',
  visitId: 'visitId',
  studentId: 'studentId',
  status: 'status',
  dietNotes: 'dietNotes',
  dischargeNotes: 'dischargeNotes',
  admittedAt: 'admittedAt',
  dischargedAt: 'dischargedAt',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.ClinicMonitoringLogScalarFieldEnum = {
  id: 'id',
  schoolId: 'schoolId',
  admissionId: 'admissionId',
  temp: 'temp',
  bp: 'bp',
  pulse: 'pulse',
  spo2: 'spo2',
  notes: 'notes',
  recordedById: 'recordedById',
  recordedAt: 'recordedAt'
};

exports.Prisma.ClinicAccessAuditScalarFieldEnum = {
  id: 'id',
  schoolId: 'schoolId',
  studentId: 'studentId',
  userId: 'userId',
  action: 'action',
  resource: 'resource',
  ipAddress: 'ipAddress',
  createdAt: 'createdAt'
};

exports.Prisma.ClinicEmergencyLogScalarFieldEnum = {
  id: 'id',
  schoolId: 'schoolId',
  visitId: 'visitId',
  studentId: 'studentId',
  title: 'title',
  description: 'description',
  acuity: 'acuity',
  ambulanceCalled: 'ambulanceCalled',
  ambulanceDetails: 'ambulanceDetails',
  parentContacted: 'parentContacted',
  parentContactPhone: 'parentContactPhone',
  parentContactNotes: 'parentContactNotes',
  photoUrls: 'photoUrls',
  loggedById: 'loggedById',
  createdAt: 'createdAt'
};

exports.Prisma.ClinicSettingScalarFieldEnum = {
  id: 'id',
  schoolId: 'schoolId',
  hasDoctorQueue: 'hasDoctorQueue',
  bedCount: 'bedCount',
  monitoringIntervalHours: 'monitoringIntervalHours',
  tempAlertThreshold: 'tempAlertThreshold',
  billingEnabled: 'billingEnabled',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.FiscalDeviceScalarFieldEnum = {
  id: 'id',
  schoolId: 'schoolId',
  serialNo: 'serialNo',
  deviceModel: 'deviceModel',
  location: 'location',
  apiUrl: 'apiUrl',
  isActive: 'isActive',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.FiscalDeviceSecretScalarFieldEnum = {
  id: 'id',
  deviceId: 'deviceId',
  schoolId: 'schoolId',
  activationKey: 'activationKey',
  apiToken: 'apiToken',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.FiscalInvoiceScalarFieldEnum = {
  id: 'id',
  schoolId: 'schoolId',
  glTransactionId: 'glTransactionId',
  deviceId: 'deviceId',
  receiptNo: 'receiptNo',
  fiscalCode: 'fiscalCode',
  fiscalDayNo: 'fiscalDayNo',
  qrCode: 'qrCode',
  receiptHash: 'receiptHash',
  payload: 'payload',
  response: 'response',
  status: 'status',
  amount: 'amount',
  vatAmount: 'vatAmount',
  currency: 'currency',
  paymentMethod: 'paymentMethod',
  isCreditNote: 'isCreditNote',
  originalFiscalId: 'originalFiscalId',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.DocumentSequenceScalarFieldEnum = {
  id: 'id',
  schoolId: 'schoolId',
  prefix: 'prefix',
  description: 'description',
  lastNumber: 'lastNumber',
  year: 'year',
  format: 'format',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.CreditNoteScalarFieldEnum = {
  id: 'id',
  schoolId: 'schoolId',
  creditNoteNumber: 'creditNoteNumber',
  originalJournalEntryId: 'originalJournalEntryId',
  reversalJournalEntryId: 'reversalJournalEntryId',
  fiscalInvoiceId: 'fiscalInvoiceId',
  reason: 'reason',
  totalAmount: 'totalAmount',
  totalVat: 'totalVat',
  currency: 'currency',
  issuedByUserId: 'issuedByUserId',
  status: 'status',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.CreditNoteLineScalarFieldEnum = {
  id: 'id',
  creditNoteId: 'creditNoteId',
  schoolId: 'schoolId',
  coaCode: 'coaCode',
  amount: 'amount',
  vatAmount: 'vatAmount',
  description: 'description',
  studentId: 'studentId',
  supplierId: 'supplierId',
  createdAt: 'createdAt'
};

exports.Prisma.TillSessionScalarFieldEnum = {
  id: 'id',
  schoolId: 'schoolId',
  deviceId: 'deviceId',
  sessionNumber: 'sessionNumber',
  openedByUserId: 'openedByUserId',
  openedAt: 'openedAt',
  closedByUserId: 'closedByUserId',
  closedAt: 'closedAt',
  openingFloat: 'openingFloat',
  closingCounted: 'closingCounted',
  expectedSales: 'expectedSales',
  variance: 'variance',
  status: 'status',
  notes: 'notes',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.CashupDenominationScalarFieldEnum = {
  id: 'id',
  schoolId: 'schoolId',
  tillSessionId: 'tillSessionId',
  currency: 'currency',
  denomination: 'denomination',
  count: 'count',
  total: 'total',
  createdAt: 'createdAt'
};

exports.Prisma.CashupPaymentScalarFieldEnum = {
  id: 'id',
  schoolId: 'schoolId',
  tillSessionId: 'tillSessionId',
  paymentMethod: 'paymentMethod',
  expectedAmount: 'expectedAmount',
  countedAmount: 'countedAmount',
  variance: 'variance',
  createdAt: 'createdAt'
};

exports.Prisma.StudentClearanceScalarFieldEnum = {
  id: 'id',
  schoolId: 'schoolId',
  studentId: 'studentId',
  status: 'status',
  libraryCleared: 'libraryCleared',
  libraryNotes: 'libraryNotes',
  librarySignedBy: 'librarySignedBy',
  librarySignedAt: 'librarySignedAt',
  feesCleared: 'feesCleared',
  feesBalance: 'feesBalance',
  feesNotes: 'feesNotes',
  feesSignedBy: 'feesSignedBy',
  feesSignedAt: 'feesSignedAt',
  hostelCleared: 'hostelCleared',
  hostelNotes: 'hostelNotes',
  hostelSignedBy: 'hostelSignedBy',
  hostelSignedAt: 'hostelSignedAt',
  finalCleared: 'finalCleared',
  finalSignedBy: 'finalSignedBy',
  finalSignedAt: 'finalSignedAt',
  certificateNo: 'certificateNo',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.AttendanceRegisterScalarFieldEnum = {
  id: 'id',
  schoolId: 'schoolId',
  classId: 'classId',
  date: 'date',
  session: 'session',
  submitted: 'submitted',
  locked: 'locked',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.AttendanceRecordScalarFieldEnum = {
  id: 'id',
  registerId: 'registerId',
  studentId: 'studentId',
  status: 'status',
  notes: 'notes',
  time: 'time'
};

exports.Prisma.PeriodAttendanceScalarFieldEnum = {
  id: 'id',
  studentId: 'studentId',
  timetablePeriodId: 'timetablePeriodId',
  date: 'date',
  status: 'status',
  scannedAt: 'scannedAt'
};

exports.Prisma.QrCodeSessionScalarFieldEnum = {
  id: 'id',
  teacherId: 'teacherId',
  classId: 'classId',
  periodId: 'periodId',
  date: 'date',
  code: 'code',
  expiresAt: 'expiresAt',
  locationData: 'locationData',
  createdAt: 'createdAt'
};

exports.Prisma.SyllabusScalarFieldEnum = {
  id: 'id',
  schoolId: 'schoolId',
  subjectId: 'subjectId',
  form: 'form',
  url: 'url',
  uploadedById: 'uploadedById',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.SyllabusTopicScalarFieldEnum = {
  id: 'id',
  syllabusId: 'syllabusId',
  code: 'code',
  topic: 'topic',
  expectedWeek: 'expectedWeek',
  objectives: 'objectives',
  isCovered: 'isCovered',
  coveredAt: 'coveredAt',
  coveredById: 'coveredById',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.SchemeOfWorkScalarFieldEnum = {
  id: 'id',
  schoolId: 'schoolId',
  teacherId: 'teacherId',
  subjectId: 'subjectId',
  form: 'form',
  term: 'term',
  year: 'year',
  status: 'status',
  comments: 'comments',
  syllabusTopicId: 'syllabusTopicId',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.LessonPlanScalarFieldEnum = {
  id: 'id',
  schoolId: 'schoolId',
  schemeId: 'schemeId',
  date: 'date',
  objectives: 'objectives',
  flow: 'flow',
  resources: 'resources',
  assessment: 'assessment',
  homework: 'homework',
  differentiation: 'differentiation',
  reflection: 'reflection',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.QuestionScalarFieldEnum = {
  id: 'id',
  type: 'type',
  text: 'text',
  form: 'form',
  subjectId: 'subjectId',
  syllabusTopicId: 'syllabusTopicId',
  difficulty: 'difficulty',
  marks: 'marks',
  options: 'options',
  explanation: 'explanation',
  isShared: 'isShared',
  createdById: 'createdById',
  schoolId: 'schoolId',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.CbtExamScalarFieldEnum = {
  id: 'id',
  title: 'title',
  classId: 'classId',
  subjectId: 'subjectId',
  description: 'description',
  instructions: 'instructions',
  startTime: 'startTime',
  endTime: 'endTime',
  durationMinutes: 'durationMinutes',
  passingPercentage: 'passingPercentage',
  shuffleQuestions: 'shuffleQuestions',
  shuffleOptions: 'shuffleOptions',
  attemptLimit: 'attemptLimit',
  createdById: 'createdById',
  schoolId: 'schoolId',
  status: 'status',
  questions: 'questions',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.CbtAttemptScalarFieldEnum = {
  id: 'id',
  examId: 'examId',
  studentId: 'studentId',
  startTime: 'startTime',
  submitTime: 'submitTime',
  score: 'score',
  isFlagged: 'isFlagged',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.DisciplineRecordScalarFieldEnum = {
  id: 'id',
  studentId: 'studentId',
  reporterId: 'reporterId',
  date: 'date',
  offenceType: 'offenceType',
  description: 'description',
  severity: 'severity',
  status: 'status',
  actionTaken: 'actionTaken',
  schoolId: 'schoolId',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.CalendarEventScalarFieldEnum = {
  id: 'id',
  title: 'title',
  date: 'date',
  endTime: 'endTime',
  location: 'location',
  type: 'type',
  sourceModule: 'sourceModule',
  sourceId: 'sourceId',
  schoolId: 'schoolId',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.SportsEventScalarFieldEnum = {
  id: 'id',
  title: 'title',
  type: 'type',
  sport: 'sport',
  date: 'date',
  venue: 'venue',
  opponent: 'opponent',
  compulsory: 'compulsory',
  schoolId: 'schoolId',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.TransportRequestScalarFieldEnum = {
  id: 'id',
  eventId: 'eventId',
  status: 'status',
  details: 'details',
  schoolId: 'schoolId',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.FacilitiesRequestScalarFieldEnum = {
  id: 'id',
  eventId: 'eventId',
  status: 'status',
  details: 'details',
  schoolId: 'schoolId',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.CateringRequestScalarFieldEnum = {
  id: 'id',
  eventId: 'eventId',
  status: 'status',
  details: 'details',
  schoolId: 'schoolId',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.AwardConfigScalarFieldEnum = {
  id: 'id',
  schoolId: 'schoolId',
  category: 'category',
  title: 'title',
  points: 'points',
  requiresApprovalBy: 'requiresApprovalBy',
  autoAddsToHousePoints: 'autoAddsToHousePoints',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.StudentAwardScalarFieldEnum = {
  id: 'id',
  schoolId: 'schoolId',
  studentId: 'studentId',
  nominatedById: 'nominatedById',
  category: 'category',
  title: 'title',
  reason: 'reason',
  evidenceUrl: 'evidenceUrl',
  points: 'points',
  rewardType: 'rewardType',
  amount: 'amount',
  status: 'status',
  approvedById: 'approvedById',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.StaffAwardScalarFieldEnum = {
  id: 'id',
  schoolId: 'schoolId',
  employeeId: 'employeeId',
  awardedById: 'awardedById',
  awardType: 'awardType',
  title: 'title',
  reason: 'reason',
  rewardType: 'rewardType',
  amount: 'amount',
  fundingSource: 'fundingSource',
  status: 'status',
  certificateUrl: 'certificateUrl',
  complianceOverrideReason: 'complianceOverrideReason',
  payrollAllowanceCreated: 'payrollAllowanceCreated',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.BursaryTypeScalarFieldEnum = {
  id: 'id',
  schoolId: 'schoolId',
  type: 'type',
  defaultPercentage: 'defaultPercentage',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.StudentBursaryScalarFieldEnum = {
  id: 'id',
  schoolId: 'schoolId',
  studentId: 'studentId',
  type: 'type',
  sponsor: 'sponsor',
  percentage: 'percentage',
  validFrom: 'validFrom',
  validTo: 'validTo',
  status: 'status',
  approvedById: 'approvedById',
  suggestedFromAwardId: 'suggestedFromAwardId',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.HostelBedAllocationScalarFieldEnum = {
  id: 'id',
  schoolId: 'schoolId',
  studentId: 'studentId',
  hostelId: 'hostelId',
  roomId: 'roomId',
  termId: 'termId',
  term: 'term',
  year: 'year',
  feeAmount: 'feeAmount',
  invoiceId: 'invoiceId',
  status: 'status',
  allocatedAt: 'allocatedAt',
  vacatedAt: 'vacatedAt',
  vacatedReason: 'vacatedReason',
  creditNoteId: 'creditNoteId',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.StudentTransportAllocationScalarFieldEnum = {
  id: 'id',
  schoolId: 'schoolId',
  studentId: 'studentId',
  transportId: 'transportId',
  routeId: 'routeId',
  termId: 'termId',
  year: 'year',
  feeAmount: 'feeAmount',
  invoiceId: 'invoiceId',
  status: 'status',
  flaggedForDebt: 'flaggedForDebt',
  allocatedAt: 'allocatedAt',
  cancelledAt: 'cancelledAt',
  creditNoteId: 'creditNoteId',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.SchoolTripScalarFieldEnum = {
  id: 'id',
  schoolId: 'schoolId',
  title: 'title',
  destination: 'destination',
  date: 'date',
  cost: 'cost',
  currency: 'currency',
  description: 'description',
  transport: 'transport',
  status: 'status',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.TripConsentScalarFieldEnum = {
  id: 'id',
  schoolId: 'schoolId',
  tripId: 'tripId',
  studentId: 'studentId',
  parentName: 'parentName',
  parentPhone: 'parentPhone',
  status: 'status',
  invoiceId: 'invoiceId',
  creditNoteId: 'creditNoteId',
  consentedAt: 'consentedAt',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.BookLoanFineScalarFieldEnum = {
  id: 'id',
  schoolId: 'schoolId',
  loanId: 'loanId',
  studentId: 'studentId',
  amount: 'amount',
  fineType: 'fineType',
  reason: 'reason',
  invoiceId: 'invoiceId',
  status: 'status',
  waivedAmount: 'waivedAmount',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.BoardingRollCallScalarFieldEnum = {
  id: 'id',
  schoolId: 'schoolId',
  hostelId: 'hostelId',
  date: 'date',
  time: 'time',
  studentId: 'studentId',
  status: 'status',
  markedById: 'markedById',
  notes: 'notes',
  smsDispatched: 'smsDispatched',
  disciplineCaseCreated: 'disciplineCaseCreated',
  clinicAdmitted: 'clinicAdmitted',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.ExeatScalarFieldEnum = {
  id: 'id',
  schoolId: 'schoolId',
  studentId: 'studentId',
  type: 'type',
  reason: 'reason',
  departureAt: 'departureAt',
  returnAt: 'returnAt',
  status: 'status',
  parentSignature: 'parentSignature',
  parentIp: 'parentIp',
  parentSignedAt: 'parentSignedAt',
  approvedByHousemasterId: 'approvedByHousemasterId',
  approvalNotes: 'approvalNotes',
  returnedAt: 'returnedAt',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.DiningPantryItemScalarFieldEnum = {
  id: 'id',
  schoolId: 'schoolId',
  itemName: 'itemName',
  unit: 'unit',
  stockQty: 'stockQty',
  minAlertQty: 'minAlertQty',
  unitCost: 'unitCost',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.DiningRecipeScalarFieldEnum = {
  id: 'id',
  schoolId: 'schoolId',
  mealType: 'mealType',
  recipeName: 'recipeName',
  description: 'description',
  ingredients: 'ingredients',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.UniformCategoryScalarFieldEnum = {
  id: 'id',
  schoolId: 'schoolId',
  name: 'name',
  description: 'description',
  createdAt: 'createdAt'
};

exports.Prisma.UniformProductScalarFieldEnum = {
  id: 'id',
  schoolId: 'schoolId',
  name: 'name',
  categoryId: 'categoryId',
  gender: 'gender',
  size: 'size',
  ageRange: 'ageRange',
  costPrice: 'costPrice',
  sellingPrice: 'sellingPrice',
  stockQty: 'stockQty',
  minStockAlert: 'minStockAlert',
  barcode: 'barcode',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.UniformKitScalarFieldEnum = {
  id: 'id',
  schoolId: 'schoolId',
  name: 'name',
  classLevel: 'classLevel',
  gender: 'gender',
  items: 'items',
  totalPrice: 'totalPrice',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.UniformIssuanceScalarFieldEnum = {
  id: 'id',
  schoolId: 'schoolId',
  studentId: 'studentId',
  termId: 'termId',
  term: 'term',
  year: 'year',
  items: 'items',
  totalAmount: 'totalAmount',
  invoiceId: 'invoiceId',
  issuedById: 'issuedById',
  issuedAt: 'issuedAt',
  paymentStatus: 'paymentStatus',
  collectionStatus: 'collectionStatus',
  notes: 'notes',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.UniformStockLedgerScalarFieldEnum = {
  id: 'id',
  schoolId: 'schoolId',
  productId: 'productId',
  type: 'type',
  qtyChange: 'qtyChange',
  referenceId: 'referenceId',
  balanceAfter: 'balanceAfter',
  unitCost: 'unitCost',
  notes: 'notes',
  createdAt: 'createdAt'
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
exports.LeadershipRole = exports.$Enums.LeadershipRole = {
  HEAD_BOY: 'HEAD_BOY',
  HEAD_GIRL: 'HEAD_GIRL',
  HOSTEL_PREFECT: 'HOSTEL_PREFECT',
  DINING_PREFECT: 'DINING_PREFECT',
  SRC_PRESIDENT: 'SRC_PRESIDENT',
  SRC_MEMBER: 'SRC_MEMBER'
};

exports.RequesterRole = exports.$Enums.RequesterRole = {
  TEACHER: 'TEACHER',
  ANCILLARY: 'ANCILLARY',
  ADMIN: 'ADMIN',
  STUDENT_LEADER: 'STUDENT_LEADER',
  CLINIC: 'CLINIC'
};

exports.AccountType = exports.$Enums.AccountType = {
  ASSET: 'ASSET',
  LIABILITY: 'LIABILITY',
  EQUITY: 'EQUITY',
  INCOME: 'INCOME',
  EXPENSE: 'EXPENSE'
};

exports.Prisma.ModelName = {
  Plan: 'Plan',
  School: 'School',
  GradingScale: 'GradingScale',
  HostelCategory: 'HostelCategory',
  HostelRoom: 'HostelRoom',
  LeadershipAssignment: 'LeadershipAssignment',
  StudentAllowedItem: 'StudentAllowedItem',
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
  StudentInvoice: 'StudentInvoice',
  StudentInvoiceItem: 'StudentInvoiceItem',
  Receipt: 'Receipt',
  PaymentAllocation: 'PaymentAllocation',
  Assignment: 'Assignment',
  QuestionPaper: 'QuestionPaper',
  TimetableSlot: 'TimetableSlot',
  Announcement: 'Announcement',
  AnnouncementRead: 'AnnouncementRead',
  AuditLog: 'AuditLog',
  Book: 'Book',
  StudentHouse: 'StudentHouse',
  ChaplaincyEvent: 'ChaplaincyEvent',
  Holiday: 'Holiday',
  LibraryCategory: 'LibraryCategory',
  BookLoan: 'BookLoan',
  LibrarySetting: 'LibrarySetting',
  BookReservation: 'BookReservation',
  LibraryDigitalResource: 'LibraryDigitalResource',
  AssignmentSubmission: 'AssignmentSubmission',
  News: 'News',
  SchoolSetting: 'SchoolSetting',
  PaymentPlan: 'PaymentPlan',
  PaymentPlanInstallment: 'PaymentPlanInstallment',
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
  LeaveBalance: 'LeaveBalance',
  Asset: 'Asset',
  AssetIncident: 'AssetIncident',
  AssetMaintenance: 'AssetMaintenance',
  TransportRoute: 'TransportRoute',
  SchoolEvent: 'SchoolEvent',
  TuckshopItem: 'TuckshopItem',
  TuckshopSale: 'TuckshopSale',
  DigitalResource: 'DigitalResource',
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
  ClinicPatient: 'ClinicPatient',
  ClinicAppointment: 'ClinicAppointment',
  ClinicComplaint: 'ClinicComplaint',
  ClinicEmergency: 'ClinicEmergency',
  ClinicImmunization: 'ClinicImmunization',
  ClinicReferral: 'ClinicReferral',
  ClinicVisit: 'ClinicVisit',
  ClinicInventoryItem: 'ClinicInventoryItem',
  ClinicDispensingLog: 'ClinicDispensingLog',
  ClinicHospitalization: 'ClinicHospitalization',
  FarmLivestockBatch: 'FarmLivestockBatch',
  FarmCropCycle: 'FarmCropCycle',
  FarmInventoryItem: 'FarmInventoryItem',
  DiningHallReport: 'DiningHallReport',
  PrefectDuty: 'PrefectDuty',
  PrefectMeeting: 'PrefectMeeting',
  PrefectReport: 'PrefectReport',
  StudentWallet: 'StudentWallet',
  WalletTransaction: 'WalletTransaction',
  SchoolSequence: 'SchoolSequence',
  Icd10Code: 'Icd10Code',
  ChartOfAccount: 'ChartOfAccount',
  JournalEntry: 'JournalEntry',
  JournalEntryLine: 'JournalEntryLine',
  AccountingPeriod: 'AccountingPeriod',
  ExchangeRate: 'ExchangeRate',
  Approval: 'Approval',
  Budget: 'Budget',
  StockMovement: 'StockMovement',
  TaxBracket: 'TaxBracket',
  UniformStockMovement: 'UniformStockMovement',
  BankStatement: 'BankStatement',
  BankStatementLine: 'BankStatementLine',
  PlatformSetting: 'PlatformSetting',
  Icd10ParentLabel: 'Icd10ParentLabel',
  StudentHealthProfile: 'StudentHealthProfile',
  ClinicVital: 'ClinicVital',
  ClinicDiagnosis: 'ClinicDiagnosis',
  ClinicPrescription: 'ClinicPrescription',
  PharmacyStock: 'PharmacyStock',
  PharmacyBatch: 'PharmacyBatch',
  PharmacyDispense: 'PharmacyDispense',
  ClinicBed: 'ClinicBed',
  ClinicAdmission: 'ClinicAdmission',
  ClinicMonitoringLog: 'ClinicMonitoringLog',
  ClinicAccessAudit: 'ClinicAccessAudit',
  ClinicEmergencyLog: 'ClinicEmergencyLog',
  ClinicSetting: 'ClinicSetting',
  FiscalDevice: 'FiscalDevice',
  FiscalDeviceSecret: 'FiscalDeviceSecret',
  FiscalInvoice: 'FiscalInvoice',
  DocumentSequence: 'DocumentSequence',
  CreditNote: 'CreditNote',
  CreditNoteLine: 'CreditNoteLine',
  TillSession: 'TillSession',
  CashupDenomination: 'CashupDenomination',
  CashupPayment: 'CashupPayment',
  StudentClearance: 'StudentClearance',
  AttendanceRegister: 'AttendanceRegister',
  AttendanceRecord: 'AttendanceRecord',
  PeriodAttendance: 'PeriodAttendance',
  QrCodeSession: 'QrCodeSession',
  Syllabus: 'Syllabus',
  SyllabusTopic: 'SyllabusTopic',
  SchemeOfWork: 'SchemeOfWork',
  LessonPlan: 'LessonPlan',
  Question: 'Question',
  CbtExam: 'CbtExam',
  CbtAttempt: 'CbtAttempt',
  DisciplineRecord: 'DisciplineRecord',
  CalendarEvent: 'CalendarEvent',
  SportsEvent: 'SportsEvent',
  TransportRequest: 'TransportRequest',
  FacilitiesRequest: 'FacilitiesRequest',
  CateringRequest: 'CateringRequest',
  AwardConfig: 'AwardConfig',
  StudentAward: 'StudentAward',
  StaffAward: 'StaffAward',
  BursaryType: 'BursaryType',
  StudentBursary: 'StudentBursary',
  HostelBedAllocation: 'HostelBedAllocation',
  StudentTransportAllocation: 'StudentTransportAllocation',
  SchoolTrip: 'SchoolTrip',
  TripConsent: 'TripConsent',
  BookLoanFine: 'BookLoanFine',
  BoardingRollCall: 'BoardingRollCall',
  Exeat: 'Exeat',
  DiningPantryItem: 'DiningPantryItem',
  DiningRecipe: 'DiningRecipe',
  UniformCategory: 'UniformCategory',
  UniformProduct: 'UniformProduct',
  UniformKit: 'UniformKit',
  UniformIssuance: 'UniformIssuance',
  UniformStockLedger: 'UniformStockLedger'
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
