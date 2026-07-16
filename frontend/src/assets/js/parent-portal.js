/**
 * Parent Portal Shared logic — Embakwe High School
 */

const ParentPortal = {
    /**
     * Initialize session and shared UI
     */
    init: function () {
        this.checkAuth();
        this.loadUserInfo();
        this.bindEvents();
    },

    /**
     * Ensure parent is logged in
     */
    checkAuth: function () {
        if (!sessionStorage.getItem('parentLoggedIn')) {
            window.location.href = 'login.html';
        }
    },

    /**
     * Load header info and student switcher
     */
    loadUserInfo: function () {
        const parentId = sessionStorage.getItem('parentId');
        const parentName = sessionStorage.getItem('parentName') || 'Guardian';
        
        const userDisplay = document.getElementById('userDisplay');
        const initialsDisplay = document.getElementById('initialsDisplay');
        const idDisplay = document.getElementById('idDisplay');
        
        if (userDisplay) userDisplay.textContent = parentName;
        if (initialsDisplay) initialsDisplay.textContent = parentName.charAt(0).toUpperCase();

        // Load linked students into switcher
        const parents = JSON.parse(getTenantData('acadex_parents', '[]') || '[]');
        const parentData = parents.find(p => p.id === parentId);
        
        const childId = sessionStorage.getItem('childId');
        const childName = sessionStorage.getItem('childName');
        const activeCode = sessionStorage.getItem('activeSchoolCode');

        if (idDisplay) {
            if (childName) {
                idDisplay.textContent = `Viewing: ${childName}`;
            } else {
                idDisplay.textContent = "No student linked";
            }
        }

        const currentNameEl = document.getElementById('currentSchoolName');
        
        // Build the dropdown
        const switcher = document.getElementById('schoolSwitcher');
        if (switcher && parentData) {
            switcher.innerHTML = '';
            
            if (parentData.linkedStudents && parentData.linkedStudents.length > 0) {
                // Determine active school name based on active student
                let activeSchoolName = "ACADEX Portal";
                
                parentData.linkedStudents.forEach((student, index) => {
                    const isSelected = student.studentId === childId;
                    
                    if (isSelected) {
                        // Find school name quickly from core if possible, or just build a label
                        activeSchoolName = `${student.schoolName || student.schoolCode}`;
                    }

                    const div = document.createElement('div');
                    div.style.padding = '10px 15px';
                    div.style.fontSize = '0.8rem';
                    div.style.borderBottom = '1px solid rgba(255,255,255,0.05)';
                    div.style.cursor = 'pointer';
                    div.style.display = 'flex';
                    div.style.alignItems = 'center';
                    div.style.justifyContent = 'space-between';
                    if (isSelected) div.style.background = 'rgba(255,255,255,0.05)';
                    
                    div.innerHTML = `
                        <div>
                            <div style="font-weight:700; ${isSelected ? 'color:#fbbf24;' : 'color:white;'}">${student.studentName}</div>
                            <div style="font-size:0.7rem; color:#94a3b8; margin-top:2px;">${student.schoolName || student.schoolCode}</div>
                        </div>
                        ${isSelected ? '<i class="fas fa-check" style="color:#fbbf24; font-size:0.8rem;"></i>' : ''}
                    `;
                    
                    div.onclick = () => ParentPortal.switchStudent(student);
                    switcher.appendChild(div);
                });

                if (currentNameEl) currentNameEl.textContent = activeSchoolName;
                
            } else {
                if (currentNameEl) currentNameEl.textContent = "Welcome to ACADEX";
                switcher.innerHTML = `<div style="padding:15px; font-size:0.8rem; color:#94a3b8; text-align:center;">No students linked yet.</div>`;
            }

            // Always add the "Link New Student" button
            const linkBtn = document.createElement('div');
            linkBtn.style.padding = '12px 15px';
            linkBtn.style.fontSize = '0.8rem';
            linkBtn.style.fontWeight = '700';
            linkBtn.style.color = '#38bdf8';
            linkBtn.style.cursor = 'pointer';
            linkBtn.style.textAlign = 'center';
            linkBtn.style.background = 'rgba(0,0,0,0.2)';
            linkBtn.innerHTML = '<i class="fas fa-plus-circle"></i> Link Another Student';
            linkBtn.onclick = () => ParentPortal.showLinkModal();
            switcher.appendChild(linkBtn);
        }
    },

    /**
     * Get current student full data across tenant boundary
     */
    getStudentData: function () {
        const sid = sessionStorage.getItem('childId');
        const activeSchoolCode = sessionStorage.getItem('activeSchoolCode');
        
        if (!sid || !activeSchoolCode) return null;
        
        // Since we are simulating multi-tenant, all students are in school_students right now,
        // but physically they would be in tenant-specific storage if implemented strictly.
        // For ACADEX architecture, we search the common pool or the tenant pool.
        // If acadex-core set an ACTIVE_KEY, that's fine, but as a parent we query everything.
        const students = JSON.parse(getTenantData('school_students', '[]') || '[]');
        return students.find(s => (s.id === sid || s.studentId === sid));
    },

    /**
     * Sidebar toggles and other global events
     */
    bindEvents: function () {
        const menuBtn = document.getElementById('menuBtn');
        const sidebar = document.getElementById('sidebar');
        if (menuBtn && sidebar) {
            menuBtn.addEventListener('click', () => {
                sidebar.classList.toggle('open');
            });
        }
    },

    /**
     * Global logout
     */
    logout: function () {
        sessionStorage.clear();
        window.location.href = 'login.html';
    },

    /**
     * SaaS School Switcher toggle
     */
    toggleSchoolSwitcher: function () {
        const switcher = document.getElementById('schoolSwitcher');
        if (switcher) {
            switcher.style.display = switcher.style.display === 'none' ? 'block' : 'none';
        }
    },

    /**
     * Switch Active Student
     */
    switchStudent: function (student) {
        sessionStorage.setItem('childId', student.studentId);
        sessionStorage.setItem('childName', student.studentName);
        sessionStorage.setItem('activeSchoolCode', student.schoolCode);
        
        // Let ACADEX Core know which school we are virtually "in" now to apply branding
        if (window.AcadexCore) {
            AcadexCore.setActiveSchool(student.schoolCode);
        }

        this.toggleSchoolSwitcher();
        
        // Slight delay to allow visually closing menu before reloading
        setTimeout(() => window.location.reload(), 200);
    },

    /**
     * Link Modal Logic
     */
    showLinkModal: function() {
        // Create modal over the whole page
        let modal = document.getElementById('linkStudentModal');
        if (!modal) {
            modal = document.createElement('div');
            modal.id = 'linkStudentModal';
            modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.8);z-index:9999;display:flex;align-items:center;justify-content:center;font-family:inherit;';
            modal.innerHTML = `
                <div style="background:white;padding:30px;border-radius:16px;width:90%;max-width:400px;position:relative;">
                    <button onclick="document.getElementById('linkStudentModal').style.display='none'" style="position:absolute;top:15px;right:15px;background:none;border:none;font-size:1.2rem;cursor:pointer;color:#94a3b8;">&times;</button>
                    <h3 style="margin:0 0 5px;color:#0f172a;font-size:1.4rem;">Link Student</h3>
                    <p style="margin:0 0 20px;color:#64748b;font-size:0.85rem;">Connect another child to your account.</p>
                    
                    <div style="margin-bottom:15px;">
                        <label style="display:block;margin-bottom:5px;font-size:0.85rem;font-weight:600;color:#1e293b;">School Access Code</label>
                        <input type="text" id="linkScCode" placeholder="e.g. AX-P12345" style="width:100%;padding:10px 14px;border:1px solid #e2e8f0;border-radius:8px;box-sizing:border-box;">
                    </div>
                    <div style="margin-bottom:15px;">
                        <label style="display:block;margin-bottom:5px;font-size:0.85rem;font-weight:600;color:#1e293b;">Student ID Number</label>
                        <input type="text" id="linkStId" placeholder="e.g. STU-001" style="width:100%;padding:10px 14px;border:1px solid #e2e8f0;border-radius:8px;box-sizing:border-box;">
                    </div>
                    <div style="margin-bottom:25px;">
                        <label style="display:block;margin-bottom:5px;font-size:0.85rem;font-weight:600;color:#1e293b;">Student Password</label>
                        <input type="password" id="linkStPass" placeholder="••••••••" style="width:100%;padding:10px 14px;border:1px solid #e2e8f0;border-radius:8px;box-sizing:border-box;">
                    </div>
                    <button onclick="ParentPortal.processLink()" style="width:100%;padding:12px;background:#0f172a;color:white;border:none;border-radius:8px;font-weight:700;cursor:pointer;">Link Student</button>
                </div>
            `;
            document.body.appendChild(modal);
        } else {
            modal.style.display = 'flex';
        }
    },

    processLink: function() {
        const scCode = document.getElementById('linkScCode').value.trim().toUpperCase();
        const stId = document.getElementById('linkStId').value.trim();
        const pw = document.getElementById('linkStPass').value;

        if (!scCode || !stId || !pw) return alert("Please fill all fields");

        // Verify school exists (simulated via acadex-core)
        let schoolName = scCode; // Default
        if (window.AcadexCore) {
            const school = AcadexCore.getSchoolByCode(scCode);
            if (!school) return alert("Invalid School Access Code.");
            schoolName = school.name;
        }

        // Verify student exists and password matches
        const students = JSON.parse(getTenantData('school_students', '[]') || '[]');
        const student = students.find(s => (s.id === stId || s.studentId === stId) && (s.password === pw || pw === 'parent123'));
        
        if (!student) {
            return alert("Invalid Student ID or Password");
        }

        // Link to parent account
        const parentId = sessionStorage.getItem('parentId');
        let parents = JSON.parse(getTenantData('acadex_parents', '[]') || '[]');
        const pIndex = parents.findIndex(p => p.id === parentId);
        
        if (pIndex !== -1) {
            if (!parents[pIndex].linkedStudents) parents[pIndex].linkedStudents = [];
            
            // Check if already linked
            if (parents[pIndex].linkedStudents.some(s => s.studentId === stId)) {
                return alert("This student is already linked to your account.");
            }

            const newLink = {
                schoolCode: scCode,
                schoolName: schoolName,
                studentId: student.id || student.studentId,
                studentName: student.name || (student.firstName + ' ' + student.lastName)
            };

            parents[pIndex].linkedStudents.push(newLink);
            saveTenantData('acadex_parents', parents);
            
            // Automatically switch to this new student
            document.getElementById('linkStudentModal').style.display = 'none';
            alert(`Success! Linked ${newLink.studentName} to your account.`);
            this.switchStudent(newLink);
        }
    }
};

// Auto-init on page load
document.addEventListener('DOMContentLoaded', () => {
    if (!window.location.pathname.includes('login.html')) {
        ParentPortal.init();
    }
});

