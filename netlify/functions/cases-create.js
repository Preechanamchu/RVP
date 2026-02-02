/**
 * ══════════════════════════════════════════════════════════════════════════
 * AVA System - Create Case Function
 * POST /api/cases-create
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

        // Generate case number
        const caseNumberResult = await db.query('SELECT generate_case_number() as case_number');
        const caseNumber = caseNumberResult[0].case_number;

        // Prepare case data
        const caseData = {
            case_number: caseNumber,
            status: 'new',

            // Victim information
            victim_name: body.victimName || null,
            victim_id_card: body.victimIdCard || null,
            victim_phone: body.victimPhone || null,
            victim_address: body.victimAddress || null,
            victim_age: body.victimAge || null,
            victim_gender: body.victimGender || null,

            // Accident information
            accident_date: body.accidentDate || null,
            accident_location: body.accidentLocation || null,
            accident_description: body.accidentDescription || null,
            accident_type: body.accidentType || null,
            vehicle_type: body.vehicleType || null,
            vehicle_plate: body.vehiclePlate || null,

            // Injury information
            injury_description: body.injuryDescription || null,
            injury_severity: body.injurySeverity || null,
            treatment_description: body.treatmentDescription || null,
            claimed_amount: body.claimedAmount || null,

            // Relations
            hospital_id: body.hospitalId || null,
            inspector_id: body.inspectorId || user.userId, // Default to current user if inspector
            created_by_id: user.userId,
            created_by_name: user.fullName,

            // Deadline (default: 7 days from now)
            deadline: body.deadline || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
        };

        // Insert case
        const newCase = await db.insert('cases', caseData);

        // Add to case history
        await db.insert('case_history', {
            case_id: newCase.id,
            action: 'create',
            user_id: user.userId,
            user_name: user.fullName,
            after_data: JSON.stringify({ caseNumber, status: 'new' })
        });

        // Log the action
        await db.insert('audit_logs', {
            user_id: user.userId,
            user_name: user.fullName,
            user_role: user.role,
            action: 'create',
            entity_type: 'case',
            entity_id: newCase.id,
            after_value: JSON.stringify({ caseNumber: newCase.case_number }),
            ip_address: response.getClientIp(event)
        });

        return response.created(
            { case: newCase },
            `สร้างเคส ${caseNumber} สำเร็จ`
        );

    } catch (error) {
        console.error('Create case error:', error);
        return response.serverError('เกิดข้อผิดพลาดในการสร้างเคส', error);
    }
};
