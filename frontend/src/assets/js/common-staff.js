/**
 * Common Staff Logic - Centralized utility for staff data
 */

const CommonStaff = {
    /**
     * Categories supported by the system
     */
    CATEGORIES: [
        'All Staff',
        'Administration',
        'Teaching Staff',
        'Library Staff',
        'Finance Staff',
        'Support Staff'
    ],

    /**
     * Fetches all staff from localStorage and maps them to a consistent format
     */
    getAllStaff: function () {
        const teachers = getTenantData('school_teachers', '[]').map(u => ({
            ...u,
            id: u.id || u.employeeId || 'TCH-' + Math.random().toString(36).substr(2, 6).toUpperCase(),
            name: u.name || u.fullName,
            role: u.role || 'Teacher',
            dept: u.department || 'Academics',
            category: 'Teaching Staff',
            email: u.email || `${(u.name || u.fullName).toLowerCase().replace(/ /g, '.')}@embakwe.ac.zw`,
            phone: u.phone || '+263 770 000 000',
            employer: u.employer || 'SDC',
            baseSalary: u.baseSalary || 0,
            allowances: u.allowances || 0,
            deductions: u.deductions || 0
        }));

        const librarians = getTenantData('school_librarians', '[]').map(u => ({
            ...u,
            id: u.id || u.employeeId,
            name: u.name || u.fullName,
            role: u.role || 'Librarian',
            dept: 'Library',
            category: 'Library Staff',
            email: u.email || `${(u.name || u.fullName).toLowerCase().replace(/ /g, '.')}@embakwe.ac.zw`,
            phone: u.phone || '+263 770 000 001',
            employer: u.employer || 'SDC',
            baseSalary: u.baseSalary || 0,
            allowances: u.allowances || 0,
            deductions: u.deductions || 0
        }));

        const bursars = getTenantData('school_bursars', '[]').map(u => ({
            ...u,
            id: u.id || u.employeeId,
            name: u.name || u.fullName,
            role: u.role || 'Bursar',
            dept: 'Finance',
            category: 'Finance Staff',
            email: u.email || `${(u.name || u.fullName).toLowerCase().replace(/ /g, '.')}@embakwe.ac.zw`,
            phone: u.phone || '+263 770 000 002',
            employer: u.employer || 'SDC',
            baseSalary: u.baseSalary || 0,
            allowances: u.allowances || 0,
            deductions: u.deductions || 0
        }));

        const ancillary = getTenantData('ancillaryStaff', '[]').map(u => ({
            ...u,
            id: u.id || u.employeeId,
            name: u.name || u.fullName,
            role: u.post || u.role || 'Staff',
            dept: u.dept || 'General',
            category: 'Support Staff',
            email: u.email || `${(u.name || u.fullName).toLowerCase().replace(/ /g, '.')}@embakwe.ac.zw`,
            phone: u.phone || '+263 770 000 003',
            employer: u.employer || 'SDC',
            baseSalary: u.baseSalary || 0,
            allowances: u.allowances || 0,
            deductions: u.deductions || 0
        }));

        const admins = getTenantData('adminUsers', '[]').map(u => ({
            ...u,
            id: u.id || 'ADM-001',
            name: u.name || ((u.firstName || '') + ' ' + (u.lastName || '')).trim() || u.username || 'System Admin',
            role: u.adminRole || 'Administrator',
            dept: 'Administration',
            category: 'Administration',
            email: u.email || 'admin@embakwe.ac.zw',
            phone: u.phone || '+263 770 000 000'
        }));

        // Deduplicate or prioritize if someone exists in multiple (unlikely based on storage but good for safety)
        const combined = [...admins, ...teachers, ...librarians, ...bursars, ...ancillary];

        // Ensure consistency
        return combined.map(staff => {
            const names = staff.name ? staff.name.split(' ') : ['U', 'N'];
            const initials = names.length > 1 ? names[0][0] + names[names.length - 1][0] : names[0].substring(0, 2);

            return {
                ...staff,
                initials: initials.toUpperCase()
            };
        });
    }
};

if (typeof module !== 'undefined' && module.exports) {
    module.exports = CommonStaff;
}

