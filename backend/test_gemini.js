const { GoogleGenerativeAI } = require('@google/generative-ai');
require('dotenv').config();

async function testAI() {
  try {
    const key = process.env.GEMINI_API_KEY;
    console.log('Using Key:', key ? key.substring(0, 5) + '...' : 'MISSING');
    
    const genAI = new GoogleGenerativeAI(key);
    // Try listModels to see what's available
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
    
    console.log('Attempting to generate content...');
    const result = await model.generateContent('Say hello');
    const response = await result.response;
    console.log('SUCCESS:', response.text());
  } catch (e) {
    console.error('FULL ERROR:', e);
  }
}
testAI();
