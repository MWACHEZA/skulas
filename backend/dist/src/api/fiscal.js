"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = require("../middleware/auth");
const fiscal_service_1 = require("../services/fiscal.service");
const router = (0, express_1.Router)();
router.use(auth_1.requireAuth);
/**
 * GET /api/fiscal/devices — list all registered fiscal devices
 */
router.get('/devices', async (req, res) => {
    try {
        const schoolId = req.user?.schoolId;
        if (!schoolId)
            return res.status(400).json({ error: 'Missing schoolId' });
        const devices = await fiscal_service_1.FiscalService.listDevices(schoolId);
        res.json(devices);
    }
    catch (err) {
        console.error('List fiscal devices error:', err);
        res.status(500).json({ error: err.message || 'Failed to list fiscal devices' });
    }
});
/**
 * POST /api/fiscal/devices — register/update fiscal device with secure vault secrets
 */
router.post('/devices', async (req, res) => {
    try {
        const schoolId = req.user?.schoolId;
        if (!schoolId)
            return res.status(400).json({ error: 'Missing schoolId' });
        const { serialNo, deviceModel, location, apiUrl, activationKey, apiToken } = req.body;
        if (!serialNo || !deviceModel || !location || !activationKey) {
            return res.status(400).json({ error: 'serialNo, deviceModel, location, and activationKey are required' });
        }
        const device = await fiscal_service_1.FiscalService.registerDevice(schoolId, {
            serialNo,
            deviceModel,
            location,
            apiUrl: apiUrl || 'https://fdms.zimra.co.zw/api/v1/receipts',
            activationKey,
            apiToken
        });
        res.json(device);
    }
    catch (err) {
        console.error('Register fiscal device error:', err);
        res.status(500).json({ error: err.message || 'Failed to register fiscal device' });
    }
});
/**
 * GET /api/fiscal/dashboard — today's summary, pending queues, recent invoices
 */
router.get('/dashboard', async (req, res) => {
    try {
        const schoolId = req.user?.schoolId;
        if (!schoolId)
            return res.status(400).json({ error: 'Missing schoolId' });
        const dashboard = await fiscal_service_1.FiscalService.getDashboard(schoolId);
        res.json(dashboard);
    }
    catch (err) {
        console.error('Fiscal dashboard error:', err);
        res.status(500).json({ error: err.message || 'Failed to fetch fiscal dashboard' });
    }
});
/**
 * GET /api/fiscal/reports — daily Z-report audit summary for ZIMRA
 */
router.get('/reports', async (req, res) => {
    try {
        const schoolId = req.user?.schoolId;
        if (!schoolId)
            return res.status(400).json({ error: 'Missing schoolId' });
        const { deviceId, fromDate, toDate } = req.query;
        const report = await fiscal_service_1.FiscalService.getDailyAuditReport(schoolId, deviceId ? String(deviceId) : undefined, fromDate ? new Date(String(fromDate)) : undefined, toDate ? new Date(String(toDate)) : undefined);
        res.json(report);
    }
    catch (err) {
        console.error('Fiscal reports error:', err);
        res.status(500).json({ error: err.message || 'Failed to fetch fiscal report' });
    }
});
/**
 * POST /api/fiscal/retry/:id — manually trigger resend for a pending fiscal invoice
 */
router.post('/retry/:id', async (req, res) => {
    try {
        const schoolId = req.user?.schoolId;
        if (!schoolId)
            return res.status(400).json({ error: 'Missing schoolId' });
        const id = req.params.id;
        const result = await fiscal_service_1.FiscalService.retryInvoice(schoolId, id);
        res.json(result);
    }
    catch (err) {
        console.error('Fiscal retry error:', err);
        res.status(500).json({ error: err.message || 'Failed to retry fiscal invoice' });
    }
});
exports.default = router;
//# sourceMappingURL=fiscal.js.map