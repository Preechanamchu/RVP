/**
 * ══════════════════════════════════════════════════════════════════════════
 * AVA - Finance Staff View Page
 * Personal salary/commission viewing for employees (Inspectors)
 * ══════════════════════════════════════════════════════════════════════════
 */

const FinanceStaffViewPage = {
    data: [],
    user: null,

    async render() {
        this.user = AuthService.getCurrentUserSync();
        this.data = await DataService.finance.getByUserId(this.user.id);

        const totals = this.calculateTotals();

        return `
            <style>
                .staff-finance-container { padding: 24px; animation: fadeIn 0.3s ease-out; }
                .staff-finance-header { margin-bottom: 24px; }
                .staff-finance-header h1 { margin: 0; font-size: 24px; color: var(--text-primary); }
                .staff-finance-header p { margin: 4px 0 0; color: var(--text-secondary); font-size: 14px; }

                .finance-stats { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin-bottom: 24px; }
                .finance-stat-card { background: white; padding: 20px; border-radius: 12px; box-shadow: 0 2px 10px rgba(0,0,0,0.05); border-left: 4px solid var(--primary-color); }
                .f-stat-label { font-size: 12px; color: var(--text-secondary); text-transform: uppercase; letter-spacing: 1px; margin-bottom: 8px; }
                .f-stat-value { font-size: 22px; font-weight: 700; color: var(--text-primary); }

                .history-card { background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 2px 10px rgba(0,0,0,0.05); }
                .history-header { padding: 16px 20px; border-bottom: 1px solid #eee; }
                .history-header h2 { margin: 0; font-size: 16px; }

                .payment-item { display: flex; align-items: center; padding: 16px 20px; border-bottom: 1px solid #eee; transition: background 0.2s; }
                .payment-item:last-child { border-bottom: none; }
                .payment-item:hover { background: #fcfcfc; }

                .payment-date { flex: 1; }
                .payment-month { font-weight: 600; font-size: 15px; }
                .payment-year { font-size: 12px; color: var(--text-secondary); }

                .payment-amount { flex: 1; text-align: center; }
                .amount-value { font-weight: 700; color: var(--text-primary); }
                .amount-label { font-size: 11px; color: var(--text-secondary); }

                .payment-status { flex: 1; text-align: center; }
                .status-badge { padding: 4px 10px; border-radius: 20px; font-size: 11px; font-weight: 600; display: inline-block; }
                .status-badge.paid { background: #e8f5e9; color: #2e7d32; }
                .status-badge.pending { background: #fff3e0; color: #ef6c00; }

                .payment-actions { flex: 0 0 120px; text-align: right; }
                
                .empty-state { padding: 48px; text-align: center; color: var(--text-secondary); }
                .empty-icon { font-size: 40px; margin-bottom: 16px; display: block; }

                @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
            </style>

            <div class="staff-finance-container">
                <div class="staff-finance-header">
                    <h1>ค่าสำรวจและรายได้ของฉัน</h1>
                    <p>ตรวจสอบรายละเอียดรอบการจัดจ่ายเงินในแต่ละเดือน</p>
                </div>

                <div class="finance-stats">
                    <div class="finance-stat-card">
                        <div class="f-stat-label">รายได้สะสม</div>
                        <div class="f-stat-value">฿ ${Helpers.formatCurrency(totals.accumulated)}</div>
                    </div>
                    <div class="finance-stat-card" style="border-left-color: #ff9800;">
                        <div class="f-stat-label">ยอดรอโอน</div>
                        <div class="f-stat-value">฿ ${Helpers.formatCurrency(totals.pending)}</div>
                    </div>
                </div>

                <div class="history-card">
                    <div class="history-header">
                        <h2>ประวัติการรับชำระเงิน</h2>
                    </div>
                    <div class="payment-list">
                        ${this.data.length > 0 ? this.data.map(item => this.renderPaymentItem(item)).join('') : `
                            <div class="empty-state">
                                <span class="empty-icon">🪙</span>
                                <p>ยังไม่พบข้อมูลการรับชำระเงิน</p>
                            </div>
                        `}
                    </div>
                </div>
            </div>
        `;
    },

    calculateTotals() {
        const accumulated = this.data
            .filter(s => s.status === 'paid')
            .reduce((sum, s) => sum + (parseFloat(s.totalAmount) || 0), 0);

        const pending = this.data
            .filter(s => s.status === 'pending')
            .reduce((sum, s) => sum + (parseFloat(s.totalAmount) || 0), 0);

        return { accumulated, pending };
    },

    renderPaymentItem(item) {
        const isPaid = item.status === 'paid';

        return `
            <div class="payment-item">
                <div class="payment-date">
                    <div class="payment-month">${Helpers.getMonthName(item.month)}</div>
                    <div class="payment-year">ปี พ.ศ. ${parseInt(item.year) + 543}</div>
                </div>
                <div class="payment-amount">
                    <div class="amount-value">฿ ${Helpers.formatCurrency(item.totalAmount)}</div>
                    <div class="amount-label">รวมสุทธิ</div>
                </div>
                <div class="payment-status">
                    <span class="status-badge ${item.status}">
                        ${isPaid ? 'จ่ายแล้ว' : 'รอดำเนินการ'}
                    </span>
                </div>
                <div class="payment-actions">
                    ${item.slipFile ? `
                        <button class="btn btn-outline btn-sm" onclick="FinanceStaffViewPage.downloadSlip('${item.id}')">
                            ${Icons.download} โหลดสลิป
                        </button>
                    ` : `
                        <span style="font-size:11px;color:#999">ยังไม่มีหลักฐาน</span>
                    `}
                </div>
            </div>
        `;
    },

    downloadSlip(id) {
        const item = this.data.find(s => s.id === id);
        if (!item?.slipFile) return;

        // If it's a PDF or image, handle display/download
        const link = document.createElement('a');
        link.href = item.slipFile;
        link.download = `Payslip_${Helpers.getMonthName(item.month)}_${item.year}.png`; // Default suffix

        // Handle PDF specifically
        if (item.slipFile.startsWith('data:application/pdf')) {
            const wind = window.open();
            wind.document.write(`<iframe src="${item.slipFile}" frameborder="0" style="border:0; top:0px; left:0px; bottom:0px; right:0px; width:100%; height:100%;" allowfullscreen></iframe>`);
        } else {
            link.click();
        }
    }
};
