document.getElementById('loginForm').addEventListener('submit', function (e) {
    e.preventDefault();

    const appId = document.getElementById('appId').value.trim();
    const password = document.getElementById('password').value.trim();
    const schoolCode = document.getElementById('schoolCode').value.trim().toUpperCase();
    const alertBox = document.getElementById('loginAlert');

    // Validate School Code
    if (window.AcadexCore) {
        const school = AcadexCore.getSchoolByCode(schoolCode);
        if (!school) {
            alertBox.textContent = 'Invalid School Access Code. Please check and try again.';
            alertBox.style.display = 'block';
            return;
        }
        sessionStorage.setItem('activeSchoolCode', schoolCode);
    }

    // Fetch all applications from unified storage
    const allApps = getTenantData('school_applications', '[]');

    // Search for match across all types, strictly for this school
    const foundApp = allApps.find(app =>
        (app.id === appId || (app.applicationId && app.applicationId === appId)) &&
        app.password === password &&
        (app.schoolCode === schoolCode || app.school === schoolCode)
    );

    if (foundApp) {
        // Success
        sessionStorage.setItem('currentApplicant', JSON.stringify(foundApp));

        // Handle redirection based on current location
        if (window.location.href.includes('/applicant/') || window.location.pathname.includes('/applicant/')) {
            window.location.href = 'dashboard.html';
        } else {
            window.location.href = 'applicant/dashboard.html';
        }
    } else {
        // Failure
        alertBox.textContent = 'Invalid Application ID or Password. Please try again.';
        alertBox.style.display = 'block';
    }
});

