// Bursar Supplier Management Logic
// Adapted from admin-suppliers.js for the Bursar Portal

// ── Data helpers ──────────────────────────────────────────────────────────────

function getSuppliers() {
    const stored = getTenantData('school_suppliers', 'null');
    return stored ? JSON.parse(stored) : [];
}

function saveSuppliers(data) {
    saveTenantData('school_suppliers', data);
}

// ── Compliance helpers ────────────────────────────────────────────────────────

function getComplianceLevel(expiryDateStr) {
    if (!expiryDateStr) return 'bad';
    const now = new Date();
    const exp = new Date(expiryDateStr);
    const diffDays = Math.ceil((exp - now) / (1000 * 60 * 60 * 24));
    if (diffDays < 0) return 'bad';
    if (diffDays <= 60) return 'warn';
    return 'ok';
}

function overallCompliance(supplier) {
    const tax = getComplianceLevel(supplier.taxExpiry);
    const praz = getComplianceLevel(supplier.prazExpiry);
    if (tax === 'bad' || praz === 'bad') return 'bad';
    if (tax === 'warn' || praz === 'warn') return 'warn';
    return 'ok';
}

function complianceLabel(level) {
    if (level === 'ok') return 'Compliant';
    if (level === 'warn') return 'Expiring Soon';
    return 'Expired';
}

// ── State ────────────────────────────────────────────────────────────────────

let suppliers = getSuppliers();
let filteredSuppliers = [...suppliers];
let currentPage = 1;
const itemsPerPage = 10;
let supplierToDeleteId = null;

// ── DOMContentLoaded ──────────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', function () {
    renderSummaryCards();
    renderSuppliers(suppliers);

    const searchInput = document.getElementById('supplierSearch');
    const statusFilter = document.getElementById('statusFilter');
    const complianceFilter = document.getElementById('complianceFilter');

    if (searchInput) searchInput.addEventListener('keyup', filterSuppliers);
    if (statusFilter) statusFilter.addEventListener('change', filterSuppliers);
    if (complianceFilter) complianceFilter.addEventListener('change', filterSuppliers);

    // Add form submit
    const addForm = document.getElementById('addSupplierForm');
    if (addForm) {
        addForm.addEventListener('submit', function (e) {
            e.preventDefault();

            const email = document.getElementById('newEmail').value.trim();

            if (suppliers.some(s => s.email === email)) {
                alert('A supplier with this email already exists!');
                return;
            }

            const newSupplier = {
                id: 'SUP-' + Math.random().toString(36).substr(2, 6).toUpperCase(),
                companyName: document.getElementById('newCompanyName').value.trim(),
                regNo: document.getElementById('newRegNo').value.trim(),
                incorpYear: document.getElementById('newIncorpYear').value.trim(),
                address: document.getElementById('newAddress').value.trim(),
                contactPerson: document.getElementById('newContactPerson').value.trim(),
                designation: document.getElementById('newDesignation').value.trim(),
                email: email,
                phone: document.getElementById('newPhone').value.trim(),
                prazNo: document.getElementById('newPrazNo').value.trim(),
                prazExpiry: document.getElementById('newPrazExpiry').value,
                taxExpiry: document.getElementById('newTaxExpiry').value,
                password: document.getElementById('newPassword').value,
                status: document.getElementById('newStatus').value,
                complianceStatus: 'Active',
                registeredAt: new Date().toISOString()
            };

            suppliers.push(newSupplier);
            saveSuppliers(suppliers);
            filterSuppliers();
            renderSummaryCards();

            if (typeof closeModal === 'function') closeModal('addSupplierModal');
            addForm.reset();
            alert('Supplier added successfully!');
        });
    }

    // Edit form submit
    const editForm = document.getElementById('editSupplierForm');
    if (editForm) {
        editForm.addEventListener('submit', handleEditSubmit);
    }

    // Delete confirm button
    const confirmDeleteBtn = document.getElementById('confirmDeleteSupplierBtn');
    if (confirmDeleteBtn) {
        confirmDeleteBtn.addEventListener('click', executeDelete);
    }
});

// ── Summary Cards ─────────────────────────────────────────────────────────────

function renderSummaryCards() {
    const allSuppliers = getSuppliers();
    const total = allSuppliers.length;
    const approved = allSuppliers.filter(s => s.status === 'Approved').length;
    const pending = allSuppliers.filter(s => s.status === 'Pending Verification').length;
    const expiring = allSuppliers.filter(s => {
        const c = overallCompliance(s);
        return c === 'warn' || c === 'bad';
    }).length;

    const el = id => document.getElementById(id);
    if (el('totalSuppliers')) el('totalSuppliers').textContent = total;
    if (el('approvedSuppliers')) el('approvedSuppliers').textContent = approved;
    if (el('pendingSuppliers')) el('pendingSuppliers').textContent = pending;
    if (el('expiringSuppliers')) el('expiringSuppliers').textContent = expiring;
}

// ── Render Table ──────────────────────────────────────────────────────────────

function renderSuppliers(data) {
    const tableBody = document.getElementById('suppliersTableBody');
    if (!tableBody) return;

    filteredSuppliers = data;
    tableBody.innerHTML = '';

    const startIndex = (currentPage - 1) * itemsPerPage;
    const paginatedData = filteredSuppliers.slice(startIndex, startIndex + itemsPerPage);

    if (paginatedData.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="8" style="text-align:center; padding: 20px; color:#888;">No suppliers found</td></tr>';
        renderPagination(0);
        return;
    }

    paginatedData.forEach(supplier => {
        const statusKey = supplier.status ? supplier.status.replace(/\s+/g, '').toLowerCase() : 'pending';
        const compliance = overallCompliance(supplier);
        const initials = (supplier.companyName || 'S').split(' ').map(w => w[0]).join('').substring(0, 2).toUpperCase();

        const avatarColors = {
            'approved': '#28a745',
            'pendingverification': '#ffc107',
            'rejected': '#dc3545'
        };
        const avatarColor = avatarColors[statusKey] || '#0056b3';

        const row = document.createElement('tr');
        row.innerHTML = `
            <td style="font-family:monospace; font-weight:600;">${supplier.id}</td>
            <td>
                <div class="supplier-info">
                    <div class="supplier-avatar" style="background-color:${avatarColor}">${initials}</div>
                    <div>
                        <div style="font-weight:600;">${supplier.companyName}</div>
                        <div style="font-size:0.75rem; color:#888;">${supplier.regNo || 'N/A'}</div>
                    </div>
                </div>
            </td>
            <td>
                <div style="font-weight:500;">${supplier.contactPerson || 'N/A'}</div>
                <div style="font-size:0.75rem; color:#888;">${supplier.designation || ''}</div>
            </td>
            <td>${supplier.email}</td>
            <td>${supplier.phone || '-'}</td>
            <td><span class="compliance-badge compliance-${compliance}">${complianceLabel(compliance)}</span></td>
            <td>${supplier.category || 'General'}</td>
            <td><span class="status-badge status-${statusKey}">${supplier.status}</span></td>
            <td>
                <div class="action-buttons">
                    <button class="btn-icon btn-view" onclick="viewSupplier('${supplier.id}')" title="View Details"><i class="fas fa-eye"></i></button>
                    <button class="btn-icon btn-edit" onclick="editSupplier('${supplier.id}')" title="Edit"><i class="fas fa-edit"></i></button>
                    ${supplier.status !== 'Approved' ? `<button class="btn-icon btn-approve-icon" onclick="approveSupplier('${supplier.id}')" title="Approve"><i class="fas fa-check"></i></button>` : ''}
                    <button class="btn-icon btn-delete" onclick="prepareDeleteSupplier('${supplier.id}')" title="Delete"><i class="fas fa-trash"></i></button>
                </div>
            </td>
        `;
        tableBody.appendChild(row);
    });

    renderPagination(filteredSuppliers.length);
}

// ── Pagination ────────────────────────────────────────────────────────────────

function renderPagination(totalItems) {
    const container = document.getElementById('supplierPagination');
    if (!container) return;
    const totalPages = Math.ceil(totalItems / itemsPerPage);
    container.innerHTML = '';
    if (totalPages <= 1) return;

    const prev = document.createElement('button');
    prev.innerHTML = '<i class="fas fa-chevron-left"></i>';
    prev.disabled = currentPage === 1;
    prev.onclick = () => { if (currentPage > 1) { currentPage--; renderSuppliers(filteredSuppliers); } };
    container.appendChild(prev);

    for (let i = 1; i <= totalPages; i++) {
        const btn = document.createElement('button');
        btn.innerText = i;
        if (i === currentPage) btn.className = 'active';
        btn.onclick = () => { currentPage = i; renderSuppliers(filteredSuppliers); };
        container.appendChild(btn);
    }

    const next = document.createElement('button');
    next.innerHTML = '<i class="fas fa-chevron-right"></i>';
    next.disabled = currentPage === totalPages;
    next.onclick = () => { if (currentPage < totalPages) { currentPage++; renderSuppliers(filteredSuppliers); } };
    container.appendChild(next);
}

// ── Filter Function ───────────────────────────────────────────────────────────

function filterSuppliers() {
    const search = (document.getElementById('supplierSearch')?.value || '').toLowerCase();
    const status = document.getElementById('statusFilter')?.value || '';
    const compliance = document.getElementById('complianceFilter')?.value || '';

    const filtered = suppliers.filter(s => {
        const matchesSearch = !search ||
            s.companyName.toLowerCase().includes(search) ||
            (s.contactPerson && s.contactPerson.toLowerCase().includes(search)) ||
            s.email.toLowerCase().includes(search) ||
            s.id.toLowerCase().includes(search) ||
            (s.regNo && s.regNo.toLowerCase().includes(search));

        const matchesStatus = !status || s.status === status;
        const matchesCompliance = !compliance || overallCompliance(s) === compliance;

        return matchesSearch && matchesStatus && matchesCompliance;
    });

    currentPage = 1;
    renderSuppliers(filtered);
}

// ── View Action ───────────────────────────────────────────────────────────────

window.viewSupplier = function (id) {
    const s = suppliers.find(sup => sup.id === id);
    if (!s) return;

    const content = document.getElementById('viewSupplierContent');
    const taxLevel = getComplianceLevel(s.taxExpiry);
    const prazLevel = getComplianceLevel(s.prazExpiry);
    const statusKey = (s.status || '').replace(/\s+/g, '').toLowerCase();

    content.innerHTML = `
        <div style="display:flex; align-items:center; margin-bottom:20px; gap:15px;">
            <div style="width:60px; height:60px; border-radius:50%; background:#0056b3; color:white; display:flex; align-items:center; justify-content:center; font-size:1.4rem; font-weight:700; flex-shrink:0;">
                ${(s.companyName || 'S').split(' ').map(w => w[0]).join('').substring(0, 2).toUpperCase()}
            </div>
            <div>
                <h4 style="margin:0; font-size:1.15rem;">${s.companyName}</h4>
                <p style="margin:3px 0 0; color:#888; font-size:0.85rem;">${s.id} &nbsp;|&nbsp; Reg. No: ${s.regNo || 'N/A'}</p>
                <span class="status-badge status-${statusKey}" style="font-size:0.8rem; margin-top:5px; display:inline-block;">${s.status}</span>
            </div>
            <div style="background: #f8fafc; padding: 15px; border-radius: 12px;">
                <p style="margin:0 0 5px; color:#64748b; font-size:0.75rem;">BUSINESS CATEGORY</p>
                <p style="margin:0; font-weight:600; color:#1e293b; font-size:1.1rem;">${s.category || 'General Services'}</p>
            </div>
        </div>

        <div style="display:grid; grid-template-columns:1fr 1fr; gap:12px; margin-bottom:20px;">
            <div><strong>Contact Person:</strong><br>${s.contactPerson || 'N/A'}</div>
            <div><strong>Designation:</strong><br>${s.designation || 'N/A'}</div>
            <div><strong>Email:</strong><br>${s.email}</div>
            <div><strong>Phone:</strong><br>${s.phone || 'N/A'}</div>
            <div><strong>Year of Incorporation:</strong><br>${s.incorpYear || 'N/A'}</div>
            <div><strong>Registered:</strong><br>${new Date(s.registeredAt || Date.now()).toLocaleDateString()}</div>
            <div style="grid-column:1/-1;"><strong>Address:</strong><br>${s.address || 'N/A'}</div>
        </div>

        <div style="border-top:1px solid #eee; padding-top:15px; margin-bottom:15px;">
            <h5 style="color:#64748b; margin-bottom:12px;"><i class="fas fa-file-contract"></i> Compliance Documents</h5>
            <div style="display:grid; grid-template-columns:1fr 1fr 1fr; gap:12px;">
                <div class="doc-preview-card" style="padding:12px; border:1px solid ${taxLevel === 'ok' ? '#28a745' : taxLevel === 'warn' ? '#ffc107' : '#dc3545'}; border-radius:8px; background:#f8fafc; cursor:pointer;" onclick="openDocumentViewer('${s.id}', 'taxDoc')">
                    <div style="font-weight:600; font-size:0.85rem;">Tax Clearance</div>
                    <span class="compliance-badge compliance-${taxLevel}">${complianceLabel(taxLevel)}</span>
                </div>
                <div class="doc-preview-card" style="padding:12px; border:1px solid ${prazLevel === 'ok' ? '#28a745' : prazLevel === 'warn' ? '#ffc107' : '#dc3545'}; border-radius:8px; background:#f8fafc; cursor:pointer;" onclick="openDocumentViewer('${s.id}', 'prazDoc')">
                    <div style="font-weight:600; font-size:0.85rem;">PRAZ Reg</div>
                    <span class="compliance-badge compliance-${prazLevel}">${complianceLabel(prazLevel)}</span>
                </div>
                <div class="doc-preview-card" style="padding:12px; border:1px solid #10b981; border-radius:8px; background:#f8fafc; cursor:pointer;" onclick="openDocumentViewer('${s.id}', 'certDoc')">
                    <div style="font-weight:600; font-size:0.85rem;">Cert of Incorp.</div>
                    <span class="compliance-badge compliance-ok">Uploaded</span>
                </div>
            </div>
        </div>

        <div style="display:flex; gap:10px; justify-content:flex-end; flex-wrap:wrap;">
            ${s.status !== 'Approved' ? `<button class="btn btn-primary" onclick="approveSupplier('${s.id}'); closeModal('viewSupplierModal');">Approve</button>` : ''}
            <button class="btn btn-primary" style="background:#ffc107; color:#333;" onclick="closeModal('viewSupplierModal'); editSupplier('${s.id}');">Edit</button>
        </div>
    `;

    if (typeof openModal === 'function') openModal('viewSupplierModal');
};

// ── Edit Action ───────────────────────────────────────────────────────────────

window.editSupplier = function (id) {
    const s = suppliers.find(sup => sup.id === id);
    if (!s) return;

    document.getElementById('editSupplierId').value = s.id;
    document.getElementById('editCompanyName').value = s.companyName || '';
    document.getElementById('editRegNo').value = s.regNo || '';
    document.getElementById('editIncorpYear').value = s.incorpYear || '';
    document.getElementById('editAddress').value = s.address || '';
    document.getElementById('editContactPerson').value = s.contactPerson || '';
    document.getElementById('editDesignation').value = s.designation || '';
    document.getElementById('editEmail').value = s.email || '';
    document.getElementById('editPhone').value = s.phone || '';
    document.getElementById('editPrazNo').value = s.prazNo || '';
    document.getElementById('editPrazExpiry').value = s.prazExpiry || '';
    document.getElementById('editTaxExpiry').value = s.taxExpiry || '';
    document.getElementById('editStatus').value = s.status || 'Pending Verification';

    if (typeof openModal === 'function') openModal('editSupplierModal');
};

function handleEditSubmit(e) {
    e.preventDefault();
    const id = document.getElementById('editSupplierId').value;
    const idx = suppliers.findIndex(s => s.id === id);
    if (idx === -1) return;

    suppliers[idx].companyName = document.getElementById('editCompanyName').value.trim();
    suppliers[idx].regNo = document.getElementById('editRegNo').value.trim();
    suppliers[idx].incorpYear = document.getElementById('editIncorpYear').value.trim();
    suppliers[idx].address = document.getElementById('editAddress').value.trim();
    suppliers[idx].contactPerson = document.getElementById('editContactPerson').value.trim();
    suppliers[idx].designation = document.getElementById('editDesignation').value.trim();
    suppliers[idx].email = document.getElementById('editEmail').value.trim();
    suppliers[idx].phone = document.getElementById('editPhone').value.trim();
    suppliers[idx].prazNo = document.getElementById('editPrazNo').value.trim();
    suppliers[idx].prazExpiry = document.getElementById('editPrazExpiry').value;
    suppliers[idx].taxExpiry = document.getElementById('editTaxExpiry').value;
    suppliers[idx].status = document.getElementById('editStatus').value;

    saveSuppliers(suppliers);
    filterSuppliers();
    renderSummaryCards();

    if (typeof closeModal === 'function') closeModal('editSupplierModal');
    alert('Supplier updated successfully!');
}

// ── Approve ──────────────────────────────────────────────────────────

window.approveSupplier = function (id) {
    const idx = suppliers.findIndex(s => s.id === id);
    if (idx === -1) return;
    suppliers[idx].status = 'Approved';
    saveSuppliers(suppliers);
    filterSuppliers();
    renderSummaryCards();
    alert('Supplier approved!');
};

// ── Delete Action ─────────────────────────────────────────────────────────────

window.prepareDeleteSupplier = function (id) {
    supplierToDeleteId = id;
    if (typeof openModal === 'function') openModal('deleteSupplierModal');
};

function executeDelete() {
    if (!supplierToDeleteId) return;
    suppliers = suppliers.filter(s => s.id !== supplierToDeleteId);
    saveSuppliers(suppliers);
    filterSuppliers();
    renderSummaryCards();
    supplierToDeleteId = null;
    if (typeof closeModal === 'function') closeModal('deleteSupplierModal');
    alert('Supplier deleted successfully!');
}

// ── Document Viewer ──────────────────────────────────────────────────────────

window.openDocumentViewer = function (supplierId, docKey) {
    const s = suppliers.find(sup => sup.id === supplierId);
    if (!s) return;
    
    let title = '';
    let docData = '';
    
    if (docKey === 'taxDoc') {
        title = 'Tax Clearance (ITF263)';
        docData = s.taxDoc;
    } else if (docKey === 'prazDoc') {
        title = 'PRAZ Registration';
        docData = s.prazDoc;
    } else if (docKey === 'certDoc') {
        title = 'Certificate of Incorporation';
        docData = s.certDoc;
    }

    document.getElementById('docViewerTitle').innerText = title;
    const body = document.getElementById('docViewerBody');
    
    if (!docData) {
        body.innerHTML = '<h3>No Document Uploaded</h3>';
    } else if (docData.startsWith('data:image')) {
        body.innerHTML = `<img src="${docData}" style="max-width: 100%; max-height: 100%; object-fit: contain;" />`;
    } else if (docData.startsWith('data:application/pdf')) {
        body.innerHTML = `<iframe src="${docData}" style="width: 100%; height: 100%; border: none;"></iframe>`;
    }
    
    if (typeof openModal === 'function') openModal('documentViewerModal');
};

window.closeDocumentViewer = function () {
    if (typeof closeModal === 'function') closeModal('documentViewerModal');
};

