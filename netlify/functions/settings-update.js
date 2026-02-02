/**
 * ══════════════════════════════════════════════════════════════════════════
 * AVA System - Update Settings Function
 * PUT /api/settings-update
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

    // Allow PUT or POST
    if (!['PUT', 'POST'].includes(event.httpMethod)) {
        return response.methodNotAllowed(['PUT', 'POST']);
    }

    try {
        // Verify authentication - only super_admin can update settings
        const { user, errorResponse } = auth.requireAuth(event, ['super_admin']);
        if (errorResponse) {
            return errorResponse;
        }

        // Parse body
        const body = response.parseBody(event.body);
        if (!body || !body.key) {
            return response.badRequest('Setting key is required');
        }

        const { key, value, description } = body;

        if (value === undefined) {
            return response.badRequest('Setting value is required');
        }

        // Check if setting exists
        const existing = await db.query(
            'SELECT * FROM settings WHERE key = $1',
            [key]
        );

        let result;
        if (existing.length > 0) {
            // Update existing setting
            result = await db.query(
                `UPDATE settings 
                 SET value = $1, description = $2, updated_at = CURRENT_TIMESTAMP, updated_by = $3
                 WHERE key = $4
                 RETURNING *`,
                [JSON.stringify(value), description || existing[0].description, user.userId, key]
            );
        } else {
            // Insert new setting
            result = await db.query(
                `INSERT INTO settings (key, value, description, updated_by)
                 VALUES ($1, $2, $3, $4)
                 RETURNING *`,
                [key, JSON.stringify(value), description || null, user.userId]
            );
        }

        // Log the action
        await db.insert('audit_logs', {
            user_id: user.userId,
            user_name: user.fullName,
            user_role: user.role,
            action: 'update',
            entity_type: 'settings',
            entity_id: key,
            after_value: JSON.stringify({ key, value }),
            ip_address: response.getClientIp(event)
        });

        return response.success(
            { setting: result[0] },
            'บันทึกการตั้งค่าสำเร็จ'
        );

    } catch (error) {
        console.error('Update settings error:', error);
        return response.serverError('เกิดข้อผิดพลาดในการบันทึกการตั้งค่า', error);
    }
};
