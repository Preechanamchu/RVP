/**
 * ══════════════════════════════════════════════════════════════════════════
 * AVA - Case List Page
 * Displays all cases with filtering and sorting
 * ══════════════════════════════════════════════════════════════════════════
 */

const CaseListPage = {
    exportExcel() {
        Toast.success('กำลังดาวน์โหลด Excel...');
        // TODO: Implement actual Excel generation logic using SHEETJS or similar
        setTimeout(() => Toast.info('ส่งออกข้อมูลเรียบร้อยแล้ว'), 1500);
    },

    exportPDF() {
        Toast.success('กำลังสร้างไฟล์ PDF...');
        // TODO: Implement actual PDF generation logic
        setTimeout(() => Toast.info('ส่งออกไฟล์ PDF เรียบร้อยแล้ว'), 1500);
    },

    filters: {
        caseNumber: '',
        idCard: '',
        name: '',
        hospitalId: '',
        vehiclePlate: '',
        dateFrom: '',
        dateTo: '',
        status: ''
    },

    pageSize: 10, // Default to 10 items

    async render() {
        const user = AuthService.getCurrentUserSync();
        const isInspector = user?.role === ROLES.INSPECTOR;

        let cases = isInspector
            ? await DataService.cases.getByInspector(user.id)
            : await DataService.cases.getAll();

        const hospitals = !isInspector ? await DataService.hospitals.getAll() : [];

        // Calculate status counts for cards
        const statusCounts = this.calculateStatusCounts(cases, isInspector);

        // Apply filters
        if (this.filters.caseNumber) {
            cases = cases.filter(c => c.caseNumber?.toLowerCase().includes(this.filters.caseNumber.toLowerCase()));
        }
        if (this.filters.idCard) {
            cases = cases.filter(c => c.victimIdCard?.includes(this.filters.idCard));
        }
        if (this.filters.name) {
            cases = cases.filter(c => c.victimName?.toLowerCase().includes(this.filters.name.toLowerCase()));
        }
        if (this.filters.hospitalId) {
            cases = cases.filter(c => c.hospitalId == this.filters.hospitalId);
        }
        if (this.filters.dateFrom) {
            cases = cases.filter(c => c.createdAt >= this.filters.dateFrom);
        }
        if (this.filters.dateTo) {
            cases = cases.filter(c => c.createdAt <= this.filters.dateTo + 'T23:59:59');
        }
        if (this.filters.status) {
            cases = cases.filter(c => {
                const s = this.filters.status;
                // Check Case Status directly first (for closed, new, etc)
                if (c.status === s) return true;

                // Check Victims if it's a victim-level status
                if (c.victims && c.victims.length > 0) {
                    // Check against both constant and string just in case
                    return c.victims.some(v => v.status === s || v.status === s.toLowerCase());
                }

                return false;
            });
        }

        // Apply Page Size Limit
        const displayedCases = cases.slice(0, this.pageSize);

        return `
            <style>
                .case-list-container { width: 100%; overflow-x: hidden; }
                .status-cards-container { 
                    display: grid; 
                    grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); 
                    gap: 15px; 
                    margin-bottom: 20px; 
                }
                .search-bar-row { display: flex; flex-wrap: wrap; gap: 15px; align-items: flex-end; }
                .form-group { flex: 1; min-width: 150px; }
                
                .table-responsive { width: 100%; overflow-x: auto; -webkit-overflow-scrolling: touch; border-radius: 0 0 12px 12px; }
                .data-table { width: 100%; min-width: 900px; border-collapse: collapse; }
                .data-table th, .data-table td { padding: 12px 15px; font-size: 11px; }

                @media (max-width: 768px) {
                    .status-cards-container { grid-template-columns: repeat(2, 1fr); gap: 10px; }
                    .status-card { padding: 10px; }
                    .status-card-icon { font-size: 1.5rem; }
                    .status-card-count { font-size: 16px; }
                    .status-card-label { font-size: 10px; }
                    .form-group { min-width: 100%; }
                    .search-bar-row { gap: 10px; }
                }
                
                @media (max-width: 480px) {
                    .status-cards-container { grid-template-columns: repeat(2, 1fr); }
                    .data-table th, .data-table td { padding: 8px 10px; font-size: 10px; }
                }
            </style>
            <div class="case-list-container">
            <!-- Status Cards Section -->
            ${!isInspector ? this.renderStatusCards(statusCounts) : ''}

            <!-- Advanced Search Bar -->
            <div class="card" style="margin: var(--space-4) 0;">
                <div class="card-body" style="padding: var(--space-3);">
                    ${isInspector ? this.renderInspectorSearch(this.filters) : this.renderGeneralSearch(this.filters, hospitals)}
                </div>
            </div>

            <!-- Cases Table -->
            ${this.renderTable(displayedCases, isInspector)}
            </div>
        `;
    },

    setPageSize(size) {
        this.pageSize = parseInt(size);
        App.refreshPage();
    },

    togglePageSizeDropdown() {
        const dropdown = document.getElementById('pageSizeDropdown');
        if (dropdown) {
            dropdown.style.display = dropdown.style.display === 'block' ? 'none' : 'block';
        }
    },

    calculateStatusCounts(cases, isInspector) {
        let counts = {
            pending_consideration: 0,
            data_verification: 0,
            waiting_documents: 0,
            approved: 0,
            rejected: 0,
            closed: 0,
            total_victims: 0
        };

        cases.forEach(c => {
            // For Admins/SuperAdmins, do NOT count victims if case is NEW (not yet submitted by inspector)
            if (!isInspector && c.status === CASE_STATUS.NEW) {
                return;
            }

            // Count Closed Cases
            if (c.status === 'closed' || c.status === CASE_STATUS.CLOSED) {
                counts.closed++;
            }

            // Count Victims and their statuses
            const victims = c.victims || []; // Handle legacy or empty

            // If no victims array but legacy fields exist, create temporary victim
            if (victims.length === 0 && (c.victimName || c.victimIdCard)) {
                // Fallback: If case has status, count it as one victim status?
                // Usually if legacy, case.status IS the victim status.
                const status = c.status;
                counts.total_victims++;

                if (status === CASE_STATUS.PENDING_CONSIDERATION || status === 'pending_consideration') counts.pending_consideration++;
                else if (status === CASE_STATUS.DATA_VERIFICATION || status === 'data_verification') counts.data_verification++;
                else if (status === CASE_STATUS.WAITING_DOCUMENTS || status === 'waiting_documents') counts.waiting_documents++;
                else if (status === CASE_STATUS.APPROVED || status === 'approved') counts.approved++;
                else if (status === CASE_STATUS.REJECTED || status === 'rejected') counts.rejected++;
            } else {
                // Standard: Iterate victims
                victims.forEach(v => {
                    counts.total_victims++;
                    const status = v.status;

                    // Logic matches renderRow: For Admins, empty status on submitted cases = Pending
                    const isImplicitPending = !isInspector && (!status || status === '-');

                    if (isImplicitPending || status === CASE_STATUS.PENDING_CONSIDERATION || status === 'pending_consideration') counts.pending_consideration++;
                    else if (status === CASE_STATUS.DATA_VERIFICATION || status === 'data_verification') counts.data_verification++;
                    else if (status === CASE_STATUS.WAITING_DOCUMENTS || status === 'waiting_documents') counts.waiting_documents++;
                    else if (status === CASE_STATUS.APPROVED || status === 'approved') counts.approved++;
                    else if (status === CASE_STATUS.REJECTED || status === 'rejected') counts.rejected++;
                });
            }
        });

        return counts;
    },

    renderStatusCards(counts) {
        const cards = [
            {
                status: CASE_STATUS.PENDING_CONSIDERATION,
                icon: '⏳',
                label: 'รอการพิจารณา',
                count: counts.pending_consideration,
                gradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                shadowColor: 'rgba(102, 126, 234, 0.4)'
            },
            {
                status: CASE_STATUS.DATA_VERIFICATION,
                icon: '🔍',
                label: 'ตรวจสอบข้อมูล',
                count: counts.data_verification,
                gradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                shadowColor: 'rgba(102, 126, 234, 0.4)'
            },
            {
                status: CASE_STATUS.APPROVED,
                icon: '✅',
                label: 'อนุมัติ',
                count: counts.approved,
                gradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                shadowColor: 'rgba(102, 126, 234, 0.4)'
            },
            {
                status: CASE_STATUS.REJECTED,
                icon: '❌',
                label: 'ไม่อนุมัติ',
                count: counts.rejected,
                gradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                shadowColor: 'rgba(102, 126, 234, 0.4)'
            },
            {
                status: 'total_victims',
                icon: '👥',
                label: 'ผู้บาดเจ็บทั้งหมด',
                count: counts.total_victims,
                gradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                shadowColor: 'rgba(102, 126, 234, 0.4)'
            },
            {
                status: CASE_STATUS.CLOSED || 'closed',
                icon: '🔒',
                label: 'ปิดเคส',
                count: counts.closed,
                gradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                shadowColor: 'rgba(102, 126, 234, 0.4)'
            }
        ];

        return `
            <div class="status-cards-container">
                ${cards.map(card => `
                    <div class="status-card ${this.filters.status === card.status ? 'active' : ''}" 
                         onclick="CaseListPage.filterByStatus('${card.status}')"
                         style="--card-gradient: ${card.gradient}; --card-shadow: ${card.shadowColor};">
                        <div class="status-card-icon">${card.icon}</div>
                        <div class="status-card-content">
                            <div class="status-card-count">${card.count}</div>
                            <div class="status-card-label">${card.label}</div>
                        </div>
                        <div class="status-card-glow"></div>
                    </div>
                `).join('')}
            </div>
        `;
    },

    filterByStatus(status) {
        if (this.filters.status === status) {
            this.filters.status = ''; // Toggle off if same status clicked
        } else {
            this.filters.status = status;
        }
        App.refreshPage();
    },

    renderInspectorSearch(filters) {
        return `
            <div class="search-bar-row" style="display:flex;flex-wrap:wrap;gap:var(--space-3);align-items:flex-end;">
                <div class="form-group" style="margin:0;flex:1;min-width:120px">
                    <label style="font-size:10px;margin-bottom:1px">เลขเคส RVP</label>
                    <input type="text" id="searchCaseNumber" placeholder="AVA..." value="${filters.caseNumber}" style="padding:4px;font-size:11px">
                </div>
                <div class="form-group" style="margin:0;flex:1;min-width:150px">
                    <label style="font-size:10px;margin-bottom:1px">เลขบัตร 13 หลัก</label>
                    <input type="text" id="searchIdCard" placeholder="X-XXXX..." maxlength="13" value="${filters.idCard}" style="padding:4px;font-size:11px">
                </div>
                <div class="form-group" style="margin:0;flex:1;min-width:150px">
                    <label style="font-size:10px;margin-bottom:1px">ชื่อ - นามสกุล</label>
                    <input type="text" id="searchName" placeholder="ชื่อผู้บาดเจ็บ" value="${filters.name}" style="padding:4px;font-size:11px">
                </div>
                <div class="form-group" style="margin:0;flex:1;min-width:150px">
                    <label style="font-size:10px;margin-bottom:1px">ทะเบียนรถ</label>
                    <input type="text" id="searchVehiclePlate" placeholder="กข 1234" value="${filters.vehiclePlate || ''}" style="padding:4px;font-size:11px">
                </div>
                <div class="form-group" style="margin:0;flex:1;min-width:130px">
                    <label style="font-size:10px;margin-bottom:1px">เริ่มต้น</label>
                    <input type="date" id="searchDateFrom" value="${filters.dateFrom}" class="clean-date ${filters.dateFrom ? 'has-value' : ''}" data-placeholder="ว / ด / ป" onchange="this.value ? this.classList.add('has-value') : this.classList.remove('has-value')" style="padding:4px;font-size:11px">
                </div>
                <div class="form-group" style="margin:0;flex:1;min-width:130px">
                    <label style="font-size:10px;margin-bottom:1px">สิ้นสุด</label>
                    <input type="date" id="searchDateTo" value="${filters.dateTo}" class="clean-date ${filters.dateTo ? 'has-value' : ''}" data-placeholder="ว / ด / ป" onchange="this.value ? this.classList.add('has-value') : this.classList.remove('has-value')" style="padding:4px;font-size:11px">
                </div>
                
                <div style="display:flex;gap:var(--space-2);align-items:flex-end;padding-bottom:2px">
                    <button class="btn btn-primary btn-sm" onclick="CaseListPage.search(true)" title="ค้นหา" style="padding:4px 8px;font-size:10px">
                        ${Icons.search} ค้นหา
                    </button>
                    <button class="btn btn-ghost btn-sm" onclick="CaseListPage.clearSearch()" title="ล้าง" style="padding:4px 8px;font-size:10px">
                        ${Icons.close} ล้าง
                    </button>
                </div>
            </div>
        `;
    },

    renderGeneralSearch(filters, hospitals = []) {
        // Filtered status options - removed: new, inspected, pending_revision
        const filteredStatuses = Object.entries(STATUS_NAMES).filter(([value]) =>
            ![
                CASE_STATUS.NEW,
                CASE_STATUS.INSPECTED,
                CASE_STATUS.PENDING_REVISION,
                CASE_STATUS.CLOSED,
                CASE_STATUS.WAITING_DOCUMENTS
            ].includes(value)
        );

        return `
            <div class="search-bar-row" style="display:flex;flex-wrap:wrap;gap:var(--space-3);align-items:flex-end;">
                <div class="form-group" style="margin:0;flex:1;min-width:150px">
                    <label style="font-size:10px;margin-bottom:1px">โรงพยาบาล</label>
                    <select id="searchHospitalId" style="padding:4px;font-size:11px">
                        <option value="">ทั้งหมด</option>
                        ${hospitals.map(h => `<option value="${h.id}" ${filters.hospitalId == h.id ? 'selected' : ''}>${h.name}</option>`).join('')}
                    </select>
                </div>
                <div class="form-group" style="margin:0;flex:1;min-width:120px">
                    <label style="font-size:10px;margin-bottom:1px">เลขเคส RVP</label>
                    <input type="text" id="searchCaseNumber" placeholder="AVA..." value="${filters.caseNumber}" style="padding:4px;font-size:11px">
                </div>
                <div class="form-group" style="margin:0;flex:1;min-width:150px">
                    <label style="font-size:10px;margin-bottom:1px">เลขบัตร 13 หลัก</label>
                    <input type="text" id="searchIdCard" placeholder="X-XXXX..." maxlength="13" value="${filters.idCard}" style="padding:4px;font-size:11px">
                </div>
                <div class="form-group" style="margin:0;flex:1;min-width:150px">
                    <label style="font-size:10px;margin-bottom:1px">ทะเบียนรถ</label>
                    <input type="text" id="searchVehiclePlate" placeholder="กข 1234" value="${filters.vehiclePlate || ''}" style="padding:4px;font-size:11px">
                </div>
                <div class="form-group" style="margin:0;flex:1;min-width:130px">
                    <label style="font-size:10px;margin-bottom:1px">เริ่มต้น</label>
                    <input type="date" id="searchDateFrom" value="${filters.dateFrom}" class="clean-date ${filters.dateFrom ? 'has-value' : ''}" data-placeholder="ว / ด / ป" onchange="this.value ? this.classList.add('has-value') : this.classList.remove('has-value')" style="padding:4px;font-size:11px">
                </div>
                <div class="form-group" style="margin:0;flex:1;min-width:130px">
                    <label style="font-size:10px;margin-bottom:1px">สิ้นสุด</label>
                    <input type="date" id="searchDateTo" value="${filters.dateTo}" class="clean-date ${filters.dateTo ? 'has-value' : ''}" data-placeholder="ว / ด / ป" onchange="this.value ? this.classList.add('has-value') : this.classList.remove('has-value')" style="padding:4px;font-size:11px">
                </div>
                <div class="form-group" style="margin:0;flex:1;min-width:130px">
                    <label style="font-size:10px;margin-bottom:1px">สถานะ</label>
                    <select id="statusFilter" style="padding:4px;font-size:11px">
                        <option value="">สถานะทั้งหมด</option>
                        ${filteredStatuses.map(([value, label]) =>
            `<option value="${value}" ${filters.status === value ? 'selected' : ''}>${label}</option>`
        ).join('')}
                        <option value="closed" ${filters.status === 'closed' ? 'selected' : ''}>ปิดเคส</option>
                    </select>
                </div>
                <div style="display:flex;gap:var(--space-2);align-items:flex-end;padding-bottom:2px">
                    <button class="btn btn-primary btn-sm" onclick="CaseListPage.search()" title="ค้นหา" style="padding:4px 8px;font-size:10px">
                        ${Icons.search} ค้นหา
                    </button>
                    <button class="btn btn-ghost btn-sm" onclick="CaseListPage.clearSearch()" title="ล้าง" style="padding:4px 8px;font-size:10px">
                        ${Icons.close} ล้าง
                    </button>
                </div>
            </div>
        `;
    },

    // Hidden Create Button removed from logic above by split


    renderTable(cases, isInspector) {
        // defined inline to avoid dependency issues if Icons.* is missing
        const iconList = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="8" y1="6" x2="21" y2="6"></line><line x1="8" y1="12" x2="21" y2="12"></line><line x1="8" y1="18" x2="21" y2="18"></line><line x1="3" y1="6" x2="3.01" y2="6"></line><line x1="3" y1="12" x2="3.01" y2="12"></line><line x1="3" y1="18" x2="3.01" y2="18"></line></svg>`;
        const iconChevronDown = `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>`;

        // Page Size Dropdown Control - Toolbar Layout
        // Placed inside a header block to ensure visibility and proper spacing
        const tableToolbar = `
            <div style="display: flex; justify-content: flex-end; padding: 8px 16px; border-bottom: 1px solid #f1f5f9; background: #fff;">
                <div style="position: relative; display: inline-block;">
                    <button onclick="CaseListPage.togglePageSizeDropdown()" class="btn btn-ghost btn-sm" style="background: white; border: 1px solid #cbd5e1; color: #475569; font-size: 11px; display: flex; align-items: center; gap: 6px; padding: 4px 8px; border-radius: 4px;">
                        ${iconList} <span>แสดง ${this.pageSize} รายการ</span> ${iconChevronDown}
                    </button>
                    <div id="pageSizeDropdown" style="display: none; position: absolute; right: 0; top: 100%; background: white; border: 1px solid #e2e8f0; border-radius: 6px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1); min-width: 120px; z-index: 50; margin-top: 4px;">
                        ${[10, 20, 30, 40, 50, 100].map(size => `
                            <div onclick="CaseListPage.setPageSize(${size})" 
                                 style="padding: 8px 12px; cursor: pointer; font-size: 11px; color: ${this.pageSize === size ? 'var(--primary-600)' : '#475569'}; background: ${this.pageSize === size ? '#f0f9ff' : 'transparent'}; border-bottom: 1px solid #f8fafc; display: flex; justify-content: space-between;">
                                <span>${size} รายการ</span>
                                ${this.pageSize === size ? Icons.check : ''}
                            </div>
                        `).join('')}
                    </div>
                </div>
            </div>
        `;

        if (cases.length === 0) {
            return `
                <div class="card" style="overflow: visible;">
                    ${tableToolbar}
                    <div class="empty-state">
                        ${Icons.folder}
                        <h4>ไม่พบเคส</h4>
                        <p>ไม่มีเคสที่ตรงกับเงื่อนไขการค้นหา</p>
                    </div>
                </div>
            `;
        }

        return `
            <div class="card" style="overflow: visible;">
                ${tableToolbar}
                <div class="table-responsive">
                    <table class="data-table">
                        <thead style="font-size:11px">
                            <tr>
                                <th style="font-size:11px; width:180px;">วันที่/เวลา</th>
                                <th style="font-size:11px; width:120px;">เลขเคส RVP</th>
                                <th style="font-size:11px; width:150px;">โรงพยาบาล</th>
                                <th style="font-size:11px; width:120px;">ทะเบียนรถ</th>
                                <th style="font-size:11px; width:180px;">ชื่อผู้บาดเจ็บ</th>
                                <th style="font-size:11px; width:130px;">สถานะ</th>
                                <th style="font-size:11px; width:130px;">การดำเนินการ</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${cases.map(c => this.renderRow(c, isInspector)).join('')}
                        </tbody>
                    </table>
                </div>
            </div>
        `;
    },

    renderRow(caseData, isInspector) {
        const hospital = caseData.hospitalName || 'ไม่ระบุ';

        // Format Date/Time Column
        const createDate = new Date(caseData.createdAt);
        const accidentDate = new Date(caseData.accidentDate);
        const dateHtml = `
            <div style="display:flex;flex-direction:column;gap:4px;">
                <div style="font-size:10px;color:var(--neutral-600);white-space:nowrap;">
                    <span style="display:inline-block;width:60px;color:var(--neutral-500)">วันที่สร้าง:</span>
                    ${Helpers.formatDate(caseData.createdAt)} ${createDate.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })}
                </div>
                <div style="font-size:10px;color:var(--neutral-600);white-space:nowrap;">
                    <span style="display:inline-block;width:60px;color:var(--neutral-500)">เกิดเหตุ:</span>
                    ${Helpers.formatDate(caseData.accidentDate)} ${accidentDate.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })}
                </div>
            </div>
        `;

        // Format Victim Name Column and Vehicle Info Column
        let victimHtml = '';
        let vehicleHtml = '';
        let statusHtml = '';

        const rowHeightStyle = 'height:24px;margin-bottom:8px;display:flex;align-items:center;';

        if (caseData.victims && Array.isArray(caseData.victims) && caseData.victims.length > 0) {
            // New structure with multiple victims
            victimHtml = caseData.victims.map(v => {
                const displayTypeAbbr = v.typeAbbr || (v.type === 'driver_insured' ? 'ผขป' : (v.type === 'passenger_insured' ? 'ผดสป' : (v.type === 'driver_other' ? 'ผขค' : (v.type === 'passenger_other' ? 'ผดสค' : 'บคน'))));

                return `<div style="font-size:10px;${rowHeightStyle}">
                    ${v.firstName || ''} ${v.lastName || ''} <span style="color:var(--primary-600);font-weight:500;margin-left:4px;">[${displayTypeAbbr}]</span>
                </div>`;
            }).join('');

            statusHtml = caseData.victims.map(v => {
                // Font Size update for Admin: 14px (requested). Original was 0.7em (~11px).
                const fontSize = '10px';

                // Admin/Super Admin: If status is missing, show "Pending Consideration" (Purple Badge)
                // Also check if caseData.status is NEW/INSPECTED and v.status is empty/dash
                let statusBadge = '';

                if (!isInspector && (!v.status || v.status === '-')) {
                    // Style matches user request: Light Purple background, Purple text
                    statusBadge = `<span class="badge" style="background:#E9D5FF; color:#6B21A8; font-size:${fontSize};">รอการพิจารณา</span>`;
                } else {
                    statusBadge = v.status ? `<span class="badge ${STATUS_BADGE_CLASS[v.status] || 'badge-secondary'}" style="font-size:${fontSize};">${STATUS_NAMES[v.status] || v.status}</span>` : '<span class="badge badge-secondary" style="font-size:10px;">-</span>';
                }

                return `<div style="${rowHeightStyle}">${statusBadge}</div>`;
            }).join('');

            vehicleHtml = caseData.victims.map(v => {
                const info = `${v.vehiclePlate || '-'} ${v.vehicleProvince || ''}`.trim();
                return `<div style="font-size:10px;color:var(--neutral-500);${rowHeightStyle}">
                    ${Helpers.escapeHtml(info)}
                </div>`;
            }).join('');

            // Override with CASE vehicle if available
            if (caseData.vehiclePlate) {
                const info = `${caseData.vehiclePlate || '-'} ${caseData.vehicleProvince || ''}`.trim();
                // If overriding, we just show one vehicle info? Or repeat it? 
                // User wanted "Column: Vehicle Plate // Use accident vehicle". 
                // If we have multiple victims, visual alignment suggests we might want to repeat it or just center it. 
                // But sticking to the loop maintains alignment if we wanted.
                // However, "Use accident vehicle" implies a single value.
                // Let's vertically align it to the middle or just show it once.
                // Reviewing the image, "กท 5555" appears once.
                // So I will make vehicleHtml a single block, centered vertically or top-aligned.
                vehicleHtml = `<div style="font-size:10px;color:var(--neutral-500);padding-top:4px;">${Helpers.escapeHtml(info)}</div>`;
            } else {
                // If keeping loop for alignment structure but no case vehicle, keep previous loop?
                // Actually the user said "Use license plate of accident".
                vehicleHtml = `<div style="font-size:10px;color:var(--neutral-500);padding-top:4px;">-</div>`;
            }

        } else {
            // Fallback for old data
            const victim = caseData.victims ? caseData.victims[0] : caseData;
            const victims = caseData.victims || [victim];

            victimHtml = victims.map(v => {
                const typeMap = { 'driver_insured': 'ผขป', 'passenger_insured': 'ผดสป', 'driver_other': 'ผขค', 'passenger_other': 'ผดสค', 'third_party': 'บคน' };
                const abbr = typeMap[v.type || v.victimType] || v.typeAbbr || '-';
                return `<div style="font-size:10px;${rowHeightStyle}">
                     ${v.firstName || v.victimName || '-'} <span style="color:var(--primary-600);font-weight:500;margin-left:4px;">[${abbr}]</span>
                 </div>`;
            }).join('');

            statusHtml = victims.map(v => {
                const statusBadge = v.status ? `<span class="badge ${STATUS_BADGE_CLASS[v.status] || 'badge-secondary'}" style="font-size:10px;">${STATUS_NAMES[v.status] || v.status}</span>` : '';
                return `<div style="${rowHeightStyle}">${statusBadge}</div>`;
            }).join('');

            const info = `${caseData.vehiclePlate || caseData.vehicleBrand || '-'} ${caseData.vehicleProvince || ''}`.trim();
            vehicleHtml = `<div style="font-size:10px;color:var(--neutral-500);padding-top:4px;">${Helpers.escapeHtml(info)}</div>`;
        }

        const isClosed = caseData.status === 'closed' || caseData.status === CASE_STATUS.CLOSED;

        // If case is closed, override statusHtml? User said "Close case - everything marked as closed".
        // But also "3 victims = 3 status".
        // If closed, the victims might effectively be closed. 
        // I will display the victim statuses if available, but if the case acts as a wrapper, maybe appending 'Closed' is weird.
        // Let's trust the victim.status data is correct (or updated when case closed). 
        // If caseData.status is closed, we might want to just show "Closed" badge once?
        // The image shows "Waiting for inspection" (yellow) badge being replaced by specific victim status.
        // So I will stick to `statusHtml`. If it's empty, use `caseData.status`.

        if (!statusHtml.trim()) {
            statusHtml = `<span class="badge ${STATUS_BADGE_CLASS[caseData.status]}" style="font-size:10px">${STATUS_NAMES[caseData.status]}</span>`;
        }

        // View button (eye icon)
        // Check if user has permission to view closed cases or if it's their own, etc.
        // Assuming all roles can view details.
        const viewBtn = `<button class="btn btn-ghost btn-sm" onclick="App.navigate('${ROUTES.CASE_DETAIL}', '${caseData.id}')" title="ดูรายละเอียด">${Icons.eye}</button>`;

        // Primary Action Button (View/Consider)
        let primaryActionBtn = '';
        // Font size for action options: 14px for Admin
        const actionFontSize = !isInspector ? 'font-size:10px;' : '';

        if (isInspector && (caseData.status === CASE_STATUS.NEW || caseData.status === CASE_STATUS.PENDING_REVISION)) {
            primaryActionBtn = `<button class="btn btn-primary btn-sm" onclick="App.navigate('${ROUTES.CASE_CREATE}', '${caseData.id}')" style="margin-left:var(--space-1); white-space: nowrap; font-size: 10px;">ตรวจสอบ</button>`;
        } else if (!isInspector) {
            // Admin/SuperAdmin action column logic
            if (isClosed) {
                primaryActionBtn = `<span class="badge" style="background:#e6fffa;color:#009e60;border:1px solid #009e60;${actionFontSize}">ปิดเคส</span>`;
            } else if (caseData.status === CASE_STATUS.APPROVED) {
                primaryActionBtn = `<span class="badge badge-success" style="${actionFontSize}">อนุมัติแล้ว</span>`;
            } else if (caseData.status === CASE_STATUS.REJECTED) {
                primaryActionBtn = `<span class="badge badge-danger" style="${actionFontSize}">ไม่อนุมัติ</span>`;
            } else if (caseData.status === CASE_STATUS.PENDING_REVISION) {
                primaryActionBtn = `<span class="badge" style="background:#fff5f5;color:#e53e3e;border:1px solid #e53e3e;${actionFontSize}">รอแก้ไข</span>`;
            } else if (caseData.status === CASE_STATUS.NEW) {
                // Modified: Waiting for Inspector to submit + Edit Button
                primaryActionBtn = `
                    <div style="display:flex;align-items:center;">
                        <span style="color:#e65100;font-weight:600;white-space:nowrap;display:inline-block;${actionFontSize}">รอพนักงานส่ง</span>
                        <button onclick="App.navigate('${ROUTES.CASE_CREATE}', '${caseData.id}')" 
                                class="btn btn-ghost"
                                style="margin-left:8px; padding: 0 4px; height: auto; min-height: unset; font-size: 10px; color: #ff0000; font-weight: 500; border: none; background: transparent;"
                                onmouseover="this.style.textDecoration='underline';"
                                onmouseout="this.style.textDecoration='none';"
                                title="แก้ไขข้อมูล / เปลี่ยนคนตรวจ">
                            แก้ไข
                        </button>
                    </div>`;
            } else {
                // For all other active statuses (Inspected, Pending Consideration, Data Verification, etc.)
                // Show "Consider" button
                primaryActionBtn = `<button class="btn btn-primary btn-sm" onclick="App.navigate('${ROUTES.CASE_REVIEW}', '${caseData.id}')" style="margin-left:var(--space-1);${actionFontSize}">พิจารณา</button>`;
            }
        }

        // Override for Inspector: When case is NEW or INSPECTED (Submitted), show specific status/RVP
        if (isInspector) {
            const rowHeightStyle = 'height:24px;margin-bottom:8px;display:flex;align-items:center;';

            if (caseData.status === CASE_STATUS.NEW) {
                statusHtml = `<div style="${rowHeightStyle}"><span class="badge" style="background:#ebf8ff;color:#3182ce;border:1px solid #3182ce;font-size:10px">กำลังดำเนินการ</span></div>`;
            } else if (caseData.status === CASE_STATUS.INSPECTED) {
                statusHtml = `<div style="${rowHeightStyle}"><span class="badge" style="background:#fffaf0;color:#ed8936;border:1px solid #ed8936;font-size:10px">รอเจ้าหน้าที่พิจารณา</span></div>`;
            } else if (caseData.status === CASE_STATUS.PENDING_REVISION) {
                statusHtml = `<div style="${rowHeightStyle}"><span style="color:#e53e3e;font-weight:600;font-size:10px">งานแก้ไข</span></div>`;
            }
        }

        return `
            <tr class="case-row ${!caseData.isRead ? 'unread' : ''}">
                <td style="min-width:180px">${dateHtml}</td>
                <td>
                    ${((caseData.status === CASE_STATUS.NEW || caseData.status === CASE_STATUS.INSPECTED) && caseData.caseNumber && caseData.caseNumber.startsWith('AVA'))
                ? (isInspector
                    ? `<span style="color:#a0aec0;font-style:italic;font-size:10px;">รอเจ้าหน้าที่ระบุเลข RVP</span>`
                    : `<span style="color:#a0aec0;font-style:italic;font-size:10px;">รอระบุเลข RVP</span>`)
                : `<span class="case-id" style="font-size:10px">${caseData.caseNumber}</span>`}
                </td>
                <td><div style="font-size:10px">${Helpers.escapeHtml(hospital)}</div></td>
                <td>${vehicleHtml}</td>
                <td>${victimHtml}</td>
                <td>
                    ${statusHtml}
                </td>
                <td>
                    <div style="display:flex;align-items:center;flex-wrap:nowrap;">
                        ${viewBtn}
                        ${primaryActionBtn}
                    </div>
                </td>
            </tr>
        `;
    },

    search(isInspector = false) {
        this.filters.caseNumber = document.getElementById('searchCaseNumber').value.trim();
        this.filters.idCard = document.getElementById('searchIdCard').value.trim();
        this.filters.vehiclePlate = document.getElementById('searchVehiclePlate')?.value.trim() || '';

        if (isInspector) {
            this.filters.name = document.getElementById('searchName').value.trim();
            this.filters.dateFrom = document.getElementById('searchDateFrom').value;
            this.filters.dateTo = document.getElementById('searchDateTo').value;
        } else {
            this.filters.hospitalId = document.getElementById('searchHospitalId').value;
            this.filters.dateFrom = document.getElementById('searchDateFrom').value;
            this.filters.dateTo = document.getElementById('searchDateTo').value;
            this.filters.status = document.getElementById('statusFilter').value;
        }

        App.refreshPage();
    },

    clearSearch() {
        this.filters = {
            caseNumber: '',
            idCard: '',
            name: '',
            hospitalId: '',
            dateFrom: '',
            dateTo: '',
            status: '',
            monthYear: ''
        };
        App.refreshPage();
    }
};
