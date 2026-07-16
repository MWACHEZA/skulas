/**
 * Librarian Portal Authentication & Role-Based Access Control
 */

const LibraryAuth = {
    // Permission Matrix
    PERMISSIONS: {
        'Head Librarian': ['*'], // All access
        'Senior Librarian': [
            'dashboard.html',
            'books.html',
            'issue.html',
            'digital.html',
            'reports.html',
            'staff-directory.html',
            'procurement.html',
            'assets.html',
            'schedules.html',
            'it-support.html',
            'news.html',
            'announcements.html',
            'contact.html',
            'profile.html',
            'resources.html'
        ],
        'Librarian': [
            'dashboard.html',
            'books.html',
            'issue.html',
            'digital.html',
            'staff-directory.html',
            'assets.html',
            'it-support.html',
            'news.html',
            'announcements.html',
            'contact.html',
            'profile.html',
            'resources.html'
        ],
        'Library Assistant': [
            'dashboard.html',
            'books.html',
            'issue.html',
            'staff-directory.html',
            'it-support.html',
            'news.html',
            'announcements.html',
            'contact.html',
            'profile.html',
            'resources.html'
        ],
        'Library Technician': [
            'dashboard.html',
            'digital.html',
            'staff-directory.html',
            'assets.html',
            'it-support.html',
            'news.html',
            'announcements.html',
            'contact.html',
            'profile.html',
            'resources.html'
        ]
    },

    // Sidebar Mapping (Link href -> Required Permission/Role)
    SIDEBAR_MAP: {
        'books.html': ['Head Librarian', 'Senior Librarian', 'Librarian', 'Library Assistant'],
        'issue.html': ['Head Librarian', 'Senior Librarian', 'Librarian', 'Library Assistant'],
        'digital.html': ['Head Librarian', 'Senior Librarian', 'Librarian', 'Library Technician'],
        'reports.html': ['Head Librarian', 'Senior Librarian'],
        'procurement.html': ['Head Librarian', 'Senior Librarian'],
        'assets.html': ['Head Librarian', 'Senior Librarian', 'Librarian', 'Library Technician'],
        'schedules.html': ['Head Librarian', 'Senior Librarian'],
        'hr-services.html': ['Head Librarian'],
        'settings.html': ['Head Librarian']
    },

    init: function () {
        const isLoggedIn = sessionStorage.getItem('librarianLoggedIn') === 'true';
        const currentPage = window.location.pathname.split('/').pop() || 'dashboard.html';

        // 1. Check Login
        if (!isLoggedIn && currentPage !== 'login.html' && currentPage !== 'register.html') {
            window.location.href = 'login.html';
            return;
        }

        if (isLoggedIn) {
            const role = sessionStorage.getItem('librarianRole') || 'Librarian';

            // 2. Check Page Access
            if (!this.hasAccess(role, currentPage)) {
                console.warn(`Access denied for role: ${role} on page: ${currentPage}`);
                if (currentPage !== 'dashboard.html') {
                    window.location.href = 'dashboard.html';
                }
            }

            // 3. Update Sidebar Visibility
            this.updateSidebar(role);

            // 4. Update Header Info
            this.updateHeader(role);
        }
    },

    hasAccess: function (role, page) {
        if (page === 'dashboard.html' || page === 'profile.html' || page === 'login.html') return true;

        const allowedPages = this.PERMISSIONS[role];
        if (!allowedPages) return false;
        if (allowedPages.includes('*')) return true;

        return allowedPages.includes(page);
    },

    updateSidebar: function (role) {
        const sidebar = document.querySelector('.sidebar-menu');
        if (!sidebar) return;

        // Get secondary roles from session
        const secondaryRoles = JSON.parse(sessionStorage.getItem('librarianSecondaryRoles') || '[]');
        const isHOD = secondaryRoles.includes('Head of Department');
        const isProcOfficer = secondaryRoles.includes('Procurement Officer');

        const links = sidebar.querySelectorAll('a');
        links.forEach(link => {
            const href = link.getAttribute('href');
            if (this.SIDEBAR_MAP[href]) {
                const allowedRoles = this.SIDEBAR_MAP[href];
                let hasAccess = allowedRoles.includes(role);

                // Add override for secondary roles
                if (href === 'procurement.html' && isProcOfficer) hasAccess = true;
                if ((href === 'procurement.html' || href === 'reports.html') && isHOD) hasAccess = true;

                if (!hasAccess) {
                    link.parentElement.style.display = 'none';
                } else {
                    link.parentElement.style.display = 'block';
                }
            }
        });

        // Hide section titles if all child links are hidden
        const sections = sidebar.querySelectorAll('.sidebar-section-title');
        sections.forEach(section => {
            const ul = section.nextElementSibling;
            if (ul && ul.tagName === 'UL') {
                const visibleLinks = Array.from(ul.querySelectorAll('li')).filter(li => li.style.display !== 'none');
                if (visibleLinks.length === 0) {
                    section.style.display = 'none';
                    ul.style.display = 'none';
                }
            }
        });
    },

    updateHeader: function (role) {
        const userName = sessionStorage.getItem('librarianName') || 'Librarian Admin';
        const nameEl = document.querySelector('.user-profile div div:first-child');
        const roleEl = document.querySelector('.user-profile div div:last-child');

        if (nameEl) nameEl.textContent = userName;
        if (roleEl) roleEl.textContent = role;
    }
};

// Auto-initialize
document.addEventListener('DOMContentLoaded', () => LibraryAuth.init());

