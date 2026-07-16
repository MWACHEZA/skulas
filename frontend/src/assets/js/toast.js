// Toast Notification System
const Toast = (function () {
    let container = null;

    function init() {
        if (!container) {
            container = document.createElement('div');
            container.className = 'toast-container';
            document.body.appendChild(container);
        }
    }

    function show(message, type = 'info', duration = 3000) {
        init();

        const toast = document.createElement('div');
        toast.className = `toast ${type}`;

        let icon = 'fa-info-circle';
        if (type === 'success') icon = 'fa-check-circle';
        if (type === 'error') icon = 'fa-exclamation-circle';
        if (type === 'warning') icon = 'fa-exclamation-triangle';

        toast.innerHTML = `
            <div class="toast-content">
                <i class="fas ${icon} toast-icon"></i>
                <div class="toast-message">${message}</div>
            </div>
            <button class="toast-close">&times;</button>
        `;

        container.appendChild(toast);

        // Close button handler
        toast.querySelector('.toast-close').addEventListener('click', () => {
            removeToast(toast);
        });

        // Auto remove
        if (duration > 0) {
            setTimeout(() => {
                removeToast(toast);
            }, duration);
        }
    }

    function removeToast(toast) {
        toast.classList.add('hide');
        toast.addEventListener('transitionend', () => {
            if (toast.parentElement) {
                toast.remove();
            }
        });
    }

    return {
        info: (msg, duration) => show(msg, 'info', duration),
        success: (msg, duration) => show(msg, 'success', duration),
        error: (msg, duration) => show(msg, 'error', duration),
        warning: (msg, duration) => show(msg, 'warning', duration)
    };
})();

// Explicitly register on window for other scripts
window.Toast = Toast;

// Global helper for simpler calls
window.showToast = (message, type = 'info') => {
    if (Toast[type]) {
        Toast[type](message);
    } else {
        Toast.info(message);
    }
};

