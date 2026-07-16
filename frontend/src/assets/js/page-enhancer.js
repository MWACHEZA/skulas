/* Universal Admin Portal Page Enhancer */
/* This script automatically detects which page is loaded and adds appropriate functionality */

(function () {
    'use strict';

    // Detect current page
    const currentPage = window.location.pathname.split('/').pop().replace('.html', '');

    console.log('Admin Portal Enhancer loaded for:', currentPage);

    // Common initialization for all pages
    function initCommonFeatures() {
        // Mobile sidebar toggle
        const menuToggle = document.getElementById('menuToggle');
        const sidebar = document.getElementById('sidebar');

        if (menuToggle && sidebar) {
            menuToggle.addEventListener('click', function () {
                sidebar.classList.toggle('active');
            });
        }

        // Add hamburger menu button if not exists (for mobile)
        if (!menuToggle && sidebar) {
            const header = document.querySelector('.top-header');
            if (header) {
                const hamburger = document.createElement('button');
                hamburger.id = 'menuToggle';
                hamburger.className = 'hamburger-menu';
                hamburger.innerHTML = '<i class="fas fa-bars"></i>';
                hamburger.style.cssText = 'display: none; background: none; border: none; font-size: 1.5rem; cursor: pointer; color: #333;';
                header.insertBefore(hamburger, header.firstChild);

                // Show on mobile
                const style = document.createElement('style');
                style.textContent = `
                    @media (max-width: 768px) {
                        .hamburger-menu { display: block !important; }
                    }
                `;
                document.head.appendChild(style);

                hamburger.addEventListener('click', function () {
                    sidebar.classList.toggle('active');
                });
            }
        }
    }

    // Page-specific enhancements
    const pageEnhancers = {
        'teachers-management': function () {
            loadScript('../js/teachers-management.js');
            addTeacherModals();
        },

        'alumni-management': function () {
            loadScript('../js/alumni-management.js');
            addAlumniModals();
        },

        'fees': function () {
            loadScript('../js/fees-payments.js');
            addFeeModals();
            enhanceFeeButtons();
        },

        'payments': function () {
            loadScript('../js/fees-payments.js');
            enhancePaymentFilters();
        },

        'classes-management': function () {
            loadScript('../js/classes-management.js');
            addClassModals();
        },

        'subjects': function () {
            loadScript('../js/subjects-management.js');
            addSubjectModals();
        },

        'timetable-management': function () {
            loadScript('../js/timetable-management.js');
            addTimetableModals();
        },

        'announcements-management': function () {
            enhanceAnnouncementActions();
        },

        'messages': function () {
            enhanceMessageActions();
        },

        'notifications': function () {
            enhanceNotificationActions();
        }
    };

    // Load external script
    function loadScript(src) {
        const script = document.createElement('script');
        script.src = src;
        script.async = false;
        document.head.appendChild(script);
    }

    // Add teacher modals
    function addTeacherModals() {
        const modalsHTML = `
            <!-- Add Teacher Modal -->
            <div id="addTeacherModal" class="modal">
                <div class="modal-content">
                    <div class="modal-header">
                        <h3>Add New Teacher</h3>
                        <button class="close-modal" onclick="closeModal('addTeacherModal')">&times;</button>
                    </div>
                    <form id="addTeacherForm" onsubmit="handleAddTeacher(event)">
                        <div class="form-group">
                            <label for="teacherId">Employee ID *</label>
                            <input type="text" id="teacherId" required>
                        </div>
                        <div class="form-group">
                            <label for="teacherName">Full Name *</label>
                            <input type="text" id="teacherName" required>
                        </div>
                        <div class="form-group">
                            <label for="teacherSubject">Subject *</label>
                            <input type="text" id="teacherSubject" required>
                        </div>
                        <div class="form-group">
                            <label for="teacherEmail">Email *</label>
                            <input type="email" id="teacherEmail" required>
                        </div>
                        <div class="form-group">
                            <label for="teacherPhone">Phone Number *</label>
                            <input type="tel" id="teacherPhone" required>
                        </div>
                        <div class="form-group">
                            <label for="teacherClasses">Number of Classes *</label>
                            <input type="number" id="teacherClasses" min="1" required>
                        </div>
                        <div class="form-group">
                            <label for="teacherStatus">Status *</label>
                            <select id="teacherStatus" required>
                                <option value="Active">Active</option>
                                <option value="Inactive">Inactive</option>
                            </select>
                        </div>
                        <div class="form-actions">
                            <button type="button" class="btn-cancel" onclick="closeModal('addTeacherModal')">Cancel</button>
                            <button type="submit" class="btn-submit">Add Teacher</button>
                        </div>
                    </form>
                </div>
            </div>

            <!-- Edit Teacher Modal -->
            <div id="editTeacherModal" class="modal">
                <div class="modal-content">
                    <div class="modal-header">
                        <h3>Edit Teacher</h3>
                        <button class="close-modal" onclick="closeModal('editTeacherModal')">&times;</button>
                    </div>
                    <form id="editTeacherForm" onsubmit="handleEditTeacher(event)">
                        <input type="hidden" id="editTeacherIndex">
                        <div class="form-group">
                            <label for="editTeacherId">Employee ID *</label>
                            <input type="text" id="editTeacherId" required readonly>
                        </div>
                        <div class="form-group">
                            <label for="editTeacherName">Full Name *</label>
                            <input type="text" id="editTeacherName" required>
                        </div>
                        <div class="form-group">
                            <label for="editTeacherSubject">Subject *</label>
                            <input type="text" id="editTeacherSubject" required>
                        </div>
                        <div class="form-group">
                            <label for="editTeacherEmail">Email *</label>
                            <input type="email" id="editTeacherEmail" required>
                        </div>
                        <div class="form-group">
                            <label for="editTeacherPhone">Phone Number *</label>
                            <input type="tel" id="editTeacherPhone" required>
                        </div>
                        <div class="form-group">
                            <label for="editTeacherClasses">Number of Classes *</label>
                            <input type="number" id="editTeacherClasses" min="1" required>
                        </div>
                        <div class="form-group">
                            <label for="editTeacherStatus">Status *</label>
                            <select id="editTeacherStatus" required>
                                <option value="Active">Active</option>
                                <option value="Inactive">Inactive</option>
                            </select>
                        </div>
                        <div class="form-actions">
                            <button type="button" class="btn-cancel" onclick="closeModal('editTeacherModal')">Cancel</button>
                            <button type="submit" class="btn-submit">Update Teacher</button>
                        </div>
                    </form>
                </div>
            </div>

            <!-- View Teacher Modal -->
            <div id="viewTeacherModal" class="modal">
                <div class="modal-content">
                    <div class="modal-header">
                        <h3>Teacher Details</h3>
                        <button class="close-modal" onclick="closeModal('viewTeacherModal')">&times;</button>
                    </div>
                    <div id="teacherDetails" style="padding: 20px 0;"></div>
                    <div class="form-actions">
                        <button type="button" class="btn-cancel" onclick="closeModal('viewTeacherModal')">Close</button>
                    </div>
                </div>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', modalsHTML);

        // Add onclick to Add Teacher button
        const addBtn = document.querySelector('.btn-primary');
        if (addBtn && addBtn.textContent.includes('Add New Teacher')) {
            addBtn.setAttribute('onclick', "openModal('addTeacherModal')");
        }

        // Add IDs to search and filters
        const searchInput = document.querySelector('input[placeholder*="Search"]');
        if (searchInput) searchInput.id = 'searchInput';

        const selects = document.querySelectorAll('select');
        if (selects[0]) selects[0].id = 'deptFilter';
        if (selects[1]) selects[1].id = 'statusFilter';

        // Add ID to table body
        const tbody = document.querySelector('tbody');
        if (tbody) tbody.id = 'teachersTableBody';
    }

    // Add alumni modals
    function addAlumniModals() {
        const modalsHTML = `
            <!-- Add Alumni Modal -->
            <div id="addAlumniModal" class="modal">
                <div class="modal-content">
                    <div class="modal-header">
                        <h3>Add Alumni</h3>
                        <button class="close-modal" onclick="closeModal('addAlumniModal')">&times;</button>
                    </div>
                    <form id="addAlumniForm" onsubmit="handleAddAlumni(event)">
                        <div class="form-group">
                            <label for="alumniId">Alumni ID *</label>
                            <input type="text" id="alumniId" required>
                        </div>
                        <div class="form-group">
                            <label for="alumniName">Full Name *</label>
                            <input type="text" id="alumniName" required>
                        </div>
                        <div class="form-group">
                            <label for="alumniYear">Graduation Year *</label>
                            <select id="alumniYear" required>
                                <option value="">Select Year</option>
                                <option value="2024">2024</option>
                                <option value="2023">2023</option>
                                <option value="2022">2022</option>
                                <option value="2021">2021</option>
                                <option value="2020">2020</option>
                                <option value="2019">2019</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label for="alumniEmail">Email *</label>
                            <input type="email" id="alumniEmail" required>
                        </div>
                        <div class="form-group">
                            <label for="alumniPhone">Phone Number *</label>
                            <input type="tel" id="alumniPhone" required>
                        </div>
                        <div class="form-group">
                            <label for="alumniProfession">Profession *</label>
                            <input type="text" id="alumniProfession" required>
                        </div>
                        <div class="form-actions">
                            <button type="button" class="btn-cancel" onclick="closeModal('addAlumniModal')">Cancel</button>
                            <button type="submit" class="btn-submit">Add Alumni</button>
                        </div>
                    </form>
                </div>
            </div>

            <!-- Edit Alumni Modal -->
            <div id="editAlumniModal" class="modal">
                <div class="modal-content">
                    <div class="modal-header">
                        <h3>Edit Alumni</h3>
                        <button class="close-modal" onclick="closeModal('editAlumniModal')">&times;</button>
                    </div>
                    <form id="editAlumniForm" onsubmit="handleEditAlumni(event)">
                        <input type="hidden" id="editAlumniIndex">
                        <div class="form-group">
                            <label for="editAlumniId">Alumni ID *</label>
                            <input type="text" id="editAlumniId" required readonly>
                        </div>
                        <div class="form-group">
                            <label for="editAlumniName">Full Name *</label>
                            <input type="text" id="editAlumniName" required>
                        </div>
                        <div class="form-group">
                            <label for="editAlumniYear">Graduation Year *</label>
                            <select id="editAlumniYear" required>
                                <option value="2024">2024</option>
                                <option value="2023">2023</option>
                                <option value="2022">2022</option>
                                <option value="2021">2021</option>
                                <option value="2020">2020</option>
                                <option value="2019">2019</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label for="editAlumniEmail">Email *</label>
                            <input type="email" id="editAlumniEmail" required>
                        </div>
                        <div class="form-group">
                            <label for="editAlumniPhone">Phone Number *</label>
                            <input type="tel" id="editAlumniPhone" required>
                        </div>
                        <div class="form-group">
                            <label for="editAlumniProfession">Profession *</label>
                            <input type="text" id="editAlumniProfession" required>
                        </div>
                        <div class="form-actions">
                            <button type="button" class="btn-cancel" onclick="closeModal('editAlumniModal')">Cancel</button>
                            <button type="submit" class="btn-submit">Update Alumni</button>
                        </div>
                    </form>
                </div>
            </div>

            <!-- View Alumni Modal -->
            <div id="viewAlumniModal" class="modal">
                <div class="modal-content">
                    <div class="modal-header">
                        <h3>Alumni Profile</h3>
                        <button class="close-modal" onclick="closeModal('viewAlumniModal')">&times;</button>
                    </div>
                    <div id="alumniDetails" style="padding: 20px 0;"></div>
                    <div class="form-actions">
                        <button type="button" class="btn-cancel" onclick="closeModal('viewAlumniModal')">Close</button>
                    </div>
                </div>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', modalsHTML);

        // Add onclick to Add Alumni button
        const addBtn = document.querySelector('.btn-primary');
        if (addBtn && addBtn.textContent.includes('Add Alumni')) {
            addBtn.setAttribute('onclick', "openModal('addAlumniModal')");
        }

        // Add IDs
        const searchInput = document.querySelector('input[placeholder*="Search"]');
        if (searchInput) searchInput.id = 'searchInput';

        const yearFilter = document.querySelector('select');
        if (yearFilter) yearFilter.id = 'yearFilter';

        const tbody = document.querySelector('tbody');
        if (tbody) tbody.id = 'alumniTableBody';
    }

    // Add fee modals
    function addFeeModals() {
        const modalsHTML = `
            <!-- Edit Fee Structure Modal -->
            <div id="editFeeModal" class="modal">
                <div class="modal-content">
                    <div class="modal-header">
                        <h3>Edit Fee Structure</h3>
                        <button class="close-modal" onclick="closeModal('editFeeModal')">&times;</button>
                    </div>
                    <form id="editFeeForm" onsubmit="handleEditFee(event)">
                        <input type="hidden" id="editFeeId">
                        <div class="form-group">
                            <label for="editFeeName">Fee Category *</label>
                            <input type="text" id="editFeeName" required readonly>
                        </div>
                        <div class="form-group">
                            <label for="editFeeTotal">Total Amount ($) *</label>
                            <input type="number" id="editFeeTotal" required>
                        </div>
                        <div id="feeBreakdown"></div>
                        <div class="form-actions">
                            <button type="button" class="btn-cancel" onclick="closeModal('editFeeModal')">Cancel</button>
                            <button type="submit" class="btn-submit">Update Fee Structure</button>
                        </div>
                    </form>
                </div>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', modalsHTML);
    }

    // Enhance fee buttons
    function enhanceFeeButtons() {
        // Add onclick to Edit Fee Structure buttons
        const editButtons = document.querySelectorAll('.btn');
        editButtons.forEach((btn, index) => {
            if (btn.textContent.includes('Edit Fee Structure')) {
                btn.setAttribute('onclick', `editFeeStructure(${index + 1})`);
            }
            if (btn.textContent.includes('View All Payments')) {
                btn.setAttribute('onclick', 'viewAllPayments()');
            }
        });
    }

    // Enhance payment filters
    function enhancePaymentFilters() {
        const searchInput = document.querySelector('input[placeholder*="Search"]');
        if (searchInput) searchInput.id = 'searchInput';

        const selects = document.querySelectorAll('select');
        if (selects[0]) selects[0].id = 'statusFilter';
        if (selects[1]) selects[1].id = 'methodFilter';

        const tbody = document.querySelector('tbody');
        if (tbody) tbody.id = 'paymentsTableBody';
    }

    // Add class modals
    function addClassModals() {
        const modalsHTML = `
            <!-- Add Class Modal -->
            <div id="addClassModal" class="modal">
                <div class="modal-content">
                    <div class="modal-header">
                        <h3>Create New Class</h3>
                        <button class="close-modal" onclick="closeModal('addClassModal')">&times;</button>
                    </div>
                    <form id="addClassForm" onsubmit="handleAddClass(event)">
                        <div class="form-group">
                            <label for="className">Class Name *</label>
                            <input type="text" id="className" required>
                        </div>
                        <div class="form-group">
                            <label for="classStudents">Number of Students *</label>
                            <input type="number" id="classStudents" min="1" required>
                        </div>
                        <div class="form-group">
                            <label for="classTeacher">Class Teacher *</label>
                            <input type="text" id="classTeacher" required>
                        </div>
                        <div class="form-group">
                            <label for="classRoom">Room *</label>
                            <input type="text" id="classRoom" required>
                        </div>
                        <div class="form-actions">
                            <button type="button" class="btn-cancel" onclick="closeModal('addClassModal')">Cancel</button>
                            <button type="submit" class="btn-submit">Create Class</button>
                        </div>
                    </form>
                </div>
            </div>

            <!-- Edit Class Modal -->
            <div id="editClassModal" class="modal">
                <div class="modal-content">
                    <div class="modal-header">
                        <h3>Edit Class</h3>
                        <button class="close-modal" onclick="closeModal('editClassModal')">&times;</button>
                    </div>
                    <form id="editClassForm" onsubmit="handleEditClass(event)">
                        <input type="hidden" id="editClassIndex">
                        <div class="form-group">
                            <label for="editClassName">Class Name *</label>
                            <input type="text" id="editClassName" required>
                        </div>
                        <div class="form-group">
                            <label for="editClassStudents">Number of Students *</label>
                            <input type="number" id="editClassStudents" min="1" required>
                        </div>
                        <div class="form-group">
                            <label for="editClassTeacher">Class Teacher *</label>
                            <input type="text" id="editClassTeacher" required>
                        </div>
                        <div class="form-group">
                            <label for="editClassRoom">Room *</label>
                            <input type="text" id="editClassRoom" required>
                        </div>
                        <div class="form-actions">
                            <button type="button" class="btn-cancel" onclick="closeModal('editClassModal')">Cancel</button>
                            <button type="submit" class="btn-submit">Update Class</button>
                        </div>
                    </form>
                </div>
            </div>

            <!-- View Class Modal -->
            <div id="viewClassModal" class="modal">
                <div class="modal-content">
                    <div class="modal-header">
                        <h3>Class Details</h3>
                        <button class="close-modal" onclick="closeModal('viewClassModal')">&times;</button>
                    </div>
                    <div id="classDetails" style="padding: 20px 0;"></div>
                    <div class="form-actions">
                        <button type="button" class="btn-cancel" onclick="closeModal('viewClassModal')">Close</button>
                    </div>
                </div>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', modalsHTML);

        // Add search input ID
        const searchInput = document.querySelector('input[placeholder*="Search"]');
        if (searchInput) searchInput.id = 'searchInput';
    }

    // Add subject modals
    function addSubjectModals() {
        const modalsHTML = `
            <!-- Add Subject Modal -->
            <div id="addSubjectModal" class="modal">
                <div class="modal-content">
                    <div class="modal-header">
                        <h3>Add New Subject</h3>
                        <button class="close-modal" onclick="closeModal('addSubjectModal')">&times;</button>
                    </div>
                    <form id="addSubjectForm" onsubmit="handleAddSubject(event)">
                        <div class="form-group">
                            <label for="subjectName">Subject Name *</label>
                            <input type="text" id="subjectName" required>
                        </div>
                        <div class="form-group">
                            <label for="subjectTeachers">Teachers *</label>
                            <input type="text" id="subjectTeachers" required placeholder="e.g., Mr. Smith, Mrs. Jones">
                        </div>
                        <div class="form-group">
                            <label for="subjectStudents">Total Students *</label>
                            <input type="number" id="subjectStudents" min="1" required>
                        </div>
                        <div class="form-group">
                            <label for="subjectClasses">Number of Classes *</label>
                            <input type="number" id="subjectClasses" min="1" required>
                        </div>
                        <div class="form-actions">
                            <button type="button" class="btn-cancel" onclick="closeModal('addSubjectModal')">Cancel</button>
                            <button type="submit" class="btn-submit">Add Subject</button>
                        </div>
                    </form>
                </div>
            </div>

            <!-- Edit Subject Modal -->
            <div id="editSubjectModal" class="modal">
                <div class="modal-content">
                    <div class="modal-header">
                        <h3>Edit Subject</h3>
                        <button class="close-modal" onclick="closeModal('editSubjectModal')">&times;</button>
                    </div>
                    <form id="editSubjectForm" onsubmit="handleEditSubject(event)">
                        <input type="hidden" id="editSubjectIndex">
                        <div class="form-group">
                            <label for="editSubjectName">Subject Name *</label>
                            <input type="text" id="editSubjectName" required>
                        </div>
                        <div class="form-group">
                            <label for="editSubjectTeachers">Teachers *</label>
                            <input type="text" id="editSubjectTeachers" required>
                        </div>
                        <div class="form-group">
                            <label for="editSubjectStudents">Total Students *</label>
                            <input type="number" id="editSubjectStudents" min="1" required>
                        </div>
                        <div class="form-group">
                            <label for="editSubjectClasses">Number of Classes *</label>
                            <input type="number" id="editSubjectClasses" min="1" required>
                        </div>
                        <div class="form-actions">
                            <button type="button" class="btn-cancel" onclick="closeModal('editSubjectModal')">Cancel</button>
                            <button type="submit" class="btn-submit">Update Subject</button>
                        </div>
                    </form>
                </div>
            </div>

            <!-- View Subject Modal -->
            <div id="viewSubjectModal" class="modal">
                <div class="modal-content">
                    <div class="modal-header">
                        <h3>Subject Details</h3>
                        <button class="close-modal" onclick="closeModal('viewSubjectModal')">&times;</button>
                    </div>
                    <div id="subjectDetails" style="padding: 20px 0;"></div>
                    <div class="form-actions">
                        <button type="button" class="btn-cancel" onclick="closeModal('viewSubjectModal')">Close</button>
                    </div>
                </div>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', modalsHTML);

        // Add search input ID
        const searchInput = document.querySelector('input[placeholder*="Search"]');
        if (searchInput) searchInput.id = 'searchInput';
    }

    // Add timetable modals
    function addTimetableModals() {
        const modalsHTML = `
            <!-- Edit Lesson Modal -->
            <div id="editLessonModal" class="modal">
                <div class="modal-content">
                    <div class="modal-header">
                        <h3>Edit Lesson</h3>
                        <button class="close-modal" onclick="closeModal('editLessonModal')">&times;</button>
                    </div>
                    <form id="editLessonForm" onsubmit="handleEditLesson(event)">
                        <input type="hidden" id="editDay">
                        <input type="hidden" id="editPeriod">
                        <div class="form-group">
                            <label for="editSubject">Subject *</label>
                            <input type="text" id="editSubject" required placeholder="e.g., Mathematics">
                        </div>
                        <div class="form-group">
                            <label for="editTeacher">Teacher *</label>
                            <input type="text" id="editTeacher" required placeholder="e.g., Mr. Johnson">
                        </div>
                        <div class="form-group">
                            <label for="editRoom">Room *</label>
                            <input type="text" id="editRoom" required placeholder="e.g., Room 101">
                        </div>
                        <div class="form-actions">
                            <button type="button" class="btn-cancel" onclick="deleteCurrentLesson()" style="background-color: #dc3545;">Delete Lesson</button>
                            <button type="button" class="btn-cancel" onclick="closeModal('editLessonModal')">Cancel</button>
                            <button type="submit" class="btn-submit">Save Lesson</button>
                        </div>
                    </form>
                </div>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', modalsHTML);

        // Add class selector ID
        const classSelector = document.querySelector('select');
        if (classSelector) {
            classSelector.id = 'classSelector';
        }

        // Add current class info div if not exists
        const contentArea = document.querySelector('.content-area');
        if (contentArea && !document.querySelector('.current-class-info')) {
            const infoDiv = document.createElement('div');
            infoDiv.className = 'current-class-info';
            infoDiv.style.cssText = 'margin-bottom: 20px; padding: 15px; background: white; border-radius: 8px;';
            contentArea.insertBefore(infoDiv, contentArea.firstChild);
        }

        // Add timetable grid container if not exists
        if (contentArea && !document.querySelector('.timetable-grid')) {
            const gridDiv = document.createElement('div');
            gridDiv.className = 'timetable-grid';
            gridDiv.style.cssText = 'background: white; padding: 20px; border-radius: 8px; overflow-x: auto;';
            contentArea.appendChild(gridDiv);
        }

        // Add timetable styles
        const style = document.createElement('style');
        style.textContent = `
            .timetable-table {
                width: 100%;
                border-collapse: collapse;
                min-width: 1000px;
            }
            .timetable-table th,
            .timetable-table td {
                border: 1px solid #dee2e6;
                padding: 12px;
                text-align: center;
            }
            .timetable-table th {
                background-color: #0056b3;
                color: white;
                font-weight: 600;
            }
            .time-cell {
                background-color: #f8f9fa;
                font-weight: 500;
                white-space: nowrap;
            }
            .period-cell {
                background-color: #e9ecef;
                font-weight: 500;
            }
            .lesson-cell {
                cursor: pointer;
                transition: all 0.3s;
                background-color: #e3f2fd;
            }
            .lesson-cell:hover {
                background-color: #bbdefb;
                transform: scale(1.02);
            }
            .lesson-subject {
                font-weight: 600;
                color: #0056b3;
                margin-bottom: 4px;
            }
            .lesson-teacher {
                font-size: 0.85rem;
                color: #666;
            }
            .lesson-room {
                font-size: 0.8rem;
                color: #999;
            }
            .empty-cell {
                cursor: pointer;
                background-color: #f8f9fa;
            }
            .empty-cell:hover {
                background-color: #e9ecef;
            }
            .add-lesson {
                color: #0056b3;
                font-size: 0.9rem;
            }
            .break-row {
                background-color: #fff3cd;
            }
            .break-cell {
                font-weight: 600;
                color: #856404;
            }
        `;
        document.head.appendChild(style);
    }

    // Enhance class cards
    function enhanceClassCards() {
        const viewButtons = document.querySelectorAll('.btn');
        viewButtons.forEach(btn => {
            if (btn.textContent.includes('View Details')) {
                btn.setAttribute('onclick', 'alert("Class details modal - Coming soon!")');
            }
            if (btn.textContent.includes('Edit')) {
                btn.setAttribute('onclick', 'alert("Edit class modal - Coming soon!")');
            }
        });
    }

    // Enhance subject cards
    function enhanceSubjectCards() {
        const viewButtons = document.querySelectorAll('.btn');
        viewButtons.forEach(btn => {
            if (btn.textContent.includes('View Details')) {
                btn.setAttribute('onclick', 'alert("Subject details modal - Coming soon!")');
            }
            if (btn.textContent.includes('Edit')) {
                btn.setAttribute('onclick', 'alert("Edit subject modal - Coming soon!")');
            }
        });
    }

    // Enhance announcement actions
    function enhanceAnnouncementActions() {
        const buttons = document.querySelectorAll('.btn, .btn-icon');
        buttons.forEach(btn => {
            const text = btn.textContent || btn.title || '';
            if (text.includes('Create') || text.includes('New Announcement')) {
                btn.setAttribute('onclick', 'alert("Create announcement modal - Coming soon!")');
            }
            if (text.includes('Edit')) {
                btn.setAttribute('onclick', 'alert("Edit announcement modal - Coming soon!")');
            }
            if (text.includes('Publish')) {
                btn.setAttribute('onclick', 'alert("Announcement published!")');
            }
        });
    }

    // Enhance message actions
    function enhanceMessageActions() {
        const composeBtn = document.querySelector('.btn-primary');
        if (composeBtn && composeBtn.textContent.includes('Compose')) {
            composeBtn.setAttribute('onclick', 'alert("Compose message modal - Coming soon!")');
        }

        const replyButtons = document.querySelectorAll('.btn');
        replyButtons.forEach(btn => {
            if (btn.textContent.includes('Reply')) {
                btn.setAttribute('onclick', 'alert("Reply to message - Coming soon!")');
            }
        });
    }

    // Enhance notification actions
    function enhanceNotificationActions() {
        const markAllBtn = document.querySelector('.btn-primary');
        if (markAllBtn && markAllBtn.textContent.includes('Mark All')) {
            markAllBtn.setAttribute('onclick', 'alert("All notifications marked as read!")');
        }

        const actionButtons = document.querySelectorAll('.btn, .btn-icon');
        actionButtons.forEach(btn => {
            const text = btn.textContent || btn.title || '';
            if (text.includes('Mark as Read')) {
                btn.setAttribute('onclick', 'this.closest("div").style.opacity="0.5"; alert("Marked as read!")');
            }
            if (text.includes('Delete')) {
                btn.setAttribute('onclick', 'if(confirm("Delete this notification?")) this.closest(".notification-item, tr").remove()');
            }
        });
    }

    // Initialize on DOM ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function () {
            initCommonFeatures();
            if (pageEnhancers[currentPage]) {
                pageEnhancers[currentPage]();
            }
        });
    } else {
        initCommonFeatures();
        if (pageEnhancers[currentPage]) {
            pageEnhancers[currentPage]();
        }
    }
})();

