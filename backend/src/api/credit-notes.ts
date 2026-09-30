import { Router } from 'express';
import { requireAuth, AuthRequest } from '../middleware/auth';
import { CreditNoteService } from '../services/credit-note.service';

const router = Router();
router.use(requireAuth);

/**
 * GET /api/credit-notes — list credit notes for the school
 */
router.get('/', async (req: AuthRequest, res) => {
  try {
    const schoolId = req.user?.schoolId;
    if (!schoolId) return res.status(400).json({ error: 'Missing schoolId' });

    const creditNotes = await CreditNoteService.listCreditNotes(schoolId);
    res.json(creditNotes);
  } catch (err: any) {
    console.error('List credit notes error:', err);
    res.status(500).json({ error: err.message || 'Failed to list credit notes' });
  }
});

/**
 * POST /api/credit-notes — issue a generalized credit note reversing a posted journal transaction
 */
router.post('/', async (req: AuthRequest, res) => {
  try {
    const schoolId = req.user?.schoolId;
    if (!schoolId) return res.status(400).json({ error: 'Missing schoolId' });

    const { originalJournalEntryId, reason } = req.body;
    if (!originalJournalEntryId || !reason) {
      return res.status(400).json({ error: 'originalJournalEntryId and reason are required' });
    }

    const result = await CreditNoteService.createCreditNote({
      schoolId,
      originalJournalEntryId,
      reason,
      issuedByUserId: req.user?.id,
      ipAddress: req.ip
    });

    res.json(result);
  } catch (err: any) {
    console.error('Issue credit note error:', err);
    res.status(400).json({ error: err.message || 'Failed to issue credit note' });
  }
});

/**
 * GET /api/credit-notes/:id — get credit note details with line items and fiscal receipt data
 */
router.get('/:id', async (req: AuthRequest, res) => {
  try {
    const schoolId = req.user?.schoolId;
    if (!schoolId) return res.status(400).json({ error: 'Missing schoolId' });

    const details = await CreditNoteService.getCreditNoteDetails(schoolId, req.params.id);
    res.json(details);
  } catch (err: any) {
    console.error('Get credit note error:', err);
    res.status(404).json({ error: err.message || 'Credit note not found' });
  }
});

export default router;
