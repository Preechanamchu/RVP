/**
 * ══════════════════════════════════════════════════════════════════════════
 * AVA System - Save Draft Function
 * POST /api/drafts-save
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
        // Verify authentication
        const { user, errorResponse } = auth.requireAuth(event);
        if (errorResponse) {
            return errorResponse;
        }

        // Parse body
        const body = response.parseBody(event.body);
        if (!body) {
            return response.badRequest('Invalid request body');
        }

        const { id, draftData, title } = body;

        if (!draftData) {
            return response.badRequest('Draft data is required');
        }

        let result;

        if (id) {
            // Check if draft exists and belongs to user
            const existing = await db.getById('case_drafts', id);

            if (!existing) {
                return response.notFound('ไม่พบบันทึกฉบับร่าง');
            }

            if (existing.user_id !== user.userId) {
                return response.forbidden('คุณไม่มีสิทธิ์แก้ไขบันทึกนี้');
            }

            // Update existing draft
            result = await db.update('case_drafts', id, {
                draft_data: JSON.stringify(draftData),
                title: title || existing.title
            });
        } else {
            // Create new draft
            result = await db.insert('case_drafts', {
                user_id: user.userId,
                draft_data: JSON.stringify(draftData),
                title: title || 'บันทึกฉบับร่าง'
            });
        }

        return response.success(
            { draft: result },
            id ? 'อัปเดตบันทึกฉบับร่างสำเร็จ' : 'บันทึกฉบับร่างสำเร็จ'
        );

    } catch (error) {
        console.error('Save draft error:', error);
        return response.serverError('เกิดข้อผิดพลาดในการบันทึกฉบับร่าง', error);
    }
};
