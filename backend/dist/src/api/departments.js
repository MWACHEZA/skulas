"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const prisma_1 = __importDefault(require("../lib/prisma"));
const auth_1 = require("../middleware/auth");
const utils_1 = require("../lib/utils");
const security_logger_1 = require("../lib/security-logger");
const router = (0, express_1.Router)();
/**
 * @route   GET /api/departments
 * @desc    Get all departments for the school
 */
router.get('/', auth_1.requireAuth, async (req, res) => {
    const schoolId = req.user.schoolId;
    try {
        const departments = await prisma_1.default.department.findMany({
            where: { schoolId },
            include: {
                _count: { select: { teachers: true, subjects: true, users: true } },
                head: { select: { id: true, name: true, role: true } }
            },
            orderBy: { name: 'asc' }
        });
        res.json(departments);
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to fetch departments' });
    }
});
/**
 * @route   POST /api/departments
 * @desc    Create a new department
 */
router.post('/', auth_1.requireAuth, (0, auth_1.requireRole)('SCHOOL_ADMIN'), async (req, res) => {
    const { name, code, headId, deptCode, duration, services, facilities, pictures } = req.body;
    const schoolId = req.user.schoolId;
    try {
        const finalCode = (0, utils_1.generateShortCode)(name);
        // Strict cleaning of optional relational fields to prevent Prisma validation errors
        const cleanedHeadId = headId && headId.trim() !== '' ? headId : null;
        const cleanedDeptCode = deptCode && deptCode.trim() !== '' ? deptCode.toUpperCase() : null;
        const newDept = await prisma_1.default.department.create({
            data: {
                name,
                code: finalCode,
                deptCode: cleanedDeptCode,
                duration: duration ? parseInt(duration.toString()) : 4,
                schoolId,
                headId: cleanedHeadId,
                services: services || null,
                facilities: facilities || null,
                pictures: pictures || null
            }
        });
        // Audit
        (0, security_logger_1.logSecurityEvent)({ actorId: req.user.id, action: 'CREATE_DEPARTMENT', entityType: 'Department', entityId: newDept.id, details: { name }, schoolId, ipAddress: req.ip });
        res.json(newDept);
    }
    catch (error) {
        console.error('[Departments] Creation failed:', error);
        res.status(500).json({ error: 'Failed to create department' });
    }
});
/**
 * @route   PUT /api/departments/:id
 * @desc    Update a department
 */
router.put('/:id', auth_1.requireAuth, (0, auth_1.requireRole)('SCHOOL_ADMIN'), async (req, res) => {
    const { id } = req.params;
    const { name, code, headId, deptCode, duration, services, facilities, pictures } = req.body;
    try {
        const cleanedHeadId = headId && headId.trim() !== '' ? headId : null;
        const cleanedDeptCode = deptCode && deptCode.trim() !== '' ? deptCode.toUpperCase() : null;
        const updated = await prisma_1.default.department.update({
            where: { id: id },
            data: {
                name,
                code: code || (0, utils_1.generateShortCode)(name),
                deptCode: cleanedDeptCode,
                duration: duration ? parseInt(duration.toString()) : undefined,
                headId: cleanedHeadId,
                services: services !== undefined ? services : undefined,
                facilities: facilities !== undefined ? facilities : undefined,
                pictures: pictures !== undefined ? pictures : undefined
            }
        });
        // Audit
        (0, security_logger_1.logSecurityEvent)({ actorId: req.user.id, action: 'UPDATE_DEPARTMENT', entityType: 'Department', entityId: id, details: { name }, schoolId: req.user.schoolId, ipAddress: req.ip });
        res.json(updated);
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to update department' });
    }
});
/**
 * @route   DELETE /api/departments/:id
 * @desc    Delete a department
 */
router.delete('/:id', auth_1.requireAuth, (0, auth_1.requireRole)('SCHOOL_ADMIN'), async (req, res) => {
    const { id } = req.params;
    try {
        await prisma_1.default.department.delete({ where: { id: id } });
        // Audit
        (0, security_logger_1.logSecurityEvent)({ actorId: req.user.id, action: 'DELETE_DEPARTMENT', entityType: 'Department', entityId: id, details: {}, schoolId: req.user.schoolId, ipAddress: req.ip });
        res.json({ success: true });
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to delete department' });
    }
});
exports.default = router;
//# sourceMappingURL=departments.js.map