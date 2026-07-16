// Admin Teachers Management Logic

// Mock Teachers Data
// Mock Teachers Data - Seeded if localStorage is empty
const SEED_TEACHERS = [
    {
        id: 'TCH-24000001',
        name: 'Sarah Miller',
        initials: 'SM',
        department: 'English',
        email: 'sarah.miller@embakwe.edu',
        phone: '+263 77 234 5678',
        classes: 4,
        status: 'Active',
        primaryRole: 'Teacher',
        secondaryRoles: ['Class Teacher Form 1A'],
        subjects: ['English Language', 'Literature in English']
    },
    {
        id: 'TCH-24000002',
        name: 'Robert Johnson',
        initials: 'RJ',
        department: 'Science',
        email: 'robert.johnson@embakwe.edu',
        phone: '+263 77 345 6789',
        classes: 6,
        status: 'Active',
        primaryRole: 'Teacher',
        secondaryRoles: ['Class Teacher Form 1B'],
        subjects: ['Combined Science', 'Biology']
    }
];

function getTeachers() {
    const data = getTenantData('school_teachers', SEED_TEACHERS);

    // Migration logic
    return data.map(teacher => {
        if (teacher.secondaryRole !== undefined) {
            teacher.secondaryRoles = teacher.secondaryRole ? [teacher.secondaryRole] : [];
            delete teacher.secondaryRole;
        }
        if (!teacher.secondaryRoles) teacher.secondaryRoles = [];

        if (teacher.subject !== undefined) {
            teacher.subjects = teacher.subject ? [teacher.subject] : [];
            delete teacher.subject;
        }
        if (!teacher.subjects) teacher.subjects = [];

        return teacher;
    });
}

function saveTeachers(data) {
    saveTenantData('school_teachers', data);
}

let teachers = getTeachers();
let teacherToDeleteId = null;

// Pagination State
let currentPage = 1;
const itemsPerPage = 10;
let filteredTeachers = [...teachers];

document.addEventListener('DOMContentLoaded', function () {
    const tableBody = document.getElementById('teachersTableBody');
    const searchInput = document.getElementById('teacherSearch');
    const departmentFilter = document.getElementById('departmentFilter');
    const statusFilter = document.getElementById('statusFilter');
    const editForm = document.getElementById('editTeacherForm');
    const confirmDeleteBtn = document.getElementById('confirmDeleteBtn');

    // Initial Render
    renderTeachers(teachers);

    // Event Listeners
    if (searchInput) {
        searchInput.addEventListener('keyup', filterTeachers);
    }
    if (departmentFilter) {
        departmentFilter.addEventListener('change', filterTeachers);
    }
    if (statusFilter) {
        statusFilter.addEventListener('change', filterTeachers);
    }
    if (editForm) {
        editForm.addEventListener('submit', handleEditSubmit);
    }
    if (confirmDeleteBtn) {
        confirmDeleteBtn.addEventListener('click', executeDelete);
    }

    // Dynamic Row buttons
    const addRoleBtn = document.getElementById('addRoleBtn');
    if (addRoleBtn) addRoleBtn.addEventListener('click', () => addRoleRow('secondaryRolesContainer'));

    const addSubjectBtn = document.getElementById('addSubjectBtn');
    if (addSubjectBtn) addSubjectBtn.addEventListener('click', () => addSubjectRow('subjectsContainer'));

    const editAddRoleBtn = document.getElementById('editAddRoleBtn');
    if (editAddRoleBtn) editAddRoleBtn.addEventListener('click', () => addRoleRow('editSecondaryRolesContainer'));

    const editAddSubjectBtn = document.getElementById('editAddSubjectBtn');
    if (editAddSubjectBtn) editAddSubjectBtn.addEventListener('click', () => addSubjectRow('editSubjectsContainer'));

    // Add Teacher Form
    const addForm = document.getElementById('addTeacherForm');
    if (addForm) {
        addForm.addEventListener('submit', function (e) {
            e.preventDefault();

            const newTeacher = {
                id: document.getElementById('newTeacherId').value || AppUtils.generateNextId(AppUtils.ID_PREFIX.TEACHER),
                name: document.getElementById('newTeacherName').value,
                department: document.getElementById('newTeacherDept').value,
                email: document.getElementById('newTeacherEmail').value,
                phone: document.getElementById('newTeacherPhone').value,
                classes: 0,
                status: document.getElementById('newTeacherStatus').value,
                employer: document.getElementById('newTeacherEmployer').value || 'SDC',
                baseSalary: parseFloat(document.getElementById('newTeacherBaseSalary').value) || 0,
                allowances: parseFloat(document.getElementById('newTeacherAllowances').value) || 0,
                deductions: parseFloat(document.getElementById('newTeacherDeductions').value) || 0,
                primaryRole: document.getElementById('newTeacherPrimaryRole').value || 'Teacher',
                secondaryRoles: Array.from(document.querySelectorAll('#secondaryRolesContainer select')).map(s => s.value).filter(v => v),
                subjects: Array.from(document.querySelectorAll('#subjectsContainer select')).map(s => s.value).filter(v => v),
                dob: document.getElementById('newTeacherDob').value,
                gender: document.getElementById('newTeacherGender').value,
                religion: document.getElementById('newTeacherReligion').value,
                nationalId: document.getElementById('newTeacherNationalId').value,
                address: document.getElementById('newTeacherAddress').value,
                spouseName: document.getElementById('newTeacherSpouseName').value,
                spousePhone: document.getElementById('newTeacherSpousePhone').value,
                spouseOccupation: document.getElementById('newTeacherSpouseOccupation').value,
                numChildren: document.getElementById('newTeacherNumChildren').value,
                nokName: document.getElementById('newTeacherNokName').value,
                nokRelationship: document.getElementById('newTeacherNokRelationship').value,
                nokPhone: document.getElementById('newTeacherNokPhone').value,
                nokEmail: document.getElementById('newTeacherNokEmail').value,
                schoolCode: sessionStorage.getItem('activeSchoolCode') || ''
            };

            // Initials
            const names = newTeacher.name.split(' ');
            newTeacher.initials = names.length > 1 ? names[0][0] + names[names.length - 1][0] : names[0].substring(0, 2);
            newTeacher.initials = newTeacher.initials.toUpperCase();

            // Check duplicate
            if (teachers.some(t => t.id === newTeacher.id)) {
                Toast.error('Teacher ID already exists!');
                return;
            }

            teachers.push(newTeacher);
            saveTeachers(teachers);
            filterTeachers(); // Re-render

            if (typeof closeModal === 'function') closeModal('addTeacherModal');
            addForm.reset();

            Toast.success('Teacher added successfully!');
        });
    }

    // Render Function
    function renderTeachers(data = filteredTeachers) {
        if (!tableBody) return;

        tableBody.innerHTML = '';
        filteredTeachers = data;

        // Calculate slice
        const startIndex = (currentPage - 1) * itemsPerPage;
        const endIndex = startIndex + itemsPerPage;
        const paginatedData = filteredTeachers.slice(startIndex, endIndex);

        if (paginatedData.length === 0) {
            tableBody.innerHTML = '<tr><td colspan="9" style="text-align:center; padding: 20px;">No teachers found</td></tr>';
            renderPagination(0);
            return;
        }

        paginatedData.forEach(teacher => {
            const statusClass = teacher.status === 'Active' ? 'status-active' : 'status-inactive';
            const initialsColor = teacher.status === 'Active' ? '#28a745' : '#dc3545';

            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${teacher.id}</td>
                <td>
                    <div class="teacher-info">
                        <div class="teacher-avatar" style="background-color: ${initialsColor}">
                            ${teacher.photo || teacher.profilePic ? `<img src="${teacher.photo || teacher.profilePic}" onerror="this.style.display='none'; this.parentElement.innerText='${teacher.initials}'" style="width:100%;height:100%;border-radius:50%;object-fit:cover;">` : teacher.initials}
                        </div>
                        <span>${teacher.name}</span>
                    </div>
                </td>
                <td>${teacher.primaryRole || 'Teacher'}</td>
                <td>${teacher.secondaryRoles && teacher.secondaryRoles.length > 0 ? teacher.secondaryRoles.map(r => `<span class="secondary-role-badge">${r}</span>`).join('') : '—'}</td>
                <td>${teacher.subjects && teacher.subjects.length > 0 ? teacher.subjects.map(s => `<span class="subject-badge">${s}</span>`).join('') : '—'}</td>
                <td>${teacher.email}</td>
                <td>${teacher.phone}</td>
                <td><span class="status-badge ${statusClass}">${teacher.status}</span></td>
                <td>
                    <div class="action-buttons">
                        <button class="btn-icon btn-view" onclick="viewTeacher('${teacher.id}')" title="View"><i class="fas fa-eye"></i></button>
                        <button class="btn-icon btn-edit" onclick="editTeacher('${teacher.id}')" title="Edit"><i class="fas fa-edit"></i></button>
                        <button class="btn btn-icon btn-delete" onclick="prepareDeleteTeacher('${teacher.id}')" title="Delete"><i class="fas fa-trash"></i></button>
                    </div>
                </td>
            `;
            tableBody.appendChild(row);
        });

        renderPagination(filteredTeachers.length);
    }

    function renderPagination(totalItems) {
        const container = document.getElementById('teacherPagination');
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
                renderTeachers();
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
                renderTeachers();
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
                renderTeachers();
            }
        };
        container.appendChild(nextBtn);
    }

    // Filter Function
    function filterTeachers() {
        const searchTerm = searchInput ? searchInput.value.toLowerCase() : '';
        const deptValue = departmentFilter ? departmentFilter.value : 'All Departments';
        const statusValue = statusFilter ? statusFilter.value : 'All Status';

        const filtered = teachers.filter(teacher => {
            const matchesSearch = teacher.name.toLowerCase().includes(searchTerm) ||
                teacher.email.toLowerCase().includes(searchTerm) ||
                teacher.id.toLowerCase().includes(searchTerm);

            const matchesDept = deptValue === 'All Departments' || teacher.department === deptValue;
            const matchesStatus = statusValue === 'All Status' || teacher.status === statusValue;

            return matchesSearch && matchesDept && matchesStatus;
        });

        currentPage = 1;
        renderTeachers(filtered);
    }

    // View Action
    window.viewTeacher = function (id) {
        const teacher = teachers.find(t => t.id === id);
        if (!teacher) return;

        const panel = document.getElementById('detailPanel');
        panel.classList.add('open');

        const dpAvatar = document.getElementById('dpAvatar');
        if (teacher.photo || teacher.profilePic) {
            dpAvatar.innerHTML = `<img src="${teacher.photo || teacher.profilePic}" onerror="this.style.display='none'; this.parentElement.innerText='${teacher.initials || 'TS'}'" style="width:100%;height:100%;border-radius:50%;object-fit:cover;">`;
        } else {
            dpAvatar.textContent = teacher.initials || 'TS';
        }
        document.getElementById('dpName').textContent = teacher.name;
        
        const activeSchool = window.AcadexCore ? AcadexCore.getActiveSchool() : null;
        const schoolContextHtml = activeSchool 
            ? `<div style="font-size: 0.75rem; opacity: 0.8; margin-top: 4px; color: rgba(255,255,255,0.8);"><i class="fas fa-school"></i> ${activeSchool.name}</div>`
            : '';
        document.getElementById('dpRole').innerHTML = (teacher.primaryRole || 'Teacher') + schoolContextHtml;

        const statusClass = teacher.status === 'Active' ? 'status-active' : 'status-inactive';

        document.getElementById('dpBody').innerHTML = `
            <div class="detail-section">
                <h4>Identity</h4>
                <div class="detail-row"><span class="detail-label">Employee ID</span><span class="detail-value" style="font-family:monospace;">${teacher.id || '—'}</span></div>
                <div class="detail-row"><span class="detail-label">Primary Role</span><span class="detail-value"><span class="badge badge-teacher">${teacher.primaryRole || 'Teacher'}</span></span></div>
                <div class="detail-row"><span class="detail-label">Department</span><span class="detail-value">${teacher.department || '—'}</span></div>
                <div class="detail-row"><span class="detail-label">Secondary Roles</span><span class="detail-value">${(teacher.secondaryRoles || []).join(', ') || '—'}</span></div>
                <div class="detail-row"><span class="detail-label">Subjects</span><span class="detail-value">${(teacher.subjects || []).join(', ') || '—'}</span></div>
            </div>
            <div class="detail-section">
                <h4>Contact</h4>
                <div class="detail-row"><span class="detail-label">Email</span><span class="detail-value">${teacher.email || '—'}</span></div>
                <div class="detail-row"><span class="detail-label">Phone</span><span class="detail-value">${teacher.phone || '—'}</span></div>
                <div class="detail-row"><span class="detail-label">Address</span><span class="detail-value">${teacher.address || '—'}</span></div>
            </div>
            <div class="detail-section">
                <h4>Employment & Payroll</h4>
                <div class="detail-row"><span class="detail-label">Employer</span><span class="detail-value">${teacher.employer || 'SDC'}</span></div>
                <div class="detail-row"><span class="detail-label">Base Salary</span><span class="detail-value">$${teacher.baseSalary || 0}</span></div>
                <div class="detail-row"><span class="detail-label">Allowances</span><span class="detail-value">$${teacher.allowances || 0}</span></div>
                <div class="detail-row"><span class="detail-label">Deductions</span><span class="detail-value">$${teacher.deductions || 0}</span></div>
                <div class="detail-row"><span class="detail-label">Status</span><span class="detail-value"><span class="status-badge ${statusClass}">${teacher.status}</span></span></div>
            </div>
            <div class="detail-section">
                <h4>Personal</h4>
                <div class="detail-row"><span class="detail-label">Date of Birth</span><span class="detail-value">${teacher.dob || '—'}</span></div>
                <div class="detail-row"><span class="detail-label">Gender</span><span class="detail-value">${teacher.gender || '—'}</span></div>
                <div class="detail-row"><span class="detail-label">Religion</span><span class="detail-value">${teacher.religion || '—'}</span></div>
                <div class="detail-row"><span class="detail-label">National ID</span><span class="detail-value">${teacher.nationalId || '—'}</span></div>
            </div>
            <div class="detail-section">
                <h4>Spouse / Family</h4>
                <div class="detail-row"><span class="detail-label">Spouse Name</span><span class="detail-value">${teacher.spouseName || '—'}</span></div>
                <div class="detail-row"><span class="detail-label">Spouse Phone</span><span class="detail-value">${teacher.spousePhone || '—'}</span></div>
                <div class="detail-row"><span class="detail-label">Spouse Occupation</span><span class="detail-value">${teacher.spouseOccupation || '—'}</span></div>
                <div class="detail-row"><span class="detail-label">No. of Children</span><span class="detail-value">${teacher.numChildren !== undefined && teacher.numChildren !== '' ? teacher.numChildren : '—'}</span></div>
            </div>
            <div class="detail-section">
                <h4>Next of Kin</h4>
                <div class="detail-row"><span class="detail-label">Name</span><span class="detail-value">${teacher.nokName || '—'}</span></div>
                <div class="detail-row"><span class="detail-label">Relationship</span><span class="detail-value">${teacher.nokRelationship || '—'}</span></div>
                <div class="detail-row"><span class="detail-label">Phone</span><span class="detail-value">${teacher.nokPhone || '—'}</span></div>
                <div class="detail-row"><span class="detail-label">Email</span><span class="detail-value">${teacher.nokEmail || '—'}</span></div>
            </div>
            <div style="padding:10px 0; display: flex; flex-direction: column; gap: 10px;">
                <button class="btn btn-primary" style="width:100%;background-color:#28a745;border:none;" onclick="editTeacher('${teacher.id}');closeDetail();">
                    <i class="fas fa-edit"></i> Edit This Teacher
                </button>
                <button class="btn btn-primary" style="width:100%;background-color:#6c757d;border:none;" onclick="resetUserPassword('${teacher.id}', 'teacher')">
                    <i class="fas fa-key"></i> Reset Password
                </button>
            </div>
        `;
    };

    window.closeDetail = function () {
        document.getElementById('detailPanel').classList.remove('open');
    };

    // Edit Action
    window.editTeacher = function (id) {
        const currentUser = JSON.parse(sessionStorage.getItem('adminUser') || '{}');
        const isSuper = currentUser.adminRole === 'Super Administrator';

        const teacher = teachers.find(t => t.id === id);
        if (teacher) {
            document.getElementById('editTeacherId').value = teacher.id;
            document.getElementById('editTeacherName').value = teacher.name;
            document.getElementById('editTeacherDept').value = teacher.department;
            document.getElementById('editTeacherEmail').value = teacher.email;
            document.getElementById('editTeacherPhone').value = teacher.phone;
            document.getElementById('editTeacherStatus').value = teacher.status;
            document.getElementById('editTeacherEmployer').value = teacher.employer || 'SDC';
            document.getElementById('editTeacherBaseSalary').value = teacher.baseSalary || 0;
            document.getElementById('editTeacherAllowances').value = teacher.allowances || 0;
            document.getElementById('editTeacherDeductions').value = teacher.deductions || 0;
            document.getElementById('editTeacherPrimaryRole').value = teacher.primaryRole || 'Teacher';

            // New fields
            document.getElementById('editTeacherDob').value = teacher.dob || '';
            document.getElementById('editTeacherGender').value = teacher.gender || '';
            document.getElementById('editTeacherReligion').value = teacher.religion || '';
            document.getElementById('editTeacherNationalId').value = teacher.nationalId || '';
            document.getElementById('editTeacherAddress').value = teacher.address || '';
            document.getElementById('editTeacherSpouseName').value = teacher.spouseName || '';
            document.getElementById('editTeacherSpousePhone').value = teacher.spousePhone || '';
            document.getElementById('editTeacherSpouseOccupation').value = teacher.spouseOccupation || '';
            document.getElementById('editTeacherNumChildren').value = teacher.numChildren || '';
            document.getElementById('editTeacherNokName').value = teacher.nokName || '';
            document.getElementById('editTeacherNokRelationship').value = teacher.nokRelationship || '';
            document.getElementById('editTeacherNokPhone').value = teacher.nokPhone || '';
            document.getElementById('editTeacherNokEmail').value = teacher.nokEmail || '';

            // Role Restriction Logic
            document.getElementById('editTeacherPrimaryRole').disabled = !isSuper;
            document.getElementById('editTeacherDept').disabled = !isSuper;
            document.getElementById('editAddRoleBtn').disabled = !isSuper;
            if (!isSuper) document.getElementById('editAddRoleBtn').style.opacity = '0.5';
            else document.getElementById('editAddRoleBtn').style.opacity = '1';

            // Populate roles and subjects
            const rolesContainer = document.getElementById('editSecondaryRolesContainer');
            rolesContainer.innerHTML = '';
            if (teacher.secondaryRoles) teacher.secondaryRoles.forEach(r => addRoleRow('editSecondaryRolesContainer', r, !isSuper));

            const subjectsContainer = document.getElementById('editSubjectsContainer');
            subjectsContainer.innerHTML = '';
            if (teacher.subjects) teacher.subjects.forEach(s => addSubjectRow('editSubjectsContainer', s));

            if (typeof openModal === 'function') openModal('editTeacherModal');
        }
    };

    function handleEditSubmit(e) {
        e.preventDefault();
        const id = document.getElementById('editTeacherId').value;
        const index = teachers.findIndex(t => t.id === id);

        if (index !== -1) {
            teachers[index].name = document.getElementById('editTeacherName').value;
            teachers[index].department = document.getElementById('editTeacherDept').value;
            teachers[index].email = document.getElementById('editTeacherEmail').value;
            teachers[index].phone = document.getElementById('editTeacherPhone').value;
            teachers[index].status = document.getElementById('editTeacherStatus').value;
            teachers[index].employer = document.getElementById('editTeacherEmployer').value;
            teachers[index].baseSalary = parseFloat(document.getElementById('editTeacherBaseSalary').value) || 0;
            teachers[index].allowances = parseFloat(document.getElementById('editTeacherAllowances').value) || 0;
            teachers[index].deductions = parseFloat(document.getElementById('editTeacherDeductions').value) || 0;
            teachers[index].primaryRole = document.getElementById('editTeacherPrimaryRole').value;
            teachers[index].secondaryRoles = Array.from(document.querySelectorAll('#editSecondaryRolesContainer select')).map(s => s.value).filter(v => v);
            teachers[index].subjects = Array.from(document.querySelectorAll('#editSubjectsContainer select')).map(s => s.value).filter(v => v);

            teachers[index].dob = document.getElementById('editTeacherDob').value;
            teachers[index].gender = document.getElementById('editTeacherGender').value;
            teachers[index].religion = document.getElementById('editTeacherReligion').value;
            teachers[index].nationalId = document.getElementById('editTeacherNationalId').value;
            teachers[index].address = document.getElementById('editTeacherAddress').value;
            teachers[index].spouseName = document.getElementById('editTeacherSpouseName').value;
            teachers[index].spousePhone = document.getElementById('editTeacherSpousePhone').value;
            teachers[index].spouseOccupation = document.getElementById('editTeacherSpouseOccupation').value;
            teachers[index].numChildren = document.getElementById('editTeacherNumChildren').value;
            teachers[index].nokName = document.getElementById('editTeacherNokName').value;
            teachers[index].nokRelationship = document.getElementById('editTeacherNokRelationship').value;
            teachers[index].nokPhone = document.getElementById('editTeacherNokPhone').value;
            teachers[index].nokEmail = document.getElementById('editTeacherNokEmail').value;
            teachers[index].schoolCode = teachers[index].schoolCode || sessionStorage.getItem('activeSchoolCode') || '';

            // Update initials
            const names = teachers[index].name.split(' ');
            teachers[index].initials = names.length > 1 ? names[0][0] + names[names.length - 1][0] : names[0].substring(0, 2);
            teachers[index].initials = teachers[index].initials.toUpperCase();

            saveTeachers(teachers);
            filterTeachers(); // Re-render
            if (typeof closeModal === 'function') closeModal('editTeacherModal');
            Toast.success('Teacher updated successfully!');
        }
    }

    // Delete Action
    window.prepareDeleteTeacher = function (id) {
        teacherToDeleteId = id;
        if (typeof openModal === 'function') openModal('deleteTeacherModal');
    };

    function executeDelete() {
        if (teacherToDeleteId) {
            teachers = teachers.filter(t => t.id !== teacherToDeleteId);
            saveTeachers(teachers);
            filterTeachers();
            teacherToDeleteId = null;
            if (typeof closeModal === 'function') closeModal('deleteTeacherModal');
            if (typeof showSuccessMessage === 'function') showSuccessMessage('Teacher deleted successfully');
        }
    }

    // Helper functions for dynamic rows
    const ROLE_OPTIONS = [
        "Class Teacher Form 1A", "Class Teacher Form 1B", "Class Teacher Form 2A", "Class Teacher Form 2B",
        "Class Teacher Form 3A", "Class Teacher Form 3B", "Class Teacher Form 4A", "Class Teacher Form 4B",
        "Class Teacher Lower Six", "Class Teacher Upper Six", "Head of Department", "Sports Master", "House Master"
    ];

    const SUBJECT_OPTIONS = [
        "Mathematics", "English Language", "Literature in English", "Ndebele Language", "Combined Science",
        "Biology", "Physics", "Chemistry", "Geography", "History", "Heritage Studies", "Commerce", "Agriculture",
        "Principles of Accounts", "Business Studies", "Economics", "Computer Science", "Art"
    ];

    window.addRoleRow = function (containerId, selectedRole = '', disabled = false) {
        const container = document.getElementById(containerId);
        if (!container) return;

        const row = document.createElement('div');
        row.className = 'role-row';
        row.innerHTML = `
            <select class="form-control" style="flex: 1;" ${disabled ? 'disabled' : ''}>
                <option value="">Select Role</option>
                ${ROLE_OPTIONS.map(opt => `<option value="${opt}" ${opt === selectedRole ? 'selected' : ''}>${opt}</option>`).join('')}
            </select>
            <button type="button" class="btn-icon" ${disabled ? 'style="display:none;"' : 'style="color: #dc3545; background: none; border: none; cursor: pointer;"'} onclick="this.parentElement.remove()">
                <i class="fas fa-times"></i>
            </button>
        `;
        container.appendChild(row);
    };

    window.addSubjectRow = function (containerId, selectedSubject = '', disabled = false) {
        const container = document.getElementById(containerId);
        if (!container) return;

        const row = document.createElement('div');
        row.className = 'subject-row';
        row.innerHTML = `
            <select class="form-control" style="flex: 1;" ${disabled ? 'disabled' : ''}>
                <option value="">Select Subject</option>
                ${SUBJECT_OPTIONS.map(opt => `<option value="${opt}" ${opt === selectedSubject ? 'selected' : ''}>${opt}</option>`).join('')}
            </select>
            <button type="button" class="btn-icon" ${disabled ? 'style="display:none;"' : 'style="color: #dc3545; background: none; border: none; cursor: pointer;"'} onclick="this.parentElement.remove()">
                <i class="fas fa-times"></i>
            </button>
        `;
        container.appendChild(row);
    };
});

