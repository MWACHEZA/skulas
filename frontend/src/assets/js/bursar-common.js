document.addEventListener('DOMContentLoaded', function () {
    // Authentication Check
    if (!sessionStorage.getItem('bursarLoggedIn')) {
        // Allow public pages if this script is ever used there, but for now assume it's for protected portal pages
        // Check if we are already on login or register page to avoid loop (though they don't include this script usually)
        const path = window.location.pathname;
        if (!path.includes('login.html') && !path.includes('register.html')) {
            window.location.href = 'login.html';
            return;
        }
    }

    // Logout Logic
    const logoutLinks = document.querySelectorAll('a[href*="logout"], a[href*="index.html"]');
    logoutLinks.forEach(link => {
        if (link.textContent.toLowerCase().includes('logout')) {
            link.addEventListener('click', function (e) {
                if (typeof AuditLogger !== 'undefined') {
                    AuditLogger.log('Bursar Logout', `Bursar ${sessionStorage.getItem('bursarName')} logged out`, AuditLogger.SEVERITY.INFO, AuditLogger.PORTAL.BURSAR, 'Authentication');
                }
                sessionStorage.removeItem('bursarLoggedIn');
                sessionStorage.removeItem('bursarEmail');
                sessionStorage.removeItem('bursarName');
                window.location.href = 'login.html';
            });
        }
    });

    // Sidebar toggle logic
    const menuToggle = document.querySelector('.menu-toggle');
    const sidebar = document.querySelector('.sidebar');

    if (menuToggle && sidebar) {
        menuToggle.addEventListener('click', function () {
            sidebar.classList.toggle('active');
        });
    }

    // Mark active link in sidebar
    const currentPath = window.location.pathname.split('/').pop();
    const sidebarLinks = document.querySelectorAll('.sidebar-menu a');

    sidebarLinks.forEach(link => {
        if (link.getAttribute('href') === currentPath) {
            link.classList.add('active');
        }
    });
});

// Helper for notifications (reused from other portals)
function showSuccessMessage(message) {
    const div = document.createElement('div');
    div.style.position = 'fixed';
    div.style.bottom = '20px';
    div.style.right = '20px';
    div.style.backgroundColor = '#28a745';
    div.style.color = 'white';
    div.style.padding = '15px 25px';
    div.style.borderRadius = '5px';
    div.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)';
    div.style.zIndex = '9999';
    div.style.animation = 'slideIn 0.3s ease-out';
    div.textContent = message;

    document.body.appendChild(div);

    setTimeout(() => {
        div.style.opacity = '0';
        div.style.transform = 'translateY(20px)';
        div.style.transition = 'all 0.3s ease-out';
        setTimeout(() => div.remove(), 300);
    }, 3000);
}

// Add styles/keyframes for notifications if not present
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
    }
`;
document.head.appendChild(style);

