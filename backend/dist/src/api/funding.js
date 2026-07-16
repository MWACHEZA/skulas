import { Router } from 'express';
import prisma from '../lib/prisma';
import { requireAuth, requireRole } from '../middleware/auth';
import { logAction } from '../utils/audit';
const router = Router();
// Get all project funding records for the current school
router.get('/', requireAuth, async (req, res) => {
    try {
        const list = await prisma.projectFunding.findMany({
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
router.post('/', requireAuth, requireRole('SCHOOL_ADMIN', 'BURSAR'), async (req, res) => {
    try {
        const { name, budget, spent, status } = req.body;
        if (!name || budget === undefined) {
            return res.status(400).json({ error: 'Missing required fields: name and budget' });
        }
        const item = await prisma.projectFunding.create({
            data: {
                schoolId: req.user.schoolId,
                name,
                budget: parseFloat(budget),
                spent: spent ? parseFloat(spent) : 0,
                status: status || 'Ongoing'
            }
        });
        // Log this action for audit
        await logAction(req, 'CREATE_PROJECT_FUNDING', 'ProjectFunding', item.id, {
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
router.patch('/:id', requireAuth, requireRole('SCHOOL_ADMIN', 'BURSAR'), async (req, res) => {
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
        const existing = await prisma.projectFunding.findFirst({
            where: { id: String(id), schoolId: req.user.schoolId }
        });
        if (!existing) {
            return res.status(404).json({ error: 'Project funding record not found' });
        }
        const item = await prisma.projectFunding.update({
            where: { id: String(id) },
            data: dataToUpdate
        });
        // Log this action for audit
        await logAction(req, 'UPDATE_PROJECT_FUNDING', 'ProjectFunding', item.id, {
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
router.delete('/:id', requireAuth, requireRole('SCHOOL_ADMIN', 'BURSAR'), async (req, res) => {
    try {
        const { id } = req.params;
        const existing = await prisma.projectFunding.findFirst({
            where: { id: String(id), schoolId: req.user.schoolId }
        });
        if (!existing) {
            return res.status(404).json({ error: 'Project funding record not found' });
        }
        await prisma.projectFunding.delete({
            where: { id: String(id) }
        });
        // Log this action for audit
        await logAction(req, 'DELETE_PROJECT_FUNDING', 'ProjectFunding', String(id), {
            name: existing.name
        });
        res.json({ success: true });
    }
    catch (error) {
        console.error('Error deleting project funding item:', error);
        res.status(500).json({ error: 'Failed to delete project funding item' });
    }
});
export default router;
//# sourceMappingURL=funding.js.map