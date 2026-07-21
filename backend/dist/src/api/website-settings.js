"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const auth_1 = require("../middleware/auth");
const prisma_1 = __importDefault(require("../lib/prisma"));
const upload_1 = require("../middleware/upload");
const router = express_1.default.Router();
// GET current website settings for the school
router.get('/', auth_1.requireAuth, (0, auth_1.requireRole)('SCHOOL_ADMIN', 'ANCILLARY'), async (req, res) => {
    try {
        const settings = await prisma_1.default.websiteSettings.findFirst({
            where: { schoolId: req.user.schoolId }
        });
        // Return empty object if none exist, the frontend can handle defaults
        res.json(settings || {});
    }
    catch (error) {
        console.error('Failed to fetch website settings:', error);
        res.status(500).json({ error: 'Failed to fetch settings' });
    }
});
// PUT / POST to update website settings
router.put('/', auth_1.requireAuth, (0, auth_1.requireRole)('SCHOOL_ADMIN', 'ANCILLARY'), async (req, res) => {
    try {
        const schoolId = req.user.schoolId;
        const updateData = req.body;
        const settings = await prisma_1.default.websiteSettings.upsert({
            where: { schoolId },
            update: updateData,
            create: {
                ...updateData,
                schoolId
            }
        });
        res.json(settings);
    }
    catch (error) {
        console.error('Failed to update website settings:', error);
        res.status(500).json({ error: 'Failed to update settings' });
    }
});
// POST /api/website-settings/upload
router.post('/upload', auth_1.requireAuth, (0, auth_1.requireRole)('SCHOOL_ADMIN', 'ANCILLARY'), upload_1.brandingUpload.single('file'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }
        // Return the filename to be saved in the database
        res.json({ filename: req.file.filename });
    }
    catch (error) {
        console.error('Failed to upload file:', error);
        res.status(500).json({ error: 'Failed to upload file' });
    }
});
exports.default = router;
//# sourceMappingURL=website-settings.js.map