require('dotenv').config({ path: '../.env' });
console.log('OPENAI_API_KEY:', !!process.env.OPENAI_API_KEY);
console.log('DEEPSEEK_API_KEY:', !!process.env.DEEPSEEK_API_KEY);
console.log('TWILIO_ACCOUNT_SID:', !!process.env.TWILIO_ACCOUNT_SID);
console.log('FIREBASE_SERVICE_ACCOUNT_KEY:', !!process.env.FIREBASE_SERVICE_ACCOUNT_KEY); 