/* Enhanced Fees and Payments Functionality */

// Fee structures
const DEFAULT_FEE_STRUCTURES = [
    {
        id: 1,
        name: 'Form 1 & 2',
        total: 450,
        breakdown: {
            tuition: 300,
            books: 80,
            activities: 40,
            technology: 30
        }
    },
    {
        id: 2,
        name: 'Form 3 & 4',
        total: 550,
        breakdown: {
            tuition: 380,
            books: 100,
            activities: 40,
            technology: 30
        }
    },
    {
        id: 3,
        name: 'Boarding',
        total: 800,
        breakdown: {
            accommodation: 500,
            meals: 250,
            laundry: 30,
            security: 20
        }
    }
];

function getFeeStructures() {
    if (typeof getTenantData === 'function') {
        return getTenantData('feeStructures', JSON.stringify(DEFAULT_FEE_STRUCTURES));
    }
    return DEFAULT_FEE_STRUCTURES;
}

function saveFeeStructures(data) {
    if (typeof saveTenantData === 'function') {
        saveTenantData('feeStructures', data);
    }
}

let feeStructures = getFeeStructures();

// Edit fee structure
function editFeeStructure(id) {
    const fee = feeStructures.find(f => f.id === id);
    if (!fee) return;

    document.getElementById('editFeeId').value = fee.id;
    document.getElementById('editFeeName').value = fee.name;
    document.getElementById('editFeeTotal').value = fee.total;

    // Populate breakdown fields
    const breakdown = fee.breakdown;
    const breakdownHtml = Object.keys(breakdown).map(key => `
        <div class="form-group">
            <label>${key.charAt(0).toUpperCase() + key.slice(1)}</label>
            <input type="number" class="breakdown-input" data-key="${key}" value="${breakdown[key]}" required>
        </div>
    `).join('');

    document.getElementById('feeBreakdown').innerHTML = breakdownHtml;
    openModal('editFeeModal');
}

// Handle edit fee structure
function handleEditFee(event) {
    event.preventDefault();

    const id = parseInt(document.getElementById('editFeeId').value);
    const feeIndex = feeStructures.findIndex(f => f.id === id);

    if (feeIndex === -1) return;

    const breakdown = {};
    document.querySelectorAll('.breakdown-input').forEach(input => {
        breakdown[input.dataset.key] = parseInt(input.value);
    });

    feeStructures[feeIndex] = {
        id: id,
        name: document.getElementById('editFeeName').value,
        total: parseInt(document.getElementById('editFeeTotal').value),
        breakdown: breakdown
    };

    saveFeeStructures(feeStructures);
    closeModal('editFeeModal');
    showSuccessMessage('Fee structure updated successfully!');

    // Refresh the fee cards display
    if (typeof renderFeeCards === 'function') {
        renderFeeCards();
    }
}

// View all payments
function viewAllPayments() {
    window.location.href = 'payments.html';
}

// Payment transactions
const DEFAULT_PAYMENTS = [
    {
        id: 'TXN-20251215-001',
        student: 'John Doe',
        amount: 550,
        method: 'Bank Transfer',
        date: 'Dec 15, 2025 10:30 AM',
        status: 'Completed'
    },
    {
        id: 'TXN-20251215-002',
        student: 'Jane Smith',
        amount: 450,
        method: 'Mobile Money',
        date: 'Dec 15, 2025 09:15 AM',
        status: 'Pending'
    },
    {
        id: 'TXN-20251214-089',
        student: 'Michael Brown',
        amount: 550,
        method: 'Cash',
        date: 'Dec 14, 2025 02:45 PM',
        status: 'Completed'
    },
    {
        id: 'TXN-20251214-088',
        student: 'Emily Davis',
        amount: 450,
        method: 'Bank Transfer',
        date: 'Dec 14, 2025 11:20 AM',
        status: 'Failed'
    }
];

function getPayments() {
    if (typeof getTenantData === 'function') {
        return getTenantData('school_payments', JSON.stringify(DEFAULT_PAYMENTS));
    }
    return DEFAULT_PAYMENTS;
}

let payments = getPayments();

// Render payments table
function renderPayments(paymentsToRender = payments) {
    const tbody = document.getElementById('paymentsTableBody');
    if (!tbody) return;

    tbody.innerHTML = '';

    paymentsToRender.forEach((payment, index) => {
        let statusClass = 'status-completed';
        if (payment.status === 'Pending') statusClass = 'status-pending';
        if (payment.status === 'Failed') statusClass = 'status-failed';

        const row = `
            <tr>
                <td>${payment.id}</td>
                <td>${payment.student}</td>
                <td>$${payment.amount}</td>
                <td>${payment.method}</td>
                <td>${payment.date}</td>
                <td><span class="status-badge ${statusClass}">${payment.status}</span></td>
            </tr>
        `;
        tbody.innerHTML += row;
    });
}

// Filter payments
function filterPayments() {
    const searchTerm = document.getElementById('searchInput')?.value.toLowerCase() || '';
    const statusFilter = document.getElementById('statusFilter')?.value || '';
    const methodFilter = document.getElementById('methodFilter')?.value || '';

    const filtered = payments.filter(payment => {
        const matchesSearch = payment.id.toLowerCase().includes(searchTerm) ||
            payment.student.toLowerCase().includes(searchTerm);
        const matchesStatus = !statusFilter || payment.status === statusFilter;
        const matchesMethod = !methodFilter || payment.method === methodFilter;

        return matchesSearch && matchesStatus && matchesMethod;
    });

    renderPayments(filtered);
}

// Initialize payments page
function initPaymentsPage() {
    renderPayments();

    const searchInput = document.getElementById('searchInput');
    const statusFilter = document.getElementById('statusFilter');
    const methodFilter = document.getElementById('methodFilter');

    if (searchInput) searchInput.addEventListener('keyup', filterPayments);
    if (statusFilter) statusFilter.addEventListener('change', filterPayments);
    if (methodFilter) methodFilter.addEventListener('change', filterPayments);
}

// Auto-initialize if on payments page
if (document.getElementById('paymentsTableBody')) {
    initPaymentsPage();
}

