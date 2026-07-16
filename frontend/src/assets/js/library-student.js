/* Library Student Side Logic (OPAC) */

// Mock User Data (In a real app, this comes from session)
const currentUser = {
    id: '2024SCI001',
    name: 'Sarah Moyo'
};

// Load Books (read-only)
function loadBooks() {
    const stored = getTenantData('libraryBooks', '[]');
    if (!stored) return [];
    return JSON.parse(stored);
}

// Load Transactions (read-only for user history)
function loadUserTransactions() {
    const stored = getTenantData('libraryTransactions', '[]');
    if (!stored) return [];
    const allTrans = JSON.parse(stored);
    return allTrans.filter(t => t.studentId === currentUser.id);
}

// Render Book Search Results
function searchBooks(query = '') {
    const books = loadBooks();
    const container = document.getElementById('searchResults');
    if (!container) return;

    container.innerHTML = '';

    // Filter books
    const results = books.filter(b =>
        b.title.toLowerCase().includes(query.toLowerCase()) ||
        b.author.toLowerCase().includes(query.toLowerCase()) ||
        b.category.toLowerCase().includes(query.toLowerCase())
    );

    if (results.length === 0) {
        container.innerHTML = '<div class="no-results">No books found matching your search.</div>';
        return;
    }

    results.forEach(book => {
        const card = document.createElement('div');
        card.className = 'book-card';

        let statusBadge = `<span class="badge bg-success">Available (${book.available})</span>`;
        let actionBtn = '';
        if (book.available === 0) {
            statusBadge = `<span class="badge bg-danger">Out of Stock</span>`;
            actionBtn = `<button class="btn-reserve" onclick="alert('Reservation placed for ${book.title}. You will be notified when available.')">Reserve</button>`;
        }

        card.innerHTML = `
            <div class="book-cover">
                <i class="fas fa-book fa-3x"></i>
            </div>
            <div class="book-info">
                <h4>${book.title}</h4>
                <p class="author">by ${book.author}</p>
                <div class="meta">
                    <span><i class="fas fa-tag"></i> ${book.category}</span>
                    <span><i class="fas fa-map-marker-alt"></i> Shelf: ${book.shelf}</span>
                </div>
                <div class="status-row" style="display:flex; justify-content:space-between; align-items:center;">
                    ${statusBadge}
                    ${actionBtn}
                </div>
            </div>
        `;
        container.appendChild(card);
    });
}

// Render User's Borrowing History
function renderMyBooks() {
    const transactions = loadUserTransactions();
    const activeTable = document.getElementById('activeLoansBody');
    const historyTable = document.getElementById('historyBody');

    if (activeTable) activeTable.innerHTML = '';
    if (historyTable) historyTable.innerHTML = '';

    // Split into active and history
    const active = transactions.filter(t => t.status === 'issued' || t.status === 'overdue');
    const history = transactions.filter(t => t.status === 'returned');

    // Render Active Loans
    if (activeTable) {
        if (active.length === 0) {
            activeTable.innerHTML = '<tr><td colspan="5" class="text-center">No active loans.</td></tr>';
        } else {
            active.forEach(t => {
                const row = activeTable.insertRow();
                let statusClass = 'text-success';
                let statusText = 'On Time';

                // Check overdue
                const today = new Date();
                const dueDate = new Date(t.dueDate);
                if (today > dueDate) {
                    statusClass = 'text-danger';
                    statusText = 'Overdue';
                }

                row.innerHTML = `
                    <td>${t.bookTitle}</td>
                    <td>${new Date(t.issueDate).toLocaleDateString()}</td>
                    <td class="${statusClass}"><strong>${new Date(t.dueDate).toLocaleDateString()}</strong></td>
                    <td><span class="badge ${t.status === 'overdue' ? 'bg-danger' : 'bg-warning'}">${statusText}</span></td>
                    <td>${t.fine > 0 ? '$' + t.fine.toFixed(2) : '-'}</td>
                `;
            });
        }
    }

    // Render History
    if (historyTable) {
        if (history.length === 0) {
            historyTable.innerHTML = '<tr><td colspan="4" class="text-center">No borrowing history.</td></tr>';
        } else {
            history.forEach(t => {
                const row = historyTable.insertRow();
                row.innerHTML = `
                    <td>${t.bookTitle}</td>
                    <td>${new Date(t.issueDate).toLocaleDateString()}</td>
                    <td>${new Date(t.returnDate).toLocaleDateString()}</td>
                    <td><span class="badge bg-secondary">Returned</span></td>
                `;
            });
        }
    }

    updateStudentStats(active, history);
}

// Update Student Dashboard Stats
function updateStudentStats(active, history) {
    const totalBorrowed = document.getElementById('statTotalBorrowed');
    const currentLoans = document.getElementById('statCurrentLoans');
    const finePending = document.getElementById('statFinePending');

    if (totalBorrowed) totalBorrowed.innerText = active.length + history.length;
    if (currentLoans) currentLoans.innerText = active.length;

    // Calculate total pending fines
    if (finePending) {
        const fines = active.reduce((sum, t) => {
            // Recalculate fine for display
            if (new Date() > new Date(t.dueDate)) {
                // Approximate fine for display
                const diffTime = Math.abs(new Date() - new Date(t.dueDate));
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                return sum + (diffDays * 0.50);
            }
            return sum;
        }, 0);
        finePending.innerText = '$' + fines.toFixed(2);
    }
}

// Mock Data for Digital Resources
const mockResources = {
    'exams': [
        { title: 'O Level Mathematics Paper 1 (2023)', type: 'PDF', size: '1.2 MB', year: '2023' },
        { title: 'O Level English Language Paper 2 (2023)', type: 'PDF', size: '2.5 MB', year: '2023' },
        { title: 'A Level Physics Paper 4 (2022)', type: 'PDF', size: '1.8 MB', year: '2022' },
        { title: 'O Level History Paper 1 (2022)', type: 'PDF', size: '1.5 MB', year: '2022' },
        { title: 'A Level Chemistry Paper 2 (2023)', type: 'PDF', size: '2.1 MB', year: '2023' }
    ],
    'ebooks': [
        { title: 'Introduction to Python Programming', author: 'John Doe', format: 'EPUB' },
        { title: 'Advanced Calculus', author: 'Jane Smith', format: 'PDF' },
        { title: 'Modern World History', author: 'David Wilson', format: 'PDF' },
        { title: 'Organic Chemistry Essentials', author: 'Sarah Brown', format: 'PDF' },
        { title: 'Shakespeare: The Complete Works', author: 'William Shakespeare', format: 'EPUB' }
    ],
    'research': [
        { title: 'JSTOR', description: 'Digital library of academic journals, books, and primary sources.', link: '#' },
        { title: 'Google Scholar', description: 'Freely accessible web search engine that indexes the full text of scholarly literature.', link: '#' },
        { title: 'PubMed', description: 'Free search engine accessing primarily the MEDLINE database of references and abstracts on life sciences and biomedical topics.', link: '#' },
        { title: 'Project Gutenberg', description: 'Library of over 60,000 free eBooks.', link: '#' }
    ]
};

// Current active View
let currentView = 'books';

// Load Resource View
function loadResource(type) {
    currentView = type;
    const container = document.getElementById('searchResults');
    const headerTitle = document.querySelector('.library-header h1');
    const headerDesc = document.querySelector('.library-header p');

    // Reset Active States
    document.querySelectorAll('.resource-card').forEach(card => card.classList.remove('active-resource'));

    if (type === 'books') {
        headerTitle.innerText = 'Find Your Next Book';
        headerDesc.innerText = 'Search our collection of textbooks, literature, and digital resources';
        searchBooks(document.querySelector('.search-input input')?.value || '');
        return;
    }

    if (!container) return;
    container.innerHTML = '';

    if (type === 'exams') {
        headerTitle.innerText = 'Past Exam Papers';
        headerDesc.innerText = 'Download past examination papers for revision';

        mockResources.exams.forEach(exam => {
            const card = document.createElement('div');
            card.className = 'book-card';
            card.innerHTML = `
                <div class="book-cover" style="background: #e9ecef; color: #dc3545;">
                    <i class="fas fa-file-pdf fa-3x"></i>
                </div>
                <div class="book-info">
                    <h4>${exam.title}</h4>
                    <div class="meta">
                        <span><i class="fas fa-calendar"></i> Year: ${exam.year}</span>
                        <span><i class="fas fa-save"></i> Size: ${exam.size}</span>
                    </div>
                    <div class="status-row">
                        <button class="btn-reserve" style="width:100%; text-align:center; background: #dc3545; color: white;" onclick="alert('Downloading ${exam.title}...')">
                            <i class="fas fa-download"></i> Download
                        </button>
                    </div>
                </div>
            `;
            container.appendChild(card);
        });
    } else if (type === 'ebooks') {
        headerTitle.innerText = 'Digital E-Books';
        headerDesc.innerText = 'Read books directly on your device';

        mockResources.ebooks.forEach(book => {
            const card = document.createElement('div');
            card.className = 'book-card';
            card.innerHTML = `
                <div class="book-cover" style="background: #e9ecef; color: #28a745;">
                    <i class="fas fa-tablet-alt fa-3x"></i>
                </div>
                <div class="book-info">
                    <h4>${book.title}</h4>
                    <p class="author">by ${book.author}</p>
                    <div class="meta">
                        <span><i class="fas fa-file-alt"></i> Format: ${book.format}</span>
                    </div>
                    <div class="status-row">
                        <button class="btn-reserve" style="width:100%; text-align:center; background: #28a745; color: white;" onclick="alert('Opening ${book.title}...')">
                            <i class="fas fa-book-open"></i> Read Now
                        </button>
                    </div>
                </div>
            `;
            container.appendChild(card);
        });
    } else if (type === 'research') {
        headerTitle.innerText = 'Research Databases';
        headerDesc.innerText = 'Access external academic resources';

        mockResources.research.forEach(db => {
            const card = document.createElement('div');
            card.className = 'book-card';
            card.innerHTML = `
                <div class="book-cover" style="background: #e9ecef; color: #0056b3;">
                    <i class="fas fa-globe fa-3x"></i>
                </div>
                <div class="book-info">
                    <h4>${db.title}</h4>
                    <p class="author" style="font-size:0.85rem;">${db.description}</p>
                    <div class="status-row" style="margin-top:auto;">
                        <a href="${db.link}" class="btn-reserve" style="display:block; width:100%; text-align:center; box-sizing:border-box; text-decoration:none; background: #0056b3; color: white;" onclick="event.preventDefault(); alert('Redirecting to ${db.title}...')">
                            <i class="fas fa-external-link-alt"></i> Access Database
                        </a>
                    </div>
                </div>
            `;
            container.appendChild(card);
        });
    }
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    if (window.location.pathname.includes('student/library.html')) {
        searchBooks(); // Load all books initially

        // Add click handlers for resources if they don't have them in HTML yet
        // (We expect HTML to be updated to call loadResource)
    }
    if (window.location.pathname.includes('student/my-books.html')) {
        renderMyBooks();
    }
});

