/**
 * ══════════════════════════════════════════════════════════════════════════
 * AVA - Case Review Page
 * Admin approval/rejection workflow with Victim Blocks & Advanced Gallery
 * Updated: Modern UI with Zone Layout & Icon Popups
 * ══════════════════════════════════════════════════════════════════════════
 */

const CaseReviewPage = {
    caseData: null,
    media: [],
    victims: [],
    caseHistory: [],

    // Gallery State
    currentGalleryData: [],
    currentGalleryType: '',
    currentGalleryIndex: 0,
    currentRotation: 0,

    async render(caseId) {
        this.caseData = await DataService.cases.getById(caseId);
        if (!this.caseData) {
            return '<div class="empty-state"><h4>ไม่พบเคส</h4></div>';
        }

        if (!RBAC.canPerformCaseAction('approve', this.caseData)) {
            Toast.error('ไม่สามารถพิจารณาเคสนี้ได้');
            App.navigate(ROUTES.CASES);
            return '';
        }

        this.media = await DataService.caseMedia.getByCaseId(caseId);
        this.caseHistory = await DataService.caseHistory.getByCaseId(caseId);

        // Fetch inspector name
        let inspectorName = '';
        if (this.caseData.inspectorId) {
            try {
                const inspector = await DataService.users.getById(this.caseData.inspectorId);
                if (inspector) inspectorName = inspector.fullName;
            } catch (e) {
                console.error('Failed to load inspector info', e);
            }
        }

        // Get victims - support both array and single victim
        this.victims = this.caseData.victims || [{
            titlePrefix: this.caseData.titlePrefix || '',
            firstName: this.caseData.victimName ? this.caseData.victimName.split(' ')[0] : '',
            lastName: this.caseData.victimSurname || (this.caseData.victimName ? this.caseData.victimName.split(' ').slice(1).join(' ') : ''),
            idCard: this.caseData.victimIdCard,
            phone: this.caseData.phoneNumber,
            vehiclePlate: this.caseData.vehiclePlate,
            vehicleProvince: this.caseData.vehicleProvince,
            hospitalComment: this.caseData.hospitalComment,
            inspectorComment: this.caseData.inspectorComment,
            type: this.caseData.victimType
        }];

        // Check if case is approved (non-editable)
        const isApproved = this.caseData.status === CASE_STATUS.APPROVED;

        return `
            <style>
                /* --- ENTERPRISE / GOVERNMENT COMPACT THEME --- */
                :root {
                    --bg-slate-50: #f8fafc;
                    --border-slate-200: #e2e8f0;
                    --text-slate-500: #64748b;
                    --text-slate-700: #334155;
                    --text-slate-900: #0f172a;
                    --primary-compact: #4f46e5;
                }

                .review-page { max-width: 100%; margin: 0 auto; padding: 0 16px; }
                
                /* Header Card - Sleek & Compact */
                .review-header-card {
                    background: linear-gradient(to right, #4f46e5, #4338ca);
                    color: white; border-radius: 8px; padding: 12px 20px;
                    margin-bottom: 12px; display: flex; justify-content: space-between;
                    align-items: center; box-shadow: 0 2px 4px rgba(0,0,0,0.1);
                }
                .review-case-number { font-size: 1.25rem; font-weight: 700; line-height: 1.2; letter-spacing: 0.5px; }
                
                .review-header-meta { text-align: right; }
                .review-header-hospital { font-size: 15px; font-weight: 600; }
                .review-header-date, .review-header-inspector { font-size: 10px; opacity: 0.9; margin-top: 2px; }
                
                /* Common Zone Styles */
                .review-zone { 
                    background: white; border: 1px solid var(--border-slate-200);
                    border-radius: 8px; margin-bottom: 12px;
                    box-shadow: 0 1px 2px rgba(0,0,0,0.03); 
                }
                .review-zone-header { 
                    background: var(--bg-slate-50);
                    padding: 8px 16px; border-bottom: 1px solid var(--border-slate-200);
                    display: flex; align-items: center; gap: 8px;
                    font-size: 0.9rem; font-weight: 600; color: var(--text-slate-700);
                }
                .review-zone-body { padding: 12px 16px; }
                
                /* Grid System - dense */
                .review-info-grid { 
                    display: grid; 
                    grid-template-columns: repeat(auto-fill, minmax(180px, 1fr)); 
                    gap: 12px 16px; /* Row 12px, Col 16px */
                }
                
                /* Field Key-Value Pair */
                .review-info-item { display: flex; flex-direction: column; }
                .review-info-label { 
                    font-size: 11px; color: var(--text-slate-500); 
                    margin-bottom: 0; /* No margin */
                    line-height: 1.2; white-space: nowrap;
                }
                .review-info-value { 
                    font-size: 10px; color: var(--text-slate-900); 
                    font-weight: 500; line-height: 1.35; /* Tighter line height */
                }
                .review-info-value.highlight { color: var(--primary-compact); font-weight: 600; }
                
                /* Victim Block - Side-by-Side Layout */
                .review-victim-block {
                    background: white; border: 1px solid var(--border-slate-200);
                    border-radius: 8px; margin-bottom: 12px; overflow: hidden;
                }
                .review-victim-header {
                    background: #f1f5f9; padding: 8px 16px;
                    display: flex; align-items: center; justify-content: space-between;
                    border-bottom: 1px solid var(--border-slate-200);
                }
                .review-victim-header .title { 
                    font-weight: 600; font-size: 0.9rem; color: var(--text-slate-900); 
                    display: flex; align-items: center; gap: 8px;
                }
                .review-victim-body {
                    padding: 16px;
                    display: grid;
                    grid-template-columns: 1fr 320px; /* Fixed Action Panel Width */
                    gap: 24px;
                }
                @media (max-width: 1024px) {
                    .review-victim-body { grid-template-columns: 1fr; }
                }

                /* Data grouping */
                .victim-data-group {
                    display: grid;
                    grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
                    column-gap: 16px; row-gap: 6px; /* Ultra compact row gap */
                    margin-bottom: 0px;
                }
                
                /* Action Panel Form */
                .action-panel { height: fit-content; }
                .action-panel .form-group { margin-bottom: 8px; }
                .action-panel label { 
                    font-size: 11px; font-weight: 600; color: var(--text-slate-700); 
                    margin-bottom: 3px; display: block;
                }
                .action-panel .form-input, .action-panel select, .action-panel textarea {
                    width: 100%; padding: 4px 8px; font-size: 10px; /* Smaller font */
                    border: 1px solid var(--border-slate-200); border-radius: 4px;
                    background: white; transition: border-color 0.2s;
                    line-height: 1.3;
                }
                .action-panel .form-input:focus { border-color: var(--primary-compact); outline: none; }
                .action-panel textarea { min-height: 50px; resize: vertical; }
                
                /* Approver Info Compact */
                .approver-info {
                    background: var(--bg-slate-50); border: 1px solid var(--border-slate-200);
                    padding: 8px 12px; border-radius: 4px; margin-top: 10px;
                }
                
                /* Utility */
                .btn-compact { padding: 6px 12px; font-size: 0.85rem; }
                
                /* Legacy cleanup */
                .review-victim-icons, .review-sidebar, .review-layout-grid { display: none; }
            </style>

            <div class="review-page">
                <button class="review-back-btn" onclick="App.navigate('${ROUTES.CASES}')" style="margin-bottom:12px;padding:6px 12px;font-size:0.85rem;">
                    ${Icons.arrowLeft} กลับหน้ารายการเคส
                </button>

                <!-- Zone 1: Header -->
                <div class="review-header-card">
                    <div>
                        <div class="review-case-number-wrapper" style="position:relative; min-width: 250px;">
                            <!-- View Mode -->
                            <div id="viewModeCaseNumber" ondblclick="CaseReviewPage.toggleEditCaseNumber(true)" 
                                 style="cursor:pointer; padding:4px 8px; border:1px solid transparent; border-radius:4px; transition:all 0.2s;"
                                 title="ดับเบิ้ลคลิกเพื่อแก้ไข">
                                <div style="font-size:0.7rem; color:rgba(255,255,255,0.7); margin-bottom:2px;">ระบุเลข RVP ของท่าน</div>
                                <div style="display:flex; align-items:center; gap:8px;">
                                    <span id="displayCaseNumber" style="font-size:1.25rem; font-weight:700; letter-spacing:0.5px;">${this.caseData.caseNumber}</span>
                                    <span style="font-size:1rem; opacity:0.8;">🔒</span>
                                </div>
                            </div>

                            <!-- Edit Mode (Hidden initially) -->
                            <div id="editModeCaseNumber" style="display:none; align-items:center; gap:8px;">
                                <div>
                                    <div style="font-size:0.7rem; color:rgba(255,255,255,0.9); margin-bottom:2px;">ระบุเลข RVP ของท่าน</div>
                                    <input type="text" id="editCaseNumberInput" value="${this.caseData.caseNumber}" 
                                        placeholder="ระบุเลข RVP ของท่าน"
                                        style="background:rgba(255,255,255,0.9); border:none; color:#333; padding:4px 12px; border-radius:4px; font-size:1rem; width:180px; font-weight:600; font-family:'Sarabun',sans-serif; outline:none; box-shadow:0 2px 5px rgba(0,0,0,0.2);">
                                </div>
                                <button class="btn btn-sm btn-success" onclick="CaseReviewPage.saveCaseNumber()" style="padding:4px 8px; border-radius:4px; height:32px; align-self:flex-end;">
                                    💾
                                </button>
                                <button class="btn btn-sm btn-ghost" onclick="CaseReviewPage.toggleEditCaseNumber(false)" style="padding:4px 8px; color:white; height:32px; align-self:flex-end;">
                                    ✕
                                </button>
                            </div>
                        </div>
                        <span class="badge ${STATUS_BADGE_CLASS[this.caseData.status]}" style="font-size:0.75rem;padding:2px 8px;margin-top:4px;">
                            ${STATUS_NAMES[this.caseData.status]}
                        </span>
                    </div>
                    <div class="review-header-meta">
                        <div class="review-header-hospital">🏥 ${Helpers.escapeHtml(this.caseData.hospitalName || 'ไม่ระบุ')}</div>
                        <div class="review-header-date">📅 สร้างเมื่อ: ${Helpers.formatDateTime(this.caseData.createdAt)}</div>
                        <div class="review-header-inspector">👤 ผู้ทำเรื่อง: ${Helpers.escapeHtml(inspectorName || '-')}</div>
                    </div>
                </div>

                <div class="review-main">
                    <!-- Zone 2: Case Info -->
                    <div class="review-zone">
                        <div class="review-zone-header">
                            <span class="icon">📋</span> ข้อมูลเคส
                        </div>
                        <div class="review-zone-body">
                            <div class="review-info-grid">
                                <div class="review-info-item">
                                    <span class="review-info-label">วันที่เกิดเหตุ</span>
                                    <span class="review-info-value highlight">${Helpers.formatDateTime(this.caseData.accidentDate)}</span>
                                </div>
                                <div class="review-info-item">
                                    <span class="review-info-label">สถานที่เกิดเหตุ</span>
                                    <span class="review-info-value">${Helpers.escapeHtml(this.caseData.accidentLocation || '-')}</span>
                                </div>
                                <div class="review-info-item">
                                    <span class="review-info-label">ตำบล</span>
                                    <span class="review-info-value">${Helpers.escapeHtml(this.caseData.subdistrictCode || '-')}</span>
                                </div>
                                <div class="review-info-item">
                                    <span class="review-info-label">อำเภอ</span>
                                    <span class="review-info-value">${this.getDistrictName(this.caseData.districtCode)}</span>
                                </div>
                                <div class="review-info-item">
                                    <span class="review-info-label">จังหวัด</span>
                                    <span class="review-info-value">${this.getProvinceName(this.caseData.provinceCode)}</span>
                                </div>
                                <div class="review-info-item">
                                    <span class="review-info-label">รถยี่ห้อ / ทะเบียน</span>
                                    <span class="review-info-value">
                                        ${Helpers.escapeHtml(this.caseData.vehicleBrand || '-')} 
                                        (${Helpers.escapeHtml(this.caseData.vehiclePlate || '-')})
                                    </span>
                                </div>
                                <div class="review-info-item">
                                    <span class="review-info-label">กรมธรรม์เลขที่</span>
                                    <span class="review-info-value">${Helpers.escapeHtml(this.caseData.policyNumber || '-')}</span>
                                </div>
                                <div class="review-info-item">
                                    <span class="review-info-label">ระยะเวลาคุ้มครอง</span>
                                    <span class="review-info-value">
                                        ${this.caseData.coverageStartDate ? Helpers.formatDate(this.caseData.coverageStartDate) : '-'} ถึง 
                                        ${this.caseData.coverageEndDate ? Helpers.formatDate(this.caseData.coverageEndDate) : '-'}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Zone 4: Victim Blocks -->
                    ${this.victims.map((victim, index) => this.renderVictimBlock(victim, index)).join('')}

                    <!-- Close Case & Return Buttons -->
                    <div style="margin: 24px 0; display:flex; justify-content:flex-end; gap:16px;">
                        <button class="btn btn-warning" style="padding: 10px 24px; font-size: 1rem; border-radius: 6px; display:flex; align-items:center; gap:8px;" onclick="CaseReviewPage.returnForEdit()">
                            ↩️ ส่งกลับแก้ไข
                        </button>
                        <button class="btn btn-danger" style="padding: 10px 24px; font-size: 1rem; border-radius: 6px; display:flex; align-items:center; gap:8px;" onclick="CaseReviewPage.closeCase()">
                            🔒 ปิดเคส
                        </button>
                    </div>
                </div>
            </div>
        `;
    },

    renderVictimBlock(victim, index) {
        const typeMap = {
            'driver_insured': 'ผู้ขับขี่รถประกัน',
            'passenger_insured': 'ผู้โดยสารรถประกัน',
            'driver_other': 'ผู้ขับขี่รถคู่กรณี',
            'passenger_other': 'ผู้โดยสารรถคู่กรณี',
            'third_party': 'บุคคลภายนอก'
        };
        const typeName = typeMap[victim.type] || victim.typeAbbr || '-';

        return `
            <div class="review-victim-block" id="victim-block-${index}">
                <div class="review-victim-header">
                    <div class="title">
                        <span class="icon">👤</span> 
                        ข้อมูลผู้บาดเจ็บ ลำดับที่ ${index + 1}
                        <span class="badge" style="margin-left:8px;font-weight:normal;background:#e2e8f0;color:#475569;">${typeName}</span>
                        <button class="btn btn-xs btn-outline-primary" onclick="CaseReviewPage.showSignedPDPA(${index})" style="margin-left:8px; border-radius:12px; display:inline-flex; align-items:center; gap:4px; padding: 2px 8px;">
                            🛡️ PDPA
                        </button>
                    </div>
                    <div style="display:flex;gap:4px;align-items:center;">
                        <!-- Amount removed from header -->
                        <!-- Comments button removed as per request -->
                        <button class="btn btn-sm btn-ghost" onclick="CaseReviewPage.openMediaGallery(${index}, 'document')" title="เอกสาร" style="padding:6px 10px; font-size:20px;">📄</button>
                        <button class="btn btn-sm btn-ghost" onclick="CaseReviewPage.openMediaGallery(${index}, 'photo')" title="ภาพถ่าย" style="padding:6px 10px; font-size:20px;">📷</button>
                        <button class="btn btn-sm btn-ghost" onclick="CaseReviewPage.openMediaGallery(${index}, 'video')" title="วิดีโอ" style="padding:6px 10px; font-size:20px;">🎬</button>
                    </div>
                </div>
                
                <div class="review-victim-body">
                    <!-- Left: Victim Data Grid -->
                    <div style="flex: 1; min-width: 0;">
                        <!-- Left: Victim Data Grid -->
                        <div class="victim-data-group">
                            <!-- Group 1: Name -->
                            <div class="review-info-item">
                                <span class="review-info-label">ชื่อ-นามสกุล</span>
                                <span class="review-info-value">
                                    ${Helpers.escapeHtml(victim.titlePrefix || '')} ${Helpers.escapeHtml(victim.firstName || '')} ${Helpers.escapeHtml(victim.lastName || '')}
                                </span>
                            </div>
    
                            <div class="review-info-item">
                                <span class="review-info-label">เลขบัตรประชาชน</span>
                                <span class="review-info-value">${Helpers.escapeHtml(victim.idCard || '-')}</span>
                            </div>
                            <div class="review-info-item">
                                <span class="review-info-label">ที่อยู่</span>
                                <span class="review-info-value">${Helpers.escapeHtml(victim.addressLine || '-')}</span>
                            </div>
                            <div class="review-info-item">
                                <span class="review-info-label">ตำบล</span>
                                <span class="review-info-value">${victim.addressSubdistrict ? 'ต.' + victim.addressSubdistrict : '-'}</span>
                            </div>
                            <div class="review-info-item">
                                <span class="review-info-label">อำเภอ</span>
                                <span class="review-info-value">${victim.addressDistrict ? 'อ.' + victim.addressDistrict : '-'}</span>
                            </div>
                            <div class="review-info-item">
                                <span class="review-info-label">จังหวัด</span>
                                <span class="review-info-value">${victim.addressProvince ? 'จ.' + victim.addressProvince : '-'}</span>
                            </div>
                            <div class="review-info-item">
                                <span class="review-info-label">วันเกิด (อายุ)</span>
                                <span class="review-info-value">
                                    ${victim.birthDay || '-'} 
                                    ${victim.birthMonth ? ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'][parseInt(victim.birthMonth) - 1] || '-' : '-'} 
                                    ${victim.birthYear || '-'} (${victim.age || '-'} ปี)
                                </span>
                            </div>
                            <div class="review-info-item">
                                <span class="review-info-label">เบอร์โทรศัพท์</span>
                                <span class="review-info-value">${Helpers.escapeHtml(victim.phone || '-')}</span>
                            </div>
                            <div class="review-info-item">
                                <span class="review-info-label">ยอดตั้งเบิกเบื้องต้น</span>
                                <span class="review-info-value highlight" style="color:#d97706;">${Helpers.formatCurrency(victim.initialClaimAmount)}</span>
                            </div>
                        </div>

                        <!-- Comments Section -->
                        <div class="review-comments-section" style="margin-top: 20px; border-top: 1px solid var(--border-slate-200); padding-top: 16px;">
                            <div style="font-size: 0.9rem; font-weight: 600; color: var(--text-slate-900); margin-bottom: 8px;">
                                💬 ความเห็น
                            </div>
                            <div style="font-size: 0.85rem; color: var(--text-slate-700);">
                                <div style="margin-bottom: 8px;">
                                    <strong>🏥 ความเห็นจากโรงพยาบาล</strong>
                                    <div style="margin-left: 12px; margin-top: 2px;">= ${Helpers.escapeHtml(victim.hospitalComment || '-')}</div>
                                </div>
                                <div>
                                    <strong>👤 ความเห็นจากพนักงานออกตรวจ</strong>
                                    <div style="margin-left: 12px; margin-top: 2px;">= ${Helpers.escapeHtml(victim.surveyorComment || '-')}</div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Right: Action Panel (Compact) -->
                    <div class="action-panel">
                        <div class="review-zone-header" style="background:transparent;padding:0 0 8px 0;margin-bottom:8px;border:none;">
                            <span style="font-size:0.9rem;font-weight:700;color:#334155;">⚙️ การดำเนินการ</span>
                            <button class="btn btn-sm btn-ghost" onclick="CaseReviewPage.openHistoryPopup(${index})" title="ประวัติการดำเนินการ" style="margin-left:auto;padding:2px 6px;">📜</button>
                        </div>
                        
                        ${this.renderActionContent(victim, index)}
                    </div>
                </div>

            </div>
        `;
    },

    renderActionContent(victim, index) {
        // Updated: Check statuses that should show Read-Only View (The "Disappear" effect)
        // Now includes: Approved, Rejected, Pending Consideration, Data Verification
        const isReadOnly =
            victim.status === CASE_STATUS.APPROVED ||
            victim.status === CASE_STATUS.REJECTED ||
            victim.status === CASE_STATUS.PENDING_CONSIDERATION ||
            victim.status === CASE_STATUS.DATA_VERIFICATION;

        if (isReadOnly) {
            let statusColor, statusBg, statusText;

            // Determine styling based on status
            switch (victim.status) {
                case CASE_STATUS.APPROVED:
                    statusColor = '#10B981'; // Green
                    statusBg = '#ecfdf5';    // Very light green
                    statusText = 'อนุมัติแล้ว';
                    break;
                case CASE_STATUS.REJECTED:
                    statusColor = '#EF4444'; // Red
                    statusBg = '#fef2f2';    // Very light red
                    statusText = 'ไม่อนุมัติ';
                    break;
                case CASE_STATUS.PENDING_CONSIDERATION:
                    statusColor = '#3B82F6'; // Blue
                    statusBg = '#eff6ff';    // Very light blue
                    statusText = 'รอการพิจารณา';
                    break;
                case CASE_STATUS.DATA_VERIFICATION:
                    statusColor = '#3B82F6'; // Blue (Same as Pending per request for "Blue Window")
                    statusBg = '#eff6ff';
                    statusText = 'อยู่ระหว่างตรวจสอบ';
                    break;
                default:
                    statusColor = '#64748B'; // Slate
                    statusBg = '#F1F5F9';
                    statusText = STATUS_NAMES[victim.status] || 'ดำเนินการแล้ว';
            }

            return `
                <div style="background:${statusBg}; border:1px solid ${statusColor}; border-radius:8px; padding:16px; text-align:center;">
                    <div style="font-size:0.8rem; color:${statusColor}; font-weight:600; margin-bottom:4px;">สถานะดำเนินการ</div>
                    <div style="font-size:1.2rem; font-weight:bold; color:${statusColor}; margin-bottom:8px;">
                        ${statusText}
                    </div>
                    ${victim.status === CASE_STATUS.APPROVED ? `
                        <div style="font-size:0.9rem; color:#333; border-top:1px solid rgba(0,0,0,0.05); padding-top:8px; margin-top:8px;">
                            <span style="font-size:0.8rem; color:#666;">ยอดอนุมัติ:</span><br>
                            <strong>${Helpers.formatCurrency(victim.claimAmount)}</strong>
                        </div>
                    ` : ''}
                    ${victim.adminComment ? `
                        <div style="font-size:0.85rem; color:#555; background:rgba(255,255,255,0.6); padding:8px; border-radius:4px; margin-top:8px; text-align:left;">
                            <span style="font-size:0.75rem; color:#888;">หมายเหตุ:</span><br>
                            ${Helpers.escapeHtml(victim.adminComment)}
                        </div>
                    ` : ''}
                    
                    <button class="btn btn-xs btn-ghost" onclick="CaseReviewPage.enableEdit(${index})" style="margin-top:12px; font-size:0.75rem; opacity:0.8; color:${statusColor}; border:1px dashed ${statusColor}; padding: 4px 12px; border-radius: 4px;">
                        ✏️ แก้ไขผลการพิจารณา
                    </button>
                </div>
            `;
        }

        // Default: Editable Form
        return `
            <div id="actionForm_${index}">
                <div class="form-group">
                    <label>สถานะ <span style="color:red">*</span></label>
                    <select id="statusSelect_${index}" class="form-input" onchange="CaseReviewPage.onStatusChange(this.value, ${index})">
                        <option value="">-- เลือก --</option>
                        <option value="${CASE_STATUS.DATA_VERIFICATION}" ${victim.status === CASE_STATUS.DATA_VERIFICATION ? 'selected' : ''}>อยู่ระหว่างตรวจสอบ</option>
                        <option value="${CASE_STATUS.APPROVED}" ${victim.status === CASE_STATUS.APPROVED ? 'selected' : ''}>อนุมัติ</option>
                        <option value="${CASE_STATUS.REJECTED}" ${victim.status === CASE_STATUS.REJECTED ? 'selected' : ''}>ไม่อนุมัติ</option>
                    </select>
                </div>

                <div id="amountField_${index}" class="form-group" style="display:${victim.status === CASE_STATUS.APPROVED || victim.status === CASE_STATUS.REJECTED ? 'block' : 'none'};">
                    <label>ยอดเงินอนุมัติ (บาท)</label>
                    <input type="number" id="approvedAmount_${index}" class="form-input" value="${victim.claimAmount || 0}" min="0" step="0.01">
                </div>

                <div id="reasonField_${index}" class="form-group" style="display:${victim.status ? 'block' : 'none'};">
                    <label id="reasonLabel_${index}">หมายเหตุ</label>
                    <textarea id="decisionReason_${index}" class="form-input" placeholder="ระบุ...">${victim.adminComment || ''}</textarea>
                </div>

                <button class="btn btn-primary btn-compact" onclick="CaseReviewPage.submitDecision(${index})" style="width:100%;margin-top:4px;">
                    บันทึก
                </button>
            </div>
        `;
    },

    enableEdit(index) {
        // Temporarily reset status in local state to force form render (without saving to DB yet)
        // Or just re-render block with a flag.
        // Simplest: update local object status to something else momentarily or add a 'editing' flag.
        // Let's toggle an editing flag on the victim object in typescript style if possible, or just hack it.
        this.victims[index].forceEdit = true;

        // Re-render
        const victimBlock = document.getElementById(`victim-block-${index}`);
        if (victimBlock) {
            // Need to handle forceEdit in renderActionContent
            // Actually, best to just render the form manually into the container.
            const actionPanel = victimBlock.querySelector('.action-panel');
            if (actionPanel) {
                // Determine previous "saved" values to populate form
                const v = this.victims[index];
                actionPanel.innerHTML = `
                    <div class="review-zone-header" style="background:transparent;padding:0 0 8px 0;margin-bottom:8px;border:none;">
                        <span style="font-size:0.9rem;font-weight:700;color:#334155;">⚙️ แก้ไขการดำเนินการ</span>
                        <button class="btn btn-sm btn-ghost" onclick="CaseReviewPage.cancelEdit(${index})" title="ยกเลิก" style="margin-left:auto;padding:2px 6px;">✕</button>
                    </div>
                    <div id="actionForm_${index}">
                        <div class="form-group">
                            <label>สถานะ <span style="color:red">*</span></label>
                            <select id="statusSelect_${index}" class="form-input" onchange="CaseReviewPage.onStatusChange(this.value, ${index})">
                                <option value="">-- เลือก --</option>
                                <option value="${CASE_STATUS.DATA_VERIFICATION}" ${v.status === CASE_STATUS.DATA_VERIFICATION ? 'selected' : ''}>อยู่ระหว่างตรวจสอบ</option>
                                <option value="${CASE_STATUS.APPROVED}" ${v.status === CASE_STATUS.APPROVED ? 'selected' : ''}>อนุมัติ</option>
                                <option value="${CASE_STATUS.REJECTED}" ${v.status === CASE_STATUS.REJECTED ? 'selected' : ''}>ไม่อนุมัติ</option>
                            </select>
                        </div>
                        <div id="amountField_${index}" class="form-group" style="display:block;">
                            <label>ยอดเงินอนุมัติ (บาท)</label>
                            <input type="number" id="approvedAmount_${index}" class="form-input" value="${v.claimAmount || 0}" min="0" step="0.01">
                        </div>
                        <div id="reasonField_${index}" class="form-group" style="display:block;">
                            <label id="reasonLabel_${index}">หมายเหตุ</label>
                            <textarea id="decisionReason_${index}" class="form-input">${v.adminComment || ''}</textarea>
                        </div>
                        <button class="btn btn-primary btn-compact" onclick="CaseReviewPage.submitDecision(${index})" style="width:100%;margin-top:4px;">
                            บันทึก
                        </button>
                    </div>
                `;
            }
        }
    },

    cancelEdit(index) {
        // Just re-render block to restore read-only view
        const victimBlock = document.getElementById(`victim-block-${index}`);
        if (victimBlock) {
            victimBlock.outerHTML = this.renderVictimBlock(this.victims[index], index);
        }
    },

    renderHistoryTimeline(victimIndex = null) {
        let history = this.caseHistory;

        // Filter by victim index if provided
        if (victimIndex !== null) {
            history = history.filter(h => h.victimIndex === victimIndex);
        }

        if (!history || history.length === 0) {
            return '<div style="color:#888;text-align:center;padding:20px;">ยังไม่มีประวัติการดำเนินการ</div>';
        }

        // Sort by time descending
        history.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

        return `
            <div class="review-history-log" style="font-family:'Sarabun', sans-serif; font-size:0.9rem; color:#333; padding:10px;">
                ${history.map((item) => {
            const dateObj = new Date(item.timestamp || new Date());

            // Format Date: 10 ม.ค. 2569
            const months = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
            const day = dateObj.getDate();
            const month = months[dateObj.getMonth()];
            const year = dateObj.getFullYear() + 543;
            const dateStr = `${day} ${month} พ.ศ. ${year}`;

            // Format Time: 09 : 30 น.
            const hour = dateObj.getHours().toString().padStart(2, '0');
            const minute = dateObj.getMinutes().toString().padStart(2, '0');
            const timeStr = `${hour} : ${minute} น.`;

            return `
                    <div style="margin-bottom:16px; padding-bottom:12px; border-bottom:1px solid #eee;">
                        <div style="font-weight:600; font-size:1rem; color:#1e293b; margin-bottom:6px;">
                           ${Helpers.escapeHtml(item.userName || 'ไม่ระบุชื่อ')}
                        </div>
                        <div style="font-size:0.95rem; color:#475569; margin-bottom:6px;">
                           บันทึก : <span style="font-weight:600;color:${this.getStatusColor(item.statusLabel)}">${item.statusLabel || 'มีการแก้ไขข้อมูล'}</span>
                        </div>
                        <div style="font-size:0.85rem; color:#94a3b8;">
                           วันที่ ${dateStr} เวลา ${timeStr}
                        </div>
                    </div>
                    `;
        }).join('')}
            </div>
        `;
    },

    getStatusColor(label) {
        if (!label) return '#333';
        if (label.includes('อนุมัติ') && !label.includes('ไม่')) return '#10B981'; // Green
        if (label.includes('ไม่อนุมัติ')) return '#EF4444'; // Red
        if (label.includes('ตรวจสอบ') || label.includes('พิจารณา')) return '#F59E0B'; // Orange
        return '#333';
    },

    // --- History Popup ---
    openHistoryPopup(victimIndex = null) {
        Modal.show({
            title: '📜 ประวัติการดำเนินการ',
            content: this.renderHistoryTimeline(victimIndex),
            size: 'md'
        });
    },

    // --- PDPA Signed Document Modal ---
    showSignedPDPA(index) {
        const victim = this.victims[index];
        if (!victim) return;

        const signatureImg = victim.signatureData ?
            `<img src="${victim.signatureData}" style="max-height:100px; display:block; margin:0 auto;">` :
            `<div style="color:#999;font-style:italic;">(ไม่มีลายเซ็น)</div>`;

        const timestamp = new Date().toLocaleDateString('th-TH'); // Should ideally use case creation date

        const content = `
            <div id="pdpa-document-content" style="padding:20px; font-family:'Sarabun', sans-serif;">
                <div style="text-align:center; margin-bottom:20px; border-bottom: 2px solid #eee; padding-bottom: 15px;">
                    <h3 style="margin:0; color:#1e3c72; font-size:1.1rem;">บริษัท กลางคุ้มครองผู้ประสบภัยจากรถ จำกัด</h3>
                    <div style="font-size:0.85rem; color:#666; margin-top:5px; line-height:1.4;">
                        เลขที่ 26 ซอย สุขุมวิท 64/2 ถนน สุขุมวิท แขวงพระโขนงใต้ เขตพระโขนง กรุงเทพฯ 10260<br>
                        โทร 0-2100-9191 Call Center 1791
                    </div>
                </div>

                <div style="text-align:center; margin-bottom:20px;">
                    <h4 style="margin:0; font-size:1rem;">หนังสือให้ความยินยอม (PDPA Consent)</h4>
                    <div style="font-size:0.8rem; color:#888;">พระราชบัญญัติคุ้มครองข้อมูลส่วนบุคคล พ.ศ. 2562</div>
                </div>
                
                <div style="font-size:0.95rem; line-height:1.6; color:#333; text-align:justify;">
                    <p>
                        ข้าพเจ้า <strong>${victim.titlePrefix || ''}${victim.firstName} ${victim.lastName}</strong> 
                        (ผู้บาดเจ็บ/ผู้มีอำนาจกระทำการแทน)
                    </p>
                    <p>
                        ขอยินยอมให้ <strong>บริษัท กลางคุ้มครองผู้ประสบภัยจากรถ จำกัด</strong> และบริษัทประกันภัยที่เกี่ยวข้อง 
                        จัดเก็บ รวบรวม ใช้ และเปิดเผยข้อมูลส่วนบุคคลของข้าพเจ้า รวมถึงข้อมูลสุขภาพและข้อมูลที่มีความอ่อนไหว 
                        เพื่อวัตถุประสงค์ในการตรวจสอบและพิจารณาสินไหมทดแทนตามกรมธรรม์ประกันภัย
                    </p>
                    <p>
                        ข้าพเจ้ายืนยันว่าข้อมูลที่ให้ไว้เป็นความจริงทุกประการ และยินยอมให้บริษัททำการตรวจสอบข้อเท็จจริงได้
                    </p>
                </div>

                <div style="margin-top:30px; border-top:1px solid #eee; padding-top:20px; text-align:center;">
                    <div style="margin-bottom:10px;">ลงชื่อผู้ให้ความยินยอม</div>
                    ${signatureImg}
                    <div style="margin-top:5px; font-weight:bold;">(${victim.titlePrefix || ''}${victim.firstName} ${victim.lastName})</div>
                    <div style="font-size:0.85rem; color:#888;">วันที่: ${timestamp}</div>
                </div>
            </div>
            
            <div style="text-align:center; margin-top:20px; padding-top:15px; border-top:1px dashed #ddd;">
                 <button class="btn btn-success" onclick="CaseReviewPage.downloadPDPA()">
                    📥 ดาวน์โหลดเอกสาร
                 </button>
            </div>
        `;

        Modal.show({
            title: '📄 เอกสาร PDPA ที่ลงนามแล้ว',
            content: content,
            size: 'lg'
        });
    },

    downloadPDPA() {
        // Mock download functionality
        // In a real app, this would use html2canvas + jsPDF
        Toast.success('กำลังดาวน์โหลดเอกสาร PDF...');
        setTimeout(() => {
            // Trigger print as a simple "Download PDF" alternative
            const content = document.getElementById('pdpa-document-content');
            if (content) {
                const printWindow = window.open('', '', 'height=600,width=800');
                printWindow.document.write('<html><head><title>PDPA Consent</title>');
                printWindow.document.write('</head><body >');
                printWindow.document.write(content.innerHTML);
                printWindow.document.write('</body></html>');
                printWindow.document.close();
                printWindow.print();
            }
        }, 1000);
    },

    // --- Comments Popup ---
    openComments(victimIndex) {
        const victim = this.victims[victimIndex] || {};
        const hospitalComment = victim.hospitalComment || this.caseData.hospitalComment || 'ไม่มีความเห็น';
        const inspectorComment = victim.inspectorComment || this.caseData.inspectorComment || 'ไม่มีความเห็น';

        Modal.show({
            title: '💬 ความเห็น',
            content: `
                <div style="display:flex;flex-direction:column;gap:20px;">
                    <div style="background:linear-gradient(135deg,#f8f9ff,#fff);padding:20px;border-radius:16px;border-left:5px solid #667eea;">
                        <div style="font-weight:600;color:#667eea;margin-bottom:12px;font-size:1rem;">🏥 ความเห็นจากโรงพยาบาล</div>
                        <div style="color:#333;white-space:pre-wrap;line-height:1.7">${Helpers.escapeHtml(hospitalComment)}</div>
                    </div>
                    <div style="background:linear-gradient(135deg,#f0fff4,#fff);padding:20px;border-radius:16px;border-left:5px solid #38ef7d;">
                        <div style="font-weight:600;color:#11998e;margin-bottom:12px;font-size:1rem;">👤 ความเห็นจากพนักงานออกตรวจ</div>
                        <div style="color:#333;white-space:pre-wrap;line-height:1.7">${Helpers.escapeHtml(inspectorComment)}</div>
                    </div>
                </div>
            `,
            size: 'md'
        });
    },

    // --- Media Gallery Popup using MediaViewer ---
    async openMediaGallery(victimIndex, type) {
        let filteredMedia = [];

        if (type === 'photo') {
            filteredMedia = this.media.filter(m => m.type === 'image' || m.type === 'photo');
        } else if (type === 'video') {
            filteredMedia = this.media.filter(m => m.type === 'video');
        } else if (type === 'document') {
            filteredMedia = this.media.filter(m => m.type === 'document' || m.type === 'file' || m.type === 'pdf');
        }

        // Filter by victim index if applicable
        const hasIndex = this.media.some(m => m.victimIndex !== undefined);
        let mediaItems = [];
        if (hasIndex) {
            mediaItems = filteredMedia.filter(m => m.victimIndex == victimIndex);
        } else {
            mediaItems = filteredMedia;
        }

        if (mediaItems.length === 0) {
            const typeLabels = { 'photo': 'ภาพถ่าย', 'video': 'วิดีโอ', 'document': 'เอกสาร' };
            Toast.info(`ไม่พบ${typeLabels[type] || 'ข้อมูล'}`);
            return;
        }

        // Convert to MediaViewer format
        const viewerItems = mediaItems.map(m => ({
            dataUrl: m.dataUrl,
            name: m.caption || m.name || `ไฟล์`,
            type: type
        }));

        // Open with MediaViewer (cinematic professional popup)
        if (typeof MediaViewer !== 'undefined') {
            MediaViewer.open(viewerItems, 0, type);
        } else {
            // Fallback to old modal if MediaViewer not loaded
            this.currentGalleryData = mediaItems;
            this.currentGalleryType = type;
            this.currentGalleryIndex = 0;
            this.currentRotation = 0;
            this.renderGalleryModal();
        }
    },

    // Fallback gallery modal (used if MediaViewer not available)
    renderGalleryModal() {
        const typeLabels = { 'photo': '📷 ภาพถ่าย', 'video': '🎬 วิดีโอ', 'document': '📄 เอกสาร' };

        Modal.show({
            title: `${typeLabels[this.currentGalleryType] || 'สื่อ'} (${this.currentGalleryIndex + 1}/${this.currentGalleryData.length})`,
            content: this.getGalleryContent(),
            size: 'lg'
        });
    },

    updateGalleryModal() {
        const modalBody = document.querySelector('.modal-body');
        const modalTitle = document.querySelector('.modal-title');
        const typeLabels = { 'photo': '📷 ภาพถ่าย', 'video': '🎬 วิดีโอ', 'document': '📄 เอกสาร' };

        if (modalBody) {
            modalBody.innerHTML = this.getGalleryContent();
        }
        if (modalTitle) {
            modalTitle.textContent = `${typeLabels[this.currentGalleryType] || 'สื่อ'} (${this.currentGalleryIndex + 1}/${this.currentGalleryData.length})`;
        }
    },

    getGalleryContent() {
        const item = this.currentGalleryData[this.currentGalleryIndex];
        const total = this.currentGalleryData.length;
        const isVideo = this.currentGalleryType === 'video';
        const isPhoto = this.currentGalleryType === 'photo';

        let displayContent = '';
        if (isPhoto || this.currentGalleryType === 'document') {
            displayContent = `<img src="${item.dataUrl}" style="max-width:100%;max-height:60vh;object-fit:contain;transition:transform 0.3s;transform:rotate(${this.currentRotation}deg);border-radius:12px;box-shadow:0 4px 20px rgba(0,0,0,0.15);">`;
        } else if (isVideo) {
            displayContent = `<video src="${item.dataUrl}" controls autoplay style="max-width:100%;max-height:60vh;border-radius:12px;box-shadow:0 4px 20px rgba(0,0,0,0.15);"></video>`;
        }

        return `
            <div style="background:linear-gradient(180deg,#f0f2f5 0%,#e8eaed 100%);padding:24px;border-radius:16px;min-height:65vh;display:flex;flex-direction:column;">
                <div style="flex:1;display:flex;align-items:center;justify-content:center;position:relative;">
                    ${total > 1 ? `
                        <button onclick="CaseReviewPage.navGallery(-1)" style="position:absolute;left:10px;width:48px;height:48px;border-radius:50%;background:white;border:none;cursor:pointer;box-shadow:0 4px 15px rgba(0,0,0,0.2);font-size:1.4rem;transition:all 0.2s;" onmouseover="this.style.transform='scale(1.1)'" onmouseout="this.style.transform='scale(1)'">❮</button>
                        <button onclick="CaseReviewPage.navGallery(1)" style="position:absolute;right:10px;width:48px;height:48px;border-radius:50%;background:white;border:none;cursor:pointer;box-shadow:0 4px 15px rgba(0,0,0,0.2);font-size:1.4rem;transition:all 0.2s;" onmouseover="this.style.transform='scale(1.1)'" onmouseout="this.style.transform='scale(1)'">❯</button>
                    ` : ''}
                    ${displayContent}
                </div>
                <div style="display:flex;justify-content:center;align-items:center;gap:12px;margin-top:20px;padding-top:20px;border-top:1px solid #ddd;flex-wrap:wrap;">
                    <span style="color:#666;font-weight:500;background:white;padding:6px 16px;border-radius:20px;">${this.currentGalleryIndex + 1} / ${total}</span>
                    ${!isVideo ? `
                        <button class="btn btn-outline-primary btn-sm" onclick="CaseReviewPage.rotateImage()" style="display:flex;align-items:center;gap:6px;border-radius:20px;">🔄 หมุน 360°</button>
                    ` : ''}
                    <button class="btn btn-success btn-sm" onclick="CaseReviewPage.downloadCurrent()" style="display:flex;align-items:center;gap:6px;border-radius:20px;">⬇️ ดาวน์โหลด</button>
                    <button class="btn btn-outline-secondary btn-sm" onclick="CaseReviewPage.downloadAll()" style="display:flex;align-items:center;gap:6px;border-radius:20px;">📥 ดาวน์โหลดทั้งหมด</button>
                </div>
            </div>
        `;
    },

    navGallery(dir) {
        this.currentGalleryIndex = (this.currentGalleryIndex + dir + this.currentGalleryData.length) % this.currentGalleryData.length;
        this.currentRotation = 0;
        this.updateGalleryModal();
    },

    rotateImage() {
        this.currentRotation = (this.currentRotation + 90) % 360;
        this.updateGalleryModal();
    },

    downloadCurrent() {
        const item = this.currentGalleryData[this.currentGalleryIndex];
        const link = document.createElement('a');
        link.href = item.dataUrl;
        const ext = this.currentGalleryType === 'video' ? 'mp4' : 'jpg';
        link.download = item.caption || `download-${Date.now()}.${ext}`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        Toast.success('กำลังดาวน์โหลด...');
    },

    downloadAll() {
        if (!confirm(`ต้องการดาวน์โหลดไฟล์ทั้งหมด ${this.currentGalleryData.length} ไฟล์?`)) return;

        Toast.info(`กำลังดาวน์โหลด ${this.currentGalleryData.length} ไฟล์...`);
        const ext = this.currentGalleryType === 'video' ? 'mp4' : 'jpg';

        this.currentGalleryData.forEach((item, i) => {
            setTimeout(() => {
                const link = document.createElement('a');
                link.href = item.dataUrl;
                link.download = item.caption || `file-${i + 1}.${ext}`;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
            }, i * 600);
        });
    },

    // --- Decision Logic ---
    onStatusChange(status, index) {
        const amountField = document.getElementById(`amountField_${index}`);
        const reasonField = document.getElementById(`reasonField_${index}`);
        const reasonLabel = document.getElementById(`reasonLabel_${index}`);

        if (!amountField || !reasonField) return;

        // Hide all first by default or just update logic
        // But here we need to show fields based on status

        if (!status) {
            amountField.style.display = 'none';
            reasonField.style.display = 'none';
            return;
        }

        if (status === CASE_STATUS.APPROVED) {
            amountField.style.display = 'block';
            reasonField.style.display = 'block';
            if (reasonLabel) reasonLabel.textContent = 'หมายเหตุการอนุมัติ (ถ้ามี)';
        } else if (status === CASE_STATUS.REJECTED) {
            amountField.style.display = 'block';
            reasonField.style.display = 'block';
            if (reasonLabel) reasonLabel.textContent = 'เหตุผลการไม่อนุมัติ';
        } else if (status === CASE_STATUS.DATA_VERIFICATION) {
            amountField.style.display = 'none';
            reasonField.style.display = 'block';
            if (reasonLabel) reasonLabel.textContent = 'สิ่งที่ต้องการตรวจสอบ / ข้อความถึงพนักงาน';
        } else {
            // Pending Consideration
            amountField.style.display = 'none';
            reasonField.style.display = 'block';
            if (reasonLabel) reasonLabel.textContent = 'บันทึกเพิ่มเติม (ถ้ามี)';
        }
    },

    getProvinceName(code) {
        if (!code) return '-';
        if (typeof THAILAND_PROVINCES !== 'undefined') {
            const province = THAILAND_PROVINCES.find(p => p.code === code);
            return province ? province.name : code;
        }
        return code;
    },

    getDistrictName(code) {
        if (!code || code.length < 4) return code || '-';
        if (typeof THAILAND_DISTRICTS !== 'undefined') {
            try {
                const provinceCode = code.substring(0, 2);
                const districtIndex = parseInt(code.substring(2)) - 1;
                const districts = THAILAND_DISTRICTS[provinceCode];
                if (districts && districts[districtIndex]) {
                    return districts[districtIndex];
                }
            } catch (e) {
                console.error('Error getting district name:', e);
            }
        }
        return code;
    },

    async submitDecision(index) {
        try {
            const statusSelect = document.getElementById(`statusSelect_${index}`);
            const decisionReason = document.getElementById(`decisionReason_${index}`);
            const approvedAmount = document.getElementById(`approvedAmount_${index}`);

            if (!statusSelect) {
                console.error('Status select element not found');
                return;
            }

            const status = statusSelect.value;
            const note = decisionReason ? decisionReason.value : '';
            const amount = approvedAmount ? parseFloat(approvedAmount.value) || 0 : 0;

            if (!status) {
                Toast.error('กรุณาเลือกสถานะการดำเนินการ');
                return;
            }

            // Validation
            if (status === CASE_STATUS.REJECTED && !note.trim()) {
                Toast.error('กรุณาระบุเหตุผลการไม่อนุมัติ');
                return;
            }

            const user = AuthService.getCurrentUserSync();
            if (!user) {
                Toast.error('กรุณาเข้าสู่ระบบใหม่');
                return;
            }

            const confirmed = await Modal.confirm(
                `ยืนยันเปลี่ยนสถานะสำหรับผู้บาดเจ็บรายนี้เป็น "${STATUS_NAMES[status]}"?`,
                { title: 'ยืนยันการบันทึก' }
            );
            if (!confirmed) return;

            // Updated: Save to specific victim in the victims array
            const victim = this.victims[index];
            if (!victim) return;

            // Update victim object
            victim.status = status;
            victim.adminComment = note;
            victim.claimAmount = amount;
            victim.approvedById = user.id;
            victim.approverName = user.fullName;
            victim.approvedAt = new Date().toISOString();

            // Save entire case with updated victims array
            // Assuming DataService.cases.update handles 'victims' field replacement
            await DataService.cases.update(this.caseData.id, {
                victims: this.victims
            });

            // Also log history
            const historyItem = {
                caseId: this.caseData.id,
                action: 'update',
                victimIndex: index, // Track specific victim
                statusLabel: STATUS_NAMES[status], // Store label for history
                details: `อัพเดทสถานะผู้บาดเจ็บ: ${victim.firstName} ${victim.lastName} -> ${STATUS_NAMES[status]}`,
                userId: user.id,
                userName: user.fullName,
                timestamp: new Date().toISOString()
            };

            await DataService.caseHistory.add(historyItem);

            // Update local history immediately
            if (this.caseHistory) {
                this.caseHistory.push(historyItem);
            }

            Toast.success('บันทึกสถานะผู้บาดเจ็บเรียบร้อยแล้ว');

            // Refresh only the specific victim block to maintain layout stability
            const victimBlock = document.getElementById(`victim-block-${index}`);
            if (victimBlock) {
                // Re-render just this block
                victimBlock.outerHTML = this.renderVictimBlock(victim, index);
                Toast.success('บันทึกข้อมูลเรียบร้อยแล้ว');
            } else {
                // Fallback: Refresh full page if partial update fails
                this.render(this.caseData.id).then(html => {
                    const container = document.querySelector('.main-content') || document.getElementById('app');
                    if (container) container.innerHTML = html;
                    Toast.success('บันทึกข้อมูลเรียบร้อยแล้ว');
                });
            }

        } catch (error) {
            console.error('Submit Decision Error:', error);
            Toast.error('เกิดข้อผิดพลาด: ' + (error.message || 'Unknown error'));
        }
    },

    async closeCase() {
        // Validation: Verify all victims have been processed
        // Condition: Status must be APPROVED or REJECTED, and Amount must be specified (allowing 0)
        const validStatuses = [CASE_STATUS.APPROVED, CASE_STATUS.REJECTED];
        const isAllProcessed = this.victims.every(v => {
            const hasValidStatus = validStatuses.includes(v.status);
            // Check if claimAmount is a defined number (allow 0)
            const hasAmount = v.claimAmount !== undefined && v.claimAmount !== null && v.claimAmount !== '';
            return hasValidStatus && hasAmount;
        });

        if (!isAllProcessed) {
            Toast.error('ท่านต้องระบุยอดค่ารักษาพยาบาลก่อน');
            return;
        }

        const confirmed = await Modal.confirm(
            'ยืนยันการปิดเคสนี้? เมื่อปิดเคสแล้วจะไม่สามารถแก้ไขข้อมูลได้อีก',
            { title: 'ยืนยันปิดเคส', type: 'danger' }
        );
        if (!confirmed) return;

        try {
            const user = AuthService.getCurrentUserSync();
            await DataService.cases.update(this.caseData.id, {
                status: CASE_STATUS.CLOSED || 'closed',
                closedAt: new Date().toISOString(),
                closedById: user.id
            });
            Toast.success('ปิดเคสเรียบร้อยแล้ว');
            setTimeout(() => App.navigate(ROUTES.CASES), 1000);
        } catch (e) {
            console.error(e);
            Toast.error('ไม่สามารถปิดเคสได้');
        }
    },

    async returnForEdit() {
        // Confirmation
        const confirmed = await Modal.confirm(
            'ต้องการส่งเคสกลับไปแก้ไขหรือไม่? พนักงานออกตรวจสอบจะสามารถแก้ไขข้อมูลได้อีกครั้ง',
            { title: 'ยืนยันการส่งกลับแก้ไข', type: 'warning' }
        );
        if (!confirmed) return;

        try {
            const user = AuthService.getCurrentUserSync();
            // Update status to PENDING_REVISION ('pending_revision')
            // This triggers the 'Inspect' button in the inspector's case list view (checked in list.js)
            await DataService.cases.update(this.caseData.id, {
                status: CASE_STATUS.PENDING_REVISION || 'pending_revision',
                updatedAt: new Date().toISOString()
            });

            // Log history
            await DataService.caseHistory.add({
                caseId: this.caseData.id,
                action: 'return',
                details: 'ส่งกลับแก้ไข',
                userId: user.id,
                userName: user.fullName
            });

            Toast.success('ส่งกลับแก้ไขเรียบร้อยแล้ว');
            setTimeout(() => App.navigate(ROUTES.CASES), 1000);
        } catch (e) {
            console.error(e);
            Toast.error('ไม่สามารถส่งกลับแก้ไขได้');
        }
    },

    toggleEditCaseNumber(show) {
        const viewMode = document.getElementById('viewModeCaseNumber');
        const editMode = document.getElementById('editModeCaseNumber');
        const input = document.getElementById('editCaseNumberInput');

        if (show) {
            viewMode.style.display = 'none';
            editMode.style.display = 'flex';
            if (input) input.focus();
        } else {
            viewMode.style.display = 'block';
            editMode.style.display = 'none';
            // Reset value if cancelled
            if (input) input.value = this.caseData.caseNumber;
        }
    },

    async saveCaseNumber() {
        const input = document.getElementById('editCaseNumberInput');
        if (!input) return;

        const newNumber = input.value.trim();
        if (!newNumber) {
            Toast.error('กรุณาระบุเลขเคส');
            return;
        }

        try {
            await DataService.cases.update(this.caseData.id, {
                caseNumber: newNumber
            });

            this.caseData.caseNumber = newNumber;

            // Update UI
            const display = document.getElementById('displayCaseNumber');
            if (display) display.textContent = newNumber;

            Toast.success('บันทึกเลขเคสเรียบร้อยแล้ว');
            this.toggleEditCaseNumber(false);

        } catch (e) {
            console.error(e);
            Toast.error('ไม่สามารถบันทึกเลขเคสได้');
        }
    }
};

// Expose to window for inline event handlers
window.CaseReviewPage = CaseReviewPage;
