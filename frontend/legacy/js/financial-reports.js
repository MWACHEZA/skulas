// Financial Reports dynamic updates
document.addEventListener('DOMContentLoaded', function () {
    updateFinancialStats();
});

function updateFinancialStats() {
    const stats = {
        totalRevenue: 0,
        totalExpenses: 0,
        netProfit: 0,
        outstandingFees: 0
    };

    // Calculate from Payments (Tenant-aware)
    if (typeof getTenantData === 'function') {
        const payments = getTenantData('school_payments', '[]');
        payments.forEach(p => {
            if (p.status === 'Completed') {
                stats.totalRevenue += p.amount;
            } else if (p.status === 'Pending') {
                stats.outstandingFees += p.amount;
            }
        });
        
        // Mocking some expenses for now based on a percentage or separate data
        // In a real app, these would come from an 'expenses' tenant key
        const expenses = getTenantData('school_expenses', '[]');
        if (expenses.length > 0) {
            expenses.forEach(e => stats.totalExpenses += e.amount);
        } else {
            // Default mock for demo
            stats.totalExpenses = stats.totalRevenue * 0.6; 
        }
        
        stats.netProfit = stats.totalRevenue - stats.totalExpenses;
    }

    // Update UI
    const elements = {
        'Total Revenue': stats.totalRevenue,
        'Total Expenses': stats.totalExpenses,
        'Net Profit': stats.netProfit,
        'Outstanding Fees': stats.outstandingFees
    };

    const cards = document.querySelectorAll('.stat-card');
    cards.forEach(card => {
        const title = card.querySelector('h4').textContent;
        const valEl = card.querySelector('.stat-value');
        if (elements[title] !== undefined) {
            valEl.textContent = '$' + elements[title].toLocaleString();
        }
    });
}

