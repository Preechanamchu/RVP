/**
 * ══════════════════════════════════════════════════════════════════════════
 * AVA - Case Detail Page
 * View complete case information - Modern UI Design
 * ══════════════════════════════════════════════════════════════════════════
 */

const CaseDetailPage = {
    caseHistory: [],

    async render(caseId) {
        const caseData = await DataService.cases.getById(caseId);
        if (!caseData) {
            return '<div class="empty-state"><h4>ไม่พบเคส</h4></div>';
        }

        // Mark as read
        await DataService.cases.markAsRead(caseId);

        const media = await DataService.caseMedia.getByCaseId(caseId);
        this.caseHistory = await DataService.caseHistory.getByCaseId(caseId);
        const victims = caseData.victims || [{
            titlePrefix: caseData.victimTitlePrefix || '',
            firstName: caseData.victimName ? caseData.victimName.split(' ')[0] : '',
            lastName: caseData.victimName ? caseData.victimName.split(' ').slice(1).join(' ') : '',
            idCard: caseData.victimIdCard,
            phone: caseData.victimPhone,
            vehiclePlate: caseData.victimVehiclePlate,
            vehicleProvince: caseData.victimVehicleProvince,
            hospitalComment: caseData.hospitalComment,
            inspectorComment: caseData.inspectorComment || caseData.inspectorCreateComment,
            type: caseData.victimType
        }];

        this.victims = victims;

        let inspectorName = '';
        const currentUser = AuthService.getCurrentUserSync();
        if (currentUser && (currentUser.role === ROLES.ADMIN || currentUser.role === ROLES.SUPER_ADMIN) && caseData.inspectorId) {
            try {
                const inspector = await DataService.users.getById(caseData.inspectorId);
                if (inspector) inspectorName = inspector.fullName;
            } catch (e) {
                console.error('Failed to load inspector info', e);
            }
        }

        return `
            <style>
                .detail-page { max-width: 1200px; margin: 0 auto; }
                .zone { background: white; border-radius: 16px; box-shadow: 0 4px 20px rgba(0,0,0,0.08); margin-bottom: 24px; overflow: hidden; }
                .zone-header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 16px 24px; }
                .zone-header h2 { margin: 0; font-size: 1.1rem; display: flex; align-items: center; gap: 10px; }
                .zone-body { padding: 20px 24px; }
                .info-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 16px; }
                .info-item { display: flex; flex-direction: column; gap: 4px; }
                .info-item .label { font-size: 11px; color: #888; text-transform: uppercase; letter-spacing: 0.5px; }
                .info-item .value { font-size: 10px; color: #333; font-weight: 500; }
                .victim-card { border: 1px solid #e0e0e0; border-radius: 12px; margin-bottom: 16px; overflow: hidden; transition: all 0.3s; }
                .victim-card:hover { box-shadow: 0 8px 25px rgba(0,0,0,0.1); transform: translateY(-2px); }
                .victim-header { background: linear-gradient(90deg, #f8f9fa 0%, #fff 100%); padding: 12px 20px; border-bottom: 1px solid #eee; display: flex; align-items: center; gap: 10px; }
                .victim-header .icon { font-size: 1.5rem; }
                .victim-header .title { font-weight: 600; color: #333; }
                .victim-body { padding: 16px 20px; background: #fafbfc; }
                .victim-info-row { display: flex; flex-wrap: wrap; gap: 20px; row-gap: 12px; }
                .victim-info-item { display: flex; align-items: center; gap: 6px; font-size: 0.9rem; }
                .victim-info-item .lbl { color: #999; font-size: 0.8rem; }
                .victim-info-item .val { color: #333; font-weight: 500; }
                .victim-info-item .type-badge { background: linear-gradient(135deg, #667eea, #764ba2); color: white; padding: 2px 10px; border-radius: 12px; font-size: 0.8rem; }
                .action-bar { display: grid; grid-template-columns: repeat(4, 1fr); border-top: 1px solid #eee; }
                .action-btn { padding: 14px; background: white; border: none; cursor: pointer; display: flex; flex-direction: column; align-items: center; gap: 6px; transition: all 0.2s; border-right: 1px solid #f0f0f0; }
                .action-btn:last-child { border-right: none; }
                .action-btn:hover { background: linear-gradient(180deg, #f8f9ff 0%, #fff 100%); }
                .action-btn .icon { font-size: 1.8rem; }
                .action-btn .text { font-size: 0.75rem; color: #666; font-weight: 500; }
                .back-btn { display: inline-flex; align-items: center; gap: 8px; padding: 10px 20px; background: white; border: 1px solid #ddd; border-radius: 8px; cursor: pointer; font-size: 0.9rem; color: #555; transition: all 0.2s; margin-bottom: 20px; }
                .back-btn:hover { background: #f5f5f5; border-color: #bbb; }
                .case-header-card { background: linear-gradient(135deg, #1e3c72 0%, #2a5298 100%); color: white; border-radius: 16px; padding: 24px 28px; margin-bottom: 24px; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 16px; }
                .case-number { font-size: 15px; font-weight: 700; letter-spacing: 1px; }
                .case-meta { text-align: right; }
                .case-meta .hospital { font-size: 15px; font-weight: 600; margin-bottom: 4px; }
                .case-meta .date { font-size: 12px; opacity: 0.85; }
                .summary-badge { background: rgba(255,255,255,0.2); padding: 8px 16px; border-radius: 20px; display: inline-flex; align-items: center; gap: 8px; font-size: 0.9rem; margin-top: 8px; }
            </style>

            <div class="detail-page">
                <button class="back-btn" onclick="App.navigate('${ROUTES.CASES}')">
                    ${Icons.arrowLeft} กลับรายการเคส
                </button>

                <!-- Zone 1: Case Header -->
                <div class="case-header-card">
                    <div>
                        <div class="case-number">เลข RVP : ${caseData.caseNumber}</div>
                        <div class="summary-badge">👥 ผู้บาดเจ็บ ${victims.length} ท่าน</div>
                    </div>
                    <div class="case-meta">
                        <div class="hospital">🏥 ${Helpers.escapeHtml(caseData.hospitalName || 'ไม่ระบุ')}</div>
                        <div class="date">📅 สร้างเมื่อ: ${Helpers.formatDateTime(caseData.createdAt)}</div>
                        ${(() => {
                const currentUser = AuthService.getCurrentUserSync();
                if (currentUser && (currentUser.role === ROLES.ADMIN || currentUser.role === ROLES.SUPER_ADMIN)) {
                    // We need to fetch inspector name if not already in caseData
                    // Since render is async, we can't easily await here inside the template string function without logic changes.
                    // Better approach: fetch inspector BEFORE return, store in variable.
                    // BUT, to minimize diff, let's look at how render handles async.
                    // render is async. We can fetch before return.
                    return inspectorName ? `<div style="font-size: 12px; opacity: 0.9; margin-top: 4px;">ผู้ทำเรื่อง: ${Helpers.escapeHtml(inspectorName)}</div>` : '';
                }
                return '';
            })()}
                    </div>
                </div>

                <!-- Zone 2: Case Info -->
                <div class="zone">
                    <div class="zone-header">
                        <h2>📋 ข้อมูลเคส</h2>
                    </div>
                    <div class="zone-body">
                        <div class="info-grid">
                            <div class="info-item">
                                <span class="label">วันที่เกิดเหตุ</span>
                                <span class="value">${Helpers.formatDateTime(caseData.accidentDate)}</span>
                            </div>
                            <div class="info-item">
                                <span class="label">ตำบล/แขวง</span>
                                <span class="value">${caseData.subdistrictCode || '-'}</span>
                            </div>
                            <div class="info-item">
                                <span class="label">อำเภอ/เขต</span>
                                <span class="value">${this.getDistrictName(caseData.districtCode) || '-'}</span>
                            </div>
                            <div class="info-item">
                                <span class="label">จังหวัด</span>
                                <span class="value">${this.getProvinceName(caseData.provinceCode) || '-'}</span>
                            </div>
                            <div class="info-item">
                                <span class="label">สถานที่เกิดเหตุ</span>
                                <span class="value">${caseData.accidentLocation || '-'}</span>
                            </div>
                            <div class="info-item">
                                <span class="label">รถยี่ห้อ</span>
                                <span class="value">${caseData.vehicleBrand || '-'}</span>
                            </div>
                            <div class="info-item">
                                <span class="label">ทะเบียนรถ (เคส)</span>
                                <span class="value">${caseData.vehiclePlate || '-'} ${caseData.vehicleProvince || ''}</span>
                            </div>
                            <div class="info-item">
                                <span class="label">กรมธรรม์เลขที่</span>
                                <span class="value">${caseData.policyNumber || '-'}</span>
                            </div>
                            <div class="info-item">
                                <span class="label">ระยะเวลาคุ้มครอง</span>
                                <span class="value">
                                    ${caseData.coverageStartDate ? Helpers.formatDate(caseData.coverageStartDate) : '-'} 
                                    ถึง 
                                    ${caseData.coverageEndDate ? Helpers.formatDate(caseData.coverageEndDate) : '-'}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Zone 3: Victims -->
                <div class="zone">
                    <div class="zone-header" style="background: linear-gradient(135deg, #11998e 0%, #38ef7d 100%); display:flex; justify-content:space-between; align-items:center;">
                        <h2>👤 ข้อมูลผู้บาดเจ็บ (${victims.length} ท่าน)</h2>
                        
                        ${(() => {
                const typeMap = {
                    'driver_insured': 'ผู้ขับขี่รถประกัน',
                    'passenger_insured': 'ผู้โดยสารรถประกัน',
                    'driver_other': 'ผู้ขับขี่รถคู่กรณี',
                    'passenger_other': 'ผู้โดยสารรถคู่กรณี',
                    'third_party': 'บุคคลภายนอก'
                };
                const distinctTypes = [...new Set(victims.map(v => typeMap[v.type] || v.typeAbbr || '-'))].join(', ');
                return distinctTypes ? `<span style="background:rgba(255,255,255,0.2); border-radius:12px; padding:4px 12px; font-size:0.9rem; font-weight:normal;">${distinctTypes}</span>` : '';
            })()}
                    </div>
                    <div class="zone-body">
                        ${victims.map((victim, index) => this.renderVictimCard(victim, index, caseData)).join('')}
                    </div>
                </div>

                 ${caseData.status === CASE_STATUS.APPROVED || caseData.status === CASE_STATUS.REJECTED ? this.renderApprovalResult(caseData) : ''}
            </div>
        `;
    },

    renderVictimCard(victim, index, caseData) {
        const typeMap = {
            'driver_insured': 'ผู้ขับขี่รถประกัน',
            'passenger_insured': 'ผู้โดยสารรถประกัน',
            'driver_other': 'ผู้ขับขี่รถคู่กรณี',
            'passenger_other': 'ผู้โดยสารรถคู่กรณี',
            'third_party': 'บุคคลภายนอก'
        };
        const typeName = typeMap[victim.type] || victim.typeAbbr || '-';

        // Logic for Status Icon and Result Detail
        let resultIcon = '';
        let resultDetail = '';

        if (caseData.status === CASE_STATUS.APPROVED || caseData.status === CASE_STATUS.REJECTED) {
            const approvedAmt = parseFloat(victim.claimAmount || 0);
            const isApproved = (caseData.status === CASE_STATUS.APPROVED && approvedAmt > 0);

            resultIcon = isApproved
                ? `<span style="margin-left:8px; font-size:1.1rem;" title="อนุมัติ">✅</span>`
                : `<span style="margin-left:8px; font-size:1.1rem;" title="ไม่อนุมัติ">❌</span>`;

            const statusText = isApproved ? 'อนุมัติ' : 'ไม่อนุมัติ';
            const statusColor = isApproved ? '#10b981' : '#ef4444';

            resultDetail = `<span style="color:#64748b; font-weight:normal; margin-left:8px;">( <span style="color:${statusColor}">${statusText}</span> : ( ${Helpers.formatCurrency(approvedAmt)} ) )</span>`;
        }

        return `
            <style>
                .victim-inline-row {
                    display: flex; flex-wrap: wrap; gap: 12px; align-items: center;
                    margin-bottom: 8px; font-size: 0.9rem; color: #334155;
                }
                .victim-inline-item { display: flex; gap: 4px; align-items: center; white-space: nowrap; }
                .victim-inline-item .lbl { color: #64748b; font-size: 11px; } /* Updated Header Font Size */
                .victim-inline-item .val { font-weight: 500; color: #0f172a; font-size: 10px; } /* Updated Input Font Size */
                .victim-amount-row {
                    font-size: 1rem; font-weight: 600; color: #334155;
                    margin-top: 8px; border-top: 1px solid #f1f5f9; padding-top: 8px;
                }
                .victim-info-item .lbl { font-size: 11px !important; } /* Force 11px for Header */
                .victim-info-item .val { font-size: 10px !important; } /* Force 10px for Inputs */
            </style>
            <div class="victim-card">
                <div class="victim-header" style="justify-content: space-between;">
                    <div style="display:flex;align-items:center;gap:10px;">
                        <span class="icon">📋</span>
                        <span class="title">ผู้บาดเจ็บ ลำดับที่ ${index + 1}</span>
                        ${resultIcon}
                        <button class="btn btn-xs btn-outline-primary" onclick="CaseDetailPage.showSignedPDPA(${index})" style="margin-left:8px; border-radius:12px; display:inline-flex; align-items:center; gap:4px; padding: 2px 8px;">
                            🛡️ PDPA
                        </button>
                    </div>

                    <div style="display:flex;gap:8px;">
                        <button class="btn btn-sm btn-ghost" onclick="CaseDetailPage.openHistoryPopup(${index})" title="ประวัติการดำเนินการ" style="padding:4px 8px;">
                            <span style="font-size:1.2rem;">📜</span>
                        </button>
                        <button class="btn btn-sm btn-ghost" onclick="CaseDetailPage.openComments('${caseData.id}', ${index})" title="ความเห็น" style="padding:4px 8px;">
                            <span style="font-size:1.2rem;">💬</span>
                        </button>
                        <button class="btn btn-sm btn-ghost" onclick="CaseDetailPage.openMediaGallery('${caseData.id}', ${index}, 'document')" title="เอกสาร" style="padding:4px 8px;">
                            <span style="font-size:1.2rem;">📄</span>
                        </button>
                        <button class="btn btn-sm btn-ghost" onclick="CaseDetailPage.openMediaGallery('${caseData.id}', ${index}, 'photo')" title="ภาพถ่าย" style="padding:4px 8px;">
                            <span style="font-size:1.2rem;">📷</span>
                        </button>
                        <button class="btn btn-sm btn-ghost" onclick="CaseDetailPage.openMediaGallery('${caseData.id}', ${index}, 'video')" title="วิดีโอ" style="padding:4px 8px;">
                            <span style="font-size:1.2rem;">🎬</span>
                        </button>
                    </div>
                </div>
                <div class="victim-body">
                    <div class="victim-inline-row">
                        <div class="victim-inline-item"><span class="lbl">คำนำหน้า:</span> <span class="val">${victim.titlePrefix || '-'}</span></div>
                        <div class="victim-inline-item"><span class="lbl">ชื่อ:</span> <span class="val">${victim.firstName || '-'}</span></div>
                        <div class="victim-inline-item"><span class="lbl">นามสกุล:</span> <span class="val">${victim.lastName || '-'}</span></div>
                        <div class="victim-inline-item"><span class="lbl">เลขบัตรฯ:</span> <span class="val">${victim.idCard || '-'}</span></div>
                        <div class="victim-inline-item"><span class="lbl">เบอร์โทร:</span> <span class="val">${victim.phone || '-'}</span></div>
                    </div>
                        <div class="victim-info-item">
                            <span class="lbl">วันเกิด (อายุ):</span> 
                            <span class="val">
                                ${victim.birthDay || '-'} 
                                ${victim.birthMonth ? ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'][parseInt(victim.birthMonth) - 1] || '-' : '-'} 
                                ${victim.birthYear || '-'} 
                                (${victim.age || '-'} ปี)
                            </span>
                        </div>
                        <div class="victim-info-item" style="flex-basis: 100%;">
                            <span class="lbl">ที่อยู่:</span> 
                            <span class="val">
                                ${Helpers.escapeHtml(victim.addressLine || '')} 
                                ${victim.addressSubdistrict ? 'ต.' + victim.addressSubdistrict : ''} 
                                ${victim.addressDistrict ? 'อ.' + victim.addressDistrict : ''} 
                                ${victim.addressProvince ? 'จ.' + victim.addressProvince : ''}
                            </span>
                        </div>
                        <div class="victim-info-item" style="flex-basis: 100%; margin-top: 8px;">
                            <span class="lbl">ยอดตั้งเบิกเบื้องต้น:</span> 
                            <span class="val" style="color: var(--primary-600); font-weight: bold;">
                                ${Helpers.formatCurrency(victim.initialClaimAmount)} 
                                ${(victim.status === CASE_STATUS.APPROVED || victim.status === CASE_STATUS.REJECTED || caseData.status === CASE_STATUS.APPROVED || caseData.status === CASE_STATUS.REJECTED) ?
                (function () {
                    const approvedAmt = parseFloat(victim.claimAmount || 0);
                    // Check victim status first, then fallback to case status
                    const isApproved = (victim.status === CASE_STATUS.APPROVED) || (caseData.status === CASE_STATUS.APPROVED && approvedAmt > 0 && !victim.status);

                    if (victim.status === CASE_STATUS.REJECTED || (!victim.status && caseData.status === CASE_STATUS.REJECTED)) {
                        return `<span style="color:#64748b; font-weight:normal; margin-left:8px;">( <span style="color:#ef4444">ไม่อนุมัติ</span> : ( ${Helpers.formatCurrency(approvedAmt)} ) )</span>`;
                    } else if (isApproved) {
                        return `<span style="color:#64748b; font-weight:normal; margin-left:8px;">( <span style="color:#10b981">อนุมัติ</span> : ( ${Helpers.formatCurrency(approvedAmt)} ) )</span>`;
                    }
                    return '';
                })() : ''
            }
                            </span>
                        </div>
                    </div>
                </div>
        `;
    },

    renderApprovalResult(caseData) {
        const isApproved = caseData.status === CASE_STATUS.APPROVED;
        return `
            <div class="zone">
                <div class="zone-header" style="background: ${isApproved ? 'linear-gradient(135deg, #11998e, #38ef7d)' : 'linear-gradient(135deg, #eb3349, #f45c43)'};">
                    <h2>${isApproved ? '✅' : '❌'} ผลการพิจารณา</h2>
                </div>
                <div class="zone-body">
                    <div class="info-grid">
                        <div class="info-item">
                            <span class="label">สถานะ</span>
                            <span class="value" style="color:${isApproved ? '#11998e' : '#eb3349'}">${STATUS_NAMES[caseData.status]}</span>
                        </div>
                        ${caseData.approvedAmount ? `
                        <div class="info-item">
                            <span class="label">ยอดอนุมัติ</span>
                            <span class="value" style="color:#11998e;font-size:1.2rem">${Helpers.formatCurrency(caseData.approvedAmount)}</span>
                        </div>
                        ` : ''}
                        <div class="info-item">
                            <span class="label">เหตุผล</span>
                            <span class="value">${caseData.approvalReason || '-'}</span>
                        </div>
                        <div class="info-item">
                            <span class="label">วันที่พิจารณา</span>
                            <span class="value">${Helpers.formatDateTime(caseData.approvedAt)}</span>
                        </div>
                    </div>
                </div>
            </div>
        `;
    },

    async openComments(caseId, victimIndex) {
        const caseData = await DataService.cases.getById(caseId);
        const victim = caseData.victims ? caseData.victims[victimIndex] : caseData;

        const hospitalComment = victim.hospitalComment || caseData.hospitalComment || 'ไม่มีความเห็น';
        const inspectorComment = victim.inspectorComment || victim.inspectorCreateComment || caseData.inspectorComment || 'ไม่มีความเห็น';

        Modal.show({
            title: '💬 ความเห็น',
            content: `
                <div style="display:flex;flex-direction:column;gap:16px;">
                    <div style="background:linear-gradient(135deg,#f8f9ff,#fff);padding:16px;border-radius:12px;border-left:4px solid #667eea;">
                        <div style="font-weight:600;color:#667eea;margin-bottom:8px;">🏥 ความเห็นจากโรงพยาบาล</div>
                        <div style="color:#333;white-space:pre-wrap;line-height:1.6">${Helpers.escapeHtml(hospitalComment)}</div>
                    </div>
                    <div style="background:linear-gradient(135deg,#f8fff8,#fff);padding:16px;border-radius:12px;border-left:4px solid #38ef7d;">
                        <div style="font-weight:600;color:#11998e;margin-bottom:8px;">👤 ความเห็นจากพนักงานออกตรวจ</div>
                        <div style="color:#333;white-space:pre-wrap;line-height:1.6">${Helpers.escapeHtml(inspectorComment)}</div>
                    </div>
                </div>
            `,
            size: 'md'
        });
    },

    currentGalleryData: [],
    currentGalleryType: '',
    currentGalleryIndex: 0,
    currentRotation: 0,

    async openMediaGallery(caseId, victimIndex, type) {
        const allMedia = await DataService.caseMedia.getByCaseId(caseId);

        let filteredMedia = [];
        if (type === 'photo') filteredMedia = allMedia.filter(m => m.type === 'image' || m.type === 'photo');
        else if (type === 'video') filteredMedia = allMedia.filter(m => m.type === 'video');
        else if (type === 'document') filteredMedia = allMedia.filter(m => m.type === 'document' || m.type === 'file' || m.type === 'pdf');

        const hasIndex = allMedia.some(m => m.victimIndex !== undefined);
        let mediaItems = [];
        if (hasIndex) {
            mediaItems = filteredMedia.filter(m => m.victimIndex == victimIndex);
        } else {
            mediaItems = filteredMedia;
        }

        if (mediaItems.length === 0) {
            Toast.info('ไม่พบข้อมูล' + (type === 'photo' ? 'ภาพถ่าย' : type === 'video' ? 'วิดีโอ' : 'เอกสาร'));
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

    renderGalleryModal() {
        Modal.show({
            title: this.getGalleryTitle(),
            content: this.getGalleryContent(),
            size: 'lg'
        });
    },

    updateGalleryModal() {
        const modalBody = document.querySelector('.modal-body');
        if (modalBody) {
            modalBody.innerHTML = this.getGalleryContent();
        }
    },

    getGalleryTitle() {
        const map = { 'photo': '📷 ภาพถ่าย', 'video': '🎬 วิดีโอ', 'document': '📄 เอกสาร' };
        return `${map[this.currentGalleryType] || 'สื่อ'} (${this.currentGalleryIndex + 1}/${this.currentGalleryData.length})`;
    },

    getGalleryContent() {
        const item = this.currentGalleryData[this.currentGalleryIndex];
        const total = this.currentGalleryData.length;

        let displayContent = '';
        if (this.currentGalleryType === 'photo') {
            displayContent = `<img src="${item.dataUrl}" style="max-width:100%;max-height:55vh;object-fit:contain;transition:transform 0.3s;transform:rotate(${this.currentRotation}deg);border-radius:8px;">`;
        } else if (this.currentGalleryType === 'video') {
            displayContent = `<video src="${item.dataUrl}" controls autoplay style="max-width:100%;max-height:55vh;border-radius:8px;"></video>`;
        } else {
            displayContent = `
                <div style="text-align:center;padding:40px">
                    <div style="font-size:5rem;margin-bottom:20px">📄</div>
                    <h3 style="margin-bottom:10px">${Helpers.escapeHtml(item.caption || 'เอกสาร')}</h3>
                    <p style="color:#888">คลิกดาวน์โหลดเพื่อเปิดเอกสาร</p>
                </div>
            `;
        }

        return `
            <div style="background:linear-gradient(180deg,#f0f2f5,#e8eaed);padding:20px;border-radius:12px;min-height:60vh;display:flex;flex-direction:column;">
                <div style="flex:1;display:flex;align-items:center;justify-content:center;position:relative;">
                    ${total > 1 ? `
                        <button onclick="CaseDetailPage.navGallery(-1)" style="position:absolute;left:10px;width:40px;height:40px;border-radius:50%;background:white;border:none;cursor:pointer;box-shadow:0 2px 10px rgba(0,0,0,0.15);font-size:1.2rem;">❮</button>
                        <button onclick="CaseDetailPage.navGallery(1)" style="position:absolute;right:10px;width:40px;height:40px;border-radius:50%;background:white;border:none;cursor:pointer;box-shadow:0 2px 10px rgba(0,0,0,0.15);font-size:1.2rem;">❯</button>
                    ` : ''}
                    ${displayContent}
                </div>
                <div style="display:flex;justify-content:center;align-items:center;gap:12px;margin-top:16px;padding-top:16px;border-top:1px solid #ddd;flex-wrap:wrap;">
                    <span style="color:#666;">${this.currentGalleryIndex + 1} / ${total}</span>
                    ${this.currentGalleryType === 'photo' ? `
                        <button class="btn btn-outline-primary btn-sm" onclick="CaseDetailPage.rotateImage()" style="display:flex;align-items:center;gap:4px;">🔄 หมุน</button>
                    ` : ''}
                    <button class="btn btn-success btn-sm" onclick="CaseDetailPage.downloadCurrent()" style="display:flex;align-items:center;gap:4px;">⬇️ ดาวน์โหลด</button>
                    <button class="btn btn-outline-secondary btn-sm" onclick="CaseDetailPage.downloadAll()" style="display:flex;align-items:center;gap:4px;">📥 ดาวน์โหลดทั้งหมด</button>
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
        link.download = item.caption || `download-${Date.now()}`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        Toast.success('กำลังดาวน์โหลด...');
    },

    downloadAll() {
        if (!confirm(`ต้องการดาวน์โหลดไฟล์ทั้งหมด ${this.currentGalleryData.length} ไฟล์?`)) return;

        Toast.info(`กำลังดาวน์โหลด ${this.currentGalleryData.length} ไฟล์...`);
        this.currentGalleryData.forEach((item, i) => {
            setTimeout(() => {
                const link = document.createElement('a');
                link.href = item.dataUrl;
                link.download = item.caption || `file-${i + 1}`;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
            }, i * 600);
        });
    },

    getProvinceName(code) {
        if (!code) return '-';
        const province = THAILAND_PROVINCES.find(p => p.code === code);
        return province ? province.name : code;
    },

    getDistrictName(code) {
        if (!code || code.length < 4) return code || '-';
        try {
            const provinceCode = code.substring(0, 2);
            const districtIndex = parseInt(code.substring(2)) - 1; // 1-based index to 0-based
            const districts = THAILAND_DISTRICTS[provinceCode];
            if (districts && districts[districtIndex]) {
                return districts[districtIndex];
            }
        } catch (e) {
            console.error('Error getting district name:', e);
        }
        return code;
    },

    renderHistoryTimeline(victimIndex = null) {
        let history = this.caseHistory || [];

        // Filter by victim index if provided
        if (victimIndex !== null) {
            // Use loose quality check (==) to handle string/number mismatch
            history = history.filter(h => h.victimIndex == victimIndex);
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

        const timestamp = new Date().toLocaleDateString('th-TH');

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
                 <button class="btn btn-success" onclick="CaseDetailPage.downloadPDPA()">
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
        Toast.success('กำลังดาวน์โหลดเอกสาร PDF...');
        setTimeout(() => {
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
    }
};
