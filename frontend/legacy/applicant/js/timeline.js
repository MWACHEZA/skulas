// Timeline Page Logic
document.addEventListener('DOMContentLoaded', function () {
    let applicant = JSON.parse(sessionStorage.getItem('currentApplicant'));

    if (!applicant) {
        window.location.href = 'login.html';
        return;
    }

    // Refresh data from localStorage to get admin updates
    const allApps = getTenantData('school_applications', '[]');
    const freshData = allApps.find(a => a.id === applicant.id);
    if (freshData) {
        applicant = freshData;
        sessionStorage.setItem('currentApplicant', JSON.stringify(applicant));
    }

    const status = applicant.status || 'Pending';
    const submittedDate = applicant.submittedDate ? new Date(applicant.submittedDate).toLocaleDateString() : 'N/A';

    // Find latest interview details if any
    const interviewEvent = (applicant.timeline || []).find(t => t.status === 'Interview Scheduled');

    // Define timeline stages
    const stages = [
        {
            id: 'submitted',
            title: 'Application Submitted',
            description: 'Your application has been successfully received.',
            date: submittedDate,
            icon: 'fa-paper-plane'
        },
        {
            id: 'review',
            title: 'Under Review',
            description: status === 'In Review' || status === 'Interview Scheduled' || status === 'Approved' || status === 'Rejected'
                ? 'Admissions team has reviewed your documents.'
                : 'Our admissions team is reviewing your application and documents.',
            date: ['In Review', 'Interview Scheduled', 'Approved', 'Rejected'].includes(status) ? 'Completed' : 'In Progress',
            icon: 'fa-search'
        },
        {
            id: 'interview',
            title: 'Interview Stage',
            description: status === 'Interview Scheduled'
                ? `<strong>Interview Scheduled:</strong><br>Date: ${interviewEvent.date}<br>Time: ${interviewEvent.time}<br>Venue: ${interviewEvent.venue}`
                : 'Interview scheduled (if required for your application).',
            date: status === 'Interview Scheduled' ? 'In Progress' : (status === 'Approved' || status === 'Rejected' ? 'Completed' : 'Pending'),
            icon: 'fa-user-tie'
        },
        {
            id: 'decision',
            title: 'Decision Made',
            description: status === 'Approved'
                ? 'Congratulations! Your application has been approved.'
                : (status === 'Rejected' ? 'Decision finalized.' : 'Admissions decision has been finalized.'),
            date: status === 'Approved' || status === 'Rejected' ? 'Completed' : 'Pending',
            icon: 'fa-check-circle'
        },
        {
            id: 'enrollment',
            title: 'Enrollment',
            description: applicant.studentId
                ? `<strong>Enrollment Confirmed!</strong><br>Student ID: <span style="color:#0056b3;">${applicant.studentId}</span><br>Password: <span style="color:#0056b3;">${applicant.studentPassword}</span><br>Please use these to log into the Student Portal.`
                : 'Complete enrollment and receive student credentials.',
            date: applicant.studentId ? 'Completed' : 'Pending',
            icon: 'fa-graduation-cap'
        }
    ];

    // Determine current stage based on status
    let currentStageIndex = 0;
    if (status === 'Pending') {
        currentStageIndex = 1;
    } else if (status === 'In Review') {
        currentStageIndex = 1;
    } else if (status === 'Interview Scheduled') {
        currentStageIndex = 2;
    } else if (status === 'Approved' && !applicant.studentId) {
        currentStageIndex = 3;
    } else if (status === 'Approved' && applicant.studentId) {
        currentStageIndex = 4;
    } else if (status === 'Rejected') {
        currentStageIndex = 3;
    }

    // Render timeline
    const container = document.getElementById('timelineContainer');
    container.innerHTML = '';

    stages.forEach((stage, index) => {
        let itemClass = 'timeline-item';
        let iconClass = 'timeline-icon';
        let badgeClass = 'status-badge';
        let badgeText = '';

        if (index < currentStageIndex) {
            itemClass += ' completed';
            iconClass += ' completed';
            badgeClass += ' badge-completed';
            badgeText = 'Completed';
        } else if (index === currentStageIndex) {
            itemClass += ' active';
            iconClass += ' active';
            badgeClass += ' badge-active';
            badgeText = 'Current Stage';
        } else {
            itemClass += ' pending';
            iconClass += ' pending';
            badgeClass += ' badge-pending';
            badgeText = 'Pending';
        }

        // Special handling for rejected applications
        if (status === 'Rejected' && stage.id === 'decision') {
            stage.description = 'Unfortunately, your application was not successful at this time.';
            badgeText = 'Not Approved';
            badgeClass = 'status-badge badge-active';
        }

        if (status === 'Rejected' && index > currentStageIndex) {
            badgeText = 'Not Applicable';
        }

        const html = `
            <div class="${itemClass}">
                <div class="${iconClass}">
                    <i class="fas ${stage.icon}"></i>
                </div>
                <div class="timeline-content">
                    <h4>${stage.title}</h4>
                    <p>${stage.description}</p>
                    <p class="timeline-date"><i class="fas fa-calendar"></i> ${stage.date}</p>
                    <span class="${badgeClass}">${badgeText}</span>
                </div>
            </div>
        `;

        container.innerHTML += html;
    });
});

