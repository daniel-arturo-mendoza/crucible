// Load environment variables (optional for Lambda)
try {
  require('dotenv').config({ path: '../../.env' });
} catch (error) {
  // dotenv not available or .env file not found - use Lambda environment variables
  console.log('Using Lambda environment variables');
}

const serverlessExpress = require('@vendia/serverless-express');
const app = require('./app');

// Lambda handler
exports.handler = serverlessExpress({ app });

// For local testing
if (process.env.NODE_ENV !== 'production') {
  console.log('Lambda handler loaded');
  console.log('Environment variables loaded:', {
    OPENAI_API_KEY: !!process.env.OPENAI_API_KEY,
    DEEPSEEK_API_KEY: !!process.env.DEEPSEEK_API_KEY,
    DEEPSEEK_API_URL: process.env.DEEPSEEK_API_URL,
    TWILIO_ACCOUNT_SID: !!process.env.TWILIO_ACCOUNT_SID,
    TWILIO_AUTH_TOKEN: !!process.env.TWILIO_AUTH_TOKEN,
    TWILIO_WHATSAPP_NUMBER: !!process.env.TWILIO_WHATSAPP_NUMBER
  });
} 