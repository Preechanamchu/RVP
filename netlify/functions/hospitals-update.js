/**
 * ══════════════════════════════════════════════════════════════════════════
 * AVA System - Update Hospital Function
 * PUT /api/hospitals-update
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
        // Verify authentication - only super_admin can update hospitals
        const { user, errorResponse } = auth.requireAuth(event, ['super_admin']);
        if (errorResponse) {
            return errorResponse;
        }

        // Parse body
        const body = response.parseBody(event.body);
        if (!body || !body.id) {
            return response.badRequest('Hospital ID is required');
        }

        const { id, code, name, province, provinceCode, district, subdistrict, address, phone, isActive } = body;

        // Get existing hospital
        const existingHospital = await db.getById('hospitals', id);
        if (!existingHospital) {
            return response.notFound('ไม่พบโรงพยาบาล');
        }

        // Build update data
        const updateData = {};
        if (code !== undefined) updateData.code = code.toUpperCase();
        if (name !== undefined) updateData.name = name;
        if (province !== undefined) updateData.province = province;
        if (provinceCode !== undefined) updateData.province_code = provinceCode;
        if (district !== undefined) updateData.district = district;
        if (subdistrict !== undefined) updateData.subdistrict = subdistrict;
        if (address !== undefined) updateData.address = address;
        if (phone !== undefined) updateData.phone = phone;
        if (isActive !== undefined) updateData.is_active = isActive;

        // Update hospital
        const updatedHospital = await db.update('hospitals', id, updateData);

        // Log the action
        await db.insert('audit_logs', {
            user_id: user.userId,
            user_name: user.fullName,
            user_role: user.role,
            action: 'update',
            entity_type: 'hospital',
            entity_id: id,
            before_value: JSON.stringify({ name: existingHospital.name, isActive: existingHospital.is_active }),
            after_value: JSON.stringify(updateData),
            ip_address: response.getClientIp(event)
        });

        return response.success(
            { hospital: updatedHospital },
            'อัปเดตโรงพยาบาลสำเร็จ'
        );

    } catch (error) {
        console.error('Update hospital error:', error);
        return response.serverError('เกิดข้อผิดพลาดในการอัปเดตโรงพยาบาล', error);
    }
};
