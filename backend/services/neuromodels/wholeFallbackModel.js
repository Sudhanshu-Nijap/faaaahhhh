const axios = require('axios');
const Diff = require('diff');

/**
 * generateWholeFallback - Heavy AI Engine (Llama 3.3 70B)
 * Uses comprehensive analysis to rewrite entire files.
 */
const generateWholeFallback = async (filePath, code) => {
    try {
        console.log(`[WholeFallback] Neural Logic Overhaul for ${filePath}...`);

        const groqKey = process.env.GROQ_QA_API_KEY || process.env.GROQ_API_KEY;
        const model = process.env.GROQ_QA_MODEL || 'llama-3.3-70b-versatile';

        if (!groqKey) throw new Error('Groq Key missing');

        const body = {
            model: model,
            messages: [
                {
                    role: "system",
                    content: `You are an Expert Software Architect and Security Auditor.
Your task is to analyze the provided code for architectural flaws, security vulnerabilities, and logic bugs.
Then, you must rewrite the code to fix all identified issues while maintaining the original functionality.

Return ONLY a valid JSON object with the following structure:
{
  "analysis": "Brief step-by-step analysis of issues found",
  "fixedCode": "Full body of the fixed code"
}
Ensure the "fixedCode" is NOT wrapped in markdown. It should be a raw string.`
                },
                { role: "user", content: `Analyze and fix: ${filePath}\n\n${code}` }
            ],
            temperature: 0,
            max_tokens: 8192,
            response_format: { type: "json_object" }

        };

        const res = await axios.post('https://api.groq.com/openai/v1/chat/completions', body, {
            headers: { 'Authorization': `Bearer ${groqKey}`, 'Content-Type': 'application/json' }
        });

        const data = JSON.parse(res.data.choices[0].message.content);
        let fixedCode = data.fixedCode;

        // Final safety check/strip in case model still included markdown
        if (fixedCode.includes('```')) {
            fixedCode = fixedCode.replace(/^```[a-z]*\n/i, '').replace(/\n```$/, '');
        }

        const patch = Diff.createTwoFilesPatch(`a/${filePath}`, `b/${filePath}`, code, fixedCode);

        return { 
            success: true, 
            patch: patch, 
            fixedCode: fixedCode,
            analysis: data.analysis 
        };
    } catch (e) {
        console.error('[Neuromodels]: Fallback Layer 3 Error:', e.message);
        return { success: false, patch: null };
    }
};

module.exports = { generateWholeFallback };

