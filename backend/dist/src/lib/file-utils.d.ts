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
export declare function saveBase64Image(base64: string, prefix: string, subDir?: string, schoolCode?: string, entityType?: string, entityId?: string): string | null;
/**
 * Renames an entity directory (e.g. moving from applicant number to student ID)
 */
export declare function renameEntityDir(schoolCode: string, entityType: string, oldId: string, newId: string): boolean;
