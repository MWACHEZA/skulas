"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const prisma_1 = __importDefault(require("../lib/prisma"));
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
router.use(auth_1.requireAuth);
// ── Admission Inquiries ──
router.get('/inquiries', async (req, res) => {
    try {
        const schoolId = req.user.schoolId;
        const inquiries = await prisma_1.default.admissionInquiry.findMany({
            where: { schoolId },
            include: { class: true },
            orderBy: { inquiryDate: 'desc' }
        });
        res.json(inquiries);
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to fetch inquiries' });
    }
});
router.post('/inquiries', async (req, res) => {
    try {
        const schoolId = req.user.schoolId;
        const { name, phone, source, classId, inquiryDate, nextFollowUpDate, status } = req.body;
        const inquiry = await prisma_1.default.admissionInquiry.create({
            data: {
                name,
                phone,
                source,
                classId: classId || null,
                inquiryDate: inquiryDate ? new Date(inquiryDate) : new Date(),
                nextFollowUpDate: nextFollowUpDate ? new Date(nextFollowUpDate) : null,
                status: status || 'Active',
                schoolId
            }
        });
        res.json(inquiry);
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to create inquiry' });
    }
});
// ── Visitor Logs ──
router.get('/visitors', async (req, res) => {
    try {
        const schoolId = req.user.schoolId;
        const visitors = await prisma_1.default.visitorLog.findMany({
            where: { schoolId },
            orderBy: { entryTime: 'desc' }
        });
        res.json(visitors);
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to fetch visitor logs' });
    }
});
router.post('/visitors', async (req, res) => {
    try {
        const guardId = req.user.id;
        const schoolId = req.user.schoolId;
        const { name, phone, idCard, numOfPerson, purpose, meetingWith, note, vehicleReg } = req.body;
        const visitor = await prisma_1.default.visitorLog.create({
            data: {
                name,
                phone,
                idCard,
                numOfPerson: parseInt(numOfPerson) || 1,
                purpose,
                meetingWith,
                note,
                vehicleReg,
                guardId,
                schoolId
            }
        });
        res.json(visitor);
    }
    catch (error) {
        console.log(error);
        res.status(500).json({ error: 'Failed to create visitor log' });
    }
});
// ── Phone Call Logs ──
router.get('/calls', async (req, res) => {
    try {
        const schoolId = req.user.schoolId;
        const calls = await prisma_1.default.phoneCallLog.findMany({
            where: { schoolId },
            orderBy: { date: 'desc' }
        });
        res.json(calls);
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to fetch call logs' });
    }
});
router.post('/calls', async (req, res) => {
    try {
        const schoolId = req.user.schoolId;
        const { name, phone, date, nextFollowUpDate, callDuration, callType, description } = req.body;
        const callLog = await prisma_1.default.phoneCallLog.create({
            data: {
                name,
                phone,
                date: date ? new Date(date) : new Date(),
                nextFollowUpDate: nextFollowUpDate ? new Date(nextFollowUpDate) : null,
                callDuration,
                callType,
                description,
                schoolId
            }
        });
        res.json(callLog);
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to create call log' });
    }
});
// ── Front Office Complaints ──
router.get('/complaints', async (req, res) => {
    try {
        const schoolId = req.user.schoolId;
        const complaints = await prisma_1.default.frontOfficeComplaint.findMany({
            where: { schoolId },
            orderBy: { date: 'desc' }
        });
        res.json(complaints);
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to fetch complaints' });
    }
});
router.post('/complaints', async (req, res) => {
    try {
        const schoolId = req.user.schoolId;
        const { complainType, source, complainBy, phone, date, actionTaken, assignedTo, description } = req.body;
        const complaint = await prisma_1.default.frontOfficeComplaint.create({
            data: {
                complainType,
                source,
                complainBy,
                phone,
                date: date ? new Date(date) : new Date(),
                actionTaken,
                assignedTo,
                description,
                schoolId
            }
        });
        res.json(complaint);
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to create complaint' });
    }
});
// Delete endpoints
router.delete('/inquiries/:id', async (req, res) => {
    try {
        const id = req.params.id;
        const record = await prisma_1.default.admissionInquiry.findFirst({
            where: { id, schoolId: req.user.schoolId }
        });
        if (!record)
            return res.status(404).json({ error: 'Inquiry not found' });
        await prisma_1.default.admissionInquiry.delete({
            where: { id }
        });
        res.json({ success: true });
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to delete inquiry' });
    }
});
router.delete('/visitors/:id', async (req, res) => {
    try {
        const id = req.params.id;
        const record = await prisma_1.default.visitorLog.findFirst({
            where: { id, schoolId: req.user.schoolId }
        });
        if (!record)
            return res.status(404).json({ error: 'Visitor log not found' });
        await prisma_1.default.visitorLog.delete({
            where: { id }
        });
        res.json({ success: true });
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to delete visitor log' });
    }
});
router.delete('/calls/:id', async (req, res) => {
    try {
        const id = req.params.id;
        const record = await prisma_1.default.phoneCallLog.findFirst({
            where: { id, schoolId: req.user.schoolId }
        });
        if (!record)
            return res.status(404).json({ error: 'Call log not found' });
        await prisma_1.default.phoneCallLog.delete({
            where: { id }
        });
        res.json({ success: true });
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to delete call log' });
    }
});
router.delete('/complaints/:id', async (req, res) => {
    try {
        const id = req.params.id;
        const record = await prisma_1.default.frontOfficeComplaint.findFirst({
            where: { id, schoolId: req.user.schoolId }
        });
        if (!record)
            return res.status(404).json({ error: 'Complaint not found' });
        await prisma_1.default.frontOfficeComplaint.delete({
            where: { id }
        });
        res.json({ success: true });
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to delete complaint' });
    }
});
exports.default = router;
//# sourceMappingURL=reception.js.map