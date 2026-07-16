// Mock Data for Assignments
const assignmentsData = [
    {
        id: 1,
        title: "Essay on Climate Change",
        subject: "Geography",
        teacher: "Mr. Johnson",
        dueDate: "2023-05-25",
        points: 50,
        status: "pending",
        description: "Write a 1000-word essay on the effects of climate change on local agriculture. Include at least 5 references. Focus on recent data from the last 5 years.",
        submittedFile: null
    },
    {
        id: 2,
        title: "Quadratic Equations",
        subject: "Mathematics",
        teacher: "Mrs. Smith",
        dueDate: "2023-05-20",
        points: 30,
        status: "submitted",
        description: "Complete all exercises on quadratic equations from page 45-47 in your textbook. Show all working out.",
        submittedFile: "math_homework_jdoe.pdf"
    },
    {
        id: 3,
        title: "Lab Report: Photosynthesis",
        subject: "Biology",
        teacher: "Dr. Williams",
        dueDate: "2023-05-15",
        points: 40,
        status: "overdue",
        description: "Write a detailed lab report on the photosynthesis experiment conducted in class. Include all observations, data tables, and conclusions.",
        submittedFile: null
    },
    {
        id: 4,
        title: "Book Review",
        subject: "English Literature",
        teacher: "Ms. Brown",
        dueDate: "2023-05-30",
        points: 45,
        status: "pending",
        description: "Write a 500-word review of 'To Kill a Mockingbird' focusing on character development and themes of racial injustice.",
        submittedFile: null
    },
    {
        id: 5,
        title: "Periodic Table Quiz",
        subject: "Chemistry",
        teacher: "Mr. White",
        dueDate: "2023-06-07",
        points: 20,
        status: "pending",
        description: "Prepare for the upcoming quiz on the first 20 elements of the periodic table.",
        submittedFile: null
    }
];

document.addEventListener('DOMContentLoaded', function () {
    // Check if user is logged in
    if (!sessionStorage.getItem('studentLoggedIn')) {
        window.location.href = 'login.html';
        return;
    }

    // Set student name from session storage
    const studentId = sessionStorage.getItem('studentId');
    if (studentId) {
        document.getElementById('studentName').textContent = 'Student #' + studentId;
    }

    // Mobile menu toggle
    const menuToggle = document.getElementById('menuToggle');
    const sidebar = document.getElementById('sidebar');

    // Add sidebar overlay if not present
    if (!document.getElementById('sidebarOverlay')) {
        const overlay = document.createElement('div');
        overlay.className = 'sidebar-overlay';
        overlay.id = 'sidebarOverlay';
        document.body.appendChild(overlay);
    }
    const sidebarOverlay = document.getElementById('sidebarOverlay');

    if (menuToggle && sidebar && sidebarOverlay) {
        menuToggle.addEventListener('click', function () {
            sidebar.classList.toggle('active');
            sidebarOverlay.classList.toggle('active');
        });

        sidebarOverlay.addEventListener('click', function () {
            sidebar.classList.remove('active');
            sidebarOverlay.classList.remove('active');
        });
    }

    // Logout functionality
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', function (e) {
            e.preventDefault();
            if (typeof AuditLogger !== 'undefined') {
                AuditLogger.log('Logout', `Student ${sessionStorage.getItem('studentId')} logged out`, AuditLogger.SEVERITY.INFO, AuditLogger.PORTAL.STUDENT, 'Authentication');
            }
            sessionStorage.removeItem('studentLoggedIn');
            sessionStorage.removeItem('studentId');
            window.location.href = 'login.html';
        });
    }

    const assignmentsList = document.getElementById('assignmentsList');
    const searchInput = document.getElementById('assignmentSearch');
    const statusFilter = document.getElementById('statusFilter');
    const subjectFilter = document.getElementById('subjectFilter');
    const submissionModal = document.getElementById('submissionModal');
    const detailsModal = document.getElementById('detailsModal');
    const submissionForm = document.getElementById('submissionForm');

    // New Elements for Edit Implementation
    const currentSubmissionSection = document.getElementById('currentSubmissionSection');
    const currentFileName = document.getElementById('currentFileName');
    const detachFileBtn = document.getElementById('detachFileBtn');
    const fileUploadGroup = document.getElementById('fileUploadGroup');
    const submissionFileInput = document.getElementById('submissionFile');
    const modalTitle = document.querySelector('#submissionModal .modal-header h3');

    // --- Shared Data Integration ---
    const ASSIGNMENT_ID_MAP = {
        2: 2 // Mapping ID 2 (Quadratic Equations) to our Shared Data ID
    };

    function getSharedData() {
        return JSON.parse(getTenantData('sharedAssignmentData', 'null')) || {};
    }

    function syncWithSharedData() {
        const data = getSharedData();
        const studentId = 'STU-001'; // Demo Student ID

        assignmentsData.forEach(assignment => {
            const sharedId = ASSIGNMENT_ID_MAP[assignment.id];
            if (sharedId && data[sharedId] && data[sharedId].submissions[studentId]) {
                const sub = data[sharedId].submissions[studentId];

                // Update Local State
                if (sub.status) assignment.status = sub.status;
                if (sub.grade) assignment.grade = sub.grade; // Add grade field
                if (sub.review) assignment.review = sub.review; // Add review field
                if (sub.file) assignment.submittedFile = sub.file;
            }
        });
    }

    // Initial Sync
    syncWithSharedData();
    // Re-sync periodically or on focus for demo purposes
    window.addEventListener('focus', () => {
        syncWithSharedData();
        renderAssignments(assignmentsData); // Refresh UI
    });


    // Populate Subject Filter
    const subjects = [...new Set(assignmentsData.map(a => a.subject))];
    subjects.forEach(subject => {
        const option = document.createElement('option');
        option.value = subject;
        option.textContent = subject;
        subjectFilter.appendChild(option);
    });

    // Render Assignments
    function renderAssignments(assignments) {
        assignmentsList.innerHTML = '';
        if (assignments.length === 0) {
            assignmentsList.innerHTML = '<p style="grid-column: 1/-1; text-align: center; color: #666;">No assignments found matching your criteria.</p>';
            return;
        }

        assignments.forEach(assignment => {
            const card = document.createElement('div');
            card.className = 'assignment-card';

            const today = new Date().toISOString().split('T')[0];
            const isOverdue = assignment.status === 'pending' && assignment.dueDate < today;
            let displayStatus = assignment.status;
            let statusClass = 'status-' + assignment.status;

            if (isOverdue && assignment.status !== 'submitted') {
                displayStatus = 'overdue';
                statusClass = 'status-overdue';
            }

            // Button Logic
            let submitBtnText = 'Submit';
            let submitBtnClass = 'submit-button';

            if (assignment.status === 'submitted') {
                if (assignment.grade) {
                    submitBtnText = `Graded: ${assignment.grade}/${assignment.points}`;
                    submitBtnClass = 'btn-success'; // Green button for graded
                    // Disable submission edit if graded? Or allow view only?
                    // Let's keep it "View Submission" logic but maybe show grade.
                } else {
                    submitBtnText = 'View/Edit Submission';
                }
            } else if (displayStatus === 'overdue') {
                submitBtnText = 'Submit Late';
            }

            card.innerHTML = `
                <div class="assignment-header">
                    <h3>${assignment.title}</h3>
                    <div class="assignment-subject">${assignment.subject}</div>
                    <span class="assignment-status-badge ${statusClass}">${capitalize(displayStatus)}</span>
                </div>
                <div class="assignment-body">
                    <div class="assignment-details">
                        <p><strong>Due Date:</strong> ${formatDate(assignment.dueDate)}</p>
                        <p><strong>Teacher:</strong> ${assignment.teacher}</p>
                        <p><strong>Points:</strong> ${assignment.points}</p>
                        ${assignment.grade ? `<p style="color: #28a745; font-weight: bold;">Score: ${assignment.grade}</p>` : ''}
                    </div>
                    <div class="assignment-description">
                        <h4>Description:</h4>
                        <p>${truncateText(assignment.description, 100)}</p>
                    </div>
                    <div class="assignment-actions">
                        <button class="assignment-button view-button" onclick="viewDetails(${assignment.id})">View Details</button>
                        <button class="assignment-button ${submitBtnClass}" onclick="openSubmission(${assignment.id})">${submitBtnText}</button>
                    </div>
                </div>
            `;
            assignmentsList.appendChild(card);
        });
    }

    // Filter Logic
    function filterAssignments() {
        const searchTerm = searchInput.value.toLowerCase();
        const statusValue = statusFilter.value;
        const subjectValue = subjectFilter.value;

        const filtered = assignmentsData.filter(a => {
            const matchesSearch = a.title.toLowerCase().includes(searchTerm) ||
                a.description.toLowerCase().includes(searchTerm);

            let statusMatch = false;
            if (statusValue === 'all') {
                statusMatch = true;
            } else if (statusValue === 'overdue') {
                statusMatch = (a.status === 'pending' && a.dueDate < new Date().toISOString().split('T')[0]) || a.status === 'overdue';
            } else {
                statusMatch = a.status === statusValue;
            }

            const matchesSubject = subjectValue === 'all' || a.subject === subjectValue;

            return matchesSearch && statusMatch && matchesSubject;
        });

        renderAssignments(filtered);
    }

    searchInput.addEventListener('input', filterAssignments);
    statusFilter.addEventListener('change', filterAssignments);
    subjectFilter.addEventListener('change', filterAssignments);

    // Initial Render
    renderAssignments(assignmentsData);

    // Modal Functions
    window.viewDetails = function (id) {
        const assignment = assignmentsData.find(a => a.id === id);
        if (!assignment) return;

        document.getElementById('modalTitle').textContent = assignment.title;
        document.getElementById('modalSubject').textContent = assignment.subject;
        document.getElementById('modalTeacher').textContent = assignment.teacher;
        document.getElementById('modalDueDate').textContent = formatDate(assignment.dueDate);
        document.getElementById('modalPoints').textContent = assignment.points;
        document.getElementById('modalDescription').textContent = assignment.description;

        // Feedback / Conversation Section
        const feedbackContainer = document.getElementById('modalFeedbackSection');
        // Clear old content if exists or create new
        let container = feedbackContainer;
        if (!container) {
            container = document.createElement('div');
            container.id = 'modalFeedbackSection';
            container.style.marginTop = '20px';
            container.style.borderTop = '1px solid #eee';
            container.style.paddingTop = '15px';

            // Insert after description IN THE MODAL
            const desc = detailsModal.querySelector('.assignment-description');
            if (desc) {
                desc.parentNode.insertBefore(container, desc.nextSibling);
            }
        }

        // Render Thread
        let threadHtml = '<h4 style="margin-bottom: 15px;">Conversation History</h4>';

        // Initial Submission (if exists)
        if (assignment.submittedFile) {
            const subDate = assignment.status === 'submitted' ? 'Recently' : ''; // We don't have exact date in local object unless synced perfect
            threadHtml += `
                <div style="margin-bottom: 10px;">
                    <strong style="color: #0056b3;">You</strong> <span style="font-size: 0.8rem; color: #999;">${subDate}</span>
                    <div style="background: #e7f5ff; padding: 10px; border-radius: 5px; margin-top: 5px;">
                        Submitted: ${assignment.submittedFile}
                    </div>
                </div>
             `;
        }

        // Messages from Shared Data
        // We need to fetch FRESH data in case teacher replied
        const sharedData = getSharedData();
        const sharedId = ASSIGNMENT_ID_MAP[id];
        const studentId = 'STU-001';

        let messages = [];
        let sharedSub = null;

        if (sharedId && sharedData[sharedId] && sharedData[sharedId].submissions[studentId]) {
            sharedSub = sharedData[sharedId].submissions[studentId];
            if (sharedSub.messages) {
                messages = sharedSub.messages;
            } else if (sharedSub.review) {
                // Legacy review support
                messages.push({ sender: 'teacher', text: sharedSub.review, date: sharedSub.date });
            }
        }

        messages.forEach(msg => {
            const isStudent = msg.sender === 'student'; // Teacher = teacher, Student = student
            const align = isStudent ? 'left' : 'right';
            const bg = isStudent ? '#e7f5ff' : '#f0fff4'; // Blue for student, Green for teacher
            const name = isStudent ? 'You' : assignment.teacher; // Or "Teacher"

            let fileHtml = '';
            if (msg.file) {
                fileHtml = `
                    <div style="margin-top: 5px; font-size: 0.9rem; background: rgba(0,0,0,0.05); padding: 5px 10px; border-radius: 4px; display: inline-flex; align-items: center; gap: 8px;">
                        <i class="fas fa-file-alt"></i> 
                        <span style="font-weight: 500;">${msg.file}</span>
                        <div style="display: flex; gap: 5px; margin-left: 10px;">
                            <button onclick="viewFile('${msg.file}')" style="background: #0056b3; color: white; border: none; padding: 2px 8px; border-radius: 3px; cursor: pointer; font-size: 0.75rem;">
                                <i class="fas fa-eye"></i> View
                            </button>
                            <button onclick="downloadFile('${msg.file}')" style="background: #28a745; color: white; border: none; padding: 2px 8px; border-radius: 3px; cursor: pointer; font-size: 0.75rem;">
                                <i class="fas fa-download"></i> Download
                            </button>
                        </div>
                    </div>
                `;
            }

            threadHtml += `
                <div style="margin-bottom: 10px; text-align: ${isStudent ? 'left' : 'right'};">
                    <strong>${name}</strong> <span style="font-size: 0.8rem; color: #999;">${msg.date || ''}</span>
                    <div style="background: ${bg}; padding: 10px; border-radius: 5px; margin-top: 5px; display: inline-block; text-align: left;">
                        ${msg.text}
                        ${fileHtml}
                    </div>
                </div>
            `;
        });

        // Reply Form
        const replyFormHtml = `
            <form id="studentReplyForm" style="margin-top: 20px; border-top: 1px solid #eee; padding-top: 15px;">
                <input type="hidden" id="replyAssignmentId" value="${id}">
                <div class="form-group">
                    <textarea id="replyComment" class="form-control" rows="2" placeholder="Write a reply..." required style="width: 100%; border: 1px solid #ddd; padding: 8px; border-radius: 4px;"></textarea>
                </div>
                <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 10px;">
                    <input type="file" id="replyFile">
                    <button type="submit" class="submit-button" style="padding: 6px 15px;">Send Reply</button>
                </div>
            </form>
        `;

        container.innerHTML = threadHtml + replyFormHtml;

        // Bind Reply Submit
        setTimeout(() => {
            const replyForm = document.getElementById('studentReplyForm');
            if (replyForm) {
                replyForm.onsubmit = function (e) {
                    e.preventDefault();
                    handleStudentReply(id);
                };
            }
        }, 0);

        detailsModal.style.display = 'block';
    };

    function handleStudentReply(assignmentId) {
        const comment = document.getElementById('replyComment').value;
        const fileInput = document.getElementById('replyFile');

        const sharedId = ASSIGNMENT_ID_MAP[assignmentId];
        const studentId = 'STU-001';
        const data = getSharedData();

        if (sharedId && data[sharedId]) {
            if (!data[sharedId].submissions[studentId]) {
                data[sharedId].submissions[studentId] = { status: 'submitted', messages: [] };
            }
            const sub = data[sharedId].submissions[studentId];

            if (!sub.messages) sub.messages = [];

            sub.messages.push({
                sender: 'student',
                text: comment,
                file: fileInput.files.length > 0 ? fileInput.files[0].name : null,
                date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
            });

            saveSharedData(data);
            if (typeof AuditLogger !== 'undefined') {
                AuditLogger.log('Assignment Reply', `Replied to assignment ID ${assignmentId}`, AuditLogger.SEVERITY.INFO, AuditLogger.PORTAL.STUDENT, 'Academic');
            }
            showToast('Reply sent!', 'success');

            // Refresh View
            viewDetails(assignmentId);
        }
    }

    function saveSharedData(data) {
        saveTenantData('sharedAssignmentData', data);
    }

    window.openSubmission = function (id) {
        const assignment = assignmentsData.find(a => a.id === id);
        if (!assignment) return;

        // Reset form
        submissionForm.reset();
        submissionForm.dataset.assignmentId = id;

        // Logic for Existing Submission
        if (assignment.submittedFile) {
            // Edit Mode
            modalTitle.textContent = "Manage Submission";
            currentSubmissionSection.style.display = 'block';
            currentFileName.textContent = assignment.submittedFile;

            // Hide upload initially unless they want to replace (detach first)
            // Or allow immediate replace? User asked to "detach... OR insert new one".
            // Let's hide upload to keep UI clean, they must detach to remove.
            // Or we could show upload input as "Replace File".

            // Let's go with: Show current file. Hide upload.
            // Detach button -> clears file -> shows upload.
            fileUploadGroup.style.display = 'none';
            submissionFileInput.removeAttribute('required'); // Not required if we have a file

            // If just viewing, maybe we don't want to allow empty submit? 
            // But form submit button says "Submit Assignment".

        } else {
            // New Submission Mode
            modalTitle.textContent = "Submit Assignment";
            currentSubmissionSection.style.display = 'none';
            fileUploadGroup.style.display = 'block';
            submissionFileInput.setAttribute('required', 'true');
        }

        submissionModal.style.display = 'block';
    };

    // Detach Logic
    detachFileBtn.addEventListener('click', function () {
        const id = parseInt(submissionForm.dataset.assignmentId);
        const assignment = assignmentsData.find(a => a.id === id);

        if (confirm('Are you sure you want to remove this submission? This will mark the assignment as pending.')) {
            // Clear data
            assignment.submittedFile = null;
            assignment.status = 'pending'; // Revert to pending
            assignment.grade = null; // Clear grade on detach?
            assignment.review = null;

            // Sync with Shared Data (Reset)
            const sharedId = ASSIGNMENT_ID_MAP[id];
            const data = getSharedData();
            if (data[sharedId] && data[sharedId].submissions['STU-001']) {
                data[sharedId].submissions['STU-001'] = { status: 'pending' };
                saveSharedData(data);
            }

            // Update UI
            currentSubmissionSection.style.display = 'none';
            fileUploadGroup.style.display = 'block';
            submissionFileInput.setAttribute('required', 'true');
            modalTitle.textContent = "Submit Assignment";

            // Toast or visual feedback?
            showToast('File detached. You can now upload a new file.', 'info');

            // We do NOT close the modal, allowing them to upload immediately if they want.
            // But we SHOULD update the background list to reflect status change if they close modal now.
            filterAssignments();
        }
    });

    // Close Modals
    document.querySelectorAll('.close-modal, .btn-secondary').forEach(el => {
        el.addEventListener('click', function () {
            submissionModal.style.display = 'none';
            detailsModal.style.display = 'none';
            document.getElementById('viewFileModal').style.display = 'none';
        });
    });

    window.onclick = function (event) {
        if (event.target == submissionModal) submissionModal.style.display = "none";
        if (event.target == detailsModal) detailsModal.style.display = "none";
        if (event.target == document.getElementById('viewFileModal')) document.getElementById('viewFileModal').style.display = "none";
    };

    // --- File Preview & Download Logic ---
    window.viewFile = function (filename) {
        const previewModal = document.getElementById('viewFileModal');
        const container = document.getElementById('filePreviewContainer');
        const downloadBtn = document.getElementById('downloadPreviewBtn');

        // Reset
        container.innerHTML = 'Loading content...';

        // Simulate Content
        setTimeout(() => {
            container.innerHTML = `
                <div style="font-family: 'Courier New', Courier, monospace; color: #333;">
                    <h3 style="border-bottom: 2px solid #333; padding-bottom: 10px; margin-bottom: 20px;">DOCUMENT PREVIEW</h3>
                    <p><strong>Filename:</strong> ${filename}</p>
                    <p><strong>Source:</strong> Embakwe High School Portal</p>
                    <hr>
                    <p>Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.</p>
                    <p>Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.</p>
                    <br>
                    <p>[This is a simulated preview of the attached file content.]</p>
                    <br>
                    <h4>Key Points:</h4>
                    <ul>
                        <li>Understanding the core concepts.</li>
                        <li>Reviewing the attached guidelines.</li>
                        <li>Submitting work by the due date.</li>
                    </ul>
                    <hr>
                    <p style="text-align: center; color: #888;">-- End of Document --</p>
                </div>
            `;
        }, 500);

        // Bind Download Button in Modal
        downloadBtn.onclick = function () {
            window.downloadFile(filename);
        };

        previewModal.style.display = 'block';
    };

    window.downloadFile = function (filename) {
        const content = `
            EMBAKWE HIGH SCHOOL
            FILE DOWNLOAD
            ----------------------
            File: ${filename}
            Timestamp: ${new Date().toLocaleString()}
            
            [This is a simulated download file content.]
        `;
        const blob = new Blob([content], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename.includes('.') ? filename : filename + '.txt';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        showToast(`Downloading ${filename}...`, 'info');
    };

    // Handle Submission
    submissionForm.addEventListener('submit', function (e) {
        e.preventDefault();
        const id = parseInt(this.dataset.assignmentId);
        const assignment = assignmentsData.find(a => a.id === id);

        // If file input has a file, use its name.
        // If no file input (because hidden and not required), we shouldn't be here really unless we are just updating comments?
        // But for this simple implementation, let's assume submit means "uploading a file".

        if (submissionFileInput.files.length > 0) {
            const file = submissionFileInput.files[0];
            assignment.submittedFile = file.name;
            assignment.status = 'submitted';

            // Sync with Shared Data
            const sharedId = ASSIGNMENT_ID_MAP[id];
            const data = getSharedData();
            if (!data[sharedId]) data[sharedId] = { submissions: {} }; // Init if missing

            // Create or Update
            data[sharedId].submissions['STU-001'] = {
                status: 'submitted',
                date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
                file: file.name,
                grade: null, // Reset grade on new submission
                review: null
            };
            saveSharedData(data);

            if (typeof AuditLogger !== 'undefined') {
                AuditLogger.log('Assignment Submission', `Submitted assignment "${assignment.title}" (File: ${file.name})`, AuditLogger.SEVERITY.INFO, AuditLogger.PORTAL.STUDENT, 'Academic');
            }

            showToast(`Assignment "${assignment.title}" submitted successfully!`, 'success');
            submissionModal.style.display = 'none';
            filterAssignments(); // Re-render
        } else {
            // If they didn't select a file (e.g. maybe just editing comments on existing one?)
            // For now, let's just close if there's an existing file.
            if (assignment.submittedFile) {
                showToast('Submission updated.', 'success');
                submissionModal.style.display = 'none';
            }
        }
    });

    // Utility Functions
    function capitalize(str) {
        return str.charAt(0).toUpperCase() + str.slice(1);
    }

    function formatDate(dateString) {
        const options = { year: 'numeric', month: 'long', day: 'numeric' };
        return new Date(dateString).toLocaleDateString(undefined, options);
    }

    function truncateText(text, limit) {
        if (text.length <= limit) return text;
        return text.slice(0, limit) + '...';
    }
});

