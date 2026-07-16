// Shared Announcements Loader for all portals
document.addEventListener('DOMContentLoaded', function () {
    initAnnouncements();
});

function initAnnouncements() {
    const container = document.getElementById('announcements-container');
    if (!container) return;

    const portalRole = getPortalRole();
    const announcements = getTenantData('schoolAnnouncements', '[]');

    // Filter by audience and published status
    const filtered = announcements.filter(a =>
        a.status === 'Published' &&
        (a.audience === portalRole || a.audience === 'All')
    );

    if (filtered.length === 0) {
        container.innerHTML = '<div class="no-announcements">No new announcements at this time.</div>';
        return;
    }

    container.innerHTML = filtered.map(a => `
        <div class="announcement-item">
            <div class="announcement-badge">${a.audience}</div>
            <div class="announcement-main">
                <h4>${a.title}</h4>
                <p>${a.content}</p>
                <div class="announcement-footer">
                    <span><i class="fas fa-user-edit"></i> ${a.posterName} (${a.posterRole})</span>
                    <span><i class="fas fa-calendar-alt"></i> ${a.date}</span>
                </div>
            </div>
            ${a.attachment ? `
                <div class="announcement-attachment">
                    <a href="#" onclick="alert('Downloading ${a.attachment}...')">
                        <i class="fas fa-paperclip"></i> Attachment
                    </a>
                </div>
            ` : ''}
        </div>
    `).join('');
}

function getPortalRole() {
    const path = window.location.pathname.toLowerCase();
    if (path.includes('/student/')) return 'Students';
    if (path.includes('/teacher/')) return 'Teacher';
    if (path.includes('/librarian/')) return 'Librarian';
    if (path.includes('/bursar/')) return 'Bursar';
    if (path.includes('/ancillary/')) return 'Ancillary Staff';
    if (path.includes('/secretary/')) return 'Secretary';
    if (path.includes('news.html')) return 'Parents';
    return 'All';
}

