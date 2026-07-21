"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.tenantContext = void 0;
/**
 * Extracts school/tenant context from headers or URL parameters.
 * Ensures that requests are scoped to the correct school.
 */
const tenantContext = (req, res, next) => {
    const tenantCode = req.headers['x-school-code'] || req.query.schoolCode;
    if (tenantCode) {
        req.tenantCode = tenantCode.toUpperCase();
    }
    // If user is logged in, their schoolId is naturally scoped from their JWT
    // But for public requests (news, etc.), we use the code.
    next();
};
exports.tenantContext = tenantContext;
//# sourceMappingURL=tenant.js.map