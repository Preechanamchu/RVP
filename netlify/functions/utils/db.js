/**
 * ══════════════════════════════════════════════════════════════════════════
 * AVA System - Database Connection Module
 * Uses Neon Serverless Driver for PostgreSQL
 * ══════════════════════════════════════════════════════════════════════════
 */

const { neon } = require('@neondatabase/serverless');

// Create database connection
const sql = neon(process.env.DATABASE_URL);

/**
 * Execute a SQL query
 * @param {string} query - SQL query string
 * @param {Array} params - Query parameters
 * @returns {Promise<Array>} Query results
 */
async function query(queryString, params = []) {
    try {
        const result = await sql(queryString, params);
        return result;
    } catch (error) {
        console.error('Database query error:', error);
        throw error;
    }
}

/**
 * Get a single row by ID
 * @param {string} table - Table name
 * @param {string} id - Row ID (UUID)
 * @returns {Promise<Object|null>}
 */
async function getById(table, id) {
    const result = await query(
        `SELECT * FROM ${table} WHERE id = $1`,
        [id]
    );
    return result[0] || null;
}

/**
 * Get all rows from a table
 * @param {string} table - Table name
 * @param {Object} options - Query options
 * @returns {Promise<Array>}
 */
async function getAll(table, options = {}) {
    const { orderBy = 'created_at', order = 'DESC', limit, offset } = options;
    let queryString = `SELECT * FROM ${table} ORDER BY ${orderBy} ${order}`;
    
    if (limit) {
        queryString += ` LIMIT ${limit}`;
    }
    if (offset) {
        queryString += ` OFFSET ${offset}`;
    }
    
    return await query(queryString);
}

/**
 * Insert a new row
 * @param {string} table - Table name
 * @param {Object} data - Data to insert
 * @returns {Promise<Object>} Inserted row
 */
async function insert(table, data) {
    const keys = Object.keys(data);
    const values = Object.values(data);
    const placeholders = keys.map((_, i) => `$${i + 1}`).join(', ');
    const columns = keys.join(', ');
    
    const result = await query(
        `INSERT INTO ${table} (${columns}) VALUES (${placeholders}) RETURNING *`,
        values
    );
    return result[0];
}

/**
 * Update a row by ID
 * @param {string} table - Table name
 * @param {string} id - Row ID
 * @param {Object} data - Data to update
 * @returns {Promise<Object>} Updated row
 */
async function update(table, id, data) {
    const keys = Object.keys(data);
    const values = Object.values(data);
    const setClause = keys.map((key, i) => `${key} = $${i + 1}`).join(', ');
    
    const result = await query(
        `UPDATE ${table} SET ${setClause} WHERE id = $${keys.length + 1} RETURNING *`,
        [...values, id]
    );
    return result[0];
}

/**
 * Delete a row by ID
 * @param {string} table - Table name
 * @param {string} id - Row ID
 * @returns {Promise<boolean>}
 */
async function deleteById(table, id) {
    const result = await query(
        `DELETE FROM ${table} WHERE id = $1 RETURNING id`,
        [id]
    );
    return result.length > 0;
}

/**
 * Count rows in a table
 * @param {string} table - Table name
 * @param {Object} where - Where conditions
 * @returns {Promise<number>}
 */
async function count(table, where = {}) {
    const keys = Object.keys(where);
    let queryString = `SELECT COUNT(*) as count FROM ${table}`;
    
    if (keys.length > 0) {
        const conditions = keys.map((key, i) => `${key} = $${i + 1}`).join(' AND ');
        queryString += ` WHERE ${conditions}`;
    }
    
    const result = await query(queryString, Object.values(where));
    return parseInt(result[0].count);
}

module.exports = {
    sql,
    query,
    getById,
    getAll,
    insert,
    update,
    deleteById,
    count
};
