/**
 * ══════════════════════════════════════════════════════════════════════════
 * AVA System - List Users Function
 * GET /api/users-list
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
        // Verify authentication - only super_admin can list all users
        const { user, errorResponse } = auth.requireAuth(event, ['super_admin']);
        if (errorResponse) {
            return errorResponse;
        }

        // Get query parameters for filtering
        const params = event.queryStringParameters || {};
        const { role, isActive, search } = params;

        // Build query
        let queryString = 'SELECT id, username, role, full_name, email, phone, avatar_url, is_active, last_login, created_at FROM users WHERE 1=1';
        const queryParams = [];
        let paramIndex = 1;

        if (role) {
            queryString += ` AND role = $${paramIndex}`;
            queryParams.push(role);
            paramIndex++;
        }

        if (isActive !== undefined) {
            queryString += ` AND is_active = $${paramIndex}`;
            queryParams.push(isActive === 'true');
            paramIndex++;
        }

        if (search) {
            queryString += ` AND (full_name ILIKE $${paramIndex} OR username ILIKE $${paramIndex} OR email ILIKE $${paramIndex})`;
            queryParams.push(`%${search}%`);
            paramIndex++;
        }

        queryString += ' ORDER BY created_at DESC';

        const users = await db.query(queryString, queryParams);

        return response.success({
            users,
            total: users.length
        });

    } catch (error) {
        console.error('List users error:', error);
        return response.serverError('เกิดข้อผิดพลาดในการดึงข้อมูลผู้ใช้', error);
    }
};
