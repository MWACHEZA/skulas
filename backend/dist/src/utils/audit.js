"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.logAction = void 0;
const prisma_1 = __importDefault(require("../lib/prisma"));
const logAction = async (req, action, entityType, entityId, details) => {
    try {
        if (!req.user || !req.user.schoolId)
            return;
        await prisma_1.default.auditLog.create({
            data: {
                action,
                entityType,
                entityId,
                details: details || {},
                actorId: req.user.id,
                schoolId: req.user.schoolId,
                ipAddress: req.ip || req.socket.remoteAddress
            }
        });
    }
    catch (err) {
        console.error('Audit Log Error:', err);
    }
};
exports.logAction = logAction;
//# sourceMappingURL=audit.js.map