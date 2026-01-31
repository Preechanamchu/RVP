/**
 * ══════════════════════════════════════════════════════════════════════════
 * AVA - Monthly Report Page
 * Executive summary with monthly trends, year selector and 3D charts
 * ══════════════════════════════════════════════════════════════════════════
 */

const MonthlyReportPage = {
    selectedYear: new Date().getFullYear(),

    async render() {
        const currentYear = new Date().getFullYear();
        const years = [];
        for (let i = 0; i < 5; i++) {
            years.push(currentYear - i);
        }

        const cases = await DataService.cases.getAll();
        const yearData = this.calculateYearData(cases, this.selectedYear);

        return `
            <style>
                .monthly-report-container { width: 100%; overflow-x: hidden; padding: 0 5px; box-sizing: border-box; }
                .monthly-summary-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; margin-top: 20px; width: 100%; }
                .analysis-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 20px; margin-top: 30px; width: 100%; }
                .analysis-card { background: white; border-radius: 12px; border: 1px solid #e2e8f0; padding: 20px; box-shadow: 0 1px 3px rgba(0,0,0,0.05); min-width: 0; width: 100%; box-sizing: border-box; }
                .analysis-card-full { grid-column: span 2; }
                .section-header-title { font-size: 15px !important; font-weight: 600; color: #1e293b; margin-bottom: 20px; display: flex; align-items: center; }
                .table-header-title { margin: 0; font-size: 15px !important; font-weight: 600; color: #334155; }
                .chart-wrapper { position: relative; height: 250px; width: 100%; }
                .chart-wrapper-full { position: relative; height: 300px; width: 100%; }
                .responsive-table th, .responsive-table td { transition: padding 0.2s; }
                
                @media (max-width: 992px) { .monthly-summary-grid { grid-template-columns: repeat(2, 1fr); } }
                @media (max-width: 768px) {
                    .monthly-summary-grid { grid-template-columns: repeat(2, 1fr); gap: 15px; }
                    .analysis-grid { grid-template-columns: 1fr; gap: 15px; }
                    .analysis-card-full { grid-column: span 1; }
                    .analysis-card { padding: 15px; }
                    .chart-wrapper { height: 220px; }
                    .chart-wrapper-full { height: 250px; }
                    .responsive-table th, .responsive-table td { padding: 10px 12px !important; }
                }
                @media (max-width: 480px) {
                    .monthly-summary-grid { grid-template-columns: repeat(2, 1fr); gap: 10px; }
                    .summary-card { padding: 10px !important; gap: 10px !important; }
                    .summary-card div:first-child { font-size: 1.5rem !important; }
                    .analysis-card { padding: 12px; }
                    .chart-wrapper { height: 200px; }
                    .chart-wrapper-full { height: 220px; }
                    .section-header-title { font-size: 14px !important; }
                    .responsive-table th, .responsive-table td { padding: 8px 6px !important; font-size: 9px !important; }
                    .table-header-title { font-size: 13px !important; }
                }
            </style>
            <div class="monthly-report-container">
            <!-- Summary Cards -->

            <!-- Summary Cards -->
            <!-- Summary Cards - Modern 6 Cards Layout (Stack Style) -->
            <div class="monthly-summary-grid">
                <!-- Row 1 -->
                <div class="summary-card" style="background:linear-gradient(135deg, #667eea 0%, #764ba2 100%); color:white; padding:15px 20px; border-radius:12px; display:flex; align-items:center; gap:15px; box-shadow:0 4px 6px -1px rgba(102, 126, 234, 0.4);">
                    <div style="font-size:2rem;">✅</div>
                    <div style="display:flex; flex-direction:column;">
                        <div style="font-size:18px; font-weight:700; line-height:1.2;">${yearData.totalApproved}</div>
                        <div style="font-size:12px; opacity:0.9;">อนุมัติเข้ารับการรักษา</div>
                    </div>
                </div>

                <div class="summary-card" style="background:linear-gradient(135deg, #667eea 0%, #764ba2 100%); color:white; padding:15px 20px; border-radius:12px; display:flex; align-items:center; gap:15px; box-shadow:0 4px 6px -1px rgba(102, 126, 234, 0.4);">
                    <div style="font-size:2rem;">❌</div>
                    <div style="display:flex; flex-direction:column;">
                        <div style="font-size:18px; font-weight:700; line-height:1.2;">${yearData.totalRejected}</div>
                        <div style="font-size:12px; opacity:0.9;">ไม่อนุมัติเข้ารับการรักษา</div>
                    </div>
                </div>

                <div class="summary-card" style="background:linear-gradient(135deg, #667eea 0%, #764ba2 100%); color:white; padding:15px 20px; border-radius:12px; display:flex; align-items:center; gap:15px; box-shadow:0 4px 6px -1px rgba(102, 126, 234, 0.4);">
                    <div style="font-size:2rem;">👥</div>
                    <div style="display:flex; flex-direction:column;">
                        <div style="font-size:18px; font-weight:700; line-height:1.2;">${yearData.totalCases}</div>
                        <div style="font-size:12px; opacity:0.9;">ผู้บาดเจ็บทั้งหมด</div>
                    </div>
                </div>

                <!-- Row 2 -->
                <div class="summary-card" style="background:linear-gradient(135deg, #667eea 0%, #764ba2 100%); color:white; padding:15px 20px; border-radius:12px; display:flex; align-items:center; gap:15px; box-shadow:0 4px 6px -1px rgba(102, 126, 234, 0.4);">
                    <div style="font-size:2rem;">💰</div>
                    <div style="display:flex; flex-direction:column;">
                        <div style="font-size:18px; font-weight:700; line-height:1.2;">${Helpers.formatCurrency(yearData.totalApprovedAmount)}</div>
                        <div style="font-size:12px; opacity:0.9;">ยอดที่จ่ายจริง (ปี ${this.selectedYear + 543})</div>
                    </div>
                </div>

                <div class="summary-card" style="background:linear-gradient(135deg, #667eea 0%, #764ba2 100%); color:white; padding:15px 20px; border-radius:12px; display:flex; align-items:center; gap:15px; box-shadow:0 4px 6px -1px rgba(102, 126, 234, 0.4);">
                    <div style="font-size:2rem;">🛡️</div>
                    <div style="display:flex; flex-direction:column;">
                        <div style="font-size:18px; font-weight:700; line-height:1.2;">${Helpers.formatCurrency(yearData.totalRejectedAmount)}</div>
                        <div style="font-size:12px; opacity:0.9;">ยอดที่ปฏิเสธได้</div>
                    </div>
                </div>

                <div class="summary-card" style="background:linear-gradient(135deg, #667eea 0%, #764ba2 100%); color:white; padding:15px 20px; border-radius:12px; display:flex; align-items:center; gap:15px; box-shadow:0 4px 6px -1px rgba(102, 126, 234, 0.4);">
                    <div style="font-size:2rem;">📈</div>
                    <div style="display:flex; flex-direction:column; flex:1;">
                        <div style="font-size:18px; font-weight:700; line-height:1.2;">${yearData.approvalRate}%</div>
                        <div style="font-size:12px; opacity:0.9;">อัตราอนุมัติ</div>
                        <div style="background:rgba(255,255,255,0.2); height:4px; border-radius:2px; margin-top:6px; overflow:hidden; width:100%;">
                            <div style="height:100%; background:white; width:${yearData.approvalRate}%"></div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Charts Grid -->
            <!-- Charts Grid -->
            <div class="analysis-grid">
                <div class="analysis-card analysis-card-full">
                    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:20px;">
                        <h3 class="section-header-title" style="margin-bottom:0;">
                            <span style="display:inline-block; width:4px; height:16px; background:#3b82f6; border-radius:2px; margin-right:8px;"></span>
                            แนวโน้มรายเดือน
                        </h3>
                        <select id="yearSelector" onchange="MonthlyReportPage.changeYear(this.value)" style="padding:2px 8px; border-radius:4px; border:1px solid #cbd5e1; background:#fff; font-size:12px; font-weight:500; cursor:pointer; outline:none; height:auto; width:auto;">
                            ${years.map(y => `<option value="${y}" ${y === this.selectedYear ? 'selected' : ''}>พ.ศ. ${y + 543}</option>`).join('')}
                        </select>
                    </div>
                    <div class="chart-wrapper-full">
                        <canvas id="monthlyTrendChart"></canvas>
                    </div>
                </div>

                <div class="analysis-card">
                    <h3 class="section-header-title">
                        <span style="display:inline-block; width:4px; height:16px; background:#10b981; border-radius:2px; margin-right:8px;"></span>
                        สัดส่วนการอนุมัติ
                    </h3>
                    <div class="chart-wrapper">
                        <canvas id="approvalDistChart"></canvas>
                    </div>
                </div>

                <div class="analysis-card">
                    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:20px;">
                        <h3 class="section-header-title" style="margin-bottom:0;">
                            <span style="display:inline-block; width:4px; height:16px; background:#f59e0b; border-radius:2px; margin-right:8px;"></span>
                            สัดส่วนค่าใช้จ่าย
                        </h3>
                    </div>
                    <div class="chart-wrapper">
                        <canvas id="financeDistChart"></canvas>
                    </div>
                </div>
            </div>

            <!-- Data Table Section -->
            <div class="analysis-card" style="margin-top:30px; overflow:hidden; padding:0;">
                <div class="card-header" style="background:#f8fafc; padding:15px 20px; border-bottom:1px solid #e2e8f0;">
                    <h3 class="table-header-title">📋 ตารางสรุปข้อมูลรายเดือน</h3>
                </div>
                <div style="overflow-x:auto;">
                    <table class="data-table responsive-table" style="width:100%; border-collapse:collapse;">
                        <thead>
                            <tr style="background:#f1f5f9; text-align:left; color:#475569;">
                                <th style="padding:12px 20px; font-weight:700; font-size:10px;">เดือน</th>
                                <th style="padding:12px 20px; font-weight:700; font-size:10px; text-align:center;">อนุมัติ (เคส)</th>
                                <th style="padding:12px 20px; font-weight:700; font-size:10px; text-align:center;">ไม่อนุมัติ (เคส)</th>
                                <th style="padding:12px 20px; font-weight:700; font-size:10px; text-align:right;">จ่ายจริง (บาท)</th>
                                <th style="padding:12px 20px; font-weight:700; font-size:10px; text-align:right;">ประหยัดได้ (บาท)</th>
                                <th style="padding:12px 20px; font-weight:700; font-size:10px; text-align:center;">อัตราอนุมัติ (%)</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${yearData.months.map(m => `
                                <tr style="border-bottom:1px solid #f1f5f9; font-size:10px;">
                                    <td style="padding:12px 20px; font-weight:500; color:#1e293b;">${m.monthName}</td>
                                    <td style="padding:12px 20px; text-align:center;"><span style="background:#d1fae5; color:#065f46; padding:2px 8px; border-radius:10px; font-size:10px;">${m.approved}</span></td>
                                    <td style="padding:12px 20px; text-align:center;"><span style="background:#fee2e2; color:#991b1b; padding:2px 8px; border-radius:10px; font-size:10px;">${m.rejected}</span></td>
                                    <td style="padding:12px 20px; text-align:right; font-family:monospace; color:#0f172a;">${Helpers.formatCurrency(m.amount).replace('฿', '')}</td>
                                    <td style="padding:12px 20px; text-align:right; font-family:monospace; color:#10b981;">${m.rejected > 0 ? Helpers.formatCurrency(m.amountSmoothed || 0).replace('฿', '-') : '-'}</td>
                                    <td style="padding:12px 20px; text-align:center; font-weight:600; color:${parseFloat(m.rate) > 80 ? '#10b981' : (parseFloat(m.rate) < 50 ? '#ef4444' : '#f59e0b')}">${m.rate}%</td>
                                </tr>
                            `).join('')}
                             <!-- Total Row -->
                            <tr style="background:#f8fafc; font-weight:700; border-top:2px solid #e2e8f0; font-size:10px;">
                                <td style="padding:16px 20px; color:#0f172a; font-size:10px;">รวมทั้งสิ้น</td>
                                <td style="padding:16px 20px; text-align:center; font-size:10px;">${yearData.totalApproved}</td>
                                <td style="padding:16px 20px; text-align:center; font-size:10px;">${yearData.totalRejected}</td>
                                <td style="padding:16px 20px; text-align:right; font-size:10px;">${Helpers.formatCurrency(yearData.totalApprovedAmount)}</td>
                                <td style="padding:16px 20px; text-align:right; color:#10b981; font-size:10px;">${Helpers.formatCurrency(yearData.totalRejectedAmount)}</td>
                                <td style="padding:16px 20px; text-align:center; font-size:10px;">${yearData.approvalRate}%</td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
        `;
    },
    calculateYearData(cases, year) {
        const monthlyData = {};
        const thaiMonths = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];

        for (let i = 0; i < 12; i++) {
            const key = `${year}-${String(i + 1).padStart(2, '0')}`;
            monthlyData[key] = { month: i + 1, monthName: thaiMonths[i], approved: 0, rejected: 0, amount: 0 };
        }

        let totalApproved = 0, totalRejected = 0, totalPaidAmount = 0, totalRejectableAmount = 0;
        let totalVictims = 0;

        let totalProcessedInitialAmount = 0; // For rate calculation

        // Status constants
        const STATUS_APPROVED = typeof CASE_STATUS !== 'undefined' ? CASE_STATUS.APPROVED : 'approved';
        const STATUS_REJECTED = typeof CASE_STATUS !== 'undefined' ? CASE_STATUS.REJECTED : 'rejected';

        cases.forEach(c => {
            const caseYear = c.createdAt?.substring(0, 4);
            const caseMonth = c.createdAt?.substring(0, 7);

            // Normalize victims
            let victims = c.victims || [];
            if (victims.length === 0 && (c.victimName || c.victimIdCard)) {
                // Fallback for legacy data without victims array
                victims = [{
                    status: c.status,
                    claimAmount: c.claimAmount || 0, // In legacy, this might be the only amount
                    initialClaimAmount: c.initialClaimAmount || c.claimAmount || 0
                }];
            }

            if (parseInt(caseYear) === year) {
                victims.forEach(v => {
                    totalVictims++;

                    // Assuming claimAmount is the 'Approved/Paid' amount (as per review.js logic)
                    // and initialClaimAmount is the 'Requested' amount.
                    const paid = parseFloat(v.claimAmount || 0);
                    const initial = parseFloat(v.initialClaimAmount || v.claimAmount || 0);

                    if (v.status === STATUS_APPROVED) {
                        totalApproved++;
                        // For monthly chart aggregation
                        if (monthlyData[caseMonth]) {
                            monthlyData[caseMonth].approved++;
                            monthlyData[caseMonth].amount += paid;
                        }

                        totalPaidAmount += paid;
                        totalRejectableAmount += (initial - paid);
                        totalProcessedInitialAmount += initial;

                    } else if (v.status === STATUS_REJECTED) {
                        totalRejected++;
                        if (monthlyData[caseMonth]) {
                            monthlyData[caseMonth].rejected++;
                        }

                        // If rejected, paid is 0 (or whatever is in claimAmount, usually 0)
                        totalPaidAmount += paid;
                        totalRejectableAmount += (initial - paid);
                        totalProcessedInitialAmount += initial;
                    }
                });
            }
        });

        const months = Object.values(monthlyData);
        const currentMonth = new Date().getMonth();
        const latestMonth = months[currentMonth] || months[0];
        const latestMonthName = thaiMonths[currentMonth] + ' ' + (year + 543);

        // Approval Rate = (Total Approved Cases / Total Cases) * 100 
        months.forEach(m => {
            const totalInMonth = m.approved + m.rejected;
            m.rate = totalInMonth > 0 ? ((m.approved / totalInMonth) * 100).toFixed(1) : 0;
        });

        const approvalRate = totalVictims > 0 ? ((totalApproved / totalVictims) * 100).toFixed(1) : 0;

        return {
            months,
            latestMonth,
            latestMonthName,
            totalApproved,
            totalRejected,
            totalApprovedAmount: totalPaidAmount,
            totalRejectedAmount: totalRejectableAmount,
            totalCases: totalVictims,
            approvalRate
        };
    },

    async afterRender() {
        // Wait for DOM
        setTimeout(async () => {
            if (typeof Chart === 'undefined') return;

            const cases = await DataService.cases.getAll();
            const yearData = this.calculateYearData(cases, this.selectedYear);

            // Destroy old charts
            ['approvalDistChart', 'financeDistChart', 'monthlyTrendChart'].forEach(id => {
                const canvas = document.getElementById(id);
                if (canvas) {
                    const chartInstance = Chart.getChart(canvas);
                    if (chartInstance) chartInstance.destroy();
                }
            });

            // Common Options
            const commonOptions = {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: { padding: 20, usePointStyle: true, font: { family: "'Inter', sans-serif", size: 12 } }
                    },
                    tooltip: {
                        backgroundColor: 'rgba(255, 255, 255, 0.95)',
                        titleColor: '#1e293b',
                        bodyColor: '#475569',
                        borderColor: '#e2e8f0',
                        borderWidth: 1,
                        padding: 10,
                        boxPadding: 4,
                        cornerRadius: 8,
                        displayColors: true,
                        callbacks: {
                            label: function (context) {
                                let label = context.label || '';
                                if (label) label += ': ';
                                if (context.parsed.y !== undefined) {
                                    label += context.parsed.y;
                                } else {
                                    label += context.parsed;
                                }
                                return label;
                            }
                        }
                    }
                }
            };

            // 1. Approval Distribution
            this.renderChart('approvalDistChart', 'doughnut', {
                labels: ['อนุมัติ', 'ไม่อนุมัติ'],
                datasets: [{
                    data: [yearData.totalApproved, yearData.totalRejected],
                    backgroundColor: ['#10B981', '#EF4444'],
                    borderWidth: 0,
                    hoverOffset: 10
                }]
            }, {
                ...commonOptions,
                cutout: '75%',
            });

            // 2. Finance Distribution (Pie)
            this.renderChart('financeDistChart', 'pie', {
                labels: ['ยอดจ่ายจริง', 'ยอดที่ประหยัดได้'],
                datasets: [{
                    data: [yearData.totalApprovedAmount, yearData.totalRejectedAmount],
                    backgroundColor: ['#F59E0B', '#3B82F6'],
                    borderWidth: 0,
                    hoverOffset: 10
                }]
            }, commonOptions);

            // 3. Monthly Trends (Combined Bar & Line)
            this.renderChart('monthlyTrendChart', 'bar', {
                labels: yearData.months.map(m => m.monthName),
                datasets: [
                    {
                        label: 'อนุมัติ (เคส)',
                        data: yearData.months.map(m => m.approved),
                        backgroundColor: '#10B981',
                        borderRadius: 4,
                        order: 2
                    },
                    {
                        label: 'ไม่อนุมัติ (เคส)',
                        data: yearData.months.map(m => m.rejected),
                        backgroundColor: '#EF4444',
                        borderRadius: 4,
                        order: 3
                    },
                    {
                        type: 'line',
                        label: 'อัตราอนุมัติ (%)',
                        data: yearData.months.map(m => m.rate),
                        borderColor: '#6366F1',
                        borderWidth: 3,
                        pointBackgroundColor: '#fff',
                        pointBorderColor: '#6366F1',
                        pointBorderWidth: 2,
                        pointRadius: 4,
                        tension: 0.4,
                        yAxisID: 'y1',
                        order: 1
                    }
                ]
            }, {
                ...commonOptions,
                scales: {
                    x: {
                        grid: { display: false },
                        ticks: { font: { family: "'Inter', sans-serif" } }
                    },
                    y: {
                        beginAtZero: true,
                        grid: { borderDash: [2, 4], color: '#f1f5f9' },
                        title: { display: true, text: 'จำนวนเคส' }
                    },
                    y1: {
                        type: 'linear',
                        display: true,
                        position: 'right',
                        min: 0,
                        max: 100,
                        grid: { display: false },
                        title: { display: true, text: 'อัตราอนุมัติ (%)' }
                    }
                }
            });

        }, 300);
    },

    async changeYear(year) {
        this.selectedYear = parseInt(year);
        App.refreshPage();
    },

    renderChart(canvasId, type, data, options) {
        const canvas = document.getElementById(canvasId);
        if (!canvas) return;
        new Chart(canvas.getContext('2d'), { type, data, options });
    }
};

