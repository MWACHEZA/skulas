let currentApplicant = JSON.parse(sessionStorage.getItem('currentApplicant'));
let activeDocType = null;

if (!currentApplicant) {
    window.location.href = 'login.html';
}

document.addEventListener('DOMContentLoaded', () => {
    renderAllDocStatus();
});

function renderAllDocStatus() {
    const docTypes = ['id', 'birth', 'address', 'academic'];
    docTypes.forEach(type => renderDocStatus(type));
}

function renderDocStatus(docType) {
    const card = document.getElementById(`card-${docType}`);
    const actionArea = card.querySelector('.action-area');
    
    // Ensure documents object exists
    if (!currentApplicant.documents) currentApplicant.documents = {};
    
    const doc = currentApplicant.documents[docType];

    if (doc) {
        // Uploaded State
        actionArea.innerHTML = `
            <div style="display: flex; flex-direction: column; gap: 8px;">
                <span style="color: #28a745; font-weight: 600; font-size: 0.85rem;"><i class="fas fa-check-circle"></i> Uploaded</span>
                <div style="display: flex; gap: 5px;">
                    <button class="btn-sub" style="background: #17a2b8; color: white; padding: 4px 8px; border-radius: 4px; border: none; font-size: 0.75rem; cursor: pointer;" onclick="viewDocument('${docType}')"><i class="fas fa-eye"></i> View</button>
                    <button class="btn-sub" style="background: #dc3545; color: white; padding: 4px 8px; border-radius: 4px; border: none; font-size: 0.75rem; cursor: pointer;" onclick="deleteDocument('${docType}')"><i class="fas fa-trash"></i></button>
                </div>
            </div>
        `;
    } else {
        // Missing State
        actionArea.innerHTML = `
            <div style="display: flex; flex-direction: column; gap: 8px;">
                <span style="color: #dc3545; font-weight: 600; font-size: 0.85rem;"><i class="fas fa-exclamation-circle"></i> Missing</span>
                <button class="btn-sub" style="background: #0056b3; color: white; padding: 8px 12px; border-radius: 4px; border: none; font-size: 0.85rem; cursor: pointer;" onclick="triggerUpload('${docType}')"><i class="fas fa-upload"></i> Upload</button>
            </div>
        `;
    }
}

function triggerUpload(docType) {
    activeDocType = docType;
    document.getElementById('fileInput').click();
}

function handleFileUpload(input) {
    const file = input.files[0];
    if (!file) return;

    // Limit size to 2MB for localStorage safety (base64 is larger)
    if (file.size > 2 * 1024 * 1024) {
        alert('File is too large. Max size 2MB allowed.');
        return;
    }

    const reader = new FileReader();
    reader.onload = function (e) {
        const base64Data = e.target.result;

        if (!currentApplicant.documents) currentApplicant.documents = {};
        
        currentApplicant.documents[activeDocType] = {
            name: file.name,
            data: base64Data,
            type: file.type,
            date: new Date().toISOString()
        };

        saveApplicantData();
        renderDocStatus(activeDocType);
        input.value = '';
    };
    reader.readAsDataURL(file);
}

function viewDocument(docType) {
    const doc = currentApplicant.documents[docType];
    if (!doc) return;

    const modal = document.getElementById('viewModal');
    const container = document.getElementById('previewContent');

    if (doc.type.startsWith('image/')) {
        container.innerHTML = `<img src="${doc.data}" style="max-width: 100%; max-height: 80vh; border-radius: 8px;">`;
    } else if (doc.type === 'application/pdf') {
        container.innerHTML = `<iframe src="${doc.data}" style="width: 100%; height: 80vh; border: none; border-radius: 8px;"></iframe>`;
    } else {
        container.innerHTML = `
            <div style="text-align: center; padding: 40px;">
                <i class="fas fa-file-alt" style="font-size: 4rem; color: #ccc; margin-bottom: 20px;"></i>
                <p>Cannot preview this file type directly.</p>
                <a href="${doc.data}" download="${doc.name}" class="btn btn-primary" style="margin-top: 15px; display: inline-block;">Download File</a>
            </div>
        `;
    }

    modal.style.display = 'flex';
}

function closeModal() {
    document.getElementById('viewModal').style.display = 'none';
}

function deleteDocument(docType) {
    if (confirm('Are you sure you want to remove this document?')) {
        delete currentApplicant.documents[docType];
        saveApplicantData();
        renderDocStatus(docType);
    }
}

function saveApplicantData() {
    sessionStorage.setItem('currentApplicant', JSON.stringify(currentApplicant));

    // Sync with main DB (localStorage)
    const allApps = getTenantData('school_applications', '[]');
    const index = allApps.findIndex(a => (a.id === currentApplicant.id || a.applicationId === currentApplicant.applicationId));
    
    if (index !== -1) {
        allApps[index] = currentApplicant;
        saveTenantData('school_applications', allApps);
    }
}

function logout() {
    sessionStorage.removeItem('currentApplicant');
    window.location.href = 'login.html';
}

// Mobile Toggle Logic
const mobileToggle = document.getElementById('mobileToggle');
const sidebar = document.getElementById('sidebar');
if (mobileToggle && sidebar) {
    mobileToggle.addEventListener('click', () => {
        sidebar.classList.toggle('active');
    });
}

