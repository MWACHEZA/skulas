import { Router } from 'express';
import { requireAuth, AuthRequest } from '../middleware/auth';
import { FiscalService } from '../services/fiscal.service';

const router = Router();
router.use(requireAuth);

/**
 * GET /api/fiscal/devices — list all registered fiscal devices
 */
router.get('/devices', async (req: AuthRequest, res) => {
  try {
    const schoolId = req.user?.schoolId;
    if (!schoolId) return res.status(400).json({ error: 'Missing schoolId' });

    const devices = await FiscalService.listDevices(schoolId);
    res.json(devices);
  } catch (err: any) {
    console.error('List fiscal devices error:', err);
    res.status(500).json({ error: err.message || 'Failed to list fiscal devices' });
  }
});

/**
 * POST /api/fiscal/devices — register/update fiscal device with secure vault secrets
 */
router.post('/devices', async (req: AuthRequest, res) => {
  try {
    const schoolId = req.user?.schoolId;
    if (!schoolId) return res.status(400).json({ error: 'Missing schoolId' });

    const { serialNo, deviceModel, location, apiUrl, activationKey, apiToken } = req.body;
    if (!serialNo || !deviceModel || !location || !activationKey) {
      return res.status(400).json({ error: 'serialNo, deviceModel, location, and activationKey are required' });
    }

    const device = await FiscalService.registerDevice(schoolId, {
      serialNo,
      deviceModel,
      location,
      apiUrl: apiUrl || 'https://fdms.zimra.co.zw/api/v1/receipts',
      activationKey,
      apiToken
    });

    res.json(device);
  } catch (err: any) {
    console.error('Register fiscal device error:', err);
    res.status(500).json({ error: err.message || 'Failed to register fiscal device' });
  }
});

/**
 * GET /api/fiscal/dashboard — today's summary, pending queues, recent invoices
 */
router.get('/dashboard', async (req: AuthRequest, res) => {
  try {
    const schoolId = req.user?.schoolId;
    if (!schoolId) return res.status(400).json({ error: 'Missing schoolId' });

    const dashboard = await FiscalService.getDashboard(schoolId);
    res.json(dashboard);
  } catch (err: any) {
    console.error('Fiscal dashboard error:', err);
    res.status(500).json({ error: err.message || 'Failed to fetch fiscal dashboard' });
  }
});

/**
 * GET /api/fiscal/reports — daily Z-report audit summary for ZIMRA
 */
router.get('/reports', async (req: AuthRequest, res) => {
  try {
    const schoolId = req.user?.schoolId;
    if (!schoolId) return res.status(400).json({ error: 'Missing schoolId' });

    const { deviceId, fromDate, toDate } = req.query;
    const report = await FiscalService.getDailyAuditReport(
      schoolId,
      deviceId ? String(deviceId) : undefined,
      fromDate ? new Date(String(fromDate)) : undefined,
      toDate ? new Date(String(toDate)) : undefined
    );

    res.json(report);
  } catch (err: any) {
    console.error('Fiscal reports error:', err);
    res.status(500).json({ error: err.message || 'Failed to fetch fiscal report' });
  }
});

/**
 * POST /api/fiscal/retry/:id — manually trigger resend for a pending fiscal invoice
 */
router.post('/retry/:id', async (req: AuthRequest, res) => {
  try {
    const schoolId = req.user?.schoolId;
    if (!schoolId) return res.status(400).json({ error: 'Missing schoolId' });

    const result = await FiscalService.retryInvoice(schoolId, req.params.id);
    res.json(result);
  } catch (err: any) {
    console.error('Fiscal retry error:', err);
    res.status(500).json({ error: err.message || 'Failed to retry fiscal invoice' });
  }
});

export default router;
