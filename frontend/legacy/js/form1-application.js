// Form 1 Application Logic

let currentStep = 1;
const totalSteps = 3;

function nextStep(step) {
    // Validation
    if (step > currentStep) {
        // Validate inputs in current step
        const currentInputs = document.querySelectorAll(`#step${currentStep} input, #step${currentStep} select`);
        let valid = true;
        currentInputs.forEach(input => {
            if (!input.checkValidity()) {
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
        if (s < step) el.classList.add('completed');
        if (s === step) el.classList.add('active');
        if (s > step) { el.classList.remove('active'); el.classList.remove('completed'); }
    });

    currentStep = step;

    if (step === 3) populateReview();
}

function prevStep(step) {
    nextStep(step);
}

function populateReview() {
    const form = document.getElementById('form1AppForm');
    const formData = new FormData(form);

    let html = `
        <p><strong>Name:</strong> ${formData.get('fullName')}</p>
        <p><strong>Date of Birth:</strong> ${formData.get('dob')}</p>
        <p><strong>Primary School:</strong> ${formData.get('primarySchool')}</p>
        <hr>
        <h4>Grade 7 Results (Units)</h4>
        <p><strong>Maths:</strong> ${formData.get('maths')}</p>
        <p><strong>English:</strong> ${formData.get('english')}</p>
        <p><strong>General Paper:</strong> ${formData.get('general')}</p>
        <p><strong>Language:</strong> ${formData.get('language')}</p>
    `;

    // Calculate total units
    const totalUnits = parseInt(formData.get('maths')) + parseInt(formData.get('english')) +
        parseInt(formData.get('general')) + parseInt(formData.get('language'));

    html += `<p style="margin-top:10px; font-weight:bold; color:#0056b3;">Total Units: ${totalUnits}</p>`;

    document.getElementById('reviewContent').innerHTML = html;
}

// Handle Submission
document.getElementById('form1AppForm').addEventListener('submit', function (e) {
    e.preventDefault();

    // Generate Application ID & Password
    const appId = AppUtils.generateNextId('F1');
    const appPassword = Math.random().toString(36).slice(-6).toUpperCase(); // e.g., X7Z9A2
    const formData = new FormData(this);

    const email = formData.get('email') || (formData.get('fullName').toLowerCase().replace(/\s+/g, '.') + '@example.com');

    const application = {
        id: appId,
        password: appPassword,
        type: 'Form 1',
        fullName: formData.get('fullName'),
        email: email,
        status: 'Pending',
        studentId: null,
        studentPassword: null,
        submittedDate: new Date().toISOString(),
        details: {
            dob: formData.get('dob'),
            primarySchool: formData.get('primarySchool'),
            results: {
                maths: formData.get('maths'),
                english: formData.get('english'),
                general: formData.get('general'),
                language: formData.get('language')
            }
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

    // Save to localStorage
    const apps = getTenantData('school_applications', '[]');
    apps.push(application);
    saveTenantData('school_applications', apps);

    // Show Success Logic
    document.getElementById('modalAppId').textContent = appId;
    document.getElementById('modalAppPass').textContent = appPassword;

    // Show Modal
    const modal = document.getElementById('successModal');
    modal.style.display = 'flex';
});

