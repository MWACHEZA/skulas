/* Analytics Page - Interactive Charts and Data Visualization */

// Helper to get data from localStorage (Interceptor handles partitioning)
function getLocalData(key) {
    // If admin-common.js is loaded, use getTenantData, otherwise fallback to global
    if (typeof getTenantData === 'function') {
        return getTenantData(key);
    }
    try {
        return getTenantData(key, '[]');
    } catch { return []; }
}

let analyticsData = {};
const charts = {};

function calculateAnalytics() {
    // Calculate real metrics from partitioned storage
    const students = getLocalData('school_students');
    const teachers = getLocalData('school_teachers');
    const admins = getLocalData('adminUsers');
    const librarians = getLocalData('school_librarians');
    const bursars = getLocalData('school_bursars');
    const ancillary = getLocalData('ancillaryStaff');
    const alumni = getLocalData('school_alumni');

    const allUsers = [...students, ...teachers, ...admins, ...librarians, ...bursars, ...ancillary, ...alumni];

    // Gender Distribution
    const maleCount = allUsers.filter(u => (u.gender || '').toLowerCase() === 'male').length;
    const femaleCount = allUsers.filter(u => (u.gender || '').toLowerCase() === 'female').length;
    const totalGendered = maleCount + femaleCount;

    // Registration Trend (Last 6 months)
    function getRegistrationTrend() {
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const currentMonth = new Date().getMonth();
        const labels = [];
        const data = [];

        for (let i = 5; i >= 0; i--) {
            const m = (currentMonth - i + 12) % 12;
            labels.push(months[m]);
            const count = allUsers.filter(u => {
                if (!u.createdAt) return false;
                const d = new Date(u.createdAt);
                return d.getMonth() === m;
            }).length;
            data.push(count);
        }
        return { labels, data };
    }

    const trend = getRegistrationTrend();

    analyticsData = {
        enrollment: {
            labels: trend.labels,
            data: trend.data.map((v, i, arr) => arr.slice(0, i + 1).reduce((a, b) => a + b, 0) + (students.length > 0 ? 0 : 240))
        },
        attendance: {
            present: 94, // Mock for now
            absent: 6
        },
        grades: {
            labels: ['A', 'B', 'C', 'D', 'E', 'F'],
            data: [25, 35, 20, 12, 6, 2]
        },
        revenue: {
            labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
            revenue: [125000, 130000, 128000, 135000, 140000, 145000],
            expenses: [95000, 98000, 97000, 102000, 105000, 108000]
        },
        kpis: {
            avgAttendance: 94,
            passRate: 87,
            studentTeacherRatio: teachers.length > 0 ? `${Math.round(students.length / teachers.length)}:1` : '0:1',
            feeCollectionRate: 92,
            activeClubs: 12,
            totalStudents: students.length,
            totalTeachers: teachers.length,
            totalRevenue: 803000
        },
        classPerformance: {
            labels: ['Form 1', 'Form 2', 'Form 3', 'Form 4', 'Lower Six', 'Upper Six'],
            avgScores: [72, 75, 78, 80, 82, 85]
        },
        subjectPerformance: {
            labels: ['Math', 'English', 'Science', 'History', 'Geography'],
            avgScores: [75, 82, 78, 80, 76]
        },
        gender: {
            male: maleCount || (students.length === 0 ? 145 : 0),
            female: femaleCount || (students.length === 0 ? 130 : 0),
            malePercentage: totalGendered > 0 ? (maleCount / totalGendered * 100) : 52.7,
            femalePercentage: totalGendered > 0 ? (femaleCount / totalGendered * 100) : 47.3
        },
        genderPerformance: {
            labels: ['Math', 'English', 'Science', 'History', 'Geography'],
            male: [73, 78, 76, 79, 74],
            female: [77, 86, 80, 81, 78]
        },
        classSubjectPerformance: {
            classes: ['Form 1', 'Form 2', 'Form 3', 'Form 4', 'L6', 'U6'],
            subjects: ['Math', 'English', 'Science', 'History', 'Geography'],
            data: {
                'Form 1': { Math: 68, English: 75, Science: 70, History: 72, Geography: 71 },
                'Form 2': { Math: 71, English: 78, Science: 73, History: 75, Geography: 74 },
                'Form 3': { Math: 75, English: 80, Science: 77, History: 78, Geography: 76 },
                'Form 4': { Math: 78, English: 82, Science: 80, History: 81, Geography: 79 },
                'L6': { Math: 80, English: 85, Science: 82, History: 83, Geography: 81 },
                'U6': { Math: 83, English: 88, Science: 85, History: 86, Geography: 84 }
            }
        },
        departmentRatios: {
            departments: ['Mathematics', 'Sciences', 'Languages', 'Humanities', 'Commercials', 'Technical'],
            students: [students.length, students.length, students.length, students.length, Math.round(students.length*0.6), Math.round(students.length*0.4)],
            teachers: [4, 5, 6, 4, 3, 3],
            ratios: ['69:1', '55:1', '46:1', '69:1', '60:1', '40:1']
        }
    };
}

// Initialize all charts
function initializeCharts() {
    calculateAnalytics();

    const createChart = (canvasId, config) => {
        const ctx = document.getElementById(canvasId);
        if (!ctx) return;
        if (charts[canvasId]) charts[canvasId].destroy();
        charts[canvasId] = new Chart(ctx, config);
        return charts[canvasId];
    };

    // Enrollment Chart
    createChart('enrollmentChart', {
        type: 'line',
        data: {
            labels: analyticsData.enrollment.labels,
            datasets: [{
                label: 'Total Students',
                data: analyticsData.enrollment.data,
                borderColor: '#0056b3',
                backgroundColor: 'rgba(0, 86, 179, 0.1)',
                tension: 0.4,
                fill: true
            }]
        },
        options: { responsive: true, maintainAspectRatio: false }
    });

    // Attendance Pie
    createChart('attendanceChart', {
        type: 'doughnut',
        data: {
            labels: ['Present', 'Absent'],
            datasets: [{
                data: [analyticsData.attendance.present, analyticsData.attendance.absent],
                backgroundColor: ['#28a745', '#dc3545']
            }]
        },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom' } } }
    });

    // Grades Bar
    createChart('gradesChart', {
        type: 'bar',
        data: {
            labels: analyticsData.grades.labels,
            datasets: [{
                label: 'Students %',
                data: analyticsData.grades.data,
                backgroundColor: ['#28a745', '#5cb85c', '#ffc107', '#ff9800', '#ff5722', '#dc3545']
            }]
        },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } }
    });

    // Revenue Chart
    createChart('revenueChart', {
        type: 'line',
        data: {
            labels: analyticsData.revenue.labels,
            datasets: [{
                label: 'Revenue',
                data: analyticsData.revenue.revenue,
                borderColor: '#28a745',
                fill: true
            }, {
                label: 'Expenses',
                data: analyticsData.revenue.expenses,
                borderColor: '#dc3545',
                fill: true
            }]
        },
        options: { responsive: true, maintainAspectRatio: false }
    });

    // Gender Doughnut
    createChart('genderChart', {
        type: 'doughnut',
        data: {
            labels: ['Male', 'Female'],
            datasets: [{
                data: [analyticsData.gender.male, analyticsData.gender.female],
                backgroundColor: ['#0056b3', '#e91e63']
            }]
        },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom' } } }
    });

    // Gender Performance
    createChart('genderPerformanceChart', {
        type: 'bar',
        data: {
            labels: analyticsData.genderPerformance.labels,
            datasets: [
                { label: 'Male', data: analyticsData.genderPerformance.male, backgroundColor: '#0056b3' },
                { label: 'Female', data: analyticsData.genderPerformance.female, backgroundColor: '#e91e63' }
            ]
        },
        options: { responsive: true, maintainAspectRatio: false }
    });

    updateKPIs();
}

function updateKPIs() {
    const kpis = analyticsData.kpis;
    const targets = {
        'kpi-attendance': kpis.avgAttendance + '%',
        'kpi-passrate': kpis.passRate + '%',
        'kpi-ratio': kpis.studentTeacherRatio,
        'kpi-fees': kpis.feeCollectionRate + '%',
        'kpi-clubs': kpis.activeClubs
    };
    Object.keys(targets).forEach(id => {
        const el = document.getElementById(id);
        if (el) el.textContent = targets[id];
    });
}

function exportAnalyticsData(format) {
    alert('Exporting data as ' + format.toUpperCase() + '...');
}

// Global init - wait for DOM AND AcadexCore
document.addEventListener('DOMContentLoaded', () => {
    // Check if AcadexCore is ready (it should be as it's loaded before)
    if (window.AcadexCore) {
        initializeCharts();
    } else {
        setTimeout(initializeCharts, 100);
    }
});

