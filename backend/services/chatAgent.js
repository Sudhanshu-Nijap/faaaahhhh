const { Groq } = require('groq-sdk');
const fs = require('fs');
const path = require('path');
const linkGuardian = require('./linkGuardian');

class ChatAgent {
    constructor() {
        this.client = new Groq({
            apiKey: process.env.GROQ_API_KEY || process.env.GROQ_CHAT_API_KEY
        });
        
        // Load knowledge base
        try {
            const kbPath = path.join(__dirname, '../data/knowledgeBase.json');
            this.knowledgeBase = JSON.parse(fs.readFileSync(kbPath, 'utf8'));
        } catch (e) {
            console.error('KB Load Error:', e);
            this.knowledgeBase = [];
        }

        this.distilledPath = path.join(__dirname, '../data/aiDistilledFixes.json');
    }

    /**
     * analyzeReportQuestion - The 4-Layer Hybrid RAG Engine
     * Signature matched to chatRoutes.js: (history, reportData)
     */
    async analyzeReportQuestion(history, reportData) {
        if (!reportData) return "Neural link lost. Report context missing.";
        
        // Extract the latest user message
        const lastUserMsg = history.filter(h => h.role === 'user').pop();
        if (!lastUserMsg) return "Neural sync required. Please state your query.";
        
        const message = lastUserMsg.content;
        const msg = message.toLowerCase();

        // --- LAYER 0: Rule Engine (Type A - Deterministic Counts) ---
        if (msg.includes("how many") || msg.includes("count") || msg.includes("total") || msg.includes("list all") || msg.includes("stat")) {
            // Handle "total" or "all" keyword for a comprehensive summary
            if (msg.includes("total") || msg.includes("all") || msg.includes("summary")) {
                const broken = reportData.brokenLinks?.length || 0;
                const security = reportData.securityIssues?.length || 0;
                const a11y = reportData.accessibilityIssues?.length || 0;
                const ui = (reportData.uiIssues?.length || 0) + (reportData.responsiveIssues?.length || 0);
                const network = reportData.networkLogs?.length || 0;
                const console = reportData.consoleErrors?.length || 0;
                const total = broken + security + a11y + ui + network + console;

                return `The system detected **${total}** total anomalies across the topology:\n- **${broken}** Broken Link(s)\n- **${console}** Console Error(s)\n- **${a11y}** Accessibility Violation(s)\n- **${ui}** UI/Layout Inconsistencies\n- **${network}** Network Failure(s)\n- **${security}** Security Risk(s)`;
            }

            if (msg.includes("broken link") || msg.includes("dead link") || msg.includes("404")) 
                return `There are exactly **${reportData.brokenLinks?.length || 0}** broken links in this scan.`;
            
            if (msg.includes("security") || msg.includes("vulnerability") || msg.includes("threat") || msg.includes("risk")) 
                return `There are **${reportData.securityIssues?.length || 0}** security vulnerabilities detected.`;
            
            if (msg.includes("accessibility") || msg.includes("a11y") || msg.includes("compliance")) 
                return `I found **${reportData.accessibilityIssues?.length || 0}** accessibility violations.`;
            
            if (msg.includes("ui") || msg.includes("ux") || msg.includes("layout") || msg.includes("design")) 
                return `The UI analysis detected **${(reportData.uiIssues?.length || 0) + (reportData.responsiveIssues?.length || 0)}** design inconsistencies.`;
            
            if (msg.includes("network") || msg.includes("api") || msg.includes("http") || msg.includes("request")) 
                return `There are **${reportData.networkLogs?.length || 0}** network failures captured in this audit.`;
            
            if (msg.includes("console") || msg.includes("js error") || (msg.includes("error") && !msg.includes("link") && !msg.includes("a11y"))) 
                return `I detected **${reportData.consoleErrors?.length || 0}** active console errors in this scan.`;
        }

        // --- LAYER 1: Knowledge Base (Type A+ - Advanced RAG / Pure Deterministic) ---
        if (Array.isArray(this.knowledgeBase)) {
            // Fuzzy/Scored Match logic
            const matches = this.knowledgeBase.map(kb => {
                let score = 0;
                const issueName = kb.issue?.toLowerCase() || "";
                if (msg.includes(issueName)) score += 50; 
                // Contextual matching
                if (msg.split(' ').some(word => word.length > 3 && issueName.includes(word))) score += 10;
                return { kb, score };
            }).filter(m => m.score > 0).sort((a, b) => b.score - a.score);

            const entry = matches[0]?.kb;
            
            // If we have a high-confidence match (score >= 50) or they asked for a fix
            if (entry && (msg.includes("fix") || msg.includes("how") || msg.includes("help") || matches[0].score >= 50)) {
                // If the user is asking for a count and a fix, the count already matched Layer 0.
                // If they just asked for a fix, this matches.
                const fixList = Array.isArray(entry.fix) ? entry.fix.map(f => `- ${f}`).join('\n') : entry.fix;
                return `### Genuine Fix: ${entry.issue}\n\n**Reason:** ${entry.reason}\n\n**Recommendation:**\n${fixList}\n\n**Remediation Code:**\n\`\`\`javascript\n${entry.remediationCode}\n\`\`\``;
            }
        }

        // --- LAYER 2: Filter Layer (URL Safety & Grounded RAG Extraction) ---
        const context = { url: reportData.url };
        
        // --- NEW: Malicious Link Detection ---
        const urlMatch = message.match(/https?:\/\/[^\s]+/g);
        if (urlMatch) {
            const securityResults = urlMatch.map(u => linkGuardian.analyze(u)).filter(r => r.isMalicious);
            if (securityResults.length > 0) {
                context.malicious_links_detected_in_query = securityResults.map(r => ({
                    url: r.url,
                    threat: r.threatType,
                    risk: `${r.riskScore}%`,
                    reason: r.reason
                }));
            }
        }
        
        // 1. Surgical RAG: Extract issues exactly mentioned in chat
        const allIssues = [
            ...(reportData.securityIssues || []),
            ...(reportData.accessibilityIssues || []),
            ...(reportData.uiIssues || []),
            ...(reportData.responsiveIssues || []),
            ...(reportData.brokenLinks || []),
            ...(reportData.consoleErrors || []),
            ...(reportData.formIssues || [])
        ];

        const mentionedIssues = allIssues.filter(i => {
           const title = (i.issue || i.message || i.link || "").toLowerCase();
           return title && msg.includes(title);
        }).slice(0, 8);

        if (mentionedIssues.length > 0) context.specifically_mentioned_in_scan = mentionedIssues;

        // 2. Topic-based RAG filters
        if (msg.includes("security")) context.security_findings = (reportData.securityIssues || []).slice(0, 10);
        if (msg.includes("accessibility")) context.accessibility_findings = (reportData.accessibilityIssues || []).slice(0, 10);
        if (msg.includes("ui") || msg.includes("ux")) context.ui_findings = (reportData.uiIssues || []).slice(0, 10);
        if (msg.includes("link") || msg.includes("broken")) context.broken_links = (reportData.brokenLinks || []).slice(0, 10);
        if (msg.includes("console") || msg.includes("error")) context.console_errors = (reportData.consoleErrors || []).slice(0, 10);

        // --- LAYER 3: Grounded Groq Intelligence (The RAG Reasoning Engine) ---
        const systemPrompt = `You are the Sentinel AI Advanced Diagnostic Engine.
        
STRATEGY: RAG (Retrieval Augmented Generation)
1. You have been provided with SURGICAL CONTEXT from an industry-grade audit of: ${reportData.url}
2. ONLY answer using the provided context. If information is missing, state "The diagnostic telemetry for this query is missing from the current audit."
3. FOR EVERY ISSUE MENTIONED, YOU MUST PROVIDE:
   - **Root Cause**: What exactly is broken in the code/DOM.
   - **The Fix**: High-fidelity, production-ready code snippets (React, CSS, or Node.js).
   - **Impact**: Why fixing this improves the platform (SEO/UX/Performance).
4. Use professional, industrial terminology and format with clear Markdown headers.
 
CONTEXT (Live Scan Telemetry):
${JSON.stringify(context, null, 2)}`;

        try {
            const chatCompletion = await this.client.chat.completions.create({
                messages: [
                    { role: 'system', content: systemPrompt },
                    ...history.map(h => ({ role: h.role === 'user' ? 'user' : 'assistant', content: h.content })),
                    { role: 'user', content: message }
                ],
                model: process.env.GROQ_CHAT_MODEL || 'llama-3.1-8b-instant',
                temperature: 0.1, // Near-deterministic for RAG accuracy
                max_tokens: 1500
            });

            const reply = chatCompletion.choices[0].message.content;
            
            // Background: Check for fix distillation
            if (reply.includes("```") && reply.toLowerCase().includes("fix")) {
                this.distillFix(message, reply);
            }

            return reply;
        } catch (error) {
            console.error('Groq RAG Error:', error);
            return "### Neural Link Interrupted\nThe RAG diagnostics engine is currently re-calibrating. Please try again in a few seconds.";
        }
    }

    /**
     * distillFix - Background mechanism to save AI-generated fixes for future promotion
     */
    async distillFix(query, reply) {
        try {
            let distilled = [];
            if (fs.existsSync(this.distilledPath)) {
                distilled = JSON.parse(fs.readFileSync(this.distilledPath, 'utf8') || "[]");
            }
            distilled.push({
                query,
                fixSummary: reply.substring(0, 500),
                timestamp: new Date().toISOString(),
                status: 'pending-review'
            });
            fs.writeFileSync(this.distilledPath, JSON.stringify(distilled.slice(-50), null, 2));
        } catch (e) {
            // Background error
        }
    }
}

module.exports = new ChatAgent();
