"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const prisma_1 = __importDefault(require("../lib/prisma"));
const auth_1 = require("../middleware/auth");
const zod_1 = require("zod");
const router = (0, express_1.Router)();
const GradingScaleSchema = zod_1.z.array(zod_1.z.object({
    id: zod_1.z.string().optional(),
    grade: zod_1.z.string().min(1),
    minScore: zod_1.z.number().min(0).max(100),
    maxScore: zod_1.z.number().min(0).max(100),
    status: zod_1.z.string().min(1),
}));
/**
 * @route   GET /api/grading
 * @desc    Get the grading scale for the school
 */
router.get('/', auth_1.requireAuth, async (req, res) => {
    try {
        const schoolId = req.user.schoolId;
        const scale = await prisma_1.default.gradingScale.findMany({
            where: { schoolId },
            orderBy: { maxScore: 'desc' }
        });
        res.json(scale);
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to fetch grading scale' });
    }
});
/**
 * @route   POST /api/grading
 * @desc    Bulk save grading scale
 */
router.post('/', auth_1.requireAuth, (0, auth_1.requireRole)('SCHOOL_ADMIN'), async (req, res) => {
    try {
        const schoolId = req.user.schoolId;
        const validatedData = GradingScaleSchema.parse(req.body);
        // We use a transaction to clear old scales and insert new ones to keep it simple
        // but in a production app with history we might want to update.
        // For now, let's just delete and recreate to match the UI behavior.
        await prisma_1.default.$transaction([
            prisma_1.default.gradingScale.deleteMany({ where: { schoolId } }),
            prisma_1.default.gradingScale.createMany({
                data: validatedData.map(item => ({
                    grade: item.grade,
                    minScore: item.minScore,
                    maxScore: item.maxScore,
                    status: item.status,
                    schoolId
                }))
            })
        ]);
        const newScale = await prisma_1.default.gradingScale.findMany({
            where: { schoolId },
            orderBy: { maxScore: 'desc' }
        });
        res.json(newScale);
    }
    catch (error) {
        res.status(400).json({ error: error.message || 'Failed to save grading scale' });
    }
});
exports.default = router;
//# sourceMappingURL=grading.js.map