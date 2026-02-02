/**
 * ══════════════════════════════════════════════════════════════════════════
 * AVA - Authentication Service
 * Handles login, logout, session management, and password hashing
 * ══════════════════════════════════════════════════════════════════════════
 */

const AuthService = {
    /**
     * Login user with username and password
     * @param {string} username 
     * @param {string} password 
     * @returns {Promise<object>} User object if successful
     */
    async login(username, password) {
        const user = await DataService.users.getByUsername(username);

        if (!user) {
            throw new Error('ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง');
        }

        if (!user.isActive) {
            throw new Error('บัญชีผู้ใช้ถูกระงับการใช้งาน');
        }

        const isValid = await Helpers.verifyPassword(password, user.passwordHash);
        if (!isValid) {
            throw new Error('ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง');
        }

        // Update last login
        await db.put('users', { ...user, lastLogin: new Date().toISOString() });

        // Create session
        const session = {
            userId: user.id,
            username: user.username,
            role: user.role,
            fullName: user.fullName,
            loginAt: new Date().toISOString(),
            expiresAt: new Date(Date.now() + CONFIG.SESSION_TIMEOUT).toISOString()
        };

        localStorage.setItem(CONFIG.SESSION_KEY, JSON.stringify(session));

        // Log the login action
        await AuditService.log(AUDIT_ACTIONS.LOGIN, ENTITY_TYPES.USER, user.id);

        return user;
    },

    /**
     * Logout current user
     */
    async logout() {
        const session = this.getSession();
        if (session) {
            await AuditService.log(AUDIT_ACTIONS.LOGOUT, ENTITY_TYPES.USER, session.userId);
        }
        localStorage.removeItem(CONFIG.SESSION_KEY);
    },

    /**
     * Get current session
     * @returns {object|null}
     */
    getSession() {
        const sessionStr = localStorage.getItem(CONFIG.SESSION_KEY);
        if (!sessionStr) return null;

        try {
            const session = JSON.parse(sessionStr);

            // Check if session expired
            if (new Date(session.expiresAt) < new Date()) {
                this.logout();
                return null;
            }

            return session;
        } catch (e) {
            return null;
        }
    },

    /**
     * Check if user is logged in
     * @returns {boolean}
     */
    isLoggedIn() {
        return this.getSession() !== null;
    },

    /**
     * Get current user object
     * @returns {Promise<object|null>}
     */
    async getCurrentUser() {
        const session = this.getSession();
        if (!session) return null;
        return await DataService.users.getById(session.userId);
    },

    /**
     * Get current user synchronously (from session)
     * @returns {object|null}
     */
    getCurrentUserSync() {
        const session = this.getSession();
        if (!session) return null;
        return {
            id: session.userId,
            username: session.username,
            role: session.role,
            fullName: session.fullName
        };
    },

    /**
     * Refresh session timeout
     */
    refreshSession() {
        const session = this.getSession();
        if (session) {
            session.expiresAt = new Date(Date.now() + CONFIG.SESSION_TIMEOUT).toISOString();
            localStorage.setItem(CONFIG.SESSION_KEY, JSON.stringify(session));
        }
    },

    /**
     * Check if current user has permission
     * @param {string} permission 
     * @returns {boolean}
     */
    hasPermission(permission) {
        const session = this.getSession();
        if (!session) return false;
        return PERMISSIONS[session.role]?.[permission] || false;
    },

    /**
     * Require authentication - redirect to login if not authenticated
     * @returns {boolean}
     */
    requireAuth() {
        if (!this.isLoggedIn()) {
            App.navigate(ROUTES.LOGIN);
            return false;
        }
        this.refreshSession();
        return true;
    },

    /**
     * Require specific permission
     * @param {string} permission 
     * @returns {boolean}
     */
    requirePermission(permission) {
        if (!this.requireAuth()) return false;
        if (!this.hasPermission(permission)) {
            Toast.error('คุณไม่มีสิทธิ์เข้าถึงส่วนนี้');
            App.navigate(ROUTES.DASHBOARD);
            return false;
        }
        return true;
    }
};
