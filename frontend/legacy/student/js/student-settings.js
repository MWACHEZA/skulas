document.addEventListener('DOMContentLoaded', function () {

    // --- Account Settings: Password Update ---
    const updatePasswordBtn = document.querySelector('.btn-primary');
    const currentPassInput = document.getElementById('currentPassword');
    const newPassInput = document.getElementById('newPassword');
    const confirmPassInput = document.getElementById('confirmPassword');

    if (updatePasswordBtn) {
        updatePasswordBtn.addEventListener('click', function () {
            const current = currentPassInput.value;
            const newPass = newPassInput.value;
            const confirm = confirmPassInput.value;

            if (!current || !newPass || !confirm) {
                showToast('Please fill in all password fields.', 'error');
                return;
            }

            if (newPass.length < 6) {
                showToast('New password must be at least 6 characters long.', 'error');
                return;
            }

            if (newPass !== confirm) {
                showToast('New passwords do not match.', 'error');
                return;
            }

            // Simulate API call
            showToast('Password updated successfully!', 'success');
            currentPassInput.value = '';
            newPassInput.value = '';
            confirmPassInput.value = '';
        });
    }


    // --- Notification Preferences ---
    // Select all checkboxes inside .settings-card that has "Notification Preferences"
    // We can just grab all checkboxes on page for now or be more specific.
    const checkboxes = document.querySelectorAll('input[type="checkbox"]');

    // Load saved preferences if any (Mock)
    // localStorage keys: 'pref_assignment', 'pref_grade', etc.
    // For simplicity, we just attach listeners that save to mock storage.

    checkboxes.forEach((checkbox, index) => {
        // Save state on change
        checkbox.addEventListener('change', function () {
            const settingName = this.closest('.setting-item').querySelector('h4').textContent;
            const status = this.checked ? 'Enabled' : 'Disabled';
            console.log(`Setting "${settingName}" changed to ${status}`);

            // Optional: visual feedback
            // alert(`${settingName} ${status}`); // Too annoying for toggles
        });
    });


    // --- Display Preferences ---
    const saveDisplayBtn = document.querySelectorAll('.btn-primary')[1]; // Second primary button
    const languageSelect = document.getElementById('language');
    const timezoneSelect = document.getElementById('timezone');

    if (saveDisplayBtn) {
        saveDisplayBtn.addEventListener('click', function () {
            const lang = languageSelect.options[languageSelect.selectedIndex].text;
            const tz = timezoneSelect.options[timezoneSelect.selectedIndex].text;

            showToast(`Preferences Saved:\nLanguage: ${lang}\nTimezone: ${tz}`, 'success');
        });
    }

});

