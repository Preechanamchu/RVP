/**
 * ══════════════════════════════════════════════════════════════════════════
 * AVA - Case Inspection Page
 * Field inspector form with PDPA consent, hospital comment, and signature
 * ══════════════════════════════════════════════════════════════════════════
 */

const CaseInspectPage = {
    caseData: null,
    mediaFiles: [],

    async render(caseId) {
        this.caseData = await DataService.cases.getById(caseId);
        if (!this.caseData) {
            return '<div class="empty-state"><h4>ไม่พบเคส</h4></div>';
        }

        if (!RBAC.canPerformCaseAction('inspect', this.caseData)) {
            Toast.error('คุณไม่มีสิทธิ์ตรวจสอบเคสนี้');
            App.navigate(ROUTES.CASES);
            return '';
        }

        return `
            <div class="page-header">
                <button class="btn btn-ghost" onclick="App.navigate('${ROUTES.CASE_DETAIL}', '${caseId}')">
                    ${Icons.arrowLeft} กลับ
                </button>
                <h1 style="margin-top: var(--space-4);">ตรวจสอบเคส: ${this.caseData.caseNumber}</h1>
                <p>โรงพยาบาล: ${Helpers.escapeHtml(this.caseData.hospitalName || '-')} | วันที่เกิดเหตุ: ${Helpers.formatDateTime(this.caseData.accidentDate)}</p>
            </div>

            <form id="inspectForm" onsubmit="CaseInspectPage.handleSubmit(event)">
                <!-- 1. PDPA Consent -->
                <div class="card" style="margin-bottom: var(--space-4);">
                    <div class="card-body">
                        <h3 style="margin-bottom: var(--space-4);">1. ยืนยันความยินยอม PDPA</h3>
                        <div class="pdpa-checkbox">
                            <input type="checkbox" id="pdpaConsent" name="pdpaConsent" ${this.caseData.pdpaConsent ? 'checked' : ''} required>
                            <label for="pdpaConsent">
                                ผู้บาดเจ็บ/ผู้แทนได้อ่านและยอมรับ <a href="#" onclick="CaseInspectPage.showPDPA(); return false;">หนังสือยินยอมเปิดเผยข้อมูลส่วนบุคคล (PDPA)</a> เรียบร้อยแล้ว
                            </label>
                        </div>
                    </div>
                </div>

                <!-- 2. Media Upload -->
                <div class="card" style="margin-bottom: var(--space-4);">
                    <div class="card-body">
                        <h3 style="margin-bottom: var(--space-4);">2. ภาพถ่ายและวิดีโอ</h3>
                        <div id="mediaUpload"></div>
                    </div>
                </div>

                <!-- 3. Hospital Staff Comment -->
                <div class="card" style="margin-bottom: var(--space-4);">
                    <div class="card-body">
                        <h3 style="margin-bottom: var(--space-4);">3. ความเห็นของเจ้าหน้าที่โรงพยาบาล</h3>
                        <div class="form-group" style="margin-bottom:0">
                            <label for="hospitalStaffComment">ความเห็นจากเจ้าหน้าที่รพ.</label>
                            <textarea id="hospitalStaffComment" name="hospitalStaffComment" rows="4" 
                                      placeholder="บันทึกความเห็นจากเจ้าหน้าที่โรงพยาบาลที่พบระหว่างตรวจสอบ">${this.caseData.hospitalStaffComment || ''}</textarea>
                        </div>
                        ${this.caseData.hospitalComment ? `
                            <div style="margin-top: var(--space-3); padding: var(--space-3); background: var(--neutral-50); border-radius: var(--radius-md);">
                                <p style="font-size: var(--font-size-sm); color: var(--neutral-500); margin-bottom: var(--space-1);">ความเห็นจากโรงพยาบาล (จากการสร้างเคส):</p>
                                <p style="margin:0;">${Helpers.escapeHtml(this.caseData.hospitalComment)}</p>
                            </div>
                        ` : ''}
                    </div>
                </div>

                <!-- 4. Inspector Comment -->
                <div class="card" style="margin-bottom: var(--space-4);">
                    <div class="card-body">
                        <h3 style="margin-bottom: var(--space-4);">4. ความเห็นพนักงานตรวจสอบ</h3>
                        <div class="form-group" style="margin-bottom:0">
                            <label for="inspectorComment">รายละเอียดการตรวจสอบ *</label>
                            <textarea id="inspectorComment" name="inspectorComment" rows="5" required
                                      placeholder="บันทึกสิ่งที่พบจากการตรวจสอบ อาการบาดเจ็บ ความสอดคล้องกับข้อมูลโรงพยาบาล ฯลฯ">${this.caseData.inspectorComment || ''}</textarea>
                        </div>
                    </div>
                </div>

                <!-- 5. Signature -->
                <div class="card" style="margin-bottom: var(--space-4);">
                    <div class="card-body">
                        <h3 style="margin-bottom: var(--space-4);">5. ลายเซ็นผู้บาดเจ็บ/ผู้แทน</h3>
                        <div id="signaturePad"></div>
                    </div>
                </div>

                <!-- Submit -->
                <div style="display: flex; gap: var(--space-3); justify-content: flex-end;">
    <button type="submit" class="btn btn-primary btn-lg">ส่งรายงาน</button>
                </div>
            </form>
        `;
    },

    async afterRender() {
        // Initialize components
        MediaUpload.init('mediaUpload', { acceptVideo: true, onChange: (files) => this.mediaFiles = files });
        SignaturePad.init('signaturePad');

        // Load existing media
        const existingMedia = await DataService.caseMedia.getByCaseId(this.caseData.id);
        if (existingMedia && existingMedia.length > 0) {
            MediaUpload.loadFiles(existingMedia);
        }

        // Load existing signature (from drafts)
        if (this.caseData.draftSignature) {
            // Tiny delay to ensure canvas is ready
            setTimeout(() => {
                SignaturePad.fromDataUrl(this.caseData.draftSignature);
            }, 100);
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

    async saveDraft() {
        const comment = document.getElementById('inspectorComment').value;
        const hospitalStaffComment = document.getElementById('hospitalStaffComment').value;
        const pdpaConsent = document.getElementById('pdpaConsent').checked;
        const signatureData = SignaturePad.getDataUrl();

        try {
            // 1. Save Case Data
            await DataService.cases.update(this.caseData.id, {
                inspectorComment: comment,
                hospitalStaffComment: hospitalStaffComment,
                pdpaConsent: pdpaConsent,
                draftSignature: signatureData // Save signature as draft
            });

            // 2. Save Media
            const user = AuthService.getCurrentUserSync();
            // Iterate current files in MediaUpload
            // Note: mediaFiles includes BOTH existing and new files because loadFiles pushed them into MediaUpload.files
            // We need to check if they are already saved.
            // In loadFiles, we marked existing ones with isExisting: true.

            for (const file of this.mediaFiles) {
                if (!file.isExisting) {
                    await DataService.caseMedia.add(this.caseData.id, {
                        type: file.type,
                        dataUrl: file.dataUrl,
                        caption: file.name,
                        uploadedById: user.id
                    });
                    // Mark as existing so we don't save again next time
                    file.isExisting = true;
                }
            }

            Toast.success('บันทึกฉบับร่างแล้ว');
        } catch (error) {
            console.error(error);
            Toast.error('บันทึกไม่สำเร็จ: ' + error.message);
        }
    },

    async handleSubmit(event) {
        event.preventDefault();

        const pdpaConsent = document.getElementById('pdpaConsent').checked;
        const inspectorComment = document.getElementById('inspectorComment').value;
        const hospitalStaffComment = document.getElementById('hospitalStaffComment').value;
        const signatureData = SignaturePad.getDataUrl();

        if (!pdpaConsent) {
            Toast.error('กรุณายืนยันความยินยอม PDPA');
            return;
        }
        if (!inspectorComment.trim()) {
            Toast.error('กรุณากรอกความเห็นพนักงานตรวจสอบ');
            return;
        }
        if (!signatureData) {
            Toast.error('กรุณาลงลายเซ็น');
            return;
        }

        const confirmed = await Modal.confirm(
            'ยืนยันการส่งรายงาน? เมื่อส่งแล้วจะไม่สามารถแก้ไขได้',
            { title: 'ยืนยันการส่ง', confirmText: 'ส่งรายงาน' }
        );
        if (!confirmed) return;

        try {
            // Save media files (only new ones)
            const user = AuthService.getCurrentUserSync();
            for (const file of this.mediaFiles) {
                if (!file.isExisting) {
                    await DataService.caseMedia.add(this.caseData.id, {
                        type: file.type,
                        dataUrl: file.dataUrl,
                        caption: file.name,
                        uploadedById: user.id
                    });
                }
            }

            // Update case with hospitalStaffComment
            await DataService.cases.update(this.caseData.id, { hospitalStaffComment });

            // Submit inspection
            await DataService.cases.submitInspection(this.caseData.id, {
                comment: inspectorComment,
                pdpaConsent: true,
                signatureData // Use the signature from pad (or draft if unchanged)
            });

            Toast.success('ส่งรายงานสำเร็จ');
            App.navigate(ROUTES.CASES);
        } catch (error) {
            Toast.error('เกิดข้อผิดพลาด: ' + error.message);
        }
    }
};
