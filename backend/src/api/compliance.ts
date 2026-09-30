import { Router } from 'express';
import { requireAuth, AuthRequest } from '../middleware/auth';
import { ComplianceService } from '../services/compliance.service';

const router = Router();
router.use(requireAuth);

/**
 * GET /api/compliance/zimra/vat2 — ZIMRA Form VAT2 Return
 */
router.get('/zimra/vat2', async (req: AuthRequest, res) => {
  try {
    const schoolId = req.user?.schoolId;
    if (!schoolId) return res.status(400).json({ error: 'Missing schoolId' });

    const period = String(req.query.period || `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`);
    const data = await ComplianceService.getVat2Return(schoolId, period);

    if (req.query.format === 'csv') {
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="ZIMRA_VAT2_${period}.csv"`);
      return res.send(data.csvContent);
    }

    res.json(data);
  } catch (err: any) {
    console.error('VAT2 return error:', err);
    res.status(500).json({ error: err.message || 'Failed to generate VAT2 return' });
  }
});

/**
 * GET /api/compliance/zimra/p2 — ZIMRA Form P2 & NSSA Schedule
 */
router.get('/zimra/p2', async (req: AuthRequest, res) => {
  try {
    const schoolId = req.user?.schoolId;
    if (!schoolId) return res.status(400).json({ error: 'Missing schoolId' });

    const period = String(req.query.period || `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`);
    const data = await ComplianceService.getP2NssaReturn(schoolId, period);

    if (req.query.format === 'csv') {
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="ZIMRA_P2_NSSA_${period}.csv"`);
      return res.send(data.csvContent);
    }

    res.json(data);
  } catch (err: any) {
    console.error('P2 return error:', err);
    res.status(500).json({ error: err.message || 'Failed to generate P2/NSSA return' });
  }
});

/**
 * GET /api/compliance/emis — Ministry of Primary and Secondary Education EMIS extract
 */
router.get('/emis', async (req: AuthRequest, res) => {
  try {
    const schoolId = req.user?.schoolId;
    if (!schoolId) return res.status(400).json({ error: 'Missing schoolId' });

    const year = req.query.year ? String(req.query.year) : undefined;
    const data = await ComplianceService.getEmisDataExtract(schoolId, year);
    res.json(data);
  } catch (err: any) {
    console.error('EMIS extract error:', err);
    res.status(500).json({ error: err.message || 'Failed to generate EMIS extract' });
  }
});

/**
 * GET /api/compliance/clearance/:studentId — Student clearance checklist
 */
router.get('/clearance/:studentId', async (req: AuthRequest, res) => {
  try {
    const schoolId = req.user?.schoolId;
    if (!schoolId) return res.status(400).json({ error: 'Missing schoolId' });

    const studentId = req.params.studentId as string;
    const clearance = await ComplianceService.getStudentClearance(schoolId, studentId);
    res.json(clearance);
  } catch (err: any) {
    console.error('Clearance status error:', err);
    res.status(500).json({ error: err.message || 'Failed to get clearance status' });
  }
});

/**
 * POST /api/compliance/clearance/:studentId/signoff — Department sign-off
 */
router.post('/clearance/:studentId/signoff', async (req: AuthRequest, res) => {
  try {
    const schoolId = req.user?.schoolId;
    if (!schoolId) return res.status(400).json({ error: 'Missing schoolId' });

    const studentId = req.params.studentId as string;
    const { section, notes } = req.body; // LIBRARY | FEES | HOSTEL | FINAL
    if (!section) return res.status(400).json({ error: 'section is required' });

    const updated = await ComplianceService.signoffClearance(
      schoolId,
      studentId,
      section,
      req.user?.id || 'SYSTEM',
      notes
    );

    res.json(updated);
  } catch (err: any) {
    console.error('Clearance signoff error:', err);
    res.status(400).json({ error: err.message || 'Failed to record clearance signoff' });
  }
});

export default router;
