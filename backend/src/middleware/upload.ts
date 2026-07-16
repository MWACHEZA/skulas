import multer from 'multer';
import path from 'path';
import fs from 'fs';

// Helper to ensure directory exists
const ensureDir = (dir: string) => {
    const fullPath = path.join(__dirname, '../../', dir);
    if (!fs.existsSync(fullPath)) {
        fs.mkdirSync(fullPath, { recursive: true });
    }
    return fullPath;
};

// Base config for allowed types
const fileFilter = (req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
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
    } else {
        cb(new Error('Invalid file type. Only Images and Documents (PDF, DOC, DOCX, XLS, PPT, TXT) are allowed.') as any);
    }
};

const createStorage = (entityType: 'staff' | 'students' | 'general' | 'library' | 'assets' | 'finance' | 'academic', category: string) => {
    return multer.diskStorage({
        destination: (req: any, file, cb) => {
            const schoolCode = req.user?.schoolCode || 'global';
            const humanId = req.user?.staffId || req.user?.studentId || req.user?.id || 'unassigned';
            
            // Map entityType based on role if generic 'upload' is used
            let folderType = entityType;
            if (entityType === 'general' && req.user) {
                if (req.user.role === 'STUDENT' || req.user.role === 'APPLICANT') folderType = 'students';
                else if (['TEACHER', 'SCHOOL_ADMIN', 'BURSAR'].includes(req.user.role)) folderType = 'staff';
            }

            // Institutional Global Silos (Library, Assets, Finance, Academics)
            const globalEntities = ['library', 'assets', 'finance', 'academic'];
            if (globalEntities.includes(entityType)) {
                const relativeDir = path.join(schoolCode, 'global', entityType, category).replace(/\\/g, '/');
                const fullPath = path.join(__dirname, '../../storage', relativeDir);
                if (!fs.existsSync(fullPath)) fs.mkdirSync(fullPath, { recursive: true });
                req.uploadCategoryPath = relativeDir;
                cb(null, fullPath);
                return;
            }

            // Entity-Specific Silos (Staff, Students)
            const relativeDir = path.join(schoolCode, folderType, humanId, category).replace(/\\/g, '/');
            
            // SECURITY GAUNTLET: Prevent path traversal and ensure multi-tenant isolation
            if (relativeDir.includes('..') || !relativeDir.startsWith(schoolCode)) {
                return cb(new Error('Security Violation: Unauthorized path traversal attempt detected.') as any, '');
            }

            const fullPath = path.join(__dirname, '../../storage', relativeDir);

            if (!fs.existsSync(fullPath)) {
                fs.mkdirSync(fullPath, { recursive: true });
            }
            
            req.uploadCategoryPath = relativeDir;
            cb(null, fullPath);
        },
        filename: (req, file, cb) => {
            const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
            // Ignore original extension entirely to prevent XSS/spoofing (e.g. malicious.html sent as image/png)
            // Map common mimetypes to safe extensions
            const mimeToExt: Record<string, string> = {
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
export const upload = multer({
    storage: createStorage('general', 'avatars'),
    limits: { fileSize: 20 * 1024 * 1024 },
    fileFilter
});

// Teacher Assignments (stored under Teacher's staff folder)
export const assignmentUpload = multer({
    storage: createStorage('staff', 'assignments'),
    limits: { fileSize: 50 * 1024 * 1024 },
    fileFilter
});

// Student Submissions (stored under Student's student folder)
export const submissionUpload = multer({
    storage: createStorage('students', 'submissions'),
    limits: { fileSize: 30 * 1024 * 1024 },
    fileFilter
});

// Signature Uploads (stored under Staff folder)
export const signatureUpload = multer({
    storage: createStorage('staff', 'signatures'),
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter
});

// Library Book Uploads (Global for the school)
export const libraryUpload = multer({
    storage: createStorage('library', 'catalog'),
    limits: { fileSize: 100 * 1024 * 1024 }, // Larger for PDFs
    fileFilter
});

// Asset Uploads (Global for the school)
export const assetUpload = multer({
    storage: createStorage('assets', 'inventory'),
    limits: { fileSize: 10 * 1024 * 1024 },
    fileFilter
});

// Financial Receipts (Global Institutional Silo)
export const receiptUpload = multer({
    storage: createStorage('finance', 'receipts'),
    limits: { fileSize: 10 * 1024 * 1024 },
    fileFilter
});

// Academic Reports (Global Institutional Silo)
export const reportUpload = multer({
    storage: createStorage('academic', 'reports'),
    limits: { fileSize: 20 * 1024 * 1024 },
    fileFilter
});

// Branding & ID Card Templates (Global Institutional Silo)
export const brandingUpload = multer({
    storage: createStorage('academic', 'branding'),
    limits: { fileSize: 10 * 1024 * 1024 },
    fileFilter
});

// HR / Staff Documents
export const staffDocumentUpload = multer({
    storage: createStorage('staff', 'documents'),
    limits: { fileSize: 50 * 1024 * 1024 },
    fileFilter
});

// Student Identity / Transfer Documents
export const studentDocumentUpload = multer({
    storage: createStorage('students', 'documents'),
    limits: { fileSize: 50 * 1024 * 1024 },
    fileFilter
});

// Student Clubs Upload
export const clubsUpload = multer({
    storage: createStorage('academic', 'clubs'),
    limits: { fileSize: 10 * 1024 * 1024 },
    fileFilter
});

// School Sports Upload
export const sportsUpload = multer({
    storage: createStorage('academic', 'sports'),
    limits: { fileSize: 10 * 1024 * 1024 },
    fileFilter
});
