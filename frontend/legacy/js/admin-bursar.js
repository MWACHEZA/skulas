// Admin Bursar Management Logic

// Mock Bursar Data
// Mock Bursar Data - Seeded if localStorage is empty
const SEED_BURSARS = [
    {
        id: 'BUR-24000001',
        name: 'Robert Taylor',
        initials: 'RT',
        department: 'Finance',
        secondaryRole: null,
        email: 'robert.taylor@embakwe.edu',
        phone: '+263 772 345 678',
        status: 'Active'
    }
];

function getBursars() {
    let stored = getTenantData('school_bursars', 'null');
    if (!stored) {
        saveTenantData('school_bursars', SEED_BURSARS);
        return SEED_BURSARS;
    }
    return JSON.parse(stored);
}

function saveBursars(data) {
    saveTenantData('school_bursars', data);
}

let bursarStaff = getBursars();
let bursarToDeleteId = null;

// Pagination State
let currentPage = 1;
const itemsPerPage = 10;
let filteredBursarStaff = [...bursarStaff];

document.addEventListener('DOMContentLoaded', function () {
    const tableBody = document.getElementById('bursarTableBody');
    const searchInput = document.getElementById('bursarSearch');
    const departmentFilter = document.getElementById('departmentFilter');
    const statusFilter = document.getElementById('statusFilter');

    // Initial Render
    renderBursarStaff(bursarStaff);

    // Event Listeners
    if (searchInput) {
        searchInput.addEventListener('keyup', filterBursarStaff);
    }
    if (departmentFilter) {
        departmentFilter.addEventListener('change', filterBursarStaff);
    }
    if (statusFilter) {
        statusFilter.addEventListener('change', filterBursarStaff);
    }

    // Render Function
    function renderBursarStaff(data = filteredBursarStaff) {
        if (!tableBody) return;

        tableBody.innerHTML = '';

        // Update filtered list for pagination
        filteredBursarStaff = data;

        // Calculate slice
        const startIndex = (currentPage - 1) * itemsPerPage;
        const endIndex = startIndex + itemsPerPage;
        const paginatedData = filteredBursarStaff.slice(startIndex, endIndex);

        if (paginatedData.length === 0) {
            tableBody.innerHTML = '<tr><td colspan="8" style="text-align:center; padding: 20px;">No bursar staff found</td></tr>';
            renderPagination(0);
            return;
        }

        paginatedData.forEach(staff => {
            const statusClass = staff.status === 'Active' ? 'status-active' : 'status-inactive';
            const initialsColor = '#20c997'; // Teal for bursar

            const secondaryRoleHtml = staff.secondaryRole
                ? `<span class="secondary-role-badge">${staff.secondaryRole}</span>`
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
                <td>${staff.department}</td>
                <td>${secondaryRoleHtml}</td>
                <td>${staff.email}</td>
                <td>${staff.phone}</td>
                <td><span class="status-badge ${statusClass}">${staff.status}</span></td>
                <td>
                    <div class="action-buttons">
                        <button class="btn-icon btn-view" onclick="viewBursarStaff('${staff.id}')" title="View"><i class="fas fa-eye"></i></button>
                        <button class="btn-icon btn-edit" onclick="editBursarStaff('${staff.id}')" title="Edit"><i class="fas fa-edit"></i></button>
                        <button class="btn btn-icon btn-delete" onclick="prepareDeleteBursarStaff('${staff.id}')" title="Delete"><i class="fas fa-trash"></i></button>
                    </div>
                </td>
            `;
            tableBody.appendChild(row);
        });

        renderPagination(filteredBursarStaff.length);
    }

    function renderPagination(totalItems) {
        const container = document.getElementById('bursarPagination');
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
                renderBursarStaff();
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
                renderBursarStaff();
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
                renderBursarStaff();
            }
        };
        container.appendChild(nextBtn);
    }

    // Filter Function
    function filterBursarStaff() {
        const searchTerm = searchInput ? searchInput.value.toLowerCase() : '';
        const deptValue = departmentFilter ? departmentFilter.value : 'All Departments';
        const statusValue = statusFilter ? statusFilter.value : 'All Status';

        const filtered = bursarStaff.filter(staff => {
            const matchesSearch = staff.name.toLowerCase().includes(searchTerm) ||
                staff.email.toLowerCase().includes(searchTerm) ||
                staff.id.toLowerCase().includes(searchTerm);

            const matchesDept = deptValue === 'All Departments' || staff.department === deptValue;
            const matchesStatus = statusValue === 'All Status' || staff.status === statusValue;

            return matchesSearch && matchesDept && matchesStatus;
        });

        currentPage = 1;
        renderBursarStaff(filtered);
    }

    // View Action
    window.viewBursarStaff = function (id) {
        const staff = bursarStaff.find(s => s.id === id);
        if (!staff) return;

        const panel = document.getElementById('detailPanel');
        panel.classList.add('open');

        const dpAvatar = document.getElementById('dpAvatar');
        if (staff.photo || staff.profilePic) {
            dpAvatar.innerHTML = `<img src="${staff.photo || staff.profilePic}" onerror="this.style.display='none'; this.parentElement.innerText='${staff.initials || 'BS'}'" style="width:100%;height:100%;border-radius:50%;object-fit:cover;">`;
        } else {
            dpAvatar.textContent = staff.initials || 'BS';
        }
        
        document.getElementById('dpName').textContent = staff.name;
        document.getElementById('dpRole').textContent = staff.department || 'Bursar / Finance';

        const statusClass = staff.status === 'Active' ? 'status-active' : 'status-inactive';

        document.getElementById('dpBody').innerHTML = `
            <div class="detail-section">
                <h4>Identity</h4>
                <div class="detail-row"><span class="detail-label">Employee ID</span><span class="detail-value" style="font-family:monospace;">${staff.id || '—'}</span></div>
                <div class="detail-row"><span class="detail-label">School Context</span><span class="detail-value">${AcadexCore.getActiveSchool() || 'N/A'}</span></div>
                <div class="detail-row"><span class="detail-label">Department</span><span class="detail-value">${staff.department || '—'}</span></div>
                <div class="detail-row"><span class="detail-label">Secondary Role</span><span class="detail-value"><span class="badge badge-bursar">${staff.secondaryRole || 'None'}</span></span></div>
            </div>
            <div class="detail-section">
                <h4>Contact</h4>
                <div class="detail-row"><span class="detail-label">Email</span><span class="detail-value">${staff.email || '—'}</span></div>
                <div class="detail-row"><span class="detail-label">Phone</span><span class="detail-value">${staff.phone || '—'}</span></div>
                <div class="detail-row"><span class="detail-label">Address</span><span class="detail-value">${staff.address || '—'}</span></div>
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
                <button class="btn btn-primary" style="width:100%;background-color:#28a745;border:none;" onclick="editBursarStaff('${staff.id}');closeDetail();">
                    <i class="fas fa-edit"></i> Edit This Staff
                </button>
                <button class="btn btn-primary" style="width:100%;background-color:#6c757d;border:none;" onclick="resetUserPassword('${staff.id}', 'bursar')">
                    <i class="fas fa-key"></i> Reset Password
                </button>
            </div>
        `;
    };

    window.closeDetail = function () {
        document.getElementById('detailPanel').classList.remove('open');
    };

    // Edit Action populating modal
    window.editBursarStaff = function (id) {
        const currentUser = JSON.parse(sessionStorage.getItem('adminUser') || '{}');
        const isSuper = currentUser.adminRole === 'Super Administrator';

        const staff = bursarStaff.find(s => s.id === id);
        if (staff) {
            document.getElementById('editBursarId').value = staff.id;
            document.getElementById('editBursarName').value = staff.name;
            document.getElementById('editBursarDept').value = staff.department;
            document.getElementById('editSecondaryRole').value = staff.secondaryRole || '';

            // Role Restriction Logic
            document.getElementById('editBursarDept').disabled = !isSuper;
            document.getElementById('editSecondaryRole').disabled = !isSuper;

            document.getElementById('editBursarEmail').value = staff.email;
            document.getElementById('editBursarPhone').value = staff.phone;
            document.getElementById('editBursarStatus').value = staff.status;

            // New fields
            document.getElementById('editBursarDob').value = staff.dob || '';
            document.getElementById('editBursarGender').value = staff.gender || '';
            document.getElementById('editBursarReligion').value = staff.religion || '';
            document.getElementById('editBursarNationalId').value = staff.nationalId || '';
            document.getElementById('editBursarAddress').value = staff.address || '';
            document.getElementById('editBursarSpouseName').value = staff.spouseName || '';
            document.getElementById('editBursarSpousePhone').value = staff.spousePhone || '';
            document.getElementById('editBursarSpouseOccupation').value = staff.spouseOccupation || '';
            document.getElementById('editBursarNumChildren').value = staff.numChildren || '';
            document.getElementById('editBursarNokName').value = staff.nokName || '';
            document.getElementById('editBursarNokRelationship').value = staff.nokRelationship || '';
            document.getElementById('editBursarNokPhone').value = staff.nokPhone || '';
            document.getElementById('editBursarNokEmail').value = staff.nokEmail || '';

            if (typeof openModal === 'function') openModal('editBursarModal');
        }
    };

    // Delete Action
    window.prepareDeleteBursarStaff = function (id) {
        bursarToDeleteId = id;
        if (typeof openModal === 'function') openModal('deleteBursarModal');
    };

    // Confirm Delete Handler
    const confirmDeleteBtn = document.getElementById('confirmDeleteBtn');
    if (confirmDeleteBtn) {
        confirmDeleteBtn.addEventListener('click', function () {
            if (bursarToDeleteId) {
                // Remove bursar staff from array
                bursarStaff = bursarStaff.filter(s => s.id !== bursarToDeleteId);
                saveBursars(bursarStaff);

                // Re-render the table
                renderBursarStaff(bursarStaff);

                // Close modal
                if (typeof closeModal === 'function') closeModal('deleteBursarModal');

                // Reset the ID
                bursarToDeleteId = null;

                // Show success message
                if (typeof Toast !== 'undefined' && Toast.success) {
                    Toast.success('Bursar staff deleted successfully!');
                } else {
                    alert('Bursar staff deleted successfully!');
                }
            }
        });
    }

    // Add Bursar Form Submission
    const addForm = document.getElementById('addBursarForm');
    if (addForm) {
        addForm.addEventListener('submit', function (e) {
            e.preventDefault();

            const newStaff = {
                id: document.getElementById('newBursarId').value || AppUtils.generateNextId(AppUtils.ID_PREFIX.BURSAR),
                name: document.getElementById('newBursarName').value,
                department: document.getElementById('newBursarDept').value,
                secondaryRole: null,
                email: document.getElementById('newBursarEmail').value,
                phone: document.getElementById('newBursarPhone').value,
                status: document.getElementById('newBursarStatus').value,
                dob: document.getElementById('newBursarDob').value,
                gender: document.getElementById('newBursarGender').value,
                religion: document.getElementById('newBursarReligion').value,
                nationalId: document.getElementById('newBursarNationalId').value,
                address: document.getElementById('newBursarAddress').value,
                spouseName: document.getElementById('newBursarSpouseName').value,
                spousePhone: document.getElementById('newBursarSpousePhone').value,
                spouseOccupation: document.getElementById('newBursarSpouseOccupation').value,
                numChildren: document.getElementById('newBursarNumChildren').value,
                nokName: document.getElementById('newBursarNokName').value,
                nokRelationship: document.getElementById('newBursarNokRelationship').value,
                nokPhone: document.getElementById('newBursarNokPhone').value,
                nokEmail: document.getElementById('newBursarNokEmail').value,
                schoolCode: AcadexCore.getActiveSchool()
            };

            // Initials
            const names = newStaff.name.split(' ');
            if (names.length > 1) {
                newStaff.initials = names[0][0] + names[names.length - 1][0];
            } else {
                newStaff.initials = names[0].substring(0, 2);
            }
            newStaff.initials = newStaff.initials.toUpperCase();

            // Check duplicate
            if (bursarStaff.some(s => s.id === newStaff.id)) {
                Toast.error('Bursar ID already exists!');
                return;
            }

            bursarStaff.push(newStaff);
            saveBursars(bursarStaff);
            renderBursarStaff(bursarStaff);

            if (typeof closeModal === 'function') closeModal('addBursarModal');
            addForm.reset();

            Toast.success('Bursar staff added successfully!');
        });
    }

    // Edit Bursar Form Submission
    const editForm = document.getElementById('editBursarForm');
    if (editForm) {
        editForm.addEventListener('submit', function (e) {
            e.preventDefault();
            const id = document.getElementById('editBursarId').value;
            const index = bursarStaff.findIndex(s => s.id === id);

            if (index !== -1) {
                bursarStaff[index].name = document.getElementById('editBursarName').value;
                bursarStaff[index].department = document.getElementById('editBursarDept').value;
                bursarStaff[index].secondaryRole = document.getElementById('editSecondaryRole').value || null;
                bursarStaff[index].email = document.getElementById('editBursarEmail').value;
                bursarStaff[index].phone = document.getElementById('editBursarPhone').value;
                bursarStaff[index].status = document.getElementById('editBursarStatus').value;

                bursarStaff[index].dob = document.getElementById('editBursarDob').value;
                bursarStaff[index].gender = document.getElementById('editBursarGender').value;
                bursarStaff[index].religion = document.getElementById('editBursarReligion').value;
                bursarStaff[index].nationalId = document.getElementById('editBursarNationalId').value;
                bursarStaff[index].address = document.getElementById('editBursarAddress').value;
                bursarStaff[index].spouseName = document.getElementById('editBursarSpouseName').value;
                bursarStaff[index].spousePhone = document.getElementById('editBursarSpousePhone').value;
                bursarStaff[index].spouseOccupation = document.getElementById('editBursarSpouseOccupation').value;
                bursarStaff[index].numChildren = document.getElementById('editBursarNumChildren').value;
                bursarStaff[index].nokName = document.getElementById('editBursarNokName').value;
                bursarStaff[index].nokRelationship = document.getElementById('editBursarNokRelationship').value;
                bursarStaff[index].nokPhone = document.getElementById('editBursarNokPhone').value;
                bursarStaff[index].nokEmail = document.getElementById('editBursarNokEmail').value;

                // Update initials
                const names = bursarStaff[index].name.split(' ');
                if (names.length > 1) {
                    bursarStaff[index].initials = names[0][0] + names[names.length - 1][0];
                } else {
                    bursarStaff[index].initials = names[0].substring(0, 2);
                }
                bursarStaff[index].initials = bursarStaff[index].initials.toUpperCase();

                saveBursars(bursarStaff);
                renderBursarStaff(bursarStaff);

                if (typeof closeModal === 'function') closeModal('editBursarModal');

                Toast.success('Bursar staff updated successfully!');
            }
        });
    }

    // Make functions available globally
    window.filterBursarStaff = filterBursarStaff;
    window.renderBursarStaff = renderBursarStaff;
});

