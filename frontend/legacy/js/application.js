
/**
 * Unified Application System
 * Handles Form 1, A-Level, and Transfer applications.
 */

let currentStep = 1;
let selectedType = '';

document.addEventListener('DOMContentLoaded', () => {
    console.log("Application script initialized.");
    // Initialize results tables if needed
    if (document.getElementById('oLevelTable')) {
        addResultRow('oLevelTable');
    }
    if (document.getElementById('transferResultsTable')) {
        addResultRow('transferResultsTable');
    }

    // Sync School Code to session for multi-tenant interceptor
    const codeInput = document.getElementById('enrollmentSchoolCode');
    if (codeInput) {
        codeInput.addEventListener('input', (e) => {
            const code = e.target.value.trim().toUpperCase();
            if (code) {
                sessionStorage.setItem('activeSchoolCode', code);
                console.log("Active tenant switched to:", code);
            }
        });

        // Load initial if already in session
        const existing = sessionStorage.getItem('activeSchoolCode');
        if (existing) codeInput.value = existing;
    }

    // Set initial state (Form 1 by default, or none)
    selectType('Form 1');
});

function selectType(type) {
    try {
        console.log("Selecting type:", type);
        selectedType = type;

        // Update UI cards
        document.querySelectorAll('.type-card').forEach(card => {
            card.classList.remove('active');
            const input = card.querySelector('input');
            if (input && input.value === type) {
                card.classList.add('active');
                input.checked = true;
            }
        });

        // Toggle conditional sections in Step 3
        document.querySelectorAll('.conditional-section').forEach(sec => {
            sec.style.display = 'none';
            // Disable all inputs in hidden sections to prevent browser validation blocks
            sec.querySelectorAll('input, select, textarea').forEach(input => {
                input.disabled = true;
            });
        });

        const f1 = document.getElementById('form1Fields');
        const al = document.getElementById('alevelFields');
        const tr = document.getElementById('transferFields');

        let activeSec = null;
        if (type === 'Form 1') activeSec = f1;
        else if (type === 'A-Level') activeSec = al;
        else if (type === 'Transfer') activeSec = tr;

        if (activeSec) {
            activeSec.style.display = 'block';
            // Enable inputs in the active section
            activeSec.querySelectorAll('input, select, textarea').forEach(input => {
                input.disabled = false;
            });
        }

    } catch (err) {
        console.error("Error in selectType:", err);
    }
}

function nextStep(step) {
    // Validation
    if (step > currentStep) {
        if (currentStep === 1 && !selectedType) {
            alert('Please select an application type first.');
            return;
        }

        const currentInputs = document.querySelectorAll(`#step${currentStep} input, #step${currentStep} select, #step${currentStep} textarea`);
        let valid = true;
        currentInputs.forEach(input => {
            // Only validate visible inputs or inputs in active conditional section
            const isVisible = input.offsetParent !== null;
            if (isVisible && !input.checkValidity()) {
                input.reportValidity();
                valid = false;
            }
        });
        if (!valid) return;
    }

    // Update Step UI
    document.querySelectorAll('.form-step').forEach(el => el.classList.remove('active'));
    document.getElementById(`step${step}`).classList.add('active');

    // Update Indicators
    document.querySelectorAll('.step').forEach(el => {
        const s = parseInt(el.getAttribute('data-step'));
        el.classList.remove('active', 'completed');
        if (s < step) el.classList.add('completed');
        if (s === step) el.classList.add('active');
    });

    currentStep = step;

    if (step === 4) populateReview();

    window.scrollTo(0, 0);
}

function prevStep(step) {
    nextStep(step);
}

function getOfficialSubjects() {
    const defaultSubjects = [
        "Mathematics", "English", "Science", "History", "Geography", "Social Sciences",
        "Agriculture", "ICT", "Physical Education", "Visual Performing Arts", "Indigenous Language",
        "Business Studies", "Accounting", "Economics", "Literature", "Art", "Music", "Computer Science"
    ];
    try {
        const stored = getTenantData('officialSubjects', '[]');
        return [...new Set([...defaultSubjects, ...stored])].sort();
    } catch {
        return defaultSubjects;
    }
}

function addResultRow(tableId) {
    try {
        const tbody = document.querySelector(`#${tableId} tbody`);
        const row = document.createElement('tr');

        let subName = 'subject[]';
        let gradName = 'grade[]';
        let subjects = getOfficialSubjects();
        let grades = ['A', 'B', 'C', 'D', 'E', 'U'];

        if (tableId === 'transferResultsTable') {
            subName = 'trSubject[]';
            gradName = 'trGrade[]';
        }

        const subjectOptions = subjects.map(s => `<option value="${s}">${s}</option>`).join('');
        const gradeOptions = grades.map(g => `<option value="${g}">${g}</option>`).join('');

        row.innerHTML = `
            <td>
                <select class="form-control" name="${subName}" required onchange="handleSubjectChange(this)">
                    <option value="">Select Subject</option>
                    ${subjectOptions}
                    <option value="__other__">+ Add New Subject...</option>
                </select>
                <input type="text" class="form-control mt-1 custom-subject" name="${subName}_custom" style="display:none;" placeholder="Enter Subject Name">
            </td>
            <td>
                <select class="form-control" name="${gradName}" required>
                    <option value="">Grade</option>
                    ${gradeOptions}
                </select>
            </td>
            <td><button type="button" class="btn-remove" onclick="this.closest('tr').remove()"><i class="fas fa-times"></i></button></td>
        `;
        tbody.appendChild(row);
    } catch (err) {
        console.error("Error in addResultRow:", err);
    }
}

function addForm1Row() {
    try {
        const tbody = document.querySelector('#form1ResultsTable tbody');
        const row = document.createElement('tr');
        let subjects = getOfficialSubjects();
        const subjectOptions = subjects.map(s => `<option value="${s}">${s}</option>`).join('');

        row.innerHTML = `
            <td>
                <select class="form-control" name="f1Subject[]" required onchange="handleSubjectChange(this)">
                    <option value="">Select Subject</option>
                    ${subjectOptions}
                    <option value="__other__">+ Add New Subject...</option>
                </select>
                <input type="text" class="form-control mt-1 custom-subject" name="f1Subject[]_custom" style="display:none;" placeholder="Enter Subject Name">
            </td>
            <td>
                <select class="form-control" name="f1Unit[]" required>
                    <option value="">Grade</option>
                    <option value="1">1</option><option value="2">2</option><option value="3">3</option>
                    <option value="4">4</option><option value="5">5</option><option value="6">6</option>
                    <option value="7">7</option><option value="8">8</option><option value="9">9</option>
                </select>
            </td>
            <td><button type="button" class="btn-remove" onclick="this.closest('tr').remove()"><i class="fas fa-times"></i></button></td>
        `;
        tbody.appendChild(row);
    } catch (err) {
        console.error("Error in addForm1Row:", err);
    }
}

function handleSubjectChange(select) {
    const customInput = select.parentNode.querySelector('.custom-subject');
    console.log("Subject changed to:", select.value);
    if (select.value === '__other__') {
        customInput.style.display = 'block';
        customInput.required = true;
        customInput.disabled = false;
        customInput.focus();
    } else {
        customInput.style.display = 'none';
        customInput.required = false;
        customInput.disabled = true;
    }
}

function populateReview() {
    const form = document.getElementById('unifiedAppForm');
    const formData = new FormData(form);
    const reviewDiv = document.getElementById('reviewDisplay');

    let html = `
        <div class="review-block">
            <h4>Application Summary</h4>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
                <p><strong>Type:</strong> ${selectedType}</p>
                <p><strong>Name:</strong> ${formData.get('firstName')} ${formData.get('lastName')}</p>
                <p><strong>Email:</strong> ${formData.get('email')}</p>
                <p><strong>Contact:</strong> ${formData.get('phone')}</p>
            </div>
        </div>
    `;

    if (selectedType === 'Form 1') {
        const subjects = formData.getAll('f1Subject[]');
        const units = formData.getAll('f1Unit[]');
        let resultsList = subjects.map((s, i) => {
            let finalSub = s === '__other__' ? formData.get('f1Subject[]_custom') : s;
            return `<li>${finalSub}: <strong>Unit ${units[i]}</strong></li>`;
        }).join('');

        html += `
            <div class="review-block">
                <h4>Academic Details</h4>
                <p><strong>Primary School:</strong> ${formData.get('primarySchool')}</p>
                <p><strong>Grade 7 Results:</strong></p>
                <ul>${resultsList}</ul>
            </div>
        `;
    } else if (selectedType === 'A-Level') {
        const subjects = formData.getAll('subject[]');
        const grades = formData.getAll('grade[]');
        let resultsList = subjects.map((s, i) => {
            let finalSub = s === '__other__' ? formData.get('subject[]_custom') : s;
            return `<li>${finalSub}: <strong>${grades[i]}</strong></li>`;
        }).join('');

        html += `
            <div class="review-block">
                <h4>Academic Details</h4>
                <p><strong>Previous School:</strong> ${formData.get('oLevelSchool')}</p>
                <p><strong>O-Level Results:</strong></p>
                <ul>${resultsList}</ul>
                <p><strong>Preferred A-Level Subjects:</strong> ${formData.get('alevelSubjects')}</p>
            </div>
        `;
    } else if (selectedType === 'Transfer') {
        const subjects = formData.getAll('trSubject[]');
        const grades = formData.getAll('trGrade[]');
        let resultsList = subjects.map((s, i) => {
            let finalSub = s === '__other__' ? formData.get('trSubject[]_custom') : s;
            return `<li>${finalSub}: <strong>${grades[i]}</strong></li>`;
        }).join('');

        html += `
            <div class="review-block">
                <h4>Transfer Details</h4>
                <p><strong>Current School:</strong> ${formData.get('currentSchool')}</p>
                <p><strong>Requested Class:</strong> ${formData.get('requestedClass')}</p>
                <p><strong>Current Level:</strong> ${formData.get('currentLevel')}</p>
                <p><strong>Reason:</strong> ${formData.get('transferReason')}</p>
                <p><strong>Recent Performance:</strong></p>
                <ul>${resultsList}</ul>
            </div>
        `;
    }

    reviewDiv.innerHTML = html;
}

// Handle Submission
document.getElementById('unifiedAppForm').addEventListener('submit', function (e) {
    e.preventDefault();
    console.log("Submission started for type:", selectedType);

    try {
        const utils = window.AppUtils || (typeof AppUtils !== 'undefined' ? AppUtils : null);
        if (!utils) {
            console.error("AppUtils not found!");
            alert('System error: Utils not loaded.');
            return;
        }
        const appUtils = utils; // use local ref

        // Determine Prefix
        let prefix = 'APP';
        if (selectedType === 'Form 1') prefix = 'F1';
        if (selectedType === 'A-Level') prefix = 'AL';
        if (selectedType === 'Transfer') prefix = 'TR';

        console.log("Generating ID with prefix:", prefix);

        // Generate Application ID & Password
        const appId = appUtils.generateNextId(prefix);
        const appPassword = Math.random().toString(36).slice(-6).toUpperCase();
        const formData = new FormData(this);

        console.log("Constructing details for application ID:", appId);

        let details = {};
        let newSubjectsFound = [];

        if (selectedType === 'Form 1') {
            const subjects = formData.getAll('f1Subject[]');
            const units = formData.getAll('f1Unit[]');
            details = {
                primarySchool: formData.get('primarySchool'),
                results: subjects.map((s, i) => {
                    let finalSub = s;
                    if (s === '__other__') {
                        finalSub = formData.get('f1Subject[]_custom');
                        newSubjectsFound.push(finalSub);
                    }
                    return { subject: finalSub, unit: units[i] };
                })
            };
        } else if (selectedType === 'A-Level') {
            const subjects = formData.getAll('subject[]');
            const grades = formData.getAll('grade[]');
            details = {
                oLevelSchool: formData.get('oLevelSchool'),
                oLevelResults: subjects.map((s, i) => {
                    let finalSub = s;
                    if (s === '__other__') {
                        finalSub = formData.get('subject[]_custom');
                        newSubjectsFound.push(finalSub);
                    }
                    return { subject: finalSub, grade: grades[i] };
                }),
                preferredSubjects: formData.get('alevelSubjects')
            };
        } else if (selectedType === 'Transfer') {
            const subjects = formData.getAll('trSubject[]');
            const grades = formData.getAll('trGrade[]');
            details = {
                currentSchool: formData.get('currentSchool'),
                requestedClass: formData.get('requestedClass'),
                currentLevel: formData.get('currentLevel'),
                transferReason: formData.get('transferReason'),
                academicResults: subjects.map((s, i) => {
                    let finalSub = s;
                    if (s === '__other__') {
                        finalSub = formData.get('trSubject[]_custom');
                        newSubjectsFound.push(finalSub);
                    }
                    return { subject: finalSub, grade: grades[i] };
                })
            };
        }

        // Save new subjects to platform list
        if (newSubjectsFound.length > 0) {
            try {
                const stored = getTenantData('officialSubjects', '[]');
                const updated = [...new Set([...stored, ...newSubjectsFound])];
                saveTenantData('officialSubjects', updated);
                console.log("Added new official subjects:", newSubjectsFound);
            } catch (e) { console.error("Could not save new subjects:", e); }
        }

        const application = {
            id: appId,
            password: appPassword,
            type: selectedType,
            fullName: `${formData.get('firstName')} ${formData.get('lastName')}`,
            email: formData.get('email'),
            status: 'Pending',
            submittedDate: new Date().toISOString(),
            details: details,
            timeline: [
                {
                    status: 'Application Submitted',
                    timestamp: new Date().toISOString(),
                    details: `Your ${selectedType} application has been successfully received.`
                }
            ]
        };

        console.log("Saving application to localStorage...");

        // Save to localStorage
        const apps = getTenantData('school_applications', '[]');
        apps.push(application);
        saveTenantData('school_applications', apps);

        console.log("Application saved. Logging audit event...");

        // Audit Log
        if (typeof AuditLogger !== 'undefined') {
            AuditLogger.log(
                `New ${selectedType} Application`,
                `Applicant: ${application.fullName} (${application.id})`,
                AuditLogger.SEVERITY.INFO,
                AuditLogger.PORTAL.PUBLIC,
                'Applications'
            );
        }

        // Success UI
        console.log("Showing success modal...");
        document.getElementById('modalAppId').textContent = appId;
        document.getElementById('modalAppPass').textContent = appPassword;

        const modal = document.getElementById('successModal');
        modal.style.display = 'flex';

        console.log("Submission complete!");
    } catch (err) {
        console.error("Submission error:", err);
        alert("An error occurred during submission: " + err.message);
    }
});

