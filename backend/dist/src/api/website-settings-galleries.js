"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const auth_1 = require("../middleware/auth");
const prisma_1 = __importDefault(require("../lib/prisma"));
const router = express_1.default.Router();
router.get('/', auth_1.requireAuth, (0, auth_1.requireRole)('SCHOOL_ADMIN', 'ANCILLARY'), async (req, res) => {
    try {
        const galleries = await prisma_1.default.gallery.findMany({
            where: { schoolId: req.user.schoolId },
            orderBy: { createdAt: 'desc' }
        });
        res.json(galleries);
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to fetch galleries' });
    }
});
router.post('/', auth_1.requireAuth, (0, auth_1.requireRole)('SCHOOL_ADMIN', 'ANCILLARY'), async (req, res) => {
    try {
        const { title, content, createdAt, coverImage, category } = req.body;
        const gallery = await prisma_1.default.gallery.create({
            data: {
                title,
                content,
                coverImage,
                category: category || null,
                createdAt: createdAt ? new Date(createdAt) : new Date(),
                schoolId: req.user.schoolId
            }
        });
        res.json(gallery);
    }
    catch (error) {
        console.error('Failed to create gallery:', error);
        res.status(500).json({ error: 'Failed to create gallery' });
    }
});
router.put('/:id', auth_1.requireAuth, (0, auth_1.requireRole)('SCHOOL_ADMIN', 'ANCILLARY'), async (req, res) => {
    try {
        const { id } = req.params;
        const { title, content, createdAt, coverImage, category } = req.body;
        const updated = await prisma_1.default.gallery.update({
            where: {
                id: id,
                schoolId: req.user.schoolId
            },
            data: {
                title,
                content,
                coverImage,
                category: category || null,
                createdAt: createdAt ? new Date(createdAt) : undefined
            }
        });
        res.json(updated);
    }
    catch (error) {
        console.error('Failed to update gallery:', error);
        res.status(500).json({ error: 'Failed to update gallery' });
    }
});
router.delete('/:id', auth_1.requireAuth, (0, auth_1.requireRole)('SCHOOL_ADMIN', 'ANCILLARY'), async (req, res) => {
    try {
        await prisma_1.default.gallery.delete({
            where: {
                id: req.params.id,
                schoolId: req.user.schoolId
            }
        });
        res.json({ success: true });
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to delete gallery' });
    }
});
exports.default = router;
//# sourceMappingURL=website-settings-galleries.js.map