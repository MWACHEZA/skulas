// Admin Grades Logic

const gradesData = {
    // Structure: Class -> Term -> Subjects[]
    'Form 1A': {
        'Term 1 - 2026': [
            { subject: 'Mathematics', average: 'B', a: 15, b: 40, c: 30, d: 10, f: 5 },
            { subject: 'English', average: 'A-', a: 35, b: 40, c: 20, d: 5, f: 0 },
            { subject: 'Science', average: 'B+', a: 20, b: 45, c: 25, d: 10, f: 0 }
        ],
        'Term 1 - 2025': [
            { subject: 'Mathematics', average: 'A', a: 40, b: 35, c: 15, d: 5, f: 5 },
            { subject: 'English', average: 'B', a: 20, b: 45, c: 25, d: 10, f: 0 },
            { subject: 'Science', average: 'A-', a: 30, b: 40, c: 20, d: 10, f: 0 }
        ],
        'Term 2 - 2024': [
            { subject: 'Mathematics', average: 'C+', a: 10, b: 30, c: 40, d: 15, f: 5 },
            { subject: 'English', average: 'B', a: 25, b: 35, c: 30, d: 10, f: 0 }
        ]
    },
    'Form 2B': {
        'Term 1 - 2026': [
            { subject: 'History', average: 'A', a: 50, b: 30, c: 15, d: 5, f: 0 },
            { subject: 'Geography', average: 'B+', a: 25, b: 45, c: 20, d: 10, f: 0 }
        ],
        'Term 1 - 2025': [
            { subject: 'History', average: 'B', a: 20, b: 40, c: 30, d: 10, f: 0 }
        ]
    },
    'Lower Six': {
        'Term 1 - 2026': [
            { subject: 'Physics', average: 'B', a: 20, b: 30, c: 30, d: 15, f: 5 },
            { subject: 'Chemistry', average: 'B+', a: 25, b: 35, c: 30, d: 10, f: 0 },
            { subject: 'Biology', average: 'A-', a: 35, b: 35, c: 20, d: 10, f: 0 }
        ],
        'Term 1 - 2025': [
            { subject: 'Physics', average: 'C+', a: 10, b: 25, c: 40, d: 20, f: 5 }
        ]
    }
};

document.addEventListener('DOMContentLoaded', function () {
    const classFilter = document.getElementById('gradeClassFilter');
    const termFilter = document.getElementById('gradeTermFilter');
    const grid = document.getElementById('gradesGrid');

    function renderGrades() {
        if (!grid) return;
        const selectedClass = classFilter ? classFilter.value : 'Form 1A';
        const selectedTerm = termFilter ? termFilter.value : 'Term 1 - 2026';

        grid.innerHTML = '';

        let data = [];
        if (selectedClass === 'All Classes') {
            // Combine all classes for this term (simplified for mock, just taking first match)
            const firstKey = Object.keys(gradesData)[0];
            data = gradesData[firstKey][selectedTerm] || [];
        } else {
            data = (gradesData[selectedClass] && gradesData[selectedClass][selectedTerm]) || [];
        }

        if (data.length === 0) {
            grid.innerHTML = '<p style="text-align:center; width:100%; grid-column: 1/-1;">No grades data found for this selection.</p>';
            return;
        }

        data.forEach(subject => {
            const card = document.createElement('div');
            card.className = 'subject-grades-card';
            card.innerHTML = `
                <div class="subject-header">
                    <div class="subject-name">${subject.subject}</div>
                    <div class="average-grade">${subject.average}</div>
                </div>
                <div class="grade-distribution">
                    ${renderBar('A (90-100%)', subject.a, 'grade-a')}
                    ${renderBar('B (80-89%)', subject.b, 'grade-b')}
                    ${renderBar('C (70-79%)', subject.c, 'grade-c')}
                    ${renderBar('D (60-69%)', subject.d, 'grade-d')}
                    ${renderBar('F (Below 60%)', subject.f, 'grade-f')}
                </div>
            `;
            grid.appendChild(card);
        });
    }

    function renderBar(label, percentage, colorClass) {
        return `
            <div class="grade-bar">
                <div class="grade-label">
                    <span>${label}</span>
                    <span>${percentage}%</span>
                </div>
                <div class="grade-progress">
                    <div class="grade-fill ${colorClass}" style="width: ${percentage}%"></div>
                </div>
            </div>
        `;
    }

    if (classFilter && termFilter) {
        classFilter.addEventListener('change', renderGrades);
        termFilter.addEventListener('change', renderGrades);
        renderGrades();
    }
});

