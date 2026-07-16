/**
 * AuditLogger - Centralized logging utility for the entire system.
 * This utility manages system-wide audit logs in localStorage.
 */
const AuditLogger = {
    STORAGE_KEY: 'auditLogs',
    MAX_LOGS: 1000, // Retention limit

    SEVERITY: {
        INFO: 'info',
        WARNING: 'warning',
        CRITICAL: 'critical'
    },

    PORTAL: {
        ADMIN: 'Admin',
        TEACHER: 'Teacher',
        BURSAR: 'Bursar',
        STUDENT: 'Student',
        ALUMNI: 'Alumni',
        PUBLIC: 'Public'
    },

    /**
     * Log an action to the audit logs.
     * @param {string} action - Short description of the action (e.g., 'User Login')
     * @param {string|object} details - Detailed information or object changes
     * @param {string} severity - Severity level (info, warning, critical)
     * @param {string} portal - The portal where the action occurred
     * @param {string} category - Functional area (e.g., 'Auth', 'Finance', 'Academics')
     */
    log: function (action, details, severity = 'info', portal = 'Unknown', category = 'System') {
        try {
            const logs = getTenantData(this.STORAGE_KEY, '[]');

            // Get current user info (assuming it's stored in session/localStorage)
            const currentUser = getTenantData('currentUser', 'null') || 'System';
            const userObj = typeof currentUser === 'string' && currentUser.startsWith('{')
                ? JSON.parse(currentUser)
                : { name: currentUser };

            const newLog = {
                id: Date.now() + Math.random().toString(36).substr(2, 9),
                timestamp: new Date().toISOString(),
                user: userObj.name || userObj.username || 'Unknown',
                action: action,
                details: typeof details === 'object' ? JSON.stringify(details) : details,
                severity: severity,
                portal: portal,
                category: category,
                ip: 'LocalSession' // Placeholder for IP if needed
            };

            // Add to the beginning of the array
            logs.unshift(newLog);

            // Enforce retention limit
            if (logs.length > this.MAX_LOGS) {
                logs.length = this.MAX_LOGS;
            }

            saveTenantData(this.STORAGE_KEY, logs);
            console.log(`[AuditLog] ${action} logged successfully.`);
        } catch (error) {
            console.error('Failed to save audit log:', error);
        }
    },

    /**
     * Utility method for logging authentication events
     */
    logAuth: function (action, status, details = '') {
        const severity = status === 'success' ? this.SEVERITY.INFO : this.SEVERITY.WARNING;
        this.log(action, details, severity, this.PORTAL.PUBLIC, 'Authentication');
    },

    /**
     * Clear all logs (Admin only functionality usually)
     */
    clearLogs: function () {
        saveTenantData(this.STORAGE_KEY, []);
        this.log('Logs Cleared', 'System administrator cleared all audit logs', this.SEVERITY.WARNING, this.PORTAL.ADMIN, 'System');
    }
};

// Export if in a module environment or make global
if (typeof module !== 'undefined' && module.exports) {
    module.exports = AuditLogger;
} else {
    window.AuditLogger = AuditLogger;
}

