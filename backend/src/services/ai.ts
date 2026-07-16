import { GoogleGenerativeAI } from '@google/generative-ai';
import prisma from '../lib/prisma';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

export const getSantaResponse = async (
  schoolId: string,
  message: string,
  history: { role: 'user' | 'assistant'; content: string }[]
) => {
  const school = await prisma.school.findUnique({
    where: { id: schoolId },
    include: { plan: true },
  });

  if (!school) throw new Error('School not found');

  // Check plan features
  // const hasAIChat = school.plan.features.includes('ai_chat') || school.plan.features.includes('full_ai_assistant');
  // if (!hasAIChat) return { error: 'Your school plan does not support AI Chat.' };

  // Generate system prompt with school context
  const motto = (school.customContent as any)?.motto || 'Faith and Hard Work';
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
  } catch (error: any) {
    console.error('Gemini Error:', error);
    throw new Error('Gemini AI failed to generate a response');
  }
};
