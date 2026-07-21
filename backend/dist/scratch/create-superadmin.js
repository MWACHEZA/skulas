"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const prisma = new client_1.PrismaClient();
async function createSuperAdmin() {
    const email = 'superadmin@acadex.com';
    const password = 'Admin@1234'; // Standard password for testing
    const hashedPassword = await bcryptjs_1.default.hash(password, 10);
    const user = await prisma.user.upsert({
        where: { email },
        update: {
            password: hashedPassword,
            role: 'SUPER_ADMIN',
        },
        create: {
            email,
            password: hashedPassword,
            name: 'Acadex Super Admin',
            role: 'SUPER_ADMIN',
        },
    });
    console.log(`✅ Super Admin created/updated: ${user.email}`);
    console.log(`Password set to: ${password}`);
}
createSuperAdmin()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
//# sourceMappingURL=create-superadmin.js.map