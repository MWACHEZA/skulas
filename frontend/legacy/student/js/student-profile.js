/* Student Profile Logic - v2.2.0 */
console.log('Student Profile Script v2.2.0 Loaded');

document.addEventListener('DOMContentLoaded', function () {
    console.log('Profile Debug: DOMContentLoaded fired');

    // 1. Session Setup
    const studentId = sessionStorage.getItem('studentId');
    console.log('Profile Debug: studentId from session:', studentId);

    if (!sessionStorage.getItem('studentLoggedIn') || !studentId) {
        console.warn('Profile Debug: No session found, redirecting to login');
        window.location.href = 'login.html';
        return;
    }

    // 2. Data Retrieval
    const students = getTenantData('school_students', '[]');
    console.log('Profile Debug: Total students in localStorage:', students.length);

    const student = students.find(s => String(s.studentId).trim() === String(studentId).trim() || String(s.id).trim() === String(studentId).trim());
    console.log('Profile Debug: Found student object:', student);

    if (!student) {
        console.error('Profile Debug: Student NOT found in database for ID:', studentId);
        if (typeof Toast !== 'undefined') Toast.error('Error: Student profile not found.');
        return;
    }

    // 3. UI Update Logic
    function applyDataToUI() {
        console.log('Profile Debug: Applying data to UI elements...');

        try {
            // Helper to set text content safely
            const setText = (id, val) => {
                const el = document.getElementById(id);
                if (el) {
                    el.textContent = val || '-';
                } else {
                    console.warn(`Profile Debug: Element with ID ${id} not found`);
                }
            };

            // Basic Info
            setText('dispFullName', student.firstName + ' ' + student.lastName);
            setText('dispStudentId', student.studentId);
            setText('dispClass', student.grade);

            if (student.dob) {
                const date = new Date(student.dob);
                setText('dispDob', isNaN(date.getTime()) ? student.dob : date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }));
            } else {
                setText('dispDob', '-');
            }

            setText('dispGender', student.gender ? student.gender.charAt(0).toUpperCase() + student.gender.slice(1) : '-');
            setText('dispReligion', student.religion);

            // Contact Info
            setText('dispEmail', student.email);
            setText('dispPhone', student.phone);
            setText('dispAddress', student.address);

            // Parent Info
            setText('dispFatherName', student.fatherName);
            setText('dispFatherPhone', student.fatherPhone);
            setText('dispFatherEmail', student.fatherEmail);
            setText('dispMotherName', student.motherName);
            setText('dispMotherPhone', student.motherPhone);
            setText('dispMotherEmail', student.motherEmail);

            // Emergency Info
            setText('dispEmergencyName', student.emergencyName);
            setText('dispEmergencyRelation', student.emergencyRelation);
            setText('dispEmergencyPhone', student.emergencyPhone);
            setText('dispEmergencyAddress', student.emergencyAddress);

            // Sidebar Sync
            const nameEl = document.getElementById('studentName');
            if (nameEl) nameEl.textContent = student.firstName + ' ' + student.lastName;

            const classEl = document.getElementById('studentClass');
            if (classEl) classEl.textContent = student.grade;

            // Avatar update
            if (student.profilePic) {
                const avatarDiv = document.querySelector('.user-avatar');
                if (avatarDiv) {
                    avatarDiv.innerHTML = `<img src="${student.profilePic}" style="width: 100%; height: 100%; border-radius: 50%; object-fit: cover;">`;
                }
                const photoContainer = document.querySelector('.photo-container');
                if (photoContainer) {
                    photoContainer.innerHTML = `<img src="${student.profilePic}" alt="Profile Photo" style="width: 100%; height: 100%; object-fit: cover;">`;
                }
            }

            console.log('Profile Debug: UI updated successfully');
        } catch (err) {
            console.error('Profile Debug: Error while updating UI:', err);
        }
    }

    // Execute update
    applyDataToUI();

    // Re-check after 500ms to handle any late-rendering or competing scripts
    setTimeout(applyDataToUI, 500);

    // ==========================================
    // Profile Picture Logic
    // ==========================================
    const uploadBtn = document.getElementById('uploadPhotoBtn');
    if (uploadBtn) {
        const fileInput = document.createElement('input');
        fileInput.type = 'file';
        fileInput.accept = 'image/*';
        fileInput.style.display = 'none';
        document.body.appendChild(fileInput);

        uploadBtn.addEventListener('click', () => fileInput.click());

        fileInput.addEventListener('change', function (e) {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = function (event) {
                    const imageUrl = event.target.result;

                    // Update main student record
                    student.profilePic = imageUrl;

                    // Save to localStorage
                    const allStudents = getTenantData('school_students', '[]');
                    const idx = allStudents.findIndex(s => s.studentId === student.studentId || s.id === student.id);
                    if (idx !== -1) {
                        student.photo = imageUrl; // Sync to admin mapping
                        allStudents[idx] = student;
                        saveTenantData('school_students', allStudents);
                    }

                    applyDataToUI();
                    if (typeof Toast !== 'undefined') Toast.success('Profile picture updated!');
                };
                reader.readAsDataURL(file);
            }
        });
    }

    // ==========================================
    // Modal & Form Handling
    // ==========================================
    function setupModal(type) {
        const editBtn = document.getElementById(`edit${type}Btn`);
        const modal = document.getElementById(`edit${type}Modal`);
        const closeBtn = document.getElementById(`close${type}Modal`);
        const cancelBtn = document.getElementById(`cancel${type}Btn`);
        const form = document.getElementById(`${type.charAt(0).toLowerCase() + type.slice(1)}Form`);

        if (!editBtn || !modal || !form) return;

        editBtn.addEventListener('click', (e) => {
            e.preventDefault();
            modal.style.display = 'block';
            populateFormFields(type);
            if (type === 'EmergencyContact') loadRelations();
        });

        const closeModalFunc = () => { modal.style.display = 'none'; };
        if (closeBtn) closeBtn.addEventListener('click', closeModalFunc);
        if (cancelBtn) cancelBtn.addEventListener('click', closeModalFunc);

        form.addEventListener('submit', (e) => {
            e.preventDefault();
            saveFormData(type, form);
            closeModalFunc();
        });
    }

    function populateFormFields(type) {
        // Direct population from student object instead of UI text scraping
        if (type === 'BasicInfo') {
            document.getElementById('fullName').value = student.firstName + ' ' + (student.lastName || '');
            document.getElementById('studentId').value = student.studentId || '';
            document.getElementById('dob').value = student.dob || '';
            document.getElementById('gender').value = (student.gender || 'male').toLowerCase();
            if (document.getElementById('religion')) {
                document.getElementById('religion').value = student.religion || 'Christianity';
            }
        } else if (type === 'ContactInfo') {
            document.getElementById('email').value = student.email || '';
            document.getElementById('phone').value = student.phone || '';
            document.getElementById('address').value = student.address || '';
        } else if (type === 'ParentInfo') {
            document.getElementById('fatherName').value = student.fatherName || '';
            document.getElementById('fatherPhone').value = student.fatherPhone || '';
            document.getElementById('fatherEmail').value = student.fatherEmail || '';
            document.getElementById('motherName').value = student.motherName || '';
            document.getElementById('motherPhone').value = student.motherPhone || '';
            document.getElementById('motherEmail').value = student.motherEmail || '';
        } else if (type === 'EmergencyContact') {
            document.getElementById('emergencyName').value = student.emergencyName || '';
            document.getElementById('emergencyRelation').value = student.emergencyRelation || '';
            document.getElementById('emergencyPhone').value = student.emergencyPhone || '';
            document.getElementById('emergencyAddress').value = student.emergencyAddress || '';
        }
    }

    function saveFormData(type, form) {
        const formData = new FormData(form);
        const data = Object.fromEntries(formData.entries());

        if (type === 'BasicInfo') {
            const names = (data.fullName || '').split(' ');
            student.firstName = names[0];
            student.lastName = names.slice(1).join(' ');
            student.dob = data.dob;
            student.gender = data.gender;
            student.religion = data.religion;
        } else if (type === 'ContactInfo') {
            student.email = data.email;
            student.phone = data.phone;
            student.address = data.address;
        } else if (type === 'ParentInfo') {
            student.fatherName = data.fatherName;
            student.fatherPhone = data.fatherPhone;
            student.fatherEmail = data.fatherEmail;
            student.motherName = data.motherName;
            student.motherPhone = data.motherPhone;
            student.motherEmail = data.motherEmail;
        } else if (type === 'EmergencyContact') {
            student.emergencyName = data.emergencyName;
            student.emergencyRelation = data.emergencyRelation;
            student.emergencyPhone = data.emergencyPhone;
            student.emergencyAddress = data.emergencyAddress;
        }

        // Save to localStorage
        const allStudents = getTenantData('school_students', '[]');
        const idx = allStudents.findIndex(s => s.studentId === student.studentId || s.id === student.id);
        if (idx !== -1) {
            // Ensure Admin-compatible fields are also updated
            student.name = `${student.firstName} ${student.lastName}`;
            student.class = student.grade;
            student.id = student.studentId;

            allStudents[idx] = student;
            saveTenantData('school_students', allStudents);
        }

        applyDataToUI();
        if (typeof Toast !== 'undefined') Toast.success(`${type.replace(/([A-Z])/g, ' $1').trim()} updated successfully!`);
    }

    setupModal('BasicInfo');
    setupModal('ContactInfo');
    setupModal('ParentInfo');
    setupModal('EmergencyContact');

    // Dynamic Relationship Handling
    window.loadRelations = function () {
        const select = document.getElementById('emergencyRelation');
        if (!select) return;
        const custom = getTenantData('school_custom_relations', '[]');

        const options = Array.from(select.options);
        const addNewIdx = options.findIndex(opt => opt.value === 'new');

        custom.forEach(rel => {
            if (!options.some(opt => opt.text === rel)) {
                const opt = document.createElement('option');
                opt.text = rel;
                opt.value = rel;
                select.add(opt, select.options[addNewIdx]);
            }
        });
    }

    window.handleRelationChange = function (select) {
        if (select.value === 'new') {
            const newRel = prompt("Enter new relationship type:");
            if (newRel && newRel.trim()) {
                const relations = getTenantData('school_custom_relations', '[]');
                if (!relations.includes(newRel.trim())) {
                    relations.push(newRel.trim());
                    saveTenantData('school_custom_relations', relations);
                }

                const opt = document.createElement('option');
                opt.text = newRel.trim();
                opt.value = newRel.trim();
                select.add(opt, select.options[select.length - 1]);
                select.value = newRel.trim();
            } else {
                select.value = "";
            }
        }
    }

    // Logout logic
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.onclick = (e) => {
            e.preventDefault();
            sessionStorage.clear();
            window.location.href = 'login.html';
        };
    }
});

