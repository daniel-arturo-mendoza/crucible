require('dotenv').config();
const axios = require('axios');

async function testDeepSeek() {
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
            content: "What is the capital of France?"
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

    console.log('DeepSeek API Response:', response.data);
  } catch (error) {
    console.error('DeepSeek API Error:', error.response ? error.response.data : error.message);
  }
}

testDeepSeek(); 