/* Timetable Management Functionality - Shared across Admin, Student, and Teacher portals */

// School schedule structure
const SCHEDULE = {
    morning: { start: '07:30', lessons: 4, duration: 35, break: 15 },
    midMorning: { start: '10:15', lessons: 5, duration: 35, lunch: 60 },
    afternoon: { start: '14:00', lessons: 4, duration: 30 }
};

const CLASSES = [
    { id: 'F1A', name: 'Form 1A', level: 'Form 1' },
    { id: 'F1B', name: 'Form 1B', level: 'Form 1' },
    { id: 'F1C', name: 'Form 1C', level: 'Form 1' },
    { id: 'F2A', name: 'Form 2A', level: 'Form 2' },
    { id: 'F2B', name: 'Form 2B', level: 'Form 2' },
    { id: 'F2C', name: 'Form 2C', level: 'Form 2' },
    { id: 'F3A', name: 'Form 3A (Sciences)', level: 'Form 3' },
    { id: 'F3B', name: 'Form 3B (Commercials)', level: 'Form 3' },
    { id: 'F3C', name: 'Form 3C (Arts)', level: 'Form 3' },
    { id: 'F4A', name: 'Form 4A (Sciences)', level: 'Form 4' },
    { id: 'F4B', name: 'Form 4B (Commercials)', level: 'Form 4' },
    { id: 'F4C', name: 'Form 4C (Arts)', level: 'Form 4' },
    { id: 'L6S', name: 'Lower Six Sciences', level: 'Lower Six' },
    { id: 'L6C', name: 'Lower Six Commercials', level: 'Lower Six' },
    { id: 'L6A', name: 'Lower Six Arts', level: 'Lower Six' },
    { id: 'U6S', name: 'Upper Six Sciences', level: 'Upper Six' },
    { id: 'U6C', name: 'Upper Six Commercials', level: 'Upper Six' },
    { id: 'U6A', name: 'Upper Six Arts', level: 'Upper Six' }
];

// Load or initialize timetable data
function getTimetableData() {
    let data = getTenantData('school_timetable', null);
    
    if (!data) {
        data = {};
        CLASSES.forEach(cls => {
            data[cls.id] = { Monday: {}, Tuesday: {}, Wednesday: {}, Thursday: {}, Friday: {} };
        });

        // Initial sample data
        data['F1A'].Monday = {
            'Period 1': { subject: 'Mathematics', teacher: 'Mr. Johnson', room: 'Room 101' },
            'Period 2': { subject: 'English', teacher: 'Mrs. Smith', room: 'Room 102' }
        };
        saveTimetableData(data);
    }
    return data;
}

function saveTimetableData(data) {
    if (typeof saveTenantData === 'function') {
        saveTenantData('school_timetable', data);
    } else {
        saveTenantData('school_timetable', data);
    }
}

// Generate time slots
function generateTimeSlots() {
    const slots = [];
    let time = '07:30';

    // Morning
    for (let i = 1; i <= 4; i++) {
        slots.push({ period: `Period ${i}`, time: time, duration: 35, session: 'morning' });
        time = addMinutes(time, 35);
    }
    slots.push({ period: 'Break', time: time, duration: 15, session: 'break' });
    time = addMinutes(time, 15);

    // Mid-morning
    for (let i = 5; i <= 9; i++) {
        slots.push({ period: `Period ${i}`, time: time, duration: 35, session: 'midMorning' });
        time = addMinutes(time, 35);
    }
    slots.push({ period: 'Lunch', time: time, duration: 60, session: 'lunch' });
    time = addMinutes(time, 60);

    // Afternoon
    for (let i = 10; i <= 13; i++) {
        slots.push({ period: `Period ${i}`, time: time, duration: 30, session: 'afternoon' });
        time = addMinutes(time, 30);
    }
    return slots;
}

function addMinutes(time, minutes) {
    const [hours, mins] = time.split(':').map(Number);
    const totalMins = hours * 60 + mins + minutes;
    return `${String(Math.floor(totalMins / 60)).padStart(2, '0')}:${String(totalMins % 60).padStart(2, '0')}`;
}

// Global state
let currentClass = 'F1A';

/**
 * Render Timetable
 */
window.renderTimetable = function (config = { type: 'admin', target: 'F1A' }) {
    const container = document.querySelector('.timetable-grid') || document.querySelector('.card-body');
    if (!container) {
        console.warn('Timetable container not found, retrying in 100ms...');
        setTimeout(() => window.renderTimetable(config), 100);
        return;
    }

    const data = getTimetableData();
    const timeSlots = generateTimeSlots();
    const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

    let html = `
        <table class="timetable-table">
            <thead>
                <tr>
                    <th>Time</th>
                    <th>Period</th>
                    ${days.map(day => `<th>${day}</th>`).join('')}
                </tr>
            </thead>
            <tbody>
    `;

    timeSlots.forEach(slot => {
        if (slot.session === 'break' || slot.session === 'lunch') {
            html += `
                <tr class="break-row">
                    <td>${slot.time}</td>
                    <td colspan="6" class="break-cell">${slot.period}</td>
                </tr>
            `;
        } else {
            const endTime = addMinutes(slot.time, slot.duration);
            html += `
                <tr>
                    <td class="time-cell">${slot.time} - ${endTime}</td>
                    <td class="period-cell">${slot.period}</td>
                    ${days.map(day => {
                let lesson = null;
                if (config.type === 'teacher') {
                    for (const clsId in data) {
                        if (data[clsId][day]?.[slot.period]?.teacher === config.target) {
                            lesson = { ...data[clsId][day][slot.period], className: clsId };
                            break;
                        }
                    }
                } else {
                    lesson = data[config.target]?.[day]?.[slot.period];
                }

                if (lesson) {
                    const onclick = config.type === 'admin' ? `onclick="editLesson('${day}', '${slot.period}')"` : '';
                    return `
                                <td class="lesson-cell" ${onclick}>
                                    <div class="lesson-subject">${lesson.subject}</div>
                                    <div class="lesson-teacher">${config.type === 'teacher' ? 'Class: ' + lesson.className : lesson.teacher}</div>
                                    <div class="lesson-room">${lesson.room}</div>
                                </td>
                            `;
                } else {
                    const onclick = config.type === 'admin' ? `onclick="editLesson('${day}', '${slot.period}')"` : '';
                    return `<td class="empty-cell" ${onclick}> ${config.type === 'admin' ? '<span class="add-lesson">+ Add</span>' : '-'} </td>`;
                }
            }).join('')}
                </tr>
            `;
        }
    });

    html += '</tbody></table>';
    container.innerHTML = html;
};

// Admin UI Helpers
window.editLesson = function (day, period) {
    const data = getTimetableData();
    const lesson = data[currentClass]?.[day]?.[period] || {};

    const fields = {
        editDay: day,
        editPeriod: period,
        editSubject: lesson.subject || '',
        editTeacher: lesson.teacher || '',
        editRoom: lesson.room || ''
    };

    for (const id in fields) {
        const el = document.getElementById(id);
        if (el) el.value = fields[id];
    }

    if (window.openModal) openModal('editLessonModal');
};

window.handleEditLesson = function (event) {
    if (event) event.preventDefault();
    const data = getTimetableData();
    const day = document.getElementById('editDay').value;
    const period = document.getElementById('editPeriod').value;

    data[currentClass][day][period] = {
        subject: document.getElementById('editSubject').value,
        teacher: document.getElementById('editTeacher').value,
        room: document.getElementById('editRoom').value
    };

    saveTimetableData(data);
    window.renderTimetable({ type: 'admin', target: currentClass });
    if (window.closeModal) closeModal('editLessonModal');
    if (window.showSuccessMessage) showSuccessMessage('Timetable updated!');
};

window.deleteCurrentLesson = function () {
    if (!confirm('Delete this lesson?')) return;
    const data = getTimetableData();
    const day = document.getElementById('editDay').value;
    const period = document.getElementById('editPeriod').value;

    if (data[currentClass][day]) {
        delete data[currentClass][day][period];
        saveTimetableData(data);
        window.renderTimetable({ type: 'admin', target: currentClass });
        if (window.closeModal) closeModal('editLessonModal');
    }
};

// Initialization Logic
function initApp() {
    const path = window.location.pathname;

    if (path.includes('timetable-management.html')) {
        const selector = document.getElementById('classSelector');
        if (selector) {
            selector.innerHTML = '';
            CLASSES.forEach(cls => {
                const opt = document.createElement('option');
                opt.value = cls.id;
                opt.textContent = cls.name;
                selector.appendChild(opt);
            });
            selector.value = currentClass;
            selector.addEventListener('change', (e) => {
                currentClass = e.target.value;
                const info = document.querySelector('.current-class-info');
                if (info) info.innerHTML = `<h3>Timetable for: ${e.target.options[e.target.selectedIndex].text}</h3>`;
                window.renderTimetable({ type: 'admin', target: currentClass });
            });

            // Set initial info
            const info = document.querySelector('.current-class-info');
            if (info) info.innerHTML = `<h3>Timetable for: ${CLASSES[0].name}</h3>`;
        }
        window.renderTimetable({ type: 'admin', target: currentClass });
    } else if (path.includes('student/timetable.html')) {
        const studentClass = getTenantData('studentClass', 'null') || 'F1A';
        window.renderTimetable({ type: 'student', target: studentClass });
    } else if (path.includes('teacher/timetable.html')) {
        const teacherName = getTenantData('teacherName', 'null') || 'Mr. Johnson';
        window.renderTimetable({ type: 'teacher', target: teacherName });
    }
}

// Run init
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initApp);
} else {
    // Small delay to allow page-enhancer to inject elements if needed
    setTimeout(initApp, 50);
}

