/**
 * ══════════════════════════════════════════════════════════════════════════
 * AVA - Data Service Layer
 * High-level data access abstraction for future API migration
 * ══════════════════════════════════════════════════════════════════════════
 */

const DataService = {
    /**
     * User Operations
     */
    users: {
        async getAll() {
            return await db.getAll('users');
        },
        async getById(id) {
            return await db.get('users', id);
        },
        async getByUsername(username) {
            return await db.getOneByIndex('users', 'username', username);
        },
        async getByRole(role) {
            return await db.getByIndex('users', 'role', role);
        },
        async getActive() {
            return await db.getByIndex('users', 'isActive', true);
        },
        async create(userData) {
            const user = {
                id: Helpers.generateId(),
                ...userData,
                createdAt: new Date().toISOString(),
                lastLogin: null
            };
            await db.add('users', user);
            await AuditService.log(AUDIT_ACTIONS.CREATE, ENTITY_TYPES.USER, user.id, null, user);
            return user;
        },
        async update(id, userData) {
            const existing = await this.getById(id);
            if (!existing) throw new Error('User not found');
            const updated = { ...existing, ...userData, updatedAt: new Date().toISOString() };
            await db.put('users', updated);
            await AuditService.log(AUDIT_ACTIONS.UPDATE, ENTITY_TYPES.USER, id, existing, updated);
            return updated;
        },
        async delete(id) {
            const existing = await this.getById(id);
            if (!existing) throw new Error('User not found');
            await db.delete('users', id);
            await AuditService.log(AUDIT_ACTIONS.DELETE, ENTITY_TYPES.USER, id, existing, null);
        }
    },

    /**
     * Case Operations
     */
    cases: {
        async getAll() {
            const cases = await db.getAll('cases');

            // Enrich with creator info for phone number
            const enrichedCases = await Promise.all(cases.map(async (c) => {
                let creator = null;
                if (c.createdById) {
                    creator = await db.get('users', c.createdById);
                }
                return {
                    ...c,
                    creatorName: creator?.fullName || c.createdByName || '-',
                    creatorPhone: creator?.phone || '-'
                };
            }));

            return enrichedCases.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        },
        async getById(id) {
            return await db.get('cases', id);
        },
        async getByCaseNumber(caseNumber) {
            return await db.getOneByIndex('cases', 'caseNumber', caseNumber);
        },
        async getByStatus(status) {
            return await db.getByIndex('cases', 'status', status);
        },
        async getByInspector(inspectorId) {
            const cases = await db.getByIndex('cases', 'inspectorId', inspectorId);

            // Enrich with creator info
            const enrichedCases = await Promise.all(cases.map(async (c) => {
                let creator = null;
                if (c.createdById) {
                    creator = await db.get('users', c.createdById);
                }
                return {
                    ...c,
                    creatorName: creator?.fullName || c.createdByName || '-',
                    creatorPhone: creator?.phone || '-'
                };
            }));

            return enrichedCases;
        },
        async getByHospital(hospitalId) {
            return await db.getByIndex('cases', 'hospitalId', hospitalId);
        },
        async create(caseData) {
            const caseNumber = await this.generateCaseNumber();
            const newCase = {
                id: Helpers.generateId(),
                caseNumber,
                ...caseData,
                createdById: caseData.createdById, // Ensure ID is saved
                status: CASE_STATUS.NEW,
                isRead: false,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            };
            await db.add('cases', newCase);
            await AuditService.log(AUDIT_ACTIONS.CREATE, ENTITY_TYPES.CASE, newCase.id, null, newCase);
            return newCase;
        },
        async update(id, caseData) {
            const existing = await this.getById(id);
            if (!existing) throw new Error('Case not found');
            const updated = { ...existing, ...caseData, updatedAt: new Date().toISOString() };
            await db.put('cases', updated);
            await AuditService.log(AUDIT_ACTIONS.UPDATE, ENTITY_TYPES.CASE, id, existing, updated);
            // Add to case history
            await DataService.caseHistory.add(id, 'update', existing, updated);
            return updated;
        },
        async markAsRead(id) {
            const existing = await this.getById(id);
            if (existing && !existing.isRead) {
                await db.put('cases', { ...existing, isRead: true });
            }
        },
        async approve(id, approvalData) {
            const existing = await this.getById(id);
            if (!existing) throw new Error('Case not found');
            const updated = {
                ...existing,
                status: CASE_STATUS.APPROVED,
                approvedAmount: approvalData.amount,
                approvalReason: approvalData.reason,
                approvedById: approvalData.approvedById,
                approvedAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            };
            await db.put('cases', updated);
            await AuditService.log(AUDIT_ACTIONS.APPROVE, ENTITY_TYPES.CASE, id, existing, updated);
            await DataService.caseHistory.add(id, 'approve', existing, updated);
            return updated;
        },
        async reject(id, rejectionData) {
            const existing = await this.getById(id);
            if (!existing) throw new Error('Case not found');
            const updated = {
                ...existing,
                status: CASE_STATUS.REJECTED,
                approvalReason: rejectionData.reason,
                approvedById: rejectionData.approvedById,
                approvedAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            };
            await db.put('cases', updated);
            await AuditService.log(AUDIT_ACTIONS.REJECT, ENTITY_TYPES.CASE, id, existing, updated);
            await DataService.caseHistory.add(id, 'reject', existing, updated);
            return updated;
        },
        async returnForRevision(id, returnData) {
            const existing = await this.getById(id);
            if (!existing) throw new Error('Case not found');
            const updated = {
                ...existing,
                status: CASE_STATUS.PENDING_REVISION,
                adminComment: returnData.comment,
                updatedAt: new Date().toISOString()
            };
            await db.put('cases', updated);
            await AuditService.log(AUDIT_ACTIONS.RETURN, ENTITY_TYPES.CASE, id, existing, updated);
            await DataService.caseHistory.add(id, 'return', existing, updated);
            return updated;
        },
        async submitInspection(id, inspectionData) {
            const existing = await this.getById(id);
            if (!existing) throw new Error('Case not found');
            const updated = {
                ...existing,
                status: CASE_STATUS.INSPECTED,
                inspectionDate: new Date().toISOString(),
                inspectorComment: inspectionData.comment,
                pdpaConsent: inspectionData.pdpaConsent,
                signatureData: inspectionData.signatureData,
                updatedAt: new Date().toISOString()
            };
            await db.put('cases', updated);
            await AuditService.log(AUDIT_ACTIONS.SUBMIT, ENTITY_TYPES.CASE, id, existing, updated);
            await DataService.caseHistory.add(id, 'submit_inspection', existing, updated);
            return updated;
        },
        async generateCaseNumber() {
            // Use timestamp + random to ensure uniqueness even with concurrent creation
            const now = new Date();
            const year = now.getFullYear().toString().slice(-2);
            const month = (now.getMonth() + 1).toString().padStart(2, '0');

            // Get existing cases for this month to find max sequence
            const allCases = await this.getAll();
            const monthPrefix = `AVA${year}${month}-`;
            const monthCases = allCases.filter(c => c.caseNumber && c.caseNumber.startsWith(monthPrefix));

            // Find the highest sequence number
            let maxSeq = 0;
            monthCases.forEach(c => {
                const parts = c.caseNumber.split('-');
                if (parts.length === 2) {
                    const seq = parseInt(parts[1], 10);
                    if (!isNaN(seq) && seq > maxSeq) maxSeq = seq;
                }
            });

            // Add random suffix to prevent collision in concurrent creation
            const seq = (maxSeq + 1).toString().padStart(5, '0');
            const random = Math.floor(Math.random() * 100).toString().padStart(2, '0');

            // Verify uniqueness
            let caseNumber = `AVA${year}${month}-${seq}`;
            const exists = await this.getByCaseNumber(caseNumber);
            if (exists) {
                // If collision, add random to make unique
                caseNumber = `AVA${year}${month}-${seq}${random}`;
            }

            return caseNumber;
        },
        async getStats() {
            const all = await this.getAll();
            const today = new Date().toISOString().split('T')[0];
            return {
                total: all.length,
                new: all.filter(c => c.status === CASE_STATUS.NEW).length,
                pendingConsideration: all.filter(c => c.status === CASE_STATUS.PENDING_CONSIDERATION).length,
                approved: all.filter(c => c.status === CASE_STATUS.APPROVED).length,
                rejected: all.filter(c => c.status === CASE_STATUS.REJECTED).length,
                closed: all.filter(c => c.status === CASE_STATUS.CLOSED).length,
                todayNew: all.filter(c => c.createdAt.startsWith(today)).length,
                unread: all.filter(c => !c.isRead).length,
                totalApprovedAmount: all.filter(c => c.status === CASE_STATUS.APPROVED)
                    .reduce((sum, c) => sum + (c.approvedAmount || 0), 0)
            };
        },

        async getChartData(year) {
            const all = await this.getAll();
            const targetYear = year || new Date().getFullYear();

            // Weekly Data (Mon-Sun of current week)
            const today = new Date();
            const day = today.getDay();
            const diff = today.getDate() - day + (day === 0 ? -6 : 1); // Audit: adjust when day is sunday
            const monday = new Date(today.setDate(diff));
            monday.setHours(0, 0, 0, 0);

            const weeklyLabels = ['จันทร์', 'อังคาร', 'พุธ', 'พฤหัสบดี', 'ศุกร์', 'เสาร์', 'อาทิตย์'];
            const weeklyData = [0, 0, 0, 0, 0, 0, 0];

            all.forEach(c => {
                const date = new Date(c.createdAt);
                if (date >= monday) {
                    const dayIndex = date.getDay(); // 0 = Sun, 1 = Mon
                    const arrayIndex = dayIndex === 0 ? 6 : dayIndex - 1;
                    weeklyData[arrayIndex]++;
                }
            });

            // Monthly Data
            const monthlyLabels = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
            const monthlyData = new Array(12).fill(0);

            all.forEach(c => {
                const date = new Date(c.createdAt);
                if (date.getFullYear() === targetYear) {
                    monthlyData[date.getMonth()]++;
                }
            });

            return {
                weekly: { labels: weeklyLabels, data: weeklyData },
                monthly: { labels: monthlyLabels, data: monthlyData }
            };
        }
    },

    /**
     * Case Media Operations
     */
    caseMedia: {
        async getByCaseId(caseId) {
            return await db.getByIndex('caseMedia', 'caseId', caseId);
        },
        async add(caseId, mediaData) {
            const media = {
                id: Helpers.generateId(),
                caseId,
                ...mediaData,
                uploadedAt: new Date().toISOString()
            };
            await db.add('caseMedia', media);
            return media;
        },
        async delete(id) {
            await db.delete('caseMedia', id);
        }
    },

    /**
     * Case History Operations
     */
    caseHistory: {
        async getByCaseId(caseId) {
            const history = await db.getByIndex('caseHistory', 'caseId', caseId);
            return history.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
        },
        async add(caseId, action, beforeData, afterData) {
            const currentUser = AuthService.getCurrentUser();

            // PATCH: Handle case where first argument is a complete history object (used by review.js)
            if (typeof caseId === 'object' && caseId !== null && caseId.caseId) {
                const historyObj = caseId;
                // Ensure ID
                if (!historyObj.id) historyObj.id = Helpers.generateId();
                await db.add('caseHistory', historyObj);
                return historyObj;
            }

            const history = {
                id: Helpers.generateId(),
                caseId,
                action,
                userId: currentUser?.id || 'system',
                userName: currentUser?.fullName || 'System',
                beforeData: JSON.stringify(beforeData),
                afterData: JSON.stringify(afterData),
                timestamp: new Date().toISOString()
            };
            await db.add('caseHistory', history);
            return history;
        }
    },

    /**
     * Hospital Operations
     */
    hospitals: {
        async getAll() {
            return await db.getAll('hospitals');
        },
        async getById(id) {
            return await db.get('hospitals', id);
        },
        async getByProvince(provinceCode) {
            return await db.getByIndex('hospitals', 'provinceCode', provinceCode);
        },
        async create(hospitalData) {
            const hospital = {
                id: Helpers.generateId(),
                ...hospitalData,
                isActive: true
            };
            await db.add('hospitals', hospital);
            return hospital;
        },
        async update(id, hospitalData) {
            const existing = await this.getById(id);
            if (!existing) throw new Error('Hospital not found');
            const updated = { ...existing, ...hospitalData };
            await db.put('hospitals', updated);
            return updated;
        },
        async delete(id) {
            await db.delete('hospitals', id);
        }
    },

    /**
     * Initialize demo data for first run
     */
    async initDemoData() {
        const usersCount = await db.count('users');
        if (usersCount > 0) return; // Already initialized

        // Create demo users
        const demoUsers = [
            { username: 'superadmin', passwordHash: await Helpers.hashPassword('admin123'), role: ROLES.SUPER_ADMIN, fullName: 'ผู้ดูแลระบบ', email: 'admin@ava.com', phone: '02-123-4567', isActive: true },
            { username: 'admin1', passwordHash: await Helpers.hashPassword('admin123'), role: ROLES.ADMIN, fullName: 'สมศักดิ์ พิจารณา', email: 'somsak@ava.com', phone: '02-123-4568', isActive: true },
            { username: 'inspector1', passwordHash: await Helpers.hashPassword('admin123'), role: ROLES.INSPECTOR, fullName: 'สมหญิง ตรวจสอบ', email: 'somying@ava.com', phone: '081-234-5678', isActive: true },
            { username: 'inspector2', passwordHash: await Helpers.hashPassword('admin123'), role: ROLES.INSPECTOR, fullName: 'สมชาย ภาคสนาม', email: 'somchai@ava.com', phone: '082-345-6789', isActive: true }
        ];

        for (const user of demoUsers) {
            await db.add('users', { id: Helpers.generateId(), ...user, createdAt: new Date().toISOString() });
        }

        // Create demo hospitals
        const demoHospitals = [
            { code: 'H001', name: 'โรงพยาบาลกรุงเทพ', provinceCode: '10', address: 'กรุงเทพมหานคร' },
            { code: 'H002', name: 'โรงพยาบาลรามาธิบดี', provinceCode: '10', address: 'กรุงเทพมหานคร' },
            { code: 'H003', name: 'โรงพยาบาลเชียงใหม่', provinceCode: '50', address: 'เชียงใหม่' },
            { code: 'H004', name: 'โรงพยาบาลขอนแก่น', provinceCode: '40', address: 'ขอนแก่น' },
            { code: 'H005', name: 'โรงพยาบาลสงขลา', provinceCode: '90', address: 'สงขลา' }
        ];

        for (const hospital of demoHospitals) {
            await db.add('hospitals', { id: Helpers.generateId(), ...hospital, isActive: true });
        }

        console.log('Demo data initialized');
    }
};
