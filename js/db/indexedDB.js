/**
 * ══════════════════════════════════════════════════════════════════════════
 * AVA - IndexedDB Database Layer
 * Provides low-level database operations with Promise-based API
 * ══════════════════════════════════════════════════════════════════════════
 */

class AVADatabase {
    constructor() {
        this.db = null;
        this.dbName = CONFIG.DB_NAME;
        this.dbVersion = CONFIG.DB_VERSION;
    }

    /**
     * Initialize the database connection and create stores if needed
     * @returns {Promise<IDBDatabase>}
     */
    async init() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.dbName, this.dbVersion);

            request.onerror = () => reject(request.error);
            request.onsuccess = () => {
                this.db = request.result;
                resolve(this.db);
            };

            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                this.createStores(db);
            };
        });
    }

    /**
     * Create all required object stores and indexes
     * @param {IDBDatabase} db 
     */
    createStores(db) {
        // Users Store
        if (!db.objectStoreNames.contains('users')) {
            const usersStore = db.createObjectStore('users', { keyPath: 'id' });
            usersStore.createIndex('username', 'username', { unique: true });
            usersStore.createIndex('role', 'role', { unique: false });
            usersStore.createIndex('isActive', 'isActive', { unique: false });
        }

        // Cases Store
        if (!db.objectStoreNames.contains('cases')) {
            const casesStore = db.createObjectStore('cases', { keyPath: 'id' });
            casesStore.createIndex('caseNumber', 'caseNumber', { unique: true });
            casesStore.createIndex('status', 'status', { unique: false });
            casesStore.createIndex('inspectorId', 'inspectorId', { unique: false });
            casesStore.createIndex('hospitalId', 'hospitalId', { unique: false });
            casesStore.createIndex('createdAt', 'createdAt', { unique: false });
            casesStore.createIndex('deadline', 'deadline', { unique: false });
            casesStore.createIndex('provinceCode', 'provinceCode', { unique: false });
        }

        // Case Media Store
        if (!db.objectStoreNames.contains('caseMedia')) {
            const mediaStore = db.createObjectStore('caseMedia', { keyPath: 'id' });
            mediaStore.createIndex('caseId', 'caseId', { unique: false });
            mediaStore.createIndex('type', 'type', { unique: false });
        }

        // Case History Store
        if (!db.objectStoreNames.contains('caseHistory')) {
            const historyStore = db.createObjectStore('caseHistory', { keyPath: 'id' });
            historyStore.createIndex('caseId', 'caseId', { unique: false });
            historyStore.createIndex('timestamp', 'timestamp', { unique: false });
        }

        // Hospitals Store
        if (!db.objectStoreNames.contains('hospitals')) {
            const hospitalsStore = db.createObjectStore('hospitals', { keyPath: 'id' });
            hospitalsStore.createIndex('code', 'code', { unique: true });
            hospitalsStore.createIndex('provinceCode', 'provinceCode', { unique: false });
        }

        // Audit Logs Store
        if (!db.objectStoreNames.contains('auditLogs')) {
            const auditStore = db.createObjectStore('auditLogs', { keyPath: 'id' });
            auditStore.createIndex('userId', 'userId', { unique: false });
            auditStore.createIndex('entityType', 'entityType', { unique: false });
            auditStore.createIndex('timestamp', 'timestamp', { unique: false });
            auditStore.createIndex('action', 'action', { unique: false });
        }

        // Settings Store
        if (!db.objectStoreNames.contains('settings')) {
            db.createObjectStore('settings', { keyPath: 'key' });
        }

        // Case Drafts Store (Added in v2)
        if (!db.objectStoreNames.contains('caseDrafts')) {
            const draftsStore = db.createObjectStore('caseDrafts', { keyPath: 'id' });
            draftsStore.createIndex('userId', 'userId', { unique: false });
            draftsStore.createIndex('updatedAt', 'updatedAt', { unique: false });
        }
    }

    /**
     * Get a transaction for the specified stores
     * @param {string|string[]} storeNames 
     * @param {string} mode - 'readonly' or 'readwrite'
     * @returns {IDBTransaction}
     */
    getTransaction(storeNames, mode = 'readonly') {
        return this.db.transaction(storeNames, mode);
    }

    /**
     * Add a single record to a store
     * @param {string} storeName 
     * @param {object} data 
     * @returns {Promise<string>} - The key of the added record
     */
    async add(storeName, data) {
        return new Promise((resolve, reject) => {
            const transaction = this.getTransaction(storeName, 'readwrite');
            const store = transaction.objectStore(storeName);
            const request = store.add(data);
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    /**
     * Update a record in a store (put)
     * @param {string} storeName 
     * @param {object} data 
     * @returns {Promise<string>}
     */
    async put(storeName, data) {
        return new Promise((resolve, reject) => {
            const transaction = this.getTransaction(storeName, 'readwrite');
            const store = transaction.objectStore(storeName);
            const request = store.put(data);
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    /**
     * Get a single record by key
     * @param {string} storeName 
     * @param {string} key 
     * @returns {Promise<object|undefined>}
     */
    async get(storeName, key) {
        return new Promise((resolve, reject) => {
            const transaction = this.getTransaction(storeName);
            const store = transaction.objectStore(storeName);
            const request = store.get(key);
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    /**
     * Get all records from a store
     * @param {string} storeName 
     * @returns {Promise<object[]>}
     */
    async getAll(storeName) {
        return new Promise((resolve, reject) => {
            const transaction = this.getTransaction(storeName);
            const store = transaction.objectStore(storeName);
            const request = store.getAll();
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    /**
     * Get records by index value
     * @param {string} storeName 
     * @param {string} indexName 
     * @param {any} value 
     * @returns {Promise<object[]>}
     */
    async getByIndex(storeName, indexName, value) {
        return new Promise((resolve, reject) => {
            const transaction = this.getTransaction(storeName);
            const store = transaction.objectStore(storeName);
            const index = store.index(indexName);
            const request = index.getAll(value);
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    /**
     * Get a single record by index
     * @param {string} storeName 
     * @param {string} indexName 
     * @param {any} value 
     * @returns {Promise<object|undefined>}
     */
    async getOneByIndex(storeName, indexName, value) {
        return new Promise((resolve, reject) => {
            const transaction = this.getTransaction(storeName);
            const store = transaction.objectStore(storeName);
            const index = store.index(indexName);
            const request = index.get(value);
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    /**
     * Delete a record by key
     * @param {string} storeName 
     * @param {string} key 
     * @returns {Promise<void>}
     */
    async delete(storeName, key) {
        return new Promise((resolve, reject) => {
            const transaction = this.getTransaction(storeName, 'readwrite');
            const store = transaction.objectStore(storeName);
            const request = store.delete(key);
            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    }

    /**
     * Count records in a store
     * @param {string} storeName 
     * @returns {Promise<number>}
     */
    async count(storeName) {
        return new Promise((resolve, reject) => {
            const transaction = this.getTransaction(storeName);
            const store = transaction.objectStore(storeName);
            const request = store.count();
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    /**
     * Count records by index value
     * @param {string} storeName 
     * @param {string} indexName 
     * @param {any} value 
     * @returns {Promise<number>}
     */
    async countByIndex(storeName, indexName, value) {
        return new Promise((resolve, reject) => {
            const transaction = this.getTransaction(storeName);
            const store = transaction.objectStore(storeName);
            const index = store.index(indexName);
            const request = index.count(value);
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    /**
     * Clear all records from a store
     * @param {string} storeName 
     * @returns {Promise<void>}
     */
    async clear(storeName) {
        return new Promise((resolve, reject) => {
            const transaction = this.getTransaction(storeName, 'readwrite');
            const store = transaction.objectStore(storeName);
            const request = store.clear();
            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    }
}

// Create global database instance
const db = new AVADatabase();
