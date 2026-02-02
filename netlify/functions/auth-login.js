/**
 * ══════════════════════════════════════════════════════════════════════════
 * AVA System - Login Function
 * POST /api/auth-login
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
        // Parse body
        const body = response.parseBody(event.body);
        if (!body) {
            return response.badRequest('Invalid request body');
        }

        const { username, password } = body;

        // Validate input
        if (!username || !password) {
            return response.badRequest('Username and password are required');
        }

        // Find user by username
        const users = await db.query(
            'SELECT * FROM users WHERE username = $1',
            [username.toLowerCase().trim()]
        );

        const user = users[0];

        if (!user) {
            return response.unauthorized('ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง');
        }

        // Check if user is active
        if (!user.is_active) {
            return response.unauthorized('บัญชีผู้ใช้ถูกระงับการใช้งาน');
        }

        // Verify password
        const isValidPassword = await auth.verifyPassword(password, user.password_hash);
        if (!isValidPassword) {
            return response.unauthorized('ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง');
        }

        // Update last login
        await db.query(
            'UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = $1',
            [user.id]
        );

        // Generate JWT token
        const token = auth.generateToken(user);

        // Log the login action
        await db.insert('audit_logs', {
            user_id: user.id,
            user_name: user.full_name,
            user_role: user.role,
            action: 'login',
            entity_type: 'user',
            entity_id: user.id,
            ip_address: response.getClientIp(event),
            user_agent: event.headers['user-agent'] || 'unknown'
        });

        // Return success with token and user info (without password)
        const { password_hash, ...userWithoutPassword } = user;

        return response.success({
            token,
            user: userWithoutPassword
        }, 'เข้าสู่ระบบสำเร็จ');

    } catch (error) {
        console.error('Login error:', error);
        return response.serverError('เกิดข้อผิดพลาดในการเข้าสู่ระบบ', error);
    }
};
