"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireFeature = void 0;
const prisma_1 = __importDefault(require("../lib/prisma"));
/**
 * Middleware: Checks if the school's plan includes the required feature.
 * @param featureName The name of the feature to check for.
 */
const requireFeature = (featureName) => {
    return async (req, res, next) => {
        if (!req.user || !req.user.schoolId) {
            res.status(401).json({ error: 'Unauthenticated or no school context' });
            return;
        }
        try {
            const school = await prisma_1.default.school.findUnique({
                where: { id: req.user.schoolId },
                include: { plan: true },
            });
            if (!school || !school.plan) {
                res.status(403).json({ error: 'School or Plan not found' });
                return;
            }
            // Check if the plan's feature list includes the requested feature
            // Note: We use case-insensitive check and also support 'Everything in X' inheritance
            const hasFeature = school.plan.features.some(f => f.toLowerCase() === featureName.toLowerCase() ||
                f.toLowerCase().includes('everything in'));
            if (!hasFeature) {
                res.status(403).json({
                    error: `Feature "${featureName}" is not included in your institution's current plan.`,
                    requiredFeature: featureName,
                    currentPlan: school.plan.name
                });
                return;
            }
            next();
        }
        catch (err) {
            console.error('Feature check error:', err);
            res.status(500).json({ error: 'Internal server error while verifying feature access' });
        }
    };
};
exports.requireFeature = requireFeature;
//# sourceMappingURL=features.js.map