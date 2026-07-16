/**
 * Handles dynamic sidebar items for the Teacher Portal
 */
document.addEventListener('DOMContentLoaded', function () {
    const user = JSON.parse(sessionStorage.getItem('currentUser') || '{}');
    const roles = user.secondaryRoles || [];

    if (roles.includes('Senior Teacher')) {
        addSeniorTeacherLinks();
    }
});

function addSeniorTeacherLinks() {
    const sidebarMenu = document.querySelector('.sidebar-menu');
    if (!sidebarMenu) return;

    // Find the Operations section or Teacher System section
    const sections = sidebarMenu.querySelectorAll('.sidebar-section-title');
    let operationsSection = null;

    for (const section of sections) {
        if (section.textContent.includes('Operations') || section.textContent.includes('Teacher System')) {
            operationsSection = section;
            break;
        }
    }

    if (operationsSection) {
        const ul = operationsSection.nextElementSibling;
        if (ul && ul.tagName === 'UL') {
            const li = document.createElement('li');
            const isPageActive = window.location.pathname.includes('applications-management.html');
            li.innerHTML = `
                <a href="applications-management.html" class="${isPageActive ? 'active' : ''}">
                    <i class="fas fa-user-check"></i>
                    <span>Applications Management</span>
                </a>
            `;
            // Insert at the top of the list
            ul.insertBefore(li, ul.firstChild);
        }
    }
}

