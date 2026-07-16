const { GoogleGenerativeAI } = require('@google/generative-ai');
require('dotenv').config();

async function listModels() {
  try {
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    // There isn't a direct listModels in the base SDK, but we can try common ones.
    const models = ['gemini-1.5-flash', 'gemini-1.5-pro', 'gemini-pro', 'gemini-1.0-pro'];
    
    for (const m of models) {
      try {
        const model = genAI.getGenerativeModel({ model: m });
        await model.generateContent('hi');
        console.log('✅ VALID MODEL:', m);
      } catch (e) {
        console.log('❌ INVALID MODEL:', m, m === 'gemini-1.5-flash' ? e.statusText : '');
      }
    }
  } catch (e) {
    console.error('CRITICAL ERROR:', e);
  }
}
listModels();
