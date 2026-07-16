/* Admin Portal Common JavaScript */

// Modal Functions
function openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.style.display = 'flex';
        document.body.style.overflow = 'hidden';
    }
}

function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.style.display = 'none';
        document.body.style.overflow = 'auto';
    }
}

// Close modal when clicking outside
window.onclick = function (event) {
    if (event.target.classList.contains('modal')) {
        event.target.style.display = 'none';
        document.body.style.overflow = 'auto';
    }
}

// Sidebar Toggle for Mobile
function toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    if (sidebar) {
        sidebar.classList.toggle('active');
    }
}

// Search Functionality
function handleSearch(searchInputId, tableId) {
    const input = document.getElementById(searchInputId);
    const table = document.getElementById(tableId);

    if (!input || !table) return;

    input.addEventListener('keyup', function () {
        const filter = this.value.toLowerCase();
        const rows = table.getElementsByTagName('tr');

        for (let i = 1; i < rows.length; i++) {
            const row = rows[i];
            const text = row.textContent || row.innerText;

            if (text.toLowerCase().indexOf(filter) > -1) {
                row.style.display = '';
            } else {
                row.style.display = 'none';
            }
        }
    });
}

// Filter Functionality
function handleFilter(filterId, tableId, columnIndex) {
    const filter = document.getElementById(filterId);
    const table = document.getElementById(tableId);

    if (!filter || !table) return;

    filter.addEventListener('change', function () {
        const filterValue = this.value.toLowerCase();
        const rows = table.getElementsByTagName('tr');

        for (let i = 1; i < rows.length; i++) {
            const row = rows[i];
            const cells = row.getElementsByTagName('td');

            if (cells.length > columnIndex) {
                const cellText = cells[columnIndex].textContent || cells[columnIndex].innerText;

                if (filterValue === '' || filterValue === 'all' || cellText.toLowerCase().indexOf(filterValue) > -1) {
                    row.style.display = '';
                } else {
                    row.style.display = 'none';
                }
            }
        }
    });
}

// Form Validation
function validateForm(formId) {
    const form = document.getElementById(formId);
    if (!form) return false;

    const inputs = form.querySelectorAll('input[required], select[required], textarea[required]');
    let isValid = true;

    inputs.forEach(input => {
        if (!input.value.trim()) {
            input.style.borderColor = '#dc3545';
            isValid = false;
        } else {
            input.style.borderColor = '#e0e0e0';
        }
    });

    return isValid;
}

// Show Success Message
function showSuccessMessage(message) {
    const alertDiv = document.createElement('div');
    alertDiv.className = 'alert alert-success';
    alertDiv.innerHTML = `
        <i class="fas fa-check-circle"></i> ${message}
        <button onclick="this.parentElement.remove()" style="float: right; background: none; border: none; color: inherit; cursor: pointer;">
            <i class="fas fa-times"></i>
        </button>
    `;
    alertDiv.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background-color: #d4edda;
        color: #155724;
        padding: 15px 20px;
        border-radius: 5px;
        box-shadow: 0 5px 15px rgba(0,0,0,0.2);
        z-index: 10000;
        min-width: 300px;
        animation: slideIn 0.3s ease;
    `;

    document.body.appendChild(alertDiv);

    setTimeout(() => {
        alertDiv.remove();
    }, 5000);
}

// Show Error Message
function showErrorMessage(message) {
    const alertDiv = document.createElement('div');
    alertDiv.className = 'alert alert-danger';
    alertDiv.innerHTML = `
        <i class="fas fa-exclamation-circle"></i> ${message}
        <button onclick="this.parentElement.remove()" style="float: right; background: none; border: none; color: inherit; cursor: pointer;">
            <i class="fas fa-times"></i>
        </button>
    `;
    alertDiv.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background-color: #f8d7da;
        color: #721c24;
        padding: 15px 20px;
        border-radius: 5px;
        box-shadow: 0 5px 15px rgba(0,0,0,0.2);
        z-index: 10000;
        min-width: 300px;
        animation: slideIn 0.3s ease;
    `;

    document.body.appendChild(alertDiv);

    setTimeout(() => {
        alertDiv.remove();
    }, 5000);
}

// Confirm Delete
function confirmDelete(itemName, callback) {
    if (confirm(`Are you sure you want to delete ${itemName}? This action cannot be undone.`)) {
        callback();
        showSuccessMessage(`${itemName} has been deleted successfully.`);
    }
}

// Export Data
function exportData(format, data, filename) {
    if (format === 'csv') {
        exportToCSV(data, filename);
    } else if (format === 'pdf') {
        showSuccessMessage('PDF export started. Download will begin shortly.');
    } else if (format === 'excel') {
        showSuccessMessage('Excel export started. Download will begin shortly.');
    }
}

function exportToCSV(data, filename) {
    const csv = data.map(row => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename + '.csv';
    a.click();
    window.URL.revokeObjectURL(url);
}

// Add animation keyframes
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from {
            transform: translateX(100%);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
    
    .modal {
        display: none;
        position: fixed;
        z-index: 9999;
        left: 0;
        top: 0;
        width: 100%;
        height: 100%;
        background-color: rgba(0, 0, 0, 0.5);
        align-items: center;
        justify-content: center;
    }
    
    .modal-content {
        background-color: white;
        padding: 30px;
        border-radius: 10px;
        max-width: 600px;
        width: 90%;
        max-height: 90vh;
        overflow-y: auto;
        box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
    }
    
    .modal-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 20px;
        padding-bottom: 15px;
        border-bottom: 2px solid #e9ecef;
    }
    
    .modal-header h3 {
        margin: 0;
        color: #333;
    }
    
    .close-modal {
        background: none;
        border: none;
        font-size: 1.5rem;
        cursor: pointer;
        color: #666;
        transition: color 0.3s;
    }
    
    .close-modal:hover {
        color: #dc3545;
    }
    
    .form-group {
        margin-bottom: 20px;
    }
    
    .form-group label {
        display: block;
        margin-bottom: 8px;
        color: #333;
        font-weight: 500;
    }
    
    .form-group input,
    .form-group select,
    .form-group textarea {
        width: 100%;
        padding: 12px;
        border: 2px solid #e0e0e0;
        border-radius: 5px;
        font-size: 0.95rem;
        transition: border-color 0.3s;
    }
    
    .form-group input:focus,
    .form-group select:focus,
    .form-group textarea:focus {
        outline: none;
        border-color: #0056b3;
    }
    
    .form-actions {
        display: flex;
        gap: 10px;
        justify-content: flex-end;
        margin-top: 25px;
    }
    
    .btn-submit {
        padding: 12px 25px;
        background-color: #0056b3;
        color: white;
        border: none;
        border-radius: 5px;
        cursor: pointer;
        font-weight: 500;
        transition: background-color 0.3s;
    }
    
    .btn-submit:hover {
        background-color: #003d82;
    }
    
    .btn-cancel {
        padding: 12px 25px;
        background-color: #6c757d;
        color: white;
        border: none;
        border-radius: 5px;
        cursor: pointer;
        font-weight: 500;
        transition: background-color 0.3s;
    }
    
    .btn-cancel:hover {
        background-color: #5a6268;
    }
`;
document.head.appendChild(style);

// Audit Logging Function (Wrapper for the new robust AuditLogger)
function logAudit(action, details, user = 'Admin') {
    if (typeof AuditLogger !== 'undefined') {
        AuditLogger.log(action, details, AuditLogger.SEVERITY.INFO, AuditLogger.PORTAL.ADMIN, 'General');
    } else {
        // Fallback to legacy structure if AuditLogger not loaded (should not happen if scripts are ordered correctly)
        const logs = JSON.parse(localStorage.getItem('auditLogs') || '[]');
        const newLog = {
            id: 'LOG-' + Date.now(),
            timestamp: new Date().toISOString(),
            user: user,
            action: action,
            details: details,
            severity: 'info',
            portal: 'Admin',
            category: 'General'
        };
        logs.unshift(newLog);
        if (logs.length > 1000) logs.pop();
        localStorage.setItem('auditLogs', JSON.stringify(logs));
    }
}
// Storage and User Management Helpers
function getStorageKey(role) {
    const map = {
        student: 'school_students',
        teacher: 'school_teachers',
        librarian: 'school_librarians',
        bursar: 'school_bursars',
        ancillary: 'ancillaryStaff',
        alumni: 'school_alumni',
        admin: 'adminUsers'
    };
    return map[role] || null;
}

// Multi-Tenant Storage Helpers
function getTenantKey(baseKey) {
    const activeCode = sessionStorage.getItem('activeSchoolCode');
    // If we have an active school code, use the prefixed key; otherwise fallback to global
    // (Legacy keys like 'adminUsers' are still supported for now, but will eventually migrate)
    return activeCode ? `acadex_${activeCode}_${baseKey}` : baseKey;
}

function getTenantData(baseKey, defaultVal = '[]') {
    const key = getTenantKey(baseKey);
    try {
        const data = localStorage.getItem(key);
        return data ? JSON.parse(data) : JSON.parse(defaultVal);
    } catch (e) {
        console.error(`Error loading tenant data for ${baseKey}:`, e);
        return JSON.parse(defaultVal);
    }
}

function saveTenantData(baseKey, data) {
    const key = getTenantKey(baseKey);
    try {
        localStorage.setItem(key, JSON.stringify(data));
        return true;
    } catch (e) {
        console.error(`Error saving tenant data for ${baseKey}:`, e);
        return false;
    }
}

window.resetUserPassword = function (id, role) {
    const key = getStorageKey(role);
    if (!key) return;

    if (!confirm('Are you sure you want to reset this user\'s password to "Password"? They will be forced to change it on their next login.')) return;

    let items = getTenantData(key, []);
    const idx = items.findIndex(u => (u.id || u.username || u.studentId || u.staffId) == id);

    if (idx === -1) {
        if (window.Toast) Toast.error('User not found.');
        else alert('User not found.');
        return;
    }

    items[idx].password = 'Password';
    items[idx].mustChangePassword = true;
    saveTenantData(key, items);

    if (window.AuditLogger) {
        AuditLogger.logSecurity('Account Security', `Reset password for user ${id} (${role})`);
    }

    if (window.Toast) Toast.success('Password reset to "Password". User will be prompted to change it at login.');
    else alert('Password reset to "Password". User will be prompted to change it at login.');
};
