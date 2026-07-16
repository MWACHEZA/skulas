const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { AsyncLocalStorage } = require('async_hooks');

const tenantStorage = new AsyncLocalStorage();

const extendedPrisma = prisma.$extends({
  query: {
    $allModels: {
      async $allOperations({ model, operation, args, query }) {
        if (['findUnique'].includes(operation)) {
          args.where = { ...args.where, schoolId: 'fake-school-id' };
        }
        return query(args);
      }
    }
  }
});

async function run() {
  try {
    const res = await extendedPrisma.teacher.findUnique({
      where: { id: 'some-id' }
    });
    console.log("Success:", res);
  } catch (e) {
    console.log("Error:", e.message);
  }
}
run().finally(() => prisma.$disconnect());
