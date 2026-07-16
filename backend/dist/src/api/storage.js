import { Router } from 'express';
import path from 'path';
import fs from 'fs';
import { requireAuth } from '../middleware/auth';
const router = Router();
const STORAGE_ROOT = path.join(__dirname, '../../storage');
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
/**
 * @route   GET /api/storage/file/*
 * @desc    Protected institutional file serving
 */
router.get(/\/file\/(.*)/, requireAuth, (req, res) => {
    let filePath = req.params[0]; // e.g. AX-EMBAKWE/global/images/logo.png
    if (!filePath) {
        return res.status(400).json({ error: 'Missing file path' });
    }
    // 1. Security Check: Prevent path traversal
    if (filePath.includes('..') || filePath.includes('\0')) {
        return res.status(400).json({ error: 'Illegal characters in path' });
    }
    filePath = collapseDuplicateFolders(filePath);
    // 2. Multi-Tenant Enforcement
    const pathParts = filePath.split('/');
    const requestedSchoolCode = pathParts[0];
    // Check if user is trying to access another school's vault
    if (requestedSchoolCode !== req.user?.schoolCode) {
        // Special case: Allow public folder within school vault if needed?
        // For now, strict isolation
        return res.status(403).json({ error: 'Access denied: Institutional boundary violation' });
    }
    const fullPath = path.join(STORAGE_ROOT, filePath);
    // 3. File Existence Check
    if (!fs.existsSync(fullPath) || fs.lstatSync(fullPath).isDirectory()) {
        return res.status(404).json({ error: 'File not found' });
    }
    // 4. RBAC Check (Sub-Folder specific)
    const isAcademic = filePath.includes('/academic/');
    const isFinance = filePath.includes('/finance/');
    if (isFinance && !['BURSAR', 'SCHOOL_ADMIN'].includes(req.user.role)) {
        return res.status(403).json({ error: 'Access denied: Financial clearance required' });
    }
    // 5. Caching Strategy for Branding
    const isBranding = filePath.includes('/images/') || filePath.includes('/logo.');
    if (isBranding) {
        res.setHeader('Cache-Control', 'public, max-age=3600'); // Cache for 1 hour
    }
    else {
        res.setHeader('Cache-Control', 'no-cache');
    }
    // 6. Serve File
    res.sendFile(fullPath);
});
/**
 * @route   GET /api/storage/public/*
 * @desc    Global shared assets (no auth required)
 */
router.get(/\/public\/(.*)/, (req, res) => {
    const filePath = req.params[0];
    const fullPath = path.join(STORAGE_ROOT, 'public', filePath);
    if (filePath.includes('..') || !fs.existsSync(fullPath) || fs.lstatSync(fullPath).isDirectory()) {
        return res.status(404).send('Not Found');
    }
    res.setHeader('Cache-Control', 'public, max-age=86400'); // Cache for 24h
    res.sendFile(fullPath);
});
/**
 * @route   GET /api/storage/media/:schoolCode/*
 * @desc    Flexible public media serving (logos, avatars, branding)
 * @example /api/storage/media/AX-EMBAKWE/staff/STAFF-001/avatars/file.jpg
 */
router.get(/\/media\/([^\/]+)\/(.*)/, (req, res) => {
    const schoolCode = req.params[0];
    let filePath = decodeURIComponent(req.params[1]);
    // 1. Security Check: Prevent path traversal
    if (filePath.includes('..') || filePath.includes('\0')) {
        return res.status(400).json({ error: 'Illegal characters in path' });
    }
    // 2. Normalize path: Remove schoolCode prefix if it exists (handles both "AX-E/..." and "images/AX-E/...")
    const escapedCode = schoolCode.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); // Escape for regex
    filePath = filePath.replace(new RegExp(`^${escapedCode}/`), '');
    filePath = filePath.replace(new RegExp(`^([^/]+)/${escapedCode}/`), '$1/');
    // Collapse duplicate adjacent folders
    filePath = collapseDuplicateFolders(filePath);
    // 2. Extension Check: Only allow images to be served publicly
    const ext = path.extname(filePath).toLowerCase();
    const allowedExtensions = ['.jpg', '.jpeg', '.png', '.webp', '.svg', '.gif'];
    if (!allowedExtensions.includes(ext)) {
        return res.status(403).json({ error: 'Access denied: Targeted resource type is not public' });
    }
    const fullPath = path.join(STORAGE_ROOT, schoolCode, filePath);
    if (!fs.existsSync(fullPath) || fs.lstatSync(fullPath).isDirectory()) {
        const filename = path.basename(filePath);
        console.log(`[Storage API] File not found: ${fullPath}. Filename: ${filename}`);
        // 1. Fallback: Check common silos first for exact file match
        const fallbacks = [
            path.join(STORAGE_ROOT, schoolCode, 'global', 'library', 'catalog', filename),
            path.join(STORAGE_ROOT, schoolCode, 'global', 'assets', 'inventory', filename),
            path.join(STORAGE_ROOT, schoolCode, 'global', 'academic', 'clubs', filename),
            path.join(STORAGE_ROOT, schoolCode, 'global', 'academic', 'sports', filename),
            path.join(STORAGE_ROOT, schoolCode, 'global', 'academic', 'branding', filename),
            path.join(STORAGE_ROOT, schoolCode, 'global', 'branding', filename),
            path.join(STORAGE_ROOT, schoolCode, 'global', 'images', filename),
            path.join(STORAGE_ROOT, schoolCode, 'global', 'profiles', filename)
        ];
        for (const fallbackPath of fallbacks) {
            if (fs.existsSync(fallbackPath) && !fs.lstatSync(fallbackPath).isDirectory()) {
                res.setHeader('Cache-Control', 'public, max-age=3600');
                return res.sendFile(fallbackPath);
            }
        }
        // 2. Robust dynamic fallback for any logo files (fuzzy matching)
        if (filename.toLowerCase().startsWith('logo')) {
            console.log(`[Storage API] Logo requested: ${filename}. Searching dirs...`);
            const logoDirs = [
                path.join(STORAGE_ROOT, schoolCode, 'global', 'branding'),
                path.join(STORAGE_ROOT, schoolCode, 'global', 'academic', 'branding'),
                path.join(STORAGE_ROOT, schoolCode, 'global', 'images')
            ];
            for (const dir of logoDirs) {
                console.log(`[Storage API] Checking dir: ${dir}`);
                if (fs.existsSync(dir)) {
                    const files = fs.readdirSync(dir);
                    console.log(`[Storage API] Files in dir:`, files);
                    const matchingFile = files.find(f => f.toLowerCase().startsWith('logo'));
                    if (matchingFile) {
                        const matchedPath = path.join(dir, matchingFile);
                        if (!fs.lstatSync(matchedPath).isDirectory()) {
                            console.log(`[Storage API] Found matching logo: ${matchedPath}`);
                            res.setHeader('Cache-Control', 'public, max-age=3600');
                            return res.sendFile(matchedPath);
                        }
                    }
                }
            }
        }
        return res.status(404).json({ error: 'Media not found' });
    }
    res.setHeader('Cache-Control', 'public, max-age=3600');
    res.sendFile(fullPath);
});
export default router;
//# sourceMappingURL=storage.js.map