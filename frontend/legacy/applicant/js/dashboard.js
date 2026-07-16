// Dashboard Logic
document.addEventListener('DOMContentLoaded', function () {
    const applicantData = sessionStorage.getItem('currentApplicant');

    if (!applicantData) {
        window.location.href = 'login.html';
        return;
    }

    let applicant = JSON.parse(applicantData);

    // Sync with localStorage to get latest updates from admin
    const allApps = getTenantData('school_applications', '[]');
    const latestApp = allApps.find(a => (a.id === applicant.id || a.applicationId === applicant.applicationId));
    if (latestApp) {
        applicant = latestApp;
        sessionStorage.setItem('currentApplicant', JSON.stringify(applicant));
    }

    // Populate Basic Info
    document.getElementById('welcomeMsg').textContent = `Welcome, ${applicant.fullName || applicant.personalDetails.firstName}`;
    document.getElementById('appIdDisplay').textContent = applicant.id || applicant.applicationId;
    const derivedType = (applicant.id && applicant.id.toString().toUpperCase().startsWith('F1')) ? 'Form 1' : 'A-Level';
    document.getElementById('appTypeDisplay').textContent = applicant.type || derivedType;

    // Status Logic
    const status = applicant.status || 'Pending';
    const statusBadge = document.getElementById('statusBadge');
    const statusCard = document.getElementById('statusCard');

    statusBadge.textContent = status;
    statusBadge.className = `status-badge status-${status}`;
    statusCard.className = `status-card ${status}`;

    // Check for Acceptance
    if (status === 'Approved' || status === 'approved') {
        const acceptSection = document.getElementById('acceptanceSection');
        acceptSection.style.display = 'block';

        // Update Next Steps
        const nextStepsList = document.getElementById('nextStepsList');
        if (nextStepsList) {
            nextStepsList.innerHTML = `
                <li>Login to Student Portal using above credentials.</li>
                <li>Download your admission letter (Link in Messages).</li>
                <li>Prepare for Term commencement.</li>
            `;
        }

        // Show Credentials (If they exist in the object)
        if (applicant.studentNumber) {
            document.getElementById('studentId').textContent = applicant.studentNumber;
            document.getElementById('studentPass').textContent = applicant.password || 'Listed in Admin';
        } else {
            // Self-Correction/Mock: If approved but no creds generated yet (legacy?), generate them now locally for demo
            document.getElementById('studentId').textContent = "Pending Generation";
            document.getElementById('studentPass').textContent = "Check back later";
        }
    }
});

