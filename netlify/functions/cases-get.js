/**
 * ══════════════════════════════════════════════════════════════════════════
 * AVA System - Get Case by ID Function
 * GET /api/cases-get?id=<uuid>
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

        // Get case ID from query string
        const id = event.queryStringParameters?.id;
        if (!id) {
            return response.badRequest('Case ID is required');
        }

        // Get case with related data
        const cases = await db.query(`
            SELECT 
                c.*,
                h.name as hospital_name,
                h.code as hospital_code,
                h.address as hospital_address,
                h.phone as hospital_phone,
                u.full_name as inspector_name,
                u.phone as inspector_phone,
                creator.full_name as creator_name,
                creator.phone as creator_phone,
                approver.full_name as approver_name
            FROM cases c
            LEFT JOIN hospitals h ON c.hospital_id = h.id
            LEFT JOIN users u ON c.inspector_id = u.id
            LEFT JOIN users creator ON c.created_by_id = creator.id
            LEFT JOIN users approver ON c.approved_by_id = approver.id
            WHERE c.id = $1
        `, [id]);

        if (cases.length === 0) {
            return response.notFound('ไม่พบเคส');
        }

        const caseData = cases[0];

        // Inspectors can only see their own cases
        if (user.role === 'inspector' && caseData.inspector_id !== user.userId) {
            return response.forbidden('คุณไม่มีสิทธิ์ดูเคสนี้');
        }

        // Get case media
        const media = await db.query(
            'SELECT * FROM case_media WHERE case_id = $1 ORDER BY uploaded_at',
            [id]
        );

        // Get case history
        const history = await db.query(
            'SELECT * FROM case_history WHERE case_id = $1 ORDER BY timestamp DESC',
            [id]
        );

        // Mark as read if not already
        if (!caseData.is_read) {
            await db.query(
                'UPDATE cases SET is_read = true WHERE id = $1',
                [id]
            );
        }

        return response.success({
            case: caseData,
            media,
            history
        });

    } catch (error) {
        console.error('Get case error:', error);
        return response.serverError('เกิดข้อผิดพลาดในการดึงข้อมูลเคส', error);
    }
};
