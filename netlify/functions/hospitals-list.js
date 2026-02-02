/**
 * ══════════════════════════════════════════════════════════════════════════
 * AVA System - List Hospitals Function
 * GET /api/hospitals-list
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

        // Get query parameters
        const params = event.queryStringParameters || {};
        const { provinceCode, isActive, search } = params;

        // Build query
        let queryString = 'SELECT * FROM hospitals WHERE 1=1';
        const queryParams = [];
        let paramIndex = 1;

        if (provinceCode) {
            queryString += ` AND province_code = $${paramIndex}`;
            queryParams.push(provinceCode);
            paramIndex++;
        }

        if (isActive !== undefined) {
            queryString += ` AND is_active = $${paramIndex}`;
            queryParams.push(isActive === 'true');
            paramIndex++;
        }

        if (search) {
            queryString += ` AND (name ILIKE $${paramIndex} OR code ILIKE $${paramIndex})`;
            queryParams.push(`%${search}%`);
            paramIndex++;
        }

        queryString += ' ORDER BY name ASC';

        const hospitals = await db.query(queryString, queryParams);

        return response.success({
            hospitals,
            total: hospitals.length
        });

    } catch (error) {
        console.error('List hospitals error:', error);
        return response.serverError('เกิดข้อผิดพลาดในการดึงข้อมูลโรงพยาบาล', error);
    }
};
