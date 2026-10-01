"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TillService = void 0;
const prisma_1 = __importDefault(require("../lib/prisma"));
const sequence_service_1 = require("./sequence.service");
const ledger_service_1 = require("./ledger.service");
class TillService {
    /**
     * Verify that an active till session is open for a device.
     * Throws an error if no till session is open.
     * Server-enforced guard for all sales.
     */
    static async requireOpenTill(schoolId, deviceId) {
        const where = {
            schoolId,
            status: 'OPEN'
        };
        if (deviceId) {
            where.deviceId = deviceId;
        }
        const session = await prisma_1.default.tillSession.findFirst({
            where,
            include: { device: true },
            orderBy: { openedAt: 'desc' }
        });
        if (!session) {
            throw new Error('Server Guard: No active till session is open. All sales are blocked until an authorized till session is opened.');
        }
        return session;
    }
    /**
     * Get active open session for a device if exists
     */
    static async getOpenSession(schoolId, deviceId) {
        return prisma_1.default.tillSession.findFirst({
            where: {
                schoolId,
                deviceId,
                status: 'OPEN'
            },
            include: {
                device: true,
                denominations: true,
                payments: true
            }
        });
    }
    /**
     * Open a new till session.
     * - Validates no active session exists for device
     * - Atomically generates session reference via nextDocNo('TILL')
     * - Posts opening float: DR Till Cash (1023) / CR Main Safe (1020)
     */
    static async openTill(input) {
        const { schoolId, deviceId, userId, openingFloat = 0, tillAccountCode = '1023', ipAddress } = input;
        // Check device exists and belongs to tenant
        const device = await prisma_1.default.fiscalDevice.findFirst({
            where: { id: deviceId, schoolId }
        });
        if (!device)
            throw new Error('Fiscal device not found for this school');
        // Check no session is currently open for this device
        const existing = await prisma_1.default.tillSession.findFirst({
            where: { schoolId, deviceId, status: 'OPEN' }
        });
        if (existing) {
            throw new Error(`Device already has an OPEN till session: ${existing.sessionNumber} opened at ${existing.openedAt.toISOString()}`);
        }
        const sessionNumber = await sequence_service_1.SequenceService.nextDocNo(schoolId, 'TILL');
        // Post opening float if amount > 0:
        // DR Till Cash (1023) / CR Cash Office Vault (1020)
        let floatJournalId = null;
        if (openingFloat > 0) {
            const floatEntry = await ledger_service_1.LedgerService.postDoubleEntry({
                tenantId: schoolId,
                debitCode: tillAccountCode, // e.g. 1023 Tuckshop Cash Till
                creditCode: '1020', // 1020 Cash Office Vault
                amount: openingFloat,
                description: `Opening Till Float: ${sessionNumber} (${device.location})`,
                sourceModule: 'till_float',
                reference: sessionNumber,
                userId,
                ipAddress
            });
            floatJournalId = floatEntry.id;
        }
        // Create session
        const session = await prisma_1.default.tillSession.create({
            data: {
                schoolId,
                deviceId,
                sessionNumber,
                openedByUserId: userId,
                openedAt: new Date(),
                openingFloat,
                status: 'OPEN',
                notes: `Opened with float $${openingFloat.toFixed(2)}`
            },
            include: { device: true }
        });
        return session;
    }
    /**
     * Calculate expected sales for an open till session.
     * Sums fiscal invoices for this device since openedAt, grouped by payment method.
     */
    static async calculateExpectedSales(schoolId, tillSessionId) {
        const session = await prisma_1.default.tillSession.findFirst({
            where: { id: tillSessionId, schoolId }
        });
        if (!session)
            throw new Error('Till session not found');
        const invoices = await prisma_1.default.fiscalInvoice.findMany({
            where: {
                schoolId,
                deviceId: session.deviceId,
                createdAt: { gte: session.openedAt },
                status: { in: ['fiscalised', 'pending'] }
            }
        });
        const breakdown = {
            CASH: 0,
            ECOCASH: 0,
            INNBUCKS: 0,
            CARD: 0,
            BANK: 0
        };
        let totalSales = 0;
        for (const inv of invoices) {
            const pm = (inv.paymentMethod || 'CASH').toUpperCase();
            const signedAmt = inv.isCreditNote ? -Math.abs(inv.amount) : inv.amount;
            breakdown[pm] = (breakdown[pm] || 0) + signedAmt;
            totalSales += signedAmt;
        }
        // Round all amounts to 2 decimals
        for (const key of Object.keys(breakdown)) {
            breakdown[key] = Math.round(breakdown[key] * 100) / 100;
        }
        return {
            sessionNumber: session.sessionNumber,
            openedAt: session.openedAt,
            openingFloat: session.openingFloat,
            expectedCash: Math.round((session.openingFloat + (breakdown.CASH || 0)) * 100) / 100,
            salesOnlyCash: breakdown.CASH || 0,
            salesTotal: Math.round(totalSales * 100) / 100,
            byPaymentMethod: breakdown,
            invoiceCount: invoices.length
        };
    }
    /**
     * Close a till session and reconcile cash drawer:
     * - Records denomination breakdown
     * - Records expected vs counted per payment method
     * - Posts variance to GL:
     *   * Surplus: DR Till Cash (1023) / CR Till Cash Surplus (4910)
     *   * Shortage: DR Till Cash Shortage (5910) / CR Till Cash (1023)
     * - Transfers physical cash above float back to safe: DR Main Safe (1020) / CR Till Cash (1023)
     * - Marks status 'CLOSED' or 'VARIANCE_REVIEW'
     */
    static async closeTill(input) {
        const { schoolId, tillSessionId, userId, denominations, countedPayments, notes, tillAccountCode = '1023', ipAddress } = input;
        const session = await prisma_1.default.tillSession.findFirst({
            where: { id: tillSessionId, schoolId, status: 'OPEN' },
            include: { device: true }
        });
        if (!session)
            throw new Error('Open till session not found');
        const expected = await this.calculateExpectedSales(schoolId, tillSessionId);
        // Calculate counted cash from denominations
        let countedCashTotal = 0;
        for (const d of denominations) {
            countedCashTotal += d.denomination * d.count;
        }
        countedCashTotal = Math.round(countedCashTotal * 100) / 100;
        // Find counted amount for each payment method
        let totalCountedAllMethods = 0;
        const paymentRecords = [];
        let netVariance = 0;
        for (const pm of ['CASH', 'ECOCASH', 'INNBUCKS', 'CARD', 'BANK']) {
            const isCash = pm === 'CASH';
            const expectedAmt = isCash ? expected.expectedCash : (expected.byPaymentMethod[pm] || 0);
            const userCounted = countedPayments.find(p => p.paymentMethod.toUpperCase() === pm);
            const countedAmt = isCash ? countedCashTotal : (userCounted?.countedAmount || 0);
            const variance = Math.round((countedAmt - expectedAmt) * 100) / 100;
            paymentRecords.push({
                schoolId,
                paymentMethod: pm,
                expectedAmount: expectedAmt,
                countedAmount: countedAmt,
                variance
            });
            totalCountedAllMethods += countedAmt;
            netVariance += variance;
        }
        netVariance = Math.round(netVariance * 100) / 100;
        // Read school settings for variance review threshold
        const setting = await prisma_1.default.schoolSetting.findUnique({ where: { schoolId } });
        const varianceThreshold = setting?.tillVarianceThreshold ?? 5.0;
        const isVarianceExceeded = Math.abs(netVariance) > varianceThreshold;
        const sessionFinalStatus = isVarianceExceeded ? 'VARIANCE_REVIEW' : 'CLOSED';
        const closedSession = await prisma_1.default.$transaction(async (tx) => {
            // 1. Post GL variance if non-zero
            if (netVariance !== 0) {
                if (netVariance > 0) {
                    // Surplus / Overage: DR Till Cash (1023) / CR Till Cash Surplus (4910)
                    await ledger_service_1.LedgerService.postDoubleEntry({
                        tenantId: schoolId,
                        debitCode: tillAccountCode,
                        creditCode: '4910', // Till Cash Surplus / Overage
                        amount: Math.abs(netVariance),
                        description: `Till Cash Surplus on Close: ${session.sessionNumber}`,
                        sourceModule: 'till_cashup',
                        reference: session.sessionNumber,
                        userId,
                        ipAddress,
                        tx
                    });
                }
                else {
                    // Shortage / Deficit: DR Till Cash Shortage (5910) / CR Till Cash (1023)
                    await ledger_service_1.LedgerService.postDoubleEntry({
                        tenantId: schoolId,
                        debitCode: '5910', // Till Cash Shortage / Deficit
                        creditCode: tillAccountCode,
                        amount: Math.abs(netVariance),
                        description: `Till Cash Shortage on Close: ${session.sessionNumber}`,
                        sourceModule: 'till_cashup',
                        reference: session.sessionNumber,
                        userId,
                        ipAddress,
                        tx
                    });
                }
            }
            // 2. Transfer cash above opening float to Safe (1020)
            const cashToVault = Math.max(0, countedCashTotal - session.openingFloat);
            if (cashToVault > 0) {
                await ledger_service_1.LedgerService.postDoubleEntry({
                    tenantId: schoolId,
                    debitCode: '1020', // 1020 Cash Office Vault
                    creditCode: tillAccountCode, // 1023 Till Cash
                    amount: cashToVault,
                    description: `Till Cash Deposit to Safe: ${session.sessionNumber}`,
                    sourceModule: 'till_safe_transfer',
                    reference: session.sessionNumber,
                    userId,
                    ipAddress,
                    tx
                });
            }
            // 3. Save Denominations
            for (const d of denominations) {
                if (d.count > 0) {
                    await tx.cashupDenomination.create({
                        data: {
                            schoolId,
                            tillSessionId: session.id,
                            denomination: d.denomination,
                            count: d.count,
                            total: Math.round(d.denomination * d.count * 100) / 100
                        }
                    });
                }
            }
            // 4. Save Payment records
            for (const p of paymentRecords) {
                await tx.cashupPayment.create({
                    data: {
                        ...p,
                        tillSessionId: session.id
                    }
                });
            }
            // 5. Update TillSession
            return tx.tillSession.update({
                where: { id: session.id },
                data: {
                    status: sessionFinalStatus,
                    closedByUserId: userId,
                    closedAt: new Date(),
                    closingCounted: countedCashTotal,
                    expectedSales: expected.salesTotal,
                    variance: netVariance,
                    notes: notes || `Reconciled: net variance $${netVariance.toFixed(2)}`
                },
                include: {
                    denominations: true,
                    payments: true,
                    device: true
                }
            });
        });
        return closedSession;
    }
    /**
     * Get till variance report across all sessions
     */
    static async getVarianceReport(schoolId, limit = 50) {
        return prisma_1.default.tillSession.findMany({
            where: {
                schoolId,
                status: { in: ['CLOSED', 'VARIANCE_REVIEW'] }
            },
            include: {
                device: true,
                payments: true
            },
            orderBy: { closedAt: 'desc' },
            take: limit
        });
    }
}
exports.TillService = TillService;
//# sourceMappingURL=till.service.js.map