/* IT Support Shared Logic - Knowledge Base management */

const IT_DB_KEYS = {
    KB: 'itKnowledgeBase',
    TICKETS: 'itTickets'
};

const INITIAL_KB_DATA = [
    { id: 1, title: "Wifi Connection Guide", category: "Network", icon: "fa-wifi", tags: ["internet", "wifi", "connect"], content: "To connect to the school wifi, select 'Embakwe_Staff' and use your portal password." },
    { id: 2, title: "Common Printer Hub Fixes", category: "Hardware", icon: "fa-print", tags: ["printing", "toner", "paper jam"], content: "If the printer is jammed, open front cover A and remove the blue lever..." },
    { id: 3, title: "Accessing External Files", category: "Software", icon: "fa-key", tags: ["vpn", "sharepoint", "files"], content: "Use the school VPN client to access shared drives from outside the network." },
    { id: 4, title: "Portal App Setup", category: "Software", icon: "fa-mobile-alt", tags: ["mobile", "app", "install"], content: "Download the 'Embakwe Portal' app from the school resources page." },
    { id: 5, title: "Smartboard Calibration", category: "AV", icon: "fa-chalkboard", tags: ["classroom", "projector", "calibration"], content: "Tap the four corners of the screen when the calibration tool appears." }
];

// Initialize KB if not exists
if (getTenantData(IT_DB_KEYS.KB, 'null') === null) {
    saveTenantData(IT_DB_KEYS.KB, INITIAL_KB_DATA);
}

/**
 * Universal KB Renderer
 * @param {string} containerId - The ID of the container to render into
 * @param {string} filter - Search filter string
 */
function renderSharedKB(containerId, filter = '') {
    const container = document.getElementById(containerId);
    if (!container) return;

    const kbData = getTenantData(IT_DB_KEYS.KB, '[]');
    const filtered = kbData.filter(item =>
        item.title.toLowerCase().includes(filter.toLowerCase()) ||
        item.category.toLowerCase().includes(filter.toLowerCase()) ||
        (item.tags && item.tags.some(t => t.toLowerCase().includes(filter.toLowerCase())))
    );

    container.innerHTML = '';

    if (filtered.length === 0) {
        container.innerHTML = '<p style="text-align:center; color:#94a3b8; font-size:0.85rem; padding:20px;">No articles found.</p>';
        return;
    }

    filtered.forEach(item => {
        const a = document.createElement('a');
        a.href = "#";
        a.className = 'kb-item';
        a.onclick = (e) => {
            e.preventDefault();
            if (typeof showKBArticle === 'function') {
                showKBArticle(item);
            } else {
                alert(`Content: ${item.content || 'No content available.'}`);
            }
        };
        a.innerHTML = `
            <div class="kb-icon"><i class="fas ${item.icon || 'fa-book'}"></i></div>
            <div style="display:flex; flex-direction:column;">
                <span style="font-weight:600; font-size:0.9rem;">${item.title}</span>
                <span style="font-size:0.7rem; color:#64748b;">${item.category}</span>
            </div>
        `;
        container.appendChild(a);
    });
}

