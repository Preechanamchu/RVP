/**
 * ══════════════════════════════════════════════════════════════════════════
 * AVA System - Get Settings Function
 * GET /api/settings-get?key=<key>
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

        // Get specific key or all settings
        const key = event.queryStringParameters?.key;

        if (key) {
            // Get specific setting
            const settings = await db.query(
                'SELECT * FROM settings WHERE key = $1',
                [key]
            );

            if (settings.length === 0) {
                return response.notFound('ไม่พบการตั้งค่า');
            }

            return response.success({ setting: settings[0] });
        } else {
            // Get all settings (only super_admin)
            if (user.role !== 'super_admin') {
                return response.forbidden('ต้องเป็น Super Admin เท่านั้น');
            }

            const allSettings = await db.query('SELECT * FROM settings ORDER BY key');

            return response.success({ settings: allSettings });
        }

    } catch (error) {
        console.error('Get settings error:', error);
        return response.serverError('เกิดข้อผิดพลาดในการดึงการตั้งค่า', error);
    }
};
