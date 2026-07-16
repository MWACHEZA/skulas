/**
 * Toast Notification System
 * Displays non-intrusive toast messages.
 */

// Create container if it doesn't exist
function createToastContainer() {
    let container = document.querySelector('.toast-container');
    if (!container) {
        container = document.createElement('div');
        container.className = 'toast-container';
        document.body.appendChild(container);
    }
    return container;
}

/**
 * Show a toast message
 * @param {string} message - The message to display
 * @param {string} type - 'success', 'error', 'info', 'warning' (default: 'info')
 * @param {number} duration - Duration in ms (default: 3000)
 */
function showToast(message, type = 'info', duration = 3000) {
    const container = createToastContainer();

    // Create toast element
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;

    // Icon based on type
    let icon = 'fa-info-circle';
    if (type === 'success') icon = 'fa-check-circle';
    if (type === 'error') icon = 'fa-exclamation-circle';
    if (type === 'warning') icon = 'fa-exclamation-triangle';

    toast.innerHTML = `
        <i class="fas ${icon}"></i>
        <span class="toast-message">${message}</span>
    `;

    // Add to container
    container.appendChild(toast);

    // Trigger animation
    requestAnimationFrame(() => {
        toast.classList.add('show');
    });

    // Remove after duration
    setTimeout(() => {
        toast.classList.remove('show');
        toast.addEventListener('transitionend', () => {
            toast.remove();
        });
    }, duration);
}

