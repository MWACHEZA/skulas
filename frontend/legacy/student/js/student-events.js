// Mock Events Data
const eventsData = [
    {
        id: 1,
        title: "End of Year Academic Awards",
        date: "2023-05-15",
        time: "14:00 - 16:00",
        location: "Main Hall",
        category: "academic",
        description: "Annual ceremony to recognize outstanding academic achievements of students across all forms.",
        icon: "fas fa-graduation-cap",
        status: "upcoming"
    },
    {
        id: 2,
        title: "Inter-School Sports Competition",
        date: "2023-04-28",
        time: "08:00 - 17:00",
        location: "Sports Ground",
        category: "sports",
        description: "Annual sports competition between neighboring schools featuring football, netball, and athletics.",
        icon: "fas fa-futbol",
        status: "past"
    },
    {
        id: 3,
        title: "Annual Cultural Festival",
        date: "2023-05-05",
        time: "09:00 - 16:00",
        location: "School Grounds",
        category: "cultural",
        description: "Celebration of cultural diversity featuring traditional dances, music, and art exhibitions.",
        icon: "fas fa-theater-masks",
        status: "upcoming"
    },
    {
        id: 4,
        title: "Science Fair",
        date: "2023-04-20",
        time: "10:00 - 15:00",
        location: "Science Block",
        category: "academic",
        description: "Exhibition of student science projects showcasing innovation and scientific inquiry.",
        icon: "fas fa-microscope",
        status: "past"
    },
    {
        id: 5,
        title: "Debate Club Regionals",
        date: "2023-06-10",
        time: "09:00 - 14:00",
        location: "Library Hall",
        category: "extracurricular",
        description: "Regional debate championship featuring top schools from the province.",
        icon: "fas fa-comments",
        status: "upcoming"
    },
    {
        id: 6,
        title: "Music Concert",
        date: "2023-06-25",
        time: "18:00 - 21:00",
        location: "Main Hall",
        category: "cultural",
        description: "Evening music concert performed by the school choir and orchestra.",
        icon: "fas fa-music",
        status: "upcoming"
    }
];

document.addEventListener('DOMContentLoaded', function () {
    const eventsGrid = document.getElementById('eventsGrid');
    const eventList = document.getElementById('eventList');
    const searchInput = document.getElementById('eventSearch');
    const searchBtn = document.getElementById('searchBtn');
    const categoryFilter = document.getElementById('categoryFilter');
    const timeFilter = document.getElementById('timeFilter');
    const viewAllBtn = document.getElementById('viewAllBtn');

    // State for "View All"
    let showingAll = false;

    // Render Featured Events (Grid)
    function renderGrid(events) {
        eventsGrid.innerHTML = '';
        if (events.length === 0) {
            eventsGrid.innerHTML = '<p style="grid-column: 1/-1; text-align: center; color: #666;">No events found.</p>';
            return;
        }

        events.forEach(event => {
            const card = document.createElement('div');
            card.className = 'event-card';

            card.innerHTML = `
                <div class="event-image">
                    <i class="${event.icon}"></i>
                </div>
                <div class="event-content">
                    <span class="event-date">${formatDate(event.date)}</span>
                    <h3 class="event-title">${event.title}</h3>
                    <p class="event-description">${event.description}</p>
                    <div class="event-meta">
                        <div class="event-location"><i class="fas fa-map-marker-alt"></i> ${event.location}</div>
                        <div class="event-attendance"><i class="fas fa-tag"></i> ${capitalize(event.category)}</div>
                    </div>
                </div>
            `;
            eventsGrid.appendChild(card);
        });
    }

    // Render List (Upcoming section - Sidebar)
    function renderList(events, limit = 3) {
        eventList.innerHTML = '';

        // 1. Strictly filter for FUTURE events (or today)
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        let futureEvents = events.filter(e => {
            const eDate = new Date(e.date);
            return eDate >= today;
        });

        // 2. Sort by Nearest Date
        futureEvents.sort((a, b) => new Date(a.date) - new Date(b.date));

        // 3. Apply Limit (unless showing all)
        const displayEvents = showingAll ? futureEvents : futureEvents.slice(0, limit);

        if (displayEvents.length === 0) {
            eventList.innerHTML = '<li class="event-item" style="justify-content:center; color:#666;">No upcoming events.</li>';
            return;
        }

        displayEvents.forEach(event => {
            const dateObj = new Date(event.date);
            const month = dateObj.toLocaleString('default', { month: 'short' });
            const day = dateObj.getDate();

            const li = document.createElement('li');
            li.className = 'event-item';

            // Determine status badge
            let statusClass = 'status-upcoming';
            let statusText = 'Upcoming';

            // Check if it's today
            const isToday = dateObj.toDateString() === today.toDateString();
            if (isToday) {
                statusClass = 'status-ongoing';
                statusText = 'Today';
            }

            li.innerHTML = `
                <div class="event-calendar">
                    <div class="event-month">${month}</div>
                    <div class="event-day">${day}</div>
                </div>
                <div class="event-info">
                    <h4>${event.title}</h4>
                    <p><i class="fas fa-clock"></i> ${event.time}</p>
                    <p><i class="fas fa-map-marker-alt"></i> ${event.location}</p>
                </div>
                <span class="event-status ${statusClass}">${statusText}</span>
            `;
            eventList.appendChild(li);
        });
    }

    // Sorting: Upcoming first
    function getSortedEvents() {
        return [...eventsData].sort((a, b) => new Date(a.date) - new Date(b.date));
    }

    // Filtering Logic
    function filterEvents() {
        const term = searchInput.value.toLowerCase();
        const category = categoryFilter.value;
        const time = timeFilter.value; // all, today, this-month, upcoming

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const filtered = getSortedEvents().filter(e => {
            const matchSearch = e.title.toLowerCase().includes(term) || e.description.toLowerCase().includes(term);
            const matchCategory = category === 'all' || e.category === category;

            let matchTime = true;
            const eDate = new Date(e.date);

            if (time === 'today') {
                matchTime = eDate.getTime() === today.getTime();
            } else if (time === 'this-month') {
                matchTime = eDate.getMonth() === today.getMonth() && eDate.getFullYear() === today.getFullYear();
            } else if (time === 'upcoming') {
                matchTime = eDate >= today;
            }

            return matchSearch && matchCategory && matchTime;
        });

        renderGrid(filtered);
        renderList(filtered, showingAll ? filtered.length : 3);
    }

    // Listeners
    searchInput.addEventListener('input', filterEvents);
    searchBtn.addEventListener('click', filterEvents);
    categoryFilter.addEventListener('change', filterEvents);
    timeFilter.addEventListener('change', filterEvents);

    viewAllBtn.addEventListener('click', function (e) {
        e.preventDefault();
        showingAll = !showingAll;
        this.innerHTML = showingAll ? 'Show Less <i class="fas fa-arrow-up"></i>' : 'View All <i class="fas fa-arrow-right"></i>';
        filterEvents(); // Re-render list with new limit
    });

    // Helper
    function formatDate(dateStr) {
        return new Date(dateStr).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
    }
    function capitalize(s) {
        return s.charAt(0).toUpperCase() + s.slice(1);
    }

    // Initial Load
    filterEvents();
});

