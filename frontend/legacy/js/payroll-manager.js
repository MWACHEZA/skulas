/**
 * Payroll Manager - Handles payroll logic and rendering
 */

const PayrollManager = {
    staff: [],
    
    /**
     * Initialize the manager
     */
    init: function() {
        this.loadStaff();
        this.setupEventListeners();
        this.render();
    },

    /**
     * Load staff from CommonStaff
     */
    loadStaff: function() {
        if (typeof CommonStaff !== 'undefined') {
            this.staff = CommonStaff.getAllStaff();
        } else {
            console.error('CommonStaff utility not found');
        }
    },

    /**
     * Setup UI event listeners
     */
    setupEventListeners: function() {
        const searchInput = document.getElementById('staffSearch');
        const employerFilter = document.getElementById('employerFilter');
        const runBtn = document.getElementById('runPayrollBtn');

        if (searchInput) {
            searchInput.addEventListener('input', () => this.render());
        }

        if (employerFilter) {
            employerFilter.addEventListener('change', () => this.render());
        }

        if (runBtn) {
            runBtn.addEventListener('click', () => {
                const employer = employerFilter.value;
                const filtered = this.getFilteredStaff();
                
                if (filtered.length === 0) {
                    if (typeof Toast !== 'undefined') Toast.warning('No staff members to run payroll for.');
                    else alert('No staff members to run payroll for.');
                    return;
                }

                if (typeof showSuccessMessage === 'function') {
                    showSuccessMessage(`Payroll run initiated for ${filtered.length} ${employer === 'All' ? '' : employer} staff members.`);
                } else if (typeof Toast !== 'undefined') {
                    Toast.success(`Payroll run initiated for ${filtered.length} staff members.`);
                }
            });
        }
    },

    /**
     * Get filtered staff based on UI state
     */
    getFilteredStaff: function() {
        const query = document.getElementById('staffSearch').value.toLowerCase();
        const employer = document.getElementById('employerFilter').value;

        return this.staff.filter(s => {
            const matchesSearch = s.name.toLowerCase().includes(query) || 
                                 s.role.toLowerCase().includes(query);
            const matchesEmployer = employer === 'All' || s.employer === employer;
            return matchesSearch && matchesEmployer;
        });
    },

    /**
     * Render the payroll table
     */
    render: function() {
        const tbody = document.getElementById('payrollTableBody');
        if (!tbody) return;

        const filtered = this.getFilteredStaff();
        tbody.innerHTML = '';

        if (filtered.length === 0) {
            tbody.innerHTML = '<tr><td colspan="9" style="text-align:center; padding: 20px;">No staff found</td></tr>';
            return;
        }

        filtered.forEach(s => {
            const base = parseFloat(s.baseSalary || 0);
            const allowances = parseFloat(s.allowances || 0);
            const deductions = parseFloat(s.deductions || 0);
            const net = base + allowances - deductions;

            const employerStyle = s.employer === 'Government' 
                ? 'background: #e3f2fd; color: #0d47a1;' 
                : 'background: #f3e5f5; color: #7b1fa2;';

            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${s.name}</td>
                <td>${s.role}</td>
                <td><span style="${employerStyle} padding: 2px 8px; border-radius: 4px; font-size: 0.8rem;">${s.employer || 'SDC Fund'}</span></td>
                <td>$${base.toLocaleString()}</td>
                <td>$${allowances.toLocaleString()}</td>
                <td>$${deductions.toLocaleString()}</td>
                <td><strong>$${net.toLocaleString()}</strong></td>
                <td><span class="status-badge status-paid">Paid</span></td>
                <td>
                    <button class="btn" style="padding:5px 10px; font-size:0.8rem;" onclick="PayrollManager.generatePayslip('${s.id}')">Payslip</button>
                </td>
            `;
            tbody.appendChild(row);
        });
    },

    /**
     * Mock payslip generation
     */
    generatePayslip: function(id) {
        const s = this.staff.find(staff => staff.id === id);
        if (s) {
            const msg = `Payslip generated for ${s.name} (${s.employer || 'SDC'})`;
            if (typeof showSuccessMessage === 'function') showSuccessMessage(msg);
            else if (typeof Toast !== 'undefined') Toast.success(msg);
            else alert(msg);
        }
    }
};

document.addEventListener('DOMContentLoaded', () => {
    PayrollManager.init();
});

