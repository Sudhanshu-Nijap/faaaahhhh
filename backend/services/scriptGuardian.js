/**
 * ScriptGuardian - Intelligent JavaScript Static Analysis Engine
 * Detects malicious patterns, obfuscation, and data exfiltration in JS source code.
 */
class ScriptGuardian {
    constructor() {
        this.dangerTokens = [
            { id: 'DYNAMIC_EXEC', pattern: /eval\s*\(/g, severity: 'Critical', label: 'Dynamic Execution (eval)' },
            { id: 'DYNAMIC_EXEC', pattern: /new\s+Function\s*\(/g, severity: 'Critical', label: 'Dynamic Function Constructor' },
            { id: 'BASE64_EXEC', pattern: /atob\s*\(/g, severity: 'High', label: 'Base64 Decoding (Potential Payload)' },
            { id: 'COOKIE_THEFT', pattern: /document\.cookie/g, severity: 'High', label: 'Session Access' },
            { id: 'HTTP_LEAK', pattern: /fetch\s*\(|XMLHttpRequest|navigator\.sendBeacon/g, severity: 'Low', label: 'Network Request' },
            { id: 'REDIRECTION', pattern: /window\.location\.href\s*=|location\.assign/g, severity: 'Medium', label: 'Automatic Redirection' }
        ];
    }

    /**
     * analyze(code, filename) - Heuristic analyzer for JavaScript content
     */
    analyze(code, filename = 'script.js') {
        if (!code || typeof code !== 'string') return { isMalicious: false, findings: [] };

        const findings = [];
        let totalRisk = 0;

        // 1. Token Match & Contextual Correlation
        const detectedTokens = this.dangerTokens.map(dt => {
            const matches = code.match(dt.pattern);
            return matches ? { ...dt, count: matches.length } : null;
        }).filter(Boolean);

        // Detect Data Exfiltration (Cookie Access + Network Request)
        const hasCookie = detectedTokens.some(t => t.id === 'COOKIE_THEFT');
        const hasNetwork = detectedTokens.some(t => t.id === 'HTTP_LEAK');
        
        if (hasCookie && hasNetwork) {
            findings.push({
                type: 'Malicious Pattern: Data Exfiltration',
                severity: 'Critical',
                evidence: 'Code contains both cookie access and network transfer logic.',
                impact: 'May be harvesting session tokens and sending them to an external server.'
            });
            totalRisk += 80;
        }

        // 2. Obfuscation Detection (Heuristic)
        const entropy = this.calculateEntropy(code);
        if (entropy > 5.5 && code.length > 500) {
            findings.push({
                type: 'Suspicious Obfuscation',
                severity: 'High',
                evidence: `High character entropy detected (${entropy.toFixed(2)}).`,
                impact: 'Code is likely packed or obfuscated to hide its true purpose.'
            });
            totalRisk += 50;
        }

        // 3. Direct Dangerous Token Warnings
        detectedTokens.forEach(token => {
            if (token.severity === 'Critical') {
                findings.push({
                    type: token.label,
                    severity: 'Critical',
                    evidence: `Detected ${token.count} instance(s) of dangerous execution logic.`,
                    impact: 'Allows remote code execution or script hijacking.'
                });
                totalRisk += 40;
            }
        });

        // Add detected tokens to metadata for UI
        const isMalicious = totalRisk >= 60 || findings.some(f => f.severity === 'Critical');

        return {
            isMalicious,
            riskScore: Math.min(totalRisk, 100),
            findings: findings.slice(0, 5), // Limit to top 5 findings
            filename
        };
    }

    /**
     * calculateEntropy - Estimates character distribution randomness
     */
    calculateEntropy(str) {
        if (!str) return 0;
        const frequencies = {};
        for (let char of str) {
            frequencies[char] = (frequencies[char] || 0) + 1;
        }
        let entropy = 0;
        const len = str.length;
        for (let char in frequencies) {
            const p = frequencies[char] / len;
            entropy -= p * Math.log2(p);
        }
        return entropy;
    }
}

module.exports = new ScriptGuardian();
