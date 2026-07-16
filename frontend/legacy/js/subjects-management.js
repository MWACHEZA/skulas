/* Subjects Management Functionality */

// Sample subjects data
let subjects = [
    {
        id: 1,
        name: 'Mathematics',
        teachers: 'Mr. Johnson, Ms. Davis',
        students: 245,
        classes: 8
    },
    {
        id: 2,
        name: 'English',
        teachers: 'Mrs. Smith, Mr. Brown',
        students: 245,
        classes: 8
    },
    {
        id: 3,
        name: 'Chemistry',
        teachers: 'Dr. Williams',
        students: 120,
        classes: 4
    },
    {
        id: 4,
        name: 'Physics',
        teachers: 'Prof. Anderson',
        students: 115,
        classes: 4
    },
    {
        id: 5,
        name: 'Biology',
        teachers: 'Dr. Martinez',
        students: 125,
        classes: 4
    },
    {
        id: 6,
        name: 'History',
        teachers: 'Mr. Taylor',
        students: 180,
        classes: 6
    }
];

// Render subjects grid
function renderSubjects(subjectsToRender = subjects) {
    const container = document.querySelector('.subjects-grid');
    if (!container) return;

    container.innerHTML = '';

    subjectsToRender.forEach((subject, index) => {
        const card = `
            <div class="subject-card">
                <div class="subject-icon">
                    <i class="fas fa-book"></i>
                </div>
                <h3>${subject.name}</h3>
                <div class="subject-stats">
                    <p><i class="fas fa-chalkboard-teacher"></i> ${subject.teachers}</p>
                    <p><i class="fas fa-users"></i> ${subject.students} Students</p>
                    <p><i class="fas fa-chalkboard"></i> ${subject.classes} Classes</p>
                </div>
                <div class="subject-actions">
                    <button class="btn btn-view" onclick="viewSubject(${index})">
                        <i class="fas fa-eye"></i> View Details
                    </button>
                    <button class="btn btn-edit" onclick="editSubject(${index})">
                        <i class="fas fa-edit"></i> Edit
                    </button>
                </div>
            </div>
        `;
        container.innerHTML += card;
    });
}

// Add new subject
function handleAddSubject(event) {
    event.preventDefault();

    const newSubject = {
        id: subjects.length + 1,
        name: document.getElementById('subjectName').value,
        teachers: document.getElementById('subjectTeachers').value,
        students: parseInt(document.getElementById('subjectStudents').value),
        classes: parseInt(document.getElementById('subjectClasses').value)
    };

    subjects.push(newSubject);
    renderSubjects();
    closeModal('addSubjectModal');
    document.getElementById('addSubjectForm').reset();
    showSuccessMessage('Subject added successfully!');
}

// View subject details
function viewSubject(index) {
    const subject = subjects[index];
    const detailsHtml = `
        <div style="line-height: 2;">
            <p><strong>Subject Name:</strong> ${subject.name}</p>
            <p><strong>Teachers:</strong> ${subject.teachers}</p>
            <p><strong>Total Students:</strong> ${subject.students}</p>
            <p><strong>Number of Classes:</strong> ${subject.classes}</p>
        </div>
    `;
    document.getElementById('subjectDetails').innerHTML = detailsHtml;
    openModal('viewSubjectModal');
}

// Edit subject
function editSubject(index) {
    const subject = subjects[index];
    document.getElementById('editSubjectIndex').value = index;
    document.getElementById('editSubjectName').value = subject.name;
    document.getElementById('editSubjectTeachers').value = subject.teachers;
    document.getElementById('editSubjectStudents').value = subject.students;
    document.getElementById('editSubjectClasses').value = subject.classes;
    openModal('editSubjectModal');
}

// Handle edit subject
function handleEditSubject(event) {
    event.preventDefault();

    const index = document.getElementById('editSubjectIndex').value;
    subjects[index] = {
        id: subjects[index].id,
        name: document.getElementById('editSubjectName').value,
        teachers: document.getElementById('editSubjectTeachers').value,
        students: parseInt(document.getElementById('editSubjectStudents').value),
        classes: parseInt(document.getElementById('editSubjectClasses').value)
    };

    renderSubjects();
    closeModal('editSubjectModal');
    showSuccessMessage('Subject updated successfully!');
}

// Search subjects
function searchSubjects() {
    const searchTerm = document.getElementById('searchInput')?.value.toLowerCase() || '';

    const filtered = subjects.filter(subject => {
        return subject.name.toLowerCase().includes(searchTerm) ||
            subject.teachers.toLowerCase().includes(searchTerm);
    });

    renderSubjects(filtered);
}

// Initialize subjects page
function initSubjectsPage() {
    renderSubjects();

    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.addEventListener('keyup', searchSubjects);
    }

    // Add Add New Subject button handler
    const addBtn = document.querySelector('.btn-primary');
    if (addBtn && addBtn.textContent.includes('Add New Subject')) {
        addBtn.setAttribute('onclick', "openModal('addSubjectModal')");
    }
}

// Auto-initialize if on subjects page
if (window.location.pathname.includes('subjects.html')) {
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initSubjectsPage);
    } else {
        initSubjectsPage();
    }
}

