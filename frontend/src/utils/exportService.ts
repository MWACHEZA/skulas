import { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, AlignmentType, WidthType, BorderStyle, HeadingLevel, ShadingType } from 'docx';
import { saveAs } from 'file-saver';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';

export interface ExportColumn<T = any> {
  header: string;
  key?: string;
  formatter?: (row: T, index: number) => string | number | null | undefined;
  width?: number;
}

export interface ExportOptions<T = any> {
  filename: string;
  title: string;
  subtitle?: string;
  schoolName?: string;
  columns: ExportColumn<T>[];
  data: T[];
  orientation?: 'portrait' | 'landscape';
  metadata?: Record<string, string>;
}

/**
 * Extracts a row value based on column definition.
 */
function getCellValue<T>(col: ExportColumn<T>, row: T, index: number): string {
  if (col.formatter) {
    const val = col.formatter(row, index);
    return val === null || val === undefined ? '' : String(val);
  }
  if (col.key && row && typeof row === 'object') {
    const val = (row as any)[col.key];
    return val === null || val === undefined ? '' : String(val);
  }
  return '';
}

/**
 * Clean filename helper
 */
function sanitizeFilename(name: string): string {
  return name.replace(/[^a-zA-Z0-9_\-\.]/g, '_').replace(/_+/g, '_');
}

/**
 * Export data as Excel spreadsheet (.xlsx)
 */
export async function exportToExcel<T = any>(options: ExportOptions<T>): Promise<void> {
  const { filename, title, subtitle, schoolName, columns, data } = options;

  const rows: (string | number)[][] = [];

  // Header branding block
  if (schoolName) {
    rows.push([schoolName.toUpperCase()]);
  }
  rows.push([title]);
  if (subtitle) {
    rows.push([subtitle]);
  }
  rows.push([`Generated: ${new Date().toLocaleString()}`, `Total Records: ${data.length}`]);
  rows.push([]); // blank line separator

  // Column Headers
  const headerRow = columns.map(c => c.header);
  rows.push(headerRow);

  // Data rows
  data.forEach((row, idx) => {
    const rowVals = columns.map(c => getCellValue(c, row, idx));
    rows.push(rowVals);
  });

  const ws = XLSX.utils.aoa_to_sheet(rows);

  // Calculate auto column widths
  const colWidths = columns.map((col, cIdx) => {
    let maxLen = col.header.length;
    data.forEach((row, rIdx) => {
      const val = getCellValue(col, row, rIdx);
      if (val && val.length > maxLen) {
        maxLen = Math.min(val.length, 50); // cap max column width
      }
    });
    return { wch: Math.max(maxLen + 3, col.width || 12) };
  });
  ws['!cols'] = colWidths;

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Export');

  const baseName = sanitizeFilename(filename || title || 'export');
  XLSX.writeFile(wb, `${baseName}.xlsx`);
}

/**
 * Export data as Word document (.docx)
 */
export async function exportToWord<T = any>(options: ExportOptions<T>): Promise<void> {
  const { filename, title, subtitle, schoolName, columns, data, metadata } = options;

  const children: (Paragraph | Table)[] = [];

  // Document Title Header
  if (schoolName) {
    children.push(
      new Paragraph({
        children: [
          new TextRun({
            text: schoolName.toUpperCase(),
            bold: true,
            size: 28,
            color: '1E3A8A', // Dark blue
          }),
        ],
        alignment: AlignmentType.CENTER,
        spacing: { after: 120 },
      })
    );
  }

  children.push(
    new Paragraph({
      children: [
        new TextRun({
          text: title,
          bold: true,
          size: 24,
          color: '0F172A',
        }),
      ],
      alignment: AlignmentType.CENTER,
      heading: HeadingLevel.HEADING_1,
      spacing: { after: 80 },
    })
  );

  if (subtitle) {
    children.push(
      new Paragraph({
        children: [
          new TextRun({
            text: subtitle,
            italics: true,
            size: 20,
            color: '475569',
          }),
        ],
        alignment: AlignmentType.CENTER,
        spacing: { after: 100 },
      })
    );
  }

  // Metadata details (Date, Records, Custom metadata)
  const metaRuns: TextRun[] = [
    new TextRun({ text: `Date Generated: ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}   |   Total Records: ${data.length}`, size: 18, color: '64748B' }),
  ];

  if (metadata) {
    Object.entries(metadata).forEach(([k, v]) => {
      metaRuns.push(new TextRun({ text: `\n${k}: ${v}`, size: 18, color: '64748B' }));
    });
  }

  children.push(
    new Paragraph({
      children: metaRuns,
      alignment: AlignmentType.CENTER,
      spacing: { after: 240 },
    })
  );

  // Table Building
  // Table Header Row
  const tableHeaderRow = new TableRow({
    tableHeader: true,
    children: columns.map(col => new TableCell({
      shading: { type: ShadingType.CLEAR, fill: '1E40AF' }, // Tailwind blue-800
      margins: { top: 120, bottom: 120, left: 140, right: 140 },
      children: [
        new Paragraph({
          children: [
            new TextRun({
              text: col.header,
              bold: true,
              color: 'FFFFFF',
              size: 18,
            }),
          ],
        }),
      ],
    })),
  });

  // Table Data Rows
  const tableDataRows = data.map((row, rIdx) => {
    const isAlt = rIdx % 2 === 1;
    return new TableRow({
      children: columns.map(col => new TableCell({
        shading: isAlt ? { type: ShadingType.CLEAR, fill: 'F8FAFC' } : undefined,
        margins: { top: 100, bottom: 100, left: 140, right: 140 },
        children: [
          new Paragraph({
            children: [
              new TextRun({
                text: getCellValue(col, row, rIdx),
                size: 17,
                color: '334155',
              }),
            ],
          }),
        ],
      })),
    });
  });

  const table = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [tableHeaderRow, ...tableDataRows],
  });

  children.push(table);

  // Footer note
  children.push(
    new Paragraph({
      children: [
        new TextRun({
          text: `Confidential Document - Generated via Acadex ERP for ${schoolName || 'Internal Use Only'}.`,
          italics: true,
          size: 16,
          color: '94A3B8',
        }),
      ],
      alignment: AlignmentType.CENTER,
      spacing: { before: 300 },
    })
  );

  const doc = new Document({
    sections: [
      {
        properties: {},
        children,
      },
    ],
    creator: schoolName || 'Acadex SIS',
    title,
    description: subtitle || title,
  });

  const blob = await Packer.toBlob(doc);
  const baseName = sanitizeFilename(filename || title || 'document');
  saveAs(blob, `${baseName}.docx`);
}

/**
 * Export data as styled PDF document (.pdf)
 */
export async function exportToPdf<T = any>(options: ExportOptions<T>): Promise<void> {
  const { filename, title, subtitle, schoolName, columns, data, orientation } = options;

  // Auto-detect orientation: landscape if more than 6 columns, or if explicitly requested
  const pageOrientation = orientation || (columns.length > 6 ? 'landscape' : 'portrait');
  const doc = new jsPDF({
    orientation: pageOrientation,
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();

  // Header
  let currentY = 16;
  if (schoolName) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.setTextColor(30, 58, 138); // blue-900
    doc.text(schoolName.toUpperCase(), pageWidth / 2, currentY, { align: 'center' });
    currentY += 7;
  }

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(15, 23, 42); // slate-900
  doc.text(title, pageWidth / 2, currentY, { align: 'center' });
  currentY += 6;

  if (subtitle) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(71, 85, 105);
    doc.text(subtitle, pageWidth / 2, currentY, { align: 'center' });
    currentY += 5;
  }

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text(`Generated: ${new Date().toLocaleString()}   |   Total Records: ${data.length}`, pageWidth / 2, currentY, { align: 'center' });
  currentY += 8;

  // Build Table
  const head = [columns.map(c => c.header)];
  const body = data.map((row, rIdx) => columns.map(c => getCellValue(c, row, rIdx)));

  autoTable(doc, {
    head,
    body,
    startY: currentY,
    theme: 'grid',
    styles: {
      fontSize: 8,
      cellPadding: 2.5,
      textColor: [51, 65, 85],
      lineColor: [226, 232, 240],
      lineWidth: 0.2,
      overflow: 'linebreak',
    },
    headStyles: {
      fillColor: [37, 99, 235], // Primary blue #2563eb
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 8.5,
      halign: 'left',
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252], // slate-50
    },
    margin: { top: 15, left: 12, right: 12, bottom: 15 },
    didDrawPage: (hookData) => {
      // Page numbering footer
      const pageCount = (doc.internal as any).getNumberOfPages ? (doc.internal as any).getNumberOfPages() : 1;
      const str = `Page ${hookData.pageNumber} of ${pageCount}`;
      doc.setFontSize(7.5);
      doc.setTextColor(148, 163, 184);
      doc.text(
        str,
        pageWidth / 2,
        doc.internal.pageSize.getHeight() - 8,
        { align: 'center' }
      );
      doc.text(
        'Acadex Enterprise Management System - Confidential',
        12,
        doc.internal.pageSize.getHeight() - 8
      );
    },
  });

  const baseName = sanitizeFilename(filename || title || 'export');
  doc.save(`${baseName}.pdf`);
}

/**
 * Unified export dispatcher for all 3 formats
 */
export async function exportData<T = any>(
  format: 'excel' | 'word' | 'pdf',
  options: ExportOptions<T>
): Promise<void> {
  if (format === 'excel') {
    return exportToExcel(options);
  } else if (format === 'word') {
    return exportToWord(options);
  } else if (format === 'pdf') {
    return exportToPdf(options);
  }
}
