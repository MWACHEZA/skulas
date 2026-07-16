/* Admin Settings Functionality */

document.addEventListener('DOMContentLoaded', function () {
    // General Settings
    const schoolNameInput = document.getElementById('schoolName');
    const schoolEmailInput = document.getElementById('schoolEmail');
    const schoolPhoneInput = document.getElementById('schoolPhone');
    const academicYearSelect = document.getElementById('academicYear');
    const saveGeneralBtn = document.getElementById('saveGeneralSettingsBtn');

    // Toggles
    const toggleMap = {
        'toggleEmailDetails': 'setting_email_notifs',
        'toggleSMS': 'setting_sms_notifs',
        'toggleBackup': 'setting_auto_backup',
        'toggleMaintenance': 'setting_maintenance_mode',
        'toggle2FA': 'setting_2fa',
        'toggleTimeout': 'setting_session_timeout'
    };

    // Reset Button
    const resetBtn = document.getElementById('resetSystemBtn');

    // --- Load Saved Settings ---
    loadSettings();

    // --- Save General Settings ---
    if (saveGeneralBtn) {
        saveGeneralBtn.addEventListener('click', function () {
            const settings = {
                schoolName: schoolNameInput.value,
                schoolEmail: schoolEmailInput.value,
                schoolPhone: schoolPhoneInput.value,
                academicYear: academicYearSelect.value
            };
            if (typeof saveTenantData === 'function') {
                saveTenantData('adminGeneralSettings', settings);
            } else {
                saveTenantData('adminGeneralSettings', settings);
            }
            if (typeof showSuccessMessage === 'function') {
                showSuccessMessage('General settings saved successfully!');
            }
        });
    }

    // --- Handle Toggles ---
    for (const [id, storageKey] of Object.entries(toggleMap)) {
        const toggle = document.getElementById(id);
        if (toggle) {
            toggle.addEventListener('change', function () {
                if (typeof saveTenantData === 'function') {
                    saveTenantData(storageKey, this.checked);
                } else {
                    saveTenantData(storageKey, this.checked);
                }

                // Special Feedback for Maintenance Mode
                if (id === 'toggleMaintenance' && this.checked && typeof showSuccessMessage === 'function') {
                    showSuccessMessage('System Entering Maintenance Mode...');
                } else if (typeof showSuccessMessage === 'function') {
                    showSuccessMessage('Setting updated.');
                }
            });
        }
    }

    // --- Reset System ---
    if (resetBtn) {
        resetBtn.addEventListener('click', function () {
            // Using a confirmation (could use a modal in future, using generic confirm for now or just proceed)
            // Ideally we should use the custom modal pattern if consistent, but for now let's just do it
            if (confirm('Are you sure you want to reset all settings to default? This cannot be undone.')) {
                if (typeof saveTenantData === 'function') {
                    saveTenantData('adminGeneralSettings', null);
                    Object.values(toggleMap).forEach(key => saveTenantData(key, null));
                } else {
                    saveTenantData('adminGeneralSettings', []);
                    Object.values(toggleMap).forEach(key => saveTenantData(key, []));
                }
                location.reload();
            }
        });
    }

    // Isolate function
    function loadSettings() {
        // Load General
        const savedGeneral = (typeof getTenantData === 'function')
            ? getTenantData('adminGeneralSettings', null)
            : JSON.parse(getTenantData('adminGeneralSettings', 'null') || 'null');
        if (savedGeneral) {
            const data = JSON.parse(savedGeneral);
            if (schoolNameInput) schoolNameInput.value = data.schoolName || '';
            if (schoolEmailInput) schoolEmailInput.value = data.schoolEmail || '';
            if (schoolPhoneInput) schoolPhoneInput.value = data.schoolPhone || '';
            if (academicYearSelect) academicYearSelect.value = data.academicYear || '2024-2025';
        }

        // Load Toggles
        for (const [id, storageKey] of Object.entries(toggleMap)) {
            const toggle = document.getElementById(id);
            if (toggle) {
                const savedState = (typeof getTenantData === 'function')
                    ? getTenantData(storageKey, null)
                    : getTenantData(storageKey, 'null');
                if (savedState !== null) {
                    toggle.checked = (savedState === 'true');
                }
            }
        }
    }
});

