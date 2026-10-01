"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ComplianceService = void 0;
const prisma_1 = __importDefault(require("../lib/prisma"));
const ledger_service_1 = require("./ledger.service");
const sequence_service_1 = require("./sequence.service");
class ComplianceService {
    /**
     * ZIMRA VAT2 Return data generator for a given month (YYYY-MM).
     * Generates both structured data and ZIMRA e-services CSV format.
     */
    static async getVat2Return(schoolId, period) {
        const [yearStr, monthStr] = period.split('-');
        const year = parseInt(yearStr);
        const month = parseInt(monthStr);
        const startDate = new Date(year, month - 1, 1);
        const endDate = new Date(year, month, 0, 23, 59, 59, 999);
        // 1. Fetch Fiscal Invoices
        const fiscalInvoices = await prisma_1.default.fiscalInvoice.findMany({
            where: {
                schoolId,
                createdAt: { gte: startDate, lte: endDate },
                status: { in: ['fiscalised', 'pending'] }
            }
        });
        let standardRatedSales = 0;
        let standardRatedVat = 0;
        let exemptSales = 0;
        let creditNotesTotal = 0;
        let creditNotesVat = 0;
        for (const inv of fiscalInvoices) {
            if (inv.isCreditNote) {
                creditNotesTotal += Math.abs(inv.amount);
                creditNotesVat += Math.abs(inv.vatAmount);
            }
            else {
                standardRatedSales += inv.amount;
                standardRatedVat += inv.vatAmount;
            }
        }
        // 2. Fetch exempt school fees billed in the same period from GL
        const tuitionLines = await prisma_1.default.journalEntryLine.findMany({
            where: {
                schoolId,
                coaCode: { in: ['4010', '4020', '4030'] },
                journalEntry: {
                    schoolId,
                    date: { gte: startDate, lte: endDate },
                    status: 'POSTED'
                }
            }
        });
        for (const l of tuitionLines) {
            exemptSales += l.credit;
        }
        const netTaxableSales = Math.round((standardRatedSales - creditNotesTotal) * 100) / 100;
        const netVatPayable = Math.round((standardRatedVat - creditNotesVat) * 100) / 100;
        // Tenant info
        const setting = await prisma_1.default.schoolSetting.findUnique({ where: { schoolId } });
        const school = await prisma_1.default.school.findUnique({ where: { id: schoolId } });
        // Format as CSV for ZIMRA e-Services
        const csvRows = [
            ['ZIMRA FORM VAT2 - VALUE ADDED TAX RETURN', `Period: ${period}`],
            ['Taxpayer Name', school?.name || 'School'],
            ['TIN / VAT Number', setting?.vatNumber || '100234567'],
            ['Currency', setting?.baseCurrency || 'USD'],
            [],
            ['Line', 'Description', 'Gross Sales (USD)', 'VAT Amount (USD)'],
            ['1', 'Standard Rated Supplies (15%)', standardRatedSales.toFixed(2), standardRatedVat.toFixed(2)],
            ['2', 'Exempt Supplies (Tuition/Boarding)', exemptSales.toFixed(2), '0.00'],
            ['3', 'Credit Notes & Adjustments', (-creditNotesTotal).toFixed(2), (-creditNotesVat).toFixed(2)],
            ['4', 'Net Taxable Supplies', netTaxableSales.toFixed(2), netVatPayable.toFixed(2)],
            ['5', 'Input Tax Deductions (Claimed)', '0.00', '0.00'],
            ['6', 'NET VAT PAYABLE TO ZIMRA', netTaxableSales.toFixed(2), netVatPayable.toFixed(2)]
        ];
        const csvContent = csvRows.map(r => r.join(',')).join('\n');
        return {
            period,
            schoolName: school?.name,
            vatNumber: setting?.vatNumber || '100234567',
            standardRatedSales,
            standardRatedVat,
            exemptSales,
            creditNotesTotal,
            creditNotesVat,
            netTaxableSales,
            netVatPayable,
            csvContent
        };
    }
    /**
     * ZIMRA P2 (PAYE) & NSSA Return data generator for a given month
     */
    static async getP2NssaReturn(schoolId, period) {
        const [yearStr, monthStr] = period.split('-');
        const year = parseInt(yearStr);
        const month = parseInt(monthStr);
        const startDate = new Date(year, month - 1, 1);
        const endDate = new Date(year, month, 0, 23, 59, 59, 999);
        // Fetch payroll lines posted to GL
        const payrollLines = await prisma_1.default.journalEntryLine.findMany({
            where: {
                schoolId,
                coaCode: { in: ['5000', '5010', '5011', '5012', '5013', '5017', '2020', '2022'] },
                journalEntry: {
                    schoolId,
                    date: { gte: startDate, lte: endDate },
                    status: 'POSTED'
                }
            }
        });
        let grossSalaries = 0;
        let payeWithheld = 0;
        let nssaEmployer = 0;
        let nssaEmployee = 0;
        for (const l of payrollLines) {
            if (['5000', '5010', '5011', '5012', '5013'].includes(l.coaCode || '')) {
                grossSalaries += l.debit;
            }
            if (l.coaCode === '2020') {
                payeWithheld += l.credit;
            }
            if (l.coaCode === '5017') {
                nssaEmployer += l.debit;
            }
            if (l.coaCode === '2022') {
                nssaEmployee += l.credit;
            }
        }
        const school = await prisma_1.default.school.findUnique({ where: { id: schoolId } });
        const setting = await prisma_1.default.schoolSetting.findUnique({ where: { schoolId } });
        const csvRows = [
            ['ZIMRA FORM P2 / NSSA MONTHLY REMITTANCE SCHEDULE', `Period: ${period}`],
            ['Employer Name', school?.name || 'School'],
            ['Employer BP Number', setting?.vatNumber || '100234567'],
            [],
            ['Category', 'Amount (USD)'],
            ['Total Gross Remuneration', grossSalaries.toFixed(2)],
            ['Total PAYE Withheld (Form P2)', payeWithheld.toFixed(2)],
            ['NSSA Employer Contribution (4.5%)', nssaEmployer.toFixed(2)],
            ['NSSA Employee Contribution (4.5%)', nssaEmployee.toFixed(2)],
            ['TOTAL STATUTORY REMITTANCE DUE', (payeWithheld + nssaEmployer + nssaEmployee).toFixed(2)]
        ];
        return {
            period,
            schoolName: school?.name,
            grossSalaries,
            payeWithheld,
            nssaEmployer,
            nssaEmployee,
            totalStatutoryDue: payeWithheld + nssaEmployer + nssaEmployee,
            csvContent: csvRows.map(r => r.join(',')).join('\n')
        };
    }
    /**
     * Enforce period lock at service layer.
     * Throws an error naming the locked period if posting to closed period.
     */
    static async enforcePeriodLock(schoolId, period) {
        const lockedPeriod = await prisma_1.default.accountingPeriod.findFirst({
            where: {
                schoolId,
                period: period,
                status: { in: ['CLOSED', 'LOCKED'] }
            }
        });
        if (lockedPeriod) {
            throw new Error(`Accounting Period "${period}" is ${lockedPeriod.status}. Posting to a locked accounting period is strictly prohibited.`);
        }
    }
    /**
     * Enforce Debtor Limit on student invoicing.
     * Blocks invoice if balance + newAmount > debtorLimit, unless an override approval exists.
     */
    static async checkDebtorLimit(schoolId, studentId, newInvoiceAmount) {
        const setting = await prisma_1.default.schoolSetting.findUnique({ where: { schoolId } });
        const limit = setting?.debtorLimit ?? 500.0;
        // Compute live balance from student journal lines or pending fees
        const fees = await prisma_1.default.fee.findMany({
            where: { schoolId, studentId, status: { in: ['PENDING', 'PARTIAL'] } }
        });
        const balanceFromFees = fees.reduce((sum, f) => sum + (f.amount - (f.paidAmount || 0)), 0);
        const journalLines = await prisma_1.default.journalEntryLine.findMany({
            where: {
                schoolId,
                studentId,
                coaCode: '1200' // Accounts Receivable - Student Fees
            }
        });
        const balanceFromJournal = journalLines.reduce((sum, l) => sum + (l.debit - l.credit), 0);
        const balance = Math.max(balanceFromFees, balanceFromJournal, 0);
        const projectedBalance = balance + newInvoiceAmount;
        if (projectedBalance > limit) {
            // Check if an approved override exists
            const overrideApproval = await prisma_1.default.approval.findFirst({
                where: {
                    schoolId,
                    entityType: 'STUDENT_DEBTOR_OVERRIDE',
                    entityId: studentId,
                    status: 'APPROVED'
                }
            });
            if (!overrideApproval) {
                throw new Error(`Debtor Limit Exceeded: Student account balance ($${balance.toFixed(2)}) plus new invoice ($${newInvoiceAmount.toFixed(2)}) would reach $${projectedBalance.toFixed(2)}, exceeding the institution limit of $${limit.toFixed(2)}. An authorized Bursar/SDC override approval is required.`);
            }
        }
        return { allowed: true, limit, currentBalance: balance, projectedBalance };
    }
    /**
     * Enforce Negative Stock Block.
     * Prevents sales/dispense/issue if inventory would drop below 0.
     */
    static async checkNegativeStock(schoolId, currentStock, quantityToDeduct, itemName) {
        const setting = await prisma_1.default.schoolSetting.findUnique({ where: { schoolId } });
        const allowNegative = setting?.allowNegativeStock ?? false;
        if (!allowNegative && (currentStock - quantityToDeduct < 0)) {
            throw new Error(`Negative Stock Block: "${itemName}" only has ${currentStock} units in stock. Dispensing/selling ${quantityToDeduct} units is blocked by policy.`);
        }
    }
    /**
     * Ministry of Primary and Secondary Education (EMIS) data extract.
     * Generates standard tables: Enrolment by Form/Gender, Termly fees billed vs collected.
     */
    static async getEmisDataExtract(schoolId, academicYear) {
        const year = academicYear || String(new Date().getFullYear());
        // 1. Enrolment by Form and Gender
        const students = await prisma_1.default.student.findMany({
            where: {
                schoolId,
                status: 'ACTIVE'
            },
            select: {
                id: true,
                gender: true,
                grade: true,
                dateOfBirth: true
            }
        });
        const formBreakdown = {};
        for (const s of students) {
            const form = s.grade || 'Unassigned';
            if (!formBreakdown[form])
                formBreakdown[form] = { male: 0, female: 0, total: 0 };
            const g = (s.gender || '').toUpperCase();
            if (g.startsWith('M'))
                formBreakdown[form].male += 1;
            else if (g.startsWith('F'))
                formBreakdown[form].female += 1;
            formBreakdown[form].total += 1;
        }
        // 2. Fees Billed vs Collected
        const [billedAgg, collectedAgg] = await Promise.all([
            prisma_1.default.journalEntryLine.aggregate({
                where: {
                    schoolId,
                    coaCode: { in: ['4010', '4020', '4030'] },
                    journalEntry: {
                        period: { startsWith: year },
                        status: 'POSTED'
                    }
                },
                _sum: { credit: true }
            }),
            prisma_1.default.journalEntryLine.aggregate({
                where: {
                    schoolId,
                    coaCode: '1100', // Student Debtors Control credited on payment
                    journalEntry: {
                        period: { startsWith: year },
                        status: 'POSTED'
                    }
                },
                _sum: { credit: true }
            })
        ]);
        const totalBilled = billedAgg._sum.credit || 0;
        const totalCollected = collectedAgg._sum.credit || 0;
        const collectionRate = totalBilled > 0 ? Math.round((totalCollected / totalBilled) * 1000) / 10 : 0;
        return {
            academicYear: year,
            totalEnrolment: students.length,
            formBreakdown,
            feesSummary: {
                totalBilled,
                totalCollected,
                outstanding: Math.max(0, totalBilled - totalCollected),
                collectionRatePercent: collectionRate
            }
        };
    }
    /**
     * Student Clearance Workflow:
     * Cross-checks Library (no unreturned books), Fees (balance <= 0), Hostel.
     */
    static async getStudentClearance(schoolId, studentId) {
        // 1. Live Library Check: active book loans
        const activeLoans = await prisma_1.default.bookLoan.findMany({
            where: {
                studentId,
                returnDate: null
            },
            include: { book: true }
        });
        const hasUnreturnedBooks = activeLoans.length > 0;
        // 2. Live Fees Check: student balance
        const feesBalance = await ledger_service_1.LedgerService.getStudentBalance(schoolId, studentId);
        const isFeesClear = feesBalance <= 0;
        // 3. Upsert StudentClearance record
        const clearance = await prisma_1.default.studentClearance.upsert({
            where: {
                schoolId_studentId: {
                    schoolId,
                    studentId
                }
            },
            update: {
                feesBalance,
                feesCleared: isFeesClear,
                libraryCleared: !hasUnreturnedBooks
            },
            create: {
                schoolId,
                studentId,
                feesBalance,
                feesCleared: isFeesClear,
                libraryCleared: !hasUnreturnedBooks,
                hostelCleared: false,
                status: 'PENDING'
            },
            include: {
                student: true
            }
        });
        return {
            clearance,
            checks: {
                library: {
                    cleared: !hasUnreturnedBooks,
                    unreturnedBooksCount: activeLoans.length,
                    books: activeLoans.map(l => l.book.title)
                },
                fees: {
                    cleared: isFeesClear,
                    balance: feesBalance
                },
                hostel: {
                    cleared: clearance.hostelCleared,
                    notes: clearance.hostelNotes
                },
                final: {
                    cleared: clearance.finalCleared,
                    certificateNo: clearance.certificateNo,
                    signedBy: clearance.finalSignedBy,
                    signedAt: clearance.finalSignedAt
                }
            }
        };
    }
    /**
     * Sign-off clearance section (Library, Fees, Hostel, or Final Admin/Bursar sign-off)
     */
    static async signoffClearance(schoolId, studentId, section, userId, notes) {
        const current = await this.getStudentClearance(schoolId, studentId);
        const updateData = {};
        const now = new Date();
        if (section === 'LIBRARY') {
            updateData.libraryCleared = true;
            updateData.libraryNotes = notes || 'Library confirmed clear';
            updateData.librarySignedBy = userId;
            updateData.librarySignedAt = now;
        }
        else if (section === 'FEES') {
            updateData.feesCleared = true;
            updateData.feesNotes = notes || 'Fees confirmed clear or exception granted';
            updateData.feesSignedBy = userId;
            updateData.feesSignedAt = now;
        }
        else if (section === 'HOSTEL') {
            updateData.hostelCleared = true;
            updateData.hostelNotes = notes || 'Hostel kit & room checked';
            updateData.hostelSignedBy = userId;
            updateData.hostelSignedAt = now;
        }
        else if (section === 'FINAL') {
            // Must have Library, Fees, and Hostel cleared before final sign-off
            if (!current.clearance.libraryCleared || !current.clearance.feesCleared || !current.clearance.hostelCleared) {
                throw new Error('All departments (Library, Fees, Hostel) must sign off before issuing final Clearance Certificate.');
            }
            const certNo = await sequence_service_1.SequenceService.nextDocNo(schoolId, 'CLEAR');
            updateData.finalCleared = true;
            updateData.finalSignedBy = userId;
            updateData.finalSignedAt = now;
            updateData.certificateNo = certNo;
            updateData.status = 'APPROVED';
        }
        const updated = await prisma_1.default.studentClearance.update({
            where: {
                schoolId_studentId: {
                    schoolId,
                    studentId
                }
            },
            data: updateData,
            include: { student: true }
        });
        return updated;
    }
}
exports.ComplianceService = ComplianceService;
//# sourceMappingURL=compliance.service.js.map