/* Enhanced Alumni Management Functionality */

// Sample alumni data
// Sample alumni data - Seeded if localStorage is empty
const SEED_ALUMNI = [
    {
        id: 'ALU-24000001',
        name: 'Robert Johnson',
        year: '2020',
        email: 'robert.j@alumni.embakwe.edu',
        phone: '+263 77 123 4567',
        profession: 'Software Engineer'
    }
];

function getAlumni() {
    let stored = getTenantData('school_alumni', 'null');
    if (!stored) {
        saveTenantData('school_alumni', SEED_ALUMNI);
        return SEED_ALUMNI;
    }
    return JSON.parse(stored);
}

function saveAlumni(data) {
    saveTenantData('school_alumni', data);
}

let alumni = getAlumni();
let alumniToDeleteId = null;

// Pagination State
let currentPage = 1;
const itemsPerPage = 10;
let filteredAlumni = [...alumni];

document.addEventListener('DOMContentLoaded', function () {
    const tableBody = document.getElementById('alumniTableBody');
    const searchInput = document.getElementById('alumniSearch');
    const yearFilter = document.getElementById('alumniYearFilter');
    const addForm = document.getElementById('addAlumniForm');
    const editForm = document.getElementById('editAlumniForm');
    const confirmDeleteBtn = document.getElementById('confirmDeleteAlumniBtn');

    // Initial Render
    renderAlumni(alumni);

    // Event Listeners
    if (searchInput) {
        searchInput.addEventListener('keyup', filterAlumni);
    }
    if (yearFilter) {
        yearFilter.addEventListener('change', filterAlumni);
    }
    if (addForm) {
        addForm.addEventListener('submit', handleAddSubmit);
    }
    if (editForm) {
        editForm.addEventListener('submit', handleEditSubmit);
    }
    if (confirmDeleteBtn) {
        confirmDeleteBtn.addEventListener('click', executeDelete);
    }
});

// Render alumni table
function renderAlumni(alumniToRender = filteredAlumni) {
    const tbody = document.getElementById('alumniTableBody');
    if (!tbody) return;

    tbody.innerHTML = '';

    // Update filtered list for pagination
    filteredAlumni = alumniToRender;

    // Calculate slice
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const paginatedData = filteredAlumni.slice(startIndex, endIndex);

    if (paginatedData.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" style="text-align:center; padding: 20px;">No alumni found</td></tr>';
        renderPagination(0);
        return;
    }

    paginatedData.forEach((alum) => {
        const names = alum.name.split(' ');
        let initials = '';
        if (names.length > 1) {
            initials = names[0][0] + names[names.length - 1][0];
        } else {
            initials = names[0].substring(0, 2);
        }
        initials = initials.toUpperCase();

        // Random color for avatar
        const colors = ['#007bff', '#28a745', '#dc3545', '#ffc107', '#17a2b8', '#6c757d'];
        const color = colors[alum.name.length % colors.length];

        const row = `
            <tr>
                <td>${alum.id}</td>
                <td>
                    <div class="alumni-info">
                        <div class="alumni-avatar" style="background-color: ${color}">${initials}</div>
                        <span>${alum.name}</span>
                    </div>
                </td>
                <td>${alum.year}</td>
                <td>${alum.email}</td>
                <td>${alum.phone}</td>
                <td>${alum.profession}</td>
                <td>
                    <div class="action-buttons">
                        <button class="btn-icon btn-view" onclick="viewAlumni('${alum.id}')" title="View Profile">
                            <i class="fas fa-eye"></i>
                        </button>
                        <button class="btn-icon btn-edit" onclick="editAlumni('${alum.id}')" title="Edit Alumni">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn-icon btn-delete" onclick="prepareDeleteAlumni('${alum.id}')" title="Delete Alumni">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `;
        tbody.innerHTML += row;
    });

    renderPagination(filteredAlumni.length);
}

function renderPagination(totalItems) {
    const container = document.getElementById('alumniPagination');
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
            renderAlumni();
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
            renderAlumni();
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
            renderAlumni();
        }
    };
    container.appendChild(nextBtn);
}

// Filter alumni
function filterAlumni() {
    const searchInput = document.getElementById('alumniSearch');
    const yearFilter = document.getElementById('alumniYearFilter');

    const searchTerm = searchInput ? searchInput.value.toLowerCase() : '';
    const selectedYear = yearFilter ? yearFilter.value : 'All Years';

    const filtered = alumni.filter(alum => {
        const matchesSearch = alum.name.toLowerCase().includes(searchTerm) ||
            alum.id.toLowerCase().includes(searchTerm) ||
            alum.email.toLowerCase().includes(searchTerm) ||
            alum.profession.toLowerCase().includes(searchTerm);

        const matchesYear = selectedYear === 'All Years' || alum.year === selectedYear;

        return matchesSearch && matchesYear;
    });

    currentPage = 1;
    renderAlumni(filtered);
}

// Add alumni
function handleAddSubmit(e) {
    e.preventDefault();

    const newAlum = {
        id: document.getElementById('newAlumniId').value || AppUtils.generateNextId(AppUtils.ID_PREFIX.ALUMNI),
        name: document.getElementById('newAlumniName').value,
        year: document.getElementById('newAlumniYear').value,
        email: document.getElementById('newAlumniEmail').value,
        phone: document.getElementById('newAlumniPhone').value,
        profession: document.getElementById('newAlumniProfession').value
    };

    // Check duplicate
    if (alumni.some(a => a.id === newAlum.id)) {
        if (typeof Toast !== 'undefined' && Toast.error) {
            Toast.error('Alumni ID already exists!');
        } else {
            alert('Alumni ID already exists!');
        }
        return;
    }

    alumni.push(newAlum);
    saveAlumni(alumni);
    filterAlumni();

    if (typeof closeModal === 'function') closeModal('addAlumniModal');
    document.getElementById('addAlumniForm').reset();

    if (typeof showSuccessMessage === 'function') {
        showSuccessMessage('Alumni added successfully');
    } else if (typeof Toast !== 'undefined' && Toast.success) {
        Toast.success('Alumni added successfully!');
    }
}

// View alumni
window.viewAlumni = function (id) {
    const alum = alumni.find(a => a.id === id);
    if (!alum) return;

    const names = alum.name.split(' ');
    let initials = '';
    if (names.length > 1) {
        initials = names[0][0] + names[names.length - 1][0];
    } else {
        initials = names[0].substring(0, 2);
    }
    initials = initials.toUpperCase();

    const content = document.getElementById('viewAlumniContent');
    content.innerHTML = `
        <div style="display: flex; align-items: center; margin-bottom: 20px;">
            <div style="width: 60px; height: 60px; border-radius: 50%; background-color: #007bff; color: white; display: flex; align-items: center; justify-content: center; font-size: 1.5rem; margin-right: 20px;">
                ${initials}
            </div>
            <div>
                <h4 style="margin: 0; font-size: 1.2rem;">${alum.name}</h4>
                <p style="margin: 0; color: #666;">${alum.profession}</p>
            </div>
        </div>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px;">
            <div><strong>Alumni ID:</strong> ${alum.id}</div>
            <div><strong>Graduation Year:</strong> ${alum.year}</div>
            <div><strong>Email:</strong> ${alum.email}</div>
            <div><strong>Phone:</strong> ${alum.phone}</div>
        </div>
    `;
    if (typeof openModal === 'function') openModal('viewAlumniModal');
};

// Edit alumni
window.editAlumni = function (id) {
    const alum = alumni.find(a => a.id === id);
    if (!alum) return;

    document.getElementById('editAlumniIdHidden').value = alum.id;
    document.getElementById('editAlumniName').value = alum.name;
    document.getElementById('editAlumniYear').value = alum.year;
    document.getElementById('editAlumniEmail').value = alum.email;
    document.getElementById('editAlumniPhone').value = alum.phone;
    document.getElementById('editAlumniProfession').value = alum.profession;

    if (typeof openModal === 'function') openModal('editAlumniModal');
};

function handleEditSubmit(e) {
    e.preventDefault();
    const id = document.getElementById('editAlumniIdHidden').value;
    const index = alumni.findIndex(a => a.id === id);

    if (index !== -1) {
        alumni[index].name = document.getElementById('editAlumniName').value;
        alumni[index].year = document.getElementById('editAlumniYear').value;
        alumni[index].email = document.getElementById('editAlumniEmail').value;
        alumni[index].phone = document.getElementById('editAlumniPhone').value;
        alumni[index].profession = document.getElementById('editAlumniProfession').value;

        saveAlumni(alumni);
        filterAlumni();
        if (typeof closeModal === 'function') closeModal('editAlumniModal');
        if (typeof showSuccessMessage === 'function') {
            showSuccessMessage('Alumni details updated successfully');
        } else if (typeof Toast !== 'undefined' && Toast.success) {
            Toast.success('Alumni updated successfully!');
        }
    }
}

// Delete Action
window.prepareDeleteAlumni = function (id) {
    alumniToDeleteId = id;
    if (typeof openModal === 'function') openModal('deleteAlumniModal');
};

function executeDelete() {
    if (alumniToDeleteId) {
        alumni = alumni.filter(a => a.id !== alumniToDeleteId);
        saveAlumni(alumni);
        filterAlumni();
        alumniToDeleteId = null;
        if (typeof closeModal === 'function') closeModal('deleteAlumniModal');
        if (typeof showSuccessMessage === 'function') {
            showSuccessMessage('Alumni record deleted successfully');
        } else if (typeof Toast !== 'undefined' && Toast.success) {
            Toast.success('Alumni deleted successfully!');
        }
    }
}

