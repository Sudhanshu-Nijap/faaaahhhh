const { Groq } = require('groq-sdk');
const fs = require('fs');
const path = require('path');

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

        // --- LAYER 0: Knowledge Base (Type A+ - Advanced RAG / Pure Deterministic) ---
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
                const fixList = Array.isArray(entry.fix) ? entry.fix.map(f => `- ${f}`).join('\n') : entry.fix;
                return `### Genuine Fix: ${entry.issue}\n\n**Reason:** ${entry.reason}\n\n**Recommendation:**\n${fixList}\n\n**Remediation Code:**\n\`\`\`javascript\n${entry.remediationCode}\n\`\`\``;
            }
        }

        // --- LAYER 1: Rule Engine (Type A - Deterministic Counts) ---
        if (msg.includes("how many") || msg.includes("count") || msg.includes("list all")) {
            if (msg.includes("broken link") || msg.includes("dead link")) return `There are exactly **${reportData.brokenLinks?.length || 0}** broken links in this scan.`;
            if (msg.includes("security issue") || msg.includes("vulnerability")) return `There are **${reportData.securityIssues?.length || 0}** security vulnerabilities detected.`;
            if (msg.includes("accessibility")) return `I found **${reportData.accessibilityIssues?.length || 0}** accessibility violations.`;
            if (msg.includes("ui") || msg.includes("ux")) return `The UI analysis detected **${(reportData.uiIssues?.length || 0) + (reportData.responsiveIssues?.length || 0)}** design inconsistencies.`;
        }

        // --- LAYER 2: Filter Layer (Type B/C - Grounded RAG Extraction) ---
        const context = { url: reportData.url };
        
        // 1. Surgical RAG: Extract issues exactly mentioned in chat
        const allIssues = [
            ...(reportData.securityIssues || []),
            ...(reportData.accessibilityIssues || []),
            ...(reportData.uiIssues || []),
            ...(reportData.brokenLinks || []),
            ...(reportData.consoleErrors || [])
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
1. You have been provided with SURGICAL CONTEXT from a real scan of: ${reportData.url}
2. ONLY answer using the provided context. If the data is not in the context, state "Data not found in the current audit."
3. If an issue is mentioned in "specifically_mentioned_in_scan", prioritize those details.
4. Provide production-ready, high-accuracy remediation code (Node.js, React, or CSS).
5. Format your output with clear Markdown headers.

CONTEXT (Surgical Scan Data):
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
