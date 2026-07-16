import { Router } from 'express';
import { getSantaResponse } from '../services/ai';
import { tenantContext } from '../middleware/tenant';
import prisma from '../lib/prisma';
const router = Router();
/**
 * @route   POST /api/chat/santa
 * @desc    Chat with Santa (Public or Authenticated)
 */
router.post('/santa', tenantContext, async (req, res) => {
    const { message, history, schoolCode } = req.body;
    const targetCode = schoolCode || req.tenantCode;
    if (!targetCode) {
        return res.status(400).json({ error: 'School code is required' });
    }
    try {
        const school = await prisma.school.findUnique({
            where: { code: targetCode },
        });
        if (!school)
            return res.status(404).json({ error: 'School not found' });
        const result = await getSantaResponse(school.id, message, history || []);
        res.json(result);
    }
    catch (error) {
        console.error('Santa Error:', error);
        res.status(500).json({ error: 'Santa is currently offline. Please try again later.' });
    }
});
export default router;
//# sourceMappingURL=chat.js.map