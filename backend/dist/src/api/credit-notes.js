"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = require("../middleware/auth");
const credit_note_service_1 = require("../services/credit-note.service");
const router = (0, express_1.Router)();
router.use(auth_1.requireAuth);
/**
 * GET /api/credit-notes — list credit notes for the school
 */
router.get('/', async (req, res) => {
    try {
        const schoolId = req.user?.schoolId;
        if (!schoolId)
            return res.status(400).json({ error: 'Missing schoolId' });
        const creditNotes = await credit_note_service_1.CreditNoteService.listCreditNotes(schoolId);
        res.json(creditNotes);
    }
    catch (err) {
        console.error('List credit notes error:', err);
        res.status(500).json({ error: err.message || 'Failed to list credit notes' });
    }
});
/**
 * POST /api/credit-notes — issue a generalized credit note reversing a posted journal transaction
 */
router.post('/', async (req, res) => {
    try {
        const schoolId = req.user?.schoolId;
        if (!schoolId)
            return res.status(400).json({ error: 'Missing schoolId' });
        const { originalJournalEntryId, reason } = req.body;
        if (!originalJournalEntryId || !reason) {
            return res.status(400).json({ error: 'originalJournalEntryId and reason are required' });
        }
        const result = await credit_note_service_1.CreditNoteService.createCreditNote({
            schoolId,
            originalJournalEntryId,
            reason,
            issuedByUserId: req.user?.id,
            ipAddress: req.ip
        });
        res.json(result);
    }
    catch (err) {
        console.error('Issue credit note error:', err);
        res.status(400).json({ error: err.message || 'Failed to issue credit note' });
    }
});
/**
 * GET /api/credit-notes/:id — get credit note details with line items and fiscal receipt data
 */
router.get('/:id', async (req, res) => {
    try {
        const schoolId = req.user?.schoolId;
        if (!schoolId)
            return res.status(400).json({ error: 'Missing schoolId' });
        const details = await credit_note_service_1.CreditNoteService.getCreditNoteDetails(schoolId, req.params.id);
        res.json(details);
    }
    catch (err) {
        console.error('Get credit note error:', err);
        res.status(404).json({ error: err.message || 'Credit note not found' });
    }
});
exports.default = router;
//# sourceMappingURL=credit-notes.js.map