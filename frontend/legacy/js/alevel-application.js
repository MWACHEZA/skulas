/* A-Level Application System - Subject Combination Engine */

// ZIMSEC A-Level Subject Pathways
const ALEVEL_PATHWAYS = {
    sciences: {
        name: 'Sciences',
        subjects: ['Mathematics', 'Biology', 'Chemistry', 'Physics', 'Computer Science'],
        requiredOLevel: ['Mathematics', 'Combined Science'],
        minGrade: 'C'
    },
    commercials: {
        name: 'Commercials',
        subjects: ['Accounting', 'Business Studies', 'Economics', 'Geography', 'Mathematics'],
        requiredOLevel: ['Mathematics'],
        minGrade: 'C'
    },
    arts: {
        name: 'Arts & Humanities',
        subjects: ['History', 'Literature in English', 'Geography', 'Ndebele', 'Family & Religious Studies'],
        requiredOLevel: ['English Language'],
        minGrade: 'C'
    }
};

// O-Level to A-Level subject prerequisites
const SUBJECT_PREREQUISITES = {
    'Mathematics': { oLevel: ['Mathematics'], minGrade: 'C' },
    'Biology': { oLevel: ['Combined Science'], minGrade: 'C' },
    'Chemistry': { oLevel: ['Combined Science', 'Mathematics'], minGrade: 'C' },
    'Physics': { oLevel: ['Combined Science', 'Mathematics'], minGrade: 'C' },
    'Computer Science': { oLevel: ['Mathematics'], minGrade: 'C' },
    'Accounting': { oLevel: ['Mathematics'], minGrade: 'C' },
    'Business Studies': { oLevel: ['Commerce'], minGrade: 'D' },
    'Economics': { oLevel: ['Mathematics'], minGrade: 'C' },
    'Geography': { oLevel: ['Geography'], minGrade: 'D' },
    'History': { oLevel: ['History'], minGrade: 'D' },
    'Literature in English': { oLevel: ['English Language', 'Literature in English'], minGrade: 'C' },
    'Ndebele': { oLevel: ['Ndebele'], minGrade: 'D' },
    'Family & Religious Studies': { oLevel: ['Family and Religious Studies'], minGrade: 'D' }
};

// Valid A-Level subject combinations
const VALID_COMBINATIONS = {
    sciences: [
        ['Mathematics', 'Physics', 'Chemistry'],
        ['Mathematics', 'Biology', 'Chemistry'],
        ['Mathematics', 'Physics', 'Computer Science'],
        ['Biology', 'Chemistry', 'Physics']
    ],
    commercials: [
        ['Accounting', 'Business Studies', 'Economics'],
        ['Accounting', 'Economics', 'Mathematics'],
        ['Business Studies', 'Economics', 'Geography'],
        ['Accounting', 'Business Studies', 'Mathematics']
    ],
    arts: [
        ['History', 'Geography', 'Literature in English'],
        ['History', 'Literature in English', 'Family & Religious Studies'],
        ['Geography', 'Ndebele', 'Family & Religious Studies'],
        ['History', 'Geography', 'Ndebele']
    ]
};

// Grade point system
const GRADE_POINTS = {
    'A': 1, 'B': 2, 'C': 3, 'D': 4, 'E': 5, 'U': 6
};

// Application data storage
let applications = [];
let currentApplication = {
    personalDetails: {},
    oLevelResults: [],
    requestedSubjects: [],
    suggestedCombinations: [],
    selectedCombination: null
};

// Check if student meets prerequisites for a subject
function meetsPrerequisites(subject, oLevelResults) {
    const prereqs = SUBJECT_PREREQUISITES[subject];
    if (!prereqs) return true;

    for (const requiredSubject of prereqs.oLevel) {
        const result = oLevelResults.find(r => r.subject === requiredSubject);
        if (!result) return false;

        const gradePoint = GRADE_POINTS[result.grade];
        const minGradePoint = GRADE_POINTS[prereqs.minGrade];

        if (gradePoint > minGradePoint) return false;
    }

    return true;
}

// Generate subject combinations based on O-Level results
function generateCombinations(requestedSubjects, oLevelResults) {
    const combinations = [];

    // Determine which pathway(s) the student qualifies for
    const qualifiedPathways = [];

    // Check Sciences pathway
    if (ALEVEL_PATHWAYS.sciences.requiredOLevel.every(sub =>
        oLevelResults.some(r => r.subject === sub && GRADE_POINTS[r.grade] <= GRADE_POINTS['C'])
    )) {
        qualifiedPathways.push('sciences');
    }

    // Check Commercials pathway
    if (ALEVEL_PATHWAYS.commercials.requiredOLevel.every(sub =>
        oLevelResults.some(r => r.subject === sub && GRADE_POINTS[r.grade] <= GRADE_POINTS['C'])
    )) {
        qualifiedPathways.push('commercials');
    }

    // Check Arts pathway
    if (ALEVEL_PATHWAYS.arts.requiredOLevel.every(sub =>
        oLevelResults.some(r => r.subject === sub && GRADE_POINTS[r.grade] <= GRADE_POINTS['C'])
    )) {
        qualifiedPathways.push('arts');
    }

    // Generate combinations from qualified pathways
    qualifiedPathways.forEach(pathway => {
        VALID_COMBINATIONS[pathway].forEach(combo => {
            // Check if all subjects in combination meet prerequisites
            const allMeet = combo.every(subject => meetsPrerequisites(subject, oLevelResults));

            // Check if combination includes at least one requested subject
            const hasRequested = combo.some(subject => requestedSubjects.includes(subject));

            if (allMeet && hasRequested) {
                combinations.push({
                    pathway: ALEVEL_PATHWAYS[pathway].name,
                    subjects: combo,
                    score: combo.filter(s => requestedSubjects.includes(s)).length
                });
            }
        });
    });

    // Sort by score (number of requested subjects matched) and return top 3
    return combinations
        .sort((a, b) => b.score - a.score)
        .slice(0, 3);
}

// Handle personal details form submission
function handlePersonalDetails(event) {
    event.preventDefault();

    currentApplication.personalDetails = {
        firstName: document.getElementById('firstName').value,
        lastName: document.getElementById('lastName').value,
        email: document.getElementById('email').value,
        phone: document.getElementById('phone').value,
        dob: document.getElementById('dob').value,
        gender: document.getElementById('gender').value,
        address: document.getElementById('address').value
    };

    // Show O-Level results section
    document.getElementById('personalDetailsSection').style.display = 'none';
    document.getElementById('oLevelSection').style.display = 'block';

    showSuccessMessage('Personal details saved! Please enter your O-Level results.');
}

// Add O-Level result
function addOLevelResult() {
    const subject = document.getElementById('oLevelSubject').value;
    const grade = document.getElementById('oLevelGrade').value;

    if (!subject || !grade) {
        showErrorMessage('Please select both subject and grade');
        return;
    }

    // Check if subject already added
    if (currentApplication.oLevelResults.some(r => r.subject === subject)) {
        showErrorMessage('Subject already added');
        return;
    }

    currentApplication.oLevelResults.push({ subject, grade });
    renderOLevelResults();

    // Reset form
    document.getElementById('oLevelSubject').value = '';
    document.getElementById('oLevelGrade').value = '';
}

// Render O-Level results table
function renderOLevelResults() {
    const tbody = document.getElementById('oLevelResultsBody');
    tbody.innerHTML = '';

    currentApplication.oLevelResults.forEach((result, index) => {
        const row = tbody.insertRow();
        row.innerHTML = `
            <td>${result.subject}</td>
            <td><span class="grade-badge grade-${result.grade}">${result.grade}</span></td>
            <td>
                <button class="btn-delete" onclick="removeOLevelResult(${index})">
                    <i class="fas fa-trash"></i>
                </button>
            </td>
        `;
    });
}

// Remove O-Level result
function removeOLevelResult(index) {
    currentApplication.oLevelResults.splice(index, 1);
    renderOLevelResults();
}

// Proceed to subject selection
function proceedToSubjectSelection() {
    if (currentApplication.oLevelResults.length < 5) {
        showErrorMessage('Please add at least 5 O-Level subjects');
        return;
    }

    document.getElementById('oLevelSection').style.display = 'none';
    document.getElementById('subjectSelectionSection').style.display = 'block';

    renderAvailableSubjects();
}

// Render available A-Level subjects
function renderAvailableSubjects() {
    const container = document.getElementById('availableSubjects');
    container.innerHTML = '';

    const allSubjects = [
        ...ALEVEL_PATHWAYS.sciences.subjects,
        ...ALEVEL_PATHWAYS.commercials.subjects,
        ...ALEVEL_PATHWAYS.arts.subjects
    ];

    // Remove duplicates
    const uniqueSubjects = [...new Set(allSubjects)].sort();

    uniqueSubjects.forEach(subject => {
        const canTake = meetsPrerequisites(subject, currentApplication.oLevelResults);
        const checkbox = document.createElement('div');
        checkbox.className = 'subject-checkbox';
        checkbox.innerHTML = `
            <label>
                <input type="checkbox" value="${subject}" 
                    ${canTake ? '' : 'disabled'} 
                    onchange="updateSelectedSubjects()">
                ${subject}
                ${!canTake ? '<span class="not-qualified">(Prerequisites not met)</span>' : ''}
            </label>
        `;
        container.appendChild(checkbox);
    });
}

// Update selected subjects
function updateSelectedSubjects() {
    const checkboxes = document.querySelectorAll('#availableSubjects input[type="checkbox"]:checked');
    currentApplication.requestedSubjects = Array.from(checkboxes).map(cb => cb.value);

    document.getElementById('selectedCount').textContent = currentApplication.requestedSubjects.length;
}

// Generate combinations
function generateAndShowCombinations() {
    if (currentApplication.requestedSubjects.length < 3) {
        showErrorMessage('Please select at least 3 subjects');
        return;
    }

    if (currentApplication.requestedSubjects.length > 4) {
        showErrorMessage('Please select maximum 4 subjects');
        return;
    }

    const combinations = generateCombinations(
        currentApplication.requestedSubjects,
        currentApplication.oLevelResults
    );

    if (combinations.length === 0) {
        showErrorMessage('No valid combinations found based on your O-Level results. Please adjust your subject selection.');
        return;
    }

    currentApplication.suggestedCombinations = combinations;

    document.getElementById('subjectSelectionSection').style.display = 'none';
    document.getElementById('combinationsSection').style.display = 'block';

    renderCombinations();
}

// Render suggested combinations
function renderCombinations() {
    const container = document.getElementById('combinationsContainer');
    container.innerHTML = '';

    currentApplication.suggestedCombinations.forEach((combo, index) => {
        const card = document.createElement('div');
        card.className = 'combination-card';
        card.innerHTML = `
            <h4>${combo.pathway}</h4>
            <ul>
                ${combo.subjects.map(s => `<li>${s}</li>`).join('')}
            </ul>
            <button class="btn btn-primary" onclick="selectCombination(${index})">
                Select This Combination
            </button>
        `;
        container.appendChild(card);
    });
}

// Select combination
function selectCombination(index) {
    currentApplication.selectedCombination = currentApplication.suggestedCombinations[index];

    document.getElementById('combinationsSection').style.display = 'none';
    document.getElementById('reviewSection').style.display = 'block';

    renderApplicationReview();
}

// Render application review
function renderApplicationReview() {
    const details = currentApplication.personalDetails;
    const combo = currentApplication.selectedCombination;

    document.getElementById('reviewContent').innerHTML = `
        <div class="review-section">
            <h3>Personal Details</h3>
            <p><strong>Name:</strong> ${details.firstName} ${details.lastName}</p>
            <p><strong>Email:</strong> ${details.email}</p>
            <p><strong>Phone:</strong> ${details.phone}</p>
            <p><strong>Date of Birth:</strong> ${details.dob}</p>
            <p><strong>Gender:</strong> ${details.gender}</p>
        </div>
        
        <div class="review-section">
            <h3>O-Level Results (${currentApplication.oLevelResults.length} subjects)</h3>
            <ul>
                ${currentApplication.oLevelResults.map(r =>
        `<li>${r.subject}: <strong>${r.grade}</strong></li>`
    ).join('')}
            </ul>
        </div>
        
        <div class="review-section">
            <h3>Selected A-Level Combination</h3>
            <p><strong>Pathway:</strong> ${combo.pathway}</p>
            <ul>
                ${combo.subjects.map(s => `<li>${s}</li>`).join('')}
            </ul>
        </div>
    `;
}

// Submit application
function submitApplication() {
    const appId = AppUtils.generateNextId('APP');
    const appPassword = Math.random().toString(36).slice(-6).toUpperCase();

    const application = {
        id: appId,
        password: appPassword,
        type: 'A-Level',
        fullName: `${currentApplication.personalDetails.firstName} ${currentApplication.personalDetails.lastName}`,
        email: currentApplication.personalDetails.email,
        status: 'Pending',
        studentId: null,
        studentPassword: null,
        submittedDate: new Date().toISOString(),
        details: {
            pathway: currentApplication.selectedCombination.pathway,
            previousSchool: currentApplication.personalDetails.address, // Using address as placeholder or add another field
            subjects: currentApplication.selectedCombination.subjects.map(s => ({ subject: s, grade: 'N/A' })),
            oLevelResults: currentApplication.oLevelResults,
            personalDetails: currentApplication.personalDetails
        },
        extraDetails: {},
        timeline: [
            {
                status: 'Application Submitted',
                timestamp: new Date().toISOString(),
                details: 'Your application has been successfully received.'
            }
        ]
    };

    // Save to unified storage
    const apps = getTenantData('school_applications', '[]');
    apps.push(application);
    saveTenantData('school_applications', apps);

    document.getElementById('reviewSection').style.display = 'none';

    // Custom Success Handling
    document.getElementById('modalAppId').textContent = appId;
    document.getElementById('modalAppPass').textContent = appPassword;
    document.getElementById('successModal').style.display = 'flex';
}

// Initialize application form
function initApplicationForm() {
    // Load existing applications from unified storage
    const stored = getTenantData('school_applications', 'null');
    if (stored) {
        const allApps = JSON.parse(stored);
        // Filter for A-Level if needed for this specific local array
        applications = allApps.filter(app => app.type === 'A-Level');
    }

    // Reset current application
    currentApplication = {
        personalDetails: {},
        oLevelResults: [],
        requestedSubjects: [],
        suggestedCombinations: [],
        selectedCombination: null
    };
}

// Auto-initialize if on application page
if (document.getElementById('alevelAppForm')) {
    initApplicationForm();

    // Also check for legacy migration on entry to ensure no lost data
    const legacyAlevel = getTenantData('aLevelApplications', 'null');
    if (legacyAlevel) {
        const legacyApps = JSON.parse(legacyAlevel);
        if (Array.isArray(legacyApps) && legacyApps.length > 0) {
            const unifiedApps = getTenantData('school_applications', '[]');
            legacyApps.forEach(app => {
                if (!app.type) app.type = 'A-Level';
                if (!unifiedApps.some(u => u.id === app.id)) {
                    unifiedApps.push(app);
                }
            });
            saveTenantData('school_applications', unifiedApps);
            saveTenantData('aLevelApplications', []);
            // Re-sync local applications array
            applications = unifiedApps.filter(app => app.type === 'A-Level');
        }
    }
}

