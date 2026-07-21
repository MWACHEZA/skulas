"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const auth_1 = require("../middleware/auth");
const prisma_1 = __importDefault(require("../lib/prisma"));
const file_utils_1 = require("../lib/file-utils");
const router = express_1.default.Router();
router.get('/', auth_1.requireAuth, (0, auth_1.requireRole)('SCHOOL_ADMIN', 'ANCILLARY'), async (req, res) => {
    try {
        const statusFilter = req.query.status;
        const applications = await prisma_1.default.jobApplication.findMany({
            where: {
                schoolId: req.user.schoolId,
                ...(statusFilter ? { status: statusFilter } : {})
            },
            include: { vacancy: true }
        });
        res.json(applications);
    }
    catch (error) {
        console.error('Error fetching applications:', error);
        res.status(500).json({ error: 'Failed to fetch applications' });
    }
});
router.put('/:id/status', auth_1.requireAuth, (0, auth_1.requireRole)('SCHOOL_ADMIN', 'ANCILLARY'), async (req, res) => {
    try {
        const { status } = req.body;
        const app = await prisma_1.default.jobApplication.update({
            where: {
                id: req.params.id,
                schoolId: req.user.schoolId
            },
            data: { status }
        });
        res.json(app);
    }
    catch (error) {
        console.error('Error updating status:', error);
        res.status(500).json({ error: 'Failed to update application status' });
    }
});
router.delete('/:id', auth_1.requireAuth, (0, auth_1.requireRole)('SCHOOL_ADMIN', 'ANCILLARY'), async (req, res) => {
    try {
        const appId = req.params.id;
        await prisma_1.default.jobApplication.delete({
            where: {
                id: appId,
                schoolId: req.user.schoolId
            }
        });
        res.json({ success: true });
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to delete application' });
    }
});
router.post('/', auth_1.requireAuth, (0, auth_1.requireRole)('SCHOOL_ADMIN', 'ANCILLARY'), async (req, res) => {
    try {
        const schoolId = req.user.schoolId;
        const { applicantName, vacancyId, status, date, gender, email, phone, qualification, skills, workExperience, address, coverLetter, resumeUrl, photoUrl } = req.body;
        const app = await prisma_1.default.jobApplication.create({
            data: {
                schoolId,
                vacancyId,
                applicantName,
                status: status || 'Applied',
                createdAt: new Date(date || new Date()),
                gender: gender || '',
                email: email || '',
                phone: phone || '',
                qualification: qualification || '',
                skills: skills || '',
                workExperience: workExperience || '',
                address: address || '',
                coverLetter: coverLetter || ''
            }
        });
        let updatedResumeUrl = null;
        let updatedPhotoUrl = null;
        if (resumeUrl || photoUrl) {
            const school = await prisma_1.default.school.findUnique({
                where: { id: schoolId },
                select: { code: true }
            });
            const schoolCode = school?.code || 'global';
            if (resumeUrl && resumeUrl.includes(';base64,')) {
                updatedResumeUrl = (0, file_utils_1.saveBase64Image)(resumeUrl, 'resume', 'docs', schoolCode, 'recruitment/applications', app.id);
            }
            else if (resumeUrl) {
                updatedResumeUrl = resumeUrl;
            }
            if (photoUrl && photoUrl.includes(';base64,')) {
                updatedPhotoUrl = (0, file_utils_1.saveBase64Image)(photoUrl, 'photo', 'images', schoolCode, 'recruitment/applications', app.id);
            }
            else if (photoUrl) {
                updatedPhotoUrl = photoUrl;
            }
            if (updatedResumeUrl || updatedPhotoUrl) {
                await prisma_1.default.jobApplication.update({
                    where: { id: app.id },
                    data: {
                        ...(updatedResumeUrl ? { resumeUrl: updatedResumeUrl } : {}),
                        ...(updatedPhotoUrl ? { photoUrl: updatedPhotoUrl } : {})
                    }
                });
                app.resumeUrl = updatedResumeUrl || app.resumeUrl;
                app.photoUrl = updatedPhotoUrl || app.photoUrl;
            }
        }
        res.status(201).json(app);
    }
    catch (error) {
        console.error('Error creating application:', error);
        res.status(500).json({ error: 'Failed to create application' });
    }
});
exports.default = router;
//# sourceMappingURL=hr-applications.js.map