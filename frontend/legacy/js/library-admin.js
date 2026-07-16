// Library Admin JavaScript - Consolidated Logic

// --- Configurations & Helpers ---
const CONFIG = {
    toastDuration: 3000
};

// Toast Notification Helper - Replaces alerts
function showSuccessMessage(msg) {
    let container = document.getElementById('toast-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'toast-container';
        container.style.cssText = 'position: fixed; bottom: 20px; right: 20px; z-index: 9999;';
        document.body.appendChild(container);
    }
    const toast = document.createElement('div');
    toast.style.cssText = 'background: #10b981; color: white; padding: 12px 25px; border-radius: 8px; margin-top: 10px; box-shadow: 0 4px 12px rgba(0,0,0,0.15); display: flex; align-items: center; gap: 10px; font-family: "Poppins", sans-serif; opacity: 0; transition: opacity 0.5s;';
    toast.innerHTML = `<i class="fas fa-check-circle"></i> <span>${msg}</span>`;
    container.appendChild(toast);

    // Trigger reflow for transition
    void toast.offsetWidth;
    toast.style.opacity = '1';

    setTimeout(() => {
        toast.style.opacity = '0';
        setTimeout(() => toast.remove(), 500);
    }, CONFIG.toastDuration);
}

function showErrorMessage(msg) {
    let container = document.getElementById('toast-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'toast-container';
        container.style.cssText = 'position: fixed; bottom: 20px; right: 20px; z-index: 9999;';
        document.body.appendChild(container);
    }
    const toast = document.createElement('div');
    toast.style.cssText = 'background: #e74a3b; color: white; padding: 12px 25px; border-radius: 8px; margin-top: 10px; box-shadow: 0 4px 12px rgba(0,0,0,0.15); display: flex; align-items: center; gap: 10px; font-family: "Poppins", sans-serif; opacity: 0; transition: opacity 0.5s;';
    toast.innerHTML = `<i class="fas fa-exclamation-triangle"></i> <span>${msg}</span>`;
    container.appendChild(toast);

    void toast.offsetWidth;
    toast.style.opacity = '1';

    setTimeout(() => {
        toast.style.opacity = '0';
        setTimeout(() => toast.remove(), 500);
    }, 4000);
}

// Download Simulator
function simulateDownload(filename, text) {
    const element = document.createElement('a');
    element.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(text));
    element.setAttribute('download', filename);
    element.style.display = 'none';
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
}

// --- Data Management (LocalStorage) ---

function loadBooks() {
    const defaultBooks = [
        { id: '1001', title: 'Calculus: Early Transcendentals', author: 'James Stewart', category: 'Mathematics', isbn: '978-0538497909', available: 12, totalCopies: 15, status: 'Active' },
        { id: '1002', title: 'Biology: A Global Approach', author: 'Neil A. Campbell', category: 'Science', isbn: '978-1292170435', available: 5, totalCopies: 8, status: 'Active' },
        { id: '1003', title: 'Things Fall Apart', author: 'Chinua Achebe', category: 'Literature', isbn: '978-0385474542', available: 20, totalCopies: 25, status: 'Active' },
        { id: '1004', title: 'World History', author: 'William J. Duiker', category: 'History', isbn: '978-1133606581', available: 3, totalCopies: 5, status: 'Low Stock' }
    ];
    const stored = getTenantData('libraryBooks', 'null');
    return stored ? JSON.parse(stored) : defaultBooks;
}

function saveBooks(books) {
    saveTenantData(, );
}

function loadTransactions() {
    const stored = getTenantData('libraryTransactions', 'null');
    return stored ? JSON.parse(stored) : [];
}

function saveTransactions(trans) {
    saveTenantData(, );
}

// --- HR & Services Management ---
function loadLeaveRequests() {
    return getTenantData(, '[]');
}

function saveLeaveRequests(requests) {
    saveTenantData(, );
}

function submitLeaveRequest(e) {
    e.preventDefault();
    const type = document.getElementById('leaveType').value;
    const start = document.getElementById('leaveStartDate').value;
    const end = document.getElementById('leaveEndDate').value;
    const reason = document.getElementById('leaveReason').value;

    // Simple validation
    if (new Date(start) > new Date(end)) {
        showErrorMessage('End date cannot be before start date.');
        return;
    }

    const requests = loadLeaveRequests();

    // Calculate days diff
    const diffTime = Math.abs(new Date(end) - new Date(start));
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;

    const newReq = {
        id: 'LR-' + Date.now().toString().slice(-6),
        type, start, end, days: diffDays, reason,
        status: 'Pending',
        dateRequested: new Date().toISOString()
    };

    requests.unshift(newReq); // Add to top
    saveLeaveRequests(requests);

    showSuccessMessage(`Leave request submitted for ${diffDays} days.`);
    closeModal('leaveRequestModal');
    renderLeaveHistory();
    e.target.reset();
}

function renderLeaveHistory() {
    const tbody = document.getElementById('leaveRequestsTable');
    if (!tbody) return;

    const requests = loadLeaveRequests();
    tbody.innerHTML = '';

    if (requests.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4" style="text-align:center; color:#888;">No leave history found.</td></tr>';
        return;
    }

    requests.forEach(req => {
        const badgeColor = req.status === 'Approved' ? 'bg-success' : (req.status === 'Pending' ? 'bg-warning' : 'bg-danger');
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${req.type}</td>
            <td>${req.start} - ${req.end}</td>
            <td>${req.days} Days</td>
            <td><span class="badge ${badgeColor}">${req.status}</span></td>
        `;
        tbody.appendChild(row);
    });
}

// --- IT Support Management ---
function loadTickets() {
    return getTenantData(, '[]');
}

function saveTickets(tickets) {
    saveTenantData(, );
}

function submitTicket(e) {
    e.preventDefault();
    const category = document.querySelector('select').value; // Basic select targeting
    const urgency = document.querySelectorAll('select')[1].value;
    const subject = document.querySelector('input[type="text"]').value;
    const desc = document.querySelector('textarea').value;

    if (!subject || !desc) {
        showErrorMessage('Please fill in all details.');
        return;
    }

    const tickets = loadTickets();
    const newTicket = {
        id: 'T-' + Date.now().toString().slice(-6),
        category, urgency, subject, desc,
        status: 'Open',
        date: new Date().toISOString().split('T')[0]
    };

    tickets.unshift(newTicket);
    saveTickets(tickets);

    showSuccessMessage('Support ticket submitted successfully!');
    renderRecentTickets();
    e.target.reset();
}

function renderRecentTickets() {
    const container = document.getElementById('ticketHistory');
    if (!container) return;

    const tickets = loadTickets();
    container.innerHTML = '';

    if (tickets.length === 0) {
        container.innerHTML = '<div style="font-size: 0.85rem; color: #888; text-align: center; padding: 20px 0;">No active tickets.</div>';
        return;
    }

    tickets.slice(0, 5).forEach(t => {
        const div = document.createElement('div');
        div.style.cssText = 'padding: 15px; border-bottom: 1px solid #eee; display: flex; justify-content: space-between; align-items: center; text-align: left;';
        div.innerHTML = `
            <div>
                <div style="font-weight: 600; color: #333; margin-bottom: 2px;">${t.subject}</div>
                <div style="font-size: 0.75rem; color: #888;">${t.id} • ${t.category}</div>
            </div>
            <span class="badge ${t.status === 'Open' ? 'bg-warning' : 'bg-success'}">${t.status}</span>
        `;
        container.appendChild(div);
    });
}


// --- Book Management Functions ---

function renderBooksTable(filter = '') {
    const books = loadBooks();
    const tbody = document.getElementById('booksTableBody');
    if (!tbody) return;

    tbody.innerHTML = '';
    const filteredBooks = books.filter(b =>
        b.title.toLowerCase().includes(filter.toLowerCase()) ||
        b.author.toLowerCase().includes(filter.toLowerCase()) ||
        b.isbn.includes(filter)
    );

    filteredBooks.forEach(book => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${book.id}</td>
            <td>
                <div style="font-weight: 500;">${book.title}</div>
                <div style="font-size: 0.8rem; color: #888;">${book.author}</div>
            </td>
            <td>${book.category}</td>
            <td>${book.isbn}</td>
            <td style="text-align: center;">${book.available} / ${book.totalCopies}</td>
            <td><span class="badge ${book.status === 'Active' ? 'bg-success' : 'bg-warning'}">${book.status}</span></td>
            <td>
                <button class="btn btn-sm btn-outline" onclick="openEditBookModal('${book.id}')"><i class="fas fa-edit"></i></button>
                <button class="btn btn-sm btn-outline" onclick="deleteBook('${book.id}')" style="color: #e74a3b; border-color: #e74a3b;"><i class="fas fa-trash"></i></button>
            </td>
        `;
        tbody.appendChild(row);
    });
}

function addBook(e) {
    if (e) e.preventDefault();

    // Get form values
    const title = document.getElementById('newBookTitle').value;
    const author = document.getElementById('newBookAuthor').value;
    const category = document.getElementById('newBookCategory').value;
    const isbn = document.getElementById('newBookISBN').value;
    const copies = parseInt(document.getElementById('newBookCopies').value);

    if (!title || !author || !isbn) {
        showErrorMessage('Please fill in all required fields');
        return;
    }

    const books = loadBooks();
    const newBook = {
        id: (1000 + books.length + 1).toString(),
        title, author, category, isbn,
        totalCopies: copies,
        available: copies,
        status: copies > 0 ? 'Active' : 'Out of Stock'
    };

    books.push(newBook);
    saveBooks(books);

    showSuccessMessage('Book added successfully!');
    closeModal('addBookModal');
    renderBooksTable();
    document.getElementById('addBookForm').reset();
}

function deleteBook(id) {
    if (confirm('Are you sure you want to delete this book?')) {
        let books = loadBooks();
        books = books.filter(b => b.id !== id);
        saveBooks(books);
        renderBooksTable();
        showSuccessMessage('Book deleted successfully');
    }
}

function openEditBookModal(id) {
    const books = loadBooks();
    const book = books.find(b => b.id === id);
    if (!book) return;

    document.getElementById('editBookId').value = book.id;
    document.getElementById('editBookTitle').value = book.title;
    document.getElementById('editBookAuthor').value = book.author;
    document.getElementById('editBookCategory').value = book.category;
    document.getElementById('editBookISBN').value = book.isbn;
    document.getElementById('editBookCopies').value = book.totalCopies;

    openModal('editBookModal');
}

function saveEditedBook(e) {
    e.preventDefault();
    const id = document.getElementById('editBookId').value;
    const books = loadBooks();
    const index = books.findIndex(b => b.id === id);

    if (index !== -1) {
        books[index].title = document.getElementById('editBookTitle').value;
        books[index].author = document.getElementById('editBookAuthor').value;
        books[index].category = document.getElementById('editBookCategory').value;
        books[index].isbn = document.getElementById('editBookISBN').value;
        books[index].totalCopies = parseInt(document.getElementById('editBookCopies').value);
        // Logic to adjust available copies if total changes could be added here

        saveBooks(books);
        showSuccessMessage('Book updated details saved.');
        closeModal('editBookModal');
        renderBooksTable();
    }
}

// --- Circulation Desk Functions ---

function renderTransactionsTable() {
    const trans = loadTransactions();
    const tbody = document.getElementById('transactionsTableBody');
    if (!tbody) return;

    // Use mock data if empty for demo
    if (trans.length === 0) {
        const mockTrans = [
            { id: 'TRX-001', student: 'Tendai M.', book: 'The Great Gatsby', bookId: '1008', date: '2023-10-25', returnDate: '2023-11-08', status: 'overdue' },
            { id: 'TRX-002', student: 'Sarah K.', book: 'Calculus 1', bookId: '1001', date: '2023-11-01', returnDate: '2023-11-15', status: 'borrowed' }
        ];
        saveTransactions(mockTrans);
        renderTransactionsTable(); // Re-run with mock data
        return;
    }

    tbody.innerHTML = '';
    trans.forEach(t => {
        let statusBadge = '';
        if (t.status === 'borrowed') statusBadge = '<span class="badge bg-warning">Borrowed</span>';
        else if (t.status === 'returned') statusBadge = '<span class="badge bg-success">Returned</span>';
        else if (t.status === 'overdue') statusBadge = '<span class="badge bg-danger">Overdue</span>';

        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${t.id}</td>
            <td>${t.student}</td>
            <td>${t.book}</td>
            <td>${t.date}</td>
            <td>${t.returnDate}</td>
            <td>${statusBadge}</td>
            <td>
                ${t.status !== 'returned' ? `<button class="btn btn-sm btn-primary" onclick="markReturned('${t.id}')">Return</button>` : '<span style="color:#aaa;"><i class="fas fa-check"></i></span>'}
            </td>
        `;
        tbody.appendChild(row);
    });
}

function issueBook() {
    const studentId = document.getElementById('issueStudentId').value;
    const bookId = document.getElementById('issueBookId').value;

    if (!studentId || !bookId) {
        showErrorMessage('Please enter both User ID and Book details.');
        return;
    }

    // Check book availability
    const books = loadBooks();
    const bookIndex = books.findIndex(b => b.id === bookId || b.isbn === bookId);

    if (bookIndex === -1) {
        showErrorMessage('Book not found in catalog.');
        return;
    }
    if (books[bookIndex].available <= 0) {
        showErrorMessage('Book is currently unavailable.');
        return;
    }

    // Create transaction
    const trans = loadTransactions();
    const newTrans = {
        id: 'TRX-' + (trans.length + 100).toString(),
        student: studentId, // Ideally look up name
        book: books[bookIndex].title,
        bookId: books[bookIndex].id,
        date: new Date().toISOString().split('T')[0],
        returnDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // +14 days
        status: 'borrowed'
    };

    trans.push(newTrans);
    books[bookIndex].available--;

    saveTransactions(trans);
    saveBooks(books);

    showSuccessMessage('Book issued successfully!');
    document.getElementById('issueStudentId').value = '';
    document.getElementById('issueBookId').value = '';
    renderTransactionsTable();
}

function markReturned(id) {
    const trans = loadTransactions();
    const index = trans.findIndex(t => t.id === id);
    if (index === -1) return;

    if (trans[index].status === 'returned') {
        showErrorMessage('Book already returned.');
        return;
    }

    const books = loadBooks();
    const bookIndex = books.findIndex(b => b.id === trans[index].bookId);
    if (bookIndex !== -1) books[bookIndex].available++;

    trans[index].status = 'returned';
    saveTransactions(trans);
    saveBooks(books);

    showSuccessMessage('Book return processed successfully!');
    renderTransactionsTable();
}

// --- Staff Directory & Operations (Ported from previous code) ---
function loadStaffData() {
    const defaultStaff = [
        { id: 'STF001', name: 'Sarah Johnson', role: 'Head Librarian', email: 's.johnson@school.edu', phone: '+263 77 123 4567', status: 'Active' },
        { id: 'STF002', name: 'Mike Peters', role: 'Assistant Librarian', email: 'm.peters@school.edu', phone: '+263 77 987 6543', status: 'Active' },
        { id: 'STF003', name: 'Emily White', role: 'Library Intern', email: 'e.white@school.edu', phone: '+263 71 234 5678', status: 'On Leave' }
    ];
    return JSON.parse(getTenantData('libStaff', 'null') || JSON.stringify(defaultStaff));
}

function renderStaffGrid(filter = '') {
    const grid = document.getElementById('staffGrid');
    if (!grid) return;

    const staff = loadStaffData();
    grid.innerHTML = '';

    const filtered = staff.filter(s => s.name.toLowerCase().includes(filter.toLowerCase()) || s.role.toLowerCase().includes(filter.toLowerCase()));

    filtered.forEach(s => {
        const div = document.createElement('div');
        div.className = 'glass-card';
        div.style.padding = '20px';
        div.style.textAlign = 'center';
        div.innerHTML = `
            <div style="width: 80px; height: 80px; background: #eee; border-radius: 50%; margin: 0 auto 15px; display: flex; align-items: center; justify-content: center; font-size: 1.5rem; color: #888;">
                <i class="fas fa-user"></i>
            </div>
            <h4 style="margin: 0 0 5px 0;">${s.name}</h4>
            <div style="color: #4e73df; font-size: 0.9rem; margin-bottom: 15px;">${s.role}</div>
             <div style="font-size: 0.85rem; color: #666; margin-bottom: 5px;"><i class="fas fa-envelope"></i> ${s.email}</div>
             <div style="font-size: 0.85rem; color: #666; margin-bottom: 15px;"><i class="fas fa-phone"></i> ${s.phone}</div>
             <button class="btn btn-sm btn-outline" style="width: 100%;">Contact</button>
        `;
        grid.appendChild(div);
    });
}

// --- Procurement & Assets (Consolidated with Ancillary style) ---
const DB_KEYS = {
    REQUISITIONS: 'purchaseRequisitions',
};

// Current Librarian User from session
const currentUser = JSON.parse(sessionStorage.getItem('libUser')) || { name: 'Librarian', role: 'library', dept: 'Library', email: 'library@embakwe.co.zw' };
const userEmail = currentUser.email;
const userRole = currentUser.role || 'library';
const userDept = currentUser.dept || 'Library';
const secondaryRoles = currentUser.secondaryRoles || [];

const isHOD = secondaryRoles.includes('Head of Department') || userRole === 'admin';
const isProcurementOfficer = secondaryRoles.includes('Procurement Officer') || userRole === 'admin';
const isBursar = userRole === 'bursar' || userRole === 'admin';

function loadRequisitions() {
    return getTenantData(, '[]');
}

function saveRequisitions(data) {
    saveTenantData(, );
}

function renderRequisitions() {
    const recentGrid = document.getElementById('recentRequisitionsCards');
    const fullGrid = document.getElementById('fullRequisitionsCards');
    if (!recentGrid && !fullGrid) return;

    const allReqs = loadRequisitions().reverse();
    
    // Librarian sees their own or their dept if HOD
    let myReqs = allReqs;
    if (!isHOD && !isProcurementOfficer && !isBursar) {
        myReqs = allReqs.filter(r => r.requesterEmail === userEmail);
    } else if (isHOD && !isProcurementOfficer && !isBursar) {
        myReqs = allReqs.filter(r => r.dept === userDept || r.requesterEmail === userEmail);
    }

    const pendingCount = myReqs.filter(r => r.status === 'Pending' || r.status === 'HOD Approved').length;
    const approvedCount = myReqs.filter(r => r.status === 'Bursar Approved').length;
    
    if (document.getElementById('pendingCount')) document.getElementById('pendingCount').textContent = pendingCount;
    if (document.getElementById('approvedCount')) document.getElementById('approvedCount').textContent = approvedCount;

    function createCard(r) {
        const card = document.createElement('div');
        card.className = 'requisition-card';
        const statusClass = r.status.toLowerCase().replace(/\s+/g, '-');
        
        let actionBtn = '';
        if ((r.status === 'Pending' && isHOD) || (r.status === 'HOD Approved' && (isBursar || isProcurementOfficer))) {
            actionBtn = `<button onclick="openReviewModal('${r.id}')" class="btn-view" style="background:#4e73df; color:white; border:none;">Review & Approve</button>`;
        } else {
            actionBtn = `<button onclick="openReviewModal('${r.id}')" class="btn-view">${r.status === 'Rejected' ? 'View Reason' : 'View Details'}</button>`;
        }

        card.innerHTML = `
            <div class="req-info">
                <span class="req-id">#${r.id}</span>
                <h4 class="req-title">${r.description}</h4>
                <div class="req-date">
                    <i class="far fa-calendar-alt"></i> ${r.date} 
                    <span style="margin-left:15px; color:#1e293b; font-weight:600;">$${parseFloat(r.cost).toFixed(2)}</span>
                    <span style="margin-left:10px; font-style:italic; font-size:0.75rem;">by ${r.requesterName}</span>
                </div>
            </div>
            <div class="req-status status-${statusClass}">${r.status}</div>
            <div class="req-actions">${actionBtn}</div>
        `;
        return card;
    }

    if (recentGrid) {
        recentGrid.innerHTML = '';
        myReqs.slice(0, 5).forEach(r => recentGrid.appendChild(createCard(r)));
        if (myReqs.length === 0) recentGrid.innerHTML = '<p style="text-align:center; color:#888;">No requisitions yet.</p>';
    }

    if (fullGrid) {
        fullGrid.innerHTML = '';
        myReqs.forEach(r => fullGrid.appendChild(createCard(r)));
        if (myReqs.length === 0) fullGrid.innerHTML = '<p style="text-align:center; color:#888;">No requisitions found.</p>';
    }
}

function openNewRequisition() {
    const modal = document.getElementById('addReqModal');
    if (!modal) return;
    document.getElementById('requisitionForm').reset();
    document.getElementById('editReqId').value = '';
    modal.style.display = 'flex';
}

const reqForm = document.getElementById('requisitionForm');
if (reqForm) {
    reqForm.onsubmit = function(e) {
        e.preventDefault();
        const req = {
            id: 'REQ-' + Date.now().toString().slice(-6),
            dept: document.getElementById('requestDept').value,
            priority: document.getElementById('priority').value,
            description: document.getElementById('itemDesc').value,
            cost: parseFloat(document.getElementById('cost').value),
            reason: document.getElementById('reason').value,
            requesterEmail: userEmail,
            requesterName: currentUser.name,
            status: 'Pending',
            date: new Date().toLocaleDateString('en-GB')
        };

        const reqs = loadRequisitions();
        reqs.push(req);
        saveRequisitions(reqs);
        
        showSuccessMessage('Requisition submitted!');
        closeModal('addReqModal');
        renderRequisitions();
    };
}

function openReviewModal(id) {
    const reqs = loadRequisitions();
    const r = reqs.find(it => it.id === id);
    if (!r) return;

    document.getElementById('revRequester').textContent = r.requesterName;
    document.getElementById('revDate').textContent = r.date;
    document.getElementById('revReason').textContent = r.reason || 'No reason provided';
    
    const rejectionSection = document.getElementById('rejectionSection');
    const approvalActions = document.getElementById('approvalActions');
    
    if (r.status === 'Rejected') {
        rejectionSection.style.display = 'block';
        document.getElementById('revRejectionReason').textContent = r.reviewNotes || 'No reason given.';
        approvalActions.style.display = 'none';
    } else {
        rejectionSection.style.display = 'none';
        // Can they approve?
        if ((r.status === 'Pending' && isHOD) || (r.status === 'HOD Approved' && (isBursar || isProcurementOfficer))) {
            approvalActions.style.display = 'block';
            document.getElementById('revNotes').value = '';
            document.getElementById('approveBtn').onclick = () => {
                const nextStatus = (r.status === 'Pending') ? 'HOD Approved' : 'Bursar Approved';
                updateReqStatus(id, nextStatus);
            };
        } else {
            approvalActions.style.display = 'none';
        }
    }

    document.getElementById('reviewReqModal').style.display = 'flex';
}

function updateReqStatus(id, status) {
    const reqs = loadRequisitions();
    const idx = reqs.findIndex(r => r.id === id);
    if (idx > -1) {
        reqs[idx].status = status;
        reqs[idx].reviewNotes = document.getElementById('revNotes').value;
        saveRequisitions(reqs);
        showSuccessMessage(`Requisition ${status}`);
        closeModal('reviewReqModal');
        renderRequisitions();
    }
}

function closeModal(id) {
    const m = document.getElementById(id);
    if (m) m.style.display = 'none';
}

window.openNewRequisition = openNewRequisition;
window.openReviewModal = openReviewModal;
window.updateReqStatus = updateReqStatus;
window.closeModal = closeModal;

// Initialize on load
document.addEventListener('DOMContentLoaded', () => {
    renderRequisitions();
    if (typeof renderBooksTable === 'function') renderBooksTable();
    if (typeof renderStaffGrid === 'function') renderStaffGrid();
});

function addRequisition(e) {
    e.preventDefault();
    const item = document.getElementById('reqItem').value;
    const qty = document.getElementById('reqQty').value;
    const supplier = document.getElementById('reqSupplier').value;
    const reqs = loadRequisitions();
    reqs.push({ id: Date.now(), item, qty, supplier, status: 'Pending' });
    saveRequisitions(reqs);
    renderRequisitions();
    closeModal('newReqModal');
    showSuccessMessage('Requisition submitted');
    e.target.reset();
}

function loadAssets() { return getTenantData('libAssets', '[]'); }
function saveAssets(data) { saveTenantData('libAssets', data); }

function renderAssetsTable() {
    const tbody = document.getElementById('assetsTableBody');
    if (!tbody) return;
    const assets = loadAssets();
    tbody.innerHTML = '';
    assets.forEach(a => {
        const row = document.createElement('tr');
        row.innerHTML = `<td>${a.name}</td><td>${a.category}</td><td>${a.id}</td><td><span class="badge bg-success">Good</span></td>`;
        tbody.appendChild(row);
    });
}
function addAsset(e) {
    e.preventDefault();
    const name = document.getElementById('assetName').value;
    const category = document.getElementById('assetCategory').value;
    const assets = loadAssets();
    assets.push({ id: 'AST-' + Date.now(), name, category, status: 'Good' });
    saveAssets(assets);
    renderAssetsTable();
    closeModal('addAssetModal');
    showSuccessMessage('Asset added');
    e.target.reset();
}

// --- Digital Resource Management (Existing) ---

function loadResources() {
    const defaultResources = [
        { id: 'RES-001', title: 'Mathematics Grade 12 - 2023', type: 'Past Paper', format: 'PDF', size: '2.4 MB', icon: 'fa-file-pdf', color: '#3b82f6', date: '2023-10-15' },
        { id: 'RES-002', title: 'Introduction to Calculus', type: 'Video Lecture', format: 'MP4', size: '45.0 MB', icon: 'fa-video', color: '#10b981', date: '2023-11-20' }
    ];
    const stored = getTenantData('libraryResources', 'null');
    return stored ? JSON.parse(stored) : defaultResources;
}

function saveResources(resources) {
    saveTenantData(, );
}

function renderResourceGrid(filter = '') {
    const resources = loadResources();
    const grid = document.getElementById('resourceGrid');
    if (!grid) return;

    grid.innerHTML = '';
    const filtered = resources.filter(res => res.title.toLowerCase().includes(filter.toLowerCase()));

    filtered.forEach(res => {
        const card = document.createElement('div');
        card.className = 'resource-card glass-card';
        card.style.overflow = 'hidden';

        const actionBtn = res.icon === 'fa-video' ?
            `<button class="btn btn-primary" style="flex: 2; justify-content: center; background: #10b981; padding: 10px;" onclick="playResource('${res.id}')"><i class="fas fa-play"></i> Watch</button>` :
            `<button class="btn btn-primary" style="flex: 2; justify-content: center; padding: 10px;" onclick="downloadResource('${res.id}')"><i class="fas fa-download"></i> Download</button>`;

        card.innerHTML = `
            <div style="height: 140px; background: linear-gradient(135deg, ${res.color} 0%, #1f2937 100%); display: flex; align-items: center; justify-content: center; color: white; font-size: 3.5rem;">
                <i class="fas ${res.icon}"></i>
            </div>
            <div style="padding: 25px;">
                <h4 style="margin: 0 0 12px; color: var(--sidebar-bg); font-size: 1.1rem; font-weight: 600;">${res.title}</h4>
                <div style="display: flex; gap: 12px;">${actionBtn}</div>
            </div>
        `;
        grid.appendChild(card);
    });
}

function uploadResource(e) {
    // Basic wrapper
    if (e) e.preventDefault();
    showSuccessMessage('Resource uploaded (Mock)');
    closeModal('uploadModal');
}

// --- Modal Helpers ---

function openModal(id) {
    const modal = document.getElementById(id);
    if (modal) {
        modal.style.display = 'flex';
        modal.classList.add('active');
    }
}

function closeModal(id) {
    const modal = document.getElementById(id);
    if (modal) {
        modal.style.display = 'none';
        modal.classList.remove('active');
    }
}

// --- Initialization ---

document.addEventListener('DOMContentLoaded', () => {
    const path = window.location.href.toLowerCase();

    if (path.includes('hr-services.html')) {
        renderLeaveHistory();
        const leaveForm = document.getElementById('leaveRequestForm');
        if (leaveForm) leaveForm.addEventListener('submit', submitLeaveRequest);
    }
    else if (path.includes('it-support.html')) {
        renderRecentTickets();
        const ticketForm = document.getElementById('ticketForm');
        if (ticketForm) ticketForm.addEventListener('submit', submitTicket);
    }
    // ... existing init logic ...
    else if (path.includes('books.html')) {
        renderBooksTable();
        const addForm = document.getElementById('addBookForm');
        if (addForm) addForm.addEventListener('submit', addBook);
        const editForm = document.getElementById('editBookForm');
        if (editForm) editForm.addEventListener('submit', saveEditedBook);
    } else if (path.includes('issue.html')) {
        renderTransactionsTable();
        const retInput = document.getElementById('returnBookId');
        if (retInput) {
            retInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') returnBook();
            });
        }
    } else if (path.includes('digital.html')) {
        renderResourceGrid();
        const uploadForm = document.getElementById('uploadForm');
        if (uploadForm) uploadForm.addEventListener('submit', uploadResource);
    } else if (path.includes('staff-directory.html')) {
        renderStaffGrid(); // Initialize staff grid
    } else if (path.includes('assets.html')) {
        renderAssetsTable(); // Initialize assets table
        const addAssetForm = document.getElementById('addAssetForm');
        if (addAssetForm) addAssetForm.addEventListener('submit', addAsset);
    } else if (path.includes('procurement.html')) {
        renderRequisitions();
        const addReqForm = document.getElementById('addReqForm');
        if (addReqForm) addReqForm.addEventListener('submit', addRequisition);
    }
});

