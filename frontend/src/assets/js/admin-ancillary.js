// Admin Ancillary Staff Management Logic

// Mock Ancillary Staff Data - Seeded if localStorage is empty
const SEED_ANCILLARY = [
    {
        id: 'ANC-001',
        name: 'Mary Johnson',
        initials: 'MJ',
        primaryRole: 'Tuckshop Manager',
        secondaryRoles: [],
        email: 'mary.johnson@embakwe.edu',
        phone: '+263 773 456 789',
        status: 'Active',
        joined: 'Apr 2019'
    },
    {
        id: 'ANC-002',
        name: 'Thomas White',
        initials: 'TW',
        primaryRole: 'Farm Manager',
        secondaryRoles: [],
        email: 'thomas.white@embakwe.edu',
        phone: '+263 774 567 890',
        status: 'Active',
        joined: 'Jan 2021'
    },
    {
        id: 'ANC-003',
        name: 'Linda Green',
        initials: 'LG',
        primaryRole: 'Farm Manager Assistant',
        secondaryRoles: [],
        email: 'linda.green@embakwe.edu',
        phone: '+263 775 678 901',
        status: 'Active',
        joined: 'May 2022'
    }
];

function getAncillaryStaff() {
    let staff = getTenantData('ancillaryStaff', 'null');
    if (!staff) {
        saveTenantData('ancillaryStaff', SEED_ANCILLARY);
        return SEED_ANCILLARY;
    }
    try {
        let parsed = JSON.parse(staff);
        // Migration and Cleanup
        return parsed.map(u => {
            // Fix old secondaryRole string
            if (u.secondaryRole && !u.secondaryRoles) {
                u.secondaryRoles = [u.secondaryRole];
                delete u.secondaryRole;
            }
            if (!u.secondaryRoles) u.secondaryRoles = [];

            // Detect and fix concatenated strings in roles (e.g. "Tuckshop ManagerFarm Manager")
            const splitConcatenated = (str) => {
                if (typeof str !== 'string') return [str];
                // Regex to find Uppercase preceded by lowercase
                return str.split(/(?<=[a-z])(?=[A-Z])/);
            };

            // Fix Primary Role if it contains multiple roles
            const primaryRoles = splitConcatenated(u.primaryRole);
            if (primaryRoles.length > 1) {
                u.primaryRole = primaryRoles[0];
                u.secondaryRoles = [...new Set([...u.secondaryRoles, ...primaryRoles.slice(1)])];
            }

            // Fix Secondary Roles if they are concatenated
            let fixedSecondary = [];
            u.secondaryRoles.forEach(r => {
                fixedSecondary = [...fixedSecondary, ...splitConcatenated(r)];
            });
            u.secondaryRoles = [...new Set(fixedSecondary)];

            return u;
        });
    } catch (e) {
        return SEED_ANCILLARY;
    }
}

function saveAncillaryStaff(staff) {
    saveTenantData('ancillaryStaff', staff);
}

let ancillaryStaff = getAncillaryStaff();
let ancillaryToDeleteId = null;

// Pagination State
let currentPage = 1;
const itemsPerPage = 10;
let filteredAncillaryStaff = [...ancillaryStaff];

document.addEventListener('DOMContentLoaded', function () {
    const tableBody = document.getElementById('ancillaryTableBody');
    const searchInput = document.getElementById('ancillarySearch');
    const roleFilter = document.getElementById('roleFilter');
    const statusFilter = document.getElementById('statusFilter');

    // Initial Render
    renderAncillaryStaff(ancillaryStaff);

    // Event Listeners
    if (searchInput) {
        searchInput.addEventListener('keyup', filterAncillaryStaff);
    }
    if (roleFilter) {
        roleFilter.addEventListener('change', filterAncillaryStaff);
    }
    if (statusFilter) {
        statusFilter.addEventListener('change', filterAncillaryStaff);
    }

    // Render Function
    function renderAncillaryStaff(data = filteredAncillaryStaff) {
        if (!tableBody) return;

        tableBody.innerHTML = '';

        // Update filtered list for pagination
        filteredAncillaryStaff = data;

        // Calculate slice
        const startIndex = (currentPage - 1) * itemsPerPage;
        const endIndex = startIndex + itemsPerPage;
        const paginatedData = filteredAncillaryStaff.slice(startIndex, endIndex);

        if (paginatedData.length === 0) {
            tableBody.innerHTML = '<tr><td colspan="8" style="text-align:center; padding: 20px;">No ancillary staff found</td></tr>';
            renderPagination(0);
            return;
        }

        paginatedData.forEach(staff => {
            const statusClass = staff.status === 'Active' ? 'status-active' : 'status-inactive';
            const initialsColor = '#fd7e14'; // Orange for ancillary

            const secondaryRoleHtml = staff.secondaryRoles && staff.secondaryRoles.length > 0
                ? staff.secondaryRoles.map(role => `<span class="secondary-role-badge">${role}</span>`).join('')
                : '<span style="color: #999;">—</span>';

            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${staff.id}</td>
                <td>
                    <div class="teacher-info">
                        <div class="teacher-avatar" style="background-color: ${initialsColor}">
                            ${staff.photo || staff.profilePic ? `<img src="${staff.photo || staff.profilePic}" onerror="this.style.display='none'; this.parentElement.innerText='${staff.initials}'" style="width:100%;height:100%;border-radius:50%;object-fit:cover;">` : staff.initials}
                        </div>
                        <span>${staff.name}</span>
                    </div>
                </td>
                <td>${staff.primaryRole}</td>
                <td>${secondaryRoleHtml}</td>
                <td>${staff.email}</td>
                <td>${staff.phone}</td>
                <td><span class="status-badge ${statusClass}">${staff.status}</span></td>
                <td>
                    <div class="action-buttons">
                        <button class="btn-icon btn-view" onclick="viewAncillaryStaff('${staff.id}')" title="View"><i class="fas fa-eye"></i></button>
                        <button class="btn-icon btn-edit" onclick="editAncillaryStaff('${staff.id}')" title="Edit"><i class="fas fa-edit"></i></button>
                        <button class="btn btn-icon btn-delete" onclick="prepareDeleteAncillaryStaff('${staff.id}')" title="Delete"><i class="fas fa-trash"></i></button>
                    </div>
                </td>
            `;
            tableBody.appendChild(row);
        });

        renderPagination(filteredAncillaryStaff.length);
    }

    function renderPagination(totalItems) {
        const container = document.getElementById('ancillaryPagination');
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
                renderAncillaryStaff();
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
                renderAncillaryStaff();
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
                renderAncillaryStaff();
            }
        };
        container.appendChild(nextBtn);
    }

    // Filter Function
    function filterAncillaryStaff() {
        const searchTerm = searchInput ? searchInput.value.toLowerCase() : '';
        const roleValue = roleFilter ? roleFilter.value : 'All Roles';
        const statusValue = statusFilter ? statusFilter.value : 'All Status';

        const filtered = ancillaryStaff.filter(staff => {
            const matchesSearch = staff.name.toLowerCase().includes(searchTerm) ||
                staff.email.toLowerCase().includes(searchTerm) ||
                staff.id.toLowerCase().includes(searchTerm) ||
                (staff.secondaryRoles && staff.secondaryRoles.some(r => r.toLowerCase().includes(searchTerm)));

            const matchesRole = roleValue === 'All Roles' ||
                (staff.secondaryRoles && staff.secondaryRoles.includes(roleValue)) ||
                (roleValue === 'Other' && (!staff.secondaryRoles || staff.secondaryRoles.length === 0));

            const matchesStatus = statusValue === 'All Status' || staff.status === statusValue;

            return matchesSearch && matchesRole && matchesStatus;
        });

        currentPage = 1;
        renderAncillaryStaff(filtered);
    }

    // View Action
    window.viewAncillaryStaff = function (id) {
        const staff = ancillaryStaff.find(s => s.id === id);
        if (!staff) return;

        const panel = document.getElementById('detailPanel');
        panel.classList.add('open');

        const dpAvatar = document.getElementById('dpAvatar');
        if (staff.photo || staff.profilePic) {
            dpAvatar.innerHTML = `<img src="${staff.photo || staff.profilePic}" onerror="this.style.display='none'; this.parentElement.innerText='${staff.initials || 'AS'}'" style="width:100%;height:100%;border-radius:50%;object-fit:cover;">`;
        } else {
            dpAvatar.textContent = staff.initials || 'AS';
        }
        document.getElementById('dpName').textContent = staff.name;
        document.getElementById('dpRole').textContent = staff.primaryRole || 'Ancillary Staff';

        const statusClass = staff.status === 'Active' ? 'status-active' : 'status-inactive';
        const secondaryRoleDisplay = staff.secondaryRoles && staff.secondaryRoles.length > 0
            ? staff.secondaryRoles.join(', ')
            : 'None';

        document.getElementById('dpBody').innerHTML = `
            <div class="detail-section">
                <h4>Identity</h4>
                <div class="detail-row"><span class="detail-label">Staff ID</span><span class="detail-value" style="font-family:monospace;">${staff.id || '—'}</span></div>
                <div class="detail-row"><span class="detail-label">School Context</span><span class="detail-value">${AcadexCore.getActiveSchool() || 'N/A'}</span></div>
                <div class="detail-row"><span class="detail-label">Primary Role</span><span class="detail-value">${staff.primaryRole || '—'}</span></div>
                <div class="detail-row"><span class="detail-label">Secondary Roles</span><span class="detail-value"><span class="badge badge-ancillary">${secondaryRoleDisplay}</span></span></div>
                <div class="detail-row"><span class="detail-label">Employer</span><span class="detail-value">${staff.employer || '—'}</span></div>
            </div>
            <div class="detail-section">
                <h4>Contact</h4>
                <div class="detail-row"><span class="detail-label">Email</span><span class="detail-value">${staff.email || '—'}</span></div>
                <div class="detail-row"><span class="detail-label">Phone</span><span class="detail-value">${staff.phone || '—'}</span></div>
                <div class="detail-row"><span class="detail-label">Address</span><span class="detail-value">${staff.address || '—'}</span></div>
            </div>
            <div class="detail-section">
                <h4>Payroll</h4>
                <div class="detail-row"><span class="detail-label">Base Salary</span><span class="detail-value">$${staff.baseSalary || 0}</span></div>
                <div class="detail-row"><span class="detail-label">Allowances</span><span class="detail-value">$${staff.allowances || 0}</span></div>
                <div class="detail-row"><span class="detail-label">Deductions</span><span class="detail-value">$${staff.deductions || 0}</span></div>
            </div>
            <div class="detail-section">
                <h4>Status</h4>
                <div class="detail-row"><span class="detail-label">Current Status</span><span class="detail-value"><span class="status-badge ${statusClass}">${staff.status}</span></span></div>
            </div>
            <div class="detail-section">
                <h4>Personal</h4>
                <div class="detail-row"><span class="detail-label">Date of Birth</span><span class="detail-value">${staff.dob || '—'}</span></div>
                <div class="detail-row"><span class="detail-label">Gender</span><span class="detail-value">${staff.gender || '—'}</span></div>
                <div class="detail-row"><span class="detail-label">Religion</span><span class="detail-value">${staff.religion || '—'}</span></div>
                <div class="detail-row"><span class="detail-label">National ID</span><span class="detail-value">${staff.nationalId || '—'}</span></div>
            </div>
            <div class="detail-section">
                <h4>Spouse / Family</h4>
                <div class="detail-row"><span class="detail-label">Spouse Name</span><span class="detail-value">${staff.spouseName || '—'}</span></div>
                <div class="detail-row"><span class="detail-label">Spouse Phone</span><span class="detail-value">${staff.spousePhone || '—'}</span></div>
                <div class="detail-row"><span class="detail-label">Spouse Occupation</span><span class="detail-value">${staff.spouseOccupation || '—'}</span></div>
                <div class="detail-row"><span class="detail-label">No. of Children</span><span class="detail-value">${staff.numChildren !== undefined && staff.numChildren !== '' ? staff.numChildren : '—'}</span></div>
            </div>
            <div class="detail-section">
                <h4>Next of Kin</h4>
                <div class="detail-row"><span class="detail-label">Name</span><span class="detail-value">${staff.nokName || '—'}</span></div>
                <div class="detail-row"><span class="detail-label">Relationship</span><span class="detail-value">${staff.nokRelationship || '—'}</span></div>
                <div class="detail-row"><span class="detail-label">Phone</span><span class="detail-value">${staff.nokPhone || '—'}</span></div>
                <div class="detail-row"><span class="detail-label">Email</span><span class="detail-value">${staff.nokEmail || '—'}</span></div>
            </div>
            <div style="padding:10px 0; display: flex; flex-direction: column; gap: 10px;">
                <button class="btn btn-primary" style="width:100%;background-color:#28a745;border:none;" onclick="editAncillaryStaff('${staff.id}');closeDetail();">
                    <i class="fas fa-edit"></i> Edit Staff Profile
                </button>
                <button class="btn btn-primary" style="width:100%;background-color:#6c757d;border:none;" onclick="resetUserPassword('${staff.id}', 'ancillary')">
                    <i class="fas fa-key"></i> Reset Password
                </button>
            </div>
        `;
    };

    window.closeDetail = function () {
        document.getElementById('detailPanel').classList.remove('open');
    };

    // Edit Action
    window.editAncillaryStaff = function (id) {
        const currentUser = JSON.parse(sessionStorage.getItem('adminUser') || '{}');
        const isSuper = currentUser.adminRole === 'Super Administrator';

        const staff = ancillaryStaff.find(s => s.id === id);
        if (staff) {
            document.getElementById('editStaffId').value = staff.id;
            document.getElementById('editStaffName').value = staff.name;
            document.getElementById('editStaffDept').value = staff.primaryRole;
            document.getElementById('editStaffEmail').value = staff.email;
            document.getElementById('editStaffPhone').value = staff.phone;
            document.getElementById('editStaffStatus').value = staff.status;
            document.getElementById('editStaffEmployer').value = staff.employer || 'SDC';
            document.getElementById('editStaffBaseSalary').value = staff.baseSalary || 0;
            document.getElementById('editStaffAllowances').value = staff.allowances || 0;
            document.getElementById('editStaffDeductions').value = staff.deductions || 0;

            // New fields
            document.getElementById('editStaffDob').value = staff.dob || '';
            document.getElementById('editStaffGender').value = staff.gender || '';
            document.getElementById('editStaffReligion').value = staff.religion || '';
            document.getElementById('editStaffNationalId').value = staff.nationalId || '';
            document.getElementById('editStaffAddress').value = staff.address || '';
            document.getElementById('editStaffSpouseName').value = staff.spouseName || '';
            document.getElementById('editStaffSpousePhone').value = staff.spousePhone || '';
            document.getElementById('editStaffSpouseOccupation').value = staff.spouseOccupation || '';
            document.getElementById('editStaffNumChildren').value = staff.numChildren || '';
            document.getElementById('editStaffNokName').value = staff.nokName || '';
            document.getElementById('editStaffNokRelationship').value = staff.nokRelationship || '';
            document.getElementById('editStaffNokPhone').value = staff.nokPhone || '';
            document.getElementById('editStaffNokEmail').value = staff.nokEmail || '';

            // Role Restriction Logic
            document.getElementById('editStaffDept').disabled = !isSuper;
            const addBtn = document.getElementById('addRoleBtn');
            if (addBtn) {
                addBtn.disabled = !isSuper;
                addBtn.style.opacity = !isSuper ? '0.5' : '1';
            }

            // Clear and populate secondary roles
            const container = document.getElementById('secondaryRolesContainer');
            if (container) {
                container.innerHTML = '';
                if (staff.secondaryRoles && staff.secondaryRoles.length > 0) {
                    staff.secondaryRoles.forEach(role => addRoleRow(role, !isSuper));
                }
            }

            if (typeof openModal === 'function') openModal('editStaffModal');
        }
    };

    // Helper to add a role row to the edit modal
    const roleOptions = [
        "Tuckshop Manager",
        "Farm Manager",
        "Farm Manager Assistant",
        "Maintenance Supervisor",
        "Security Officer"
    ];

    function addRoleRow(selectedRole = '', disabled = false) {
        const container = document.getElementById('secondaryRolesContainer');
        if (!container) return;

        if (!disabled && container.children.length >= 4) {
            if (typeof Toast !== 'undefined' && Toast.error) {
                Toast.error('Maximum 4 secondary roles allowed.');
            } else {
                alert('Maximum 4 secondary roles allowed.');
            }
            return;
        }

        const row = document.createElement('div');
        row.className = 'role-row';
        row.style.cssText = 'display: flex; gap: 10px; align-items: center;';

        let optionsHtml = roleOptions.map(opt => `<option value="${opt}" ${opt === selectedRole ? 'selected' : ''}>${opt}</option>`).join('');

        row.innerHTML = `
            <select class="staff-secondary-role-select" style="flex: 1;" ${disabled ? 'disabled' : ''}>
                <option value="">Select Role</option>
                ${optionsHtml}
            </select>
            <button type="button" class="btn-icon" ${disabled ? 'style="display:none;"' : 'style="color: #dc3545; background: none; border: none; cursor: pointer;"'} onclick="this.parentElement.remove()">
                <i class="fas fa-times"></i>
            </button>
        `;
        container.appendChild(row);
    }

    const addRoleBtn = document.getElementById('addRoleBtn');
    if (addRoleBtn) {
        addRoleBtn.addEventListener('click', () => addRoleRow());
    }

    // Delete Action
    window.prepareDeleteAncillaryStaff = function (id) {
        ancillaryToDeleteId = id;
        if (typeof openModal === 'function') openModal('deleteStaffModal');
    };

    // Confirm Delete Handler
    const confirmDeleteBtn = document.getElementById('confirmDeleteBtn');
    if (confirmDeleteBtn) {
        confirmDeleteBtn.addEventListener('click', function () {
            if (ancillaryToDeleteId) {
                // Remove ancillary staff from array
                ancillaryStaff = ancillaryStaff.filter(s => s.id !== ancillaryToDeleteId);

                // Re-render the table
                renderAncillaryStaff(ancillaryStaff);

                // Close modal
                if (typeof closeModal === 'function') closeModal('deleteStaffModal');

                // Reset the ID
                ancillaryToDeleteId = null;

                // Show success message
                if (typeof Toast !== 'undefined' && Toast.success) {
                    Toast.success('Ancillary staff deleted successfully!');
                } else {
                    alert('Ancillary staff deleted successfully!');
                }
            }
        });
    }

    // Add Staff Form Submission
    const addForm = document.getElementById('addStaffForm');
    if (addForm) {
        addForm.addEventListener('submit', function (e) {
            e.preventDefault();

            const newStaff = {
                id: document.getElementById('newStaffId').value,
                name: document.getElementById('newStaffName').value,
                initials: document.getElementById('newStaffName').value.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2),
                primaryRole: document.getElementById('newStaffRole').value || 'Ancillary Staff',
                secondaryRoles: [],
                email: document.getElementById('newStaffEmail').value,
                phone: document.getElementById('newStaffPhone').value,
                status: document.getElementById('newStaffStatus').value,
                employer: document.getElementById('newStaffEmployer').value || 'SDC',
                baseSalary: parseFloat(document.getElementById('newStaffBaseSalary').value) || 0,
                allowances: parseFloat(document.getElementById('newStaffAllowances').value) || 0,
                deductions: parseFloat(document.getElementById('newStaffDeductions').value) || 0,
                joined: new Date().toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
                dob: document.getElementById('newStaffDob').value,
                gender: document.getElementById('newStaffGender').value,
                religion: document.getElementById('newStaffReligion').value,
                nationalId: document.getElementById('newStaffNationalId').value,
                address: document.getElementById('newStaffAddress').value,
                spouseName: document.getElementById('newStaffSpouseName').value,
                spousePhone: document.getElementById('newStaffSpousePhone').value,
                spouseOccupation: document.getElementById('newStaffSpouseOccupation').value,
                numChildren: document.getElementById('newStaffNumChildren').value,
                nokName: document.getElementById('newStaffNokName').value,
                nokRelationship: document.getElementById('newStaffNokRelationship').value,
                nokPhone: document.getElementById('newStaffNokPhone').value,
                nokEmail: document.getElementById('newStaffNokEmail').value,
                schoolCode: AcadexCore.getActiveSchool()
            };

            const secondaryRole = document.getElementById('newStaffSecondaryRole').value;
            if (secondaryRole) {
                newStaff.secondaryRoles.push(secondaryRole);
            }

            // Simple validation for duplicate ID
            if (ancillaryStaff.some(s => s.id === newStaff.id)) {
                Toast.error('Staff ID already exists.');
                return;
            }

            ancillaryStaff.push(newStaff);
            saveAncillaryStaff(ancillaryStaff);
            renderAncillaryStaff(ancillaryStaff);

            if (typeof closeModal === 'function') closeModal('addStaffModal');
            addForm.reset();

            Toast.success('Ancillary staff added successfully!');
        });
    }

    // Edit Form Submission
    const editForm = document.getElementById('editStaffForm');
    if (editForm) {
        editForm.addEventListener('submit', function (e) {
            e.preventDefault();
            const id = document.getElementById('editStaffId').value;
            const staffIndex = ancillaryStaff.findIndex(s => s.id === id);

            if (staffIndex !== -1) {
                // Collect multiple secondary roles
                const roleSelects = document.querySelectorAll('.staff-secondary-role-select');
                const secondaryRoles = Array.from(roleSelects)
                    .map(select => select.value)
                    .filter(val => val !== '');

                const updatedStaff = {
                    ...ancillaryStaff[staffIndex],
                    name: document.getElementById('editStaffName').value,
                    primaryRole: document.getElementById('editStaffDept').value,
                    secondaryRoles: secondaryRoles,
                    email: document.getElementById('editStaffEmail').value,
                    phone: document.getElementById('editStaffPhone').value,
                    status: document.getElementById('editStaffStatus').value,
                    employer: document.getElementById('editStaffEmployer').value,
                    baseSalary: parseFloat(document.getElementById('editStaffBaseSalary').value) || 0,
                    allowances: parseFloat(document.getElementById('editStaffAllowances').value) || 0,
                    deductions: parseFloat(document.getElementById('editStaffDeductions').value) || 0,
                    dob: document.getElementById('editStaffDob').value,
                    gender: document.getElementById('editStaffGender').value,
                    religion: document.getElementById('editStaffReligion').value,
                    nationalId: document.getElementById('editStaffNationalId').value,
                    address: document.getElementById('editStaffAddress').value,
                    spouseName: document.getElementById('editStaffSpouseName').value,
                    spousePhone: document.getElementById('editStaffSpousePhone').value,
                    spouseOccupation: document.getElementById('editStaffSpouseOccupation').value,
                    numChildren: document.getElementById('editStaffNumChildren').value,
                    nokName: document.getElementById('editStaffNokName').value,
                    nokRelationship: document.getElementById('editStaffNokRelationship').value,
                    nokPhone: document.getElementById('editStaffNokPhone').value,
                    nokEmail: document.getElementById('editStaffNokEmail').value
                };

                ancillaryStaff[staffIndex] = updatedStaff;
                saveAncillaryStaff(ancillaryStaff);
                renderAncillaryStaff(ancillaryStaff);

                if (typeof closeModal === 'function') closeModal('editStaffModal');

                Toast.success('Ancillary staff updated successfully!');
            }
        });
    }

    // Make functions available globally
    window.filterAncillaryStaff = filterAncillaryStaff;
    window.renderAncillaryStaff = renderAncillaryStaff;
});

