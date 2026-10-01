const fs = require('fs');
const path = require('path');

const schemaPath = path.join(__dirname, '../backend/prisma/schema.prisma');
let schema = fs.readFileSync(schemaPath, 'utf8');

const models = "\nmodel Question {\n  id              String   @id @default(cuid())\n  type            String   \n  text            String   @db.Text\n  form            String?\n  subjectId       String\n  subject         Subject  @relation(fields: [subjectId], references: [id])\n  syllabusTopicId String?\n  difficulty      String?  \n  marks           Float    @default(1)\n  options         Json?    \n  explanation     String?  @db.Text\n  isShared        Boolean  @default(false)\n  createdById     String\n  createdBy       User     @relation(\"QuestionCreatedBy\", fields: [createdById], references: [id])\n  schoolId        String\n  school          School   @relation(\"SchoolQuestions\", fields: [schoolId], references: [id])\n  createdAt       DateTime @default(now())\n  updatedAt       DateTime @updatedAt\n}\n\nmodel CbtExam {\n  id                String   @id @default(cuid())\n  title             String\n  classId           String?\n  schoolClass       SchoolClass? @relation(fields: [classId], references: [id])\n  subjectId         String\n  subject           Subject  @relation(fields: [subjectId], references: [id])\n  description       String?\n  instructions      String?  @db.Text\n  startTime         DateTime?\n  endTime           DateTime?\n  durationMinutes   Int?\n  passingPercentage Float    @default(50)\n  shuffleQuestions  Boolean  @default(false)\n  shuffleOptions    Boolean  @default(false)\n  attemptLimit      Int      @default(1)\n  createdById       String\n  createdBy         User     @relation(\"CbtExamCreatedBy\", fields: [createdById], references: [id])\n  schoolId          String\n  school            School   @relation(\"SchoolCbtExams\", fields: [schoolId], references: [id])\n  status            String   @default(\"Pending\")\n  questions         Json?    \n  attempts          CbtAttempt[]\n  createdAt         DateTime @default(now())\n  updatedAt         DateTime @updatedAt\n}\n\nmodel CbtAttempt {\n  id         String   @id @default(cuid())\n  examId     String\n  exam       CbtExam  @relation(fields: [examId], references: [id], onDelete: Cascade)\n  studentId  String\n  student    Student  @relation(fields: [studentId], references: [id])\n  startTime  DateTime @default(now())\n  submitTime DateTime?\n  score      Float?\n  isFlagged  Boolean  @default(false)\n  createdAt  DateTime @default(now())\n  updatedAt  DateTime @updatedAt\n}\n";

if (!schema.includes('model Question {')) {
  schema += models;
}

schema = schema.replace(
  '  announcementReads       AnnouncementRead[]    @relation("AnnouncementReads")',
  '  announcementReads       AnnouncementRead[]    @relation("AnnouncementReads")\n  createdQuestions Question[] @relation("QuestionCreatedBy")\n  createdCbtExams CbtExam[] @relation("CbtExamCreatedBy")'
);

schema = schema.replace(
  '  leaveBalances         LeaveBalance[]',
  '  leaveBalances         LeaveBalance[]\n  questions Question[] @relation("SchoolQuestions")\n  cbtExams CbtExam[] @relation("SchoolCbtExams")'
);

schema = schema.replace(
  '  StudyMaterial  StudyMaterial[]',
  '  StudyMaterial  StudyMaterial[]\n  questions Question[]\n  cbtExams CbtExam[]'
);

schema = schema.replace(
  '  announcements       Announcement[]',
  '  announcements       Announcement[]\n  cbtExams CbtExam[]'
);

schema = schema.replace(
  '  clearances        StudentClearance[]',
  '  clearances        StudentClearance[]\n  cbtAttempts CbtAttempt[]'
);

fs.writeFileSync(schemaPath, schema);
console.log('Schema updated successfully.');
