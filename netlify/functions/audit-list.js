/**
 * ══════════════════════════════════════════════════════════════════════════
 * AVA System - List Audit Logs Function
 * GET /api/audit-list
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
        // Verify authentication - only super_admin can view audit logs
        const { user, errorResponse } = auth.requireAuth(event, ['super_admin']);
        if (errorResponse) {
            return errorResponse;
        }

        // Get query parameters
        const params = event.queryStringParameters || {};
        const {
            userId,
            entityType,
            action,
            entityId,
            fromDate,
            toDate,
            limit = 100,
            offset = 0
        } = params;

        // Build query
        let queryString = `
            SELECT 
                al.*,
                u.username,
                u.full_name as user_full_name
            FROM audit_logs al
            LEFT JOIN users u ON al.user_id = u.id
            WHERE 1=1
        `;
        const queryParams = [];
        let paramIndex = 1;

        if (userId) {
            queryString += ` AND al.user_id = $${paramIndex}`;
            queryParams.push(userId);
            paramIndex++;
        }

        if (entityType) {
            queryString += ` AND al.entity_type = $${paramIndex}`;
            queryParams.push(entityType);
            paramIndex++;
        }

        if (action) {
            queryString += ` AND al.action = $${paramIndex}`;
            queryParams.push(action);
            paramIndex++;
        }

        if (entityId) {
            queryString += ` AND al.entity_id = $${paramIndex}`;
            queryParams.push(entityId);
            paramIndex++;
        }

        if (fromDate) {
            queryString += ` AND al.timestamp >= $${paramIndex}`;
            queryParams.push(fromDate);
            paramIndex++;
        }

        if (toDate) {
            queryString += ` AND al.timestamp <= $${paramIndex}`;
            queryParams.push(toDate);
            paramIndex++;
        }

        queryString += ` ORDER BY al.timestamp DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
        queryParams.push(parseInt(limit), parseInt(offset));

        const logs = await db.query(queryString, queryParams);

        // Get total count
        let countQuery = 'SELECT COUNT(*) as total FROM audit_logs WHERE 1=1';
        // Add same filters for count
        const countResult = await db.query('SELECT COUNT(*) as total FROM audit_logs', []);
        const total = parseInt(countResult[0].total);

        return response.success({
            logs,
            pagination: {
                total,
                limit: parseInt(limit),
                offset: parseInt(offset),
                hasMore: parseInt(offset) + logs.length < total
            }
        });

    } catch (error) {
        console.error('List audit logs error:', error);
        return response.serverError('เกิดข้อผิดพลาดในการดึง Audit Logs', error);
    }
};
