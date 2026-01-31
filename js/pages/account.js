/**
 * ══════════════════════════════════════════════════════════════════════════
 * AVA - Account Settings Page
 * User profile, password change, and avatar selection
 * ══════════════════════════════════════════════════════════════════════════
 */

// 50 3D Emoji options for avatars
const AVATAR_EMOJIS = [
    '😀', '😎', '🤓', '😊', '🙂', '😁', '😄', '🤗', '🥳', '😇',
    '🧑‍💼', '👨‍💼', '👩‍💼', '🧑‍⚕️', '👨‍⚕️', '👩‍⚕️', '🧑‍🔬', '👨‍🔬', '👩‍🔬', '🧑‍💻',
    '👨‍💻', '👩‍💻', '🦸', '🦸‍♂️', '🦸‍♀️', '🧙', '🧙‍♂️', '🧙‍♀️', '🤴', '👸',
    '🐶', '🐱', '🦊', '🐼', '🐨', '🦁', '🐯', '🐻', '🐸', '🐵',
    '🌟', '⭐', '🔥', '💎', '🎯', '🚀', '💼', '🏆', '🎖️', '👑'
];

const AccountPage = {
    async render() {
        const user = await AuthService.getCurrentUser();
        if (!user) {
            App.navigate(ROUTES.LOGIN);
            return '';
        }

        return `


            <div class="grid grid-2">
                <!-- Profile Section -->
                <div class="card">
                    <div class="card-header">
                        <h3 style="margin:0">ข้อมูลส่วนตัว</h3>
                    </div>
                    <div class="card-body">
                        <div style="text-align:center; margin-bottom: var(--space-6);">
                            <div class="avatar avatar-lg" id="currentAvatar" style="margin: 0 auto var(--space-3); width:100px; height:100px; font-size:${user.avatarEmoji ? '3.5rem' : '2.5rem'}; ${user.avatarEmoji ? 'background:none' : ''}; ${user.avatarImage ? `background-image:url(${user.avatarImage});background-size:cover;background-position:center;` : ''}">
                                ${user.avatarImage ? '' : (user.avatarEmoji || Helpers.getInitials(user.fullName))}
                            </div>
                            <div style="display:flex;gap:var(--space-2);justify-content:center;flex-wrap:wrap">
                                <button class="btn btn-outline btn-sm" onclick="AccountPage.showEmojiPicker()" style="width:160px;justify-content:center">
                                    🎨 เลือก Emoji
                                </button>
                                <label class="btn btn-outline btn-sm" style="cursor:pointer;width:160px;justify-content:center">
                                    📷 อัปโหลดรูป
                                    <input type="file" accept="image/*" style="display:none" onchange="AccountPage.uploadProfileImage(event)">
                                </label>
                            </div>
                        </div>

                        <form id="profileForm" onsubmit="AccountPage.updateProfile(event)">
                            <div class="form-group">
                                <label>ชื่อผู้ใช้</label>
                                <input type="text" value="${Helpers.escapeHtml(user.username)}" disabled>
                            </div>
                            <div class="form-group">
                                <label>ชื่อ-นามสกุล</label>
                                <input type="text" name="fullName" value="${Helpers.escapeHtml(user.fullName)}" required>
                            </div>
                            <div class="form-group">
                                <label>อีเมล</label>
                                <input type="email" name="email" value="${Helpers.escapeHtml(user.email || '')}" placeholder="email@example.com">
                            </div>
                            <div class="form-group">
                                <label>เบอร์โทรศัพท์</label>
                                <input type="tel" name="phone" value="${Helpers.escapeHtml(user.phone || '')}" placeholder="0XX-XXX-XXXX">
                            </div>
                            <button type="submit" class="btn btn-primary" style="width:100%">บันทึกข้อมูล</button>
                        </form>
                    </div>
                </div>

                <!-- Password Section -->
                <div class="card">
                    <div class="card-header">
                        <h3 style="margin:0">เปลี่ยนรหัสผ่าน</h3>
                    </div>
                    <div class="card-body">
                        <form id="passwordForm" onsubmit="AccountPage.changePassword(event)">
                            <div class="form-group">
                                <label>รหัสผ่านปัจจุบัน *</label>
                                <input type="password" name="currentPassword" required placeholder="••••••••">
                            </div>
                            <div class="form-group">
                                <label>รหัสผ่านใหม่ *</label>
                                <input type="password" name="newPassword" required placeholder="••••••••" minlength="6">
                                <div class="form-hint">ต้องมีอย่างน้อย 6 ตัวอักษร</div>
                            </div>
                            <div class="form-group">
                                <label>ยืนยันรหัสผ่านใหม่ *</label>
                                <input type="password" name="confirmPassword" required placeholder="••••••••">
                            </div>
                            <button type="submit" class="btn btn-secondary" style="width:100%">เปลี่ยนรหัสผ่าน</button>
                        </form>
                    </div>
                </div>
            </div>

            <!-- Account Info -->
            <div class="card" style="margin-top: var(--space-4);">
                <div class="card-body">
                    <div style="display:flex; justify-content:space-between; flex-wrap:wrap; gap:var(--space-4)">
                        <div>
                            <p style="color:var(--neutral-500); font-size:var(--font-size-sm); margin:0">บทบาท</p>
                            <p style="font-weight:var(--font-weight-semibold); margin:0">${ROLE_NAMES[user.role]}</p>
                        </div>
                        <div>
                            <p style="color:var(--neutral-500); font-size:var(--font-size-sm); margin:0">เข้าสู่ระบบล่าสุด</p>
                            <p style="font-weight:var(--font-weight-semibold); margin:0">${user.lastLogin ? Helpers.formatDateTime(user.lastLogin) : 'ไม่มีข้อมูล'}</p>
                        </div>
                        <div>
                            <p style="color:var(--neutral-500); font-size:var(--font-size-sm); margin:0">สร้างบัญชีเมื่อ</p>
                            <p style="font-weight:var(--font-weight-semibold); margin:0">${Helpers.formatDate(user.createdAt)}</p>
                        </div>
                    </div>
                </div>
            </div>
        `;
    },

    showEmojiPicker() {
        const emojiGrid = AVATAR_EMOJIS.map(emoji =>
            `<button type="button" class="emoji-pick-btn" onclick="AccountPage.selectEmoji('${emoji}')" style="
                font-size: 2rem; 
                padding: var(--space-2); 
                border: 2px solid transparent; 
                border-radius: var(--radius-lg); 
                background: var(--neutral-50); 
                cursor: pointer;
                transition: all var(--transition-fast);
            " onmouseover="this.style.borderColor='var(--primary-500)'; this.style.transform='scale(1.1)'" 
               onmouseout="this.style.borderColor='transparent'; this.style.transform='scale(1)'">${emoji}</button>`
        ).join('');

        Modal.show({
            title: 'เลือก Emoji โปรไฟล์',
            content: `
                <div style="display: grid; grid-template-columns: repeat(10, 1fr); gap: var(--space-2); max-height: 300px; overflow-y: auto;">
                    ${emojiGrid}
                </div>
                <div style="margin-top: var(--space-4); text-align: center;">
                    <button class="btn btn-ghost" onclick="AccountPage.removeEmoji()">ใช้ตัวอักษรแทน</button>
                </div>
            `,
            size: 'lg'
        });
    },

    async selectEmoji(emoji) {
        const user = await AuthService.getCurrentUser();
        await DataService.users.update(user.id, { avatarEmoji: emoji });
        Modal.closeAll();
        Toast.success('เปลี่ยนรูปโปรไฟล์แล้ว');
        App.refreshPage();
    },

    async removeEmoji() {
        const user = await AuthService.getCurrentUser();
        await DataService.users.update(user.id, { avatarEmoji: null, avatarImage: null });
        Modal.closeAll();
        Toast.success('เปลี่ยนเป็นตัวอักษรแล้ว');
        App.refreshPage();
    },

    async uploadProfileImage(event) {
        const file = event.target.files[0];
        if (!file) return;

        if (!file.type.startsWith('image/')) {
            Toast.error('กรุณาเลือกไฟล์รูปภาพ');
            return;
        }

        try {
            const dataUrl = await Helpers.fileToDataUrl(file);

            // Instant preview - update account page avatar
            const avatarEl = document.getElementById('currentAvatar');
            if (avatarEl) {
                avatarEl.style.backgroundImage = `url(${dataUrl})`;
                avatarEl.style.backgroundSize = 'cover';
                avatarEl.style.backgroundPosition = 'center';
                avatarEl.textContent = '';
            }

            // Instant preview - update navbar avatar (top right icon)
            const navbarAvatarEl = document.getElementById('navbarAvatar');
            if (navbarAvatarEl) {
                navbarAvatarEl.style.backgroundImage = `url(${dataUrl})`;
                navbarAvatarEl.style.backgroundSize = 'cover';
                navbarAvatarEl.style.backgroundPosition = 'center';
                navbarAvatarEl.textContent = '';
            }

            const user = await AuthService.getCurrentUser();
            await DataService.users.update(user.id, {
                avatarImage: dataUrl,
                avatarEmoji: null
            });
            Toast.success('อัปโหลดรูปโปรไฟล์สำเร็จ');
        } catch (error) {
            Toast.error('เกิดข้อผิดพลาด: ' + error.message);
        }
    },

    async updateProfile(event) {
        event.preventDefault();
        const form = event.target;
        const user = await AuthService.getCurrentUser();

        try {
            await DataService.users.update(user.id, {
                fullName: form.fullName.value,
                email: form.email.value,
                phone: form.phone.value
            });

            // Update session
            const session = AuthService.getSession();
            session.fullName = form.fullName.value;
            localStorage.setItem(CONFIG.SESSION_KEY, JSON.stringify(session));

            Toast.success('บันทึกข้อมูลสำเร็จ');
            App.refreshPage();
        } catch (error) {
            Toast.error('เกิดข้อผิดพลาด: ' + error.message);
        }
    },

    async changePassword(event) {
        event.preventDefault();
        const form = event.target;
        const user = await AuthService.getCurrentUser();

        const currentPassword = form.currentPassword.value;
        const newPassword = form.newPassword.value;
        const confirmPassword = form.confirmPassword.value;

        if (newPassword !== confirmPassword) {
            Toast.error('รหัสผ่านใหม่ไม่ตรงกัน');
            return;
        }

        if (newPassword.length < 6) {
            Toast.error('รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร');
            return;
        }

        try {
            // Verify current password
            const isValid = await Helpers.verifyPassword(currentPassword, user.passwordHash);
            if (!isValid) {
                Toast.error('รหัสผ่านปัจจุบันไม่ถูกต้อง');
                return;
            }

            // Update password
            const newHash = await Helpers.hashPassword(newPassword);
            await DataService.users.update(user.id, { passwordHash: newHash });

            Toast.success('เปลี่ยนรหัสผ่านสำเร็จ');
            form.reset();
        } catch (error) {
            Toast.error('เกิดข้อผิดพลาด: ' + error.message);
        }
    }
};
