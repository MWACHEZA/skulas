"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseExcelBuffer = parseExcelBuffer;
exports.generateFeeTemplateBuffer = generateFeeTemplateBuffer;
exports.generateClassTemplateBuffer = generateClassTemplateBuffer;
exports.generateStudentTemplateBuffer = generateStudentTemplateBuffer;
const ExcelJS = __importStar(require("exceljs"));
/**
 * Parses an Excel buffer into a JSON array
 */
async function parseExcelBuffer(buffer) {
    try {
        const workbook = new ExcelJS.Workbook();
        await workbook.xlsx.load(buffer);
        const worksheet = workbook.worksheets[0];
        if (!worksheet)
            return [];
        const result = [];
        let headers = [];
        worksheet.eachRow((row, rowNumber) => {
            if (rowNumber === 1) {
                // First row is headers
                row.eachCell((cell, colNumber) => {
                    headers[colNumber] = cell.value ? cell.value.toString() : `Column${colNumber}`;
                });
            }
            else {
                const rowData = {};
                row.eachCell((cell, colNumber) => {
                    const header = headers[colNumber];
                    if (header) {
                        rowData[header] = cell.value;
                    }
                });
                result.push(rowData);
            }
        });
        return result;
    }
    catch (error) {
        console.error('Excel parsing failed:', error);
        throw new Error('Invalid Excel file format');
    }
}
/**
 * Generates an Excel template for Fee Import
 */
async function generateFeeTemplateBuffer() {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Fee Import Template');
    worksheet.columns = [
        { header: 'Student ID', key: 'Student ID' },
        { header: 'Student Email', key: 'Student Email' },
        { header: 'Amount', key: 'Amount' },
        { header: 'Paid', key: 'Paid' },
        { header: 'Term', key: 'Term' },
        { header: 'Year', key: 'Year' },
        { header: 'Description', key: 'Description' }
    ];
    worksheet.addRow({
        'Student ID': 'STU-001',
        'Student Email': 'student@example.com',
        'Amount': 500,
        'Paid': 200,
        'Term': 'Term 1',
        'Year': 2024,
        'Description': 'Tuition Fees'
    });
    return workbook.xlsx.writeBuffer();
}
/**
 * Generates an Excel template for Class Import
 */
async function generateClassTemplateBuffer() {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Class Import Template');
    worksheet.columns = [
        { header: 'Name', key: 'Name' },
        { header: 'Level', key: 'Level' },
        { header: 'Capacity', key: 'Capacity' }
    ];
    worksheet.addRow({ 'Name': 'Form 1A', 'Level': 'Form 1', 'Capacity': 40 });
    worksheet.addRow({ 'Name': 'Form 1B', 'Level': 'Form 1', 'Capacity': 40 });
    return workbook.xlsx.writeBuffer();
}
/**
 * Generates an Excel template for Student Import
 */
async function generateStudentTemplateBuffer() {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Student Import Template');
    worksheet.columns = [
        { header: 'Student ID', key: 'Student ID' },
        { header: 'Name', key: 'Name' },
        { header: 'Email', key: 'Email' },
        { header: 'Phone', key: 'Phone' },
        { header: 'Class Name', key: 'Class Name' },
        { header: 'Gender', key: 'Gender' },
        { header: 'DOB (YYYY-MM-DD)', key: 'DOB (YYYY-MM-DD)' },
        { header: 'Address', key: 'Address' },
        { header: 'Guardian Name', key: 'Guardian Name' }
    ];
    worksheet.addRow({
        'Student ID': 'STU-1001',
        'Name': 'John Doe',
        'Email': 'john@example.com',
        'Phone': '+263771234567',
        'Class Name': 'Form 1A',
        'Gender': 'Male',
        'DOB (YYYY-MM-DD)': '2010-05-15',
        'Address': '123 Main St, Harare',
        'Guardian Name': 'Jane Doe'
    });
    return workbook.xlsx.writeBuffer();
}
//# sourceMappingURL=xlsx-utils.js.map