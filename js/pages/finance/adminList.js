/**
 * ══════════════════════════════════════════════════════════════════════════
 * AVA - Finance Admin List Page
 * Management of staff salaries, payments, and activity summary for Super Admins
 * ══════════════════════════════════════════════════════════════════════════
 */

const FinanceAdminListPage = {
    data: [],
    caseCounts: {},
    users: [],
    currentMonth: new Date().getMonth() + 1,
    currentYear: new Date().getFullYear(),

    async render() {
        // Fetch all necessary data
        this.caseCounts = await DataService.cases.getStaffCaseCounts();
        this.users = await DataService.users.getByRole(ROLES.INSPECTOR);
        this.data = await DataService.finance.getByMonthAndYear(this.currentMonth, this.currentYear);

        const summary = this.calculateSummary();

        return `
            <style>
                .finance-container { padding: 24px; animation: fadeIn 0.3s ease-out; }
                .finance-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; }
                .finance-title h1 { margin: 0; font-size: 24px; color: var(--text-primary); }
                .finance-title p { margin: 4px 0 0; color: var(--text-secondary); font-size: 14px; }

                .stats-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 20px; margin-bottom: 24px; }
                .stat-card { background: white; padding: 20px; border-radius: 12px; box-shadow: 0 2px 10px rgba(0,0,0,0.05); }
                .stat-label { font-size: 13px; color: var(--text-secondary); margin-bottom: 8px; }
                .stat-value { font-size: 24px; font-weight: 700; color: var(--primary-color); }

                .filter-card { background: white; padding: 20px; border-radius: 12px; margin-bottom: 24px; display: flex; gap: 16px; align-items: flex-end; }
                .filter-group { display: flex; flex-direction: column; gap: 8px; }
                .filter-group label { font-size: 12px; font-weight: 600; color: var(--text-secondary); }
                .filter-group select { padding: 8px 12px; border: 1px solid #ddd; border-radius: 6px; min-width: 150px; }

                .data-card { background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 2px 10px rgba(0,0,0,0.05); }
                .card-header { padding: 16px 20px; border-bottom: 1px solid #eee; display: flex; justify-content: space-between; align-items: center; }
                .card-header h2 { margin: 0; font-size: 16px; }

                .table-scroll { overflow-x: auto; }
                table { width: 100%; border-collapse: collapse; }
                th { text-align: left; padding: 12px 20px; background: #f8f9fa; font-size: 12px; font-weight: 600; color: var(--text-secondary); text-transform: uppercase; }
                td { padding: 14px 20px; border-bottom: 1px solid #eee; font-size: 14px; }
                tr:last-child td { border-bottom: none; }

                .user-info { display: flex; align-items: center; gap: 12px; }
                .user-avatar { width: 32px; height: 32px; background: #e3f2fd; color: #1976d2; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: 600; font-size: 12px; }
                
                .badge { padding: 4px 8px; border-radius: 4px; font-size: 11px; font-weight: 600; }
                .badge-pending { background: #fff3e0; color: #ef6c00; }
                .badge-paid { background: #e8f5e9; color: #2e7d32; }

                .btn-sm { padding: 6px 10px; font-size: 12px; }
                
                @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
            </style>

            <div class="finance-container">

                <div class="filter-card">
                    <div class="filter-group">
                        <label>เลือกเดือน</label>
                        <select id="monthFilter" onchange="FinanceAdminListPage.handleFilterChange()">
                            ${[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(m => `
                                <option value="${m}" ${this.currentMonth == m ? 'selected' : ''}>${Helpers.getMonthName(m)}</option>
                            `).join('')}
                        </select>
                    </div>
                    <div class="filter-group">
                        <label>เลือกปี (พ.ศ.)</label>
                        <select id="yearFilter" onchange="FinanceAdminListPage.handleFilterChange()">
                            ${[this.currentYear - 2, this.currentYear - 1, this.currentYear, this.currentYear + 1].map(y => `
                                <option value="${y}" ${this.currentYear == y ? 'selected' : ''}>${y + 543}</option>
                            `).join('')}
                        </select>
                    </div>
                </div>

                <div class="data-card">
                    <div class="card-header">
                        <h2>รายชื่อพนักงานและผลการทำงาน</h2>
                    </div>
                    <div class="table-scroll">
                        <table>
                            <thead>
                                <tr>
                                    <th>พนักงาน</th>
                                    <th>จำนวนเคส</th>
                                    <th>เงินเดือนพื้นฐาน</th>
                                    <th>ค่าสำรวจ</th>
                                    <th>สถานะ</th>
                                    <th>จัดการ</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${this.users.map(user => this.renderTableRow(user)).join('')}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        `;
    },

    calculateSummary() {
        const totalPaid = this.data
            .filter(s => s.status === 'paid')
            .reduce((sum, s) => sum + (parseFloat(s.totalAmount) || 0), 0);

        const pendingCount = this.data.filter(s => s.status !== 'paid').length;

        // This is a simple mock of total cases for the current month
        // In a real app we'd filter this.caseCounts by date if available
        const totalCases = Object.values(this.caseCounts).reduce((sum, count) => sum + count, 0);

        return { totalPaid, pendingCount, totalCases };
    },

    renderTableRow(user) {
        const salary = this.data.find(s => s.userId === user.id);
        const caseCount = this.caseCounts[user.id] || 0;
        const status = salary?.status || 'none';

        let statusBadge = '';
        if (status === 'paid') {
            statusBadge = '<span class="badge badge-paid">จ่ายแล้ว</span>';
        } else if (status === 'pending') {
            statusBadge = '<span class="badge badge-pending">รอดำเนินการ</span>';
        } else {
            statusBadge = '<span class="badge" style="background:#eee;color:#999">ยังไม่มีข้อมูล</span>';
        }

        return `
            <tr>
                <td>
                    <div class="user-info">
                        <div class="user-avatar">${Helpers.getInitials(user.fullName)}</div>
                        <div>
                            <div style="font-weight:600">${Helpers.escapeHtml(user.fullName)}</div>
                            <div style="font-size:12px;color:var(--text-secondary)">${user.username}</div>
                        </div>
                    </div>
                </td>
                <td style="font-weight:600">${caseCount}</td>
                <td>฿ ${salary ? Helpers.formatCurrency(salary.baseSalary) : '-'}</td>
                <td>฿ ${salary ? Helpers.formatCurrency(salary.commission) : '-'}</td>
                <td>${statusBadge}</td>
                <td>
                    <button class="btn btn-outline btn-sm" onclick="FinanceAdminListPage.openEditModal('${user.id}')">
                        ${Icons.edit} แก้ไข
                    </button>
                    ${salary?.slipFile ? `
                        <button class="btn btn-outline btn-sm" style="margin-left:4px" onclick="FinanceAdminListPage.viewSlip('${salary.id}')">
                            📄 สลิป
                        </button>
                    ` : ''}
                </td>
            </tr>
        `;
    },

    async handleFilterChange() {
        this.currentMonth = document.getElementById('monthFilter').value;
        this.currentYear = document.getElementById('yearFilter').value;
        App.refresh();
    },

    async openEditModal(userId) {
        const user = this.users.find(u => u.id === userId);
        const salary = this.data.find(s => s.userId === userId);
        const caseCount = this.caseCounts[userId] || 0;

        Modal.show({
            title: `จัดการค่าตอบแทน: ${user.fullName}`,
            content: `
                <form id="salaryForm" class="form-container">
                    <div class="form-row">
                        <div class="form-group">
                            <label>เงินเดือนพื้นฐาน (Base Salary)</label>
                            <input type="number" name="baseSalary" value="${salary?.baseSalary || 0}" step="0.01">
                        </div>
                        <div class="form-group">
                            <label>ค่าสำรวจ (Commission/Cases: ${caseCount})</label>
                            <input type="number" name="commission" value="${salary?.commission || (caseCount * 500)}" step="0.01">
                        </div>
                    </div>
                    <div class="form-group">
                        <label>ค่าใช้จ่ายอื่นๆ / เบี้ยเลี้ยง</label>
                        <input type="number" name="allowance" value="${salary?.allowance || 0}" step="0.01">
                    </div>
                    <div class="form-group">
                        <label>สถานะการเงิน</label>
                        <select name="status">
                            <option value="pending" ${salary?.status === 'pending' ? 'selected' : ''}>รอดำเนินการ</option>
                            <option value="paid" ${salary?.status === 'paid' ? 'selected' : ''}>จ่ายแล้ว</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label>อัพโหลดหลักฐาน (สลิปโอนเงิน)</label>
                        <input type="file" id="slipFileInput" accept="image/*,application/pdf" onchange="FinanceAdminListPage.handleFileUpload(event)">
                        <input type="hidden" name="slipFile" id="slipFileData" value="${salary?.slipFile || ''}">
                        <div id="filePreview" style="margin-top:10px">
                            ${salary?.slipFile ? '<span style="color:green">✓ มีไฟล์หลักฐานแล้ว</span>' : ''}
                        </div>
                    </div>
                </form>
            `,
            onConfirm: async () => {
                const formData = new FormData(document.getElementById('salaryForm'));
                const values = Object.fromEntries(formData.entries());

                const salaryData = {
                    id: salary?.id,
                    userId: userId,
                    month: this.currentMonth,
                    year: this.currentYear,
                    baseSalary: parseFloat(values.baseSalary) || 0,
                    commission: parseFloat(values.commission) || 0,
                    allowance: parseFloat(values.allowance) || 0,
                    totalAmount: (parseFloat(values.baseSalary) || 0) + (parseFloat(values.commission) || 0) + (parseFloat(values.allowance) || 0),
                    status: values.status,
                    slipFile: document.getElementById('slipFileData').value
                };

                try {
                    await DataService.finance.save(salaryData);
                    App.refresh();
                    return true;
                } catch (err) {
                    alert('เกิดข้อผิดพลาดในการบันทึกข้อมูล');
                    return false;
                }
            }
        });
    },

    async handleFileUpload(event) {
        const file = event.target.files[0];
        if (!file) return;

        if (file.size > 5 * 1024 * 1024) {
            alert('ขนาดไฟล์ห้ามเกิน 5MB');
            return;
        }

        const reader = new FileReader();
        reader.onload = (e) => {
            document.getElementById('slipFileData').value = e.target.result;
            document.getElementById('filePreview').innerHTML = `<span style="color:green">✓ อัพโหลดสำเร็จ (${file.name})</span>`;
        };
        reader.readAsDataURL(file);
    },

    viewSlip(salaryId) {
        const salary = this.data.find(s => s.id === salaryId);
        if (!salary?.slipFile) return;

        if (salary.slipFile.startsWith('data:application/pdf')) {
            const wind = window.open();
            wind.document.write(`<iframe src="${salary.slipFile}" frameborder="0" style="border:0; top:0px; left:0px; bottom:0px; right:0px; width:100%; height:100%;" allowfullscreen></iframe>`);
        } else {
            Modal.show({
                title: 'หลักฐานการจัดจ่าย',
                content: `<div style="text-align:center"><img src="${salary.slipFile}" style="max-width:100%; border-radius:8px"></div>`,
                showCancel: false
            });
        }
    }
};
