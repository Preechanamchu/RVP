/**
 * ══════════════════════════════════════════════════════════════════════════
 * AVA System - List Drafts Function
 * GET /api/drafts-list
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

        // Get drafts for current user only
        const drafts = await db.query(
            `SELECT * FROM case_drafts 
             WHERE user_id = $1 
             ORDER BY updated_at DESC`,
            [user.userId]
        );

        return response.success({
            drafts,
            total: drafts.length
        });

    } catch (error) {
        console.error('List drafts error:', error);
        return response.serverError('เกิดข้อผิดพลาดในการดึงบันทึกฉบับร่าง', error);
    }
};
