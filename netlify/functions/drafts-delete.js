/**
 * ══════════════════════════════════════════════════════════════════════════
 * AVA System - Delete Draft Function
 * DELETE /api/drafts-delete?id=<uuid>
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

    // Allow DELETE or POST
    if (!['DELETE', 'POST'].includes(event.httpMethod)) {
        return response.methodNotAllowed(['DELETE', 'POST']);
    }

    try {
        // Verify authentication
        const { user, errorResponse } = auth.requireAuth(event);
        if (errorResponse) {
            return errorResponse;
        }

        // Get draft ID from query string or body
        let id = event.queryStringParameters?.id;
        if (!id && event.body) {
            const body = response.parseBody(event.body);
            id = body?.id;
        }

        if (!id) {
            return response.badRequest('Draft ID is required');
        }

        // Check if draft exists and belongs to user
        const existing = await db.getById('case_drafts', id);

        if (!existing) {
            return response.notFound('ไม่พบบันทึกฉบับร่าง');
        }

        if (existing.user_id !== user.userId) {
            return response.forbidden('คุณไม่มีสิทธิ์ลบบันทึกนี้');
        }

        // Delete draft
        await db.deleteById('case_drafts', id);

        return response.success(
            { deletedId: id },
            'ลบบันทึกฉบับร่างสำเร็จ'
        );

    } catch (error) {
        console.error('Delete draft error:', error);
        return response.serverError('เกิดข้อผิดพลาดในการลบบันทึกฉบับร่าง', error);
    }
};
