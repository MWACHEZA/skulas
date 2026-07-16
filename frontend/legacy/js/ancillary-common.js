/* Ancillary Portal - Common JavaScript */

document.addEventListener('DOMContentLoaded', function () {
    // 1. Mobile Menu Toggle
    const sidebar = document.querySelector('.sidebar');
    const mobileToggle = document.getElementById('mobile-toggle');

    if (mobileToggle && sidebar) {
        mobileToggle.addEventListener('click', function () {
            sidebar.classList.toggle('active');

            // Toggle icon
            const icon = mobileToggle.querySelector('i');
            if (sidebar.classList.contains('active')) {
                icon.classList.remove('fa-bars');
                icon.classList.add('fa-times');
            } else {
                icon.classList.remove('fa-times');
                icon.classList.add('fa-bars');
            }
        });
    }

    // 2. User Greeting (from sessionStorage)
    const userName = sessionStorage.getItem('ancillaryEmail') || 'Staff Member';
    const welcomeMsg = document.querySelector('.welcome-text h2');
    if (welcomeMsg && userName !== 'Staff Member') {
        welcomeMsg.textContent = `Welcome back, ${userName.split('@')[0]}!`;
    }

    // 3. Close sidebar when clicking outside on mobile
    document.addEventListener('click', function (event) {
        if (!sidebar || !mobileToggle) return;

        const isClickInsideSidebar = sidebar.contains(event.target);
        const isClickOnToggle = mobileToggle.contains(event.target);

        if (!isClickInsideSidebar && !isClickOnToggle && sidebar.classList.contains('active')) {
            sidebar.classList.remove('active');
            const icon = mobileToggle.querySelector('i');
            icon.classList.remove('fa-times');
            icon.classList.add('fa-bars');
        }
    });

    // 4. Smooth scrolling for anchor links
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            const href = this.getAttribute('href');
            if (href === '#') return;

            e.preventDefault();
            const target = document.querySelector(href);
            if (target) {
                target.scrollIntoView({
                    behavior: 'smooth'
                });
            }
        });
    });

    // 5. Active Link Highlighting
    const currentPath = window.location.pathname.split('/').pop() || 'dashboard.html';
    document.querySelectorAll('.sidebar-menu a').forEach(link => {
        const href = link.getAttribute('href');
        if (href === currentPath || (currentPath === 'dashboard.html' && href === 'dashboard.html')) {
            link.classList.add('active');
        } else {
            link.classList.remove('active');
        }
    });

    // 6. Tuckshop Access Control
    checkTuckshopAccess();

    // 7. Global User Profile Display
    updateUserProfileDisplay();

    // 8. Logout Instrumentation
    const logoutBtn = document.querySelector('.sidebar-footer a[href="login.html"]');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', function (e) {
            if (typeof AuditLogger !== 'undefined') {
                const user = JSON.parse(sessionStorage.getItem('ancillaryUser') || '{}');
                AuditLogger.log('Logout', `User ${user.name || 'Staff'} logged out`, AuditLogger.SEVERITY.INFO, AuditLogger.PORTAL.TEACHER, 'Authentication');
            }
            sessionStorage.clear();
        });
    }
});

function updateUserProfileDisplay() {
    const userJson = sessionStorage.getItem('ancillaryUser');
    if (!userJson) return;

    try {
        const user = JSON.parse(userJson);

        // Update specific profile elements if they exist
        // 1. Top Header Profile (Name & Role)
        const headerName = document.querySelector('.user-profile .name, .user-profile div[style*="font-weight: 600"]');
        const headerRole = document.querySelector('.user-profile .role, .user-profile div[style*="color: #888"]');

        if (headerName) headerName.textContent = user.name;
        if (headerRole) headerRole.textContent = user.post || user.dept;

        // 4. Teacher Portal Logic
        handleTeacherPortalProfile();

    } catch (e) {
        console.error('Error updating profile display:', e);
    }
}

function handleTeacherPortalProfile() {
    const currentUser = JSON.parse(getTenantData('currentUser', 'null') || '{}');
    if (currentUser.role !== 'Teacher') return;

    // Load full teacher data
    const teachers = getTenantData('school_teachers', '[]');
    const teacher = teachers.find(t => t.id === currentUser.id || t.email === currentUser.email);

    if (teacher) {
        // Inject/Update Sidebar Footer Info
        const sidebarFooter = document.querySelector('.sidebar-footer');
        if (sidebarFooter) {
            let userInfo = sidebarFooter.querySelector('.user-info');
            if (!userInfo) {
                userInfo = document.createElement('div');
                userInfo.className = 'user-info';
                userInfo.style.marginBottom = '15px';
                sidebarFooter.insertBefore(userInfo, sidebarFooter.firstChild);
            }

            const avatarHtml = teacher.profilePicture
                ? `<img src="${teacher.profilePicture}" alt="Avatar" style="width: 100%; height: 100%; border-radius: 50%; object-fit: cover;">`
                : `<div class="user-avatar" style="background-color: #003d7a; color: white; display: flex; align-items: center; justify-content: center; width: 40px; height: 40px; border-radius: 50%;">
                    <span>${teacher.initials || teacher.name.charAt(0)}</span>
                   </div>`;

            userInfo.innerHTML = `
                <div class="user-avatar" id="sidebarAvatar">
                    ${avatarHtml}
                </div>
                <div class="user-details">
                    <h4 id="sidebarUserName">${teacher.name}</h4>
                    <p id="sidebarUserDept">${teacher.department || 'General'}</p>
                </div>
            `;
        }

        // Update Dashboard Greeting if on dashboard
        if (window.location.pathname.includes('dashboard.html')) {
            const dashboardTitle = document.querySelector('.dashboard-header h2');
            if (dashboardTitle) {
                const hour = new Date().getHours();
                let greeting = 'Good Morning';
                if (hour >= 12 && hour < 17) greeting = 'Good Afternoon';
                if (hour >= 17) greeting = 'Good Evening';
                dashboardTitle.innerText = `${greeting}, ${teacher.name.split(' ')[0]}`;
            }
        }
    }
}

function checkTuckshopAccess() {
    const userJson = sessionStorage.getItem('ancillaryUser');
    if (!userJson) return;

    let user;
    try {
        user = JSON.parse(userJson);
    } catch (e) {
        console.error('Error parsing user data', e);
        return;
    }

    const isTuckshopManager = (user.dept === 'Tuckshop Management') ||
        (user.secondaryRoles && user.secondaryRoles.includes('Tuckshop Manager'));
    const tuckshopSidebarSection = document.getElementById('tuckshop-sidebar-section');

    // Toggle Sidebar Visibility
    if (tuckshopSidebarSection) {
        if (isTuckshopManager) {
            tuckshopSidebarSection.style.display = 'block';
        } else {
            tuckshopSidebarSection.style.display = 'none';
        }
    }

    // Access Protection for Tuckshop Pages
    // Access Protection for Tuckshop Pages
    const isTuckshopPage = window.location.pathname.includes('tuckshop-');

    if (isTuckshopPage && !isTuckshopManager) {
        // Redirect unauthorized access
        alert('Access Denied: specialized area for Tuckshop Managers only.');
        window.location.href = 'dashboard.html';
    }
}

/**
 * Universal Toast Notification System
 * @param {string} message - The message to display
 * @param {string} type - 'success', 'info', or 'error'
 */
function showNotification(message, type = 'success') {
    // Remove existing toasts
    const existing = document.querySelectorAll('.ancillary-toast');
    existing.forEach(t => t.remove());

    const toast = document.createElement('div');
    toast.className = `ancillary-toast toast-${type}`;

    let icon = 'fa-check-circle';
    if (type === 'error') icon = 'fa-exclamation-circle';
    if (type === 'info') icon = 'fa-info-circle';

    toast.innerHTML = `
        <i class="fas ${icon}"></i>
        <div class="toast-content">
            <span class="toast-message">${message}</span>
        </div>
    `;

    // Apply styles directly or assume they exist in CSS
    Object.assign(toast.style, {
        position: 'fixed',
        bottom: '30px',
        right: '30px',
        background: type === 'success' ? '#10b981' : (type === 'error' ? '#ef4444' : '#0056b3'),
        color: 'white',
        padding: '15px 25px',
        borderRadius: '12px',
        boxShadow: '0 10px 25px rgba(0,0,0,0.1)',
        display: 'flex',
        alignItems: 'center',
        gap: '15px',
        zIndex: '9999',
        animation: 'slideUp 0.4s ease-out',
        fontWeight: '600',
        fontSize: '0.95rem'
    });

    document.body.appendChild(toast);

    // Fade out and remove
    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transition = 'opacity 0.5s ease-out';
        setTimeout(() => toast.remove(), 500);
    }, 4000);
}

// Add animation to document if not present
if (!document.getElementById('ancillary-animations')) {
    const style = document.createElement('style');
    style.id = 'ancillary-animations';
    style.textContent = `
        @keyframes slideUp {
            from { transform: translateY(100px); opacity: 0; }
            to { transform: translateY(0); opacity: 1; }
        }
    `;
    document.head.appendChild(style);
}

/**
 * Simulates a file download by creating a blob and triggering a download link
 * @param {string} filename - The name of the file to download
 * @param {string} content - The content of the file
 * @param {string} mimeType - The MIME type of the file
 */
function simulateDownload(filename, content = 'Mock content for demonstration purposes.', mimeType = 'text/plain') {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();

    setTimeout(() => {
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
    }, 0);
}

