// Centralized Textbook Data Management
// This file manages the textbook inventory and operations

// Initialize textbook inventory if not exists
function initializeTextbooks() {
    if (!getTenantData('school_textbooks', '[]')) {
        const sampleTextbooks = [
            {
                bookId: "BK-001",
                bookNumber: "MTH-2024-001",
                title: "Advanced Mathematics Form 4",
                subject: "Mathematics",
                grade: "Form 4",
                assignedTeacher: null,
                currentHolder: null,
                status: "available",
                history: []
            },
            {
                bookId: "BK-002",
                bookNumber: "MTH-2024-002",
                title: "Advanced Mathematics Form 4",
                subject: "Mathematics",
                grade: "Form 4",
                assignedTeacher: null,
                currentHolder: null,
                status: "available",
                history: []
            },
            {
                bookId: "BK-003",
                bookNumber: "ENG-2024-001",
                title: "English Language Form 3",
                subject: "English",
                grade: "Form 3",
                assignedTeacher: null,
                currentHolder: null,
                status: "available",
                history: []
            },
            {
                bookId: "BK-004",
                bookNumber: "SCI-2024-001",
                title: "Integrated Science Form 2",
                subject: "Science",
                grade: "Form 2",
                assignedTeacher: null,
                currentHolder: null,
                status: "available",
                history: []
            },
            {
                bookId: "BK-005",
                bookNumber: "HIS-2024-001",
                title: "Zimbabwe History Form 1",
                subject: "History",
                grade: "Form 1",
                assignedTeacher: null,
                currentHolder: null,
                status: "available",
                history: []
            }
        ];
        saveTenantData('school_textbooks', );
    }
}

// Get all textbooks
function getAllTextbooks() {
    initializeTextbooks();
    return JSON.parse(getTenantData('school_textbooks', '[]') || '[]');
}

// Get textbooks assigned to a specific teacher
function getTeacherTextbooks(teacherName) {
    const allBooks = getAllTextbooks();
    return allBooks.filter(book => book.assignedTeacher === teacherName);
}

// Get textbooks for a specific student
function getStudentTextbooks(studentId) {
    const allBooks = getAllTextbooks();
    return allBooks.filter(book => book.currentHolder === studentId);
}

// Issue a textbook to a student
function issueTextbook(bookId, studentId, studentName, teacherName) {
    const books = getAllTextbooks();
    const bookIndex = books.findIndex(b => b.bookId === bookId);

    if (bookIndex === -1) {
        return { success: false, message: 'Book not found' };
    }

    if (books[bookIndex].status === 'issued') {
        return { success: false, message: 'Book is already issued to another student' };
    }

    // Update book status
    books[bookIndex].status = 'issued';
    books[bookIndex].currentHolder = studentId;
    books[bookIndex].assignedTeacher = teacherName;

    // Add to history
    books[bookIndex].history.push({
        studentId: studentId,
        studentName: studentName,
        teacherName: teacherName,
        issuedDate: new Date().toISOString(),
        collectedDate: null,
        condition: 'good'
    });

    saveTenantData('school_textbooks', );
    return { success: true, message: 'Textbook issued successfully' };
}

// Collect a textbook from a student
function collectTextbook(bookId, condition = 'good') {
    const books = getAllTextbooks();
    const bookIndex = books.findIndex(b => b.bookId === bookId);

    if (bookIndex === -1) {
        return { success: false, message: 'Book not found' };
    }

    if (books[bookIndex].status !== 'issued') {
        return { success: false, message: 'Book is not currently issued' };
    }

    // Update book status
    books[bookIndex].status = condition === 'good' ? 'available' : condition;
    books[bookIndex].currentHolder = null;

    // Update history
    const historyLength = books[bookIndex].history.length;
    if (historyLength > 0) {
        books[bookIndex].history[historyLength - 1].collectedDate = new Date().toISOString();
        books[bookIndex].history[historyLength - 1].condition = condition;
    }

    saveTenantData('school_textbooks', );
    return { success: true, message: 'Textbook collected successfully' };
}

// Search textbooks
function searchTextbooks(query, subject = '', status = '') {
    let books = getAllTextbooks();

    if (query) {
        query = query.toLowerCase();
        books = books.filter(book =>
            book.title.toLowerCase().includes(query) ||
            book.bookNumber.toLowerCase().includes(query) ||
            book.subject.toLowerCase().includes(query)
        );
    }

    if (subject) {
        books = books.filter(book => book.subject === subject);
    }

    if (status) {
        books = books.filter(book => book.status === status);
    }

    return books;
}

// Get textbook statistics for a teacher
function getTeacherStats(teacherName) {
    const books = getTeacherTextbooks(teacherName);
    return {
        total: books.length,
        issued: books.filter(b => b.status === 'issued').length,
        available: books.filter(b => b.status === 'available').length,
        damaged: books.filter(b => b.status === 'damaged').length,
        lost: books.filter(b => b.status === 'lost').length
    };
}

// Assign textbooks to a teacher
function assignTextbooksToTeacher(bookIds, teacherName) {
    const books = getAllTextbooks();
    let updated = 0;

    bookIds.forEach(bookId => {
        const bookIndex = books.findIndex(b => b.bookId === bookId);
        if (bookIndex !== -1 && !books[bookIndex].assignedTeacher) {
            books[bookIndex].assignedTeacher = teacherName;
            updated++;
        }
    });

    saveTenantData('school_textbooks', );
    return { success: true, count: updated };
}

