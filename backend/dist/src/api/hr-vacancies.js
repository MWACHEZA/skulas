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
        const vacancies = await prisma_1.default.vacancy.findMany({
            where: { schoolId: req.user.schoolId },
            include: { department: true, recruiter: true }
        });
        res.json(vacancies);
    }
    catch (error) {
        console.error('Error fetching vacancies:', error);
        res.status(500).json({ error: 'Failed to fetch vacancies' });
    }
});
router.post('/', auth_1.requireAuth, (0, auth_1.requireRole)('SCHOOL_ADMIN', 'ANCILLARY'), async (req, res) => {
    try {
        const { reqPhoto, reqResume, reqDob, reqGender, ...data } = req.body;
        const vacancy = await prisma_1.default.vacancy.create({
            data: {
                ...data,
                startDate: new Date(data.startDate),
                endDate: new Date(data.endDate),
                interviewRounds: parseInt(data.interviewRounds, 10),
                numberOfVacancies: parseInt(data.numberOfVacancies, 10),
                schoolId: req.user.schoolId
            }
        });
        res.json(vacancy);
    }
    catch (error) {
        console.error('Error creating vacancy:', error);
        res.status(500).json({ error: 'Failed to create vacancy' });
    }
});
router.delete('/:id', auth_1.requireAuth, (0, auth_1.requireRole)('SCHOOL_ADMIN', 'ANCILLARY'), async (req, res) => {
    try {
        await prisma_1.default.vacancy.delete({
            where: {
                id: req.params.id,
                schoolId: req.user.schoolId
            }
        });
        res.json({ success: true });
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to delete vacancy' });
    }
});
router.put('/:id', auth_1.requireAuth, (0, auth_1.requireRole)('SCHOOL_ADMIN', 'ANCILLARY'), async (req, res) => {
    try {
        const { reqPhoto, reqResume, reqDob, reqGender, id, ...data } = req.body;
        const vacancy = await prisma_1.default.vacancy.update({
            where: {
                id: req.params.id,
                schoolId: req.user.schoolId
            },
            data: {
                ...data,
                startDate: data.startDate ? new Date(data.startDate) : undefined,
                endDate: data.endDate ? new Date(data.endDate) : undefined,
                interviewRounds: data.interviewRounds ? parseInt(data.interviewRounds, 10) : undefined,
                numberOfVacancies: data.numberOfVacancies ? parseInt(data.numberOfVacancies, 10) : undefined
            }
        });
        res.json(vacancy);
    }
    catch (error) {
        console.error('Error updating vacancy:', error);
        res.status(500).json({ error: 'Failed to update vacancy' });
    }
});
exports.default = router;
//# sourceMappingURL=hr-vacancies.js.map