/**
 * ══════════════════════════════════════════════════════════════════════════
 * AVA - Sidebar Component
 * Dynamic sidebar navigation based on user role
 * ══════════════════════════════════════════════════════════════════════════
 */

const Sidebar = {
    /**
     * Render the sidebar
     * @returns {string} HTML string
     */
    render() {
        const menu = RBAC.getSidebarMenu();
        const user = AuthService.getCurrentUserSync();

        return `
            <aside class="sidebar" id="sidebar">
                <div class="sidebar-header">
                    <div class="sidebar-logo">
                        <img src="LOGO.png" alt="AVA Logo">
                    </div>
                </div>
                
                <nav class="sidebar-nav">
                    ${menu.map(section => this.renderSection(section)).join('')}
                </nav>

                <div class="sidebar-footer">
                    <div class="nav-item" onclick="App.logout()">
                        ${Icons.logout}
                        <span>ออกจากระบบ</span>
                    </div>
                </div>
            </aside>
            <div class="sidebar-overlay" id="sidebarOverlay" onclick="Sidebar.toggleMobile()"></div>
        `;
    },

    /**
     * Render a menu section
     * @param {object} section 
     * @returns {string}
     */
    renderSection(section) {
        return `
            <div class="nav-section">
                <div class="nav-section-title">${section.section}</div>
                ${section.items.map(item => this.renderItem(item)).join('')}
            </div>
        `;
    },

    /**
     * Render a menu item
     * @param {object} item 
     * @returns {string}
     */
    renderItem(item) {
        const isActive = App.currentRoute === item.id;
        const badge = item.badge ? `<span class="nav-badge">${item.badge}</span>` : '';

        return `
            <button class="nav-item ${isActive ? 'active' : ''}" 
                    onclick="App.navigate('${item.id}')" 
                    data-route="${item.id}">
                ${Icons[item.icon] || ''}
                <span>${item.label}</span>
                ${badge}
            </button>
        `;
    },

    /**
     * Update active state based on current route
     * @param {string} route 
     */
    updateActive(route) {
        document.querySelectorAll('.nav-item[data-route]').forEach(item => {
            item.classList.toggle('active', item.dataset.route === route);
        });
    },

    /**
     * Toggle sidebar on mobile
     */
    toggleMobile() {
        const sidebar = document.getElementById('sidebar');
        const overlay = document.getElementById('sidebarOverlay');
        sidebar.classList.toggle('active');
        overlay.classList.toggle('active');
    },

    /**
     * Update badge count for a menu item
     * @param {string} route 
     * @param {number} count 
     */
    async updateBadges() {
        // Update pending cases badge
        const stats = await DataService.cases.getStats();
        const pendingBadge = document.querySelector(`[data-route="${ROUTES.CASES}"] .nav-badge`);
        if (pendingBadge && stats.new + stats.inspected > 0) {
            pendingBadge.textContent = stats.new + stats.inspected;
            pendingBadge.style.display = 'block';
        }
    }
};

/**
 * ══════════════════════════════════════════════════════════════════════════
 * AVA - Navbar Component
 * Top navigation bar with user info
 * ══════════════════════════════════════════════════════════════════════════
 */

const Navbar = {
    /**
     * Render the navbar
     * @param {string} title 
     * @returns {string}
     */
    render(title = 'Dashboard') {
        const user = AuthService.getCurrentUserSync();

        return `
            <header class="navbar">
                <div class="navbar-left">
                    <button class="btn btn-ghost btn-icon mobile-menu-btn" onclick="Sidebar.toggleMobile()">
                        ${Icons.menu}
                    </button>
                    <h1 class="navbar-title">${Helpers.escapeHtml(title)}</h1>
                </div>
                <div class="navbar-right">
                    <div class="navbar-user" onclick="App.navigate('${ROUTES.ACCOUNT}')" style="cursor:pointer" title="ตั้งค่าบัญชี">
                        <div class="navbar-user-info">
                            <div class="navbar-user-name">${Helpers.escapeHtml(user?.fullName || '')}</div>
                            <div class="navbar-user-role">${ROLE_NAMES[user?.role] || ''}</div>
                        </div>
                        <div class="avatar" id="navbarAvatar"></div>
                    </div>
                </div>
            </header>
        `;
    },

    /**
     * After render - load user avatar
     */
    async loadAvatar() {
        const user = await AuthService.getCurrentUser();
        const avatarEl = document.getElementById('navbarAvatar');
        if (avatarEl && user) {
            if (user.avatarImage) {
                avatarEl.style.backgroundImage = `url(${user.avatarImage})`;
                avatarEl.style.backgroundSize = 'cover';
                avatarEl.style.backgroundPosition = 'center';
                avatarEl.textContent = '';
            } else if (user.avatarEmoji) {
                avatarEl.style.backgroundImage = 'none';
                avatarEl.style.fontSize = '1.5rem';
                avatarEl.style.background = 'none';
                avatarEl.textContent = user.avatarEmoji;
            } else {
                avatarEl.style.backgroundImage = 'none';
                avatarEl.textContent = Helpers.getInitials(user.fullName);
            }
        }
    }
};
