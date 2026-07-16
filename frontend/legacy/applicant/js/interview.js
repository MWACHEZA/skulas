// Interview Page Logic
document.addEventListener('DOMContentLoaded', function () {
    const applicant = JSON.parse(sessionStorage.getItem('currentApplicant'));

    if (!applicant) {
        window.location.href = 'login.html';
        return;
    }

    const container = document.getElementById('interviewContent');

    // Check if interview is scheduled (stored in applicant data)
    const interview = applicant.interview || null;

    if (!interview) {
        // No interview scheduled
        container.innerHTML = `
            <div class="interview-card">
                <div class="no-interview">
                    <i class="fas fa-calendar-times"></i>
                    <h3>No Interview Scheduled</h3>
                    <p>An interview may be scheduled once your application is under review.</p>
                    <p>You will be notified via email and messages when an interview is scheduled.</p>
                </div>
            </div>
        `;
        return;
    }

    // Interview is scheduled - display details
    const interviewDate = new Date(interview.date).toLocaleDateString('en-GB', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });

    const interviewTime = interview.time || '10:00 AM';
    const location = interview.location || 'Main Administration Building, Room 201';
    const panelMembers = interview.panel || [
        { name: 'Mrs. T. Moyo', role: 'Head of Admissions' },
        { name: 'Mr. J. Ncube', role: 'Academic Director' }
    ];

    container.innerHTML = `
        <div class="interview-card">
            <h3 style="margin-top: 0; color: #0056b3;">
                <i class="fas fa-calendar-check"></i> Interview Scheduled
            </h3>

            <div class="interview-details">
                <div class="detail-box">
                    <h4><i class="fas fa-calendar icon"></i>Date</h4>
                    <p>${interviewDate}</p>
                </div>
                <div class="detail-box">
                    <h4><i class="fas fa-clock icon"></i>Time</h4>
                    <p>${interviewTime}</p>
                </div>
                <div class="detail-box">
                    <h4><i class="fas fa-map-marker-alt icon"></i>Location</h4>
                    <p>${location}</p>
                </div>
            </div>

            <div class="requirements-section">
                <h4><i class="fas fa-exclamation-triangle"></i> What to Bring</h4>
                <ul>
                    <li>Original ID document or Birth Certificate</li>
                    <li>Grade 7 Results Slip (Original)</li>
                    <li>Two passport-sized photographs</li>
                    <li>This interview confirmation (printed or on phone)</li>
                    <li>Any supporting documents mentioned in your application</li>
                </ul>
            </div>

            <div class="panel-info">
                <h4><i class="fas fa-users"></i> Interview Panel</h4>
                ${panelMembers.map(member => `
                    <div class="panel-member">
                        <i class="fas fa-user-circle"></i>
                        <div class="panel-member-info">
                            <h5>${member.name}</h5>
                            <p>${member.role}</p>
                        </div>
                    </div>
                `).join('')}
            </div>

            <div class="action-buttons">
                <button class="btn btn-primary" onclick="window.print()">
                    <i class="fas fa-print"></i> Print Confirmation
                </button>
                <a href="messages.html" class="btn btn-secondary">
                    <i class="fas fa-envelope"></i> Contact Admissions
                </a>
            </div>
        </div>

        <div class="interview-card">
            <h4 style="margin-top: 0; color: #333;">
                <i class="fas fa-lightbulb"></i> Interview Tips
            </h4>
            <ul style="color: #666; line-height: 1.8;">
                <li>Arrive at least 15 minutes before your scheduled time</li>
                <li>Dress appropriately in smart casual or school uniform</li>
                <li>Be prepared to discuss your academic interests and goals</li>
                <li>Bring questions about the school and programs offered</li>
                <li>Be honest and confident in your responses</li>
                <li>Maintain good eye contact and speak clearly</li>
            </ul>
        </div>
    `;
});

