const fs = require('fs');
const path = require('path');

const schemaPath = path.join(__dirname, 'backend', 'prisma', 'schema.prisma');
const prismaTsPath = path.join(__dirname, 'backend', 'src', 'lib', 'prisma.ts');

const schemaContent = fs.readFileSync(schemaPath, 'utf-8');
const prismaTsContent = fs.readFileSync(prismaTsPath, 'utf-8');

// Extract all models from schema
const modelRegex = /model\s+(\w+)\s+\{([\s\S]*?)\}/g;
let match;
const modelsWithSchoolId = [];
while ((match = modelRegex.exec(schemaContent)) !== null) {
    const modelName = match[1];
    const modelBody = match[2];
    if (modelBody.includes('schoolId ')) {
        modelsWithSchoolId.push(modelName);
    }
}

// Extract tenantScopedModels from prisma.ts
const arrayMatch = prismaTsContent.match(/const tenantScopedModels = \[([\s\S]*?)\];/);
let definedModels = [];
if (arrayMatch) {
    // parse the string array safely
    const arrayStr = arrayMatch[1];
    const nameMatches = arrayStr.match(/'(\w+)'/g);
    if (nameMatches) {
        definedModels = nameMatches.map(n => n.replace(/'/g, ''));
    }
}

const missingFromConfig = modelsWithSchoolId.filter(m => !definedModels.includes(m));

console.log('Models with schoolId:', modelsWithSchoolId.length);
console.log('Models defined in config:', definedModels.length);
console.log('CRITICAL: Models with schoolId missing from tenantScopedModels config:', missingFromConfig);
