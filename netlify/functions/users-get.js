/**
 * ══════════════════════════════════════════════════════════════════════════
 * AVA System - Get User by ID Function
 * GET /api/users-get?id=<uuid>
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
        const { user: authUser, errorResponse } = auth.requireAuth(event);
        if (errorResponse) {
            return errorResponse;
        }

        // Get user ID from query string
        const id = event.queryStringParameters?.id;

        if (!id) {
            return response.badRequest('User ID is required');
        }

        // Users can only get their own profile unless they are super_admin
        if (id !== authUser.userId && authUser.role !== 'super_admin') {
            return response.forbidden('คุณไม่มีสิทธิ์ดูข้อมูลผู้ใช้คนอื่น');
        }

        // Get user (without password)
        const users = await db.query(
            'SELECT id, username, role, full_name, email, phone, avatar_url, is_active, last_login, created_at, updated_at FROM users WHERE id = $1',
            [id]
        );

        if (users.length === 0) {
            return response.notFound('ไม่พบผู้ใช้');
        }

        return response.success({ user: users[0] });

    } catch (error) {
        console.error('Get user error:', error);
        return response.serverError('เกิดข้อผิดพลาดในการดึงข้อมูลผู้ใช้', error);
    }
};
