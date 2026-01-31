/**
 * ══════════════════════════════════════════════════════════════════════════
 * AVA - Analytics Report Page
 * Data Analysis Dashboard with Scrollable Tables
 * Updated: Date Filter, Summary Footers, Corrected Data Logic
 * ══════════════════════════════════════════════════════════════════════════
 */

const AnalyticsPage = {
    currentFilterDate: new Date().toISOString().slice(0, 7), // Default YYYY-MM

    async render(filterDate = null) {
        if (filterDate) {
            this.currentFilterDate = filterDate;
        }

        const allCases = await DataService.cases.getAll();

        // --- Filter by Date ---
        const cases = allCases.filter(c => {
            if (!c.createdAt) return false;
            return c.createdAt.startsWith(this.currentFilterDate);
        });

        // --- 1. Calculate Hospital Stats (For Left Table) ---
        const hospitalStats = {};

        cases.forEach(c => {
            const hId = c.hospitalId || 'unknown';
            const hName = c.hospitalName || 'ไม่ทราบระบุ';

            if (!hospitalStats[hId]) {
                hospitalStats[hId] = {
                    name: hName,
                    totalClaim: 0,
                    totalApproved: 0,
                    excess: 0
                };
            }

            if (c.victims && Array.isArray(c.victims)) {
                c.victims.forEach(v => {
                    const initial = parseFloat(v.initialClaimAmount || 0);
                    let approved = parseFloat(v.claimAmount || 0);

                    // Logic updated: Always use the approved/evaluated amount designated by user,
                    // regardless of whether the final status is Approved or Rejected.
                    // if (c.status === CASE_STATUS.REJECTED || v.status === CASE_STATUS.REJECTED) {
                    //    approved = 0;
                    // }

                    hospitalStats[hId].totalClaim += initial;
                    hospitalStats[hId].totalApproved += approved;
                });
            } else {
                const initial = parseFloat(c.initialClaimAmount || 0);
                const approved = parseFloat(c.claimAmount || c.approvedAmount || 0);
                hospitalStats[hId].totalClaim += initial;
                hospitalStats[hId].totalApproved += approved;
            }
        });

        Object.values(hospitalStats).forEach(h => {
            h.excess = h.totalClaim - h.totalApproved;
            if (h.excess < 0) h.excess = 0;
        });

        const sortedHospitals = Object.values(hospitalStats)
            .filter(h => h.totalClaim > 0)
            .sort((a, b) => b.totalClaim - a.totalClaim);

        // --- Calculate Hospital Grand totals ---
        const hospitalTotals = sortedHospitals.reduce((acc, h) => {
            acc.claim += h.totalClaim;
            acc.approved += h.totalApproved;
            acc.excess += h.excess;
            return acc;
        }, { claim: 0, approved: 0, excess: 0 });

        // --- 2. Calculate Province Stats (For Right Table) ---
        const provinceStats = {};
        cases.forEach(c => {
            let pName = 'ไม่ระบุ';
            if (typeof THAILAND_PROVINCES !== 'undefined' && c.provinceCode) {
                const found = THAILAND_PROVINCES.find(p => p.code == c.provinceCode);
                if (found) pName = found.name;
            } else if (c.provinceCode === '10') pName = 'กรุงเทพฯ';
            else if (c.provinceName) pName = c.provinceName;

            if (!provinceStats[pName]) {
                provinceStats[pName] = { name: pName, count: 0 };
            }
            provinceStats[pName].count++;
        });

        const sortedProvinces = Object.values(provinceStats).sort((a, b) => b.count - a.count);
        // Province Total
        const totalCasesCount = sortedProvinces.reduce((sum, p) => sum + p.count, 0);

        // --- 3. Calculate Abnormal High Claims (Top 10) ---
        const abnormalHospitals = Object.values(hospitalStats)
            .map(h => {
                let percentExcess = 0;
                if (h.totalApproved > 0) {
                    percentExcess = ((h.totalClaim - h.totalApproved) / h.totalApproved) * 100;
                } else if (h.totalClaim > 0) {
                    percentExcess = 100;
                }
                return { ...h, percentExcess };
            })
            .filter(h => h.totalClaim > 0)
            .sort((a, b) => b.percentExcess - a.percentExcess)
            .slice(0, 10);

        // --- Calculate Abnormal Grand Totals ---
        const abnormalTotals = abnormalHospitals.reduce((acc, h) => {
            acc.claim += h.totalClaim;
            acc.approved += h.totalApproved;
            acc.excess += h.excess;
            return acc;
        }, { claim: 0, approved: 0, excess: 0 });


        // --- UI Rendering ---
        return `
            <style>
                .analytics-container { width: 100%; overflow-x: hidden; padding: 0 5px; box-sizing: border-box; }
                .analysis-card {
                    background: white; border: 1px solid #e2e8f0; border-radius: 12px;
                    padding: 20px; height: 100%; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);
                    min-width: 0; display: flex; flex-direction: column; box-sizing: border-box;
                }
                .analysis-header {
                    display: flex; align-items: center; gap: 10px; margin-bottom: 16px;
                    padding-bottom: 12px; border-bottom: 1px solid #f1f5f9; flex-wrap: wrap;
                }
                .analysis-header h3 { font-size: 14px; font-weight: 700; color: #1e293b; margin: 0; }
                .scrollable-table-container {
                    max-height: 400px; overflow-y: auto; overflow-x: auto; border: 1px solid #e2e8f0; border-radius: 8px; width: 100%;
                }
                .analysis-table { width: 100%; border-collapse: collapse; min-width: 300px; }
                .analysis-table thead th {
                    position: sticky; top: 0; background: #f8fafc; padding: 8px 12px;
                    text-align: left; font-weight: 600; font-size: 11px !important; color: #64748b;
                    border-bottom: 2px solid #e2e8f0; white-space: nowrap; z-index: 10;
                }
                .analysis-table tbody td, .analysis-table tfoot td {
                    padding: 8px 12px; font-size: 10px !important; color: #334155;
                    border-bottom: 1px solid #f1f5f9;
                }
                .analysis-table tfoot td {
                    background-color: #f8fafc; border-top: 2px solid #cbd5e1; font-weight: bold;
                }
                .analysis-table tbody tr:hover { background-color: #f8fafc; }
                .val-primary { color: var(--primary-600); font-weight: 600; }
                .val-danger { color: var(--danger-600); font-weight: 600; }
                .val-success { color: var(--success-600); font-weight: 600; }
                .icon-box {
                    width: 32px; height: 32px; border-radius: 8px;
                    display: flex; align-items: center; justify-content: center; font-size: 16px; flex-shrink: 0;
                }
                .icon-hospital { background: #eff6ff; color: #3b82f6; }
                .icon-location { background: #fef2f2; color: #ef4444; }
                .icon-alert { background: #fff7ed; color: #f97316; }
                
                .analytics-grid { display: grid; gap: 20px; grid-template-columns: 2fr 1fr; margin-bottom: 24px; }

                @media (max-width: 992px) {
                    .analytics-grid { grid-template-columns: 1fr; }
                }

                @media (max-width: 768px) {
                    .analysis-card { padding: 15px; }
                    .page-header { flex-direction: column; align-items: flex-start !important; gap: 15px; }
                    .analysis-table thead th, .analysis-table tbody td { padding: 8px 10px; }
                }

                @media (max-width: 480px) {
                    .analysis-card { padding: 12px; }
                    .analysis-table thead th, .analysis-table tbody td { padding: 6px 8px; font-size: 9px !important; }
                    .analysis-header h3 { font-size: 13px; }
                }
            </style>

            <div class="analytics-container">
            <div class="page-header" style="display:flex; justify-content:space-between; align-items:center;">
                <div>
                    <h1 style="font-size:1.5rem; margin:0;">วิเคราะห์ข้อมูล</h1>
                    <p style="color:#64748b; font-size:12px; margin-top:4px;">ภาพรวมสถิติการเบิกจ่ายและแนวโน้มความผิดปกติ</p>
                </div>
                <div>
                    <label style="font-size:11px; margin-right:8px; color:#64748b;">ประจำเดือน:</label>
                    <input type="month" value="${this.currentFilterDate}" 
                           onchange="AnalyticsPage.handleFilterChange(this.value)"
                           style="padding:6px 12px; border:1px solid #cbd5e1; border-radius:6px; font-size:12px;">
                </div>
            </div>

            <div class="analytics-grid">
                <!-- Hospital Stats -->
                <div class="analysis-card">
                    <div class="analysis-header">
                        <div class="icon-box icon-hospital">${Icons.hospital || '🏥'}</div>
                        <h3>โรงพยาบาลที่เบิก</h3>
                    </div>
                    <div class="scrollable-table-container">
                        <table class="analysis-table">
                            <thead>
                                <tr>
                                    <th>ชื่อโรงพยาบาล</th>
                                    <th style="text-align:right">รวมยอดเบิก</th>
                                    <th style="text-align:right">ยอดอนุมัติ</th>
                                    <th style="text-align:right">ส่วนต่าง</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${sortedHospitals.map(h => `
                                    <tr>
                                        <td>${Helpers.truncate(h.name, 30)}</td>
                                        <td style="text-align:right">${Helpers.formatCurrency(h.totalClaim)}</td>
                                        <td style="text-align:right" class="val-success">${Helpers.formatCurrency(h.totalApproved)}</td>
                                        <td style="text-align:right" class="val-danger">+${Helpers.formatCurrency(h.excess)}</td>
                                    </tr>
                                `).join('')}
                                ${sortedHospitals.length === 0 ? '<tr><td colspan="4" style="text-align:center;padding:20px;">ไม่พบข้อมูล</td></tr>' : ''}
                            </tbody>
                            ${sortedHospitals.length > 0 ? `
                            <tfoot>
                                <tr>
                                    <td>รวมทั้งหมด</td>
                                    <td style="text-align:right">${Helpers.formatCurrency(hospitalTotals.claim)}</td>
                                    <td style="text-align:right; color:var(--success-700)">${Helpers.formatCurrency(hospitalTotals.approved)}</td>
                                    <td style="text-align:right; color:var(--danger-700)">+${Helpers.formatCurrency(hospitalTotals.excess)}</td>
                                </tr>
                            </tfoot>
                            ` : ''}
                        </table>
                    </div>
                </div>

                <!-- Province Stats -->
                <div class="analysis-card">
                    <div class="analysis-header">
                        <div class="icon-box icon-location">${Icons.location || '📍'}</div>
                        <h3>จังหวัดที่เกิดเหตุ</h3>
                    </div>
                    <div class="scrollable-table-container">
                        <table class="analysis-table">
                            <thead>
                                <tr>
                                    <th>จังหวัด</th>
                                    <th style="text-align:right">จำนวนเคส</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${sortedProvinces.map(p => `
                                    <tr>
                                        <td>${p.name}</td>
                                        <td style="text-align:right; font-weight:600;">${p.count}</td>
                                    </tr>
                                `).join('')}
                                ${sortedProvinces.length === 0 ? '<tr><td colspan="2" style="text-align:center;padding:20px;">ไม่พบข้อมูล</td></tr>' : ''}
                            </tbody>
                            ${sortedProvinces.length > 0 ? `
                            <tfoot>
                                <tr>
                                    <td>รวมทั้งหมด</td>
                                    <td style="text-align:right; font-weight:bold;">${totalCasesCount} เคส</td>
                                </tr>
                            </tfoot>
                            ` : ''}
                        </table>
                    </div>
                </div>
            </div>

            <!-- Top 10 Anomalies -->
            <div class="analysis-card">
                <div class="analysis-header">
                    <div class="icon-box icon-alert">⚠️</div>
                    <h3>10 อันดับ โรงพยาบาล ที่เบิกสูง ผิดปกติ</h3>
                    <span style="font-size:10px; color:#64748b; margin-left:auto;">(เรียงตาม % ส่วนต่างที่สูงกว่ายอดอนุมัติ)</span>
                </div>
                <div class="scrollable-table-container" style="max-height: 300px;">
                    <table class="analysis-table">
                        <thead>
                            <tr>
                                <th style="width:50px; text-align:center;">#</th>
                                <th>ชื่อโรงพยาบาล</th>
                                <th style="text-align:right">ส่วนต่าง (%)</th>
                                <th style="text-align:right">รวมยอดเบิก</th>
                                <th style="text-align:right">ยอดอนุมัติ</th>
                                <th style="text-align:right">ส่วนต่าง (บาท)</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${abnormalHospitals.map((h, index) => `
                                <tr>
                                    <td style="text-align:center; color:#94a3b8;">${index + 1}</td>
                                    <td>${h.name}</td>
                                    <td style="text-align:right;">
                                        <div style="display:inline-block; padding:2px 6px; background:#fef2f2; color:#ef4444; border-radius:4px; font-weight:bold;">
                                            ${h.percentExcess > 900 ? '>900' : h.percentExcess.toFixed(1)}%
                                        </div>
                                    </td>
                                    <td style="text-align:right">${Helpers.formatCurrency(h.totalClaim)}</td>
                                    <td style="text-align:right; color:#059669;">${Helpers.formatCurrency(h.totalApproved)}</td>
                                    <td style="text-align:right; color:#dc2626; font-weight:600;">+${Helpers.formatCurrency(h.excess)}</td>
                                </tr>
                            `).join('')}
                            ${abnormalHospitals.length === 0 ? '<tr><td colspan="6" style="text-align:center;padding:20px;">ไม่พบข้อมูลผิดปกติ</td></tr>' : ''}
                        </tbody>
                        ${abnormalHospitals.length > 0 ? `
                        <tfoot>
                            <tr>
                                <td colspan="3" style="text-align:right">รวมเฉพาะ 10 อันดับแรก</td>
                                <td style="text-align:right">${Helpers.formatCurrency(abnormalTotals.claim)}</td>
                                <td style="text-align:right; color:var(--success-700)">${Helpers.formatCurrency(abnormalTotals.approved)}</td>
                                <td style="text-align:right; color:var(--danger-700)">+${Helpers.formatCurrency(abnormalTotals.excess)}</td>
                            </tr>
                        </tfoot>
                        ` : ''}
                    </table>
                </div>
            </div>
            </div>
            </div>
        `;
    },

    async handleFilterChange(newDate) {
        const content = await this.render(newDate);
        // Re-render logic depending on app structure. 
        // Assuming 'App.renderPage' or similar can be called, or we manually replace content.
        // Since this returns string, detailed re-render logic is usually in main App router.
        // But here we might need to manually inject if called from event handler.
        const mainContent = document.querySelector('.main-content') || document.querySelector('#main-content');
        if (mainContent) {
            mainContent.innerHTML = content;
        }
    }
};
