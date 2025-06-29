const express = require('express');
const cors = require('cors');
const { CrucibleCore } = require('crucible-core');

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
    apiKey: process.env.OPENAI_API_KEY
  }
});

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

// Middleware: Error handling
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({ error: 'Internal Server Error', details: err.message });
});

module.exports = app;
