// Initialize announcements from tenant-aware storage
let announcements = [];

function loadInitialStorage() {
    const defaultAnnouncements = [
        {
            id: 1,
            title: 'Welcome to the New School Term',
            content: 'Welcome back students and staff! We wish you a productive and successful term.',
            date: 'Feb 10, 2026',
            audience: 'Students',
            posterName: 'Admin',
            posterRole: 'Administrator',
            views: 0,
            status: 'Published',
            attachment: null
        }
    ];

    if (typeof getTenantData === 'function') {
        announcements = getTenantData('schoolAnnouncements', JSON.stringify(defaultAnnouncements));
    } else {
        announcements = JSON.parse(getTenantData('schoolAnnouncements', 'null') || JSON.stringify(defaultAnnouncements));
    }
}

loadInitialStorage();

document.addEventListener('DOMContentLoaded', function () {
    const listContainer = document.getElementById('announcementsList');
    const modal = document.getElementById('announcementModal');
    const viewModal = document.getElementById('viewAnnouncementModal');
    const fileModal = document.getElementById('filePreviewModal');

    const form = document.getElementById('announcementForm');
    const createBtn = document.getElementById('createAnnouncementBtn');

    // File Action Buttons
    const printFileBtn = document.getElementById('printFileBtn');
    const downloadFileBtn = document.getElementById('downloadFileBtn');

    // State
    let currentPreviewFile = '';

    // Initial Render
    renderAnnouncements();

    // Create Button Handler
    if (createBtn) {
        createBtn.addEventListener('click', () => {
            openAnnouncementModal();
        });
    }

    // Modal Form Submit
    if (form) {
        form.addEventListener('submit', handleFormSubmit);
    }

    function renderAnnouncements() {
        if (!listContainer) return;

        listContainer.innerHTML = '';

        if (announcements.length === 0) {
            listContainer.innerHTML = '<div style="text-align:center; padding: 20px; color:#666;">No announcements found.</div>';
            return;
        }

        announcements.forEach(item => {
            const card = document.createElement('div');
            card.className = 'announcement-card';

            const statusClass = item.status === 'Published' ? 'status-published' : 'status-draft';
            const publishBtn = item.status === 'Draft'
                ? `<button class="btn btn-success btn-small" onclick="publishAnnouncement(${item.id})"><i class="fas fa-paper-plane"></i> Publish</button>`
                : '';

            // Only allow edit if draft
            const editBtn = item.status === 'Draft'
                ? `<button class="btn btn-primary btn-small" onclick="editAnnouncement(${item.id})"><i class="fas fa-edit"></i> Edit</button>`
                : '';

            // Only show icon if attachment exists
            const attachmentIcon = item.attachment
                ? `<i class="fas fa-paperclip" title="Attachment: ${item.attachment}" style="margin-left: 10px; color: #555;"></i>`
                : '';

            card.innerHTML = `
                <div class="announcement-header">
                    <div>
                        <div class="announcement-title">${item.title} ${attachmentIcon}</div>
                        <div class="announcement-meta">
                            <div class="meta-item">
                                <i class="fas fa-calendar"></i>
                                ${item.date}
                            </div>
                            <div class="meta-item">
                                <i class="fas fa-users"></i>
                                ${item.audience}
                            </div>
                            <div class="meta-item">
                                <i class="fas fa-user-edit"></i>
                                ${item.posterName} (${item.posterRole})
                            </div>
                            <div class="meta-item">
                                <i class="fas fa-eye"></i>
                                ${item.views} views
                            </div>
                        </div>
                    </div>
                    <span class="status-badge ${statusClass}">${item.status}</span>
                </div>
                <div class="announcement-content">
                    <p>${item.content.substring(0, 150)}${item.content.length > 150 ? '...' : ''}</p>
                </div>
                <div class="announcement-actions">
                    ${publishBtn}
                    ${editBtn}
                    <button class="btn btn-secondary btn-small" onclick="viewAnnouncement(${item.id})"><i class="fas fa-eye"></i> View Details</button>
                    <button class="btn btn-danger btn-small" onclick="deleteAnnouncement(${item.id})"><i class="fas fa-trash"></i> Delete</button>
                </div>
            `;
            listContainer.appendChild(card);
        });
    }

    window.editAnnouncement = function (id) {
        openAnnouncementModal(id);
    };

    window.deleteAnnouncement = function (id) {
        if (confirm('Are you sure you want to delete this announcement?')) {
            announcements = announcements.filter(a => a.id !== id);
            saveAnnouncements();
            renderAnnouncements();
            if (typeof showSuccessMessage === 'function') showSuccessMessage('Announcement deleted.');
        }
    };

    window.publishAnnouncement = function (id) {
        const index = announcements.findIndex(a => a.id === id);
        if (index !== -1) {
            announcements[index].status = 'Published';
            saveAnnouncements();
            renderAnnouncements();
            if (typeof showSuccessMessage === 'function') showSuccessMessage('Announcement published to portal!');
        }
    };

    function saveAnnouncements() {
        if (typeof saveTenantData === 'function') {
            saveTenantData('schoolAnnouncements', announcements);
        } else {
            saveTenantData('schoolAnnouncements', announcements);
        }
    }

    window.openAnnouncementModal = function (id = null) {
        const modalTitle = document.getElementById('modalTitle');
        const idInput = document.getElementById('announcementId');
        const currentAttachmentDiv = document.getElementById('currentAttachment');
        const currentAttachmentName = document.getElementById('currentAttachmentName');
        const fileInput = document.getElementById('attachment');

        if (fileInput) fileInput.value = '';

        if (id) {
            const item = announcements.find(a => a.id === id);
            if (!item) return;

            modalTitle.innerText = 'Edit Announcement';
            idInput.value = item.id;
            document.getElementById('title').value = item.title;
            document.getElementById('audience').value = item.audience;
            document.getElementById('content').value = item.content;
            document.getElementById('status').value = item.status;

            if (item.attachment) {
                currentAttachmentDiv.style.display = 'block';
                currentAttachmentName.innerText = item.attachment;
            } else {
                currentAttachmentDiv.style.display = 'none';
            }
        } else {
            modalTitle.innerText = 'Create New Announcement';
            form.reset();
            idInput.value = '';
            currentAttachmentDiv.style.display = 'none';
        }

        modal.style.display = 'flex';
    };

    function handleFormSubmit(e) {
        e.preventDefault();

        const id = document.getElementById('announcementId').value;
        const title = document.getElementById('title').value;
        const audience = document.getElementById('audience').value;
        const content = document.getElementById('content').value;
        const status = document.getElementById('status').value;
        const fileInput = document.getElementById('attachment');

        // Get current user for attribution
        const currentUser = JSON.parse(getTenantData('currentUser', 'null') || '{"name":"Admin","role":"Administrator"}');

        let attachment = null;
        if (fileInput && fileInput.files.length > 0) {
            attachment = fileInput.files[0].name;
        }

        const date = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

        if (id) {
            const index = announcements.findIndex(a => a.id == id);
            if (index !== -1) {
                const existing = announcements[index];
                const finalAttachment = attachment || existing.attachment;
                announcements[index] = {
                    ...existing,
                    title,
                    audience,
                    content,
                    status,
                    attachment: finalAttachment,
                    // Re-capture attribution if edited? Usually yes, or keep original. 
                    // User said "show the role and name of the on who posted it"
                    // Let's update it to current editor if it's still draft.
                    posterName: currentUser.name || currentUser.username || 'Admin',
                    posterRole: currentUser.role || 'Administrator'
                };
                if (typeof showSuccessMessage === 'function') showSuccessMessage('Announcement updated successfully!');
            }
        } else {
            const newId = announcements.length > 0 ? Math.max(...announcements.map(a => a.id)) + 1 : 1;
            const newAnnouncement = {
                id: newId,
                title,
                content,
                date: date,
                audience,
                views: 0,
                status,
                attachment,
                posterName: currentUser.name || currentUser.username || 'Admin',
                posterRole: currentUser.role || 'Administrator'
            };
            announcements.unshift(newAnnouncement);
            if (typeof showSuccessMessage === 'function') showSuccessMessage('Announcement created successfully!');
        }

        saveAnnouncements();
        modal.style.display = 'none';
        renderAnnouncements();
    }

    // --- View Logic ---
    window.viewAnnouncement = function (id) {
        const item = announcements.find(a => a.id === id);
        if (!item) return;

        document.getElementById('viewTitle').textContent = item.title;
        document.getElementById('viewDate').textContent = item.date;
        document.getElementById('viewAudience').textContent = item.audience;
        document.getElementById('viewPoster').textContent = `${item.posterName} (${item.posterRole})`;
        document.getElementById('viewViews').textContent = item.views;
        document.getElementById('viewContent').innerHTML = item.content.replace(/\n/g, '<br>');

        const badge = document.getElementById('viewStatusBadge');
        badge.className = `status-badge ${item.status === 'Published' ? 'status-published' : 'status-draft'}`;
        badge.textContent = item.status;

        const attachSection = document.getElementById('viewAttachmentSection');
        const attachName = document.getElementById('viewAttachmentName');
        const attachLink = document.getElementById('viewAttachmentLink');

        if (item.attachment) {
            attachSection.style.display = 'block';
            attachName.textContent = item.attachment;

            // Set listener for File Preview instead of direct download
            attachLink.onclick = function (e) {
                e.preventDefault();
                openFilePreview(item.attachment);
            };
        } else {
            attachSection.style.display = 'none';
        }

        viewModal.style.display = 'flex';
    }

    // --- File Preview Logic ---
    function openFilePreview(filename) {
        currentPreviewFile = filename;
        const fileTitle = document.getElementById('filePreviewTitle');
        const fileBody = document.getElementById('filePreviewBody');

        if (fileTitle) fileTitle.textContent = filename;

        // Generate Mock Content based on extension
        let mockContent = `<div class="mock-document-page">`;
        mockContent += `<h1>${filename}</h1>`;
        mockContent += `<p><strong>This is a preview of the attached document.</strong></p>`;
        mockContent += `<p>Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.</p>`;

        if (filename.endsWith('.pdf')) {
            mockContent += `<p>[PDF Content Placeholder: Charts, Graphs, and Tables would appear here]</p>`;
        } else if (filename.endsWith('.docx')) {
            mockContent += `<p>[Word Document Placeholder: Formatted text, bullet points, and images would appear here]</p>`;
        } else if (filename.match(/\.(jpg|jpeg|png)$/i)) {
            mockContent += `<div style="width:100%; height:300px; background:#ddd; display:flex; align-items:center; justify-content:center; margin-top:20px;">[Image Placeholder]</div>`;
        }

        mockContent += `<p>Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.</p>`;
        mockContent += `</div>`;

        if (fileBody) fileBody.innerHTML = mockContent;

        // Open Modal
        if (fileModal) {
            fileModal.style.display = 'flex';
            // Ensure View Modal is hidden or stays below? 
            // Often better to close View modal or simulate "stack". 
            // For simplicity, we can close View modal or let it stay. 
            // Let's close View modal to avoid z-index mess in simple implementation.
            viewModal.style.display = 'none';
        }
    }

    // --- File Actions ---
    if (printFileBtn) {
        printFileBtn.addEventListener('click', () => {
            window.print();
        });
    }

    if (downloadFileBtn) {
        downloadFileBtn.addEventListener('click', () => {
            if (typeof showSuccessMessage === 'function')
                showSuccessMessage(`Downloading ${currentPreviewFile}...`);

            // Fake download
            const element = document.createElement('a');
            element.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent('Mock file content for ' + currentPreviewFile));
            element.setAttribute('download', currentPreviewFile);
            element.style.display = 'none';
            document.body.appendChild(element);
            element.click();
            document.body.removeChild(element);
        });
    }

    // Handling Close Buttons for specific modals manually if not using global logic fully
    // window.closeModal is defined in admin-common? usually yes (implied). 
    // If we closed viewModal to open fileModal, closing fileModal should ideally probably just end there.
});

