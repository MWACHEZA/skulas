/* Classes Management Functionality */

// Sample classes data
let classes = [
    {
        id: 1,
        name: 'Form 1A',
        students: 32,
        teacher: 'Mrs. Johnson',
        room: 'Room 101',
        form: 'Form 1'
    },
    {
        id: 2,
        name: 'Form 2B',
        students: 28,
        teacher: 'Mr. Williams',
        room: 'Room 205',
        form: 'Form 2'
    },
    {
        id: 3,
        name: 'Form 3A',
        students: 30,
        teacher: 'Ms. Davis',
        room: 'Room 301',
        form: 'Form 3'
    },
    {
        id: 4,
        name: 'Form 4A',
        students: 25,
        teacher: 'Dr. Smith',
        room: 'Room 401',
        form: 'Form 4'
    },
    {
        id: 5,
        name: 'Lower Six Sciences',
        students: 15,
        teacher: 'Mr. Newton',
        room: 'Lab 3',
        form: 'Lower Six'
    },
    {
        id: 6,
        name: 'Upper Six Arts',
        students: 18,
        teacher: 'Mrs. Shona',
        room: 'A102',
        form: 'Upper Six'
    }
];

// Render classes grid
function renderClasses(classesToRender = classes) {
    const container = document.querySelector('.classes-grid');
    if (!container) return;

    container.innerHTML = '';

    if (classesToRender.length === 0) {
        container.innerHTML = '<p style="text-align:center; width:100%;">No classes found matching your criteria.</p>';
        return;
    }

    classesToRender.forEach((classItem, index) => {
        const card = `
            <div class="class-card">
                <div class="class-header">
                    <h3>${classItem.name}</h3>
                    <span class="student-count">${classItem.students} Students</span>
                </div>
                <div class="class-details">
                    <p><i class="fas fa-chalkboard-teacher"></i> ${classItem.teacher}</p>
                    <p><i class="fas fa-door-open"></i> ${classItem.room}</p>
                </div>
                <div class="class-actions">
                    <button class="btn btn-view" onclick="viewClass(${classItem.id})" title="View Details">
                        <i class="fas fa-eye"></i> View Details
                    </button>
                    <button class="btn btn-edit" onclick="editClass(${classItem.id})" title="Edit Class">
                        <i class="fas fa-edit"></i> Edit
                    </button>
                </div>
            </div>
        `;
        container.innerHTML += card;
    });
}

// Filter classes
function filterClasses() {
    const searchTerm = document.querySelector('.search-box input')?.value.toLowerCase() || '';
    const formFilter = document.querySelector('.search-filter select')?.value || 'All Forms';

    const filtered = classes.filter(classItem => {
        const matchesSearch = classItem.name.toLowerCase().includes(searchTerm) ||
            classItem.teacher.toLowerCase().includes(searchTerm) ||
            classItem.room.toLowerCase().includes(searchTerm);

        const matchesForm = formFilter === 'All Forms' || classItem.form === formFilter;

        return matchesSearch && matchesForm;
    });

    renderClasses(filtered);
}

// Add new class placeholder
function handleAddClass(event) {
    if (event) event.preventDefault();
    showSuccessMessage('Create Class feature coming soon!');
}

// View class details
window.viewClass = function (id) {
    const classItem = classes.find(c => c.id === id);
    if (classItem) showSuccessMessage(`Viewing details for ${classItem.name}`);
}

// Edit class
window.editClass = function (id) {
    const classItem = classes.find(c => c.id === id);
    if (classItem) showSuccessMessage(`Editing ${classItem.name}`);
}

// Initialize classes page
function initClassesPage() {
    renderClasses();

    const searchInput = document.querySelector('.search-box input');
    const formSelect = document.querySelector('.search-filter select');

    if (searchInput) searchInput.addEventListener('keyup', filterClasses);
    if (formSelect) formSelect.addEventListener('change', filterClasses);

    // Add Create New Class button handler if generic button exists
    const createBtn = document.querySelector('.page-actions .btn-primary');
    if (createBtn) {
        createBtn.onclick = handleAddClass;
    }
}

// Auto-initialize
if (document.querySelector('.classes-grid')) {
    initClassesPage();
}

