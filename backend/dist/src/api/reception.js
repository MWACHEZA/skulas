import { Router } from 'express';
import prisma from '../lib/prisma';
import { requireAuth } from '../middleware/auth';
const router = Router();
router.use(requireAuth);
// ── Admission Inquiries ──
router.get('/inquiries', async (req, res) => {
    try {
        const schoolId = req.user.schoolId;
        const inquiries = await prisma.admissionInquiry.findMany({
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
        const inquiry = await prisma.admissionInquiry.create({
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
        const visitors = await prisma.visitorLog.findMany({
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
        const visitor = await prisma.visitorLog.create({
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
        const calls = await prisma.phoneCallLog.findMany({
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
        const callLog = await prisma.phoneCallLog.create({
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
        const complaints = await prisma.frontOfficeComplaint.findMany({
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
        const complaint = await prisma.frontOfficeComplaint.create({
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
export default router;
//# sourceMappingURL=reception.js.map