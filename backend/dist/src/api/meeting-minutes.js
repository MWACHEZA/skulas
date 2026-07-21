"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const path_1 = __importDefault(require("path"));
const prisma_1 = __importDefault(require("../lib/prisma"));
const auth_1 = require("../middleware/auth");
const upload_1 = require("../middleware/upload");
const router = (0, express_1.Router)();
// Get all meeting minutes for the school
router.get('/', auth_1.requireAuth, async (req, res) => {
    try {
        const list = await prisma_1.default.meetingMinutes.findMany({
            where: { schoolId: req.user.schoolId },
            orderBy: { date: 'desc' }
        });
        res.json(list);
    }
    catch (error) {
        console.error('Error fetching meeting minutes:', error);
        res.status(500).json({ error: 'Failed to fetch meeting minutes' });
    }
});
// Create/Upload a new meeting minutes record
router.post('/', auth_1.requireAuth, upload_1.reportUpload.single('file'), async (req, res) => {
    try {
        const { date, title, attendees, status } = req.body;
        const file = req.file;
        if (!date || !title) {
            return res.status(400).json({ error: 'Missing required fields' });
        }
        const documentUrl = file
            ? path_1.default.join(req.uploadCategoryPath || '', file.filename).replace(/\\/g, '/')
            : null;
        const minutes = await prisma_1.default.meetingMinutes.create({
            data: {
                schoolId: req.user.schoolId,
                date: new Date(date),
                title,
                attendees: attendees || '',
                status: status || 'Draft',
                documentUrl
            }
        });
        res.status(201).json(minutes);
    }
    catch (error) {
        console.error('Error creating meeting minutes:', error);
        res.status(500).json({ error: 'Failed to create meeting minutes' });
    }
});
// Delete meeting minutes record
router.delete('/:id', auth_1.requireAuth, async (req, res) => {
    const { id } = req.params;
    try {
        await prisma_1.default.meetingMinutes.deleteMany({
            where: {
                id: id,
                schoolId: req.user.schoolId
            }
        });
        res.json({ success: true });
    }
    catch (error) {
        console.error('Error deleting meeting minutes:', error);
        res.status(500).json({ error: 'Failed to delete meeting minutes' });
    }
});
exports.default = router;
//# sourceMappingURL=meeting-minutes.js.map