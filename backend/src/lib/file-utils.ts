import fs from 'fs';
import path from 'path';

export function getMimeExtension(mimeType: string): string {
  if (!mimeType) return 'bin';
  const cleanMime = mimeType.toLowerCase().split(';')[0].trim();
  const mimeMap: Record<string, string> = {
    'application/pdf': 'pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
    'application/msword': 'doc',
    'application/vnd.ms-excel': 'xls',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'xlsx',
    'image/jpeg': 'jpg',
    'image/jpg': 'jpg',
    'image/png': 'png',
    'image/webp': 'webp',
    'image/gif': 'gif',
    'image/svg+xml': 'svg',
    'text/plain': 'txt',
    'video/mp4': 'mp4',
    'audio/mpeg': 'mp3',
    'audio/mp3': 'mp3'
  };
  if (mimeMap[cleanMime]) return mimeMap[cleanMime];
  const sub = cleanMime.split('/')[1];
  if (sub && sub.length <= 5 && !sub.includes('.')) return sub;
  return 'bin';
}

/**
 * Saves a base64 encoded image to a structured directory
 * @param base64 String (data:image/png;base64,...)
 * @param prefix File prefix (e.g. 'avatar')
 * @param subDir Subdirectory (e.g. 'images', 'docs')
 * @param schoolCode The unique school code
 * @param entityType Optional grouping (students, staff, etc)
 * @param entityId Optional specific entity ID (Human ID)
 * @returns Standardized path (relative to storage/) or null
 */
export function saveBase64Image(
  base64: string, 
  prefix: string, 
  subDir: string = 'images', 
  schoolCode: string = 'global',
  entityType?: string,
  entityId?: string
): string | null {
  if (!base64 || !base64.includes(';base64,')) return null;

  try {
    const parts = base64.split(';base64,');
    const mimeType = parts[0].split(':')[1];
    const extension = getMimeExtension(mimeType);
    const data = parts[1];
    const buffer = Buffer.from(data, 'base64');

    const uniqueId = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const filename = `${prefix}-${uniqueId}.${extension}`;
    
    // Structure: storage/[schoolCode]/[entityType]/[entityId]/[subDir]/[filename]
    let relativeDir = '';
    if (entityType && entityId) {
      relativeDir = path.join(schoolCode, entityType, entityId, subDir);
    } else {
      relativeDir = path.join(schoolCode, subDir);
    }
    
    const uploadDir = path.join(__dirname, '../../storage', relativeDir);

    // Ensure directory exists
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    const filePath = path.join(uploadDir, filename);
    fs.writeFileSync(filePath, buffer);

    // Return the relative path stored in DB
    return path.join(relativeDir, filename).replace(/\\/g, '/');
  } catch (error) {
    console.error('Failed to save base64 image:', error);
    return null;
  }
}

/**
 * Renames an entity directory (e.g. moving from applicant number to student ID)
 */
export function renameEntityDir(schoolCode: string, entityType: string, oldId: string, newId: string) {
  try {
    const oldPath = path.join(__dirname, '../../storage', schoolCode, entityType, oldId);
    const newPath = path.join(__dirname, '../../storage', schoolCode, entityType, newId);
    
    if (fs.existsSync(oldPath) && !fs.existsSync(newPath)) {
      // Ensure parent of newPath exists
      const parentDir = path.dirname(newPath);
      if (!fs.existsSync(parentDir)) {
        fs.mkdirSync(parentDir, { recursive: true });
      }
      fs.renameSync(oldPath, newPath);
      return true;
    }
    return false;
  } catch (error) {
    console.error('Failed to rename entity directory:', error);
    return false;
  }
}
