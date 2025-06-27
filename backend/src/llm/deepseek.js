const axios = require('axios');

async function queryDeepSeek(prompt) {
  try {
    const response = await axios.post(
      process.env.DEEPSEEK_API_URL + '/chat/completions',
      {
        model: "deepseek-chat",
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
      },
      {
        headers: {
          'Authorization': `Bearer ${process.env.DEEPSEEK_API_KEY}`,
          'Content-Type': 'application/json',
        },
      }
    );

    return {
      source: 'DeepSeek',
      response: response.data.choices[0].message.content,
      model: response.data.model,
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    console.error('DeepSeek API Error:', error);
    throw new Error(`DeepSeek API Error: ${error.message}`);
  }
}

module.exports = { queryDeepSeek }; 