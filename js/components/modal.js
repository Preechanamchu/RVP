/**
 * ══════════════════════════════════════════════════════════════════════════
 * AVA - Toast Notification Component
 * Provides popup notifications for user feedback
 * ══════════════════════════════════════════════════════════════════════════
 */

const Toast = {
    container: null,

    /**
     * Initialize toast container
     */
    init() {
        if (this.container) return;
        this.container = document.createElement('div');
        this.container.className = 'toast-container';
        document.body.appendChild(this.container);
    },

    /**
     * Show a toast notification
     * @param {string} message 
     * @param {string} type - 'success', 'error', 'warning', 'info'
     * @param {number} duration - Duration in ms
     */
    show(message, type = 'info', duration = 4000) {
        this.init();

        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.innerHTML = `
            <span class="toast-icon">${this.getIcon(type)}</span>
            <span class="toast-message">${Helpers.escapeHtml(message)}</span>
            <button class="toast-close" onclick="this.parentElement.remove()">✕</button>
        `;

        this.container.appendChild(toast);

        // Auto remove after duration
        setTimeout(() => {
            toast.style.animation = 'slideOut 0.3s ease forwards';
            setTimeout(() => toast.remove(), 300);
        }, duration);
    },

    /**
     * Get icon for toast type
     * @param {string} type 
     * @returns {string}
     */
    getIcon(type) {
        const icons = {
            success: '✓',
            error: '✕',
            warning: '⚠',
            info: 'ℹ'
        };
        return icons[type] || icons.info;
    },

    // Shorthand methods
    success(message) { this.show(message, 'success'); },
    error(message) { this.show(message, 'error'); },
    warning(message) { this.show(message, 'warning'); },
    info(message) { this.show(message, 'info'); }
};

/**
 * ══════════════════════════════════════════════════════════════════════════
 * AVA - Modal Component
 * Reusable modal dialog system
 * ══════════════════════════════════════════════════════════════════════════
 */

const Modal = {
    activeModals: [],

    /**
     * Show a modal dialog
     * @param {object} options
     * @returns {HTMLElement}
     */
    show(options = {}) {
        const { title, content, footer, size = 'md', closable = true, onClose } = options;

        const sizeClass = { sm: '400px', md: '500px', lg: '700px', xl: '900px' }[size] || '500px';

        const backdrop = document.createElement('div');
        backdrop.className = 'modal-backdrop';
        backdrop.innerHTML = `
            <div class="modal" style="max-width: ${sizeClass}">
                <div class="modal-header">
                    <h3>${Helpers.escapeHtml(title || '')}</h3>
                    ${closable ? '<button class="btn btn-ghost btn-icon modal-close">✕</button>' : ''}
                </div>
                <div class="modal-body">${content || ''}</div>
                ${footer ? `<div class="modal-footer">${footer}</div>` : ''}
            </div>
        `;

        document.body.appendChild(backdrop);
        document.body.style.overflow = 'hidden';

        // Animate in
        requestAnimationFrame(() => backdrop.classList.add('active'));

        // Close handlers
        if (closable) {
            const closeBtn = backdrop.querySelector('.modal-close');
            closeBtn.addEventListener('click', () => this.close(backdrop, onClose));
            backdrop.addEventListener('click', (e) => {
                if (e.target === backdrop) this.close(backdrop, onClose);
            });
        }

        this.activeModals.push(backdrop);
        return backdrop;
    },

    /**
     * Close a modal
     * @param {HTMLElement} backdrop 
     * @param {Function} onClose 
     */
    close(backdrop, onClose) {
        backdrop.classList.remove('active');
        setTimeout(() => {
            backdrop.remove();
            if (this.activeModals.length <= 1) {
                document.body.style.overflow = '';
            }
            this.activeModals = this.activeModals.filter(m => m !== backdrop);
            if (onClose) onClose();
        }, 250);
    },

    /**
     * Close all modals
     */
    closeAll() {
        this.activeModals.forEach(m => this.close(m));
    },

    /**
     * Show confirm dialog
     * @param {string} message 
     * @param {object} options 
     * @returns {Promise<boolean>}
     */
    confirm(message, options = {}) {
        return new Promise((resolve) => {
            const modal = this.show({
                title: options.title || 'ยืนยัน',
                content: `<p>${Helpers.escapeHtml(message)}</p>`,
                footer: `
                    <button class="btn btn-ghost modal-cancel">ยกเลิก</button>
                    <button class="btn ${options.danger ? 'btn-danger' : 'btn-primary'} modal-confirm">
                        ${options.confirmText || 'ยืนยัน'}
                    </button>
                `,
                closable: true,
                onClose: () => resolve(false)
            });

            modal.querySelector('.modal-cancel').addEventListener('click', () => {
                this.close(modal);
                resolve(false);
            });

            modal.querySelector('.modal-confirm').addEventListener('click', () => {
                this.close(modal);
                resolve(true);
            });
        });
    },

    /**
     * Show alert dialog
     * @param {string} message 
     * @param {string} title 
     * @returns {Promise<void>}
     */
    alert(message, title = 'แจ้งเตือน') {
        return new Promise((resolve) => {
            const modal = this.show({
                title,
                content: `<p>${Helpers.escapeHtml(message)}</p>`,
                footer: '<button class="btn btn-primary modal-ok">ตกลง</button>',
                closable: true,
                onClose: resolve
            });

            modal.querySelector('.modal-ok').addEventListener('click', () => {
                this.close(modal);
                resolve();
            });
        });
    }
};
