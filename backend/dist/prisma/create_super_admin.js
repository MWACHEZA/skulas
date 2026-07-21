"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const prisma = new client_1.PrismaClient();
async function main() {
    const email = 'superadmin@acadex.com';
    const password = 'AcadexSuper@1234';
    const hashedPassword = await bcryptjs_1.default.hash(password, 10);
    console.log(`🚀 Creating Super Admin: ${email}...`);
    const user = await prisma.user.upsert({
        where: { email },
        update: {},
        create: {
            email,
            password: hashedPassword,
            name: 'Acadex Super Admin',
            role: 'SUPER_ADMIN',
        },
    });
    console.log('✅ Super Admin created successfully!');
    console.log('------------------------------------');
    console.log('Email:', email);
    console.log('Password:', password);
    console.log('Login Path: /acadex/login');
    console.log('------------------------------------');
}
main()
    .catch((e) => {
    console.error('❌ Error creating Super Admin:', e);
    process.exit(1);
})
    .finally(async () => {
    await prisma.$disconnect();
});
//# sourceMappingURL=create_super_admin.js.map