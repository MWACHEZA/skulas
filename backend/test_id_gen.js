const { generateSequentialId } = require('./src/lib/id-generator');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function test() {
  const schoolId = 'cmnq4btug00014mriw535h40u'; // St Patrick's Primary
  const newId = await generateSequentialId(schoolId, 'STUDENT');
  console.log(`Newly generated Student ID: ${newId}`);
}

test().finally(() => prisma.$disconnect());
