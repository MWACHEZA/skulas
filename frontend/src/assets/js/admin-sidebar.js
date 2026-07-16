/**
 * admin-sidebar.js
 * Shared sidebar for all Admin Portal pages.
 * Reads the logged-in admin role from sessionStorage and shows only allowed pages.
 * Auto-detects the current page and highlights the active link.
 * Injects sidebar CSS + HTML into the page dynamically.
 */

(function () {
    'use strict';

    // ─── Role Access Map ──────────────────────────────────────────────────────
    // Keys must exactly match the adminRole values stored at registration.
    const ROLE_ACCESS = {
        'Super Administrator': [
            'dashboard', 'analytics', 'school-branding',
            'users', 'admin-management', 'school-contacts', 'students-management', 'teachers-management', 'librarian-management',
            'bursar-management', 'ancillary-management', 'alumni-management', 'applications-management', 'supplier-management',
            'classes-management', 'subjects', 'timetable-management', 'grades-overview',
            'fees', 'payments', 'financial-reports', 'asset-management', 'procurement', 'tuckshop-overview',
            'announcements-management', 'school-website-manager', 'messages', 'notifications',
            'audit-logs', 'it-support', 'settings', 'subscription', 'reports', 'profile'
        ],
        'Academic Administrator': [
            'dashboard', 'analytics',
            'students-management', 'teachers-management', 'alumni-management', 'applications-management',
            'classes-management', 'subjects', 'timetable-management', 'grades-overview',
            'announcements-management', 'messages', 'notifications',
            'reports', 'profile'
        ],
        'Financial Administrator': [
            'dashboard', 'analytics',
            'students-management', 'alumni-management', 'supplier-management',
            'fees', 'payments', 'financial-reports', 'asset-management', 'procurement', 'tuckshop-overview',
            'messages', 'notifications',
            'reports', 'profile'
        ],
        'System Administrator': [
            'dashboard', 'analytics', 'school-branding',
            'users', 'admin-management', 'school-contacts', 'librarian-management', 'supplier-management',
            'asset-management', 'procurement', 'tuckshop-overview',
            'announcements-management', 'school-website-manager', 'messages', 'notifications',
            'audit-logs', 'it-support', 'settings', 'subscription', 'reports', 'profile'
        ],
        'HR Administrator': [
            'dashboard',
            'users', 'admin-management', 'students-management', 'teachers-management', 'librarian-management',
            'bursar-management', 'ancillary-management', 'supplier-management',
            'announcements-management', 'messages', 'notifications',
            'reports', 'profile'
        ]
    };

    // ─── Full Menu Definition ─────────────────────────────────────────────────
    const MENU = [
        {
            section: 'Main',
            items: [
                { key: 'dashboard', href: 'dashboard.html', icon: 'fa-tachometer-alt', label: 'Dashboard' },
                { key: 'analytics', href: 'analytics.html', icon: 'fa-chart-line', label: 'Analytics' }
            ]
        },
        {
            section: 'User Management',
            items: [
                { key: 'users', href: 'users.html', icon: 'fa-users', label: 'All Users' },
                { key: 'admin-management', href: 'admin-management.html', icon: 'fa-user-shield', label: 'Admin Management' },
                { key: 'students-management', href: 'students-management.html', icon: 'fa-user-graduate', label: 'Students' },
                { key: 'teachers-management', href: 'teachers-management.html', icon: 'fa-chalkboard-teacher', label: 'Teachers' },
                { key: 'librarian-management', href: 'librarian-management.html', icon: 'fa-book-reader', label: 'Librarian' },
                { key: 'bursar-management', href: 'bursar-management.html', icon: 'fa-money-check-alt', label: 'Bursar' },
                { key: 'ancillary-management', href: 'ancillary-management.html', icon: 'fa-user-cog', label: 'Ancillary Staff' },
                { key: 'supplier-management', href: 'supplier-management.html', icon: 'fa-truck', label: 'Suppliers' },
                { key: 'alumni-management', href: 'alumni-management.html', icon: 'fa-user-tie', label: 'Alumni' },
                { key: 'applications-management', href: 'applications-management.html', icon: 'fa-file-signature', label: 'Applications' }
            ]
        },
        {
            section: 'Academic',
            items: [
                { key: 'classes-management', href: 'classes-management.html', icon: 'fa-chalkboard', label: 'Classes' },
                { key: 'subjects', href: 'subjects.html', icon: 'fa-book', label: 'Subjects' },
                { key: 'timetable-management', href: 'timetable-management.html', icon: 'fa-calendar-alt', label: 'Timetable' },
                { key: 'grades-overview', href: 'grades-overview.html', icon: 'fa-graduation-cap', label: 'Grades' }
            ]
        },
        {
            section: 'Financial',
            items: [
                { key: 'fees', href: 'fees.html', icon: 'fa-dollar-sign', label: 'Fees' },
                { key: 'payments', href: 'payments.html', icon: 'fa-credit-card', label: 'Payments' },
                { key: 'financial-reports', href: 'financial-reports.html', icon: 'fa-file-invoice-dollar', label: 'Financial Reports' },
                { key: 'tuckshop-overview', href: 'tuckshop-overview.html', icon: 'fa-store', label: 'Tuckshop Overview' },
                { key: 'asset-management', href: 'asset-management.html', icon: 'fa-boxes', label: 'Asset Management' },
                { key: 'procurement', href: 'procurement.html', icon: 'fa-shopping-cart', label: 'Procurement' }
            ]
        },
        {
            section: 'Communication',
            items: [
                { key: 'announcements-management', href: 'announcements-management.html', icon: 'fa-bullhorn', label: 'Announcements' },
                { key: 'school-contacts', href: 'school-contacts.html', icon: 'fa-address-book', label: 'School Contacts' },
                { key: 'messages', href: 'messages.html', icon: 'fa-envelope', label: 'Messages' },
                { key: 'notifications', href: 'notifications.html', icon: 'fa-bell', label: 'Notifications' }
            ]
        },
        {
            section: 'System',
            items: [
                { key: 'school-branding', href: 'school-branding.html', icon: 'fa-paint-brush', label: 'School Branding' },
                { key: 'school-website-manager', href: 'school-website-manager.html', icon: 'fa-globe', label: 'Website Manager' },
                { key: 'audit-logs', href: 'audit-logs.html', icon: 'fa-history', label: 'Audit Logs' },
                { key: 'it-support', href: 'it-support.html', icon: 'fa-headset', label: 'IT Support' },
                { key: 'settings', href: 'settings.html', icon: 'fa-cog', label: 'Settings' },
                { key: 'subscription', href: 'subscription.html', icon: 'fa-credit-card', label: 'Subscription' },
                { key: 'reports', href: 'reports.html', icon: 'fa-file-alt', label: 'System Reports' },
                { key: 'profile', href: 'profile.html', icon: 'fa-user-circle', label: 'My Profile' }
            ]
        }
    ];

    // ─── Helpers ──────────────────────────────────────────────────────────────
    function getUser() {
        let user = {};
        try {
            // 1. Try sessionStorage (direct full record)
            const sess = sessionStorage.getItem('adminUser');
            if (sess) return JSON.parse(sess);

            // 2. Try to resolve via username + adminUsers list
            const username = sessionStorage.getItem('adminUsername');
            if (username) {
                const admins = getTenantData('adminUsers', '[]');
                const found = admins.find(a => a.username === username || a.email === username);
                if (found) {
                    sessionStorage.setItem('adminUser', JSON.stringify(found));
                    return found;
                }
            }

            // 3. Fallback to currentUser (simplified)
            const cu = getTenantData('currentUser', 'null');
            if (cu) return JSON.parse(cu);
        } catch (e) { console.error('Sidebar: Error loading user', e); }
        return {};
    }

    function getRole() {
        const user = getUser();
        if (user.adminRole) return user.adminRole;
        // Fallback from currentUser
        try {
            const cu = JSON.parse(getTenantData('currentUser', 'null') || '{}');
            return cu.role || 'Super Administrator';
        } catch (e) { return 'Super Administrator'; }
    }

    function getCurrentPageKey() {
        const filename = window.location.pathname.split('/').pop().replace('.html', '');
        return filename;
    }

    function getAllowedPages(role) {
        return ROLE_ACCESS[role] || ROLE_ACCESS['Super Administrator'];
    }

    // ─── CSS injection ────────────────────────────────────────────────────────
    function injectCSS() {
        if (document.getElementById('admin-sidebar-css')) return;
        const style = document.createElement('style');
        style.id = 'admin-sidebar-css';
        style.textContent = `
            /* === Admin Sidebar Shared Styles === */
            .admin-container { display: flex; min-height: 100vh; }

            .sidebar {
                width: 250px; background: var(--school-primary, #1a1a1a) !important; color: white;
                position: fixed; top: 0; left: 0; height: 100%; overflow-y: auto; z-index: 1000;
                display: flex; flex-direction: column; font-family: 'Poppins', sans-serif;
                transition: transform 0.3s ease;
            }
            .sidebar-header {
                padding: 16px; border-bottom: 1px solid rgba(255,255,255,0.08);
                text-align: center; flex-shrink: 0;
            }
            .sidebar-header img { width: 46px; margin-bottom: 8px; display: block; margin-left: auto; margin-right: auto; }
            .sidebar-header h3 { margin: 0; font-size: 0.78rem; font-weight: 700; letter-spacing: 1.2px; color: white; }

            .sidebar-user-info {
                padding: 12px 14px; border-bottom: 1px solid rgba(255,255,255,0.06);
                display: flex; align-items: center; gap: 10px;
            }
            .sidebar-user-avatar {
                width: 36px; height: 36px; border-radius: 50%; background: #333;
                display: flex; align-items: center; justify-content: center;
                font-size: 0.88rem; font-weight: 700; color: white; flex-shrink: 0; overflow: hidden;
            }
            .sidebar-user-avatar img { width: 100%; height: 100%; object-fit: cover; }
            .sidebar-user-name  { font-size: 0.82rem; font-weight: 600; color: white; }
            .sidebar-user-role  { font-size: 0.7rem;  color: rgba(255,255,255,0.5); margin-top: 1px; }

            .sidebar-role-badge {
                display: inline-block; margin: 0 14px 10px;
                padding: 3px 10px; border-radius: 12px; font-size: 0.65rem; font-weight: 700;
                letter-spacing: 0.5px; text-transform: uppercase;
            }
            .role-super    { background: rgba(220,53,69,0.25);  color: #ff8a94; }
            .role-academic { background: rgba(0,86,179,0.25);   color: #7db8ff; }
            .role-financial{ background: rgba(40,167,69,0.25);  color: #72e08a; }
            .role-system   { background: rgba(255,193,7,0.25);  color: #ffe066; }
            .role-hr       { background: rgba(156,39,176,0.25); color: #d488ff; }

            .sidebar-menu-wrap { flex: 1; padding: 8px 0; overflow-y: auto; }
            .menu-section-title {
                padding: 8px 14px 3px; font-size: 0.62rem;
                text-transform: uppercase; color: #555; font-weight: 700; letter-spacing: 0.8px;
            }
            .sidebar-menu ul { list-style: none; padding: 0; margin: 0; }
            .sidebar-menu li { margin-bottom: 1px; }
            .sidebar-menu a {
                display: flex; align-items: center; padding: 9px 14px;
                color: rgba(255,255,255,0.62); text-decoration: none;
                transition: all 0.2s; font-size: 0.83rem; gap: 10px; border-left: 3px solid transparent;
            }
            .sidebar-menu a:hover { background: rgba(255,255,255,0.07); color: white; border-left-color: var(--school-accent, rgba(255,255,255,1)); }
            .sidebar-menu a.active { background: rgba(var(--school-accent-rgb), 0.15); color: white; border-left-color: var(--school-accent, white); font-weight: 600; }
            .sidebar-menu a i { width: 16px; text-align: center; font-size: 0.85rem; flex-shrink: 0; }

            .sidebar-footer {
                padding: 10px 0; border-top: 1px solid rgba(255,255,255,0.08); flex-shrink: 0;
            }
            .sidebar-footer a {
                display: flex; align-items: center; padding: 9px 14px;
                color: rgba(255,100,100,0.85); text-decoration: none;
                gap: 10px; font-size: 0.83rem; transition: all 0.2s; border-left: 3px solid transparent;
            }
            .sidebar-footer a:hover { color: #ff6464; background: rgba(255,80,80,0.08); border-left-color: #ff6464; }
            .sidebar-footer a i { width: 16px; text-align: center; font-size: 0.85rem; }

            .main-content { flex: 1; margin-left: 250px; min-height: 100vh; }

            /* Access denied banner */
            .access-denied-banner {
                background: #fff3cd; border-left: 5px solid #ffc107;
                padding: 14px 20px; margin: 20px; border-radius: 8px;
                display: flex; align-items: center; gap: 12px; font-size: 0.9rem; color: #856404;
            }
            .access-denied-banner i { font-size: 1.4rem; }

            @media (max-width: 768px) {
                .sidebar { transform: translateX(-100%); }
                .sidebar.sidebar-open { transform: translateX(0); }
                .main-content { margin-left: 0; }
                .mobile-menu-btn {
                    display: flex !important; position: fixed; top: 12px; left: 12px; z-index: 1100;
                    background: #1a1a1a; color: white; border: none; border-radius: 6px;
                    width: 38px; height: 38px; align-items: center; justify-content: center;
                    font-size: 1.1rem; cursor: pointer;
                }
            }
            .mobile-menu-btn { display: none; }
        `;
        document.head.appendChild(style);
    }

    // ─── Role badge class ─────────────────────────────────────────────────────
    function roleBadgeClass(role) {
        if (role.includes('Super')) return 'role-super';
        if (role.includes('Academic')) return 'role-academic';
        if (role.includes('Financial')) return 'role-financial';
        if (role.includes('System')) return 'role-system';
        if (role.includes('HR')) return 'role-hr';
        return 'role-super';
    }

    // ─── Build sidebar HTML ───────────────────────────────────────────────────
    function buildSidebar(user, role, allowed, currentKey, school) {
        const schoolName = (school && school.name) ? school.name : 'ADMIN PORTAL';
        const initials = (user.name || role || 'AD')
            .split(' ').map(w => w.charAt(0).toUpperCase()).join('').slice(0, 2) || 'AD';

        let avatarHTML = user.photo
            ? `<img src="${user.photo}" alt="">`
            : initials;

        let sectionsHTML = '';
        MENU.forEach(group => {
            const visibleItems = group.items.filter(item => allowed.includes(item.key));
            if (visibleItems.length === 0) return;

            const itemsHTML = visibleItems.map(item => {
                const isActive = item.key === currentKey ? ' active' : '';
                return `<li><a href="${item.href}" class="${isActive.trim()}"><i class="fas ${item.icon}"></i> ${item.label}</a></li>`;
            }).join('');

            sectionsHTML += `
                <div class="menu-section">
                    <div class="menu-section-title">${group.section}</div>
                    <ul>${itemsHTML}</ul>
                </div>`;
        });

        return `
            <div class="sidebar-header">
                <img src="../images/logo.png" alt="School Logo" class="acadex-school-logo">
                <h3 class="acadex-school-name">${schoolName}</h3>
            </div>
            <div class="sidebar-user-info">
                <div class="sidebar-user-avatar">${avatarHTML}</div>
                <div>
                    <div class="sidebar-user-name">${user.name || user.username || 'Administrator'}</div>
                    <div class="sidebar-user-role">${role}</div>
                </div>
            </div>
            <span class="sidebar-role-badge ${roleBadgeClass(role)}">${role}</span>
            <div class="sidebar-menu-wrap">
                <div class="sidebar-menu">${sectionsHTML}</div>
            </div>
            <div class="sidebar-footer">
                <a href="../index.html" target="_blank" style="color: #60a5fa;"><i class="fas fa-external-link-alt"></i> View Website</a>
                <a href="#" id="adminLogoutLink"><i class="fas fa-sign-out-alt"></i> Logout</a>
            </div>`;
    }

    // ─── Access denied overlay ────────────────────────────────────────────────
    function showAccessDenied(role, currentKey) {
        const mainContent = document.querySelector('.main-content') || document.querySelector('.content-area');
        if (!mainContent) return;
        const banner = document.createElement('div');
        banner.className = 'access-denied-banner';
        banner.innerHTML = `
            <i class="fas fa-shield-alt"></i>
            <div>
                <strong>Access Restricted</strong><br>
                Your role (<em>${role}</em>) does not have permission to view this page.
                <a href="dashboard.html" style="margin-left:10px;font-weight:600;color:#856404;">← Go to Dashboard</a>
            </div>`;
        mainContent.insertBefore(banner, mainContent.firstChild);
    }

    // ─── Main init ────────────────────────────────────────────────────────────
    function init() {
        injectCSS();

        const sidebar = document.getElementById('sidebar');
        if (!sidebar) return;

        const user = getUser();
        const role = getRole();
        const allowed = getAllowedPages(role);
        const currentKey = getCurrentPageKey();

        // Get school data for branding
        const school = (window.AcadexCore) ? AcadexCore.getActiveSchool() : null;

        sidebar.innerHTML = buildSidebar(user, role, allowed, currentKey, school);
        sidebar.style.cssText = ''; // clear any inline overrides from old pages

        // Logout handler
        const logoutLink = document.getElementById('adminLogoutLink');
        if (logoutLink) {
            logoutLink.addEventListener('click', function (e) {
                e.preventDefault();
                sessionStorage.removeItem('adminLoggedIn');
                sessionStorage.removeItem('adminUsername');
                sessionStorage.removeItem('adminUser');
                window.location.href = 'login.html';
            });
        }

        // Access check — skip for dashboard and profile (always allowed)
        const skipCheck = ['dashboard', 'login', 'register', 'profile', ''];
        if (!skipCheck.includes(currentKey) && !allowed.includes(currentKey)) {
            showAccessDenied(role, currentKey);
        }

        // Mobile toggle button
        let mobileBtn = document.getElementById('adminMobileMenuBtn');
        if (!mobileBtn) {
            mobileBtn = document.createElement('button');
            mobileBtn.id = 'adminMobileMenuBtn';
            mobileBtn.className = 'mobile-menu-btn';
            mobileBtn.innerHTML = '<i class="fas fa-bars"></i>';
            document.body.appendChild(mobileBtn);
        }
        mobileBtn.addEventListener('click', function () {
            sidebar.classList.toggle('sidebar-open');
        });
        document.addEventListener('click', function (e) {
            if (!sidebar.contains(e.target) && e.target !== mobileBtn) {
                sidebar.classList.remove('sidebar-open');
            }
        });

        // Apply branding to the freshly injected sidebar
        if (window.AcadexTenant && school) {
            AcadexTenant.applyBranding(school);
        }
    }

    // Run after DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();

