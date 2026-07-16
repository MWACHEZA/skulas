import * as ExcelJS from 'exceljs';

/**
 * Parses an Excel buffer into a JSON array
 */
export async function parseExcelBuffer(buffer: Buffer) {
  try {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer as any);
    const worksheet = workbook.worksheets[0];
    
    if (!worksheet) return [];

    const result: any[] = [];
    let headers: string[] = [];

    worksheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) {
        // First row is headers
        row.eachCell((cell, colNumber) => {
          headers[colNumber] = cell.value ? cell.value.toString() : `Column${colNumber}`;
        });
      } else {
        const rowData: any = {};
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
  } catch (error) {
    console.error('Excel parsing failed:', error);
    throw new Error('Invalid Excel file format');
  }
}

/**
 * Generates an Excel template for Fee Import
 */
export async function generateFeeTemplateBuffer() {
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
  
  return workbook.xlsx.writeBuffer() as any as Promise<Buffer>;
}

/**
 * Generates an Excel template for Class Import
 */
export async function generateClassTemplateBuffer() {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Class Import Template');
  
  worksheet.columns = [
    { header: 'Name', key: 'Name' },
    { header: 'Level', key: 'Level' },
    { header: 'Capacity', key: 'Capacity' }
  ];

  worksheet.addRow({ 'Name': 'Form 1A', 'Level': 'Form 1', 'Capacity': 40 });
  worksheet.addRow({ 'Name': 'Form 1B', 'Level': 'Form 1', 'Capacity': 40 });
  
  return workbook.xlsx.writeBuffer() as any as Promise<Buffer>;
}

/**
 * Generates an Excel template for Student Import
 */
export async function generateStudentTemplateBuffer() {
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
  
  return workbook.xlsx.writeBuffer() as any as Promise<Buffer>;
}
