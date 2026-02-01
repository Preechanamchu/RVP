/**
 * ══════════════════════════════════════════════════════════════════════════
 * AVA - Audit Log Page
 * View all system audit logs
 * ══════════════════════════════════════════════════════════════════════════
 */

const AuditLogsPage = {
    filters: { action: '', entityType: '' },

    async render() {
        if (!AuthService.hasPermission('viewAuditLogs')) {
            Toast.error('ไม่มีสิทธิ์เข้าถึง');
            App.navigate(ROUTES.DASHBOARD);
            return '';
        }

        let logs = await AuditService.getLogs();

        if (this.filters.action) {
            logs = logs.filter(l => l.action === this.filters.action);
        }
        if (this.filters.entityType) {
            logs = logs.filter(l => l.entityType === this.filters.entityType);
        }

        return `
            <div class="page-header">
                <div>
                    <h1>Audit Log</h1>
                    <p>ประวัติการดำเนินการทั้งหมดในระบบ</p>
                </div>
                <button class="btn btn-ghost" style="color:var(--danger-500)" onclick="AuditLogsPage.clearLogs()">
                    ${Icons.trash} ล้างข้อมูล
                </button>
            </div>

            <!-- Filters -->
            <div class="audit-log-filters">
                <select onchange="AuditLogsPage.filterByAction(this.value)" style="max-width:200px">
                    <option value="">การดำเนินการทั้งหมด</option>
                    ${Object.entries(AUDIT_ACTIONS).map(([key, value]) =>
            `<option value="${value}" ${this.filters.action === value ? 'selected' : ''}>${AuditService.getActionName(value)}</option>`
        ).join('')}
                </select>
                <select onchange="AuditLogsPage.filterByEntity(this.value)" style="max-width:200px">
                    <option value="">ข้อมูลทั้งหมด</option>
                    ${Object.entries(ENTITY_TYPES).map(([key, value]) =>
            `<option value="${value}" ${this.filters.entityType === value ? 'selected' : ''}>${AuditService.getEntityTypeName(value)}</option>`
        ).join('')}
                </select>
            </div>

            <div class="card">
                <table class="data-table">
                    <thead>
                        <tr>
                            <th>เวลา</th>
                            <th>ผู้ใช้</th>
                            <th>การดำเนินการ</th>
                            <th>ข้อมูล</th>
                            <th>รหัส</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${logs.slice(0, 100).map(log => `
                            <tr>
                                <td>
                                    <div style="font-size:var(--font-size-sm)">${Helpers.formatDateTime(log.timestamp)}</div>
                                </td>
                                <td>
                                    <div style="display:flex;align-items:center;gap:var(--space-2)">
                                        <div class="avatar avatar-sm">${Helpers.getInitials(log.userName)}</div>
                                        <div>
                                            <div>${Helpers.escapeHtml(log.userName)}</div>
                                            <div style="font-size:var(--font-size-xs);color:var(--neutral-500)">${ROLE_NAMES[log.userRole] || ''}</div>
                                        </div>
                                    </div>
                                </td>
                                <td>
                                    <span class="audit-action ${AuditService.getActionClass(log.action)}">
                                        ${AuditService.getActionName(log.action)}
                                    </span>
                                </td>
                                <td>${AuditService.getEntityTypeName(log.entityType)}</td>
                                <td>
                                    <code style="font-size:var(--font-size-xs)">${log.entityId?.substring(0, 8) || '-'}</code>
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        `;
    },

    filterByAction(value) {
        this.filters.action = value;
        App.refreshPage();
    },

    filterByEntity(value) {
        this.filters.entityType = value;
        App.refreshPage();
    },

    async clearLogs() {
        if (!RBAC.isSuperAdmin()) {
            Toast.error('ไม่มีสิทธิ์ดำเนินการ');
            return;
        }

        const confirmed = await Modal.confirm(
            'ยืนยันล้างประวัติ Audit Log ทั้งหมด? การดำเนินการนี้ไม่สามารถยกเลิกได้',
            { title: 'ล้างข้อมูล Audit Log', confirmText: 'ล้างข้อมูล', danger: true }
        );

        if (confirmed) {
            try {
                await AuditService.clearAll();
                Toast.success('ล้างประวัติเรียบร้อย');
                App.refreshPage();
            } catch (error) {
                Toast.error('เกิดข้อผิดพลาด: ' + error.message);
            }
        }
    }
};
