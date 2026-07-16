// Unified Application Management Logic
let allApplications = [];
let currentPage = 1;
const itemsPerPage = 10;
let filteredApplications = [];

document.addEventListener('DOMContentLoaded', function () {
    loadApplications();
    setupEventListeners();
});

function loadApplications() {
    allApplications = getTenantData('school_applications', '[]');

    // Deduplication and normalization
    const uniqueApps = new Map();
    allApplications.forEach(app => {
        const id = app.id || app.applicationId;
        if (!id) return;
        if (!uniqueApps.has(id)) {
            uniqueApps.set(id, app);
        } else {
            const existing = uniqueApps.get(id);
            const existingDate = new Date(existing.actionDate || existing.submittedDate || 0);
            const currentDate = new Date(app.actionDate || app.submittedDate || 0);
            if (currentDate > existingDate) {
                uniqueApps.set(id, app);
            }
        }
    });

    allApplications = Array.from(uniqueApps.values());

    // Normalize
    allApplications = allApplications.map(app => {
        if (!app.id && app.applicationId) app.id = app.applicationId;
        
        if (app.type) {
            const t = app.type.toLowerCase().replace(/[\s-]/g, '');
            if (t === 'alevel') app.type = 'A-Level';
            else if (t === 'form1') app.type = 'Form 1';
            else if (t === 'transfer') app.type = 'Transfer';
        }
        
        if (!app.status) app.status = 'Pending';
        if (!app.details) app.details = {};
        return app;
    });

    saveTenantData('school_applications', allApplications);
    renderApplicationsTable();
    updateStats();
}

function updateStats() {
    const stats = {
        total: allApplications.length,
        pending: allApplications.filter(a => a.status === 'Pending').length,
        approved: allApplications.filter(a => a.status === 'Approved').length,
        rejected: allApplications.filter(a => a.status === 'Rejected').length,
        interview: allApplications.filter(a => a.status === 'Interview Scheduled').length
    };

    const setVal = (id, val) => {
        const el = document.getElementById(id);
        if (el) el.textContent = val;
    };

    setVal('totalApps', stats.total);
    setVal('pendingApps', stats.pending);
    setVal('approvedApps', stats.approved);
    setVal('rejectedApps', stats.rejected);
}

function renderApplicationsTable() {
    const tableBody = document.getElementById('applicationsTableBody');
    if (!tableBody) return;

    tableBody.innerHTML = '';

    const typeFilter = document.getElementById('typeFilter')?.value || 'all';
    const statusFilter = document.getElementById('statusFilter')?.value || 'all';
    const searchTerm = (document.getElementById('appSearch')?.value || '').toLowerCase();

    filteredApplications = allApplications.filter(app => {
        const matchesType = typeFilter === 'all' || app.type === typeFilter;
        const matchesStatus = statusFilter === 'all' || app.status === statusFilter;
        const appId = app.id || '';
        const matchesSearch = !searchTerm ||
            (app.fullName || '').toLowerCase().includes(searchTerm) ||
            appId.toLowerCase().includes(searchTerm);

        return matchesType && matchesStatus && matchesSearch;
    });

    const startIndex = (currentPage - 1) * itemsPerPage;
    const paginatedData = filteredApplications.slice(startIndex, startIndex + itemsPerPage);

    if (paginatedData.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="7" style="text-align: center; padding: 20px;">No applications found.</td></tr>';
        renderPagination(0);
        return;
    }

    paginatedData.forEach(app => {
        const row = document.createElement('tr');
        let typeClass = 'type-f1';
        if (app.type === 'A-Level') typeClass = 'type-al';
        if (app.type === 'Transfer') typeClass = 'type-tr';
        
        const statusClass = getStatusClass(app.status);
        const submittedDate = app.submittedDate ? new Date(app.submittedDate).toLocaleDateString() : 'N/A';

        row.innerHTML = `
            <td><strong>${app.id}</strong></td>
            <td><span class="type-badge ${typeClass}">${app.type}</span></td>
            <td>${app.fullName}</td>
            <td>${getDetailSnippet(app)}</td>
            <td><span class="badge ${statusClass}">${app.status}</span></td>
            <td>${submittedDate}</td>
            <td>
                <button class="btn-sm bg-primary" onclick="viewApplication('${app.id}')"><i class="fas fa-eye"></i></button>
            </td>
        `;
        tableBody.appendChild(row);
    });

    renderPagination(filteredApplications.length);
}

function renderPagination(totalItems) {
    const container = document.getElementById('appPagination');
    if (!container) return;
    const totalPages = Math.ceil(totalItems / itemsPerPage);
    container.innerHTML = '';
    if (totalPages <= 1) return;

    for (let i = 1; i <= totalPages; i++) {
        const pageBtn = document.createElement('button');
        pageBtn.innerText = i;
        pageBtn.className = i === currentPage ? 'btn-pagination active' : 'btn-pagination';
        pageBtn.onclick = () => { currentPage = i; renderApplicationsTable(); };
        container.appendChild(pageBtn);
    }
}

function getStatusClass(status) {
    switch (status.toLowerCase()) {
        case 'pending': return 'bg-warning';
        case 'approved': return 'bg-success';
        case 'rejected': return 'bg-danger';
        default: return 'bg-info';
    }
}

function getDetailSnippet(app) {
    if (!app.details) return 'N/A';
    if (app.type === 'Form 1') return app.details.primarySchool || 'N/A';
    if (app.type === 'A-Level') return app.details.oLevelSchool || 'N/A';
    if (app.type === 'Transfer') return `From: ${app.details.currentSchool} (${app.details.requestedClass})`;
    return 'N/A';
}

function filterApplications() {
    currentPage = 1;
    renderApplicationsTable();
}

function setupEventListeners() {
    const search = document.getElementById('appSearch');
    if (search) search.addEventListener('input', filterApplications);
}

function viewApplication(appId) {
    const app = allApplications.find(a => a.id === appId);
    if (!app) return;

    const modal = document.getElementById('appDetailsModal');
    const body = document.getElementById('modalBody');
    const actions = document.getElementById('decisionActions');
    const closeBtn = document.getElementById('closeAction');

    // Reset UI
    actions.style.display = (['Pending', 'In Review', 'Interview Scheduled'].includes(app.status)) ? 'block' : 'none';
    closeBtn.style.display = actions.style.display === 'none' ? 'block' : 'none';
    document.getElementById('interviewForm').style.display = 'none';

    let content = `
        <div class="detail-section">
            <h4>Applicant: ${app.fullName}</h4>
            <p><strong>Email:</strong> ${app.email}</p>
            <p><strong>Type:</strong> ${app.type}</p>
            <p><strong>ID:</strong> ${app.id}</p>
            <p><strong>Status:</strong> ${app.status}</p>
        </div>
    `;

    if (app.type === 'Form 1') {
        content += `
            <div class="detail-section">
                <h4>Academic Details</h4>
                <p><strong>Primary School:</strong> ${app.details.primarySchool}</p>
                <p><strong>Results:</strong> M:${app.details.results.maths}, E:${app.details.results.english}, G:${app.details.results.general}, L:${app.details.results.language}</p>
            </div>
        `;
    } else if (app.type === 'A-Level') {
        const results = (app.details.oLevelResults || []).map(r => `<li>${r.subject}: ${r.grade}</li>`).join('');
        content += `
            <div class="detail-section">
                <h4>A-Level Details</h4>
                <p><strong>Previous School:</strong> ${app.details.oLevelSchool}</p>
                <ul>${results}</ul>
                <p><strong>Preferred:</strong> ${app.details.preferredSubjects}</p>
            </div>
        `;
    } else if (app.type === 'Transfer') {
        content += `
            <div class="detail-section">
                <h4>Transfer Details</h4>
                <p><strong>Current School:</strong> ${app.details.currentSchool}</p>
                <p><strong>Requested Class:</strong> ${app.details.requestedClass}</p>
                <p><strong>Reason:</strong> ${app.details.transferReason}</p>
            </div>
        `;
    }

    body.innerHTML = content;

    document.getElementById('approveBtn').onclick = () => processApplication(appId, 'approve');
    document.getElementById('rejectBtn').onclick = () => processApplication(appId, 'reject');
    document.getElementById('reviewBtn').onclick = () => {
        app.status = 'In Review';
        saveAndReload();
    };
    document.getElementById('scheduleBtn').onclick = () => {
        document.getElementById('decisionActions').style.display = 'none';
        document.getElementById('interviewForm').style.display = 'block';
    };

    document.getElementById('confirmScheduleBtn').onclick = () => {
        const d = document.getElementById('intDate').value;
        const t = document.getElementById('intTime').value;
        const v = document.getElementById('intVenue').value;
        if (!d || !t || !v) return alert('Fill all fields');
        app.status = 'Interview Scheduled';
        app.interview = { date: d, time: t, venue: v };
        saveAndReload();
        closeAppModal();
    };

    modal.classList.add('active');
}

function processApplication(appId, action) {
    const app = allApplications.find(a => a.id === appId);
    if (!app) return;

    if (action === 'approve') {
        app.status = 'Approved';
        const student = AppUtils.enrollStudent(app);
        alert(`Approved! Student ID: ${student.id}, Pass: ${student.password}`);
    } else {
        app.status = 'Rejected';
    }

    saveAndReload();
    closeAppModal();
}

function saveAndReload() {
    saveTenantData('school_applications', allApplications);
    loadApplications();
}

function closeAppModal() {
    document.getElementById('appDetailsModal').classList.remove('active');
}

function hideInterviewForm() {
    document.getElementById('interviewForm').style.display = 'none';
    document.getElementById('decisionActions').style.display = 'block';
}

const style = document.createElement('style');
style.textContent = `
    .bg-info { background: #17a2b8; color: white; }
    .btn-sm { padding: 5px 10px; border-radius: 4px; border: none; cursor: pointer; }
    .btn-pagination { padding: 5px 10px; margin: 0 2px; border: 1px solid #ddd; background: white; cursor: pointer; }
    .btn-pagination.active { background: var(--school-primary, #0056b3); color: white; border-color: var(--school-primary, #0056b3); }
`;
document.head.appendChild(style);

