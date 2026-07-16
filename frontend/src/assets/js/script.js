// Mobile menu toggle
document.addEventListener('DOMContentLoaded', function () {
    const menuToggle = document.querySelector('.menu-toggle');
    const nav = document.querySelector('nav');

    if (menuToggle) {
        menuToggle.addEventListener('click', function () {
            nav.classList.toggle('active');
            this.classList.toggle('active');
        });
    }

    // Close menu when clicking outside
    document.addEventListener('click', function (event) {
        const isClickInsideNav = nav.contains(event.target);
        const isClickOnToggle = menuToggle.contains(event.target);

        if (!isClickInsideNav && !isClickOnToggle && nav.classList.contains('active')) {
            nav.classList.remove('active');
            if (menuToggle) menuToggle.classList.remove('active');
        }
    });

    // Sidebar toggle for dashboard
    const sidebarToggle = document.querySelector('.sidebar-toggle');
    const sidebar = document.querySelector('.sidebar');

    if (sidebarToggle && sidebar) {
        sidebarToggle.addEventListener('click', function () {
            sidebar.classList.toggle('active');
        });

        // Close sidebar when clicking outside
        document.addEventListener('click', function (e) {
            if (sidebar.classList.contains('active') &&
                !e.target.closest('.sidebar') &&
                !e.target.closest('.sidebar-toggle')) {
                sidebar.classList.remove('active');
            }
        });
    }

    // Smooth scrolling for anchor links
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();

            const targetId = this.getAttribute('href');
            if (targetId === '#') return;

            const targetElement = document.querySelector(targetId);
            if (targetElement) {
                window.scrollTo({
                    top: targetElement.offsetTop - 70,
                    behavior: 'smooth'
                });

                // Close mobile menu if open
                if (nav.classList.contains('active')) {
                    nav.classList.remove('active');
                    if (menuToggle) menuToggle.classList.remove('active');
                }
            }
        });
    });

    // Add active class to current page in navigation
    const currentLocation = window.location.pathname;
    const navLinks = document.querySelectorAll('nav ul li a');

    navLinks.forEach(link => {
        const href = link.getAttribute('href');
        // Extract filename from href
        const hrefFile = href.split('/').pop();
        // Extract filename from current location
        const currentFile = currentLocation.split('/').pop();

        if (href === currentFile || hrefFile === currentFile ||
            (currentLocation.includes(href) && href !== '#' && href !== '') ||
            (currentLocation === '/' && (href === 'index.html' || href === '/'))) {
            link.classList.add('active');
        }
    });

    // Responsive tables for mobile
    const responsiveTables = document.querySelectorAll('.fee-table, .responsive-table');
    if (responsiveTables.length > 0) {
        const makeTablesResponsive = () => {
            if (window.innerWidth < 768) {
                responsiveTables.forEach(table => {
                    if (!table.classList.contains('responsive-processed')) {
                        table.classList.add('responsive-processed');
                        table.classList.add('mobile-table');
                    }
                });
            } else {
                responsiveTables.forEach(table => {
                    table.classList.remove('mobile-table');
                });
            }
        };

        makeTablesResponsive();
        window.addEventListener('resize', makeTablesResponsive);
    }
});

// Scroll animations
window.addEventListener('scroll', function () {
    const scrollPosition = window.scrollY;
    const sections = document.querySelectorAll('section');
    const scrollElements = document.querySelectorAll('.scroll-animation');

    sections.forEach(section => {
        const sectionTop = section.offsetTop - 300;

        if (scrollPosition >= sectionTop) {
            section.classList.add('animate');
        }
    });

    // Handle scroll animations for elements with .scroll-animation class
    if (scrollElements.length > 0) {
        scrollElements.forEach((el) => {
            const elementTop = el.getBoundingClientRect().top;
            const inView = elementTop <=
                ((window.innerHeight || document.documentElement.clientHeight) * (100 / 100));

            if (inView) {
                el.classList.add('scrolled');
            } else {
                el.classList.remove('scrolled');
            }
        });
    }
});

// Dropdown Toggle Logic
document.addEventListener('DOMContentLoaded', function () {
    const dropdowns = document.querySelectorAll('.dropdown');

    dropdowns.forEach(dropdown => {
        const toggleBtn = dropdown.querySelector('.dropdown-toggle');
        const menu = dropdown.querySelector('.dropdown-content');

        if (toggleBtn && menu) {
            toggleBtn.addEventListener('click', function (e) {
                e.preventDefault();
                e.stopPropagation(); // Prevent immediate closing

                // Close other open dropdowns
                document.querySelectorAll('.dropdown-content.show').forEach(openMenu => {
                    if (openMenu !== menu) {
                        openMenu.classList.remove('show');
                    }
                });

                menu.classList.toggle('show');
            });
        }
    });

    // Close dropdown when clicking outside
    document.addEventListener('click', function (e) {
        if (!e.target.closest('.dropdown')) {
            document.querySelectorAll('.dropdown-content.show').forEach(menu => {
                menu.classList.remove('show');
            });
        }
    });
});
