/**
 * ══════════════════════════════════════════════════════════════════════════
 * AVA - Accident Verification Authority
 * Configuration Constants
 * ══════════════════════════════════════════════════════════════════════════
 */

const CONFIG = {
    // Application Info
    APP_NAME: 'AVA',
    APP_FULL_NAME: 'Accident Verification Authority',
    APP_VERSION: '1.0.0',

    // Database
    DB_NAME: 'ava_database',
    DB_VERSION: 3,

    // Session
    SESSION_KEY: 'ava_session',
    SESSION_TIMEOUT: 30 * 60 * 1000, // 30 minutes in milliseconds

    // Pagination
    DEFAULT_PAGE_SIZE: 20,

    // File Upload
    MAX_PHOTO_COUNT: 100,
    MAX_VIDEO_SIZE: 50 * 1024 * 1024 * 1024, // 50GB
    ALLOWED_IMAGE_TYPES: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
    ALLOWED_VIDEO_TYPES: [
        'video/mp4',           // .mp4
        'video/quicktime',     // .mov
        'video/x-msvideo',     // .avi
        'video/x-ms-wmv',      // .wmv
        'video/x-matroska',    // .mkv
        'video/x-flv',         // .flv
        'video/x-f4v',         // .f4v
        'application/x-shockwave-flash', // .swf
        'video/webm',          // .webm
        'video/mpeg',          // .mpeg
        'video/dvd',           // .vob
        'video/mp2t',          // .m2ts
        'video/3gpp',          // .3gp
        'video/avi'            // .avi (alternate)
    ],
};

// User Roles
const ROLES = {
    SUPER_ADMIN: 'super_admin',
    ADMIN: 'admin',
    INSPECTOR: 'inspector'
};

// Role Display Names (Thai)
const ROLE_NAMES = {
    [ROLES.SUPER_ADMIN]: 'Super Admin',
    [ROLES.ADMIN]: 'Admin พิจารณาเคส',
    [ROLES.INSPECTOR]: 'พนักงานออกตรวจ'
};

// Case Statuses
const CASE_STATUS = {
    NEW: 'new',
    INSPECTED: 'inspected',
    PENDING_REVISION: 'pending_revision',
    PENDING_CONSIDERATION: 'pending_consideration', // รอการพิจารณา
    DATA_VERIFICATION: 'data_verification',         // อยู่ระหว่างตรวจสอบข้อมูล
    WAITING_DOCUMENTS: 'waiting_documents',         // รอเอกสาร/หลักฐานเพิ่มเติม
    APPROVED: 'approved',
    REJECTED: 'rejected',
    CLOSED: 'closed'
};

// Status Display Names (Thai)
const STATUS_NAMES = {
    [CASE_STATUS.NEW]: 'รอตรวจสอบ',
    [CASE_STATUS.INSPECTED]: 'อยู่ระหว่างตรวจสอบ',
    [CASE_STATUS.PENDING_REVISION]: 'รอแก้ไข',
    [CASE_STATUS.PENDING_CONSIDERATION]: 'รอการพิจารณา',
    [CASE_STATUS.DATA_VERIFICATION]: 'อยู่ระหว่างตรวจสอบข้อมูล',
    [CASE_STATUS.WAITING_DOCUMENTS]: 'รอเอกสาร/หลักฐานเพิ่มเติม',
    [CASE_STATUS.APPROVED]: 'อนุมัติ',
    [CASE_STATUS.REJECTED]: 'ไม่อนุมัติ',
    [CASE_STATUS.CLOSED]: 'ตรวจสอบแล้ว'
};

// Status Badge Classes
const STATUS_BADGE_CLASS = {
    [CASE_STATUS.NEW]: 'badge-new',
    [CASE_STATUS.INSPECTED]: 'badge-inspected',
    [CASE_STATUS.PENDING_REVISION]: 'badge-pending',
    [CASE_STATUS.PENDING_CONSIDERATION]: 'badge-primary',
    [CASE_STATUS.DATA_VERIFICATION]: 'badge-info',
    [CASE_STATUS.WAITING_DOCUMENTS]: 'badge-warning',
    [CASE_STATUS.APPROVED]: 'badge-approved',
    [CASE_STATUS.REJECTED]: 'badge-rejected',
    [CASE_STATUS.CLOSED]: 'badge-closed'
};

// Audit Action Types
const AUDIT_ACTIONS = {
    LOGIN: 'login',
    LOGOUT: 'logout',
    CREATE: 'create',
    UPDATE: 'update',
    DELETE: 'delete',
    APPROVE: 'approve',
    REJECT: 'reject',
    RETURN: 'return',
    SUBMIT: 'submit',
    VIEW: 'view'
};

// Entity Types for Audit
const ENTITY_TYPES = {
    USER: 'user',
    CASE: 'case',
    CASE_MEDIA: 'case_media',
    HOSPITAL: 'hospital'
};

// Route Definitions
const ROUTES = {
    LOGIN: 'login',
    DASHBOARD: 'dashboard',
    CASES: 'cases',
    CASE_CREATE: 'case-create',
    CASE_DETAIL: 'case-detail',
    CASE_INSPECT: 'case-inspect',
    CASE_REVIEW: 'case-review',
    USERS: 'users',
    USER_CREATE: 'user-create',
    USER_EDIT: 'user-edit',
    REPORTS_ANALYTICS: 'reports-analytics',
    REPORTS_MONTHLY: 'reports-monthly',
    REPORTS_STAFF_ACTIVITY: 'reports-staff-activity',
    AUDIT_LOGS: 'audit-logs',
    ACCOUNT: 'account',
    SETTINGS: 'settings',
    CASE_DRAFTS: 'case-drafts'
};

// Permission Matrix
const PERMISSIONS = {
    [ROLES.SUPER_ADMIN]: {
        viewDashboard: true,
        viewAllCases: true,
        createCase: true,
        assignInspector: true,
        inspectCase: false,
        approveCase: true,
        viewAuditLogs: true,
        manageUsers: true,
        viewAnalytics: true
    },
    [ROLES.ADMIN]: {
        viewDashboard: true,
        viewAllCases: true,
        createCase: true,
        assignInspector: true,
        inspectCase: false,
        approveCase: true,
        viewAuditLogs: false,
        manageUsers: false,
        viewAnalytics: true
    },
    [ROLES.INSPECTOR]: {
        viewDashboard: true,
        viewAllCases: false,
        createCase: true,
        assignInspector: false,
        inspectCase: true,
        approveCase: false,
        viewAuditLogs: false,
        manageUsers: false,
        viewAnalytics: false
    }
};

// PDPA Consent Text (Thai)
const PDPA_CONSENT_TEXT = `
<h4>หนังสือยินยอมเปิดเผยข้อมูลส่วนบุคคล</h4>

<p>ข้าพเจ้ายินยอมให้ บริษัทกลางคุ้มครองผู้ประสบภัยจากรถ จำกัด เก็บรวบรวม ใช้ และ/หรือ เปิดเผยข้อมูลส่วนบุคคลของข้าพเจ้า ดังต่อไปนี้:</p>

<ul>
    <li>ข้อมูลส่วนบุคคลทั่วไป: ชื่อ-นามสกุล, ที่อยู่, เบอร์โทรศัพท์</li>
    <li>ข้อมูลสุขภาพ: รายละเอียดการบาดเจ็บ, รายงานทางการแพทย์</li>
    <li>ภาพถ่ายและวิดีโอ: ภาพถ่ายบาดแผล, วิดีโอบันทึกปากคำ</li>
</ul>

<p><strong>วัตถุประสงค์:</strong></p>
<ul>
    <li>เพื่อประกอบการพิจารณาอนุมัติค่าสินไหมทดแทน</li>
    <li>เพื่อตรวจสอบความถูกต้องของข้อมูลการเคลม</li>
    <li>เพื่อป้องกันการทุจริตในการเบิกจ่าย</li>
</ul>

<p>ข้าพเจ้าเข้าใจว่าข้อมูลจะถูกเก็บรักษาอย่างปลอดภัย และจะถูกใช้เฉพาะตามวัตถุประสงค์ที่ระบุเท่านั้น</p>
`;

// Export for module use (future)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        CONFIG, ROLES, ROLE_NAMES, CASE_STATUS, STATUS_NAMES,
        STATUS_BADGE_CLASS, AUDIT_ACTIONS, ENTITY_TYPES, ROUTES, PERMISSIONS, PDPA_CONSENT_TEXT
    };
}
