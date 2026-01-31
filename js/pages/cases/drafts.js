/**
 * ══════════════════════════════════════════════════════════════════════════
 * AVA - Case Drafts Page
 * Manage saved case drafts
 * ══════════════════════════════════════════════════════════════════════════
 */

const CaseDraftsPage = {
    async render() {
        const user = AuthService.getCurrentUserSync();
        let drafts = [];

        try {
            drafts = await db.getByIndex('caseDrafts', 'userId', user.id);
        } catch (e) {
            console.error('Error fetching drafts:', e);
        }

        // Sort by savedAt desc
        drafts.sort((a, b) => new Date(b.savedAt) - new Date(a.savedAt));

        return `
            <div class="page-header">
                <div>
                    <h1>บันทึกฉบับร่าง</h1>
                    <p class="text-secondary">รายการเคสที่บันทึกไว้ชั่วคราว (${drafts.length})</p>
                </div>
            </div>

            ${drafts.length === 0 ? `
                <div class="empty-state">
                    <div style="font-size: 3rem; margin-bottom: var(--space-3);">📝</div>
                    <h4>ไม่พบฉบับร่าง</h4>
                    <p class="text-secondary">คุณยังไม่มีเคสที่บันทึกไว้</p>
                </div>
            ` : `
                <div style="display: grid; gap: var(--space-3);">
                    ${drafts.map(draft => `
                        <div class="card">
                            <div class="card-body">
                                <div style="display: flex; justify-content: space-between; align-items: start; gap: var(--space-3);">
                                    <div style="flex: 1;">
                                        <div style="display: flex; gap: var(--space-2); align-items: center; margin-bottom: var(--space-2);">
                                            <span class="badge badge-warning">RRAFT</span>
                                            <h4 style="margin: 0; color: var(--primary-600);">
                                                ${draft.hospitalId ? 'เคสโรงพยาบาล' : 'บันทึกฉบับร่าง'}
                                            </h4>
                                        </div>
                                        
                                        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: var(--space-2); color: var(--neutral-600);">
                                            <div>📅 บันทึกเมื่อ: ${new Date(draft.savedAt).toLocaleString('th-TH')}</div>
                                            <div>🕒 วันที่เกิดเหตุ: ${draft.accidentDate ? new Date(draft.accidentDate).toLocaleString('th-TH') : '-'}</div>
                                            <div>📍 สถานที่: ${draft.accidentLocation || '-'}</div>
                                            <div>👥 ผู้บาดเจ็บ: ${draft.victims ? draft.victims.length : 0} คน</div>
                                        </div>
                                    </div>
                                    <div style="display: flex; gap: var(--space-2); flex-shrink: 0;">
                                        <button class="btn btn-outline-primary" onclick="App.navigate('${ROUTES.CASE_CREATE}', { draftId: '${draft.id}' })">
                                            ${Icons.edit} แก้ไข
                                        </button>
                                        <button class="btn btn-outline-danger" onclick="CaseDraftsPage.deleteDraft('${draft.id}')">
                                            ${Icons.trash} ลบ
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    `).join('')}
                </div>
            `}
        `;
    },

    deleteDraft(id) {
        Modal.show({
            title: 'ยืนยันการลบ',
            content: '<p>คุณต้องการลบฉบับร่างนี้ใช่หรือไม่? การกระทำนี้ไม่สามารถเรียกคืนได้</p>',
            footer: `
                <button class="btn btn-ghost" onclick="Modal.closeAll()">ยกเลิก</button>
                <button class="btn btn-danger" onclick="CaseDraftsPage.confirmDelete('${id}')">ลบข้อมูล</button>
            `
        });
    },

    async confirmDelete(id) {
        try {
            await db.delete('caseDrafts', id);
            Toast.success('ลบฉบับร่างเรียบร้อย');
        } catch (e) {
            console.error('Error deleting draft:', e);
            Toast.error('ลบไม่สำเร็จ');
        }

        Modal.closeAll();
        App.refreshPage();
    }
};

window.CaseDraftsPage = CaseDraftsPage;
