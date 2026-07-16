const STORAGE_KEY = 'school_messages';
let messages = [];

const DEFAULT_MESSAGES = [
    {
        id: 1,
        sender: 'Teacher John Smith',
        initials: 'JS',
        role: 'Teacher',
        subject: 'Request for Additional Resources',
        date: 'Dec 15, 2025 at 2:30 PM',
        timeAgo: '2 hours ago',
        body: `<p>Dear Administrator,</p>
               <p>I hope this message finds you well. I am writing to request additional resources for the Science department. We are planning to conduct advanced experiments for Form 4 students, and we need the following materials:</p>
               <ul>
                   <li>Laboratory equipment for chemistry experiments</li>
                   <li>Updated textbooks for the new curriculum</li>
                   <li>Safety equipment for students</li>
               </ul>
               <p>The estimated budget for these resources is approximately $2,500. I believe these materials will significantly enhance the learning experience for our students.</p>
               <p>Best regards,<br>John Smith<br>Science Department</p>`,
        read: false,
        active: true,
        attachments: [
            { name: 'science_budget_proposal.pdf', size: '2.5 MB' },
            { name: 'equipment_list.xlsx', size: '1.2 MB' }
        ]
    },
    {
        id: 2,
        sender: 'Parent - Mrs. Williams',
        initials: 'MW',
        role: 'Parent',
        subject: 'Student Progress Inquiry',
        date: 'Dec 15, 2025 at 11:15 AM',
        timeAgo: '5 hours ago',
        body: `<p>Dear Admin,</p>
               <p>I would like to inquire about the academic progress of my son, David Williams, in Form 2. I noticed a drop in his Mathematics grades recently.</p>
               <p>Could you please arrange a meeting with his Mathematics teacher?</p>
               <p>Sincerely,<br>Mrs. Williams</p>`,
        read: true,
        active: false,
        attachments: []
    }
];

function loadInitialStorage() {
    if (typeof getTenantData === 'function') {
        messages = getTenantData(STORAGE_KEY, JSON.stringify(DEFAULT_MESSAGES));
    } else {
        messages = JSON.parse(getTenantData(STORAGE_KEY, 'null') || JSON.stringify(DEFAULT_MESSAGES));
    }
}

function saveMessages() {
    if (typeof saveTenantData === 'function') {
        saveTenantData(STORAGE_KEY, messages);
    } else {
        saveTenantData(STORAGE_KEY, messages);
    }
}

loadInitialStorage();

document.addEventListener('DOMContentLoaded', function () {
    const messagesList = document.getElementById('messagesList');
    const messageContentArea = document.getElementById('messageContentArea');
    const composeBtn = document.getElementById('composeBtn');
    const composeModal = document.getElementById('composeModal');
    const composeForm = document.getElementById('composeForm');

    // Initial Render
    renderMessageList();
    renderActiveMessage();

    // Render List
    function renderMessageList() {
        if (!messagesList) return; // Guard clause

        messagesList.innerHTML = '';
        if (messages.length === 0) {
            messagesList.innerHTML = '<div style="padding: 20px; text-align: center; color: #666;">No messages.</div>';
            return;
        }

        messages.forEach(msg => {
            const item = document.createElement('div');
            item.className = `message-item ${msg.read ? '' : 'unread'} ${msg.active ? 'active' : ''}`;
            item.onclick = () => selectMessage(msg.id);

            let attachmentIcon = msg.attachments && msg.attachments.length > 0 ? '<i class="fas fa-paperclip" style="margin-right: 5px; color: #666;"></i>' : '';

            item.innerHTML = `
                <div class="message-sender">${msg.sender}</div>
                <div class="message-subject">${attachmentIcon}${msg.subject}</div>
                <div class="message-time">${msg.timeAgo}</div>
            `;
            messagesList.appendChild(item);
        });
    }

    // Select Message
    window.selectMessage = function (id) {
        messages.forEach(m => {
            m.active = (m.id === id);
            if (m.id === id) m.read = true;
        });
        saveMessages();
        renderMessageList();
        renderActiveMessage();
    };

    // Render Content
    function renderActiveMessage() {
        const activeMsg = messages.find(m => m.active);

        if (!activeMsg) {
            messageContentArea.innerHTML = `
                <div style="height: 100%; display: flex; align-items: center; justify-content: center; color: #666; font-size: 1.1rem;">
                    Select a message to read
                </div>`;
            return;
        }

        let attachmentsHtml = '';
        if (activeMsg.attachments && activeMsg.attachments.length > 0) {
            attachmentsHtml = `
                <div style="margin-top: 20px; border-top: 1px solid #eee; padding-top: 15px;">
                    <h5 style="margin: 0 0 10px 0; color: #555;">Attachments (${activeMsg.attachments.length})</h5>
                    <div style="display: flex; flex-wrap: wrap; gap: 10px;">
            `;

            activeMsg.attachments.forEach(att => {
                attachmentsHtml += `
                    <div style="border: 1px solid #ddd; border-radius: 5px; padding: 10px; display: flex; align-items: center; background: #fafafa;">
                        <i class="fas fa-file-alt" style="margin-right: 10px; color: #0056b3;"></i>
                        <div>
                            <div style="font-weight: 500; font-size: 0.9rem;">${att.name}</div>
                            <div style="font-size: 0.8rem; color: #888;">${att.size}</div>
                        </div>
                        <div style="margin-left: 15px; display: flex; gap: 5px;">
                            <button onclick="viewAttachment('${att.name}')" class="btn-sm" style="background: none; border: none; cursor: pointer; color: #0056b3;" title="View"><i class="fas fa-eye"></i></button>
                            <button onclick="downloadAttachment('${att.name}')" class="btn-sm" style="background: none; border: none; cursor: pointer; color: #0056b3;" title="Download"><i class="fas fa-download"></i></button>
                        </div>
                    </div>
                `;
            });

            attachmentsHtml += `
                    </div>
                </div>
            `;
        }

        messageContentArea.innerHTML = `
            <div class="message-header">
                <div style="display:flex; justify-content:space-between; align-items:start;">
                    <h3 class="message-title">${activeMsg.subject}</h3>
                    <div class="header-actions">
                        <button class="btn btn-secondary" onclick="printMessage()" style="padding: 5px 10px; font-size: 0.8rem;"><i class="fas fa-print"></i> Print</button>
                    </div>
                </div>
                <div class="message-meta">
                    <span><i class="fas fa-user"></i> From: ${activeMsg.sender}</span>
                    <span><i class="fas fa-clock"></i> ${activeMsg.date}</span>
                </div>
            </div>

            <div class="message-body" id="printableBody">
                ${activeMsg.body}
                ${attachmentsHtml}
            </div>

            <div class="message-actions">
                <button class="btn btn-primary" onclick="showSuccessMessage('Reply feature coming soon!')"><i class="fas fa-reply"></i> Reply</button>
                <button class="btn btn-secondary" onclick="deleteMessage(${activeMsg.id})"><i class="fas fa-trash"></i> Delete</button>
            </div>
        `;
    }

    // Attachment Helpers
    window.viewAttachment = function (filename) {
        alert(`Viewing attachment: ${filename}`);
        // In a real app, this would open a modal preview or new tab
    };

    window.downloadAttachment = function (filename) {
        alert(`Downloading attachment: ${filename}`);
        // In a real app, this would trigger a file download
    };

    window.printMessage = function () {
        const printContent = document.getElementById('printableBody').innerHTML;
        const originalContent = document.body.innerHTML;

        // Simple print simulation for this context
        // Ideally we would open a new window or use a specific print CSS
        // For now, we will just window.print() and let the browser handle it, 
        // acknowledging that a real print stylesheet would be needed for perfect formatting.
        window.print();
    };

    window.saveDraft = function () {
        showSuccessMessage('Message saved as draft successfully!');
        const composeModal = document.getElementById('composeModal');
        if (composeModal) composeModal.style.display = 'none';
        const composeForm = document.getElementById('composeForm');
        if (composeForm) composeForm.reset();
    };

    // Delete Message
    window.deleteMessage = function (id) {
        if (confirm('Are you sure you want to delete this message?')) {
            messages = messages.filter(m => m.id !== id);
            if (messages.length > 0) {
                // Determine next active message
                const remaining = messages.filter(m => !m.read); // prioritise unread?? No just take first
                if (messages.length > 0) messages[0].active = true;
            } else {
                // No messages left
            }
            saveMessages();
            renderMessageList();
            renderActiveMessage();
            showSuccessMessage('Message deleted successfully');
        }
    };

    // Compose Modal Logic
    if (composeBtn && composeModal) {
        composeBtn.addEventListener('click', () => {
            composeModal.style.display = 'flex';
        });

        const closeBtns = document.querySelectorAll('.close-modal, .close-modal-btn'); // Added .close-modal-btn selector
        closeBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                composeModal.style.display = 'none';
            });
        });

        window.onclick = (event) => {
            if (event.target == composeModal) {
                composeModal.style.display = 'none';
            }
        };

        if (composeForm) {
            composeForm.addEventListener('submit', (e) => {
                e.preventDefault();

                // Simulate attachment processing
                const fileInput = document.getElementById('messageAttachment');
                const attachedFiles = [];
                if (fileInput && fileInput.files.length > 0) {
                    for (let i = 0; i < fileInput.files.length; i++) {
                        attachedFiles.push({
                            name: fileInput.files[i].name,
                            size: (fileInput.files[i].size / 1024).toFixed(1) + ' KB'
                        });
                    }
                }

                showSuccessMessage('Message sent successfully' + (attachedFiles.length > 0 ? ' with attachments!' : '!'));

                // Add to list strictly for demo purposes
                const subject = composeForm.querySelector('input[type="text"]').value;
                const body = composeForm.querySelector('textarea').value;

                messages.unshift({
                    id: messages.length + 100,
                    sender: 'Me (Admin)',
                    initials: 'ME',
                    role: 'Admin',
                    subject: subject,
                    date: new Date().toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: 'numeric', hour12: true }),
                    timeAgo: 'Just now',
                    body: `<p>${body}</p>`,
                    read: true,
                    active: true,
                    attachments: attachedFiles
                });

                // Reset active states
                messages.forEach((m, idx) => {
                    if (idx > 0) m.active = false;
                });

                renderMessageList();
                renderActiveMessage();
                saveMessages();

                composeModal.style.display = 'none';
                composeForm.reset();
            });
        }
    }
});

