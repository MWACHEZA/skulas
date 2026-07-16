// Mock Data for Reports
const reportData = {
    'Revenue Analysis': {
        title: 'Revenue Analysis (2025)',
        summary: 'Total Revenue: $150,000. Tuition fees remain the primary source of income.',
        details: `
            <table style="width:100%; border-collapse: collapse;">
                <tr style="background:#f8f9fa;"><th style="padding:10px; border-bottom:1px solid #ddd; text-align:left;">Source</th><th style="padding:10px; border-bottom:1px solid #ddd; text-align:right;">Amount</th></tr>
                <tr><td style="padding:10px; border-bottom:1px solid #eee;">Tuition Fees</td><td style="padding:10px; border-bottom:1px solid #eee; text-align:right;">$100,000</td></tr>
                <tr><td style="padding:10px; border-bottom:1px solid #eee;">Boarding Fees</td><td style="padding:10px; border-bottom:1px solid #eee; text-align:right;">$40,000</td></tr>
                <tr><td style="padding:10px; border-bottom:1px solid #eee;">Uniform Sales</td><td style="padding:10px; border-bottom:1px solid #eee; text-align:right;">$5,000</td></tr>
                <tr><td style="padding:10px; border-bottom:1px solid #eee;">Tuckshop</td><td style="padding:10px; border-bottom:1px solid #eee; text-align:right;">$5,000</td></tr>
            </table>
        `
    },
    'Expense Report': {
        title: 'Expense Report (2025)',
        summary: 'Total Expenses: $45,000. Major costs include salaries and maintenance.',
        details: `
            <table style="width:100%; border-collapse: collapse;">
                <tr style="background:#f8f9fa;"><th style="padding:10px; border-bottom:1px solid #ddd; text-align:left;">Category</th><th style="padding:10px; border-bottom:1px solid #ddd; text-align:right;">Amount</th></tr>
                <tr><td style="padding:10px; border-bottom:1px solid #eee;">Staff Salaries</td><td style="padding:10px; border-bottom:1px solid #eee; text-align:right;">$30,000</td></tr>
                <tr><td style="padding:10px; border-bottom:1px solid #eee;">Maintenance</td><td style="padding:10px; border-bottom:1px solid #eee; text-align:right;">$8,000</td></tr>
                <tr><td style="padding:10px; border-bottom:1px solid #eee;">Utilities</td><td style="padding:10px; border-bottom:1px solid #eee; text-align:right;">$4,000</td></tr>
                <tr><td style="padding:10px; border-bottom:1px solid #eee;">Tuckshop Restock</td><td style="padding:10px; border-bottom:1px solid #eee; text-align:right;">$3,000</td></tr>
            </table>
        `
    },
    'Fee Collection Status': {
        title: 'Fee Collection Status (Term 1)',
        summary: 'Collection Rate: 85%. Outstanding: $12,850.',
        details: `
            <div style="display:flex; gap:20px; margin-bottom:15px;">
                <div style="flex:1; background:#e6f9ed; padding:15px; border-radius:8px; text-align:center;">
                    <h4 style="margin:0; color:#28a745;">Paid</h4>
                    <div style="font-size:1.2rem; font-weight:bold;">$85,000</div>
                </div>
                <div style="flex:1; background:#fff3cd; padding:15px; border-radius:8px; text-align:center;">
                    <h4 style="margin:0; color:#856404;">Pending</h4>
                    <div style="font-size:1.2rem; font-weight:bold;">$10,000</div>
                </div>
                <div style="flex:1; background:#f8d7da; padding:15px; border-radius:8px; text-align:center;">
                    <h4 style="margin:0; color:#721c24;">Overdue</h4>
                    <div style="font-size:1.2rem; font-weight:bold;">$2,850</div>
                </div>
            </div>
        `
    },
    // Default fallback
    'default': {
        title: 'Report Details',
        summary: 'No details available for this report type in this demo.',
        details: ''
    }
};

function viewReport(reportName) {
    const data = reportData[reportName] || reportData['default'];
    const modal = document.getElementById('reportModal');

    document.getElementById('modalTitle').textContent = data.title;
    document.getElementById('modalSummary').textContent = data.summary;
    document.getElementById('modalDetails').innerHTML = data.details;

    modal.style.display = 'flex';
}

function closeReportModal() {
    document.getElementById('reportModal').style.display = 'none';
}

function exportReport(reportName) {
    // Show toast notification
    showSuccessMessage(`Exporting ${reportName}...`);

    // Simulate delay
    setTimeout(() => {
        showSuccessMessage(`${reportName} downloaded successfully!`);
    }, 1500);
}

// Close modal when clicking outside
window.onclick = function (event) {
    const modal = document.getElementById('reportModal');
    if (event.target == modal) {
        modal.style.display = 'none';
    }
}

