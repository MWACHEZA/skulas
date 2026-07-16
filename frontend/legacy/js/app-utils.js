/**
 * Application & Enrollment Utilities
 * Handles ID generation, student enrollment, and timeline synchronization.
 */

const AppUtils = {
    /**
     * Generates the next sequential ID for a given prefix and current year.
     * Format: PREFIX-YY + 00000X (6-digit sequence)
     * @param {string} prefix - 'EMB', 'F1', or 'APP'
     * @returns {string} - The generated ID (e.g., APP-26000001)
     */
    generateNextId: function (prefix) {
        const year = new Date().getFullYear().toString().slice(-2);
        const sequenceKey = `seq_${prefix}_${year}`;
        let sequence = parseInt(getTenantData(sequenceKey, 'null') || '0');
        sequence++;
        saveTenantData(sequenceKey, sequence.toString());

        // Pad sequence to 6 digits for consistency
        const paddedSequence = sequence.toString().padStart(6, '0');
        return `${prefix}-${year}${paddedSequence}`;
    },

    /**
     * Standardized ID prefixes for all user types
     */
    ID_PREFIX: {
        STUDENT: 'EMB',
        TEACHER: 'TCH',
        LIBRARIAN: 'LIB',
        BURSAR: 'BUR',
        ANCILLARY: 'ANC',
        ALUMNI: 'ALU',
        FORM1: 'F1',
        ALEVEL: 'AL',
        TRANSFER: 'TR'
    },

    /**
     * Returns all students from localStorage, or seeds from mock if empty
     * This ensures 'All Users' and management pages see the same data
     */
    getStudents: function () {
        let stored = getTenantData('school_students', 'null');
        if (!stored) {
            // Seed from mockStudents if available (defined in student-data.js)
            const seed = typeof mockStudents !== 'undefined' ? mockStudents : [];
            saveTenantData('school_students', seed);
            return seed;
        }
        return JSON.parse(stored);
    },

    /**
     * Enrolls a student based on an approved application.
     * @param {object} application - The approved application object
     * @returns {object} - The created student object
     */
    enrollStudent: function (application) {
        const studentId = this.generateNextId('EMB');
        const studentPassword = Math.random().toString(36).slice(-8).toUpperCase();

        let studentClass = 'Form 1A';
        if (application.type === 'A-Level') {
            studentClass = 'Lower 6A';
        } else if (application.type === 'Transfer') {
            // Use the preferred class from transfer details if available
            studentClass = application.details.requestedClass || 'Form 2A';
        }

        const newStudent = {
            id: studentId,
            password: studentPassword,
            email: application.email,
            fullName: application.fullName,
            class: studentClass,
            status: 'Active',
            enrollmentDate: new Date().toISOString(),
            details: application.details,
            extraDetails: application.extraDetails || {},
            applicationId: application.id
        };

        // Save to school_students
        const students = getTenantData('school_students', '[]');
        students.push(newStudent);
        saveTenantData('school_students', students);

        // Create initial message for the student
        const welcomeMessage = {
            id: 'MSG-' + Date.now(),
            to: application.email,
            from: 'Admissions Office',
            subject: 'Welcome to Embakwe High School - Enrollment Confirmed',
            body: `Dear ${application.fullName},\n\nYour application has been approved! You have been enrolled as a student.\n\nYour Student Number: ${studentId}\nPassword: ${studentPassword}\n\nPlease use these credentials to log into the Student Portal.\n\nWelcome to the family!`,
            date: new Date().toISOString(),
            read: false,
            type: 'System'
        };

        const messages = getTenantData('school_messages', '[]');
        messages.push(welcomeMessage);
        saveTenantData('school_messages', messages);

        return newStudent;
    },

    /**
     * Updates the timeline of an application.
     * @param {string} appId - The application ID
     * @param {string} status - The new status (e.g., 'In Review', 'Interview Scheduled')
     * @param {object} eventDetails - Information about the event (date, time, venue, etc.)
     */
    updateTimeline: function (appId, status, eventDetails = {}) {
        const apps = getTenantData('school_applications', '[]');
        const appIndex = apps.findIndex(a => a.id === appId);

        if (appIndex !== -1) {
            const app = apps[appIndex];
            app.status = status;

            if (!app.timeline) app.timeline = [];

            // Prevent rapid duplicate entries for the same status (e.g., within 5 seconds)
            const lastEntry = app.timeline[app.timeline.length - 1];
            const now = new Date();
            if (lastEntry && lastEntry.status === status) {
                const lastTime = new Date(lastEntry.timestamp);
                if (now - lastTime < 5000) {
                    console.log(`AppUtils: Skipping duplicate timeline entry for ${status}`);
                    return true;
                }
            }

            app.timeline.push({
                status: status,
                timestamp: now.toISOString(),
                ...eventDetails
            });

            // If it's an interview, duplicate details to a dedicated 'interview' object for the applicant portal
            if (status === 'Interview Scheduled') {
                app.interview = {
                    date: eventDetails.date,
                    time: eventDetails.time,
                    location: eventDetails.venue || eventDetails.location || "Main Administration Building",
                    panel: eventDetails.panel || [
                        { name: 'Admissions Committee', role: 'Review Board' }
                    ]
                };
            }

            saveTenantData('school_applications', apps);
            return true;
        }
        return false;
    }
};

// Ensure global access
window.AppUtils = AppUtils;

