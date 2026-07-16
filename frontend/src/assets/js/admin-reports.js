/* Admin Reports Functionality */

document.addEventListener('DOMContentLoaded', function () {
    const generateBtn = document.getElementById('generateReportBtn');
    const reportListContainer = document.querySelector('.recent-reports');

    // Inputs
    const typeSelect = document.getElementById('reportType');
    const periodSelect = document.getElementById('reportPeriod');
    const classSelect = document.getElementById('reportClass');
    const formatSelect = document.getElementById('reportFormat');

    // Modal Elements
    const modal = document.getElementById('reportPreviewModal');
    const previewTitle = document.getElementById('previewTitle');
    const previewDate = document.getElementById('previewDate');
    const previewContent = document.getElementById('previewContent');
    const closeBtns = document.querySelectorAll('.close-modal, .close-modal-btn');
    const printBtn = document.getElementById('printReportBtn');
    const downloadModalBtn = document.getElementById('downloadReportBtnModal');

    // Pagination Elements
    const paginationContainer = document.getElementById('reportPagination');
    const prevPageBtn = document.getElementById('prevPageBtn');
    const nextPageBtn = document.getElementById('nextPageBtn');
    const pageInfo = document.getElementById('pageInfo');

    // State
    let currentReportType = '';
    let currentReportPeriod = '';
    let currentReportClass = '';

    // Pagination State
    let currentDataObj = null; // { summary: html, headers: [], rows: [] }
    let currentPage = 1;
    const itemsPerPage = 10;

    // Initial Attach
    if (reportListContainer) attachActionListeners();

    // --- Modal Logic ---
    function openModal(title, dataObj) {
        if (modal) {
            previewTitle.textContent = title;
            previewDate.textContent = `Generated on ${new Date().toLocaleDateString()}`;

            currentDataObj = dataObj;
            currentPage = 1;
            renderPage();

            // Use class for flex centering
            modal.classList.add('show-flex');
            modal.style.display = 'flex';
        }
    }

    function renderPage() {
        if (!currentDataObj || !previewContent) return;

        // Render Summary (always visible or just on top)
        let html = currentDataObj.summary || '';

        // Render Table Page
        if (currentDataObj.rows && currentDataObj.rows.length > 0) {
            const start = (currentPage - 1) * itemsPerPage;
            const end = start + itemsPerPage;
            const pageRows = currentDataObj.rows.slice(start, end);

            // If rows need title/wrapper
            html += currentDataObj.tablePrefix || '<h3>Detailed Report</h3>';

            html += `<table class="report-table"><thead><tr>`;
            currentDataObj.headers.forEach(h => html += `<th>${h}</th>`);
            html += `</tr></thead><tbody>`;

            pageRows.forEach(row => {
                html += `<tr>`;
                row.forEach(cell => html += `<td>${cell}</td>`);
                html += `</tr>`;
            });
            html += `</tbody></table>`;

            // Show Pagination Logic
            if (currentDataObj.rows.length > itemsPerPage && paginationContainer) {
                paginationContainer.style.display = 'flex';
                updatePaginationControls();
            } else if (paginationContainer) {
                paginationContainer.style.display = 'none';
            }

        } else if (currentDataObj.staticHtml) {
            // Fallback for simple reports
            html += currentDataObj.staticHtml;
            if (paginationContainer) paginationContainer.style.display = 'none';
        }

        previewContent.innerHTML = html;
        // Scroll to top of body on page change
        previewContent.scrollTop = 0;
    }

    function updatePaginationControls() {
        if (!currentDataObj || !currentDataObj.rows) return;

        const totalPages = Math.ceil(currentDataObj.rows.length / itemsPerPage);

        if (pageInfo) pageInfo.textContent = `Page ${currentPage} of ${totalPages}`;

        if (prevPageBtn) prevPageBtn.disabled = currentPage === 1;
        if (nextPageBtn) nextPageBtn.disabled = currentPage === totalPages;
    }

    // Pagination Listeners
    if (prevPageBtn) {
        prevPageBtn.addEventListener('click', () => {
            if (currentPage > 1) {
                currentPage--;
                renderPage();
            }
        });
    }

    if (nextPageBtn) {
        nextPageBtn.addEventListener('click', () => {
            const totalPages = Math.ceil(currentDataObj.rows.length / itemsPerPage);
            if (currentPage < totalPages) {
                currentPage++;
                renderPage();
            }
        });
    }


    function closeModal() {
        if (modal) {
            modal.style.display = 'none';
            modal.classList.remove('show-flex');
        }
    }

    closeBtns.forEach(btn => btn.addEventListener('click', closeModal));
    window.addEventListener('click', (e) => {
        if (e.target === modal) closeModal();
    });

    if (printBtn) {
        printBtn.addEventListener('click', () => {
            window.print();
        });
    }

    if (downloadModalBtn) {
        downloadModalBtn.addEventListener('click', () => {
            downloadReport(currentReportType || 'Report', currentReportPeriod, currentReportClass);
        });
    }

    // --- Generation Logic ---
    if (generateBtn) {
        generateBtn.addEventListener('click', function () {
            // Validation
            if (!typeSelect.value || !periodSelect.value) {
                if (typeof showErrorMessage === 'function') showErrorMessage('Please select report criteria.');
                return;
            }

            const type = typeSelect.value;
            const period = periodSelect.value;
            const className = classSelect.value;
            const format = formatSelect.value;

            // Set current for modal download
            currentReportType = type;
            currentReportPeriod = period;
            currentReportClass = className;

            // Simulate Generation
            if (typeof showSuccessMessage === 'function') {
                showSuccessMessage('Generating report... Please wait.');
            }

            // Disable button
            const originalText = generateBtn.innerHTML;
            generateBtn.disabled = true;
            generateBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Generating...';

            setTimeout(() => {
                // Success
                generateBtn.disabled = false;
                generateBtn.innerHTML = originalText;

                if (typeof showSuccessMessage === 'function') {
                    showSuccessMessage('Report generated successfully!');
                }

                // Add to list
                addRecentReport(type, period, className, format);

                // Auto Open Preview
                const dataObj = generateMockReportData(type, period, className);
                const title = `${type} - ${period} (${className})`;
                openModal(title, dataObj);

            }, 1000); // 1.5s delay
        });
    }

    function addRecentReport(type, period, className, format) {
        const dateStr = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
        const newItem = document.createElement('div');
        newItem.className = 'report-item';

        let reportTitle = `${type} - ${period}`;
        if (className !== 'All Classes') {
            reportTitle += ` (${className})`;
        }

        // Store data attributes
        newItem.dataset.type = type;
        newItem.dataset.period = period;
        newItem.dataset.class = className;

        newItem.innerHTML = `
            <div class="report-info">
                <h4>${reportTitle}</h4>
                <p>Generated on ${dateStr} • ${format}</p>
            </div>
            <div class="report-actions">
                <button class="btn-icon btn-view"><i class="fas fa-eye"></i></button>
                <button class="btn-icon btn-download"><i class="fas fa-download"></i></button>
            </div>
        `;

        const title = reportListContainer.querySelector('h3');
        if (title && title.nextSibling) {
            reportListContainer.insertBefore(newItem, title.nextSibling);
        } else {
            reportListContainer.appendChild(newItem);
        }
    }

    // Delegated Listener
    if (reportListContainer) {
        reportListContainer.addEventListener('click', function (e) {
            const viewBtn = e.target.closest('.btn-view');
            const downloadBtn = e.target.closest('.btn-download');
            const reportItem = e.target.closest('.report-item');

            if (!reportItem) return;

            // Extract Data
            let type = reportItem.dataset.type;
            let period = reportItem.dataset.period;
            let className = reportItem.dataset.class;

            // Fallback for default static HTML items
            if (!type) {
                const titleText = reportItem.querySelector('h4').innerText;
                if (titleText.includes('Student')) { type = 'Student Performance'; period = 'Variable'; className = 'All Classes'; }
                else if (titleText.includes('Financial')) { type = 'Financial Overview'; period = 'Historical'; className = 'All Classes'; }
                else if (titleText.includes('Attendance')) { type = 'Attendance Summary'; period = 'Historical'; className = 'All Classes'; }
                else { type = 'Generic Report'; period = 'N/A'; className = 'N/A'; }
            }

            if (viewBtn) {
                // Update currents for modal download
                currentReportType = type;
                currentReportPeriod = period;
                currentReportClass = className;

                const dataObj = generateMockReportData(type, period, className);
                let title = reportItem.querySelector('h4').innerText;
                openModal(title, dataObj);
            }

            if (downloadBtn) {
                downloadReport(type, period, className);
            }
        });
    }

    function attachActionListeners() {
        // stub
    }

    // --- Real Download Logic ---
    function downloadReport(type, period, className) {
        if (typeof showSuccessMessage === 'function') showSuccessMessage(`Downloading ${type}...`);

        let csvContent = "";
        let filename = `${type.replace(/ /g, '_')}_${period.replace(/ /g, '_')}.csv`;

        // Generate CSV based on type
        // ... (This logic remains similar, simplified for brevity here since dataObj also has rows now, could reuse)
        // For simplicity, hardcoding varied CSVs again to match mock data logic but flatter

        const dataObj = generateMockReportData(type, period, className);
        if (dataObj.headers) {
            csvContent += dataObj.headers.join(",") + "\n";
        }
        if (dataObj.rows) {
            dataObj.rows.forEach(row => {
                csvContent += row.join(",") + "\n";
            });
        }

        // Trigger Download
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement("a");
        if (link.download !== undefined) {
            const url = URL.createObjectURL(blob);
            link.setAttribute("href", url);
            link.setAttribute("download", filename);
            link.style.visibility = 'hidden';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        }
    }

    // --- Mock Data Generator (Paginated Ready) ---
    function generateMockReportData(type, period, className) {
        const data = {
            summary: '',
            headers: [],
            rows: [],
            tablePrefix: '',
            staticHtml: ''
        };

        if (type === 'Student Performance') {
            data.summary = `
                <div class="report-summary">
                    <div class="summary-card"><h5>Total Students</h5><p>450</p></div>
                    <div class="summary-card"><h5>Average Grade</h5><p>B+</p></div>
                    <div class="summary-card"><h5>Pass Rate</h5><p>92%</p></div>
                </div>`;
            data.tablePrefix = '<h3>Detailed Grades</h3>';
            data.headers = ['Student ID', 'Name', 'Subject', 'Grade', 'Remarks'];

            // Generate 50 rows for pagination testing
            for (let i = 1; i <= 50; i++) {
                data.rows.push([
                    `#STD${1000 + i}`,
                    `Student ${i}`,
                    ['Mathematics', 'English', 'Science', 'History'][i % 4],
                    ['A', 'B', 'C', 'B+'][i % 4],
                    ['Excellent', 'Good', 'Average', 'Very Good'][i % 4]
                ]);
            }

        } else if (type === 'Financial Overview') {
            data.summary = `
                <div class="report-summary">
                    <div class="summary-card"><h5>Total Collected</h5><p>$45,200</p></div>
                    <div class="summary-card"><h5>Outstanding</h5><p>$12,500</p></div>
                    <div class="summary-card"><h5>Expenses</h5><p>$20,000</p></div>
                </div>`;
            data.headers = ['Date', 'Description', 'Type', 'Amount', 'Status'];
            // Generate 30 rows
            for (let i = 1; i <= 30; i++) {
                data.rows.push([
                    `2025-12-${(i % 30) + 1}`,
                    `Fee Payment #${i}`,
                    i % 3 === 0 ? 'Expense' : 'Income',
                    `$${(i * 50)}`,
                    i % 5 === 0 ? 'Pending' : 'Cleared'
                ]);
            }

        } else if (type === 'Attendance Summary') {
            data.summary = `
                <div class="report-summary">
                    <div class="summary-card"><h5>Avg Attendance</h5><p>96%</p></div>
                    <div class="summary-card"><h5>Present Today</h5><p>845</p></div>
                    <div class="summary-card"><h5>Absent</h5><p>32</p></div>
                </div>`;
            data.headers = ['Class', 'Total Students', 'Present', 'Absent', 'Rate'];

            ['Form 1A', 'Form 1B', 'Form 1C', 'Form 2A', 'Form 2B', 'Form 2C',
                'Form 3A', 'Form 3B', 'Form 3C', 'Form 4A', 'Form 4B', 'Form 4C',
                'L6 Arts', 'L6 Sci', 'L6 Comm', 'U6 Arts', 'U6 Sci', 'U6 Comm'].forEach(cls => {
                    data.rows.push([cls, '40', '38', '2', '95%']);
                });

        } else {
            data.staticHtml = `
                <div class="report-summary">
                    <div class="summary-card"><h5>Items Processed</h5><p>150</p></div>
                    <div class="summary-card"><h5>Status</h5><p>Complete</p></div>
                </div>
                <p>This is a generated report preview for <strong>${type}</strong> covering <strong>${period}</strong>.</p>
            `;
        }
        return data;
    }
});

