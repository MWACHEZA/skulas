/* Student Common Logic */

document.addEventListener('DOMContentLoaded', function () {
    // 1. Session Protection
    const studentLoggedIn = sessionStorage.getItem('studentLoggedIn');
    const studentId = sessionStorage.getItem('studentId');
    const isLoginPage = window.location.pathname.includes('login.html') || window.location.pathname.includes('register.html');

    if (!studentLoggedIn && !isLoginPage) {
        window.location.href = 'login.html';
        return;
    }

    // 2. Load Student Data into Sidebar
    if (studentId) {
        const students = getTenantData('school_students', '[]');
        const student = students.find(s => (s.studentId === studentId || s.id === studentId));

        if (student) {
            // Update Name
            const nameEl = document.getElementById('studentName');
            if (nameEl) {
                nameEl.textContent = student.firstName + ' ' + student.lastName;
            }

            // Update Class
            const classEl = document.getElementById('studentClass');
            if (classEl) {
                classEl.textContent = student.grade;
            }

            // Update Avatar
            const avatarDiv = document.querySelector('.user-avatar');
            if (avatarDiv && student.profilePic) {
                avatarDiv.innerHTML = `<img src="${student.profilePic}" style="width: 100%; height: 100%; border-radius: 50%; object-fit: cover;">`;
            }
        }
    }

    // 3. Global Logout Handler
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', function (e) {
            e.preventDefault();
            sessionStorage.removeItem('studentLoggedIn');
            sessionStorage.removeItem('studentId');
            sessionStorage.removeItem('studentEmail');
            sessionStorage.removeItem('studentName');
            window.location.href = 'login.html';
        });
    }

    // 4. Mobile Menu Toggle (Ensures it works everywhere)
    const menuToggle = document.getElementById('menuToggle');
    const sidebar = document.getElementById('sidebar');
    const sidebarOverlay = document.getElementById('sidebarOverlay');

    if (menuToggle && sidebar && sidebarOverlay) {
        menuToggle.onclick = function () {
            sidebar.classList.toggle('active');
            sidebarOverlay.classList.toggle('active');
        };

        sidebarOverlay.onclick = function () {
            sidebar.classList.remove('active');
            sidebarOverlay.classList.remove('active');
        };
    }
});

