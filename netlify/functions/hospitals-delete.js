/**
 * ══════════════════════════════════════════════════════════════════════════
 * AVA System - Delete Hospital Function
 * DELETE /api/hospitals-delete?id=<uuid>
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
        // Verify authentication - only super_admin can delete hospitals
        const { user, errorResponse } = auth.requireAuth(event, ['super_admin']);
        if (errorResponse) {
            return errorResponse;
        }

        // Get hospital ID from query string or body
        let id = event.queryStringParameters?.id;
        if (!id && event.body) {
            const body = response.parseBody(event.body);
            id = body?.id;
        }

        if (!id) {
            return response.badRequest('Hospital ID is required');
        }

        // Get existing hospital for audit
        const existingHospital = await db.getById('hospitals', id);
        if (!existingHospital) {
            return response.notFound('ไม่พบโรงพยาบาล');
        }

        // Check if hospital is in use
        const casesWithHospital = await db.query(
            'SELECT COUNT(*) as count FROM cases WHERE hospital_id = $1',
            [id]
        );

        if (parseInt(casesWithHospital[0].count) > 0) {
            return response.badRequest('ไม่สามารถลบโรงพยาบาลที่มีเคสเชื่อมโยงอยู่');
        }

        // Delete hospital
        await db.deleteById('hospitals', id);

        // Log the action
        await db.insert('audit_logs', {
            user_id: user.userId,
            user_name: user.fullName,
            user_role: user.role,
            action: 'delete',
            entity_type: 'hospital',
            entity_id: id,
            before_value: JSON.stringify({ code: existingHospital.code, name: existingHospital.name }),
            ip_address: response.getClientIp(event)
        });

        return response.success(
            { deletedId: id },
            'ลบโรงพยาบาลสำเร็จ'
        );

    } catch (error) {
        console.error('Delete hospital error:', error);
        return response.serverError('เกิดข้อผิดพลาดในการลบโรงพยาบาล', error);
    }
};
