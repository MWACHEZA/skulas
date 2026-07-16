/* Enhanced Teachers Management Functionality */

// Sample teacher data
let teachers = [
    {
        id: 'TCH-001',
        name: 'Robert Johnson',
        subject: 'Mathematics',
        email: 'r.johnson@embakwe.edu',
        phone: '+263 XXX XXXX',
        classes: 5,
        status: 'Active'
    },
    {
        id: 'TCH-002',
        name: 'Sarah Miller',
        subject: 'English',
        email: 's.miller@embakwe.edu',
        phone: '+263 XXX XXXX',
        classes: 4,
        status: 'Active'
    },
    {
        id: 'TCH-003',
        name: 'David Williams',
        subject: 'Chemistry',
        email: 'd.williams@embakwe.edu',
        phone: '+263 XXX XXXX',
        classes: 3,
        status: 'Active'
    }
];

// Render teachers table
function renderTeachers(teachersToRender = filteredTeachers) {
    const tbody = document.getElementById('teachersTableBody');
    if (!tbody) return;

    tbody.innerHTML = '';

    // Update filtered list for pagination
    filteredTeachers = teachersToRender;

    // Calculate slice
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const paginatedData = filteredTeachers.slice(startIndex, endIndex);

    if (paginatedData.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" style="text-align:center; padding: 20px;">No teachers found</td></tr>';
        renderPagination(0);
        return;
    }

    paginatedData.forEach((teacher) => {
        // Find actual index for original actions
        const index = teachers.findIndex(t => t.id === teacher.id);
        const initials = teacher.name.split(' ').map(n => n[0]).join('');
        const statusClass = teacher.status === 'Active' ? 'status-active' : 'status-inactive';

        const row = `
            <tr>
                <td>${teacher.id}</td>
                <td>
                    <div class="teacher-info">
                        <div class="teacher-avatar">${initials}</div>
                        <span>${teacher.name}</span>
                    </div>
                </td>
                <td>${teacher.subject}</td>
                <td>${teacher.email}</td>
                <td>${teacher.phone}</td>
                <td>${teacher.classes}</td>
                <td><span class="status-badge ${statusClass}">${teacher.status}</span></td>
                <td>
                    <div class="action-buttons">
                        <button class="btn-icon btn-view" onclick="viewTeacher(${index})" title="View Details">
                            <i class="fas fa-eye"></i>
                        </button>
                        <button class="btn-icon btn-edit" onclick="editTeacher(${index})" title="Edit Teacher">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn-icon btn-delete" onclick="deleteTeacher(${index})" title="Delete Teacher">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `;
        tbody.innerHTML += row;
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

// Add teacher
function handleAddTeacher(event) {
    event.preventDefault();

    const newTeacher = {
        id: document.getElementById('teacherId').value,
        name: document.getElementById('teacherName').value,
        subject: document.getElementById('teacherSubject').value,
        email: document.getElementById('teacherEmail').value,
        phone: document.getElementById('teacherPhone').value,
        classes: parseInt(document.getElementById('teacherClasses').value),
        status: document.getElementById('teacherStatus').value
    };

    teachers.push(newTeacher);
    renderTeachers();
    closeModal('addTeacherModal');
    document.getElementById('addTeacherForm').reset();
    showSuccessMessage('Teacher added successfully!');
}

// View teacher
function viewTeacher(index) {
    const teacher = teachers[index];
    const detailsHtml = `
        <div style="line-height: 2;">
            <p><strong>Employee ID:</strong> ${teacher.id}</p>
            <p><strong>Name:</strong> ${teacher.name}</p>
            <p><strong>Subject:</strong> ${teacher.subject}</p>
            <p><strong>Email:</strong> ${teacher.email}</p>
            <p><strong>Phone:</strong> ${teacher.phone}</p>
            <p><strong>Classes:</strong> ${teacher.classes}</p>
            <p><strong>Status:</strong> <span class="status-badge ${teacher.status === 'Active' ? 'status-active' : 'status-inactive'}">${teacher.status}</span></p>
        </div>
    `;
    document.getElementById('teacherDetails').innerHTML = detailsHtml;
    openModal('viewTeacherModal');
}

// Edit teacher
function editTeacher(index) {
    const teacher = teachers[index];
    document.getElementById('editTeacherIndex').value = index;
    document.getElementById('editTeacherId').value = teacher.id;
    document.getElementById('editTeacherName').value = teacher.name;
    document.getElementById('editTeacherSubject').value = teacher.subject;
    document.getElementById('editTeacherEmail').value = teacher.email;
    document.getElementById('editTeacherPhone').value = teacher.phone;
    document.getElementById('editTeacherClasses').value = teacher.classes;
    document.getElementById('editTeacherStatus').value = teacher.status;
    openModal('editTeacherModal');
}

// Handle edit teacher
function handleEditTeacher(event) {
    event.preventDefault();

    const index = document.getElementById('editTeacherIndex').value;
    teachers[index] = {
        id: document.getElementById('editTeacherId').value,
        name: document.getElementById('editTeacherName').value,
        subject: document.getElementById('editTeacherSubject').value,
        email: document.getElementById('editTeacherEmail').value,
        phone: document.getElementById('editTeacherPhone').value,
        classes: parseInt(document.getElementById('editTeacherClasses').value),
        status: document.getElementById('editTeacherStatus').value
    };

    renderTeachers();
    closeModal('editTeacherModal');
    showSuccessMessage('Teacher updated successfully!');
}

// Delete teacher
function deleteTeacher(index) {
    const teacher = teachers[index];
    if (confirm(`Are you sure you want to delete ${teacher.name}? This action cannot be undone.`)) {
        teachers.splice(index, 1);
        renderTeachers();
        showSuccessMessage('Teacher deleted successfully!');
    }
}

// Filter teachers
function filterTeachers() {
    const searchTerm = document.getElementById('searchInput')?.value.toLowerCase() || '';
    const deptFilter = document.getElementById('deptFilter')?.value || '';
    const statusFilter = document.getElementById('statusFilter')?.value || '';

    const filtered = teachers.filter(teacher => {
        const matchesSearch = teacher.name.toLowerCase().includes(searchTerm) ||
            teacher.id.toLowerCase().includes(searchTerm) ||
            teacher.email.toLowerCase().includes(searchTerm);
        const matchesDept = !deptFilter || teacher.subject.toLowerCase().includes(deptFilter.toLowerCase());
        const matchesStatus = !statusFilter || teacher.status === statusFilter;

        return matchesSearch && matchesDept && matchesStatus;
    });

    currentPage = 1;
    renderTeachers(filtered);
}

// Initialize teachers page
function initTeachersPage() {
    renderTeachers();

    const searchInput = document.getElementById('searchInput');
    const deptFilter = document.getElementById('deptFilter');
    const statusFilter = document.getElementById('statusFilter');

    if (searchInput) searchInput.addEventListener('keyup', filterTeachers);
    if (deptFilter) deptFilter.addEventListener('change', filterTeachers);
    if (statusFilter) statusFilter.addEventListener('change', filterTeachers);
}

// Auto-initialize if on teachers page
if (document.getElementById('teachersTableBody')) {
    initTeachersPage();
}

