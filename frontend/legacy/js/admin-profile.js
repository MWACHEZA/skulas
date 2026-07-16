/* Admin Profile Functionality */

document.addEventListener('DOMContentLoaded', function () {
    // Profile Picture Elements
    const picInput = document.getElementById('profilePicInput');
    const uploadBtn = document.getElementById('profilePicUploadBtn');
    const avatarDisplay = document.getElementById('profileAvatarDisplay');

    // Personal Info Elements
    const firstNameInput = document.getElementById('profileFirstName');
    const lastNameInput = document.getElementById('profileLastName');
    const emailInput = document.getElementById('profileEmail');
    const phoneInput = document.getElementById('profilePhone');
    const saveBtn = document.getElementById('saveProfileBtn');

    // Display Elements
    const displayName = document.getElementById('profileDisplayName');
    const displayEmail = document.getElementById('profileDisplayEmail');

    // Password Elements
    const changePassBtn = document.querySelector('.profile-card:last-child .btn-primary');

    // --- Load Saved Data ---
    loadProfileData();

    // --- Profile Picture Logic ---
    if (uploadBtn && picInput) {
        uploadBtn.addEventListener('click', () => {
            picInput.click();
        });

        picInput.addEventListener('change', function (e) {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = function (e) {
                    const imgData = e.target.result;
                    // Update Avatar Display (Background Image)
                    updateAvatarDisplay(imgData);
                    // Save to LocalStorage
                    saveTenantData('adminProfilePic', imgData);
                    if (typeof showSuccessMessage === 'function') {
                        showSuccessMessage('Profile picture updated successfully!');
                    }
                };
                reader.readAsDataURL(file);
            }
        });
    }

    // --- Save Personal Info Logic ---
    if (saveBtn) {
        saveBtn.addEventListener('click', function () {
            const profileData = {
                firstName: firstNameInput.value,
                lastName: lastNameInput.value,
                email: emailInput.value,
                phone: phoneInput.value
            };

            // Save to LocalStorage
            saveTenantData('adminProfileData', profileData);

            // Update Header Display
            updateHeaderDisplay(profileData.firstName, profileData.lastName, profileData.email);

            if (typeof showSuccessMessage === 'function') {
                showSuccessMessage('Profile information saved successfully!');
            }
        });
    }

    // --- Change Password Logic (Mock) ---
    if (changePassBtn) {
        changePassBtn.addEventListener('click', function (e) {
            // Find inputs relative to the button
            const inputs = e.target.parentElement.querySelectorAll('input');
            const currentPass = inputs[0].value;
            const newPass = inputs[1].value;
            const confirmPass = inputs[2].value;

            if (!currentPass || !newPass || !confirmPass) {
                if (typeof showErrorMessage === 'function') showErrorMessage('Please fill in all password fields.');
                return;
            }

            if (newPass !== confirmPass) {
                if (typeof showErrorMessage === 'function') showErrorMessage('New passwords do not match.');
                return;
            }

            // Success Mock
            inputs.forEach(input => input.value = ''); // Clear
            if (typeof showSuccessMessage === 'function') {
                showSuccessMessage('Password updated successfully!');
            }
        });
    }

    // Helper: Load Data
    function loadProfileData() {
        // Load Picture
        const savedPic = getTenantData('adminProfilePic', 'null');
        if (savedPic) {
            updateAvatarDisplay(savedPic);
        }

        // Load Personal Info
        const savedData = getTenantData('adminProfileData', 'null');
        if (savedData) {
            const data = JSON.parse(savedData);
            if (firstNameInput) firstNameInput.value = data.firstName || '';
            if (lastNameInput) lastNameInput.value = data.lastName || '';
            if (emailInput) emailInput.value = data.email || '';
            if (phoneInput) phoneInput.value = data.phone || '';

            updateHeaderDisplay(data.firstName, data.lastName, data.email);
        }
    }

    // Helper: Update Avatar UI
    function updateAvatarDisplay(src) {
        if (!avatarDisplay) return;
        // If it's a data URL, we use background image and clear text
        avatarDisplay.style.backgroundImage = `url(${src})`;
        avatarDisplay.style.backgroundSize = 'cover';
        avatarDisplay.style.backgroundPosition = 'center';
        avatarDisplay.textContent = ''; // Clear initials
    }

    // Helper: Update Header UI
    function updateHeaderDisplay(first, last, email) {
        if (displayName) displayName.textContent = `${first} ${last}`.trim() || 'Administrator';
        if (displayEmail) displayEmail.textContent = email || 'admin@embakwehigh.edu.zw';
    }
});

