// Textbook Management for Teachers
document.addEventListener('DOMContentLoaded', function () {
    const teacherName = getTenantData('teacherName', 'null') || 'Teacher';

    // Sidebar & Header Logic
    if (document.getElementById('teacherName')) {
        document.getElementById('teacherName').textContent = teacherName;
    }

    const menuToggle = document.getElementById('menuToggle');
    const sidebar = document.getElementById('sidebar');
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

    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', function (e) {
            e.preventDefault();
            saveTenantData('teacherLoggedIn', []);
            window.location.href = 'login.html';
        });
    }

    // Auto-assign some textbooks to the teacher for demo purposes
    const allBooks = getAllTextbooks();
    const teacherBooks = allBooks.filter(b => b.assignedTeacher === teacherName);

    if (teacherBooks.length === 0) {
        // Assign first 3 books to this teacher
        const booksToAssign = allBooks.slice(0, 3).map(b => b.bookId);
        assignTextbooksToTeacher(booksToAssign, teacherName);
    }

    loadStats();
    loadMyBooks();
    loadIssueForm();
    loadCollectForm();
    loadHistory();

    // Form handlers
    document.getElementById('issueForm').addEventListener('submit', handleIssue);
    document.getElementById('collectForm').addEventListener('submit', handleCollect);

    // Autocomplete handler
    document.getElementById('issueStudentSearch').addEventListener('input', handleStudentSelect);
});

function loadStats() {
    const teacherName = getTenantData('teacherName', 'null') || 'Teacher';
    const stats = getTeacherStats(teacherName);

    document.getElementById('statTotal').textContent = stats.total;
    document.getElementById('statIssued').textContent = stats.issued;
    document.getElementById('statAvailable').textContent = stats.available;
    document.getElementById('statDamaged').textContent = stats.damaged + stats.lost;
}

function loadMyBooks() {
    const teacherName = getTenantData('teacherName', 'null') || 'Teacher';
    const books = getTeacherTextbooks(teacherName);
    const tableBody = document.getElementById('myBooksTable');

    if (books.length === 0) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="6" style="text-align: center; padding: 40px; color: #999;">
                    No textbooks assigned to you yet.
                </td>
            </tr>
        `;
        return;
    }

    tableBody.innerHTML = books.map(book => {
        let statusBadge = '';
        if (book.status === 'available') {
            statusBadge = '<span class="badge badge-available">Available</span>';
        } else if (book.status === 'issued') {
            statusBadge = '<span class="badge badge-issued">Issued</span>';
        } else {
            statusBadge = '<span class="badge badge-damaged">' + book.status.charAt(0).toUpperCase() + book.status.slice(1) + '</span>';
        }

        const currentHolder = book.currentHolder || '-';

        return `
            <tr>
                <td>${book.bookNumber}</td>
                <td>${book.title}</td>
                <td>${book.subject}</td>
                <td>${statusBadge}</td>
                <td>${currentHolder}</td>
                <td>
                    ${book.status === 'available' ?
                '<button class="btn btn-primary btn-sm" onclick="quickIssue(\'' + book.bookId + '\')">Issue</button>' :
                book.status === 'issued' ?
                    '<button class="btn btn-success btn-sm" onclick="quickCollect(\'' + book.bookId + '\')">Collect</button>' :
                    '-'
            }
                </td>
            </tr>
        `;
    }).join('');
}

function loadIssueForm() {
    const teacherName = getTenantData('teacherName', 'null') || 'Teacher';
    const books = getTeacherTextbooks(teacherName).filter(b => b.status === 'available');
    const select = document.getElementById('issueBookSelect');

    select.innerHTML = '<option value="">-- Select a textbook --</option>' +
        books.map(book => `
            <option value="${book.bookId}">${book.bookNumber} - ${book.title}</option>
        `).join('');
}

function loadCollectForm() {
    const teacherName = getTenantData('teacherName', 'null') || 'Teacher';
    const books = getTeacherTextbooks(teacherName).filter(b => b.status === 'issued');
    const select = document.getElementById('collectBookSelect');

    select.innerHTML = '<option value="">-- Select a textbook --</option>' +
        books.map(book => `
            <option value="${book.bookId}">${book.bookNumber} - ${book.title} (Issued to: ${book.currentHolder})</option>
        `).join('');
}

function loadHistory() {
    const teacherName = getTenantData('teacherName', 'null') || 'Teacher';
    const books = getTeacherTextbooks(teacherName);
    const tableBody = document.getElementById('historyTable');

    let allHistory = [];
    books.forEach(book => {
        book.history.forEach(record => {
            allHistory.push({
                bookNumber: book.bookNumber,
                ...record
            });
        });
    });

    if (allHistory.length === 0) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="5" style="text-align: center; padding: 40px; color: #999;">
                    No history records yet.
                </td>
            </tr>
        `;
        return;
    }

    // Sort by issued date (newest first)
    allHistory.sort((a, b) => new Date(b.issuedDate) - new Date(a.issuedDate));

    tableBody.innerHTML = allHistory.map(record => {
        const issuedDate = new Date(record.issuedDate).toLocaleDateString('en-GB');
        const collectedDate = record.collectedDate ? new Date(record.collectedDate).toLocaleDateString('en-GB') : 'Not yet returned';
        const condition = record.condition || '-';

        return `
            <tr>
                <td>${record.bookNumber}</td>
                <td>${record.studentName} (${record.studentId})</td>
                <td>${issuedDate}</td>
                <td>${collectedDate}</td>
                <td>${condition}</td>
            </tr>
        `;
    }).join('');
}

function handleIssue(e) {
    e.preventDefault();

    const bookId = document.getElementById('issueBookSelect').value;
    const studentId = document.getElementById('issueStudentId').value.trim();
    const studentName = document.getElementById('issueStudentName').value.trim();
    const teacherName = getTenantData('teacherName', 'null') || 'Teacher';

    if (!bookId || !studentId || !studentName) {
        Toast.error('Please fill in all fields');
        return;
    }

    const result = issueTextbook(bookId, studentId, studentName, teacherName);

    if (result.success) {
        Toast.success('Textbook issued successfully!');
        document.getElementById('issueForm').reset();
        loadStats();
        loadMyBooks();
        loadIssueForm();
        loadCollectForm();
    } else {
        Toast.error('Error: ' + result.message);
    }
}

function handleCollect(e) {
    e.preventDefault();

    const bookId = document.getElementById('collectBookSelect').value;
    const condition = document.getElementById('bookCondition').value;

    if (!bookId) {
        Toast.error('Please select a textbook');
        return;
    }

    const result = collectTextbook(bookId, condition);

    if (result.success) {
        Toast.success('Textbook collected successfully!');
        document.getElementById('collectForm').reset();
        loadStats();
        loadMyBooks();
        loadIssueForm();
        loadCollectForm();
        loadHistory();
    } else {
        Toast.error('Error: ' + result.message);
    }
}

function quickIssue(bookId) {
    switchTab('issue');
    document.getElementById('issueBookSelect').value = bookId;
}

function quickCollect(bookId) {
    switchTab('collect');
    document.getElementById('collectBookSelect').value = bookId;
}

function switchTab(tabName) {
    // Hide all tabs
    document.querySelectorAll('.tab-content').forEach(tab => {
        tab.classList.remove('active');
    });

    // Remove active class from all tab buttons
    document.querySelectorAll('.tab').forEach(btn => {
        btn.classList.remove('active');
    });

    // Show selected tab
    document.getElementById(tabName).classList.add('active');

    // Add active class to clicked button
    if (event && event.target) {
        event.target.classList.add('active');
    }
}

// --- New Features Implementation ---

// 1. Student Search Autocomplete
function filterStudents(query) {
    const list = document.getElementById('studentList');
    list.innerHTML = '';

    if (query.length < 1) return;

    // searchStudents is from student-data.js
    const results = searchStudents(query);

    results.forEach(student => {
        const option = document.createElement('option');
        option.value = `${student.name} (${student.id})`;
        list.appendChild(option);
    });
}

function handleStudentSelect(e) {
    const val = e.target.value;
    // Format: Name (ID)
    const match = val.match(/(.*) \((.*)\)/);

    if (match) {
        document.getElementById('issueStudentName').value = match[1];
        document.getElementById('issueStudentId').value = match[2];
    } else {
        // Clear if invalid, or allow custom? Let's check exact match in mock data to be safe
        const students = searchStudents(val);
        const exact = students.find(s => s.name === val || s.id === val);
        if (exact) {
            document.getElementById('issueStudentName').value = exact.name;
            document.getElementById('issueStudentId').value = exact.id;
        } else {
            // Optional: clear fields if no match
            // document.getElementById('issueStudentName').value = '';
            // document.getElementById('issueStudentId').value = '';
        }
    }
}

// 2. Barcode Scanner (Mock)
// 2. Barcode Scanner Implementation
let currentScanType = 'issue';

function scanBarcode(type) {
    currentScanType = type;
    const modal = document.getElementById('scannerModal');
    const input = document.getElementById('barcodeInput');
    const status = document.getElementById('scannerStatus');

    modal.style.display = 'flex';
    input.value = '';
    status.textContent = 'Listening for scanner...';
    status.style.color = '#666';

    // Focus input for hardware scanners
    setTimeout(() => input.focus(), 100);
}

function closeScannerModal() {
    document.getElementById('scannerModal').style.display = 'none';
}

function processManualBarcode() {
    const input = document.getElementById('barcodeInput');
    const code = input.value.trim();

    if (code) {
        handleScannedCode(code);
    }
}

// Handle "Enter" key in scanner input (Hardware scanners send Enter)
document.getElementById('barcodeInput').addEventListener('keypress', function (e) {
    if (e.key === 'Enter') {
        e.preventDefault();
        processManualBarcode();
    }
});

function handleScannedCode(code) {
    const spinner = document.getElementById('scannerSpinner');
    const status = document.getElementById('scannerStatus');

    spinner.style.display = 'block';

    // Simulate lookup delay slightly for realism even with local data
    setTimeout(() => {
        spinner.style.display = 'none';

        // Find book by Book Number (ID)
        const allBooks = getAllTextbooks();
        // Case insensitive match
        const book = allBooks.find(b => b.bookNumber.toLowerCase() === code.toLowerCase());

        if (book) {
            // Check availability based on context
            if (currentScanType === 'issue' && book.status !== 'available') {
                status.textContent = `Error: Book is already ${book.status}`;
                status.style.color = '#dc3545';
                Toast.error(`Book ${code} is not available!`);
                return;
            }

            if (currentScanType === 'collect' && book.status !== 'issued') {
                status.textContent = `Error: Book is not currently issued`;
                status.style.color = '#dc3545';
                Toast.error(`Book ${code} is not issued!`);
                return;
            }

            // Success - fill form
            status.textContent = `Found: ${book.title}`;
            status.style.color = '#28a745';

            // Populate Dropdown
            const selectId = currentScanType === 'issue' ? 'issueBookSelect' : 'collectBookSelect';
            const select = document.getElementById(selectId);
            select.value = book.bookId;

            Toast.success(`Scanned: ${book.bookNumber}`);

            // Highlight result
            setTimeout(() => {
                closeScannerModal();
                // Optionally switch tabs if not already on the right one
                switchTab(currentScanType);
            }, 800);

        } else {
            status.textContent = 'Book not found in inventory';
            status.style.color = '#dc3545';
            Toast.error(`Book code ${code} not found!`);
        }
    }, 400);
}

// 3. Bulk Operations
function toggleBulkFields() {
    const type = document.getElementById('bulkOperationType').value;
    const fields = document.getElementById('bulkIssueFields');

    if (type === 'issue') {
        fields.style.display = 'block';
    } else {
        fields.style.display = 'none';
    }
}

function performBulkOperation() {
    const type = document.getElementById('bulkOperationType').value;
    const teacherName = getTenantData('teacherName', 'null') || 'Teacher';

    // Simulate finding students for the selected class (since we don't have a full classroom DB)
    // For demo, we'll assign to mock students from student-data.js

    if (type === 'issue') {
        const availableBooks = getAllTextbooks().filter(b =>
            b.status === 'available' && !b.currentHolder
        );

        // Let's pretend we're assigning to the first 5 mock students
        const studentsToAssign = mockStudents.slice(0, 5);
        let successCount = 0;

        if (availableBooks.length < studentsToAssign.length) {
            Toast.warning(`Not enough available books! Need ${studentsToAssign.length}, have ${availableBooks.length}.`);
            return;
        }

        studentsToAssign.forEach((student, index) => {
            const book = availableBooks[index];
            if (book) {
                const res = issueTextbook(book.bookId, student.id, student.name, teacherName);
                if (res.success) successCount++;
            }
        });

        if (successCount > 0) {
            Toast.success(`Successfully batch issued ${successCount} textbooks to Form 4A students.`);
            loadStats();
            loadMyBooks();
            loadIssueForm(); // Refresh dropdowns
        } else {
            Toast.error('Failed to perform bulk issue.');
        }

    } else {
        // Bulk Return logic
        let successCount = 0;
        const myIssuedBooks = getTeacherTextbooks(teacherName).filter(b => b.status === 'issued');

        if (myIssuedBooks.length === 0) {
            Toast.warning('No issued books to collect.');
            return;
        }

        // Return all issued books for demo
        myIssuedBooks.forEach(book => {
            const res = collectTextbook(book.bookId, 'good');
            if (res.success) successCount++;
        });

        Toast.success(`Successfully batch collected ${successCount} textbooks.`);
        loadStats();
        loadMyBooks();
        loadCollectForm(); // Refresh dropdowns
    }
}

// 4. Report Generation
function generatePDF(type) {
    let title = '';
    let content = '';

    if (type === 'inventory') {
        title = 'Full Inventory Report';
        content = 'List of all books...';
    } else if (type === 'overdue') {
        title = 'Overdue Books Report';
        content = 'List of overdue books...';
    } else {
        title = 'Loss & Damage Report';
        content = 'List of lost/damaged books...';
    }

    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
        <html>
        <head>
            <title>${title}</title>
            <style>
                body { font-family: sans-serif; padding: 20px; }
                h1 { color: #0056b3; border-bottom: 2px solid #eee; padding-bottom: 10px; }
                table { width: 100%; border-collapse: collapse; margin-top: 20px; }
                th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
                th { background: #f8f9fa; }
            </style>
        </head>
        <body>
            <h1>${title}</h1>
            <p>Generated on: ${new Date().toLocaleString()}</p>
            <p>Teacher: ${getTenantData('teacherName', 'null') || 'Teacher'}</p>
            
            <table>
                <thead>
                    <tr><th>Book Number</th><th>Title</th><th>Status</th><th>Holder</th></tr>
                </thead>
                <tbody>
                    ${getAllTextbooks().map(b => `
                        <tr>
                            <td>${b.bookNumber}</td>
                            <td>${b.title}</td>
                            <td>${b.status}</td>
                            <td>${b.currentHolder || '-'}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
            
            <script>
                window.print();
            </script>
        </body>
        </html>
    `);
}

