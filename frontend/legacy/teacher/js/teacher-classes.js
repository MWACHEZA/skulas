document.addEventListener('DOMContentLoaded', function () {
    // 1. Common Page Logic (Sidebar, User Info, Logout)

    // Mobile menu toggle
    const menuToggle = document.getElementById('menuToggle');
    const sidebar = document.getElementById('sidebar');
    const sidebarOverlay = document.getElementById('sidebarOverlay');

    if (menuToggle && sidebar) {
        menuToggle.addEventListener('click', function () {
            sidebar.classList.toggle('active');
            if (sidebarOverlay) sidebarOverlay.classList.toggle('active');
        });
    }

    if (sidebarOverlay) {
        sidebarOverlay.addEventListener('click', function () {
            sidebar.classList.remove('active');
            sidebarOverlay.classList.remove('active');
        });
    }

    // Load teacher name from localStorage
    const teacherName = getTenantData('teacherName', 'null');
    if (teacherName) {
        const nameDisplay = document.getElementById('teacherName');
        if (nameDisplay) nameDisplay.textContent = teacherName;
    }

    // Logout functionality
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', function (e) {
            e.preventDefault();
            saveTenantData('teacherLoggedIn', []);
            window.location.href = 'login.html';
        });
    }

    // 2. Class Filtering Logic
    const searchInput = document.getElementById('searchInput');
    const gradeFilter = document.getElementById('gradeFilter');
    const subjectFilter = document.getElementById('subjectFilter');
    const classCards = document.querySelectorAll('.class-card');

    function filterClasses() {
        const searchTerm = searchInput.value.toLowerCase();
        const selectedGrade = gradeFilter.value.toLowerCase();
        const selectedSubject = subjectFilter.value.toLowerCase();

        classCards.forEach(card => {
            // Get data attributes or fallback to text content checks
            const cardGrade = (card.dataset.grade || '').toLowerCase();
            const cardSubject = (card.dataset.subject || '').toLowerCase();
            const cardName = card.querySelector('h3').textContent.toLowerCase();

            // Check matches
            const matchesSearch = cardName.includes(searchTerm);

            const matchesGrade = selectedGrade === '' ||
                cardGrade === selectedGrade ||
                cardName.includes(selectedGrade); // Fallback if data attribute missing, e.g. "Form 4" in title

            const matchesSubject = selectedSubject === '' ||
                cardSubject === selectedSubject ||
                cardName.includes(selectedSubject); // Fallback

            // Toggle visibility
            if (matchesSearch && matchesGrade && matchesSubject) {
                card.style.display = 'block';
            } else {
                card.style.display = 'none';
            }
        });
    }

    // Attach listeners if elements exist
    if (searchInput) searchInput.addEventListener('input', filterClasses);
    if (gradeFilter) gradeFilter.addEventListener('change', filterClasses);
    if (subjectFilter) subjectFilter.addEventListener('change', filterClasses);
});

