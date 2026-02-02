/**
 * ══════════════════════════════════════════════════════════════════════════
 * AVA System - Authentication Utilities
 * JWT Token handling and password verification
 * ══════════════════════════════════════════════════════════════════════════
 */

const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

const JWT_SECRET = process.env.JWT_SECRET || 'ava-development-secret-key-change-in-production';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '24h';

/**
 * Generate JWT token for user
 * @param {Object} user - User object
 * @returns {string} JWT token
 */
function generateToken(user) {
    const payload = {
        userId: user.id,
        username: user.username,
        role: user.role,
        fullName: user.full_name
    };

    return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

/**
 * Verify JWT token
 * @param {string} token - JWT token
 * @returns {Object|null} Decoded payload or null
 */
function verifyToken(token) {
    try {
        return jwt.verify(token, JWT_SECRET);
    } catch (error) {
        return null;
    }
}

/**
 * Extract token from Authorization header
 * @param {Object} headers - Request headers
 * @returns {string|null} Token or null
 */
function extractToken(headers) {
    const authHeader = headers.authorization || headers.Authorization;
    if (!authHeader) return null;

    if (authHeader.startsWith('Bearer ')) {
        return authHeader.substring(7);
    }

    return authHeader;
}

/**
 * Verify request authentication
 * @param {Object} event - Netlify function event
 * @returns {Object} { isValid, user, error }
 */
function verifyAuth(event) {
    const token = extractToken(event.headers);

    if (!token) {
        return { isValid: false, user: null, error: 'No authorization token provided' };
    }

    const decoded = verifyToken(token);

    if (!decoded) {
        return { isValid: false, user: null, error: 'Invalid or expired token' };
    }

    return { isValid: true, user: decoded, error: null };
}

/**
 * Check if user has required role
 * @param {Object} user - Decoded user from token
 * @param {Array<string>} allowedRoles - Array of allowed roles
 * @returns {boolean}
 */
function hasRole(user, allowedRoles) {
    return allowedRoles.includes(user.role);
}

/**
 * Hash password using bcrypt
 * @param {string} password - Plain text password
 * @returns {Promise<string>} Hashed password
 */
async function hashPassword(password) {
    const salt = await bcrypt.genSalt(10);
    return await bcrypt.hash(password, salt);
}

/**
 * Verify password against hash
 * @param {string} password - Plain text password
 * @param {string} hash - Hashed password
 * @returns {Promise<boolean>}
 */
async function verifyPassword(password, hash) {
    return await bcrypt.compare(password, hash);
}

/**
 * Middleware-style auth check
 * Returns user if authenticated, otherwise returns error response
 * @param {Object} event - Netlify function event
 * @param {Array<string>} requiredRoles - Optional required roles
 * @returns {Object} { user, errorResponse }
 */
function requireAuth(event, requiredRoles = null) {
    const { isValid, user, error } = verifyAuth(event);

    if (!isValid) {
        return {
            user: null,
            errorResponse: {
                statusCode: 401,
                headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                body: JSON.stringify({ success: false, error: error })
            }
        };
    }

    if (requiredRoles && !hasRole(user, requiredRoles)) {
        return {
            user: null,
            errorResponse: {
                statusCode: 403,
                headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                body: JSON.stringify({ success: false, error: 'Insufficient permissions' })
            }
        };
    }

    return { user, errorResponse: null };
}

module.exports = {
    generateToken,
    verifyToken,
    extractToken,
    verifyAuth,
    hasRole,
    hashPassword,
    verifyPassword,
    requireAuth
};
