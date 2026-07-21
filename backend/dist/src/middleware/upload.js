"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.sportsUpload = exports.clubsUpload = exports.studentDocumentUpload = exports.staffDocumentUpload = exports.brandingUpload = exports.reportUpload = exports.receiptUpload = exports.assetUpload = exports.libraryUpload = exports.signatureUpload = exports.submissionUpload = exports.assignmentUpload = exports.upload = void 0;
const multer_1 = __importDefault(require("multer"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
// Helper to ensure directory exists
const ensureDir = (dir) => {
    const fullPath = path_1.default.join(__dirname, '../../', dir);
    if (!fs_1.default.existsSync(fullPath)) {
        fs_1.default.mkdirSync(fullPath, { recursive: true });
    }
    return fullPath;
};
// Base config for allowed types
const fileFilter = (req, file, cb) => {
    const allowedTypes = [
        'image/jpeg', 'image/png', 'image/webp',
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        'text/plain'
    ];
    if (allowedTypes.includes(file.mimetype)) {
        cb(null, true);
    }
    else {
        cb(new Error('Invalid file type. Only Images and Documents (PDF, DOC, DOCX, XLS, PPT, TXT) are allowed.'));
    }
};
const createStorage = (entityType, category) => {
    return multer_1.default.diskStorage({
        destination: (req, file, cb) => {
            const schoolCode = req.user?.schoolCode || 'global';
            const humanId = req.user?.staffId || req.user?.studentId || req.user?.id || 'unassigned';
            // Map entityType based on role if generic 'upload' is used
            let folderType = entityType;
            if (entityType === 'general' && req.user) {
                if (req.user.role === 'STUDENT' || req.user.role === 'APPLICANT')
                    folderType = 'students';
                else if (['TEACHER', 'SCHOOL_ADMIN', 'BURSAR'].includes(req.user.role))
                    folderType = 'staff';
            }
            // Institutional Global Silos (Library, Assets, Finance, Academics)
            const globalEntities = ['library', 'assets', 'finance', 'academic'];
            if (globalEntities.includes(entityType)) {
                const relativeDir = path_1.default.join(schoolCode, 'global', entityType, category).replace(/\\/g, '/');
                const fullPath = path_1.default.join(__dirname, '../../storage', relativeDir);
                if (!fs_1.default.existsSync(fullPath))
                    fs_1.default.mkdirSync(fullPath, { recursive: true });
                req.uploadCategoryPath = relativeDir;
                cb(null, fullPath);
                return;
            }
            // Entity-Specific Silos (Staff, Students)
            const relativeDir = path_1.default.join(schoolCode, folderType, humanId, category).replace(/\\/g, '/');
            // SECURITY GAUNTLET: Prevent path traversal and ensure multi-tenant isolation
            if (relativeDir.includes('..') || !relativeDir.startsWith(schoolCode)) {
                return cb(new Error('Security Violation: Unauthorized path traversal attempt detected.'), '');
            }
            const fullPath = path_1.default.join(__dirname, '../../storage', relativeDir);
            if (!fs_1.default.existsSync(fullPath)) {
                fs_1.default.mkdirSync(fullPath, { recursive: true });
            }
            req.uploadCategoryPath = relativeDir;
            cb(null, fullPath);
        },
        filename: (req, file, cb) => {
            const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
            // Ignore original extension entirely to prevent XSS/spoofing (e.g. malicious.html sent as image/png)
            // Map common mimetypes to safe extensions
            const mimeToExt = {
                'image/jpeg': '.jpg',
                'image/png': '.png',
                'image/webp': '.webp',
                'application/pdf': '.pdf',
                'application/msword': '.doc',
                'application/vnd.openxmlformats-officedocument.wordprocessingml.document': '.docx',
                'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': '.xlsx',
                'application/vnd.openxmlformats-officedocument.presentationml.presentation': '.pptx',
                'text/plain': '.txt'
            };
            const safeExt = mimeToExt[file.mimetype] || '.bin';
            cb(null, `${file.fieldname}-${uniqueSuffix}${safeExt}`);
        }
    });
};
// Main Export for general use (e.g. avatars)
exports.upload = (0, multer_1.default)({
    storage: createStorage('general', 'avatars'),
    limits: { fileSize: 20 * 1024 * 1024 },
    fileFilter
});
// Teacher Assignments (stored under Teacher's staff folder)
exports.assignmentUpload = (0, multer_1.default)({
    storage: createStorage('staff', 'assignments'),
    limits: { fileSize: 50 * 1024 * 1024 },
    fileFilter
});
// Student Submissions (stored under Student's student folder)
exports.submissionUpload = (0, multer_1.default)({
    storage: createStorage('students', 'submissions'),
    limits: { fileSize: 30 * 1024 * 1024 },
    fileFilter
});
// Signature Uploads (stored under Staff folder)
exports.signatureUpload = (0, multer_1.default)({
    storage: createStorage('staff', 'signatures'),
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter
});
// Library Book Uploads (Global for the school)
exports.libraryUpload = (0, multer_1.default)({
    storage: createStorage('library', 'catalog'),
    limits: { fileSize: 100 * 1024 * 1024 }, // Larger for PDFs
    fileFilter
});
// Asset Uploads (Global for the school)
exports.assetUpload = (0, multer_1.default)({
    storage: createStorage('assets', 'inventory'),
    limits: { fileSize: 10 * 1024 * 1024 },
    fileFilter
});
// Financial Receipts (Global Institutional Silo)
exports.receiptUpload = (0, multer_1.default)({
    storage: createStorage('finance', 'receipts'),
    limits: { fileSize: 10 * 1024 * 1024 },
    fileFilter
});
// Academic Reports (Global Institutional Silo)
exports.reportUpload = (0, multer_1.default)({
    storage: createStorage('academic', 'reports'),
    limits: { fileSize: 20 * 1024 * 1024 },
    fileFilter
});
// Branding & ID Card Templates (Global Institutional Silo)
exports.brandingUpload = (0, multer_1.default)({
    storage: createStorage('academic', 'branding'),
    limits: { fileSize: 10 * 1024 * 1024 },
    fileFilter
});
// HR / Staff Documents
exports.staffDocumentUpload = (0, multer_1.default)({
    storage: createStorage('staff', 'documents'),
    limits: { fileSize: 50 * 1024 * 1024 },
    fileFilter
});
// Student Identity / Transfer Documents
exports.studentDocumentUpload = (0, multer_1.default)({
    storage: createStorage('students', 'documents'),
    limits: { fileSize: 50 * 1024 * 1024 },
    fileFilter
});
// Student Clubs Upload
exports.clubsUpload = (0, multer_1.default)({
    storage: createStorage('academic', 'clubs'),
    limits: { fileSize: 10 * 1024 * 1024 },
    fileFilter
});
// School Sports Upload
exports.sportsUpload = (0, multer_1.default)({
    storage: createStorage('academic', 'sports'),
    limits: { fileSize: 10 * 1024 * 1024 },
    fileFilter
});
//# sourceMappingURL=upload.js.map