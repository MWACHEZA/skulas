import { Router } from 'express';
import { requireAuth, AuthRequest } from '../middleware/auth';
import { TillService } from '../services/till.service';

const router = Router();
router.use(requireAuth);

/**
 * GET /api/tills/active — check active session for a device
 */
router.get('/active', async (req: AuthRequest, res) => {
  try {
    const schoolId = req.user?.schoolId;
    if (!schoolId) return res.status(400).json({ error: 'Missing schoolId' });

    const deviceId = String(req.query.deviceId || '');
    if (!deviceId) return res.status(400).json({ error: 'deviceId query param is required' });

    const session = await TillService.getOpenSession(schoolId, deviceId);
    res.json({ session });
  } catch (err: any) {
    console.error('Get active till error:', err);
    res.status(500).json({ error: err.message || 'Failed to check active till session' });
  }
});

/**
 * POST /api/tills/open — open a till session with float
 */
router.post('/open', async (req: AuthRequest, res) => {
  try {
    const schoolId = req.user?.schoolId;
    if (!schoolId) return res.status(400).json({ error: 'Missing schoolId' });

    const { deviceId, openingFloat, tillAccountCode } = req.body;
    if (!deviceId) return res.status(400).json({ error: 'deviceId is required' });

    const session = await TillService.openTill({
      schoolId,
      deviceId,
      userId: req.user?.id || 'SYSTEM',
      openingFloat: parseFloat(openingFloat) || 0,
      tillAccountCode: tillAccountCode || '1023',
      ipAddress: req.ip
    });

    res.json(session);
  } catch (err: any) {
    console.error('Open till error:', err);
    res.status(400).json({ error: err.message || 'Failed to open till session' });
  }
});

/**
 * GET /api/tills/:id/expected — live calculated expected sales during session
 */
router.get('/:id/expected', async (req: AuthRequest, res) => {
  try {
    const schoolId = req.user?.schoolId;
    if (!schoolId) return res.status(400).json({ error: 'Missing schoolId' });

    const id = req.params.id as string;
    const expected = await TillService.calculateExpectedSales(schoolId, id);
    res.json(expected);
  } catch (err: any) {
    console.error('Calculate expected till sales error:', err);
    res.status(500).json({ error: err.message || 'Failed to calculate expected sales' });
  }
});

/**
 * POST /api/tills/:id/close — close till session and reconcile cash-up
 */
router.post('/:id/close', async (req: AuthRequest, res) => {
  try {
    const schoolId = req.user?.schoolId;
    if (!schoolId) return res.status(400).json({ error: 'Missing schoolId' });

    const id = req.params.id as string;
    const { denominations, countedPayments, notes, tillAccountCode } = req.body;

    const closed = await TillService.closeTill({
      schoolId,
      tillSessionId: id,
      userId: req.user?.id || 'SYSTEM',
      denominations: denominations || [],
      countedPayments: countedPayments || [],
      notes,
      tillAccountCode: tillAccountCode || '1023',
      ipAddress: req.ip
    });

    res.json(closed);
  } catch (err: any) {
    console.error('Close till error:', err);
    res.status(400).json({ error: err.message || 'Failed to close till session' });
  }
});

/**
 * GET /api/tills/variances — list sessions with variance
 */
router.get('/variances', async (req: AuthRequest, res) => {
  try {
    const schoolId = req.user?.schoolId;
    if (!schoolId) return res.status(400).json({ error: 'Missing schoolId' });

    const limit = parseInt(String(req.query.limit || '50')) || 50;
    const records = await TillService.getVarianceReport(schoolId, limit);
    res.json(records);
  } catch (err: any) {
    console.error('Till variances error:', err);
    res.status(500).json({ error: err.message || 'Failed to fetch variance report' });
  }
});

export default router;
