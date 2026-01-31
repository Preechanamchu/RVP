/**
 * ══════════════════════════════════════════════════════════════════════════
 * AVA - Main Application
 * SPA Router and Application Initialization
 * ══════════════════════════════════════════════════════════════════════════
 */

const App = {
    currentRoute: null,
    currentParams: null,

    /**
     * Initialize the application
     */
    async init() {
        try {
            // Initialize database
            await db.init();

            // Initialize demo data
            await DataService.initDemoData();

            // Check authentication and route
            if (AuthService.isLoggedIn()) {
                this.navigate(ROUTES.DASHBOARD);
            } else {
                this.navigate(ROUTES.LOGIN);
            }
        } catch (error) {
            console.error('App initialization failed:', error);
            document.getElementById('app').innerHTML = `
                <div class="login-container">
                    <div class="login-card">
                        <h2 style="color: var(--danger-500)">เกิดข้อผิดพลาด</h2>
                        <p>ไม่สามารถเริ่มต้นระบบได้ กรุณารีเฟรชหน้า</p>
                        <button class="btn btn-primary" onclick="location.reload()">รีเฟรช</button>
                    </div>
                </div>
            `;
        }
    },

    /**
     * Navigate to a route
     * @param {string} route 
     * @param {string} params 
     */
    async navigate(route, params = null) {
        this.currentRoute = route;
        this.currentParams = params;

        const app = document.getElementById('app');

        // Show loading
        app.innerHTML = '<div class="loading-overlay"><div class="spinner"></div><p>กำลังโหลด...</p></div>';

        try {
            let content = '';
            let pageTitle = CONFIG.APP_NAME;
            let needsLayout = true;
            let afterRender = null;

            switch (route) {
                case ROUTES.LOGIN:
                    content = LoginPage.render();
                    pageTitle = 'เข้าสู่ระบบ';
                    needsLayout = false;
                    break;

                case ROUTES.DASHBOARD:
                    if (!AuthService.requireAuth()) return;
                    content = await DashboardPage.render();
                    pageTitle = 'Dashboard';
                    if (typeof DashboardPage.afterRender === 'function') {
                        afterRender = () => DashboardPage.afterRender();
                    }
                    break;

                case ROUTES.CASES:
                    if (!AuthService.requireAuth()) return;
                    content = await CaseListPage.render();
                    pageTitle = 'รายการเคส';
                    break;

                case ROUTES.CASE_CREATE:
                    if (!AuthService.requirePermission('createCase')) return;
                    content = await CaseCreatePage.render(params);
                    pageTitle = 'สร้างเคสใหม่';
                    afterRender = () => CaseCreatePage.afterRender();
                    break;

                case ROUTES.CASE_DETAIL:
                    if (!AuthService.requireAuth()) return;
                    content = await CaseDetailPage.render(params);
                    pageTitle = 'รายละเอียดเคส';
                    break;

                case ROUTES.CASE_INSPECT:
                    if (!AuthService.requireAuth()) return;
                    content = await CaseInspectPage.render(params);
                    pageTitle = 'ตรวจสอบเคส';
                    afterRender = () => CaseInspectPage.afterRender();
                    break;

                case ROUTES.CASE_REVIEW:
                    if (!AuthService.requirePermission('approveCase')) return;
                    content = await CaseReviewPage.render(params);
                    pageTitle = 'พิจารณาเคส';
                    break;

                case ROUTES.CASE_DRAFTS:
                    if (!AuthService.requireAuth()) return; // Assuming basic auth needed, specific role check in menu
                    content = await CaseDraftsPage.render();
                    pageTitle = 'บันทึกฉบับร่าง';
                    break;

                case ROUTES.USERS:
                    if (!AuthService.requirePermission('manageUsers')) return;
                    content = await UsersPage.render();
                    pageTitle = 'จัดการผู้ใช้';
                    break;

                case ROUTES.REPORTS_ANALYTICS:
                    if (!AuthService.requirePermission('viewAnalytics')) return;
                    content = await AnalyticsPage.render();
                    pageTitle = 'วิเคราะห์ข้อมูล';
                    break;

                case ROUTES.REPORTS_MONTHLY:
                    if (!AuthService.requirePermission('viewAnalytics')) return;
                    content = await MonthlyReportPage.render();
                    pageTitle = 'สรุปรายเดือน';
                    if (typeof MonthlyReportPage.afterRender === 'function') {
                        afterRender = () => MonthlyReportPage.afterRender();
                    }
                    break;

                case ROUTES.AUDIT_LOGS:
                    if (!AuthService.requirePermission('viewAuditLogs')) return;
                    content = await AuditLogsPage.render();
                    pageTitle = 'Audit Log';
                    break;

                case ROUTES.ACCOUNT:
                    if (!AuthService.requireAuth()) return;
                    content = await AccountPage.render();
                    pageTitle = 'ตั้งค่าบัญชี';
                    break;



                case ROUTES.SETTINGS:
                    if (!RBAC.isSuperAdmin()) {
                        App.navigate(ROUTES.DASHBOARD);
                        return;
                    }
                    content = await SystemSettingsPage.render();
                    pageTitle = 'ตั้งค่าระบบ';
                    break;

                default:
                    content = '<div class="empty-state"><h4>404 - ไม่พบหน้าที่ต้องการ</h4></div>';
            }

            // Update page title
            document.title = `${pageTitle} | ${CONFIG.APP_FULL_NAME}`;

            // Render with or without layout
            if (needsLayout) {
                app.innerHTML = `
                    ${Sidebar.render()}
                    <main class="main-content">
                        ${Navbar.render(pageTitle)}
                        <div class="page-content">
                            ${content}
                        </div>
                    </main>
                `;
                Sidebar.updateActive(route);
                Navbar.loadAvatar();
            } else {
                app.innerHTML = content;
            }

            // Call afterRender if exists
            if (afterRender) afterRender();

        } catch (error) {
            console.error('Navigation error:', error);
            app.innerHTML = `
                <div class="login-container">
                    <div class="login-card">
                        <h2 style="color: var(--danger-500)">เกิดข้อผิดพลาด</h2>
                        <p>${Helpers.escapeHtml(error.message)}</p>
                        <button class="btn btn-primary" onclick="App.navigate('${ROUTES.DASHBOARD}')">กลับหน้าหลัก</button>
                    </div>
                </div>
            `;
        }
    },

    /**
     * Refresh current page
     */
    async refreshPage() {
        await this.navigate(this.currentRoute, this.currentParams);
    },

    /**
     * Logout user
     */
    async logout() {
        const confirmed = await Modal.confirm('ยืนยันออกจากระบบ?', { title: 'ออกจากระบบ' });
        if (!confirmed) return;

        await AuthService.logout();
        Toast.success('ออกจากระบบสำเร็จ');
        this.navigate(ROUTES.LOGIN);
    }
};

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', () => App.init());
