/**
 * ══════════════════════════════════════════════════════════════════════════
 * AVA - Dashboard Page
 * Role-based dashboard with statistics and quick actions
 * ══════════════════════════════════════════════════════════════════════════
 */

const DashboardPage = {
    charts: {},
    allCases: [],
    selectedFilter: null,
    selectedMonth: null,

    /**
     * Render dashboard based on user role
     * @returns {string}
     */
    async render() {
        const user = AuthService.getCurrentUserSync();
        const role = user?.role;

        // Get all cases for stats calculation
        if (role === ROLES.INSPECTOR) {
            this.allCases = await DataService.cases.getByInspector(user.id);
        } else {
            this.allCases = await DataService.cases.getAll();
        }

        // Calculate dashboard stats
        const dashboardStats = this.calculateDashboardStats(this.allCases, role);
        this.currentStats = dashboardStats;

        // Get current month for default
        const now = new Date();
        const currentMonthValue = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

        return `
            <div class="page-header" style="padding-bottom:0;border:none">
                <!-- Header Removed as requested -->
            </div>
            
            <style>
                /* Overrides for Compact Dashboard Cards */
                .dashboard-cards-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)) !important; /* Allow small cards */
                    gap: 12px !important;
                }
                /* Force 6 columns on desktop to ensure single row */
                @media (min-width: 1200px) {
                    .dashboard-cards-grid {
                        grid-template-columns: repeat(6, 1fr) !important;
                    }
                }
                .dashboard-card {
                    padding: 12px !important; /* Smaller padding */
                    min-height: 90px !important; /* Smaller height */
                }
                .dashboard-card-icon {
                    font-size: 1.5rem !important; /* Smaller icon */
                    margin-bottom: 6px !important;
                }
                .dashboard-card-value {
                    font-size: 1.5rem !important; /* Smaller value */
                    margin-bottom: 2px !important;
                }
                .dashboard-card-label {
                    font-size: 0.8rem !important; /* Smaller label */
                    white-space: nowrap;
                    overflow: hidden;
                    text-overflow: ellipsis;
                }
                
                /* Mobile Responsive Adjustments */
                @media (max-width: 768px) {
                    .charts-mixed-grid {
                        grid-template-columns: 1fr !important; /* Force single column on mobile */
                    }
                    .dashboard-cards-grid {
                        grid-template-columns: repeat(2, 1fr) !important; /* 2 columns for stats cards */
                    }
                }
                @media (max-width: 480px) {
                    .dashboard-cards-grid {
                        gap: 8px !important;
                    }
                    .dashboard-card {
                        padding: 8px !important;
                        min-height: 80px !important;
                    }
                    .dashboard-card-value {
                        font-size: 1.25rem !important;
                    }
                }
            </style>

            <!-- Stats Cards - 5 Modern Cards -->
            <div class="dashboard-cards-grid">
                ${this.renderDashboardCards(dashboardStats, role)}
            </div>

            <!-- Charts Section - Mixed Enterprise Layout -->
            <div class="charts-mixed-grid" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: var(--space-4); margin-top: var(--space-6);">
                
                <!-- 1. Work Trends (Line Chart) -->
                <div class="card" style="grid-column: span 2; border: none; box-shadow: var(--shadow-md); border-radius: var(--radius-lg); overflow: hidden;">
                    <div class="card-header" style="background: #fff; padding: var(--space-4); border-bottom: 1px solid var(--neutral-100); display: flex; justify-content: space-between; align-items: center;">
                        <h3 style="font-family: 'Prompt', sans-serif; font-size: 1.1rem; color: var(--neutral-800); font-weight: 600; display: flex; align-items: center; gap: 8px;">
                            📈 แนวโน้มจำนวนงาน (รายเดือน)
                        </h3>
                        <div class="calendar-picker-wrapper" style="position: relative;">
                             <button class="btn btn-sm" onclick="document.getElementById('monthPicker').showPicker()" 
                                    style="background: var(--primary-50); color: var(--primary-700); border: 1px solid var(--primary-200); border-radius: 6px; padding: 6px 12px; font-weight: 500; transition: all 0.2s;">
                                📅 เลือกเดือน
                            </button>
                            <input type="month" id="monthPicker" 
                                   value="${currentMonthValue}"
                                   style="position:absolute;opacity:0;width:0;height:0;pointer-events:none;" 
                                   onchange="DashboardPage.onMonthChange(this.value)">
                        </div>
                    </div>
                    <div style="height: 350px; padding: var(--space-4); position: relative;">
                        <canvas id="trendChart"></canvas>
                    </div>
                </div>

                <!-- 2. Approval Comparison (Donut Chart) -->
                ${role !== ROLES.INSPECTOR ? `
                <div class="card" style="border: none; box-shadow: var(--shadow-md); border-radius: var(--radius-lg); overflow: hidden;">
                    <div class="card-header" style="background: #fff; padding: var(--space-4); border-bottom: 1px solid var(--neutral-100); display: flex; justify-content: space-between; align-items: center;">
                        <h3 style="font-family: 'Prompt', sans-serif; font-size: 1.1rem; color: var(--neutral-800); font-weight: 600; display: flex; align-items: center; gap: 8px;">
                            📊 สัดส่วนการอนุมัติ
                        </h3>
                    </div>
                    <div style="height: 350px; padding: var(--space-4); position: relative;">
                        <canvas id="statusChart"></canvas>
                    </div>
                </div>

                <!-- 3. Annual History (Bar Chart) - Full Width -->
                <div class="card" style="grid-column: 1 / -1; border: none; box-shadow: var(--shadow-md); border-radius: var(--radius-lg); overflow: hidden;">
                    <div class="card-header" style="background: #fff; padding: var(--space-4); border-bottom: 1px solid var(--neutral-100); display: flex; justify-content: space-between; align-items: center;">
                        <h3 style="font-family: 'Prompt', sans-serif; font-size: 1.1rem; color: var(--neutral-800); font-weight: 600; display: flex; align-items: center; gap: 8px;">
                            📅 สถิติตลอดทั้งปี (12 เดือน)
                        </h3>
                         <span id="selectedMonthLabel" style="background: var(--neutral-100); color: var(--neutral-600); padding: 4px 10px; border-radius: 20px; font-size: 0.85rem; font-weight: 500;">
                            ปี: ${now.getFullYear() + 543}
                        </span>
                    </div>
                    <div style="height: 350px; padding: var(--space-4); position: relative;">
                        <canvas id="annualChart"></canvas>
                    </div>
                </div>
                ` : ''}
            </div>
            
            <style>
                @media (max-width: 1024px) {
                    .charts-mixed-grid .card { grid-column: span 1 !important; }
                }
                /* Ensure full width charts on mobile take full width of container */
                @media (max-width: 768px) {
                    .charts-mixed-grid {
                        display: flex !important;
                        flex-direction: column;
                    }
                }
            </style>

            <!-- Filtered Cases Container (shown when card is clicked) - Below Charts -->
            <div id="filteredCasesContainer" style="display: none; margin-top: var(--space-4);">
                <div class="card">
                    <div class="card-header" style="display: flex; justify-content: space-between; align-items: center;">
                        <h4 id="filteredCasesTitle" style="margin: 0;">รายการเคส</h4>
                        <button class="btn btn-ghost btn-sm" onclick="DashboardPage.closeFilteredCases()">✕ ปิด</button>
                    </div>
                    <div class="card-body" id="filteredCasesList">
                        <!-- Cases will be rendered here -->
                    </div>
                </div>
            </div>
        `;
    },

    /**
     * Format Thai month name
     */
    formatThaiMonth(monthIndex, year) {
        const thaiMonths = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
        return `${thaiMonths[monthIndex]} ${year + 543}`;
    },

    /**
     * Calculate dashboard statistics
     */
    calculateDashboardStats(cases, role) {
        const now = new Date();
        const todayStr = now.toISOString().split('T')[0];
        const monthStr = now.toISOString().slice(0, 7); // YYYY-MM
        const yearStr = now.getFullYear().toString();

        // Count by time period
        const todayCases = cases.filter(c => c.createdAt?.startsWith(todayStr));
        const monthCases = cases.filter(c => c.createdAt?.startsWith(monthStr));
        const yearCases = cases.filter(c => c.createdAt?.startsWith(yearStr));

        // Victim Stats
        let approvedVictims = 0;
        let rejectedVictims = 0;
        let totalVictims = 0;

        // Define statuses if not global (assumed global based on usage)
        const STATUS_APPROVED = typeof CASE_STATUS !== 'undefined' ? CASE_STATUS.APPROVED : 'approved';
        const STATUS_REJECTED = typeof CASE_STATUS !== 'undefined' ? CASE_STATUS.REJECTED : 'rejected';
        const IS_INSPECTOR = role === ROLES.INSPECTOR;

        cases.forEach(c => {
            // For Admins/SuperAdmins, do NOT count victims if case is NEW (not yet submitted by inspector)
            if (!IS_INSPECTOR && c.status === CASE_STATUS.NEW) {
                return;
            }
            // Normalize victims: use array or fallback to single case attributes if legacy
            // If c.victims exists, use it. If not, construct from case root if meaningful data exists.
            let caseVictims = c.victims || [];
            if (caseVictims.length === 0 && (c.victimName || c.victimIdCard)) {
                // Legacy case structure fallback
                caseVictims = [{
                    status: c.status // In legacy, case status = victim status
                }];
            }

            caseVictims.forEach(v => {
                totalVictims++;
                if (v.status === STATUS_APPROVED) approvedVictims++;
                if (v.status === STATUS_REJECTED) rejectedVictims++;
            });
        });

        // Check for new reports today (for blinking notification)
        const hasNewReports = todayCases.length > 0;

        // Count "Sent Work" for Inspector (Assumed: All cases that are not in initial 'new/pending' working state, OR just all cases if they only see what they sent?
        // User said "Every story that presses send case = sent work".
        // Usually Inspector works on NEW/ASSIGNED. When they "Send Case", it becomes INSPECTED.
        const sentWorkCount = cases.filter(c =>
            c.status === CASE_STATUS.INSPECTED ||
            c.status === CASE_STATUS.APPROVED ||
            c.status === CASE_STATUS.REJECTED ||
            c.status === 'closed'
        ).length;



        return {
            today: todayCases.length,
            month: monthCases.length,
            year: yearCases.length,
            approvedVictims: approvedVictims,
            rejectedVictims: rejectedVictims,
            totalVictims: totalVictims,
            sentWork: sentWorkCount,
            hasNewReports: hasNewReports,
            // Additional Stats for Inspector
            waitingInspection: cases.filter(c => c.status === CASE_STATUS.NEW).length,
            closedCount: cases.filter(c => c.status === CASE_STATUS.CLOSED).length
        };
    },

    /**
     * Render dashboard cards - 5 cards for Admin, 4 cards for Inspector
     */
    renderDashboardCards(stats, role) {
        // Inspector sees 6 cards
        if (role === ROLES.INSPECTOR) {
            const inspectorCards = [
                { icon: '📥', value: stats.today, label: 'งานใหม่วันนี้', filterType: 'today', gradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', shadowColor: 'rgba(102, 126, 234, 0.4)', pulse: stats.hasNewReports },
                { icon: '📅', value: stats.month, label: 'งานเดือนนี้', filterType: 'month', gradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', shadowColor: 'rgba(102, 126, 234, 0.4)', pulse: false },
                { icon: '📊', value: stats.year, label: 'งานปีนี้', filterType: 'year', gradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', shadowColor: 'rgba(102, 126, 234, 0.4)', pulse: false },
                { icon: '✅', value: stats.sentWork, label: 'ส่งงานแล้ว', filterType: 'sent_work', gradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', shadowColor: 'rgba(102, 126, 234, 0.4)', pulse: false },
                { icon: '⏳', value: stats.waitingInspection, label: 'รอตรวจสอบ', filterType: 'waiting_inspection', gradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', shadowColor: 'rgba(102, 126, 234, 0.4)', pulse: stats.waitingInspection > 0 },
                { icon: '🏁', value: stats.closedCount, label: 'ตรวจสอบแล้ว', filterType: 'closed', gradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', shadowColor: 'rgba(102, 126, 234, 0.4)', pulse: false }
            ];

            return inspectorCards.map(card => `
                <div class="dashboard-card ${card.pulse ? 'pulse-animation' : ''}" 
                     style="--card-gradient: ${card.gradient}; --card-shadow: ${card.shadowColor}; cursor: pointer;"
                     onclick="DashboardPage.filterByCard('${card.filterType}', '${card.label}')">
                    <div class="dashboard-card-icon">${card.icon}</div>
                    <div class="dashboard-card-content">
                        <div class="dashboard-card-value">${card.value}</div>
                        <div class="dashboard-card-label">${card.label}</div>
                    </div>
                    ${card.pulse ? '<div class="dashboard-card-pulse-ring"></div>' : ''}
                    <div class="dashboard-card-decoration"></div>
                </div>
            `).join('');
        }

        // Admin/SuperAdmin sees 6 cards (3 time-based + 3 victim-stats)
        const cards = [
            { icon: '📥', value: stats.today, label: 'งานใหม่วันนี้', filterType: 'today', gradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', shadowColor: 'rgba(102, 126, 234, 0.4)', pulse: stats.hasNewReports },
            { icon: '📅', value: stats.month, label: 'งานเดือนนี้', filterType: 'month', gradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', shadowColor: 'rgba(102, 126, 234, 0.4)', pulse: false },
            { icon: '📊', value: stats.year, label: 'งานปีนี้', filterType: 'year', gradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', shadowColor: 'rgba(102, 126, 234, 0.4)', pulse: false },
            { icon: '✅', value: stats.approvedVictims, label: 'อนุมัติเข้ารับการรักษา', filterType: 'approved_victims', gradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', shadowColor: 'rgba(102, 126, 234, 0.4)', pulse: false },
            { icon: '❌', value: stats.rejectedVictims, label: 'ไม่อนุมัติเข้ารับการรักษา', filterType: 'rejected_victims', gradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', shadowColor: 'rgba(102, 126, 234, 0.4)', pulse: false },
            { icon: '👥', value: stats.totalVictims, label: 'ผู้บาดเจ็บทั้งหมด', filterType: 'all_victims', gradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', shadowColor: 'rgba(102, 126, 234, 0.4)', pulse: false }
        ];

        return cards.map(card => `
            <div class="dashboard-card ${card.pulse ? 'pulse-animation' : ''}" 
                 style="--card-gradient: ${card.gradient}; --card-shadow: ${card.shadowColor}; cursor: pointer;"
                 onclick="DashboardPage.filterByCard('${card.filterType}', '${card.label}')">
                <div class="dashboard-card-icon">${card.icon}</div>
                <div class="dashboard-card-content">
                    <div class="dashboard-card-value">${card.value}</div>
                    <div class="dashboard-card-label">${card.label}</div>
                </div>
                ${card.pulse ? '<div class="dashboard-card-pulse-ring"></div>' : ''}
                <div class="dashboard-card-decoration"></div>
            </div>
        `).join('');
    },

    /**
     * Filter cases by card type and show in container
     */
    filterByCard(filterType, label) {
        const now = new Date();
        const todayStr = now.toISOString().split('T')[0];
        const monthStr = now.toISOString().slice(0, 7);
        const yearStr = now.getFullYear().toString();

        let filteredCases = [];
        switch (filterType) {
            case 'today':
                filteredCases = this.allCases.filter(c => c.createdAt?.startsWith(todayStr));
                break;
            case 'month':
                filteredCases = this.allCases.filter(c => c.createdAt?.startsWith(monthStr));
                break;
            case 'year':
                filteredCases = this.allCases.filter(c => c.createdAt?.startsWith(yearStr));
                break;
            case 'approved_victims':
                filteredCases = this.allCases.filter(c => {
                    const vs = c.victims || (c.status ? [{ status: c.status }] : []);
                    return vs.some(v => v.status === CASE_STATUS.APPROVED);
                });
                break;
            case 'rejected_victims':
                filteredCases = this.allCases.filter(c => {
                    const vs = c.victims || (c.status ? [{ status: c.status }] : []);
                    return vs.some(v => v.status === CASE_STATUS.REJECTED);
                });
                break;
            case 'all_victims':
                filteredCases = this.allCases; // Show all cases that have victims (usually all)
                break;
            case 'waiting_inspection':
                filteredCases = this.allCases.filter(c => c.status === CASE_STATUS.NEW);
                break;
            // Note: 'closed' filterType matches the 'ตรวจสอบแล้ว' card which counts CASE_STATUS.CLOSED
            case 'closed':
                filteredCases = this.allCases.filter(c => c.status === CASE_STATUS.CLOSED);
                break;
        }

        this.selectedFilter = filterType;
        this.showFilteredCases(filteredCases, label);
    },

    /**
     * Show filtered cases in the container
     */
    showFilteredCases(cases, title) {
        const container = document.getElementById('filteredCasesContainer');
        const titleEl = document.getElementById('filteredCasesTitle');
        const listEl = document.getElementById('filteredCasesList');

        if (!container || !listEl) return;

        titleEl.textContent = `${title} (${cases.length} เคส)`;

        if (cases.length === 0) {
            listEl.innerHTML = `
                <div style="text-align: center; padding: var(--space-6); color: var(--neutral-500);">
                    <div style="font-size: 2rem; margin-bottom: var(--space-2);">📭</div>
                    <p>ไม่พบข้อมูลเคส</p>
                </div>
            `;
        } else {
            listEl.innerHTML = `
                <table class="data-table">
                    <thead>
                        <tr>
                            <th>เลขเคส</th>
                            <th>วันที่สร้าง</th>
                            <th>โรงพยาบาล</th>
                            <th>สถานะ</th>
                            <th>การดำเนินการ</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${cases.slice(0, 20).map(c => `
                            <tr>
                                <td><span class="case-id">${c.caseNumber || '-'}</span></td>
                                <td>${Helpers.formatDate(c.createdAt)}</td>
                                <td>${Helpers.escapeHtml(c.hospitalName || '-')}</td>
                                <td><span class="badge ${STATUS_BADGE_CLASS[c.status] || ''}">${STATUS_NAMES[c.status] || c.status}</span></td>
                                <td>
                                    <button class="btn btn-ghost btn-sm" onclick="App.navigate('${ROUTES.CASE_DETAIL}', '${c.id}')" title="ดูรายละเอียด">
                                        ${Icons.eye}
                                    </button>
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
                ${cases.length > 20 ? `<p style="text-align: center; color: var(--neutral-500); margin-top: var(--space-3);">แสดง 20 จาก ${cases.length} เคส</p>` : ''}
            `;
        }

        container.style.display = 'block';
        container.scrollIntoView({ behavior: 'smooth', block: 'start' });
    },

    /**
     * Close filtered cases container
     */
    closeFilteredCases() {
        const container = document.getElementById('filteredCasesContainer');
        if (container) {
            container.style.display = 'none';
        }
        this.selectedFilter = null;
    },

    /**
     * Handle month picker change - update both charts
     */
    async onMonthChange(monthValue) {
        if (!monthValue) return;

        const [year, month] = monthValue.split('-');
        const selectedYear = parseInt(year);
        const selectedMonth = parseInt(month) - 1; // 0-indexed

        this.selectedMonth = { year: selectedYear, month: selectedMonth };

        // Update label
        const label = document.getElementById('selectedMonthLabel');
        if (label) {
            label.textContent = `เดือน: ${this.formatThaiMonth(selectedMonth, selectedYear)}`;
        }

        // Update Trend chart (Daily) for selected month
        await this.updateTrendChartForMonth(selectedYear, selectedMonth);

        // Update monthly chart (Annual) for selected year - Keep annual logic
        await this.updateMonthlyChart(selectedYear);

        Toast.info(`แสดงข้อมูลเดือน ${this.formatThaiMonth(selectedMonth, selectedYear)}`);
    },

    /**
     * Update Trend chart (previously weekly) to show Daily stats for selected month
     */
    async updateTrendChartForMonth(year, month) {
        if (!this.charts.weekly) return; // charts.weekly is now the trend chart

        const user = AuthService.getCurrentUserSync();
        let cases;
        if (user?.role === ROLES.INSPECTOR) {
            cases = await DataService.cases.getByInspector(user.id);
        } else {
            cases = await DataService.cases.getAll();
        }

        // Get days in the selected month
        const daysInMonth = new Date(year, month + 1, 0).getDate(); // 28-31

        const dayLabels = [];
        const dayData = [];

        // Build data for each day 1..N
        for (let i = 1; i <= daysInMonth; i++) {
            // Check cases for this day
            const targetDateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;

            const count = cases.filter(c => c.createdAt?.startsWith(targetDateStr)).length;

            dayLabels.push(i.toString()); // Label is just the day number
            dayData.push(count);
        }

        this.charts.weekly.data.labels = dayLabels;
        this.charts.weekly.data.datasets[0].data = dayData;
        this.charts.weekly.data.datasets[0].label = `จำนวนงาน (รายวัน) เดือน ${this.formatThaiMonth(month, year)}`;
        this.charts.weekly.update();
    },

    /**
     * Update monthly chart for a specific year
     */
    async updateMonthlyChart(year) {
        if (!this.charts.monthly) return;

        const chartData = await DataService.cases.getChartData(year);
        this.charts.monthly.data.datasets[0].data = chartData.monthly.data;
        this.charts.monthly.update();
    },

    /**
     * Post-render initialization for Charts
     */
    async afterRender() {
        const user = AuthService.getCurrentUserSync();
        const role = user?.role;

        // Get chart data
        let chartData;
        if (role === ROLES.INSPECTOR) {
            chartData = await this.getInspectorChartData(user.id);
        } else {
            chartData = await DataService.cases.getChartData();
        }

        // Common chart options - Enterprise Grade
        const commonOptions = {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false // Hide legend for cleaner look, title handles context
                },
                tooltip: {
                    backgroundColor: 'rgba(255, 255, 255, 0.95)',
                    titleColor: '#1f2937',
                    bodyColor: '#4b5563',
                    titleFont: { family: "'Sarabun', sans-serif", size: 14, weight: 'bold' },
                    bodyFont: { family: "'Sarabun', sans-serif", size: 13 },
                    padding: 12,
                    cornerRadius: 8,
                    borderColor: 'rgba(0,0,0,0.05)',
                    borderWidth: 1,
                    boxPadding: 4,
                    usePointStyle: true,
                    callbacks: {
                        label: function (context) {
                            return `จำนวน: ${context.parsed.y} เรื่อง`;
                        }
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        stepSize: 1,
                        font: { family: "'Sarabun', sans-serif", size: 11 },
                        color: '#9ca3af'
                    },
                    grid: {
                        color: '#f3f4f6',
                        drawBorder: false,
                        tickLength: 0
                    },
                    border: { display: false }
                },
                x: {
                    grid: { display: false },
                    ticks: {
                        font: { family: "'Sarabun', sans-serif", size: 12 },
                        color: '#6b7280'
                    },
                    border: { display: false }
                }
            },
            layout: { padding: { top: 10, bottom: 10, left: 10, right: 10 } },
            elements: {
                bar: {
                    borderRadius: 6, // Rounded corners
                    borderSkipped: false // Round all corners or just top? borderSkipped: 'bottom' usually better for bars
                }
            }
        };

        // 1. Trend Chart (Line) - Replaces Weekly Bar
        const trendCtx = document.getElementById('trendChart').getContext('2d');
        const gradientTrend = trendCtx.createLinearGradient(0, 0, 0, 300);
        gradientTrend.addColorStop(0, 'rgba(129, 140, 248, 0.4)'); // Indigo
        gradientTrend.addColorStop(1, 'rgba(129, 140, 248, 0.0)');

        this.charts.weekly = new Chart(trendCtx, {
            type: 'line',
            data: {
                labels: chartData.weekly.labels,
                datasets: [{
                    label: 'จำนวนงานใหม่',
                    data: chartData.weekly.data, // Using weekly data as "Trend"
                    borderColor: '#6366f1',
                    backgroundColor: gradientTrend,
                    borderWidth: 3,
                    pointBackgroundColor: '#fff',
                    pointBorderColor: '#6366f1',
                    pointHoverBackgroundColor: '#6366f1',
                    pointHoverBorderColor: '#fff',
                    pointRadius: 4,
                    pointHoverRadius: 6,
                    fill: true,
                    tension: 0.4 // Smooth curve
                }]
            },
            options: {
                ...commonOptions,
                interaction: {
                    mode: 'index',
                    intersect: false,
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        grid: { color: '#f3f4f6', borderDash: [5, 5] },
                        ticks: { stepSize: 1, font: { family: "'Sarabun', sans-serif" } }
                    },
                    x: {
                        grid: { display: false },
                        ticks: { font: { family: "'Sarabun', sans-serif" } }
                    }
                }
            }
        });

        // 2. & 3. Specific Charts (Skip for Inspector)
        if (role !== ROLES.INSPECTOR) {
            // 2. Status Chart (Bar) - Approved vs Rejected vs Total
            const statusData = this.currentStats ? [
                this.currentStats.approvedVictims || this.currentStats.approved || 0,
                this.currentStats.rejectedVictims || this.currentStats.rejected || 0,
                this.currentStats.totalVictims || this.currentStats.total || 0
            ] : [0, 0, 0];

            const statusCtx = document.getElementById('statusChart').getContext('2d');
            const gradientApproved = statusCtx.createLinearGradient(0, 0, 0, 300);
            gradientApproved.addColorStop(0, '#34d399');
            gradientApproved.addColorStop(1, '#10b981');

            const gradientRejected = statusCtx.createLinearGradient(0, 0, 0, 300);
            gradientRejected.addColorStop(0, '#f87171');
            gradientRejected.addColorStop(1, '#ef4444');

            const gradientTotal = statusCtx.createLinearGradient(0, 0, 0, 300);
            gradientTotal.addColorStop(0, '#818cf8');
            gradientTotal.addColorStop(1, '#6366f1');

            this.charts.status = new Chart(statusCtx, {
                type: 'bar',
                data: {
                    labels: ['อนุมัติ', 'ไม่อนุมัติ', 'ผู้บาดเจ็บทั้งหมด'],
                    datasets: [{
                        label: 'จำนวน (ราย)',
                        data: statusData,
                        backgroundColor: [
                            gradientApproved, // Green
                            gradientRejected, // Red
                            gradientTotal     // Purple
                        ],
                        borderRadius: 8,
                        barPercentage: 0.5,
                        borderSkipped: false
                    }]
                },
                options: {
                    ...commonOptions,
                    plugins: {
                        ...commonOptions.plugins,
                        legend: { display: false } // Hide legend as x-axis labels differ
                    },
                    scales: {
                        y: {
                            beginAtZero: true,
                            grid: { color: '#f3f4f6' },
                            ticks: { stepSize: 1, font: { family: "'Sarabun', sans-serif" } }
                        },
                        x: {
                            grid: { display: false },
                            ticks: { font: { family: "'Sarabun', sans-serif" } }
                        }
                    }
                }
            });

            // 3. Annual Chart (Bar) - Replaces Monthly
            // Using Monthly data but displayed full width
            const annualCtx = document.getElementById('annualChart').getContext('2d');
            const gradientAnnual = annualCtx.createLinearGradient(0, 0, 0, 400);
            gradientAnnual.addColorStop(0, '#2dd4bf'); // teal
            gradientAnnual.addColorStop(1, '#3b82f6'); // blue

            this.charts.monthly = new Chart(annualCtx, {
                type: 'bar',
                data: {
                    labels: chartData.monthly.labels,
                    datasets: [{
                        label: 'จำนวนงานทั้งหมด',
                        data: chartData.monthly.data,
                        backgroundColor: gradientAnnual,
                        borderRadius: 4,
                        barPercentage: 0.6,
                    }]
                },
                options: {
                    ...commonOptions,
                    scales: {
                        y: {
                            beginAtZero: true,
                            grid: { color: '#f3f4f6' },
                        },
                        x: {
                            grid: { display: false }
                        }
                    }
                }
            });
        }

        // Initialize Trend Chart with current month data
        const now = new Date();
        this.updateTrendChartForMonth(now.getFullYear(), now.getMonth());
    },

    /**
     * Get chart data for inspector's own cases
     */
    async getInspectorChartData(userId) {
        const cases = await DataService.cases.getByInspector(userId);

        // Weekly data (Mon-Sun)
        const weekDays = ['จันทร์', 'อังคาร', 'พุธ', 'พฤหัสบดี', 'ศุกร์', 'เสาร์', 'อาทิตย์'];
        const weeklyData = [0, 0, 0, 0, 0, 0, 0];

        // Get start of current week (Monday)
        const now = new Date();
        const dayOfWeek = now.getDay();
        const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
        const monday = new Date(now);
        monday.setDate(now.getDate() + mondayOffset);
        monday.setHours(0, 0, 0, 0);

        cases.forEach(c => {
            const caseDate = new Date(c.createdAt);
            if (caseDate >= monday) {
                const caseDayOfWeek = caseDate.getDay();
                const index = caseDayOfWeek === 0 ? 6 : caseDayOfWeek - 1;
                weeklyData[index]++;
            }
        });

        return {
            weekly: { labels: weekDays, data: weeklyData },
            monthly: { labels: [], data: [] }
        };
    }
};
