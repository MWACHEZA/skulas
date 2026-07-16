// Student Textbooks - Display assigned textbooks
document.addEventListener('DOMContentLoaded', function () {
    const studentId = getTenantData('studentId', 'null') || 'STU-001';

    loadAssignedTextbooks(studentId);
});

function loadAssignedTextbooks(studentId) {
    // Load textbook data module functions
    if (typeof getStudentTextbooks !== 'function') {
        console.error('Textbook data module not loaded');
        return;
    }

    const textbooks = getStudentTextbooks(studentId);
    const tableBody = document.getElementById('assignedTextbooksBody');
    const statCard = document.getElementById('statAssignedBooks');

    if (!tableBody) return;

    // Update stats
    if (statCard) {
        statCard.textContent = textbooks.length;
    }

    if (textbooks.length === 0) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="6" style="text-align: center; padding: 40px; color: #999;">
                    <i class="fas fa-book" style="font-size: 3rem; margin-bottom: 10px; display: block;"></i>
                    No textbooks assigned yet
                </td>
            </tr>
        `;
        return;
    }

    tableBody.innerHTML = textbooks.map(book => {
        // Get the latest history record
        const latestRecord = book.history[book.history.length - 1];
        const issuedDate = latestRecord ? new Date(latestRecord.issuedDate).toLocaleDateString('en-GB') : '-';
        const teacherName = latestRecord ? latestRecord.teacherName : book.assignedTeacher || '-';

        let statusBadge = '';
        if (book.status === 'issued') {
            statusBadge = '<span class="badge bg-warning">In Use</span>';
        } else if (book.status === 'available') {
            statusBadge = '<span class="badge bg-secondary">Returned</span>';
        } else {
            statusBadge = '<span class="badge bg-danger">' + book.status.charAt(0).toUpperCase() + book.status.slice(1) + '</span>';
        }

        return `
            <tr>
                <td><strong>${book.bookNumber}</strong></td>
                <td>${book.title}</td>
                <td>${book.subject}</td>
                <td>${teacherName}</td>
                <td>${issuedDate}</td>
                <td>${statusBadge}</td>
            </tr>
        `;
    }).join('');
}

