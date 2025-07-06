const express = require('express');
const cors = require('cors');
const path = require('path');
const { CrucibleCore } = require('../../crucible-core/src/index');
const TwilioService = require('./services/twilio');

const app = express();

// Initialize Crucible Core
const crucible = new CrucibleCore({
  providers: {
    openai: {
      apiKey: process.env.OPENAI_API_KEY
    },
    deepseek: {
      apiKey: process.env.DEEPSEEK_API_KEY,
      apiUrl: process.env.DEEPSEEK_API_URL
    }
  },
  synthesis: {
    provider: 'openai',
    apiKey: process.env.OPENAI_API_KEY,
    configPath: path.join(__dirname, '../crucible-synthesis-config.json')
  }
});

// Initialize Twilio Service
const twilioService = new TwilioService();

// Middleware: CORS
app.use(cors());

// Middleware: JSON body parsing
app.use(express.json());

// Middleware: URL-encoded form data parsing (for Twilio webhooks)
app.use(express.urlencoded({ extended: true }));

// Middleware: Logging
app.use((req, res, next) => {
  const now = new Date().toISOString();
  console.log(`[${now}] ${req.method} ${req.originalUrl}`);
  next();
});

// Test OpenAI endpoint
app.post('/test-openai', async (req, res, next) => {
  try {
    const { prompt } = req.body;
    
    if (!prompt) {
      return res.status(400).json({ error: 'Prompt is required' });
    }

    const response = await crucible.querySingle(prompt, 'openai');
    res.json(response);
  } catch (err) {
    next(err);
  }
});

// Test DeepSeek endpoint
app.post('/test-deepseek', async (req, res, next) => {
  try {
    const { prompt } = req.body;
    
    if (!prompt) {
      return res.status(400).json({ error: 'Prompt is required' });
    }

    const response = await crucible.querySingle(prompt, 'deepseek');
    res.json(response);
  } catch (err) {
    next(err);
  }
});

// Query endpoint - get responses from all providers without synthesis
app.post('/query', async (req, res, next) => {
  try {
    const { prompt } = req.body;
    
    if (!prompt) {
      return res.status(400).json({ error: 'Prompt is required' });
    }

    // Query all providers in parallel
    const result = await crucible.query(prompt, ['openai', 'deepseek']);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

// Query and synthesize endpoint
app.post('/query-and-synthesize', async (req, res, next) => {
  try {
    const { prompt } = req.body;
    
    if (!prompt) {
      return res.status(400).json({ error: 'Prompt is required' });
    }

    // Query all providers and synthesize the results
    const result = await crucible.queryAndSynthesize(prompt, ['openai', 'deepseek']);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

// Get available providers
app.get('/providers', (req, res) => {
  const providers = crucible.getProviders();
  res.json({ providers });
});

// Test endpoint for DynamoDB configuration
app.get('/test-config', (req, res) => {
  res.json({
    environment: {
      USER_LOCKS_TABLE: process.env.USER_LOCKS_TABLE,
      JOB_QUEUE_TABLE: process.env.JOB_QUEUE_TABLE,
      TWILIO_CONFIGURED: !!process.env.TWILIO_ACCOUNT_SID,
      OPENAI_CONFIGURED: !!process.env.OPENAI_API_KEY,
      DEEPSEEK_CONFIGURED: !!process.env.DEEPSEEK_API_KEY
    },
    message: 'Configuration test endpoint'
  });
});

// WhatsApp endpoints
// Send WhatsApp message
app.post('/whatsapp/send', async (req, res, next) => {
  try {
    const { to, message } = req.body;
    
    if (!to || !message) {
      return res.status(400).json({ error: 'Phone number (to) and message are required' });
    }

    if (!twilioService.isConfigured()) {
      return res.status(500).json({ error: 'Twilio is not properly configured' });
    }

    if (!twilioService.isValidPhoneNumber(to)) {
      return res.status(400).json({ error: 'Invalid phone number format. Use international format (e.g., +1234567890)' });
    }

    const result = await twilioService.sendWhatsAppMessage(to, message);
    res.json({ 
      success: true, 
      messageSid: result.sid,
      message: 'WhatsApp message sent successfully'
    });
  } catch (err) {
    next(err);
  }
});

// Send WhatsApp message with Crucible AI response
app.post('/whatsapp/crucible', async (req, res, next) => {
  try {
    const { to, prompt, providers = ['openai', 'deepseek'], synthesize = true } = req.body;
    
    if (!to || !prompt) {
      return res.status(400).json({ error: 'Phone number (to) and prompt are required' });
    }

    if (!twilioService.isConfigured()) {
      return res.status(500).json({ error: 'Twilio is not properly configured' });
    }

    if (!twilioService.isValidPhoneNumber(to)) {
      return res.status(400).json({ error: 'Invalid phone number format. Use international format (e.g., +1234567890)' });
    }

    // Get Crucible response
    let crucibleResponse;
    if (synthesize) {
      crucibleResponse = await crucible.queryAndSynthesize(prompt, providers);
    } else {
      crucibleResponse = await crucible.query(prompt, providers);
    }

    // Send WhatsApp message with the response
    const result = await twilioService.sendCrucibleResponse(to, prompt, crucibleResponse);
    
    res.json({ 
      success: true, 
      messageSid: result.sid,
      crucibleResponse,
      message: 'WhatsApp message with Crucible AI response sent successfully'
    });
  } catch (err) {
    next(err);
  }
});

// Webhook endpoint for incoming WhatsApp messages
app.post('/whatsapp/webhook', async (req, res, next) => {
  try {
    console.log('Full webhook request body:', JSON.stringify(req.body, null, 2));
    console.log('Request headers:', JSON.stringify(req.headers, null, 2));
    
    const { Body, From, To } = req.body;
    
    console.log('Incoming WhatsApp message:', { Body, From, To });
    
    // Validate that this is a WhatsApp message
    if (!Body || !From) {
      return res.status(400).json({ error: 'Invalid webhook payload' });
    }

    // Process the incoming message with Crucible
    const prompt = Body.trim();
    const providers = ['openai', 'deepseek'];
    
    try {
      // Add timeout to Crucible processing
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Processing timeout')), 25000); // 25 second timeout
      });
      
      const cruciblePromise = crucible.queryAndSynthesize(prompt, providers);
      const crucibleResponse = await Promise.race([cruciblePromise, timeoutPromise]);
      
      // Send response back to the sender
      const senderNumber = From.replace('whatsapp:', '');
      await twilioService.sendCrucibleResponse(senderNumber, prompt, crucibleResponse);
      
      res.json({ 
        success: true, 
        message: 'WhatsApp message processed and response sent'
      });
    } catch (crucibleError) {
      console.error('Error processing with Crucible:', crucibleError);
      
      // Send appropriate error message to user
      const senderNumber = From.replace('whatsapp:', '');
      let errorMessage = 'Sorry, I encountered an error processing your request. Please try again.';
      
      if (crucibleError.message === 'Processing timeout') {
        errorMessage = 'Sorry, your request took too long to process. Please try a simpler question or try again later.';
      }
      
      await twilioService.sendWhatsAppMessage(senderNumber, errorMessage);
      
      res.json({ 
        success: false, 
        error: crucibleError.message
      });
    }
  } catch (err) {
    next(err);
  }
});

// Middleware: Error handling
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({ error: 'Internal Server Error', details: err.message });
});

module.exports = app;
