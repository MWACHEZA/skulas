"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
const STORAGE_ROOT = path_1.default.join(__dirname, '../../storage');
// In-memory resolution cache to prevent repeated recursive fs.readdirSync scans on high-traffic pages
const resolvedPathCache = new Map();
const missingPathCache = new Map();
const MISSING_CACHE_TTL_MS = 60 * 1000;
const DEFAULT_AVATAR_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128" fill="none">
  <rect width="128" height="128" rx="64" fill="#E2E8F0"/>
  <circle cx="64" cy="48" r="22" fill="#94A3B8"/>
  <path d="M24 112C24 91.0132 41.0132 74 62 74H66C86.9868 74 104 91.0132 104 112V128H24V112Z" fill="#94A3B8"/>
</svg>`;
const collapseDuplicateFolders = (filePath) => {
    const parts = filePath.split('/');
    const cleanParts = [];
    for (const part of parts) {
        if (cleanParts.length === 0 || cleanParts[cleanParts.length - 1] !== part) {
            cleanParts.push(part);
        }
    }
    return cleanParts.join('/');
};
const multer_1 = __importDefault(require("multer"));
// 20GB limit (or configured via MAX_FILE_UPLOAD_BYTES)
const MAX_UPLOAD_LIMIT = process.env.MAX_FILE_UPLOAD_BYTES
    ? parseInt(process.env.MAX_FILE_UPLOAD_BYTES, 10)
    : 20 * 1024 * 1024 * 1024;
const diskStorage = multer_1.default.diskStorage({
    destination: (req, file, cb) => {
        const schoolCode = req.user?.schoolCode || 'global';
        const subDir = req.query.dir ? String(req.query.dir) : 'uploads';
        const targetDir = path_1.default.join(STORAGE_ROOT, schoolCode, subDir);
        if (!fs_1.default.existsSync(targetDir)) {
            fs_1.default.mkdirSync(targetDir, { recursive: true });
        }
        cb(null, targetDir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
        const ext = path_1.default.extname(file.originalname);
        cb(null, `${file.fieldname}-${uniqueSuffix}${ext}`);
    }
});
const uploadMiddleware = (0, multer_1.default)({
    storage: diskStorage,
    limits: { fileSize: MAX_UPLOAD_LIMIT }
});
const optionalAuthForUpload = (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
        return (0, auth_1.requireAuth)(req, res, next);
    }
    const subDir = req.query.dir ? String(req.query.dir).toLowerCase() : '';
    const allowedPublicDirs = ['applications', 'public', 'recruitment', 'inquiries', 'docs'];
    if (allowedPublicDirs.some(d => subDir.includes(d))) {
        return next();
    }
    return res.status(401).json({ error: 'Authentication required for this directory' });
};
/**
 * @route   POST /api/storage/upload
 * @desc    Streaming file upload supporting up to 20GB
 */
router.post('/upload', optionalAuthForUpload, uploadMiddleware.single('file'), (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
    }
    // Clear negative cache when a new file is uploaded
    missingPathCache.clear();
    const schoolCode = req.user?.schoolCode || req.query.schoolCode || 'global';
    const subDir = req.query.dir ? String(req.query.dir) : 'uploads';
    const relativePath = path_1.default.join(schoolCode, subDir, req.file.filename).replace(/\\/g, '/');
    res.json({
        success: true,
        filePath: relativePath,
        fileName: req.file.filename,
        originalName: req.file.originalname,
        size: req.file.size,
        mimeType: req.file.mimetype
    });
});
/**
 * @route   GET /api/storage/file/*
 * @desc    Protected institutional file serving
 */
router.get(/\/file\/(.*)/, auth_1.requireAuth, (req, res) => {
    let filePath = req.params[0]; // e.g. AX-EMBAKWE/global/images/logo.png
    if (!filePath) {
        return res.status(400).json({ error: 'Missing file path' });
    }
    // 1. Security Check: Prevent path traversal
    if (filePath.includes('..') || filePath.includes('\0')) {
        return res.status(400).json({ error: 'Illegal characters in path' });
    }
    filePath = collapseDuplicateFolders(filePath);
    // 2. Multi-Tenant Enforcement (Case-insensitive)
    const pathParts = filePath.split('/');
    const requestedSchoolCode = pathParts[0];
    const userSchool = req.user?.schoolCode?.toUpperCase();
    const isSuperAdmin = req.user?.role === 'SUPER_ADMIN' || userSchool === 'GLOBAL';
    const isGlobalAsset = requestedSchoolCode.toUpperCase() === 'GLOBAL';
    if (!isSuperAdmin && !isGlobalAsset && userSchool && requestedSchoolCode.toUpperCase() !== userSchool) {
        return res.status(403).json({ error: 'Access denied: Institutional boundary violation' });
    }
    let fullPath = path_1.default.join(STORAGE_ROOT, filePath);
    // 3. File Existence Check with fallback to school directory
    if (!fs_1.default.existsSync(fullPath) || fs_1.default.lstatSync(fullPath).isDirectory()) {
        if (userSchool && !filePath.toUpperCase().startsWith(userSchool)) {
            const altPath = path_1.default.join(STORAGE_ROOT, userSchool, filePath);
            if (fs_1.default.existsSync(altPath) && !fs_1.default.lstatSync(altPath).isDirectory()) {
                fullPath = altPath;
            }
        }
    }
    if (!fs_1.default.existsSync(fullPath) || fs_1.default.lstatSync(fullPath).isDirectory()) {
        return res.status(404).json({ error: 'File not found' });
    }
    // 4. RBAC Check (Sub-Folder specific)
    const isFinance = filePath.includes('/finance/');
    if (isFinance && !['BURSAR', 'SCHOOL_ADMIN'].includes(req.user.role)) {
        return res.status(403).json({ error: 'Access denied: Financial clearance required' });
    }
    // 5. Caching Strategy
    res.setHeader('Cache-Control', 'private, max-age=300');
    // 6. Serve File (with download support if requested)
    if (req.query.download === 'true') {
        const downloadName = req.query.filename || path_1.default.basename(fullPath);
        return res.download(fullPath, downloadName);
    }
    res.sendFile(fullPath);
});
/**
 * @route   GET /api/storage/public/*
 * @desc    Global shared assets (no auth required)
 */
router.get(/\/public\/(.*)/, (req, res) => {
    const filePath = req.params[0];
    const fullPath = path_1.default.join(STORAGE_ROOT, 'public', filePath);
    if (filePath.includes('..') || !fs_1.default.existsSync(fullPath) || fs_1.default.lstatSync(fullPath).isDirectory()) {
        return res.status(404).send('Not Found');
    }
    res.setHeader('Cache-Control', 'public, max-age=3600');
    res.sendFile(fullPath);
});
/**
 * @route   GET /api/storage/media/:schoolCode/*
 * @desc    Flexible public media serving (logos, avatars, branding)
 * @example /api/storage/media/AX-EMBAKWE/staff/STAFF-001/avatars/file.jpg
 */
router.get(/\/media\/([^\/]+)\/(.*)/, (req, res) => {
    let schoolCode = decodeURIComponent(req.params[0]);
    let filePath = decodeURIComponent(req.params[1]);
    // 1. Security Check: Prevent path traversal
    if (filePath.includes('..') || filePath.includes('\0')) {
        return res.status(400).json({ error: 'Illegal characters in path' });
    }
    // If schoolCode was mistakenly passed as a person's name (e.g. "Alan Guerra") and filePath starts with AX-..., extract the real schoolCode
    const embeddedSchoolMatch = filePath.match(/^([A-Za-z]{2,4}-[A-Za-z0-9_-]+)\/(.+)$/);
    if (embeddedSchoolMatch && (schoolCode.includes(' ') || !/^[A-Za-z]{2,4}-[A-Za-z0-9_-]+$/i.test(schoolCode))) {
        schoolCode = embeddedSchoolMatch[1];
        filePath = embeddedSchoolMatch[2];
    }
    // 2. Normalize path: Remove schoolCode prefix if it exists
    filePath = filePath.replace(/^submissions\/(students\/|[A-Za-z0-9_-]+\/students\/)/i, "$1");
    const escapedCode = schoolCode.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    filePath = filePath.replace(new RegExp(`^${escapedCode}/`, 'i'), '');
    filePath = filePath.replace(new RegExp(`^([^/]+)/${escapedCode}/`, 'i'), '$1/');
    // Collapse duplicate adjacent folders
    filePath = collapseDuplicateFolders(filePath);
    // 3. Extension Check: Allow images, safe educational documents, and media to be served
    const ext = path_1.default.extname(filePath).toLowerCase();
    const allowedExtensions = [
        '.jpg', '.jpeg', '.png', '.webp', '.svg', '.gif', '.ico',
        '.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx', '.txt', '.csv',
        '.mp4', '.mp3', '.webm', '.wav', '.ogg', '.zip'
    ];
    if (!allowedExtensions.includes(ext)) {
        return res.status(403).json({ error: 'Access denied: Targeted resource type is not allowed' });
    }
    const cacheKey = `${schoolCode}:${filePath}`;
    // Fast path: check positive in-memory cache
    const cachedFullPath = resolvedPathCache.get(cacheKey);
    if (cachedFullPath && fs_1.default.existsSync(cachedFullPath)) {
        res.setHeader('Cache-Control', 'public, max-age=3600');
        return res.sendFile(cachedFullPath);
    }
    // Fast path: check negative cache so missing files never trigger repeated directory walks
    const missingTs = missingPathCache.get(cacheKey);
    if (missingTs && Date.now() - missingTs < MISSING_CACHE_TTL_MS) {
        if (filePath.includes('avatar') || ['.jpg', '.jpeg', '.png', '.webp'].includes(ext)) {
            res.setHeader('Content-Type', 'image/svg+xml');
            res.setHeader('Cache-Control', 'public, max-age=300');
            return res.status(200).send(DEFAULT_AVATAR_SVG);
        }
        return res.status(404).json({ error: 'Media not found' });
    }
    // Helper to find file by exact filename within a directory (max depth 4)
    const findFileInDir = (dir, targetFilename, depth = 0) => {
        if (depth > 4 || !fs_1.default.existsSync(dir))
            return null;
        try {
            const entries = fs_1.default.readdirSync(dir, { withFileTypes: true });
            for (const entry of entries) {
                if (entry.isFile() && entry.name.toLowerCase() === targetFilename.toLowerCase()) {
                    return path_1.default.join(dir, entry.name);
                }
                if (entry.isDirectory()) {
                    const found = findFileInDir(path_1.default.join(dir, entry.name), targetFilename, depth + 1);
                    if (found)
                        return found;
                }
            }
        }
        catch {
            // Ignore directory read errors
        }
        return null;
    };
    // Candidate paths to check in priority order
    const candidatePaths = [
        path_1.default.join(STORAGE_ROOT, schoolCode, filePath),
    ];
    if (filePath.startsWith('images/')) {
        candidatePaths.push(path_1.default.join(STORAGE_ROOT, schoolCode, filePath.replace(/^images\//, '')));
    }
    // Direct match from storage root if path already includes schoolCode or global
    candidatePaths.push(path_1.default.join(STORAGE_ROOT, filePath));
    if (filePath.startsWith('images/')) {
        candidatePaths.push(path_1.default.join(STORAGE_ROOT, filePath.replace(/^images\//, '')));
    }
    if (schoolCode !== 'global') {
        candidatePaths.push(path_1.default.join(STORAGE_ROOT, 'global', filePath));
        if (filePath.startsWith('images/')) {
            candidatePaths.push(path_1.default.join(STORAGE_ROOT, 'global', filePath.replace(/^images\//, '')));
        }
    }
    for (const cp of candidatePaths) {
        if (fs_1.default.existsSync(cp) && !fs_1.default.lstatSync(cp).isDirectory()) {
            resolvedPathCache.set(cacheKey, cp);
            res.setHeader('Cache-Control', 'public, max-age=3600');
            return res.sendFile(cp);
        }
    }
    const filename = path_1.default.basename(filePath);
    // Fallback: Check common silos first
    const fallbacks = [
        path_1.default.join(STORAGE_ROOT, schoolCode, 'avatars', filename),
        path_1.default.join(STORAGE_ROOT, schoolCode, 'global', 'library', 'catalog', filename),
        path_1.default.join(STORAGE_ROOT, schoolCode, 'global', 'assets', 'inventory', filename),
        path_1.default.join(STORAGE_ROOT, schoolCode, 'global', 'academic', 'clubs', filename),
        path_1.default.join(STORAGE_ROOT, schoolCode, 'global', 'academic', 'sports', filename),
        path_1.default.join(STORAGE_ROOT, schoolCode, 'global', 'academic', 'branding', filename),
        path_1.default.join(STORAGE_ROOT, schoolCode, 'global', 'branding', filename),
        path_1.default.join(STORAGE_ROOT, schoolCode, 'global', 'images', filename),
        path_1.default.join(STORAGE_ROOT, schoolCode, 'global', 'profiles', filename)
    ];
    for (const fallbackPath of fallbacks) {
        if (fs_1.default.existsSync(fallbackPath) && !fs_1.default.lstatSync(fallbackPath).isDirectory()) {
            resolvedPathCache.set(cacheKey, fallbackPath);
            res.setHeader('Cache-Control', 'public, max-age=3600');
            return res.sendFile(fallbackPath);
        }
    }
    // Dynamic search within school directory
    const schoolMatch = findFileInDir(path_1.default.join(STORAGE_ROOT, schoolCode), filename);
    if (schoolMatch) {
        resolvedPathCache.set(cacheKey, schoolMatch);
        res.setHeader('Cache-Control', 'public, max-age=3600');
        return res.sendFile(schoolMatch);
    }
    // Dynamic search within global directory
    const globalMatch = findFileInDir(path_1.default.join(STORAGE_ROOT, 'global'), filename);
    if (globalMatch) {
        resolvedPathCache.set(cacheKey, globalMatch);
        res.setHeader('Cache-Control', 'public, max-age=3600');
        return res.sendFile(globalMatch);
    }
    // Robust dynamic fallback for any logo files (fuzzy matching)
    if (filename.toLowerCase().startsWith('logo')) {
        const logoDirs = [
            path_1.default.join(STORAGE_ROOT, schoolCode, 'global', 'branding'),
            path_1.default.join(STORAGE_ROOT, schoolCode, 'global', 'academic', 'branding'),
            path_1.default.join(STORAGE_ROOT, schoolCode, 'global', 'images')
        ];
        for (const dir of logoDirs) {
            if (fs_1.default.existsSync(dir)) {
                const files = fs_1.default.readdirSync(dir);
                const matchingFile = files.find(f => f.toLowerCase().startsWith('logo'));
                if (matchingFile) {
                    const matchedPath = path_1.default.join(dir, matchingFile);
                    if (!fs_1.default.lstatSync(matchedPath).isDirectory()) {
                        resolvedPathCache.set(cacheKey, matchedPath);
                        res.setHeader('Cache-Control', 'public, max-age=3600');
                        return res.sendFile(matchedPath);
                    }
                }
            }
        }
    }
    // Record in negative cache to prevent repeated disk scans
    missingPathCache.set(cacheKey, Date.now());
    // Return clean SVG placeholder for missing avatars/images so UI never breaks or logs 404s
    if (filePath.includes('avatar') || ['.jpg', '.jpeg', '.png', '.webp'].includes(ext)) {
        res.setHeader('Content-Type', 'image/svg+xml');
        res.setHeader('Cache-Control', 'public, max-age=300');
        return res.status(200).send(DEFAULT_AVATAR_SVG);
    }
    return res.status(404).json({ error: 'Media not found' });
});
exports.default = router;
