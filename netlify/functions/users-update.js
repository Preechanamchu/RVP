/**
 * ══════════════════════════════════════════════════════════════════════════
 * AVA System - Update User Function
 * PUT /api/users-update
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

    // Only allow PUT or POST
    if (!['PUT', 'POST'].includes(event.httpMethod)) {
        return response.methodNotAllowed(['PUT', 'POST']);
    }

    try {
        // Verify authentication
        const { user: authUser, errorResponse } = auth.requireAuth(event);
        if (errorResponse) {
            return errorResponse;
        }

        // Parse body
        const body = response.parseBody(event.body);
        if (!body || !body.id) {
            return response.badRequest('User ID is required');
        }

        const { id, fullName, email, phone, role, isActive, password, avatarUrl } = body;

        // Users can only update themselves unless super_admin
        const isSelf = id === authUser.userId;
        if (!isSelf && authUser.role !== 'super_admin') {
            return response.forbidden('คุณไม่มีสิทธิ์แก้ไขข้อมูลผู้ใช้คนอื่น');
        }

        // Get existing user
        const existingUser = await db.getById('users', id);
        if (!existingUser) {
            return response.notFound('ไม่พบผู้ใช้');
        }

        // Build update object
        const updateData = {};

        if (fullName !== undefined) updateData.full_name = fullName;
        if (email !== undefined) updateData.email = email;
        if (phone !== undefined) updateData.phone = phone;
        if (avatarUrl !== undefined) updateData.avatar_url = avatarUrl;

        // Only super_admin can change role and active status
        if (authUser.role === 'super_admin') {
            if (role !== undefined) updateData.role = role;
            if (isActive !== undefined) updateData.is_active = isActive;
        }

        // Handle password change
        if (password) {
            if (password.length < 6) {
                return response.badRequest('Password must be at least 6 characters');
            }
            updateData.password_hash = await auth.hashPassword(password);
        }

        // Update user
        const updatedUser = await db.update('users', id, updateData);

        // Log the action
        await db.insert('audit_logs', {
            user_id: authUser.userId,
            user_name: authUser.fullName,
            user_role: authUser.role,
            action: 'update',
            entity_type: 'user',
            entity_id: id,
            before_value: JSON.stringify({
                fullName: existingUser.full_name,
                role: existingUser.role,
                isActive: existingUser.is_active
            }),
            after_value: JSON.stringify(updateData),
            ip_address: response.getClientIp(event)
        });

        // Return user without password
        const { password_hash, ...userWithoutPassword } = updatedUser;

        return response.success(
            { user: userWithoutPassword },
            'อัปเดตข้อมูลผู้ใช้สำเร็จ'
        );

    } catch (error) {
        console.error('Update user error:', error);
        return response.serverError('เกิดข้อผิดพลาดในการอัปเดตผู้ใช้', error);
    }
};
