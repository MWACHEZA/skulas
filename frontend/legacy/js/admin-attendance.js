// Admin Attendance Logic

const attendanceData = {
    'Today': [
        { className: 'Form 1A', total: 32, present: 30, absent: 2, rate: 94 },
        { className: 'Form 1B', total: 30, present: 29, absent: 1, rate: 97 },
        { className: 'Form 2A', total: 28, present: 25, absent: 3, rate: 89 },
        { className: 'Form 2B', total: 28, present: 27, absent: 1, rate: 96 },
        { className: 'Form 3A', total: 30, present: 28, absent: 2, rate: 93 },
        { className: 'Form 4A', total: 26, present: 25, absent: 1, rate: 96 },
        { className: 'Lower Six Sciences', total: 15, present: 14, absent: 1, rate: 93 },
        { className: 'Upper Six Arts', total: 18, present: 18, absent: 0, rate: 100 }
    ],
    'This Week': [
        { className: 'Form 1A', total: 32, present: 31, absent: 1, rate: 97 },
        { className: 'Form 1B', total: 30, present: 28, absent: 2, rate: 93 },
        { className: 'Form 2A', total: 28, present: 26, absent: 2, rate: 92 },
        { className: 'Form 2B', total: 28, present: 27, absent: 1, rate: 96 },
        { className: 'Form 3A', total: 30, present: 29, absent: 1, rate: 97 },
        { className: 'Form 4A', total: 26, present: 24, absent: 2, rate: 92 },
        { className: 'Lower Six Sciences', total: 15, present: 15, absent: 0, rate: 100 },
        { className: 'Upper Six Arts', total: 18, present: 17, absent: 1, rate: 94 }
    ],
    'This Month': [
        { className: 'Form 1A', total: 32, present: 30, absent: 2, rate: 94 },
        { className: 'Form 1B', total: 30, present: 29, absent: 1, rate: 96 },
        { className: 'Form 2A', total: 28, present: 26, absent: 2, rate: 92 },
        { className: 'Form 2B', total: 28, present: 27, absent: 1, rate: 96 },
        { className: 'Form 3A', total: 30, present: 28, absent: 2, rate: 93 },
        { className: 'Form 4A', total: 26, present: 25, absent: 1, rate: 96 },
        { className: 'Lower Six Sciences', total: 15, present: 14, absent: 1, rate: 93 },
        { className: 'Upper Six Arts', total: 18, present: 17, absent: 1, rate: 94 }
    ]
};

document.addEventListener('DOMContentLoaded', function () {
    const periodFilter = document.getElementById('attendancePeriodFilter');
    const grid = document.getElementById('attendanceGrid');

    function renderAttendance(period) {
        if (!grid) return;
        grid.innerHTML = '';

        const data = attendanceData[period] || [];

        data.forEach(item => {
            const card = document.createElement('div');
            card.className = 'class-attendance-card';
            card.innerHTML = `
                <div class="class-name">${item.className}</div>
                <div class="attendance-stats">
                    <div class="stat-row">
                        <span class="stat-label">Total Students</span>
                        <span class="stat-number">${item.total}</span>
                    </div>
                    <div class="stat-row">
                        <span class="stat-label">Present</span>
                        <span class="stat-number present">${item.present}</span>
                    </div>
                    <div class="stat-row">
                        <span class="stat-label">Absent</span>
                        <span class="stat-number absent">${item.absent}</span>
                    </div>
                </div>
                <div class="attendance-percentage">
                    <div class="percentage-value">${item.rate}%</div>
                    <div class="percentage-label">Attendance Rate</div>
                </div>
            `;
            grid.appendChild(card);
        });
    }

    if (periodFilter) {
        periodFilter.addEventListener('change', function () {
            renderAttendance(this.value);
            if (typeof showSuccessMessage === 'function') {
                // Optional: feedback
            }
        });

        // Initial render
        renderAttendance(periodFilter.value);
    } else {
        // Fallback default
        renderAttendance('Today');
    }
});

