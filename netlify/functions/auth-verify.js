/**
 * ══════════════════════════════════════════════════════════════════════════
 * AVA System - Token Verification Function
 * GET /api/auth-verify
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

        // Get fresh user data from database
        const freshUser = await db.getById('users', user.userId);

        if (!freshUser) {
            return response.unauthorized('User not found');
        }

        if (!freshUser.is_active) {
            return response.unauthorized('บัญชีผู้ใช้ถูกระงับการใช้งาน');
        }

        // Return user info (without password)
        const { password_hash, ...userWithoutPassword } = freshUser;

        return response.success({
            user: userWithoutPassword,
            tokenInfo: {
                userId: user.userId,
                role: user.role,
                exp: user.exp
            }
        }, 'Token is valid');

    } catch (error) {
        console.error('Token verification error:', error);
        return response.serverError('เกิดข้อผิดพลาดในการตรวจสอบ token', error);
    }
};
