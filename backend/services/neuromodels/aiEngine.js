const axios = require('axios');

const aiFixCode = async (code) => {
    try {
        if (code.length > 25000) return { success: false, fallback_required: true, patches: [] };

        const groqKey = process.env.GROQ_API_KEY;
        const model = process.env.GROQ_CHAT_MODEL || 'llama-3.1-8b-instant';

        const body = {
            model: model,
            messages: [
                {
                    role: "system",
                    content: 'You are a senior developer. Generate safe, minimal patches. Return strictly JSON: {"success": boolean, "fallback_required": boolean, "confidence": "0-100%", "patches": [{"line": number, "old": "original line", "new": "fixed line", "reason": "why"}]}'
                },
                { role: "user", content: `Analyze and fix code:\n\n${code}` }
            ],
            response_format: { type: "json_object" }
        };

        const res = await axios.post('https://api.groq.com/openai/v1/chat/completions', body, {
            headers: { 'Authorization': `Bearer ${groqKey}`, 'Content-Type': 'application/json' }
        });

        return JSON.parse(res.data.choices[0].message.content);
    } catch (e) {
        console.error('[Neuromodels]: AI Layer 2 Error:', e.message);
        return { success: false, fallback_required: true, patches: [] };
    }
};

module.exports = { aiFixCode };
