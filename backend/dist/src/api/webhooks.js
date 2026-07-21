"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const prisma_1 = __importDefault(require("../lib/prisma"));
const router = (0, express_1.Router)();
// Webhook verification for Meta WhatsApp Cloud API
router.get('/whatsapp', (req, res) => {
    const verify_token = process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN || 'acadex_secret_token';
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];
    if (mode && token) {
        if (mode === 'subscribe' && token === verify_token) {
            res.status(200).send(challenge);
        }
        else {
            res.sendStatus(403);
        }
    }
    else {
        res.sendStatus(400);
    }
});
// Webhook event receiver
router.post('/whatsapp', async (req, res) => {
    try {
        const body = req.body;
        if (body.object === 'whatsapp_business_account') {
            for (const entry of body.entry || []) {
                for (const change of entry.changes || []) {
                    if (change.field === 'messages') {
                        const value = change.value;
                        // Handle statuses (delivery, read, failed)
                        if (value.statuses && value.statuses.length > 0) {
                            for (const status of value.statuses) {
                                const wamid = status.id; // WhatsApp Message ID
                                const messageStatus = status.status; // sent, delivered, read, failed
                                let errorDetails = null;
                                if (status.errors && status.errors.length > 0) {
                                    errorDetails = status.errors.map((e) => e.title || e.message || e.code).join(', ');
                                }
                                // Update CommunicationLog by providerMsgId
                                // We use updateMany because providerMsgId might not be unique (though in practice it is), 
                                // and we might not have the schoolId context in a webhook request.
                                await prisma_1.default.communicationLog.updateMany({
                                    where: { providerMsgId: wamid },
                                    data: {
                                        status: messageStatus === 'failed' ? 'Failed' :
                                            messageStatus === 'read' ? 'Read' :
                                                messageStatus === 'delivered' ? 'Delivered' : 'Sent',
                                        errorDetails: errorDetails || undefined
                                    }
                                });
                            }
                        }
                    }
                }
            }
            res.status(200).send('EVENT_RECEIVED');
        }
        else {
            res.sendStatus(404);
        }
    }
    catch (error) {
        console.error('Webhook processing error:', error);
        res.sendStatus(500);
    }
});
exports.default = router;
//# sourceMappingURL=webhooks.js.map