/* Student Fees Logic - v2.1.0 */
console.log('Student Fees Script v2.1.0 Loaded');
const currentYear = new Date().getFullYear();
const termFees = {
    [`term1-${currentYear}`]: { status: 'paid', date: `${currentYear}-01-15` },
    [`term2-${currentYear}`]: { status: 'paid', date: `${currentYear}-05-15` },
    [`term3-${currentYear}`]: { status: 'pending', date: `${currentYear}-09-15` }
};

const paymentHistory = [
    { id: "REC-2023-001", date: "2023-05-10", desc: "Tuition Fee - Term 2", amount: 500, currency: 'USD', usdEquivalent: 500, rateAtPayment: 1.0, method: "Bank Transfer" },
    { id: "REC-2023-002", date: "2023-05-10", desc: "Development Levy - Term 2", amount: 98, currency: 'ZiG', usdEquivalent: 3.92, rateAtPayment: 25.0, method: "Bank Transfer" },
];

document.addEventListener('DOMContentLoaded', function () {
    const termSelect = document.getElementById('termSelect');
    const feesTableBody = document.getElementById('feesTableBody');
    const historyTableBody = document.getElementById('historyTableBody');
    const balanceAmount = document.getElementById('balanceAmount');
    const displayCurrencySelect = document.getElementById('displayCurrency');
    const convertedAmountDiv = document.getElementById('convertedAmount');
    const makePaymentBtn = document.getElementById('makePaymentBtn');
    const receiptModal = document.getElementById('receiptModal');

    // Get current student data
    const studentId = sessionStorage.getItem('studentId');
    const students = getTenantData('students', '[]');
    const currentStudent = students.find(s => s.studentId === studentId) || { grade: 'Form 4A (Sciences)' };

    // Initialize LocalStorage
    if (!getTenantData('studentBalance', 'null')) {
        const bal = (currentStudent && typeof currentStudent.balance !== 'undefined') ? currentStudent.balance : 520.00;
        saveTenantData('studentBalance', bal.toString());
    }
    if (!getTenantData('pendingReceipts', 'null')) {
        saveTenantData('pendingReceipts', []);
    }

    function renderFees(term) {
        if (!feesTableBody) return;
        feesTableBody.innerHTML = '';

        if (!window.FeesManager) {
            console.error('FeesManager not loaded');
            feesTableBody.innerHTML = '<tr><td colspan="4" style="text-align: center; color: red;">Error: Fees Manager not loaded. Please contact IT Support.</td></tr>';
            return;
        }

        const breakdown = window.FeesManager.getFeeForClass(currentStudent.grade) || [];
        const termInfo = termFees[term] || { status: 'pending', date: new Date().toISOString() };

        if (breakdown.length === 0) {
            feesTableBody.innerHTML = '<tr><td colspan="4" style="text-align: center;">No fee structure found for class: ' + (currentStudent.grade || 'Unknown') + '</td></tr>';
        } else {
            breakdown.forEach(item => {
                const row = document.createElement('tr');
                const statusClass = 'status-' + termInfo.status;
                const displayStatus = termInfo.status.charAt(0).toUpperCase() + termInfo.status.slice(1);

                row.innerHTML = `
                    <td>${item.desc}</td>
                    <td>$${parseFloat(item.amount).toFixed(2)}</td>
                    <td>${formatDate(termInfo.date)}</td>
                    <td><span class="${statusClass}">${displayStatus}</span></td>
                `;
                feesTableBody.appendChild(row);
            });
        }

        updateBalanceDisplay();
    }

    function updateBalanceDisplay() {
        const usdBalance = parseFloat(getTenantData('studentBalance', 'null') || 0);
        const currency = displayCurrencySelect.value;

        balanceAmount.textContent = `$${usdBalance.toFixed(2)}`;

        if (currency !== 'USD') {
            const converted = window.FinancialConfig.convert(usdBalance, 'USD', currency);
            convertedAmountDiv.textContent = `≈ ${window.FinancialConfig.format(converted, currency)}`;
            convertedAmountDiv.style.display = 'block';
        } else {
            convertedAmountDiv.style.display = 'none';
        }
    }

    function renderDailyRates() {
        const container = document.getElementById('dailyRatesDisplay');
        const dateEl = document.getElementById('ratesDate');
        if (!container || !dateEl) return;

        const prices = window.FinancialConfig.EXCHANGE_RATES;
        dateEl.textContent = new Date().toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

        container.innerHTML = `
            <div style="background: rgba(255,255,255,0.1); padding: 8px 15px; border-radius: 6px; font-weight: 500; border: 1px solid rgba(255,255,255,0.2);">
                🇺🇸 USD 1.00 = 🇿🇼 ZiG ${window.FinancialConfig.format(prices.ZiG, 'ZiG')}
            </div>
            <div style="background: rgba(255,255,255,0.1); padding: 8px 15px; border-radius: 6px; font-weight: 500; border: 1px solid rgba(255,255,255,0.2);">
                🇺🇸 USD 1.00 = 🇿🇦 ZAR ${window.FinancialConfig.format(prices.ZAR, 'ZAR')}
            </div>
        `;
    }

    function renderHistory() {
        historyTableBody.innerHTML = '';
        const pendingReceipts = JSON.parse(getTenantData('pendingReceipts', 'null')) || [];
        const myPending = pendingReceipts.filter(r => r.studentId === studentId);

        const allHistory = [...myPending.map(p => ({
            id: p.ref,
            date: p.date,
            desc: `Bank Deposit (${p.currency})`,
            amount: parseFloat(p.amount),
            currency: p.currency,
            usdEquivalent: p.usdEquivalent,
            rateAtPayment: p.rateAtPayment || window.FinancialConfig.getRatesForDate(p.date)[p.currency],
            method: 'Bank Deposit',
            isPending: true
        })), ...paymentHistory];

        allHistory.sort((a, b) => new Date(b.date) - new Date(a.date));

        allHistory.forEach(payment => {
            const row = document.createElement('tr');
            const actionHtml = payment.isPending
                ? '<span class="status-pending" style="padding: 2px 8px; border-radius: 12px; font-size: 0.8rem; background: #fff3cd; color: #856404;">Pending</span>'
                : `<a href="#" class="receipt-link" onclick="viewReceipt('${payment.id}')" style="color: #007bff; text-decoration: none;">View</a>`;

            const originalAmount = window.FinancialConfig.format(payment.amount, payment.currency);
            const rateUsed = payment.currency === 'USD' ? '1.0' : (payment.rateAtPayment || '-');
            const usdEq = window.FinancialConfig.format(payment.usdEquivalent, 'USD');

            row.innerHTML = `
                <td style="padding: 12px;">${formatDate(payment.date)}</td>
                <td style="padding: 12px;">${payment.desc}</td>
                <td style="padding: 12px; font-weight: 500;">${originalAmount}</td>
                <td style="padding: 12px; color: #666;">${rateUsed}</td>
                <td style="padding: 12px; font-weight: 600; color: #2c3e50;">${usdEq}</td>
                <td style="padding: 12px;">${payment.method}</td>
                <td style="padding: 12px;">${actionHtml}</td>
            `;
            row.style.borderBottom = '1px solid #eee';
            historyTableBody.appendChild(row);
        });
    }

    // Event Listeners
    termSelect.addEventListener('change', () => renderFees(termSelect.value));
    displayCurrencySelect.addEventListener('change', updateBalanceDisplay);

    makePaymentBtn.onclick = () => {
        document.getElementById('paymentModal').style.display = 'block';
    };

    const submitBtn = document.getElementById('submitBankPayment');
    if (submitBtn) {
        submitBtn.onclick = function () {
            const amount = document.getElementById('paymentAmount').value;
            const currency = document.getElementById('paymentCurrency').value;
            const ref = document.querySelector('#pm-bank input[type="text"]').value;
            // Assuming the bank section has a file input with id 'paymentProof' or similar. 
            // If not present in HTML, we fall back to a placeholder or need to add it.
            // Let's assume there's a file input, or we add one dynamically if missing for now.
            // Note: The HTML view didn't explicitly show the file input ID in the snippet, 
            // but standard practice implies one for "upload proof". 
            // We'll target the input type="file" inside #pm-bank.
            const fileInput = document.querySelector('#pm-bank input[type="file"]');

            console.log('[DEBUG] Bank Payment Submission:', {
                amount,
                currency,
                ref,
                fileInputFound: !!fileInput,
                hasFile: fileInput && fileInput.files && fileInput.files.length > 0
            });

            if (!amount || !ref) {
                if (typeof showToast === 'function') showToast('Please fill in all fields', 'error');
                else alert('Please fill in all fields');
                return;
            }

            const processPayment = (fileData) => {
                const usdEquivalent = window.FinancialConfig.getUSDEquivalent(amount, currency);
                const rate = window.FinancialConfig.EXCHANGE_RATES[currency];
                const currentTerm = document.getElementById('termSelect').value || `term-${new Date().getFullYear()}`;

                console.log('[DEBUG] Processing payment with file data:', {
                    hasFileData: !!fileData,
                    fileDataLength: fileData ? fileData.length : 0,
                    fileDataPreview: fileData ? fileData.substring(0, 50) : 'null'
                });

                const newReceipt = {
                    id: Date.now(),
                    type: 'Student',
                    name: currentStudent.firstName + ' ' + currentStudent.lastName,
                    studentId: studentId,
                    class: currentStudent.grade || 'Unknown',
                    term: currentTerm,
                    amount: amount,
                    currency: currency,
                    usdEquivalent: usdEquivalent,
                    rateAtPayment: rate,
                    ref: ref,
                    date: new Date().toISOString(),
                    status: 'pending',
                    receiptImage: fileData // Base64 string or null
                };

                console.log('[DEBUG] Created receipt object:', {
                    id: newReceipt.id,
                    hasReceiptImage: !!newReceipt.receiptImage,
                    receiptImageLength: newReceipt.receiptImage ? newReceipt.receiptImage.length : 0
                });

                const existing = JSON.parse(getTenantData('pendingReceipts', 'null')) || [];
                existing.push(newReceipt);
                saveTenantData('pendingReceipts', existing);

                console.log('[DEBUG] Saved to localStorage. Total pending:', existing.length);

                document.getElementById('paymentModal').style.display = 'none';
                renderHistory();

                if (typeof AuditLogger !== 'undefined') {
                    AuditLogger.log('Fee Payment Upload', `Uploaded ${amount} ${currency} receipt (USD eq: $${usdEquivalent.toFixed(2)})`, AuditLogger.SEVERITY.INFO, AuditLogger.PORTAL.STUDENT, 'Finance');
                }
                if (typeof showToast === 'function') showToast('Receipt uploaded successfully!', 'success');
            };

            if (fileInput && fileInput.files[0]) {
                console.log('[DEBUG] File selected:', {
                    name: fileInput.files[0].name,
                    type: fileInput.files[0].type,
                    size: fileInput.files[0].size
                });

                const reader = new FileReader();
                reader.onload = function (e) {
                    console.log('[DEBUG] FileReader loaded, result length:', e.target.result.length);
                    processPayment(e.target.result);
                };
                reader.onerror = function (e) {
                    console.error('[DEBUG] FileReader error:', e);
                    alert('Error reading file. Please try again.');
                };
                reader.readAsDataURL(fileInput.files[0]);
            } else {
                console.log('[DEBUG] No file selected, proceeding without receipt image');
                // Determine if file upload is mandatory. For now, allow without but warn?
                // Or works without plain file to keep flow verifying ref number.
                // Let's proceed without file for flexibility, or user can enforce.
                processPayment(null);
            }
        };
    }

    window.viewReceipt = function (id) {
        const receipt = paymentHistory.find(p => p.id === id);
        if (receipt) {
            document.getElementById('rSurname').textContent = currentStudent.lastName;
            document.getElementById('rFirstName').textContent = currentStudent.firstName;
            document.getElementById('rClass').textContent = currentStudent.grade;

            const itemsTbody = document.getElementById('invoiceItems');
            const breakdown = window.FeesManager.getFeeForClass(currentStudent.grade);
            let total = 0;

            itemsTbody.innerHTML = breakdown.map(item => {
                const amt = parseFloat(item.amount) || 0;
                total += amt;
                return `
                    <tr>
                        <td style="border: 1px solid #000; padding: 8px;">${item.desc}</td>
                        <td style="border: 1px solid #000; padding: 8px; text-align: right;">${amt.toFixed(2)}</td>
                    </tr>
                `;
            }).join('');

            document.getElementById('rTotalFees').textContent = 'USD$' + total.toFixed(2);
            document.getElementById('rPrevBalance').textContent = 'USD$0.00';
            document.getElementById('rGrandTotal').textContent = 'USD$' + total.toFixed(2);

            const downloadBtn = receiptModal.querySelector('.payment-button');
            downloadBtn.onclick = function () { downloadReceipt(receipt); };

            receiptModal.style.display = 'block';
        }
    };

    function downloadReceipt(receipt) {
        const content = `
EMBAKWE HIGH SCHOOL - OFFICIAL RECEIPT
Receipt #: ${receipt.id}
Date: ${formatDate(receipt.date)}
--------------------------------
Description: ${receipt.desc}
Payment Method: ${receipt.method}
Amount Paid: ${receipt.currency} ${receipt.amount.toFixed(2)}
USD Equivalent: $${receipt.usdEquivalent.toFixed(2)}
--------------------------------
Generated on: ${new Date().toLocaleString()}
        `;
        const blob = new Blob([content], { type: 'text/plain' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `Receipt-${receipt.id}.txt`;
        a.click();
    }

    function formatDate(dateString) {
        if (!dateString) return '-';
        return new Date(dateString).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
    }

    function renderOfficialStructure() {
        const body = document.getElementById('officialStructureBody');
        const totalEl = document.getElementById('officialTotal');
        if (!body || !totalEl) return;

        body.innerHTML = '';
        const grade = currentStudent.grade || 'Not Assigned';
        const breakdown = window.FeesManager.getFeeForClass(grade) || [];
        let total = 0;

        if (breakdown.length === 0) {
            body.innerHTML = `<tr><td colspan="2" style="text-align: center;">
                <div style="padding: 20px;">
                    <i class="fas fa-exclamation-circle" style="font-size: 2rem; color: #ffc107; margin-bottom: 10px;"></i>
                    <p>No fee structure found for class level: <strong>${grade}</strong></p>
                    <p style="font-size: 0.8rem; color: #888;">Please ensure your class is correctly set in your profile.</p>
                </div>
            </td></tr>`;
        } else {
            breakdown.forEach(item => {
                const amt = parseFloat(item.amount) || 0;
                total += amt;
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td style="padding: 12px 15px; border-bottom: 1px solid #eee;">${item.desc}</td>
                    <td style="padding: 12px 15px; border-bottom: 1px solid #eee; text-align: right;">$${amt.toFixed(2)}</td>
                `;
                body.appendChild(row);
            });
        }
        totalEl.textContent = `$${total.toFixed(2)}`;
    }

    function initTermSelector() {
        const termSelect = document.getElementById('termSelect');
        if (!termSelect) return;

        const year = new Date().getFullYear();
        termSelect.innerHTML = `
            <option value="term1-${year}">Term 1 - ${year}</option>
            <option value="term2-${year}" selected>Term 2 - ${year}</option>
            <option value="term3-${year}">Term 3 - ${year}</option>
        `;

        termSelect.addEventListener('change', (e) => {
            renderFees(e.target.value);
        });
    }

    initTermSelector();
    const currentYearKey = `term2-${new Date().getFullYear()}`;
    renderFees(currentYearKey);
    renderOfficialStructure();
    renderDailyRates(); // New function
    renderHistory();
});

