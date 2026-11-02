import { GoogleGenerativeAI } from '@google/generative-ai';
import prisma from '../lib/prisma';

export const getSantaResponse = async (
  schoolId: string,
  message: string,
  history: { role: 'user' | 'assistant'; content: string }[]
) => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey.trim() === '') {
    throw new Error('GEMINI_API_KEY is not set in backend/.env');
  }

  const [school, sports, clubs] = await Promise.all([
    prisma.school.findUnique({
      where: { id: schoolId },
      include: { plan: true },
    }),
    prisma.sport.findMany({
      where: { schoolId },
      select: { name: true, description: true },
    }),
    prisma.club.findMany({
      where: { schoolId },
      select: { name: true },
    }),
  ]);

  if (!school) throw new Error('School not found');

  const sportsList = sports && sports.length > 0
    ? sports.map((s: { name: string; description?: string | null }) => s.name + (s.description ? ` (${s.description.trim()})` : '')).join(', ')
    : 'None currently registered';

  const clubsList = clubs && clubs.length > 0
    ? clubs.map((c: { name: string }) => c.name).join(', ')
    : 'None currently registered';

  // Generate system prompt with school context
  const motto = (school.customContent as any)?.motto || 'Faith and Hard Work';
  const systemPrompt = `
    You are "Santa", the friendly and professional AI assistant for ${school.name}. 
    Motto: ${motto}.
    You help users navigate the school system, answer questions about the school, and translate messages into any language requested.

    CRITICAL RULES:
    1. ACCURATE SCHOOL OFFERINGS: When asked about sports, clubs, or activities, ONLY refer to the registered sports and clubs listed in the Official School Data below. For example, if only "soccer" is listed under Registered Sports, inform the user that soccer is currently our registered sport. DO NOT invent, assume, or list sports or clubs that are not in this list.
    2. LANGUAGE MATCHING: Always respond in the SAME LANGUAGE as the user's last message (e.g., if they speak Shona or Ndebele, reply in that language) unless explicitly asked for translation.

    Official School Data:
    - School Name: ${school.name}
    - School Code: ${school.code}
    - Type: ${school.type}
    - Address: ${school.address || 'N/A'}
    - Registered Sports: ${sportsList}
    - Registered Clubs: ${clubsList}
  `;
  // Clean and validate history for Gemini (must start with 'user' and alternate roles)
  const formattedHistory: { role: 'user' | 'model'; parts: { text: string }[] }[] = [];
  for (const h of history) {
    if (!h.content || !h.content.trim()) continue;
    const role = h.role === 'assistant' ? 'model' : 'user';
    // Gemini history cannot start with 'model'
    if (formattedHistory.length === 0 && role === 'model') continue;
    // Merge consecutive messages with the same role
    if (formattedHistory.length > 0 && formattedHistory[formattedHistory.length - 1].role === role) {
      formattedHistory[formattedHistory.length - 1].parts[0].text += `\n${h.content}`;
      continue;
    }
    formattedHistory.push({
      role,
      parts: [{ text: h.content }],
    });
  }

  // Ensure last history item is not 'user' because sendMessage will be the user message
  if (formattedHistory.length > 0 && formattedHistory[formattedHistory.length - 1].role === 'user') {
    formattedHistory.pop();
  }

  const candidateModels = ['gemini-3.5-flash-lite', 'gemini-3.5-flash'];
  let lastError: any = null;

  for (const modelName of candidateModels) {
    try {
      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({ 
        model: modelName,
        systemInstruction: systemPrompt 
      });

      const chat = model.startChat({
        history: formattedHistory,
        generationConfig: {
          maxOutputTokens: 500,
        },
      });

      const result = await chat.sendMessage(message);
      const response = await result.response;
      return { response: response.text() };
    } catch (error: any) {
      console.warn(`[Gemini ${modelName}] Warning:`, error.status || error.message);
      lastError = error;
      // If error is 503 (high demand) or 429 (rate limit), fallback to next candidate model
      if (error.status === 503 || error.status === 429 || String(error.message).includes('high demand')) {
        continue;
      }
      break;
    }
  }

  console.error('Gemini Error:', lastError);
  throw new Error('Gemini AI failed to generate a response');
};
