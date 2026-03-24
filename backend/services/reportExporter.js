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
    
    const totalIssues = (report.brokenLinks?.length || 0) + 
                        (report.consoleErrors?.length || 0) + 
                        (report.uiIssues?.length || 0) + 
                        (report.formIssues?.length || 0) + 
                        (report.networkLogs?.length || 0) + 
                        (report.accessibilityIssues?.length || 0) + 
                        (report.responsiveIssues?.length || 0);
    
    doc.text(`Total Issues Detected: ${totalIssues}`, margin, y + 10);

    // AI Narrative Summary (The "Expert Summary")
    if (report.aiInsights && report.aiInsights.summary) {
        doc.addPage();
        y = 30;
        doc.setFontSize(16);
        doc.setTextColor(59, 130, 246);
        doc.text("NEURAL AUDIT SUMMARY", margin, y);
        y += 12;

        doc.setFontSize(10);
        doc.setTextColor(60);
        doc.setFont("helvetica", "italic");
        const splitSummary = doc.splitTextToSize(report.aiInsights.summary, 170);
        doc.text(splitSummary, margin, y);
        doc.setFont("helvetica", "normal");
        y += (splitSummary.length * 5) + 10;
    }

    // AI Insights & Remediation (High-Level Issues)
    if (report.aiInsights && report.aiInsights.issues?.length > 0) {
        doc.addPage();
        y = 30;
        doc.setFontSize(16);
        doc.setTextColor(59, 130, 246);
        doc.text("AI-DRIVEN CRITICAL AUDIT & REMEDIATION", margin, y);
        y += 15;

        report.aiInsights.issues.forEach((issue, idx) => {
            doc.setFontSize(12);
            doc.setTextColor(220, 38, 38);
            doc.text(`${idx + 1}. ${issue.title.toUpperCase()}`, margin, y);
            y += 7;

            doc.setFontSize(9);
            doc.setTextColor(80);
            
            const addDetail = (label, value) => {
                if (!value) return;
                doc.setFont("helvetica", "bold");
                doc.text(`${label}:`, margin + 5, y);
                doc.setFont("helvetica", "normal");
                const splitValue = doc.splitTextToSize(value, 160);
                doc.text(splitValue, margin + 25, y);
                y += (splitValue.length * 5) + 3;
            };

            addDetail("Risk", issue.severity);
            addDetail("Summary", issue.whatThisMeans);
            addDetail("Impact", issue.whyItMatters);
            
            if (issue.howToFix) {
                doc.setTextColor(16, 185, 129); // Success Green
                if (issue.howToFix.beginner) addDetail("Fix (General)", issue.howToFix.beginner);
                if (issue.howToFix.developer) addDetail("Fix (Dev)", issue.howToFix.developer);
            }
            
            doc.setTextColor(80);
            y += 5;

            if (y > 250) {
                doc.addPage();
                y = 20;
            }
        });
    }

    doc.addPage();
    y = 30;
    doc.setFontSize(14);
    doc.setTextColor(0);
    doc.text("TECHNICAL ANOMALY LOG & TECHNICAL FIXES", margin, y);
    y += 10;

    const addIssues = (title, items) => {
        if (!items || items.length === 0) return;
        doc.setFontSize(12);
        doc.setTextColor(50);
        doc.text(`${title} (${items.length})`, margin, y);
        y += 7;
        doc.setFontSize(8);
        doc.setTextColor(100);
        
        items.slice(0, 50).forEach(item => { // Limit to 50 items
            const mainText = `- ${item.issue || item.message || item.url || 'Anomaly detected'}`;
            const recText = item.recommendation ? `  [REMEDIATION: ${item.recommendation}]` : '';
            const fullText = mainText + (recText ? `\n${recText}` : '');
            
            const splitText = doc.splitTextToSize(fullText, 170);
            doc.text(splitText, margin + 5, y);
            y += (splitText.length * 4) + 2; 
            
            if (y > 270) { 
                doc.addPage(); 
                y = 20; 
            }
        });
        y += 5;
    };

    addIssues("BROKEN LINKS", report.brokenLinks);
    addIssues("CONSOLE ERRORS", report.consoleErrors);
    addIssues("FORM & INPUT ISSUES", report.formIssues);
    addIssues("UI & FLOW ISSUES", report.uiIssues);
    addIssues("NETWORK & API FAILURES", report.networkLogs);
    addIssues("ACCESSIBILITY ISSUES", report.accessibilityIssues);
    addIssues("RESPONSIVE ISSUES", report.responsiveIssues);

    const pdfPath = path.join(__dirname, `../reports/report-${reportId}.pdf`);
    const pdfDir = path.dirname(pdfPath);
    if (!fs.existsSync(pdfDir)) fs.mkdirSync(pdfDir, { recursive: true });

    doc.save(pdfPath);
    return `/reports/report-${reportId}.pdf`;
};

module.exports = { generatePDF };
