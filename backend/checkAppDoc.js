const { Prisma } = require('@prisma/client');
const model = Prisma.dmmf.datamodel.models.find(m => m.name === 'ApplicantDocument');
console.log(model.fields.find(f => f.name === 'application').type);
