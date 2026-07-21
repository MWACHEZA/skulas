"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const ai_1 = require("../services/ai");
const tenant_1 = require("../middleware/tenant");
const prisma_1 = __importDefault(require("../lib/prisma"));
const router = (0, express_1.Router)();
/**
 * @route   POST /api/chat/santa
 * @desc    Chat with Santa (Public or Authenticated)
 */
router.post('/santa', tenant_1.tenantContext, async (req, res) => {
    const { message, history, schoolCode } = req.body;
    const targetCode = schoolCode || req.tenantCode;
    if (!targetCode) {
        return res.status(400).json({ error: 'School code is required' });
    }
    try {
        const school = await prisma_1.default.school.findUnique({
            where: { code: targetCode },
        });
        if (!school)
            return res.status(404).json({ error: 'School not found' });
        const result = await (0, ai_1.getSantaResponse)(school.id, message, history || []);
        res.json(result);
    }
    catch (error) {
        console.error('Santa Error:', error);
        res.status(500).json({ error: 'Santa is currently offline. Please try again later.' });
    }
});
exports.default = router;
//# sourceMappingURL=chat.js.map