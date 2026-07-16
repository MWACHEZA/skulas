/**
 * Extracts school/tenant context from headers or URL parameters.
 * Ensures that requests are scoped to the correct school.
 */
export const tenantContext = (req, res, next) => {
    const tenantCode = req.headers['x-school-code'] || req.query.schoolCode;
    if (tenantCode) {
        req.tenantCode = tenantCode.toUpperCase();
    }
    // If user is logged in, their schoolId is naturally scoped from their JWT
    // But for public requests (news, etc.), we use the code.
    next();
};
//# sourceMappingURL=tenant.js.map