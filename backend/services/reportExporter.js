const ScanReport = require('../models/ScanReport');
const { jsPDF } = require("jspdf");
const fs = require('fs');
const path = require('path');

/**
 * generatePDF
 * Generates a professional PDF version of the QA report.
 */
const generatePDF = async (reportId) => {
    const report = await ScanReport.findById(reportId);
    if (!report) return null;

    const doc = new jsPDF();
    const margin = 20;
    let y = 30;

    // Header
    doc.setFontSize(22);
    doc.setTextColor(59, 130, 246); // Primary Blue
    doc.text("AUTONOMOUS QA INSPECTION REPORT", margin, y);
    
    y += 10;
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`Generated: ${new Date().toLocaleString()}`, margin, y);
    doc.text(`Target URL: ${report.url}`, margin, y + 5);
    
    y += 20;
    doc.setFontSize(14);
    doc.setTextColor(0);
    doc.text("EXECUTIVE SUMMARY", margin, y);
    y += 10;
    doc.setFontSize(10);
    doc.text(`Status: ${report.status.toUpperCase()}`, margin, y);
    doc.text(`Pages Crawled: ${report.pagesCrawled}`, margin, y + 5);
    doc.text(`Total Issues Detected: ${report.brokenLinks.length + report.consoleErrors.length + report.uiIssues.length}`, margin, y + 10);

    y += 25;
    doc.setFontSize(14);
    doc.text("DETECTED ANOMALIES", margin, y);
    y += 10;

    const addIssues = (title, items, key) => {
        if (items.length === 0) return;
        doc.setFontSize(12);
        doc.setTextColor(220, 38, 38); // Critical Red
        doc.text(`${title} (${items.length})`, margin, y);
        y += 7;
        doc.setFontSize(9);
        doc.setTextColor(50);
        items.slice(0, 5).forEach(item => {
            const text = `- ${item.issue || item.message || 'Issue detected'}`;
            doc.text(doc.splitTextToSize(text, 170), margin + 5, y);
            y += 10;
            if (y > 270) { doc.addPage(); y = 20; }
        });
        y += 5;
    };

    addIssues("BROKEN LINKS", report.brokenLinks);
    addIssues("CONSOLE ERRORS", report.consoleErrors);
    addIssues("UI/LAYOUT ISSUES", report.uiIssues);

    const pdfPath = path.join(__dirname, `../reports/report-${reportId}.pdf`);
    const pdfDir = path.dirname(pdfPath);
    if (!fs.existsSync(pdfDir)) fs.mkdirSync(pdfDir, { recursive: true });

    doc.save(pdfPath);
    return `/reports/report-${reportId}.pdf`;
};

module.exports = { generatePDF };
