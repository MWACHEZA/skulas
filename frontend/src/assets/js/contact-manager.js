/**
 * Contact Manager - Standardized logic for School Contact Information
 */

const ContactManager = {
    getStorageKey: function() {
        if (typeof getTenantKey === 'function') {
            return getTenantKey('school_contacts');
        }
        const school = (window.AcadexCore && AcadexCore.getActiveSchool()) || null;
        if (school) return `acadex_contacts_${school.id}`;
        return 'school_contacts'; // fallback for backward compatibility
    },

    /**
     * Default contact list if none exists
     */
    DEFAULTS: [
        {
            id: 'emergency',
            title: '24/7 Security & Maintenance Emergency',
            details: [
                { type: 'phone', label: 'Call', value: '+263 771 123 456', link: 'tel:+263771123456', ext: '999' }
            ],
            type: 'emergency',
            icon: 'fas fa-exclamation-triangle'
        },
        {
            id: 'admin',
            title: 'School Administration',
            icon: 'fas fa-building',
            details: [
                { type: 'phone', value: '+263 9 123 456', link: 'tel:+2639123456' },
                { type: 'email', value: 'admin@embakwe.ac.zw', link: 'mailto:admin@embakwe.ac.zw' },
                { type: 'location', value: 'Main Admin Block, Ground Floor' }
            ]
        },
        {
            id: 'hr',
            title: 'Human Resources',
            icon: 'fas fa-user-tie',
            details: [
                { type: 'text', icon: 'fas fa-phone', value: 'Ext: 102' },
                { type: 'email', value: 'hr@embakwe.ac.zw', link: 'mailto:hr@embakwe.ac.zw' },
                { type: 'text', icon: 'fas fa-clock', value: 'Mon-Fri: 08:00 AM - 04:30 PM' }
            ]
        },
        {
            id: 'finance',
            title: 'Finance & Bursar',
            icon: 'fas fa-coins',
            details: [
                { type: 'text', icon: 'fas fa-phone', value: 'Ext: 105' },
                { type: 'email', value: 'accounts@embakwe.ac.zw', link: 'mailto:accounts@embakwe.ac.zw' },
                { type: 'location', value: 'Bursary Office, Block B' }
            ]
        },
        {
            id: 'it',
            title: 'ICT Helpdesk',
            icon: 'fas fa-laptop',
            details: [
                { type: 'text', icon: 'fas fa-phone', value: 'Ext: 303' },
                { type: 'email', value: 'itsupport@embakwe.ac.zw', link: 'mailto:itsupport@embakwe.ac.zw' },
                { type: 'text', icon: 'fas fa-headset', value: 'Online Support: 24/7' }
            ]
        },
        {
            id: 'sdc',
            title: 'SDC Office',
            icon: 'fas fa-users-cog',
            details: [
                { type: 'phone', value: '+263 772 111 222', link: 'tel:+263772111222' },
                { type: 'email', value: 'sdc@embakwe.ac.zw', link: 'mailto:sdc@embakwe.ac.zw' },
                { type: 'location', value: 'SDC Hub, East Wing' }
            ]
        },
        {
            id: 'clinic',
            title: 'Medical Clinic',
            icon: 'fas fa-heartbeat',
            details: [
                { type: 'phone', value: '+263 773 999 888', link: 'tel:+263773999888' },
                { type: 'location', value: 'Campus Clinic, West Gate' },
                { type: 'text', icon: 'fas fa-clock', value: 'Open 24 Hours' }
            ]
        }
    ],

    /**
     * Gets all contacts from storage or defaults
     */
    getContacts: function () {
        const key = this.getStorageKey();
        const stored = getTenantData(key, 'null');
        if (!stored) {
            saveTenantData(key, this.DEFAULTS);
            return this.DEFAULTS;
        }
        return JSON.parse(stored);
    },

    /**
     * Saves contacts to localStorage
     */
    saveContacts: function (contacts) {
        saveTenantData(this.getStorageKey(), contacts);
    },

    /**
     * Renders contacts to the UI
     */
    render: function () {
        const container = document.querySelector('.contact-grid');
        const emergencyArea = document.querySelector('.emergency-banner-area'); // New area for dynamic emergency
        if (!container) return;

        const contacts = this.getContacts();
        const emergency = contacts.find(c => c.type === 'emergency');
        const standardContacts = contacts.filter(c => c.type !== 'emergency');

        // Render Emergency Banner if area exists
        if (emergencyArea && emergency) {
            const detail = emergency.details[0];
            emergencyArea.innerHTML = `
                <div class="emergency-banner">
                    <i class="${emergency.icon}"></i>
                    <div>
                        <h3 style="margin: 0;">${emergency.title}</h3>
                        <p style="margin: 5px 0 0; font-weight: 600;">Call: ${detail.value} ${detail.ext ? '(Extension: ' + detail.ext + ')' : ''}</p>
                    </div>
                </div>
            `;
        } else if (emergency) {
            // Fallback to legacy banner in HTML if area not provided
            const legacyBanner = document.querySelector('.emergency-banner');
            if (legacyBanner) {
                const detail = emergency.details[0];
                legacyBanner.querySelector('h3').textContent = emergency.title;
                legacyBanner.querySelector('p').innerHTML = `Call: ${detail.value} ${detail.ext ? '(Extension: ' + detail.ext + ')' : ''}`;
            }
        }

        // Render Standard Contact Boxes
        container.innerHTML = standardContacts.map(c => `
            <div class="contact-box">
                <span class="contact-title"><i class="${c.icon}"></i> ${c.title}</span>
                <div class="contact-details">
                    ${c.details.map(d => {
            let icon = d.icon;
            if (!icon) {
                if (d.type === 'phone') icon = 'fas fa-phone';
                else if (d.type === 'email') icon = 'fas fa-envelope';
                else if (d.type === 'location') icon = 'fas fa-map-marker-alt';
            }

            if (d.link) {
                return `<a href="${d.link}" class="contact-item"><i class="${icon}"></i> ${d.value}</a>`;
            } else {
                return `<div class="contact-item"><i class="${icon}"></i> ${d.value}</div>`;
            }
        }).join('')}
                </div>
            </div>
        `).join('');
    }
};

document.addEventListener('DOMContentLoaded', () => {
    if (document.querySelector('.contact-grid')) {
        ContactManager.render();
    }
});

