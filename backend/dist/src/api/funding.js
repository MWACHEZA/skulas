"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const prisma_1 = __importDefault(require("../lib/prisma"));
const auth_1 = require("../middleware/auth");
const audit_1 = require("../utils/audit");
const ledger_service_1 = require("../services/ledger.service");
const coa_seeder_1 = require("../../prisma/seeders/coa.seeder");
const router = (0, express_1.Router)();
// Get all project funding records for the current school
router.get('/', auth_1.requireAuth, async (req, res) => {
    try {
        const list = await prisma_1.default.projectFunding.findMany({
            where: { schoolId: req.user.schoolId },
            orderBy: { name: 'asc' }
        });
        res.json(list);
    }
    catch (error) {
        console.error('Error fetching project funding list:', error);
        res.status(500).json({ error: 'Failed to fetch project funding list' });
    }
});
// Create a new project funding record (Admin/Bursar only)
router.post('/', auth_1.requireAuth, (0, auth_1.requireRole)('SCHOOL_ADMIN', 'BURSAR'), async (req, res) => {
    try {
        const { name, budget, spent, status } = req.body;
        if (!name || budget === undefined) {
            return res.status(400).json({ error: 'Missing required fields: name and budget' });
        }
        const item = await prisma_1.default.projectFunding.create({
            data: {
                schoolId: req.user.schoolId,
                name,
                budget: parseFloat(budget),
                spent: spent ? parseFloat(spent) : 0,
                status: status || 'Ongoing'
            }
        });
        try {
            const parentId = await (0, coa_seeder_1.getAccountId)(req.user.schoolId, '2100', prisma_1.default);
            await prisma_1.default.chartOfAccount.create({
                data: {
                    schoolId: req.user.schoolId,
                    code: `PROJ-${item.id.substring(0, 6).toUpperCase()}`,
                    name: `Project: ${name}`,
                    type: 'ASSET',
                    parentId,
                    description: `Capital project funding tracking for ${name}`,
                    isSystemAccount: false,
                    isActive: true
                }
            });
        }
        catch (e) {
            console.error('Failed to create chart of account for project', e);
        }
        // Log this action for audit
        await (0, audit_1.logAction)(req, 'CREATE_PROJECT_FUNDING', 'ProjectFunding', item.id, {
            name,
            budget,
            spent
        });
        res.status(201).json(item);
    }
    catch (error) {
        console.error('Error creating project funding item:', error);
        res.status(500).json({ error: 'Failed to create project funding item' });
    }
});
// Update a project funding record (Admin/Bursar only)
router.patch('/:id', auth_1.requireAuth, (0, auth_1.requireRole)('SCHOOL_ADMIN', 'BURSAR'), async (req, res) => {
    try {
        const { id } = req.params;
        const { name, budget, spent, status } = req.body;
        const dataToUpdate = {};
        if (name !== undefined)
            dataToUpdate.name = name;
        if (budget !== undefined)
            dataToUpdate.budget = parseFloat(budget);
        if (spent !== undefined)
            dataToUpdate.spent = parseFloat(spent);
        if (status !== undefined)
            dataToUpdate.status = status;
        const existing = await prisma_1.default.projectFunding.findFirst({
            where: { id: String(id), schoolId: req.user.schoolId }
        });
        if (!existing) {
            return res.status(404).json({ error: 'Project funding record not found' });
        }
        const item = await prisma_1.default.projectFunding.update({
            where: { id: String(id) },
            data: dataToUpdate
        });
        // Check if spent amount increased
        if (spent !== undefined) {
            const newSpent = parseFloat(spent);
            const delta = newSpent - existing.spent;
            if (delta > 0) {
                try {
                    // Find the project's chart of account
                    const projectAccount = await prisma_1.default.chartOfAccount.findFirst({
                        where: {
                            schoolId: req.user.schoolId,
                            code: { startsWith: `PROJ-${existing.id.substring(0, 6).toUpperCase()}` }
                        }
                    });
                    if (projectAccount) {
                        const bankAccountId = await (0, coa_seeder_1.getAccountId)(req.user.schoolId, '1110', prisma_1.default);
                        await ledger_service_1.LedgerService.postEntry({
                            schoolId: req.user.schoolId,
                            date: new Date(),
                            description: `Additional spending on project: ${item.name}`,
                            sourceType: 'funding',
                            sourceId: `proj_${item.id}_${Date.now()}`,
                            createdByUserId: req.user.id,
                            lines: [
                                { accountId: projectAccount.id, debit: delta, description: 'Capital project expenditure' },
                                { accountId: bankAccountId, credit: delta, description: 'Bank withdrawal for project' }
                            ],
                            tx: prisma_1.default
                        });
                    }
                }
                catch (e) {
                    console.error('Failed to post ledger entry for project spending', e);
                }
            }
        }
        // Log this action for audit
        await (0, audit_1.logAction)(req, 'UPDATE_PROJECT_FUNDING', 'ProjectFunding', item.id, {
            changedFields: Object.keys(dataToUpdate)
        });
        res.json(item);
    }
    catch (error) {
        console.error('Error updating project funding item:', error);
        res.status(500).json({ error: 'Failed to update project funding item' });
    }
});
// Delete a project funding record (Admin/Bursar only)
router.delete('/:id', auth_1.requireAuth, (0, auth_1.requireRole)('SCHOOL_ADMIN', 'BURSAR'), async (req, res) => {
    try {
        const { id } = req.params;
        const existing = await prisma_1.default.projectFunding.findFirst({
            where: { id: String(id), schoolId: req.user.schoolId }
        });
        if (!existing) {
            return res.status(404).json({ error: 'Project funding record not found' });
        }
        await prisma_1.default.projectFunding.delete({
            where: { id: String(id) }
        });
        // Log this action for audit
        await (0, audit_1.logAction)(req, 'DELETE_PROJECT_FUNDING', 'ProjectFunding', String(id), {
            name: existing.name
        });
        res.json({ success: true });
    }
    catch (error) {
        console.error('Error deleting project funding item:', error);
        res.status(500).json({ error: 'Failed to delete project funding item' });
    }
});
exports.default = router;
//# sourceMappingURL=funding.js.map