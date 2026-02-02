/**
 * ══════════════════════════════════════════════════════════════════════════
 * AVA System - Delete User Function
 * DELETE /api/users-delete?id=<uuid>
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

    // Allow DELETE or POST (for compatibility)
    if (!['DELETE', 'POST'].includes(event.httpMethod)) {
        return response.methodNotAllowed(['DELETE', 'POST']);
    }

    try {
        // Verify authentication - only super_admin can delete users
        const { user: authUser, errorResponse } = auth.requireAuth(event, ['super_admin']);
        if (errorResponse) {
            return errorResponse;
        }

        // Get user ID from query string or body
        let id = event.queryStringParameters?.id;
        if (!id && event.body) {
            const body = response.parseBody(event.body);
            id = body?.id;
        }

        if (!id) {
            return response.badRequest('User ID is required');
        }

        // Prevent self-deletion
        if (id === authUser.userId) {
            return response.badRequest('คุณไม่สามารถลบบัญชีของตัวเองได้');
        }

        // Get existing user for audit
        const existingUser = await db.getById('users', id);
        if (!existingUser) {
            return response.notFound('ไม่พบผู้ใช้');
        }

        // Delete user
        await db.deleteById('users', id);

        // Log the action
        await db.insert('audit_logs', {
            user_id: authUser.userId,
            user_name: authUser.fullName,
            user_role: authUser.role,
            action: 'delete',
            entity_type: 'user',
            entity_id: id,
            before_value: JSON.stringify({
                username: existingUser.username,
                fullName: existingUser.full_name,
                role: existingUser.role
            }),
            ip_address: response.getClientIp(event)
        });

        return response.success(
            { deletedId: id },
            'ลบผู้ใช้สำเร็จ'
        );

    } catch (error) {
        console.error('Delete user error:', error);
        return response.serverError('เกิดข้อผิดพลาดในการลบผู้ใช้', error);
    }
};
