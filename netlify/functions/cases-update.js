/**
 * ══════════════════════════════════════════════════════════════════════════
 * AVA System - Update Case Function
 * PUT /api/cases-update
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
        // Verify authentication
        const { user, errorResponse } = auth.requireAuth(event);
        if (errorResponse) {
            return errorResponse;
        }

        // Parse body
        const body = response.parseBody(event.body);
        if (!body || !body.id) {
            return response.badRequest('Case ID is required');
        }

        const { id } = body;

        // Get existing case
        const existingCase = await db.getById('cases', id);
        if (!existingCase) {
            return response.notFound('ไม่พบเคส');
        }

        // Check permissions
        if (user.role === 'inspector' && existingCase.inspector_id !== user.userId) {
            return response.forbidden('คุณไม่มีสิทธิ์แก้ไขเคสนี้');
        }

        // Build update data
        const updateData = {};
        const allowedFields = [
            'victimName', 'victimIdCard', 'victimPhone', 'victimAddress', 'victimAge', 'victimGender',
            'accidentDate', 'accidentLocation', 'accidentDescription', 'accidentType',
            'vehicleType', 'vehiclePlate',
            'injuryDescription', 'injurySeverity', 'treatmentDescription', 'claimedAmount',
            'hospitalId', 'inspectorId', 'inspectorComment', 'adminComment',
            'pdpaConsent', 'signatureData', 'deadline'
        ];

        // Map camelCase to snake_case
        const fieldMapping = {
            victimName: 'victim_name',
            victimIdCard: 'victim_id_card',
            victimPhone: 'victim_phone',
            victimAddress: 'victim_address',
            victimAge: 'victim_age',
            victimGender: 'victim_gender',
            accidentDate: 'accident_date',
            accidentLocation: 'accident_location',
            accidentDescription: 'accident_description',
            accidentType: 'accident_type',
            vehicleType: 'vehicle_type',
            vehiclePlate: 'vehicle_plate',
            injuryDescription: 'injury_description',
            injurySeverity: 'injury_severity',
            treatmentDescription: 'treatment_description',
            claimedAmount: 'claimed_amount',
            hospitalId: 'hospital_id',
            inspectorId: 'inspector_id',
            inspectorComment: 'inspector_comment',
            adminComment: 'admin_comment',
            pdpaConsent: 'pdpa_consent',
            signatureData: 'signature_data',
            deadline: 'deadline'
        };

        for (const field of allowedFields) {
            if (body[field] !== undefined) {
                updateData[fieldMapping[field]] = body[field];
            }
        }

        // Only admin/super_admin can change status and inspector
        if (['super_admin', 'admin'].includes(user.role)) {
            if (body.status) updateData.status = body.status;
        }

        // Update case
        const updatedCase = await db.update('cases', id, updateData);

        // Add to case history
        await db.insert('case_history', {
            case_id: id,
            action: 'update',
            user_id: user.userId,
            user_name: user.fullName,
            before_data: JSON.stringify({ status: existingCase.status }),
            after_data: JSON.stringify(updateData)
        });

        // Log the action
        await db.insert('audit_logs', {
            user_id: user.userId,
            user_name: user.fullName,
            user_role: user.role,
            action: 'update',
            entity_type: 'case',
            entity_id: id,
            before_value: JSON.stringify({ status: existingCase.status }),
            after_value: JSON.stringify({ status: updatedCase.status }),
            ip_address: response.getClientIp(event)
        });

        return response.success(
            { case: updatedCase },
            'อัปเดตเคสสำเร็จ'
        );

    } catch (error) {
        console.error('Update case error:', error);
        return response.serverError('เกิดข้อผิดพลาดในการอัปเดตเคส', error);
    }
};
