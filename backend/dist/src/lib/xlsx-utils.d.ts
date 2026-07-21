/**
 * Parses an Excel buffer into a JSON array
 */
export declare function parseExcelBuffer(buffer: Buffer): Promise<any[]>;
/**
 * Generates an Excel template for Fee Import
 */
export declare function generateFeeTemplateBuffer(): Promise<Buffer<ArrayBufferLike>>;
/**
 * Generates an Excel template for Class Import
 */
export declare function generateClassTemplateBuffer(): Promise<Buffer<ArrayBufferLike>>;
/**
 * Generates an Excel template for Student Import
 */
export declare function generateStudentTemplateBuffer(): Promise<Buffer<ArrayBufferLike>>;
