/**
 * ══════════════════════════════════════════════════════════════════════════
 * AVA System - Create Hospital Function
 * POST /api/hospitals-create
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
        // Verify authentication - only super_admin can create hospitals
        const { user, errorResponse } = auth.requireAuth(event, ['super_admin']);
        if (errorResponse) {
            return errorResponse;
        }

        // Parse body
        const body = response.parseBody(event.body);
        if (!body) {
            return response.badRequest('Invalid request body');
        }

        const { code, name, province, provinceCode, district, subdistrict, address, phone } = body;

        // Validate required fields
        if (!code || !name) {
            return response.badRequest('Hospital code and name are required');
        }

        // Check if code already exists
        const existing = await db.query(
            'SELECT id FROM hospitals WHERE code = $1',
            [code.toUpperCase()]
        );

        if (existing.length > 0) {
            return response.badRequest('รหัสโรงพยาบาลนี้มีอยู่แล้ว');
        }

        // Create hospital
        const newHospital = await db.insert('hospitals', {
            code: code.toUpperCase(),
            name,
            province: province || null,
            province_code: provinceCode || null,
            district: district || null,
            subdistrict: subdistrict || null,
            address: address || null,
            phone: phone || null,
            is_active: true
        });

        // Log the action
        await db.insert('audit_logs', {
            user_id: user.userId,
            user_name: user.fullName,
            user_role: user.role,
            action: 'create',
            entity_type: 'hospital',
            entity_id: newHospital.id,
            after_value: JSON.stringify({ code: newHospital.code, name: newHospital.name }),
            ip_address: response.getClientIp(event)
        });

        return response.created(
            { hospital: newHospital },
            'สร้างโรงพยาบาลสำเร็จ'
        );

    } catch (error) {
        console.error('Create hospital error:', error);
        return response.serverError('เกิดข้อผิดพลาดในการสร้างโรงพยาบาล', error);
    }
};
