"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateAcademicReportPDF = generateAcademicReportPDF;
const pdfkit_1 = __importDefault(require("pdfkit"));
async function generateAcademicReportPDF(data, res) {
    const doc = new pdfkit_1.default({ margin: 50, size: 'A4' });
    const isMedical = data.school.type?.toLowerCase().includes('nursing') ||
        data.school.type?.toLowerCase().includes('medical');
    const primaryColor = data.school.branding?.primaryColor || '#3182ce';
    const secondaryColor = '#4a5568';
    // Set response headers
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=Report_${data.student.studentId}_${data.term}.pdf`);
    doc.pipe(res);
    // --- Header ---
    // If logo exists, we would draw it here. For now, a placeholder header.
    doc.rect(0, 0, doc.page.width, 100).fill(primaryColor);
    doc.fillColor('#ffffff')
        .fontSize(24)
        .font('Helvetica-Bold')
        .text(data.school.name.toUpperCase(), 50, 30);
    doc.fontSize(10)
        .font('Helvetica')
        .text(data.school.address || 'Academic Excellence Registry', 50, 60);
    doc.fontSize(16)
        .font('Helvetica-Bold')
        .text(isMedical ? 'COMPETENCY ASSESSMENT REPORT' : 'OFFICIAL ACADEMIC REPORT', 50, 120, { align: 'center' });
    doc.moveDown(2);
    // --- Student Info Grid ---
    const startY = 160;
    doc.fillColor(secondaryColor).fontSize(10).font('Helvetica-Bold').text('STUDENT INFORMATION', 50, startY);
    doc.rect(50, startY + 15, 500, 1).fill('#e2e8f0');
    const gridY = startY + 30;
    doc.fillColor('#000000').font('Helvetica-Bold').text('Name:', 50, gridY);
    doc.font('Helvetica').text(data.student.name, 120, gridY);
    doc.font('Helvetica-Bold').text(isMedical ? 'Cohort:' : 'Class:', 300, gridY);
    doc.font('Helvetica').text(data.student.class?.name || 'N/A', 380, gridY);
    doc.font('Helvetica-Bold').text('ID:', 50, gridY + 20);
    doc.font('Helvetica').text(data.student.studentId, 120, gridY + 20);
    doc.font('Helvetica-Bold').text('Academic Period:', 300, gridY + 20);
    doc.font('Helvetica').text(`${data.term} ${data.year}`, 400, gridY + 20);
    doc.moveDown(4);
    // --- Grades Table ---
    const tableTop = 260;
    doc.fillColor(primaryColor).font('Helvetica-Bold').fontSize(12).text(isMedical ? 'MODULE PERFORMANCE' : 'SUBJECT PERFORMANCE', 50, tableTop);
    // Table Header
    const headerY = tableTop + 25;
    doc.rect(50, headerY, 500, 20).fill(primaryColor);
    doc.fillColor('#ffffff').fontSize(10);
    doc.text(isMedical ? 'Module Name' : 'Subject Name', 60, headerY + 5);
    doc.text('Score', 300, headerY + 5);
    doc.text(isMedical ? 'Competency' : 'Grade', 380, headerY + 5);
    doc.text('Performance', 460, headerY + 5);
    let currentY = headerY + 20;
    data.grades.forEach((g, index) => {
        // Zebra striping
        if (index % 2 === 1) {
            doc.rect(50, currentY, 500, 20).fill('#f7fafc');
        }
        doc.fillColor('#000000').font('Helvetica');
        doc.text(g.subject.name, 60, currentY + 5);
        doc.text(`${g.score}%`, 300, currentY + 5);
        doc.font('Helvetica-Bold').text(g.grade, 380, currentY + 5);
        const status = g.score >= 80 ? 'EXCELLENT' : g.score >= 60 ? 'GOOD' : 'ACHIEVED';
        doc.fontSize(8).text(status, 460, currentY + 5, { width: 80 });
        doc.fontSize(10);
        currentY += 20;
    });
    // --- Attendance & Summary ---
    doc.moveDown(4);
    const summaryY = doc.y;
    doc.fillColor(primaryColor).font('Helvetica-Bold').fontSize(12).text('ATTENDANCE RECORD', 50, summaryY);
    doc.fillColor('#000000').font('Helvetica').fontSize(10).text(`Total Sessions: ${data.attendance.present + data.attendance.absent}`, 50, summaryY + 20);
    doc.text(`Presence Rate: ${data.attendance.rate}%`, 50, summaryY + 35);
    // --- Comments ---
    doc.moveDown(3);
    doc.fillColor(primaryColor).font('Helvetica-Bold').fontSize(12).text('GENERAL COMMENTS', 50);
    doc.rect(50, doc.y + 5, 500, 60).stroke('#e2e8f0');
    doc.fillColor('#4a5568').font('Helvetica-Oblique').fontSize(9).text(isMedical
        ? "Trainee has demonstrated satisfactory clinical proficiency and professional conduct during this rotation period. Theoretical knowledge is well-applied in practical modules."
        : "The student has shown steady progress this term. Continued focus on core subjects will ensure excellent results in final examinations.", 60, doc.y + 15, { width: 480 });
    // --- Footer / Signatures ---
    const footerY = doc.page.height - 100;
    doc.rect(50, footerY, 150, 1).fill('#cbd5e0');
    doc.rect(350, footerY, 150, 1).fill('#cbd5e0');
    doc.fillColor('#000000').font('Helvetica').fontSize(9);
    doc.text('Class Teacher / Supervisor', 50, footerY + 5, { width: 150, align: 'center' });
    doc.text('Principal / Head of Institution', 350, footerY + 5, { width: 150, align: 'center' });
    doc.fontSize(8).fillColor('#a0aec0').text(`Generated by Acadex Portal on ${new Date().toLocaleDateString()} · Verification Code: ${Math.random().toString(36).substring(7).toUpperCase()}`, 0, doc.page.height - 30, { align: 'center' });
    doc.end();
}
//# sourceMappingURL=pdf-generator.js.map