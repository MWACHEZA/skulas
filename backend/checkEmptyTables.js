const { PrismaClient, Prisma } = require('./src/generated/client');
const prisma = new PrismaClient();

async function main() {
  const models = Prisma.dmmf.datamodel.models.map(m => m.name);
  const emptyModels = [];
  for (const model of models) {
    // Prisma model names start with uppercase, but delegate property is lowercase
    const delegate = model.charAt(0).toLowerCase() + model.slice(1);
    if (prisma[delegate] && typeof prisma[delegate].count === 'function') {
      try {
        const count = await prisma[delegate].count();
        if (count === 0) emptyModels.push(model);
      } catch (e) {
        console.error('Error counting', model, e.message);
      }
    }
  }
  console.log('Total Models Checkable:', models.length);
  console.log('Empty Models Count:', emptyModels.length);
  if (emptyModels.length > 0) console.log('Empty Models:', emptyModels.join(', '));
}

main().catch(console.error).finally(() => prisma.$disconnect());
