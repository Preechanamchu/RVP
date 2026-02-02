/**
 * ══════════════════════════════════════════════════════════════════════════
 * AVA System - Case Statistics Function
 * GET /api/cases-stats
 * ══════════════════════════════════════════════════════════════════════════
 */

const db = require('./utils/db');
const auth = require('./utils/auth');
const response = require('./utils/response');

exports.handler = async (event, context) => {
    // Handle CORS preflight
    if (event.httpMethod === 'OPTIONS') {
        return response.corsResponse();
    }

    // Only allow GET
    if (event.httpMethod !== 'GET') {
        return response.methodNotAllowed(['GET']);
    }

    try {
        // Verify authentication
        const { user, errorResponse } = auth.requireAuth(event);
        if (errorResponse) {
            return errorResponse;
        }

        // Get optional year parameter
        const params = event.queryStringParameters || {};
        const year = parseInt(params.year) || new Date().getFullYear();

        // Build base condition for inspectors
        let whereClause = '';
        let queryParams = [];
        if (user.role === 'inspector') {
            whereClause = 'WHERE inspector_id = $1';
            queryParams = [user.userId];
        }

        // Get overall stats
        const statsQuery = `
            SELECT 
                COUNT(*) as total,
                COUNT(*) FILTER (WHERE status = 'new') as new_count,
                COUNT(*) FILTER (WHERE status = 'inspected') as inspected_count,
                COUNT(*) FILTER (WHERE status = 'pending_consideration') as pending_consideration_count,
                COUNT(*) FILTER (WHERE status = 'approved') as approved_count,
                COUNT(*) FILTER (WHERE status = 'rejected') as rejected_count,
                COUNT(*) FILTER (WHERE status = 'closed') as closed_count,
                COUNT(*) FILTER (WHERE is_read = false) as unread_count,
                COUNT(*) FILTER (WHERE DATE(created_at) = CURRENT_DATE) as today_count,
                COALESCE(SUM(approved_amount) FILTER (WHERE status = 'approved'), 0) as total_approved_amount
            FROM cases ${whereClause}
        `;

        const statsResult = await db.query(statsQuery, queryParams);
        const stats = statsResult[0];

        // Get monthly data for charts
        const monthlyQuery = `
            SELECT 
                EXTRACT(MONTH FROM created_at) as month,
                COUNT(*) as count
            FROM cases
            ${whereClause}
            ${whereClause ? 'AND' : 'WHERE'} EXTRACT(YEAR FROM created_at) = $${queryParams.length + 1}
            GROUP BY EXTRACT(MONTH FROM created_at)
            ORDER BY month
        `;

        const monthlyResult = await db.query(monthlyQuery, [...queryParams, year]);

        // Fill in missing months with 0
        const monthlyData = Array(12).fill(0);
        monthlyResult.forEach(row => {
            monthlyData[parseInt(row.month) - 1] = parseInt(row.count);
        });

        // Get weekly data (current week)
        const weeklyQuery = `
            SELECT 
                EXTRACT(ISODOW FROM created_at) as day_of_week,
                COUNT(*) as count
            FROM cases
            ${whereClause}
            ${whereClause ? 'AND' : 'WHERE'} created_at >= DATE_TRUNC('week', CURRENT_DATE)
            GROUP BY EXTRACT(ISODOW FROM created_at)
            ORDER BY day_of_week
        `;

        const weeklyResult = await db.query(weeklyQuery, queryParams);

        // Fill in missing days with 0 (Mon=1 to Sun=7)
        const weeklyData = Array(7).fill(0);
        weeklyResult.forEach(row => {
            weeklyData[parseInt(row.day_of_week) - 1] = parseInt(row.count);
        });

        return response.success({
            stats: {
                total: parseInt(stats.total),
                new: parseInt(stats.new_count),
                inspected: parseInt(stats.inspected_count),
                pendingConsideration: parseInt(stats.pending_consideration_count),
                approved: parseInt(stats.approved_count),
                rejected: parseInt(stats.rejected_count),
                closed: parseInt(stats.closed_count),
                unread: parseInt(stats.unread_count),
                todayNew: parseInt(stats.today_count),
                totalApprovedAmount: parseFloat(stats.total_approved_amount)
            },
            charts: {
                weekly: {
                    labels: ['จันทร์', 'อังคาร', 'พุธ', 'พฤหัสบดี', 'ศุกร์', 'เสาร์', 'อาทิตย์'],
                    data: weeklyData
                },
                monthly: {
                    labels: ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'],
                    data: monthlyData
                }
            },
            year
        });

    } catch (error) {
        console.error('Get stats error:', error);
        return response.serverError('เกิดข้อผิดพลาดในการดึงสถิติ', error);
    }
};
