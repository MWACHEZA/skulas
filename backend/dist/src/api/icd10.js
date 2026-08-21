"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const prisma_1 = __importDefault(require("../lib/prisma"));
const auth_1 = require("../middleware/auth");
const seedIcd10_1 = require("../../prisma/seeders/seedIcd10");
const router = (0, express_1.Router)();
async function ensureIcd10Seeded() {
    const count = await prisma_1.default.icd10Code.count();
    if (count === 0) {
        await (0, seedIcd10_1.seedIcd10Codes)(prisma_1.default);
    }
}
// Search ICD10 codes
router.get('/search', auth_1.requireAuth, async (req, res) => {
    try {
        await ensureIcd10Seeded();
        const q = req.query.q;
        if (!q || q.length < 2)
            return res.json([]);
        const codes = await prisma_1.default.icd10Code.findMany({
            where: {
                OR: [
                    { code: { contains: q, mode: 'insensitive' } },
                    { description: { contains: q, mode: 'insensitive' } }
                ]
            },
            take: 20,
            orderBy: { code: 'asc' }
        });
        res.json(codes);
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to search ICD-10 codes' });
    }
});
// List codes with pagination
router.get('/', auth_1.requireAuth, async (req, res) => {
    try {
        await ensureIcd10Seeded();
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 50;
        const skip = (page - 1) * limit;
        const [codes, total] = await Promise.all([
            prisma_1.default.icd10Code.findMany({ skip, take: limit, orderBy: { code: 'asc' } }),
            prisma_1.default.icd10Code.count()
        ]);
        res.json({
            codes,
            total,
            page,
            totalPages: Math.ceil(total / limit)
        });
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to fetch ICD-10 codes' });
    }
});
// Create a new code
router.post('/', auth_1.requireAuth, async (req, res) => {
    try {
        const { code, description, category } = req.body;
        if (!code || !description) {
            return res.status(400).json({ error: 'Code and description are required' });
        }
        const newCode = await prisma_1.default.icd10Code.create({
            data: { code, description, category }
        });
        res.json(newCode);
    }
    catch (error) {
        if (error.code === 'P2002') {
            return res.status(400).json({ error: 'ICD-10 Code already exists' });
        }
        res.status(500).json({ error: 'Failed to create ICD-10 code' });
    }
});
// Update an existing code
router.put('/:id', auth_1.requireAuth, async (req, res) => {
    try {
        const { code, description, category } = req.body;
        const updatedCode = await prisma_1.default.icd10Code.update({
            where: { id: req.params.id },
            data: { code, description, category }
        });
        res.json(updatedCode);
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to update ICD-10 code' });
    }
});
// Delete a code
router.delete('/:id', auth_1.requireAuth, async (req, res) => {
    try {
        await prisma_1.default.icd10Code.delete({
            where: { id: req.params.id }
        });
        res.json({ success: true });
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to delete ICD-10 code' });
    }
});
exports.default = router;
//# sourceMappingURL=icd10.js.map