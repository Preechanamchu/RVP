/**
 * ══════════════════════════════════════════════════════════════════════════
 * AVA - Login Page
 * User authentication with form validation
 * ══════════════════════════════════════════════════════════════════════════
 */

const LoginPage = {
    /**
     * Render the login page
     * @returns {string}
     */
    render() {
        return `
            <div class="login-container">
                <div class="login-card">
                    <div class="login-header">
                        <img src="LOGO.png" alt="AVA Logo">
                        <h1>เข้าสู่ระบบ</h1>
                        <p>Accident Verification Authority</p>
                    </div>
                    
                    <form id="loginForm" onsubmit="LoginPage.handleSubmit(event)">
                        <div class="form-group">
                            <label for="username">ชื่อผู้ใช้</label>
                            <input type="text" id="username" name="username" 
                                   placeholder="กรอกชื่อผู้ใช้" required autocomplete="username">
                        </div>
                        
                        <div class="form-group">
                            <label for="password">รหัสผ่าน</label>
                            <input type="password" id="password" name="password" 
                                   placeholder="กรอกรหัสผ่าน" required autocomplete="current-password">
                        </div>
                        
                        <button type="submit" class="btn btn-primary" style="width: 100%; margin-top: var(--space-4);">
                            เข้าสู่ระบบ
                        </button>
                    </form>
                    
                    <div style="margin-top: var(--space-6); padding-top: var(--space-4); border-top: 1px solid var(--neutral-200);">
                        <p style="font-size: var(--font-size-sm); color: var(--neutral-500); margin-bottom: var(--space-2);">
                            <strong>บัญชีทดสอบ:</strong>
                        </p>
                        <div style="font-size: var(--font-size-xs); color: var(--neutral-500); line-height: 1.8;">
                            <div>• Super Admin: <code>superadmin</code> / <code>admin123</code></div>
                            <div>• Admin: <code>admin1</code> / <code>admin123</code></div>
                            <div>• Inspector: <code>inspector1</code> / <code>admin123</code></div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    },

    /**
     * Handle login form submission
     * @param {Event} event 
     */
    async handleSubmit(event) {
        event.preventDefault();

        const form = event.target;
        const username = form.username.value.trim();
        const password = form.password.value;

        if (!username || !password) {
            Toast.error('กรุณากรอกชื่อผู้ใช้และรหัสผ่าน');
            return;
        }

        try {
            const submitBtn = form.querySelector('button[type="submit"]');
            submitBtn.disabled = true;
            submitBtn.innerHTML = '<span class="spinner"></span> กำลังเข้าสู่ระบบ...';

            await AuthService.login(username, password);
            Toast.success('เข้าสู่ระบบสำเร็จ');
            App.navigate(ROUTES.DASHBOARD);
        } catch (error) {
            Toast.error(error.message);
        } finally {
            const submitBtn = form.querySelector('button[type="submit"]');
            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.innerHTML = 'เข้าสู่ระบบ';
            }
        }
    }
};
