const OpenAI = require('openai');

// Add logging to check API key
console.log('OpenAI API Key present:', !!process.env.OPENAI_API_KEY);
console.log('OpenAI API Key length:', process.env.OPENAI_API_KEY ? process.env.OPENAI_API_KEY.length : 0);

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

async function queryOpenAI(prompt) {
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        {
          role: "system",
          content: "You are a helpful AI assistant providing accurate and unbiased information."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      temperature: 0.7,
    });

    console.log("OpenAI Response:", response);
    return {
      source: 'OpenAI',
      response: response.choices[0].message.content,
      model: response.model,
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    console.error('OpenAI API Error:', error);
    throw new Error(`OpenAI API Error: ${error.message}`);
  }
}

module.exports = { queryOpenAI }; 