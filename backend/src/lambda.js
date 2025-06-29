// Load environment variables
require('dotenv').config({ path: '../../.env' });

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
    DEEPSEEK_API_URL: process.env.DEEPSEEK_API_URL
  });
} 