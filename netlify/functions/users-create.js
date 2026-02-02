/**
 * ══════════════════════════════════════════════════════════════════════════
 * AVA System - Create User Function
 * POST /api/users-create
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

    // Only allow POST
    if (event.httpMethod !== 'POST') {
        return response.methodNotAllowed(['POST']);
    }

    try {
        // Verify authentication - only super_admin can create users
        const { user: authUser, errorResponse } = auth.requireAuth(event, ['super_admin']);
        if (errorResponse) {
            return errorResponse;
        }

        // Parse body
        const body = response.parseBody(event.body);
        if (!body) {
            return response.badRequest('Invalid request body');
        }

        const { username, password, role, fullName, email, phone } = body;

        // Validate required fields
        if (!username || !password || !role || !fullName) {
            return response.badRequest('Username, password, role, and fullName are required');
        }

        // Validate role
        const validRoles = ['super_admin', 'admin', 'inspector'];
        if (!validRoles.includes(role)) {
            return response.badRequest('Invalid role. Must be one of: ' + validRoles.join(', '));
        }

        // Validate password length
        if (password.length < 6) {
            return response.badRequest('Password must be at least 6 characters');
        }

        // Check if username already exists
        const existingUsers = await db.query(
            'SELECT id FROM users WHERE username = $1',
            [username.toLowerCase().trim()]
        );

        if (existingUsers.length > 0) {
            return response.badRequest('ชื่อผู้ใช้นี้มีอยู่แล้ว');
        }

        // Hash password
        const passwordHash = await auth.hashPassword(password);

        // Create user
        const newUser = await db.insert('users', {
            username: username.toLowerCase().trim(),
            password_hash: passwordHash,
            role,
            full_name: fullName,
            email: email || null,
            phone: phone || null,
            is_active: true
        });

        // Log the action
        await db.insert('audit_logs', {
            user_id: authUser.userId,
            user_name: authUser.fullName,
            user_role: authUser.role,
            action: 'create',
            entity_type: 'user',
            entity_id: newUser.id,
            after_value: JSON.stringify({ username: newUser.username, role: newUser.role, fullName: newUser.full_name }),
            ip_address: response.getClientIp(event)
        });

        // Return user without password
        const { password_hash, ...userWithoutPassword } = newUser;

        return response.created(
            { user: userWithoutPassword },
            'สร้างผู้ใช้สำเร็จ'
        );

    } catch (error) {
        console.error('Create user error:', error);
        return response.serverError('เกิดข้อผิดพลาดในการสร้างผู้ใช้', error);
    }
};
