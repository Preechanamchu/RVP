/**
 * ══════════════════════════════════════════════════════════════════════════
 * AVA System - List Cases Function
 * GET /api/cases-list
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
        const { status, inspectorId, hospitalId, search, limit = 50, offset = 0 } = params;

        // Build query based on user role
        let queryString = `
            SELECT 
                c.*,
                h.name as hospital_name,
                h.code as hospital_code,
                u.full_name as inspector_name,
                creator.full_name as creator_name,
                creator.phone as creator_phone
            FROM cases c
            LEFT JOIN hospitals h ON c.hospital_id = h.id
            LEFT JOIN users u ON c.inspector_id = u.id
            LEFT JOIN users creator ON c.created_by_id = creator.id
            WHERE 1=1
        `;
        const queryParams = [];
        let paramIndex = 1;

        // Inspectors can only see their own cases
        if (user.role === 'inspector') {
            queryString += ` AND c.inspector_id = $${paramIndex}`;
            queryParams.push(user.userId);
            paramIndex++;
        }

        // Filter by status
        if (status) {
            queryString += ` AND c.status = $${paramIndex}`;
            queryParams.push(status);
            paramIndex++;
        }

        // Filter by inspector
        if (inspectorId && user.role !== 'inspector') {
            queryString += ` AND c.inspector_id = $${paramIndex}`;
            queryParams.push(inspectorId);
            paramIndex++;
        }

        // Filter by hospital
        if (hospitalId) {
            queryString += ` AND c.hospital_id = $${paramIndex}`;
            queryParams.push(hospitalId);
            paramIndex++;
        }

        // Search by case number or victim name
        if (search) {
            queryString += ` AND (c.case_number ILIKE $${paramIndex} OR c.victim_name ILIKE $${paramIndex})`;
            queryParams.push(`%${search}%`);
            paramIndex++;
        }

        // Order and pagination
        queryString += ` ORDER BY c.created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
        queryParams.push(parseInt(limit), parseInt(offset));

        const cases = await db.query(queryString, queryParams);

        // Get total count
        let countQuery = 'SELECT COUNT(*) as total FROM cases c WHERE 1=1';
        const countParams = [];
        let countIndex = 1;

        if (user.role === 'inspector') {
            countQuery += ` AND c.inspector_id = $${countIndex}`;
            countParams.push(user.userId);
            countIndex++;
        }

        if (status) {
            countQuery += ` AND c.status = $${countIndex}`;
            countParams.push(status);
        }

        const countResult = await db.query(countQuery, countParams);
        const total = parseInt(countResult[0].total);

        return response.success({
            cases,
            pagination: {
                total,
                limit: parseInt(limit),
                offset: parseInt(offset),
                hasMore: parseInt(offset) + cases.length < total
            }
        });

    } catch (error) {
        console.error('List cases error:', error);
        return response.serverError('เกิดข้อผิดพลาดในการดึงข้อมูลเคส', error);
    }
};
