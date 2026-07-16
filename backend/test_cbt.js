const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient().$extends({
  query: {
    $allModels: {
      async $allOperations({ model, operation, args, query }) {
        if (['findUnique', 'delete'].includes(operation)) {
          if (!args.where) args.where = {};
          args.where.schoolId = 'test-school';
        }
        try {
          return await query(args);
        } catch (e) {
          console.error(`Error in ${model}.${operation}:`, e.message);
        }
      }
    }
  }
});

async function main() {
  await prisma.cBTExam.findUnique({
    where: { id: 'test-id' }
  });
}
main().finally(() => prisma.$disconnect());
