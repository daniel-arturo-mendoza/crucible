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
      const crucibleResponse = await crucible.queryAndSynthesize(prompt, providers);
      
      // Send response back to the sender
      const senderNumber = From.replace('whatsapp:', '');
      await twilioService.sendCrucibleResponse(senderNumber, prompt, crucibleResponse);
      
      res.json({ 
        success: true, 
        message: 'WhatsApp message processed and response sent'
      });
    } catch (crucibleError) {
      console.error('Error processing with Crucible:', crucibleError);
      
      // Send error message to user
      const senderNumber = From.replace('whatsapp:', '');
      await twilioService.sendWhatsAppMessage(senderNumber, 'Sorry, I encountered an error processing your request. Please try again.');
      
      res.json({ 
        success: false, 
        error: 'Error processing with Crucible'
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
