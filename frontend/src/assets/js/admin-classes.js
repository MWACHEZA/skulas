/* Comprehensive Classes Management System */

// Mock Data Structure with Attendance & Grades
// Seed data if localStorage is empty
const SEED_CLASSES = [
    {
        id: 'CLS-001',
        name: 'Form 1A',
        form: 'Form 1',
        classTeacher: 'Mr. Johnson',
        room: 'A101',
        subjects: ['Mathematics', 'English', 'Science', 'History'],
        totalStudents: 35,
        attendance: {
            today: { present: 32, absent: 3, date: new Date().toISOString().split('T')[0] },
            thisWeek: { present: 168, absent: 7, total: 175, rate: 96 },
            thisMonth: { present: 680, absent: 20, total: 700, rate: 97 }
        },
        grades: {
            averageGrade: 72.5,
            highestGrade: 95,
            lowestGrade: 45,
            passRate: 85,
            subjectPassRates: {
                'Mathematics': 78,
                'English': 88,
                'Science': 82,
                'History': 92
            },
            topPerformers: [
                { name: 'Alice Moyo', grade: 95 },
                { name: 'Brian Ncube', grade: 92 },
                { name: 'Catherine Dube', grade: 89 }
            ],
            averagePerformers: [
                { name: 'David Sibanda', grade: 73 },
                { name: 'Emma Ndlovu', grade: 72 },
                { name: 'Frank Mpofu', grade: 71 }
            ],
            lowestPerformers: [
                { name: 'Grace Khumalo', grade: 48 },
                { name: 'Henry Nkomo', grade: 46 },
                { name: 'Ivy Moyo', grade: 45 }
            ]
        }
    },
    {
        id: 'CLS-002',
        name: 'Form 1B',
        form: 'Form 1',
        classTeacher: 'Mrs. Williams',
        room: 'A102',
        subjects: ['Mathematics', 'English', 'Science', 'Geography'],
        totalStudents: 33,
        attendance: {
            today: { present: 30, absent: 3, date: new Date().toISOString().split('T')[0] },
            thisWeek: { present: 158, absent: 7, total: 165, rate: 95.8 },
            thisMonth: { present: 640, absent: 20, total: 660, rate: 97 }
        },
        grades: {
            averageGrade: 68.3,
            highestGrade: 91,
            lowestGrade: 42,
            passRate: 82,
            subjectPassRates: {
                'Mathematics': 75,
                'English': 85,
                'Science': 79,
                'Geography': 89
            },
            topPerformers: [
                { name: 'John Dube', grade: 91 },
                { name: 'Kelly Sibanda', grade: 88 },
                { name: 'Liam Ncube', grade: 85 }
            ],
            averagePerformers: [
                { name: 'Mary Khumalo', grade: 69 },
                { name: 'Nathan Moyo', grade: 68 },
                { name: 'Olivia Nkomo', grade: 67 }
            ],
            lowestPerformers: [
                { name: 'Peter Mpofu', grade: 45 },
                { name: 'Queen Ndlovu', grade: 43 },
                { name: 'Robert Dube', grade: 42 }
            ]
        }
    },
    {
        id: 'CLS-003',
        name: 'Form 2A',
        form: 'Form 2',
        classTeacher: 'Mr. Davis',
        room: 'B201',
        subjects: ['Mathematics', 'English', 'Physics', 'Chemistry'],
        totalStudents: 32,
        attendance: {
            today: { present: 31, absent: 1, date: new Date().toISOString().split('T')[0] },
            thisWeek: { present: 155, absent: 5, total: 160, rate: 96.9 },
            thisMonth: { present: 620, absent: 12, total: 632, rate: 98.1 }
        },
        grades: {
            averageGrade: 75.8,
            highestGrade: 96,
            lowestGrade: 48,
            passRate: 87,
            subjectPassRates: {
                'Mathematics': 82,
                'English': 90,
                'Physics': 80,
                'Chemistry': 85
            },
            topPerformers: [
                { name: 'Sarah Moyo', grade: 96 },
                { name: 'Tom Ncube', grade: 93 },
                { name: 'Uma Sibanda', grade: 90 }
            ],
            averagePerformers: [
                { name: 'Victor Dube', grade: 76 },
                { name: 'Wendy Khumalo', grade: 75 },
                { name: 'Xavier Nkomo', grade: 74 }
            ],
            lowestPerformers: [
                { name: 'Yolanda Mpofu', grade: 51 },
                { name: 'Zack Ndlovu', grade: 49 },
                { name: 'Amy Moyo', grade: 48 }
            ]
        }
    },
    {
        id: 'CLS-004',
        name: 'Form 3A',
        form: 'Form 3',
        classTeacher: 'Ms. Brown',
        room: 'C301',
        subjects: ['Mathematics', 'English', 'Biology', 'Chemistry', 'Physics'],
        totalStudents: 30,
        attendance: {
            today: { present: 28, absent: 2, date: new Date().toISOString().split('T')[0] },
            thisWeek: { present: 145, absent: 5, total: 150, rate: 96.7 },
            thisMonth: { present: 580, absent: 20, total: 600, rate: 96.7 }
        },
        grades: {
            averageGrade: 70.2,
            highestGrade: 94,
            lowestGrade: 44,
            passRate: 83,
            subjectPassRates: {
                'Mathematics': 77,
                'English': 86,
                'Biology': 81,
                'Chemistry': 79,
                'Physics': 75
            },
            topPerformers: [
                { name: 'Ben Sibanda', grade: 94 },
                { name: 'Clara Ncube', grade: 91 },
                { name: 'Daniel Moyo', grade: 88 }
            ],
            averagePerformers: [
                { name: 'Eva Dube', grade: 71 },
                { name: 'Fred Khumalo', grade: 70 },
                { name: 'Gina Nkomo', grade: 69 }
            ],
            lowestPerformers: [
                { name: 'Hugo Mpofu', grade: 47 },
                { name: 'Iris Ndlovu', grade: 45 },
                { name: 'Jack Moyo', grade: 44 }
            ]
        }
    },
    {
        id: 'CLS-005',
        name: 'Form 4B',
        form: 'Form 4',
        classTeacher: 'Dr. Smith',
        room: 'D401',
        subjects: ['Mathematics', 'English', 'Biology', 'Chemistry', 'Physics', 'Geography'],
        totalStudents: 28,
        attendance: {
            today: { present: 27, absent: 1, date: new Date().toISOString().split('T')[0] },
            thisWeek: { present: 135, absent: 5, total: 140, rate: 96.4 },
            thisMonth: { present: 540, absent: 20, total: 560, rate: 96.4 }
        },
        grades: {
            averageGrade: 77.5,
            highestGrade: 97,
            lowestGrade: 50,
            passRate: 89,
            subjectPassRates: {
                'Mathematics': 85,
                'English': 92,
                'Biology': 87,
                'Chemistry': 84,
                'Physics': 82,
                'Geography': 90
            },
            topPerformers: [
                { name: 'Linda Ncube', grade: 97 },
                { name: 'Mike Sibanda', grade: 94 },
                { name: 'Nina Moyo', grade: 91 }
            ],
            averagePerformers: [
                { name: 'Oscar Dube', grade: 78 },
                { name: 'Paula Khumalo', grade: 77 },
                { name: 'Quinn Nkomo', grade: 76 }
            ],
            lowestPerformers: [
                { name: 'Ryan Mpofu', grade: 53 },
                { name: 'Sophie Ndlovu', grade: 51 },
                { name: 'Tony Moyo', grade: 50 }
            ]
        }
    }
];

function getClasses() {
    if (typeof getTenantData === 'function') {
        return getTenantData('school_classes', JSON.stringify(SEED_CLASSES));
    }
    let stored = getTenantData('school_classes', 'null');
    if (!stored) {
        saveTenantData('school_classes', SEED_CLASSES);
        return SEED_CLASSES;
    }
    return JSON.parse(stored);
}

function saveClasses(data) {
    if (typeof saveTenantData === 'function') {
        saveTenantData('school_classes', data);
    } else {
        saveTenantData('school_classes', data);
    }
}

let classes = getClasses();

// Calculate overall statistics
function calculateOverallStats() {
    const totalClasses = classes.length;
    const totalStudents = classes.reduce((sum, cls) => sum + cls.totalStudents, 0);
    const presentToday = classes.reduce((sum, cls) => sum + cls.attendance.today.present, 0);
    const absentToday = classes.reduce((sum, cls) => sum + (cls.totalStudents - cls.attendance.today.present), 0);
    const overallAttendanceRate = totalStudents > 0 ? ((presentToday / totalStudents) * 100).toFixed(1) : "0.0";

    return {
        totalClasses,
        totalStudents,
        presentToday,
        absentToday,
        overallAttendanceRate
    };
}


// Render statistics cards
function renderStatistics() {
    const stats = calculateOverallStats();
    const statsContainer = document.getElementById('statsContainer');

    if (!statsContainer) return;

    statsContainer.innerHTML = `
        <div class="stat-card">
            <div class="stat-icon" style="background-color: rgba(0, 86, 179, 0.1); color: #0056b3;">
                <i class="fas fa-chalkboard"></i>
            </div>
            <div class="stat-info">
                <div class="stat-value">${stats.totalClasses}</div>
                <div class="stat-label">Total Classes</div>
            </div>
        </div>
        <div class="stat-card">
            <div class="stat-icon" style="background-color: rgba(40, 167, 69, 0.1); color: #28a745;">
                <i class="fas fa-users"></i>
            </div>
            <div class="stat-info">
                <div class="stat-value">${stats.totalStudents}</div>
                <div class="stat-label">Total Students</div>
            </div>
        </div>
        <div class="stat-card">
            <div class="stat-icon" style="background-color: rgba(23, 162, 184, 0.1); color: #17a2b8;">
                <i class="fas fa-user-check"></i>
            </div>
            <div class="stat-info">
                <div class="stat-value">${stats.presentToday}</div>
                <div class="stat-label">Present Today</div>
            </div>
        </div>
        <div class="stat-card">
            <div class="stat-icon" style="background-color: rgba(220, 53, 69, 0.1); color: #dc3545;">
                <i class="fas fa-user-times"></i>
            </div>
            <div class="stat-info">
                <div class="stat-value">${stats.absentToday}</div>
                <div class="stat-label">Absent Today</div>
            </div>
        </div>
        <div class="stat-card">
            <div class="stat-icon" style="background-color: rgba(255, 193, 7, 0.1); color: #ffc107;">
                <i class="fas fa-chart-line"></i>
            </div>
            <div class="stat-info">
                <div class="stat-value">${stats.overallAttendanceRate}%</div>
                <div class="stat-label">Attendance Rate</div>
            </div>
        </div>
    `;
}

// Render classes grid
function renderClasses(classesToRender = classes) {
    const container = document.getElementById('classesGrid');
    if (!container) return;

    container.innerHTML = '';

    if (classesToRender.length === 0) {
        container.innerHTML = '<p style="text-align:center; width:100%; padding: 40px; color: #999;">No classes found matching your criteria.</p>';
        return;
    }

    classesToRender.forEach(classItem => {
        const card = document.createElement('div');
        card.className = 'class-card';
        card.innerHTML = `
            <div class="class-header">
                <div class="class-name">${classItem.name}</div>
                <div class="class-icon">
                    <i class="fas fa-chalkboard"></i>
                </div>
            </div>
            <div class="class-info">
                <div class="info-item">
                    <span class="info-label">Class Teacher</span>
                    <span class="info-value">${classItem.classTeacher}</span>
                </div>
                <div class="info-item">
                    <span class="info-label">Total Students</span>
                    <span class="info-value">${classItem.totalStudents}</span>
                </div>
                <div class="info-item">
                    <span class="info-label">Room</span>
                    <span class="info-value">${classItem.room}</span>
                </div>
                <div class="info-item">
                    <span class="info-label">Attendance Today</span>
                    <span class="info-value" style="color: #28a745;">${classItem.attendance.today.present}/${classItem.totalStudents}</span>
                </div>
                <div class="info-item">
                    <span class="info-label">Attendance Rate</span>
                    <span class="info-value" style="color: #0056b3;">${((classItem.attendance.today.present / classItem.totalStudents) * 100).toFixed(1)}%</span>
                </div>
            </div>
            <div class="class-actions">
                <button class="btn btn-primary btn-small" onclick="viewClassDetails('${classItem.id}')">
                    <i class="fas fa-eye"></i> View Details
                </button>
                <button class="btn btn-secondary btn-small" onclick="editClass('${classItem.id}')">
                    <i class="fas fa-edit"></i> Edit
                </button>
                <button class="btn btn-danger btn-small" onclick="deleteClass('${classItem.id}')" style="background-color: #dc3545; color: white; padding: 8px 15px; border: none; border-radius: 5px; cursor: pointer; font-size: 0.85rem;">
                    <i class="fas fa-trash"></i> Delete
                </button>
            </div>
        `;
        container.appendChild(card);
    });
}

// ... (viewClassDetails, showAttendanceTab, editClass, etc. remain the same) ...

// Delete class
let classToDelete = null;

window.deleteClass = function (classId) {
    classToDelete = classId;
    openModal('deleteClassModal');
};

window.confirmDeleteClass = function () {
    if (classToDelete) {
        classes = classes.filter(c => c.id !== classToDelete);
        classToDelete = null;
        closeModal('deleteClassModal');
        renderClasses();
        renderStatistics();

        if (typeof Toast !== 'undefined') {
            Toast.success('Class deleted successfully!');
        } else {
            alert('Class deleted successfully!');
        }
    }
};

// Initialize
document.addEventListener('DOMContentLoaded', function () {
    renderStatistics();
    renderClasses();

    // Search and filter
    const searchInput = document.getElementById('classSearch');
    const formSelect = document.getElementById('formFilter');

    if (searchInput) searchInput.addEventListener('keyup', filterClasses);
    if (formSelect) formSelect.addEventListener('change', filterClasses);

    // Create class button
    const createBtn = document.querySelector('.btn-create-class');
    if (createBtn) {
        createBtn.addEventListener('click', () => openModal('createClassModal'));
    }

    // Delete confirmation button
    const confirmDeleteBtn = document.getElementById('confirmDeleteBtn');
    if (confirmDeleteBtn) {
        confirmDeleteBtn.addEventListener('click', confirmDeleteClass);
    }
});

