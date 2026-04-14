const axios = require('axios');
const Groq = require('groq-sdk');

// Simple in-memory cache: Maps URL to timestamp of last check + verdict
const cache = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// Provided Google Safe Browsing API Key
const GOOGLE_SB_API_KEY = process.env.GOOGLE_SB_API_KEY || 'AIzaSyBbWmbL4QowadQXO07yZ2ODLuFADjhDXuQ';

async function analyzeURLSecurity(urlString) {
    try {
        const urlObj = new URL(urlString);
        const normalizedUrl = urlObj.origin + urlObj.pathname + urlObj.search;

        // 0. Cache Check
        if (cache.has(normalizedUrl)) {
            const cachedResult = cache.get(normalizedUrl);
            if (Date.now() - cachedResult.timestamp < CACHE_TTL) {
                return cachedResult.verdict;
            } else {
                cache.delete(normalizedUrl);
            }
        }

        // 1. Quick Validation (SSRF Protection)
        const hostname = urlObj.hostname.toLowerCase();
        if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '0.0.0.0' || hostname.startsWith('192.168.') || hostname.startsWith('10.')) {
            const blockVerdict = { blocked: true, riskLevel: 'high', reason: "Internal or unsafe URL", explanation: "Target URL resolves to a protected or private address space." };
            cache.set(normalizedUrl, { timestamp: Date.now(), verdict: blockVerdict });
            return blockVerdict;
        }

        // --- BRAND SHIELD: Typo-Squatting Detection (V2) ---
        const PREMIUM_BRANDS = ['google.com', 'paypal.com', 'microsoft.com', 'facebook.com', 'apple.com', 'amazon.com', 'github.com', 'gmail.com', 'netflix.com'];
        const subbedHostname = hostname.replace(/0/g, 'o').replace(/1/g, 'l').replace(/vv/g, 'w').replace(/rn/g, 'm').replace(/q/g, 'g').replace(/5/g, 's');
        
        if (hostname !== subbedHostname) {
            const matchesBrand = PREMIUM_BRANDS.some(brand => subbedHostname === brand || subbedHostname.endsWith('.' + brand));
            if (matchesBrand && !PREMIUM_BRANDS.includes(hostname)) {
                const blockVerdict = { 
                    blocked: true, 
                    riskLevel: 'high', 
                    reason: "Typo-squatted brand mimicry", 
                    explanation: `Suspected homoglyph attack detected (${hostname} visually mimics a high-value brand).` 
                };
                cache.set(normalizedUrl, { timestamp: Date.now(), verdict: blockVerdict });
                return blockVerdict;
            }
        }

        // 3. Lightweight Heuristic Analysis
        const suspiciousKeywords = ["login", "verify", "secure", "account", "update", "bank", "payment", "billing", "invoice", "wallet"];
        const lowerUrl = urlString.toLowerCase();
        let heuristicScore = 0;

        for (const kw of suspiciousKeywords) {
            if (lowerUrl.includes(kw)) heuristicScore += 0.2;
        }
        if (lowerUrl.includes("redirect=") || lowerUrl.includes("url=")) heuristicScore += 0.3;
        if (urlString.length > 150) heuristicScore += 0.2;
        if (urlString.includes("%") || urlString.includes("base64")) heuristicScore += 0.2;

        // Severe penalty for sensitive transactions over unencrypted HTTP
        if (lowerUrl.startsWith("http://") && heuristicScore > 0) {
            heuristicScore += 0.5;
        }

        if (heuristicScore >= 0.7) {
            const blockVerdict = {
                blocked: true,
                riskLevel: "high",
                reason: "Suspicious patterns detected",
                explanation: "The URL structure matches a high number of known phishing heuristics (e.g. unencrypted HTTP requesting sensitive data/payments)."
            };
            cache.set(normalizedUrl, { timestamp: Date.now(), verdict: blockVerdict });
            return blockVerdict;
        }

        // 2. Google Safe Browsing Check (Async & Fast)
        try {
            const sbResponse = await axios.post(`https://safebrowsing.googleapis.com/v4/threatMatches:find?key=${GOOGLE_SB_API_KEY}`, {
                client: {
                    clientId: "sentinel-qa",
                    clientVersion: "1.0.0"
                },
                threatInfo: {
                    threatTypes: ["MALWARE", "SOCIAL_ENGINEERING", "UNWANTED_SOFTWARE", "POTENTIALLY_HARMFUL_APPLICATION"],
                    platformTypes: ["ANY_PLATFORM"],
                    threatEntryTypes: ["URL"],
                    threatEntries: [{ url: normalizedUrl }]
                }
            }, { timeout: 2000 });

            if (sbResponse.data && sbResponse.data.matches && sbResponse.data.matches.length > 0) {
                const blockVerdict = {
                    blocked: true,
                    riskLevel: "critical",
                    reason: "Malware or phishing detected",
                    source: "Google Safe Browsing"
                };
                cache.set(normalizedUrl, { timestamp: Date.now(), verdict: blockVerdict });
                return blockVerdict;
            }
        } catch (sbError) {
            console.error("[URL Security Analyzer]: Google SB Error:", sbError.message);
        }

        // 4. AI Risk Classification via Groq (Enhanced Prompt)
        try {
            const groqApiKey = process.env.GROQ_API_KEY;
            if (groqApiKey) {
                const groq = new Groq({ apiKey: groqApiKey });
                const aiResponse = await groq.chat.completions.create({
                    messages: [
                        { 
                            role: 'system', 
                            content: `You are a strict cybersecurity URL analyzer. Flag URLs as "high" risk if:
                            1. They request payments or logins over unencrypted HTTP.
                            2. They appear to be typosquatted variants of popular brands (e.g., g00gle.com, paypa1.com).
                            3. They use homoglyphs (character substitutions) to deceive users.` 
                        },
                        { role: 'user', content: `Analyze this URL: ${normalizedUrl}. Is it phishing, malware, or brand mimicry? Return JSON with risk_level (low, medium, high) and reason.` }
                    ],
                    model: process.env.GROQ_AI_DEBUGGER_MODEL || 'llama-3.3-70b-versatile',
                    response_format: { type: "json_object" }
                });

                const aiResult = JSON.parse(aiResponse.choices[0].message.content);
                const riskLevel = aiResult.risk_level || aiResult.riskLevel || "low";

                if (riskLevel.toLowerCase() === "high") {
                    const blockVerdict = {
                        blocked: true,
                        riskLevel: "high",
                        reason: aiResult.reason || "AI detected high risk/mimicry",
                        source: "Groq AI"
                    };
                    cache.set(normalizedUrl, { timestamp: Date.now(), verdict: blockVerdict });
                    return blockVerdict;
                } else if (riskLevel.toLowerCase() === "medium") {
                    const allowedVerdict = {
                        blocked: false,
                        riskLevel: "medium",
                        warning: aiResult.reason || "AI detected medium risk"
                    };
                    cache.set(normalizedUrl, { timestamp: Date.now(), verdict: allowedVerdict });
                    return allowedVerdict;
                }
            }
        } catch (aiError) {
            console.error("[URL Security Analyzer]: Groq AI Error:", aiError.message);
        }

        // Default allow
        const allowVerdict = { blocked: false, riskLevel: "low" };
        cache.set(normalizedUrl, { timestamp: Date.now(), verdict: allowVerdict });
        return allowVerdict;

    } catch (e) {
        console.error("[URL Security Analyzer]: Critical Error:", e.message);
        // Fail gracefully, allow the standard scan
        return { blocked: false, riskLevel: "low", error: e.message };
    }
}

module.exports = { analyzeURLSecurity };
