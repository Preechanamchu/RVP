/**
 * ══════════════════════════════════════════════════════════════════════════
 * AVA System - Reject Case Function
 * POST /api/cases-reject
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
        // Verify authentication - only admin/super_admin can reject
        const { user, errorResponse } = auth.requireAuth(event, ['super_admin', 'admin']);
        if (errorResponse) {
            return errorResponse;
        }

        // Parse body
        const body = response.parseBody(event.body);
        if (!body || !body.id) {
            return response.badRequest('Case ID is required');
        }

        const { id, reason } = body;

        if (!reason) {
            return response.badRequest('กรุณาระบุเหตุผลในการไม่อนุมัติ');
        }

        // Get existing case
        const existingCase = await db.getById('cases', id);
        if (!existingCase) {
            return response.notFound('ไม่พบเคส');
        }

        // Check if case can be rejected
        const rejectableStatuses = ['inspected', 'pending_consideration', 'data_verification', 'new'];
        if (!rejectableStatuses.includes(existingCase.status)) {
            return response.badRequest(`ไม่สามารถปฏิเสธเคสที่มีสถานะ "${existingCase.status}" ได้`);
        }

        // Update case
        const updatedCase = await db.update('cases', id, {
            status: 'rejected',
            approval_reason: reason,
            approved_by_id: user.userId,
            approved_at: new Date().toISOString()
        });

        // Add to case history
        await db.insert('case_history', {
            case_id: id,
            action: 'reject',
            user_id: user.userId,
            user_name: user.fullName,
            before_data: JSON.stringify({ status: existingCase.status }),
            after_data: JSON.stringify({ status: 'rejected', reason }),
            comment: reason
        });

        // Log the action
        await db.insert('audit_logs', {
            user_id: user.userId,
            user_name: user.fullName,
            user_role: user.role,
            action: 'reject',
            entity_type: 'case',
            entity_id: id,
            before_value: JSON.stringify({ status: existingCase.status }),
            after_value: JSON.stringify({ status: 'rejected', reason }),
            ip_address: response.getClientIp(event)
        });

        return response.success(
            { case: updatedCase },
            `ไม่อนุมัติเคส ${existingCase.case_number}`
        );

    } catch (error) {
        console.error('Reject case error:', error);
        return response.serverError('เกิดข้อผิดพลาดในการปฏิเสธเคส', error);
    }
};
