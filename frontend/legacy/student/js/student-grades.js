/* Student Grades Logic */

document.addEventListener('DOMContentLoaded', function () {
    // Check if user is logged in
    if (!sessionStorage.getItem('studentLoggedIn')) {
        window.location.href = 'login.html';
        return;
    }

    const activeStudentId = sessionStorage.getItem('studentId') || "STU-2024-001";
    document.getElementById('studentName').textContent = sessionStorage.getItem('studentName') || ("Student #" + activeStudentId);

    // ==========================================
    // Mock Data for historical terms
    // ==========================================
    const mockGrades = {
        'term1': [
            { subject: 'Mathematics', teacher: 'Mr. Johnson', assignments: '82%', tests: '75%', midterm: '78%', final: '80%', overall: '79%', grade: 'B+', gradeClass: 'good' },
            { subject: 'English Language', teacher: 'Mrs. Smith', assignments: '85%', tests: '82%', midterm: '88%', final: '85%', overall: '85%', grade: 'A', gradeClass: 'excellent' }
        ],
        'term2': [
            { subject: 'Mathematics', teacher: 'Mr. Johnson', assignments: '85%', tests: '78%', midterm: '82%', final: '80%', overall: '81%', grade: 'A-', gradeClass: 'excellent' }
        ]
    };

    // ==========================================
    // Dynamic Report Logic
    // ==========================================

    function checkAndRenderReport() {
        const publishedReports = JSON.parse(getTenantData('publishedReports', 'null')) || {};
        const term = "Term 1 2025"; // Current term context
        const reportId = `${activeStudentId}_${term}`;
        const reportData = publishedReports[reportId];

        const pendingMsg = document.getElementById('reportPendingMessage');
        const activeCard = document.getElementById('activeReportCard');
        const printBtn = document.getElementById('printReportBtn');

        if (reportData) {
            if (pendingMsg) pendingMsg.style.display = 'none';
            if (activeCard) activeCard.style.display = 'block';
            if (printBtn) printBtn.style.display = 'block';
            renderPublishedReport(term, reportData);
        } else {
            if (pendingMsg) pendingMsg.style.display = 'block';
            if (activeCard) activeCard.style.display = 'none';
            if (printBtn) printBtn.style.display = 'none';
        }
    }

    function renderPublishedReport(term, report) {
        if (document.getElementById('reportTermHeader')) document.getElementById('reportTermHeader').textContent = term;
        if (document.getElementById('rStudentName')) document.getElementById('rStudentName').textContent = sessionStorage.getItem('studentName') || "John Doe";
        if (document.getElementById('rStudentID')) document.getElementById('rStudentID').textContent = activeStudentId;

        const allGrades = JSON.parse(getTenantData('studentGrades', 'null')) || {};
        const tbody = document.getElementById('reportItemsBody');
        if (!tbody) return;
        tbody.innerHTML = '';

        const className = sessionStorage.getItem('studentClass') || "Form 4A";
        const isALevel = className.includes('Six');
        const subjectsData = JSON.parse(getTenantData('officialSubjects', 'null')) || { junior: [], alevel: [] };
        const subjectsList = isALevel ? subjectsData.alevel : subjectsData.junior;

        subjectsList.forEach(subject => {
            const key = `${activeStudentId}_${term}_${subject}`;
            const data = allGrades[key] || { termMark: '-', examMark: '-', symbol: '-', comments: '' };

            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td style="font-weight: 500;">${subject}</td>
                <td style="text-align: center;">${data.termMark || '-'}</td>
                <td style="text-align: center;">${data.examMark || '-'}</td>
                <td style="text-align: center;"><span class="letter-grade ${getGradeClass(data.symbol)}">${data.symbol || '-'}</span></td>
                <td>${data.comments || 'No specific remarks.'}</td>
            `;
            tbody.appendChild(tr);
        });

        if (document.getElementById('rClassTeacherComment'))
            document.getElementById('rClassTeacherComment').textContent = report.remarks || report.classTeacherRemarks || "Satisfactory progress this term.";
        if (document.getElementById('rClassTeacherName'))
            document.getElementById('rClassTeacherName').textContent = report.by || report.publishedBy || "Class Teacher";
    }

    function getGradeClass(symbol) {
        if (['A', '1', '2'].includes(symbol)) return 'excellent';
        if (['B', '3', '4'].includes(symbol)) return 'good';
        if (['C', '5', '6'].includes(symbol)) return 'average';
        if (['F', '9'].includes(symbol)) return 'poor';
        return '';
    }

    // ==========================================
    // UI Handlers
    // ==========================================

    function renderGrades(term) {
        const tbody = document.getElementById('currentGradesBody');
        if (!tbody) return;
        const data = mockGrades[term] || [];
        tbody.innerHTML = data.map(row => `
            <tr>
                <td class="subject">${row.subject}</td>
                <td>${row.teacher}</td>
                <td>${row.assignments}</td>
                <td>${row.tests}</td>
                <td>${row.midterm}</td>
                <td>${row.final}</td>
                <td>${row.overall}</td>
                <td class="grade ${row.gradeClass}">${row.grade}</td>
            </tr>
        `).join('') || '<tr><td colspan="8" style="text-align:center;">No records for this term</td></tr>';
    }

    // Tab switch logic
    const tabItems = document.querySelectorAll('.tab-item');
    const tabContents = document.querySelectorAll('.tab-content');

    tabItems.forEach(item => {
        item.addEventListener('click', function () {
            tabItems.forEach(tab => tab.classList.remove('active'));
            tabContents.forEach(content => content.classList.remove('active'));
            this.classList.add('active');
            const tabId = this.getAttribute('data-tab');
            document.getElementById(tabId).classList.add('active');
            if (tabId === 'report-card') checkAndRenderReport();
        });
    });

    const termSelect = document.getElementById('term-select');
    if (termSelect) {
        termSelect.addEventListener('change', (e) => renderGrades(e.target.value));
        renderGrades(termSelect.value);
    }

    // Sidebar & Mobile Menu
    const menuToggle = document.getElementById('menuToggle');
    const sidebar = document.getElementById('sidebar');
    const sidebarOverlay = document.createElement('div');
    sidebarOverlay.className = 'sidebar-overlay';
    document.body.appendChild(sidebarOverlay);

    if (menuToggle) {
        menuToggle.addEventListener('click', () => {
            sidebar.classList.toggle('active');
            sidebarOverlay.classList.toggle('active');
        });
    }
    sidebarOverlay.addEventListener('click', () => {
        sidebar.classList.remove('active');
        sidebarOverlay.classList.remove('active');
    });

    // Logout
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', (e) => {
            e.preventDefault();
            sessionStorage.removeItem('studentLoggedIn');
            window.location.href = 'login.html';
        });
    }

    // Print
    const printBtn = document.getElementById('printReportBtn');
    if (printBtn) printBtn.addEventListener('click', () => window.print());

    // Final sanity check for initial load
    if (document.querySelector('.tab-item.active').getAttribute('data-tab') === 'report-card') {
        checkAndRenderReport();
    }
});

