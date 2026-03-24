const axios = require('axios');
const ScanReport = require('../models/ScanReport');

/**
 * securityScanner - HTTP Security Header Audit
 *
 * Checks for missing critical security headers and insecure transmission.
 * Uses axios for a lightweight, dependency-free approach (no browser needed).
 */
const testSecurity = async (reportId, url) => {
    try {
        console.log(`[Security]: Auditing security headers for ${url}`);

        let headers = {};
        try {
            const res = await axios.get(url, {
                timeout: 15000,
                maxRedirects: 5,
                validateStatus: () => true,
                headers: { 'User-Agent': 'Sentinel-QA-Bot/1.0' }
            });
            headers = res.headers || {};
        } catch (e) {
            console.warn(`[Security]: Could not fetch headers for ${url}: ${e.message}`);
            return;
        }

        const securityIssues = [];

        // 1. Missing HSTS
        if (!headers['strict-transport-security']) {
            securityIssues.push({
                page: url, issue: 'Missing HSTS Header',
                severity: 'high', element: 'HTTP Headers',
                recommendation: 'Add "Strict-Transport-Security: max-age=31536000; includeSubDomains" to enforce HTTPS.'
            });
        }

        // 2. Missing CSP
        if (!headers['content-security-policy']) {
            securityIssues.push({
                page: url, issue: 'Missing Content-Security-Policy',
                severity: 'high', element: 'HTTP Headers',
                recommendation: 'Add a Content-Security-Policy header to prevent XSS and injection attacks.'
            });
        }

        // 3. Missing X-Frame-Options (Clickjacking)
        if (!headers['x-frame-options'] && !headers['content-security-policy']?.includes('frame-ancestors')) {
            securityIssues.push({
                page: url, issue: 'Missing X-Frame-Options (Clickjacking Risk)',
                severity: 'medium', element: 'HTTP Headers',
                recommendation: 'Add "X-Frame-Options: DENY" or use CSP frame-ancestors directive.'
            });
        }

        // 4. Missing X-Content-Type-Options (MIME sniffing)
        if (!headers['x-content-type-options']) {
            securityIssues.push({
                page: url, issue: 'Missing X-Content-Type-Options',
                severity: 'medium', element: 'HTTP Headers',
                recommendation: 'Add "X-Content-Type-Options: nosniff" to prevent MIME-type sniffing attacks.'
            });
        }

        // 5. Missing Referrer-Policy
        if (!headers['referrer-policy']) {
            securityIssues.push({
                page: url, issue: 'Missing Referrer-Policy',
                severity: 'low', element: 'HTTP Headers',
                recommendation: 'Add "Referrer-Policy: strict-origin-when-cross-origin" to control referrer information.'
            });
        }

        // 6. HTTP instead of HTTPS
        if (url.startsWith('http://')) {
            securityIssues.push({
                page: url, issue: 'Insecure HTTP Transmission',
                severity: 'critical', element: 'URL Scheme',
                recommendation: 'Enforce HTTPS globally. Redirect all HTTP traffic to HTTPS.'
            });
        }

        if (securityIssues.length > 0) {
            await ScanReport.findByIdAndUpdate(reportId, {
                $push: { accessibilityIssues: { $each: securityIssues } }
            });
            console.log(`[Security]: Found ${securityIssues.length} security header issues.`);
        } else {
            console.log(`[Security]: All critical security headers present.`);
        }

    } catch (error) {
        console.error(`[Security Error] ${url}: ${error.message}`);
    }
};

module.exports = { testSecurity };
