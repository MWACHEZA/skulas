"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const prisma = new client_1.PrismaClient();
async function fix() {
    const school = await prisma.school.findUnique({
        where: { code: 'AX-KHYVF4' }
    });
    if (!school) {
        console.error('School AX-KHYVF4 not found');
        return;
    }
    const hashedPassword = await bcryptjs_1.default.hash('Admin@1234', 10);
    await prisma.user.update({
        where: { email: 'stpatricks@gmail.com' },
        data: { password: hashedPassword }
    });
    console.log('Successfully RESET password to Admin@1234 for stpatricks@gmail.com');
}
fix().catch(console.error).finally(() => prisma.$disconnect());
//# sourceMappingURL=fix-login.js.map