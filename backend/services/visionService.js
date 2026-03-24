const { GoogleGenerativeAI } = require("@google/generative-ai");
const fs = require('fs');
const path = require('path');

class VisionService {
    constructor() {
        this.genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
        this.model = this.genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    }

    async compareScreenshots(img1Path, img2Path) {
        try {
            const img1Data = fs.readFileSync(img1Path);
            const img2Data = fs.readFileSync(img2Path);

            const prompt = `
                You are "Sentinel Vision", an elite UI/UX auditor. 
                Compare these two screenshots (Baseline vs Candidate) and identify any visual regressions.

                Focus on:
                1. Layout shifts (elements moved).
                2. Color/Style changes.
                3. Broken images or alignment issues.
                4. Content mismatches.

                Be very specific. Use a technical, industrial tone.
                If no differences are found, state "VISUAL_INTEGRITY_VERIFIED".

                Respond in JSON ONLY:
                {
                    "differences": [
                        { "issue": "Short title", "details": "Explanation", "severity": "Low|Medium|High" }
                    ],
                    "summary": "Overall comparison summary",
                    "score": 0-100 (where 100 is identical)
                }
            `;

            const result = await this.model.generateContent([
                prompt,
                {
                    inlineData: {
                        data: Buffer.from(img1Data).toString("base64"),
                        mimeType: "image/png",
                    },
                },
                {
                    inlineData: {
                        data: Buffer.from(img2Data).toString("base64"),
                        mimeType: "image/png",
                    },
                },
            ]);

            const response = await result.response;
            const text = response.text().replace(/```json|```/g, "").trim();
            return JSON.parse(text);
        } catch (error) {
            console.error("Vision comparison failure:", error);
            return { error: "Failed to compare screenshots", differences: [] };
        }
    }
}

module.exports = new VisionService();
