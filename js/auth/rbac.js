/**
 * ══════════════════════════════════════════════════════════════════════════
 * AVA - Role-Based Access Control (RBAC)
 * Provides UI rendering helpers based on user roles
 * ══════════════════════════════════════════════════════════════════════════
 */

const RBAC = {
    /**
     * Get current user's role
     * @returns {string|null}
     */
    getRole() {
        const session = AuthService.getSession();
        return session?.role || null;
    },

    /**
     * Check if current user is Super Admin
     * @returns {boolean}
     */
    isSuperAdmin() {
        return this.getRole() === ROLES.SUPER_ADMIN;
    },

    /**
     * Check if current user is Admin (includes Super Admin)
     * @returns {boolean}
     */
    isAdmin() {
        const role = this.getRole();
        return role === ROLES.SUPER_ADMIN || role === ROLES.ADMIN;
    },

    /**
     * Check if current user is Inspector
     * @returns {boolean}
     */
    isInspector() {
        return this.getRole() === ROLES.INSPECTOR;
    },

    /**
     * Get sidebar menu items based on role
     * @returns {Array}
     */
    getSidebarMenu() {
        const role = this.getRole();
        const baseMenu = [
            {
                section: 'หน้าหลัก',
                items: [
                    { id: ROUTES.DASHBOARD, icon: 'dashboard', label: 'Dashboard', roles: [ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.INSPECTOR] }
                ]
            },
            {
                section: 'งานตรวจสอบ',
                items: [
                    { id: ROUTES.CASES, icon: 'folder', label: 'รายการเคส', roles: [ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.INSPECTOR] },

                    { id: ROUTES.CASE_CREATE, icon: 'add', label: 'สร้างเคสใหม่', roles: [ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.INSPECTOR] },
                    { id: ROUTES.CASE_DRAFTS, icon: 'save', label: 'บันทึกฉบับร่าง', roles: [ROLES.INSPECTOR] }
                ]
            },
            {
                section: 'รายงาน',
                items: [
                    { id: ROUTES.REPORTS_ANALYTICS, icon: 'analytics', label: 'วิเคราะห์ข้อมูล', roles: [ROLES.SUPER_ADMIN] },
                    { id: ROUTES.REPORTS_MONTHLY, icon: 'calendar', label: 'สรุปรายเดือน', roles: [ROLES.SUPER_ADMIN] },

                ]
            },
            {
                section: 'ผู้ดูแลระบบ',
                items: [
                    { id: ROUTES.USERS, icon: 'users', label: 'จัดการผู้ใช้', roles: [ROLES.SUPER_ADMIN] },
                    { id: ROUTES.SETTINGS, icon: 'settings', label: 'ตั้งค่าระบบ', roles: [ROLES.SUPER_ADMIN] },
                    { id: ROUTES.AUDIT_LOGS, icon: 'log', label: 'Audit Log', roles: [ROLES.SUPER_ADMIN] }
                ]
            }
        ];

        // Filter menu based on role
        return baseMenu.map(section => ({
            ...section,
            items: section.items.filter(item => item.roles.includes(role))
        })).filter(section => section.items.length > 0);
    },

    /**
     * Get dashboard stats to show based on role
     * @returns {Array}
     */
    getDashboardStats() {
        const role = this.getRole();

        if (role === ROLES.INSPECTOR) {
            return ['myTasks', 'myPending', 'myCompleted'];
        }

        return ['todayNew', 'pending', 'approved', 'totalAmount'];
    },

    /**
     * Check if user can perform action on a case
     * @param {string} action 
     * @param {object} caseData 
     * @returns {boolean}
     */
    canPerformCaseAction(action, caseData) {
        const role = this.getRole();
        const userId = AuthService.getSession()?.userId;

        switch (action) {
            case 'view':
                if (role === ROLES.INSPECTOR) {
                    return caseData.inspectorId === userId;
                }
                return true;

            case 'inspect':
                return role === ROLES.INSPECTOR &&
                    caseData.inspectorId === userId &&
                    (caseData.status === CASE_STATUS.NEW || caseData.status === CASE_STATUS.PENDING_REVISION);

            case 'approve':
            case 'reject':
            case 'return':
                // Allow Admin/SuperAdmin to approve/reject cases in these statuses
                const allowedStatuses = [
                    CASE_STATUS.INSPECTED,
                    CASE_STATUS.PENDING_CONSIDERATION,
                    CASE_STATUS.DATA_VERIFICATION
                ];
                return (role === ROLES.SUPER_ADMIN || role === ROLES.ADMIN) &&
                    allowedStatuses.includes(caseData.status);

            case 'edit':
                return role === ROLES.SUPER_ADMIN || role === ROLES.ADMIN;

            case 'delete':
                return role === ROLES.SUPER_ADMIN;

            default:
                return false;
        }
    },

    /**
     * Get visible case statuses based on role
     * @returns {Array}
     */
    getVisibleStatuses() {
        const role = this.getRole();

        if (role === ROLES.INSPECTOR) {
            return [CASE_STATUS.NEW, CASE_STATUS.PENDING_REVISION, CASE_STATUS.INSPECTED];
        }

        return Object.values(CASE_STATUS);
    }
};
