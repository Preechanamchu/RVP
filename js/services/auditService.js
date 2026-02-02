/**
 * ══════════════════════════════════════════════════════════════════════════
 * AVA - Audit Service
 * Comprehensive audit logging for compliance and accountability
 * ══════════════════════════════════════════════════════════════════════════
 */

const AuditService = {
    /**
     * Log an action to the audit trail
     * @param {string} action - Type of action (from AUDIT_ACTIONS)
     * @param {string} entityType - Type of entity affected (from ENTITY_TYPES)
     * @param {string} entityId - ID of the affected entity
     * @param {object} beforeValue - State before the action
     * @param {object} afterValue - State after the action
     * @returns {Promise<object>}
     */
    async log(action, entityType, entityId, beforeValue = null, afterValue = null) {
        const session = AuthService.getSession();

        const logEntry = {
            id: Helpers.generateId(),
            userId: session?.userId || 'anonymous',
            userName: session?.fullName || 'ระบบ',
            userRole: session?.role || 'system',
            action,
            entityType,
            entityId,
            beforeValue: beforeValue ? JSON.stringify(beforeValue) : null,
            afterValue: afterValue ? JSON.stringify(afterValue) : null,
            ipAddress: 'localhost', // In browser, we can't get real IP
            userAgent: navigator.userAgent,
            timestamp: new Date().toISOString()
        };

        await db.add('auditLogs', logEntry);
        return logEntry;
    },

    /**
     * Get all audit logs with optional filters
     * @param {object} filters
     * @returns {Promise<Array>}
     */
    async getLogs(filters = {}) {
        let logs = await db.getAll('auditLogs');

        // Apply filters
        if (filters.userId) {
            logs = logs.filter(l => l.userId === filters.userId);
        }
        if (filters.entityType) {
            logs = logs.filter(l => l.entityType === filters.entityType);
        }
        if (filters.action) {
            logs = logs.filter(l => l.action === filters.action);
        }
        if (filters.fromDate) {
            logs = logs.filter(l => new Date(l.timestamp) >= new Date(filters.fromDate));
        }
        if (filters.toDate) {
            logs = logs.filter(l => new Date(l.timestamp) <= new Date(filters.toDate));
        }
        if (filters.entityId) {
            logs = logs.filter(l => l.entityId === filters.entityId);
        }

        // Sort by timestamp descending
        logs.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

        return logs;
    },

    /**
     * Get logs for a specific entity
     * @param {string} entityType 
     * @param {string} entityId 
     * @returns {Promise<Array>}
     */
    async getEntityLogs(entityType, entityId) {
        return this.getLogs({ entityType, entityId });
    },

    /**
     * Get logs by user
     * @param {string} userId 
     * @returns {Promise<Array>}
     */
    async getUserLogs(userId) {
        return this.getLogs({ userId });
    },

    /**
     * Get action display name in Thai
     * @param {string} action 
     * @returns {string}
     */
    getActionName(action) {
        const names = {
            [AUDIT_ACTIONS.LOGIN]: 'เข้าสู่ระบบ',
            [AUDIT_ACTIONS.LOGOUT]: 'ออกจากระบบ',
            [AUDIT_ACTIONS.CREATE]: 'สร้าง',
            [AUDIT_ACTIONS.UPDATE]: 'แก้ไข',
            [AUDIT_ACTIONS.DELETE]: 'ลบ',
            [AUDIT_ACTIONS.APPROVE]: 'อนุมัติ',
            [AUDIT_ACTIONS.REJECT]: 'ไม่อนุมัติ',
            [AUDIT_ACTIONS.RETURN]: 'ส่งกลับแก้ไข',
            [AUDIT_ACTIONS.SUBMIT]: 'ส่งรายงาน',
            [AUDIT_ACTIONS.VIEW]: 'ดู'
        };
        return names[action] || action;
    },

    /**
     * Get entity type display name in Thai
     * @param {string} entityType 
     * @returns {string}
     */
    getEntityTypeName(entityType) {
        const names = {
            [ENTITY_TYPES.USER]: 'ผู้ใช้',
            [ENTITY_TYPES.CASE]: 'เคส',
            [ENTITY_TYPES.CASE_MEDIA]: 'ไฟล์ภาพ/วิดีโอ',
            [ENTITY_TYPES.HOSPITAL]: 'โรงพยาบาล'
        };
        return names[entityType] || entityType;
    },

    /**
     * Get action badge class
     * @param {string} action 
     * @returns {string}
     */
    getActionClass(action) {
        const classes = {
            [AUDIT_ACTIONS.CREATE]: 'create',
            [AUDIT_ACTIONS.UPDATE]: 'update',
            [AUDIT_ACTIONS.DELETE]: 'delete',
            [AUDIT_ACTIONS.LOGIN]: 'login',
            [AUDIT_ACTIONS.APPROVE]: 'create',
            [AUDIT_ACTIONS.REJECT]: 'delete',
            [AUDIT_ACTIONS.RETURN]: 'update'
        };
        return classes[action] || 'update';
    },

    /**
     * Clear all audit logs
     * @returns {Promise<void>}
     */
    async clearAll() {
        // We need to delete all records from the store
        // Since IDB wrapper doesn't have clear(), we get all and delete
        const logs = await db.getAll('auditLogs');
        for (const log of logs) {
            await db.delete('auditLogs', log.id);
        }
    }
};
