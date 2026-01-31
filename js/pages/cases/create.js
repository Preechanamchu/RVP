/**
 * ══════════════════════════════════════════════════════════════════════════
 * AVA - Create Case Page (Block-Based Multi-Victim System)
 * Form for creating new verification cases with multiple injured persons
 * ══════════════════════════════════════════════════════════════════════════
 */

// Victim type buttons configuration
const VICTIM_TYPE_BUTTONS = [
    { type: 'driver_insured', label: 'ผู้ขับขี่รถประกัน', icon: '🚗', color: 'primary' },
    { type: 'passenger_insured', label: 'ผู้โดยสารรถประกัน', icon: '👤', color: 'info' },
    { type: 'driver_other', label: 'ผู้ขับขี่รถคู่กรณี', icon: '🚕', color: 'danger' },
    { type: 'passenger_other', label: 'ผู้โดยสารรถคู่กรณี', icon: '🚙', color: 'warning' },
    { type: 'third_party', label: 'บุคคลภายนอก', icon: '🚶', color: 'secondary' }
];

// Title prefixes
const TITLE_PREFIXES = ['นาย', 'นาง', 'นางสาว', 'เด็กชาย', 'เด็กหญิง', 'อื่นๆ'];

// Common Vehicle Brands in Thailand (Cars & Motorcycles)
const VEHICLE_BRANDS = [
    // Cars (Japanese)
    'Toyota', 'Honda', 'Isuzu', 'Mitsubishi', 'Nissan', 'Mazda', 'Suzuki', 'Subaru', 'Lexus',
    // Cars (European)
    'Mercedes-Benz', 'BMW', 'Volvo', 'Audi', 'Porsche', 'Mini', 'Peugeot', 'Volkswagen', 'Land Rover',
    // Cars (American)
    'Ford', 'Chevrolet', 'Jeep', 'Tesla',
    // Cars (Chinese/EV)
    'MG', 'GWM', 'Haval', 'Ora', 'BYD', 'NETA', 'Aion', 'Changan', 'Deepal', 'Wuling', 'Maxus',
    // Cars (Korean)
    'Hyundai', 'Kia',
    // Motorcycles
    'Honda (Bike)', 'Yamaha', 'Kawasaki', 'Suzuki (Bike)', 'Vespa', 'GPX', 'Ryuka', 'Stallions',
    'Ducati', 'BMW Motorrad', 'Harley-Davidson', 'Royal Enfield', 'Triumph', 'Lambretta', 'Keeway', 'Scomadi'
];

const CaseCreatePage = {
    victimBlocks: [],
    victimCounter: 0,
    draftCaseId: null,
    savedBlocks: [],

    async render(params) {
        // Reset state
        // Reset state
        this.victimBlocks = [];
        this.victimCounter = 0;
        this.savedBlocks = [];

        // Normalize params
        // If params comes from Inspect button, it's a string (case ID)
        // If params comes from Drafts page, it's an object { draftId: ... }
        if (typeof params === 'string') {
            this.currentDraftId = null;
            this.editingCaseId = params;
        } else {
            this.currentDraftId = params?.draftId || null;
            this.editingCaseId = params?.caseId || null;
        }

        const hospitals = await DataService.hospitals.getAll();
        const inspectors = await DataService.users.getByRole(ROLES.INSPECTOR);
        const user = AuthService.getCurrentUserSync();
        const isInspector = user?.role === ROLES.INSPECTOR;
        const isSuperAdmin = user?.role === ROLES.SUPER_ADMIN;
        const isAdmin = user?.role === ROLES.ADMIN;
        const shouldHideVictimEntry = isSuperAdmin || isAdmin;

        let draft = null;

        // Priority: Edit Case > Edit Draft
        if (this.editingCaseId) {
            try {
                const existingCase = await DataService.cases.getById(this.editingCaseId);
                if (existingCase) {
                    // Map existing case to draft structure for seamless form filling
                    draft = {
                        ...existingCase,
                        // Ensure victims array structure matches what restore logic expects
                        victims: existingCase.victims || []
                    };

                    // [Inspector Only] Check for local WIP data to prevent data loss on refresh
                    if (isInspector) {
                        try {
                            const localKey = `ava_draft_edit_${this.editingCaseId}`;
                            const localDataStr = localStorage.getItem(localKey);
                            if (localDataStr) {
                                const localData = JSON.parse(localDataStr);
                                // Verify ownership just in case
                                if (localData.userId === user.id) {
                                    draft = { ...draft, ...localData };
                                    // Make sure victims are merged correctly if needed, or just trust localData
                                    // localData.victims should contain the latest state including new blocks
                                    console.log('Restored local WIP data for assigned case');
                                }
                            }
                        } catch (err) {
                            console.warn('Failed to restore local draft:', err);
                        }
                    }
                } else {
                    Toast.error('ไม่พบข้อมูลเคส');
                }
            } catch (e) {
                console.error('Error loading case:', e);
                Toast.error('เกิดข้อผิดพลาดในการโหลดข้อมูลเคส');
            }
        } else if (this.currentDraftId) {
            try {
                draft = await db.get('caseDrafts', this.currentDraftId);
                // Security check: ensure draft belongs to user
                if (draft && draft.userId !== user.id) {
                    draft = null;
                    Toast.error('ไม่สามารถเปิดฉบับร่างนี้ได้');
                }

                // Store loaded draft for afterRender restoration
                this.loadedDraft = draft;
            } catch (e) {
                console.error('Error loading draft from DB:', e);
            }
        }


        // Store for restoration in afterRender
        this.loadedDraft = draft;

        // [Inspector Only] Final Check: separate saved vs active if restored from local
        // This ensures they appear in the correct UI sections
        if (draft && draft.savedBlocks) {
            this.savedBlocks = draft.savedBlocks;
            // Filter out saved blocks from victims array so they aren't rendered as active forms
            if (draft.victims) {
                const savedIds = new Set(this.savedBlocks.map(v => v.id));
                draft.victims = draft.victims.filter(v => !savedIds.has(v.id));
            }
        }

        return `
            <div class="page-header">
                <button class="btn btn-ghost" onclick="App.navigate('${ROUTES.CASES}')">
                    ${Icons.arrowLeft} กลับ
                </button>
                ${(draft && !isAdmin && !isSuperAdmin) ? '<p style="color:var(--warning-600)">พบข้อมูลฉบับร่างที่บันทึกไว้</p>' : ''}
            </div>

            <style>
                /* Hyper-Density Enterprise Theme */
                #createCaseForm .card {
                    margin-bottom: var(--space-3) !important;
                    border: 1px solid #e2e8f0;
                    box-shadow: 0 1px 2px rgba(0,0,0,0.05);
                }
                #createCaseForm .card-body {
                    padding: 16px !important;
                }
                #createCaseForm h4 {
                    font-size: 1rem !important;
                    margin-bottom: 12px !important;
                    border-bottom: 1px solid #eee;
                    padding-bottom: 8px;
                }
                #createCaseForm .form-row {
                    display: grid;
                    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
                    gap: 12px !important;
                    margin-bottom: 12px !important;
                }
                #createCaseForm .form-group {
                    margin-bottom: 0 !important; /* Managed by grid gap */
                }
                #createCaseForm label {
                    font-size: 11px !important;
                    font-weight: 600;
                    color: #475569;
                    margin-bottom: 4px !important;
                    display: block;
                }
                #createCaseForm input[type="text"],
                #createCaseForm input[type="number"],
                #createCaseForm input[type="date"],
                #createCaseForm input[type="datetime-local"],
                #createCaseForm input[type="tel"],
                #createCaseForm select,
                #createCaseForm textarea {
                    height: 32px !important;
                    padding: 4px 8px !important;
                    font-size: 10px !important;
                    border: 1px solid #cbd5e1;
                    border-radius: 4px;
                    background-color: #fff;
                    width: 100%;
                    transition: border-color 0.15s;
                }
                #createCaseForm textarea {
                    height: auto !important;
                    min-height: 80px;
                }
                #createCaseForm input:focus,
                #createCaseForm select:focus {
                    border-color: var(--primary-500);
                    box-shadow: 0 0 0 1px var(--primary-100);
                    outline: none;
                }
                /* Adjust Victim Block Internal Spacing */
                .victim-block {
                    padding: 16px !important;
                    gap: 12px !important;
                }
                .victim-block-header {
                    margin-bottom: 12px !important;
                }
            </style>
            <form id="createCaseForm" onsubmit="CaseCreatePage.handleSubmit(event)">
                <!-- Combined Info Section: Hospital, Location, Date -->
                <div class="card" style="margin-bottom: var(--space-4);">
                    <div class="card-body">
                        <!-- Hospital Info -->
                        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: var(--space-4);">
                            <h4 style="color: var(--primary-600); display: flex; align-items: center; gap: var(--space-2); margin: 0;">
                                🏥 ข้อมูลโรงพยาบาล
                            </h4>
                            
                            <!-- Manual RVP Case Number (Admin/Super Admin) -->
                            <!-- Manual RVP Case Number (Admin/Super Admin) -->
                            <!-- Manual RVP Case Number (Admin/Super Admin) -->
                            ${(() => {
                if (isAdmin || isSuperAdmin || isInspector) {
                    const rvpValue = draft?.caseNumber && !draft.caseNumber.startsWith('AVA') ? draft.caseNumber : '';
                    // Allow Admins, SuperAdmins, AND Inspectors to edit
                    const canEdit = isAdmin || isSuperAdmin || isInspector;
                    const isLocked = !!rvpValue;
                    const isReadOnly = !canEdit || isLocked;

                    return `
                                    <div style="display: flex; align-items: center; gap: 8px; background: #faf5ff; padding: 4px 8px; border-radius: 6px; border: 1px solid #d8b4fe;">
                                        <label for="manualCaseNumber" style="margin: 0; font-size: 11px; color: #6b21a8; font-weight: 500;">เลขเคส RVP:</label>
                                        <div style="position: relative;">
                                            <input type="text" id="manualCaseNumber" name="manualCaseNumber" 
                                                placeholder="${canEdit ? 'ระบุเลข...' : '-'}" 
                                                value="${rvpValue}"
                                                ${isReadOnly ? 'readonly' : ''}
                                                style="width: 120px; padding: 2px 6px; font-size: 11px; border: 1px solid ${isLocked ? '#48bb78' : '#e9d5ff'}; border-radius: 4px; padding-right: 24px; background-color: ${isLocked ? '#f0fff4' : '#fff'};">
                                            
                                            <!-- Lock Icon -->
                                            <div id="caseNumberLockIcon" 
                                                 style="display: ${isLocked && canEdit ? 'block' : 'none'}; position: absolute; right: 6px; top: 50%; transform: translateY(-50%); cursor: pointer; color: var(--success-600); font-size: 10px;"
                                                 title="ดับเบิ้ลคลิกเพื่อแก้ไข"
                                                 ondblclick="CaseCreatePage.toggleCaseNumberLock(false)">
                                                🔒
                                            </div>
                                        </div>

                                        <button type="button" id="saveCaseNumberBtn" class="btn btn-xs btn-primary" 
                                            onclick="CaseCreatePage.toggleCaseNumberLock(true)"
                                            style="padding: 2px 6px; font-size: 10px; height: 24px; min-height: unset; display: ${!isLocked && canEdit ? 'block' : 'none'};">
                                            บันทึก
                                        </button>
                                    </div>`;
                }
                return '';
            })()}
                        </div>
                        <div class="form-row" style="margin-bottom: var(--space-5);">
                            <div class="form-group">
                                <label for="hospitalId">โรงพยาบาล *</label>
                                <select id="hospitalId" name="hospitalId" required>
                                    <option value="">-- เลือกโรงพยาบาล --</option>
                                    ${hospitals.map(h => `<option value="${h.id}" ${draft?.hospitalId === h.id ? 'selected' : ''}>${Helpers.escapeHtml(h.name)}</option>`).join('')}
                                </select>
                            </div>
                            <div class="form-group">
                                <label for="accidentDate">📅 วันที่เกิดเหตุ *</label>
                                <input type="datetime-local" id="accidentDate" name="accidentDate" required value="${draft?.accidentDate ? draft.accidentDate.substring(0, 16) : ''}">
                            </div>
                        </div>
                        
                        <!-- Case Number removed from here -->

                        <!-- Accident Location -->
                        <h4 style="margin-bottom: var(--space-4); color: var(--primary-600); display: flex; align-items: center; gap: var(--space-2);">
                            📍 สถานที่เกิดเหตุ
                        </h4>
                        <div style="display:flex; flex-wrap:wrap; gap:var(--space-3); margin-bottom:var(--space-4);">
                            <div class="form-group" style="flex: 3 1 300px;">
                                <label for="accidentLocation">รายละเอียดสถานที่เกิดเหตุ</label>
                                <input type="text" id="accidentLocation" name="accidentLocation" placeholder="เช่น ถนน..., หน้า..., ใกล้..." value="${draft?.accidentLocation || ''}">
                            </div>
                            <div class="form-group" style="flex: 1 1 140px;">
                                <label for="provinceCode">จังหวัด *</label>
                                <select id="provinceCode" name="provinceCode" required onchange="CaseCreatePage.updateDistricts()">
                                    <option value="">-- เลือกจังหวัด --</option>
                                    ${THAILAND_PROVINCES.map(p => `<option value="${p.code}" ${draft?.provinceCode === p.code ? 'selected' : ''}>${p.name}</option>`).join('')}
                                </select>
                            </div>
                            <div class="form-group" style="flex: 1 1 140px;">
                                <label for="districtCode">อำเภอ/เขต *</label>
                                <select id="districtCode" name="districtCode" required onchange="CaseCreatePage.updateSubdistricts()">
                                    <option value="">-- เลือกจังหวัดก่อน --</option>
                                </select>
                            </div>
                            <div class="form-group" style="flex: 1 1 140px;">
                                <label for="subdistrictCode">ตำบล/แขวง</label>
                                <select id="subdistrictCode" name="subdistrictCode">
                                    <option value="">-- เลือกตำบล/แขวง --</option>
                                </select>
                            </div>
                        </div>

                        <!-- ข้อมูลหลักของรถ -->
                        <div class="form-row">
                            <div class="form-group">
                                <label for="vehicleBrand">รถยี่ห้อ</label>
                                <input type="text" id="vehicleBrand" name="vehicleBrand" list="vehicleBrandList" placeholder="เช่น TOYOTA, HONDA" value="${draft?.vehicleBrand || ''}">
                                <datalist id="vehicleBrandList">
                                    ${VEHICLE_BRANDS.map(brand => `<option value="${brand}">`).join('')}
                                </datalist>
                            </div>
                            <div class="form-group">
                                <label for="vehiclePlate">ทะเบียน</label>
                                <input type="text" id="vehiclePlate" name="vehiclePlate" placeholder="เช่น 1กข 1234" value="${draft?.vehiclePlate || ''}">
                            </div>
                            <div class="form-group">
                                <label for="vehicleProvince">หมวดจังหวัด</label>
                                <select id="vehicleProvince" name="vehicleProvince">
                                    <option value="">-- เลือกจังหวัด --</option>
                                    ${THAILAND_PROVINCES.map(p => `<option value="${p.name}" ${draft?.vehicleProvince === p.name ? 'selected' : ''}>${p.name}</option>`).join('')}
                                </select>
                            </div>
                        </div>
                        <div class="form-row">
                            <div class="form-group">
                                <label for="policyNumber">กรมธรรม์เลขที่</label>
                                <input type="text" id="policyNumber" name="policyNumber" placeholder="เลขที่กรมธรรม์" value="${draft?.policyNumber || ''}">
                            </div>
                            <div class="form-group">
                                <label for="coverageStartDate">วันคุ้มครอง</label>
                                <input type="date" id="coverageStartDate" name="coverageStartDate" value="${draft?.coverageStartDate || ''}">
                            </div>
                            <div class="form-group">
                                <label for="coverageEndDate">สิ้นวันคุ้มครอง</label>
                                <input type="date" id="coverageEndDate" name="coverageEndDate" value="${draft?.coverageEndDate || ''}">
                            </div>
                        </div>


                        
                        <div style="margin-top: var(--space-4); text-align: right; border-top: 1px solid var(--neutral-200); padding-top: var(--space-3);">
                            <button type="button" class="btn btn-outline-success btn-sm" onclick="CaseCreatePage.saveDataOnly()">
                                💾 บันทึกข้อมูลส่วนนี้
                            </button>
                        </div>
                    </div>
                </div>

                <!-- Inspector Assignment (Admin only) -->
                ${isInspector ? `
                    <input type="hidden" id="inspectorId" name="inspectorId" value="${user.id}">
                ` : `
                    <div class="card" style="margin-bottom: var(--space-4);">
                        <div class="card-body">
                            <h4 style="margin-bottom: var(--space-4); color: var(--primary-600);">👤 มอบหมายงาน</h4>
                            <div class="form-row">
                                <div class="form-group">
                                    <label for="inspectorId">พนักงานออกตรวจ *</label>
                                    <select id="inspectorId" name="inspectorId" required>
                                        <option value="">-- เลือกพนักงาน --</option>
                                        ${inspectors.filter(i => i.isActive).map(i =>
                `<option value="${i.id}" ${draft?.inspectorId === i.id ? 'selected' : ''}>${Helpers.escapeHtml(i.fullName)}</option>`
            ).join('')}
                                    </select>
                                </div>
                                <div class="form-group">
                                    <label for="deadline">กำหนดส่ง *</label>
                                    <input type="date" id="deadline" name="deadline" required value="${draft?.deadline || ''}">
                                </div>
                            </div>
                            
                            <div style="margin-top: var(--space-4); text-align: right; border-top: 1px solid var(--neutral-200); padding-top: var(--space-3);">
                                <button type="button" class="btn btn-outline-success btn-sm" onclick="CaseCreatePage.saveDataOnly()">
                                    💾 บันทึกการมอบหมาย
                                </button>
                            </div>
                        </div>
                    </div>
                `}

                <!-- Victim Type Buttons Section -->
                <!-- Victim Type Buttons Section -->
                <!-- Victim Type Buttons Section -->
                <!-- Victim Type Buttons Section -->
                ${(!shouldHideVictimEntry) ? ` 
                <div class="card" style="margin-bottom: var(--space-4);">
                    <div class="card-body">
                        <h4 style="margin-bottom: var(--space-4); color: var(--primary-600); display: flex; align-items: center; gap: var(--space-2);">
                            👥 ข้อมูลผู้บาดเจ็บ
                        </h4>
                        
                        <div class="victim-type-selector">
                            <p style="margin-bottom: 8px; font-size: 11px; color: var(--neutral-600);">เพิ่มข้อมูลผู้บาดเจ็บ:</p>
                            <div class="victim-buttons-grid">
                                ${VICTIM_TYPE_BUTTONS.map(btn => `
                                    <button type="button" class="btn btn-outline-${btn.color} btn-sm" onclick="CaseCreatePage.addVictimBlock('${btn.type}')">
                                        <span style="font-size: 14px;">${btn.icon}</span> ${btn.label}
                                    </button>
                                `).join('')}
                            </div>
                        </div>
                    </div>
                </div>
                ` : ''}

                <!-- Saved Victims Summary -->
                <div id="savedVictimsContainer" class="saved-victims-container" style="margin-bottom: var(--space-4); display: none;">
                    <!-- Saved victim summaries will appear here -->
                </div>

                <!-- Victim Blocks Container -->
                <div id="victimBlocksContainer" class="victim-blocks-container">
                    <!-- Victim blocks will be added here dynamically -->
                </div>

                <!-- Empty State Message -->
                ${isInspector ? `
                <div id="noVictimsMessage" class="card" style="margin-bottom: var(--space-4); display: block;">
                    <div class="card-body" style="text-align: center; padding: var(--space-8);">
                        <div style="font-size: 3rem; margin-bottom: var(--space-3);">👆</div>
                        <h4 style="color: var(--neutral-600); margin-bottom: var(--space-2);">ยังไม่มีผู้บาดเจ็บ</h4>
                        <p style="color: var(--neutral-500); font-size: var(--font-size-sm);">
                            กรุณากดปุ่มด้านบนเพื่อเพิ่มผู้บาดเจ็บอย่างน้อย 1 คน
                        </p>
                    </div>
                </div>
                ` : ''}

                <!-- Submit Buttons -->
                <div class="card">
                    <div class="card-body">
                        <div style="display: flex; gap: var(--space-3); justify-content: flex-end;">
                            <button type="button" class="btn btn-ghost" onclick="App.navigate('${ROUTES.CASES}')">ยกเลิก</button>

                            ${(isInspector && !this.editingCaseId) ? `
                                <button type="button" class="btn btn-outline-primary" onclick="CaseCreatePage.saveDraft()">
                                    💾 บันทึกกล่องงาน
                                </button>
                            ` : ''}

                            <button type="submit" class="btn btn-primary" id="submitBtn">ส่งเคส</button>
                        </div>
                    </div>
                </div>
            </form>
        `;
    },

    /**
     * จัดการคลิกปุ่มสแกน (ใบขับขี่ / บัตรประชาชน)
     * รองรับเลือกภาพได้สูงสุด 2 ภาพต่อครั้ง
     */
    async handleScanClick(blockId, preferredType) {
        try {
            // OcrService handles detailed availability check and mock fallback internally
            // if (typeof OcrService === 'undefined' || !OcrService.isAvailable()) { ... }

            const statusEl = document.getElementById(`${blockId}_scanStatus`);
            if (statusEl) {
                statusEl.textContent = 'กำลังเลือกไฟล์สำหรับสแกน...';
            }

            const input = document.createElement('input');
            input.type = 'file';
            input.accept = 'image/*';
            input.multiple = true;

            input.onchange = async (e) => {
                const files = Array.from(e.target.files || []).slice(0, 2);
                if (files.length === 0) {
                    if (statusEl) statusEl.textContent = '';
                    return;
                }

                if (statusEl) {
                    statusEl.textContent = 'กำลังอ่านข้อมูลจากภาพ...';
                }

                const allFields = {
                    idCard: null,
                    titlePrefix: null,
                    firstName: null,
                    lastName: null,
                    birthDate: null,
                    addressLine: null,
                    addressProvince: null,
                    addressDistrict: null,
                    addressSubdistrict: null
                };

                for (const file of files) {
                    try {
                        const dataUrl = await Helpers.fileToDataUrl(file);
                        const { type, fields } = await OcrService.recognize(dataUrl);

                        // ให้ priority ตามประเภทเอกสารที่กดปุ่ม
                        const weight = (docType) => {
                            if (docType === preferredType) return 3;
                            if (docType === 'unknown') return 1;
                            return 2;
                        };

                        if (fields.idCard && (!allFields.idCard || weight(type) >= 2)) {
                            allFields.idCard = fields.idCard;
                        }

                        // ชื่อ: ให้ใช้ชื่อภาษาไทยก่อน ถ้าไม่มีค่อย fallback เป็นอังกฤษ
                        const fieldFirstName = fields.firstNameTH || fields.firstName || fields.firstNameEN;
                        const fieldLastName = fields.lastNameTH || fields.lastName || fields.lastNameEN;

                        if (fieldFirstName && !allFields.firstName) {
                            allFields.firstName = fieldFirstName;
                        }
                        if (fieldLastName && !allFields.lastName) {
                            allFields.lastName = fieldLastName;
                        }

                        // คำนำหน้า
                        if (fields.titlePrefix && !allFields.titlePrefix) {
                            allFields.titlePrefix = fields.titlePrefix;
                        }

                        // ที่อยู่
                        if (fields.addressLine && !allFields.addressLine) {
                            allFields.addressLine = fields.addressLine;
                        }
                        if (fields.addressProvince && !allFields.addressProvince) {
                            allFields.addressProvince = fields.addressProvince;
                        }
                        if (fields.addressDistrict && !allFields.addressDistrict) {
                            allFields.addressDistrict = fields.addressDistrict;
                        }
                        if (fields.addressSubdistrict && !allFields.addressSubdistrict) {
                            allFields.addressSubdistrict = fields.addressSubdistrict;
                        }
                        if (fields.birthDate && !allFields.birthDate) {
                            allFields.birthDate = fields.birthDate;
                        }
                    } catch (err) {
                        console.error('OCR error for file', file.name, err);
                    }
                }

                // เติมข้อมูลกลับไปที่ฟอร์ม
                if (allFields.idCard) {
                    const idInput = document.getElementById(`${blockId}_idCard`);
                    if (idInput) idInput.value = allFields.idCard.replace(/\D/g, '').slice(0, 13);
                }

                // คำนำหน้า – map ให้ตรงกับตัวเลือกที่มีใน TITLE_PREFIXES
                if (allFields.titlePrefix) {
                    const titleEl = document.getElementById(`${blockId}_titlePrefix`);
                    if (titleEl) {
                        const allowed = TITLE_PREFIXES || [];
                        const matchPrefix = allowed.find(t => allFields.titlePrefix.startsWith(t)) || allFields.titlePrefix;
                        const option = Array.from(titleEl.options).find(o => o.value === matchPrefix);
                        if (option) {
                            titleEl.value = matchPrefix;
                        }
                    }
                }

                if (allFields.firstName) {
                    const firstInput = document.getElementById(`${blockId}_firstName`);
                    if (firstInput && !firstInput.value) firstInput.value = allFields.firstName;
                }
                if (allFields.lastName) {
                    const lastInput = document.getElementById(`${blockId}_lastName`);
                    if (lastInput && !lastInput.value) lastInput.value = allFields.lastName;
                }
                if (allFields.birthDate) {
                    const { day, month, year } = allFields.birthDate;
                    const dayEl = document.getElementById(`${blockId}_birthDay`);
                    const monthEl = document.getElementById(`${blockId}_birthMonth`);
                    const yearEl = document.getElementById(`${blockId}_birthYear`);

                    // Always set date values if available from OCR
                    if (dayEl) dayEl.value = String(day);
                    if (monthEl) monthEl.value = String(month);
                    if (yearEl) yearEl.value = String(year);

                    // Trigger Age Calculation immediately
                    const currentYear = new Date().getFullYear() + 543; // Thai Year
                    const age = currentYear - year;
                    const ageEl = document.getElementById(`${blockId}_age`);
                    if (ageEl) ageEl.value = age;
                }

                // เติมที่อยู่
                if (allFields.addressLine) {
                    const el = document.getElementById(`${blockId}_addressLine`);
                    // Always overwrite with scanned data
                    if (el) el.value = allFields.addressLine;
                }
                if (allFields.addressProvince) {
                    const el = document.getElementById(`${blockId}_addressProvince`);
                    if (el && !el.value) el.value = allFields.addressProvince;
                }
                if (allFields.addressDistrict) {
                    const el = document.getElementById(`${blockId}_addressDistrict`);
                    if (el && !el.value) el.value = allFields.addressDistrict;
                }
                if (allFields.addressSubdistrict) {
                    const el = document.getElementById(`${blockId}_addressSubdistrict`);
                    if (el && !el.value) el.value = allFields.addressSubdistrict;
                }

                if (statusEl) {
                    if (allFields.idCard || allFields.firstName || allFields.birthDate) {
                        statusEl.textContent = 'อ่านข้อมูลจากเอกสารสำเร็จ และนำไปกรอกในฟอร์มแล้ว';
                    } else {
                        statusEl.textContent = 'ไม่สามารถอ่านข้อมูลสำคัญจากเอกสารได้ กรุณากรอกด้วยตนเอง';
                    }
                }
            };

            input.click();
        } catch (error) {
            console.error('handleScanClick error', error);
            Toast.error('เกิดข้อผิดพลาดระหว่างสแกนเอกสาร');
            const statusEl = document.getElementById(`${blockId}_scanStatus`);
            if (statusEl) {
                statusEl.textContent = 'ไม่สามารถอ่านข้อมูลจากเอกสารได้';
            }
        }
    },

    // Get victim type label
    getVictimTypeLabel(type) {
        const found = VICTIM_TYPE_BUTTONS.find(v => v.type === type);
        return found ? `${found.icon} ${found.label}` : type;
    },

    // Get victim type color
    getVictimTypeColor(type) {
        const found = VICTIM_TYPE_BUTTONS.find(v => v.type === type);
        return found ? found.color : 'primary';
    },

    // สร้าง options ปีเกิด (ช่วงประมาณ 80 ปีล่าสุด - แสดงเป็น พ.ศ.)
    renderBirthYearOptions() {
        const currentYearAD = new Date().getFullYear();
        const currentYearBE = currentYearAD + 543;
        const years = [];
        for (let y = currentYearBE; y >= currentYearBE - 80; y--) {
            years.push(`<option value="${y}">${y}</option>`);
        }
        return years.join('');
    },

    onVictimProvinceChange(blockId) {
        const provinceSelect = document.getElementById(`${blockId}_addressProvince`);
        const districtSelect = document.getElementById(`${blockId}_addressDistrict`);
        const subdistrictSelect = document.getElementById(`${blockId}_addressSubdistrict`);

        if (!provinceSelect || !districtSelect) return;

        const provinceCode = provinceSelect.value;

        // Reset district and subdistrict
        districtSelect.innerHTML = '<option value="">-- อำเภอ/เขต --</option>';
        if (subdistrictSelect) subdistrictSelect.innerHTML = '<option value="">-- ตำบล/แขวง --</option>';

        if (!provinceCode) return;

        if (typeof THAILAND_DISTRICTS !== 'undefined' && THAILAND_DISTRICTS[provinceCode]) {
            const districts = THAILAND_DISTRICTS[provinceCode];
            // Store district code as value if possible, but here THAILAND_DISTRICTS values seem to be names strings in array?
            // Wait, previous code used `districts.map(d => ...)`. 
            // In main form: provinceCode + String(index+1).padStart(2,'0') is used as value.
            // But THAILAND_DISTRICTS[provinceCode] might just be array of strings (names). 
            // If main form uses `getDistrictsByProvince`, let's check what it returns. 
            // Actually, in lines 1285+ `getDistrictsByProvince` returns array of names. And value is constructed.
            // In my previous edit I just put `d` as value. This might be inconsistent with main form but sufficient if not saving codes.
            // However, `getSubdistrictsByDistrict` expects a `districtCode`.
            // So I MUST construct districtCode correctly as value!

            // Let's look at `getDistrictsByProvince` usage in `updateDistricts` (line 1293):
            // districts.forEach((name, index) => { const code = provinceCode + String(index + 1).padStart(2, '0'); ... })

            districts.forEach((name, index) => {
                const code = provinceCode + String(index + 1).padStart(2, '0');
                districtSelect.innerHTML += `<option value="${code}">${name}</option>`;
            });
        }
    },

    onVictimDistrictChange(blockId) {
        const districtSelect = document.getElementById(`${blockId}_addressDistrict`);
        const subdistrictSelect = document.getElementById(`${blockId}_addressSubdistrict`);

        if (!districtSelect || !subdistrictSelect) return;

        const districtCode = districtSelect.value;

        // Reset subdistrict
        subdistrictSelect.innerHTML = '<option value="">-- ตำบล/แขวง --</option>';

        if (!districtCode) return;

        if (typeof getSubdistrictsByDistrict === 'function') {
            const subdistricts = getSubdistrictsByDistrict(districtCode);
            if (subdistricts && subdistricts.length > 0) {
                subdistricts.forEach(name => {
                    subdistrictSelect.innerHTML += `<option value="${name}">${name}</option>`;
                });
            }
        }
    },

    // Add a new victim block
    addVictimBlock(type) {
        this.victimCounter++;
        const blockId = `victim_${this.victimCounter}`;

        const victimData = {
            id: blockId,
            type: type,
            titlePrefix: '',
            firstName: '',
            lastName: '',
            idCard: '',
            phone: '',
            // ข้อมูลที่อยู่ผู้บาดเจ็บ
            addressLine: '',
            addressSubdistrict: '',
            addressDistrict: '',
            addressProvince: '',
            // วันเกิดและอายุ
            birthDay: '',
            birthMonth: '',
            birthYear: '',
            age: '',
            hospitalComment: '',
            inspectorComment: '',
            pdpaConsent: false,
            signatureData: null,
            photos: [],
            videos: [],
            documents: []
        };

        this.victimBlocks.push(victimData);

        // Hide empty message
        const noVictimsMsg = document.getElementById('noVictimsMessage');
        if (noVictimsMsg) noVictimsMsg.style.display = 'none';

        // Add the block HTML
        const container = document.getElementById('victimBlocksContainer');
        const blockIndex = this.victimBlocks.length;
        const blockHtml = this.renderVictimBlock(blockId, type, blockIndex);
        container.insertAdjacentHTML('beforeend', blockHtml);

        // Initialize components for this block
        this.initBlockComponents(blockId);

        // Scroll to the new block
        const newBlock = document.getElementById(blockId);
        if (newBlock) {
            newBlock.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }

        Toast.success(`เพิ่มผู้บาดเจ็บ: ${this.getVictimTypeLabel(type)}`);
    },

    // Render a single victim block
    renderVictimBlock(blockId, type, index) {
        const color = this.getVictimTypeColor(type);
        const label = this.getVictimTypeLabel(type);

        return `
            <div id="${blockId}" class="victim-block victim-block-${color}" data-type="${type}">
                <div class="victim-block-header">
                    <div class="victim-block-title">
                        <span class="victim-block-number">#${index}</span>
                        <span class="victim-block-type">${label}</span>
                    </div>
                    <button type="button" class="victim-block-remove" onclick="CaseCreatePage.removeVictimBlock('${blockId}')" title="ลบผู้บาดเจ็บนี้">
                        ✕
                    </button>
                </div>
                <div class="victim-block-body">
                    <!-- Personal Info -->
                    <div class="victim-section">
                        <div style="margin-bottom: var(--space-3); display: flex; align-items: center; justify-content: space-between; gap: var(--space-3);">
                            <h5 style="margin: 0; display: flex; align-items: center; gap: var(--space-2);">
                                📋 ข้อมูลผู้บาดเจ็บ
                            </h5>
                            <div class="scan-buttons-row">
                                <button type="button" class="btn btn-outline btn-sm" onclick="CaseCreatePage.handleScanClick('${blockId}', 'license')">
                                    🪪 สแกนใบขับขี่ (หน้า-หลัง)
                                </button>
                                <button type="button" class="btn btn-outline btn-sm" onclick="CaseCreatePage.handleScanClick('${blockId}', 'idcard')">
                                    🧾 สแกนบัตรประชาชน (หน้า-หลัง)
                                </button>
                            </div>
                        </div>
                        <div id="${blockId}_scanStatus" class="form-hint scan-status"></div>
                        <div class="form-row">
                            <div class="form-group">
                                <label for="${blockId}_titlePrefix">คำนำหน้า *</label>
                                <select id="${blockId}_titlePrefix" name="${blockId}_titlePrefix" required>
                                    <option value="">-- เลือก --</option>
                                    ${TITLE_PREFIXES.map(t => `<option value="${t}">${t}</option>`).join('')}
                                </select>
                            </div>
                            <div class="form-group">
                                <label for="${blockId}_firstName">ชื่อ *</label>
                                <input type="text" id="${blockId}_firstName" name="${blockId}_firstName" placeholder="ชื่อจริง" required>
                            </div>
                            <div class="form-group">
                                <label for="${blockId}_lastName">นามสกุล *</label>
                                <input type="text" id="${blockId}_lastName" name="${blockId}_lastName" placeholder="นามสกุล" required>
                            </div>
                        </div>
                        <div class="form-row">
                            <div class="form-group">
                                <label for="${blockId}_idCard">เลขบัตรประชาชน 13 หลัก *</label>
                                <input type="text" id="${blockId}_idCard" name="${blockId}_idCard" 
                                       pattern="[0-9]{13}" maxlength="13" placeholder="X-XXXX-XXXXX-XX-X" required>
                            </div>
                            <div class="form-group">
                                <label for="${blockId}_phone">เบอร์โทร</label>
                                <input type="tel" id="${blockId}_phone" name="${blockId}_phone" 
                                       maxlength="10" placeholder="0XX-XXX-XXXX">
                            </div>
                        </div>

                        <!-- วันเกิด / อายุ -->
                        <div class="form-row">
                            <div class="form-group">
                                <label for="${blockId}_birthDay">วันเกิด</label>
                                <select id="${blockId}_birthDay" name="${blockId}_birthDay">
                                    <option value="">วัน</option>
                                    ${Array.from({ length: 31 }, (_, i) => `<option value="${i + 1}">${i + 1}</option>`).join('')}
                                </select>
                            </div>
                            <div class="form-group">
                                <label for="${blockId}_birthMonth">เดือนเกิด</label>
                                <select id="${blockId}_birthMonth" name="${blockId}_birthMonth">
                                    <option value="">เดือน</option>
                                    <option value="1">มกราคม</option>
                                    <option value="2">กุมภาพันธ์</option>
                                    <option value="3">มีนาคม</option>
                                    <option value="4">เมษายน</option>
                                    <option value="5">พฤษภาคม</option>
                                    <option value="6">มิถุนายน</option>
                                    <option value="7">กรกฎาคม</option>
                                    <option value="8">สิงหาคม</option>
                                    <option value="9">กันยายน</option>
                                    <option value="10">ตุลาคม</option>
                                    <option value="11">พฤศจิกายน</option>
                                    <option value="12">ธันวาคม</option>
                                </select>
                            </div>
                            <div class="form-group">
                                <label for="${blockId}_birthYear">ปีเกิด</label>
                                <select id="${blockId}_birthYear" name="${blockId}_birthYear">
                                    <option value="">ปี</option>
                                    ${CaseCreatePage.renderBirthYearOptions()}
                                </select>
                            </div>
                            <div class="form-group">
                                <label for="${blockId}_age">อายุ (ปี)</label>
                                <input type="number" id="${blockId}_age" name="${blockId}_age" placeholder="อายุ" min="0" readonly>
                            </div>
                        </div>

                        <!-- ที่อยู่ผู้บาดเจ็บ -->
                        <div style="display:flex; flex-wrap:wrap; gap:var(--space-2); margin-bottom:var(--space-2);">
                            <div class="form-group" style="flex: 3 1 300px;">
                                <label for="${blockId}_addressLine">ที่อยู่</label>
                                <input type="text" id="${blockId}_addressLine" name="${blockId}_addressLine" placeholder="บ้านเลขที่ / หมู่บ้าน / ถนน">
                            </div>
                            <div class="form-group" style="flex: 1 1 140px;">
                                <label for="${blockId}_addressProvince">จังหวัด</label>
                                <select id="${blockId}_addressProvince" name="${blockId}_addressProvince" onchange="CaseCreatePage.onVictimProvinceChange('${blockId}')">
                                    <option value="">-- จังหวัด --</option>
                                    ${THAILAND_PROVINCES.map(p => `<option value="${p.code}">${p.name}</option>`).join('')}
                                </select>
                            </div>
                            <div class="form-group" style="flex: 1 1 140px;">
                                <label for="${blockId}_addressDistrict">อำเภอ/เขต</label>
                                <select id="${blockId}_addressDistrict" name="${blockId}_addressDistrict" onchange="CaseCreatePage.onVictimDistrictChange('${blockId}')">
                                    <option value="">-- อำเภอ/เขต --</option>
                                </select>
                            </div>
                            <div class="form-group" style="flex: 1 1 140px;">
                                <label for="${blockId}_addressSubdistrict">ตำบล/แขวง</label>
                                <select id="${blockId}_addressSubdistrict" name="${blockId}_addressSubdistrict">
                                    <option value="">-- ตำบล/แขวง --</option>
                                </select>
                            </div>
                        </div>
                    </div>

                    <!-- Comments -->
                    <div class="victim-section">
                        <h5 style="margin-bottom: var(--space-3); display: flex; align-items: center; gap: var(--space-2);">
                            💬 ความเห็น
                        </h5>
                        <div class="form-group">
                            <label for="${blockId}_hospitalComment">ความเห็นจากโรงพยาบาล</label>
                            <textarea id="${blockId}_hospitalComment" name="${blockId}_hospitalComment" rows="3" 
                                      placeholder="รายละเอียด/ความเห็นจากโรงพยาบาลเกี่ยวกับผู้บาดเจ็บ"></textarea>
                        </div>
                        <div class="form-group">
                            <label for="${blockId}_inspectorComment">ความเห็นจากพนักงานออกตรวจ</label>
                            <textarea id="${blockId}_inspectorComment" name="${blockId}_inspectorComment" rows="3" 
                                      placeholder="ความเห็นเบื้องต้นจากพนักงาน (ถ้ามี)"></textarea>
                        </div>
                        <div class="form-group">
                            <label for="${blockId}_initialClaimAmount">ยอดตั้งเบิกเบื้องต้น (บาท) *</label>
                            <input type="number" id="${blockId}_initialClaimAmount" name="${blockId}_initialClaimAmount" 
                                   placeholder="0" min="0" step="0.01" required>
                        </div>
                    </div>

                    <!-- Attachments -->
                    <div class="victim-section">
                        <h5 style="margin-bottom: var(--space-3); display: flex; align-items: center; gap: var(--space-2);">
                            📎 แนบไฟล์
                        </h5>
                        
                        <!-- Photos -->
                        <div class="attachment-group">
                            <label>📷 แนบภาพ (สูงสุด 100 ภาพ) / รองรับ JPG, PNG, WEBP, PDF</label>
                            <div id="${blockId}_photos" class="media-upload-area media-upload-area-inline"></div>
                        </div>

                        <!-- Videos -->
                        <div class="attachment-group">
                            <label>🎬 แนบวิดีโอ (สูงสุด 50GB) / รองรับ MP4, MOV, AVI, WMV, FLV, WEBM</label>
                            <div id="${blockId}_videos" class="media-upload-area media-upload-area-inline"></div>
                        </div>

                        <!-- Documents -->
                        <div class="attachment-group">
                            <label>📄 แนบเอกสาร (PDF, Word, Excel)</label>
                            <div id="${blockId}_documents" class="media-upload-area media-upload-area-inline"></div>
                        </div>
                    </div>

                    <!-- PDPA Consent -->
                    <div class="victim-section">
                        <div class="pdpa-checkbox">
                            <input type="checkbox" id="${blockId}_pdpa" name="${blockId}_pdpa">
                            <label for="${blockId}_pdpa">
                                ผู้บาดเจ็บ/ผู้แทนยินยอมให้เปิดเผยข้อมูลตาม 
                                <a href="#" onclick="CaseCreatePage.showPDPA(); return false;">PDPA</a>
                            </label>
                        </div>
                    </div>

                    <!-- Signature -->
                    <div class="victim-section">
                        <h5 style="margin-bottom: var(--space-3); display: flex; align-items: center; gap: var(--space-2);">
                            ✍️ ลายเซ็นออนไลน์
                        </h5>
                        <div id="${blockId}_signature_wrapper">
                            <!-- Canvas Mode -->
                            <div id="${blockId}_signature" class="signature-container"></div>
                            
                            <!-- Preview Mode (Hidden by default) -->
                            <div id="${blockId}_signature_preview_container" style="display:none; border: 2px solid var(--success-300); border-radius: var(--radius-md); background: #fff; padding: 10px; text-align: center;">
                                <p style="color:var(--success-600); font-size:var(--font-size-sm); margin-bottom:5px;">✅ มีลายเซ็นเดิมอยู่แล้ว</p>
                                <img id="${blockId}_signature_preview" src="" alt="Existing Signature" style="max-width: 100%; height: 180px; object-fit: contain;">
                                <div style="margin-top: 10px;">
                                    <button type="button" class="btn btn-outline-warning btn-sm" onclick="CaseCreatePage.handleResign('${blockId}')">
                                        ✏️ เซ็นใหม่ (ลบลายเซ็นเดิม)
                                    </button>
                                </div>
                            </div>
                            <input type="hidden" id="${blockId}_existing_signature" value="">
                        </div>
                    </div>

                    <!-- Save Block Button -->
                    <div class="victim-section" style="border-bottom: none; text-align: center; padding-top: var(--space-4);">
                        <button type="button" class="btn btn-success" style="min-width: 200px;" onclick="CaseCreatePage.saveVictimBlock('${blockId}')">
                            ✓ บันทึกข้อมูลผู้บาดเจ็บนี้
                        </button>
                    </div>
                </div>
            </div>
        `;
    },

    // Save and collapse a victim block
    saveVictimBlock(blockId) {
        const victimData = this.collectVictimData(blockId);
        if (!victimData) {
            Toast.error('ไม่พบข้อมูลผู้บาดเจ็บ');
            return;
        }

        // Validate required fields
        if (!victimData.titlePrefix || !victimData.firstName || !victimData.lastName || !victimData.idCard) {
            Toast.error('กรุณากรอกข้อมูล คำนำหน้า, ชื่อ, นามสกุล และเลขบัตรประชาชน');
            return;
        }

        // Validate PDPA
        if (!victimData.pdpaConsent) {
            Toast.error('กรุณายืนยัน PDPA');
            return;
        }

        // Validate initialClaimAmount (required, can be 0)
        const initialClaimInput = document.getElementById(`${blockId}_initialClaimAmount`);
        if (initialClaimInput && initialClaimInput.value === '') {
            Toast.error('กรุณากรอกยอดตั้งเบิกเบื้องต้น (สามารถใส่ 0 ได้)');
            initialClaimInput.focus();
            return;
        }

        // Add to saved blocks
        this.savedBlocks.push(victimData);

        // Remove from active blocks
        this.victimBlocks = this.victimBlocks.filter(v => v.id !== blockId);

        // Remove the block from DOM
        const blockElement = document.getElementById(blockId);
        if (blockElement) {
            blockElement.remove();
        }

        // Render saved victim summary
        this.renderSavedVictims();

        // Update block numbers for remaining blocks
        this.updateBlockNumbers();

        // Show/hide empty message
        const noVictimsMsg = document.getElementById('noVictimsMessage');
        if (this.victimBlocks.length === 0 && this.savedBlocks.length === 0 && noVictimsMsg) {
            noVictimsMsg.style.display = 'block';
        }

        // Auto-save to draft (Silent)
        this.saveDraft(false);

        Toast.success(`บันทึกข้อมูล ${victimData.firstName} ${victimData.lastName} เรียบร้อย`);
    },

    // Render saved victims summary
    renderSavedVictims() {
        const container = document.getElementById('savedVictimsContainer');
        if (!container) return;

        if (this.savedBlocks.length === 0) {
            container.style.display = 'none';
            return;
        }

        container.style.display = 'block';
        container.innerHTML = `
            <div class="card">
                <div class="card-body">
                    <h4 style="margin-bottom: var(--space-4); color: var(--success-600); display: flex; align-items: center; gap: var(--space-2);">
                        ✅ ผู้บาดเจ็บที่บันทึกแล้ว (${this.savedBlocks.length} คน)
                    </h4>
                    <div class="saved-victims-list">
                        ${this.savedBlocks.map((victim, index) => `
                            <div class="saved-victim-item" style="display: flex; align-items: center; justify-content: space-between; padding: var(--space-3); background: var(--success-50); border-radius: var(--radius-lg); margin-bottom: var(--space-2); border-left: 4px solid var(--success-500);">
                                <div style="display: flex; align-items: center; gap: var(--space-3);">
                                    <span style="background: var(--success-500); color: white; padding: var(--space-1) var(--space-3); border-radius: var(--radius-full); font-size: var(--font-size-sm); font-weight: bold;">#${index + 1}</span>
                                    <div>
                                        <strong>${victim.titlePrefix}${victim.firstName} ${victim.lastName}</strong>
                                        <div style="font-size: var(--font-size-sm); color: var(--neutral-500);">
                                            ${this.getVictimTypeLabel(victim.type)} | ${victim.idCard}
                                            ${victim.addressProvince ? ` | จ.${victim.addressProvince}` : ''}
                                        </div>
                                    </div>
                                </div>
                                <div style="display: flex; gap: var(--space-2);">
                                    <button type="button" class="btn btn-ghost btn-sm" onclick="CaseCreatePage.editSavedVictim(${index})" title="แก้ไข">
                                        ✏️ แก้ไข
                                    </button>
                                    <button type="button" class="btn btn-ghost btn-sm" style="color: var(--danger-500);" onclick="CaseCreatePage.removeSavedVictim(${index})" title="ลบ">
                                        🗑️ ลบ
                                    </button>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>
            </div>
        `;
    },

    // Edit a saved victim (move back to active blocks)
    editSavedVictim(index) {
        const victim = this.savedBlocks[index];
        if (!victim) return;

        // Remove from saved blocks
        this.savedBlocks.splice(index, 1);

        // Add back to active blocks
        this.addVictimBlock(victim.type);

        // Restore data to the new block
        setTimeout(() => {
            const newBlockId = this.victimBlocks[this.victimBlocks.length - 1]?.id;
            if (newBlockId) {
                // Restore form fields
                const fields = [
                    'titlePrefix',
                    'firstName',
                    'lastName',
                    'idCard',
                    'phone',
                    'birthDay',
                    'birthMonth',
                    'birthYear',
                    'age',
                    'addressLine',
                    'addressProvince',
                    'addressDistrict',
                    'addressSubdistrict',
                    'hospitalComment',
                    'inspectorComment',
                    'initialClaimAmount'
                ];
                fields.forEach(field => {
                    const el = document.getElementById(`${newBlockId}_${field}`);
                    if (el && victim[field]) {
                        el.value = victim[field];
                    }
                });

                // FIX: Explicitly trigger cascading for address fields
                if (victim.addressProvince) {
                    this.onVictimProvinceChange(newBlockId);
                    // Re-set district after options populated
                    const distEl = document.getElementById(`${newBlockId}_addressDistrict`);
                    if (distEl && victim.addressDistrict) {
                        distEl.value = victim.addressDistrict;
                        this.onVictimDistrictChange(newBlockId);
                        // Re-set subdistrict after options populated
                        const subEl = document.getElementById(`${newBlockId}_addressSubdistrict`);
                        if (subEl && victim.addressSubdistrict) {
                            subEl.value = victim.addressSubdistrict;
                        }
                    }
                }

                // Restore PDPA checkbox
                const pdpaEl = document.getElementById(`${newBlockId}_pdpa`);
                if (pdpaEl) pdpaEl.checked = victim.pdpaConsent;

                // Restore signature if exists
                if (victim.signatureData) {
                    const signatureCanvas = document.querySelector(`#${newBlockId}_signature canvas`);
                    if (signatureCanvas) {
                        const ctx = signatureCanvas.getContext('2d');
                        const img = new Image();
                        img.onload = function () {
                            ctx.drawImage(img, 0, 0, signatureCanvas.width, signatureCanvas.height);
                        };
                        img.src = victim.signatureData;
                    }
                    // Also update victimData to keep track of signature
                    const newVictimData = this.victimBlocks.find(v => v.id === newBlockId);
                    if (newVictimData) {
                        newVictimData.signatureData = victim.signatureData;
                    }
                }

                // Restore photos, videos, and documents
                const newVictimData = this.victimBlocks.find(v => v.id === newBlockId);
                if (newVictimData) {
                    // Restore photos
                    if (victim.photos && victim.photos.length > 0) {
                        newVictimData.photos = [...victim.photos];
                        MediaUpload.restoreFiles(`${newBlockId}_photos`, victim.photos);
                    }
                    // Restore videos
                    if (victim.videos && victim.videos.length > 0) {
                        newVictimData.videos = [...victim.videos];
                        MediaUpload.restoreFiles(`${newBlockId}_videos`, victim.videos);
                    }
                    // Restore documents
                    if (victim.documents && victim.documents.length > 0) {
                        newVictimData.documents = [...victim.documents];
                        MediaUpload.restoreFiles(`${newBlockId}_documents`, victim.documents);
                    }
                }
            }
        }, 150);

        // Re-render saved victims
        this.renderSavedVictims();
    },

    // Remove a saved victim
    removeSavedVictim(index) {
        Modal.show({
            title: 'ยืนยันการลบ',
            content: '<p>คุณต้องการลบข้อมูลผู้บาดเจ็บที่บันทึกไว้นี้หรือไม่?</p>',
            footer: `
                <button class="btn btn-ghost" onclick="Modal.closeAll()">ยกเลิก</button>
                <button class="btn btn-danger" onclick="CaseCreatePage.confirmRemoveSavedVictim(${index})">ลบ</button>
            `
        });
    },

    // Confirm remove saved victim
    confirmRemoveSavedVictim(index) {
        Modal.closeAll();
        this.savedBlocks.splice(index, 1);
        this.renderSavedVictims();

        // Show empty message if no victims
        if (this.victimBlocks.length === 0 && this.savedBlocks.length === 0) {
            const noVictimsMsg = document.getElementById('noVictimsMessage');
            if (noVictimsMsg) noVictimsMsg.style.display = 'block';
        }

        Toast.success('ลบข้อมูลผู้บาดเจ็บเรียบร้อย');
    },

    // Initialize components for a block
    initBlockComponents(blockId) {
        const victimData = this.victimBlocks.find(v => v.id === blockId);
        if (!victimData) return;

        // Initialize Signature Pad
        SignaturePad.init(`${blockId}_signature`, {
            onEnd: (dataUrl) => {
                victimData.signatureData = dataUrl;
            }
        });

        // Initialize Media Uploads
        MediaUpload.init(`${blockId}_photos`, {
            acceptTypes: CONFIG.ALLOWED_IMAGE_TYPES,
            maxCount: 100,
            onChange: (files) => victimData.photos = files
        });

        MediaUpload.init(`${blockId}_videos`, {
            acceptTypes: CONFIG.ALLOWED_VIDEO_TYPES,
            maxCount: 10,
            onChange: (files) => victimData.videos = files
        });

        MediaUpload.init(`${blockId}_documents`, {
            acceptTypes: ['application/pdf', 'application/msword',
                'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                'application/vnd.ms-excel',
                'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'],
            maxCount: 20,
            onChange: (files) => victimData.documents = files
        });

        // ตั้ง event สำหรับคำนวณอายุจากวันเกิด
        this.initBirthdateListeners(blockId);
    },

    // ผูก event เพื่อคำนวณอายุอัตโนมัติเมื่อเลือกวัน/เดือน/ปีเกิด
    initBirthdateListeners(blockId) {
        const dayEl = document.getElementById(`${blockId}_birthDay`);
        const monthEl = document.getElementById(`${blockId}_birthMonth`);
        const yearEl = document.getElementById(`${blockId}_birthYear`);

        const handler = () => {
            const day = parseInt(dayEl?.value || '', 10);
            const month = parseInt(monthEl?.value || '', 10);
            const year = parseInt(yearEl?.value || '', 10);

            if (!day || !month || !year) {
                const ageEl = document.getElementById(`${blockId}_age`);
                if (ageEl) ageEl.value = '';
                return;
            }

            // แปลงปี พ.ศ. -> ค.ศ. เมื่อคำนวณวันที่จริง
            const yearAD = year > 2400 ? year - 543 : year;

            const birthDate = new Date(yearAD, month - 1, day);
            const today = new Date();
            let age = today.getFullYear() - birthDate.getFullYear();
            const m = today.getMonth() - birthDate.getMonth();
            if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
                age--;
            }
            const ageEl = document.getElementById(`${blockId}_age`);
            if (ageEl && !Number.isNaN(age) && age >= 0 && age <= 130) {
                ageEl.value = age;
            }
        };

        ['change', 'input'].forEach(evt => {
            if (dayEl) dayEl.addEventListener(evt, handler);
            if (monthEl) monthEl.addEventListener(evt, handler);
            if (yearEl) yearEl.addEventListener(evt, handler);
        });
    },

    // Remove a victim block
    removeVictimBlock(blockId) {
        Modal.show({
            title: 'ยืนยันการลบ',
            content: '<p>คุณต้องการลบข้อมูลผู้บาดเจ็บนี้หรือไม่?</p>',
            footer: `
                <button class="btn btn-ghost" onclick="Modal.closeAll()">ยกเลิก</button>
                <button class="btn btn-danger" onclick="CaseCreatePage.confirmRemoveVictimBlock('${blockId}')">ลบ</button>
            `
        });
    },

    // Confirm remove victim block
    confirmRemoveVictimBlock(blockId) {
        Modal.closeAll();

        // Remove from array
        this.victimBlocks = this.victimBlocks.filter(v => v.id !== blockId);

        // Remove from DOM
        const blockElement = document.getElementById(blockId);
        if (blockElement) {
            blockElement.remove();
        }

        // Update block numbers
        this.updateBlockNumbers();

        // Show empty message if no victims
        if (this.victimBlocks.length === 0) {
            const noVictimsMsg = document.getElementById('noVictimsMessage');
            if (noVictimsMsg) noVictimsMsg.style.display = 'block';
        }

        Toast.success('ลบผู้บาดเจ็บเรียบร้อย');
    },

    // Update block numbers after removal
    updateBlockNumbers() {
        const blocks = document.querySelectorAll('.victim-block');
        blocks.forEach((block, index) => {
            const numberEl = block.querySelector('.victim-block-number');
            if (numberEl) {
                numberEl.textContent = `#${index + 1}`;
            }
        });
    },

    // Collect victim data from form
    collectVictimData(blockId) {
        const victimData = this.victimBlocks.find(v => v.id === blockId);
        if (!victimData) return null;

        // Get signature data
        const signatureCanvas = document.querySelector(`#${blockId}_signature canvas`);
        let signatureData = null;

        // Check for existing signature first (Preview Mode)
        const existingSigInput = document.getElementById(`${blockId}_existing_signature`);
        if (existingSigInput && existingSigInput.value) {
            signatureData = existingSigInput.value;
        }
        // Otherwise check Canvas (Edit Mode)
        else if (signatureCanvas) {
            signatureData = signatureCanvas.toDataURL();
            // Check if signature is empty (just white canvas)
            const ctx = signatureCanvas.getContext('2d');
            const pixels = ctx.getImageData(0, 0, signatureCanvas.width, signatureCanvas.height).data;
            const hasDrawing = pixels.some((pixel, index) => index % 4 === 3 && pixel !== 0); // Check alpha channel
            if (!hasDrawing) signatureData = null;
        }

        return {
            id: blockId,
            type: victimData.type,
            titlePrefix: document.getElementById(`${blockId}_titlePrefix`)?.value || '',
            firstName: document.getElementById(`${blockId}_firstName`)?.value || '',
            lastName: document.getElementById(`${blockId}_lastName`)?.value || '',
            idCard: document.getElementById(`${blockId}_idCard`)?.value || '',
            phone: document.getElementById(`${blockId}_phone`)?.value || '',
            addressLine: document.getElementById(`${blockId}_addressLine`)?.value || '',
            addressProvince: document.getElementById(`${blockId}_addressProvince`)?.value || '',
            addressDistrict: document.getElementById(`${blockId}_addressDistrict`)?.value || '',
            addressSubdistrict: document.getElementById(`${blockId}_addressSubdistrict`)?.value || '',
            birthDay: document.getElementById(`${blockId}_birthDay`)?.value || '',
            birthMonth: document.getElementById(`${blockId}_birthMonth`)?.value || '',
            birthYear: document.getElementById(`${blockId}_birthYear`)?.value || '',
            age: document.getElementById(`${blockId}_age`)?.value || '',
            hospitalComment: document.getElementById(`${blockId}_hospitalComment`)?.value || '',
            inspectorComment: document.getElementById(`${blockId}_inspectorComment`)?.value || '',
            initialClaimAmount: parseFloat(document.getElementById(`${blockId}_initialClaimAmount`)?.value) || 0,
            pdpaConsent: document.getElementById(`${blockId}_pdpa`)?.checked || false,
            signatureData: signatureData,
            photos: victimData.photos || [],
            videos: victimData.videos || [],
            documents: victimData.documents || []
        };
    },

    updateDistricts() {
        const provinceCode = document.getElementById('provinceCode').value;
        const districtSelect = document.getElementById('districtCode');
        const subdistrictSelect = document.getElementById('subdistrictCode');

        const districts = getDistrictsByProvince(provinceCode);

        districtSelect.innerHTML = '<option value="">-- เลือกอำเภอ/เขต --</option>';
        if (subdistrictSelect) subdistrictSelect.innerHTML = '<option value="">-- เลือกตำบล/แขวง --</option>';

        if (provinceCode && districts.length > 0) {
            districts.forEach((name, index) => {
                const code = provinceCode + String(index + 1).padStart(2, '0');
                districtSelect.innerHTML += `<option value="${code}">${name}</option>`;
            });
        }
    },

    updateSubdistricts() {
        const districtCode = document.getElementById('districtCode').value;
        const subdistrictSelect = document.getElementById('subdistrictCode');

        // Reset
        if (subdistrictSelect) subdistrictSelect.innerHTML = '<option value="">-- เลือกตำบล/แขวง --</option>';

        if (districtCode && typeof getSubdistrictsByDistrict === 'function') {
            const subdistricts = getSubdistrictsByDistrict(districtCode);
            if (subdistricts && subdistricts.length > 0) {
                subdistricts.forEach(name => {
                    subdistrictSelect.innerHTML += `<option value="${name}">${name}</option>`;
                });
            }
        }
    },

    // Toggle Case Number Lock
    async toggleCaseNumberLock(locked) {
        const input = document.getElementById('manualCaseNumber');
        const lockIcon = document.getElementById('caseNumberLockIcon');
        const saveBtn = document.getElementById('saveCaseNumberBtn');

        if (!input || !lockIcon || !saveBtn) return;

        if (locked) {
            const newVal = input.value.trim();
            if (!newVal) {
                Toast.error('กรุณาระบุเลขเคสก่อนบันทึก');
                return;
            }

            // Sync: If editing an existing case, save immediately to DB
            if (this.editingCaseId) {
                try {
                    await DataService.cases.update(this.editingCaseId, { caseNumber: newVal });
                } catch (e) {
                    console.error('Error saving case number:', e);
                    Toast.error('ไม่สามารถบันทึกเลขเคสได้');
                    return;
                }
            }

            input.readOnly = true;
            input.style.backgroundColor = '#f0fff4'; // Light green bg for locked
            input.style.borderColor = '#48bb78';
            lockIcon.style.display = 'block';
            saveBtn.style.display = 'none';
            Toast.success('บันทึกเลขเคสเรียบร้อย');
        } else {
            input.readOnly = false;
            input.style.backgroundColor = '#fff';
            input.style.borderColor = '#e9d5ff'; // Restore purple theme border
            lockIcon.style.display = 'none';
            saveBtn.style.display = 'block';
            input.focus();
        }
    },

    async saveDataOnly() {
        try {
            const form = document.getElementById('createCaseForm');
            if (!form) return;

            const user = AuthService.getCurrentUserSync();
            if (!user) return;

            // Generate new ID if not editing existing draft
            if (!this.currentDraftId) {
                this.currentDraftId = `draft_${Helpers.generateId()}`;
            }

            // Collect all victim data
            const victimsData = this.victimBlocks.map(v => this.collectVictimData(v.id));

            const draft = {
                id: this.currentDraftId,
                userId: user.id,
                hospitalId: form.hospitalId?.value || '',
                accidentDate: form.accidentDate?.value || '',
                accidentLocation: form.accidentLocation?.value || '',
                vehicleBrand: form.vehicleBrand?.value || '',
                vehiclePlate: form.vehiclePlate?.value || '',
                vehicleProvince: form.vehicleProvince?.value || '',
                policyNumber: form.policyNumber?.value || '',
                coverageStartDate: form.coverageStartDate?.value || '',
                coverageEndDate: form.coverageEndDate?.value || '',
                provinceCode: form.provinceCode?.value || '',
                districtCode: form.districtCode?.value || '',
                subdistrictCode: form.subdistrictCode?.value || '',
                deadline: form.deadline?.value || null,
                victims: [
                    ...this.savedBlocks,
                    ...victimsData.filter(v => v !== null)
                ],
                updatedAt: new Date().toISOString()
            };

            // Save to LocalStorage ONLY (Autosave/Safety)
            let draftKey = `ava_case_draft_${user.id}`;
            const isInspector = user?.role === ROLES.INSPECTOR;
            if (isInspector && this.editingCaseId) {
                draftKey = `ava_draft_edit_${this.editingCaseId}`;
            }

            // Include savedBlocks explicitly to preserve UI state (Green Box vs Active Form)
            const localData = {
                ...draft,
                savedBlocks: this.savedBlocks
            };

            localStorage.setItem(draftKey, JSON.stringify(localData));

            Toast.success('บันทึกข้อมูลเรียบร้อย');
        } catch (error) {
            console.error('Save data only error:', error);
            Toast.error('เกิดข้อผิดพลาด: ' + error.message);
        }
    },

    async saveDraft(redirect = true) {
        try {
            const form = document.getElementById('createCaseForm');
            if (!form) {
                console.error('Form not found');
                return;
            }

            const user = AuthService.getCurrentUserSync();
            if (!user) {
                throw new Error('ไม่พบข้อมูลผู้ใช้งาน กรุณาเข้าสู่ระบบใหม่');
            }

            const isInspector = user.role === ROLES.INSPECTOR;

            // [Inspector Only] Capture existing case ID properly for WIP saving
            // Case 1: Editing an assigned case (this.editingCaseId exists)
            // Case 2: New case (this.editingCaseId is null)

            // Generate new ID if not editing existing draft AND not an assigned case logic (though assigned case logic returns early below)
            if (!this.currentDraftId) {
                this.currentDraftId = `draft_${Helpers.generateId()}`;
            }

            // Collect all victim data
            const victimsData = this.victimBlocks.map(v => this.collectVictimData(v.id));

            // Create draft object with FULL data
            const draft = {
                id: this.currentDraftId, // Key for IndexedDB
                userId: user.id,
                hospitalId: form.hospitalId?.value || '',
                accidentDate: form.accidentDate?.value || '',
                accidentLocation: form.accidentLocation?.value || '',
                vehicleBrand: form.vehicleBrand?.value || '',
                vehiclePlate: form.vehiclePlate?.value || '',
                vehicleProvince: form.vehicleProvince?.value || '',
                policyNumber: form.policyNumber?.value || '',
                coverageStartDate: form.coverageStartDate?.value || '',
                coverageEndDate: form.coverageEndDate?.value || '',
                provinceCode: form.provinceCode?.value || '',
                districtCode: form.districtCode?.value || '',
                subdistrictCode: form.subdistrictCode?.value || '',
                deadline: form.deadline?.value || null,
                originalCaseId: this.editingCaseId || null,
                victims: [
                    ...this.savedBlocks,
                    ...victimsData.filter(v => v !== null)
                ],
                updatedAt: new Date().toISOString(),
                savedAt: new Date().toISOString()
            };

            // [Inspector Specific]
            // If editing an ASSIGNED case (not a self-created draft, but a real case being inspected)
            // We save to LocalStorage to preserve state without polluting 'caseDrafts' DB with duplicates
            if (isInspector && this.editingCaseId) {
                const draftKey = `ava_draft_edit_${this.editingCaseId}`;
                // Include savedBlocks explicitly
                const localData = {
                    ...draft,
                    savedBlocks: this.savedBlocks
                };
                localStorage.setItem(draftKey, JSON.stringify(localData));
                console.log('Saved assigned case WIP to localStorage');

                if (redirect) {
                    Toast.success('บันทึกความคืบหน้าเรียบร้อย');
                    // If manual save, maybe go back? Or just stay? User said "Must not disappear".
                    // Ideally stay on page or go back. "Save Draft" button usually implies "Pause work".
                    // But for assigned case, "Pause" means just save state.
                    // Let's redirect to CASES list to indicate "I'm done for now".
                    setTimeout(() => App.navigate(ROUTES.CASES), 500);
                } else {
                    // Auto-save (silent)
                    console.log('Auto-saved assigned case WIP');
                }
                return; // EXIT FUNCTION EARLY
            }

            // [Standard Logic for New Cases or Self-Created Drafts]

            // Save to IndexedDB
            await db.put('caseDrafts', draft);

            // Clean up legacy localStorage just in case (only if it matches old key format)
            const legacyKey = `ava_case_draft_${user.id}`;
            localStorage.removeItem(legacyKey);

            if (redirect) {
                Toast.success('บันทึกฉบับร่างเรียบร้อย (พร้อมรููปภาพ/วิดีโอ)');
                // Redirect to drafts page
                setTimeout(() => {
                    App.navigate(ROUTES.CASE_DRAFTS);
                }, 500);
            } else {
                // Silent save success message (optional, maybe too noisy?)
                // Toast.success('บันทึกอัตโนมัติเรียบร้อย');
                console.log('Auto-saved draft');
            }
        } catch (error) {
            console.error('Error saving draft:', error);
            Toast.error('เกิดข้อผิดพลาด: ' + error.message);
        }
    },

    async handleSubmit(event) {
        event.preventDefault();
        const form = event.target;
        const user = AuthService.getCurrentUserSync();
        const isInspector = user?.role === ROLES.INSPECTOR;

        try {
            // Validate at least one victim (active or saved)
            // EXCEPTION: Admins/Super Admins can submit empty cases
            if (this.victimBlocks.length === 0 && this.savedBlocks.length === 0) {
                if (isInspector) {
                    Toast.error('กรุณาเพิ่มผู้บาดเจ็บอย่างน้อย 1 คน');
                    return;
                }
            }

            // Collect and validate all victim data (both active blocks and saved blocks)
            const victimsData = [...this.savedBlocks];

            // Process active blocks
            for (const victim of this.victimBlocks) {
                const data = this.collectVictimData(victim.id);

                // Validate PDPA
                if (!data.pdpaConsent) {
                    Toast.error(`กรุณายืนยัน PDPA สำหรับ ${data.firstName || 'ผู้บาดเจ็บ'}`);
                    document.getElementById(`${victim.id}_pdpa`)?.focus();
                    return;
                }

                // Validate signature
                if (!data.signatureData) {
                    Toast.error(`กรุณาลงลายเซ็นสำหรับ ${data.firstName || 'ผู้บาดเจ็บ'}`);
                    document.getElementById(`${victim.id}_signature`)?.scrollIntoView({ behavior: 'smooth' });
                    return;
                }

                // Validate required fields
                if (!data.titlePrefix || !data.firstName || !data.lastName || !data.idCard) {
                    Toast.error(`กรุณากรอกข้อมูลให้ครบสำหรับ ${data.firstName || 'ผู้บาดเจ็บ'}`);
                    return;
                }

                victimsData.push(data);
            }

            const hospital = await DataService.hospitals.getById(form.hospitalId.value);

            // Determine victim info for the case record
            let primaryVictimName = 'ไม่ระบุผู้บาดเจ็บ';
            let primaryVictimIdCard = '';

            if (victimsData.length > 0) {
                primaryVictimName = `${victimsData[0].titlePrefix}${victimsData[0].firstName} ${victimsData[0].lastName}`;
                primaryVictimIdCard = victimsData[0].idCard;
            }

            // Create ONE case for ALL victims OR Update existing
            const caseData = {
                hospitalId: form.hospitalId.value,
                hospitalName: hospital?.name || '',
                accidentDate: form.accidentDate.value,
                accidentLocation: form.accidentLocation.value,
                vehicleBrand: form.vehicleBrand?.value || '',
                vehiclePlate: form.vehiclePlate?.value || '',
                vehicleProvince: form.vehicleProvince?.value || '',
                policyNumber: form.policyNumber?.value || '',
                coverageStartDate: form.coverageStartDate?.value || '',
                coverageEndDate: form.coverageEndDate?.value || '',
                // Use determine primary victim info
                victimName: primaryVictimName,
                victimIdCard: primaryVictimIdCard,
                // Store ALL victims in the case object
                victims: victimsData.map(v => ({
                    ...v,
                    typeAbbr: this.getVictimTypeAbbr(v.type) // Add abbreviation helper
                })),
                provinceCode: form.provinceCode.value,
                districtCode: form.districtCode ? form.districtCode.value : '',
                subdistrictCode: form.subdistrictCode ? form.subdistrictCode.value : '',
                inspectorId: form.inspectorId ? form.inspectorId.value : user.id,
                deadline: form.deadline ? form.deadline.value : new Date().toISOString().split('T')[0],
                hospitalComment: victimsData.map(v => v.hospitalComment).filter(Boolean).join('\n'),
                inspectorCreateComment: victimsData.map(v => v.inspectorComment).filter(Boolean).join('\n'),
                // Recalculate or keep existing claimAmount logic
                claimAmount: 0,
            };

            // Handle Manual Case Number
            const manualCaseNumber = document.getElementById('manualCaseNumber')?.value.trim();
            if (manualCaseNumber) {
                caseData.caseNumber = manualCaseNumber;
            }

            // If creating new
            if (!this.editingCaseId) {
                caseData.createdById = user.id;
                caseData.createdByName = user.fullName;
            }

            let savedCase;
            if (this.editingCaseId) {
                // UPDATE Mode
                // If it was NEW/PENDING_REVISION and Inspector submits, it usually becomes INSPECTED
                // But let's check current status logic in backend or just update.
                // For now, if Inspector edits, we might want to auto-update status to INSPECTED?
                // Or just keep status but update data?
                // User requirement: "When pressing Inspect -> Send to Create Case page".
                // Usually this means they are performing the inspection.
                // So status should probably update to 'INSPECTED' if it was 'NEW'.
                if (isInspector) {
                    caseData.status = CASE_STATUS.INSPECTED;
                }

                savedCase = await DataService.cases.update(this.editingCaseId, caseData);
                Toast.success('อัปเดตข้อมูลเคสเรียบร้อย');
            } else {
                // CREATE Mode
                savedCase = await DataService.cases.create(caseData);
                Toast.success('ส่งเคสเรียบร้อย');
            }

            // Process media for ALL victims linked to this single case
            // Note: For update mode, we might be adding NEW media.
            // Existing media is already in DB. 'victimsData' comes from 'savedBlocks'.
            // If we loaded from existing case, 'savedBlocks' might contain 'photos' which are URLs (strings) or File objects (new uploads).
            // DataService.caseMedia.add expects dataUrl.
            // We need to distinguish between existing (URL) and new (File/DataURL).
            // The MediaUpload component usually handles this display.
            // The 'v.photos' array might mix format.
            // Let's assume 'collectVictimData' returns current state.

            // NOTE: Simplification for now - re-saving media might act weird if not handled.
            // But 'DataService.caseMedia.add' implies adding new records.
            // If we re-send existing URLs, it might duplicate.
            // We should filter for NEW media only?
            // MediaUpload typically returns an array of file objects for new files,
            // and maybe we need to check if it's already uploaded.
            // However, strictly speaking, the MediaUpload component in `create.js` (lines 1019+)
            // stores `victimData.photos = files`.
            // If we restored from draft/existing case, `restoreFiles` (line 1584) puts them in the UI.
            // But does it put them back into `victimData.photos`?
            // Yes, line 958 `newVictimData.photos = [...victim.photos]`.
            // If these are existing URLs, `caseMedia.add` might fail or duplicate.
            // Standard implementation often checks `if (!file.url) ...`

            for (let i = 0; i < victimsData.length; i++) {
                const victimData = victimsData[i];
                const prefix = `[${victimData.firstName}]`;

                // Save photos (Only if it has dataUrl - implicit check for new files)
                if (victimData.photos && Array.isArray(victimData.photos)) {
                    for (const file of victimData.photos) {
                        if (file.dataUrl) { // Only upload new files with dataUrl
                            await DataService.caseMedia.add(savedCase.id, {
                                type: 'photo',
                                dataUrl: file.dataUrl,
                                caption: `${prefix} ${file.name}`,
                                uploadedById: user.id,
                                victimIndex: i
                            });
                        }
                    }
                }

                // Save videos
                if (victimData.videos && Array.isArray(victimData.videos)) {
                    for (const file of victimData.videos) {
                        if (file.dataUrl) {
                            await DataService.caseMedia.add(savedCase.id, {
                                type: 'video',
                                dataUrl: file.dataUrl,
                                caption: `${prefix} ${file.name}`,
                                uploadedById: user.id,
                                victimIndex: i
                            });
                        }
                    }
                }

                // Save documents
                if (victimData.documents && Array.isArray(victimData.documents)) {
                    for (const file of victimData.documents) {
                        if (file.dataUrl) {
                            await DataService.caseMedia.add(savedCase.id, {
                                type: 'document',
                                dataUrl: file.dataUrl,
                                caption: `${prefix} ${file.name}`,
                                uploadedById: user.id,
                                victimIndex: i
                            });
                        }
                    }
                }

                // Submit inspection data if inspector created it
                if (isInspector && i === 0) {
                    await DataService.cases.submitInspection(savedCase.id, {
                        comment: victimData.inspectorComment,
                        pdpaConsent: true,
                        signatureData: victimData.signatureData
                    });
                }
            } // End victims loop

            // Remove draft if exists
            if (this.currentDraftId) {
                await db.delete('caseDrafts', this.currentDraftId);
            }

            // Clear legacy local storage
            const legacyKey = `ava_case_draft_${user.id}`;
            localStorage.removeItem(legacyKey); // Just in case

            if (this.editingCaseId) {
                Toast.success('อัปเดตข้อมูลเคสเรียบร้อย');
            } else {
                Toast.success(`สร้างเคสเรียบร้อย ${victimsData.length} รายการ`);
            }

            setTimeout(() => {
                App.navigate(ROUTES.CASES);
            }, 1000);

        } catch (error) {
            console.error('Create case error:', error);
            Toast.error('เกิดข้อผิดพลาด: ' + error.message);
        }
    },

    afterRender() {
        // Reset state
        this.victimBlocks = [];
        this.victimCounter = 0;
        this.savedBlocks = [];

        // Restore district if draft exists
        const user = AuthService.getCurrentUserSync();

        // Prioritize loaded draft from DB (Edit mode), fallback to localStorage (Autosave)
        let draft = this.loadedDraft;

        if (!draft) {
            const draftKey = `ava_case_draft_${user.id}`;
            const draftData = localStorage.getItem(draftKey);
            if (draftData) {
                try {
                    draft = JSON.parse(draftData);
                } catch (e) {
                    console.error('Error parsing local storage draft', e);
                }
            }
        }

        // Restore Saved Blocks (Green Box)
        if (draft && draft.savedBlocks) {
            this.savedBlocks = draft.savedBlocks || [];
            this.renderSavedVictims();

            // Filter out saved blocks from active victims list to prevent duplication
            if (draft.victims) {
                const savedIds = new Set(this.savedBlocks.map(v => v.id));
                draft.victims = draft.victims.filter(v => !savedIds.has(v.id));
            }
        }
        if (draft) {
            // Note: If using loadedDraft, we don't need to parse it again as it's already an object

            if (draft.provinceCode) {
                this.updateDistricts();
                setTimeout(() => {
                    const districtSelect = document.getElementById('districtCode');
                    if (districtSelect && draft.districtCode) {
                        districtSelect.value = draft.districtCode;

                        // Also restore subdistrict if we have district
                        if (draft.districtCode) {
                            this.updateSubdistricts();
                            setTimeout(() => {
                                const subdistrictInput = document.getElementById('subdistrictCode');
                                if (subdistrictInput && draft.subdistrictCode) {
                                    subdistrictInput.value = draft.subdistrictCode;
                                }
                            }, 100);
                        }
                    }
                }, 100);
            }

            // Restore victims from draft
            if (draft.victims && draft.victims.length > 0) {
                draft.victims.forEach(v => {
                    if (v && v.type) {
                        this.addVictimBlock(v.type);

                        // Capture the ID of the block we just created (synchronously)
                        // It will be the last one in the array
                        const newBlock = this.victimBlocks[this.victimBlocks.length - 1];
                        if (!newBlock) return;
                        const blockId = newBlock.id;

                        // Restore data after block is created
                        setTimeout(() => {
                            // Use the captured blockId, NOT referencing the array length again
                            if (blockId) {
                                // Restore simple fields
                                Object.keys(v).forEach(key => {
                                    const el = document.getElementById(`${blockId}_${key}`);
                                    if (el && v[key] !== undefined && v[key] !== null) {
                                        if (el.type === 'checkbox') {
                                            el.checked = v[key];
                                        } else {
                                            el.value = v[key];
                                        }
                                    }
                                });

                                // FIX: Explicitly trigger cascading for address fields (Draft Restore)
                                if (v.addressProvince) {
                                    this.onVictimProvinceChange(blockId);
                                    // Re-set district after options populated
                                    const distEl = document.getElementById(`${blockId}_addressDistrict`);
                                    if (distEl && v.addressDistrict) {
                                        distEl.value = v.addressDistrict;
                                        this.onVictimDistrictChange(blockId);
                                        // Re-set subdistrict after options populated
                                        const subEl = document.getElementById(`${blockId}_addressSubdistrict`);
                                        if (subEl && v.addressSubdistrict) {
                                            subEl.value = v.addressSubdistrict;
                                        }
                                    }
                                }

                                // Explicitly restore PDPA consent (ID mismatch fix)
                                const pdpaEl = document.getElementById(`${blockId}_pdpa`);
                                if (pdpaEl && v.pdpaConsent !== undefined) {
                                    pdpaEl.checked = v.pdpaConsent;
                                }

                                // Restore complex fields
                                const victimData = this.victimBlocks.find(b => b.id === blockId);
                                if (victimData) {
                                    if (v.signatureData) victimData.signatureData = v.signatureData;
                                    if (v.photos) victimData.photos = v.photos;
                                    if (v.videos) victimData.videos = v.videos;
                                    if (v.documents) victimData.documents = v.documents;

                                    // Re-render signature if data exists
                                    if (v.signatureData) {
                                        // Store for retrieval
                                        const hiddenInput = document.getElementById(`${blockId}_existing_signature`);
                                        if (hiddenInput) hiddenInput.value = v.signatureData;

                                        // Show Preview
                                        const previewContainer = document.getElementById(`${blockId}_signature_preview_container`);
                                        const previewImg = document.getElementById(`${blockId}_signature_preview`);
                                        const canvasContainer = document.getElementById(`${blockId}_signature`).parentElement; // wrapper -> container

                                        if (previewContainer && previewImg) {
                                            previewImg.src = v.signatureData;
                                            previewContainer.style.display = 'block';

                                            // Hide Canvas
                                            const canvas = document.querySelector(`#${blockId}_signature canvas`); // Specific canvas
                                            if (canvas) {
                                                // We hide the container div holding the canvas
                                                const padContainer = document.getElementById(`${blockId}_signature`);
                                                if (padContainer) padContainer.style.display = 'none';
                                            }
                                        } else {
                                            // Fallback to old behavior if elements missing
                                            const canvas = document.querySelector(`#${blockId}_signature canvas`);
                                            if (canvas) {
                                                const ctx = canvas.getContext('2d');
                                                const img = new Image();
                                                img.onload = () => ctx.drawImage(img, 0, 0);
                                                img.src = v.signatureData;
                                            }
                                        }
                                    }

                                    // Restore media files
                                    if (v.photos && v.photos.length > 0) {
                                        MediaUpload.restoreFiles(`${blockId}_photos`, v.photos);
                                    }
                                    if (v.videos && v.videos.length > 0) {
                                        MediaUpload.restoreFiles(`${blockId}_videos`, v.videos);
                                    }
                                    if (v.documents && v.documents.length > 0) {
                                        MediaUpload.restoreFiles(`${blockId}_documents`, v.documents);
                                    }
                                }
                            }
                        }, 500);
                    }
                });
            }
        }
    },

    // Handle Resign Action
    handleResign(blockId) {
        // Clear stored signature
        const hiddenInput = document.getElementById(`${blockId}_existing_signature`);
        if (hiddenInput) hiddenInput.value = '';

        // Hide Preview
        const previewContainer = document.getElementById(`${blockId}_signature_preview_container`);
        if (previewContainer) previewContainer.style.display = 'none';

        // Show Canvas
        const padContainer = document.getElementById(`${blockId}_signature`);
        if (padContainer) {
            padContainer.style.display = 'block';

            // Resize logic might be needed if display:none broke dimensions
            // Trigger window resize event or re-init if needed
            // SignaturePad usually handles this, or we might need to clear it.
            SignaturePad.clear(`${blockId}_signature`);
        }
    },

    showPDPA() {
        Modal.show({
            title: 'หนังสือยินยอม PDPA',
            content: `<div class="pdpa-content">${PDPA_CONSENT_TEXT}</div>`,
            footer: '<button class="btn btn-primary" onclick="Modal.closeAll()">ตกลง</button>',
            size: 'lg'
        });
    },

    getVictimTypeAbbr(type) {
        const abbrMap = {
            'driver_insured': 'ผขป',
            'passenger_insured': 'ผดสป',
            'driver_other': 'ผขค',
            'passenger_other': 'ผดสค',
            'third_party': 'บคน'
        };
        return abbrMap[type] || 'อื่นๆ';
    }
};

window.CaseCreatePage = CaseCreatePage;
