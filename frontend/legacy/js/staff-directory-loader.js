/**
 * Staff Directory Loader - Aggregates and renders all staff members using CommonStaff logic
 */

const StaffDirectoryLoader = {
    /**
     * Aggregates all staff from different localStorage keys via CommonStaff
     */
    getAllStaff: function () {
        if (typeof CommonStaff !== 'undefined') {
            return CommonStaff.getAllStaff();
        }
        console.error('CommonStaff utility not found. Please ensure common-staff.js is loaded.');
        return [];
    },

    /**
     * Renders the staff directory into the grid
     */
    render: function (filter = 'All Staff', query = '') {
        const grid = document.querySelector('.staff-grid') || document.getElementById('staffGrid');
        if (!grid) return;

        const allStaff = this.getAllStaff();
        
        // Update stats if elements exist (Bursar portal style)
        const totalEl = document.getElementById('totalStaff');
        const teacherEl = document.getElementById('teacherCount');
        const ancillaryEl = document.getElementById('ancillaryCount');
        const adminEl = document.getElementById('adminCount');

        if (totalEl) totalEl.textContent = allStaff.length;
        if (teacherEl) teacherEl.textContent = allStaff.filter(s => s.category === 'Teaching Staff').length;
        if (ancillaryEl) ancillaryEl.textContent = allStaff.filter(s => s.category === 'Support Staff').length;
        if (adminEl) adminEl.textContent = allStaff.filter(s => s.category === 'Administration').length;

        grid.innerHTML = '';

        const normalizedQuery = query.toLowerCase();
        const normalizedFilter = filter.trim();

        const filteredStaff = allStaff.filter(staff => {
            const matchesSearch = staff.name.toLowerCase().includes(normalizedQuery) ||
                staff.role.toLowerCase().includes(normalizedQuery) ||
                staff.dept.toLowerCase().includes(normalizedQuery);

            const matchesFilter = normalizedFilter === 'All Staff' ||
                staff.category === normalizedFilter;

            return matchesSearch && matchesFilter;
        });

        if (filteredStaff.length === 0) {
            grid.innerHTML = '<div style="grid-column: 1/-1; text-align: center; padding: 50px; color: #64748b;">No staff members found matching your criteria.</div>';
            return;
        }

        filteredStaff.forEach(staff => {
            const card = document.createElement('div');
            card.className = 'staff-card';
            card.setAttribute('data-category', staff.category);

            card.innerHTML = `
                <div class="staff-img" style="background: #eef2ff; color: #0056b3; display: flex; align-items: center; justify-content: center; font-weight: 600;">
                    ${staff.initials}
                </div>
                <span class="staff-name">${staff.name}</span>
                <span class="staff-role">${staff.role}</span>
                <div class="staff-contact">
                    <div><i class="fas fa-envelope"></i> ${staff.email}</div>
                    <div><i class="fas fa-phone-alt"></i> ${staff.phone}</div>
                </div>
            `;
            grid.appendChild(card);
        });
    },

    /**
     * Initialize listeners for search and filter
     */
    init: function () {
        const searchInput = document.querySelector('.search-container input') || document.getElementById('staffSearchInput');
        const filterTabs = document.querySelectorAll('.filter-tab');

        if (searchInput) {
            searchInput.addEventListener('input', () => {
                const activeTabEl = document.querySelector('.filter-tab.active');
                const activeTab = activeTabEl ? activeTabEl.textContent : 'All Staff';
                this.render(activeTab, searchInput.value);
            });
        }

        filterTabs.forEach(tab => {
            tab.addEventListener('click', () => {
                filterTabs.forEach(t => t.classList.remove('active'));
                tab.classList.add('active');
                this.render(tab.textContent, searchInput ? searchInput.value : '');
            });
        });

        // Initial render
        this.render();
    }
};

document.addEventListener('DOMContentLoaded', () => {
    StaffDirectoryLoader.init();
});

