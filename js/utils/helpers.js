/**
 * ══════════════════════════════════════════════════════════════════════════
 * AVA - Helper Utilities
 * Common utility functions used throughout the application
 * ══════════════════════════════════════════════════════════════════════════
 */

const Helpers = {
    /**
     * Generate a unique ID (UUID v4 style)
     * @returns {string}
     */
    generateId() {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
            const r = Math.random() * 16 | 0;
            const v = c === 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
    },

    /**
     * Hash password using SHA-256 (simplified for demo)
     * In production, use bcrypt on server-side
     * @param {string} password 
     * @returns {Promise<string>}
     */
    async hashPassword(password) {
        const encoder = new TextEncoder();
        const data = encoder.encode(password + 'ava_salt_2024');
        const hash = await crypto.subtle.digest('SHA-256', data);
        return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, '0')).join('');
    },

    /**
     * Verify password against hash
     * @param {string} password 
     * @param {string} hash 
     * @returns {Promise<boolean>}
     */
    async verifyPassword(password, hash) {
        const computedHash = await this.hashPassword(password);
        return computedHash === hash;
    },

    /**
     * Format date to Thai locale
     * @param {string|Date} date 
     * @param {object} options 
     * @returns {string}
     */
    formatDate(date, options = {}) {
        if (!date) return '-';
        const d = new Date(date);
        const defaultOptions = { year: 'numeric', month: 'short', day: 'numeric', ...options };
        return d.toLocaleDateString('th-TH', defaultOptions);
    },

    /**
     * Format date and time to Thai locale
     * @param {string|Date} date 
     * @returns {string}
     */
    formatDateTime(date) {
        if (!date) return '-';
        const d = new Date(date);
        return d.toLocaleDateString('th-TH', {
            year: 'numeric', month: 'short', day: 'numeric',
            hour: '2-digit', minute: '2-digit'
        });
    },

    /**
     * Format relative time (e.g., "2 ชั่วโมงที่แล้ว")
     * @param {string|Date} date 
     * @returns {string}
     */
    formatRelativeTime(date) {
        if (!date) return '-';
        const now = new Date();
        const then = new Date(date);
        const diff = now - then;
        const minutes = Math.floor(diff / 60000);
        const hours = Math.floor(diff / 3600000);
        const days = Math.floor(diff / 86400000);

        if (minutes < 1) return 'เมื่อสักครู่';
        if (minutes < 60) return `${minutes} นาทีที่แล้ว`;
        if (hours < 24) return `${hours} ชั่วโมงที่แล้ว`;
        if (days < 7) return `${days} วันที่แล้ว`;
        return this.formatDate(date);
    },

    /**
     * Format currency (Thai Baht)
     * @param {number} amount 
     * @returns {string}
     */
    formatCurrency(amount) {
        if (amount === null || amount === undefined) return '-';
        return new Intl.NumberFormat('th-TH', { style: 'currency', currency: 'THB' }).format(amount);
    },

    /**
     * Format number with commas
     * @param {number} num 
     * @returns {string}
     */
    formatNumber(num) {
        if (num === null || num === undefined) return '-';
        return new Intl.NumberFormat('th-TH').format(num);
    },

    /**
     * Truncate text with ellipsis
     * @param {string} text 
     * @param {number} maxLength 
     * @returns {string}
     */
    truncate(text, maxLength = 50) {
        if (!text) return '';
        if (text.length <= maxLength) return text;
        return text.substring(0, maxLength) + '...';
    },

    /**
     * Debounce function
     * @param {Function} func 
     * @param {number} wait 
     * @returns {Function}
     */
    debounce(func, wait = 300) {
        let timeout;
        return (...args) => {
            clearTimeout(timeout);
            timeout = setTimeout(() => func.apply(this, args), wait);
        };
    },

    /**
     * Get initials from full name
     * @param {string} name 
     * @returns {string}
     */
    getInitials(name) {
        if (!name) return '?';
        const parts = name.split(' ');
        if (parts.length >= 2) {
            return (parts[0][0] + parts[1][0]).toUpperCase();
        }
        return name.substring(0, 2).toUpperCase();
    },

    /**
     * Check if deadline is overdue or approaching
     * @param {string} deadline 
     * @returns {object}
     */
    getDeadlineStatus(deadline) {
        if (!deadline) return { status: 'none', text: '-' };
        const now = new Date();
        const dl = new Date(deadline);
        const diff = dl - now;
        const days = Math.ceil(diff / 86400000);

        if (diff < 0) return { status: 'overdue', text: `เกินกำหนด ${Math.abs(days)} วัน`, class: 'overdue' };
        if (days <= 2) return { status: 'warning', text: `เหลือ ${days} วัน`, class: 'warning' };
        return { status: 'ok', text: this.formatDate(deadline), class: '' };
    },

    /**
     * Escape HTML to prevent XSS
     * @param {string} text 
     * @returns {string}
     */
    escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    },

    /**
     * Convert file to Base64 data URL
     * @param {File} file 
     * @returns {Promise<string>}
     */
    fileToDataUrl(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    },

    /**
     * Get file size in human readable format
     * @param {number} bytes 
     * @returns {string}
     */
    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    },

    /**
     * Sleep for specified milliseconds
     * @param {number} ms 
     * @returns {Promise<void>}
     */
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
};
