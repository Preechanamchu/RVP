/**
 * ══════════════════════════════════════════════════════════════════════════
 * AVA - System Settings Page
 * Manage hospitals and system configuration
 * ══════════════════════════════════════════════════════════════════════════
 */

const SystemSettingsPage = {
    async render() {
        if (!RBAC.isSuperAdmin()) {
            Toast.error('เฉพาะ Super Admin เท่านั้น');
            App.navigate(ROUTES.DASHBOARD);
            return '';
        }

        const hospitals = await DataService.hospitals.getAll();

        return `


            <!-- Hospital Management -->
            <div class="card">
                <div class="card-header" style="display:flex;justify-content:space-between;align-items:center">
                    <h3 style="margin:0">🏥 จัดการโรงพยาบาล</h3>
                    <button class="btn btn-primary btn-sm" onclick="SystemSettingsPage.showAddHospitalModal()">
                        ${Icons.add} เพิ่มโรงพยาบาล
                    </button>
                </div>
                <div class="card-body">
                    <table class="data-table">
                        <thead>
                            <tr>
                                <th>รหัส</th>
                                <th>ชื่อโรงพยาบาล</th>
                                <th>ที่อยู่</th>
                                <th>เบอร์โทร</th>
                                <th>สถานะ</th>
                                <th></th>
                            </tr>
                        </thead>
                        <tbody>
                            ${hospitals.map(h => `
                                <tr>
                                    <td><code>${Helpers.escapeHtml(h.code || '-')}</code></td>
                                    <td><strong>${Helpers.escapeHtml(h.name)}</strong></td>
                                    <td>
                                        <div style="font-size:var(--font-size-sm)">
                                            ${h.subdistrict ? `ต.${Helpers.escapeHtml(h.subdistrict)} ` : ''}
                                            ${h.district ? `อ.${Helpers.escapeHtml(h.district)} ` : ''}
                                            ${h.province ? `จ.${Helpers.escapeHtml(h.province)}` : Helpers.escapeHtml(h.address || '-')}
                                        </div>
                                    </td>
                                    <td>${Helpers.escapeHtml(h.phone || '-')}</td>
                                    <td>
                                        <span class="badge ${h.isActive !== false ? 'badge-approved' : 'badge-rejected'}">
                                            ${h.isActive !== false ? 'ใช้งาน' : 'ปิดใช้งาน'}
                                        </span>
                                    </td>
                                    <td>
                                        <div style="display:flex;gap:var(--space-1)">
                                            <button class="btn btn-ghost btn-sm" onclick="SystemSettingsPage.showEditHospitalModal('${h.id}')">
                                                ${Icons.edit}
                                            </button>
                                            <button class="btn btn-ghost btn-sm" style="color:var(--danger-500)" onclick="SystemSettingsPage.deleteHospital('${h.id}', '${Helpers.escapeHtml(h.name)}')">
                                                ${Icons.trash}
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            `).join('')}
                            ${hospitals.length === 0 ? `
                                <tr>
                                    <td colspan="6" style="text-align:center;padding:var(--space-6);color:var(--neutral-500)">
                                        ยังไม่มีโรงพยาบาลในระบบ
                                    </td>
                                </tr>
                            ` : ''}
                        </tbody>
                    </table>
                </div>
            </div>
        `;
    },

    showAddHospitalModal() {
        Modal.show({
            title: 'เพิ่มโรงพยาบาลใหม่',
            content: `
                <form id="addHospitalForm">
                    <div class="form-group">
                        <label>รหัสโรงพยาบาล *</label>
                        <input type="text" name="code" required placeholder="H001">
                    </div>
                    <div class="form-group">
                        <label>ชื่อโรงพยาบาล *</label>
                        <input type="text" name="name" required placeholder="โรงพยาบาล...">
                    </div>
                    <div class="form-row">
                        <div class="form-group">
                            <label>ตำบล/แขวง</label>
                            <input type="text" name="subdistrict" placeholder="ตำบล/แขวง">
                        </div>
                        <div class="form-group">
                            <label>อำเภอ/เขต</label>
                            <input type="text" name="district" placeholder="อำเภอ/เขต">
                        </div>
                    </div>
                    <div class="form-group">
                        <label>จังหวัด *</label>
                        <input type="text" name="province" required placeholder="จังหวัด">
                    </div>
                    <div class="form-group">
                        <label>เบอร์โทรศัพท์</label>
                        <input type="tel" name="phone" placeholder="0XX-XXX-XXXX">
                    </div>
                </form>
            `,
            footer: `
                <button class="btn btn-ghost" onclick="Modal.closeAll()">ยกเลิก</button>
                <button class="btn btn-primary" onclick="SystemSettingsPage.addHospital()">บันทึก</button>
            `,
            size: 'md'
        });
    },

    async addHospital() {
        const form = document.getElementById('addHospitalForm');
        if (!form.code.value || !form.name.value || !form.province.value) {
            Toast.error('กรุณากรอกข้อมูลที่จำเป็น');
            return;
        }

        try {
            await DataService.hospitals.create({
                code: form.code.value,
                name: form.name.value,
                subdistrict: form.subdistrict.value,
                district: form.district.value,
                province: form.province.value,
                address: `${form.subdistrict.value} ${form.district.value} ${form.province.value}`.trim(),
                phone: form.phone.value,
                isActive: true
            });
            Modal.closeAll();
            Toast.success('เพิ่มโรงพยาบาลสำเร็จ');
            App.refreshPage();
        } catch (error) {
            Toast.error('เกิดข้อผิดพลาด: ' + error.message);
        }
    },

    async showEditHospitalModal(hospitalId) {
        const hospital = await DataService.hospitals.getById(hospitalId);
        if (!hospital) return;

        Modal.show({
            title: 'แก้ไขโรงพยาบาล',
            content: `
                <form id="editHospitalForm">
                    <input type="hidden" name="id" value="${hospital.id}">
                    <div class="form-group">
                        <label>รหัสโรงพยาบาล *</label>
                        <input type="text" name="code" required value="${Helpers.escapeHtml(hospital.code || '')}">
                    </div>
                    <div class="form-group">
                        <label>ชื่อโรงพยาบาล *</label>
                        <input type="text" name="name" required value="${Helpers.escapeHtml(hospital.name)}">
                    </div>
                    <div class="form-row">
                        <div class="form-group">
                            <label>ตำบล/แขวง</label>
                            <input type="text" name="subdistrict" value="${Helpers.escapeHtml(hospital.subdistrict || '')}">
                        </div>
                        <div class="form-group">
                            <label>อำเภอ/เขต</label>
                            <input type="text" name="district" value="${Helpers.escapeHtml(hospital.district || '')}">
                        </div>
                    </div>
                    <div class="form-group">
                        <label>จังหวัด *</label>
                        <input type="text" name="province" required value="${Helpers.escapeHtml(hospital.province || hospital.address || '')}">
                    </div>
                    <div class="form-group">
                        <label>เบอร์โทรศัพท์</label>
                        <input type="tel" name="phone" value="${Helpers.escapeHtml(hospital.phone || '')}">
                    </div>
                    <div class="form-group">
                        <label>สถานะ</label>
                        <select name="isActive">
                            <option value="true" ${hospital.isActive !== false ? 'selected' : ''}>ใช้งาน</option>
                            <option value="false" ${hospital.isActive === false ? 'selected' : ''}>ปิดใช้งาน</option>
                        </select>
                    </div>
                </form>
            `,
            footer: `
                <button class="btn btn-ghost" onclick="Modal.closeAll()">ยกเลิก</button>
                <button class="btn btn-primary" onclick="SystemSettingsPage.updateHospital()">บันทึก</button>
            `,
            size: 'md'
        });
    },

    async updateHospital() {
        const form = document.getElementById('editHospitalForm');
        try {
            await DataService.hospitals.update(form.id.value, {
                code: form.code.value,
                name: form.name.value,
                subdistrict: form.subdistrict.value,
                district: form.district.value,
                province: form.province.value,
                address: `${form.subdistrict.value} ${form.district.value} ${form.province.value}`.trim(),
                phone: form.phone.value,
                isActive: form.isActive.value === 'true'
            });
            Modal.closeAll();
            Toast.success('บันทึกสำเร็จ');
            App.refreshPage();
        } catch (error) {
            Toast.error('เกิดข้อผิดพลาด: ' + error.message);
        }
    },

    async deleteHospital(hospitalId, hospitalName) {
        const confirmed = await Modal.confirm(
            `ยืนยันลบโรงพยาบาล "${hospitalName}"? การดำเนินการนี้ไม่สามารถยกเลิกได้`,
            { title: 'ลบโรงพยาบาล', confirmText: 'ลบ', danger: true }
        );
        if (!confirmed) return;

        try {
            await DataService.hospitals.delete(hospitalId);
            Toast.success('ลบโรงพยาบาลสำเร็จ');
            App.refreshPage();
        } catch (error) {
            Toast.error('เกิดข้อผิดพลาด: ' + error.message);
        }
    }
};
