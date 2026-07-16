// Admin Dashboard Logic

document.addEventListener('DOMContentLoaded', function () {
    // Search Functionality for Recent Activity
    const searchInput = document.getElementById('activitySearch');
    const activityList = document.querySelector('.activity-list');
    const activityItems = document.querySelectorAll('.activity-item');

    if (searchInput && activityList) {
        searchInput.addEventListener('keyup', function () {
            const searchTerm = this.value.toLowerCase();
            let hasResults = false;

            activityItems.forEach(item => {
                const text = item.innerText.toLowerCase();
                if (text.includes(searchTerm)) {
                    item.style.display = 'flex';
                    hasResults = true;
                } else {
                    item.style.display = 'none';
                }
            });

            // Handle no results
            let noResultsMsg = document.getElementById('noResultsMsg');
            if (!hasResults) {
                if (!noResultsMsg) {
                    noResultsMsg = document.createElement('li');
                    noResultsMsg.id = 'noResultsMsg';
                    noResultsMsg.style.padding = '15px';
                    noResultsMsg.style.textAlign = 'center';
                    noResultsMsg.style.color = '#666';
                    noResultsMsg.innerText = 'No activity found matching your search.';
                    activityList.appendChild(noResultsMsg);
                }
            } else if (noResultsMsg) {
                noResultsMsg.remove();
            }
        });
    }

    // Mobile menu toggle (migrated from inline if needed, but keeping inline for now or moving here)
    // The inline script in dashboard.html already handles this, but it's good practice to centralize.
    // I will leave the inline script for now to minimize disruption, or better:
    // refactor the inline script into this file.

    const menuToggle = document.getElementById('menuToggle');
    const sidebar = document.getElementById('sidebar');

    if (menuToggle && sidebar) {
        menuToggle.addEventListener('click', function () {
            sidebar.classList.toggle('active');
        });
    }

    // Dashboard Metrics Initialization
    updateDashboardMetrics();
    
    // IT Support Widget Initialization
    loadITSupportWidget();
    loadDashboardActivity();
});

function updateDashboardMetrics() {
    // 1. Students
    const students = typeof getTenantData === 'function' ? getTenantData('school_students') : getTenantData('school_students', '[]');
    const studentCountEl = document.querySelector('.stat-icon.students').previousElementSibling.querySelector('h3');
    if (studentCountEl) studentCountEl.innerText = students.length.toLocaleString();

    // 2. Teachers
    const teachers = typeof getTenantData === 'function' ? getTenantData('school_teachers') : getTenantData('school_teachers', '[]');
    const teacherCountEl = document.querySelector('.stat-icon.teachers').previousElementSibling.querySelector('h3');
    if (teacherCountEl) teacherCountEl.innerText = teachers.length.toLocaleString();

    // 3. Classes
    const classes = typeof getTenantData === 'function' ? getTenantData('school_classes') : getTenantData('school_classes', '[]');
    const classCountEl = document.querySelector('.stat-icon.classes').previousElementSibling.querySelector('h3');
    if (classCountEl) classCountEl.innerText = classes.length.toLocaleString();

    // 4. Revenue (Mock for now, or sum from payments if available)
    const payments = typeof getTenantData === 'function' ? getTenantData('school_payments') : [];
    const totalRevenue = payments.reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0);
    const revenueEl = document.querySelector('.stat-icon.revenue').previousElementSibling.querySelector('h3');
    if (revenueEl) revenueEl.innerText = totalRevenue > 0 ? `$${(totalRevenue/1000).toFixed(1)}K` : '$0';
}

function loadITSupportWidget() {
    const container = document.getElementById('itSupportWidget');
    if (!container) return;

    const tickets = typeof getTenantData === 'function' ? getTenantData('itTickets') : getTenantData('itTickets', '[]');
    const activeTickets = tickets.filter(t => t.status === 'Pending' || t.status === 'In Review').slice(0, 3);

    if (activeTickets.length === 0) {
        container.innerHTML = '<div style="text-align:center; padding:20px; color:#64748b;">No active IT issues.</div>';
        return;
    }

    container.innerHTML = activeTickets.map(t => `
        <div class="activity-item" style="cursor: pointer; display: flex; align-items: center; border-bottom: 1px solid #eee; padding: 10px 0;" onclick="window.location.href='it-support.html'">
            <div class="activity-icon ${t.urgency === 'High' ? 'warning' : 'info'}" style="width: 35px; height: 35px; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin-right: 12px;">
                <i class="fas fa-headset"></i>
            </div>
            <div class="activity-content" style="flex: 1;">
                <div class="activity-title" style="font-size: 0.9rem; font-weight: 500;">
                    ${t.subject}
                    <span class="badge-portal portal-${t.portal.toLowerCase()}" style="font-size: 0.7rem; padding: 2px 8px; border-radius: 10px; margin-left: 5px;">${t.portal}</span>
                </div>
                <div class="activity-time" style="font-size: 0.8rem; color: #888;">${t.userName} • ${t.status}</div>
            </div>
        </div>
    `).join('');
}

function loadDashboardActivity() {
    const activityList = document.getElementById('dashboardActivity');
    if (!activityList) return;

    // Sample data if empty
    const activities = [
        { icon: 'user-plus', color: 'success', title: 'New student registered: John Doe', time: '2 hours ago' },
        { icon: 'file-alt', color: 'info', title: 'Grade report generated for Form 4A', time: '5 hours ago' },
        { icon: 'exclamation-triangle', color: 'warning', title: 'Payment overdue: 15 students', time: '1 day ago' }
    ];

    activityList.innerHTML = activities.map(a => `
        <li class="activity-item">
            <div class="activity-icon ${a.color}">
                <i class="fas fa-${a.icon}"></i>
            </div>
            <div class="activity-content">
                <div class="activity-title">${a.title}</div>
                <div class="activity-time">${a.time}</div>
            </div>
        </li>
    `).join('');
}

