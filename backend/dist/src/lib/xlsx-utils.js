import * as XLSX from 'xlsx';
/**
 * Parses an Excel buffer into a JSON array
 */
export function parseExcelBuffer(buffer) {
    try {
        const workbook = XLSX.read(buffer, { type: 'buffer' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        return XLSX.utils.sheet_to_json(worksheet);
    }
    catch (error) {
        console.error('Excel parsing failed:', error);
        throw new Error('Invalid Excel file format');
    }
}
/**
 * Generates an Excel template for Fee Import
 */
export function generateFeeTemplateBuffer() {
    const data = [
        {
            'Student ID': 'STU-001',
            'Student Email': 'student@example.com',
            'Amount': 500,
            'Paid': 200,
            'Term': 'Term 1',
            'Year': 2024,
            'Description': 'Tuition Fees'
        }
    ];
    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Fee Import Template');
    return XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
}
//# sourceMappingURL=xlsx-utils.js.map