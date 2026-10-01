"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = require("../middleware/auth");
const till_service_1 = require("../services/till.service");
const router = (0, express_1.Router)();
router.use(auth_1.requireAuth);
/**
 * GET /api/tills/active — check active session for a device
 */
router.get('/active', async (req, res) => {
    try {
        const schoolId = req.user?.schoolId;
        if (!schoolId)
            return res.status(400).json({ error: 'Missing schoolId' });
        const deviceId = String(req.query.deviceId || '');
        if (!deviceId)
            return res.status(400).json({ error: 'deviceId query param is required' });
        const session = await till_service_1.TillService.getOpenSession(schoolId, deviceId);
        res.json({ session });
    }
    catch (err) {
        console.error('Get active till error:', err);
        res.status(500).json({ error: err.message || 'Failed to check active till session' });
    }
});
/**
 * POST /api/tills/open — open a till session with float
 */
router.post('/open', async (req, res) => {
    try {
        const schoolId = req.user?.schoolId;
        if (!schoolId)
            return res.status(400).json({ error: 'Missing schoolId' });
        const { deviceId, openingFloat, tillAccountCode } = req.body;
        if (!deviceId)
            return res.status(400).json({ error: 'deviceId is required' });
        const session = await till_service_1.TillService.openTill({
            schoolId,
            deviceId,
            userId: req.user?.id || 'SYSTEM',
            openingFloat: parseFloat(openingFloat) || 0,
            tillAccountCode: tillAccountCode || '1023',
            ipAddress: req.ip
        });
        res.json(session);
    }
    catch (err) {
        console.error('Open till error:', err);
        res.status(400).json({ error: err.message || 'Failed to open till session' });
    }
});
/**
 * GET /api/tills/:id/expected — live calculated expected sales during session
 */
router.get('/:id/expected', async (req, res) => {
    try {
        const schoolId = req.user?.schoolId;
        if (!schoolId)
            return res.status(400).json({ error: 'Missing schoolId' });
        const expected = await till_service_1.TillService.calculateExpectedSales(schoolId, req.params.id);
        res.json(expected);
    }
    catch (err) {
        console.error('Calculate expected till sales error:', err);
        res.status(500).json({ error: err.message || 'Failed to calculate expected sales' });
    }
});
/**
 * POST /api/tills/:id/close — close till session and reconcile cash-up
 */
router.post('/:id/close', async (req, res) => {
    try {
        const schoolId = req.user?.schoolId;
        if (!schoolId)
            return res.status(400).json({ error: 'Missing schoolId' });
        const { denominations, countedPayments, notes, tillAccountCode } = req.body;
        const closed = await till_service_1.TillService.closeTill({
            schoolId,
            tillSessionId: req.params.id,
            userId: req.user?.id || 'SYSTEM',
            denominations: denominations || [],
            countedPayments: countedPayments || [],
            notes,
            tillAccountCode: tillAccountCode || '1023',
            ipAddress: req.ip
        });
        res.json(closed);
    }
    catch (err) {
        console.error('Close till error:', err);
        res.status(400).json({ error: err.message || 'Failed to close till session' });
    }
});
/**
 * GET /api/tills/variances — list sessions with variance
 */
router.get('/variances', async (req, res) => {
    try {
        const schoolId = req.user?.schoolId;
        if (!schoolId)
            return res.status(400).json({ error: 'Missing schoolId' });
        const limit = parseInt(String(req.query.limit || '50')) || 50;
        const records = await till_service_1.TillService.getVarianceReport(schoolId, limit);
        res.json(records);
    }
    catch (err) {
        console.error('Till variances error:', err);
        res.status(500).json({ error: err.message || 'Failed to fetch variance report' });
    }
});
exports.default = router;
//# sourceMappingURL=tills.js.map