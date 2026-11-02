import { Router, Response } from 'express';
import { requireAuth, AuthRequest } from '../middleware/auth';
import { PaynowService } from '../services/paynow.service';

const router = Router();

/**
 * @route   POST /api/payments/paynow/initiate
 * @desc    [PARENT / STUDENT] Initiate a Paynow transaction (Fees or Wallet)
 */
router.post('/paynow/initiate', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { studentId, amount, purpose, paymentMethod, phone, email, notes } = req.body;

    const schoolId = req.user?.schoolId;
    if (!schoolId) {
      return res.status(400).json({ error: 'School context required' });
    }

    if (!studentId) {
      return res.status(400).json({ error: 'Student ID is required' });
    }

    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      return res.status(400).json({ error: 'Please enter a valid positive payment amount' });
    }

    const result = await PaynowService.initiatePayment({
      schoolId,
      studentId,
      amount: parsedAmount,
      purpose: purpose || 'FEES',
      paymentMethod: paymentMethod || 'paynow',
      phone: phone || (req.user as any)?.phone,
      email: email || req.user?.email,
      userId: req.user?.id,
      notes
    });

    res.json(result);
  } catch (error: any) {
    console.error('Paynow initiation error:', error);
    res.status(500).json({ error: error.message || 'Failed to initiate Paynow transaction' });
  }
});

/**
 * @route   GET /api/payments/paynow/status/:reference
 * @desc    Check status of an ongoing Paynow transaction
 */
router.get('/paynow/status/:reference', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const reference = Array.isArray(req.params.reference) ? req.params.reference[0] : req.params.reference;
    const result = await PaynowService.checkStatus(reference, req.user?.schoolId);
    res.json(result);
  } catch (error: any) {
    console.error('Paynow status check error:', error);
    res.status(404).json({ error: error.message || 'Transaction not found' });
  }
});

/**
 * @route   POST /api/payments/paynow/simulate-approve/:reference
 * @desc    Dev / Test simulation to approve a pending Paynow transaction instantly
 */
router.post('/paynow/simulate-approve/:reference', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const reference = Array.isArray(req.params.reference) ? req.params.reference[0] : req.params.reference;
    const session = await PaynowService.simulateApproval(reference);
    res.json({
      success: true,
      message: 'Transaction approved and completed successfully!',
      session
    });
  } catch (error: any) {
    console.error('Paynow simulated approval error:', error);
    res.status(500).json({ error: error.message || 'Failed to simulate approval' });
  }
});

/**
 * @route   POST /api/payments/paynow/webhook
 * @desc    Public IPN Webhook callback from Paynow servers
 */
router.post('/paynow/webhook', async (req, res) => {
  try {
    const body = req.body;
    const reference = body?.reference;

    if (!reference) {
      return res.status(400).send('Missing reference');
    }

    if (body.status?.toLowerCase() === 'paid') {
      await PaynowService.completePayment(reference);
    }

    res.status(200).send('OK');
  } catch (error) {
    console.error('Paynow webhook error:', error);
    res.status(500).send('Server error');
  }
});

export default router;
