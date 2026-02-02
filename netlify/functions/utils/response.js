/**
 * ══════════════════════════════════════════════════════════════════════════
 * AVA System - HTTP Response Utilities
 * Standardized response helpers for Netlify Functions
 * ══════════════════════════════════════════════════════════════════════════
 */

const CORS_HEADERS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Content-Type': 'application/json; charset=utf-8'
};

/**
 * Success response (200)
 * @param {Object} data - Response data
 * @param {string} message - Optional success message
 * @returns {Object} Netlify response object
 */
function success(data, message = null) {
    return {
        statusCode: 200,
        headers: CORS_HEADERS,
        body: JSON.stringify({
            success: true,
            message,
            data
        })
    };
}

/**
 * Created response (201)
 * @param {Object} data - Created resource data
 * @param {string} message - Optional success message
 * @returns {Object} Netlify response object
 */
function created(data, message = 'Resource created successfully') {
    return {
        statusCode: 201,
        headers: CORS_HEADERS,
        body: JSON.stringify({
            success: true,
            message,
            data
        })
    };
}

/**
 * Bad Request response (400)
 * @param {string} message - Error message
 * @param {Object} errors - Optional validation errors
 * @returns {Object} Netlify response object
 */
function badRequest(message = 'Bad request', errors = null) {
    return {
        statusCode: 400,
        headers: CORS_HEADERS,
        body: JSON.stringify({
            success: false,
            error: message,
            errors
        })
    };
}

/**
 * Unauthorized response (401)
 * @param {string} message - Error message
 * @returns {Object} Netlify response object
 */
function unauthorized(message = 'Unauthorized') {
    return {
        statusCode: 401,
        headers: CORS_HEADERS,
        body: JSON.stringify({
            success: false,
            error: message
        })
    };
}

/**
 * Forbidden response (403)
 * @param {string} message - Error message
 * @returns {Object} Netlify response object
 */
function forbidden(message = 'Forbidden') {
    return {
        statusCode: 403,
        headers: CORS_HEADERS,
        body: JSON.stringify({
            success: false,
            error: message
        })
    };
}

/**
 * Not Found response (404)
 * @param {string} message - Error message
 * @returns {Object} Netlify response object
 */
function notFound(message = 'Resource not found') {
    return {
        statusCode: 404,
        headers: CORS_HEADERS,
        body: JSON.stringify({
            success: false,
            error: message
        })
    };
}

/**
 * Method Not Allowed response (405)
 * @param {Array<string>} allowedMethods - List of allowed methods
 * @returns {Object} Netlify response object
 */
function methodNotAllowed(allowedMethods = ['GET', 'POST']) {
    return {
        statusCode: 405,
        headers: {
            ...CORS_HEADERS,
            'Allow': allowedMethods.join(', ')
        },
        body: JSON.stringify({
            success: false,
            error: `Method not allowed. Allowed: ${allowedMethods.join(', ')}`
        })
    };
}

/**
 * Internal Server Error response (500)
 * @param {string} message - Error message
 * @param {Error} error - Optional error object (not exposed to client)
 * @returns {Object} Netlify response object
 */
function serverError(message = 'Internal server error', error = null) {
    if (error) {
        console.error('Server Error:', error);
    }

    return {
        statusCode: 500,
        headers: CORS_HEADERS,
        body: JSON.stringify({
            success: false,
            error: message
        })
    };
}

/**
 * CORS preflight response (OPTIONS)
 * @returns {Object} Netlify response object
 */
function corsResponse() {
    return {
        statusCode: 204,
        headers: CORS_HEADERS,
        body: ''
    };
}

/**
 * Parse JSON body safely
 * @param {string} body - Request body
 * @returns {Object|null} Parsed body or null
 */
function parseBody(body) {
    if (!body) return null;
    try {
        return JSON.parse(body);
    } catch (e) {
        return null;
    }
}

/**
 * Get client IP from event
 * @param {Object} event - Netlify function event
 * @returns {string} Client IP
 */
function getClientIp(event) {
    return event.headers['x-forwarded-for'] ||
        event.headers['x-real-ip'] ||
        event.headers['client-ip'] ||
        'unknown';
}

module.exports = {
    CORS_HEADERS,
    success,
    created,
    badRequest,
    unauthorized,
    forbidden,
    notFound,
    methodNotAllowed,
    serverError,
    corsResponse,
    parseBody,
    getClientIp
};
