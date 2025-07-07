// Load environment variables (optional for Lambda)
try {
  require('dotenv').config({ path: '../.env' });
} catch (error) {
  // dotenv not available or .env file not found - use Lambda environment variables
  console.log('Using Lambda environment variables');
}

const serverlessExpress = require('@vendia/serverless-express');
const AsyncWorker = require('./services/asyncWorker');
const app = require('./app');

// Initialize async worker for Lambda
const asyncWorker = new AsyncWorker({
  maxExecutionTime: 600000, // 10 minutes (leaving 5 min buffer for Lambda's 15 min limit)
  maxJobProcessingTime: 300000, // 5 minutes per job
  pollInterval: 5000, // 5 seconds
  maxConcurrentJobs: 3
});

// Lambda handler
exports.handler = async (event, context) => {
  console.log('Lambda invoked, starting async worker...');
  
  // Start the async worker (it will poll for jobs in the background)
  await asyncWorker.start();
  
  // Set up graceful shutdown when Lambda is about to timeout
  const timeoutHandler = () => {
    console.log('Lambda timeout approaching, stopping worker gracefully...');
    asyncWorker.stop();
  };
  
  // Set timeout handler to trigger 30 seconds before Lambda timeout
  const timeoutMs = (context.getRemainingTimeInMillis() - 30000);
  if (timeoutMs > 0) {
    setTimeout(timeoutHandler, timeoutMs);
  }
  
  // Handle the actual request
  try {
    const result = await serverlessExpress({ app })(event, context);
    
    // Stop the worker after handling the request
    asyncWorker.stop();
    
    return result;
  } catch (error) {
    console.error('Error in Lambda handler:', error);
    asyncWorker.stop();
    throw error;
  }
};

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