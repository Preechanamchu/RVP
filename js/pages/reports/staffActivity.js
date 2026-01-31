/**
 * ══════════════════════════════════════════════════════════════════════════
 * AVA - Staff Activity Report Page
 * SuperAdmin - Track all staff activities (Admin & Inspector)
 * ══════════════════════════════════════════════════════════════════════════
 */

const StaffActivityPage = {
    async render() {
        if (!RBAC.isSuperAdmin()) {
            Toast.error('เฉพาะ Super Admin เท่านั้น');
            App.navigate(ROUTES.DASHBOARD);
            return '';
        }

        const users = await DataService.users.getAll();
        const cases = await DataService.cases.getAll();
        const logs = await AuditService.getLogs();

        // Initialize user activity tracking
        const userActivity = {};
        users.forEach(u => {
            userActivity[u.id] = {
                user: u,
                creates: 0,
                approves: 0,
                rejects: 0,
                lastAction: null
            };
        });

        // 1. Calculate Stats from AUDIT LOGS (Single Source of Truth)
        // We iterate through all logs to count actions for each user
        // This ensures consistency with the "View Details" modal
        logs.forEach(log => {
            // Check if we track this user
            if (userActivity[log.userId]) {
                const ua = userActivity[log.userId];

                // Update Last Action Timestamp
                if (!ua.lastAction || new Date(log.timestamp) > new Date(ua.lastAction)) {
                    ua.lastAction = log.timestamp;
                }

                // Count Actions
                if (log.action === AUDIT_ACTIONS.CREATE) {
                    ua.creates++;
                } else if (log.action === AUDIT_ACTIONS.APPROVE) {
                    ua.approves++;
                } else if (log.action === AUDIT_ACTIONS.REJECT) {
                    ua.rejects++;
                }
            }
        });

        // 2. Filter for Admins/Inspectors (Staff) and Sort
        // User request: "Staff Activity" -> likely all staff (SuperAdmin, Admin, Inspector).
        // Included SUPER_ADMIN just in case, or stick to ADMIN/INSPECTOR.
        const sortedUsers = Object.values(userActivity)
            .filter(ua => ua.user.role === ROLES.SUPER_ADMIN || ua.user.role === ROLES.ADMIN || ua.user.role === ROLES.INSPECTOR)
            .sort((a, b) => {
                // Sort by total activity
                const totalA = a.creates + a.approves + a.rejects;
                const totalB = b.creates + b.approves + b.rejects;
                return totalB - totalA;
            });

        return `
            <div class="page-header">
                <h2 style="margin:0; font-size:1.5rem; color:var(--text-slate-900);">ติดตามพนักงาน</h2>
                <div style="font-size:0.9rem; color:var(--text-slate-500);">รายงานสำหรับผู้บริหาร (Super Admin)</div>
            </div>

            <div class="card" style="margin-top:20px;">
                <table class="data-table">
                    <thead>
                        <tr style="font-size:11px">
                            <th>พนักงาน</th>
                            <th>บทบาท</th>
                            <th style="text-align:center;">สร้าง</th>
                            <th style="text-align:center;">อนุมัติ</th>
                            <th style="text-align:center;">ไม่อนุมัติ</th>
                            <th>ล่าสุด</th>
                            <th></th>
                        </tr>
                    </thead>
                    <tbody>
                        ${sortedUsers.map(ua => `
                            <tr style="font-size:10px">
                                <td>
                                    <div style="display:flex;align-items:center;gap:var(--space-2)">
                                        <div class="avatar avatar-sm" style="${ua.user.avatarEmoji ? 'font-size:1.5rem;background:none' : ''}">
                                            ${ua.user.avatarEmoji || Helpers.getInitials(ua.user.fullName)}
                                        </div>
                                        <div>
                                            <div style="font-weight:var(--font-weight-medium)">${Helpers.escapeHtml(ua.user.fullName)}</div>
                                            <div style="font-size:var(--font-size-xs);color:var(--neutral-500)">${ua.user.username}</div>
                                        </div>
                                    </div>
                                </td>
                                <td><span class="badge badge-new" style="font-size:10px">${ROLE_NAMES[ua.user.role]}</span></td>
                                <td style="text-align:center;"><span style="color:var(--primary-600); font-weight:600;">${ua.creates}</span></td>
                                <td style="text-align:center;"><span style="color:var(--success-600); font-weight:600;">${ua.approves}</span></td>
                                <td style="text-align:center;"><span style="color:var(--danger-600); font-weight:600;">${ua.rejects}</span></td>
                                <td style="font-size:10px">${ua.lastAction ? Helpers.formatRelativeTime(ua.lastAction) : '-'}</td>
                                <td style="text-align:right;">
                                    <button class="btn btn-ghost btn-sm" onclick="StaffActivityPage.showDetail('${ua.user.id}')" title="ดูละเอียด">
                                        ${Icons.eye} ดูละเอียด
                                    </button>
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        `;
    },

    async showDetail(userId) {
        const user = await DataService.users.getById(userId);
        const currentYear = new Date().getFullYear();
        const currentMonth = (new Date().getMonth() + 1).toString().padStart(2, '0');
        const defaultDate = `${currentYear}-${currentMonth}`; // YYYY-MM

        // Initial Render of Modal Content
        const content = `
            <div style="padding:10px;">
                <div style="margin-bottom:20px; display:flex; justify-content:space-between; align-items:center;">
                   <div style="display:flex; align-items:center; gap:10px;">
                       <span style="font-size:0.9rem; color:#64748b;">เลือกเดือน:</span>
                       <input type="month" id="staff-history-filter" class="form-control" style="width:auto; padding:4px 8px;" value="${defaultDate}" onchange="StaffActivityPage.updateHistoryList('${userId}')">
                   </div>
                </div>

                <div id="staff-history-stats" style="display:flex; gap:15px; margin-bottom:15px; font-size:0.9rem;">
                    <!-- Stats will be injected here -->
                </div>

                <div style="max-height: 400px; overflow-y: auto;">
                    <table class="data-table">
                        <thead>
                            <tr style="font-size:11px; background:#f8fafc;">
                                <th>เลข RVP</th>
                                <th>สถานะ</th>
                                <th>วันที่/เวลา</th>
                            </tr>
                        </thead>
                        <tbody id="staff-history-list">
                            <tr><td colspan="3" style="text-align:center;">กำลังโหลด...</td></tr>
                        </tbody>
                    </table>
                </div>

                <div style="margin-top:15px; padding-top:15px; border-top:1px solid #eee; display:flex; justify-content:flex-end; gap:20px; font-size:0.9rem; font-weight:600;">
                    <div style="color:var(--primary-600);">สร้าง: <span id="sum-create">0</span> เคส</div>
                    <div style="color:var(--success-600);">อนุมัติ: <span id="sum-approve">0</span> เคส</div>
                    <div style="color:var(--danger-600);">ไม่อนุมัติ: <span id="sum-reject">0</span> เคส</div>
                </div>
            </div>
        `;

        Modal.show({
            title: `ประวัติการทำงาน: ${user.fullName}`,
            content: content,
            size: 'lg'
        });

        // Trigger first load
        this.updateHistoryList(userId);
    },

    async updateHistoryList(userId) {
        const dateInput = document.getElementById('staff-history-filter');
        if (!dateInput) return;

        const [year, month] = dateInput.value.split('-'); // ["2026", "01"]

        let logs = await AuditService.getUserLogs(userId);

        // Fetch all cases to map ID -> RVP Number
        // Optimization: In real app, maybe fetch only needed IDs or rely on log having metadata.
        // Here we'll fetch all cases for simplicity in lookup
        const allCases = await DataService.cases.getAll();
        const caseMap = {};
        allCases.forEach(c => caseMap[c.id] = c);

        // Filter Logs by Date and Relevant Actions
        const filteredLogs = logs.filter(log => {
            const date = new Date(log.timestamp);
            const isMonthMatch = date.getFullYear() === parseInt(year) && (date.getMonth() + 1) === parseInt(month);
            const isRelevantAction = [AUDIT_ACTIONS.CREATE, AUDIT_ACTIONS.APPROVE, AUDIT_ACTIONS.REJECT].includes(log.action);
            return isMonthMatch && isRelevantAction;
        });

        // Sort descending
        filteredLogs.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

        // Generate Rows and Stats
        let createCount = 0;
        let approveCount = 0;
        let rejectCount = 0;

        const rows = filteredLogs.map(log => {
            const dateObj = new Date(log.timestamp);
            const dateStr = dateObj.toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: '2-digit' });
            const timeStr = dateObj.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' }) + ' น.';

            const caseData = caseMap[log.entityId];
            const caseNumber = caseData ? `เลข RVP : ${caseData.caseNumber}` : 'ไม่ระบุ';

            let statusHtml = '';
            if (log.action === AUDIT_ACTIONS.CREATE) {
                createCount++;
                statusHtml = `<span class="badge badge-primary">สร้าง</span>`;
            } else if (log.action === AUDIT_ACTIONS.APPROVE) {
                approveCount++;
                statusHtml = `<span class="badge badge-success">อนุมัติ</span>`;
            } else if (log.action === AUDIT_ACTIONS.REJECT) {
                rejectCount++;
                statusHtml = `<span class="badge badge-danger">ไม่อนุมัติ</span>`;
            }

            return `
                <tr style="font-size:10px;">
                    <td style="font-weight:600;">${caseNumber}</td>
                    <td>${statusHtml}</td>
                    <td>${dateStr} <span style="color:#94a3b8; margin-left:4px;">${timeStr}</span></td>
                </tr>
            `;
        }).join('');

        // Update UI
        document.getElementById('staff-history-list').innerHTML = rows || '<tr><td colspan="3" style="text-align:center; padding:20px; color:#94a3b8;">ไม่พบรายการในเดือนนี้</td></tr>';

        // Update Summary Footer
        document.getElementById('sum-create').textContent = createCount;
        document.getElementById('sum-approve').textContent = approveCount;
        document.getElementById('sum-reject').textContent = rejectCount;
    }
};
