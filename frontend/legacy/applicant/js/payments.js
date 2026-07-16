// Payments Page Logic
document.addEventListener('DOMContentLoaded', function () {
    const applicant = JSON.parse(sessionStorage.getItem('currentApplicant'));

    if (!applicant) {
        window.location.href = 'login.html';
        return;
    }

    // Get payment data (stored in applicant object)
    const payments = applicant.payments || [];

    // Calculate totals
    const applicationFee = 50.00; // Standard application fee
    const totalPaid = payments.reduce((sum, payment) => {
        return payment.status === 'Paid' ? sum + payment.amount : sum;
    }, 0);
    const outstanding = applicationFee - totalPaid;

    // Update summary cards
    document.getElementById('totalFees').textContent = `$${applicationFee.toFixed(2)}`;
    document.getElementById('amountPaid').textContent = `$${totalPaid.toFixed(2)}`;
    document.getElementById('outstandingBalance').textContent = `$${outstanding.toFixed(2)}`;

    // Render payment history
    const historyTable = document.getElementById('paymentHistory');

    if (payments.length === 0) {
        historyTable.innerHTML = `
            <tr>
                <td colspan="5" style="text-align: center; padding: 40px; color: #999;">
                    <i class="fas fa-receipt" style="font-size: 3rem; margin-bottom: 10px; display: block;"></i>
                    No payment history available
                </td>
            </tr>
        `;
    } else {
        historyTable.innerHTML = payments.map(payment => {
            const date = new Date(payment.date).toLocaleDateString('en-GB');
            let statusClass = 'badge-pending';
            if (payment.status === 'Paid') statusClass = 'badge-paid';
            if (payment.status === 'Overdue') statusClass = 'badge-overdue';

            return `
                <tr>
                    <td>${date}</td>
                    <td>${payment.description}</td>
                    <td>$${payment.amount.toFixed(2)}</td>
                    <td>${payment.method}</td>
                    <td><span class="status-badge ${statusClass}">${payment.status}</span></td>
                </tr>
            `;
        }).join('');
    }

    // Hide make payment section if fully paid
    if (outstanding <= 0) {
        document.getElementById('makePaymentSection').innerHTML = `
            <h3><i class="fas fa-check-circle" style="color: #28a745;"></i> Payment Complete</h3>
            <p style="color: #28a745; font-size: 1.1rem;">
                All application fees have been paid. Thank you!
            </p>
        `;
    }
});

// Modal Logic
function openDepositModal() {
    document.getElementById('depositModal').style.display = 'block';
}

function closeDepositModal() {
    document.getElementById('depositModal').style.display = 'none';
}

// Form Submission
document.getElementById('depositForm')?.addEventListener('submit', function (e) {
    e.preventDefault();

    const applicant = JSON.parse(sessionStorage.getItem('currentApplicant'));
    const amount = document.getElementById('depositAmount').value;
    const ref = document.getElementById('depositRef').value;
    const fileInput = document.getElementById('depositImage');

    if (!amount || !ref) {
        showToast('Please fill in all fields', 'error');
        return;
    }

    const processSubmission = (imageData) => {
        const newReceipt = {
            id: Date.now(),
            type: 'Applicant',
            applicantId: applicant.applicationId || applicant.id,
            name: applicant.fullName || (applicant.personalDetails ? `${applicant.personalDetails.firstName} ${applicant.personalDetails.lastName}` : 'Applicant'),
            amount: amount,
            ref: ref,
            date: new Date().toISOString(),
            status: 'pending',
            receiptImage: imageData // Capture Base64 image data
        };

        // Save to pending verifications
        const pending = JSON.parse(getTenantData('pendingReceipts', 'null')) || [];
        pending.push(newReceipt);
        saveTenantData('pendingReceipts', pending);

        // Show success and close
        if (window.showToast) {
            showToast('Receipt uploaded successfully! Awaiting verification.', 'success');
        } else {
            alert('Receipt uploaded successfully! Awaiting verification.');
        }

        closeDepositModal();

        // Optional: Refresh history or just inform user
        // window.location.reload(); 
    };

    if (fileInput && fileInput.files[0]) {
        const reader = new FileReader();
        reader.onload = function (event) {
            processSubmission(event.target.result);
        };
        reader.onerror = function () {
            showToast('Error reading file. Please try again.', 'error');
        };
        reader.readAsDataURL(fileInput.files[0]);
    } else {
        processSubmission(null);
    }
});

// Toast Helper (if not globally available)
function showToast(message, type = 'info') {
    alert(`${type.toUpperCase()}: ${message}`);
}

