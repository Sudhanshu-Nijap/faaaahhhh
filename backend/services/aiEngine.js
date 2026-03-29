const Groq = require('groq-sdk');

/**
 * AI Engine - Layer 2: Mimov2 Pro (using Groq for high-performance patching)
 * Generates line-level patches for code segments based on neural diagnostics.
 */
async function generateAiPatches(fileName, codeContent) {
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
         console.warn('[AiEngine]: Groq SDK not initialized. API Key missing.');
         return { success: false, fallback_required: true };
    }

    const groq = new Groq({ apiKey });

    const systemPrompt = `
    You are a senior full-stack engineer and AI systems architect.
    Your task is to generate SAFE, MINIMAL, line-level patches for the provided code.
    RULES:
    1. NEVER rewrite the entire file.
    2. Identify bugs, syntax errors, or structural anti-patterns.
    3. Return STRICT JSON only.
    4. Each patch must contain 'line' (1-indexed), 'old' (exact matching line), 
       'new' (the replacement with inline comment), and 'reason'.
    5. Be succinct. Use short comments after the code like // fixed typo or // added check.
    `;

    const userPrompt = `
    FILE: ${fileName}
    CONTENT:
    ${codeContent}

    RESPOND ONLY in JSON format:
    {
       "success": true,
       "fallback_required": false,
       "confidence": "95%",
       "patches": [
           {
               "line": 5,
               "old": "const a = b",
               "new": "const a = b || 0; // fallback initialization",
               "reason": "Avoid undefined variable reference"
           }
       ]
    }
    `;

    try {
        const completion = await groq.chat.completions.create({
            messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: userPrompt }
            ],
            // Use a faster model for IDE live experience
            model: process.env.GROQ_AI_DEBUGGER_MODEL || 'llama-3.3-70b-versatile',
            response_format: { type: "json_object" }
        });

        const refinedResponse = JSON.parse(completion.choices[0].message.content);
        return refinedResponse;

    } catch (e) {
        console.error('[AiEngine]: Neural Patch Generation Fault:', e.message);
        return { success: false, fallback_required: true };
    }
}

module.exports = { generateAiPatches };
