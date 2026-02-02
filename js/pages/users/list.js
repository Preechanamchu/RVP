/**
 * ══════════════════════════════════════════════════════════════════════════
 * AVA - User Management Page
 * Super Admin only - Manage system users
 * ══════════════════════════════════════════════════════════════════════════
 */

const UsersPage = {
    async render() {
        if (!AuthService.hasPermission('manageUsers')) {
            Toast.error('ไม่มีสิทธิ์เข้าถึง');
            App.navigate(ROUTES.DASHBOARD);
            return '';
        }

        const users = await DataService.users.getAll();

        return `


            <div class="card">
                <div class="card-header" style="display:flex;justify-content:space-between;align-items:center">
                    <h3 style="margin:0">👤 จัดการผู้ใช้ (${users.length})</h3>
                    <button class="btn btn-primary btn-sm" onclick="UsersPage.showCreateModal()">
                        ${Icons.add} เพิ่มผู้ใช้
                    </button>
                </div>
                <table class="data-table">
                    <thead>
                        <tr>
                            <th>ชื่อผู้ใช้</th>
                            <th>ชื่อ-นามสกุล</th>
                            <th>บทบาท</th>
                            <th>สถานะ</th>
                            <th>เข้าสู่ระบบล่าสุด</th>
                            <th></th>
                        </tr>
                    </thead>
                    <tbody>
                        ${users.map(u => `
                            <tr>
                                <td>
                                    <div style="display:flex;align-items:center;gap:var(--space-3)">
                                        <div class="avatar avatar-sm" style="${u.avatarEmoji ? 'font-size:1.5rem;background:none' : ''}">${u.avatarEmoji || Helpers.getInitials(u.fullName)}</div>
                                        <code>${Helpers.escapeHtml(u.username)}</code>
                                    </div>
                                </td>
                                <td>${Helpers.escapeHtml(u.fullName)}</td>
                                <td><span class="badge badge-new">${ROLE_NAMES[u.role] || u.role}</span></td>
                                <td>
                                    <span class="badge ${u.isActive ? 'badge-approved' : 'badge-rejected'}">
                                        ${u.isActive ? 'ใช้งาน' : 'ระงับ'}
                                    </span>
                                </td>
                                <td>${u.lastLogin ? Helpers.formatRelativeTime(u.lastLogin) : 'ไม่เคย'}</td>
                                <td>
                                    <div style="display:flex;gap:var(--space-1)">
                                        <button class="btn btn-ghost btn-sm" onclick="UsersPage.showEditModal('${u.id}')">${Icons.edit}</button>
                                        <button class="btn btn-ghost btn-sm" style="color:var(--danger-500)" onclick="UsersPage.deleteUser('${u.id}', '${Helpers.escapeHtml(u.username)}')">${Icons.trash}</button>
                                    </div>
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        `;
    },

    showCreateModal() {
        Modal.show({
            title: 'เพิ่มผู้ใช้ใหม่',
            content: `
                <form id="createUserForm">
                    <div class="form-group">
                        <label>ชื่อผู้ใช้ *</label>
                        <input type="text" name="username" required placeholder="username">
                    </div>
                    <div class="form-group">
                        <label>รหัสผ่าน *</label>
                        <input type="password" name="password" required placeholder="รหัสผ่าน">
                    </div>
                    <div class="form-group">
                        <label>ชื่อ-นามสกุล *</label>
                        <input type="text" name="fullName" required placeholder="ชื่อ นามสกุล">
                    </div>
                    <div class="form-group">
                        <label>บทบาท *</label>
                        <select name="role" required>
                            <option value="${ROLES.INSPECTOR}">พนักงานออกตรวจ</option>
                            <option value="${ROLES.ADMIN}">Admin พิจารณาเคส</option>
                            <option value="${ROLES.SUPER_ADMIN}">Super Admin</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label>อีเมล</label>
                        <input type="email" name="email" placeholder="email@example.com">
                    </div>
                    <div class="form-group">
                        <label>เบอร์โทร</label>
                        <input type="tel" name="phone" placeholder="0XX-XXX-XXXX">
                    </div>
                </form>
            `,
            footer: `
                <button class="btn btn-ghost" onclick="Modal.closeAll()">ยกเลิก</button>
                <button class="btn btn-primary" onclick="UsersPage.createUser()">บันทึก</button>
            `,
            size: 'md'
        });
    },

    async createUser() {
        const form = document.getElementById('createUserForm');
        try {
            const passwordHash = await Helpers.hashPassword(form.password.value);
            await DataService.users.create({
                username: form.username.value,
                passwordHash,
                fullName: form.fullName.value,
                role: form.role.value,
                email: form.email.value,
                phone: form.phone.value,
                isActive: true
            });
            Modal.closeAll();
            Toast.success('เพิ่มผู้ใช้สำเร็จ');
            App.refreshPage();
        } catch (error) {
            Toast.error('เกิดข้อผิดพลาด: ' + error.message);
        }
    },

    async showEditModal(userId) {
        const user = await DataService.users.getById(userId);
        if (!user) return;

        Modal.show({
            title: 'แก้ไขผู้ใช้',
            content: `
                <form id="editUserForm">
                    <input type="hidden" name="userId" value="${user.id}">
                    <div class="form-group">
                        <label>ชื่อผู้ใช้</label>
                        <input type="text" value="${Helpers.escapeHtml(user.username)}" disabled>
                    </div>
                    <div class="form-group">
                        <label>ชื่อ-นามสกุล *</label>
                        <input type="text" name="fullName" value="${Helpers.escapeHtml(user.fullName)}" required>
                    </div>
                    <div class="form-group">
                        <label>บทบาท *</label>
                        <select name="role" required>
                            <option value="${ROLES.INSPECTOR}" ${user.role === ROLES.INSPECTOR ? 'selected' : ''}>พนักงานออกตรวจ</option>
                            <option value="${ROLES.ADMIN}" ${user.role === ROLES.ADMIN ? 'selected' : ''}>Admin พิจารณาเคส</option>
                            <option value="${ROLES.SUPER_ADMIN}" ${user.role === ROLES.SUPER_ADMIN ? 'selected' : ''}>Super Admin</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label>สถานะ</label>
                        <select name="isActive">
                            <option value="true" ${user.isActive ? 'selected' : ''}>ใช้งาน</option>
                            <option value="false" ${!user.isActive ? 'selected' : ''}>ระงับ</option>
                        </select>
                    </div>
                </form>
            `,
            footer: `
                <button class="btn btn-ghost" onclick="Modal.closeAll()">ยกเลิก</button>
                <button class="btn btn-primary" onclick="UsersPage.updateUser()">บันทึก</button>
            `
        });
    },

    async updateUser() {
        const form = document.getElementById('editUserForm');
        try {
            await DataService.users.update(form.userId.value, {
                fullName: form.fullName.value,
                role: form.role.value,
                isActive: form.isActive.value === 'true'
            });
            Modal.closeAll();
            Toast.success('บันทึกสำเร็จ');
            App.refreshPage();
        } catch (error) {
            Toast.error('เกิดข้อผิดพลาด: ' + error.message);
        }
    },

    async deleteUser(userId, username) {
        const currentUser = AuthService.getCurrentUserSync();
        if (currentUser.id === userId) {
            Toast.error('ไม่สามารถลบบัญชีตัวเองได้');
            return;
        }

        const confirmed = await Modal.confirm(
            `ยืนยันลบผู้ใช้ "${username}"? การดำเนินการนี้ไม่สามารถยกเลิกได้`,
            { title: 'ลบผู้ใช้', confirmText: 'ลบ', danger: true }
        );
        if (!confirmed) return;

        try {
            await DataService.users.delete(userId);
            Toast.success('ลบผู้ใช้สำเร็จ');
            App.refreshPage();
        } catch (error) {
            Toast.error('เกิดข้อผิดพลาด: ' + error.message);
        }
    }
};
