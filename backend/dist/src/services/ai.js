"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getSantaResponse = void 0;
const generative_ai_1 = require("@google/generative-ai");
const prisma_1 = __importDefault(require("../lib/prisma"));
const genAI = new generative_ai_1.GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');
const getSantaResponse = async (schoolId, message, history) => {
    const school = await prisma_1.default.school.findUnique({
        where: { id: schoolId },
        include: { plan: true },
    });
    if (!school)
        throw new Error('School not found');
    // Check plan features
    // const hasAIChat = school.plan.features.includes('ai_chat') || school.plan.features.includes('full_ai_assistant');
    // if (!hasAIChat) return { error: 'Your school plan does not support AI Chat.' };
    // Generate system prompt with school context
    const motto = school.customContent?.motto || 'Faith and Hard Work';
    const systemPrompt = `
    You are "Santa", the AI assistant for ${school.name}. 
    Motto: ${motto}.
    You helps users navigate the school system, answer questions about the school, and translate messages into any language requested.
    Always be friendly, professional, and helpful.
    IMPORTANT: Always respond in the SAME LANGUAGE as the user's last message (e.g., if they speak Shona, you MUST reply in Shona) unless they explicitly ask you for a translation.
    School Details:
    - Code: ${school.code}
    - Type: ${school.type}
    - Address: ${school.address || 'N/A'}
  `;
    try {
        const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
        // Map history to Gemini format
        const chat = model.startChat({
            history: history.map(h => ({
                role: h.role === 'assistant' ? 'model' : 'user',
                parts: [{ text: h.content }],
            })),
            generationConfig: {
                maxOutputTokens: 500,
            },
        });
        // Send context + message
        const result = await chat.sendMessage([
            { text: `System Context: ${systemPrompt}` },
            { text: message }
        ]);
        const response = await result.response;
        return { response: response.text() };
    }
    catch (error) {
        console.error('Gemini Error:', error);
        throw new Error('Gemini AI failed to generate a response');
    }
};
exports.getSantaResponse = getSantaResponse;
//# sourceMappingURL=ai.js.map