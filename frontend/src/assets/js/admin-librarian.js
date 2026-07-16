// Admin Librarian Management Logic

// Mock Librarian Data
// Mock Librarian Data - Seeded if localStorage is empty
const SEED_LIBRARIANS = [
    {
        id: 'LIB-24000001',
        name: 'Patricia Moore',
        initials: 'PM',
        primaryRole: 'Librarian',
        secondaryRoles: [],
        email: 'patricia.moore@embakwe.edu',
        phone: '+263 771 234 567',
        status: 'Active'
    }
];

function getLibrarians() {
    let stored = getTenantData('school_librarians', 'null');
    if (!stored) {
        saveTenantData('school_librarians', SEED_LIBRARIANS);
        return SEED_LIBRARIANS;
    }
    let data = JSON.parse(stored);
    // Migration: Convert single secondaryRole to array
    return data.map(lib => {
        if (lib.secondaryRole !== undefined && !lib.secondaryRoles) {
            lib.secondaryRoles = lib.secondaryRole ? [lib.secondaryRole] : [];
            delete lib.secondaryRole;
        }
        if (!lib.secondaryRoles) lib.secondaryRoles = [];
        return lib;
    });
}

function saveLibrarians(data) {
    saveTenantData('school_librarians', data);
}

let librarians = getLibrarians();
let librarianToDeleteId = null;

// Pagination State
let currentPage = 1;
const itemsPerPage = 10;
let filteredLibrarians = [...librarians];

document.addEventListener('DOMContentLoaded', function () {
    const tableBody = document.getElementById('librariansTableBody');
    const searchInput = document.getElementById('librarianSearch');
    const roleFilter = document.getElementById('roleFilter');
    const statusFilter = document.getElementById('statusFilter');

    // Initial Render
    renderLibrarians(librarians);

    // Event Listeners
    if (searchInput) {
        searchInput.addEventListener('keyup', filterLibrarians);
    }
    if (roleFilter) {
        roleFilter.addEventListener('change', filterLibrarians);
    }
    if (statusFilter) {
        statusFilter.addEventListener('change', filterLibrarians);
    }

    // Render Function
    function renderLibrarians(data = filteredLibrarians) {
        if (!tableBody) return;

        tableBody.innerHTML = '';

        // Update filtered list for pagination
        filteredLibrarians = data;

        // Calculate slice
        const startIndex = (currentPage - 1) * itemsPerPage;
        const endIndex = startIndex + itemsPerPage;
        const paginatedData = filteredLibrarians.slice(startIndex, endIndex);

        if (paginatedData.length === 0) {
            tableBody.innerHTML = '<tr><td colspan="8" style="text-align:center; padding: 20px;">No librarians found</td></tr>';
            renderPagination(0);
            return;
        }

        paginatedData.forEach(librarian => {
            const statusClass = librarian.status === 'Active' ? 'status-active' : 'status-inactive';
            const initialsColor = '#6f42c1'; // Purple for librarian

            const secondaryRoles = librarian.secondaryRoles || [];
            const secondaryRoleHtml = secondaryRoles.length > 0
                ? secondaryRoles.map(role => `<span class="secondary-role-badge">${role}</span>`).join('')
                : '<span style="color: #999;">—</span>';

            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${librarian.id}</td>
                <td>
                    <div class="teacher-info">
                        <div class="teacher-avatar" style="background-color: ${initialsColor}">
                            ${librarian.photo || librarian.profilePic ? `<img src="${librarian.photo || librarian.profilePic}" onerror="this.style.display='none'; this.parentElement.innerText='${librarian.initials}'" style="width:100%;height:100%;border-radius:50%;object-fit:cover;">` : librarian.initials}
                        </div>
                        <span>${librarian.name}</span>
                    </div>
                </td>
                <td><span class="role-badge role-librarian">${librarian.primaryRole}</span></td>
                <td><div class="secondary-roles-container">${secondaryRoleHtml}</div></td>
                <td>${librarian.email}</td>
                <td>${librarian.phone}</td>
                <td><span class="status-badge ${statusClass}">${librarian.status}</span></td>
                <td>
                    <div class="action-buttons">
                        <button class="btn-icon btn-view" onclick="viewLibrarian('${librarian.id}')" title="View"><i class="fas fa-eye"></i></button>
                        <button class="btn-icon btn-edit" onclick="editLibrarian('${librarian.id}')" title="Edit"><i class="fas fa-edit"></i></button>
                        <button class="btn btn-icon btn-delete" onclick="prepareDeleteLibrarian('${librarian.id}')" title="Delete"><i class="fas fa-trash"></i></button>
                    </div>
                </td>
            `;
            tableBody.appendChild(row);
        });

        renderPagination(filteredLibrarians.length);
    }

    function renderPagination(totalItems) {
        const container = document.getElementById('librarianPagination');
        if (!container) return;

        const totalPages = Math.ceil(totalItems / itemsPerPage);
        container.innerHTML = '';

        if (totalPages <= 1) return;

        // Previous Button
        const prevBtn = document.createElement('button');
        prevBtn.innerHTML = '<i class="fas fa-chevron-left"></i>';
        prevBtn.disabled = currentPage === 1;
        prevBtn.onclick = () => {
            if (currentPage > 1) {
                currentPage--;
                renderLibrarians();
            }
        };
        container.appendChild(prevBtn);

        // Page Numbers
        for (let i = 1; i <= totalPages; i++) {
            const pageBtn = document.createElement('button');
            pageBtn.innerText = i;
            if (i === currentPage) pageBtn.className = 'active';
            pageBtn.onclick = () => {
                currentPage = i;
                renderLibrarians();
            };
            container.appendChild(pageBtn);
        }

        // Next Button
        const nextBtn = document.createElement('button');
        nextBtn.innerHTML = '<i class="fas fa-chevron-right"></i>';
        nextBtn.disabled = currentPage === totalPages;
        nextBtn.onclick = () => {
            if (currentPage < totalPages) {
                currentPage++;
                renderLibrarians();
            }
        };
        container.appendChild(nextBtn);
    }

    // Filter Function
    function filterLibrarians() {
        const searchTerm = searchInput ? searchInput.value.toLowerCase() : '';
        const roleValue = roleFilter ? roleFilter.value : 'All Roles';
        const statusValue = statusFilter ? statusFilter.value : 'All Status';

        const filtered = librarians.filter(librarian => {
            const matchesSearch = librarian.name.toLowerCase().includes(searchTerm) ||
                librarian.email.toLowerCase().includes(searchTerm) ||
                librarian.id.toLowerCase().includes(searchTerm);

            let matchesRole = roleValue === 'All Roles';
            if (roleValue === 'Primary Librarian') {
                matchesRole = librarian.primaryRole === 'Librarian';
            } else if (roleValue === 'Teacher-Librarian') {
                matchesRole = librarian.primaryRole === 'Teacher' && librarian.secondaryRole === 'Librarian';
            } else if (roleValue === 'Student-Librarian') {
                matchesRole = librarian.primaryRole === 'Student' && librarian.secondaryRole === 'Junior Librarian';
            }

            const matchesStatus = statusValue === 'All Status' || librarian.status === statusValue;

            return matchesSearch && matchesRole && matchesStatus;
        });

        currentPage = 1;
        renderLibrarians(filtered);
    }

    // View Action
    window.viewLibrarian = function (id) {
        const librarian = librarians.find(l => l.id === id);
        if (!librarian) return;

        const panel = document.getElementById('detailPanel');
        panel.classList.add('open');

        const dpAvatar = document.getElementById('dpAvatar');
        if (librarian.photo || librarian.profilePic) {
            dpAvatar.innerHTML = `<img src="${librarian.photo || librarian.profilePic}" onerror="this.style.display='none'; this.parentElement.innerText='${librarian.initials || 'LS'}'" style="width:100%;height:100%;border-radius:50%;object-fit:cover;">`;
        } else {
            dpAvatar.textContent = librarian.initials || 'LS';
        }
        document.getElementById('dpName').textContent = librarian.name;
        document.getElementById('dpRole').textContent = librarian.primaryRole || 'Librarian';

        const statusClass = librarian.status === 'Active' ? 'status-active' : 'status-inactive';

        document.getElementById('dpBody').innerHTML = `
            <div class="detail-section">
                <h4>Identity</h4>
                <div class="detail-row"><span class="detail-label">Librarian ID</span><span class="detail-value" style="font-family:monospace;">${librarian.id || '—'}</span></div>
                <div class="detail-row"><span class="detail-label">School Context</span><span class="detail-value">${AcadexCore.getActiveSchool() || 'N/A'}</span></div>
                <div class="detail-row"><span class="detail-label">Primary Role</span><span class="detail-value"><span class="badge badge-librarian">${librarian.primaryRole || '—'}</span></span></div>
                <div class="detail-row"><span class="detail-label">Secondary Roles</span><span class="detail-value">${(librarian.secondaryRoles || []).join(', ') || '—'}</span></div>
            </div>
            <div class="detail-section">
                <h4>Contact</h4>
                <div class="detail-row"><span class="detail-label">Email</span><span class="detail-value">${librarian.email || '—'}</span></div>
                <div class="detail-row"><span class="detail-label">Phone</span><span class="detail-value">${librarian.phone || '—'}</span></div>
                <div class="detail-row"><span class="detail-label">Address</span><span class="detail-value">${librarian.address || '—'}</span></div>
            </div>
            <div class="detail-section">
                <h4>Personal</h4>
                <div class="detail-row"><span class="detail-label">Date of Birth</span><span class="detail-value">${librarian.dob || '—'}</span></div>
                <div class="detail-row"><span class="detail-label">Gender</span><span class="detail-value">${librarian.gender || '—'}</span></div>
                <div class="detail-row"><span class="detail-label">Religion</span><span class="detail-value">${librarian.religion || '—'}</span></div>
                <div class="detail-row"><span class="detail-label">National ID</span><span class="detail-value">${librarian.nationalId || '—'}</span></div>
                <div class="detail-row"><span class="detail-label">Status</span><span class="detail-value"><span class="status-badge ${statusClass}">${librarian.status}</span></span></div>
            </div>
            <div class="detail-section">
                <h4>Spouse / Family</h4>
                <div class="detail-row"><span class="detail-label">Spouse Name</span><span class="detail-value">${librarian.spouseName || '—'}</span></div>
                <div class="detail-row"><span class="detail-label">Spouse Phone</span><span class="detail-value">${librarian.spousePhone || '—'}</span></div>
                <div class="detail-row"><span class="detail-label">Spouse Occupation</span><span class="detail-value">${librarian.spouseOccupation || '—'}</span></div>
                <div class="detail-row"><span class="detail-label">No. of Children</span><span class="detail-value">${librarian.numChildren !== undefined && librarian.numChildren !== '' ? librarian.numChildren : '—'}</span></div>
            </div>
            <div class="detail-section">
                <h4>Next of Kin</h4>
                <div class="detail-row"><span class="detail-label">Name</span><span class="detail-value">${librarian.nokName || '—'}</span></div>
                <div class="detail-row"><span class="detail-label">Relationship</span><span class="detail-value">${librarian.nokRelationship || '—'}</span></div>
                <div class="detail-row"><span class="detail-label">Phone</span><span class="detail-value">${librarian.nokPhone || '—'}</span></div>
                <div class="detail-row"><span class="detail-label">Email</span><span class="detail-value">${librarian.nokEmail || '—'}</span></div>
            </div>
            <div style="padding:10px 0; display: flex; flex-direction: column; gap: 10px;">
                <button class="btn btn-primary" style="width:100%;" onclick="editLibrarian('${librarian.id}');closeDetail();">
                    <i class="fas fa-edit"></i> Edit This Librarian
                </button>
                <button class="btn btn-primary" style="width:100%;background-color:#6c757d;border:none;" onclick="resetUserPassword('${librarian.id}', 'librarian')">
                    <i class="fas fa-key"></i> Reset Password
                </button>
            </div>
        `;
    };

    window.closeDetail = function () {
        document.getElementById('detailPanel').classList.remove('open');
    };

    // Edit Action populating modal
    window.editLibrarian = function (id) {
        const currentUser = JSON.parse(sessionStorage.getItem('adminUser') || '{}');
        const isSuper = currentUser.adminRole === 'Super Administrator';

        const librarian = librarians.find(l => l.id === id);
        if (librarian) {
            document.getElementById('editLibrarianId').value = librarian.id;
            document.getElementById('editLibrarianName').value = librarian.name;
            document.getElementById('editLibrarianRole').value = librarian.primaryRole;

            // Role Restriction Logic
            document.getElementById('editLibrarianRole').disabled = !isSuper;
            document.getElementById('editAddRoleBtn').disabled = !isSuper;
            if (!isSuper) document.getElementById('editAddRoleBtn').style.opacity = '0.5';
            else document.getElementById('editAddRoleBtn').style.opacity = '1';

            // Populate secondary roles
            const container = document.getElementById('editSecondaryRolesContainer');
            container.innerHTML = '';
            (librarian.secondaryRoles || []).forEach(role => addRoleRow('editSecondaryRolesContainer', role, !isSuper));

            document.getElementById('editLibrarianEmail').value = librarian.email;
            document.getElementById('editLibrarianPhone').value = librarian.phone;
            document.getElementById('editLibrarianStatus').value = librarian.status;

            // New fields
            document.getElementById('editLibrarianDob').value = librarian.dob || '';
            document.getElementById('editLibrarianGender').value = librarian.gender || '';
            document.getElementById('editLibrarianReligion').value = librarian.religion || '';
            document.getElementById('editLibrarianNationalId').value = librarian.nationalId || '';
            document.getElementById('editLibrarianAddress').value = librarian.address || '';
            document.getElementById('editLibrarianSpouseName').value = librarian.spouseName || '';
            document.getElementById('editLibrarianSpousePhone').value = librarian.spousePhone || '';
            document.getElementById('editLibrarianSpouseOccupation').value = librarian.spouseOccupation || '';
            document.getElementById('editLibrarianNumChildren').value = librarian.numChildren || '';
            document.getElementById('editLibrarianNokName').value = librarian.nokName || '';
            document.getElementById('editLibrarianNokRelationship').value = librarian.nokRelationship || '';
            document.getElementById('editLibrarianNokPhone').value = librarian.nokPhone || '';
            document.getElementById('editLibrarianNokEmail').value = librarian.nokEmail || '';

            if (typeof openModal === 'function') openModal('editLibrarianModal');
        }
    };

    // Add Action
    window.openAddLibrarianModal = function () {
        const nextId = AppUtils.generateNextId(AppUtils.ID_PREFIX.LIBRARIAN);
        document.getElementById('newLibrarianId').value = nextId;
        if (typeof openModal === 'function') openModal('addLibrarianModal');
    };

    // Delete Action
    window.prepareDeleteLibrarian = function (id) {
        librarianToDeleteId = id;
        if (typeof openModal === 'function') openModal('deleteLibrarianModal');
    };

    // Dynamic Role Rows
    window.addRoleRow = function (containerId, value = '', disabled = false) {
        const container = document.getElementById(containerId);
        if (!container) return;

        const row = document.createElement('div');
        row.className = 'role-row';
        row.style.cssText = 'display: flex; gap: 10px; align-items: center;';
        row.innerHTML = `
            <input type="text" class="form-control" placeholder="Enter role" value="${value}" ${disabled ? 'disabled' : ''} style="flex: 1; padding: 10px; border: 1px solid #ddd; border-radius: 5px;">
            <button type="button" class="btn-icon" ${disabled ? 'style="display:none;"' : 'style="color: #dc3545; background: none; border: none; cursor: pointer;"'} onclick="this.parentElement.remove()">
                <i class="fas fa-times"></i>
            </button>
        `;
        container.appendChild(row);
    };

    const addRoleBtn = document.getElementById('addRoleBtn');
    if (addRoleBtn) addRoleBtn.addEventListener('click', () => addRoleRow('secondaryRolesContainer'));

    const editAddRoleBtn = document.getElementById('editAddRoleBtn');
    if (editAddRoleBtn) editAddRoleBtn.addEventListener('click', () => addRoleRow('editSecondaryRolesContainer'));

    // Confirm Delete Handler
    const confirmDeleteBtn = document.getElementById('confirmDeleteBtn');
    if (confirmDeleteBtn) {
        confirmDeleteBtn.addEventListener('click', function () {
            if (librarianToDeleteId) {
                // Remove librarian from array
                librarians = librarians.filter(l => l.id !== librarianToDeleteId);
                saveLibrarians(librarians);

                // Re-render the table
                renderLibrarians(librarians);

                // Close modal
                if (typeof closeModal === 'function') closeModal('deleteLibrarianModal');

                // Reset the ID
                librarianToDeleteId = null;

                // Show success message
                if (typeof Toast !== 'undefined' && Toast.success) {
                    Toast.success('Librarian deleted successfully!');
                } else {
                    alert('Librarian deleted successfully!');
                }
            }
        });
    }

    // Make functions available globally
    window.filterLibrarians = filterLibrarians;
    window.renderLibrarians = renderLibrarians;

    // Add Librarian Form
    const addForm = document.getElementById('addLibrarianForm');
    if (addForm) {
        addForm.addEventListener('submit', function (e) {
            e.preventDefault();

            const roleInputs = document.querySelectorAll('#secondaryRolesContainer input');
            const secondaryRoles = Array.from(roleInputs)
                .map(input => input.value.trim())
                .filter(val => val !== '');

            const newLibrarian = {
                id: document.getElementById('newLibrarianId').value || AppUtils.generateNextId(AppUtils.ID_PREFIX.LIBRARIAN),
                name: document.getElementById('newLibrarianName').value,
                primaryRole: document.getElementById('newLibrarianRole').value,
                secondaryRoles: secondaryRoles,
                email: document.getElementById('newLibrarianEmail').value,
                phone: document.getElementById('newLibrarianPhone').value,
                status: document.getElementById('newLibrarianStatus').value,
                dob: document.getElementById('newLibrarianDob').value,
                gender: document.getElementById('newLibrarianGender').value,
                religion: document.getElementById('newLibrarianReligion').value,
                nationalId: document.getElementById('newLibrarianNationalId').value,
                address: document.getElementById('newLibrarianAddress').value,
                spouseName: document.getElementById('newLibrarianSpouseName').value,
                spousePhone: document.getElementById('newLibrarianSpousePhone').value,
                spouseOccupation: document.getElementById('newLibrarianSpouseOccupation').value,
                numChildren: document.getElementById('newLibrarianNumChildren').value,
                nokName: document.getElementById('newLibrarianNokName').value,
                nokRelationship: document.getElementById('newLibrarianNokRelationship').value,
                nokPhone: document.getElementById('newLibrarianNokPhone').value,
                nokEmail: document.getElementById('newLibrarianNokEmail').value,
                schoolCode: AcadexCore.getActiveSchool()
            };

            // Initials
            const names = newLibrarian.name.split(' ');
            if (names.length > 1) {
                newLibrarian.initials = names[0][0] + names[names.length - 1][0];
            } else {
                newLibrarian.initials = names[0].substring(0, 2);
            }
            newLibrarian.initials = newLibrarian.initials.toUpperCase();

            // Check duplicate
            if (librarians.some(l => l.id === newLibrarian.id)) {
                if (typeof Toast !== 'undefined' && Toast.error) {
                    Toast.error('Librarian ID already exists!');
                } else {
                    alert('Librarian ID already exists!');
                }
                return;
            }

            librarians.push(newLibrarian);
            saveLibrarians(librarians);
            renderLibrarians(librarians);

            if (typeof closeModal === 'function') closeModal('addLibrarianModal');
            addForm.reset();

            Toast.success('Librarian added successfully!');
        });
    }

    // Edit Librarian Form Submission
    const editForm = document.getElementById('editLibrarianForm');
    if (editForm) {
        editForm.addEventListener('submit', function (e) {
            e.preventDefault();
            const id = document.getElementById('editLibrarianId').value;
            const index = librarians.findIndex(l => l.id === id);

            if (index !== -1) {
                const roleInputs = document.querySelectorAll('#editSecondaryRolesContainer input');
                const secondaryRoles = Array.from(roleInputs)
                    .map(input => input.value.trim())
                    .filter(val => val !== '');

                librarians[index].name = document.getElementById('editLibrarianName').value;
                librarians[index].primaryRole = document.getElementById('editLibrarianRole').value;
                librarians[index].secondaryRoles = secondaryRoles;
                librarians[index].email = document.getElementById('editLibrarianEmail').value;
                librarians[index].phone = document.getElementById('editLibrarianPhone').value;
                librarians[index].status = document.getElementById('editLibrarianStatus').value;

                librarians[index].dob = document.getElementById('editLibrarianDob').value;
                librarians[index].gender = document.getElementById('editLibrarianGender').value;
                librarians[index].religion = document.getElementById('editLibrarianReligion').value;
                librarians[index].nationalId = document.getElementById('editLibrarianNationalId').value;
                librarians[index].address = document.getElementById('editLibrarianAddress').value;
                librarians[index].spouseName = document.getElementById('editLibrarianSpouseName').value;
                librarians[index].spousePhone = document.getElementById('editLibrarianSpousePhone').value;
                librarians[index].spouseOccupation = document.getElementById('editLibrarianSpouseOccupation').value;
                librarians[index].numChildren = document.getElementById('editLibrarianNumChildren').value;
                librarians[index].nokName = document.getElementById('editLibrarianNokName').value;
                librarians[index].nokRelationship = document.getElementById('editLibrarianNokRelationship').value;
                librarians[index].nokPhone = document.getElementById('editLibrarianNokPhone').value;
                librarians[index].nokEmail = document.getElementById('editLibrarianNokEmail').value;

                // Update initials
                const names = librarians[index].name.split(' ');
                if (names.length > 1) {
                    librarians[index].initials = names[0][0] + names[names.length - 1][0];
                } else {
                    librarians[index].initials = names[0].substring(0, 2);
                }
                librarians[index].initials = librarians[index].initials.toUpperCase();

                saveLibrarians(librarians);
                renderLibrarians(librarians);

                if (typeof closeModal === 'function') closeModal('editLibrarianModal');

                Toast.success('Librarian updated successfully!');
            }
        });
    }
});

