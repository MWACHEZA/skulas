const { Prisma } = require('@prisma/client');
const model = Prisma.dmmf.datamodel.models.find(m => m.name === 'Supplier');
console.log(model.fields.filter(f => f.kind === 'scalar' || f.kind === 'enum').map(f => f.name + ' (' + f.type + ')').join(', '));
