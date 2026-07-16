// Comprehensive User Data Aggregation Logic

document.addEventListener('DOMContentLoaded', function () {
    const tableBody = document.getElementById('usersTableBody');
    const searchInput = document.getElementById('userSearch');
    const roleFilter = document.getElementById('roleFilter');

    function getAllUsers() {
        const students = getTenantData('school_students', '[]').map(u => ({
            ...u,
            id: u.id || u.studentId || '—',
            name: u.name || (u.firstName && u.lastName ? `${u.firstName} ${u.lastName}` : (u.fullName || '—')),
            photo: u.photo || u.profilePic || null,
            role: 'student',
            secondaryRoles: u.secondaryRoles || [],
            joined: u.createdAt ? new Date(u.createdAt).toLocaleDateString() : (u.enrollmentDate ? new Date(u.enrollmentDate).toLocaleDateString() : '—')
        }));
        const teachers = getTenantData('school_teachers', '[]').map(u => ({
            ...u,
            name: u.name || ((u.firstName || '') + ' ' + (u.lastName || '')).trim() || u.username || 'Teacher',
            photo: u.photo || u.profilePic || null,
            role: 'teacher',
            secondaryRoles: u.secondaryRoles || [],
            joined: u.createdAt ? new Date(u.createdAt).toLocaleDateString() : '—'
        }));
        const librarians = getTenantData('school_librarians', '[]').map(u => ({
            ...u,
            name: u.name || ((u.firstName || '') + ' ' + (u.lastName || '')).trim() || u.username || 'Librarian',
            photo: u.photo || u.profilePic || null,
            role: 'librarian',
            secondaryRoles: u.secondaryRole ? [u.secondaryRole] : [],
            joined: u.createdAt ? new Date(u.createdAt).toLocaleDateString() : '—'
        }));
        const bursars = getTenantData('school_bursars', '[]').map(u => ({
            ...u,
            name: u.name || ((u.firstName || '') + ' ' + (u.lastName || '')).trim() || u.username || 'Bursar',
            photo: u.photo || u.profilePic || null,
            role: 'bursar',
            secondaryRoles: u.secondaryRole ? [u.secondaryRole] : [],
            joined: u.createdAt ? new Date(u.createdAt).toLocaleDateString() : '—'
        }));
        const ancillary = getTenantData('ancillaryStaff', '[]').map(u => ({
            ...u,
            name: u.name || ((u.firstName || '') + ' ' + (u.lastName || '')).trim() || u.username || 'Staff',
            photo: u.photo || u.profilePic || null,
            role: 'ancillary',
            secondaryRoles: u.secondaryRoles || [],
            joined: u.createdAt ? new Date(u.createdAt).toLocaleDateString() : (u.joined || '—')
        }));
        const alumni = getTenantData('school_alumni', '[]').map(u => ({
            ...u,
            name: u.name || ((u.firstName || '') + ' ' + (u.lastName || '')).trim() || u.username || 'Alumni',
            photo: u.photo || u.profilePic || null,
            role: 'alumni',
            secondaryRoles: [],
            joined: u.createdAt ? new Date(u.createdAt).toLocaleDateString() : '—'
        }));
        // Admin users: primary role = "Admin", secondary = their specific adminRole
        const admins = getTenantData('adminUsers', '[]').map(u => ({
            ...u,
            name: u.name || ((u.firstName || '') + ' ' + (u.lastName || '')).trim() || u.username || 'Admin',
            photo: u.photo || u.profilePic || null,
            role: 'admin',
            primaryRole: 'Admin',
            secondaryRoles: u.adminRole ? [u.adminRole] : [],
            email: u.email || '—',
            phone: u.phone || '—',
            joined: u.createdAt ? new Date(u.createdAt).toLocaleDateString() : '—'
        }));

        return [...students, ...teachers, ...librarians, ...bursars, ...ancillary, ...alumni, ...admins];
    }

    let allUsers = getAllUsers();
    let currentPage = 1;
    const itemsPerPage = 15;
    let filteredUsers = [...allUsers];

    function updateStats() {
        const users = getAllUsers();
        const set = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
        set('totalUsers', users.length);
        set('totalStudents', users.filter(u => u.role === 'student').length);
        set('totalTeachers', users.filter(u => u.role === 'teacher').length);
        set('totalLibrarian', users.filter(u => u.role === 'librarian').length);
        set('totalBursar', users.filter(u => u.role === 'bursar').length);
        set('totalAncillary', users.filter(u => u.role === 'ancillary').length);
        set('totalAlumni', users.filter(u => u.role === 'alumni').length);
        set('totalAdmins', users.filter(u => u.role === 'admin').length);
    }

    function renderUsers(users = filteredUsers) {
        if (!tableBody) return;
        tableBody.innerHTML = '';
        filteredUsers = users;

        const start = (currentPage - 1) * itemsPerPage;
        const paged = filteredUsers.slice(start, start + itemsPerPage);

        if (paged.length === 0) {
            tableBody.innerHTML = '<tr><td colspan="7" style="text-align:center;color:#666;padding:20px;">No users found.</td></tr>';
            renderPagination(0);
            return;
        }

        paged.forEach(user => {
            const tr = document.createElement('tr');
            const isAdmin = user.role === 'admin';
            const roleKey = user.role.toLowerCase().replace(' ', '_');
            const avatarClass = isAdmin ? 'avatar-admin' : `avatar-${roleKey}`;
            const badgeClass = isAdmin ? 'role-admin' : `role-${roleKey}`;
            const primaryLabel = isAdmin ? 'Admin' : (user.role.charAt(0).toUpperCase() + user.role.slice(1));

            if (!user.initials && user.name) {
                const names = user.name.trim().split(' ');
                user.initials = (names.length > 1 ? names[0][0] + names[names.length - 1][0] : names[0].substring(0, 2)).toUpperCase();
            }
            const avatarContent = user.photo
                ? `<img src="${user.photo}" onerror="this.style.display='none'; this.parentElement.innerText='${user.initials || '??'}'" style="width:100%;height:100%;border-radius:50%;object-fit:cover;" alt="">`
                : (user.initials || '??');

            const secondaryHtml = (user.secondaryRoles && user.secondaryRoles.length > 0)
                ? user.secondaryRoles.map(r => `<span class="secondary-role-badge">${r}</span>`).join('')
                : '<span style="color:#999;">—</span>';

            const userId = user.id || user.studentId || user.staffId || user.username || '—';
            tr.innerHTML = `
                <td>${userId}</td>
                <td>
                    <div class="user-info">
                        <div class="user-avatar ${avatarClass}">${avatarContent}</div>
                        <span>${user.name || '—'}</span>
                    </div>
                </td>
                <td><span class="role-badge ${badgeClass}">${primaryLabel}</span></td>
                <td><div class="secondary-roles-container">${secondaryHtml}</div></td>
                <td>${user.email || '—'}</td>
                <td>${user.phone || '—'}</td>
                <td>${user.joined || '—'}</td>
                <td>
                    <div class="actions-cell">
                        <button class="btn-eye" onclick="viewUser('${user.id === '—' ? userId : (user.id || userId)}', '${user.role}')" title="View Profile">
                            <i class="fas fa-eye"></i>
                        </button>
                        <button class="btn-lock ${user.status === 'locked' ? 'locked' : ''}" onclick="toggleLockUser('${user.id === '—' ? userId : (user.id || userId)}', '${user.role}')" title="${user.status === 'locked' ? 'Unlock' : 'Lock'} User">
                            <i class="fas fa-${user.status === 'locked' ? 'lock-open' : 'lock'}"></i>
                        </button>
                        <button class="btn-reset" onclick="resetUserPassword('${user.id === '—' ? userId : (user.id || userId)}', '${user.role}')" title="Reset Password">
                            <i class="fas fa-key"></i>
                        </button>
                    </div>
                </td>`;
            tableBody.appendChild(tr);
        });
        renderPagination(filteredUsers.length);
    }

    function renderPagination(total) {
        const container = document.getElementById('usersPagination');
        if (!container) return;
        const totalPages = Math.ceil(total / itemsPerPage);
        container.innerHTML = '';
        if (totalPages <= 1) return;

        const btn = (label, disabled, onClick) => {
            const b = document.createElement('button');
            b.innerHTML = label; b.disabled = disabled; b.onclick = onClick;
            container.appendChild(b);
        };
        btn('<i class="fas fa-chevron-left"></i>', currentPage === 1, () => { currentPage--; renderUsers(); });
        for (let i = 1; i <= totalPages; i++) {
            const pb = document.createElement('button');
            pb.innerText = i;
            if (i === currentPage) pb.className = 'active';
            pb.onclick = () => { currentPage = i; renderUsers(); };
            container.appendChild(pb);
        }
        btn('<i class="fas fa-chevron-right"></i>', currentPage === totalPages, () => { currentPage++; renderUsers(); });
    }

    function filterUsers() {
        allUsers = getAllUsers();
        const q = searchInput ? searchInput.value.toLowerCase() : '';
        const role = roleFilter ? roleFilter.value.toLowerCase() : 'all';
        const filtered = allUsers.filter(u => {
            const matchQ = !q ||
                (u.name && u.name.toLowerCase().includes(q)) ||
                (u.email && u.email.toLowerCase().includes(q)) ||
                (u.id && String(u.id).toLowerCase().includes(q)) ||
                (u.username && u.username.toLowerCase().includes(q)) ||
                (u.secondaryRoles && u.secondaryRoles.some(r => r.toLowerCase().includes(q)));
            const matchRole = role === 'all' || u.role === role;
            return matchQ && matchRole;
        });
        currentPage = 1;
        renderUsers(filtered);
    }

    if (searchInput) searchInput.addEventListener('input', filterUsers);
    if (roleFilter) roleFilter.addEventListener('change', filterUsers);

    // View User Logic
    window.viewUser = function(id, role) {
        const panel = document.getElementById('detailPanel');
        const content = document.getElementById('detailContent');
        if (!panel || !content) return;

        // Fetch full data from storage
        const storageKey = getStorageKey(role);
        if (!storageKey) return;

        const items = getTenantData(storageKey, '[]');
        const user = items.find(u => (u.id || u.username || u.studentId || u.staffId) == id);
        
        if (!user) {
            Toast.error('User details not found.');
            return;
        }

        const name = user.name || (user.firstName && user.lastName ? `${user.firstName} ${user.lastName}` : (user.username || 'User'));
        const ini = (name.split(' ').map(n => n[0]).join('')).substring(0, 2).toUpperCase();
        const activeSchool = window.AcadexCore ? AcadexCore.getActiveSchool() : null;
        const schoolContextHtml = activeSchool 
            ? `<p class="detail-sub" style="opacity: 0.9; font-weight: 500;"><i class="fas fa-school"></i> ${activeSchool.name} (${activeSchool.code})</p>`
            : '';
        const roleLabel = role.charAt(0).toUpperCase() + role.slice(1);

        panel.classList.add('open');
        
        // Build Profile Detail HTML
        let detailHtml = `
            <div class="detail-header">
                <div class="detail-avatar-large" style="background: ${getRoleColor(role)}">
                    ${user.photo || user.profilePic ? `<img src="${user.photo || user.profilePic}" onerror="this.style.display='none'; this.parentElement.innerText='${ini}'" style="width:100%;height:100%;border-radius:50%;object-fit:cover;">` : ini}
                </div>
                <div>
                    <h3 class="detail-title">${name}</h3>
                    <p class="detail-sub">${roleLabel} • ${user.id || user.username || user.studentId || user.staffId || 'N/A'}</p>
                    ${schoolContextHtml}
                </div>
            </div>
            
            <div class="detail-section">
                <h4>Comprehensive Profile Data</h4>
                <div class="detail-grid">
                    ${Object.entries(user)
                        .filter(([key]) => !['password', 'photo', 'profilePic', 'mustChangePassword', 'id', 'studentId', 'staffId', 'name', 'firstName', 'lastName', 'username', 'initials'].includes(key))
                        .map(([key, value]) => {
                            // Format key: camelCase to Title Case with spaces
                            const label = key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
                            let displayValue = '—';
                            
                            if (value !== null && value !== undefined && value !== '') {
                                if (Array.isArray(value)) {
                                    displayValue = value.length > 0 ? value.join(', ') : '—';
                                } else if (typeof value === 'object') {
                                    displayValue = JSON.stringify(value);
                                } else {
                                    displayValue = value;
                                }
                            }
                            
                            return `
                                <div class="detail-row">
                                    <span class="detail-label">${label}</span>
                                    <span class="detail-value">${displayValue}</span>
                                </div>
                            `;
                        }).join('')}
                </div>
            </div>
        `;

        content.innerHTML = detailHtml;
    };

    function getRoleColor(role) {
        const colors = {
            student: '#0056b3',
            teacher: '#28a745',
            librarian: '#6f42c1',
            bursar: '#20c997',
            ancillary: '#fd7e14',
            admin: '#dc3545',
            alumni: '#ffc107'
        };
        return colors[role] || '#6c757d';
    }

    window.toggleLockUser = function(id, role) {
        const key = getStorageKey(role);
        if (!key) return;
        
        let items = getTenantData(key, '[]');
        const idx = items.findIndex(u => (u.id || u.username || u.studentId || u.staffId) == id);
        
        if (idx === -1) {
            Toast.error('User not found.');
            return;
        }
        
        const newStatus = items[idx].status === 'locked' ? 'active' : 'locked';
        items[idx].status = newStatus;
        saveTenantData(key, items);
        
        if (window.AuditLogger) {
            AuditLogger.logSecurity('Account Security', `${newStatus === 'locked' ? 'Locked' : 'Unlocked'} user ${id} (${role})`);
        }
        
        // Refresh local data and view
        allUsers = getAllUsers();
        filterUsers();
        Toast.success(`User ${newStatus === 'locked' ? 'locked' : 'unlocked'} successfully.`);
    };

    updateStats();
    renderUsers(allUsers);
});

